// Bake the shipping mob roster into js/game/mobconfig-defaults.js.
// The starter set is the farm animals plus the wolf (docs/MOB_BRIEF.md);
// everything else ships inactive but stays in the library.
import { writeFileSync } from 'node:fs';
import { ENEMY_TYPES } from '../js/game/enemies.js';

const KEEP = new Set(['cow', 'pig', 'sheep', 'chicken', 'duck', 'goat', 'horse', 'rabbit', 'wolf']);
const all = Object.keys(ENEMY_TYPES).sort();
const missing = [...KEEP].filter((k) => !all.includes(k));
if (missing.length) { console.error('roster mobs missing from ENEMY_TYPES:', missing); process.exit(1); }

const header = [
  '// Baked mob-config defaults, shipped with the build so every player gets them.',
  '// The starter roster is deliberately small: the eight farm animals plus the',
  '// wolf (see docs/MOB_BRIEF.md). Everything else ships inactive — it stays in',
  '// the library and can be switched back on per-player from the Admin/Debug',
  '// panel, but a new world only holds creatures a player already recognises.',
  '// Local overrides still win over these; "Reset to default" falls back here.',
  '//   { active, rate, biomes: string[]|null, drops: [{item,qty:[min,max],chance}] }',
  'export const MOB_DEFAULTS = {',
].join('\n');

const body = all.map((t) => `  ${JSON.stringify(t)}: { active: ${KEEP.has(t)} },`).join('\n');
writeFileSync('js/game/mobconfig-defaults.js', `${header}\n${body}\n};\n`);
console.log(`baked ${all.length} entries — active: ${all.filter((t) => KEEP.has(t)).join(', ')}`);
