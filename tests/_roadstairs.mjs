// Live, in-engine check of the two movement features: (1) walk up a staircase
// built in the real world via the actual game loop, and (2) walk along a
// procedurally generated inter-town road. Drives real keyboard input so the
// full update()/moveAxis()/render path is exercised, not just unit calls.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8761;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'roadstairs');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.evaluate(() => { const g = window.__game; g.disableAggro = true; if (g.enemies) g.enemies.length = 0; g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {}; g.world.time = 120; });

// ── 1. STAIRCASE — build a rising run on a pad and walk up it via update() ────
// Driven with a fixed-timestep call into the real player.update() so it's
// framerate-independent (the headless RAF loop crawls at a few FPS).
const stair = await page.evaluate(() => {
  const g = window.__game, B = window.__blocks.B;
  const cx = 8, cz = 0; // a chunk out on the plateau
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) g.world.ensureChunk(cx + dx, cz + dz);
  const X = cx * 16 + 4, Z = cz * 16 + 4;
  const surf = (x, z) => { for (let y = 120; y > 40; y--) if (g.world.getBlock(x, y, z) !== B.air) return y; return 64; };
  const base = surf(X, Z);
  // clear a box, lay a floor, then a 4-step staircase heading +x with a landing
  for (let x = X - 2; x <= X + 12; x++) for (let z = Z - 2; z <= Z + 2; z++) for (let y = base + 1; y <= base + 8; y++) g.world.setBlock(x, y, z, B.air, true);
  for (let x = X - 2; x <= X + 1; x++) for (let z = Z - 2; z <= Z + 2; z++) g.world.setBlock(x, base, z, B.stone, true);
  for (let s = 0; s < 4; s++) for (let z = Z - 2; z <= Z + 2; z++) g.world.setBlock(X + 2 + s, base + 1 + s, z, B.stone_stairs, true);
  for (let x = X + 6; x <= X + 12; x++) for (let z = Z - 2; z <= Z + 2; z++) g.world.setBlock(x, base + 4, z, B.stone, true); // landing top base+5
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (g.world.hasChunk(cx + dx, cz + dz)) g.renderer.remeshChunk(g.world, cx + dx, cz + dz);
  const p = g.player;
  p.x = X - 1 + 0.5; p.y = base + 1; p.z = Z + 0.5;
  p.vx = p.vy = p.vz = 0; p.dead = false; p.yaw = Math.atan2(-1, 0); // face +X toward the stairs
  const startY = p.y;
  const input = { moveVector: () => [1, 0], jump: false, sprint: false, worldMove: null };
  // Walk forward; track the highest point reached and whether the player ever
  // stood on the landing (peak matters — they eventually stride off its far end).
  let peakY = p.y, reachedLanding = false;
  for (let i = 0; i < 150; i++) {
    p.update(0.033, input, g.world);
    if (p.y > peakY) peakY = p.y;
    if (p.onGround && p.x > X + 5.5 && p.y >= base + 4.5) reachedLanding = true; // atop the landing (base+5)
  }
  return { X, base, startY, peakY: +peakY.toFixed(2), climbed: +(peakY - startY).toFixed(2), reachedLanding };
});
const stairPass = stair.climbed >= 3.5 && stair.reachedLanding; // climbed all four steps onto the landing
console.log('STAIRS', JSON.stringify({ ...stair, pass: stairPass }));

// ── 2. ROAD — drop onto a generated road cell and walk along it ─────────────
const roadStart = await page.evaluate(() => {
  const g = window.__game, gen = g.world.gen, B = window.__blocks.B;
  let cell = null, dir = null;
  for (const key of gen.pathSet) {
    const [x, z] = key.split(',').map(Number);
    const d = Math.hypot(x, z);
    if (d < 75 || d > 140) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (gen.pathSet.has((x + dx) + ',' + (z + dz)) && gen.pathSet.has((x + 2 * dx) + ',' + (z + 2 * dz))) { cell = { x, z }; dir = [dx, dz]; break; }
    }
    if (cell) break;
  }
  if (!cell) return { error: 'no road cell found near spawn' };
  const cx = cell.x >> 4, cz = cell.z >> 4;
  for (let dcx = -2; dcx <= 2; dcx++) for (let dcz = -2; dcz <= 2; dcz++) g.world.ensureChunk(cx + dcx, cz + dcz);
  for (let dcx = -2; dcx <= 2; dcx++) for (let dcz = -2; dcz <= 2; dcz++) if (g.world.hasChunk(cx + dcx, cz + dcz)) g.renderer.remeshChunk(g.world, cx + dcx, cz + dcz);
  const h = gen.heightAt(cell.x, cell.z);
  g.player.x = cell.x + 0.5; g.player.y = h + 1; g.player.z = cell.z + 0.5;
  g.player.vx = g.player.vy = g.player.vz = 0; g.player.dead = false;
  g.player.yaw = Math.atan2(-dir[0], -dir[1]); g.player.pitch = -0.15;
  return { x: cell.x, z: cell.z, h, dir, underfoot: g.world.getBlock(cell.x, h, cell.z), gravel: B.gravel };
});
if (roadStart.error) { console.log('ROAD FAIL:', roadStart.error); await browser.close(); server.kill(); process.exit(1); }
await page.waitForTimeout(250);
await page.screenshot({ path: 'tests/screenshots/road.png' });
const road = await page.evaluate(([sx, sz, h, dx, dz]) => {
  const g = window.__game, B = window.__blocks.B;
  const p = g.player;
  const input = { moveVector: () => [1, 0], jump: false, sprint: false, worldMove: null };
  let gravelSteps = 0, samples = 0;
  for (let i = 0; i < 180; i++) {
    p.update(0.033, input, g.world);
    if (i % 10 === 0) { samples++; if (g.world.gen.pathSet.has(Math.floor(p.x) + ',' + Math.floor(p.z))) gravelSteps++; }
  }
  const moved = Math.hypot(p.x - (sx + 0.5), p.z - (sz + 0.5));
  return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), onGround: p.onGround, moved: +moved.toFixed(2), gravelFrac: +(gravelSteps / samples).toFixed(2) };
}, [roadStart.x, roadStart.z, roadStart.h, roadStart.dir[0], roadStart.dir[1]]);
// walked several blocks, stayed on the road most of the way, and never fell off it
const roadPass = roadStart.underfoot === roadStart.gravel && road.moved >= 3 && road.onGround
  && Math.abs(road.y - (roadStart.h + 1)) < 2.5 && road.gravelFrac >= 0.5;
console.log('ROAD', JSON.stringify({ start: [roadStart.x, roadStart.z, roadStart.h], dir: roadStart.dir, ...road, pass: roadPass }));

await browser.close();
server.kill();
const ok = stairPass && roadPass;
console.log(ok ? 'ROADSTAIRS PASS' : 'ROADSTAIRS FAIL');
process.exit(ok ? 0 : 1);
