import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
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
        MiniCartBar: true,
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

describe('CategoryPage sidebar from shop config', () => {
  let wrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCategories.value = [];
    mockLocale.value = 'km';
    getProducts.mockResolvedValue({ data: [], meta: { hasNext: false } });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  it('renders sidebar categories supplied by useShopConfig().categories', async () => {
    mockCategories.value = [
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
      { code: 'electronics', nameKm: 'ឧបករណ៍អេឡិចត្រូនិច', nameEn: 'Electronics', nameZh: '电子', sortOrder: 2 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    const items = wrapper.findAll('.sidebar-item');
    // 包含 "all" + 2 个分类
    expect(items).toHaveLength(3);
    expect(items[1].find('.sidebar-label').text()).toBe('ពាក់ព័ន្ធ');
    expect(items[2].find('.sidebar-label').text()).toBe('ឧបករណ៍អេឡិចត្រូនិច');
  });

  it('displays the configured emoji for each category', async () => {
    mockCategories.value = [
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
      { code: 'beauty', nameKm: 'សម្ផស្ស', nameEn: 'Beauty', nameZh: '美妆', sortOrder: 2 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    const items = wrapper.findAll('.sidebar-item');
    expect(items[1].find('.sidebar-emoji').text()).toBe('👗');
    expect(items[2].find('.sidebar-emoji').text()).toBe('💄');
  });

  it('falls back to the package emoji for an unknown category code', async () => {
    mockCategories.value = [
      { code: 'unknown', nameKm: 'មិនស្គាល់', nameEn: 'Unknown', nameZh: '未知', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.findAll('.sidebar-item')[1].find('.sidebar-emoji').text()).toBe('📦');
  });

  it('switches active category and refetches products when a category is clicked', async () => {
    mockCategories.value = [
      { code: 'food', nameKm: 'អាហារ', nameEn: 'Food', nameZh: '食品', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    const items = wrapper.findAll('.sidebar-item');
    await items[1].trigger('click');
    await flushPromises();

    expect(items[1].classes()).toContain('active');
    expect(getProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'food' }),
    );
  });

  it('silently degrades when useShopConfig fails and the page remains usable', async () => {
    mockLoad.mockRejectedValue(new Error('network error'));

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.category-page').exists()).toBe(true);
    expect(wrapper.findAll('.sidebar-item')).toHaveLength(1);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('uses nameEn when the locale is en', async () => {
    mockLocale.value = 'en';
    mockCategories.value = [
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.findAll('.sidebar-item')[1].find('.sidebar-label').text()).toBe('Fashion');
  });

  it('uses nameZh when the locale is zh', async () => {
    mockLocale.value = 'zh';
    mockCategories.value = [
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
    ];

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.findAll('.sidebar-item')[1].find('.sidebar-label').text()).toBe('时尚');
  });

  it('toggles view mode between grid and list', async () => {
    mockCategories.value = [
      { code: 'fashion', nameKm: 'ពាក់ព័ន្ធ', nameEn: 'Fashion', nameZh: '时尚', sortOrder: 1 },
    ];
    getProducts.mockResolvedValue({
      data: [{ id: 'p1', name: 'Product 1', priceUsd: 10, priceKhr: 40000 }],
      meta: { hasNext: false },
    });

    wrapper = mountCategoryPage();
    await flushPromises();

    expect(wrapper.find('.product-grid').classes()).not.toContain('grid-list');
    await wrapper.find('.view-toggle').trigger('click');
    await nextTick();
    expect(wrapper.find('.product-grid').classes()).toContain('grid-list');
  });
});
