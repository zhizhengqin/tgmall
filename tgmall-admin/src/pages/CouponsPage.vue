<template>
  <div class="page">
    <div class="main">
      <div class="header">
        <h1>{{ $t('nav.coupons') }}</h1>
        <el-button type="primary" @click="openCreate">{{ $t('common.create') }}</el-button>
      </div>

      <el-table :data="items" stripe>
        <el-table-column prop="titleKm" :label="$t('coupons.titleKm')" min-width="140" />
        <el-table-column :label="$t('coupons.type')" width="80">
          <template #default="s">{{ s.row.type === 'percent' ? '%' : '$' }}</template>
        </el-table-column>
        <el-table-column prop="value" :label="$t('coupons.value')" width="80" />
        <el-table-column :label="$t('coupons.status')" width="90">
          <template #default="s">
            <el-tag :type="s.row.status === 'active' ? 'success' : 'info'" size="small">{{ $t(`coupons.${s.row.status}`) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('coupons.used')" width="80">
          <template #default="s">{{ s.row.usedCount }}/{{ s.row.totalQty }}</template>
        </el-table-column>
        <el-table-column :label="$t('common.actions')" width="180">
          <template #default="s">
            <el-button size="small" @click="openEdit(s.row)">{{ $t('common.edit') }}</el-button>
            <el-button size="small" :type="s.row.status === 'active' ? 'warning' : 'success'" @click="toggle(s.row)">
              {{ s.row.status === 'active' ? $t('common.disable') : $t('common.enable') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination v-if="total > limit" class="pagination" :total="total" :page-size="limit" :current-page="page" layout="prev, pager, next" @current-change="onPage" />

      <!-- 创建/编辑弹窗 -->
      <el-dialog v-model="dialog" :title="editingId ? $t('common.edit') : $t('common.create')">
        <el-form :model="form" label-width="120px">
          <el-form-item :label="$t('coupons.titleKm')"><el-input v-model="form.titleKm" /></el-form-item>
          <el-form-item :label="$t('coupons.titleEn')"><el-input v-model="form.titleEn" /></el-form-item>
          <el-form-item :label="$t('coupons.titleZh')"><el-input v-model="form.titleZh" /></el-form-item>
          <el-form-item :label="$t('coupons.type')">
            <el-select v-model="form.type"><el-option value="fixed" label="Fixed ($)" /><el-option value="percent" label="Percent (%)" /></el-select>
          </el-form-item>
          <el-form-item :label="$t('coupons.value')"><el-input-number v-model="form.value" :min="0" /></el-form-item>
          <el-form-item :label="$t('coupons.minSpend')"><el-input-number v-model="form.minSpend" :min="0" :precision="2" /></el-form-item>
          <el-form-item :label="$t('coupons.totalQty')"><el-input-number v-model="form.totalQty" :min="1" /></el-form-item>
          <el-form-item :label="$t('coupons.startDate')"><el-date-picker v-model="form.startDate" type="date" /></el-form-item>
          <el-form-item :label="$t('coupons.endDate')"><el-date-picker v-model="form.endDate" type="date" /></el-form-item>
        </el-form>
        <template #footer><el-button @click="dialog = false">{{ $t('common.cancel') }}</el-button><el-button type="primary" @click="save" :loading="saving">{{ $t('common.save') }}</el-button></template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/api';

const items = ref([]);
const page = ref(1);
const total = ref(0);
const limit = 20;
const dialog = ref(false);
const editingId = ref(null);
const saving = ref(false);

const form = reactive({ titleKm: '', titleEn: '', titleZh: '', type: 'fixed', value: 0, minSpend: 0, totalQty: 100, startDate: null, endDate: null });

async function load() {
  const res = await api.get('/admin/coupons', { params: { page: page.value, limit } });
  items.value = res.data;
  total.value = res.meta?.total || 0;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { titleKm: '', titleEn: '', titleZh: '', type: 'fixed', value: 0, minSpend: 0, totalQty: 100, startDate: null, endDate: null });
  dialog.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  Object.assign(form, { ...row, startDate: row.startDate ? new Date(row.startDate) : null, endDate: row.endDate ? new Date(row.endDate) : null });
  dialog.value = true;
}

async function save() {
  saving.value = true;
  try {
    const data = { ...form, startDate: form.startDate?.toISOString(), endDate: form.endDate?.toISOString() };
    if (editingId.value) {
      await api.put(`/admin/coupons/${editingId.value}`, data);
    } else {
      await api.post('/admin/coupons', data);
    }
    dialog.value = false;
    load();
  } finally { saving.value = false; }
}

async function toggle(row) {
  const s = row.status === 'active' ? 'inactive' : 'active';
  await api.patch(`/admin/coupons/${row.id}/status`, { status: s });
  load();
}

function onPage(p) { page.value = p; load(); }
onMounted(() => load());
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; }  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .center { text-align: center; padding: 20px; color: #999; } .pagination { margin-top: 16px; justify-content: flex-end; }</style>
