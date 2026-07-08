// ABA Pay / Wing Pay 回调签名验证单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';

const configMock = { paymentMockMode: false, abaPaySecret: 'aba-secret', wingPaySecret: 'wing-secret' };

jest.unstable_mockModule('../../src/config/index.js', () => ({ config: configMock }));

const { verifySignature: verifyAba } = await import('../../src/integrations/aba_pay.js');
const { verifySignature: verifyWing } = await import('../../src/integrations/wing_pay.js');

function hmac(payload, secret) {
  const signString = Object.keys(payload)
    .filter((k) => k !== 'signature')
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join('&');
  return crypto.createHmac('sha256', secret).update(signString).digest('hex');
}

describe('ABA Pay verifySignature', () => {
  beforeEach(() => {
    configMock.paymentMockMode = false;
    configMock.abaPaySecret = 'aba-secret';
  });

  it('mock 模式通过 mock 签名', () => {
    configMock.paymentMockMode = true;
    expect(verifyAba({}, 'mock-signature')).toBe(true);
    expect(verifyAba({}, 'MOCK-xxx')).toBe(true);
  });

  it('真实模式缺少 secret 拒绝', () => {
    configMock.abaPaySecret = '';
    expect(verifyAba({ order_number: 'O1' }, 'sig')).toBe(false);
  });

  it('真实模式正确 HMAC 通过', () => {
    const payload = { order_number: 'O1', amount: '10.00', status: 'success' };
    const sig = hmac(payload, 'aba-secret');
    expect(verifyAba(payload, sig)).toBe(true);
  });

  it('真实模式错误 HMAC 拒绝', () => {
    const payload = { order_number: 'O1', amount: '10.00', status: 'success' };
    expect(verifyAba(payload, 'wrong')).toBe(false);
  });
});

describe('Wing Pay verifySignature', () => {
  beforeEach(() => {
    configMock.paymentMockMode = false;
    configMock.wingPaySecret = 'wing-secret';
  });

  it('mock 模式通过 mock 签名', () => {
    configMock.paymentMockMode = true;
    expect(verifyWing({}, 'mock-signature')).toBe(true);
  });

  it('真实模式缺少 secret 拒绝', () => {
    configMock.wingPaySecret = '';
    expect(verifyWing({ order_number: 'O1' }, 'sig')).toBe(false);
  });

  it('真实模式正确 HMAC 通过', () => {
    const payload = { order_number: 'O1', amount: '20.00', status: 'success' };
    const sig = hmac(payload, 'wing-secret');
    expect(verifyWing(payload, sig)).toBe(true);
  });
});
