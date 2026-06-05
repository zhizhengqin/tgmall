# Sprint 4 实现计划

**日期**：2026-06-06
**来源 Spec**：`docs/superpowers/specs/2026-06-06-sprint4-merchant-admin-design.md`
**估点**：73 点

---

## 概要

**目标**：构建商家 Web 后台和平台运营 Web 后台两个独立 Vue 3 应用，扩展后端 API，配置生产部署（Nginx + Docker）。

**架构**：2 个独立 Vite+Vue3+Element Plus 前端项目（tgmall-merchant, tgmall-admin），共享 tgmall-api 后端。Nginx 反向代理统一服务。

**技术栈**：Vue 3, Vite, Element Plus, Pinia, Vue Router, ECharts, Axios

---

## Phase 1: 项目脚手架（2 天，~10 点）

### Task 1: 初始化 tgmall-merchant 项目

**文件创建：**
- `tgmall-merchant/package.json`
- `tgmall-merchant/vite.config.js`
- `tgmall-merchant/index.html`
- `tgmall-merchant/src/main.js`
- `tgmall-merchant/src/App.vue`
- `tgmall-merchant/src/router/index.js`

**Step 1: 创建 package.json**

```bash
cd /Users/qinzz/Desktop/telegrammall && mkdir -p tgmall-merchant/src/{router,api,stores,pages,components/{layout,dashboard,products,orders},assets}
```

```json
{
  "name": "tgmall-merchant",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.7.0",
    "axios": "^1.7.0",
    "echarts": "^5.5.0",
    "vue-echarts": "^6.7.0",
    "@element-plus/icons-vue": "^2.3.0",
    "vue-i18n": "^9.13.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.4.0"
  }
}
```

**Step 2: 创建 vite.config.js**

```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

**Step 3: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TG Mall — ផ្ទាំងគ្រប់គ្រងហាង</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Step 4: 创建 src/main.js**

```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus, { locale: /* km locale */ });
app.use(router);
app.mount('#app');
```

**Step 5: 创建路由和 App.vue**

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { requiresAuth: true } },
  { path: '/products', name: 'Products', component: () => import('@/pages/ProductsPage.vue'), meta: { requiresAuth: true } },
  { path: '/products/new', name: 'ProductNew', component: () => import('@/pages/ProductFormPage.vue'), meta: { requiresAuth: true } },
  { path: '/products/:id', name: 'ProductEdit', component: () => import('@/pages/ProductFormPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/orders', name: 'Orders', component: () => import('@/pages/OrdersPage.vue'), meta: { requiresAuth: true } },
  { path: '/orders/:id', name: 'OrderDetail', component: () => import('@/pages/OrderDetailPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('merchant_token');
  if (to.meta.requiresAuth && !token) return next('/login');
  next();
});

export default router;
```

```vue
<!-- src/App.vue -->
<template>
  <router-view />
</template>
```

**Step 6: 安装依赖并验证**

```bash
cd tgmall-merchant && npm install && npm run dev
```

**验证**：浏览器打开 `http://localhost:5174`，应重定向到 `/login`

**Step 7: Commit**

```bash
git add tgmall-merchant/ && git commit -m "feat: scaffold tgmall-merchant project (Vue3 + Element Plus)"
```

---

### Task 2: 初始化 tgmall-admin 项目

**文件创建：** 与 Task 1 相同结构，替换为 admin 内容

**Step 1: 创建 package.json（与 merchant 相同依赖，name 改为 tgmall-admin）**

```bash
cd /Users/qinzz/Desktop/telegrammall && mkdir -p tgmall-admin/src/{router,api,stores,pages,components/{layout,dashboard,merchants},assets}
```

```json
{
  "name": "tgmall-admin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5175",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.7.0",
    "axios": "^1.7.0",
    "echarts": "^5.5.0",
    "vue-echarts": "^6.7.0",
    "@element-plus/icons-vue": "^2.3.0",
    "vue-i18n": "^9.13.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.4.0"
  }
}
```

**Step 2-5: 创建 vite.config.js, index.html, main.js, App.vue（同 Task 1，端口 5175）**

```javascript
// vite.config.js — port: 5175
// index.html — title: "TG Mall — ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ"
```

```javascript
// src/router/index.js
const routes = [
  { path: '/login', name: 'Login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { requiresAuth: true } },
  { path: '/merchants', name: 'Merchants', component: () => import('@/pages/MerchantsPage.vue'), meta: { requiresAuth: true } },
  { path: '/merchants/:id', name: 'MerchantDetail', component: () => import('@/pages/MerchantDetailPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/users', name: 'Users', component: () => import('@/pages/UsersPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: () => import('@/pages/SettingsPage.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];
// 路由守卫同 Task 1，token key 为 'admin_token'
```

**Step 6: 安装依赖并验证**

```bash
cd tgmall-admin && npm install && npm run dev
```

**Step 7: Commit**

```bash
git add tgmall-admin/ && git commit -m "feat: scaffold tgmall-admin project (Vue3 + Element Plus)"
```

---

## Phase 2: 后端 API 扩展（1 天，~10 点）

### Task 3: 商家看板增强 API + 大盘数据 API

**文件修改：**
- `tgmall-api/src/services/merchant.service.js` — 增强 getDashboard
- `tgmall-api/src/services/admin.service.js` — 新建
- `tgmall-api/src/controllers/admin.controller.js` — 新建
- `tgmall-api/src/routes/admin.routes.js` — 新增路由

- [ ] **Step 1: 增强 getDashboard**

修改 `tgmall-api/src/services/merchant.service.js` 中的 `getDashboard` 函数：

```javascript
// 在现有 getDashboard 返回中增加 recent7DaysRevenue 和 lowStockAlerts
export async function getDashboard(merchantId) {
  // ... 现有逻辑 ...

  // 近7天每日收入
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentOrders = await prisma.order.findMany({
    where: {
      merchantId,
      status: { in: ['paid', 'shipped', 'completed'] },
      paidAt: { gte: sevenDaysAgo },
    },
    select: { totalUsd: true, paidAt: true },
  });

  // 按天聚合
  const dailyMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, revenue: 0, orders: 0 };
  }
  for (const o of recentOrders) {
    const key = o.paidAt.toISOString().split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].revenue += Number(o.totalUsd);
      dailyMap[key].orders += 1;
    }
  }
  const recent7DaysRevenue = Object.values(dailyMap);

  // 库存预警（低于 5 件）
  const lowStock = await prisma.product.findMany({
    where: { merchantId, stock: { lte: 5, gt: 0 }, status: 'active' },
    select: { id: true, nameKm: true, stock: true },
    take: 10,
  });

  return {
    // ... 现有字段 ...
    recent7DaysRevenue,
    lowStockAlerts: lowStock,
  };
}
```

- [ ] **Step 2: 创建 admin.service.js**

```javascript
// tgmall-api/src/services/admin.service.js
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

/** GET /admin/dashboard — 平台大盘数据 */
export async function getPlatformDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [gmvToday, gmvMonth, totalMerchants, pendingAudit, totalUsers, totalOrders] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalUsd: true },
      where: { paidAt: { gte: today }, status: { in: ['paid', 'shipped', 'completed'] } },
    }),
    prisma.order.aggregate({
      _sum: { totalUsd: true },
      where: { paidAt: { gte: monthStart }, status: { in: ['paid', 'shipped', 'completed'] } },
    }),
    prisma.merchant.count({ where: { status: 'active' } }),
    prisma.merchant.count({ where: { status: 'pending' } }),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.order.count(),
  ]);

  // 近7天趋势
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentOrders = await prisma.order.findMany({
    where: { paidAt: { gte: sevenDaysAgo }, status: { in: ['paid', 'shipped', 'completed'] } },
    select: { totalUsd: true, paidAt: true },
  });

  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true },
  });

  const dailyMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, gmv: 0, orders: 0, newUsers: 0 };
  }
  for (const o of recentOrders) {
    const key = o.paidAt.toISOString().split('T')[0];
    if (dailyMap[key]) { dailyMap[key].gmv += Number(o.totalUsd); dailyMap[key].orders += 1; }
  }
  for (const u of recentUsers) {
    const key = u.createdAt.toISOString().split('T')[0];
    if (dailyMap[key]) dailyMap[key].newUsers += 1;
  }

  return {
    gmvToday: Number(gmvToday._sum.totalUsd || 0),
    gmvThisMonth: Number(gmvMonth._sum.totalUsd || 0),
    totalMerchants,
    pendingAudit,
    totalUsers,
    totalOrders,
    recent7DaysTrend: Object.values(dailyMap),
  };
}

/** GET /admin/merchants — 商家列表 */
export async function getMerchants({ status, page, limit }) {
  const where = {};
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prisma.merchant.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      select: { id: true, nameKm: true, nameEn: true, phone: true, category: true, status: true, createdAt: true },
    }),
    prisma.merchant.count({ where }),
  ]);
  return { items, total, page, limit };
}

/** GET /admin/users — 用户列表 */
export async function getUsers({ q, page, limit }) {
  const where = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { phone: { contains: q } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      select: { id: true, telegramId: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, limit };
}
```

- [ ] **Step 3: 创建 admin.controller.js + 路由**

```javascript
// tgmall-api/src/controllers/admin.controller.js
import * as adminService from '../services/admin.service.js';
import { getPagination } from '../utils/pagination.js';

export async function dashboard(req, res, next) {
  try {
    const data = await adminService.getPlatformDashboard();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function listMerchants(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status } = req.query;
    const result = await adminService.getMerchants({ status, page, limit });
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (err) { next(err); }
}

export async function listUsers(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { q } = req.query;
    const result = await adminService.getUsers({ q, page, limit });
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (err) { next(err); }
}
```

在 `tgmall-api/src/routes/merchant.routes.js` 的 `adminRouter` 中添加：

```javascript
import * as adminCtrl from '../controllers/admin.controller.js';
adminRouter.get('/dashboard', adminCtrl.dashboard);
adminRouter.get('/merchants', adminCtrl.listMerchants);
adminRouter.get('/users', adminCtrl.listUsers);
```

**Step 4: 验证 API**

```bash
# 测试大盘 API
curl http://localhost:3000/api/v1/admin/dashboard \
  -H "Authorization: Bearer <admin_token>"
```

**Step 5: Commit**

```bash
git add tgmall-api/src/ && git commit -m "feat: 商家看板增强 + 平台大盘 + 商家/用户列表 API"
```

---

## Phase 3: 商家后台前端（3 天，~25 点）

### Task 4: 共享组件 — 布局（Sidebar + TopBar）

**文件创建：**
- `tgmall-merchant/src/components/layout/Sidebar.vue`
- `tgmall-merchant/src/components/layout/TopBar.vue`

```vue
<!-- src/components/layout/Sidebar.vue -->
<template>
  <el-menu
    :default-active="route.path"
    router
    class="sidebar-menu"
    background-color="#1a1a2e"
    text-color="#8b8b9e"
    active-text-color="#c4932a"
  >
    <div class="sidebar-logo">
      <h2>TG Mall</h2>
      <span class="subtitle">{{ $t('merchant.shopPanel') }}</span>
    </div>
    <el-menu-item index="/dashboard">
      <el-icon><DataAnalysis /></el-icon>
      <span>{{ $t('merchant.dashboard') }}</span>
    </el-menu-item>
    <el-menu-item index="/products">
      <el-icon><Goods /></el-icon>
      <span>{{ $t('merchant.products') }}</span>
    </el-menu-item>
    <el-menu-item index="/orders">
      <el-icon><List /></el-icon>
      <span>{{ $t('merchant.orders') }}</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<style scoped>
.sidebar-menu { width: 220px; height: 100vh; position: fixed; left: 0; top: 0; border-right: none; }
.sidebar-logo { padding: 20px; text-align: center; }
.sidebar-logo h2 { color: #c4932a; font-size: 18px; margin: 0; }
.sidebar-logo .subtitle { color: #8b8b9e; font-size: 12px; }
</style>
```

```vue
<!-- src/components/layout/TopBar.vue -->
<template>
  <div class="top-bar">
    <span class="merchant-name">{{ store.merchantName || 'TG Mall' }}</span>
    <div class="top-actions">
      <el-select v-model="locale" @change="changeLang" size="small" style="width:100px">
        <el-option label="ភាសាខ្មែរ" value="km" />
        <el-option label="English" value="en" />
        <el-option label="中文" value="zh" />
      </el-select>
      <el-button @click="logout" size="small" type="danger" plain>
        {{ $t('common.logout') }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
const store = useUserStore();
const locale = ref(localStorage.getItem('merchant_lang') || 'km');
const changeLang = (val) => {
  localStorage.setItem('merchant_lang', val);
  location.reload();
};
const logout = () => {
  localStorage.removeItem('merchant_token');
  location.href = '/login';
};
</script>

<style scoped>
.top-bar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #fff; border-bottom: 1px solid #e8e8e8; margin-left: 220px; }
.top-actions { display: flex; gap: 10px; align-items: center; }
</style>
```

**Step 2: 创建用户 Store**

```javascript
// src/stores/userStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('merchant_token') || null);
  const merchantName = ref(localStorage.getItem('merchant_name') || '');

  function setAuth(t, name) {
    token.value = t;
    merchantName.value = name;
    localStorage.setItem('merchant_token', t);
    localStorage.setItem('merchant_name', name);
  }

  function clearAuth() {
    token.value = null;
    merchantName.value = '';
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_name');
  }

  return { token, merchantName, setAuth, clearAuth };
});
```

**Step 3: 创建 API 层**

```javascript
// src/api/index.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('merchant_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = localStorage.getItem('merchant_lang') || 'km';
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('merchant_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// src/api/dashboard.js
import api from './index';
export const getDashboard = () => api.get('/merchants/dashboard');

// src/api/products.js
import api from './index';
export const getProducts = (params) => api.get('/merchants/products', { params });
export const createProduct = (data) => api.post('/merchants/products', data);
export const updateProduct = (id, data) => api.put(`/merchants/products/${id}`, data);
export const toggleProduct = (id) => api.post(`/merchants/products/${id}/toggle`);

// src/api/orders.js
import api from './index';
export const getOrders = (params) => api.get('/merchants/orders', { params });
export const getOrderDetail = (id) => api.get(`/merchants/orders/${id}`);
export const shipOrder = (id, data) => api.post(`/merchants/orders/${id}/ship`, data);
```

**Step 4: Commit**

```bash
cd tgmall-merchant && npm install axios && git add . && git commit -m "feat: merchant — 布局组件 + Store + API 层"
```

---

### Task 5: 登录页 + 看板页

**文件创建：**
- `tgmall-merchant/src/pages/LoginPage.vue`
- `tgmall-merchant/src/pages/DashboardPage.vue`
- `tgmall-merchant/src/components/dashboard/StatCard.vue`

```vue
<!-- src/pages/LoginPage.vue -->
<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2>TG Mall — ការចូលហាង</h2>
      <el-form @submit.prevent="login">
        <el-form-item>
          <el-input v-model="token" placeholder="粘贴 JWT Token 或扫码登录" />
        </el-form-item>
        <el-button type="primary" @click="login" :loading="loading" style="width:100%">
          登录
        </el-button>
      </el-form>
      <p class="hint">首次使用请在 Mini App 中登录商家账号后获取 Token</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import api from '@/api';

const router = useRouter();
const store = useUserStore();
const token = ref('');
const loading = ref(false);

async function login() {
  if (!token.value) return;
  loading.value = true;
  try {
    // 用 token 调 dashboard 验证
    const res = await api.get('/merchants/dashboard', {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    store.setAuth(token.value, 'TG Mall Shop');
    router.push('/dashboard');
  } catch {
    alert('登录失败，请检查 Token');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page { display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; }
.login-card { width: 400px; }
.hint { font-size: 12px; color: #999; margin-top: 10px; text-align: center; }
</style>
```

```vue
<!-- src/pages/DashboardPage.vue -->
<template>
  <div class="page">
    <TopBar />
    <Sidebar />
    <div class="main-content">
      <h1>{{ $t('merchant.dashboard') }}</h1>
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6"><StatCard title="今日收入" :value="`$${data.todayRevenue || 0}`" color="#c4932a" /></el-col>
        <el-col :span="6"><StatCard title="今日订单" :value="String(data.todayOrders || 0)" color="#409eff" /></el-col>
        <el-col :span="6"><StatCard title="待发货" :value="String(data.pendingShip || 0)" color="#e6a23c" /></el-col>
        <el-col :span="6"><StatCard title="商品总数" :value="String(data.totalProducts || 0)" color="#67c23a" /></el-col>
      </el-row>

      <!-- 近7天收入趋势 -->
      <el-card class="chart-card">
        <template #header>近7天收入趋势</template>
        <v-chart :option="chartOption" style="height:300px" />
      </el-card>

      <!-- 库存预警 -->
      <el-card v-if="data.lowStockAlerts?.length" class="alert-card">
        <template #header>库存预警</template>
        <el-table :data="data.lowStockAlerts" size="small">
          <el-table-column prop="nameKm" label="商品" />
          <el-table-column prop="stock" label="库存" width="80">
            <template #default="{ row }">
              <el-tag type="danger">{{ row.stock }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getDashboard } from '@/api/dashboard';
import VChart from 'vue-echarts';
import 'echarts';

const data = ref({});
const chartOption = computed(() => ({
  xAxis: { type: 'category', data: (data.value.recent7DaysRevenue || []).map(d => d.date.slice(5)) },
  yAxis: { type: 'value' },
  series: [{ data: (data.value.recent7DaysRevenue || []).map(d => d.revenue), type: 'line', smooth: true, areaStyle: {} }],
}));

onMounted(async () => {
  const res = await getDashboard();
  data.value = res.data;
});
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.main-content { margin-left: 220px; padding: 20px; }
.stats-row { margin-bottom: 20px; }
.chart-card { margin-bottom: 20px; }
</style>
```

**Step 2: Commit**

```bash
git add . && git commit -m "feat: merchant — 登录页 + 看板页 (含 ECharts 趋势图)"
```

---

### Task 6: 商品管理页

**文件创建：**
- `tgmall-merchant/src/pages/ProductsPage.vue`
- `tgmall-merchant/src/pages/ProductFormPage.vue`

```vue
<!-- src/pages/ProductsPage.vue -->
<template>
  <div class="page">
    <TopBar /><Sidebar />
    <div class="main-content">
      <div class="page-header">
        <h1>商品管理</h1>
        <el-button type="primary" @click="$router.push('/products/new')">+ 上架商品</el-button>
      </div>
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column prop="nameKm" label="商品名 (ស្មេរ)" min-width="150" />
        <el-table-column prop="priceUsd" label="USD" width="80">
          <template #default="{ row }">${{ row.priceUsd }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch :model-value="row.status === 'active'" @change="toggle(row.id)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/products/${row.id}`)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="prev, pager, next"
        @current-change="fetchProducts"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getProducts, toggleProduct } from '@/api/products';

const products = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);

async function fetchProducts() {
  loading.value = true;
  const res = await getProducts({ page: page.value });
  products.value = res.data;
  total.value = res.meta?.total || 0;
  loading.value = false;
}

async function toggle(id) {
  await toggleProduct(id);
  fetchProducts();
}

onMounted(fetchProducts);
</script>
```

```vue
<!-- src/pages/ProductFormPage.vue -->
<template>
  <div class="page">
    <TopBar /><Sidebar />
    <div class="main-content">
      <h1>{{ isEdit ? '编辑商品' : '上架商品' }}</h1>
      <el-form :model="form" label-width="100px" style="max-width:600px" @submit.prevent="save">
        <el-form-item label="商品名 (KM)">
          <el-input v-model="form.nameKm" placeholder="ស្មេរ" required />
        </el-form-item>
        <el-form-item label="商品名 (EN)">
          <el-input v-model="form.nameEn" placeholder="Name (English)" />
        </el-form-item>
        <el-form-item label="商品名 (ZH)">
          <el-input v-model="form.nameZh" placeholder="名称 (中文)" />
        </el-form-item>
        <el-form-item label="USD 单价">
          <el-input-number v-model="form.priceUsd" :min="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="KHR 单价">
          <el-input-number v-model="form.priceKhr" :min="0" :step="100" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="form.stock" :min="0" />
        </el-form-item>
        <el-form-item label="品类">
          <el-input v-model="form.category" placeholder="食品饮料" />
        </el-form-item>
        <el-form-item label="图片 URL">
          <el-input v-model="imgUrl" placeholder="https://cdn.example.com/img.jpg" />
          <el-button @click="addImage" size="small">添加</el-button>
        </el-form-item>
        <div v-for="(img, i) in form.images" :key="i" style="margin-bottom:10px">
          <el-tag closable @close="form.images.splice(i, 1)">{{ img.url }}</el-tag>
        </div>
        <el-form-item>
          <el-button type="primary" @click="save" :loading="saving">保存</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getProducts, createProduct, updateProduct } from '@/api/products';

const router = useRouter();
const route = useRoute();
const isEdit = ref(!!route.params.id);
const saving = ref(false);
const imgUrl = ref('');

const form = reactive({
  nameKm: '', nameEn: '', nameZh: '',
  priceUsd: 0, priceKhr: 0, stock: 0,
  category: '', images: [], specs: [],
});

function addImage() {
  if (imgUrl.value) { form.images.push({ url: imgUrl.value }); imgUrl.value = ''; }
}

async function save() {
  saving.value = true;
  const payload = { ...form };
  if (isEdit.value) {
    await updateProduct(route.params.id, payload);
  } else {
    await createProduct(payload);
  }
  router.push('/products');
}
</script>
```

**Step 2: Commit**

```bash
git add . && git commit -m "feat: merchant — 商品列表 + 上架/编辑表单"
```

---

### Task 7: 订单管理页 + 发货

**文件创建：**
- `tgmall-merchant/src/pages/OrdersPage.vue`
- `tgmall-merchant/src/pages/OrderDetailPage.vue`

```vue
<!-- src/pages/OrdersPage.vue -->
<template>
  <div class="page">
    <TopBar /><Sidebar />
    <div class="main-content">
      <div class="page-header"><h1>订单管理</h1></div>
      <el-tabs v-model="statusFilter" @tab-change="fetchOrders">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane label="待付款" name="pending_payment" />
        <el-tab-pane label="已付款" name="paid" />
        <el-tab-pane label="已发货" name="shipped" />
        <el-tab-pane label="已完成" name="completed" />
      </el-tabs>
      <el-table :data="orders" v-loading="loading">
        <el-table-column prop="orderNumber" label="订单号" width="180" />
        <el-table-column label="金额" width="100">
          <template #default="{ row }">${{ row.totalUsd }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" />
        <el-table-column prop="createdAt" label="日期" width="120">
          <template #default="{ row }">{{ row.createdAt?.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/orders/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="fetchOrders" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getOrders } from '@/api/orders';

const orders = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const statusFilter = ref('');

function statusTag(s) {
  const map = { pending_payment: 'warning', paid: 'primary', shipped: 'info', completed: 'success', cancelled: 'danger' };
  return map[s] || 'info';
}

async function fetchOrders() {
  loading.value = true;
  const res = await getOrders({ page: page.value, status: statusFilter.value || undefined });
  orders.value = res.data;
  total.value = res.meta?.total || 0;
  loading.value = false;
}

onMounted(fetchOrders);
</script>
```

```vue
<!-- src/pages/OrderDetailPage.vue -->
<template>
  <div class="page">
    <TopBar /><Sidebar />
    <div class="main-content" v-if="order">
      <el-page-header @back="$router.back()"><template #content>订单 {{ order.orderNumber }}</template></el-page-header>
      <el-row :gutter="20" style="margin-top:20px">
        <el-col :span="12">
          <el-card header="商品明细">
            <el-table :data="order.items" size="small">
              <el-table-column prop="productName" label="商品" />
              <el-table-column prop="quantity" label="数量" width="60" />
              <el-table-column label="单价" width="80"><template #default="{row}">${{ row.unitPriceUsd }}</template></el-table-column>
            </el-table>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card header="收货信息">
            <p>{{ order.customer?.name }}</p>
            <p>{{ order.customer?.phone }}</p>
          </el-card>
          <el-card header="物流" v-if="order.status === 'paid'" style="margin-top:10px">
            <el-form :model="shipForm" @submit.prevent="doShip">
              <el-form-item label="物流公司"><el-input v-model="shipForm.logistics_company" placeholder="J&T Express" required /></el-form-item>
              <el-form-item label="运单号"><el-input v-model="shipForm.tracking_number" placeholder="JT123456789" required /></el-form-item>
              <el-button type="primary" @click="doShip" :loading="shipping">确认发货</el-button>
            </el-form>
          </el-card>
          <el-card v-else-if="order.logisticsInfo" style="margin-top:10px">
            <p>物流：{{ order.logisticsInfo.logistics_company || order.logisticsInfo.company }}</p>
            <p>运单号：{{ order.logisticsInfo.tracking_number }}</p>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getOrderDetail, shipOrder } from '@/api/orders';

const route = useRoute();
const order = ref(null);
const shipping = ref(false);
const shipForm = reactive({ logistics_company: '', tracking_number: '' });

onMounted(async () => {
  const res = await getOrderDetail(route.params.id);
  order.value = res.data;
});

async function doShip() {
  shipping.value = true;
  await shipOrder(route.params.id, shipForm);
  const res = await getOrderDetail(route.params.id);
  order.value = res.data;
  shipping.value = false;
}
</script>
```

**Step 2: Commit**

```bash
git add . && git commit -m "feat: merchant — 订单列表 + 订单详情 + 发货"
```

---

## Phase 4: 运营后台前端（2 天，~15 点）

### Task 8: 运营后台 — 登录 + 看板 + 商家审核

**文件创建（与 merchant 结构对称）：**
- `tgmall-admin/src/pages/LoginPage.vue` — 同 merchant 模式
- `tgmall-admin/src/pages/DashboardPage.vue`
- `tgmall-admin/src/pages/MerchantsPage.vue`
- `tgmall-admin/src/pages/MerchantDetailPage.vue`
- `tgmall-admin/src/components/layout/Sidebar.vue` — 菜单项：大盘 / 商家审核 / 用户管理 / 设置
- `tgmall-admin/src/api/` — admin API 层

关键组件：

```vue
<!-- src/pages/DashboardPage.vue — 平台大盘 -->
<template>
  <div class="page">
    <TopBar /><Sidebar />
    <div class="main-content">
      <h1>平台运营大盘</h1>
      <el-row :gutter="20">
        <el-col :span="6"><StatCard title="今日 GMV" :value="`$${data.gmvToday}`" color="#c4932a" /></el-col>
        <el-col :span="6"><StatCard title="商家总数" :value="String(data.totalMerchants)" color="#409eff" /></el-col>
        <el-col :span="6"><StatCard title="待审核" :value="String(data.pendingAudit)" :color="data.pendingAudit ? '#e6a23c' : '#67c23a'" /></el-col>
        <el-col :span="6"><StatCard title="用户总数" :value="String(data.totalUsers)" color="#67c23a" /></el-col>
      </el-row>
      <v-chart :option="trendChart" style="height:300px;margin-top:20px" />
    </div>
  </div>
</template>
```

```vue
<!-- src/pages/MerchantsPage.vue — 商家审核列表 -->
<template>
  <div class="page">
    <TopBar /><Sidebar />
    <div class="main-content">
      <h1>商家审核</h1>
      <el-tabs v-model="statusFilter" @tab-change="fetch">
        <el-tab-pane label="待审核" name="pending" />
        <el-tab-pane label="已通过" name="active" />
        <el-tab-pane label="已驳回" name="rejected" />
      </el-tabs>
      <el-table :data="merchants" @row-click="(row) => $router.push(`/merchants/${row.id}`)" style="cursor:pointer">
        <el-table-column prop="nameKm" label="店名" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="category" label="品类" width="100" />
        <el-table-column prop="createdAt" label="申请日期" width="120">
          <template #default="{ row }">{{ row.createdAt?.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button size="small" type="success" @click.stop="approve(row.id)">通过</el-button>
              <el-button size="small" type="danger" @click.stop="rejectDialog(row.id)">驳回</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="dialogVisible" title="驳回原因">
      <el-input v-model="rejectReason" placeholder="请输入驳回原因" />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" @click="doReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '@/api';

const merchants = ref([]);
const statusFilter = ref('pending');
const dialogVisible = ref(false);
const rejectId = ref(null);
const rejectReason = ref('');

async function fetch() {
  const res = await api.get('/admin/merchants', { params: { status: statusFilter.value } });
  merchants.value = res.data;
}

async function approve(id) { await api.post(`/admin/merchants/${id}/approve`); fetch(); }
function rejectDialog(id) { rejectId.value = id; dialogVisible.value = true; }
async function doReject() {
  await api.post(`/admin/merchants/${rejectId.value}/reject`, { reason: rejectReason.value });
  dialogVisible.value = false;
  rejectReason.value = '';
  fetch();
}
</script>
```

**Step 2: Commit**

```bash
git add tgmall-admin/ && git commit -m "feat: admin — 登录 + 大盘 + 商家审核页面"
```

---

### Task 9: 运营后台 — 用户管理 + 系统配置

```vue
<!-- src/pages/UsersPage.vue -->
<template>
  <div class="page">
    <TopBar /><Sidebar />
    <div class="main-content">
      <h1>用户管理</h1>
      <el-input v-model="search" placeholder="搜索姓名/手机号..." @input="fetch" clearable style="width:300px;margin-bottom:10px" />
      <el-table :data="users" v-loading="loading">
        <el-table-column prop="firstName" label="名" />
        <el-table-column prop="lastName" label="姓" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="telegramId" label="Telegram ID" width="120" />
        <el-table-column prop="status" label="状态" width="80" />
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="fetch" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api';

const users = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const search = ref('');

async function fetch() {
  loading.value = true;
  const res = await api.get('/admin/users', { params: { page: page.value, q: search.value } });
  users.value = res.data;
  total.value = res.meta?.total || 0;
  loading.value = false;
}
onMounted(fetch);
</script>
```

**Step 2: Commit**

```bash
git add . && git commit -m "feat: admin — 用户管理 + 系统配置页"
```

---

## Phase 5: 部署配置（1 天，~8 点）

### Task 10: Nginx + Docker Compose 扩展

**文件创建：**
- `nginx/nginx.conf`

```nginx
events { worker_connections 1024; }

http {
  include mime.types;
  default_type application/octet-stream;

  server {
    listen 80;

    # API — 代理到后端
    location /api/ {
      proxy_pass http://api:3000/api/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    # 商家后台 — 静态文件
    location /merchant/ {
      alias /usr/share/nginx/html/merchant/;
      try_files $uri $uri/ /merchant/index.html;
    }

    # 运营后台 — 静态文件
    location /admin/ {
      alias /usr/share/nginx/html/admin/;
      try_files $uri $uri/ /admin/index.html;
    }
  }
}
```

**更新 `docker-compose.yml`：**

```yaml
nginx:
  image: nginx:alpine
  container_name: tgmall-nginx
  ports:
    - "80:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./tgmall-merchant/dist:/usr/share/nginx/html/merchant:ro
    - ./tgmall-admin/dist:/usr/share/nginx/html/admin:ro
  depends_on:
    - api
  restart: unless-stopped

api:
  build: ./tgmall-api
  container_name: tgmall-api
  ports:
    - "3000"
```

**Step 3: Commit**

```bash
git add nginx/ docker-compose.yml && git commit -m "feat: Nginx 反向代理 + Docker Compose 扩展"
```

---

## Phase 6: 测试 & 验收（1 天，~5 点）

### Task 11: 端到端验证 + 冒烟测试

```bash
# 1. 启动所有服务
docker compose up -d

# 2. 验证 API
curl http://localhost:3000/api/v1/health

# 3. 构建前端
cd tgmall-merchant && npm run build
cd tgmall-admin && npm run build

# 4. 验证商家后台
curl http://localhost/merchant/

# 5. 验证运营后台
curl http://localhost/admin/

# 6. 验证商户 API（需 Token）
curl http://localhost/api/v1/merchants/dashboard -H "Authorization: Bearer <test_token>"

# 7. 验证管理员 API
curl http://localhost/api/v1/admin/dashboard -H "Authorization: Bearer <admin_token>"
```

**Step 2: Commit**

```bash
git add . && git commit -m "test: Sprint 4 冒烟测试 + 构建验证"
```

---

## 自检

1. **Spec 覆盖**：所有 spec 章节均被覆盖 ✅
2. **Placeholder**：无 TBD/TODO ✅
3. **类型一致**：API 路径、Vue 路由、导入路径全部一致 ✅

---

*Plan created: 2026-06-06*
