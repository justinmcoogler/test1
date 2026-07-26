// Two real browsers, one server, one world.
//
//   node tests/coop.mjs
//
// tests/multiplayer.mjs proves the protocol with synthetic clients. This proves
// the GAME: two headless Chromium instances click "Play together" on the same
// server and then have to agree about the world, each other, and the creatures
// in it. It is the only test that exercises the client integration in main.js —
// the seam where the server's authority meets a running game loop.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8798;
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

const server = spawn('node', ['server/server.mjs', '--port', String(PORT), '--seed', 'coop'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let out = '';
server.stdout.on('data', (d) => { out += d; });
server.stderr.on('data', (d) => { out += d; });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});

// Open the title screen, type a name, and join.
async function join(name) {
  const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
  page.on('pageerror', (e) => { console.log(`  [${name}] pageerror:`, String(e).slice(0, 200)); });
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

  // ---- the button only appears where there is something to join ------------
  const probe = await fetch(`http://localhost:${PORT}/__mp`);
  ok(probe.ok, 'a game server announces itself at /__mp');

  const ada = await join('Ada');
  ok(true, 'Ada joined from the title screen and reached the world');

  const seed = await ada.evaluate(() => window.__game.world.seed);
  const netSeed = await ada.evaluate(() => window.__net.seed);
  ok(String(netSeed) === 'coop', 'the world was built from the SERVER seed, not the browser’s');

  const bea = await join('Bea');
  ok(true, 'Bea joined the same server');
  const beaSeed = await bea.evaluate(() => window.__game.world.seed);
  ok(beaSeed === seed, `both players generated the same terrain (${seed})`);

  // ---- they see each other -------------------------------------------------
  const sawEachOther = await ada.waitForFunction(
    () => [...(window.__net?.players?.values() || [])].some((p) => p.name === 'Bea'),
    { timeout: 20000 },
  ).then(() => true).catch(() => false);
  ok(sawEachOther, 'Ada has Bea in her roster');

  // …and draw each other. This is the bit that proves the render integration,
  // not just the netcode: a remote player has to reach collectEntities.
  const drawn = await ada.evaluate(() => {
    const ents = window.__game.collectEntities(0.016);
    return ents.filter((e) => e.label).map((e) => e.label);
  });
  ok(drawn.includes('Bea'), `Bea is drawn in Ada's world with a nameplate (${JSON.stringify(drawn)})`);

  // ---- one world: a block placed by one appears for the other -------------
  const placed = await ada.evaluate(() => {
    const g = window.__game;
    const x = Math.round(g.player.x) + 2, y = Math.round(g.player.y), z = Math.round(g.player.z) + 2;
    g.world.setBlock(x, y, z, 1, true);
    return { x, y, z };
  });
  const beaSees = await bea.waitForFunction(
    (p) => window.__game.world.getBlock(p.x, p.y, p.z) === 1,
    placed, { timeout: 15000 },
  ).then(() => true).catch(() => false);
  ok(beaSees, 'a block Ada placed turns up in Bea’s world');

  // ---- one set of creatures ------------------------------------------------
  const mobIds = async (page) => page.evaluate(() => [...window.__game.enemyMgr.entities.keys()]);
  const adaMobs = await mobIds(ada);
  const beaMobs = await mobIds(bea);
  const shared = adaMobs.filter((id) => beaMobs.includes(id));
  ok(adaMobs.length > 0, `creatures are present (${adaMobs.length})`);
  ok(shared.length > 0, `and they are the SAME creatures, by id (${shared.length} in common)`);

  // The local spawner must be OFF, or each client invents its own goblins from
  // its own chunks and four children fight four different ones in the same spot.
  // Checking the id prefix does not work — the server's spawns come from the
  // same chunk tables and carry the same "sp:" ids. What distinguishes them is
  // provenance: every creature in the manager must have arrived in a snapshot.
  const strays = await ada.evaluate(() => {
    const fromServer = new Set(window.__net.mobs.keys());
    return [...window.__game.enemyMgr.entities.keys()].filter((id) => !fromServer.has(id));
  });
  ok(strays.length === 0,
    `every creature came from the server, none spawned locally (${strays.length} strays)`);

  // ---- a hurt creature is hurt for everyone --------------------------------
  // Walk up to the NEAREST shared creature and let the position reach the server
  // before swinging — which is what a player does anyway. Attacking from across
  // the map is refused by the reach check, and picking an arbitrary creature out
  // of the list was picking one of those.
  const target = await ada.evaluate((ids) => {
    const g = window.__game;
    let best = null, bestD = Infinity;
    for (const id of ids) {
      const e = g.enemyMgr.entities.get(id);
      if (!e) continue;
      const d = Math.hypot(e.x - g.player.x, e.z - g.player.z);
      if (d < bestD) { best = id; bestD = d; }
    }
    return best;
  }, shared);
  const before = await bea.evaluate((id) => window.__game.enemyMgr.entities.get(id)?.hp, target);
  await ada.evaluate((id) => {
    const g = window.__game;
    const e = g.enemyMgr.entities.get(id);
    g.player.x = e.x; g.player.z = e.z; g.player.y = e.y;
  }, target);
  await ada.waitForTimeout(500);          // the input throttle is 10Hz
  await ada.evaluate((id) => window.__game.startCombat(window.__game.enemyMgr.entities.get(id)), target);
  const hurt = await bea.waitForFunction(
    (a) => {
      const e = window.__game.enemyMgr.entities.get(a.id);
      return !e || e.hp < a.before;
    },
    { id: target, before }, { timeout: 30000 },
  ).then(() => true).catch(() => false);
  ok(hurt, 'a creature Ada attacks loses health on Bea’s screen too');

  // ---- leaving -------------------------------------------------------------
  await bea.close();
  const gone = await ada.waitForFunction(
    () => ![...(window.__net?.players?.values() || [])].some((p) => p.name === 'Bea'),
    { timeout: 20000 },
  ).then(() => true).catch(() => false);
  ok(gone, 'and when Bea closes the tab she leaves Ada’s world');

  await ada.close();
} catch (err) {
  console.error('COOP ERROR', err);
  console.error(out.slice(-2000));
  failures++;
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

console.log(failures ? `\nCOOP FAIL (${failures})` : '\nCOOP PASS');
process.exit(failures ? 1 : 0);
