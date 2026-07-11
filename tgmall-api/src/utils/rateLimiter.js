import rateLimit from 'express-rate-limit';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 分钟

const RATE_LIMIT_MESSAGE = {
  success: false,
  error: {
    code: 'RATE_LIMIT',
    message: '请求过于频繁，请稍后再试',
  },
};

/**
 * 创建 Express 速率限制中间件
 * @param {Object} options
 * @param {number} [options.limit] - 窗口内允许请求数；生产默认 100，非生产默认 1000
 * @param {function} [options.skip] - 跳过限流的条件函数
 * @param {number} [options.windowMs] - 窗口时长，默认 15 分钟
 */
export function createRateLimiter({
  limit,
  skip,
  windowMs = DEFAULT_WINDOW_MS,
} = {}) {
  const resolvedLimit = limit ?? (process.env.NODE_ENV === 'production' ? 100 : 1000);

  return rateLimit({
    windowMs,
    limit: resolvedLimit,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    message: RATE_LIMIT_MESSAGE,
  });
}
