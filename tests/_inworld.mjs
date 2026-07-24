// In-world check: spawn a few previously-broken imported mobs near the player
// and screenshot — validates the live entity path (pose + rig + rotations).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8795;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'inworld');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1500); // let imported mobs register

const ok = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player;
  const types = ['moose_bedrock', 'vulture', 'cardinal', 'seal_leopard', 'fox'];
  let i = 0, spawned = 0;
  for (const t of types) {
    const e = g.spawnMobNear(t);
    if (e) { e.x = p.x + (i - 2) * 2.2; e.z = p.z - 5; e.y = g.world.groundNear(Math.floor(e.x), Math.floor(e.z), p.y) ?? p.y; spawned++; }
    i++;
  }
  p.yaw = 0; p.pitch = -0.05; // face them (yaw 0 → -Z)
  return spawned;
});
console.log('spawned:', ok);
await page.waitForTimeout(600);
await page.screenshot({ path: 'tests/screenshots/inworld-mobs.png' });
await browser.close(); server.kill();
process.exit(0);
