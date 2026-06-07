import { inject, reactive } from 'vue';
import km from '@/locales/km.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

const messages = { km, en, zh };
const saved = localStorage.getItem('merchant_lang') || 'km';

// 全局状态（所有组件共享）
export const i18nState = reactive({
  locale: saved,
});

export function t(key) {
  const keys = key.split('.');
  let val = messages[i18nState.locale] || messages.en;
  for (const k of keys) val = val?.[k];
  return typeof val === 'string' ? val : key;
}

export function useLocale() {
  return {
    locale: i18nState,
    t,
  };
}
