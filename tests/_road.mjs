// Live check that a generated inter-town road is traversable: drop the player
// onto a road cell and drive the real update() loop forward while jumping, so
// they hop the road's ≤1-block steps (there is no auto-step). Asserts real
// forward progress along the gravel lane, and grabs a screenshot.
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
await page.fill('#seed-input', 'roadwalk');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.evaluate(() => { const g = window.__game; g.disableAggro = true; if (g.enemies) g.enemies.length = 0; g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {}; g.world.time = 120; });

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

const road = await page.evaluate(([sx, sz, h]) => {
  const g = window.__game;
  const p = g.player;
  // forward + jump held: the player hops the road's one-block steps (no auto-step)
  const input = { moveVector: () => [1, 0], jump: true, sprint: false, worldMove: null };
  let stuckStreak = 0, maxStuck = 0, prevProg = 0;
  for (let i = 0; i < 200; i++) {
    p.update(0.033, input, g.world);
    const prog = Math.hypot(p.x - (sx + 0.5), p.z - (sz + 0.5));
    if (prog - prevProg < 0.002) { stuckStreak++; maxStuck = Math.max(maxStuck, stuckStreak); } else stuckStreak = 0;
    prevProg = prog;
  }
  const moved = Math.hypot(p.x - (sx + 0.5), p.z - (sz + 0.5));
  const onRoad = g.world.gen.pathSet.has(Math.floor(p.x) + ',' + Math.floor(p.z));
  return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), moved: +moved.toFixed(2), maxStuck, onRoad, fellY: +(p.y - (h + 1)).toFixed(2) };
}, [roadStart.x, roadStart.z, roadStart.h]);

// traversed a good distance, never got stuck at a step for long, didn't fall into a chasm
const pass = roadStart.underfoot === roadStart.gravel && road.moved >= 6 && road.maxStuck < 40 && road.fellY > -6;
console.log('ROAD', JSON.stringify({ start: [roadStart.x, roadStart.z, roadStart.h], dir: roadStart.dir, ...road, pass }));
await browser.close();
server.kill();
console.log(pass ? 'ROAD PASS' : 'ROAD FAIL');
process.exit(pass ? 0 : 1);
