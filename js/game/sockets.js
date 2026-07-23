// Gem sockets: a cut gem set into a weapon grants a power. Bonuses are pure
// weapon stats (atk / acc / crit / spd / range) so they flow straight through
// inventory.weapon() into both combat systems — no combat-code changes needed.
// One socket per weapon; the gem is consumed on socketing, recovered on removal.
export const GEM_SOCKET = {
  ruby: { atk: 4 },                     // raw damage
  garnet: { atk: 2, crit: 3 },          // damage + bite
  diamond: { atk: 3, acc: 2, crit: 4 }, // the all-rounder
  emerald: { crit: 8 },                 // critical strikes
  sapphire: { acc: 5 },                 // accuracy
  topaz: { spd: 1, acc: 2 },            // speed
  amethyst: { crit: 4, range: 1 },      // arcane edge (magic/ranged)
  quartz: { acc: 2 },                   // humble starter
};

export const SOCKETABLE_GEMS = Object.keys(GEM_SOCKET);

export function gemBonus(gemId) { return GEM_SOCKET[gemId] || null; }

// human-readable "+4 atk · +3 crit"
export function socketDesc(gemId) {
  const b = GEM_SOCKET[gemId];
  return b ? Object.entries(b).map(([k, v]) => `+${v} ${k}`).join(' · ') : '';
}
