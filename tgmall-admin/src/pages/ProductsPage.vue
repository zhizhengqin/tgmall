<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h1>{{ $t('products.title') }}</h1><el-button type="primary" @click="$router.push('/products/new')">{{ $t('products.add') }}</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="nameKm" :label="$t('products.name')" min-width="150" />
        <el-table-column :label="$t('products.priceUsd')" width="100"><template #default="{row}">${{row.priceUsd}}</template></el-table-column>
        <el-table-column prop="stock" :label="$t('products.stock')" width="80" />
        <el-table-column :label="$t('products.status')" width="80">
          <template #default="{row}"><el-switch :model-value="row.status==='active'" @change="toggle(row.id)" /></template>
        </el-table-column>
        <el-table-column label="" width="80">
          <template #default="{row}"><el-button size="small" @click="$router.push(`/products/${row.id}`)">{{ $t('products.edit') }}</el-button></template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { getProducts, toggleProduct } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const items = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0);
async function load() { loading.value = true; const r = await getProducts({ page: page.value }); items.value = r.data; total.value = r.meta?.total || 0; loading.value = false; }
async function toggle(id) { await toggleProduct(id); load(); }
onMounted(load);
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; }</style>
