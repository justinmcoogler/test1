// 21 independent skills, levels 1–99, XP through use, milestone unlock tables.
import { emit } from '../core/events.js';

// The real-world skill roster (20 live skills). Internal keys are kept stable so
// recipes/nodes/combat and old saves keep working; the real-craft names live in
// `label`. Magic & Enchanting are anachronistic — flagged `frontier` and hidden
// unless the optional Fantasy Frontier is enabled. (Tactics was dissolved into
// Hunting's tracking + Constitution's veterancy.)
export const SKILL_DEFS = {
  // Gathering — real subsistence disciplines, each gated by a material/biome ladder
  mining:      { label: 'Mining', group: 'Gathering', desc: 'Break ore veins and stone; deeper, farther rock yields rarer metals and gems.' },
  woodcutting: { label: 'Woodcutting', group: 'Gathering', desc: 'Fell trees — a harder axe-edge bites denser, rarer woods.' },
  fishing:     { label: 'Fishing', group: 'Gathering', desc: 'Line, net, trap and harpoon fish from streams to the open sea.' },
  foraging:    { label: 'Foraging', group: 'Gathering', desc: 'Identify and gather wild herbs, fruit and fungi by biome and season.' },
  hunting:     { label: 'Hunting', group: 'Gathering', desc: 'Track, stalk, trap and butcher wild game for hide, meat, sinew and bone.' },
  farming:     { label: 'Farming', group: 'Gathering', desc: 'Sow, rotate and irrigate crops; raise and breed livestock.' },
  // Processing — re-living the real craft tech tree
  smithing:     { label: 'Smithing', group: 'Processing', desc: 'Smelt ore at real melting temperatures and forge metal gear.' },
  woodworking:  { label: 'Woodworking', group: 'Processing', desc: 'Shape timber into planks, hafts, bows and gunstocks.' },
  cooking:      { label: 'Cooking', group: 'Processing', desc: 'Cook, ferment and preserve food; balance real nutrition.' },
  tailoring:    { label: 'Tailoring', group: 'Processing', desc: 'Tan hides and weave cloth into clothing and armor.' },
  alchemy:      { label: 'Apothecary', group: 'Processing', desc: 'Compound herbs and minerals — remedies, reagents, gunpowder chemistry.' },
  construction: { label: 'Construction', group: 'Processing', desc: 'Build with timber, fired brick and lime mortar — arches to grand halls.' },
  crafting:     { label: 'Jewelcraft', group: 'Processing', desc: 'Cut gems, set jewelry, and assemble firearms.' },
  // Survival — the body and the realism layer
  vitality: { label: 'Constitution', group: 'Survival', desc: 'Endurance and carrying power — warmth, hydration, nutrition and acclimatization.' },
  healing:  { label: 'Medicine', group: 'Survival', desc: 'Real first aid — wounds, bleeding, fractures, infection and field surgery.' },
  athletics: { label: 'Athletics', group: 'Survival', desc: 'Sprint, climb, swim and scale the harshest terrain.' },
  // Combat — the real weapon/armor ladder
  strength: { label: 'Strength', group: 'Combat', desc: 'Melee damage with the real weapon ladder, stone to steel.' },
  defense:  { label: 'Defense', group: 'Combat', desc: 'Soak and deflect blows through real armor tiers.' },
  ranged:   { label: 'Marksmanship', group: 'Combat', desc: 'Slings, bows, crossbows and black-powder firearms.' },
  // Knowledge
  archaeology: { label: 'Archaeology', group: 'Knowledge', desc: 'Excavate strata for relics and extinct-megafauna fossils.' },
  // Fantasy Frontier — off by default, hidden unless enabled
  magic:      { label: 'Magic', group: 'Frontier', frontier: true, desc: 'Elemental arts — only in the optional Fantasy Frontier.' },
  enchanting: { label: 'Enchanting', group: 'Frontier', frontier: true, desc: 'Bind energies into gear — only in the optional Fantasy Frontier.' },
};

// Milestone unlock tables (display + real gates live in recipes/nodes/abilities)
export const SKILL_UNLOCKS = {
  mining: [
    [1, 'Copper ore, clay & saltpeter'], [10, 'Tin ore'], [15, 'Coal & sulfur seams'],
    [20, 'Lead & silver ore'], [25, 'Iron ore'], [30, 'Zinc ore'], [40, 'Gold ore'],
    [55, 'Platinum ore'], [70, 'Meteoric iron (crater sites)'],
    [90, 'Master miner: rare gem chance doubled — gems drop while mining any rock'],
  ],
  woodcutting: [
    [1, 'Pine'], [10, 'Cedar'], [20, 'Birch'], [30, 'Oak'], [35, 'Ash'], [45, 'Hickory'],
    [50, 'Maple'], [55, 'Walnut (gunstocks)'], [65, 'Yew (longbows)'], [70, 'Teak'], [75, 'Ebony'],
    [85, 'Lignum Vitae — the densest wood'],
  ],
  fishing: [
    [1, 'Handline & rod — still-water fish'], [8, 'Nets, traps & weirs (passive harvest)'],
    [20, 'Harpoon & set-lines; river salvage'], [30, 'Coastal & mangrove shellfish; boats'],
    [50, 'Deep-water pelagic fish'], [90, 'The one that never got away (legendary catches)'],
  ],
  foraging: [
    [1, 'Herbs, berries & mushrooms; plant ID (spot toxic look-alikes)'], [12, 'Wetland flora; seasonality begins'],
    [25, 'Tropical medicinal & culinary range; double-harvest chance'], [40, 'Reliable double harvest'],
    [70, 'Safe handling of potent medicinals (foxglove, ergot)'],
  ],
  hunting: [
    [1, 'Snares & spear — small game; field-dressing'], [10, 'Bow & baited traps'],
    [25, 'Tracking: read spoor, locate elite quarry'], [50, 'Big game & traplines; higher butchery yield'],
    [75, 'Dangerous megafauna & extinct-beast trophies'], [99, 'Master tracker & butcher'],
  ],
  farming: [
    [1, 'Hoe & grain; seed-saving'], [10, 'Legumes & crop rotation (fix nitrogen)'],
    [25, 'Fibre crops, orchards & irrigation'], [50, 'Husbandry: fowl → sheep → goat → cattle'],
    [75, 'Selective breeding & managed pasture'],
  ],
  archaeology: [
    [1, 'Survey & test-pits: potsherds, coins, bone tools'], [15, 'Stratigraphic excavation'],
    [30, 'Bog & permafrost organics; megafauna fossils'], [60, 'Lost-age assemblages; amber & articulated skeletons'],
  ],
  smithing: [
    [1, 'Fire clay & anneal native copper'], [10, 'Charcoal furnace: smelt copper & tin'],
    [15, 'Bronze alloying & casting'], [25, 'Bloomery iron; forge-welding'], [40, 'Steel (carburise & temper)'],
    [60, 'Damascus pattern-welding'], [70, 'Meteoric iron — masterwork forging'],
  ],
  woodworking: [
    [1, 'Riven planks, hafts & hardened points'], [10, 'Joinery (mortise & tenon)'],
    [20, 'Sawn boards, barrels & oak shields'], [35, 'Self bows (ash/hickory)'], [55, 'Carved walnut gunstocks'],
    [65, 'Yew longbows'], [85, 'Lignum-vitae masterwork & composite bows'],
  ],
  crafting: [
    [1, 'Polish rock crystal & amethyst; bone & shell'], [10, 'Silver & pewter; cut garnet (Mohs gate begins)'],
    [25, 'Brass & topaz; assemble the hand cannon'], [35, 'Flintlock & matchlock firearms'],
    [45, 'Gold & electrum; emerald & sapphire'], [60, 'Ruby'], [75, 'Diamond — the master cut; the blunderbuss'],
  ],
  cooking: [
    [1, 'Roast & sun-dry / salt-cure'], [10, 'Smoking & clay-pot boiling'], [20, 'Fermentation — cheese, pickles, ale'],
    [35, 'Oven baking & nixtamalisation of maize'], [50, 'Charcuterie, aged cheese & rations'],
    [70, 'Balanced feasts (full nutrition)'],
  ],
  tailoring: [
    [1, 'Rawhide, sinew thread & bone needle'], [10, 'Brain-tanned leather; spun flax & wool'],
    [20, 'Loom weaving; bark-tannin leather'], [35, 'Fitted garments & mordant dyes'],
    [55, 'Layered insulation for extreme climates'],
  ],
  alchemy: [
    [1, 'Poultices, infusions, willow-bark & honey dressings'], [10, 'Tinctures, salves & antiseptic washes'],
    [20, 'Alembic still: oils, alcohol & tannins'], [35, 'Gunpowder chemistry (saltpetre/charcoal/sulfur, 75/15/10)'],
    [50, 'Aqua fortis, quicklime, lye & dye mordants'],
  ],
  construction: [
    [1, 'Lean-to, wattle-&-daub & dry-stone'], [10, 'Cob/adobe & timber frame'],
    [20, 'Fired brick & lime mortar'], [35, 'Arches, vaults & keystones'], [50, 'Grand halls & aqueducts'],
  ],
  vitality: [
    [1, '+2 max health per level; carrying power'], [15, 'Thermoregulation & hydration basics'],
    [35, 'Acclimatise to harsh biomes (desert, tundra)'], [60, 'Iron constitution; nutrition mastery'],
    [85, 'Weather the extremes; second wind'],
  ],
  healing: [
    [1, 'Bind wounds, bandages, poultices & splints'], [15, 'Antiseptics, willow-bark analgesia & bone-setting'],
    [30, 'Debridement, cautery & suturing'], [50, 'Field surgery — extract musket balls'],
    [70, 'Master physician: infection & environmental medicine'],
  ],
  athletics: [
    [1, 'Sprint bursts, climbing & treading water'], [25, 'Cliff-scaling, strong swimming & controlled falls'],
    [60, 'Free-climb the snowy peaks'], [90, 'Peak conditioning'],
  ],
  strength: [
    [1, 'Stone-age arms (club, spear, hand-axe)'], [15, 'Copper & bronze blades'], [25, 'Iron sword, mace & war-axe'],
    [40, 'Steel: longsword, warhammer & poleaxe'], [60, 'Damascus & meteoric arms; crushing blows'],
  ],
  defense: [
    [1, 'Gambeson & boiled leather'], [15, 'Hardened leather, bronze helm & oak shield'], [25, 'Riveted iron mail'],
    [40, 'Steel plate & brigandine'], [60, 'Masterwork harness; immovable'],
  ],
  ranged: [
    [1, 'Sling & javelin (stone/lead shot)'], [10, 'Self bows + flint → iron heads'], [30, 'War bows & steel crossbow'],
    [45, 'Yew longbow & hand cannon'], [55, 'Flintlock & matchlock'], [75, 'Blunderbuss; deadeye'],
  ],
  // Fantasy Frontier (shown only when that mode is enabled)
  magic: [[1, 'Available only in the optional Fantasy Frontier']],
  enchanting: [[1, 'Available only in the optional Fantasy Frontier']],
};

// Cumulative XP needed to reach a level (level 1 → 0 XP).
export function xpForLevel(level) {
  if (level <= 1) return 0;
  const n = level - 1;
  return Math.floor(60 * Math.pow(n, 2.4) + 80 * n);
}

export function levelForXp(xp) {
  let lvl = 1;
  while (lvl < 99 && xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}

export class Skills {
  constructor() {
    this.xp = {};
    for (const k of Object.keys(SKILL_DEFS)) this.xp[k] = 0;
  }

  level(skill) { return levelForXp(this.xp[skill] ?? 0); }

  progress(skill) {
    const xp = this.xp[skill] ?? 0;
    const lvl = levelForXp(xp);
    if (lvl >= 99) return 1;
    const cur = xpForLevel(lvl), next = xpForLevel(lvl + 1);
    return (xp - cur) / (next - cur);
  }

  addXp(skill, amount) {
    if (!(skill in this.xp) || amount <= 0) return;
    const before = this.level(skill);
    this.xp[skill] += Math.round(amount);
    const after = this.level(skill);
    emit('xpGained', { skill, amount: Math.round(amount), level: after });
    if (after > before) emit('levelUp', { skill, level: after });
  }

  totalLevel() {
    return Object.keys(SKILL_DEFS).reduce((s, k) => s + (SKILL_DEFS[k].frontier ? 0 : this.level(k)), 0);
  }

  // Gathering speed multiplier: higher level → faster, floor at 45% of base time.
  gatherTimeMult(skill) {
    return Math.max(0.45, 1 - (this.level(skill) - 1) * 0.006);
  }

  critChance(skill) {
    return 0.04 + this.level(skill) * 0.0016; // critical gathers give double yield
  }

  serialize() { return { ...this.xp }; }
  deserialize(d) { for (const k of Object.keys(this.xp)) this.xp[k] = d?.[k] ?? 0; }
}
