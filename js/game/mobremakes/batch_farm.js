// Remade mob models — farm-animals batch.
// Eight domestic creatures (cow, pig, sheep, chicken, duck, goat, horse,
// rabbit) built to the mudback_boar quality bar: real silhouettes, box-by-box
// UV islands painted into each animal's own 64x64 skin (see js/game/mobremake.js
// for the def format). +z is FORWARD — faces/eyes live on the south UV face.

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
    parts: [
      { id: 'body', pivot: [0, 0.52, 0], boxes: [
        { from: [-0.32, 0.52, -0.58], size: [0.64, 0.5, 1.16], uv: { all: [0, 0, 26, 16], up: [0, 17, 26, 10] } },
        { from: [-0.15, 0.66, 0.42], size: [0.3, 0.3, 0.28], uv: [28, 0, 10, 14] },   // neck
        { from: [-0.15, 0.4, -0.24], size: [0.3, 0.16, 0.3], uv: [40, 0, 10, 10] },   // udder
      ] },
      { id: 'head', pivot: [0, 0.8, 0.56], boxes: [
        { from: [-0.18, 0.72, 0.6], size: [0.36, 0.36, 0.4], uv: { all: [0, 32, 14, 14], south: [16, 32, 14, 14] } },
        { from: [-0.14, 0.7, 0.98], size: [0.28, 0.2, 0.12], uv: [32, 32, 12, 10] },  // muzzle
        { from: [-0.2, 1.06, 0.66], size: [0.07, 0.16, 0.07], uv: [46, 32, 6, 10] },  // horn L
        { from: [0.13, 1.06, 0.66], size: [0.07, 0.16, 0.07], uv: [46, 32, 6, 10] },  // horn R
        { from: [-0.32, 0.96, 0.64], size: [0.14, 0.07, 0.07], uv: [54, 32, 8, 6] },  // ear L
        { from: [0.18, 0.96, 0.64], size: [0.14, 0.07, 0.07], uv: [54, 32, 8, 6] },   // ear R
      ] },
      { id: 'leg0', pivot: [-0.2, 0.52, 0.34], boxes: [{ from: [-0.28, 0, 0.28], size: [0.15, 0.54, 0.16], uv: [52, 0, 10, 16] }] },
      { id: 'leg1', pivot: [0.2, 0.52, 0.34], boxes: [{ from: [0.13, 0, 0.28], size: [0.15, 0.54, 0.16], uv: [52, 0, 10, 16] }] },
      { id: 'leg2', pivot: [-0.2, 0.52, -0.36], boxes: [{ from: [-0.28, 0, -0.44], size: [0.15, 0.54, 0.16], uv: [52, 0, 10, 16] }] },
      { id: 'leg3', pivot: [0.2, 0.52, -0.36], boxes: [{ from: [0.13, 0, -0.44], size: [0.15, 0.54, 0.16], uv: [52, 0, 10, 16] }] },
      { id: 'tail', pivot: [0, 0.66, -0.58], boxes: [{ from: [-0.04, 0.28, -0.64], size: [0.08, 0.4, 0.08], uv: [40, 14, 6, 16] }] },
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
    parts: [
      { id: 'body', pivot: [0, 0.4, 0], boxes: [
        { from: [-0.3, 0.4, -0.54], size: [0.6, 0.44, 1.02], uv: { all: [0, 0, 26, 16], up: [0, 17, 26, 10] } },
      ] },
      { id: 'head', pivot: [0, 0.5, 0.5], boxes: [
        { from: [-0.2, 0.42, 0.48], size: [0.4, 0.38, 0.34], uv: { all: [28, 0, 12, 12], south: [42, 0, 12, 12] } },
        { from: [-0.12, 0.46, 0.8], size: [0.24, 0.16, 0.1], uv: [0, 32, 10, 8] },   // snout
        { from: [-0.19, 0.74, 0.5], size: [0.13, 0.11, 0.05], uv: [12, 32, 8, 8] },  // ear L
        { from: [0.06, 0.74, 0.5], size: [0.13, 0.11, 0.05], uv: [12, 32, 8, 8] },   // ear R
      ] },
      { id: 'leg0', pivot: [-0.18, 0.4, 0.32], boxes: [{ from: [-0.26, 0, 0.24], size: [0.15, 0.4, 0.16], uv: [22, 32, 10, 14] }] },
      { id: 'leg1', pivot: [0.18, 0.4, 0.32], boxes: [{ from: [0.11, 0, 0.24], size: [0.15, 0.4, 0.16], uv: [22, 32, 10, 14] }] },
      { id: 'leg2', pivot: [-0.18, 0.4, -0.34], boxes: [{ from: [-0.26, 0, -0.4], size: [0.15, 0.4, 0.16], uv: [22, 32, 10, 14] }] },
      { id: 'leg3', pivot: [0.18, 0.4, -0.34], boxes: [{ from: [0.11, 0, -0.4], size: [0.15, 0.4, 0.16], uv: [22, 32, 10, 14] }] },
      { id: 'tail', pivot: [0, 0.52, -0.54], boxes: [
        { from: [-0.03, 0.48, -0.58], size: [0.06, 0.14, 0.06], uv: [34, 32, 10, 10] },
        { from: [0.01, 0.6, -0.64], size: [0.08, 0.06, 0.08], uv: [34, 32, 10, 10] },   // curl
      ] },
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
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.32, 0.5, -0.5], size: [0.64, 0.54, 1.0], uv: { all: [0, 0, 26, 16], up: [0, 17, 26, 10] } },
        { from: [-0.3, 0.98, -0.4], size: [0.6, 0.16, 0.78], uv: [28, 0, 20, 12] },   // back hump of wool
      ] },
      { id: 'head', pivot: [0, 0.7, 0.5], boxes: [
        { from: [-0.15, 0.62, 0.46], size: [0.3, 0.3, 0.32], uv: { all: [0, 32, 12, 12], south: [13, 32, 12, 12] } },
        { from: [-0.19, 0.84, 0.4], size: [0.38, 0.18, 0.26], uv: [26, 32, 16, 10] },  // poll fluff
        { from: [-0.1, 0.6, 0.74], size: [0.2, 0.14, 0.12], uv: [44, 32, 8, 8] },      // muzzle
        { from: [-0.22, 0.72, 0.5], size: [0.1, 0.06, 0.06], uv: [50, 0, 8, 6] },      // ear L
        { from: [0.12, 0.72, 0.5], size: [0.1, 0.06, 0.06], uv: [50, 0, 8, 6] },       // ear R
      ] },
      { id: 'leg0', pivot: [-0.18, 0.5, 0.3], boxes: [{ from: [-0.25, 0, 0.24], size: [0.11, 0.5, 0.13], uv: [50, 8, 12, 22] }] },
      { id: 'leg1', pivot: [0.18, 0.5, 0.3], boxes: [{ from: [0.14, 0, 0.24], size: [0.11, 0.5, 0.13], uv: [50, 8, 12, 22] }] },
      { id: 'leg2', pivot: [-0.18, 0.5, -0.34], boxes: [{ from: [-0.25, 0, -0.4], size: [0.11, 0.5, 0.13], uv: [50, 8, 12, 22] }] },
      { id: 'leg3', pivot: [0.18, 0.5, -0.34], boxes: [{ from: [0.14, 0, -0.4], size: [0.11, 0.5, 0.13], uv: [50, 8, 12, 22] }] },
      { id: 'tail', pivot: [0, 0.66, -0.5], boxes: [{ from: [-0.06, 0.6, -0.56], size: [0.12, 0.14, 0.1], uv: [42, 42, 10, 10] }] },
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
    parts: [
      { id: 'body', pivot: [0, 0.34, 0], boxes: [
        { from: [-0.16, 0.34, -0.26], size: [0.32, 0.36, 0.52], uv: { all: [0, 0, 16, 16], up: [18, 0, 14, 10] } },
        { from: [-0.19, 0.4, -0.16], size: [0.05, 0.26, 0.4], uv: [46, 0, 10, 20] },   // folded wing L
        { from: [0.14, 0.4, -0.16], size: [0.05, 0.26, 0.4], uv: [46, 0, 10, 20] },    // folded wing R
      ] },
      { id: 'head', pivot: [0, 0.68, 0.1], boxes: [
        { from: [-0.13, 0.68, 0.08], size: [0.26, 0.24, 0.24], uv: { all: [0, 18, 12, 12], south: [14, 18, 12, 12] } },
        { from: [-0.05, 0.68, 0.3], size: [0.1, 0.08, 0.12], uv: [28, 18, 8, 6] },     // beak
        { from: [-0.03, 0.9, 0.04], size: [0.06, 0.1, 0.2], uv: [38, 0, 6, 14] },      // comb
        { from: [-0.04, 0.58, 0.28], size: [0.08, 0.1, 0.05], uv: [38, 16, 6, 6] },    // wattle
      ] },
      { id: 'leg0', pivot: [-0.06, 0.34, 0.04], boxes: [
        { from: [-0.09, 0, 0.0], size: [0.06, 0.34, 0.06], uv: [22, 32, 6, 14] },
        { from: [-0.11, 0, 0.02], size: [0.1, 0.03, 0.14], uv: [22, 32, 6, 14] },       // foot L
      ] },
      { id: 'leg1', pivot: [0.06, 0.34, 0.04], boxes: [
        { from: [0.03, 0, 0.0], size: [0.06, 0.34, 0.06], uv: [22, 32, 6, 14] },
        { from: [0.01, 0, 0.02], size: [0.1, 0.03, 0.14], uv: [22, 32, 6, 14] },        // foot R
      ] },
      { id: 'tail', pivot: [0, 0.5, -0.26], boxes: [{ from: [-0.1, 0.5, -0.4], size: [0.2, 0.28, 0.16], uv: [0, 32, 18, 14] }] },
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
    parts: [
      { id: 'body', pivot: [0, 0.3, 0], boxes: [
        { from: [-0.17, 0.3, -0.36], size: [0.34, 0.32, 0.62], uv: { all: [0, 0, 20, 14], up: [22, 0, 16, 10] } },
        { from: [-0.08, 0.5, 0.16], size: [0.16, 0.2, 0.16], uv: [40, 0, 6, 10] },     // neck
        { from: [-0.19, 0.34, -0.24], size: [0.05, 0.2, 0.42], uv: [46, 0, 12, 18] },  // folded wing L
        { from: [0.14, 0.34, -0.24], size: [0.05, 0.2, 0.42], uv: [46, 0, 12, 18] },   // folded wing R
      ] },
      { id: 'head', pivot: [0, 0.62, 0.2], boxes: [
        { from: [-0.11, 0.62, 0.18], size: [0.22, 0.2, 0.24], uv: { all: [0, 16, 12, 12], south: [14, 16, 12, 12] } },
        { from: [-0.1, 0.6, 0.4], size: [0.2, 0.07, 0.16], uv: [28, 16, 12, 8] },      // flat bill
      ] },
      { id: 'leg0', pivot: [-0.06, 0.3, 0.0], boxes: [
        { from: [-0.09, 0.06, -0.02], size: [0.06, 0.24, 0.06], uv: [0, 32, 6, 10] },
        { from: [-0.11, 0, 0.02], size: [0.1, 0.04, 0.16], uv: [8, 32, 12, 6] },        // web foot L
      ] },
      { id: 'leg1', pivot: [0.06, 0.3, 0.0], boxes: [
        { from: [0.03, 0.06, -0.02], size: [0.06, 0.24, 0.06], uv: [0, 32, 6, 10] },
        { from: [0.01, 0, 0.02], size: [0.1, 0.04, 0.16], uv: [8, 32, 12, 6] },         // web foot R
      ] },
      { id: 'tail', pivot: [0, 0.34, -0.36], boxes: [{ from: [-0.09, 0.34, -0.42], size: [0.18, 0.12, 0.14], uv: [40, 16, 12, 8] }] },
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
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.24, 0.5, -0.5], size: [0.48, 0.42, 0.96], uv: { all: [0, 0, 24, 16], up: [0, 17, 24, 10] } },
        { from: [-0.13, 0.62, 0.36], size: [0.26, 0.3, 0.28], uv: [26, 0, 10, 14] },    // neck
      ] },
      { id: 'head', pivot: [0, 0.72, 0.5], boxes: [
        { from: [-0.15, 0.7, 0.5], size: [0.3, 0.3, 0.34], uv: { all: [0, 32, 12, 12], south: [14, 32, 12, 12] } },
        { from: [-0.1, 0.68, 0.82], size: [0.2, 0.16, 0.12], uv: [28, 32, 10, 8] },     // muzzle
        { from: [-0.05, 0.5, 0.8], size: [0.1, 0.18, 0.06], uv: [40, 32, 6, 10] },      // beard
        { from: [-0.14, 0.98, 0.44], size: [0.06, 0.16, 0.07], uv: [48, 0, 6, 12] },    // horn base L
        { from: [0.08, 0.98, 0.44], size: [0.06, 0.16, 0.07], uv: [48, 0, 6, 12] },     // horn base R
        { from: [-0.14, 1.1, 0.3], size: [0.05, 0.1, 0.16], uv: [56, 0, 6, 12] },       // horn tip L (swept back)
        { from: [0.09, 1.1, 0.3], size: [0.05, 0.1, 0.16], uv: [56, 0, 6, 12] },        // horn tip R
        { from: [-0.25, 0.84, 0.5], size: [0.11, 0.05, 0.09], uv: [48, 14, 10, 6] },    // ear L
        { from: [0.14, 0.84, 0.5], size: [0.11, 0.05, 0.09], uv: [48, 14, 10, 6] },     // ear R
      ] },
      { id: 'leg0', pivot: [-0.16, 0.5, 0.3], boxes: [{ from: [-0.23, 0, 0.24], size: [0.1, 0.5, 0.12], uv: [48, 22, 10, 20] }] },
      { id: 'leg1', pivot: [0.16, 0.5, 0.3], boxes: [{ from: [0.13, 0, 0.24], size: [0.1, 0.5, 0.12], uv: [48, 22, 10, 20] }] },
      { id: 'leg2', pivot: [-0.16, 0.5, -0.34], boxes: [{ from: [-0.23, 0, -0.4], size: [0.1, 0.5, 0.12], uv: [48, 22, 10, 20] }] },
      { id: 'leg3', pivot: [0.16, 0.5, -0.34], boxes: [{ from: [0.13, 0, -0.4], size: [0.1, 0.5, 0.12], uv: [48, 22, 10, 20] }] },
      { id: 'tail', pivot: [0, 0.6, -0.5], boxes: [{ from: [-0.04, 0.6, -0.54], size: [0.08, 0.12, 0.08], uv: [26, 16, 8, 10] }] },
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
    parts: [
      { id: 'body', pivot: [0, 0.72, 0], boxes: [
        { from: [-0.26, 0.72, -0.6], size: [0.52, 0.5, 1.2], uv: { all: [0, 0, 26, 16], up: [0, 17, 26, 10] } },
        { from: [-0.15, 0.86, 0.42], size: [0.3, 0.5, 0.36], uv: [28, 0, 12, 16] },     // neck
        { from: [-0.03, 1.1, 0.44], size: [0.06, 0.34, 0.3], uv: [44, 0, 8, 22] },      // mane (upper crest)
        { from: [-0.03, 0.9, 0.5], size: [0.06, 0.26, 0.22], uv: [44, 0, 8, 22] },      // mane (lower crest)
      ] },
      { id: 'head', pivot: [0, 1.32, 0.5], boxes: [
        { from: [-0.13, 1.26, 0.5], size: [0.26, 0.26, 0.44], uv: { all: [0, 32, 10, 12], south: [12, 32, 10, 12] } },
        { from: [-0.1, 1.22, 0.9], size: [0.2, 0.18, 0.12], uv: [24, 32, 10, 8] },      // muzzle
        { from: [-0.11, 1.5, 0.52], size: [0.06, 0.1, 0.05], uv: [36, 32, 8, 6] },      // ear L
        { from: [0.05, 1.5, 0.52], size: [0.06, 0.1, 0.05], uv: [36, 32, 8, 6] },       // ear R
        { from: [-0.05, 1.44, 0.56], size: [0.1, 0.12, 0.06], uv: [44, 0, 8, 22] },     // forelock
      ] },
      { id: 'leg0', pivot: [-0.16, 0.72, 0.36], boxes: [{ from: [-0.24, 0, 0.3], size: [0.12, 0.72, 0.15], uv: [44, 24, 10, 20] }] },
      { id: 'leg1', pivot: [0.16, 0.72, 0.36], boxes: [{ from: [0.12, 0, 0.3], size: [0.12, 0.72, 0.15], uv: [44, 24, 10, 20] }] },
      { id: 'leg2', pivot: [-0.16, 0.72, -0.42], boxes: [{ from: [-0.24, 0, -0.48], size: [0.12, 0.72, 0.15], uv: [44, 24, 10, 20] }] },
      { id: 'leg3', pivot: [0.16, 0.72, -0.42], boxes: [{ from: [0.12, 0, -0.48], size: [0.12, 0.72, 0.15], uv: [44, 24, 10, 20] }] },
      { id: 'tail', pivot: [0, 0.9, -0.6], boxes: [{ from: [-0.05, 0.42, -0.66], size: [0.1, 0.5, 0.1], uv: [54, 0, 8, 26] }] },
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
    parts: [
      { id: 'body', pivot: [0, 0.14, 0], boxes: [
        { from: [-0.13, 0.14, -0.26], size: [0.26, 0.26, 0.46], uv: { all: [0, 0, 16, 12], up: [18, 0, 14, 8] } },
        { from: [-0.15, 0.08, -0.16], size: [0.1, 0.2, 0.22], uv: [46, 12, 14, 14] },  // haunch L
        { from: [0.05, 0.08, -0.16], size: [0.1, 0.2, 0.22], uv: [46, 12, 14, 14] },   // haunch R
        { from: [-0.1, 0, 0.12], size: [0.07, 0.16, 0.08], uv: [38, 10, 6, 12] },      // front leg L
        { from: [0.03, 0, 0.12], size: [0.07, 0.16, 0.08], uv: [38, 10, 6, 12] },      // front leg R
        { from: [-0.13, 0, -0.18], size: [0.1, 0.08, 0.24], uv: [46, 0, 12, 10] },     // hind foot L
        { from: [0.03, 0, -0.18], size: [0.1, 0.08, 0.24], uv: [46, 0, 12, 10] },      // hind foot R
      ] },
      { id: 'head', pivot: [0, 0.3, 0.14], boxes: [
        { from: [-0.12, 0.28, 0.16], size: [0.24, 0.22, 0.22], uv: { all: [0, 14, 12, 12], south: [14, 14, 12, 12] } },
        { from: [-0.1, 0.48, 0.14], size: [0.07, 0.28, 0.05], uv: [28, 14, 8, 20] },   // ear L
        { from: [0.03, 0.48, 0.14], size: [0.07, 0.28, 0.05], uv: [28, 14, 8, 20] },   // ear R
      ] },
      { id: 'tail', pivot: [0, 0.22, -0.28], boxes: [{ from: [-0.06, 0.2, -0.32], size: [0.12, 0.12, 0.1], uv: [38, 0, 8, 8] }] },
    ],
  },
};
