import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import BottomNav from '@/components/common/BottomNav.vue';

vi.mock('@/stores/cartStore', () => ({
  useCartStore: () => ({ totalItems: 0 }),
}));

function mountBottomNav() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });

  return mount(BottomNav, {
    global: {
      mocks: {
        $t: (key) => key,
      },
      stubs: {
        'router-link': {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
      plugins: [router],
    },
    attachTo: document.body,
  });
}

describe('BottomNav', () => {
  let wrapper;

  beforeEach(() => {});

  afterEach(() => {
    wrapper?.unmount();
  });

  it('renders five navigation items', () => {
    wrapper = mountBottomNav();
    const items = wrapper.findAll('.nav-item');
    expect(items.length).toBe(5);
    expect(wrapper.text()).toContain('nav.home');
    expect(wrapper.text()).toContain('nav.cart');
    expect(wrapper.text()).toContain('nav.profile');
  });

  it('is always visible', async () => {
    wrapper = mountBottomNav();
    expect(wrapper.find('.bottom-nav').classes()).not.toContain('is-hidden');

    // 模拟滚动不应隐藏底部导航
    Object.defineProperty(window, 'scrollY', {
      value: 100,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('scroll'));
    await flushPromises();
    expect(wrapper.find('.bottom-nav').classes()).not.toContain('is-hidden');
  });
});
