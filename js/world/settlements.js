// Procedural towns on the arterial roads (docs/WORLD_PLAN.md, phase 6).
//
// One town roughly every TOWN_SPACING blocks along each of the eight arterials —
// a station is a place to LOOK, and a handful of placements are tried around it
// before the ground is given up on — sized and themed by the difficulty ring it
// stands in. The building vocabulary
// is the deleted town's (js/world/town.js): burgage plots at right angles to a high
// street, houses hard on the frontage line with party walls between them, timber
// framing over a stone plinth, jettied upper storeys, deep eaves, a funnel market
// rather than a plaza, and nuisance trades pushed out to the town edge.
//
// WHY IT IS SHAPED LIKE THIS (the same medieval reading town.js documents)
//  1. A ROAD TOWN. The town sits BESIDE the arterial and reaches it with a short
//     lane, which is what a market town actually is: a place the road stops at
//     rather than a place the road runs through. The lane is the guaranteed way
//     in, and it is graded to ≤1-block steps end to end.
//  2. BURGAGE PLOTS. Frontage was the scarce good and depth nearly free, so plots
//     are narrow (5–9) and run back from the street to a toft — garden, byre,
//     midden — and a back lane. Frontages vary, and vennels pierce the terrace
//     every third or fourth plot.
//  3. A FUNNEL MARKET. The market is the street getting fat, not a plaza bolted
//     on: the far row steps back over the middle stretch, and the well, cross and
//     stalls stand in the bulge.
//  4. NO SETBACK, PARTY WALLS. Houses sit on the frontage line and touch their
//     neighbours. A freestanding house ringed by grass reads as wrong.
//  5. NUISANCE TRADES OUT. The forge stands at the town end with a gap round it,
//     because a town that keeps fire hooks by the door does not want a smith in
//     the middle of its terrace.
//  6. RING SCALING. Ring 1 adds a smithy and a palisade, ring 2 a moot hall and a
//     stone wall, ring 3 a keep — so how far you have walked is legible in the
//     skyline before anything tells you a number.
//
// AND THE TWO HARD CONSTRAINTS
//
// CHUNK-LOCALITY. A town spans ~25 chunks and every one of them must be
// generatable alone, in any order, with no neighbour loaded. So nothing here
// grows outward from whichever chunk the player walked into. A town is anchored
// to a STATION on an arterial — station `n` of road `d` — and its whole layout,
// its floor level and every block it writes are pure functions of (seed, d, n).
// The ground it reads comes from `gen.heightAt` probes at the site, never from
// anything one chunk happens to know. Each chunk rasterises its own slice and
// drops the rest; the union is one coherent town. js/world/sites.js holds the
// shared machinery and js/world/mineshaft.js is the same pattern at smaller
// scale.
//
// ENTERABILITY. The whole town platform is levelled to ONE height, and that is
// what makes a town enterable by construction rather than by inspection: every
// floor, street and doorstep is at the same level, so no doorway can end up a
// block above the street that serves it. Every building is hollow, has a
// two-block doorway onto a street, and reaches its upper storeys by a straight
// flight that ends FLUSH with the floor it serves — only stairs and slabs are
// walkable steps (World.isStep), so a flight one riser short is a dead end.
// tests/unit/settlements.test.mjs walks in from the road with the player's own
// movement rules and proves every room of every building is reachable.
import { B } from './blocks.js';
import { CHUNK, SEA, ringAt } from './worldgen.js';
import { roadsFor, alongOf, acrossOf, PRIMARIES } from './roads.js';
import { hash2, mulberry32 } from '../core/rng.js';
import { NODE_TYPES } from '../game/nodes.js';
import { ENEMY_TYPES } from '../game/enemies.js';
import { ITEMS } from '../game/items.js';
import { QUESTS } from '../game/quests.js';
import { NPC_DEFS, DIALOGUES } from '../game/npcs.js';
import { on } from '../core/events.js';
import {
  beginStamp, overlaps, put, box, putNode, putChest, nearHandBuilt, randInt,
} from './sites.js';

// ---- siting constants -------------------------------------------------------
const SALT = 0x5e7712;
// One town per ~1200 blocks of arterial. Each road gets its OWN phase, so the
// eight roads do not all plant their first town at the same distance out. That is
// what puts towns in every difficulty ring: with ringAt's 512-block rings, a
// shared phase would band every town at 1200, 2400, 3600 and skip rings 1 and 2
// entirely.
export const TOWN_SPACING = 1200;
const PHASE_LO = 340, PHASE_SPAN = 1100;
const STATION_JITTER = 120;      // so towns never sit on round numbers
// The gap between the road's graded shoulder and the town platform. The lane runs
// through it, and its length is what lets the lane absorb the height difference
// between road and town at no more than a block a step.
const LANE_RUN = 14;
// Clear ground between the town's graded bank and the arterial's centre line: the
// lane runs through it, and it has to hold the road's own corridor (3.7 blocks
// each side of the centre) with room to spare.
const ROAD_GAP = 9;
const PROBE = 4;                 // natural-height probe grid pitch
const SKIRT = 9;                 // graded bank around the platform
const MAX_RELIEF = 18;           // reject a site whose ground rolls more than this
const WET_TOLERANCE = 0.06;      // share of the platform that may start under water
const MAX_ROAD_OFFSET = 6;       // how far the platform may sit off the road's level
const MIN_APART = 150;           // two towns nearer than this would overwrite each other
const CACHE_CAP = 64;
const MIN_STATION_S = 200;       // no town closer in than this along a road

// Ring-scaled size and content. `halfL` is half the length of the high street,
// `depth` how far a house runs back from the frontage line and `toft` the garden
// behind it; the rest of the town's silhouette follows from those three.
const RING_PLAN = [
  { halfL: 17, depth: 6, toft: 4, front: [5, 7], skip: 0.18, storeys: 1, defence: null, npcs: 2 },
  { halfL: 23, depth: 6, toft: 5, front: [5, 8], skip: 0.14, storeys: 2, defence: 'palisade', npcs: 3 },
  { halfL: 29, depth: 7, toft: 6, front: [5, 9], skip: 0.11, storeys: 2, defence: 'wall', npcs: 4 },
  { halfL: 35, depth: 7, toft: 7, front: [6, 9], skip: 0.08, storeys: 3, defence: 'wall', npcs: 5 },
];

const STREET_HW = 2;             // the high street is 2*STREET_HW+1 wide
const FRONT = STREET_HW + 1;     // the frontage line: houses sit hard on it
const MARKET_OUT = 4;            // how far the far row steps back at the market
const MARKET_HALF = 6;           // half the length of the market bulge
const FORGE_LEN = 9;             // the forge and the keep are reserved plot bands
const KEEP_LEN = 10;

// Half-extents of a ring's platform, in the town's own frame: `halfU` along the
// street, `halfV` across it. Everything the town builds has to fall inside these,
// because only this rectangle is levelled.
const halfUOf = (plan) => plan.halfL + 3;
const halfVOf = (plan) => FRONT + plan.depth + plan.toft + 4;

// ---- material families ------------------------------------------------------
// One palette, deformed per building, so twenty houses read as one place.
const WOODS = [B.oak_log, B.cedar_log, B.ash_log, B.fernwood_log, B.walnut_log];
const INFILL = [B.white_terracotta, B.white_concrete, B.light_gray_terracotta, B.timber_wall];
const STONES = [B.cobble, B.stone_brick, B.andesite, B.mossy_cobble];
const DOORS = [B.oak_door, B.birch_door, B.pine_door, B.cedar_door, B.ash_door, B.walnut_door];
const DOOR_TOP = {
  [B.oak_door]: B.oak_door_top, [B.birch_door]: B.birch_door_top, [B.pine_door]: B.pine_door_top,
  [B.cedar_door]: B.cedar_door_top, [B.ash_door]: B.ash_door_top, [B.walnut_door]: B.walnut_door_top,
};
// Roof families. A roof here is laid in full courses with a slab ridge rather
// than in stairs: the chunk-stamp sink carries no facing channel (unlike the road
// carve, which world.js hands a setFacing callback), so a stair roof would come
// out with every slope pointing +Z. Full courses read as heavy thatch or tile and
// are watertight the same way a stair roof is — see the note on drawRoof.
const ROOFS = {
  thatch: { mat: B.thatch, cap: B.thatch_slab },
  tile: { mat: B.brick, cap: B.brick_slab },
  slate: { mat: B.deepslate, cap: B.deepslate_slab },
  stone: { mat: B.stone_brick, cap: B.stone_brick_slab },
};
const SLAB = B.planks_slab;      // tread, counter, bench and table top
const STONE_STEP = B.cobble_slab;

// House TYPES, not recolours: storey count, wall treatment, roof material, how it
// meets the street and what is inside it all move together, so a forge reads as a
// forge from across the market.
const THEMES = {
  cottage: { storeys: 1, roof: 'thatch', wall: 'frame', fit: 'home' },
  longhouse: { storeys: 1, roof: 'thatch', wall: 'frame', fit: 'byre' },
  townhouse: { storeys: 2, roof: 'tile', wall: 'frame', jetty: 1, fit: 'home' },
  tudor: { storeys: 3, roof: 'slate', wall: 'frame', jetty: 1, fit: 'home' },
  stonehouse: { storeys: 2, roof: 'slate', wall: 'stone', fit: 'merchant' },
  shopfront: { storeys: 2, roof: 'tile', wall: 'frame', jetty: 1, fit: 'shop', sign: true },
  tavern: { storeys: 2, roof: 'thatch', wall: 'frame', jetty: 1, fit: 'tavern', eavesOn: true, sign: true },
  smithy: { storeys: 1, roof: 'tile', wall: 'stone', wallH: 5, fit: 'forge', bay: 3, eavesOn: true },
  barn: { storeys: 1, roof: 'thatch', wall: 'plank', wallH: 6, fit: 'barn', bay: 3, noWindows: true },
  moothall: { storeys: 2, roof: 'stone', wall: 'stone', fit: 'hall', eavesOn: true },
  keep: { storeys: 3, roof: 'stone', wall: 'stone', wallH: 5, fit: 'keep', slits: true },
};
// The ordinary houses of a street, by ring — the mix is what dates a town.
const HOUSE_MIX = [
  ['cottage', 'cottage', 'longhouse', 'cottage', 'barn'],
  ['cottage', 'townhouse', 'cottage', 'shopfront', 'longhouse', 'barn'],
  ['townhouse', 'shopfront', 'cottage', 'stonehouse', 'tudor', 'longhouse'],
  ['tudor', 'stonehouse', 'townhouse', 'shopfront', 'stonehouse', 'cottage'],
];

// ---- town names -------------------------------------------------------------
const NAME_HEAD = [
  'Ash', 'Brook', 'Cold', 'Fern', 'Grey', 'Hollow', 'Mar', 'Oak', 'Rook', 'Stone',
  'Thorn', 'West', 'Elm', 'Bram', 'Rye', 'Long', 'Black', 'Har', 'Kirk', 'Nether',
];
const NAME_TAIL = [
  'combe', 'ford', 'mere', 'ton', 'wick', 'hollow', 'stead', 'gate', 'burgh',
  'bridge', 'field', 'moor', 'beck', 'fell', 'holt', 'worth', 'thwaite', 'by',
];

// ---- the villager pool ------------------------------------------------------
// main.js registers one renderable model per NPC_DEFS entry ONCE, at startup, so
// a town discovered later cannot mint a brand-new villager id and be seen. The
// pool below is therefore declared at module load: six roles × three faces, all
// present in NPC_DEFS before main.js walks it. A town then draws its people from
// the pool deterministically, so the same town always has the same faces.
//
// The price (a real limitation, not a preference) is that a quest's `giver` keys
// an NPC TYPE rather than an NPC INSTANCE — see registerQuests.
const HPX = 1.8 / 32;
const hb = (fx, fy, fz, w, h, d, color) => ({
  x: fx * HPX, y: fy * HPX, z: fz * HPX, w: w * HPX, h: h * HPX, d: d * HPX, color,
});
// Standard villager skeleton: legs ×2, torso, arms, head, then accessories. Must
// stay box-for-box compatible with js/game/npcs.js `humanoid` — main.js rigs
// every NPC_DEFS model by those indices.
function villager({ skin, top, sleeves, bottom }, extras = []) {
  return [
    hb(-4, 0, -2, 4, 12, 4, bottom),
    hb(0, 0, -2, 4, 12, 4, bottom),
    hb(-4, 12, -2, 8, 12, 4, top),
    hb(-8, 12, -2, 4, 12, 4, sleeves),
    hb(4, 12, -2, 4, 12, 4, sleeves),
    hb(-4, 24, -4, 8, 8, 8, skin),
    ...extras,
  ];
}
const SKINS = [[0.85, 0.72, 0.6], [0.72, 0.56, 0.42], [0.93, 0.8, 0.66]];
const ROLES = [
  {
    key: 'reeve', title: 'Reeve', role: 'Speaks for the town', quest: 'deliver',
    names: ['Aldric', 'Godwin', 'Hild'],
    cloth: [[0.42, 0.36, 0.52], [0.36, 0.3, 0.46], [0.46, 0.34, 0.5]],
    extras: (c) => [hb(-4.4, 31.5, -4.4, 8.8, 2.5, 8.8, [0.86, 0.86, 0.9]), hb(-4.4, 12, -2.4, 8.8, 13, 1, c)],
    headExtra: [6],
    greet: 'a town this size runs on errands, and I am short of legs.',
  },
  {
    key: 'trader', title: 'Trader', role: 'Buys and sells', quest: 'fetch',
    names: ['Osgood', 'Wren', 'Cuddy'],
    cloth: [[0.7, 0.5, 0.3], [0.6, 0.42, 0.25], [0.66, 0.46, 0.2]],
    extras: () => [
      hb(-5.5, 31, -5.5, 11, 2, 11, [0.5, 0.36, 0.2]),
      hb(-3.5, 33, -3.5, 7, 3, 7, [0.55, 0.4, 0.22]),
      hb(-4.4, 13, -2.4, 8.8, 6, 1, [0.85, 0.78, 0.6]),
    ],
    headExtra: [6, 7],
    greet: 'stock is thin and the roads are long. Interested in work?',
  },
  {
    key: 'smith', title: 'Smith', role: 'Keeps the forge', quest: 'fetch',
    names: ['Bryn', 'Halla', 'Torr'],
    cloth: [[0.34, 0.32, 0.34], [0.28, 0.26, 0.28], [0.38, 0.3, 0.26]],
    extras: () => [hb(-4.6, 13, -2.5, 9.2, 11, 1, [0.32, 0.2, 0.14]), hb(5.6, 8, 0.5, 2, 5, 2, [0.45, 0.45, 0.5])],
    headExtra: [],
    greet: 'the fire eats more than this town brings me.',
  },
  {
    key: 'warden', title: 'Warden', role: 'Keeps the gate', quest: 'den',
    names: ['Rowan', 'Sigrid', 'Faran'],
    cloth: [[0.4, 0.44, 0.5], [0.32, 0.36, 0.42], [0.36, 0.4, 0.46]],
    extras: () => [
      hb(-4.5, 30.5, -4.5, 9, 3.5, 9, [0.55, 0.58, 0.62]),
      hb(6, 0, 1, 1.3, 30, 1.3, [0.5, 0.4, 0.3]),
      hb(5.6, 30, 0.6, 2, 4, 2, [0.8, 0.82, 0.86]),
    ],
    headExtra: [6],
    greet: 'something out there is getting bold. I would rather it did not.',
  },
  {
    key: 'herbalist', title: 'Herbalist', role: 'Physic and simples', quest: 'fetch',
    names: ['Nesta', 'Elowen', 'Mabb'],
    cloth: [[0.36, 0.5, 0.38], [0.3, 0.42, 0.32], [0.4, 0.48, 0.34]],
    extras: (c) => [hb(-4.4, 31, -4.4, 8.8, 2.5, 8.8, [0.5, 0.4, 0.3]), hb(-4.4, 12, -2.4, 8.8, 12, 1, c)],
    headExtra: [6],
    greet: 'my baskets are empty and half the town has a cough.',
  },
  {
    key: 'drover', title: 'Drover', role: 'Moves beasts and goods', quest: 'den',
    names: ['Colm', 'Ide', 'Ranulf'],
    cloth: [[0.5, 0.42, 0.3], [0.42, 0.35, 0.25], [0.46, 0.4, 0.28]],
    extras: () => [hb(-4.8, 30.8, -4.8, 9.6, 2.6, 9.6, [0.42, 0.34, 0.24]), hb(-4.4, 13, -2.4, 8.8, 5, 1, [0.7, 0.66, 0.5])],
    headExtra: [6],
    greet: 'I lost two beasts on the last drove, and I know what took them.',
  },
];

const POOL_BY_ROLE = new Map();
for (const r of ROLES) {
  const ids = [];
  for (let i = 0; i < r.names.length; i++) {
    const id = `folk_${r.key}_${i}`;
    const cloth = r.cloth[i % r.cloth.length];
    NPC_DEFS[id] = {
      label: `${r.title} ${r.names[i]}`,
      role: r.role,
      model: villager({
        skin: SKINS[i % SKINS.length],
        top: cloth,
        sleeves: cloth.map((v) => v * 0.88),
        bottom: cloth.map((v) => v * 0.66),
      }, r.extras(cloth)),
      headExtra: r.headExtra,
      dialogue: `${id}_root`,
    };
    DIALOGUES[`${id}_root`] = {
      speaker: id,
      text: () => `${r.names[i]}, ${r.title.toLowerCase()} here — and ${r.greet}`,
      options: [
        { label: 'Got any work?', next: `${id}_hub` },
        { label: 'Just passing through.', action: 'close' },
      ],
    };
    DIALOGUES[`${id}_hub`] = { speaker: id, dynamic: id };
    ids.push(id);
  }
  POOL_BY_ROLE.set(r.key, ids);
}

// ---- per-generator state ----------------------------------------------------
// Sites and layouts are pure functions of (seed, d, n), so caching them can only
// change how often they are recomputed, never what they are. Keys are NUMBERS:
// settlementClaims runs per column for every chunk in the world, and a
// template-string key there would allocate on every column.
const BY_GEN = new WeakMap();
function stateFor(gen) {
  let st = BY_GEN.get(gen);
  if (!st) {
    st = {
      sites: new Map(), towns: new Map(), phase: new Float64Array(PRIMARIES), trunk: null,
      claimCx: NaN, claimCz: NaN, claimHits: [],     // per-chunk memo for settlementClaims
    };
    for (let d = 0; d < PRIMARIES; d++) st.phase[d] = PHASE_LO + hash2(gen.seed + SALT, d, 7) * PHASE_SPAN;
    BY_GEN.set(gen, st);
  }
  return st;
}
const skey = (d, n) => n * 16 + d;                     // n ≥ 0, d < 16
function cached(store, key, build) {
  const hit = store.get(key);
  if (hit !== undefined) return hit;
  const made = build();
  store.set(key, made);
  if (store.size > CACHE_CAP) store.delete(store.keys().next().value);
  return made;
}
// Station distance along road `d`, pure in (seed, d, n).
function stationS(gen, st, d, n) {
  return st.phase[d] + n * TOWN_SPACING + (hash2(gen.seed + SALT + 1, d, n) - 0.5) * 2 * STATION_JITTER;
}
// The widest a town's graded footprint plus its lane can reach from its station —
// the bound every cheap reject uses before doing any layout work.
const MAX_REACH = (() => {
  let m = 0;
  for (const p of RING_PLAN) m = Math.max(m, halfUOf(p), halfVOf(p) + LANE_RUN + 8);
  return m + SKIRT + 6;
})();
const AMP_MAX = 70;             // roads.js caps an arterial's wander at this

// ---- siting -----------------------------------------------------------------
// A SITE is the cheap half of a town: where it stands, how high its platform is
// and how the natural ground rolls under it. It is what the per-column claims
// test and the "which town do I deliver to" lookup need, and it deliberately
// builds no streets, buildings, people or quests.
const SITE_COL = new Int32Array(2);      // the town's own centre column
const ROAD_COL = new Int32Array(2);      // the centre-line column it is measured from
const RIVAL_COL = new Int32Array(2);

// Why sites get refused, counted. A station that offers a town and cannot have
// one is normal — the world is full of lakes and crags — but the RATE matters: if
// most stations refuse, the roads run empty, and the only way to know which rule
// is doing it is to count. `offered`/`built` are per STATION; the reasons are per
// attempted placement, so they add up to more. The settlement test asserts on the
// ratio.
export const REJECTS = { offered: 0, built: 0, handBuilt: 0, wet: 0, relief: 0, low: 0, onRoad: 0, trunk: 0, rival: 0 };

// A station is a place to LOOK for a town, not a fixed plot: real settlements sat
// where the ground allowed, a few hundred metres either way. So each station tries
// a short, fixed list of placements — the far verge, then a nudge up and down the
// road — and takes the first that works. Without it, four stations in five refuse
// (lakes, crags, another road crossing the plot) and the arterials run empty.
const TRIES = [[0, 0], [1, 0], [0, 160], [1, -160], [0, -320], [1, 320]];
// How far a town's chosen plot can end up from its station's nominal point. Every
// cheap "could this station reach me" reject has to allow for it — miss this and a
// nudged town is stamped only by the chunks that happen to fall inside the
// un-nudged window, which is a town with holes in it.
const MAX_NUDGE = TRIES.reduce((m, [, ds]) => Math.max(m, Math.abs(ds)), 0);

function buildSite(gen, d, n) {
  const st = stateFor(gen);
  const s0 = stationS(gen, st, d, n);
  if (s0 < MIN_STATION_S) return null;
  REJECTS.offered++;
  const side0 = hash2(gen.seed + SALT + 2, d, n) < 0.5 ? 1 : -1;
  for (let k = 0; k < TRIES.length; k++) {
    const [flip, ds] = TRIES[k];
    const site = trySite(gen, st, d, n, flip ? -side0 : side0, s0 + ds);
    if (site) { REJECTS.built++; return site; }
  }
  return null;
}

function trySite(gen, st, d, n, side, s) {
  const roads = roadsFor(gen);
  if (s < MIN_STATION_S) return null;

  // The street runs along whichever world axis the road most nearly follows, so
  // the town reads as lying ALONG the road while every wall it builds stays
  // axis-aligned. A building rasterised in the road's own rotated frame comes out
  // as a staircase of leaking diagonal walls, which is a worse problem than a
  // town whose streets are not quite parallel to the lane.
  const streetAlongX = Math.abs(alongOf(d, 1, 0)) >= Math.abs(alongOf(d, 0, 1));

  // The town is themed by the ring of its STATION, not of its centre: how big it
  // is decides how far off the road it stands, so the ring has to be read before
  // the centre exists.
  const rc = roads.column(gen, d, s, 0, ROAD_COL);
  const ring = ringAt(rc[0], rc[1]);
  const plan = RING_PLAN[ring];
  const halfU = halfUOf(plan), halfV = halfVOf(plan);

  // How far off the centre line the town has to sit for its GRADED rectangle to
  // clear the road. The rectangle is world-aligned and the road is not, so on a
  // diagonal arterial a plain `halfV + gap` offset leaves a corner of the bank
  // lying across the paving — the support function is what makes the clearance
  // true on every bearing, at the cost of a longer approach lane out there.
  const hx = (streetAlongX ? halfU : halfV) + SKIRT;
  const hz = (streetAlongX ? halfV : halfU) + SKIRT;
  const support = hx * Math.abs(alongOf(d, 0, 1)) + hz * Math.abs(alongOf(d, 1, 0));
  const c = roads.column(gen, d, s, (support + ROAD_GAP) * side, SITE_COL);
  const tx = c[0], tz = c[1];
  if (nearHandBuilt(tx, tz)) { REJECTS.handBuilt++; return null; }

  const x0 = tx - (streetAlongX ? halfU : halfV), x1 = tx + (streetAlongX ? halfU : halfV);
  const z0 = tz - (streetAlongX ? halfV : halfU), z1 = tz + (streetAlongX ? halfV : halfU);
  // Which way the road lies from the town centre, and therefore which way is
  // "away from the road" in the town's own frame.
  const roadSign = (streetAlongX ? Math.sign(rc[1] - tz) : Math.sign(rc[0] - tx)) || 1;
  const vs = -roadSign;
  // Where the lane meets the town, decided here rather than in the layout so the
  // site's footprint — which is what the per-column claims test reads — already
  // includes the lane.
  const gateU = Math.round((hash2(gen.seed + SALT + 6, d, n) - 0.5) * plan.halfL * 1.2);
  const gateV = -(FRONT + plan.depth + plan.toft + 2);
  const gx = streetAlongX ? tx + gateU : tx + gateV * vs;
  const gz = streetAlongX ? tz + gateV * vs : tz + gateU;

  const gr0x = x0 - SKIRT, gr1x = x1 + SKIRT, gr0z = z0 - SKIRT, gr1z = z1 + SKIRT;
  const minX = Math.min(gr0x, gx - 4, rc[0] - 4), maxX = Math.max(gr1x, gx + 4, rc[0] + 4);
  const minZ = Math.min(gr0z, gz - 4, rc[1] - 4), maxZ = Math.max(gr1z, gz + 4, rc[1] + 4);

  // Nine columns first. Most refused sites are refused for relief, and the spread
  // of a subset can only ever be SMALLER than the spread of the whole platform —
  // so a nine-sample reading over MAX_RELIEF is a sound rejection at a fiftieth of
  // the cost. Siting is the expensive half of a town and most stations try several
  // placements, so this is worth its lines.
  {
    let clo = 1e9, chi = -1e9;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const h = gen.heightAt(tx + i * (halfU >> 1), tz + j * (halfV >> 1));
        if (h < clo) clo = h;
        if (h > chi) chi = h;
      }
    }
    if (chi - clo > MAX_RELIEF) { REJECTS.relief++; return null; }
  }

  // Natural ground under the site, on a PROBE-block grid over the GRADED
  // rectangle. This is the town's ONE reading of the terrain: the platform level,
  // how deep it has to found itself and the bank that lets it down to the country
  // all come from here, so every chunk agrees about them without sampling
  // anything itself. The lane is not in the grid — it reaches much further out on
  // a diagonal road, and quadrupling the grid to cover a three-wide path is a poor
  // trade; buildLane samples its own cells instead.
  const px0 = gr0x - PROBE, pz0 = gr0z - PROBE;
  const pnx = Math.ceil((gr1x + PROBE - px0) / PROBE) + 1;
  const pnz = Math.ceil((gr1z + PROBE - pz0) / PROBE) + 1;
  const probe = new Int16Array(pnx * pnz);
  let lo = 1e9, hi = -1e9, sum = 0, cnt = 0, gridHi = -1e9, wet = 0;
  for (let j = 0; j < pnz; j++) {
    for (let i = 0; i < pnx; i++) {
      const gxx = px0 + i * PROBE, gzz = pz0 + j * PROBE;
      const h = gen.heightAt(gxx, gzz);
      probe[j * pnx + i] = h;
      if (h > gridHi) gridHi = h;
      // Level and relief are judged over the PLATFORM only; the bank beyond it is
      // allowed to be as rough as the country is.
      if (gxx < x0 || gxx > x1 || gzz < z0 || gzz > z1) continue;
      if (h < lo) lo = h;
      if (h > hi) hi = h;
      if (h <= SEA + 1) wet++;
      sum += h; cnt++;
    }
  }
  if (!cnt) return null;
  // A little water inside the platform is fine — the levelling fills it, which is
  // what draining a town site actually was — but a plot that is mostly lake is not
  // a town, it is a causeway.
  if (wet > cnt * WET_TOLERANCE) { REJECTS.wet++; return null; }
  if (hi - lo > MAX_RELIEF) { REJECTS.relief++; return null; }  // gentle ground only

  const roadY = roads.surfaceY(gen, d, s);
  let padY = Math.round(sum / cnt);
  if (padY < roadY - MAX_ROAD_OFFSET) padY = roadY - MAX_ROAD_OFFSET;
  else if (padY > roadY + MAX_ROAD_OFFSET) padY = roadY + MAX_ROAD_OFFSET;
  if (padY <= SEA + 2) { REJECTS.low++; return null; }

  // Nothing may already own this ground: another arterial or fork wandering
  // across the plot, the hand-built lane out to the Frostwatch, or a town from a
  // neighbouring road.
  //
  // The scan covers the GRADED rectangle, not just the platform. The bank is
  // still earthwork — it lays its own surface — so a road clipping the corner of
  // it comes out as a stripe of grass across the paving. That is not theoretical:
  // the town is offset square to its own road and the rectangle is world-aligned,
  // so on the four diagonal arterials a corner of the bank reaches back across
  // the lane it came from. A 4-block scan cannot miss a road corridor, which is
  // over 7 wide.
  for (let z = gr0z; z <= gr1z + 3; z += 4) {
    const zz = z > gr1z ? gr1z : z;
    for (let x = gr0x; x <= gr1x + 3; x += 4) {
      if (roads.arterialAt(gen, x > gr1x ? gr1x : x, zz) >= 0) { REJECTS.onRoad++; return null; }
    }
  }
  if (trunkNear(gen, st, gr0x, gr0z, gr1x, gr1z)) { REJECTS.trunk++; return null; }
  if (!winsSite(gen, st, d, n, tx, tz)) { REJECTS.rival++; return null; }

  return {
    d, n, s, side, streetAlongX, vs, tx, tz, padY, roadY, ring, plan, gateU, gateV,
    x0, x1, z0, z1, gr0x, gr1x, gr0z, gr1z, minX, maxX, minZ, maxZ,
    probe, px0, pz0, pnx, pnz, natLo: lo, natHi: hi, gridHi,
    name: townName(gen, d, n),
  };
}

function townName(gen, d, n) {
  const a = NAME_HEAD[Math.floor(hash2(gen.seed + SALT + 3, d, n) * NAME_HEAD.length) % NAME_HEAD.length];
  const b = NAME_TAIL[Math.floor(hash2(gen.seed + SALT + 4, d, n) * NAME_TAIL.length) % NAME_TAIL.length];
  return a + b;
}

// Does the hand-built Frostwatch lane run through this plot? Bounding-box
// rejected first, because almost no site is anywhere near it.
function trunkNear(gen, st, x0, z0, x1, z1) {
  if (!gen.pathSet) return false;
  if (!st.trunk) {
    let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity;
    for (const k of gen.pathSet) {
      const i = k.indexOf(','), x = +k.slice(0, i), z = +k.slice(i + 1);
      if (x < a) a = x;
      if (x > b) b = x;
      if (z < c) c = z;
      if (z > e) e = z;
    }
    st.trunk = [a, b, c, e];
  }
  const t = st.trunk;
  if (x1 < t[0] || x0 > t[1] || z1 < t[2] || z0 > t[3]) return false;
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) if (gen.pathSet.has(x + ',' + z)) return true;
  }
  return false;
}

// Two towns closer than MIN_APART would overwrite each other's streets. Sites are
// totally ordered by (road, station), the test is symmetric and every term is a
// pure function of the seed — so exactly one of a colliding pair builds, and every
// chunk that touches it agrees which one. Same argument as the wayside crofts in
// roads.js.
function winsSite(gen, st, d, n, tx, tz) {
  const key = skey(d, n);
  for (let od = 0; od < PRIMARIES; od++) {
    const near = Math.round((alongOf(od, tx, tz) - st.phase[od]) / TOWN_SPACING);
    for (let on = near - 2; on <= near + 2; on++) {
      if (on < 0 || skey(od, on) >= key) continue;
      // Only a rival whose station is anywhere near ours can matter, and that test
      // is pure arithmetic — which is what keeps this from asking every station in
      // the world to site itself.
      if (Math.abs(stationS(gen, st, od, on) - alongOf(od, tx, tz)) > MAX_NUDGE + MAX_REACH * 2) continue;
      // Then compare against where the rival ACTUALLY stands. Recursion is safe
      // and terminates: a site only ever asks about STRICTLY LOWER keys, and each
      // answer is cached.
      const rival = siteAt(gen, od, on);
      if (!rival) continue;
      if (Math.abs(rival.tx - tx) < MIN_APART && Math.abs(rival.tz - tz) < MIN_APART) return false;
    }
  }
  return true;
}

export function siteAt(gen, d, n) {
  if (n < 0) return null;
  const st = stateFor(gen);
  return cached(st.sites, skey(d, n), () => buildSite(gen, d, n));
}

// Bilinear read of the site's natural-height probe grid. Called per column while
// stamping the bank and the lane, so it allocates nothing and never touches noise.
function natAt(site, x, z) {
  const fx = (x - site.px0) / PROBE, fz = (z - site.pz0) / PROBE;
  let i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0) i = 0; else if (i > site.pnx - 2) i = site.pnx - 2;
  if (j < 0) j = 0; else if (j > site.pnz - 2) j = site.pnz - 2;
  const tx = fx - i, tz = fz - j, p = site.probe, w = site.pnx;
  const a = p[j * w + i], b = p[j * w + i + 1], c = p[(j + 1) * w + i], e = p[(j + 1) * w + i + 1];
  return Math.round(a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz);
}

// ---- layout -----------------------------------------------------------------
// The full town: streets, plots, buildings, the lane out to the road, the
// defences, the people and their work. Built once per (seed, station) and cached;
// every chunk that touches the town walks this same list and draws its own slice.
function buildTownLayout(gen, d, n) {
  const site = siteAt(gen, d, n);
  if (!site) return null;
  const { tx, tz, padY, streetAlongX, vs, plan, ring } = site;
  const rand = mulberry32((gen.seed ^ Math.imul(d + 1, 374761393) ^ Math.imul(n + 1, 668265263) ^ SALT) >>> 0);
  const pick = (a) => a[Math.floor(rand() * a.length) % a.length];

  // Local frame: u along the high street, v across it with +v pointing AWAY from
  // the road. Everything below is authored in (u,v) and mapped here, once, so no
  // stamping code has to think about orientation.
  const WX = (u, v) => (streetAlongX ? tx + u : tx + v * vs);
  const WZ = (u, v) => (streetAlongX ? tz + v * vs : tz + u);
  const uAxisX = streetAlongX;

  const town = {
    key: skey(d, n), d, n, name: site.name, ring, plan, site,
    tx, tz, padY, base: padY, floor: padY + 1,
    x0: site.x0, x1: site.x1, z0: site.z0, z1: site.z1,
    minX: site.minX, maxX: site.maxX, minZ: site.minZ, maxZ: site.maxZ,
    clearTop: Math.max(site.gridHi + 3, padY + 4),
    paving: [], buildings: [], rooms: [], doors: [], fences: [], props: [],
    lane: [], nodes: [], chests: [], npcs: [], quests: [], marker: null,
  };
  const rect = (u0, v0, u1, v1, mat) => {
    const ax = WX(u0, v0), bx = WX(u1, v1), az = WZ(u0, v0), bz = WZ(u1, v1);
    town.paving.push({
      x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz), mat,
    });
  };

  const halfL = plan.halfL;
  const backV = FRONT + plan.depth + plan.toft;      // where the back lane runs
  const gateU = site.gateU;
  const marketU = Math.round(-gateU * 0.6);
  const mv = FRONT + 1;

  // ---- streets ------------------------------------------------------------
  rect(-halfL - 2, -STREET_HW, halfL + 2, STREET_HW, B.cobble);
  rect(-halfL - 2, -STREET_HW - 1, halfL + 2, -STREET_HW - 1, B.gravel);
  rect(-halfL - 2, STREET_HW + 1, halfL + 2, STREET_HW + 1, B.gravel);
  rect(-halfL - 1, -backV - 1, halfL + 1, -backV, B.gravel);
  rect(-halfL - 1, backV, halfL + 1, backV + 1, B.gravel);
  // The gate street: the road traffic's way through the near row.
  rect(gateU - 1, -backV - 2, gateU + 1, -FRONT, B.cobble);
  // The market: the street getting fat on the far side.
  rect(marketU - MARKET_HALF, STREET_HW + 1, marketU + MARKET_HALF, FRONT + MARKET_OUT - 1, B.cobble);

  // ---- what the ring adds, reserved BEFORE the plots are cut --------------
  // A reserved band is plot frontage the town spends on something bigger than a
  // house, so the burgage run has to know about it before it starts measuring.
  const reserved = { '-1': [], 1: [] };
  const forgeU = halfL - FORGE_LEN - 1;
  const keepU = -halfL;
  const hallU = marketU - 6;
  if (ring >= 1) reserved['-1'].push([forgeU - 2, halfL]);
  if (ring >= 2) reserved[1].push([hallU - 1, hallU + 13]);
  if (ring >= 3) reserved[1].push([keepU - 1, keepU + KEEP_LEN + 1]);

  // ---- burgage plots ------------------------------------------------------
  // Frontages vary, vennels pierce the terrace every third or fourth plot, and a
  // plot is occasionally left as a yard. That variation is most of what stops a
  // procedural street reading as a barracks.
  const clash = (rowSign, u0, u1) =>
    reserved[rowSign].some(([a, b]) => u1 >= a && u0 <= b);
  const marketBand = (u0, u1) => u1 >= marketU - MARKET_HALF && u0 <= marketU + MARKET_HALF;
  const rows = [];
  for (const rowSign of [-1, 1]) {
    const plots = [];
    let u = -halfL, since = 0;
    while (u + plan.front[0] <= halfL) {
      let w = randInt(rand, plan.front[0], plan.front[1]);
      if (u + w > halfL) w = halfL - u;
      if (w < plan.front[0]) break;
      const gateGap = rowSign < 0 && u <= gateU + 2 && u + w >= gateU - 2;
      if (gateGap || clash(rowSign, u, u + w)) { u += w; since = 0; continue; }
      plots.push({
        u0: u, u1: u + w, rowSign,
        stepBack: rowSign > 0 && marketBand(u, u + w) ? MARKET_OUT : 0,
      });
      u += w;
      if (++since >= 3 + (rand() < 0.5 ? 1 : 0)) { u += 2; since = 0; }   // a vennel
    }
    rows.push(plots);
  }

  const mix = HOUSE_MIX[ring];
  let houses = 0;
  for (const plots of rows) {
    // Decide what gets built BEFORE building any of it. A roof oversails its walls
    // by an eave or two, and an eave that reaches into the next house lands INSIDE
    // that house's upper room — a block of tile hanging in the bedroom, and one
    // more free floor cell the enterability test will not find. Knowing which
    // neighbours exist, and how far off they are, is what lets each roof clip its
    // own overhang to the gap it actually has.
    for (let i = 0; i < plots.length; i++) {
      const p = plots[i];
      if (rand() < plan.skip) continue;                       // a yard, not a house
      const wide = p.u1 - p.u0;
      let theme = pick(mix);
      if (wide >= 8 && houses > 1 && rand() < 0.3) theme = 'tavern';
      if (THEMES[theme].storeys > plan.storeys) theme = 'cottage';
      const prev = plots[i - 1];
      // A terrace: this plot shares its lower wall with the one before it.
      p.party = !!prev && prev.built && prev.u1 === p.u0 && prev.stepBack === p.stepBack && rand() < 0.55;
      p.theme = theme;
      p.built = true;
      houses++;
    }
    for (let i = 0; i < plots.length; i++) {
      const p = plots[i];
      if (!p.built) continue;
      let gapLo = 99, gapHi = 99;
      for (let k = i - 1; k >= 0; k--) if (plots[k].built) { gapLo = p.u0 - plots[k].u1; break; }
      for (let k = i + 1; k < plots.length; k++) if (plots[k].built) { gapHi = plots[k].u0 - p.u1; break; }
      const fv = FRONT + p.stepBack;
      addBuilding(town, {
        name: `${site.name} ${p.rowSign < 0 ? 'south' : 'north'} ${i + 1}`,
        theme: p.theme, rand, pick, plan, gapLo, gapHi,
        u0: p.u0, u1: p.u1, v0: p.rowSign * fv, v1: p.rowSign * (fv + plan.depth),
        rowSign: p.rowSign, partyLo: p.party, WX, WZ, uAxisX, base: padY,
      });
      // The toft behind: a fenced strip with a dug bed or two and the midden.
      const t0 = fv + plan.depth + 1, t1 = backV - 1;
      if (t1 > t0) {
        for (let u2 = p.u0; u2 <= p.u1; u2++) {
          if ((u2 - p.u0) % 4 === 3) continue;                // gate gap into the toft
          const v = p.rowSign * t1;
          town.fences.push({ x: WX(u2, v), z: WZ(u2, v) });
        }
        if (rand() < 0.8) {
          const fv2 = p.rowSign * (t0 + 1);
          for (let k = 0; k < 2 && p.u0 + 1 + k <= p.u1 - 1; k++) {
            town.nodes.push({ type: 'farm_plot', x: WX(p.u0 + 1 + k, fv2), z: WZ(p.u0 + 1 + k, fv2), bed: true });
          }
        }
      }
    }
  }

  // The forge, at the town end with a clear gap round it. Its bay opens onto the
  // street, which is how a forge worked.
  if (ring >= 1) {
    const b = addBuilding(town, {
      name: `${site.name} forge`, theme: 'smithy', rand, pick, plan,
      u0: forgeU, u1: forgeU + FORGE_LEN, v0: -FRONT, v1: -(FRONT + 6),
      rowSign: -1, WX, WZ, uAxisX, base: padY, stone: B.stone_brick,
    });
    for (const cu of [forgeU + 1, forgeU + 3]) {
      town.props.push({ kind: 'coal', x: WX(cu, -(FRONT + 8)), z: WZ(cu, -(FRONT + 8)) });
    }
    town.props.push({ kind: 'lamp', x: WX(forgeU - 1, -(FRONT + 1)), z: WZ(forgeU - 1, -(FRONT + 1)) });
    // Clear of the stations along the side walls and of the cart lane through the
    // bay: a chest dropped on the furnace deletes the furnace.
    town.chests.push({
      id: `st:${b.x0 + 3},${padY + 1},${b.z1 - 1}`, x: b.x0 + 3, y: padY + 1, z: b.z1 - 1,
      loot: [{ item: 'coal', qty: 3 }, { item: 'rough_stone', qty: 4 }],
    });
    town.forge = b;
  }
  // The moot hall: eaves-on and broad, which is the wealth signal — everything
  // else on the market turns its narrow gable to the street.
  if (ring >= 2) {
    town.hall = addBuilding(town, {
      name: `${site.name} moot hall`, theme: 'moothall', rand, pick, plan,
      u0: hallU, u1: hallU + 12, v0: FRONT + MARKET_OUT, v1: FRONT + MARKET_OUT + 7,
      rowSign: 1, WX, WZ, uAxisX, base: padY, stone: B.stone_brick,
    });
    town.props.push({
      kind: 'bell', x: WX(hallU - 2, FRONT + MARKET_OUT + 1), z: WZ(hallU - 2, FRONT + MARKET_OUT + 1),
    });
  }
  // The keep: the far ring's towns are held, not merely settled.
  if (ring >= 3) {
    const b = addBuilding(town, {
      name: `${site.name} keep`, theme: 'keep', rand, pick, plan,
      u0: keepU, u1: keepU + KEEP_LEN, v0: FRONT + 2, v1: FRONT + 2 + KEEP_LEN,
      rowSign: 1, WX, WZ, uAxisX, base: padY, stone: B.stone_brick, battlement: true,
    });
    // A bailey wall along the frontage, with the gate left open in the middle.
    for (let u2 = keepU - 1; u2 <= keepU + KEEP_LEN + 1; u2++) {
      if (Math.abs(u2 - (keepU + (KEEP_LEN >> 1))) <= 1) continue;
      town.fences.push({ x: WX(u2, FRONT), z: WZ(u2, FRONT), mat: B.stone_brick_wall, h: 2 });
    }
    town.chests.push({                                 // clear of the hearth
      id: `st:${b.x1 - 1},${padY + 1},${b.z1 - 1}`, x: b.x1 - 1, y: padY + 1, z: b.z1 - 1,
      loot: [{ item: 'coin', qty: 120 }, { item: 'iron_bar', qty: 2 }],
    });
    town.keep = b;
  }

  // ---- market furniture ---------------------------------------------------
  // Everything here keeps OFF the frontage line: the market stepped the far row
  // back, and the block in front of a door is that house's doorstep. A well-head
  // post standing in it seals the house as thoroughly as a missing doorway — and
  // it did, until the enterability sweep caught it.
  const prop = (kind, u, v, r, extra) => {
    const x = WX(u, v), z = WZ(u, v);
    for (const b of town.buildings) {
      if (x + r >= b.x0 - 1 && x - r <= b.x1 + 1 && z + r >= b.z0 - 1 && z - r <= b.z1 + 1) return;
    }
    town.props.push({ kind, x, z, ...extra });
  };
  prop('well', marketU - 3, mv, 1);
  prop('cross', marketU + 3, mv - 1, 2);
  prop('stall', marketU, mv + 1, 2, { alongX: uAxisX });
  for (const [lu, lv] of [
    [marketU - MARKET_HALF + 1, mv - 1], [marketU + MARKET_HALF - 1, mv - 1],
    [gateU + 2, -STREET_HW - 1], [-halfL, STREET_HW + 1], [halfL, -STREET_HW - 1],
  ]) prop('lamp', lu, lv, 0);

  // ---- defences -----------------------------------------------------------
  // A bank-and-palisade town at ring 1, a walled one from ring 2 — both with the
  // lane and both street ends left open, because a wall you cannot walk through
  // is a town you cannot walk into.
  if (plan.defence) {
    const mat = plan.defence === 'wall' ? B.cobble_wall : B.oak_log;
    const h = plan.defence === 'wall' ? 3 : 2;
    const ringU = halfL + 3, ringV = backV + 2;
    for (let u = -ringU; u <= ringU; u++) {
      if (Math.abs(u - gateU) > 2) town.fences.push({ x: WX(u, -ringV), z: WZ(u, -ringV), mat, h });
      town.fences.push({ x: WX(u, ringV), z: WZ(u, ringV), mat, h });
    }
    for (let v = -ringV; v <= ringV; v++) {
      if (Math.abs(v) <= STREET_HW + 1) continue;             // the street runs out of town
      town.fences.push({ x: WX(-ringU, v), z: WZ(-ringU, v), mat, h });
      town.fences.push({ x: WX(ringU, v), z: WZ(ringU, v), mat, h });
    }
    if (plan.defence === 'wall') {
      for (const gu of [gateU - 3, gateU + 3]) {
        town.props.push({ kind: 'gatetower', x: WX(gu, -ringV), z: WZ(gu, -ringV) });
      }
    }
  }

  buildLane(gen, town, d, site, WX, WZ);
  placePeople(gen, town, rand, WX, WZ, { gateU, marketU, halfL, mv, forgeU });
  town.marker = [town.tx, town.floor, town.tz];
  return town;
}

// ---- one building -----------------------------------------------------------
// Takes an EXPLICIT footprint in (u,v). A centre-plus-extent signature cannot
// express a party wall or a house sitting hard on a frontage line, and both are
// the whole point of a burgage terrace.
function addBuilding(town, o) {
  const T = THEMES[o.theme];
  const { WX, WZ, uAxisX } = o;
  const ax = WX(o.u0, o.v0), bx = WX(o.u1, o.v1), az = WZ(o.u0, o.v0), bz = WZ(o.u1, o.v1);
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
  const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  const wallH = T.wallH ?? 4;
  // A straight flight needs wallH+1 clear cells. A room that cannot hold one gets
  // a single storey rather than a staircase into a wall.
  const maxInterior = Math.max(x1 - x0, z1 - z0) - 1;
  const storeys = maxInterior >= wallH + 1 ? Math.min(T.storeys, o.plan.storeys) : 1;

  // The front faces the street: the -v side for the far row, the +v side for the
  // near row. o.rowSign is which row this is; the sign of v in world terms comes
  // from the frame.
  const vSignWorld = uAxisX ? Math.sign(WZ(0, 1) - WZ(0, 0)) : Math.sign(WX(0, 1) - WX(0, 0));
  let fdx = 0, fdz = 0;
  if (uAxisX) fdz = -o.rowSign * vSignWorld;
  else fdx = -o.rowSign * vSignWorld;

  const timber = o.pick(WOODS), infill = o.pick(INFILL);
  const stone = o.stone ?? o.pick(STONES);
  const doorId = o.pick(DOORS);
  // Gable to the street on a burgage house — the narrow end on the frontage, so
  // the ridge runs back into the plot. Eaves-on (ridge along the street) is the
  // wealth signal, and only the grand buildings get it.
  const ridgeAlongU = !!T.eavesOn;
  const ridgeAxis = (uAxisX === ridgeAlongU) ? 'x' : 'z';
  const b = {
    name: o.name, theme: o.theme, fit: T.fit, x0, x1, z0, z1,
    base: o.base, wallH, storeys, jetty: T.jetty ? 1 : 0,
    wall: T.wall, roof: T.roof, timber, infill, stone, doorId,
    doorTop: DOOR_TOP[doorId] ?? doorId,
    floorMat: T.wall === 'stone' ? stone : B.planks,
    fdx, fdz, ridgeAxis, bay: T.bay ?? 0, sign: !!T.sign,
    slits: !!T.slits, noWindows: !!T.noWindows, battlement: !!o.battlement,
    partyLo: !!o.partyLo, uAxisX,
    // How much clear ground there is to the neighbouring house on each side, ALONG
    // THE STREET. The roof clips its overhang to it, so no eave ever oversails
    // into the room next door.
    gapLo: o.gapLo ?? 99, gapHi: o.gapHi ?? 99,
  };
  // The doorway, centred on the front wall and nudged off centre on a wide
  // frontage so a terrace does not come out with every door in line.
  const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
  const nudge = (o.u1 - o.u0) >= 7 && o.rand() < 0.5 ? 1 : 0;
  b.dx = fdx !== 0 ? (fdx > 0 ? x1 : x0) : cx + (uAxisX ? nudge : 0);
  b.dz = fdz !== 0 ? (fdz > 0 ? z1 : z0) : cz + (uAxisX ? 0 : nudge);
  b.cx = cx; b.cz = cz;

  const FL = o.base + 1;
  for (let s = 0; s < storeys; s++) {
    const f = storeyFoot(b, s);
    town.rooms.push({
      name: b.name, storey: s, y: FL + s * (wallH + 1),
      x0: f.x0 + 1, z0: f.z0 + 1, x1: f.x1 - 1, z1: f.z1 - 1,
    });
  }
  town.doors.push({ name: b.name, x: b.dx, y: FL, z: b.dz, bay: b.bay });
  town.buildings.push(b);
  return b;
}

// The footprint of storey `s`. An upper storey oversails the street by a block —
// stylised from the ~0.5 m per storey a real jetty gave — but only once, however
// tall the house: two facing three-storey houses each jettying twice would close
// the street over your head.
function storeyFoot(b, s) {
  const over = b.jetty ? Math.min(s, 1) : 0;
  return {
    x0: b.x0 - (b.fdx < 0 ? over : 0), x1: b.x1 + (b.fdx > 0 ? over : 0),
    z0: b.z0 - (b.fdz < 0 ? over : 0), z1: b.z1 + (b.fdz > 0 ? over : 0),
  };
}

// ---- the lane out to the road ----------------------------------------------
// Baked cell by cell at layout time, because it is the one part of a town that
// negotiates with ground the town has not levelled: it starts on the platform and
// ends on the arterial's own graded surface, stepping at most a block at a time so
// it is walkable in both directions. Slab risers, since only stairs and slabs are
// steps you can walk up and the chunk sink carries no facing.
function buildLane(gen, town, d, site, WX, WZ) {
  const roads = roadsFor(gen);
  const c = roads.column(gen, d, site.s, 0, SITE_COL);
  const rx = c[0], rz = c[1];
  const gx = WX(site.gateU, site.gateV), gz = WZ(site.gateU, site.gateV);
  const dx = rx - gx, dz = rz - gz;
  const len = Math.hypot(dx, dz);
  if (len < 2) return;
  const vx = dx / len, vz = dz / len;
  const px = -vz, pz = vx;                          // across the lane
  const steps = Math.ceil(len * 2);
  const cells = new Map();
  const hold = 3 / len;                             // hold the road's own level at the end
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const tt = t > 1 - hold ? 1 : t / (1 - hold);
    const y = Math.round(town.padY + (site.roadY - town.padY) * tt);
    // Three paved columns, then two courses of graded shoulder either side. The
    // shoulder is what makes this a CUTTING rather than a slot: driving a
    // three-wide lane through a hillside and clearing three blocks over it leaves
    // a tunnel mouth with vertical earth walls, which reads as a mine adit, not as
    // the way into a town.
    for (let a = -3; a <= 3; a++) {
      const x = Math.round(gx + dx * t + px * a), z = Math.round(gz + dz * t + pz * a);
      const lift = Math.max(0, Math.abs(a) - 1);
      const prev = cells.get(x + ',' + z);
      if (prev && prev.lift <= lift) continue;      // paving wins over shoulder
      cells.set(x + ',' + z, { x, z, y, lift, edge: Math.abs(a) === 1, nat: gen.heightAt(x, z) });
    }
  }
  // A riser is any cell whose 4-neighbour along the lane is a block lower: that
  // cell has to be a slab, or you cannot walk up onto it.
  for (const cell of cells.values()) {
    let riser = false;
    if (!cell.lift) {
      for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nb = cells.get((cell.x + ox) + ',' + (cell.z + oz));
        if (nb && !nb.lift && nb.y === cell.y - 1) riser = true;
      }
    }
    town.lane.push({ x: cell.x, z: cell.z, y: cell.y, riser, edge: cell.edge, nat: cell.nat, lift: cell.lift });
  }
  town.gate = { x: gx, z: gz };
}

// ---- people and quests ------------------------------------------------------
function placePeople(gen, town, rand, WX, WZ, geo) {
  const ring = town.ring;
  // Who a town has depends on what it is: every town has a reeve and a trader, a
  // forge means a smith, a wall means a warden.
  const roles = ['reeve', 'trader'];
  if (ring >= 1) roles.push('smith');
  if (ring >= 2) roles.push('warden');
  roles.push(rand() < 0.5 ? 'herbalist' : 'drover');
  const spots = {
    reeve: [geo.marketU + 1, geo.mv + 3],
    trader: [geo.marketU - 1, geo.mv + 3],
    smith: [geo.forgeU + 4, -STREET_HW],
    warden: [geo.gateU + 2, -STREET_HW],
    herbalist: [geo.marketU + 5, geo.mv + 1],
    drover: [geo.gateU - 2, STREET_HW],
  };
  const biome = gen.biomeAt(town.tx, town.tz);
  for (let i = 0; i < Math.min(town.plan.npcs, roles.length); i++) {
    const role = roles[i];
    const ids = POOL_BY_ROLE.get(role);
    const id = ids[Math.floor(hash2(gen.seed + SALT + 5 + i, town.d, town.n) * ids.length) % ids.length];
    const [u, v] = spots[role];
    town.npcs.push({ id, role, x: WX(u, v), y: town.floor, z: WZ(u, v) });
  }
  for (const npc of town.npcs) {
    const q = makeQuest(gen, town, npc, biome, rand);
    if (!q) continue;
    // Every stage that does not already name a place points at THIS town. The
    // quest compass (js/game/quests.js `trackedMarker`) matches unmarked stages
    // against the hand-built landmarks by npc id, enemy type or item, and a
    // generated stage matches none of them — a `talk` stage fell through to the
    // the old town's market stall, so the arrow sent you home. Done here rather than
    // on each stage so a new quest shape cannot forget it.
    const here = `town_${town.d}_${town.n}`;   // the key registerTown publishes
    for (const st of q.stages) if (!st.marker) st.marker = here;
    town.quests.push(q);
  }
}

const label = (item) => ITEMS[item]?.label
  || item.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// Quest templates. Everything below is an ordinary QUESTS entry — same stage
// types, same rewards shape, same turn-in — so the existing QuestLog runs a
// generated quest with no parallel machinery.
function makeQuest(gen, town, npc, biome, rand) {
  const ring = town.ring;
  const role = ROLES.find((r) => r.key === npc.role);
  const scale = 1 + ring;
  const who = NPC_DEFS[npc.id].label;
  const base = {
    id: `st_${town.d}_${town.n}_${npc.role}`, giver: npc.id, generated: true, town: town.name,
    rewards: { coins: 20 + ring * 30 + Math.round(rand() * 15), xp: [] },
  };

  if (role.quest === 'fetch') {
    // Something the ground round this town actually grows or holds.
    const items = [];
    for (const src of [biome.nodes || [], biome.trees || []]) {
      for (const nd of src) {
        const def = NODE_TYPES[nd.type];
        for (const dr of def?.drops || []) if (dr.item && ITEMS[dr.item]) items.push([dr.item, def.skill]);
      }
    }
    if (!items.length) return null;
    const [item, skill] = items[Math.floor(rand() * items.length) % items.length];
    const count = 3 + ring * 2;
    return {
      ...base,
      name: `${town.name} Wants ${count} ${label(item)}`,
      intro: `Plain work, plainly paid: bring me ${count} ${label(item).toLowerCase()} out of the country round `
        + `${town.name}. It grows close enough that a day's walk covers it.`,
      outro: `That will do nicely. ${town.name} remembers a useful traveller.`,
      stages: [
        { type: 'collect', item, count, text: `Gather ${count} ${label(item)} near ${town.name}` },
        { type: 'talk', npc: npc.id, text: `Deliver them to ${who} in ${town.name}` },
      ],
      turnInCost: [{ item, qty: count }],
      rewards: { ...base.rewards, xp: [[skill || 'foraging', 40 * scale]] },
    };
  }

  if (role.quest === 'den') {
    const foes = (biome.enemies || []).filter((e) => (e.ring || 0) <= ring
      && ENEMY_TYPES[e.type]?.behavior === 'aggressive');
    if (!foes.length) return null;
    const foe = foes[Math.floor(rand() * foes.length) % foes.length].type;
    const count = 2 + ring;
    const lbl = ENEMY_TYPES[foe].label;
    return {
      ...base,
      name: `Clear the ${lbl} Den`,
      intro: `There is a den of ${lbl.toLowerCase()}s within a walk of ${town.name} and it is getting braver. `
        + `Put ${count} of them down and the herds can go out again.`,
      outro: `Quieter already. Take your pay, and ${town.name}'s thanks with it.`,
      stages: [
        { type: 'defeat', enemy: foe, count, text: `Defeat ${count} ${lbl}${count > 1 ? 's' : ''} near ${town.name}` },
        { type: 'talk', npc: npc.id, text: `Report to ${who} in ${town.name}` },
      ],
      rewards: {
        ...base.rewards,
        items: ring >= 2 ? [{ item: 'minor_healing_tonic', qty: 1 }] : [],
        xp: [['hunting', 50 * scale], ['defense', 30 * scale]],
      },
    };
  }

  // deliver: to the next town up this road that actually exists. Only the SITE is
  // consulted, never the layout, so a delivery lookup cannot recurse into another
  // town's quest generation.
  let next = null, nn = 0;
  for (let k = 1; k <= 3 && !next; k++) { next = siteAt(gen, town.d, town.n + k); nn = town.n + k; }
  if (!next) return null;
  return {
    ...base,
    name: `Word to ${next.name}`,
    intro: `Carry word up the road to ${next.name} — the next town along, and further than it sounds. `
      + `Keep to the paving and mind the waystones; there is little else out there to steer by.`,
    outro: `There and back. That is more than most of my messengers manage.`,
    stages: [
      { type: 'reach', marker: `town_${town.d}_${nn}`, radius: 26, text: `Travel up the road to ${next.name}` },
      { type: 'talk', npc: npc.id, text: `Return to ${who} in ${town.name}` },
    ],
    rewards: {
      ...base.rewards,
      coins: base.rewards.coins + 30,
      items: [{ item: 'travel_biscuit', qty: 2 }],
      xp: [['athletics', 60 * scale]],
    },
    deliverTo: [next.d, nn],
  };
}

// ---- registration -----------------------------------------------------------
// A town's PEOPLE and its QUESTS are not blocks, so they cannot ride the chunk
// sink. structures.js hands this module the live arrays world.js publishes as
// `world.structure.npcs` and `world.markers`, and a town pushes into them the
// first time it is discovered. main.js reads both live, every frame, so a
// villager appears the moment their town generates.
let SINK = null;
export function attachSettlementSink(refs) {
  SINK = refs ? { npcs: refs.npcs, markers: refs.markers, keys: new Set() } : null;
}
// Every town discovered so far, for the tests and for debugging.
export const SETTLEMENTS = new Map();
const QUEST_OFFER = new Map();     // giver id → the generated quest currently offered
const QUEST_TAKEN = new Set();     // …and the ones a player has actually accepted
on('questStarted', ({ quest }) => { if (quest?.generated) QUEST_TAKEN.add(quest.id); });

function noteTown(town) {
  SETTLEMENTS.set(town.key, town);
  if (SINK && !SINK.keys.has(town.key)) {
    SINK.keys.add(town.key);
    if (SINK.markers) SINK.markers[`town_${town.d}_${town.n}`] = town.marker.slice();
    if (SINK.npcs) {
      for (const npc of town.npcs) {
        SINK.npcs.push({ id: npc.id, x: npc.x, y: npc.y, z: npc.z, town: town.name });
      }
    }
  }
  registerQuests(town);
}

// Generated quests go into the real QUESTS array, so QuestLog.availableFrom, the
// dialogue hub, the tracker and the save treat them exactly like Maren's.
//
// THE ONE THING THE EXISTING QUEST SYSTEM CANNOT EXPRESS: `giver` names an NPC
// TYPE, and the pool that makes procedural villagers renderable at all (see the
// note on the villager pool) means two towns can share one. So when another town
// offers work through the same villager, the older offer is pruned — unless the
// player has already taken it, which is tracked from the questStarted event. That
// keeps the dialogue hub honest (the smith in front of you offers this town's job)
// at the cost of only one town's job per role being on the board at a time. The
// real fix is a per-instance giver key; see the report.
function registerQuests(town) {
  for (const q of town.quests) {
    if (QUESTS.some((existing) => existing.id === q.id)) continue;
    const stale = QUEST_OFFER.get(q.giver);
    if (stale && stale !== q.id && !QUEST_TAKEN.has(stale)) {
      const i = QUESTS.findIndex((existing) => existing.id === stale);
      if (i >= 0) QUESTS.splice(i, 1);
    }
    QUEST_OFFER.set(q.giver, q.id);
    QUESTS.push(q);
  }
}

export function settlementAt(gen, d, n) {
  if (n < 0) return null;
  const st = stateFor(gen);
  return cached(st.towns, skey(d, n), () => {
    const t = buildTownLayout(gen, d, n);
    if (t) noteTown(t);
    return t;
  });
}

// ---- stamping ---------------------------------------------------------------
export function stampSettlements(gen, cx, cz, sink) {
  const st = stateFor(gen);
  const wx = cx * CHUNK, wz = cz * CHUNK;
  beginStamp(sink, cx, cz, CHUNK);
  for (let d = 0; d < PRIMARIES; d++) {
    // Cheap reject on the chunk centre: how far along and across this road the
    // chunk sits decides whether any station could possibly reach it.
    const s = alongOf(d, wx + 7.5, wz + 7.5);
    const near = Math.round((s - st.phase[d]) / TOWN_SPACING);
    for (let n = near - 1; n <= near + 1; n++) {
      if (n < 0) continue;
      if (Math.abs(stationS(gen, st, d, n) - s) > MAX_REACH + MAX_NUDGE + 16) continue;
      const site = siteAt(gen, d, n);
      if (!site) continue;
      if (site.maxX < wx || site.minX > wx + CHUNK - 1) continue;
      if (site.maxZ < wz || site.minZ > wz + CHUNK - 1) continue;
      const town = settlementAt(gen, d, n);
      if (town) stampTown(town, cx, cz);
    }
  }
}

function stampTown(town, cx, cz) {
  if (!overlaps(town.minX, town.minZ, town.maxX, town.maxZ)) return;
  const x0 = cx * CHUNK, z0 = cz * CHUNK, x1 = x0 + CHUNK - 1, z1 = z0 + CHUNK - 1;
  const site = town.site, padY = town.padY;

  // ---- the platform and its bank -----------------------------------------
  // Level ground is what makes a whole town enterable by construction. The bank
  // outside steps down (or is cut back) toward the natural ground a block a
  // column, so the levelling reads as earthwork rather than a floating slab.
  const ax = Math.max(x0, site.gr0x), bx = Math.min(x1, site.gr1x);
  const az = Math.max(z0, site.gr0z), bz = Math.min(z1, site.gr1z);
  for (let x = ax; x <= bx; x++) {
    for (let z = az; z <= bz; z++) {
      const outX = x < site.x0 ? site.x0 - x : x > site.x1 ? x - site.x1 : 0;
      const outZ = z < site.z0 ? site.z0 - z : z > site.z1 ? z - site.z1 : 0;
      const k = outX > outZ ? outX : outZ;                 // rings out of the platform
      const nat = natAt(site, x, z);
      let y = padY;
      if (k > 0) y = nat < padY - k ? padY - k : nat > padY + k ? padY + k : nat;
      box(x, (nat < y ? nat : y) - 2, z, x, y - 1, z, B.dirt);
      put(x, y, z, B.grass);
      box(x, y + 1, z, x, town.clearTop, z, B.air);
    }
  }

  // ---- streets ------------------------------------------------------------
  for (const p of town.paving) {
    if (!overlaps(p.x0, p.z0, p.x1, p.z1)) continue;
    const px = Math.max(p.x0, x0), qx = Math.min(p.x1, x1);
    const pz = Math.max(p.z0, z0), qz = Math.min(p.z1, z1);
    for (let x = px; x <= qx; x++) {
      for (let z = pz; z <= qz; z++) {
        // Dressed stone worn into the cobble where the market days fell.
        put(x, padY, z, p.mat === B.cobble && ((x * 7 + z * 5) % 11 === 0) ? B.stone_brick : p.mat);
      }
    }
  }

  // ---- the lane out to the road ------------------------------------------
  for (const c of town.lane) {
    if (c.x < x0 || c.x > x1 || c.z < z0 || c.z > z1) continue;
    // A shoulder follows the ground it cuts, up to `lift` above the lane: level
    // where the lane is embanked, stepped back where it is in a cutting.
    const y = c.lift === 0 ? c.y
      : c.nat < c.y ? c.y : c.nat > c.y + c.lift ? c.y + c.lift : c.nat;
    box(c.x, (c.nat < y ? c.nat : y) - 3, c.z, c.x, y - 1, c.z, B.dirt);
    put(c.x, y, c.z, c.lift ? B.grass : c.riser ? STONE_STEP : c.edge ? B.gravel : B.cobble);
    // Clear to whichever is higher: headroom over the lane, or the ground it is
    // cutting through. Clearing a fixed four blocks leaves the hillside ARCHING
    // OVER the cutting further in, which reads as a tunnel mouth — the one thing
    // the shoulders above are there to stop.
    box(c.x, y + 1, c.z, c.x, (c.y + 4 > c.nat + 2 ? c.y + 4 : c.nat + 2), c.z, B.air);
  }

  // ---- fences, palisades, walls ------------------------------------------
  for (const f of town.fences) {
    if (f.x < x0 || f.x > x1 || f.z < z0 || f.z > z1) continue;
    box(f.x, padY + 1, f.z, f.x, padY + (f.h ?? 1), f.z, f.mat ?? B.planks_fence);
  }

  for (const b of town.buildings) drawBuilding(b);
  for (const p of town.props) drawProp(p, padY);

  for (const nd of town.nodes) {
    if (nd.bed) put(nd.x, padY, nd.z, B.farmland);
    putNode({ type: nd.type, x: nd.x, y: padY + 1, z: nd.z });
  }
  for (const ch of town.chests) putChest(ch);
}

// ---- drawing a building -----------------------------------------------------
// Nothing is ever written into the room volume, so an interior is hollow by
// construction: it is the air above the floor that no wall, deck or fitting has
// claimed. Filling it with air first would cost a couple of thousand wasted
// writes per building.
function drawBuilding(b) {
  const { x0, x1, z0, z1, base, wallH, storeys } = b;
  if (!overlaps(x0 - 4, z0 - 4, x1 + 4, z1 + 4)) return;
  const FL = base + 1;
  const storeyY = (s) => FL + s * (wallH + 1);

  // Stone plinth: timber kept off wet ground, one course proud of the wall line.
  box(x0 - 1, base - 2, z0 - 1, x1 + 1, base, z1 + 1, b.stone);
  box(x0, base, z0, x1, base, z1, b.floorMat);

  for (let s = 0; s < storeys; s++) {
    const f = storeyFoot(b, s);
    const ys = storeyY(s);
    // Party walls: a shared wall belongs to whichever neighbour drew it, so a
    // terrace comes out one wall thick instead of two.
    wallRun(b, f.x0, f.z0, f.x1, f.z0, ys, wallH, b.partyLo && !b.uAxisX);
    wallRun(b, f.x0, f.z1, f.x1, f.z1, ys, wallH, false);
    wallRun(b, f.x0, f.z0, f.x0, f.z1, ys, wallH, b.partyLo && b.uAxisX);
    wallRun(b, f.x1, f.z0, f.x1, f.z1, ys, wallH, false);
    for (const [ex, ez] of CORNERS) {
      const px = ex ? f.x1 : f.x0, pz = ez ? f.z1 : f.z0;
      box(px, ys, pz, px, ys + wallH - 1, pz, b.wall === 'stone' ? b.stone : b.timber);
    }
    // Windows are OPENINGS, not decals: the pane replaces the wall block, so
    // daylight actually comes through it.
    if (!b.noWindows) {
      const glass = b.slits ? B.iron_bars : B.glasspane;
      const wy = ys + 2;
      for (let x = f.x0 + 2; x <= f.x1 - 2; x += 3) {
        if (!(s === 0 && b.fdz !== 0 && x === b.dx)) {
          put(x, wy, f.z1, glass); put(x, wy, f.z0, glass);
        }
      }
      for (let z = f.z0 + 2; z <= f.z1 - 2; z += 3) {
        if (!(s === 0 && b.fdx !== 0 && z === b.dz)) {
          put(f.x0, wy, z, glass); put(f.x1, wy, z, glass);
        }
      }
    }
    // The deck over this storey doubles as the next one's floor.
    if (s < storeys - 1) {
      const g = storeyFoot(b, s + 1);
      box(g.x0, ys + wallH, g.z0, g.x1, ys + wallH, g.z1, b.floorMat);
    }
  }

  // ---- roof --------------------------------------------------------------
  const top = storeyFoot(b, storeys - 1);
  const yRoof = storeyY(storeys - 1) + wallH;
  const R = ROOFS[b.roof] || ROOFS.thatch;
  if (b.battlement) {
    // A keep is capped, not gabled: a flat leaded roof behind a parapet.
    box(top.x0, yRoof, top.z0, top.x1, yRoof, top.z1, b.stone);
    for (let x = top.x0 - 1; x <= top.x1 + 1; x++) {
      for (let z = top.z0 - 1; z <= top.z1 + 1; z++) {
        if (x !== top.x0 - 1 && x !== top.x1 + 1 && z !== top.z0 - 1 && z !== top.z1 + 1) continue;
        put(x, yRoof, z, b.stone);
        if (((x + z) & 1) === 0) put(x, yRoof + 1, z, B.stone_brick_wall);
      }
    }
  } else {
    // Deep eaves throw the shadow line that makes a roof read as a roof — but a
    // gable rises half its span, so two courses of eave on a six-wide cottage
    // would bury its walls under the hat.
    const span = b.ridgeAxis === 'x' ? top.z1 - top.z0 : top.x1 - top.x0;
    const e = span >= 8 ? 2 : 1;
    // Which of the roof's overhangs point ALONG the street — the direction the
    // neighbours are in. On a burgage house (gable to the street) that is the two
    // slopes; on an eaves-on building it is the two gable ends.
    const uIsSlope = (b.ridgeAxis === 'x') !== b.uAxisX;
    const clipLo = b.partyLo ? 0 : b.gapLo, clipHi = b.gapHi;
    const loOver = uIsSlope ? Math.min(e, clipLo) : e;
    const hiOver = uIsSlope ? Math.min(e, clipHi) : e;
    const gableOver = uIsSlope ? 1 : Math.min(1, clipLo, clipHi);
    const ridge = drawRoof(top.x0, top.z0, top.x1, top.z1, yRoof, R.mat, R.cap, b.ridgeAxis,
      loOver, hiOver, gableOver, b.infill);
    // Close the wall head up to the roof underside, so the loft is sealed and the
    // only ways in are the door and the windows.
    sealWallHead(b, top, yRoof, loOver, hiOver);
    // The stack rides IN the wall line so it never eats floor, and the fire sits
    // on the room side of it. A chimney that lands on nothing is a pipe.
    if (b.fit !== 'barn' && b.fit !== 'forge') {
      box(x0 + 1, FL, z0, x0 + 1, ridge + 2, z0, b.stone);
      put(x0 + 1, ridge + 3, z0, B.campfire);
    }
  }

  // ---- the way in --------------------------------------------------------
  const perpX = b.fdx !== 0 ? 0 : 1, perpZ = b.fdx !== 0 ? 1 : 0;
  if (b.bay) {
    // A forge worked with its front open to the street, and a barn needs cart
    // doors, so those get a bay rather than a door leaf.
    const r = (b.bay - 1) >> 1;
    for (let a = -r; a <= r; a++) {
      box(b.dx + perpX * a, FL, b.dz + perpZ * a, b.dx + perpX * a, FL + 2, b.dz + perpZ * a, B.air);
    }
    for (let a = -r - 1; a <= r + 1; a++) put(b.dx + perpX * a, FL + 3, b.dz + perpZ * a, b.timber);
  } else {
    // Both leaves of a two-block door. A one-block leaf under an empty head reads
    // as a hatch.
    put(b.dx, FL, b.dz, b.doorId);
    put(b.dx, FL + 1, b.dz, b.doorTop);
  }

  fitOut(b, FL);

  // ---- vertical circulation ----------------------------------------------
  // A STRAIGHT flight against a wall, one riser a block, laid as SLABS: a step is
  // only walkable if it is a stair or a slab (World.isStep), and a slab needs no
  // facing, which the chunk sink cannot carry. The flight runs all the way UP TO
  // the storey above — the top tread sits at deck level, so standing on it puts
  // you exactly on the upper floor and you step off sideways. A flight one riser
  // short is a dead end, which is what a plain full-block landing became when
  // walkable steps were narrowed to stairs and slabs.
  for (let s = 0; s + 1 < storeys; s++) {
    const f = storeyFoot(b, s);
    const ys = storeyY(s), deck = ys + wallH;
    const wide = (f.x1 - f.x0) >= (f.z1 - f.z0);
    const need = wallH + 1;
    const lo = (wide ? f.x0 : f.z0) + 1, hi = (wide ? f.x1 : f.z1) - 1;
    if (hi - lo + 1 < need) continue;
    const far = s % 2 === 1;
    const dir = far ? -1 : 1;
    const start = far ? Math.min(hi, lo + need - 1) : Math.max(lo, hi - need + 1);
    // Every flight shares ONE bay against a wall, in adjacent rows, alternating
    // direction storey by storey so an upper riser never lands on the flight
    // below's top tread. Which wall is not free choice — it has to dodge two
    // things:
    //  · THE DOORWAY. The threshold sweep clears two cells inside the door last of
    //    all, and a flight hugging the front wall loses its bottom treads to it —
    //    a staircase with no first step, and an upstairs you cannot reach.
    //  · A PARTY WALL. The neighbour's roof eave oversails that one, so a flight
    //    under it climbs into a tiled ceiling.
    const wallLo = (wide ? f.z0 : f.x0) + 1, wallHi = (wide ? f.z1 : f.x1) - 1;
    const front = wide ? b.fdz : b.fdx;                // is the front wall a side wall?
    const avoidLo = front < 0 || (!wide && b.partyLo && b.uAxisX) || (wide && b.partyLo && !b.uAxisX);
    const avoidHi = front > 0;
    const useLo = avoidLo && !avoidHi ? false : true;
    const side = (useLo ? wallLo : wallHi) + (far ? (useLo ? 1 : -1) : 0);
    for (let i = 0; i <= wallH; i++) {
      const sx = wide ? start + dir * i : side, sz = wide ? side : start + dir * i;
      box(sx, ys, sz, sx, deck, sz, B.air);            // clear the shaft, deck included
    }
    for (let i = 0; i <= wallH; i++) {
      const sx = wide ? start + dir * i : side, sz = wide ? side : start + dir * i;
      put(sx, ys + i, sz, SLAB);
    }
  }

  // ---- sweep the threshold, LAST -----------------------------------------
  // A fit-out laid out from the interior corners has no idea where the door ended
  // up, and a barrel parked in the cell behind it seals the house just as
  // completely as a missing doorway.
  const r = b.bay ? (b.bay - 1) >> 1 : 0;
  for (let dd = 1; dd <= 2; dd++) {
    for (let a = -r; a <= r; a++) {
      const sx = b.dx - b.fdx * dd + perpX * a, sz = b.dz - b.fdz * dd + perpZ * a;
      put(sx, FL, sz, B.air);
      put(sx, FL + 1, sz, B.air);
    }
  }
  // A lantern set INTO the wall head beside the way in: a post in a five-wide
  // street is a bollard and a glowing cube in your eyeline.
  put(b.dx, FL + 3, b.dz, B.sea_lantern);
  if (b.sign) {                                        // trade sign on a bracket
    put(b.dx + b.fdx + perpX, FL + 3, b.dz + b.fdz + perpZ, b.timber);
    put(b.dx + b.fdx * 2 + perpX, FL + 3, b.dz + b.fdz * 2 + perpZ, B.sign);
  }
}

const CORNERS = [[0, 0], [1, 0], [0, 1], [1, 1]];

function wallRun(b, ax, az, bx, bz, y, h, skip) {
  if (skip) return;
  if (b.wall === 'stone') { box(ax, y, az, bx, y + h - 1, bz, b.stone); return; }
  if (b.wall === 'plank') { box(ax, y, az, bx, y + h - 1, bz, B.planks); return; }
  // A framed wall: pale infill, sill and head beams, studs every third block.
  box(ax, y, az, bx, y + h - 1, bz, b.infill);
  box(ax, y, az, bx, y, bz, b.timber);
  box(ax, y + h - 1, az, bx, y + h - 1, bz, b.timber);
  const horiz = bx - ax >= bz - az;
  const n = horiz ? bx - ax : bz - az;
  for (let i = 3; i < n; i += 3) {
    const sx = horiz ? ax + i : ax, sz = horiz ? az : az + i;
    box(sx, y + 1, sz, sx, y + h - 2, sz, b.timber);
  }
}

// A gabled roof in full courses with a slab ridge. Watertight the same way a
// stair roof is: course L covers the two columns L in from each eave, so the
// lower course always blocks the sight line into the step above it, and the gable
// ends are filled solid below the slope. `ridgeAxis` is the axis the RIDGE runs
// along; the slope descends across the other one.
function drawRoof(x0, z0, x1, z1, yBase, mat, cap, ridgeAxis, loOver, hiOver, gableOver, gableMat) {
  const alongX = ridgeAxis === 'x';
  const a0 = (alongX ? z0 : x0) - loOver, a1 = (alongX ? z1 : x1) + hiOver;
  const b0 = (alongX ? x0 : z0) - gableOver, b1 = (alongX ? x1 : z1) + gableOver;
  const half = Math.floor((a1 - a0) / 2);
  for (let L = 0; L <= half; L++) {
    const y = yBase + L, lo = a0 + L, hi = a1 - L;
    if (lo >= hi) {
      if (alongX) box(b0, y, lo, b1, y, lo, cap);
      else box(lo, y, b0, lo, y, b1, cap);
      continue;
    }
    if (alongX) {
      box(b0, y, lo, b1, y, lo, mat);
      box(b0, y, hi, b1, y, hi, mat);
      for (const bEnd of [b0, b1]) {
        box(bEnd, yBase, lo, bEnd, y - 1, lo, gableMat);
        box(bEnd, yBase, hi, bEnd, y - 1, hi, gableMat);
      }
    } else {
      box(lo, y, b0, lo, y, b1, mat);
      box(hi, y, b0, hi, y, b1, mat);
      for (const bEnd of [b0, b1]) {
        box(lo, yBase, bEnd, lo, y - 1, bEnd, gableMat);
        box(hi, yBase, bEnd, hi, y - 1, bEnd, gableMat);
      }
    }
  }
  return yBase + half;
}

function sealWallHead(b, top, yRoof, loOver, hiOver) {
  const alongX = b.ridgeAxis === 'x';
  const a0 = (alongX ? top.z0 : top.x0) - loOver, a1 = (alongX ? top.z1 : top.x1) + hiOver;
  const mat = b.wall === 'stone' ? b.stone : b.infill;
  for (let x = top.x0; x <= top.x1; x++) {
    for (let z = top.z0; z <= top.z1; z++) {
      if (x !== top.x0 && x !== top.x1 && z !== top.z0 && z !== top.z1) continue;
      const a = alongX ? z : x;
      const L = Math.min(a - a0, a1 - a);
      if (L > 0) box(x, yRoof, z, x, yRoof + L - 1, z, mat);
    }
  }
}

// ---- interiors --------------------------------------------------------------
// A room reads as lived-in through its furniture, not its floor area. Every
// fitting stands ON the floor, so the walkable floor the enterability test checks
// is honestly reduced by whatever is in the way.
function fitOut(b, FL) {
  const ix0 = b.x0 + 1, iz0 = b.z0 + 1, ix1 = b.x1 - 1, iz1 = b.z1 - 1;
  if (ix1 - ix0 < 1 || iz1 - iz0 < 1) return;
  const bed = (x, z, rich) => {
    put(x, FL, z, rich ? B.red_wool : B.thatch);
    put(x, FL, z - 1, rich ? B.red_wool : B.thatch);
    put(x, FL, z - 2, B.white_wool);
  };
  const table = (x, z, len, dx) => {
    for (let i = 0; i < len; i++) { put(x + dx * i, FL, z, B.planks_fence); put(x + dx * i, FL + 1, z, SLAB); }
  };
  const light = (x, z) => put(x, FL + 2, z, B.torch_post);
  // The fire lands on the room side of the chimney breast, which stands in the
  // x0 wall at z0 — a stack that heats nothing is a pipe.
  const hearth = () => put(b.x0 + 1, FL, b.z0 + 1, B.campfire);

  if (b.fit === 'home' || b.fit === 'byre') {
    bed(ix1, iz1, false);
    table(ix0 + 2, iz1, Math.min(2, Math.max(1, ix1 - ix0 - 1)), 1);
    put(ix1, FL, iz0 + 1, B.cauldron);
    put(ix1 - 1, FL, iz0, B.chest_block);
    light(ix0, iz1 - 1);
    if (b.fit === 'byre' && iz0 + 2 < iz1) {
      // A longhouse is one roof over people and beasts, byre at the low end.
      for (let x = ix0 + 2; x <= ix1; x++) put(x, FL, iz0, B.thatch);
      for (let x = ix0 + 3; x <= ix1; x++) put(x, FL + 1, iz0 + 1, B.planks_fence);
    }
    hearth();
  } else if (b.fit === 'merchant') {
    bed(ix1, iz1, true);
    put(ix0, FL, iz1, B.chest_block);
    table(ix1 - 1, iz0 + 1, 2, -1);
    put(ix0, FL, iz0 + 2, B.note_block);
    light(ix1, iz0 + 1);
    hearth();
  } else if (b.fit === 'shop') {
    // Trade at the front, living behind.
    table(ix0 + 1, iz1, Math.min(3, Math.max(1, ix1 - ix0)), 1);
    put(ix1, FL, iz1, B.chest_block);
    put(ix1, FL, iz0 + 1, B.note_block);
    put(ix0 + 1, FL, iz0 + 1, B.lectern);
    light(ix1, iz1);
    hearth();
  } else if (b.fit === 'tavern') {
    for (let z = iz0 + 1; z <= iz1 - 1; z += 3) {
      table(ix0 + 2, z, Math.min(3, Math.max(1, ix1 - ix0 - 2)), 1);
      put(ix0 + 1, FL, z, SLAB);
    }
    for (let z = iz0 + 1; z <= iz1; z++) put(ix1, FL, z, SLAB);          // the bar
    put(ix1, FL, iz0, B.cauldron);
    light(ix0, iz0 + 1);
    hearth();
  } else if (b.fit === 'forge') {
    // Every craft station a town needs, under one roof, along the side walls and
    // clear of the cart lane through the open bay.
    put(ix0, FL, iz0 + 1, B.furnace);
    put(ix0, FL, iz0 + 3, B.anvil_block);
    put(ix0, FL, iz1, B.workbench);
    put(ix1, FL, iz0 + 1, B.construction_bench);
    put(ix1, FL, iz0 + 3, B.loom_block);
    put(ix1, FL, iz1, B.alchemy_table);
    light(ix0, iz0 + 2);
    light(ix1, iz0 + 2);
  } else if (b.fit === 'barn') {
    for (let x = ix0; x <= ix1; x++) put(x, FL, iz0, B.thatch);
    put(ix1, FL, iz1, B.note_block);
    put(ix1 - 1, FL, iz1, B.cauldron);
    light(ix0, iz1);
  } else if (b.fit === 'hall') {
    for (let z = iz0 + 1; z <= iz1 - 1; z += 2) {
      put(ix0 + 1, FL, z, SLAB);
      put(ix1 - 1, FL, z, SLAB);
    }
    put(b.cx, FL, iz0 + 1, B.lectern);
    light(ix0, iz0 + 1);
    light(ix1, iz1 - 1);
    hearth();
  } else if (b.fit === 'keep') {
    table(ix0 + 2, iz1 - 1, 2, 1);
    light(ix0, iz0 + 1);
    light(ix1, iz1 - 1);
    hearth();
  }
  put(b.cx, FL + b.wallH - 1, b.cz, B.sea_lantern);       // hung from the ridge
}

// ---- street furniture -------------------------------------------------------
function drawProp(p, padY) {
  const FL = padY + 1;
  if (p.kind === 'lamp') {
    if (!overlaps(p.x, p.z, p.x, p.z)) return;
    box(p.x, FL, p.z, p.x, FL + 2, p.z, B.planks_fence);
    put(p.x, FL + 3, p.z, B.sea_lantern);
  } else if (p.kind === 'well') {
    if (!overlaps(p.x - 1, p.z - 1, p.x + 1, p.z + 1)) return;
    box(p.x - 1, padY, p.z - 1, p.x + 1, padY, p.z + 1, B.cobble);
    put(p.x, padY - 2, p.z, B.cobble);
    put(p.x, padY - 1, p.z, B.water);
    put(p.x, padY, p.z, B.air);
    for (const [dx, dz] of DIAG) box(p.x + dx, FL, p.z + dz, p.x + dx, FL + 2, p.z + dz, B.oak_log);
    box(p.x - 1, FL + 3, p.z - 1, p.x + 1, FL + 3, p.z + 1, B.thatch);
  } else if (p.kind === 'cross') {
    if (!overlaps(p.x - 2, p.z - 2, p.x + 2, p.z + 2)) return;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 2) put(p.x + dx, padY, p.z + dz, B.stone_brick);
      }
    }
    box(p.x, FL, p.z, p.x, FL + 3, p.z, B.cobble_wall);
    put(p.x, FL + 4, p.z, B.sea_lantern);
    for (const [dx, dz] of ORTHO) put(p.x + dx, FL, p.z + dz, B.stone_brick_slab);
  } else if (p.kind === 'stall') {
    if (!overlaps(p.x - 2, p.z - 2, p.x + 2, p.z + 2)) return;
    const dx = p.alongX ? 1 : 0, dz = p.alongX ? 0 : 1;
    for (let a = -1; a <= 1; a++) put(p.x + dx * a, FL, p.z + dz * a, SLAB);
    box(p.x - dx * 2, FL, p.z - dz * 2, p.x - dx * 2, FL + 2, p.z - dz * 2, B.oak_log);
    box(p.x + dx * 2, FL, p.z + dz * 2, p.x + dx * 2, FL + 2, p.z + dz * 2, B.oak_log);
    for (let a = -2; a <= 2; a++) put(p.x + dx * a, FL + 3, p.z + dz * a, (a & 1) ? B.thatch : B.white_wool);
  } else if (p.kind === 'coal') {
    put(p.x, FL, p.z, B.coal_seam);
  } else if (p.kind === 'bell') {
    if (!overlaps(p.x, p.z, p.x, p.z)) return;
    box(p.x, FL, p.z, p.x, FL + 5, p.z, B.oak_log);
    put(p.x, FL + 4, p.z, B.sea_lantern);
    put(p.x, FL + 6, p.z, B.bell);
  } else if (p.kind === 'gatetower') {
    if (!overlaps(p.x, p.z, p.x, p.z)) return;
    box(p.x, FL, p.z, p.x, FL + 5, p.z, B.stone_brick);
    put(p.x, FL + 6, p.z, B.cobble_wall);
    put(p.x, FL + 7, p.z, B.sea_lantern);
  }
}
const DIAG = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ---- queries ----------------------------------------------------------------
// Surface columns a town owns. The world's vegetation/node/mob scatter consults
// this (js/world/structures.js `structureClaims`) so a tree does not sprout
// through a roof and a wolf does not spawn in the market. Unlike a mineshaft's
// headframe, a town claims its WHOLE footprint: it is a paved place, and the bald
// square that leaves is exactly right.
//
// Runs per column for every chunk in the world, so the fast path is scalar maths
// and a numeric-keyed cache lookup — no strings, no allocation.
export function settlementClaims(gen, x, z) {
  const st = stateFor(gen);
  // The scatter pass walks a chunk column by column, so work out ONCE per chunk
  // which towns could possibly reach it and then answer each column with a
  // bounding-box test. Nearly every chunk in the world ends up with an empty
  // candidate list, which is the case that has to be free.
  const cx = x >> 4, cz = z >> 4;
  if (cx !== st.claimCx || cz !== st.claimCz) {
    st.claimCx = cx; st.claimCz = cz;
    st.claimHits.length = 0;
    const wx = cx * CHUNK + 7.5, wz = cz * CHUNK + 7.5;
    for (let d = 0; d < PRIMARIES; d++) {
      const s = alongOf(d, wx, wz);
      if (s < MIN_STATION_S - MAX_REACH - MAX_NUDGE) continue;
      const t = acrossOf(d, wx, wz);
      if ((t < 0 ? -t : t) > AMP_MAX + MAX_REACH + CHUNK) continue;
      const n = Math.round((s - st.phase[d]) / TOWN_SPACING);
      if (n < 0) continue;
      if (Math.abs(stationS(gen, st, d, n) - s) > MAX_REACH + MAX_NUDGE + CHUNK) continue;
      const site = siteAt(gen, d, n);
      if (!site) continue;
      if (site.maxX < cx * CHUNK || site.minX > cx * CHUNK + CHUNK - 1) continue;
      if (site.maxZ < cz * CHUNK || site.minZ > cz * CHUNK + CHUNK - 1) continue;
      st.claimHits.push(site);
    }
  }
  for (let i = 0; i < st.claimHits.length; i++) {
    const site = st.claimHits[i];
    if (x >= site.minX && x <= site.maxX && z >= site.minZ && z <= site.maxZ) return true;
  }
  return false;
}

// Is a town within `pad` of this column? Offered to the other procedural site
// modules (mineshafts, dungeons) so a shaft head never lands in a market square.
export function settlementNear(gen, x, z, pad = 0) {
  const st = stateFor(gen);
  for (let d = 0; d < PRIMARIES; d++) {
    const s = alongOf(d, x, z);
    const n = Math.round((s - st.phase[d]) / TOWN_SPACING);
    if (n < 0) continue;
    if (Math.abs(stationS(gen, st, d, n) - s) > MAX_REACH + MAX_NUDGE + pad) continue;
    const site = siteAt(gen, d, n);
    if (!site) continue;
    if (x < site.minX - pad || x > site.maxX + pad || z < site.minZ - pad || z > site.maxZ + pad) continue;
    return true;
  }
  return false;
}

// Test/debug helper: the first town found walking out along the arterials.
export function findSettlement(gen, span = 4) {
  for (let n = 0; n <= span; n++) {
    for (let d = 0; d < PRIMARIES; d++) {
      const t = settlementAt(gen, d, n);
      if (t) return t;
    }
  }
  return null;
}

// Every town within `span` stations of spawn, on every arterial.
export function allSettlements(gen, span = 3) {
  const out = [];
  for (let d = 0; d < PRIMARIES; d++) {
    for (let n = 0; n <= span; n++) {
      const t = settlementAt(gen, d, n);
      if (t) out.push(t);
    }
  }
  return out;
}
