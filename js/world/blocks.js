// Block registry. Every block face maps to a tile in the procedural atlas.
// shape: 'cube' | 'cross' (plants) | 'liquid' | 'slab' (low cube, e.g. stump/mound)
// tiles: {top, side, bottom} atlas tile names (side used for all if only entry)
import { WOODS, METALS } from '../game/materials.js';
import { COLORS } from '../core/colors.js';

export const B = {}; // name → id
export const BLOCKS = []; // id → def

let nextId = 0;
function def(name, opts = {}) {
  const shape = opts.shape || 'cube';
  const d = {
    id: nextId,
    name,
    label: opts.label || name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    solid: opts.solid !== false,
    // non-full shapes (slab/cross/liquid) never occlude neighbors
    opaque: shape !== 'cube' ? false : opts.opaque !== false,
    shape,
    tiles: opts.tiles || { all: name },
    hardness: opts.hardness ?? 1.5,       // seconds at bare-hand baseline
    tool: opts.tool || null,               // 'pickaxe' | 'axe' | 'shovel' | null
    minTier: opts.minTier ?? 0,            // tool tier required to harvest drops
    drops: opts.drops !== undefined ? opts.drops : name, // item id or null
    emissive: opts.emissive || 0,
    climb: opts.climb || false,
    walkThrough: opts.solid === false,
    directional: opts.directional || false, // records a facing on placement; front tile points at it
    transparent: opts.transparent || false, // non-cube shapes that render in the cutout (alpha) pass
  };
  B[name] = d.id;
  BLOCKS[d.id] = d;
  nextId++;
  return d;
}

def('air', { solid: false, opaque: false, drops: null, tiles: {} });
def('grass', { tiles: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, hardness: 0.9, tool: 'shovel', drops: 'dirt' });
def('dirt', { hardness: 0.8, tool: 'shovel' });
def('stone', { hardness: 3.0, tool: 'pickaxe', drops: 'rough_stone' });
def('cobble', { label: 'Cobblestone', hardness: 2.6, tool: 'pickaxe' });
def('sand', { hardness: 0.7, tool: 'shovel' });
def('gravel', { hardness: 0.9, tool: 'shovel' });
def('clay_block', { label: 'Clay Deposit', hardness: 1.0, tool: 'shovel', drops: 'clay_lump' });
def('snow_grass', { label: 'Snowy Turf', tiles: { top: 'snow', side: 'snow_side', bottom: 'dirt' }, hardness: 0.9, tool: 'shovel', drops: 'dirt' });
def('snow', { label: 'Snow', tiles: { all: 'snow' }, hardness: 0.5, tool: 'shovel', drops: null });
def('ice', { hardness: 1.4, tool: 'pickaxe', drops: null });
def('water', { shape: 'liquid', solid: false, opaque: false, drops: null, hardness: Infinity });
def('bedrock', { label: 'Deepshale', hardness: Infinity, drops: null });

// Trees — three original species
def('fernwood_log', { tiles: { top: 'fernwood_ring', side: 'fernwood_bark' }, hardness: 2.2, tool: 'axe' });
def('fernwood_leaves', { opaque: false, hardness: 0.4, drops: null, tiles: { all: 'fernwood_leaves' } });
def('silverbark_log', { tiles: { top: 'silverbark_ring', side: 'silverbark_bark' }, hardness: 2.6, tool: 'axe' });
def('silverbark_leaves', { opaque: false, hardness: 0.4, drops: null });
def('emberpine_log', { tiles: { top: 'emberpine_ring', side: 'emberpine_bark' }, hardness: 3.0, tool: 'axe' });
def('emberpine_needles', { opaque: false, hardness: 0.4, drops: null });
def('stump', { shape: 'slab', hardness: 2.0, tool: 'axe', drops: null, tiles: { top: 'fernwood_ring', side: 'fernwood_bark' } });

// Ore nodes (world appearance while the node is ready)
def('copper_ore', { hardness: 3.4, tool: 'pickaxe', drops: null });
def('tin_ore', { hardness: 3.4, tool: 'pickaxe', drops: null });
def('iron_ore', { hardness: 4.5, tool: 'pickaxe', minTier: 2, drops: null });
def('silvervein', { label: 'Silvervein', hardness: 5.5, tool: 'pickaxe', minTier: 3, drops: null });
def('emberstone_ore', { hardness: 6, tool: 'pickaxe', minTier: 3, drops: null });
def('crystal_cluster', { opaque: false, hardness: 5, tool: 'pickaxe', drops: null, emissive: 0.6 });
def('depleted_rock', { label: 'Depleted Rock', hardness: 3.5, tool: 'pickaxe', drops: 'rough_stone' });

// Plants & node decor
def('tall_grass', { shape: 'cross', solid: false, opaque: false, hardness: 0.1, drops: null });
def('wildflower', { shape: 'cross', solid: false, opaque: false, hardness: 0.1, drops: null });
def('herb_patch', { shape: 'cross', solid: false, opaque: false, hardness: 0.4, drops: null });
def('herb_patch_cut', { shape: 'cross', solid: false, opaque: false, hardness: 0.4, drops: null });
def('berry_bush', { opaque: false, hardness: 0.8, drops: null });
def('berry_bush_bare', { opaque: false, hardness: 0.8, drops: null });
def('mushroom_cap', { shape: 'cross', solid: false, opaque: false, hardness: 0.2, drops: null });
def('reed', { shape: 'cross', solid: false, opaque: false, hardness: 0.3, drops: null });
def('cactus_flesh', { label: 'Spinebloom', hardness: 0.9, drops: null, opaque: false });
def('dig_mound', { shape: 'slab', hardness: 1.4, tool: 'shovel', drops: null, tiles: { all: 'dig_mound' } });
def('farmland', { hardness: 0.8, tool: 'shovel', drops: 'dirt', tiles: { top: 'farmland', side: 'dirt' } });
def('crop_young', { shape: 'cross', solid: false, opaque: false, hardness: 0.1, drops: null });
def('crop_ripe', { shape: 'cross', solid: false, opaque: false, hardness: 0.1, drops: null });

// Building materials
def('planks', { hardness: 1.8, tool: 'axe' });
def('timber_wall', { hardness: 2.0, tool: 'axe' });
def('thatch', { hardness: 1.0, tool: 'axe' });
def('stone_brick', { hardness: 3.2, tool: 'pickaxe' });
def('glasspane', { label: 'Glass', opaque: false, hardness: 0.5, drops: null });
def('torch_post', { label: 'Torch Post', shape: 'cross', solid: false, opaque: false, hardness: 0.2, emissive: 1, drops: 'torch_item' });

// Stations & interactables
def('workbench', { hardness: 2.2, tool: 'axe', directional: true, tiles: { top: 'workbench_top', side: 'workbench_side', front: 'workbench' } });
def('furnace', { hardness: 3.2, tool: 'pickaxe', directional: true, tiles: { top: 'furnace_top', side: 'furnace_side', front: 'furnace_front' }, emissive: 0.3 });
def('anvil_block', { label: 'Anvil', shape: 'slab', hardness: 3.5, tool: 'pickaxe', tiles: { top: 'anvil', side: 'anvil_side' } });
def('campfire', { shape: 'slab', solid: false, hardness: 1.0, emissive: 0.8, tiles: { top: 'campfire', side: 'campfire_side' } });
def('alchemy_table', { hardness: 2.2, tool: 'axe', tiles: { top: 'alchemy_top', side: 'workbench_side' } });
def('loom_block', { label: 'Loom', hardness: 2.2, tool: 'axe', directional: true, tiles: { top: 'loom_top', side: 'loom_side', front: 'loom' } });
def('enchant_altar', { label: 'Runestone Altar', hardness: 4, tool: 'pickaxe', emissive: 0.5, tiles: { top: 'altar_top', side: 'altar_side' } });
def('construction_bench', { hardness: 2.2, tool: 'axe', tiles: { top: 'construction_top', side: 'workbench_side' } });
def('chest_block', { label: 'Storage Chest', hardness: 2.0, tool: 'axe', directional: true, tiles: { top: 'chest_top', side: 'chest_side', front: 'chest_front' } });

// Dungeon / special
def('ruin_brick', { label: 'Ancient Brick', hardness: 4.5, tool: 'pickaxe', drops: 'rough_stone' });
def('rootstone', { hardness: 5, tool: 'pickaxe', drops: 'rough_stone' });
def('mossy_ruin', { label: 'Mossy Ruin', hardness: 4.5, tool: 'pickaxe', drops: 'rough_stone' });
def('obsidian_glass', { label: 'Nightglass', hardness: 9, tool: 'pickaxe', minTier: 4 });
def('corrupt_soil', { hardness: 1.0, tool: 'shovel', drops: 'dirt' });
def('ashen_soil', { hardness: 1.0, tool: 'shovel', drops: 'dirt' });
def('basalt', { hardness: 4.0, tool: 'pickaxe', drops: 'rough_stone' });
def('lava', { shape: 'liquid', solid: false, opaque: false, drops: null, hardness: Infinity, emissive: 1 });

// ---- generated realistic blocks (from js/game/materials.js) ----------------
// Trees: one log + one leaves block per real wood species. Hardness rises with
// the wood's density tier; drops are the matching *_log item.
for (const w of WOODS) {
  def(`${w.id}_log`, {
    label: `${w.label} Log`, hardness: 1.8 + w.tier * 0.22, tool: 'axe', drops: `${w.id}_log`,
    tiles: { top: `${w.id}_ring`, side: `${w.id}_bark` },
  });
  def(`${w.id}_leaves`, { label: `${w.label} Leaves`, opaque: false, hardness: 0.4, drops: null, tiles: { all: `${w.id}_leaves` } });
}
// Ore blocks for every mineable metal the legacy set doesn't already define
// (copper/tin/iron stay as-is). minTier & hardness scale with the mine level.
const oreMinTier = (lvl) => (lvl >= 60 ? 4 : lvl >= 45 ? 3 : lvl >= 30 ? 2 : lvl >= 15 ? 1 : 0);
for (const m of METALS.filter((x) => (x.smelt || []).some((s) => s.endsWith('_ore')))) {
  const name = `${m.id}_ore`;
  if (B[name] !== undefined) continue; // legacy copper_ore/tin_ore/iron_ore
  def(name, {
    label: `${m.label} Ore`, hardness: 3.2 + (m.mineLevel || 1) * 0.04, tool: 'pickaxe',
    minTier: oreMinTier(m.mineLevel || 1), drops: null, tiles: { all: name },
  });
}
// Mineral deposits (fuel & gunpowder reagents)
def('coal_seam', { label: 'Coal Seam', hardness: 3.4, tool: 'pickaxe', minTier: 1, drops: 'coal', tiles: { all: 'coal_seam' } });
def('saltpeter_deposit', { label: 'Saltpeter Deposit', hardness: 2.6, tool: 'pickaxe', drops: 'saltpeter', tiles: { all: 'saltpeter_deposit' } });
def('sulfur_deposit', { label: 'Sulfur Deposit', hardness: 2.8, tool: 'pickaxe', minTier: 1, drops: 'sulfur', tiles: { all: 'sulfur_deposit' } });
def('meteor_crater', { label: 'Meteor Crater', hardness: 5.5, tool: 'pickaxe', minTier: 3, drops: 'rough_stone', tiles: { all: 'meteor_crater' } });

// ---- Shape variants: slabs, stairs, walls, fences, gates, panes, carpets -----
// Each reuses a base block's tiles/hardness/tool. The mesher (js/gfx/shapes.js)
// draws the geometry; world.collisionHeight reads SHAPE_COLLISION for physics.
// Directional shapes (stairs, gate) record a placement facing; glass panes are
// transparent (cutout pass). Naming is `<base>_<shape>`.
export const SHAPE_COLLISION = { slab: 0.5, carpet: 1 / 16, stairs: 1, wall: 1, fence: 1, gate: 1, pane: 1 };
const DIRECTIONAL_SHAPES = new Set(['stairs', 'gate']);
const SHAPE_LABEL = { slab: 'Slab', stairs: 'Stairs', wall: 'Wall', fence: 'Fence', gate: 'Gate', pane: 'Pane', carpet: 'Carpet' };

export function defShape(base, shape, opts = {}) {
  const b = BLOCKS[B[base]];
  const name = `${base}_${shape}`;
  return def(name, {
    label: opts.label || `${b.label} ${SHAPE_LABEL[shape] || shape}`,
    hardness: b.hardness, tool: b.tool, minTier: b.minTier,
    shape, tiles: { ...b.tiles },
    directional: DIRECTIONAL_SHAPES.has(shape) || !!opts.directional,
    transparent: !!opts.transparent,
    drops: name,
  });
}

// Stone family: slab, stairs, wall. Wood (generic planks): slab, stairs, fence, gate.
for (const base of ['stone', 'cobble', 'stone_brick']) {
  for (const s of ['slab', 'stairs', 'wall']) defShape(base, s);
}
for (const s of ['slab', 'stairs', 'fence', 'gate']) defShape('planks', s);
defShape('thatch', 'slab');
defShape('glasspane', 'pane', { label: 'Glass Pane', transparent: true });

// ---- Tier-1 natural building stone + refined metal blocks -------------------
def('granite', { hardness: 3.0, tool: 'pickaxe', drops: 'rough_stone' });
def('andesite', { hardness: 3.0, tool: 'pickaxe', drops: 'rough_stone' });
def('marble', { hardness: 3.0, tool: 'pickaxe', drops: 'rough_stone' });
def('deepslate', { hardness: 3.4, tool: 'pickaxe', drops: 'rough_stone' });
def('sandstone', { hardness: 2.4, tool: 'pickaxe', tiles: { top: 'sandstone_top', side: 'sandstone', bottom: 'sandstone_top' } });
def('brick', { label: 'Bricks', hardness: 2.8, tool: 'pickaxe' });
def('copper_block', { label: 'Copper Block', hardness: 3.0, tool: 'pickaxe' });
def('copper_weathered', { label: 'Weathered Copper', hardness: 3.0, tool: 'pickaxe' });
def('iron_block', { label: 'Iron Block', hardness: 4.0, tool: 'pickaxe' });
def('gold_block', { label: 'Gold Block', hardness: 3.0, tool: 'pickaxe' });
for (const base of ['granite', 'andesite', 'marble', 'deepslate', 'sandstone', 'brick']) {
  for (const s of ['slab', 'stairs', 'wall']) defShape(base, s);
}
for (const s of ['slab', 'stairs']) { defShape('copper_block', s); defShape('copper_weathered', s); }
// mossy variants (green moss over cobble / stone brick) — common roof + ruin trim
def('mossy_cobble', { label: 'Mossy Cobblestone', hardness: 2.6, tool: 'pickaxe' });
def('mossy_stone_brick', { label: 'Mossy Stone Brick', hardness: 3.2, tool: 'pickaxe' });
for (const base of ['mossy_cobble', 'mossy_stone_brick']) for (const s of ['slab', 'stairs', 'wall']) defShape(base, s);

// ---- Colored block families (16 dyes) ---------------------------------------
// wool/carpet (soft), concrete + powder, terracotta + glazed, and stained glass
// + panes. Tinted tiles are generated in gfx/textures.js from the same COLORS.
const CAP = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
for (const [id, ] of COLORS) {
  const C = CAP(id);
  def(`${id}_wool`, { label: `${C} Wool`, hardness: 0.9, tool: null });
  def(`${id}_carpet`, { label: `${C} Carpet`, shape: 'carpet', hardness: 0.4, tiles: { all: `${id}_wool` }, drops: `${id}_carpet` });
  def(`${id}_concrete`, { label: `${C} Concrete`, hardness: 1.8, tool: 'pickaxe' });
  def(`${id}_concrete_powder`, { label: `${C} Concrete Powder`, hardness: 0.7, tool: 'shovel' });
  def(`${id}_terracotta`, { label: `${C} Terracotta`, hardness: 1.4, tool: 'pickaxe' });
  def(`${id}_glazed_terracotta`, { label: `${C} Glazed Terracotta`, hardness: 1.4, tool: 'pickaxe' });
  def(`${id}_stained_glass`, { label: `${C} Stained Glass`, opaque: false, transparent: true, hardness: 0.4, drops: null });
  def(`${id}_stained_glass_pane`, { label: `${C} Glass Pane`, shape: 'pane', transparent: true, hardness: 0.4, tiles: { all: `${id}_stained_glass` }, drops: null });
}
def('terracotta', { label: 'Terracotta', hardness: 1.4, tool: 'pickaxe' }); // plain fired clay

export function blockByName(name) { return BLOCKS[B[name]]; }
export function isSolid(id) { return BLOCKS[id]?.solid === true; }
export function isOpaque(id) { return BLOCKS[id]?.opaque === true; }
