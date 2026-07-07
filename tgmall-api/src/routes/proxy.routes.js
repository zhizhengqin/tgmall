// 图片代理 — 用于 Telegram 头像等被用户网络或服务器网络拦截的外部图片
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

async function fetchImage(url) {
  return fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });
}

async function pipeImage(response, res) {
  const contentType = response.headers.get('content-type') || 'image/svg+xml';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  response.body.pipe(res);
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
    // 1. 直接获取源图片
    let response = await fetchImage(url);

    // 2. 如果直接获取失败（如服务器网络被拦截），回退到 wsrv.nl 公共图片代理
    if (!response.ok) {
      const fallbackUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
      response = await fetchImage(fallbackUrl);
    }

    if (!response.ok) {
      return next(new AppError('源图片获取失败', 502, 'UPSTREAM_ERROR'));
    }

    return pipeImage(response, res);
  } catch (err) {
    try {
      // 3. 直接 fetch 抛异常（超时/网络不通）时，使用 wsrv.nl 兜底
      const fallbackUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
      const response = await fetchImage(fallbackUrl);
      if (response.ok) {
        return pipeImage(response, res);
      }
    } catch (fallbackErr) {
      // fallback 也失败，返回原始错误
    }
    next(new AppError(`图片代理失败: ${err.message}`, 502, 'PROXY_ERROR'));
  }
});

export default router;
