// Remade mob models — the wolf.
// Built to the vanilla wolf: body 6x6x9 under an 8x7x6 shoulder mane, head
// 6x6x4 with a blunt snout and pricked ears, slender 2x8x2 legs (the one
// silhouette where 2px limbs are correct) and a heavy brush tail. Geometry is in
// Minecraft pixels — see docs/MOB_BRIEF.md and mcmodel.js. +z is FORWARD.
//
// The wolf carries the ambient-clip vocabulary: a howl (head up, hold, settle,
// tail lifting with it) and a wet-dog shake, both firing now and then while idle.
import { b, part } from './mcmodel.js';

// keyframes: [t, [rx, ry, rz]] — degrees, linearly interpolated
const HOWL_HEAD = [
  [0, [0, 0, 0]],
  [0.55, [-52, 0, 0]],   // ease up into the call
  [2.35, [-56, 0, 0]],   // hold — this is the readable part
  [3.2, [0, 0, 0]],      // settle back down
];
const HOWL_BODY = [
  [0, [0, 0, 0]], [0.55, [-8, 0, 0]], [2.35, [-9, 0, 0]], [3.2, [0, 0, 0]],
];
const HOWL_TAIL = [
  [0, [0, 0, 0]], [0.6, [22, 0, 0]], [2.35, [26, 0, 0]], [3.2, [0, 0, 0]],
];
const SHAKE = (amp) => [
  [0, [0, 0, 0]], [0.1, [0, 0, amp]], [0.22, [0, 0, -amp]], [0.34, [0, 0, amp]],
  [0.46, [0, 0, -amp]], [0.58, [0, 0, amp * 0.6]], [0.75, [0, 0, 0]],
];

export const WOLF = {
  wolf: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const grey = '#b9b2a8', greyDk = '#8e877d', greyLt = '#d6d0c6';
      const cream = '#e8e2d6', nose = '#1d1a17', mouth = '#5a504a', claw = '#3a342e';
      // flank — layered grey guard hairs over a paler belly
      P.noise(0, 0, 22, 14, grey, 0.06, { chance: 0.1, color: greyDk });
      P.strokes(0, 0, 22, 14, 26, greyDk, 3);
      P.rect(0, 11, 22, 3, cream);                       // belly
      P.spots(0, 0, 22, 9, 10, greyLt);
      // back
      P.noise(0, 16, 22, 10, greyDk, 0.06); P.strokes(0, 16, 22, 10, 22, '#6f6a61', 3);
      // shoulder mane — coarse, darker, the wolf's heaviest read
      P.noise(26, 0, 20, 14, greyDk, 0.07, { chance: 0.14, color: '#6f6a61' });
      P.strokes(26, 0, 20, 14, 40, '#635e56', 4); P.spots(26, 0, 20, 14, 10, grey);
      // head sides
      P.noise(0, 30, 12, 12, grey, 0.06); P.strokes(0, 30, 12, 12, 10, greyDk, 2);
      // head front — pale mask, amber eyes set wide
      P.noise(14, 30, 12, 12, grey, 0.05);
      P.rect(17, 34, 6, 8, cream);                       // muzzle blaze
      P.eye(15, 34, '#241a08', '#c9962e'); P.eye(21, 34, '#241a08', '#c9962e');
      // snout — dark nose pad over a pale muzzle
      P.noise(28, 30, 10, 8, cream, 0.05);
      P.rect(30, 30, 6, 3, nose); P.rect(31, 34, 4, 1, mouth);
      // ears — grey outside, dark inner
      P.noise(40, 30, 10, 8, greyDk, 0.05); P.rect(42, 31, 3, 4, '#4e463e');
      // legs — grey with cream socks and dark claws
      P.noise(48, 0, 8, 18, grey, 0.06); P.strokes(48, 0, 8, 18, 10, greyDk, 3);
      P.rect(48, 13, 8, 4, cream); P.rect(48, 17, 8, 1, claw);
      // tail — brush, dark along the spine, pale underside
      P.noise(48, 20, 10, 20, grey, 0.06); P.strokes(48, 20, 10, 20, 24, greyDk, 4);
      P.rect(48, 20, 10, 4, '#6f6a61'); P.spots(48, 30, 10, 10, 8, cream);
    },
    // ambient clips — the personality. Both play once then hand back to idle.
    anims: {
      howl: {
        length: 3.2, loop: false,
        parts: { head: { rotate: HOWL_HEAD }, body: { rotate: HOWL_BODY }, tail: { rotate: HOWL_TAIL } },
      },
      shake: {
        length: 0.75, loop: false,
        parts: { body: { rotate: SHAKE(9) }, head: { rotate: SHAKE(16) }, tail: { rotate: SHAKE(22) } },
      },
    },
    ambient: { clips: ['howl', 'howl', 'shake'], every: [11, 27] }, // howls more often than it shakes
    parts: [
      part('body', [0, 8, 0], [
        b([-3, 8, -5], [6, 6, 9], { all: [0, 0, 22, 14], up: [0, 16, 22, 10] }),
        b([-4, 8, -3], [8, 7, 6], [26, 0, 20, 14]),        // shoulder mane
      ]),
      part('head', [0, 14, 4], [
        b([-3, 12, 4], [6, 6, 4], { all: [0, 30, 12, 12], south: [14, 30, 12, 12] }),
        b([-2, 12, 8], [4, 3, 2], [28, 30, 10, 8]),        // snout
        b([-3, 18, 5], [2, 2, 1], [40, 30, 10, 8]),        // ear L
        b([1, 18, 5], [2, 2, 1], [40, 30, 10, 8]),         // ear R
      ]),
      part('leg0', [-2, 8, 4], [b([-3, 0, 3], [2, 8, 2], [48, 0, 8, 18])]),
      part('leg1', [2, 8, 4], [b([1, 0, 3], [2, 8, 2], [48, 0, 8, 18])]),
      part('leg2', [-2, 8, -4], [b([-3, 0, -5], [2, 8, 2], [48, 0, 8, 18])]),
      part('leg3', [2, 8, -4], [b([1, 0, -5], [2, 8, 2], [48, 0, 8, 18])]),
      part('tail', [0, 14, -5], [b([-1, 7, -7], [2, 7, 2], [48, 20, 10, 20])]),
    ],
  },
};
