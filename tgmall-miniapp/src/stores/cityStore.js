import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

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

  const currentCity = computed(() => {
    const found = cities.value.find((c) => c.code === currentCode.value);
    return found || DEFAULT_CITY_OBJ;
  });

  function setCities(list) {
    cities.value = list || [];
  }

  function setCity(code) {
    if (cities.value.some((c) => c.code === code) || code === DEFAULT_CITY) {
      currentCode.value = code;
      localStorage.setItem(STORAGE_KEY, code);
    }
  }

  watch(currentCode, (code) => {
    localStorage.setItem(STORAGE_KEY, code);
  });

  // 初始化时写入默认城市，确保 localStorage 始终有值
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, DEFAULT_CITY);
  }

  return { currentCode, currentCity, cities, setCities, setCity };
});
