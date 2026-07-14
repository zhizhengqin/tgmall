/**
 * 返回安全的图片 URL，用于 img.src 绑定。
 * 仅允许 http/https、相对路径（无 scheme）和 data:image/*。
 * 对 javascript:/data:text/html 等非法协议返回空字符串。
 */
export function safeImageUrl(img, baseUrl = 'http://localhost') {
  if (!img) return '';
  const url = typeof img === 'string' ? img : img.thumb_url || img.url || '';
  if (!url) return '';

  try {
    const parsed = new URL(url, baseUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
    if (parsed.protocol === 'data:' && /^data:image\//i.test(url)) return url;
    // 允许相对路径（无 scheme，例如 /uploads/...）
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  } catch {
    // malformed URL
  }
  return '';
}
