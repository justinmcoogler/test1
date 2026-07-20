// Item registry. All icons are procedural pixel art from gfx/icons.js
// (block items render their atlas tile via tileIcon).
export const ITEMS = {};

function it(id, label, opts = {}) {
  ITEMS[id] = {
    id, label,
    tileIcon: opts.tileIcon || null,   // atlas tile name for block items
    stack: opts.stack ?? 99,
    type: opts.type || 'material',
    block: opts.block || null,         // placeable block name
    ...opts,
  };
}

// ---- currencies & quest items ----
it('coin', 'Ember Coin', { stack: 9999, type: 'currency' });
it('rootbound_heart', 'Rootbound Heart', { stack: 1, type: 'quest', desc: 'The still-pulsing core of the Rootgrave guardian.' });
it('relic_fragment', 'Relic Fragment', { desc: 'A piece of something ancient. Enchanters prize these.' });
it('waterlogged_cache', 'Waterlogged Cache', { stack: 5, type: 'usable', desc: 'A sealed box fished from the depths. Open it!' });

// ---- raw materials ----
it('rough_stone', 'Rough Stone');
it('dirt', 'Soil', { block: 'dirt', tileIcon: 'dirt', type: 'block' });
it('clay_lump', 'Clay Lump');
it('plant_fibre', 'Plant Fibre');
it('cord', 'Twisted Cord');
it('fernwood_log', 'Fernwood Log');
it('silverbark_log', 'Silverbark Log', { desc: 'Pale, dense timber.' });
it('emberpine_log', 'Emberpine Log', { desc: 'Smells faintly of smoke.' });
it('copper_ore_chunk', 'Copper Ore');
it('tin_ore_chunk', 'Tin Ore');
it('iron_ore_chunk', 'Iron Ore');
it('silver_ore_chunk', 'Silver Ore');
it('emberstone_shard', 'Emberstone Shard');
it('veilcrystal', 'Veilcrystal');
it('flawless_veilcrystal', 'Flawless Veilcrystal', { stack: 20 });
it('rough_gem', 'Rough Gem');
it('flame_opal', 'Flame Opal');
it('bronze_bar', 'Bronze Bar');
it('iron_bar', 'Iron Bar');
it('silver_bar', 'Silver Bar');
it('embersteel_bar', 'Embersteel Bar');
it('amber_resin', 'Amber Resin');
it('silverleaf', 'Silverleaf');
it('ember_sap', 'Ember Sap');
it('fernwood_seed', 'Fernwood Seed');
it('boarhide', 'Boarhide');
it('sinew', 'Sinew');
it('cured_hide', 'Cured Hide');
it('woven_cloth', 'Woven Cloth');
it('pottery_shard', 'Pottery Shard');
it('old_coin', 'Weathered Coin');
it('bone_needle', 'Bone Needle');

// ---- herbs & produce ----
it('bitterleaf', 'Bitterleaf');
it('springroot', 'Springroot');
it('duskcap', 'Duskcap');
it('sunpetal', 'Sunpetal');
it('tartberries', 'Tartberries', { type: 'food', heal: 3 });
it('grainsheaf', 'Grainsheaf');
it('golden_grain', 'Golden Grain');

// ---- fish & meat ----
it('silverfin', 'Silverfin');
it('mudwhisker', 'Mudwhisker');
it('duskeel', 'Duskeel');
it('boar_haunch', 'Boar Haunch');

// ---- cooked food ----
it('roast_silverfin', 'Roast Silverfin', { type: 'food', heal: 8 });
it('smoked_mudwhisker', 'Smoked Mudwhisker', { type: 'food', heal: 14 });
it('seared_duskeel', 'Seared Duskeel', { type: 'food', heal: 22 });
it('roast_haunch', 'Roast Haunch', { type: 'food', heal: 12 });
it('hearth_loaf', 'Hearth Loaf', { type: 'food', heal: 10 });
it('travel_biscuit', 'Travel Biscuit', { type: 'food', heal: 6 });

// ---- potions ----
it('minor_healing_tonic', 'Minor Healing Tonic', { type: 'potion', heal: 15 });
it('energy_tonic', 'Energy Tonic', { type: 'potion', energy: 50 });
it('lesser_mana_tonic', 'Lesser Mana Tonic', { type: 'potion', mana: 15 });
it('antidote', 'Antidote', { type: 'potion', cures: ['poison'] });

// ---- tools (dur = max durability, power = speed multiplier) ----
function tool(id, label, kind, tier, power, dur) {
  it(id, label, { stack: 1, type: 'tool', tool: kind, tier, power, dur });
}
tool('worn_hatchet', 'Worn Hatchet', 'axe', 1, 0.85, 45);
tool('crude_axe', 'Crude Axe', 'axe', 1, 1.0, 60);
tool('bronze_axe', 'Bronze Axe', 'axe', 2, 1.45, 180);
tool('iron_axe', 'Iron Axe', 'axe', 3, 1.95, 400);
tool('crude_pickaxe', 'Crude Pickaxe', 'pickaxe', 1, 1.0, 60);
tool('bronze_pickaxe', 'Bronze Pickaxe', 'pickaxe', 2, 1.45, 180);
tool('iron_pickaxe', 'Iron Pickaxe', 'pickaxe', 3, 1.95, 400);
tool('crude_shovel', 'Crude Shovel', 'shovel', 1, 1.0, 60);
tool('bronze_shovel', 'Bronze Shovel', 'shovel', 2, 1.5, 180);
tool('fishing_rod', 'Willow Rod', 'rod', 1, 1.0, 80);
tool('reinforced_rod', 'Reinforced Rod', 'rod', 2, 1.4, 220);

// ---- weapons ----
// wclass: melee|ranged|magic. atk = base power, acc, spd (initiative), crit %
function weapon(id, label, wclass, stats, desc) {
  it(id, label, { stack: 1, type: 'weapon', wclass, dur: stats.dur ?? 150, ...stats, desc });
}
weapon('wooden_cudgel', 'Wooden Cudgel', 'melee', { atk: 3, acc: 4, spd: 1, crit: 3, dur: 90 }, 'Simple, but it swings true.');
weapon('bronze_blade', 'Bronze Blade', 'melee', { atk: 6, acc: 6, spd: 0, crit: 5, dur: 200 }, 'A dependable smith-forged blade.');
weapon('iron_blade', 'Iron Blade', 'melee', { atk: 10, acc: 7, spd: -1, crit: 6, dur: 380 }, 'Heavy. Hits like a falling tree.');
weapon('boneshard_spear', 'Boneshard Spear', 'melee', { atk: 8, acc: 9, spd: 2, crit: 8, dur: 300 }, 'Swift and cruel, carved from dungeon bone.');
weapon('thornwood_bow', 'Thornwood Bow', 'ranged', { atk: 5, acc: 8, spd: 1, crit: 7, range: 6, dur: 160 }, 'Fires slivers of hardened thorn.');
weapon('recurve_silverbow', 'Silverbark Recurve', 'ranged', { atk: 9, acc: 10, spd: 1, crit: 9, range: 7, dur: 320 }, 'Silent, springy, deadly at distance.');
weapon('ember_staff', 'Ember Staff', 'magic', { atk: 6, acc: 7, spd: 0, crit: 5, range: 5, dur: 240 }, 'A staff warm to the touch.');

// ---- armor ----
// slot: head|body|legs|hands|feet|off. stats trade off armor/evasion/speed/etc.
function armor(id, label, slot, stats, desc) {
  it(id, label, { stack: 1, type: 'armor', slot, ...stats, desc });
}
armor('hide_cap', 'Hide Cap', 'head', { armor: 1, evasion: 2 }, 'Light and quiet.');
armor('hide_jerkin', 'Hide Jerkin', 'body', { armor: 2, evasion: 3 }, 'Favours dodging over deflecting.');
armor('hide_leggings', 'Hide Leggings', 'legs', { armor: 1, evasion: 2 });
armor('hide_gloves', 'Hide Gloves', 'hands', { armor: 1, gather: 0.05 }, 'Grippy: +5% gathering speed.');
armor('hide_boots', 'Hide Boots', 'feet', { armor: 1, evasion: 1, speed: 1 });
armor('bronze_helm', 'Bronze Helm', 'head', { armor: 3, evasion: -1 }, 'Solid protection, narrow view.');
armor('bronze_cuirass', 'Bronze Cuirass', 'body', { armor: 5, evasion: -2, speed: -1 }, 'Trade footwork for iron nerve.');
armor('bronze_greaves', 'Bronze Greaves', 'legs', { armor: 3, evasion: -1 });
armor('woven_hood', 'Woven Hood', 'head', { armor: 0, magic: 2, mana: 5 }, 'Channels focus: +max mana.');
armor('woven_robe', 'Woven Robe', 'body', { armor: 1, magic: 3, mana: 10 }, 'Threaded with silverleaf.');
armor('timber_shield', 'Timber Shield', 'off', { armor: 3, evasion: -1, block: 10 }, '10% chance to block outright.');

// ---- accessories & utility ----
function acc(id, label, stats, desc) {
  it(id, label, { stack: 1, type: 'accessory', slot: 'accessory', ...stats, desc });
}
acc('ironbud_charm', 'Ironbud Charm', { armor: 1, hp: 5 }, 'A metallic flower that never wilts.');
acc('keen_charm', 'Keen Charm', { crit: 4 }, 'Sharpens the eye and the edge.');
acc('forager_band', "Forager's Band", { gather: 0.1 }, '+10% gathering speed.');
acc('ward_talisman', 'Ward Talisman', { magicResist: 5, armor: 1 }, 'Hums near sources of corruption.');
acc('veilcharm', 'Veilcharm', { mana: 10, magic: 2, crit: 2 }, 'Cut from a flawless veilcrystal.');
it('torch_item', 'Torch Post', { block: 'torch_post', tileIcon: 'torch_post', type: 'block' });
it('lantern', 'Glowmoss Lantern', { stack: 1, type: 'utility', slot: 'utility', desc: 'Softens the dark of deep places.' });

// ---- placeable blocks ----
function blockItem(id, label, blockName, tile) {
  it(id, label, { block: blockName, tileIcon: tile, type: 'block' });
}
blockItem('cobble', 'Cobblestone', 'cobble', 'cobble');
blockItem('planks', 'Planks', 'planks', 'planks');
blockItem('timber_wall', 'Timber Wall', 'timber_wall', 'timber_wall');
blockItem('thatch', 'Thatch', 'thatch', 'thatch');
blockItem('stone_brick', 'Stone Brick', 'stone_brick', 'stone_brick');
blockItem('glasspane', 'Glass', 'glasspane', 'glasspane');
blockItem('sand', 'Sand', 'sand', 'sand');
blockItem('gravel', 'Gravel', 'gravel', 'gravel');
blockItem('workbench', 'Workbench', 'workbench', 'workbench_top');
blockItem('furnace', 'Furnace', 'furnace', 'furnace_front');
blockItem('anvil_block', 'Anvil', 'anvil_block', 'anvil');
blockItem('campfire', 'Campfire', 'campfire', 'campfire');
blockItem('alchemy_table', 'Alchemy Table', 'alchemy_table', 'alchemy_top');
blockItem('loom_block', 'Loom', 'loom_block', 'loom');
blockItem('enchant_altar', 'Runestone Altar', 'enchant_altar', 'altar_top');
blockItem('construction_bench', 'Construction Bench', 'construction_bench', 'construction_top');
blockItem('chest_block', 'Storage Chest', 'chest_block', 'chest_front');

export function itemDef(id) { return ITEMS[id]; }
