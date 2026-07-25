// Remade mob models — the life of the sky archipelago.
//
// These are seen from angles nothing else in the roster is: from BELOW as you
// climb toward an island, and from above as you come down onto one. So the read
// has to work on the underside and the plan view, not just the profile — which
// is why every one of them puts its distinguishing feature somewhere you can see
// from underneath.
//
//   mistgrazer     a pale fleece and four square legs. The one thing up here
//                  that is worth arriving for rather than surviving.
//   lancewing      swept wings and a spike of a beak, seen head-on as it dives.
//   tetherling     a gasbag with roots hanging off it — the only thing in the
//                  game whose silhouette is defined by what dangles.
//   anvilhead      a slab of a head wider than its shoulders, meteoric crust up
//                  its spine.
//   skyveil_warden six wings in three pairs and a turning ring of veilcrystal
//                  where a head should be.
import { b, part } from './mcmodel.js';

// Wings that beat rather than flap: a long slow cycle, because everything up
// here is soaring on an updraft, not hovering.
const SOAR = {
  length: 3.4, loop: true,
  parts: {
    wingL: { rotate: [[0, [0, 0, 6]], [1.7, [0, 0, -10]], [3.4, [0, 0, 6]]] },
    wingR: { rotate: [[0, [0, 0, -6]], [1.7, [0, 0, 10]], [3.4, [0, 0, -6]]] },
  },
};

// GRAZE — the mistgrazer's head goes down, works along, comes up to look at
// nothing in particular. Long and unhurried: that placidity IS the creature.
const GRAZE = {
  length: 5.0, loop: false,
  parts: {
    neck: { rotate: [[0, [0, 0, 0]], [0.9, [58, 0, 0]], [3.2, [54, -12, 0]], [4.1, [56, 10, 0]], [5.0, [0, 0, 0]]] },
    head: { rotate: [[0, [0, 0, 0]], [0.9, [16, 0, 0]], [3.2, [12, -8, 0]], [5.0, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [1.4, [3, 0, 0]], [3.6, [-2, 0, 0]], [5.0, [0, 0, 0]]] },
  },
};

// STOOP — the lancewing folds and drops. The wings come IN, which is the tell
// that it has committed and is no longer circling.
const STOOP = {
  length: 1.8, loop: false,
  parts: {
    wingL: { rotate: [[0, [0, 0, 0]], [0.35, [0, 0, -46]], [1.1, [0, 0, -52]], [1.8, [0, 0, 0]]] },
    wingR: { rotate: [[0, [0, 0, 0]], [0.35, [0, 0, 46]], [1.1, [0, 0, 52]], [1.8, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.35, [-34, 0, 0]], [1.1, [-40, 0, 0]], [1.8, [0, 0, 0]]] },
  },
};

// DRIFT — the tetherling does nothing, slowly. The tethers swing behind it.
const DRIFT = {
  length: 6.0, loop: true,
  parts: {
    body: { rotate: [[0, [0, 0, 0]], [2.0, [3, 6, 2]], [4.0, [-2, -5, -3]], [6.0, [0, 0, 0]]] },
    tether0: { rotate: [[0, [0, 0, 0]], [2.0, [7, 0, 5]], [4.0, [-6, 0, -4]], [6.0, [0, 0, 0]]] },
    tether1: { rotate: [[0, [0, 0, 0]], [2.2, [-5, 0, -6]], [4.4, [6, 0, 4]], [6.0, [0, 0, 0]]] },
  },
};

// SETTLE — the anvilhead lowers its head plate and plants itself. A warning, and
// the only fast thing it ever does.
const SETTLE = {
  length: 2.2, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.4, [26, 0, 0]], [1.6, [24, 0, 0]], [2.2, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.4, [8, 0, 0]], [1.6, [7, 0, 0]], [2.2, [0, 0, 0]]] },
  },
};

// TURN — the warden's ring rotates, always, whatever else it is doing.
const TURN = {
  length: 8.0, loop: true,
  parts: { ring: { rotate: [[0, [0, 0, 0]], [4.0, [0, 180, 0]], [8.0, [0, 360, 0]]] } },
};

export const SKYFAUNA = {
  // --------------------------------------------------------------------------
  // mistgrazer — cow proportions (12x10x18 body on 4x12x4 legs) with a long neck
  // added, because the neck is what you see against the sky from below while it
  // grazes the rim of an island. (quadruped)
  // --------------------------------------------------------------------------
  mistgrazer: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const fleece = '#c8c4b6', fleeceLt = '#e2ded0', fleeceDk = '#9a968a';
      const hide = '#8a8272', horn = '#6c6558', dark = '#2a2822';
      // flanks — a damp, matted fleece
      P.noise(0, 0, 28, 20, fleece, 0.08, { chance: 0.14, color: fleeceLt });
      P.strokes(0, 0, 28, 20, 30, fleeceDk, 3);
      P.spots(0, 0, 28, 20, 14, fleeceLt);
      // underside, seen from below on the climb — paler, so it reads against rock
      P.noise(0, 22, 24, 12, fleeceLt, 0.06);
      P.strokes(0, 22, 24, 12, 12, fleece, 2);
      // head + the long neck
      P.noise(30, 0, 16, 14, hide, 0.07);
      P.rect(34, 5, 3, 3, dark); P.rect(40, 5, 3, 3, dark);       // eyes
      P.rect(35, 10, 7, 3, fleeceDk);                             // muzzle
      P.noise(30, 16, 10, 18, fleece, 0.07); P.strokes(30, 16, 10, 18, 10, fleeceDk, 3);
      // legs
      P.noise(48, 0, 12, 22, hide, 0.07); P.rect(48, 18, 12, 4, horn);
      P.noise(48, 24, 12, 10, fleeceDk, 0.06);
    },
    anims: { graze: GRAZE },
    ambient: { clips: ['graze', 'graze'], every: [4, 10] },
    parts: [
      part('body', [0, 14, 0], [
        b([-6, 14, -9], [12, 10, 18], { all: [0, 0, 28, 20], down: [0, 22, 24, 12] }),
      ]),
      part('neck', [0, 22, 8], [b([-3, 22, 7], [6, 12, 6], [30, 16, 10, 18])]),
      part('head', [0, 33, 9], [
        b([-4, 30, 8], [8, 7, 9], { all: [30, 0, 16, 14], south: [30, 0, 16, 14] }),
      ]),
      part('legL0', [-4, 14, 6], [b([-6, 0, 4], [4, 14, 4], [48, 0, 12, 22])]),
      part('legR0', [4, 14, 6], [b([2, 0, 4], [4, 14, 4], [48, 0, 12, 22])]),
      part('legL1', [-4, 14, -6], [b([-6, 0, -8], [4, 14, 4], [48, 0, 12, 22])]),
      part('legR1', [4, 14, -6], [b([2, 0, -8], [4, 14, 4], [48, 0, 12, 22])]),
    ],
  },

  // --------------------------------------------------------------------------
  // lancewing — a dart. Narrow body, wings swept BACK rather than out, and a
  // long pale beak that is the first part of it you ever see, because it comes
  // at you nose-first out of the light. (floater)
  // --------------------------------------------------------------------------
  lancewing: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const slate = '#4a5060', slateDk = '#2c313d', slateLt = '#6e7688';
      const bone = '#d8cfa8', dark = '#15181e', flash = '#b6532f';
      P.noise(0, 0, 24, 16, slate, 0.08);
      P.strokes(0, 0, 24, 16, 18, slateDk, 3);
      P.bands(0, 2, 24, 12, 4, slateDk);                          // barred back
      P.noise(0, 18, 20, 10, slateLt, 0.06);                      // pale belly, seen from below
      // head: a hard eye and the lance
      P.noise(26, 0, 14, 12, slateDk, 0.06);
      P.eye(30, 4, dark, '#e8e2d0'); P.eye(35, 4, dark, '#e8e2d0');
      P.rect(28, 9, 10, 2, flash);
      P.vgrad(42, 0, 8, 14, bone, '#8d8564', 0.05);               // beak
      // wings: long, dark above and pale beneath
      P.noise(0, 30, 34, 12, slate, 0.07); P.strokes(0, 30, 34, 12, 22, slateDk, 4);
      P.noise(0, 44, 34, 10, slateLt, 0.05);
      P.rect(0, 30, 34, 2, slateDk);
      // tail
      P.noise(42, 16, 10, 18, slate, 0.07); P.bands(42, 16, 10, 18, 4, slateDk);
    },
    anims: { soar: SOAR, stoop: STOOP },
    ambient: { clips: ['soar', 'stoop'], every: [3, 9] },
    animOverrides: {
      attack: { length: 0.8, parts: {
        body: { rotate: [[0, [0, 0, 0]], [0.3, [-30, 0, 0]], [0.5, [12, 0, 0]], [0.8, [0, 0, 0]]] },
        wingL: { rotate: [[0, [0, 0, 0]], [0.3, [0, 0, -40]], [0.8, [0, 0, 0]]] },
        wingR: { rotate: [[0, [0, 0, 0]], [0.3, [0, 0, 40]], [0.8, [0, 0, 0]]] },
      } },
    },
    parts: [
      part('body', [0, 8, 0], [
        b([-3, 6, -8], [6, 6, 16], { all: [0, 0, 24, 16], down: [0, 18, 20, 10] }),
      ]),
      part('head', [0, 9, 8], [
        b([-2.5, 7, 8], [5, 5, 5], { all: [26, 0, 14, 12], south: [26, 0, 14, 12] }),
        b([-1, 8, 13], [2, 2, 7], [42, 0, 8, 14]),                // the lance
      ]),
      part('wingL', [-3, 10, 2], [b([-19, 9, -4], [16, 2, 10], { all: [0, 30, 34, 12], down: [0, 44, 34, 10] })]),
      part('wingR', [3, 10, 2], [b([3, 9, -4], [16, 2, 10], { all: [0, 30, 34, 12], down: [0, 44, 34, 10] })]),
      part('tail', [0, 8, -8], [b([-2, 7, -15], [4, 2, 8], [42, 16, 10, 18])]),
    ],
  },

  // --------------------------------------------------------------------------
  // tetherling — a bladder and the roots hanging under it. The only creature in
  // the game whose read is entirely in what dangles, which is exactly right for
  // something you meet from below. (floater)
  // --------------------------------------------------------------------------
  tetherling: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const skin = '#b0a276', skinLt = '#d6c894', skinDk = '#7e7250';
      const root = '#6a5a3c', rootDk = '#463a26', glow = '#e8dda0';
      // the bladder — translucent-looking, veined
      P.vgrad(0, 0, 28, 22, skinLt, skinDk, 0.05);
      P.strokes(0, 0, 28, 22, 22, skinDk, 5);                     // veins
      P.spots(0, 0, 28, 22, 16, skinLt);
      P.glow(9, 6, 10, 10, glow, skin);                           // the gas sac, lit from within
      P.noise(0, 24, 24, 12, skin, 0.06);                         // underside
      P.spots(0, 24, 24, 12, 12, skinDk);
      // tethers
      P.noise(32, 0, 10, 26, root, 0.09); P.strokes(32, 0, 10, 26, 14, rootDk, 5);
      // the crown bud
      P.noise(46, 0, 12, 12, skinLt, 0.07); P.spots(46, 0, 12, 12, 8, glow);
    },
    anims: { drift: DRIFT },
    ambient: { clips: ['drift'], every: [2, 6] },
    parts: [
      part('body', [0, 14, 0], [
        b([-6, 10, -6], [12, 12, 12], { all: [0, 0, 28, 22], down: [0, 24, 24, 12] }),
      ]),
      part('crown', [0, 22, 0], [b([-3, 22, -3], [6, 4, 6], [46, 0, 12, 12])]),
      part('tether0', [-3, 10, 3], [b([-4, 1, 2], [2, 9, 2], [32, 0, 10, 26])]),
      part('tether1', [3, 10, -3], [b([2, 0, -4], [2, 10, 2], [32, 0, 10, 26])]),
      part('tether2', [0, 10, 0], [b([-1, 3, -1], [2, 7, 2], [32, 0, 10, 26])]),
    ],
  },

  // --------------------------------------------------------------------------
  // anvilhead — the head is WIDER than the shoulders and flat on top. That is
  // the whole silhouette and it is legible from directly above, which is how you
  // will meet it: you come down onto its island and it is already looking up.
  // (quadruped)
  // --------------------------------------------------------------------------
  anvilhead: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const grey = '#575a60', greyDk = '#34363b', greyLt = '#7a7e86';
      const iron = '#8d949c', rust = '#9a5f2c', dark = '#1b1d21';
      P.noise(0, 0, 28, 20, grey, 0.09, { chance: 0.12, color: greyDk });
      P.strokes(0, 0, 28, 20, 20, greyLt, 4);
      P.spots(0, 0, 28, 20, 14, rust);                            // meteoric crust
      P.bands(0, 3, 28, 14, 6, greyDk);                           // plating
      P.noise(0, 22, 24, 12, greyDk, 0.06);                       // underside
      // the head plate — a brow of iron over a dark face
      P.noise(30, 0, 20, 14, greyLt, 0.07);
      P.rect(30, 0, 20, 3, iron);
      P.rect(34, 6, 4, 3, dark); P.rect(42, 6, 4, 3, dark);
      P.spots(30, 0, 20, 14, 10, rust);
      // legs — short, thick, iron-shod
      P.noise(50, 0, 12, 20, grey, 0.08); P.rect(50, 16, 12, 4, iron);
      // the crust ridge
      P.vgrad(50, 22, 12, 12, rust, greyDk, 0.08);
      P.spots(50, 22, 12, 12, 10, iron);
    },
    anims: { settle: SETTLE },
    ambient: { clips: ['settle'], every: [6, 14] },
    parts: [
      part('body', [0, 12, 0], [
        b([-7, 12, -10], [14, 11, 20], { all: [0, 0, 28, 20], down: [0, 22, 24, 12] }),
        b([-3, 23, -4], [6, 3, 9], [50, 22, 12, 12]),             // crust up the spine
      ]),
      part('head', [0, 18, 10], [
        b([-8, 13, 10], [16, 9, 8], { all: [30, 0, 20, 14], south: [30, 0, 20, 14] }),
        b([-9, 21, 10], [18, 3, 6], [50, 22, 12, 12]),            // the brow plate
      ]),
      part('legL0', [-5, 12, 7], [b([-7, 0, 5], [5, 12, 5], [50, 0, 12, 20])]),
      part('legR0', [5, 12, 7], [b([2, 0, 5], [5, 12, 5], [50, 0, 12, 20])]),
      part('legL1', [-5, 12, -7], [b([-7, 0, -10], [5, 12, 5], [50, 0, 12, 20])]),
      part('legR1', [5, 12, -7], [b([2, 0, -10], [5, 12, 5], [50, 0, 12, 20])]),
    ],
  },

  // --------------------------------------------------------------------------
  // skyveil_warden — three PAIRS of wings, stepped down the body, and a ring of
  // veilcrystal turning where a head should be. Nothing else in the world has a
  // six-wing plan, which is what makes it read as the thing at the top of the
  // sky the moment it clears the horizon. (floater)
  // --------------------------------------------------------------------------
  skyveil_warden: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const hull = '#333a49', hullDk = '#1d222c', hullLt = '#4e5768';
      const cryst = '#84dbe2', crystLt = '#cff6f8', crystDk = '#39939e', dark = '#0f1218';
      P.noise(0, 0, 26, 20, hull, 0.08, { chance: 0.1, color: hullDk });
      P.strokes(0, 0, 26, 20, 16, hullLt, 4);
      P.glow(8, 5, 10, 10, crystDk, hull);                        // the light inside it
      P.noise(0, 22, 22, 12, hullDk, 0.06);
      P.spots(0, 22, 22, 12, 14, cryst);                          // lit from beneath
      // wings — dark, veined with crystal along the leading edge
      P.noise(0, 36, 36, 12, hull, 0.07); P.strokes(0, 36, 36, 12, 24, hullDk, 5);
      P.rect(0, 36, 36, 2, cryst);
      P.noise(0, 50, 36, 10, hullDk, 0.05);
      // the ring
      P.vgrad(40, 0, 22, 22, crystLt, crystDk, 0.06);
      P.strokes(40, 0, 22, 22, 18, cryst, 6);
      P.glow(45, 5, 12, 12, crystLt, crystDk);
      P.outline(40, 0, 22, 22, dark);
    },
    anims: { soar: SOAR, turn: TURN },
    ambient: { clips: ['turn', 'soar'], every: [2, 5] },
    parts: [
      part('body', [0, 12, 0], [
        b([-5, 8, -10], [10, 14, 20], { all: [0, 0, 26, 20], down: [0, 22, 22, 12] }),
      ]),
      part('ring', [0, 24, 4], [
        b([-7, 23, 1], [14, 2, 7], [40, 0, 22, 22]),
        b([-2, 23, -3], [4, 2, 5], [40, 0, 22, 22]),
      ]),
      // three pairs, stepped down the body and shortening toward the tail
      part('wingL', [-5, 17, 5], [b([-23, 16, -1], [18, 2, 11], { all: [0, 36, 36, 12], down: [0, 50, 36, 10] })]),
      part('wingR', [5, 17, 5], [b([5, 16, -1], [18, 2, 11], { all: [0, 36, 36, 12], down: [0, 50, 36, 10] })]),
      part('wingL2', [-5, 13, -2], [b([-20, 12, -6], [15, 2, 9], [0, 36, 36, 12])]),
      part('wingR2', [5, 13, -2], [b([5, 12, -6], [15, 2, 9], [0, 36, 36, 12])]),
      part('wingL3', [-5, 10, -8], [b([-17, 9, -12], [12, 2, 8], [0, 36, 36, 12])]),
      part('wingR3', [5, 10, -8], [b([5, 9, -12], [12, 2, 8], [0, 36, 36, 12])]),
    ],
  },
};
