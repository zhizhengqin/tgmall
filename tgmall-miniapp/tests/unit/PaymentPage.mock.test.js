// T4: PaymentPage mock 确认 UI 单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import PaymentPage from '@/views/PaymentPage.vue';

// ── Mocks ──
const mockLocale = ref('zh');
const routerReplace = vi.fn();
const routerBack = vi.fn();
const routerPush = vi.fn();
const mockConfirmPayment = vi.fn().mockResolvedValue({
  data: { status: 'processed', isMock: true },
});
const mockCreateKHQRPayment = vi.fn().mockResolvedValue({
  data: { qrImageUrl: '', qrData: '', supportedBanks: [], expiresAt: null },
});
const mockCreateABAPayPayment = vi.fn().mockResolvedValue({
  data: { deepLink: 'aba://pay', universalLink: '' },
});
const mockCreateWingPayPayment = vi.fn().mockResolvedValue({
  data: { deepLink: 'wing://pay', universalLink: '' },
});
const mockCreateTelegramInvoicePayment = vi.fn().mockResolvedValue({
  data: { invoiceUrl: '' },
});
const mockGetPaymentStatus = vi.fn().mockResolvedValue({
  data: { paymentStatus: 'pending' },
});
const mockCancelOrder = vi.fn().mockResolvedValue({ data: {} });

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: routerReplace,
    back: routerBack,
    push: routerPush,
  }),
  useRoute: () => ({
    query: {
      orderId: 'order-test-1',
      orderNumber: 'TG-TEST-001',
      paymentMethod: 'khqr',
      amountUsd: '12.5',
      amountKhr: '52000',
    },
  }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: mockLocale,
    t: (key) => key,
  }),
}));

vi.mock('@/api/payments', () => ({
  createKHQRPayment: (...args) => mockCreateKHQRPayment(...args),
  createABAPayPayment: (...args) => mockCreateABAPayPayment(...args),
  createWingPayPayment: (...args) => mockCreateWingPayPayment(...args),
  createTelegramInvoicePayment: (...args) => mockCreateTelegramInvoicePayment(...args),
  getPaymentStatus: (...args) => mockGetPaymentStatus(...args),
  mockConfirmPayment: (...args) => mockConfirmPayment(...args),
}));

vi.mock('@/api/orders', () => ({
  cancelOrder: (...args) => mockCancelOrder(...args),
}));

vi.mock('@/stores/languageStore', () => ({
  useLanguageStore: () => ({
    current: ref('zh'),
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/composables/useShopConfig.js', () => ({
  useShopConfig: () => ({
    exchangeRate: ref(4100),
  }),
}));

// ── Helper ──
function mountPage(queryOverrides = {}) {
  // 允许覆盖路由 query
  if (Object.keys(queryOverrides).length) {
    const { useRoute } = requireMock('vue-router');
    // 这里不覆盖，直接在下文通过重新 mock 处理
  }
  return mount(PaymentPage, {
    global: {
      mocks: { $t: (key) => key },
      stubs: {
        PriceDisplay: { template: '<div class="price-display-stub"></div>', props: ['priceUsd', 'priceKhr'] },
      },
    },
    attachTo: document.body,
  });
}

function requireMock(name) {
  // helper to access mock state
  return vi.mocked(vi.getMockedModule(name));
}

describe('PaymentPage mock 确认 UI (T4)', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmPayment.mockResolvedValue({ data: { status: 'processed', isMock: true } });
    mockCreateKHQRPayment.mockResolvedValue({
      data: { qrImageUrl: '', qrData: '', supportedBanks: [], expiresAt: null },
    });
    mockGetPaymentStatus.mockResolvedValue({ data: { paymentStatus: 'pending' } });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  // ═══ RED 阶段：以下测试将全部失败，mock 确认 UI 尚未实现 ═══

  describe('mock 确认区域存在性', () => {
    it('TC-PAGE-001: KHQR ready 状态时显示"模拟支付"按钮', async () => {
      wrapper = mountPage();
      await flushPromises();

      const btn = wrapper.find('[data-test="mock-confirm-btn"]');
      expect(btn.exists()).toBe(true);
      // i18n mock 返回 key 名，验证 key 存在即可
      expect(btn.text()).toBe('payment.mockPayKhqr');
    });

    it('TC-PAGE-002: 点击"模拟支付"显示确认卡片', async () => {
      wrapper = mountPage();
      await flushPromises();

      // 初始状态：确认卡片不可见
      expect(wrapper.find('[data-test="mock-confirm-card"]').exists()).toBe(false);

      // 点击按钮
      await wrapper.find('[data-test="mock-confirm-btn"]').trigger('click');
      await flushPromises();

      // 确认卡片出现
      const card = wrapper.find('[data-test="mock-confirm-card"]');
      expect(card.exists()).toBe(true);
      expect(card.text()).toContain('payment.mockConfirmTitle');
    });

    it('TC-PAGE-003: 点击"取消"隐藏确认卡片', async () => {
      wrapper = mountPage();
      await flushPromises();

      await wrapper.find('[data-test="mock-confirm-btn"]').trigger('click');
      await flushPromises();
      expect(wrapper.find('[data-test="mock-confirm-card"]').exists()).toBe(true);

      await wrapper.find('[data-test="mock-cancel-btn"]').trigger('click');
      await flushPromises();

      expect(wrapper.find('[data-test="mock-confirm-card"]').exists()).toBe(false);
    });
  });

  describe('mock 确认流程', () => {
    it('TC-PAGE-004: 点击"确认支付"调用 mockConfirmPayment API 并跳转成功页', async () => {
      wrapper = mountPage();
      await flushPromises();

      await wrapper.find('[data-test="mock-confirm-btn"]').trigger('click');
      await flushPromises();

      await wrapper.find('[data-test="mock-confirm-submit"]').trigger('click');
      await flushPromises();

      expect(mockConfirmPayment).toHaveBeenCalledTimes(1);
      expect(mockConfirmPayment).toHaveBeenCalledWith('order-test-1', 'khqr');

      // 跳转到支付结果页
      expect(routerReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PaymentResult',
          query: expect.objectContaining({
            status: 'success',
            orderId: 'order-test-1',
          }),
        }),
      );
    });

    it('TC-PAGE-005: 处理中时确认按钮 disabled，防止重复提交', async () => {
      // 让 API 延迟返回
      let resolveLater;
      mockConfirmPayment.mockReturnValue(new Promise((r) => { resolveLater = r; }));

      wrapper = mountPage();
      await flushPromises();

      await wrapper.find('[data-test="mock-confirm-btn"]').trigger('click');
      await flushPromises();

      const submitBtn = wrapper.find('[data-test="mock-confirm-submit"]');
      await submitBtn.trigger('click');
      await flushPromises();

      // 处理中 → disabled
      expect(submitBtn.attributes('disabled')).toBeDefined();

      // resolve
      resolveLater({ data: { status: 'processed', isMock: true } });
      await flushPromises();

      // 完成后恢复（或已跳转）
      expect(mockConfirmPayment).toHaveBeenCalledTimes(1);
    });

    it('TC-PAGE-006: mock 确认失败时显示错误，不前跳转', async () => {
      mockConfirmPayment.mockRejectedValue(new Error('订单已支付'));

      wrapper = mountPage();
      await flushPromises();

      await wrapper.find('[data-test="mock-confirm-btn"]').trigger('click');
      await flushPromises();

      await wrapper.find('[data-test="mock-confirm-submit"]').trigger('click');
      await flushPromises();

      // 不应跳转
      expect(routerReplace).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'PaymentResult' }),
      );
      // 应显示错误提示
      expect(wrapper.find('[data-test="mock-error-msg"]').exists()).toBe(true);
    });
  });
});
