// Verifies adaptive resolution: the renderer lowers renderScale when frames are
// slow and raises it when there's headroom, and resize() honors the scale
// (smaller backing buffer). Pixel-art upscaling means the scene still renders.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8767;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'dynres');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(800);

const r = await page.evaluate(() => {
  const R = window.__game.renderer;
  R.dynamicResolution = true;
  // slow frames (~30fps) for >0.5s → should drop
  R.renderScale = 1; R._scaleAccum = 0; R._scaleFrames = 0; R._scaleCd = 0;
  for (let i = 0; i < 20; i++) R.adaptResolution(0.033);
  const afterSlow = R.renderScale;
  // fast frames (~125fps) for >0.5s with cooldown cleared → should rise
  R._scaleAccum = 0; R._scaleFrames = 0; R._scaleCd = 0;
  for (let i = 0; i < 80; i++) R.adaptResolution(0.008);
  const afterFast = R.renderScale;
  // resize honours the scale: shrink to 0.5 and check the backing buffer
  R.renderScale = 0.5; R.resize();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const expectW = Math.floor(R.canvas.clientWidth * dpr * 0.5);
  const gotW = R.canvas.width;
  // and disabling resets to full res
  const g = window.__game;
  g.settings.dynamicResolution = false; g.applySettings ? g.applySettings(g.settings) : (R.dynamicResolution = false, R.renderScale = 1, R.resize());
  const afterDisable = R.renderScale;
  return { afterSlow, afterFast, expectW, gotW, afterDisable, clientW: R.canvas.clientWidth };
});
console.log(JSON.stringify(r, null, 2));
// restore a mid scale for the screenshot
await page.evaluate(() => { const R = window.__game.renderer; R.renderScale = 0.6; R.resize(); });
await page.waitForTimeout(400);
await page.screenshot({ path: 'tests/screenshots/dynres.png' });

const pass = r.afterSlow < 1 && r.afterFast > r.afterSlow && Math.abs(r.gotW - r.expectW) <= 1 && r.afterDisable === 1;
console.log(pass ? 'DYNRES PASS' : 'DYNRES FAIL');
await browser.close(); server.kill();
process.exit(pass ? 0 : 1);
