// 支付服务未覆盖路径单元测试 — KHQR / ABA Pay / Wing Pay / Telegram Invoice + 回调
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRedis } from '../helpers/mocks.js';

// ── 自定义 Prisma Mock：支持按 orderNumber 查询，满足回调/通知场景 ──
function createPaymentMockPrisma() {
  const productStore = new Map();
  const orderStore = new Map();
  const orderItemStore = new Map();
  const userStore = new Map();

  const tx = {
    product: {
      findUnique: jest.fn(({ where }) => productStore.get(where.id) || null),
      update: jest.fn(({ where, data }) => {
        const product = productStore.get(where.id);
        if (!product) return null;
        if (data.salesCount?.increment) {
          product.salesCount = (product.salesCount || 0) + data.salesCount.increment;
        }
        return product;
      }),
      _set: (id, data) => productStore.set(id, { ...data }),
      _get: (id) => productStore.get(id),
    },
    order: {
      findUnique: jest.fn(({ where }) => {
        if (where.orderNumber) {
          for (const o of orderStore.values()) {
            if (o.orderNumber === where.orderNumber) return o;
          }
          return null;
        }
        return orderStore.get(where.id) || null;
      }),
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
      _getByOrderNumber: (orderNumber) => {
        for (const o of orderStore.values()) {
          if (o.orderNumber === orderNumber) return o;
        }
        return null;
      },
    },
    orderItem: {
      findMany: jest.fn(() => Array.from(orderItemStore.values())),
      _set: (id, data) => orderItemStore.set(id, { ...data }),
    },
    user: {
      findUnique: jest.fn(({ where }) => userStore.get(where.id) || null),
      _set: (id, data) => userStore.set(id, { ...data }),
    },
  };

  tx.$transaction = jest.fn(async (fn) => fn(tx));
  return tx;
}

// ── 可重入的模块 mock ──
let mockPrisma = createPaymentMockPrisma();
let mockRedis = createMockRedis();

const mockBakong = {
  generateKHQR: jest.fn(),
  verifySignature: jest.fn(),
};
const mockAbaPay = {
  generateDeepLink: jest.fn(),
  verifySignature: jest.fn(),
};
const mockWingPay = {
  generateDeepLink: jest.fn(),
  verifySignature: jest.fn(),
};
const mockTelegramPayments = {
  createInvoiceLink: jest.fn(),
  verifySignature: jest.fn(),
  parseTelegramPaymentUpdate: jest.fn(),
  answerPreCheckoutQuery: jest.fn(),
};
const mockNotificationService = {
  notifyUserOrder: jest.fn(),
};

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({ default: mockRedis }));
jest.unstable_mockModule('../../src/integrations/bakong.js', () => mockBakong);
jest.unstable_mockModule('../../src/integrations/aba_pay.js', () => mockAbaPay);
jest.unstable_mockModule('../../src/integrations/wing_pay.js', () => mockWingPay);
jest.unstable_mockModule('../../src/integrations/telegram_payments.js', () => mockTelegramPayments);
jest.unstable_mockModule('../../src/services/notification.service.js', () => mockNotificationService);

// ── 辅助函数 ──
function makeOrder(overrides = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    userId: 'user-1',
    status: 'pending_payment',
    paymentStatus: 'pending',
    paymentMethod: 'khqr',
    totalUsd: 50,
    totalKhr: 205000,
    paymentTimeout: new Date(Date.now() + 15 * 60 * 1000),
    ...overrides,
  };
}

async function loadService() {
  return import('../../src/services/payment.service.js');
}

async function assertAppError(promise, { statusCode, errorCode, message }) {
  let err;
  try {
    await promise;
  } catch (e) {
    err = e;
  }
  expect(err).toBeDefined();
  expect(err.statusCode).toBe(statusCode);
  expect(err.errorCode).toBe(errorCode);
  if (message) expect(err.message).toBe(message);
}

function resetMocks() {
  jest.resetModules();
  mockPrisma = createPaymentMockPrisma();
  mockRedis = createMockRedis();

  Object.values(mockBakong).forEach((fn) => fn.mockReset());
  Object.values(mockAbaPay).forEach((fn) => fn.mockReset());
  Object.values(mockWingPay).forEach((fn) => fn.mockReset());
  Object.values(mockTelegramPayments).forEach((fn) => fn.mockReset());
  mockNotificationService.notifyUserOrder.mockReset();

  mockNotificationService.notifyUserOrder.mockResolvedValue({ ok: true });
  mockBakong.generateKHQR.mockResolvedValue({
    transactionId: 'txn-khqr',
    qrImageUrl: 'https://cdn.test/qr.png',
    qrData: 'qrdata',
  });
  mockAbaPay.generateDeepLink.mockResolvedValue({
    transactionId: 'txn-aba',
    deepLink: 'aba://pay',
    universalLink: 'https://aba.test/pay',
  });
  mockWingPay.generateDeepLink.mockResolvedValue({
    transactionId: 'txn-wing',
    deepLink: 'wingbank://pay',
    universalLink: 'https://wing.test/pay',
  });
  mockTelegramPayments.createInvoiceLink.mockResolvedValue({
    invoiceUrl: 'https://t.me/invoice',
    payload: 'tgmall:ORD-001:123456',
  });
  mockTelegramPayments.answerPreCheckoutQuery.mockResolvedValue({ ok: true });
}

describe('支付服务未覆盖路径测试 (payment.service)', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // createKHQRPayment
  // ═══════════════════════════════════════════════════════════
  describe('createKHQRPayment', () => {
    it('订单不存在时应抛出 404 NOT_FOUND', async () => {
      const service = await loadService();
      await assertAppError(service.createKHQRPayment('user-1', 'missing-order'), {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: '订单不存在',
      });
    });

    it('订单已取消时应抛出 400 ORDER_CANCELLED', async () => {
      const order = makeOrder({ status: 'cancelled' });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      await assertAppError(service.createKHQRPayment(order.userId, order.id), {
        statusCode: 400,
        errorCode: 'ORDER_CANCELLED',
        message: '订单已取消',
      });
    });

    it('订单已支付时应抛出 400 ORDER_ALREADY_PAID', async () => {
      const order = makeOrder({ paymentStatus: 'success' });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      await assertAppError(service.createKHQRPayment(order.userId, order.id), {
        statusCode: 400,
        errorCode: 'ORDER_ALREADY_PAID',
        message: '订单已支付，无需重复支付',
      });
    });

    it('订单状态不是 pending_payment 时应抛出 400 ORDER_NOT_PAYABLE', async () => {
      const order = makeOrder({ status: 'shipped' });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      await assertAppError(service.createKHQRPayment(order.userId, order.id), {
        statusCode: 400,
        errorCode: 'ORDER_NOT_PAYABLE',
        message: '订单状态不支持支付',
      });
    });

    it('支付方式不是 khqr 时应抛出 400 VALIDATION_ERROR', async () => {
      const order = makeOrder({ paymentMethod: 'aba_pay' });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      await assertAppError(service.createKHQRPayment(order.userId, order.id), {
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: '该订单未选择 KHQR 支付方式',
      });
    });

    it('支付超时时应抛出 400 ORDER_CANCELLED', async () => {
      const order = makeOrder({ paymentTimeout: new Date(Date.now() - 1000) });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      await assertAppError(service.createKHQRPayment(order.userId, order.id), {
        statusCode: 400,
        errorCode: 'ORDER_CANCELLED',
        message: '支付已超时，请重新下单',
      });
    });

    it('Bakong 生成 KHQR 失败时应抛出 503 PAYMENT_SERVICE_UNAVAILABLE', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      mockBakong.generateKHQR.mockRejectedValue(new Error('Bakong down'));
      const service = await loadService();
      await assertAppError(service.createKHQRPayment(order.userId, order.id), {
        statusCode: 503,
        errorCode: 'PAYMENT_SERVICE_UNAVAILABLE',
        message: '支付服务暂不可用，请稍后重试或选择其他支付方式',
      });
    });

    it('成功时应返回二维码数据并写入 Redis 缓存', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.createKHQRPayment(order.userId, order.id);

      expect(result.orderNumber).toBe(order.orderNumber);
      expect(result.qrImageUrl).toBe('https://cdn.test/qr.png');
      expect(result.qrData).toBe('qrdata');
      expect(result.amountUsd).toBe(order.totalUsd);
      expect(result.amountKhr).toBe(order.totalKhr);
      expect(result.supportedBanks).toHaveLength(3);

      const call = mockRedis.set.mock.calls.find((c) => c[0] === `payment:${order.id}`);
      expect(call).toBeDefined();
      const cached = JSON.parse(call[1]);
      expect(cached.transactionId).toBe('txn-khqr');
      expect(cached.amountUsd).toBe(order.totalUsd);
      expect(call.slice(2)).toEqual(['EX', 1800]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // createABAPayPayment
  // ═══════════════════════════════════════════════════════════
  describe('createABAPayPayment', () => {
    const abaOrder = (overrides) => makeOrder({ paymentMethod: 'aba_pay', ...overrides });

    it('订单不存在时应抛出 404 NOT_FOUND', async () => {
      const service = await loadService();
      await assertAppError(service.createABAPayPayment('user-1', 'missing-order'), {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: '订单不存在',
      });
    });

    it('订单已取消/已支付/状态错误/支付方式错误/超时均应被拦截', async () => {
      const cases = [
        { overrides: { status: 'cancelled' }, code: 'ORDER_CANCELLED', msg: '订单已取消' },
        { overrides: { paymentStatus: 'success' }, code: 'ORDER_ALREADY_PAID', msg: '订单已支付，无需重复支付' },
        { overrides: { status: 'shipped' }, code: 'ORDER_NOT_PAYABLE', msg: '订单状态不支持支付' },
        { overrides: { paymentMethod: 'khqr' }, code: 'VALIDATION_ERROR', msg: '该订单未选择 ABA Pay 支付方式' },
        { overrides: { paymentTimeout: new Date(Date.now() - 1000) }, code: 'ORDER_CANCELLED', msg: '支付已超时，请重新下单' },
      ];
      const service = await loadService();
      for (const { overrides, code, msg } of cases) {
        const order = abaOrder(overrides);
        mockPrisma.order._set(order.id, order);
        await assertAppError(service.createABAPayPayment(order.userId, order.id), {
          statusCode: 400,
          errorCode: code,
          message: msg,
        });
      }
    });

    it('ABA Pay 生成 Deep Link 失败时应抛出 503 PAYMENT_SERVICE_UNAVAILABLE', async () => {
      const order = abaOrder();
      mockPrisma.order._set(order.id, order);
      mockAbaPay.generateDeepLink.mockRejectedValue(new Error('ABA down'));
      const service = await loadService();
      await assertAppError(service.createABAPayPayment(order.userId, order.id), {
        statusCode: 503,
        errorCode: 'PAYMENT_SERVICE_UNAVAILABLE',
        message: '支付服务暂不可用，请稍后重试或选择其他支付方式',
      });
    });

    it('成功时应返回 Deep Link 并写入 Redis 缓存', async () => {
      const order = abaOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.createABAPayPayment(order.userId, order.id);

      expect(result.orderNumber).toBe(order.orderNumber);
      expect(result.deepLink).toBe('aba://pay');
      expect(result.universalLink).toBe('https://aba.test/pay');
      expect(result.transactionId).toBe('txn-aba');

      const call = mockRedis.set.mock.calls.find((c) => c[0] === `payment:${order.id}`);
      expect(call).toBeDefined();
      expect(JSON.parse(call[1]).transactionId).toBe('txn-aba');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // createWingPayPayment
  // ═══════════════════════════════════════════════════════════
  describe('createWingPayPayment', () => {
    const wingOrder = (overrides) => makeOrder({ paymentMethod: 'wing_pay', ...overrides });

    it('订单不存在时应抛出 404 NOT_FOUND', async () => {
      const service = await loadService();
      await assertAppError(service.createWingPayPayment('user-1', 'missing-order'), {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: '订单不存在',
      });
    });

    it('订单已取消/已支付/状态错误/支付方式错误/超时均应被拦截', async () => {
      const cases = [
        { overrides: { status: 'cancelled' }, code: 'ORDER_CANCELLED', msg: '订单已取消' },
        { overrides: { paymentStatus: 'success' }, code: 'ORDER_ALREADY_PAID', msg: '订单已支付，无需重复支付' },
        { overrides: { status: 'shipped' }, code: 'ORDER_NOT_PAYABLE', msg: '订单状态不支持支付' },
        { overrides: { paymentMethod: 'khqr' }, code: 'VALIDATION_ERROR', msg: '该订单未选择 Wing Pay 支付方式' },
        { overrides: { paymentTimeout: new Date(Date.now() - 1000) }, code: 'ORDER_CANCELLED', msg: '支付已超时，请重新下单' },
      ];
      const service = await loadService();
      for (const { overrides, code, msg } of cases) {
        const order = wingOrder(overrides);
        mockPrisma.order._set(order.id, order);
        await assertAppError(service.createWingPayPayment(order.userId, order.id), {
          statusCode: 400,
          errorCode: code,
          message: msg,
        });
      }
    });

    it('Wing Pay 生成 Deep Link 失败时应抛出 503 PAYMENT_SERVICE_UNAVAILABLE', async () => {
      const order = wingOrder();
      mockPrisma.order._set(order.id, order);
      mockWingPay.generateDeepLink.mockRejectedValue(new Error('Wing down'));
      const service = await loadService();
      await assertAppError(service.createWingPayPayment(order.userId, order.id), {
        statusCode: 503,
        errorCode: 'PAYMENT_SERVICE_UNAVAILABLE',
        message: '支付服务暂不可用，请稍后重试或选择其他支付方式',
      });
    });

    it('成功时应返回 Deep Link 并写入 Redis 缓存', async () => {
      const order = wingOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.createWingPayPayment(order.userId, order.id);

      expect(result.orderNumber).toBe(order.orderNumber);
      expect(result.deepLink).toBe('wingbank://pay');
      expect(result.universalLink).toBe('https://wing.test/pay');
      expect(result.transactionId).toBe('txn-wing');

      const call = mockRedis.set.mock.calls.find((c) => c[0] === `payment:${order.id}`);
      expect(call).toBeDefined();
      expect(JSON.parse(call[1]).transactionId).toBe('txn-wing');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // createTelegramInvoicePayment
  // ═══════════════════════════════════════════════════════════
  describe('createTelegramInvoicePayment', () => {
    const tgOrder = (overrides) => makeOrder({ paymentMethod: 'telegram_invoice', ...overrides });

    it('订单不存在时应抛出 404 NOT_FOUND', async () => {
      const service = await loadService();
      await assertAppError(service.createTelegramInvoicePayment('user-1', 'missing-order'), {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: '订单不存在',
      });
    });

    it('订单已取消/已支付/状态错误/支付方式错误/超时均应被拦截', async () => {
      const cases = [
        { overrides: { status: 'cancelled' }, code: 'ORDER_CANCELLED', msg: '订单已取消' },
        { overrides: { paymentStatus: 'success' }, code: 'ORDER_ALREADY_PAID', msg: '订单已支付，无需重复支付' },
        { overrides: { status: 'shipped' }, code: 'ORDER_NOT_PAYABLE', msg: '订单状态不支持支付' },
        { overrides: { paymentMethod: 'khqr' }, code: 'VALIDATION_ERROR', msg: '该订单未选择 Telegram 支付' },
        { overrides: { paymentTimeout: new Date(Date.now() - 1000) }, code: 'ORDER_CANCELLED', msg: '支付已超时，请重新下单' },
      ];
      const service = await loadService();
      for (const { overrides, code, msg } of cases) {
        const order = tgOrder(overrides);
        mockPrisma.order._set(order.id, order);
        await assertAppError(service.createTelegramInvoicePayment(order.userId, order.id), {
          statusCode: 400,
          errorCode: code,
          message: msg,
        });
      }
    });

    it('Telegram 发票创建失败时应抛出 503 PAYMENT_SERVICE_UNAVAILABLE', async () => {
      const order = tgOrder();
      mockPrisma.order._set(order.id, order);
      mockTelegramPayments.createInvoiceLink.mockRejectedValue(new Error('Telegram down'));
      const service = await loadService();
      await assertAppError(service.createTelegramInvoicePayment(order.userId, order.id), {
        statusCode: 503,
        errorCode: 'PAYMENT_SERVICE_UNAVAILABLE',
        message: '支付服务暂不可用，请稍后重试或选择其他支付方式',
      });
    });

    it('成功时应返回发票链接并写入 Redis 缓存（transactionId 为 payload）', async () => {
      const order = tgOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.createTelegramInvoicePayment(order.userId, order.id);

      expect(result.orderNumber).toBe(order.orderNumber);
      expect(result.invoiceUrl).toBe('https://t.me/invoice');
      expect(result.payload).toBe('tgmall:ORD-001:123456');

      const call = mockRedis.set.mock.calls.find((c) => c[0] === `payment:${order.id}`);
      expect(call).toBeDefined();
      const cached = JSON.parse(call[1]);
      expect(cached.transactionId).toBe('tgmall:ORD-001:123456');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getPaymentStatus
  // ═══════════════════════════════════════════════════════════
  describe('getPaymentStatus', () => {
    it('订单不存在时应抛出 404 NOT_FOUND', async () => {
      const service = await loadService();
      await assertAppError(service.getPaymentStatus('user-1', 'missing-order'), {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: '订单不存在',
      });
    });

    it('pending 且已超时时应返回 failed', async () => {
      const order = makeOrder({
        paymentStatus: 'pending',
        paymentTimeout: new Date(Date.now() - 1000),
      });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.getPaymentStatus(order.userId, order.id);
      expect(result).toMatchObject({
        orderNumber: order.orderNumber,
        paymentStatus: 'failed',
        orderStatus: order.status,
        failureReason: '支付超时',
        amountUsd: order.totalUsd,
      });
    });

    it('pending 未超时时应返回正常 pending 状态', async () => {
      const order = makeOrder({ paymentStatus: 'pending' });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.getPaymentStatus(order.userId, order.id);
      expect(result).toMatchObject({
        orderNumber: order.orderNumber,
        paymentStatus: 'pending',
        orderStatus: order.status,
        amountUsd: order.totalUsd,
      });
    });

    it('success 时应返回 paidAt', async () => {
      const paidAt = new Date('2026-07-10T11:00:00.000Z');
      const order = makeOrder({ paymentStatus: 'success', status: 'paid', paidAt });
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.getPaymentStatus(order.userId, order.id);
      expect(result).toMatchObject({
        orderNumber: order.orderNumber,
        paymentStatus: 'success',
        orderStatus: 'paid',
        paidAt,
        amountUsd: order.totalUsd,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // handlePaymentCallback
  // ═══════════════════════════════════════════════════════════
  describe('handlePaymentCallback', () => {
    function callbackPayload(overrides = {}) {
      return {
        provider: 'bakong',
        transaction_id: 'txn-1',
        order_number: 'ORD-001',
        amount: 50,
        status: 'success',
        paid_at: new Date().toISOString(),
        signature: 'mock-signature',
        ...overrides,
      };
    }

    beforeEach(() => {
      mockBakong.verifySignature.mockResolvedValue(true);
    });

    it('未知支付渠道时应返回 400 INVALID_PROVIDER', async () => {
      const service = await loadService();
      await assertAppError(service.handlePaymentCallback(callbackPayload({ provider: 'cod' })), {
        statusCode: 400,
        errorCode: 'INVALID_PROVIDER',
        message: '未知的支付渠道',
      });
    });

    it('签名验证失败时应返回 401 UNAUTHORIZED', async () => {
      mockBakong.verifySignature.mockResolvedValue(false);
      const service = await loadService();
      await assertAppError(service.handlePaymentCallback(callbackPayload()), {
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: '签名验证失败',
      });
    });

    it('重复回调时应返回 duplicate', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      await mockRedis.set('payment:callback:bakong:txn-1', '1');
      const service = await loadService();
      const result = await service.handlePaymentCallback(callbackPayload());
      expect(result).toEqual({ status: 'duplicate', message: '回调已处理过' });
    });

    it('订单不存在时应返回 404 NOT_FOUND', async () => {
      const service = await loadService();
      await assertAppError(service.handlePaymentCallback(callbackPayload({ order_number: 'ORD-GONE' })), {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: '订单不存在',
      });
    });

    it('回调金额不匹配时应返回 400 AMOUNT_MISMATCH', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      await assertAppError(service.handlePaymentCallback(callbackPayload({ amount: 99 })), {
        statusCode: 400,
        errorCode: 'AMOUNT_MISMATCH',
        message: '支付金额不匹配',
      });
    });

    it('status=success 且订单已支付时应跳过处理并返回 processed', async () => {
      const order = makeOrder({ paymentStatus: 'success', status: 'paid' });
      mockPrisma.order._set(order.id, order);
      mockPrisma.product._set('p1', { id: 'p1', salesCount: 0 });
      mockPrisma.orderItem._set('oi1', { id: 'oi1', orderId: order.id, productId: 'p1', quantity: 2 });
      const service = await loadService();
      const result = await service.handlePaymentCallback(callbackPayload());
      expect(result).toEqual({ status: 'processed', message: '回调处理完成' });
      expect(mockPrisma.product._get('p1').salesCount).toBe(0);
      expect(mockNotificationService.notifyUserOrder).not.toHaveBeenCalled();
    });

    it('status=success 正常时应提交事务、增加销量并发送通知', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      mockPrisma.product._set('p1', { id: 'p1', salesCount: 5 });
      mockPrisma.product._set('p2', { id: 'p2', salesCount: 1 });
      mockPrisma.orderItem._set('oi1', { id: 'oi1', orderId: order.id, productId: 'p1', quantity: 2 });
      mockPrisma.orderItem._set('oi2', { id: 'oi2', orderId: order.id, productId: 'p2', quantity: 3 });
      mockPrisma.user._set(order.userId, { id: order.userId, telegramId: 'tg-123', language: 'km' });

      const service = await loadService();
      const result = await service.handlePaymentCallback(callbackPayload());

      expect(result).toEqual({ status: 'processed', message: '回调处理完成' });
      const updated = mockPrisma.order._get(order.id);
      expect(updated.paymentStatus).toBe('success');
      expect(updated.status).toBe('paid');
      expect(updated.paidAt).toBeInstanceOf(Date);
      expect(mockPrisma.product._get('p1').salesCount).toBe(7);
      expect(mockPrisma.product._get('p2').salesCount).toBe(4);

      const idempotencyCall = mockRedis.set.mock.calls.find(
        (c) => c[0] === 'payment:callback:bakong:txn-1' && c[1] === '1',
      );
      expect(idempotencyCall).toBeDefined();
      expect(idempotencyCall.slice(2)).toEqual(['EX', 86400]);

      expect(mockNotificationService.notifyUserOrder).toHaveBeenCalledWith(
        expect.objectContaining({ userId: order.userId, telegramId: 'tg-123', languageCode: 'km' }),
        expect.objectContaining({ orderNumber: order.orderNumber }),
        'paid',
      );
    });

    it('status=failed 时应将订单标记为 paymentStatus=failed', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.handlePaymentCallback(callbackPayload({ status: 'failed' }));
      expect(result).toEqual({ status: 'processed', message: '回调处理完成' });
      expect(mockPrisma.order._get(order.id).paymentStatus).toBe('failed');
      expect(mockPrisma.order._get(order.id).status).not.toBe('paid');
    });

    it('status=processing 时应更新 paymentStatus 为 processing', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.handlePaymentCallback(callbackPayload({ status: 'processing' }));
      expect(result).toEqual({ status: 'processed', message: '回调处理完成' });
      expect(mockPrisma.order._get(order.id).paymentStatus).toBe('processing');
    });

    it('status=pending 时应仅记录不改变状态', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      const service = await loadService();
      const result = await service.handlePaymentCallback(callbackPayload({ status: 'pending' }));
      expect(result).toEqual({ status: 'processed', message: '回调处理完成' });
      expect(mockPrisma.order._get(order.id).paymentStatus).toBe('pending');
    });

    // ═══ T1: provider='khqr' 映射测试 ═══

    it('TC-PAY-SVC-CB-008: provider=khqr 时不应抛出 INVALID_PROVIDER，应路由到 bakong 验签', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      mockBakong.verifySignature.mockResolvedValue(true);
      const service = await loadService();
      // 核心：khqr 必须在 verifyFns 中可查，不能抛"未知的支付渠道"
      const result = await service.handlePaymentCallback(callbackPayload({
        provider: 'khqr',
        order_number: order.orderNumber,
      }));
      expect(result.status).toBe('processed');
    });

    it('TC-PAY-SVC-CB-009: provider=khqr 签名失败时仍抛出 UNAUTHORIZED', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      mockBakong.verifySignature.mockResolvedValue(false);
      const service = await loadService();
      await assertAppError(service.handlePaymentCallback(callbackPayload({
        provider: 'khqr',
        order_number: order.orderNumber,
      })), {
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: '签名验证失败',
      });
    });

    it('TC-PAY-SVC-CB-010: provider=khqr 完整成功流程（事务+销量+通知）', async () => {
      const order = makeOrder();
      mockPrisma.order._set(order.id, order);
      mockPrisma.product._set('p1', { id: 'p1', salesCount: 5 });
      mockPrisma.orderItem._set('oi1', { id: 'oi1', orderId: order.id, productId: 'p1', quantity: 2 });
      mockPrisma.user._set(order.userId, { id: order.userId, telegramId: 'tg-123', language: 'km' });
      mockBakong.verifySignature.mockResolvedValue(true);

      const service = await loadService();
      const result = await service.handlePaymentCallback(callbackPayload({
        provider: 'khqr',
        order_number: order.orderNumber,
        transaction_id: 'txn-khqr-new',
      }));

      expect(result).toEqual({ status: 'processed', message: '回调处理完成' });
      const updated = mockPrisma.order._get(order.id);
      expect(updated.paymentStatus).toBe('success');
      expect(updated.status).toBe('paid');
      expect(mockPrisma.product._get('p1').salesCount).toBe(7);

      // 幂等 key 用的是 payload.provider（即 khqr）
      const idempotencyCall = mockRedis.set.mock.calls.find(
        (c) => c[0] === 'payment:callback:khqr:txn-khqr-new' && c[1] === '1',
      );
      expect(idempotencyCall).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // handleTelegramPaymentUpdate
  // ═══════════════════════════════════════════════════════════
  describe('handleTelegramPaymentUpdate', () => {
    it('parseTelegramPaymentUpdate 返回 null 时应忽略', async () => {
      mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(null);
      const service = await loadService();
      const result = await service.handleTelegramPaymentUpdate({ update_id: 1 });
      expect(result).toEqual({ status: 'ignored', message: '非支付相关更新' });
    });

    it('payload 缺少订单号时应抛出 400 VALIDATION_ERROR', async () => {
      mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue({
        type: 'successful_payment',
        payload: '',
        telegramPaymentChargeId: 'tg-charge-1',
      });
      const service = await loadService();
      await assertAppError(service.handleTelegramPaymentUpdate({ update_id: 1 }), {
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: '缺少订单号 payload',
      });
    });

    describe('pre_checkout_query', () => {
      const preCheckoutInfo = (overrides) => ({
        type: 'pre_checkout_query',
        preCheckoutQueryId: 'pcq-1',
        payload: 'ORD-001',
        totalAmountUsd: 50,
        currency: 'USD',
        ...overrides,
      });

      it('订单不存在时应回答 false 并抛出 404 NOT_FOUND', async () => {
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(preCheckoutInfo());
        const service = await loadService();
        await assertAppError(service.handleTelegramPaymentUpdate({ update_id: 1 }), {
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: '订单不存在',
        });
        expect(mockTelegramPayments.answerPreCheckoutQuery).toHaveBeenCalledWith('pcq-1', false, '订单不存在');
      });

      it('订单已取消时应回答 false 并抛出 400 ORDER_NOT_PAYABLE', async () => {
        const order = makeOrder({ status: 'cancelled' });
        mockPrisma.order._set(order.id, order);
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(preCheckoutInfo());
        const service = await loadService();
        await assertAppError(service.handleTelegramPaymentUpdate({ update_id: 1 }), {
          statusCode: 400,
          errorCode: 'ORDER_NOT_PAYABLE',
          message: '订单不可支付',
        });
        expect(mockTelegramPayments.answerPreCheckoutQuery).toHaveBeenCalledWith('pcq-1', false, '订单不可支付');
      });

      it('订单已支付时应回答 false 并抛出 400 ORDER_NOT_PAYABLE', async () => {
        const order = makeOrder({ paymentStatus: 'success' });
        mockPrisma.order._set(order.id, order);
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(preCheckoutInfo());
        const service = await loadService();
        await assertAppError(service.handleTelegramPaymentUpdate({ update_id: 1 }), {
          statusCode: 400,
          errorCode: 'ORDER_NOT_PAYABLE',
          message: '订单不可支付',
        });
        expect(mockTelegramPayments.answerPreCheckoutQuery).toHaveBeenCalledWith('pcq-1', false, '订单不可支付');
      });

      it('金额不匹配时应回答 false 并抛出 400 AMOUNT_MISMATCH', async () => {
        const order = makeOrder();
        mockPrisma.order._set(order.id, order);
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(preCheckoutInfo({ totalAmountUsd: 99 }));
        const service = await loadService();
        await assertAppError(service.handleTelegramPaymentUpdate({ update_id: 1 }), {
          statusCode: 400,
          errorCode: 'AMOUNT_MISMATCH',
          message: '支付金额不匹配',
        });
        expect(mockTelegramPayments.answerPreCheckoutQuery).toHaveBeenCalledWith('pcq-1', false, '支付金额不匹配');
      });

      it('合法预结账时应回答 true 并返回 pre_checkout_answered', async () => {
        const order = makeOrder();
        mockPrisma.order._set(order.id, order);
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(preCheckoutInfo());
        const service = await loadService();
        const result = await service.handleTelegramPaymentUpdate({ update_id: 1 });
        expect(result).toEqual({ status: 'pre_checkout_answered', message: '预结账已确认' });
        expect(mockTelegramPayments.answerPreCheckoutQuery).toHaveBeenCalledWith('pcq-1', true);
      });
    });

    describe('successful_payment', () => {
      const successInfo = (overrides) => ({
        type: 'successful_payment',
        payload: 'ORD-001',
        telegramPaymentChargeId: 'tg-charge-1',
        providerPaymentChargeId: 'provider-charge-1',
        totalAmountUsd: 50,
        currency: 'USD',
        ...overrides,
      });

      it('重复回调时应返回 duplicate', async () => {
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(successInfo());
        await mockRedis.set('payment:callback:telegram:tg-charge-1', '1');
        const service = await loadService();
        const result = await service.handleTelegramPaymentUpdate({ update_id: 1 });
        expect(result).toEqual({ status: 'duplicate', message: '回调已处理过' });
      });

      it('订单不存在时应抛出 404 NOT_FOUND', async () => {
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(successInfo({ payload: 'ORD-GONE' }));
        const service = await loadService();
        await assertAppError(service.handleTelegramPaymentUpdate({ update_id: 1 }), {
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: '订单不存在',
        });
      });

      it('订单已支付时应跳过处理并返回 processed', async () => {
        const order = makeOrder({ paymentStatus: 'success', status: 'paid' });
        mockPrisma.order._set(order.id, order);
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(successInfo());
        const service = await loadService();
        const result = await service.handleTelegramPaymentUpdate({ update_id: 1 });
        expect(result).toEqual({ status: 'processed', message: '支付成功处理完成' });
        expect(mockNotificationService.notifyUserOrder).not.toHaveBeenCalled();
      });

      it('正常支付成功时应提交事务、增加销量、设置幂等标记并发送通知', async () => {
        const order = makeOrder();
        mockPrisma.order._set(order.id, order);
        mockPrisma.product._set('p1', { id: 'p1', salesCount: 0 });
        mockPrisma.orderItem._set('oi1', { id: 'oi1', orderId: order.id, productId: 'p1', quantity: 2 });
        mockPrisma.user._set(order.userId, { id: order.userId, telegramId: 'tg-456', language: 'en' });
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(successInfo());

        const service = await loadService();
        const result = await service.handleTelegramPaymentUpdate({ update_id: 1 });

        expect(result).toEqual({ status: 'processed', message: '支付成功处理完成' });
        const updated = mockPrisma.order._get(order.id);
        expect(updated.paymentStatus).toBe('success');
        expect(updated.status).toBe('paid');
        expect(updated.paidAt).toBeInstanceOf(Date);
        expect(updated.logisticsInfo).toMatchObject({
          telegramPaymentChargeId: 'tg-charge-1',
          providerPaymentChargeId: 'provider-charge-1',
        });
        expect(mockPrisma.product._get('p1').salesCount).toBe(2);

        const idempotencyCall = mockRedis.set.mock.calls.find(
          (c) => c[0] === 'payment:callback:telegram:tg-charge-1' && c[1] === '1',
        );
        expect(idempotencyCall).toBeDefined();
        expect(idempotencyCall.slice(2)).toEqual(['EX', 86400]);

        expect(mockNotificationService.notifyUserOrder).toHaveBeenCalledWith(
          expect.objectContaining({ userId: order.userId, telegramId: 'tg-456', languageCode: 'en' }),
          expect.objectContaining({ orderNumber: order.orderNumber }),
          'paid',
        );
      });

      it('事务异常时应抛出 500 INTERNAL_ERROR', async () => {
        const order = makeOrder();
        mockPrisma.order._set(order.id, order);
        mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB deadlock'));
        mockTelegramPayments.parseTelegramPaymentUpdate.mockReturnValue(successInfo());
        const service = await loadService();
        await assertAppError(service.handleTelegramPaymentUpdate({ update_id: 1 }), {
          statusCode: 500,
          errorCode: 'INTERNAL_ERROR',
          message: '支付处理异常，请人工核查',
        });
      });
    });
  });
});
