<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <h1>平台设置</h1>

      <el-card style="max-width:680px">
        <template #header>基本信息</template>
        <el-form :model="form" label-width="100px" size="default">
          <el-form-item label="商城名称">
            <el-input v-model="form.storeName" placeholder="TG Mall" />
          </el-form-item>
          <el-form-item label="Logo URL">
            <el-input v-model="form.storeLogo" placeholder="https://..." />
          </el-form-item>
          <el-form-item label="客服电话">
            <el-input v-model="form.contactPhone" placeholder="+855..." />
          </el-form-item>
          <el-form-item label="客服邮箱">
            <el-input v-model="form.contactEmail" placeholder="support@..." />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card style="max-width:680px;margin-top:16px">
        <template #header>运营状态</template>
        <el-form label-width="100px">
          <el-form-item label="维护模式">
            <el-switch v-model="form.maintenanceMode" active-text="开启" inactive-text="关闭" />
            <span style="margin-left:12px;font-size:12px;color:#999">开启后消费者端显示维护公告</span>
          </el-form-item>
          <el-form-item label="公告内容">
            <el-input v-model="form.announcement" type="textarea" :rows="3" placeholder="显示在首页顶部的公告..." />
          </el-form-item>
        </el-form>
      </el-card>

      <div style="margin-top:20px">
        <el-button type="primary" @click="save" :loading="saving">保存设置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { getPlatformSettings, updatePlatformSettings } from '@/api';
import { ElMessage } from 'element-plus';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const form = reactive({
  storeName: '', storeLogo: '', contactPhone: '', contactEmail: '',
  maintenanceMode: false, announcement: '',
});
const saving = ref(false);

onMounted(async () => {
  try {
    const res = await getPlatformSettings();
    Object.assign(form, res.data);
  } catch { /* ignore */ }
});

async function save() {
  saving.value = true;
  try {
    await updatePlatformSettings({
      store_name: form.storeName,
      store_logo: form.storeLogo,
      contact_phone: form.contactPhone,
      contact_email: form.contactEmail,
      maintenance_mode: form.maintenanceMode,
      announcement: form.announcement,
    });
    ElMessage.success('保存成功');
  } catch (e) {
    ElMessage.error(e.response?.data?.error?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.main { margin-left: 220px; padding: 20px; }
</style>
