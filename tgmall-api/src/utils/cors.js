// CORS 来源校验工具函数
// 与 src/app.js 中的 CORS 中间件逻辑保持一致，便于单元测试

export function isCorsOriginAllowed(origin, allowedOrigins, nodeEnv, selfOrigin) {
  // 允许无 origin 的请求（如移动 App、服务器间调用）
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // 允许请求来源与当前服务自身域名一致（同域部署的 admin/Mini App H5）
  if (selfOrigin && origin === selfOrigin) return true;
  // 协议可能因反向代理层级丢失（http/https 不一致），只要 hostname 一致就放行
  if (selfOrigin && origin) {
    try {
      const originUrl = new URL(origin);
      const selfUrl = new URL(selfOrigin);
      if (originUrl.hostname === selfUrl.hostname) return true;
    } catch {
      // 非法 URL 时忽略
    }
  }
  // 生产环境未显式配置 ALLOWED_ORIGINS 时，允许同源请求
  if (nodeEnv === 'production' && allowedOrigins.length === 0) return true;
  return false;
}
