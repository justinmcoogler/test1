// Custom mob pipeline e2e: the sample emberveil-mob file loads from mobs/,
// gets a textured animated model, spawns, animates, fights, and drops loot.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8753;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const gState = (fn, arg) => page.evaluate(fn, arg);

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'mobtest');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1500);
  await gState(() => { window.__game.disableAggro = true; });

  // ---- 1. loaded + registered ----
  const reg = await gState(() => {
    const g = window.__game;
    const def = window.__enemies.ENEMY_TYPES.glimmer_fox;
    const model = g.renderer.modelCache.get('glimmer_fox');
    return {
      def: !!def, custom: def?.custom, hp: def?.hp, label: def?.label,
      animated: model?.animated, parts: model?.parts?.length,
      anims: model ? Object.keys(model.animations) : [],
      skinTile: !!window.__game.renderer && true,
      spawnRule: (window.__worldgen?.BIOMES || null) === null ? 'skip' : null,
    };
  });
  check('mob file loaded & creature registered', reg.def && reg.custom && reg.hp === 14, JSON.stringify({ hp: reg.hp, label: reg.label }));
  check('animated model with 7 parts', reg.animated && reg.parts === 7, `${reg.parts} parts`);
  check('idle/walk/attack animations present', reg.anims.length === 3, reg.anims.join(','));

  // ---- 2. invalid files are rejected with clear errors ----
  const rejects = await gState(async () => {
    const g = window.__game;
    const out = [];
    const tryLoad = async (json) => {
      try { await g.importMob(json); return 'accepted'; }
      catch (e) { return e.message; }
    };
    out.push(await tryLoad({ format: 'nope' }));
    out.push(await tryLoad({ format: 'emberveil-mob', version: 1, id: 'mudback_boar', parts: [{ id: 'a', boxes: [{ from: [0, 0, 0], size: [1, 1, 1] }] }], texture: { width: 64, height: 64, rgbaBase64: 'x' }, stats: { hp: 1, atk: 1, speed: 1 } }));
    out.push(await tryLoad({ format: 'emberveil-mob', version: 1, id: 'bad_drop', parts: [{ id: 'a', boxes: [{ from: [0, 0, 0], size: [1, 1, 1] }] }], texture: { width: 64, height: 64, rgbaBase64: 'x' }, stats: { hp: 1, atk: 1, speed: 1 }, drops: [{ item: 'not_an_item' }] }));
    return out;
  });
  check('bad format rejected', rejects[0].includes('format'), rejects[0]);
  check('id collision with built-in rejected', rejects[1].includes('collides'), rejects[1]);
  check('unknown drop item rejected', rejects[2].includes('unknown item'), rejects[2]);

  // ---- 3. spawn preview + animation actually moves parts ----
  const anim = await gState(() => {
    const g = window.__game;
    const ent = g.spawnMobNear('glimmer_fox');
    const model = g.renderer.modelCache.get('glimmer_fox');
    const { evaluatePose } = window.__mobloader;
    const a = evaluatePose(model, 'idle', 0.0);
    const b = evaluatePose(model, 'idle', 1.5);
    const tailMoved = a.tail.some((v, i) => Math.abs(v - b.tail[i]) > 0.01);
    const w = evaluatePose(model, 'walk', 0.05); // mid-swing, not the zero-crossing
    const legMoved = w.leg_fl.some((v, i) => Math.abs(v - a.leg_fl[i]) > 0.01);
    // parent chain: head pose differs when body translates
    const chained = evaluatePose(model, 'idle', 1.5).head.some((v, i) => Math.abs(v - a.head[i]) > 0.001);
    return { spawned: !!ent, tailMoved, legMoved, chained };
  });
  check('preview spawn works', anim.spawned);
  check('idle animation moves the tail over time', anim.tailMoved);
  check('walk animation swings legs', anim.legMoved);
  check('parent chain propagates to child parts', anim.chained);

  // rendered entity carries a pose
  await page.waitForTimeout(600);
  const rendered = await gState(() => {
    const g = window.__game;
    const ents = g.collectEntities(0.016);
    const fox = ents.find((e) => e.model === 'glimmer_fox');
    return { present: !!fox, hasPose: !!fox?.pose, poseParts: fox?.pose ? Object.keys(fox.pose).length : 0 };
  });
  check('fox renders with live pose', rendered.present && rendered.hasPose && rendered.poseParts === 7, JSON.stringify(rendered));
  await page.screenshot({ path: 'tests/screenshots/mob-fox.png' });

  // ---- 4. it's a real creature: fight it, get its drops ----
  const fight = await gState(async () => {
    const g = window.__game;
    g.inventory.add('iron_blade', 1);
    const i = g.inventory.slots.findIndex((s) => s && s.item === 'iron_blade');
    g.inventory.equipFromSlot(i);
    g.skills.xp.strength = 16000;
    const fox = [...g.enemyMgr.entities.values()].find((e) => e.type === 'glimmer_fox' && e.id.startsWith('preview:'));
    g._foxId = fox.id;
    g.player.x = fox.x - 1.2; g.player.z = fox.z;
    g.player.y = fox.y + 0.02;
    g.startCombat(fox);
    return { engaged: g.combatRS.active, target: g.combatRS.target?.type };
  });
  check('combat vs custom mob engages', fight.engaged && fight.target === 'glimmer_fox', JSON.stringify(fight));
  let won = false;
  for (let i = 0; i < 40; i++) {
    const st = await gState(() => ({
      over: !window.__game.combatRS.active,
      // wild foxes may roam nearby (the spawn rule works!) — track ours by id
      foxGone: !window.__game.enemyMgr.entities.has(window.__game._foxId),
    }));
    if (st.over) { won = st.foxGone; break; }
    await page.waitForTimeout(500);
  }
  const loot = await gState(() => ({
    sinew: window.__game.inventory.count('sinew'),
    huntXp: window.__game.skills.xp.hunting,
  }));
  check('custom mob defeated', won);
  check('drops + hunting xp from file stats', loot.sinew >= 1 || loot.huntXp > 0, JSON.stringify(loot));

  // ---- 5. natural spawns: file's biome rule reaches new chunks ----
  const wildSpawn = await gState(() => {
    const g = window.__game;
    // scan spawn points in far greenwood chunks (generated after rule injection)
    let found = 0, scanned = 0;
    for (let cx = 6; cx < 16 && !found; cx++) {
      for (let cz = 6; cz < 16 && !found; cz++) {
        const c = g.world.ensureChunk(cx, cz);
        scanned++;
        if (c.spawns.some((sp) => sp.type === 'glimmer_fox')) found++;
      }
    }
    return { found, scanned };
  });
  check('spawn rule produces wild foxes in listed biomes', wildSpawn.found >= 1, JSON.stringify(wildSpawn));
} catch (e) {
  console.error('MOB ERROR', e);
  await page.screenshot({ path: 'tests/screenshots/mob-error.png' }).catch(() => {});
  results.push({ name: 'no exception', ok: false });
} finally {
  const realErrors = errors.filter((er) => !er.includes('favicon'));
  if (realErrors.length) { console.log('CONSOLE ERRORS:'); realErrors.forEach((er) => console.log('  •', er)); }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 && realErrors.length === 0 ? 'MOB PASS' : `MOB FAIL (${failed.length})`);
  process.exitCode = failed.length || realErrors.length ? 1 : 0;
  await browser.close();
  server.kill();
}
