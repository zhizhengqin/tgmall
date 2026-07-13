import { config } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import { vi } from 'vitest';

config.global.plugins = [ElementPlus];
config.global.mocks = {
  $t: (key) => key,
};

const storageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  writable: true,
});
Object.defineProperty(window, 'sessionStorage', {
  value: { ...storageMock },
  writable: true,
});
