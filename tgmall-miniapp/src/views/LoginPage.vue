<!-- 手机号登录页 — SMS 验证码 / 密码双 Tab -->
<template>
  <div class="login-page">
    <div class="login-card">
      <h2 class="login-title">{{ $t('app.name') }}</h2>

      <!-- Tab 切换 -->
      <div class="tab-bar">
        <button
          :class="{ active: tab === 'sms' }"
          @click="tab = 'sms'"
          class="tab-btn"
        >{{ $t('auth.smsLogin') }}</button>
        <button
          :class="{ active: tab === 'password' }"
          @click="tab = 'password'"
          class="tab-btn"
        >{{ $t('auth.passwordLogin') }}</button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <!-- 手机号输入 -->
      <div class="input-group">
        <input
          v-model="phone"
          type="tel"
          :placeholder="$t('auth.phonePlaceholder')"
          class="input"
          maxlength="15"
          @input="onPhoneInput"
        />
      </div>

      <!-- SMS 模式 -->
      <template v-if="tab === 'sms'">
        <div class="input-group code-row">
          <input
            v-model="code"
            type="tel"
            :placeholder="$t('auth.verifyCode')"
            class="input code-input"
            maxlength="6"
          />
          <button
            class="send-btn"
            :disabled="cooldown > 0"
            @click="handleSendSms"
          >
            {{ cooldown > 0 ? $t('auth.resendAfter', { s: cooldown }) : $t('auth.sendCode') }}
          </button>
        </div>
        <button class="submit-btn" :disabled="loading" @click="handleLogin('sms')">
          {{ loading ? '...' : $t('auth.smsLogin') }}
        </button>
      </template>

      <!-- 密码模式 -->
      <template v-else>
        <div class="input-group">
          <input
            v-model="password"
            type="password"
            :placeholder="$t('auth.password')"
            class="input"
          />
        </div>
        <button class="submit-btn" :disabled="loading" @click="handleLogin('password')">
          {{ loading ? '...' : $t('auth.passwordLogin') }}
        </button>
        <div class="extra-links">
          <router-link to="/reset-password" class="link">{{ $t('auth.forgotPassword') }}</router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { sendSms, loginByPhone } from '@/api/auth';

const router = useRouter();
const userStore = useUserStore();

const tab = ref('sms');
const phone = ref('');
const code = ref('');
const password = ref('');
const cooldown = ref(0);
const loading = ref(false);
const errorMsg = ref('');

function onPhoneInput() {
  // 自动格式化 +855 前缀
  if (phone.value && !phone.value.startsWith('+')) {
    phone.value = '+' + phone.value.replace(/[^0-9]/g, '');
  }
  phone.value = phone.value.replace(/[^0-9+]/g, '');
}

let cooldownTimer = null;
async function handleSendSms() {
  errorMsg.value = '';
  if (!phone.value || phone.value.length < 10) {
    errorMsg.value = '请输入正确的手机号';
    return;
  }
  try {
    await sendSms(phone.value, 'login');
    cooldown.value = 60;
    cooldownTimer = setInterval(() => {
      cooldown.value--;
      if (cooldown.value <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
    }, 1000);
  } catch (err) {
    errorMsg.value = err.response?.data?.error?.message || '发送失败';
  }
}

async function handleLogin(mode) {
  errorMsg.value = '';
  if (!phone.value) { errorMsg.value = '请输入手机号'; return; }
  loading.value = true;
  try {
    const payload = { phone: phone.value };
    if (mode === 'sms') {
      if (!code.value) { errorMsg.value = '请输入验证码'; loading.value = false; return; }
      payload.code = code.value;
    } else {
      if (!password.value) { errorMsg.value = '请输入密码'; loading.value = false; return; }
      payload.password = password.value;
    }
    const res = await loginByPhone(payload);
    if (res.success) {
      userStore.setAuth(res.data.token, res.data.user);
      router.replace('/');
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error?.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg); padding: 24px;
}
.login-card {
  width: 100%; max-width: 400px; background: var(--surface); border-radius: 16px;
  padding: 32px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.login-title { text-align: center; font-size: 24px; margin-bottom: 24px; color: var(--fg); }
.tab-bar { display: flex; gap: 0; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border, #e0e0e0); }
.tab-btn { flex: 1; padding: 10px; border: none; background: var(--surface); font-size: 14px; cursor: pointer; color: var(--muted); }
.tab-btn.active { background: var(--accent); color: #fff; }
.input-group { margin-bottom: 16px; }
.input { width: 100%; padding: 12px; border: 1px solid var(--border, #e0e0e0); border-radius: 8px; font-size: 16px; outline: none; box-sizing: border-box; }
.input:focus { border-color: var(--accent); }
.code-row { display: flex; gap: 12px; }
.code-input { flex: 1; }
.send-btn { padding: 0 16px; border: 1px solid var(--accent); background: transparent; color: var(--accent); border-radius: 8px; font-size: 13px; white-space: nowrap; cursor: pointer; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn { width: 100%; padding: 14px; border: none; background: var(--accent); color: #fff; font-size: 16px; border-radius: 8px; cursor: pointer; }
.submit-btn:disabled { opacity: 0.6; }
.extra-links { text-align: center; margin-top: 16px; }
.link { color: var(--accent); font-size: 14px; text-decoration: none; }
.error-msg { background: #fef2f2; color: #c43a30; padding: 8px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
</style>
