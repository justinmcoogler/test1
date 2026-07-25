// Brookhollow — a medieval market town, built rather than imported.
//
// HOW A REAL MEDIEVAL TOWN WAS LAID OUT (and why this one is shaped like this)
//  1. BURGAGE PLOTS. The town is a row of narrow strips at right angles to the
//     street. Frontage was the scarce good and depth was nearly free, so plots
//     ran ~1:4 to 1:10 — a measured 8.1 m average frontage on Elgin High Street,
//     with the toft (garden, privy, pig, midden, well) running back to a lane.
//     1 perch = 5.03 m, so at one block to the metre a perch is 5 blocks and the
//     module here is 5–9 blocks of frontage.
//  2. TRUNCATED DEPTH — deliberately. A full plot ran 60 m back; two facing rows
//     plus a street would need 136 blocks and this site has 68. So the plots are
//     cut to ~11 blocks of garden. The street-facing morphology is what reads;
//     the back of the toft is the part we can afford to lose.
//  3. A FUNNEL MARKET. The market is not a square, it is the street getting fat:
//     narrow and climbing at the kirk end, widest at the low end where the roads
//     and the water meet (Fethard, Cashel, Telč). It does far more work than a
//     plaza at this scale.
//  4. MARKET INFILL. Stalls that stood on the same spot every market day became
//     booths, then buildings. That encroachment leaves an ISLAND BLOCK mid-market
//     with a wide Market Place on one side and a mean narrow lane — the Shambles
//     — on the other. Ludlow and York. This one gesture encodes three centuries
//     of town history and is the difference between a town and a film set.
//  5. NO SETBACK, PARTY WALLS. Houses sit hard on the frontage line and touch
//     their neighbours. A freestanding house ringed by grass reads as wrong.
//  6. GABLE TO THE STREET, JETTIED. The narrow triangular end faces the street on
//     a burgage house; eaves-on (ridge parallel, wide frontage) is the wealth
//     signal, so only the moot hall, the inn and the craft hall get it. Upper
//     floors oversail by ~0.5 m per storey — one block, stylised.
//  7. NUISANCE TRADES OUT. Fire hooks stood ready to pull burning thatch off
//     roofs, so the forge sits at the town edge on the mine road with a gap
//     around it. The tanning yard is downhill and downwind, west, past the backs.
//  8. THE KIRK COMMANDS THE HIGH GROUND at the narrow end, up a stepped street;
//     the market cross and the moot hall stand in the wide end below it.
//  9. THE MAIN STREET FOLLOWS THE CONTOUR and stays walkable; the PLOTS absorb
//     the slope, stepping down in terraces behind their retaining plinths.
// 10. DEFORM, DON'T REPEAT. Frontages vary 5–9, the street kinks at its middle,
//     vennels pierce the terrace every third or fourth plot.
//
// HOW A HOUSE READS AS MEDIEVAL
//  · timber frame — dark posts over pale infill, sill and head beams, studs
//  · stone plinth — timber kept off wet ground, and on a slope it terraces
//  · jettied upper storeys, deep eaves that throw a shadow line
//  · chimneys breaking the roofline, smoking
//  · variety inside one palette, so ten buildings read as one place
//
// AND A HOUSE YOU CAN LIVE IN. Every building here is hollow, has a doorway with
// two blocks of headroom from the street through to the room, is furnished, and
// has a real stair through a real hole to any upper floor. tests/unit/town.test.mjs
// flood-fills the whole settlement from outside and proves it.
//
// The caller supplies the primitives so this module stays pure geometry.

// The enterability test needs to know where the rooms ARE, and buildTown's
// signature belongs to structures.js. So the plan is published here instead, in
// authored coordinates. `marenAuthoredY` lets a caller recover the vertical lift
// structures.js applies (compare against the pushed NPC) without reaching into
// that module's private constant.
export const TOWN_PLAN = { rooms: [], doors: [], marenAuthoredY: 0 };

// Deterministic per-town RNG: the same seed always rebuilds the same town.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function buildTown(api) {
  const { B, set, setF, box, F, GROUND, chests, npcs, nodes } = api;
  const rand = rng(0x51ce1d);
  TOWN_PLAN.rooms.length = 0;
  TOWN_PLAN.doors.length = 0;

  // --- relief --------------------------------------------------------------
  // Worldgen pins the ground at exactly GROUND only within radius 34 of the
  // origin, and drifts by a block or two beyond 40. Everything the town writes
  // therefore lives inside 34, and the sculpt fades to nothing by 40 so the pad
  // meets the natural plain without a seam.
  //
  // These rectangles must stay dead flat: structures.js drops the pond, brook,
  // spring pool, farm, training yard, grove, mine mouth and the spawn square in
  // at a hard-coded y. Raise the ground under them and the pond ends up buried
  // under a lid of grass and the mine mouth becomes a dirt wall — which is
  // exactly what the previous relief did to all six of them.
  const FLAT = [
    [-9, 9, 9, 27],       // pond bowl and its fishing ledge
    [3, 16, 19, 24],      // the brook running east out of the pond
    [12, 10, 32, 30],     // Millbrook spring pool
    [-21, 13, -7, 31],    // the common field
    [4, 4, 20, 20],       // training yard
    [16, -14, 32, 11],    // the grove
    [18, -32, 30, -19],   // mine road and the adit mouth
    [-30, 16, -16, 30],   // boar meadow
    [-14, -24, 10, 10],   // the market place, its street and the spawn square
  ];
  // Distance to the nearest reserved rectangle, so the relief can ramp back in
  // over a few blocks instead of stopping at a cliff.
  const flatMask = (x, z) => {
    let d = Infinity;
    for (const [a0, b0, a1, b1] of FLAT) {
      const dx = Math.max(a0 - x, 0, x - a1), dz = Math.max(b0 - z, 0, z - b1);
      d = Math.min(d, Math.hypot(dx, dz));
      if (d === 0) return 0;
    }
    return Math.min(1, d / 6);
  };
  const elev = (x, z) => {
    const rise = Math.min(5, Math.max(0, (-z - 22) * 0.36));   // the kirk's hill
    const fallW = -Math.min(3, Math.max(0, (-x - 20) * 0.22)); // ground drops away west
    const roll = Math.sin(x / 16) * 0.9 + Math.cos(z / 19) * 0.8;
    const d = Math.hypot(x, z);
    const fade = Math.min(1, Math.max(0, (40 - d) / 6));       // blend into the plain
    return Math.round((rise + fallW + roll) * flatMask(x, z) * fade);
  };
  // Sculpt by writing only the DELTA from the flat pad — raising a column stacks
  // dirt on top, lowering it cuts air out. Rewriting every column wholesale cost
  // ~90k edits for the same shape.
  for (let x = -41; x <= 41; x++) for (let z = -41; z <= 41; z++) {
    if (Math.hypot(x, z) > 41) continue;
    const h = elev(x, z);
    if (h > 0) {
      for (let d = 0; d < h; d++) set(x, GROUND + d, z, B.dirt);
      set(x, GROUND + h, z, B.grass);
    } else if (h < 0) {
      for (let d = h + 1; d <= 0; d++) set(x, GROUND + d, z, B.air);
      set(x, GROUND + h, z, B.grass);
    }
  }
  const gy = (x, z) => GROUND + elev(x, z);                    // ground surface here
  const fy = (x, z) => gy(x, z) + 1;                           // the walk level here
  const pick = (a) => a[Math.floor(rand() * a.length) % a.length];

  // --- material families ---------------------------------------------------
  const WOODS = [B.fernwood_log, B.emberpine_log, B.oak_log];
  const INFILL = [B.white_terracotta, B.white_concrete, B.light_gray_terracotta ?? B.white_terracotta];
  const DOORS = [B.oak_door, B.birch_door, B.pine_door, B.cedar_door, B.ash_door, B.walnut_door];
  const STONES = [B.cobble, B.stone_brick, B.granite ?? B.stone_brick];
  const ROOFS = {
    thatch: { stair: B.thatch, slab: B.thatch_slab },
    tile: { stair: B.brick_stairs, slab: B.brick_slab },
    slate: { stair: B.deepslate_stairs ?? B.stone_brick_stairs, slab: B.stone_brick_slab },
    stone: { stair: B.stone_brick_stairs, slab: B.stone_brick_slab },
    cobble: { stair: B.cobble_stairs, slab: B.cobble_slab },
  };
  const SLAB = B.planks_slab ?? B.planks;
  const STAIRW = B.planks_stairs ?? B.planks;

  // --- ten house themes ----------------------------------------------------
  // Each is a different building TYPE, not a recolour: storey count, wall
  // treatment, roof material, how it meets the street and what is inside it all
  // change together, so a smithy reads as a smithy from across the market.
  const THEMES = {
    cottage:    { storeys: 1, roof: 'thatch', wall: 'frame', wallH: 4, fit: 'home' },
    longhouse:  { storeys: 1, roof: 'thatch', wall: 'frame', wallH: 4, fit: 'byre' },
    townhouse:  { storeys: 2, roof: 'tile', wall: 'frame', wallH: 4, jetty: 1, fit: 'home' },
    tudor:      { storeys: 3, roof: 'slate', wall: 'frame', wallH: 4, jetty: 1, fit: 'home' },
    stonehouse: { storeys: 2, roof: 'slate', wall: 'stone', wallH: 4, fit: 'merchant' },
    shopfront:  { storeys: 2, roof: 'tile', wall: 'frame', wallH: 4, jetty: 1, fit: 'shop', shop: true, sign: true },
    tavern:     { storeys: 2, roof: 'thatch', wall: 'frame', wallH: 4, jetty: 1, fit: 'tavern', sign: true },
    smithy:     { storeys: 1, roof: 'tile', wall: 'stone', wallH: 5, fit: 'forge', bay: 3, bigChimney: true },
    barn:       { storeys: 1, roof: 'thatch', wall: 'plank', wallH: 6, fit: 'barn', bay: 3, bayH: 4, noWindows: true },
    towerhouse: { storeys: 3, roof: 'cobble', wall: 'stone', wallH: 4, fit: 'merchant', slits: true },
  };

  // --- primitives ----------------------------------------------------------
  const rect = (x0, z0, x1, z1, y, id) => box(x0, y, z0, x1, y, z1, id);
  const postCol = (x, z, y0, y1, id) => box(x, y0, z, x, y1, z, id);

  // A framed wall run: infill, sill + head beams, studs every third block.
  const framedWall = (x0, z0, x1, z1, yBase, h, timber, infill) => {
    box(x0, yBase, z0, x1, yBase + h - 1, z1, infill);
    box(x0, yBase, z0, x1, yBase, z1, timber);
    box(x0, yBase + h - 1, z0, x1, yBase + h - 1, z1, timber);
    const horiz = x1 - x0 >= z1 - z0;
    const n = horiz ? x1 - x0 : z1 - z0;
    for (let i = 3; i < n; i += 3) {
      postCol(horiz ? x0 + i : x0, horiz ? z0 : z0 + i, yBase + 1, yBase + h - 2, timber);
    }
  };

  // Gabled roof with DEEP eaves. `axis` is the direction the slope runs, so the
  // ridge lies across it: axis 'z' puts the ridge along X and the gable ends at
  // ±X — which is what a burgage house needs, gable to the street.
  // Returns the ridge height so the chimney knows how far to climb.
  const roof = (x0, z0, x1, z1, yBase, kind, axis, gableMat, overSlope = 2, overGable = 1) => {
    const { stair, slab } = ROOFS[kind] || ROOFS.thatch;
    const alongX = axis === 'x';
    const a0 = (alongX ? x0 : z0) - overSlope, a1 = (alongX ? x1 : z1) + overSlope;
    const b0 = (alongX ? z0 : x0) - overGable, b1 = (alongX ? z1 : x1) + overGable;
    const put = (a, y, b, id, f) => (alongX ? setF(a, y, b, id, f) : setF(b, y, a, id, f));
    const putP = (a, y, b, id) => (alongX ? set(a, y, b, id) : set(b, y, a, id));
    // facing 0=+Z 1=+X 2=-Z 3=-X; a stair's raised step sits on its facing side,
    // so each slope must point UP the roof toward the ridge.
    const fLo = alongX ? 1 : 0, fHi = alongX ? 3 : 2;
    const half = Math.floor((a1 - a0) / 2);
    for (let L = 0; L <= half; L++) {
      const y = yBase + L, lo = a0 + L, hi = a1 - L;
      if (lo < hi) {
        for (let b = b0; b <= b1; b++) { put(lo, y, b, stair, fLo); put(hi, y, b, stair, fHi); }
        for (const bEnd of [b0, b1]) for (let yy = yBase; yy < y; yy++) {
          putP(lo, yy, bEnd, gableMat); putP(hi, yy, bEnd, gableMat);
        }
      } else {
        for (let b = b0; b <= b1; b++) putP(lo, y, b, slab);
      }
    }
    return yBase + half;
  };

  // --- street furniture ----------------------------------------------------
  const lamp = (x, z) => {
    const y = fy(x, z);
    set(x, y, z, B.planks_fence); set(x, y + 1, z, B.planks_fence); set(x, y + 2, z, B.sea_lantern);
  };
  // Real blocks only. The old clutter list named crate/barrel/hay_bale, none of
  // which exist, so filter(Boolean) quietly reduced every pile to bare planks.
  const GOODS = [B.note_block, B.cauldron, B.thatch, B.white_wool, B.melon, B.pumpkin];
  const clutter = (x, z) => set(x, fy(x, z), z, pick(GOODS));

  // --- interior fittings ---------------------------------------------------
  // A room reads as lived-in through its furniture, not its floor area. Each
  // fitting stands ON the floor cell, so the walkable floor the enterability
  // test checks is honestly reduced by what is in the way.
  const pallet = (x, y, z, dx, dz, rich) => {          // bed: mattress + bolster
    set(x, y, z, rich ? B.red_wool : B.thatch);
    set(x + dx, y, z + dz, rich ? B.red_wool : B.thatch);
    set(x + dx * 2, y, z + dz * 2, B.white_wool);
  };
  const board = (x, y, z, len, dx, dz) => {            // trestle table
    for (let i = 0; i < len; i++) { set(x + dx * i, y, z + dz * i, B.planks_fence); set(x + dx * i, y + 1, z + dz * i, SLAB); }
  };
  const stool = (x, y, z) => set(x, y, z, SLAB);
  const bench = (x, y, z, f) => setF(x, y, z, STAIRW, f);
  const kist = (x, y, z, f) => setF(x, y, z, B.chest_block, f);
  const barrel = (x, y, z) => set(x, y, z, B.cauldron);
  const crate = (x, y, z) => set(x, y, z, B.note_block);
  const rushlight = (x, y, z) => set(x, y, z, B.torch_post);

  // --- the house builder ---------------------------------------------------
  // Takes an EXPLICIT outer footprint. A centre-plus-half-extent signature
  // cannot express a party wall or a plot sitting hard on a frontage line, and
  // both are the whole point of a burgage terrace.
  //
  // The ground-floor rectangle is captured ONCE, up front, and every upper
  // storey is derived from it rather than mutating it. The previous builder
  // grew x0/x1/z0/z1 inside the storey loop and then computed the doorway from
  // the grown values, so every two-storey house had its door cut a block clear
  // of the ground-floor wall, in mid-air, and no opening at all downstairs.
  const building = (name, gx0, gz0, gx1, gz1, themeName, opts = {}) => {
    const T = THEMES[themeName] || THEMES.cottage;
    const face = opts.face || 'S';
    const storeys = opts.storeys ?? T.storeys;
    const wallH = opts.wallH ?? T.wallH ?? 4;
    const timber = pick(WOODS), infill = pick(INFILL), doorId = pick(DOORS);
    const stoneId = opts.stone ?? pick(STONES);
    const floorMat = T.wall === 'stone' ? stoneId : B.planks;
    const [ox, oz] = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[face];
    // Gable to the street for a burgage house; eaves-on marks the grand ones.
    const axis = (opts.eavesOn ? ox !== 0 : oz !== 0) ? 'x' : 'z';
    const cx = (gx0 + gx1) >> 1, cz = (gz0 + gz1) >> 1;

    // The plot is TERRACED: the house sits on the highest ground under it and
    // its two-block apron, and the plinth is packed down to meet the fall on the
    // low side. On a slope that reads as a stone retaining wall, which is what a
    // hillside burgage plot actually looked like.
    let base = -Infinity;
    for (let x = gx0 - 2; x <= gx1 + 2; x++) for (let z = gz0 - 2; z <= gz1 + 2; z++) base = Math.max(base, gy(x, z));
    const FL = base + 1;
    for (let x = gx0 - 2; x <= gx1 + 2; x++) for (let z = gz0 - 2; z <= gz1 + 2; z++) {
      for (let y = gy(x, z); y <= base; y++) set(x, y, z, stoneId);
    }
    rect(gx0, gz0, gx1, gz1, base, floorMat);

    // Nothing is ever written into the room volume, so the interior is hollow by
    // construction — it is simply the air above the plateau that no wall, deck
    // or fitting has claimed. Filling it with air first would cost ~2k wasted
    // edits per building.
    const foot = [];
    for (let s = 0; s < storeys; s++) {
      const over = T.jetty ? s : 0;                            // oversail grows a block a storey
      foot.push({
        x0: gx0 - (ox < 0 ? over : 0), x1: gx1 + (ox > 0 ? over : 0),
        z0: gz0 - (oz < 0 ? over : 0), z1: gz1 + (oz > 0 ? over : 0),
      });
    }

    const wallRun = (a0, b0, a1, b1, yb, h) => {
      if (T.wall === 'stone') box(a0, yb, b0, a1, yb + h - 1, b1, stoneId);
      else if (T.wall === 'plank') box(a0, yb, b0, a1, yb + h - 1, b1, B.planks);
      else framedWall(a0, b0, a1, b1, yb, h, timber, infill);
    };

    const storeyY = (s) => FL + s * (wallH + 1);
    for (let s = 0; s < storeys; s++) {
      const f = foot[s], ys = storeyY(s);
      // party walls: a shared wall belongs to the neighbour, so skip ours
      if (!(opts.party || '').includes('N')) wallRun(f.x0, f.z0, f.x1, f.z0, ys, wallH);
      if (!(opts.party || '').includes('S')) wallRun(f.x0, f.z1, f.x1, f.z1, ys, wallH);
      if (!(opts.party || '').includes('W')) wallRun(f.x0, f.z0, f.x0, f.z1, ys, wallH);
      if (!(opts.party || '').includes('E')) wallRun(f.x1, f.z0, f.x1, f.z1, ys, wallH);
      if (opts.arcade && s === 0) {
        // A market hall stands on an open arcade: traders under it, the hall
        // above. Cut the ground storey back to piers and a head beam.
        box(f.x0 + 1, ys, f.z0, f.x1 - 1, ys + wallH - 2, f.z0, B.air);
        box(f.x0 + 1, ys, f.z1, f.x1 - 1, ys + wallH - 2, f.z1, B.air);
        box(f.x0, ys, f.z0 + 1, f.x0, ys + wallH - 2, f.z1 - 1, B.air);
        box(f.x1, ys, f.z0 + 1, f.x1, ys + wallH - 2, f.z1 - 1, B.air);
        for (let x = f.x0; x <= f.x1; x += 3) {
          postCol(x, f.z0, ys, ys + wallH - 1, stoneId); postCol(x, f.z1, ys, ys + wallH - 1, stoneId);
        }
        for (let z = f.z0; z <= f.z1; z += 3) {
          postCol(f.x0, z, ys, ys + wallH - 1, stoneId); postCol(f.x1, z, ys, ys + wallH - 1, stoneId);
        }
      }
      for (const [px, pz] of [[f.x0, f.z0], [f.x1, f.z0], [f.x0, f.z1], [f.x1, f.z1]]) {
        postCol(px, pz, ys, ys + wallH - 1, T.wall === 'stone' ? stoneId : timber);
      }
      // Windows are OPENINGS, not decals: the pane replaces the wall block, so
      // daylight actually comes through it.
      if (!T.noWindows && !(opts.arcade && s === 0)) {
        const glass = T.slits ? B.iron_bars : B.glasspane;
        const wy = ys + 2;
        for (let x = f.x0 + 2; x <= f.x1 - 2; x += 3) {
          if (!(oz > 0 && s === 0 && x === cx)) set(x, wy, f.z1, glass);
          if (!(oz < 0 && s === 0 && x === cx)) set(x, wy, f.z0, glass);
        }
        for (let z = f.z0 + 2; z <= f.z1 - 2; z += 3) {
          if (!(ox < 0 && s === 0 && z === cz)) set(f.x0, wy, z, glass);
          if (!(ox > 0 && s === 0 && z === cz)) set(f.x1, wy, z, glass);
        }
      }
      // deck over this storey doubles as the next one's floor
      if (s < storeys - 1) rect(foot[s + 1].x0, foot[s + 1].z0, foot[s + 1].x1, foot[s + 1].z1, ys + wallH, floorMat);
      TOWN_PLAN.rooms.push({ name, storey: s, y: ys, x0: f.x0 + 1, z0: f.z0 + 1, x1: f.x1 - 1, z1: f.z1 - 1 });
    }

    // --- vertical circulation ---------------------------------------------
    // A quarter-turn flight in the corner: wallH one-block risers a walker steps
    // up, and a hole cut through the deck over the top of the run so the climb
    // has headroom the whole way. An upper storey you cannot reach is worse than
    // no upper storey.
    for (let s = 0; s + 1 < storeys; s++) {
      const f = foot[s], ys = storeyY(s), deck = ys + wallH;
      // Successive flights alternate corners. Stacking them would drop a riser
      // straight through the stairwell hole of the flight below.
      const far = s % 2 === 1;
      const ax = far ? f.x1 - 1 : f.x0 + 1, az = far ? f.z1 - 1 : f.z0 + 1;
      const dx = far ? -1 : 1, dz = far ? -1 : 1;
      const path = [[ax, az], [ax + dx, az], [ax + dx * 2, az], [ax + dx * 2, az + dz]];
      for (let i = 0; i < wallH && i < path.length + 1; i++) {
        const p = path[Math.min(i, path.length - 1)];
        setF(p[0], ys + i, p[1], STAIRW, dx > 0 ? 1 : 3);
      }
      for (const [px, pz] of path) set(px, deck, pz, B.air);
      set(ax + dx * 2, deck, az + dz * 2, floorMat);   // the landing you step out onto
    }

    // --- the way in --------------------------------------------------------
    const dx0 = ox !== 0 ? (ox > 0 ? gx1 : gx0) : cx + (opts.door ?? 0);
    const dz0 = oz !== 0 ? (oz > 0 ? gz1 : gz0) : cz + (opts.door ?? 0);
    const dirBits = ox > 0 ? 1 : ox < 0 ? 3 : oz > 0 ? 0 : 2;
    if (T.bay) {
      // A forge worked with its front open to the street and a barn needs cart
      // doors, so those get a bay rather than a door leaf.
      const h = T.bayH ?? 3, r = (T.bay - 1) >> 1;
      for (let d = -r; d <= r; d++) {
        const bx = ox !== 0 ? dx0 : dx0 + d, bz = ox !== 0 ? dz0 + d : dz0;
        box(bx, FL, bz, bx, FL + h - 1, bz, B.air);
      }
      for (let d = -r - 1; d <= r + 1; d++) {           // a timber lintel over it
        const bx = ox !== 0 ? dx0 : dx0 + d, bz = ox !== 0 ? dz0 + d : dz0;
        set(bx, FL + h, bz, timber);
      }
    } else {
      set(dx0, FL + 1, dz0, B.air);                  // the head of the doorway
      setF(dx0, FL, dz0, doorId, dirBits);           // the leaf, which swings open
    }
    TOWN_PLAN.doors.push({ name, x: dx0, y: FL, z: dz0 });

    // The doorstep must actually be walkable from the street. The apron is level
    // with the floor; where the plot terrace stands proud of the road, step down
    // to meet it — never more than a block at a time.
    const perp = ox !== 0 ? [0, 1] : [1, 0];
    let stepY = base;
    for (let d = 1; d <= 6; d++) {
      const sx = dx0 + ox * d, sz = dz0 + oz * d;
      const g = gy(sx, sz);
      if (g >= stepY) break;
      stepY = Math.max(g, stepY - 1);
      for (let w = -1; w <= 1; w++) {
        const px = sx + perp[0] * w, pz = sz + perp[1] * w;
        for (let y = gy(px, pz); y <= stepY; y++) set(px, y, pz, B.cobble);
        set(px, stepY + 1, pz, B.air); set(px, stepY + 2, pz, B.air);
      }
    }

    // --- hearth and chimney ------------------------------------------------
    // The stack rides IN the wall line so it never eats floor, and the fire sits
    // on the room side of it. A house whose chimney lands on nothing is a house
    // with a decorative pipe.
    const top = foot[storeys - 1], yRoof = storeyY(storeys - 1) + wallH;
    const ridge = roof(top.x0, top.z0, top.x1, top.z1, yRoof, T.roof, axis, infill, 2, 1);
    // close the wall head up to the roof underside, so the loft is sealed and
    // the only ways in are the door and the windows
    for (let x = top.x0; x <= top.x1; x++) for (let z = top.z0; z <= top.z1; z++) {
      if (x !== top.x0 && x !== top.x1 && z !== top.z0 && z !== top.z1) continue;
      const a = axis === 'x' ? x : z;
      const a0 = (axis === 'x' ? top.x0 : top.z0) - 2, a1 = (axis === 'x' ? top.x1 : top.z1) + 2;
      const L = Math.min(a - a0, a1 - a);
      for (let y = yRoof; y < yRoof + L; y++) set(x, y, z, T.wall === 'stone' ? stoneId : infill);
    }
    const chZ = gz0 + 1, chW = T.bigChimney ? 1 : 0;
    for (let d = -chW; d <= chW; d++) {
      box(gx0 + d + chW, FL, chZ, gx0 + d + chW, ridge + 2, chZ, stoneId);
    }
    set(gx0 + chW, ridge + 3, chZ, B.campfire);                  // smoke on the roofline

    // --- fit-out -----------------------------------------------------------
    // Ten themes, ten different rooms. The bounds are the ground-floor interior.
    const ix0 = gx0 + 1, iz0 = gz0 + 1, ix1 = gx1 - 1, iz1 = gz1 - 1;
    const fit = T.fit;
    if (fit === 'home' || fit === 'byre') {
      pallet(ix1, FL, iz1, 0, -1, false);
      board(ix0 + 1, FL, iz1, 2, 1, 0);
      stool(ix0 + 1, FL, iz1 - 1);
      barrel(ix1, FL, iz0 + 1);
      kist(ix1 - 1, FL, iz0, 0);
      rushlight(ix0, FL + 2, Math.max(iz0 + 1, iz1 - 1));
      if (fit === 'byre') {
        // A longhouse is one roof over people and beasts, byre at the low end.
        for (let z = iz0; z <= iz0 + 1; z++) for (let x = ix0 + 2; x <= ix1; x++) set(x, FL, z, B.thatch);
        for (let x = ix0 + 2; x <= ix1; x++) set(x, FL + 1, iz0 + 2, B.planks_fence);
        set(ix0 + 2, FL + 1, iz0 + 2, B.air);            // gate into the byre
      }
    } else if (fit === 'merchant') {
      pallet(ix1, FL, iz1, 0, -1, true);
      kist(ix0, FL, iz1, 3); kist(ix0, FL, iz1 - 1, 3);
      board(ix1 - 1, FL, iz0 + 1, 2, -1, 0);
      crate(ix0, FL, iz0 + 2); barrel(ix0 + 1, FL, iz0 + 1);
      rushlight(ix1, FL + 2, iz0 + 1);
    } else if (fit === 'shop') {
      // Trade at the front, living behind: a fold-down counter through the
      // street wall, the shutter propped above it as an awning.
      board(ix0, FL, iz1, Math.min(3, ix1 - ix0 + 1), 1, 0);
      kist(ix1, FL, iz1, 0);
      crate(ix1, FL, iz0 + 1); barrel(ix1 - 1, FL, iz0 + 1);
      pallet(ix0, FL, iz0 + 1, 0, 1, false);
      set(ix0 + 1, FL, iz0 + 1, B.lectern);
      rushlight(ix1, FL + 2, iz1);
    } else if (fit === 'tavern') {
      for (let z = iz0 + 1; z <= iz1 - 1; z += 3) {
        board(ix0 + 2, FL, z, Math.min(3, ix1 - ix0 - 2), 1, 0);
        bench(ix0 + 1, FL, z, 1); bench(ix1 - 1, FL, z, 3);
      }
      for (let z = iz0 + 1; z <= iz1; z++) set(ix1, FL, z, SLAB);   // the bar
      barrel(ix1, FL, iz0); crate(ix1 - 1, FL, iz0);
      rushlight(ix0, FL + 2, iz0 + 1); rushlight(ix0, FL + 2, iz1 - 1);
    } else if (fit === 'barn') {
      for (let x = ix0; x <= ix1; x++) for (let z = iz0; z <= iz0 + 1; z++) set(x, FL, z, B.thatch);
      for (let x = ix0; x <= ix0 + 1; x++) set(x, FL + 1, iz0, B.thatch);
      crate(ix1, FL, iz1); crate(ix1 - 1, FL, iz1); barrel(ix1 - 2, FL, iz1);
      rushlight(ix0, FL + 3, iz1);
    }
    // The fire goes in LAST so a fit-out can never bury it, and lands on the
    // room side of the chimney breast — a stack that heats nothing is a pipe.
    if (fit !== 'barn') set(gx0 + 1 + chW * 2, FL, chZ, B.campfire);
    // every room gets a light hung from the ridge as well as its fire
    set(cx, storeyY(storeys - 1) + wallH - 1, cz, B.sea_lantern);

    // Sweep the threshold clear, LAST. A fit-out laid out from the interior
    // corners has no idea where the door ended up, and a barrel parked in the
    // one cell behind it seals the house just as completely as a missing
    // doorway does. Two cells deep, the width of the opening.
    const bayR = T.bay ? (T.bay - 1) >> 1 : 0;
    for (let d = 1; d <= 2; d++) for (let w = -bayR; w <= bayR; w++) {
      const px = dx0 - ox * d + perp[0] * w, pz = dz0 - oz * d + perp[1] * w;
      set(px, FL, pz, B.air); set(px, FL + 1, pz, B.air);
    }

    // --- what it looks like from the street --------------------------------
    const sx = dx0 + ox, sz = dz0 + oz;                            // the doorstep cell
    lamp(sx + perp[0] * 2, sz + perp[1] * 2);
    if (T.sign) {                                                  // trade sign on a bracket
      set(sx + perp[0], FL + 3, sz + perp[1], timber);
      set(sx + perp[0] + ox, FL + 3, sz + perp[1] + oz, B.sign);
    }
    if (T.shop) {                                                  // shuttered shop window
      const wx2 = dx0 + perp[0] * 2, wz2 = dz0 + perp[1] * 2;
      set(wx2, FL, wz2, B.air); set(wx2, FL + 1, wz2, B.air);
      set(wx2, FL, wz2, SLAB);                                     // fold-down counter
      setF(wx2 + ox, FL + 2, wz2 + oz, B.trapdoor, dirBits | 4);   // the propped shutter
    }
    if (rand() < 0.7) clutter(sx + perp[0] * 2 + ox, sz + perp[1] * 2 + oz);
    if (rand() < 0.5) set(sx - perp[0], fy(sx - perp[0], sz - perp[1]), sz - perp[1], B.flower_pot);
    return { x0: gx0, x1: gx1, z0: gz0, z1: gz1, cx, cz, FL, base, ix0, iz0, ix1, iz1 };
  };

  // --- paving --------------------------------------------------------------
  // Paving lays on the local surface so a street rolls with the ground. Where
  // the ground steps, the riser is laid as a stair block, which is how a stepped
  // street reads — the main street still follows the contour, so only the kirk
  // approach and the back lanes actually climb.
  const pave = (x, z, mat) => {
    const y = gy(x, z);
    set(x, y, z, mat);
    const up = gy(x, z - 1) - y;                    // does the ground rise north?
    if (up === 1 && mat === B.cobble) setF(x, y, z, B.cobble_stairs, 2);
  };
  const paveRect = (x0, z0, x1, z1, mat = B.cobble) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) pave(x, z, mat);
  };

  // The market funnel: narrow and climbing at the kirk end, widest at the low
  // end. Keys are (z, west edge, east edge), linearly interpolated between.
  const FUNNEL = [
    [-33, -4, 2], [-28, -5, 3], [-24, -8, 4], [-19, -10, 7],
    [-14, -12, 8], [-8, -11, 7], [-3, -8, 5], [4, -6, 3], [11, -6, 3],
  ];
  const funnelAt = (z) => {
    if (z <= FUNNEL[0][0]) return [FUNNEL[0][1], FUNNEL[0][2]];
    for (let i = 1; i < FUNNEL.length; i++) {
      const [z1, w1, e1] = FUNNEL[i];
      if (z <= z1) {
        const [z0, w0, e0] = FUNNEL[i - 1], t = (z - z0) / (z1 - z0);
        return [Math.round(w0 + (w1 - w0) * t), Math.round(e0 + (e1 - e0) * t)];
      }
    }
    return [FUNNEL[FUNNEL.length - 1][1], FUNNEL[FUNNEL.length - 1][2]];
  };
  for (let z = -33; z <= 11; z++) {
    const [w, e] = funnelAt(z);
    for (let x = w; x <= e; x++) {
      // the widest stretch gets a scatter of dressed stone, worn by market days
      pave(x, z, ((x * 7 + z * 5) % 9 === 0 && z > -24 && z < -4) ? B.stone_brick : B.cobble);
    }
    for (const vx of [w - 1, e + 1]) pave(vx, z, B.gravel);       // gravel verges
  }

  // The road south: out of the market mouth, then west between the mill pond
  // and the common field to the town gate. Three wide — a cart, not a highway.
  paveRect(-9, 7, 3, 10);
  paveRect(-9, 11, -7, 30);
  for (const z of [14, 20, 27]) pave(-10, z, B.gravel);
  // Kirk Lane runs along the foot of the churchyard and keeps going east as the
  // mine road, so the ore carts never have to cross the market.
  paveRect(-21, -26, 24, -24);
  // The back lane behind the west burgages, and the vennels that reach it.
  paveRect(-25, -22, -23, 8);
  paveRect(-22, -12, -11, -11); paveRect(-22, -2, -11, -1);       // vennels, two wide
  // The Shambles: the mean lane between the market island and the east row.
  paveRect(5, -19, 7, -4, B.gravel);

  // --- the market place ----------------------------------------------------
  {
    // The cross stands in the widest part, where the tolls were taken.
    const cxx = -6, czz = -18, y = fy(cxx, czz);
    for (let d = -2; d <= 2; d++) for (let e = -2; e <= 2; e++) {
      if (Math.abs(d) + Math.abs(e) <= 2) set(cxx + d, y - 1, czz + e, B.stone_brick);
    }
    box(cxx, y, czz, cxx, y + 3, czz, B.cobble_wall);
    set(cxx, y + 4, czz, B.sea_lantern);
    for (const [d, e] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) set(cxx + d, y, czz + e, B.stone_brick_slab);
  }
  {
    // The town well, ringed and roofed, on the market's west side.
    const wx = -7, wz = -8, y = fy(wx, wz);
    for (let d = -1; d <= 1; d++) for (let e = -1; e <= 1; e++) set(wx + d, y - 1, wz + e, B.cobble);
    set(wx, y - 2, wz, B.cobble); set(wx, y - 1, wz, B.water);
    for (const [d, e] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(wx + d, y, wz + e, wx + d, y + 2, wz + e, B.fernwood_log);
    box(wx - 1, y + 3, wz - 1, wx + 1, y + 3, wz + 1, B.thatch);
  }
  const stall = (sx, sz) => {
    const y = fy(sx, sz);
    for (let d = -1; d <= 1; d++) set(sx + d, y, sz, SLAB);
    postCol(sx - 2, sz, y, y + 2, B.fernwood_log); postCol(sx + 2, sz, y, y + 2, B.fernwood_log);
    for (let d = -2; d <= 2; d++) set(sx + d, y + 3, sz, d % 2 === 0 ? B.white_wool : B.thatch);
    clutter(sx - 2, sz - 1);
  };
  stall(-7, -21); stall(-6, -14); stall(-6, -11);
  for (const [lx, lz] of [[-9, -21], [-9, -12], [6, -21], [6, -6], [-2, -2]]) lamp(lx, lz);
  // The stocks, by the cross, where the market court's judgements were served.
  set(-3, fy(-3, -15), -15, B.planks_fence); set(-2, fy(-2, -15), -15, B.planks_fence);

  // --- the buildings -------------------------------------------------------
  // THE KIRK END, on the rise at the narrow head of the funnel.
  // The moot hall: open arcade below for the traders, the hall above. It is
  // eaves-on and thirteen blocks wide, which is the wealth signal — everything
  // else on the market turns its narrow gable to the street.
  const hall = building('moot hall', -9, -32, 3, -27, 'stonehouse', {
    face: 'S', eavesOn: true, storeys: 2, arcade: true, stone: B.stone_brick,
  });
  {
    // the bell tower, hard against the hall's west gable
    const tx = -11, tz = -29, y = hall.FL;
    box(tx - 1, y, tz - 1, tx + 1, y + 13, tz + 1, B.stone_brick);
    box(tx, y, tz, tx, y + 12, tz, B.air);
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) box(tx + dx, y + 11, tz + dz, tx + dx, y + 12, tz + dz, B.air);
    set(tx, y + 12, tz, B.bell); set(tx, y + 10, tz, B.sea_lantern);
    roof(tx - 1, tz - 1, tx + 1, tz + 1, y + 14, 'cobble', 'x', B.stone_brick, 1, 1);
    // the churchyard wall, with a gate where the market street runs through it
    for (let x = -14; x <= 9; x++) if (x < -2 || x > 0) set(x, fy(x, -23), -23, B.cobble_wall);
  }
  building('north cot', 5, -32, 10, -27, 'cottage', { face: 'S' });

  // THE WEST BURGAGE ROW — gable to the street, hard on the frontage line, and
  // the first two share a party wall the way a real terrace does. The tudor is
  // three storeys on a five-block frontage, double-jettied out over the street:
  // the tallest, narrowest thing in Brookhollow and the one you see first.
  building('reeve house', -17, -22, -11, -17, 'tudor', { face: 'E', party: 'S' });
  building('merchant house', -17, -17, -11, -12, 'townhouse', { face: 'E' });
  const maren = building('the brook and bell', -20, -10, -11, -3, 'tavern', { face: 'E', eavesOn: true, door: -1 });
  {
    // the inn's yard: trestles under the eaves and the drayman's barrels
    const y = maren.FL;
    kist(maren.ix0 + 1, y, maren.iz0 + 1, 1);
    chests.push({ id: 'maren_chest', x: maren.ix0 + 1, y, z: maren.iz0 + 1, loot: [{ item: 'travel_biscuit', qty: 3 }] });
    npcs.push({ id: 'maren', x: -13, y, z: -7 });
    TOWN_PLAN.marenAuthoredY = y;
    for (const [bx, bz] of [[-10, -10], [-10, -3]]) set(bx, fy(bx, bz), bz, B.cauldron);
    board(-9, fy(-9, -7), -7, 2, 0, 1); bench(-8, fy(-8, -7), -7, 3);
  }

  // THE MARKET ISLAND — encroachment. Three mean, shallow booths that started as
  // market stalls and fossilised, party-walled into a row, with the wide Market
  // Place to their west and the narrow Shambles to their east.
  building('middle row north', -1, -20, 4, -15, 'shopfront', { face: 'W', party: 'S', storeys: 1 });
  building('middle row', -1, -15, 4, -10, 'cottage', { face: 'W', party: 'S' });
  building('middle row south', -1, -10, 4, -5, 'shopfront', { face: 'W', storeys: 1 });

  // THE EAST ROW, fronting the Shambles — the narrowest, most subdivided plots.
  building('butcher row', 6, -23, 11, -19, 'cottage', { face: 'W' });
  building('shambles house', 8, -18, 13, -13, 'townhouse', { face: 'W', party: 'S' });
  building('the shambles', 8, -13, 13, -8, 'stonehouse', { face: 'W' });
  building('the tower house', 8, -6, 13, -1, 'towerhouse', { face: 'W' });

  // TAM'S WORKSHOP, on the road out to the common field. The compass sends
  // quest-givers' errands to markers.stall (-13, 9), so this is where the town's
  // second trader has to stand.
  const tamShop = building('tam workshop', -16, 5, -10, 11, 'shopfront', { face: 'E' });
  {
    kist(tamShop.ix0, tamShop.FL, tamShop.iz1, 3);
    chests.push({ id: 'tam_chest', x: tamShop.ix0, y: tamShop.FL, z: tamShop.iz1, loot: [] });
    npcs.push({ id: 'tam', x: -13, y: tamShop.FL, z: 9 });
  }

  // THE FORGE, at the town edge on the mine road with a clear gap around it,
  // because a town that keeps fire hooks by the door does not want a smith in
  // the middle of its terrace. Every craft station in Brookhollow is under this
  // one roof, reached through the open forge bay onto the mine road.
  const forge = building('the forge', 16, -21, 26, -13, 'smithy', { face: 'N', eavesOn: true });
  {
    const y = forge.FL;
    // stations line the side walls, clear of the cart lane through the bay
    set(17, y, -18, B.furnace); set(17, y, -16, B.anvil_block); set(17, y, -14, B.workbench);
    set(25, y, -19, B.construction_bench); set(25, y, -17, B.loom_block); set(25, y, -15, B.alchemy_table);
    set(18, y, -14, B.cauldron);                                  // the slack tub
    kist(24, y, -14, 0);
    chests.push({ id: 'workshop_chest', x: 24, y, z: -14, loot: [{ item: 'rough_stone', qty: 4 }, { item: 'plant_fibre', qty: 4 }] });
    for (const z of [-19, -16]) { rushlight(16, y + 2, z); rushlight(26, y + 2, z); }
    // coal heap and the iron stacked in the yard, where the carts pull up
    for (const [cx2, cz2] of [[16, -23], [17, -23], [19, -23]]) set(cx2, fy(cx2, cz2), cz2, B.coal_seam);
    lamp(15, -22);
  }

  // THE BACKS — outside the burgage gardens, downhill and downwind of the town.
  building('tithe barn', -31, 2, -25, 8, 'barn', { face: 'E' });
  building('brookside farm', -31, -9, -25, -3, 'longhouse', { face: 'E' });
  {
    // the tanning yard: pits and drying frames, sited where nobody has to smell it
    for (const [tx, tz] of [[-29, 11], [-27, 11], [-29, 13], [-27, 13]]) set(tx, fy(tx, tz), tz, B.cauldron);
    for (let x = -30; x <= -26; x += 2) { const y = fy(x, 15); box(x, y, 15, x, y + 2, 15, B.planks_fence); }
    for (let x = -30; x <= -26; x++) set(x, fy(x, 15) + 2, 15, B.white_wool);   // hides on the frames
  }

  // --- burgage gardens -----------------------------------------------------
  // The toft: fenced strips running back from the houses to the lane, dug for
  // vegetables and rooted over by pigs. This — not a neat square out of town —
  // is where a burgess's allotment actually was, so the farm plots live here.
  for (let z = -22; z <= 6; z++) {
    if (z % 7 === 0) continue;                                     // gate gaps into each toft
    set(-22, fy(-22, z), z, B.planks_fence);                       // the head-dyke on the lane
    if (z % 7 === 3) for (let x = -21; x <= -19; x++) set(x, fy(x, z), z, B.planks_fence); // plot divisions
  }
  // Lay the bed BEFORE pushing the node. The old allotments pushed crops at a
  // fixed y with nothing under them, so wherever the sculpt cut the ground away
  // the crop was left hanging a block over a hole. Every node this module places
  // now stands on a block this module placed, at this column's own walk level.
  for (const [fx, fz] of [
    [-21, -21], [-20, -21], [-21, -19], [-20, -19], [-21, -16], [-20, -16],
    [-21, -14], [-20, -14], [-21, -8], [-20, -8], [-21, -6], [-20, -6],
  ]) {
    set(fx, gy(fx, fz), fz, B.farmland);
    nodes.push({ type: 'farm_plot', x: fx, y: fy(fx, fz), z: fz });
  }
  // a privy and a draw-well at the bottom of a toft, exactly as close together
  // as medieval backland archaeology keeps finding them
  {
    const y = fy(-20, -11);
    box(-21, y, -12, -20, y + 2, -11, B.planks); set(-20, y, -11, B.air); set(-20, y + 1, -11, B.air);
    box(-21, y + 3, -12, -20, y + 3, -11, B.thatch);
    set(-19, y - 1, -4, B.cobble); set(-19, y, -4, B.water);
    for (const [d, e] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) set(-19 + d, fy(-19 + d, -4 + e), -4 + e, B.cobble_wall);
  }

  // --- the town gate -------------------------------------------------------
  // A bank-and-ditch town, so this is a gatehouse on the road, not a wall.
  {
    const gz = 28;
    for (const gx of [-11, -5]) {
      const y = fy(gx, gz);
      box(gx, y, gz - 1, gx, y + 5, gz + 1, B.stone_brick);
      set(gx, y + 6, gz, B.cobble_wall); set(gx, y + 7, gz, B.sea_lantern);
    }
    const y = fy(-8, gz);
    for (let x = -11; x <= -5; x++) { set(x, y + 5, gz, B.stone_brick); set(x, y + 6, gz, B.stone_brick_slab); }
    for (let x = -14; x >= -18; x--) set(x, fy(x, gz), gz, B.cobble_wall);   // the bank running off
    for (let x = -2; x <= 2; x++) set(x, fy(x, gz), gz, B.cobble_wall);
    clutter(-13, gz + 2); clutter(-3, gz + 2);
  }
}
