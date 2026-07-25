// Remade mob models — the deepkin.
//
// The five creatures that replaced the borrowed Minecraft roster (zombie,
// skeleton, skeletal_archer, spider, cave_slime). Each holds its predecessor's
// exact ecological slot, so the point of difference has to be the SILHOUETTE —
// a replacement that reads the same from forty blocks away has not replaced
// anything.
//
// So each one deliberately breaks the shape it inherits:
//   * slagwalker is ASYMMETRIC — one arm is a fused club of cooled slag. The
//     zombie tell is both arms straight out front; this one hangs heavy on one
//     side and never lifts it.
//   * ashen_penitent walks HEAD BOWED. The skeleton silhouette is an upright
//     archer; this is a stooped thing that never looks at you.
//   * shardcaster grows crystal OUT OF ITS BACK, so it has a raised dorsal
//     profile no humanoid has.
//   * hookleg is FLAT and WIDE with six legs that hook down from above the
//     body, not eight that splay from the middle. It reads as a ceiling-walker.
//   * seepmass is LOW and BROAD — a spreading crust, not a bouncing cube.
//
// See docs/MOB_BRIEF.md and ./mcmodel.js for the authoring rules.
import { b, part } from './mcmodel.js';

// ---- shared poses ----------------------------------------------------------
// The slag arm hangs and swings dead — heavier than the other, so it trails.
const SLAG_ARM = [-8, 0, 6];
const FREE_ARM = [-22, 0, 0];
// Bowed: the penitent's head sits forward and down at rest, and stays there.
const BOWED = [26, 0, 0];
// The casting arm is carried up and across, crystal outward.
const CAST_ARM = [-74, 0, -14];

// HEAVE — the slagwalker gathers the dead arm and drags it forward. Long, and
// the recovery is longer than the swing: it is heavy and it does not care.
const HEAVE = {
  length: 3.2, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [0.8, [-6, -14, 0]], [1.6, [4, 12, 0]], [3.2, [0, 0, 0]]] },
    arm1: { rotate: [[0, [0, 0, 0]], [0.8, [-26, 0, -10]], [1.7, [18, 0, 6]], [3.2, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.9, [8, -16, 0]], [2.0, [4, 10, 0]], [3.2, [0, 0, 0]]] },
  },
};
// COOL — it stops, and the seam in its chest dims and flares as it stands there.
const COOL = {
  length: 4.0, loop: false,
  parts: { body: { rotate: [[0, [0, 0, 0]], [1.4, [-4, 0, 0]], [2.8, [3, 0, 0]], [4.0, [0, 0, 0]]] } },
};

// SHED — the penitent shudders and a sheet of ash comes off it.
const SHED = {
  length: 2.0, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [0.25, [-7, 5, 0]], [0.5, [-5, -5, 0]], [0.75, [-6, 4, 0]], [2.0, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.25, [-10, 6, 0]], [0.6, [-8, -6, 0]], [2.0, [0, 0, 0]]] },
    arm0: { rotate: [[0, [0, 0, 0]], [0.3, [0, 0, -12]], [0.7, [0, 0, 6]], [2.0, [0, 0, 0]]] },
    arm1: { rotate: [[0, [0, 0, 0]], [0.3, [0, 0, 12]], [0.7, [0, 0, -6]], [2.0, [0, 0, 0]]] },
  },
};

// SNAP — the shardcaster breaks a splinter off its own arm and throws it. The
// wind-up is a flinch: it is hurting itself to do this.
const SNAP = {
  length: 1.6, loop: false,
  parts: {
    arm1: { rotate: [[0, [0, 0, 0]], [0.35, [30, 0, 18]], [0.6, [-46, 0, -10]], [1.6, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.35, [6, 10, 0]], [0.6, [-8, -12, 0]], [1.6, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.35, [10, 0, 0]], [0.6, [-6, 0, 0]], [1.6, [0, 0, 0]]] },
  },
};

// TAP — the hookleg's warning. Legs pick up and set down out of phase: the dry
// tapping you hear overhead before it drops.
const TAP = {
  length: 2.4, loop: false,
  parts: {
    legL0: { rotate: [[0, [0, 0, 0]], [0.3, [0, 0, -16]], [0.6, [0, 0, 0]]] },
    legR1: { rotate: [[0, [0, 0, 0]], [0.5, [0, 0, 16]], [0.8, [0, 0, 0]]] },
    legL2: { rotate: [[0, [0, 0, 0]], [0.9, [0, 0, -14]], [1.2, [0, 0, 0]]] },
    legR0: { rotate: [[0, [0, 0, 0]], [1.3, [0, 0, 14]], [1.6, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [1.0, [0, 6, 0]], [2.0, [0, -5, 0]], [2.4, [0, 0, 0]]] },
  },
};

// SEEP — the mass settles and spreads, then gathers itself back up. Slow.
const SEEP = {
  length: 5.0, loop: false,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [1.8, [3, 0, 2]], [3.4, [-2, 0, -3]], [5.0, [0, 0, 0]]] },
    dome: { rotate: [[0, [0, 0, 0]], [1.8, [-5, 8, 0]], [3.4, [4, -6, 0]], [5.0, [0, 0, 0]]] },
  },
};

export const DEEPKIN = {
  // --------------------------------------------------------------------------
  // slagwalker — player proportions (8x8x8 head, 8x12x4 body, 4x12x4 limbs,
  // 32px) with ONE arm replaced by a 6x14x6 club of cooled slag. That asymmetry
  // is the whole silhouette: it stands lopsided, drags on the heavy side, and
  // is unmistakable from any distance. (biped)
  // --------------------------------------------------------------------------
  slagwalker: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const crust = '#4a4844', crustDk = '#2e2d2a', crustLt = '#67655f';
      const hot = '#d4571c', hotLt = '#f5a03c', glass = '#3a4348', soot = '#1b1a18';
      // torso — grey slag crust, vitrified and cracked, with the seam down it
      P.noise(0, 0, 16, 18, crust, 0.1, { chance: 0.12, color: glass });
      P.strokes(0, 0, 16, 18, 14, crustDk, 4);
      P.glow(6, 2, 4, 14, hotLt, crust);                 // the seam, front of chest
      P.rect(7, 3, 2, 12, hot);
      P.spots(0, 0, 16, 18, 10, crustLt);
      P.noise(18, 0, 16, 6, crustDk, 0.08);              // shoulders/top
      // free arm — same crust, cooler
      P.noise(36, 0, 12, 20, crust, 0.09); P.strokes(36, 0, 12, 20, 8, crustDk, 3);
      P.spots(36, 0, 12, 20, 6, crustLt);
      // legs
      P.noise(36, 22, 12, 20, crust, 0.09); P.strokes(36, 22, 12, 20, 8, crustDk, 3);
      P.rect(36, 40, 12, 2, soot);                       // feet, ash-caked
      // the SLAG CLUB — heavier, still hot inside, glass beads on the surface
      P.noise(50, 0, 14, 26, crustDk, 0.12, { chance: 0.16, color: glass });
      P.glow(53, 6, 8, 12, hot, crustDk);
      P.strokes(50, 0, 14, 26, 12, soot, 5);
      P.spots(50, 0, 14, 26, 9, hotLt);
      // head — a fused mask, no jaw, two vents where the eyes were
      P.noise(0, 20, 14, 14, crust, 0.09); P.strokes(0, 22, 14, 4, 6, crustDk, 3);
      P.noise(16, 20, 14, 14, crustDk, 0.08);
      P.rect(19, 25, 3, 2, soot); P.rect(25, 25, 3, 2, soot);
      P.px(20, 25, hot); P.px(26, 25, hot);              // vents still lit
      P.rect(18, 30, 10, 3, soot); P.bands(18, 30, 10, 3, 2, crustDk);
      P.spots(16, 20, 14, 14, 7, crustLt);
    },
    anims: { heave: HEAVE, cool: COOL },
    ambient: { clips: ['cool', 'cool', 'heave'], every: [8, 19] },
    animOverrides: {
      // the attack is the club coming round — slow to start, brutal to arrive
      attack: { length: 1.1, parts: {
        arm1: { rotate: [[0, [0, 0, 0]], [0.45, [-34, 0, -16]], [0.72, [40, 0, 10]], [1.1, [0, 0, 0]]] },
        body: { rotate: [[0, [0, 0, 0]], [0.45, [0, -18, 0]], [0.72, [0, 22, 0]], [1.1, [0, 0, 0]]] },
      } },
    },
    parts: [
      part('body', [0, 12, 0], [
        b([-4, 12, -2], [8, 12, 4], { all: [0, 0, 16, 18], up: [18, 0, 16, 6] }),
      ]),
      part('head', [0, 24, 0], [
        b([-4, 24, -4], [8, 8, 8], { all: [0, 20, 14, 14], south: [16, 20, 14, 14] }),
      ]),
      // arm0 is the free arm; arm1 is the slag club — bigger, lower, heavier
      part('arm0', [-4, 24, 0], [b([-8, 12, -2], [4, 12, 4], [36, 0, 12, 20])], { rotation: FREE_ARM }),
      part('arm1', [4, 24, 0], [b([4, 10, -3], [6, 14, 6], [50, 0, 14, 26])], { rotation: SLAG_ARM }),
      part('leg0', [-2, 12, 0], [b([-4, 0, -2], [4, 12, 4], [36, 22, 12, 20])]),
      part('leg1', [2, 12, 0], [b([0, 0, -2], [4, 12, 4], [36, 22, 12, 20])]),
    ],
  },

  // --------------------------------------------------------------------------
  // ashen_penitent — gaunt (3x3 limbs) and STOOPED. The head carries a +26
  // degree rest rotation so it walks looking at the ground, which is the whole
  // read: a skeleton stands up straight and aims at you; this never lifts its
  // face. (biped)
  // --------------------------------------------------------------------------
  ashen_penitent: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const ash = '#8d8880', ashLt = '#b6b0a4', ashDk = '#5d5951';
      const bone = '#cfc7b0', ember = '#c8541e', char = '#26231f';
      // torso — bone showing through a broken skin of ash
      P.noise(0, 0, 16, 18, ash, 0.1, { chance: 0.14, color: ashLt });
      P.bands(2, 3, 12, 12, 3, ashDk);                   // ribs under the crust
      P.rect(7, 2, 2, 14, bone);
      P.spots(0, 0, 16, 18, 12, char);
      P.glow(6, 9, 4, 5, ember, ash);                    // a coal still in the chest
      P.noise(18, 0, 16, 6, ashDk, 0.08);
      // arms — thin, powdery
      P.noise(36, 0, 10, 20, ash, 0.1); P.strokes(36, 0, 10, 20, 9, ashLt, 3);
      P.rect(36, 9, 10, 1, ashDk);
      // legs
      P.noise(36, 22, 10, 20, ash, 0.1); P.strokes(36, 22, 10, 20, 9, ashDk, 3);
      P.rect(36, 40, 10, 2, char);
      // skull — sockets banked with ash, a slow ember deep in each
      P.noise(0, 20, 14, 14, ash, 0.09); P.strokes(0, 21, 14, 3, 6, ashLt, 2);
      P.noise(16, 20, 14, 14, ashLt, 0.08);
      P.rect(18, 25, 4, 4, char); P.rect(24, 25, 4, 4, char);
      P.px(19, 27, ember); P.px(25, 27, ember);
      P.rect(22, 29, 2, 2, char);
      P.rect(18, 31, 10, 2, bone); P.bands(18, 31, 10, 2, 2, char);
      P.spots(16, 20, 14, 14, 9, ashDk);
      // loose ash falling off the shoulders
      P.noise(50, 0, 8, 14, ashLt, 0.16); P.spots(50, 0, 8, 14, 20, ash);
    },
    anims: { shed: SHED },
    ambient: { clips: ['shed'], every: [5, 13] },
    parts: [
      part('body', [0, 12, 0], [
        b([-3, 12, -2], [6, 12, 4], { all: [0, 0, 16, 18], up: [18, 0, 16, 6] }),
      ]),
      part('head', [0, 24, 0], [
        b([-4, 24, -4], [8, 8, 8], { all: [0, 20, 14, 14], south: [16, 20, 14, 14] }),
      ], { rotation: BOWED }),
      part('arm0', [-3, 24, 0], [
        b([-6, 12, -2], [3, 12, 3], [36, 0, 10, 20]),
        b([-6, 21, -2], [3, 5, 3], [50, 0, 8, 14]),        // ash caked on the shoulder
      ]),
      part('arm1', [3, 24, 0], [
        b([3, 12, -2], [3, 12, 3], [36, 0, 10, 20]),
        b([3, 21, -2], [3, 5, 3], [50, 0, 8, 14]),
      ]),
      part('leg0', [-2, 12, 0], [b([-3, 0, -2], [3, 12, 3], [36, 22, 10, 20])]),
      part('leg1', [2, 12, 0], [b([0, 0, -2], [3, 12, 3], [36, 22, 10, 20])]),
    ],
  },

  // --------------------------------------------------------------------------
  // shardcaster — a hollow humanoid with veilcrystal growing out through its
  // back and one arm ending in a cluster. The dorsal spines give it a raised
  // back profile nothing else humanoid in the world has, which is what makes it
  // identifiable at the range it actually fights you from. (biped)
  // --------------------------------------------------------------------------
  shardcaster: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const hull = '#4e5560', hullDk = '#333942', hullLt = '#6e7684';
      const cryst = '#7fd6dd', crystDk = '#3d8f9a', crystLt = '#c8f4f6', dark = '#191d22';
      // torso — hollow shell, seams closed over, crystal pushing through
      P.noise(0, 0, 16, 18, hull, 0.08, { chance: 0.1, color: hullDk });
      P.outline(2, 2, 12, 14, hullDk);
      P.rect(4, 4, 8, 10, dark);                          // it is hollow inside
      P.glow(5, 5, 6, 8, crystDk, dark);
      P.strokes(0, 0, 16, 18, 8, hullLt, 3);
      // the back — where the crystal comes out. Painted on the 'up' island so
      // the dorsal boxes read as growth rather than armour plate.
      P.noise(18, 0, 16, 6, hullDk, 0.07);
      P.spots(18, 0, 16, 6, 12, cryst);
      // arms
      P.noise(36, 0, 10, 20, hull, 0.08); P.strokes(36, 0, 10, 20, 6, hullDk, 3);
      // legs
      P.noise(36, 22, 10, 20, hull, 0.08); P.strokes(36, 22, 10, 20, 6, hullDk, 3);
      // head — a smooth blank hood with one crystal seam where a face would be
      P.noise(0, 20, 14, 14, hull, 0.07);
      P.noise(16, 20, 14, 14, hullDk, 0.06);
      P.rect(21, 24, 2, 8, cryst); P.px(21, 26, crystLt); P.px(22, 29, crystLt);
      P.spots(16, 20, 14, 14, 6, hullLt);
      // the crystal cluster + dorsal spines share one bright island
      P.vgrad(48, 0, 16, 26, crystLt, crystDk, 0.07);
      P.strokes(48, 0, 16, 26, 16, cryst, 5);
      P.spots(48, 0, 16, 26, 14, crystLt);
      P.glow(52, 8, 8, 10, crystLt, crystDk);
    },
    anims: { snap: SNAP },
    ambient: { clips: ['snap'], every: [6, 15] },
    animOverrides: {
      attack: { length: 0.95, parts: {
        arm1: { rotate: [[0, [0, 0, 0]], [0.25, [26, 0, 14]], [0.45, [-44, 0, -8]], [0.95, [0, 0, 0]]] },
        head: { rotate: [[0, [0, 0, 0]], [0.25, [8, 0, 0]], [0.45, [-6, 0, 0]], [0.95, [0, 0, 0]]] },
      } },
    },
    parts: [
      part('body', [0, 12, 0], [
        b([-4, 12, -2], [8, 12, 4], { all: [0, 0, 16, 18], up: [18, 0, 16, 6] }),
        // dorsal growth — three spines up the back, tallest at the shoulders
        b([-2, 20, -4], [2, 6, 2], [48, 0, 16, 26]),
        b([1, 18, -4], [2, 5, 2], [48, 0, 16, 26]),
        b([-1, 15, -4], [2, 4, 2], [48, 0, 16, 26]),
      ]),
      part('head', [0, 24, 0], [
        b([-4, 24, -4], [8, 8, 8], { all: [0, 20, 14, 14], south: [16, 20, 14, 14] }),
      ]),
      part('arm0', [-3, 24, 0], [b([-6, 12, -2], [3, 12, 3], [36, 0, 10, 20])]),
      // arm1 is the casting arm: it ends in a cluster it snaps splinters off
      part('arm1', [3, 24, 0], [
        b([3, 14, -2], [3, 10, 3], [36, 0, 10, 20]),
        b([2, 9, -3], [5, 6, 5], [48, 0, 16, 26]),
      ], { rotation: CAST_ARM }),
      part('leg0', [-2, 12, 0], [b([-3, 0, -2], [3, 12, 3], [36, 22, 10, 20])]),
      part('leg1', [2, 12, 0], [b([0, 0, -2], [3, 12, 3], [36, 22, 10, 20])]),
    ],
  },

  // --------------------------------------------------------------------------
  // hookleg — flat, wide, eyeless. Six legs that rise from ABOVE the carapace
  // and hook back down to the floor, which is the posture of something that
  // normally has the ceiling under its feet. Nothing about it echoes a spider's
  // bulb-and-thorax profile. (quadruped — the rig walks any part named leg*)
  // --------------------------------------------------------------------------
  hookleg: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const shell = '#2b2621', shellDk = '#171412', shellLt = '#463d33';
      const wet = '#5a4a33', pale = '#9a8a6c';
      // carapace — flat chitin plates, wet-looking, scored along the length
      P.noise(0, 0, 28, 22, shell, 0.09, { chance: 0.1, color: shellDk });
      P.bands(0, 2, 28, 18, 4, shellDk);                  // segment seams
      P.strokes(0, 0, 28, 22, 14, shellLt, 4);
      P.spots(0, 0, 28, 22, 12, wet);
      // head — no eyes anywhere on it. Just plating and a pair of hooked jaws.
      P.noise(0, 24, 16, 12, shellLt, 0.08);
      P.rect(4, 32, 3, 4, shellDk); P.rect(9, 32, 3, 4, shellDk);   // jaws
      P.px(5, 35, pale); P.px(10, 35, pale);
      P.bands(0, 24, 16, 6, 3, shellDk);
      // legs — dark, banded, paler at the hooked tip
      P.noise(36, 0, 12, 30, shellDk, 0.1);
      P.bands(36, 0, 12, 30, 4, shell);
      P.rect(36, 26, 12, 4, shellLt);
      P.strokes(36, 0, 12, 30, 10, shell, 4);
      // underside plates
      P.noise(36, 34, 16, 12, wet, 0.09); P.bands(36, 34, 16, 12, 3, shellDk);
    },
    anims: { tap: TAP },
    ambient: { clips: ['tap', 'tap'], every: [4, 11] },
    parts: [
      part('body', [0, 6, 0], [
        b([-5, 6, -7], [10, 4, 14], { all: [0, 0, 28, 22], down: [36, 34, 16, 12] }),
      ]),
      part('head', [0, 7, 7], [
        b([-3, 6, 7], [6, 3, 5], { all: [0, 24, 16, 12], south: [0, 24, 16, 12] }),
      ]),
      // Six legs. Each is a horizontal spar out from the body and a hook that
      // drops from its outer end to the floor — so the knee is ABOVE the back.
      ...[-6, -1, 4].flatMap((z, i) => [
        part(`legL${i}`, [-5, 8, z + 1], [
          b([-9, 8, z], [4, 2, 2], [36, 0, 12, 30]),
          b([-11, 0, z], [2, 8, 2], [36, 0, 12, 30]),
        ]),
        part(`legR${i}`, [5, 8, z + 1], [
          b([5, 8, z], [4, 2, 2], [36, 0, 12, 30]),
          b([9, 0, z], [2, 8, 2], [36, 0, 12, 30]),
        ]),
      ]),
    ],
  },

  // --------------------------------------------------------------------------
  // seepmass — a low, broad crust of accreted mineral. Deliberately NOT a cube:
  // it is twelve pixels wide and five tall, spreading rather than bouncing, with
  // ore nodules standing proud of the shell. (lumberer — slow and heavy)
  // --------------------------------------------------------------------------
  seepmass: {
    texW: 64, texH: 64, rig: 'lumberer',
    paint(ctx, P) {
      const rock = '#4a463e', rockDk = '#2b2823', rockLt = '#6b6558';
      const seep = '#5d7a5a', seepLt = '#8fb37f', ore = '#a8682e', metal = '#8d949c';
      // the base crust — wet mineral, dripping, with ore showing in the matrix
      P.noise(0, 0, 30, 20, rock, 0.12, { chance: 0.14, color: rockDk });
      P.strokes(0, 0, 30, 20, 18, rockLt, 5);
      P.spots(0, 0, 30, 20, 16, ore);
      P.spots(0, 0, 30, 20, 10, metal);
      P.bands(0, 14, 30, 6, 3, seep);                     // the wet lower edge
      P.noise(0, 22, 24, 16, rock, 0.1, { chance: 0.12, color: seep });
      P.strokes(0, 22, 24, 16, 12, rockDk, 4);
      P.spots(0, 22, 24, 16, 12, ore);
      P.glow(8, 26, 8, 8, seepLt, rock);                  // the living seep in it
      // nodules — a bright island shared by the lumps on top
      P.vgrad(44, 0, 16, 16, ore, rockDk, 0.1);
      P.spots(44, 0, 16, 16, 14, metal);
      P.outline(44, 0, 16, 16, rockDk);
      // the toxin vent
      P.glow(44, 20, 12, 12, seepLt, seep);
      P.spots(44, 20, 12, 12, 10, rockLt);
    },
    anims: { seep: SEEP },
    ambient: { clips: ['seep'], every: [6, 14] },
    parts: [
      part('body', [0, 0, 0], [
        b([-6, 0, -5], [12, 5, 10], { all: [0, 0, 30, 20] }),
      ]),
      part('dome', [0, 5, 0], [
        b([-4, 5, -4], [8, 4, 8], { all: [0, 22, 24, 16] }),
        b([-3, 9, -2], [3, 3, 3], [44, 0, 16, 16]),       // ore nodules standing proud
        b([1, 9, -3], [2, 2, 2], [44, 0, 16, 16]),
        b([0, 9, 1], [3, 2, 3], [44, 0, 16, 16]),
        b([-1, 11, -1], [2, 2, 2], [44, 20, 12, 12]),     // the vent it lashes from
      ]),
    ],
  },
};
