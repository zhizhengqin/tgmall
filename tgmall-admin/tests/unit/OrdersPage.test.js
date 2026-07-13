import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import OrdersPage from '@/pages/OrdersPage.vue';

vi.mock('@/api', () => ({
  getOrders: vi.fn(() => Promise.resolve({
    data: [
      { id: 'ord-1', orderNumber: 'O001', totalUsd: 12.5, status: 'paid', customerName: 'Alice', createdAt: '2026-07-10T08:00:00Z' },
      { id: 'ord-2', orderNumber: 'O002', totalUsd: 34, status: 'shipped', customerName: 'Bob', createdAt: '2026-07-11T09:00:00Z' },
    ],
    meta: { total: 2 },
  })),
  exportOrdersCsv: vi.fn(),
}));

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

async function mountOrders(width = 1280) {
  setWidth(width);
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/orders/:id', component: { template: '<div />' } }],
  });
  await router.push('/orders');
  await router.isReady();

  return mount(OrdersPage, {
    global: {
      mocks: { $t: (key) => key },
      plugins: [router],
    },
    attachTo: document.body,
  });
}

describe('OrdersPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
    setWidth(1280);
  });

  it('renders table on desktop', async () => {
    wrapper = await mountOrders(1280);
    await flushPromises();

    expect(wrapper.find('[data-testid="orders-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="orders-cards"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="orders-table"] tbody tr').length).toBeGreaterThanOrEqual(2);
  });

  it('renders cards on mobile', async () => {
    wrapper = await mountOrders(375);
    await flushPromises();

    expect(wrapper.find('[data-testid="orders-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="orders-cards"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="order-card"]').length).toBe(2);
  });
});
