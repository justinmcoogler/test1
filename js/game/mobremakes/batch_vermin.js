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

export const VERMIN = {
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
