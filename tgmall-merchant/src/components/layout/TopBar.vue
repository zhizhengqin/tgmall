<template>
  <div class="topbar">
    <span class="shop">{{ store.merchantName || 'TG Mall' }}</span>
    <div class="actions">
      <el-select v-model="lang" @change="switchLang" size="small" style="width:100px">
        <el-option label="ភាសាខ្មែរ" value="km" /><el-option label="English" value="en" /><el-option label="中文" value="zh" />
      </el-select>
      <el-button @click="logout" size="small" type="danger" plain>ចាកចេញ</el-button>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'; import { useUserStore } from '@/stores/userStore';
const store = useUserStore(); const lang = ref(localStorage.getItem('merchant_lang') || 'km');
const switchLang = (v) => { localStorage.setItem('merchant_lang', v); location.reload(); };
const logout = () => { localStorage.removeItem('merchant_token'); location.href = '/login'; };
</script>
<style scoped>
.topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #fff; border-bottom: 1px solid #e8e8e8; margin-left: 220px; }
.actions { display: flex; gap: 10px; align-items: center; }
.shop { font-weight: 600; }
</style>
