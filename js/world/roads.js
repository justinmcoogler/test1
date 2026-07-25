// Endless arterial roads and their waystones (docs/WORLD_PLAN.md, phase 5).
//
// Eight arterials leave Brookhollow on the compass points and run forever. The
// hard constraint is chunk-LOCALITY: a chunk must be generatable on its own, in
// any order, with no global state and no memory of whether its neighbours exist
// yet. So nothing here marches a route outward from spawn the way the
// inter-town lanes in worldgen.js do. Every arterial is instead a closed form
// in its own rotated frame:
//
//   s = distance along the compass axis      t = signed distance across it
//   centre line:  t = wander(s)              corridor: |t − wander(s)| ≤ GRADE_HW
//
// and the road's surface height is a function of `s` ALONE. That is also what
// buys the ≤1-block-step guarantee outright rather than by inspection: two
// 4-adjacent columns differ by at most 1 in s (the along-axis is a unit vector,
// so |u.x| ≤ 1 and |u.z| ≤ 1), and the height profile below is Lipschitz with
// slope MAX_SLOPE < 1. No two neighbouring road columns can therefore be more
// than one block apart — lengthways OR laterally, on any seed, in any load
// order. See tests/unit/roads.test.mjs.
import { B, isSolid } from './blocks.js';
import { CHUNK, SEA, MANOR_PAD, LEARN_MEADOW, FROST_CAMP } from './worldgen.js';
import { valueNoise2 } from '../core/noise.js';
import { hash2 } from '../core/rng.js';

// ---- Geometry --------------------------------------------------------------
export const ARTERIALS = 8;
// Along-axis unit vectors for the eight compass points, written out rather than
// derived from cos/sin so the axis-aligned roads get exact 0s and 1s (a 6e-17
// leak would make `s` differ in the last bits between two ways of reaching the
// same column).
const R2 = Math.SQRT1_2;
const U = new Float64Array([
  1, 0, R2, R2, 0, 1, -R2, R2, -1, 0, -R2, -R2, 0, -1, R2, -R2,
]);

// Paving starts clear of everything Brookhollow builds on the surface (its
// outermost surface edit is 55 blocks out) with room to spare. The starter
// plateau stays flat to 150 blocks, so the arterials still begin on level,
// town-height ground and the plaza walks straight onto them.
export const ROAD_START = 76;

// The wander that makes a road curve instead of running ruled. Amplitude opens
// up with distance — capped, and always a small fraction of `s` — so the eight
// arterials leave spawn on their true bearings and can never swing far enough
// to tangle with the neighbour 45° away.
const AMP_MAX = 30, AMP_GROW = 0.11;
const WANDER_L1 = 340, WANDER_L2 = 125, WANDER_MIX = 0.72;

// ---- The height profile ----------------------------------------------------
// Anchors every ANCHOR_K blocks along the centre line hold the natural ground
// there; the road's profile is a slope-limited envelope of those anchors,
// linearly interpolated between them. MAX_SLOPE < 1 is the whole ballgame.
const ANCHOR_K = 6;
const MAX_SLOPE = 0.8;
const GRADE_C = ANCHOR_K * MAX_SLOPE;   // max height change between two anchors
// Anchors are clamped into [H_LO, H_HI]: H_LO keeps the road a block clear of
// the sea (a causeway, never a drowned lane), and H_HI bounds the anchor RANGE,
// which is the only thing the Lipschitz proof needs. Terrain tops out near 136,
// so the ceiling bites on bare peaks only — where the envelope was already
// cutting anyway.
const H_LO = SEA + 1, H_HI = 132;
// Envelope half-window. ENV_P · GRADE_C ≥ H_HI − H_LO is exactly the condition
// that makes a TRUNCATED envelope as Lipschitz as an unbounded one: an anchor
// ENV_P steps away carries a penalty larger than the whole height range, so it
// can never beat the column's own anchor and the window edge never binds.
// Truncation is what keeps the profile computable from a bounded neighbourhood
// — i.e. what makes it chunk-local.
const ENV_P = Math.ceil((H_HI - H_LO) / GRADE_C);

// ---- Cross-section ---------------------------------------------------------
// A cobble core, gravel verges, and a graded but unpaved shoulder beyond them
// so the earthworks read as a cut rather than a painted stripe.
const CORE_HW = 1.6, VERGE_HW = 2.95, GRADE_HW = 3.7;
const EDGE_WOBBLE = 1.05;   // how far the paving edges breathe, in blocks
const EDGE_RAGGED = 0.4;    // chance an outermost paving cell is left unpaved

export const WAYSTONE_SPACING = 256;
const WS_OFFSET = 2.7;      // waystone furniture sits on the verge, off the lane
// Stacked upward from the road surface. Module-level so placing one allocates
// nothing.
const WS_MARKER = [B.stone_brick, B.stone_brick, B.torch_post];
const WS_SIGN = [B.planks_fence, B.sign];
const WS_BENCH = [B.planks_slab];

const CHUNK_R = 11.4;       // half-diagonal of a chunk, for the coarse reject
const BED_MAX = 40;         // deepest a causeway will reach for solid ground

// Salts. Each road gets its own noise streams so two arterials never wander in
// step, and the paving/edge rolls stay independent of the route.
const S_WANDER1 = 5101, S_WANDER2 = 5209, S_EDGE_CORE = 5303, S_EDGE_VERGE = 5387;
const S_PAVE = 5407, S_RAGGED = 5501, S_WAYSIDE = 5701;
const DIR_SALT = 131;

// One Roads per WorldGen. Held in a WeakMap rather than on the generator so
// this module never has to reach into worldgen.js; it owns nothing but scratch
// buffers, and every value it produces is a pure function of (seed, x, z).
const BY_GEN = new WeakMap();
export function roadsFor(gen) {
  let r = BY_GEN.get(gen);
  if (!r) { r = new Roads(); BY_GEN.set(gen, r); }
  return r;
}

export class Roads {
  constructor() {
    // Scratch, sized for the worst chunk window and reused for every chunk:
    // chunk generation must not allocate per column (or per chunk, ideally).
    this._A = new Float64Array(160);     // clamped natural ground at each anchor
    this._R = new Float64Array(64);      // slope-limited profile at each anchor
    this._j0 = 0; this._j1 = 0;          // anchor index range currently in _R
    this._mask = new Uint8Array(CHUNK * CHUNK);   // 1 = this column is road
    this._roadY = new Int16Array(CHUNK * CHUNK);  // its graded surface
    this._dirs = new Int32Array(ARTERIALS);       // arterials in play this chunk
    this._col = new Int32Array(2);       // column-coordinate out-param
    this._near = 0;                      // which exclusions this chunk can hit
    this._trunk = null;                  // bbox of worldgen's inter-town lanes
  }

  // ---- Route ---------------------------------------------------------------
  // Lateral offset of the centre line at `s`. Two octaves: a long sweep plus a
  // shorter kink, so the road reads as surveyed terrain-following rather than a
  // sine wave.
  wander(seed, dir, s) {
    let amp = s * AMP_GROW;
    if (amp > AMP_MAX) amp = AMP_MAX;
    const n1 = valueNoise2(seed + S_WANDER1 + dir * DIR_SALT, s / WANDER_L1, 0.5);
    const n2 = valueNoise2(seed + S_WANDER2 + dir * DIR_SALT, s / WANDER_L2, 3.5);
    return amp * (WANDER_MIX * (2 * n1 - 1) + (1 - WANDER_MIX) * (2 * n2 - 1));
  }

  // The lattice column `across` blocks to the side of the centre line at `s`.
  // out is a reused Int32Array — callers must consume it before the next call.
  column(gen, dir, s, across, out = this._col) {
    const ux = U[dir * 2], uz = U[dir * 2 + 1];
    const w = this.wander(gen.seed, dir, s) + across;
    out[0] = Math.round(ux * s - uz * w);
    out[1] = Math.round(uz * s + ux * w);
    return out;
  }

  // ---- Profile -------------------------------------------------------------
  // Ground the road has to work with at one anchor. `_naturalHeight` on purpose,
  // not `heightAt`: heightAt already returns the baked inter-town lane surface
  // where one exists, and an arterial that chased another road's grade would
  // stop being a function of its own `s`.
  _anchor(gen, dir, s) {
    const c = this.column(gen, dir, s, 0, this._col);
    let h = gen._naturalHeight(c[0], c[1]);
    if (h < H_LO) h = H_LO;
    else if (h > H_HI) h = H_HI;
    return h;
  }

  // Build the profile over the anchors covering [sMin, sMax].
  //
  // The profile is the midpoint of two envelopes of the anchor heights: the
  // largest slope-limited curve that stays under them (which shaves the tops
  // off hills) and the smallest that stays over them (which carries the road
  // across dips). Each envelope is Lipschitz on its own, so their average is
  // too — and taking the average is what balances cut against fill, instead of
  // trenching every hill or embanking every valley.
  window(gen, dir, sMin, sMax) {
    const jLo = Math.floor(sMin / ANCHOR_K) - 1;
    let jHi = Math.floor(sMax / ANCHOR_K) + 2;
    // The scratch buffers bound how much route one window can hold. A chunk
    // needs ten anchors; the cap only exists so a careless caller truncates
    // instead of writing past the end.
    if (jHi - jLo > WINDOW_MAX_J) jHi = jLo + WINDOW_MAX_J;
    const A = this._A, R = this._R;
    const aLo = jLo - ENV_P;
    const n = (jHi + ENV_P) - aLo + 1;
    for (let i = 0; i < n; i++) A[i] = this._anchor(gen, dir, (aLo + i) * ANCHOR_K);
    for (let j = jLo; j <= jHi; j++) {
      let under = Infinity, over = -Infinity;
      const c = j - aLo;
      for (let k = -ENV_P; k <= ENV_P; k++) {
        const a = A[c + k];
        const pen = (k < 0 ? -k : k) * GRADE_C;
        const d = a + pen; if (d < under) under = d;
        const u = a - pen; if (u > over) over = u;
      }
      R[j - jLo] = (under + over) * 0.5;
    }
    this._j0 = jLo; this._j1 = jHi;
  }

  // Road surface at `s`, from the profile currently in the window.
  gradeAt(s) {
    const q = s / ANCHOR_K;
    let j = Math.floor(q);
    if (j < this._j0) j = this._j0;
    else if (j >= this._j1) j = this._j1 - 1;
    const i = j - this._j0, R = this._R;
    return Math.round(R[i] + (R[i + 1] - R[i]) * (q - j));
  }

  // Standalone surface height at a point on an arterial. Rebuilds the window,
  // so it is for tests and one-off queries — the chunk path reuses one window
  // for all 256 columns.
  surfaceY(gen, dir, s) {
    this.window(gen, dir, s, s);
    return this.gradeAt(s);
  }

  // ---- Exclusions ----------------------------------------------------------
  // Ground that already belongs to something hand-built. The pads and the
  // settlement own their own flat surface, and worldgen's inter-town lanes are
  // already-graded road — an arterial that regraded either would leave a step
  // in someone else's floor.
  _blocked(gen, x, z, near) {
    if (near & 1) { const dx = x - MANOR_PAD.x, dz = z - MANOR_PAD.z; if (dx * dx + dz * dz < 34 * 34) return true; }
    if (near & 2) { const dx = x - LEARN_MEADOW.x, dz = z - LEARN_MEADOW.z; if (dx * dx + dz * dz < 34 * 34) return true; }
    if (near & 4) { const dx = x - FROST_CAMP.x, dz = z - FROST_CAMP.z; if (dx * dx + dz * dz < 76 * 76) return true; }
    // Only reached inside the inter-town lanes' bounding box, and only for
    // columns already known to be in a road corridor — a handful per chunk.
    if (near & 8 && gen.pathSet.has(x + ',' + z)) return true;
    return false;
  }

  // Bounding box of worldgen's baked lanes, so chunks nowhere near them never
  // pay for the string-keyed lookup above. Computed once per generator.
  _trunkBox(gen) {
    if (this._trunk) return this._trunk;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    if (gen.pathSet) {
      for (const k of gen.pathSet) {
        const i = k.indexOf(','), x = +k.slice(0, i), z = +k.slice(i + 1);
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (z < z0) z0 = z; if (z > z1) z1 = z;
      }
    }
    this._trunk = [x0, x1, z0, z1];
    return this._trunk;
  }

  // ---- Chunk carve ---------------------------------------------------------
  // Regrades, paves and furnishes every arterial column in one chunk, and drops
  // the scatter pass's trees/nodes/spawns that fell on them. Returns the highest
  // block written, or -1 if no arterial touches this chunk.
  carve(gen, chunk, blocks, cx, cz) {
    const ccx = cx * CHUNK + 7.5, ccz = cz * CHUNK + 7.5;
    // Coarse reject first: eight scalar tests decide whether this chunk can hold
    // any arterial at all. Nearly every chunk in the world leaves here.
    const dirs = this._dirs;
    let nd = 0;
    for (let d = 0; d < ARTERIALS; d++) {
      const ux = U[d * 2], uz = U[d * 2 + 1];
      const s0 = ccx * ux + ccz * uz;
      if (s0 + CHUNK_R < ROAD_START) continue;
      const t0 = ccx * -uz + ccz * ux;
      let amp = (s0 + CHUNK_R) * AMP_GROW;
      if (amp > AMP_MAX) amp = AMP_MAX;
      if ((t0 < 0 ? -t0 : t0) > amp + GRADE_HW + CHUNK_R) continue;
      dirs[nd++] = d;
    }
    if (nd === 0) return -1;

    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    this._near = 0;
    if (this._boxNear(x0, z0, MANOR_PAD.x, MANOR_PAD.z, 34)) this._near |= 1;
    if (this._boxNear(x0, z0, LEARN_MEADOW.x, LEARN_MEADOW.z, 34)) this._near |= 2;
    if (this._boxNear(x0, z0, FROST_CAMP.x, FROST_CAMP.z, 76)) this._near |= 4;
    const tb = this._trunkBox(gen);
    if (x0 + CHUNK > tb[0] - 2 && x0 < tb[1] + 2 && z0 + CHUNK > tb[2] - 2 && z0 < tb[3] + 2) this._near |= 8;

    this._mask.fill(0);
    let top = -1;
    for (let i = 0; i < nd; i++) {
      const d = dirs[i];
      const ux = U[d * 2], uz = U[d * 2 + 1];
      const s0 = ccx * ux + ccz * uz;
      // Widened by the waystone reach so one window serves both passes.
      this.window(gen, d, Math.max(ROAD_START - 1, s0 - CHUNK_R - 8), s0 + CHUNK_R + 8);
      const y = this._carveDir(gen, chunk, blocks, cx, cz, d);
      if (y > top) top = y;
      const w = this._waystones(gen, blocks, cx, cz, d, s0 - CHUNK_R - 8, s0 + CHUNK_R + 8);
      if (w > top) top = w;
    }
    if (top >= 0) this._evict(chunk, cx, cz);
    return top;
  }

  _boxNear(x0, z0, px, pz, r) {
    const dx = px < x0 ? x0 - px : px > x0 + CHUNK ? px - x0 - CHUNK : 0;
    const dz = pz < z0 ? z0 - pz : pz > z0 + CHUNK ? pz - z0 - CHUNK : 0;
    return dx * dx + dz * dz < r * r;
  }

  _carveDir(gen, chunk, blocks, cx, cz, d) {
    const ux = U[d * 2], uz = U[d * 2 + 1];
    const seed = gen.seed;
    const mask = this._mask, roadY = this._roadY;
    let top = -1;
    for (let lz = 0; lz < CHUNK; lz++) {
      const wz = cz * CHUNK + lz;
      for (let lx = 0; lx < CHUNK; lx++) {
        const wx = cx * CHUNK + lx;
        const s = wx * ux + wz * uz;
        if (s < ROAD_START) continue;
        const t = wx * -uz + wz * ux;
        // Cheap bound before touching noise: |wander| can never exceed amp(s).
        let amp = s * AMP_GROW;
        if (amp > AMP_MAX) amp = AMP_MAX;
        const ta = t < 0 ? -t : t;
        if (ta > amp + GRADE_HW) continue;
        const off = t - this.wander(seed, d, s);
        const a = off < 0 ? -off : off;
        if (a > GRADE_HW) continue;
        const li = lz * CHUNK + lx;
        if (mask[li]) continue;              // another arterial already owns it
        if (this._blocked(gen, wx, wz, this._near)) continue;

        const y = this.gradeAt(s);
        mask[li] = 1; roadY[li] = y;
        const hNat = chunk.surfaceH[li];
        chunk.surfaceH[li] = y;
        const t2 = this._paveColumn(blocks, seed, d, s, wx, wz, lx, lz, a, y, hNat);
        if (t2 > top) top = t2;
      }
    }
    return top;
  }

  // One column: cut or fill to the graded height, then dress the surface.
  _paveColumn(blocks, seed, d, s, wx, wz, lx, lz, a, y, hNat) {
    const base = lz * CHUNK + lx, step = CHUNK * CHUNK;
    // Everything the road cuts through goes, including whatever the scatter
    // pass had already rooted on the old surface.
    for (let yy = y + 1; yy <= hNat + 2; yy++) blocks[base + yy * step] = B.air;

    // Bed. Air below the running surface is filled so the lane is never a
    // ledge, but WATER is left alone: the causeway rests on the surface it
    // crosses rather than draining the lake — and nothing downstream (reeds,
    // fishing spots, the flow sim) loses the water it was placed against.
    let bed = y - 4 < hNat ? y - 4 : hNat;
    if (bed < y - BED_MAX) bed = y - BED_MAX;
    for (let yy = y - 1; yy > bed && yy > 0; yy--) {
      const i = base + yy * step, cur = blocks[i];
      if (cur !== B.water && !isSolid(cur)) blocks[i] = B.cobble;
    }

    // Surface. Irregular edges: the core/verge boundaries breathe along the
    // route, and the outermost paving cell is dropped at random, so the road
    // reads as laid stone rather than a stencil.
    const bridge = hNat < SEA;
    const coreEdge = CORE_HW + (valueNoise2(seed + S_EDGE_CORE + d * DIR_SALT, s / 11, 1.5) - 0.5) * EDGE_WOBBLE;
    const vergeEdge = VERGE_HW + (valueNoise2(seed + S_EDGE_VERGE + d * DIR_SALT, s / 17, 6.5) - 0.5) * EDGE_WOBBLE;
    let paved = a <= vergeEdge;
    if (paved && a > vergeEdge - 0.55 && hash2(seed + S_RAGGED, wx, wz) < EDGE_RAGGED) paved = false;

    let surf;
    if (!paved) {
      // Graded shoulder. On a cut the block already sitting there IS the biome's
      // own subsoil, which is exactly what a fresh cutting exposes — so only a
      // fill needs a face put on it.
      surf = y > hNat ? B.dirt : 0;
    } else if (a <= coreEdge) {
      const r = hash2(seed + S_PAVE, wx, wz);
      surf = bridge ? B.stone_brick : r < 0.09 ? B.gravel : r < 0.18 ? B.mossy_cobble : r < 0.24 ? B.stone : B.cobble;
    } else {
      const r = hash2(seed + S_PAVE, wx, wz);
      surf = r < 0.12 ? B.cobble : r < 0.17 ? B.dirt : B.gravel;
    }
    if (surf) blocks[base + y * step] = surf;

    // A parapet where the road runs out over water, so a bridge looks like one
    // and you cannot walk off it in the dark.
    if (bridge && paved && a > vergeEdge - 1) {
      blocks[base + (y + 1) * step] = B.cobble_wall;
      return y + 1;
    }
    return y;
  }

  // ---- Waystones -----------------------------------------------------------
  // Every WAYSTONE_SPACING blocks along each arterial: a lit standing stone, a
  // signpost and a bench, all on the verge and clear of the running lane. Each
  // piece re-reads the graded height of the column it actually lands on, so a
  // waystone straddling a chunk border comes out identical from either side.
  _waystones(gen, blocks, cx, cz, d, sLo, sHi) {
    let top = -1;
    const first = Math.ceil(sLo / WAYSTONE_SPACING), last = Math.floor(sHi / WAYSTONE_SPACING);
    for (let n = first; n <= last; n++) {
      const s = n * WAYSTONE_SPACING;
      if (s < ROAD_START) continue;
      const side = waysideOf(gen.seed, d, n);
      let y = this._prop(gen, blocks, cx, cz, d, s, WS_OFFSET * side, WS_MARKER);
      if (y > top) top = y;
      y = this._prop(gen, blocks, cx, cz, d, s + 3, WS_OFFSET * side, WS_SIGN);
      if (y > top) top = y;
      for (let k = -1; k <= 1; k++) {
        y = this._prop(gen, blocks, cx, cz, d, s + k, -WS_OFFSET * side, WS_BENCH);
        if (y > top) top = y;
      }
    }
    return top;
  }

  // Stack `ids` on the road surface of one column, if that column is in this
  // chunk and was actually graded. Anything else is silently skipped — which is
  // also how a waystone declines to build itself on a pad or a hand-built lane.
  _prop(gen, blocks, cx, cz, d, s, across, ids) {
    const c = this.column(gen, d, s, across, this._col);
    const lx = c[0] - cx * CHUNK, lz = c[1] - cz * CHUNK;
    if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK) return -1;
    const li = lz * CHUNK + lx;
    if (!this._mask[li]) return -1;
    const base = lz * CHUNK + lx, step = CHUNK * CHUNK, y = this._roadY[li];
    for (let i = 0; i < ids.length; i++) blocks[base + (y + 1 + i) * step] = ids[i];
    return y + ids.length;
  }

  // ---- Aftermath -----------------------------------------------------------
  // The scatter pass ran before the road existed, so anything it seeded on a
  // road column has just been paved over. Drop those entries rather than leave
  // trees and spawn points to be stamped back on top of the lane.
  _evict(chunk, cx, cz) {
    const mask = this._mask;
    const inRoad = (x, z) => {
      const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
      return lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK && mask[lz * CHUNK + lx] === 1;
    };
    let w = 0;
    for (let i = 0; i < chunk.nodes.length; i++) {
      const n = chunk.nodes[i];
      if (!inRoad(n.x, n.z)) chunk.nodes[w++] = n;
    }
    chunk.nodes.length = w;
    w = 0;
    for (let i = 0; i < chunk.spawns.length; i++) {
      const sp = chunk.spawns[i];
      if (!inRoad(sp.x, sp.z)) chunk.spawns[w++] = sp;
    }
    chunk.spawns.length = w;
  }

  // ---- Queries (UI, tests, later phases) -----------------------------------
  // Which arterial, if any, owns this column — and where along it. Returns the
  // direction index, or -1. `sOut` receives [s, t] when supplied. This is the
  // same corridor test the carve uses, so "is this column road?" has exactly
  // one answer no matter who asks.
  arterialAt(gen, x, z, sOut = null) {
    for (let d = 0; d < ARTERIALS; d++) {
      const s = alongOf(d, x, z);
      if (s < ROAD_START) continue;
      const t = acrossOf(d, x, z);
      let amp = s * AMP_GROW;
      if (amp > AMP_MAX) amp = AMP_MAX;
      if ((t < 0 ? -t : t) > amp + GRADE_HW) continue;
      const off = t - this.wander(gen.seed, d, s);
      if ((off < 0 ? -off : off) > GRADE_HW) continue;
      if (this._blocked(gen, x, z, 15)) continue;
      if (sOut) { sOut[0] = s; sOut[1] = t; }
      return d;
    }
    return -1;
  }

  // The column carrying the n-th waystone's lit marker on arterial `dir`. One
  // definition, shared by the builder and by anything looking for one.
  waystoneColumn(gen, dir, n, out = this._col) {
    return this.column(gen, dir, n * WAYSTONE_SPACING, WS_OFFSET * waysideOf(gen.seed, dir, n), out);
  }
}

// Which verge a waystone stands on — alternating so the road doesn't grow a
// hedge of markers all down one side.
function waysideOf(seed, dir, n) { return hash2(seed + S_WAYSIDE, dir, n) < 0.5 ? 1 : -1; }

// Distance along / across arterial `dir` for a world column.
export function alongOf(dir, x, z) { return x * U[dir * 2] + z * U[dir * 2 + 1]; }
export function acrossOf(dir, x, z) { return x * -U[dir * 2 + 1] + z * U[dir * 2]; }

// The one entry point world.js calls during chunk generation.
export function carveRoads(gen, chunk, blocks, cx, cz) {
  return roadsFor(gen).carve(gen, chunk, blocks, cx, cz);
}
