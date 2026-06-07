<template>
  <div class="page">
    <div class="card">
      <h2>🔑 Token</h2>
      <p class="desc">复制此 Token 登录商家后台 / 运营后台</p>

      <div v-if="token">
        <code class="token">{{ token }}</code>
        <button class="btn" @click="copy">{{ copied ? '✓ Copied' : '📋 Copy' }}</button>
      </div>

      <div v-else class="empty">
        <p>暂无 Token，请确保在 Telegram 内打开。</p>
        <button class="btn btn-retry" @click="doLogin" :disabled="loading">
          {{ loading ? 'Loading...' : '🔄 Retry Login' }}
        </button>
        <p class="hint">如果还不行：关闭 Mini App → 重新打开 → 再到此页面</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { telegramLogin } from '@/api/auth';

const userStore = useUserStore();
const loading = ref(false);
const copied = ref(false);

const token = ref(userStore.token || '');

async function copy() {
  if (!token.value) return;
  await navigator.clipboard.writeText(token.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

async function doLogin() {
  loading.value = true;
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) {
      alert('Not in Telegram. Please open inside Telegram Mini App.');
      return;
    }
    const res = await telegramLogin(tg.initData);
    const payload = res?.data || res;
    if (payload?.token) {
      token.value = payload.token;
      userStore.setAuth(payload.token, payload.user || {});
    } else {
      alert('Login failed. Close and reopen Mini App.');
    }
  } catch (e) {
    alert('Error: ' + (e?.response?.data?.error?.message || e.message));
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); display: flex; align-items: center; justify-content: center; padding: 20px; }
.card { background: var(--surface); border-radius: 16px; padding: 32px 24px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
h2 { margin: 0 0 8px; font-size: 22px; }
.desc { font-size: 13px; color: var(--muted); margin: 0 0 20px; }
.token { display: block; font-size: 12px; padding: 12px; background: #f5f5f5; border-radius: 8px; word-break: break-all; margin-bottom: 12px; text-align: left; line-height: 1.6; }
.btn { font-size: 14px; font-weight: 700; padding: 10px 24px; border-radius: 10px; background: var(--accent); color: #fff; border: none; cursor: pointer; }
.btn-retry { background: #409eff; }
.empty { padding: 16px 0; }
.empty p { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
.hint { font-size: 11px; color: #aaa; margin-top: 16px; }
</style>
