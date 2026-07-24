// Remade mob models — farm-animals batch.
// Eight domestic creatures (cow, pig, sheep, chicken, duck, goat, horse,
// rabbit). Geometry is authored in Minecraft units — whole pixels on the
// 16-per-block grid, limbs no thinner than 2px, proportions matched to the
// vanilla mob each animal echoes (see mcmodel.js MC_REF). Skins stay box-by-box
// UV islands painted into each animal's own 64x64 texture (see mobremake.js for
// the def format). +z is FORWARD — faces/eyes live on the south UV face.
import { b, part } from './mcmodel.js';

// Ambient clips — the small behaviours that make a paddock feel alive. Each
// plays once on a per-animal timer while it's standing still (see poseFor).
// GRAZE: head drops to the grass, holds there, comes back up. The hold is the
// readable part, so it takes half the clip.
const GRAZE = (deg = 62) => ({
  length: 3.4, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.6, [deg, 0, 0]], [2.6, [deg, 0, 0]], [3.4, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.6, [4, 0, 0]], [2.6, [4, 0, 0]], [3.4, [0, 0, 0]]] },
  },
});
// PECK: a sharp stab down and straight back — birds don't linger.
const PECK = {
  length: 1.1, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.16, [64, 0, 0]], [0.34, [10, 0, 0]], [0.5, [58, 0, 0]], [0.72, [0, 0, 0]], [1.1, [0, 0, 0]]] },
    tail: { rotate: [[0, [0, 0, 0]], [0.16, [-18, 0, 0]], [0.72, [0, 0, 0]], [1.1, [0, 0, 0]]] },
  },
};
// SNIFF: quick nose bobs with the ears twitching back.
const SNIFF = {
  length: 1.6, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.2, [16, 0, 0]], [0.4, [2, 0, 0]], [0.6, [16, 0, 0]], [0.8, [2, 0, 0]], [1.0, [12, 0, 0]], [1.6, [0, 0, 0]]] },
  },
};

export const FARM = {
  // --------------------------------------------------------------------------
  // cow — Holstein grazer: barrel body in black-and-white patches, horns, an
  // udder, a tufted tail and a broad pink muzzle. (quadruped)
  // --------------------------------------------------------------------------
  cow: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const white = '#e9e7df', black = '#2b2723', pink = '#d98f88', bone = '#e6dcc2', hoof = '#241a12';
      // body flank — white hide with black Holstein patches
      P.noise(0, 0, 26, 16, white, 0.05, { chance: 0.05, color: '#d8d4c8' });
      P.strokes(0, 0, 26, 16, 14, '#d4cfc0', 2);
      P.noise(3, 2, 9, 7, black, 0.05);           // shoulder patch
      P.noise(16, 7, 8, 8, black, 0.05);          // hip patch
      P.spots(2, 1, 22, 13, 8, '#1f1b17');
      P.rect(0, 14, 26, 2, P.shade('#d8d4c8', -0.02)); // belly shade
      // body top
      P.noise(0, 17, 26, 10, white, 0.05);
      P.noise(9, 18, 9, 6, black, 0.05);          // dorsal patch
      P.strokes(0, 17, 26, 10, 10, '#d4cfc0', 2);
      // neck
      P.noise(28, 0, 10, 14, white, 0.05); P.noise(30, 1, 6, 7, black, 0.05);
      // udder — pink with teats
      P.noise(40, 0, 10, 10, pink, 0.05); P.rect(40, 0, 10, 1, '#c87e78');
      P.px(42, 8, '#b06a64'); P.px(44, 8, '#b06a64'); P.px(46, 8, '#b06a64'); P.px(48, 8, '#b06a64');
      // head sides
      P.noise(0, 32, 14, 14, white, 0.05); P.noise(1, 33, 6, 8, black, 0.05);
      // head face (south) — dark cheeks framing a white blaze, gentle eyes
      P.noise(16, 32, 14, 14, white, 0.05);
      P.noise(16, 32, 4, 8, black, 0.05); P.noise(26, 32, 4, 8, black, 0.05);
      P.eye(19, 37, '#1a120a', '#d8c8a8'); P.eye(24, 37, '#1a120a', '#d8c8a8');
      P.rect(20, 43, 6, 2, pink); P.px(21, 44, '#b06a64'); P.px(24, 44, '#b06a64');
      // muzzle — pink, nostrils
      P.noise(32, 32, 12, 10, pink, 0.05); P.rect(32, 32, 12, 1, '#c87e78');
      P.px(35, 36, '#5a3630'); P.px(40, 36, '#5a3630');
      // horns — bone
      P.vgrad(46, 32, 6, 10, bone, '#b6a074', 0.04); P.spots(46, 32, 6, 10, 3, '#f2ead2');
      // ears
      P.noise(54, 32, 8, 6, white, 0.05); P.rect(55, 33, 3, 3, pink);
      // legs — white with a black lower leg + dark hoof
      P.noise(52, 0, 10, 16, white, 0.05); P.rect(52, 9, 10, 4, black); P.rect(52, 13, 10, 3, hoof);
      // tail — white switch with a black tuft
      P.noise(40, 14, 6, 16, white, 0.05); P.rect(40, 26, 6, 4, black);
    },
    // vanilla cow: body 12x10x18, head 8x8x6, legs 4x12x4, ~26px at the horns

    anims: { graze: GRAZE(58) }, ambient: { clip: 'graze', every: [9, 22] },
    parts: [
      part('body', [0, 12, 0], [
        b([-6, 12, -9], [12, 10, 18], { all: [0, 0, 26, 16], up: [0, 17, 26, 10] }),
        b([-3, 17, 9], [6, 6, 3], [28, 0, 10, 14]),        // neck
        b([-3, 9, -4], [6, 3, 6], [40, 0, 10, 10]),        // udder
      ]),
      part('head', [0, 20, 12], [
        b([-4, 16, 12], [8, 8, 6], { all: [0, 32, 14, 14], south: [16, 32, 14, 14] }),
        b([-3, 17, 18], [6, 4, 2], [32, 32, 12, 10]),      // muzzle
        b([-5, 24, 13], [1, 3, 1], [46, 32, 6, 10]),       // horn L
        b([4, 24, 13], [1, 3, 1], [46, 32, 6, 10]),        // horn R
        b([-7, 21, 13], [3, 2, 1], [54, 32, 8, 6]),        // ear L
        b([4, 21, 13], [3, 2, 1], [54, 32, 8, 6]),         // ear R
      ]),
      part('leg0', [-4, 12, 7], [b([-6, 0, 5], [4, 12, 4], [52, 0, 10, 16])]),
      part('leg1', [4, 12, 7], [b([2, 0, 5], [4, 12, 4], [52, 0, 10, 16])]),
      part('leg2', [-4, 12, -7], [b([-6, 0, -9], [4, 12, 4], [52, 0, 10, 16])]),
      part('leg3', [4, 12, -7], [b([2, 0, -9], [4, 12, 4], [52, 0, 10, 16])]),
      part('tail', [0, 21, -9], [b([-1, 12, -10], [2, 9, 2], [40, 14, 6, 16])]),
    ],
  },

  // --------------------------------------------------------------------------
  // pig — pink porker: round low body, flat snout disc with nostrils, floppy
  // forward ears, a curly tail and trotters. (quadruped)
  // --------------------------------------------------------------------------
  pig: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const pink = '#e5a0a0', pdk = '#cd8686', snoutc = '#d98f8a', hoof = '#3a2620';
      // body flank
      P.noise(0, 0, 26, 16, pink, 0.06, { chance: 0.08, color: pdk });
      P.strokes(0, 0, 26, 16, 10, pdk, 2);
      P.spots(0, 9, 26, 7, 10, '#c98d7c');        // dried mud on the low flank
      P.rect(0, 14, 26, 2, P.shade(pdk, -0.02));
      // body top — slightly darker dorsal
      P.noise(0, 17, 26, 10, pink, 0.05); P.rect(0, 17, 26, 2, P.shade(pdk, 0.01));
      P.strokes(0, 17, 26, 10, 8, pdk, 2);
      // head sides
      P.noise(28, 0, 12, 12, pink, 0.05, { chance: 0.06, color: pdk });
      // head face (south) — small bright eyes, snout hint
      P.noise(42, 0, 12, 12, '#e8a6a6', 0.05);
      P.eye(45, 4, '#1a1010', '#e6c0bc'); P.eye(50, 4, '#1a1010', '#e6c0bc');
      P.rect(45, 9, 6, 3, snoutc); P.px(46, 10, '#5a3634'); P.px(49, 10, '#5a3634');
      // snout disc — outlined, two nostrils
      P.noise(0, 32, 10, 8, snoutc, 0.05); P.outline(0, 32, 10, 8, P.shade(snoutc, -0.06));
      P.px(3, 35, '#5a3430'); P.px(6, 35, '#5a3430');
      // ears — dark outer, paler inner
      P.noise(12, 32, 8, 8, pdk, 0.06); P.rect(13, 33, 5, 4, '#b87070');
      // legs — trotters
      P.noise(22, 32, 10, 14, pink, 0.05); P.rect(22, 42, 10, 3, pdk); P.rect(22, 44, 10, 2, hoof);
      // tail (curl)
      P.noise(34, 32, 10, 10, pink, 0.05); P.strokes(34, 32, 10, 10, 6, pdk, 3);
    },
    // vanilla pig: body 10x8x16, head 8x8x8, legs 4x6x4 — low and stocky

    anims: { graze: GRAZE(46) }, ambient: { clip: 'graze', every: [8, 19] },
    parts: [
      part('body', [0, 6, 0], [
        b([-5, 6, -8], [10, 8, 16], { all: [0, 0, 26, 16], up: [0, 17, 26, 10] }),
      ]),
      part('head', [0, 9, 8], [
        b([-4, 5, 8], [8, 8, 8], { all: [28, 0, 12, 12], south: [42, 0, 12, 12] }),
        b([-2, 7, 16], [4, 3, 1], [0, 32, 10, 8]),      // snout
        b([-4, 13, 9], [3, 2, 1], [12, 32, 8, 8]),      // ear L
        b([1, 13, 9], [3, 2, 1], [12, 32, 8, 8]),       // ear R
      ]),
      part('leg0', [-3, 6, 6], [b([-5, 0, 4], [4, 6, 4], [22, 32, 10, 14])]),
      part('leg1', [3, 6, 6], [b([1, 0, 4], [4, 6, 4], [22, 32, 10, 14])]),
      part('leg2', [-3, 6, -6], [b([-5, 0, -8], [4, 6, 4], [22, 32, 10, 14])]),
      part('leg3', [3, 6, -6], [b([1, 0, -8], [4, 6, 4], [22, 32, 10, 14])]),
      part('tail', [0, 13, -8], [
        b([-1, 11, -9], [2, 3, 1], [34, 32, 10, 10]),
        b([0, 13, -10], [2, 2, 1], [34, 32, 10, 10]),   // curl
      ]),
    ],
  },

  // --------------------------------------------------------------------------
  // sheep — woolly ewe: a fat fleece body under a fluffy back hump, dark face
  // and legs, a cream poll of wool on the crown, a small wool tail. (quadruped)
  // --------------------------------------------------------------------------
  sheep: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const wool = '#e7ddca', woolDk = '#cfc2a8', woolHi = '#f3ecdc', face = '#2f2925', faceHi = '#4a423a', hoof = '#181410';
      // body fleece — heavy curly texture
      P.noise(0, 0, 26, 16, wool, 0.06, { chance: 0.12, color: woolDk });
      P.strokes(0, 0, 26, 16, 44, woolDk, 3);
      P.spots(0, 0, 26, 16, 18, woolHi); P.spots(0, 0, 26, 16, 12, '#c4b696');
      // top fleece
      P.noise(0, 17, 26, 10, wool, 0.06, { chance: 0.12, color: woolDk });
      P.strokes(0, 17, 26, 10, 30, woolDk, 3); P.spots(0, 17, 26, 10, 12, woolHi);
      // back hump
      P.noise(28, 0, 20, 12, wool, 0.06, { chance: 0.12, color: woolDk });
      P.strokes(28, 0, 20, 12, 30, woolDk, 3); P.spots(28, 0, 20, 12, 12, woolHi);
      // head sides (dark)
      P.noise(0, 32, 12, 12, face, 0.06); P.strokes(0, 32, 12, 12, 8, faceHi, 2);
      // head face (south)
      P.noise(13, 32, 12, 12, face, 0.06);
      P.eye(15, 36, '#0d0a08', '#c8b48c'); P.eye(21, 36, '#0d0a08', '#c8b48c');
      P.strokes(13, 32, 12, 4, 8, faceHi, 2);
      // poll fluff
      P.noise(26, 32, 16, 10, wool, 0.06, { chance: 0.12, color: woolDk });
      P.strokes(26, 32, 16, 10, 26, woolDk, 3); P.spots(26, 32, 16, 10, 10, woolHi);
      // muzzle (dark)
      P.noise(44, 32, 8, 8, faceHi, 0.05); P.px(46, 36, '#0d0a08'); P.px(49, 36, '#0d0a08');
      // ears (dark)
      P.noise(50, 0, 8, 6, face, 0.05); P.rect(51, 1, 3, 3, faceHi);
      // legs (dark) + hoof
      P.noise(50, 8, 12, 22, face, 0.05); P.strokes(50, 8, 12, 22, 10, faceHi, 3); P.rect(50, 27, 12, 3, hoof);
      // tail (wool)
      P.noise(42, 42, 10, 10, wool, 0.06); P.strokes(42, 42, 10, 10, 12, woolDk, 3);
    },
    // vanilla sheep: body 8x10x16 under a fleece, head 6x6x8, legs 4x12x4, 26px

    anims: { graze: GRAZE(60) }, ambient: { clip: 'graze', every: [8, 20] },
    parts: [
      part('body', [0, 12, 0], [
        b([-5, 12, -8], [10, 10, 16], { all: [0, 0, 26, 16], up: [0, 17, 26, 10] }),
        b([-6, 21, -8], [12, 4, 16], [28, 0, 20, 12]),     // fleece over the back
      ]),
      part('head', [0, 19, 8], [
        b([-3, 16, 8], [6, 6, 8], { all: [0, 32, 12, 12], south: [13, 32, 12, 12] }),
        b([-4, 21, 8], [8, 3, 6], [26, 32, 16, 10]),       // poll fluff
        b([-2, 16, 16], [4, 3, 2], [44, 32, 8, 8]),        // muzzle
        b([-5, 19, 10], [2, 2, 2], [50, 0, 8, 6]),         // ear L
        b([3, 19, 10], [2, 2, 2], [50, 0, 8, 6]),          // ear R
      ]),
      part('leg0', [-3, 12, 6], [b([-5, 0, 4], [4, 12, 4], [50, 8, 12, 22])]),
      part('leg1', [3, 12, 6], [b([1, 0, 4], [4, 12, 4], [50, 8, 12, 22])]),
      part('leg2', [-3, 12, -6], [b([-5, 0, -8], [4, 12, 4], [50, 8, 12, 22])]),
      part('leg3', [3, 12, -6], [b([1, 0, -8], [4, 12, 4], [50, 8, 12, 22])]),
      part('tail', [0, 21, -8], [b([-1, 18, -10], [3, 3, 2], [42, 42, 10, 10])]),
    ],
  },

  // --------------------------------------------------------------------------
  // chicken — white hen: plump body, red comb + wattle, orange beak, folded
  // wings, an upright brown tail fan and scaly legs. (pecker — pecks on attack)
  // --------------------------------------------------------------------------
  chicken: {
    texW: 64, texH: 64, rig: 'pecker',
    paint(ctx, P) {
      const white = '#f0ebe0', wdk = '#d8cfbc', brown = '#b07840', bdk = '#8a5a2c';
      const comb = '#c8322a', beak = '#e6a52c', bdk2 = '#b5801c', leg = '#d99a3a', clawd = '#8a6018';
      // body — white plumage with feather layering
      P.noise(0, 0, 16, 16, white, 0.05, { chance: 0.08, color: wdk });
      P.strokes(0, 0, 16, 16, 20, wdk, 3); P.spots(0, 0, 16, 16, 8, '#fbf6ec');
      // body top
      P.noise(18, 0, 14, 10, white, 0.05); P.strokes(18, 0, 14, 10, 12, wdk, 3);
      // head sides
      P.noise(0, 18, 12, 12, white, 0.05);
      // head face (south)
      P.noise(14, 18, 12, 12, white, 0.05);
      P.eye(17, 22, '#100c0a', '#e8dccb'); P.eye(22, 22, '#100c0a', '#e8dccb');
      P.rect(16, 25, 3, 2, comb); P.rect(23, 25, 3, 2, comb);
      // beak
      P.vgrad(28, 18, 8, 6, beak, bdk2, 0.05); P.rect(28, 18, 8, 1, '#f2c250'); P.px(31, 21, '#7a5410');
      // comb
      P.noise(38, 0, 6, 14, comb, 0.06); P.strokes(38, 0, 6, 14, 8, '#e0554a', 3); P.rect(38, 0, 6, 2, '#8a201a');
      // wattle
      P.glow(38, 16, 6, 6, comb, '#7a1810');
      // wing — white with brown flight-feather bars at the tip
      P.noise(46, 0, 10, 20, white, 0.05); P.strokes(46, 0, 10, 20, 12, wdk, 3);
      P.rect(46, 14, 10, 6, brown); P.bands(46, 14, 10, 6, 2, bdk);
      // tail — brown sickle feathers, layered
      P.noise(0, 32, 18, 14, brown, 0.06, { chance: 0.2, color: bdk });
      P.bands(0, 32, 18, 14, 3, bdk); P.strokes(0, 32, 18, 14, 14, '#6a441f', 4); P.rect(0, 32, 18, 2, white);
      // legs — scaly yellow, dark claws
      P.noise(22, 32, 6, 14, leg, 0.06); P.bands(22, 32, 6, 14, 2, '#a5701e'); P.rect(22, 44, 6, 2, clawd);
    },
    // vanilla chicken: body 6x8x6, head 4x6x3, beak 4x2x2, wings 1x5x6, legs 3x5x3

    anims: { peck: PECK }, ambient: { clip: 'peck', every: [5, 13] },
    parts: [
      part('body', [0, 5, 0], [
        b([-3, 5, -4], [6, 6, 8], { all: [0, 0, 16, 16], up: [18, 0, 14, 10] }),
        b([-4, 6, -3], [1, 5, 6], [46, 0, 10, 20]),      // folded wing L
        b([3, 6, -3], [1, 5, 6], [46, 0, 10, 20]),       // folded wing R
      ]),
      part('head', [0, 9, 4], [
        b([-2, 9, 3], [4, 6, 3], { all: [0, 18, 12, 12], south: [14, 18, 12, 12] }),
        b([-2, 11, 6], [4, 2, 2], [28, 18, 8, 6]),       // beak
        b([-1, 15, 3], [2, 2, 3], [38, 0, 6, 14]),       // comb
        b([-1, 9, 6], [2, 2, 1], [38, 16, 6, 6]),        // wattle
      ]),
      part('leg0', [-2, 5, 1], [
        b([-3, 0, 0], [3, 5, 3], [22, 32, 6, 14]),
        b([-4, 0, 0], [4, 1, 5], [22, 32, 6, 14]),        // foot L
      ]),
      part('leg1', [2, 5, 1], [
        b([0, 0, 0], [3, 5, 3], [22, 32, 6, 14]),
        b([0, 0, 0], [4, 1, 5], [22, 32, 6, 14]),         // foot R
      ]),
      part('tail', [0, 10, -4], [b([-2, 9, -6], [4, 5, 2], [0, 32, 18, 14])]),
    ],
  },

  // --------------------------------------------------------------------------
  // duck — farm duck: boat body of white feathers, brown head, a flat orange
  // bill, folded wings with a teal speculum and webbed feet. (pecker)
  // --------------------------------------------------------------------------
  duck: {
    texW: 64, texH: 64, rig: 'pecker',
    paint(ctx, P) {
      const white = '#eef0ea', wdk = '#d4d6cc', brown = '#7a5836', bdk = '#5c4026';
      const bill = '#e79a2c', billDk = '#c07a18', foot = '#e79a2c', spec = '#3a6a6a';
      // body — white feathers
      P.noise(0, 0, 20, 14, white, 0.05, { chance: 0.08, color: wdk });
      P.strokes(0, 0, 20, 14, 18, wdk, 3); P.spots(0, 0, 20, 14, 8, '#f8faf4');
      // body top
      P.noise(22, 0, 16, 10, white, 0.05); P.strokes(22, 0, 16, 10, 12, wdk, 3);
      // neck — white with a brown collar
      P.noise(40, 0, 6, 10, white, 0.05); P.rect(40, 0, 6, 2, brown);
      // head sides (brown)
      P.noise(0, 16, 12, 12, brown, 0.06, { chance: 0.1, color: bdk }); P.strokes(0, 16, 12, 12, 10, bdk, 3);
      // head face (south)
      P.noise(14, 16, 12, 12, brown, 0.06);
      P.eye(17, 20, '#0c0806', '#c8a878'); P.eye(22, 20, '#0c0806', '#c8a878');
      P.strokes(14, 16, 12, 5, 8, bdk, 2);
      // bill — flat orange, nostrils + tip nail
      P.vgrad(28, 16, 12, 8, bill, billDk, 0.05); P.rect(28, 16, 12, 1, '#f2b850');
      P.px(30, 20, '#7a4a10'); P.px(37, 20, '#7a4a10'); P.rect(28, 22, 12, 1, billDk);
      // wing — white with a teal speculum band
      P.noise(46, 0, 12, 18, white, 0.05); P.strokes(46, 0, 12, 18, 10, wdk, 3);
      P.rect(46, 9, 12, 1, '#d8d0be'); P.rect(46, 10, 12, 4, spec); P.rect(46, 14, 12, 3, brown);
      // tail — short, white with a brown base
      P.noise(40, 16, 12, 8, white, 0.05); P.rect(40, 16, 12, 3, brown);
      // legs — orange
      P.noise(0, 32, 6, 10, foot, 0.06); P.bands(0, 32, 6, 10, 2, billDk);
      // webbed feet
      P.noise(8, 32, 12, 6, foot, 0.05); P.strokes(8, 32, 12, 6, 6, billDk, 2); P.rect(8, 32, 12, 1, billDk);
    },
    // waterfowl build: a long low boat body, upright neck, flat bill, web feet

    anims: { peck: PECK }, ambient: { clip: 'peck', every: [6, 15] },
    parts: [
      part('body', [0, 5, 0], [
        b([-3, 5, -6], [6, 6, 12], { all: [0, 0, 20, 14], up: [22, 0, 16, 10] }),
        b([-2, 10, 3], [4, 4, 4], [40, 0, 6, 10]),        // neck
        b([-4, 6, -4], [1, 5, 9], [46, 0, 12, 18]),       // folded wing L
        b([3, 6, -4], [1, 5, 9], [46, 0, 12, 18]),        // folded wing R
      ]),
      part('head', [0, 12, 5], [
        b([-2, 12, 4], [4, 4, 5], { all: [0, 16, 12, 12], south: [14, 16, 12, 12] }),
        b([-2, 12, 9], [4, 2, 3], [28, 16, 12, 8]),       // flat bill
      ]),
      part('leg0', [-2, 5, 1], [
        b([-3, 1, 0], [3, 4, 3], [0, 32, 6, 10]),
        b([-4, 0, 0], [4, 1, 5], [8, 32, 12, 6]),         // web foot L
      ]),
      part('leg1', [2, 5, 1], [
        b([0, 1, 0], [3, 4, 3], [0, 32, 6, 10]),
        b([0, 0, 0], [4, 1, 5], [8, 32, 12, 6]),          // web foot R
      ]),
      part('tail', [0, 8, -6], [b([-2, 7, -8], [4, 3, 3], [40, 16, 12, 8])]),
    ],
  },

  // --------------------------------------------------------------------------
  // goat — hardy nanny: grey-brown coat, ridged back-swept horns, a chin beard,
  // gold slit eyes, a pale muzzle band and a flick tail. (quadruped)
  // --------------------------------------------------------------------------
  goat: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const hide = '#8a7c66', dark = '#5f5442', cream = '#cabfa4', beardc = '#4a3f30';
      const bone = '#d8cbaa', boneDk = '#a89468', hoof = '#221a12';
      // body flank
      P.noise(0, 0, 24, 16, hide, 0.07, { chance: 0.08, color: '#9a8c74' }); P.strokes(0, 0, 24, 16, 26, dark, 3);
      P.rect(0, 13, 24, 3, P.shade(dark, 0.02)); P.spots(0, 10, 24, 6, 8, cream);
      // top — darker dorsal stripe
      P.noise(0, 17, 24, 10, '#7a6c56', 0.06); P.strokes(0, 17, 24, 10, 22, dark, 3); P.rect(11, 17, 3, 10, dark);
      // neck
      P.noise(26, 0, 10, 14, hide, 0.06); P.strokes(26, 0, 10, 14, 12, dark, 3);
      // head sides
      P.noise(0, 32, 12, 12, hide, 0.06); P.strokes(0, 32, 12, 12, 8, dark, 2);
      // head face (south) — pale muzzle band, gold eyes
      P.noise(14, 32, 12, 12, hide, 0.05);
      P.rect(14, 41, 12, 3, cream);
      P.eye(17, 36, '#241608', '#b89a52'); P.eye(22, 36, '#241608', '#b89a52');
      // muzzle
      P.noise(28, 32, 10, 8, cream, 0.05); P.px(31, 36, '#3a2a18'); P.px(35, 36, '#3a2a18');
      // beard
      P.noise(40, 32, 6, 10, beardc, 0.06); P.strokes(40, 32, 6, 10, 10, '#2f271c', 4);
      // horns — ridged bone
      P.vgrad(48, 0, 6, 12, bone, boneDk, 0.04); P.bands(48, 0, 6, 12, 2, '#b8a578');
      P.vgrad(56, 0, 6, 12, bone, boneDk, 0.04); P.bands(56, 0, 6, 12, 2, '#b8a578');
      // ears
      P.noise(48, 14, 10, 6, hide, 0.05); P.rect(49, 15, 4, 3, cream);
      // legs
      P.noise(48, 22, 10, 20, '#7a6c56', 0.06); P.strokes(48, 22, 10, 20, 10, dark, 3); P.rect(48, 38, 10, 4, hoof);
      // tail
      P.noise(26, 16, 8, 10, hide, 0.06); P.rect(26, 22, 8, 4, dark);
    },
    // vanilla goat proportions: body 10x9x16, head 6x6x7, legs 4x12x4, swept horns

    anims: { graze: GRAZE(56) }, ambient: { clip: 'graze', every: [9, 21] },
    parts: [
      part('body', [0, 12, 0], [
        b([-5, 12, -8], [10, 9, 16], { all: [0, 0, 24, 16], up: [0, 17, 24, 10] }),
        b([-3, 17, 6], [6, 6, 5], [26, 0, 10, 14]),        // neck
      ]),
      part('head', [0, 20, 10], [
        b([-3, 19, 10], [6, 6, 7], { all: [0, 32, 12, 12], south: [14, 32, 12, 12] }),
        b([-2, 19, 17], [4, 3, 2], [28, 32, 10, 8]),       // muzzle
        b([-1, 16, 16], [2, 4, 1], [40, 32, 6, 10]),       // beard
        b([-4, 25, 11], [2, 4, 2], [48, 0, 6, 12]),        // horn base L
        b([2, 25, 11], [2, 4, 2], [48, 0, 6, 12]),         // horn base R
        b([-4, 28, 6], [2, 2, 5], [56, 0, 6, 12]),         // horn tip L (swept back)
        b([2, 28, 6], [2, 2, 5], [56, 0, 6, 12]),          // horn tip R
        b([-6, 23, 12], [3, 2, 2], [48, 14, 10, 6]),       // ear L
        b([3, 23, 12], [3, 2, 2], [48, 14, 10, 6]),        // ear R
      ]),
      part('leg0', [-3, 12, 6], [b([-5, 0, 4], [4, 12, 4], [48, 22, 10, 20])]),
      part('leg1', [3, 12, 6], [b([1, 0, 4], [4, 12, 4], [48, 22, 10, 20])]),
      part('leg2', [-3, 12, -6], [b([-5, 0, -8], [4, 12, 4], [48, 22, 10, 20])]),
      part('leg3', [3, 12, -6], [b([1, 0, -8], [4, 12, 4], [48, 22, 10, 20])]),
      part('tail', [0, 19, -8], [b([-1, 17, -10], [2, 3, 2], [26, 16, 8, 10])]),
    ],
  },

  // --------------------------------------------------------------------------
  // horse — bay stallion: tall long-legged body, an up-arched neck under a
  // black mane, a long head with a white blaze, black tail + lower legs.
  // (quadruped)
  // --------------------------------------------------------------------------
  horse: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const coat = '#8a5530', cdk = '#5c3418', cshine = '#a67046', mane = '#1f140c';
      const blaze = '#efe7d6', hoof = '#2a2018', muz = '#3a2618';
      // body flank — bay coat, dappled
      P.noise(0, 0, 26, 16, coat, 0.06, { chance: 0.08, color: cshine }); P.strokes(0, 0, 26, 16, 20, cdk, 3);
      P.spots(0, 2, 26, 10, 14, cshine); P.rect(0, 13, 26, 3, P.shade(cdk, 0.0));
      // top
      P.noise(0, 17, 26, 10, coat, 0.06); P.strokes(0, 17, 26, 10, 16, cdk, 3); P.rect(11, 17, 4, 10, '#683c1e');
      // neck
      P.noise(28, 0, 12, 16, coat, 0.06); P.strokes(28, 0, 12, 16, 14, cdk, 3);
      // head sides
      P.noise(0, 32, 10, 12, coat, 0.06); P.strokes(0, 32, 10, 12, 8, cdk, 3);
      // head face (south) — white blaze, dark eyes
      P.noise(12, 32, 10, 12, coat, 0.05);
      P.rect(15, 32, 3, 12, blaze); P.spots(15, 33, 3, 10, 4, '#fff8ec');
      P.eye(13, 36, '#0d0906', '#c89a6a'); P.eye(19, 36, '#0d0906', '#c89a6a');
      // muzzle
      P.noise(24, 32, 10, 8, muz, 0.05); P.px(27, 36, '#100a06'); P.px(31, 36, '#100a06');
      // ears
      P.noise(36, 32, 8, 6, coat, 0.05); P.rect(37, 33, 2, 3, cdk); P.rect(41, 33, 2, 3, cdk);
      // mane / forelock — coarse black
      P.noise(44, 0, 8, 22, mane, 0.06); P.strokes(44, 0, 8, 22, 30, '#0e0906', 5); P.strokes(44, 0, 8, 22, 14, '#3a2a1c', 4);
      // legs — coat with black lower socks + hoof
      P.noise(44, 24, 10, 20, coat, 0.06); P.strokes(44, 24, 10, 20, 10, cdk, 3);
      P.rect(44, 36, 10, 5, mane); P.rect(44, 41, 10, 3, hoof);
      // tail — flowing black
      P.noise(54, 0, 8, 26, mane, 0.06); P.strokes(54, 0, 8, 26, 30, '#0e0906', 6); P.strokes(54, 0, 8, 26, 14, '#3a2a1c', 5);
    },
    // vanilla horse proportions: body 10x10x22, legs 4x14x4, arched neck, long head

    anims: { graze: GRAZE(64) }, ambient: { clip: 'graze', every: [12, 28] },
    parts: [
      part('body', [0, 14, 0], [
        b([-5, 14, -11], [10, 10, 22], { all: [0, 0, 26, 16], up: [0, 17, 26, 10] }),
        b([-3, 20, 8], [6, 11, 6], [28, 0, 12, 16]),       // neck
        b([-1, 22, 8], [2, 9, 7], [44, 0, 8, 22]),         // mane along the crest
      ]),
      part('head', [0, 29, 12], [
        b([-3, 27, 12], [6, 6, 9], { all: [0, 32, 10, 12], south: [12, 32, 10, 12] }),
        b([-2, 27, 21], [4, 4, 2], [24, 32, 10, 8]),       // muzzle
        b([-3, 33, 13], [2, 3, 1], [36, 32, 8, 6]),        // ear L
        b([1, 33, 13], [2, 3, 1], [36, 32, 8, 6]),         // ear R
        b([-1, 32, 15], [2, 3, 2], [44, 0, 8, 22]),        // forelock
      ]),
      part('leg0', [-3, 14, 8], [b([-5, 0, 6], [4, 14, 4], [44, 24, 10, 20])]),
      part('leg1', [3, 14, 8], [b([1, 0, 6], [4, 14, 4], [44, 24, 10, 20])]),
      part('leg2', [-3, 14, -8], [b([-5, 0, -10], [4, 14, 4], [44, 24, 10, 20])]),
      part('leg3', [3, 14, -8], [b([1, 0, -10], [4, 14, 4], [44, 24, 10, 20])]),
      part('tail', [0, 23, -11], [b([-1, 11, -13], [2, 12, 2], [54, 0, 8, 26])]),
    ],
  },

  // --------------------------------------------------------------------------
  // rabbit — brown coney: hunched body, long upright ears with pink inners, a
  // twitchy pink nose, big hind haunches/feet and a white cotton tail. (scamper)
  // --------------------------------------------------------------------------
  rabbit: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      const fur = '#8a6a48', furDk = '#6a4e30', belly = '#d8c8b0', pink = '#d98f8a', ear = '#7a5a3c', tail = '#f0ece0';
      // body flank
      P.noise(0, 0, 16, 12, fur, 0.06, { chance: 0.08, color: furDk }); P.strokes(0, 0, 16, 12, 20, furDk, 3);
      P.rect(0, 10, 16, 2, belly);
      // top
      P.noise(18, 0, 14, 8, fur, 0.06); P.strokes(18, 0, 14, 8, 12, furDk, 3);
      // head sides
      P.noise(0, 14, 12, 12, fur, 0.06); P.strokes(0, 14, 12, 12, 10, furDk, 3);
      // head face (south) — big eyes, pink nose, cheek whiskers
      P.noise(14, 14, 12, 12, fur, 0.05);
      P.eye(16, 18, '#120d08', '#ffffff'); P.eye(22, 18, '#120d08', '#ffffff');
      P.rect(18, 23, 2, 2, pink); P.px(18, 25, '#b06a64');
      P.strokes(14, 22, 12, 3, 4, belly, 3);
      // ears — brown outer, pink inner
      P.noise(28, 14, 8, 20, ear, 0.05); P.rect(29, 15, 2, 16, pink); P.rect(33, 15, 2, 16, pink);
      // tail — cotton puff
      P.noise(38, 0, 8, 8, tail, 0.05); P.spots(38, 0, 8, 8, 8, '#ffffff');
      // front legs
      P.noise(38, 10, 6, 12, fur, 0.05); P.strokes(38, 10, 6, 12, 6, furDk, 3); P.rect(38, 20, 6, 2, belly);
      // hind feet
      P.noise(46, 0, 12, 10, fur, 0.05); P.rect(46, 8, 12, 2, belly);
      // haunch
      P.noise(46, 12, 14, 14, fur, 0.06, { chance: 0.08, color: furDk }); P.strokes(46, 12, 14, 14, 14, furDk, 3);
    },
    // vanilla rabbit proportions: small and hunched — body 6x4x8, head 5x4x4,
    // tall upright ears, heavy hind haunches and long back feet

    anims: { sniff: SNIFF }, ambient: { clip: 'sniff', every: [5, 12] },
    parts: [
      part('body', [0, 3, 0], [
        b([-3, 3, -4], [6, 4, 8], { all: [0, 0, 16, 12], up: [18, 0, 14, 8] }),
        b([-4, 1, -4], [2, 4, 5], [46, 12, 14, 14]),      // haunch L
        b([2, 1, -4], [2, 4, 5], [46, 12, 14, 14]),       // haunch R
        b([-2, 0, 2], [2, 3, 2], [38, 10, 6, 12]),        // front leg L
        b([0, 0, 2], [2, 3, 2], [38, 10, 6, 12]),         // front leg R
        b([-4, 0, -5], [3, 1, 6], [46, 0, 12, 10]),       // hind foot L
        b([1, 0, -5], [3, 1, 6], [46, 0, 12, 10]),        // hind foot R
      ]),
      part('head', [0, 6, 4], [
        b([-3, 6, 4], [6, 5, 5], { all: [0, 14, 12, 12], south: [14, 14, 12, 12] }),
        b([-2, 11, 5], [2, 5, 1], [28, 14, 8, 20]),       // ear L
        b([0, 11, 5], [2, 5, 1], [28, 14, 8, 20]),        // ear R
      ]),
      part('tail', [0, 6, -4], [b([-1, 4, -6], [2, 2, 2], [38, 0, 8, 8])]),
    ],
  },
};
