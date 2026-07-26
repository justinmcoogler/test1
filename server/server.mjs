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
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { attachWebSocket, newId } from './ws.mjs';
import { Room, SIM_HZ, SNAP_HZ } from './room.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const port = parseInt(arg('port', '8080'), 10);
const seed = arg('seed', 'sproutlands');

const stamp = () => new Date().toTimeString().slice(0, 8);
const log = (msg) => console.log(`[${stamp()}] ${msg}`);

const room = new Room({ seed, onLog: log });

// ---- static files -----------------------------------------------------------
const http = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/') path = '/index.html';
    const file = normalize(join(root, path));
    // Path traversal guard: everything served must live under the repo root.
    if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
    const data = await readFile(file);
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
});

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
    conn.on('close', () => room.leave(id));
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

http.listen(port, '0.0.0.0', () => {
  const urls = lanAddresses().map((ip) => `http://${ip}:${port}`);
  console.log('');
  console.log('  Sproutlands multiplayer');
  console.log(`  seed "${seed}"  ·  ${SIM_HZ}Hz sim  ·  ${SNAP_HZ}Hz snapshots`);
  console.log('');
  console.log(`  On this machine:  http://localhost:${port}`);
  if (urls.length) {
    console.log('  On the wifi:');
    for (const u of urls) console.log(`      ${u}`);
  } else {
    console.log('  No LAN address found — other devices will not be able to reach this.');
  }
  console.log('');
  console.log('  Ctrl-C to stop.');
  console.log('');
});

const shutdown = () => {
  log('shutting down');
  clearInterval(loop);
  for (const p of room.players.values()) p.conn.close(1001, 'server stopping');
  http.close(() => process.exit(0));
  // If a socket refuses to close, do not hang the terminal forever.
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
