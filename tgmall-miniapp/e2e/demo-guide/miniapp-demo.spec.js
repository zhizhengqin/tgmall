import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = '../项目文档/demo-guide/screenshots/miniapp';

// 移动端视口 — 模拟 Telegram Mini App
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function capturePage(page, name, fullPage = true) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/${name}`, fullPage });
}

test.describe('MiniApp 商城演示流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    // 设置为中文，方便演示截图
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => localStorage.setItem('lang', 'zh'));
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(800);
  });

  test('01-首页 → 品类切换 → 商品列表', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.home-page', { timeout: 15000 });
    await capturePage(page, '01-homepage.png');

    // 切换品类
    const catBtns = page.locator('.cat-btn');
    const count = await catBtns.count();
    if (count > 1) {
      await catBtns.nth(1).click();
      await page.waitForTimeout(800);
      await capturePage(page, '02-homepage-category-switched.png');
    } else {
      await capturePage(page, '02-homepage-category-switched.png');
    }
  });

  test('02-商品详情 → 规格选择', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.home-page', { timeout: 15000 });

    // 点击第一个商品卡片
    const productCard = page.locator('.product-card, [data-testid="product-card"], .product-section a').first();
    const cardCount = await page.locator('.product-card, [data-testid="product-card"]').count();

    if (cardCount > 0) {
      await page.locator('.product-card, [data-testid="product-card"]').first().click();
    } else {
      // fallback: 直接访问商品详情（ID=1）
      await page.goto(`${BASE_URL}/product/1`);
    }

    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle').catch(() => {});
    await capturePage(page, '03-product-detail.png');

    // 尝试选择规格
    const specBtns = page.locator('.spec-btn:not(.disabled)');
    if (await specBtns.count() > 0) {
      await specBtns.first().click();
      await page.waitForTimeout(300);
      await capturePage(page, '04-product-spec-selected.png');
    }
  });

  test('03-分类页浏览', async ({ page }) => {
    // 通过底部导航进入分类页
    await page.goto(`${BASE_URL}/category`);
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle').catch(() => {});
    await capturePage(page, '05-category-page.png');
  });

  test('04-购物车', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`);
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle').catch(() => {});
    await capturePage(page, '06-cart-page.png');
  });

  test('05-个人中心', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle').catch(() => {});
    await capturePage(page, '07-profile-page.png');
  });

  test('06-登录页面', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle').catch(() => {});
    await capturePage(page, '08-login-page.png');
  });

  test('07-搜索页面', async ({ page }) => {
    // 从首页点击搜索栏进入
    await page.goto(BASE_URL);
    await page.waitForSelector('.search-bar', { timeout: 10000 }).catch(() => {});
    const searchBar = page.locator('.search-bar');
    if (await searchBar.isVisible()) {
      await searchBar.click();
    } else {
      await page.goto(`${BASE_URL}/search`);
    }
    await page.waitForTimeout(1000);
    await capturePage(page, '09-search-page.png');

    // 输入搜索关键词
    const searchInput = page.locator('input[type="text"], input[type="search"], .search-input input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('water');
      await page.waitForTimeout(1500);
      await capturePage(page, '10-search-results.png');
    }
  });

  test('08-城市选择', async ({ page }) => {
    // 从首页点击城市入口
    await page.goto(BASE_URL);
    await page.waitForSelector('.city-entry', { timeout: 10000 }).catch(() => {});
    const cityEntry = page.locator('.city-entry');
    if (await cityEntry.isVisible()) {
      await cityEntry.click();
    } else {
      await page.goto(`${BASE_URL}/cities`);
    }
    await page.waitForTimeout(1000);
    await capturePage(page, '11-city-select.png');
  });

  test('09-优惠券中心', async ({ page }) => {
    await page.goto(`${BASE_URL}/coupons`);
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle').catch(() => {});
    await capturePage(page, '12-coupons-page.png');
  });

  test('10-底部导航切换验证', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.bottom-nav', { timeout: 10000 });

    // 验证 5 个导航项都可见
    const navItems = page.locator('.nav-item');
    await expect(navItems).toHaveCount(5);

    // 截图底部导航
    await capturePage(page, '13-bottom-nav.png');
  });
});
