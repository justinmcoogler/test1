// Remade mob models — the mounts and the whelp.
//
// Two parametric builders, for the same reason the goblins have one: a Courser
// and a Destrier are the same animal in different condition, and a Crag Drake
// and a Riftdrake are the same animal at different scales. Building each from a
// shared skeleton means a rider learns one silhouette per family and reads the
// rest off colour and size — exactly as with the goblins.
//
// Geometry is authored in Minecraft units (whole pixels on the 16-per-block
// grid, limbs never thinner than 2px) via mcmodel.js; skins are per-creature
// 64x64 UV islands (see mobremake.js for the def format). +z is FORWARD.
import { b, part } from './mcmodel.js';

// GRAZE — the head goes down to the grass, holds there, comes back up. The hold
// is the readable part, so it takes half the clip. (Same shape as the farm
// batch's clip; horses do this whatever else they are bred for.)
const GRAZE = (deg = 64) => ({
  length: 3.4, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.6, [deg, 0, 0]], [2.6, [deg, 0, 0]], [3.4, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.6, [4, 0, 0]], [2.6, [4, 0, 0]], [3.4, [0, 0, 0]]] },
  },
});

// FLAP — a dragon settling its wings. Not flight: this plays while the animal is
// standing about, which is the only state you ever see a wild one in. Wings are
// their own parts (`wingL`/`wingR`), deliberately named so the auto-rigger's
// leg/arm matchers leave them alone and this clip owns them.
const FLAP = {
  length: 4.4, loop: true,
  parts: {
    wingL: { rotate: [[0, [0, 0, -6]], [1.1, [0, 0, -34]], [2.2, [0, 0, -6]], [3.3, [0, 0, -22]], [4.4, [0, 0, -6]]] },
    wingR: { rotate: [[0, [0, 0, 6]], [1.1, [0, 0, 34]], [2.2, [0, 0, 6]], [3.3, [0, 0, 22]], [4.4, [0, 0, 6]]] },
    head: { rotate: [[0, [0, -10, 0]], [2.2, [0, 10, 0]], [4.4, [0, -10, 0]]] },
  },
};

// ---- horses -----------------------------------------------------------------
// Vanilla horse proportions: body 10x10x22, legs 4x14x4, arched neck, long head.
// A breed is a palette plus three numbers — height at the withers, how deep
// through the chest, how heavy the leg.
const H_UV = {
  flank: [0, 0, 26, 16], top: [0, 17, 26, 10], neck: [28, 0, 12, 16],
  headSide: [0, 32, 10, 12], headFace: [12, 32, 10, 12], muzzle: [24, 32, 10, 8],
  ear: [36, 32, 8, 6], mane: [44, 0, 8, 22], leg: [44, 24, 10, 20], tail: [54, 0, 8, 26],
};

function horseParts(d) {
  const { bw, bh, bd, legH, legW, neck } = d;
  const back = legH + bh;               // top of the barrel
  const crest = back + neck;            // where the head sits
  return [
    part('body', [0, legH, 0], [
      b([-bw / 2, legH, -bd / 2], [bw, bh, bd], { all: H_UV.flank, up: H_UV.top }),
      b([-3, legH + 6, bd / 2 - 3], [6, neck + 1, 6], H_UV.neck),
      b([-1, legH + 8, bd / 2 - 3], [2, neck - 1, 7], H_UV.mane),
    ]),
    part('head', [0, crest, bd / 2 + 1], [
      b([-3, crest - 2, bd / 2 + 1], [6, 6, 9], { all: H_UV.headSide, south: H_UV.headFace }),
      b([-2, crest - 2, bd / 2 + 10], [4, 4, 2], H_UV.muzzle),
      b([-3, crest + 4, bd / 2 + 2], [2, 3, 1], H_UV.ear),
      b([1, crest + 4, bd / 2 + 2], [2, 3, 1], H_UV.ear),
      b([-1, crest + 3, bd / 2 + 4], [2, 3, 2], H_UV.mane),
    ]),
    part('leg0', [-3, legH, bd / 2 - 3], [b([-5, 0, bd / 2 - 5], [legW, legH, legW], H_UV.leg)]),
    part('leg1', [3, legH, bd / 2 - 3], [b([1, 0, bd / 2 - 5], [legW, legH, legW], H_UV.leg)]),
    part('leg2', [-3, legH, -bd / 2 + 3], [b([-5, 0, -bd / 2 + 1], [legW, legH, legW], H_UV.leg)]),
    part('leg3', [3, legH, -bd / 2 + 3], [b([1, 0, -bd / 2 + 1], [legW, legH, legW], H_UV.leg)]),
    part('tail', [0, back - 1, -bd / 2], [b([-1, back - 13, -bd / 2 - 2], [2, 12, 2], H_UV.tail)]),
  ];
}

function paintHorse(P, pal) {
  const { coat, cdk, shine, mane, blaze, hoof, muz, eye } = pal;
  // flank — dappled coat, long strokes with the grain
  P.noise(0, 0, 26, 16, coat, 0.06, { chance: 0.08, color: shine });
  P.strokes(0, 0, 26, 16, 20, cdk, 3);
  P.spots(0, 2, 26, 10, 14, shine);
  P.rect(0, 13, 26, 3, cdk);
  // topline, with the spine a shade darker
  P.noise(0, 17, 26, 10, coat, 0.06);
  P.strokes(0, 17, 26, 10, 16, cdk, 3);
  P.rect(11, 17, 4, 10, P.shade(cdk, -0.04));
  // neck
  P.noise(28, 0, 12, 16, coat, 0.06);
  P.strokes(28, 0, 12, 16, 14, cdk, 3);
  // head — sides, then the face with its blaze and eyes
  P.noise(0, 32, 10, 12, coat, 0.06);
  P.strokes(0, 32, 10, 12, 8, cdk, 3);
  P.noise(12, 32, 10, 12, coat, 0.05);
  if (blaze) { P.rect(15, 32, 3, 12, blaze); P.spots(15, 33, 3, 10, 4, '#fff8ec'); }
  P.eye(13, 36, '#0d0906', eye);
  P.eye(19, 36, '#0d0906', eye);
  // muzzle, ears
  P.noise(24, 32, 10, 8, muz, 0.05);
  P.px(27, 36, '#100a06'); P.px(31, 36, '#100a06');
  P.noise(36, 32, 8, 6, coat, 0.05);
  P.rect(37, 33, 2, 3, cdk); P.rect(41, 33, 2, 3, cdk);
  // mane and forelock — coarse, two tones so it does not read as a flat slab
  P.noise(44, 0, 8, 22, mane, 0.06);
  P.strokes(44, 0, 8, 22, 30, P.shade(mane, -0.06), 5);
  P.strokes(44, 0, 8, 22, 14, P.shade(mane, 0.12), 4);
  // legs — coat down to a dark sock and a hoof
  P.noise(44, 24, 10, 20, coat, 0.06);
  P.strokes(44, 24, 10, 20, 10, cdk, 3);
  P.rect(44, 36, 10, 5, mane);
  P.rect(44, 41, 10, 3, hoof);
  // tail
  P.noise(54, 0, 8, 26, mane, 0.06);
  P.strokes(54, 0, 8, 26, 30, P.shade(mane, -0.06), 6);
  P.strokes(54, 0, 8, 26, 14, P.shade(mane, 0.12), 5);
}

const horse = (pal, d) => ({
  texW: 64, texH: 64, rig: 'quadruped',
  paint(ctx, P) { paintHorse(P, pal); },
  anims: { graze: GRAZE(64) },
  ambient: { clip: 'graze', every: [12, 28] },
  parts: horseParts(d),
});

// ---- dragons ----------------------------------------------------------------
// One skeleton: barrel body, arched neck, wedge head with a brow ridge, four
// legs, a long tail and a pair of membrane wings that fold along the back. The
// whelp is the same animal at a quarter scale, which is the joke — it is not a
// baby, it is just small.
const D_UV = {
  flank: [0, 0, 28, 14], top: [0, 15, 28, 10], neck: [30, 0, 12, 14],
  headSide: [0, 27, 12, 10], headFace: [14, 27, 12, 10], jaw: [28, 27, 10, 6],
  horn: [40, 27, 8, 6], wing: [0, 39, 34, 12], leg: [44, 16, 8, 18], tail: [52, 34, 10, 26],
};

function dragonParts(d) {
  const { bw, bh, bd, legH, legW, neck, headW, headH, headD, wingW, wingD } = d;
  const back = legH + bh;
  const crest = back + neck - 2;
  return [
    part('body', [0, legH, 0], [
      b([-bw / 2, legH, -bd / 2], [bw, bh, bd], { all: D_UV.flank, up: D_UV.top }),
      // neck, rising forward out of the shoulders
      b([-Math.round(bw / 4), legH + Math.round(bh / 2), bd / 2 - 3], [Math.round(bw / 2), neck, Math.round(bw / 2)], D_UV.neck),
    ]),
    part('head', [0, crest, bd / 2 + 1], [
      b([-headW / 2, crest, bd / 2 + 1], [headW, headH, headD], { all: D_UV.headSide, south: D_UV.headFace }),
      // lower jaw, set a pixel proud so the mouth line reads
      b([-headW / 2 + 1, crest - 1, bd / 2 + 2], [headW - 2, 2, headD], D_UV.jaw),
      // brow horns, swept back
      b([-headW / 2, crest + headH - 1, bd / 2 + 1], [2, 2, Math.max(2, headD - 2)], D_UV.horn),
      b([headW / 2 - 2, crest + headH - 1, bd / 2 + 1], [2, 2, Math.max(2, headD - 2)], D_UV.horn),
    ]),
    // Wings pivot at the shoulder joint, so FLAP swings them about the body
    // rather than about their own middles.
    part('wingL', [-bw / 2, back - 1, 0], [b([-bw / 2 - wingW, back - 2, -wingD / 2], [wingW, 2, wingD], D_UV.wing)]),
    part('wingR', [bw / 2, back - 1, 0], [b([bw / 2, back - 2, -wingD / 2], [wingW, 2, wingD], D_UV.wing)]),
    part('leg0', [-Math.round(bw / 3), legH, bd / 2 - 3], [b([-Math.round(bw / 3) - legW, 0, bd / 2 - 3 - legW], [legW, legH, legW], D_UV.leg)]),
    part('leg1', [Math.round(bw / 3), legH, bd / 2 - 3], [b([Math.round(bw / 3), 0, bd / 2 - 3 - legW], [legW, legH, legW], D_UV.leg)]),
    part('leg2', [-Math.round(bw / 3), legH, -bd / 2 + 3], [b([-Math.round(bw / 3) - legW, 0, -bd / 2 + 3], [legW, legH, legW], D_UV.leg)]),
    part('leg3', [Math.round(bw / 3), legH, -bd / 2 + 3], [b([Math.round(bw / 3), 0, -bd / 2 + 3], [legW, legH, legW], D_UV.leg)]),
    part('tail', [0, back - 2, -bd / 2], [b([-2, back - 4, -bd / 2 - Math.round(bd * 0.7)], [4, 4, Math.round(bd * 0.7)], D_UV.tail)]),
  ];
}

function paintDragon(P, pal) {
  const { hide, dark, belly, membrane, horn, eye, glow } = pal;
  // flank — overlapping scales over a noise base
  P.noise(0, 0, 28, 14, hide, 0.07, { chance: 0.1, color: dark });
  P.scales(0, 0, 28, 14, dark, P.shade(hide, 0.1));
  P.rect(0, 11, 28, 3, belly);
  P.noise(0, 11, 28, 3, belly, 0.05);
  // topline — the ridge down the spine
  P.noise(0, 15, 28, 10, dark, 0.06);
  P.scales(0, 15, 28, 10, P.shade(dark, -0.05));
  P.rect(13, 15, 2, 10, horn);
  // neck
  P.noise(30, 0, 12, 14, hide, 0.06);
  P.scales(30, 0, 12, 14, dark);
  // head sides + face
  P.noise(0, 27, 12, 10, hide, 0.06);
  P.scales(0, 27, 12, 10, dark);
  P.noise(14, 27, 12, 10, hide, 0.05);
  P.eye(16, 30, '#0a0806', eye);
  P.eye(23, 30, '#0a0806', eye);
  if (glow) P.glow(14, 34, 12, 2, glow, hide);   // heat in the throat
  // jaw with a row of teeth
  P.noise(28, 27, 10, 6, P.shade(hide, -0.08), 0.05);
  for (let i = 0; i < 4; i++) P.px(29 + i * 2, 27, '#efe8d4');
  // horns
  P.noise(40, 27, 8, 6, horn, 0.05);
  P.bands(40, 27, 8, 6, 2, P.shade(horn, -0.1));
  // wing membrane — struts across a thin skin
  P.noise(0, 39, 34, 12, membrane, 0.08);
  for (let i = 0; i < 6; i++) P.rect(2 + i * 5, 39, 1, 12, P.shade(membrane, -0.14));
  P.rect(0, 39, 34, 1, horn);          // leading edge
  // legs and tail
  P.noise(44, 16, 8, 18, hide, 0.06);
  P.scales(44, 16, 8, 18, dark);
  P.rect(44, 31, 8, 3, horn);          // claws
  P.noise(52, 34, 10, 26, hide, 0.06);
  P.scales(52, 34, 10, 26, dark);
}

const dragon = (pal, d) => ({
  texW: 64, texH: 64, rig: 'quadruped',
  paint(ctx, P) { paintDragon(P, pal); },
  anims: { flap: FLAP },
  ambient: { clip: 'flap', every: [8, 20] },
  parts: dragonParts(d),
});

export const MOUNTS_BATCH = {
  // --------------------------------------------------------------------------
  // The horse breeds. Same skeleton as the farm horse, at three builds — you can
  // tell them apart across a field by outline alone, before the colour lands.
  // --------------------------------------------------------------------------

  // courser — dapple grey, leggy, built for the road. Taller and lighter than
  // the pony, and the tallest thing in the paddock until a Destrier walks in.
  courser: horse({
    coat: '#a8a49e', cdk: '#6e6a64', shine: '#c8c4bc', mane: '#3a352e',
    blaze: '#efe7d6', hoof: '#2a2620', muz: '#4a453e', eye: '#c8a06a',
  }, { bw: 10, bh: 10, bd: 22, legH: 16, legW: 4, neck: 12 }),

  // destrier — black, deep through the chest, heavy in the leg. Shorter at the
  // withers than a Courser and about half again as wide.
  destrier: horse({
    coat: '#2e2a28', cdk: '#171414', shine: '#4a4442', mane: '#0e0c0c',
    blaze: null, hoof: '#100e0c', muz: '#231f1e', eye: '#a08050',
  }, { bw: 12, bh: 12, bd: 24, legH: 14, legW: 5, neck: 11 }),

  // steppe_runner — dun with a dark dorsal stripe and a coarse upright mane.
  // The lightest frame of the three, and it never quite stands still.
  steppe_runner: horse({
    coat: '#c2a068', cdk: '#8a6c3c', shine: '#dcc08c', mane: '#2c2016',
    blaze: '#e8dcc4', hoof: '#241c14', muz: '#5a4428', eye: '#d8b070',
  }, { bw: 9, bh: 9, bd: 21, legH: 17, legW: 4, neck: 12 }),

  // --------------------------------------------------------------------------
  // The dragons. One skeleton at three scales, plus the whelp. Wingspan is the
  // tell: a Crag Drake is broad and slow, a Storm Wyrm is narrow and long, and a
  // Riftdrake is simply bigger than either with the Veil showing through it.
  // --------------------------------------------------------------------------

  // crag_drake — slate and lichen, a cliff-coloured animal on a cliff. Broadest
  // wings of the three and the shortest neck: it soars, it does not chase.
  crag_drake: dragon({
    hide: '#5c6066', dark: '#3a3e44', belly: '#8a8c86', membrane: '#6e6258',
    horn: '#b8b2a4', eye: '#e8c860', glow: null,
  }, { bw: 12, bh: 10, bd: 24, legH: 10, legW: 4, neck: 8, headW: 8, headH: 7, headD: 10, wingW: 18, wingD: 14 }),

  // storm_wyrm — blue-black with a pale storm-belly, long and narrow, wings
  // more spar than sail. Built to ride wind rather than beat against it.
  storm_wyrm: dragon({
    hide: '#2a3350', dark: '#161c2e', belly: '#8496b4', membrane: '#3c4666',
    horn: '#c6ccd8', eye: '#9fe4ff', glow: null,
  }, { bw: 11, bh: 9, bd: 26, legH: 11, legW: 4, neck: 10, headW: 7, headH: 6, headD: 12, wingW: 22, wingD: 12 }),

  // riftdrake — violet-black with the Veil showing along every seam and a lit
  // throat. Bigger than either of the others in every dimension.
  riftdrake: dragon({
    hide: '#3a2a4e', dark: '#211630', belly: '#6a5480', membrane: '#4a3266',
    horn: '#d8cce8', eye: '#b0ffe8', glow: '#7fe8d0',
  }, { bw: 14, bh: 12, bd: 30, legH: 13, legW: 5, neck: 12, headW: 9, headH: 8, headD: 14, wingW: 26, wingD: 16 }),

  // dragon_whelp — the same animal at a quarter scale, and it stays that way.
  // Ember-orange, permanently warm, throat lit like a banked fire.
  dragon_whelp: dragon({
    hide: '#a04a28', dark: '#6a2c16', belly: '#e0a45c', membrane: '#8a3c22',
    horn: '#e8d4a8', eye: '#ffd050', glow: '#ff9430',
  }, { bw: 5, bh: 4, bd: 8, legH: 3, legW: 2, neck: 3, headW: 4, headH: 4, headD: 4, wingW: 7, wingD: 5 }),
};
