// 限时专区服务 — 管理端 CRUD + 公开查询
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

/** GET /admin/flash-deals — 分页列表 */
export async function listFlashDeals({ page = 1, limit = 20, status } = {}) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.flashDeal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          select: {
            id: true,
            nameKm: true,
            nameEn: true,
            nameZh: true,
            priceUsd: true,
            priceKhr: true,
            images: true,
            stock: true,
          },
        },
      },
    }),
    prisma.flashDeal.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      dealPriceUsd: Number(item.dealPriceUsd),
      product: { ...item.product, priceUsd: Number(item.product.priceUsd) },
    })),
    total,
    page,
    limit,
    hasNext: skip + limit < total,
  };
}

/** POST /admin/flash-deals — 创建 */
export async function createFlashDeal(input) {
  // 应用层唯一性校验：同一商品不允许重复 active 专区
  const existing = await prisma.flashDeal.findFirst({
    where: { productId: input.product_id, status: 'active' },
  });
  if (existing) {
    throw new AppError('此商品已有生效中的限时专区', 409, 'DUPLICATE_DEAL_PRODUCT');
  }

  // 校验商品存在且 active
  const product = await prisma.product.findUnique({
    where: { id: input.product_id },
    select: { id: true, status: true },
  });
  if (!product) {
    throw new AppError('商品不存在', 404, 'NOT_FOUND');
  }
  if (product.status !== 'active') {
    throw new AppError('只能为已上架商品创建专区', 400, 'PRODUCT_NOT_ACTIVE');
  }

  const deal = await prisma.flashDeal.create({
    data: {
      productId: input.product_id,
      dealPriceUsd: input.deal_price_usd,
      dealPriceKhr: input.deal_price_khr,
      dealStock: input.deal_stock,
      cityCode: input.city_code ?? null,
      startAt: input.start_at ? new Date(input.start_at) : null,
      endAt: input.end_at ? new Date(input.end_at) : null,
      sortOrder: input.sort_order ?? 0,
      status: input.status ?? 'active',
    },
    include: {
      product: {
        select: { id: true, nameKm: true, nameEn: true, nameZh: true, priceUsd: true, priceKhr: true, images: true },
      },
    },
  });

  return {
    ...deal,
    dealPriceUsd: Number(deal.dealPriceUsd),
    product: { ...deal.product, priceUsd: Number(deal.product.priceUsd) },
  };
}

/** PUT /admin/flash-deals/:id — 更新 */
export async function updateFlashDeal(id, input) {
  const existing = await prisma.flashDeal.findUnique({ where: { id } });
  if (!existing) throw new AppError('限时专区不存在', 404, 'NOT_FOUND');

  // 如果改 productId 且新商品不同，校验新商品不冲突
  if (input.product_id && input.product_id !== existing.productId) {
    const conflict = await prisma.flashDeal.findFirst({
      where: { productId: input.product_id, status: 'active', id: { not: id } },
    });
    if (conflict) {
      throw new AppError('此商品已有生效中的限时专区', 409, 'DUPLICATE_DEAL_PRODUCT');
    }
  }

  const updateData = {};
  if (input.product_id !== undefined) updateData.productId = input.product_id;
  if (input.deal_price_usd !== undefined) updateData.dealPriceUsd = input.deal_price_usd;
  if (input.deal_price_khr !== undefined) updateData.dealPriceKhr = input.deal_price_khr;
  if (input.deal_stock !== undefined) updateData.dealStock = input.deal_stock;
  if (input.city_code !== undefined) updateData.cityCode = input.city_code;
  if (input.start_at !== undefined) updateData.startAt = input.start_at ? new Date(input.start_at) : null;
  if (input.end_at !== undefined) updateData.endAt = input.end_at ? new Date(input.end_at) : null;
  if (input.sort_order !== undefined) updateData.sortOrder = input.sort_order;
  if (input.status !== undefined) updateData.status = input.status;

  const deal = await prisma.flashDeal.update({
    where: { id },
    data: updateData,
    include: {
      product: {
        select: { id: true, nameKm: true, nameEn: true, nameZh: true, priceUsd: true, priceKhr: true, images: true },
      },
    },
  });

  return {
    ...deal,
    dealPriceUsd: Number(deal.dealPriceUsd),
    product: { ...deal.product, priceUsd: Number(deal.product.priceUsd) },
  };
}

/** POST /admin/flash-deals/:id/toggle — 切换状态 */
export async function toggleFlashDeal(id) {
  const existing = await prisma.flashDeal.findUnique({ where: { id } });
  if (!existing) throw new AppError('限时专区不存在', 404, 'NOT_FOUND');

  const newStatus = existing.status === 'active' ? 'inactive' : 'active';
  return prisma.flashDeal.update({ where: { id }, data: { status: newStatus } });
}

/** GET /flash-deals — 公开接口：当前生效的限时专区 */
export async function listActiveFlashDeals({ cityCode = 'phnom_penh' } = {}) {
  const now = new Date();

  const deals = await prisma.flashDeal.findMany({
    where: {
      status: 'active',
      dealStock: { gt: prisma.flashDeal.fields.soldCount ? undefined : undefined }, // 未售罄
      OR: [
        { cityCode: null },
        { cityCode },
      ],
      AND: [
        {
          OR: [
            { startAt: null },
            { startAt: { lte: now } },
          ],
        },
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
      ],
      product: { status: 'active' },
    },
    orderBy: { sortOrder: 'asc' },
    take: 20,
    include: {
      product: {
        select: {
          id: true,
          nameKm: true,
          nameEn: true,
          nameZh: true,
          priceUsd: true,
          priceKhr: true,
          images: true,
          stock: true,
          tags: true,
          specs: true,
        },
      },
    },
  });

  // 过滤 dealStock > soldCount（Prisma 不直接支持字段间比较，用 JS 过滤）
  const valid = deals.filter((d) => d.dealStock > d.soldCount);

  return valid.map((item) => ({
    ...item,
    dealPriceUsd: Number(item.dealPriceUsd),
    product: { ...item.product, priceUsd: Number(item.product.priceUsd) },
  }));
}
