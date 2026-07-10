// 测试 Mock 工厂 — Prisma + Redis
import { jest } from '@jest/globals';

/** 创建 Mock Prisma 事务客户端 */
export function createMockTx() {
  const productStore = new Map();
  const orderStore = new Map();
  const orderItemStore = new Map();
  const userCouponStore = new Map();
  const couponStore = new Map();

  const tx = {
    product: {
      findUnique: jest.fn(({ where }) => productStore.get(where.id) || null),
      update: jest.fn(({ where, data }) => {
        const product = productStore.get(where.id);
        if (!product) return null;
        if (data.stock?.decrement) product.stock -= data.stock.decrement;
        if (data.stock?.increment) product.stock += data.stock.increment;
        if (data.salesCount?.increment) product.salesCount = (product.salesCount || 0) + data.salesCount.increment;
        return product;
      }),
      _set: (id, data) => productStore.set(id, { ...data }),
      _get: (id) => productStore.get(id),
    },
    order: {
      create: jest.fn(({ data }) => {
        const order = { id: Math.random().toString(36).slice(2), ...data };
        orderStore.set(order.id, order);
        return order;
      }),
      findUnique: jest.fn(({ where }) => orderStore.get(where.id) || null),
      findFirst: jest.fn(({ where }) => {
        for (const o of orderStore.values()) {
          if (Object.entries(where).every(([k, v]) => o[k] === v)) return o;
        }
        return null;
      }),
      update: jest.fn(({ where, data }) => {
        const order = orderStore.get(where.id);
        if (!order) return null;
        Object.assign(order, data);
        return order;
      }),
      _set: (id, data) => orderStore.set(id, { ...data }),
      _get: (id) => orderStore.get(id),
    },
    orderItem: {
      findMany: jest.fn(() => Array.from(orderItemStore.values())),
      _set: (id, data) => orderItemStore.set(id, { ...data }),
    },
    userCoupon: {
      findFirst: jest.fn(() => null),
      findMany: jest.fn(() => []),
      update: jest.fn(({ where, data }) => {
        const uc = userCouponStore.get(where.id);
        if (uc) Object.assign(uc, data);
        return uc;
      }),
      _set: (id, data) => userCouponStore.set(id, { ...data }),
    },
    coupon: {
      findUnique: jest.fn(({ where }) => couponStore.get(where.id) || null),
      _set: (id, data) => couponStore.set(id, { ...data }),
    },
    stockLog: {
      create: jest.fn(),
    },
  };

  // $transaction 复用同一个 tx 对象（模拟 Prisma 事务客户端）
  tx.$transaction = jest.fn(async (fn) => fn(tx));

  return tx;
}

/** 创建 Mock Redis 客户端 */
export function createMockRedis() {
  const store = new Map();
  return {
    get: jest.fn((key) => store.get(key) || null),
    set: jest.fn((key, value, ...args) => {
      // 模拟 NX 模式：key 已存在时返回 null
      if (args.includes('NX') && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return 'OK';
    }),
    eval: jest.fn(async (script, numKeys, ...args) => {
      const key = args[0];
      const raw = store.get(key) || null;
      const itemJson = args[numKeys];
      const ttl = args[numKeys + 1];
      if (script.includes('items[i].id ~= itemId')) {
        // REMOVE_ITEM_SCRIPT
        const itemId = args[numKeys];
        const items = raw ? JSON.parse(raw) : [];
        const filtered = items.filter((i) => i.id !== itemId);
        store.set(key, JSON.stringify(filtered));
        return JSON.stringify(filtered);
      }
      const item = JSON.parse(itemJson);
      const items = raw ? JSON.parse(raw) : [];
      if (script.includes('items[i].quantity = items[i].quantity + item.quantity')) {
        // ADD_ITEM_SCRIPT
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) items[idx].quantity += item.quantity;
        else items.push(item);
        store.set(key, JSON.stringify(items));
        return JSON.stringify(items);
      }
      if (script.includes('items[i].quantity = update.quantity')) {
        // UPDATE_ITEM_SCRIPT
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) items[idx].quantity = item.quantity;
        store.set(key, JSON.stringify(items));
        return JSON.stringify(items);
      }
      throw new Error('Unknown Lua script in mock eval');
    }),
    del: jest.fn((key) => {
      store.delete(key);
      return 1;
    }),
    _clear: () => store.clear(),
    _get: (key) => store.get(key),
  };
}
