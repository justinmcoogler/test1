// Regenerating resource nodes: definitions, visuals per state, drop tables.
// Node instances live in world chunks; their states persist in the save.
// The tree/ore/deposit nodes are GENERATED from the realistic material catalog
// (js/game/materials.js) so they can never drift from the spine; the non-metal
// gathering nodes (fishing, foraging, digging, farming) stay hand-authored.
import { B } from '../world/blocks.js';
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

const NEEDLE = new Set(['pine', 'cedar', 'yew']);
const generated = {};
// One woodcutting node per real wood species.
for (const w of WOODS) {
  generated[`tree_${w.id}`] = {
    label: `${w.label} Tree`, skill: 'woodcutting', level: w.woodLevel, tool: 'axe',
    xp: Math.round(12 + w.tier * 6), time: +(2.6 + w.tier * 0.25).toFixed(1),
    charges: [3, 4 + Math.floor(w.tier / 3)], respawn: 40 + w.tier * 20, kind: 'tree',
    log: `${w.id}_log`, leaves: `${w.id}_leaves`,
    trunk: [4 + Math.floor(w.tier / 3), 6 + Math.floor(w.tier / 2)],
    canopy: NEEDLE.has(w.id) ? 'cone' : 'round',
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
