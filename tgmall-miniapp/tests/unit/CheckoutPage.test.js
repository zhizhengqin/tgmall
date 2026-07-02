import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CheckoutPage from '@/views/CheckoutPage.vue';
import { useCityStore } from '@/stores/cityStore.js';

// ---- shared mock state ----
const mockDeliveryRule = ref(null);
const mockLoadDeliveryRule = vi.fn();

const routerBack = vi.fn();
const routerPush = vi.fn();

const getAddresses = vi.fn();
const getMyCoupons = vi.fn();
const createOrder = vi.fn();

let checkoutItems = [];

// ---- mocks ----
vi.mock('@/composables/useShopConfig.js', () => ({
  useShopConfig: () => ({
    deliveryRule: mockDeliveryRule,
    loadDeliveryRule: mockLoadDeliveryRule,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ back: routerBack, push: routerPush }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: ref('km'),
    t: (key) => key,
  }),
}));

vi.mock('@/stores/languageStore.js', () => ({
  useLanguageStore: () => ({
    current: 'km',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/composables/useTelegram.js', () => ({
  useTelegram: () => ({
    enableCloseConfirmation: vi.fn(),
  }),
}));

vi.mock('@/api/addresses.js', () => ({
  getAddresses: () => getAddresses(),
}));

vi.mock('@/api/coupons.js', () => ({
  getMyCoupons: () => getMyCoupons(),
}));

vi.mock('@/api/orders.js', () => ({
  createOrder: () => createOrder(),
}));

// checkout keys that include named interpolation; others fall back to the key itself
const checkoutMessages = {
  'checkout.shortfall': '还差 {amount}（满 {min} 起送）',
  'checkout.submitShortfall': '差 {amount} 起送',
};

function mockT(key, params) {
  let str = checkoutMessages[key] ?? key;
  if (!params) return str;
  return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), str);
}

// ---- helpers ----
function mountCheckoutPage() {
  return mount(CheckoutPage, {
    global: {
      mocks: {
        $t: mockT,
      },
    },
    attachTo: document.body,
  });
}

function setCheckoutItems(items) {
  checkoutItems = items;
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key) => (key === 'checkout_items' ? JSON.stringify(checkoutItems) : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
}

function shippingRowText(wrapper) {
  return wrapper.findAll('.pb-row').find((r) => r.text().includes('checkout.shippingFee'))?.text() || '';
}

function totalRowText(wrapper) {
  return wrapper.findAll('.pb-row').find((r) => r.text().includes('合计'))?.text() || '';
}

describe('CheckoutPage delivery rules by city', () => {
  let wrapper;

  const phnomPenh = { code: 'phnom_penh', name_km: 'ភ្នំពេញ', name_en: 'Phnom Penh', name_zh: '金边', sort_order: 1 };
  const siemReap = { code: 'siem_reap', name_km: 'សៀមរាប', name_en: 'Siem Reap', name_zh: '暹粒', sort_order: 2 };
  const defaultAddress = {
    id: 1,
    recipient_name: 'Test User',
    phone: '012345678',
    province: 'Phnom Penh',
    district: 'Chamkar Mon',
    detail: 'St 123',
    is_default: true,
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockDeliveryRule.value = null;
    mockLoadDeliveryRule.mockResolvedValue(undefined);
    getAddresses.mockResolvedValue({ data: [defaultAddress] });
    getMyCoupons.mockResolvedValue({ data: [] });
    createOrder.mockResolvedValue({ data: {} });
    setCheckoutItems([
      { productId: 'p1', productName: 'Product 1', priceUsd: 10, quantity: 1, thumbnail: '' },
    ]);
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
  });

  it('loads delivery rule for the current city on mount', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh, siemReap]);
    store.setCity('phnom_penh');

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(mockLoadDeliveryRule).toHaveBeenCalledWith('phnom_penh');
  });

  it('re-loads delivery rule when the city changes', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh, siemReap]);
    store.setCity('phnom_penh');

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(mockLoadDeliveryRule).toHaveBeenCalledTimes(1);

    store.setCity('siem_reap');
    await flushPromises();

    expect(mockLoadDeliveryRule).toHaveBeenCalledTimes(2);
    expect(mockLoadDeliveryRule).toHaveBeenLastCalledWith('siem_reap');
  });

  it('shows shipping fee when subtotal is below free-shipping threshold', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');

    mockDeliveryRule.value = {
      cityCode: 'phnom_penh',
      shippingFeeUsd: 2.5,
      freeShippingThresholdUsd: 20,
      minOrderAmountUsd: 5,
    };

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(shippingRowText(wrapper)).toContain('$2.50');

    const submitBtn = wrapper.find('.submit-btn');
    expect(submitBtn.attributes('disabled')).toBeUndefined();
    expect(submitBtn.text()).toContain('checkout.submit');
  });

  it('shows free shipping when subtotal meets or exceeds threshold', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');

    mockDeliveryRule.value = {
      cityCode: 'phnom_penh',
      shippingFeeUsd: 2.5,
      freeShippingThresholdUsd: 20,
      minOrderAmountUsd: 5,
    };

    setCheckoutItems([
      { productId: 'p1', productName: 'Product 1', priceUsd: 25, quantity: 1, thumbnail: '' },
    ]);

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(shippingRowText(wrapper)).toContain('checkout.freeShipping');
  });

  it('disables submit and shows shortfall when below minimum order amount', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');

    mockDeliveryRule.value = {
      cityCode: 'phnom_penh',
      shippingFeeUsd: 2,
      freeShippingThresholdUsd: 50,
      minOrderAmountUsd: 15,
    };

    wrapper = mountCheckoutPage();
    await flushPromises();

    const shortfallRow = wrapper.find('.pb-row.shortfall');
    expect(shortfallRow.exists()).toBe(true);
    expect(shortfallRow.text()).toContain('$5.00');
    expect(shortfallRow.text()).toContain('$15.00');

    const submitBtn = wrapper.find('.submit-btn');
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(submitBtn.text()).toContain('$5.00');
  });

  it('total includes subtotal - discount + shipping fee', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');

    mockDeliveryRule.value = {
      cityCode: 'phnom_penh',
      shippingFeeUsd: 2,
      freeShippingThresholdUsd: 50,
      minOrderAmountUsd: 5,
    };

    setCheckoutItems([
      { productId: 'p1', productName: 'Product 1', priceUsd: 30, quantity: 1, thumbnail: '' },
    ]);

    wrapper = mountCheckoutPage();
    await flushPromises();

    // subtotal = 30; discount = 0 (no coupon selected); shipping = 2; total = 32
    expect(totalRowText(wrapper)).toContain('$32.00');
    expect(wrapper.find('.submit-btn').text()).toContain('$32.00');

    // 选择固定金额优惠券后 total = 30 - 5 + 2 = 27
    wrapper.vm.selectedCoupon = { id: 'c2', title: '$5 off', type: 'fixed', value: 5 };
    await flushPromises();

    expect(totalRowText(wrapper)).toContain('$27.00');
    expect(wrapper.find('.submit-btn').text()).toContain('$27.00');
  });

  it('silently degrades when delivery rule fails to load', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');

    mockLoadDeliveryRule.mockRejectedValue(new Error('network error'));
    mockDeliveryRule.value = null;

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(shippingRowText(wrapper)).toContain('checkout.freeShipping');
    expect(wrapper.find('.submit-btn').exists()).toBe(true);
    expect(wrapper.find('.pb-row.shortfall').exists()).toBe(false);
  });
});
