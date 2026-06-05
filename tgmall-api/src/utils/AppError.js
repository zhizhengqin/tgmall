// 自定义业务错误类
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 三语错误消息映射（精简版，完整版见 API 接口文档）
const messages = {
  INSUFFICIENT_STOCK: {
    km: 'ទំនិញមិនគ្រប់គ្រាន់',
    en: 'Insufficient stock',
    zh: '库存不足',
  },
  ORDER_ALREADY_PAID: {
    km: 'ការបញ្ជាទិញបានបង់ប្រាក់រួចហើយ',
    en: 'Order already paid',
    zh: '订单已支付',
  },
  ORDER_CANCELLED: {
    km: 'ការបញ្ជាទិញត្រូវបានលុបចោល',
    en: 'Order has been cancelled',
    zh: '订单已取消',
  },
  PAYMENT_SERVICE_UNAVAILABLE: {
    km: 'សេវាទូទាត់មិនអាចប្រើបានបណ្តោះអាសន្ន',
    en: 'Payment service temporarily unavailable',
    zh: '支付服务暂不可用',
  },
  NOT_FOUND: {
    km: 'រកមិនឃើញ',
    en: 'Not found',
    zh: '未找到',
  },
  UNAUTHORIZED: {
    km: 'សូមចូលគណនីឡើងវិញ',
    en: 'Please log in again',
    zh: '请重新登录',
  },
  VALIDATION_ERROR: {
    km: 'ទិន្នន័យមិនត្រឹមត្រូវ',
    en: 'Invalid data',
    zh: '数据格式不正确',
  },
  INTERNAL_ERROR: {
    km: 'មានបញ្ហាបច្ចេកទេស',
    en: 'Internal server error',
    zh: '服务器内部错误',
  },
};

export function getLocalizedMessage(code, lang = 'km') {
  return messages[code]?.[lang] || messages[code]?.en || code;
}
