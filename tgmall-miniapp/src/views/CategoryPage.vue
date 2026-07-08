<!-- 分类页 — 侧边栏分类导航 -->
<template>
  <div class="category-page">
    <!-- 页面标题 -->
    <header class="page-header">
      <h1 class="page-title">{{ $t('nav.categories') }}</h1>
    </header>

    <!-- 侧边栏 + 内容区 -->
    <div class="category-layout">
      <!-- 左侧一级分类侧边栏 -->
      <nav class="sidebar">
        <button
          v-for="cat in sidebarItems"
          :key="cat.value"
          class="sidebar-item"
          :class="{ active: activeCategory === cat.value }"
          @click="switchCategory(cat.value)"
        >
          <span class="sidebar-emoji">{{ cat.emoji }}</span>
          <span class="sidebar-label">{{ cat.label }}</span>
        </button>
      </nav>

      <!-- 右侧内容区 -->
      <div class="main-content">
        <!-- 排序栏 + 视图切换 -->
        <div class="sort-bar">
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            class="sort-btn"
            :class="{ active: activeSort === opt.value }"
            @click="switchSort(opt.value)"
          >
            {{ opt.label }}
          </button>
          <div class="spacer"></div>
          <button class="view-toggle" @click="toggleView">
            <span v-if="viewMode === 'grid'">☰</span>
            <span v-else>⊞</span>
          </button>
        </div>

        <!-- 商品区域 -->
        <section class="product-section">
          <LoadingSkeleton v-if="isLoading && products.length === 0" :count="6" />

          <div v-else-if="loadError" class="error-state">
            <div class="error-icon">⚠️</div>
            <div class="error-desc">{{ loadError }}</div>
            <button class="retry-btn" @click="fetchProducts(true)">{{ $t('common.retry') }}</button>
          </div>

          <div v-else-if="products.length === 0" class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-title">{{ $t('home.noProducts') }}</div>
          </div>

          <div v-else class="product-grid" :class="{ 'grid-list': viewMode === 'list' }">
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :id="product.id"
              :name="product.name"
              :price-usd="product.priceUsd"
              :price-khr="product.priceKhr"
              :thumbnail="product.thumbnail"
              :merchant-name="product.merchantName"
              :stock="product.stock"
              :tags="product.tags"
              :layout="viewMode"
              :show-quick-add="true"
            />
          </div>

          <div v-if="isLoading && products.length > 0" class="loading-more">
            {{ $t('common.loading') }}
          </div>

          <div v-if="!hasMore && products.length > 0" class="no-more">
            {{ $t('common.noMore') }}
          </div>
        </section>
      </div>
    </div>

    <MiniCartBar />
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useShopConfig } from '@/composables/useShopConfig.js';
import { getProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import MiniCartBar from '@/components/common/MiniCartBar.vue';
import BottomNav from '@/components/common/BottomNav.vue';

const { locale, t } = useI18n();
const { categories: apiCategories, load } = useShopConfig();

// 侧边栏分类列表（含 emoji）
const emojiMap = { fashion: '👗', beauty: '💄', electronics: '📱', home: '🏠' };
const sidebarItems = computed(() => {
  const items = [{ value: 'all', label: t('home.all'), emoji: '🛍️' }];
  (apiCategories.value || []).forEach(c => {
    const key = `name${locale.value.charAt(0).toUpperCase() + locale.value.slice(1)}`;
    items.push({
      value: c.code,
      label: c[key] || c.nameKm || c.code,
      emoji: emojiMap[c.code] || '📦',
    });
  });
  return items;
});

// 排序选项
const sortOptions = computed(() => [
  { value: 'newest', label: t('home.sortNewest') },
  { value: 'price_asc', label: t('home.sortPriceLow') },
  { value: 'price_desc', label: t('home.sortPriceHigh') },
  { value: 'popular', label: t('home.sortPopular') },
]);

// 视图模式 (localStorage 持久化)
const VIEW_MODE_KEY = 'categoryViewMode';
function safeGetItem(key, fallback) {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(key) || fallback;
    }
  } catch {}
  return fallback;
}
function safeSetItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, value);
    }
  } catch {}
}
const viewMode = ref(safeGetItem(VIEW_MODE_KEY, 'grid'));
function toggleView() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
  safeSetItem(VIEW_MODE_KEY, viewMode.value);
}

// 状态
const activeCategory = ref('all');
const activeSort = ref('newest');
const products = ref([]);
const page = ref(1);
const hasMore = ref(true);
const isLoading = ref(false);
const loadError = ref('');

async function fetchProducts(reset = false) {
  if (isLoading.value || (!hasMore.value && !reset)) return;
  isLoading.value = true;
  loadError.value = '';

  if (reset) {
    page.value = 1;
    products.value = [];
    hasMore.value = true;
  }

  try {
    const params = { page: page.value, limit: 20, sort: activeSort.value };
    if (activeCategory.value !== 'all') params.category = activeCategory.value;

    const res = await getProducts(params);

    if (reset) {
      products.value = res.data || [];
    } else {
      products.value.push(...(res.data || []));
    }

    hasMore.value = res.meta?.hasNext ?? false;
    page.value += 1;
  } catch (err) {
    console.error('加载商品失败:', err);
    loadError.value = err.response?.data?.error?.message || err.message || t('checkout.networkError');
  } finally {
    isLoading.value = false;
  }
}

function switchCategory(cat) {
  if (activeCategory.value === cat) return;
  activeCategory.value = cat;
  fetchProducts(true);
}

function switchSort(sort) {
  if (activeSort.value === sort) return;
  activeSort.value = sort;
  fetchProducts(true);
}

// 无限滚动
function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollHeight - scrollTop - clientHeight < 300) {
    fetchProducts();
  }
}

onMounted(async () => {
  try { await load(); } catch { /* ignore */ }
  await fetchProducts(true);
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.category-page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: var(--space-md) var(--space-lg);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--fg);
  margin: 0;
}

/* 侧边栏 + 内容区布局 */
.category-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧侧边栏 */
.sidebar {
  width: 88px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: var(--space-sm) 0;
}
.sidebar-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  min-height: 44px; /* 最小触摸目标 */
}
.sidebar-item:active {
  background: var(--bg);
}
.sidebar-item.active {
  background: oklch(64% 0.16 82 / 0.08);
  border-left-color: var(--accent);
}
.sidebar-emoji {
  font-size: 20px;
  line-height: 1;
}
.sidebar-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  text-align: center;
  word-break: keep-all;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.sidebar-item.active .sidebar-label {
  color: var(--accent);
  font-weight: 700;
}

/* 右侧内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 排序栏 */
.sort-bar {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.sort-bar::-webkit-scrollbar { display: none; }
.sort-btn {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.sort-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.spacer { flex: 1; }
.view-toggle {
  flex-shrink: 0;
  width: 32px; height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.view-toggle:active { background: var(--border); }

/* 商品区域 */
.product-section {
  padding: var(--space-md);
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}
.product-grid.grid-list {
  grid-template-columns: 1fr;
}

/* 错误/空状态 */
.error-state,
.empty-state {
  text-align: center;
  padding: var(--space-xl) var(--space-lg);
}
.error-icon,
.empty-icon {
  font-size: 40px;
  margin-bottom: var(--space-md);
}
.error-desc {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: var(--space-lg);
}
.retry-btn {
  font-size: 14px;
  font-weight: 600;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
}
.empty-title {
  font-size: 14px;
  color: var(--muted);
}

.loading-more,
.no-more {
  text-align: center;
  padding: var(--space-xl);
  font-size: 13px;
  color: var(--muted);
}
</style>
