// Telegram Mini App SDK 封装
import { onMounted, reactive } from 'vue';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  const state = reactive({
    isReady: false,
    user: null,
    initData: '',
    isDark: false,
  });

  function init() {
    if (!tg) {
      console.warn('非 Telegram Mini App 环境，使用浏览器开发模式');
      state.isReady = true;
      state.initData = '';
      return;
    }

    tg.ready();
    tg.expand();

    state.isReady = true;
    state.user = tg.initDataUnsafe?.user
      || (tg.initData ? JSON.parse(new URLSearchParams(tg.initData).get('user') || 'null') : null)
      || null;
    state.initData = tg.initData || '';
    state.isDark = tg.colorScheme === 'dark';

    if (state.isDark) {
      document.body.classList.add('tg-dark');
    }

    // 主题切换监听
    tg.onEvent('themeChanged', () => {
      state.isDark = tg.colorScheme === 'dark';
      document.body.classList.toggle('tg-dark', state.isDark);
    });

    // 返回按钮处理
    tg.BackButton.onClick(() => {
      window.history.back();
    });
  }

  function showBackButton() {
    tg?.BackButton.show();
  }

  function hideBackButton() {
    tg?.BackButton.hide();
  }

  function enableCloseConfirmation() {
    tg?.enableClosingConfirmation();
  }

  onMounted(() => init());

  return { tg, state, showBackButton, hideBackButton, enableCloseConfirmation };
}
