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
    role: 'Keeper of the camp',
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

// Nan Willow — the keeper of Honeywood Farm, and the guide of Learning Mode.
//
// She replaced a small brightly-dressed sprite called Pip. A sprite is a mascot;
// Nan is somebody with a farm to run and a bad knee, which is why she needs the
// help and why a five-year-old is doing something that matters. Grey bun, apron
// over a work dress, boots.
NPC_DEFS.nan = {
  label: 'Nan Willow',
  role: 'Farm Keeper',
  model: humanoid(
    { skin: [0.94, 0.79, 0.66], top: [0.44, 0.3, 0.36], sleeves: [0.36, 0.24, 0.29], bottom: [0.3, 0.28, 0.34] },
    [
      hb(-4.4, 31.4, -4.4, 8.8, 3.2, 8.8, [0.82, 0.8, 0.78]),   // 6 grey hair, gathered
      hb(-2, 33.6, 1.6, 4, 3, 3, [0.78, 0.76, 0.74]),           // 7 the bun at the back
      hb(-4.2, 13, -2.6, 8.4, 10, 1.2, [0.9, 0.88, 0.82]),      // 8 apron front
    ]
  ),
  headExtra: [6, 7],
  dialogue: 'nan_root',
};

// ---- the deep holds --------------------------------------------------------
// Dwarves of the underground cities (js/world/undercity.js). Four roles, and
// every hold in the world draws its people from these four: main.js registers
// one model per NPC_DEFS entry at startup, so a hold discovered mid-game
// cannot mint a new id and be seen.
//
// The silhouette is the whole job — a helm brim and a beard to the belt. At the
// distance you first see one across a cavern that reads as a dwarf, and nothing
// else in the roster does.
Object.assign(NPC_DEFS, {
  hold_warden: {
    label: 'Hold Warden Brann',
    role: 'Keeper of the deep hold',
    model: humanoid(
      { skin: [0.78, 0.6, 0.46], top: [0.36, 0.33, 0.38], sleeves: [0.3, 0.28, 0.32], bottom: [0.28, 0.26, 0.3] },
      [
        hb(-4.6, 30.5, -4.6, 9.2, 2, 9.2, [0.42, 0.42, 0.46]),   // 6 helm brim
        hb(-3.5, 32, -3.5, 7, 3, 7, [0.5, 0.5, 0.55]),           // 7 helm dome
        hb(-3.6, 18, -2.6, 7.2, 8, 1.6, [0.72, 0.68, 0.6]),      // 8 beard
        hb(-4.6, 15, -2.5, 9.2, 5, 1.2, [0.45, 0.35, 0.2]),      // 9 belt + buckle
      ]
    ),
    headExtra: [6, 7, 8],
    dialogue: 'hold_warden_root',
  },
  hold_smith: {
    label: 'Forge-Master Dural',
    role: 'Smith of the deep forges',
    model: humanoid(
      { skin: [0.74, 0.55, 0.42], top: [0.34, 0.24, 0.2], sleeves: [0.3, 0.2, 0.17], bottom: [0.26, 0.22, 0.2] },
      [
        hb(-3.6, 18, -2.6, 7.2, 9, 1.6, [0.5, 0.28, 0.16]),      // 6 red beard
        hb(-4.6, 13, -2.6, 9.2, 7, 1.4, [0.6, 0.5, 0.36]),       // 7 leather apron
        hb(-3.4, 31, -3.4, 6.8, 2, 6.8, [0.36, 0.3, 0.26]),      // 8 headband
      ]
    ),
    headExtra: [6, 8],
    dialogue: 'hold_smith_root',
    shop: {
      sells: [
        { item: 'iron_bar', price: 26 },
        { item: 'coal', price: 5 },
        { item: 'torch_item', price: 3 },
        { item: 'copper_bar', price: 16 },
      ],
    },
  },
  hold_miner: {
    label: 'Pitmaster Hesk',
    role: 'Master of the rail and the seam',
    model: humanoid(
      { skin: [0.7, 0.56, 0.44], top: [0.3, 0.34, 0.3], sleeves: [0.26, 0.3, 0.26], bottom: [0.24, 0.26, 0.24] },
      [
        hb(-3.6, 18, -2.6, 7.2, 8, 1.6, [0.36, 0.3, 0.24]),      // 6 dark beard
        hb(-3.5, 31, -3.5, 7, 3, 7, [0.5, 0.42, 0.16]),          // 7 pit helm
        hb(-1.2, 33, -3.9, 2.4, 1.6, 1.2, [1, 0.95, 0.7]),       // 8 lamp on the helm
      ]
    ),
    headExtra: [6, 7, 8],
    dialogue: 'hold_miner_root',
  },
  hold_brewer: {
    label: 'Cellarer Mab',
    role: 'Keeper of the hold cellars',
    model: humanoid(
      { skin: [0.8, 0.62, 0.5], top: [0.42, 0.3, 0.34], sleeves: [0.36, 0.26, 0.3], bottom: [0.3, 0.24, 0.26] },
      [
        hb(-3.6, 18, -2.6, 7.2, 7, 1.6, [0.68, 0.6, 0.52]),      // 6 grey braid
        hb(-4.4, 13, -2.4, 8.8, 6, 1.2, [0.8, 0.74, 0.6]),       // 7 apron
      ]
    ),
    headExtra: [6],
    dialogue: 'hold_brewer_root',
    shop: {
      sells: [
        { item: 'travel_biscuit', price: 5 },
        { item: 'minor_healing_tonic', price: 30 },
      ],
    },
  },
});

// Dialogue graph. Options can carry action tags read by main.js/ui.js:
//   startQuest:<id>, turnIn:<id>, startLesson:<area>, shop, close
export const DIALOGUES = {
  hold_warden_root: {
    speaker: 'hold_warden',
    text: () => `You came down the stair, then. Most don't — they see the mouth, decide it's a mine, and walk on. This is a HOLD, surfacer. We were cutting these halls when the country up there was a ford and three huts.`,
    options: [
      { label: 'What is this place?', next: 'hold_warden_place' },
      { label: 'What do you dig for?', next: 'hold_warden_dig' },
      { label: 'I will look around.', action: 'close' },
    ],
  },
  hold_warden_place: {
    speaker: 'hold_warden',
    text: () => `Rock, mostly. Rock and the patience to move it. The gallery you're standing on runs the whole ring; the rails go out to the seams and come back loaded. Mind the adits — we shore them, but the deep dark has its own opinions.`,
    options: [{ label: 'Understood.', action: 'close' }],
  },
  hold_warden_dig: {
    speaker: 'hold_warden',
    text: () => `Whatever the seam gives. Iron for the forges, coal to feed them, silver when we're lucky and the wet doesn't get there first. Talk to Hesk about the rails and Dural about what comes off the anvil.`,
    options: [{ label: 'I will.', action: 'close' }],
  },
  hold_smith_root: {
    speaker: 'hold_smith',
    text: () => `Mind the sparks. You want work done or you want to watch? Both cost the same down here, and one of them costs more later.`,
    options: [
      { label: 'Show me your goods.', action: 'shop' },
      { label: 'Just passing.', action: 'close' },
    ],
  },
  hold_miner_root: {
    speaker: 'hold_miner',
    text: () => `Rails run from the gallery out to every working seam and back. Don't stand on them when you hear the wheels — there's no brake worth the name on a loaded truck, and the adit walls don't move.`,
    options: [
      { label: 'Where do the adits go?', next: 'hold_miner_adits' },
      { label: 'Noted.', action: 'close' },
    ],
  },
  hold_miner_adits: {
    speaker: 'hold_miner',
    text: () => `Out and down, following the ore. Timber every few paces, lamp at every set. If the lamps stop, turn round — that's the rule that's kept me breathing forty years.`,
    options: [{ label: 'Fair enough.', action: 'close' }],
  },
  hold_brewer_root: {
    speaker: 'hold_brewer',
    text: () => `You look like you've been walking in the dark a while. Sit if you like. The cellars are cut into the cold side of the rock — keeps better down here than anywhere above ever managed.`,
    options: [
      { label: 'What have you got?', action: 'shop' },
      { label: 'Thank you.', action: 'close' },
    ],
  },

  nan_root: {
    speaker: 'nan',
    text: () => `Oh — hello. You have caught me sitting down, which I never do. It is my knee: it has finally said no, and the whole farm is awake and shouting and not one of them has been seen to. Would you take the morning round for me? I will walk it with you and tell you what each one needs.`,
    options: [
      { label: 'Yes — I can do the round.', action: 'startLesson:farm', cls: 'quest-offer' },
      { label: 'What would I have to do?', next: 'nan_how' },
      { label: 'Not just now.', action: 'close' },
    ],
  },
  nan_how: {
    speaker: 'nan',
    text: () => `Nothing you cannot manage. There are six stops up the lane and every one wants something different — the hens want their eggs put back, the cows want an apple each, the gate wants mending. Little gold lights will show you the way to each one, and I will read out what to do when we get there. You count, you put things where they go, and the farm wakes up. Half a morning's work, and then the rest of the day is yours.`,
    options: [
      { label: "Right — let's go.", action: 'startLesson:farm', cls: 'quest-offer' },
      { label: 'I see.', action: 'close' },
    ],
  },
  maren_root: {
    speaker: 'maren',
    text: () => `Ah — you're awake. I pulled you off the trail two nights back and you have been in that tent since. I'm Maren. There is no village here, before you ask: there is this fire, that tent, and a very great deal of country. What do you need, traveler?`,
    options: [
      { label: 'Where are we?', next: 'maren_about' },
      { label: 'What should I do first?', next: 'maren_quest_hub' },
      { label: 'Any advice for surviving?', next: 'maren_advice' },
      { label: 'Farewell.', action: 'close' },
    ],
  },
  maren_about: {
    speaker: 'maren',
    text: () => `A camp, and not a permanent one. There is a pond that fishes, a grove that cuts, a mine somebody sank here long before either of us, and soil that will take a seed. Follow a road far enough and you will come to a town — I have not, lately. And something has moved into the Rootgrave under that mine. It has drums.`,
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
  sylla_root: {
    speaker: 'sylla',
    text: () => `Hold there — oh. You're the one Maren wrote about. Welcome to the Frostwatch, such as it is: one fire, one forge, and a great deal of wind. The goblins out here answer to something bigger. Mind the stone ring north of camp.`,
    options: [
      { label: 'What is this place?', next: 'sylla_about' },
      { label: 'Need a hand with anything?', next: 'sylla_hub' },
      { label: 'Stay warm.', action: 'close' },
    ],
  },
  sylla_about: {
    speaker: 'sylla',
    text: () => `The Frostwatch is the valley's tripwire. Anything that comes down from the deep tundra passes us first. Lately the passing has gone one way — goblins, more every week, drawn in by the big one that took the old ruin ring. Use the forge if you need it; that's what it's for.`,
    options: [
      { label: 'Need a hand with anything?', next: 'sylla_hub' },
      { label: 'Stay warm.', action: 'close' },
    ],
  },
  sylla_hub: { speaker: 'sylla', dynamic: 'sylla' },
};
