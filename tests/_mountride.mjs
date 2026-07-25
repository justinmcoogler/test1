// Drives the real game in headless Chromium to prove the mount loop works in
// play, which no unit test can: find a wild mount, feed it until it is tamed,
// get on, climb, hit the ceiling, and land on a sky island.
//
//   node tests/_mountride.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8775;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'skyward');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => { window.__game.disableAggro = true; });
  await page.waitForTimeout(900);

  // ---- tame -----------------------------------------------------------------
  // Put a Ridgewing next to the player rather than walking to a mountain: the
  // thing under test is the tame/ride loop, not the spawn tables (a unit test
  // covers those).
  const tamed = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    const d = (await import('/js/game/mounts.js')).MOUNTS.ridgewing;
    const { ENEMY_TYPES } = await import('/js/game/enemies.js');
    g.inventory.add(d.tame, d.tameCount + 2);
    // A real def, or EnemyManager.serialize throws on it at save time.
    g.enemyMgr.entities.set('test:ridgewing', {
      id: 'test:ridgewing', type: 'ridgewing', def: ENEMY_TYPES.ridgewing,
      x: p.x + 1.5, y: p.y, z: p.z, hp: ENEMY_TYPES.ridgewing.hp, dead: false,
    });
    g.updateMounts();
    const seen = !!g.nearMount;
    const prompt0 = g.mountPrompt();
    let feeds = 0;
    while (!g.stable.has('ridgewing') && feeds < 12) { g.tryMount(g.nearMount); feeds++; }
    return { seen, prompt0, feeds, tamed: g.stable.has('ridgewing'), left: g.inventory.count(d.tame) };
  });
  check(tamed.seen, 'a mount standing beside you is detected');
  check(/offer|wants/i.test(tamed.prompt0 || ''), `the prompt tells you what it wants — "${tamed.prompt0}"`);
  check(tamed.tamed, `it tames after ${tamed.feeds} feeds`);
  check(tamed.left === 2, `taming spent exactly the tame cost (${tamed.left} left over of +2 spare)`);

  // ---- ride -----------------------------------------------------------------
  const rode = await page.evaluate(() => {
    const g = window.__game;
    g.tryMount(g.nearMount);
    return { riding: g.stable.riding(), mounted: !!g.player.mountDef, prompt: g.buildPrompt ? null : g.stable.ridingDef()?.label };
  });
  check(rode.riding === 'ridgewing', 'you get on it');
  check(rode.mounted, 'and the player is actually flying the mount, not walking');

  // ---- climb, and stop at the ceiling ---------------------------------------
  const flew = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    const { MOUNTS } = await import('/js/game/mounts.js');
    const IN = { jump: true, sprint: false, worldMove: null, moveVector: () => [0, 0] };
    const y0 = p.y;
    for (let i = 0; i < 900; i++) p.update(0.05, IN, g.world);
    const ceil = MOUNTS.ridgewing.ceiling;
    return { y0, y: p.y, ceil, over: p.y > ceil + 0.01 };
  });
  check(flew.y > flew.y0 + 40, `it climbs (${flew.y0.toFixed(0)} → ${flew.y.toFixed(0)})`);
  check(!flew.over, `and refuses to pass its ceiling (y=${flew.y.toFixed(1)}, ceiling ${flew.ceil})`);

  // ---- a Riftwing goes higher, and lands on an island -----------------------
  const high = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    const { MOUNTS } = await import('/js/game/mounts.js');
    const { allIslands } = await import('/js/world/sky.js');
    g.stable.feed('riftwing', 99); g.stable.mount('riftwing');
    p.mountDef = MOUNTS.riftwing;
    const s = allIslands(g.world.gen, 5).find((s) => s.ring === 3);
    const is = s.isles[0];
    const CH = 16;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) g.world.ensureChunk((is.cx >> CH.toString(2).length - 1) + a, (is.cz >> 4) + b);
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) g.world.ensureChunk((is.cx >> 4) + a, (is.cz >> 4) + b);
    // drop onto the island from above
    p.x = is.cx + 0.5; p.z = is.cz + 0.5; p.y = is.y + is.crownH + 25;
    const DIVE = { jump: false, sprint: true, worldMove: null, moveVector: () => [0, 0] };
    for (let i = 0; i < 400; i++) p.update(0.05, DIVE, g.world);
    return { y: p.y, target: is.y + is.crownH, onGround: p.onGround, ceil: MOUNTS.riftwing.ceiling };
  });
  check(high.onGround, `a Riftwing lands ON a ring-3 island (y=${high.y.toFixed(1)}, surface ~${high.target})`);
  // Not `== surface + 1`: the largest island in a cluster always carries a
  // structure at its centre (js/world/sky.js), so a clean drop down the middle
  // legitimately lands on a hall roof several blocks up. What matters is that it
  // stopped ON something at or above the crust rather than passing through.
  check(high.y >= high.target && high.y < high.target + 14,
    `and it stops on the island (or on what is built there) rather than falling through — y=${high.y.toFixed(1)}, crust ${high.target}`);

  // ---- dismount + save round trip -------------------------------------------
  const saved = await page.evaluate(() => {
    const g = window.__game;
    g.dismount();
    const off = !g.player.mountDef && !g.stable.riding();
    g.saveGame();
    // Read the stable back out of every localStorage value rather than guessing
    // the slot key — the key format is the save system's business, not this
    // test's, and guessing it threw.
    let stable = null;
    for (const k of Object.keys(localStorage)) {
      try { const v = JSON.parse(localStorage.getItem(k)); if (v && v.stable) stable = v.stable; } catch (_) { /* not ours */ }
    }
    return { off, stable };
  });
  check(saved.off, 'dismounting puts you back on your feet');
  check(!!saved.stable && saved.stable.tamed.includes('ridgewing'), 'the stable is written to the save');

  await page.screenshot({ path: 'tests/screenshots/mount-island.png' });
  if (errors.length) { console.log('\npage errors:'); for (const e of errors.slice(0, 6)) console.log('  ' + e); }
  console.log(fails.length ? `\nMOUNTRIDE FAIL (${fails.length})` : '\nMOUNTRIDE PASS');
} finally {
  await browser.close();
  server.kill();
}
process.exit(fails.length ? 1 : 0);
