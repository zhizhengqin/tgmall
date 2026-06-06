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

      <!-- 登录步骤指引 -->
      <div class="steps">
        <div class="step">
          <span class="step-num">1</span>
          <span>{{ $t('login.step1') }}</span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span>{{ $t('login.step2') }}</span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span>{{ $t('login.step3') }}</span>
        </div>
      </div>

      <!-- Token 输入 -->
      <el-input
        v-model="token"
        :placeholder="$t('login.tokenPlaceholder')"
        style="margin:12px 0"
        type="password"
        show-password
      />
      <el-button type="primary" @click="doLogin" :loading="loading" style="width:100%">
        {{ $t('login.loginBtn') }}
      </el-button>

      <!-- 底部提示 -->
      <div class="help-text">
        <p>{{ $t('login.help1') }}</p>
        <p>{{ $t('login.help2') }}</p>
      </div>
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
  if (!token.value.trim()) return;
  loading.value = true;
  try {
    const res = await api.get('/merchants/dashboard', {
      headers: { Authorization: `Bearer ${token.value.trim()}` },
    });
    if (res.success !== false) {
      store.setAuth(token.value.trim(), 'TG Mall Shop');
      localStorage.setItem('merchant_token', token.value.trim());
      router.push('/dashboard');
    }
  } catch {
    alert('Token មិនត្រឹមត្រូវ / Invalid / 无效');
  } finally { loading.value = false; }
}
</script>

<style scoped>
.login { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; padding: 20px; }
.card { width: 420px; max-width: 100%; }
.lang-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.lang-switcher { display: flex; gap: 4px; }
.lang-btn { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: #f5f5f5; border: 1px solid #ddd; color: #666; cursor: pointer; transition: all 0.2s; min-width: 32px; }
.lang-btn.active { background: #c4932a; color: #fff; border-color: #c4932a; }
.steps { margin: 16px 0; }
.step { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 13px; color: #555; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: #c4932a; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.help-text { margin-top: 16px; font-size: 11px; color: #999; text-align: center; line-height: 1.6; }
</style>
