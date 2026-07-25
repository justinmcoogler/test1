// Drives the real game in headless Chromium to prove the bed works in play,
// which no unit test can: walk to the camp's bedroll, sleep through a real
// night, confirm the clock actually moved and the sun came up, then die and
// wake up at the bed instead of at the world spawn.
//
//   node tests/_sleep.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8777;
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
  await page.fill('#seed-input', 'firstnight');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => { window.__game.disableAggro = true; });
  await page.waitForTimeout(1200);

  // ---- the camp has a bed in it, and it is a whole one ---------------------
  const found = await page.evaluate(async () => {
    const g = window.__game;
    const { B } = await import('/js/world/blocks.js');
    let foot = null, head = null;
    for (const [k, id] of g.world.structure.edits) {
      const [x, y, z] = k.split(',').map(Number);
      if (id === B.bed) foot = [x, y, z];
      if (id === B.bed_head) head = [x, y, z];
    }
    return { foot, head, live: foot ? g.world.getBlock(...foot) === B.bed : false };
  });
  check(!!found.foot && !!found.head, `the camp bedroll is placed — foot ${found.foot}, head ${found.head}`);
  check(found.live, 'and it is still there after the chunk generated');
  // The two halves must be adjacent, or the renderer draws a bed with a gap in it.
  const adjacent = found.foot && found.head
    && Math.abs(found.foot[0] - found.head[0]) + Math.abs(found.foot[2] - found.head[2]) === 1;
  check(adjacent, 'the two halves are one cell apart');

  // ---- sleeping ------------------------------------------------------------
  const slept = await page.evaluate(async ([foot]) => {
    const g = window.__game;
    const { DAY_LEN } = await import('/js/world/world.js');
    // Stand at the bed and force night, then sleep.
    g.player.x = foot[0] + 0.5; g.player.z = foot[2] + 1.6; g.player.y = foot[1];
    g.player.vx = g.player.vy = g.player.vz = 0;
    // Wind the clock to the middle of the night rather than setting a phase
    // directly — world.time is the only clock and everything schedules off it.
    const toNight = ((0.75 - g.world.dayPhase() + 1) % 1) * DAY_LEN;
    g.world.time += toNight;
    const before = { t: g.world.time, night: g.world.isNight(), light: g.world.daylight() };
    g.player.hp = Math.max(1, Math.floor(g.player.maxHp * 0.3));
    const hpBefore = g.player.hp;
    g.trySleep(foot[0], foot[1], foot[2]);
    return {
      before, hpBefore,
      after: { t: g.world.time, night: g.world.isNight(), light: g.world.daylight() },
      hpAfter: g.player.hp,
      bedSpawn: g.bedSpawn,
    };
  }, [found.foot]);
  check(slept.before.night, 'it was night when we lay down');
  check(slept.after.t > slept.before.t, `the clock actually moved (+${Math.round(slept.after.t - slept.before.t)}s)`);
  check(!slept.after.night, `and it is no longer night (daylight ${slept.after.light.toFixed(2)})`);
  check(slept.hpAfter > slept.hpBefore, `you wake up better than you lay down (${slept.hpBefore} → ${slept.hpAfter})`);
  check(Array.isArray(slept.bedSpawn), 'sleeping set a respawn point');

  // ---- sleeping by daylight is refused, not silently done ------------------
  const byDay = await page.evaluate(([foot]) => {
    const g = window.__game;
    const t = g.world.time;
    g.trySleep(foot[0], foot[1], foot[2]);
    return { moved: g.world.time !== t, night: g.world.isNight() };
  }, [found.foot]);
  check(!byDay.night && !byDay.moved, 'clicking a bed in daylight does not burn a day');

  // ---- dying puts you back at the bed, not at the world spawn -------------
  const died = await page.evaluate(() => {
    const g = window.__game;
    const spawn = g.world.markers.spawn;
    // Walk a long way off first, so "woke at the bed" cannot be confused with
    // "never moved".
    g.player.x = spawn[0] + 120; g.player.z = spawn[2] + 120;
    g.player.y = g.world.surfaceAt(Math.floor(g.player.x), Math.floor(g.player.z)) + 1;
    const away = [g.player.x, g.player.z];
    g.player.hp = 0;
    g.player.dead = true;
    g.respawn();
    return {
      away,
      at: [g.player.x, g.player.z],
      bed: g.bedSpawn,
      spawn: [spawn[0], spawn[2]],
    };
  });
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  check(dist(died.at, died.away) > 100, 'death actually moved you');
  check(dist(died.at, [died.bed[0], died.bed[2]]) < 3,
    `you wake at your bed (${died.at.map((v) => v.toFixed(1))} vs bed ${died.bed})`);

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
  await page.screenshot({ path: 'tests/screenshots/sleep.png' });
} catch (e) {
  console.error('SLEEP ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nSLEEP FAIL (${fails.length})` : '\nSLEEP PASS');
process.exit(fails.length ? 1 : 0);
