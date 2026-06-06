import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';

import km from './locales/km.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

// ElementPlus 默认使用英文，避免它尝试解析 vue-i18n 消息导致 "Invalid linked format"
import enLocale from 'element-plus/es/locale/lang/en';

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('admin_lang') || 'km',
  fallbackLocale: 'en',
  messages: { km, en, zh },
});

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus, { locale: enLocale });
app.use(router);
app.use(i18n);
app.mount('#app');
