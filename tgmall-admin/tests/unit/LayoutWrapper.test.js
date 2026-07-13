import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue';

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

async function mountWrapper(width = 1280) {
  setWidth(width);
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/dashboard', component: { template: '<div />' }, meta: { requiresAuth: true } }],
  });
  await router.push('/dashboard');
  await router.isReady();

  return mount(LayoutWrapper, {
    global: {
      mocks: {
        $t: (key) => key,
      },
      plugins: [router],
    },
    slots: {
      default: '<div data-testid="page-slot">page content</div>',
    },
    attachTo: document.body,
  });
}

describe('LayoutWrapper', () => {
  let wrapper;

  beforeEach(() => {
    // jsdom default
    setWidth(1024);
  });

  afterEach(() => {
    wrapper?.unmount();
    setWidth(1024);
  });

  it('renders desktop sidebar and slot on wide screen', async () => {
    wrapper = await mountWrapper(1280);
    expect(wrapper.find('[data-testid="desktop-sidebar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-menu-btn"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="page-slot"]').text()).toBe('page content');
  });

  it('renders mobile hamburger and drawer on narrow screen', async () => {
    wrapper = await mountWrapper(375);
    expect(wrapper.find('[data-testid="desktop-sidebar"]').exists()).toBe(false);
    const menuBtn = wrapper.find('[data-testid="mobile-menu-btn"]');
    expect(menuBtn.exists()).toBe(true);

    menuBtn.trigger('click');
    await flushPromises();
    expect(wrapper.vm.drawerVisible).toBe(true);
  });

  it('closes drawer when SidebarMenu emits select', async () => {
    wrapper = await mountWrapper(375);
    wrapper.vm.drawerVisible = true;
    await flushPromises();

    const sidebarMenu = wrapper.findComponent({ name: 'SidebarMenu' });
    sidebarMenu.vm.$emit('select');
    await flushPromises();
    expect(wrapper.vm.drawerVisible).toBe(false);
  });
});
