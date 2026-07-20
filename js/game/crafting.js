// Recipes: hand-craft or at stations, gated by skill levels, grant craft XP.
import { emit } from '../core/events.js';

export const STATION_LABELS = {
  null: 'By Hand', workbench: 'Workbench', furnace: 'Furnace', anvil_block: 'Anvil',
  campfire: 'Campfire', alchemy_table: 'Alchemy Table', loom_block: 'Loom',
  enchant_altar: 'Runestone Altar', construction_bench: 'Construction Bench',
};

let rid = 0;
function r(out, outQty, station, skill, level, xp, inputs, discover = null) {
  return {
    id: `r${rid++}`, out, outQty, station, skill, level, xp,
    inputs: inputs.map(([item, qty]) => ({ item, qty })),
    discover, // null → always known; item id → learned by obtaining that item
  };
}

export const RECIPES = [
  // ---- by hand ----
  r('planks', 4, null, 'woodworking', 1, 6, [['fernwood_log', 1]]),
  r('planks', 6, null, 'woodworking', 8, 9, [['silverbark_log', 1]]),
  r('cord', 1, null, 'tailoring', 1, 4, [['plant_fibre', 3]]),
  r('workbench', 1, null, 'construction', 1, 12, [['planks', 4]]),
  r('campfire', 1, null, 'construction', 1, 10, [['fernwood_log', 2], ['rough_stone', 2]]),
  r('torch_item', 2, null, 'construction', 1, 4, [['planks', 1], ['plant_fibre', 2]]),

  // ---- workbench ----
  r('crude_axe', 1, 'workbench', 'woodworking', 1, 14, [['planks', 3], ['cord', 1], ['rough_stone', 2]]),
  r('crude_pickaxe', 1, 'workbench', 'woodworking', 1, 14, [['planks', 3], ['cord', 1], ['rough_stone', 3]]),
  r('crude_shovel', 1, 'workbench', 'woodworking', 1, 10, [['planks', 2], ['cord', 1], ['rough_stone', 1]]),
  r('fishing_rod', 1, 'workbench', 'woodworking', 1, 12, [['planks', 2], ['cord', 2]]),
  r('crude_hoe', 1, 'workbench', 'woodworking', 1, 10, [['planks', 2], ['cord', 1], ['rough_stone', 1]]),
  r('wooden_cudgel', 1, 'workbench', 'woodworking', 1, 12, [['planks', 3], ['cord', 1]]),
  r('thornwood_bow', 1, 'workbench', 'woodworking', 5, 25, [['fernwood_log', 2], ['cord', 3]]),
  r('recurve_silverbow', 1, 'workbench', 'woodworking', 15, 60, [['silverbark_log', 3], ['cord', 4], ['sinew', 2]]),
  r('ember_staff', 1, 'workbench', 'woodworking', 8, 35, [['emberpine_log', 1], ['ember_sap', 1], ['cord', 2]]),
  r('chest_block', 1, 'workbench', 'construction', 1, 15, [['planks', 8]]),
  r('timber_wall', 2, 'workbench', 'construction', 1, 6, [['planks', 2]]),
  r('thatch', 2, 'workbench', 'construction', 1, 5, [['plant_fibre', 3]]),
  r('furnace', 1, 'workbench', 'construction', 1, 18, [['rough_stone', 8], ['clay_lump', 2]]),
  r('construction_bench', 1, 'workbench', 'construction', 5, 20, [['planks', 6], ['rough_stone', 2]]),
  r('loom_block', 1, 'workbench', 'construction', 3, 18, [['planks', 5], ['cord', 2]]),
  r('alchemy_table', 1, 'workbench', 'construction', 3, 18, [['planks', 4], ['glasspane', 1]]),
  r('anvil_block', 1, 'workbench', 'construction', 5, 22, [['iron_bar', 1], ['rough_stone', 4]]),

  // ---- furnace ----
  r('bronze_bar', 1, 'furnace', 'smithing', 1, 20, [['copper_ore_chunk', 1], ['tin_ore_chunk', 1]]),
  r('iron_bar', 1, 'furnace', 'smithing', 10, 38, [['iron_ore_chunk', 2]]),
  r('silver_bar', 1, 'furnace', 'smithing', 25, 60, [['silver_ore_chunk', 2]]),
  r('embersteel_bar', 1, 'furnace', 'smithing', 40, 110, [['iron_bar', 1], ['emberstone_shard', 2]]),
  r('glasspane', 2, 'furnace', 'smithing', 1, 8, [['sand', 3]]),

  // ---- anvil ----
  r('bronze_blade', 1, 'anvil_block', 'smithing', 5, 30, [['bronze_bar', 2], ['planks', 1]]),
  r('bronze_axe', 1, 'anvil_block', 'smithing', 5, 28, [['bronze_bar', 2], ['planks', 1]]),
  r('bronze_pickaxe', 1, 'anvil_block', 'smithing', 5, 28, [['bronze_bar', 2], ['planks', 1]]),
  r('bronze_shovel', 1, 'anvil_block', 'smithing', 5, 22, [['bronze_bar', 1], ['planks', 1]]),
  r('bronze_hoe', 1, 'anvil_block', 'smithing', 5, 22, [['bronze_bar', 1], ['planks', 1]]),
  r('bronze_helm', 1, 'anvil_block', 'smithing', 7, 32, [['bronze_bar', 2]]),
  r('bronze_cuirass', 1, 'anvil_block', 'smithing', 9, 48, [['bronze_bar', 4]]),
  r('bronze_greaves', 1, 'anvil_block', 'smithing', 8, 40, [['bronze_bar', 3]]),
  r('timber_shield', 1, 'anvil_block', 'smithing', 3, 20, [['planks', 4], ['bronze_bar', 1]]),
  r('iron_blade', 1, 'anvil_block', 'smithing', 12, 55, [['iron_bar', 2], ['planks', 1]]),
  r('iron_axe', 1, 'anvil_block', 'smithing', 12, 50, [['iron_bar', 2], ['planks', 1]]),
  r('iron_pickaxe', 1, 'anvil_block', 'smithing', 12, 50, [['iron_bar', 2], ['planks', 1]]),
  r('boneshard_spear', 1, 'anvil_block', 'smithing', 15, 70, [['iron_bar', 1], ['relic_fragment', 1], ['cord', 2]], 'relic_fragment'),

  // ---- campfire ----
  r('roast_silverfin', 1, 'campfire', 'cooking', 1, 10, [['silverfin', 1]]),
  r('roast_haunch', 1, 'campfire', 'cooking', 1, 12, [['boar_haunch', 1]]),
  r('travel_biscuit', 2, 'campfire', 'cooking', 5, 14, [['grainsheaf', 1], ['tartberries', 2]]),
  r('smoked_mudwhisker', 1, 'campfire', 'cooking', 8, 20, [['mudwhisker', 1]]),
  r('hearth_loaf', 1, 'campfire', 'cooking', 12, 26, [['grainsheaf', 2]]),
  r('seared_duskeel', 1, 'campfire', 'cooking', 20, 44, [['duskeel', 1]]),
  r('cured_hide', 1, 'campfire', 'tailoring', 1, 10, [['boarhide', 1]]),

  // ---- loom ----
  r('woven_cloth', 1, 'loom_block', 'tailoring', 1, 12, [['plant_fibre', 4]]),
  r('hide_cap', 1, 'loom_block', 'tailoring', 2, 16, [['cured_hide', 1], ['sinew', 1]]),
  r('hide_gloves', 1, 'loom_block', 'tailoring', 2, 14, [['cured_hide', 1], ['cord', 1]]),
  r('hide_boots', 1, 'loom_block', 'tailoring', 3, 16, [['cured_hide', 1], ['sinew', 1]]),
  r('hide_leggings', 1, 'loom_block', 'tailoring', 4, 22, [['cured_hide', 2], ['cord', 1]]),
  r('hide_jerkin', 1, 'loom_block', 'tailoring', 6, 30, [['cured_hide', 3], ['sinew', 2]]),
  r('woven_hood', 1, 'loom_block', 'tailoring', 10, 30, [['woven_cloth', 2], ['silverleaf', 1]]),
  r('woven_robe', 1, 'loom_block', 'tailoring', 12, 44, [['woven_cloth', 4], ['silverleaf', 1]]),

  // ---- alchemy ----
  r('minor_healing_tonic', 1, 'alchemy_table', 'alchemy', 1, 15, [['bitterleaf', 2], ['springroot', 1]]),
  r('energy_tonic', 1, 'alchemy_table', 'alchemy', 5, 18, [['tartberries', 3], ['springroot', 1]]),
  r('antidote', 1, 'alchemy_table', 'alchemy', 10, 24, [['bitterleaf', 1], ['duskcap', 1]]),
  r('lesser_mana_tonic', 1, 'alchemy_table', 'alchemy', 15, 30, [['sunpetal', 1], ['bitterleaf', 2]]),

  // ---- runestone altar ----
  r('keen_charm', 1, 'enchant_altar', 'enchanting', 1, 40, [['relic_fragment', 1], ['rough_gem', 1]]),
  r('forager_band', 1, 'enchant_altar', 'enchanting', 5, 45, [['relic_fragment', 1], ['plant_fibre', 6]]),
  r('ward_talisman', 1, 'enchant_altar', 'enchanting', 15, 80, [['veilcrystal', 1], ['silver_bar', 1]]),
  r('veilcharm', 1, 'enchant_altar', 'enchanting', 25, 140, [['flawless_veilcrystal', 1], ['rough_gem', 2]], 'flawless_veilcrystal'),
  r('lantern', 1, 'enchant_altar', 'enchanting', 3, 30, [['glasspane', 2], ['veilcrystal', 1]], 'veilcrystal'),

  // ---- construction bench ----
  r('stone_brick', 4, 'construction_bench', 'construction', 1, 8, [['rough_stone', 4]]),
  r('cobble', 4, 'construction_bench', 'construction', 1, 4, [['rough_stone', 2]]),
];

export function availableRecipes(skills, discoveredItems) {
  return RECIPES.filter((rec) => !rec.discover || discoveredItems.has(rec.discover));
}

export function canCraft(rec, inv, skills, nearbyStations) {
  if (rec.station && !nearbyStations.has(rec.station)) return { ok: false, reason: `Needs ${STATION_LABELS[rec.station]}` };
  if (skills.level(rec.skill) < rec.level) return { ok: false, reason: `Needs ${rec.skill} ${rec.level}` };
  if (!inv.hasAll(rec.inputs)) return { ok: false, reason: 'Missing materials' };
  return { ok: true };
}

export function craft(rec, inv, skills, nearbyStations) {
  const check = canCraft(rec, inv, skills, nearbyStations);
  if (!check.ok) return check;
  inv.consumeAll(rec.inputs);
  // consuming inputs may have freed the space; if the result still can't fit,
  // refund rather than silently vaporizing the output
  if (!inv.canFit(rec.out, rec.outQty)) {
    for (const inp of rec.inputs) inv.add(inp.item, inp.qty);
    return { ok: false, reason: 'Inventory full' };
  }
  inv.add(rec.out, rec.outQty);
  skills.addXp(rec.skill, rec.xp);
  emit('crafted', { recipe: rec, item: rec.out, qty: rec.outQty });
  return { ok: true };
}
