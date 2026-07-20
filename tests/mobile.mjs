// Mobile e2e: touch controls (joystick, camera drag, action button, hotbar),
// responsive layout, combat action bar on a phone viewport.
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8745;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 }, // landscape phone
  hasTouch: true,
  isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// simulate a held touch drag via touchscreen events
async function touchDrag(x0, y0, x1, y1, steps = 8, holdMs = 400) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }],
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x0 + (x1 - x0) * (i / steps), y: y0 + (y1 - y0) * (i / steps), id: 1 }],
    });
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(holdMs);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'mobiletest');
  await page.tap('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1500);

  check('touch UI shown', await page.isVisible('#touch-ui'));
  check('joystick visible', await page.isVisible('#joystick-base'));
  check('action buttons visible', await page.isVisible('#btn-action') && await page.isVisible('#btn-jump'));

  // ---- joystick movement ----
  const before = await page.evaluate(() => [window.__game.player.x, window.__game.player.z]);
  const joy = await page.locator('#joystick-base').boundingBox();
  const jx = joy.x + joy.width / 2, jy = joy.y + joy.height / 2;
  await touchDrag(jx, jy, jx, jy - 45, 6, 1600);
  const after = await page.evaluate(() => [window.__game.player.x, window.__game.player.z]);
  const moved = Math.hypot(after[0] - before[0], after[1] - before[1]);
  check('joystick moves player', moved > 1.5, `${moved.toFixed(2)} blocks`);

  // ---- camera drag ----
  const yawBefore = await page.evaluate(() => window.__game.player.yaw);
  await touchDrag(650, 200, 500, 200, 10, 100);
  const yawAfter = await page.evaluate(() => window.__game.player.yaw);
  check('camera drag turns view', Math.abs(yawAfter - yawBefore) > 0.15, `Δyaw=${(yawAfter - yawBefore).toFixed(2)}`);

  // ---- hold-to-gather with ✦ button ----
  const tree = await page.evaluate(() => {
    const g = window.__game;
    let best = null, bd = 1e9;
    for (const n of g.world.nodesById.values()) {
      if (n.type !== 'tree_fernwood') continue;
      const st = g.world.nodeState(n.id);
      if (st.state !== 'ready') continue;
      const d = Math.hypot(n.x - 24, n.z);
      if (d < bd) { bd = d; best = { x: n.x, y: n.y, z: n.z } }
    }
    return best;
  });
  await page.evaluate(([t]) => {
    const g = window.__game;
    g.player.x = t.x + 0.5 - 2; g.player.y = 31.02; g.player.z = t.z + 0.5;
    g.player.vx = g.player.vy = g.player.vz = 0;
    const dx = t.x + 0.5 - g.player.x, dy = t.y + 1 - (g.player.y + 1.62), dz = t.z + 0.5 - g.player.z;
    g.player.yaw = Math.atan2(-dx, -dz);
    g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }, [tree]);
  await page.waitForTimeout(300);
  const act = await page.locator('#btn-action').boundingBox();
  await touchDrag(act.x + act.width / 2, act.y + act.height / 2, act.x + act.width / 2, act.y + act.height / 2, 1, 9000);
  const logs = await page.evaluate(() => window.__game.inventory.count('fernwood_log'));
  check('hold ✦ gathers wood', logs >= 1, `${logs} logs`);

  // ---- hotbar + menu buttons are tappable ----
  await page.tap('.menu-btn[data-win="inventory"]');
  await page.waitForTimeout(300);
  check('inventory opens on tap', await page.isVisible('#game-window'));
  await page.tap('#window-close');
  await page.waitForTimeout(200);

  // ---- combat UI on mobile ----
  await page.evaluate(() => {
    const g = window.__game;
    const e = [...g.enemyMgr.entities.values()].find((en) => en.type === 'practice_dummy');
    g.player.x = e.x - 1.1; g.player.y = 31.02; g.player.z = e.z; // adjacent tile → Strike in range
    g.startCombat(e);
  });
  await page.waitForTimeout(900);
  check('combat UI visible on phone', await page.isVisible('#combat-actions'));
  const btns = await page.locator('.combat-btn').count();
  check('combat action buttons present', btns >= 5, `${btns} buttons`);
  // hotbar hidden during combat (no overlap)
  check('hotbar hidden in combat', !(await page.isVisible('#hotbar')));
  // tap an ability then tap enemy on screen (two-tap: select, confirm)
  await page.tap('.combat-btn[data-cbt="ability"]');
  await page.waitForTimeout(300);
  const enemyScreen = await page.evaluate(() => {
    const g = window.__game;
    const e = g.combat.enemies()[0];
    const t = g.combat.tileAt(e.gx, e.gz);
    return g.renderer.project(e.gx + 0.5, t.y + 1, e.gz + 0.5);
  });
  if (enemyScreen) {
    await page.tap('body', { position: { x: enemyScreen[0], y: enemyScreen[1] } }).catch(() => {});
    await page.touchscreen.tap(enemyScreen[0], enemyScreen[1]);
    await page.waitForTimeout(300);
    await page.touchscreen.tap(enemyScreen[0], enemyScreen[1]); // confirm
    await page.waitForTimeout(500);
  }
  const struck = await page.evaluate(() => {
    const g = window.__game;
    const e = g.combat.enemies()[0];
    return !g.combat.active || e.hp < e.maxHp || g.combat.usedAction;
  });
  check('tap-to-attack works', struck);
  await page.screenshot({ path: 'tests/screenshots/mobile-combat.png' });

  // flee to end cleanly
  await page.evaluate(() => { const c = window.__game.combat; if (c.active) c.finish('fled'); });
} catch (e) {
  console.error('MOBILE ERROR', e);
  await page.screenshot({ path: 'tests/screenshots/mobile-error.png' }).catch(() => {});
  results.push({ name: 'no exception', ok: false });
} finally {
  const realErrors = errors.filter((e) => !e.includes('favicon'));
  if (realErrors.length) { console.log('CONSOLE ERRORS:'); realErrors.forEach((e) => console.log('  •', e)); }
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 && realErrors.length === 0 ? 'MOBILE PASS' : `MOBILE FAIL (${failed.length})`);
  process.exitCode = failed.length || realErrors.length ? 1 : 0;
  await browser.close();
  server.kill();
}
