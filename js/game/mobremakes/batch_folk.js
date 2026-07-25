// Remade mob models — folk (the people-shaped ones).
//
// Bob: a friendly settler on full player proportions (head 8x8x8, body 8x12x4,
// limbs 4x12x4) with a broad straw hat, a beard and a satchel — the extra boxes
// are what stop a humanoid reading as a generic Steve.
// Goblin: the same skeleton deliberately mis-proportioned — an oversized head on
// a hunched short body with long low-swinging arms and stubby legs. That
// head-to-body ratio is the whole silhouette; a goblin built to player
// proportions just looks like a small person.
import { b, part } from './mcmodel.js';

// WAVE — Bob raises his right arm and swings it twice. Hand goes up over ~25%
// of the clip, waves in the middle, comes down. The head turns toward you.
const WAVE = {
  length: 2.8, loop: false,
  parts: {
    arm1: {
      rotate: [[0, [0, 0, 0]], [0.5, [-136, 0, 18]], [0.95, [-142, 0, -16]],
        [1.4, [-136, 0, 18]], [1.85, [-142, 0, -16]], [2.3, [-136, 0, 8]], [2.8, [0, 0, 0]]],
    },
    head: { rotate: [[0, [0, 0, 0]], [0.5, [-6, 14, 0]], [2.3, [-6, 14, 0]], [2.8, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.5, [0, 8, 0]], [2.3, [0, 8, 0]], [2.8, [0, 0, 0]]] },
  },
};
// TIP_HAT — a smaller courtesy: the brim comes off the brow for a beat.
const TIP_HAT = {
  length: 2.0, loop: false,
  parts: {
    arm0: { rotate: [[0, [0, 0, 0]], [0.4, [-118, 0, -24]], [1.3, [-112, 0, -20]], [2.0, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.4, [12, 0, 0]], [1.3, [10, 0, 0]], [2.0, [0, 0, 0]]] },
  },
};
// CACKLE — the goblin throws its head back, shoulders jerking. Nasty and quick.
const CACKLE = {
  length: 2.2, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.3, [-40, 0, 0]], [0.55, [-24, 0, 0]], [0.8, [-42, 0, 0]], [1.05, [-26, 0, 0]], [1.3, [-40, 0, 0]], [2.2, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.3, [-12, 0, 0]], [0.55, [-4, 0, 0]], [0.8, [-13, 0, 0]], [1.05, [-5, 0, 0]], [1.3, [-12, 0, 0]], [2.2, [0, 0, 0]]] },
    arm0: { rotate: [[0, [0, 0, 0]], [0.3, [-26, 0, -14]], [1.3, [-30, 0, -10]], [2.2, [0, 0, 0]]] },
    arm1: { rotate: [[0, [0, 0, 0]], [0.3, [-26, 0, 14]], [1.3, [-30, 0, 10]], [2.2, [0, 0, 0]]] },
  },
};
// SNEAK — drops into a crouch, glances left and right, straightens.
const SNEAK = {
  length: 2.6, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [0.4, [26, 0, 0]], [2.1, [24, 0, 0]], [2.6, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.4, [-18, -32, 0]], [1.2, [-18, 34, 0]], [2.1, [-16, -20, 0]], [2.6, [0, 0, 0]]] },
  },
};

export const FOLK = {
  // --------------------------------------------------------------------------
  // bob — a settler in a straw hat: weathered shirt, rolled sleeves, work
  // trousers, a leather satchel and a grey-brown beard. (biped)
  // --------------------------------------------------------------------------
  bob: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const shirt = '#7c9ac4', shirtDk = '#5b779e', trouser = '#6a5a44', trouserDk = '#4e4131';
      const skin = '#c99a6e', skinDk = '#a67a52', beard = '#8d8377', beardDk = '#6d6459';
      const straw = '#d8bd76', strawDk = '#ad9450', leather = '#7a5230', leatherDk = '#57391f';
      // torso front — a worn work shirt with a button placket and belt
      P.noise(0, 0, 16, 18, shirt, 0.06, { chance: 0.07, color: shirtDk });
      P.strokes(0, 0, 16, 18, 14, shirtDk, 2);
      P.rect(7, 0, 2, 13, shirtDk);                 // placket
      P.px(8, 3, '#e6e0d0'); P.px(8, 7, '#e6e0d0'); P.px(8, 11, '#e6e0d0');
      P.rect(0, 13, 16, 3, leather);                // belt
      P.rect(6, 13, 4, 3, '#c9a227'); P.outline(6, 13, 4, 3, leatherDk); // buckle
      P.rect(0, 16, 16, 2, trouser);
      // torso top / shoulders
      P.noise(18, 0, 16, 6, shirt, 0.05); P.strokes(18, 0, 16, 6, 8, shirtDk, 2);
      // arms — rolled sleeve over a tanned forearm
      P.noise(40, 0, 10, 20, shirt, 0.06); P.strokes(40, 0, 10, 20, 10, shirtDk, 2);
      P.rect(40, 11, 10, 1, shirtDk);
      P.noise(40, 12, 10, 6, skin, 0.05); P.rect(40, 18, 10, 2, skinDk); // hand
      // legs — heavy trousers, a boot at the bottom
      P.noise(40, 22, 10, 20, trouser, 0.06); P.strokes(40, 22, 10, 20, 12, trouserDk, 3);
      P.rect(40, 36, 10, 2, trouserDk); P.rect(40, 38, 10, 4, '#3a2c1e');
      // head sides — weathered skin, hair at the temple
      P.noise(0, 20, 14, 14, skin, 0.05); P.rect(0, 20, 14, 3, beardDk);
      P.strokes(0, 23, 14, 3, 6, beardDk, 2);
      // face — kind eyes with crow's feet, ruddy cheeks, brow line
      P.noise(16, 20, 14, 14, skin, 0.05);
      P.rect(16, 20, 14, 3, beardDk);               // hairline
      P.eye(19, 25, '#2f2116', '#f0e6d6'); P.eye(25, 25, '#2f2116', '#f0e6d6');
      P.px(18, 24, skinDk); P.px(28, 24, skinDk);
      P.rect(21, 27, 2, 2, skinDk);                 // nose
      P.spots(17, 27, 4, 3, 4, '#cf8f78'); P.spots(25, 27, 4, 3, 4, '#cf8f78');
      // beard — grizzled, layered strokes
      P.noise(32, 20, 12, 8, beard, 0.07, { chance: 0.16, color: beardDk });
      P.strokes(32, 20, 12, 8, 24, beardDk, 3); P.spots(32, 20, 12, 8, 8, '#a79d90');
      // straw hat — woven brim with a banded crown
      P.noise(0, 36, 20, 10, straw, 0.07, { chance: 0.14, color: strawDk });
      P.bands(0, 36, 20, 10, 2, strawDk); P.strokes(0, 36, 20, 10, 18, '#c2a862', 2);
      P.noise(22, 36, 14, 10, straw, 0.06); P.bands(22, 36, 14, 10, 2, strawDk);
      P.rect(22, 42, 14, 3, leather);               // hat band
      // satchel — scuffed leather with a strap and buckle
      P.noise(46, 44, 12, 12, leather, 0.06); P.strokes(46, 44, 12, 12, 8, leatherDk, 2);
      P.rect(46, 44, 12, 2, leatherDk); P.rect(50, 48, 4, 3, '#c9a227');
      P.spots(46, 44, 12, 12, 6, '#8d6039');
    },
    anims: { wave: WAVE, tip_hat: TIP_HAT },
    ambient: { clips: ['wave', 'tip_hat'], every: [10, 24] },
    parts: [
      part('body', [0, 12, 0], [
        b([-4, 12, -2], [8, 12, 4], { all: [0, 0, 16, 18], up: [18, 0, 16, 6] }),
        b([-6, 14, -3], [2, 5, 5], [46, 44, 12, 12]),      // satchel on the hip
      ]),
      part('head', [0, 24, 0], [
        b([-4, 24, -4], [8, 8, 8], { all: [0, 20, 14, 14], south: [16, 20, 14, 14] }),
        // beard sits on the CHIN only — a taller plate rides up over the eye
        // line and blanks the face, which is what a 1px proud box in front of
        // the head does when it overlaps the painted eyes
        b([-3, 24, 4], [6, 3, 1], [32, 20, 12, 8]),        // beard
        b([-5, 31, -5], [10, 1, 10], [0, 36, 20, 10]),     // hat brim
        b([-3, 32, -3], [6, 3, 6], [22, 36, 14, 10]),      // hat crown
      ]),
      part('arm0', [-4, 24, 0], [b([-8, 12, -2], [4, 12, 4], [40, 0, 10, 20])]),
      part('arm1', [4, 24, 0], [b([4, 12, -2], [4, 12, 4], [40, 0, 10, 20])]),
      part('leg0', [-2, 12, 0], [b([-4, 0, -2], [4, 12, 4], [40, 22, 10, 20])]),
      part('leg1', [2, 12, 0], [b([0, 0, -2], [4, 12, 4], [40, 22, 10, 20])]),
    ],
  },

  // --------------------------------------------------------------------------
  // goblin — a hunched scavenger: oversized head, hooked nose, long swept-back
  // ears, ragged loincloth, long arms and stubby legs. (biped)
  // --------------------------------------------------------------------------
  goblin: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const hide = '#6f8f4a', hideDk = '#4f6a33', hideLt = '#8aa860';
      const rag = '#7a6244', ragDk = '#57452e', tooth = '#e8e0c8', eye = '#e0b820';
      const nail = '#3a3226', wart = '#5e7a3c';
      // torso — sinewy green hide with a ribby shadow and a rag wrap
      P.noise(0, 0, 16, 14, hide, 0.07, { chance: 0.1, color: hideDk });
      P.strokes(0, 0, 16, 14, 16, hideDk, 2);
      P.bands(2, 3, 12, 6, 3, '#5d7a3d');            // ribs
      P.noise(0, 10, 16, 4, rag, 0.07); P.strokes(0, 10, 16, 4, 10, ragDk, 2);
      P.spots(0, 0, 16, 10, 8, wart);
      // shoulders
      P.noise(18, 0, 16, 6, hide, 0.06); P.strokes(18, 0, 16, 6, 8, hideDk, 2);
      // head sides — knobbly, a scar across the temple
      P.noise(0, 16, 14, 14, hide, 0.07, { chance: 0.1, color: hideDk });
      P.spots(0, 16, 14, 14, 10, wart); P.strokes(2, 20, 8, 2, 3, '#a8bb84', 1);
      // face — vast yellow eyes under a heavy brow, a wide toothy leer
      P.noise(16, 16, 14, 14, hide, 0.06);
      P.rect(16, 19, 14, 2, hideDk);                 // brow ridge
      P.eye(18, 21, '#1d2a0c', eye); P.eye(25, 21, '#1d2a0c', eye);
      P.px(19, 22, '#fff2a8'); P.px(26, 22, '#fff2a8');
      P.rect(19, 27, 10, 2, '#3a2a1c');              // mouth line
      P.px(20, 27, tooth); P.px(23, 27, tooth); P.px(26, 27, tooth); P.px(28, 27, tooth);
      P.spots(16, 16, 14, 4, 6, wart);
      // nose — long hooked beak of a thing, darker at the tip
      P.noise(32, 16, 8, 8, hideLt, 0.06); P.rect(32, 21, 8, 3, hideDk);
      P.px(34, 23, '#2f2415'); P.px(37, 23, '#2f2415');
      // ears — big swept membranes, veined, paler inside
      P.noise(42, 16, 10, 8, hide, 0.06); P.rect(43, 17, 7, 5, hideLt);
      P.strokes(43, 17, 7, 5, 5, hideDk, 1); P.outline(42, 16, 10, 8, hideDk);
      // arms — long and stringy, dirty claws
      P.noise(0, 32, 10, 20, hide, 0.07); P.strokes(0, 32, 10, 20, 14, hideDk, 3);
      P.spots(0, 32, 10, 14, 6, wart);
      P.rect(0, 48, 10, 2, hideDk); P.rect(0, 50, 10, 2, nail);
      // legs — stubby, wrapped at the shin
      P.noise(12, 32, 10, 14, hide, 0.07); P.strokes(12, 32, 10, 14, 10, hideDk, 3);
      P.noise(12, 40, 10, 4, rag, 0.06); P.bands(12, 40, 10, 4, 2, ragDk);
      P.rect(12, 44, 10, 2, nail);
      // loincloth — torn sacking
      P.noise(24, 32, 14, 10, rag, 0.08, { chance: 0.14, color: ragDk });
      P.strokes(24, 32, 14, 10, 16, ragDk, 3); P.rect(24, 40, 14, 2, ragDk);
    },
    anims: { cackle: CACKLE, sneak: SNEAK },
    ambient: { clips: ['cackle', 'sneak'], every: [8, 20] },
    parts: [
      // hunched: the body is short and set low, so the big head dominates
      part('body', [0, 7, 0], [
        b([-4, 7, -2], [8, 10, 4], { all: [0, 0, 16, 14], up: [18, 0, 16, 6] }),
        b([-4, 5, -3], [8, 4, 5], [24, 32, 14, 10]),       // loincloth
      ]),
      part('head', [0, 17, 0], [
        b([-4, 17, -4], [8, 8, 8], { all: [0, 16, 14, 14], south: [16, 16, 14, 14] }),
        b([-1, 20, 4], [2, 3, 3], [32, 16, 8, 8]),         // hooked nose
        b([-8, 21, -3], [4, 2, 5], [42, 16, 10, 8]),       // ear L (swept back)
        b([4, 21, -3], [4, 2, 5], [42, 16, 10, 8]),        // ear R
      ]),
      // arms hang past the hips — the give-away of a goblin build
      part('arm0', [-4, 17, 0], [b([-7, 5, -2], [3, 12, 3], [0, 32, 10, 20])]),
      part('arm1', [4, 17, 0], [b([4, 5, -2], [3, 12, 3], [0, 32, 10, 20])]),
      part('leg0', [-2, 7, 0], [b([-4, 0, -2], [3, 7, 3], [12, 32, 10, 14])]),
      part('leg1', [2, 7, 0], [b([1, 0, -2], [3, 7, 3], [12, 32, 10, 14])]),
    ],
  },
};
