<!-- 商品卡片 — 双列网格 / 列表行展示 -->
<template>
  <router-link :to="`/product/${id}`" class="product-card" :class="{ 'card-list': layout === 'list' }">
    <div class="card-image">
      <img
        :src="thumbnail"
        :alt="name"
        loading="lazy"
        @error="onImageError"
      />
      <span v-if="stockLabel" class="stock-badge">{{ stockLabel }}</span>
    </div>
    <div class="card-body">
      <!-- 标签行 -->
      <div v-if="tags && tags.length" class="tag-row">
        <span v-for="(tag, i) in tags" :key="i" class="tag-chip" :style="{ color: tag.color, background: tag.bg }">
          {{ tagDisplay(tag) }}
        </span>
      </div>
      <h3 class="card-name">{{ name }}</h3>
      <p class="card-merchant">{{ merchantName }}</p>
      <PriceDisplay :price-usd="priceUsd" :price-khr="priceKhr" sm />
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PriceDisplay from './PriceDisplay.vue';

const { locale, t } = useI18n();

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, required: true },
  priceUsd: { type: Number, required: true },
  priceKhr: { type: Number, required: true },
  thumbnail: { type: String, default: '' },
  merchantName: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  tags: { type: Array, default: () => [] },
  layout: { type: String, default: 'grid' }, // 'grid' | 'list'
});

function tagDisplay(tag) {
  const map = { km: 'textKm', en: 'textEn', zh: 'textZh' };
  const key = map[locale.value] || 'textKm';
  return tag[key] || tag.textKm;
}

const stockLabel = computed(() => {
  if (props.stock === 0) return null;
  if (props.stock <= 5) return t('product.stockLeft', { count: props.stock });
  return null;
});

// 图片加载失败时使用占位图
const placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23e8e6e2"><rect width="400" height="400"/><text x="200" y="210" text-anchor="middle" fill="%237a7670" font-size="14">No Image</text></svg>';

function onImageError(e) {
  e.target.src = placeholder;
}
</script>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: transform 0.15s ease;
}
.product-card:active {
  transform: scale(0.98);
}
.card-image {
  position: relative;
  aspect-ratio: 1;
  background: oklch(96% 0.003 90);
  overflow: hidden;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.stock-badge {
  position: absolute;
  bottom: var(--space-sm);
  left: var(--space-sm);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: oklch(52% 0.20 24 / 0.9);
  color: #fff;
}
.card-body {
  padding: var(--space-sm) var(--space-md) var(--space-md);
}
.tag-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.tag-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1.6;
}
.card-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--fg);
}
.card-merchant {
  font-size: 11px;
  color: var(--muted);
  margin: 4px 0 6px;
}

/* 列表模式 — 横向布局 */
.product-card.card-list {
  flex-direction: row;
}
.product-card.card-list .card-image {
  width: 120px;
  flex-shrink: 0;
  aspect-ratio: 1;
}
.product-card.card-list .card-body {
  flex: 1;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.product-card.card-list .card-name {
  -webkit-line-clamp: 3;
  font-size: 14px;
}
</style>
