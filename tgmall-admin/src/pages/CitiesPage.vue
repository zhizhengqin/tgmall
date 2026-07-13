<template>
  <div class="page">
    <div class="main">
      <div class="page-header">
        <h1>{{ $t('settings.cities') }}</h1>
        <el-button type="primary" @click="openDialog()">{{ $t('common.create') }}</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="code" :label="$t('settings.code')" width="120" />
        <el-table-column :label="$t('common.name')">
          <template #default="{row}">
            <div>{{ row.nameKm }} / {{ row.nameEn }} / {{ row.nameZh }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" :label="$t('settings.sortOrder')" width="80" />
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.code)" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.action')" width="100">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">{{ $t('common.edit') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="form.code ? $t('settings.edit') : $t('settings.create')" width="500px">
        <el-form :model="form" label-width="100px">
          <el-form-item :label="$t('settings.code')"><el-input v-model="form.code" :disabled="!!form.code" /></el-form-item>
          <el-form-item :label="$t('settings.nameKm')"><el-input v-model="form.nameKm" /></el-form-item>
          <el-form-item :label="$t('settings.nameEn')"><el-input v-model="form.nameEn" /></el-form-item>
          <el-form-item :label="$t('settings.nameZh')"><el-input v-model="form.nameZh" /></el-form-item>
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
import { getCities, createCity, updateCity, toggleCity } from '@/api';

const { t } = inject('i18n');
const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const form = ref({ code: '', nameKm: '', nameEn: '', nameZh: '', sortOrder: 0 });

async function load() {
  loading.value = true;
  try {
    const r = await getCities({ limit: 100 });
    items.value = r.data || [];
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.loadError'));
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  form.value = row ? { ...row } : { code: '', nameKm: '', nameEn: '', nameZh: '', sortOrder: 0 };
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (form.value.code) {
      await updateCity(form.value.code, form.value);
    } else {
      await createCity(form.value);
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

async function toggle(code) {
  try {
    await toggleCity(code);
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
