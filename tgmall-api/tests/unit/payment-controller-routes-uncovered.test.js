// 支付控制器 + 路由未覆盖行为单元测试
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

describe('payment.controller', () => {
  let ctrl;
  let mocks;

  beforeAll(async () => {
    mocks = {
      createKHQRPayment: jest.fn(),
      createABAPayPayment: jest.fn(),
      createWingPayPayment: jest.fn(),
      createTelegramInvoicePayment: jest.fn(),
      getPaymentStatus: jest.fn(),
    };
    jest.unstable_mockModule('../../src/services/payment.service.js', () => mocks);
    ctrl = await import('../../src/controllers/payment.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeRes = () => ({ json: jest.fn() });
  const makeNext = () => jest.fn();

  describe('khqr', () => {
    it('TC-PAY-CTRL-001: 调用 createKHQRPayment 并返回 success', async () => {
      const result = { qr: 'khqr-data' };
      mocks.createKHQRPayment.mockResolvedValue(result);
      const req = { user: { userId: 'user-1' }, validatedBody: { order_id: 'order-1' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.khqr(req, res, next);

      expect(mocks.createKHQRPayment).toHaveBeenCalledWith('user-1', 'order-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
      expect(next).not.toHaveBeenCalled();
    });

    it('TC-PAY-CTRL-002: 出错时调用 next(err)', async () => {
      const err = new Error('KHQR 失败');
      mocks.createKHQRPayment.mockRejectedValue(err);
      const req = { user: { userId: 'user-1' }, validatedBody: { order_id: 'order-1' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.khqr(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('abaPay', () => {
    it('TC-PAY-CTRL-003: 调用 createABAPayPayment 并返回 success', async () => {
      const result = { deepLink: 'aba://pay' };
      mocks.createABAPayPayment.mockResolvedValue(result);
      const req = { user: { userId: 'user-2' }, validatedBody: { order_id: 'order-2' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.abaPay(req, res, next);

      expect(mocks.createABAPayPayment).toHaveBeenCalledWith('user-2', 'order-2');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
      expect(next).not.toHaveBeenCalled();
    });

    it('TC-PAY-CTRL-004: 出错时调用 next(err)', async () => {
      const err = new Error('ABA Pay 失败');
      mocks.createABAPayPayment.mockRejectedValue(err);
      const req = { user: { userId: 'user-2' }, validatedBody: { order_id: 'order-2' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.abaPay(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('wingPay', () => {
    it('TC-PAY-CTRL-005: 调用 createWingPayPayment 并返回 success', async () => {
      const result = { deepLink: 'wing://pay' };
      mocks.createWingPayPayment.mockResolvedValue(result);
      const req = { user: { userId: 'user-3' }, validatedBody: { order_id: 'order-3' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.wingPay(req, res, next);

      expect(mocks.createWingPayPayment).toHaveBeenCalledWith('user-3', 'order-3');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
      expect(next).not.toHaveBeenCalled();
    });

    it('TC-PAY-CTRL-006: 出错时调用 next(err)', async () => {
      const err = new Error('Wing Pay 失败');
      mocks.createWingPayPayment.mockRejectedValue(err);
      const req = { user: { userId: 'user-3' }, validatedBody: { order_id: 'order-3' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.wingPay(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('telegramInvoice', () => {
    it('TC-PAY-CTRL-007: 调用 createTelegramInvoicePayment 并返回 success', async () => {
      const result = { invoiceLink: 'https://t.me/invoice/1' };
      mocks.createTelegramInvoicePayment.mockResolvedValue(result);
      const req = { user: { userId: 'user-4' }, validatedBody: { order_id: 'order-4' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.telegramInvoice(req, res, next);

      expect(mocks.createTelegramInvoicePayment).toHaveBeenCalledWith('user-4', 'order-4');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
      expect(next).not.toHaveBeenCalled();
    });

    it('TC-PAY-CTRL-008: 出错时调用 next(err)', async () => {
      const err = new Error('Telegram Invoice 失败');
      mocks.createTelegramInvoicePayment.mockRejectedValue(err);
      const req = { user: { userId: 'user-4' }, validatedBody: { order_id: 'order-4' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.telegramInvoice(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('TC-PAY-CTRL-009: 调用 getPaymentStatus 并返回 success', async () => {
      const result = { status: 'success' };
      mocks.getPaymentStatus.mockResolvedValue(result);
      const req = { user: { userId: 'user-5' }, params: { orderId: 'order-5' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.status(req, res, next);

      expect(mocks.getPaymentStatus).toHaveBeenCalledWith('user-5', 'order-5');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
      expect(next).not.toHaveBeenCalled();
    });

    it('TC-PAY-CTRL-010: 出错时调用 next(err)', async () => {
      const err = new Error('查询失败');
      mocks.getPaymentStatus.mockRejectedValue(err);
      const req = { user: { userId: 'user-5' }, params: { orderId: 'order-5' } };
      const res = makeRes();
      const next = makeNext();

      await ctrl.status(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

describe('payment.routes', () => {
  let router;
  let validateMock;
  let schemas;

  beforeAll(async () => {
    validateMock = jest.fn((schema) => {
      const mw = (req, res, next) => next();
      mw.schema = schema;
      return mw;
    });

    jest.unstable_mockModule('../../src/services/payment.service.js', () => ({
      createKHQRPayment: jest.fn(),
      createABAPayPayment: jest.fn(),
      createWingPayPayment: jest.fn(),
      createTelegramInvoicePayment: jest.fn(),
      getPaymentStatus: jest.fn(),
    }));
    jest.unstable_mockModule('../../src/middleware/validate.js', () => ({ validate: validateMock }));

    schemas = await import('../../src/validators/payment.schema.js');
    router = (await import('../../src/routes/payment.routes.js')).default;
  });

  const findRoute = (path, method) =>
    router.stack.find((layer) => layer.route && layer.route.path === path && layer.route.methods[method])?.route;

  it('TC-PAY-ROUTE-001: 路由顶层挂载 auth 中间件', () => {
    expect(router.stack[0].handle.name).toBe('auth');
  });

  it('TC-PAY-ROUTE-002: POST /khqr 使用 khqrPaymentSchema 与 khqr 控制器', () => {
    const route = findRoute('/khqr', 'post');
    expect(route).toBeDefined();
    expect(route.stack).toHaveLength(2);
    expect(route.stack[0].handle.schema).toBe(schemas.khqrPaymentSchema);
    expect(route.stack[1].handle.name).toBe('khqr');
  });

  it('TC-PAY-ROUTE-003: POST /aba_pay 使用 abaPayPaymentSchema 与 abaPay 控制器', () => {
    const route = findRoute('/aba_pay', 'post');
    expect(route).toBeDefined();
    expect(route.stack).toHaveLength(2);
    expect(route.stack[0].handle.schema).toBe(schemas.abaPayPaymentSchema);
    expect(route.stack[1].handle.name).toBe('abaPay');
  });

  it('TC-PAY-ROUTE-004: POST /wing_pay 使用 wingPayPaymentSchema 与 wingPay 控制器', () => {
    const route = findRoute('/wing_pay', 'post');
    expect(route).toBeDefined();
    expect(route.stack).toHaveLength(2);
    expect(route.stack[0].handle.schema).toBe(schemas.wingPayPaymentSchema);
    expect(route.stack[1].handle.name).toBe('wingPay');
  });

  it('TC-PAY-ROUTE-005: POST /telegram_invoice 使用 telegramInvoicePaymentSchema 与 telegramInvoice 控制器', () => {
    const route = findRoute('/telegram_invoice', 'post');
    expect(route).toBeDefined();
    expect(route.stack).toHaveLength(2);
    expect(route.stack[0].handle.schema).toBe(schemas.telegramInvoicePaymentSchema);
    expect(route.stack[1].handle.name).toBe('telegramInvoice');
  });

  it('TC-PAY-ROUTE-006: GET /status/:orderId 使用 status 控制器', () => {
    const route = findRoute('/status/:orderId', 'get');
    expect(route).toBeDefined();
    expect(route.stack).toHaveLength(1);
    expect(route.stack[0].handle.name).toBe('status');
  });
});

// ══════════════════════════════════════════════════════════════
// T3: mockConfirmPayment — provider 映射测试（RED 阶段）
// ══════════════════════════════════════════════════════════════
describe('mockConfirmPayment — provider 映射 (T3)', () => {
  let ctrl;
  let mocks;

  beforeAll(async () => {
    // 清除模块缓存：前面 controller 测试已 import 过 controller，
    // 彼时 config/prisma 是真实模块，必须清缓存让新 mock 生效
    jest.resetModules();

    mocks = {
      handlePaymentCallback: jest.fn().mockResolvedValue({ status: 'processed' }),
    };
    // Mock 整个 payment service，只暴露 handlePaymentCallback
    jest.unstable_mockModule('../../src/services/payment.service.js', () => ({
      createKHQRPayment: jest.fn(),
      createABAPayPayment: jest.fn(),
      createWingPayPayment: jest.fn(),
      createTelegramInvoicePayment: jest.fn(),
      getPaymentStatus: jest.fn(),
      handlePaymentCallback: mocks.handlePaymentCallback,
    }));
    // Mock prisma — mockConfirmPayment 需要查订单
    jest.unstable_mockModule('../../src/config/database.js', () => ({
      default: {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'order-test-1',
            orderNumber: 'TG202607100001',
            totalUsd: 12.5,
            totalKhr: 52000,
            status: 'pending_payment',
            paymentStatus: 'pending',
            userId: 'user-1',
          }),
        },
        $transaction: jest.fn((fn) => fn({
          order: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'order-test-1',
              orderNumber: 'TG202607100001',
              totalUsd: 12.5,
              totalKhr: 52000,
              status: 'pending_payment',
              paymentStatus: 'pending',
              userId: 'user-1',
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          orderItem: { findMany: jest.fn().mockResolvedValue([]) },
          product: { update: jest.fn().mockResolvedValue({}) },
        })),
      },
    }));
    // Mock redis — idempotency check
    jest.unstable_mockModule('../../src/config/redis.js', () => ({
      default: { set: jest.fn().mockResolvedValue('OK') },
    }));
    // Mock config — 演示模式开启
    jest.unstable_mockModule('../../src/config/index.js', () => ({
      config: { paymentMockMode: true },
    }));

    ctrl = await import('../../src/controllers/payment.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeRes = () => ({ json: jest.fn() });
  const makeNext = () => jest.fn();

  it('TC-PAY-CTRL-011: provider=khqr 时，传给 handlePaymentCallback 的 provider 应该是 bakong', async () => {
    const req = {
      user: { userId: 'user-1' },
      validatedBody: { orderId: 'order-test-1', provider: 'khqr' },
    };
    const res = makeRes();
    const next = makeNext();

    await ctrl.mockConfirmPayment(req, res, next);

    // 核心断言：传给回调的 payload.provider 已从 khqr 映射为 bakong
    expect(mocks.handlePaymentCallback).toHaveBeenCalledTimes(1);
    const actualPayload = mocks.handlePaymentCallback.mock.calls[0][0];
    expect(actualPayload.provider).toBe('bakong');
  });

  it('TC-PAY-CTRL-012: provider=aba_pay 时，保持 aba_pay 不变', async () => {
    const req = {
      user: { userId: 'user-1' },
      validatedBody: { orderId: 'order-test-1', provider: 'aba_pay' },
    };
    const res = makeRes();
    const next = makeNext();

    await ctrl.mockConfirmPayment(req, res, next);

    const actualPayload = mocks.handlePaymentCallback.mock.calls[0][0];
    expect(actualPayload.provider).toBe('aba_pay');
  });

  it('TC-PAY-CTRL-013: provider=wing_pay 时，保持 wing_pay 不变', async () => {
    const req = {
      user: { userId: 'user-1' },
      validatedBody: { orderId: 'order-test-1', provider: 'wing_pay' },
    };
    const res = makeRes();
    const next = makeNext();

    await ctrl.mockConfirmPayment(req, res, next);

    const actualPayload = mocks.handlePaymentCallback.mock.calls[0][0];
    expect(actualPayload.provider).toBe('wing_pay');
  });

  it('TC-PAY-CTRL-014: 响应 data 中必须包含 isMock: true，前端据此区分模拟支付', async () => {
    const req = {
      user: { userId: 'user-1' },
      validatedBody: { orderId: 'order-test-1', provider: 'khqr' },
    };
    const res = makeRes();
    const next = makeNext();

    await ctrl.mockConfirmPayment(req, res, next);

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { status: 'processed', isMock: true },
    });
  });
});

// ══════════════════════════════════════════════════════════════
// T2: mock-confirm 路由守卫 + Schema 测试（RED 阶段）
// ══════════════════════════════════════════════════════════════
describe('mock-confirm 路由守卫 (T2)', () => {
  let router;
  let validateMock;

  const setupMocks = (paymentMockMode) => {
    jest.resetModules();

    validateMock = jest.fn((schema) => {
      const mw = (req, res, next) => next();
      mw.schema = schema;
      return mw;
    });

    jest.unstable_mockModule('../../src/middleware/validate.js', () => ({ validate: validateMock }));
    jest.unstable_mockModule('../../src/services/payment.service.js', () => ({
      createKHQRPayment: jest.fn(),
      createABAPayPayment: jest.fn(),
      createWingPayPayment: jest.fn(),
      createTelegramInvoicePayment: jest.fn(),
      getPaymentStatus: jest.fn(),
      handlePaymentCallback: jest.fn(),
    }));
    jest.unstable_mockModule('../../src/config/index.js', () => ({
      config: { paymentMockMode },
    }));
  };

  it('TC-PAY-ROUTE-007: paymentMockMode=true 时，POST /mock-confirm 路由存在', async () => {
    setupMocks(true);
    const schemas = await import('../../src/validators/payment.schema.js');
    router = (await import('../../src/routes/payment.routes.js')).default;

    const route = router.stack.find(
      (layer) => layer.route && layer.route.path === '/mock-confirm' && layer.route.methods['post'],
    )?.route;
    expect(route).toBeDefined();
    expect(route.stack).toHaveLength(2);
    expect(route.stack[0].handle.schema).toBe(schemas.mockConfirmPaymentSchema);
    expect(route.stack[1].handle.name).toBe('mockConfirmPayment');
  });

  it('TC-PAY-ROUTE-008: paymentMockMode=false 时，POST /mock-confirm 路由不存在', async () => {
    setupMocks(false);
    router = (await import('../../src/routes/payment.routes.js')).default;

    const route = router.stack.find(
      (layer) => layer.route && layer.route.path === '/mock-confirm' && layer.route.methods['post'],
    )?.route;
    expect(route).toBeUndefined();
  });
});
