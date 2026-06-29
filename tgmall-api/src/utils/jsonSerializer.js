// JSON 序列化增强 —— 解决 Prisma BigInt 无法被 JSON.stringify 序列化的问题

/** 注册 BigInt 的 toJSON 方法，使 Express res.json() 能正常输出 telegramId 等字段 */
export function registerBigIntSerializer() {
  if (!BigInt.prototype.toJSON) {
    BigInt.prototype.toJSON = function () {
      return this.toString();
    };
  }
}
