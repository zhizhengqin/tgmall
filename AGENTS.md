# AGENTS.md — TG Mall 项目

## 项目速览

柬埔寨 Telegram Mini App 电商平台。Vue.js 3 + Node.js/Express + PostgreSQL 15。三语（高棉/英/中）+ USD/KHR 双币种。MVP 目标：核心交易闭环。

完整项目上下文见 `CLAUDE.md`，产品需求见 `项目文档/产品需求文档_PRD.md`。

## 框架配置

本项目使用 **gstack** 和 **Superpowers** 双框架。gstack 管流程，Superpowers 管纪律。详见 `项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md`。

### 编码任务（gstack 命令调用规范）
```
# 大功能（>2h）→ 先思考再规划再编码
/office-hours → /autoplan → 编码 → /review → /qa → /ship

# 小功能/修Bug（<1h）→ 直接编码+审查
编码 → /review

# UI 相关 → 加设计审查
... → /design-review → ...

# 支付/安全相关 → 必须加安全审计
... → /cso → ...

# 发布
/ship → /land-and-deploy
```

### 各阶段命令速查
- **产品探索**：`/office-hours`（功能前必用）
- **架构规划**：`/plan-eng-review`（新模块前）、`/autoplan`（一键全流程）
- **设计→代码**：`/design-html`（已有 `项目文档/ui-design/` 中的 HTML 设计稿）
- **代码审查**：`/review`（每个功能完成后）、`/cso`（支付/安全必用）
- **端到端测试**：`/qa`（有 UI 时必用）
- **发布部署**：`/ship` → `/land-and-deploy`
- **文档同步**：`/document-release`（发布后自动更新）
- **每周复盘**：`/retro`

### 简单任务（无需 gstack）
改错别字、更新 README、单行 Bug 修复、纯文档变更 → 直接使用 Claude Code 原生能力。

## 安全决策门禁

| 涉及范围 | 必须执行 | 说明 |
|----------|----------|------|
| 支付相关代码 | `/cso` | KHQR/ABA Pay/Wing Pay/回调 |
| 用户敏感数据 | `/cso` | 手机号加密、Token 鉴权 |
| 订单/库存逻辑 | `/review` + TDD | 防超卖、事务完整性 |
| 商家审核/权限 | `/review` | RBAC 角色校验 |
| 任何生产部署 | `/ship` 全流程 | 测试→覆盖率→PR |

## 关键文档入口

- 产品需求：`项目文档/产品需求文档_PRD.md`
- API 定义：`项目文档/API接口文档.md`
- 数据库设计：`项目文档/数据库设计说明书.md`
- 架构设计：`项目文档/系统架构设计说明书.md`
- 开发规范：`项目文档/开发规范.md`
- UI 设计：`项目文档/ui-design/design-tokens.md` + `项目文档/ui-design/pages/`
- 框架策略：`项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md`

## 柬埔寨本地化三原则

1. **所有 UI 文案三语** — 高棉语（默认）/ 英语 / 中文，禁止混排
2. **所有价格双币种** — USD（大字）+ KHR（小字灰色），汇率每日同步
3. **弱网适配** — WebP + CDN + 懒加载，3G 网络下首页 < 5 秒
