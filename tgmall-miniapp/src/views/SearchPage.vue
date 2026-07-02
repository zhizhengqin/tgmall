<!-- 搜索页 — Sprint 2 -->
<template>
  <div class="page">
    <div class="search-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <input ref="inputRef" v-model="keyword" type="text" :placeholder="$t('home.searchPlaceholder')" class="search-input" @input="onInput" />
    </div>

    <!-- 历史搜索 -->
    <div v-if="!keyword && history.length" class="section">
      <div class="section-header">
        <span>{{ $t('search.historyTitle') }}</span>
        <button @click="clearHistory">{{ $t('search.clear') }}</button>
      </div>
      <div class="tag-cloud">
        <span v-for="h in history" :key="h" class="tag" @click="keyword = h; search()">{{ h }}</span>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="keyword" class="results">
      <p class="result-count" v-if="!loading">{{ $t('search.resultCount', { count: products.length }) }}</p>
      <div class="product-grid">
        <ProductCard v-for="p in products" :key="p.id" v-bind="p" />
      </div>
      <p v-if="!loading && products.length === 0 && searched" class="no-result">{{ $t('search.noResult') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard.vue';

const keyword = ref('');
const products = ref([]);
const loading = ref(false);
const searched = ref(false);
const history = ref(JSON.parse(localStorage.getItem('search_history') || '[]'));
const inputRef = ref(null);

let timer;

function onInput() {
  clearTimeout(timer);
  timer = setTimeout(search, 400);
}

async function search() {
  if (!keyword.value.trim()) { products.value = []; return; }
  loading.value = true; searched.value = true;
  try {
    const res = await getProducts({ q: keyword.value, limit: 40 });
    products.value = res.data;
    // 存搜索历史
    if (!history.value.includes(keyword.value)) {
      history.value.unshift(keyword.value);
      if (history.value.length > 10) history.value.pop();
      localStorage.setItem('search_history', JSON.stringify(history.value));
    }
  } catch { products.value = []; }
  loading.value = false;
}

function clearHistory() {
  history.value = [];
  localStorage.removeItem('search_history');
}

onMounted(() => { inputRef.value?.focus(); });
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; min-height: 100vh; background: var(--bg); padding: var(--space-lg); }
.search-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.back-btn { font-size: 18px; color: var(--accent); }
.search-input { flex: 1; padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 15px; background: var(--surface); }
.section { margin-bottom: 20px; }
.section-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: var(--muted); }
.section-header button { color: var(--accent); font-size: 12px; }
.tag-cloud { display: flex; gap: 8px; flex-wrap: wrap; }
.tag { padding: 4px 14px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); font-size: 13px; cursor: pointer; }
.result-count { font-size: 13px; color: var(--muted); margin-bottom: 12px; }
.product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.no-result { text-align: center; padding: 60px 0; color: var(--muted); font-size: 14px; }
</style>
