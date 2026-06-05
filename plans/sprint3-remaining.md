# Sprint 3 剩余工作规划

## 项目：TG Mall — 柬埔寨 Telegram Mini App 社交电商平台
## 当前日期：2026-06-05
## 当前状态：Sprint 3 核心支付功能已完成，Bot 通知系统缺失
## 分支：main

---

## 目标

完成 Sprint 3 剩余全部工作，实现完整交易闭环：
- 用户下单 → 支付 → Bot 通知 → 商家发货 → 用户确认 → Bot 通知
- 商家入驻审核通知
- 运营后台 / 商家后台前端基础功能

---

## 已完成的 Sprint 3 工作

| Story | 状态 | 说明 |
|-------|------|------|
| S3-01 ~ S3-06（支付系统） | ✅ | KHQR/ABA Pay/Wing Pay/COD 已实现 |
| S3-11（商家发货） | ✅ | shipOrder API 已实现 |
| S3-12（确认收货） | ✅ | confirmOrder API 已实现 |
| S3-16（商家审核 API） | ✅ | approve/reject API 已实现 |
| S3-17（商家登录） | ✅ | merchantLogin 已实现 |

---

## 剩余工作

### Phase 1：Bot 通知系统（P0 · Must Have）

#### 1.1 S3-07 — Telegram Bot 通知基础框架（5 点）

**范围**：后端通知基础设施

**任务：**
- `tgmall-api/src/integrations/telegram.js` — 扩展为完整 Bot 消息发送模块
  - `sendMessage(telegramId, text, options)` — 基础消息发送
  - `sendOrderNotification(user, order, type)` — 订单通知（消费者）
  - `sendMerchantOrderNotification(merchant, order, type)` — 商家订单通知
  - `sendAuditNotification(merchant, status, reason)` — 审核结果通知
- 消息模板引擎（Handlebars 或简单字符串替换）
  - 三语模板：`km`（默认）、`en`、`zh`
  - 模板目录：`tgmall-api/src/templates/notifications/`
- 异步发送（BullMQ）
  - 安装 bullmq 依赖
  - 创建 `tgmall-api/src/queues/notification.queue.js`
  - 消息队列消费者，不阻塞 API 响应
- 失败重试机制
  - 重试 3 次（间隔 10s, 30s, 60s）
  - 死信队列（Dead Letter Queue）
- 消息记录表（Prisma migration）
  - `notifications` 表：id, userId, type, content, status, createdAt
- 频率控制
  - 同一用户同一类型 1 分钟内最多 1 条

**验收标准：**
- AC1-AC6 全部通过

**文件变更预估：**
- 修改：`telegram.js`, `database.js`（如果添加新表）
- 新增：4 个文件（queue, templates, migration, notification.service.js）
- 总计：~6 个文件

---

#### 1.2 S3-08 — Bot 通知：消费者订单通知（3 点）

**触发点集成：**
- `order.service.js:createOrder` — 下单成功后发送"订单已创建"通知
- `payment.service.js:handlePaymentCallback` — 支付成功后发送"支付成功"通知
- `merchant.service.js:shipOrder` — 发货后发送"已发货"通知（已有异步调用 sendShippedNotification，需替换为统一框架）

**消息模板（三语）：**
```
// 下单成功（km）
🛒 ការបញ្ជាទិញបានបង្កើត!
លេខកម្មង: {orderNumber}
ចំនួនទឹកប្រាក់: ${totalUsd}
សូមបង់ប្រាក់ក្នុងរយៈពេល 15 នាទី

// 支付成功（km）
✅ ការទូទាត់បានជោគជ័យ!
លេខកម្មង: {orderNumber}
ចំនួនទឹកប្រាក់: ${totalUsd}
ហាងនឹងដឹកជញ្ជូនឆាប់ៗនេះ

// 已发货（km）
📦 ការដឹកជញ្ជូនបានចាប់ផ្តើម!
លេខកម្មង: {orderNumber}
ក្រុមហ៊ុនដឹកជញ្ជូន: {logistics}
លេខតាមដាន: {trackingNumber}
```

---

#### 1.3 S3-09 — Bot 通知：商家订单通知（3 点）

**触发点集成：**
- `order.service.js:createOrder` — 新订单生成后通知商家
- `payment.service.js:handlePaymentCallback` — 支付成功后通知商家

**消息模板（三语）：**
```
// 新订单（km）
🔔 មានការបញ្ជាទិញថ្មី!
លេខកម្មង: {orderNumber}
ទំនិញ: {productName} × {quantity}
ចំនួនទឹកប្រាក់: ${totalUsd}

// 已付款（km）
💰 អ្នកទិញបានបង់ប្រាក់រួច!
លេខកម្មង: {orderNumber}
ចំនួនទឹកប្រាក់: ${totalUsd}
សូមរៀបចំដឹកជញ្ជូនឱ្យបានឆាប់
```

---

#### 1.4 S3-10 — Bot 通知：审核结果通知（2 点）

**触发点集成：**
- `merchant.service.js:approveMerchant` — 审核通过后通知商家
- `merchant.service.js:rejectMerchant` — 审核驳回后通知商家（含原因）

---

### Phase 2：优惠券优化（P1 · Should Have）

#### 2.1 S3-14 — 下单时自动应用最优优惠券（3 点）

**范围**：下单时自动匹配最优优惠券

**任务：**
- 在 `createOrder` 中，当 `coupon_id` 为空时，自动查找用户可用的最优优惠券
- "最优"定义：满足最低消费门槛的前提下，折扣金额最大的优惠券
- 如果有多张可用，按 `type === 'fixed'` 优先（固定金额 > 百分比）

---

### Phase 3：运营/商家后台前端（P1 · Should Have）

#### 3.1 S3-15 — 商家入驻审核 — 运营后台前端（5 点）

**范围**：平台运营人员使用的商家审核 Web 后台

**页面：**
- 商家列表页（审核中 / 已通过 / 已驳回筛选）
- 商家详情页（查看申请资料）
- 审核操作（通过/驳回弹窗）

**技术栈**：Vue 3 + Vite（复用 tgmall-miniapp 的组件库）

---

#### 3.2 S3-18 — 商家后台商品管理 — 前端（5 点）

**范围**：商家使用的 Web 后台

**页面：**
- 商家登录页（Telegram Login）
- 商品列表页
- 商品上架/编辑表单
- 订单列表页
- 订单详情页（含发货操作）

---

### Phase 4：测试（P2 · Could Have）

#### 4.1 S3-19 — Sprint 3 前端单元测试（5 点）

**范围**：支付流程和通知相关的前端测试

---

## 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Telegram Bot API 速率限制（30 msg/s） | 通知延迟或失败 | 使用消息队列异步发送 + 重试 |
| BullMQ 需要 Redis | 新增基础设施依赖 | 复用现有 Redis 实例 |
| 消息模板三语翻译 | 翻译质量 | 先用高棉语，英语/中文次之 |
| 运营/商家后台前端工作量大 | 延期到 Sprint 4 | 先完成后端核心，前端可降级 |

---

## 执行顺序

```
Day 1-2: Phase 1.1 — Bot 通知基础框架
Day 3:   Phase 1.2 — 消费者订单通知集成
Day 4:   Phase 1.3 — 商家订单通知集成
Day 5:   Phase 1.4 — 审核结果通知 + Phase 2（自动应用优惠券）
Day 6-8: Phase 3（运营/商家后台前端）— 可选，可延期到 Sprint 4
Day 9-10: Phase 4（测试）+ 集成测试 + Bug 修复
```

---

## 工作量估算

| Phase | 估点 | 人天（后端） | 人天（前端） |
|-------|------|-------------|-------------|
| 1.1 Bot 基础框架 | 5 | 1.5 | — |
| 1.2 消费者通知 | 3 | 0.5 | — |
| 1.3 商家通知 | 3 | 0.5 | — |
| 1.4 审核通知 | 2 | 0.5 | — |
| 2.1 自动优惠券 | 3 | 0.5 | — |
| 3.1 运营后台 | 5 | — | 2 |
| 3.2 商家后台 | 5 | — | 2 |
| 4.1 测试 | 5 | — | 1.5 |
| **合计** | **31** | **3.5** | **5.5** |

---

## 产出物

- [ ] Bot 通知框架（含队列、模板、重试、频率控制）
- [ ] 3 类订单通知集成（消费者下单/支付/发货，商家新单/付款）
- [ ] 审核结果通知集成
- [ ] 自动最优优惠券匹配
- [ ] 运营后台前端（商家审核）
- [ ] 商家后台前端（商品管理、订单管理）
- [ ] 前端单元测试（支付 + 通知）
- [ ] Sprint 3 集成测试报告

---

## 不涉及的内容（NOT in scope）

- 商家后台数据看板（Sprint 4）
- 平台运营大盘（Sprint 4）
- 营销推送/广播通知（Sprint 4）
- 物流追踪集成（Sprint 4）
- 多语言翻译服务优化（Sprint 4）

---

*Plan created: 2026-06-05*
*Target: Complete by 2026-06-15*
