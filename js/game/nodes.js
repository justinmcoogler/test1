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

const NEEDLE = new Set(['pine', 'cedar', 'yew']);            // conifers → tall layered cone
const TROPICAL = new Set(['teak', 'ebony', 'lignum_vitae']); // rainforest → high spreading crown
const BIG = new Set(['oak', 'walnut', 'hickory', 'teak', 'ebony', 'lignum_vitae']); // buttressed base
const generated = {};
// One woodcutting node per real wood species. Canopy silhouette + trunk height
// vary by type so a pine reads as a pine, a birch as a slim birch, an oak as a
// broad oak (see nodeBlocks). Big species get a flared root base.
for (const w of WOODS) {
  const canopy = NEEDLE.has(w.id) ? 'cone'
    : TROPICAL.has(w.id) ? 'spread'
      : w.id === 'birch' ? 'slim'
        : 'round';
  const big = BIG.has(w.id);
  const trunk = canopy === 'cone' ? [6 + Math.floor(w.tier / 4), 8 + Math.floor(w.tier / 3)]
    : canopy === 'spread' ? [7 + Math.floor(w.tier / 4), 10 + Math.floor(w.tier / 3)]
      : canopy === 'slim' ? [6, 8] // birch: tall & slender
        : [(big ? 5 : 4) + Math.floor(w.tier / 4), (big ? 7 : 6) + Math.floor(w.tier / 3)];
  generated[`tree_${w.id}`] = {
    label: `${w.label} Tree`, skill: 'woodcutting', level: w.woodLevel, tool: 'axe',
    xp: Math.round(12 + w.tier * 6), time: +(2.6 + w.tier * 0.25).toFixed(1),
    charges: [3, 5 + Math.floor(w.tier / 3)], respawn: 40 + w.tier * 20, kind: 'tree',
    log: `${w.id}_log`, leaves: `${w.id}_leaves`,
    trunk, canopy, big, wide: w.id === 'oak',
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

// Deterministic 0–1 hash for organic, save-stable canopy raggedness.
function thash(a, b, c) {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// Blocks a node occupies for a given state. Coordinates are absolute.
// Canopies stay within a radius-2 footprint so they never cross into an
// unloaded neighbour chunk at generation time.
export function nodeBlocks(node, state) {
  const def = NODE_TYPES[node.type];
  const out = [];
  const { x, y, z } = node;
  if (def.kind === 'tree') {
    if (state === 'ready') {
      const h = node.meta?.h ?? def.trunk[0];
      const leafId = B[def.leaves], logId = B[def.log];
      // Envelope-guarded writers: every cell stays within ±2 of the trunk so a
      // canopy never spills into an unloaded neighbour chunk (dropped by stampNodeInto).
      const leaf = (lx, ly, lz) => { if (Math.abs(lx - x) <= 2 && Math.abs(lz - z) <= 2 && ly > y - 1) out.push({ x: lx, y: ly, z: lz, id: leafId }); };
      const log = (lx, ly, lz) => { if (Math.abs(lx - x) <= 2 && Math.abs(lz - z) <= 2) out.push({ x: lx, y: ly, z: lz, id: logId }); };
      for (let i = 0; i < h; i++) log(x, y + i, z);          // trunk
      const top = y + h - 1;
      const size = thash(x, 7, z);                            // 0–1 per-tree size variation

      // buttressed root flare for big broadleaf/tropical species
      if (def.big) { log(x + 1, y, z); log(x - 1, y, z); log(x, y, z + 1); log(x, y, z - 1); }

      if (def.canopy === 'cone') {
        // conifer: full stacked rings, wide at the crown base, tapering to a point
        const baseY = y + Math.max(2, Math.floor(h * 0.38));
        const tipY = y + h + 1;
        for (let yy = baseY; yy <= tipY; yy++) {
          const t = (yy - baseY) / Math.max(1, tipY - baseY);
          const rad = yy >= tipY ? 0 : (t < 0.45 ? 2 : 1);
          for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
            if (dx * dx + dz * dz > rad * rad + 0.5) continue;
            if (dx === 0 && dz === 0 && yy <= top) continue;                 // keep the trunk showing
            if (rad === 2 && thash(x + dx, yy, z + dz) > 0.82) continue;     // ragged skirt
            leaf(x + dx, yy, z + dz);
          }
        }
        // drooping lowest branch tips
        leaf(x + 2, baseY, z); leaf(x - 2, baseY, z); leaf(x, baseY, z + 2); leaf(x, baseY, z - 2);
      } else if (def.canopy === 'spread') {
        // tropical: a high, wide, flattish crown on branch stubs (umbrella)
        log(x + 1, top, z); log(x - 1, top, z); log(x, top, z + 1);           // branch stubs
        for (let dy = 0; dy <= 1; dy++) {
          const rad = dy === 0 ? 2 : 1;
          for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
            if (dx * dx + dz * dz > rad * rad + 0.4) continue;
            if (rad === 2 && thash(x + dx, top + dy, z + dz) > 0.76) continue;
            leaf(x + dx, top + 1 + dy, z + dz);                              // crown above the trunk top
          }
        }
        leaf(x + 2, top, z); leaf(x - 2, top, z); leaf(x, top, z + 2); leaf(x, top, z - 2); // low fronds
      } else if (def.canopy === 'slim') {
        // birch: a narrow egg-shaped crown on a tall slender trunk
        for (let dy = -1; dy <= 2; dy++) {
          const rad = (dy <= -1 || dy >= 2) ? 0 : 1;
          for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
            if (dx === 0 && dz === 0 && top + dy <= top) continue;           // trunk stays visible
            if (thash(x + dx, top + dy, z + dz) > 0.86) continue;
            leaf(x + dx, top + dy, z + dz);
          }
        }
        leaf(x, top + 3, z);                                                  // slim top tuft
      } else {
        // broadleaf: a rounded crown, size-varied, centred just above the trunk top
        const R2 = (def.wide ? 5.6 : 4.8) + size * 0.9;
        for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
          if (dx * dx + dy * dy * 1.3 + dz * dz > R2) continue;               // squashed sphere
          if (dx === 0 && dz === 0 && top + dy <= top) continue;             // trunk stays visible
          if (thash(x + dx, top + dy, z + dz) > 0.90) continue;              // slight raggedness
          leaf(x + dx, top + dy, z + dz);
        }
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
