// Redis 连接单例
import Redis from 'ioredis';
import { config } from './index.js';

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 100, 3000);
  },
});

redis.on('error', (err) => {
  console.error('Redis 连接错误:', err.message);
});

redis.on('connect', () => {
  console.log('Redis 已连接');
});

export default redis;
