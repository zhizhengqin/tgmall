<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>{{ $t('users.title') }}</h1>
      <el-input v-model="search" :placeholder="$t('users.search')" @input="load" clearable style="width:300px;margin-bottom:10px" />
      <el-table :data="items" v-loading="loading">
        <el-table-column prop="firstName" :label="$t('users.name')" />
        <el-table-column prop="lastName" :label="$t('users.name')" />
        <el-table-column prop="phone" :label="$t('users.phone')" width="120" />
        <el-table-column prop="telegramId" label="Telegram ID" width="120" />
        <el-table-column prop="status" :label="$t('users.status')" width="80" />
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { getAdminUsers } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const items = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const search = ref('');
async function load() {
  loading.value = true;
  try {
    const r = await getAdminUsers({ page: page.value, q: search.value || undefined });
    items.value = r.data;
    total.value = r.meta?.total || 0;
  } catch (e) {
    console.error('加载用户列表失败', e);
    items.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}</style>
