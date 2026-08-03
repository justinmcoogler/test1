// Photograph a creature at four points through its stride, and measure that the
// leg positions actually differ.
//
//   node tests/_gaitshots.mjs [type]
//
// A pose test proves the maths; only a picture proves the walk. This walks one
// creature past the camera and takes a frame every quarter stride.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const TYPE = process.argv[2] || 'cow';
const PORT = 8794;
const OUT = 'tests/screenshots';

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await mkdir(OUT, { recursive: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'gait');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => { window.__game.ui.closeWindow(); });
  await page.addStyleTag({ content: '#hud{display:none!important}' });

  const info = await page.evaluate((type) => {
    const g = window.__game;
    // surfaceAt is the top SOLID block; a creature stands on the air above it
    const y = g.world.surfaceAt(Math.floor(g.player.x) + 6, Math.floor(g.player.z)) + 1;
    const e = {
      id: 'gait_subject', type, def: window.__enemies.ENEMY_TYPES[type],
      x: g.player.x + 6, y, z: g.player.z + 2, homeX: g.player.x + 6, homeZ: g.player.z + 2,
      yaw: Math.PI / 2, hp: 20, transient: true,
    };
    g.enemyMgr.entities.set(e.id, e);
    // stand square on, a few paces back, looking at where it will pass
    g.player.x = e.x - 1; g.player.z = e.z - 5; g.player.y = y + 1;
    g.player.yaw = Math.PI; g.player.pitch = -0.06;
    g.camYaw = Math.PI;
    g.world.time = 120;
    return { y };
  }, TYPE);

  // Nudge it sideways past the camera a fixed distance per frame and shoot at
  // four points through one stride.
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const seen = await page.evaluate(([step]) => {
      const g = window.__game;
      const e = g.enemyMgr.entities.get('gait_subject');
      for (let k = 0; k < 6; k++) { e.x += step / 6; e.movingT = 0.25; }
      const model = g.renderer.modelCache.get(e.type);
      const pose = g.poseFor(e, model, 1 / 60);
      // legs where there are legs; for a legless rig (a rabbit bounds on its
      // whole body) the body IS the motion, so watch that instead
      const ids = Object.keys(pose || {});
      const part = ids.find((id) => /^leg/.test(id)) || ids.find((id) => id === 'body');
      return part ? [...pose[part]].slice(0, 14).map((v) => +v.toFixed(4)) : null;
    }, [1.15 / 4]);
    legs.push(seen);
    await page.waitForTimeout(220);
    await page.screenshot({ path: `${OUT}/gait-${TYPE}-${i + 1}.png` });
  }

  const distinct = new Set(legs.map((l) => JSON.stringify(l)));
  console.log(`${TYPE}: ${distinct.size} distinct leg poses across one stride`
    + (distinct.size >= 3 ? ' — it is walking' : ' — SOMETHING IS STILL'));
  console.log(errors.length ? `console errors: ${errors.slice(0, 3).join(' | ')}` : 'no console errors');
} catch (err) {
  console.error('SHOTS ERROR', err);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
