const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const htmlPath = '/tmp/telegram-小商城演示操作手册.html';
  const outPath = path.resolve(__dirname, '../../项目文档/telegram 小商城演示操作手册.pdf');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  });
  console.log('PDF saved to', outPath);
  await browser.close();
})();
