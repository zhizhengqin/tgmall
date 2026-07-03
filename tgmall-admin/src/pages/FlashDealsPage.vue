<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div class="page-header">
        <h1>限时专区</h1>
        <el-button type="primary" @click="openDialog()">新建专区</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column label="商品" min-width="200">
          <template #default="{row}">
            <div class="product-cell">
              <img v-if="row.product?.images?.[0]?.url" :src="row.product.images[0].url" class="product-thumb" />
              <span>{{ row.product?.nameKm || row.product?.nameEn || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="原价" width="120">
          <template #default="{row}">
            <span class="orig-price">${{ row.product?.priceUsd || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="专区价" width="140">
          <template #default="{row}">
            <span class="deal-price">${{ row.dealPriceUsd }}</span>
            <span class="deal-price-khr"> / ៛{{ row.dealPriceKhr.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="120">
          <template #default="{row}">
            <span>{{ row.soldCount }}/{{ row.dealStock }}</span>
            <el-progress :percentage="Math.round(row.soldCount/row.dealStock*100)" :stroke-width="4" :show-text="false" />
          </template>
        </el-table-column>
        <el-table-column prop="cityCode" label="城市" width="100">
          <template #default="{row}">{{ row.cityCode || '全部' }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="70" />
        <el-table-column label="状态" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.id)" />
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{row}">
            <div class="time-cell">
              <span v-if="row.startAt">{{ new Date(row.startAt).toLocaleDateString() }}</span>
              <span v-else>不限</span>
              <span> ~ </span>
              <span v-if="row.endAt">{{ new Date(row.endAt).toLocaleDateString() }}</span>
              <span v-else>不限</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="form.id ? '编辑专区' : '新建专区'" width="560px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="商品" required>
            <el-select v-model="form.product_id" filterable remote :remote-method="searchProducts" :loading="searching" placeholder="搜索商品..." style="width:100%" clearable>
              <el-option v-for="p in productOptions" :key="p.id" :label="p.label" :value="p.id">
                <div class="product-option">
                  <img v-if="p.image" :src="p.image" class="option-thumb" />
                  <span>{{ p.label }}</span>
                  <span class="option-price">${{ p.priceUsd }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="专区价 USD" required>
            <el-input-number v-model="form.deal_price_usd" :min="0.01" :precision="2" style="width:100%" />
          </el-form-item>
          <el-form-item label="专区价 KHR" required>
            <el-input-number v-model="form.deal_price_khr" :min="1" :precision="0" style="width:100%" />
          </el-form-item>
          <el-form-item label="专区库存" required>
            <el-input-number v-model="form.deal_stock" :min="1" style="width:100%" />
          </el-form-item>
          <el-form-item label="城市">
            <el-input v-model="form.city_code" placeholder="留空表示全城通用" />
          </el-form-item>
          <el-form-item label="开始时间">
            <el-date-picker v-model="form.start_at" type="datetime" placeholder="不限" style="width:100%" value-format="YYYY-MM-DDTHH:mm:ss" />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-date-picker v-model="form.end_at" type="datetime" placeholder="不限" style="width:100%" value-format="YYYY-MM-DDTHH:mm:ss" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sort_order" :min="0" style="width:100%" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="form.active" active-text="启用" inactive-text="停用" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="save" :loading="saving">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';
import { getFlashDeals, createFlashDeal, updateFlashDeal, toggleFlashDeal, getProducts } from '@/api';

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const searching = ref(false);
const productOptions = ref([]);

const defaultForm = {
  id: null,
  product_id: '',
  deal_price_usd: 1,
  deal_price_khr: 4000,
  deal_stock: 10,
  city_code: '',
  start_at: '',
  end_at: '',
  sort_order: 0,
  active: true,
};
const form = ref({ ...defaultForm });

async function load() {
  loading.value = true;
  try {
    const r = await getFlashDeals({ limit: 100 });
    items.value = r.data || [];
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || '加载失败');
  } finally { loading.value = false; }
}

async function searchProducts(q) {
  if (!q || q.length < 2) { productOptions.value = []; return; }
  searching.value = true;
  try {
    const r = await getProducts({ q, limit: 20 });
    productOptions.value = (r.data || []).map((p) => ({
      id: p.id,
      label: `${p.nameKm}${p.nameEn ? ' / ' + p.nameEn : ''}`,
      priceUsd: p.priceUsd,
      image: p.images?.[0]?.url || '',
    }));
  } catch { /* ignore */ }
  finally { searching.value = false; }
}

function openDialog(row) {
  if (row) {
    form.value = {
      id: row.id,
      product_id: row.productId,
      deal_price_usd: row.dealPriceUsd,
      deal_price_khr: row.dealPriceKhr,
      deal_stock: row.dealStock,
      city_code: row.cityCode || '',
      start_at: row.startAt ? new Date(row.startAt).toISOString().slice(0, 19) : '',
      end_at: row.endAt ? new Date(row.endAt).toISOString().slice(0, 19) : '',
      sort_order: row.sortOrder,
      active: row.status === 'active',
    };
    // pre-populate product option for edit
    if (row.product) {
      productOptions.value = [{
        id: row.product.id,
        label: `${row.product.nameKm}${row.product.nameEn ? ' / ' + row.product.nameEn : ''}`,
        priceUsd: row.product.priceUsd,
        image: row.product.images?.[0]?.url || '',
      }];
    }
  } else {
    form.value = { ...defaultForm, id: null };
    productOptions.value = [];
  }
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.product_id) { ElMessage.error('请选择商品'); return; }
  if (!form.value.deal_price_usd || form.value.deal_price_usd <= 0) { ElMessage.error('专区价格至少 $0.01'); return; }
  if (!form.value.deal_stock || form.value.deal_stock < 1) { ElMessage.error('库存至少为 1'); return; }

  saving.value = true;
  try {
    const body = {
      product_id: form.value.product_id,
      deal_price_usd: form.value.deal_price_usd,
      deal_price_khr: form.value.deal_price_khr,
      deal_stock: form.value.deal_stock,
      city_code: form.value.city_code || null,
      start_at: form.value.start_at || null,
      end_at: form.value.end_at || null,
      sort_order: form.value.sort_order,
      status: form.value.active ? 'active' : 'inactive',
    };
    if (form.value.id) {
      await updateFlashDeal(form.value.id, body);
      ElMessage.success('更新成功');
    } else {
      await createFlashDeal(body);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    load();
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || '保存失败');
  } finally { saving.value = false; }
}

async function toggle(id) {
  try {
    await toggleFlashDeal(id);
    load();
  } catch (err) {
    ElMessage.error(err.response?.data?.error?.message || '操作失败');
  }
}

onMounted(load);
</script>

<style scoped>
.page{min-height:100vh;background:#f5f5f5}
.main{margin-left:220px;padding:20px}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.page-header h1{font-size:20px;font-weight:600;margin:0}
.product-cell{display:flex;align-items:center;gap:8px}
.product-thumb{width:40px;height:40px;border-radius:4px;object-fit:cover}
.orig-price{text-decoration:line-through;color:#999}
.deal-price{color:#c43a30;font-weight:700}
.deal-price-khr{font-size:12px;color:#999}
.time-cell{font-size:12px;color:#666}
.product-option{display:flex;align-items:center;gap:8px}
.option-thumb{width:32px;height:32px;border-radius:4px;object-fit:cover}
.option-price{color:#999;font-size:12px;margin-left:auto}
</style>
