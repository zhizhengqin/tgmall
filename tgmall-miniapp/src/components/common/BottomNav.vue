<!-- 底部导航栏 -->
<template>
  <nav class="bottom-nav">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ active: $route.path === item.to }"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ $t(item.label) }}</span>
      <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useCartStore } from '@/stores/cartStore';

const cartStore = useCartStore();

const items = computed(() => [
  { to: '/', icon: '🏠', label: 'nav.home' },
  { to: '/category', icon: '🛍️', label: 'nav.categories' },
  { to: '/cart', icon: '🛒', label: 'nav.cart', badge: cartStore.totalItems > 0 ? cartStore.totalItems : null },
  { to: '/orders', icon: '📋', label: 'nav.orders' },
  { to: '/profile', icon: '👤', label: 'nav.profile' },
]);
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--max-width);
  height: var(--nav-height);
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 200;
  box-shadow: var(--shadow-float);
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  position: relative;
  text-decoration: none;
  color: var(--muted);
  font-size: 10px;
  font-weight: 500;
  padding: var(--space-xs);
  transition: color 0.2s;
}
.nav-item.active {
  color: var(--accent);
}
.nav-icon {
  font-size: 20px;
  line-height: 1;
}
.nav-label {
  font-size: 10px;
}
.nav-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--accent-red);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
</style>
