// 图片代理 — 用于 Telegram 头像等被用户网络拦截的外部图片
import express from 'express';
import { AppError } from '../utils/AppError.js';

const router = express.Router();

// 允许代理的白名单域名（防止 SSRF）
const ALLOWED_HOSTS = new Set([
  't.me',
  'telegram.org',
  'cdn.telegram.org',
]);

function isAllowedUrl(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

router.get('/', async (req, res, next) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return next(new AppError('缺少 url 参数', 400, 'MISSING_URL'));
  }
  if (!isAllowedUrl(url)) {
    return next(new AppError('不允许代理该来源图片', 403, 'FORBIDDEN_HOST'));
  }

  try {
    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TGMall/1.0)',
      },
    });

    if (!response.ok) {
      return next(new AppError('源图片获取失败', 502, 'UPSTREAM_ERROR'));
    }

    const contentType = response.headers.get('content-type') || 'image/svg+xml';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // node-fetch body 是可读流，直接管道给响应
    response.body.pipe(res);
  } catch (err) {
    next(new AppError(`图片代理失败: ${err.message}`, 502, 'PROXY_ERROR'));
  }
});

export default router;
