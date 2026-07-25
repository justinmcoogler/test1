// The waystone network: the runtime half of the standing stones js/world/roads.js
// builds every WAYSTONE_SPACING blocks along each PRIMARY arterial.
//
// roads.js already knows where every waystone is — it is a pure function of the
// seed, and `waystoneColumn` is the one definition of "where the n-th marker on
// arterial d stands". This module adds the three things the road cannot know:
//
//   1. a NAME. Signposts were blank because there is no settlement graph to name
//      them after, so a waystone names itself from the column it occupies. Pure
//      function of (x, z) — no seed, no counter, no discovery order — which is
//      what makes the same stone read the same on every load, on every device,
//      and in the single-file build. The save therefore stores coordinates only
//      and recomputes the name, so a name can never drift from its stone.
//   2. DISCOVERY. A stone you have not walked up to is not on your network.
//   3. the graph. Any discovered stone to any other discovered stone.
//
// Nothing here hardcodes the spacing: it imports WAYSTONE_SPACING and locates a
// marker through roadsFor(gen).waystoneColumn(), so changing the spacing in
// roads.js moves the network with it.
import { roadsFor, PRIMARIES, WAYSTONE_SPACING, WAYSTONE_COURSES } from '../world/roads.js';

// Courses above the road surface, so a caller can hang a label over the capstone
// without knowing how the stone is built.
export const WAYSTONE_HEIGHT = WAYSTONE_COURSES.length;

// ---- naming ----------------------------------------------------------------
// Three word lists, indexed by three independent slices of one hash: 32×16×10 =
// 5120 names, which is more waystones than a player will ever stand at. The
// lists are disjoint (no head is also a tail) so nothing comes out "Brookbrook".
const HEAD = [
  'Ash', 'Bram', 'Brook', 'Cinder', 'Crag', 'Dun', 'Elder', 'Ember',
  'Fern', 'Frost', 'Gale', 'Glass', 'Green', 'Grim', 'Hale', 'Harrow',
  'Iron', 'Kett', 'Long', 'Mill', 'Moss', 'Oak', 'Raven', 'Rook',
  'Salt', 'Slate', 'Stone', 'Thorn', 'Well', 'Whit', 'Wind', 'Wyn',
];
const TAIL = [
  'barrow', 'bourne', 'crest', 'fell', 'fen', 'ford', 'garth', 'holt',
  'hollow', 'mere', 'moor', 'reach', 'ridge', 'vale', 'wick', 'wold',
];
const KIND = [
  'Crossing', 'Gate', 'Marker', 'Milestone', 'Rise',
  'Stand', 'Stones', 'Watch', 'Waypost', 'Wayside',
];

// Compass bearing of each primary arterial. roads.js lays them out from +X
// counter-clockwise through +Z, and this world's north is -Z (yaw 0 faces -Z,
// see UI.drawCompass), so +X is east and +Z is south.
export const BEARINGS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

// Integer avalanche hash. Math.imul + >>>0 throughout so every JS engine agrees
// bit for bit — a name that differed between two browsers would break the whole
// point of deriving it from the position.
function mix(x, z) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2545f491) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2d) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// The name of the waystone standing in column (x, z). Pure.
export function waystoneName(x, z) {
  const h = mix(x, z);
  const head = HEAD[h % HEAD.length];
  const tail = TAIL[Math.floor(h / HEAD.length) % TAIL.length];
  const kind = KIND[Math.floor(h / (HEAD.length * TAIL.length)) % KIND.length];
  return `${head}${tail} ${kind}`;
}

// ---- locating a stone in the world -----------------------------------------
// Own scratch arrays: roads.js hands out a shared out-param by default, and
// borrowing it here would clobber whatever the caller was mid-way through.
const COL = new Int32Array(2);
const LAND = new Int32Array(2);

// The n-th waystone on primary arterial `dir`, or null if no stone stands there.
//
// The schedule alone is not proof of a stone: a waystone declines to build itself
// on ground a hand-built site already owns, and it will not wade out onto a
// bridge. roads.js answers that with `waystoneBaseY`, which is the builder's own
// arithmetic rather than a copy of it — so this never has to guess. Where the
// chunk is loaded the standing courses are checked against the world as well, so
// a stone that failed to build for any reason the schedule cannot see is still
// not offered as a travel point. `y` is the height you STAND at beside it.
export function waystoneOf(world, dir, n) {
  if (n < 1 || dir < 0 || dir >= PRIMARIES) return null;
  const gen = world.gen;
  const roads = roadsFor(gen);
  // Own out-param, and read before anything else borrows roads.js's scratch.
  const c = roads.waystoneColumn(gen, dir, n, COL);
  const x = c[0], z = c[1];
  const baseY = roads.waystoneBaseY(gen, dir, n);
  if (baseY < 0) return null;
  if (world.hasChunk(x >> 4, z >> 4)) {
    for (let i = 0; i < WAYSTONE_COURSES.length; i++) {
      if (world.getBlock(x, baseY + 1 + i, z) !== WAYSTONE_COURSES[i]) return null;
    }
  }
  return { id: `${x},${z}`, dir, n, x, z, y: baseY + 1, name: waystoneName(x, z) };
}

// Every waystone whose marker is within `radius` blocks of (x, z). One candidate
// per arterial: `s` fixes which mile mark could be in range, and the marker sits
// within a couple of blocks of it (tests/unit/roads.test.mjs asserts that), so
// there is nothing to search.
export function waystonesNear(world, x, z, radius = 40) {
  const gen = world.gen;
  const roads = roadsFor(gen);
  const out = [];
  for (let d = 0; d < PRIMARIES; d++) {
    const s = roads.along(gen, d, x, z);
    const n = Math.round(s / WAYSTONE_SPACING);
    if (n < 1 || Math.abs(s - n * WAYSTONE_SPACING) > radius + 4) continue;
    const ws = waystoneOf(world, d, n);
    if (!ws) continue;
    if (Math.hypot(ws.x + 0.5 - x, ws.z + 0.5 - z) > radius) continue;
    out.push(ws);
  }
  return out;
}

// How close counts as touching a stone. The menhir stands WS_STONE (~4 blocks)
// back off the lane, so this has to clear the width of the road: walking past one
// on the paving must register, and nobody is six blocks from a nine-course
// standing stone without having seen it.
export const TOUCH_RADIUS = 6;

// Are you standing AT this stone? Touching one is what discovers it and what
// lets you depart on the network. The height test stops a cave passing twenty
// blocks under the road from discovering everything overhead.
export function atWaystone(ws, x, y, z, radius = TOUCH_RADIUS) {
  return Math.hypot(ws.x + 0.5 - x, ws.z + 0.5 - z) <= radius && Math.abs(y - ws.y) <= 6;
}

// Where you stand when you arrive: the lane centre at that mile mark. The marker
// column is occupied by the stone itself and the verge beside it carries the
// signpost and the bench, so arriving "on" a waystone means arriving on the road
// it stands beside. Returns [x, z].
export function waystoneLanding(world, ws) {
  const roads = roadsFor(world.gen);
  const c = roads.column(world.gen, ws.dir, ws.n * WAYSTONE_SPACING, 0, LAND);
  return [c[0], c[1]];
}

// ---- the player's network --------------------------------------------------
// Saved as a flat array of [x, z, y, dir, n] tuples: small, and it deliberately
// does NOT store the name. The name comes back out of waystoneName(x, z) on
// load, so a stone's name is structurally incapable of drifting from its stone.
export class WaystoneNet {
  constructor() {
    this.known = new Map();   // id → {id, name, x, y, z, dir, n}
  }

  get size() { return this.known.size; }
  has(id) { return this.known.has(id); }
  get(id) { return this.known.get(id) || null; }

  // Record a stone. Returns true only the first time — the caller announces a
  // discovery on that.
  add(ws) {
    if (!ws || this.known.has(ws.id)) return false;
    this.known.set(ws.id, {
      id: ws.id, name: ws.name, x: ws.x, y: ws.y, z: ws.z, dir: ws.dir, n: ws.n,
    });
    return true;
  }

  // Grouped by road, then outward along it — the order you met them in.
  list() {
    return [...this.known.values()].sort((a, b) => (a.dir - b.dir) || (a.n - b.n));
  }

  serialize() {
    return this.list().map((w) => [w.x, w.z, w.y, w.dir, w.n]);
  }

  // Tolerates absent/older/garbled data by design: a save written before
  // waystones existed simply has none, and must still load.
  deserialize(arr) {
    this.known.clear();
    if (!Array.isArray(arr)) return;
    for (const t of arr) {
      if (!Array.isArray(t) || t.length < 5) continue;
      const [x, z, y, dir, n] = t.map(Number);
      if (![x, z, y, dir, n].every(Number.isFinite)) continue;
      this.known.set(`${x},${z}`, { id: `${x},${z}`, name: waystoneName(x, z), x, y, z, dir, n });
    }
  }
}
