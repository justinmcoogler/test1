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
import { CHUNK, WORLD_H, SEA, MANOR_PAD, LEARN_MEADOW, FROST_CAMP } from './worldgen.js';
import { valueNoise2 } from '../core/noise.js';
import { hash2 } from '../core/rng.js';

// ---- Geometry --------------------------------------------------------------
// 8 primary arterials radiate from Brookhollow; 8 secondary LANES fork off them
// further out and also run forever. A fork is not a ray from spawn — its frame's
// origin sits on its parent arterial — so it reads as a road leaving a road.
export const ARTERIALS = 16;
export const PRIMARIES = 8;
// Along-axis unit vectors for the eight compass points, written out rather than
// derived from cos/sin so the axis-aligned roads get exact 0s and 1s (a 6e-17
// leak would make `s` differ in the last bits between two ways of reaching the
// same column).
const R2 = Math.SQRT1_2;
const U = new Float64Array(ARTERIALS * 2);
for (let d = 0; d < PRIMARIES; d++) {
  // Exact 0s and 1s on the axis-aligned bearings: a 6e-17 leak would make `s`
  // differ in the last bits between two ways of reaching the same column.
  const AX = [[1, 0], [R2, R2], [0, 1], [-R2, R2], [-1, 0], [-R2, -R2], [0, -1], [R2, -R2]];
  U[d * 2] = AX[d][0]; U[d * 2 + 1] = AX[d][1];
}
// Each fork leaves its parent at FORK_TURN, alternating side so the network
// spreads instead of curling one way.
const FORK_TURN = 0.55;   // radians, ~31 degrees
for (let d = PRIMARIES; d < ARTERIALS; d++) {
  const par = d - PRIMARIES;
  const th = Math.atan2(U[par * 2 + 1], U[par * 2]) + (par % 2 ? -FORK_TURN : FORK_TURN);
  U[d * 2] = Math.cos(th); U[d * 2 + 1] = Math.sin(th);
}

// Paving starts clear of everything Brookhollow builds on the surface (its
// outermost surface edit is 55 blocks out) with room to spare. The starter
// plateau stays flat to 150 blocks, so the arterials still begin on level,
// town-height ground and the plaza walks straight onto them.
export const ROAD_START = 76;

// The wander that makes a road curve instead of running ruled. Amplitude opens
// up with distance — capped, and always a small fraction of `s` — so the eight
// arterials leave spawn on their true bearings and can never swing far enough
// to tangle with the neighbour 45° away.
// How far the centre line wanders off the compass bearing. THREE octaves, and
// the shortest one is what actually makes the road read as winding.
//
// The measure that matters is not total drift, it is BOW WITHIN A SIGHTLINE:
// over the ~60 blocks you can see before the fog takes the road, how far does it
// bow away from the straight line joining the ends of that stretch? Two long
// octaves gave 49 blocks of drift over 3000 travelled and still looked like an
// arrow, because 49 blocks accumulated that gradually is 6 blocks of bow in
// view — a 10% deviation the eye reads as straight. The third octave at
// WANDER_L3 puts a kink inside every sightline and takes the bow to ~15.
//
// The ceiling is walkability, and it is checked rather than assumed: the paved
// corridor is a band measured PERPENDICULAR to the compass axis, so where the
// centre line runs at angle θ the lane narrows by cos θ. tests/unit/roads.test.mjs
// flood-fills 300 blocks of every arterial with the player's own movement rule,
// which is the real bound on how hard these may be pushed.
const AMP_MAX = 70, AMP_GROW = 0.30;
const WANDER_L1 = 300, WANDER_L2 = 95, WANDER_L3 = 55;
const WANDER_W1 = 0.45, WANDER_W2 = 0.30, WANDER_W3 = 0.25;

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
const WINDOW_MAX_J = 60;   // anchors one profile window can span (see `window`)

// ---- Cross-section ---------------------------------------------------------
// A cobble core, gravel verges, and a graded but unpaved shoulder beyond them
// so the earthworks read as a cut rather than a painted stripe.
const CORE_HW = 1.6, VERGE_HW = 2.95, GRADE_HW = 3.7;
// A secondary lane is a humbler road: narrower, gravel rather than laid cobble,
// wandering less (its neighbours are only ~22 degrees away once the forks are in,
// so it has less room to swing), and no waystones — those mark the trunk network.
const LANE_CORE = 1.0, LANE_VERGE = 1.85, LANE_GRADE = 2.5, LANE_AMP = 42;
export const FORK_AT = 430;        // how far along its parent a fork leaves
// Per-direction road class, so every loop below can stay a single pass over
// `d` instead of branching on primary-vs-lane at each use.
const RC_START = new Float64Array(ARTERIALS);
const RC_CORE = new Float64Array(ARTERIALS);
const RC_VERGE = new Float64Array(ARTERIALS);
const RC_GRADE = new Float64Array(ARTERIALS);
const RC_AMP = new Float64Array(ARTERIALS);
for (let d = 0; d < ARTERIALS; d++) {
  const lane = d >= PRIMARIES;
  RC_START[d] = lane ? 0 : ROAD_START;   // a fork starts at its own origin
  RC_CORE[d] = lane ? LANE_CORE : CORE_HW;
  RC_VERGE[d] = lane ? LANE_VERGE : VERGE_HW;
  RC_GRADE[d] = lane ? LANE_GRADE : GRADE_HW;
  RC_AMP[d] = lane ? LANE_AMP : AMP_MAX;
}
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
const BRIDGE_BENT = 4;      // blocks between the piles carrying a bridge deck
// Half-width of a bridge deck, fixed. The outermost column each side carries the
// handrail, so the walkable deck is BRIDGE_HW*2 - 1 wide.
const BRIDGE_HW = 3;
// Paving material → the stair variant used where the road climbs a block, so a
// grade is a flight you walk rather than a kerb you jump. Anything without an
// entry (gravel, dirt) just stays flat — the shoulder is not lane.
const STEP_OF = {
  [B.cobble]: B.cobble_stairs, [B.mossy_cobble]: B.mossy_cobble_stairs ?? B.cobble_stairs,
  [B.stone]: B.stone_stairs, [B.stone_brick]: B.stone_brick_stairs,
};
// Facing (0=+Z 1=+X 2=-Z 3=-X) that points UP the grade for each arterial. The
// diagonals take their dominant axis; a stair only has four orientations.
const UPHILL_FACE = [1, 1, 0, 0, 3, 3, 2, 2];

// Salts. Each road gets its own noise streams so two arterials never wander in
// step, and the paving/edge rolls stay independent of the route.
const S_WANDER1 = 5101, S_WANDER2 = 5209, S_WANDER3 = 5417, S_EDGE_CORE = 5303, S_EDGE_VERGE = 5387;
// Wayside crofts: how often a site is OFFERED, how rarely it is taken, how far
// back from the lane it sits, and how far out from the road a chunk has to look
// to find one that reaches it. Rare on purpose — see _crofts.
const CROFT_SPACING = 190, CROFT_CHANCE = 0.28, CROFT_START = 260;
const CROFT_OFFSET = 11, CROFT_REACH = 20;
const S_CROFT = 6101, S_CROFT_SIDE = 6203, S_CROFT_ART = 6301;
// Finite TRAILS. Unlike a road, a trail does no earthworks: it is a worn line
// over whatever ground is already there, so it needs no height profile, makes no
// ≤1-step promise of its own beyond the terrain's, and never claims a column in
// the road mask. That is also what a trail IS — a footpath, not a lane — and it
// keeps them cheap enough to be common.
const TRAIL_SPACING = 120, TRAIL_CHANCE = 0.55, TRAIL_START = 150;
const TRAIL_MIN = 90, TRAIL_MAX = 460;    // how far a trail runs before it peters out
const TRAIL_HW = 1.15;                    // half-width of the worn line
const S_TRAIL = 7101, S_TRAIL_LEN = 7207, S_TRAIL_TURN = 7309, S_TRAIL_W = 7411;
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
    this._col2 = new Int32Array(2);      // second out-param, for a croft's door bearing
    // Frame origin of each road, expressed as (along, across) in that road's own
    // rotated axes. Zero for a primary, which starts at spawn. For a fork it is
    // the point on its PARENT's centre line where it leaves, so the two roads
    // actually meet — which is why it is seed-dependent and lives here rather
    // than in a module constant.
    this._s0 = new Float64Array(ARTERIALS);
    this._t0 = new Float64Array(ARTERIALS);
    this._framed = false;
    // Profile sampling gets its OWN column scratch: building a window walks the
    // centre line, and doing that through _col would quietly clobber the caller's
    // column between `roads.column(...)` and `roads.surfaceY(...)`.
    this._anchorCol = new Int32Array(2);
    this._near = 0;                      // which exclusions this chunk can hit
    this._trunk = null;                  // bbox of worldgen's inter-town lanes
  }

  // ---- Route ---------------------------------------------------------------
  // Lateral offset of the centre line at `s`. Two octaves: a long sweep plus a
  // shorter kink, so the road reads as surveyed terrain-following rather than a
  // sine wave.
  // Where each fork leaves its parent. Computed once per generator: the parent's
  // centre-line column at FORK_AT, converted into the fork's own axes.
  _frame(gen) {
    if (this._framed) return;
    this._framed = true;
    for (let d = PRIMARIES; d < ARTERIALS; d++) {
      const par = d - PRIMARIES;
      const w = this.wander(gen.seed, par, FORK_AT);
      const ux = U[par * 2], uz = U[par * 2 + 1];
      const ox = ux * FORK_AT - uz * w, oz = uz * FORK_AT + ux * w;
      this._s0[d] = alongOf(d, ox, oz);
      this._t0[d] = acrossOf(d, ox, oz);
    }
  }

  // Distance along / across a road, measured from ITS OWN origin.
  along(gen, d, x, z) { this._frame(gen); return alongOf(d, x, z) - this._s0[d]; }
  across(gen, d, x, z) { this._frame(gen); return acrossOf(d, x, z) - this._t0[d]; }

  wander(seed, dir, s) {
    const cap = RC_AMP[dir];
    let amp = s * AMP_GROW;
    if (amp > cap) amp = cap;
    const n1 = valueNoise2(seed + S_WANDER1 + dir * DIR_SALT, s / WANDER_L1, 0.5);
    const n2 = valueNoise2(seed + S_WANDER2 + dir * DIR_SALT, s / WANDER_L2, 3.5);
    const n3 = valueNoise2(seed + S_WANDER3 + dir * DIR_SALT, s / WANDER_L3, 7.5);
    return amp * (WANDER_W1 * (2 * n1 - 1) + WANDER_W2 * (2 * n2 - 1) + WANDER_W3 * (2 * n3 - 1));
  }

  // The lattice column `across` blocks to the side of the centre line at `s`.
  // out is a reused Int32Array — callers must consume it before the next call.
  column(gen, dir, s, across, out = this._col) {
    this._frame(gen);
    const ux = U[dir * 2], uz = U[dir * 2 + 1];
    const S = s + this._s0[dir], T = this.wander(gen.seed, dir, s) + across + this._t0[dir];
    out[0] = Math.round(ux * S - uz * T);
    out[1] = Math.round(uz * S + ux * T);
    return out;
  }

  // ---- Profile -------------------------------------------------------------
  // Ground the road has to work with at one anchor. `_naturalHeight` on purpose,
  // not `heightAt`: heightAt already returns the baked inter-town lane surface
  // where one exists, and an arterial that chased another road's grade would
  // stop being a function of its own `s`.
  _anchor(gen, dir, s) {
    const c = this.column(gen, dir, s, 0, this._anchorCol);
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
  carve(gen, chunk, blocks, cx, cz, setFacing) {
    const ccx = cx * CHUNK + 7.5, ccz = cz * CHUNK + 7.5;
    // Coarse reject first: eight scalar tests decide whether this chunk can hold
    // any arterial at all. Nearly every chunk in the world leaves here.
    this._frame(gen);
    const dirs = this._dirs;
    let nd = 0;
    for (let d = 0; d < ARTERIALS; d++) {
      const ux = U[d * 2], uz = U[d * 2 + 1];
      const s0 = ccx * ux + ccz * uz - this._s0[d];
      if (s0 + CHUNK_R < RC_START[d]) continue;
      const t0 = ccx * -uz + ccz * ux - this._t0[d];
      let amp = (s0 + CHUNK_R) * AMP_GROW;
      if (amp > RC_AMP[d]) amp = RC_AMP[d];
      if ((t0 < 0 ? -t0 : t0) > amp + RC_GRADE[d] + CHUNK_R) continue;
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
      const s0 = ccx * ux + ccz * uz - this._s0[d];
      // Widened by the waystone reach so one window serves both passes.
      this.window(gen, d, Math.max(RC_START[d] - 1, s0 - CHUNK_R - 8), s0 + CHUNK_R + 8);
      const y = this._carveDir(gen, chunk, blocks, cx, cz, d, setFacing);
      if (y > top) top = y;
      if (d < PRIMARIES) {   // waystones mark the trunk network, not the lanes
        const w = this._waystones(gen, blocks, cx, cz, d, s0 - CHUNK_R - 8, s0 + CHUNK_R + 8);
        if (w > top) top = w;
      }
      const c = this._crofts(gen, chunk, blocks, cx, cz, d, s0 - CHUNK_R - CROFT_REACH, s0 + CHUNK_R + CROFT_REACH);
      if (c > top) top = c;
      this._trails(gen, chunk, blocks, cx, cz, d, s0);
    }
    if (top >= 0) this._evict(chunk, cx, cz);
    return top;
  }

  // ---- Wayside crofts ------------------------------------------------------
  // A lone cottage set back from the verge, at rare intervals. Rare is the
  // point: a house every time you blink turns an arterial into a ribbon
  // development, and the road should read as running THROUGH country that is
  // mostly empty. So sites are offered every CROFT_SPACING and most are refused.
  //
  // Chunk-local by construction. The site, its floor level and every block are
  // pure functions of (seed, dir, n) — the floor comes from `gen.heightAt` at the
  // hearth column, never from anything this chunk happens to know — so each chunk
  // writes its own slice and the union is one coherent building however the
  // chunks load.
  _crofts(gen, chunk, blocks, cx, cz, d, sLo, sHi) {
    let top = -1;
    const first = Math.ceil(sLo / CROFT_SPACING), last = Math.floor(sHi / CROFT_SPACING);
    for (let n = first; n <= last; n++) {
      const s = n * CROFT_SPACING;
      if (s < CROFT_START) continue;
      if (hash2(gen.seed + S_CROFT, n, d) > CROFT_CHANCE) continue;   // most sites stay empty
      if (this._blocked(gen, ...this.column(gen, d, s, 0, this._col), 15)) continue;
      const side = hash2(gen.seed + S_CROFT_SIDE, n, d) < 0.5 ? 1 : -1;
      const y = this._croft(gen, chunk, blocks, cx, cz, d, s, side, n);
      if (y > top) top = y;
    }
    return top;
  }

  _croft(gen, chunk, blocks, cx, cz, d, s, side, n) {
    // Anchor: the hearth corner, set back from the lane so the verge stays clear.
    const a = this.column(gen, d, s, CROFT_OFFSET * side, this._col);
    const ax = a[0], az = a[1];
    const fy = gen.heightAt(ax, az);
    if (fy <= SEA + 1 || fy > H_HI - 8) return -1;                    // not on a beach or a crag
    const r = (v) => hash2(gen.seed + S_CROFT_ART, n * 31 + v, d);
    const W = 3 + ((r(1) * 2) | 0), D = 3 + ((r(2) * 2) | 0);         // 3-4 half-extents
    const wallH = 4;
    const timber = r(3) < 0.5 ? B.oak_log : B.cedar_log;
    const infill = r(4) < 0.5 ? B.stone_brick : B.timber_wall;
    const roofId = r(5) < 0.6 ? B.thatch : B.planks;
    const doorId = r(6) < 0.5 ? B.oak_door : B.birch_door;
    const doorTop = doorId === B.oak_door ? B.oak_door_top : B.birch_door_top;
    // The door faces the road, so the lane it serves is the way you go in.
    const inX = Math.sign(this.column(gen, d, s, 0, this._col2)[0] - ax);
    const inZ = Math.sign(this._col2[1] - az);

    const step = CHUNK * CHUNK;
    let top = -1;
    const put = (x, y, z, id) => {
      const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 1 || y >= WORLD_H) return;
      blocks[(y * CHUNK + lz) * CHUNK + lx] = id;
      if (id !== B.air && y > top) top = y;
    };

    for (let x = ax - W; x <= ax + W; x++) {
      for (let z = az - D; z <= az + D; z++) {
        const edge = x === ax - W || x === ax + W || z === az - D || z === az + D;
        // A pad: fill under it so it never stands on air, clear over it so it is
        // never buried, both only as far as the site actually needs.
        for (let y = fy - 3; y < fy; y++) put(x, y, z, B.dirt);
        put(x, fy - 1, z, B.cobble);
        for (let y = fy; y <= fy + wallH + Math.max(W, D) + 1; y++) put(x, y, z, B.air);
        put(x, fy, z, edge ? B.cobble : B.planks);                    // plinth course / floor
        if (!edge) continue;
        const corner = (x === ax - W || x === ax + W) && (z === az - D || z === az + D);
        for (let y = fy + 1; y <= fy + wallH; y++) put(x, y, z, corner ? timber : infill);
        if (!corner && ((x + z) & 1) === 0) put(x, fy + 2, z, B.glasspane);   // a window or two
      }
    }
    // Gable roof, ridge along the long axis, with an eave a block proud.
    const along = W >= D;
    const half = along ? D : W;
    for (let k = 0; k <= half + 1; k++) {
      const y = fy + wallH + 1 + k;
      for (let x = ax - W - 1; x <= ax + W + 1; x++) {
        for (let z = az - D - 1; z <= az + D + 1; z++) {
          const off = along ? Math.abs(z - az) : Math.abs(x - ax);
          if (off !== half + 1 - k) continue;
          put(x, y, z, roofId);
        }
      }
    }
    for (let x = ax - (along ? W : 0); x <= ax + (along ? W : 0); x++) {
      for (let z = az - (along ? 0 : D); z <= az + (along ? 0 : D); z++) put(x, fy + wallH + 2 + half, z, roofId);
    }
    // The way in: a two-block door in the wall that faces the lane.
    const dxc = inX !== 0 ? ax + inX * W : ax;
    const dzc = inZ !== 0 ? az + inZ * D : az;
    put(dxc, fy + 1, dzc, doorId);
    put(dxc, fy + 2, dzc, doorTop);
    // A hearth inside and a lantern at the door, so it reads as lived in.
    put(ax, fy + 1, az, B.campfire);
    put(dxc - inX, fy + 3, dzc - inZ, B.sea_lantern);
    return top;
  }

  // ---- Trails ---------------------------------------------------------------
  // "Some endless, some not": the forks run forever, these do not. A trail leaves
  // a road, wanders a few hundred blocks and stops — it goes somewhere in the
  // sense that walking it takes you off the network and into country.
  //
  // Chunk-local the same way the crofts are: a bounded window of candidate
  // origins along the parent road, each a pure function of (seed, parent, k), and
  // each chunk paints only the slice of the route that falls inside it. Because a
  // trail is a surface treatment and not a regrade, two chunks painting the same
  // trail cannot disagree about its height — there is no height to agree on.
  _trails(gen, chunk, blocks, cx, cz, d, sChunk) {
    const reach = TRAIL_MAX + CHUNK_R;
    const first = Math.ceil((sChunk - reach) / TRAIL_SPACING);
    const last = Math.floor((sChunk + reach) / TRAIL_SPACING);
    for (let k = first; k <= last; k++) {
      const sOrigin = k * TRAIL_SPACING;
      if (sOrigin < TRAIL_START + RC_START[d]) continue;
      if (hash2(gen.seed + S_TRAIL, k, d) > TRAIL_CHANCE) continue;
      this._trail(gen, chunk, blocks, cx, cz, d, k, sOrigin);
    }
  }

  _trail(gen, chunk, blocks, cx, cz, d, k, sOrigin) {
    // Frame: origin on the parent's centre line, bearing turned well off it so a
    // trail reads as leaving rather than paralleling.
    const o = this.column(gen, d, sOrigin, 0, this._col);
    const ox = o[0], oz = o[1];
    const side = hash2(gen.seed + S_TRAIL_W, k, d) < 0.5 ? 1 : -1;
    const turn = 0.9 + hash2(gen.seed + S_TRAIL_TURN, k, d) * 0.7;      // 51-92 degrees
    const th = Math.atan2(U[d * 2 + 1], U[d * 2]) + side * turn;
    const vx = Math.cos(th), vz = Math.sin(th);
    const len = TRAIL_MIN + hash2(gen.seed + S_TRAIL_LEN, k, d) * (TRAIL_MAX - TRAIL_MIN);

    // Clip to the s-range this chunk can possibly hold, so a long trail costs the
    // same per chunk as a short one.
    const ccx = cx * CHUNK + 7.5, ccz = cz * CHUNK + 7.5;
    const sMid = (ccx - ox) * vx + (ccz - oz) * vz;
    let sA = sMid - CHUNK_R - TRAIL_HW - 1, sB = sMid + CHUNK_R + TRAIL_HW + 1;
    if (sA < 0) sA = 0;
    if (sB > len) sB = len;
    if (sA > sB) return;

    const step = CHUNK * CHUNK;
    for (let sv = sA; sv <= sB; sv += 0.5) {
      // The trail wanders too, on its own stream, and fades out at its far end.
      const wob = (valueNoise2(gen.seed + S_TRAIL + k, sv / 26, 2.5) - 0.5) * 5;
      const fade = sv > len - 24 ? (len - sv) / 24 : 1;                 // it peters out
      const px = ox + vx * sv - vz * wob, pz = oz + vz * sv + vx * wob;
      for (let a = -1; a <= 1; a++) {
        const qx = Math.round(px - vz * a * TRAIL_HW), qz = Math.round(pz + vx * a * TRAIL_HW);
        const lx = qx - cx * CHUNK, lz = qz - cz * CHUNK;
        if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK) continue;
        const li = lz * CHUNK + lx;
        if (this._mask[li]) continue;                                   // a road already owns it
        if (this._blocked(gen, qx, qz, this._near)) continue;
        if (hash2(gen.seed + S_TRAIL_W + k, qx, qz) > fade * 0.9) continue;  // ragged, thinning
        const y = chunk.surfaceH[li];
        if (y <= SEA) continue;                                         // no trails across water
        const i = li + y * step;
        const cur = blocks[i];
        if (cur === B.water || !isSolid(cur)) continue;
        blocks[i] = hash2(gen.seed + S_PAVE, qx, qz) < 0.25 ? B.gravel : B.dirt;
        blocks[i + step] = B.air;                                       // scuff the grass off it
      }
    }
  }

  _boxNear(x0, z0, px, pz, r) {
    const dx = px < x0 ? x0 - px : px > x0 + CHUNK ? px - x0 - CHUNK : 0;
    const dz = pz < z0 ? z0 - pz : pz > z0 + CHUNK ? pz - z0 - CHUNK : 0;
    return dx * dx + dz * dz < r * r;
  }

  _carveDir(gen, chunk, blocks, cx, cz, d, setFacing) {
    const ux = U[d * 2], uz = U[d * 2 + 1];
    const seed = gen.seed;
    const s0f = this._s0[d], t0f = this._t0[d];
    const ampCap = RC_AMP[d], gradeHW = RC_GRADE[d];
    const mask = this._mask, roadY = this._roadY;
    let top = -1;
    for (let lz = 0; lz < CHUNK; lz++) {
      const wz = cz * CHUNK + lz;
      for (let lx = 0; lx < CHUNK; lx++) {
        const wx = cx * CHUNK + lx;
        const s = wx * ux + wz * uz - s0f;
        if (s < RC_START[d]) continue;
        const t = wx * -uz + wz * ux - t0f;
        // Cheap bound before touching noise: |wander| can never exceed amp(s).
        let amp = s * AMP_GROW;
        if (amp > ampCap) amp = ampCap;
        const ta = t < 0 ? -t : t;
        if (ta > amp + gradeHW) continue;
        const off = t - this.wander(seed, d, s);
        const a = off < 0 ? -off : off;
        if (a > gradeHW) continue;
        const li = lz * CHUNK + lx;
        if (mask[li]) continue;              // another arterial already owns it
        if (this._blocked(gen, wx, wz, this._near)) continue;

        const hNat = chunk.surfaceH[li];
        // A bridge is exactly as wide as its deck. It has no graded shoulder, so
        // it must not CLAIM the columns either side either — a claimed column
        // records a road surface in chunk.surfaceH, and out over water there is
        // no surface there to record.
        if (hNat < SEA && a > BRIDGE_HW) continue;

        const y = this.gradeAt(s);
        mask[li] = 1; roadY[li] = y;
        chunk.surfaceH[li] = y;
        const t2 = this._paveColumn(blocks, seed, d, s, wx, wz, lx, lz, a, y, hNat, setFacing);
        if (t2 > top) top = t2;
      }
    }
    return top;
  }

  // One column: cut or fill to the graded height, then dress the surface.
  _paveColumn(blocks, seed, d, s, wx, wz, lx, lz, a, y, hNat, setFacing) {
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
    // A bridge is CARPENTRY, not earthwork, so it gets none of the road's
    // irregularity: a fixed deck width and no ragged edge. The wobble and the
    // dropped outer cells are what make a laid stone lane look laid, but on a
    // span they broke the deck's outline into a wavy edge and left the handrail
    // as a scatter of disconnected posts instead of one run of fence.
    const wob = d < PRIMARIES ? EDGE_WOBBLE : EDGE_WOBBLE * 0.5;   // a lane is a thinner thing
    const coreEdge = bridge ? BRIDGE_HW - 1
      : RC_CORE[d] + (valueNoise2(seed + S_EDGE_CORE + d * DIR_SALT, s / 11, 1.5) - 0.5) * wob;
    const vergeEdge = bridge ? BRIDGE_HW
      : RC_VERGE[d] + (valueNoise2(seed + S_EDGE_VERGE + d * DIR_SALT, s / 17, 6.5) - 0.5) * wob;
    let paved = a <= vergeEdge;
    if (paved && !bridge && a > vergeEdge - 0.55 && hash2(seed + S_RAGGED, wx, wz) < EDGE_RAGGED) paved = false;

    let surf;
    if (!paved) {
      // Graded shoulder. On a cut the block already sitting there IS the biome's
      // own subsoil, which is exactly what a fresh cutting exposes — so it only
      // needs a face where there is nothing to expose: fresh fill, or a cave
      // mouth the grade happened to open right beside the lane.
      // No shoulder anywhere near water. A bridge has nothing out there to grade,
      // and laying the usual dirt face hung soil in the air beside the deck — but
      // the visible problem was at the bridge ENDS. There the centre line steps
      // back above the waterline, so the deck stops and the ordinary road
      // cross-section resumes instantly, wrapping a dirt collar around the end of
      // the span hard against the timber. A shoreline is not a cutting and has no
      // face to expose, so leave the beach or the bank showing instead.
      // Out over water there is nothing to grade, so a bridge gets no shoulder at
      // all. Elsewhere the shoulder is LOAD-BEARING wherever the road was graded
      // up: skip it and the lane has a hole beside it. So near the waterline it
      // becomes beach sand rather than dirt — the fill is still there, but it
      // reads as the shore the bridge lands on instead of a dirt collar wrapped
      // round the end of the span.
      surf = bridge || isSolid(blocks[base + y * step]) ? 0 : (hNat <= SEA + 2 ? B.sand : B.dirt);
    } else if (a <= coreEdge) {
      const r = hash2(seed + S_PAVE, wx, wz);
      surf = bridge ? B.planks
        : d >= PRIMARIES ? (r < 0.22 ? B.cobble : r < 0.30 ? B.mossy_cobble : B.gravel)   // a gravel byway
          : r < 0.09 ? B.gravel : r < 0.18 ? B.mossy_cobble : r < 0.24 ? B.stone : B.cobble;
    } else {
      const r = hash2(seed + S_PAVE, wx, wz);
      // The verge's 5% dirt becomes sand near the waterline for the same reason as
      // the shoulder: beside a bridge a single dirt cell reads as soil on the deck.
      surf = bridge ? B.planks : r < 0.12 ? B.cobble
        : r < 0.17 ? (hNat <= SEA + 2 ? B.sand : B.dirt) : B.gravel;
    }
    // Where the road climbs, build the riser AS A STEP. The grade rises a block
    // roughly every 14 blocks walked, and only stairs and slabs are walkable
    // steps (World.isStep) — as plain cobble cubes those rises meant jumping the
    // whole way along a road. `facing` points uphill because a stair's raised
    // half sits on its facing side, so you meet the low half first.
    // Only the CORE gets risers — that is the width you actually walk — and a
    // riser is always a stair even where the paving roll picked gravel, which has
    // no stair variant. Leaving those flat left roughly one unjumpable kerb in
    // ten on the lane, which defeats the point.
    if (surf && !bridge && setFacing && a <= coreEdge && y > this.gradeAt(s - 1)) {
      blocks[base + y * step] = STEP_OF[surf] ?? B.cobble_stairs;
      setFacing(wx, y, wz, UPHILL_FACE[d]);
      return y;
    }
    if (surf) blocks[base + y * step] = surf;

    if (bridge && paved) {
      // A timber trestle, not a stone causeway: plank deck, fenced handrails
      // down both edges so you cannot walk off it in the dark, and piles driven
      // to the bed every few blocks so the span is visibly carried rather than
      // floating on the water.
      // The handrail is the OUTERMOST deck column on each side, every column of
      // the span, so it comes out as one continuous run of fence rather than
      // posts wherever the edge happened to fall.
      if (a > BRIDGE_HW - 1) {
        blocks[base + (y + 1) * step] = B.planks_fence;
        return y + 1;
      }
      // Piles under the outer deck, on a regular bent spacing along the span.
      if (a > coreEdge && (((s % BRIDGE_BENT) + BRIDGE_BENT) % BRIDGE_BENT) === 0) {
        for (let yy = y - 1; yy > hNat && yy > y - BED_MAX; yy--) {
          const i = base + yy * step;
          if (!isSolid(blocks[i]) || blocks[i] === B.water) blocks[i] = B.oak_log;
        }
      }
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
      if (s < RC_START[d]) continue;
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
    this._frame(gen);
    for (let d = 0; d < ARTERIALS; d++) {
      const s = alongOf(d, x, z) - this._s0[d];
      if (s < RC_START[d]) continue;
      const t = acrossOf(d, x, z) - this._t0[d];
      let amp = s * AMP_GROW;
      if (amp > RC_AMP[d]) amp = RC_AMP[d];
      if ((t < 0 ? -t : t) > amp + RC_GRADE[d]) continue;
      const off = t - this.wander(gen.seed, d, s);
      const a = off < 0 ? -off : off;
      if (a > RC_GRADE[d]) continue;
      // Over water the road is a bridge, and a bridge is only its deck — no
      // graded shoulder. This has to agree with the carve (see `_carveDir`) or
      // callers get told a column is road when nothing was built on it: a
      // waystone would try to stand on open water, and surfaceH would be asked
      // to report a road height for a column the span never touched.
      if (a > BRIDGE_HW && gen.heightAt(x, z) < SEA) continue;
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
export function carveRoads(gen, chunk, blocks, cx, cz, setFacing) {
  return roadsFor(gen).carve(gen, chunk, blocks, cx, cz, setFacing);
}
