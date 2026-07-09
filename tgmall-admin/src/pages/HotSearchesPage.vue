<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div class="page-header">
        <h1>{{ $t('settings.hotKeywords') }}</h1>
        <el-button type="primary" @click="openDialog()">{{ $t('common.create') }}</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column :label="$t('common.name')">
          <template #default="{row}">
            <div>{{ row.keyword }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" :label="$t('settings.sortOrder')" width="100" />
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

      <el-dialog v-model="dialogVisible" :title="form.id ? $t('settings.edit') : $t('settings.create')" width="500px">
        <el-form :model="form" label-width="100px">
          <el-form-item :label="$t('common.name')"><el-input v-model="form.keyword" /></el-form-item>
          <el-form-item :label="$t('settings.sortOrder')"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
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
import { getHotSearches, createHotSearch, updateHotSearch, toggleHotSearch } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const { t } = inject('i18n');
const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const form = ref({ keyword: '', sortOrder: 0 });

async function load() {
  loading.value = true;
  try {
    const r = await getHotSearches({ limit: 100 });
    items.value = r.data || [];
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.loadError'));
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  form.value = row ? { ...row, sort_order: row.sortOrder } : { keyword: '', sort_order: 0 };
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (form.value.id) {
      await updateHotSearch(form.value.id, form.value);
    } else {
      await createHotSearch(form.value);
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
    await toggleHotSearch(id);
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
.main{margin-left:220px;padding:20px}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
</style>
