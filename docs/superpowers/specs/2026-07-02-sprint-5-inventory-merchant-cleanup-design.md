# Sprint 5 设计文档：库存管理后台 + V1 商户代码清理

> **日期**：2026-07-02
> **版本**：V1.0
> **状态**：待实现
> **范围**：库存管理后台（完整版）+ V1 多商户遗留代码清理
> **延期**：ABA Pay / Wing Pay 真实对接（缺银行 API 文档与沙箱账号，留待后续 Sprint）

---

## 一、库存管理后台（完整版）

### 1.1 数据模型变更

#### Product 表新增字段

```
alertThreshold  Int?   @map("alert_threshold")   // 预警阈值，低于此数触发通知
```

#### 新增 StockLog 表

```
model StockLog {
  id          String    @id @default(uuid()) @db.Uuid
  productId   String    @map("product_id") @db.VarChar(36)
  product     Product   @relation(fields: [productId], references: [id])
  beforeQty   Int       @map("before_qty")
  afterQty    Int       @map("after_qty")
  changeQty   Int       @map("change_qty")   // 正数=入库，负数=出库
  reason      String    @db.VarChar(30)       // order_create | order_cancel | manual_adjust | stock_check | auto_delist
  operatorId  String?   @map("operator_id") @db.VarChar(36)
  note        String?   @db.Text
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  @@index([productId, createdAt])
  @@map("stock_logs")
}
```

#### 新增 InventoryCheck 表

```
model InventoryCheck {
  id          String    @id @default(uuid()) @db.Uuid
  productId   String    @map("product_id") @db.VarChar(36)
  product     Product   @relation(fields: [productId], references: [id])
  systemQty   Int       @map("system_qty")     // 盘点时系统记录数
  actualQty   Int       @map("actual_qty")     // 实盘数
  diff        Int                              // 差异 = actualQty - systemQty
  note        String?   @db.Text
  checkedBy   String    @map("checked_by") @db.VarChar(100)
  checkedAt   DateTime  @default(now()) @map("checked_at") @db.Timestamptz()
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  @@index([productId, checkedAt])
  @@map("inventory_checks")
}
```

### 1.2 API 端点

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/v1/admin/inventory` | 库存总览列表（分页/搜索/排序/预警筛选） |
| `PUT` | `/api/v1/admin/products/:id/stock` | 手动调整库存（自动记录 StockLog） |
| `GET` | `/api/v1/admin/products/:id/stock-logs` | 商品库存变更历史（分页） |
| `POST` | `/api/v1/admin/inventory/check` | 盘点录入（记录系统数 vs 实盘数差异） |
| `PUT` | `/api/v1/admin/products/:id/alert-threshold` | 设置库存预警阈值 |

#### 输入校验

- 手动调整：`{ qty: number, reason: string?, note: string? }` — qty 必须 ≥ 0
- 盘点录入：`{ productId: string, actualQty: number, note?: string }` — actualQty ≥ 0
- 预警阈值：`{ threshold: number | null }` — null 表示关闭预警

### 1.3 库存变更时序（order.service.js 修改）

现有预扣库存逻辑加一步：写入 StockLog。

```
// 下单预扣
prisma.$transaction([
  tx.product.update({ data: { stock: { decrement: item.quantity } } }),
  tx.stockLog.create({ data: { productId, beforeQty, afterQty, changeQty: -item.quantity, reason: 'order_create' } }),
])

// 取消恢复
prisma.$transaction([
  tx.product.update({ data: { stock: { increment: item.quantity } } }),
  tx.stockLog.create({ data: { productId, beforeQty, afterQty, changeQty: +item.quantity, reason: 'order_cancel' } }),
])

// 手动调整
prisma.product.update({ where: { id }, data: { stock: newQty } })
prisma.stockLog.create({ data: { productId, beforeQty, afterQty, changeQty: diff, reason: 'manual_adjust', operatorId, note } })

// 自动下架（库存降为 0）
if (newStock === 0) {
  tx.product.update({ data: { status: 'inactive' } })
  tx.stockLog.create({ data: { ..., reason: 'auto_delist' } })
}

// 库存低于预警 → Bot 通知
if (newStock <= product.alertThreshold) {
  notificationService.sendLowStockAlert(product).catch(() => {})
}
```

### 1.4 管理后台页面

**InventoryPage.vue**
- 表格列：商品图片 | 名称 | SKU | 当前库存 | 预警阈值 | 状态 | 操作
- 搜索：按商品名
- 排序：库存升/降序
- 筛选：仅显示低于预警阈值的
- 行内快捷调整：点击库存数字 → 弹输入框 → 输入新数量 + 备注 → 确认
- 批量导出 CSV
- 低于预警阈值的行红色背景高亮

**StockLog 抽屉** — 点击商品 → 侧边抽屉打开 → 时间线展示变更历史
- 每条：时间 | 原因标签（下单/取消/手动/盘点/自动下架） | 变更量 | 操作人 | 备注

**盘点对话框**
- 搜索选择商品 → 系统自动显示当前库存（不可编辑）
- 输入实盘数量 → 系统计算差异
- 提交 → 创建 InventoryCheck + 记 StockLog（reason: stock_check）

**ProductsPage.vue 增强**
- 编辑商品弹窗加「预警阈值」字段

---

## 二、V1 商户代码清理

### 2.1 删除清单

| 目标 | 说明 |
|------|------|
| `tgmall-merchant/` 整个目录 | 商户端前端（467 行），公司自营模式下无需 |
| `tgmall-admin/src/pages/MerchantsPage.vue` | 商家审核列表页 |
| `tgmall-admin/src/pages/MerchantDetailPage.vue` | 商家详情/审核页 |
| `merchant.routes.js` → `merchantRouter` | 删除 `/merchants/register`、`/merchants/login` 路由 |
| `merchant.routes.js` → `adminRouter` 中审批路由 | 删除 `POST /merchants/:id/approve`、`POST /merchants/:id/reject` |
| `merchant.service.js` → `registerMerchant()` | 商家注册 |
| `merchant.service.js` → `merchantLogin()` | 商家登录 |
| `merchant.service.js` → `merchantWebLogin()` | 商家 Web 登录 |
| `merchant.service.js` → `approveMerchant()` | 审核通过 |
| `merchant.service.js` → `rejectMerchant()` | 审核拒绝 |
| `middleware/defaultMerchant.js` | 默认商户中间件 |
| `validators/merchant.schema.js` → `rejectMerchantSchema` | 仅拒绝审核校验 |

### 2.2 保留 & 重命名清单

| 旧路径 | 新路径 | 内容 |
|--------|--------|------|
| `merchant.routes.js` → `adminRouter` | `admin.routes.js` | 看板/商品管理/订单管理/发货 + 新库存路由 |
| `merchant.service.js` → `getDashboard/getProducts/createProduct/updateProduct/toggleProduct/getOrderDetail/getOrders/shipOrder` | `admin.service.js` | 保留这些 admin 方法 |
| `merchant.controller.js` → admin 相关方法 | `admin.controller.js` | 合并已有 admin controller |

### 2.3 Prisma 清理（注意：破坏性变更）

```diff
- model Merchant { ... }
- model User { merchant Merchant?; merchantId String? }
- model Product { merchant Merchant?; merchantId String? }
- model Order { merchant Merchant?; merchantId String? }
+ // 全部移除 merchant 关联
```

先用 `@@ignore` 注释掉 Merchant 模型，验证无误后再物理删除。

### 2.4 连锁修改

| 受影响的文件 | 修改 |
|-------------|------|
| `api/src/routes/index.js` | `merchantRouter` → `adminRouter`，import 路径改为 `./admin.routes.js` |
| `api/src/services/order.service.js` | 移除 `merchantId` 参数，Bot 通知不再查 merchant 关联用户 |
| `api/src/services/payment.service.js` | 回调通知去掉商家通知部分（第 242-250 行） |
| `admin/src/router/index.js` | 删除 MerchantsPage/MerchantDetailPage 路由 |
| `admin/src/api/index.js` | 删除 merchant 相关 API 封装 |
| `admin/src/components/layout/Sidebar.vue` | 删除「商家管理」菜单项 |

---

## 三、测试计划

### API 测试
- `stockLog.service.test.js` — 库存调整/日志记录/自动下架/预警逻辑
- `inventory-check.test.js` — 盘点创建/差异计算
- `admin.service.test.js` — 拆分后 admin 方法不丢失

### 清理验证
- CI 全量测试通过（API 109 + Mini App 50）
- `grep -r "merchant" --include="*.js" --include="*.vue" tgmall-api/src/ tgmall-admin/src/` 确认仅保留 admin 所需引用
- `npx prisma migrate dev --create-only` 确认迁移无报错

---

## 四、实现顺序

1. **StockLog + InventoryCheck 模型与迁移**
2. **StockLog 种子数据 + API 端点 + 单元测试**
3. **order.service.js 接入 StockLog + 自动下架 + 预警通知**
4. **管理后台 InventoryPage.vue + ProductsPage 增强**
5. **adminRouter 从 merchant.routes.js 抽出 → admin.routes.js**
6. **merchant.service.js 拆分 → admin.service.js**
7. **删除 tgmall-merchant/ + 审批页面 + 审批路由**
8. **Prisma Merchant 模型清理**
9. **全量测试验证**
