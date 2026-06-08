<!-- 个人中心 -->
<template>
  <div class="page">
    <!-- 用户信息 -->
    <div class="profile-header">
      <div class="avatar">👤</div>
      <div class="user-info">
        <p class="user-name">{{ userStore.user?.firstName || $t('profile.guest') }}</p>
        <p class="user-phone">{{ userStore.user?.phone || $t('profile.noPhone') }}</p>
      </div>
    </div>

    <!-- 功能入口 -->
    <div class="menu-list">
      <router-link to="/orders" class="menu-item">
        <span>📋</span><span>{{ $t('nav.orders') }}</span><span class="arrow">›</span>
      </router-link>
      <div class="menu-item" @click="showAddresses = !showAddresses">
        <span>📍</span><span>{{ $t('profile.addresses') }} ({{ addressCount }})</span><span class="arrow">›</span>
      </div>

      <!-- 地址管理展开区 -->
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

        <!-- 新增地址表单 -->
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

    <!-- 语言切换 -->
    <div class="lang-section">
      <p class="section-label">{{ $t('profile.language') }}</p>
      <div class="lang-btns">
        <button v-for="l in langs" :key="l.code" class="lang-btn" :class="{ active: locale === l.code }" @click="switchLang(l.code)">
          {{ l.label }}
        </button>
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

const langs = [
  { code: 'km', label: 'ភាសាខ្មែរ' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

const addresses = ref([]);
const showAddresses = ref(false);
const showAddrForm = ref(false);
