// What the other children actually LOOK like, in two real browsers.
//
//   node tests/mpbody.mjs
//
// tests/coop.mjs proves the world is shared — same terrain, same blocks, same
// creatures. This proves the PEOPLE in it, which is a different thing and was
// wrong in three separate ways at once: every remote player was drawn facing
// backwards, none of them ever animated, and the day/night clock was private to
// each browser so one child could be standing in the morning while their sister
// was in the middle of the night.
//
// All three shared a shape — a value that was almost right and never checked
// against the thing it was supposed to match — so all three are checked here
// against the real thing rather than against themselves.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8796;
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

// A full day is 480s and night runs from about 230 to 450, so starting at 300
// opens the world in the dark. Otherwise testing sleep means waiting four
// minutes for sundown.
const server = spawn('node', [
  'server/server.mjs', '--port', String(PORT), '--seed', 'mpbody', '--no-save', '--time', '300',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
server.stdout.on('data', (d) => { out += d; });
server.stderr.on('data', (d) => { out += d; });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});

async function join(name) {
  const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
  page.on('pageerror', (e) => console.log(`  [${name}] pageerror:`, String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('#mp-row:not(.hidden)', { timeout: 15000 });
  await page.fill('#mp-name', name);
  await page.click('#mp-join');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 90000 });
  await page.waitForFunction(() => window.__net?.live === true, { timeout: 30000 });
  return page;
}

try {
  const upBy = Date.now() + 20000;
  while (!/On this machine/.test(out) && Date.now() < upBy) await new Promise((r) => setTimeout(r, 100));
  if (!/On this machine/.test(out)) throw new Error(`server never started:\n${out}`);

  const ada = await join('Ada');
  const bea = await join('Bea');
  await ada.waitForFunction(() => [...window.__net.players.values()].some((p) => p.name === 'Bea'), { timeout: 20000 });
  ok(true, 'Ada and Bea are in the same world');

  // ---- one clock -----------------------------------------------------------
  await ada.waitForTimeout(1200);
  const clocks = await Promise.all([ada, bea].map((p) => p.evaluate(() => ({
    t: window.__game.world.time,
    server: window.__net.serverTime,
    night: window.__game.world.isNight(),
  }))));
  ok(Number.isFinite(clocks[0].server), 'the room tells each browser what time it is');
  ok(Math.abs(clocks[0].t - clocks[1].t) < 3,
    `both children are at the same time of day (${clocks[0].t.toFixed(0)}s vs ${clocks[1].t.toFixed(0)}s)`);
  ok(Math.abs(clocks[0].t - clocks[0].server) < 5, 'and each browser tracks the server rather than its own clock');
  ok(clocks[0].night && clocks[1].night, 'it is night for both of them');

  // ---- facing --------------------------------------------------------------
  // Bea looks due north. A LOOK yaw of 0 points at -Z (js/player/player.js), and
  // the renderer turns a model's local +Z to (sin yaw, cos yaw) — so the drawn
  // direction is checked against where she is actually looking, not against the
  // number that was put on the wire.
  await bea.evaluate(() => {
    window.__game.player.yaw = 0;
    window.__game.player.x += 0.01;        // nudge past the input dedupe
  });
  await bea.waitForTimeout(600);
  const facing = await ada.evaluate(() => {
    const ent = window.__game.collectEntities(0.016).find((e) => e.label === 'Bea');
    return [Math.sin(ent.yaw), Math.cos(ent.yaw)];
  });
  ok(facing[1] < -0.9 && Math.abs(facing[0]) < 0.1,
    `Bea is drawn facing where she is looking, not 180° out (${facing.map((n) => n.toFixed(2))})`);

  // ---- animation -----------------------------------------------------------
  // A real held key through the real control path. She turns slowly as she goes,
  // so walking into a tent is a moment rather than the rest of the test.
  await bea.evaluate(() => {
    const g = window.__game;
    g.controls.enabled = true;
    window.__spin = setInterval(() => { g.player.yaw += 0.5; }, 250);
  });
  await bea.keyboard.down('KeyW');
  const walking = await ada.waitForFunction(
    () => [...window.__net.players.values()].some((p) => p.anim === 'walk'),
    { timeout: 25000 },
  ).then(() => true).catch(() => false);
  // The tag used to come from controls.worldMove, which only exists in classic
  // camera mode — so every first-person player, meaning the default and
  // therefore most of them, reported "idle" at a dead sprint.
  ok(walking, 'a walking player reports walking, in first person');
  // Sampled over a second, not once. A leg swing crosses zero twice a cycle, so
  // a single reading can legitimately be flat while the animation is running
  // perfectly — the thing that distinguishes moving from frozen is the RANGE.
  const posed = await ada.evaluate(async () => {
    let lo = Infinity, hi = -Infinity, frames = 0;
    const until = performance.now() + 1500;
    while (performance.now() < until) {
      await new Promise((r) => requestAnimationFrame(r));
      const ent = window.__game.collectEntities(0.016).find((e) => e.label === 'Bea');
      if (!ent?.pose?.leg_l) continue;
      const v = ent.pose.leg_l[6];
      lo = Math.min(lo, v); hi = Math.max(hi, v); frames++;
    }
    return { frames, range: hi - lo };
  });
  // Four frames is a low bar deliberately: two headless browsers on swiftshader
  // draw at single-digit FPS, and the range is the assertion — the frame count
  // only guards against calling one sample a range.
  ok(posed.frames >= 4 && posed.range > 0.05,
    `and her legs are actually swinging — the pose moves across ${posed.frames} frames (range ${posed.range.toFixed(3)})`);
  await bea.keyboard.up('KeyW');
  await bea.evaluate(() => clearInterval(window.__spin));

  // ---- nameplate -----------------------------------------------------------
  // Read the labels the game builds rather than the divs it projects them into,
  // so this is about whether Bea gets a nameplate at all and not about where the
  // camera happens to be pointing.
  const named = await ada.evaluate(() => {
    const g = window.__game;
    const rp = [...window.__net.players.values()][0];
    g.player.x = rp.x + 3; g.player.z = rp.z; g.player.y = rp.y;
    let seen = [];
    const orig = g.ui.updateLabels.bind(g.ui);
    g.ui.updateLabels = (labels) => { seen = labels.map((l) => l.name); orig(labels); };
    g.updateWorldLabels();
    g.ui.updateLabels = orig;
    return seen;
  });
  // collectEntities had been attaching a label to every remote body since
  // multiplayer landed and nothing ever read it, so four identical characters
  // ran around with nothing to tell them apart.
  ok(named.includes('Bea'), `Bea's name floats over her, so the kids can tell each other apart (${JSON.stringify(named)})`);

  // ---- sleeping ------------------------------------------------------------
  await ada.evaluate(() => {
    const g = window.__game;
    g.trySleep(Math.round(g.player.x), Math.round(g.player.y), Math.round(g.player.z));
  });
  const dawnForBoth = await Promise.all([ada, bea].map((p) => p.waitForFunction(
    () => !window.__game.world.isNight(), { timeout: 15000 },
  ).then(() => true).catch(() => false)));
  ok(dawnForBoth[0], 'Ada sleeps and wakes at dawn');
  // The whole point. Advancing the clock locally is what put one child in the
  // morning and their sister in the dark in the same world.
  ok(dawnForBoth[1], 'and it is dawn for Bea too, who never touched a bed');

  const after = await Promise.all([ada, bea].map((p) => p.evaluate(() => ({
    t: window.__game.world.time,
    live: window.__net.live,
    roster: [...window.__net.players.values()].map((o) => o.name),
    drawn: window.__game.collectEntities(0.016).filter((e) => e.label).map((e) => e.label),
    strays: [...window.__game.enemyMgr.entities.keys()].filter((id) => !window.__net.mobs.has(id)).length,
  }))));
  ok(Math.abs(after[0].t - after[1].t) < 3,
    `their clocks are still together afterwards (${after[0].t.toFixed(0)}s vs ${after[1].t.toFixed(0)}s)`);
  ok(after[0].live && after[1].live, 'both are still connected');
  ok(after[0].drawn.includes('Bea') && after[1].drawn.includes('Ada'),
    'and they can still see each other, which is what a night in a bed should cost');
  // trySleep used to call enemyMgr.refresh() unconditionally, which in
  // multiplayer runs the LOCAL spawner and invents a few hundred creatures the
  // server has never heard of.
  ok(after[0].strays === 0, `sleeping spawned no phantom creatures (${after[0].strays})`);

  await ada.close();
  await bea.close();
} catch (err) {
  console.error('MPBODY ERROR', err);
  console.error(out.slice(-2000));
  failures++;
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

console.log(failures ? `\nMPBODY FAIL (${failures})` : '\nMPBODY PASS');
process.exit(failures ? 1 : 0);
