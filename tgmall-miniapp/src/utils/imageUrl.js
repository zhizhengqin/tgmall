/**
 * 统一解析商品图片 URL。
 * 支持字符串、{ url, thumb_url } 对象，优先取 thumb_url，url 为空时回退。
 */
export function imageUrl(img) {
  if (!img) return '';
  if (typeof img === 'string') return img;
  return img.thumb_url || img.url || '';
}

/**
 * 返回用于 img.src 的安全图片 URL；无效时返回空字符串，便于调用方使用占位图。
 */
export function safeImageUrl(img) {
  const url = imageUrl(img);
  if (!url) return '';
  // 拦截非法协议（如 javascript: / data:text/html）
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url) && !/^data:image\//i.test(url)) {
    return '';
  }
  return url;
}
