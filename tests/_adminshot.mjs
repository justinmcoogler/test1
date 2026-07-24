// Boots the game, opens Settings → Admin/Debug, enables the tools, screenshots
// the mob panel, then toggles a mob active, expands it, edits a drop and clicks
// "Spawn 3 here" — asserting no console/page errors throughout.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8763;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'admin');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1500);

// open Settings via the UI
await page.evaluate(() => window.__game.ui.toggleWindow('settings'));
await page.waitForSelector('#admin-enable', { timeout: 5000 });
// enable debug tools
await page.click('#admin-enable');
await page.waitForSelector('.admin-mob', { timeout: 5000 });

const listInfo = await page.evaluate(() => ({
  rows: document.querySelectorAll('.admin-mob').length,
  search: !!document.querySelector('#admin-search'),
}));
console.log('ADMIN LIST', JSON.stringify(listInfo));

// search filter check
await page.fill('#admin-search', 'boar');
await page.waitForTimeout(200);
const filtered = await page.evaluate(() => [...document.querySelectorAll('.admin-mob-name')].map((e) => e.textContent.trim()));
console.log('FILTERED', JSON.stringify(filtered));
await page.fill('#admin-search', '');
await page.waitForTimeout(150);

// expand the first mob row, screenshot the full editor
await page.click('.admin-mob .admin-caret');
await page.waitForSelector('.admin-detail', { timeout: 3000 });
await page.waitForTimeout(200);
await page.screenshot({ path: 'tests/screenshots/admin.png' });
console.log('shot admin');

// controls present in the expanded editor?
const detail = await page.evaluate(() => {
  const m = document.querySelector('.admin-mob.open');
  return {
    type: m?.dataset.mob,
    hasRate: !!m.querySelector('.admin-rate'),
    chips: m.querySelectorAll('.admin-chip').length,
    drops: m.querySelectorAll('.admin-drop').length,
    hasSpawn: !!m.querySelector('[data-act=spawn]'),
    hasReset: !!m.querySelector('[data-act=reset]'),
  };
});
console.log('DETAIL', JSON.stringify(detail));

// toggle a mob active off then on, tweak rate + a biome chip, add/edit a drop
const before = await page.evaluate(() => window.__game.enemyMgr.entities.size);
await page.evaluate(() => {
  const m = document.querySelector('.admin-mob.open');
  m.querySelector('[data-act=active]').click();  // toggle off
  m.querySelector('[data-act=active]').click();  // back on
  const rate = m.querySelector('.admin-rate'); rate.value = '3'; rate.dispatchEvent(new Event('input', { bubbles: true }));
  m.querySelectorAll('.admin-chip')[1]?.click(); // pick a specific biome
  m.querySelector('[data-act=add-drop]').click();
});
await page.waitForTimeout(150);
// fill the newly added drop row
await page.evaluate(() => {
  const rows = document.querySelectorAll('.admin-mob.open .admin-drop');
  const r = rows[rows.length - 1];
  const item = r.querySelector('[data-f=item]'); item.value = 'coin'; item.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(150);

// click Spawn 3 here
await page.click('.admin-mob.open [data-act=spawn]');
await page.waitForTimeout(400);
const after = await page.evaluate(() => window.__game.enemyMgr.entities.size);
console.log('SPAWN entities', before, '->', after);

// read back the persisted override
const persisted = await page.evaluate(() => {
  const raw = localStorage.getItem('sproutlands.mobconfig');
  return raw ? JSON.parse(raw) : null;
});
console.log('PERSISTED', JSON.stringify(persisted));

let fail = false;
if (errors.length) { console.log('ERRORS:'); errors.forEach((e) => console.log('  •', e)); fail = true; }
if (listInfo.rows < 10) { console.log('FAIL: too few mob rows'); fail = true; }
if (!detail.hasRate || !detail.chips || !detail.drops || !detail.hasSpawn) { console.log('FAIL: editor controls missing'); fail = true; }
if (after <= before) { console.log('FAIL: spawn button added no entities'); fail = true; }
if (!persisted) { console.log('FAIL: config not persisted'); fail = true; }
console.log(fail ? 'ADMIN FAIL' : 'ADMIN PASS');
process.exitCode = fail ? 1 : 0;
await browser.close(); server.kill();
