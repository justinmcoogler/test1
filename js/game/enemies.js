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
      box(0, 0.2, 0.45, 0.3, 0.25, 0.3, [0.44, 0.4, 0.46]),
      box(0, 0.28, 0.62, 0.1, 0.08, 0.12, [0.8, 0.5, 0.5]),
      box(-0.1, 0.45, 0.47, 0.09, 0.1, 0.06, [0.42, 0.38, 0.44]), // ears
      box(0.1, 0.45, 0.47, 0.09, 0.1, 0.06, [0.42, 0.38, 0.44]),
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
      box(0, 0.55, 0.7, 0.3, 0.3, 0.35, [0.9, 0.65, 0.28]),   // raised cobra head
      box(0, 0.15, 0.62, 0.22, 0.45, 0.22, [0.88, 0.62, 0.26]), // neck coil
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
      box(0, 0.62, 0.85, 0.16, 0.16, 0.2, [0.78, 0.81, 0.88]),   // snout
      box(-0.12, 0.95, 0.56, 0.1, 0.14, 0.08, [0.8, 0.84, 0.9]), // ears
      box(0.12, 0.95, 0.56, 0.1, 0.14, 0.08, [0.8, 0.84, 0.9]),
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
      box(0, 1.82, 0.12, 0.4, 0.14, 0.12, [0.8, 0.4, 0.9]), // crest sits above the face
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
  duskwing: {
    label: 'Duskwing', behavior: 'aggressive', tier: 1, nocturnal: true,
    hp: 20, atk: 7, acc: 66, evasion: 24, armor: 0, speed: 9, moveRange: 5,
    abilities: [], element: 'shadow', weak: ['fire'], resist: [],
    xp: 48, huntXp: 30, respawn: 160, aggroRange: 7,
    drops: [
      { item: 'sinew', qty: [1, 2], chance: 0.8 },
      { item: 'old_coin', qty: [1, 2], chance: 0.4 },
    ],
    desc: 'A leather-winged shriek in the dark. It fades with the dawn.',
    recommend: 'It only hunts at night. Torchlight helps you see it coming.',
    model: M([
      box(0, 0.5, 0, 0.3, 0.3, 0.4, [0.24, 0.2, 0.3]),
      box(0, 0.62, 0.22, 0.2, 0.18, 0.14, [0.3, 0.25, 0.36]),
      box(-0.08, 0.8, 0.2, 0.06, 0.12, 0.06, [0.3, 0.25, 0.36]),
      box(0.08, 0.8, 0.2, 0.06, 0.12, 0.06, [0.3, 0.25, 0.36]),
      box(-0.5, 0.66, 0, 0.7, 0.06, 0.34, [0.32, 0.26, 0.4]),
      box(0.5, 0.66, 0, 0.7, 0.06, 0.34, [0.32, 0.26, 0.4]),
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
  rimehowl_alpha: {
    label: 'Rimehowl Alpha', behavior: 'aggressive', tier: 2, boss: true,
    hp: 170, atk: 16, acc: 70, evasion: 14, armor: 4, speed: 8, moveRange: 4,
    abilities: ['chill_bite'], element: 'ice', weak: ['fire'], resist: ['ice'],
    phases: [{ at: 0.5, summon: ['frostmaw_wolf', 'frostmaw_wolf'], banner: 'The Alpha howls — the pack answers!' }],
    xp: 900, respawn: 900, aggroRange: 7,
    drops: [
      { item: 'cured_hide', qty: [2, 3], chance: 1 },
      { item: 'sinew', qty: [2, 4], chance: 1 },
      { item: 'veilcrystal', qty: [1, 2], chance: 0.6 },
    ],
    desc: 'The great white terror of the frontier: an alpha grown huge and cruel on a decade of winters.',
    recommend: 'Dodge the leaping slam. Fire and fur-lined armor. Do not fight it alone at night.',
    model: M([
      box(0, 0.55, 0, 0.8, 0.75, 1.7, [0.88, 0.9, 0.95]),
      box(0, 0.95, 0.9, 0.55, 0.5, 0.6, [0.92, 0.94, 0.98]),
      box(0, 0.98, 1.28, 0.24, 0.24, 0.3, [0.82, 0.85, 0.92]),   // muzzle
      box(-0.18, 1.45, 0.92, 0.14, 0.2, 0.1, [0.85, 0.88, 0.94]), // ears
      box(0.18, 1.45, 0.92, 0.14, 0.2, 0.1, [0.85, 0.88, 0.94]),
      box(0, 0.62, -1.05, 0.16, 0.16, 0.6, [0.8, 0.84, 0.9]),
      box(-0.28, 0, 0.55, 0.2, 0.55, 0.2, [0.78, 0.81, 0.88]),
      box(0.28, 0, 0.55, 0.2, 0.55, 0.2, [0.78, 0.81, 0.88]),
      box(-0.28, 0, -0.55, 0.2, 0.55, 0.2, [0.78, 0.81, 0.88]),
      box(0.28, 0, -0.55, 0.2, 0.55, 0.2, [0.78, 0.81, 0.88]),
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

  // ===========================================================================
  // Fantasy roster — fey, slimes, goblinoids, undead, elementals, aberrations.
  // Broadens the bestiary beyond realistic animals. Models hand-authored in
  // world units via box(); rigs/skins/face-tiles registered in the maps below.
  // ===========================================================================

  // ---- Tier 0 ----
  pixie: {
    label: 'Pixie', behavior: 'aggressive', tier: 0,
    hp: 8, atk: 3, acc: 60, evasion: 28, armor: 0, speed: 9, moveRange: 5,
    abilities: ['sting_spark'], element: 'nature', weak: ['fire'], resist: [],
    xp: 16, respawn: 70, aggroRange: 5,
    headBoxes: [1],
    drops: [
      { item: 'plant_fibre', qty: [1, 2], chance: 1 },
      { item: 'amber_resin', qty: [1, 1], chance: 0.15 },
    ],
    desc: 'A thumb-sized mote of meadow-light, here and gone in a blink.',
    recommend: 'Nearly impossible to pin down — area magic or sheer luck.',
    model: M([
      box(0, 0.45, 0, 0.22, 0.3, 0.18, [0.55, 0.8, 0.45]),   // body
      box(0, 0.75, 0, 0.2, 0.2, 0.2, [0.85, 1, 0.7]),        // head
      box(-0.28, 0.55, -0.05, 0.28, 0.02, 0.24, [0.8, 0.95, 1]), // wing L
      box(0.28, 0.55, -0.05, 0.28, 0.02, 0.24, [0.8, 0.95, 1]),  // wing R
      box(0, 0.5, 0.11, 0.08, 0.08, 0.08, [1, 1, 0.6]),      // glow heart
    ]),
  },
  bog_ooze: {
    label: 'Bog Ooze', behavior: 'defensive', tier: 0,
    hp: 30, atk: 4, acc: 42, evasion: 2, armor: 4, speed: 2, moveRange: 2,
    abilities: ['mire_grip'], element: 'water', weak: ['fire'], resist: ['water'],
    xp: 24, respawn: 110, aggroRange: 0,
    headBoxes: [1],
    drops: [
      { item: 'clay_lump', qty: [1, 3], chance: 1 },
      { item: 'rough_gem', qty: [1, 1], chance: 0.12 },
    ],
    desc: 'A slow, quivering heap of swamp-jelly that swallows whatever it settles on.',
    recommend: 'It shrugs off feeble blows — bring weight, and don\'t get stuck.',
    model: M([
      box(0, 0, 0, 0.85, 0.45, 0.8, [0.3, 0.35, 0.22]),      // base blob
      box(0, 0.45, 0, 0.6, 0.3, 0.55, [0.36, 0.42, 0.26]),   // upper blob
      box(-0.14, 0.55, 0.28, 0.08, 0.08, 0.06, [0.9, 0.95, 0.6]), // eyes
      box(0.14, 0.55, 0.28, 0.08, 0.08, 0.06, [0.9, 0.95, 0.6]),
    ]),
  },
  scrap_goblin: {
    label: 'Scrap Goblin', behavior: 'aggressive', tier: 0,
    hp: 14, atk: 5, acc: 58, evasion: 12, armor: 1, speed: 6, moveRange: 4,
    abilities: ['gnaw'], element: null, weak: [], resist: [],
    xp: 22, respawn: 80, aggroRange: 6,
    headBoxes: [1, 2, 3],
    drops: [
      { item: 'old_coin', qty: [1, 2], chance: 0.5 },
      { item: 'sinew', qty: [1, 2], chance: 0.7 },
    ],
    desc: 'A wiry green scavenger draped in stolen rags, always hungry, never brave alone.',
    recommend: 'Cheeky but fragile. Hit it before it hits back.',
    model: M([
      box(0, 0.35, 0, 0.34, 0.4, 0.24, [0.35, 0.5, 0.3]),    // torso
      box(0, 0.75, 0, 0.3, 0.28, 0.28, [0.45, 0.6, 0.38]),   // head
      box(-0.22, 0.82, 0, 0.1, 0.06, 0.06, [0.4, 0.55, 0.34]), // ears
      box(0.22, 0.82, 0, 0.1, 0.06, 0.06, [0.4, 0.55, 0.34]),
      box(-0.36, 0.4, 0, 0.1, 0.34, 0.12, [0.4, 0.55, 0.34]), // arms
      box(0.36, 0.4, 0, 0.1, 0.34, 0.12, [0.4, 0.55, 0.34]),
      box(-0.12, 0, 0, 0.13, 0.32, 0.13, [0.3, 0.42, 0.26]),  // legs
      box(0.12, 0, 0, 0.13, 0.32, 0.13, [0.3, 0.42, 0.26]),
    ]),
  },

  // ---- Tier 1 ----
  will_o_wisp: {
    label: "Will-o'-Wisp", behavior: 'aggressive', tier: 1,
    hp: 16, atk: 7, acc: 68, evasion: 24, armor: 0, speed: 8, moveRange: 4,
    abilities: ['ember_fling'], ranged: true, range: 4, element: 'fire', weak: ['water'], resist: ['fire'],
    xp: 46, respawn: 130, aggroRange: 6,
    headBoxes: [1],
    drops: [
      { item: 'sunpetal', qty: [1, 1], chance: 0.35 },
      { item: 'old_coin', qty: [1, 3], chance: 0.5 },
    ],
    desc: 'A drifting ghost-flame that beckons the lost deeper into the mire.',
    recommend: 'It keeps its distance and burns — close in or bring water.',
    model: M([
      box(0, 0.45, 0, 0.3, 0.35, 0.3, [0.8, 0.6, 0.25]),     // core
      box(0, 0.8, 0, 0.18, 0.25, 0.18, [1, 0.85, 0.4]),      // flame crown
      box(0, 0.2, -0.05, 0.12, 0.2, 0.12, [0.7, 0.45, 0.2]), // trailing ember
    ]),
  },
  bone_hound: {
    label: 'Bone Hound', behavior: 'aggressive', tier: 1, nocturnal: true,
    hp: 24, atk: 8, acc: 64, evasion: 14, armor: 1, speed: 8, moveRange: 5,
    abilities: ['gnaw'], element: null, weak: ['fire'], resist: [],
    xp: 52, huntXp: 32, respawn: 150, aggroRange: 7, bleed: 0.2,
    headBoxes: [1, 2],
    drops: [
      { item: 'sinew', qty: [1, 2], chance: 0.8 },
      { item: 'bone_needle', qty: [1, 1], chance: 0.2 },
    ],
    desc: 'A skeleton dog knitted from a hundred grave-scraps. It hunts the cold nights in packs.',
    recommend: 'Dry bone burns fast. Fire, and don\'t let the pack circle you.',
    model: M([
      box(0, 0.35, 0, 0.4, 0.32, 0.9, [0.8, 0.8, 0.74]),     // ribcage body
      box(0, 0.5, 0.55, 0.28, 0.28, 0.35, [0.85, 0.85, 0.78]), // skull
      box(0, 0.45, 0.8, 0.14, 0.12, 0.18, [0.8, 0.8, 0.72]),  // snout
      box(0, 0.4, -0.6, 0.08, 0.08, 0.35, [0.78, 0.78, 0.72]), // tail
      box(-0.15, 0, 0.35, 0.1, 0.32, 0.1, [0.76, 0.76, 0.7]), // legs
      box(0.15, 0, 0.35, 0.1, 0.32, 0.1, [0.76, 0.76, 0.7]),
      box(-0.15, 0, -0.3, 0.1, 0.32, 0.1, [0.76, 0.76, 0.7]),
      box(0.15, 0, -0.3, 0.1, 0.32, 0.1, [0.76, 0.76, 0.7]),
    ]),
  },
  cave_slime: {
    label: 'Cave Slime', behavior: 'aggressive', tier: 1,
    hp: 34, atk: 6, acc: 50, evasion: 4, armor: 3, speed: 3, moveRange: 2,
    abilities: ['toxin_lash'], element: 'nature', weak: ['fire'], resist: ['nature'],
    xp: 48, respawn: 150, aggroRange: 4,
    headBoxes: [1],
    drops: [
      { item: 'rough_gem', qty: [1, 1], chance: 0.4 },
      { item: 'veilcrystal', qty: [1, 1], chance: 0.1 },
    ],
    desc: 'A glinting crystalline ooze that creeps the cavern dark, dissolving all it touches.',
    recommend: 'Its acid lingers — carry an antidote and heavy boots.',
    model: M([
      box(0, 0, 0, 0.7, 0.4, 0.65, [0.4, 0.7, 0.6]),         // base
      box(0, 0.4, 0, 0.5, 0.28, 0.45, [0.5, 0.8, 0.7]),      // dome
      box(0, 0.6, 0, 0.12, 0.18, 0.12, [0.75, 0.95, 0.9]),   // crystal spur
      box(-0.12, 0.45, 0.24, 0.07, 0.07, 0.05, [0.95, 1, 0.9]), // eyes
      box(0.12, 0.45, 0.24, 0.07, 0.07, 0.05, [0.95, 1, 0.9]),
    ]),
  },

  // ---- Tier 2 ----
  frost_elemental: {
    label: 'Frost Elemental', behavior: 'aggressive', tier: 2,
    hp: 34, atk: 11, acc: 68, evasion: 10, armor: 3, speed: 5, moveRange: 4,
    abilities: ['glacial_lance'], ranged: true, range: 5, element: 'ice', weak: ['fire'], resist: ['ice'],
    xp: 92, respawn: 210, aggroRange: 7,
    headBoxes: [1, 2],
    drops: [
      { item: 'veilcrystal', qty: [1, 1], chance: 0.3 },
      { item: 'rough_gem', qty: [1, 2], chance: 0.6 },
    ],
    desc: 'A walking shard of the deep winter, its heart a knot of everlasting ice.',
    recommend: 'Fire melts it fast. Ice does nothing but amuse it.',
    model: M([
      box(0, 0.45, 0, 0.5, 0.6, 0.35, [0.6, 0.78, 0.95]),    // torso
      box(0, 1.05, 0, 0.34, 0.32, 0.32, [0.75, 0.88, 1]),    // head
      box(0, 1.35, 0, 0.14, 0.22, 0.14, [0.85, 0.95, 1]),    // crystal crown
      box(-0.42, 0.5, 0, 0.14, 0.5, 0.14, [0.55, 0.72, 0.9]), // arms
      box(0.42, 0.5, 0, 0.14, 0.5, 0.14, [0.55, 0.72, 0.9]),
      box(-0.16, 0, 0, 0.16, 0.45, 0.16, [0.5, 0.68, 0.88]), // legs
      box(0.16, 0, 0, 0.16, 0.45, 0.16, [0.5, 0.68, 0.88]),
    ]),
  },
  grave_wight: {
    label: 'Grave Wight', behavior: 'aggressive', tier: 2,
    hp: 40, atk: 12, acc: 64, evasion: 8, armor: 4, speed: 5, moveRange: 4,
    abilities: ['corrupt_claw'], element: 'shadow', weak: ['nature'], resist: ['shadow'],
    xp: 96, respawn: 220, aggroRange: 6,
    headBoxes: [1, 6],
    drops: [
      { item: 'old_coin', qty: [2, 4], chance: 0.6 },
      { item: 'relic_fragment', qty: [1, 1], chance: 0.12 },
    ],
    desc: 'A barrow-lord that never learned to lie still, draining the warmth from the living.',
    recommend: 'Its touch saps your strength — end it quickly, or bring a ward.',
    model: M([
      box(0, 0.4, 0, 0.4, 0.55, 0.28, [0.28, 0.24, 0.34]),   // shrouded torso
      box(0, 0.98, 0, 0.3, 0.3, 0.3, [0.4, 0.36, 0.46]),     // head
      box(-0.36, 0.42, 0, 0.12, 0.5, 0.12, [0.24, 0.2, 0.3]), // arms
      box(0.36, 0.42, 0, 0.12, 0.5, 0.12, [0.24, 0.2, 0.3]),
      box(-0.13, 0, 0, 0.14, 0.4, 0.14, [0.22, 0.18, 0.28]), // legs
      box(0.13, 0, 0, 0.14, 0.4, 0.14, [0.22, 0.18, 0.28]),
      box(0, 1.28, 0.1, 0.34, 0.12, 0.12, [0.6, 0.4, 0.8]),  // spectral crest above the face
    ]),
  },
  skeletal_archer: {
    label: 'Skeletal Archer', behavior: 'aggressive', tier: 2,
    hp: 26, atk: 11, acc: 72, evasion: 12, armor: 2, speed: 6, moveRange: 4,
    abilities: ['shard_spit'], ranged: true, range: 5, element: null, weak: ['fire'], resist: [],
    xp: 90, respawn: 200, aggroRange: 7,
    headBoxes: [1],
    drops: [
      { item: 'old_coin', qty: [1, 3], chance: 0.5 },
      { item: 'bone_needle', qty: [1, 2], chance: 0.4 },
    ],
    desc: 'A dead marksman still keeping its endless watch, loosing splinters of bone from the dark.',
    recommend: 'Break line of sight and rush it — it is helpless up close.',
    model: M([
      box(0, 0.4, 0, 0.34, 0.5, 0.2, [0.82, 0.8, 0.72]),     // ribs
      box(0, 0.95, 0, 0.28, 0.28, 0.28, [0.88, 0.86, 0.78]), // skull
      box(-0.32, 0.42, 0.05, 0.1, 0.46, 0.1, [0.8, 0.78, 0.7]), // arms
      box(0.32, 0.42, 0.05, 0.1, 0.46, 0.1, [0.8, 0.78, 0.7]),
      box(-0.11, 0, 0, 0.11, 0.4, 0.11, [0.78, 0.76, 0.68]), // legs
      box(0.11, 0, 0, 0.11, 0.4, 0.11, [0.78, 0.76, 0.68]),
      box(0.34, 0.45, 0.14, 0.05, 0.58, 0.06, [0.4, 0.28, 0.18]), // bow
    ]),
  },

  // ---- Tier 3 (elite / dangerous) ----
  stone_golem: {
    label: 'Stone Golem', behavior: 'aggressive', tier: 3, elite: true,
    hp: 95, atk: 17, acc: 60, evasion: 2, armor: 9, speed: 3, moveRange: 2,
    abilities: ['boulder_swat'], element: null, weak: [], resist: [],
    xp: 300, respawn: 400, aggroRange: 6,
    headBoxes: [1],
    drops: [
      { item: 'rough_stone', qty: [2, 4], chance: 1 },
      { item: 'rough_gem', qty: [1, 2], chance: 0.6 },
      { item: 'relic_fragment', qty: [1, 1], chance: 0.35 },
    ],
    desc: 'A mountain given fists and a grudge, its chest lit by an old bound rune.',
    recommend: 'Elite. Armour laughs off arrows — bring crushing force and patience.',
    model: M([
      box(0, 0.6, 0, 0.8, 0.8, 0.6, [0.46, 0.45, 0.4]),      // torso
      box(0, 1.5, 0, 0.5, 0.45, 0.5, [0.5, 0.48, 0.42]),     // head
      box(-0.62, 0.55, 0, 0.28, 0.85, 0.28, [0.42, 0.4, 0.36]), // arms
      box(0.62, 0.55, 0, 0.28, 0.85, 0.28, [0.42, 0.4, 0.36]),
      box(-0.24, 0, 0, 0.3, 0.55, 0.32, [0.4, 0.38, 0.34]),  // legs
      box(0.24, 0, 0, 0.3, 0.55, 0.32, [0.4, 0.38, 0.34]),
      box(0, 0.75, 0.32, 0.2, 0.2, 0.1, [0.6, 0.85, 0.7]),   // rune core
    ]),
  },
  veil_crawler: {
    label: 'Veil Crawler', behavior: 'aggressive', tier: 3, elite: true,
    hp: 70, atk: 16, acc: 68, evasion: 14, armor: 5, speed: 6, moveRange: 4,
    abilities: ['corrupt_claw'], element: 'shadow', weak: ['nature'], resist: ['shadow'],
    xp: 300, respawn: 380, aggroRange: 7,
    headBoxes: [1, 2],
    drops: [
      { item: 'veilcrystal', qty: [1, 2], chance: 0.5 },
      { item: 'relic_fragment', qty: [1, 2], chance: 0.4 },
    ],
    desc: 'A low, many-legged horror birthed where the Veil tore. Reality frays where it walks.',
    recommend: 'Elite. Nature magic cuts the corruption. Wards strongly advised.',
    model: M([
      box(0, 0.3, 0, 0.5, 0.35, 1.0, [0.3, 0.22, 0.4]),      // body
      box(0, 0.35, 0.6, 0.3, 0.28, 0.3, [0.36, 0.26, 0.46]), // head
      box(0, 0.3, 0.85, 0.18, 0.14, 0.16, [0.5, 0.3, 0.6]),  // maw
      box(0, 0.35, -0.65, 0.1, 0.1, 0.4, [0.28, 0.2, 0.38]), // tail
      box(-0.24, 0, 0.4, 0.12, 0.3, 0.12, [0.26, 0.18, 0.34]), // legs
      box(0.24, 0, 0.4, 0.12, 0.3, 0.12, [0.26, 0.18, 0.34]),
      box(-0.24, 0, -0.35, 0.12, 0.3, 0.12, [0.26, 0.18, 0.34]),
      box(0.24, 0, -0.35, 0.12, 0.3, 0.12, [0.26, 0.18, 0.34]),
      box(0, 0.62, 0.5, 0.34, 0.12, 0.1, [0.7, 0.4, 0.9]),   // veil crest
    ]),
  },
  gaze_orb: {
    label: 'Gaze Orb', behavior: 'aggressive', tier: 3,
    hp: 42, atk: 15, acc: 74, evasion: 18, armor: 2, speed: 7, moveRange: 4,
    abilities: ['void_gaze'], ranged: true, range: 6, element: 'shadow', weak: ['nature'], resist: ['shadow'],
    xp: 210, respawn: 300, aggroRange: 8,
    headBoxes: [0],
    drops: [
      { item: 'veilcrystal', qty: [1, 1], chance: 0.4 },
      { item: 'flawless_veilcrystal', qty: [1, 1], chance: 0.08 },
    ],
    desc: 'A floating eye trailing raw tendrils, its stare peeling back the world.',
    recommend: 'Break its line of sight — everything it sees, it can wither.',
    model: M([
      box(0, 0.55, 0, 0.5, 0.5, 0.45, [0.3, 0.2, 0.35]),     // orb
      box(0, 0.6, 0.22, 0.24, 0.24, 0.12, [0.9, 0.8, 1]),    // iris
      box(-0.2, 0.9, 0, 0.06, 0.22, 0.06, [0.4, 0.28, 0.5]), // tendrils
      box(0.2, 0.9, 0, 0.06, 0.22, 0.06, [0.4, 0.28, 0.5]),
      box(0, 0.95, -0.1, 0.06, 0.2, 0.06, [0.4, 0.28, 0.5]),
    ]),
  },

  // ---- new creatures added with the textured-remake pass -------------------
  // (models below are the format-required fallback; MOB_REMAKES paints the real
  // detailed, textured model for each of these at registration.)
  meadow_stag: {
    label: 'Meadow Stag', behavior: 'defensive', tier: 0,
    hp: 22, atk: 6, acc: 56, evasion: 14, armor: 1, speed: 7, moveRange: 4,
    abilities: ['skull_rush'], element: null, weak: [], resist: [],
    xp: 30, huntXp: 24, respawn: 130, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 2], chance: 0.9 },
      { item: 'boarhide', qty: [1, 2], chance: 0.8 },
      { item: 'sinew', qty: [1, 2], chance: 0.6 },
    ],
    desc: 'A proud meadow stag, crowned with branching antlers and quick to bolt.',
    recommend: 'Skittish and fast — corner it, or bring a bow.',
    model: M([
      box(0, 0.52, 0, 0.44, 0.42, 0.95, [0.54, 0.38, 0.22]),
      box(0, 1.0, 0.5, 0.28, 0.3, 0.34, [0.58, 0.42, 0.26]),
    ]),
  },
  dust_scarab: {
    label: 'Dust Scarab', behavior: 'aggressive', tier: 0,
    hp: 12, atk: 4, acc: 58, evasion: 16, armor: 3, speed: 7, moveRange: 4,
    abilities: ['gnaw'], element: null, weak: [], resist: [],
    xp: 18, respawn: 70, aggroRange: 5,
    drops: [
      { item: 'sinew', qty: [1, 2], chance: 0.6 },
      { item: 'rough_gem', qty: [1, 1], chance: 0.12 },
    ],
    desc: 'A hard-shelled scarab that scuttles the hot sand, its carapace shimmering like spilled oil.',
    recommend: 'Small but armoured — a solid hit cracks the shell.',
    model: M([
      box(0, 0.1, 0, 0.44, 0.24, 0.5, [0.18, 0.5, 0.36]),
      box(0, 0.12, 0.34, 0.2, 0.14, 0.16, [0.12, 0.16, 0.12]),
    ]),
  },
  mire_toad: {
    label: 'Mire Toad', behavior: 'defensive', tier: 1,
    hp: 24, atk: 6, acc: 56, evasion: 14, armor: 1, speed: 5, moveRange: 3,
    abilities: ['mire_grip'], element: 'water', weak: ['fire'], resist: ['water'],
    xp: 38, huntXp: 24, respawn: 120, aggroRange: 0,
    drops: [
      { item: 'sinew', qty: [1, 2], chance: 0.8 },
      { item: 'clay_lump', qty: [1, 2], chance: 0.5 },
      { item: 'duskcap', qty: [1, 1], chance: 0.25 },
    ],
    desc: 'A boulder-sized toad that swallows whatever hops too close.',
    recommend: 'Slow, but its tongue drags you in. Fire loosens its grip.',
    model: M([
      box(0, 0.1, 0, 0.7, 0.32, 0.62, [0.29, 0.42, 0.23]),
      box(0, 0.14, 0.34, 0.6, 0.28, 0.3, [0.32, 0.46, 0.25]),
    ]),
  },
  crag_bat: {
    label: 'Crag Bat', behavior: 'aggressive', tier: 1,
    hp: 14, atk: 5, acc: 66, evasion: 24, armor: 0, speed: 9, moveRange: 5,
    abilities: ['gnaw'], element: null, weak: ['fire'], resist: [],
    xp: 38, huntXp: 24, respawn: 120, aggroRange: 6,
    drops: [
      { item: 'sinew', qty: [1, 2], chance: 0.8 },
      { item: 'old_coin', qty: [1, 2], chance: 0.3 },
      { item: 'rough_gem', qty: [1, 1], chance: 0.06 },
    ],
    desc: 'A leather-winged flitter that boils out of the high crags in a shrieking cloud.',
    recommend: 'Fast and dodgy — pin it down before the colony wakes.',
    model: M([
      box(0, 0.5, 0, 0.28, 0.32, 0.28, [0.42, 0.37, 0.32]),
      box(0, 0.52, 0, 1.1, 0.05, 0.34, [0.35, 0.29, 0.29]),
    ]),
  },
  snow_hare: {
    label: 'Snow Hare', behavior: 'passive', tier: 0,
    hp: 6, atk: 2, acc: 50, evasion: 30, armor: 0, speed: 9, moveRange: 4,
    abilities: [], element: null, weak: [], resist: [],
    xp: 8, huntXp: 12, respawn: 60, aggroRange: 0,
    drops: [
      { item: 'sinew', qty: [1, 1], chance: 0.7 },
      { item: 'cured_hide', qty: [1, 1], chance: 0.4 },
    ],
    desc: 'A quick white hare of the snowline, all ears and jangled nerves.',
    recommend: 'Harmless prey — run it down before it bolts.',
    model: M([
      box(0, 0.12, 0, 0.26, 0.24, 0.44, [0.93, 0.95, 0.97]),
      box(0, 0.32, 0.2, 0.22, 0.22, 0.22, [0.95, 0.97, 0.99]),
    ]),
  },
  ash_salamander: {
    label: 'Ash Salamander', behavior: 'aggressive', tier: 2,
    hp: 26, atk: 10, acc: 66, evasion: 16, armor: 2, speed: 6, moveRange: 4,
    abilities: ['ember_fling'], ranged: true, range: 4, element: 'fire', weak: ['water', 'ice'], resist: ['fire'],
    xp: 80, respawn: 190, aggroRange: 6,
    drops: [
      { item: 'emberstone_shard', qty: [1, 2], chance: 0.6 },
      { item: 'sinew', qty: [1, 1], chance: 0.5 },
      { item: 'flame_opal', qty: [1, 1], chance: 0.1 },
    ],
    desc: 'A soot-black newt that basks in the lava-shallows and flicks burning ash at intruders.',
    recommend: 'Water or ice snuffs its embers — then close in fast.',
    model: M([
      box(0, 0.08, 0, 0.26, 0.16, 0.5, [0.11, 0.1, 0.12]),
      box(0, 0.1, 0.34, 0.24, 0.14, 0.22, [0.13, 0.11, 0.12]),
    ]),
  },
};

// ---- Minecraft-proportioned remodel ----------------------------------------
// All creature geometry on a 16-px-per-block grid, matching the player model:
// chunky slab bodies, oversized near-cube heads with faces, stubby square
// legs set at the corners, and tiny boxes for snouts/ears/horns/tails.
// pb(cx, y, cz, w, h, d): centered on x/z in px, base at y px, z+ = forward.
const PXU = 1 / 16;
const pb = (cxp, y, czp, w, h, d, color) => box(cxp * PXU, y * PXU, czp * PXU, w * PXU, h * PXU, d * PXU, color);

const REMODELS = {
  mudback_boar: {
    headBoxes: [2, 3, 4, 5, 6, 7],
    model: M([
      pb(0, 6, -1, 10, 8, 16, [0.45, 0.32, 0.22]),
      pb(0, 13.5, -2, 8, 2, 12, [0.3, 0.22, 0.15]),      // dried-mud plate
      pb(0, 6, 10, 8, 8, 8, [0.52, 0.38, 0.26]),         // head
      pb(0, 7.5, 14.5, 4, 3, 2, [0.72, 0.5, 0.42]),      // snout
      pb(-2.5, 6, 13.5, 1, 3, 1, [0.92, 0.9, 0.82]),     // tusks
      pb(2.5, 6, 13.5, 1, 3, 1, [0.92, 0.9, 0.82]),
      pb(-3.5, 13.5, 10, 1, 2, 2, [0.4, 0.28, 0.2]),     // ears
      pb(3.5, 13.5, 10, 1, 2, 2, [0.4, 0.28, 0.2]),
      pb(-3, 0, 5, 4, 6, 4, [0.35, 0.25, 0.18]),
      pb(3, 0, 5, 4, 6, 4, [0.35, 0.25, 0.18]),
      pb(-3, 0, -6, 4, 6, 4, [0.35, 0.25, 0.18]),
      pb(3, 0, -6, 4, 6, 4, [0.35, 0.25, 0.18]),
    ]),
  },
  craghorn_ram: {
    headBoxes: [2, 3, 4],
    model: M([
      pb(0, 7, -1, 9, 8, 14, [0.78, 0.72, 0.62]),
      pb(0, 14.5, -1, 7, 2, 10, [0.68, 0.6, 0.5]),       // wool crown
      pb(0, 9, 8.5, 6, 7, 6, [0.6, 0.52, 0.44]),         // head
      pb(-3.5, 14, 7, 2, 2, 5, [0.35, 0.3, 0.24]),       // horns sweep back
      pb(3.5, 14, 7, 2, 2, 5, [0.35, 0.3, 0.24]),
      pb(-3, 0, 5, 3, 7, 3, [0.55, 0.48, 0.4]),
      pb(3, 0, 5, 3, 7, 3, [0.55, 0.48, 0.4]),
      pb(-3, 0, -5, 3, 7, 3, [0.55, 0.48, 0.4]),
      pb(3, 0, -5, 3, 7, 3, [0.55, 0.48, 0.4]),
    ]),
  },
  frostmaw_wolf: {
    headBoxes: [3, 4, 5, 6],
    model: M([
      pb(0, 7, 3, 8, 7, 7, [0.92, 0.94, 0.97]),          // mane
      pb(0, 8, -4.5, 6, 6, 9, [0.85, 0.88, 0.93]),       // rear body
      pb(0, 8, -11.5, 2, 2, 7, [0.8, 0.84, 0.9]),        // tail
      pb(0, 10, 9, 6, 6, 5, [0.95, 0.96, 1.0]),          // head
      pb(0, 10.5, 13, 3, 3, 3, [0.75, 0.78, 0.85]),      // snout
      pb(-2, 16, 9.5, 2, 3, 1, [0.85, 0.88, 0.93]),      // ears
      pb(2, 16, 9.5, 2, 3, 1, [0.85, 0.88, 0.93]),
      pb(-2.5, 0, 5.5, 2.5, 8, 2.5, [0.78, 0.81, 0.88]),
      pb(2.5, 0, 5.5, 2.5, 8, 2.5, [0.78, 0.81, 0.88]),
      pb(-2.5, 0, -7.5, 2.5, 8, 2.5, [0.78, 0.81, 0.88]),
      pb(2.5, 0, -7.5, 2.5, 8, 2.5, [0.78, 0.81, 0.88]),
    ]),
  },
  rimehowl_alpha: {
    headBoxes: [3, 4, 5, 6],
    model: M([
      pb(0, 11, 5, 13, 11, 11, [0.9, 0.92, 0.97]),
      pb(0, 12, -7, 10, 9, 13, [0.84, 0.87, 0.93]),
      pb(0, 12, -17, 3, 3, 9, [0.78, 0.82, 0.9]),
      pb(0, 15, 14, 9, 9, 8, [0.95, 0.97, 1.0]),
      pb(0, 16, 21, 5, 4, 4, [0.72, 0.76, 0.85]),
      pb(-3.5, 24, 15, 3, 4, 2, [0.85, 0.88, 0.94]),
      pb(3.5, 24, 15, 3, 4, 2, [0.85, 0.88, 0.94]),
      pb(-4, 0, 8, 5, 11, 5, [0.76, 0.8, 0.88]),
      pb(4, 0, 8, 5, 11, 5, [0.76, 0.8, 0.88]),
      pb(-4, 0, -11, 5, 11, 5, [0.76, 0.8, 0.88]),
      pb(4, 0, -11, 5, 11, 5, [0.76, 0.8, 0.88]),
    ]),
  },
  gloomrat: {
    headBoxes: [1, 2, 3, 4],
    model: M([
      pb(0, 1.5, -1.5, 6, 5, 10, [0.3, 0.28, 0.34]),
      pb(0, 2, 5.5, 5, 4.5, 5, [0.42, 0.38, 0.46]),
      pb(0, 3, 8.8, 2, 2, 2, [0.85, 0.55, 0.55]),        // nose
      pb(-1.8, 6.5, 5.5, 2, 2, 1, [0.38, 0.34, 0.42]),   // ears
      pb(1.8, 6.5, 5.5, 2, 2, 1, [0.38, 0.34, 0.42]),
      pb(0, 2.5, -10.5, 1.5, 1.5, 8, [0.55, 0.45, 0.48]), // tail
      pb(-2, 0, 3, 1.5, 2, 1.5, [0.45, 0.4, 0.44]),
      pb(2, 0, 3, 1.5, 2, 1.5, [0.45, 0.4, 0.44]),
      pb(-2, 0, -4, 1.5, 2, 1.5, [0.45, 0.4, 0.44]),
      pb(2, 0, -4, 1.5, 2, 1.5, [0.45, 0.4, 0.44]),
    ]),
  },
  dune_stalker: {
    headBoxes: [2, 3, 4, 5],
    model: M([
      pb(0, 4.5, -1, 6, 6, 14, [0.82, 0.68, 0.42]),
      pb(0, 6, -10.5, 1.5, 1.5, 8, [0.72, 0.58, 0.36]),  // tail
      pb(0, 6.5, 8.5, 5, 5, 4.5, [0.87, 0.73, 0.47]),    // head
      pb(0, 7, 11.5, 2.5, 2, 2, [0.7, 0.56, 0.36]),      // muzzle
      pb(-1.6, 11.5, 8.5, 1.5, 2, 1, [0.76, 0.6, 0.38]), // ears
      pb(1.6, 11.5, 8.5, 1.5, 2, 1, [0.76, 0.6, 0.38]),
      pb(-2, 0, 5, 2, 4.5, 2, [0.74, 0.6, 0.38]),
      pb(2, 0, 5, 2, 4.5, 2, [0.74, 0.6, 0.38]),
      pb(-2, 0, -5, 2, 4.5, 2, [0.74, 0.6, 0.38]),
      pb(2, 0, -5, 2, 4.5, 2, [0.74, 0.6, 0.38]),
    ]),
  },
  stone_pecker: {
    headBoxes: [1, 2, 3],
    model: M([
      pb(0, 3.5, -0.5, 6, 7, 9, [0.6, 0.6, 0.64]),
      pb(0, 10, 3, 4, 6, 4, [0.66, 0.66, 0.7]),          // head
      pb(0, 12, 6, 2, 2, 3, [0.9, 0.62, 0.25]),          // beak
      pb(0, 10, 5.8, 1.5, 2, 1.5, [0.8, 0.3, 0.25]),     // wattle
      pb(-3.5, 5, -0.5, 1, 5, 7, [0.5, 0.5, 0.55]),      // wings
      pb(3.5, 5, -0.5, 1, 5, 7, [0.5, 0.5, 0.55]),
      pb(-1.5, 0, 0.5, 1.5, 3.5, 2, [0.85, 0.6, 0.28]),
      pb(1.5, 0, 0.5, 1.5, 3.5, 2, [0.85, 0.6, 0.28]),
    ]),
  },
  sunscale_serpent: {
    headBoxes: [3, 4],
    model: M([
      pb(0, 0.5, -11, 3, 3, 8, [0.75, 0.5, 0.2]),        // tail segment
      pb(0, 0.5, -2, 4.5, 4, 11, [0.85, 0.6, 0.25]),     // body
      pb(0, 1, 7, 3.5, 7, 3.5, [0.88, 0.62, 0.26]),      // raised coil
      pb(0, 8, 7.5, 4.5, 4, 6, [0.92, 0.68, 0.3]),       // head
      pb(0, 7, 6, 6.5, 5, 2, [0.8, 0.5, 0.2]),           // cobra hood
    ]),
  },
  shell_snapper: {
    model: M([
      pb(0, 3, -1, 14, 5, 15, [0.42, 0.5, 0.42]),
      pb(0, 8, -1, 10, 2, 11, [0.34, 0.42, 0.36]),
      pb(0, 1, -1, 12, 2, 13, [0.75, 0.68, 0.5]),
      pb(0, 2, 9.5, 5, 4, 5, [0.66, 0.66, 0.5]),          // head
      pb(-8, 0.5, 4, 4, 1.5, 4, [0.6, 0.6, 0.46]),        // flippers
      pb(8, 0.5, 4, 4, 1.5, 4, [0.6, 0.6, 0.46]),
      pb(-7, 0.5, -7, 3.5, 1.5, 3.5, [0.6, 0.6, 0.46]),
      pb(7, 0.5, -7, 3.5, 1.5, 3.5, [0.6, 0.6, 0.46]),
    ]),
  },
  moss_lurker: {
    model: M([
      pb(0, 0, 0, 15, 10, 13, [0.4, 0.46, 0.36]),
      pb(0, 10, -0.5, 12, 4, 10, [0.34, 0.52, 0.3]),
      pb(0, 4, 6.2, 8, 6, 1.5, [0.5, 0.55, 0.45]),        // stone face plate
      pb(-3, 7.5, 7, 2, 2, 1, [0.95, 0.92, 0.6]),         // glow eyes
      pb(3, 7.5, 7, 2, 2, 1, [0.95, 0.92, 0.6]),
    ]),
  },
  bog_shambler: {
    headBoxes: [3],
    model: M([
      pb(0, 7, 0, 10, 10, 6, [0.34, 0.3, 0.22]),
      pb(-7, 6, 0, 4, 11, 4, [0.3, 0.27, 0.2]),
      pb(7, 6, 0, 4, 11, 4, [0.3, 0.27, 0.2]),
      pb(0, 17, 0.5, 7, 7, 7, [0.42, 0.38, 0.28]),
      pb(0, 16.5, 0, 11, 1.5, 5, [0.32, 0.44, 0.26]),     // moss shoulders
      pb(-2.5, 0, 0, 4, 7, 4, [0.26, 0.24, 0.18]),
      pb(2.5, 0, 0, 4, 7, 4, [0.26, 0.24, 0.18]),
    ]),
  },
  magma_hulk: {
    headBoxes: [4, 5],
    model: M([
      pb(0, 8, 0, 14, 11, 8, [0.32, 0.17, 0.13]),
      pb(0, 11, 4.2, 6, 4, 1, [1, 0.5, 0.1]),             // magma core
      pb(-9.5, 4, 0, 5, 15, 5, [0.27, 0.14, 0.11]),
      pb(9.5, 4, 0, 5, 15, 5, [0.27, 0.14, 0.11]),
      pb(0, 19, 0.5, 8, 7, 7, [0.38, 0.2, 0.15]),
      pb(0, 24.5, 3, 9, 2, 2, [0.28, 0.15, 0.12]),        // heavy brow
      pb(-3.5, 0, 0, 5, 8, 5, [0.24, 0.13, 0.1]),
      pb(3.5, 0, 0, 5, 8, 5, [0.24, 0.13, 0.1]),
    ]),
  },
  blight_horror: {
    headBoxes: [3, 4],
    model: M([
      pb(0, 8, 0, 10, 11, 6, [0.3, 0.2, 0.35]),
      pb(-7, 4, 0, 4, 14, 4, [0.26, 0.17, 0.3]),
      pb(7, 4, 0, 4, 14, 4, [0.26, 0.17, 0.3]),
      pb(0, 19, 0.5, 7, 7, 7, [0.38, 0.26, 0.44]),
      pb(0, 26, 0.5, 5, 3, 3, [0.85, 0.45, 0.9]),         // crest
      pb(-2.5, 0, 0, 4, 8, 4, [0.22, 0.15, 0.26]),
      pb(2.5, 0, 0, 4, 8, 4, [0.22, 0.15, 0.26]),
    ]),
  },
  rootbound_golem: {
    headBoxes: [4, 5, 6, 7],
    model: M([
      pb(0, 10, 0, 16, 13, 9, [0.44, 0.42, 0.36]),
      pb(0, 14, 4.8, 12, 3, 1, [0.32, 0.5, 0.26]),        // moss belt
      pb(-11, 6, 0, 6, 18, 6, [0.38, 0.36, 0.3]),
      pb(11, 6, 0, 6, 18, 6, [0.38, 0.36, 0.3]),
      pb(0, 23, 1, 9, 8, 8, [0.48, 0.46, 0.4]),
      pb(-3.5, 31, 1, 2, 5, 2, [0.35, 0.55, 0.28]),       // root antlers
      pb(3.5, 31, 1, 2, 5, 2, [0.35, 0.55, 0.28]),
      pb(0, 29, 4.5, 9, 2, 1.5, [0.3, 0.5, 0.25]),        // moss brow
      pb(-4, 0, 0, 6, 10, 6, [0.36, 0.34, 0.28]),
      pb(4, 0, 0, 6, 10, 6, [0.36, 0.34, 0.28]),
    ]),
  },
  cinder_imp: {
    headBoxes: [3, 4, 5],
    model: M([
      pb(0, 3, 0, 6, 6, 5, [0.55, 0.2, 0.14]),
      pb(-3.8, 3.5, 0, 1.5, 5, 1.5, [0.5, 0.18, 0.13]),
      pb(3.8, 3.5, 0, 1.5, 5, 1.5, [0.5, 0.18, 0.13]),
      pb(0, 9, 0, 5.5, 5.5, 5.5, [0.7, 0.28, 0.16]),
      pb(-1.8, 14.5, 0, 1.5, 3, 1.5, [0.95, 0.55, 0.2]),  // horns
      pb(1.8, 14.5, 0, 1.5, 3, 1.5, [0.95, 0.55, 0.2]),
      pb(-1.5, 0, 0, 2.5, 3, 2.5, [0.45, 0.16, 0.12]),
      pb(1.5, 0, 0, 2.5, 3, 2.5, [0.45, 0.16, 0.12]),
    ]),
  },
  thicket_sprite: {
    model: M([
      pb(0, 2, 0, 5, 6, 4.5, [0.3, 0.42, 0.24]),
      pb(0, 8, 0, 4.5, 4.5, 4.5, [0.5, 0.75, 0.35]),      // head
      pb(0, 4, 2.5, 2, 2, 1, [1, 0.95, 0.5]),             // glow heart
      pb(-3.2, 4.5, 0, 1.5, 4, 1.5, [0.35, 0.28, 0.18]),  // twig arms
      pb(3.2, 4.5, 0, 1.5, 4, 1.5, [0.35, 0.28, 0.18]),
    ]),
  },
  root_creeper: {
    headBoxes: [2],
    model: M([
      pb(0, 0, 0, 12, 4, 12, [0.34, 0.27, 0.18]),
      pb(0, 4, 0, 8, 5, 8, [0.4, 0.32, 0.2]),
      pb(0, 9, 0, 5, 4, 5, [0.35, 0.55, 0.25]),           // sprout head
      pb(-6.5, 0.5, 3, 3, 2, 5, [0.38, 0.3, 0.2]),        // creeping roots
      pb(6.5, 0.5, -3, 3, 2, 5, [0.38, 0.3, 0.2]),
    ]),
  },
  rootling: {
    headBoxes: [1, 2],
    model: M([
      pb(0, 0, 0, 5, 4.5, 5, [0.4, 0.3, 0.2]),
      pb(0, 4.5, 0, 4, 3.5, 4, [0.4, 0.6, 0.28]),
      pb(0, 8, 0, 2, 2, 2, [0.5, 0.75, 0.35]),
    ]),
  },
  marsh_wisp: {
    model: M([
      pb(0, 5, 0, 4.5, 8, 4.5, [0.55, 0.8, 0.88]),
      pb(0, 7, 0, 2.5, 5, 2.5, [0.85, 0.97, 1]),
      pb(0, 13.5, 0, 2, 3, 2, [0.9, 1, 1]),
    ]),
  },
  rime_shade: {
    model: M([
      pb(0, 3, 0, 6, 13, 4, [0.68, 0.76, 0.92]),
      pb(0, 16, 0, 5, 5, 4, [0.78, 0.86, 0.98]),
      pb(-3.8, 8, 0, 1.5, 7, 1.5, [0.6, 0.7, 0.88]),
      pb(3.8, 8, 0, 1.5, 7, 1.5, [0.6, 0.7, 0.88]),
    ]),
  },
  hollow_watcher: {
    model: M([
      pb(0, 6, 0, 7, 7, 5, [0.2, 0.16, 0.28]),
      pb(0, 7.5, 2.2, 4, 4, 1.5, [0.9, 0.8, 1]),
      pb(0, 13.2, 0, 2, 2, 2, [0.25, 0.2, 0.34]),
    ]),
  },
  duskwing: {
    headBoxes: [1, 2, 3],
    model: M([
      pb(0, 8, 0, 4, 5, 3.5, [0.24, 0.2, 0.3]),
      pb(0, 13, 0.5, 4, 3.5, 3, [0.3, 0.25, 0.36]),
      pb(-1.5, 16.5, 0.5, 1, 2.5, 1, [0.3, 0.25, 0.36]),
      pb(1.5, 16.5, 0.5, 1, 2.5, 1, [0.3, 0.25, 0.36]),
      pb(-6, 10.5, 0, 8, 1, 5, [0.34, 0.28, 0.42]),
      pb(6, 10.5, 0, 8, 1, 5, [0.34, 0.28, 0.42]),
    ]),
  },
};
for (const [type, r] of Object.entries(REMODELS)) {
  ENEMY_TYPES[type].model = r.model;
  if (r.headBoxes) ENEMY_TYPES[type].headBoxes = r.headBoxes;
}

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
  duskwing: 'skin_hide', rimehowl_alpha: 'skin_fur',
  // fantasy roster
  pixie: 'skin_glow', bog_ooze: 'skin_scales', scrap_goblin: 'skin_hide',
  will_o_wisp: 'skin_glow', bone_hound: 'skin_stone', cave_slime: 'skin_glow',
  frost_elemental: 'skin_glow', grave_wight: 'skin_hide', skeletal_archer: 'skin_stone',
  stone_golem: 'skin_stone', veil_crawler: 'skin_scales', gaze_orb: 'skin_glow',
};
// face-tile box index per creature (matches the remodeled box order)
const HEAD_BOX = {
  practice_dummy: 2,
  mudback_boar: 2, craghorn_ram: 2, frostmaw_wolf: 3, rimehowl_alpha: 3,
  gloomrat: 1, dune_stalker: 2, stone_pecker: 1, sunscale_serpent: 3,
  shell_snapper: 3, moss_lurker: 2, bog_shambler: 3, magma_hulk: 4,
  blight_horror: 3, rootbound_golem: 4, cinder_imp: 3, thicket_sprite: 1,
  root_creeper: 2, rootling: 1, marsh_wisp: 0, rime_shade: 1, duskwing: 1,
  // fantasy roster (eyeless orbs — will_o_wisp / gaze_orb — get no face tile)
  pixie: 1, bog_ooze: 1, scrap_goblin: 1, bone_hound: 1, cave_slime: 1,
  frost_elemental: 1, grave_wight: 1, skeletal_archer: 1, stone_golem: 1, veil_crawler: 1,
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
    const night = this.world.isNight?.() ?? false;
    for (const [, chunk] of this.world.chunks) {
      for (const sp of chunk.spawns) {
        seen.add(sp.id);
        if (this.entities.has(sp.id)) continue;
        const killedAt = this.killed.get(sp.id);
        if (killedAt !== undefined && killedAt > this.world.time) continue;
        const def = ENEMY_TYPES[sp.type];
        if (!def || def.noOverworld) continue;
        if (def.nocturnal && !night) continue; // night creatures wait for dark
        this.killed.delete(sp.id);
        this.entities.set(sp.id, {
          id: sp.id, type: sp.type, def,
          x: sp.x + 0.5, y: sp.y, z: sp.z + 0.5,
          homeX: sp.x + 0.5, homeZ: sp.z + 0.5,
          yaw: Math.random() * Math.PI * 2,
          hp: def.hp,
          wanderT: Math.random() * 4,
          boss: !!sp.boss,
          // rare gilded variant: worth far more when hunted
          shiny: !sp.boss && !def.boss && Math.random() < (def.shinyChance ?? 0.015),
        });
      }
    }
    for (const id of [...this.entities.keys()]) {
      const e = this.entities.get(id);
      if (!seen.has(id) && !e.transient) this.entities.delete(id);
    }
    // nocturnal creatures fade at dawn (unless mid-fight)
    if (!night) {
      for (const [id, e] of [...this.entities]) {
        if (e.def.nocturnal && !e.rsEngaged && !e.transient) this.entities.delete(id);
      }
    }
  }

  update(dt, player, inCombat) {
    for (const e of this.entities.values()) {
      // Gravity / ground-follow: every mob settles onto the surface directly
      // beneath it each frame, so it never floats over a ledge, after terrain
      // changes, while idle, or mid-combat. Falls smoothly; movement handles
      // step-ups. Runs for ALL entities (stationary & combat-engaged included).
      const landing = this.world.groundBelow(Math.floor(e.x), Math.floor(e.z), e.y);
      if (landing !== null && landing < e.y) e.y = Math.max(landing, e.y - 14 * dt);

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
