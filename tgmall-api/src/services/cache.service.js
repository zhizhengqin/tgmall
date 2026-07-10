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

export async function delPattern(pattern) {
  return new Promise((resolve, reject) => {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const pipeline = redis.pipeline();
    let keyCount = 0;
    stream.on('data', (keys) => {
      if (keys.length) {
        keys.forEach((key) => pipeline.del(key));
        keyCount += keys.length;
      }
    });
    stream.on('end', async () => {
      try {
        if (keyCount > 0) await pipeline.exec();
        resolve(keyCount);
      } catch (err) {
        reject(err);
      }
    });
    stream.on('error', (err) => {
      console.error('[Cache] scanStream 失败:', err.message);
      reject(err);
    });
  });
}

export async function invalidateProductCache(productId) {
  if (!productId) return;
  try {
    await delPattern(`products:detail:v1:${productId}:*`);
  } catch (err) {
    console.error('[Cache] invalidateProductCache 失败:', err.message);
  }
}

export async function bumpProductListVersion() {
  await incr('products:list:version');
}
