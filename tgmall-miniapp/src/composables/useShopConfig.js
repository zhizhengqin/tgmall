import { ref } from 'vue';
import {
  getBanners,
  getCategories,
  getCities,
  getDeliveryRule,
  getDefaultCustomerService,
} from '@/api/shopConfig.js';

export function useShopConfig() {
  const banners = ref([]);
  const categories = ref([]);
  const cities = ref([]);
  const deliveryRule = ref(null);
  const customerService = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function load({ city = 'phnom_penh' } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const [bRes, cRes, cityRes] = await Promise.all([
        getBanners(city),
        getCategories(),
        getCities(),
      ]);
      banners.value = bRes.data || [];
      categories.value = cRes.data || [];
      cities.value = cityRes.data || [];
    } catch (err) {
      error.value = err;
      console.error('加载运营配置失败:', err);
    } finally {
      loading.value = false;
    }
  }

  async function loadDeliveryRule(cityCode) {
    try {
      const res = await getDeliveryRule(cityCode);
      deliveryRule.value = res.data || null;
    } catch (err) {
      console.error('加载配送规则失败:', err);
      deliveryRule.value = null;
    }
  }

  async function loadCustomerService() {
    try {
      const res = await getDefaultCustomerService();
      customerService.value = res.data || null;
    } catch (err) {
      console.error('加载客服信息失败:', err);
      customerService.value = null;
    }
  }

  function reload(options) {
    return load(options);
  }

  return {
    banners,
    categories,
    cities,
    deliveryRule,
    customerService,
    loading,
    error,
    load,
    loadDeliveryRule,
    loadCustomerService,
    reload,
  };
}
