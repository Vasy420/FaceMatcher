import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'ui-shots/welcome-landing.png', fullPage: true });
await page.getByRole('button', { name: /enter dashboard/i }).first().click();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'ui-shots/dashboard-from-welcome.png', fullPage: true });
console.log('after click', page.url());
await browser.close();
