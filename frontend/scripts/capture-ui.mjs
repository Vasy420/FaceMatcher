import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'ui-shots');
await mkdir(outDir, { recursive: true });

const pages = [
  { path: '/', name: '01-home' },
  { path: '/video', name: '02-video' },
  { path: '/live', name: '03-live' },
  { path: '/database', name: '04-database' },
  { path: '/emotion', name: '05-emotion' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

const issues = [];

for (const p of pages) {
  const url = `http://127.0.0.1:5173${p.path}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const res = await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const file = join(outDir, `${p.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const status = res?.status() ?? 0;
  const title = await page.title();
  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (status >= 400) issues.push(`${p.name}: HTTP ${status}`);
  if (errors.length) issues.push(`${p.name}: JS ${errors.join(' | ')}`);
  if (!bodyText || bodyText.length < 20) issues.push(`${p.name}: empty page`);
  console.log(`SHOT ${p.name} status=${status} title=${title} file=${file}`);
  page.removeAllListeners('pageerror');
}

await browser.close();
if (issues.length) {
  console.log('ISSUES');
  issues.forEach((i) => console.log(' - ' + i));
  process.exit(1);
}
console.log('ALL_PAGES_OK');
