// Telegram Payments 集成测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const configMock = {
  botToken: 'bot-token',
  telegramPaymentsProviderToken: 'provider-token',
  telegramPaymentsMockMode: false,
};

jest.unstable_mockModule('../../src/config/index.js', () => ({ config: configMock }));

const {
  createInvoiceLink,
  answerPreCheckoutQuery,
  parseTelegramPaymentUpdate,
} = await import('../../src/integrations/telegram_payments.js');

describe('Telegram Payments 集成', () => {
  beforeEach(() => {
    configMock.telegramPaymentsMockMode = false;
    configMock.telegramPaymentsProviderToken = 'provider-token';
    global.fetch = jest.fn();
  });

  it('mock 模式返回测试发票链接', async () => {
    configMock.telegramPaymentsMockMode = true;
    const result = await createInvoiceLink({ orderNumber: 'O1', amountUsd: 10, title: 'T', description: 'D' });
    expect(result.invoiceUrl).toContain('mock_payment');
    expect(result.payload).toBe('O1');
  });

  it('未配置 provider token 时抛出错误', async () => {
    configMock.telegramPaymentsProviderToken = '';
    await expect(createInvoiceLink({ orderNumber: 'O1', amountUsd: 10, title: 'T', description: 'D' }))
      .rejects.toMatchObject({ errorCode: 'PAYMENT_SERVICE_UNAVAILABLE' });
  });

  it('createInvoiceLink 调用 Bot API 并返回 invoiceUrl', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: 'https://t.me/invoice/xyz' }),
    });

    const result = await createInvoiceLink({ orderNumber: 'O1', amountUsd: 10.5, title: 'Order', description: 'Desc' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.provider_token).toBe('provider-token');
    expect(callBody.currency).toBe('USD');
    expect(callBody.prices[0].amount).toBe(1050);
    expect(result.invoiceUrl).toBe('https://t.me/invoice/xyz');
    expect(result.payload).toMatch(/^tgmall:O1:\d+$/);
  });

  it('answerPreCheckoutQuery 调用 Bot API', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: true }),
    });

    await answerPreCheckoutQuery('pre_123', true);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.pre_checkout_query_id).toBe('pre_123');
    expect(callBody.ok).toBe(true);
  });

  it('parseTelegramPaymentUpdate 识别 pre_checkout_query', () => {
    const update = {
      update_id: 1,
      pre_checkout_query: {
        id: 'pre_123',
        from: { id: 123 },
        currency: 'USD',
        total_amount: 1050,
        invoice_payload: 'tgmall:O1:123456',
      },
    };
    const result = parseTelegramPaymentUpdate(update);
    expect(result.type).toBe('pre_checkout_query');
    expect(result.payload).toBe('tgmall:O1:123456');
    expect(result.totalAmountUsd).toBe(10.5);
  });

  it('parseTelegramPaymentUpdate 识别 successful_payment', () => {
    const update = {
      update_id: 2,
      message: {
        message_id: 1,
        from: { id: 123 },
        date: 1234567890,
        chat: { id: 123 },
        successful_payment: {
          currency: 'USD',
          total_amount: 1050,
          invoice_payload: 'tgmall:O1:123456',
          telegram_payment_charge_id: 'tg_charge_1',
          provider_payment_charge_id: 'provider_charge_1',
        },
      },
    };
    const result = parseTelegramPaymentUpdate(update);
    expect(result.type).toBe('successful_payment');
    expect(result.telegramPaymentChargeId).toBe('tg_charge_1');
    expect(result.totalAmountUsd).toBe(10.5);
  });

  it('parseTelegramPaymentUpdate 忽略无关更新', () => {
    expect(parseTelegramPaymentUpdate({ update_id: 3, message: { text: 'hi' } })).toBeNull();
  });
});
