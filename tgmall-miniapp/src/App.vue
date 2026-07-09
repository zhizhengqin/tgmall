<!-- 根组件 -->
<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <!-- 调试浮层：点击右下角 "DBG" 切换显示 -->
  <div v-if="showDebug" class="debug-panel">
    <h4>🔧 调试信息 (v20250610-4)</h4>
    <p><b>TG.SDK:</b> {{ debugInfo.hasTg }}</p>
    <p><b>initData:</b> {{ debugInfo.initDataLen }} chars</p>
    <p><b>initDataUnsafe.user:</b> {{ debugInfo.hasUser }}</p>
    <p><b>user.id:</b> {{ debugInfo.userId }}</p>
    <p><b>user.first_name:</b> {{ debugInfo.firstName }}</p>
    <p><b>user.photo_url:</b> {{ debugInfo.photoUrl }}</p>
    <p><b>轮询次数:</b> {{ debugInfo.attempts }}</p>
    <p><b>userStore.user:</b> {{ debugInfo.storeUser }}</p>
  </div>
  <div class="debug-trigger" @click="showDebug = !showDebug">DBG</div>
</template>

<script setup>
import { onMounted, ref, reactive } from 'vue';
import { useLanguageStore } from '@/stores/languageStore';
import { useUserStore } from '@/stores/userStore';
import { useShopConfig } from '@/composables/useShopConfig.js';
import { useTelegram } from '@/composables/useTelegram.js';
import { telegramLogin } from '@/api/auth';
import router from '@/router';

const languageStore = useLanguageStore();
const userStore = useUserStore();
const { loadExchangeRate } = useShopConfig();
const { init: initTelegram, showBackButton, hideBackButton } = useTelegram();
const showDebug = ref(false);
const debugInfo = reactive({
  hasTg: false,
  initDataLen: 0,
  hasUser: false,
  userId: '-',
  firstName: '-',
  photoUrl: '-',
  attempts: 0,
  storeUser: null,
});

onMounted(() => {
  // 预加载全局汇率
  loadExchangeRate();

  // Telegram SDK 初始化（可能已就绪，也可能尚未注入）
  initTelegram();

  // 根据路由 meta 控制原生返回按钮显隐
  const updateBackButton = (to) => {
    if (to.meta.showBackButton) {
      showBackButton();
    } else {
      hideBackButton();
    }
  };
  router.afterEach(updateBackButton);
  router.isReady().then(() => updateBackButton(router.currentRoute.value));

  // 轮询等待 Telegram WebApp SDK 就绪（最大 5 秒）
  let attempts = 0;
  const maxAttempts = 50; // 50 × 100ms = 5s

  const timer = setInterval(async () => {
    attempts++;
    debugInfo.attempts = attempts;
    const tg = window.Telegram?.WebApp;

    if (tg) {
      clearInterval(timer);

      tg.ready();
      tg.expand();
      initTelegram();

      debugInfo.hasTg = true;
      debugInfo.initDataLen = (tg.initData || '').length;

      // 从 SDK 读取用户信息（优先 initDataUnsafe，fallback 解析 initData）
      let u = tg.initDataUnsafe?.user;
      if (!u && tg.initData) {
        try {
          u = JSON.parse(new URLSearchParams(tg.initData).get('user') || 'null');
        } catch { /* ignore */ }
      }

      debugInfo.hasUser = !!u;
      debugInfo.userId = u?.id || '-';
      debugInfo.firstName = u?.first_name || '-';
      debugInfo.photoUrl = u?.photo_url ? '✅' : '❌';

      if (u) {
        userStore.user = {
          telegramId: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          username: u.username,
          languageCode: u.language_code || 'km',
          photoUrl: u.photo_url || null,
        };
      }

      debugInfo.storeUser = JSON.stringify(userStore.user);

      // 异步 API 认证获取 JWT + 持久化用户信息
      if (tg.initData) {
        try {
          const res = await telegramLogin(tg.initData);
          const data = res?.data || res;
          if (data?.token) {
            // 合并 SDK 原始数据（photoUrl）与后端持久化数据（avatarUrl 等）
            const mergedUser = { ...userStore.user, ...(data.user || {}) };
            userStore.setAuth(data.token, mergedUser);
          }
        } catch (e) {
          const errDetail = e?.response?.data?.error;
          const errMsg = errDetail
            ? `${errDetail.code}: ${errDetail.message}${errDetail.detail ? ' | ' + JSON.stringify(errDetail.detail) : ''}`
            : (e?.message || 'unknown');
          debugInfo.storeUser += ' | API_ERR:' + errMsg;
        }
      } else {
        debugInfo.storeUser += ' | SDK_NO_INITDATA: 请通过 Bot 的 Mini App 按钮打开';
      }

      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(timer);
      debugInfo.hasTg = false;
      debugInfo.storeUser = 'NOT_MINI_APP: 未检测到 Telegram SDK，请通过 Bot 菜单的 Mini App 按钮打开，不要在聊天中点击链接';
      // 超时：非 Telegram Mini App 环境或 SDK 注入异常
    }
  }, 100);
});
</script>

<style>
.fade-enter-active,.fade-leave-active{transition:opacity .15s ease}
.fade-enter-from,.fade-leave-to{opacity:0}
.debug-panel{position:fixed;top:10px;left:10px;right:10px;z-index:9999;background:rgba(0,0,0,.88);color:#0f0;font-family:monospace;font-size:12px;padding:12px;border-radius:8px;max-height:80vh;overflow:auto;word-break:break-all}
.debug-panel h4{margin:0 0 8px;color:#ff0;font-size:13px}
.debug-panel p{margin:4px 0}
.debug-trigger{position:fixed;bottom:80px;right:10px;z-index:9999;background:rgba(0,0,0,.6);color:#fff;font-size:10px;padding:4px 8px;border-radius:4px;cursor:pointer;opacity:.5}
.debug-trigger:active{opacity:1}
</style>
