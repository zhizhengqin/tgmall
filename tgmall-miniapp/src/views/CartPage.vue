<!-- 购物车页 — 占位（Sprint 2 完成） -->
<template>
  <div class="page">
    <h2>{{ $t('cart.title') }}</h2>
    <p class="placeholder">CartPage — Sprint 2 实现</p>
    <BottomNav />
  </div>
</template>

<script setup>
import BottomNav from '@/components/common/BottomNav.vue';
</script>

<style scoped>
.page { padding: var(--space-lg); min-height: 100vh; }
.placeholder { color: var(--muted); font-size: 13px; margin-top: var(--space-md); }
</style>
