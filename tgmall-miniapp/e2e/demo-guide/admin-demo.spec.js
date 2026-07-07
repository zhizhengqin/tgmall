import { test, expect } from '@playwright/test';

const ADMIN_URL = 'https://tgmall-production.up.railway.app/admin';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const OUT_DIR = '../../项目文档/demo-guide/screenshots/admin';

async function login(page) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.waitForSelector('.login', { timeout: 15000 });
  await page.screenshot({ path: `${OUT_DIR}/01-login.png`, fullPage: false });

  await page.fill('input[autocomplete="username"]', ADMIN_USERNAME);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.screenshot({ path: `${OUT_DIR}/02-login-filled.png`, fullPage: false });

  await page.click('.login-btn');
  await page.waitForURL(`${ADMIN_URL}/dashboard`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function setChineseLocale(page) {
  await page.evaluate(() => {
    localStorage.setItem('admin_lang', 'zh');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

async function capturePage(page, path, fullPage = true) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/${path}`, fullPage });
}

test.describe('Admin 后台演示流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('登录 → Dashboard → 商品 → 订单 → 运营配置', async ({ page }) => {
    await login(page);
    await setChineseLocale(page);

    // Dashboard
    await capturePage(page, '03-dashboard.png');

    // 商品管理
    await page.goto(`${ADMIN_URL}/products`);
    await capturePage(page, '04-products.png');

    // 订单管理
    await page.goto(`${ADMIN_URL}/orders`);
    await capturePage(page, '05-orders.png');

    // 用户管理
    await page.goto(`${ADMIN_URL}/users`);
    await capturePage(page, '06-users.png');

    // 优惠券
    await page.goto(`${ADMIN_URL}/coupons`);
    await capturePage(page, '07-coupons.png');

    // Banner 配置
    await page.goto(`${ADMIN_URL}/settings/banners`);
    await capturePage(page, '08-banners.png');

    // 品类配置
    await page.goto(`${ADMIN_URL}/settings/categories`);
    await capturePage(page, '09-categories.png');

    // 城市管理
    await page.goto(`${ADMIN_URL}/settings/cities`);
    await capturePage(page, '10-cities.png');

    // 平台设置
    await page.goto(`${ADMIN_URL}/settings/platform`);
    await capturePage(page, '11-platform.png');

    // 库存管理
    await page.goto(`${ADMIN_URL}/inventory`);
    await capturePage(page, '12-inventory.png');
  });
});
