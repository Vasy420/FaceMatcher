import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'ui-shots/logo-welcome.png', fullPage: false });
await page.goto('http://127.0.0.1:5173/home', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'ui-shots/logo-dashboard.png', fullPage: false });
await browser.close();
console.log('ok');
