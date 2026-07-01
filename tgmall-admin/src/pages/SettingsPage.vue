<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <h1>{{ $t('settings.title') }}</h1>
      <div class="settings-grid">
        <el-card class="settings-card" @click="$router.push('/settings/banners')">
          <div class="card-icon">🖼️</div>
          <div class="card-title">Banner 管理</div>
          <div class="card-desc">首页轮播图配置</div>
        </el-card>
        <el-card class="settings-card" @click="$router.push('/settings/categories')">
          <div class="card-icon">🏷️</div>
          <div class="card-title">品类管理</div>
          <div class="card-desc">商品分类与图标</div>
        </el-card>
        <el-card class="settings-card" @click="$router.push('/settings/cities')">
          <div class="card-icon">🚚</div>
          <div class="card-title">城市配送</div>
          <div class="card-desc">城市、运费、起送金额</div>
        </el-card>
        <el-card class="settings-card" @click="$router.push('/settings/customer-services')">
          <div class="card-icon">💬</div>
          <div class="card-title">客服账号</div>
          <div class="card-desc">Telegram 客服配置</div>
        </el-card>
      </div>
    </div>
  </div>
</template>
<script setup>import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}.settings-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-top:20px}.settings-card{cursor:pointer;transition:transform .2s}.settings-card:hover{transform:translateY(-4px)}.card-icon{font-size:32px;margin-bottom:12px}.card-title{font-size:16px;font-weight:600}.card-desc{font-size:13px;color:#999;margin-top:4px}</style>