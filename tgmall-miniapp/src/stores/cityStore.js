import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getNearestCity, updateUserCity } from '@/api/cities';

const STORAGE_KEY = 'tgmall_selected_city';
const DEFAULT_CITY = 'phnom_penh';
const DEFAULT_CITY_OBJ = {
  code: DEFAULT_CITY,
  nameKm: 'ភ្នំពេញ',
  nameEn: 'Phnom Penh',
  nameZh: '金边',
};

export const useCityStore = defineStore('city', () => {
  const currentCode = ref(localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY);
  const cities = ref([]);
  const detecting = ref(false);
  const detectedCity = ref(null);

  const currentCity = computed(() => {
    const found = cities.value.find((c) => c.code === currentCode.value);
    return found || DEFAULT_CITY_OBJ;
  });

  function setCities(list) {
    cities.value = list || [];
  }

  function setCity(code) {
    const found = cities.value.find((c) => c.code === code);
    if (found || code === DEFAULT_CITY) {
      currentCode.value = code;
      localStorage.setItem(STORAGE_KEY, code);
      // 同步到后端
      updateUserCity(code).catch(() => {});
    }
  }

  /**
   * 通过 Telegram WebApp GPS 定位匹配最近城市
   * 仅在用户未手动选择城市时自动调用
   */
  async function detectCityByGPS() {
    if (detecting.value) return;
    detecting.value = true;

    try {
      // 尝试 Telegram WebApp Location API
      let lat, lng;

      if (window.Telegram?.WebApp?.LocationManager) {
        try {
          const pos = await new Promise((resolve, reject) => {
            window.Telegram.WebApp.LocationManager.getCurrentPosition(
              (data) => resolve(data),
              (err) => reject(err),
            );
          });
          lat = pos?.latitude;
          lng = pos?.longitude;
        } catch {
          // 用户拒绝 GPS 或 API 不可用
        }
      }

      if (lat == null || lng == null) {
        // 回退：浏览器 Geolocation API
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // GPS 不可用
        }
      }

      if (lat != null && lng != null) {
        const res = await getNearestCity(lat, lng);
        if (res.success && res.data) {
          detectedCity.value = res.data;
          // 如果用户还没选过城市，自动设置
          if (!localStorage.getItem(STORAGE_KEY)) {
            setCity(res.data.code);
          }
        }
      }
    } catch {
      // 静默失败
    } finally {
      detecting.value = false;
    }
  }

  // 初始化：如果没有手动选择过城市，尝试 GPS 定位
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, DEFAULT_CITY);
  }

  return { currentCode, currentCity, cities, detecting, detectedCity, setCities, setCity, detectCityByGPS };
});
