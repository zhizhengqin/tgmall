<!-- 商品详情页 — 占位（Sprint 2 完成） -->
<template>
  <div class="page">
    <button class="back-btn" @click="$router.back()">← 返回</button>
    <h2>商品详情</h2>
    <p class="placeholder">ProductDetail — Sprint 2 实现</p>
    <BottomNav />
  </div>
</template>

<script setup>
import BottomNav from '@/components/common/BottomNav.vue';
</script>

<style scoped>
.page { padding: var(--space-lg); min-height: 100vh; }
.placeholder { color: var(--muted); font-size: 13px; margin-top: var(--space-md); }
.back-btn { font-size: 14px; color: var(--accent); cursor: pointer; }
</style>
