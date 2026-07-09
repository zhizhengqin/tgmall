// 购物车服务（Redis 存储）
import redis from '../config/redis.js';
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { calculateShippingFee, getActiveDeliveryRule } from './shopConfig.service.js';

function cartKey(userId) { return `cart:${userId}`; }

function specKey(spec) {
  if (!spec || Object.keys(spec).length === 0) return '';
  return Object.keys(spec)
    .sort()
    .map((k) => `${k}:${spec[k]}`)
    .join('|');
}

function makeItemId(productId, skuId, spec) {
  const key = specKey(spec);
  if (skuId) return `${productId}::${skuId}`;
  return key ? `${productId}::${key}` : productId;
}

/**
 * 根据商品和规格匹配 SKU
 * 优先使用传入的 skuId，否则按 spec 组合匹配
 */
async function resolveSku(productId, spec = {}, skuId = null) {
  if (skuId) {
    return prisma.productSku.findFirst({ where: { id: skuId, productId, status: 'active' } });
  }
  const sortedSpec = specKey(spec);
  if (!sortedSpec) {
    return prisma.productSku.findFirst({ where: { productId, skuCode: 'DEFAULT', status: 'active' } });
  }
  const skus = await prisma.productSku.findMany({ where: { productId, status: 'active' } });
  return skus.find((s) => specKey(s.spec) === sortedSpec) || null;
}

export async function getCart(userId) {
  const raw = await redis.get(cartKey(userId));
  if (!raw) return { groups: [], summary: { totalItems: 0, totalUsd: 0, totalKhr: 0 } };

  const items = JSON.parse(raw);
  // 实时校验库存和价格
  const enriched = await Promise.all(items.map(enrichCartItem));
  return groupCartItems(enriched);
}

export async function addCartItem(userId, { product_id, quantity, spec = {}, sku_id }) {
  const productId = product_id;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');
  if (product.status !== 'active') throw new AppError('商品已下架', 410, 'PRODUCT_INACTIVE');

  const sku = await resolveSku(productId, spec, sku_id);

  // 获取现有购物车
  const raw = await redis.get(cartKey(userId));
  const items = raw ? JSON.parse(raw) : [];

  // 查重：同商品+同 SKU → 累加数量
  const itemId = makeItemId(productId, sku?.id, spec);
  const index = items.findIndex(
    (i) => i.id === itemId,
  );
  if (index >= 0) {
    items[index].quantity += quantity;
  } else {
    items.push({ id: itemId, productId, skuId: sku?.id, quantity, spec });
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

// ---------- 结算预览（后端快照，替代 localStorage） ----------

/**
 * 根据购物车选中项生成实时结算快照
 * @param {string} userId
 * @param {string[]} itemIds — 购物车项 id 列表
 * @param {string} [cityCode] — 用于计算运费
 * @param {string} [couponId] — 用户优惠券 id（userCoupon.id）
 */
export async function checkoutPreview(userId, { itemIds, cityCode, couponId }) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new AppError('请至少选择一件商品', 400, 'VALIDATION_ERROR');
  }

  const raw = await redis.get(cartKey(userId));
  if (!raw) throw new AppError('购物车为空', 400, 'CART_EMPTY');

  const cartItems = JSON.parse(raw);
  const selected = cartItems.filter((i) => itemIds.includes(i.id));
  if (selected.length === 0) throw new AppError('选中的商品不存在', 400, 'CART_ITEM_NOT_FOUND');

  const enriched = await Promise.all(selected.map(enrichCartItem));
  const valid = enriched.filter((i) => i.stockStatus !== 'not_found' && i.stockStatus !== 'inactive');

  if (valid.length === 0) throw new AppError('选中的商品已下架或不存在', 400, 'CART_INVALID');

  const invalidItems = valid.filter((i) => i.stockStatus === 'insufficient' || i.stockStatus === 'out_of_stock');

  const subtotalUsd = valid.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalKhr = valid.reduce((s, i) => s + i.priceKhr * i.quantity, 0);

  // 运费
  const deliveryRule = cityCode ? await getActiveDeliveryRule(prisma, cityCode) : null;
  const shippingFeeUsd = calculateShippingFee(subtotalUsd, deliveryRule);
  const shippingFeeKhr = Math.round(shippingFeeUsd * 4000);

  // 优惠券
  let coupon = null;
  let discountUsd = 0;
  let discountKhr = 0;
  if (couponId) {
    const userCoupon = await prisma.userCoupon.findFirst({
      where: { id: couponId, userId, status: 'unused' },
      include: { coupon: true },
    });
    if (userCoupon?.coupon) {
      const c = userCoupon.coupon;
      const now = new Date();
      if (c.status === 'active' && new Date(c.startDate) <= now && new Date(c.endDate) >= now) {
        if (subtotalUsd >= Number(c.minSpend || 0)) {
          coupon = {
            userCouponId: userCoupon.id,
            id: c.id,
            titleKm: c.titleKm,
            titleEn: c.titleEn,
            titleZh: c.titleZh,
            type: c.type,
            value: Number(c.value),
            minSpend: Number(c.minSpend),
          };
          if (c.type === 'fixed') {
            discountUsd = Number(c.value);
          } else {
            discountUsd = Math.round(subtotalUsd * Number(c.value) / 100 * 100) / 100;
          }
          discountUsd = Math.min(discountUsd, subtotalUsd);
          discountKhr = Math.round(discountUsd * 4000);
        }
      }
    }
  }

  const minOrderAmountUsd = Number(deliveryRule?.minOrderAmountUsd || 0);
  const shortfallUsd = Math.max(0, minOrderAmountUsd - subtotalUsd);
  const totalUsd = Math.max(0, subtotalUsd - discountUsd + shippingFeeUsd);
  const totalKhr = Math.max(0, subtotalKhr - discountKhr + shippingFeeKhr);

  return {
    items: valid,
    invalidItems,
    priceBreakdown: {
      subtotalUsd: Math.round(subtotalUsd * 100) / 100,
      subtotalKhr,
      discountUsd: Math.round(discountUsd * 100) / 100,
      discountKhr,
      shippingFeeUsd,
      shippingFeeKhr,
      minOrderAmountUsd,
      shortfallUsd: Math.round(shortfallUsd * 100) / 100,
      totalUsd: Math.round(totalUsd * 100) / 100,
      totalKhr,
    },
    deliveryRule: deliveryRule
      ? {
          cityCode: deliveryRule.cityCode,
          shippingFeeUsd: Number(deliveryRule.shippingFeeUsd),
          freeShippingThresholdUsd: Number(deliveryRule.freeShippingThresholdUsd),
          minOrderAmountUsd,
          estimatedDeliveryDays: deliveryRule.estimatedDeliveryDays,
        }
      : null,
    coupon,
  };
}

// --- 内部工具 ---

async function enrichCartItem(item) {
  const [product, sku] = await Promise.all([
    prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true, nameKm: true, nameEn: true, status: true, images: true,
        priceUsd: true, priceKhr: true, stock: true,
      },
    }),
    item.skuId
      ? prisma.productSku.findUnique({
          where: { id: item.skuId },
          select: { id: true, priceUsd: true, priceKhr: true, stock: true, status: true, spec: true },
        })
      : resolveSku(item.productId, item.spec),
  ]);

  const effectiveStock = sku?.stock ?? product?.stock ?? 0;
  const effectivePriceUsd = sku?.priceUsd ?? product?.priceUsd ?? 0;
  const effectivePriceKhr = sku?.priceKhr ?? product?.priceKhr ?? 0;

  const stockStatus = product
    ? product.status !== 'active' ? 'inactive'
      : effectiveStock === 0 ? 'out_of_stock'
      : effectiveStock < item.quantity ? 'insufficient'
      : effectiveStock <= 5 ? 'low_stock'
      : 'ok'
    : 'not_found';

  return {
    id: item.id,
    productId: item.productId,
    skuId: sku?.id || null,
    productName: product?.nameKm || '',
    thumbnail: product?.images?.[0]?.thumb_url || '',
    spec: item.spec,
    priceUsd: Number(effectivePriceUsd),
    priceKhr: effectivePriceKhr,
    quantity: Math.min(item.quantity, effectiveStock),
    maxQuantity: effectiveStock,
    stockStatus,
    subtotalUsd: Number(effectivePriceUsd) * Math.min(item.quantity, effectiveStock),
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
