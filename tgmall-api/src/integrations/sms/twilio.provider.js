// Twilio SMS provider — 支持 +855 柬埔寨手机号
import { SmsProvider } from './base.provider.js';
import { AppError } from '../../utils/AppError.js';

export class TwilioSmsProvider extends SmsProvider {
  constructor(config) {
    super(config);
    const { accountSid, authToken, from } = config;
    if (!accountSid || !authToken || !from) {
      throw new AppError('Twilio 配置不完整', 500, 'SMS_GATEWAY_NOT_CONFIGURED');
    }
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.from = from;
  }

  async send(phone, message) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: phone, From: this.from, Body: message });
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AppError(
        data.message || `Twilio 发送失败: ${res.status}`,
        502,
        'SMS_GATEWAY_ERROR',
      );
    }
    return { success: true, provider: 'twilio', sid: data.sid };
  }
}
