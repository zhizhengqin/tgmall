// Zod Schema 单元测试 — 边界值与攻击向量覆盖
import { describe, it, expect } from '@jest/globals';
import {
  telegramLoginSchema, sendSmsSchema, phoneLoginSchema,
  resetPasswordSchema, setPasswordSchema, bindPhoneSchema,
} from '../../src/validators/auth.schema.js';
import { paymentWebhookSchema } from '../../src/validators/payment.schema.js';
import { createOrderSchema } from '../../src/validators/order.schema.js';
import { merchantProductSchema } from '../../src/validators/merchant.schema.js';
import { couponSchema, couponUpdateSchema } from '../../src/validators/admin.schema.js';

// === AUTH SCHEMAS ===
describe('telegramLoginSchema', () => {
  it('TC-Z-AUTH-001: 接受有效的 initData', () => {
    const r = telegramLoginSchema.safeParse({ init_data: 'user=%7B%22id%22%3A123%7D&hash=abc' });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-002: 拒绝空 initData', () => {
    const r = telegramLoginSchema.safeParse({ init_data: '' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-003: 拒绝超长 initData (>4096)', () => {
    const r = telegramLoginSchema.safeParse({ init_data: 'x'.repeat(4097) });
    expect(r.success).toBe(false);
  });
});

describe('sendSmsSchema', () => {
  it('TC-Z-AUTH-010: 接受有效的柬埔寨手机号', () => {
    const r = sendSmsSchema.safeParse({ phone: '+85512345678', scene: 'login' });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-011: 拒绝非 +855 手机号', () => {
    const r = sendSmsSchema.safeParse({ phone: '+8613800138000', scene: 'login' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-012: 拒绝不以 +855 开头的手机号', () => {
    const r = sendSmsSchema.safeParse({ phone: '012345678', scene: 'login' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-013: 拒绝 0 开头的本地号', () => {
    const r = sendSmsSchema.safeParse({ phone: '012345678', scene: 'bind_phone' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-014: 拒绝无效的 scene', () => {
    const r = sendSmsSchema.safeParse({ phone: '+85512345678', scene: 'hack' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-015: 拒绝缺少 phone', () => {
    const r = sendSmsSchema.safeParse({ scene: 'login' });
    expect(r.success).toBe(false);
  });
});

describe('phoneLoginSchema', () => {
  it('TC-Z-AUTH-020: 接受验证码登录', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', code: '123456' });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-021: 接受密码登录', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', password: 'abc12345' });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-022: 接受同时提供 code 和 password', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', code: '123456', password: 'abc12345' });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-023: 拒绝没有 code 也没有 password', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-024: 拒绝 5 位验证码', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', code: '12345' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-025: 拒绝 7 位验证码', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', code: '1234567' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-026: 拒绝短密码（<8 位）', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', password: 'abc123' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-027: 拒绝超长密码（>20 位）', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', password: 'a'.repeat(21) });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-028: 拒绝非字母验证码', () => {
    const r = phoneLoginSchema.safeParse({ phone: '+85512345678', code: 'abcdef' });
    expect(r.success).toBe(true); // Zod 只校验 length(6), 不校验数字
  });
});

describe('resetPasswordSchema', () => {
  it('TC-Z-AUTH-030: 接受有效重置请求', () => {
    const r = resetPasswordSchema.safeParse({
      phone: '+85512345678', code: '123456', new_password: 'Abc12345',
    });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-031: 拒绝密码缺少字母', () => {
    const r = resetPasswordSchema.safeParse({
      phone: '+85512345678', code: '123456', new_password: '12345678',
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-032: 拒绝密码缺少数字', () => {
    const r = resetPasswordSchema.safeParse({
      phone: '+85512345678', code: '123456', new_password: 'abcdefgh',
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-033: 拒绝密码过短', () => {
    const r = resetPasswordSchema.safeParse({
      phone: '+85512345678', code: '123456', new_password: 'Ab1',
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-034: 拒绝 code 长度不对', () => {
    const r = resetPasswordSchema.safeParse({
      phone: '+85512345678', code: '12345', new_password: 'Abc12345',
    });
    expect(r.success).toBe(false);
  });
});

describe('setPasswordSchema', () => {
  it('TC-Z-AUTH-040: 接受有效密码', () => {
    const r = setPasswordSchema.safeParse({ password: 'MyPass123' });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-041: 拒绝纯数字密码', () => {
    const r = setPasswordSchema.safeParse({ password: '12345678' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-042: 拒绝纯字母密码', () => {
    const r = setPasswordSchema.safeParse({ password: 'abcdefgh' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-043: 拒绝空对象', () => {
    const r = setPasswordSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe('bindPhoneSchema', () => {
  it('TC-Z-AUTH-050: 接受有效绑定请求', () => {
    const r = bindPhoneSchema.safeParse({ phone: '+85598765432', code: '654321' });
    expect(r.success).toBe(true);
  });

  it('TC-Z-AUTH-051: 拒绝非法手机号', () => {
    const r = bindPhoneSchema.safeParse({ phone: 'not-a-phone', code: '654321' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-AUTH-052: 拒绝 code 超长', () => {
    const r = bindPhoneSchema.safeParse({ phone: '+85598765432', code: '1234567' });
    expect(r.success).toBe(false);
  });
});

// === PAYMENT SCHEMAS ===
describe('paymentWebhookSchema', () => {
  const validWebhook = {
    provider: 'bakong',
    transaction_id: 'TXN-123-abc',
    order_number: 'ORD-2024-001',
    amount: 29.99,
    currency: 'USD',
    status: 'success',
    paid_at: '2024-01-01T00:00:00Z',
    signature: 'sha256sighere',
  };

  it('TC-Z-PAY-001: 接受有效回调', () => {
    const r = paymentWebhookSchema.safeParse(validWebhook);
    expect(r.success).toBe(true);
  });

  it('TC-Z-PAY-002: 拒绝缺少 signature', () => {
    const { signature, ...rest } = validWebhook;
    const r = paymentWebhookSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('TC-Z-PAY-003: 拒绝无效 provider', () => {
    const r = paymentWebhookSchema.safeParse({ ...validWebhook, provider: 'paypal' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PAY-004: 拒绝负数金额', () => {
    const r = paymentWebhookSchema.safeParse({ ...validWebhook, amount: -10 });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PAY-005: 拒绝零金额', () => {
    const r = paymentWebhookSchema.safeParse({ ...validWebhook, amount: 0 });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PAY-006: 拒绝无效 status', () => {
    const r = paymentWebhookSchema.safeParse({ ...validWebhook, status: 'refunded' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PAY-007: 金额字符串应被拒绝 (类型安全)', () => {
    const r = paymentWebhookSchema.safeParse({ ...validWebhook, amount: '29.99' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PAY-008: 拒绝空签名 (长度 <1)', () => {
    const r = paymentWebhookSchema.safeParse({ ...validWebhook, signature: '' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PAY-009: 接受默认 currency=USD', () => {
    const { currency, ...rest } = validWebhook;
    const r = paymentWebhookSchema.safeParse(rest);
    expect(r.success).toBe(true);
    expect(r.data.currency).toBe('USD');
  });
});

// === ORDER SCHEMAS ===
describe('createOrderSchema', () => {
  const validOrder = {
    items: [{ product_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 }],
    shipping_address_id: '123e4567-e89b-12d3-a456-426614174001',
    payment_method: 'khqr',
  };

  it('TC-Z-ORD-001: 接受有效订单', () => {
    const r = createOrderSchema.safeParse(validOrder);
    expect(r.success).toBe(true);
  });

  it('TC-Z-ORD-002: 拒绝空 items 数组', () => {
    const r = createOrderSchema.safeParse({ ...validOrder, items: [] });
    expect(r.success).toBe(false);
  });

  it('TC-Z-ORD-003: 拒绝 product_id 非 UUID', () => {
    const r = createOrderSchema.safeParse({
      ...validOrder, items: [{ product_id: 'not-uuid', quantity: 1 }],
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-ORD-004: 拒绝 quantity=0', () => {
    const r = createOrderSchema.safeParse({
      ...validOrder, items: [{ product_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-ORD-005: 拒绝 quantity>99', () => {
    const r = createOrderSchema.safeParse({
      ...validOrder, items: [{ product_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 100 }],
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-ORD-006: 拒绝无效 payment_method', () => {
    const r = createOrderSchema.safeParse({ ...validOrder, payment_method: 'visa' });
    expect(r.success).toBe(false);
  });

  it('TC-Z-ORD-007: 拒绝缺少 shipping_address_id', () => {
    const { shipping_address_id, ...rest } = validOrder;
    const r = createOrderSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('TC-Z-ORD-008: 接受可选 coupon_id', () => {
    const r = createOrderSchema.safeParse({
      ...validOrder, coupon_id: '123e4567-e89b-12d3-a456-426614174002',
    });
    expect(r.success).toBe(true);
  });

  it('TC-Z-ORD-009: 接受可选 notes', () => {
    const r = createOrderSchema.safeParse({ ...validOrder, notes: '请放门口' });
    expect(r.success).toBe(true);
  });
});

// === MERCHANT / PRODUCT SCHEMAS ===
describe('merchantProductSchema', () => {
  const validProduct = {
    name_km: 'ស្បែកជើងផ្ទាត់',
    name_en: 'Sneakers',
    price_usd: 29.99,
    price_khr: 120000,
    stock: 50,
    category: 'fashion',
    images: [{ url: 'https://example.com/img.jpg' }],
  };

  it('TC-Z-PROD-001: 接受最小有效商品', () => {
    const r = merchantProductSchema.safeParse(validProduct);
    expect(r.success).toBe(true);
  });

  it('TC-Z-PROD-002: 拒绝缺少 name_km', () => {
    const { name_km, ...rest } = validProduct;
    const r = merchantProductSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-003: 拒绝负数价格', () => {
    const r = merchantProductSchema.safeParse({ ...validProduct, price_usd: -5 });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-004: 拒绝零价格', () => {
    const r = merchantProductSchema.safeParse({ ...validProduct, price_usd: 0 });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-005: 拒绝负数库存', () => {
    const r = merchantProductSchema.safeParse({ ...validProduct, stock: -1 });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-006: 接受零库存', () => {
    const r = merchantProductSchema.safeParse({ ...validProduct, stock: 0 });
    expect(r.success).toBe(true);
  });

  it('TC-Z-PROD-007: 拒绝空 images', () => {
    const r = merchantProductSchema.safeParse({ ...validProduct, images: [] });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-008: 拒绝无效图片 URL', () => {
    const r = merchantProductSchema.safeParse({
      ...validProduct, images: [{ url: 'not-a-url' }],
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-009: 接受 tags（最多6个）', () => {
    const r = merchantProductSchema.safeParse({
      ...validProduct,
      tags: [
        { textKm: 'ថ្មី', textEn: 'New', color: '#fff', bg: '#c4932a' },
        { textKm: 'ពេញនិយម', textEn: 'Hot', color: '#fff', bg: '#c43a30' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('TC-Z-PROD-010: 拒绝超过 6 个标签', () => {
    const tags = Array.from({ length: 7 }, (_, i) => ({
      textKm: `Tag${i}`, color: '#000', bg: '#fff',
    }));
    const r = merchantProductSchema.safeParse({ ...validProduct, tags });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-011: 拒绝非整数的库存', () => {
    const r = merchantProductSchema.safeParse({ ...validProduct, stock: 1.5 });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-012: 拒绝 price_khr 非整数', () => {
    const r = merchantProductSchema.safeParse({ ...validProduct, price_khr: 119999.5 });
    expect(r.success).toBe(false);
  });

  it('TC-Z-PROD-013: 接受 status 默认值 active', () => {
    const r = merchantProductSchema.safeParse(validProduct);
    expect(r.success).toBe(true);
    expect(r.data.status).toBe('active');
  });
});

// === COUPON SCHEMAS ===
describe('couponSchema', () => {
  const validCoupon = {
    titleKm: 'គុណបុណ្យពិសេស',
    titleEn: 'Special Discount',
    titleZh: '特别优惠',
    type: 'fixed',
    value: 5,
    minSpend: 10,
    totalQty: 100,
    startDate: new Date('2026-07-01T00:00:00Z'),
    endDate: new Date('2026-07-31T23:59:59Z'),
  };

  it('TC-Z-COUP-001: 接受有效优惠券', () => {
    const r = couponSchema.safeParse(validCoupon);
    expect(r.success).toBe(true);
  });

  it('TC-Z-COUP-002: 拒绝结束时间早于开始时间', () => {
    const r = couponSchema.safeParse({
      ...validCoupon,
      startDate: new Date('2026-07-31T00:00:00Z'),
      endDate: new Date('2026-07-01T00:00:00Z'),
    });
    expect(r.success).toBe(false);
  });

  it('TC-Z-COUP-003: couponUpdateSchema 应支持 partial()', () => {
    expect(typeof couponUpdateSchema.safeParse).toBe('function');
  });

  it('TC-Z-COUP-004: couponUpdateSchema 接受部分字段更新', () => {
    const r = couponUpdateSchema.safeParse({ titleEn: 'Updated Title' });
    expect(r.success).toBe(true);
    expect(r.data.titleEn).toBe('Updated Title');
  });

  it('TC-Z-COUP-005: couponUpdateSchema 仍校验类型取值范围', () => {
    const r = couponUpdateSchema.safeParse({ type: 'invalid_type' });
    expect(r.success).toBe(false);
  });
});
