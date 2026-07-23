// Remade mob models — meadow region batch.
// mudback_boar is the exemplar remake: ~14 boxes with a real silhouette
// (snout, tusks, ears, bristle crest, tail) and a painted 64×64 skin whose
// UV islands are laid out box-by-box. Every remake in the project follows
// this shape — see js/game/mobremake.js for the def format.

export const MEADOW = {
  mudback_boar: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      // palette: mud-brown boar, darker dorsal bristles, bone tusks
      const hide = '#6a4a30', dark = '#4a3220', bristle = '#33231a';
      // head face (south) — brow, eyes, forehead bristles
      P.noise(0, 0, 12, 12, hide, 0.06);
      P.rect(0, 0, 12, 3, P.shade(dark, 0.02));
      P.strokes(0, 0, 12, 4, 10, bristle, 2);
      P.eye(2, 5); P.eye(8, 5);
      // head sides/top
      P.noise(12, 0, 14, 12, hide, 0.07, { chance: 0.1, color: dark });
      P.strokes(12, 0, 14, 12, 16, dark, 3);
      // snout — nostrils on the lower rows
      P.noise(26, 0, 8, 6, '#7d5a40', 0.05);
      P.px(28, 4, '#241812'); P.px(31, 4, '#241812');
      // tusk — bone gradient
      P.vgrad(34, 0, 4, 6, '#f0e6cf', '#c9b995', 0.03);
      // ear — dark inner
      P.noise(38, 0, 6, 5, '#5a3c28', 0.06);
      P.rect(40, 1, 2, 3, '#3a2517');
      // bristle crest along the spine
      P.noise(44, 0, 10, 8, dark, 0.08);
      P.strokes(44, 0, 10, 8, 22, bristle, 4);
      // body flank — mud-caked fur
      P.noise(0, 14, 22, 16, hide, 0.07, { chance: 0.08, color: '#7d5a3c' });
      P.strokes(0, 14, 22, 16, 26, dark, 3);
      P.spots(0, 24, 22, 6, 14, '#57402c'); // dried mud on the low flank
      // body back — darker dorsal saddle
      P.noise(22, 14, 20, 16, '#56391f', 0.06);
      P.strokes(22, 14, 20, 16, 30, bristle, 4);
      // leg — hoof on the bottom rows
      P.noise(42, 14, 8, 10, '#553a26', 0.06);
      P.rect(42, 21, 8, 3, '#2c211a');
      // tail — dark tuft at the tip
      P.noise(50, 14, 4, 8, '#4f3522', 0.06);
      P.rect(50, 20, 4, 2, bristle);
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.34, 0.28, -0.55], size: [0.68, 0.5, 0.98], uv: { all: [0, 14, 22, 16], up: [22, 14, 20, 16] } },
        { from: [-0.10, 0.70, -0.35], size: [0.2, 0.14, 0.6], uv: [44, 0, 10, 8] },   // bristle crest
      ] },
      { id: 'head', pivot: [0, 0.62, 0.42], boxes: [
        { from: [-0.23, 0.38, 0.40], size: [0.46, 0.44, 0.34], uv: { all: [12, 0, 14, 12], south: [0, 0, 12, 12] } },
        { from: [-0.12, 0.40, 0.74], size: [0.24, 0.2, 0.14], uv: [26, 0, 8, 6] },    // snout
        { from: [-0.17, 0.36, 0.74], size: [0.05, 0.16, 0.05], uv: [34, 0, 4, 6] },   // tusks
        { from: [0.12, 0.36, 0.74], size: [0.05, 0.16, 0.05], uv: [34, 0, 4, 6] },
        { from: [-0.22, 0.80, 0.46], size: [0.09, 0.11, 0.04], uv: [38, 0, 6, 5] },   // ears
        { from: [0.13, 0.80, 0.46], size: [0.09, 0.11, 0.04], uv: [38, 0, 6, 5] },
      ] },
      { id: 'leg0', pivot: [-0.22, 0.32, 0.30], boxes: [{ from: [-0.30, 0, 0.22], size: [0.16, 0.32, 0.16], uv: [42, 14, 8, 10] }] },
      { id: 'leg1', pivot: [0.22, 0.32, 0.30], boxes: [{ from: [0.14, 0, 0.22], size: [0.16, 0.32, 0.16], uv: [42, 14, 8, 10] }] },
      { id: 'leg2', pivot: [-0.22, 0.32, -0.34], boxes: [{ from: [-0.30, 0, -0.42], size: [0.16, 0.32, 0.16], uv: [42, 14, 8, 10] }] },
      { id: 'leg3', pivot: [0.22, 0.32, -0.34], boxes: [{ from: [0.14, 0, -0.42], size: [0.16, 0.32, 0.16], uv: [42, 14, 8, 10] }] },
      { id: 'tail', pivot: [0, 0.62, -0.55], boxes: [{ from: [-0.03, 0.52, -0.63], size: [0.06, 0.2, 0.08], uv: [50, 14, 4, 8] }] },
    ],
  },

  // --------------------------------------------------------------------------
  // thicket_sprite — knee-high leafy trickster: twig limbs, a will-o glow heart,
  // glowing green eyes and a flower tuft crowning its leafy head. (floater)
  // --------------------------------------------------------------------------
  thicket_sprite: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const leaf = '#3f6a2a', leafDk = '#2c4a1c', bark = '#5a4028';
      const gEye = (x, y) => { P.glow(x - 1, y - 1, 4, 4, '#8dff54', '#20401a'); P.px(x, y, '#eaffd6'); };
      // torso — layered leaves
      P.noise(0, 0, 16, 20, leaf, 0.09, { chance: 0.12, color: '#5a8a38' });
      P.strokes(0, 0, 16, 20, 26, leafDk, 3);
      P.spots(0, 0, 16, 20, 10, '#7aa64a');
      // head sides — leaves
      P.noise(18, 0, 14, 14, leaf, 0.08, { chance: 0.1, color: leafDk });
      P.strokes(18, 0, 14, 14, 18, leafDk, 3);
      // head face — glowing green eyes + sly grin
      P.noise(34, 0, 14, 14, leaf, 0.07);
      P.strokes(34, 0, 14, 3, 10, leafDk, 2);   // leafy brow
      gEye(37, 6); gEye(43, 6);
      P.rect(38, 11, 6, 1, '#243d16');           // grin
      P.px(37, 10, '#243d16'); P.px(44, 10, '#243d16');
      // glow heart
      P.glow(18, 16, 8, 8, '#c8ff6a', '#2c5018');
      // twig arms — knotty bark
      P.noise(28, 16, 6, 12, bark, 0.08);
      P.strokes(28, 16, 6, 12, 10, '#3a2a18', 4);
      // root feet
      P.noise(36, 16, 6, 8, bark, 0.07);
      P.rect(36, 22, 6, 2, '#3a2a18');
      // flower tuft — petals of meadow colour
      P.glow(0, 22, 8, 8, '#ffe3f0', '#d86a9a');
      P.px(3, 25, '#ffd24a'); P.px(4, 25, '#ffd24a');
      // spare petal
      P.noise(10, 22, 6, 6, '#f0a0c4', 0.08);
      P.rect(11, 23, 4, 1, '#ffdf8a');
    },
    parts: [
      { id: 'body', pivot: [0, 0.4, 0], boxes: [
        { from: [-0.20, 0.18, -0.17], size: [0.40, 0.44, 0.34], uv: [0, 0, 16, 20] },       // torso
        { from: [-0.06, 0.34, 0.15], size: [0.12, 0.12, 0.06], uv: [18, 16, 8, 8] },         // glow heart
        { from: [-0.36, 0.30, -0.04], size: [0.16, 0.06, 0.07], uv: [28, 16, 6, 12] },       // twig arm L
        { from: [0.20, 0.30, -0.04], size: [0.16, 0.06, 0.07], uv: [28, 16, 6, 12] },        // twig arm R
        { from: [-0.16, 0, -0.06], size: [0.12, 0.18, 0.14], uv: [36, 16, 6, 8] },           // foot L
        { from: [0.04, 0, -0.06], size: [0.12, 0.18, 0.14], uv: [36, 16, 6, 8] },            // foot R
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.62, 0], boxes: [
        { from: [-0.18, 0.62, -0.16], size: [0.36, 0.30, 0.32], uv: { all: [18, 0, 14, 14], south: [34, 0, 14, 14] } },
        { from: [-0.06, 0.92, -0.05], size: [0.12, 0.12, 0.10], uv: [0, 22, 8, 8] },         // flower tuft
        { from: [-0.17, 0.90, -0.02], size: [0.10, 0.06, 0.08], uv: [10, 22, 6, 6] },        // petal L
        { from: [0.07, 0.90, -0.02], size: [0.10, 0.06, 0.08], uv: [10, 22, 6, 6] },         // petal R
      ] },
    ],
  },

  // --------------------------------------------------------------------------
  // pixie — thumb-sized mote of meadow-light: glowing body, big glowing eyes,
  // a bright heart and four thin gossamer wing plates. (floater)
  // --------------------------------------------------------------------------
  pixie: {
    texW: 64, texH: 64, rig: 'floater',
    animOverrides: {
      idle: { parts: {
        wingUL: { rotate: [[0, [0, 0, 0]], [0.65, [0, 0, 16]], [1.3, [0, 0, 0]], [1.95, [0, 0, 16]], [2.6, [0, 0, 0]]] },
        wingUR: { rotate: [[0, [0, 0, 0]], [0.65, [0, 0, -16]], [1.3, [0, 0, 0]], [1.95, [0, 0, -16]], [2.6, [0, 0, 0]]] },
        wingLL: { rotate: [[0, [0, 0, 0]], [0.65, [0, 0, 12]], [1.3, [0, 0, 0]], [1.95, [0, 0, 12]], [2.6, [0, 0, 0]]] },
        wingLR: { rotate: [[0, [0, 0, 0]], [0.65, [0, 0, -12]], [1.3, [0, 0, 0]], [1.95, [0, 0, -12]], [2.6, [0, 0, 0]]] },
      } },
    },
    paint(ctx, P) {
      const body = '#a8ec72', glow = '#eaffb0';
      const gEye = (x, y) => { P.glow(x - 1, y - 1, 4, 4, '#ffffff', '#3a6a20'); P.px(x, y, '#ffffff'); };
      // body — glowing green-gold
      P.vgrad(0, 0, 10, 14, glow, body, 0.05);
      P.spots(0, 0, 10, 14, 6, '#ffffc0');
      // head sides
      P.noise(12, 0, 10, 10, body, 0.05);
      // head face — two big glowing eyes + tiny smile
      P.vgrad(24, 0, 10, 10, glow, body, 0.04);
      gEye(26, 4); gEye(31, 4);
      P.px(28, 8, '#3a6a20'); P.px(29, 8, '#3a6a20');
      // heart — bright core
      P.glow(0, 16, 6, 6, '#ffffff', '#8ad84a');
      // big wings — gossamer, pale iridescent with veins
      P.vgrad(10, 16, 18, 14, '#eaf4ff', '#bcd8f4', 0.05);
      P.strokes(10, 16, 18, 14, 10, '#9cc0e8', 5);
      P.spots(10, 16, 18, 14, 8, '#ffffff');
      // small wings
      P.vgrad(30, 16, 14, 10, '#eaf4ff', '#c6def6', 0.05);
      P.strokes(30, 16, 14, 10, 7, '#9cc0e8', 4);
      // legs
      P.noise(46, 16, 4, 8, '#8ad84a', 0.05);
    },
    parts: [
      { id: 'body', pivot: [0, 0.45, 0], boxes: [
        { from: [-0.10, 0.40, -0.08], size: [0.20, 0.26, 0.16], uv: [0, 0, 10, 14] },
        { from: [-0.05, 0.44, 0.07], size: [0.10, 0.10, 0.05], uv: [0, 16, 6, 6] },          // heart
        { from: [-0.07, 0.28, -0.02], size: [0.05, 0.14, 0.05], uv: [46, 16, 4, 8] },        // leg L
        { from: [0.02, 0.28, -0.02], size: [0.05, 0.14, 0.05], uv: [46, 16, 4, 8] },         // leg R
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.64, 0], boxes: [
        { from: [-0.11, 0.64, -0.10], size: [0.22, 0.20, 0.20], uv: { all: [12, 0, 10, 10], south: [24, 0, 10, 10] } },
      ] },
      { id: 'wingUL', parent: 'body', pivot: [-0.10, 0.50, -0.05], rotation: [0, 0, 24],
        boxes: [{ from: [-0.44, 0.48, -0.06], size: [0.34, 0.32, 0.02], uv: [10, 16, 18, 14] }] },
      { id: 'wingUR', parent: 'body', pivot: [0.10, 0.50, -0.05], rotation: [0, 0, -24],
        boxes: [{ from: [0.10, 0.48, -0.06], size: [0.34, 0.32, 0.02], uv: [10, 16, 18, 14] }] },
      { id: 'wingLL', parent: 'body', pivot: [-0.09, 0.40, -0.04], rotation: [0, 0, 14],
        boxes: [{ from: [-0.36, 0.30, -0.05], size: [0.26, 0.22, 0.02], uv: [30, 16, 14, 10] }] },
      { id: 'wingLR', parent: 'body', pivot: [0.09, 0.40, -0.04], rotation: [0, 0, -14],
        boxes: [{ from: [0.10, 0.30, -0.05], size: [0.26, 0.22, 0.02], uv: [30, 16, 14, 10] }] },
    ],
  },

  // --------------------------------------------------------------------------
  // duskwing — large dusk moth: furred thorax, feathered antennae, broad thin
  // forewings & hindwings with pale eyespots. (floater, wings flap)
  // --------------------------------------------------------------------------
  duskwing: {
    texW: 64, texH: 64, rig: 'floater',
    animOverrides: {
      idle: { parts: {
        foreL: { rotate: [[0, [0, 0, 26]], [0.85, [0, 0, -10]], [1.7, [0, 0, 26]], [2.6, [0, 0, -10]]] },
        foreR: { rotate: [[0, [0, 0, -26]], [0.85, [0, 0, 10]], [1.7, [0, 0, -26]], [2.6, [0, 0, 10]]] },
        hindL: { rotate: [[0, [0, 0, 18]], [0.85, [0, 0, -6]], [1.7, [0, 0, 18]], [2.6, [0, 0, -6]]] },
        hindR: { rotate: [[0, [0, 0, -18]], [0.85, [0, 0, 6]], [1.7, [0, 0, -18]], [2.6, [0, 0, 6]]] },
      } },
      attack: { parts: {
        foreL: { rotate: [[0, [0, 0, 26]], [0.12, [0, 0, -30]], [0.5, [0, 0, 26]]] },
        foreR: { rotate: [[0, [0, 0, -26]], [0.12, [0, 0, 30]], [0.5, [0, 0, -26]]] },
      } },
    },
    paint(ctx, P) {
      const fur = '#3a3040', wing = '#7a6a74', wingDk = '#4a3e4e', band = '#2e2636';
      // thorax — dusky fur
      P.noise(0, 0, 12, 14, fur, 0.09);
      P.strokes(0, 0, 12, 14, 22, '#25202e', 4);
      // head sides
      P.noise(14, 0, 8, 8, fur, 0.07);
      // head face — big dark moth eyes
      P.noise(24, 0, 8, 8, fur, 0.06);
      P.eye(25, 3, '#12324a', '#7fd0ff'); P.eye(29, 3, '#12324a', '#7fd0ff');
      // abdomen — banded
      P.noise(0, 16, 8, 14, '#453a4c', 0.06);
      P.bands(0, 16, 8, 14, 3, band);
      // antennae — feathery
      P.noise(10, 16, 4, 10, '#2a2432', 0.05);
      P.strokes(10, 16, 4, 10, 8, '#6a5a6e', 2);
      // forewing — dusty membrane with a big pale eyespot
      P.noise(16, 16, 24, 18, wing, 0.07, { chance: 0.12, color: wingDk });
      P.strokes(16, 16, 24, 18, 12, wingDk, 5);
      P.glow(24, 20, 10, 10, '#e8dcc4', '#3a2e3a');   // eyespot halo
      P.rect(28, 24, 2, 2, '#1a1420'); P.px(28, 24, '#f4ecd8'); // eyespot pupil
      P.rect(16, 16, 24, 1, wingDk);                   // leading edge
      // hindwing — smaller, softer
      P.noise(42, 0, 20, 16, '#6a5c66', 0.07);
      P.strokes(42, 0, 20, 16, 10, wingDk, 4);
      P.glow(48, 4, 7, 7, '#dcd0be', '#3a2e3a');
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.15, 0.44, -0.14], size: [0.30, 0.30, 0.34], uv: [0, 0, 12, 14] },        // thorax
        { from: [-0.08, 0.44, -0.42], size: [0.16, 0.16, 0.30], uv: [0, 16, 8, 14] },        // abdomen
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.62, 0.14], boxes: [
        { from: [-0.11, 0.60, 0.10], size: [0.22, 0.18, 0.16], uv: { all: [14, 0, 8, 8], south: [24, 0, 8, 8] } },
        { from: [-0.10, 0.76, 0.12], size: [0.03, 0.12, 0.03], uv: [10, 16, 4, 10] }, // antenna L
        { from: [0.07, 0.76, 0.12], size: [0.03, 0.12, 0.03], uv: [10, 16, 4, 10] },         // antenna R
      ] },
      { id: 'foreL', parent: 'body', pivot: [-0.14, 0.56, 0], rotation: [0, 0, 14],
        boxes: [{ from: [-0.78, 0.53, -0.12], size: [0.64, 0.05, 0.42], uv: { all: [16, 16, 24, 18], up: [16, 16, 24, 18], down: [16, 16, 24, 18] } }] },
      { id: 'foreR', parent: 'body', pivot: [0.14, 0.56, 0], rotation: [0, 0, -14],
        boxes: [{ from: [0.14, 0.53, -0.12], size: [0.64, 0.05, 0.42], uv: { all: [16, 16, 24, 18], up: [16, 16, 24, 18], down: [16, 16, 24, 18] } }] },
      { id: 'hindL', parent: 'body', pivot: [-0.12, 0.48, -0.2], rotation: [0, 0, 10],
        boxes: [{ from: [-0.60, 0.45, -0.46], size: [0.46, 0.04, 0.32], uv: { all: [42, 0, 20, 16], up: [42, 0, 20, 16], down: [42, 0, 20, 16] } }] },
      { id: 'hindR', parent: 'body', pivot: [0.12, 0.48, -0.2], rotation: [0, 0, -10],
        boxes: [{ from: [0.14, 0.45, -0.46], size: [0.46, 0.04, 0.32], uv: { all: [42, 0, 20, 16], up: [42, 0, 20, 16], down: [42, 0, 20, 16] } }] },
    ],
  },

  // --------------------------------------------------------------------------
  // moss_lurker — squat mossy ambusher: a breathing boulder shagged in moss,
  // stubby limbs, glowing eyes peeking from under a hanging moss drape.
  // (lumberer — lunges its head to bite on attack)
  // --------------------------------------------------------------------------
  moss_lurker: {
    texW: 64, texH: 64, rig: 'lumberer',
    paint(ctx, P) {
      const stone = '#4a4a44', moss = '#3c5a2c', mossHi = '#5f8a38';
      const gEye = (x, y) => { P.glow(x - 1, y - 1, 4, 4, '#ffd24a', '#3a2a10'); P.px(x, y, '#fff3c8'); };
      // boulder side — stone under a coat of moss
      P.noise(0, 0, 24, 18, stone, 0.08, { chance: 0.4, color: moss });
      P.strokes(0, 0, 24, 18, 40, moss, 4);
      P.spots(0, 0, 24, 18, 16, mossHi);
      // boulder top — thick moss cap
      P.noise(0, 20, 24, 12, moss, 0.09, { chance: 0.2, color: mossHi });
      P.strokes(0, 20, 24, 12, 34, '#2c4820', 5);
      // moss mound
      P.noise(26, 0, 18, 12, moss, 0.09, { chance: 0.2, color: mossHi });
      P.strokes(26, 0, 18, 12, 26, '#2c4820', 5);
      // head sides — mossy stone
      P.noise(26, 14, 14, 10, stone, 0.07, { chance: 0.3, color: moss });
      // head face — glowing eyes peeking through moss
      P.noise(42, 0, 14, 12, '#3a3a36', 0.06);
      gEye(45, 6); gEye(51, 6);
      P.strokes(42, 0, 14, 5, 16, moss, 4);      // moss hanging over the brow
      P.rect(45, 10, 8, 1, '#20140c');           // slot of a mouth
      // hanging moss drape
      P.noise(42, 14, 14, 8, mossHi, 0.1);
      P.strokes(42, 14, 14, 8, 22, moss, 6);
      // stubby limbs
      P.noise(0, 34, 10, 14, stone, 0.07, { chance: 0.3, color: moss });
      P.strokes(0, 34, 10, 14, 14, moss, 4);
      // bright moss tufts
      P.glow(12, 34, 8, 8, '#7aa84a', '#2c4820');
    },
    parts: [
      { id: 'body', pivot: [0, 0.3, 0], boxes: [
        { from: [-0.55, 0, -0.50], size: [1.10, 0.72, 1.00], uv: { all: [0, 0, 24, 18], up: [0, 20, 24, 12] } },
        { from: [-0.42, 0.72, -0.42], size: [0.84, 0.30, 0.72], uv: { all: [26, 0, 18, 12], up: [26, 0, 18, 12] } },
        { from: [-0.34, 0.50, 0.46], size: [0.68, 0.28, 0.12], uv: [42, 14, 14, 8] },        // moss drape over the eyes
        { from: [-0.62, 0.05, 0.06], size: [0.16, 0.32, 0.26], uv: [0, 34, 10, 14] },        // stubby arm L
        { from: [0.46, 0.05, 0.06], size: [0.16, 0.32, 0.26], uv: [0, 34, 10, 14] },         // stubby arm R
        { from: [-0.30, 0.94, -0.2], size: [0.16, 0.12, 0.16], uv: [12, 34, 8, 8] },         // moss tuft
        { from: [0.14, 0.98, 0.0], size: [0.16, 0.12, 0.16], uv: [12, 34, 8, 8] },           // moss tuft
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.4, 0.4], boxes: [
        { from: [-0.30, 0.24, 0.42], size: [0.60, 0.40, 0.28], uv: { all: [26, 14, 14, 10], south: [42, 0, 14, 12] } },
      ] },
    ],
  },

  // --------------------------------------------------------------------------
  // meadow_stag — proud deer: slender legs, raised neck, branching antlers,
  // a white rump patch and a bright flag of a tail. (quadruped)  [NEW]
  // --------------------------------------------------------------------------
  meadow_stag: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const coat = '#8a6238', dark = '#5e4324', cream = '#d8c0a0', bone = '#d9caa4';
      // flank — warm coat with a white rump patch at the rear (left of island)
      P.noise(0, 0, 22, 16, coat, 0.07, { chance: 0.08, color: '#9a7448' });
      P.strokes(0, 0, 22, 16, 26, dark, 3);
      P.rect(0, 9, 6, 7, cream);                  // rump / belly cream
      P.spots(2, 10, 4, 6, 5, '#efe4d0');         // dappled rump
      P.rect(0, 13, 22, 3, P.shade(dark, 0.03));  // shaded underline
      // back / dorsal
      P.noise(0, 18, 22, 10, '#7a5630', 0.06);
      P.strokes(0, 18, 22, 10, 24, dark, 3);
      // neck
      P.noise(24, 0, 10, 14, coat, 0.06);
      P.strokes(24, 0, 10, 14, 14, dark, 4);
      // head sides
      P.noise(36, 0, 12, 12, coat, 0.06);
      // head face — gentle eyes, pale muzzle ring
      P.noise(50, 0, 12, 12, coat, 0.05);
      P.rect(50, 8, 12, 4, cream);                // muzzle band
      P.eye(52, 4, '#1a120a', '#c8b088'); P.eye(58, 4, '#1a120a', '#c8b088');
      // muzzle
      P.noise(24, 16, 8, 6, '#2a2018', 0.05);
      P.px(26, 18, '#0f0a06'); P.px(29, 18, '#0f0a06');
      // ears — cream inner
      P.noise(34, 16, 6, 6, coat, 0.06);
      P.rect(36, 17, 2, 3, cream);
      // antler beams + tines — bone
      P.vgrad(42, 14, 4, 10, bone, '#b8a67e', 0.04);
      P.spots(42, 14, 4, 10, 4, '#efe6cc');
      P.vgrad(48, 14, 4, 8, bone, '#b8a67e', 0.04);
      // tail — dark top, white flag underside
      P.rect(54, 0, 6, 5, coat); P.rect(54, 5, 6, 5, '#f0e8d8');
      // legs — slender, dark hoof
      P.noise(54, 14, 8, 14, '#7a5630', 0.06);
      P.strokes(54, 14, 8, 14, 10, dark, 4);
      P.rect(54, 25, 8, 3, '#241a12');            // hoof
    },
    parts: [
      { id: 'body', pivot: [0, 0.52, 0], boxes: [
        { from: [-0.22, 0.52, -0.50], size: [0.44, 0.40, 0.92], uv: { all: [0, 0, 22, 16], up: [0, 18, 22, 10] } },
        { from: [-0.13, 0.62, 0.30], size: [0.26, 0.40, 0.22], uv: [24, 0, 10, 14] },        // neck
      ] },
      { id: 'head', pivot: [0, 1.00, 0.42], boxes: [
        { from: [-0.13, 0.98, 0.50], size: [0.26, 0.26, 0.32], uv: { all: [36, 0, 12, 12], south: [50, 0, 12, 12] } },
        { from: [-0.08, 0.96, 0.78], size: [0.16, 0.15, 0.14], uv: [24, 16, 8, 6] },         // muzzle
        { from: [-0.20, 1.14, 0.50], size: [0.08, 0.10, 0.05], uv: [34, 16, 6, 6] },         // ear L
        { from: [0.12, 1.14, 0.50], size: [0.08, 0.10, 0.05], uv: [34, 16, 6, 6] },          // ear R
        { from: [-0.16, 1.20, 0.46], size: [0.05, 0.24, 0.06], uv: [42, 14, 4, 10] },        // antler beam L
        { from: [-0.25, 1.34, 0.44], size: [0.05, 0.14, 0.05], uv: [48, 14, 4, 8] },         // antler tine L
        { from: [0.11, 1.20, 0.46], size: [0.05, 0.24, 0.06], uv: [42, 14, 4, 10] },         // antler beam R
        { from: [0.20, 1.34, 0.44], size: [0.05, 0.14, 0.05], uv: [48, 14, 4, 8] },          // antler tine R
      ] },
      { id: 'leg0', pivot: [-0.15, 0.52, 0.34], boxes: [{ from: [-0.20, 0, 0.28], size: [0.10, 0.52, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'leg1', pivot: [0.15, 0.52, 0.34], boxes: [{ from: [0.10, 0, 0.28], size: [0.10, 0.52, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'leg2', pivot: [-0.15, 0.52, -0.34], boxes: [{ from: [-0.20, 0, -0.40], size: [0.10, 0.52, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'leg3', pivot: [0.15, 0.52, -0.34], boxes: [{ from: [0.10, 0, -0.40], size: [0.10, 0.52, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'tail', pivot: [0, 0.68, -0.50], boxes: [{ from: [-0.04, 0.56, -0.56], size: [0.08, 0.16, 0.08], uv: [54, 0, 6, 10] }] },
    ],
  },
};
