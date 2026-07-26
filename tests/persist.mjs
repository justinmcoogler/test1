// Does the world survive stopping the server?
//
//   node tests/persist.mjs
//
// This is the only question persistence has to answer, and the only way to
// answer it honestly is to actually stop the process and start a new one. A unit
// test on serialize/deserialize would pass with the save never reaching disk, or
// reaching it after the process had already exited.
//
// It also checks the two ways persistence destroys what it was meant to protect:
// a corrupt file, and a save from a different seed.
import { spawn } from 'node:child_process';
import { rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = 8799;
const DIR = 'tests/.tmp-saves';
const SAVE = join(DIR, 'persist-test.json');
const PROTOCOL_VERSION = 1;

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

// Start a server and wait for its banner. Returns { proc, out }.
function boot(extra = []) {
  const proc = spawn('node', [
    'server/server.mjs', '--port', String(PORT), '--seed', 'persist', '--save', SAVE, ...extra,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const state = { proc, out: '' };
  proc.stdout.on('data', (d) => { state.out += d; });
  proc.stderr.on('data', (d) => { state.out += d; });
  return state;
}

async function waitFor(state, re, ms = 20000) {
  const until = Date.now() + ms;
  while (!re.test(state.out) && Date.now() < until) await new Promise((r) => setTimeout(r, 100));
  return re.test(state.out);
}

// Stop with SIGINT — the way a person stops it — and wait for the process to go.
function stop(state) {
  return new Promise((resolve) => {
    if (state.proc.exitCode !== null) return resolve();
    state.proc.once('exit', resolve);
    state.proc.kill('SIGINT');
    setTimeout(() => { try { state.proc.kill('SIGKILL'); } catch { /* gone */ } resolve(); }, 8000);
  });
}

// Join, do something, and read back — a minimal client over the real socket.
async function withClient(fn) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
  const seen = [];
  ws.addEventListener('message', (ev) => { try { seen.push(JSON.parse(ev.data)); } catch { /* skip */ } });
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('connect failed')));
  });
  const wait = async (t, pred = () => true, ms = 6000) => {
    const until = Date.now() + ms;
    for (;;) {
      const hit = seen.find((m) => m.t === t && pred(m));
      if (hit) return hit;
      if (Date.now() > until) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
  };
  const send = (m) => ws.send(JSON.stringify(m));
  try { return await fn({ send, wait, seen }); }
  finally { try { ws.close(); } catch { /* gone */ } }
}

await rm(DIR, { recursive: true, force: true });
let server = null;

try {
  // ---- session one: build something ---------------------------------------
  server = boot();
  ok(await waitFor(server, /On this machine/), 'the server starts with no save present');

  const built = await withClient(async ({ send, wait }) => {
    send({ t: 'join', name: 'Ada', version: PROTOCOL_VERSION });
    const w = await wait('welcome');
    if (!w) throw new Error('never joined');
    const x = Math.round(w.spawn.x) + 2, y = Math.round(w.spawn.y), z = Math.round(w.spawn.z) + 2;
    send({ t: 'edit', x, y, z, id: 1 });
    await wait('edits', (m) => m.list?.some(([ex, ey, ez]) => ex === x && ey === y && ez === z));
    // Move somewhere distinctive, so we can check the player is put back there.
    send({ t: 'input', x: w.spawn.x + 5, y: w.spawn.y, z: w.spawn.z - 4, yaw: 0, anim: 'idle' });
    await new Promise((r) => setTimeout(r, 400));
    return { x, y, z, px: w.spawn.x + 5, pz: w.spawn.z - 4 };
  });
  ok(!!built, 'Ada joined and placed a block');

  // ---- stop it the way a person does --------------------------------------
  await stop(server);
  ok(/saved .*(shutdown|last player left)/.test(server.out), 'stopping the server writes the world');

  const raw = JSON.parse(await readFile(SAVE, 'utf8'));
  ok(raw.version === 1 && raw.seed === 'persist', 'the save names its version and seed');
  ok(!!raw.savedAt, 'and when it was written');
  ok(Object.keys(raw.world.edits || {}).length > 0, 'and contains the edits');
  ok(!!raw.players?.Ada, 'and where Ada was standing');

  // ---- session two: is it still there? ------------------------------------
  server = boot();
  ok(await waitFor(server, /loaded /), 'the next server start loads the save');
  ok(await waitFor(server, /On this machine/), 'and comes up');

  const after = await withClient(async ({ send, wait }) => {
    send({ t: 'join', name: 'Ada', version: PROTOCOL_VERSION });
    const w = await wait('welcome');
    return w;
  });
  const stillThere = (after?.edits || []).some(
    ([x, y, z, id]) => x === built.x && y === built.y && z === built.z && id === 1,
  );
  ok(stillThere, 'the block Ada placed yesterday is in the new server’s welcome');
  ok(Math.abs((after?.spawn?.x ?? 0) - built.px) < 0.5
    && Math.abs((after?.spawn?.z ?? 0) - built.pz) < 0.5,
  'and Ada is put back where she was, not at the spawn point');

  await stop(server);

  // ---- a corrupt save is refused, never overwritten ------------------------
  // The save is somebody's afternoon. Starting a fresh world on top of it is the
  // one outcome that cannot be undone, so a file that will not parse must stop
  // the server rather than be replaced.
  await mkdir(DIR, { recursive: true });
  await writeFile(SAVE, '{ this is not json', 'utf8');
  server = boot();
  const refused = await waitFor(server, /not valid JSON|corrupt/i, 12000);
  ok(refused, 'a corrupt save stops the server with an explanation');
  await stop(server);
  const untouched = await readFile(SAVE, 'utf8');
  ok(untouched === '{ this is not json', 'and the file is left exactly as it was');

  // ---- a save from another seed is refused --------------------------------
  // Edits are block changes; the ground under them comes from the seed. Replay
  // one world's edits onto another's terrain and you get doors in cliffs.
  await writeFile(SAVE, JSON.stringify({
    version: 1, seed: 'a-completely-different-world', world: { edits: {} }, enemies: {}, players: {},
  }), 'utf8');
  server = boot();
  const seedRefused = await waitFor(server, /seed/i, 12000);
  ok(seedRefused, 'a save from a different seed is refused too');
  await stop(server);

  // ---- --no-save really does not write ------------------------------------
  await rm(SAVE, { force: true });
  server = boot(['--no-save']);
  await waitFor(server, /On this machine/);
  await withClient(async ({ send, wait }) => {
    send({ t: 'join', name: 'Ada', version: PROTOCOL_VERSION });
    const w = await wait('welcome');
    if (w) send({ t: 'edit', x: Math.round(w.spawn.x) + 1, y: Math.round(w.spawn.y), z: Math.round(w.spawn.z) + 1, id: 1 });
    await new Promise((r) => setTimeout(r, 400));
  });
  await stop(server);
  const wrote = await readFile(SAVE, 'utf8').then(() => true).catch(() => false);
  ok(!wrote, '--no-save leaves no file behind');
} catch (err) {
  console.error('PERSIST ERROR', err);
  if (server) console.error(server.out.slice(-1500));
  failures++;
} finally {
  if (server) await stop(server);
  await rm(DIR, { recursive: true, force: true });
}

console.log(failures ? `\nPERSIST FAIL (${failures})` : '\nPERSIST PASS');
process.exit(failures ? 1 : 0);
