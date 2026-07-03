import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('adminUser', () => {
  const token = ref(sessionStorage.getItem('admin_token') || null);

  function setAuth(t) {
    token.value = t;
    sessionStorage.setItem('admin_token', t);
  }

  function clearAuth() {
    token.value = null;
    sessionStorage.removeItem('admin_token');
  }

  return { token, setAuth, clearAuth };
});
