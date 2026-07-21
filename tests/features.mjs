// E2E for the survival-update features: day/night + lighting, farming loop,
// nocturnal/pack/shiny spawns, the Frostwatch region + quest chain + boss
// phases, and QoL (town storage, xp toggle, tooltips).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8752;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const g = (fn, arg) => page.evaluate(fn, arg);

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'features1');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);
  await g(() => { window.__game.disableAggro = true; });

  // ---- 1. Day/night clock + renderer daylight ----
  const clock = await g(() => {
    const w = window.__game.world;
    const day = { light: w.daylight(), night: w.isNight() };
    const t = w.time % 480;
    w.time += (0.7 * 480 - t + 480) % 480; // warp to deep night
    return { day };
  });
  await page.waitForTimeout(300);
  const nightState = await g(() => ({
    light: window.__game.world.daylight(),
    night: window.__game.world.isNight(),
    rendererDaylight: +window.__game.renderer.daylight.toFixed(2),
  }));
  check('daylight full in the morning', clock.day.light === 1 && !clock.day.night, JSON.stringify(clock.day));
  check('night: daylight 0.25 and renderer follows', nightState.night && nightState.light === 0.25 && nightState.rendererDaylight === 0.25, JSON.stringify(nightState));

  // ---- 2. Nocturnal spawns: appear at night, fade at dawn ----
  const noct = await g(() => {
    const game = window.__game;
    const p = game.player;
    const chunk = game.world.getChunk(Math.floor(p.x / 16), Math.floor(p.z / 16));
    chunk.spawns.push({ id: 'test_duskwing', type: 'duskwing', x: Math.floor(p.x) + 3, y: Math.floor(p.y), z: Math.floor(p.z) });
    game.enemyMgr.refresh();
    const atNight = game.enemyMgr.entities.has('test_duskwing');
    const t = game.world.time % 480;
    game.world.time += (480 - t) % 480; // warp to dawn/day
    game.enemyMgr.refresh();
    const atDay = game.enemyMgr.entities.has('test_duskwing');
    return { atNight, atDay };
  });
  check('duskwing spawns at night, fades at dawn', noct.atNight && !noct.atDay, JSON.stringify(noct));

  // ---- 3. Shiny variants ----
  const shiny = await g(() => {
    const game = window.__game;
    const def = window.__enemies.ENEMY_TYPES.mudback_boar;
    const old = def.shinyChance;
    def.shinyChance = 1;
    const chunk = game.world.getChunk(Math.floor(game.player.x / 16), Math.floor(game.player.z / 16));
    chunk.spawns.push({ id: 'test_shiny', type: 'mudback_boar', x: Math.floor(game.player.x) - 3, y: Math.floor(game.player.y), z: Math.floor(game.player.z) });
    game.enemyMgr.refresh();
    const e = game.enemyMgr.entities.get('test_shiny');
    def.shinyChance = old;
    const out = { shiny: !!e?.shiny };
    game.enemyMgr.entities.delete('test_shiny');
    chunk.spawns.splice(chunk.spawns.findIndex((s) => s.id === 'test_shiny'), 1);
    return out;
  });
  check('shinyChance produces gilded variants', shiny.shiny);

  // ---- 4. Farming: plant → ripen → harvest ----
  const farm = await g(() => {
    const game = window.__game;
    const B = window.__blocks.B;
    const p = game.player;
    const x = Math.floor(p.x) + 2, z = Math.floor(p.z) + 2;
    const y = game.world.surfaceAt(x, z);
    game.world.setBlock(x, y, z, B.farmland, true);
    game.world.plantCrop(x, y + 1, z);
    const young = game.world.getBlock(x, y + 1, z) === B.crop_young;
    game.world.time += 130; // past ripen time
    game.world.update(1.2); // force the crop tick
    const ripe = game.world.getBlock(x, y + 1, z) === B.crop_ripe;
    const before = game.inventory.count('grainsheaf');
    game.breakBlock(x, y + 1, z, window.__blocks.BLOCKS[B.crop_ripe]);
    const gained = game.inventory.count('grainsheaf') - before;
    const persisted = 'crops' in game.world.serialize();
    return { young, ripe, gained, persisted };
  });
  check('crop plants young and ripens', farm.young && farm.ripe, JSON.stringify(farm));
  check('harvest yields grain', farm.gained >= 1, `+${farm.gained} grainsheaf`);
  check('crops key present in save data', farm.persisted);

  // ---- 5. Seeds from tall grass (statistical) ----
  const seeds = await g(() => {
    const game = window.__game;
    const B = window.__blocks.B;
    const before = game.inventory.count('grain_seeds');
    for (let i = 0; i < 25; i++) {
      game.breakBlock(1000 + i, 40, 1000, window.__blocks.BLOCKS[B.tall_grass]);
    }
    return game.inventory.count('grain_seeds') - before;
  });
  check('tall grass yields grain seeds', seeds > 0, `${seeds}/25 drops`);

  // ---- 6. Hoe + recipes ----
  const recipes = await g(() => {
    const R = window.__crafting.RECIPES;
    return {
      hoe: R.some((r) => r.out === 'crude_hoe'),
      bronzeHoe: R.some((r) => r.out === 'bronze_hoe'),
    };
  });
  check('hoe recipes registered', recipes.hoe && recipes.bronzeHoe);

  // ---- 7. Frostwatch region generates ----
  const frost = await g(() => {
    const game = window.__game;
    const p = game.player;
    p.x = 560.5; p.z = -119.5;
    // stream the camp chunks in synchronously
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      game.world.ensureChunk(35 + dx, -8 + dz);
    }
    p.y = (game.world.groundNear(560, -119, 67) ?? 67) + 0.02;
    game.enemyMgr.refresh();
    const biome = game.world.gen.biomeAt(560, -120).label;
    const sylla = game.world.structure.npcs.some((n) => n.id === 'sylla');
    const bossSpawn = [...game.enemyMgr.entities.values()].some((e) => e.type === 'rimehowl_alpha');
    const chest = game.world.getChestAt(557, 68, -142);
    const warded = chest?.meta.requiresBossDead === 'boss_rimehowl';
    const forge = game.world.getBlock(564, 68, -117); // furnace at CX+4
    return { biome, sylla, bossSpawn, warded, forgeIsFurnace: forge === window.__blocks.B.furnace };
  });
  check('camp sits in forced tundra', frost.biome === 'Frostbound Tundra', frost.biome);
  check('Warden Sylla exists', frost.sylla);
  check('Rimehowl Alpha spawns at the den', frost.bossSpawn);
  check('den chest warded on the new boss', frost.warded, JSON.stringify(frost));
  check('field forge placed', frost.forgeIsFurnace);

  // ---- 8. Quest chain gating + cross-NPC turn-in ----
  const chain = await g(() => {
    const game = window.__game;
    const ql = game.quests;
    // finish the prerequisite chain silently
    for (const qid of ['q_arrival', 'q_sparks', 'q_roof', 'q_mettle', 'q_rootgrave']) {
      ql.state[qid] = { status: 'done', stage: 99, progress: 0 };
    }
    const availBefore = ql.availableFrom('maren').map((q) => q.id);
    ql.start('q_frontier');
    ql.checkReach(game.player.x, game.player.z, game.player.y, game.world.markers); // at the camp already
    const q = ql.quest('q_frontier');
    const readyAtSylla = ql.readyToTurnIn(q, 'sylla');
    const hub = game.ui.buildQuestHub('sylla');
    const hubHasTurnIn = hub.options.some((o) => o.action === 'turnIn:q_frontier');
    const turnedIn = ql.turnIn(q);
    const wolfcullAvail = ql.availableFrom('sylla').some((qq) => qq.id === 'q_wolfcull');
    return { frontierOffered: availBefore.includes('q_frontier'), readyAtSylla, hubHasTurnIn, turnedIn, wolfcullAvail };
  });
  check('q_frontier offered after Rootgrave', chain.frontierOffered);
  check('reach stage advances at the camp', chain.readyAtSylla, JSON.stringify(chain));
  check('cross-NPC turn-in via Sylla hub', chain.hubHasTurnIn && chain.turnedIn);
  check('wolf cull unlocks at Sylla', chain.wolfcullAvail);

  // ---- 9. Boss phase: alpha howls in wolves at half health ----
  const boss = await g(() => {
    const game = window.__game;
    game.player.maxHp = 5000; game.player.hp = 5000;
    const alpha = [...game.enemyMgr.entities.values()].find((e) => e.type === 'rimehowl_alpha');
    if (!alpha) return { error: 'no alpha' };
    game.disableAggro = false;
    game.combatRS.engage(alpha, true);
    alpha.hp = Math.floor(alpha.def.hp * 0.4); // trip the phase
    return { engaged: game.combatRS.active };
  });
  await page.waitForTimeout(1500);
  const phase = await g(() => {
    const game = window.__game;
    const summons = [...game.enemyMgr.entities.values()].filter((e) => e.transient && e.type === 'frostmaw_wolf');
    const alpha = [...game.enemyMgr.entities.values()].find((e) => e.type === 'rimehowl_alpha');
    const enraged = !!alpha?.enraged;
    game.combatRS.disengageAll();
    game.disableAggro = true;
    game.player.maxHp = 40; game.player.hp = 40;
    return { summonCount: summons.length, enraged };
  });
  check('alpha phase summons pack wolves', phase.summonCount >= 2 && phase.enraged, JSON.stringify(phase));

  // ---- 9.5 Water: breath drains underwater, drowning hurts, recovery ----
  const water = await g(() => {
    const game = window.__game;
    const p = game.player;
    p.x = 0.5; p.z = 18.5; p.y = 60; // pond bottom, head under
    p.vx = p.vy = p.vz = 0;
    p.air = 2;
    return { maxAir: p.maxAir };
  });
  await page.waitForTimeout(4500);
  const drown = await g(() => {
    const p = window.__game.player;
    return { air: +p.air.toFixed(1), headUnder: p.headUnder, hp: p.hp };
  });
  await g(() => {
    const p = window.__game.player;
    p.x = 6.5; p.z = 6.5; // back on the square
    p.y = (window.__game.world.groundNear(6, 6, 65) ?? 65) + 0.02;
  });
  await page.waitForTimeout(1200);
  const surfaced = await g(() => ({ air: window.__game.player.air, hp: window.__game.player.hp }));
  check('head underwater drains air and drowns', drown.headUnder && drown.air === 0 && drown.hp < 40, JSON.stringify(drown));
  check('air recovers on the surface', surfaced.air > 2, `air ${surfaced.air.toFixed(1)}`);
  await g(() => { const p = window.__game.player; p.hp = p.maxHp; });

  // ---- 10. QoL: town storage + xp toggle ----
  const qol = await g(() => {
    const game = window.__game;
    const chest = game.world.getChestAt(4, 65, 4);
    return {
      townStorage: chest?.id === 'town_storage',
      xpToastsDefault: game.settings.xpToasts === true,
    };
  });
  check('town storage chest at Brookhollow', qol.townStorage);
  check('xp toast toggle defaults on', qol.xpToastsDefault);

  await page.screenshot({ path: 'tests/screenshots/features.png' });
} catch (e) {
  console.error('FEATURES ERROR', e);
  results.push({ name: 'no exception', ok: false });
} finally {
  const realErrors = errors.filter((er) => !er.includes('favicon'));
  if (realErrors.length) { console.log('CONSOLE ERRORS:'); realErrors.forEach((er) => console.log('  •', er)); }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 && realErrors.length === 0 ? 'FEATURES PASS' : `FEATURES FAIL (${failed.length})`);
  process.exitCode = failed.length || realErrors.length ? 1 : 0;
  await browser.close();
  server.kill();
}
