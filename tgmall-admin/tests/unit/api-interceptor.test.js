import { describe, it, expect, vi, beforeEach } from 'vitest';

let responseErrorHandler;
const messages = [];

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = vi.fn(() => Promise.resolve({ data: {} }));
      instance.interceptors = {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_onFulfilled, onRejected) => {
            responseErrorHandler = onRejected;
          }),
        },
      };
      instance.get = vi.fn();
      instance.post = vi.fn();
      instance.put = vi.fn();
      instance.delete = vi.fn();
      return instance;
    }),
  },
}));

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn((msg) => {
      messages.push(msg);
    }),
  },
}));

vi.mock('@/utils/i18n', () => ({
  t: vi.fn((key) =>
    key === 'common.serverError'
      ? 'SERVER_ERROR_LOCALIZED'
      : 'REQUEST_FAILED_LOCALIZED'
  ),
}));

async function loadApi() {
  vi.resetModules();
  messages.length = 0;
  responseErrorHandler = undefined;
  await import('@/api/index.js');
}

describe('API response interceptor', () => {
  beforeEach(async () => {
    await loadApi();
  });

  it('shows localized serverError for 5xx responses', async () => {
    const err = {
      config: { method: 'get' },
      response: { status: 500, data: { message: 'DB timeout' } },
    };

    await expect(responseErrorHandler(err)).rejects.toBe(err);
    expect(messages).toContain('SERVER_ERROR_LOCALIZED');
  });

  it('shows localized fallback for network errors without response', async () => {
    const err = {
      config: { method: 'post' },
    };

    await expect(responseErrorHandler(err)).rejects.toBe(err);
    expect(messages).toContain('REQUEST_FAILED_LOCALIZED');
  });
});
