// Shared machinery for region-anchored procedural sites (mineshafts, dungeons).
//
// The hard constraint these sites are built around: a chunk must be generatable
// in isolation — no neighbour loaded, in any order, and identical every time.
// That rules out growing a structure outward from whichever chunk the player
// happened to walk into, because the answer would then depend on load order.
//
// So the world is cut into fixed REGIONs. A region decides from the seed alone
// whether it hosts a site and where its anchor sits; the site's ENTIRE layout is
// a pure function of (seed, region); and a chunk simply asks the two-by-two
// block of regions whose footprint could reach it and rasterises the overlap.
// Two chunks generated a year apart agree because neither ever looked at the
// other. Everything in this file exists to keep that property cheap.
import { B } from './blocks.js';
import { SEA, WORLD_H, MANOR_PAD, LEARN_MEADOW, FROST_CAMP } from './worldgen.js';
import { hash2 } from '../core/rng.js';

// ---- region anchoring ------------------------------------------------------
// The anchor is inset from the region edge by `margin`, which is what bounds how
// far a site can reach into neighbouring regions and therefore how many regions
// a chunk has to ask. Reused rather than returned fresh: anchorIn is called a
// few times per chunk on the fast reject path.
export const ANCHOR = { x: 0, z: 0 };

export function anchorIn(seed, salt, region, margin, chance, rx, rz) {
  if (hash2(seed + salt, rx, rz) >= chance) return false;
  const span = region - margin * 2;
  ANCHOR.x = rx * region + margin + Math.floor(hash2(seed + salt + 1, rx, rz) * span);
  ANCHOR.z = rz * region + margin + Math.floor(hash2(seed + salt + 2, rx, rz) * span);
  return true;
}

// The inclusive region range a chunk must ask about, given a site half-extent.
// Kept as two scratch numbers so the per-chunk sweep allocates nothing.
export const RANGE = { lo: 0, hi: 0 };
export function regionRange(worldLo, worldHi, region, half) {
  RANGE.lo = Math.floor((worldLo - half) / region);
  RANGE.hi = Math.floor((worldHi + half) / region);
}

// ---- layout cache ----------------------------------------------------------
// Layouts are pure functions of (seed, region), so caching them can never change
// what generates — it only stops the sixteen-odd chunks that share one site from
// rebuilding it sixteen times. Negative results are cached too: rejecting a
// region costs a handful of heightAt calls, and those are the expensive part.
export function cachedLayout(store, cap, key, build) {
  const hit = store.get(key);
  if (hit !== undefined) return hit;
  const made = build();
  store.set(key, made);
  if (store.size > cap) store.delete(store.keys().next().value); // oldest insertion
  return made;
}

// ---- siting rules ----------------------------------------------------------
// Columns the hand-authored world already owns (js/world/structures.js). A
// procedural site that lands here would carve through Brookhollow, its mine and
// the Rootgrave, or one of the pinned flat pads.
export function nearHandBuilt(x, z) {
  if (Math.hypot(x, z) < 170) return true;                                   // Brookhollow + its mine/dungeon
  if (Math.hypot(x - MANOR_PAD.x, z - MANOR_PAD.z) < 60) return true;
  if (Math.hypot(x - LEARN_MEADOW.x, z - LEARN_MEADOW.z) < 60) return true;
  if (Math.hypot(x - FROST_CAMP.x, z - FROST_CAMP.z) < 110) return true;
  return false;
}

// Ground a surface head can actually sit on: dry, and flat enough over the pad
// that levelling it reads as a cut platform rather than a floating slab.
// Returns the pad height, or -1 to reject the site. Five heightAt calls is the
// most expensive thing about siting, which is why the result is cached.
export function padHeight(gen, x, z, spread, maxRelief) {
  const h = gen.heightAt(x, z);
  if (h <= SEA + 3) return -1;                       // an entrance below the waterline floods
  let lo = h, hi = h;
  for (let i = 0; i < 4; i++) {
    const dx = i === 0 ? spread : i === 1 ? -spread : 0;
    const dz = i === 2 ? spread : i === 3 ? -spread : 0;
    const n = gen.heightAt(x + dx, z + dz);
    if (n < lo) lo = n;
    if (n > hi) hi = n;
  }
  return hi - lo > maxRelief ? -1 : h;
}

// A road is a promise that the way is walkable; punching a shaft head through it
// breaks that. Cheap: the roads are already baked into a Set of columns.
export function onRoad(gen, x, z, pad) {
  if (!gen.pathSet) return false;
  for (let dx = -pad; dx <= pad; dx += pad) {
    for (let dz = -pad; dz <= pad; dz += pad) {
      if (gen.pathSet.has((x + dx) + ',' + (z + dz))) return true;
    }
  }
  return false;
}

// ---- chunk-clipped writer --------------------------------------------------
// A stamp runs to completion before the next one starts (chunk generation is
// single-threaded), so one module-level clip window serves every site type and
// the whole rasterise path allocates nothing. Writes outside the asking chunk
// are dropped rather than buffered — that is what makes a site chunk-local: each
// chunk independently redraws its own slice of the same deterministic layout.
const CL = { sink: null, x0: 0, z0: 0, x1: 0, z1: 0 };

export function beginStamp(sink, cx, cz, chunk) {
  CL.sink = sink;
  CL.x0 = cx * chunk; CL.x1 = CL.x0 + chunk - 1;
  CL.z0 = cz * chunk; CL.z1 = CL.z0 + chunk - 1;
}

// True when a world-space box has any cell in the current chunk — the guard that
// lets a stamp skip whole corridors and rooms without touching a single cell.
export function overlaps(ax, az, bx, bz) {
  return ax <= CL.x1 && bx >= CL.x0 && az <= CL.z1 && bz >= CL.z0;
}

export function put(x, y, z, id) {
  if (x < CL.x0 || x > CL.x1 || z < CL.z0 || z > CL.z1 || y < 1 || y >= WORLD_H) return;
  CL.sink.block(x, y, z, id);
}

export function box(ax, ay, az, bx, by, bz, id) {
  const lx = ax > CL.x0 ? ax : CL.x0, hx = bx < CL.x1 ? bx : CL.x1;
  if (lx > hx) return;
  const lz = az > CL.z0 ? az : CL.z0, hz = bz < CL.z1 ? bz : CL.z1;
  if (lz > hz) return;
  const ly = ay > 1 ? ay : 1, hy = by < WORLD_H - 1 ? by : WORLD_H - 1;
  const sink = CL.sink;
  for (let x = lx; x <= hx; x++) {
    for (let z = lz; z <= hz; z++) {
      for (let y = ly; y <= hy; y++) sink.block(x, y, z, id);
    }
  }
}

// The four walls of a box, floor and ceiling left alone.
export function walls(ax, ay, az, bx, by, bz, id) {
  box(ax, ay, az, bx, by, az, id);
  box(ax, ay, bz, bx, by, bz, id);
  box(ax, ay, az, ax, by, bz, id);
  box(bx, ay, az, bx, by, bz, id);
}

export function putNode(node) {
  if (node.x < CL.x0 || node.x > CL.x1 || node.z < CL.z0 || node.z > CL.z1) return;
  CL.sink.node(node);
}

export function putSpawn(spawn) {
  if (spawn.x < CL.x0 || spawn.x > CL.x1 || spawn.z < CL.z0 || spawn.z > CL.z1) return;
  CL.sink.spawn(spawn);
}

export function putChest(chest) {
  if (chest.x < CL.x0 || chest.x > CL.x1 || chest.z < CL.z0 || chest.z > CL.z1) return;
  put(chest.x, chest.y, chest.z, B.chest_block);
  CL.sink.chest(chest);
}

// ---- entry shafts ----------------------------------------------------------
// Both site types reach the surface the same way: a lined 3×3 bore with a ladder
// up one side and a solid landing at every level it passes, so a fall is at most
// one storey and you can always climb back out. Materials differ; the geometry
// doesn't, so it lives here.
// Call between the shell pass and the bore pass — see the two-pass note in
// mineshaft.js: a shell written after a neighbour's bore would plug it.
export function shaftShell(x, z, yBot, yTop, id) {
  box(x - 2, yBot, z - 2, x + 2, yTop, z + 2, id);
}

export function shaftBore(x, z, yBot, yTop) {
  box(x - 1, yBot, z - 1, x + 1, yTop, z + 1, B.air);
}

// The ladder runs at +X of centre; landings leave that one column open so the
// climb is continuous. Returns nothing — decoration pass, run it last.
export function shaftFittings(x, z, yBot, yTop, landings, landingId) {
  for (let y = yBot; y <= yTop; y++) put(x + 1, y, z, B.ladder);
  for (const ly of landings) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 1 && dz === 0) continue;            // the ladder's own column stays open
        put(x + dx, ly, z + dz, landingId);
      }
    }
  }
}

// ---- small deterministic helpers ------------------------------------------
// Weighted pick over a flat [value, weight, value, weight, …] table. Flat so the
// tables are module constants that never allocate on use.
export function pickFlat(rand, table) {
  let total = 0;
  for (let i = 1; i < table.length; i += 2) total += table[i];
  let r = rand() * total;
  for (let i = 1; i < table.length; i += 2) {
    r -= table[i];
    if (r <= 0) return table[i - 1];
  }
  return table[table.length - 2];
}

export const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
