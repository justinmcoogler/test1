// Classic camera e2e: third-person orbit view + click-to-move + click-to-act.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8750;
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

// project a world position to screen coords inside the page
const screenPos = (x, y, z) => gState(([x, y, z]) => window.__game.renderer.project(x, y, z), [x, y, z]);

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'classictest');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);
  await gState(() => {
    const g = window.__game;
    g.disableAggro = true;
    g.settings.classicCamera = true;
    g.applySettings();
    g.camYaw = g.player.yaw;
  });
  await page.waitForTimeout(600);

  // ---- 1. Camera is third-person and the player model renders ----
  const cam = await gState(() => {
    const g = window.__game;
    const eye = g.renderer.camPos;
    const d = Math.hypot(eye[0] - g.player.x, eye[1] - (g.player.y + 1.4), eye[2] - g.player.z);
    const ents = g.collectEntities(0.016);
    return { camDist: +d.toFixed(1), hasPlayerModel: ents.some((e) => e.model === g.playerModelName) };
  });
  check('camera pulled back from player', cam.camDist > 4, `${cam.camDist} blocks`);
  check('player character visible in third person', cam.hasPlayerModel);

  // ---- 2. Click the ground → walk there ----
  const dest = await gState(() => {
    const g = window.__game;
    // pick a spot ~6 blocks ahead of the camera direction
    const x = Math.floor(g.player.x) + 6, z = Math.floor(g.player.z);
    return [x + 0.5, g.world.surfaceAt(x, z) + 1, z + 0.5];
  });
  const sp = await screenPos(dest[0], dest[1], dest[2]);
  check('destination projects on screen', !!sp, JSON.stringify(sp));
  const before = await gState(() => [window.__game.player.x, window.__game.player.z]);
  await page.mouse.click(sp[0], sp[1]);
  await page.waitForTimeout(300);
  const targetSet = await gState(() => window.__game.moveTarget && [window.__game.moveTarget.x, window.__game.moveTarget.z]);
  check('click sets move target', !!targetSet, JSON.stringify(targetSet));
  await page.waitForTimeout(3500);
  const after = await gState(([dest]) => {
    const g = window.__game;
    return {
      pos: [+g.player.x.toFixed(1), +g.player.z.toFixed(1)],
      distToDest: +Math.hypot(g.player.x - dest[0], g.player.z - dest[2]).toFixed(2),
      targetCleared: !g.moveTarget,
    };
  }, [dest]);
  check('player walked to the clicked spot', after.distToDest < 1.2 && after.targetCleared, JSON.stringify(after));

  // ---- 3. Click a tree → walks over and auto-gathers ----
  await gState(() => { window.__game.inventory.add('crude_axe', 1); });
  const tree = await gState(() => {
    const g = window.__game;
    let best = null, bd = 1e9;
    for (const n of g.world.nodesById.values()) {
      if (n.type !== 'tree_pine') continue;
      const st = g.world.nodeState(n.id);
      if (st.state !== 'ready') continue;
      const d = Math.hypot(n.x - g.player.x, n.z - g.player.z);
      if (d < bd) { bd = d; best = { x: n.x, y: n.y, z: n.z, d: Math.round(d) }; }
    }
    return best;
  });
  // teleport reasonably close so the walk is quick, then click the trunk
  await gState(([t]) => {
    const g = window.__game;
    const sx = t.x - 5, sz = t.z;
    g.player.x = sx; g.player.z = sz;
    g.player.y = (g.world.groundNear(Math.floor(sx), Math.floor(sz), 65) ?? 65) + 0.02;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.camYaw = Math.atan2(-(t.x - sx), -(t.z - sz)); // face camera toward the tree
  }, [tree]);
  await page.waitForTimeout(400);
  const treeScreen = await screenPos(tree.x + 0.5, tree.y + 1, tree.z + 0.5);
  check('tree projects on screen', !!treeScreen);
  const logsBefore = await gState(() => window.__game.inventory.count('pine_log'));
  await page.mouse.click(treeScreen[0], treeScreen[1]);
  await page.waitForTimeout(400);
  const pending = await gState(() => window.__game.pendingInteract?.kind || window.__game.autoGatherNode?.type || 'none');
  check('tree click queues gather', pending === 'node' || pending === 'tree_pine', pending);
  await page.waitForTimeout(12000); // walk + a few chops
  const logsAfter = await gState(() => window.__game.inventory.count('pine_log'));
  check('auto-gather chopped logs', logsAfter > logsBefore, `${logsBefore}→${logsAfter}`);

  // ---- 4. Click a creature → walks over and engages classic combat ----
  await gState(() => {
    const g = window.__game;
    g.autoGatherNode = null;
    g.inventory.add('wooden_cudgel', 1);
    const i = g.inventory.slots.findIndex((s) => s && s.item === 'wooden_cudgel');
    if (i >= 0) g.inventory.equipFromSlot(i);
  });
  const dummy = await gState(() => {
    const g = window.__game;
    const e = [...g.enemyMgr.entities.values()].find((en) => en.type === 'practice_dummy');
    if (!e) return null;
    e.hp = 999; // keep it standing for the whole assert window
    const sx = e.x - 6, sz = e.z;
    g.player.x = sx; g.player.z = sz;
    g.player.y = (g.world.groundNear(Math.floor(sx), Math.floor(sz), 65) ?? 65) + 0.02;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.camYaw = Math.atan2(-(e.x - sx), -(e.z - sz));
    return { x: e.x, y: e.y, z: e.z };
  });
  await page.waitForTimeout(400);
  const dummyScreen = await screenPos(dummy.x, dummy.y + 0.9, dummy.z);
  await page.mouse.click(dummyScreen[0], dummyScreen[1]);
  await page.waitForTimeout(6000); // walk over + engage + a swing or two
  const combatState = await gState(() => ({
    engaged: window.__game.combatRS.active,
    target: window.__game.combatRS.target?.type,
  }));
  check('click-to-attack engages combat', combatState.engaged && combatState.target === 'practice_dummy', JSON.stringify(combatState));
  await gState(() => window.__game.combatRS.finish?.call ? null : window.__game.combatRS.disengageAll());

  // ---- 5. Shift+click a block → auto-break ----
  const block = await gState(() => {
    const g = window.__game;
    const x = Math.floor(g.player.x) + 2, z = Math.floor(g.player.z) + 1;
    const y = g.world.surfaceAt(x, z);
    return [x, y, z];
  });
  const blockScreen = await screenPos(block[0] + 0.5, block[1] + 0.5, block[2] + 0.5);
  if (blockScreen) {
    await page.keyboard.down('Shift');
    await page.mouse.click(blockScreen[0], blockScreen[1]);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(4500);
    const broken = await gState(([b]) => window.__game.world.getBlock(b[0], b[1], b[2]) === 0, [block]);
    check('shift+click breaks a block', broken);
  } else {
    check('shift+click breaks a block', false, 'block off-screen');
  }

  // ---- 6. WASD still walks (camera-relative) & zoom works ----
  const posW = await gState(() => [window.__game.player.x, window.__game.player.z]);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  const movedW = await gState(([p0]) => {
    const g = window.__game;
    return Math.hypot(g.player.x - p0[0], g.player.z - p0[1]);
  }, [posW]);
  check('WASD walks in classic view', movedW > 1.5, `${movedW.toFixed(1)} blocks`);
  const zoomBefore = await gState(() => window.__game.camDist);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(300);
  const zoomAfter = await gState(() => window.__game.camDist);
  check('wheel zooms the camera', zoomAfter !== zoomBefore, `${zoomBefore}→${zoomAfter}`);

  // ---- 6.5 Map travel + quest-trail dots (pathfinding) ----
  const travel = await gState(() => {
    const g = window.__game;
    const tx = g.player.x + 18, tz = g.player.z + 4;
    g.setTravelDest(tx, tz);
    return [tx, tz];
  });
  await page.waitForTimeout(2500);
  const travelMid = await gState(() => ({
    walking: !!(window.__game.moveTarget || window.__game.travelDest),
    dots: (window.__game.trailDots || []).length,
  }));
  check('map travel starts walking a path', travelMid.walking, JSON.stringify(travelMid));
  check('guide dots trail the route', travelMid.dots > 0, `${travelMid.dots} dots`);
  await page.waitForTimeout(9000);
  const travelDone = await gState(([t]) => {
    const g = window.__game;
    return +Math.hypot(g.player.x - t[0], g.player.z - t[1]).toFixed(1);
  }, [travel]);
  check('travel arrives near the marked spot', travelDone < 6, `${travelDone} blocks away`);
  // missing-tool feedback: double-click an ore with no pickaxe
  const toolMsg = await gState(() => {
    const g = window.__game;
    for (const s of g.inventory.slots) if (s && (s.item.includes('pickaxe'))) return 'had-pickaxe';
    const node = { def: { skill: 'mining', level: 1, tool: 'pickaxe', kind: 'ore' }, id: 'test' };
    return g.gatherBlockedReason(node.def);
  });
  check('missing-tool message names the pickaxe', typeof toolMsg === 'string' && toolMsg.includes('pickaxe'), String(toolMsg));

  // ---- 7. Toggle back to first person with V ----
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(400);
  const fp = await gState(() => {
    const g = window.__game;
    const eye = g.renderer.camPos;
    return {
      classic: g.settings.classicCamera,
      atEye: Math.hypot(eye[0] - g.player.x, eye[2] - g.player.z) < 0.5,
    };
  });
  check('V returns to first person', !fp.classic && fp.atEye, JSON.stringify(fp));

  await page.screenshot({ path: 'tests/screenshots/classic-view.png' });
} catch (e) {
  console.error('CLASSIC ERROR', e);
  await page.screenshot({ path: 'tests/screenshots/classic-error.png' }).catch(() => {});
  results.push({ name: 'no exception', ok: false });
} finally {
  const realErrors = errors.filter((er) => !er.includes('favicon'));
  if (realErrors.length) { console.log('CONSOLE ERRORS:'); realErrors.forEach((er) => console.log('  •', er)); }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 && realErrors.length === 0 ? 'CLASSIC PASS' : `CLASSIC FAIL (${failed.length})`);
  process.exitCode = failed.length || realErrors.length ? 1 : 0;
  await browser.close();
  server.kill();
}
