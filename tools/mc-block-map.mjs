// Minecraft block id → Emberveil block name. Used by tools/import-schematic.mjs
// to convert .schem / .schematic builds into our block set, and to report what
// has no good equivalent. mapBlock() returns { block, quality }:
//   'exact'  — a faithful equivalent
//   'approx' — a reasonable stand-in (shape/colour lost, e.g. stairs→base, wool→cloth)
//   'none'   — no equivalent; becomes air and is reported as unmapped

import { B } from '../js/world/blocks.js';
import { COLORS } from '../js/core/colors.js';

// Direct id → our block. Keys are the modern id without the "minecraft:" prefix.
export const MC_MAP = {
  air: 'air', cave_air: 'air', void_air: 'air', barrier: 'air', structure_void: 'air',

  // stone family — distinct rock types now have their own blocks
  stone: 'stone', smooth_stone: 'stone', tuff: 'stone', dripstone_block: 'stone',
  granite: 'granite', polished_granite: 'granite',
  andesite: 'andesite', polished_andesite: 'andesite',
  diorite: 'marble', polished_diorite: 'marble', calcite: 'marble', quartz_block: 'marble',
  chiseled_quartz_block: 'marble', quartz_bricks: 'marble', smooth_quartz: 'marble',
  deepslate: 'deepslate', polished_deepslate: 'deepslate', blackstone: 'deepslate', polished_blackstone: 'deepslate',
  cobblestone: 'cobble', mossy_cobblestone: 'mossy_cobble', cobbled_deepslate: 'cobble',
  stone_bricks: 'stone_brick', mossy_stone_bricks: 'mossy_stone_brick', cracked_stone_bricks: 'stone_brick',
  chiseled_stone_bricks: 'stone_brick', deepslate_bricks: 'stone_brick', deepslate_tiles: 'stone_brick',
  bricks: 'brick', polished_blackstone_bricks: 'stone_brick', nether_bricks: 'stone_brick',
  obsidian: 'bedrock', crying_obsidian: 'bedrock', bedrock: 'bedrock',

  // soils & loose ground
  dirt: 'dirt', coarse_dirt: 'dirt', rooted_dirt: 'dirt', podzol: 'dirt', mud: 'dirt', mycelium: 'dirt',
  packed_mud: 'dirt', mud_bricks: 'stone_brick',
  grass_block: 'grass', moss_block: 'grass',
  farmland: 'farmland', dirt_path: 'grass',
  sand: 'sand', red_sand: 'sand',
  sandstone: 'sandstone', smooth_sandstone: 'sandstone', cut_sandstone: 'sandstone',
  chiseled_sandstone: 'sandstone', red_sandstone: 'sandstone', smooth_red_sandstone: 'sandstone',
  gravel: 'gravel', clay: 'clay_block',
  snow_block: 'snow', snow: 'snow', powder_snow: 'snow',
  ice: 'ice', packed_ice: 'ice', blue_ice: 'ice', frosted_ice: 'ice',

  // liquids
  water: 'water', lava: 'lava',

  // glass
  glass: 'glasspane', tinted_glass: 'glasspane', glass_pane: 'glasspane',

  // logs → our woods
  oak_log: 'oak_log', stripped_oak_log: 'oak_log', oak_wood: 'oak_log',
  spruce_log: 'pine_log', stripped_spruce_log: 'pine_log',
  birch_log: 'birch_log', stripped_birch_log: 'birch_log',
  jungle_log: 'teak_log', stripped_jungle_log: 'teak_log',
  acacia_log: 'ash_log', stripped_acacia_log: 'ash_log',
  dark_oak_log: 'ebony_log', stripped_dark_oak_log: 'ebony_log',
  mangrove_log: 'teak_log', cherry_log: 'maple_log', pale_oak_log: 'birch_log',

  // leaves
  oak_leaves: 'oak_leaves', spruce_leaves: 'pine_leaves', birch_leaves: 'birch_leaves',
  jungle_leaves: 'teak_leaves', acacia_leaves: 'ash_leaves', dark_oak_leaves: 'ebony_leaves',
  mangrove_leaves: 'teak_leaves', cherry_leaves: 'maple_leaves', azalea_leaves: 'oak_leaves',
  flowering_azalea_leaves: 'oak_leaves', pale_oak_leaves: 'birch_leaves',

  // planks → our generic plank block
  oak_planks: 'planks', spruce_planks: 'planks', birch_planks: 'planks', jungle_planks: 'planks',
  acacia_planks: 'planks', dark_oak_planks: 'planks', mangrove_planks: 'planks', cherry_planks: 'planks',
  bamboo_planks: 'planks', crimson_planks: 'planks', warped_planks: 'planks',

  // functional / stations
  crafting_table: 'workbench', fletching_table: 'workbench', cartography_table: 'workbench',
  furnace: 'furnace', blast_furnace: 'furnace', smoker: 'furnace',
  chest: 'chest_block', trapped_chest: 'chest_block', barrel: 'chest_block',
  loom: 'loom_block', anvil: 'anvil_block', chipped_anvil: 'anvil_block', damaged_anvil: 'anvil_block',
  smithing_table: 'anvil_block', campfire: 'campfire', soul_campfire: 'campfire',
  torch: 'torch_post', wall_torch: 'torch_post', lantern: 'torch_post', soul_torch: 'torch_post',

  // extra utility stations → closest real station (no dedicated block yet)
  grindstone: 'workbench', stonecutter: 'workbench', brewing_stand: 'alchemy_table',
  // volcanic stone
  basalt: 'basalt', smooth_basalt: 'basalt', polished_basalt: 'basalt',
  // deepslate tile wall → our deepslate wall (else falls back to stone_brick_wall)
  deepslate_tile_wall: 'deepslate_wall',
  // thin metal + wooden fixtures now modelled as real blocks
  iron_bars: 'iron_bars', chain: 'chain', ladder: 'ladder', flower_pot: 'flower_pot',

  // ---- second wave of town blocks (schematic-import equivalents, batch 2) ----
  note_block: 'note_block', lectern: 'lectern', bell: 'bell',
  beehive: 'beehive', bee_nest: 'bee_nest', hopper: 'hopper', lodestone: 'lodestone',
  ender_chest: 'ender_chest', daylight_detector: 'daylight_detector', scaffolding: 'scaffolding',
  suspicious_gravel: 'suspicious_gravel', nether_portal: 'nether_portal',
  glow_lichen: 'glow_lichen', sea_pickle: 'sea_pickle', cobweb: 'cobweb', web: 'cobweb',
  // rails — the powered/detector/activator variants all collapse to the one flat track
  rail: 'rail', powered_rail: 'rail', detector_rail: 'rail', activator_rail: 'rail',
  // cauldrons — every fill state maps to the one iron cauldron
  cauldron: 'cauldron', water_cauldron: 'cauldron', lava_cauldron: 'cauldron', powder_snow_cauldron: 'cauldron',
  // nether flora & nylium — crimson (red) folds into the one teal warped set
  warped_nylium: 'warped_nylium', crimson_nylium: 'warped_nylium',
  warped_roots: 'warped_roots', crimson_roots: 'warped_roots', nether_sprouts: 'warped_roots',

  // ores
  coal_ore: 'coal_seam', deepslate_coal_ore: 'coal_seam', coal_block: 'coal_seam',
  iron_ore: 'iron_ore', deepslate_iron_ore: 'iron_ore',
  copper_ore: 'copper_ore', deepslate_copper_ore: 'copper_ore',
  gold_ore: 'gold_ore', deepslate_gold_ore: 'gold_ore', nether_gold_ore: 'gold_ore',

  // refined metal blocks + copper weathering stages
  iron_block: 'iron_block', raw_iron_block: 'iron_block',
  gold_block: 'gold_block', raw_gold_block: 'gold_block',
  copper_block: 'copper_block', cut_copper: 'copper_block', chiseled_copper: 'copper_block',
  waxed_copper_block: 'copper_block', waxed_cut_copper: 'copper_block', raw_copper_block: 'copper_block',
  exposed_copper: 'copper_weathered', weathered_copper: 'copper_weathered', oxidized_copper: 'copper_weathered',
  exposed_cut_copper: 'copper_weathered', weathered_cut_copper: 'copper_weathered', oxidized_cut_copper: 'copper_weathered',

  // farm / plant-ish
  hay_block: 'thatch', wheat: 'crop_ripe', tall_grass: 'tall_grass', grass: 'tall_grass',
  short_grass: 'tall_grass', fern: 'tall_grass', large_fern: 'tall_grass', dead_bush: 'tall_grass',
  big_dripleaf: 'tall_grass', small_dripleaf: 'tall_grass', azalea: 'tall_grass', flowering_azalea: 'wildflower',
  sugar_cane: 'reed', bamboo: 'reed', cactus: 'cactus_flesh',
  dandelion: 'wildflower', poppy: 'wildflower', sunflower: 'wildflower',
  // real single-flower blocks now modelled
  oxeye_daisy: 'oxeye_daisy', allium: 'allium', blue_orchid: 'blue_orchid', cornflower: 'blue_orchid',
  orange_tulip: 'orange_tulip', pink_tulip: 'pink_tulip', white_tulip: 'white_tulip',
  lily_of_the_valley: 'white_tulip', red_tulip: 'rose_bush', rose_bush: 'rose_bush', peony: 'rose_bush', lilac: 'allium',
  red_mushroom: 'mushroom_cap', brown_mushroom: 'mushroom_cap',
  brown_mushroom_block: 'mushroom_cap', red_mushroom_block: 'mushroom_cap', mushroom_stem: 'mushroom_cap',
  sweet_berry_bush: 'berry_bush',

  // wood furniture / misc that has an honest stand-in
  bookshelf: 'planks', chiseled_bookshelf: 'planks', candle: 'torch_post',

  // ---- wave 3: schematic-import blocks (P1–P4) -------------------------------
  // P1 lights — froglights + full-cube lamps get real blocks; hanging/rod lights fold into the glowing post
  glowstone: 'glowstone', sea_lantern: 'sea_lantern', redstone_lamp: 'redstone_lamp', shroomlight: 'shroomlight',
  jack_o_lantern: 'jack_o_lantern', ochre_froglight: 'ochre_froglight', verdant_froglight: 'verdant_froglight',
  pearlescent_froglight: 'pearlescent_froglight', soul_lantern: 'torch_post', end_rod: 'torch_post',
  // P2 building stone & terrain
  netherrack: 'netherrack', end_stone: 'end_stone', end_stone_bricks: 'end_stone_bricks',
  red_nether_bricks: 'red_nether_bricks', tuff_bricks: 'tuff_bricks', polished_tuff: 'polished_tuff', chiseled_tuff: 'tuff_bricks',
  gilded_blackstone: 'gilded_blackstone', magma_block: 'magma_block',
  soul_sand: 'soul_sand', soul_soil: 'soul_soil', bone_block: 'bone_block',
  nether_wart_block: 'nether_wart_block', warped_wart_block: 'warped_wart_block',
  sculk: 'sculk', amethyst_block: 'amethyst_block', budding_amethyst: 'budding_amethyst',
  // P3 mineral show-blocks + ores (deepslate variants fold into the base)
  diamond_block: 'diamond_block', emerald_block: 'emerald_block', lapis_block: 'lapis_block',
  redstone_block: 'redstone_block', netherite_block: 'netherite_block',
  diamond_ore: 'diamond_ore', deepslate_diamond_ore: 'diamond_ore', emerald_ore: 'emerald_ore', deepslate_emerald_ore: 'emerald_ore',
  lapis_ore: 'lapis_ore', deepslate_lapis_ore: 'lapis_ore', redstone_ore: 'redstone_ore', deepslate_redstone_ore: 'redstone_ore',
  // P4 farm / organic
  pumpkin: 'pumpkin', carved_pumpkin: 'carved_pumpkin', jack_o_lantern_off: 'pumpkin', melon: 'melon',
};

// Rough material stand-ins for coloured/decorative families we don't model.
const APPROX_CONTAINS = [
  [/_planks$/, 'planks'], [/_log$|_wood$|_stem$|_hyphae$/, 'oak_log'], [/_leaves$/, 'oak_leaves'],
  [/glass/, 'glasspane'], [/concrete_powder$/, 'sand'], [/concrete$/, 'stone_brick'],
  [/terracotta$/, 'stone_brick'], [/_wool$|^wool$/, 'thatch'], [/_carpet$/, 'thatch'],
  [/prismarine|purpur/, 'stone_brick'], [/quartz/, 'marble'],
  [/oxidized.*copper|weathered.*copper|exposed.*copper/, 'copper_weathered'], [/copper/, 'copper_block'],
  [/^potted_/, 'flower_pot'], [/_candle$/, 'torch_post'], [/mushroom_block$|mushroom_stem$/, 'mushroom_cap'],
  [/planks|log|wood/, 'planks'],
];
// shape variants → strip the suffix and re-map the base material
const SHAPE_SUFFIX = /_(stairs|slab|wall|fence_gate|fence|pressure_plate|button|door|trapdoor|sign|hanging_sign)$/;
// Minecraft shape suffix → our shape name (only those we actually model)
const SHAPE_TO_OURS = { stairs: 'stairs', slab: 'slab', wall: 'wall', fence: 'fence', fence_gate: 'gate' };

// The 16 dye colours match Minecraft's ids exactly, so wire every colour family
// straight through to the block of the same name. Generated so it can't drift.
for (const [c] of COLORS) {
  for (const k of ['wool', 'carpet', 'concrete', 'concrete_powder', 'terracotta', 'glazed_terracotta', 'stained_glass', 'stained_glass_pane']) {
    MC_MAP[`${c}_${k}`] = `${c}_${k}`;
  }
}
MC_MAP.terracotta = 'terracotta';
MC_MAP.glass_pane = 'glasspane_pane';
// Some shape ids leave a bare stem that isn't itself a block id: "oak_stairs" →
// "oak" (the material is oak *planks*), "stone_brick_slab" → "stone_brick" (the
// block is "stone_bricks"). Resolve those stems to the right material.
const STEM_MAP = {
  oak: 'planks', spruce: 'planks', birch: 'planks', jungle: 'planks', acacia: 'planks',
  dark_oak: 'planks', mangrove: 'planks', cherry: 'planks', bamboo: 'planks',
  crimson: 'planks', warped: 'planks', pale_oak: 'planks',
  stone_brick: 'stone_brick', brick: 'stone_brick', nether_brick: 'stone_brick',
  red_nether_brick: 'stone_brick', end_stone_brick: 'stone_brick', mud_brick: 'stone_brick',
  polished_blackstone_brick: 'stone_brick', deepslate_brick: 'stone_brick',
  prismarine_brick: 'stone_brick', quartz: 'stone_brick', purpur: 'stone_brick',
};

export function normalizeId(raw) {
  return String(raw).toLowerCase().replace(/^minecraft:/, '').replace(/\[.*\]$/, '').trim();
}

// Decorative wood/stone families that collapse to a single Emberveil block
// regardless of the source material (wood stays OAK-only): every *_trapdoor →
// trapdoor, every *_sign / *_wall_sign / *_hanging_sign → sign, every *_button →
// button. Checked before the generic shape-suffix handling so they win.
const DECOR_SUFFIX = [['trapdoor', 'trapdoor'], ['sign', 'sign'], ['button', 'button']];

export function mapBlock(rawId) {
  const id = normalizeId(rawId);
  if (id in MC_MAP) return { block: MC_MAP[id], quality: id === 'air' ? 'exact' : 'exact', id };
  for (const [suf, blk] of DECOR_SUFFIX) if (id === suf || id.endsWith('_' + suf)) return { block: blk, quality: 'exact', id };
  // shape variants: resolve the base material, then keep the shape if we model it
  // (e.g. oak_stairs → planks_stairs, cobblestone_wall → cobble_wall). If we have
  // the material but not that shape, fall back to the plain material block.
  const shape = id.match(SHAPE_SUFFIX);
  if (shape) {
    const stem = id.slice(0, shape.index);
    const base = mapBlock(stem);
    const baseName = base.quality !== 'none' ? base.block : STEM_MAP[stem];
    if (baseName) {
      const ours = SHAPE_TO_OURS[shape[1]];
      const shaped = ours && `${baseName}_${ours}`;
      if (shaped && shaped in B) return { block: shaped, quality: 'exact', id }; // material + shape kept (orientation not carried)
      return { block: baseName, quality: 'approx', id }; // shape we don't model → plain material
    }
  }
  for (const [re, block] of APPROX_CONTAINS) if (re.test(id)) return { block, quality: 'approx', id };
  return { block: 'air', quality: 'none', id };
}
