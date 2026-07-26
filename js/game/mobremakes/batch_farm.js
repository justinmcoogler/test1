// Remade mob models — farm-animals batch.
// Eight domestic creatures (cow, pig, sheep, chicken, duck, goat, horse,
// rabbit). Geometry is authored in Minecraft units — whole pixels on the
// 16-per-block grid, limbs no thinner than 2px, proportions matched to the
// vanilla mob each animal echoes (see mcmodel.js MC_REF). Skins stay box-by-box
// UV islands painted into each animal's own 64x64 texture (see mobremake.js for
// the def format). +z is FORWARD — faces/eyes live on the south UV face.
import { b, part } from './mcmodel.js';
// The farm horse is the same animal as the mounts, plainer bred — it shares their
// skeleton builder and their painter rather than keeping a second copy that drifts.
import { horseParts, paintHorseSkin } from './batch_mounts.js';

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
      const white = '#e9e7df', wdk = '#cdc8b8', black = '#2b2723', pink = '#d98f88';
      const bone = '#ded2b4', hoof = '#241a12';
      // flank — short white hide with hard Holstein patches over it. The patches
      // are blotches rather than rectangles: a rectangle of black reads as a
      // sticker stuck on a cow.
      P.hide(0, 0, 26, 16, white, wdk, { speck: { chance: 0.03, color: wdk } });
      P.blotch(3, 2, 9, 7, black);                 // shoulder
      P.blotch(16, 6, 8, 8, black);                // hip
      P.crease(1, 12, 24, 12, '#b9b4a4', '#f4f1e8');   // where the barrel turns under
      P.ramp(0, 14, 26, 2, wdk, P.tone(wdk, -0.12), 'v');
      // topline — a flat cap, so no downward ramp, plus the dorsal patch
      P.hide(0, 17, 26, 10, white, wdk, { light: 0.05, seam: 0.1 });
      P.blotch(9, 18, 9, 6, black, { rag: 0.4 });
      // neck, and the udder
      P.hide(28, 0, 10, 14, white, wdk);
      P.blotch(30, 1, 6, 7, black);
      P.panel(40, 0, 10, 10, pink, { light: 0.16 });
      for (const tx of [42, 44, 46, 48]) { P.px(tx, 8, '#b06a64'); P.px(tx, 7, P.tone(pink, 0.1)); }
      // head sides, then the face: dark cheeks framing a white blaze
      P.hide(0, 32, 14, 14, white, wdk, { seam: 0.14 });
      P.blotch(1, 33, 6, 8, black);
      P.panel(16, 32, 14, 14, white, { light: 0.12, vary: 0.025 });
      P.blotch(16, 32, 4, 8, black, { rag: 0.35 });
      P.blotch(26, 32, 4, 8, black, { rag: 0.35 });
      P.eye(19, 37, '#1a120a', '#d8c8a8'); P.eye(24, 37, '#1a120a', '#d8c8a8');
      P.rect(20, 43, 6, 2, pink); P.px(21, 44, '#b06a64'); P.px(24, 44, '#b06a64');
      // muzzle — a big soft pink nose with real nostrils
      P.panel(32, 32, 12, 10, pink, { light: 0.18 });
      P.rect(32, 32, 12, 1, P.tone(pink, -0.14));
      P.px(35, 36, '#5a3630'); P.px(36, 36, '#5a3630');
      P.px(40, 36, '#5a3630'); P.px(41, 36, '#5a3630');
      P.rect(34, 39, 8, 1, P.tone(pink, 0.16));
      // horns, ears
      P.horn(46, 32, 6, 10, bone, { rings: 3 });
      P.panel(54, 32, 8, 6, white, { light: 0.1 });
      P.rect(55, 33, 3, 3, P.tone(pink, -0.1));
      // legs — white down to a black stocking and a horn hoof
      P.hide(52, 0, 10, 16, white, wdk);
      P.ramp(52, 8, 10, 5, white, black, 'v', 0.6);
      P.horn(52, 13, 10, 3, hoof, { rings: 2 });
      // tail — a white switch with a black tuft on the end
      P.panel(40, 14, 6, 16, white, { light: 0.16 });
      P.blotch(40, 25, 6, 5, black, { rag: 0.6 });
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
      const pink = '#e5a0a0', pdk = '#c47f7f', snoutc = '#d98f8a', hoof = '#3a2620';
      const mud = '#8e6f52', bristle = '#c98d7c';
      // flank — bare pink skin with sparse bristles, and dried mud up the low side
      // where a pig has been lying in it
      P.panel(0, 0, 26, 16, pink, { light: 0.16, vary: 0.025 });
      P.strokes(1, 1, 24, 13, 16, bristle, 2);     // bristles, not fur
      P.blotch(2, 9, 9, 6, mud, { rag: 0.7, light: 0.06 });
      P.blotch(15, 10, 8, 5, mud, { rag: 0.7, light: 0.06 });
      P.crease(1, 8, 24, 9, P.tone(pdk, -0.14), P.tone(pink, 0.12));   // the ham line
      // topline — a flat cap with the spine bristles standing up along it
      P.panel(0, 17, 26, 10, pink, { light: 0.05, seam: 0.1 });
      P.strokes(0, 18, 26, 8, 22, P.tone(bristle, -0.15), 3);
      // head sides, then the face
      P.panel(28, 0, 12, 12, pink, { light: 0.14, speck: { chance: 0.05, color: pdk } });
      P.panel(42, 0, 12, 12, P.tone(pink, 0.05), { light: 0.12 });
      P.eye(45, 4, '#1a1010', '#e6c0bc'); P.eye(50, 4, '#1a1010', '#e6c0bc');
      P.rect(44, 2, 12, 1, P.tone(pdk, -0.12));    // brow
      P.rect(45, 9, 6, 3, snoutc); P.px(46, 10, '#5a3634'); P.px(49, 10, '#5a3634');
      // snout disc — a rimmed plate with two real nostrils, the pig's whole face
      P.panel(0, 32, 10, 8, snoutc, { light: 0.1, seam: 0.2 });
      P.rect(2, 34, 2, 3, '#5a3430'); P.rect(6, 34, 2, 3, '#5a3430');
      P.rect(1, 33, 8, 1, P.tone(snoutc, 0.18));   // the lit top of the disc
      // ears — thin skin: dark outside, translucent pink within
      P.panel(12, 32, 8, 8, pdk, { light: 0.16 });
      P.ramp(13, 33, 5, 4, '#c98787', '#a86a6a', 'v');
      // legs down to cloven trotters
      P.panel(22, 32, 10, 14, pink, { light: 0.15 });
      P.ramp(22, 40, 10, 4, pink, pdk, 'v', 0.7);
      P.horn(22, 44, 10, 2, hoof, { rings: 1 });
      // the tail, and its curl
      P.panel(34, 32, 10, 10, pink, { light: 0.14 });
      P.strokes(34, 33, 10, 8, 8, P.tone(pdk, -0.1), 3);
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
      const wool = '#e7ddca', woolDk = '#c4b795', woolHi = '#f6f0e2';
      const face = '#332c27', faceHi = '#4e453c', hoof = '#181410';
      // FLEECE everywhere it is fleece: packed curls, each a dark hook with a lit
      // crown, offset row to row so nothing lines up into stripes.
      P.fleece(0, 0, 26, 16, wool, woolDk, woolHi);
      P.fleece(0, 17, 26, 10, wool, woolDk, woolHi);
      P.fleece(28, 0, 20, 12, P.tone(wool, 0.03), woolDk, woolHi);
      P.fleece(26, 32, 16, 10, wool, woolDk, woolHi);
      P.fleece(42, 42, 10, 10, wool, woolDk, woolHi);
      // the dark head, which is the only part of a sheep that is not wool
      P.hide(0, 32, 12, 12, face, faceHi, { seam: 0.16 });
      P.panel(13, 32, 12, 12, face, { light: 0.14, vary: 0.03 });
      P.rect(13, 32, 12, 2, P.tone(face, 0.14));   // the pale poll line above the eyes
      P.eye(15, 36, '#0d0a08', '#c8b48c'); P.eye(21, 36, '#0d0a08', '#c8b48c');
      P.crease(14, 41, 23, 41, P.tone(face, -0.3));
      // muzzle and ears
      P.panel(44, 32, 8, 8, faceHi, { light: 0.14 });
      P.px(46, 36, '#0d0a08'); P.px(49, 36, '#0d0a08');
      P.panel(50, 0, 8, 6, face, { light: 0.12 });
      P.rect(51, 1, 3, 3, P.tone(faceHi, 0.06));
      // legs, dark and thin, down to a black hoof
      P.hide(50, 8, 12, 22, face, faceHi);
      P.horn(50, 27, 12, 3, hoof, { rings: 1 });
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
      const white = '#f0ebe0', wdk = '#cec5b0', whi = '#fdfaf2';
      const brown = '#b07840', bdk = '#7f5227';
      const comb = '#c8322a', beak = '#e6a52c', leg = '#d99a3a', clawd = '#8a6018';
      // FEATHER, everywhere there are feathers: ranks of overlapping quills with a
      // shadow under each course, which is what plumage is and what random dashes
      // could never be.
      P.feather(0, 0, 16, 16, white, wdk, whi);
      P.feather(18, 0, 14, 10, white, wdk, whi, 4);
      P.feather(0, 18, 12, 12, white, wdk, whi);
      // the face
      P.panel(14, 18, 12, 12, white, { light: 0.12, vary: 0.02 });
      P.eye(17, 22, '#100c0a', '#e8dccb'); P.eye(22, 22, '#100c0a', '#e8dccb');
      P.rect(16, 25, 3, 2, comb); P.rect(23, 25, 3, 2, comb);
      // beak — horn, with a dark tip notch
      P.horn(28, 18, 8, 6, beak, { rings: 3 });
      P.px(31, 22, '#7a5410'); P.px(32, 22, '#7a5410');
      // comb and wattle — thick red flesh, lit along its crest
      P.panel(38, 0, 6, 14, comb, { light: 0.2, seam: 0.18 });
      P.rect(38, 0, 6, 1, P.tone(comb, 0.2));
      P.strokes(38, 2, 6, 11, 7, P.tone(comb, -0.28), 3);
      P.glow(38, 16, 6, 6, comb, '#7a1810');
      // wing — white coverts over brown flight feathers at the tip
      P.feather(46, 0, 10, 14, white, wdk, whi);
      P.feather(46, 14, 10, 6, brown, bdk, P.tone(brown, 0.16), 2);
      // tail — brown sickle feathers, coarse ranks
      P.feather(0, 32, 18, 14, brown, bdk, P.tone(brown, 0.18), 4);
      P.rect(0, 32, 18, 2, white);
      // legs — scaly yellow shank, dark claws
      P.scaled(22, 32, 6, 14, leg, '#a5701e', P.tone(leg, 0.18), 2);
      P.horn(22, 43, 6, 3, clawd, { rings: 1 });
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
        b([-3, 0, -1], [3, 1, 4], [22, 32, 6, 14]),       // foot L
      ]),
      part('leg1', [2, 5, 1], [
        b([0, 0, 0], [3, 5, 3], [22, 32, 6, 14]),
        b([0, 0, -1], [3, 1, 4], [22, 32, 6, 14]),        // foot R
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
      const white = '#eef0ea', wdk = '#cdd0c6', whi = '#fbfdf7';
      const brown = '#7a5836', bdk = '#523822';
      const bill = '#e79a2c', billDk = '#b0700f', foot = '#e79a2c', spec = '#2f6b6b';
      // body and wing — feather ranks; the drake's white body is the biggest flat
      // area on the animal and needs the layering most
      P.feather(0, 0, 20, 14, white, wdk, whi);
      P.feather(22, 0, 16, 10, white, wdk, whi, 4);
      P.panel(40, 0, 6, 10, white, { light: 0.14 });
      P.ramp(40, 0, 6, 3, brown, P.tone(brown, 0.1), 'v');   // the collar
      // head — brown, with the sheen a duck's head has
      P.feather(0, 16, 12, 12, brown, bdk, P.tone(brown, 0.2), 2);
      P.panel(14, 16, 12, 12, brown, { light: 0.13, vary: 0.025 });
      P.rect(14, 16, 12, 2, P.tone(brown, 0.14));
      P.eye(17, 20, '#0c0806', '#c8a878'); P.eye(22, 20, '#0c0806', '#c8a878');
      // bill — a flat plate, lit along the top, with nostrils and a tip nail
      P.panel(28, 16, 12, 8, bill, { light: 0.18, seam: 0.16 });
      P.rect(28, 16, 12, 1, P.tone(bill, 0.22));
      P.px(30, 20, '#7a4a10'); P.px(37, 20, '#7a4a10');
      P.rect(28, 22, 12, 1, billDk);
      P.rect(33, 17, 2, 1, P.tone(bill, -0.2));    // the nail
      // wing, with the teal speculum band across it
      P.feather(46, 0, 12, 9, white, wdk, whi);
      P.rect(46, 9, 12, 1, P.tone(wdk, -0.1));
      P.feather(46, 10, 12, 4, spec, P.tone(spec, -0.25), P.tone(spec, 0.22), 2);
      P.feather(46, 14, 12, 4, brown, bdk, P.tone(brown, 0.16), 2);
      // tail
      P.feather(40, 16, 12, 8, white, wdk, whi, 3);
      P.rect(40, 16, 12, 3, brown);
      // shanks and webbed feet — scaly, not fluffy
      P.scaled(0, 32, 6, 10, foot, billDk, P.tone(foot, 0.2), 2);
      P.panel(8, 32, 12, 6, foot, { light: 0.14 });
      for (let i = 9; i < 19; i += 4) P.rect(i, 33, 1, 4, P.tone(billDk, -0.1));  // the web's toes
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
        b([-3, 0, -1], [3, 1, 5], [8, 32, 12, 6]),        // web foot L
      ]),
      part('leg1', [2, 5, 1], [
        b([0, 1, 0], [3, 4, 3], [0, 32, 6, 10]),
        b([0, 0, -1], [3, 1, 5], [8, 32, 12, 6]),         // web foot R
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
      const hide = '#8a7c66', dark = '#5b5040', cream = '#cabfa4', beardc = '#453a2c';
      const bone = '#d8cbaa', hoof = '#221a12';
      // flank — a coarse shaggy coat, longer than a cow's, with a paler underline
      P.hide(0, 0, 24, 16, hide, dark, { speck: { chance: 0.06, color: '#9a8c74' } });
      P.strokes(1, 2, 22, 12, 22, P.tone(dark, -0.1), 4);   // shag
      P.ramp(0, 12, 24, 4, hide, cream, 'v', 0.8);
      P.crease(1, 11, 22, 12, P.tone(dark, -0.2), P.tone(hide, 0.12));
      // topline with a dark dorsal stripe down it
      P.hide(0, 17, 24, 10, P.tone(hide, -0.08), dark, { light: 0.05, seam: 0.1 });
      P.rect(11, 17, 3, 10, P.tone(dark, -0.12));
      // neck, head sides, then the face: pale muzzle band and gold slit eyes
      P.hide(26, 0, 10, 14, hide, dark);
      P.hide(0, 32, 12, 12, hide, dark, { seam: 0.15 });
      P.panel(14, 32, 12, 12, hide, { light: 0.13, vary: 0.025 });
      P.ramp(14, 40, 12, 4, P.mix(hide, cream, 0.5), cream, 'v');
      P.rect(14, 32, 12, 2, P.tone(dark, -0.1));            // brow
      P.eye(17, 36, '#241608', '#d8b862'); P.eye(22, 36, '#241608', '#d8b862');
      // muzzle, and the chin beard
      P.panel(28, 32, 10, 8, cream, { light: 0.14 });
      P.px(31, 36, '#3a2a18'); P.px(35, 36, '#3a2a18');
      P.panel(40, 32, 6, 10, beardc, { light: 0.22, seam: 0.14 });
      P.strokes(40, 33, 6, 9, 12, P.tone(beardc, -0.3), 5);
      // horns — ridged keratin, two segments of it
      P.horn(48, 0, 6, 12, bone, { rings: 2 });
      P.horn(56, 0, 6, 12, P.tone(bone, -0.1), { rings: 2 });
      // ears, legs, tail
      P.panel(48, 14, 10, 6, hide, { light: 0.12 });
      P.rect(49, 15, 4, 3, P.tone(cream, -0.06));
      P.hide(48, 22, 10, 20, P.tone(hide, -0.06), dark);
      P.horn(48, 38, 10, 4, hoof, { rings: 2 });
      P.hide(26, 16, 8, 10, hide, dark);
      P.blotch(26, 21, 8, 5, dark, { rag: 0.6 });
    },
    // vanilla goat proportions: body 10x9x16, head 6x6x7, legs 4x12x4, swept horns

    anims: { graze: GRAZE(56) }, ambient: { clip: 'graze', every: [9, 21] },
    parts: [
      part('body', [0, 12, 0], [
        b([-5, 12, -8], [10, 9, 16], { all: [0, 0, 24, 16], up: [0, 17, 24, 10] }),
        b([-3, 18, 5], [6, 7, 6], [26, 0, 10, 14]),        // neck — carries the head clear of the back
      ]),
      // head sits ABOVE the shoulders on a real neck: goats hold their heads
      // high, and overlapping the head into the body read as one shapeless lump
      part('head', [0, 23, 10], [
        b([-3, 22, 10], [6, 6, 7], { all: [0, 32, 12, 12], south: [14, 32, 12, 12] }),
        b([-2, 22, 17], [4, 3, 2], [28, 32, 10, 8]),       // muzzle
        b([-1, 19, 16], [2, 4, 1], [40, 32, 6, 10]),       // beard
        b([-4, 28, 11], [2, 3, 2], [48, 0, 6, 12]),        // horn base L
        b([2, 28, 11], [2, 3, 2], [48, 0, 6, 12]),         // horn base R
        b([-4, 30, 7], [2, 2, 5], [56, 0, 6, 12]),         // horn tip L (swept back)
        b([2, 30, 7], [2, 2, 5], [56, 0, 6, 12]),          // horn tip R
        b([-6, 26, 12], [3, 2, 2], [48, 14, 10, 6]),       // ear L
        b([3, 26, 12], [3, 2, 2], [48, 14, 10, 6]),        // ear R
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
      // The working farm horse shares the mounts' skeleton and painter (see
      // js/game/mobremakes/batch_mounts.js) — same animal, plainer breeding — so
      // its skin is that one routine with a bay palette rather than a second copy
      // of it that can drift.
      paintHorseSkin(P, {
        coat: '#8a5530', cdk: '#5c3418', shine: '#a67046', mane: '#241a10',
        blaze: '#efe7d6', hoof: '#2a2018', muz: '#3a2618', eye: '#c89a6a',
      });
    },
    // vanilla horse proportions: body 10x10x22, legs 4x14x4, arched neck, long head
    anims: { graze: GRAZE(64) }, ambient: { clip: 'graze', every: [12, 28] },
    parts: horseParts({ bw: 10, bh: 10, bd: 22, legH: 14, legW: 4, neck: 11 }),
  },

  // --------------------------------------------------------------------------
  // rabbit — brown coney: hunched body, long upright ears with pink inners, a
  // twitchy pink nose, big hind haunches/feet and a white cotton tail. (scamper)
  // --------------------------------------------------------------------------
  rabbit: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      const fur = '#8a6a48', furDk = '#634826', belly = '#d8c8b0', pink = '#d98f8a';
      const ear = '#7a5a3c', tail = '#f4f0e6';
      // flank and haunch — dense short fur with a pale belly
      P.hide(0, 0, 16, 12, fur, furDk, { speck: { chance: 0.06, color: furDk } });
      P.ramp(0, 9, 16, 3, P.mix(fur, belly, 0.5), belly, 'v');
      P.hide(18, 0, 14, 8, fur, furDk, { light: 0.05, seam: 0.1 });
      P.hide(46, 12, 14, 14, fur, furDk, { speck: { chance: 0.06, color: furDk } });
      P.crease(47, 20, 58, 18, P.tone(furDk, -0.2), P.tone(fur, 0.14));   // the thigh
      // head — sides, then the face: big dark eyes, a pink nose, whiskers
      P.hide(0, 14, 12, 12, fur, furDk, { seam: 0.14 });
      P.panel(14, 14, 12, 12, fur, { light: 0.12, vary: 0.025 });
      P.eye(16, 18, '#120d08', '#ffffff'); P.eye(22, 18, '#120d08', '#ffffff');
      P.rect(18, 23, 2, 2, pink); P.px(18, 25, '#b06a64');
      for (const wy of [22, 24]) { P.rect(14, wy, 3, 1, P.tone(belly, 0.1)); P.rect(23, wy, 3, 1, P.tone(belly, 0.1)); }
      // ears — thin skin, so the fur is on the outside and the inside glows pink
      P.panel(28, 14, 8, 20, ear, { light: 0.2, seam: 0.16 });
      P.ramp(29, 15, 2, 16, pink, P.tone(pink, -0.2), 'v');
      P.ramp(33, 15, 2, 16, pink, P.tone(pink, -0.2), 'v');
      // cotton tail, front legs, hind feet
      P.fleece(38, 0, 8, 8, tail, P.tone(tail, -0.14), '#ffffff');
      P.hide(38, 10, 6, 12, fur, furDk);
      P.ramp(38, 19, 6, 3, fur, belly, 'v');
      P.hide(46, 0, 12, 10, fur, furDk);
      P.ramp(46, 7, 12, 3, fur, belly, 'v');
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
        b([-3, 11, 4], [2, 5, 2], [28, 14, 8, 20]),       // ear L
        b([1, 11, 4], [2, 5, 2], [28, 14, 8, 20]),        // ear R
      ]),
      part('tail', [0, 6, -4], [b([-1, 4, -6], [2, 2, 2], [38, 0, 8, 8])]),
    ],
  },
};
