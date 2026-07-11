// auth.routes 演示登录路由条件注册测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const configMock = { paymentMockMode: false };

jest.unstable_mockModule('../../src/config/index.js', () => ({ config: configMock }));

// express Router 在模块加载时即注册路由，因此每次测试需清缓存后重新 import
async function loadAuthRoutes() {
  jest.resetModules();
  const mod = await import('../../src/routes/auth.routes.js');
  return mod.default;
}

function findDemoLoginRoute(router) {
  return router.stack.find(
    (layer) => layer.route && layer.route.path === '/demo-login' && layer.route.methods.post,
  );
}

describe('auth.routes demo-login 条件注册', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PAYMENT_MOCK_MODE=true 且非生产环境时注册 /demo-login', async () => {
    configMock.paymentMockMode = true;
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const router = await loadAuthRoutes();

    expect(findDemoLoginRoute(router)).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('PAYMENT_MOCK_MODE=false 时不注册 /demo-login', async () => {
    configMock.paymentMockMode = false;

    const router = await loadAuthRoutes();

    expect(findDemoLoginRoute(router)).toBeUndefined();
  });

  it('生产环境即使 PAYMENT_MOCK_MODE=true 也不注册 /demo-login', async () => {
    configMock.paymentMockMode = true;
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const router = await loadAuthRoutes();

    expect(findDemoLoginRoute(router)).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });
});
