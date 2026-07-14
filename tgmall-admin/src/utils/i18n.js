import km from '../locales/km.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';

const messages = { km, en, zh };

export function getLang() {
  return localStorage.getItem('admin_lang') || 'km';
}

export function t(key) {
  const keys = key.split('.');
  let val = messages[getLang()] || messages.en;
  for (const k of keys) val = val?.[k];
  return typeof val === 'string' ? val : key;
}
