// Procedural mineshafts: a timber-shored warren of corridors on a 6-block
// lattice, stacked two or three levels deep, hung off a headframe you can spot
// from the surface. Ore gets richer the further down you go, dead ends cave in,
// and the deepest branch ends in a chest room.
//
// Chunk-local and deterministic by construction — see js/world/sites.js for the
// region/anchor scheme that makes that true. Nothing here reads a neighbouring
// chunk or any mutable state; a layout is a pure function of (seed, region) and
// each chunk rasterises only its own slice of it.
import { B } from './blocks.js';
import { CHUNK, SEA, ringAt } from './worldgen.js';
import { mulberry32 } from '../core/rng.js';
import {
  ANCHOR, RANGE, anchorIn, regionRange, cachedLayout, nearHandBuilt, padHeight, onRoad,
  beginStamp, overlaps, put, box, putNode, putSpawn, putChest,
  shaftShell, shaftBore, shaftFittings, pickFlat, randInt,
} from './sites.js';

const SALT = 74213;
export const MS_REGION = 128;      // one candidate mineshaft per 128×128 blocks
const MS_MARGIN = 30;              // anchor inset — bounds the reach into neighbours
const MS_CHANCE = 0.38;
// Conservative bound on how far a mineshaft reaches from its anchor. Only used
// for the cheap "could this site touch this chunk" reject; the layout carries its
// exact AABB, and a test asserts the exact one never exceeds this.
export const MS_HALF = 30;

const LATTICE = 6;                 // corridor grid pitch
const LAT_R = 4;                   // lattice cells either side of the shaft
const PAD = 3;                     // headframe pad half-width
const LEVEL_DROP = 7;              // vertical gap between levels
const SUPPORT_EVERY = 4;           // the plan asks for a set of timbers every ~4 blocks
const ROOM_HALF = 5;

// Ore gets richer with depth. The top level is the copper/tin/coal a starter
// pick can work; the middle adds iron and the base metals; the bottom is where
// silver and gold live. Flat [type, weight, …] so the tables never allocate.
const ORE_BY_LEVEL = [
  ['ore_copper', 40, 'ore_tin', 30, 'deposit_coal', 20, 'ore_iron', 10],
  ['ore_iron', 30, 'deposit_coal', 20, 'ore_copper', 16, 'ore_tin', 12, 'ore_lead', 14, 'ore_zinc', 8],
  ['ore_silver', 26, 'ore_iron', 22, 'ore_gold', 16, 'deposit_coal', 12, 'ore_lead', 12, 'ore_zinc', 12],
];
// The two metals with no surface table worth the walk only turn up at the bottom
// of a deep shaft in the far rings — the reason to take a mine seriously.
const ORE_DEEPEST = ['ore_platinum', 'ore_meteoric'];

// Who lives down there, by ring. Every id already spawns elsewhere in the world,
// so adding mineshafts cannot change what the reachability audit sees.
const MOBS = [
  ['gloomrat', 'cave_slime', 'crag_bat'],
  ['gloomrat', 'cave_slime', 'crag_bat', 'spider', 'skeleton'],
  ['skeleton', 'skeletal_archer', 'scrap_goblin', 'cave_slime', 'crag_bat'],
  ['skeletal_archer', 'gaze_orb', 'veil_crawler', 'cave_slime'],
];

// The pay chest at the end of the deepest branch, by ring.
const LOOT = [
  [['coin', 45], ['torch_item', 6], ['coal', 4], ['copper_ore', 4], ['uncut_quartz', 1]],
  [['coin', 110], ['iron_bar', 2], ['coal', 8], ['uncut_amethyst', 1], ['relic_fragment', 1]],
  [['coin', 240], ['silver_bar', 2], ['uncut_garnet', 1], ['uncut_topaz', 1], ['relic_fragment', 2]],
  [['coin', 480], ['uncut_sapphire', 1], ['uncut_emerald', 1], ['veilcrystal', 2], ['relic_fragment', 3]],
];

const DIRS = [1, 0, -1, 0, 0, 1, 0, -1];
const CACHE = new Map();
const CACHE_CAP = 96;

// ---- layout ----------------------------------------------------------------
// Grow one level's corridor tree out from the shaft. A tree, not a graph: every
// cell records the parent it was reached from, so "does the chest room connect
// back to the ladder" is answered by construction rather than by hoping a maze
// stayed open.
function growLevel(rand, ax, az, y, level, cells, segs) {
  const base = cells.length;
  const taken = new Set([(8 * 17) + 8]);           // encoded (0,0)
  cells.push({ i: 0, j: 0, x: ax, z: az, y, level, parent: -1, seg: -1, leaf: false });
  const want = randInt(rand, 5, 9);
  for (let guard = 0; cells.length - base < want && guard < 60; guard++) {
    // Prefer a recently added cell: that grows long snaking drifts rather than a
    // blob around the shaft, which is what a worked-out mine actually looks like.
    const pool = cells.length - base;
    const pick = base + pool - 1 - Math.floor(rand() * (pool < 3 ? pool : 3));
    const from = cells[pick];
    const spin = Math.floor(rand() * 4) * 2;
    for (let k = 0; k < 4; k++) {
      const d = (spin + k * 2) % 8;
      const ni = from.i + DIRS[d], nj = from.j + DIRS[d + 1];
      if (ni < -LAT_R || ni > LAT_R || nj < -LAT_R || nj > LAT_R) continue;
      const code = (ni + 8) * 17 + (nj + 8);
      if (taken.has(code)) continue;
      taken.add(code);
      from.leaf = false;
      cells.push({
        i: ni, j: nj, x: ax + ni * LATTICE, z: az + nj * LATTICE, y, level,
        parent: pick, seg: segs.length, leaf: true,
      });
      segs.push({ x0: from.x, z0: from.z, x1: ax + ni * LATTICE, z1: az + nj * LATTICE, y, level, collapsed: false });
      break;
    }
  }
}

function buildMineshaft(gen, rx, rz) {
  if (!anchorIn(gen.seed, SALT, MS_REGION, MS_MARGIN, MS_CHANCE, rx, rz)) return null;
  const ax = ANCHOR.x, az = ANCHOR.z;
  if (nearHandBuilt(ax, az)) return null;
  if (onRoad(gen, ax, az, PAD + 1)) return null;
  const surfaceY = padHeight(gen, ax, az, PAD, 4);
  if (surfaceY < 0) return null;

  const rand = mulberry32((gen.seed ^ Math.imul(rx, 73856093) ^ Math.imul(rz, 19349663) ^ SALT) >>> 0);
  const ring = ringAt(ax, az);
  const levelCount = rand() < 0.55 ? 3 : 2;
  // Deep enough to feel like a descent and to stay under the terrain even on a
  // hillside, shallow enough that the bottom level still clears bedrock.
  let floor0 = surfaceY - 14 - randInt(rand, 0, 8);
  if (floor0 > SEA - 4) floor0 = SEA - 4;
  const minFloor0 = 10 + (levelCount - 1) * LEVEL_DROP;
  if (floor0 < minFloor0) floor0 = minFloor0;

  const cells = [], segs = [], veins = [], spawns = [], levelY = [];
  for (let L = 0; L < levelCount; L++) {
    const y = floor0 - L * LEVEL_DROP;
    levelY.push(y);
    growLevel(rand, ax, az, y, L, cells, segs);
  }

  // The chest room goes on the deepest level's furthest dead end — the longest
  // walk from the ladder is the one worth paying for.
  let room = null, roomCell = -1, best = -1;
  for (let c = 0; c < cells.length; c++) {
    const cell = cells[c];
    if (!cell.leaf || cell.level !== levelCount - 1) continue;
    const reach = Math.abs(cell.i) + Math.abs(cell.j);
    if (reach > best) { best = reach; room = cell; roomCell = c; }
  }
  if (!room) return null;                          // a hub with no branches isn't a mine

  // Cave-ins only ever block a dead end. A collapse across a live corridor could
  // seal the chest room off from the ladder with nothing in the layout to say so,
  // and "the mine you walked to is impossible" is not a surprise worth shipping.
  for (let c = 0; c < cells.length; c++) {
    const cell = cells[c];
    if (!cell.leaf || c === roomCell || cell.seg < 0) continue;
    if (rand() < 0.32) segs[cell.seg].collapsed = true;
  }

  // Veins sit in the corridor walls; a collapsed drift keeps its vein behind the
  // rubble, so digging a cave-in out is worth the pick.
  for (const s of segs) {
    const horiz = s.z0 === s.z1;
    const lo = horiz ? Math.min(s.x0, s.x1) : Math.min(s.z0, s.z1);
    const table = ORE_BY_LEVEL[s.level < ORE_BY_LEVEL.length ? s.level : ORE_BY_LEVEL.length - 1];
    for (let step = 2; step <= 4; step += 2) {
      if (rand() >= 0.5) continue;
      // Never sit a vein behind a set of timbers: the posts and their beam fill
      // the whole corridor edge at that station, and the ore would be walled in
      // where you can neither see nor swing at it.
      let along = lo + step;
      if (((along % SUPPORT_EVERY) + SUPPORT_EVERY) % SUPPORT_EVERY === 0) along += 1;
      const side = rand() < 0.5 ? -2 : 2;
      let type = pickFlat(rand, table);
      if (s.level === levelCount - 1 && ring >= 2 && rand() < 0.10) {
        type = ORE_DEEPEST[ring >= 3 && rand() < 0.5 ? 1 : 0];
      }
      veins.push({
        type,
        x: horiz ? along : s.x0 + side,
        y: s.y + 1 + (rand() < 0.4 ? 1 : 0),
        z: horiz ? s.z0 + side : along,
      });
    }
  }

  // Sparse: a mineshaft is somewhere to work, not an arena. The pair in the chest
  // room is the exception — those two are guarding something.
  const roster = MOBS[ring];
  for (const cell of cells) {
    if (cell.parent < 0 || rand() >= 0.30) continue;
    spawns.push({ type: roster[Math.floor(rand() * roster.length)], x: cell.x, y: cell.y + 1, z: cell.z });
  }
  for (let k = 0; k < 2; k++) {
    spawns.push({ type: roster[Math.floor(rand() * roster.length)], x: room.x + (k ? 2 : -2), y: room.y + 1, z: room.z + 1 });
  }

  // Exact footprint, so the per-chunk overlap test is tight rather than MS_HALF.
  let minX = ax - PAD, maxX = ax + PAD, minZ = az - PAD, maxZ = az + PAD;
  for (const cell of cells) {
    if (cell.x - 2 < minX) minX = cell.x - 2;
    if (cell.x + 2 > maxX) maxX = cell.x + 2;
    if (cell.z - 2 < minZ) minZ = cell.z - 2;
    if (cell.z + 2 > maxZ) maxZ = cell.z + 2;
  }
  if (room.x - ROOM_HALF < minX) minX = room.x - ROOM_HALF;
  if (room.x + ROOM_HALF > maxX) maxX = room.x + ROOM_HALF;
  if (room.z - ROOM_HALF < minZ) minZ = room.z - ROOM_HALF;
  if (room.z + ROOM_HALF > maxZ) maxZ = room.z + ROOM_HALF;

  return {
    rx, rz, x: ax, z: az, ring, surfaceY, levelY,
    bottom: levelY[levelCount - 1],
    landings: levelY.slice(0, -1),
    cells, segs, veins, spawns,
    room: { x: room.x, y: room.y, z: room.z },
    chest: {
      id: `ms:${room.x},${room.y + 1},${room.z}`, x: room.x, y: room.y + 1, z: room.z,
      loot: LOOT[ring].map(([item, qty]) => ({ item, qty })),
    },
    minX, maxX, minZ, maxZ,
  };
}

export function mineshaftAt(gen, rx, rz) {
  return cachedLayout(CACHE, CACHE_CAP, `${gen.seed}:${rx}:${rz}`, () => buildMineshaft(gen, rx, rz));
}

// ---- stamping --------------------------------------------------------------
// Two passes, and the order matters: EVERY shell is written before ANY bore.
// A corridor's shell spans two blocks either side of its centre line, so a shell
// written after a crossing corridor's bore would plug that corridor mid-run and
// quietly seal off half the mine. Shells first, bores second, fittings last.
function shellSeg(s) {
  const ax = (s.x0 < s.x1 ? s.x0 : s.x1) - 2, bx = (s.x0 > s.x1 ? s.x0 : s.x1) + 2;
  const az = (s.z0 < s.z1 ? s.z0 : s.z1) - 2, bz = (s.z0 > s.z1 ? s.z0 : s.z1) + 2;
  if (!overlaps(ax, az, bx, bz)) return;
  box(ax, s.y, az, bx, s.y + 4, bz, B.stone);
}

function boreSeg(s) {
  const ax = (s.x0 < s.x1 ? s.x0 : s.x1) - 1, bx = (s.x0 > s.x1 ? s.x0 : s.x1) + 1;
  const az = (s.z0 < s.z1 ? s.z0 : s.z1) - 1, bz = (s.z0 > s.z1 ? s.z0 : s.z1) + 1;
  if (!overlaps(ax, az, bx, bz)) return;
  box(ax, s.y + 1, az, bx, s.y + 3, bz, B.air);
}

// Timbers, rails, lamps — and the rubble where a drift came down. Every position
// derives from the segment's WORLD coordinate, not its offset along itself, so
// the timbering lines up across a chunk seam without either side knowing the
// other exists.
function fitSeg(s) {
  const horiz = s.z0 === s.z1;
  const lo = (horiz ? (s.x0 < s.x1 ? s.x0 : s.x1) : (s.z0 < s.z1 ? s.z0 : s.z1)) - 1;
  const hi = (horiz ? (s.x0 > s.x1 ? s.x0 : s.x1) : (s.z0 > s.z1 ? s.z0 : s.z1)) + 1;
  const ax = horiz ? lo : s.x0 - 1, bx = horiz ? hi : s.x0 + 1;
  const az = horiz ? s.z0 - 1 : lo, bz = horiz ? s.z0 + 1 : hi;
  if (!overlaps(ax, az, bx, bz)) return;
  const px = horiz ? 0 : 1, pz = horiz ? 1 : 0;    // corridor-perpendicular unit
  const outward = (s.x1 - s.x0) + (s.z1 - s.z0) > 0;
  const mid = (lo + hi) >> 1;
  for (let a = lo; a <= hi; a++) {
    const cx = horiz ? a : s.x0, cz = horiz ? s.z0 : a;
    if (s.collapsed) {
      // Choked from the midpoint outward, with a curtain of web at the mouth so
      // it reads as unsafe before you walk into it.
      if (outward ? a >= mid : a <= mid) {
        for (let p = -1; p <= 1; p++) {
          box(cx + px * p, s.y + 1, cz + pz * p, cx + px * p, s.y + 3, cz + pz * p, B.gravel);
        }
        continue;
      }
      if (a >= mid - 1 && a <= mid + 1) put(cx, s.y + 2, cz, B.cobweb);
    }
    if (((a % SUPPORT_EVERY) + SUPPORT_EVERY) % SUPPORT_EVERY === 0) {
      for (const p of [-1, 1]) {
        put(cx + px * p, s.y + 1, cz + pz * p, B.oak_log);
        put(cx + px * p, s.y + 2, cz + pz * p, B.oak_log);
      }
      for (let p = -1; p <= 1; p++) put(cx + px * p, s.y + 3, cz + pz * p, B.planks);
    } else {
      put(cx, s.y + 1, cz, B.rail);                // the haulage way down the middle
      if (((a % 8) + 8) % 8 === 2) put(cx + px, s.y + 1, cz + pz, B.torch_post);
    }
  }
}

function stampOne(ms, sink) {
  if (!overlaps(ms.minX, ms.minZ, ms.maxX, ms.maxZ)) return;
  const { x, z, surfaceY, bottom, room } = ms;
  const headTop = surfaceY + 6;

  // ---- shells --------------------------------------------------------------
  shaftShell(x, z, bottom, surfaceY, B.stone);
  for (const s of ms.segs) shellSeg(s);
  box(room.x - ROOM_HALF, room.y, room.z - ROOM_HALF, room.x + ROOM_HALF, room.y + 5, room.z + ROOM_HALF, B.stone);
  // The pad is cut level with the anchor column: fill the dip, clear the rise.
  box(x - PAD, surfaceY - 4, z - PAD, x + PAD, surfaceY, z + PAD, B.gravel);
  box(x - PAD, surfaceY + 1, z - PAD, x + PAD, headTop, z + PAD, B.air);

  // ---- bores ---------------------------------------------------------------
  shaftBore(x, z, bottom + 1, headTop);
  for (const s of ms.segs) boreSeg(s);
  box(room.x - 4, room.y + 1, room.z - 4, room.x + 4, room.y + 4, room.z + 4, B.air);

  // ---- fittings ------------------------------------------------------------
  // Headframe: four posts and a beam ring. The whole point of putting a mine
  // entrance on the surface is that you can see it from a ridge away.
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    box(x + dx, surfaceY + 1, z + dz, x + dx, surfaceY + 4, z + dz, B.oak_log);
  }
  box(x - 2, surfaceY + 5, z - 2, x + 2, surfaceY + 5, z - 2, B.planks);
  box(x - 2, surfaceY + 5, z + 2, x + 2, surfaceY + 5, z + 2, B.planks);
  box(x - 2, surfaceY + 5, z - 2, x - 2, surfaceY + 5, z + 2, B.planks);
  box(x + 2, surfaceY + 5, z - 2, x + 2, surfaceY + 5, z + 2, B.planks);
  put(x - PAD, surfaceY + 1, z - PAD, B.torch_post);
  put(x + PAD, surfaceY + 1, z + PAD, B.torch_post);

  for (const s of ms.segs) fitSeg(s);

  // Timbering goes against the rock, never across the through-way — but a set of
  // posts is placed off world coordinates, so where two drifts cross, one
  // corridor's posts land squarely in the other's centre line and wall the
  // junction shut. Re-open every crossing after the timbers are in. Dead ends
  // are left alone, which is what keeps a cave-in a cave-in.
  for (const c of ms.cells) {
    if (c.leaf) continue;
    box(c.x - 1, c.y + 1, c.z - 1, c.x + 1, c.y + 3, c.z + 1, B.air);
  }

  // A landing at every level so a slip costs one storey, not the whole shaft.
  // After the re-bore, or it would take the ladder out with the junction.
  shaftFittings(x, z, bottom + 1, surfaceY, ms.landings, B.planks);
  put(x + 1, surfaceY + 1, z, B.ladder);

  // Chest room: lit corners, the pay chest, and rich ground nobody got to.
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) put(room.x + dx, room.y + 1, room.z + dz, B.torch_post);
  putChest(ms.chest);
  const deep = ORE_BY_LEVEL[ORE_BY_LEVEL.length - 1];
  putNode({ type: deep[0], x: room.x - 4, y: room.y + 2, z: room.z - 2 });
  putNode({ type: deep[4], x: room.x + 4, y: room.y + 2, z: room.z + 2 });
  putNode({ type: 'dig_trench', x: room.x + 2, y: room.y + 1, z: room.z - 3 });

  for (const v of ms.veins) putNode(v);
  for (const s of ms.spawns) putSpawn({ id: `ms:${s.x},${s.y},${s.z}`, type: s.type, x: s.x, y: s.y, z: s.z, fixed: true });
}

// Rasterise every mineshaft that reaches this chunk. `sink` receives
// block(x,y,z,id) / node(n) / spawn(s) / chest(c); see js/world/structures.js.
export function stampMineshafts(gen, cx, cz, sink) {
  const wx = cx * CHUNK, wz = cz * CHUNK;
  beginStamp(sink, cx, cz, CHUNK);
  regionRange(wx, wx + CHUNK - 1, MS_REGION, MS_HALF);
  const rx0 = RANGE.lo, rx1 = RANGE.hi;
  regionRange(wz, wz + CHUNK - 1, MS_REGION, MS_HALF);
  const rz0 = RANGE.lo, rz1 = RANGE.hi;
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      // Fast reject before any layout work: most regions hold no mineshaft at
      // all, and the ones that do usually sit too far off to touch this chunk.
      if (!anchorIn(gen.seed, SALT, MS_REGION, MS_MARGIN, MS_CHANCE, rx, rz)) continue;
      if (ANCHOR.x + MS_HALF < wx || ANCHOR.x - MS_HALF > wx + CHUNK - 1) continue;
      if (ANCHOR.z + MS_HALF < wz || ANCHOR.z - MS_HALF > wz + CHUNK - 1) continue;
      const ms = mineshaftAt(gen, rx, rz);
      if (ms) stampOne(ms, sink);
    }
  }
}

// Surface columns the headframe owns. Worldgen's vegetation scatter consults
// this so a tree doesn't sprout through the winding gear.
export function mineshaftClaims(gen, x, z) {
  regionRange(x, x, MS_REGION, PAD + 1);
  const rx0 = RANGE.lo, rx1 = RANGE.hi;
  regionRange(z, z, MS_REGION, PAD + 1);
  const rz0 = RANGE.lo, rz1 = RANGE.hi;
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      if (!anchorIn(gen.seed, SALT, MS_REGION, MS_MARGIN, MS_CHANCE, rx, rz)) continue;
      if (Math.abs(x - ANCHOR.x) > PAD + 1 || Math.abs(z - ANCHOR.z) > PAD + 1) continue;
      if (mineshaftAt(gen, rx, rz)) return true;
    }
  }
  return false;
}

// Walk every corridor from the shaft, refusing to cross a cave-in — the same
// walk a player makes. Returns the set of reachable cell indices. Used by the
// tests to prove the chest room is never sealed off, and cheap enough to be
// worth having next to the generator rather than hidden in a test file.
export function reachableCells(ms) {
  const blocked = new Set();
  for (let c = 0; c < ms.cells.length; c++) {
    const cell = ms.cells[c];
    if (cell.seg >= 0 && ms.segs[cell.seg].collapsed) blocked.add(c);
  }
  const seen = new Set();
  const stack = [];
  // Every level's hub sits on the shaft, and the ladder connects all of them.
  for (let c = 0; c < ms.cells.length; c++) if (ms.cells[c].parent < 0) { seen.add(c); stack.push(c); }
  const children = new Map();
  for (let c = 0; c < ms.cells.length; c++) {
    const p = ms.cells[c].parent;
    if (p < 0) continue;
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(c);
  }
  while (stack.length) {
    const c = stack.pop();
    for (const n of children.get(c) || []) {
      if (seen.has(n) || blocked.has(n)) continue;
      seen.add(n); stack.push(n);
    }
    const p = ms.cells[c].parent;
    if (p >= 0 && !seen.has(p) && !blocked.has(c)) { seen.add(p); stack.push(p); }
  }
  return seen;
}

// Test/debug helper: the first mineshaft found sweeping outward from the origin
// region, ring by ring.
export function findMineshaft(gen, spanRegions = 6) {
  for (let r = 0; r <= spanRegions; r++) {
    for (let rx = -r; rx <= r; rx++) {
      for (let rz = -r; rz <= r; rz++) {
        if (Math.max(Math.abs(rx), Math.abs(rz)) !== r) continue;
        const ms = mineshaftAt(gen, rx, rz);
        if (ms) return ms;
      }
    }
  }
  return null;
}
