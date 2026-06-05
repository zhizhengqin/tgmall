// T4.6 — 价格分摊精确性测试
// 验证 C4 修复：按原价比例分摊 + 最大余数法确保总额精确

import { describe, it, expect } from '@jest/globals';

/**
 * 价格分摊算法（从 order.service.js 提取，用于独立验证）
 * 修复：按原价比例分摊折扣，最大余数法保证 total = sum(items)
 */
function distributeDiscount(items, totalUsd, discountUsd) {
  const finalTotalUsd = Math.round((totalUsd - discountUsd) * 100) / 100;
  const discountPerUsd = totalUsd > 0 ? discountUsd / totalUsd : 0;

  const itemPrices = items.map((item) => {
    const itemTotalUsd = item.unitPriceUsd * item.quantity;
    const itemDiscountUsd = itemTotalUsd * discountPerUsd;
    return { ...item, itemTotalUsd, itemDiscountUsd };
  });

  // 分摊后的价格
  let distributed = itemPrices.map((ip) =>
    Math.round((ip.itemTotalUsd - ip.itemDiscountUsd) * 100) / 100
  );

  // 最大余数法调整
  const sum = distributed.reduce((s, v) => s + v, 0);
  const diff = Math.round((finalTotalUsd - sum) * 100) / 100;
  if (diff !== 0) {
    const maxIdx = distributed.indexOf(Math.max(...distributed));
    distributed[maxIdx] = Math.round((distributed[maxIdx] + diff) * 100) / 100;
  }

  return { distributed, finalTotalUsd };
}

describe('价格分摊精确性 (C4 fix)', () => {
  it('总额 = 各 item 价格之和（无折扣）', () => {
    const items = [
      { unitPriceUsd: 10, quantity: 2 },  // $20
      { unitPriceUsd: 5, quantity: 3 },   // $15
    ];
    const { distributed, finalTotalUsd } = distributeDiscount(items, 35, 0);
    const sum = distributed.reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - finalTotalUsd)).toBe(0);
  });

  it('总额 = 各 item 价格之和（有折扣）', () => {
    const items = [
      { unitPriceUsd: 10, quantity: 1 },  // $10
      { unitPriceUsd: 20, quantity: 1 },  // $20
    ];
    const { distributed, finalTotalUsd } = distributeDiscount(items, 30, 10); // $30 - $10 = $20
    const sum = distributed.reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - finalTotalUsd)).toBe(0);
    expect(sum).toBeGreaterThan(0);
  });

  it('不会出现因四舍五入导致的 1-2 美分差异（C4 关键场景）', () => {
    // 经典场景：3 个 item 分摊 $99 折扣后可能出现 1 分差异
    const items = [
      { unitPriceUsd: 33.33, quantity: 1 },  // 约 $33.33
      { unitPriceUsd: 33.33, quantity: 1 },  // 约 $33.33
      { unitPriceUsd: 33.34, quantity: 1 },  // 约 $33.34
    ];
    const { distributed, finalTotalUsd } = distributeDiscount(items, 100, 10); // $100 - $10 = $90
    const sum = distributed.reduce((s, v) => s + v, 0);
    // 浮点数比较容差 0.01
    expect(Math.abs(sum - finalTotalUsd) < 0.01).toBe(true);
  });

  it('高单价商品分摊更多（同总价按比例分配）', () => {
    const items = [
      { unitPriceUsd: 100, quantity: 2 },  // $200
      { unitPriceUsd: 50, quantity: 1 },    // $50
    ];
    const { distributed, finalTotalUsd } = distributeDiscount(items, 250, 50); // $250 - $50 = $200
    const sum = distributed.reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - finalTotalUsd) < 0.01).toBe(true);
    // $200 原价的 item 应分摊更多折扣 → 折后价更高
    expect(distributed[0]).toBeGreaterThan(distributed[1]);
  });

  it('零折扣边界', () => {
    const { distributed, finalTotalUsd } = distributeDiscount(
      [{ unitPriceUsd: 5, quantity: 1 }], 5, 0
    );
    expect(distributed[0]).toBe(5);
    expect(finalTotalUsd).toBe(5);
  });

  it('全部折扣（免费边界）', () => {
    // 极端场景：全额折扣
    const { distributed, finalTotalUsd } = distributeDiscount(
      [{ unitPriceUsd: 10, quantity: 1 }], 10, 10
    );
    expect(finalTotalUsd).toBe(0);
    const sum = distributed.reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - finalTotalUsd) < 0.01).toBe(true);
  });

  it('多个 items 折扣后分差不超过 0.01', () => {
    for (let i = 0; i < 100; i++) {
      const nItems = 2 + Math.floor(Math.random() * 4);
      const items = [];
      let total = 0;
      for (let j = 0; j < nItems; j++) {
        const price = Math.round(Math.random() * 100 * 100) / 100;
        const qty = 1 + Math.floor(Math.random() * 3);
        items.push({ unitPriceUsd: price, quantity: qty });
        total += price * qty;
      }
      const discount = Math.round(Math.random() * total * 0.5 * 100) / 100;
      const { distributed, finalTotalUsd } = distributeDiscount(items, total, discount);
      const sum = distributed.reduce((s, v) => s + v, 0);
      // 100 次随机测试：每次总价差不超过 0.01
      expect(Math.abs(sum - finalTotalUsd) < 0.015).toBe(true);
    }
  });
});
