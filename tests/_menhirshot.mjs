// Does a waystone READ as a waystone from the road?
//
// The unit tests assert the menhir's anatomy — three-wide base, one-wide shaft, a
// taper between them, banded courses, a light. That is the recipe, not the
// result. The only way to answer "does it look like a standing stone" is to walk
// back down the road to the distance you actually first see one from, and look.
// The existing harness shoots it from the foot of the stone with the camera
// pitched up, which shows the texture and hides the silhouette.
//
//   node tests/_menhirshot.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { World } from '../js/world/world.js';
import { hashSeed } from '../js/core/rng.js';
import { roadsFor, PRIMARIES } from '../js/world/roads.js';
import { waystoneOf, waystoneLanding } from '../js/game/waystones.js';

const SEED_TEXT = 'waystone';
const PORT = 8749;
const OUT = 'tests/screenshots';

// Find a few stones and, for each, a spot back along the road to view it from.
const w = new World(hashSeed(SEED_TEXT));
const roads = roadsFor(w.gen);
// Prefer stones standing on OPEN ground. A stone in a road cutting is hidden
// behind the crest from any distance, which says something about that stretch of
// terrain and nothing about the stone, so it makes a useless portrait.
const shots = [];
const cands = [];
for (let d = 0; d < PRIMARIES; d++) {
  for (let n = 1; n <= 3; n++) {
    const c = roads.waystoneColumn(w.gen, d, n, new Int32Array(2));
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) w.ensureChunk((c[0] >> 4) + dx, (c[1] >> 4) + dz);
    const ws = waystoneOf(w, d, n);
    if (!ws) continue;
    const land = waystoneLanding(w, ws);
    const s = roads.along(w.gen, d, land[0], land[1]);
    // How much the road climbs behind the viewpoint — the thing that buries it.
    const back = 16;
    const col = roads.column(w.gen, d, s - back, 0, new Int32Array(2));
    let rise = 0;
    for (let k = 1; k < back; k++) {
      const m = roads.column(w.gen, d, s - k, 0, new Int32Array(2));
      rise = Math.max(rise, w.gen.heightAt(m[0], m[1]) - w.gen.heightAt(land[0], land[1]));
    }
    cands.push({ d, n, name: ws.name, back, rise, from: [col[0], col[1]], at: [ws.x, ws.z] });
  }
}
cands.sort((a, b) => a.rise - b.rise);
shots.push(...cands.slice(0, 3));
if (!shots.length) { console.error('no waystones on this seed'); process.exit(1); }

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', SEED_TEXT);
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => {
    window.__game.disableAggro = true;
    window.__game.settings.classicCamera = false;
    window.__game.applySettings();
  });
  await page.waitForTimeout(900);
  // Hide the HUD: this is a portrait of the stone, and the hotbar sits exactly
  // where its base is.
  await page.addStyleTag({ content: '#hud, #toasts, #minimap-wrap { display: none !important; }' });

  for (const s of shots) {
    await page.evaluate(async ([fx, fz, ax, az]) => {
      const g = window.__game, CH = 16;
      // Load a wide halo: the stone has to be MESHED at viewing distance, which
      // is the whole point of standing back from it.
      for (const [px, pz] of [[fx, fz], [ax, az]]) {
        for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
          g.world.ensureChunk(Math.floor(px / CH) + dx, Math.floor(pz / CH) + dz);
        }
      }
      const gy = g.world.surfaceAt(Math.floor(fx), Math.floor(fz)) + 1;
      g.player.respawnAt(fx + 0.5, gy, fz + 0.5);
      g.player.vx = g.player.vy = g.player.vz = 0;
      for (const key of [...g.world.dirtyChunks]) {
        const [cx, cz] = key.split(',').map(Number);
        g.world.dirtyChunks.delete(key);
        if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
      }
      for (const [px, pz] of [[fx, fz], [ax, az]]) {
        for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
          const cx = Math.floor(px / CH) + dx, cz = Math.floor(pz / CH) + dz;
          if (!g.renderer.hasMesh(cx, cz) && g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
        }
      }
      g.player.yaw = Math.atan2(-(ax + 0.5 - g.player.x), -(az + 0.5 - g.player.z));
      g.player.pitch = 0.08;   // eye level, not craning up at it
    }, [s.from[0], s.from[1], s.at[0], s.at[1]]);
    await page.waitForTimeout(900);
    const file = `${OUT}/menhir-${s.d}-${s.n}.png`;
    await page.screenshot({ path: file });
    console.log(`  ${file}  — ${s.name}, ${s.back} blocks back down the road (rise behind ${s.rise})`);
  }
  if (errors.length) { console.log('\npage errors:'); for (const e of errors.slice(0, 5)) console.log('  ' + e); }
  console.log(errors.length ? '\nDONE (with page errors)' : '\nDONE — no page errors');
} finally {
  await browser.close();
  server.kill();
}
