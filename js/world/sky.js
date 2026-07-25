// The sky archipelago — floating islands in the world's unused headroom.
//
// WHY IT EXISTS. WORLD_H is 512 and the terrain runs 50–103, so about 409 blocks
// of the allocated column were empty air. That is the single biggest structural
// difference this world has available and it costs nothing: the array is already
// there. Depth is somebody else's axis; this is the other one.
//
// WHY IT IS WHERE THE METEORIC IRON IS. `ore_meteoric` already existed and was
// reachable in exactly one place — the bottom level of the deepest mineshafts in
// the far rings (js/world/mineshaft.js ORE_DEEPEST). Meteoric iron falls from
// the sky. Making the high islands its real source ties the vertical axis into
// the material spine that was already built rather than bolting a floating theme
// park onto the top of the map. The deep-shaft table stays: what you dig out of
// a mine is what fell here long ago and got buried.
//
// THE CONTRACT is the same one every other procedural site in this world keeps
// (js/world/sites.js): an island's layout is a pure function of (seed, region),
// no chunk reads a neighbour, and each chunk rasterises only its own slice. That
// is what lets you fly at one from any direction and have it be the same island.
//
// ALTITUDE IS RING-GATED, and that is the whole progression. Ring 0 — the
// starting bowl — has empty sky on purpose: the first island you ever see should
// be a surprise on the horizon, not scenery over your own roof. Beyond that the
// bands climb with distance, and the mounts' flight ceilings (js/game/mounts.js)
// are set so each band needs the next mount. You cannot reach the meteoric iron
// on a Ridgewing however long you climb.
import { B } from './blocks.js';
import { CHUNK, WORLD_H, ringAt } from './worldgen.js';
import { mulberry32, hash2 } from '../core/rng.js';
import {
  ANCHOR, RANGE, anchorIn, regionRange, cachedLayout,
  beginStamp, overlaps, put, putNode, randInt,
} from './sites.js';

const SALT = 553117;
// Sparse on purpose: one candidate per 384x384 blocks, and most are refused.
// An island every few hundred blocks is scenery; one every couple of thousand is
// a destination you steer for.
export const SKY_REGION = 384;
const SKY_MARGIN = 90;
const SKY_CHANCE = 0.55;

// The widest a CLUSTER reaches from its anchor, for the cheap per-chunk reject.
// Derived rather than guessed, because a bound that is too small does not fail
// loudly — chunks past it simply stop asking this region, and the island comes
// out with slices missing along a seam you have to fly to to see:
//
//   a member is placed at `far` = r + band.rMax + up to 26        <= 38+38+26
//   and its own rim reaches r * 1.35 beyond its centre            <= 38*1.35
//                                                                 ------------
//                                                                    154
//
// A test asserts the real maximum over several seeds never exceeds this. The
// cost of the slack is nil: SKY_REGION is 384, so even 156 spans at most two
// regions on each axis.
export const SKY_HALF = 156;

// Altitude band and size by ring. `lo`/`hi` bound the island's TOP surface, so a
// band never overlaps the one below even at full keel depth.
//
// Ring 0 is deliberately absent — see the header.
const BANDS = [
  null,
  { lo: 148, hi: 178, rMin: 12, rMax: 22, count: [1, 2] },   // ring 1: the low shelf
  { lo: 212, hi: 258, rMin: 16, rMax: 30, count: [1, 3] },   // ring 2
  { lo: 296, hi: 372, rMin: 20, rMax: 38, count: [2, 4] },   // ring 3: the meteoric reach
];

// What each band is made of, top course down. The high band is bare cold rock —
// nothing grows at 300 blocks — which is also why its silhouette reads as
// different from the green shelves below it.
const CRUSTS = [
  null,
  { top: B.grass, soil: B.dirt, core: B.stone, keel: B.stone, soilD: 3 },
  { top: B.grass, soil: B.dirt, core: B.stone, keel: B.andesite, soilD: 2 },
  { top: B.snow, soil: B.gravel, core: B.deepslate, keel: B.deepslate, soilD: 2 },
];

// Ore on an island, by ring. Meteoric only exists in the top band: that is the
// reason to get up there, and the reason a Riftwing is worth taming.
const ORES = [
  null,
  ['ore_copper', 'ore_tin', 'deposit_coal'],
  ['ore_iron', 'ore_silver', 'ore_zinc'],
  ['ore_meteoric', 'ore_meteoric', 'ore_platinum', 'ore_gold'],
];

// Bridges. BRIDGE_RISE is bounded by what a stair flight at one end can climb
// without eating the whole span; BRIDGE_MAX by how far a plank span reads as a
// bridge rather than a tightrope.
const BRIDGE_RISE = 7;
const BRIDGE_MAX = 96;
const BRIDGE_HW = 1;              // deck half-width: three planks across

// What stands on an island, by ring. The low shelf is somewhere people still
// go, the middle is what is left of them, the top is older than either.
const SITE_KINDS = [
  null,
  ['eyrie', 'camp'],
  ['eyrie', 'ruin'],
  ['ruin', 'hall'],
];

const CACHE = new Map();
const CACHE_CAP = 64;

// ---- layout ----------------------------------------------------------------
// An island is a stack of horizontal discs: a broad top plate, then radii that
// shrink faster and faster downward, which gives the lens-above / keel-below
// profile a floating rock wants. Storing it as discs rather than a formula means
// the rasteriser is a loop over ~30 circles and never evaluates noise per cell.
function buildIsland(gen, rx, rz) {
  if (!anchorIn(gen.seed, SALT, SKY_REGION, SKY_MARGIN, SKY_CHANCE, rx, rz)) return null;
  const ax = ANCHOR.x, az = ANCHOR.z;
  const ring = ringAt(ax, az);
  const band = BANDS[ring];
  if (!band) return null;                       // ring 0: the starting sky stays empty

  const rand = mulberry32((gen.seed ^ Math.imul(rx, 0x2f5b3d1) ^ Math.imul(rz, 0x1b873593) ^ SALT) >>> 0);
  const crust = CRUSTS[ring], ores = ORES[ring];
  const n = randInt(rand, band.count[0], band.count[1]);

  const isles = [];
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, top = 0;
  for (let k = 0; k < n; k++) {
    const r = randInt(rand, band.rMin, band.rMax);
    const crownH = Math.max(2, Math.round(r * 0.22));
    // Keel depth as a fraction of the island's RADIUS. This was 0.95, and with
    // the jitter and spur multipliers on top the underside hung about twice the
    // island's radius — a 44-wide rock trailing 45 blocks of stalactite, which
    // read as organ pipes rather than as a broken-off piece of ground.
    const keelD = Math.max(4, Math.round(r * 0.55));
    // Cluster members must not INTERPENETRATE. They are separate rocks with air
    // between them, and when they overlapped, one island's keel was written
    // through the next one's turf — a snow-capped island whose summit came out
    // as deepslate. So a member is placed only where it clears every rock
    // already placed, horizontally by a real gap or vertically by more than the
    // two profiles are deep. A few tries, then this member is simply dropped.
    let cx = ax, cz = az, y = 0, placed = k === 0;
    y = randInt(rand, band.lo, band.hi);
    for (let tries = 0; !placed && tries < 12; tries++) {
      const ang = rand() * Math.PI * 2;
      const far = r + band.rMax + randInt(rand, 6, 26);
      cx = ax + Math.round(Math.cos(ang) * far);
      cz = az + Math.round(Math.sin(ang) * far);
      y = randInt(rand, band.lo, band.hi);
      placed = isles.every((o) => {
        const gap = Math.hypot(cx - o.cx, cz - o.cz) - (r * 1.35 + o.r * 1.35);
        if (gap > 2) return true;                       // clears it sideways
        const vsep = Math.abs(y - o.y);
        return vsep > crownH + keelD + o.crownH + o.keelD + 4;   // or passes over/under it
      });
    }
    if (!placed) continue;
    if (y + crownH + 4 >= WORLD_H - 2) continue;

    // Per-island rim wobble, so the outline is not a circle. One phase and one
    // amplitude, evaluated per column at stamp time — cheap and deterministic.
    const wob = { amp: 0.14 + rand() * 0.16, ph: rand() * Math.PI * 2, k: 2 + Math.floor(rand() * 3) };
    const keel = -keelD;

    const veins = [];
    const vn = randInt(rand, 2, 4 + ring);
    for (let v = 0; v < vn; v++) {
      const va = rand() * Math.PI * 2, vd = rand() * (r - 3);
      veins.push({
        type: ores[Math.floor(rand() * ores.length)],
        x: cx + Math.round(Math.cos(va) * vd),
        z: cz + Math.round(Math.sin(va) * vd),
        y: y - 2 - randInt(rand, 0, Math.max(1, Math.round(keelD * 0.4))),
      });
    }

    const salt = (gen.seed ^ Math.imul(cx, 0x9e3779b1) ^ Math.imul(cz, 0x85ebca6b) ^ SALT) >>> 0;
    isles.push({ cx, cz, r, y, crownH, keelD, wob, keel, crust, ring, veins, salt });
    const reach = Math.ceil(r * 1.35);
    if (cx - reach < minX) minX = cx - reach;
    if (cx + reach > maxX) maxX = cx + reach;
    if (cz - reach < minZ) minZ = cz - reach;
    if (cz + reach > maxZ) maxZ = cz + reach;
    if (y + crownH > top) top = y + crownH;
  }
  if (!isles.length) return null;

  // ---- bridges -------------------------------------------------------------
  // An archipelago you cannot walk across is three separate errands. Every pair
  // of members close enough in height gets a plank span, so a cluster is ONE
  // place: land once, walk the rest.
  //
  // Height is the constraint that matters. The deck runs level at the LOWER of
  // the two rims and the higher end gets a stair flight, and only stairs and
  // slabs are walkable steps in this game (World.isStep), so a pair too far
  // apart vertically would need a flight longer than the span. Pairs beyond
  // BRIDGE_RISE simply go unbridged.
  const bridges = [];
  for (let i = 0; i < isles.length; i++) {
    for (let j = i + 1; j < isles.length; j++) {
      const a = isles[i], b = isles[j];
      if (Math.abs(a.y - b.y) > BRIDGE_RISE) continue;
      const span = Math.hypot(b.cx - a.cx, b.cz - a.cz);
      if (span > BRIDGE_MAX) continue;
      const ux = (b.cx - a.cx) / span, uz = (b.cz - a.cz) / span;
      // Start and end INSIDE each rim, so the deck lands on rock rather than
      // stopping in mid-air short of a wobbled edge.
      const ra = rimAt(a, ux, uz) * 0.82, rb = rimAt(b, -ux, -uz) * 0.82;
      const x0 = Math.round(a.cx + ux * ra), z0 = Math.round(a.cz + uz * ra);
      const x1 = Math.round(b.cx - ux * rb), z1 = Math.round(b.cz - uz * rb);
      if (Math.hypot(x1 - x0, z1 - z0) < 4) continue;      // rims already touch
      bridges.push({ x0, z0, x1, z1, y: Math.min(a.y, b.y), hiY: Math.max(a.y, b.y), hiAtEnd: b.y > a.y });
    }
  }

  // ---- what stands on them -------------------------------------------------
  // One structure per island, themed by ring, and some islands left bare so
  // arriving somewhere built means something. The largest member of a cluster
  // always gets one — that is the island you aim for.
  const big = isles.reduce((m, i) => (i.r > m.r ? i : m), isles[0]);
  for (const is of isles) {
    if (is !== big && rand() > 0.55) continue;
    if (is.r < 11) continue;                                // no room for anything
    is.build = SITE_KINDS[ring][Math.floor(rand() * SITE_KINDS[ring].length)];
    is.buildRot = Math.floor(rand() * 4);
  }

  return { x: ax, z: az, ring, isles, bridges, minX, maxX, minZ, maxZ, top, band };
}

export function skyAt(gen, rx, rz) {
  return cachedLayout(CACHE, CACHE_CAP, `${gen.seed}:${rx}:${rz}`, () => buildIsland(gen, rx, rz));
}

// ---- rasterise -------------------------------------------------------------
// The wobbled radius of one island at one column bearing. Kept here so the
// layout stores a phase rather than a per-column table.
function rimAt(is, dx, dz) {
  const a = Math.atan2(dz, dx);
  return is.r * (1 + is.wob.amp * Math.sin(a * is.wob.k + is.wob.ph));
}

// The surface height of an island at one column — the same dome the rasteriser
// lays, so anything built on top lands flush with the turf rather than sunk into
// it or hovering over it.
function surfOf(is, x, z) {
  const dx = x - is.cx, dz = z - is.cz;
  const d = Math.hypot(dx, dz), rim = rimAt(is, dx, dz);
  if (d > rim) return -1;
  const t = 1 - d / rim;
  return is.y + Math.round(is.crownH * t * t * (3 - 2 * t));
}

// ---- bridges ---------------------------------------------------------------
// A plank deck three wide with a fence rail down each edge, run along whichever
// world axis the span is more nearly parallel to so the deck stays axis-aligned
// and the rails stay continuous. The deck is level; the climb onto the higher
// island is a stair flight at that end, because only stairs and slabs are
// walkable steps here (World.isStep) and a bare one-block rise is a jump.
function stampBridge(br, cx, cz) {
  const dx = br.x1 - br.x0, dz = br.z1 - br.z0;
  const alongX = Math.abs(dx) >= Math.abs(dz);
  const n = Math.max(Math.abs(dx), Math.abs(dz));
  if (n < 1) return;
  const sx = Math.sign(dx), sz = Math.sign(dz);
  const y = br.y;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = alongX ? br.x0 + sx * i : Math.round(br.x0 + dx * t);
    const z = alongX ? Math.round(br.z0 + dz * t) : br.z0 + sz * i;
    for (let k = -BRIDGE_HW; k <= BRIDGE_HW; k++) {
      const px = alongX ? x : x + k, pz = alongX ? z + k : z;
      put(px, y, pz, B.planks);
      // Headroom: at the ends the deck runs into the island's own rock, so the
      // walkway has to be cut clear or the bridge dead-ends in a wall.
      put(px, y + 1, pz, B.air);
      put(px, y + 2, pz, B.air);
      if (Math.abs(k) === BRIDGE_HW) put(px, y + 1, pz, B.planks_fence);
    }
    // A pair of hanging chains every few metres, so the span reads as suspended
    // rather than as a plank floating in the sky.
    if (i % 7 === 3) {
      for (let h = 1; h <= 3; h++) {
        const px = alongX ? x : x - (BRIDGE_HW + 1), pz = alongX ? z - (BRIDGE_HW + 1) : z;
        put(px, y - h, pz, B.chain);
        const qx = alongX ? x : x + (BRIDGE_HW + 1), qz = alongX ? z + (BRIDGE_HW + 1) : z;
        put(qx, y - h, qz, B.chain);
      }
    }
  }
  // The flight up onto the higher island, cut into its rim.
  const rise = br.hiY - br.y;
  const ex = br.hiAtEnd ? br.x1 : br.x0, ez = br.hiAtEnd ? br.z1 : br.z0;
  const fx = br.hiAtEnd ? Math.sign(dx) : -Math.sign(dx);
  const fz = br.hiAtEnd ? Math.sign(dz) : -Math.sign(dz);
  const stepX = alongX ? fx : 0, stepZ = alongX ? 0 : fz;
  for (let k = 1; k <= rise; k++) {
    const x = ex + stepX * k, z = ez + stepZ * k;
    for (let m = -BRIDGE_HW; m <= BRIDGE_HW; m++) {
      const px = alongX ? x : x + m, pz = alongX ? z + m : z;
      put(px, br.y + k, pz, B.stone_brick_stairs);
      put(px, br.y + k + 1, pz, B.air);
      put(px, br.y + k + 2, pz, B.air);
    }
  }
}

// ---- what stands on an island ----------------------------------------------
function stampBuild(is, cx, cz) {
  const kind = is.build;
  if (!kind) return;
  const bx = is.cx, bz = is.cz;
  const y = surfOf(is, bx, bz);
  if (y < 0) return;
  const rot = is.buildRot;
  // Doorway bearing, so the way in is not always north.
  const dxs = [1, 0, -1, 0][rot], dzs = [0, 1, 0, -1][rot];

  if (kind === 'camp') {
    // A fire, some log seats and a kist. Somebody put down here and stayed.
    put(bx, y + 1, bz, B.campfire);
    for (const [ox, oz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) put(bx + ox, y + 1, bz + oz, B.oak_log);
    put(bx + 3, y + 1, bz + 3, B.chest_block);
    put(bx - 3, y + 1, bz - 3, B.torch_post);
    put(bx + 3, y + 1, bz - 3, B.torch_post);
    return;
  }

  if (kind === 'eyrie') {
    // A timber wayhouse with a mooring mast — the built thing on the low shelf.
    const h = 4, r = 3;
    for (let x = bx - r; x <= bx + r; x++) {
      for (let z = bz - r; z <= bz + r; z++) {
        const edge = x === bx - r || x === bx + r || z === bz - r || z === bz + r;
        for (let k = 1; k <= h; k++) {
          if (edge) put(x, y + k, z, k === h ? B.oak_log : B.planks);
          else put(x, y + k, z, k === h ? B.planks : B.air);
        }
        if (!edge) put(x, y, z, B.planks);                   // a floor over the turf
      }
    }
    // Doorway: two blocks, on the rotated face.
    const dx = bx + dxs * r, dz = bz + dzs * r;
    put(dx, y + 1, dz, B.air); put(dx, y + 2, dz, B.air);
    put(bx, y + 1, bz, B.campfire);
    put(bx - dzs * 2, y + 1, bz - dxs * 2, B.chest_block);
    // The mast: what a mount is tied to, and what you see from a long way off.
    const mx = bx + dzs * (r + 2), mz = bz + dxs * (r + 2);
    for (let k = 1; k <= 7; k++) put(mx, y + k, mz, B.oak_log);
    put(mx, y + 8, mz, B.sea_lantern);
    put(mx + 1, y + 7, mz, B.planks_fence);
    put(mx - 1, y + 7, mz, B.planks_fence);
    return;
  }

  if (kind === 'ruin') {
    // Walls that stopped being walls. Height falls off with distance so it reads
    // as collapse rather than as an unfinished build.
    const r = Math.min(6, is.r - 4);
    for (let x = bx - r; x <= bx + r; x++) {
      for (let z = bz - r; z <= bz + r; z++) {
        const edge = x === bx - r || x === bx + r || z === bz - r || z === bz + r;
        if (!edge) continue;
        const j = hash2(is.salt + 17, x, z);
        const h = Math.round(1 + j * 4);
        for (let k = 1; k <= h; k++) {
          put(x, y + k, z, j > 0.6 ? B.mossy_stone_brick : B.ruin_brick);
        }
      }
    }
    for (const [ox, oz] of [[-2, -2], [2, 2], [-2, 2]]) {
      if (hash2(is.salt + 29, ox, oz) < 0.6) put(bx + ox, y + 1, bz + oz, B.rootstone);
    }
    put(bx, y + 1, bz, B.chest_block);
    put(bx + 1, y + 1, bz, B.torch_post);
    return;
  }

  // hall — the top band. Masonry, lit, and worth the flight.
  const rx = Math.min(6, is.r - 5), rz = Math.min(4, is.r - 6);
  if (rx < 3 || rz < 2) return;
  for (let x = bx - rx; x <= bx + rx; x++) {
    for (let z = bz - rz; z <= bz + rz; z++) {
      const edge = x === bx - rx || x === bx + rx || z === bz - rz || z === bz + rz;
      put(x, y, z, B.stone_brick);                          // a flagged floor
      for (let k = 1; k <= 5; k++) {
        if (edge) put(x, y + k, z, k === 5 ? B.stone_brick_slab : B.stone_brick);
        else put(x, y + k, z, k === 5 ? B.stone_brick : B.air);
      }
    }
  }
  const dx = bx + dxs * rx, dz = bz + dzs * rz;
  put(dx, y + 1, dz, B.air); put(dx, y + 2, dz, B.air);
  for (const [ox, oz] of [[-rx + 2, -rz + 1], [rx - 2, -rz + 1], [-rx + 2, rz - 1], [rx - 2, rz - 1]]) {
    put(bx + ox, y + 4, bz + oz, B.sea_lantern);
  }
  put(bx, y + 1, bz, B.chest_block);
  put(bx - 2, y + 1, bz, B.cobble_wall);
  put(bx + 2, y + 1, bz, B.cobble_wall);
}

function stampOne(gen, sky, cx, cz) {
  for (const is of sky.isles) {
    const rMax = Math.ceil(is.r * 1.35);
    if (!overlaps(is.cx - rMax, is.cz - rMax, is.cx + rMax, is.cz + rMax)) continue;
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    for (let x = x0; x < x0 + CHUNK; x++) {
      const dx = x - is.cx;
      if (dx < -rMax || dx > rMax) continue;
      for (let z = z0; z < z0 + CHUNK; z++) {
        const dz = z - is.cz;
        if (dz < -rMax || dz > rMax) continue;
        const d = Math.hypot(dx, dz);
        if (d > rMax) continue;
        const rim = rimAt(is, dx, dz);
        if (d > rim) continue;
        const c = is.crust;
        // t is 1 at the centre of the island and 0 at its rim. The dome above
        // and the keel below both fall to nothing there, so the edge is a thin
        // lip and the middle is a deep lens — the shape a floating rock wants.
        const t = 1 - d / rim;
        const dome = Math.round(is.crownH * t * t * (3 - 2 * t));   // smoothstep: a low crown
        // The keel is roughened per COLUMN, not per chunk: a clean cone read as a
        // spinning top rather than a torn-off piece of rock. `hash2` of the world
        // column and the island's own salt is a pure function of position, so the
        // crags are identical whichever chunk draws them.
        const j = hash2(is.salt, x, z);
        let deep = Math.max(1, Math.round(is.keelD * Math.pow(t, 0.7) * (0.62 + 0.46 * j)));
        // …and a few columns hang much further, which is what gives the underside
        // its spurs instead of a smooth taper.
        // Spurs: rarer and much shorter than they were. A few crags, not a fringe.
        if (j > 0.972 && t > 0.22) deep += Math.round(is.keelD * (0.18 + j * 0.3));
        const yTop = is.y + dome;
        if (yTop < 3 || yTop >= WORLD_H - 1) continue;
        for (let dy = 0; dy < dome + deep; dy++) {
          const y = yTop - dy;
          if (y < 2) break;
          // The surface course is the topmost solid block in the column, always.
          let id;
          if (dy === 0) id = c.top;
          else if (dy <= c.soilD) id = c.soil;
          else if (dy < dome + deep * 0.5) id = c.core;
          else id = c.keel;
          put(x, y, z, id);
        }
      }
    }
    // Ore, stamped after the rock so a vein is never overwritten by its own island.
    for (const v of is.veins) {
      putNode({ type: v.type, x: v.x, y: v.y, z: v.z, ready: true });
    }
  }
  // Bridges and buildings go down AFTER every rock in the cluster, so a deck cut
  // into a rim and a hall floor laid over turf both win where they overlap. The
  // order is fixed by the layout, not by which chunk is asking, so it stays
  // chunk-local.
  for (const br of sky.bridges) {
    const lo = Math.min(br.x0, br.x1) - BRIDGE_HW - 2, hi = Math.max(br.x0, br.x1) + BRIDGE_HW + 2;
    const lz = Math.min(br.z0, br.z1) - BRIDGE_HW - 2, hz = Math.max(br.z0, br.z1) + BRIDGE_HW + 2;
    if (!overlaps(lo, lz, hi, hz)) continue;
    stampBridge(br, cx, cz);
  }
  for (const is of sky.isles) {
    if (!is.build) continue;
    const r = 10;
    if (!overlaps(is.cx - r, is.cz - r, is.cx + r, is.cz + r)) continue;
    stampBuild(is, cx, cz);
  }
}

export function stampSky(gen, cx, cz, sink) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  regionRange(x0, x0 + CHUNK - 1, SKY_REGION, SKY_HALF);
  const rx0 = RANGE.lo, rx1 = RANGE.hi;
  regionRange(z0, z0 + CHUNK - 1, SKY_REGION, SKY_HALF);
  const rz0 = RANGE.lo, rz1 = RANGE.hi;
  let any = false;
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      const sky = skyAt(gen, rx, rz);
      if (!sky) continue;
      if (sky.maxX < x0 || sky.minX > x0 + CHUNK - 1) continue;
      if (sky.maxZ < z0 || sky.minZ > z0 + CHUNK - 1) continue;
      if (!any) { beginStamp(sink, cx, cz, CHUNK); any = true; }
      stampOne(gen, sky, cx, cz);
    }
  }
}

// Does an island own this column? Sky islands claim NOTHING on the ground: they
// are hundreds of blocks up, so trees, roads, towns and shafts below them are
// entirely unaffected. Exported anyway so the claim contract is explicit rather
// than an omission somebody has to infer.
export function skyClaims() { return false; }

// ---- helpers for tests and for the mount system ----------------------------
// The highest island top within `span` regions of the origin, or -1. The mount
// ceilings are checked against this so a band can never become unreachable by
// everything.
export function highestIsland(gen, span = 6) {
  let top = -1;
  for (let rx = -span; rx <= span; rx++) {
    for (let rz = -span; rz <= span; rz++) {
      const s = skyAt(gen, rx, rz);
      if (s && s.top > top) top = s.top;
    }
  }
  return top;
}

// Every island within `span` regions, for tests and for the map.
export function allIslands(gen, span = 5) {
  const out = [];
  for (let rx = -span; rx <= span; rx++) {
    for (let rz = -span; rz <= span; rz++) {
      const s = skyAt(gen, rx, rz);
      if (s) out.push(s);
    }
  }
  return out;
}

// The island whose top plate is under (x, z), or null — what a falling player or
// a landing mount needs. Returns the surface Y.
export function skySurfaceAt(gen, x, z) {
  const rx = Math.floor(x / SKY_REGION), rz = Math.floor(z / SKY_REGION);
  let best = -1;
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      const s = skyAt(gen, rx + a, rz + b);
      if (!s) continue;
      for (const is of s.isles) {
        const dx = x - is.cx, dz = z - is.cz;
        const d = Math.hypot(dx, dz), rim = rimAt(is, dx, dz);
        if (d > rim) continue;
        // The same dome the rasteriser lays, so this agrees with the blocks.
        const t = 1 - d / rim;
        const y = is.y + Math.round(is.crownH * t * t * (3 - 2 * t));
        if (y > best) best = y;
      }
    }
  }
  return best;
}
