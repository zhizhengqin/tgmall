<template>
  <div class="login">
    <div class="card">
      <div class="lang-row">
        <button v-for="l in langList" :key="l.code" class="lang-btn" :class="{ active: locale === l.code }" @click="switchLang(l.code)">{{ l.label }}</button>
      </div>
      <h2>{{ t('login.title') }}</h2>

      <div class="steps">
        <div class="step"><span class="step-num">1</span><span>{{ t('login.step1') }}</span></div>
        <div class="step"><span class="step-num">2</span><span>{{ t('login.step2') }}</span></div>
        <div class="step"><span class="step-num">3</span><span>{{ t('login.step3') }}</span></div>
      </div>

      <input class="token-input" v-model="token" :placeholder="t('login.tokenPlaceholder')" type="password" />
      <button class="login-btn" @click="doLogin" :disabled="loading">
        {{ loading ? t('common.loading') : t('login.loginBtn') }}
      </button>

      <div class="help-text">
        <p>{{ t('login.help1') }}</p>
        <p>{{ t('login.help2') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import api from '@/api';
import km from '@/locales/km.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

const router = useRouter();
const store = useUserStore();
const token = ref('');
const loading = ref(false);
const locale = ref(localStorage.getItem('admin_lang') || 'km');

const messages = { km, en, zh };
const langList = [
  { code: 'zh', label: '中' },
  { code: 'km', label: 'ខ' },
  { code: 'en', label: 'EN' },
];

function t(key) {
  const keys = key.split('.');
  let val = messages[locale.value] || messages.en;
  for (const k of keys) val = val?.[k];
  return typeof val === 'string' ? val : key;
}

function switchLang(code) {
  locale.value = code;
  localStorage.setItem('admin_lang', code);
}

async function doLogin() {
  if (!token.value.trim()) return;
  loading.value = true;
  try {
    const res = await api.get('/admin/dashboard', {
      headers: { Authorization: `Bearer ${token.value.trim()}` },
    });
    if (res.success !== false) {
      store.setAuth(token.value.trim());
      localStorage.setItem('admin_token', token.value.trim());
      router.push('/dashboard');
    }
  } catch {
    alert('សិទ្ធិមិនត្រឹមត្រូវ / Access denied / 权限不足');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; padding: 20px; }
.card { width: 420px; max-width: 100%; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.lang-row { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.lang-btn { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: #f5f5f5; border: 1px solid #ddd; color: #666; cursor: pointer; margin-left: 4px; }
.lang-btn.active { background: #c4932a; color: #fff; border-color: #c4932a; }
h2 { text-align: center; font-size: 18px; font-weight: 700; color: #2d2b28; margin-bottom: 20px; }
.steps { margin-bottom: 16px; }
.step { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 13px; color: #555; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: #c4932a; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.token-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; margin-bottom: 12px; box-sizing: border-box; }
.token-input:focus { outline: none; border-color: #c4932a; }
.login-btn { width: 100%; padding: 10px; background: #c4932a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.help-text { margin-top: 16px; font-size: 11px; color: #999; text-align: center; line-height: 1.8; }
</style>
