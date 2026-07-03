// 库存管理服务
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { getPagination } from '../utils/pagination.js';

export async function listInventory({ page = 1, limit = 20, q, sortBy = 'stock_asc', lowStockOnly = false } = {}) {
  const { page: p, limit: l, skip } = getPagination({ page, limit });
  const where = {};
  if (q) where.nameKm = { contains: q, mode: 'insensitive' };
  if (lowStockOnly) {
    where.alertThreshold = { not: null };
  }

  const orderBy = [];
  if (sortBy === 'stock_asc') orderBy.push({ stock: 'asc' });
  else if (sortBy === 'stock_desc') orderBy.push({ stock: 'desc' });

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: l,
      select: {
        id: true, nameKm: true, nameEn: true, nameZh: true,
        images: true, stock: true, alertThreshold: true, status: true,
        _count: { select: { stockLogs: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const enriched = items.map(p => ({
    ...p,
    lowStock: p.alertThreshold != null && p.stock <= p.alertThreshold,
  }));

  if (lowStockOnly) {
    const filtered = enriched.filter(p => p.lowStock);
    return { items: filtered, total: filtered.length, page: p, limit: l, totalPages: Math.ceil(filtered.length / l), hasNext: p * l < filtered.length };
  }

  return { items: enriched, total, page: p, limit: l, totalPages: Math.ceil(total / l), hasNext: p * l < total };
}

export async function adjustStock(productId, newQty, operatorId, note = null) {
  if (!Number.isInteger(newQty) || newQty < 0) {
    throw new AppError('库存数量必须是非负整数', 400, 'INVALID_QUANTITY');
  }

  return prisma.$transaction(async (tx) => {
    // 在事务内加行级锁读取，防止并发调整导致日志与实际不一致
    const [product] = await tx.$queryRaw`
      SELECT id, stock, name_km
      FROM products
      WHERE id = ${productId}::uuid
      FOR UPDATE
    `;
    if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');

    const beforeQty = product.stock;
    const afterQty = newQty;
    const changeQty = afterQty - beforeQty;

    await tx.product.update({
      where: { id: productId },
      data: { stock: newQty, ...(newQty === 0 ? { status: 'inactive' } : {}) },
    });

    await tx.stockLog.create({
      data: { productId, beforeQty, afterQty, changeQty, reason: 'manual_adjust', operatorId, note },
    });

    if (newQty === 0) {
      await tx.stockLog.create({
        data: { productId, beforeQty: 0, afterQty: 0, changeQty: 0, reason: 'auto_delist', operatorId, note: '库存归零自动下架' },
      });
    }

    return tx.product.findUnique({
      where: { id: productId },
      select: { id: true, nameKm: true, stock: true, status: true, alertThreshold: true },
    });
  });
}

export async function getStockLogs(productId, { page = 1, limit = 20 } = {}) {
  const { page: p, limit: l, skip } = getPagination({ page, limit });
  const [items, total] = await Promise.all([
    prisma.stockLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: l,
    }),
    prisma.stockLog.count({ where: { productId } }),
  ]);
  return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
}

export async function checkInventory({ productId, actualQty, checkedBy, note }) {
  if (!Number.isInteger(actualQty) || actualQty < 0) {
    throw new AppError('盘点数量必须是非负整数', 400, 'INVALID_QUANTITY');
  }

  return prisma.$transaction(async (tx) => {
    // 在事务内加行级锁读取当前库存，防止并发盘点覆盖
    const [product] = await tx.$queryRaw`
      SELECT id, stock, name_km
      FROM products
      WHERE id = ${productId}::uuid
      FOR UPDATE
    `;
    if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');

    const systemQty = product.stock;
    const diff = actualQty - systemQty;

    const check = await tx.inventoryCheck.create({
      data: { productId, systemQty, actualQty, diff, note, checkedBy },
    });

    // 如果有差异，记录 StockLog + 自动调整库存
    if (diff !== 0) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: actualQty, ...(actualQty === 0 ? { status: 'inactive' } : {}) },
      });
      await tx.stockLog.create({
        data: { productId, beforeQty: systemQty, afterQty: actualQty, changeQty: diff, reason: 'stock_check', operatorId: checkedBy, note: note || '盘点调整' },
      });
    }

    return { ...check, productName: product.name_km };
  });
}

export async function setAlertThreshold(productId, threshold) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');

  return prisma.product.update({
    where: { id: productId },
    data: { alertThreshold: threshold },
    select: { id: true, nameKm: true, stock: true, alertThreshold: true, status: true },
  });
}
