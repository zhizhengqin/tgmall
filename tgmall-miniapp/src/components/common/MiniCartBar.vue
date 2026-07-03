<!-- 底部购物车条 — 件数 + 合计 + 起送差额 + 结算 -->
<template>
  <div v-if="summary.totalItems > 0" class="mini-cart-bar" :class="{ 'min-met': minMet }">
    <router-link to="/cart" class="cart-info">
      <span class="cart-icon-wrap">
        <span class="cart-icon">🛒</span>
        <span class="cart-badge">{{ summary.totalItems }}</span>
      </span>
      <div class="cart-detail">
        <div class="cart-price">
          <span class="price-usd">${{ summary.totalUsd.toFixed(2) }}</span>
          <span class="price-khr">{{ formatKhr(summary.totalKhr) }}</span>
        </div>
        <p v-if="deliveryGap > 0" class="delivery-gap">
          {{ $t('cart.minOrderHint', { amount: deliveryGap.toFixed(2) }) }}
        </p>
      </div>
    </router-link>
    <router-link to="/cart" class="cart-action">
      {{ minMet ? $t('cart.checkout') : $t('cart.continueShopping') }}
    </router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getCart } from '@/api/cart';
import { getDeliveryRule } from '@/api/shopConfig';
import { useCityStore } from '@/stores/cityStore.js';

const cityStore = useCityStore();

const summary = ref({ totalItems: 0, totalUsd: 0, totalKhr: 0 });
const minOrderUsd = ref(0);

const deliveryGap = computed(() => {
  if (minOrderUsd.value <= 0 || summary.value.totalUsd <= 0) return 0;
  const gap = minOrderUsd.value - summary.value.totalUsd;
  return gap > 0 ? gap : 0;
});

const minMet = computed(() => {
  if (minOrderUsd.value <= 0) return true; // 无起送限制
  return summary.value.totalUsd >= minOrderUsd.value;
});

async function loadCart() {
  try {
    const res = await getCart();
    summary.value = res.data.summary || { totalItems: 0, totalUsd: 0, totalKhr: 0 };
  } catch { /* ignore */ }
}

async function loadDeliveryRule() {
  try {
    const code = cityStore.currentCode || 'phnom_penh';
    const res = await getDeliveryRule(code);
    minOrderUsd.value = Number(res.data.minOrderAmountUsd) || 0;
  } catch { /* ignore */ }
}

function formatKhr(khr) {
  if (!khr) return '៛0';
  return '៛' + khr.toLocaleString('en');
}

function handleCartUpdate() {
  loadCart();
}

onMounted(() => {
  loadCart();
  loadDeliveryRule();
  window.addEventListener('cart-updated', handleCartUpdate);
});

onUnmounted(() => {
  window.removeEventListener('cart-updated', handleCartUpdate);
});
</script>

<style scoped>
.mini-cart-bar {
  position: fixed;
  bottom: var(--nav-height);
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--max-width, 430px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px var(--space-lg);
  background: var(--surface);
  border-top: 1px solid var(--border);
  z-index: 50;
  box-shadow: 0 -2px 8px rgba(0,0,0,.04);
}

.cart-info {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
  flex: 1;
  min-width: 0;
}
.cart-icon-wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.cart-icon { font-size: 22px; }
.cart-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: var(--accent-red);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.cart-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.cart-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1.2;
}
.price-usd {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-red);
}
.price-khr {
  font-size: 11px;
  color: var(--muted);
}
.delivery-gap {
  font-size: 11px;
  color: var(--accent);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-action {
  flex-shrink: 0;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.2s, background 0.2s;
}
.mini-cart-bar.min-met .cart-action {
  opacity: 1;
  background: var(--accent-red);
}
.cart-action:active { opacity: 0.85; }
</style>
