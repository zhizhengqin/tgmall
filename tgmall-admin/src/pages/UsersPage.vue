<template>
  <div class="page">
    <div class="main">
      <h1>{{ $t('users.title') }}</h1>
      <el-input v-model="search" :placeholder="$t('users.search')" @input="load" clearable class="users-search" />

      <!-- Desktop table -->
      <el-table v-if="!isMobile" :data="items" v-loading="loading" :empty-text="$t('common.noData')">
        <el-table-column prop="firstName" :label="$t('users.firstName')" />
        <el-table-column prop="lastName" :label="$t('users.lastName')" />
        <el-table-column prop="phone" :label="$t('users.phone')" width="120" />
        <el-table-column prop="telegramId" :label="$t('users.telegramId')" width="120" />
        <el-table-column prop="status" :label="$t('users.status')" width="80">
          <template #default="{row}">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">{{ $t(`users.${row.status === 'active' ? 'active' : 'banned'}`) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('orders.date')" width="100">
          <template #default="{row}">{{ row.createdAt?.slice(0,10) }}</template>
        </el-table-column>
        <el-table-column label="" width="80">
          <template #default="{row}">
            <el-button size="small" :type="row.status === 'active' ? 'danger' : 'success'" @click="toggle(row)">
              {{ row.status === 'active' ? $t('users.ban') : $t('users.unban') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile cards -->
      <div v-else class="user-cards">
        <el-card v-for="row in items" :key="row.id" shadow="hover" class="user-card" data-testid="user-card">
          <div class="user-card-row">
            <span class="user-card-label">{{ $t('users.firstName') }}</span>
            <span class="user-card-value">{{ row.firstName }}</span>
          </div>
          <div class="user-card-row">
            <span class="user-card-label">{{ $t('users.lastName') }}</span>
            <span class="user-card-value">{{ row.lastName }}</span>
          </div>
          <div class="user-card-row">
            <span class="user-card-label">{{ $t('users.phone') }}</span>
            <span class="user-card-value">{{ row.phone }}</span>
          </div>
          <div class="user-card-row">
            <span class="user-card-label">{{ $t('users.telegramId') }}</span>
            <span class="user-card-value">{{ row.telegramId }}</span>
          </div>
          <div class="user-card-row">
            <span class="user-card-label">{{ $t('users.status') }}</span>
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">{{ $t(`users.${row.status === 'active' ? 'active' : 'banned'}`) }}</el-tag>
          </div>
          <div class="user-card-row">
            <span class="user-card-label">{{ $t('orders.date') }}</span>
            <span class="user-card-value">{{ row.createdAt?.slice(0,10) }}</span>
          </div>
          <div class="user-card-actions">
            <el-button size="small" :type="row.status === 'active' ? 'danger' : 'success'" @click="toggle(row)">
              {{ row.status === 'active' ? $t('users.ban') : $t('users.unban') }}
            </el-button>
          </div>
        </el-card>
      </div>

      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { getAdminUsers, toggleUserStatus } from '@/api'; import { ElMessage } from 'element-plus';
import { useBreakpoint } from '@/composables/useBreakpoint';
const { isMobile } = useBreakpoint();
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
<style scoped>.page{min-height:100vh;background:#f5f5f5}
.users-search { width: 100%; max-width: 300px; margin-bottom: 10px; }
.user-cards { display: flex; flex-direction: column; gap: 12px; }
.user-card-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.user-card-row:last-of-type { border-bottom: none; }
.user-card-label { font-size: 13px; color: #999; }
.user-card-value { font-size: 14px; font-weight: 500; }
.user-card-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
@media (max-width: 767px) {
  .users-search { max-width: 100%; }
}
</style>
