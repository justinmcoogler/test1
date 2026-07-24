// Renders a grid of mob thumbnails via renderer.renderMobThumb so the preview
// framing/brightness can be eyeballed across body types.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8754;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'thumbs');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

const missing = await page.evaluate(() => {
  const g = window.__game;
  const types = ['bear_bedrock', 'dragon', 'deer', 'raven', 'alligator', 'cow_2', 'fox', 'penguin', 'jellyfish', 'moose', 'boar_bedrock', 'crow'];
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#20242c;display:flex;flex-wrap:wrap;gap:8px;padding:16px;align-content:flex-start';
  document.body.appendChild(wrap);
  const miss = [];
  for (const t of types) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ok = g.renderer.renderMobThumb(t, c);
    if (!ok) miss.push(t);
    const cell = document.createElement('div');
    cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;color:#cbd3e0;font:11px monospace';
    const img = document.createElement('img'); img.src = c.toDataURL(); img.style.cssText = 'width:128px;height:128px;background:#161a20;border-radius:6px;image-rendering:pixelated';
    cell.appendChild(img); const lab = document.createElement('div'); lab.textContent = t; cell.appendChild(lab);
    wrap.appendChild(cell);
  }
  return miss;
});
console.log('missing models:', JSON.stringify(missing));
await page.waitForTimeout(400);
await page.screenshot({ path: 'tests/screenshots/mob-thumbs.png' });
console.log('shot mob-thumbs');
await browser.close();
server.kill();
