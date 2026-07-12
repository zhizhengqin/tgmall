// 运行时配置控制器单元测试
import { jest, describe, it, expect, beforeAll } from '@jest/globals';

describe('config.controller', () => {
  let ctrl;
  let configMock;

  beforeAll(async () => {
    configMock = {
      paymentMockMode: true,
    };

    jest.unstable_mockModule('../../src/config/index.js', () => ({
      config: configMock,
    }));

    ctrl = await import('../../src/controllers/config.controller.js');
  });

  const makeRes = () => ({ set: jest.fn(), json: jest.fn() });

  it('TC-CONFIG-CTRL-001: 返回演示模式开关与缓存头', () => {
    const req = {};
    const res = makeRes();

    ctrl.get(req, res);

    expect(res.set).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        paymentMockMode: true,
      },
    });
  });
});
