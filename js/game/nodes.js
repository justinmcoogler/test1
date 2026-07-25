// Regenerating resource nodes: definitions, visuals per state, drop tables.
// Node instances live in world chunks; their states persist in the save.
// The tree/ore/deposit nodes are GENERATED from the realistic material catalog
// (js/game/materials.js) so they can never drift from the spine; the non-metal
// gathering nodes (fishing, foraging, digging, farming) stay hand-authored.
import { B } from '../world/blocks.js';
import { TREE_SPECIES, buildTree } from '../world/trees.js';
import { METALS, WOODS, GEMS } from './materials.js';

// Gems are found RANDOMLY while mining any rock (the owner's realistic rule):
// every metal-ore node carries an uncut-gem rare table, common gems everywhere,
// rarer gems weighted lower and slightly richer at deeper (higher-level) ores.
function gemRareTable(mineLevel) {
  return GEMS.map((g) => ({
    item: `uncut_${g.id}`,
    chance: Math.max(0.0004, Math.min(0.03, (0.004 * (1 + mineLevel / 50)) / g.tier)),
  }));
}

// How tall a trunk of each canopy shape runs, before the wood's tier stretches
// it. The SHAPE of a tree lives in js/world/trees.js; only this range is derived
// here, because it scales off the material spine's tier and the tier is what
// makes a far-ring species read as a bigger tree of the same silhouette.
const TRUNK_BASE = { conical: [6, 8], spreading: [7, 10], weeping: [6, 8], round: [4, 6] };

const generated = {};
// One woodcutting node per real wood species. The node owns the ECONOMY of a
// tree (level, xp, charges, respawn, drops); its geometry is TREE_SPECIES' —
// nodeBlocks below hands off to buildTree, so a pine reads as a pine and a
// weeping yew as a yew without a second copy of the canopy code living here.
for (const w of WOODS) {
  const sp = TREE_SPECIES[w.id];
  if (!sp) throw new Error(`wood ${w.id} has no tree species in js/world/trees.js`);
  const [lo, hi] = TRUNK_BASE[sp.canopy];
  // Branchy species carry a heavier crown, so they stand a block taller.
  const heavy = sp.branches >= 3 ? 1 : 0;
  const trunk = [lo + heavy + Math.floor(w.tier / 4), hi + heavy + Math.floor(w.tier / 3)];
  generated[`tree_${w.id}`] = {
    label: `${w.label} Tree`, skill: 'woodcutting', level: w.woodLevel, tool: 'axe',
    xp: Math.round(12 + w.tier * 6), time: +(2.6 + w.tier * 0.25).toFixed(1),
    charges: [3, 5 + Math.floor(w.tier / 3)], respawn: 40 + w.tier * 20, kind: 'tree',
    log: `${w.id}_log`, leaves: `${w.id}_leaves`, species: w.id, trunk,
    drops: [{ item: `${w.id}_log`, qty: [1, 1], weight: 1 }],
    rare: [],
  };
}
// One mining node per mineable metal (copper…meteoric + lead/zinc/silver/gold/platinum).
for (const m of METALS.filter((x) => (x.smelt || []).some((s) => s.endsWith('_ore')))) {
  const lvl = m.mineLevel || 1;
  generated[`ore_${m.id}`] = {
    label: `${m.label} Vein`, skill: 'mining', level: lvl, tool: 'pickaxe',
    xp: Math.round(14 + lvl * 1.2), time: +(3 + lvl * 0.03).toFixed(1),
    charges: [2, m.rare ? 3 : 4], respawn: 60 + lvl * 4, kind: 'ore',
    ready: `${m.id}_ore`, depleted: 'depleted_rock',
    drops: [{ item: `${m.id}_ore`, qty: [1, m.role === 'ammo' ? 2 : 1], weight: 1 }],
    rare: gemRareTable(lvl),
  };
}
// Mineral deposits: fuel + the black-powder reagents.
generated.deposit_coal = {
  label: 'Coal Seam', skill: 'mining', level: 15, tool: 'pickaxe', xp: 26, time: 3.4,
  charges: [2, 4], respawn: 120, kind: 'ore', ready: 'coal_seam', depleted: 'depleted_rock',
  drops: [{ item: 'coal', qty: [1, 2], weight: 1 }], rare: [],
};
generated.deposit_saltpeter = {
  label: 'Saltpeter Deposit', skill: 'mining', level: 1, tool: 'pickaxe', xp: 12, time: 2.6,
  charges: [2, 3], respawn: 90, kind: 'ore', ready: 'saltpeter_deposit', depleted: 'depleted_rock',
  drops: [{ item: 'saltpeter', qty: [1, 2], weight: 1 }], rare: [],
};
generated.deposit_sulfur = {
  label: 'Sulfur Deposit', skill: 'mining', level: 15, tool: 'pickaxe', xp: 22, time: 3.0,
  charges: [2, 3], respawn: 150, kind: 'ore', ready: 'sulfur_deposit', depleted: 'depleted_rock',
  drops: [{ item: 'sulfur', qty: [1, 2], weight: 1 }], rare: [],
};

// respawn: seconds. charges: [min,max] gathers before depletion.
// time: base seconds per gather at level 1 with the minimum tool.
export const NODE_TYPES = {
  ...generated,
  // ---- Fishing water, tiered ------------------------------------------------
  // Four kinds of water, following the Fishing unlock ladder: still water off a
  // bank, then a running river, then the coastal shelf, then open deep water.
  // Each tier is slower to work but pays a better catch, so levelling changes
  // WHERE you fish, not just how fast the same silverfin arrives.
  fishing_spot: {
    label: 'Fishing Spot', skill: 'fishing', level: 1, tool: 'rod',
    xp: 22, time: 4.5, charges: [3, 6], respawn: 50, kind: 'water',
    drops: [
      { item: 'silverfin', qty: [1, 1], weight: 5 },
      { item: 'mudwhisker', qty: [1, 1], weight: 2, level: 8 },
      { item: 'duskeel', qty: [1, 1], weight: 1, level: 20 },
    ],
    rare: [{ item: 'waterlogged_cache', chance: 0.02 }],
  },
  fishing_river: {
    label: 'River Run', skill: 'fishing', level: 20, tool: 'rod',
    xp: 40, time: 5.0, charges: [3, 6], respawn: 60, kind: 'water',
    drops: [
      { item: 'reedpike', qty: [1, 1], weight: 4 },
      { item: 'mudwhisker', qty: [1, 2], weight: 3 },
      { item: 'duskeel', qty: [1, 1], weight: 1, level: 30 },
    ],
    rare: [{ item: 'waterlogged_cache', chance: 0.04 }],
  },
  fishing_coastal: {
    label: 'Coastal Shelf', skill: 'fishing', level: 30, tool: 'rod',
    xp: 58, time: 5.4, charges: [4, 7], respawn: 75, kind: 'water',
    drops: [
      { item: 'saltcrab', qty: [1, 2], weight: 4 },
      { item: 'reedpike', qty: [1, 2], weight: 2 },
      { item: 'palefin', qty: [1, 1], weight: 1, level: 50 },
    ],
    rare: [{ item: 'waterlogged_cache', chance: 0.05 }, { item: 'amber_resin', chance: 0.03 }],
  },
  fishing_deep: {
    label: 'Deep Water', skill: 'fishing', level: 50, tool: 'rod',
    xp: 84, time: 6.0, charges: [4, 8], respawn: 95, kind: 'water',
    drops: [
      { item: 'palefin', qty: [1, 2], weight: 4 },
      { item: 'saltcrab', qty: [1, 2], weight: 2 },
      { item: 'duskeel', qty: [1, 2], weight: 2 },
    ],
    rare: [{ item: 'waterlogged_cache', chance: 0.08 }, { item: 'veilcrystal', chance: 0.03 }],
  },
  herb_patch: {
    label: 'Herb Patch', skill: 'foraging', level: 1, tool: null,
    xp: 12, time: 1.8, charges: [1, 2], respawn: 45, kind: 'plant',
    ready: 'herb_patch', depleted: 'herb_patch_cut',
    drops: [
      { item: 'bitterleaf', qty: [1, 2], weight: 3 },
      { item: 'springroot', qty: [1, 1], weight: 2 },
      { item: 'duskcap', qty: [1, 1], weight: 1, level: 12 },
    ],
    rare: [{ item: 'sunpetal', chance: 0.03 }, { item: 'silverleaf', chance: 0.03 }],
  },
  berry_bush: {
    label: 'Tartberry Bush', skill: 'foraging', level: 1, tool: null,
    xp: 9, time: 1.6, charges: [2, 3], respawn: 70, kind: 'plant',
    ready: 'berry_bush', depleted: 'berry_bush_bare',
    drops: [{ item: 'tartberries', qty: [1, 3], weight: 1 }],
    rare: [{ item: 'fernwood_seed', chance: 0.02 }],
  },
  clay_deposit: {
    label: 'Clay Deposit', skill: 'mining', level: 1, tool: 'shovel',
    xp: 10, time: 2.2, charges: [2, 4], respawn: 50, kind: 'ore',
    ready: 'clay_block', depleted: 'depleted_rock',
    drops: [{ item: 'clay_lump', qty: [1, 2], weight: 1 }],
    rare: [],
  },
  // ---- Dig sites, tiered -----------------------------------------------------
  // A surface test-pit turns up potsherds; a cut trench reaches stratified
  // layers; waterlogged ground preserves organics and amber; and the sealed
  // assemblages under a ruin hold the relics everything else only hints at.
  dig_site: {
    label: 'Ancient Dig Site', skill: 'archaeology', level: 1, tool: 'shovel',
    xp: 30, time: 5.0, charges: [1, 2], respawn: 300, kind: 'ground',
    ready: 'dig_mound', depleted: null, // depleted → removed until respawn
    drops: [
      { item: 'pottery_shard', qty: [1, 2], weight: 4 },
      { item: 'old_coin', qty: [1, 3], weight: 3 },
      { item: 'bone_needle', qty: [1, 1], weight: 2 },
    ],
    rare: [{ item: 'relic_fragment', chance: 0.06 }],
  },
  dig_trench: {
    label: 'Excavation Trench', skill: 'archaeology', level: 15, tool: 'shovel',
    xp: 55, time: 5.6, charges: [2, 3], respawn: 330, kind: 'ground',
    ready: 'dig_mound', depleted: null,
    drops: [
      { item: 'pottery_shard', qty: [1, 3], weight: 3 },
      { item: 'old_coin', qty: [2, 4], weight: 3 },
      { item: 'bone_needle', qty: [1, 2], weight: 2 },
    ],
    rare: [{ item: 'relic_fragment', chance: 0.10 }, { item: 'rough_gem', chance: 0.04 }],
  },
  dig_bog: {
    label: 'Bog Deposit', skill: 'archaeology', level: 30, tool: 'shovel',
    xp: 90, time: 6.2, charges: [2, 4], respawn: 380, kind: 'ground',
    ready: 'dig_mound', depleted: null,
    drops: [
      { item: 'amber_resin', qty: [1, 2], weight: 3 },
      { item: 'bone_needle', qty: [2, 3], weight: 3 },
      { item: 'old_coin', qty: [3, 5], weight: 2 },
    ],
    rare: [{ item: 'relic_fragment', chance: 0.15 }, { item: 'uncut_topaz', chance: 0.05 }],
  },
  dig_vault: {
    label: 'Lost-Age Assemblage', skill: 'archaeology', level: 60, tool: 'shovel',
    xp: 160, time: 7.0, charges: [2, 4], respawn: 450, kind: 'ground',
    ready: 'dig_mound', depleted: null,
    drops: [
      { item: 'relic_fragment', qty: [1, 2], weight: 3 },
      { item: 'old_coin', qty: [5, 9], weight: 3 },
      { item: 'veilcrystal', qty: [1, 1], weight: 2 },
    ],
    rare: [{ item: 'uncut_diamond', chance: 0.03 }, { item: 'flawless_veilcrystal', chance: 0.02 }],
  },
  // ---- Farm beds, tiered -----------------------------------------------------
  // Soil quality is the farming ladder: thin plot → worked loam → rich, manured
  // ground. Better soil takes longer to come round but carries more per bed and
  // keeps back more seed.
  farm_plot: {
    label: 'Thin Soil Plot', skill: 'farming', level: 1, tool: null,
    xp: 25, time: 1.2, charges: [1, 1], respawn: 150, kind: 'farm',
    ready: 'crop_ripe', depleted: 'crop_young', // regrows through a young stage
    drops: [{ item: 'grainsheaf', qty: [1, 2], weight: 1 }],
    rare: [{ item: 'golden_grain', chance: 0.03 }, { item: 'grain_seeds', chance: 0.4 }],
  },
  farm_loam: {
    label: 'Loam Bed', skill: 'farming', level: 25, tool: null,
    xp: 60, time: 1.6, charges: [1, 2], respawn: 175, kind: 'farm',
    ready: 'crop_ripe', depleted: 'crop_young',
    drops: [
      { item: 'grainsheaf', qty: [2, 3], weight: 3 },
      { item: 'plant_fibre', qty: [2, 4], weight: 2 }, // fibre crops enter at 25
    ],
    rare: [{ item: 'golden_grain', chance: 0.06 }, { item: 'grain_seeds', chance: 0.5 }],
  },
  farm_rich: {
    label: 'Rich Bed', skill: 'farming', level: 50, tool: null,
    xp: 120, time: 2.0, charges: [2, 3], respawn: 210, kind: 'farm',
    ready: 'crop_ripe', depleted: 'crop_young',
    drops: [
      { item: 'grainsheaf', qty: [3, 5], weight: 3 },
      { item: 'golden_grain', qty: [1, 2], weight: 1 },
      { item: 'tartberries', qty: [2, 4], weight: 2 }, // orchard row along the bed
    ],
    rare: [{ item: 'silverleaf', chance: 0.05 }, { item: 'grain_seeds', chance: 0.6 }],
  },

  // ---- Nature-prop forage (kind 'prop') --------------------------------------
  // Each renders a 3D model from js/gfx/proppack.js (js/game/proppack.js
  // registers them as `prop_<id>`) at an invisible forage_marker cell; harvest,
  // XP, drops and respawn ride the generic node path. Scattered by worldgen.
  forage_brownmush: {
    label: 'Brown Mushroom', skill: 'foraging', level: 1, tool: null,
    xp: 10, time: 1.4, charges: [1, 2], respawn: 55, kind: 'prop',
    model: 'prop_brownmush', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'wild_mushroom', qty: [1, 2], weight: 1 }],
    rare: [{ item: 'duskcap', chance: 0.05 }],
  },
  forage_purple_mushroom: {
    label: 'Purple Mushroom', skill: 'foraging', level: 5, tool: null,
    xp: 14, time: 1.6, charges: [1, 2], respawn: 70, kind: 'prop',
    model: 'prop_purple_mushroom', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'wild_mushroom', qty: [1, 2], weight: 3 }, { item: 'duskcap', qty: [1, 1], weight: 1, level: 8 }],
    rare: [{ item: 'sunpetal', chance: 0.04 }],
  },
  forage_flower1: {
    label: 'Wildflower Cluster', skill: 'foraging', level: 1, tool: null,
    xp: 9, time: 1.4, charges: [1, 2], respawn: 50, kind: 'prop',
    model: 'prop_flower1', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'sunpetal', qty: [1, 2], weight: 3 }, { item: 'bitterleaf', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'springroot', chance: 0.05 }],
  },
  forage_rock3: {
    label: 'Loose Rocks', skill: 'foraging', level: 1, tool: null,
    xp: 8, time: 1.6, charges: [1, 2], respawn: 60, kind: 'prop',
    model: 'prop_rock3', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'rough_stone', qty: [1, 2], weight: 1 }],
    rare: [],
  },
  forage_rock4: {
    label: 'Rock Pile', skill: 'foraging', level: 1, tool: null,
    xp: 10, time: 1.8, charges: [1, 3], respawn: 65, kind: 'prop',
    model: 'prop_rock4', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'rough_stone', qty: [1, 3], weight: 1 }],
    rare: [],
  },
  forage_stick_bundle: {
    label: 'Fallen Sticks', skill: 'foraging', level: 1, tool: null,
    xp: 8, time: 1.3, charges: [1, 2], respawn: 45, kind: 'prop',
    model: 'prop_stick_bundle', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'plant_fibre', qty: [1, 2], weight: 1 }],
    rare: [],
  },
  forage_stick_bundle2: {
    label: 'Twig Scatter', skill: 'foraging', level: 1, tool: null,
    xp: 6, time: 1.1, charges: [1, 1], respawn: 40, kind: 'prop',
    model: 'prop_stick_bundle2', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'plant_fibre', qty: [1, 1], weight: 1 }],
    rare: [],
  },
  forage_stick_bundle3: {
    label: 'Kindling Pile', skill: 'foraging', level: 1, tool: null,
    xp: 11, time: 1.6, charges: [2, 3], respawn: 55, kind: 'prop',
    model: 'prop_stick_bundle3', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'plant_fibre', qty: [2, 3], weight: 1 }],
    rare: [],
  },
  forage_wooden_stump: {
    label: 'Weathered Stump', skill: 'foraging', level: 1, tool: null,
    xp: 12, time: 2.0, charges: [1, 2], respawn: 80, kind: 'prop',
    model: 'prop_wooden_stump', ready: 'forage_marker', depleted: null,
    drops: [{ item: 'plant_fibre', qty: [1, 2], weight: 2 }, { item: 'oak_log', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'amber_resin', chance: 0.05 }],
  },
};

// Prop forage nodes (kind 'prop'), for worldgen scatter + entity rendering.
export const PROP_NODE_TYPES = Object.keys(NODE_TYPES).filter((k) => NODE_TYPES[k].kind === 'prop');

// Blocks a node occupies for a given state. Coordinates are absolute.
// Tree canopies stay within a radius-2 footprint so they never cross into an
// unloaded neighbour chunk at generation time — buildTree enforces that itself.
export function nodeBlocks(node, state) {
  const def = NODE_TYPES[node.type];
  const out = [];
  const { x, y, z } = node;
  if (def.kind === 'tree') {
    if (state === 'ready') {
      buildTree(TREE_SPECIES[def.species], x, y, z, node.meta?.h ?? def.trunk[0],
        (bx, by, bz, id) => out.push({ x: bx, y: by, z: bz, id }));
    } else {
      out.push({ x, y, z, id: B.stump });
    }
  } else if (def.kind === 'water') {
    // occupies its water cell; no block change (marker rendered separately)
  } else {
    if (state === 'ready') out.push({ x, y, z, id: B[def.ready] });
    else if (def.depleted) out.push({ x, y, z, id: B[def.depleted] });
    else out.push({ x, y, z, id: B.air });
  }
  return out;
}

// All cells that should map to this node for interaction purposes.
export function nodeCells(node) {
  const def = NODE_TYPES[node.type];
  if (def.kind === 'tree') {
    const h = node.meta?.h ?? def.trunk[0];
    const cells = [];
    for (let i = 0; i < Math.max(h, 1); i++) cells.push([node.x, node.y + i, node.z]);
    return cells;
  }
  return [[node.x, node.y, node.z]];
}

export function rollNodeDrops(def, level, rand, luck = 0) {
  const eligible = def.drops.filter((d) => !d.level || level >= d.level);
  let total = 0;
  for (const d of eligible) total += d.weight;
  let r = rand() * total;
  let chosen = eligible[eligible.length - 1];
  for (const d of eligible) { r -= d.weight; if (r <= 0) { chosen = d; break; } }
  const qty = chosen.qty[0] + Math.floor(rand() * (chosen.qty[1] - chosen.qty[0] + 1));
  const out = [{ item: chosen.item, qty }];
  for (const rd of def.rare) {
    if (rand() < rd.chance * (1 + luck)) out.push({ item: rd.item, qty: 1 });
  }
  return out;
}
