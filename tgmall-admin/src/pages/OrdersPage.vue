<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h1>{{ $t('orders.title') }}</h1>
        <el-button @click="exportCsv" :loading="exporting">📥 {{ $t('orders.exportCsv') || '导出 CSV' }}</el-button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span style="font-size:13px;color:#666">{{ $t('orders.dateRange') || '日期范围' }}:</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('orders.startDate') || '开始日期'"
          :end-placeholder="$t('orders.endDate') || '结束日期'"
          style="width:260px"
          clearable
          @change="onDateChange"
        />
      </div>
      <el-tabs v-model="filter" @tab-change="load">
        <el-tab-pane :label="$t('orders.all')" name="" />
        <el-tab-pane :label="$t('orders.pending_payment')" name="pending_payment" />
        <el-tab-pane :label="$t('orders.paid')" name="paid" />
        <el-tab-pane :label="$t('orders.shipped')" name="shipped" />
        <el-tab-pane :label="$t('orders.completed')" name="completed" />
      </el-tabs>
      <el-table :data="items" v-loading="loading">
        <el-table-column prop="orderNumber" :label="$t('orders.orderNumber')" width="180" />
        <el-table-column :label="$t('orders.amount')" width="100"><template #default="{row}">${{row.totalUsd}}</template></el-table-column>
        <el-table-column :label="$t('orders.status') || $t('products.status')" width="100">
          <template #default="{row}"><el-tag :type="tag(row.status)">{{ $t(`orders.${row.status}`) || row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="customerName" :label="$t('orders.customer')" />
        <el-table-column :label="$t('orders.date')" width="110"><template #default="{row}">{{row.createdAt?.slice(0,10)}}</template></el-table-column>
        <el-table-column label="" width="80"><template #default="{row}"><el-button size="small" @click="$router.push(`/orders/${row.id}`)">{{ $t('orders.detail') }}</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { getOrders, exportOrdersCsv } from '@/api'; import { ElMessage } from 'element-plus'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const items = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const filter = ref(''); const exporting = ref(false); const dateRange = ref([]);
function tag(s) { const m={pending_payment:'warning',paid:'primary',shipped:'info',completed:'success',cancelled:'danger'}; return m[s]||''; }
function buildParams() {
  const params = { page: page.value, status: filter.value || undefined };
  if (dateRange.value && dateRange.value.length === 2) {
    params.start_date = dateRange.value[0];
    params.end_date = dateRange.value[1];
  }
  return params;
}
async function load() { loading.value = true; const r = await getOrders(buildParams()); items.value = r.data; total.value = r.meta?.total||0; loading.value = false; }
function onDateChange() { page.value = 1; load(); }
async function exportCsv() {
  exporting.value = true;
  try {
    const res = await exportOrdersCsv(buildParams());
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch { ElMessage.error('导出失败'); }
  exporting.value = false;
}
onMounted(load);
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; }</style>
