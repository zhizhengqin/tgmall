const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://tgmall-production.up.railway.app';
const API_BASE_URL = BASE_URL + '/api/v1';
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
  await page.evaluate(async (apiBase) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${apiBase}/cart`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) { console.error('Clear cart failed:', e); }
  }, API_BASE_URL);
  await page.waitForTimeout(500);
}

async function ensureDemoAuthAndAddress(context) {
  const mockUser = {
    id: '999999999999999999',
    first_name: 'Dev',
    last_name: 'User',
    username: 'dev_user',
    language_code: 'km',
    photo_url: null,
  };

  try {
    // 1. Demo login via API
    const loginRes = await fetch(`${API_BASE_URL}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: mockUser }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    if (!token) {
      console.log('Demo login failed:', loginData);
      return false;
    }

    // 2. Check existing addresses
    const listRes = await fetch(`${API_BASE_URL}/users/me/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    if (!listData.data?.length) {
      const createRes = await fetch(`${API_BASE_URL}/users/me/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipient_name: 'Demo User',
          phone: '+85512345678',
          city_code: 'phnom_penh',
          province: '金边',
          district: 'Demo District',
          detail: 'Demo address detail',
          is_default: true,
        }),
      });
      const createData = await createRes.json();
      if (!createData.data?.id) {
        console.log('Create address failed:', createData);
        return false;
      }
    }

    // 3. Inject token into page localStorage
    await context.addInitScript((t) => {
      localStorage.setItem('token', t);
    }, token);

    return true;
  } catch (e) {
    console.error('ensureDemoAuthAndAddress error:', e);
    return false;
  }
}

async function run() {
  ensureDir(OUT_DIR);
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ensureDemoAuthAndAddress(context);
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

  // P5 select all (CartPage auto-selects on load; ensure at least one item is checked)
  const itemChecks = page.locator('.item-check input[type="checkbox"]');
  const checkCount = await itemChecks.count();
  for (let i = 0; i < checkCount; i++) {
    const cb = itemChecks.nth(i);
    const checked = await cb.isChecked().catch(() => false);
    if (!checked) await cb.check();
  }
  await page.waitForTimeout(500);
  await capture(page, 'payment-05-cart-selected.png');

  // P6 checkout
  const checkoutBtn = page.locator('.checkout-btn');
  if (await checkoutBtn.count() > 0) {
    await checkoutBtn.click();
    await page.waitForURL(/\/checkout/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  // P7 address if needed: open address picker and add a new address
  const addAddrText = page.locator('.add-addr').first();
  if (await addAddrText.isVisible().catch(() => false)) {
    await addAddrText.click();
    await page.waitForTimeout(800);

    // Click "+ 新增地址" inside modal
    const addNewBtn = page.locator('.add-new').first();
    if (await addNewBtn.isVisible().catch(() => false)) {
      await addNewBtn.click();
      await page.waitForTimeout(500);
    }

    const inputs = page.locator('input');
    if (await inputs.count() > 0) await inputs.nth(0).fill('Demo User');
    if (await inputs.count() > 1) await inputs.nth(1).fill('+85512345678');

    // CityPicker: open and wait for options to load
    const cityInput = page.locator('.city-picker .city-input').first();
    await cityInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await cityInput.isVisible().catch(() => false)) {
      await cityInput.click({ force: true });
      await page.waitForTimeout(1500);
      const firstCity = page.locator('.city-option').first();
      const cityVisible = await firstCity.isVisible().catch(() => false);
      if (cityVisible) {
        await firstCity.click();
        await page.waitForTimeout(500);
      } else {
        // Close picker if cities failed to load
        const closeBtn = page.locator('.close-btn').filter({ hasText: /取消|Cancel|បោះបង់/ }).first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      }
    }

    if (await inputs.count() > 2) await inputs.nth(2).fill('Demo District');
    const textarea = page.locator('textarea');
    if (await textarea.count() > 0) await textarea.fill('Demo address detail');

    const saveBtn = page.locator('button').filter({ hasText: /保存|Save|រក្សាទុក/ });
    if (await saveBtn.count() > 0) await saveBtn.click();
    // Wait for save and modal close
    await page.waitForTimeout(2000);
  }

  // Capture address picker if still open, then select the first listed address
  const addrModal = page.locator('.modal-mask').filter({ has: page.locator('.addr-option, .address-item, .addr-item') }).first();
  if (await addrModal.isVisible().catch(() => false)) {
    await capture(page, 'payment-07-checkout-address.png');
    const addrSelector = page.locator('.addr-option, .address-item, .addr-item').first();
    if (await addrSelector.isVisible().catch(() => false)) {
      await addrSelector.click();
      await page.waitForTimeout(500);
    }
  }

  // P6 checkout (final, unobstructed)
  await capture(page, 'payment-06-checkout.png');

  // P8 payment KHQR
  const submitBtn = page.locator('.submit-btn');
  if (await submitBtn.count() > 0) {
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click({ timeout: 15000, force: true });
    await page.waitForURL(/\/payment/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await capture(page, 'payment-08-payment-khqr.png');
  }

  // P9 mock confirm
  const mockBtn = page.locator('[data-test="mock-confirm-btn"], .btn-mock').first();
  try {
    await mockBtn.waitFor({ state: 'visible', timeout: 10000 });
    await mockBtn.click();
    await page.waitForTimeout(600);
    await capture(page, 'payment-09-mock-confirm.png');
  } catch (e) {
    console.log('mock confirm button not visible, skipping P9/P10');
  }

  // P10 success
  const confirmBtn = page.locator('[data-test="mock-confirm-submit"], .mock-card-actions .btn-primary').first();
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
    await page.waitForURL(/result/, { timeout: 15000 }).catch(() => {});
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
