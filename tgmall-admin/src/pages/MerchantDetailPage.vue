<template><div class="page"><TopBar/><Sidebar/><div class="main"><el-page-header @back="$router.back()"><template #content>{{ $t('merchants.detail') }}</template></el-page-header><p style="margin-top:20px">{{ $t('merchants.detailPage') || 'ទំព័រលម្អិតហាង' }}</p></div></div></template>
<script setup>import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}</style>
