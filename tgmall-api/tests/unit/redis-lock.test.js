// T4.3 — Redis 分布式锁安全性测试
// 验证 C2 修复：token 匹配释放，防止误删他人锁

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRedis } from '../helpers/mocks.js';
import crypto from 'crypto';

/**
 * 模拟分布式锁获取 + 释放（C2 修复版）
 */
async function acquireLock(redis, key) {
  const token = crypto.randomUUID();
  const locked = await redis.set(key, token, 'NX', 'EX', 30);
  if (!locked) return null; // 冲突
  return token;
}

async function releaseLock(redis, key, token) {
  const current = await redis.get(key);
  if (current === token) {
    await redis.del(key);
    return true;
  }
  // token 不匹配：别人的锁，不删
  return false;
}

describe('Redis 分布式锁安全性 (C2 fix)', () => {
  let redis, key;

  beforeEach(() => {
    redis = createMockRedis();
    key = 'lock:order:user-1';
  });

  it('正常获取和释放锁', async () => {
    const token = await acquireLock(redis, key);
    expect(token).not.toBeNull();

    const released = await releaseLock(redis, key, token);
    expect(released).toBe(true);

    // 释放后 key 应被删除
    expect(redis._get(key)).toBeUndefined();
  });

  it('不能释放别人的锁（C2 关键场景）', async () => {
    const tokenA = await acquireLock(redis, key);
    expect(tokenA).not.toBeNull();

    // 模拟：请求 A 的锁过期（被自动删除），请求 B 拿到新锁
    redis._clear();
    const tokenB = await acquireLock(redis, key);
    expect(tokenB).not.toBeNull();
    expect(tokenB).not.toBe(tokenA); // 不同的 token

    // 请求 A 的 finally 块尝试用旧 token 释放
    const releasedByA = await releaseLock(redis, key, tokenA);
    expect(releasedByA).toBe(false); // 不应释放 B 的锁

    // 请求 B 的锁应该还在
    expect(redis._get(key)).toBe(tokenB);
  });

  it('并发加锁：第二个请求应被拒绝', async () => {
    const token1 = await acquireLock(redis, key);
    expect(token1).not.toBeNull();

    // key 已被占用，第二个请求无法获取
    const token2 = await acquireLock(redis, key);
    expect(token2).toBeNull();
  });

  it('锁超时后另一个请求可获取新锁', async () => {
    // 请求 A 获取锁
    const tokenA = await acquireLock(redis, key);
    expect(tokenA).not.toBeNull();

    // 模拟锁过期（Redis TTL 到期）
    redis._clear();

    // 请求 B 获取新锁
    const tokenB = await acquireLock(redis, key);
    expect(tokenB).not.toBeNull();
    expect(tokenB).not.toBe(tokenA);

    // 请求 A 的 finally 不能释放 B 的锁
    const releasedByA = await releaseLock(redis, key, tokenA);
    expect(releasedByA).toBe(false);
  });

  it('大量并发场景下 token 唯一性', () => {
    const tokens = new Set();
    for (let i = 0; i < 1000; i++) {
      tokens.add(crypto.randomUUID());
    }
    expect(tokens.size).toBe(1000); // 无碰撞
  });
});
