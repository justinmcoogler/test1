// Boss encounter e2e: fight the Rootbound Golem with a prepared loadout.
// Verifies telegraphs, phase-2 summons, victory loot, chest gate, and defeat flow.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8744;
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
  await page.fill('#seed-input', 'bosstest');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);

  // prepared mid-game loadout
  await gState(() => {
    const g = window.__game;
    g.disableAggro = true;
    g.settings.tacticalCombat = true; // this suite exercises tactical mode
    g.skills.xp.strength = 16000; // ~lvl 11
    g.skills.xp.vitality = 16000;
    g.skills.xp.defense = 9000;
    g.inventory.add('bronze_blade', 1);
    g.inventory.add('hide_jerkin', 1);
    g.inventory.add('timber_shield', 1);
    g.inventory.add('roast_haunch', 6);
    g.inventory.add('minor_healing_tonic', 3);
    g.inventory.add('bronze_helm', 1);
    for (const item of ['bronze_blade', 'hide_jerkin', 'timber_shield', 'bronze_helm']) {
      const i = g.inventory.slots.findIndex((s) => s && s.item === item);
      g.inventory.equipFromSlot(i);
    }
    g.recomputeVitals();
    g.player.hp = g.player.maxHp;
    // load dungeon chunks
    for (let cx = 0; cx <= 2; cx++) for (let cz = -6; cz <= -3; cz++) g.world.ensureChunk(cx, cz);
  });

  // clear the antechamber (as the quest instructs) so the boss pull is clean —
  // dungeon creatures wander and could otherwise aggro first
  await gState(() => {
    const g = window.__game;
    for (const e of [...g.enemyMgr.entities.values()]) {
      if (e.type !== 'rootbound_golem' && e.z < -55 && e.y < 25) g.enemyMgr.markKilled(e);
    }
  });
  // walk into the boss hall
  await gState(() => {
    const g = window.__game;
    g.player.x = 24.5; g.player.y = 13.02; g.player.z = -73.5;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = 0; g.player.pitch = -0.1;
    g.disableAggro = false;
  });
  await page.waitForTimeout(2500);
  const started = await gState(() => {
    const g = window.__game;
    return {
      active: g.combat.active,
      vsBoss: g.combat.active && g.combat.enemies().some((e) => e.type === 'rootbound_golem'),
      playerHp: g.combat.playerC?.maxHp,
    };
  });
  check('boss combat auto-started via aggro', started.active && started.vsBoss, JSON.stringify(started));

  // fight loop
  let sawTelegraph = false, sawPhase = false, rounds = 0;
  for (let i = 0; i < 200; i++) {
    const st = await gState(() => {
      const g = window.__game;
      if (!g.combat.active) return { over: true };
      const c = g.combat;
      return {
        over: false,
        ourTurn: c.current() === c.playerC && !c.pendingEnd,
        usedAction: c.usedAction,
        hp: c.playerC.hp,
        maxHp: c.playerC.maxHp,
        round: c.round,
        telegraphs: c.enemies().some((e) => e.telegraph),
        danger: c.dangerTiles().length,
        summons: c.combatants.filter((cc) => cc.summoned).length,
        enemies: c.enemies().length,
      };
    });
    if (st.over) break;
    rounds = st.round;
    if (st.telegraphs || st.danger > 0) sawTelegraph = true;
    if (st.summons > 0) sawPhase = true;
    if (st.ourTurn) {
      await gState(() => {
        const g = window.__game;
        const c = g.combat;
        const danger = c.dangerTiles();
        const strike = () => {
          if (c.usedAction) return true;
          // eat if hurt (that's the turn's action)
          if (c.playerC.hp < c.playerC.maxHp * 0.55) {
            const i = g.inventory.slots.findIndex((s) => s && (s.item === 'roast_haunch' || s.item === 'minor_healing_tonic'));
            if (i >= 0) { c.useItem(i); return true; }
          }
          const targets = c.getAbilityTargets('strike');
          if (!targets.length) return false;
          const rootling = targets.map((id) => c.combatants.find((cc) => cc.id === id)).find((cc) => cc.type === 'rootling');
          c.doAbility('strike', rootling ? rootling.id : targets[0]);
          return true;
        };
        const moveSmart = () => {
          if (c.usedMove) return;
          const enemy = c.enemies()[0];
          if (!enemy) return; // everything just died this turn
          const reach = c.getMovableTiles();
          const inDanger = danger.some((t) => t.gx === c.playerC.gx && t.gz === c.playerC.gz);
          let best = null, bd = 1e9;
          for (const key of reach.keys()) {
            const t = c.tiles.get(key);
            if (inDanger && danger.some((d) => d.gx === t.gx && d.gz === t.gz)) continue;
            const d = Math.abs(t.gx - enemy.gx) + Math.abs(t.gz - enemy.gz);
            if (d < bd) { bd = d; best = t; }
          }
          if (best && (inDanger || bd < Math.abs(c.playerC.gx - enemy.gx) + Math.abs(c.playerC.gz - enemy.gz))) {
            c.doMove(best.gx, best.gz);
          }
        };
        if (!strike()) { moveSmart(); strike(); } else if (!c.usedMove && danger.length) moveSmart();
        if (c.active && c.current() === c.playerC) c.endTurn();
      });
    }
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);

  const after = await gState(() => {
    const g = window.__game;
    return {
      combatOver: !g.combat.active,
      alive: !g.player.dead,
      heart: g.inventory.count('rootbound_heart'),
      flag: !!g.flags.boss_rootbound,
      bossGone: ![...g.enemyMgr.entities.values()].some((e) => e.type === 'rootbound_golem'),
      huntOrTactics: g.skills.xp.tactics,
    };
  });
  check('boss defeated', after.combatOver && after.alive && after.bossGone, JSON.stringify(after));
  check('boss telegraphed attacks during fight', sawTelegraph);
  check('phase 2 summoned rootlings', sawPhase);
  check('boss trophy dropped', after.heart >= 1);
  check('boss flag set (chest unsealed)', after.flag);
  check(`fight length reasonable`, rounds >= 4, `${rounds} rounds`);
  await page.screenshot({ path: 'tests/screenshots/boss-after.png' });

  // ---- treasure chest ----
  await gState(() => {
    const g = window.__game;
    g.player.x = 24.5; g.player.y = 13.02; g.player.z = -77.8;
    g.player.yaw = 0; g.player.pitch = -0.45;
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(400);
  const chestOpen = await gState(() => !!window.__game.ui.chestId);
  check('boss chest opens after victory', chestOpen);
  if (chestOpen) {
    await page.click('#take-all');
    await page.waitForTimeout(200);
    const gotLoot = await gState(() => window.__game.inventory.count('ironbud_charm') >= 1 && window.__game.inventory.coins >= 100);
    check('chest loot claimed', gotLoot);
  }

  // ---- defeat flow: hopeless fight → death screen → respawn ----
  await gState(() => {
    const g = window.__game;
    if (g.ui.chestId) g.ui.closeWindow();
    g.player.hp = 3;
    // spawn a fresh rat right here so the hopeless fight is deterministic
    g.player.x = 24.5; g.player.y = 13.02; g.player.z = -64.5;
    g.player.vx = g.player.vy = g.player.vz = 0;
    const def = window.__enemies.ENEMY_TYPES.gloomrat;
    g.enemyMgr.entities.set('test_rat', {
      id: 'test_rat', type: 'gloomrat', def,
      x: 25.5, y: 13, z: -64.5, homeX: 25.5, homeZ: -64.5,
      yaw: 0, hp: def.hp, wanderT: 99, transient: true,
    });
  });
  // watch for the fight (it may start and end within a second at 3 hp)
  let inFight = false, diedFast = false;
  for (let i = 0; i < 15; i++) {
    const st = await gState(() => ({ c: window.__game.combat.active, d: window.__game.player.dead }));
    if (st.c) inFight = true;
    if (st.d) { diedFast = true; break; }
    await page.waitForTimeout(400);
  }
  if (diedFast) inFight = true; // combat came and went — death is what we're after
  if (inFight) {
    // just end turns until we fall
    for (let i = 0; i < 30 && !diedFast; i++) {
      const st = await gState(() => {
        const g = window.__game;
        if (!g.combat.active) return { over: true };
        if (g.combat.current() === g.combat.playerC && !g.combat.pendingEnd) g.combat.endTurn();
        return { over: false };
      });
      if (st.over) break;
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1500);
    const death = await gState(() => ({
      dead: window.__game.player.dead,
      screenShown: !document.getElementById('death-screen').classList.contains('hidden'),
    }));
    check('defeat → death screen', death.dead && death.screenShown, JSON.stringify(death));
    await page.click('#respawn-btn');
    await page.waitForTimeout(800);
    const respawned = await gState(() => {
      const g = window.__game;
      return !g.player.dead && g.player.hp === g.player.maxHp && Math.hypot(g.player.x, g.player.z) < 20;
    });
    check('respawn at Brookhollow', respawned);
  } else {
    check('defeat flow (rats aggroed)', false, 'no combat started');
  }
} catch (e) {
  console.error('BOSS ERROR', e);
  await page.screenshot({ path: 'tests/screenshots/boss-error.png' }).catch(() => {});
  results.push({ name: 'no exception', ok: false });
} finally {
  const realErrors = errors.filter((e) => !e.includes('favicon'));
  if (realErrors.length) { console.log('CONSOLE ERRORS:'); realErrors.forEach((e) => console.log('  •', e)); }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 && realErrors.length === 0 ? 'BOSS PASS' : `BOSS FAIL (${failed.length})`);
  process.exitCode = failed.length || realErrors.length ? 1 : 0;
  await browser.close();
  server.kill();
}
