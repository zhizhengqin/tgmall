// 购物车服务（Redis 存储）
import redis from '../config/redis.js';
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

function cartKey(userId) { return `cart:${userId}`; }

function specKey(spec) {
  if (!spec || Object.keys(spec).length === 0) return '';
  return Object.keys(spec)
    .sort()
    .map((k) => `${k}:${spec[k]}`)
    .join('|');
}

function makeItemId(productId, spec) {
  const key = specKey(spec);
  return key ? `${productId}::${key}` : productId;
}

export async function getCart(userId) {
  const raw = await redis.get(cartKey(userId));
  if (!raw) return { groups: [], summary: { totalItems: 0, totalUsd: 0, totalKhr: 0 } };

  const items = JSON.parse(raw);
  // 实时校验库存和价格
  const enriched = await Promise.all(items.map(enrichCartItem));
  return groupCartItems(enriched);
}

export async function addCartItem(userId, { product_id, quantity, spec = {} }) {
  const productId = product_id;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');
  if (product.status !== 'active') throw new AppError('商品已下架', 410, 'PRODUCT_INACTIVE');

  // 获取现有购物车
  const raw = await redis.get(cartKey(userId));
  const items = raw ? JSON.parse(raw) : [];

  // 查重：同商品+同规格 → 累加数量
  const itemId = makeItemId(productId, spec);
  const index = items.findIndex(
    (i) => i.id === itemId,
  );
  if (index >= 0) {
    items[index].quantity += quantity;
  } else {
    items.push({ id: itemId, productId, quantity, spec });
  }

  await redis.set(cartKey(userId), JSON.stringify(items), 'EX', 7 * 86400);
  return { cartTotalItems: items.reduce((s, i) => s + i.quantity, 0) };
}

export async function updateCartItem(userId, itemId, { quantity }) {
  const raw = await redis.get(cartKey(userId));
  const items = raw ? JSON.parse(raw) : [];
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new AppError('购物车商品不存在', 404, 'NOT_FOUND');
  item.quantity = quantity;
  await redis.set(cartKey(userId), JSON.stringify(items), 'EX', 7 * 86400);
  return item;
}

export async function removeCartItem(userId, itemId) {
  const raw = await redis.get(cartKey(userId));
  const items = raw ? JSON.parse(raw) : [];
  const filtered = items.filter((i) => i.id !== itemId);
  await redis.set(cartKey(userId), JSON.stringify(filtered), 'EX', 7 * 86400);
}

export async function clearCart(userId) {
  await redis.del(cartKey(userId));
}

// --- 内部工具 ---

async function enrichCartItem(item) {
  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: {
      id: true, nameKm: true, nameEn: true, priceUsd: true, priceKhr: true,
      stock: true, images: true, status: true,
    },
  });

  const stockStatus = product
    ? product.status !== 'active' ? 'inactive'
      : product.stock === 0 ? 'out_of_stock'
      : product.stock < item.quantity ? 'insufficient'
      : product.stock <= 5 ? 'low_stock'
      : 'ok'
    : 'not_found';

  return {
    id: item.id,
    productId: item.productId,
    productName: product?.nameKm || '',
    thumbnail: product?.images?.[0]?.thumb_url || '',
    spec: item.spec,
    priceUsd: Number(product?.priceUsd || 0),
    priceKhr: product?.priceKhr || 0,
    quantity: Math.min(item.quantity, product?.stock || 0),
    maxQuantity: product?.stock || 0,
    stockStatus,
    subtotalUsd: Number(product?.priceUsd || 0) * Math.min(item.quantity, product?.stock || 0),
  };
}

function groupCartItems(items) {
  // 清除无效商品
  const valid = items.filter((i) => i.stockStatus !== 'not_found' && i.stockStatus !== 'inactive');
  // V2 公司自营模式：所有商品属于同一平台，不再按商家分组
  const groups = valid.length > 0 ? [{ merchantId: 'tgmall', merchantName: 'TG Mall', items: valid }] : [];
  const totalItems = valid.reduce((s, i) => s + i.quantity, 0);
  const totalUsd = valid.reduce((s, i) => s + i.subtotalUsd, 0);
  // KHR 简化估算
  const totalKhr = valid.reduce((s, i) => s + i.priceKhr * i.quantity, 0);

  return { groups, summary: { totalItems, totalUsd: Math.round(totalUsd * 100) / 100, totalKhr } };
}
