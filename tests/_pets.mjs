// Drives the real game in headless Chromium to prove the PET half of the
// Handling skill works in play, which no unit test can: tame something small,
// call it, watch it actually follow you across the map, confirm it is not
// enlisted as an enemy when a fight starts, and put it away again.
//
//   node tests/_pets.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8776;
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
  await page.fill('#seed-input', 'houndsfoot');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => { window.__game.disableAggro = true; });
  await page.waitForTimeout(900);

  // ---- tame ----------------------------------------------------------------
  // A rat next to the player, rather than hunting for one: the thing under test
  // is the pet loop, not the spawn tables.
  const tamed = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    const { PETS } = await import('/js/game/mounts.js');
    const { ENEMY_TYPES } = await import('/js/game/enemies.js');
    const d = PETS.rat;
    g.inventory.add(d.tame, d.tameCount + 1);
    g.enemyMgr.entities.set('test:rat', {
      id: 'test:rat', type: 'rat', def: ENEMY_TYPES.rat,
      x: p.x + 1.4, y: p.y, z: p.z, homeX: p.x + 1.4, homeZ: p.z,
      hp: ENEMY_TYPES.rat.hp, dead: false, wanderT: 9,
    });
    g.updateMounts();
    const prompt0 = g.mountPrompt();
    const xp0 = g.skills.xp.handling;
    let feeds = 0;
    while (!g.stable.has('rat') && feeds < 10) { g.tryMount(g.nearMount); feeds++; }
    return { prompt0, feeds, tamed: g.stable.has('rat'), xpGain: g.skills.xp.handling - xp0 };
  });
  check(/wants|offer/i.test(tamed.prompt0 || ''), `a pet prompts like a mount does — "${tamed.prompt0}"`);
  check(tamed.tamed, `it tames after ${tamed.feeds} feeds`);
  check(tamed.xpGain > 0, `taming pays Handling XP (+${tamed.xpGain})`);

  // ---- call ----------------------------------------------------------------
  const called = await page.evaluate(() => {
    const g = window.__game;
    // The wild one is gone; the pet is a thing the stable owns now.
    g.enemyMgr.entities.delete('test:rat');
    g.stable.callPet('rat');
    g.updatePet();
    const e = g.petEntity;
    return { out: g.stable.petOut(), spawned: !!e, id: e?.id, inWorld: g.enemyMgr.entities.has(e?.id) };
  });
  check(called.out === 'rat', 'calling it puts it out');
  check(called.spawned && called.inWorld, 'and it exists in the world as a real creature');

  // ---- follow --------------------------------------------------------------
  // Walk a long way in one step. A pet's own walk speed is a third of yours, so
  // the leash snap is the only thing that can keep it with you — this is the
  // check that would fail if the leash were removed.
  const followed = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    const before = Math.hypot(g.petEntity.x - p.x, g.petEntity.z - p.z);
    p.x += 40; p.z += 40;
    p.y = g.world.groundNear(Math.floor(p.x), Math.floor(p.z), p.y) ?? p.y;
    const stranded = Math.hypot(g.petEntity.x - p.x, g.petEntity.z - p.z);
    for (let i = 0; i < 4; i++) { g.updatePet(); await new Promise((r) => setTimeout(r, 60)); }
    return { before, stranded, after: Math.hypot(g.petEntity.x - p.x, g.petEntity.z - p.z) };
  });
  check(followed.stranded > 40, `walking away really does strand it first (${followed.stranded.toFixed(1)} blocks)`);
  check(followed.after < 4, `and it catches up to your heel (${followed.after.toFixed(1)} blocks)`);

  // ---- it is not an enemy ---------------------------------------------------
  const notAFoe = await page.evaluate(() => {
    const g = window.__game, p = g.player;
    // Every pet type is also a wild creature type, so nothing but the `pet` flag
    // can tell them apart — without it, calling a rat and then picking a fight
    // enlists your own rat against you.
    const group = g.enemyMgr.nearbyGroup(p.x, p.z, 8, p.y).map((e) => e.id);
    const clicked = g.enemyMgr.entityAt(g.petEntity.x, g.petEntity.y, g.petEntity.z, 2);
    return { joins: group.includes('pet:rat'), clickable: clicked?.id === 'pet:rat' };
  });
  check(!notAFoe.joins, 'your own pet is never enlisted into a fight against you');
  check(!notAFoe.clickable, 'and you cannot swing at it');

  // ---- perk, save, and putting it away -------------------------------------
  const rest = await page.evaluate(async () => {
    const g = window.__game;
    const perkOut = g.stable.perk('forage');
    g.stable.callPet('rat');          // same call toggles it away
    g.updatePet();
    const away = { out: g.stable.petOut(), gone: !g.enemyMgr.entities.has('pet:rat'), perk: g.stable.perk('forage') };
    g.stable.callPet('rat');
    g.updatePet();
    g.saveGame();
    // Read the slot back out of storage rather than trusting the in-memory
    // object — the point is that the pet SURVIVES serialisation.
    let stable = null;
    for (const k of Object.keys(localStorage)) {
      try { const v = JSON.parse(localStorage.getItem(k)); if (v && v.stable) stable = v.stable; } catch (_) { /* not ours */ }
    }
    return { perkOut, away, savedPet: stable?.pet, handling: g.skills.level('handling') };
  });
  check(rest.perkOut > 0, `the perk applies while it is out (+${rest.perkOut})`);
  check(rest.away.out === null && rest.away.gone, 'the same call sends it home, and it leaves the world');
  check(rest.away.perk === 0, 'and the perk goes with it');
  check(rest.savedPet === 'rat', 'the pet that is out is written to the save');

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
  await page.screenshot({ path: 'tests/screenshots/pets.png' });
} catch (e) {
  console.error('PETS ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nPETS FAIL (${fails.length})` : '\nPETS PASS');
process.exit(fails.length ? 1 : 0);
