// 商品服务 — 列表查询 + 详情
import prisma from '../config/database.js';

export async function listProducts({
  page,
  limit,
  category,
  q,
  sort,
  minPrice,
  maxPrice,
  language = 'km',
  userId,
}) {
  const skip = (page - 1) * limit;

  // 构建查询条件
  const where = {
    status: 'active',
    stock: { gt: 0 },
  };
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { nameKm: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { nameZh: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.priceUsd = {};
    if (minPrice !== undefined) where.priceUsd.gte = minPrice;
    if (maxPrice !== undefined) where.priceUsd.lte = maxPrice;
  }

  // 排序映射
  const orderByMap = {
    newest: { createdAt: 'desc' },
    price_asc: { priceUsd: 'asc' },
    price_desc: { priceUsd: 'desc' },
    popular: { salesCount: 'desc' },
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: orderByMap[sort] || orderByMap.newest,
      skip,
      take: limit,
      select: {
        id: true,
        nameKm: true,
        nameEn: true,
        nameZh: true,
        priceUsd: true,
        priceKhr: true,
        stock: true,
        images: true,
        category: true,
        salesCount: true,
        tags: true,
        createdAt: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  const productIds = items.map((i) => i.id);

  // 查询当前用户的收藏状态
  let favoritedIds = new Set();
  if (userId && productIds.length > 0) {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    });
    favoritedIds = new Set(wishlist.map((w) => w.productId));
  }

  // 聚合收藏数（所有用户）
  const likesMap = {};
  if (productIds.length > 0) {
    const likesRows = await prisma.wishlist.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _count: { productId: true },
    });
    for (const row of likesRows) {
      likesMap[row.productId] = row._count.productId;
    }
  }

  // 聚合 active SKU 数
  const skuCountMap = {};
  if (productIds.length > 0) {
    const skuRows = await prisma.productSku.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, status: 'active' },
      _count: { productId: true },
    });
    for (const row of skuRows) {
      skuCountMap[row.productId] = row._count.productId;
    }
  }

  // 根据用户语言返回对应的名称字段
  const itemsMapped = items.map((item) => ({
    id: item.id,
    name: language === 'en' ? item.nameEn || item.nameKm
          : language === 'zh' ? item.nameZh || item.nameKm
          : item.nameKm,
    priceUsd: Number(item.priceUsd),
    priceKhr: item.priceKhr,
    stock: item.stock,
    thumbnail: item.images?.[0]?.thumb_url || item.images?.[0]?.url || null,
    category: item.category,
    salesCount: item.salesCount,
    likesCount: likesMap[item.id] || 0,
    skuCount: skuCountMap[item.id] || 0,
    tags: item.tags || [],
    isFavorited: favoritedIds.has(item.id),
    createdAt: item.createdAt,
  }));

  return {
    items: itemsMapped,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
  };
}

export async function getProductById(id, userId) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      skus: {
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          skuCode: true,
          spec: true,
          priceUsd: true,
          priceKhr: true,
          stock: true,
          status: true,
        },
      },
    },
  });

  if (!product) return null;
  if (product.status === 'inactive') return { _inactive: true };

  // 查询收藏状态
  let isFavorited = false;
  if (userId) {
    const wl = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId: id } },
    });
    isFavorited = !!wl;
  }

  return {
    id: product.id,
    nameKm: product.nameKm,
    nameEn: product.nameEn,
    nameZh: product.nameZh,
    descriptionKm: product.descriptionKm,
    descriptionEn: product.descriptionEn,
    descriptionZh: product.descriptionZh,
    priceUsd: Number(product.priceUsd),
    priceKhr: product.priceKhr,
    stock: product.stock,
    images: product.images,
    specs: product.specs,
    skus: product.skus.map((s) => ({
      id: s.id,
      skuCode: s.skuCode,
      spec: s.spec,
      priceUsd: Number(s.priceUsd),
      priceKhr: s.priceKhr,
      stock: s.stock,
      status: s.status,
    })),
    category: product.category,
    salesCount: product.salesCount,
    tags: product.tags || [],
    isFavorited,
    createdAt: product.createdAt,
  };
}
