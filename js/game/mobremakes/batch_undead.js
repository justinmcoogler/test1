// Remade mob models — the undead.
//
// Zombie: vanilla proportions exactly (8x8x8 head, 8x12x4 body, 4x12x4 limbs,
// 32px tall — the same skeleton as the player) with one decisive difference:
// the arms are held STRAIGHT OUT in front on a static rest rotation. That pose
// is the entire silhouette. A zombie with arms at its sides is just a green
// person; arms out and it reads as a zombie from across a field, in the dark,
// at any size. See docs/MOB_BRIEF.md.
import { b, part } from './mcmodel.js';

// Arms sit at -78 degrees about X — not a full -90, so they droop slightly and
// the walk swing reads as a lurch rather than a rigid sleepwalk.
const ARM_REST = [-78, 0, 0];

// MOAN — the head tilts back and rolls, the chest heaves, the outstretched arms
// sag and lift. Long and slow: the horror is in how unhurried it is.
const MOAN = {
  length: 3.6, loop: false,
  parts: {
    head: {
      rotate: [[0, [0, 0, 0]], [0.7, [-34, -12, 0]], [1.6, [-38, 10, 0]],
        [2.5, [-30, -6, 0]], [3.6, [0, 0, 0]]],
    },
    body: { rotate: [[0, [0, 0, 0]], [0.7, [-9, 0, 0]], [2.5, [-7, 0, 0]], [3.6, [0, 0, 0]]] },
    // additive on top of the rest pose — the arms sag then reach
    arm0: { rotate: [[0, [0, 0, 0]], [0.8, [14, 0, -8]], [2.2, [-10, 0, -4]], [3.6, [0, 0, 0]]] },
    arm1: { rotate: [[0, [0, 0, 0]], [0.8, [14, 0, 8]], [2.2, [-10, 0, 4]], [3.6, [0, 0, 0]]] },
  },
};
// LURCH — a stumble it never quite recovers from: weight pitches forward, one
// arm swings across, then it catches itself.
const LURCH = {
  length: 2.4, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [0.4, [17, 0, -7]], [1.0, [11, 0, 6]], [1.7, [14, 0, -3]], [2.4, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.4, [-12, 18, 0]], [1.0, [-6, -14, 0]], [2.4, [0, 0, 0]]] },
    arm0: { rotate: [[0, [0, 0, 0]], [0.4, [22, 0, -18]], [1.2, [-8, 0, 10]], [2.4, [0, 0, 0]]] },
    arm1: { rotate: [[0, [0, 0, 0]], [0.5, [-14, 0, 16]], [1.3, [18, 0, -8]], [2.4, [0, 0, 0]]] },
    leg0: { rotate: [[0, [0, 0, 0]], [0.4, [-20, 0, 0]], [1.0, [12, 0, 0]], [2.4, [0, 0, 0]]] },
  },
};

export const UNDEAD = {
  zombie: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const flesh = '#5a8a4a', fleshDk = '#3e6634', fleshLt = '#79a862';
      const shirt = '#3b5f8a', shirtDk = '#28425f', trouser = '#4a4a63', trouserDk = '#33334a';
      const rot = '#7d6a3a', bone = '#d8d0b8', socket = '#0d1408';
      // torso — a rotted blue shirt, torn open over grey-green ribs
      P.noise(0, 0, 16, 18, shirt, 0.07, { chance: 0.12, color: shirtDk });
      P.strokes(0, 0, 16, 18, 16, shirtDk, 3);
      P.noise(5, 6, 7, 9, flesh, 0.07);                  // the tear
      P.bands(5, 7, 7, 7, 3, fleshDk);                   // ribs through it
      P.spots(0, 0, 16, 18, 10, rot);                    // stains
      P.rect(0, 16, 16, 2, trouser);
      P.strokes(3, 4, 11, 2, 5, shirtDk, 2);
      // shoulders / top
      P.noise(18, 0, 16, 6, shirt, 0.06); P.strokes(18, 0, 16, 6, 8, shirtDk, 2); P.spots(18, 0, 16, 6, 5, rot);
      // arms — sleeve rotted away below the elbow, bare mottled forearm, black nails
      P.noise(40, 0, 10, 20, shirt, 0.07); P.strokes(40, 0, 10, 20, 8, shirtDk, 2);
      P.noise(40, 9, 10, 9, flesh, 0.08, { chance: 0.14, color: fleshDk });
      P.strokes(40, 9, 10, 9, 8, fleshDk, 2); P.spots(40, 9, 10, 9, 6, rot);
      P.rect(40, 18, 10, 2, '#1c2416');                  // fingernails
      P.px(42, 12, bone); P.px(46, 15, bone);            // bone showing through
      // legs — shredded trousers over grey shins
      P.noise(40, 22, 10, 20, trouser, 0.07); P.strokes(40, 22, 10, 20, 12, trouserDk, 3);
      P.noise(40, 34, 10, 6, flesh, 0.07); P.spots(40, 34, 10, 6, 5, fleshDk);
      P.rect(40, 40, 10, 2, '#22221c');
      // head sides — mottled hide, matted dark hair on the crown
      P.noise(0, 20, 14, 14, flesh, 0.08, { chance: 0.14, color: fleshDk });
      P.rect(0, 20, 14, 4, '#2a2a1e'); P.strokes(0, 23, 14, 3, 8, '#1c1c14', 2);
      P.spots(0, 24, 14, 10, 8, rot);
      // face — the give-away: black hollow sockets with no eye in them at all
      P.noise(16, 20, 14, 14, flesh, 0.07, { chance: 0.12, color: fleshDk });
      P.rect(16, 20, 14, 4, '#2a2a1e');                  // hairline
      P.rect(18, 25, 4, 3, socket); P.rect(24, 25, 4, 3, socket);
      P.px(19, 26, '#243a1c'); P.px(26, 26, '#243a1c');  // the faintest wet gleam
      P.rect(16, 24, 14, 1, fleshDk);                    // brow shadow
      P.rect(20, 30, 6, 2, '#1a2212');                   // slack mouth
      P.px(21, 30, bone); P.px(24, 30, bone);            // teeth
      P.spots(16, 27, 14, 6, 8, rot);
      P.strokes(16, 28, 5, 4, 3, fleshDk, 2);            // sunken cheek
    },
    anims: { moan: MOAN, lurch: LURCH },
    ambient: { clips: ['moan', 'moan', 'lurch'], every: [7, 18] },
    parts: [
      part('body', [0, 12, 0], [
        b([-4, 12, -2], [8, 12, 4], { all: [0, 0, 16, 18], up: [18, 0, 16, 6] }),
      ]),
      part('head', [0, 24, 0], [
        b([-4, 24, -4], [8, 8, 8], { all: [0, 20, 14, 14], south: [16, 20, 14, 14] }),
      ]),
      // the reaching arms — rest rotation composes with the rig's walk swing
      part('arm0', [-4, 24, 0], [b([-8, 12, -2], [4, 12, 4], [40, 0, 10, 20])], { rotation: ARM_REST }),
      part('arm1', [4, 24, 0], [b([4, 12, -2], [4, 12, 4], [40, 0, 10, 20])], { rotation: ARM_REST }),
      part('leg0', [-2, 12, 0], [b([-4, 0, -2], [4, 12, 4], [40, 22, 10, 20])]),
      part('leg1', [2, 12, 0], [b([0, 0, -2], [4, 12, 4], [40, 22, 10, 20])]),
    ],
  },
};
