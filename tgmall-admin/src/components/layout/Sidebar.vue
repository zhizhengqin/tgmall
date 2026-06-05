<template>
  <el-menu :default-active="route.path" router class="sidebar" background-color="#1a1a2e" text-color="#8b8b9e" active-text-color="#c4932a">
    <div class="logo"><h2>TG Mall</h2><span>គ្រប់គ្រងប្រព័ន្ធ</span></div>
    <el-menu-item index="/dashboard"><el-icon><DataAnalysis /></el-icon><span>របាយការណ៍</span></el-menu-item>
    <el-menu-item index="/merchants"><el-icon><Shop /></el-icon><span>ហាង</span></el-menu-item>
    <el-menu-item index="/users"><el-icon><User /></el-icon><span>អ្នកប្រើ</span></el-menu-item>
  </el-menu>
</template>
<script setup>import { useRoute } from 'vue-router'; import { DataAnalysis, Shop, User } from '@element-plus/icons-vue'; const route = useRoute();</script>
<style scoped>
.sidebar { width: 220px; min-height: 100vh; position: fixed; left: 0; top: 0; border-right: none; }
.logo { padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,.1); }
.logo h2 { color: #c4932a; font-size: 18px; margin: 0; }
.logo span { color: #8b8b9e; font-size: 12px; }
</style>
