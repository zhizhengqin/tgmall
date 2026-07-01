<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div class="page-header">
        <h1>{{ $t('settings.banners') }}</h1>
        <el-button type="primary" @click="openDialog()">{{ $t('common.create') }}</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column :label="$t('common.name')">
          <template #default="{row}">
            <div>{{ row.titleKm }} / {{ row.titleEn }} / {{ row.titleZh }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('settings.imageUrl')" width="120">
          <template #default="{row}">
            <img v-if="row.imageUrl" :src="row.imageUrl" class="banner-thumb" />
          </template>
        </el-table-column>
        <el-table-column prop="linkType" :label="$t('settings.linkType')" width="100" />
        <el-table-column prop="linkTarget" :label="$t('settings.linkTarget')" width="140" />
        <el-table-column prop="cityCode" :label="$t('settings.cityCode')" width="100" />
        <el-table-column prop="sortOrder" :label="$t('settings.sortOrder')" width="80" />
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

      <el-dialog v-model="dialogVisible" :title="form.id ? $t('settings.edit') : $t('settings.create')" width="520px">
        <el-form :model="form" label-width="100px">
          <el-form-item :label="$t('settings.titleKm')"><el-input v-model="form.titleKm" /></el-form-item>
          <el-form-item :label="$t('settings.titleEn')"><el-input v-model="form.titleEn" /></el-form-item>
          <el-form-item :label="$t('settings.titleZh')"><el-input v-model="form.titleZh" /></el-form-item>
          <el-form-item :label="$t('settings.imageUrl')"><el-input v-model="form.imageUrl" /></el-form-item>
          <el-form-item :label="$t('settings.linkType')">
            <el-select v-model="form.linkType" :placeholder="$t('settings.placeholder.selectLinkType')" style="width:100%">
              <el-option :label="$t('settings.linkTypes.product')" value="product" />
              <el-option :label="$t('settings.linkTypes.category')" value="category" />
              <el-option :label="$t('settings.linkTypes.url')" value="url" />
              <el-option :label="$t('settings.linkTypes.page')" value="page" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('settings.linkTarget')"><el-input v-model="form.linkTarget" /></el-form-item>
          <el-form-item :label="$t('settings.cityCode')"><el-input v-model="form.cityCode" /></el-form-item>
          <el-form-item :label="$t('settings.sortOrder')"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
          <el-form-item :label="$t('common.status')">
            <el-switch v-model="form.active" :active-text="$t('common.success')" :inactive-text="$t('common.error')" />
          </el-form-item>
          <el-form-item :label="$t('settings.startAt')"><el-date-picker v-model="form.startAt" type="datetime" :placeholder="$t('settings.placeholder.selectDateTime')" style="width:100%" /></el-form-item>
          <el-form-item :label="$t('settings.endAt')"><el-date-picker v-model="form.endAt" type="datetime" :placeholder="$t('settings.placeholder.selectDateTime')" style="width:100%" /></el-form-item>
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
import { getBanners, createBanner, updateBanner, toggleBanner } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const { t } = inject('i18n');
const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const defaultForm = {
  id: null,
  titleKm: '',
  titleEn: '',
  titleZh: '',
  imageUrl: '',
  linkType: 'product',
  linkTarget: '',
  cityCode: '',
  sortOrder: 0,
  active: true,
  startAt: '',
  endAt: '',
};
const form = ref({ ...defaultForm });

async function load() {
  loading.value = true;
  try {
    const r = await getBanners({ limit: 100 });
    items.value = r.data || [];
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || t('settings.loadError'));
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  if (row) {
    form.value = { ...row, active: row.status === 'active' };
  } else {
    form.value = { ...defaultForm };
  }
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    const data = { ...form.value };
    delete data.id;
    data.status = form.value.active ? 'active' : 'inactive';
    delete data.active;
    if (form.value.id) {
      await updateBanner(form.value.id, data);
    } else {
      await createBanner(data);
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
    await toggleBanner(id);
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
.banner-thumb{width:80px;height:48px;object-fit:cover;border-radius:4px}
</style>
