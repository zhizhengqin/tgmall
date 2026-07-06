// CORS 来源校验工具函数
// 与 src/app.js 中的 CORS 中间件逻辑保持一致，便于单元测试

export function isCorsOriginAllowed(origin, allowedOrigins, nodeEnv) {
  // 允许无 origin 的请求（如移动 App、服务器间调用）
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // 生产环境未显式配置 ALLOWED_ORIGINS 时，允许同源请求（admin 与 API 同域部署）
  if (nodeEnv === 'production' && allowedOrigins.length === 0) return true;
  return false;
}
