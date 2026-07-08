import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CheckoutPage from '@/views/CheckoutPage.vue';
import { useCityStore } from '@/stores/cityStore.js';

// ---- shared mock state ----
const routerBack = vi.fn();
const routerPush = vi.fn();
const routeQuery = ref({ ids: 'p1' });

const getAddresses = vi.fn();
const getMyCoupons = vi.fn();
const createOrder = vi.fn();
const checkoutPreview = vi.fn();

// ---- mocks ----
vi.mock('vue-router', () => ({
  useRouter: () => ({ back: routerBack, push: routerPush }),
  useRoute: () => ({ query: routeQuery.value }),
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
  createAddress: () => Promise.resolve({ data: { id: 2, recipient_name: 'New', phone: '012', province: 'PP', district: 'D', detail: 'X', is_default: false } }),
}));

vi.mock('@/api/coupons.js', () => ({
  getMyCoupons: () => getMyCoupons(),
}));

vi.mock('@/api/orders.js', () => ({
  createOrder: () => createOrder(),
}));

vi.mock('@/api/cart.js', () => ({
  checkoutPreview: (data) => checkoutPreview(data),
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

function setPreview({ items = [], priceBreakdown = {}, coupon = null, deliveryRule = null } = {}) {
  checkoutPreview.mockResolvedValue({ data: { items, priceBreakdown, coupon, deliveryRule } });
}

function shippingRowText(wrapper) {
  return wrapper.findAll('.pb-row').find((r) => r.text().includes('checkout.shippingFee'))?.text() || '';
}

function totalRowText(wrapper) {
  return wrapper.find('.pb-row.total')?.text() || '';
}

function makeItem(priceUsd, quantity = 1) {
  return {
    id: `p1${quantity}`,
    productId: 'p1',
    productName: 'Product 1',
    priceUsd,
    priceKhr: priceUsd * 4000,
    quantity,
    thumbnail: '',
    spec: {},
    stockStatus: 'ok',
    subtotalUsd: priceUsd * quantity,
  };
}

const phnomPenh = { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 };
const siemReap = { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 };
const defaultAddress = {
  id: 1,
  recipient_name: 'Test User',
  phone: '012345678',
  province: 'Phnom Penh',
  district: 'Chamkar Mon',
  detail: 'St 123',
  is_default: true,
};

describe('CheckoutPage checkout preview', () => {
  let wrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    routeQuery.value = { ids: 'p1' };
    getAddresses.mockResolvedValue({ data: [defaultAddress] });
    getMyCoupons.mockResolvedValue({ data: [] });
    createOrder.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
  });

  it('calls checkout preview for the current city on mount', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh, siemReap]);
    store.setCity('phnom_penh');
    setPreview({ items: [makeItem(10)], priceBreakdown: { subtotalUsd: 10, totalUsd: 10, totalKhr: 40000 } });

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(checkoutPreview).toHaveBeenCalledWith(expect.objectContaining({ item_ids: ['p1'], city_code: 'phnom_penh' }));
  });

  it('re-loads preview when the city changes', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh, siemReap]);
    store.setCity('phnom_penh');
    setPreview({ items: [makeItem(10)], priceBreakdown: { subtotalUsd: 10, totalUsd: 10, totalKhr: 40000 } });

    wrapper = mountCheckoutPage();
    await flushPromises();
    expect(checkoutPreview).toHaveBeenCalledTimes(1);

    store.setCity('siem_reap');
    await flushPromises();

    expect(checkoutPreview).toHaveBeenCalledTimes(2);
    expect(checkoutPreview).toHaveBeenLastCalledWith(expect.objectContaining({ city_code: 'siem_reap' }));
  });

  it('shows shipping fee when subtotal is below free-shipping threshold', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');
    setPreview({
      items: [makeItem(10)],
      priceBreakdown: { subtotalUsd: 10, shippingFeeUsd: 2.5, shippingFeeKhr: 10000, totalUsd: 12.5, totalKhr: 50000, minOrderAmountUsd: 5, shortfallUsd: 0 },
    });

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(shippingRowText(wrapper)).toContain('$2.50');
    expect(shippingRowText(wrapper)).toContain('៛10,000');

    const submitBtn = wrapper.find('.submit-btn');
    expect(submitBtn.attributes('disabled')).toBeUndefined();
    expect(submitBtn.text()).toContain('checkout.submit');
    expect(submitBtn.text()).toContain('$12.50');
    expect(submitBtn.text()).toContain('៛50,000');
  });

  it('shows free shipping when price breakdown says so', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');
    setPreview({
      items: [makeItem(25)],
      priceBreakdown: { subtotalUsd: 25, shippingFeeUsd: 0, shippingFeeKhr: 0, totalUsd: 25, totalKhr: 100000, minOrderAmountUsd: 5, shortfallUsd: 0 },
    });

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(shippingRowText(wrapper)).toContain('checkout.freeShipping');
  });

  it('disables submit and shows shortfall when below minimum order amount', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');
    setPreview({
      items: [makeItem(10)],
      priceBreakdown: { subtotalUsd: 10, shippingFeeUsd: 2, shippingFeeKhr: 8000, totalUsd: 12, totalKhr: 48000, minOrderAmountUsd: 15, shortfallUsd: 5 },
    });

    wrapper = mountCheckoutPage();
    await flushPromises();

    const shortfallRow = wrapper.find('.pb-row.shortfall');
    expect(shortfallRow.exists()).toBe(true);
    expect(shortfallRow.text()).toContain('$5.00');
    expect(shortfallRow.text()).toContain('៛20,000');

    const submitBtn = wrapper.find('.submit-btn');
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(submitBtn.text()).toContain('$5.00');
    expect(submitBtn.text()).toContain('៛20,000');
  });

  it('total includes subtotal - discount + shipping fee', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');
    setPreview({
      items: [makeItem(30)],
      priceBreakdown: { subtotalUsd: 30, discountUsd: 0, shippingFeeUsd: 2, shippingFeeKhr: 8000, totalUsd: 32, totalKhr: 128000, minOrderAmountUsd: 5, shortfallUsd: 0 },
    });

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(totalRowText(wrapper)).toContain('$32.00');
    expect(totalRowText(wrapper)).toContain('៛128,000');
    expect(wrapper.find('.submit-btn').text()).toContain('$32.00');
    expect(wrapper.find('.submit-btn').text()).toContain('៛128,000');

    // 选择固定金额优惠券后重新请求预览
    checkoutPreview.mockResolvedValue({
      data: {
        items: [makeItem(30)],
        priceBreakdown: { subtotalUsd: 30, discountUsd: 5, discountKhr: 20000, shippingFeeUsd: 2, shippingFeeKhr: 8000, totalUsd: 27, totalKhr: 108000, minOrderAmountUsd: 5, shortfallUsd: 0 },
        coupon: { id: 'c2', type: 'fixed', value: 5 },
      },
    });
    await wrapper.vm.selectCoupon({ id: 'uc1', coupon: { id: 'c2', type: 'fixed', value: 5 } });
    await flushPromises();

    expect(checkoutPreview).toHaveBeenLastCalledWith(expect.objectContaining({ coupon_id: 'uc1' }));
    expect(totalRowText(wrapper)).toContain('$27.00');
    expect(totalRowText(wrapper)).toContain('៛108,000');
  });

  it('silently degrades when preview fails to load', async () => {
    const store = useCityStore();
    store.setCities([phnomPenh]);
    store.setCity('phnom_penh');
    checkoutPreview.mockRejectedValue(new Error('network error'));

    wrapper = mountCheckoutPage();
    await flushPromises();

    expect(wrapper.find('.empty').exists()).toBe(true);
    expect(wrapper.find('.submit-btn').exists()).toBe(false);
  });
});
