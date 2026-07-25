// Photographs a PROCEDURAL town (js/world/settlements.js), from the air and from
// the street, plus the walk in off the arterial. Unlike _townshot.mjs, which
// points fixed cameras at Brookhollow, this one asks the world where the nearest
// generated town is and frames itself on that — the town's position depends on
// the seed, so a hard-coded camera would photograph empty country.
//
// Yaw convention, since it is easy to get backwards: the player faces
// (-sin yaw, -cos yaw), so yaw 0 looks NORTH (-z) and facing a point is
// atan2(-dx, -dz) — see `look` below and js/player/controls.js.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8747;
const SEED = process.argv[2] || 'flyover';
const WANT_RING = Number(process.argv[3] ?? 2);
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function shot(name, px, py, pz, yaw, pitch) {
  await page.evaluate(async ([px, py, pz, yaw, pitch]) => {
    const g = window.__game;
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) g.world.ensureChunk(Math.floor(px / 16) + dx, Math.floor(pz / 16) + dz);
    }
    g.player.x = px; g.player.y = py - 1.62; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = yaw; g.player.pitch = pitch;
    g.player.dead = false;
    for (const key of [...g.world.dirtyChunks]) {
      const [cx, cz] = key.split(',').map(Number);
      g.world.dirtyChunks.delete(key);
      if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
    }
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const cx = Math.floor(px / 16) + dx, cz = Math.floor(pz / 16) + dz;
        if (!g.renderer.hasMesh(cx, cz) && g.world.hasChunk(cx, cz)
            && g.world.hasChunk(cx - 1, cz) && g.world.hasChunk(cx + 1, cz)
            && g.world.hasChunk(cx, cz - 1) && g.world.hasChunk(cx, cz + 1)) {
          g.renderer.remeshChunk(g.world, cx, cz);
        }
      }
    }
  }, [px, py, pz, yaw, pitch]);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `tests/screenshots/settle-${name}.png` });
  console.log('shot', name);
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', SEED);
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => {
    const g = window.__game;
    g.disableAggro = true;
    g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
    g.world.time = 120;                                  // midday
  });
  await page.waitForTimeout(800);

  const town = await page.evaluate(async (wantRing) => {
    const mod = await import('/js/world/settlements.js');
    const g = window.__game;
    const towns = mod.allSettlements(g.world.gen, 2).sort(
      (a, b) => (Math.hypot(a.tx, a.tz) - Math.hypot(b.tx, b.tz)));
    const best = towns.find((t) => t.ring >= wantRing) || towns[0];
    const roads = (await import('/js/world/roads.js')).roadsFor(g.world.gen);
    const c = roads.column(g.world.gen, best.d, best.site.s, 0);
    return {
      name: best.name, ring: best.ring, x: best.tx, z: best.tz, padY: best.padY,
      alongX: best.site.streetAlongX, buildings: best.buildings.length,
      npcs: best.npcs.length, quests: best.quests.map((q) => q.name),
      gate: best.gate, junction: [c[0], c[1]],
      halfL: best.plan.halfL,
    };
  }, WANT_RING);
  console.log('TOWN', JSON.stringify(town));

  const { x, z, padY, alongX, halfL } = town;
  const look = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  // Straight down over the market: fog is distance-based, and the whole plan is
  // 90 blocks long, so the only way to see all of it at once is from overhead.
  await shot('air', x + 0.5, padY + 46, z + 0.5, alongX ? -Math.PI / 2 : Math.PI, -1.35);
  // Along the high street from above the town's end — the view that shows the
  // burgage rows as rows.
  {
    const fx = alongX ? x - halfL - 6 : x + 24, fz = alongX ? z + 24 : z - halfL - 6;
    await shot('oblique', fx + 0.5, padY + 24, fz + 0.5, look(fx, fz, x, z), -0.42);
  }
  // Standing in the market, looking each way down the street.
  await shot('street', x + 0.5, padY + 2.6, z + 0.5, alongX ? -Math.PI / 2 : Math.PI, -0.05);
  await shot('street2', x + 0.5, padY + 2.6, z + 0.5, alongX ? Math.PI / 2 : 0, -0.05);
  // The walk in: standing on the arterial where the lane leaves it, facing the town.
  await shot('approach', town.junction[0] + 0.5, padY + 3.2, town.junction[1] + 0.5,
    look(town.junction[0], town.junction[1], town.gate.x, town.gate.z), -0.02);
  // …and at the gate, looking back down the lane to the road.
  await shot('gate', town.gate.x + 0.5, padY + 2.6, town.gate.z + 0.5,
    look(town.gate.x, town.gate.z, town.junction[0], town.junction[1]), -0.04);

  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' •', e)); }
} finally {
  await browser.close();
  server.kill();
}
