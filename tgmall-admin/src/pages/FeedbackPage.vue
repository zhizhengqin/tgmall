<template>
  <div class="page">
    <div class="main">
      <h1>{{ $t('nav.feedback') }}</h1>

      <el-radio-group v-model="statusFilter" @change="load" style="margin-bottom: 16px">
        <el-radio-button value="">{{ $t('common.all') }}</el-radio-button>
        <el-radio-button value="pending">{{ $t('feedback.pending') }}</el-radio-button>
        <el-radio-button value="resolved">{{ $t('feedback.resolved') }}</el-radio-button>
      </el-radio-group>

      <!-- Desktop table -->
      <el-table v-if="!isMobile" :data="items" stripe data-testid="feedback-table">
        <el-table-column :label="$t('feedback.user')" min-width="120">
          <template #default="s">
            {{ s.row.user?.firstName || '' }} {{ s.row.user?.lastName || '' }}
            <div style="font-size: 12px; color: #999">{{ s.row.user?.phone }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="content" :label="$t('feedback.content')" min-width="200" show-overflow-tooltip />
        <el-table-column :label="$t('feedback.status')" width="100">
          <template #default="s">
            <el-tag :type="s.row.status === 'resolved' ? 'success' : 'warning'" size="small">{{ $t(`feedback.${s.row.status}`) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('feedback.date')" width="160">
          <template #default="s">{{ new Date(s.row.createdAt).toLocaleDateString() }}</template>
        </el-table-column>
        <el-table-column :label="$t('common.actions')" width="160">
          <template #default="s">
            <el-button v-if="s.row.status !== 'resolved'" size="small" type="primary" @click="resolve(s.row.id)"
            >{{ $t('feedback.resolve') }}</el-button>
            <el-button v-if="s.row.images?.length" size="small" @click="openImages(s.row.images)"
            >{{ $t('feedback.images') || '图片' }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile cards -->
      <div v-else class="feedback-cards" data-testid="feedback-cards">
        <el-card v-for="item in items" :key="item.id" shadow="hover" class="feedback-card" data-testid="feedback-card">
          <div class="feedback-card-row">
            <span class="feedback-card-label">{{ $t('feedback.user') }}</span>
            <div class="feedback-card-value">
              <div>{{ item.user?.firstName || '' }} {{ item.user?.lastName || '' }}</div>
              <div v-if="item.user?.phone" style="font-size: 12px; color: #999">{{ item.user.phone }}</div>
            </div>
          </div>
          <div class="feedback-card-row">
            <span class="feedback-card-label">{{ $t('feedback.content') }}</span>
            <span class="feedback-card-value">{{ item.content }}</span>
          </div>
          <div class="feedback-card-row">
            <span class="feedback-card-label">{{ $t('feedback.status') }}</span>
            <el-tag :type="item.status === 'resolved' ? 'success' : 'warning'" size="small">{{ $t(`feedback.${item.status}`) }}</el-tag>
          </div>
          <div class="feedback-card-row">
            <span class="feedback-card-label">{{ $t('feedback.date') }}</span>
            <span class="feedback-card-value">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="feedback-card-actions">
            <el-button v-if="item.status !== 'resolved'" size="small" type="primary" @click="resolve(item.id)"
            >{{ $t('feedback.resolve') }}</el-button>
            <el-button v-if="item.images?.length" size="small" @click="openImages(item.images)"
            >{{ $t('feedback.images') || '图片' }}</el-button>
          </div>
        </el-card>
      </div>

      <el-pagination v-if="total > limit" class="pagination" :total="total" :page-size="limit" :current-page="page" layout="prev, pager, next" @current-change="onPage" />

      <!-- 图片预览弹窗 -->
      <el-dialog v-model="imagesDialog" :title="$t('feedback.images')">
        <div v-for="(img, i) in viewingImages" :key="i">
          <img :src="img" style="max-width: 100%; margin-bottom: 8px" />
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api';
import { useBreakpoint } from '@/composables/useBreakpoint';

const { isMobile } = useBreakpoint();

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

function openImages(images) {
  viewingImages.value = images || [];
  imagesDialog.value = true;
}

function onPage(p) {
  page.value = p;
  load();
}

onMounted(() => load());
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.pagination { margin-top: 16px; justify-content: flex-end; }
.feedback-cards { display: flex; flex-direction: column; gap: 12px; }
.feedback-card { }
.feedback-card-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.feedback-card-row:last-of-type { border-bottom: none; }
.feedback-card-label { font-size: 13px; color: #999; flex-shrink: 0; margin-right: 12px; }
.feedback-card-value { font-size: 14px; text-align: right; word-break: break-word; }
.feedback-card-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }

@media (max-width: 767px) {
  .feedback-card-value { max-width: 60%; }
}
</style>
