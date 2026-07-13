<template>
  <div class="page">
    <div class="main">
      <div class="page-header">
        <h1>{{ $t('settings.deliveryRules') }}</h1>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column :label="$t('common.name')">
          <template #default="{row}">
            <div>{{ row.cityNameKm }} / {{ row.cityNameEn }} / {{ row.cityNameZh }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="minOrderAmountUsd" :label="$t('settings.minOrderAmountUsd')" width="140">
          <template #default="{row}">${{ row.minOrderAmountUsd }}</template>
        </el-table-column>
        <el-table-column prop="shippingFeeUsd" :label="$t('settings.shippingFeeUsd')" width="120">
          <template #default="{row}">${{ row.shippingFeeUsd }}</template>
        </el-table-column>
        <el-table-column prop="freeShippingThresholdUsd" :label="$t('settings.freeShippingThresholdUsd')" width="140">
          <template #default="{row}">${{ row.freeShippingThresholdUsd }}</template>
        </el-table-column>
        <el-table-column prop="estimatedDeliveryDays" :label="$t('settings.estimatedDeliveryDays')" width="120" />
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.id)" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.action')" width="100">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">{{ $t('common.edit') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="$t('settings.edit')" width="500px">
        <el-form :model="form" label-width="140px">
          <el-form-item :label="$t('common.name')">
            <div>{{ form.cityNameKm }} / {{ form.cityNameEn }} / {{ form.cityNameZh }}</div>
          </el-form-item>
          <el-form-item :label="$t('settings.minOrderAmountUsd')"><el-input-number v-model="form.minOrderAmountUsd" :min="0" :precision="2" /></el-form-item>
          <el-form-item :label="$t('settings.shippingFeeUsd')"><el-input-number v-model="form.shippingFeeUsd" :min="0" :precision="2" /></el-form-item>
          <el-form-item :label="$t('settings.freeShippingThresholdUsd')"><el-input-number v-model="form.freeShippingThresholdUsd" :min="0" :precision="2" /></el-form-item>
          <el-form-item :label="$t('settings.estimatedDeliveryDays')"><el-input-number v-model="form.estimatedDeliveryDays" :min="1" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="save" :loading="saving">{{ $t('common.save') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { getDeliveryRules, updateDeliveryRule, toggleDeliveryRule } from '@/api';

const { t } = inject('i18n');
const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const form = ref({
  id: null,
  cityCode: '',
  cityNameKm: '',
  cityNameEn: '',
  cityNameZh: '',
  minOrderAmountUsd: 0,
  shippingFeeUsd: 0,
  freeShippingThresholdUsd: 0,
  estimatedDeliveryDays: 1,
});

async function load() {
  loading.value = true;
  try {
    const r = await getDeliveryRules();
    items.value = r.data || [];
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.loadError'));
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  form.value = { ...row };
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    const { cityCode, minOrderAmountUsd, shippingFeeUsd, freeShippingThresholdUsd, estimatedDeliveryDays } = form.value;
    await updateDeliveryRule(cityCode, {
      minOrderAmountUsd,
      shippingFeeUsd,
      freeShippingThresholdUsd,
      estimatedDeliveryDays,
    });
    ElMessage.success(t('settings.saveSuccess'));
    dialogVisible.value = false;
    load();
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.saveError'));
  } finally {
    saving.value = false;
  }
}

async function toggle(id) {
  try {
    await toggleDeliveryRule(id);
    ElMessage.success(t('settings.toggleSuccess'));
    load();
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.toggleError'));
  }
}

onMounted(load);
</script>
<style scoped>
.page{min-height:100vh;background:#f5f5f5}

.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
</style>
