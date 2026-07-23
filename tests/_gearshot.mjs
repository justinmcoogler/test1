// Screenshot the adventurer wearing gear: proves armour + held weapon/shield
// render on the player model (js/gfx/playerskin.js).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8759;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'gear');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const g = window.__game, inv = g.inventory;
  const gear = ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'hide_boots', 'iron_sword', 'iron_shield'];
  for (const it of gear) { inv.add(it); const i = inv.slots.findIndex((s) => s && s.item === it); inv.equipFromSlot(i); }
  g.registerPlayerModel();
  g.disableAggro = true;
  g.settings.classicCamera = true;      // third-person orbit shows the body
  g.applySettings();
  g.camYaw = g.player.yaw + Math.PI;     // look at the front of the character
  g.camPitch = 0.35;
});
await page.waitForTimeout(900);
await page.screenshot({ path: 'tests/screenshots/gear.png' });
console.log('shot gear');
await browser.close(); server.kill();
