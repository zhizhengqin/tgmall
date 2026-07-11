// 运行时配置控制器单元测试
import { jest, describe, it, expect, beforeAll } from '@jest/globals';

describe('config.controller', () => {
  let ctrl;
  let configMock;

  beforeAll(async () => {
    configMock = {
      paymentMockMode: true,
      telegramPaymentsMockMode: false,
    };

    jest.unstable_mockModule('../../src/config/index.js', () => ({
      config: configMock,
    }));

    ctrl = await import('../../src/controllers/config.controller.js');
  });

  const makeRes = () => ({ json: jest.fn() });

  it('TC-CONFIG-CTRL-001: 返回演示模式开关', () => {
    const req = {};
    const res = makeRes();

    ctrl.get(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        paymentMockMode: true,
        telegramPaymentsMockMode: false,
      },
    });
  });
});
