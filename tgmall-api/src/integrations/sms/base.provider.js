// SMS 服务商抽象基类
export class SmsProvider {
  constructor(config) {
    this.config = config;
  }

  // eslint-disable-next-line no-unused-vars
  async send(phone, message) {
    throw new Error('子类必须实现 send 方法');
  }
}
