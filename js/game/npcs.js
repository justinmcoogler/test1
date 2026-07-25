// NPCs: models, dialogue trees, shop stock. Dialogue actions hook into quests.
// Every villager shares the player's blocky-humanoid skeleton (16px grid,
// head 8×8×8, torso 8×12×4, limbs 4×12×4) so people all read as one species.
// Box order matters: legs ×2, torso, arm L, arm R, head, then accessories.
const HPX = 1.8 / 32;
const hb = (fx, fy, fz, w, h, d, color) => ({ x: fx * HPX, y: fy * HPX, z: fz * HPX, w: w * HPX, h: h * HPX, d: d * HPX, color });
function humanoid({ skin, top, sleeves, bottom }, extras = []) {
  return [
    hb(-4, 0, -2, 4, 12, 4, bottom),   // 0 left leg
    hb(0, 0, -2, 4, 12, 4, bottom),    // 1 right leg
    hb(-4, 12, -2, 8, 12, 4, top),     // 2 torso
    hb(-8, 12, -2, 4, 12, 4, sleeves), // 3 left arm
    hb(4, 12, -2, 4, 12, 4, sleeves),  // 4 right arm
    hb(-4, 24, -4, 8, 8, 8, skin),     // 5 head (face applied by the renderer)
    ...extras,
  ];
}
// standard rig part indices for humanoid NPCs (extras ride with the body,
// except indices listed in headExtra which follow the head)
export const NPC_RIG = { legL: 0, legR: 1, torso: 2, armL: 3, armR: 4, head: 5 };

export const NPC_DEFS = {
  maren: {
    label: 'Elder Maren',
    role: 'Guide of Brookhollow',
    model: humanoid(
      { skin: [0.85, 0.72, 0.6], top: [0.5, 0.42, 0.62], sleeves: [0.45, 0.38, 0.56], bottom: [0.35, 0.3, 0.45] },
      [
        hb(-4.4, 31.5, -4.4, 8.8, 2.5, 8.8, [0.85, 0.85, 0.9]),  // 6 silver hair
        hb(-4.4, 12, -2.4, 8.8, 13, 1, [0.42, 0.35, 0.55]),      // 7 robe front
        hb(6, 0, 1, 1.5, 26, 1.5, [0.55, 0.42, 0.28]),           // 8 walking staff
        hb(5.5, 26, 0.5, 2.5, 2.5, 2.5, [0.6, 0.85, 0.9]),       // 9 staff crystal
      ]
    ),
    headExtra: [6],
    dialogue: 'maren_root',
  },
  tam: {
    label: 'Merchant Tam',
    role: 'General goods',
    model: humanoid(
      { skin: [0.8, 0.66, 0.52], top: [0.7, 0.5, 0.3], sleeves: [0.62, 0.44, 0.26], bottom: [0.3, 0.34, 0.3] },
      [
        hb(-5.5, 31, -5.5, 11, 2, 11, [0.5, 0.36, 0.2]),         // 6 hat brim
        hb(-3.5, 33, -3.5, 7, 3, 7, [0.55, 0.4, 0.22]),          // 7 hat top
        hb(-4.4, 13, -2.4, 8.8, 6, 1, [0.85, 0.78, 0.6]),        // 8 apron
      ]
    ),
    headExtra: [6, 7],
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
        { item: 'grain_seeds', price: 4 },
        { item: 'minor_healing_tonic', price: 14 },
      ],
      // Merchant pays roughly 40% of a fair market value
      buys: {
        fernwood_log: 2, emberpine_log: 8,
        copper_ore: 3, tin_ore: 3, iron_ore: 6, silver_ore: 12,
        silverfin: 3, mudwhisker: 5, duskeel: 10, reedpike: 8, saltcrab: 14, palefin: 26,
        boar_haunch: 3, boarhide: 3,
        bitterleaf: 2, springroot: 2, tartberries: 1, pottery_shard: 4, old_coin: 6,
        bone_needle: 5, rough_gem: 15, amber_resin: 8, clay_lump: 2, grainsheaf: 2, golden_grain: 20,
        bronze_bar: 10, iron_bar: 18, relic_fragment: 20,
      },
    },
  },
};

NPC_DEFS.sylla = {
  label: 'Warden Sylla',
  role: 'Keeper of the Frostwatch',
  model: humanoid(
    { skin: [0.78, 0.64, 0.52], top: [0.75, 0.78, 0.85], sleeves: [0.65, 0.68, 0.76], bottom: [0.28, 0.3, 0.38] },
    [
      hb(-4.5, 30.5, -4.5, 9, 3.5, 9, [0.88, 0.9, 0.95]),      // 6 fur hood
      hb(-4.4, 12, -2.4, 8.8, 12.5, 1, [0.68, 0.72, 0.8]),     // 7 cloak front
      hb(6, 0, 1, 1.3, 30, 1.3, [0.5, 0.4, 0.3]),              // 8 spear haft
      hb(5.6, 30, 0.6, 2, 4, 2, [0.85, 0.9, 0.98]),            // 9 spear head
    ]
  ),
  headExtra: [6],
  dialogue: 'sylla_root',
};

// Pip — the friendly guide of Numbers Meadow (kids' Learning Mode, Phase 1).
// A small, brightly dressed helper who hands the child their math lessons.
NPC_DEFS.pip = {
  label: 'Pip',
  role: 'Meadow Guide',
  model: humanoid(
    { skin: [0.95, 0.8, 0.62], top: [0.35, 0.72, 0.42], sleeves: [0.95, 0.82, 0.3], bottom: [0.4, 0.5, 0.85] },
    [
      hb(-4.6, 31.5, -4.6, 9.2, 3, 9.2, [0.9, 0.35, 0.45]),    // 6 round red cap
      hb(-1, 34.5, -1, 2, 2, 2, [0.98, 0.86, 0.35]),           // 7 gold cap bobble
      hb(-4.4, 13, -2.4, 8.8, 5, 1, [0.98, 0.98, 0.95]),       // 8 bright collar
    ]
  ),
  headExtra: [6, 7],
  dialogue: 'pip_root',
};

// Dialogue graph. Options can carry action tags read by main.js/ui.js:
//   startQuest:<id>, turnIn:<id>, startLesson:<area>, shop, close
export const DIALOGUES = {
  pip_root: {
    speaker: 'pip',
    text: () => `Hi hi! I'm Pip, and this is Numbers Meadow! We learn by BUILDING. Put blocks on the soft mat and we'll count them together. Ready to play with numbers?`,
    options: [
      { label: 'Yes! Give me a lesson.', action: 'startLesson:numbers_meadow', cls: 'quest-offer' },
      { label: 'How does it work?', next: 'pip_how' },
      { label: 'Maybe later.', action: 'close' },
    ],
  },
  pip_how: {
    speaker: 'pip',
    text: () => `Easy peasy! I'll ask for some blocks — like "place 7 red blocks." Pick the blocks from your bag and place them right on the mat. When you get it, we celebrate and you earn more play time! Wrong guess? No worries — just try again.`,
    options: [
      { label: "Okay, let's go!", action: 'startLesson:numbers_meadow', cls: 'quest-offer' },
      { label: 'Got it.', action: 'close' },
    ],
  },
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
  sylla_root: {
    speaker: 'sylla',
    text: () => `Hold there — oh. You're the one Maren wrote about. Welcome to the Frostwatch, such as it is: one fire, one forge, and a great deal of wind. The wolves out here answer to something bigger. Mind the den north of camp.`,
    options: [
      { label: 'What is this place?', next: 'sylla_about' },
      { label: 'Need a hand with anything?', next: 'sylla_hub' },
      { label: 'Stay warm.', action: 'close' },
    ],
  },
  sylla_about: {
    speaker: 'sylla',
    text: () => `The Frostwatch is the valley's tripwire. Anything that comes down from the deep tundra passes us first. Lately the passing has gone one way — wolves, more every week, drawn in by the big alpha that took the old ruin. Use the forge if you need it; that's what it's for.`,
    options: [
      { label: 'Need a hand with anything?', next: 'sylla_hub' },
      { label: 'Stay warm.', action: 'close' },
    ],
  },
  sylla_hub: { speaker: 'sylla', dynamic: 'sylla' },
};
