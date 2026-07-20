// Hand-authored starter content: the settlement of Brookhollow, its mine,
// and the Rootgrave dungeon beneath it. Produces explicit block edits +
// node/NPC/enemy placements that worldgen applies on top of terrain.
import { B } from './blocks.js';

const key = (x, y, z) => `${x},${y},${z}`;

export function buildStarterStructures() {
  const edits = new Map();
  const nodes = [];
  const spawns = [];
  const npcs = [];
  const chests = [];

  const set = (x, y, z, id) => edits.set(key(x, y, z), id);
  const box = (x1, y1, z1, x2, y2, z2, id) => {
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) set(x, y, z, id);
  };
  const hollowWalls = (x1, z1, x2, z2, y1, y2, id) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) { set(x, y, z1, id); set(x, y, z2, id); }
      for (let z = z1; z <= z2; z++) { set(x1, y, z, id); set(x2, y, z, id); }
    }
  };

  const GROUND = 30; // settlement plateau surface height
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
  for (let x = -5; x <= 5; x++) for (let z = 13; z <= 23; z++) {
    const d = Math.hypot(x - 0, z - 18);
    if (d <= 4.5) {
      set(x, 26, z, B.sand);
      for (let y = 27; y <= 29; y++) set(x, y, z, B.water);
      set(x, GROUND, z, B.air);
    } else if (d <= 5.6) {
      set(x, GROUND, z, B.sand);
      if ((x * 7 + z * 13) % 5 === 0) set(x, F, z, B.reed);
    }
  }
  nodes.push({ type: 'fishing_spot', x: 0, y: 29, z: 18 });
  nodes.push({ type: 'fishing_spot', x: 2, y: 29, z: 16 });

  // ---- Farm --------------------------------------------------------------
  for (let x = -18; x <= -10; x++) for (let z = 16; z <= 22; z++) set(x, GROUND, z, B.farmland);
  for (const [fx, fz] of [[-16, 18], [-14, 18], [-16, 20], [-14, 20]]) {
    nodes.push({ type: 'farm_plot', x: fx, y: F, z: fz });
  }
  set(-18, F, 16, B.torch_post); set(-10, F, 22, B.torch_post);

  // ---- Grove (woodcutting) ----------------------------------------------
  const groveTrees = [
    ['tree_fernwood', 20, 4], ['tree_fernwood', 24, -4], ['tree_fernwood', 27, 2],
    ['tree_fernwood', 21, -8], ['tree_fernwood', 28, 7], ['tree_silverbark', 25, -10],
  ];
  for (const [type, x, z] of groveTrees) {
    nodes.push({ type, x, y: F, z, meta: { h: 5 } });
  }

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
  nodes.push({ type: 'crystal_node', x: 19, y: 13, z: -79 });
  nodes.push({ type: 'dig_site', x: 28, y: 13, z: -73 });

  const markers = {
    spawn: [6, F, 6],
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

  return { edits, nodes, spawns, npcs, chests, markers };
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
