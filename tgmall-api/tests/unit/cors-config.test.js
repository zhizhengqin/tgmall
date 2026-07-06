// CORS 配置单元测试
import { describe, it, expect } from '@jest/globals';
import { isCorsOriginAllowed } from '../../src/utils/cors.js';

describe('isCorsOriginAllowed', () => {
  it('允许无 origin 的请求（如移动 App、服务器间调用）', () => {
    expect(isCorsOriginAllowed(undefined, [], 'production')).toBe(true);
    expect(isCorsOriginAllowed(null, [], 'production')).toBe(true);
  });

  it('生产环境未配置 ALLOWED_ORIGINS 时，允许同源请求', () => {
    expect(
      isCorsOriginAllowed('https://tgmall-production.up.railway.app', [], 'production'),
    ).toBe(true);
  });

  it('生产环境配置了 ALLOWED_ORIGINS 时，只允许白名单来源', () => {
    const origins = ['https://admin.example.com'];
    expect(isCorsOriginAllowed('https://admin.example.com', origins, 'production')).toBe(true);
    expect(
      isCorsOriginAllowed('https://tgmall-production.up.railway.app', origins, 'production'),
    ).toBe(false);
  });

  it('开发环境传入 localhost 来源时允许，生产来源不允许', () => {
    const origins = ['http://localhost:5173', 'http://localhost:3000'];
    expect(isCorsOriginAllowed('http://localhost:5173', origins, 'development')).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:3000', origins, 'development')).toBe(true);
    expect(
      isCorsOriginAllowed('https://tgmall-production.up.railway.app', origins, 'development'),
    ).toBe(false);
  });

  it('开发环境配置了 ALLOWED_ORIGINS 时，以配置为准', () => {
    const origins = ['https://custom.dev'];
    expect(isCorsOriginAllowed('https://custom.dev', origins, 'development')).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:5173', origins, 'development')).toBe(false);
  });
});
