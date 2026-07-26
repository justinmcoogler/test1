// The LAN game server: static files and the game socket, on one port.
//
//   node server/server.mjs [--port 8080] [--seed sproutlands]
//   npm run server
//
// ONE PORT IS A FEATURE, not a shortcut. The address you read out to a child
// holding a tablet is the only address that exists — the page and the socket
// come from the same origin, so the client can connect with no configuration at
// all. Two ports would mean explaining the second one to a seven-year-old.
//
// This binds 0.0.0.0, which is what makes it reachable from the other devices in
// the house. It has no authentication, and that is a deliberate choice for a
// home network (see README). Do not port-forward it.
import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { attachWebSocket, newId } from './ws.mjs';
import { Room, SIM_HZ, SNAP_HZ } from './room.mjs';
import { loadRoom, saveRoom, savePathFor, saveSize } from './persist.mjs';

// Where the game files live ON DISK. Only used when running from a clone: a
// packaged executable serves everything out of itself and never touches this.
//
// The try/catch is not defensive padding. Bundled to CommonJS for packaging,
// `import.meta.url` is not a URL any more — esbuild leaves it as ".", and
// `new URL(".")` throws before the server has printed a single line. The
// executable died on its first run for exactly this.
const root = (() => {
  try { return join(fileURLToPath(new URL('.', import.meta.url)), '..'); }
  catch { return process.cwd(); }
})();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

// ---- assets, when this is an executable -------------------------------------
// Node's single-executable format can carry arbitrary files alongside the code
// (node:sea getAsset). tools/package.mjs puts the whole served tree in, so the
// .exe a parent double-clicks is one file with no folder to keep beside it.
//
// Running normally there is no SEA at all, the require fails, and every lookup
// returns null — which is why this is wrapped rather than imported at the top.
// `typeof require` rather than a bare require: this file is ESM when run from a
// clone (where require does not exist and referencing it would throw) and
// CommonJS once esbuild has bundled it for packaging (where it does). typeof on
// an undeclared identifier is the one form that is safe in both.
let sea = null;
try {
  if (typeof require === 'function') {
    const mod = require('node:sea');
    if (mod?.isSea?.()) sea = mod;
  }
} catch { /* not packaged, which is the normal case */ }

function bundled(path) {
  if (!sea) return null;
  const key = path.replace(/^\//, '');
  try {
    const buf = sea.getAsset(key);
    return buf ? Buffer.from(buf) : null;
  } catch { return null; }   // getAsset throws on an unknown key
}

// A seed is operator-supplied, but it still ends up inside an HTML attribute.
const escapeAttr = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const port = parseInt(arg('port', '8080'), 10);
const seed = arg('seed', 'sproutlands');

// HTTPS IS OPTIONAL AND IT IS ONLY ABOUT INSTALLING. Play works perfectly well
// over plain http on a home network. But a browser will only register a service
// worker — and Chrome will only offer "Install" — on a SECURE CONTEXT, and a LAN
// address like http://192.168.1.20:8080 is not one. localhost is, which is why
// the host machine can install over http and the tablets cannot.
//
//   node tools/make-cert.mjs          # writes .certs/, gitignored
//   npm run server -- --tls
//
// See README: the certificate is self-signed, so each device has to be told to
// trust it once.
const wantTls = process.argv.includes('--tls') || !!arg('cert', '');
const certPath = arg('cert', '.certs/cert.pem');
const keyPath = arg('key', '.certs/key.pem');

// Where the world lives between sessions. --no-save runs it in memory only,
// which is what the tests want and nothing else does.
const saving = !process.argv.includes('--no-save');
const savePath = arg('save', savePathFor(seed));
// How often a changed world is written. A minute is short enough that the worst
// case is losing a minute of building, and long enough that the disk is idle
// almost all the time.
const AUTOSAVE_MS = 60000;

const stamp = () => new Date().toTimeString().slice(0, 8);
const log = (msg) => console.log(`[${stamp()}] ${msg}`);

const room = new Room({ seed, onLog: log });

// LOAD BEFORE THE FIRST TICK. Edits are replayed as chunks are generated
// (js/world/world.js ensureChunk reads editedBlocks), so a chunk built before
// the load would come from bare terrain and never be revisited — the base would
// be missing until someone walked far enough away and back.
//
// This is a function rather than top-level await for a packaging reason: Node's
// single-executable format only accepts CommonJS, and CommonJS has no top-level
// await. See tools/package.mjs.
async function loadSave() {
  if (!saving) return;
  let loaded = null;
  try {
    loaded = await loadRoom(savePath, { seed, onLog: log });
  } catch (err) {
    // A corrupt file or a seed mismatch is refused rather than overwritten. The
    // save is somebody's afternoon; starting fresh on top of it is the one
    // outcome that cannot be undone.
    console.error(`\n  ${err.message}`);
    console.error(`  ${savePath}\n`);
    console.error('  Move that file aside, point --save somewhere else, or run with --no-save.\n');
    process.exit(1);
  }
  if (loaded) {
    room.deserialize(loaded);
    log(`loaded ${savePath} (${await saveSize(savePath)} bytes, saved ${loaded.savedAt || 'at an unknown time'})`);
  }
}

// SAVES ARE A QUEUE, NOT A LOCK. The first version guarded with a boolean and
// returned early when a write was already running — which meant that on Ctrl-C
// immediately after the last player left, the shutdown save returned instantly
// while the previous one was still writing, and then process.exit ran before it
// finished. The save that mattered most was the one guaranteed to be dropped.
//
// Chaining instead means `await persist(...)` waits for every write queued
// before it as well as its own, so the shutdown path cannot outrun the disk.
let chain = Promise.resolve();
function persist(reason) {
  if (!saving) return chain;
  chain = chain.then(async () => {
    // Re-checked HERE rather than at call time: an earlier link in the chain may
    // have already written these exact bytes.
    if (!room.dirty) return;
    const data = room.serialize();
    data.savedAt = new Date().toISOString();
    try {
      await saveRoom(savePath, data);
      room.dirty = false;
      log(`saved ${savePath} (${reason})`);
    } catch (err) {
      log(`SAVE FAILED (${reason}): ${err.message}`);
    }
  });
  return chain;
}

// ---- static files -----------------------------------------------------------
const handler = async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // A status endpoint for tooling and tests — "is a server up, what seed, how
    // many people". The GAME does not use it: see the marker injected into
    // index.html below for how the title screen decides.
    if (path === '/__mp') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, seed, players: room.players.size }));
      return;
    }
    if (path === '/') path = '/index.html';

    // PACKAGED OR NOT. Run from a clone, the game is read off disk. Run from the
    // single-file executable (tools/package.mjs) there is no clone — the whole
    // asset tree is inside the binary, and there is no repo root to resolve
    // against. `bundled` returns the file in that case and null otherwise, so
    // the two paths differ in exactly one branch.
    const packed = bundled(path);
    let file = path;
    let data;
    if (packed) {
      data = packed;
    } else {
      file = normalize(join(root, path));
      // Path traversal guard: everything served must live under the repo root.
      if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
      data = await readFile(file);
    }
    // HOW THE TITLE SCREEN KNOWS THERE IS ANYTHING TO JOIN. The same files are
    // served by tests/server.mjs and by any static host, where "Play together"
    // would be a button that leads nowhere — so the page has to be told.
    //
    // This was a fetch('/__mp') probe first, and that was wrong for a reason
    // worth remembering: on every host that is NOT a game server the probe 404s,
    // and a 404 is logged to the browser console no matter how carefully the
    // JavaScript handles it. The smoke test asserts a clean console and was
    // quite right to fail. A marker in the page costs no request and cannot fail.
    if (file.endsWith('index.html')) {
      data = Buffer.from(String(data).replace(
        '</head>',
        `<meta name="sproutlands-server" content="${escapeAttr(seed)}">\n</head>`,
      ));
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      // The whole point of this server is testing a build you are editing, so
      // never let a browser cache a stale module.
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
};

let tls = false;
let http;
if (wantTls) {
  try {
    http = createSecureServer(
      { cert: readFileSync(certPath), key: readFileSync(keyPath) },
      handler,
    );
    tls = true;
  } catch (err) {
    console.error(`\n  Could not read the certificate (${err.code === 'ENOENT' ? 'not found' : err.message}).`);
    console.error(`  Looked for: ${certPath} and ${keyPath}`);
    console.error('  Run: node tools/make-cert.mjs');
    console.error('  Starting without TLS — play will work, installing to a home screen will not.\n');
    http = createServer(handler);
  }
} else {
  http = createServer(handler);
}

// ---- the game socket --------------------------------------------------------
attachWebSocket(http, {
  path: '/ws',
  onConnection: (conn) => {
    const id = newId();
    room.join(conn, id);
    conn.on('message', (raw) => {
      try { room.handle(id, raw); }
      catch (err) { log(`error handling a message from ${id}: ${err.stack || err}`); }
    });
    conn.on('close', () => {
      room.leave(id);
      // Everyone has gone home. Write now rather than waiting out the timer on
      // an empty world — a ten-minute session should not depend on the clock.
      if (room.players.size === 0) persist('last player left');
    });
    conn.on('error', () => { /* the close handler does the cleanup */ });
  },
});

// ---- the loop ---------------------------------------------------------------
// A FIXED-STEP SIM WITH A CATCH-UP BOUND. setInterval drifts and can bunch
// callbacks after the event loop stalls (a big chunk generation will do it), so
// the step is measured rather than assumed. The bound matters: without it, one
// long stall turns into a burst of thirty catch-up steps, which reads on screen
// as every creature in the world teleporting.
const SIM_MS = 1000 / SIM_HZ;
const SNAP_EVERY = Math.max(1, Math.round(SIM_HZ / SNAP_HZ));
let last = Date.now();
let carry = 0;
let steps = 0;

const loop = setInterval(() => {
  const now = Date.now();
  carry += now - last;
  last = now;
  if (carry > SIM_MS * 5) carry = SIM_MS * 5;     // never replay more than 5
  while (carry >= SIM_MS) {
    carry -= SIM_MS;
    try { room.tick(SIM_MS / 1000); }
    catch (err) { log(`sim step failed: ${err.stack || err}`); }
    if (++steps % SNAP_EVERY === 0) {
      try { room.snapshot(); }
      catch (err) { log(`snapshot failed: ${err.stack || err}`); }
    }
  }
}, SIM_MS);

const autosave = saving ? setInterval(() => { persist('autosave'); }, AUTOSAVE_MS) : null;

// A dead TCP connection can sit open for minutes. Pinging turns "the tablet went
// to sleep" into a clean departure instead of a ghost standing in the field.
setInterval(() => {
  for (const p of room.players.values()) {
    if (!p.conn.alive) { p.conn.close(1001, 'no response'); continue; }
    p.conn.ping();
  }
}, 15000);

function lanAddresses() {
  const out = [];
  for (const [, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address);
    }
  }
  return out;
}

function listen() {
  http.listen(port, '0.0.0.0', () => {
    const scheme = tls ? 'https' : 'http';
    const urls = lanAddresses().map((ip) => `${scheme}://${ip}:${port}`);
    console.log('');
    console.log('  Sproutlands multiplayer');
    console.log(`  seed "${seed}"  ·  ${SIM_HZ}Hz sim  ·  ${SNAP_HZ}Hz snapshots${tls ? '  ·  TLS' : ''}`);
    console.log('');
    console.log(`  On this machine:  ${scheme}://localhost:${port}`);
  if (urls.length) {
    console.log('  On the wifi:');
    for (const u of urls) console.log(`      ${u}`);
    } else {
    console.log('  No LAN address found — other devices will not be able to reach this.');
    }
    console.log('');
    if (tls) {
    console.log('  Certificate is self-signed: each device will warn once. Accept it,');
    console.log('  and the game becomes installable to the home screen.');
    } else {
    console.log('  Playing works from any of these. INSTALLING to a home screen works');
    console.log('  only on this machine (localhost counts as secure) — for the tablets,');
    console.log('  run `node tools/make-cert.mjs` then `npm run server -- --tls`.');
    }
    console.log('');
    console.log('  Ctrl-C to stop.');
    console.log('');
  });
}


let stopping = false;
const shutdown = async () => {
  if (stopping) return;            // a second Ctrl-C must not race the first
  stopping = true;
  log('shutting down');
  clearInterval(loop);
  if (autosave) clearInterval(autosave);
  for (const p of room.players.values()) p.conn.close(1001, 'server stopping');
  // The save is the LAST thing and it is awaited. Ctrl-C is how this server is
  // normally stopped, so if that path does not write, persistence does not
  // really exist.
  await persist('shutdown');
  http.close(() => process.exit(0));
  // If a socket refuses to close, do not hang the terminal forever.
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// The world is read from disk BEFORE the port opens, so nobody can join a world
// that is still half-loaded. An ordinary function rather than top-level await,
// because the packaged executable is CommonJS and CommonJS has none.
async function main() {
  await loadSave();
  listen();
}

main().catch((err) => {
  console.error('\n  The server could not start:\n');
  console.error(`  ${err.stack || err}\n`);
  process.exit(1);
});
