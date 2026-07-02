<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <h1>{{ $t('nav.feedback') }}</h1>

      <el-radio-group v-model="statusFilter" @change="load" style="margin-bottom:16px">
        <el-radio-button value="">{{ $t('common.all') }}</el-radio-button>
        <el-radio-button value="pending">{{ $t('feedback.pending') }}</el-radio-button>
        <el-radio-button value="resolved">{{ $t('feedback.resolved') }}</el-radio-button>
      </el-radio-group>

      <el-table :data="items" stripe>
        <el-table-column :label="$t('feedback.user')" min-width="120">
          <template #default="s">
            {{ s.row.user?.firstName || '' }} {{ s.row.user?.lastName || '' }}
            <div style="font-size:12px;color:#999">{{ s.row.user?.phone }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="content" :label="$t('feedback.content')" min-width="200" show-overflow-tooltip />
        <el-table-column :label="$t('feedback.status')" width="100">
          <template #default="s">
            <el-tag :type="s.row.status === 'resolved' ? 'success' : 'warning'" size="small">{{ s.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('feedback.date')" width="160">
          <template #default="s">{{ new Date(s.row.createdAt).toLocaleDateString() }}</template>
        </el-table-column>
        <el-table-column :label="$t('common.actions')" width="120">
          <template #default="s">
            <el-button v-if="s.row.status !== 'resolved'" size="small" type="primary" @click="resolve(s.row.id)">{{ $t('feedback.resolve') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination v-if="total > limit" class="pagination" :total="total" :page-size="limit" :current-page="page" layout="prev, pager, next" @current-change="onPage" />

      <!-- 图片预览弹窗 -->
      <el-dialog v-model="imagesDialog" :title="$t('feedback.images')">
        <div v-for="(img, i) in viewingImages" :key="i"><img :src="img" style="max-width:100%;margin-bottom:8px" /></div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const items = ref([]);
const page = ref(1);
const total = ref(0);
const limit = 20;
const statusFilter = ref('');
const imagesDialog = ref(false);
const viewingImages = ref([]);

async function load() {
  const params = { page: page.value, limit };
  if (statusFilter.value) params.status = statusFilter.value;
  const res = await api.get('/admin/feedback', { params });
  items.value = res.data.items;
  total.value = res.data.total;
}

async function resolve(id) {
  await api.patch(`/admin/feedback/${id}/resolve`);
  load();
}

function onPage(p) { page.value = p; load(); }
onMounted(() => load());
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; } .pagination { margin-top: 16px; justify-content: flex-end; }</style>
