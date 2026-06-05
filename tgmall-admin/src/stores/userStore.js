import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('adminUser', () => {
  const token = ref(localStorage.getItem('admin_token') || null);

  function setAuth(t) {
    token.value = t;
    localStorage.setItem('admin_token', t);
  }

  function clearAuth() {
    token.value = null;
    localStorage.removeItem('admin_token');
  }

  return { token, setAuth, clearAuth };
});
