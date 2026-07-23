// Gem sockets: set a cut gem into a weapon OR a piece of armour/accessory to
// grant a power. Each gem gives a weapon-side bonus (offence — flows through
// inventory.weapon() into combat) and an armour-side bonus (defence/utility —
// flows through inventory.equipStats()). One socket per item; the gem is
// consumed on socketing and recovered on removal.
export const GEM_SOCKET = {
  ruby: { weapon: { atk: 4 }, armor: { hp: 12 } },
  garnet: { weapon: { atk: 2, crit: 3 }, armor: { hp: 8, armor: 1 } },
  diamond: { weapon: { atk: 3, acc: 2, crit: 4 }, armor: { armor: 3, hp: 8 } },
  emerald: { weapon: { crit: 8 }, armor: { evasion: 3 } },
  sapphire: { weapon: { acc: 5 }, armor: { magicResist: 6 } },
  topaz: { weapon: { spd: 1, acc: 2 }, armor: { speed: 1, evasion: 1 } },
  amethyst: { weapon: { crit: 4, range: 1 }, armor: { mana: 12, magic: 2 } },
  quartz: { weapon: { acc: 2 }, armor: { armor: 1 } },
};

export const SOCKETABLE_GEMS = Object.keys(GEM_SOCKET);

// which equippable item types accept a gem
export function socketableType(type) { return type === 'weapon' || type === 'armor' || type === 'accessory'; }

// weapon-side bonus (offence). Kept as gemBonus() for the combat/weapon path.
export function gemBonus(gemId) { return GEM_SOCKET[gemId]?.weapon || null; }
// armour-side bonus (defence/utility) for equipped armour + accessories.
export function gemArmorBonus(gemId) { return GEM_SOCKET[gemId]?.armor || null; }

// human-readable "+4 atk · +3 crit" for the given side ('weapon' | 'armor')
export function socketDesc(gemId, kind = 'weapon') {
  const b = GEM_SOCKET[gemId] && GEM_SOCKET[gemId][kind];
  return b ? Object.entries(b).map(([k, v]) => `+${v} ${k}`).join(' · ') : '';
}
