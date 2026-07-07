import { test, expect } from '@playwright/test';

// 模拟 Telegram WebApp SDK 数据
const MOCK_USER = {
  id: 123456789,
  first_name: 'Sokha',
  last_name: 'Chea',
  username: 'sokha_chea',
  language_code: 'km',
  photo_url: 'https://i.pravatar.cc/150?u=sokha',
};

// 构建模拟的 initData 字符串（hash 无效，但前端 SDK 数据可用）
const MOCK_INIT_DATA = `query_id=AAHdF6IQAAAAAN0XohAA&user=${encodeURIComponent(JSON.stringify(MOCK_USER))}&auth_date=1717900000&hash=mockhash123`;

/**
 * 在页面上下文中注入 Telegram WebApp SDK Mock
 */
async function injectTelegramMock(page) {
  await page.addInitScript((initData, user) => {
    window.Telegram = {
      WebApp: {
        initData,
        initDataUnsafe: { user, query_id: 'AAHdF6IQAAAAAN0XohAA' },
        ready: () => {},
        expand: () => {},
        version: '7.0',
        platform: 'ios',
        colorScheme: 'light',
      },
    };
  }, MOCK_INIT_DATA, MOCK_USER);
}

test.describe('Telegram Mini App 用户信息获取', () => {
  test.beforeEach(async ({ page }) => {
    await injectTelegramMock(page);
  });

  test('SDK 就绪后自动获取用户信息并显示在 Profile 页', async ({ page }) => {
    // 1. 打开首页，App.vue 的轮询会检测到 SDK
    await page.goto('/');

    // 2. 等待轮询完成（最大 5s，但通常 < 200ms）
    await page.waitForTimeout(500);

    // 3. 导航到 Profile 页面
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // 4. 验证昵称显示正确
    const nameEl = page.locator('.user-name');
    await expect(nameEl).toBeVisible();
    await expect(nameEl).toHaveText('Sokha Chea');

    // 5. 验证头像显示为真实图片（不是 👤）
    const avatarImg = page.locator('.avatar-img');
    await expect(avatarImg).toBeVisible();
    await expect(avatarImg).toHaveAttribute('src', MOCK_USER.photo_url);

    // 6. 截图留档
    await page.screenshot({ path: 'e2e/screenshots/profile-user-info.png', fullPage: true });

    console.log('✅ 用户信息获取验证通过:', {
      name: await nameEl.textContent(),
      photoUrl: await avatarImg.getAttribute('src'),
    });
  });

  test('无头像用户回退显示 👤 emoji', async ({ page }) => {
    // 去掉头像、姓名和用户名，触发最终的 👤 回退
    const noPhotoUser = { ...MOCK_USER, photo_url: undefined, first_name: '', last_name: '', username: '' };
    const noPhotoInitData = `query_id=AAHdF6IQAAAAAN0XohAA&user=${encodeURIComponent(JSON.stringify(noPhotoUser))}&auth_date=1717900000&hash=mockhash123`;

    await page.addInitScript((initData, user) => {
      window.Telegram = {
        WebApp: {
          initData,
          initDataUnsafe: { user, query_id: 'AAHdF6IQAAAAAN0XohAA' },
          ready: () => {},
          expand: () => {},
          version: '7.0',
          platform: 'ios',
          colorScheme: 'light',
        },
      };
    }, noPhotoInitData, noPhotoUser);

    await page.goto('/');
    await page.waitForTimeout(500);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // 无头像时应显示 👤
    const avatarEmoji = page.locator('.avatar span');
    await expect(avatarEmoji).toBeVisible();
    await expect(avatarEmoji).toHaveText('👤');

    // 确保没有 img 标签
    const avatarImg = page.locator('.avatar-img');
    await expect(avatarImg).toHaveCount(0);

    await page.screenshot({ path: 'e2e/screenshots/profile-no-avatar.png', fullPage: true });

    console.log('✅ 无头像回退验证通过');
  });

  test('SDK 延迟注入场景 — 轮询等待机制', async ({ page }) => {
    // 先不注入 SDK，打开页面
    await page.goto('/');
    await page.waitForTimeout(200);

    // 此时页面应该没有用户信息（显示 guest）
    await page.goto('/profile');
    const nameEl = page.locator('.user-name');
    const initialText = await nameEl.textContent();
    console.log('SDK 注入前昵称:', initialText);

    // 在页面上下文中延迟注入 SDK
    await page.evaluate(({ initData, user }) => {
      setTimeout(() => {
        window.Telegram = {
          WebApp: {
            initData,
            initDataUnsafe: { user, query_id: 'AAHdF6IQAAAAAN0XohAA' },
            ready: () => {},
            expand: () => {},
            version: '7.0',
            platform: 'android',
            colorScheme: 'light',
          },
        };
      }, 300);
    }, { initData: MOCK_INIT_DATA, user: MOCK_USER });

    // 等待足够时间让轮询检测到 SDK
    await page.waitForTimeout(800);

    // 刷新页面让 App.vue 重新执行 onMounted
    await page.reload();
    await page.waitForTimeout(600);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // 验证用户信息已显示
    await expect(nameEl).toHaveText('Sokha Chea');
    const avatarImg = page.locator('.avatar-img');
    await expect(avatarImg).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/profile-delayed-sdk.png', fullPage: true });

    console.log('✅ SDK 延迟注入验证通过');
  });
});
