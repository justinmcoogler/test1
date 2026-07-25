// Procedural dungeons: a seeded room-and-corridor graph — six to fourteen rooms
// on a coarse lattice, joined into a spanning tree so nothing can be orphaned,
// with one boss room behind a locked grate and the key on a mini-boss you meet
// on the way in. Theme follows the ring: crypt → ruin → fortress → vault.
//
// Same chunk-local contract as the mineshaft (js/world/sites.js): a layout is a
// pure function of (seed, region), and a chunk rasterises only its own slice.
import { B } from './blocks.js';
import { settlementNear } from './settlements.js';
import { CHUNK, SEA, ringAt } from './worldgen.js';
import { mulberry32 } from '../core/rng.js';
import {
  ANCHOR, RANGE, anchorIn, regionRange, cachedLayout, nearHandBuilt, padHeight, onRoad,
  beginStamp, overlaps, put, box, walls, putNode, putSpawn, putChest,
  shaftShell, shaftBore, shaftFittings, randInt,
} from './sites.js';

const SALT = 918277;
export const DG_REGION = 256;      // one candidate dungeon per 256×256 blocks
const DG_MARGIN = 62;
// Rarer than a mineshaft on purpose. A mineshaft is somewhere you work and there
// should be one over most ridges; a dungeon is somewhere you go, and at about one
// per six hundred blocks it stays an expedition rather than scenery.
const DG_CHANCE = 0.28;
// Conservative reach bound for the cheap chunk reject; the layout carries the
// exact AABB and a test asserts the exact one never exceeds this.
export const DG_HALF = 46;

const CELL = 18;                   // room lattice pitch
const CELL_R = 2;                  // lattice cells either side of the entrance
const PAD = 4;                     // surface mouth half-width
const ROOM_H = 4;                  // interior height of an ordinary room
const BOSS_H = 6;

// Theme by ring. Difficulty is distance (js/world/worldgen.js `ringAt`), so the
// masonry, the lamps, the roster and the payout all step together as you walk
// out: a mossy crypt near home, a sunken ruin, a garrison fortress, then a vault.
//
// A procedural dungeon is a goblin warren that moved into somebody else's
// masonry, so the roster is the same eight liveries you meet on the surface —
// what changes with the ring is the MIX and the pay, not the bestiary. The two
// chiefs are the boss slots at the deep end, and yes, that is the same warchief
// type as the hand-built Gorrak: main.js keys its world flags off the SPAWN ID,
// not the mob type, so killing a procedural warchief cannot unseal the
// Rootgrave from the other side of the map. (It used to key off type, which is
// why this comment used to say the opposite.)
const THEMES = [
  {
    key: 'crypt', wall: 'stone_brick', floor: 'mossy_cobble', trim: 'bone_block', light: 'torch_post',
    fill: ['rat', 'cave_goblin', 'scrap_goblin', 'rat'], mini: 'goblin_slinger', boss: 'scrap_goblin', dig: 'dig_site',
    bossLoot: [['coin', 150], ['relic_fragment', 2], ['old_coin', 6], ['uncut_amethyst', 1]],
    keyLoot: [['coin', 40], ['torch_item', 4], ['pottery_shard', 3]],
  },
  {
    key: 'ruin', wall: 'ruin_brick', floor: 'mossy_ruin', trim: 'rootstone', light: 'torch_post',
    fill: ['cave_goblin', 'bog_goblin', 'scrap_goblin', 'rat'], mini: 'goblin_slinger', boss: 'bog_goblin', dig: 'dig_trench',
    bossLoot: [['coin', 320], ['relic_fragment', 3], ['uncut_garnet', 1], ['veilcrystal', 1], ['ironbud_charm', 1]],
    keyLoot: [['coin', 90], ['iron_bar', 2], ['bone_needle', 2]],
  },
  {
    key: 'fortress', wall: 'stone_brick', floor: 'andesite', trim: 'iron_block', light: 'sea_lantern',
    fill: ['cave_goblin', 'ash_goblin', 'frost_goblin', 'goblin_slinger'], mini: 'ash_goblin', boss: 'goblin_warchief', dig: 'dig_bog',
    bossLoot: [['coin', 640], ['relic_fragment', 4], ['uncut_sapphire', 1], ['veilcrystal', 2], ['keen_charm', 1]],
    keyLoot: [['coin', 200], ['silver_bar', 2], ['amber_resin', 2]],
  },
  {
    key: 'vault', wall: 'deepslate', floor: 'polished_tuff', trim: 'gilded_blackstone', light: 'glowstone',
    fill: ['ash_goblin', 'frost_goblin', 'goblin_slinger', 'cave_goblin'], mini: 'goblin_warchief', boss: 'goblin_warlord', dig: 'dig_vault',
    bossLoot: [['coin', 1200], ['relic_fragment', 6], ['uncut_diamond', 1], ['flawless_veilcrystal', 1], ['riftwarden_seal', 1]],
    keyLoot: [['coin', 400], ['veilcrystal', 1], ['uncut_topaz', 1]],
  },
];

// What the mini-boss is carrying, and the only thing that opens the grate below.
// It lives here, in the generator, because the generator is the lower layer:
// js/game/dungeonlock.js (the runtime half of the lock) imports it and re-exports
// it, so the two halves cannot disagree about what the key is. They did once —
// this constant said `relic_fragment` while the runtime spent `warden_key`, and
// every door in the world went out stamped with the wrong key id.
//
// It is deliberately NOT `relic_fragment`, which is what this module used to
// nominate on the rule that worldgen may not invent items. A relic fragment has
// about eight other sources (every mineshaft chest tier, both hand-built boss
// chests, three mob drop tables, waterlogged caches) and every theme's `bossLoot`
// pays them out, so a player arrives at their first grate already holding a
// stack. A lock that opens to an item you cannot avoid owning is not a lock, and
// the key holder standing between you and it is decoration. `warden_key` exists
// for this and nothing else. It is consumed on use — one warden, one grate — and
// because the warden respawns, losing it can never soft-lock a dungeon.
export const KEY_ITEM = 'warden_key';

const DIRS = [1, 0, -1, 0, 0, 1, 0, -1];
// Hoisted: stampOne runs per chunk per site and must not allocate to do it.
const PIERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const NO_LANDINGS = [];
const CORR = new Int32Array(4);   // reused corridor-bounds out-param
const CACHE = new Map();
const CACHE_CAP = 64;

// ---- layout ----------------------------------------------------------------
function buildDungeon(gen, rx, rz) {
  if (!anchorIn(gen.seed, SALT, DG_REGION, DG_MARGIN, DG_CHANCE, rx, rz)) return null;
  const ax = ANCHOR.x, az = ANCHOR.z;
  if (nearHandBuilt(ax, az)) return null;
  // …and clear of a procedural town, for the same reason mineshaft.js is: towns
  // stamp last, so a stair down capped by a market square leaves a whole dungeon
  // — grate, warden, boss and hoard — sealed under the paving with no entrance.
  if (settlementNear(gen, ax, az, PAD + 1)) return null;
  if (onRoad(gen, ax, az, PAD + 1)) return null;
  const surfaceY = padHeight(gen, ax, az, PAD, 5);
  if (surfaceY < 0) return null;

  const rand = mulberry32((gen.seed ^ Math.imul(rx, 83492791) ^ Math.imul(rz, 29354851) ^ SALT) >>> 0);
  const ring = ringAt(ax, az);
  const theme = THEMES[ring];

  // Deep enough to sit under the terrain on a slope, high enough to clear
  // bedrock; the boss room's taller ceiling has to fit under the roof too.
  let y = surfaceY - 18 - randInt(rand, 0, 10);
  if (y > SEA - 10) y = SEA - 10;
  if (y < 12) y = 12;

  // ---- rooms: a spanning tree, grown one room at a time ---------------------
  // Each new room attaches to a room that already exists, so the graph is a tree
  // by construction and no room can be orphaned. That is the whole reason the
  // layout is grown rather than scattered-then-connected.
  const want = randInt(rand, 6, 14);
  const rooms = [];
  const byCell = new Map();
  const cellKey = (i, j) => (i + 8) * 17 + (j + 8);
  rooms.push({ i: 0, j: 0, x: ax, z: az, hx: 4, hz: 4, parent: -1, depth: 0, kind: 'entry' });
  byCell.set(cellKey(0, 0), 0);
  for (let guard = 0; rooms.length < want && guard < 90; guard++) {
    const pool = rooms.length;
    const pick = pool - 1 - Math.floor(rand() * (pool < 4 ? pool : 4));
    const from = rooms[pick];
    const spin = Math.floor(rand() * 4) * 2;
    for (let k = 0; k < 4; k++) {
      const d = (spin + k * 2) % 8;
      const ni = from.i + DIRS[d], nj = from.j + DIRS[d + 1];
      if (ni < -CELL_R || ni > CELL_R || nj < -CELL_R || nj > CELL_R) continue;
      if (byCell.has(cellKey(ni, nj))) continue;
      byCell.set(cellKey(ni, nj), rooms.length);
      rooms.push({
        i: ni, j: nj, x: ax + ni * CELL, z: az + nj * CELL,
        hx: randInt(rand, 3, 5), hz: randInt(rand, 3, 5),
        parent: pick, depth: from.depth + 1, kind: 'normal',
      });
      break;
    }
  }
  if (rooms.length < 4) return null;                     // too cramped to be a dungeon

  // ---- boss room, locked edge, key room ------------------------------------
  // The boss room is the deepest LEAF, and the lock goes on the one tree edge
  // that reaches it. Leaf + "no extra edge may touch it" is what makes the lock
  // load-bearing: cutting that single edge isolates exactly the boss room, so
  // every other room — the key room included — stays reachable from the stairs.
  const childCount = new Int16Array(rooms.length);
  for (const r of rooms) if (r.parent >= 0) childCount[r.parent]++;
  let boss = -1;
  for (let k = 1; k < rooms.length; k++) {
    if (childCount[k] !== 0) continue;
    if (boss < 0 || rooms[k].depth > rooms[boss].depth) boss = k;
  }
  if (boss < 0) return null;
  rooms[boss].kind = 'boss';
  rooms[boss].hx = randInt(rand, 6, 7);
  rooms[boss].hz = randInt(rand, 6, 7);

  let keyRoom = 0;
  for (let k = 1; k < rooms.length; k++) {
    if (k === boss) continue;
    if (rooms[k].depth >= rooms[keyRoom].depth) keyRoom = k;
  }
  rooms[keyRoom].kind = 'key';

  const edges = [];
  for (let k = 1; k < rooms.length; k++) edges.push({ a: rooms[k].parent, b: k, locked: k === boss });

  // A couple of loops so the place doesn't read as a single corridor — never on
  // the boss room, or the lock would have a way around it.
  for (let tries = 0, added = 0; tries < 12 && added < 2; tries++) {
    const a = Math.floor(rand() * rooms.length);
    const d = Math.floor(rand() * 4) * 2;
    const b = byCell.get(cellKey(rooms[a].i + DIRS[d], rooms[a].j + DIRS[d + 1]));
    if (b === undefined || a === b || a === boss || b === boss) continue;
    if (edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
    edges.push({ a, b, locked: false });
    added++;
  }

  // The grate sits in the boss room's own wall, on the side the corridor enters
  // from — you see it from the corridor before you can reach anything behind it.
  const bossRoom = rooms[boss], from = rooms[bossRoom.parent];
  const alongX = bossRoom.z === from.z;
  const sign = alongX ? Math.sign(from.x - bossRoom.x) : Math.sign(from.z - bossRoom.z);
  const door = {
    x: alongX ? bossRoom.x + sign * (bossRoom.hx + 1) : bossRoom.x,
    y: y + 1,
    z: alongX ? bossRoom.z : bossRoom.z + sign * (bossRoom.hz + 1),
    alongX,
    keyItem: KEY_ITEM,
    keyHolder: `dg:${rooms[keyRoom].x},${y + 1},${rooms[keyRoom].z}`,
  };

  // ---- population -----------------------------------------------------------
  const spawns = [];
  for (let k = 0; k < rooms.length; k++) {
    const r = rooms[k];
    if (k === boss) continue;
    const n = k === 0 ? 1 : randInt(rand, 1, 3);
    for (let s = 0; s < n; s++) {
      const type = theme.fill[Math.floor(rand() * theme.fill.length)];
      const ox = randInt(rand, -(r.hx - 2), r.hx - 2);   // clear of the corner piers
      const oz = randInt(rand, -(r.hz - 2), r.hz - 2);
      spawns.push({ type, x: r.x + ox, y: y + 1, z: r.z + oz, boss: false });
    }
  }
  const kr = rooms[keyRoom];
  spawns.push({ type: theme.mini, x: kr.x, y: y + 1, z: kr.z, boss: true, key: true });
  spawns.push({ type: theme.boss, x: bossRoom.x, y: y + 1, z: bossRoom.z, boss: true });

  let minX = ax - PAD, maxX = ax + PAD, minZ = az - PAD, maxZ = az + PAD;
  for (const r of rooms) {
    if (r.x - r.hx - 1 < minX) minX = r.x - r.hx - 1;
    if (r.x + r.hx + 1 > maxX) maxX = r.x + r.hx + 1;
    if (r.z - r.hz - 1 < minZ) minZ = r.z - r.hz - 1;
    if (r.z + r.hz + 1 > maxZ) maxZ = r.z + r.hz + 1;
  }

  return {
    rx, rz, x: ax, z: az, ring, theme, surfaceY, y, rooms, edges, door,
    boss, keyRoom, spawns,
    bossChest: {
      id: `dg:${bossRoom.x},${y + 1},${bossRoom.z + bossRoom.hz - 1}`,
      x: bossRoom.x, y: y + 1, z: bossRoom.z + bossRoom.hz - 1,
      loot: theme.bossLoot.map(([item, qty]) => ({ item, qty })),
    },
    keyChest: {
      id: `dg:${kr.x + 2},${y + 1},${kr.z}`, x: kr.x + 2, y: y + 1, z: kr.z,
      loot: theme.keyLoot.map(([item, qty]) => ({ item, qty })),
    },
    minX, maxX, minZ, maxZ,
  };
}

export function dungeonAt(gen, rx, rz) {
  return cachedLayout(CACHE, CACHE_CAP, `${gen.seed}:${rx}:${rz}`, () => buildDungeon(gen, rx, rz));
}

// ---- stamping --------------------------------------------------------------
// Shells first, bores second — the same rule as the mineshaft, and for the same
// reason: a corridor's shell runs through the rooms at either end, so writing it
// after their bores would brick both doorways shut.
function roomHeight(r) { return r.kind === 'boss' ? BOSS_H : ROOM_H; }

function shellRoom(r, y, wall) {
  const h = roomHeight(r);
  if (!overlaps(r.x - r.hx - 1, r.z - r.hz - 1, r.x + r.hx + 1, r.z + r.hz + 1)) return;
  box(r.x - r.hx - 1, y, r.z - r.hz - 1, r.x + r.hx + 1, y + h + 1, r.z + r.hz + 1, wall);
}

function boreRoom(r, y) {
  const h = roomHeight(r);
  if (!overlaps(r.x - r.hx, r.z - r.hz, r.x + r.hx, r.z + r.hz)) return;
  box(r.x - r.hx, y + 1, r.z - r.hz, r.x + r.hx, y + h, r.z + r.hz, B.air);
}

// Writes [x0, z0, x1, z1] into the shared CORR scratch — callers must consume it
// before the next call. Rooms only ever join across a lattice edge, so every
// corridor is a straight axis-aligned run.
function corridorBounds(a, b, pad) {
  if (a.z === b.z) {
    CORR[0] = Math.min(a.x, b.x); CORR[1] = a.z - pad;
    CORR[2] = Math.max(a.x, b.x); CORR[3] = a.z + pad;
  } else {
    CORR[0] = a.x - pad; CORR[1] = Math.min(a.z, b.z);
    CORR[2] = a.x + pad; CORR[3] = Math.max(a.z, b.z);
  }
  return CORR;
}

function stampOne(dg, sink) {
  if (!overlaps(dg.minX, dg.minZ, dg.maxX, dg.maxZ)) return;
  const { rooms, edges, y, theme, surfaceY, x, z } = dg;
  const wall = B[theme.wall], floorId = B[theme.floor], trim = B[theme.trim], light = B[theme.light];
  const headTop = surfaceY + 6;

  // ---- shells --------------------------------------------------------------
  for (const r of rooms) shellRoom(r, y, wall);
  for (const e of edges) {
    const c = corridorBounds(rooms[e.a], rooms[e.b], 2);
    if (!overlaps(c[0], c[1], c[2], c[3])) continue;
    box(c[0], y, c[1], c[2], y + 4, c[3], wall);
  }
  shaftShell(x, z, y, surfaceY, wall);
  box(x - PAD, surfaceY - 3, z - PAD, x + PAD, surfaceY, z + PAD, floorId);
  box(x - PAD, surfaceY + 1, z - PAD, x + PAD, headTop, z + PAD, B.air);

  // ---- bores ---------------------------------------------------------------
  for (const r of rooms) boreRoom(r, y);
  for (const e of edges) {
    const c = corridorBounds(rooms[e.a], rooms[e.b], 1);
    if (!overlaps(c[0], c[1], c[2], c[3])) continue;
    box(c[0], y + 1, c[1], c[2], y + 3, c[3], B.air);
  }
  shaftBore(x, z, y + 1, headTop);

  // ---- fittings ------------------------------------------------------------
  for (const r of rooms) {
    if (!overlaps(r.x - r.hx, r.z - r.hz, r.x + r.hx, r.z + r.hz)) continue;
    box(r.x - r.hx, y, r.z - r.hz, r.x + r.hx, y, r.z + r.hz, floorId);
    // Corner piers of the theme's trim, and a lamp at the ceiling's midpoint.
    for (const [dx, dz] of PIERS) {
      box(r.x + dx * (r.hx - 1), y + 1, r.z + dz * (r.hz - 1), r.x + dx * (r.hx - 1), y + roomHeight(r), r.z + dz * (r.hz - 1), trim);
    }
    put(r.x, y + roomHeight(r), r.z, light);
    // The boss room gets an inlaid border in the floor plane — read as ceremony,
    // and it stays out of the way of the fight.
    if (r.kind === 'boss') walls(r.x - r.hx, y, r.z - r.hz, r.x + r.hx, y, r.z + r.hz, trim);
  }
  // Corridor lamps hang from the ceiling, spaced off WORLD coordinates so they
  // line up across a chunk seam without either side knowing the other exists.
  for (const e of edges) {
    const a = rooms[e.a], b = rooms[e.b];
    const alongX = a.z === b.z;
    const lo = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
    const hi = alongX ? Math.max(a.x, b.x) : Math.max(a.z, b.z);
    for (let t = lo; t <= hi; t++) {
      if (((t % 6) + 6) % 6 !== 0) continue;
      put(alongX ? t : a.x, y + 3, alongX ? a.z : t, light);
    }
  }

  // The grate: a full-height barrier of iron bars in the boss room's wall,
  // framed in the theme's trim so it reads as deliberate rather than as rubble.
  const d = dg.door;
  if (d.alongX) {
    box(d.x, y + 1, d.z - 1, d.x, y + 3, d.z + 1, B.iron_bars);
    box(d.x, y + 1, d.z - 2, d.x, y + 4, d.z - 2, trim);
    box(d.x, y + 1, d.z + 2, d.x, y + 4, d.z + 2, trim);
  } else {
    box(d.x - 1, y + 1, d.z, d.x + 1, y + 3, d.z, B.iron_bars);
    box(d.x - 2, y + 1, d.z, d.x - 2, y + 4, d.z, trim);
    box(d.x + 2, y + 1, d.z, d.x + 2, y + 4, d.z, trim);
  }

  // Surface mouth: a broken ring of old masonry around the stair head. Whatever
  // this place was, the roof of it is the only part still above ground.
  for (let a = 0; a < 20; a++) {
    if (a % 5 === 0) continue;                     // gaps — a ruin, not a wall
    const ang = (a / 20) * Math.PI * 2;
    const px = x + Math.round(Math.cos(ang) * 4), pz = z + Math.round(Math.sin(ang) * 4);
    box(px, surfaceY + 1, pz, px, surfaceY + (a % 3 === 0 ? 3 : a % 2 === 0 ? 2 : 1), pz, a % 4 === 0 ? trim : wall);
  }
  put(x - PAD, surfaceY + 1, z - PAD, B.torch_post);
  put(x + PAD, surfaceY + 1, z + PAD, B.torch_post);
  shaftFittings(x, z, y + 1, surfaceY, NO_LANDINGS, floorId);
  put(x + 1, surfaceY + 1, z, B.ladder);

  putChest(dg.bossChest);
  putChest(dg.keyChest);
  const kr = rooms[dg.keyRoom], br = rooms[dg.boss];
  putNode({ type: theme.dig, x: kr.x - 2, y: y + 1, z: kr.z + 1 });
  putNode({ type: theme.dig, x: br.x - 3, y: y + 1, z: br.z - 3 });

  for (const s of dg.spawns) {
    putSpawn({ id: `dg:${s.x},${s.y},${s.z}`, type: s.type, x: s.x, y: s.y, z: s.z, fixed: true, boss: s.boss });
  }
}

// Rasterise every dungeon that reaches this chunk. Same sink contract as
// js/world/mineshaft.js.
export function stampDungeons(gen, cx, cz, sink) {
  const wx = cx * CHUNK, wz = cz * CHUNK;
  beginStamp(sink, cx, cz, CHUNK);
  regionRange(wx, wx + CHUNK - 1, DG_REGION, DG_HALF);
  const rx0 = RANGE.lo, rx1 = RANGE.hi;
  regionRange(wz, wz + CHUNK - 1, DG_REGION, DG_HALF);
  const rz0 = RANGE.lo, rz1 = RANGE.hi;
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      if (!anchorIn(gen.seed, SALT, DG_REGION, DG_MARGIN, DG_CHANCE, rx, rz)) continue;
      if (ANCHOR.x + DG_HALF < wx || ANCHOR.x - DG_HALF > wx + CHUNK - 1) continue;
      if (ANCHOR.z + DG_HALF < wz || ANCHOR.z - DG_HALF > wz + CHUNK - 1) continue;
      const dg = dungeonAt(gen, rx, rz);
      if (dg) stampOne(dg, sink);
    }
  }
}

// Surface columns the stair head owns, so worldgen doesn't grow a tree out of it.
export function dungeonClaims(gen, x, z) {
  regionRange(x, x, DG_REGION, PAD + 1);
  const rx0 = RANGE.lo, rx1 = RANGE.hi;
  regionRange(z, z, DG_REGION, PAD + 1);
  const rz0 = RANGE.lo, rz1 = RANGE.hi;
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      if (!anchorIn(gen.seed, SALT, DG_REGION, DG_MARGIN, DG_CHANCE, rx, rz)) continue;
      if (Math.abs(x - ANCHOR.x) > PAD + 1 || Math.abs(z - ANCHOR.z) > PAD + 1) continue;
      if (dungeonAt(gen, rx, rz)) return true;
    }
  }
  return false;
}

// Rooms you can walk to from the stair head. `throughLocked=false` refuses to
// pass the grate — the walk a player makes before they have the key. Kept beside
// the generator rather than in a test so the invariant lives next to the code
// that has to keep it.
export function reachableRooms(dg, throughLocked = true) {
  const adj = dg.rooms.map(() => []);
  for (const e of dg.edges) {
    if (e.locked && !throughLocked) continue;
    adj[e.a].push(e.b); adj[e.b].push(e.a);
  }
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    for (const n of adj[stack.pop()]) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return seen;
}

// Test/debug helper: the first dungeon found sweeping outward from the origin.
export function findDungeon(gen, spanRegions = 5) {
  for (let r = 0; r <= spanRegions; r++) {
    for (let rx = -r; rx <= r; rx++) {
      for (let rz = -r; rz <= r; rz++) {
        if (Math.max(Math.abs(rx), Math.abs(rz)) !== r) continue;
        const dg = dungeonAt(gen, rx, rz);
        if (dg) return dg;
      }
    }
  }
  return null;
}
