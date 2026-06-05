# QA 测试报告 — Sprint 3 支付系统

**测试日期**: 2026/06/05  
**测试范围**: 后端 API（订单、支付、商家）  
**测试方式**: 代码静态审查  

---

## 总结

| 指标 | 结果 |
|------|------|
| 发现 Issue | 2 个 |
| 严重级别 | 0 个 High，2 个 Medium |
| 修复状态 | **全部已修复** |

---

## 修复状态

| Issue | 状态 | 修复说明 |
|-------|------|----------|
| ISSUE-005 | **已修复** | `payment.service.js:36` 错误码 `ORDER_CANNOT_CANCEL` → `ORDER_NOT_PAYABLE` |
| ISSUE-006 | **已修复** | 新增 `GET /merchants/orders/:id` 接口，含控制器、服务方法、路由 |

---

## Issue 清单（已修复）

### [ISSUE-005] 支付服务错误码命名不当

- **位置**: `tgmall-api/src/services/payment.service.js:36`
- **严重级别**: Medium
- **状态**: 已修复
- **描述**: 当订单状态不是 `pending_payment` 时，抛出的错误码为 `ORDER_CANNOT_CANCEL`，语义与错误描述"订单状态不支持支付"不符。
- **修复**: 将 `ORDER_CANNOT_CANCEL` 改为 `ORDER_NOT_PAYABLE`。

---

### [ISSUE-006] 商家端缺少订单详情接口

- **位置**: `tgmall-api/src/routes/merchant.routes.js`
- **严重级别**: Medium
- **状态**: 已修复
- **描述**: 商家路由中缺少获取单个订单详情的接口。当前只有：
  - `GET /merchants/orders` — 订单列表
  - `POST /merchants/orders/:id/ship` — 确认发货
  但没有 `GET /merchants/orders/:id` 来查看单个订单详情。
- **修复**: 新增商家订单详情接口：
  1. `merchant.routes.js` 添加 `GET /orders/:id`
  2. `merchant.controller.js` 添加 `getOrder` 控制器
  3. `merchant.service.js` 添加 `getOrderDetail` 服务方法（校验订单归属商家，返回完整订单信息含商品明细、收货地址、客户信息、全时间戳）

---

## 已验证通过的项目

| 检查项 | 结果 |
|--------|------|
| `completedAt` 存在于 Prisma Schema | ✅ |
| 订单取消恢复库存（事务内） | ✅ |
| 订单取消退还优惠券（事务内） | ✅ |
| 商家发货更新 `shippedAt` | ✅ |
| 订单过期任务使用 `paymentTimeout` 字段 | ✅ |
| 商家鉴权中间件校验 active 状态 | ✅ |
| 管理员鉴权白名单配置 | ✅ |
| 支付回调 Schema 字段校验 | ✅ |

---

## 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `tgmall-api/src/services/payment.service.js` | 修改 | 第36行错误码 `ORDER_CANNOT_CANCEL` → `ORDER_NOT_PAYABLE` |
| `tgmall-api/src/services/merchant.service.js` | 新增 | 添加 `getOrderDetail` 方法 |
| `tgmall-api/src/controllers/merchant.controller.js` | 新增 | 添加 `getOrder` 控制器 |
| `tgmall-api/src/routes/merchant.routes.js` | 新增 | 添加 `GET /orders/:id` 路由 |

---

*报告已更新，两个 issue 全部修复完毕。*
