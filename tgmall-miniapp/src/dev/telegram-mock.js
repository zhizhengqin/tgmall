// 本地开发用的 Telegram WebApp SDK Mock
// 仅在 Vite 开发模式下注入，生产环境不会执行
export function installTelegramMock() {
  if (typeof window === 'undefined') return;

  // 如果已有带 initData 的 WebApp（测试注入或真实 Telegram 环境），不要覆盖
  if (window.Telegram?.WebApp?.initData) {
    console.info('[TG Mock] 检测到已有 Telegram WebApp，跳过 Mock');
    return;
  }

  const mockUser = {
    id: 999999999,
    first_name: 'Dev',
    last_name: 'User',
    username: 'dev_user',
    language_code: 'km',
    photo_url: null,
  };

  const initData = `query_id=AAHdF6IQAAAAAN0XohAA&user=${encodeURIComponent(JSON.stringify(mockUser))}&auth_date=1717900000&hash=mockhash123`;

  window.Telegram = {
    WebApp: {
      initData,
      initDataUnsafe: { user: mockUser, query_id: 'AAHdF6IQAAAAAN0XohAA' },
      ready: () => {},
      expand: () => {},
      version: '7.0',
      platform: 'web',
      colorScheme: 'light',
      isExpanded: true,
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight,
      headerColor: '#ffffff',
      backgroundColor: '#ffffff',
      onEvent: () => {},
      offEvent: () => {},
      BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
      MainButton: { show: () => {}, hide: () => {}, setText: () => {}, onClick: () => {} },
      openTelegramLink: (url) => window.open(url, '_blank'),
      openLink: (url) => window.open(url, '_blank'),
      close: () => {},
      enableClosingConfirmation: () => {},
      disableClosingConfirmation: () => {},
      HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {}, selectionChanged: () => {} },
    },
  };

  console.info('[TG Mock] 本地开发模式：已注入 Telegram WebApp SDK Mock');
}
