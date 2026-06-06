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

      <!-- Telegram Login Widget -->
      <div id="telegram-login-wrapper" style="display:flex;justify-content:center;margin:16px 0" v-show="!loading"></div>

      <div v-if="loading" style="text-align:center;padding:20px;color:#999">
        <el-icon class="is-loading"><Loading /></el-icon> {{ $t('common.loading') }}
      </div>

      <!-- 手动输入 Token 备用 -->
      <el-divider style="margin:12px 0"><span style="font-size:11px;color:#bbb">{{ $t('login.orToken') || 'ឬបិទភ្ជាប់ Token' }}</span></el-divider>
      <el-input v-model="token" :placeholder="$t('login.tokenPlaceholder')" size="small" type="password" />
      <el-button @click="doLogin" :loading="loading" style="width:100%;margin-top:8px">{{ $t('common.confirm') }}</el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import { useI18n } from 'vue-i18n'; import api from '@/api';
const router = useRouter(); const token = ref(''); const loading = ref(false);
const { locale } = useI18n();

const langList = [
  { code: 'zh', label: '中' },
  { code: 'km', label: 'ខ' },
  { code: 'en', label: 'EN' },
];

function switchLang(code) { locale.value = code; localStorage.setItem('admin_lang', code); }

onMounted(() => {
  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.async = true;
  script.setAttribute('data-telegram-login', 'xhzmall_bot');
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-radius', '8');
  script.setAttribute('data-request-access', 'write');

  window.onTelegramAuth = async (user) => {
    loading.value = true;
    try {
      const res = await api.post('/auth/web-login', {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        auth_date: user.auth_date,
        hash: user.hash,
      });
      if (res.data?.token) {
        localStorage.setItem('admin_token', res.data.token);
        router.push('/dashboard');
      }
    } catch (e) {
      alert(e?.response?.data?.error?.message || 'សិទ្ធិមិនត្រឹមត្រូវ / Access denied');
    } finally { loading.value = false; }
  };

  script.setAttribute('data-onauth', 'onTelegramAuth(user)');
  document.getElementById('telegram-login-wrapper').appendChild(script);
});

async function doLogin() {
  if (!token.value) return; loading.value = true;
  try {
    await api.get('/admin/dashboard', { headers: { Authorization: `Bearer ${token.value}` } });
    localStorage.setItem('admin_token', token.value);
    router.push('/dashboard');
  } catch { alert('Token មិនត្រឹមត្រូវ / Invalid'); } finally { loading.value = false; }
}
</script>

<style scoped>
.login { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; padding: 20px; }
.card { width: 400px; max-width: 100%; }
.lang-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.lang-switcher { display: flex; gap: 4px; }
.lang-btn { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: #f5f5f5; border: 1px solid #ddd; color: #666; cursor: pointer; transition: all 0.2s; min-width: 32px; }
.lang-btn.active { background: #c4932a; color: #fff; border-color: #c4932a; }
</style>
