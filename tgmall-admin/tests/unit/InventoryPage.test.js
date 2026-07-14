import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import InventoryPage from '@/pages/InventoryPage.vue';

vi.mock('@/api', () => ({
  getInventory: vi.fn(() => Promise.resolve({
    data: [
      { id: 'p1', nameKm: 'Product A', nameEn: 'A', stock: 5, alertThreshold: 10, status: 'active', lowStock: true, images: [] },
      { id: 'p2', nameKm: 'Product B', nameEn: 'B', stock: 50, alertThreshold: 5, status: 'active', lowStock: false, images: [{ url: 'https://example.com/img.jpg', thumb_url: 'https://example.com/thumb.jpg' }] },
      { id: 'p3', nameKm: 'Product C', nameEn: 'C', stock: 8, alertThreshold: 5, status: 'active', lowStock: false, images: ['https://example.com/legacy.jpg'] },
    ],
    meta: { total: 3 },
  })),
  adjustStock: vi.fn(),
  getStockLogs: vi.fn(() => Promise.resolve({ data: [] })),
  checkInventory: vi.fn(),
  setAlertThreshold: vi.fn(),
  getProducts: vi.fn(() => Promise.resolve({ data: [] })),
}));

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

async function mountInventory(width = 1280) {
  setWidth(width);
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();

  return mount(InventoryPage, {
    global: {
      mocks: { $t: (key) => key },
      plugins: [router],
    },
    attachTo: document.body,
  });
}

describe('InventoryPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
    setWidth(1280);
  });

  it('renders table on desktop', async () => {
    wrapper = await mountInventory(1280);
    await flushPromises();

    expect(wrapper.find('[data-testid="inventory-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="inventory-cards"]').exists()).toBe(false);
  });

  it('renders cards on mobile', async () => {
    wrapper = await mountInventory(375);
    await flushPromises();

    expect(wrapper.find('[data-testid="inventory-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="inventory-cards"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="inventory-card"]').length).toBe(3);
  });

  it('renders product images from object or string', async () => {
    wrapper = await mountInventory(375);
    await flushPromises();

    const imgs = wrapper.findAll('.inventory-card-thumb');
    expect(imgs.length).toBe(2);
    expect(imgs[0].attributes('src')).toBe('https://example.com/thumb.jpg');
    expect(imgs[1].attributes('src')).toBe('https://example.com/legacy.jpg');
  });
});
