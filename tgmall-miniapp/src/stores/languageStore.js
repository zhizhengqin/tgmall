// 语言偏好状态管理
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useLanguageStore = defineStore('language', () => {
  const current = ref(localStorage.getItem('lang') || 'zh');

  const isKm = computed(() => current.value === 'km');
  const isEn = computed(() => current.value === 'en');
  const isZh = computed(() => current.value === 'zh');

  function setLanguage(lang) {
    if (!['km', 'en', 'zh'].includes(lang)) return;
    current.value = lang;
    localStorage.setItem('lang', lang);
    document.body.className = lang === 'km' ? 'lang-km' : '';
    document.documentElement.lang = lang;
  }

  // 初始化
  setLanguage(current.value);

  return { current, isKm, isEn, isZh, setLanguage };
});
