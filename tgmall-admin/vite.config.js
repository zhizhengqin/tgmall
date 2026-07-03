import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  base: '/admin/',
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          ui: ['element-plus', '@element-plus/icons-vue'],
          charts: ['echarts', 'vue-echarts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
