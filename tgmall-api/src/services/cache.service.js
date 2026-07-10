// Redis 缓存辅助服务
import redis from '../config/redis.js';

const DEFAULT_TTL = 300;

export async function getJson(key) {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.error('[Cache] getJson 失败:', err.message);
    return null;
  }
}

export async function setJson(key, value, ttlSeconds = DEFAULT_TTL) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (err) {
    console.error('[Cache] setJson 失败:', err.message);
    return false;
  }
}

export async function delKey(key) {
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.error('[Cache] delKey 失败:', err.message);
    return false;
  }
}

export async function incr(key) {
  try {
    return await redis.incr(key);
  } catch (err) {
    console.error('[Cache] incr 失败:', err.message);
    return null;
  }
}

export async function invalidateProductCache(productId) {
  if (!productId) return;
  await delKey(`products:detail:v1:${productId}`);
}

export async function bumpProductListVersion() {
  await incr('products:list:version');
}
