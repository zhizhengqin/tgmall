# Sprint 5 — 测试补充 + 代码质量 + 生产就绪

**日期**：2026-06-06
**估点**：40 点
**目标**：补齐测试覆盖率至 30%+，完成 MVP 发布前最后的质量冲刺

---

## 一、背景

Sprint 1-4 完成了交易闭环全部功能代码（下单→支付→Bot通知→商家后台→运营后台）。但测试覆盖率仅 ~5%，137 条计划用例中 127 条未执行。

Sprint 5 聚焦于**测试补充 + 代码质量**，目标是让 TG Mall 达到 MVP 发布标准。

---

## 二、核心工作

### Phase 1: 测试基础设施（P0，5 点）

| 任务 | 说明 |
|------|------|
| Jest mock 模块导入 | 让 `src/` 文件可在测试中被正确导入 |
| 前端 Vitest 搭建 | `tgmall-merchant` + `tgmall-admin` 安装 Vitest + Vue Test Utils |
| Mock 工厂扩展 | 补充 `mockUser()`、`mockOrder()`、`mockProduct()` 工厂函数 |

### Phase 2: 后端单元测试（P0，15 点）

| 模块 | 新增测试 | 目标覆盖 |
|------|----------|----------|
| `order.service.js` | TC-O-001~022 (19 条) | 60% |
| `payment.service.js` | TC-P-001~015 (13 条) | 60% |
| `notification.service.js` | TC-N-001~011 (8 条) | 40% |
| `merchant.service.js` | TC-M-001~016 (12 条) | 40% |
| `admin.service.js` | TC-A-001~004 (4 条) | 30% |

### Phase 3: 前端测试（P1，8 点）

| 项目 | 新增测试 | 说明 |
|------|----------|------|
| tgmall-merchant | TC-F-001~017 (15 条) | 登录/看板/商品/订单/路由守卫 |
| tgmall-admin | TC-F-018~023 (5 条) | 登录/大盘/审核/用户 |

### Phase 4: 安全测试 + 集成测试（P1-P2，12 点）

| 类型 | 用例数 | 说明 |
|------|--------|------|
| 安全测试 | TC-S-001~013 (13 条) | CSO 回归 + OWASP |
| 集成测试 | TC-I-001~015 (12 条) | API 端点 |
| E2E 测试 | TC-E-001~003 (3 条) | Playwright 核心流程 |

---

## 三、执行顺序

```
Day 1-2: Phase 1 测试基础设施
Day 3-5: Phase 2 后端单元测试
Day 6-7: Phase 3 前端测试
Day 8-9: Phase 4 安全 + 集成测试
Day 10:   Sprint 5 回顾 + 覆盖率报告
```

---

## 四、不涉及的内容

- 新功能开发（Sprint 6）
- 生产部署自动化（已含 docker-compose）
- 营销推送 / AI 推荐 / 物流集成
