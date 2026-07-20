// Smoke test: boot the game headless, start a new world, verify rendering,
// movement, and no console errors. Saves a screenshot for visual review.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8741;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn', { timeout: 10000 });
  await page.fill('#seed-input', 'smoketest');
  await page.click('.slot-btn'); // slot 1 — new game
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(2500); // let chunks mesh & first frames render

  const state = await page.evaluate(() => {
    const g = window.__game;
    return {
      seed: g.world.seed,
      playerPos: [g.player.x, g.player.y, g.player.z].map((v) => +v.toFixed(1)),
      chunks: g.world.chunks.size,
      meshes: g.renderer.chunkMeshes.size,
      nodes: g.world.nodesById.size,
      enemies: g.enemyMgr.entities.size,
      npcs: g.world.structure.npcs.length,
      onGround: g.player.onGround,
    };
  });
  console.log('STATE', JSON.stringify(state, null, 2));

  // movement test: walk forward for 1.5s
  await page.mouse.click(640, 400); // pointer lock request (may fail headless, keys still work)
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW');
  const pos2 = await page.evaluate(() => [window.__game.player.x, window.__game.player.z].map((v) => +v.toFixed(2)));
  const moved = Math.hypot(pos2[0] - state.playerPos[0], pos2[1] - state.playerPos[2]);
  console.log('MOVED', moved.toFixed(2), 'blocks');

  await page.screenshot({ path: 'tests/screenshots/smoke.png' });

  let fail = false;
  if (errors.length) { console.log('CONSOLE ERRORS:'); errors.forEach((e) => console.log('  •', e)); fail = true; }
  if (state.meshes < 9) { console.log('FAIL: too few meshes', state.meshes); fail = true; }
  if (moved < 1) { console.log('FAIL: player did not move'); fail = true; }
  if (!state.onGround && state.playerPos[1] > 35) { console.log('FAIL: player floating at', state.playerPos[1]); fail = true; }
  console.log(fail ? 'SMOKE FAIL' : 'SMOKE PASS');
  process.exitCode = fail ? 1 : 0;
} catch (e) {
  console.error('SMOKE ERROR', e);
  if (errors.length) { console.log('CONSOLE ERRORS:'); errors.forEach((er) => console.log('  •', er)); }
  await page.screenshot({ path: 'tests/screenshots/smoke-error.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
