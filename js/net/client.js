// The browser end of multiplayer.
//
// Everything net-shaped lives behind this one object so the game does not grow a
// second nervous system: main.js asks `net.players` and `net.mobs` for what to
// draw and calls `net.sendEdit(...)` when a block changes, and that is the whole
// contact surface. If multiplayer is ever removed, it is this file and a dozen
// call sites rather than a rewrite.
//
// INTERPOLATION LIVES HERE. Snapshots arrive ten times a second and the game
// draws sixty, so anything positional has to be smoothed or every other player
// moves like a slideshow. Doing it inside the client means main.js never learns
// that the network has a tick rate at all — it reads positions every frame and
// they are already smooth.
import {
  C, S, PROTOCOL_VERSION, encode, decode, cleanName,
} from './protocol.js';

// How fast a remote body catches up to where the server last said it was. High
// enough to feel responsive on a LAN, low enough to hide a late packet.
const LERP = 12;

// Input is sent at the snapshot rate rather than the frame rate. Sixty position
// updates a second from four tablets is a lot of nothing: the server only reads
// the newest one before each snapshot anyway.
const INPUT_HZ = 10;

// The address is derived, never configured. The page and the socket come from
// the same origin by design (server/server.mjs serves both on one port), so
// there is nothing for a player to type and nothing to get wrong.
export function defaultUrl() {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/ws`;
}

export class NetClient {
  constructor(opts = {}) {
    this.url = opts.url || defaultUrl();
    this.name = cleanName(opts.name);
    this.ws = null;
    this.id = null;
    this.seed = null;
    this.spawn = null;
    this.status = 'idle';     // idle | connecting | live | closed | error
    this.error = null;
    // The room's world clock, in seconds, as of the last snapshot. NaN until the
    // first one lands. The game eases its own clock toward this rather than
    // running a private one, because a private one drifts apart on frame timing
    // alone and comes apart completely the moment somebody sleeps.
    this.serverTime = NaN;

    // Remote state, smoothed. `t*` is where the server last said the thing was;
    // the un-prefixed fields are where it is being drawn this frame.
    this.players = new Map();
    this.mobs = new Map();

    this.character = null;    // set from the welcome; see _onWelcome
    this.chatLog = [];
    this.on = {
      welcome: opts.onWelcome || (() => {}),
      edits: opts.onEdits || (() => {}),
      combat: opts.onCombat || (() => {}),
      chat: opts.onChat || (() => {}),
      roster: opts.onRoster || (() => {}),
      denied: opts.onDenied || (() => {}),
      close: opts.onClose || (() => {}),
      slept: opts.onSlept || (() => {}),
    };
    // -Infinity, not 0: the first sendInput must always go out, or a player who
    // joins is invisible to everyone until the throttle window happens to pass.
    this._inputAt = -Infinity;
    this._lastSent = null;
  }

  get live() { return this.status === 'live'; }

  // Resolves with the welcome payload, or rejects with something worth showing a
  // person. The caller needs the seed before it can build a world, so joining is
  // a promise rather than an event.
  connect() {
    return new Promise((resolve, reject) => {
      this.status = 'connecting';
      let settled = false;
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        this.status = 'error';
        this.error = msg;
        reject(new Error(msg));
      };

      try { this.ws = new WebSocket(this.url); }
      catch { return fail('That address is not reachable.'); }

      // A server that is not running looks identical to one that is slow, until
      // it does not answer. Ten seconds is generous on a LAN.
      const timer = setTimeout(() => {
        if (!settled) { try { this.ws.close(); } catch { /* already gone */ } fail('No answer from the server.'); }
      }, 10000);

      this.ws.addEventListener('open', () => {
        this._send({ t: C.JOIN, name: this.name, version: PROTOCOL_VERSION });
      });

      this.ws.addEventListener('message', (ev) => {
        const m = decode(ev.data);
        if (!m) return;
        if (!settled && m.t === S.WELCOME) {
          settled = true;
          clearTimeout(timer);
          this._onWelcome(m);
          resolve(m);
          return;
        }
        if (!settled && m.t === S.DENIED) {
          clearTimeout(timer);
          return fail(m.reason || 'The server turned the connection away.');
        }
        this._onMessage(m);
      });

      this.ws.addEventListener('error', () => {
        clearTimeout(timer);
        fail('Could not reach the server. Is it still running?');
      });

      this.ws.addEventListener('close', () => {
        clearTimeout(timer);
        const wasLive = this.status === 'live';
        this.status = 'closed';
        if (wasLive) this.on.close();
        if (!settled) fail('The connection closed before joining.');
      });
    });
  }

  close() {
    this.status = 'closed';
    try { this.ws?.close(1000, 'left'); } catch { /* already gone */ }
  }

  // ---- outbound -------------------------------------------------------------
  _send(msg) {
    if (this.ws?.readyState !== 1) return false;
    try { this.ws.send(encode(msg)); return true; } catch { return false; }
  }

  // Called every frame; sends at INPUT_HZ. Also skips a send when nothing has
  // moved, so a player standing still in a menu is silent on the wire.
  sendInput(p, now) {
    if (!this.live) return;
    if (now - this._inputAt < 1000 / INPUT_HZ) return;
    const next = {
      t: C.INPUT,
      x: round2(p.x), y: round2(p.y), z: round2(p.z),
      yaw: round2(p.yaw), pitch: round2(p.pitch ?? 0),
      anim: p.anim || 'idle', sneak: !!p.sneak,
    };
    const same = this._lastSent
      && next.x === this._lastSent.x && next.y === this._lastSent.y && next.z === this._lastSent.z
      && next.yaw === this._lastSent.yaw && next.anim === this._lastSent.anim;
    this._inputAt = now;
    if (same) return;
    this._lastSent = next;
    this._send(next);
  }

  sendEdit(x, y, z, id) { return this._send({ t: C.EDIT, x, y, z, id }); }
  sendAttack(id) { return this._send({ t: C.ATTACK, id }); }
  sendDisengage() { return this._send({ t: C.DISENGAGE }); }
  sendChat(text) { return this._send({ t: C.CHAT, text }); }
  // Asks; does not tell. Whether the night actually passes is the room's call.
  sendSleep() { return this._send({ t: C.SLEEP }); }

  // Hand this character to the room, which is where it lives while connected.
  // Returns false if the socket is not up, so the caller can fall back to disk
  // rather than quietly dropping somebody's afternoon.
  sendSave(data) { return this._send({ t: C.SAVE, data }); }

  // ---- inbound --------------------------------------------------------------
  _onWelcome(m) {
    this.status = 'live';
    this.id = m.you;
    this.name = m.name || this.name;
    this.seed = m.seed;
    this.spawn = m.spawn;
    this.snapHz = m.snapHz || 10;
    if (Number.isFinite(m.time)) this.serverTime = m.time;
    // This name's character, as the room last had it — from whichever device
    // last played. Null the first time anybody uses the name. Held rather than
    // delivered for the same reason as the edits: there is no game yet.
    this.character = m.character || null;
    // Held rather than delivered, because the game does not exist yet: the seed
    // in this same message is what it will be built from, and the edits have to
    // be applied to that world once it does.
    this._welcomeEdits = m.edits || [];
    for (const p of m.players || []) this._putPlayer(p, true);
    this.on.welcome(m);
    this.on.roster(this.roster());
  }

  _onMessage(m) {
    switch (m.t) {
      case S.SNAPSHOT: {
        if (Number.isFinite(m.time)) this.serverTime = m.time;
        for (const p of m.players || []) this._putPlayer(p, false);
        // Anyone absent from a snapshot has gone; the server sends the full
        // roster every time, so a missing id is authoritative rather than a
        // dropped packet.
        const present = new Set((m.players || []).map((p) => p.id));
        for (const id of [...this.players.keys()]) if (!present.has(id)) this.players.delete(id);
        this._putMobs(m.mobs || []);
        break;
      }
      case S.EDITS:
        this.on.edits(m.list || []);
        break;
      case S.JOINED:
        if (m.player) { this._putPlayer(m.player, true); this.on.roster(this.roster()); }
        this.on.chat({ system: true, text: `${m.player?.name || 'Someone'} joined.` });
        break;
      case S.LEFT:
        this.players.delete(m.id);
        this.on.roster(this.roster());
        this.on.chat({ system: true, text: `${m.name || 'Someone'} left.` });
        break;
      case S.CHAT:
        this.chatLog.push({ from: m.from, text: m.text });
        if (this.chatLog.length > 60) this.chatLog.shift();
        this.on.chat({ from: m.from, text: m.text });
        break;
      case S.COMBAT:
        this.on.combat(m.events || []);
        break;
      case S.SLEPT:
        // The clock moves through serverTime like any other correction; this is
        // only so the sunrise has a name attached to it.
        if (Number.isFinite(m.time)) this.serverTime = m.time;
        this.on.slept(m.by || '');
        break;
      case S.DENIED:
        this.on.denied(m.reason || '');
        break;
      default:
        break;
    }
  }

  _putPlayer(p, snap) {
    const cur = this.players.get(p.id);
    if (!cur) {
      this.players.set(p.id, {
        id: p.id, name: p.name, anim: p.anim, hp: p.hp,
        x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch,
        tx: p.x, ty: p.y, tz: p.z, tyaw: p.yaw,
        // When this body last changed what it was doing. A one-shot clip (the
        // attack swing) is played from here; without it the renderer has no
        // start time and freezes the swing on its last frame forever.
        animAt: clock(),
        // A fixed per-body offset into the looping clips, so two children
        // walking side by side do not march in perfect lockstep like one
        // animation drawn twice.
        phase: phaseFor(p.id),
      });
      return;
    }
    cur.name = p.name ?? cur.name;
    if (p.anim !== undefined && p.anim !== cur.anim) cur.animAt = clock();
    cur.anim = p.anim ?? cur.anim;
    cur.hp = p.hp ?? cur.hp;
    cur.pitch = p.pitch ?? cur.pitch;
    cur.tx = p.x; cur.ty = p.y; cur.tz = p.z; cur.tyaw = p.yaw;
    // A player who just arrived, or who teleported (a waystone, a lesson world),
    // should not slide across the map at walking pace.
    if (snap || Math.hypot(p.x - cur.x, p.z - cur.z) > 24) {
      cur.x = p.x; cur.y = p.y; cur.z = p.z; cur.yaw = p.yaw;
    }
  }

  _putMobs(list) {
    const present = new Set();
    for (const m of list) {
      present.add(m.id);
      const cur = this.mobs.get(m.id);
      if (!cur) {
        this.mobs.set(m.id, {
          ...m, tx: m.x, ty: m.y, tz: m.z, tyaw: m.yaw,
        });
        continue;
      }
      cur.hp = m.hp; cur.moving = m.moving;
      cur.tx = m.x; cur.ty = m.y; cur.tz = m.z; cur.tyaw = m.yaw;
      if (Math.hypot(m.x - cur.x, m.z - cur.z) > 24) { cur.x = m.x; cur.y = m.y; cur.z = m.z; }
    }
    for (const id of [...this.mobs.keys()]) if (!present.has(id)) this.mobs.delete(id);
  }

  // Called once a frame. Everything positional eases toward the last thing the
  // server said, so a 10Hz feed draws at 60.
  update(dt) {
    const k = Math.min(1, dt * LERP);
    for (const c of this.players.values()) ease(c, k);
    for (const c of this.mobs.values()) ease(c, k);
  }

  roster() {
    return [{ id: this.id, name: this.name, self: true },
      ...[...this.players.values()].map((p) => ({ id: p.id, name: p.name, self: false }))];
  }
}

function ease(c, k) {
  c.x += (c.tx - c.x) * k;
  c.y += (c.ty - c.y) * k;
  c.z += (c.tz - c.z) * k;
  // Yaw wraps, so easing the raw number spins a body the long way round when it
  // crosses ±π.
  let d = c.tyaw - c.yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  c.yaw += d * k;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Seconds, monotonic where the browser offers it. Only ever used as a
// difference, so the epoch does not matter.
export const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

// A stable pseudo-random offset in [0, 2) derived from the player id, so the
// same body always animates on the same beat rather than jumping when a
// snapshot re-creates it.
function phaseFor(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) | 0;
  return Math.abs(h % 2000) / 1000;
}
