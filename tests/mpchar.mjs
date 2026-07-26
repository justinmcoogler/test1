// The room keeps your character, not the browser.
//
//   node tests/mpchar.mjs
//
// This is the test the feature exists for. A child plays on the iPad, puts it
// down, picks up the laptop — and arrives with the same pack, the same levels
// and the same quest log, standing where they left off. Before this, the world
// was shared and the person in it was not: skills and inventory lived in each
// browser's localStorage, so a second device meant empty pockets.
//
// Two REAL browser contexts, with separate storage, are the whole point. A
// single page reloaded would pass while still reading its own localStorage,
// which is exactly the bug.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = 8794;
const DIR = 'tests/.tmp-saves';
const SAVE = join(DIR, 'mpchar-test.json');

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

let server = null;
let out = '';
function start() {
  out = '';
  server = spawn('node', ['server/server.mjs', '--port', String(PORT), '--seed', 'mpchar', '--save', SAVE], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => { out += d; });
  server.stderr.on('data', (d) => { out += d; });
  return new Promise((resolve, reject) => {
    const by = Date.now() + 25000;
    const poll = setInterval(() => {
      if (/On this machine/.test(out)) { clearInterval(poll); resolve(); }
      else if (Date.now() > by) { clearInterval(poll); reject(new Error(`server never started:\n${out}`)); }
    }, 100);
  });
}
// SIGTERM, not SIGKILL: the shutdown path is what writes the save.
function stop() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.once('exit', () => { server = null; resolve(); });
    server.kill('SIGTERM');
  });
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});

// A FRESH CONTEXT EACH TIME — its own localStorage, its own everything. This is
// "a different tablet", not "the same tablet again".
async function joinFrom(name) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [${name}] pageerror:`, String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('#mp-row:not(.hidden)', { timeout: 15000 });
  await page.fill('#mp-name', name);
  await page.click('#mp-join');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 90000 });
  await page.waitForFunction(() => window.__net?.live === true, { timeout: 30000 });
  return { ctx, page };
}

const look = (page) => page.evaluate(() => ({
  mining: window.__game.skills.xp.mining,
  woodcutting: window.__game.skills.xp.woodcutting,
  logs: window.__game.inventory.count('pine_log'),
  coins: window.__game.inventory.coins,
  at: [Math.round(window.__game.player.x), Math.round(window.__game.player.z)],
  // Character blobs and world slots. Settings and the remembered join name are
  // deliberately NOT counted: text scale, a left-handed layout and camera
  // sensitivity are properties of the screen in front of you, not of the child,
  // and they should stay on the device they were chosen on.
  stored: Object.keys(window.localStorage).filter((k) => /^sproutlands_(char|slot)_/.test(k)),
}));

try {
  await rm(DIR, { recursive: true, force: true });
  await mkdir(DIR, { recursive: true });
  await start();

  // ---- device one ----------------------------------------------------------
  const one = await joinFrom('Ada');
  ok(true, 'Ada joins on the first device');

  const walked = await one.page.evaluate(async () => {
    const g = window.__game;
    g.skills.addXp('mining', 4200);
    g.skills.addXp('woodcutting', 900);
    g.inventory.add('pine_log', 17);
    g.inventory.coins = 640;
    // Somewhere she would never be put by a spawn point.
    g.player.x += 26; g.player.z -= 19;
    g.saveGame();
    await new Promise((r) => setTimeout(r, 400));
    return { x: Math.round(g.player.x), z: Math.round(g.player.z) };
  });
  const before = await look(one.page);
  ok(before.mining === 4200 && before.logs === 17, 'she mines, chops, and fills her pack');

  // While connected, the browser must not be a store for the character or the
  // world at all. Two copies that each believe they are current is how an
  // afternoon gets lost: play on the laptop, pick up the iPad, and the iPad's
  // stale copy is what gets uploaded next.
  ok(before.stored.length === 0,
    `neither her character nor the world was written to this browser (${JSON.stringify(before.stored)})`);

  // Let her position reach the room, then close the tablet.
  await one.page.waitForTimeout(600);
  await one.ctx.close();
  await new Promise((r) => setTimeout(r, 600));

  // ---- device two ----------------------------------------------------------
  const two = await joinFrom('Ada');
  const after = await look(two.page);
  ok(after.mining === 4200, `her Mining XP came with her to a different device (${after.mining})`);
  ok(after.woodcutting === 900, `and her Woodcutting (${after.woodcutting})`);
  ok(after.logs === 17, `and the seventeen logs in her pack (${after.logs})`);
  ok(after.coins === 640, `and her coins (${after.coins})`);
  ok(Math.abs(after.at[0] - walked.x) <= 2 && Math.abs(after.at[1] - walked.z) <= 2,
    `and she is standing where she left off, not at the campsite (${after.at} vs ${[walked.x, walked.z]})`);

  // ---- a different child gets their own ------------------------------------
  const bea = await joinFrom('Bea');
  const beaState = await look(bea.page);
  ok(beaState.mining === 0 && beaState.logs === 0,
    'a different name is a different person, with an empty pack');
  await bea.ctx.close();
  await two.ctx.close();

  // ---- and it survives the server stopping ---------------------------------
  await new Promise((r) => setTimeout(r, 500));
  await stop();
  const raw = JSON.parse(await readFile(SAVE, 'utf8'));
  ok(!!raw.characters?.Ada?.data, 'the character is written into the world save file');
  ok(raw.characters.Ada.data.skills.mining === 4200, 'with her levels in it');
  ok(!raw.characters.Ada.data.world && !raw.characters.Ada.data.enemies,
    'and WITHOUT a second copy of the world, which the room already owns');

  await start();
  const three = await joinFrom('Ada');
  const reloaded = await look(three.page);
  ok(reloaded.mining === 4200 && reloaded.logs === 17,
    `she is still herself after the server is stopped and started (${reloaded.mining} XP, ${reloaded.logs} logs)`);
  await three.ctx.close();
} catch (err) {
  console.error('MPCHAR ERROR', err);
  console.error(out.slice(-2000));
  failures++;
} finally {
  await browser.close();
  await stop();
  await rm(DIR, { recursive: true, force: true });
}

console.log(failures ? `\nMPCHAR FAIL (${failures})` : '\nMPCHAR PASS');
process.exit(failures ? 1 : 0);
