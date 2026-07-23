// Recipes: hand-craft or at stations, gated by skill levels, grant craft XP.
// The metal / wood / gem / firearm / jewelry recipes are GENERATED from the
// realistic material catalog (js/game/materials.js); the food/potion/hide/
// enchant recipes stay hand-authored.
import { emit } from '../core/events.js';
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals, wood } from './materials.js';
import { COLORS } from '../core/colors.js';
import { BLOCKS } from '../world/blocks.js';
import { ITEMS } from './items.js';

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
const push = (...a) => { const rec = r(...a); RECIPES.push(rec); return rec; };
const lockedGun = (...a) => { const rec = r(...a); rec.educationLocked = true; RECIPES.push(rec); };

// ---- fuel-temperature smelting -------------------------------------------
// Each fuel burns to a temperature; a metal only smelts when a fuel that hot (or
// hotter) is on hand, consumed with the ore. Real ladder: charcoal for the
// bronze-age metals, coal for iron & steel, coke for the hottest (platinum,
// meteoric). The recipe stores a `fuelTemp`; the UI shows the minimum fuel.
export const FUELS = { charcoal: 1150, coal: 1400, coke: 1800 };
const SMELT_TEMP = { copper: 1085, tin: 950, lead: 800, zinc: 1000, silver: 960, gold: 1064, iron: 1250, platinum: 1768, meteoric: 1500 };
const ALLOY_TEMP = { bronze: 950, steel: 1400, damascus: 1450, brass: 950, electrum: 1000, pewter: 400 };

// the cheapest fuel the player has that burns hot enough, or null
function bestFuel(inv, temp) {
  let best = null, bestHeat = Infinity;
  for (const [item, heat] of Object.entries(FUELS)) {
    if (heat >= temp && heat < bestHeat && (inv.count ? inv.count(item) : 1) >= 1) { best = item; bestHeat = heat; }
  }
  return best;
}
// the minimum fuel that reaches a temperature (for UI hints)
export function minFuel(temp) {
  let name = 'coke', heat = Infinity;
  for (const [item, h] of Object.entries(FUELS)) if (h >= temp && h < heat) { name = item; heat = h; }
  return name;
}

// planks: generic (bootstrap woods) + one worked plank per species
push('planks', 4, null, 'woodworking', 1, 6, [['pine_log', 1]]);
push('planks', 4, null, 'woodworking', 1, 6, [['oak_log', 1]]);
for (const w of WOODS) push(`${w.id}_plank`, 4, null, 'woodworking', w.woodLevel, Math.round(5 + w.tier * 2), [[`${w.id}_log`, 1]]);
push('charcoal', 1, 'furnace', 'crafting', 1, 6, [['pine_log', 1]]);
push('coke', 1, 'furnace', 'smithing', 40, 16, [['coal', 2]]).fuelTemp = FUELS.charcoal; // bake coal airless into the hottest fuel

// smelting: ore → bar, gated by a hot-enough fuel (charcoal → coal → coke)
for (const m of METALS) {
  if (!(m.smelt || []).some((s) => s.endsWith('_ore'))) continue;
  const lvl = m.mineLevel || 1;
  const rec = push(`${m.id}_bar`, 1, 'furnace', 'smithing', lvl, Math.round(18 + lvl * 1.5), [[`${m.id}_ore`, 2]]);
  rec.fuelTemp = SMELT_TEMP[m.id] || FUELS.charcoal;
}
// alloys: combine bars (coal, where the catalog lists it, becomes the fuel)
for (const m of METALS) {
  if (!m.alloy) continue;
  const tally = {};
  for (const ref of m.alloy) if (ref !== 'coal') tally[ref] = (tally[ref] || 0) + 1;
  const lvl = m.smithLevel || 1;
  const rec = push(`${m.id}_bar`, 1, 'furnace', 'smithing', lvl, Math.round(30 + lvl * 2), Object.entries(tally));
  rec.fuelTemp = ALLOY_TEMP[m.id] || FUELS.charcoal;
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

// ---- Building set: dyes, colour families, natural stone, shape variants -----
// Dyes at the alchemy table: seven primaries ground from natural materials, the
// rest mixed from those (Minecraft-style dye tree).
const DYE_PRIMARY = { black: 'charcoal', white: 'saltpeter', red: 'tartberries', yellow: 'sunpetal', blue: 'veilcrystal', green: 'bitterleaf', brown: 'duskcap' };
for (const [c, src] of Object.entries(DYE_PRIMARY)) push(`${c}_dye`, 2, 'alchemy_table', 'alchemy', 1, 6, [[src, 1]]);
const DYE_MIX = { orange: ['red', 'yellow'], lime: ['green', 'white'], pink: ['red', 'white'], gray: ['black', 'white'], light_gray: ['gray', 'white'], cyan: ['blue', 'green'], purple: ['red', 'blue'], magenta: ['purple', 'pink'], light_blue: ['blue', 'white'] };
for (const [c, [a, b]] of Object.entries(DYE_MIX)) push(`${c}_dye`, 2, 'alchemy_table', 'alchemy', 1, 6, [[`${a}_dye`, 1], [`${b}_dye`, 1]]);

// Colour a base material with a dye.
for (const [c] of COLORS) {
  push(`${c}_wool`, 1, 'loom_block', 'tailoring', 1, 6, [['woven_cloth', 1], [`${c}_dye`, 1]]);
  push(`${c}_carpet`, 3, 'loom_block', 'tailoring', 1, 4, [[`${c}_wool`, 2]]);
  push(`${c}_terracotta`, 1, 'construction_bench', 'construction', 1, 5, [['terracotta', 1], [`${c}_dye`, 1]]);
  push(`${c}_glazed_terracotta`, 1, 'furnace', 'construction', 3, 8, [[`${c}_terracotta`, 1]]);
  push(`${c}_stained_glass`, 1, 'construction_bench', 'construction', 1, 5, [['glasspane', 1], [`${c}_dye`, 1]]);
  push(`${c}_stained_glass_pane`, 2, 'construction_bench', 'construction', 1, 4, [[`${c}_stained_glass`, 1]]);
  push(`${c}_concrete_powder`, 4, 'construction_bench', 'construction', 1, 5, [['sand', 2], ['gravel', 2], [`${c}_dye`, 1]]);
  push(`${c}_concrete`, 1, 'construction_bench', 'construction', 1, 4, [[`${c}_concrete_powder`, 1]]);
}

// Base building blocks.
push('stone', 4, 'construction_bench', 'construction', 1, 4, [['rough_stone', 4]]);
push('terracotta', 1, 'furnace', 'construction', 1, 5, [['clay_lump', 1]]);
push('brick', 1, 'furnace', 'construction', 2, 6, [['clay_lump', 2]]);
push('sandstone', 1, 'construction_bench', 'construction', 1, 5, [['sand', 4]]);
for (const nat of ['granite', 'andesite', 'marble', 'deepslate']) push(nat, 2, 'construction_bench', 'construction', 3, 6, [['rough_stone', 3]]);
push('mossy_cobble', 1, 'construction_bench', 'construction', 1, 4, [['cobble', 1]]);
push('mossy_stone_brick', 1, 'construction_bench', 'construction', 1, 4, [['stone_brick', 1]]);
push('copper_block', 1, 'construction_bench', 'smithing', 5, 10, [['copper_bar', 9]]);
push('copper_weathered', 1, 'construction_bench', 'construction', 1, 4, [['copper_block', 1]]);
push('iron_block', 1, 'construction_bench', 'smithing', 10, 14, [['iron_bar', 9]]);
push('gold_block', 1, 'construction_bench', 'smithing', 8, 12, [['gold_bar', 9]]);

// Shape variants carved from their base block at the construction bench.
const SHAPE_RATIO = { slab: [1, 2], stairs: [3, 4], wall: [1, 1], fence: [1, 1], gate: [1, 1], pane: [1, 2] };
for (const d of BLOCKS) {
  if (!d) continue;
  const m = d.name.match(/^(.+)_(slab|stairs|wall|fence|gate|pane)$/);
  if (!m || m[1].endsWith('_stained_glass')) continue; // colored panes handled above
  const [base, shape] = [m[1], m[2]];
  if (!(base in ITEMS) || !(d.name in ITEMS)) continue; // both must be real items
  const [inQ, outQ] = SHAPE_RATIO[shape];
  push(d.name, outQ, 'construction_bench', 'construction', 1, 4, [[base, inQ]]);
}

export function availableRecipes(skills, discoveredItems) {
  return RECIPES.filter((rec) => !rec.discover || discoveredItems.has(rec.discover));
}

export function canCraft(rec, inv, skills, nearbyStations, firearmsAllowed = true) {
  if (rec.educationLocked && !firearmsAllowed) return { ok: false, reason: 'Firearms are disabled in this mode' };
  if (rec.station && !nearbyStations.has(rec.station)) return { ok: false, reason: `Needs ${STATION_LABELS[rec.station]}` };
  if (skills.level(rec.skill) < rec.level) return { ok: false, reason: `Needs ${rec.skill} ${rec.level}` };
  if (!inv.hasAll(rec.inputs)) return { ok: false, reason: 'Missing materials' };
  if (rec.fuelTemp && !bestFuel(inv, rec.fuelTemp)) return { ok: false, reason: `Needs ${minFuel(rec.fuelTemp)} to reach ${rec.fuelTemp}°C` };
  return { ok: true };
}

export function craft(rec, inv, skills, nearbyStations, firearmsAllowed = true) {
  const check = canCraft(rec, inv, skills, nearbyStations, firearmsAllowed);
  if (!check.ok) return check;
  const fuel = rec.fuelTemp ? bestFuel(inv, rec.fuelTemp) : null;
  inv.consumeAll(rec.inputs);
  if (fuel) inv.consumeAll([{ item: fuel, qty: 1 }]); // burn one unit of the hot-enough fuel
  // consuming inputs may have freed the space; if the result still can't fit,
  // refund rather than silently vaporizing the output
  if (!inv.canFit(rec.out, rec.outQty)) {
    for (const inp of rec.inputs) inv.add(inp.item, inp.qty);
    if (fuel) inv.add(fuel, 1);
    return { ok: false, reason: 'Inventory full' };
  }
  inv.add(rec.out, rec.outQty);
  skills.addXp(rec.skill, rec.xp);
  emit('crafted', { recipe: rec, item: rec.out, qty: rec.outQty });
  return { ok: true };
}
