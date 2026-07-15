const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ADMIN_URL = 'https://tgmall-production.up.railway.app/admin';
const MINIAPP_URL = 'https://tgmall-production.up.railway.app';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_OUT = path.resolve(__dirname, '../../项目文档/demo-guide/screenshots/admin');
const MINIAPP_OUT = path.resolve(__dirname, '../../项目文档/demo-guide/screenshots/miniapp');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function capture(page, filePath, fullPage = true) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: filePath, fullPage });
  console.log('saved', filePath);
}

async function adminScreenshots(browser) {
  ensureDir(ADMIN_OUT);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto(`${ADMIN_URL}/login`);
  await page.waitForSelector('.login', { timeout: 15000 });
  await page.screenshot({ path: path.join(ADMIN_OUT, '01-login.png') });

  await page.fill('input[autocomplete="username"]', ADMIN_USERNAME);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.screenshot({ path: path.join(ADMIN_OUT, '02-login-filled.png') });

  await page.click('.login-btn');
  await page.waitForURL(`${ADMIN_URL}/dashboard`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Set Chinese
  await page.evaluate(() => localStorage.setItem('admin_lang', 'zh'));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const pages = [
    { route: 'dashboard', file: '03-dashboard.png' },
    { route: 'products', file: '04-products.png' },
    { route: 'orders', file: '05-orders.png' },
    { route: 'users', file: '06-users.png' },
    { route: 'coupons', file: '07-coupons.png' },
    { route: 'settings/banners', file: '08-banners.png' },
    { route: 'settings/categories', file: '09-categories.png' },
    { route: 'settings/cities', file: '10-cities.png' },
    { route: 'settings/platform', file: '11-platform.png' },
    { route: 'inventory', file: '12-inventory.png' },
  ];

  for (const p of pages) {
    await page.goto(`${ADMIN_URL}/${p.route}`);
    await capture(page, path.join(ADMIN_OUT, p.file));
  }

  await context.close();
}

async function miniappScreenshots(browser) {
  ensureDir(MINIAPP_OUT);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Set Chinese and go home
  await page.goto(MINIAPP_URL);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => localStorage.setItem('lang', 'zh'));
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  // 01 homepage
  await capture(page, path.join(MINIAPP_OUT, '01-homepage.png'));

  // 02 category switch
  const catBtns = page.locator('.cat-btn');
  if (await catBtns.count() > 1) {
    await catBtns.nth(1).click();
    await page.waitForTimeout(800);
  }
  await capture(page, path.join(MINIAPP_OUT, '02-homepage-category-switched.png'));

  // 03 product detail - use demo mode and click first visible product card
  await page.goto(`${MINIAPP_URL}/?demo=1`);
  await page.waitForSelector('.home-page', { timeout: 15000 }).catch(() => {});
  const cards = page.locator('.product-card, [data-testid="product-card"]');
  if (await cards.count() > 0) {
    await cards.first().click();
    await page.waitForTimeout(1500);
  } else {
    await page.goto(`${MINIAPP_URL}/product/1`);
    await page.waitForTimeout(1500);
  }
  await capture(page, path.join(MINIAPP_OUT, '03-product-detail.png'));

  // 04 spec selected
  const specBtns = page.locator('.spec-btn:not(.disabled)');
  if (await specBtns.count() > 0) {
    await specBtns.first().click();
    await page.waitForTimeout(300);
    await capture(page, path.join(MINIAPP_OUT, '04-product-spec-selected.png'));
  }

  // 05 category page
  await page.goto(`${MINIAPP_URL}/category`);
  await page.waitForTimeout(1200);
  await capture(page, path.join(MINIAPP_OUT, '05-category-page.png'));

  // 06 cart page - demo mode add first product to cart
  await page.goto(`${MINIAPP_URL}/?demo=1`);
  await page.waitForSelector('.home-page', { timeout: 15000 }).catch(() => {});
  const homeCards = page.locator('.product-card, [data-testid="product-card"]');
  if (await homeCards.count() > 0) {
    await homeCards.first().click();
    await page.waitForTimeout(1200);
    // Try multiple possible add-to-cart selectors
    const addBtn = page.locator('.btn-cart, .add-to-cart, .btn-primary, button:has-text("加入购物车"), button:has-text("Add to Cart")');
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(1500);
    }
  }
  await page.goto(`${MINIAPP_URL}/cart`);
  await page.waitForTimeout(1500);
  await capture(page, path.join(MINIAPP_OUT, '06-cart-page.png'));

  // 07 profile
  await page.goto(`${MINIAPP_URL}/profile`);
  await page.waitForTimeout(1200);
  await capture(page, path.join(MINIAPP_OUT, '07-profile-page.png'));

  // 08 login
  await page.goto(`${MINIAPP_URL}/login`);
  await page.waitForTimeout(1200);
  await capture(page, path.join(MINIAPP_OUT, '08-login-page.png'));

  // 09 search + 10 results
  await page.goto(MINIAPP_URL);
  await page.waitForSelector('.search-bar', { timeout: 10000 }).catch(() => {});
  const searchBar = page.locator('.search-bar');
  if (await searchBar.isVisible().catch(() => false)) {
    await searchBar.click();
  } else {
    await page.goto(`${MINIAPP_URL}/search`);
  }
  await page.waitForTimeout(1000);
  await capture(page, path.join(MINIAPP_OUT, '09-search-page.png'));

  const searchInput = page.locator('input[type="text"], input[type="search"], .search-input input');
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('water');
    await page.waitForTimeout(1500);
    await capture(page, path.join(MINIAPP_OUT, '10-search-results.png'));
  }

  // 11 city select
  await page.goto(MINIAPP_URL);
  await page.waitForSelector('.city-entry', { timeout: 10000 }).catch(() => {});
  const cityEntry = page.locator('.city-entry');
  if (await cityEntry.isVisible().catch(() => false)) {
    await cityEntry.click();
  } else {
    await page.goto(`${MINIAPP_URL}/cities`);
  }
  await page.waitForTimeout(1000);
  await capture(page, path.join(MINIAPP_OUT, '11-city-select.png'));

  // 12 coupons
  await page.goto(`${MINIAPP_URL}/coupons`);
  await page.waitForTimeout(1200);
  await capture(page, path.join(MINIAPP_OUT, '12-coupons-page.png'));

  // 13 bottom nav
  await page.goto(MINIAPP_URL);
  await page.waitForSelector('.bottom-nav', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  await capture(page, path.join(MINIAPP_OUT, '13-bottom-nav.png'), false);

  await context.close();
}

async function run() {
  ensureDir(ADMIN_OUT);
  ensureDir(MINIAPP_OUT);
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  // try {
  //   await adminScreenshots(browser);
  // } catch (e) {
  //   console.error('Admin screenshots error:', e);
  // }

  try {
    await miniappScreenshots(browser);
  } catch (e) {
    console.error('MiniApp screenshots error:', e);
  }

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
