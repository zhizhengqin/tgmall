<!-- 双币种价格组件 -->
<template>
  <div class="price-display" :class="{ 'price-sm': sm }">
    <span class="price-usd">${{ formattedUsd }}</span>
    <span class="price-khr">៛{{ formattedKhr }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  priceUsd: { type: Number, required: true },
  priceKhr: { type: Number, required: true },
  sm: { type: Boolean, default: false },
});

const formattedUsd = computed(() => props.priceUsd.toFixed(2));
const formattedKhr = computed(() => props.priceKhr.toLocaleString());
</script>

<style scoped>
.price-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.price-usd {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-red);
  letter-spacing: -0.01em;
}
.price-khr {
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
}
.price-sm .price-usd { font-size: 14px; }
.price-sm .price-khr { font-size: 11px; }
</style>
