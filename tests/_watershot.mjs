// Visual check of flowing water: a source dropped at one end of a walled stone
// trough should spread to fill it (and pour over a lip into a lower basin,
// connecting the two). Screenshots after the sim settles.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8753;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));

await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'water');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

const PLACE = await page.evaluate(() => {
  const g = window.__game, B = window.__blocks.B;
  g.disableAggro = true; if (g.enemies) g.enemies.length = 0;
  g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
  g.world.time = 100;
  const CR = 7; // build far from spawn so the camera stands on natural ground
  for (let cx = CR - 2; cx <= CR + 3; cx++) for (let cz = CR - 2; cz <= CR + 3; cz++) g.world.ensureChunk(cx, cz);
  const S = (x, y, z, name) => g.world.setBlock(x, y, z, B[name], true);
  const surf = (x, z) => { for (let y = 100; y > 40; y--) if (g.world.getBlock(x, y, z) !== B.air) return y; return 62; };
  const X0 = CR * 16 + 4, Z = CR * 16 + 4;
  const Y = surf(X0 + 4, Z + 2) + 1;         // pool water level = one above the ground
  // flatten a standing patch + pool floor at Y-1, then a 1-block rim around a
  // 10×5 pool so the water is held in a clear rectangle.
  for (let x = X0 - 3; x <= X0 + 13; x++) for (let z = Z - 3; z <= Z + 9; z++) S(x, Y - 1, z, 'stone_brick');
  for (let x = X0 - 1; x <= X0 + 10; x++) { S(x, Y, Z - 1, 'stone_brick'); S(x, Y, Z + 5, 'stone_brick'); }
  for (let z = Z - 1; z <= Z + 5; z++) { S(X0 - 1, Y, z, 'stone_brick'); S(X0 + 10, Y, z, 'stone_brick'); }
  S(X0 + 5, Y, Z + 2, 'water');              // one source, centred, fills the whole pool
  for (let i = 0; i < 90; i++) g.world.update(0.12);
  for (let cx = CR - 2; cx <= CR + 3; cx++) for (let cz = CR - 2; cz <= CR + 3; cz++) if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
  let filled = 0; for (let x = X0; x <= X0 + 9; x++) for (let z = Z; z <= Z + 4; z++) if (g.world.getBlock(x, Y, z) === B.water) filled++;
  return { X0, Z, Y, filled };
});
console.log('pool water cells filled (of 50):', PLACE.filled);
await page.waitForTimeout(300);

async function shot(name, px, py, pz, yaw, pitch) {
  await page.evaluate(([px, py, pz, yaw, pitch]) => {
    const g = window.__game;
    g.player.x = px; g.player.y = py - 1.62; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = yaw; g.player.pitch = pitch; g.player.dead = false;
  }, [px, py, pz, yaw, pitch]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tests/screenshots/${name}.png` });
  console.log('shot', name);
}

const { X0, Z, Y } = PLACE;
try {
  await shot('water-flow', X0 + 5, Y + 1.62, Z + 8, 0, -0.42);
} finally {
  await browser.close();
  server.kill();
}
