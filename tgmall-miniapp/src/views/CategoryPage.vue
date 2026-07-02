<!-- 分类页 — 品类浏览 -->
<template>
  <div class="category-page">
    <!-- 页面标题 -->
    <header class="page-header">
      <h1 class="page-title">{{ $t('nav.categories') }}</h1>
    </header>

    <!-- 分类网格 -->
    <section class="category-grid">
      <div
        v-for="cat in categories"
        :key="cat.value"
        class="category-card"
        @click="goToCategory(cat.value)"
      >
        <img v-if="cat.icon" :src="cat.icon" :alt="cat.label" class="cat-icon" />
        <span v-else class="cat-emoji">{{ cat.emoji }}</span>
        <span class="cat-name">{{ cat.label }}</span>
      </div>
    </section>

    <!-- 热门推荐标题 -->
    <section class="section-header">
      <h2 class="section-title">{{ $t('home.hotProducts') }}</h2>
    </section>

    <!-- 商品列表 -->
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

      <div v-else class="product-grid">
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
        />
      </div>

      <div v-if="isLoading && products.length > 0" class="loading-more">
        {{ $t('common.loading') }}
      </div>

      <div v-if="!hasMore && products.length > 0" class="no-more">
        {{ $t('common.noMore') }}
      </div>
    </section>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useShopConfig } from '@/composables/useShopConfig.js';
import { getProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import BottomNav from '@/components/common/BottomNav.vue';

const router = useRouter();
const { locale, t } = useI18n();
const { categories: apiCategories, load } = useShopConfig();

const emojiMap = { fashion: '👗', beauty: '💄', electronics: '📱', home: '🏠' };
const categories = computed(() => (apiCategories.value || []).map(c => {
  const key = `name${locale.value.charAt(0).toUpperCase() + locale.value.slice(1)}`;
  return {
    value: c.code,
    label: c[key] || c.nameKm || c.code,
    icon: c.iconUrl,
    emoji: emojiMap[c.code] || '📦',
  };
}));

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
    const params = { page: page.value, limit: 20, sort: 'newest' };
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

function goToCategory(category) {
  // 跳转到首页并带上分类参数
  router.push({ path: '/', query: { category } });
}

onMounted(async () => {
  try {
    await load();
  } catch {
    // ignore — shop-config failure should not block the page
  }
  await fetchProducts(true);
});
</script>

<style scoped>
.category-page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
}

.page-header {
  padding: var(--space-lg);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--fg);
  margin: 0;
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  padding: var(--space-lg);
}
.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl) var(--space-lg);
  cursor: pointer;
  transition: all 0.2s;
}
.category-card:active {
  transform: scale(0.97);
  border-color: var(--accent);
}
.cat-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
}
.cat-emoji {
  font-size: 32px;
  line-height: 1;
}
.cat-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
}

/* 热门推荐 */
.section-header {
  padding: var(--space-lg) var(--space-lg) var(--space-md);
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--fg);
  margin: 0;
}

/* 商品区域 */
.product-section {
  padding: 0 var(--space-lg) var(--space-lg);
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
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
