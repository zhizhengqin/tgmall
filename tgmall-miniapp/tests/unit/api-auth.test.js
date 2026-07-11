// 认证 API 单元测试
import { describe, it, expect, vi } from 'vitest';
import { demoLogin, telegramLogin } from '@/api/auth.js';

vi.mock('@/api/index.js', () => ({
  default: {
    post: vi.fn((url, data) => Promise.resolve({ data: { success: true, url, payload: data } })),
  },
}));

describe('auth.js API', () => {
  it('demoLogin 向 /auth/demo-login 发送用户对象', async () => {
    const user = { id: '999999999999999999', first_name: 'Demo' };
    const res = await demoLogin(user);

    expect(res.data.url).toBe('/auth/demo-login');
    expect(res.data.payload).toEqual({ user });
  });

  it('telegramLogin 向 /auth/telegram 发送 init_data', async () => {
    const res = await telegramLogin('mock-init-data');

    expect(res.data.url).toBe('/auth/telegram');
    expect(res.data.payload).toEqual({ init_data: 'mock-init-data' });
  });
});
