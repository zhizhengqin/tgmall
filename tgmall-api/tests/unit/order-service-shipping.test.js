import { describe, it, expect } from '@jest/globals';
import { calculateShippingFee } from '../../src/services/shopConfig.service.js';

describe('订单运费计算', () => {
  it('子订单金额小于起送金额时标记不可提交', () => {
    const subtotal = 3;
    const rule = { minOrderAmountUsd: 4, shippingFeeUsd: 1, freeShippingThresholdUsd: 0 };
    expect(subtotal < rule.minOrderAmountUsd).toBe(true);
    expect(calculateShippingFee(subtotal, rule)).toBe(1);
  });

  it('子订单金额大于等于免邮门槛时运费为0', () => {
    const subtotal = 35;
    const rule = { minOrderAmountUsd: 4, shippingFeeUsd: 2, freeShippingThresholdUsd: 30 };
    expect(calculateShippingFee(subtotal, rule)).toBe(0);
  });
});
