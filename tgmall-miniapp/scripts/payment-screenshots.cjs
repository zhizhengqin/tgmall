const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://tgmall-production.up.railway.app';
const OUT_DIR = path.resolve(__dirname, '../../项目文档/demo-guide/screenshots/miniapp');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function capture(page, name, fullPage = true) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage });
  console.log('saved', path.join(OUT_DIR, name));
}

async function clearCart(page) {
  await page.evaluate(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${window.location.origin}/api/v1/cart`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) { console.error('Clear cart failed:', e); }
  });
  await page.waitForTimeout(500);
}

async function run() {
  ensureDir(OUT_DIR);
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Demo mode + Chinese
  await page.goto(`${BASE_URL}/?demo=1`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => localStorage.setItem('lang', 'zh'));
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);
  await clearCart(page);

  // P1 homepage
  await page.waitForSelector('.home-page', { timeout: 15000 }).catch(() => {});
  await capture(page, 'payment-01-homepage.png');

  // P2 product detail
  const cards = page.locator('.product-card, [data-testid="product-card"]');
  const count = await cards.count();
  if (count > 1) await cards.nth(1).click();
  else if (count > 0) await cards.first().click();
  await page.waitForTimeout(1500);
  await capture(page, 'payment-02-product-detail.png');

  // P3 added to cart
  const addBtn = page.locator('.btn-cart, .add-to-cart, button:has-text("加入购物车")');
  if (await addBtn.count() > 0) {
    await addBtn.first().click();
    await page.waitForTimeout(1200);
  }
  await capture(page, 'payment-03-product-added.png');

  // P4 cart
  await page.goto(`${BASE_URL}/cart`);
  await page.waitForTimeout(1200);
  await capture(page, 'payment-04-cart.png');

  // P5 select all
  const selectAll = page.locator('.select-all input[type="checkbox"]');
  if (await selectAll.count() > 0) {
    await selectAll.check();
    await page.waitForTimeout(500);
    await capture(page, 'payment-05-cart-selected.png');
  }

  // P6 checkout
  const checkoutBtn = page.locator('.checkout-btn');
  if (await checkoutBtn.count() > 0) {
    await checkoutBtn.click();
    await page.waitForTimeout(1500);
  }

  // P7 address if needed: handle both inline "+ 添加收货地址" and sheet "+ 新增地址"
  let addAddr = page.locator('.add-addr, .btn-add-addr, [class*="add-address"]').first();
  let addAddrVisible = await addAddr.isVisible().catch(() => false);
  if (!addAddrVisible) {
    // maybe inside address sheet
    addAddr = page.locator('.van-popup .add-addr, .van-popup [class*="add"]').first();
    addAddrVisible = await addAddr.isVisible().catch(() => false);
  }
  if (addAddrVisible) {
    await addAddr.click();
    await page.waitForTimeout(600);
    const inputs = page.locator('input');
    if (await inputs.count() > 0) await inputs.nth(0).fill('Demo User');
    if (await inputs.count() > 1) await inputs.nth(1).fill('+85512345678');
    const cityTrigger = page.locator('.city-picker-trigger, .city-picker, select').first();
    if (await cityTrigger.count() > 0) {
      await cityTrigger.click();
      await page.waitForTimeout(300);
      const firstCity = page.locator('.city-option, .city-item, option').first();
      if (await firstCity.count() > 0) await firstCity.click();
    }
    if (await inputs.count() > 3) await inputs.nth(3).fill('Demo District');
    const textarea = page.locator('textarea');
    if (await textarea.count() > 0) await textarea.fill('Demo address detail');
    const saveBtn = page.locator('button').filter({ hasText: /保存|Save|រក្សាទុក/ });
    if (await saveBtn.count() > 0) await saveBtn.click();
    await page.waitForTimeout(1500);
  }

  // If address sheet is open, capture it, then select the first available address
  const addrSheet = page.locator('.address-sheet, .address-popup, .van-popup, .sheet, .address-list');
  if (await addrSheet.isVisible().catch(() => false)) {
    await capture(page, 'payment-07-checkout-address.png');
    const addrSelector = page.locator('.address-item, .addr-item, .address-card').first();
    if (await addrSelector.count() > 0) {
      await addrSelector.click();
      await page.waitForTimeout(500);
    }
  }

  // P6 checkout (final, unobstructed)
  await capture(page, 'payment-06-checkout.png');

  // P8 payment KHQR
  const submitBtn = page.locator('.submit-btn');
  if (await submitBtn.count() > 0) {
    await submitBtn.click({ timeout: 15000 });
    await page.waitForURL(/payment/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await capture(page, 'payment-08-payment-khqr.png');
  }

  // P9 mock confirm
  const mockBtn = page.locator('[data-test="mock-confirm-btn"], .btn-mock');
  if (await mockBtn.count() > 0) {
    await mockBtn.click();
    await page.waitForTimeout(500);
    await capture(page, 'payment-09-mock-confirm.png');
  }

  // P10 success
  const confirmBtn = page.locator('[data-test="mock-confirm-submit"], .mock-card-actions .btn-primary');
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click();
    await page.waitForURL(/payment\/result|result/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await capture(page, 'payment-10-success.png');
  }

  // P11 orders
  await page.goto(`${BASE_URL}/orders`);
  await page.waitForTimeout(1500);
  await capture(page, 'payment-11-orders.png');

  await context.close();
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
