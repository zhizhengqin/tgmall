<!-- 骨架屏 — 内容加载占位 -->
<template>
  <div class="skeleton-grid">
    <div v-for="n in count" :key="n" class="skeleton-card">
      <div class="skeleton-img pulse" />
      <div class="skeleton-body">
        <div class="skeleton-line w-80 pulse" />
        <div class="skeleton-line w-60 pulse" />
        <div class="skeleton-line w-40 pulse" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 6 },
});
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  padding: var(--space-lg);
}
.skeleton-card {
  background: var(--surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}
.skeleton-img {
  aspect-ratio: 1;
  background: oklch(93% 0.003 90);
}
.skeleton-body {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.skeleton-line {
  height: 12px;
  border-radius: 4px;
  background: oklch(93% 0.003 90);
}
.w-80 { width: 80%; }
.w-60 { width: 60%; }
.w-40 { width: 40%; }
.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
