// Classic (RuneScape-style) combat e2e — the default combat mode.
// Engage → auto-exchange on timers → hitsplats → style XP → food → specials
// → leash-flee → real-time boss with telegraphed slam and summons.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8746;
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
  await page.fill('#seed-input', 'rstest');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);
  await gState(() => { window.__game.disableAggro = true; });

  // ---- 1. Engage the practice dummy by clicking it (real input path) ----
  await gState(() => {
    const g = window.__game;
    g.inventory.add('wooden_cudgel', 1);
    const i = g.inventory.slots.findIndex((s) => s && s.item === 'wooden_cudgel');
    g.inventory.equipFromSlot(i);
    const e = [...g.enemyMgr.entities.values()].find((en) => en.type === 'practice_dummy');
    g.player.x = e.x - 1.6; g.player.y = 65.02; g.player.z = e.z;
    g.player.vx = g.player.vy = g.player.vz = 0;
    const dx = e.x - g.player.x, dz = e.z - g.player.z;
    g.player.yaw = Math.atan2(-dx, -dz);
    g.player.pitch = -0.1;
    g.controls.leftDown = true;
    setTimeout(() => { g.controls.leftDown = false; }, 300);
  });
  await page.waitForTimeout(1000);
  const engaged = await gState(() => ({
    active: window.__game.combatRS.active,
    target: window.__game.combatRS.target?.type,
    uiShown: !document.getElementById('rs-ui').classList.contains('hidden'),
  }));
  check('click engages classic combat', engaged.active && engaged.target === 'practice_dummy', JSON.stringify(engaged));
  check('rs combat UI shown', engaged.uiShown);
  const styleBtns = await page.locator('#rs-styles .rs-btn').count();
  check('attack style buttons present', styleBtns >= 3, `${styleBtns}`);

  // ---- 2. Auto-exchange kills the dummy, hitsplats appear, xp flows ----
  let sawSplat = false;
  for (let i = 0; i < 40; i++) {
    const st = await gState(() => ({
      over: !window.__game.combatRS.active,
      splats: window.__game.hitsplats.length,
    }));
    if (st.splats > 0) sawSplat = true;
    if (st.over) break;
    await page.waitForTimeout(500);
  }
  const afterDummy = await gState(() => ({
    over: !window.__game.combatRS.active,
    dummyGone: ![...window.__game.enemyMgr.entities.values()].some((e) => e.type === 'practice_dummy'),
    strXp: window.__game.skills.xp.strength,
    defXp: window.__game.skills.xp.defense,
    vitXp: window.__game.skills.xp.vitality,
    coins: window.__game.inventory.coins,
  }));
  check('auto-exchange defeats dummy', afterDummy.over && afterDummy.dummyGone, JSON.stringify(afterDummy));
  check('hitsplats appeared', sawSplat);
  check('balanced style splits Strength+Defense XP', afterDummy.strXp > 0 && afterDummy.defXp > 0 && afterDummy.vitXp > 0);
  check('kill pays coins', afterDummy.coins > 0, `${afterDummy.coins}`);

  // ---- 3. Aggressive style routes XP to Strength only, vs a real boar ----
  const boar = await gState(() => {
    const g = window.__game;
    const e = [...g.enemyMgr.entities.values()].find((en) => en.type === 'scrap_goblin');
    if (!e) return null;
    g._xpBefore = { str: g.skills.xp.strength, def: g.skills.xp.defense };
    g.player.x = e.x - 1.5; g.player.y = e.y + 0.02; g.player.z = e.z;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.inventory.add('roast_haunch', 4);
    g.combatRS.style = 'aggressive';
    g.startCombat(e);
    return e.type;
  });
  check('goblin engagement', boar === 'scrap_goblin');
  let ateFood = false;
  for (let i = 0; i < 110; i++) {
    const st = await gState(() => {
      const g = window.__game;
      // eat via hotbar click path when hurt
      if (g.combatRS.active && g.player.hp < g.player.maxHp - 12 && !g._ate) {
        const idx = g.inventory.slots.findIndex((s) => s && s.item === 'roast_haunch');
        if (idx >= 0 && idx < 8) { g.useItem(idx); g._ate = true; }
      }
      return { over: !g.combatRS.active, ate: !!g._ate, dead: g.player.dead };
    });
    if (st.ate) ateFood = true;
    if (st.over) break;
    await page.waitForTimeout(500);
  }
  const afterBoar = await gState(() => {
    const g = window.__game;
    return {
      over: !g.combatRS.active,
      alive: !g.player.dead,
      strGain: g.skills.xp.strength - g._xpBefore.str,
      defGain: g.skills.xp.defense - g._xpBefore.def,
      haunch: g.inventory.count('boar_haunch'),
      huntXp: g.skills.xp.hunting,
    };
  });
  check('boar defeated in aggressive style', afterBoar.over && afterBoar.alive, JSON.stringify(afterBoar));
  check('aggressive XP → Strength (not Defense)', afterBoar.strGain > 0 && afterBoar.defGain < afterBoar.strGain * 0.6,
    `str+${Math.round(afterBoar.strGain)} def+${Math.round(afterBoar.defGain)}`);
  check('hunting XP + goblin drops', afterBoar.huntXp > 0 && afterBoar.haunch >= 1);

  // ---- 4. Special attack ----
  await gState(() => {
    const g = window.__game;
    g.skills.xp.strength = Math.max(g.skills.xp.strength, 2500); // ensure Power Strike unlocked (lvl 5 ≈ 2000xp)
    const e = [...g.enemyMgr.entities.values()]
      .find((en) => en.type === 'rat' || en.type === 'scrap_goblin');
    g.player.x = e.x - 1.4; g.player.y = e.y + 0.02; g.player.z = e.z;
    g.player.energy = 100;
    g.startCombat(e);
  });
  await page.waitForTimeout(600);
  const specialBtn = page.locator('#rs-specials [data-special="power_strike"]');
  check('special button rendered', await specialBtn.count() > 0);
  const hpBefore = await gState(() => window.__game.combatRS.target?.hp);
  await specialBtn.click();
  await page.waitForTimeout(400);
  const special = await gState(([hpBefore]) => {
    const g = window.__game;
    return {
      cdSet: (g.combatRS.cooldowns.power_strike || 0) > g.combatRS.time,
      energySpent: g.player.energy < 100,
      hpAfter: g.combatRS.target?.hp ?? -1,
    };
  }, [hpBefore]);
  check('special fires (cooldown + energy + damage attempt)', special.cdSet && special.energySpent, JSON.stringify(special));

  // ---- 5. Flee by running away (leash) ----
  await gState(() => {
    const g = window.__game;
    g.player.x += 30; g.player.z += 30;
    g.player.y = g.world.surfaceAt(Math.floor(g.player.x), Math.floor(g.player.z)) + 1.02;
  });
  await page.waitForTimeout(1500);
  const fled = await gState(() => !window.__game.combatRS.active);
  check('running away breaks combat (leash)', fled);

  // ---- 6. Real-time boss fight ----
  await gState(() => {
    const g = window.__game;
    g.skills.xp.strength = 16000;  // ~lvl 11 on this curve
    g.skills.xp.vitality = 30000; // ~lvl 13 → more sustain vs slam variance
    g.skills.xp.defense = 16000;
    for (const item of ['iron_blade', 'hide_jerkin', 'timber_shield', 'bronze_helm']) {
      g.inventory.add(item, 1);
      const i = g.inventory.slots.findIndex((s) => s && s.item === item);
      if (i >= 0) g.inventory.equipFromSlot(i);
    }
    g.inventory.add('roast_haunch', 20);
    g.recomputeVitals();
    g.player.hp = g.player.maxHp;
    g.combatRS.style = 'aggressive';
    for (let cx = 0; cx <= 2; cx++) for (let cz = -6; cz <= -3; cz++) g.world.ensureChunk(cx, cz);
    // clear the antechamber (as the quest intends) so only the golem answers
    for (const e of [...g.enemyMgr.entities.values()]) {
      if (e.type !== 'goblin_warchief' && e.z < -55 && e.y < 25) g.enemyMgr.markKilled(e);
    }
    // keep them down for the whole test — a respawned rat joining the boss pull is flaky
    for (const [id, t] of g.enemyMgr.killed) g.enemyMgr.killed.set(id, g.world.time + 3600);
    g.player.x = 24.5; g.player.y = 47.02; g.player.z = -73.5;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.disableAggro = false;
  });
  await page.waitForTimeout(2500);
  const bossStart = await gState(() => ({
    active: window.__game.combatRS.active,
    boss: [...window.__game.combatRS.engaged.values()].some((s) => s.entity.type === 'goblin_warchief'),
  }));
  check('boss aggro in classic mode', bossStart.active && bossStart.boss, JSON.stringify(bossStart));

  let sawTelegraphTiles = false, sawSummons = false;
  for (let i = 0; i < 180; i++) {
    const st = await gState(() => {
      const g = window.__game;
      // stay close, eat when hurt, dodge the marked ground
      if (g.combatRS.active) {
        if (g.player.hp < g.player.maxHp * 0.6) {
          const idx = g.inventory.slots.findIndex((s) => s && s.item === 'roast_haunch');
          if (idx >= 0) g.useItem(idx);
        }
        const tiles = g.combatRS.telegraphTiles();
        const inDanger = tiles.some((t) => t.x === Math.floor(g.player.x) && t.z === Math.floor(g.player.z));
        const boss = [...g.combatRS.engaged.values()].find((s) => s.entity.type === 'goblin_warchief')?.entity;
        if (inDanger) {
          g.player.x += 3; // step out of the slam
        } else if (boss && Math.hypot(boss.x - g.player.x, boss.z - g.player.z) > 2) {
          const dx = boss.x - g.player.x, dz = boss.z - g.player.z;
          const d = Math.hypot(dx, dz);
          g.player.x += (dx / d) * 1.2;
          g.player.z += (dz / d) * 1.2;
        }
        return {
          over: false,
          tiles: tiles.length,
          summons: [...g.enemyMgr.entities.values()].some((e) => e.transient),
          dead: g.player.dead,
        };
      }
      return { over: true, dead: g.player.dead };
    });
    if (st.tiles > 0) sawTelegraphTiles = true;
    if (st.summons) sawSummons = true;
    if (st.over) break;
    await page.waitForTimeout(500);
  }
  const bossAfter = await gState(() => ({
    over: !window.__game.combatRS.active,
    alive: !window.__game.player.dead,
    trophy: window.__game.inventory.count('warchief_standard'),
    flag: !!window.__game.flags.boss_gorrak,
  }));
  check('boss defeated in classic combat', bossAfter.over && bossAfter.alive && bossAfter.trophy >= 1, JSON.stringify(bossAfter));
  check('boss slam telegraphs ground tiles', sawTelegraphTiles);
  check('boss summons the warband at half health', sawSummons);
  check('boss flag set', bossAfter.flag);
  await page.screenshot({ path: 'tests/screenshots/rs-boss.png' });
} catch (e) {
  console.error('RS ERROR', e);
  await page.screenshot({ path: 'tests/screenshots/rs-error.png' }).catch(() => {});
  results.push({ name: 'no exception', ok: false });
} finally {
  const realErrors = errors.filter((er) => !er.includes('favicon'));
  if (realErrors.length) { console.log('CONSOLE ERRORS:'); realErrors.forEach((er) => console.log('  •', er)); }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 && realErrors.length === 0 ? 'RS PASS' : `RS FAIL (${failed.length})`);
  process.exitCode = failed.length || realErrors.length ? 1 : 0;
  await browser.close();
  server.kill();
}
