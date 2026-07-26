// End-to-end multiplayer: a real server process, two real WebSocket clients.
//
//   node tests/multiplayer.mjs
//
// The room's rules have their own deterministic tests (tests/unit/room.test.mjs)
// and the frame codec has its own (tests/unit/net.test.mjs). What is left — and
// what neither of those can prove — is that the hand-rolled RFC 6455 server and
// a real WebSocket implementation actually understand each other, over a real
// socket, in a separate process. That is the thing most likely to be subtly
// wrong and the thing a unit test cannot reach.
//
// Node's built-in WebSocket client is the other side, so this needs no deps.
import { spawn } from 'node:child_process';

const PORT = 8795;
const URL = `ws://127.0.0.1:${PORT}/ws`;
const PROTOCOL_VERSION = 1;

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

// A tiny client: connects, records everything, and can wait for a message.
class TestClient {
  constructor(name) {
    this.name = name;
    this.seen = [];
    this.ws = new WebSocket(URL);
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', res);
      this.ws.addEventListener('error', () => rej(new Error(`${name} failed to connect`)));
    });
    this.ws.addEventListener('message', (ev) => {
      try { this.seen.push(JSON.parse(ev.data)); } catch { /* not our protocol */ }
    });
  }

  send(msg) { this.ws.send(JSON.stringify(msg)); }

  // Resolve with the first message of a type that satisfies `pred`, or null on
  // timeout. Checks what has already arrived first, so there is no race between
  // sending and starting to wait.
  async wait(type, pred = () => true, ms = 4000) {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = this.seen.find((m) => m.t === type && pred(m));
      if (hit) return hit;
      if (Date.now() > deadline) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  close() { try { this.ws.close(); } catch { /* already gone */ } }
}

const server = spawn('node', ['server/server.mjs', '--port', String(PORT), '--seed', 'e2e'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOut = '';
server.stdout.on('data', (d) => { serverOut += d; });
server.stderr.on('data', (d) => { serverOut += d; });

const stop = () => { try { server.kill('SIGTERM'); } catch { /* already dead */ } };
process.on('exit', stop);

try {
  // Wait for the listen banner rather than sleeping a fixed amount.
  const upBy = Date.now() + 20000;
  while (!/On this machine/.test(serverOut) && Date.now() < upBy) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!/On this machine/.test(serverOut)) throw new Error(`server never started:\n${serverOut}`);

  // --- the page itself is served on the same port -------------------------
  const page = await fetch(`http://127.0.0.1:${PORT}/`);
  ok(page.ok, 'the game page is served on the same port as the socket');
  const html = await page.text();
  ok(/<canvas|<script/i.test(html), 'and it is the actual game page');

  // --- two clients join ---------------------------------------------------
  const ada = new TestClient('Ada');
  await ada.ready;
  ok(true, 'a browser WebSocket completes the hand-rolled handshake');

  ada.send({ t: 'join', name: 'Ada', version: PROTOCOL_VERSION });
  const welcome = await ada.wait('welcome');
  ok(!!welcome, 'joining is answered with a welcome');
  ok(welcome?.seed === 'e2e', 'carrying the seed the terrain comes from');
  ok(Array.isArray(welcome?.edits), 'and the edit set');

  const bea = new TestClient('Bea');
  await bea.ready;
  bea.send({ t: 'join', name: 'Bea', version: PROTOCOL_VERSION });
  const beaWelcome = await bea.wait('welcome');
  ok(!!beaWelcome, 'a second player joins');
  ok(beaWelcome?.players?.some((p) => p.name === 'Ada'), 'and is told Ada is already here');

  const joined = await ada.wait('joined', (m) => m.player?.name === 'Bea');
  ok(!!joined, 'Ada is told Bea arrived');

  // --- they see each other move -------------------------------------------
  const spawn = welcome.spawn;
  ada.send({ t: 'input', x: spawn.x + 3, y: spawn.y, z: spawn.z + 1, yaw: 1, anim: 'walk' });
  const sawAda = await bea.wait('snapshot', (m) => m.players?.some((p) => p.name === 'Ada'));
  ok(!!sawAda, 'Bea sees Ada in a snapshot');
  const adaSeen = sawAda?.players?.find((p) => p.name === 'Ada');
  ok(Math.abs((adaSeen?.x ?? 0) - (spawn.x + 3)) < 0.5, 'at the position Ada reported');
  ok(!sawAda?.players?.some((p) => p.name === 'Bea'), 'and is not sent her own position back');

  // --- a block one places, the other sees ---------------------------------
  bea.send({ t: 'input', x: spawn.x, y: spawn.y, z: spawn.z, yaw: 0, anim: 'idle' });
  await new Promise((r) => setTimeout(r, 200));
  const bx = Math.round(spawn.x) + 2, by = Math.round(spawn.y), bz = Math.round(spawn.z) + 2;
  ada.send({ t: 'edit', x: bx, y: by, z: bz, id: 1 });
  const edits = await bea.wait('edits', (m) => m.list?.some(([x, y, z]) => x === bx && y === by && z === bz));
  ok(!!edits, 'a block Ada places arrives at Bea');

  // --- reach is enforced ---------------------------------------------------
  ada.send({ t: 'edit', x: bx + 400, y: by, z: bz + 400, id: 1 });
  const denied = await ada.wait('denied', (m) => /far/.test(m.reason || ''), 2000);
  ok(!!denied, 'an edit from across the map is refused with a reason');

  // --- mobs are shared ----------------------------------------------------
  // Both players are standing together, so both snapshots describe the same
  // creatures — this is the "one goblin, not one each" property.
  const adaSnap = await ada.wait('snapshot', (m) => (m.mobs?.length ?? 0) > 0, 8000);
  if (adaSnap) {
    const beaSnap = await bea.wait('snapshot', (m) => (m.mobs?.length ?? 0) > 0, 8000);
    const adaIds = new Set((adaSnap.mobs || []).map((m) => m.id));
    const shared = (beaSnap?.mobs || []).filter((m) => adaIds.has(m.id));
    ok(shared.length > 0, `both players see the same creatures (${shared.length} in common)`);
  } else {
    // Spawn density means an empty patch is possible; that is not a failure of
    // the netcode, so say so plainly rather than failing on a coin toss.
    console.log('ℹ️  no creatures spawned near the spawn point this run — mob sharing not exercised');
  }

  // --- chat ---------------------------------------------------------------
  ada.send({ t: 'chat', text: 'hello from Ada' });
  const chat = await bea.wait('chat', (m) => /hello from Ada/.test(m.text || ''));
  ok(!!chat, 'chat is relayed');
  ok(chat?.from === 'Ada', 'attributed to the sender');

  // --- rubbish does not take the server down ------------------------------
  ada.ws.send('not json at all');
  ada.ws.send(JSON.stringify({ t: 'drop_everything' }));
  ada.ws.send(JSON.stringify({ t: 'input', x: NaN, y: 'up', z: {} }));
  ada.ws.send(JSON.stringify({ t: 'edit', x: 'here', y: null, z: [], id: {} }));
  ada.ws.send(JSON.stringify({ t: 'attack', id: 'no-such-creature' }));
  // Clear the chat flood gate before speaking again, or this measures the rate
  // limiter rather than whether the server is still standing.
  await new Promise((r) => setTimeout(r, 600));
  ada.send({ t: 'chat', text: 'still here?' });
  const alive = await bea.wait('chat', (m) => /still here/.test(m.text || ''));
  ok(!!alive, 'garbage from a client is survivable — the session continues');
  ok(ada.ws.readyState === 1, 'and the sender was not disconnected for it');

  // --- leaving is announced ------------------------------------------------
  bea.close();
  const left = await ada.wait('left', () => true, 4000);
  ok(!!left, 'a disconnect is announced to everyone else');

  ada.close();
  await new Promise((r) => setTimeout(r, 300));
} catch (err) {
  console.error('MULTIPLAYER ERROR', err);
  console.error(serverOut);
  failures++;
} finally {
  stop();
}

console.log(failures ? `\nMULTIPLAYER FAIL (${failures})` : '\nMULTIPLAYER PASS');
process.exit(failures ? 1 : 0);
