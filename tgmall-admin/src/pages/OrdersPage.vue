<template>
  <div class="page">
    <div class="main">
      <div class="page-header">
        <h1>{{ $t('orders.title') }}</h1>
        <el-button @click="exportCsv" :loading="exporting">📥 {{ $t('orders.exportCsv') || '导出 CSV' }}</el-button>
      </div>

      <div class="filter-bar">
        <span class="filter-label">{{ $t('orders.dateRange') || '日期范围' }}:</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('orders.startDate') || '开始日期'"
          :end-placeholder="$t('orders.endDate') || '结束日期'"
          clearable
          @change="onDateChange"
        />
      </div>

      <el-tabs v-model="filter" @tab-change="load" class="order-tabs">
        <el-tab-pane :label="$t('orders.all')" name="" />
        <el-tab-pane :label="$t('orders.pending_payment')" name="pending_payment" />
        <el-tab-pane :label="$t('orders.confirmed')" name="confirmed" />
        <el-tab-pane :label="$t('orders.paid')" name="paid" />
        <el-tab-pane :label="$t('orders.shipped')" name="shipped" />
        <el-tab-pane :label="$t('orders.completed')" name="completed" />
      </el-tabs>

      <!-- Desktop table -->
      <el-table v-if="!isMobile" :data="items" v-loading="loading" data-testid="orders-table">
        <el-table-column prop="orderNumber" :label="$t('orders.orderNumber')" width="180" />
        <el-table-column :label="$t('orders.amount')" width="100">
          <template #default="{ row }">${{ row.totalUsd }}</template>
        </el-table-column>
        <el-table-column :label="$t('orders.status') || $t('products.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="tag(row.status)">{{ $t(`orders.${row.status}`) || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" :label="$t('orders.customer')" />
        <el-table-column :label="$t('orders.date')" width="110">
          <template #default="{ row }">{{ row.createdAt?.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="" width="80">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/orders/${row.id}`)">{{ $t('orders.detail') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile cards -->
      <div v-else class="order-cards" data-testid="orders-cards">
        <el-card v-for="row in items" :key="row.id" shadow="hover" class="order-card" data-testid="order-card">
          <div class="order-card-row">
            <span class="order-card-label">{{ $t('orders.orderNumber') }}</span>
            <span class="order-card-value">{{ row.orderNumber }}</span>
          </div>
          <div class="order-card-row">
            <span class="order-card-label">{{ $t('orders.amount') }}</span>
            <span class="order-card-value">${{ row.totalUsd }}</span>
          </div>
          <div class="order-card-row">
            <span class="order-card-label">{{ $t('orders.status') || $t('products.status') }}</span>
            <el-tag :type="tag(row.status)" size="small">{{ $t(`orders.${row.status}`) || row.status }}</el-tag>
          </div>
          <div class="order-card-row">
            <span class="order-card-label">{{ $t('orders.customer') }}</span>
            <span class="order-card-value">{{ row.customerName }}</span>
          </div>
          <div class="order-card-row">
            <span class="order-card-label">{{ $t('orders.date') }}</span>
            <span class="order-card-value">{{ row.createdAt?.slice(0, 10) }}</span>
          </div>
          <div class="order-card-actions">
            <el-button size="small" @click="$router.push(`/orders/${row.id}`)">{{ $t('orders.detail') }}</el-button>
          </div>
        </el-card>
      </div>

      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top: 16px" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getOrders, exportOrdersCsv } from '@/api';
import { ElMessage } from 'element-plus';
import { useBreakpoint } from '@/composables/useBreakpoint';

const { isMobile } = useBreakpoint();

const items = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const filter = ref('');
const exporting = ref(false);
const dateRange = ref([]);

function tag(s) {
  const m = { pending_payment: 'warning', confirmed: '', paid: 'primary', shipped: 'info', completed: 'success', cancelled: 'danger' };
  return m[s] || '';
}

function buildParams() {
  const params = { page: page.value, status: filter.value || undefined };
  if (dateRange.value && dateRange.value.length === 2) {
    params.start_date = dateRange.value[0];
    params.end_date = dateRange.value[1];
  }
  return params;
}

async function load() {
  loading.value = true;
  const r = await getOrders(buildParams());
  items.value = r.data;
  total.value = r.meta?.total || 0;
  loading.value = false;
}

function onDateChange() {
  page.value = 1;
  load();
}

async function exportCsv() {
  exporting.value = true;
  try {
    const res = await exportOrdersCsv(buildParams());
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch {
    ElMessage.error('导出失败');
  }
  exporting.value = false;
}

onMounted(load);
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.filter-label { font-size: 13px; color: #666; white-space: nowrap; }
.order-cards { display: flex; flex-direction: column; gap: 12px; }
.order-card { }
.order-card-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.order-card-row:last-of-type { border-bottom: none; }
.order-card-label { font-size: 13px; color: #999; }
.order-card-value { font-size: 14px; font-weight: 500; }
.order-card-actions { display: flex; justify-content: flex-end; margin-top: 10px; }

@media (max-width: 767px) {
  .page-header { margin-bottom: 12px; }
  .page-header h1 { font-size: 18px; }
  .filter-bar { flex-direction: column; align-items: stretch; gap: 6px; }
  .filter-label { font-size: 12px; }
  .order-tabs { font-size: 13px; }
}
</style>
