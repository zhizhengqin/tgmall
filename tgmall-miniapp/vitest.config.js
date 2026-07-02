import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
      globals: false,
    },
  })
);
