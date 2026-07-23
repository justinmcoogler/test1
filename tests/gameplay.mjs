// Full gameplay-loop e2e: quests, gathering, crafting, building, mining,
// smelting, turn-based combat, saving/reloading. Drives the real input paths.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8742;
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
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// Teleport the player (snapped to standable ground) and face a target cell.
async function teleportFacing(px, py, pz, tx, ty, tz) {
  await page.evaluate(async ([px, py, pz, tx, ty, tz]) => {
    const g = window.__game;
    g.world.ensureChunk(Math.floor(px / 16), Math.floor(pz / 16));
    // find air with solid below, starting near the requested y
    let y = py;
    const solid = (yy) => g.world.collisionHeight(Math.floor(px), yy, Math.floor(pz)) > 0;
    for (let i = 0; i < 24; i++) {
      if (!solid(Math.floor(y)) && !solid(Math.floor(y) + 1) && solid(Math.floor(y) - 1)) break;
      if (solid(Math.floor(y))) y += 1; else y -= 1;
    }
    g.player.x = px; g.player.y = Math.floor(y) + 0.02; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    const dx = tx + 0.5 - px, dy = ty + 0.5 - (g.player.y + 1.62), dz = tz + 0.5 - pz;
    g.player.yaw = Math.atan2(-dx, -dz);
    g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }, [px, py, pz, tx, ty, tz]);
  await page.waitForTimeout(250);
}

const holdPrimary = (on) => page.evaluate((v) => { window.__game.controls.leftDown = v; }, on);
const gState = (fn, arg) => page.evaluate(fn, arg);

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'looptest');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1500);
  check('boot', true);
  await gState(() => { window.__game.settings.tacticalCombat = true; }); // this suite exercises tactical mode

  // ---- 1. Talk to Elder Maren, accept the first quest ----
  const maren = await gState(() => window.__game.world.structure.npcs.find((n) => n.id === 'maren'));
  await teleportFacing(maren.x + 0.5, 65, maren.z + 2.5, maren.x, 66, maren.z);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(300);
  check('dialogue opens', await page.isVisible('#dialogue'));
  await page.click('#dialogue-options .dialog-btn:nth-child(2)'); // "What should I do first?"
  await page.waitForTimeout(200);
  const questBtn = page.locator('.dialog-btn.quest-offer').first();
  check('quest offered', await questBtn.count() > 0);
  await questBtn.click();
  await page.waitForTimeout(200);
  await page.click('#dialogue-options .dialog-btn'); // "I'll get to it."
  const q1Active = await gState(() => window.__game.quests.state.q_arrival?.status);
  check('quest q_arrival active', q1Active === 'active');

  // ---- 2. Visit the grove, then chop a fernwood tree there ----
  await teleportFacing(24.5, 65, 0.5, 24, 65, 4); // grove marker
  await page.waitForTimeout(600);
  const groveReached = await gState(() => window.__game.quests.state.q_arrival?.stage >= 1);
  check('grove reach stage advanced', groveReached);
  const tree = await gState(() => {
    const g = window.__game;
    let best = null, bd = 1e9;
    for (const n of g.world.nodesById.values()) {
      if (n.type !== 'tree_pine') continue;
      const d = Math.hypot(n.x - 24, n.z);
      if (d < bd) { bd = d; best = { x: n.x, y: n.y, z: n.z, id: n.id }; }
    }
    return best;
  });
  check('grove tree exists', !!tree);
  await teleportFacing(tree.x + 0.5 - 2, 65, tree.z + 0.5, tree.x, tree.y + 1, tree.z);
  await holdPrimary(true);
  await page.waitForTimeout(14000); // several chops (~3.3s each with the worn hatchet)
  await holdPrimary(false);
  const logs = await gState(() => window.__game.inventory.count('pine_log'));
  check('chopped logs', logs >= 3, `${logs} logs`);
  const wcXp = await gState(() => window.__game.skills.xp.woodcutting);
  check('woodcutting xp gained', wcXp > 0, `${wcXp} xp`);

  // Realistic pine trees deplete at a few logs each, so the tutorial's 5 may need
  // a second tree. Gather from ready pines until we hold 5 (deterministic, not a
  // single fixed wait that a low charge roll could leave short).
  for (let attempt = 0; attempt < 4; attempt++) {
    const have = await gState(() => window.__game.inventory.count('pine_log'));
    if (have >= 5) break;
    const t = await gState(() => {
      const g = window.__game; let best = null, bd = 1e9;
      for (const n of g.world.nodesById.values()) {
        const st = g.world.nodeState(n.id);
        if (n.type === 'tree_pine' && st.state === 'ready' && Math.hypot(n.x, n.z) < 60) {
          const d = Math.hypot(n.x - g.player.x, n.z - g.player.z);
          if (d < bd) { bd = d; best = { x: n.x, y: n.y, z: n.z }; }
        }
      }
      return best;
    });
    if (!t) break;
    await teleportFacing(t.x + 0.5 - 2, 65, t.z + 0.5, t.x, t.y + 1, t.z);
    await holdPrimary(true);
    await page.waitForTimeout(12000);
    await holdPrimary(false);
  }
  const collected = await gState(() => window.__game.inventory.count('pine_log'));
  check('collected 5 logs for the quest', collected >= 5, `${collected} logs`);

  // ---- 3. Node depletion & regeneration lifecycle (deterministic) ----
  const lifecycle = await gState(async () => {
    const g = window.__game;
    // nearest ready fernwood: force 1 remaining charge, gather it, watch respawn
    let node = null, bd = 1e9;
    for (const n of g.world.nodesById.values()) {
      const st = g.world.nodeState(n.id);
      if (n.type === 'tree_pine' && st.state === 'ready') {
        const d = Math.hypot(n.x - g.player.x, n.z - g.player.z);
        if (d < bd) { bd = d; node = n; }
      }
    }
    if (!node) return { ok: false, reason: 'no ready tree' };
    g.world.nodeStates.get(node.id).remaining = 1;
    g.completeGather(node, null);
    const st = g.world.nodeState(node.id);
    const depleted = st.state === 'depleted' && st.respawnAt > g.world.time;
    const stumpBlock = g.world.getBlock(node.x, node.y, node.z);
    // fast-forward the respawn timer
    st.respawnAt = g.world.time + 0.5;
    await new Promise((r) => setTimeout(r, 1200));
    const st2 = g.world.nodeState(node.id);
    const regrown = st2.state === 'ready' && st2.remaining > 0;
    const trunkBlock = g.world.getBlock(node.x, node.y, node.z);
    return { ok: depleted && regrown, depleted, regrown, stumpBlock, trunkBlock };
  });
  check('node depletes → stump → regrows', lifecycle.ok, JSON.stringify(lifecycle));

  // ---- 4. Craft a workbench via the real crafting UI ----
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(300);
  const wbRow = page.locator('.craft-row', { hasText: 'Workbench' }).first();
  await wbRow.click();
  await page.waitForTimeout(200);
  // need planks first: craft planks
  const planksRow = page.locator('.craft-row', { hasText: 'Planks' }).first();
  await planksRow.click();
  await page.waitForTimeout(150);
  await page.click('[data-craft="5"]');
  await page.waitForTimeout(150);
  await wbRow.click();
  await page.waitForTimeout(150);
  await page.click('[data-craft="1"]');
  await page.waitForTimeout(200);
  const hasWb = await gState(() => window.__game.inventory.count('workbench'));
  check('crafted workbench via UI', hasWb >= 1);
  await page.keyboard.press('Escape');

  // ---- 5. Return to Maren, turn in quest ----
  await teleportFacing(maren.x + 0.5, 65, maren.z + 2.5, maren.x, 66, maren.z);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(250);
  await page.click('#dialogue-options .dialog-btn:nth-child(2)');
  await page.waitForTimeout(250);
  const readyBtn = page.locator('.dialog-btn.quest-ready').first();
  check('quest turn-in offered', await readyBtn.count() > 0);
  if (await readyBtn.count()) {
    await readyBtn.click();
    await page.waitForTimeout(200);
    await page.click('#dialogue-options .dialog-btn');
  }
  const q1Done = await gState(() => window.__game.quests.state.q_arrival?.status);
  const coins = await gState(() => window.__game.inventory.coins);
  check('quest q_arrival completed', q1Done === 'done', `coins=${coins}`);
  await gState(() => { // make sure no dialogue/window is left open
    const g = window.__game;
    if (g.dialogueOpen) g.ui.hideDialogue();
    g.ui.closeWindow();
  });
  await page.waitForTimeout(200);

  // ---- 6. Place blocks (workbench + walls) ----
  await gState(() => {
    const g = window.__game;
    // put workbench in hotbar slot 0 and select it
    const idx = g.inventory.slots.findIndex((s) => s && s.item === 'workbench');
    if (idx > 0) g.inventory.moveSlot(idx, 0);
    g.inventory.selected = 0;
  });
  const spot = await gState(() => {
    const g = window.__game;
    const x = Math.floor(g.player.x) + 3, z = Math.floor(g.player.z);
    return { x, z, y: g.world.surfaceAt(x, z) };
  });
  await teleportFacing(spot.x - 2 + 0.5, 65.5, spot.z + 0.5, spot.x, spot.y, spot.z);
  await gState(() => window.__game.onSecondary());
  await page.waitForTimeout(200);
  const placed = await gState(() => {
    let n = 0;
    for (const [, m] of window.__game.world.editedBlocks) n += m.size;
    return n;
  });
  check('block placed & recorded as edit', placed > 0, `${placed} edits`);

  // ---- 7. Mine copper in the settlement mine ----
  await gState(() => window.__game.inventory.add('crude_pickaxe', 1));
  const ore = await gState(() => {
    const g = window.__game;
    // force-load mine chunks
    for (let cx = 0; cx <= 2; cx++) for (let cz = -5; cz <= -2; cz++) g.world.ensureChunk(cx, cz);
    for (const n of g.world.nodesById.values()) {
      if (n.type === 'ore_copper' && n.z < -40) return { x: n.x, y: n.y, z: n.z };
    }
    return null;
  });
  check('mine copper node exists', !!ore);
  await teleportFacing(ore.x + 0.5 - 2, 53, ore.z + 0.5, ore.x, ore.y, ore.z);
  await holdPrimary(true);
  await page.waitForTimeout(9000);
  await holdPrimary(false);
  const copper = await gState(() => window.__game.inventory.count('copper_ore'));
  check('mined copper', copper >= 1, `${copper} ore`);
  const miningXp = await gState(() => window.__game.skills.xp.mining);
  check('mining xp gained', miningXp > 0, `${miningXp}`);

  // ---- 8. Smelt copper at the workshop furnace (the first realistic metal) ----
  await gState(() => {
    const g = window.__game;
    g.inventory.add('copper_ore', 4);
    g.inventory.add('charcoal', 4); // fuel hot enough to smelt copper
  });
  await teleportFacing(12.5, 65, -12.5, 12, 65, -14); // workshop, near furnace
  await page.waitForTimeout(300);
  const smelted = await gState(() => {
    const g = window.__game;
    const stations = g.nearbyStations();
    if (!stations.has('furnace')) return { ok: false, reason: 'no furnace nearby: ' + [...stations] };
    const { RECIPES, craft, canCraft } = window.__crafting;
    const rec = RECIPES.find((r) => r.out === 'copper_bar');
    // without fuel it must refuse; with charcoal it smelts and burns one
    g.inventory.consumeAll([{ item: 'charcoal', qty: g.inventory.count('charcoal') }]);
    const noFuel = canCraft(rec, g.inventory, g.skills, stations).ok;
    g.inventory.add('charcoal', 4);
    const before = g.inventory.count('charcoal');
    const res = craft(rec, g.inventory, g.skills, stations);
    return { ok: res.ok, noFuel, bars: g.inventory.count('copper_bar'), fuelBurned: before - g.inventory.count('charcoal') };
  });
  check('smelted copper at furnace (fuel-gated + burned)', smelted.ok && smelted.noFuel === false && smelted.fuelBurned === 1, JSON.stringify(smelted));

  // ---- 9. Turn-based combat vs the practice dummy ----
  const dummy = await gState(() => {
    const g = window.__game;
    for (const e of g.enemyMgr.entities.values()) {
      if (e.type === 'practice_dummy') return { x: e.x, y: e.y, z: e.z };
    }
    return null;
  });
  check('practice dummy exists', !!dummy);
  await gState(() => {
    const g = window.__game;
    g.inventory.add('wooden_cudgel', 1);
    const idx = g.inventory.slots.findIndex((s) => s && s.item === 'wooden_cudgel');
    g.inventory.equipFromSlot(idx);
  });
  await teleportFacing(dummy.x - 2, 65, dummy.z, Math.floor(dummy.x), 65, Math.floor(dummy.z));
  await gState(() => {
    const g = window.__game;
    const e = [...g.enemyMgr.entities.values()].find((e) => e.type === 'practice_dummy');
    g.startCombat(e);
  });
  await page.waitForTimeout(800);
  check('combat started', await gState(() => window.__game.combat.active));
  check('combat UI visible', await page.isVisible('#combat-ui'));
  const turnChips = await page.locator('.turn-chip').count();
  check('turn order shown', turnChips >= 2, `${turnChips} combatants`);

  // fight: repeatedly strike when it's our turn
  for (let i = 0; i < 20; i++) {
    const st = await gState(() => {
      const g = window.__game;
      if (!g.combat.active) return { over: true };
      const cur = g.combat.current();
      return { over: false, ourTurn: cur === g.combat.playerC, usedAction: g.combat.usedAction };
    });
    if (st.over) break;
    if (st.ourTurn && !st.usedAction) {
      const acted = await gState(() => {
        const g = window.__game;
        const targets = g.combat.getAbilityTargets('strike');
        if (targets.length) { g.combat.doAbility('strike', targets[0]); return 'attacked'; }
        // move toward the enemy
        const reach = g.combat.getMovableTiles();
        const enemy = g.combat.enemies()[0];
        let best = null, bd = 1e9;
        for (const key of reach.keys()) {
          const t = g.combat.tiles.get(key);
          const d = Math.abs(t.gx - enemy.gx) + Math.abs(t.gz - enemy.gz);
          if (d < bd) { bd = d; best = t; }
        }
        if (best) { g.combat.doMove(best.gx, best.gz); return 'moved'; }
        return 'stuck';
      });
      if (acted === 'attacked' || acted === 'stuck') {
        await gState(() => window.__game.combat.active && window.__game.combat.endTurn());
      }
    }
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1500);
  const afterCombat = await gState(() => ({
    active: window.__game.combat.active,
    strXp: window.__game.skills.xp.strength,
    vitXp: window.__game.skills.xp.vitality,
    dummyGone: ![...window.__game.enemyMgr.entities.values()].some((e) => e.type === 'practice_dummy'),
  }));
  check('combat won & ended', !afterCombat.active && afterCombat.dummyGone, JSON.stringify(afterCombat));
  check('combat skill xp granted', afterCombat.strXp > 0 && afterCombat.vitXp > 0);

  // ---- 9b. Player-placed chest storage survives reload ----
  const chestPos = await gState(() => {
    const g = window.__game;
    const x = Math.floor(g.player.x) + 2, z = Math.floor(g.player.z) + 2;
    g.world.ensureChunk(Math.floor(x / 16), Math.floor(z / 16));
    const y = g.world.surfaceAt(x, z) + 1;
    g.world.setBlock(x, y, z, window.__blocks.B.chest_block, true);
    const id = g.world.registerPlayerChest(x, y, z);
    g.world.openChest(id).push({ item: 'rough_stone', qty: 7 });
    return [x, y, z];
  });

  // ---- 10. Save, reload, verify persistence ----
  const preSave = await gState(() => {
    const g = window.__game;
    g.saveGame();
    return {
      logs: g.inventory.count('pine_log'),
      wcXp: g.skills.xp.woodcutting,
      coins: g.inventory.coins,
      quest: g.quests.state.q_arrival?.status,
      edits: [...g.world.editedBlocks.values()].reduce((n, m) => n + m.size, 0),
      depleted: [...g.world.nodeStates.values()].filter((s) => s.state === 'depleted').length,
      time: Math.round(g.world.time),
    };
  });
  await page.reload();
  await page.waitForSelector('.slot-btn');
  await page.click('.slot-btn'); // continue slot 1
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);
  const postLoad = await gState(() => {
    const g = window.__game;
    return {
      logs: g.inventory.count('pine_log'),
      wcXp: g.skills.xp.woodcutting,
      coins: g.inventory.coins,
      quest: g.quests.state.q_arrival?.status,
      edits: [...g.world.editedBlocks.values()].reduce((n, m) => n + m.size, 0),
      depleted: [...g.world.nodeStates.values()].filter((s) => s.state === 'depleted').length,
      time: Math.round(g.world.time),
    };
  });
  const persistOk = preSave.logs === postLoad.logs && preSave.wcXp === postLoad.wcXp &&
    preSave.coins === postLoad.coins && preSave.quest === postLoad.quest &&
    postLoad.edits >= preSave.edits && postLoad.time >= preSave.time - 1;
  check('save/reload persistence', persistOk, `pre=${JSON.stringify(preSave)} post=${JSON.stringify(postLoad)}`);

  // player chest contents intact after reload — interacting must not wipe them
  const chestAfter = await gState(([x, y, z]) => {
    const g = window.__game;
    g.world.ensureChunk(Math.floor(x / 16), Math.floor(z / 16));
    const chest = g.world.getChestAt(x, y, z);
    if (!chest) return { found: false };
    const id = g.world.registerPlayerChest(x, y, z); // simulate the interact path
    const contents = g.world.openChest(id);
    return { found: true, stone: contents.find((c) => c.item === 'rough_stone')?.qty || 0 };
  }, chestPos);
  check('player chest storage survives reload', chestAfter.found && chestAfter.stone === 7, JSON.stringify(chestAfter));

  await page.screenshot({ path: 'tests/screenshots/gameplay-end.png' });
} catch (e) {
  console.error('GAMEPLAY ERROR', e);
  await page.screenshot({ path: 'tests/screenshots/gameplay-error.png' }).catch(() => {});
  results.push({ name: 'no exception', ok: false, detail: String(e) });
} finally {
  const realErrors = errors.filter((e) => !e.includes('favicon'));
  if (realErrors.length) {
    console.log('CONSOLE ERRORS:');
    realErrors.forEach((e) => console.log('  •', e));
  }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 && realErrors.length === 0 ? 'GAMEPLAY PASS' : `GAMEPLAY FAIL (${failed.length} failed checks)`);
  process.exitCode = failed.length || realErrors.length ? 1 : 0;
  await browser.close();
  server.kill();
}
