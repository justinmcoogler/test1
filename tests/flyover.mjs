// Visual verification: screenshots of key locations for manual review.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8743;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function shot(name, px, py, pz, yaw, pitch, freeCam = true) {
  await page.evaluate(async ([px, py, pz, yaw, pitch, freeCam]) => {
    const g = window.__game;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      g.world.ensureChunk(Math.floor(px / 16) + dx, Math.floor(pz / 16) + dz);
    }
    g.player.x = px; g.player.y = py - 1.62; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = yaw; g.player.pitch = pitch;
    if (freeCam) g.player.dead = false;
    // force-mesh everything nearby
    for (const key of [...g.world.dirtyChunks]) {
      const [cx, cz] = key.split(',').map(Number);
      g.world.dirtyChunks.delete(key);
      if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
    }
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const cx = Math.floor(px / 16) + dx, cz = Math.floor(pz / 16) + dz;
      if (!g.renderer.hasMesh(cx, cz) && g.world.hasChunk(cx, cz) &&
          g.world.hasChunk(cx - 1, cz) && g.world.hasChunk(cx + 1, cz) &&
          g.world.hasChunk(cx, cz - 1) && g.world.hasChunk(cx, cz + 1)) {
        g.renderer.remeshChunk(g.world, cx, cz);
      }
    }
  }, [px, py, pz, yaw, pitch, freeCam]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `tests/screenshots/fly-${name}.png` });
  console.log('shot', name);
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'flyover');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => { window.__game.disableAggro = true; });
  await page.waitForTimeout(1200);

  // gravity off for aerial shots: keep re-setting position (dead flag not used)
  await shot('settlement-air', 0, 55, 34, Math.PI, -0.75);       // above, looking north over village
  await shot('square', 4, 33, 4, Math.PI * 0.75, -0.1);          // village square
  await shot('cottage', -6, 33, -2, Math.PI * 0.72, -0.05);      // cottage + Maren
  await shot('workshop', 6, 33, -11, -Math.PI / 2, -0.08);       // workshop pavilion
  await shot('pond', 4, 33, 12, Math.PI, -0.25);                 // fishing pond
  await shot('minemouth', 24.5, 33, -18, Math.PI, -0.12);        // mine arch
  await shot('mineshaft', 24.5, 27, -30, Math.PI, -0.35);        // stairway down
  await shot('orechamber', 24.5, 21, -45, Math.PI, -0.1);        // ore chamber
  await shot('bosshall', 24.5, 15.5, -71, Math.PI, -0.05);       // boss hall + golem
  await shot('wilds', 120, 48, 120, Math.PI * 0.25, -0.3);       // wilderness terrain
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' •', e)); }
} finally {
  await browser.close();
  server.kill();
}
