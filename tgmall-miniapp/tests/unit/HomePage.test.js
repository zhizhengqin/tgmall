import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, reactive, flushPromises } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import HomePage from '@/views/HomePage.vue';

// ---- shared mock state ----
const mockBanners = ref([]);
const mockCategories = ref([]);
const mockLoad = vi.fn();

const routeQuery = reactive({});
const routerPush = vi.fn();

const getProducts = vi.fn();

// ---- mocks ----
vi.mock('@/composables/useShopConfig.js', () => ({
  useShopConfig: () => ({
    banners: mockBanners,
    categories: mockCategories,
    load: mockLoad,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: ref('zh'),
    t: (key) => key,
  }),
}));

vi.mock('@/stores/languageStore.js', () => ({
  useLanguageStore: () => ({
    current: 'zh',
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
function mountHomePage() {
  return mount(HomePage, {
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

describe('HomePage banner carousel', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBanners.value = [];
    mockCategories.value = [];
    Object.keys(routeQuery).forEach((key) => delete routeQuery[key]);
    getProducts.mockResolvedValue({ data: [], meta: { hasNext: false } });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  it('renders banners from useShopConfig().banners', async () => {
    mockBanners.value = [
      { id: 'b1', title_km: 'Banner 1', image_url: 'https://cdn.test/1.jpg', link_type: 'product', link_target: 'p1' },
      { id: 'b2', title_km: 'Banner 2', image_url: 'https://cdn.test/2.jpg', link_type: 'category', link_target: 'food' },
    ];

    wrapper = mountHomePage();
    await flushPromises();

    const slides = wrapper.findAll('.banner-slide');
    expect(slides).toHaveLength(2);
    expect(slides[0].find('img').attributes('src')).toBe('https://cdn.test/1.jpg');
    expect(slides[1].find('img').attributes('src')).toBe('https://cdn.test/2.jpg');
  });

  it('updates the active slide on swipe', async () => {
    mockBanners.value = [
      { id: 'b1', image_url: 'https://cdn.test/1.jpg' },
      { id: 'b2', image_url: 'https://cdn.test/2.jpg' },
    ];

    wrapper = mountHomePage();
    await flushPromises();

    const track = wrapper.find('.banner-track');
    expect(track.attributes('style')).toContain('translateX(-0%)');

    await track.trigger('touchstart', { touches: [{ clientX: 200 }] });
    await track.trigger('touchend', { changedTouches: [{ clientX: 100 }] });
    await flushPromises();

    expect(track.attributes('style')).toContain('translateX(-100%)');
  });

  it('navigates to /product/{id} when clicking a product banner', async () => {
    mockBanners.value = [
      { id: 'b1', image_url: 'https://cdn.test/1.jpg', link_type: 'product', link_target: 'p123' },
    ];

    wrapper = mountHomePage();
    await flushPromises();

    await wrapper.find('.banner-slide').trigger('click');
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/product/p123');
  });

  it('updates route query when clicking a category banner', async () => {
    mockBanners.value = [
      { id: 'b1', image_url: 'https://cdn.test/1.jpg', link_type: 'category', link_target: 'fashion' },
    ];

    wrapper = mountHomePage();
    await flushPromises();

    await wrapper.find('.banner-slide').trigger('click');
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith({ path: '/', query: { category: 'fashion' } });
  });

  it('shows fallback placeholder when banners array is empty', async () => {
    mockBanners.value = [];

    wrapper = mountHomePage();
    await flushPromises();

    expect(wrapper.find('.banner-placeholder').exists()).toBe(true);
    expect(wrapper.find('.banner-wrap').exists()).toBe(false);
  });

  it('ignores banner click after a drag to prevent swipe/click overlap', async () => {
    mockBanners.value = [
      { id: 'b1', image_url: 'https://cdn.test/1.jpg', link_type: 'product', link_target: 'p1' },
    ];

    wrapper = mountHomePage();
    await flushPromises();

    const track = wrapper.find('.banner-track');
    const slide = wrapper.find('.banner-slide');

    // Drag more than the click movement threshold
    await track.trigger('touchstart', { touches: [{ clientX: 200 }] });
    await track.trigger('touchmove', { touches: [{ clientX: 185 }] });
    await track.trigger('touchend', { changedTouches: [{ clientX: 185 }] });

    await slide.trigger('click');
    expect(routerPush).not.toHaveBeenCalled();
  });
});
