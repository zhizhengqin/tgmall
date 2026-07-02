<!-- 个人中心 -->
<template>
  <div class="page">
    <div class="profile-header">
      <div class="avatar">
        <img
          v-if="(userStore.user?.photoUrl || userStore.user?.avatarUrl) && !avatarError"
          :src="userStore.user?.photoUrl || userStore.user?.avatarUrl"
          alt="avatar"
          class="avatar-img"
          @error="avatarError = true"
        />
        <span v-else class="avatar-fallback">{{ avatarInitials }}</span>
      </div>
      <div class="user-info">
        <p class="user-name">{{ displayName }}</p>
        <p class="user-phone">{{ userStore.user?.phone || $t('profile.noPhone') }}</p>
      </div>
    </div>

    <div class="menu-list">
      <router-link to="/orders" class="menu-item">
        <span>📋</span><span>{{ $t('nav.orders') }}</span><span class="arrow">›</span>
      </router-link>
      <div class="menu-item" @click="showAddresses = !showAddresses">
        <span>📍</span><span>{{ $t('profile.addresses') }} ({{ addressCount }})</span><span class="arrow">›</span>
      </div>

      <div v-if="showAddresses" class="address-list">
        <div v-for="a in addresses" :key="a.id" class="addr-card">
          <div class="addr-info">
            <p><strong>{{ a.recipient_name }}</strong> {{ a.phone }}</p>
            <p class="addr-text">{{ a.province }} {{ a.district }} {{ a.detail }}</p>
            <span v-if="a.is_default" class="default-tag">{{ $t('profile.defaultTag') }}</span>
          </div>
          <button class="del-btn" @click="handleDeleteAddr(a.id)">{{ $t('common.delete') }}</button>
        </div>
        <button class="add-addr-btn" @click="showAddrForm = true">+ {{ $t('profile.addAddress') }}</button>

        <div v-if="showAddrForm" class="addr-form">
          <input v-model="addrForm.recipient_name" :placeholder="$t('profile.form.name')" />
          <input v-model="addrForm.phone" :placeholder="$t('profile.form.phone')" />
          <input v-model="addrForm.province" :placeholder="$t('profile.form.province')" />
          <input v-model="addrForm.district" :placeholder="$t('profile.form.district')" />
          <input v-model="addrForm.detail" :placeholder="$t('profile.form.detail')" />
          <label class="default-check"><input type="checkbox" v-model="addrForm.is_default" /> {{ $t('profile.form.setDefault') }}</label>
          <div class="form-actions">
            <button @click="showAddrForm = false">{{ $t('common.cancel') }}</button>
            <button class="btn-save" @click="handleSaveAddr">{{ $t('common.save') }}</button>
          </div>
        </div>
      </div>

      <router-link to="/coupons" class="menu-item">
        <span>🎫</span><span>{{ $t('profile.coupons') }}</span><span class="arrow">›</span>
      </router-link>
      <router-link to="/wishlist" class="menu-item">
        <span>❤️</span><span>{{ $t('wishlist.title') }}</span><span class="arrow">›</span>
      </router-link>
      <router-link to="/feedback" class="menu-item">
        <span>📝</span><span>{{ $t('feedback.title') }}</span><span class="arrow">›</span>
      </router-link>
      <!-- 手机号绑定（未绑定手机号时显示） -->
      <div v-if="!userStore.user?.phone" class="menu-item" @click="showBindPhone = !showBindPhone">
        <span>📱</span><span>{{ $t('auth.bindPhone') }}</span><span class="arrow">›</span>
      </div>
      <div v-if="showBindPhone" class="bind-phone-section">
        <p class="bind-hint">{{ $t('auth.bindPhoneHint') }}</p>
        <div class="bind-row">
          <input v-model="bindForm.phone" type="tel" :placeholder="$t('auth.phonePlaceholder')" class="input" maxlength="15" />
        </div>
        <div class="bind-row">
          <input v-model="bindForm.code" type="tel" :placeholder="$t('auth.verifyCode')" class="input code-input" maxlength="6" />
          <button class="send-btn" :disabled="bindCooldown > 0" @click="handleBindSendSms">{{ bindCooldown > 0 ? $t('auth.resendAfter', { s: bindCooldown }) : $t('auth.sendCode') }}</button>
        </div>
        <div v-if="bindError" class="error-msg">{{ bindError }}</div>
        <button class="btn-save" :disabled="bindLoading" @click="handleBindPhone">{{ bindLoading ? '...' : $t('common.confirm') }}</button>
      </div>
      <div class="menu-item" @click="contactCustomerService">
        <span>💬</span><span>{{ $t('profile.customerService') }}</span><span class="arrow">›</span>
      </div>
    </div>

    <div class="lang-section">
      <p class="section-label">{{ $t('profile.language') }}</p>
      <div class="lang-btns">
        <button v-for="l in langs" :key="l.code" class="lang-btn" :class="{ active: locale === l.code }" @click="switchLang(l.code)">{{ l.label }}</button>
      </div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLanguageStore } from '@/stores/languageStore';
import { useUserStore } from '@/stores/userStore';
import { getAddresses, createAddress, deleteAddress } from '@/api/addresses';
import { sendSms, bindPhone as bindPhoneApi } from '@/api/auth';
import { useShopConfig } from '@/composables/useShopConfig.js';
import BottomNav from '@/components/common/BottomNav.vue';

const { locale, t } = useI18n();
const languageStore = useLanguageStore();
const userStore = useUserStore();
const { customerService, loadCustomerService } = useShopConfig();

const displayName = computed(() => {
  const u = userStore.user;
  if (!u) return t('profile.guest');
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || t('profile.guest');
});

const langs = [
  { code: 'km', label: 'ភាសាខ្មែរ' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

const addresses = ref([]);
const showAddresses = ref(false);
const showAddrForm = ref(false);
const addrForm = reactive({ recipient_name: '', phone: '+855', province: '', district: '', detail: '', is_default: false });
const addressCount = computed(() => addresses.value.length);
const avatarError = ref(false);

const avatarInitials = computed(() => {
  const u = userStore.user;
  if (!u) return '👤';
  const first = (u.firstName || '').charAt(0).toUpperCase();
  const last = (u.lastName || '').charAt(0).toUpperCase();
  return (first + last) || (u.username || '').charAt(0).toUpperCase() || '👤';
});

function switchLang(code) { locale.value = code; languageStore.setLanguage(code); }

async function loadAddresses() {
  try { const res = await getAddresses(); addresses.value = res.data; } catch { addresses.value = []; }
}

async function handleSaveAddr() {
  try {
    await createAddress({ ...addrForm });
    Object.assign(addrForm, { recipient_name: '', phone: '+855', province: '', district: '', detail: '', is_default: false });
    showAddrForm.value = false;
    await loadAddresses();
  } catch (e) { alert(e?.response?.data?.error?.message || t('profile.saveFailed')); }
}

async function handleDeleteAddr(id) {
  if (!confirm(t('profile.confirmDelete'))) return;
  try { await deleteAddress(id); await loadAddresses(); } catch (e) { alert(t('profile.deleteFailed')); }
}

// ---- 手机号绑定 ----
const showBindPhone = ref(false);
const bindForm = reactive({ phone: '+855', code: '' });
const bindCooldown = ref(0);
const bindLoading = ref(false);
const bindError = ref('');
let bindTimer = null;

async function handleBindSendSms() {
  bindError.value = '';
  try {
    await sendSms(bindForm.phone, 'bind_phone');
    bindCooldown.value = 60;
    bindTimer = setInterval(() => { bindCooldown.value--; if (bindCooldown.value <= 0) { clearInterval(bindTimer); bindTimer = null; } }, 1000);
  } catch (err) { bindError.value = err.response?.data?.error?.message || t('error.sendFailed'); }
}

async function handleBindPhone() {
  bindError.value = '';
  if (!bindForm.code) { bindError.value = t('error.enterCode'); return; }
  bindLoading.value = true;
  try {
    const res = await bindPhoneApi(bindForm.phone, bindForm.code);
    if (res.success) {
      userStore.user.phone = res.data.phone;
      showBindPhone.value = false;
    }
  } catch (err) { bindError.value = err.response?.data?.error?.message || t('error.bindFailed'); }
  finally { bindLoading.value = false; }
}

function contactCustomerService() {
  const cs = customerService.value;
  if (!cs) return;

  if (cs.telegramUsername) {
    const link = `https://t.me/${cs.telegramUsername}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(link);
    } else {
      window.open(link, '_blank');
    }
    return;
  }

  if (cs.phone) {
    window.location.href = `tel:${cs.phone}`;
  }
}

onMounted(() => {
  loadAddresses();
  loadCustomerService().catch(() => {});
});
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); padding-bottom: 100px; min-height: 100vh; background: var(--bg); }
.profile-header { display: flex; align-items: center; gap: 16px; padding: 24px 0; }
.avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 28px; overflow: hidden; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-fallback { font-size: 20px; font-weight: 600; color: var(--fg); }
.user-name { font-size: 18px; font-weight: 700; }
.user-phone { font-size: 13px; color: var(--muted); margin-top: 4px; }
.menu-list { margin-bottom: 24px; }
.menu-item { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--border); font-size: 14px; text-decoration: none; color: inherit; cursor: pointer; }
.menu-item .arrow { margin-left: auto; color: var(--muted); }
.address-list { padding-left: 32px; margin: 8px 0 16px; }
.addr-card { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.addr-text { color: var(--muted); font-size: 12px; margin-top: 2px; }
.default-tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--accent); color: #fff; margin-top: 4px; }
.del-btn { color: var(--accent-red); font-size: 12px; }
.add-addr-btn { color: var(--accent); font-size: 13px; margin-top: 8px; padding: 8px 0; display: block; }
.addr-form { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.addr-form input { padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 13px; }
.default-check { font-size: 13px; display: flex; align-items: center; gap: 6px; }
.form-actions { display: flex; gap: 8px; }
.form-actions button { flex: 1; padding: 10px; border-radius: var(--radius-sm); font-size: 13px; }
.btn-save { background: var(--accent); color: #fff; }
.lang-section { margin-bottom: 24px; }
.section-label { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
.lang-btns { display: flex; gap: 8px; }
.lang-btn { padding: 8px 18px; border-radius: 999px; border: 1px solid var(--border); font-size: 13px; background: var(--surface); }
.lang-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.bind-phone-section { padding: 12px 32px; margin-bottom: 8px; }
.bind-hint { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.bind-row { display: flex; gap: 8px; margin-bottom: 8px; }
.bind-row .input { flex: 1; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 13px; }
.send-btn { padding: 8px 12px; border: 1px solid var(--accent); background: transparent; color: var(--accent); border-radius: 8px; font-size: 12px; white-space: nowrap; cursor: pointer; }
.send-btn:disabled { opacity: 0.5; }
.error-msg { color: var(--accent-red); font-size: 12px; margin-bottom: 8px; }
</style>
