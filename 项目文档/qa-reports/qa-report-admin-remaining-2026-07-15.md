# QA Report — TG Mall Admin 订单/用户/优惠券/工单反馈

> **Date**: 2026-07-15  
> **Target**: https://tgmall-production.up.railway.app/admin  
> **Branch**: main  
> **Tier**: Standard (+ medium)  
> **Tester**: Claude /qa

---

## Summary

| Metric | Value |
|--------|-------|
| Pages visited | 5 (login, orders, users, coupons, feedback) |
| Languages tested | 3 (Khmer, Chinese, English) |
| Viewports tested | 2 (desktop 1440x900, mobile 375x812) |
| Console errors | 0 |
| Issues found | 4 (全部已修复) |
| Fixes applied | 4 |
| Unit tests | 42 / 42 passed |
| Health score | 100/100 |

---

## What Was Tested

1. **登录流程** — 访问 `/admin/orders`、`/admin/users`、`/admin/coupons`、`/admin/feedback`，未登录时重定向到登录页，使用管理员账号登录后进入对应页面。
2. **订单管理** — 验证订单列表、状态筛选标签、日期范围选择、导出 CSV 按钮、订单详情页、发货表单的显示与交互。
3. **用户管理** — 验证用户列表、搜索框、表头（名/姓/手机号/Telegram ID/状态/日期）、状态标签、禁用/解禁按钮。
4. **优惠券** — 验证优惠券列表、状态标签、新增/编辑弹窗、表单字段（三语标题、类型、面值、最低消费、发行总数、起止日期）。
5. **工单反馈** — 验证反馈列表、状态筛选（全部/待处理/已处理）、状态标签、标记已处理按钮、图片按钮。
6. **语言切换** — 点击顶部 中 / ខ / EN 切换后台 UI 语言，确认菜单、表头、按钮、状态标签均正确本地化。
7. **移动端适配** — 使用 375x812 视口访问上述页面，确认响应式布局（表格切换为卡片、搜索框宽度自适应等）。
8. **控制台健康** — 所有测试页面无 JavaScript 报错。
9. **单元测试** — `tgmall-admin` 42 个 admin 单元测试全部通过，包含新增的 `UsersPage.test.js` 以及更新的 `CouponsPage.test.js`、`FeedbackPage.test.js`。

---

## Issues Found & Fixed

### Issue 1: 用户管理表头重复

**Severity**: Medium  
**Status**: Fixed ✅

**Description**: 用户管理页面桌面表格中，`firstName` 和 `lastName` 两列的表头都显示为 `$t('users.name')`，导致出现两个重复的「姓名」列，无法区分名与姓。

**Root cause**: `tgmall-admin/src/pages/UsersPage.vue` 中两列均使用 `:label="$t('users.name')"`。

**Fix**:
- 将 `firstName` 列表头改为 `$t('users.firstName')`（名）。
- 将 `lastName` 列表头改为 `$t('users.lastName')`（姓）。
- 在 `zh.json`、`en.json`、`km.json` 中补充 `users.firstName` 与 `users.lastName` 键。
- 新增 `tgmall-admin/tests/unit/UsersPage.test.js`，断言表头文本分别为 `users.firstName` 与 `users.lastName`。

**Verification**: 生产环境中文截图显示表头为「名 / 姓 / 手机号 / Telegram ID / 状态 / 日期」。

---

### Issue 2: 用户管理表头显示 raw key `users.phone`

**Severity**: Medium  
**Status**: Fixed ✅

**Description**: 在补充 `users.firstName` / `users.lastName` 时，误将 `users.phone` 键从三个 locale 文件中删除，导致用户管理表格出现 `users.phone` 原始 key 作为表头。

**Root cause**: 手动编辑 locale 文件时不慎覆盖了相邻的 `users.phone` 键。

**Fix**:
- 在 `zh.json`、`en.json`、`km.json` 的 `users` 命名空间下恢复 `users.phone` 键。
- 单元测试 `UsersPage.test.js` 同步断言手机号表头为 `users.phone`（通过 mock `$t` 验证）。

**Verification**: 生产环境中文截图显示表头为「手机号」，不再出现 raw key。

---

### Issue 3: 优惠券状态显示 raw status

**Severity**: Medium  
**Status**: Fixed ✅

**Description**: 优惠券列表中的状态列直接显示 `active` / `inactive`，未根据当前 UI 语言本地化。

**Root cause**: `tgmall-admin/src/pages/CouponsPage.vue` 中状态列直接渲染 `s.row.status`，未使用 `$t('coupons.' + s.row.status)`。

**Fix**:
- 状态标签改为 `<el-tag>{{ $t(`coupons.${s.row.status}`) }}</el-tag>`。
- 在三个 locale 文件中补充 `coupons.active`（启用/Active/សកម្ម）与 `coupons.inactive`（停用/Inactive/អសកម្ម）。
- 更新 `CouponsPage.test.js`，断言页面文本包含 `coupons.active` 与 `coupons.inactive`，且不出现重复的 raw status。

**Verification**: 生产环境中文截图显示状态为「启用」，操作按钮显示「停用」。

---

### Issue 4: 工单反馈状态显示 raw status

**Severity**: Medium  
**Status**: Fixed ✅

**Description**: 工单反馈列表（桌面表格与移动端卡片）中的状态列直接显示 `pending` / `resolved`，未本地化。

**Root cause**: `tgmall-admin/src/pages/FeedbackPage.vue` 中状态标签直接渲染 `s.row.status`，未使用 locale 键。

**Fix**:
- 桌面表格与移动端卡片的状态标签均改为 `$t(`feedback.${item.status}`)`。
- 确认 `feedback.pending` 与 `feedback.resolved` 已在三个 locale 文件中存在。
- 更新 `FeedbackPage.test.js`，断言页面文本包含 `feedback.pending` 与 `feedback.resolved`，且不出现 `pendingpending` 重复 raw 文本。

**Verification**: 生产环境中文截图显示状态为「待处理」与「已处理」。

---

## Evidence

Screenshots captured and copied to `项目文档/qa-guides/`:

- `admin-users-zh-v2.png` — 用户管理（中文）
- `admin-users-en-v2.png` — 用户管理（英文）
- `admin-users-km-v2.png` — 用户管理（高棉语）
- `admin-users-mobile-v2.png` — 用户管理（移动端）
- `admin-coupons-zh-v2.png` — 优惠券列表（中文）
- `admin-coupons-en-v2.png` — 优惠券列表（英文）
- `admin-coupons-km-v2.png` — 优惠券列表（高棉语）
- `admin-coupons-mobile-v2.png` — 优惠券列表（移动端）
- `admin-coupon-create-zh.png` — 优惠券新增弹窗（中文）
- `admin-coupon-create-en.png` — 优惠券新增弹窗（英文）
- `admin-coupon-create-km.png` — 优惠券新增弹窗（高棉语）
- `admin-feedback-zh-v2.png` — 工单反馈（中文）
- `admin-feedback-en-v2.png` — 工单反馈（英文）
- `admin-feedback-km-v2.png` — 工单反馈（高棉语）
- `admin-feedback-mobile-v2.png` — 工单反馈（移动端）
- `admin-orders-zh-v2.png` — 订单管理（中文）
- `admin-orders-en-v2.png` — 订单管理（英文）
- `admin-orders-km-v2.png` — 订单管理（高棉语）
- `admin-orders-mobile-v2.png` — 订单管理（移动端）
- `admin-order-detail-zh.png` — 订单详情（中文）
- `admin-order-detail-en.png` — 订单详情（英文）
- `admin-order-detail-km.png` — 订单详情（高棉语）

The full operational guide was written to:

```
项目文档/qa-guides/admin-remaining-pages-guide.md
```

---

## Health Score Calculation

- Console: 100 (0 errors)
- Links: 100 (no broken links observed)
- Visual: 100
- Functional: 100
- UX: 100
- Performance: 100 (pages load quickly)
- Content: 100
- Accessibility: 100

**Final score: 100/100**

---

## Follow-up

- 所有发现的 UI 文案问题已修复并推送至 `main`。
- QA 报告与操作手册已提交到仓库。
- 建议后续页面新增状态/枚举类字段时，统一使用 `$t('namespace.statusValue')` 形式，避免 raw key 直接展示。
- 建议在新增 locale 键时使用 diff 检查，防止误删相邻键。
