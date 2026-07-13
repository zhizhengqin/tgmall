import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import FeedbackPage from '@/pages/FeedbackPage.vue';

vi.mock('@/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({
      data: {
        items: [
          { id: 'f1', content: 'Issue A', status: 'pending', createdAt: '2026-07-10T08:00:00Z', user: { firstName: 'A', phone: '123' }, images: ['img1.jpg'] },
          { id: 'f2', content: 'Issue B', status: 'resolved', createdAt: '2026-07-11T09:00:00Z', user: { firstName: 'B', phone: '456' }, images: [] },
        ],
        total: 2,
      },
    })),
    patch: vi.fn(() => Promise.resolve()),
  },
}));

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

async function mountFeedback(width = 1280) {
  setWidth(width);
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();

  return mount(FeedbackPage, {
    global: {
      mocks: { $t: (key) => key },
      plugins: [router],
    },
    attachTo: document.body,
  });
}

describe('FeedbackPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
    setWidth(1280);
  });

  it('renders table on desktop', async () => {
    wrapper = await mountFeedback(1280);
    await flushPromises();

    expect(wrapper.find('[data-testid="feedback-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="feedback-cards"]').exists()).toBe(false);
  });

  it('renders cards on mobile', async () => {
    wrapper = await mountFeedback(375);
    await flushPromises();

    expect(wrapper.find('[data-testid="feedback-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="feedback-cards"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="feedback-card"]').length).toBe(2);
  });
});
