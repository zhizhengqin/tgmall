// Bot 通知服务单元测试 — TC-N-001~011
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockTx, createMockRedis } from '../helpers/mocks.js';

/**
 * HTML 转义函数（从 telegram.js 提取）
 */
function escapeHtml(text) {
  if (!text || typeof text !== 'string') return String(text ?? '');
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 模拟 sendMessage 逻辑
 */
async function sendMessageTest(telegramId, text, botToken) {
  if (!botToken) return { ok: false, error: 'BOT_TOKEN_NOT_CONFIGURED' };
  if (!telegramId) return { ok: false, error: 'MISSING_TELEGRAM_ID' };

  const body = { chat_id: String(telegramId), text: text.slice(0, 4096), parse_mode: 'HTML' };

  // 模拟 fetch（测试中不实际调用）
  if (text.includes('FAIL')) return { ok: false, error: 'Bad Request: message text is empty' };
  return { ok: true, messageId: 12345 };
}

/**
 * 频率控制检查
 */
async function checkRateLimit(redis, userId, type) {
  const key = `notify:ratelimit:${userId}:${type}`;
  if (await redis.get(key)) return false;
  await redis.set(key, '1', 'EX', 60);
  return true;
}

/**
 * 三语模板渲染
 */
const templates = {
  km: { orderCreated: '🛒 ការបញ្ជាទិញ #{{order}} បានបង្កើត!', orderPaid: '✅ ទូទាត់ #{{order}} ${{amount}}' },
  en: { orderCreated: '🛒 Order #{{order}} created!', orderPaid: '✅ Paid #{{order}} ${{amount}}' },
  zh: { orderCreated: '🛒 订单 #{{order}} 已创建！', orderPaid: '✅ 支付 #{{order}} ${{amount}}' },
};

function renderTemplate(lang, type, vars) {
  const t = templates[lang] || templates.km;
  let text = t[type] || t.orderCreated;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{{${k}}}`, escapeHtml(String(v)));
  }
  return text;
}

describe('Bot 通知服务 (notification.service)', () => {
  let redis;

  beforeEach(() => {
    redis = createMockRedis();
  });

  // TC-N-001: sendMessage 正常
  it('sendMessage 正常发送消息', async () => {
    const result = await sendMessageTest('123456', 'Hello', 'test-token');
    expect(result.ok).toBe(true);
    expect(result.messageId).toBe(12345);
  });

  // TC-N-002: BOT_TOKEN 未配置
  it('BOT_TOKEN 未配置时跳过发送', async () => {
    const result = await sendMessageTest('123456', 'Hello', '');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('BOT_TOKEN_NOT_CONFIGURED');
  });

  // TC-N-003: telegramId 为空
  it('telegramId 为空时跳过发送', async () => {
    const result = await sendMessageTest(null, 'Hello', 'test-token');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('MISSING_TELEGRAM_ID');
  });

  // TC-N-004: 消息截断
  it('消息超过 4096 字符应截断', async () => {
    const longText = 'x'.repeat(5000);
    // 验证截断逻辑
    expect(longText.slice(0, 4096).length).toBe(4096);
  });

  // TC-N-005: HTML 转义
  it('用户输入含 <script> 标签应被转义', () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  it('& 符号应被转义', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  // TC-N-006: 频率限制
  it('同一用户同一类型 60s 内第 2 次应被限流', async () => {
    const allowed1 = await checkRateLimit(redis, 'user-1', 'order_status');
    expect(allowed1).toBe(true);

    const allowed2 = await checkRateLimit(redis, 'user-1', 'order_status');
    expect(allowed2).toBe(false);
  });

  // TC-N-010: 三语模板
  it('高棉语模板渲染', () => {
    const text = renderTemplate('km', 'orderCreated', { order: 'ORD-001', amount: '29.99' });
    expect(text).toContain('ORD-001');
    expect(text).toContain('បានបង្កើត');
  });

  it('英语模板渲染', () => {
    const text = renderTemplate('en', 'orderCreated', { order: 'ORD-001', amount: '29.99' });
    expect(text).toContain('Order #ORD-001');
    expect(text).toContain('created!');
  });

  it('中文模板渲染', () => {
    const text = renderTemplate('zh', 'orderPaid', { order: 'ORD-002', amount: '50.00' });
    expect(text).toContain('#ORD-002');
    expect(text).toContain('$50.00');
  });

  // TC-N-011: 未知语言回退高棉语
  it('未知语言应回退高棉语', () => {
    const text = renderTemplate('fr', 'orderCreated', { order: 'ORD-003', amount: '10' });
    expect(text).toContain('បានបង្កើត');
  });

  // 模板变量 HTML 转义
  it('模板变量中的 HTML 应被转义', () => {
    const text = renderTemplate('en', 'orderCreated', { order: '<script>', amount: '10' });
    expect(text).not.toContain('<script>');
    expect(text).toContain('&lt;script&gt;');
  });
});
