// Visual check of trapdoor geometry: a closed bottom-half board, a closed
// top-half board, and open trapdoors swung vertical against each of the four
// walls. Screenshots them so open/closed + hinge direction can be eyeballed.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8752;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));

await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'trapdoors');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

const PLACE = await page.evaluate(() => {
  const g = window.__game, B = window.__blocks.B;
  g.disableAggro = true; g.entities = []; if (g.enemies) g.enemies.length = 0;
  g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
  g.world.time = 100;
  const X0 = 44, Z = 44, Y = 74; // a clean shelf floated well above the terrain, away from spawn
  for (let cx = 1; cx <= 4; cx++) for (let cz = 1; cz <= 4; cz++) g.world.ensureChunk(cx, cz);
  const S = (x, y, z, name, facing) => {
    g.world.setBlock(x, y, z, B[name], true);
    if (facing !== undefined) g.world.setFacing(x, y, z, facing);
  };
  const spots = [8 | 0/*open S*/, 8 | 1/*open E*/, 8 | 2/*open N*/, 8 | 3/*open W*/, 4/*closed top*/, 0/*closed bottom*/];
  // A broad shelf keeps the camera from falling; each trapdoor sits on a 1-block
  // pedestal so it stands proud of the floor, with a backdrop wall behind so the
  // open panels silhouette clearly.
  for (let x = X0 - 4; x <= X0 + 12; x++) for (let z = Z - 2; z <= Z + 6; z++) S(x, Y - 1, z, 'stone_brick');
  for (let i = 0; i < spots.length; i++) {
    const x = X0 + i * 2;
    S(x, Y, Z, 'stone');                            // pedestal
    S(x, Y + 1, Z, 'trapdoor', spots[i]);           // the trapdoor, raised one block
    S(x, Y, Z - 1, 'stone_brick'); S(x, Y + 1, Z - 1, 'stone_brick'); S(x, Y + 2, Z - 1, 'stone_brick'); // backdrop
  }
  for (let cx = 1; cx <= 4; cx++) for (let cz = 1; cz <= 4; cz++) if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
  const readback = spots.map((f, i) => { const x = X0 + i * 2; return { x, id: g.world.getBlock(x, Y, Z), f: g.world.facingAt(x, Y, Z) }; });
  return { X0, Z, Y, readback };
});
console.log('placed trapdoors:', JSON.stringify(PLACE.readback));
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
const cx = X0 + 5; // centre of the 6-wide row
try {
  await shot('trapdoors-overview', cx, Y + 1.62, Z + 6, 0, -0.2);
  await shot('trapdoors-close', X0 + 1, Y + 1.62, Z + 2.2, -0.12, -0.14);
} finally {
  await browser.close();
  server.kill();
}
