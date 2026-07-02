import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HomePage from '@/views/HomePage.vue';
import { useCityStore } from '@/stores/cityStore.js';

// ---- shared mock state ----
const mockBanners = ref([]);
const mockCategories = ref([]);
const mockCities = ref([]);
const mockLoad = vi.fn();
const mockLocale = ref('zh');

const routeQuery = reactive({});
const routerPush = vi.fn();

const getProducts = vi.fn();

// ---- mocks ----
vi.mock('@/composables/useShopConfig.js', () => ({
  useShopConfig: () => ({
    banners: mockBanners,
    categories: mockCategories,
    cities: mockCities,
    load: mockLoad,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
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

describe('HomePage', () => {
  let wrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockBanners.value = [];
    mockCategories.value = [];
    mockCities.value = [];
    mockLocale.value = 'zh';
    Object.keys(routeQuery).forEach((key) => delete routeQuery[key]);
    getProducts.mockResolvedValue({ data: [], meta: { hasNext: false } });
    mockLoad.mockResolvedValue(undefined);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
  });

  describe('banner carousel', () => {
    it('renders banners from useShopConfig().banners', async () => {
      mockBanners.value = [
        { id: 'b1', titleKm: 'Banner 1', imageUrl: 'https://cdn.test/1.jpg', linkType: 'product', linkTarget: 'p1' },
        { id: 'b2', titleKm: 'Banner 2', imageUrl: 'https://cdn.test/2.jpg', linkType: 'category', linkTarget: 'food' },
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
        { id: 'b1', imageUrl: 'https://cdn.test/1.jpg' },
        { id: 'b2', imageUrl: 'https://cdn.test/2.jpg' },
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
        { id: 'b1', imageUrl: 'https://cdn.test/1.jpg', linkType: 'product', linkTarget: 'p123' },
      ];

      wrapper = mountHomePage();
      await flushPromises();

      await wrapper.find('.banner-slide').trigger('click');
      expect(routerPush).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith('/product/p123');
    });

    it('updates route query when clicking a category banner', async () => {
      mockBanners.value = [
        { id: 'b1', imageUrl: 'https://cdn.test/1.jpg', linkType: 'category', linkTarget: 'fashion' },
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
        { id: 'b1', imageUrl: 'https://cdn.test/1.jpg', linkType: 'product', linkTarget: 'p1' },
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

  describe('city entry', () => {
    const phnomPenh = { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 };
    const siemReap = { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 };

    it('syncs cities from useShopConfig to cityStore after load resolves', async () => {
      const cities = [phnomPenh, siemReap];
      mockLoad.mockImplementation(async () => {
        mockCities.value = cities;
      });

      wrapper = mountHomePage();
      await flushPromises();

      const store = useCityStore();
      expect(store.cities).toEqual(cities);
      expect(wrapper.find('.city-name').text()).toBe('金边');
    });

    it('shows the current city name in the current locale and navigates to /cities on click', async () => {
      mockCities.value = [phnomPenh, siemReap];

      wrapper = mountHomePage();
      await flushPromises();

      const entry = wrapper.find('.city-entry');
      expect(entry.exists()).toBe(true);
      expect(entry.find('.city-name').text()).toBe('金边');

      await entry.trigger('click');
      expect(routerPush).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith('/cities');
    });

    it('updates the displayed city name when the locale changes', async () => {
      mockCities.value = [phnomPenh];

      wrapper = mountHomePage();
      await flushPromises();

      expect(wrapper.find('.city-name').text()).toBe('金边');

      mockLocale.value = 'en';
      await flushPromises();
      expect(wrapper.find('.city-name').text()).toBe('Phnom Penh');

      mockLocale.value = 'km';
      await flushPromises();
      expect(wrapper.find('.city-name').text()).toBe('ភ្នំពេញ');
    });

    it('updates the displayed city name when store currentCode changes', async () => {
      mockCities.value = [phnomPenh, siemReap];

      wrapper = mountHomePage();
      await flushPromises();

      expect(wrapper.find('.city-name').text()).toBe('金边');

      const store = useCityStore();
      store.setCity('siem_reap');
      await flushPromises();

      expect(wrapper.find('.city-name').text()).toBe('暹粒');
    });

    it('falls back to nameKm then code when the localized name is missing', async () => {
      mockCities.value = [{ code: 'battambang', nameKm: 'បាត់ដំបង', sortOrder: 3 }];

      wrapper = mountHomePage();
      await flushPromises();

      const store = useCityStore();
      store.setCity('battambang');
      await flushPromises();

      expect(wrapper.find('.city-name').text()).toBe('បាត់ដំបង');
    });
  });
});
