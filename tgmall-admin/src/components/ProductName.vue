<template>
  <div class="product-name" data-testid="product-name">
    <div class="product-name-km">{{ nameKm }}</div>
    <div v-if="nameEn || nameZh" class="product-name-sub">
      {{ nameEn }}<span v-if="nameEn && nameZh"> · </span>{{ nameZh }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  nameKm: { type: String, required: true },
  nameEn: { type: String, default: '' },
  nameZh: { type: String, default: '' },
});
</script>

<style scoped>
.product-name-km {
  line-height: 1.4;
}
.product-name-sub {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 2px;
}
</style>
