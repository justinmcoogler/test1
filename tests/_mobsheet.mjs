// Contact sheet of every imported mob model, rendered via renderMobThumb, so we
// can eyeball which are broken. Writes numbered sheets of 24 (6x4) at 150px.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8794;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'sheet');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1500); // let registerImportedMobs finish

const info = await page.evaluate(async () => {
  const mod = await import('/js/gfx/mobpack-imported.js');
  const rigMod = await import('/js/game/mobs-imported.js');
  const ids = Object.keys(mod.IMPORTED_MODELS);
  const rigs = rigMod.IMPORTED_RIGS || {};
  return { ids, rigs };
});
const ids = info.ids;
console.log('models:', ids.length);

const CELL = 150, COLS = 6, ROWS = 4, PER = COLS * ROWS, PAD = 18;
let sheetNum = 0;
for (let start = 0; start < ids.length; start += PER) {
  const batch = ids.slice(start, start + PER);
  await page.evaluate(async ({ batch, rigs, CELL, COLS, PAD }) => {
    const g = window.__game;
    const R = g.renderer;
    const { evaluatePose } = await import('/js/game/mobloader.js');
    document.getElementById('__sheet')?.remove();
    const rows = Math.ceil(batch.length / COLS);
    const sheet = document.createElement('canvas');
    sheet.id = '__sheet';
    sheet.width = COLS * (CELL + PAD) + PAD;
    sheet.height = rows * (CELL + 24 + PAD) + PAD;
    sheet.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(sheet);
    const sx = sheet.getContext('2d');
    sx.fillStyle = '#3a4048'; sx.fillRect(0, 0, sheet.width, sheet.height);
    sx.font = '11px monospace'; sx.textAlign = 'center';
    for (let i = 0; i < batch.length; i++) {
      const id = batch[i];
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = PAD + col * (CELL + PAD), y = PAD + row * (CELL + 24 + PAD);
      const tc = document.createElement('canvas'); tc.width = CELL; tc.height = CELL;
      const model = R.modelCache.get(id);
      const pose = model?.animated ? evaluatePose(model, 'idle', 0) : null;
      const ok = R.renderMobThumb(id, tc, 0.4, 0, pose);
      sx.fillStyle = '#20242a'; sx.fillRect(x, y, CELL, CELL);
      if (ok) sx.drawImage(tc, x, y);
      else { sx.fillStyle = '#c05'; sx.fillText('NO MODEL', x + CELL / 2, y + CELL / 2); }
      sx.fillStyle = '#ffd76a'; sx.fillText(`${rigs[id] || '?'}`, x + CELL / 2, y + CELL + 12);
      sx.fillStyle = '#cfcdc4';
      const short = id.length > 22 ? id.slice(0, 21) + '…' : id;
      sx.fillText(short, x + CELL / 2, y + CELL + 22);
    }
  }, { batch, rigs: info.rigs, CELL, COLS, PAD });
  await page.waitForTimeout(200);
  await page.locator('#__sheet').screenshot({ path: `tests/screenshots/mobsheet-${sheetNum}.png` });
  sheetNum++;
}
console.log('sheets written:', sheetNum);
await browser.close(); server.kill();
process.exit(0);
