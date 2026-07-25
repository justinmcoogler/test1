// Photographs Brookhollow. The town was rebuilt around a funnel market with the
// kirk and moot hall at the high (north) end, so these cameras replace the old
// set, which pointed at ground the town no longer occupies.
//
// Yaw convention, since it is easy to get backwards: yaw 0 faces NORTH (-z),
// yaw PI faces SOUTH. The town runs from the moot hall at z=-27 down to the wide
// market mouth at z=+10, across x=-30..25. Fog swallows anything much past 60
// blocks, so the aerials sit close in rather than high and far out.
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
  await page.screenshot({ path: `tests/screenshots/town2-${name}.png` });
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

  // yaw 0 = north (-z). The town runs from the kirk/moot at z=-27 down to the
  // wide market mouth at z=+10; x spans -30..25.
  await shot('bridge2',        4,  70, 1442, 0,            -0.14);  // deck, continuous rails, no dirt
  await shot('bridge2-obl',   14,  78, 1462, Math.PI * 1.7, -0.30);
  await shot('fork',          -2,  96, -430, 0,            -0.55);  // a lane forking off an arterial
  await shot('trail',        320,  74,  -14, Math.PI * 1.5, -0.16);  // a worn trail off the road
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' •', e)); }
} finally {
  await browser.close();
  server.kill();
}
