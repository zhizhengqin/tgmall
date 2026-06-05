<!-- 商品卡片 — 双列网格展示 -->
<template>
  <router-link :to="`/product/${id}`" class="product-card">
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
      <h3 class="card-name">{{ name }}</h3>
      <p class="card-merchant">{{ merchantName }}</p>
      <PriceDisplay :price-usd="priceUsd" :price-khr="priceKhr" sm />
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import PriceDisplay from './PriceDisplay.vue';

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, required: true },
  priceUsd: { type: Number, required: true },
  priceKhr: { type: Number, required: true },
  thumbnail: { type: String, default: '' },
  merchantName: { type: String, default: '' },
  stock: { type: Number, default: 0 },
});

const stockLabel = computed(() => {
  if (props.stock === 0) return null;
  if (props.stock <= 5) return `仅剩${props.stock}件`;
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
.card-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
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
</style>
