import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProductName from '@/components/ProductName.vue';

function render(props) {
  return mount(ProductName, { props });
}

describe('ProductName', () => {
  it('renders trilingual names', () => {
    const wrapper = render({ nameKm: 'ទំនិញA', nameEn: 'Product A', nameZh: '商品A' });
    expect(wrapper.text()).toContain('ទំនិញA');
    expect(wrapper.text()).toContain('Product A');
    expect(wrapper.text()).toContain('商品A');
    expect(wrapper.text()).toContain('·');
  });

  it('hides English when missing', () => {
    const wrapper = render({ nameKm: 'ទំនិញB', nameEn: '', nameZh: '商品B' });
    expect(wrapper.text()).toContain('ទំនិញB');
    expect(wrapper.text()).toContain('商品B');
    expect(wrapper.text()).not.toContain('·');
  });

  it('hides Chinese when missing', () => {
    const wrapper = render({ nameKm: 'ទំនិញC', nameEn: 'Product C', nameZh: '' });
    expect(wrapper.text()).toContain('ទំនិញC');
    expect(wrapper.text()).toContain('Product C');
    expect(wrapper.text()).not.toContain('·');
  });

  it('renders only Khmer when others are missing', () => {
    const wrapper = render({ nameKm: 'ទំនិញD', nameEn: '', nameZh: '' });
    expect(wrapper.text()).toBe('ទំនិញD');
  });
});
