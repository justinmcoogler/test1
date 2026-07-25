// Hand-authored starter content: the settlement of Brookhollow, its mine,
// and the Rootgrave dungeon beneath it. Produces explicit block edits +
// node/NPC/enemy placements that worldgen applies on top of terrain.
import { B } from './blocks.js';
import { buildTown } from './town.js';
import { LEARN_MEADOW } from './worldgen.js';
import { stampMineshafts, mineshaftClaims } from './mineshaft.js';
import { stampSky } from './sky.js';
import { stampUndercity, undercityClaims, attachUndercitySink } from './undercity.js';
import { stampDungeons, dungeonClaims } from './dungeon.js';
import { stampSettlements, settlementClaims, attachSettlementSink } from './settlements.js';

const key = (x, y, z) => `${x},${y},${z}`;

// Starter loot for the manor's built-in chests (in cell-iteration order). Any
// chest past this list is left empty — free home storage.

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

  // set a block AND record a facing for it (stairs roofs, gates, chest fronts).
  // facings carry REAL world y — set() already lifted the block, so lift here too.
  const setF = (x, y, z, id, f) => { set(x, y, z, id); facings.push([x, y + LIFT, z, f]); };

  // A cosy timber cottage with a pitched (gabled) stair roof, doorway, glass
  // windows, corner posts and a lamp. Centred at (cx,cz) on the plateau; halfX/
  // halfZ are interior half-extents so the footprint (2h+1) is odd — a clean
  // central ridge. `door` names the wall the doorway faces (S|N|E|W). The ridge
  // runs along Z and the roof slopes down to ±X. Returns the interior AABB.
  const house = (cx, cz, halfX, halfZ, opts = {}) => {
    const { wall = B.timber_wall, post = B.fernwood_log, floor = B.planks, roof = 'brick', door = 'S', wallH = 4 } = opts;
    const x0 = cx - halfX, x1 = cx + halfX, z0 = cz - halfZ, z1 = cz + halfZ;
    const yTop = F + wallH - 1;                                    // top wall row
    box(x0, GROUND, z0, x1, GROUND, z1, floor);                   // floor
    hollowWalls(x0, z0, x1, z1, F, yTop, wall);                   // walls
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) box(px, F, pz, px, yTop, pz, post); // corner posts
    // doorway (2 tall, centred on the chosen wall) + a lamp beside it
    const gap = (x, z) => { set(x, F, z, B.air); set(x, F + 1, z, B.air); };
    if (door === 'S') { gap(cx, z1); set(cx + 1, F, z1 + 1, B.torch_post); }
    else if (door === 'N') { gap(cx, z0); set(cx + 1, F, z0 - 1, B.torch_post); }
    else if (door === 'E') { gap(x1, cz); set(x1 + 1, F, cz + 1, B.torch_post); }
    else { gap(x0, cz); set(x0 - 1, F, cz + 1, B.torch_post); }
    // glass windows spaced along each wall (skip the doorway column)
    const win = (x, z) => set(x, F + 1, z, B.glasspane);
    for (let x = x0 + 1; x <= x1 - 1; x += 2) {
      if (!((door === 'S') && x === cx)) win(x, z1);
      if (!((door === 'N') && x === cx)) win(x, z0);
    }
    for (let z = z0 + 1; z <= z1 - 1; z += 2) {
      if (!((door === 'W') && z === cz)) win(x0, z);
      if (!((door === 'E') && z === cz)) win(x1, z);
    }
    // gabled roof: stair slopes to ±X + a slab ridge, with the two Z-end gables
    // filled solid up to the roof underside.
    const stair = B[roof + '_stairs'], slab = B[roof + '_slab'];
    const baseY = yTop + 1;
    for (let L = 0; L <= halfX; L++) {
      const y = baseY + L, wx = x0 + L, ex = x1 - L;
      if (wx < ex) {
        for (let z = z0; z <= z1; z++) { setF(wx, y, z, stair, 1); setF(ex, y, z, stair, 3); } // west→east, east→west slopes
      } else {
        for (let z = z0; z <= z1; z++) set(wx, y, z, slab); // ridge cap (odd width)
      }
      for (const zEnd of [z0, z1]) for (let yy = baseY; yy < y; yy++) { set(wx, yy, zEnd, wall); set(ex, yy, zEnd, wall); } // gable fill
    }
    set(cx, yTop, cz, B.sea_lantern); // hanging ceiling lamp lights the room
    return { x0, x1, z0, z1, cx, cz };
  };

  // ---- Brookhollow: streets, market square, moot hall (js/world/town.js) ---
  buildTown({ B, set, setF, box, F, GROUND, chests, npcs, nodes, spawns });

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
      // step-down fishing ledge: sand top at y=29, level with the water surface
      set(x, 29, z, B.sand);
      set(x, GROUND, z, B.air); set(x, F, z, B.air);
      // reeds root right where the ledge meets the water (a basin cell beside it)
      const byWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => Math.hypot(x + dx, (z + dz) - 18) <= 4.2);
      if (byWater && (x * 7 + z * 13) % 3 === 0) set(x, GROUND, z, B.reed);
    } else if (d <= 6.5) {
      // plateau lip you step down from — dry, so grass tufts rather than reeds
      set(x, GROUND, z, B.sand);
      if ((x * 7 + z * 13) % 5 === 0) set(x, F, z, B.tall_grass);
    }
  }
  // spots sit in the water, an easy cast from the ledge
  nodes.push({ type: 'fishing_spot', x: 3, y: 29, z: 18 });
  nodes.push({ type: 'fishing_spot', x: -2, y: 29, z: 16 });
  nodes.push({ type: 'fishing_spot', x: 0, y: 29, z: 21 });

  // ---- Millbrook & the spring pool (the upper fishing tiers) --------------
  // The pond only ever teaches the first cast. A brook runs east off its lip
  // into a spring pool that shelves away into deep water, so the river, shelf
  // and deep-water spots have real water to sit in without a day's walk. The
  // wild versions belong in the marsh/mangrove/coast biome tables (worldgen).
  const water = (x, z, floor) => {
    set(x, floor, z, B.sand);
    for (let y = floor + 1; y <= 29; y++) set(x, y, z, B.water);
    set(x, GROUND, z, B.air); set(x, F, z, B.air);
  };
  // a bank you stand down onto, its top level with the water like the pond ledge
  const bank = (x, z) => { set(x, 29, z, B.sand); set(x, GROUND, z, B.air); set(x, F, z, B.air); };
  // pool first, brook second — the channel then cuts cleanly through its shelf
  for (let x = 15; x <= 29; x++) for (let z = 13; z <= 27; z++) {
    const d = Math.hypot(x - 22, z - 20);
    if (d <= 2.4) water(x, z, 24);        // sunken middle: five blocks of water
    else if (d <= 5.2) water(x, z, 27);
    else if (d <= 6.4) bank(x, z);
  }
  for (let x = 5; x <= 17; x++) {
    for (let z = 19; z <= 21; z++) water(x, z, 27);
    if (x <= 15) { bank(x, 18); bank(x, 22); }
  }
  set(10, GROUND, 18, B.torch_post); set(15, GROUND, 22, B.torch_post);
  set(22, GROUND, 26, B.torch_post); set(28, GROUND, 20, B.torch_post);
  nodes.push({ type: 'fishing_river', x: 9, y: 29, z: 20 });
  nodes.push({ type: 'fishing_river', x: 14, y: 29, z: 20 });
  nodes.push({ type: 'fishing_coastal', x: 22, y: 29, z: 24 });
  nodes.push({ type: 'fishing_coastal', x: 25, y: 29, z: 18 });
  nodes.push({ type: 'fishing_deep', x: 22, y: 29, z: 20 });
  nodes.push({ type: 'fishing_deep', x: 21, y: 29, z: 21 });

  // ---- Farm --------------------------------------------------------------
  for (let x = -18; x <= -10; x++) for (let z = 16; z <= 22; z++) set(x, GROUND, z, B.farmland);
  for (const [fx, fz] of [[-16, 18], [-14, 18], [-16, 20], [-14, 20]]) {
    nodes.push({ type: 'farm_plot', x: fx, y: F, z: fz });
  }
  set(-18, F, 16, B.torch_post); set(-10, F, 22, B.torch_post);

  // Worked loam and rich, manured beds south of the thin plots: the soil tiers
  // need somewhere to stand before worldgen scatters them across the biomes.
  for (let x = -18; x <= -12; x++) for (let z = 24; z <= 28; z++) set(x, GROUND, z, B.farmland);
  for (const [fx, fz] of [[-16, 25], [-14, 25]]) nodes.push({ type: 'farm_loam', x: fx, y: F, z: fz });
  for (const [fx, fz] of [[-16, 27], [-14, 27]]) nodes.push({ type: 'farm_rich', x: fx, y: F, z: fz });
  set(-18, F, 28, B.torch_post); set(-12, F, 24, B.torch_post);

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

  // ---- West meadow scrap camp (for the first fight of the chain) ----------
  // Four scrappers and nothing else. This is the first real fight in the game,
  // so it is the one livery that spawns ungated in the starting bowl and there
  // is deliberately no slinger in it — learning that goblins come in numbers is
  // one lesson, and learning that some of them shoot is a later one.
  spawns.push({ id: 'gob_m1', type: 'scrap_goblin', x: -22, y: F, z: 22, fixed: true });
  spawns.push({ id: 'gob_m2', type: 'scrap_goblin', x: -26, y: F, z: 27, fixed: true });
  spawns.push({ id: 'gob_m3', type: 'scrap_goblin', x: -20, y: F, z: 27, fixed: true });
  spawns.push({ id: 'gob_m4', type: 'scrap_goblin', x: -27, y: F, z: 20, fixed: true });

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
  // the mine's cut face reaches stratified ground the surface test-pits can't
  nodes.push({ type: 'dig_trench', x: 21, y: 19, z: -48 });
  spawns.push({ id: 'rat_mine1', type: 'rat', x: 27, y: 19, z: -48, fixed: true });

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
  spawns.push({ id: 'rat_d1', type: 'rat', x: 22, y: 13, z: -63, fixed: true });
  spawns.push({ id: 'rat_d2', type: 'rat', x: 26, y: 13, z: -65, fixed: true });
  spawns.push({ id: 'gob_d1', type: 'scrap_goblin', x: 24, y: 13, z: -67, fixed: true });
  nodes.push({ type: 'dig_site', x: 21, y: 13, z: -67 });
  nodes.push({ type: 'dig_bog', x: 27, y: 13, z: -62 }); // waterlogged floor, so organics survive
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
  spawns.push({ id: 'boss_gorrak', type: 'goblin_warchief', x: 24, y: 13, z: -76, fixed: true, boss: true });
  set(24, 13, -80, B.chest_block);
  chests.push({
    id: 'rootgrave_chest', x: 24, y: 13, z: -80, requiresBossDead: 'boss_gorrak',
    loot: [
      { item: 'warchief_standard', qty: 1 }, { item: 'coin', qty: 120 },
      { item: 'ironbud_charm', qty: 1 }, { item: 'relic_fragment', qty: 2 },
    ],
  });
  set(29, 13, -80, B.enchant_altar);
  nodes.push({ type: 'ore_gold', x: 19, y: 13, z: -79 });
  nodes.push({ type: 'dig_site', x: 28, y: 13, z: -73 });
  // sealed under the boss hall — the richest dig in the starter world
  nodes.push({ type: 'dig_vault', x: 21, y: 13, z: -77 });

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

    // ---- the Ironring: a broken ring of ancient stone, north of camp -----
    // Vashk took it for a warcamp because it is the only walls for forty
    // blocks. The ring is older than the goblins and it will outlast them.
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
    spawns.push({ id: 'boss_vashk', type: 'goblin_warlord', x: CX, y: F2, z: DZ, fixed: true, boss: true });
    spawns.push({ id: 'ring_frost1', type: 'frost_goblin', x: CX - 5, y: F2, z: DZ + 4, fixed: true });
    spawns.push({ id: 'ring_frost2', type: 'frost_goblin', x: CX + 5, y: F2, z: DZ - 3, fixed: true });
    spawns.push({ id: 'ring_sling1', type: 'goblin_slinger', x: CX + 4, y: F2, z: DZ + 5, fixed: true });
    set(CX - 3, F2, DZ - 6, B.chest_block);
    chests.push({
      id: 'ironring_chest', x: CX - 3, y: F2, z: DZ - 6, requiresBossDead: 'boss_vashk',
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

  // The imported schematic manor was removed — the town is hand-built now
  // (js/world/town.js). Its plateau west of town is left open ground.

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
    ironring: [560, 34, -136],
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

  // Procedural towns (js/world/settlements.js) are discovered chunk by chunk long
  // after this runs, and their PEOPLE and map markers are not blocks, so they
  // cannot ride the chunk sink. Hand settlements.js the two live collections
  // world.js publishes — `world.structure.npcs` and `world.markers` — so a town's
  // villagers and its waypoint appear the moment the town generates. Attached
  // AFTER the blanket LIFT above, so a settlement's already-real coordinates are
  // never lifted a second time.
  attachSettlementSink({ npcs, markers });
  // …and the dwarven holds publish their four folk the same way.
  attachUndercitySink({ npcs });

  return { edits, nodes, spawns, npcs, chests, facings, markers };
}

// ---- Procedural sites (mineshafts & dungeons) -------------------------------
// Everything above is hand-authored and finite: it is built once and indexed by
// chunk. Mineshafts and dungeons are the opposite — endless, so they cannot be
// pre-built into a map, and they must be producible for one chunk with no
// neighbour loaded. They are therefore stamped ON DEMAND, per chunk, straight
// into the chunk being generated. See js/world/sites.js for how that stays
// deterministic.
//
// `sink` is what the caller uses to receive the site:
//   block(x, y, z, id)  world-space block write (already clipped to the chunk)
//   node(n)             a resource node ({type, x, y, z}) to register
//   spawn(s)            an enemy spawn point ({id, type, x, y, z, boss?})
//   chest(c)            chest metadata ({id, x, y, z, loot})
// Call it from chunk generation AFTER the terrain columns are written and the
// hand-built structure edits are applied, so a site carves through raw terrain
// but never through Brookhollow (which `nearHandBuilt` keeps it away from anyway).
export function stampChunkStructures(gen, cx, cz, sink) {
  // The sky archipelago first. It lives 150-370 blocks up, so it cannot
  // collide with anything below and the ground passes keep their own order.
  stampSky(gen, cx, cz, sink);
  // The undercity goes down before the mineshafts and dungeons, so a drift
  // that happens to run into it breaks through into the city rather than the
  // city carving a hole in a corridor you were walking.
  stampUndercity(gen, cx, cz, sink);
  stampMineshafts(gen, cx, cz, sink);
  stampDungeons(gen, cx, cz, sink);
  // Towns go LAST on purpose. A town levels a platform and clears the air over it,
  // so it has to be able to overwrite a shaft head or a dungeon stair that a
  // region roll happened to put on the same ground — the alternative (teaching
  // mineshaft.js and dungeon.js to refuse those sites) is a cleaner fix but it
  // belongs to those modules; `settlementNear` is exported and ready for it.
  stampSettlements(gen, cx, cz, sink);
}

// Surface columns a site's entrance owns. Worldgen's vegetation/node/mob scatter
// should skip these, or a tree grows through the winding gear. Deliberately the
// ENTRANCE footprint only, not the whole site: a mineshaft's workings are 60
// blocks across and blanking that much surface would leave a bald square.
export function structureClaims(gen, x, z) {
  return mineshaftClaims(gen, x, z) || dungeonClaims(gen, x, z) || settlementClaims(gen, x, z)
    || undercityClaims(gen, x, z);
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
