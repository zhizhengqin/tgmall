<!-- 城市选择页 -->
<template>
  <div class="city-select-page">
    <header class="city-header">
      <button class="back-btn" @click="router.back()">←</button>
      <h2 class="page-title">{{ $t('city.selectTitle') }}</h2>
    </header>

    <div class="city-list">
      <div
        v-for="city in cities"
        :key="city.code"
        class="city-item"
        :class="{ active: cityStore.currentCode === city.code }"
        @click="selectCity(city.code)"
      >
        <span class="city-name">{{ cityName(city) }}</span>
        <span class="city-check" :class="{ visible: cityStore.currentCode === city.code }">✓</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCityStore } from '@/stores/cityStore.js';
import { useShopConfig } from '@/composables/useShopConfig.js';

const router = useRouter();
const { locale } = useI18n();
const cityStore = useCityStore();
const { cities, load } = useShopConfig();

function cityName(city) {
  const key = `name${locale.value.charAt(0).toUpperCase() + locale.value.slice(1)}`;
  return city[key] || city.nameKm || city.code;
}

function selectCity(code) {
  cityStore.setCity(code);
  router.back();
}

onMounted(() => {
  load().then(() => {
    cityStore.setCities(cities.value);
  });
});
</script>

<style scoped>
.city-select-page {
  min-height: 100vh;
  background: var(--bg);
}

.city-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 20px;
  background: none;
  border: none;
  color: var(--fg);
  cursor: pointer;
}

.city-list {
  padding: var(--space-lg);
}

.city-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 52px;
  padding: var(--space-md) var(--space-lg);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.city-item:active {
  background: var(--bg);
}

.city-item.active {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.city-name {
  font-size: 15px;
  color: var(--fg);
}

.city-item.active .city-name {
  color: var(--accent);
}

.city-check {
  font-size: 16px;
  color: var(--accent);
  opacity: 0;
}

.city-check.visible {
  opacity: 1;
}
</style>
