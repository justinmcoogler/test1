// Boots the game and photographs the new Brookhollow village: an aerial 3/4 of
// the plaza + houses, and a ground-level shot from spawn.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8765;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'brookhollow');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1200);

// clear weather, midday, load + mesh the town chunks
await page.evaluate(() => {
  const g = window.__game;
  g.disableAggro = true; if (g.enemies) g.enemies.length = 0;
  g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
  g.world.time = 130;
  for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) g.world.ensureChunk(cx, cz);
  for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
});

// aerial 3/4 looking down at the plaza
await page.evaluate(() => {
  const g = window.__game, p = g.player;
  p.x = 34; p.y = 96; p.z = 34; p.vx = p.vy = p.vz = 0; p.dead = true; // dead = frozen, no physics
  p.yaw = Math.atan2(-(-34), -(-34)); // look toward origin (-x,-z)
  p.pitch = -0.72;
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/screenshots/town-aerial.png' });

// ground-level from just south of the plaza looking north into the village
await page.evaluate(() => {
  const g = window.__game, p = g.player;
  p.x = 0; p.y = 66; p.z = 20; p.vx = p.vy = p.vz = 0; p.dead = true;
  p.yaw = Math.PI; // face +Z? we want to look -Z (north) toward houses at z<0
  p.yaw = 0;       // yaw 0 looks -Z
  p.pitch = -0.05;
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'tests/screenshots/town-ground.png' });
console.log('shots: town-aerial, town-ground');
await browser.close();
server.kill();
