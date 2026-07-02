// Wishlist 服务 — 收藏/取消收藏/列表/删除
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

/**
 * Toggle 收藏：已收藏→取消，未收藏→添加
 * @param {string} userId
 * @param {string} productId
 * @returns {{ isFavorited: boolean }}
 */
export async function toggleWishlist(userId, productId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError('商品不存在', 404, 'NOT_FOUND');
  }

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return { isFavorited: false };
  }

  await prisma.wishlist.create({ data: { userId, productId } });
  return { isFavorited: true };
}

/**
 * 分页查询收藏列表（含商品信息）
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {{ items: Array, total: number }}
 */
export async function listWishlist(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true, nameKm: true, nameEn: true, nameZh: true,
            priceUsd: true, priceKhr: true, images: true, stock: true,
            status: true, category: true, tags: true,
          },
        },
      },
    }),
    prisma.wishlist.count({ where: { userId } }),
  ]);
  return { items, total };
}

/**
 * 取消收藏
 * @param {string} userId
 * @param {string} productId
 */
export async function removeWishlist(userId, productId) {
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!existing) {
    throw new AppError('收藏记录不存在', 404, 'NOT_FOUND');
  }
  await prisma.wishlist.delete({ where: { id: existing.id } });
}
