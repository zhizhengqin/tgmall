// 端口配置单元测试 — 防止 Railway Docker 中 Node.js 与 Nginx 端口冲突
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const REQUIRED_VARS = ['DATABASE_URL', 'REDIS_URL', 'BOT_TOKEN', 'JWT_SECRET'];
const PORT_VARS = ['PORT', 'API_PORT'];

async function loadConfig() {
  // 每次重新加载，避免 ESM import 缓存导致环境变量变化未生效
  return import(`../../src/config/index.js?${Date.now()}`);
}

describe('config port', () => {
  const envSnapshot = {};

  beforeEach(() => {
    // 每个用例都需要这些变量，否则 config/index.js 会 process.exit(1)
    REQUIRED_VARS.forEach((key) => {
      envSnapshot[key] = process.env[key];
      if (!process.env[key]) process.env[key] = 'mock-value';
    });
    PORT_VARS.forEach((key) => {
      envSnapshot[key] = process.env[key];
    });
  });

  afterEach(() => {
    // 仅恢复被修改的键，不重写 process.env 引用（Node.js process.env 是特殊对象）
    Object.keys(envSnapshot).forEach((key) => {
      if (envSnapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = envSnapshot[key];
      }
    });
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
