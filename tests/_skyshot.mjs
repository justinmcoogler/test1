// Portrait of the sky archipelago. The unit tests assert the anatomy — surface
// on top, air under the keel, bands that clear each other — but "does a floating
// island read as a floating island" is only answerable by looking up at one.
//
//   node tests/_skyshot.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { World } from '../js/world/world.js';
import { hashSeed } from '../js/core/rng.js';
import { allIslands } from '../js/world/sky.js';
import { allUndercities } from '../js/world/undercity.js';

const SEED_TEXT = 'skyward';
const PORT = 8771;
const OUT = 'tests/screenshots';

const w = new World(hashSeed(SEED_TEXT));
const isles = allIslands(w.gen, 5);
// One shot per band, from below and off to the side, looking up.
const shots = [];
for (const ring of [1, 2, 3]) {
  const s = isles.find((s) => s.ring === ring);
  if (!s) continue;
  const is = s.isles[0];
  const back = Math.round(is.r * 1.9 + 26);
  shots.push({ ring, name: `ring${ring}`, from: [is.cx + back, is.cz + back], at: [is.cx, is.y, is.cz] });
}
// …and one framing a BRIDGE: stand off to the side of the span's midpoint so
// both islands and the deck between them are in shot.
const bridged = isles.find((s) => s.bridges.length);
if (bridged) {
  const br = bridged.bridges[0];
  const mx = (br.x0 + br.x1) / 2, mz = (br.z0 + br.z1) / 2;
  const perp = Math.atan2(br.x1 - br.x0, -(br.z1 - br.z0));
  const off = Math.hypot(br.x1 - br.x0, br.z1 - br.z0) * 1.1 + 40;
  shots.push({ ring: bridged.ring, name: 'bridge',
    from: [Math.round(mx + Math.cos(perp) * off), Math.round(mz + Math.sin(perp) * off)],
    at: [Math.round(mx), br.y, Math.round(mz)] });
}
// …and the underground city: stand on the terrace looking down over the plaza.
const city = allUndercities(w.gen, 3)[0];
if (city) {
  shots.push({ ring: city.ring, name: 'undercity',
    from: [city.x + Math.round(city.rxr * 0.62), city.z + Math.round(city.rzr * 0.42)],
    at: [city.x, city.floor + 3, city.z], indoor: true, eye: city.floor + 15 });
}
if (!shots.length) { console.error('nothing to shoot on this seed'); process.exit(1); }

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
    // An island is bigger than the default 5-chunk view and sits beyond its fog,
    // so it is literally not drawn at portrait range. Push both out.
    window.__game.renderer.renderDistance = 14;
  });
  await page.waitForTimeout(900);
  await page.addStyleTag({ content: '#hud, #toasts, #minimap-wrap { display: none !important; }' });

  for (const s of shots) {
    await page.evaluate(async ([fx, fz, ax, ay, az, r, eye]) => {
      const g = window.__game, CH = 16;
      // A wide halo, and MESHED — an island only exists on screen once its
      // chunks are meshed, and it spans a lot of them.
      const R = 9;
      for (const [px, pz] of [[fx, fz], [ax, az]]) {
        for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
          g.world.ensureChunk(Math.floor(px / CH) + dx, Math.floor(pz / CH) + dz);
        }
      }
      // Stand the player in the air at island height so the island is not a
      // speck on the horizon — this is a portrait, not a gameplay shot.
      g.player.respawnAt(fx + 0.5, eye != null ? eye : ay - 4, fz + 0.5);
      g.player.vx = g.player.vy = g.player.vz = 0;
      g.player.debug = true;              // creative flight: no gravity, no collision
      for (const key of [...g.world.dirtyChunks]) {
        const [cx, cz] = key.split(',').map(Number);
        g.world.dirtyChunks.delete(key);
        if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
      }
      for (const [px, pz] of [[fx, fz], [ax, az]]) {
        for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
          const cx = Math.floor(px / CH) + dx, cz = Math.floor(pz / CH) + dz;
          if (!g.renderer.hasMesh(cx, cz) && g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
        }
      }
      g.player.yaw = Math.atan2(-(ax + 0.5 - g.player.x), -(az + 0.5 - g.player.z));
      g.player.pitch = eye != null ? 0.22 : -0.12;   // down over a city, up at an island
    }, [s.from[0], s.from[1], s.at[0], s.at[1], s.at[2], 20, s.eye ?? null]);
    await page.waitForTimeout(1200);
    const file = `${OUT}/sky-${s.name}.png`;
    await page.screenshot({ path: file });
    console.log(`  ${file}  — ring ${s.ring} island at y=${s.at[1]}`);
  }
  if (errors.length) { console.log('\npage errors:'); for (const e of errors.slice(0, 5)) console.log('  ' + e); }
  console.log(errors.length ? '\nDONE (with page errors)' : '\nDONE — no page errors');
} finally {
  await browser.close();
  server.kill();
}
