// Redis 连接单例
import Redis from 'ioredis';
import { config } from './index.js';

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis 连接错误:', err.message);
});

redis.on('connect', () => {
  console.log('Redis 已连接');
});

// 懒连接：首次调用命令时自动连接
export default redis;
