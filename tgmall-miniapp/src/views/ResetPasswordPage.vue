<!-- 忘记密码 / 重置密码 -->
<template>
  <div class="login-page">
    <div class="login-card">
      <h2 class="login-title">{{ $t('auth.resetPassword') }}</h2>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>

      <!-- 步骤 1: 输入手机号 -->
      <div class="input-group">
        <input
          v-model="phone"
          type="tel"
          :placeholder="$t('auth.phonePlaceholder')"
          class="input"
          maxlength="15"
          @input="onPhoneInput"
          :disabled="step > 1"
        />
      </div>

      <!-- 步骤 2: 获取验证码 -->
      <template v-if="step >= 2">
        <div class="input-group code-row">
          <input
            v-model="code"
            type="tel"
            :placeholder="$t('auth.verifyCode')"
            class="input code-input"
            maxlength="6"
          />
          <button class="send-btn" :disabled="cooldown > 0" @click="handleSendSms">
            {{ cooldown > 0 ? $t('auth.resendAfter', { s: cooldown }) : $t('auth.sendCode') }}
          </button>
        </div>
      </template>

      <!-- 步骤 3: 输入新密码 -->
      <template v-if="step >= 3">
        <div class="input-group">
          <input v-model="newPassword" type="password" :placeholder="$t('auth.newPassword')" class="input" />
        </div>
        <p class="hint">{{ $t('auth.passwordRule') }}</p>
        <div class="input-group">
          <input v-model="confirmPassword" type="password" :placeholder="$t('auth.passwordsNotMatch')" class="input" />
        </div>
      </template>

      <button class="submit-btn" :disabled="loading" @click="handleNext">
        {{ loading ? '...' : step === 1 ? $t('auth.sendCode') : step === 2 ? $t('common.confirm') : $t('auth.resetPassword') }}
      </button>

      <div class="extra-links">
        <router-link to="/login" class="link">{{ $t('auth.smsLogin') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { sendSms, resetPassword } from '@/api/auth';
import { isValidPhone, formatPhoneInput } from '@/utils/phone.js';

const router = useRouter();
const { t } = useI18n();
const step = ref(1);
const phone = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const cooldown = ref(0);
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function onPhoneInput() {
  phone.value = formatPhoneInput(phone.value);
}

let cooldownTimer = null;
async function handleSendSms() {
  errorMsg.value = '';
  if (!phone.value) {
    errorMsg.value = t('error.enterPhone');
    return;
  }
  if (!isValidPhone(phone.value)) {
    errorMsg.value = t('error.invalidPhone');
    return;
  }
  try {
    await sendSms(phone.value, 'reset_password');
    cooldown.value = 60;
    cooldownTimer = setInterval(() => { cooldown.value--; if (cooldown.value <= 0) { clearInterval(cooldownTimer); cooldownTimer = null; } }, 1000);
  } catch (err) {
    errorMsg.value = err.response?.data?.error?.message || t('error.sendFailed');
  }
}

async function handleNext() {
  errorMsg.value = '';
  if (step.value === 1) {
    if (!phone.value) { errorMsg.value = t('error.enterPhone'); return; }
    if (!isValidPhone(phone.value)) { errorMsg.value = t('error.invalidPhone'); return; }
    await handleSendSms();
    step.value = 2;
    return;
  }
  if (step.value === 2) {
    if (!code.value) { errorMsg.value = t('error.enterCode'); return; }
    step.value = 3;
    return;
  }
  if (step.value === 3) {
    if (!newPassword.value) { errorMsg.value = t('error.enterPassword'); return; }
    if (newPassword.value.length < 8 || newPassword.value.length > 20) { errorMsg.value = t('error.passwordRule'); return; }
    if (newPassword.value !== confirmPassword.value) { errorMsg.value = t('error.passwordsNotMatch'); return; }
    loading.value = true;
    try {
      await resetPassword({ phone: phone.value, code: code.value, new_password: newPassword.value });
      successMsg.value = t('auth.passwordResetSuccess');
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err) {
      errorMsg.value = err.response?.data?.error?.message || t('error.resetFailed');
    } finally {
      loading.value = false;
    }
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 24px; }
.login-card { width: 100%; max-width: 400px; background: var(--surface); border-radius: 16px; padding: 32px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.login-title { text-align: center; font-size: 24px; margin-bottom: 24px; color: var(--fg); }
.input-group { margin-bottom: 16px; }
.input { width: 100%; padding: 12px; border: 1px solid var(--border, #e0e0e0); border-radius: 8px; font-size: 16px; outline: none; box-sizing: border-box; }
.input:focus { border-color: var(--accent); }
.code-row { display: flex; gap: 12px; }
.code-input { flex: 1; }
.send-btn { padding: 0 16px; border: 1px solid var(--accent); background: transparent; color: var(--accent); border-radius: 8px; font-size: 13px; white-space: nowrap; cursor: pointer; }
.send-btn:disabled { opacity: 0.5; }
.hint { font-size: 12px; color: var(--muted); margin: -8px 0 8px; }
.submit-btn { width: 100%; padding: 14px; border: none; background: var(--accent); color: #fff; font-size: 16px; border-radius: 8px; cursor: pointer; }
.submit-btn:disabled { opacity: 0.6; }
.extra-links { text-align: center; margin-top: 16px; }
.link { color: var(--accent); font-size: 14px; text-decoration: none; }
.error-msg { background: #fef2f2; color: #c43a30; padding: 8px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
.success-msg { background: #f0fdf4; color: #16a34a; padding: 8px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
</style>
