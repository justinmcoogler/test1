// Original creatures: stats, voxel-box models, behaviors, drops.
// EnemyManager runs overworld entities (wander/aggro); combat.js takes over in battle.
import { emit } from '../core/events.js';

// Voxel-box model helper: boxes centered on x, standing on y=0.
const M = (boxes) => boxes;
const box = (x, y, z, w, h, d, color) => ({ x: x - w / 2, y, z: z - d / 2, w, h, d, color });

// THE WHOLE ROSTER IS EIGHTEEN CREATURES, and that is the design.
//
// This world used to hold sixty natives plus a ninety-six-model imported pack:
// stags, wisps, elementals, golems, sky whales, five kinds of undead. It read
// like a bestiary someone was filling in rather than a place someone lived. You
// could not tell, at a glance, whether the thing across the field was a threat,
// and you could not learn the answer either, because there were too many things
// and each appeared too rarely to teach you anything.
//
// So: livestock, vermin, and goblins. The farm animals are the world's calm —
// you meet them near towns and they mostly ignore you. The rat is the floor of
// the threat scale. And every hostile thing in the world is a goblin, in one of
// six liveries plus two chiefs, all built on ONE BODY PLAN so the silhouette
// never changes and the colour alone tells you where you are and what it can do.
// You learn to read a goblin once, in the first hour, and that reading holds for
// the rest of the game — in a bog, in a mine, on a glacier, at the bottom of a
// vault. A roster you can actually hold in your head beats a roster that is
// merely large.
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

  // ---- farm animals (remade visually by js/game/mobremakes/batch_farm.js) ----
  // The world's calm. They graze near towns, they mostly ignore you, and they
  // are where hides, meat and sinew come from. Models below are the
  // format-required fallback; MOB_REMAKES paints the real textured model.
  cow: {
    label: 'Cow', behavior: 'defensive', tier: 0,
    hp: 24, atk: 5, acc: 54, evasion: 6, armor: 2, speed: 4, moveRange: 3,
    abilities: ['skull_rush'], element: null, weak: [], resist: [],
    xp: 26, huntXp: 20, respawn: 120, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 3], chance: 1 },
      { item: 'boarhide', qty: [1, 2], chance: 0.9 },
      { item: 'sinew', qty: [1, 1], chance: 0.6 },
    ],
    desc: 'A placid black-and-white grazer, slow to anger but quick to lower its horns.',
    recommend: 'Harmless if left alone — corner it and it will shove back.',
    model: M([
      box(0, 0.52, 0, 0.64, 0.5, 1.1, [0.9, 0.9, 0.86]),
      box(0, 0.7, 0.55, 0.36, 0.36, 0.4, [0.85, 0.85, 0.8]),
    ]),
  },
  pig: {
    label: 'Pig', behavior: 'defensive', tier: 0,
    hp: 18, atk: 4, acc: 52, evasion: 8, armor: 1, speed: 4, moveRange: 3,
    abilities: [], element: null, weak: [], resist: [],
    xp: 20, huntXp: 16, respawn: 100, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 2], chance: 1 },
      { item: 'boarhide', qty: [1, 2], chance: 0.8 },
    ],
    desc: 'A round pink porker snuffling for roots, with a flat snout and a curly tail.',
    recommend: 'Skittish but stubborn — a couple of solid hits settle it.',
    model: M([
      box(0, 0.4, 0, 0.6, 0.44, 1.0, [0.9, 0.63, 0.63]),
      box(0, 0.5, 0.5, 0.4, 0.38, 0.34, [0.9, 0.64, 0.64]),
    ]),
  },
  sheep: {
    label: 'Sheep', behavior: 'defensive', tier: 0,
    hp: 18, atk: 3, acc: 50, evasion: 8, armor: 1, speed: 4, moveRange: 3,
    abilities: [], element: null, weak: [], resist: [],
    xp: 20, huntXp: 16, respawn: 100, aggroRange: 0,
    drops: [
      { item: 'white_wool', qty: [1, 3], chance: 1 },
      { item: 'boar_haunch', qty: [1, 2], chance: 0.7 },
      { item: 'sinew', qty: [1, 1], chance: 0.5 },
    ],
    desc: 'A cloud of cream fleece on stubby dark legs, forever chewing.',
    recommend: 'Shear it or spare it — either way it barely fights back.',
    model: M([
      box(0, 0.5, 0, 0.64, 0.54, 1.0, [0.9, 0.87, 0.79]),
      box(0, 0.66, 0.52, 0.3, 0.3, 0.32, [0.2, 0.18, 0.16]),
    ]),
  },
  goat: {
    label: 'Goat', behavior: 'defensive', tier: 0,
    hp: 18, atk: 5, acc: 56, evasion: 12, armor: 1, speed: 6, moveRange: 4,
    abilities: ['skull_rush'], element: null, weak: [], resist: [],
    xp: 22, huntXp: 18, respawn: 110, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 2], chance: 0.9 },
      { item: 'boarhide', qty: [1, 2], chance: 0.8 },
      { item: 'sinew', qty: [1, 1], chance: 0.6 },
    ],
    desc: 'A wiry grey nanny with back-swept horns and a stubborn chin-beard.',
    recommend: 'Nimble and butts hard — watch the horns when it charges.',
    model: M([
      box(0, 0.5, 0, 0.48, 0.42, 0.95, [0.54, 0.49, 0.4]),
      box(0, 0.7, 0.5, 0.3, 0.3, 0.34, [0.56, 0.5, 0.42]),
    ]),
  },
  horse: {
    label: 'Horse', behavior: 'defensive', tier: 0,
    hp: 30, atk: 6, acc: 58, evasion: 14, armor: 1, speed: 9, moveRange: 5,
    abilities: [], element: null, weak: [], resist: [],
    xp: 34, huntXp: 26, respawn: 140, aggroRange: 0,
    drops: [
      { item: 'boarhide', qty: [1, 2], chance: 0.9 },
      { item: 'cured_hide', qty: [1, 1], chance: 0.4 },
      { item: 'sinew', qty: [1, 2], chance: 0.6 },
    ],
    desc: 'A tall bay with a black mane and long legs, more likely to bolt than to bite.',
    recommend: 'Fast and strong — pin it down before it kicks and runs.',
    model: M([
      box(0, 0.72, 0, 0.52, 0.5, 1.2, [0.49, 0.29, 0.16]),
      box(0, 1.3, 0.55, 0.26, 0.26, 0.44, [0.49, 0.29, 0.16]),
    ]),
  },
  chicken: {
    label: 'Chicken', behavior: 'passive', tier: 0,
    hp: 8, atk: 1, acc: 48, evasion: 20, armor: 0, speed: 6, moveRange: 3,
    abilities: [], element: null, weak: [], resist: [],
    xp: 8, huntXp: 10, respawn: 60, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 1], chance: 1 },
      { item: 'sinew', qty: [1, 1], chance: 0.4 },
    ],
    desc: 'A fussy white hen with a red comb, all cluck and no threat.',
    recommend: 'Harmless — one swing is plenty.',
    model: M([
      box(0, 0.34, 0, 0.32, 0.36, 0.5, [0.94, 0.92, 0.88]),
      box(0, 0.68, 0.1, 0.26, 0.24, 0.24, [0.95, 0.93, 0.89]),
    ]),
  },
  duck: {
    label: 'Duck', behavior: 'passive', tier: 0,
    hp: 8, atk: 1, acc: 48, evasion: 20, armor: 0, speed: 6, moveRange: 3,
    abilities: [], element: null, weak: [], resist: [],
    xp: 8, huntXp: 10, respawn: 60, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 1], chance: 1 },
      { item: 'sinew', qty: [1, 1], chance: 0.4 },
    ],
    desc: 'A waddling farm duck with a flat orange bill and webbed feet.',
    recommend: 'Harmless — it flaps more than it fights.',
    model: M([
      box(0, 0.3, 0, 0.34, 0.32, 0.6, [0.93, 0.94, 0.92]),
      box(0, 0.62, 0.2, 0.22, 0.2, 0.24, [0.48, 0.35, 0.21]),
    ]),
  },
  rabbit: {
    label: 'Rabbit', behavior: 'passive', tier: 0,
    hp: 6, atk: 1, acc: 48, evasion: 30, armor: 0, speed: 9, moveRange: 4,
    abilities: [], element: null, weak: [], resist: [],
    xp: 8, huntXp: 12, respawn: 55, aggroRange: 0,
    drops: [
      { item: 'boar_haunch', qty: [1, 1], chance: 0.8 },
      { item: 'cured_hide', qty: [1, 1], chance: 0.4 },
      { item: 'sinew', qty: [1, 1], chance: 0.5 },
    ],
    desc: 'A brown coney with long ears and a cotton tail, gone in a bound.',
    recommend: 'Quick prey — run it down before it bolts.',
    model: M([
      box(0, 0.14, 0, 0.26, 0.26, 0.44, [0.54, 0.42, 0.28]),
      box(0, 0.3, 0.18, 0.24, 0.22, 0.22, [0.56, 0.44, 0.3]),
    ]),
  },


  // ---- vermin --------------------------------------------------------------
  rat: {
    label: 'Rat', behavior: 'defensive', tier: 0,
    hp: 10, atk: 3, acc: 54, evasion: 18, armor: 0, speed: 8, moveRange: 4,
    abilities: [], element: null, weak: [], resist: [],
    xp: 14, huntXp: 10, respawn: 70, aggroRange: 3,
    headBoxes: [1],
    drops: [
      { item: 'sinew', qty: [1, 1], chance: 0.4 },
      { item: 'plant_fibre', qty: [1, 2], chance: 0.5 },
      { item: 'grave_rot', qty: [1, 1], chance: 0.15 },
    ],
    desc: 'Grey, quick, and entirely uninterested in you until it is cornered. Where there is one there are forty you have not seen.',
    recommend: 'Barely a fight. It runs before it bites, and it is worth more as a source of sinew than as a kill.',
    model: M([
      box(0, 0.08, 0, 0.3, 0.22, 0.5, [0.44, 0.42, 0.4]),
      box(0, 0.2, 0.28, 0.2, 0.18, 0.2, [0.5, 0.48, 0.45]),
      box(-0.07, 0.34, 0.28, 0.07, 0.08, 0.03, [0.62, 0.5, 0.5]),
      box(0.07, 0.34, 0.28, 0.07, 0.08, 0.03, [0.62, 0.5, 0.5]),
      box(0, 0.1, -0.34, 0.05, 0.05, 0.32, [0.56, 0.46, 0.44]),
    ]),
  },

  // ---- goblins -------------------------------------------------------------
  // The world's hostile roster, and all of it. One body plan in six liveries, so
  // the SILHOUETTE stays constant and the colour tells you what you are looking
  // at — which is the point of a roster built from one family: you learn to read
  // it once and it works everywhere, and a goblin in a snowfield is instantly a
  // different problem from a goblin in a mine.
  //
  // The two chiefs are the world's bosses; the hand-built quest chain runs to
  // them (js/game/quests.js).
  scrap_goblin: {
    label: 'Scrap Goblin', behavior: 'aggressive', tier: 0,
    hp: 14, atk: 5, acc: 58, evasion: 12, armor: 1, speed: 6, moveRange: 4,
    abilities: [], element: null, weak: [], resist: [],
    xp: 26, huntXp: 14, respawn: 110, aggroRange: 6,
    headBoxes: [1],
    drops: [
      { item: 'coin', qty: [3, 9], chance: 0.6 },
      { item: 'boar_haunch', qty: [1, 2], chance: 1 },
      { item: 'boarhide', qty: [1, 1], chance: 0.5 },
      { item: 'plant_fibre', qty: [1, 2], chance: 0.4 },
      { item: 'woven_cloth', qty: [1, 1], chance: 0.25 },
    ],
    desc: 'Wiry and green, draped in stolen rags and carrying something sharp it did not make. Always hungry, never brave alone.',
    recommend: 'One is a nuisance. They are rarely one.',
    model: M([
      box(0, 0.35, 0, 0.4, 0.5, 0.28, [0.42, 0.58, 0.3]),
      box(0, 0.85, 0, 0.34, 0.32, 0.32, [0.5, 0.66, 0.36]),
      box(-0.16, 0.9, 0.02, 0.14, 0.1, 0.1, [0.46, 0.6, 0.32]),
      box(0.16, 0.9, 0.02, 0.14, 0.1, 0.1, [0.46, 0.6, 0.32]),
      box(-0.26, 0.4, 0, 0.12, 0.4, 0.12, [0.4, 0.55, 0.28]),
      box(0.26, 0.4, 0, 0.12, 0.4, 0.12, [0.4, 0.55, 0.28]),
      box(-0.1, 0, 0, 0.12, 0.35, 0.12, [0.38, 0.5, 0.26]),
      box(0.1, 0, 0, 0.12, 0.35, 0.12, [0.38, 0.5, 0.26]),
      box(0, 0.4, 0.18, 0.28, 0.2, 0.06, [0.55, 0.42, 0.26]),
    ]),
  },

  bog_goblin: {
    label: 'Bog Goblin', behavior: 'aggressive', tier: 1, nocturnal: true,
    hp: 42, atk: 8, acc: 58, evasion: 4, armor: 4, speed: 3, moveRange: 2,
    abilities: ['mire_grip'], element: 'nature', weak: ['fire'], resist: ['nature'],
    xp: 55, huntXp: 30, respawn: 150, aggroRange: 6,
    headBoxes: [1],
    drops: [
      { item: 'coin', qty: [4, 11], chance: 0.6 },
      { item: 'grave_rot', qty: [1, 2], chance: 0.5 },
      { item: 'amber_resin', qty: [1, 1], chance: 0.2 },
    ],
    desc: 'Mottled olive and silt-brown, plastered in the mud it lives under. It comes up out of standing water at about knee height and it is already swinging.',
    recommend: 'It fights where the ground holds you. Get onto dry footing and it loses most of what makes it dangerous.',
    model: M([
      box(0, 0.35, 0, 0.44, 0.5, 0.3, [0.34, 0.4, 0.26]),
      box(0, 0.85, 0, 0.34, 0.32, 0.32, [0.4, 0.46, 0.3]),
      box(-0.16, 0.9, 0.02, 0.14, 0.1, 0.1, [0.36, 0.42, 0.28]),
      box(0.16, 0.9, 0.02, 0.14, 0.1, 0.1, [0.36, 0.42, 0.28]),
      box(-0.27, 0.4, 0, 0.13, 0.4, 0.13, [0.32, 0.38, 0.24]),
      box(0.27, 0.4, 0, 0.13, 0.4, 0.13, [0.32, 0.38, 0.24]),
      box(-0.1, 0, 0, 0.13, 0.35, 0.13, [0.3, 0.35, 0.22]),
      box(0.1, 0, 0, 0.13, 0.35, 0.13, [0.3, 0.35, 0.22]),
      box(0, 1.02, 0, 0.3, 0.1, 0.3, [0.42, 0.5, 0.3]),
    ]),
  },

  cave_goblin: {
    label: 'Cave Goblin', behavior: 'aggressive', tier: 1, nocturnal: true,
    hp: 24, atk: 8, acc: 64, evasion: 20, armor: 1, speed: 9, moveRange: 6,
    abilities: [], element: null, weak: [], resist: [],
    xp: 44, huntXp: 24, respawn: 130, aggroRange: 9,
    headBoxes: [1],
    drops: [
      { item: 'coin', qty: [3, 8], chance: 0.6 },
      { item: 'rough_stone', qty: [1, 3], chance: 0.5 },
      { item: 'spider_silk', qty: [1, 2], chance: 0.35 },
      { item: 'rough_gem', qty: [1, 1], chance: 0.15 },
    ],
    desc: 'Bone-pale from a life without sun, with eyes far too large for its face. It has never needed a torch and it can see you carrying one from a long way off.',
    recommend: 'It fights better in the dark than you do. Light the room before you commit.',
    model: M([
      box(0, 0.34, 0, 0.38, 0.48, 0.26, [0.72, 0.7, 0.66]),
      box(0, 0.82, 0, 0.34, 0.32, 0.32, [0.78, 0.76, 0.72]),
      box(-0.17, 0.88, 0.02, 0.16, 0.12, 0.1, [0.74, 0.72, 0.68]),
      box(0.17, 0.88, 0.02, 0.16, 0.12, 0.1, [0.74, 0.72, 0.68]),
      box(-0.07, 0.86, 0.16, 0.08, 0.08, 0.04, [0.95, 0.85, 0.4]),
      box(0.07, 0.86, 0.16, 0.08, 0.08, 0.04, [0.95, 0.85, 0.4]),
      box(-0.25, 0.38, 0, 0.12, 0.4, 0.12, [0.68, 0.66, 0.62]),
      box(0.25, 0.38, 0, 0.12, 0.4, 0.12, [0.68, 0.66, 0.62]),
      box(-0.1, 0, 0, 0.12, 0.34, 0.12, [0.64, 0.62, 0.58]),
      box(0.1, 0, 0, 0.12, 0.34, 0.12, [0.64, 0.62, 0.58]),
    ]),
  },

  ash_goblin: {
    label: 'Ash Goblin', behavior: 'aggressive', tier: 2,
    hp: 34, atk: 12, acc: 68, evasion: 16, armor: 2, speed: 8, moveRange: 5,
    abilities: ['ember_fling'], element: 'fire', weak: [], resist: ['fire'],
    xp: 90, huntXp: 46, respawn: 180, aggroRange: 8,
    headBoxes: [1],
    drops: [
      { item: 'coin', qty: [10, 24], chance: 0.7 },
      { item: 'charcoal', qty: [1, 3], chance: 0.5 },
      { item: 'emberstone_shard', qty: [1, 1], chance: 0.25 },
    ],
    desc: 'Burnt-red and grey with ash worked into every crease, and it carries fire the way other goblins carry a knife — casually, and too close to itself.',
    recommend: 'Fire-proofed and it throws. Close the distance or find something that is not flammable to stand behind.',
    model: M([
      box(0, 0.36, 0, 0.44, 0.52, 0.3, [0.52, 0.26, 0.2]),
      box(0, 0.88, 0, 0.36, 0.34, 0.34, [0.6, 0.32, 0.24]),
      box(-0.18, 0.94, 0.02, 0.15, 0.11, 0.1, [0.56, 0.3, 0.22]),
      box(0.18, 0.94, 0.02, 0.15, 0.11, 0.1, [0.56, 0.3, 0.22]),
      box(-0.07, 0.9, 0.18, 0.08, 0.08, 0.04, [1, 0.7, 0.25]),
      box(0.07, 0.9, 0.18, 0.08, 0.08, 0.04, [1, 0.7, 0.25]),
      box(-0.28, 0.4, 0, 0.13, 0.42, 0.13, [0.46, 0.24, 0.18]),
      box(0.28, 0.4, 0, 0.13, 0.42, 0.13, [0.46, 0.24, 0.18]),
      box(-0.11, 0, 0, 0.13, 0.36, 0.13, [0.42, 0.22, 0.17]),
      box(0.11, 0, 0, 0.13, 0.36, 0.13, [0.42, 0.22, 0.17]),
      box(0.34, 0.62, 0.1, 0.12, 0.16, 0.12, [1, 0.55, 0.15]),
    ]),
  },

  frost_goblin: {
    label: 'Frost Goblin', behavior: 'aggressive', tier: 2,
    hp: 34, atk: 11, acc: 68, evasion: 10, armor: 3, speed: 5, moveRange: 4,
    abilities: ['chill_bite'], element: 'ice', weak: ['fire'], resist: ['ice'],
    xp: 92, huntXp: 46, respawn: 190, aggroRange: 7,
    headBoxes: [1],
    drops: [
      { item: 'coin', qty: [10, 26], chance: 0.7 },
      { item: 'cured_hide', qty: [1, 2], chance: 0.5 },
      { item: 'flame_opal', qty: [1, 1], chance: 0.1 },
    ],
    desc: 'Blue-white and thick with rime, wrapped in more fur than it can possibly need. It does not hurry, because up here nothing you do is going to be quick either.',
    recommend: 'Armoured and cold-proof. It will outlast you in a blizzard — fight it somewhere sheltered or not at all.',
    model: M([
      box(0, 0.36, 0, 0.46, 0.52, 0.32, [0.62, 0.72, 0.8]),
      box(0, 0.88, 0, 0.36, 0.34, 0.34, [0.7, 0.8, 0.88]),
      box(-0.18, 0.94, 0.02, 0.15, 0.11, 0.1, [0.66, 0.76, 0.84]),
      box(0.18, 0.94, 0.02, 0.15, 0.11, 0.1, [0.66, 0.76, 0.84]),
      box(0, 0.6, 0, 0.52, 0.24, 0.4, [0.86, 0.88, 0.9]),
      box(-0.29, 0.4, 0, 0.13, 0.42, 0.13, [0.56, 0.66, 0.74]),
      box(0.29, 0.4, 0, 0.13, 0.42, 0.13, [0.56, 0.66, 0.74]),
      box(-0.11, 0, 0, 0.13, 0.36, 0.13, [0.52, 0.62, 0.7]),
      box(0.11, 0, 0, 0.13, 0.36, 0.13, [0.52, 0.62, 0.7]),
    ]),
  },

  goblin_slinger: {
    label: 'Goblin Slinger', behavior: 'aggressive', tier: 2,
    hp: 26, atk: 11, acc: 72, evasion: 12, armor: 2, speed: 6, moveRange: 4,
    abilities: ['shard_spit'], ranged: true, range: 5, element: null, weak: [], resist: [],
    xp: 88, huntXp: 44, respawn: 170, aggroRange: 10,
    headBoxes: [1],
    drops: [
      { item: 'coin', qty: [8, 18], chance: 0.7 },
      { item: 'arrow', qty: [2, 6], chance: 0.5 },
      { item: 'sinew', qty: [1, 2], chance: 0.3 },
    ],
    desc: 'A yellow-green runt with a leather sling and an unreasonable eye for a gap. It keeps its distance, and the whole warband fights better because of it.',
    recommend: 'Kill it first. Everything else in the band is a melee problem, and this is not.',
    model: M([
      box(0, 0.32, 0, 0.36, 0.46, 0.26, [0.58, 0.62, 0.28]),
      box(0, 0.78, 0, 0.32, 0.3, 0.3, [0.66, 0.7, 0.32]),
      box(-0.16, 0.84, 0.02, 0.15, 0.11, 0.1, [0.62, 0.66, 0.3]),
      box(0.16, 0.84, 0.02, 0.15, 0.11, 0.1, [0.62, 0.66, 0.3]),
      box(-0.24, 0.36, 0, 0.11, 0.38, 0.11, [0.54, 0.58, 0.26]),
      box(0.24, 0.36, 0, 0.11, 0.38, 0.11, [0.54, 0.58, 0.26]),
      box(-0.09, 0, 0, 0.11, 0.32, 0.11, [0.5, 0.54, 0.24]),
      box(0.09, 0, 0, 0.11, 0.32, 0.11, [0.5, 0.54, 0.24]),
      box(0.3, 0.5, 0.14, 0.06, 0.3, 0.06, [0.48, 0.36, 0.22]),
    ]),
  },

  goblin_warchief: {
    label: 'Gorrak the Warchief', behavior: 'aggressive', tier: 1, boss: true,
    hp: 82, atk: 10, acc: 62, evasion: 2, armor: 4, speed: 4, moveRange: 2,
    abilities: ['club_slam', 'boulder_swat'], element: null, weak: [], resist: [],
    // Half health and it stops fighting you alone. A warchief's authority IS the
    // warband, so the fight's second half is the thing it commands rather than a
    // bigger version of the thing it does.
    phases: [{ at: 0.5, addAtk: 2, summon: ['scrap_goblin', 'scrap_goblin'], banner: 'Gorrak bellows — the warren answers!' }],
    xp: 500, respawn: 900, aggroRange: 6,
    headBoxes: [1],
    drops: [
      { item: 'warchief_standard', qty: [1, 1], chance: 1 },
      { item: 'coin', qty: [80, 160], chance: 1 },
      { item: 'relic_fragment', qty: [1, 2], chance: 0.5 },
    ],
    desc: 'Twice the size of anything else in the warren and wearing most of a stolen smithy. It got the job the way every warchief does, and it is not planning to give it up.',
    recommend: 'It hits harder than you can trade with. Use the pillars, and do not let it corner you.',
    model: M([
      box(0, 0.5, 0, 0.7, 0.75, 0.45, [0.34, 0.5, 0.24]),
      box(0, 1.24, 0, 0.5, 0.46, 0.46, [0.4, 0.56, 0.28]),
      box(-0.26, 1.32, 0.02, 0.2, 0.14, 0.14, [0.36, 0.52, 0.26]),
      box(0.26, 1.32, 0.02, 0.2, 0.14, 0.14, [0.36, 0.52, 0.26]),
      box(0, 1.5, 0, 0.56, 0.14, 0.56, [0.5, 0.46, 0.4]),
      box(0, 0.72, 0.26, 0.6, 0.34, 0.1, [0.52, 0.48, 0.42]),
      box(-0.44, 0.56, 0, 0.2, 0.6, 0.2, [0.32, 0.46, 0.22]),
      box(0.44, 0.56, 0, 0.2, 0.6, 0.2, [0.32, 0.46, 0.22]),
      box(-0.17, 0, 0, 0.2, 0.52, 0.2, [0.3, 0.42, 0.2]),
      box(0.17, 0, 0, 0.2, 0.52, 0.2, [0.3, 0.42, 0.2]),
      box(0.58, 0.85, 0.1, 0.14, 0.6, 0.14, [0.45, 0.32, 0.2]),
    ]),
  },

  goblin_warlord: {
    label: 'Vashk the Warlord', behavior: 'aggressive', tier: 2, boss: true,
    hp: 170, atk: 16, acc: 70, evasion: 14, armor: 4, speed: 8, moveRange: 4,
    abilities: ['skull_rush', 'molten_smash', 'ember_fling'], element: 'fire', weak: [], resist: ['fire'],
    // Two phases, and they escalate differently: first it calls the ring in,
    // then — with the adds spent — it stops conserving the brand.
    phases: [
      { at: 0.66, addAtk: 0, summon: ['frost_goblin', 'goblin_slinger'], banner: 'Vashk roars — the Ironring closes in!' },
      { at: 0.3, addAtk: 4, summon: [], banner: 'The brand comes up white-hot. Vashk has stopped pacing itself.' },
    ],
    xp: 900, respawn: 900, aggroRange: 7,
    headBoxes: [1],
    drops: [
      { item: 'coin', qty: [200, 400], chance: 1 },
      { item: 'relic_fragment', qty: [2, 4], chance: 0.7 },
      { item: 'flawless_veilcrystal', qty: [1, 1], chance: 0.4 },
      { item: 'flame_opal', qty: [1, 1], chance: 0.4 },
    ],
    desc: 'The one the warchiefs answer to. Iron-shod, ash-scarred, and carrying a brand that has been in use for a very long time. It has fought things bigger than you and it is still here.',
    recommend: 'The hardest thing in this world. Bring fire resistance, bring food, and bring a way out.',
    model: M([
      box(0, 0.55, 0, 0.78, 0.85, 0.5, [0.4, 0.34, 0.24]),
      box(0, 1.38, 0, 0.54, 0.5, 0.5, [0.48, 0.4, 0.28]),
      box(-0.28, 1.46, 0.02, 0.22, 0.15, 0.15, [0.44, 0.37, 0.26]),
      box(0.28, 1.46, 0.02, 0.22, 0.15, 0.15, [0.44, 0.37, 0.26]),
      box(-0.1, 1.42, 0.26, 0.09, 0.09, 0.05, [1, 0.6, 0.2]),
      box(0.1, 1.42, 0.26, 0.09, 0.09, 0.05, [1, 0.6, 0.2]),
      box(0, 1.68, 0, 0.62, 0.18, 0.62, [0.58, 0.5, 0.4]),
      box(0, 0.8, 0.29, 0.68, 0.4, 0.12, [0.56, 0.5, 0.44]),
      box(-0.5, 0.6, 0, 0.22, 0.68, 0.22, [0.38, 0.32, 0.22]),
      box(0.5, 0.6, 0, 0.22, 0.68, 0.22, [0.38, 0.32, 0.22]),
      box(-0.19, 0, 0, 0.22, 0.58, 0.22, [0.36, 0.3, 0.2]),
      box(0.19, 0, 0, 0.22, 0.58, 0.22, [0.36, 0.3, 0.2]),
      box(0.66, 0.95, 0.1, 0.16, 0.75, 0.16, [0.55, 0.28, 0.14]),
    ]),
  },


  // ---- mounts and pets (js/game/mounts.js) ---------------------------------
  // Ordinary creatures in the roster: you find them, you feed them, and then
  // they will carry you. All `defensive`, so a mount you are trying to tame does
  // not open by fighting you, and ring-tiered so the one that reaches the high
  // archipelago lives out where the high archipelago is.
  //
  // Their real gate is the Handling skill, not the walk — see mounts.js. These
  // stats only matter if you attack one, which is a choice you get to make and
  // then live with.
  courser: {
    label: 'Courser', behavior: 'defensive', tier: 1,
    hp: 34, atk: 7, acc: 60, evasion: 18, armor: 1, speed: 12, moveRange: 6,
    abilities: [], element: null, weak: [], resist: [],
    xp: 40, huntXp: 30, respawn: 160, aggroRange: 0,
    drops: [
      { item: 'boarhide', qty: [1, 2], chance: 0.9 },
      { item: 'cured_hide', qty: [1, 1], chance: 0.5 },
      { item: 'sinew', qty: [1, 2], chance: 0.6 },
    ],
    desc: 'A leggy grey road-horse, bred to eat distance and to know it. Stands off at exactly the range where you have to decide whether to bother.',
    recommend: 'Do not. It is worth more under you than in pieces.',
    model: M([
      box(0, 0.78, 0, 0.5, 0.48, 1.22, [0.62, 0.6, 0.58]),
      box(0, 1.36, 0.55, 0.26, 0.26, 0.46, [0.62, 0.6, 0.58]),
    ]),
  },
  destrier: {
    label: 'Destrier', behavior: 'defensive', tier: 2,
    hp: 56, atk: 10, acc: 60, evasion: 8, armor: 4, speed: 11, moveRange: 5,
    abilities: ['skull_rush'], element: null, weak: [], resist: [],
    xp: 70, huntXp: 50, respawn: 200, aggroRange: 0,
    drops: [
      { item: 'boarhide', qty: [2, 3], chance: 1 },
      { item: 'cured_hide', qty: [1, 2], chance: 0.7 },
      { item: 'sinew', qty: [1, 2], chance: 0.6 },
    ],
    desc: 'Black, deep-chested and entirely unhurried. It has been walked at by worse things than you and it did not move then either.',
    recommend: 'It will not start it. It will finish it.',
    model: M([
      box(0, 0.8, 0, 0.62, 0.56, 1.3, [0.2, 0.18, 0.18]),
      box(0, 1.44, 0.58, 0.3, 0.3, 0.48, [0.2, 0.18, 0.18]),
    ]),
  },
  steppe_runner: {
    label: 'Steppe Runner', behavior: 'defensive', tier: 2,
    hp: 38, atk: 8, acc: 64, evasion: 26, armor: 1, speed: 15, moveRange: 7,
    abilities: [], element: null, weak: [], resist: [],
    xp: 80, huntXp: 60, respawn: 220, aggroRange: 0,
    drops: [
      { item: 'boarhide', qty: [1, 2], chance: 0.9 },
      { item: 'cured_hide', qty: [1, 2], chance: 0.6 },
      { item: 'sinew', qty: [2, 3], chance: 0.7 },
    ],
    desc: 'Dun, wind-burnt and half wild, with a wall-eye and a scar nobody gave it. It is gone before you have finished deciding.',
    recommend: 'You will not catch it in a fight. That is rather the point of it.',
    model: M([
      box(0, 0.74, 0, 0.46, 0.46, 1.18, [0.76, 0.66, 0.44]),
      box(0, 1.3, 0.52, 0.24, 0.24, 0.44, [0.76, 0.66, 0.44]),
    ]),
  },
  crag_drake: {
    label: 'Crag Drake', behavior: 'defensive', tier: 2,
    hp: 70, atk: 12, acc: 64, evasion: 10, armor: 5, speed: 7, moveRange: 4,
    abilities: [], element: null, weak: [], resist: [],
    xp: 140, huntXp: 90, respawn: 320, aggroRange: 0,
    drops: [
      { item: 'cured_hide', qty: [2, 4], chance: 1 },
      { item: 'rough_gem', qty: [1, 2], chance: 0.4 },
      { item: 'sinew', qty: [2, 3], chance: 0.7 },
    ],
    desc: 'A broad slate-grey cliff dragon, wings folded like a shut door, dozing on a ledge that took you an hour to reach.',
    recommend: 'Armoured, patient, and much heavier than it looks. Feed it instead.',
    model: M([
      box(0, 0.7, 0, 0.7, 0.6, 1.5, [0.4, 0.42, 0.44]),
      box(0, 1.1, 0.95, 0.4, 0.36, 0.5, [0.44, 0.46, 0.48]),
      box(-0.9, 0.9, -0.1, 1.1, 0.1, 0.8, [0.34, 0.36, 0.38]),
      box(0.9, 0.9, -0.1, 1.1, 0.1, 0.8, [0.34, 0.36, 0.38]),
    ]),
  },
  storm_wyrm: {
    label: 'Storm Wyrm', behavior: 'defensive', tier: 3,
    hp: 88, atk: 15, acc: 70, evasion: 20, armor: 4, speed: 10, moveRange: 5,
    abilities: [], element: null, weak: [], resist: [],
    xp: 260, huntXp: 160, respawn: 420, aggroRange: 0,
    drops: [
      { item: 'cured_hide', qty: [2, 4], chance: 1 },
      { item: 'uncut_sapphire', qty: [1, 1], chance: 0.35 },
      { item: 'sinew', qty: [2, 4], chance: 0.7 },
    ],
    desc: 'Narrow, blue-black and never quite still, standing into the wind on a ridge with its wings half open. It is reading the weather and you are not.',
    recommend: 'It will simply leave. Bring fish.',
    model: M([
      box(0, 0.66, 0, 0.6, 0.52, 1.6, [0.2, 0.24, 0.36]),
      box(0, 1.06, 1.0, 0.36, 0.32, 0.52, [0.24, 0.28, 0.42]),
      box(-1.0, 0.86, -0.1, 1.3, 0.1, 0.7, [0.18, 0.2, 0.3]),
      box(1.0, 0.86, -0.1, 1.3, 0.1, 0.7, [0.18, 0.2, 0.3]),
    ]),
  },
  riftdrake: {
    label: 'Riftdrake', behavior: 'defensive', tier: 3,
    hp: 120, atk: 20, acc: 74, evasion: 16, armor: 7, speed: 12, moveRange: 6,
    abilities: [], element: null, weak: [], resist: [],
    xp: 520, huntXp: 320, respawn: 600, aggroRange: 0,
    drops: [
      { item: 'cured_hide', qty: [3, 5], chance: 1 },
      { item: 'veilcrystal', qty: [1, 2], chance: 0.6 },
      { item: 'flawless_veilcrystal', qty: [1, 1], chance: 0.2 },
    ],
    desc: 'Veil-lit along every seam, and it watches you with the particular calm of a thing that has been higher than anything else alive. The only creature in the world that can reach the top islands.',
    recommend: 'Nothing good comes of it. Bring veilcrystal and be polite.',
    model: M([
      box(0, 0.8, 0, 0.76, 0.62, 1.8, [0.26, 0.2, 0.36]),
      box(0, 1.3, 1.1, 0.44, 0.4, 0.58, [0.32, 0.24, 0.44]),
      box(-1.2, 1.04, -0.1, 1.5, 0.12, 0.9, [0.22, 0.16, 0.3]),
      box(1.2, 1.04, -0.1, 1.5, 0.12, 0.9, [0.22, 0.16, 0.3]),
      box(0, 1.44, 1.28, 0.16, 0.12, 0.1, [0.7, 0.95, 0.9]),
    ]),
  },
  dragon_whelp: {
    label: 'Dragon Whelp', behavior: 'passive', tier: 0,
    hp: 14, atk: 2, acc: 50, evasion: 28, armor: 1, speed: 8, moveRange: 4,
    abilities: [], element: 'fire', weak: [], resist: ['fire'],
    xp: 20, huntXp: 14, respawn: 300, aggroRange: 0,
    drops: [
      { item: 'charcoal', qty: [1, 2], chance: 0.5 },
      { item: 'rough_gem', qty: [1, 1], chance: 0.2 },
    ],
    desc: 'Cat-sized, permanently warm, and it will never get any bigger — whatever it is, it is not a baby anything. It sleeps in your hood and singes the lining.',
    recommend: 'It is the size of a loaf. Leave it alone.',
    model: M([
      box(0, 0.16, 0, 0.26, 0.22, 0.5, [0.6, 0.28, 0.2]),
      box(0, 0.32, 0.3, 0.2, 0.18, 0.22, [0.68, 0.32, 0.22]),
      box(-0.24, 0.3, -0.02, 0.3, 0.05, 0.26, [0.52, 0.24, 0.18]),
      box(0.24, 0.3, -0.02, 0.3, 0.05, 0.26, [0.52, 0.24, 0.18]),
      box(0, 0.14, -0.34, 0.07, 0.07, 0.3, [0.56, 0.26, 0.2]),
    ]),
  },
};

// ---- creature skins ---------------------------------------------------------
// Material tiles tinted by each box's color (Minecraft-skin style), plus a
// face tile on the head box where the creature has one. These apply to the
// fallback box models above; MOB_REMAKES creatures carry their own painted
// 64x64 texture and never reach this path.
const SKINS = {
  practice_dummy: 'skin_straw',
  rat: 'skin_fur',
  frost_goblin: 'skin_fur',    // it is mostly the furs it stole
};
// face-tile box index per creature (matches the box order in each model).
// Every goblin is box 1 — the shared body plan puts the head second, which is
// the whole point of building the roster from one plan.
const HEAD_BOX = {
  practice_dummy: 2, rat: 1,
  scrap_goblin: 1, bog_goblin: 1, cave_goblin: 1, ash_goblin: 1,
  frost_goblin: 1, goblin_slinger: 1, goblin_warchief: 1, goblin_warlord: 1,
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
      // A pet is standing right next to you by definition. Without this, calling
      // a Pocket Rat and then picking a fight enlists the rat as an ENEMY —
      // every pet type is also a wild creature type, so nothing else here can
      // tell them apart.
      if (e.pet) continue;
      if (Math.hypot(e.x - cx, e.z - cz) > radius) continue;
      if (cy !== null && Math.abs(e.y - cy) > 3.5) continue;
      group.push(e);
    }
    return group;
  }

  entityAt(x, y, z, maxDist = 1.4) {
    let best = null, bestD = maxDist;
    for (const e of this.entities.values()) {
      if (e.pet) continue;   // you cannot swing at your own pet
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
