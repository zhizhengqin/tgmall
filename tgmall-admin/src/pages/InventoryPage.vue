<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <h1>{{ $t('inventory.title') }}</h1>

      <div style="display:flex;gap:12px;align-items:center;margin:16px 0;flex-wrap:wrap">
        <el-input v-model="search" :placeholder="$t('inventory.search')" clearable style="width:240px" @input="load" />
        <el-checkbox v-model="lowStockOnly" @change="load">{{ $t('inventory.filterLowStock') }}</el-checkbox>
        <el-button @click="showCheckDialog = true">{{ $t('inventory.check') }}</el-button>
        <el-button @click="exportCSV">{{ $t('inventory.export') }}</el-button>
      </div>

      <el-table :data="items" v-loading="loading" stripe
        :row-class-name="({row}) => row.lowStock ? 'low-stock-row' : ''">
        <el-table-column :label="$t('inventory.search')" min-width="180">
          <template #default="{row}"><div style="display:flex;align-items:center;gap:8px">
            <img v-if="row.images?.[0]" :src="row.images[0]" width="40" height="40" style="object-fit:cover;border-radius:4px" />
            <span>{{ row.nameKm || row.nameEn }}</span>
          </div></template>
        </el-table-column>
        <el-table-column :label="$t('inventory.stock')" width="120">
          <template #default="{row}">
            <el-popover trigger="click" :width="260">
              <template #reference>
                <span :style="{color: row.lowStock ? '#f56c6c' : '', cursor:'pointer', fontWeight:'bold'}">{{ row.stock }}</span>
              </template>
              <div>
                <p style="margin-bottom:8px">{{ $t('inventory.adjustStock') }}</p>
                <el-input-number v-model="adjustQty" :min="0" style="width:100%" />
                <el-input v-model="adjustNote" :placeholder="$t('inventory.note')" style="margin:8px 0" />
                <el-button type="primary" size="small" @click="doAdjust(row.id)">{{ $t('common.confirm') }}</el-button>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column :label="$t('inventory.alertThreshold')" width="120">
          <template #default="{row}">
            <el-input-number v-model="row._threshold" :min="0" size="small" controls-position="right" style="width:90px"
              @change="v => doSetThreshold(row.id, v)" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('inventory.status')" width="90">
          <template #default="{row}"><el-tag :type="row.status==='active'?'success':'info'" size="small">{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column :label="$t('inventory.stockLogs')" width="120">
          <template #default="{row}"><el-button size="small" @click="openLogs(row)">{{ $t('inventory.stockLogs') }}</el-button></template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>

    <!-- StockLog 抽屉 -->
    <el-drawer v-model="drawer" :title="logTitle" size="400px">
      <el-timeline v-if="logs.length">
        <el-timeline-item v-for="l in logs" :key="l.id"
          :timestamp="new Date(l.createdAt).toLocaleString()"
          :type="l.reason === 'auto_delist' ? 'danger' : l.reason === 'order_create' ? 'warning' : 'primary'">
          <p>{{ reasonLabel(l.reason) }}</p>
          <p style="font-size:12px;color:#909399">
            {{ l.beforeQty }} → {{ l.afterQty }}
            <span :style="{color: l.changeQty > 0 ? '#67c23a' : '#f56c6c'}">
              ({{ l.changeQty > 0 ? '+' : '' }}{{ l.changeQty }})
            </span>
          </p>
          <p v-if="l.note" style="font-size:12px;color:#909399">{{ l.note }}</p>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else />
    </el-drawer>

    <!-- 盘点对话框 -->
    <el-dialog v-model="showCheckDialog" :title="$t('inventory.checkTitle')" width="450px">
      <el-select v-model="checkProductId" filterable remote :remote-method="searchProducts"
        :placeholder="$t('inventory.selectProduct')" style="width:100%">
        <el-option v-for="p in checkProducts" :key="p.id" :label="`${p.nameKm} (${$t('inventory.systemQty')}: ${p.stock})`" :value="p.id" />
      </el-select>
      <div style="margin:16px 0">
        <p>{{ $t('inventory.systemQty') }}: <b>{{ systemQty }}</b></p>
        <el-input-number v-model="checkActualQty" :min="0" style="width:100%;margin-top:8px" :placeholder="$t('inventory.actualQty')" />
        <p v-if="checkProductId" style="margin-top:8px;color:#e6a23c">
          {{ $t('inventory.diff') }}: {{ checkActualQty - systemQty }}
        </p>
      </div>
      <el-input v-model="checkNote" :placeholder="$t('inventory.note')" />
      <template #footer>
        <el-button @click="showCheckDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="doCheck">{{ $t('inventory.check') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getInventory, adjustStock, getStockLogs, checkInventory, setAlertThreshold, getProducts } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const items = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0);
const search = ref(''); const lowStockOnly = ref(false);
const adjustQty = ref(0); const adjustNote = ref('');
const drawer = ref(false); const logs = ref([]); const logTitle = ref('');
const showCheckDialog = ref(false); const checkProductId = ref(null); const checkProducts = ref([]);
const checkActualQty = ref(0); const checkNote = ref(''); const systemQty = ref(0);

async function load() {
  loading.value = true;
  const r = await getInventory({ page: page.value, q: search.value || undefined, lowStockOnly: lowStockOnly.value });
  items.value = (r.data || []).map(p => ({ ...p, _threshold: p.alertThreshold }));
  total.value = r.meta?.total || 0; loading.value = false;
}
async function doAdjust(id) {
  await adjustStock(id, { qty: adjustQty.value, note: adjustNote.value || undefined });
  adjustQty.value = 0; adjustNote.value = ''; load();
}
async function doSetThreshold(id, v) {
  await setAlertThreshold(id, { threshold: v == null ? null : v }); load();
}
async function openLogs(row) {
  logTitle.value = (row.nameKm || row.nameEn) + ' — ' + '变更历史';
  const r = await getStockLogs(row.id, {});
  logs.value = r.data || []; drawer.value = true;
}
async function searchProducts(q) {
  const r = await getProducts({ q, limit: 10 });
  checkProducts.value = r.data || [];
  if (checkProductId.value) {
    const p = checkProducts.value.find(p => p.id === checkProductId.value);
    if (p) systemQty.value = p.stock;
  }
}
async function doCheck() {
  await checkInventory({ productId: checkProductId.value, actualQty: checkActualQty.value, note: checkNote.value || undefined });
  showCheckDialog.value = false; load();
}
function reasonLabel(r) {
  const map = { order_create: '下单', order_cancel: '取消订单', manual_adjust: '手动调整', stock_check: '盘点', auto_delist: '自动下架' };
  return map[r] || r;
}
function exportCSV() {
  const rows = items.value.map(p => [p.nameKm, p.stock, p.alertThreshold ?? '', p.status, p.lowStock ? '是' : '否'].join(','));
  const csv = '﻿名称,库存,预警阈值,状态,低库存\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'inventory.csv'; a.click();
}
onMounted(load);
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.main { margin-left: 220px; padding: 20px; }
:deep(.low-stock-row) { background: #fef0f0 !important; }
</style>
