<!-- 个人中心 -->
<template>
  <div class="page">
    <div class="profile-header">
      <div class="avatar">👤</div>
      <div class="user-info">
        <p class="user-name">{{ userStore.user?.firstName || $t('profile.guest') }}</p>
        <p class="user-phone">{{ userStore.user?.phone || $t('profile.noPhone') }}</p>
        <p v-if="!userStore.user?.firstName" class="debug-hint" @click="showDebug = !showDebug">
          {{ hasTelegram ? '✅ TG' : '❌ 非TG' }} | initData: {{ initDataLen }}
        </p>
      </div>
    </div>
    <div v-if="showDebug" class="debug-box">
      <p>hasTelegram: {{ hasTelegram }}</p>
      <p>initData 长度: {{ initDataLen }}</p>
      <p>user 存在: {{ !!tgUser }}</p>
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
import BottomNav from '@/components/common/BottomNav.vue';

const { locale, t } = useI18n();
const languageStore = useLanguageStore();
const userStore = useUserStore();

// Debug
const showDebug = ref(false);
const tgCheck = window.__tgCheck || {};
const hasTelegram = computed(() => tgCheck.hasTelegram || !!window.Telegram?.WebApp);
const initDataLen = computed(() => tgCheck.initDataLen || window.Telegram?.WebApp?.initData?.length || 0);
const tgUser = computed(() => window.Telegram?.WebApp?.initDataUnsafe?.user);

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

onMounted(loadAddresses);
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); padding-bottom: 100px; min-height: 100vh; background: var(--bg); }
.profile-header { display: flex; align-items: center; gap: 16px; padding: 24px 0; }
.avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.user-name { font-size: 18px; font-weight: 700; }
.user-phone { font-size: 13px; color: var(--muted); margin-top: 4px; }
.debug-hint { font-size: 10px; color: #aaa; margin-top: 2px; cursor: pointer; }
.debug-box { padding: 8px; background: #f0f0f0; border-radius: 6px; font-size: 11px; margin-bottom: 12px; }
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
</style>
