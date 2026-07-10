// SMS provider 工厂 — 根据配置选择具体网关
import { MockSmsProvider } from './mock.provider.js';
import { TwilioSmsProvider } from './twilio.provider.js';

const PROVIDERS = {
  mock: MockSmsProvider,
  twilio: TwilioSmsProvider,
};

export function createSmsProvider(config) {
  const ProviderClass = PROVIDERS[config.provider];
  if (!ProviderClass) {
    throw new Error(`不支持的 SMS provider: ${config.provider}`);
  }
  return new ProviderClass(config);
}

export { MockSmsProvider, TwilioSmsProvider };
