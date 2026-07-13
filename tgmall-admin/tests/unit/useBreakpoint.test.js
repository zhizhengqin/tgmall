import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useBreakpoint } from '@/composables/useBreakpoint';

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

function renderUseBreakpoint(width = 1024) {
  setWidth(width);
  const Comp = defineComponent({
    setup() {
      return useBreakpoint();
    },
    template: '<div />',
  });
  return mount(Comp);
}

describe('useBreakpoint', () => {
  it('reports lg on desktop width', async () => {
    const wrapper = renderUseBreakpoint(1280);
    await nextTick();
    expect(wrapper.vm.lg).toBe(true);
    expect(wrapper.vm.md).toBe(false);
    expect(wrapper.vm.sm).toBe(false);
    expect(wrapper.vm.xs).toBe(false);
    expect(wrapper.vm.isMobile).toBe(false);
  });

  it('reports xs and isMobile on phone width', async () => {
    const wrapper = renderUseBreakpoint(375);
    await nextTick();
    expect(wrapper.vm.xs).toBe(true);
    expect(wrapper.vm.sm).toBe(false);
    expect(wrapper.vm.md).toBe(false);
    expect(wrapper.vm.lg).toBe(false);
    expect(wrapper.vm.isMobile).toBe(true);
  });

  it('updates when window resizes', async () => {
    const wrapper = renderUseBreakpoint(1280);
    await nextTick();
    expect(wrapper.vm.lg).toBe(true);

    setWidth(430);
    await nextTick();
    expect(wrapper.vm.xs).toBe(true);
    expect(wrapper.vm.lg).toBe(false);
    expect(wrapper.vm.isMobile).toBe(true);
  });
});
