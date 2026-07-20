// NPCs: models, dialogue trees, shop stock. Dialogue actions hook into quests.
export const NPC_DEFS = {
  maren: {
    label: 'Elder Maren',
    role: 'Guide of Brookhollow',
    model: [
      { x: -0.18, y: 0, z: -0.1, w: 0.16, h: 0.55, d: 0.2, color: [0.35, 0.3, 0.45] },
      { x: 0.02, y: 0, z: -0.1, w: 0.16, h: 0.55, d: 0.2, color: [0.35, 0.3, 0.45] },
      { x: -0.25, y: 0.55, z: -0.125, w: 0.5, h: 0.65, d: 0.25, color: [0.5, 0.42, 0.62] },
      { x: -0.36, y: 0.6, z: -0.1, w: 0.11, h: 0.55, d: 0.2, color: [0.45, 0.38, 0.56] },
      { x: 0.25, y: 0.6, z: -0.1, w: 0.11, h: 0.55, d: 0.2, color: [0.45, 0.38, 0.56] },
      { x: -0.16, y: 1.2, z: -0.16, w: 0.32, h: 0.32, d: 0.32, color: [0.85, 0.72, 0.6] },
      { x: -0.16, y: 1.52, z: -0.16, w: 0.32, h: 0.1, d: 0.32, color: [0.8, 0.8, 0.85] },
      { x: 0.3, y: 0.3, z: -0.04, w: 0.08, h: 1.3, d: 0.08, color: [0.55, 0.42, 0.28] },
    ],
    dialogue: 'maren_root',
  },
  tam: {
    label: 'Merchant Tam',
    role: 'General goods',
    model: [
      { x: -0.18, y: 0, z: -0.1, w: 0.16, h: 0.5, d: 0.2, color: [0.3, 0.34, 0.3] },
      { x: 0.02, y: 0, z: -0.1, w: 0.16, h: 0.5, d: 0.2, color: [0.3, 0.34, 0.3] },
      { x: -0.27, y: 0.5, z: -0.14, w: 0.54, h: 0.6, d: 0.28, color: [0.7, 0.5, 0.3] },
      { x: -0.38, y: 0.55, z: -0.1, w: 0.11, h: 0.5, d: 0.2, color: [0.62, 0.44, 0.26] },
      { x: 0.27, y: 0.55, z: -0.1, w: 0.11, h: 0.5, d: 0.2, color: [0.62, 0.44, 0.26] },
      { x: -0.16, y: 1.1, z: -0.16, w: 0.32, h: 0.32, d: 0.32, color: [0.8, 0.66, 0.52] },
      { x: -0.2, y: 1.42, z: -0.2, w: 0.4, h: 0.12, d: 0.4, color: [0.5, 0.36, 0.2] },
    ],
    dialogue: 'tam_root',
    shop: {
      sells: [
        { item: 'travel_biscuit', price: 6 },
        { item: 'plant_fibre', price: 2 },
        { item: 'rough_stone', price: 2 },
        { item: 'crude_axe', price: 18 },
        { item: 'crude_pickaxe', price: 18 },
        { item: 'fishing_rod', price: 20 },
        { item: 'crude_shovel', price: 14 },
        { item: 'torch_item', price: 3 },
        { item: 'minor_healing_tonic', price: 14 },
      ],
      // Merchant pays roughly 40% of a fair market value
      buys: {
        fernwood_log: 2, silverbark_log: 5, emberpine_log: 8,
        copper_ore_chunk: 3, tin_ore_chunk: 3, iron_ore_chunk: 6, silver_ore_chunk: 12,
        silverfin: 3, mudwhisker: 5, duskeel: 10, boar_haunch: 3, boarhide: 3,
        bitterleaf: 2, springroot: 2, tartberries: 1, pottery_shard: 4, old_coin: 6,
        bone_needle: 5, rough_gem: 15, amber_resin: 8, clay_lump: 2, grainsheaf: 2,
        bronze_bar: 10, iron_bar: 18, relic_fragment: 20,
      },
    },
  },
};

// Dialogue graph. Options can carry action tags read by main.js:
//   startQuest:<id>, turnIn:<id>, shop, close
export const DIALOGUES = {
  maren_root: {
    speaker: 'maren',
    text: () => `Ah — you're awake! You washed up at our gates two nights ago. I'm Maren, elder of Brookhollow. This valley is generous to those who work it… and unkind past the lantern line. What do you need, traveler?`,
    options: [
      { label: 'What is this place?', next: 'maren_about' },
      { label: 'What should I do first?', next: 'maren_quest_hub' },
      { label: 'Any advice for surviving?', next: 'maren_advice' },
      { label: 'Farewell.', action: 'close' },
    ],
  },
  maren_about: {
    speaker: 'maren',
    text: () => `Brookhollow is the last friendly hearth before the wilds. We keep a grove, a mine, a pond and good soil. Beyond the valley the land grows stranger — highlands, marshes, worse. They say the Rootgrave under our mine has been… restless.`,
    options: [
      { label: 'What should I do first?', next: 'maren_quest_hub' },
      { label: 'Farewell.', action: 'close' },
    ],
  },
  maren_advice: {
    speaker: 'maren',
    text: () => `Practice a craft and it will remember you — every skill grows with use. Watch a resource after you take from it: the land regrows in its own time. And never fight on low ground if you can help it.`,
    options: [
      { label: 'Thanks.', next: 'maren_root' },
    ],
  },
  maren_quest_hub: { speaker: 'maren', dynamic: 'maren' }, // filled in by quest system
  tam_root: {
    speaker: 'tam',
    text: () => `Tam's the name — goods bought, goods sold, no questions about the mud. Take a look?`,
    options: [
      { label: 'Show me your wares.', action: 'shop' },
      { label: 'Got any work?', next: 'tam_work' },
      { label: 'Later.', action: 'close' },
    ],
  },
  tam_work: { speaker: 'tam', dynamic: 'tam' },
};
