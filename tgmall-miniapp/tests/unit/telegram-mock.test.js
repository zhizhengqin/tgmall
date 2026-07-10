// 演示环境 Telegram SDK Mock 测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installTelegramMock } from '@/dev/telegram-mock.js';

describe('installTelegramMock', () => {
  let originalTelegram;

  beforeEach(() => {
    originalTelegram = window.Telegram;
    delete window.Telegram;
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    window.Telegram = originalTelegram;
    vi.restoreAllMocks();
  });

  it('注入 Telegram WebApp 对象', () => {
    installTelegramMock();
    expect(window.Telegram?.WebApp).toBeDefined();
    expect(window.Telegram.WebApp.initData).toContain('hash=demo');
  });

  it('initData 包含演示用户信息', () => {
    installTelegramMock();
    const params = new URLSearchParams(window.Telegram.WebApp.initData);
    const user = JSON.parse(params.get('user'));
    expect(user.id).toBe(999999999);
    expect(user.first_name).toBe('Dev');
  });

  it('已有 Telegram WebApp 时不覆盖', () => {
    const existing = { WebApp: { initData: 'real', ready: () => {} } };
    window.Telegram = existing;
    installTelegramMock();
    expect(window.Telegram).toBe(existing);
  });
});
