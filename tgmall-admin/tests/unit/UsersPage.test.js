import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UsersPage from '@/pages/UsersPage.vue';

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

const mockUsers = [
  { id: 'u1', firstName: 'Sreyneang', lastName: 'Phan', phone: '+85512345003', telegramId: '10000003', status: 'active', createdAt: '2026-07-06T00:00:00Z' },
  { id: 'u2', firstName: '李华', lastName: '', phone: '+85512345002', telegramId: '10000002', status: 'banned', createdAt: '2026-07-06T00:00:00Z' },
];

const messages = {
  'users.title': '用户管理',
  'users.search': '搜索',
  'users.firstName': '名',
  'users.lastName': '姓',
  'users.phone': '手机号',
  'users.telegramId': 'Telegram ID',
  'users.status': '状态',
  'users.active': '正常',
  'users.banned': '已禁用',
  'users.ban': '禁用',
  'users.unban': '解禁',
  'orders.date': '日期',
  'common.noData': '暂无数据',
};

vi.mock('@/api', () => ({
  getAdminUsers: vi.fn(() => Promise.resolve({ data: mockUsers, meta: { total: 2 } })),
  toggleUserStatus: vi.fn(() => Promise.resolve()),
}));

async function mountUsers(width = 1280) {
  setWidth(width);
  return mount(UsersPage, {
    global: {
      mocks: { $t: (key) => messages[key] || key },
    },
    attachTo: document.body,
  });
}

describe('UsersPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
    setWidth(1280);
  });

  it('renders distinct firstName and lastName column headers', async () => {
    wrapper = await mountUsers();
    await flushPromises();

    const headers = wrapper.findAll('.el-table__header th').map((th) => th.text());
    expect(headers).toContain('名');
    expect(headers).toContain('姓');
    expect(headers.filter((h) => h === '姓名').length).toBe(0);
  });

  it('renders user rows with first and last name', async () => {
    wrapper = await mountUsers();
    await flushPromises();

    expect(wrapper.text()).toContain('Sreyneang');
    expect(wrapper.text()).toContain('Phan');
    expect(wrapper.text()).toContain('李华');
  });

  it('renders localized status tags', async () => {
    wrapper = await mountUsers();
    await flushPromises();

    expect(wrapper.text()).toContain('正常');
    expect(wrapper.text()).toContain('已禁用');
  });

  it('renders cards on mobile', async () => {
    wrapper = await mountUsers(375);
    await flushPromises();

    expect(wrapper.find('.el-table').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="user-card"]').length).toBe(2);
    expect(wrapper.text()).toContain('Sreyneang');
    expect(wrapper.text()).toContain('+85512345003');
  });
});
