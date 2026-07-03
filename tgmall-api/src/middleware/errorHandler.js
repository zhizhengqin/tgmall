// 全局错误处理中间件
import logger from '../config/logger.js';
import { getLocalizedMessage } from '../utils/AppError.js';

export function errorHandler(err, req, res, _next) {
  logger.error({
    message: err.message,
    errorCode: err.errorCode,
    path: req.path,
    method: req.method,
    stack: err.stack?.split('\n').slice(0, 3).join('\n'),
  });

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: getLocalizedMessage(err.errorCode, req.headers['accept-language'] || 'km'),
      },
    });
  }

  // 未知错误 — 仅当显式开启 DEBUG 时才暴露详情用于诊断
  const exposeDetail = process.env.DEBUG === 'true';
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || getLocalizedMessage('INTERNAL_ERROR', req.headers['accept-language'] || 'km'),
      detail: exposeDetail ? err.stack?.split('\n').slice(0, 3) : undefined,
    },
  });
}
