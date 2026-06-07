<template>
  <div class="page">
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <h1>{{ $t('merchant.title') }}</h1>
    </header>

    <form class="form" @submit.prevent="submit">
      <!-- 店铺名称（高棉语） -->
      <div class="field">
        <label>{{ $t('merchant.nameKm') }} <span class="required">*</span></label>
        <input v-model="form.name_km" :placeholder="$t('merchant.nameKmPlaceholder')" required />
      </div>

      <!-- 店铺名称（英语） -->
      <div class="field">
        <label>{{ $t('merchant.nameEn') }}</label>
        <input v-model="form.name_en" :placeholder="$t('merchant.nameEnPlaceholder')" />
      </div>

      <!-- 店主姓名 -->
      <div class="field">
        <label>{{ $t('merchant.ownerName') }} <span class="required">*</span></label>
        <input v-model="form.owner_name" :placeholder="$t('merchant.ownerNamePlaceholder')" required />
      </div>

      <!-- 手机号 -->
      <div class="field">
        <label>{{ $t('merchant.phone') }} <span class="required">*</span></label>
        <input v-model="form.phone" placeholder="+855 12345678" required />
        <span class="hint" v-if="phoneError">{{ phoneError }}</span>
      </div>

      <!-- 详细地址 -->
      <div class="field">
        <label>{{ $t('merchant.address') }} <span class="required">*</span></label>
        <input v-model="form.address" :placeholder="$t('merchant.addressPlaceholder')" required />
      </div>

      <!-- 主营品类 -->
      <div class="field">
        <label>{{ $t('merchant.category') }} <span class="required">*</span></label>
        <select v-model="form.category" required>
          <option value="">{{ $t('merchant.selectCategory') }}</option>
          <option value="fashion">{{ $t('home.fashion') }}</option>
          <option value="beauty">{{ $t('home.beauty') }}</option>
          <option value="electronics">{{ $t('home.electronics') }}</option>
          <option value="home">{{ $t('home.home') }}</option>
        </select>
      </div>

      <!-- 店铺简介 -->
      <div class="field">
        <label>{{ $t('merchant.description') }}</label>
        <textarea v-model="form.description" :placeholder="$t('merchant.descriptionPlaceholder')" rows="3" />
      </div>

      <!-- 提交 -->
      <button class="submit-btn" :disabled="submitting">
        {{ submitting ? $t('common.loading') : $t('merchant.submit') }}
      </button>

      <!-- 结果提示 -->
      <div v-if="result" class="result" :class="result.type">
        {{ result.message }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import api from '@/api';

const router = useRouter();
const userStore = useUserStore();
const submitting = ref(false);
const result = ref(null);

const form = reactive({
  name_km: '',
  name_en: '',
  owner_name: userStore.user?.firstName || '',
  phone: userStore.user?.phone || '+855',
  address: '',
  category: '',
  description: '',
});

const phoneError = computed(() => {
  if (!form.phone) return '';
  if (!/^\+855\d{8,9}$/.test(form.phone)) return '请输入有效的 +855 手机号';
  return '';
});

async function submit() {
  if (submitting.value) return;
  if (!form.name_km || !form.owner_name || !form.phone || !form.address || !form.category) {
    result.value = { type: 'error', message: '请填写所有必填字段' };
    return;
  }
  if (!/^\+855\d{8,9}$/.test(form.phone)) {
    result.value = { type: 'error', message: '手机号格式不正确' };
    return;
  }

  submitting.value = true;
  result.value = null;
  try {
    await api.post('/merchants/register', { ...form });
    result.value = {
      type: 'success',
      message: '申请已提交！预计 1-3 个工作日内审核。审核结果将通过 @xhzmall_bot 通知您。',
    };
    // 清空表单
    Object.assign(form, {
      name_km: '', name_en: '', owner_name: '', phone: '+855',
      address: '', category: '', description: '',
    });
  } catch (err) {
    const msg = err?.response?.data?.error?.message || '提交失败，请稍后重试';
    result.value = { type: 'error', message: msg };
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-bottom: 40px; }
.page-header { display: flex; align-items: center; gap: 12px; padding: var(--space-md) var(--space-lg); background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 18px; background: none; border: none; color: var(--fg); cursor: pointer; padding: 0; }
.page-header h1 { font-size: 17px; font-weight: 700; margin: 0; }
.form { padding: var(--space-lg); max-width: 480px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 600; color: var(--fg); margin-bottom: 6px; }
.required { color: var(--accent-red); }
.field input, .field select, .field textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 14px; background: var(--surface); color: var(--fg); box-sizing: border-box;
}
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--accent); }
.hint { font-size: 11px; color: var(--accent-red); margin-top: 4px; display: block; }
.submit-btn {
  width: 100%; padding: 12px; background: var(--accent); color: #fff; border: none;
  border-radius: var(--radius-md); font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px;
}
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result { margin-top: 12px; padding: 12px; border-radius: var(--radius-sm); font-size: 13px; text-align: center; line-height: 1.6; }
.result.success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
.result.error { background: #fce4ec; color: #c62828; border: 1px solid #ef9a9a; }
</style>
