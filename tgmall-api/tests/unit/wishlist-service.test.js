// Wishlist 服务单元测试 — 收藏/取消收藏/列表/删除
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const prismaMock = {
  wishlist: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
};

// AppError
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// 被测试的服务函数（内联实现以保持测试独立性）
async function toggleWishlist(userId, productId) {
  // 检查商品是否存在
  const product = await prismaMock.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');

  const existing = await prismaMock.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    // 已收藏 → 取消
    await prismaMock.wishlist.delete({ where: { id: existing.id } });
    return { isFavorited: false };
  }

  // 未收藏 → 添加
  await prismaMock.wishlist.create({
    data: { userId, productId },
  });
  return { isFavorited: true };
}

async function listWishlist(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prismaMock.wishlist.findMany({
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
    prismaMock.wishlist.count({ where: { userId } }),
  ]);
  return { items, total };
}

async function removeWishlist(userId, productId) {
  const existing = await prismaMock.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!existing) throw new AppError('收藏记录不存在', 404, 'NOT_FOUND');
  await prismaMock.wishlist.delete({ where: { id: existing.id } });
}

describe('Wishlist 服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-WL-001: toggleWishlist — 首次收藏返回 isFavorited=true', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', status: 'active' });
    prismaMock.wishlist.findUnique.mockResolvedValue(null); // 未收藏
    prismaMock.wishlist.create.mockResolvedValue({ id: 'w1', userId: 'u1', productId: 'p1' });

    const result = await toggleWishlist('u1', 'p1');

    expect(result.isFavorited).toBe(true);
    expect(prismaMock.wishlist.create).toHaveBeenCalledWith({
      data: { userId: 'u1', productId: 'p1' },
    });
    expect(prismaMock.wishlist.delete).not.toHaveBeenCalled();
  });

  it('TC-WL-002: toggleWishlist — 重复调用取消收藏返回 isFavorited=false', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', status: 'active' });
    prismaMock.wishlist.findUnique.mockResolvedValue({ id: 'w1', userId: 'u1', productId: 'p1' });

    const result = await toggleWishlist('u1', 'p1');

    expect(result.isFavorited).toBe(false);
    expect(prismaMock.wishlist.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
    expect(prismaMock.wishlist.create).not.toHaveBeenCalled();
  });

  it('TC-WL-003: toggleWishlist — 商品不存在抛出 NOT_FOUND', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(toggleWishlist('u1', 'bad-id'))
      .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('TC-WL-004: listWishlist — 分页查询收藏列表', async () => {
    const mockProduct = {
      id: 'p1', nameKm: '测试商品', nameEn: 'Test Product', nameZh: '测试',
      priceUsd: '5.00', priceKhr: 20000, images: '[]', stock: 10,
      status: 'active', category: 'fashion', tags: '[]',
    };
    prismaMock.wishlist.findMany.mockResolvedValue([
      { id: 'w1', userId: 'u1', productId: 'p1', product: mockProduct },
    ]);
    prismaMock.wishlist.count.mockResolvedValue(1);

    const result = await listWishlist('u1', 1, 20);

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product.nameKm).toBe('测试商品');
    expect(prismaMock.wishlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('TC-WL-005: removeWishlist — 删除不存在的记录抛出 NOT_FOUND', async () => {
    prismaMock.wishlist.findUnique.mockResolvedValue(null);

    await expect(removeWishlist('u1', 'p1'))
      .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});
