// The realistic material spine (v3) — the single source of truth for the
// content restart. Every metal, wood, gem, and the black-powder firearms chain,
// ordered by real-world rarity / hardness / smelting difficulty. Blocks, items,
// nodes, recipes, worldgen, and the texture manifest are all generated from and
// validated against this file. See docs/GAME_PLAN.md ("Realistic Spine v3").
//
// Era: medieval → renaissance / black-powder. Swords, bows AND flintlocks
// coexist. No modern-industrial metals (no titanium/tungsten).
//
// role: tool = weapons/armor/tools · alloy = feeds an alloy, not used raw ·
//       fuel · ammo · jewelry = Crafting-only (never weapons/armor).
// tier: progression rung within its family. mineLevel/smithLevel/woodLevel =
//       skill level to gather/smelt/craft.

export const METALS = [
  // ---- tool metals: the forgeable ladder (real metallurgy order) ----
  { id: 'copper',        label: 'Copper',         role: 'tool',    tier: 1, mineLevel: 1,               smelt: ['copper_ore'],            note: 'soft, often native — the first metal' },
  { id: 'tin',           label: 'Tin',            role: 'alloy',   tier: 2, mineLevel: 10,              smelt: ['tin_ore'],               note: 'scarcer partner metal for bronze' },
  { id: 'bronze',        label: 'Bronze',         role: 'tool',    tier: 3,              smithLevel: 15, alloy: ['copper_bar', 'tin_bar'], note: 'copper+tin — the Bronze Age' },
  { id: 'iron',          label: 'Iron',           role: 'tool',    tier: 4, mineLevel: 25,              smelt: ['iron_ore', 'coal'],      note: 'abundant ore, needs a hot furnace' },
  { id: 'steel',         label: 'Steel',          role: 'tool',    tier: 5,              smithLevel: 40, alloy: ['iron_bar', 'coal'],      note: 'iron + carbon — the workhorse' },
  { id: 'damascus',      label: 'Damascus Steel', role: 'tool',    tier: 6,              smithLevel: 60, alloy: ['steel_bar', 'steel_bar'], note: 'folded, refined — historically prized blades' },
  { id: 'meteoric',      label: 'Meteoric Iron',  role: 'tool',    tier: 7, mineLevel: 70, rare: true, smelt: ['meteoric_ore'],          note: 'nickel-iron from the sky — the rare cap' },

  // ---- support ----
  { id: 'coal',          label: 'Coal',           role: 'fuel',    tier: 0, mineLevel: 15,              smelt: null,                      note: 'forge & furnace fuel' },
  { id: 'lead',          label: 'Lead',           role: 'ammo',    tier: 0, mineLevel: 20,              smelt: ['lead_ore'],              note: 'cast into bullets & shot' },
  { id: 'zinc',          label: 'Zinc',           role: 'alloy',   tier: 0, mineLevel: 30,              smelt: ['zinc_ore'],              note: 'alloy metal for brass' },

  // ---- jewelry / precious: Crafting-only, never tools or weapons ----
  { id: 'silver',        label: 'Silver',         role: 'jewelry', tier: 0, mineLevel: 20,              smelt: ['silver_ore'],            note: 'precious — jewelry & coin' },
  { id: 'gold',          label: 'Gold',           role: 'jewelry', tier: 0, mineLevel: 40,              smelt: ['gold_ore'],              note: 'precious — jewelry & coin' },
  { id: 'platinum',      label: 'Platinum',       role: 'jewelry', tier: 0, mineLevel: 55, rare: true, smelt: ['platinum_ore'],          note: 'rarer than gold' },
  { id: 'brass',         label: 'Brass',          role: 'jewelry', tier: 0,              smithLevel: 35, alloy: ['copper_bar', 'zinc_bar'], note: 'copper+zinc — warm gold-toned fittings' },
  { id: 'electrum',      label: 'Electrum',       role: 'jewelry', tier: 0,              smithLevel: 45, alloy: ['gold_bar', 'silver_bar'], note: 'natural gold-silver alloy' },
  { id: 'pewter',        label: 'Pewter',         role: 'jewelry', tier: 0,              smithLevel: 25, alloy: ['tin_bar', 'copper_bar'], note: 'tin-based — tableware & trinkets' },
];

// Real woods, soft/common → dense/rare, each with its real-world job.
export const WOODS = [
  { id: 'pine',         label: 'Pine',         tier: 1,  woodLevel: 1,  use: 'basic planks & handles' },
  { id: 'cedar',        label: 'Cedar',        tier: 2,  woodLevel: 10, use: 'rot-resistant, aromatic' },
  { id: 'birch',        label: 'Birch',        tier: 3,  woodLevel: 20, use: 'light common hardwood' },
  { id: 'oak',          label: 'Oak',          tier: 4,  woodLevel: 30, use: 'strong structures & shields' },
  { id: 'ash',          label: 'Ash',          tier: 5,  woodLevel: 35, use: 'tool handles & spear shafts' },
  { id: 'hickory',      label: 'Hickory',      tier: 6,  woodLevel: 45, use: 'toughest handles & bow staves' },
  { id: 'maple',        label: 'Maple',        tier: 7,  woodLevel: 50, use: 'hard, fine-grained' },
  { id: 'walnut',       label: 'Walnut',       tier: 8,  woodLevel: 55, use: 'gunstocks & fine furniture' },
  { id: 'yew',          label: 'Yew',          tier: 9,  woodLevel: 65, use: 'longbows' },
  { id: 'teak',         label: 'Teak',         tier: 10, woodLevel: 70, use: 'weatherproof gear' },
  { id: 'ebony',        label: 'Ebony',        tier: 11, woodLevel: 75, use: 'exotic dense, decorative' },
  { id: 'lignum_vitae', label: 'Lignum Vitae', tier: 12, woodLevel: 85, rare: true, use: 'densest wood — masterwork' },
];

// Real gems — dropped RANDOMLY while mining any rock (never their own node),
// cut by Crafting into jewelry. Ordered by real hardness / rarity.
export const GEMS = [
  { id: 'quartz',   label: 'Rock Crystal', tier: 1, cutLevel: 1,  note: 'clear, common' },
  { id: 'amethyst', label: 'Amethyst',     tier: 1, cutLevel: 5,  note: 'purple quartz' },
  { id: 'garnet',   label: 'Garnet',       tier: 2, cutLevel: 20 },
  { id: 'topaz',    label: 'Topaz',        tier: 2, cutLevel: 30 },
  { id: 'emerald',  label: 'Emerald',      tier: 3, cutLevel: 45 },
  { id: 'sapphire', label: 'Sapphire',     tier: 3, cutLevel: 50 },
  { id: 'ruby',     label: 'Ruby',         tier: 4, cutLevel: 60 },
  { id: 'diamond',  label: 'Diamond',      tier: 5, cutLevel: 75, rare: true, note: 'hardest — rarest' },
];

// Black-powder firearms — a late-game Ranged branch and a genuine differentiator.
// OFF by default in Education mode / for schools (parent-teacher lockable).
export const FIREARMS = {
  educationDefaultOff: true,
  balance: 'high damage, slow reload, loud (a shot pulls nearby mobs) — so bows stay relevant',

  // gunpowder = the real recipe
  powder: { id: 'gunpowder', components: ['saltpeter', 'charcoal', 'sulfur'] },
  reagents: [
    { id: 'saltpeter', label: 'Saltpeter', source: 'mine deposits / forage nitre' },
    { id: 'sulfur',    label: 'Sulfur',    source: 'mine near volcanic ground' },
    { id: 'charcoal',  label: 'Charcoal',  source: 'burn logs in a furnace' },
  ],
  ammo: [
    { id: 'lead_ball', label: 'Lead Ball', from: 'lead_bar', for: ['hand_cannon', 'flintlock_pistol', 'matchlock_musket'] },
    { id: 'lead_shot', label: 'Lead Shot', from: 'lead_bar', for: ['blunderbuss'] },
  ],
  // each gun = a metal barrel (Smithing) + a wood stock (Fletching) + powder + ball
  guns: [
    { id: 'hand_cannon',      label: 'Hand Cannon',      tier: 1, rangedLevel: 40, barrel: 'iron',     stock: 'oak',    ammo: 'lead_ball', note: 'crude, early' },
    { id: 'flintlock_pistol', label: 'Flintlock Pistol', tier: 2, rangedLevel: 55, barrel: 'steel',    stock: 'walnut', ammo: 'lead_ball', note: 'quick sidearm' },
    { id: 'matchlock_musket', label: 'Matchlock Musket', tier: 3, rangedLevel: 65, barrel: 'steel',    stock: 'walnut', ammo: 'lead_ball', note: 'long-range, slow reload' },
    { id: 'blunderbuss',      label: 'Blunderbuss',      tier: 4, rangedLevel: 75, barrel: 'damascus', stock: 'walnut', ammo: 'lead_shot', note: 'close-range shot spread' },
  ],
};

// ---- convenience selectors ----
export const metal = (id) => METALS.find((m) => m.id === id);
export const toolMetals = () => METALS.filter((m) => m.role === 'tool');
export const jewelryMetals = () => METALS.filter((m) => m.role === 'jewelry');
export const wood = (id) => WOODS.find((w) => w.id === id);
export const gem = (id) => GEMS.find((g) => g.id === id);
