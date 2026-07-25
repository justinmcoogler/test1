// Portable characters: who you are, kept separately from where you are.
//
// A save used to be one blob per slot — skills, inventory, quest progress, the
// terrain you had dug and the world seed, all in one object. That made the
// character and the world the same thing, so rolling a new world meant rolling a
// new person, and a hundred hours of Mining went with the old seed.
//
// THE LINE. A CHARACTER is everything you would carry through a door: skills,
// what is in your pack, the mounts and pets that answer to you, the recipes you
// have worked out, and a child's lesson progress. A WORLD is everything that is
// true of one particular seed: the blocks you have changed, the chests, the
// crops, the clock, which bosses are dead, which waystones you have found, and
// the quest chain's state.
//
// POSITION IS THE INTERESTING CASE and it belongs to the WORLD. A coordinate
// means nothing anywhere else — carrying (24, 47, -76) into a fresh seed drops
// you inside a mountain. So a world remembers where each character was standing
// when they left it, and a character arriving somewhere new starts at that
// world's spawn.
//
// Quest progress is the other judgement call, and it is the WORLD's. Gorrak dies
// once per world, the Rootgrave hoard unseals once per world, and a character
// who walks into a fresh seed should find the chain waiting for them again. The
// skills they earned doing it the first time come with them; the fact that they
// did it does not.
//
// Everything here is pure data and localStorage. No DOM, no game objects — which
// is what lets the whole split be unit-tested without booting a world.

const CHAR_PREFIX = 'sproutlands_char_';
export const EXPORT_TAG = 'SPROUT1';

// The character's half of a save, by key. Written out rather than inferred so
// that adding a system to the game is a deliberate decision about which side of
// the line it falls on — a new key that nobody classifies simply stays with the
// world, which is the safe default (it cannot corrupt a different seed).
export const CHARACTER_KEYS = [
  'player',           // stats, vitals, appearance — NOT position, see below
  'inventory',
  'skills',
  'stable',           // tamed mounts and pets
  'discovered',       // recipes worked out
  'discoveredItems',  // items seen, for the compendium
  'education',        // learning-mode mode + earned play time
  'lessons',          // …and which lessons are done
];

// The world's half. `pos` is added by splitSave — it is not in the old payload.
export const WORLD_KEYS = [
  'world',            // seed, clock, edits, chests, crops, node timers
  'enemies',
  'quests',           // per-world: the chain resets in a new seed
  'flags',            // boss kills
  'waystones',        // a network of places, so meaningless elsewhere
  'bedSpawn',         // a coordinate
];

// Position is stripped out of the player blob and stored on the WORLD side.
// These are the fields that only mean something relative to one seed.
const POSITION_FIELDS = ['x', 'y', 'z', 'yaw', 'pitch'];

let idCounter = 0;
// Ids have to be unique without a clock we can trust (two characters minted in
// the same millisecond is a real case when importing a pack of them).
function mintId() {
  idCounter += 1;
  return `c${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// ---- the split --------------------------------------------------------------

// Take a full in-memory save payload and cut it in two. Returns
// { character, world } where neither shares a mutable object with the input.
export function splitSave(data, { id = null, name = null } = {}) {
  const src = data || {};
  const character = {
    id: id || src.meta?.characterId || mintId(),
    name: name || src.meta?.characterName || 'Wanderer',
    savedAt: Date.now(),
    playtime: Math.round(src.meta?.playtime || 0),
    totalLevel: src.meta?.totalLevel || 0,
    mode: src.meta?.mode || 'free',
    version: 1,
  };
  for (const k of CHARACTER_KEYS) if (src[k] !== undefined) character[k] = src[k];

  // Lift the position out of the player blob onto the world side.
  const world = {};
  for (const k of WORLD_KEYS) if (src[k] !== undefined) world[k] = src[k];
  if (src.player && typeof src.player === 'object') {
    const body = { ...src.player };
    const pos = {};
    for (const f of POSITION_FIELDS) {
      if (body[f] !== undefined) { pos[f] = body[f]; delete body[f]; }
    }
    character.player = body;
    if (Object.keys(pos).length) world.pos = pos;
  }
  return { character, world };
}

// Put the two halves back together into the payload the game restores from.
// A character with no world (a fresh seed) still produces a valid payload —
// every world key is simply absent, which every deserializer already treats as
// "start from nothing".
export function joinSave(character, world, meta = {}) {
  const c = character || {};
  const w = world || {};
  const out = {
    meta: {
      seedText: meta.seedText ?? w.meta?.seedText ?? '',
      savedAt: Date.now(),
      playtime: Math.round(c.playtime || 0),
      totalLevel: c.totalLevel || 0,
      mode: c.mode || 'free',
      characterId: c.id || null,
      characterName: c.name || 'Wanderer',
      version: 2,
    },
  };
  for (const k of CHARACTER_KEYS) if (c[k] !== undefined) out[k] = c[k];
  for (const k of WORLD_KEYS) if (w[k] !== undefined) out[k] = w[k];
  // Re-seat the body in this world. A character arriving somewhere new has no
  // `pos` here at all, and main.js then falls back to the world's spawn marker.
  if (out.player && w.pos) out.player = { ...out.player, ...w.pos };
  return out;
}

// ---- storage ----------------------------------------------------------------

export function listCharacters() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(CHAR_PREFIX)) continue;
      const c = safeParse(localStorage.getItem(k));
      if (!c || !c.id) continue;
      out.push({
        id: c.id,
        name: c.name || 'Wanderer',
        totalLevel: c.totalLevel || 0,
        playtime: c.playtime || 0,
        savedAt: c.savedAt || 0,
        mode: c.mode || 'free',
      });
    }
  } catch { /* private mode: no characters, not a crash */ }
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

export function loadCharacter(id) {
  if (!id) return null;
  try { return safeParse(localStorage.getItem(CHAR_PREFIX + id)); } catch { return null; }
}

export function saveCharacter(c) {
  if (!c?.id) return false;
  try { localStorage.setItem(CHAR_PREFIX + c.id, JSON.stringify(c)); return true; } catch { return false; }
}

export function deleteCharacter(id) {
  try { localStorage.removeItem(CHAR_PREFIX + id); } catch { /* nothing to do */ }
}

// A brand-new character with nothing in it. Every system's deserializer treats
// an absent key as "fresh", so an empty character is exactly a new game.
export function newCharacter(name = 'Wanderer') {
  return { id: mintId(), name: String(name).slice(0, 24) || 'Wanderer', savedAt: Date.now(), playtime: 0, totalLevel: 0, mode: 'free', version: 1 };
}

// ---- portability ------------------------------------------------------------
// A character you can take off this device: base64 so it survives being pasted
// through a chat window without a newline breaking it, tagged so we can tell a
// character apart from any other string somebody pastes into the box.

function toB64(str) {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
  return Buffer.from(str, 'utf8').toString('base64');   // node, for the tests
}
function fromB64(str) {
  if (typeof atob === 'function') return decodeURIComponent(escape(atob(str)));
  return Buffer.from(str, 'base64').toString('utf8');
}

export function exportCharacter(c) {
  if (!c?.id) return '';
  return `${EXPORT_TAG}:${toB64(JSON.stringify(c))}`;
}

// Returns { ok, character, error }. Never throws — this is fed by a text box,
// so "that is not a character" is an ordinary outcome and has to read like one.
export function importCharacter(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, error: 'Paste a character code first.' };
  if (!raw.startsWith(`${EXPORT_TAG}:`)) {
    return { ok: false, error: `That does not look like a character code — they start with ${EXPORT_TAG}:` };
  }
  let c;
  try { c = JSON.parse(fromB64(raw.slice(EXPORT_TAG.length + 1))); } catch {
    return { ok: false, error: 'That code is damaged — it may have been cut short when it was copied.' };
  }
  if (!c || typeof c !== 'object' || !c.skills) {
    return { ok: false, error: 'That code is not a character.' };
  }
  // Always re-mint the id. Importing your own character twice should give you
  // two of them rather than silently overwriting the one you are playing.
  c.id = mintId();
  c.name = String(c.name || 'Wanderer').slice(0, 24);
  c.savedAt = Date.now();
  return { ok: true, character: c };
}

// ---- migration --------------------------------------------------------------

// A version-1 slot is one undivided blob. Split it, keep the world in the slot,
// and hand back the character so the caller can store it — every save made
// before this system existed becomes a portable character the first time it is
// opened, with nothing asked of the player.
export function migrateSlot(data) {
  if (!data) return null;
  if (data.meta?.version >= 2 && data.meta?.characterId) return null;  // already split
  const { character, world } = splitSave(data, { name: data.meta?.characterName || 'Wanderer' });
  return { character, world, seedText: data.meta?.seedText || String(data.world?.seed ?? '') };
}
