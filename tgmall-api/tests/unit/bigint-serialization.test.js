// BigInt JSON 序列化兼容性测试 —— 修复 admin/users 500 问题
import { describe, it, expect } from '@jest/globals';
import { registerBigIntSerializer } from '../../src/utils/jsonSerializer.js';

registerBigIntSerializer();

describe('BigInt JSON 序列化', () => {
  it('包含 BigInt 的对象能被 JSON.stringify 序列化为字符串', () => {
    const payload = {
      success: true,
      data: [
        { id: 'u1', telegramId: 12345678901234567890n, firstName: 'សុភាព', lastName: 'វ៉ាន់' },
      ],
      meta: { total: 1, page: 1, limit: 20 },
    };

    expect(() => JSON.stringify(payload)).not.toThrow();
    const json = JSON.parse(JSON.stringify(payload));
    expect(json.data[0].telegramId).toBe('12345678901234567890');
  });
});
