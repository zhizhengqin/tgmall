<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h1>配送规则</h1>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column label="城市">
          <template #default="{row}">
            <div>{{ row.cityNameKm }} / {{ row.cityNameEn }} / {{ row.cityNameZh }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="minOrderAmountUsd" label="起送金额" width="120">
          <template #default="{row}">${{ row.minOrderAmountUsd }}</template>
        </el-table-column>
        <el-table-column prop="shippingFeeUsd" label="运费" width="100">
          <template #default="{row}">${{ row.shippingFeeUsd }}</template>
        </el-table-column>
        <el-table-column prop="freeShippingThresholdUsd" label="免运门槛" width="120">
          <template #default="{row}">${{ row.freeShippingThresholdUsd }}</template>
        </el-table-column>
        <el-table-column prop="estimatedDeliveryDays" label="预计天数" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.id)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" title="编辑配送规则" width="500px">
        <el-form :model="form" label-width="120px">
          <el-form-item label="城市">
            <div>{{ form.cityNameKm }} / {{ form.cityNameEn }} / {{ form.cityNameZh }}</div>
          </el-form-item>
          <el-form-item label="起送金额 (USD)"><el-input-number v-model="form.minOrderAmountUsd" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="运费 (USD)"><el-input-number v-model="form.shippingFeeUsd" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="免运门槛 (USD)"><el-input-number v-model="form.freeShippingThresholdUsd" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="预计送达天数"><el-input-number v-model="form.estimatedDeliveryDays" :min="1" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { getDeliveryRules, updateDeliveryRule, toggleDeliveryRule } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const items = ref([]);
const loading = ref(false);
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
  const r = await getDeliveryRules();
  items.value = r.data || [];
  loading.value = false;
}

function openDialog(row) {
  form.value = { ...row };
  dialogVisible.value = true;
}

async function save() {
  const { cityCode, minOrderAmountUsd, shippingFeeUsd, freeShippingThresholdUsd, estimatedDeliveryDays } = form.value;
  await updateDeliveryRule(cityCode, {
    minOrderAmountUsd,
    shippingFeeUsd,
    freeShippingThresholdUsd,
    estimatedDeliveryDays,
  });
  dialogVisible.value = false;
  load();
}

async function toggle(id) {
  await toggleDeliveryRule(id);
  load();
}

onMounted(load);
</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}</style>