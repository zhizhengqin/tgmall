// 图片 URL 代理转换 — 把 Telegram CDN 等外部域名转为同域代理
export function proxifyImageUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 't.me' || parsed.hostname.endsWith('.telegram.org')) {
      return `/api/v1/proxy/image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // 非合法 URL 直接返回原值
  }
  return url;
}
