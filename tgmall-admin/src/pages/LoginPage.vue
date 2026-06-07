<template>
  <div class="login">
    <div class="card">
      <div class="lang-row">
        <button v-for="l in langList" :key="l.code" class="lang-btn" :class="{ active: locale === l.code }" @click="switchLang(l.code)">{{ l.label }}</button>
      </div>
      <h2>{{ t('login.title') }}</h2>

      <div class="field">
        <label>{{ t('login.username') }}</label>
        <input class="input" v-model="username" :placeholder="t('login.usernamePlaceholder')" autocomplete="username" />
      </div>
      <div class="field">
        <label>{{ t('login.password') }}</label>
        <input class="input" v-model="password" type="password" :placeholder="t('login.passwordPlaceholder')" autocomplete="current-password" @keyup.enter="doLogin" />
      </div>

      <button class="login-btn" @click="doLogin" :disabled="loading">
        {{ loading ? t('common.loading') : t('login.loginBtn') }}
      </button>
      <div v-if="error" class="error">{{ error }}</div>
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
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
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
  error.value = '';
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }
  loading.value = true;
  try {
    const res = await api.post('/auth/admin-login', {
      username: username.value.trim(),
      password: password.value,
    });
    const data = res?.data || res;
    if (data?.token) {
      store.setAuth(data.token);
      localStorage.setItem('admin_token', data.token);
      router.push('/dashboard');
    }
  } catch (e) {
    error.value = e?.response?.data?.error?.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; padding: 20px; }
.card { width: 400px; max-width: 100%; background: #fff; border-radius: 12px; padding: 32px 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.lang-row { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.lang-btn { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: #f5f5f5; border: 1px solid #ddd; color: #666; cursor: pointer; margin-left: 4px; }
.lang-btn.active { background: #c4932a; color: #fff; border-color: #c4932a; }
h2 { text-align: center; font-size: 20px; font-weight: 700; color: #2d2b28; margin-bottom: 24px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; }
.input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.input:focus { outline: none; border-color: #c4932a; }
.login-btn { width: 100%; padding: 11px; background: #c4932a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 4px; }
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error { margin-top: 12px; padding: 10px; background: #fce4ec; color: #c62828; border-radius: 8px; font-size: 13px; text-align: center; }
</style>
