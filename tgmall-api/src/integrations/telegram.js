// Telegram Bot API + initData 校验 + 消息发送
import crypto from 'crypto';
import { config } from '../config/index.js';
import redis from '../config/redis.js';

// initData 有效期：Telegram 默认 24h，本平台登录场景收紧到 5 分钟
const INIT_DATA_TTL_SECONDS = 300;

/** 校验 Telegram Mini App initData 签名 */
export async function verifyInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    throw new Error('initData 签名校验失败');
  }

  const authDate = parseInt(params.get('auth_date'), 10);
  if (Math.floor(Date.now() / 1000) - authDate > INIT_DATA_TTL_SECONDS) {
    throw new Error('initData 已过期');
  }

  // 重放保护：同一 initData hash 只能使用一次
  const replayKey = `init_data:${hash}`;
  const exists = await redis.get(replayKey);
  if (exists) {
    throw new Error('initData 已被使用');
  }
  await redis.set(replayKey, '1', 'EX', INIT_DATA_TTL_SECONDS);

  const user = JSON.parse(params.get('user') || '{}');
  return {
    telegramId: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code || 'km',
    photoUrl: user.photo_url || null,
  };
}

/** 解析 initData 中的用户信息（不验证签名） */
export function parseInitDataUnsafe(initData) {
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user') || '{}');
  return {
    telegramId: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
  };
}

// ============================================================
// Telegram Login Widget 校验（Web 端 OAuth 登录）
// ============================================================

/**
 * 校验 Telegram Login Widget 回调数据
 * 用于商家后台和运营后台的 Web 端 Telegram 登录
 */
export function verifyTelegramLoginData(data) {
  const receivedHash = data.hash;
  if (!receivedHash) {
    throw new Error('缺少 hash 签名');
  }

  // 按 key 字母排序，拼接 check string
  const checkString = Object.keys(data)
    .filter(k => k !== 'hash')
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n');

  // Login Widget: secret = SHA256(bot_token)，与 Mini App 不同（Mini App 用 WebAppData 常量）
  const secretKey = crypto.createHash('sha256').update(config.botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (computedHash !== receivedHash) {
    throw new Error('Telegram Login 签名校验失败');
  }

  const authDate = parseInt(data.auth_date, 10);
  if (Math.floor(Date.now() / 1000) - authDate > 86400) {
    throw new Error('登录数据已过期，请重新授权');
  }

  return {
    telegramId: parseInt(data.id, 10),
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    username: data.username || '',
    photoUrl: data.photo_url || '',
  };
}

// ============================================================
// Bot 消息发送
// ============================================================

/**
 * 安全 HTML 转义 — 防止用户输入破坏 Telegram HTML 格式
 * Telegram 支持的 HTML 标签: <b>, <i>, <u>, <s>, <a>, <code>, <pre>
 * 用户输入中的 < > & 必须转义
 */
function escapeHtml(text) {
  if (!text || typeof text !== 'string') return String(text ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 发送 Telegram Bot 消息
 * @param {string} telegramId  用户 Telegram ID
 * @param {string} text        消息文本（已转义安全）
 * @param {Object} options     可选参数
 * @returns {Promise<{ok: boolean, messageId?: number, error?: string}>}
 */
export async function sendMessage(telegramId, text, options = {}) {
  if (!config.botToken) {
    console.warn('[Bot] BOT_TOKEN 未配置，消息发送跳过');
    return { ok: false, error: 'BOT_TOKEN_NOT_CONFIGURED' };
  }
  if (!telegramId) {
    return { ok: false, error: 'MISSING_TELEGRAM_ID' };
  }

  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  const body = {
    chat_id: String(telegramId),
    text: text.slice(0, 4096), // Telegram 消息长度限制
    parse_mode: options.parse_mode || 'HTML',
    disable_web_page_preview: options.disable_web_page_preview ?? true,
    ...options.extra,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error(`[Bot] 发送失败: ${result.description}, chat_id=${telegramId}`);
      return { ok: false, error: result.description, errorCode: result.error_code };
    }

    return { ok: true, messageId: result.result?.message_id };
  } catch (err) {
    console.error(`[Bot] 网络错误: ${err.message}, chat_id=${telegramId}`);
    return { ok: false, error: err.message };
  }
}

/**
 * 渲染订单通知文本（纯函数，不发送网络请求）
 * @returns {string|null}  返回 null 表示未知类型
 */
export function renderOrderNotificationText(user, order, type) {
  const lang = user.languageCode || 'km';
  const t = notificationTemplates[lang] || notificationTemplates.km;

  switch (type) {
    case 'created':
      return t.orderCreated
        .replace('{{orderNumber}}', escapeHtml(order.orderNumber))
        .replace('{{amount}}', order.totalUsd)
        .replace('{{paymentMethod}}', escapeHtml(order.paymentMethod));
    case 'paid':
      return t.orderPaid
        .replace('{{orderNumber}}', escapeHtml(order.orderNumber))
        .replace('{{amount}}', order.totalUsd);
    case 'shipped': {
      const info = order.logisticsInfo || {};
      return t.orderShipped
        .replace('{{orderNumber}}', escapeHtml(order.orderNumber))
        .replace('{{logistics}}', escapeHtml(info.logistics_company || info.company || ''))
        .replace('{{tracking}}', escapeHtml(info.tracking_number || info.trackingNumber || ''));
    }
    default:
      return null;
  }
}

/**
 * 发送订单通知（消费者）
 */
export async function sendOrderNotification(user, order, type) {
  const text = renderOrderNotificationText(user, order, type);
  if (text === null) {
    return { ok: false, error: 'UNKNOWN_NOTIFICATION_TYPE' };
  }
  return sendMessage(user.telegramId, text);
}

/**
 * 发送商家订单通知
 */
export async function sendMerchantOrderNotification(merchant, order, type) {
  const lang = merchant.languageCode || 'km';
  const t = notificationTemplates[lang] || notificationTemplates.km;

  let text = '';
  switch (type) {
    case 'new':
      text = t.merchantNewOrder
        .replace('{{orderNumber}}', escapeHtml(order.orderNumber))
        .replace('{{amount}}', order.totalUsd);
      break;
    case 'paid':
      text = t.merchantOrderPaid
        .replace('{{orderNumber}}', escapeHtml(order.orderNumber))
        .replace('{{amount}}', order.totalUsd);
      break;
    default:
      return { ok: false, error: 'UNKNOWN_NOTIFICATION_TYPE' };
  }

  return sendMessage(merchant.telegramId, text);
}

/**
 * 发送审核结果通知
 */
export async function sendAuditNotification(merchant, status, reason) {
  const lang = merchant.languageCode || 'km';
  const t = notificationTemplates[lang] || notificationTemplates.km;

  let text = '';
  if (status === 'approved') {
    text = t.merchantApproved;
  } else {
    text = t.merchantRejected.replace('{{reason}}', escapeHtml(reason || ''));
  }

  return sendMessage(merchant.telegramId, text);
}

/**
 * 发送发货通知（兼容旧代码）
 */
export async function sendShippedNotification(telegramId, orderNumber, language) {
  const lang = language || 'km';
  const t = notificationTemplates[lang] || notificationTemplates.km;
  const text = t.orderShipped.replace('{{orderNumber}}', escapeHtml(orderNumber));
  return sendMessage(telegramId, text);
}

/**
 * 发送审核通过通知（兼容旧代码）
 */
export async function sendApprovalNotification(telegramId, merchantName, language) {
  const lang = language || 'km';
  const t = notificationTemplates[lang] || notificationTemplates.km;
  const text = t.merchantApproved.replace('{{name}}', escapeHtml(merchantName || ''));
  return sendMessage(telegramId, text);
}

// ============================================================
// 消息模板（三语）
// ============================================================

const notificationTemplates = {
  km: {
    orderCreated: '🛒 <b>ការបញ្ជាទិញបានបង្កើត!</b>\n\nលេខកម្មង: {{orderNumber}}\nចំនួនទឹកប្រាក់: ${{amount}}\nវិធីបង់ប្រាក់: {{paymentMethod}}\n\nសូមបង់ប្រាក់ក្នុងរយៈពេល 15 នាទី',
    orderPaid: '✅ <b>ការទូទាត់បានជោគជ័យ!</b>\n\nលេខកម្មង: {{orderNumber}}\nចំនួនទឹកប្រាក់: ${{amount}}\n\nហាងនឹងដឹកជញ្ជូនឆាប់ៗនេះ',
    orderShipped: '📦 <b>ការដឹកជញ្ជូនបានចាប់ផ្តើម!</b>\n\nលេខកម្មង: {{orderNumber}}\nក្រុមហ៊ុនដឹកជញ្ជូន: {{logistics}}\nលេខតាមដាន: {{tracking}}',
    merchantNewOrder: '🔔 <b>មានការបញ្ជាទិញថ្មី!</b>\n\nលេខកម្មង: {{orderNumber}}\nចំនួនទឹកប្រាក់: ${{amount}}\n\nសូមពិនិត្យនិងដំណើរការ',
    merchantOrderPaid: '💰 <b>អ្នកទិញបានបង់ប្រាក់រួច!</b>\n\nលេខកម្មង: {{orderNumber}}\nចំនួនទឹកប្រាក់: ${{amount}}\n\nសូមរៀបចំដឹកជញ្ជូន',
    merchantApproved: '🎉 <b>សូមអបអរសាទរ!</b>\n\nហាងរបស់អ្នកបានអនុម័តដោយជោគជ័យ\nឥឡូវអ្នកអាចចាប់ផ្តើមលក់ទំនិញបានហើយ',
    merchantRejected: '❌ <b>ពាក្យស្នើសុំត្រូវបានបដិសេធ</b>\n\nមូលហេតុ: {{reason}}\n\nសូមពិនិត្យព័ត៌មាននិងដាក់ពាក្យម្តងទៀត',
  },
  en: {
    orderCreated: '🛒 <b>Order Created!</b>\n\nOrder: {{orderNumber}}\nAmount: ${{amount}}\nPayment: {{paymentMethod}}\n\nPlease pay within 15 minutes',
    orderPaid: '✅ <b>Payment Successful!</b>\n\nOrder: {{orderNumber}}\nAmount: ${{amount}}\n\nYour order will be shipped soon',
    orderShipped: '📦 <b>Order Shipped!</b>\n\nOrder: {{orderNumber}}\nCarrier: {{logistics}}\nTracking: {{tracking}}',
    merchantNewOrder: '🔔 <b>New Order!</b>\n\nOrder: {{orderNumber}}\nAmount: ${{amount}}\n\nPlease process it',
    merchantOrderPaid: '💰 <b>Buyer Paid!</b>\n\nOrder: {{orderNumber}}\nAmount: ${{amount}}\n\nPlease arrange shipping',
    merchantApproved: '🎉 <b>Congratulations!</b>\n\nYour shop has been approved\nYou can now start selling',
    merchantRejected: '❌ <b>Application Rejected</b>\n\nReason: {{reason}}\n\nPlease review and re-apply',
  },
  zh: {
    orderCreated: '🛒 <b>订单已创建！</b>\n\n订单号：{{orderNumber}}\n金额：${{amount}}\n支付方式：{{paymentMethod}}\n\n请在15分钟内完成支付',
    orderPaid: '✅ <b>支付成功！</b>\n\n订单号：{{orderNumber}}\n金额：${{amount}}\n\n商家将尽快为您发货',
    orderShipped: '📦 <b>订单已发货！</b>\n\n订单号：{{orderNumber}}\n物流公司：{{logistics}}\n运单号：{{tracking}}',
    merchantNewOrder: '🔔 <b>新订单！</b>\n\n订单号：{{orderNumber}}\n金额：${{amount}}\n\n请尽快处理',
    merchantOrderPaid: '💰 <b>买家已付款！</b>\n\n订单号：{{orderNumber}}\n金额：${{amount}}\n\n请尽快安排发货',
    merchantApproved: '🎉 <b>恭喜！</b>\n\n您的店铺已通过审核\n现在可以开始销售商品了',
    merchantRejected: '❌ <b>入驻申请被驳回</b>\n\n原因：{{reason}}\n\n请修改信息后重新申请',
  },
};

// ============================================================
// Bot 菜单按钮配置 — Mini App 入口
// ============================================================

/** 设置 Bot 的菜单按钮为 Web App（底部固定"打开商城"按钮） */
export async function setMiniAppMenuButton() {
  if (!config.botToken) {
    console.warn('[Bot] BOT_TOKEN 未配置，跳过菜单按钮设置');
    return { ok: false, error: 'BOT_TOKEN_NOT_CONFIGURED' };
  }

  const miniAppUrl = config.miniAppUrl || 'https://tgmall-production.up.railway.app';

  // 1. 设置默认菜单按钮（所有用户的 Bot 底部显示"打开商城"）
  const setMenuBtnUrl = `https://api.telegram.org/bot${config.botToken}/setChatMenuButton`;
  const menuBody = {
    menu_button: {
      type: 'web_app',
      text: '🛒 Tgmall',
      web_app: { url: miniAppUrl },
    },
  };

  // 2. 设置 Bot 命令（/start 等）
  const setCmdsUrl = `https://api.telegram.org/bot${config.botToken}/setMyCommands`;
  const commandsBody = {
    commands: [
      { command: 'start', description: 'ចាប់ផ្តើម / Start' },
      { command: 'shop', description: 'បើកហាង / Open Shop' },
      { command: 'orders', description: 'ការបញ្ជាទិញរបស់ខ្ញុំ / My Orders' },
    ],
    scope: { type: 'default' },
  };

  try {
    const [menuRes, cmdsRes] = await Promise.all([
      fetch(setMenuBtnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuBody),
      }),
      fetch(setCmdsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandsBody),
      }),
    ]);

    const menuResult = await menuRes.json();
    const cmdsResult = await cmdsRes.json();

    if (!menuResult.ok) {
      console.error(`[Bot] 菜单按钮设置失败: ${menuResult.description}`);
      return { ok: false, error: menuResult.description };
    }

    if (!cmdsResult.ok) {
      console.warn(`[Bot] 命令设置失败: ${cmdsResult.description}`);
    }

    console.log(`[Bot] ✅ Mini App 菜单按钮已设置 → ${miniAppUrl}`);
    return { ok: true };
  } catch (err) {
    console.error(`[Bot] 菜单按钮网络错误: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

/**
 * 生成扫码进入 Mini App 的链接
 *
 * Telegram 内直接打开（推荐）：tg://resolve?domain=bot&appname
 * 通用 fallback（会经过 Bot 聊天）：https://t.me/bot?startapp=
 */
export function getMiniAppEntryUrl(startParam = '') {
  const botUsername = config.botUsername || 'xhzmall_bot';
  const httpsBase = `https://t.me/${botUsername}`;
  const tgBase = `tg://resolve?domain=${botUsername}`;

  if (!startParam) {
    return {
      https: httpsBase,
      telegram: tgBase,
      // 推荐：优先使用 tg:// 协议（Telegram 内直接打开 Mini App）
      recommended: tgBase,
    };
  }

  const encodedParam = encodeURIComponent(startParam);
  return {
    https: `${httpsBase}?startapp=${encodedParam}`,
    telegram: `${tgBase}&startapp=${encodedParam}`,
    recommended: `${tgBase}&startapp=${encodedParam}`,
  };
}

/**
 * 生成带落地页的扫码链接（兼容微信/系统相机）
 * QR 码指向落地页，落地页自动判断环境并跳转
 */
export function getMiniAppLandingUrl(startParam = '') {
  const base = config.miniAppUrl || 'https://tgmall-production.up.railway.app';
  return startParam ? `${base}/go?ref=${encodeURIComponent(startParam)}` : `${base}/go`;
}

export default {
  verifyInitData,
  parseInitDataUnsafe,
  sendMessage,
  sendOrderNotification,
  sendMerchantOrderNotification,
  sendAuditNotification,
  sendShippedNotification,
  sendApprovalNotification,
  setMiniAppMenuButton,
  getMiniAppEntryUrl,
};
