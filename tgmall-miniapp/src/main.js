// Vue 应用入口
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import router from './router/index.js';
import App from './App.vue';

import km from './locales/km.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

import './assets/styles/tokens.css';

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'zh',
  fallbackLocale: 'en',
  messages: { km, en, zh },
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount('#app');
