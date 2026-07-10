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

// 开发环境或演示参数 ?demo=1 时注入 Telegram SDK Mock
// 使用 top-level await 确保 Mock 在 App 挂载前完成，避免 initData 竞态
const isDemoMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
if (import.meta.env.DEV || isDemoMode) {
  const { installTelegramMock } = await import('./dev/telegram-mock.js');
  installTelegramMock();
}

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
