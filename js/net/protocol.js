// The wire protocol, shared verbatim by the browser client and the Node server.
//
// It lives under js/ rather than server/ for one reason: both sides import THIS
// file, so the message shapes cannot drift apart. A protocol defined twice is a
// protocol that is already broken.
//
// Everything is JSON. This is a game for four people on a home wifi network, not
// a shard of five hundred, and a readable protocol you can watch in devtools is
// worth far more here than the bytes a binary codec would save.
//
// SANITISE EVERYTHING FROM THE CLIENT. Not because anyone expects an attack on a
// living-room network, but because a child with the devtools console open is a
// certainty, and a NaN position or a 40MB chat message should bounce off the
// server rather than take the world down for everyone else.

// 2 added SLEEP/SLEPT and made the world clock the server's.
// 3 added SAVE — the room stores each player's character, not the browser.
export const PROTOCOL_VERSION = 3;

// client -> server
export const C = {
  JOIN: 'join',
  INPUT: 'input',       // position/orientation, sent at the client's input rate
  EDIT: 'edit',         // place or break one block
  ATTACK: 'attack',     // engage a mob
  DISENGAGE: 'disengage',
  CHAT: 'chat',
  SLEEP: 'sleep',       // "I got into a bed" — the ROOM decides whether night ends
  SAVE: 'save',         // this is my character; keep it for me
};

// server -> client
export const S = {
  WELCOME: 'welcome',   // seed + full edit set + who is here
  SNAPSHOT: 'snapshot', // players and nearby mobs, every snapshot tick
  EDITS: 'edits',       // authoritative block changes
  JOINED: 'joined',
  LEFT: 'left',
  CHAT: 'chat',
  COMBAT: 'combat',     // hitsplats, deaths, loot — things that need a one-off
  DENIED: 'denied',     // your action was refused, with a reason to show
  SLEPT: 'slept',       // somebody's night passed, and it is everybody's night
};

export const MAX_NAME = 16;
export const MAX_CHAT = 160;

// Control characters, which must never reach another player's screen.
const CTRL = /[\x00-\x1f\x7f]/g;

export function encode(msg) { return JSON.stringify(msg); }

// Never throws. A message that does not parse is not a message.
export function decode(str) {
  if (typeof str !== 'string' || str.length > 1000000) return null;
  try {
    const m = JSON.parse(str);
    return (m && typeof m === 'object' && typeof m.t === 'string') ? m : null;
  } catch { return null; }
}

// ---- sanitisers -------------------------------------------------------------
// Each returns a clean object, or null if the message cannot be salvaged. They
// are deliberately total: given ANY input they return a value or null, and never
// throw.

const num = (v, lo, hi, dflt = 0) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : dflt;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : NaN;
};

// ONE RULE FOR CONTROL CHARACTERS: every one becomes a space, and runs of
// whitespace then collapse. Deleting them outright is the obvious thing and it
// is wrong in a small way that matters — a newline is a word separator, so
// "Ada\nLovelace" would arrive as "AdaLovelace" rather than as two words. Since
// a name and a chat line are both single-line strings, turning the whole class
// into whitespace and then collapsing handles the separators and the genuinely
// unprintable bytes with the same pass.
const flatten = (raw) => String(raw ?? '').replace(CTRL, ' ').replace(/\s+/g, ' ').trim();

// Names are shown to other people, so they get the strictest treatment:
// printable characters only, collapsed whitespace, length-capped, never empty.
export function cleanName(raw) {
  return flatten(raw).slice(0, MAX_NAME).trim() || 'Player';
}

export function cleanChat(raw) {
  return flatten(raw).slice(0, MAX_CHAT).trim() || null;
}

// World bounds. Y is clamped to the build range; X/Z to something far larger
// than anyone will walk to, purely so a garbage value cannot make the server
// generate chunks forever.
export const WORLD_LIMIT = 1000000;
export const Y_MIN = -64, Y_MAX = 512;

export function cleanInput(m) {
  if (!m) return null;
  return {
    x: num(m.x, -WORLD_LIMIT, WORLD_LIMIT),
    y: num(m.y, Y_MIN, Y_MAX),
    z: num(m.z, -WORLD_LIMIT, WORLD_LIMIT),
    yaw: num(m.yaw, -Math.PI * 4, Math.PI * 4),
    pitch: num(m.pitch, -Math.PI, Math.PI),
    // A short animation tag the renderer maps to a clip. An unknown tag renders
    // as idle, so an invented one is harmless rather than an error.
    anim: typeof m.anim === 'string' ? m.anim.slice(0, 12) : 'idle',
    sneak: !!m.sneak,
  };
}

export function cleanEdit(m) {
  if (!m) return null;
  const x = num(m.x, -WORLD_LIMIT, WORLD_LIMIT, NaN);
  const y = num(m.y, Y_MIN, Y_MAX, NaN);
  const z = num(m.z, -WORLD_LIMIT, WORLD_LIMIT, NaN);
  const id = num(m.id, 0, 65535, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(id)) return null;
  return { x: Math.trunc(x), y: Math.trunc(y), z: Math.trunc(z), id: Math.trunc(id) };
}

export function cleanId(v) {
  return typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null;
}

// The cap on one player's stored character, encoded. A real one is a few
// kilobytes — an inventory, twenty-one skill totals, a quest log and a list of
// waystones. A quarter of a megabyte is far past anything the game produces and
// well short of anything that would hurt a laptop holding four of them.
export const MAX_SAVE = 262144;

// A character blob on its way to the room. It is opaque: the server stores it
// and hands it back to the same player, and only the game that wrote it knows
// what the fields mean. So the checks here are about SIZE and SHAPE, not
// content — the one thing the server must not do is let a child with the
// devtools console open push a forty-megabyte string into everyone's save file.
export function cleanSave(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  let text;
  try { text = JSON.stringify(data); } catch { return null; }   // cyclic, or a BigInt
  if (!text || text.length > MAX_SAVE) return null;
  // Re-parsed rather than kept: what gets stored is then provably plain JSON,
  // and cannot share a reference with anything the caller still holds.
  try { return JSON.parse(text); } catch { return null; }
}
