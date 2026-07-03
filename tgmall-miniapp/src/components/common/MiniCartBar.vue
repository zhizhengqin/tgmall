<!-- 底部购物车条 — HomePage / CategoryPage 常驻 -->
<template>
  <div v-if="summary.totalItems > 0" class="mini-cart-bar">
    <router-link to="/cart" class="cart-info">
      <span class="cart-icon-wrap">
        <span class="cart-icon">🛒</span>
        <span class="cart-badge">{{ summary.totalItems }}</span>
      </span>
      <div class="cart-price">
        <span class="price-usd">${{ summary.totalUsd.toFixed(2) }}</span>
        <span class="price-khr">{{ formatKhr(summary.totalKhr) }}</span>
      </div>
    </router-link>
    <router-link to="/cart" class="cart-action">
      {{ $t('cart.checkout') }}
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getCart } from '@/api/cart';

const summary = ref({ totalItems: 0, totalUsd: 0, totalKhr: 0 });

async function loadCart() {
  try {
    const res = await getCart();
    summary.value = res.data.summary || { totalItems: 0, totalUsd: 0, totalKhr: 0 };
  } catch { /* 购物车加载失败不阻塞浏览 */ }
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
}
.cart-icon-wrap {
  position: relative;
  display: inline-flex;
}
.cart-icon {
  font-size: 22px;
}
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
.cart-price {
  display: flex;
  flex-direction: column;
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

.cart-action {
  flex-shrink: 0;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}
.cart-action:active {
  opacity: 0.85;
}
</style>
