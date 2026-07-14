# 商品管理列表三语名称展示实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在运营后台商品管理列表页同时展示高棉语、英语、中文三语名称。

**Architecture:** 将 `ProductsPage.vue` 中「名称」列的 `prop="nameKm"` 替换为自定义模板，主行显示 `nameKm`，副行显示 `nameEn` 与 `nameZh`（可空）。新增 `ProductsPage.test.js` 覆盖三语渲染与缺省场景。

**Tech Stack:** Vue 3 · Element Plus · Vitest · @vue/test-utils

## Global Constraints

- 只修改 `tgmall-admin/src/pages/ProductsPage.vue`。
- 新增 `tgmall-admin/tests/unit/ProductsPage.test.js`。
- 样式使用 `scoped`，避免影响其他页面。
- 单元测试必须覆盖：三语齐全、缺少英文、缺少中文、两者皆空。
- 所有输出（注释、提交信息、文档）使用中文。

---

## File Structure

| 文件 | 类型 | 职责 |
|------|------|------|
| `tgmall-admin/src/pages/ProductsPage.vue` | 修改 | 商品列表页，渲染三语名称列 |
| `tgmall-admin/tests/unit/ProductsPage.test.js` | 新增 | 覆盖三语名称渲染与缺省场景 |

---

### Task 1: 编写失败的单元测试

**Files:**
- Create: `tgmall-admin/tests/unit/ProductsPage.test.js`

**Interfaces:**
- Consumes: `@/api` 的 `getProducts`、`toggleProduct`
- Produces: 测试用例断言 `ProductsPage.vue` 的三语名称渲染行为

- [ ] **Step 1: 创建测试文件并 mock API**

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import ProductsPage from '@/pages/ProductsPage.vue';

vi.mock('@/api', () => ({
  getProducts: vi.fn(() => Promise.resolve({
    data: [
      { id: 'p1', nameKm: 'ទំនិញA', nameEn: 'Product A', nameZh: '商品A', priceUsd: 4.5, stock: 100, status: 'active' },
      { id: 'p2', nameKm: 'ទំនិញB', nameEn: 'Product B', nameZh: '', priceUsd: 11, stock: 50, status: 'active' },
      { id: 'p3', nameKm: 'ទំនិញC', nameEn: '', nameZh: '商品C', priceUsd: 14, stock: 30, status: 'active' },
      { id: 'p4', nameKm: 'ទំនិញD', nameEn: '', nameZh: '', priceUsd: 9.5, stock: 20, status: 'active' },
    ],
    meta: { total: 4 },
  })),
  toggleProduct: vi.fn(),
}));

async function mountPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();
  return mount(ProductsPage, {
    global: {
      mocks: { $t: (key) => key },
      plugins: [router],
    },
    attachTo: document.body,
  });
}
```

- [ ] **Step 2: 添加三语渲染与缺省断言**

```js
describe('ProductsPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
  });

  it('renders trilingual product names', async () => {
    wrapper = await mountPage();
    await flushPromises();

    const rows = wrapper.findAll('.el-table__row');
    expect(rows.length).toBe(4);

    const first = rows[0].find('[data-testid="product-name"]');
    expect(first.text()).toContain('ទំនិញA');
    expect(first.text()).toContain('Product A');
    expect(first.text()).toContain('商品A');
  });

  it('hides missing secondary names cleanly', async () => {
    wrapper = await mountPage();
    await flushPromises();

    const rows = wrapper.findAll('.el-table__row');
    expect(rows[1].find('[data-testid="product-name"]').text()).toContain('Product B');
    expect(rows[1].find('[data-testid="product-name"]').text()).not.toContain('·');

    expect(rows[2].find('[data-testid="product-name"]').text()).toContain('商品C');
    expect(rows[2].find('[data-testid="product-name"]').text()).not.toContain('·');

    expect(rows[3].find('[data-testid="product-name"]').text()).toBe('ទំនិញD');
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run:
```bash
cd /Users/qinzz/Desktop/telegrammall/tgmall-admin && npx vitest run tests/unit/ProductsPage.test.js
```

Expected: FAIL（`[data-testid="product-name"]` 不存在）

- [ ] **Step 4: Commit**

```bash
git add tgmall-admin/tests/unit/ProductsPage.test.js
git commit -m "test(admin): 商品管理三语名称展示失败测试"
```

---

### Task 2: 实现三语名称列

**Files:**
- Modify: `tgmall-admin/src/pages/ProductsPage.vue`

**Interfaces:**
- Consumes: API 返回的 `nameKm`、`nameEn`、`nameZh`
- Produces: 表格「名称」列展示主标题（柬文）与副标题（英文/中文）

- [ ] **Step 1: 替换名称列为自定义模板**

将 `ProductsPage.vue` 第 8 行：

```vue
<el-table-column prop="nameKm" :label="$t('products.name')" min-width="150" />
```

替换为：

```vue
<el-table-column :label="$t('products.name')" min-width="180">
  <template #default="{ row }">
    <div data-testid="product-name">
      <div class="product-name-km">{{ row.nameKm }}</div>
      <div v-if="row.nameEn || row.nameZh" class="product-name-sub">
        {{ row.nameEn }}<span v-if="row.nameEn && row.nameZh"> · </span>{{ row.nameZh }}
      </div>
    </div>
  </template>
</el-table-column>
```

- [ ] **Step 2: 添加 scoped 样式**

在 `ProductsPage.vue` 的 `<style scoped>` 中追加：

```css
.product-name-km {
  line-height: 1.4;
}
.product-name-sub {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 2px;
}
```

- [ ] **Step 3: 运行测试确认通过**

Run:
```bash
cd /Users/qinzz/Desktop/telegrammall/tgmall-admin && npx vitest run tests/unit/ProductsPage.test.js
```

Expected: PASS

- [ ] **Step 4: 运行全部 admin 单元测试防止回归**

Run:
```bash
cd /Users/qinzz/Desktop/telegrammall/tgmall-admin && npx vitest run
```

Expected: 全部通过

- [ ] **Step 5: Commit**

```bash
git add tgmall-admin/src/pages/ProductsPage.vue tgmall-admin/tests/unit/ProductsPage.test.js
git commit -m "feat(admin): 商品管理列表名称列展示中柬英三语"
```

---

## Self-Review

1. **Spec coverage**
   - 三语同时展示 → Task 2 Step 1 自定义模板
   - 缺省语言处理 → Task 2 Step 1 的 `v-if` 与分隔符条件
   - 单元测试覆盖 → Task 1
   - 不影响其他页面 → 只修改 `ProductsPage.vue`，样式 scoped

2. **Placeholder scan**
   - 无 TBD/TODO/"后续实现" 等占位符。

3. **Type 一致性**
   - API 字段 `nameKm`/`nameEn`/`nameZh` 与模板使用一致；测试 mock 数据与模板一致。

---

## 执行方式

Plan complete and saved to `docs/superpowers/plans/2026-07-14-admin-products-trilingual-name-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** - 每个 Task 派独立子代理执行，适合严格按步骤审查。
2. **Inline Execution** - 在当前会话中批量执行，适合快速完成。

Which approach?
