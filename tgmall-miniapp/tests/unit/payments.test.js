// 支付 API 函数单元测试（T5: mockConfirmPayment）
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock api 实例，截获所有请求
const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
const mockGet = vi.fn().mockResolvedValue({ data: { success: true } });

vi.mock('@/api/index.js', () => ({
  default: { post: mockPost, get: mockGet },
}));

const payments = await import('@/api/payments.js');

describe('payments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══ 已有函数不应因改动而破坏 ═══

  it('createKHQRPayment 调用 POST /payments/khqr', () => {
    payments.createKHQRPayment('order-uuid-1');
    expect(mockPost).toHaveBeenCalledWith('/payments/khqr', { order_id: 'order-uuid-1' });
  });

  it('getPaymentStatus 调用 GET /payments/status/:id', () => {
    payments.getPaymentStatus('order-uuid-2');
    expect(mockGet).toHaveBeenCalledWith('/payments/status/order-uuid-2');
  });

  // ═══ T5: mockConfirmPayment ═══

  it('TC-API-001: mockConfirmPayment 调用 POST /payments/mock-confirm 并传 orderId + provider', async () => {
    const result = await payments.mockConfirmPayment('order-uuid-3', 'khqr');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/payments/mock-confirm', {
      orderId: 'order-uuid-3',
      provider: 'khqr',
    });
    expect(result).toEqual({ data: { success: true } });
  });

  it('TC-API-002: mockConfirmPayment 支持 aba_pay provider', async () => {
    await payments.mockConfirmPayment('order-uuid-4', 'aba_pay');

    expect(mockPost).toHaveBeenCalledWith('/payments/mock-confirm', {
      orderId: 'order-uuid-4',
      provider: 'aba_pay',
    });
  });

  it('TC-API-003: mockConfirmPayment 支持 wing_pay provider', async () => {
    await payments.mockConfirmPayment('order-uuid-5', 'wing_pay');

    expect(mockPost).toHaveBeenCalledWith('/payments/mock-confirm', {
      orderId: 'order-uuid-5',
      provider: 'wing_pay',
    });
  });
});
