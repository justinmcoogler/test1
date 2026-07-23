// Visual check of the starter manor west of town. yaw convention:
// forward = (-sin yaw, cos yaw); yaw=π looks -Z(N), +π/2 looks -X(W), -π/2 looks +X(E).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8747;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function shot(name, px, py, pz, yaw, pitch) {
  await page.evaluate(async ([px, py, pz, yaw, pitch]) => {
    const g = window.__game;
    // ensure a generous box around BOTH the camera and the manor (-60,0) so
    // every manor chunk and its meshing neighbors are present
    const ensureBox = (bx, bz, r) => {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        g.world.ensureChunk(Math.floor(bx / 16) + dx, Math.floor(bz / 16) + dz);
      }
    };
    ensureBox(px, pz, 8); ensureBox(-60, 0, 5);
    g.player.x = px; g.player.y = py - 1.62; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = yaw; g.player.pitch = pitch; g.player.dead = false;
    g.world.dirtyChunks.clear();
    // unconditionally (re)mesh the manor box + a wide camera box — the neighbor
    // guard used in gameplay silently skips edge chunks, so don't gate on it here
    const mesh = (bx, bz, r) => {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        const cx = Math.floor(bx / 16) + dx, cz = Math.floor(bz / 16) + dz;
        if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
      }
    };
    mesh(-60, 0, 4); mesh(px, pz, 7);
  }, [px, py, pz, yaw, pitch]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `tests/screenshots/manor-${name}.png` });
  console.log('shot', name);
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'manor');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => {
    const g = window.__game;
    g.disableAggro = true;
    // freeze clear weather at noon so nothing fogs the shot
    g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
    g.world.time = 100; // dayPhase ~0.21 → full daylight
  });
  await page.waitForTimeout(1200);

  await shot('approach', -30, 70, 0, Math.PI / 2, -0.16);    // stand E of manor, look W at the entrance face
  await shot('aerial-se', -25, 95, 40, 2.42, -0.41);         // 3/4 aerial from the south-east
  await shot('aerial-s', -60, 100, 52, Math.PI, -0.62);      // high, from the south looking N
  await shot('south', -60, 78, 40, Math.PI, -0.34);          // south elevation, full height
  await shot('lane', -18, 67, 0.5, Math.PI / 2, -0.05);      // the gravel lane from town, looking W
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' •', e)); }
} finally {
  await browser.close();
  server.kill();
}
