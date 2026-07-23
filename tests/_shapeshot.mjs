// Visual check of the new shape geometry: places stairs (4 facings), a connected
// wall, a fence+gate run, a glass-pane run, and a row of slabs on the plateau,
// then screenshots them.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8751;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));

await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'shapes');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

await page.evaluate(() => {
  const g = window.__game, B = window.__blocks.B;
  g.disableAggro = true;
  g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
  g.world.time = 100;
  for (let cx = -1; cx <= 3; cx++) for (let cz = -1; cz <= 3; cz++) g.world.ensureChunk(cx, cz);
  const S = (x, y, z, name, facing) => {
    g.world.setBlock(x, y, z, B[name], true);
    if (facing !== undefined) g.world.setFacing(x, y, z, facing);
  };
  const Y = 65;
  // clear a little platform of grass at Y-1 already exists (plateau at 64)
  // Row 1: stairs, all four facings
  S(10, Y, 8, 'stone_stairs', 0); S(12, Y, 8, 'stone_stairs', 1);
  S(14, Y, 8, 'stone_stairs', 2); S(16, Y, 8, 'stone_stairs', 3);
  // an ascending staircase
  for (let i = 0; i < 4; i++) S(20 + i, Y + i, 8, 'cobble_stairs', 3);
  // Row 2: connected wall with a corner
  for (let x = 10; x <= 15; x++) S(x, Y, 11, 'stone_brick_wall');
  S(15, Y, 12, 'stone_brick_wall'); S(15, Y, 13, 'stone_brick_wall');
  // Row 3: fence run with a gate in the middle
  for (let x = 10; x <= 16; x++) S(x, Y, 14, x === 13 ? 'planks_gate' : 'planks_fence', 1);
  // Row 4: glass pane run + a cross
  for (let x = 10; x <= 15; x++) S(x, Y, 17, 'glasspane_pane');
  S(13, Y, 16, 'glasspane_pane'); S(13, Y, 18, 'glasspane_pane');
  // Row 5: slabs of each material
  ['stone_slab', 'cobble_slab', 'stone_brick_slab', 'planks_slab', 'thatch_slab'].forEach((n, i) => S(10 + i * 2, Y, 20, n));
  // force remesh the area
  for (let cx = -1; cx <= 3; cx++) for (let cz = -1; cz <= 3; cz++) if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
});
await page.waitForTimeout(300);

async function shot(name, px, py, pz, yaw, pitch) {
  await page.evaluate(([px, py, pz, yaw, pitch]) => {
    const g = window.__game;
    g.player.x = px; g.player.y = py - 1.62; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = yaw; g.player.pitch = pitch; g.player.dead = false;
  }, [px, py, pz, yaw, pitch]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tests/screenshots/shapes-${name}.png` });
  console.log('shot', name);
}

try {
  await shot('overview', 13, 71, 26, Math.PI, -0.5);       // look N over all rows
  await shot('stairs', 13, 67.5, 12, Math.PI, -0.15);      // close on the stairs row
  await shot('fence-wall', 12, 67, 17, Math.PI, -0.12);    // wall + fence + gate
  await shot('panes', 12, 67, 20, Math.PI, -0.1);          // glass panes + slabs
} finally {
  await browser.close();
  server.kill();
}
