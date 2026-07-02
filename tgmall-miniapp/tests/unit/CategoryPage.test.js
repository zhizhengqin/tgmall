import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import CategoryPage from '@/views/CategoryPage.vue';

// ---- shared mock state ----
const mockCategories = ref([]);
const mockLoad = vi.fn();
const mockLocale = ref('km');

const routerPush = vi.fn();
const getProducts = vi.fn();

// ---- mocks ----
vi.mock('@/composables/useShopConfig.js', () => ({
  useShopConfig: () => ({
    categories: mockCategories,
    load: mockLoad,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: mockLocale,
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

vi.mock('@/api/products.js', () => ({
  getProducts: (...args) => getProducts(...args),
}));

// ---- helpers ----
function mountCategoryPage() {
  return mount(CategoryPage, {
    global: {
      stubs: {
        ProductCard: true,
        LoadingSkeleton: true,
        BottomNav: true,
      },
      mocks: {
        $t: (key) => key,
        $router: { push: routerPush },
      },
    },
    attachTo: document.body,
  });
}

describe('CategoryPage grid from shop config', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories.value = [];
    mockLocale.value = 'km';
    getProducts.mockResolvedValue({ data: [], meta: { hasNext: false } });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  it('renders categories supplied by useShopConfig().categories', async () => {
    mockCategories.value = [
      { code: 'fashion', name_km: 'ពាក់ព័ន្ធ', name_en: 'Fashion', name_zh: '时尚', sort_order: 1 },
      { code: 'electronics', name_km: 'ឧបករណ៍អេឡិចត្រូនិច', name_en: 'Electronics', name_zh: '电子', sort_order: 2 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    const cards = wrapper.findAll('.category-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].find('.cat-name').text()).toBe('ពាក់ព័ន្ធ');
    expect(cards[1].find('.cat-name').text()).toBe('ឧបករណ៍អេឡិចត្រូនិច');
  });

  it('displays the icon image when icon_url is present', async () => {
    mockCategories.value = [
      { code: 'home', name_km: 'ផ្ទះ', name_en: 'Home', name_zh: '家居', icon_url: 'https://cdn.test/home.png', sort_order: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    const img = wrapper.find('.category-card img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://cdn.test/home.png');
    expect(wrapper.find('.cat-emoji').exists()).toBe(false);
  });

  it('falls back to emoji when icon_url is absent', async () => {
    mockCategories.value = [
      { code: 'beauty', name_km: 'សម្ផស្ស', name_en: 'Beauty', name_zh: '美妆', sort_order: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.category-card img').exists()).toBe(false);
    expect(wrapper.find('.cat-emoji').exists()).toBe(true);
    expect(wrapper.find('.cat-emoji').text()).toBe('💄');
  });

  it('navigates to / with ?category={code} when a category is clicked', async () => {
    mockCategories.value = [
      { code: 'food', name_km: 'អាហារ', name_en: 'Food', name_zh: '食品', sort_order: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    await wrapper.find('.category-card').trigger('click');
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith({ path: '/', query: { category: 'food' } });
  });

  it('silently degrades when useShopConfig fails and the page remains usable', async () => {
    mockLoad.mockRejectedValue(new Error('network error'));

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.category-page').exists()).toBe(true);
    expect(wrapper.findAll('.category-card')).toHaveLength(0);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('falls back to the package emoji for an unknown category code', async () => {
    mockCategories.value = [
      { code: 'unknown', name_km: 'មិនស្គាល់', name_en: 'Unknown', name_zh: '未知', sort_order: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.category-card img').exists()).toBe(false);
    expect(wrapper.find('.cat-emoji').text()).toBe('📦');
  });

  it('uses name_en when the locale is en', async () => {
    mockLocale.value = 'en';
    mockCategories.value = [
      { code: 'fashion', name_km: 'ពាក់ព័ន្ធ', name_en: 'Fashion', name_zh: '时尚', sort_order: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.cat-name').text()).toBe('Fashion');
  });

  it('uses name_zh when the locale is zh', async () => {
    mockLocale.value = 'zh';
    mockCategories.value = [
      { code: 'fashion', name_km: 'ពាក់ព័ន្ធ', name_en: 'Fashion', name_zh: '时尚', sort_order: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.cat-name').text()).toBe('时尚');
  });
});
