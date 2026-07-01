# 项目文档商家概念移除实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 TG Mall 项目所有文档中残留的“商家入驻/多商户/merchant/seller/vendor/shop”概念统一改为“公司自营/平台运营/admin”模式表述，确保文档与 V2 架构一致。

**Architecture:** 按文档分组处理：核心产品/架构/Backlog 文档优先，部署/API/数据库次之，测试/UI/运营手册最后；所有修改保留高棉语/英语/中文三语一致性，统一替换为公司自营术语。

**Tech Stack:** Markdown / HTML / docx 文档编辑；grep 全局校验；git diff 复核。

## Global Constraints

- 所有用户界面描述必须保持三语支持（高棉语/英语/中文），默认高棉语。
- 价格描述必须 USD/KHR 双币种同时显示。
- 不再新增任何商家入驻、商家审核、商家后台、多租户相关功能描述。
- 公司自营模式下：商品/订单/优惠券统一归平台所有；仅保留“管理员 Web 后台”和“消费者 Mini App”两端。
- 文档中已有的 V2 变更说明（如系统架构设计说明书顶部）需保留并同步到其它文档。

---

## File Inventory

本次需检查和修改的文档位于 `/Users/qinzz/Desktop/telegrammall/项目文档/`：

| 分组 | 文件 | 备注 |
|------|------|------|
| 核心产品 | `产品需求文档_PRD.md` | 标题已是 V2，需检查内部残留 |
| 核心架构 | `系统架构设计说明书.md` | 顶部有 V2 说明，正文大量商家相关 |
| Backlog | `用户故事清单_Backlog.md` | EPIC-05/07/ Sprint 4 商家相关 |
| API | `API接口文档.md` | merchant 接口需改为 admin |
| 数据库 | `数据库设计说明书.md` | merchant 表/字段 |
| 部署 | `Railway部署实施方案.md` | /merchant 路由、商家后台 |
| 优先级 | `需求优先级矩阵_MoSCoW.md` | 商家相关条目 |
| 测试 | `测试计划.md`、`测试用例集.md`、`测试执行报告_2026-06-06.md` | 商家后台测试用例 |
| 用户/运营手册 | `用户操作手册.md` | 若含商家内容 |
| 商业计划 | `柬埔寨 telegram 小程序商城商业计划书.docx` | 商家入驻商业模式 |
| 框架对比 | `Claude_Code_框架对比报告_Superpowers_vs_gstack.md` | 可能含商家示例 |
| 新手册 | `软件工程小白通关手册_柬埔寨Telegram电商平台.md` | 可能含商家说明 |
| UI 设计 | `ui-design/pages/*.html`、`ui-design/merchant/*`、`ui-design/admin/*`、`ui-design/README.md` | 商家页面/组件 |

---

## Task 1: 全局关键词扫描与变更词表建立

**Files:**
- Read: `项目文档/` 下全部文件
- Create: `docs/superpowers/plans/2026-07-01-merchant-to-self-operated-keywords.md`（临时词表，可选）

**Interfaces:**
- Consumes: 原始文档内容
- Produces: 统一替换词表 + 各文件命中列表

- [ ] **Step 1: 执行全局 grep 扫描**

Run:
```bash
grep -RinE "商家|入驻|merchant|seller|vendor|shop|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档" | grep -v "\.DS_Store" | grep -v "images/"
```

Expected: 输出所有命中行，保存到临时文件供后续核对。

- [ ] **Step 2: 建立统一替换词表**

| 旧表述 | 新表述 | 说明 |
|--------|--------|------|
| 商家入驻 | （删除/改为）公司自营 | 不再开放入驻 |
| 商家后台 | 管理员后台 / 运营后台 | 统一由公司运营使用 |
| 商家端 | 平台端 / 运营端 | 无独立商家端 |
| 商家审核 | （删除） | 公司自营无需审核 |
| 商家表 merchants | 平台店铺配置表 shop_config（可选） | 若需保留单一店铺概念 |
| merchant_id / merchantId | 删除或改为 shop_id（如保留单一店铺） | 公司自营下订单/商品不再关联商家 |
| /merchant/* 路由 | /admin/* | 统一为管理后台 |
| tgmall-merchant | tgmall-admin | 前端项目名 |
| merchant.xxx.kh | admin.xxx.kh | 域名 |
| 商家多租户 | 公司自营 | 架构决策变更 |
| seller / vendor | admin / platform | 英文术语 |
| 店铺二维码 | 平台推广二维码 | 若有 |
| 不同商家不同二维码 | （删除） | 自营无此需求 |

- [ ] **Step 3: Commit 词表与扫描结果**

```bash
git add docs/superpowers/plans/2026-07-01-merchant-to-self-operated-keywords.md
git commit -m "docs(plan): 建立商家概念移除统一词表"
```

---

## Task 2: 核心产品文档 PRD 复核与修正

**Files:**
- Modify: `项目文档/产品需求文档_PRD.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的 PRD V2.0

- [ ] **Step 1: 通读 PRD 全文，标记残留商家表述**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/产品需求文档_PRD.md"
```

Expected: 输出所有命中行。若为零，记录“PRD 无残留”。

- [ ] **Step 2: 逐处替换或删除商家相关描述**

对每一处命中：
- 若描述“商家入驻/审核/多租户” → 删除或改为“公司自营”。
- 若描述“商家后台” → 改为“管理员后台/运营后台”。
- 若描述“商家商品/订单” → 改为“平台商品/订单”。

- [ ] **Step 3: 验证 PRD 无残留**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/产品需求文档_PRD.md"
```

Expected: 无任何命中（允许的例外：历史变更说明中的“V1.0 多商户平台 → V2.0 公司自营模式”）。

- [ ] **Step 4: Commit**

```bash
git add "项目文档/产品需求文档_PRD.md"
git commit -m "docs(prd): 移除 PRD 中残留的商家入驻概念，统一为公司自营"
```

---

## Task 3: 系统架构设计说明书商家概念移除

**Files:**
- Modify: `项目文档/系统架构设计说明书.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的架构文档

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/系统架构设计说明书.md"
```

Expected: 输出大量命中行。

- [ ] **Step 2: 修改架构愿景与规模指标**

将“10 万用户 + 500 商家 + 日均 500 单”改为“10 万用户 + 日均 500 单（公司自营）”。

- [ ] **Step 3: 修改系统全景架构图文字**

将架构图中的“商家 Web 后台 / 商家端 / 商家审核 / 商品管理”等改为“管理员 Web 后台 / 平台端 / 商品管理 / 订单管理”。

- [ ] **Step 4: 修改前端项目结构**

- 删除 `tgmall-merchant/` 项目。
- 将 `MerchantReview.vue`、`MerchantList.vue` 改为 `ShopConfig.vue` 或删除。
- 统一为 `tgmall-admin/`。

- [ ] **Step 5: 修改后端路由与代码示例**

- `/api/v1/merchants/*` → 删除或改为 `/api/v1/admin/products`、`/api/v1/admin/orders`。
- `merchant.routes.js`、`merchant.controller.js`、`merchant.service.js` → 改为 `admin/product.routes.js` 等或删除。
- `merchantAuth.js` → 删除，统一使用 `adminAuth.js`。

- [ ] **Step 6: 修改数据库设计章节**

- `merchants` 表：删除或改为单条平台配置记录（shop_config）。
- `products.merchant_id`、`orders.merchant_id`、`coupons.merchant_id` 外键：删除。
- Prisma schema 中 `Merchant` model：删除。
- 索引 `idx_products_merchant`、`idx_orders_merchant`：删除。

- [ ] **Step 7: 修改 API 接口汇总表**

删除 `Merchants` 分组；将 `/merchants/register`、merchant dashboard 等接口改为 `/admin/dashboard`、`/admin/products` 等。

- [ ] **Step 8: 修改部署域名**

`merchant.xxx.kh` → `admin.xxx.kh`。

- [ ] **Step 9: 验证无残留**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/系统架构设计说明书.md"
```

Expected: 无命中（允许的例外：V2 变更说明中的历史对比）。

- [ ] **Step 10: Commit**

```bash
git add "项目文档/系统架构设计说明书.md"
git commit -m "docs(arch): 架构设计说明书统一为公司自营模式，移除商家多租户"
```

---

## Task 4: 用户故事清单 Backlog 修正

**Files:**
- Modify: `项目文档/用户故事清单_Backlog.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的 Backlog

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/用户故事清单_Backlog.md"
```

Expected: 输出命中行。

- [ ] **Step 2: 更新 Epic 总览**

- EPIC-05 “商家系统” → 删除或改为“平台商品与订单管理”。
- EPIC-07 “平台运营” 中“商家审核” → 删除。
- 调整故事数/点数。

- [ ] **Step 3: 移除 Sprint 4 商家入驻章节**

将“Sprint 4：商家入驻与完善（第 11 周）”改为“Sprint 4：平台运营完善（第 11 周）”，移除入驻/审核相关 story。

- [ ] **Step 4: 修正所有 Story 中的角色与验收标准**

- 角色“商家申请人” → 删除。
- 角色“商家” → 改为“管理员/运营人员”。
- `merchant_id` 字段 → 删除。
- 商品卡片中的“商家名称” → 删除或改为“平台名称”。

- [ ] **Step 5: 验证无残留**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/用户故事清单_Backlog.md"
```

Expected: 无命中。

- [ ] **Step 6: Commit**

```bash
git add "项目文档/用户故事清单_Backlog.md"
git commit -m "docs(backlog): Backlog 统一为公司自营，移除商家入驻 Epic 与 Story"
```

---

## Task 5: API 接口文档修正

**Files:**
- Modify: `项目文档/API接口文档.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的 API 文档

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/API接口文档.md"
```

Expected: 输出命中行。

- [ ] **Step 2: 删除或重命名 merchant 接口分组**

- `POST /merchants/register` → 删除。
- `/merchants/dashboard` → `/admin/dashboard`。
- `/merchants/products` → `/admin/products`。
- `/merchants/orders` → `/admin/orders`。
- `/merchants/orders/{id}/ship` → `/admin/orders/{id}/ship`。
- `/admin/merchants/{id}/approve|reject` → 删除。

- [ ] **Step 3: 调整请求/响应字段**

删除 `merchant_id`、`merchant_name`、`shop_name` 等字段；统一由平台管理。

- [ ] **Step 4: 验证无残留**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/API接口文档.md"
```

Expected: 无命中。

- [ ] **Step 5: Commit**

```bash
git add "项目文档/API接口文档.md"
git commit -m "docs(api): API 接口文档移除商家接口，统一为 admin 平台管理"
```

---

## Task 6: 数据库设计说明书修正

**Files:**
- Modify: `项目文档/数据库设计说明书.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的数据库设计

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/数据库设计说明书.md"
```

Expected: 输出命中行。

- [ ] **Step 2: 删除 merchants 表及所有 merchant_id 外键**

- 删除 `merchants` 表 DDL。
- 删除 `products.merchant_id`、`orders.merchant_id`、`coupons.merchant_id`。
- 删除相关索引。
- 若需要展示“平台信息”，新增单条 `shop_config` 表（id, name_km, name_en, name_zh, logo, contact_phone, created_at）。

- [ ] **Step 3: 更新 ER 图描述**

移除 `merchants` 实体；描述商品/订单/优惠券均直接归属平台。

- [ ] **Step 4: 验证无残留**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/数据库设计说明书.md"
```

Expected: 无命中。

- [ ] **Step 5: Commit**

```bash
git add "项目文档/数据库设计说明书.md"
git commit -m "docs(db): 数据库设计移除商家表与 merchant_id 外键，统一为公司自营"
```

---

## Task 7: Railway 部署实施方案修正

**Files:**
- Modify: `项目文档/Railway部署实施方案.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的部署文档

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/Railway部署实施方案.md"
```

Expected: 输出命中行。

- [ ] **Step 2: 修改管理员权限描述**

“只有这个 ID 的用户才能审核商家、查看大盘数据” → “只有这个 ID 的用户才能查看大盘数据、管理商品/订单/用户”。

- [ ] **Step 3: 修改构建与路由章节**

- “构建商家后台” → “构建管理员后台”。
- `/merchant/*` → `/admin/*`。
- `tgmall-merchant` → `tgmall-admin`。
- `Stage 3: merchant-build` → `Stage 3: admin-build`。

- [ ] **Step 4: 修改二维码/推广链接章节**

- 删除“不同商家不同二维码 / 商家A / 商家B”。
- 统一为单一平台入口：`https://t.me/xhzmall_bot?startapp=shop`。
- “给商家提供的标准 QR 码贴纸” → “平台推广 QR 码”。

- [ ] **Step 5: 修改测试章节**

“7.3 商家后台测试” → “7.3 管理员后台测试”。

- [ ] **Step 6: 验证无残留**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/Railway部署实施方案.md"
```

Expected: 无命中（允许的例外：历史上下文中的“商家A/商家B”示例已删除）。

- [ ] **Step 7: Commit**

```bash
git add "项目文档/Railway部署实施方案.md"
git commit -m "docs(deploy): Railway 部署方案移除商家后台，统一为 admin 平台"
```

---

## Task 8: 需求优先级矩阵 MoSCoW 修正

**Files:**
- Modify: `项目文档/需求优先级矩阵_MoSCoW.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的需求优先级矩阵

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/需求优先级矩阵_MoSCoW.md"
```

Expected: 输出命中行。

- [ ] **Step 2: 替换或删除商家相关需求条目**

- “商家入驻” → 删除或改为“平台商品上架”。
- “商家审核” → 删除。
- “商家后台” → 改为“管理员后台”。

- [ ] **Step 3: 验证无残留并 Commit**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/需求优先级矩阵_MoSCoW.md"
```

Expected: 无命中。

```bash
git add "项目文档/需求优先级矩阵_MoSCoW.md"
git commit -m "docs(moscow): MoSCoW 矩阵移除商家入驻需求，统一为公司自营"
```

---

## Task 9: 测试相关文档修正

**Files:**
- Modify: `项目文档/测试计划.md`
- Modify: `项目文档/测试用例集.md`
- Modify: `项目文档/测试执行报告_2026-06-06.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的测试文档

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/测试计划.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/测试用例集.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/测试执行报告_2026-06-06.md"
```

Expected: 输出命中行。

- [ ] **Step 2: 替换测试范围与用例**

- 测试范围中的“商家后台” → “管理员后台”。
- 删除商家入驻/审核相关测试用例。
- 商品/订单测试用例中的 `merchant_id` → 删除。

- [ ] **Step 3: 验证无残留并 Commit**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/测试计划.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/测试用例集.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/测试执行报告_2026-06-06.md"
```

Expected: 无命中。

```bash
git add "项目文档/测试计划.md" "项目文档/测试用例集.md" "项目文档/测试执行报告_2026-06-06.md"
git commit -m "docs(test): 测试文档移除商家入驻与商家后台用例"
```

---

## Task 10: UI 设计稿 HTML/组件清单修正

**Files:**
- Modify: `项目文档/ui-design/README.md`
- Modify: `项目文档/ui-design/merchant/缺失页面清单.md` → 删除或改为 admin
- Modify: `项目文档/ui-design/admin/缺失页面清单.md`
- Modify: `项目文档/ui-design/pages/00-项目总览.html`
- Modify: `项目文档/ui-design/pages/01-首页.html` 等含商家信息的 HTML
- Modify: `项目文档/ui-design/components/缺失组件清单.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的 UI 设计文档

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -RinE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/ui-design"
```

Expected: 输出命中行。

- [ ] **Step 2: 重命名/删除 merchant 目录**

- 将 `ui-design/merchant/` 重命名为 `ui-design/admin/` 或删除（若与现有 admin 重复）。
- 更新 `ui-design/README.md` 中的目录说明。

- [ ] **Step 3: 修改 HTML 页面中的商家元素**

- 删除商品卡片中的“商家名称”。
- 将“商家后台”链接改为“管理员后台”。
- 删除“商家入驻”入口。

- [ ] **Step 4: 修改缺失页面/组件清单**

- `merchant/缺失页面清单.md` 中的页面 → 改为 admin 相关页面或删除。
- 组件清单中商家相关组件 → 删除或改为 admin 组件。

- [ ] **Step 5: 验证无残留并 Commit**

Run:
```bash
grep -RinE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档/ui-design"
```

Expected: 无命中。

```bash
git add "项目文档/ui-design"
git commit -m "docs(ui): UI 设计稿移除商家端页面与组件，统一为平台/admin"
```

---

## Task 11: 用户操作手册/商业计划书/框架对比/新手册修正

**Files:**
- Modify: `项目文档/用户操作手册.md`
- Modify: `项目文档/柬埔寨 telegram 小程序商城商业计划书.docx`
- Modify: `项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md`
- Modify: `项目文档/软件工程小白通关手册_柬埔寨Telegram电商平台.md`

**Interfaces:**
- Consumes: 统一替换词表
- Produces: 与公司自营一致的运营/商业文档

- [ ] **Step 1: 扫描命中行**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|店铺|多商户|多租户" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/用户操作手册.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/软件工程小白通关手册_柬埔寨Telegram电商平台.md"
```

Expected: 输出命中行。docx 无法直接 grep，需单独说明。

- [ ] **Step 2: 修改用户操作手册**

将“商家入驻/商家后台”相关操作说明改为“管理员后台”或删除。

- [ ] **Step 3: 修改商业计划书 docx**

- 商业模式中“商家入驻/佣金收入” → 改为“公司自营/商品毛利”。
- 目标用户中“中小商家” → 删除或改为“柬埔寨消费者”。
- 若无法直接编辑 docx，记录为待人工处理项。

- [ ] **Step 4: 修改框架对比报告与新手册**

将示例/说明中的“商家”改为“平台/管理员”。

- [ ] **Step 5: 验证无残留并 Commit**

Run:
```bash
grep -nE "商家|入驻|merchant|seller|vendor|多商户|多租户" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/用户操作手册.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md" \
  "/Users/qinzz/Desktop/telegrammall/项目文档/软件工程小白通关手册_柬埔寨Telegram电商平台.md"
```

Expected: 无命中（docx 除外，需人工确认）。

```bash
git add "项目文档/用户操作手册.md" "项目文档/Claude_Code_框架对比报告_Superpowers_vs_gstack.md" "项目文档/软件工程小白通关手册_柬埔寨Telegram电商平台.md"
git commit -m "docs(ops): 用户手册/商业/框架文档移除商家入驻概念"
```

---

## Task 12: 全局最终校验

**Files:**
- Read: `项目文档/` 下全部文件

**Interfaces:**
- Consumes: 已修改的文档
- Produces: 最终无残留确认报告

- [ ] **Step 1: 再次全局 grep 扫描**

Run:
```bash
grep -RinE "商家|入驻|merchant|seller|vendor|多商户|多租户" "/Users/qinzz/Desktop/telegrammall/项目文档" | grep -v "\.DS_Store" | grep -v "images/"
```

Expected: 仅剩不可避免的命中（如 docx 内部、URL 中的 `merchant` 一词若属于外部服务名、历史变更说明中的“V1.0 多商户平台 → V2.0 公司自营模式”）。所有命中必须人工复核并说明。

- [ ] **Step 2: 生成变更摘要**

统计每个文件的修改行数：
```bash
git diff --stat
```

Expected: 输出修改文件列表及增删行数。

- [ ] **Step 3: 最终 Commit（若未提交）**

```bash
git add -A
git commit -m "docs: 全项目文档统一为公司自营模式，移除商家入驻/多租户概念"
```

---

## Self-Review Checklist

- [ ] Spec coverage: 所有含“商家/merchant/seller/vendor”的文档都有对应 Task。
- [ ] Placeholder scan: 计划中没有 TBD/TODO/ implement later。
- [ ] Type consistency: 文档中的术语统一为“公司自营/平台/管理员后台”。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-01-merchant-to-self-operated.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
