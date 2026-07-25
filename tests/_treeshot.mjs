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
  await page.screenshot({ path: `tests/screenshots/tree-chk-${name}.png` });
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

  // Tree + cave-mouth verification: find real trees and a real cave mouth in
  // the generated world, then stand back and look at them.
  const targets = await page.evaluate(() => {
    const g = window.__game;
    const found = { trees: [], cave: null };
    for (let cx = -12; cx <= 12; cx++) for (let cz = -12; cz <= 12; cz++) {
      const ch = g.world.ensureChunk(cx, cz);
      if (!ch) continue;
      for (const n of ch.nodes) {
        if (n.def && n.def.kind === 'tree' && found.trees.length < 40) {
          found.trees.push({ t: n.type, x: n.x, y: n.y, z: n.z });
        }
      }
    }
    return found;
  });
  // Only trees standing clear of their neighbours can actually be photographed:
  // in a closed-canopy forest any camera 20 blocks out is inside another tree.
  const clear = targets.trees.filter((t) => !targets.trees.some((o) =>
    o !== t && Math.abs(o.x - t.x) < 9 && Math.abs(o.z - t.z) < 9));
  console.log(`isolated trees: ${clear.length} of ${targets.trees.length}`);
  const seen = new Set();
  let i = 0;
  for (const t of clear) {
    if (seen.has(t.t)) continue;
    seen.add(t.t);
    if (++i > 8) break;
    // above the crown, looking down at ~25 degrees from 20 blocks out
    await shot(`tree-${t.t}`, t.x + 14, t.y + 15, t.z + 14, Math.PI * 1.25, -0.42);
  }
  console.log('species shot:', [...seen].join(', '));
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' •', e)); }
} finally {
  await browser.close();
  server.kill();
}
