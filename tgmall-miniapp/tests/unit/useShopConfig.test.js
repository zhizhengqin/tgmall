import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useShopConfig } from '@/composables/useShopConfig.js';

vi.mock('@/api/shopConfig.js', () => ({
  getBanners: vi.fn(),
  getCategories: vi.fn(),
  getCities: vi.fn(),
  getDeliveryRule: vi.fn(),
  getDefaultCustomerService: vi.fn(),
}));

describe('useShopConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('加载时 loading 为 true，成功后保存数据', async () => {
    const { getBanners, getCategories, getCities } = await import('@/api/shopConfig.js');
    getBanners.mockResolvedValue({ data: [{ id: 1, title_km: 'b1', image_url: 'url1' }] });
    getCategories.mockResolvedValue({ data: [{ code: 'fashion', name_km: 'f' }] });
    getCities.mockResolvedValue({ data: [{ code: 'phnom_penh', name_km: '金边' }] });

    const { banners, categories, cities, loading, load } = useShopConfig();
    const promise = load();
    expect(loading.value).toBe(true);
    await promise;
    expect(loading.value).toBe(false);
    expect(banners.value).toHaveLength(1);
    expect(categories.value[0].code).toBe('fashion');
    expect(cities.value[0].code).toBe('phnom_penh');
  });

  it('失败时 error 被设置且 loading 为 false', async () => {
    const { getCategories } = await import('@/api/shopConfig.js');
    getCategories.mockRejectedValue(new Error('network'));

    const { categories, loading, error, load } = useShopConfig();
    await load();
    expect(loading.value).toBe(false);
    expect(error.value).toBeTruthy();
    expect(categories.value).toEqual([]);
  });
});
