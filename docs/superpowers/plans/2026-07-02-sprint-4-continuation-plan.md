# Sprint 4 续：Mini App 运营配置接入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Mini App 真正消费后台运营配置：Banner、品类、城市、配送规则、客服账号。

**Architecture:** 新增 `useShopConfig` composable 统一封装 `api/shopConfig.js` 的调用与状态；新增 `cityStore` 管理当前城市并持久化；HomePage / CategoryPage / CheckoutPage / ProfilePage 分别消费对应数据；结算页按城市配送规则计算运费与起送金额。

**Tech Stack:** Vue 3 · Pinia · Vue Router · Axios · Vitest

## Global Constraints

- 所有用户界面必须三语支持（高棉语/英语/中文），默认高棉语。
- 所有价格必须 USD/KHR 双币种同时显示。
- API 失败必须静默降级，不打断用户核心流程。
- 最小触摸目标 44px。
- 代码风格与现有 `tgmall-miniapp` 保持一致（Composition API、`<script setup>`、scoped CSS、设计 Token）。
- 每个任务必须 TDD：先写测试/用例，再实现，最后跑通。
- 每个任务完成后必须提交一个 commit。

---

### Task 1: 创建 useShopConfig composable 与单元测试

**Files:**
- Create: `tgmall-miniapp/src/composables/useShopConfig.js`
- Create: `tgmall-miniapp/tests/unit/useShopConfig.test.js`

**Interfaces:**
- Consumes: `getBanners`, `getCategories`, `getCities`, `getDeliveryRule`, `getDefaultCustomerService` from `tgmall-miniapp/src/api/shopConfig.js`
- Produces: `{ banners, categories, cities, deliveryRule, customerService, loading, error, load, loadDeliveryRule, reload }`

- [ ] **Step 1: 写失败测试**

```js
// tgmall-miniapp/tests/unit/useShopConfig.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useShopConfig } from '@/composables/useShopConfig.js';

vi.mock('@/api/shopConfig.js', () => ({
  getBanners: vi.fn(),
  getCategories: vi.fn(),
  getCities: vi.fn(),
  getDeliveryRule: vi.fn(),
  getDefaultCustomerService: vi.fn(),
}));

describe('useShopConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('加载时 loading 为 true，成功后保存数据', async () => {
    const { getBanners, getCategories, getCities } = await import('@/api/shopConfig.js');
    getBanners.mockResolvedValue({ data: [{ id: 1, title_km: 'b1', image_url: 'url1' }] });
    getCategories.mockResolvedValue({ data: [{ code: 'fashion', name_km: 'f' }] });
    getCities.mockResolvedValue({ data: [{ code: 'phnom_penh', name_km: '金边' }] });

    const { banners, categories, cities, loading, load } = useShopConfig();
    const promise = load();
    expect(loading.value).toBe(true);
    await promise;
    expect(loading.value).toBe(false);
    expect(banners.value).toHaveLength(1);
    expect(categories.value[0].code).toBe('fashion');
    expect(cities.value[0].code).toBe('phnom_penh');
  });

  it('失败时 error 被设置且 loading 为 false', async () => {
    const { getCategories } = await import('@/api/shopConfig.js');
    getCategories.mockRejectedValue(new Error('network'));

    const { categories, loading, error, load } = useShopConfig();
    await load();
    expect(loading.value).toBe(false);
    expect(error.value).toBeTruthy();
    expect(categories.value).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd tgmall-miniapp && npx vitest run tests/unit/useShopConfig.test.js`
Expected: FAIL — `useShopConfig` not found

- [ ] **Step 3: 最小实现**

```js
// tgmall-miniapp/src/composables/useShopConfig.js
import { ref } from 'vue';
import {
  getBanners,
  getCategories,
  getCities,
  getDeliveryRule,
  getDefaultCustomerService,
} from '@/api/shopConfig.js';

export function useShopConfig() {
  const banners = ref([]);
  const categories = ref([]);
  const cities = ref([]);
  const deliveryRule = ref(null);
  const customerService = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function load({ city = 'phnom_penh' } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const [bRes, cRes, cityRes] = await Promise.all([
        getBanners(city),
        getCategories(),
        getCities(),
      ]);
      banners.value = bRes.data || [];
      categories.value = cRes.data || [];
      cities.value = cityRes.data || [];
    } catch (err) {
      error.value = err;
      console.error('加载运营配置失败:', err);
    } finally {
      loading.value = false;
    }
  }

  async function loadDeliveryRule(cityCode) {
    try {
      const res = await getDeliveryRule(cityCode);
      deliveryRule.value = res.data || null;
    } catch (err) {
      console.error('加载配送规则失败:', err);
      deliveryRule.value = null;
    }
  }

  async function loadCustomerService() {
    try {
      const res = await getDefaultCustomerService();
      customerService.value = res.data || null;
    } catch (err) {
      console.error('加载客服信息失败:', err);
      customerService.value = null;
    }
  }

  function reload(options) {
    return load(options);
  }

  return {
    banners,
    categories,
    cities,
    deliveryRule,
    customerService,
    loading,
    error,
    load,
    loadDeliveryRule,
    loadCustomerService,
    reload,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd tgmall-miniapp && npx vitest run tests/unit/useShopConfig.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add tgmall-miniapp/src/composables/useShopConfig.js tgmall-miniapp/tests/unit/useShopConfig.test.js
git commit -m "feat(miniapp): add useShopConfig composable with tests"
```

---

### Task 2: 首页品类横滑接入后台配置

**Files:**
- Modify: `tgmall-miniapp/src/views/HomePage.vue`

**Interfaces:**
- Consumes: `useShopConfig().categories`
- Produces: `categories` 列表用于 `<button v-for="cat in displayCategories">`

- [ ] **Step 1: 写失败场景验证**

新增/更新 `tgmall-miniapp/tests/unit/useShopConfig.test.js` 中已覆盖 categories 加载。本任务无新增测试文件，依赖 Task 1 的测试。手动验证：启动 dev server，检查首页品类是否正确渲染。

- [ ] **Step 2: 修改 HomePage.vue**

替换硬编码 `categories` 数组为从 `useShopConfig` 读取，并保留 `all` 作为第一个选项。

```diff
 <!-- 在 script setup 顶部添加 -->
 import { useShopConfig } from '@/composables/useShopConfig.js';
 
 <!-- 删除硬编码 -->
-const categories = [
-  { value: 'all', label: '全部' },
-  { value: 'fashion', label: '时尚' },
-  { value: 'beauty', label: '美妆' },
-  { value: 'electronics', label: '电子' },
-  { value: 'home', label: '家居' },
-];
+const { categories: apiCategories, load } = useShopConfig();
+const categories = computed(() => [
+  { value: 'all', label: t('home.all') || '全部' },
+  ...(apiCategories.value || []).map(c => ({
+    value: c.code,
+    label: c[`name_${locale.value}`] || c.name_km || c.code,
+  })),
+]);
```

在 `onMounted` 中调用 `load()`（与商品加载并行）。

- [ ] **Step 3: 运行并手动验证**

Run: `cd tgmall-miniapp && npm run dev`
Expected: 首页品类横滑显示后台配置的品类，切换语言时名称变化。

- [ ] **Step 4: 提交**

```bash
git add tgmall-miniapp/src/views/HomePage.vue
git commit -m "feat(miniapp): home category scroll uses shop config"
```

---

### Task 3: 首页 Banner 轮播接入后台配置

**Files:**
- Modify: `tgmall-miniapp/src/views/HomePage.vue`

**Interfaces:**
- Consumes: `useShopConfig().banners`
- Produces: Banner 轮播 DOM + 滑动/指示器逻辑

- [ ] **Step 1: 实现轮播**

替换 `.banner-placeholder` 为轮播容器。实现横向滑动切换、底部圆点指示器、单图不显示指示器。

```vue
<!-- template 中替换 banner-placeholder -->
<div class="banner-wrap" v-if="banners.length > 0">
  <div class="banner-track" :style="trackStyle" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <div v-for="banner in banners" :key="banner.id" class="banner-slide" @click="onBannerClick(banner)">
      <img :src="banner.image_url" :alt="bannerTitle(banner)" class="banner-img" />
    </div>
  </div>
  <div class="banner-dots" v-if="banners.length > 1">
    <span v-for="(_, i) in banners" :key="i" :class="{ active: currentBanner === i }"></span>
  </div>
</div>
<div v-else class="banner-placeholder">
  <div class="banner-content">
    <span class="banner-icon">🇰🇭</span>
    <span>TG Mall — ទិញទំនិញតាម Telegram</span>
  </div>
</div>
```

```js
// script setup 中添加
const { banners } = useShopConfig();
const currentBanner = ref(0);
const touchStartX = ref(0);

const trackStyle = computed(() => ({
  transform: `translateX(-${currentBanner.value * 100}%)`,
}));

function bannerTitle(banner) {
  return banner[`title_${locale.value}`] || banner.title_km || '';
}

function onTouchStart(e) {
  touchStartX.value = e.touches[0].clientX;
}

function onTouchEnd(e) {
  const diff = touchStartX.value - e.changedTouches[0].clientX;
  if (Math.abs(diff) < 40) return;
  if (diff > 0 && currentBanner.value < banners.value.length - 1) {
    currentBanner.value += 1;
  } else if (diff < 0 && currentBanner.value > 0) {
    currentBanner.value -= 1;
  }
}

function onBannerClick(banner) {
  if (!banner.link_type || !banner.link_target) return;
  if (banner.link_type === 'product') {
    router.push(`/product/${banner.link_target}`);
  } else if (banner.link_type === 'category') {
    router.push({ path: '/', query: { category: banner.link_target } });
  } else if (banner.link_type === 'url') {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) tg.openLink(banner.link_target);
    else window.open(banner.link_target, '_blank');
  }
}
```

- [ ] **Step 2: 添加/更新样式**

在 `<style scoped>` 中添加轮播样式，与设计稿 `01-首页.html` 保持一致：

```css
.banner-wrap {
  margin: var(--space-lg);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  aspect-ratio: 16/7;
  background: var(--bg);
}
.banner-track {
  display: flex;
  height: 100%;
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1.2);
}
.banner-slide {
  min-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner-dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.banner-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  transition: all 0.3s;
}
.banner-dots span.active { background: #fff; width: 18px; border-radius: 3px; }
```

- [ ] **Step 3: 手动验证**

Run: `cd tgmall-miniapp && npm run dev`
Expected: 后台配置的 Banner 图片显示；左右滑动切换；点击 product 类型跳转商品详情；点击 category 类型跳转首页并带分类参数。

- [ ] **Step 4: 提交**

```bash
git add tgmall-miniapp/src/views/HomePage.vue
git commit -m "feat(miniapp): home banner carousel uses shop config"
```

---

### Task 4: 分类页网格接入后台配置

**Files:**
- Modify: `tgmall-miniapp/src/views/CategoryPage.vue`

**Interfaces:**
- Consumes: `useShopConfig().categories`
- Produces: 动态分类网格

- [ ] **Step 1: 修改 CategoryPage.vue**

替换硬编码 `categories` 为 API 数据，保留 emoji 回退。

```diff
 import { getProducts } from '@/api/products';
+import { useShopConfig } from '@/composables/useShopConfig.js';
 
 const router = useRouter();
 
-const categories = [
-  { value: 'fashion', label: '时尚', emoji: '👗' },
-  { value: 'beauty', label: '美妆', emoji: '💄' },
-  { value: 'electronics', label: '电子', emoji: '📱' },
-  { value: 'home', label: '家居', emoji: '🏠' },
-];
+const { categories: apiCategories, load } = useShopConfig();
+const emojiMap = { fashion: '👗', beauty: '💄', electronics: '📱', home: '🏠' };
+const categories = computed(() => (apiCategories.value || []).map(c => ({
+  value: c.code,
+  label: c[`name_${locale.value}`] || c.name_km || c.code,
+  icon: c.icon_url,
+  emoji: emojiMap[c.code] || '📦',
+})));
```

模板中：

```vue
<div class="category-card" v-for="cat in categories" :key="cat.value" @click="goToCategory(cat.value)">
  <img v-if="cat.icon" :src="cat.icon" class="cat-icon" />
  <span v-else class="cat-emoji">{{ cat.emoji }}</span>
  <span class="cat-name">{{ cat.label }}</span>
</div>
```

在 `onMounted` 调用 `load()`。

- [ ] **Step 2: 手动验证**

Run: `cd tgmall-miniapp && npm run dev`
Expected: 分类页网格展示后台配置的品类；有 icon 显示图片，无 icon 显示 emoji；点击跳转首页并带 category 参数。

- [ ] **Step 3: 提交**

```bash
git add tgmall-miniapp/src/views/CategoryPage.vue
git commit -m "feat(miniapp): category page grid uses shop config"
```

---

### Task 5: 城市选择与状态管理

**Files:**
- Create: `tgmall-miniapp/src/stores/cityStore.js`
- Create: `tgmall-miniapp/src/views/CitySelectPage.vue`
- Modify: `tgmall-miniapp/src/router/index.js`

**Interfaces:**
- Consumes: `useShopConfig().cities`
- Produces: `cityStore.currentCity` (code, names), persisted in localStorage

- [ ] **Step 1: 创建 cityStore.js**

```js
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'tgmall_selected_city';
const DEFAULT_CITY = 'phnom_penh';

export const useCityStore = defineStore('city', () => {
  const currentCode = ref(localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY);
  const cities = ref([]);

  const currentCity = computed(() =>
    cities.value.find(c => c.code === currentCode.value) || { code: DEFAULT_CITY, name_km: 'ភ្នំពេញ', name_en: 'Phnom Penh', name_zh: '金边' }
  );

  function setCities(list) {
    cities.value = list;
  }

  function setCity(code) {
    if (cities.value.some(c => c.code === code) || code === DEFAULT_CITY) {
      currentCode.value = code;
      localStorage.setItem(STORAGE_KEY, code);
    }
  }

  watch(currentCode, (code) => {
    localStorage.setItem(STORAGE_KEY, code);
  });

  return { currentCode, currentCity, cities, setCities, setCity };
});
```

- [ ] **Step 2: 创建 CitySelectPage.vue**

```vue
<template>
  <div class="page">
    <div class="header">
      <button @click="$router.back()">←</button>
      <h2>{{ $t('city.selectTitle') || '选择城市' }}</h2>
    </div>
    <div class="city-list">
      <div
        v-for="city in cities"
        :key="city.code"
        class="city-item"
        :class="{ active: cityStore.currentCode === city.code }"
        @click="selectCity(city.code)"
      >
        <span>{{ cityName(city) }}</span>
        <span v-if="cityStore.currentCode === city.code">✓</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCityStore } from '@/stores/cityStore.js';
import { useShopConfig } from '@/composables/useShopConfig.js';

const router = useRouter();
const { locale } = useI18n();
const cityStore = useCityStore();
const { cities, load } = useShopConfig();

function cityName(city) {
  return city[`name_${locale.value}`] || city.name_km || city.code;
}

function selectCity(code) {
  cityStore.setCity(code);
  router.back();
}

onMounted(() => {
  load().then(() => {
    cityStore.setCities(cities.value);
  });
});
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.header h2 { margin: 0; font-size: 18px; }
.header button { font-size: 20px; background: none; border: none; cursor: pointer; }
.city-list { padding: var(--space-lg); }
.city-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-sm);
  cursor: pointer;
}
.city-item.active { border-color: var(--accent); color: var(--accent); font-weight: 600; }
</style>
```

- [ ] **Step 3: 添加路由**

在 `tgmall-miniapp/src/router/index.js` 中添加：

```js
{
  path: '/cities',
  name: 'CitySelect',
  component: () => import('@/views/CitySelectPage.vue'),
  meta: { title: 'citySelect' },
},
```

- [ ] **Step 4: 在首页顶部显示当前城市入口**

在 `HomePage.vue` 的 `top-header` 中搜索栏左侧添加城市入口：

```vue
<div class="city-entry" @click="$router.push('/cities')">
  <span class="city-name">{{ cityStore.currentCity.name_km }}</span>
  <span class="city-arrow">▼</span>
</div>
```

并在 `script setup` 中引入 `useCityStore`。

- [ ] **Step 5: 手动验证**

Run: `cd tgmall-miniapp && npm run dev`
Expected: 首页顶部显示当前城市；点击跳转城市选择页；选择城市后返回，首页城市更新；localStorage 持久化。

- [ ] **Step 6: 提交**

```bash
git add tgmall-miniapp/src/stores/cityStore.js tgmall-miniapp/src/views/CitySelectPage.vue tgmall-miniapp/src/router/index.js tgmall-miniapp/src/views/HomePage.vue
git commit -m "feat(miniapp): city selection and city store"
```

---

### Task 6: 结算页按城市显示配送费与起送金额

**Files:**
- Modify: `tgmall-miniapp/src/views/CheckoutPage.vue`

**Interfaces:**
- Consumes: `useCityStore().currentCity`, `useShopConfig().loadDeliveryRule`, `useShopConfig().deliveryRule`
- Produces: 结算页显示真实运费、起送金额、差额提示、提交按钮状态

- [ ] **Step 1: 接入城市与配送规则**

在 `CheckoutPage.vue` 的 `script setup` 中：

```js
import { useCityStore } from '@/stores/cityStore.js';
import { useShopConfig } from '@/composables/useShopConfig.js';

const cityStore = useCityStore();
const { deliveryRule, loadDeliveryRule } = useShopConfig();

onMounted(() => {
  getAddresses().then(r => { addresses.value = r.data; if (r.data.length) selectedAddress.value = r.data[0]; });
  getMyCoupons().then(r => coupons.value = r.data);
  loadDeliveryRule(cityStore.currentCity.code);
});

watch(() => cityStore.currentCity.code, (code) => {
  loadDeliveryRule(code);
});
```

- [ ] **Step 2: 计算运费与起送金额**

```js
const shippingFee = computed(() => {
  if (!deliveryRule.value) return 0;
  const threshold = Number(deliveryRule.value.freeShippingThresholdUsd);
  if (threshold > 0 && subtotal.value >= threshold) return 0;
  return Number(deliveryRule.value.shippingFeeUsd);
});

const minOrderAmount = computed(() => Number(deliveryRule.value?.minOrderAmountUsd || 0));

const shortfall = computed(() => {
  if (!minOrderAmount.value) return 0;
  return Math.max(0, minOrderAmount.value - subtotal.value);
});

const total = computed(() => Math.max(0, subtotal.value - discount.value + shippingFee.value));
const totalKhr = computed(() => Math.round(total.value * 4000));

const canSubmit = computed(() =>
  selectedAddress.value && !submitting.value && shortfall.value <= 0
);
```

- [ ] **Step 3: 更新模板**

价格明细中：

```vue
<div class="pb-row"><span>商品总价</span><span>${{ subtotal.toFixed(2) }}</span></div>
<div class="pb-row" v-if="discount > 0"><span>优惠券</span><span class="discount">-${{ discount.toFixed(2) }}</span></div>
<div class="pb-row">
  <span>配送费</span>
  <span>{{ shippingFee === 0 ? '免运费' : '$' + shippingFee.toFixed(2) }}</span>
</div>
<div v-if="shortfall > 0" class="pb-row shortfall">
  <span>起送金额</span>
  <span>还差 ${{ shortfall.toFixed(2) }}（满 ${{ minOrderAmount.toFixed(2) }} 起送）</span>
</div>
<div class="pb-row total"><span>合计</span><PriceDisplay :priceUsd="total" :priceKhr="totalKhr" /></div>
```

提交按钮：

```vue
<button class="submit-btn" @click="submitOrder" :disabled="!canSubmit">
  {{ shortfall > 0 ? `差 $${shortfall.toFixed(2)} 起送` : (submitting ? '提交中...' : `提交订单 · $${total.toFixed(2)}`) }}
</button>
```

- [ ] **Step 4: 添加样式**

```css
.pb-row.shortfall { color: var(--accent-red); font-size: 13px; }
```

- [ ] **Step 5: 手动验证**

Run: `cd tgmall-miniapp && npm run dev`
Expected: 结算页显示对应城市的配送费；达到免邮门槛时显示免运费；未达起送金额时按钮置灰并提示差额；切换城市后运费更新。

- [ ] **Step 6: 提交**

```bash
git add tgmall-miniapp/src/views/CheckoutPage.vue
git commit -m "feat(miniapp): checkout uses city delivery rules"
```

---

### Task 7: 个人中心客服入口

**Files:**
- Modify: `tgmall-miniapp/src/views/ProfilePage.vue`

**Interfaces:**
- Consumes: `useShopConfig().customerService`, `useShopConfig().loadCustomerService`
- Produces: 个人中心「联系客服」菜单项

- [ ] **Step 1: 加载客服信息**

在 `ProfilePage.vue` 的 `script setup` 中：

```js
import { useShopConfig } from '@/composables/useShopConfig.js';

const { customerService, loadCustomerService } = useShopConfig();

onMounted(() => {
  loadAddresses();
  loadCustomerService();
});

function contactCustomerService() {
  if (!customerService.value) return;
  const username = customerService.value.telegram_username;
  if (username) {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openTelegramLink) tg.openTelegramLink(`https://t.me/${username}`);
    else window.open(`https://t.me/${username}`, '_blank');
  } else if (customerService.value.phone) {
    window.location.href = `tel:${customerService.value.phone}`;
  }
}
```

- [ ] **Step 2: 添加菜单项**

在菜单列表中添加：

```vue
<div class="menu-item" @click="contactCustomerService">
  <span>💬</span><span>{{ $t('profile.customerService') || '联系客服' }}</span><span class="arrow">›</span>
</div>
```

- [ ] **Step 3: 手动验证**

Run: `cd tgmall-miniapp && npm run dev`
Expected: 个人中心显示联系客服；点击后跳转 Telegram 客服账号；无客服信息时按钮不响应或隐藏。

- [ ] **Step 4: 提交**

```bash
git add tgmall-miniapp/src/views/ProfilePage.vue
git commit -m "feat(miniapp): profile customer service entry"
```

---

## 最终检查清单

- [ ] 首页 Banner 调用 `GET /banners?city={currentCity}` 并轮播显示。
- [ ] 首页品类横滑调用 `GET /categories`。
- [ ] 分类页网格调用 `GET /categories`。
- [ ] 城市选择页调用 `GET /cities` 并持久化选择。
- [ ] 结算页按城市调用 `GET /delivery-rules/{cityCode}` 显示运费与起送金额。
- [ ] 个人中心调用 `GET /customer-services/default` 显示客服入口。
- [ ] `useShopConfig` 单元测试通过。
- [ ] Mini App dev server 能正常启动且功能可手动验证。
