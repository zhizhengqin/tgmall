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

async function setLanguage(page, lang = 'zh') {
  await page.evaluate((code) => localStorage.setItem('lang', code), lang);
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);
}

function formatDate() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

async function clearCart(page) {
  await page.evaluate(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch('http://localhost:3000/api/v1/cart', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Clear cart failed:', e);
    }
  });
  await page.waitForTimeout(500);
}

test.describe.configure({ timeout: 120000 });

test.describe('MiniApp 支付演示流程（浏览器 Demo 模式）', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('完整链路：首页 → 加购 → 下单 → KHQR 模拟支付 → 成功', async ({ page }) => {
    // 1. 进入首页（Demo 模式自动注入 Telegram Mock）
    await page.goto(`${BASE_URL}/?demo=1`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await setLanguage(page, 'zh');
    await page.waitForSelector('.home-page', { timeout: 15000 });

    // 清空购物车，保证截图干净
    await clearCart(page);

    await capturePage(page, 'payment-01-homepage.png');

    // 2. 点击第二个商品卡片进入详情（避免第一个无图商品）
    const productCards = page.locator('.product-card');
    const cardCount = await productCards.count();
    expect(cardCount).toBeGreaterThan(1);
    await productCards.nth(1).click();
    await page.waitForTimeout(1500);

    // 等待价格加载完成（避免截图到 $0 状态）
    await page.waitForFunction(() => {
      const priceEl = document.querySelector('.price-display .price-usd');
      return priceEl && !priceEl.textContent.includes('0.00');
    }, { timeout: 10000 });
    await capturePage(page, 'payment-02-product-detail.png');

    // 3. 选择第一个可用规格（如果有）
    const specButtons = page.locator('.spec-btn:not(.disabled)');
    if (await specButtons.count() > 0) {
      await specButtons.first().click();
      await page.waitForTimeout(300);
    }

    // 4. 加入购物车
    const addToCartBtn = page.locator('.btn-cart');
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();
    await page.waitForTimeout(1200);
    await capturePage(page, 'payment-03-product-added.png');

    // 5. 进入购物车
    await page.goto(`${BASE_URL}/cart`);
    await page.waitForTimeout(1500);
    await capturePage(page, 'payment-04-cart.png');

    // 6. 全选购物车商品
    const selectAllCheckbox = page.locator('.select-all input[type="checkbox"]');
    if (await selectAllCheckbox.count() > 0) {
      await selectAllCheckbox.check();
      await page.waitForTimeout(500);
      await capturePage(page, 'payment-05-cart-selected.png');
    }

    // 7. 去结算
    const checkoutBtn = page.locator('.checkout-btn');
    await expect(checkoutBtn).toBeEnabled();
    await checkoutBtn.click();
    await page.waitForTimeout(1500);
    await capturePage(page, 'payment-06-checkout.png');

    // 8. 处理地址：如果没有地址则新增一个
    const addAddrText = page.locator('.add-addr');
    if (await addAddrText.isVisible().catch(() => false)) {
      await addAddrText.click();
      await page.waitForTimeout(300);
      await page.locator('input').nth(0).fill('Demo User');
      await page.locator('input').nth(1).fill('+85512345678');
      // 城市选择：点击 CityPicker 触发器选择第一个城市
      const cityTrigger = page.locator('.city-picker-trigger, .city-picker, select').first();
      if (await cityTrigger.count() > 0) {
        await cityTrigger.click();
        await page.waitForTimeout(300);
        const firstCity = page.locator('.city-option, .city-item, option').first();
        if (await firstCity.count() > 0) await firstCity.click();
      }
      await page.locator('input').nth(3).fill('Demo District');
      await page.locator('textarea').fill('Demo address detail');
      const saveBtn = page.locator('button').filter({ hasText: /保存|Save|រក្សាទុក/ });
      if (await saveBtn.count() > 0) await saveBtn.click();
      await page.waitForTimeout(1000);
      await capturePage(page, 'payment-07-checkout-address.png');
    }

    // 9. 提交订单
    const submitBtn = page.locator('.submit-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 10. 等待进入支付页
    await page.waitForURL(/payment/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await capturePage(page, 'payment-08-payment-khqr.png');

    // 11. 点击模拟支付按钮
    const mockBtn = page.locator('[data-test="mock-confirm-btn"], .btn-mock');
    await expect(mockBtn).toBeVisible();
    await mockBtn.click();
    await page.waitForTimeout(500);
    await capturePage(page, 'payment-09-mock-confirm.png');

    // 12. 确认支付
    const confirmBtn = page.locator('[data-test="mock-confirm-submit"], .mock-card-actions .btn-primary');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 13. 等待支付成功页
    await page.waitForURL(/payment\/result|result/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await capturePage(page, 'payment-10-success.png');

    // 14. 查看订单列表
    await page.goto(`${BASE_URL}/orders`);
    await page.waitForTimeout(1500);
    await capturePage(page, 'payment-11-orders.png');
  });
});
