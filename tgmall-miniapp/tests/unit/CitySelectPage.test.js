import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CitySelectPage from '@/views/CitySelectPage.vue';
import { useCityStore } from '@/stores/cityStore.js';

// ---- shared mock state ----
const mockCities = ref([]);
const mockLoad = vi.fn();
const mockLocale = ref('km');

const routerBack = vi.fn();

// ---- mocks ----
vi.mock('@/composables/useShopConfig.js', () => ({
  useShopConfig: () => ({
    cities: mockCities,
    load: mockLoad,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ back: routerBack }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: mockLocale,
    t: (key) => key,
  }),
}));

// ---- helpers ----
function mountCitySelectPage() {
  return mount(CitySelectPage, {
    global: {
      stubs: {
        'router-link': true,
      },
      mocks: {
        $t: (key) => key,
      },
    },
    attachTo: document.body,
  });
}

describe('CitySelectPage', () => {
  let wrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCities.value = [];
    mockLocale.value = 'km';
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

  it('renders cities from useShopConfig().cities and marks the current one', async () => {
    mockCities.value = [
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
      { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 },
    ];

    wrapper = mountCitySelectPage();
    await flushPromises();

    const items = wrapper.findAll('.city-item');
    expect(items).toHaveLength(2);
    expect(items[0].find('.city-name').text()).toBe('ភ្នំពេញ');
    expect(items[1].find('.city-name').text()).toBe('សៀមរាប');
    expect(items[0].classes()).toContain('active');
    expect(items[1].classes()).not.toContain('active');
  });

  it('shows a checkmark on the current city only', async () => {
    mockCities.value = [
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
      { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 },
    ];

    wrapper = mountCitySelectPage();
    await flushPromises();

    const checks = wrapper.findAll('.city-check');
    expect(checks).toHaveLength(2);
    expect(checks[0].classes()).toContain('visible');
    expect(checks[1].classes()).not.toContain('visible');
  });

  it('calls setCity and navigates back when a city is clicked', async () => {
    mockCities.value = [
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
      { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 },
    ];

    wrapper = mountCitySelectPage();
    await flushPromises();

    const store = useCityStore();
    await wrapper.findAll('.city-item')[1].trigger('click');

    expect(store.currentCode).toBe('siem_reap');
    expect(routerBack).toHaveBeenCalledTimes(1);
  });

  it('uses nameEn when the locale is en', async () => {
    mockLocale.value = 'en';
    mockCities.value = [
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
    ];

    wrapper = mountCitySelectPage();
    await flushPromises();

    expect(wrapper.find('.city-name').text()).toBe('Phnom Penh');
  });

  it('uses nameZh when the locale is zh', async () => {
    mockLocale.value = 'zh';
    mockCities.value = [
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
    ];

    wrapper = mountCitySelectPage();
    await flushPromises();

    expect(wrapper.find('.city-name').text()).toBe('金边');
  });

  it('loads shop config on mount even when the list starts empty', async () => {
    wrapper = mountCitySelectPage();
    await flushPromises();

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.city-item')).toHaveLength(0);
  });

  it('syncs cities to the store after load resolves', async () => {
    const cities = [
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
      { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 },
    ];
    mockLoad.mockImplementation(async () => {
      mockCities.value = cities;
    });

    wrapper = mountCitySelectPage();
    await flushPromises();

    const store = useCityStore();
    expect(store.cities).toEqual(cities);
    expect(wrapper.findAll('.city-item')).toHaveLength(2);
    expect(wrapper.findAll('.city-name')[0].text()).toBe('ភ្នំពេញ');
    expect(wrapper.findAll('.city-name')[1].text()).toBe('សៀមរាប');
  });
});
