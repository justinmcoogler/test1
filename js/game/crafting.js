// Recipes: hand-craft or at stations, gated by skill levels, grant craft XP.
// The metal / wood / gem / firearm / jewelry recipes are GENERATED from the
// realistic material catalog (js/game/materials.js); the food/potion/hide/
// enchant recipes stay hand-authored.
import { emit } from '../core/events.js';
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals, wood } from './materials.js';

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
  // ---- by hand ---- (planks come from the generated per-wood recipes below)
  r('cord', 1, null, 'tailoring', 1, 4, [['plant_fibre', 3]]),
  r('workbench', 1, null, 'construction', 1, 12, [['planks', 4]]),
  r('campfire', 1, null, 'construction', 1, 10, [['pine_log', 2], ['rough_stone', 2]]),
  r('torch_item', 2, null, 'construction', 1, 4, [['planks', 1], ['plant_fibre', 2]]),

  // ---- workbench (bootstrap tools; metal gear is generated below) ----
  r('crude_axe', 1, 'workbench', 'woodworking', 1, 14, [['planks', 3], ['cord', 1], ['rough_stone', 2]]),
  r('crude_pickaxe', 1, 'workbench', 'woodworking', 1, 14, [['planks', 3], ['cord', 1], ['rough_stone', 3]]),
  r('crude_shovel', 1, 'workbench', 'woodworking', 1, 10, [['planks', 2], ['cord', 1], ['rough_stone', 1]]),
  r('fishing_rod', 1, 'workbench', 'woodworking', 1, 12, [['planks', 2], ['cord', 2]]),
  r('crude_hoe', 1, 'workbench', 'woodworking', 1, 10, [['planks', 2], ['cord', 1], ['rough_stone', 1]]),
  r('wooden_cudgel', 1, 'workbench', 'woodworking', 1, 12, [['planks', 3], ['cord', 1]]),
  r('timber_shield', 1, 'workbench', 'woodworking', 3, 20, [['planks', 4], ['cord', 2]]),
  r('chest_block', 1, 'workbench', 'construction', 1, 15, [['planks', 8]]),
  r('timber_wall', 2, 'workbench', 'construction', 1, 6, [['planks', 2]]),
  r('thatch', 2, 'workbench', 'construction', 1, 5, [['plant_fibre', 3]]),
  r('furnace', 1, 'workbench', 'construction', 1, 18, [['rough_stone', 8], ['clay_lump', 2]]),
  r('construction_bench', 1, 'workbench', 'construction', 5, 20, [['planks', 6], ['rough_stone', 2]]),
  r('loom_block', 1, 'workbench', 'construction', 3, 18, [['planks', 5], ['cord', 2]]),
  r('alchemy_table', 1, 'workbench', 'construction', 3, 18, [['planks', 4], ['glasspane', 1]]),
  r('anvil_block', 1, 'workbench', 'construction', 5, 22, [['iron_bar', 1], ['rough_stone', 4]]),

  // ---- furnace ----
  r('glasspane', 2, 'furnace', 'smithing', 1, 8, [['sand', 3]]),

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

// ===========================================================================
// Generated realistic recipes (from js/game/materials.js). Levels come from the
// catalog; quantities/xp use simple tier formulas Phase 3 tuning can revisit.
// ===========================================================================
const push = (...a) => RECIPES.push(r(...a));
const lockedGun = (...a) => { const rec = r(...a); rec.educationLocked = true; RECIPES.push(rec); };

// planks: generic (bootstrap woods) + one worked plank per species
push('planks', 4, null, 'woodworking', 1, 6, [['pine_log', 1]]);
push('planks', 4, null, 'woodworking', 1, 6, [['oak_log', 1]]);
for (const w of WOODS) push(`${w.id}_plank`, 4, null, 'woodworking', w.woodLevel, Math.round(5 + w.tier * 2), [[`${w.id}_log`, 1]]);
push('charcoal', 1, 'furnace', 'crafting', 1, 6, [['pine_log', 1]]);

// smelting: ore → bar (iron/steel-line need coal in the furnace)
for (const m of METALS) {
  if (!(m.smelt || []).some((s) => s.endsWith('_ore'))) continue;
  const lvl = m.mineLevel || 1;
  const inputs = [[`${m.id}_ore`, 2]];
  if ((m.smelt || []).includes('coal')) inputs.push(['coal', 1]);
  push(`${m.id}_bar`, 1, 'furnace', 'smithing', lvl, Math.round(18 + lvl * 1.5), inputs);
}
// alloys: combine bars (recipe straight from the catalog's alloy list)
for (const m of METALS) {
  if (!m.alloy) continue;
  const tally = {};
  for (const ref of m.alloy) tally[ref] = (tally[ref] || 0) + 1;
  const lvl = m.smithLevel || 1;
  push(`${m.id}_bar`, 1, 'furnace', 'smithing', lvl, Math.round(30 + lvl * 2), Object.entries(tally));
}
// gem cutting (Crafting): uncut → cut
for (const g of GEMS) push(g.id, 1, 'workbench', 'crafting', g.cutLevel, Math.round(10 + g.cutLevel * 2), [[`uncut_${g.id}`, 1]]);

// tools / weapons / armor per tool metal, forged at an anvil
const TOOLS = { pickaxe: 2, axe: 2, hammer: 2, chisel: 1, shovel: 1, hoe: 1 };
const WEAPONS = { sword: 2, dagger: 1, battleaxe: 3, spear: 1 };
const ARMOR = { helmet: 2, chestplate: 4, leggings: 3, boots: 1, shield: 2 };
toolMetals().forEach((m, i) => {
  const wl = m.smithLevel ?? m.mineLevel ?? 1; const t = i + 1; const bar = `${m.id}_bar`;
  for (const [k, bars] of Object.entries(TOOLS)) push(`${m.id}_${k}`, 1, 'anvil_block', 'smithing', wl, Math.round(14 + t * 6), [[bar, bars], ['planks', 1]]);
  for (const [k, bars] of Object.entries(WEAPONS)) push(`${m.id}_${k}`, 1, 'anvil_block', 'smithing', Math.min(99, wl + 2), Math.round(20 + t * 8), [[bar, bars], ['planks', k === 'spear' ? 2 : 1]]);
  for (const [k, bars] of Object.entries(ARMOR)) push(`${m.id}_${k}`, 1, 'anvil_block', 'smithing', Math.min(99, wl + 3), Math.round(24 + t * 9), k === 'shield' ? [[bar, bars], ['planks', 1]] : [[bar, bars]]);
});

// bows per bow-suited wood (Woodworking)
for (const wid of ['ash', 'hickory', 'yew', 'oak', 'lignum_vitae']) {
  const w = wood(wid);
  push(`${wid}_shortbow`, 1, 'workbench', 'woodworking', w.woodLevel, Math.round(20 + w.tier * 4), [[`${wid}_plank`, 2], ['cord', 2]]);
  push(`${wid}_longbow`, 1, 'workbench', 'woodworking', Math.min(99, w.woodLevel + 5), Math.round(30 + w.tier * 5), [[`${wid}_plank`, 3], ['cord', 3]]);
}

// black-powder line (Crafting) — every recipe flagged educationLocked so the UI
// can hide the whole chain when firearms are disabled for schools.
const GUN_LEVEL = { 1: 35, 2: 55, 3: 55, 4: 75 };
lockedGun(FIREARMS.powder.id, 4, 'workbench', 'crafting', 35, 30, [['saltpeter', 2], ['charcoal', 1], ['sulfur', 1]]);
lockedGun('lead_ball', 8, 'furnace', 'crafting', 35, 12, [['lead_bar', 1]]);
lockedGun('lead_shot', 12, 'furnace', 'crafting', 35, 14, [['lead_bar', 1]]);
for (const g of FIREARMS.guns) lockedGun(g.id, 1, 'workbench', 'crafting', GUN_LEVEL[g.tier], Math.round(60 + g.tier * 20), [[`${g.barrel}_bar`, 3], [`${g.stock}_plank`, 2], [FIREARMS.powder.id, 1]]);

// jewelry per jewelry metal (Crafting); amulet takes a cut gem as a socket
for (const m of jewelryMetals()) {
  const lvl = m.mineLevel ?? m.smithLevel ?? 1; const bar = `${m.id}_bar`;
  push(`${m.id}_ring`, 1, 'workbench', 'crafting', lvl, Math.round(20 + lvl), [[bar, 1]]);
  push(`${m.id}_necklace`, 1, 'workbench', 'crafting', Math.min(99, lvl + 3), Math.round(28 + lvl), [[bar, 2]]);
  push(`${m.id}_amulet`, 1, 'workbench', 'crafting', Math.min(99, lvl + 5), Math.round(36 + lvl), [[bar, 2], ['quartz', 1]]);
}

export function availableRecipes(skills, discoveredItems) {
  return RECIPES.filter((rec) => !rec.discover || discoveredItems.has(rec.discover));
}

export function canCraft(rec, inv, skills, nearbyStations, firearmsAllowed = true) {
  if (rec.educationLocked && !firearmsAllowed) return { ok: false, reason: 'Firearms are disabled in this mode' };
  if (rec.station && !nearbyStations.has(rec.station)) return { ok: false, reason: `Needs ${STATION_LABELS[rec.station]}` };
  if (skills.level(rec.skill) < rec.level) return { ok: false, reason: `Needs ${rec.skill} ${rec.level}` };
  if (!inv.hasAll(rec.inputs)) return { ok: false, reason: 'Missing materials' };
  return { ok: true };
}

export function craft(rec, inv, skills, nearbyStations, firearmsAllowed = true) {
  const check = canCraft(rec, inv, skills, nearbyStations, firearmsAllowed);
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
