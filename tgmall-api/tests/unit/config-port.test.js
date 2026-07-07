// 端口配置单元测试 — 防止 Railway Docker 中 Node.js 与 Nginx 端口冲突
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const REQUIRED_VARS = ['DATABASE_URL', 'REDIS_URL', 'BOT_TOKEN', 'JWT_SECRET'];

async function loadConfig() {
  return import('../../src/config/index.js');
}

describe('config port', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 每个用例都需要这些变量，否则 config/index.js 会 process.exit(1)
    REQUIRED_VARS.forEach((key) => {
      if (!process.env[key]) process.env[key] = 'mock-value';
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    delete process.env.API_PORT;
    delete process.env.PORT;
  });

  it('默认端口为 3000', async () => {
    delete process.env.API_PORT;
    delete process.env.PORT;
    const { config } = await loadConfig();
    expect(config.port).toBe(3000);
  });

  it('PORT 环境变量生效', async () => {
    delete process.env.API_PORT;
    process.env.PORT = '8080';
    const { config } = await loadConfig();
    expect(config.port).toBe(8080);
  });

  it('API_PORT 优先级高于 PORT', async () => {
    process.env.PORT = '8080';
    process.env.API_PORT = '3001';
    const { config } = await loadConfig();
    expect(config.port).toBe(3001);
  });
});
