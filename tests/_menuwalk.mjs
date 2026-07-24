// Reproduces the "kept walking after closing a menu" bug: hold a movement key,
// open a menu (which drops control), release the key while the menu is up, then
// close it — the player must be stationary, not stuck walking.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8766;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'menuwalk');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1200);
await page.mouse.click(640, 400); // pointer-lock / focus

const pos = () => page.evaluate(() => { const p = window.__game.player; return [+p.x.toFixed(2), +p.z.toFixed(2)]; });

// 1) walk forward
const p0 = await pos();
await page.keyboard.down('KeyW');
await page.waitForTimeout(1400);
const p1 = await pos();
const walked = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);

// 2) open a menu (settings has focusable inputs — the classic keyup-eater)
await page.evaluate(() => window.__game.ui.toggleWindow('settings'));
await page.waitForTimeout(150);
const midMenu = await page.evaluate(() => ({
  enabled: window.__game.controls.enabled,
  keys: [...window.__game.controls.keys],
}));
// focus a settings input, THEN release W — the exact lost-keyup path
await page.evaluate(() => { const el = document.querySelector('#window-body input'); if (el) el.focus(); });
await page.keyboard.up('KeyW');
await page.waitForTimeout(100);

// 3) close the menu and check the player is NOT still walking
await page.evaluate(() => window.__game.ui.toggleWindow('settings'));
await page.waitForTimeout(150);
const p2 = await pos();
await page.waitForTimeout(1200);
const p3 = await pos();
const drift = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
const after = await page.evaluate(() => ({
  enabled: window.__game.controls.enabled,
  keys: [...window.__game.controls.keys],
  mv: window.__game.controls.moveVector(),
}));

console.log(JSON.stringify({ walked: +walked.toFixed(2), midMenu, drift: +drift.toFixed(2), after }, null, 2));
const pass = walked > 0.5              // walking worked
  && midMenu.keys.length === 0         // opening the menu dropped held keys
  && drift < 0.3                        // player stopped after closing
  && after.mv[0] === 0 && after.mv[1] === 0;
console.log(pass ? 'MENUWALK PASS' : 'MENUWALK FAIL');
await browser.close();
server.kill();
process.exit(pass ? 0 : 1);
