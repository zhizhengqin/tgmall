<template>
  <el-menu :default-active="route.path" router class="sidebar" background-color="#1a1a2e" text-color="#8b8b9e" active-text-color="#c4932a">
    <div class="logo"><h2>TG Mall</h2><span>{{ $t('app.name') }}</span></div>
    <el-menu-item index="/dashboard"><el-icon><DataAnalysis /></el-icon><span>{{ $t('nav.dashboard') }}</span></el-menu-item>
    <el-menu-item index="/products"><el-icon><Goods /></el-icon><span>{{ $t('nav.products') }}</span></el-menu-item>
    <el-menu-item index="/inventory"><el-icon><Box /></el-icon><span>{{ $t('inventory.title') }}</span></el-menu-item>
    <el-menu-item index="/orders"><el-icon><List /></el-icon><span>{{ $t('nav.orders') }}</span></el-menu-item>
    <el-menu-item index="/users"><el-icon><User /></el-icon><span>{{ $t('nav.users') }}</span></el-menu-item>
    <el-menu-item index="/coupons"><el-icon><Ticket /></el-icon><span>{{ $t('nav.coupons') }}</span></el-menu-item>
    <el-menu-item index="/feedback"><el-icon><ChatLineSquare /></el-icon><span>{{ $t('nav.feedback') }}</span></el-menu-item>
    <el-sub-menu index="/settings">
      <template #title>
        <el-icon><Setting /></el-icon>
        <span>{{ $t('nav.settings') }}</span>
      </template>
      <el-menu-item index="/settings/banners">{{ $t('settings.banners') }}</el-menu-item>
      <el-menu-item index="/settings/categories">{{ $t('settings.categories') }}</el-menu-item>
      <el-menu-item index="/settings/cities">{{ $t('settings.cities') }}</el-menu-item>
      <el-menu-item index="/settings/delivery-rules">{{ $t('settings.deliveryRules') }}</el-menu-item>
      <el-menu-item index="/settings/customer-services">{{ $t('settings.customerServices') }}</el-menu-item>
      <el-menu-item index="/settings/hot-searches">{{ $t('settings.hotKeywords') }}</el-menu-item>
      <el-menu-item index="/settings/flash-deals">⚡ 限时专区</el-menu-item>
      <el-menu-item index="/settings/platform">⚙️ 平台设置</el-menu-item>
      <el-menu-item index="/settings/admin-users">👤 管理员账号</el-menu-item>
      <el-menu-item index="/settings/tags">🏷️ 商品标签</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>
<script setup>import { useRoute } from 'vue-router'; import { DataAnalysis, User, Goods, List, Setting, Box, Ticket, ChatLineSquare } from '@element-plus/icons-vue'; const route = useRoute();</script>
<style scoped>
.sidebar { width: 220px; min-height: 100vh; position: fixed; left: 0; top: 0; border-right: none; }
.logo { padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,.1); }
.logo h2 { color: #c4932a; font-size: 18px; margin: 0; }
.logo span { color: #8b8b9e; font-size: 12px; }
</style>

