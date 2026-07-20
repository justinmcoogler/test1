// 21 independent skills, levels 1–99, XP through use, milestone unlock tables.
import { emit } from '../core/events.js';

export const SKILL_DEFS = {
  // Gathering
  mining:      { label: 'Mining', group: 'Gathering', desc: 'Break ore veins and stone for metals and minerals.' },
  woodcutting: { label: 'Woodcutting', group: 'Gathering', desc: 'Fell trees for timber and rare saps.' },
  fishing:     { label: 'Fishing', group: 'Gathering', desc: 'Catch fish from spots in ponds, rivers and coasts.' },
  foraging:    { label: 'Foraging', group: 'Gathering', desc: 'Harvest herbs, berries and wild plants.' },
  hunting:     { label: 'Hunting', group: 'Gathering', desc: 'Track and bring down wild creatures for hide and meat.' },
  farming:     { label: 'Farming', group: 'Gathering', desc: 'Sow, tend and harvest crops in tilled plots.' },
  archaeology: { label: 'Archaeology', group: 'Gathering', desc: 'Excavate dig sites for relics of the old world.' },
  // Processing & crafting
  smithing:     { label: 'Smithing', group: 'Crafting', desc: 'Smelt bars and forge metal tools, weapons and armor.' },
  woodworking:  { label: 'Woodworking', group: 'Crafting', desc: 'Shape timber into planks, hafts, bows and furniture.' },
  cooking:      { label: 'Cooking', group: 'Crafting', desc: 'Turn raw food into hearty meals.' },
  tailoring:    { label: 'Tailoring', group: 'Crafting', desc: 'Weave cloth and stitch hides into armor.' },
  alchemy:      { label: 'Alchemy', group: 'Crafting', desc: 'Brew tonics and salves from herbs.' },
  construction: { label: 'Construction', group: 'Crafting', desc: 'Build structures, stations and settlements.' },
  enchanting:   { label: 'Enchanting', group: 'Crafting', desc: 'Bind crystal energies into charms and gear.' },
  // Combat
  vitality: { label: 'Vitality', group: 'Combat', desc: 'Raises maximum health.' },
  strength: { label: 'Strength', group: 'Combat', desc: 'Melee damage and carrying power.' },
  defense:  { label: 'Defense', group: 'Combat', desc: 'Reduces damage taken; improves guarding.' },
  ranged:   { label: 'Ranged', group: 'Combat', desc: 'Accuracy and damage with bows and thrown weapons.' },
  magic:    { label: 'Magic', group: 'Combat', desc: 'Spell damage, mana and elemental arts.' },
  healing:  { label: 'Healing', group: 'Combat', desc: 'Restorative arts, in and out of battle.' },
  tactics:  { label: 'Tactics', group: 'Combat', desc: 'Initiative, inspection and battlefield cunning.' },
};

// Milestone unlock tables (display + real gates live in recipes/nodes/abilities)
export const SKILL_UNLOCKS = {
  mining: [
    [1, 'Copper & tin veins, clay deposits'], [10, 'Iron veins'], [15, 'Faster swing: -10% gather time'],
    [25, 'Silverveins (needs bronze pick or better)'], [40, 'Emberstone seams (needs iron pick)'],
    [50, 'Veilcrystal growths'], [70, 'Critical strikes yield double ore'], [90, 'Master miner: rare gem chance doubled'],
  ],
  woodcutting: [
    [1, 'Fernwood trees'], [10, 'Silverbark trees'], [15, '-10% chop time'], [20, 'Emberpine trees'],
    [35, 'Chance of double logs'], [60, 'Ancient groves (rare saps)'], [90, 'Living legend of the forests'],
  ],
  fishing: [
    [1, 'Silverfin in calm waters'], [8, 'Mudwhisker'], [20, 'Duskeel at dusk pools'],
    [30, 'Rare waterlogged caches more common'], [50, 'Deep-water spots'], [90, 'The One That Never Got Away'],
  ],
  foraging: [
    [1, 'Herb patches & tartberry bushes'], [12, 'Duskcap mushrooms'], [25, 'Sunpetal blooms'],
    [40, 'Double harvest chance'], [70, 'Corrupted flora (safely)'],
  ],
  hunting: [
    [1, 'Small game'], [10, 'Boars yield extra hide'], [25, 'Track elite beasts'], [50, 'Trophy drops'],
  ],
  farming: [
    [1, 'Grain plots'], [10, 'Faster crop growth'], [25, 'Golden grain chance up'], [50, 'Exotic seeds'],
  ],
  archaeology: [
    [1, 'Surface dig sites'], [15, 'Relic fragments more common'], [30, 'Dungeon excavations'], [60, 'Lost-age treasures'],
  ],
  smithing: [
    [1, 'Smelt bronze'], [5, 'Bronze tools & weapons'], [10, 'Smelt iron'], [12, 'Iron gear'],
    [25, 'Smelt silver'], [40, 'Embersteel'], [70, 'Masterwork forging (+quality)'],
  ],
  woodworking: [
    [1, 'Planks, hafts & benches'], [5, 'Bows'], [15, 'Silverbark recurve'], [30, 'Fine furniture'], [60, 'Living-wood shaping'],
  ],
  cooking: [
    [1, 'Roast fish & meat'], [5, 'Travel biscuits'], [8, 'Smoked mudwhisker'], [12, 'Hearth loaves'],
    [20, 'Seared duskeel'], [40, 'Feast platters'], [70, 'Legendary stews'],
  ],
  tailoring: [
    [1, 'Cord, cloth & hide gear'], [10, 'Woven robes'], [25, 'Reinforced leathers'], [50, 'Spellthread'],
  ],
  alchemy: [
    [1, 'Minor healing tonic'], [5, 'Energy tonic'], [10, 'Antidote'], [15, 'Lesser mana tonic'],
    [30, 'Greater tonics'], [60, 'Transmutation'],
  ],
  construction: [
    [1, 'Walls, benches & stations'], [10, 'Stone masonry'], [25, 'Reinforced builds'], [50, 'Grand halls'],
  ],
  enchanting: [
    [1, 'Simple charms at a runestone altar'], [15, 'Ward talismans'], [30, 'Gear imbuing'], [60, 'Veilbinding'],
  ],
  vitality: [
    [1, '+2 max health per level'], [25, 'Second Wind: survive one killing blow per battle'], [50, 'Iron constitution'],
  ],
  strength: [
    [1, 'Melee damage scaling'], [5, 'Power Strike ability'], [15, 'Cleave ability'], [40, 'Crushing blows'],
  ],
  defense: [
    [1, 'Damage reduction scaling'], [5, 'Guard stance improves'], [20, 'Bulwark: guarding shields allies'], [45, 'Immovable'],
  ],
  ranged: [
    [1, 'Bow accuracy scaling'], [5, 'Aimed Shot ability'], [15, 'Pinning Shot (slows)'], [40, 'Double nock'],
  ],
  magic: [
    [1, 'Emberbolt spell'], [5, 'Frostbind (slows)'], [10, 'Ember Burst (area)'], [30, 'Stormcall'], [60, 'Veilweaving'],
  ],
  healing: [
    [1, 'Mend spell'], [15, 'Rally (heal + bolster)'], [35, 'Cleansing light'], [70, 'Guardian aura'],
  ],
  tactics: [
    [1, 'Inspect enemies for stats & intent'], [10, '+1 initiative die'], [20, 'Flanking bonus'], [40, 'Battle foresight'],
  ],
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
    return Object.keys(SKILL_DEFS).reduce((s, k) => s + this.level(k), 0);
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
