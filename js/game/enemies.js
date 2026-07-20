// Original creatures: stats, voxel-box models, behaviors, drops.
// EnemyManager runs overworld entities (wander/aggro); combat.js takes over in battle.
import { emit } from '../core/events.js';

// Voxel-box model helper: boxes centered on x, standing on y=0.
const M = (boxes) => boxes;
const box = (x, y, z, w, h, d, color) => ({ x: x - w / 2, y, z: z - d / 2, w, h, d, color });

export const ENEMY_TYPES = {
  practice_dummy: {
    label: 'Practice Dummy', behavior: 'passive', tier: 0,
    hp: 12, atk: 0, acc: 0, evasion: 0, armor: 0, speed: 1, moveRange: 0,
    styles: [], element: null, weak: [], resist: [],
    xp: 8, drops: [], respawn: 20, aggroRange: 0,
    desc: 'Straw, sackcloth and patience. It has seen better days.',
    recommend: 'Any weapon. Swing freely.',
    model: M([
      box(0, 0, 0, 0.25, 0.9, 0.25, [0.55, 0.42, 0.25]),
      box(0, 0.9, 0, 0.6, 0.7, 0.4, [0.78, 0.68, 0.45]),
      box(0, 1.6, 0, 0.4, 0.4, 0.4, [0.82, 0.72, 0.5]),
      box(0, 1.25, 0, 1.0, 0.14, 0.3, [0.6, 0.48, 0.3]),
    ]),
  },
  mudback_boar: {
    label: 'Mudback Boar', behavior: 'defensive', tier: 0,
    hp: 18, atk: 4, acc: 55, evasion: 8, armor: 2, speed: 4, moveRange: 3,
    abilities: ['tusk_charge'], element: null, weak: [], resist: [],
    xp: 22, huntXp: 18, respawn: 90, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 2], chance: 1 },
      { item: 'boarhide', qty: [1, 2], chance: 0.9 },
      { item: 'sinew', qty: [1, 1], chance: 0.6 },
    ],
    desc: 'A stubborn tusked grazer with a back plated in dried mud.',
    recommend: 'Melee works; watch for its charge.',
    model: M([
      box(0, 0.25, 0, 0.7, 0.55, 1.1, [0.42, 0.3, 0.2]),
      box(0, 0.62, 0, 0.6, 0.22, 0.9, [0.32, 0.24, 0.17]),
      box(0, 0.35, 0.62, 0.45, 0.4, 0.35, [0.48, 0.35, 0.24]),
      box(-0.14, 0.3, 0.82, 0.07, 0.14, 0.12, [0.9, 0.88, 0.8]),
      box(0.14, 0.3, 0.82, 0.07, 0.14, 0.12, [0.9, 0.88, 0.8]),
      box(-0.22, 0, 0.35, 0.16, 0.28, 0.16, [0.35, 0.26, 0.18]),
      box(0.22, 0, 0.35, 0.16, 0.28, 0.16, [0.35, 0.26, 0.18]),
      box(-0.22, 0, -0.35, 0.16, 0.28, 0.16, [0.35, 0.26, 0.18]),
      box(0.22, 0, -0.35, 0.16, 0.28, 0.16, [0.35, 0.26, 0.18]),
    ]),
  },
  thicket_sprite: {
    label: 'Thicket Sprite', behavior: 'defensive', tier: 0,
    hp: 10, atk: 3, acc: 60, evasion: 20, armor: 0, speed: 6, moveRange: 4,
    abilities: ['sting_spark'], element: 'nature', weak: ['fire'], resist: ['nature'],
    xp: 18, respawn: 80, aggroRange: 0,
    drops: [
      { item: 'plant_fibre', qty: [1, 3], chance: 1 },
      { item: 'amber_resin', qty: [1, 1], chance: 0.25 },
      { item: 'fernwood_seed', qty: [1, 1], chance: 0.2 },
    ],
    desc: 'A knot of living twigs with a will-o-glow heart.',
    recommend: 'Hard to hit — fire or patience.',
    model: M([
      box(0, 0.2, 0, 0.4, 0.5, 0.4, [0.25, 0.45, 0.2]),
      box(0, 0.7, 0, 0.3, 0.3, 0.3, [0.5, 0.8, 0.35]),
      box(0, 0.42, 0, 0.14, 0.14, 0.14, [1, 0.95, 0.5]),
      box(-0.3, 0.45, 0, 0.2, 0.08, 0.08, [0.35, 0.28, 0.18]),
      box(0.3, 0.45, 0, 0.2, 0.08, 0.08, [0.35, 0.28, 0.18]),
    ]),
  },
  gloomrat: {
    label: 'Gloomrat', behavior: 'aggressive', tier: 0,
    hp: 12, atk: 4, acc: 62, evasion: 12, armor: 0, speed: 7, moveRange: 4,
    abilities: ['gnaw'], element: null, weak: [], resist: [],
    xp: 20, respawn: 70, aggroRange: 5,
    drops: [
      { item: 'sinew', qty: [1, 2], chance: 0.8 },
      { item: 'old_coin', qty: [1, 2], chance: 0.3 },
    ],
    desc: 'An oversized rat with lightless eyes, at home in the dark.',
    recommend: 'Fragile — strike first.',
    model: M([
      box(0, 0.1, 0, 0.45, 0.35, 0.8, [0.3, 0.28, 0.33]),
      box(0, 0.2, 0.45, 0.3, 0.25, 0.3, [0.36, 0.33, 0.38]),
      box(0, 0.28, 0.62, 0.1, 0.08, 0.12, [0.8, 0.5, 0.5]),
      box(0, 0.18, -0.55, 0.08, 0.08, 0.5, [0.5, 0.4, 0.42]),
    ]),
  },
  root_creeper: {
    label: 'Root Creeper', behavior: 'aggressive', tier: 0,
    hp: 16, atk: 5, acc: 58, evasion: 8, armor: 1, speed: 3, moveRange: 3,
    abilities: ['toxin_lash'], element: 'nature', weak: ['fire'], resist: ['nature'],
    xp: 26, respawn: 100, aggroRange: 5,
    drops: [
      { item: 'springroot', qty: [1, 2], chance: 0.9 },
      { item: 'amber_resin', qty: [1, 1], chance: 0.35 },
    ],
    desc: 'A crawling tangle of animate root, dripping green venom.',
    recommend: 'Cure or outlast its poison.',
    model: M([
      box(0, 0, 0, 0.8, 0.3, 0.8, [0.32, 0.26, 0.18]),
      box(0, 0.3, 0, 0.5, 0.4, 0.5, [0.4, 0.32, 0.2]),
      box(0, 0.7, 0, 0.3, 0.3, 0.3, [0.3, 0.5, 0.2]),
      box(-0.45, 0.1, 0.3, 0.2, 0.15, 0.4, [0.36, 0.3, 0.2]),
      box(0.45, 0.1, -0.3, 0.2, 0.15, 0.4, [0.36, 0.3, 0.2]),
    ]),
  },
  moss_lurker: {
    label: 'Moss Lurker', behavior: 'defensive', tier: 1,
    hp: 34, atk: 6, acc: 55, evasion: 4, armor: 5, speed: 2, moveRange: 2,
    abilities: ['boulder_swat'], element: 'nature', weak: ['fire'], resist: ['nature'],
    xp: 45, respawn: 160, aggroRange: 0,
    drops: [
      { item: 'plant_fibre', qty: [2, 4], chance: 1 },
      { item: 'rough_gem', qty: [1, 1], chance: 0.2 },
    ],
    desc: 'A boulder that breathes, wearing a coat of centuries-old moss.',
    recommend: 'Bring armor-piercing force or magic.',
    model: M([
      box(0, 0, 0, 1.1, 0.9, 1.0, [0.35, 0.42, 0.3]),
      box(0, 0.9, 0, 0.8, 0.4, 0.7, [0.3, 0.48, 0.26]),
      box(-0.3, 0.65, 0.45, 0.12, 0.12, 0.12, [0.9, 0.9, 0.6]),
      box(0.3, 0.65, 0.45, 0.12, 0.12, 0.12, [0.9, 0.9, 0.6]),
    ]),
  },
  marsh_wisp: {
    label: 'Marsh Wisp', behavior: 'aggressive', tier: 1,
    hp: 14, atk: 6, acc: 68, evasion: 22, armor: 0, speed: 8, moveRange: 4,
    abilities: ['fen_bolt'], ranged: true, range: 4, element: 'water', weak: ['fire'], resist: ['water'],
    xp: 40, respawn: 120, aggroRange: 6,
    drops: [{ item: 'sunpetal', qty: [1, 1], chance: 0.3 }, { item: 'old_coin', qty: [1, 3], chance: 0.5 }],
    desc: 'A pale flame that leads travellers astray, then bites.',
    recommend: 'Close the distance fast.',
    model: M([
      box(0, 0.5, 0, 0.35, 0.5, 0.35, [0.6, 0.85, 0.9]),
      box(0, 1.0, 0, 0.2, 0.25, 0.2, [0.8, 0.95, 1]),
    ]),
  },
  bog_shambler: {
    label: 'Bog Shambler', behavior: 'aggressive', tier: 1,
    hp: 42, atk: 8, acc: 58, evasion: 4, armor: 4, speed: 3, moveRange: 2,
    abilities: ['mire_grip'], element: 'water', weak: ['fire'], resist: ['water', 'nature'],
    xp: 60, respawn: 180, aggroRange: 5,
    drops: [{ item: 'clay_lump', qty: [2, 4], chance: 1 }, { item: 'duskcap', qty: [1, 2], chance: 0.5 }],
    desc: 'Wet earth given hunger. It remembers everyone it has swallowed.',
    recommend: 'Keep moving; it punishes the slow.',
    model: M([
      box(0, 0, 0, 1.0, 1.2, 0.8, [0.3, 0.28, 0.2]),
      box(0, 1.2, 0, 0.7, 0.5, 0.6, [0.34, 0.3, 0.22]),
      box(-0.55, 0.6, 0, 0.3, 0.7, 0.3, [0.28, 0.26, 0.18]),
      box(0.55, 0.6, 0, 0.3, 0.7, 0.3, [0.28, 0.26, 0.18]),
    ]),
  },
  craghorn_ram: {
    label: 'Craghorn Ram', behavior: 'defensive', tier: 1,
    hp: 30, atk: 9, acc: 62, evasion: 10, armor: 3, speed: 6, moveRange: 4,
    abilities: ['skull_rush'], element: null, weak: [], resist: [],
    xp: 55, huntXp: 40, respawn: 150, aggroRange: 0,
    drops: [{ item: 'boarhide', qty: [1, 2], chance: 0.8 }, { item: 'sinew', qty: [1, 2], chance: 0.8 }],
    desc: 'Sure-footed and furious, with horns like coiled granite.',
    recommend: 'Never fight it near a ledge.',
    model: M([
      box(0, 0.35, 0, 0.7, 0.6, 1.1, [0.72, 0.68, 0.6]),
      box(0, 0.7, 0.55, 0.45, 0.4, 0.4, [0.65, 0.6, 0.52]),
      box(-0.25, 0.95, 0.55, 0.15, 0.25, 0.15, [0.4, 0.36, 0.3]),
      box(0.25, 0.95, 0.55, 0.15, 0.25, 0.15, [0.4, 0.36, 0.3]),
      box(-0.22, 0, 0.35, 0.15, 0.35, 0.15, [0.5, 0.46, 0.4]),
      box(0.22, 0, 0.35, 0.15, 0.35, 0.15, [0.5, 0.46, 0.4]),
      box(-0.22, 0, -0.35, 0.15, 0.35, 0.15, [0.5, 0.46, 0.4]),
      box(0.22, 0, -0.35, 0.15, 0.35, 0.15, [0.5, 0.46, 0.4]),
    ]),
  },
  stone_pecker: {
    label: 'Stonepecker', behavior: 'aggressive', tier: 1,
    hp: 16, atk: 6, acc: 70, evasion: 18, armor: 1, speed: 9, moveRange: 5,
    abilities: ['shard_spit'], ranged: true, range: 4, element: null, weak: [], resist: [],
    xp: 42, huntXp: 30, respawn: 120, aggroRange: 6,
    drops: [{ item: 'rough_stone', qty: [1, 2], chance: 1 }, { item: 'rough_gem', qty: [1, 1], chance: 0.15 }],
    desc: 'A gray crag-bird that spits gravel with unpleasant accuracy.',
    recommend: 'Take cover between volleys.',
    model: M([
      box(0, 0.25, 0, 0.4, 0.4, 0.55, [0.55, 0.55, 0.58]),
      box(0, 0.6, 0.25, 0.25, 0.25, 0.3, [0.6, 0.6, 0.64]),
      box(0, 0.62, 0.48, 0.08, 0.08, 0.2, [0.85, 0.7, 0.3]),
      box(-0.28, 0.35, 0, 0.12, 0.3, 0.4, [0.48, 0.48, 0.52]),
      box(0.28, 0.35, 0, 0.12, 0.3, 0.4, [0.48, 0.48, 0.52]),
    ]),
  },
  dune_stalker: {
    label: 'Dune Stalker', behavior: 'aggressive', tier: 2,
    hp: 38, atk: 12, acc: 68, evasion: 18, armor: 3, speed: 9, moveRange: 5,
    abilities: ['sand_slash'], element: 'fire', weak: ['water'], resist: ['fire'],
    xp: 90, huntXp: 60, respawn: 200, aggroRange: 7,
    drops: [{ item: 'cured_hide', qty: [1, 2], chance: 0.7 }, { item: 'flame_opal', qty: [1, 1], chance: 0.1 }],
    desc: 'A lean sand-cat that hunts in the shimmer of noon heat.',
    recommend: 'It strikes first. Be ready to heal.',
    model: M([
      box(0, 0.35, 0, 0.55, 0.5, 1.2, [0.8, 0.68, 0.42]),
      box(0, 0.6, 0.6, 0.4, 0.35, 0.4, [0.84, 0.72, 0.46]),
      box(0, 0.18, -0.7, 0.1, 0.1, 0.5, [0.7, 0.6, 0.38]),
      box(-0.2, 0, 0.4, 0.14, 0.35, 0.14, [0.72, 0.6, 0.38]),
      box(0.2, 0, 0.4, 0.14, 0.35, 0.14, [0.72, 0.6, 0.38]),
      box(-0.2, 0, -0.4, 0.14, 0.35, 0.14, [0.72, 0.6, 0.38]),
      box(0.2, 0, -0.4, 0.14, 0.35, 0.14, [0.72, 0.6, 0.38]),
    ]),
  },
  sunscale_serpent: {
    label: 'Sunscale Serpent', behavior: 'aggressive', tier: 2,
    hp: 30, atk: 10, acc: 72, evasion: 20, armor: 2, speed: 8, moveRange: 4,
    abilities: ['venom_fang'], element: 'fire', weak: ['water'], resist: ['fire'],
    xp: 85, respawn: 200, aggroRange: 6,
    drops: [{ item: 'sinew', qty: [2, 3], chance: 1 }, { item: 'flame_opal', qty: [1, 1], chance: 0.12 }],
    desc: 'Its scales drink the sun and pay it back with venom.',
    recommend: 'Carry antidotes.',
    model: M([
      box(0, 0.1, 0, 0.35, 0.3, 1.4, [0.85, 0.6, 0.25]),
      box(0, 0.35, 0.7, 0.3, 0.3, 0.35, [0.9, 0.65, 0.28]),
      box(0, 0.1, -0.85, 0.2, 0.2, 0.4, [0.8, 0.55, 0.22]),
    ]),
  },
  frostmaw_wolf: {
    label: 'Frostmaw Wolf', behavior: 'aggressive', tier: 2,
    hp: 40, atk: 11, acc: 66, evasion: 14, armor: 2, speed: 8, moveRange: 5,
    abilities: ['chill_bite'], element: 'ice', weak: ['fire'], resist: ['ice'],
    xp: 95, huntXp: 70, respawn: 200, aggroRange: 7,
    drops: [{ item: 'cured_hide', qty: [1, 2], chance: 0.8 }, { item: 'sinew', qty: [2, 3], chance: 0.9 }],
    desc: 'Breath like a blizzard, patience like winter.',
    recommend: 'Its bite slows you — kill it before the pack arrives.',
    model: M([
      box(0, 0.35, 0, 0.5, 0.5, 1.1, [0.85, 0.88, 0.92]),
      box(0, 0.6, 0.55, 0.35, 0.35, 0.45, [0.9, 0.92, 0.96]),
      box(0, 0.35, -0.65, 0.12, 0.12, 0.4, [0.8, 0.84, 0.9]),
      box(-0.18, 0, 0.35, 0.13, 0.35, 0.13, [0.75, 0.78, 0.85]),
      box(0.18, 0, 0.35, 0.13, 0.35, 0.13, [0.75, 0.78, 0.85]),
      box(-0.18, 0, -0.35, 0.13, 0.35, 0.13, [0.75, 0.78, 0.85]),
      box(0.18, 0, -0.35, 0.13, 0.35, 0.13, [0.75, 0.78, 0.85]),
    ]),
  },
  rime_shade: {
    label: 'Rime Shade', behavior: 'aggressive', tier: 2,
    hp: 26, atk: 12, acc: 70, evasion: 24, armor: 0, speed: 7, moveRange: 4,
    abilities: ['glacial_lance'], ranged: true, range: 5, element: 'ice', weak: ['fire'], resist: ['ice'],
    xp: 100, respawn: 220, aggroRange: 7,
    drops: [{ item: 'veilcrystal', qty: [1, 1], chance: 0.15 }, { item: 'old_coin', qty: [2, 4], chance: 0.6 }],
    desc: 'A hollow silhouette of frozen breath and old grief.',
    recommend: 'Magic resistance, or a very fast blade.',
    model: M([
      box(0, 0.3, 0, 0.5, 1.2, 0.3, [0.7, 0.8, 0.95]),
      box(0, 1.5, 0, 0.35, 0.35, 0.3, [0.8, 0.88, 1]),
    ]),
  },
  cinder_imp: {
    label: 'Cinder Imp', behavior: 'aggressive', tier: 3,
    hp: 34, atk: 14, acc: 70, evasion: 20, armor: 2, speed: 9, moveRange: 5,
    abilities: ['ember_fling'], ranged: true, range: 4, element: 'fire', weak: ['water', 'ice'], resist: ['fire'],
    xp: 140, respawn: 240, aggroRange: 7,
    drops: [{ item: 'emberstone_shard', qty: [1, 2], chance: 0.6 }, { item: 'flame_opal', qty: [1, 1], chance: 0.2 }],
    desc: 'It giggles as it burns things. Mostly other things.',
    recommend: 'Douse it before it multiplies its mischief.',
    model: M([
      box(0, 0, 0, 0.4, 0.6, 0.35, [0.5, 0.2, 0.15]),
      box(0, 0.6, 0, 0.35, 0.3, 0.3, [0.65, 0.25, 0.15]),
      box(-0.12, 0.9, 0, 0.08, 0.2, 0.08, [0.9, 0.5, 0.2]),
      box(0.12, 0.9, 0, 0.08, 0.2, 0.08, [0.9, 0.5, 0.2]),
    ]),
  },
  magma_hulk: {
    label: 'Magma Hulk', behavior: 'aggressive', tier: 3, elite: true,
    hp: 90, atk: 18, acc: 60, evasion: 2, armor: 8, speed: 3, moveRange: 2,
    abilities: ['molten_smash'], element: 'fire', weak: ['water', 'ice'], resist: ['fire'],
    xp: 300, respawn: 400, aggroRange: 6,
    drops: [{ item: 'emberstone_shard', qty: [2, 4], chance: 1 }, { item: 'flame_opal', qty: [1, 2], chance: 0.5 }],
    desc: 'A walking furnace with a temper to match.',
    recommend: 'Elite. Bring embersteel and a plan.',
    model: M([
      box(0, 0, 0, 1.2, 1.4, 0.9, [0.35, 0.18, 0.14]),
      box(0, 1.4, 0, 0.8, 0.6, 0.7, [0.4, 0.2, 0.15]),
      box(-0.75, 0.5, 0, 0.4, 1.0, 0.4, [0.3, 0.16, 0.12]),
      box(0.75, 0.5, 0, 0.4, 1.0, 0.4, [0.3, 0.16, 0.12]),
      box(0, 0.9, 0.4, 0.5, 0.3, 0.15, [1, 0.5, 0.1]),
    ]),
  },
  blight_horror: {
    label: 'Blight Horror', behavior: 'aggressive', tier: 3, elite: true,
    hp: 80, atk: 16, acc: 66, evasion: 12, armor: 5, speed: 6, moveRange: 4,
    abilities: ['corrupt_claw'], element: 'shadow', weak: ['nature'], resist: ['shadow'],
    xp: 320, respawn: 400, aggroRange: 7,
    drops: [{ item: 'veilcrystal', qty: [1, 2], chance: 0.5 }, { item: 'relic_fragment', qty: [1, 2], chance: 0.4 }],
    desc: 'What remains when a forest dreams wrong.',
    recommend: 'Elite. Ward talismans strongly advised.',
    model: M([
      box(0, 0, 0, 0.9, 1.3, 0.7, [0.3, 0.2, 0.35]),
      box(0, 1.3, 0, 0.6, 0.5, 0.5, [0.36, 0.24, 0.42]),
      box(-0.6, 0.6, 0, 0.35, 0.9, 0.3, [0.26, 0.17, 0.3]),
      box(0.6, 0.6, 0, 0.35, 0.9, 0.3, [0.26, 0.17, 0.3]),
      box(0, 1.5, 0.28, 0.4, 0.12, 0.1, [0.8, 0.4, 0.9]),
    ]),
  },
  hollow_watcher: {
    label: 'Hollow Watcher', behavior: 'aggressive', tier: 3,
    hp: 40, atk: 15, acc: 74, evasion: 18, armor: 2, speed: 8, moveRange: 4,
    abilities: ['void_gaze'], ranged: true, range: 6, element: 'shadow', weak: ['nature'], resist: ['shadow'],
    xp: 200, respawn: 300, aggroRange: 8,
    drops: [{ item: 'relic_fragment', qty: [1, 1], chance: 0.5 }, { item: 'flawless_veilcrystal', qty: [1, 1], chance: 0.08 }],
    desc: 'An eye where no eye should be, watching what should not be watched.',
    recommend: 'Break line of sight or perish politely.',
    model: M([
      box(0, 0.5, 0, 0.6, 0.6, 0.25, [0.2, 0.16, 0.28]),
      box(0, 0.65, 0.12, 0.3, 0.3, 0.1, [0.85, 0.75, 0.95]),
    ]),
  },
  shell_snapper: {
    label: 'Shell Snapper', behavior: 'defensive', tier: 1,
    hp: 28, atk: 7, acc: 58, evasion: 2, armor: 7, speed: 2, moveRange: 2,
    abilities: ['crunch'], element: 'water', weak: ['nature'], resist: ['water'],
    xp: 50, huntXp: 35, respawn: 150, aggroRange: 0,
    drops: [{ item: 'silverfin', qty: [1, 2], chance: 0.8 }, { item: 'rough_gem', qty: [1, 1], chance: 0.15 }],
    desc: 'A tide-worn shellback with a grip like regret.',
    recommend: 'Its shell shrugs off weak blows.',
    model: M([
      box(0, 0, 0, 0.9, 0.45, 0.9, [0.45, 0.5, 0.45]),
      box(0, 0.45, 0, 0.6, 0.25, 0.6, [0.38, 0.44, 0.4]),
      box(0, 0.1, 0.55, 0.3, 0.25, 0.25, [0.6, 0.62, 0.5]),
    ]),
  },
  rootling: {
    label: 'Rootling', behavior: 'aggressive', tier: 0,
    hp: 8, atk: 3, acc: 55, evasion: 10, armor: 0, speed: 5, moveRange: 3,
    abilities: [], element: 'nature', weak: ['fire'], resist: [],
    xp: 10, respawn: 0, aggroRange: 5, noOverworld: true,
    drops: [{ item: 'springroot', qty: [1, 1], chance: 0.5 }],
    desc: 'A fist-sized knot of angry root.',
    recommend: 'Squash quickly before they pile up.',
    model: M([
      box(0, 0, 0, 0.35, 0.4, 0.35, [0.4, 0.3, 0.2]),
      box(0, 0.4, 0, 0.25, 0.2, 0.25, [0.35, 0.5, 0.25]),
    ]),
  },
  rootbound_golem: {
    label: 'Rootbound Golem', behavior: 'aggressive', tier: 0, boss: true,
    hp: 100, atk: 10, acc: 62, evasion: 2, armor: 4, speed: 4, moveRange: 2,
    abilities: ['root_slam', 'grasping_roots'], element: 'nature', weak: ['fire'], resist: ['nature'],
    phases: [{ at: 0.5, addAtk: 4, summon: ['rootling', 'rootling'], banner: 'The golem groans — roots burst from the floor!' }],
    xp: 500, respawn: 900, aggroRange: 6,
    drops: [
      { item: 'rootbound_heart', qty: [1, 1], chance: 1 },
      { item: 'amber_resin', qty: [2, 4], chance: 1 },
      { item: 'rough_gem', qty: [1, 2], chance: 0.8 },
    ],
    desc: 'The Rootgrave\'s guardian: dungeon stone bound in ancient rootwork, older than Brookhollow itself.',
    recommend: 'Dodge the telegraphed slam. Fire helps. Bring food.',
    model: M([
      box(0, 0, 0, 1.4, 1.6, 1.0, [0.42, 0.4, 0.35]),
      box(0, 1.6, 0, 0.9, 0.7, 0.8, [0.46, 0.44, 0.38]),
      box(-0.9, 0.4, 0, 0.5, 1.4, 0.5, [0.38, 0.36, 0.3]),
      box(0.9, 0.4, 0, 0.5, 1.4, 0.5, [0.38, 0.36, 0.3]),
      box(0, 1.0, 0.5, 0.9, 0.25, 0.15, [0.3, 0.5, 0.25]),
      box(-0.3, 1.85, 0.35, 0.15, 0.15, 0.15, [0.9, 0.8, 0.4]),
      box(0.3, 1.85, 0.35, 0.15, 0.15, 0.15, [0.9, 0.8, 0.4]),
      box(-0.5, 2.1, 0, 0.2, 0.5, 0.2, [0.35, 0.55, 0.28]),
      box(0.5, 2.1, 0, 0.2, 0.5, 0.2, [0.35, 0.55, 0.28]),
    ]),
  },
};

// ---- creature skins ---------------------------------------------------------
// Material tiles tinted by each box's color (Minecraft-skin style), plus a
// face tile on the head box where the creature has one.
const SKINS = {
  practice_dummy: 'skin_straw', mudback_boar: 'skin_hide', thicket_sprite: 'skin_bark',
  gloomrat: 'skin_fur', root_creeper: 'skin_bark', moss_lurker: 'skin_stone',
  marsh_wisp: 'skin_glow', bog_shambler: 'skin_hide', craghorn_ram: 'skin_fur',
  stone_pecker: 'skin_fur', dune_stalker: 'skin_fur', sunscale_serpent: 'skin_scales',
  frostmaw_wolf: 'skin_fur', rime_shade: 'skin_glow', cinder_imp: 'skin_scales',
  magma_hulk: 'skin_stone', blight_horror: 'skin_bark', hollow_watcher: 'skin_glow',
  shell_snapper: 'skin_scales', rootling: 'skin_bark', rootbound_golem: 'skin_stone',
};
const HEAD_BOX = {
  mudback_boar: 2, gloomrat: 1, frostmaw_wolf: 1, craghorn_ram: 1, rootbound_golem: 1,
  dune_stalker: 1, practice_dummy: 2, moss_lurker: 1, bog_shambler: 1, stone_pecker: 1,
  cinder_imp: 1, magma_hulk: 1, blight_horror: 1, rootling: 1,
};
for (const [type, def] of Object.entries(ENEMY_TYPES)) {
  def.skin = SKINS[type] || 'skin_hide';
  if (HEAD_BOX[type] !== undefined && def.model[HEAD_BOX[type]]) {
    def.model[HEAD_BOX[type]].texFront = 'skin_face';
  }
}

// ---- overworld manager -----------------------------------------------------
export class EnemyManager {
  constructor(world) {
    this.world = world;
    this.entities = new Map();   // spawnId → entity
    this.killed = new Map();     // spawnId → respawnAt (world time)
  }

  // sync live entities with loaded chunks
  refresh() {
    const seen = new Set();
    for (const [, chunk] of this.world.chunks) {
      for (const sp of chunk.spawns) {
        seen.add(sp.id);
        if (this.entities.has(sp.id)) continue;
        const killedAt = this.killed.get(sp.id);
        if (killedAt !== undefined && killedAt > this.world.time) continue;
        const def = ENEMY_TYPES[sp.type];
        if (!def || def.noOverworld) continue;
        this.killed.delete(sp.id);
        this.entities.set(sp.id, {
          id: sp.id, type: sp.type, def,
          x: sp.x + 0.5, y: sp.y, z: sp.z + 0.5,
          homeX: sp.x + 0.5, homeZ: sp.z + 0.5,
          yaw: Math.random() * Math.PI * 2,
          hp: def.hp,
          wanderT: Math.random() * 4,
          boss: !!sp.boss,
        });
      }
    }
    for (const id of [...this.entities.keys()]) {
      const e = this.entities.get(id);
      if (!seen.has(id) && !e.transient) this.entities.delete(id);
    }
  }

  update(dt, player, inCombat) {
    for (const e of this.entities.values()) {
      if (e.def.moveRange === 0) continue; // stationary (dummy)
      if (e.rsEngaged) continue;           // classic combat drives these
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        e.wanderT = 2 + Math.random() * 5;
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * 4;
        e.targetX = e.homeX + Math.cos(ang) * dist;
        e.targetZ = e.homeZ + Math.sin(ang) * dist;
      }
      if (e.targetX !== undefined && !inCombat) {
        const dx = e.targetX - e.x, dz = e.targetZ - e.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.2) {
          const sp = 1.1 * dt;
          const nx = e.x + (dx / d) * sp, nz = e.z + (dz / d) * sp;
          const gy = this.world.groundNear(Math.floor(nx), Math.floor(nz), e.y);
          if (gy !== null && Math.abs(gy - e.y) <= 1.5) {
            e.x = nx; e.z = nz; e.y = gy;
            e.yaw = Math.atan2(dx, dz);
            e.movingT = 0.25; // drives walk animations on imported mobs
          } else {
            e.targetX = undefined;
          }
        }
      }
    }
  }

  // nearest aggressive enemy within its aggro range → returns entity or null
  checkAggro(player) {
    for (const e of this.entities.values()) {
      if (e.def.behavior !== 'aggressive' || !e.def.aggroRange) continue;
      const d = Math.hypot(player.x - e.x, player.z - e.z);
      const dy = Math.abs(player.y - e.y);
      if (d < e.def.aggroRange && dy < 3) return e;
    }
    return null;
  }

  // enemies close to an origin point (they join the same battle);
  // same-elevation only, so cave dwellers don't join surface fights
  nearbyGroup(cx, cz, radius = 6, cy = null) {
    const group = [];
    for (const e of this.entities.values()) {
      if (Math.hypot(e.x - cx, e.z - cz) > radius) continue;
      if (cy !== null && Math.abs(e.y - cy) > 3.5) continue;
      group.push(e);
    }
    return group;
  }

  entityAt(x, y, z, maxDist = 1.4) {
    let best = null, bestD = maxDist;
    for (const e of this.entities.values()) {
      const d = Math.hypot(e.x - x, e.z - z) + Math.abs(e.y - y) * 0.5;
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  markKilled(entity) {
    this.entities.delete(entity.id);
    const respawn = entity.def.respawn || 120;
    this.killed.set(entity.id, this.world.time + respawn);
    emit('enemyKilled', { type: entity.type, id: entity.id, boss: entity.boss });
  }

  isKilled(spawnId) {
    const t = this.killed.get(spawnId);
    return t !== undefined && t > this.world.time;
  }

  serialize() {
    const killed = {};
    for (const [id, t] of this.killed) killed[id] = Math.round(t);
    const hp = {};
    for (const e of this.entities.values()) if (e.hp < e.def.hp) hp[e.id] = e.hp;
    return { killed, hp };
  }

  deserialize(d) {
    this.killed.clear();
    for (const [id, t] of Object.entries(d?.killed || {})) this.killed.set(id, t);
    this._savedHp = d?.hp || {};
  }

  applySavedHp() {
    for (const [id, hp] of Object.entries(this._savedHp || {})) {
      const e = this.entities.get(id);
      if (e) e.hp = hp;
    }
    this._savedHp = {};
  }
}
