import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import InventoryPage from '@/pages/InventoryPage.vue';

vi.mock('@/api', () => ({
  getInventory: vi.fn(() => Promise.resolve({
    data: [
      { id: 'p1', nameKm: 'Product A', nameEn: 'A En', nameZh: 'A 中文', stock: 5, alertThreshold: 10, status: 'active', lowStock: true, images: [] },
      { id: 'p2', nameKm: 'Product B', nameEn: 'B En', nameZh: '', stock: 50, alertThreshold: 5, status: 'active', lowStock: false, images: [{ url: 'https://example.com/img.jpg', thumb_url: 'https://example.com/thumb.jpg' }] },
      { id: 'p3', nameKm: 'Product C', nameEn: '', nameZh: 'C 中文', stock: 8, alertThreshold: 5, status: 'active', lowStock: false, images: ['https://example.com/legacy.jpg'] },
      { id: 'p4', nameKm: 'Product D', nameEn: '', nameZh: '', stock: 1, alertThreshold: 5, status: 'active', lowStock: true, images: ['javascript:alert(1)'] },
      { id: 'p5', nameKm: 'Product E', nameEn: 'E En', nameZh: 'E 中文', stock: 12, alertThreshold: 5, status: 'active', lowStock: false, images: [{ url: '/uploads/test.jpg' }] },
    ],
    meta: { total: 5 },
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
    expect(wrapper.findAll('[data-testid="inventory-card"]').length).toBe(5);
  });

  it('renders product images from object, string or relative path and blocks unsafe schemes', async () => {
    wrapper = await mountInventory(375);
    await flushPromises();

    const imgs = wrapper.findAll('.inventory-card-thumb');
    expect(imgs.length).toBe(3);
    expect(imgs[0].attributes('src')).toBe('https://example.com/thumb.jpg');
    expect(imgs[1].attributes('src')).toBe('https://example.com/legacy.jpg');
    expect(imgs[2].attributes('src')).toBe('/uploads/test.jpg');
  });

  it('renders images in desktop table', async () => {
    wrapper = await mountInventory(1280);
    await flushPromises();

    const imgs = wrapper.findAll('[data-testid="inventory-table"] img');
    expect(imgs.length).toBe(3);
    expect(imgs[0].attributes('src')).toBe('https://example.com/thumb.jpg');
    expect(imgs[2].attributes('src')).toBe('/uploads/test.jpg');
  });

  it('renders trilingual product names in cards and hides missing secondary names', async () => {
    wrapper = await mountInventory(375);
    await flushPromises();

    const cards = wrapper.findAll('[data-testid="inventory-card"]');
    expect(cards[0].find('[data-testid="product-name"]').text()).toContain('A En');
    expect(cards[0].find('[data-testid="product-name"]').text()).toContain('A 中文');

    expect(cards[1].find('[data-testid="product-name"]').text()).toContain('B En');
    expect(cards[1].find('[data-testid="product-name"]').text()).not.toContain('·');

    expect(cards[2].find('[data-testid="product-name"]').text()).toContain('C 中文');
    expect(cards[2].find('[data-testid="product-name"]').text()).not.toContain('·');

    expect(cards[3].find('[data-testid="product-name"]').text()).toBe('Product D');
  });
});
