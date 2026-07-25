// Remade mob models — vermin.
// Rat: a low scurrying rodent built on the Minecraft pixel grid. The silhouette
// that says "rat" is a long body carried close to the ground, a wedge head that
// runs straight into a pointed snout, round paper-thin ears, and a bare rope of
// a tail as long as the body. See docs/MOB_BRIEF.md.
import { b, part } from './mcmodel.js';

// GROOM — the rat rears back onto its haunches and works its forepaws over its
// muzzle, then drops. The hold in the middle is what reads at a distance.
const GROOM = {
  length: 2.6, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [0.45, [-34, 0, 0]], [1.9, [-32, 0, 0]], [2.6, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.45, [16, 0, 0]], [0.9, [26, 0, 0]], [1.3, [14, 0, 0]], [1.7, [26, 0, 0]], [1.9, [16, 0, 0]], [2.6, [0, 0, 0]]] },
    tail: { rotate: [[0, [0, 0, 0]], [0.45, [24, 0, 0]], [1.9, [22, 0, 0]], [2.6, [0, 0, 0]]] },
  },
};
// SNIFF — nose up, quick twitches, back down. Cheap and constant.
const SNIFF = {
  length: 1.4, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.18, [-20, 0, 0]], [0.38, [-10, 0, 0]], [0.58, [-22, 0, 0]], [0.8, [-8, 0, 0]], [1.4, [0, 0, 0]]] },
    tail: { rotate: [[0, [0, -14, 0]], [0.7, [0, 14, 0]], [1.4, [0, -14, 0]]] },
  },
};

// SKITTER — a burst of sideways jitter, the way a spider crosses open ground.
const SKITTER = {
  length: 0.9, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [0.12, [0, -13, 3]], [0.28, [0, 12, -3]], [0.46, [0, -10, 2]], [0.64, [0, 8, -2]], [0.9, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.12, [0, 16, 0]], [0.28, [0, -15, 0]], [0.9, [0, 0, 0]]] },
  },
};
// REAR — the threat display: front of the body lifts, forelegs come off the
// ground and hang, and it holds there before dropping back down.
const REAR = {
  length: 2.4, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [0.45, [-30, 0, 0]], [1.7, [-28, 0, 0]], [2.4, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.45, [-16, 0, 0]], [1.0, [-12, 9, 0]], [1.7, [-16, -7, 0]], [2.4, [0, 0, 0]]] },
    leg0: { rotate: [[0, [0, 0, 0]], [0.45, [0, 0, -46]], [1.7, [0, 0, -40]], [2.4, [0, 0, 0]]] },
    leg1: { rotate: [[0, [0, 0, 0]], [0.45, [0, 0, 46]], [1.7, [0, 0, 40]], [2.4, [0, 0, 0]]] },
    leg2: { rotate: [[0, [0, 0, 0]], [0.5, [0, 0, -30]], [1.7, [0, 0, -26]], [2.4, [0, 0, 0]]] },
    leg3: { rotate: [[0, [0, 0, 0]], [0.5, [0, 0, 30]], [1.7, [0, 0, 26]], [2.4, [0, 0, 0]]] },
  },
};

// One splayed leg: a long horizontal thigh reaching out from the body, and a
// shin dropping from the knee to the ground — the bent crab profile that says
// "spider" far better than a straight spoke does. 2x2 throughout, which is the
// vanilla cross-section and the deliberate slender exception in the brief.
function spiderLeg(id, side, z, reach) {
  const s = side < 0 ? -1 : 1;
  const knee = s < 0 ? -reach : reach - 2;
  return part(id, [s * 4, 8, z + 1], [
    b([s < 0 ? -reach : 4, 8, z], [reach - 4, 2, 2], [0, 40, 16, 6]),   // thigh
    b([knee, 0, z], [2, 8, 2], [0, 48, 6, 16]),                          // shin
  ]);
}

export const VERMIN = {
  // --------------------------------------------------------------------------
  // spider — vanilla build: a big abdomen behind a small thorax and a broad
  // head, carried on eight long bent legs. Eight red eyes in two rows.
  // --------------------------------------------------------------------------
  spider: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const chitin = '#2e2622', chitinDk = '#1a1512', chitinLt = '#443a33';
      const hair = '#151110', eye = '#c22a1e', eyeLt = '#ff6a52', fang = '#d8cbb0';
      // abdomen — bulbous, bristled, with a pale hourglass on the back
      P.noise(0, 0, 22, 14, chitin, 0.07, { chance: 0.12, color: chitinDk });
      P.strokes(0, 0, 22, 14, 34, hair, 3);
      P.spots(0, 0, 22, 14, 10, chitinLt);
      P.noise(24, 0, 20, 12, chitinDk, 0.06);
      P.rect(31, 1, 6, 4, '#7a3026'); P.rect(32, 5, 4, 5, '#7a3026');  // hourglass
      P.strokes(24, 0, 20, 12, 24, hair, 3);
      // thorax
      P.noise(46, 0, 12, 12, chitin, 0.07); P.strokes(46, 0, 12, 12, 16, hair, 3);
      // head sides
      P.noise(0, 16, 12, 12, chitin, 0.07); P.strokes(0, 16, 12, 12, 12, hair, 2);
      // face — eight eyes: a row of four small, two big in the middle, two outer
      P.noise(14, 16, 12, 12, chitin, 0.06);
      P.eye(16, 20, eye, eyeLt); P.eye(22, 20, eye, eyeLt);       // principal pair
      P.px(19, 21, eyeLt); P.px(20, 21, eyeLt);
      P.px(15, 24, eye); P.px(18, 25, eye); P.px(21, 25, eye); P.px(24, 24, eye);
      P.strokes(14, 16, 12, 3, 6, hair, 2);                        // bristled brow
      // chelicerae / fangs
      P.noise(28, 16, 10, 8, chitinDk, 0.06);
      P.rect(30, 21, 2, 3, fang); P.rect(34, 21, 2, 3, fang);
      // thigh strip (long horizontal segments)
      P.noise(0, 40, 16, 6, chitin, 0.07); P.bands(0, 40, 16, 6, 3, chitinDk);
      P.strokes(0, 40, 16, 6, 14, hair, 2);
      // shin strip (vertical segments, pale joint at the top, dark claw tip)
      P.noise(0, 48, 6, 16, chitin, 0.07); P.rect(0, 48, 6, 2, chitinLt);
      P.bands(0, 50, 6, 12, 3, chitinDk); P.rect(0, 62, 6, 2, hair);
    },
    anims: { skitter: SKITTER, rear: REAR },
    ambient: { clips: ['skitter', 'skitter', 'rear'], every: [6, 16] },
    parts: [
      part('body', [0, 3, 0], [
        b([-5, 3, -13], [10, 8, 12], { all: [0, 0, 22, 14], up: [24, 0, 20, 12] }),   // abdomen
        b([-3, 4, -1], [6, 6, 6], [46, 0, 12, 12]),                                   // thorax
      ]),
      part('head', [0, 7, 5], [
        b([-4, 3, 5], [8, 8, 8], { all: [0, 16, 12, 12], south: [14, 16, 12, 12] }),
        b([-3, 3, 13], [2, 2, 2], [28, 16, 10, 8]),        // fang L
        b([1, 3, 13], [2, 2, 2], [28, 16, 10, 8]),         // fang R
      ]),
      // four pairs, front to back; the front pair reaches furthest
      spiderLeg('leg0', -1, 3, 12), spiderLeg('leg1', 1, 3, 12),
      spiderLeg('leg2', -1, -1, 11), spiderLeg('leg3', 1, -1, 11),
      spiderLeg('leg4', -1, -5, 11), spiderLeg('leg5', 1, -5, 11),
      spiderLeg('leg6', -1, -9, 12), spiderLeg('leg7', 1, -9, 12),
    ],
  },

  rat: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      const fur = '#6b6058', furDk = '#4a423c', furLt = '#8b7f74';
      const belly = '#b8ad9e', skin = '#c98f8a', skinDk = '#9a6a66', eye = '#2a0d0d';
      // flank — coarse guard hairs, paler along the belly line
      P.noise(0, 0, 20, 10, fur, 0.07, { chance: 0.12, color: furDk });
      P.strokes(0, 0, 20, 10, 26, furDk, 3);
      P.rect(0, 8, 20, 2, belly);
      P.spots(0, 0, 20, 7, 8, furLt);
      // back — darker dorsal stripe down the spine
      P.noise(0, 12, 20, 8, furDk, 0.07); P.strokes(0, 12, 20, 8, 22, '#3b342f', 3);
      P.rect(9, 12, 3, 8, '#332d29');
      // head sides
      P.noise(22, 0, 10, 10, fur, 0.06); P.strokes(22, 0, 10, 10, 10, furDk, 2);
      // head front — beady red eyes set wide, pale cheeks
      P.noise(34, 0, 10, 10, fur, 0.06);
      P.rect(36, 6, 6, 4, belly);
      P.eye(35, 3, eye, '#e8c0b8'); P.eye(40, 3, eye, '#e8c0b8');
      // snout — bare pink skin, dark nose tip, whisker flecks
      P.noise(46, 0, 8, 8, skin, 0.05); P.rect(46, 0, 8, 2, skinDk);
      P.px(49, 5, '#3a1e1c'); P.px(50, 5, '#3a1e1c');
      P.strokes(46, 6, 8, 2, 5, '#e8d8d0', 1);
      // ears — thin pink membrane inside a furred rim
      P.noise(46, 10, 6, 6, furDk, 0.05); P.rect(47, 11, 4, 4, skin); P.outline(46, 10, 6, 6, '#3b342f');
      // paws — small, pink toes
      P.noise(0, 22, 8, 8, fur, 0.05); P.rect(0, 28, 8, 2, skin); P.px(2, 29, skinDk); P.px(5, 29, skinDk);
      // tail — scaly rope, banded, pale underside
      P.noise(10, 22, 10, 8, skinDk, 0.06); P.bands(10, 22, 10, 8, 2, '#7d5450');
      P.rect(10, 28, 10, 2, skin);
      P.noise(22, 22, 10, 6, skinDk, 0.06); P.bands(22, 22, 10, 6, 2, '#7d5450');
    },
    anims: { groom: GROOM, sniff: SNIFF },
    ambient: { clips: ['sniff', 'sniff', 'groom'], every: [6, 15] },
    parts: [
      part('body', [0, 3, 0], [
        b([-2, 3, -5], [4, 4, 9], { all: [0, 0, 20, 10], up: [0, 12, 20, 8] }),
      ]),
      part('head', [0, 5, 4], [
        b([-2, 3, 4], [4, 4, 4], { all: [22, 0, 10, 10], south: [34, 0, 10, 10] }),
        b([-1, 3, 8], [2, 2, 2], [46, 0, 8, 8]),        // snout
        b([-3, 7, 4], [2, 2, 2], [46, 10, 6, 6]),       // ear L
        b([1, 7, 4], [2, 2, 2], [46, 10, 6, 6]),        // ear R
      ]),
      part('leg0', [-2, 3, 3], [b([-3, 0, 2], [2, 3, 2], [0, 22, 8, 8])]),
      part('leg1', [2, 3, 3], [b([1, 0, 2], [2, 3, 2], [0, 22, 8, 8])]),
      part('leg2', [-2, 3, -3], [b([-3, 0, -4], [2, 3, 2], [0, 22, 8, 8])]),
      part('leg3', [2, 3, -3], [b([1, 0, -4], [2, 3, 2], [0, 22, 8, 8])]),
      part('tail', [0, 5, -5], [
        b([-1, 4, -9], [2, 2, 4], [10, 22, 10, 8]),     // thick base
        b([-1, 4, -14], [1, 1, 5], [22, 22, 10, 6]),    // bare tapering rope
      ]),
    ],
  },
};
