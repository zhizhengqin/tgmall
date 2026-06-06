<template>
  <div class="login">
    <el-card class="card">
      <!-- 语言切换 -->
      <div class="lang-row">
        <div class="lang-switcher">
          <button v-for="l in langList" :key="l.code" class="lang-btn" :class="{ active: locale === l.code }" @click="switchLang(l.code)">{{ l.label }}</button>
        </div>
      </div>
      <h2>{{ $t('login.title') }}</h2>
      <el-input v-model="token" :placeholder="$t('login.tokenPlaceholder')" style="margin:16px 0" />
      <el-button type="primary" @click="doLogin" :loading="loading" style="width:100%">{{ $t('common.confirm') }}</el-button>
      <p style="font-size:12px;color:#999;margin-top:10px">{{ $t('login.tokenHint') }}</p>
    </el-card>
  </div>
</template>
<script setup>
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { useI18n } from 'vue-i18n'; import { useUserStore } from '@/stores/userStore'; import api from '@/api';
const router = useRouter(); const store = useUserStore(); const token = ref(''); const loading = ref(false);
const { locale } = useI18n();
const langList = [
  { code: 'zh', label: '中' },
  { code: 'km', label: 'ខ' },
  { code: 'en', label: 'EN' },
];
function switchLang(code) { locale.value = code; localStorage.setItem('merchant_lang', code); }
async function doLogin() {
  if (!token.value) return; loading.value = true;
  try {
    await api.get('/merchants/dashboard', { headers: { Authorization: `Bearer ${token.value}` } });
    store.setAuth(token.value, 'TG Mall Shop'); router.push('/dashboard');
  } catch { alert('ចូលបរាជ័យ / Login failed / 登录失败'); } finally { loading.value = false; }
}
</script>
<style scoped>
.login { display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; }
.card { width: 400px; }
.lang-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.lang-switcher { display: flex; gap: 4px; }
.lang-btn { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: #f5f5f5; border: 1px solid #ddd; color: #666; cursor: pointer; transition: all 0.2s; min-width: 32px; }
.lang-btn.active { background: #c4932a; color: #fff; border-color: #c4932a; }
</style>
