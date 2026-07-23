import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8757;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'socket');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.evaluate(() => {
  const g = window.__game, inv = g.inventory;
  // give a spread of weapons + gems, socket each with a different gem
  const pairs = [['bronze_sword','ruby'],['bronze_helmet','ruby'],['bronze_chestplate','sapphire'],['bronze_leggings','emerald'],['hide_boots','topaz'],['timber_shield','diamond']];
  for (const [w,gm] of pairs) { inv.add(w); inv.add(gm); const i = inv.slots.findIndex(s=>s&&s.item===w); inv.socketGem(i, gm); }
  // also leave one un-socketed weapon + loose gems so the socket UI shows
  inv.add('bronze_helmet'); inv.add('garnet'); inv.add('quartz'); inv.add('diamond');
  g.ui.toggleWindow('inventory');
  // select the un-socketed weapon so its socket buttons show
  const wi = inv.slots.findIndex(s=>s&&s.item==='bronze_helmet');
  g.ui.selectedInvSlot = wi; g.ui.renderWindowBody();
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'tests/screenshots/sockets.png' });
console.log('shot sockets');
await browser.close(); server.kill();
