// Blow up a handful of atlas tiles so the pixel art can actually be looked at.
//
//   node tests/_tileshot.mjs wheat_1 crop_ripe reed reed_top
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const names = process.argv.slice(2);
if (!names.length) { console.error('usage: node tests/_tileshot.mjs <tile> [tile...]'); process.exit(1); }

const PORT = 8796;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 340 } });

try {
  await mkdir('tests/screenshots', { recursive: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.evaluate(async () => { window.__tex = await import('./js/gfx/textures.js'); });
  await page.evaluate((tiles) => {
    document.body.innerHTML = '';
    document.body.style.cssText = 'background:#20242a;margin:0;padding:8px;display:flex;gap:8px;font:12px monospace;color:#ddd';
    const atlas = window.__tex.getAtlasCanvas();
    const uv = window.__tex.tileUV;
    const T = window.__tex.TILE, C = window.__tex.ATLAS_COLS, R = window.__tex.ATLAS_ROWS;
    for (const name of tiles) {
      const u = uv[name];
      const wrap = document.createElement('div');
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      // a mid grey behind it, so transparent pixels are obvious
      g.fillStyle = '#4a4f57'; g.fillRect(0, 0, 256, 256);
      const col = Math.round(u.u0 * C - 0.01), row = Math.round(u.v0 * R - 0.01);
      g.drawImage(atlas, col * T, row * T, T, T, 0, 0, 256, 256);
      wrap.appendChild(c);
      wrap.appendChild(Object.assign(document.createElement('div'), { textContent: name }));
      document.body.appendChild(wrap);
    }
  }, names);
  await page.waitForTimeout(300);
  const out = `tests/screenshots/tiles-${names[0]}.png`;
  await page.screenshot({ path: out, fullPage: true });
  console.log('wrote', out);
} catch (e) {
  console.error('TILESHOT ERROR', e);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
