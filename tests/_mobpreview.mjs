// Verifies the enlarged, drag-to-rotate mob preview in Settings → Admin: the
// expanded mob row shows a big model canvas that renders a non-blank model and
// visibly rotates when dragged (yaw changes + the rendered pixels change).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8764;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'preview');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1500);

await page.evaluate(() => window.__game.ui.toggleWindow('settings'));
await page.waitForSelector('#admin-enable', { timeout: 5000 });
await page.click('#admin-enable');
await page.waitForSelector('.admin-mob', { timeout: 5000 });
// expand a mob that has a real model (search a common one)
await page.fill('#admin-search', 'boar');
await page.waitForTimeout(150);
await page.click('.admin-mob .admin-caret');
await page.waitForSelector('.admin-preview', { timeout: 3000 });
await page.waitForTimeout(400); // let the first FBO render land

const size = await page.evaluate(() => {
  const c = document.querySelector('canvas.admin-preview');
  const rect = c.getBoundingClientRect();
  return { w: c.width, h: c.height, cssW: Math.round(rect.width), cssH: Math.round(rect.height) };
});
console.log('SIZE', JSON.stringify(size));

const sig = () => page.evaluate(() => {
  const c = document.querySelector('canvas.admin-preview');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let sum = 0, nonEmpty = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 12) nonEmpty++; sum = (sum + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + d[i + 3]) % 2147483647; }
  return { sum, nonEmpty };
});
const before = await sig();
const yaw0 = await page.evaluate(() => window.__game.ui._preview.yaw);
await page.screenshot({ path: 'tests/screenshots/mobpreview.png' });

// drag across the canvas to rotate
const box = await page.evaluate(() => { const r = document.querySelector('canvas.admin-preview').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(box.x, box.y);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + i * 12, box.y + i * 2); await page.waitForTimeout(20); }
await page.mouse.up();
await page.waitForTimeout(300);

const after = await sig();
const yaw1 = await page.evaluate(() => window.__game.ui._preview.yaw);
console.log('BEFORE', JSON.stringify(before), 'yaw', yaw0.toFixed(3));
console.log('AFTER ', JSON.stringify(after), 'yaw', yaw1.toFixed(3));

const bigger = size.w >= 240 && size.cssW >= 200;
const rendered = before.nonEmpty > 300; // the model actually drew
const rotated = Math.abs(yaw1 - yaw0) > 0.1 && after.sum !== before.sum;
const pass = bigger && rendered && rotated && errors.length === 0;
if (errors.length) { console.log('ERRORS:'); errors.forEach((e) => console.log('  •', e)); }
console.log(JSON.stringify({ bigger, rendered, rotated, pass }));
console.log(pass ? 'MOBPREVIEW PASS' : 'MOBPREVIEW FAIL');
await browser.close(); server.kill();
process.exit(pass ? 0 : 1);
