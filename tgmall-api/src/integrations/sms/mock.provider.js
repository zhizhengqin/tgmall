// Mock SMS provider — 开发/测试环境使用，仅在日志中输出验证码
import { SmsProvider } from './base.provider.js';

export class MockSmsProvider extends SmsProvider {
  async send(phone, message) {
    // 不真正发送，仅记录日志；验证码由调用方生成并写入 Redis
    console.log(`[SMS Mock] to=${phone} msg=${message}`);
    return { success: true, provider: 'mock' };
  }
}
