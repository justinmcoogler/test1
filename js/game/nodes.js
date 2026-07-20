// Regenerating resource nodes: definitions, visuals per state, drop tables.
// Node instances live in world chunks; their states persist in the save.
import { B } from '../world/blocks.js';

// respawn: seconds. charges: [min,max] gathers before depletion.
// time: base seconds per gather at level 1 with the minimum tool.
export const NODE_TYPES = {
  tree_fernwood: {
    label: 'Fernwood Tree', skill: 'woodcutting', level: 1, tool: 'axe',
    xp: 15, time: 2.8, charges: [3, 5], respawn: 40, kind: 'tree',
    log: 'fernwood_log', leaves: 'fernwood_leaves', trunk: [4, 6], canopy: 'round',
    drops: [{ item: 'fernwood_log', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'amber_resin', chance: 0.03 }, { item: 'fernwood_seed', chance: 0.05 }],
  },
  tree_silverbark: {
    label: 'Silverbark Tree', skill: 'woodcutting', level: 10, tool: 'axe',
    xp: 34, time: 3.6, charges: [3, 6], respawn: 100, kind: 'tree',
    log: 'silverbark_log', leaves: 'silverbark_leaves', trunk: [5, 7], canopy: 'round',
    drops: [{ item: 'silverbark_log', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'silverleaf', chance: 0.04 }],
  },
  tree_emberpine: {
    label: 'Emberpine', skill: 'woodcutting', level: 20, tool: 'axe',
    xp: 55, time: 4.2, charges: [4, 6], respawn: 240, kind: 'tree',
    log: 'emberpine_log', leaves: 'emberpine_needles', trunk: [5, 8], canopy: 'cone',
    drops: [{ item: 'emberpine_log', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'ember_sap', chance: 0.05 }],
  },
  ore_copper: {
    label: 'Copper Vein', skill: 'mining', level: 1, tool: 'pickaxe',
    xp: 18, time: 3.0, charges: [2, 4], respawn: 60, kind: 'ore',
    ready: 'copper_ore', depleted: 'depleted_rock',
    drops: [{ item: 'copper_ore_chunk', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'rough_gem', chance: 0.02 }],
  },
  ore_tin: {
    label: 'Tin Vein', skill: 'mining', level: 1, tool: 'pickaxe',
    xp: 18, time: 3.0, charges: [2, 4], respawn: 60, kind: 'ore',
    ready: 'tin_ore', depleted: 'depleted_rock',
    drops: [{ item: 'tin_ore_chunk', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'rough_gem', chance: 0.02 }],
  },
  ore_iron: {
    label: 'Iron Vein', skill: 'mining', level: 10, tool: 'pickaxe',
    xp: 40, time: 4.0, charges: [2, 5], respawn: 150, kind: 'ore',
    ready: 'iron_ore', depleted: 'depleted_rock',
    drops: [{ item: 'iron_ore_chunk', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'rough_gem', chance: 0.03 }],
  },
  ore_silver: {
    label: 'Silvervein', skill: 'mining', level: 25, tool: 'pickaxe',
    xp: 70, time: 5.0, charges: [2, 4], respawn: 360, kind: 'ore',
    ready: 'silvervein', depleted: 'depleted_rock',
    drops: [{ item: 'silver_ore_chunk', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'rough_gem', chance: 0.06 }],
  },
  ore_emberstone: {
    label: 'Emberstone Seam', skill: 'mining', level: 40, tool: 'pickaxe',
    xp: 110, time: 5.5, charges: [2, 4], respawn: 480, kind: 'ore',
    ready: 'emberstone_ore', depleted: 'depleted_rock',
    drops: [{ item: 'emberstone_shard', qty: [1, 2], weight: 1 }],
    rare: [{ item: 'flame_opal', chance: 0.04 }],
  },
  crystal_node: {
    label: 'Veilcrystal Growth', skill: 'mining', level: 50, tool: 'pickaxe',
    xp: 150, time: 6, charges: [1, 3], respawn: 720, kind: 'ore',
    ready: 'crystal_cluster', depleted: 'depleted_rock',
    drops: [{ item: 'veilcrystal', qty: [1, 1], weight: 1 }],
    rare: [{ item: 'flawless_veilcrystal', chance: 0.05 }],
  },
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
  herb_patch: {
    label: 'Herb Patch', skill: 'foraging', level: 1, tool: null,
    xp: 12, time: 1.8, charges: [1, 2], respawn: 45, kind: 'plant',
    ready: 'herb_patch', depleted: 'herb_patch_cut',
    drops: [
      { item: 'bitterleaf', qty: [1, 2], weight: 3 },
      { item: 'springroot', qty: [1, 1], weight: 2 },
      { item: 'duskcap', qty: [1, 1], weight: 1, level: 12 },
    ],
    rare: [{ item: 'sunpetal', chance: 0.03 }],
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
  farm_plot: {
    label: 'Farm Plot', skill: 'farming', level: 1, tool: null,
    xp: 25, time: 1.2, charges: [1, 1], respawn: 150, kind: 'farm',
    ready: 'crop_ripe', depleted: 'crop_young', // regrows through a young stage
    drops: [{ item: 'grainsheaf', qty: [1, 2], weight: 1 }],
    rare: [{ item: 'golden_grain', chance: 0.03 }, { item: 'grain_seeds', chance: 0.4 }],
  },
};

// Blocks a node occupies for a given state. Coordinates are absolute.
export function nodeBlocks(node, state) {
  const def = NODE_TYPES[node.type];
  const out = [];
  const { x, y, z } = node;
  if (def.kind === 'tree') {
    if (state === 'ready') {
      const h = node.meta?.h ?? def.trunk[0];
      for (let i = 0; i < h; i++) out.push({ x, y: y + i, z, id: B[def.log] });
      const leafId = B[def.leaves];
      const top = y + h - 1;
      if (def.canopy === 'cone') {
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          if (dx || dz) out.push({ x: x + dx, y: top - 1, z: z + dz, id: leafId });
        }
        out.push({ x, y: top + 1, z, id: leafId });
        out.push({ x: x + 1, y: top, z, id: leafId }, { x: x - 1, y: top, z, id: leafId });
        out.push({ x, y: top, z: z + 1, id: leafId }, { x, y: top, z: z - 1, id: leafId });
      } else {
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (dx || dz) out.push({ x: x + dx, y: top - 1, z: z + dz, id: leafId });
        }
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          out.push({ x: x + dx, y: top, z: z + dz, id: leafId });
        }
        out.push({ x, y: top + 1, z, id: leafId });
      }
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
