// Every creature's thumbnail, and optionally its raw skin sheet, composited into
// one PNG so a whole-roster art pass can be judged in a single look.
//
//   node tests/_mobgrid.mjs <out.png> [skins]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [out = 'tests/screenshots/mobgrid.png', mode = 'model'] = process.argv.slice(2);
const PORT = 8806;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'mobgrid');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1400);

  const png = await page.evaluate(async ([wantSkins]) => {
    const g = window.__game;
    // The REST pose, not the string 'idle'. renderMobThumb takes a pose object;
    // handing it a name silently renders every part at identity, which hides any
    // rest rotation a model carries (a folded wing looks like a plank).
    const { evaluatePose } = await import('/js/game/mobloader.js');
    const ids = Object.keys(window.__enemies.ENEMY_TYPES);
    const CELL = 160, COLS = 6, PAD = 18, LABEL = 14;
    const rows = Math.ceil(ids.length / COLS);
    const sheet = document.createElement('canvas');
    sheet.width = COLS * CELL;
    sheet.height = rows * (CELL + LABEL);
    const s = sheet.getContext('2d');
    s.imageSmoothingEnabled = false;
    s.fillStyle = '#3b4038';                    // mid grey-green: fair to light and dark skins
    s.fillRect(0, 0, sheet.width, sheet.height);
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = 256;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const cx = (i % COLS) * CELL, cy = Math.floor(i / COLS) * (CELL + LABEL);
      s.fillStyle = (i % 2) ? '#434840' : '#3f443c';
      s.fillRect(cx, cy, CELL, CELL + LABEL);
      if (wantSkins) {
        // The raw painted skin, nearest-scaled — for judging the texture itself.
        const def = window.__remakes?.[id];
        const tex = def && window.__paintSkin ? window.__paintSkin(id, def) : null;
        if (tex) s.drawImage(tex, 0, 0, tex.width, tex.height, cx + PAD, cy + PAD, CELL - PAD * 2, CELL - PAD * 2);
      } else {
        const model = g.renderer.modelCache.get(id);
        const pose = model?.animated ? evaluatePose(model, 'idle', 0) : null;
        if (g.renderer.renderMobThumb(id, tmp, 0.72, 0.24, pose)) {
          s.drawImage(tmp, cx + 6, cy + 2, CELL - 12, CELL - 12);
        }
      }
      s.fillStyle = '#dfe4d8';
      s.font = '11px monospace';
      s.fillText(id.slice(0, 22), cx + 6, cy + CELL + 10);
    }
    return sheet.toDataURL('image/png');
  }, [mode === 'skins']);

  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`wrote ${out}`);
  if (errors.length) { console.log('ERRORS:'); errors.slice(0, 6).forEach((e) => console.log('  •', e)); }
} catch (e) {
  console.error('MOBGRID ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
