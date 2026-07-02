# CLAUDE.md — TG Mall 柬埔寨 Telegram 电商平台

## 项目概述

- **名称**：TG Mall — 柬埔寨 Telegram Mini App 电商平台
- **模式**：公司自营（无商家入驻，商品/订单/运营由平台统一管理）
- **技术栈**：Vue.js 3 + Vite · Node.js + Express + Prisma · PostgreSQL + Redis
- **部署**：Railway · CloudFlare CDN
- **目标用户**：柬埔寨 Telegram 消费者 + 平台运营团队
- **MVP**：浏览 → 加购 → 下单 → KHQR/ABA Pay/Wing Pay/COD 支付 → Bot 通知

## 双框架开发模式：gstack + Superpowers

本项目同时使用 gstack（流程引擎）和 Superpowers（编码纪律）。**gstack 管"做什么"，Superpowers 管"怎么做"。**

详细对比参见：`项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md` 第六章"双框架结合使用方案"。

### gstack 命令（流程层，手动触发）

| 阶段 | 命令 | 用途 |
|------|------|------|
| 思考 | `/office-hours` | 产品方向拷问，大功能前必用 |
| 规划 | `/autoplan`、`/plan-eng-review` | 一键规划流水线、架构审查 |
| 构建 | `/design-html` | 设计稿→生产级 HTML/CSS（已有设计稿时） |
| 审查 | `/review`、`/cso` | 代码审查、安全审计（支付相关必用） |
| 测试 | `/qa`、`/qa-only` | 真实浏览器端到端测试 |
| 发布 | `/ship`、`/land-and-deploy` | 发布 PR、部署验证 |
| 维护 | `/retro`、`/learn`、`/document-release` | 每周复盘、知识积累、文档更新 |

### Superpowers 纪律（编码层，自动触发）

- **brainstorming**：编码前需求细化
- **test-driven-development**：强制 RED-GREEN-REFACTOR
- **subagent-driven-development**：大任务拆分子代理隔离执行
- **verification-before-completion**：完成前自检验证

## 项目文档索引

所有文档在 `项目文档/` 目录下，编码前先查阅对应文档：

| 文档 | 路径 | 何时查阅 |
|------|------|----------|
| 产品需求文档 (PRD) | `项目文档/产品需求文档_PRD.md` | 理解功能需求、验收标准 |
| 用户故事清单 (Backlog) | `项目文档/用户故事清单_Backlog.md` | Sprint 计划、估点参考 |
| 需求优先级矩阵 | `项目文档/需求优先级矩阵_MoSCoW.md` | 需求裁剪、优先级决策 |
| 系统架构设计说明书 | `项目文档/系统架构设计说明书.md` | 技术选型、架构图、部署方案 |
| 数据库设计说明书 | `项目文档/数据库设计说明书.md` | ER 图、DDL、索引设计 |
| API 接口文档 | `项目文档/API接口文档.md` | 接口定义、请求响应格式、错误码 |
| 开发规范 | `项目文档/开发规范.md` | 代码风格、Git 规范、Code Review |
| 商业计划书 | `项目文档/柬埔寨 telegram 小程序商城商业计划书.docx` | 市场数据、商业模式、财务预测 |
| UI 设计稿 | `项目文档/ui-design/` | 页面 HTML + Design Tokens |
| 框架对比报告 | `项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md` | 双框架使用策略 |

## UI 设计系统速览

设计方向：**Modern Minimal (Linear/Vercel) × 柬埔寨金红文化配色**

```
--bg:      oklch(98.5% 0.003 95)   // 页面背景 #fafaf8
--surface: oklch(100% 0 0)          // 卡片 #ffffff
--fg:      oklch(20% 0.015 80)     // 主文字 #2d2b28
--muted:   oklch(50% 0.012 80)     // 辅助文字 #7a7670
--accent:  oklch(64% 0.16 82)      // 柬埔寨金 #c4932a
--accent-red: oklch(52% 0.20 24)   // 价格/促销 #c43a30
--font-khmer: 'Noto Sans Khmer'
--font-body: system-ui
布局: max-width 430px · 底部导航 64px · 商品双列网格 gap:12px · 最小触摸目标 44px
```

完整 Token 见 `项目文档/ui-design/design-tokens.md`。

## 编码纪律（Superpowers 风格，强制）

### 1. 测试驱动开发

- **RED**：先写失败测试 → **GREEN**：最小实现 → **REFACTOR**：优化
- 严禁在测试之前写实现代码。核心交易链路（订单/支付）覆盖率 ≥ 80%。

### 2. YAGNI + 任务粒度

- 不实现当前 Sprint 未规划的功能。重复出现 3 次才抽象。
- 每个微任务 2-5 分钟可完成，明确文件路径和验证方法。

### 3. 安全红线（和钱相关，绝对禁止触碰）

- 支付回调必须验签 + 幂等处理。库存必须 SELECT FOR UPDATE + 事务。
- 用户输入永不做 SQL/HTML 拼接。所有敏感数据（手机号）加密存储。
- 涉及支付/用户数据的代码变更 → 必须运行 `/cso`。

### 4. 柬埔寨本地化

- 所有用户界面必须三语支持（高棉语/英语/中文），默认高棉语。
- 所有价格必须 USD/KHR 双币种同时显示。手机号 +855 格式校验。
- 弱网环境适配：图片 WebP + CDN + 懒加载，首屏 < 3 秒（4G），< 5 秒（3G）。

## 开发路线图

> 完整路线图：`docs/superpowers/plans/2026-07-02-tg-mall-development-roadmap.md`

| Sprint | 目标 | 核心交付 | 工期 |
|--------|------|---------|------|
| **Sprint 4 续** ✅ | Mini App 运营配置落地 | Banner/品类/城市/配送规则动态加载 + 客服入口 | ~1 周（已完成） |
| **Sprint 5** | 支付闭环 + 库存管理后台 | ABA Pay / Wing Pay 真实对接、库存预警/调整/日志、清理 V1 商户代码 | ~2 周 |
| **Sprint 6** | 手机号登录 + 城市体验 | 短信验证码、手机号/密码登录、定位授权、城市切换联动 | ~2 周 |
| **Sprint 7** | 运营体验增强 | 商品标签、收藏、优惠券后台、客服反馈工单 | ~2 周 |
| **Sprint 8** | Alpha 打磨与上线 | 三语验收、弱网测试、性能压测、安全扫描、集成测试 | ~2 周 |

**原则**：先补齐 P0 验收缺口 → 再补 P1 体验 → P2 功能本期冻结。每 Sprint 产出可 Demo。

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
