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
      <span class="nav-icon" v-html="item.icon"></span>
      <span class="nav-label">{{ $t(item.label) }}</span>
      <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCartStore } from '@/stores/cartStore';

const cartStore = useCartStore();
const route = useRoute();

// SVG 线条图标（匹配设计稿风格）
const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  category: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
};

const items = computed(() => [
  { to: '/', icon: icons.home, label: 'nav.home' },
  { to: '/category', icon: icons.category, label: 'nav.categories' },
  { to: '/cart', icon: icons.cart, label: 'nav.cart', badge: cartStore.totalItems > 0 ? cartStore.totalItems : null },
  { to: '/orders', icon: icons.orders, label: 'nav.orders' },
  { to: '/profile', icon: icons.profile, label: 'nav.profile' },
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
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  will-change: transform;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  position: relative;
  text-decoration: none;
  color: var(--muted);
  font-size: 10px;
  font-weight: 500;
  padding: var(--space-xs) var(--space-sm);
  transition: color 0.2s;
  min-width: 56px;
}
.nav-item.active {
  color: var(--accent);
}
.nav-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
.nav-label {
  font-size: 10px;
  line-height: 1;
}
.nav-badge {
  position: absolute;
  top: -2px;
  right: 4px;
  min-width: 16px;
  height: 16px;
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
