// Hand-authored starter content: the settlement of Brookhollow, its mine,
// and the Rootgrave dungeon beneath it. Produces explicit block edits +
// node/NPC/enemy placements that worldgen applies on top of terrain.
import { B } from './blocks.js';
import { MANOR } from './starter-manor.js';
import { LEARN_MEADOW } from './worldgen.js';

const key = (x, y, z) => `${x},${y},${z}`;

// Starter loot for the manor's built-in chests (in cell-iteration order). Any
// chest past this list is left empty — free home storage.
const MANOR_CHEST_LOOT = [
  [{ item: 'travel_biscuit', qty: 3 }, { item: 'torch_item', qty: 6 }],
  [{ item: 'plant_fibre', qty: 6 }, { item: 'rough_stone', qty: 6 }],
  [{ item: 'coin', qty: 40 }],
];

// The whole settlement, mine, dungeon, pond and Frostwatch camp are authored
// at the legacy 64-tall vertical scale (ground≈30) and lifted uniformly into
// the current 128-tall world by LIFT. Lifting everything by the same amount
// preserves every relative height — so mine→dungeon stairs stay contiguous
// and the pond stays watertight without touching a single interior y-literal.
// LIFT must equal (worldgen settlement surface) − 30. Worldgen pins the
// settlement plateau at 64 and Frostwatch at 67, so LIFT = 34.
const LIFT = 34;

export function buildStarterStructures() {
  const edits = new Map();
  const nodes = [];
  const spawns = [];
  const npcs = [];
  const chests = [];
  const facings = []; // [worldX, worldY, worldZ, facing] for directional structure blocks

  // every block write is lifted; callers author at the legacy scale
  const set = (x, y, z, id) => edits.set(key(x, y + LIFT, z), id);
  const box = (x1, y1, z1, x2, y2, z2, id) => {
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) set(x, y, z, id);
  };
  const hollowWalls = (x1, z1, x2, z2, y1, y2, id) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) { set(x, y, z1, id); set(x, y, z2, id); }
      for (let z = z1; z <= z2; z++) { set(x1, y, z, id); set(x2, y, z, id); }
    }
  };

  const GROUND = 30; // authored plateau height (real surface is GROUND + LIFT)
  const F = GROUND + 1; // standing level

  // ---- Paths -------------------------------------------------------------
  for (let x = -30; x <= 30; x++) for (let z = 0; z <= 1; z++) set(x, GROUND, z, B.gravel);
  for (let z = -30; z <= 30; z++) for (let x = 0; x <= 1; x++) set(x, GROUND, z, B.gravel);
  for (let i = -24; i <= 24; i += 12) {
    set(i, F, 2, B.torch_post);
    set(2, F, i, B.torch_post);
  }

  // ---- Elder's cottage ---------------------------------------------------
  box(-16, GROUND, -16, -8, GROUND, -8, B.planks);           // floor
  hollowWalls(-16, -16, -8, -8, F, F + 2, B.timber_wall);
  box(-16, F + 3, -16, -8, F + 3, -8, B.thatch);             // roof
  set(-12, F, -8, B.air); set(-12, F + 1, -8, B.air);        // doorway
  set(-10, F, -9, B.glasspane); set(-14, F, -9, B.glasspane);
  set(-15, F, -15, B.torch_post);
  set(-9, F, -15, B.chest_block);
  chests.push({ id: 'maren_chest', x: -9, y: F, z: -15, loot: [{ item: 'travel_biscuit', qty: 3 }] });
  npcs.push({ id: 'maren', x: -12, y: F, z: -6 });

  // ---- Workshop pavilion -------------------------------------------------
  box(8, GROUND, -16, 16, GROUND, -8, B.planks);
  for (const [px, pz] of [[8, -16], [16, -16], [8, -8], [16, -8]]) box(px, F, pz, px, F + 2, pz, B.fernwood_log);
  box(8, F + 3, -16, 16, F + 3, -8, B.thatch);
  set(10, F, -14, B.workbench);
  set(12, F, -14, B.furnace);
  set(14, F, -14, B.anvil_block);
  set(10, F, -10, B.construction_bench);
  set(12, F, -10, B.loom_block);
  set(14, F, -10, B.alchemy_table);
  set(9, F, -12, B.chest_block);
  chests.push({ id: 'workshop_chest', x: 9, y: F, z: -12, loot: [{ item: 'rough_stone', qty: 4 }, { item: 'plant_fibre', qty: 4 }] });
  set(6, F, -6, B.campfire);

  // ---- Merchant stall ----------------------------------------------------
  for (const [px, pz] of [[-16, 8], [-10, 8], [-16, 12], [-10, 12]]) box(px, F, pz, px, F + 2, pz, B.fernwood_log);
  box(-16, F + 3, 8, -10, F + 3, 12, B.thatch);
  for (let x = -15; x <= -11; x++) set(x, F, 8, B.planks);   // counter
  npcs.push({ id: 'tam', x: -13, y: F, z: 10 });

  // ---- Pond (fishing) ----------------------------------------------------
  // A sunken basin ringed by a step-down sand ledge: step off the plateau onto
  // the ledge (one block down, level with the water surface at y=30) and cast
  // straight into the pond.
  for (let x = -7; x <= 7; x++) for (let z = 11; z <= 25; z++) {
    const d = Math.hypot(x, z - 18);
    if (d <= 4.2) {
      // water basin — floor at y=26, water fills to y=29, surface at y=30
      set(x, 26, z, B.sand);
      for (let y = 27; y <= 29; y++) set(x, y, z, B.water);
      set(x, GROUND, z, B.air); set(x, F, z, B.air);
    } else if (d <= 5.6) {
      // step-down fishing ledge: sand top at y=30, one step below the plateau
      set(x, 29, z, B.sand);
      set(x, GROUND, z, B.air); set(x, F, z, B.air);
    } else if (d <= 6.5) {
      // plateau lip you step down from, with a few reeds
      set(x, GROUND, z, B.sand);
      if ((x * 7 + z * 13) % 5 === 0) set(x, F, z, B.reed);
    }
  }
  // spots sit in the water, an easy cast from the ledge
  nodes.push({ type: 'fishing_spot', x: 3, y: 29, z: 18 });
  nodes.push({ type: 'fishing_spot', x: -2, y: 29, z: 16 });
  nodes.push({ type: 'fishing_spot', x: 0, y: 29, z: 21 });

  // ---- Farm --------------------------------------------------------------
  for (let x = -18; x <= -10; x++) for (let z = 16; z <= 22; z++) set(x, GROUND, z, B.farmland);
  for (const [fx, fz] of [[-16, 18], [-14, 18], [-16, 20], [-14, 20]]) {
    nodes.push({ type: 'farm_plot', x: fx, y: F, z: fz });
  }
  set(-18, F, 16, B.torch_post); set(-10, F, 22, B.torch_post);

  // ---- Grove (woodcutting) ----------------------------------------------
  const groveTrees = [
    ['tree_pine', 20, 4], ['tree_pine', 24, -4], ['tree_pine', 27, 2],
    ['tree_pine', 21, -8], ['tree_oak', 28, 7], ['tree_birch', 25, -10],
  ];
  for (const [type, x, z] of groveTrees) {
    nodes.push({ type, x, y: F, z, meta: { h: 5 } });
  }

  // ---- Town storage (shared stash by the spawn square) -------------------
  set(4, F, 4, B.chest_block);
  chests.push({ id: 'town_storage', x: 4, y: F, z: 4, loot: [] });

  // ---- Training yard -----------------------------------------------------
  for (let x = 8; x <= 16; x++) for (let z = 8; z <= 16; z++) set(x, GROUND, z, B.gravel);
  spawns.push({ id: 'dummy1', type: 'practice_dummy', x: 12, y: F, z: 12, fixed: true });
  set(8, F, 8, B.torch_post); set(16, F, 16, B.torch_post);

  // ---- Boar meadow (for the hunting quest) -------------------------------
  spawns.push({ id: 'boar_m1', type: 'mudback_boar', x: -22, y: F, z: 22, fixed: true });
  spawns.push({ id: 'boar_m2', type: 'mudback_boar', x: -26, y: F, z: 27, fixed: true });
  spawns.push({ id: 'sprite_m1', type: 'thicket_sprite', x: -27, y: F, z: 20, fixed: true });

  // ---- Mine: arch, stairway, ore chamber ---------------------------------
  // Entrance arch at z=-24, stairs descend northward (z decreasing).
  for (const px of [22, 26]) box(px, F, -24, px, F + 2, -24, B.stone_brick);
  for (let x = 22; x <= 26; x++) set(x, F + 3, -24, B.stone_brick);

  for (let i = 0; i <= 11; i++) {
    const z = -25 - i;
    const floor = GROUND - 1 - i; // 29 down to 18
    for (let x = 23; x <= 25; x++) {
      set(x, floor, z, B.stone_brick);
      for (let y = floor + 1; y <= floor + 3; y++) set(x, y, z, B.air);
      // make sure there's ceiling above shallow steps so the shaft is enclosed
      if (i > 2) set(x, floor + 4, z, B.stone);
    }
    if (i % 4 === 0) set(23, floor + 1, z, B.torch_post);
  }

  // corridor at floor 18: z -37..-44
  for (let z = -44; z <= -37; z++) for (let x = 23; x <= 25; x++) {
    set(x, 18, z, B.stone_brick);
    for (let y = 19; y <= 21; y++) set(x, y, z, B.air);
    set(x, 22, z, B.stone);
  }
  set(23, 19, -40, B.torch_post);

  // ore chamber: x 18..30, z -54..-44, floor 18, air 19..22
  box(18, 18, -54, 30, 18, -44, B.stone_brick);
  box(18, 19, -54, 30, 22, -44, B.air);
  box(18, 23, -54, 30, 23, -44, B.stone);
  hollowWalls(17, -55, 31, -43, 19, 22, B.stone);
  // reopen the corridor mouth
  for (let y = 19; y <= 21; y++) for (let x = 23; x <= 25; x++) set(x, y, -43, B.air);
  set(19, 19, -45, B.torch_post); set(29, 19, -45, B.torch_post);
  set(19, 19, -53, B.torch_post); set(29, 19, -53, B.torch_post);
  nodes.push({ type: 'ore_copper', x: 20, y: 19, z: -46 });
  nodes.push({ type: 'ore_copper', x: 22, y: 19, z: -50 });
  nodes.push({ type: 'ore_copper', x: 26, y: 19, z: -52 });
  nodes.push({ type: 'ore_tin', x: 26, y: 19, z: -46 });
  nodes.push({ type: 'ore_tin', x: 28, y: 19, z: -50 });
  nodes.push({ type: 'ore_iron', x: 19, y: 19, z: -52 });
  spawns.push({ id: 'rat_mine1', type: 'gloomrat', x: 27, y: 19, z: -48, fixed: true });

  // ---- Descent to the Rootgrave (dungeon) --------------------------------
  for (let i = 0; i <= 5; i++) {
    const z = -55 - i;
    const floor = 17 - i; // 17 down to 12
    for (let x = 23; x <= 25; x++) {
      set(x, floor, z, B.ruin_brick);
      for (let y = floor + 1; y <= floor + 3; y++) set(x, y, z, B.air);
      set(x, floor + 4, z, B.rootstone);
    }
  }
  set(23, 13, -59, B.torch_post);

  // antechamber: x 20..28, z -68..-61, floor 12
  box(20, 12, -68, 28, 12, -61, B.ruin_brick);
  box(20, 13, -68, 28, 16, -61, B.air);
  box(20, 17, -68, 28, 17, -61, B.rootstone);
  hollowWalls(19, -69, 29, -60, 13, 16, B.mossy_ruin);
  for (let y = 13; y <= 15; y++) for (let x = 23; x <= 25; x++) set(x, y, -60, B.air); // entry mouth
  spawns.push({ id: 'rat_d1', type: 'gloomrat', x: 22, y: 13, z: -63, fixed: true });
  spawns.push({ id: 'rat_d2', type: 'gloomrat', x: 26, y: 13, z: -65, fixed: true });
  spawns.push({ id: 'creeper_d1', type: 'root_creeper', x: 24, y: 13, z: -67, fixed: true });
  nodes.push({ type: 'dig_site', x: 21, y: 13, z: -67 });
  set(20, 13, -61, B.torch_post); set(28, 13, -67, B.torch_post);

  // doorway antechamber → boss hall at z=-68/-69
  for (let y = 13; y <= 15; y++) for (let x = 23; x <= 25; x++) { set(x, y, -68, B.air); set(x, y, -69, B.air); }

  // boss hall: x 17..31, z -82..-70, floor 12
  box(17, 12, -82, 31, 12, -70, B.stone_brick);
  box(17, 13, -82, 31, 18, -70, B.air);
  box(17, 19, -82, 31, 19, -70, B.rootstone);
  hollowWalls(16, -83, 32, -69, 13, 18, B.ruin_brick);
  for (let y = 13; y <= 15; y++) for (let x = 23; x <= 25; x++) set(x, y, -70, B.air);
  for (const [px, pz] of [[19, -72], [29, -72], [19, -80], [29, -80]]) {
    box(px, 13, pz, px, 18, pz, B.mossy_ruin);
  }
  set(18, 13, -71, B.torch_post); set(30, 13, -71, B.torch_post);
  set(18, 13, -81, B.torch_post); set(30, 13, -81, B.torch_post);
  spawns.push({ id: 'boss_rootbound', type: 'rootbound_golem', x: 24, y: 13, z: -76, fixed: true, boss: true });
  set(24, 13, -80, B.chest_block);
  chests.push({
    id: 'rootgrave_chest', x: 24, y: 13, z: -80, requiresBossDead: 'boss_rootbound',
    loot: [
      { item: 'rootbound_heart', qty: 1 }, { item: 'coin', qty: 120 },
      { item: 'ironbud_charm', qty: 1 }, { item: 'relic_fragment', qty: 2 },
    ],
  });
  set(29, 13, -80, B.enchant_altar);
  nodes.push({ type: 'ore_gold', x: 19, y: 13, z: -79 });
  nodes.push({ type: 'dig_site', x: 28, y: 13, z: -73 });

  // ---- Frostwatch: frontier camp in the forced-tundra ring ---------------
  // Terrain is pinned flat at ground 33 within r<26 of (560,-120) by worldgen.
  {
    const CX = 560, CZ = -120;
    const G2 = 33, F2 = G2 + 1;
    // cleared gravel yard + central campfire
    for (let x = CX - 6; x <= CX + 6; x++) for (let z = CZ - 5; z <= CZ + 5; z++) {
      if ((x + z) % 3 === 0) set(x, G2, z, B.gravel);
    }
    set(CX, F2, CZ, B.campfire);
    for (const [tx, tz] of [[CX - 6, CZ - 5], [CX + 6, CZ - 5], [CX - 6, CZ + 5], [CX + 6, CZ + 5]]) {
      set(tx, F2, tz, B.torch_post);
    }
    // warden's lean-to
    box(CX - 6, G2, CZ + 2, CX - 2, G2, CZ + 5, B.planks);
    for (const [px, pz] of [[CX - 6, CZ + 2], [CX - 2, CZ + 2], [CX - 6, CZ + 5], [CX - 2, CZ + 5]]) {
      box(px, F2, pz, px, F2 + 2, pz, B.emberpine_log);
    }
    box(CX - 6, F2 + 3, CZ + 2, CX - 2, F2 + 3, CZ + 5, B.thatch);
    set(CX - 5, F2, CZ + 4, B.chest_block);
    chests.push({
      id: 'frostwatch_chest', x: CX - 5, y: F2, z: CZ + 4,
      loot: [{ item: 'travel_biscuit', qty: 3 }, { item: 'torch_item', qty: 4 }],
    });
    npcs.push({ id: 'sylla', x: CX - 4, y: F2, z: CZ + 1 });
    // field forge
    box(CX + 3, G2, CZ + 2, CX + 6, G2, CZ + 4, B.stone_brick);
    set(CX + 4, F2, CZ + 3, B.furnace);
    set(CX + 5, F2, CZ + 3, B.anvil_block);
    set(CX + 3, F2, CZ + 2, B.workbench);
    set(CX + 6, F2, CZ + 4, B.campfire);

    // ---- the Rimehowl den: a broken ring of ancient stone, north of camp --
    const DZ = CZ - 16; // z = -136, fully inside the pinned-flat zone
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const rx = CX + Math.round(Math.cos(ang) * 8);
      const rz = DZ + Math.round(Math.sin(ang) * 8);
      if (a % 5 === 0) continue; // broken gaps
      const hgt = a % 3 === 0 ? 3 : a % 2 === 0 ? 2 : 1;
      box(rx, F2, rz, rx, F2 + hgt - 1, rz, a % 4 === 0 ? B.mossy_ruin : B.ruin_brick);
    }
    // snow-dusted floor + bones of old kills
    for (let x = CX - 6; x <= CX + 6; x++) for (let z = DZ - 6; z <= DZ + 6; z++) {
      if (Math.hypot(x - CX, z - DZ) <= 7 && (x * 5 + z * 11) % 4 === 0) set(x, G2, z, B.snow_grass);
    }
    spawns.push({ id: 'boss_rimehowl', type: 'rimehowl_alpha', x: CX, y: F2, z: DZ, fixed: true, boss: true });
    spawns.push({ id: 'den_wolf1', type: 'frostmaw_wolf', x: CX - 5, y: F2, z: DZ + 4, fixed: true });
    spawns.push({ id: 'den_wolf2', type: 'frostmaw_wolf', x: CX + 5, y: F2, z: DZ - 3, fixed: true });
    spawns.push({ id: 'den_shade1', type: 'rime_shade', x: CX + 4, y: F2, z: DZ + 5, fixed: true });
    set(CX - 3, F2, DZ - 6, B.chest_block);
    chests.push({
      id: 'rimehowl_chest', x: CX - 3, y: F2, z: DZ - 6, requiresBossDead: 'boss_rimehowl',
      loot: [
        { item: 'frostbrand_blade', qty: 1 }, { item: 'coin', qty: 250 },
        { item: 'veilcrystal', qty: 2 }, { item: 'relic_fragment', qty: 2 },
        { item: 'flawless_veilcrystal', qty: 1 },
      ],
    });
    // ore for the trip out
    nodes.push({ type: 'ore_silver', x: CX + 9, y: F2, z: CZ + 8 });
    nodes.push({ type: 'ore_iron', x: CX - 9, y: F2, z: CZ + 9 });
    nodes.push({ type: 'tree_yew', x: CX + 10, y: F2, z: CZ - 4, meta: { h: 6 } });
  }

  // ---- Ashford Manor: the grand starter house west of town ---------------
  // Converted from a Minecraft schematic (assets/schematics/z7_recolored) and
  // baked to a (0,0,0)-cornered cell list by tools/bake-manor.mjs. Placed so the
  // build's terrace (its layer y=4) lands on the plateau surface: the foundation
  // (y<4) buries and you walk in at ground level. Worldgen pins MANOR_PAD flat
  // and keeps procedural trees/mobs off it. Its built-in chests become storage.
  {
    // origin: normalized y=0 → authored 26 → real 60 (set() adds LIFT); terrace
    // y=4 → real 64. Footprint 36×28 centered on the pad at world (-60, 0).
    const OX = -78, OZ = -14, OY = 26;
    const pal = MANOR.palette.map((n) => B[n]);
    const cells = MANOR.cells;
    const stride = MANOR.stride || 4;
    let mc = 0;
    for (let i = 0; i < cells.length; i += stride) {
      const x = OX + cells[i], y = OY + cells[i + 1], z = OZ + cells[i + 2], id = pal[cells[i + 3]];
      const facing = stride >= 5 ? cells[i + 4] : 255;
      set(x, y, z, id);
      if (facing !== 255) facings.push([x, y + LIFT, z, facing]); // real y (set() lifted the block)
      if (id === B.chest_block) {
        chests.push({ id: `manor_chest_${mc}`, x, y, z, loot: MANOR_CHEST_LOOT[mc] || [] });
        mc++;
      }
    }
    // gravel lane linking the town's west path to the manor terrace
    for (let x = -42; x <= -31; x++) for (let z = 0; z <= 1; z++) set(x, GROUND, z, B.gravel);
  }

  // ---- Numbers Meadow: the kids' Learning Mode classroom pad ----------------
  // A quiet, combat-free grass yard far east of town. Worldgen pins LEARN_MEADOW
  // flat at ground 64 and keeps procedural trees/mobs off it. The child performs
  // math lessons by placing wool blocks on the WORK MAT; js/game/lessons.js reads
  // the mat region (recorded in markers.learnMat) to count what they've built.
  // Authored at the legacy scale like everything else: set() adds LIFT, so the
  // floor authored at GL=30 lands on the real surface (64) and standing is 65.
  const learnMat = (() => {
    const LX = LEARN_MEADOW.x, LZ = LEARN_MEADOW.z;   // world 200, 200
    const GL = LEARN_MEADOW.ground - LIFT;            // 30 → real 64 after set() lifts
    const FL = GL + 1;                                // 31 → real 65 (standing / build layer)
    const HALF = 11;                                  // 23×23 yard
    // grass yard with a gravel path just inside the fence
    for (let x = LX - HALF; x <= LX + HALF; x++) {
      for (let z = LZ - HALF; z <= LZ + HALF; z++) {
        const ring = Math.max(Math.abs(x - LX), Math.abs(z - LZ)) === HALF;
        set(x, GL, z, ring ? B.gravel : B.grass);
      }
    }
    // low fence border, with a 3-wide entry gap on the south edge
    for (let x = LX - HALF; x <= LX + HALF; x++) {
      set(x, FL, LZ - HALF, B.planks_fence);
      if (Math.abs(x - LX) > 1) set(x, FL, LZ + HALF, B.planks_fence);
    }
    for (let z = LZ - HALF; z <= LZ + HALF; z++) {
      set(LX - HALF, FL, z, B.planks_fence);
      set(LX + HALF, FL, z, B.planks_fence);
    }
    // corner torches light the yard
    for (const [tx, tz] of [[LX - HALF + 1, LZ - HALF + 1], [LX + HALF - 1, LZ - HALF + 1],
      [LX - HALF + 1, LZ + HALF - 1], [LX + HALF - 1, LZ + HALF - 1]]) {
      set(tx, FL, tz, B.torch_post);
    }
    // the work mat: 9×5 light-gray wool, a brown planks stripe down the middle
    // splitting it into a LEFT and a RIGHT half (used by the sorting lesson)
    const X0 = LX - 4, X1 = LX + 4, Z0 = LZ - 2, Z1 = LZ + 2;
    for (let x = X0; x <= X1; x++) {
      for (let z = Z0; z <= Z1; z++) set(x, GL, z, x === LX ? B.planks : B.light_gray_wool);
    }
    // torches flanking the mat's dividing line
    set(LX, FL, Z0 - 1, B.torch_post);
    set(LX, FL, Z1 + 1, B.torch_post);
    // guide Pip's little stand, just south of the mat
    box(LX - 1, GL, LZ - 6, LX + 1, GL, LZ - 4, B.planks);
    set(LX - 2, FL, LZ - 5, B.torch_post);
    npcs.push({ id: 'pip', x: LX, y: FL, z: LZ - 5 });
    // return the mat AABB in REAL world coords (build layer = FL + LIFT = 65)
    return { x0: X0, x1: X1, z0: Z0, z1: Z1, y0: FL + LIFT, y1: FL + LIFT + 2, div: LX };
  })();

  const markers = {
    // teleport-in point: a step south of Pip, facing the mat (lifted below)
    learnMeadow: [LEARN_MEADOW.x, (LEARN_MEADOW.ground - LIFT) + 1, LEARN_MEADOW.z - 6],
    manor: [-60, F, 0],
    spawn: [6, F, 6],
    frostwatch: [556, 34, -119],
    wolfDen: [560, 34, -136],
    cottage: [-12, F, -7],
    workshop: [12, F, -12],
    stall: [-13, F, 9],
    pond: [0, GROUND, 18],
    farm: [-14, F, 19],
    grove: [24, F, 0],
    trainingYard: [12, F, 12],
    meadow: [-24, F, 24],
    mineEntrance: [24, F, -23],
    mineChamber: [24, 19, -49],
    dungeonAntechamber: [24, 13, -64],
    bossHall: [24, 13, -76],
  };

  // Block writes were lifted inside set(); the data placements above still hold
  // authored y-values, so lift them all by the same amount to land on the real
  // (128-tall) surface. Do this once, here, instead of at every push site.
  for (const n of nodes) n.y += LIFT;
  for (const sp of spawns) sp.y += LIFT;
  for (const ch of chests) ch.y += LIFT;
  for (const n of npcs) n.y += LIFT;
  for (const m of Object.values(markers)) m[1] += LIFT;
  // learnMat is an AABB object (already in real coords), not a [x,y,z] marker —
  // attach it after the blanket lift so its fields aren't mangled by m[1]+=LIFT.
  markers.learnMat = learnMat;

  return { edits, nodes, spawns, npcs, chests, facings, markers };
}

// Index structure edits by chunk for fast application during generation.
export function indexEditsByChunk(edits, CHUNK) {
  const byChunk = new Map();
  for (const [k, id] of edits) {
    const [x, y, z] = k.split(',').map(Number);
    const ck = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    if (!byChunk.has(ck)) byChunk.set(ck, []);
    byChunk.get(ck).push([x, y, z, id]);
  }
  return byChunk;
}
