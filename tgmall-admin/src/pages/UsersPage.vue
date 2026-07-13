<template>
  <div class="page">
    <div class="main"><h1>{{ $t('users.title') }}</h1>
      <el-input v-model="search" :placeholder="$t('users.search')" @input="load" clearable style="width:100%;max-width:300px;margin-bottom:10px" />
      <el-table :data="items" v-loading="loading">
        <el-table-column prop="firstName" :label="$t('users.name')" />
        <el-table-column prop="lastName" :label="$t('users.name')" />
        <el-table-column prop="phone" :label="$t('users.phone')" width="120" />
        <el-table-column prop="telegramId" label="Telegram ID" width="120" />
        <el-table-column prop="status" :label="$t('users.status')" width="80">
          <template #default="{row}">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('orders.date')" width="100">
          <template #default="{row}">{{ row.createdAt?.slice(0,10) }}</template>
        </el-table-column>
        <el-table-column label="" width="80">
          <template #default="{row}">
            <el-button size="small" :type="row.status === 'active' ? 'danger' : 'success'" @click="toggle(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { getAdminUsers, toggleUserStatus } from '@/api'; import { ElMessage } from 'element-plus';
const items = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const search = ref('');
async function load() {
  loading.value = true;
  try {
    const r = await getAdminUsers({ page: page.value, q: search.value || undefined });
    items.value = r.data;
    total.value = r.meta?.total || 0;
  } catch {
    items.value = [];
    total.value = 0;
  } finally { loading.value = false; }
}
async function toggle(row) {
  try {
    await toggleUserStatus(row.id);
    ElMessage.success('操作成功');
    load();
  } catch (e) { ElMessage.error(e.response?.data?.error?.message || '操作失败'); }
}
onMounted(load);
</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}</style>
