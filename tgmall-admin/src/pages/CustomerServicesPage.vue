<template>
  <div class="page">
    <div class="main">
      <div class="page-header">
        <h1>{{ $t('settings.customerServices') }}</h1>
        <el-button type="primary" @click="openDialog()">{{ $t('common.create') }}</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column :label="$t('common.name')">
          <template #default="{row}">
            <div>{{ row.nameKm }} / {{ row.nameEn }} / {{ row.nameZh }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="telegramUsername" :label="$t('settings.telegramUsername')" width="140" />
        <el-table-column prop="phone" :label="$t('settings.phone')" width="120" />
        <el-table-column prop="workHours" :label="$t('settings.workHours')" width="140" />
        <el-table-column prop="sortOrder" :label="$t('settings.sortOrder')" width="80" />
        <el-table-column :label="$t('settings.isDefault')" width="80">
          <template #default="{row}">
            <el-tag v-if="row.isDefault" type="success">{{ $t('settings.isDefault') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.id)" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.action')" width="220">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">{{ $t('common.edit') }}</el-button>
            <el-button size="small" type="warning" :disabled="row.isDefault" @click="setDefault(row.id)">{{ $t('settings.setDefault') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="form.id ? $t('settings.edit') : $t('settings.create')" width="520px">
        <el-form :model="form" label-width="100px">
          <el-form-item :label="$t('settings.nameKm')"><el-input v-model="form.nameKm" /></el-form-item>
          <el-form-item :label="$t('settings.nameEn')"><el-input v-model="form.nameEn" /></el-form-item>
          <el-form-item :label="$t('settings.nameZh')"><el-input v-model="form.nameZh" /></el-form-item>
          <el-form-item :label="$t('settings.telegramUsername')"><el-input v-model="form.telegramUsername" /></el-form-item>
          <el-form-item :label="$t('settings.phone')"><el-input v-model="form.phone" /></el-form-item>
          <el-form-item :label="$t('settings.workHours')"><el-input v-model="form.workHours" :placeholder="$t('settings.placeholder.workHours')" /></el-form-item>
          <el-form-item :label="$t('settings.sortOrder')"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
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
import {
  getCustomerServices,
  createCustomerService,
  updateCustomerService,
  toggleCustomerService,
  setDefaultCustomerService,
} from '@/api';

const { t } = inject('i18n');
const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const defaultForm = {
  id: null,
  nameKm: '',
  nameEn: '',
  nameZh: '',
  telegramUsername: '',
  phone: '',
  workHours: '',
  sortOrder: 0,
};
const form = ref({ ...defaultForm });

async function load() {
  loading.value = true;
  try {
    const r = await getCustomerServices({ limit: 100 });
    items.value = r.data || [];
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.loadError'));
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  form.value = row ? { ...row } : { ...defaultForm };
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    const data = { ...form.value };
    delete data.id;
    if (form.value.id) {
      await updateCustomerService(form.value.id, data);
    } else {
      await createCustomerService(data);
    }
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
    await toggleCustomerService(id);
    ElMessage.success(t('settings.toggleSuccess'));
    load();
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.toggleError'));
  }
}

async function setDefault(id) {
  try {
    await setDefaultCustomerService(id);
    ElMessage.success(t('settings.setDefaultSuccess'));
    load();
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.setDefaultError'));
  }
}

onMounted(load);
</script>
<style scoped>
.page{min-height:100vh;background:#f5f5f5}

.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
</style>
