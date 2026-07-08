// SMS provider 单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MockSmsProvider, TwilioSmsProvider, createSmsProvider } from '../../src/integrations/sms/index.js';

describe('SMS Provider 工厂', () => {
  it('createSmsProvider 返回 mock provider', () => {
    const p = createSmsProvider({ provider: 'mock' });
    expect(p).toBeInstanceOf(MockSmsProvider);
  });

  it('createSmsProvider 返回 twilio provider', () => {
    const p = createSmsProvider({ provider: 'twilio', accountSid: 'ACxxx', authToken: 'token', from: '+85512345678' });
    expect(p).toBeInstanceOf(TwilioSmsProvider);
  });

  it('createSmsProvider 未知 provider 报错', () => {
    expect(() => createSmsProvider({ provider: 'unknown' })).toThrow('不支持的 SMS provider');
  });
});

describe('MockSmsProvider', () => {
  it('send 返回成功', async () => {
    const p = new MockSmsProvider({});
    const result = await p.send('+85512345678', 'test');
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
  });
});

describe('TwilioSmsProvider', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('send 成功返回 sid', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: 'SM123' }),
    });
    const p = new TwilioSmsProvider({ accountSid: 'ACxxx', authToken: 'token', from: '+85512345678' });
    const result = await p.send('+85512345678', 'Your code is 123456');
    expect(result.success).toBe(true);
    expect(result.sid).toBe('SM123');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('send 失败抛出网关错误', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid phone' }),
    });
    const p = new TwilioSmsProvider({ accountSid: 'ACxxx', authToken: 'token', from: '+85512345678' });
    await expect(p.send('+85512345678', 'test')).rejects.toMatchObject({ errorCode: 'SMS_GATEWAY_ERROR' });
  });
});
