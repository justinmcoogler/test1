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
//
// Everything BESIDE the road obeys the same contract, and it is the one thing to
// keep in mind when adding to this file. A waystone, a wayside croft and the site
// at the end of a trail are each a pure function of (seed, road, station index):
// where they stand, what level their floor is, and every block in them. No chunk
// ever asks a neighbour anything, so each writes its own slice and the union is
// one coherent building however the chunks load. `_croft` is the worked example —
// note that its floor comes from `gen.heightAt` at its anchor and never from
// what one chunk happens to have generated.
//
// TWO limits worth knowing about, because they are not this module's to fix:
//
//   * NPCs. A croft's obvious occupant is a person, but villagers only exist in
//     the hand-built `world.structure.npcs` list (js/main.js reads that and
//     nothing else), and the per-chunk sink this pass is handed carries blocks,
//     nodes and spawns. So a croft gets livestock in the yard instead.
//   * CHEST LOOT. Same shape of problem: chest contents live in `world.chestMeta`,
//     which no sink here reaches. `carve` takes an OPTIONAL `chestSink` for it —
//     hand it the same {id,x,y,z,loot} sink stampChunkStructures already gets and
//     the kists fill themselves; without it they are ordinary empty chests.
import { B, isSolid } from './blocks.js';
import { CHUNK, WORLD_H, SEA, MANOR_PAD, LEARN_MEADOW, FROST_CAMP } from './worldgen.js';
import { valueNoise2 } from '../core/noise.js';
import { hash2 } from '../core/rng.js';
// The surface footprint of a mineshaft headframe / dungeon stair. Imported from
// the two leaf modules rather than through structures.js so nothing here can
// reach back round into worldgen's hand-built content. Roadside BUILDINGS have
// to consult it: those sites stamp AFTER this pass (js/world/world.js), so a
// cottage that shared ground with a headframe got a plank frame driven through
// its doorway and came out sealed.
import { mineshaftClaims } from './mineshaft.js';
import { dungeonClaims } from './dungeon.js';

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

// Rare landmarks, not roadside furniture: far enough apart that meeting one is
// an event and close enough that a road always eventually delivers you to the
// next. At 1024 there is one roughly every quarter hour of walking.
export const WAYSTONE_SPACING = 1024;
const WS_OFFSET = 2.7;      // the signpost and bench sit on the verge, off the lane
// The standing stone stands back further than the furniture does, so its broad
// base course never intrudes on the paved core you actually walk (coreEdge tops
// out near 2.1, and the base reaches one block inboard of WS_STONE).
const WS_STONE = 4.2;
// The stone's own CENTRE column, course by course from the road surface upward:
// the middle of the broad base, then the body, then the crown. Banded mossy/clean
// rather than a smooth run — an unbroken pillar reads as scenery, alternating
// courses read as a stone somebody dressed. The lantern sits under the capstone
// so the glow spills sideways and you can find the thing at night.
//
// This is the column js/game/waystones.js matches on to decide "that is a
// waystone", so it is the stone's identity and must not drift. The WIDTH of each
// course is a separate matter — see WS_WING.
export const WAYSTONE_COURSES = [
  B.cobble, B.stone_brick, B.mossy_stone_brick, B.stone_brick,
  B.mossy_stone_brick, B.stone_brick, B.sea_lantern, B.stone_brick_slab,
];
const WS_SHAFT = WAYSTONE_COURSES;
// A menhir is a SLAB, not a post. The first cut of this stone was one block
// square for its whole height, and at a 1:6 aspect it read from the road as a
// chimney — the silhouette of a lamp-post, not a standing stone. Real standing
// stones are broad across one axis and roughly a hand thick through the other,
// which is also the shape that reads best here: the road brings you at the flat
// of it, so you meet a face rather than an edge.
//
// So the body courses get wings, WS_WING blocks either side, along the road's
// ACROSS axis only. The centre column is untouched, which is what keeps the
// identity above intact; the crown (lantern and capstone) stays one wide so the
// stone still tapers to a point against the sky.
const WS_WING = 1;
const WS_BODY0 = 3, WS_BODY1 = 6;   // course range that gets wings, road-surface relative
const WS_TOP = WS_SHAFT.length + 1;       // courses above the road surface
const WS_FOOT = 8;          // deepest the base course will reach for solid ground
const WS_YARD = 3;          // columns round the stone kept clear of trees
// How far ALONG the route one waystone reaches: its yard is WS_YARD wide, the
// signpost stands at s+3 and the bench runs s-1..s+1.
const WS_REACH = WS_YARD + 4;
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
// CROFT_SPAN is the widest a cottage plus its eaves reaches from its anchor.
// CROFT_OFFSET has to leave room for the doorstep: the cottage's apron reaches
// W+1 (≤5) toward the lane and the stepped path off its threshold another
// CROFT_RAMP, and none of that may land inside the graded corridor (GRADE_HW).
const CROFT_SPACING = 190, CROFT_CHANCE = 0.28, CROFT_START = 260;
const CROFT_OFFSET = 15, CROFT_REACH = 22, CROFT_SPAN = 7;
const CROFT_RAMP = 4;       // treads of the path off the threshold
const CROFT_FOOT = 8;       // deepest a tread will reach for solid ground
// Two crofts nearer than this destroy each other: building one levels a tall air
// column over its whole footprint, so an overlapping neighbour loses its walls.
// Sites are offered independently per road, and a fork runs close to its parent
// for a while after it leaves, so collisions are not hypothetical.
const CROFT_APART = 18;
const S_CROFT = 6101, S_CROFT_SIDE = 6203, S_CROFT_ART = 6301, S_CROFT_KIT = 6407;
// Finite TRAILS. Unlike a road, a trail does no earthworks: it is a worn line
// over whatever ground is already there, so it needs no height profile, makes no
// ≤1-step promise of its own beyond the terrain's, and never claims a column in
// the road mask. That is also what a trail IS — a footpath, not a lane — and it
// keeps them cheap enough to be common.
const TRAIL_SPACING = 120, TRAIL_CHANCE = 0.55, TRAIL_START = 150;
const TRAIL_MIN = 90, TRAIL_MAX = 240;    // how far a trail runs before it peters out
const TRAIL_HW = 1.15;                    // half-width of the worn line
const S_TRAIL = 7101, S_TRAIL_LEN = 7207, S_TRAIL_TURN = 7309, S_TRAIL_W = 7411;
// A trail LEADS somewhere: a fraction of them end at a small hand-crafted site.
// SITE_SPAN is the half-extent of the largest one, so it also bounds how far past
// the trail's own end a chunk has to look.
const SITE_CHANCE = 0.42, SITE_SPAN = 4, SITE_KINDS = 3;
const S_SITE = 7507, S_SITE_ART = 7603;
// How far off a road its features can possibly land — the bound the roadside pass
// rejects on. A trail (and now the site at the end of it) dominates it.
//
// The 1.05 factor is the bit that is easy to get wrong, and the old bound did:
// the reject compares the CHUNK's lateral distance against amp(s_chunk), but the
// trail's own wander was sampled at its ORIGIN, which can be up to len·cos(turn)
// further along the route. amp is 0.3-Lipschitz in s, so a trail contributes at
// most len·(AMP_GROW·cos θ + sin θ) ≤ 1.045·len of extra lateral reach over the
// chunk's own amp. Using len alone let a chunk holding the far end of a sharply
// turned trail be rejected before the trail pass could run, which silently
// truncated the trail — and would have chopped its destination in half.
const FEATURE_REACH = Math.max(CROFT_OFFSET + CROFT_SPAN,
  TRAIL_MAX * 1.05 + TRAIL_HW + SITE_SPAN + 8);
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
    // 1 = a roadside STRUCTURE owns this column (a croft's pad, a waystone's
    // footing, the site at the end of a trail). Separate from _mask because these
    // are not lane: nothing may pave them and nothing reports a road height for
    // them. What they do share is that the scatter pass ran before them, so
    // whatever it seeded here has to be dropped — see _evict.
    this._built = new Uint8Array(CHUNK * CHUNK);
    this._dirs = new Int32Array(ARTERIALS);       // arterials this chunk must carve
    this._fdirs = new Int32Array(ARTERIALS);      // …and those whose ROADSIDE features reach it
    this._col = new Int32Array(2);       // column-coordinate out-param
    this._col2 = new Int32Array(2);      // second out-param, for a croft's door bearing
    this._col3 = new Int32Array(2);      // third, for comparing rival croft sites
    // One reused record for "everything about the croft at (road, station)".
    // The builder and the public query both read it, so a test can never be
    // looking at a cottage different from the one that got built.
    this._plan = {
      dir: -1, n: 0, s: 0, side: 1, ax: 0, az: 0, fy: 0, W: 0, D: 0, wallH: 4,
      inX: 0, inZ: 0, doorX: 0, doorZ: 0, stepX: 0, stepZ: 0,
      nx: 0, nz: 0, gx: 0, gz: 0, dn: 0, dg: 0,
      ix0: 0, ix1: 0, iz0: 0, iz1: 0, chestX: 0, chestZ: 0, chestY: 0, chestV: 1,
      timber: 0, infill: 0, roofId: 0, doorId: 0, doorTop: 0,
    };
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
    this._tf = { ox: 0, oz: 0, vx: 0, vz: 0, len: 0 };   // one trail's frame
    this._krange = new Int32Array(2);     // trail-station index range
    this._site = { dir: -1, k: 0, x: 0, z: 0, y: 0, kind: 0 };   // one trail's destination
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
  carve(gen, chunk, blocks, cx, cz, setFacing, chestSink = null) {
    const ccx = cx * CHUNK + 7.5, ccz = cz * CHUNK + 7.5;
    // Coarse reject first: eight scalar tests decide whether this chunk can hold
    // any arterial at all. Nearly every chunk in the world leaves here.
    this._frame(gen);
    // TWO rejects, because a road and the things beside it have very different
    // lateral reach. The carve only touches its own corridor; a croft stands
    // CROFT_OFFSET back from the verge and a trail runs TRAIL_MAX blocks away at
    // right angles. Sharing one bound truncated both: a chunk holding the far half
    // of a cottage was rejected before the croft pass could run, so cottages came
    // out as a couple of corner posts with no walls and no door, and a trail was
    // clipped to the few chunks that happened to hug the road.
    const dirs = this._dirs, fdirs = this._fdirs;
    let nd = 0, nf = 0;
    for (let d = 0; d < ARTERIALS; d++) {
      const ux = U[d * 2], uz = U[d * 2 + 1];
      const s0 = ccx * ux + ccz * uz - this._s0[d];
      if (s0 + CHUNK_R + TRAIL_MAX + SITE_SPAN < RC_START[d]) continue;
      const t0 = ccx * -uz + ccz * ux - this._t0[d];
      let amp = (s0 + CHUNK_R) * AMP_GROW;
      if (amp > RC_AMP[d]) amp = RC_AMP[d];
      const ta = t0 < 0 ? -t0 : t0;
      if (ta > amp + FEATURE_REACH + CHUNK_R) continue;
      fdirs[nf++] = d;
      if (s0 + CHUNK_R < RC_START[d]) continue;
      if (ta > amp + RC_GRADE[d] + CHUNK_R) continue;
      dirs[nd++] = d;
    }
    if (nd === 0 && nf === 0) return -1;

    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    this._near = 0;
    if (this._boxNear(x0, z0, MANOR_PAD.x, MANOR_PAD.z, 34)) this._near |= 1;
    if (this._boxNear(x0, z0, LEARN_MEADOW.x, LEARN_MEADOW.z, 34)) this._near |= 2;
    if (this._boxNear(x0, z0, FROST_CAMP.x, FROST_CAMP.z, 76)) this._near |= 4;
    const tb = this._trunkBox(gen);
    if (x0 + CHUNK > tb[0] - 2 && x0 < tb[1] + 2 && z0 + CHUNK > tb[2] - 2 && z0 < tb[3] + 2) this._near |= 8;

    this._mask.fill(0);
    this._built.fill(0);
    let top = -1;
    for (let i = 0; i < nd; i++) {
      const d = dirs[i];
      const ux = U[d * 2], uz = U[d * 2 + 1];
      const s0 = ccx * ux + ccz * uz - this._s0[d];
      // Widened by the waystone reach so one window serves both passes.
      this.window(gen, d, Math.max(RC_START[d] - 1, s0 - CHUNK_R - 8), s0 + CHUNK_R + 8);
      const y = this._carveDir(gen, chunk, blocks, cx, cz, d, setFacing);
      if (y > top) top = y;
    }
    // Roadside features run AFTER every carve, so `_mask` is the complete road
    // footprint by the time a trail asks whether a cell is already lane — and so
    // a waystone's signpost sees every direction's paving, not just its own.
    //
    // BUILDINGS before FOOTPATHS, in two separate passes over the directions
    // rather than one. A trail is allowed to run up to a structure and stop, so it
    // has to see the complete `_built` footprint; interleaving the two passes
    // would have made "did a trail scuff this cottage floor" depend on which
    // directions happened to be in this chunk's list, which is the one thing a
    // chunk-local generator may never do.
    for (let i = 0; i < nf; i++) {
      const d = fdirs[i];
      const s0 = ccx * U[d * 2] + ccz * U[d * 2 + 1] - this._s0[d];
      if (d < PRIMARIES) {   // waystones mark the trunk network, not the lanes
        const w = this._waystones(gen, blocks, cx, cz, d, s0 - CHUNK_R - WS_REACH, s0 + CHUNK_R + WS_REACH);
        if (w > top) top = w;
      }
      const c = this._crofts(gen, chunk, blocks, cx, cz, d, s0 - CHUNK_R - CROFT_REACH,
        s0 + CHUNK_R + CROFT_REACH, setFacing, chestSink);
      if (c > top) top = c;
      const e = this._trailEnds(gen, blocks, cx, cz, d, s0);
      if (e > top) top = e;
    }
    for (let i = 0; i < nf; i++) {
      const d = fdirs[i];
      this._trails(gen, chunk, blocks, cx, cz, d, ccx * U[d * 2] + ccz * U[d * 2 + 1] - this._s0[d]);
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
  _crofts(gen, chunk, blocks, cx, cz, d, sLo, sHi, setFacing, chestSink) {
    let top = -1;
    const first = Math.ceil(sLo / CROFT_SPACING), last = Math.floor(sHi / CROFT_SPACING);
    for (let n = first; n <= last; n++) {
      if (!this._croftPlan(gen, d, n)) continue;
      const y = this._croft(gen, chunk, blocks, cx, cz, setFacing, chestSink);
      if (y > top) top = y;
    }
    return top;
  }

  // Everything about one croft that is a pure function of (seed, road, station):
  // whether it exists at all, where it stands, its floor, its size, its
  // materials, its doorway, the cell you step into from that doorway and where
  // the kist sits. Filled into a reusable record; returns it, or null where no
  // cottage stands there.
  //
  // The builder and the public `croftPlan` query both go through here, so a
  // caller can never be looking at a cottage different from the one that got
  // built — which is what makes the enterability test in tests/unit/roads.test.mjs
  // a test of the real thing.
  _croftPlan(gen, d, n) {
    const s = n * CROFT_SPACING;
    if (s < CROFT_START) return null;
    if (hash2(gen.seed + S_CROFT, n, d) > CROFT_CHANCE) return null;   // most sites stay empty
    const road = this.column(gen, d, s, 0, this._col2);
    const rx = road[0], rz = road[1];
    if (this._blocked(gen, rx, rz, 15)) return null;
    const side = hash2(gen.seed + S_CROFT_SIDE, n, d) < 0.5 ? 1 : -1;
    const a = this.column(gen, d, s, CROFT_OFFSET * side, this._col);
    const ax = a[0], az = a[1];
    if (!this._croftWins(gen, d, n, ax, az)) return null;
    const fy = gen.heightAt(ax, az);
    if (fy <= SEA + 1 || fy > H_HI - 8) return null;                   // not on a beach or a crag
    if (this._siteTaken(gen, ax, az, CROFT_SPAN)) return null;         // a shaft head has this ground

    const p = this._plan;
    const r = (v) => hash2(gen.seed + S_CROFT_ART, n * 31 + v, d);
    p.dir = d; p.n = n; p.s = s; p.side = side; p.ax = ax; p.az = az; p.fy = fy;
    p.W = 3 + ((r(1) * 2) | 0); p.D = 3 + ((r(2) * 2) | 0);            // 3-4 half-extents
    p.wallH = 4;
    p.timber = r(3) < 0.5 ? B.oak_log : B.cedar_log;
    p.infill = r(4) < 0.5 ? B.stone_brick : B.timber_wall;
    p.roofId = r(5) < 0.6 ? B.thatch : B.planks;
    p.doorId = r(6) < 0.5 ? B.oak_door : B.birch_door;
    p.doorTop = p.doorId === B.oak_door ? B.oak_door_top : B.birch_door_top;
    // The door faces the road, so the lane it serves is the way you go in — but
    // it goes in ONE wall, the one more squarely turned to the lane. On a diagonal
    // road both bearings are non-zero, and taking both put the doorway on the
    // building's CORNER: a corner cell's four neighbours are two wall cells and
    // two apron cells, so the hole opened onto the yard and touched no interior
    // cell at all. Every cottage on a diagonal arterial was sealed.
    const bx = rx - ax, bz = rz - az;
    p.inX = Math.abs(bx) >= Math.abs(bz) ? Math.sign(bx) : 0;
    p.inZ = p.inX !== 0 ? 0 : Math.sign(bz);
    p.doorX = ax + p.inX * p.W; p.doorZ = az + p.inZ * p.D;
    // The cell you land in once you are through the doorway. Everything the
    // furniture pass places keeps clear of it and its neighbours.
    p.stepX = p.doorX - p.inX; p.stepZ = p.doorZ - p.inZ;
    p.ix0 = ax - p.W + 1; p.ix1 = ax + p.W - 1;
    p.iz0 = az - p.D + 1; p.iz1 = az + p.D - 1;
    // The room in door-relative axes: `n` points from the doorway into the room,
    // `g` runs across it. Everything inside is laid out in these, which is what
    // makes one layout work for all four door bearings and all four room sizes.
    p.nx = -p.inX; p.nz = -p.inZ;
    p.gx = p.inX !== 0 ? 0 : 1; p.gz = p.inX !== 0 ? 1 : 0;
    p.dn = p.inX !== 0 ? p.W - 1 : p.D - 1;      // interior half-depth, door to back wall
    p.dg = p.inX !== 0 ? p.D - 1 : p.W - 1;      // interior half-width, wall to wall
    // The kist stands against the back wall, ONE cell off centre. Off centre so
    // it is not in the way of the hearth, and not in a corner because a corner
    // cell's only free neighbours are other wall cells — a chest that can get
    // walled in by its own neighbours is furniture, not storage.
    const kv = r(8) < 0.5 ? -1 : 1;
    p.chestX = ax + p.nx * p.dn + p.gx * kv;
    p.chestZ = az + p.nz * p.dn + p.gz * kv;
    p.chestY = fy + 1;
    p.chestV = kv;
    return p;
  }

  // Public: the n-th croft on road `dir`, or null. Returns a REUSED record —
  // copy what you need out of it before touching this Roads instance again.
  croftPlan(gen, dir, n) { this._frame(gen); return this._croftPlan(gen, dir, n); }

  // Does this site beat every rival close enough to wreck it? Sites are totally
  // ordered by (road, station), the test is symmetric, and every term is a pure
  // function of the seed — so exactly one of any colliding pair builds, and every
  // chunk that touches it agrees which one that is.
  _croftWins(gen, d, n, ax, az) {
    const key = d * 4096 + n;
    for (let od = 0; od < ARTERIALS; od++) {
      for (let on = n - 2; on <= n + 2; on++) {
        if (od * 4096 + on >= key) continue;
        const os = on * CROFT_SPACING;
        if (os < CROFT_START + RC_START[od]) continue;
        if (hash2(gen.seed + S_CROFT, on, od) > CROFT_CHANCE) continue;
        const oside = hash2(gen.seed + S_CROFT_SIDE, on, od) < 0.5 ? 1 : -1;
        const oc = this.column(gen, od, os, CROFT_OFFSET * oside, this._col3);
        if (Math.abs(oc[0] - ax) < CROFT_APART && Math.abs(oc[1] - az) < CROFT_APART) return false;
      }
    }
    return true;
  }

  _croft(gen, chunk, blocks, cx, cz, setFacing, chestSink) {
    const p = this._plan;
    const d = p.dir, n = p.n, ax = p.ax, az = p.az, fy = p.fy;
    const W = p.W, D = p.D, wallH = p.wallH;
    const inX = p.inX, inZ = p.inZ, dxc = p.doorX, dzc = p.doorZ;
    const r = (v) => hash2(gen.seed + S_CROFT_ART, n * 31 + v, d);

    let top = -1;
    const put = (x, y, z, id) => {
      const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 1 || y >= WORLD_H) return;
      blocks[(y * CHUNK + lz) * CHUNK + lx] = id;
      if (id !== B.air && y > top) top = y;
    };

    // The YARD: claimed, but nothing built on it. It reaches two rings beyond the
    // eaves, and further on the door side to cover the whole stepped path, because
    // a tree's canopy spreads two columns and LEAVES ARE SOLID in this world. A
    // pine rooted two cells off the apron therefore dropped a solid canopy across
    // the doorstep, and a cottage with a perfectly good door became one you could
    // not stand in front of. Claiming the trunk columns is what stops it: nodes on
    // a claimed column are dropped before they are ever stamped (see _evict).
    const gap = CROFT_RAMP + 3;
    const yx0 = ax - W - 3 - (inX < 0 ? gap : 0), yx1 = ax + W + 3 + (inX > 0 ? gap : 0);
    const yz0 = az - D - 3 - (inZ < 0 ? gap : 0), yz1 = az + D + 3 + (inZ > 0 ? gap : 0);
    for (let x = yx0; x <= yx1; x++) for (let z = yz0; z <= yz1; z++) this._claim(cx, cz, x, z);
    // The APRON runs a ring proud of the walls. Without it the plinth ends flush
    // with the wall and a cottage on any slope has its doorway opening onto a
    // ledge; with it there is a step of level ground to stand on all the way
    // round, which is also what the eaves are already overhanging.
    for (let x = ax - W - 1; x <= ax + W + 1; x++) {
      for (let z = az - D - 1; z <= az + D + 1; z++) {
        const inside = x >= ax - W && x <= ax + W && z >= az - D && z <= az + D;
        const edge = x === ax - W || x === ax + W || z === az - D || z === az + D;
        this._claim(cx, cz, x, z);
        // Fill under it so it never stands on air, clear over it so it is never
        // buried, both only as far as the site actually needs.
        for (let y = fy - 3; y < fy; y++) put(x, y, z, B.dirt);
        put(x, fy - 1, z, B.cobble);
        for (let y = fy; y <= fy + wallH + Math.max(W, D) + 1; y++) put(x, y, z, B.air);
        put(x, fy, z, !inside || edge ? B.cobble : B.planks);          // apron & plinth / floor
        if (!inside || !edge) continue;
        const corner = (x === ax - W || x === ax + W) && (z === az - D || z === az + D);
        for (let y = fy + 1; y <= fy + wallH; y++) put(x, y, z, corner ? p.timber : p.infill);
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
          put(x, y, z, p.roofId);
        }
      }
    }
    for (let x = ax - (along ? W : 0); x <= ax + (along ? W : 0); x++) {
      for (let z = az - (along ? 0 : D); z <= az + (along ? 0 : D); z++) put(x, fy + wallH + 2 + half, z, p.roofId);
    }
    // The way in: a two-block door in the wall that faces the lane.
    put(dxc, fy + 1, dzc, p.doorId);
    put(dxc, fy + 2, dzc, p.doorTop);
    // …and a path off the threshold. The apron is level with the floor, so on a
    // fall the ground beyond it is a drop you can leave by but never climb back
    // up (the player steps up one block, not four). These are the steps: one
    // tread per cell, one block of rise each, stopping the moment the natural
    // ground comes up to meet them. CROFT_RAMP is short enough that the last
    // tread still lands clear of the graded corridor — see CROFT_OFFSET.
    //
    // Run once per CARDINAL bearing the doorway faces. On a diagonal road the
    // door lands on the building's corner and faces both ways at once; a single
    // diagonal flight would be no use to a player, who moves on the four
    // compass neighbours and cannot cut a corner.
    for (let b = 0; b < 2; b++) {
      const bx = b === 0 ? inX : 0, bz = b === 0 ? 0 : inZ;
      if (bx === 0 && bz === 0) continue;
      let ty = fy;
      for (let k = 2; k <= CROFT_RAMP + 1; k++) {
        const px = dxc + bx * k, pz = dzc + bz * k;
        const hn = gen.heightAt(px, pz);
        if (hn >= ty - 1 && hn <= ty) break;                           // the ground already meets it
        ty += hn > ty ? 1 : -1;
        this._claim(cx, cz, px, pz);
        for (let y = ty; y > hn && y > ty - CROFT_FOOT; y--) put(px, y, pz, B.cobble);
        if (hn > ty) put(px, ty, pz, B.cobble);                        // a cutting, not a fill
        for (let y = ty + 1; y <= ty + 3; y++) put(px, y, pz, B.air);
      }
    }
    // A hearth inside and a lantern over the door, so it reads as lived in.
    put(ax, fy + 1, az, B.campfire);
    put(p.stepX, fy + 3, p.stepZ, B.sea_lantern);

    // ---- What is actually in it ---------------------------------------------
    // A cottage nobody furnished reads as a prop. The vocabulary is the town's
    // (js/world/town.js): a pallet with a bolster, a trestle board, a kist, a
    // barrel, a stool, a rushlight.
    //
    // Everything below is placed in the room's door-relative axes: `u` counts
    // from the middle toward the back wall (+dn) or the doorway (-dn), `v` runs
    // across (±dg). Every fitting hugs the perimeter ring, so the interior CORE
    // is empty by construction — which is the property that makes the room one
    // connected floor whatever the seed does with it. On top of that, nothing at
    // all goes in the cell you step into from the doorway or in its four
    // neighbours. There is a flood-fill test for exactly this.
    const dn = p.dn, dg = p.dg;
    const clear = (x, z) => Math.abs(x - p.stepX) + Math.abs(z - p.stepZ) > 1
      && !(x === ax && z === az);                                      // the hearth keeps its cell
    const fit = (u, v, id, y = fy + 1) => {
      const x = ax + p.nx * u + p.gx * v, z = az + p.nz * u + p.gz * v;
      if (clear(x, z)) put(x, y, z, id);
    };

    // The pallet lies along one side wall, its head in the back corner.
    const soft = r(7) < 0.4 ? B.red_wool : B.thatch;                   // a mattress or bare straw
    for (let i = 0; i < 3; i++) fit(dn - i, -dg, i === 0 ? B.white_wool : soft);
    // A trestle board down the other side wall — fence legs, slab top — with a
    // stool at the near end of it.
    for (let i = 0; i < 2; i++) { fit(dn - i, dg, B.planks_fence); fit(dn - i, dg, B.planks_slab, fy + 2); }
    fit(dn - 2, dg, B.planks_slab);                                    // stool
    fit(dn, -p.chestV, B.cauldron);                                    // barrel, back wall
    fit(dn, 0, B.torch_post);                                          // rushlight between them

    // The kist. Facing so its front looks into the room rather than into the wall.
    if (clear(p.chestX, p.chestZ)) {
      put(p.chestX, p.chestY, p.chestZ, B.chest_block);
      // Facing 0=+Z 1=+X 2=-Z 3=-X; the front should look back down `n`.
      if (setFacing) {
        setFacing(p.chestX, p.chestY, p.chestZ,
          p.nx !== 0 ? (p.nx < 0 ? 1 : 3) : (p.nz < 0 ? 0 : 2));
      }
      // Modest loot, and modest is the point: this is one crofter's kist beside a
      // road, not a dungeon hoard. Deterministic from (seed, road, station), so
      // the same cottage always holds the same few things.
      // Only registered when a chest sink is supplied — see carveRoads.
      if (chestSink && this._inChunk(cx, cz, p.chestX, p.chestZ)) {
        chestSink(this._croftLoot(gen, d, n));
      }
    }

    // The occupant. There is no per-chunk NPC sink in this generator (villagers
    // come from the hand-built structure list only), so the best a chunk-local
    // cottage can do is the smallholding's livestock — which at least means the
    // place has something alive in the yard. See the report in the module header.
    // Stood on the apron beside the doorstep, which is known to be level with the
    // floor — so it never spawns inside the hillside the cottage is cut into.
    const yx = dxc + inX + p.gx, yz = dzc + inZ + p.gz;
    if (this._inChunk(cx, cz, yx, yz) && r(9) < 0.75) {
      chunk.spawns.push({
        id: `croft:${d}:${n}`, type: r(10) < 0.5 ? 'chicken' : 'duck',
        x: yx, y: fy + 1, z: yz, fixed: true,
      });
    }
    return top;
  }

  _inChunk(cx, cz, x, z) {
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    return lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK;
  }

  // Does a mineshaft headframe or a dungeon stair already own this ground? Tested
  // at the centre and the four extremes of a footprint `span` wide — the claim is
  // an area, not a point, and a frame clipping one corner of a cottage is enough
  // to block the doorway. Kept out of the cheap rolls above so it is only ever
  // asked about a site that was otherwise going to build.
  _siteTaken(gen, x, z, span) {
    for (let i = 0; i < 5; i++) {
      const qx = x + (i === 1 ? span : i === 2 ? -span : 0);
      const qz = z + (i === 3 ? span : i === 4 ? -span : 0);
      if (mineshaftClaims(gen, qx, qz) || dungeonClaims(gen, qx, qz)) return true;
    }
    return false;
  }

  // Mark a column as owned by a roadside structure. See `_built`.
  _claim(cx, cz, x, z) {
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    if (lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK) this._built[lz * CHUNK + lx] = 1;
  }

  // What is in a croft's kist. A pure function of (seed, road, station) so every
  // chunk — and every load of the same world — agrees.
  _croftLoot(gen, dir, n) {
    const p = this._plan;
    const r = (v) => hash2(gen.seed + S_CROFT_KIT, n * 31 + v, dir);
    const loot = [{ item: 'travel_biscuit', qty: 1 + ((r(1) * 2) | 0) }];
    if (r(2) < 0.7) loot.push({ item: 'plant_fibre', qty: 2 + ((r(3) * 3) | 0) });
    if (r(4) < 0.5) loot.push({ item: 'torch_item', qty: 2 + ((r(5) * 3) | 0) });
    if (r(6) < 0.35) loot.push({ item: 'grain_seeds', qty: 1 + ((r(7) * 2) | 0) });
    if (r(8) < 0.18) loot.push({ item: 'old_coin', qty: 1 });
    return { id: `croft:${dir}:${n}`, x: p.chestX, y: p.chestY, z: p.chestZ, loot };
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
  // Every trail station whose route or destination can reach this chunk. The
  // window has to reach past the trail's own END: the site standing there is up to
  // SITE_SPAN wide and the wobble puts it a couple of blocks off the straight
  // bearing, so a chunk holding only the destination still has to see the ORIGIN
  // station that produced it.
  _trailRange(sChunk, out) {
    const reach = TRAIL_MAX + CHUNK_R + SITE_SPAN + 6;
    out[0] = Math.ceil((sChunk - reach) / TRAIL_SPACING);
    out[1] = Math.floor((sChunk + reach) / TRAIL_SPACING);
    return out;
  }

  // One trail's frame: origin on the parent's centre line, bearing turned well off
  // it so a trail reads as leaving rather than paralleling, and how far it runs.
  // Both passes go through here, so the path and the thing at the end of it can
  // never disagree about where that end is.
  _trailFrame(gen, d, k, sOrigin) {
    const o = this.column(gen, d, sOrigin, 0, this._col);
    const t = this._tf;
    t.ox = o[0]; t.oz = o[1];
    const side = hash2(gen.seed + S_TRAIL_W, k, d) < 0.5 ? 1 : -1;
    const turn = 0.9 + hash2(gen.seed + S_TRAIL_TURN, k, d) * 0.7;      // 51-92 degrees
    const th = Math.atan2(U[d * 2 + 1], U[d * 2]) + side * turn;
    t.vx = Math.cos(th); t.vz = Math.sin(th);
    t.len = TRAIL_MIN + hash2(gen.seed + S_TRAIL_LEN, k, d) * (TRAIL_MAX - TRAIL_MIN);
    return t;
  }

  _trailEnds(gen, blocks, cx, cz, d, sChunk) {
    const rg = this._trailRange(sChunk, this._krange);
    let top = -1;
    const half = SITE_SPAN + 2, x0 = cx * CHUNK, z0 = cz * CHUNK;
    for (let k = rg[0]; k <= rg[1]; k++) {
      const site = this._sitePlan(gen, d, k);
      if (!site) continue;
      // Every chunk the site can reach builds its own slice; the rest leave here.
      if (site.x + half < x0 || site.x - half >= x0 + CHUNK
        || site.z + half < z0 || site.z - half >= z0 + CHUNK) continue;
      const y = this._trailEnd(gen, blocks, cx, cz, site);
      if (y > top) top = y;
    }
    return top;
  }

  _trails(gen, chunk, blocks, cx, cz, d, sChunk) {
    const rg = this._trailRange(sChunk, this._krange);
    for (let k = rg[0]; k <= rg[1]; k++) {
      const sOrigin = k * TRAIL_SPACING;
      if (sOrigin < TRAIL_START + RC_START[d]) continue;
      if (hash2(gen.seed + S_TRAIL, k, d) > TRAIL_CHANCE) continue;
      this._trail(gen, chunk, blocks, cx, cz, d, k, sOrigin);
    }
  }

  _trail(gen, chunk, blocks, cx, cz, d, k, sOrigin) {
    const t = this._trailFrame(gen, d, k, sOrigin);
    const ox = t.ox, oz = t.oz, vx = t.vx, vz = t.vz, len = t.len;

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
        if (this._built[li]) continue;                                  // …or a cottage, or a shrine
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

  // ---- Where a trail leads --------------------------------------------------
  // A path that stops in an empty field is a path that wasted your time. A
  // fraction of trails therefore end at something small and hand-made: a wayside
  // shrine, a hunter's camp, or a ring of standing stones. Small and rare on
  // purpose — five to nine blocks across, and roughly a quarter of trails get
  // one, so finding one still means something.
  //
  // Chunk-local by exactly the same construction as the crofts: the site, its
  // floor and every block are pure functions of (seed, parent road, station),
  // the floor coming from `gen.heightAt` at the centre column rather than from
  // anything one chunk knows.
  // Whether the trail leaving road `d` at station `k` ends at anything, and if so
  // where and what. Pure function of (seed, road, station); fills a reused record.
  _sitePlan(gen, d, k) {
    const sOrigin = k * TRAIL_SPACING;
    if (sOrigin < TRAIL_START + RC_START[d]) return null;
    if (hash2(gen.seed + S_TRAIL, k, d) > TRAIL_CHANCE) return null;    // no trail at all
    const roll = hash2(gen.seed + S_SITE, k, d);
    if (roll >= SITE_CHANCE) return null;                               // a trail that just peters out
    const t = this._trailFrame(gen, d, k, sOrigin);
    // The trail's own wobble at its far end, so the site sits where the path
    // actually arrives rather than on the straight bearing.
    const wob = (valueNoise2(gen.seed + S_TRAIL + k, t.len / 26, 2.5) - 0.5) * 5;
    const ex = Math.round(t.ox + t.vx * t.len - t.vz * wob);
    const ez = Math.round(t.oz + t.vz * t.len + t.vx * wob);
    // It never builds on ground something else already owns: the hand-built pads
    // and lanes, or any arterial — checked at the centre and at the four extremes
    // of the footprint, because clipping a road corridor would put a wall across
    // a lane you are supposed to be able to walk.
    if (this._blocked(gen, ex, ez, 15)) return null;
    const half = SITE_SPAN + 1;
    if (this.arterialAt(gen, ex, ez) !== -1) return null;
    for (let i = 0; i < 4; i++) {
      const qx = ex + (i === 0 ? half : i === 1 ? -half : 0), qz = ez + (i === 2 ? half : i === 3 ? -half : 0);
      if (this.arterialAt(gen, qx, qz) !== -1) return null;
    }
    const fy = gen.heightAt(ex, ez);
    if (fy <= SEA + 1 || fy > H_HI - 8) return null;                    // not on a beach or a crag
    if (this._siteTaken(gen, ex, ez, SITE_SPAN)) return null;           // a shaft head has this ground
    const s = this._site;
    s.dir = d; s.k = k; s.x = ex; s.z = ez; s.y = fy;
    s.kind = (roll / SITE_CHANCE * SITE_KINDS) | 0;
    return s;
  }

  // Public: where the trail leaving road `dir` at station `k` leads, or null.
  // Returns a REUSED record — copy what you need out of it.
  trailSite(gen, dir, k) { this._frame(gen); return this._sitePlan(gen, dir, k); }

  _trailEnd(gen, blocks, cx, cz, site) {
    const ex = site.x, ez = site.z, fy = site.y, d = site.dir, k = site.k;
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    let top = -1;
    const put = (x, y, z, id) => {
      const lx = x - x0, lz = z - z0;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 1 || y >= WORLD_H) return;
      blocks[(y * CHUNK + lz) * CHUNK + lx] = id;
      if (id !== B.air && y > top) top = y;
    };
    // Level ground for one cell: fill to the site's floor, clear the air over it.
    // Called only on the cells a site actually stands on, so the ground around
    // stays the biome's own rather than a paved disc.
    const pad = (x, z, id, up) => {
      const hn = gen.heightAt(x, z);
      this._claim(cx, cz, x, z);
      for (let y = fy - 1; y > hn && y > fy - 8; y--) put(x, y, z, B.cobble);
      for (let y = fy + 1; y <= fy + up; y++) put(x, y, z, B.air);
      if (id) put(x, fy, z, id);
      else if (hn < fy) put(x, fy, z, B.dirt);
    };
    // A ring of yard round the site, claimed but never built on, so a tree cannot
    // root against a shrine and drop a solid canopy over it. Same reasoning as a
    // croft's yard — see `_croft`.
    for (let x = ex - SITE_SPAN - 2; x <= ex + SITE_SPAN + 2; x++) {
      for (let z = ez - SITE_SPAN - 2; z <= ez + SITE_SPAN + 2; z++) this._claim(cx, cz, x, z);
    }
    const r = (v) => hash2(gen.seed + S_SITE_ART, k * 37 + v, d);
    if (site.kind === 0) this._shrine(gen, put, pad, r, ex, ez, fy);
    else if (site.kind === 1) this._camp(gen, put, pad, r, ex, ez, fy);
    else this._stoneRing(gen, put, pad, r, ex, ez, fy);
    return top;
  }

  // A wayside shrine: an old flagged platform, a two-course altar with a votive
  // light on it, a standing stone either side, and an offering bowl in front.
  _shrine(gen, put, pad, r, ex, ez, fy) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const edge = Math.abs(dx) === 2 && Math.abs(dz) === 2;
        if (edge && hash2(gen.seed + S_RAGGED, ex + dx, ez + dz) < 0.6) continue;   // broken flags
        pad(ex + dx, ez + dz, hash2(gen.seed + S_PAVE, ex + dx, ez + dz) < 0.45 ? B.mossy_cobble : B.cobble, 6);
      }
    }
    put(ex, fy + 1, ez, B.stone_brick);
    put(ex, fy + 2, ez, B.mossy_stone_brick);
    put(ex, fy + 3, ez, B.torch_post);                                  // the votive light
    const ax = r(1) < 0.5 ? 1 : 0, az = 1 - ax;                         // which way the pair stands
    for (const sg of [-1, 1]) {
      const px = ex + ax * sg * 2, pz = ez + az * sg * 2;
      for (let y = fy + 1; y <= fy + 2 + ((r(2) * 2) | 0); y++) put(px, y, pz, B.mossy_stone_brick);
    }
    put(ex + az * 1, fy + 1, ez + ax * 1, B.cauldron);                  // offering bowl
    put(ex - az * 1, fy + 1, ez - ax * 1, r(3) < 0.5 ? B.allium : B.oxeye_daisy);
  }

  // A hunter's camp: a lean-to you can shelter under, a firepit, a drying rack
  // with a hide on it, and a log to sit on.
  //
  // EVERY pad is laid before ANY fitting. `pad` clears the air above the cell it
  // levels, so a pad called after the roof went on took the roof's eave straight
  // back off again — which is exactly what happened to this camp's thatch and to
  // the stone circle's shorter stones.
  _camp(gen, put, pad, r, ex, ez, fy) {
    // Which way the lean-to opens. The shelter is 3 wide and 2 deep, its back to
    // the weather, so the whole camp reads as facing one way.
    const f = (r(1) * 4) | 0;
    const fx = f === 1 ? 1 : f === 3 ? -1 : 0, fz = f === 0 ? 1 : f === 2 ? -1 : 0;
    const gx = fz, gz = fx;                                             // across the opening
    const cxp = ex + fx * 3, czp = ez + fz * 3;                         // the firepit
    const rx = ex - gx * 3, rz = ez - gz * 3;                           // the drying rack
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) pad(ex + a, ez + b, 0, 5);
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) pad(cxp + a, czp + b, a === 0 && b === 0 ? B.gravel : B.cobble, 4);
    }
    for (const sg of [0, 1]) pad(rx + fx * sg * 2, rz + fz * sg * 2, 0, 5);
    pad(cxp + gx, czp + gz, 0, 4);

    // Back wall, corner posts, and a roof sloping from the wall out over the
    // opening — so it reads as something you could crawl under out of the rain.
    for (let a = -1; a <= 1; a++) {
      const bx = ex + gx * a - fx, bz = ez + gz * a - fz;
      for (let y = fy + 1; y <= fy + 2; y++) put(bx, y, bz, B.timber_wall);
    }
    for (const sg of [-1, 1]) {
      const px = ex + gx * sg, pz = ez + gz * sg;
      put(px, fy + 1, pz, B.oak_log); put(px, fy + 2, pz, B.oak_log);
    }
    for (let a = -1; a <= 1; a++) {
      put(ex + gx * a - fx, fy + 3, ez + gz * a - fz, B.thatch);
      put(ex + gx * a, fy + 3, ez + gz * a, B.thatch);
      put(ex + gx * a + fx, fy + 2, ez + gz * a + fz, B.thatch_slab);   // the low eave
    }
    put(cxp, fy + 1, czp, B.campfire);
    put(cxp + gx, fy + 1, czp + gz, B.stump);                           // a log to sit on
    // Drying rack: two posts, a crossbar, and a hide hanging off it.
    for (const sg of [0, 1]) {
      const px = rx + fx * sg * 2, pz = rz + fz * sg * 2;
      for (let y = fy + 1; y <= fy + 3; y++) put(px, y, pz, B.planks_fence);
    }
    put(rx + fx, fy + 3, rz + fz, B.planks_fence);
    put(rx + fx, fy + 2, rz + fz, r(2) < 0.6 ? B.brown_wool : B.white_wool);
  }

  // A ring of standing stones round a low cairn. Nothing is levelled but the
  // stones' own columns and a scatter of trodden ground, so the circle keeps
  // whatever ground the moor gave it. Pads first — see _camp.
  _stoneRing(gen, put, pad, r, ex, ez, fy) {
    const rad = 3;
    const stoneH = (px, pz) => 2 + ((hash2(gen.seed + S_SITE_ART, px, pz) * 3) | 0);   // 2-4: uneven
    const onRing = (dx, dz) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        if (Math.round(Math.cos(a) * rad) === dx && Math.round(Math.sin(a) * rad) === dz) return true;
      }
      return false;
    };
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if ((dx === 0 && dz === 0) || onRing(dx, dz)) continue;
        if (hash2(gen.seed + S_TRAIL_W, ex + dx, ez + dz) > 0.35) continue;
        pad(ex + dx, ez + dz, r(1) < 0.5 ? B.gravel : B.dirt, 4);
      }
    }
    pad(ex, ez, B.gravel, 5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = ex + Math.round(Math.cos(a) * rad), pz = ez + Math.round(Math.sin(a) * rad);
      pad(px, pz, B.mossy_cobble, stoneH(px, pz) + 3);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = ex + Math.round(Math.cos(a) * rad), pz = ez + Math.round(Math.sin(a) * rad);
      const h = stoneH(px, pz);
      const mossy = hash2(gen.seed + S_PAVE, px, pz) < 0.5;
      for (let y = fy + 1; y <= fy + h; y++) put(px, y, pz, mossy ? B.mossy_stone_brick : B.stone_brick);
      put(px, fy + h + 1, pz, B.stone_brick_slab);
    }
    put(ex, fy + 1, ez, B.mossy_cobble);                                // the cairn
    put(ex, fy + 2, ez, B.cobble_wall);
    put(ex, fy + 3, ez, B.glow_lichen);
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
  // Every WAYSTONE_SPACING blocks along each arterial: a standing stone, a
  // signpost and a bench, all clear of the running lane. The signpost and bench
  // re-read the graded height of the column they actually land on, so a waystone
  // straddling a chunk border comes out identical from either side; the stone
  // itself is levelled off one height for all nine of its columns (see _menhir).
  _waystones(gen, blocks, cx, cz, d, sLo, sHi) {
    let top = -1;
    const first = Math.ceil(sLo / WAYSTONE_SPACING), last = Math.floor(sHi / WAYSTONE_SPACING);
    for (let n = first; n <= last; n++) {
      const s = n * WAYSTONE_SPACING;
      if (s < RC_START[d]) continue;
      const side = waysideOf(gen.seed, d, n);
      let y = this._menhir(gen, blocks, cx, cz, d, s, side);
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

  // The standing stone itself — a menhir, not a bollard and not a chimney. What
  // makes one legible from the road is the SILHOUETTE, so it is built out of
  // that: a rough base course three blocks across, a kerb of wall-posts and slabs
  // stepping in off it, then a body three blocks wide but only one thick rising
  // out of the middle, tapering to a one-block crown of lantern and capstone.
  //
  // The body's width is the whole point and it is easy to lose — see WS_WING. A
  // shaft one block square gave a 1:6 stick that read as a lamp-post from any
  // distance you would actually first see the thing from. The alternating mossy
  // courses are what stop it reading as a smooth pillar, and the lantern set
  // under the capstone is how you find it at night.
  //
  // Chunk-local, and levelled: all nine columns sit at the road's own graded
  // height at `s`, which is `gradeAt(s)` — a pure function of (seed, road, s),
  // not of anything one chunk happens to know. A plinth that followed the ground
  // under each cell would be rubble, and a plinth that took its level from the
  // centre column's chunk would come out at two different heights depending on
  // which side of a chunk border you asked from.
  _menhir(gen, blocks, cx, cz, d, s, side) {
    const c = this.column(gen, d, s, WS_STONE * side, this._col);
    const ax = c[0], az = c[1];
    // Which world axis the stone's broad face is widened along: the road's ACROSS
    // axis, sampled by stepping one block further out and seeing which way the
    // column moved. On a diagonal arterial that step is diagonal, so take the
    // dominant component — a slab wants one flat face, not a staircase of
    // corners. Sampled here, before `window`, because `column` moves the frame.
    const c2 = this.column(gen, d, s, WS_STONE * side + 1, this._col);
    const wdx = Math.abs(c2[0] - ax) >= Math.abs(c2[1] - az) ? 1 : 0;
    const wdz = 1 - wdx;
    // Cheap out for every chunk the stone cannot reach, before the profile
    // window — which is the only expensive thing in here.
    const lx = ax - cx * CHUNK, lz = az - cz * CHUNK;
    if (lx < -WS_YARD || lx > CHUNK + WS_YARD || lz < -WS_YARD || lz > CHUNK + WS_YARD) return -1;
    // It declines to stand on ground something hand-built already owns (the same
    // columns the road itself steps around), and it does not wade: a waystone
    // stands on the bank, never out on a bridge.
    if (this._blocked(gen, ax, az, 15)) return -1;
    if (gen.heightAt(ax, az) <= SEA) return -1;
    this.window(gen, d, s, s);
    const y = this.gradeAt(s);
    if (y < 1 || y + WS_TOP + 2 >= WORLD_H) return -1;

    const step = CHUNK * CHUNK;
    let top = -1;
    const put = (x, yy, z, id) => {
      const px = x - cx * CHUNK, pz = z - cz * CHUNK;
      if (px < 0 || px >= CHUNK || pz < 0 || pz >= CHUNK || yy < 1 || yy >= WORLD_H) return;
      blocks[(yy * CHUNK + pz) * CHUNK + px] = id;
      if (id !== B.air && yy > top) top = yy;
    };

    // A ring of ground round the stone, claimed but not built on. The shaft's
    // upper courses stand at canopy height, and leaves are SOLID here, so a tree
    // rooted three columns away wrote pine needles straight through the middle of
    // the stone. Claiming the trunk columns drops those nodes before they are
    // stamped (see _evict) and gives the landmark the clearing it wants anyway.
    for (let dx = -WS_YARD; dx <= WS_YARD; dx++) {
      for (let dz = -WS_YARD; dz <= WS_YARD; dz++) this._claim(cx, cz, ax + dx, az + dz);
    }
    // Footing and headroom first: on fill the stone would otherwise stand on
    // air, and in a cutting it would be buried to the shoulders.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const x = ax + dx, z = az + dz, hn = gen.heightAt(x, z);
        this._claim(cx, cz, x, z);
        for (let yy = y; yy > hn && yy > y - WS_FOOT; yy--) put(x, yy, z, B.cobble);
        for (let yy = y + 1; yy <= y + WS_TOP + 1; yy++) put(x, yy, z, B.air);
      }
    }
    // Course 1: the broad base, weathered at the corners.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const corner = dx !== 0 && dz !== 0;
        put(ax + dx, y + 1, az + dz, corner ? B.mossy_cobble : B.cobble);
      }
    }
    // Course 2: the step in. Wall-posts on the corners, slabs on the flats —
    // both half-shapes, so the base visibly narrows into the shaft rather than
    // jumping from three wide to one.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        put(ax + dx, y + 2, az + dz, dx !== 0 && dz !== 0 ? B.cobble_wall : B.stone_brick_slab);
      }
    }
    // The shaft. WS_SHAFT[0] is the base course's own centre, already laid above
    // and repeated here so the exported course list reads as one column.
    for (let i = 0; i < WS_SHAFT.length; i++) put(ax, y + 1 + i, az, WS_SHAFT[i]);
    // The wings that make it a slab rather than a post — see WS_WING. They run
    // along the road's ACROSS axis, so the flat of the stone faces a traveller
    // coming up the lane. They reach no further than the base course already
    // does (the plinth is 3x3 and these are ±1 of the same centre), so nothing
    // here can newly intrude on the paved lane.
    for (let i = WS_BODY0; i <= WS_BODY1; i++) {
      for (let k = -WS_WING; k <= WS_WING; k++) {
        if (k === 0) continue;
        put(ax + wdx * k, y + i, az + wdz * k, WS_SHAFT[i - 1]);
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
  //
  // `_built` columns go the same way, and that is not cosmetic: a node is stamped
  // into `blocks` AFTER this module runs (js/world/world.js), so an oak seeded on
  // a column a cottage now stands on put its trunk straight up through the
  // building — including, repeatably, through the doorway and the upper door
  // leaf, which sealed the cottage. It is the exact failure the enterability
  // test in tests/unit/roads.test.mjs catches.
  _evict(chunk, cx, cz) {
    const mask = this._mask, built = this._built;
    const taken = (x, z) => {
      const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK) return false;
      const li = lz * CHUNK + lx;
      return mask[li] === 1 || built[li] === 1;
    };
    let w = 0;
    for (let i = 0; i < chunk.nodes.length; i++) {
      const n = chunk.nodes[i];
      if (!taken(n.x, n.z)) chunk.nodes[w++] = n;
    }
    chunk.nodes.length = w;
    w = 0;
    for (let i = 0; i < chunk.spawns.length; i++) {
      const sp = chunk.spawns[i];
      // `fixed` spawns are the ones this pass placed on purpose (a croft's
      // livestock); only the scatter pass's wandering mobs get cleared.
      if (sp.fixed || !taken(sp.x, sp.z)) chunk.spawns[w++] = sp;
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

  // The column the n-th waystone's standing stone rises out of, on arterial
  // `dir`. One definition, shared by the builder and by anything looking for one.
  waystoneColumn(gen, dir, n, out = this._col) {
    return this.column(gen, dir, n * WAYSTONE_SPACING, WS_STONE * waysideOf(gen.seed, dir, n), out);
  }

  // The height the n-th waystone's stone is levelled to, and the courses standing
  // on it — so a caller (or a test) can look for the thing without reproducing
  // the builder's arithmetic. Returns -1 where no stone stands there.
  waystoneBaseY(gen, dir, n) {
    this._frame(gen);
    const s = n * WAYSTONE_SPACING;
    if (s < RC_START[dir] || dir >= PRIMARIES) return -1;
    const c = this.waystoneColumn(gen, dir, n, this._col);
    if (this._blocked(gen, c[0], c[1], 15)) return -1;
    if (gen.heightAt(c[0], c[1]) <= SEA) return -1;
    return this.surfaceY(gen, dir, s);
  }
}

// Which verge a waystone stands on — alternating so the road doesn't grow a
// hedge of markers all down one side.
function waysideOf(seed, dir, n) { return hash2(seed + S_WAYSIDE, dir, n) < 0.5 ? 1 : -1; }

// Distance along / across arterial `dir` for a world column.
export function alongOf(dir, x, z) { return x * U[dir * 2] + z * U[dir * 2 + 1]; }
export function acrossOf(dir, x, z) { return x * -U[dir * 2 + 1] + z * U[dir * 2]; }

// The one entry point world.js calls during chunk generation.
//
// `chestSink` is optional and takes the same {id, x, y, z, loot} record that
// stampChunkStructures' `chest` sink does. Supply it and a wayside croft's kist
// comes with its (deterministic, modest) contents; leave it out and the kist is
// still there and still usable, just empty — there is no way for this module to
// register chest metadata on its own, because the chunk record it is handed
// carries blocks, nodes and spawns and nothing else.
export function carveRoads(gen, chunk, blocks, cx, cz, setFacing, chestSink) {
  return roadsFor(gen).carve(gen, chunk, blocks, cx, cz, setFacing, chestSink);
}
