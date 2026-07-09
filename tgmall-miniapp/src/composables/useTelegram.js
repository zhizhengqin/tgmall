// Telegram Mini App SDK 封装
import { reactive } from 'vue';

let initialized = false;
let backButtonHandler = null;

function getTg() {
  return window.Telegram?.WebApp;
}

export function useTelegram() {
  const state = reactive({
    isReady: false,
    user: null,
    initData: '',
    isDark: false,
  });

  function init() {
    if (initialized) return;

    const tg = getTg();
    if (!tg) {
      console.warn('非 Telegram Mini App 环境或 SDK 尚未注入，使用浏览器开发模式');
      state.isReady = true;
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

    // 返回按钮处理（仅注册一次）
    if (!backButtonHandler) {
      backButtonHandler = () => {
        window.history.back();
      };
      tg.BackButton.onClick(backButtonHandler);
    }

    initialized = true;
  }

  function showBackButton() {
    getTg()?.BackButton?.show();
  }

  function hideBackButton() {
    getTg()?.BackButton?.hide();
  }

  function enableCloseConfirmation() {
    getTg()?.enableClosingConfirmation?.();
  }

  return { tg: getTg(), state, init, showBackButton, hideBackButton, enableCloseConfirmation };
}
