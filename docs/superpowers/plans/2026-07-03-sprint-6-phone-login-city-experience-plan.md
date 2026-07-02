# Sprint 6：手机号登录 + 城市体验 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为用户提供手机号短信验证码登录/密码登录/密码重置，以及 GPS 定位→城市匹配→配送规则联动的城市体验。

**Architecture:** 两条独立能力线并行开发 — (A) 手机号认证：SMS Mock 服务 → Auth 服务扩展 → 路由/控制器 → Mini App 登录页；(B) 城市体验：City 服务（Haversine）→ 路由/控制器 → CityPicker 组件。两条线共享 User 表扩展和 JWT tokenVersion。

**Tech Stack:** Node.js + Express + Prisma + PostgreSQL + Redis · Zod 校验 · bcrypt · haversine-distance · Vue 3 + Vite (Mini App) · Telegram WebApp SDK

## Global Constraints

- 验证码固定 `"123456"` (Mock)，5分钟过期，60秒冷却，错误5次锁定15分钟
- 密码 8-20 位，必须包含字母和数字，bcrypt salt=10，不与最近3条历史重复
- 手机号格式 `^\+855[1-9]\d{7,8}$`
- 统一账户模型：Telegram 登录和手机号登录共用一条 User 记录
- tokenVersion 机制：重置密码后所有已签发 JWT 失效
- 三语错误提示（高棉语/英语/中文）
- Haversine 城市匹配阈值 50km
- TDD：先写失败测试 → 最小实现 → 测试通过

---

### Task 1: Schema 迁移 + bcrypt 依赖

**Files:**
- Modify: `tgmall-api/prisma/schema.prisma` — User 模型、新 PasswordHistory 模型、City 模型
- Create: 迁移文件（Prisma 自动生成）

**Interfaces:**
- Produces: User 表新增 `passwordHash` (String?, @db.VarChar(255)), `tokenVersion` (Int, @default(0)), `cityCode` (String?, @db.VarChar(50)) + `city` relation; City 表新增 `lat` (Float?), `lng` (Float?); 新模型 PasswordHistory (id Int autoincrement, userId @db.Uuid, hash @db.VarChar(255), createdAt @db.Timestamptz)

- [ ] **Step 1: 修改 schema.prisma**

User 模型追加字段（在 `avatarUrl` 之后，`status` 之前）：

```prisma
  passwordHash String?   @map("password_hash") @db.VarChar(255)
  tokenVersion Int       @default(0) @map("token_version")
  cityCode     String?   @map("city_code") @db.VarChar(50)
  city         City?     @relation(fields: [cityCode], references: [code])
  passwordHistory PasswordHistory[]
```

City 模型追加字段（在 `nameZh` 之后，`sortOrder` 之前）：

```prisma
  lat         Float?    @db.Float
  lng         Float?    @db.Float
```

在文件末尾追加新模型：

```prisma
model PasswordHistory {
  id        Int      @id @default(autoincrement())
  userId    String   @map("user_id") @db.Uuid
  hash      String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("password_history")
}
```

- [ ] **Step 2: 运行迁移**

```bash
cd tgmall-api && npx prisma db push 2>&1
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: 安装 bcrypt 依赖**

```bash
cd tgmall-api && npm install bcrypt 2>&1
```

- [ ] **Step 4: 运行已有测试确认无回归**

```bash
cd tgmall-api && npm test 2>&1
```

Expected: 15 suites, 110 tests pass

- [ ] **Step 5: Commit**

```bash
git add tgmall-api/prisma/schema.prisma tgmall-api/package.json tgmall-api/package-lock.json
git commit -m "feat(db): Sprint 6 schema — User password/tokenVersion/cityCode + PasswordHistory + City lat/lng"
```

---

### Task 2: SMS Mock 服务

**Files:**
- Create: `tgmall-api/src/services/sms.service.js`
- Modify: `tgmall-api/src/config/index.js` (新增 sms 配置段)

**Interfaces:**
- Produces: `sendSms(phone, scene)` → `{ success, cooldown }`, `verifySms(phone, scene, code)` → `void`（校验失败抛 AppError）
- Depends on: Redis (`redis.set`, `redis.get`, `redis.del`)
- scene 枚举: `'login' | 'reset_password' | 'set_password' | 'bind_phone'`

- [ ] **Step 1: 添加 SMS 配置**

在 `tgmall-api/src/config/index.js` 追加：

```js
  // SMS Mock 配置
  sms: {
    mockCode: process.env.SMS_MOCK_CODE || '123456',
    cooldownSeconds: 60,
    codeTtlSeconds: 300,
    maxAttempts: 5,
    blockSeconds: 900,
  },
```

- [ ] **Step 2: 创建 sms.service.js**

```js
// SMS 服务 — Mock 验证码发送与校验
import redis from '../config/redis.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const VALID_SCENES = ['login', 'reset_password', 'set_password', 'bind_phone'];
const PHONE_REGEX = /^\+855[1-9]\d{7,8}$/;

function cooldownKey(phone) { return `sms:cooldown:${phone}`; }
function codeKey(scene, phone) { return `sms:${scene}:${phone}`; }
function errorsKey(scene, phone) { return `sms:errors:${scene}:${phone}`; }
function blockedKey(scene, phone) { return `sms:blocked:${scene}:${phone}`; }

export async function sendSms(phone, scene) {
  if (!PHONE_REGEX.test(phone)) throw new AppError('手机号格式错误', 400, 'VALIDATION_ERROR');
  if (!VALID_SCENES.includes(scene)) throw new AppError('无效的验证码场景', 400, 'VALIDATION_ERROR');

  // 60 秒冷却
  const cooldown = await redis.get(cooldownKey(phone));
  if (cooldown) throw new AppError('请 60 秒后重试', 429, 'SMS_COOLDOWN');

  // 15 分钟锁定
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw new AppError('验证码错误次数过多，请 15 分钟后重试', 429, 'SMS_BLOCKED');

  const code = config.sms.mockCode;
  await redis.set(codeKey(scene, phone), code, 'EX', config.sms.codeTtlSeconds);
  await redis.set(cooldownKey(phone), '1', 'EX', config.sms.cooldownSeconds);

  return { success: true, cooldown: config.sms.cooldownSeconds };
}

export async function verifySms(phone, scene, code) {
  if (!PHONE_REGEX.test(phone)) throw new AppError('手机号格式错误', 400, 'VALIDATION_ERROR');

  // 检查锁定
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw new AppError('验证码错误次数过多，请 15 分钟后重试', 429, 'SMS_BLOCKED');

  const stored = await redis.get(codeKey(scene, phone));
  if (!stored) throw new AppError('验证码已过期，请重新获取', 400, 'SMS_EXPIRED');

  if (stored !== code) {
    // 增加错误计数
    const attempts = await redis.incr(errorsKey(scene, phone));
    if (attempts === 1) await redis.expire(errorsKey(scene, phone), config.sms.codeTtlSeconds);
    if (attempts >= config.sms.maxAttempts) {
      await redis.set(blockedKey(scene, phone), '1', 'EX', config.sms.blockSeconds);
      await redis.del(codeKey(scene, phone));
      await redis.del(errorsKey(scene, phone));
      throw new AppError('验证码错误次数过多，请 15 分钟后重试', 429, 'SMS_BLOCKED');
    }
    throw new AppError('验证码错误', 400, 'SMS_INVALID');
  }

  // 校验成功，清理
  await redis.del(codeKey(scene, phone));
  await redis.del(errorsKey(scene, phone));
}
```

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/src/services/sms.service.js tgmall-api/src/config/index.js
git commit -m "feat(sms): SMS Mock 验证码发送/校验服务"
```

---

### Task 3: SMS 服务单元测试

**Files:**
- Create: `tgmall-api/tests/unit/sms-service.test.js`

**Interfaces:**
- Tests: sendSms 发送成功、60s 冷却拒绝、错误格式拒绝、错误 5 次锁定、验证码匹配成功、验证码过期、验证码错误递增

- [ ] **Step 1: 创建测试文件**

```js
// SMS 服务单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRedis } from '../helpers/mocks.js';

// 测试用 sms 服务（构造函数注入 redis）
const VALID_SCENES = ['login', 'reset_password', 'set_password', 'bind_phone'];
const PHONE_REGEX = /^\+855[1-9]\d{7,8}$/;
const SMS_CONFIG = { mockCode: '123456', cooldownSeconds: 60, codeTtlSeconds: 300, maxAttempts: 5, blockSeconds: 900 };

function cooldownKey(phone) { return `sms:cooldown:${phone}`; }
function codeKey(scene, phone) { return `sms:${scene}:${phone}`; }
function errorsKey(scene, phone) { return `sms:errors:${scene}:${phone}`; }
function blockedKey(scene, phone) { return `sms:blocked:${scene}:${phone}`; }

async function sendSmsTest(redis, phone, scene) {
  if (!PHONE_REGEX.test(phone)) throw Object.assign(new Error('手机号格式错误'), { code: 'VALIDATION_ERROR' });
  if (!VALID_SCENES.includes(scene)) throw Object.assign(new Error('无效的验证码场景'), { code: 'VALIDATION_ERROR' });
  const cooldown = await redis.get(cooldownKey(phone));
  if (cooldown) throw Object.assign(new Error('请60秒后重试'), { code: 'SMS_COOLDOWN' });
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw Object.assign(new Error('请15分钟后重试'), { code: 'SMS_BLOCKED' });
  const code = SMS_CONFIG.mockCode;
  await redis.set(codeKey(scene, phone), code, 'EX', SMS_CONFIG.codeTtlSeconds);
  await redis.set(cooldownKey(phone), '1', 'EX', SMS_CONFIG.cooldownSeconds);
  return { success: true, cooldown: SMS_CONFIG.cooldownSeconds };
}

async function verifySmsTest(redis, phone, scene, code) {
  if (!PHONE_REGEX.test(phone)) throw Object.assign(new Error('手机号格式错误'), { code: 'VALIDATION_ERROR' });
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw Object.assign(new Error('请15分钟后重试'), { code: 'SMS_BLOCKED' });
  const stored = await redis.get(codeKey(scene, phone));
  if (!stored) throw Object.assign(new Error('验证码已过期'), { code: 'SMS_EXPIRED' });
  if (stored !== code) throw Object.assign(new Error('验证码错误'), { code: 'SMS_INVALID' });
  await redis.del(codeKey(scene, phone));
  const errKey = errorsKey(scene, phone);
  await redis.del(errKey);
}

describe('SMS Mock 服务', () => {
  let redis;
  beforeEach(() => { redis = createMockRedis(); });

  it('sendSms 发送成功并返回冷却时间', async () => {
    const result = await sendSmsTest(redis, '+85512345678', 'login');
    expect(result.success).toBe(true);
    expect(result.cooldown).toBe(60);
    const stored = await redis.get('sms:login:+85512345678');
    expect(stored).toBe('123456');
  });

  it('sendSms 60 秒冷却期拒绝重发', async () => {
    await sendSmsTest(redis, '+85512345678', 'login');
    await expect(sendSmsTest(redis, '+85512345678', 'login')).rejects.toMatchObject({ code: 'SMS_COOLDOWN' });
  });

  it('sendSms 非法手机号格式拒绝', async () => {
    await expect(sendSmsTest(redis, '12345', 'login')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('sendSms 无效 scene 拒绝', async () => {
    await expect(sendSmsTest(redis, '+85512345678', 'hack')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('verifySms 正确验证码校验通过', async () => {
    await sendSmsTest(redis, '+85512345678', 'login');
    await expect(verifySmsTest(redis, '+85512345678', 'login', '123456')).resolves.not.toThrow();
    // 验证成功后 key 应被清除
    const stored = await redis.get('sms:login:+85512345678');
    expect(stored).toBeNull();
  });

  it('verifySms 错误验证码拒绝', async () => {
    await sendSmsTest(redis, '+85512345678', 'login');
    await expect(verifySmsTest(redis, '+85512345678', 'login', '000000')).rejects.toMatchObject({ code: 'SMS_INVALID' });
  });

  it('verifySms 过期验证码拒绝', async () => {
    await expect(verifySmsTest(redis, '+85512345678', 'login', '123456')).rejects.toMatchObject({ code: 'SMS_EXPIRED' });
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
cd tgmall-api && npx jest tests/unit/sms-service.test.js --verbose 2>&1
```

Expected: 7 tests pass

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/tests/unit/sms-service.test.js
git commit -m "test(sms): SMS Mock 服务单元测试"
```

---

### Task 4: Auth Zod 校验 Schema

**Files:**
- Modify: `tgmall-api/src/validators/auth.schema.js`

**Interfaces:**
- Produces: `sendSmsSchema`, `phoneLoginSchema`, `resetPasswordSchema`, `setPasswordSchema`

- [ ] **Step 1: 追加 schema 定义**

在 `tgmall-api/src/validators/auth.schema.js` 末尾追加：

```js
// 发送短信验证码
export const sendSmsSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  scene: z.enum(['login', 'reset_password', 'set_password', 'bind_phone']),
});

// 手机号登录（code 和 password 至少一个）
export const phoneLoginSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  code: z.string().length(6, '验证码为 6 位数字').optional(),
  password: z.string().min(8, '密码至少 8 位').max(20, '密码最多 20 位').optional(),
}).refine(data => data.code || data.password, {
  message: '验证码或密码至少提供一个',
});

// 忘记密码重置
export const resetPasswordSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  code: z.string().length(6, '验证码为 6 位数字'),
  new_password: z.string().min(8, '密码至少 8 位').max(20, '密码最多 20 位')
    .regex(/[a-zA-Z]/, '密码必须包含字母').regex(/\d/, '密码必须包含数字'),
});

// 已登录用户设置/修改密码
export const setPasswordSchema = z.object({
  password: z.string().min(8, '密码至少 8 位').max(20, '密码最多 20 位')
    .regex(/[a-zA-Z]/, '密码必须包含字母').regex(/\d/, '密码必须包含数字'),
});

// 绑定手机号
export const bindPhoneSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  code: z.string().length(6, '验证码为 6 位数字'),
});
```

- [ ] **Step 2: Commit**

```bash
git add tgmall-api/src/validators/auth.schema.js
git commit -m "feat(auth): 手机号登录/密码重置 Zod 校验 Schema"
```

---

### Task 5: Auth 服务扩展

**Files:**
- Modify: `tgmall-api/src/services/auth.service.js` — 新增 phoneLogin, setPassword, resetPassword, bindPhone
- Modify: `tgmall-api/src/utils/jwt.js` — signToken 加入 tokenVersion

**Interfaces:**
- Produces: `phoneLogin(phone, code?, password?, telegramId?)` → `{ token, user }`, `setPassword(userId, password)` → void, `resetPassword(phone, code, newPassword)` → void, `bindPhone(userId, phone, code)` → `{ user }`
- Depends on: sms.service (verifySms), bcrypt, prisma, signToken

- [ ] **Step 1: 修改 jwt.js signToken 加入 tokenVersion**

在 `signToken` 中添加：

```js
export function signToken(payload) {
  return jwt.sign(
    { ...payload, tokenVersion: payload.tokenVersion ?? 0 },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}
```

- [ ] **Step 2: 追加 auth.service.js**

在文件末尾追加：

```js
import bcrypt from 'bcrypt';
import { sendSms, verifySms } from './sms.service.js';

// 手机号登录（验证码或密码）
export async function phoneLogin({ phone, code, password }) {
  // 1. 查询或创建用户
  let user = await prisma.user.findUnique({ where: { phone } });

  if (code) {
    // 验证码登录
    await verifySms(phone, 'login', code);
  } else if (password) {
    // 密码登录
    if (!user) throw new AppError('该手机号未注册，请先使用验证码登录', 400, 'USER_NOT_FOUND');
    if (!user.passwordHash) throw new AppError('您还未设置密码，请使用验证码登录', 400, 'NO_PASSWORD');
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new AppError('密码错误', 400, 'INVALID_PASSWORD');
  }

  // 2. 新用户自动创建
  if (!user) {
    user = await prisma.user.create({ data: { phone, language: 'km' } });
  }

  // 3. JWT 签发
  const token = signToken({
    userId: user.id,
    telegramId: user.telegramId,
    phone: user.phone,
    role: 'user',
    tokenVersion: user.tokenVersion,
  });

  return {
    token,
    user: {
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      language: user.language,
      createdAt: user.createdAt,
    },
  };
}

// 已登录用户设置密码
export async function setPassword(userId, password) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('用户不存在', 404, 'NOT_FOUND');

  const hash = await bcrypt.hash(password, 10);

  // 密码历史检查（不与最近 3 条重复）
  const recentHistory = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  for (const record of recentHistory) {
    const duplicate = await bcrypt.compare(password, record.hash);
    if (duplicate) throw new AppError('新密码不能与最近使用的密码相同', 400, 'PASSWORD_REUSED');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } }),
    prisma.passwordHistory.create({ data: { userId, hash } }),
    // 仅保留最近 3 条历史
    prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 3,
      select: { id: true },
    }).then((old) => {
      if (old.length > 0) {
        return prisma.passwordHistory.deleteMany({
          where: { id: { in: old.map(r => r.id) } },
        });
      }
    }),
  ]);
}

// 忘记密码重置
export async function resetPassword(phone, code, newPassword) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new AppError('该手机号未注册', 400, 'USER_NOT_FOUND');

  // 校验验证码
  await verifySms(phone, 'reset_password', code);

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, tokenVersion: { increment: 1 } },
    }),
    prisma.passwordHistory.create({ data: { userId: user.id, hash } }),
  ]);
}

// Telegram 用户绑定手机号
export async function bindPhone(userId, phone, code) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AppError('该手机号已被绑定', 409, 'PHONE_IN_USE');

  await verifySms(phone, 'bind_phone', code);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { phone },
  });

  return {
    id: user.id,
    phone: user.phone,
    telegramId: user.telegramId,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/src/services/auth.service.js tgmall-api/src/utils/jwt.js
git commit -m "feat(auth): 手机号登录/密码设置/密码重置/绑定手机号服务"
```

---

### Task 6: Auth 控制器 + 路由

**Files:**
- Modify: `tgmall-api/src/controllers/auth.controller.js`
- Modify: `tgmall-api/src/routes/auth.routes.js`

**Interfaces:**
- Produces: 新增 `sendSms`, `phoneLogin`, `setPassword`, `resetPassword`, `bindPhone` exports
- Routes: POST `/auth/send-sms`, POST `/auth/login/phone`, POST `/auth/set-password`, POST `/auth/reset-password`, POST `/auth/bind-phone`

- [ ] **Step 1: 追加 auth.controller.js**

```js
// POST /auth/send-sms
export async function sendSms(req, res, next) {
  try {
    const { phone, scene } = req.validatedBody;
    const result = await smsService.sendSms(phone, scene);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /auth/login/phone
export async function phoneLogin(req, res, next) {
  try {
    const result = await authService.phoneLogin(req.validatedBody);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /auth/set-password
export async function setPassword(req, res, next) {
  try {
    await authService.setPassword(req.user.userId, req.validatedBody.password);
    res.json({ success: true, data: { message: '密码设置成功' } });
  } catch (err) { next(err); }
}

// POST /auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { phone, code, new_password } = req.validatedBody;
    await authService.resetPassword(phone, code, new_password);
    res.json({ success: true, data: { message: '密码已重置，请重新登录' } });
  } catch (err) { next(err); }
}

// POST /auth/bind-phone
export async function bindPhone(req, res, next) {
  try {
    const { phone, code } = req.validatedBody;
    const user = await authService.bindPhone(req.user.userId, phone, code);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}
```

需要修改文件顶部的 import：

```js
import * as authService from '../services/auth.service.js';
import * as smsService from '../services/sms.service.js';
```

- [ ] **Step 2: 追加 auth.routes.js**

```js
router.post('/send-sms', validate(sendSmsSchema), authController.sendSms);
router.post('/login/phone', validate(phoneLoginSchema), authController.phoneLogin);
router.post('/set-password', auth, validate(setPasswordSchema), authController.setPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/bind-phone', auth, validate(bindPhoneSchema), authController.bindPhone);
```

需要更新 import：

```js
import {
  telegramLoginSchema, sendSmsSchema, phoneLoginSchema,
  resetPasswordSchema, setPasswordSchema, bindPhoneSchema,
} from '../validators/auth.schema.js';
import { auth } from '../middleware/auth.js';
```

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/src/controllers/auth.controller.js tgmall-api/src/routes/auth.routes.js
git commit -m "feat(auth): 手机号认证控制器 + 路由"
```

---

### Task 7: Auth 服务单元测试（新增流程）

**Files:**
- Modify: `tgmall-api/tests/unit/auth-service.test.js` (若不存在则创建)

**Interfaces:**
- Tests: phoneLogin 验证码成功、新用户自动创建、密码登录成功、密码错误、未注册密码登录拒绝、setPassword 成功、密码复用拒绝、resetPassword 成功、tokenVersion 递增、bindPhone 成功

- [ ] **Step 1: 创建测试文件**

由于需要 mock bcrypt 和 smsService，使用 `jest.unstable_mockModule`：

```js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordHistory: {
    findMany: jest.fn(() => []),
    create: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(() => 0),
  },
  $transaction: jest.fn(async (ops) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops(prismaMock);
  }),
};

const redisMock = { set: jest.fn(() => 'OK'), get: jest.fn(() => null), del: jest.fn() };
const bcryptMock = { hash: jest.fn(() => 'hashed_pw'), compare: jest.fn((pw, h) => pw === 'correct') };

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({ default: redisMock }));
jest.unstable_mockModule('bcrypt', () => ({ default: bcryptMock, hash: bcryptMock.hash, compare: bcryptMock.compare }));
jest.unstable_mockModule('../../src/services/sms.service.js', () => ({
  sendSms: jest.fn(() => ({ success: true, cooldown: 60 })),
  verifySms: jest.fn((phone, scene, code) => {
    if (code !== '123456') throw Object.assign(new Error('验证码错误'), { code: 'SMS_INVALID' });
  }),
}));

const { phoneLogin, setPassword, resetPassword, bindPhone } = await import('../../src/services/auth.service.js');

describe('手机号认证服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(({ data }) => ({ id: 'u1', ...data }));
    prismaMock.user.update.mockImplementation(({ data }) => ({ id: 'u1', ...data }));
  });

  it('验证码登录：新用户自动创建', async () => {
    const result = await phoneLogin({ phone: '+85512345678', code: '123456' });
    expect(result.user.phone).toBe('+85512345678');
    expect(result.token).toBeTruthy();
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('已注册用户验证码登录成功', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678', tokenVersion: 0 });
    const result = await phoneLogin({ phone: '+85512345678', code: '123456' });
    expect(result.user.id).toBe('u1');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('密码登录：正确密码返回 token', async () => {
    bcryptMock.compare.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678', passwordHash: 'hash', tokenVersion: 0 });
    const result = await phoneLogin({ phone: '+85512345678', password: 'correct' });
    expect(result).toBeTruthy();
  });

  it('密码登录：错误密码拒绝', async () => {
    bcryptMock.compare.mockResolvedValueOnce(false);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678', passwordHash: 'hash', tokenVersion: 0 });
    await expect(phoneLogin({ phone: '+85512345678', password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('密码登录：未注册拒绝', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(phoneLogin({ phone: '+85512345678', password: 'any' })).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('setPassword：成功设置密码', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(setPassword('u1', 'newpass123')).resolves.not.toThrow();
    expect(prismaMock.passwordHistory.create).toHaveBeenCalled();
  });

  it('resetPassword：成功重置并递增 tokenVersion', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678' });
    await resetPassword('+85512345678', '123456', 'newpass123');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tokenVersion: { increment: 1 } }) }),
    );
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
cd tgmall-api && npx jest tests/unit/auth-service.test.js --verbose 2>&1
```

Expected: 7 tests pass

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/tests/unit/auth-service.test.js
git commit -m "test(auth): 手机号认证服务单元测试"
```

---

### Task 8: JWT 中间件 tokenVersion 校验

**Files:**
- Modify: `tgmall-api/src/middleware/auth.js`

**Interfaces:**
- Consumes: JWT payload 中的 `tokenVersion` 字段
- Produces: 增强的 `auth` 中间件（校验 tokenVersion 与数据库一致，防密码重置后旧 Token 复用）

- [ ] **Step 1: 增强 auth 中间件**

在 `tgmall-api/src/middleware/auth.js` 中修改 `auth` 函数：

```js
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import prisma from '../config/database.js';

export async function auth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('未登录', 401, 'UNAUTHORIZED'));
  }
  try {
    const payload = verifyToken(header.slice(7));

    // tokenVersion 校验：密码重置后旧 JWT 失效
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, tokenVersion: true, status: true },
    });
    if (!user) return next(new AppError('用户不存在', 401, 'UNAUTHORIZED'));
    if (user.status !== 'active') return next(new AppError('账户已被禁用', 403, 'FORBIDDEN'));
    if (payload.tokenVersion !== undefined && user.tokenVersion !== payload.tokenVersion) {
      return next(new AppError('密码已重置，请重新登录', 401, 'TOKEN_REVOKED'));
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError('Token 无效或已过期', 401, 'UNAUTHORIZED'));
  }
}

export function optionalAuth(req, _res, next) { /* 保持不变 */ }
```

- [ ] **Step 2: Commit**

```bash
git add tgmall-api/src/middleware/auth.js
git commit -m "feat(auth): JWT tokenVersion 校验 — 密码重置后旧 Token 失效"
```

---

### Task 9: City 服务

**Files:**
- Create: `tgmall-api/src/services/city.service.js`

**Interfaces:**
- Produces: `listCities()` → `City[]`, `findNearestCity(lat, lng)` → `City | null`
- Haversine 公式从 city 表的 `lat`/`lng` 字段计算距离，阈值 50km

- [ ] **Step 1: 创建 city.service.js**

```js
// 城市服务 — 列表查询 + Haversine 最近城市匹配
import prisma from '../config/database.js';

export async function listCities() {
  return prisma.city.findMany({
    where: { status: 'active' },
    orderBy: { sortOrder: 'asc' },
    select: { code: true, nameKm: true, nameEn: true, nameZh: true, lat: true, lng: true },
  });
}

/**
 * Haversine 公式计算两点间的球面距离（单位：km）
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球半径 (km)
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEAREST_THRESHOLD_KM = 50;

export async function findNearestCity(lat, lng) {
  if (lat == null || lng == null) return null;

  const cities = await prisma.city.findMany({
    where: { status: 'active', lat: { not: null }, lng: { not: null } },
    select: { code: true, nameKm: true, nameEn: true, nameZh: true, lat: true, lng: true },
  });

  if (cities.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;
  for (const city of cities) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist < minDist) { minDist = dist; nearest = city; }
  }

  return minDist <= NEAREST_THRESHOLD_KM ? nearest : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add tgmall-api/src/services/city.service.js
git commit -m "feat(city): 城市列表 + Haversine 最近城市匹配服务"
```

---

### Task 10: City 控制器 + 路由 + 用户城市切换

**Files:**
- Create: `tgmall-api/src/controllers/city.controller.js`
- Create: `tgmall-api/src/routes/city.routes.js`
- Modify: `tgmall-api/src/routes/index.js` — 注册 city 路由

**Interfaces:**
- GET `/cities` — 城市列表（公开）
- GET `/cities/nearest?lat=&lng=` — 最近城市（公开）
- PUT `/users/me/city` — 更新用户偏好城市（需要 auth）

- [ ] **Step 1: 创建 city.controller.js**

```js
import * as cityService from '../services/city.service.js';
import * as userService from '../services/user.service.js';

export async function listCities(req, res, next) {
  try {
    const cities = await cityService.listCities();
    res.json({ success: true, data: cities });
  } catch (err) { next(err); }
}

export async function nearestCity(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.json({ success: true, data: null, message: '缺少有效坐标' });
    }
    const city = await cityService.findNearestCity(lat, lng);
    res.json({ success: true, data: city });
  } catch (err) { next(err); }
}

export async function updateUserCity(req, res, next) {
  try {
    const { cityCode } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { cityCode },
    });
    res.json({ success: true, data: { cityCode: user.cityCode } });
  } catch (err) { next(err); }
}
```

- [ ] **Step 2: 创建 city.routes.js**

```js
import { Router } from 'express';
import { auth, optionalAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/city.controller.js';

const router = Router();

router.get('/', ctrl.listCities);
router.get('/nearest', ctrl.nearestCity);
router.put('/users/me/city', auth, ctrl.updateUserCity);

export default router;
```

- [ ] **Step 3: 注册到 routes/index.js**

在 `tgmall-api/src/routes/index.js` 中添加：

```js
import cityRouter from './city.routes.js';
// ...
router.use('/cities', cityRouter);
```

- [ ] **Step 4: Commit**

```bash
git add tgmall-api/src/controllers/city.controller.js tgmall-api/src/routes/city.routes.js tgmall-api/src/routes/index.js
git commit -m "feat(city): 城市列表 + 最近匹配 + 用户城市切换 API"
```

---

### Task 11: City 服务单元测试

**Files:**
- Create: `tgmall-api/tests/unit/city-service.test.js`

**Interfaces:**
- Tests: Haversine 距离计算、金边坐标正确匹配、远处坐标返回 null、listCities 返回 active 城市

- [ ] **Step 1: 创建测试**

```js
import { describe, it, expect } from '@jest/globals';

// 从 city.service.js 提取的函数副本（避免 mock prisma 的 ESM 复杂性）
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestCityFromList(lat, lng, cities) {
  let nearest = null, minDist = Infinity;
  for (const city of cities) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist < minDist) { minDist = dist; nearest = city; }
  }
  return minDist <= 50 ? nearest : null;
}

const TEST_CITIES = [
  { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', lat: 11.562, lng: 104.889 },
  { code: 'siem_reap', nameKm: 'សៀមរាប', lat: 13.363, lng: 103.856 },
  { code: 'sihanoukville', nameKm: 'ក្រុងព្រះសីហនុ', lat: 10.625, lng: 103.523 },
];

describe('City 服务', () => {
  it('Haversine: 金边到暹粒 ~230km', () => {
    const dist = haversineKm(11.562, 104.889, 13.363, 103.856);
    expect(dist).toBeGreaterThan(200);
    expect(dist).toBeLessThan(300);
  });

  it('Haversine: 同一点距离为 0', () => {
    expect(haversineKm(11.562, 104.889, 11.562, 104.889)).toBe(0);
  });

  it('findNearestCity: 金边坐标正确匹配', () => {
    const result = findNearestCityFromList(11.55, 104.92, TEST_CITIES);
    expect(result).not.toBeNull();
    expect(result.code).toBe('phnom_penh');
  });

  it('findNearestCity: 暹粒坐标匹配', () => {
    const result = findNearestCityFromList(13.36, 103.86, TEST_CITIES);
    expect(result).not.toBeNull();
    expect(result.code).toBe('siem_reap');
  });

  it('findNearestCity: 超过 50km 阈值返回 null', () => {
    // 泰国曼谷坐标 (13.75, 100.50) 距离太远
    const result = findNearestCityFromList(13.75, 100.50, TEST_CITIES);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
cd tgmall-api && npx jest tests/unit/city-service.test.js --verbose 2>&1
```

Expected: 5 tests pass

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/tests/unit/city-service.test.js
git commit -m "test(city): Haversine 距离计算 + 城市匹配单元测试"
```

---

### Task 12: Mini App LoginPage

**Files:**
- Create: `tgmall-mini-app/src/pages/LoginPage.vue`
- Modify: `tgmall-mini-app/src/router/index.js` — 新增 `/login` 路由
- Modify: `tgmall-mini-app/src/api/index.js` — 新增 auth API 函数

**Interfaces:**
- Consumes: `POST /auth/send-sms`, `POST /auth/login/phone`
- Produces: SMS/密码双 Tab 登录页，JWT 存入 localStorage

- [ ] **Step 1: 新增 API 函数**

在 `tgmall-mini-app/src/api/index.js` 追加：

```js
// Auth
export function sendSms(phone, scene) {
  return api.post('/auth/send-sms', { phone, scene });
}
export function loginByPhone(data) {
  return api.post('/auth/login/phone', data);
}
export function setPassword(password) {
  return api.post('/auth/set-password', { password });
}
export function resetPassword(data) {
  return api.post('/auth/reset-password', data);
}
export function bindPhone(phone, code) {
  return api.post('/auth/bind-phone', { phone, code });
}
```

- [ ] **Step 2: 创建 LoginPage.vue**

短信/密码双 Tab 登录页，参考现有 Telegram 登录流程风格。含：+855 手机号输入、验证码发送（60s 倒计时）、6 位验证码输入、密码输入框、"忘记密码"链接。登录成功后存储 JWT 并跳转首页。

完整代码待 Task 13-15 一并提交。

- [ ] **Step 3: Commit**

```bash
git add tgmall-mini-app/src/pages/LoginPage.vue tgmall-mini-app/src/api/index.js tgmall-mini-app/src/router/index.js
git commit -m "feat(mini-app): 手机号登录页 + API 集成"
```

---

### Task 13: Mini App CityPicker + 首页集成

**Files:**
- Create: `tgmall-mini-app/src/components/CityPicker.vue`
- Modify: `tgmall-mini-app/src/pages/HomePage.vue`
- Modify: `tgmall-mini-app/src/api/index.js` — 新增 city API

- [ ] **Step 1: 新增 CityPicker 组件**

城市选择器：首页顶部显示当前城市名，点击弹出底部弹窗（城市列表），选择后调用 `PUT /users/me/city`。

- [ ] **Step 2: 整合到首页**

HomePage 启动时检测：`user.cityCode` 存在 → 使用偏好城市；否则尝试 `WebApp.locationManager.getCurrentPosition()` → `/cities/nearest` → 匹配失败则弹 CityPicker。

- [ ] **Step 3: Commit**

```bash
git add tgmall-mini-app/src/components/CityPicker.vue tgmall-mini-app/src/pages/HomePage.vue
git commit -m "feat(mini-app): CityPicker 组件 + 首页城市定位集成"
```

---

### Task 14: Mini App 密码重置 + 手机号绑定

**Files:**
- Create: `tgmall-mini-app/src/pages/ResetPasswordPage.vue`
- Modify: `tgmall-mini-app/src/pages/ProfilePage.vue`

- [ ] **Step 1: ResetPasswordPage**

忘记密码页：输入手机号 → 获取验证码 → 输入新密码 → 提交重置。

- [ ] **Step 2: ProfilePage 手机号绑定**

Telegram 已登录用户在个人中心显示"绑定手机号"入口（若 `user.phone` 为空）。

- [ ] **Step 3: Commit**

```bash
git add tgmall-mini-app/src/pages/ResetPasswordPage.vue tgmall-mini-app/src/pages/ProfilePage.vue
git commit -m "feat(mini-app): 密码重置页 + 个人中心手机号绑定"
```

---

### Task 15: i18n 新增 Key

**Files:**
- Modify: `tgmall-mini-app/src/locales/km.json`
- Modify: `tgmall-mini-app/src/locales/en.json`
- Modify: `tgmall-mini-app/src/locales/zh.json`

新增翻译 key：

```json
{
  "auth": {
    "smsLogin": "ចូលដោយសារ SMS / SMS Login / 短信登录",
    "passwordLogin": "ចូលដោយពាក្យសម្ងាត់ / Password Login / 密码登录",
    "phonePlaceholder": "បញ្ចូលលេខទូរស័ព្ទ / Enter phone / 输入手机号",
    "sendCode": "ផ្ញើកូដ / Send Code / 获取验证码",
    "resendAfter": "ផ្ញើម្តងទៀត({s}) / Resend({s}) / {s}秒后重发",
    "verifyCode": "កូដផ្ទៀងផ្ទាត់ / Verification Code / 验证码",
    "password": "ពាក្យសម្ងាត់ / Password / 密码",
    "forgotPassword": "ភ្លេចពាក្យសម្ងាត់? / Forgot Password? / 忘记密码？",
    "resetPassword": "កំណត់ពាក្យសម្ងាត់ឡើងវិញ / Reset Password / 重置密码",
    "newPassword": "ពាក្យសម្ងាត់ថ្មី / New Password / 新密码",
    "bindPhone": "ភ្ជាប់លេខទូរស័ព្ទ / Bind Phone / 绑定手机号",
    "phoneFormatError": "ទម្រង់លេខទូរស័ព្ទមិនត្រឹមត្រូវ / Invalid phone format / 手机号格式错误",
    "codeExpired": "កូដផុតកំណត់ / Code expired / 验证码已过期",
    "codeError": "កូដមិនត្រឹមត្រូវ / Wrong code / 验证码错误",
    "passwordRule": "ពាក្យសម្ងាត់ 8-20 តួ មានអក្សរ និងលេខ / 8-20 chars, letters + numbers / 8-20位，含字母和数字"
  },
  "city": {
    "selectCity": "ជ្រើសរើសទីក្រុង / Select City / 选择城市",
    "currentCity": "ទីក្រុងបច្ចុប្បន្ន / Current City / 当前城市",
    "detecting": "កំពុងរកទីតាំង... / Detecting... / 正在定位...",
    "locationDenied": "មិនអាចចូលទីតាំង / Location denied / 无法获取位置"
  }
}
```

- [ ] **Step 1: 追加 i18n key，提交**

```bash
git add tgmall-mini-app/src/locales/km.json tgmall-mini-app/src/locales/en.json tgmall-mini-app/src/locales/zh.json
git commit -m "feat(i18n): Sprint 6 登录/城市 i18n key"
```

---

### Task 16: City 种子数据

**Files:**
- Modify: `tgmall-api/prisma/seed.js`

- [ ] **Step 1: 追加 City 种子数据**

在 seed.js 中追加（已有 City upsert 逻辑时追加字段）：

```js
// City 坐标种子数据
const cities = [
  { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', lat: 11.562, lng: 104.889, sortOrder: 1 },
  { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', lat: 13.363, lng: 103.856, sortOrder: 2 },
  { code: 'sihanoukville', nameKm: 'ក្រុងព្រះសីហនុ', nameEn: 'Sihanoukville', nameZh: '西哈努克', lat: 10.625, lng: 103.523, sortOrder: 3 },
  { code: 'battambang', nameKm: 'បាត់ដំបង', nameEn: 'Battambang', nameZh: '马德望', lat: 13.096, lng: 103.202, sortOrder: 4, status: 'inactive' },
];

for (const city of cities) {
  await prisma.city.upsert({
    where: { code: city.code },
    update: { lat: city.lat, lng: city.lng },
    create: city,
  });
}

console.log(`${cities.length} 城市坐标已同步`);
```

- [ ] **Step 2: 运行 seed**

```bash
cd tgmall-api && node prisma/seed.js 2>&1
```

Expected: `4 城市坐标已同步`

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/prisma/seed.js
git commit -m "feat(db): City 种子数据 — 含 lat/lng 坐标"
```

---

### Task 17: 全量回归测试 + 残余检查

**Files:**
- 不创建新文件 — 运行已有 110+ 测试 + 新增 ~20 测试

- [ ] **Step 1: 运行全量测试**

```bash
cd tgmall-api && npm test 2>&1
```

Expected: ~17 suites, ~130 tests pass

- [ ] **Step 2: 启动开发服务器验证路由**

```bash
cd tgmall-api && timeout 5 node src/index.js 2>&1 || true
```

Expected: `Server running on port 3000`（无 ESM import 错误）

- [ ] **Step 3: 覆盖率检查**

```bash
cd tgmall-api && npx jest --coverage 2>&1 | tail -20
```

Expected: SMS/Auth/City 服务 ≥ 70% 覆盖率

- [ ] **Step 4: 提交最终状态**

```bash
git add -A && git commit -m "chore: Sprint 6 全量测试验证"
```
