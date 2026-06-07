import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus);
app.use(router);

// 简易 i18n
import km from './locales/km.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

const messages = { km, en, zh };
const savedLang = localStorage.getItem('admin_lang') || 'km';
const locale = { current: savedLang };

app.config.globalProperties.$t = (key) => {
  const keys = key.split('.');
  let val = messages[locale.current] || messages.en;
  for (const k of keys) val = val?.[k];
  return typeof val === 'string' ? val : key;
};

app.config.globalProperties.$locale = locale;

app.provide('i18n', { locale, t: app.config.globalProperties.$t });

app.mount('#app');
