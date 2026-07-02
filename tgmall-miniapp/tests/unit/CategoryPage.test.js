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
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
      { code: 'electronics', nameKm: 'ឧបករណ៍អេឡិចត្រូនិច', nameEn: 'Electronics', nameZh: '电子', sortOrder: 2 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    const cards = wrapper.findAll('.category-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].find('.cat-name').text()).toBe('ពាក់ព័ន្ធ');
    expect(cards[1].find('.cat-name').text()).toBe('ឧបករណ៍អេឡិចត្រូនិច');
  });

  it('displays the icon image when iconUrl is present', async () => {
    mockCategories.value = [
      { code: 'home', nameKm: 'ផ្ទះ', nameEn: 'Home', nameZh: '家居', iconUrl: 'https://cdn.test/home.png', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    const img = wrapper.find('.category-card img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://cdn.test/home.png');
    expect(wrapper.find('.cat-emoji').exists()).toBe(false);
  });

  it('falls back to emoji when iconUrl is absent', async () => {
    mockCategories.value = [
      { code: 'beauty', nameKm: 'សម្ផស្ស', nameEn: 'Beauty', nameZh: '美妆', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.category-card img').exists()).toBe(false);
    expect(wrapper.find('.cat-emoji').exists()).toBe(true);
    expect(wrapper.find('.cat-emoji').text()).toBe('💄');
  });

  it('navigates to / with ?category={code} when a category is clicked', async () => {
    mockCategories.value = [
      { code: 'food', nameKm: 'អាហារ', nameEn: 'Food', nameZh: '食品', sortOrder: 1 },
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
      { code: 'unknown', nameKm: 'មិនស្គាល់', nameEn: 'Unknown', nameZh: '未知', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.category-card img').exists()).toBe(false);
    expect(wrapper.find('.cat-emoji').text()).toBe('📦');
  });

  it('uses nameEn when the locale is en', async () => {
    mockLocale.value = 'en';
    mockCategories.value = [
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.cat-name').text()).toBe('Fashion');
  });

  it('uses nameZh when the locale is zh', async () => {
    mockLocale.value = 'zh';
    mockCategories.value = [
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.cat-name').text()).toBe('时尚');
  });
});
