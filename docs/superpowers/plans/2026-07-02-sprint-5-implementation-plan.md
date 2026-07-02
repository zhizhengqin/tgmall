# Sprint 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 库存管理后台（完整版：预警/日志/盘点/自动下架）+ V1 多商户遗留代码清理

**Architecture:** StockLog + InventoryCheck 新表记录所有库存变更；order.service.js 接入自动日志；新增 InventoryPage 后台页 + ProductsPage 增强；merchant 代码清理（删除 tgmall-merchant/，路由/服务重命名为 admin）

**Tech Stack:** Node.js + Express + Prisma + Zod · Vue 3 + Element Plus Admin · Jest + Vitest

## Global Constraints

- 所有 API 输入使用 Zod 校验，snake_case 输入 → camelCase 内部使用
- Admin 路由需 auth + adminAuth 中间件
- 支付回调必须验签 + 幂等处理
- 库存操作在 Prisma 事务内完成
- 测试覆盖率：核心交易链路 ≥ 80%
- 三语支持（高棉语/英语/中文）

---

## Phase 1: Database & Schema

### Task 1: Schema 变更 — Product.alertThreshold + StockLog + InventoryCheck

**Files:**
- Modify: `tgmall-api/prisma/schema.prisma`
- Create: `tgmall-api/prisma/migrations/`

**Interfaces:**
- Produces: `StockLog` model (id, productId, beforeQty, afterQty, changeQty, reason, operatorId?, note?, createdAt), `InventoryCheck` model (id, productId, systemQty, actualQty, diff, note?, checkedBy, checkedAt, createdAt), `Product.alertThreshold` field

- [ ] **Step 1: 在 Product 模型添加 alertThreshold 字段**

在 `tgmall-api/prisma/schema.prisma` 的 `model Product` 中，`stock` 字段后添加：

```prisma
  alertThreshold Int?     @map("alert_threshold")
```

- [ ] **Step 2: 添加 StockLog 和 InventoryCheck 模型**

在 schema.prisma 末尾（`model CustomerService` 之后）添加：

```prisma
model StockLog {
  id          String    @id @default(uuid()) @db.Uuid
  productId   String    @map("product_id") @db.VarChar(36)
  product     Product   @relation(fields: [productId], references: [id])
  beforeQty   Int       @map("before_qty")
  afterQty    Int       @map("after_qty")
  changeQty   Int       @map("change_qty")
  reason      String    @db.VarChar(30)
  operatorId  String?   @map("operator_id") @db.VarChar(36)
  note        String?   @db.Text
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  @@index([productId, createdAt])
  @@map("stock_logs")
}

model InventoryCheck {
  id          String    @id @default(uuid()) @db.Uuid
  productId   String    @map("product_id") @db.VarChar(36)
  product     Product   @relation(fields: [productId], references: [id])
  systemQty   Int       @map("system_qty")
  actualQty   Int       @map("actual_qty")
  diff        Int
  note        String?   @db.Text
  checkedBy   String    @map("checked_by") @db.VarChar(100)
  checkedAt   DateTime  @default(now()) @map("checked_at") @db.Timestamptz()
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  @@index([productId, checkedAt])
  @@map("inventory_checks")
}
```

- [ ] **Step 3: 生成迁移并验证**

```bash
cd tgmall-api && npx prisma migrate dev --name add_stock_log_and_inventory_check
```

预期：迁移文件生成成功，无错误。

- [ ] **Step 4: Commit**

```bash
git add tgmall-api/prisma/schema.prisma tgmall-api/prisma/migrations/
git commit -m "feat(db): add alertThreshold, StockLog, InventoryCheck models"
```

---

## Phase 2: Inventory Service & API

### Task 2: Inventory Validators

**Files:**
- Create: `tgmall-api/src/validators/inventory.schema.js`

**Interfaces:**
- Produces: `adjustStockSchema` — `{ qty: number (≥0), note?: string }`, `inventoryCheckSchema` — `{ productId: string, actualQty: number (≥0), note?: string }`, `alertThresholdSchema` — `{ threshold: number (≥0) | null }`

- [ ] **Step 1: 编写 Zod 校验 schema**

```js
// tgmall-api/src/validators/inventory.schema.js
import { z } from 'zod';

export const adjustStockSchema = z.object({
  qty: z.number().int('库存数量必须是整数').min(0, '库存不能为负数'),
  note: z.string().max(500).optional(),
});

export const inventoryCheckSchema = z.object({
  productId: z.string().min(1, '商品ID必填'),
  actualQty: z.number().int('库存数量必须是整数').min(0, '库存不能为负数'),
  note: z.string().max(500).optional(),
});

export const alertThresholdSchema = z.object({
  threshold: z
    .number()
    .int('预警阈值必须是整数')
    .min(0, '阈值不能为负数')
    .nullable()
    .optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add tgmall-api/src/validators/inventory.schema.js
git commit -m "feat(api): add inventory validator schemas"
```

### Task 3: Inventory Service

**Files:**
- Create: `tgmall-api/src/services/inventory.service.js`

**Interfaces:**
- Consumes: `StockLog`, `InventoryCheck` Prisma models, `Product.alertThreshold`, `Product.stock`
- Produces: `listInventory({ page, limit, q, sortBy, lowStockOnly })` → `{ items, total, page, limit }`, `adjustStock(productId, newQty, operatorId, note)` → updated product, `getStockLogs(productId, { page, limit })` → `{ items, total }`, `checkInventory({ productId, actualQty, checkedBy, note })` → InventoryCheck, `setAlertThreshold(productId, threshold)` → updated product

- [ ] **Step 1: 编写 inventory.service.js**

```js
// tgmall-api/src/services/inventory.service.js
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { getPagination } from '../utils/pagination.js';

export async function listInventory({ page = 1, limit = 20, q, sortBy = 'stock_asc', lowStockOnly = false } = {}) {
  const { page: p, limit: l, skip } = getPagination({ page, limit });
  const where = {};
  if (q) where.nameKm = { contains: q, mode: 'insensitive' };
  if (lowStockOnly) {
    where.alertThreshold = { not: null };
  }

  const orderBy = [];
  if (sortBy === 'stock_asc') orderBy.push({ stock: 'asc' });
  else if (sortBy === 'stock_desc') orderBy.push({ stock: 'desc' });

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: l,
      select: {
        id: true, nameKm: true, nameEn: true, nameZh: true,
        images: true, stock: true, alertThreshold: true, status: true,
        _count: { select: { stockLogs: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const enriched = items.map(p => ({
    ...p,
    lowStock: p.alertThreshold != null && p.stock <= p.alertThreshold,
  }));

  if (lowStockOnly) {
    const filtered = enriched.filter(p => p.lowStock);
    return { items: filtered, total: filtered.length, page: p, limit: l, totalPages: Math.ceil(filtered.length / l), hasNext: p * l < filtered.length };
  }

  return { items: enriched, total, page: p, limit: l, totalPages: Math.ceil(total / l), hasNext: p * l < total };
}

export async function adjustStock(productId, newQty, operatorId, note = null) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');

  const beforeQty = product.stock;
  const afterQty = newQty;
  const changeQty = afterQty - beforeQty;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { stock: newQty, ...(newQty === 0 ? { status: 'inactive' } : {}) },
    });

    await tx.stockLog.create({
      data: { productId, beforeQty, afterQty, changeQty, reason: 'manual_adjust', operatorId, note },
    });

    if (newQty === 0) {
      await tx.stockLog.create({
        data: { productId, beforeQty: 0, afterQty: 0, changeQty: 0, reason: 'auto_delist', operatorId, note: '库存归零自动下架' },
      });
    }
  });

  const updated = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, nameKm: true, stock: true, status: true, alertThreshold: true },
  });
  return updated;
}

export async function getStockLogs(productId, { page = 1, limit = 20 } = {}) {
  const { page: p, limit: l, skip } = getPagination({ page, limit });
  const [items, total] = await Promise.all([
    prisma.stockLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: l,
    }),
    prisma.stockLog.count({ where: { productId } }),
  ]);
  return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
}

export async function checkInventory({ productId, actualQty, checkedBy, note }) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, nameKm: true },
  });
  if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');

  const systemQty = product.stock;
  const diff = actualQty - systemQty;

  const record = await prisma.$transaction(async (tx) => {
    const check = await tx.inventoryCheck.create({
      data: { productId, systemQty, actualQty, diff, note, checkedBy },
    });

    // 如果有差异，记录 StockLog + 自动调整库存
    if (diff !== 0) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: actualQty, ...(actualQty === 0 ? { status: 'inactive' } : {}) },
      });
      await tx.stockLog.create({
        data: { productId, beforeQty: systemQty, afterQty: actualQty, changeQty: diff, reason: 'stock_check', operatorId: checkedBy, note: note || '盘点调整' },
      });
    }
    return check;
  });

  return { ...record, productName: product.nameKm };
}

export async function setAlertThreshold(productId, threshold) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('商品不存在', 404, 'NOT_FOUND');

  return prisma.product.update({
    where: { id: productId },
    data: { alertThreshold: threshold },
    select: { id: true, nameKm: true, stock: true, alertThreshold: true, status: true },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add tgmall-api/src/services/inventory.service.js
git commit -m "feat(api): add inventory service (list/adjust/stockLogs/check/threshold)"
```

### Task 4: Inventory Controller

**Files:**
- Create: `tgmall-api/src/controllers/inventory.controller.js`

**Interfaces:**
- Consumes: `inventory.service.js` exports
- Produces: Express route handlers — `listInventory`, `adjustStock`, `stockLogs`, `checkInventory`, `setAlertThreshold`

- [ ] **Step 1: 编写 controller**

```js
// tgmall-api/src/controllers/inventory.controller.js
import * as inventory from '../services/inventory.service.js';
import { getPagination } from '../utils/pagination.js';

function ok(data, meta) {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export async function listInventory(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { q, sortBy, lowStockOnly } = req.query;
    const result = await inventory.listInventory({ page, limit, q, sortBy, lowStockOnly: lowStockOnly === 'true' });
    res.json(ok(result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages, hasNext: result.hasNext }));
  } catch (err) { next(err); }
}

export async function adjustStock(req, res, next) {
  try {
    const { qty, note } = req.validatedBody;
    const operatorId = req.user?.id;
    const data = await inventory.adjustStock(req.params.id, qty, operatorId, note);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function stockLogs(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const result = await inventory.getStockLogs(req.params.id, { page, limit });
    res.json(ok(result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }));
  } catch (err) { next(err); }
}

export async function checkInventory(req, res, next) {
  try {
    const { productId, actualQty, note } = req.validatedBody;
    const checkedBy = req.user?.id;
    const data = await inventory.checkInventory({ productId, actualQty, checkedBy, note });
    res.status(201).json(ok(data));
  } catch (err) { next(err); }
}

export async function setAlertThreshold(req, res, next) {
  try {
    const { threshold } = req.validatedBody;
    const data = await inventory.setAlertThreshold(req.params.id, threshold);
    res.json(ok(data));
  } catch (err) { next(err); }
}
```

- [ ] **Step 2: Commit**

```bash
git add tgmall-api/src/controllers/inventory.controller.js
git commit -m "feat(api): add inventory controller"
```

### Task 5: Inventory Routes — mount to admin router

**Files:**
- Create: `tgmall-api/src/routes/inventory.routes.js`
- Modify: `tgmall-api/src/routes/merchant.routes.js` (add inventory routes to adminRouter)

**Interfaces:**
- Produces: Express router with 5 inventory endpoints mounted on `adminRouter`

- [ ] **Step 1: 编写路由文件**

```js
// tgmall-api/src/routes/inventory.routes.js
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  adjustStockSchema,
  inventoryCheckSchema,
  alertThresholdSchema,
} from '../validators/inventory.schema.js';
import * as ctrl from '../controllers/inventory.controller.js';

const router = Router();

router.get('/inventory', ctrl.listInventory);
router.put('/products/:id/stock', validate(adjustStockSchema), ctrl.adjustStock);
router.get('/products/:id/stock-logs', ctrl.stockLogs);
router.post('/inventory/check', validate(inventoryCheckSchema), ctrl.checkInventory);
router.put('/products/:id/alert-threshold', validate(alertThresholdSchema), ctrl.setAlertThreshold);

export default router;
```

- [ ] **Step 2: 挂载到现有的 adminRouter**

在 `tgmall-api/src/routes/merchant.routes.js` 中添加 import 和挂载，在文件顶部添加：

```js
import inventoryRouter from './inventory.routes.js';
```

在 `adminRouter` 定义之后、`export` 之前添加：

```js
adminRouter.use(inventoryRouter);
```

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/src/routes/inventory.routes.js tgmall-api/src/routes/merchant.routes.js
git commit -m "feat(api): add inventory routes to admin router"
```

### Task 6: Inventory Service Unit Tests

**Files:**
- Create: `tgmall-api/tests/unit/inventory-service.test.js`

**Interfaces:**
- Tests: `adjustStock` happy path, `adjustStock` auto-delist when stock 0, `checkInventory` with no diff, `checkInventory` with diff, `setAlertThreshold`, `getStockLogs` pagination

- [ ] **Step 1: 编写测试文件**

```js
// tgmall-api/tests/unit/inventory-service.test.js
import { jest } from '@jest/globals';
import prisma from '../../src/config/database.js';

// Mock prisma
jest.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    stockLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    inventoryCheck: {
      create: jest.fn(),
    },
    $transaction: jest.fn(fn => fn({
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      stockLog: { create: jest.fn() },
      inventoryCheck: { create: jest.fn() },
    })),
  },
}));

describe('Inventory Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('adjustStock', () => {
    it('调整库存并记录 StockLog', async () => {
      const { adjustStock } = await import('../../src/services/inventory.service.js');

      prisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 10 });
      prisma.product.update.mockResolvedValue({ id: 'p1', stock: 25 });

      await adjustStock('p1', 25, 'admin1', '补货');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('库存归零时自动下架并记录 auto_delist 日志', async () => {
      const { adjustStock } = await import('../../src/services/inventory.service.js');

      prisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 5 });

      await adjustStock('p1', 0, 'admin1', null);

      // 事务内包含了 product.update({ stock: 0, status: 'inactive' })
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('checkInventory', () => {
    it('盘点无差异时仅创建 InventoryCheck 记录', async () => {
      const { checkInventory } = await import('../../src/services/inventory.service.js');

      prisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 50, nameKm: '测试商品' });

      await checkInventory({ productId: 'p1', actualQty: 50, checkedBy: 'admin1', note: '月度盘点' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('盘点有差异时自动调整库存', async () => {
      const { checkInventory } = await import('../../src/services/inventory.service.js');

      prisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 50, nameKm: '测试商品' });

      await checkInventory({ productId: 'p1', actualQty: 48, checkedBy: 'admin1', note: null });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('setAlertThreshold', () => {
    it('设置预警阈值', async () => {
      const { setAlertThreshold } = await import('../../src/services/inventory.service.js');

      prisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 20 });
      prisma.product.update.mockResolvedValue({ id: 'p1', stock: 20, alertThreshold: 5 });

      const r = await setAlertThreshold('p1', 5);
      expect(r.alertThreshold).toBe(5);
    });

    it('null 关闭预警', async () => {
      const { setAlertThreshold } = await import('../../src/services/inventory.service.js');

      prisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 20 });
      prisma.product.update.mockResolvedValue({ id: 'p1', stock: 20, alertThreshold: null });

      const r = await setAlertThreshold('p1', null);
      expect(r.alertThreshold).toBeNull();
    });
  });
});
```

- [ ] **Step 2: 运行测试验证**

```bash
cd tgmall-api && npm test -- --testPathPattern=inventory-service
```

预期：全部通过

- [ ] **Step 3: Commit**

```bash
git add tgmall-api/tests/unit/inventory-service.test.js
git commit -m "test(api): add inventory service unit tests"
```

---

## Phase 3: Order Service — StockLog 接入

### Task 7: order.service.js — 下单/取消写入 StockLog

**Files:**
- Modify: `tgmall-api/src/services/order.service.js`

**Interfaces:**
- Modifies: `createOrder` — stock decrement 改为在事务内同时写 StockLog；`cancelOrder` — stock restore 改为在事务内同时写 StockLog

- [ ] **Step 1: 修改下单预扣 — 加 StockLog 写入**

在 `order.service.js` 第 101-107 行的预扣库存循环，替换为：

```js
      // 3c. 预扣库存 + 写 StockLog
      for (const item of items) {
        const productBefore = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true },
        });
        const newStock = productBefore.stock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock, ...(newStock === 0 ? { status: 'inactive' } : {}) },
        });

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            beforeQty: productBefore.stock,
            afterQty: newStock,
            changeQty: -item.quantity,
            reason: 'order_create',
          },
        });

        // 自动下架日志
        if (newStock === 0) {
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              beforeQty: 0, afterQty: 0, changeQty: 0,
              reason: 'auto_delist',
              note: '库存归零自动下架',
            },
          });
        }
      }
```

- [ ] **Step 2: 修改取消恢复 — 加 StockLog 写入**

在 `order.service.js` 第 363-369 行的恢复库存循环，替换为：

```js
    // 恢复库存 + 写 StockLog
    for (const item of order.items) {
      const productBefore = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });
      const newStock = productBefore.stock + item.quantity;

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      });

      await tx.stockLog.create({
        data: {
          productId: item.productId,
          beforeQty: productBefore.stock,
          afterQty: newStock,
          changeQty: item.quantity,
          reason: 'order_cancel',
        },
      });
    }
```

- [ ] **Step 3: 运行订单相关测试，确认无回归**

```bash
cd tgmall-api && npm test -- --testPathPattern="order"
```

预期：全部通过

- [ ] **Step 4: Commit**

```bash
git add tgmall-api/src/services/order.service.js
git commit -m "feat(order): write StockLog on stock decrement/restore + auto-delist"
```

---

## Phase 4: Admin Pages

### Task 8: InventoryPage.vue

**Files:**
- Create: `tgmall-admin/src/pages/InventoryPage.vue`
- Modify: `tgmall-admin/src/router/index.js`
- Modify: `tgmall-admin/src/components/layout/Sidebar.vue`
- Modify: `tgmall-admin/src/api/index.js`
- Modify: `tgmall-admin/src/locales/km.json`, `en.json`, `zh.json`

- [ ] **Step 1: 添加 API 封装**

在 `tgmall-admin/src/api/index.js` 末尾添加：

```js
export const getInventory = (params) => api.get('/admin/inventory', { params });
export const adjustStock = (id, data) => api.put(`/admin/products/${id}/stock`, data);
export const getStockLogs = (id, params) => api.get(`/admin/products/${id}/stock-logs`, { params });
export const checkInventory = (data) => api.post('/admin/inventory/check', data);
export const setAlertThreshold = (id, data) => api.put(`/admin/products/${id}/alert-threshold`, data);
```

- [ ] **Step 2: 添加国际化文案**

在 `km.json`、`en.json`、`zh.json` 中添加 `inventory` 命名空间：

```json
// zh.json
"inventory": {
  "title": "库存管理",
  "search": "搜索商品",
  "stock": "库存",
  "alertThreshold": "预警阈值",
  "status": "状态",
  "actions": "操作",
  "adjustStock": "调整库存",
  "newQty": "新库存数量",
  "note": "备注",
  "stockLogs": "变更历史",
  "reason": "原因",
  "changeQty": "变更量",
  "operator": "操作人",
  "check": "盘点",
  "checkTitle": "库存盘点",
  "selectProduct": "选择商品",
  "systemQty": "系统库存",
  "actualQty": "实盘数量",
  "diff": "差异",
  "checkedBy": "盘点人",
  "lowStockAlert": "库存不足",
  "filterLowStock": "仅显示低库存",
  "noThreshold": "未设置",
  "export": "导出CSV"
}
```

高棉语和英语同理（此处省略完整三语，实现时补充）。

- [ ] **Step 3: 编写 InventoryPage.vue**

```vue
<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <h1>{{ $t('inventory.title') }}</h1>

      <div style="display:flex;gap:12px;align-items:center;margin:16px 0">
        <el-input v-model="search" :placeholder="$t('inventory.search')" clearable style="width:240px" @input="load" />
        <el-checkbox v-model="lowStockOnly" @change="load">{{ $t('inventory.filterLowStock') }}</el-checkbox>
        <el-button @click="showCheckDialog = true">{{ $t('inventory.check') }}</el-button>
        <el-button @click="exportCSV">{{ $t('inventory.export') }}</el-button>
      </div>

      <el-table :data="items" v-loading="loading" stripe
        :row-class-name="({row}) => row.lowStock ? 'low-stock-row' : ''">
        <el-table-column :label="$t('inventory.search')" min-width="160">
          <template #default="{row}"><div style="display:flex;align-items:center;gap:8px">
            <img v-if="row.images?.[0]" :src="row.images[0]" width="40" height="40" style="object-fit:cover;border-radius:4px" />
            <span>{{ row.nameKm || row.nameEn }}</span>
          </div></template>
        </el-table-column>
        <el-table-column :label="$t('inventory.stock')" width="120">
          <template #default="{row}">
            <el-popover trigger="click" :width="260">
              <template #reference>
                <span :style="{color: row.lowStock ? '#f56c6c' : '', cursor:'pointer', fontWeight:'bold'}">{{ row.stock }}</span>
              </template>
              <div>
                <p style="margin-bottom:8px">{{ $t('inventory.adjustStock') }}</p>
                <el-input-number v-model="adjustQty" :min="0" style="width:100%" />
                <el-input v-model="adjustNote" :placeholder="$t('inventory.note')" style="margin:8px 0" />
                <el-button type="primary" size="small" @click="doAdjust(row.id); $refs[`pop_${row.id}`]?.[0]?.hide()">确认</el-button>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column :label="$t('inventory.alertThreshold')" width="100">
          <template #default="{row}">
            <el-input-number v-model="row._threshold" :min="0" size="small" controls-position="right" style="width:80px"
              @change="v => doSetThreshold(row.id, v)" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('inventory.status')" width="80">
          <template #default="{row}"><el-tag :type="row.status==='active'?'success':'info'" size="small">{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column :label="$t('inventory.stockLogs')" width="100">
          <template #default="{row}"><el-button size="small" @click="openLogs(row)">{{ $t('inventory.stockLogs') }}</el-button></template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>

    <!-- StockLog 抽屉 -->
    <el-drawer v-model="drawer" :title="logTitle" size="400px">
      <el-timeline v-if="logs.length">
        <el-timeline-item v-for="l in logs" :key="l.id"
          :timestamp="new Date(l.createdAt).toLocaleString()"
          :type="l.reason === 'auto_delist' ? 'danger' : l.reason === 'order_create' ? 'warning' : 'primary'">
          <p>{{ reasonLabel(l.reason) }}</p>
          <p style="font-size:12px;color:#909399">
            {{ l.beforeQty }} → {{ l.afterQty }}
            <span :style="{color: l.changeQty > 0 ? '#67c23a' : '#f56c6c'}">
              ({{ l.changeQty > 0 ? '+' : '' }}{{ l.changeQty }})
            </span>
          </p>
          <p v-if="l.note" style="font-size:12px;color:#909399">{{ l.note }}</p>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else />
    </el-drawer>

    <!-- 盘点对话框 -->
    <el-dialog v-model="showCheckDialog" :title="$t('inventory.checkTitle')" width="450px">
      <el-select v-model="checkProductId" filterable remote :remote-method="searchProducts"
        :placeholder="$t('inventory.selectProduct')" style="width:100%">
        <el-option v-for="p in checkProducts" :key="p.id" :label="`${p.nameKm} (${$t('inventory.systemQty')}: ${p.stock})`" :value="p.id" />
      </el-select>
      <div style="margin:16px 0">
        <p>{{ $t('inventory.systemQty') }}: <b>{{ systemQty }}</b></p>
        <el-input-number v-model="checkActualQty" :min="0" style="width:100%;margin-top:8px" :placeholder="$t('inventory.actualQty')" />
        <p v-if="checkProductId" style="margin-top:8px;color:#e6a23c">
          {{ $t('inventory.diff') }}: {{ checkActualQty - systemQty }}
        </p>
      </div>
      <el-input v-model="checkNote" :placeholder="$t('inventory.note')" />
      <template #footer><el-button @click="showCheckDialog=false" /> <el-button type="primary" @click="doCheck">{{ $t('inventory.check') }}</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; import { getInventory, adjustStock, getStockLogs, checkInventory, setAlertThreshold, getProducts } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const items = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0);
const search = ref(''); const lowStockOnly = ref(false);
const adjustQty = ref(0); const adjustNote = ref('');
const drawer = ref(false); const logs = ref([]); const logTitle = ref('');
const showCheckDialog = ref(false); const checkProductId = ref(null); const checkProducts = ref([]);
const checkActualQty = ref(0); const checkNote = ref(''); const systemQty = ref(0);

async function load() {
  loading.value = true;
  const r = await getInventory({ page: page.value, q: search.value || undefined, lowStockOnly: lowStockOnly.value });
  items.value = (r.data || []).map(p => ({ ...p, _threshold: p.alertThreshold }));
  total.value = r.meta?.total || 0; loading.value = false;
}
async function doAdjust(id) {
  await adjustStock(id, { qty: adjustQty.value, note: adjustNote.value || undefined });
  adjustQty.value = 0; adjustNote.value = ''; load();
}
async function doSetThreshold(id, v) {
  await setAlertThreshold(id, { threshold: v == null ? null : v }); load();
}
async function openLogs(row) {
  logTitle.value = (row.nameKm || row.nameEn) + ' — 变更历史';
  const r = await getStockLogs(row.id, {});
  logs.value = r.data || []; drawer.value = true;
}
async function searchProducts(q) {
  const r = await getProducts({ q, limit: 10 });
  checkProducts.value = r.data || [];
  if (checkProductId.value) {
    const p = checkProducts.value.find(p => p.id === checkProductId.value);
    if (p) systemQty.value = p.stock;
  }
}
async function doCheck() {
  await checkInventory({ productId: checkProductId.value, actualQty: checkActualQty.value, note: checkNote.value || undefined });
  showCheckDialog.value = false; load();
}
function reasonLabel(r) {
  const map = { order_create: '下单', order_cancel: '取消订单', manual_adjust: '手动调整', stock_check: '盘点', auto_delist: '自动下架' };
  return map[r] || r;
}
function exportCSV() {
  const rows = items.value.map(p => [p.nameKm, p.stock, p.alertThreshold ?? '', p.status, p.lowStock ? '是' : '否'].join(','));
  const csv = '名称,库存,预警阈值,状态,低库存\n' + rows.join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'inventory.csv'; a.click();
}
onMounted(load);
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.main { margin-left: 220px; padding: 20px; }
:deep(.low-stock-row) { background: #fef0f0 !important; }
</style>
```

- [ ] **Step 4: 注册路由**

在 `tgmall-admin/src/router/index.js` 添加：

```js
import InventoryPage from '@/pages/InventoryPage.vue';
// 在 routes 数组中添加：
{ path: '/inventory', name: 'Inventory', component: InventoryPage },
```

- [ ] **Step 5: 添加侧边栏菜单项**

在 `tgmall-admin/src/components/layout/Sidebar.vue` 的菜单中添加：

```html
<el-menu-item index="/inventory">{{ $t('inventory.title') }}</el-menu-item>
```

- [ ] **Step 6: Commit**

```bash
git add tgmall-admin/src/
git commit -m "feat(admin): add InventoryPage with stock adjustment, logs drawer, check dialog"
```

### Task 9: ProductsPage — 添加预警阈值字段

**Files:**
- Modify: `tgmall-admin/src/pages/ProductFormPage.vue`

- [ ] **Step 1: 在商品编辑表单添加预警阈值字段**

在 `ProductFormPage.vue` 的 `<el-form>` 中，库存字段后添加：

```html
<el-form-item label="预警阈值">
  <el-input-number v-model="form.alertThreshold" :min="0" placeholder="留空表示不预警" />
</el-form-item>
```

同时在 `form` 初始化和 `loadProduct` 中包含 `alertThreshold`。

- [ ] **Step 2: Commit**

```bash
git add tgmall-admin/src/pages/ProductFormPage.vue
git commit -m "feat(admin): add alert threshold field to product form"
```

---

## Phase 5: V1 商户代码清理

### Task 10: 抽取 adminRouter → admin.routes.js

**Files:**
- Create: `tgmall-api/src/routes/admin.routes.js`
- Modify: `tgmall-api/src/routes/merchant.routes.js`
- Modify: `tgmall-api/src/routes/index.js`

- [ ] **Step 1: 创建 admin.routes.js，迁移 adminRouter**

从 `merchant.routes.js` 复制 `adminRouter` 部分到新文件，同时去掉审批路由：

```js
// tgmall-api/src/routes/admin.routes.js
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { defaultMerchant } from '../middleware/defaultMerchant.js';
import { validate } from '../middleware/validate.js';
import {
  merchantProductSchema,
  shipOrderSchema,
} from '../validators/merchant.schema.js';
import * as ctrl from '../controllers/merchant.controller.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import inventoryRouter from './inventory.routes.js';

const router = Router();

router.use(auth);
router.use(adminAuth);

// 数据看板 + 用户管理
router.get('/dashboard', adminCtrl.dashboard);
router.get('/users', adminCtrl.listUsers);

// 商品管理
router.use(defaultMerchant);
router.get('/products', ctrl.listProducts);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', validate(merchantProductSchema), ctrl.createProduct);
router.put('/products/:id', validate(merchantProductSchema), ctrl.updateProduct);
router.post('/products/:id/toggle', ctrl.toggleProduct);

// 订单管理
router.get('/orders', ctrl.listOrders);
router.get('/orders/:id', ctrl.getOrder);
router.post('/orders/:id/ship', validate(shipOrderSchema), ctrl.shipOrder);

// 库存管理
router.use(inventoryRouter);

export default router;
```

- [ ] **Step 2: 简化 merchant.routes.js**

删除 adminRouter 定义，只保留注释和空 export（后续完全清理）：

```js
// V2 过渡：admin 路由已迁移到 admin.routes.js
// 此文件保留空 shell，下一步完全删除
export { default as adminRouter } from './admin.routes.js';
```

- [ ] **Step 3: 更新 routes/index.js**

将 `tgmall-api/src/routes/index.js` 中的 import 从 `./merchant.routes.js` 改为 `./admin.routes.js`：

```js
// 修改前：
import { merchantRouter, adminRouter } from './merchant.routes.js';
// 修改后：
import adminRouter from './admin.routes.js';
```

同时删除 `router.use('/merchants', merchantRouter);` 行。

- [ ] **Step 4: Commit**

```bash
git add tgmall-api/src/routes/
git commit -m "refactor(api): extract adminRouter to admin.routes.js"
```

### Task 11: 拆分 merchant.service.js → admin.service.js

**Files:**
- Create: `tgmall-api/src/services/admin.service.js`
- Modify: `tgmall-api/src/services/merchant.service.js`（清理商户专属方法）

- [ ] **Step 1: 创建 admin.service.js，保留 admin 方法**

从 `merchant.service.js` 复制以下函数到新文件：

```js
// tgmall-api/src/services/admin.service.js
// 管理员服务 — 看板、商品管理、订单管理、发货
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { getPagination } from '../utils/pagination.js';

export async function getDashboard() {
  const [totalProducts, activeProducts, totalOrders, pendingOrders, totalRevenue] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'pending_payment' } }),
    prisma.order.aggregate({ where: { paymentStatus: 'success' }, _sum: { totalUsd: true } }),
  ]);
  return { totalProducts, activeProducts, totalOrders, pendingOrders, totalRevenueUsd: totalRevenue._sum.totalUsd || 0 };
}

export async function listUsers({ page = 1, limit = 20 } = {}) {
  const { skip, take } = getPagination({ page, limit });
  const [items, total] = await Promise.all([
    prisma.user.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count(),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

对于商品/订单相关方法（`getProducts`、`createProduct`、`updateProduct`、`toggleProduct`、`getOrderDetail`、`getOrders`、`shipOrder`），从 `merchant.service.js` 复制后，去掉第一个参数 `merchantId` 和所有 `where: { merchantId }` 过滤条件，因为公司自营模式下不再需要商户隔离。

- [ ] **Step 2: 更新 controller import**

修改 `tgmall-api/src/controllers/merchant.controller.js`：

```js
// 将 admin 相关 handler 的 import 从 './merchant.service.js' 改为 './admin.service.js'
import * as adminService from '../services/admin.service.js';
```

对于 controller 中调用 `merchantService.xxx(merchantId, ...)` 的地方，改为 `adminService.xxx(...)` 并去掉 `merchantId` 参数（从 `defaultMerchant` 中间件设置的 `req.merchantId` 不再需要）。

- [ ] **Step 3: 删除 merchant.service.js 中的商户注册/登录/审核方法**

保留 `merchant.service.js` 文件壳（后续完全清理），删除 `registerMerchant`、`merchantLogin`、`merchantWebLogin`、`approveMerchant`、`rejectMerchant` 函数。

- [ ] **Step 4: Commit**

```bash
git add tgmall-api/src/services/ tgmall-api/src/controllers/
git commit -m "refactor(api): split admin.service.js from merchant.service.js"
```

### Task 12: 删除 tgmall-merchant/ 目录

**Files:**
- Delete: `tgmall-merchant/`

- [ ] **Step 1: 删除商户前端**

```bash
git rm -r tgmall-merchant/
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove V1 merchant frontend (deprecated)"
```

### Task 13: 删除管理后台商户审批页面

**Files:**
- Delete: `tgmall-admin/src/pages/MerchantsPage.vue`
- Delete: `tgmall-admin/src/pages/MerchantDetailPage.vue`
- Modify: `tgmall-admin/src/router/index.js`
- Modify: `tgmall-admin/src/components/layout/Sidebar.vue`

- [ ] **Step 1: 删除页面文件**

```bash
git rm tgmall-admin/src/pages/MerchantsPage.vue tgmall-admin/src/pages/MerchantDetailPage.vue
```

- [ ] **Step 2: 从路由中移除**

在 `tgmall-admin/src/router/index.js` 中删除：
```js
import MerchantsPage from '@/pages/MerchantsPage.vue';
import MerchantDetailPage from '@/pages/MerchantDetailPage.vue';
// 以及 routes 中对应的 { path: '/merchants', ... } 和 { path: '/merchants/:id', ... }
```

- [ ] **Step 3: 从侧边栏移除商户管理**

在 `tgmall-admin/src/components/layout/Sidebar.vue` 中删除商家管理菜单项。

- [ ] **Step 4: Commit**

```bash
git add tgmall-admin/
git commit -m "chore(admin): remove merchant approval pages"
```

### Task 14: Prisma 清理 — 注释 Merchant 模型

**Files:**
- Modify: `tgmall-api/prisma/schema.prisma`

- [ ] **Step 1: 用 @@ignore 注释 Merchant 模型**

在 `model Merchant` 前添加：

```prisma
// @@ignore — 公司自营模式下不再需要商户模型
```

同时从 `User`、`Product`、`Order` 模型中删除 `merchantId` 和 `merchant` 关联字段。

- [ ] **Step 2: 清理 Coupon 模型中的 merchantId**

从 `Coupon` 模型删除 `merchantId` 和 `merchant` 字段。

- [ ] **Step 3: 生成迁移**

```bash
cd tgmall-api && npx prisma migrate dev --name remove_merchant_model
```

- [ ] **Step 4: 清理 middleware/defaultMerchant.js**

```bash
git rm tgmall-api/src/middleware/defaultMerchant.js
```

更新 `admin.routes.js` 去掉 `defaultMerchant` 中间件的 import 和使用。

- [ ] **Step 5: Cleanup seed.js**

将 `tgmall-api/prisma/seed.js` 中所有 `merchant` 相关的创建改为直接使用平台默认数据。

- [ ] **Step 6: Commit**

```bash
git add tgmall-api/
git commit -m "refactor(db): remove Merchant model — company-operated mode"
```

---

## Phase 6: Full Test Verification

### Task 15: 全量测试 + merchant 残留扫描

- [ ] **Step 1: 运行全量 API 测试**

```bash
cd tgmall-api && npm test
```

预期：全部通过。

- [ ] **Step 2: 运行全量 Mini App 测试**

```bash
cd tgmall-miniapp && npx vitest run
```

预期：50 tests 全部通过。

- [ ] **Step 3: Merchant 残留扫描**

```bash
grep -r "merchant" --include="*.js" --include="*.vue" tgmall-api/src/ tgmall-admin/src/ 2>/dev/null | grep -v "node_modules" | grep -v ".prisma" | grep -v "admin.routes.js" || echo "CLEAN"
```

预期：仅 `merchant.service.js`（待后续物理删除）和 `merchant.controller.js` 中有残留，其余位置为 `admin` 相关引用或 `merchantProductSchema`（可重命名但非阻塞）。

- [ ] **Step 4: 从 routes/index.js 清理 merchant import 残留**

确认 `tgmall-api/src/routes/index.js` 不再 import `merchantRouter`。

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: final cleanup + verify tests pass post-merchant-removal"
```

---

## Plan Completion Checklist

- [ ] Phase 1: Schema (StockLog, InventoryCheck, alertThreshold) — Task 1
- [ ] Phase 2: Inventory service + controller + routes + tests — Tasks 2-6
- [ ] Phase 3: Order service StockLog integration — Task 7
- [ ] Phase 4: Admin InventoryPage + ProductsPage enhancement — Tasks 8-9
- [ ] Phase 5: Merchant cleanup (routes, service, frontend, pages, Prisma) — Tasks 10-14
- [ ] Phase 6: Full test verification — Task 15
