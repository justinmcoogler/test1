// Remade mob models — drylands region batch. Sand-golds and bone-whites, with
// a tide-crab hybrid in a teal shell. See js/game/mobremake.js for the format.

export const DRYLANDS = {
  // --------------------------------------------------------------------------
  // dune_stalker — lean sand jackal: brindle-striped coat, tall alert ears,
  // dark muzzle and a black-tipped tail. (quadruped)
  // --------------------------------------------------------------------------
  dune_stalker: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const sand = '#c9a86a', dark = '#7a5a34', cream = '#e6d3a6';
      // flank — sandy coat with brindle striping
      P.noise(0, 0, 22, 14, sand, 0.07, { chance: 0.06, color: '#d8bc84' });
      for (let i = 0; i < 8; i++) { const bx = 2 + i * 2.6; P.rect(bx, 1, 1, 8, '#5a3f22'); P.px(bx + 1, 2 + (i % 3), '#6e4e2a'); } // brindle bars
      P.rect(0, 11, 22, 3, cream);                 // pale belly
      // back / dorsal (darker)
      P.noise(0, 16, 22, 10, '#b89858', 0.06);
      P.strokes(0, 16, 22, 10, 22, dark, 3);
      // chest / neck
      P.noise(24, 0, 10, 12, sand, 0.06);
      P.rect(24, 8, 10, 4, cream);
      // head sides
      P.noise(36, 0, 12, 12, sand, 0.06);
      // head face — dark mask, amber eyes
      P.noise(50, 0, 12, 12, sand, 0.05);
      P.rect(50, 7, 12, 5, dark);                  // muzzle mask
      P.eye(52, 4, '#3a2600', '#ffb648'); P.eye(58, 4, '#3a2600', '#ffb648');
      // muzzle — black nose
      P.noise(24, 14, 8, 6, dark, 0.05);
      P.rect(26, 14, 4, 2, '#141008');
      // ears — pink inner
      P.noise(34, 14, 6, 8, sand, 0.06);
      P.rect(36, 15, 2, 4, '#c98a72');
      // tail — dark tip
      P.noise(42, 14, 8, 12, sand, 0.06);
      P.rect(42, 22, 8, 4, '#2a1e10');
      // legs
      P.noise(54, 14, 8, 14, '#b89858', 0.06);
      P.strokes(54, 14, 8, 14, 10, dark, 4);
      P.rect(54, 25, 8, 3, dark);
    },
    parts: [
      { id: 'body', pivot: [0, 0.36, 0], boxes: [
        { from: [-0.19, 0.36, -0.50], size: [0.38, 0.38, 0.90], uv: { all: [0, 0, 22, 14], up: [0, 16, 22, 10] } },
        { from: [-0.15, 0.40, 0.36], size: [0.30, 0.34, 0.28], uv: [24, 0, 10, 12] },        // chest / neck
      ] },
      { id: 'head', pivot: [0, 0.60, 0.52], boxes: [
        { from: [-0.15, 0.50, 0.55], size: [0.30, 0.30, 0.32], uv: { all: [36, 0, 12, 12], south: [50, 0, 12, 12] } },
        { from: [-0.08, 0.48, 0.85], size: [0.16, 0.14, 0.16], uv: [24, 14, 8, 6] },         // muzzle
        { from: [-0.15, 0.78, 0.58], size: [0.07, 0.20, 0.04], uv: [34, 14, 6, 8] },         // ear L
        { from: [0.08, 0.78, 0.58], size: [0.07, 0.20, 0.04], uv: [34, 14, 6, 8] },          // ear R
      ] },
      { id: 'leg0', pivot: [-0.14, 0.40, 0.36], boxes: [{ from: [-0.18, 0, 0.30], size: [0.10, 0.40, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'leg1', pivot: [0.14, 0.40, 0.36], boxes: [{ from: [0.08, 0, 0.30], size: [0.10, 0.40, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'leg2', pivot: [-0.14, 0.40, -0.38], boxes: [{ from: [-0.18, 0, -0.44], size: [0.10, 0.40, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'leg3', pivot: [0.14, 0.40, -0.38], boxes: [{ from: [0.08, 0, -0.44], size: [0.10, 0.40, 0.12], uv: [54, 14, 8, 14] }] },
      { id: 'tail', pivot: [0, 0.42, -0.50], boxes: [{ from: [-0.05, 0.32, -0.60], size: [0.10, 0.12, 0.40], uv: [42, 14, 8, 12] }] },
    ],
  },

  // --------------------------------------------------------------------------
  // sunscale_serpent — gold-scaled serpent reared into a cobra hood, with a
  // forked red tongue and amber slit eyes. (slither)
  // --------------------------------------------------------------------------
  sunscale_serpent: {
    texW: 64, texH: 64, rig: 'slither',
    paint(ctx, P) {
      const gold = '#d9a838', goldDk = '#a87820', belly = '#efdca0';
      // body — gold scale rows
      P.noise(0, 0, 24, 12, gold, 0.05);
      P.scales(0, 0, 24, 12, goldDk, '#f0d070');
      P.rect(0, 10, 24, 2, belly);
      // body top
      P.noise(0, 14, 24, 10, '#c89828', 0.05);
      P.scales(0, 14, 24, 10, goldDk, '#f0d070');
      // neck scales
      P.noise(26, 0, 10, 14, gold, 0.05);
      P.scales(26, 0, 10, 14, goldDk, '#f0d070');
      // head sides
      P.noise(38, 0, 12, 10, gold, 0.05);
      // head face — amber slit eyes, nostrils
      P.noise(38, 12, 12, 10, gold, 0.05);
      P.eye(40, 3 + 12, '#5a2a00', '#ffc23a'); P.eye(45, 3 + 12, '#5a2a00', '#ffc23a');
      P.px(41, 16, '#1a0c00'); P.px(46, 16, '#1a0c00'); // slit pupils
      P.px(42, 20, '#5a2a00'); P.px(47, 20, '#5a2a00'); // nostrils
      // cobra hood — spectacle marking
      P.noise(0, 26, 16, 12, '#c89828', 0.06);
      P.glow(3, 28, 10, 8, '#f4e0a0', '#7a5410');
      P.rect(6, 31, 4, 1, '#3a2400'); P.rect(6, 33, 4, 1, '#3a2400');
      // tongue — forked red
      P.rect(18, 26, 6, 4, '#c02020'); P.px(19, 29, '#7a1010'); P.px(22, 29, '#7a1010');
      // tail — tapering scales
      P.noise(26, 16, 12, 14, goldDk, 0.05);
      P.scales(26, 16, 12, 14, '#7a5410', '#c89828');
    },
    parts: [
      { id: 'body', pivot: [0, 0.15, 0], boxes: [
        { from: [-0.17, 0.06, -0.60], size: [0.34, 0.28, 0.95], uv: { all: [0, 0, 24, 12], up: [0, 14, 24, 10] } },
        { from: [-0.13, 0.10, 0.45], size: [0.26, 0.54, 0.24], uv: [26, 0, 10, 14] },        // reared neck coil
      ] },
      { id: 'head', pivot: [0, 0.60, 0.50], boxes: [
        { from: [-0.16, 0.60, 0.50], size: [0.32, 0.26, 0.34], uv: { all: [38, 0, 12, 10], south: [38, 12, 12, 10] } },
        { from: [-0.34, 0.54, 0.40], size: [0.20, 0.30, 0.10], uv: [0, 26, 16, 12] },        // hood L
        { from: [0.14, 0.54, 0.40], size: [0.20, 0.30, 0.10], uv: [0, 26, 16, 12] },         // hood R
        { from: [-0.02, 0.66, 0.84], size: [0.04, 0.02, 0.16], uv: [18, 26, 6, 4] },         // tongue
        { from: [-0.05, 0.66, 0.98], size: [0.03, 0.02, 0.06], uv: [18, 26, 6, 4] },         // fork L
        { from: [0.03, 0.66, 0.98], size: [0.03, 0.02, 0.06], uv: [18, 26, 6, 4] },          // fork R
      ] },
      { id: 'tail', pivot: [0, 0.15, -0.60], boxes: [{ from: [-0.10, 0.06, -0.98], size: [0.20, 0.18, 0.40], uv: [26, 16, 12, 14] }] },
    ],
  },

  // --------------------------------------------------------------------------
  // skeletal_archer — bleached bones, a cracked skull with hollow sockets, a
  // longbow in one hand and a quiver of arrows on its back. (biped)
  // --------------------------------------------------------------------------
  skeletal_archer: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const bone = '#d8d2c0', boneDk = '#a49c86', wood = '#5a3f28';
      // pelvis
      P.noise(0, 0, 10, 12, bone, 0.05);
      P.strokes(0, 0, 10, 12, 8, boneDk, 3);
      // ribcage — dark gaps between ribs
      P.noise(12, 0, 12, 14, bone, 0.05);
      for (let i = 0; i < 5; i++) P.rect(13, 1 + i * 2.6, 10, 1, '#4a4436');
      P.rect(17, 0, 2, 14, boneDk);                // sternum
      // skull sides
      P.noise(26, 0, 10, 10, bone, 0.05);
      // skull face — hollow sockets, nasal cavity, crack
      P.noise(38, 0, 10, 10, bone, 0.04);
      P.rect(39, 2, 3, 3, '#100c08'); P.rect(44, 2, 3, 3, '#100c08'); // sockets
      P.px(40, 3, '#c04030'); P.px(45, 3, '#c04030');                  // ember glints
      P.rect(42, 6, 2, 2, '#2a241a');              // nasal
      P.rect(41, 7, 6, 1, '#2a241a');              // teeth line
      for (let i = 0; i < 6; i++) P.px(41 + i, 8, '#3a3428');
      P.rect(43, 0, 1, 5, '#6a6252');              // crack
      // jaw
      P.noise(26, 12, 10, 4, boneDk, 0.05);
      // quiver — leather + fletching
      P.noise(0, 14, 8, 14, wood, 0.06);
      P.rect(0, 14, 8, 3, '#7a5a3a');
      P.spots(1, 15, 6, 3, 4, '#c0c0b0');          // fletch tips
      // arrow shaft
      P.noise(10, 16, 4, 14, '#7a5a3a', 0.05);
      P.rect(10, 16, 4, 2, '#c8c4b4');             // fletching
      // arms — bone
      P.noise(38, 12, 8, 16, bone, 0.05);
      P.strokes(38, 12, 8, 16, 10, boneDk, 4);
      // bow — wood, curved
      P.vgrad(48, 0, 4, 20, '#6a4a2c', wood, 0.05);
      P.rect(48, 0, 4, 1, '#3a2818'); P.rect(48, 19, 4, 1, '#3a2818');
      // legs — bone
      P.noise(48, 22, 8, 16, bone, 0.05);
      P.strokes(48, 22, 8, 16, 10, boneDk, 4);
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.15, 0.52, -0.10], size: [0.30, 0.20, 0.20], uv: [0, 0, 10, 12] },        // pelvis
        { from: [-0.14, 0.70, -0.09], size: [0.28, 0.32, 0.18], uv: [12, 0, 12, 14] },       // ribcage
        { from: [-0.06, 0.66, -0.20], size: [0.14, 0.30, 0.10], uv: [0, 14, 8, 14] },        // quiver
        { from: [-0.05, 0.90, -0.20], size: [0.02, 0.16, 0.02], uv: [10, 16, 4, 14] },       // arrow
        { from: [0.03, 0.90, -0.20], size: [0.02, 0.16, 0.02], uv: [10, 16, 4, 14] },        // arrow
      ] },
      { id: 'head', pivot: [0, 0.98, 0], boxes: [
        { from: [-0.13, 0.98, -0.09], size: [0.26, 0.24, 0.24], uv: { all: [26, 0, 10, 10], south: [38, 0, 10, 10] } },
        { from: [-0.10, 0.94, -0.06], size: [0.20, 0.06, 0.18], uv: [26, 12, 10, 4] },       // jaw
      ] },
      { id: 'arm0', pivot: [-0.17, 0.98, 0], boxes: [
        { from: [-0.23, 0.52, -0.05], size: [0.09, 0.46, 0.10], uv: [38, 12, 8, 16] },
        { from: [-0.29, 0.46, 0.05], size: [0.04, 0.58, 0.05], uv: [48, 0, 4, 20] },          // bow
      ] },
      { id: 'arm1', pivot: [0.17, 0.98, 0], boxes: [
        { from: [0.14, 0.52, -0.05], size: [0.09, 0.46, 0.10], uv: [38, 12, 8, 16] },
      ] },
      { id: 'leg0', pivot: [-0.09, 0.52, 0], boxes: [{ from: [-0.13, 0, -0.05], size: [0.10, 0.52, 0.11], uv: [48, 22, 8, 16] }] },
      { id: 'leg1', pivot: [0.09, 0.52, 0], boxes: [{ from: [0.03, 0, -0.05], size: [0.10, 0.52, 0.11], uv: [48, 22, 8, 16] }] },
    ],
  },

  // --------------------------------------------------------------------------
  // shell_snapper — tide-crab hybrid: heavy teal shell, eyes on stalks, one
  // oversized snapping claw and a smaller one. (lumberer — the big claw snaps)
  // --------------------------------------------------------------------------
  shell_snapper: {
    texW: 64, texH: 64, rig: 'lumberer',
    animOverrides: {
      idle: { parts: {
        arm0: { rotate: [[0, [0, 0, 0]], [1.8, [-6, 0, 0]], [3.6, [0, 0, 0]]] },
      } },
      attack: { parts: {
        arm0: { rotate: [[0, [0, 0, 0]], [0.14, [-46, 0, 0]], [0.32, [12, 0, 0]], [0.5, [0, 0, 0]]] },
        arm1: { rotate: [[0, [0, 0, 0]], [0.16, [-20, 0, 0]], [0.5, [0, 0, 0]]] },
      } },
    },
    paint(ctx, P) {
      const shell = '#3f6a58', shellDk = '#284a3c', belly = '#c8b890', claw = '#c86838';
      // shell side — mottled plating
      P.noise(0, 0, 22, 12, shell, 0.08, { chance: 0.2, color: shellDk });
      P.scales(0, 0, 22, 12, shellDk, '#5f8a76');
      // shell top — ridged carapace
      P.noise(0, 14, 22, 12, shell, 0.08, { chance: 0.15, color: '#5f8a76' });
      P.bands(0, 14, 22, 12, 3, shellDk);
      P.spots(0, 14, 22, 12, 12, '#6fa088');
      // face / underbody front — small eyes + mouth
      P.noise(24, 0, 14, 8, belly, 0.06);
      P.eye(27, 3, '#101010', '#c8ffe0'); P.eye(33, 3, '#101010', '#c8ffe0');
      P.rect(28, 6, 6, 1, '#5a4a2a');
      // eyestalks — eye on top
      P.noise(24, 10, 6, 10, shell, 0.06);
      P.rect(25, 10, 4, 3, belly); P.px(26, 11, '#101010'); P.px(27, 11, '#101010');
      // big claw
      P.noise(32, 0, 16, 14, claw, 0.08, { chance: 0.14, color: '#e0864a' });
      P.rect(32, 6, 16, 1, '#8a3f1c');             // pincer gap
      P.spots(32, 0, 16, 14, 8, '#e8a060');
      // small claw
      P.noise(40, 16, 10, 10, claw, 0.07);
      P.rect(40, 20, 10, 1, '#8a3f1c');
      // forearm
      P.noise(0, 28, 10, 8, '#a85428', 0.06);
      // legs
      P.noise(12, 28, 6, 8, shellDk, 0.06);
    },
    parts: [
      { id: 'body', pivot: [0, 0.3, 0], boxes: [
        { from: [-0.44, 0.16, -0.44], size: [0.88, 0.36, 0.88], uv: { all: [0, 0, 22, 12], up: [0, 14, 22, 12] } },
        { from: [-0.34, 0.52, -0.34], size: [0.68, 0.18, 0.68], uv: { all: [0, 14, 22, 12], up: [0, 14, 22, 12] } },
        { from: [-0.50, 0, -0.05], size: [0.10, 0.16, 0.10], uv: [12, 28, 6, 8] },           // leg L1
        { from: [-0.50, 0, -0.28], size: [0.10, 0.16, 0.10], uv: [12, 28, 6, 8] },           // leg L2
        { from: [0.40, 0, -0.05], size: [0.10, 0.16, 0.10], uv: [12, 28, 6, 8] },            // leg R1
        { from: [0.40, 0, -0.28], size: [0.10, 0.16, 0.10], uv: [12, 28, 6, 8] },            // leg R2
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.2, 0.4], boxes: [
        { from: [-0.28, 0.06, 0.36], size: [0.56, 0.30, 0.26], uv: { all: [24, 0, 14, 8], south: [24, 0, 14, 8] } },
        { from: [-0.20, 0.36, 0.44], size: [0.06, 0.18, 0.06], uv: { all: [24, 10, 6, 10], up: [24, 10, 6, 10] } },  // eyestalk L
        { from: [0.14, 0.36, 0.44], size: [0.06, 0.18, 0.06], uv: { all: [24, 10, 6, 10], up: [24, 10, 6, 10] } },   // eyestalk R
      ] },
      { id: 'arm0', pivot: [0.42, 0.24, 0.3], boxes: [
        { from: [0.34, 0.12, 0.24], size: [0.16, 0.16, 0.30], uv: [0, 28, 10, 8] },          // forearm
        { from: [0.30, 0.06, 0.48], size: [0.34, 0.28, 0.26], uv: [32, 0, 16, 14] },         // big pincer
      ] },
      { id: 'arm1', pivot: [-0.42, 0.22, 0.3], boxes: [
        { from: [-0.48, 0.10, 0.30], size: [0.16, 0.16, 0.24], uv: [40, 16, 10, 10] },
      ] },
    ],
  },

  // --------------------------------------------------------------------------
  // dust_scarab — scamper beetle with an iridescent split-elytra shell, a small
  // scarab horn, mandibles and six thin legs. (scamper)  [NEW]
  // --------------------------------------------------------------------------
  dust_scarab: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      // iridescent elytra — green→teal→violet with glossy speckle & a seam
      P.vgrad(0, 0, 20, 16, '#2f8a52', '#6a2f8a', 0.05);
      for (let x = 0; x < 20; x++) for (let y = 0; y < 16; y++) if (P.r() < 0.14) P.px(x, y, '#3fb0d8');
      P.spots(0, 0, 20, 16, 10, '#a8e0ff');
      P.rect(9, 0, 2, 16, '#12281e');              // elytra seam down the middle
      P.spots(0, 0, 20, 16, 6, '#e0a8ff');
      // elytra sides
      P.vgrad(22, 0, 20, 10, '#2a6a48', '#4a2a6a', 0.05);
      for (let x = 0; x < 20; x++) for (let y = 0; y < 10; y++) if (P.r() < 0.12) P.px(22 + x, y, '#3fb0d8');
      // thorax (pronotum) — darker iridescent
      P.vgrad(0, 18, 14, 8, '#1f5a3a', '#3a1f5a', 0.05);
      P.spots(0, 18, 14, 8, 6, '#3fb0d8');
      // head sides
      P.noise(16, 18, 8, 8, '#141a16', 0.05);
      // head face — glossy compound eyes
      P.noise(26, 12, 8, 8, '#181e18', 0.05);
      P.eye(27, 14, '#050805', '#4fe0a0'); P.eye(31, 14, '#050805', '#4fe0a0');
      P.px(29, 18, '#0a100a');
      // horn — dark chitin with a sheen
      P.vgrad(36, 0, 6, 10, '#3a5a44', '#12281e', 0.05);
      P.px(38, 2, '#8ad0a0');
      // legs — black chitin
      P.noise(44, 0, 4, 12, '#12140f', 0.04);
      P.strokes(44, 0, 4, 12, 6, '#2a3a24', 3);
      // mandibles
      P.noise(44, 14, 4, 4, '#20281c', 0.04);
      // tail nub
      P.vgrad(50, 0, 6, 6, '#2a6a48', '#4a2a6a', 0.05);
    },
    parts: [
      { id: 'body', pivot: [0, 0.15, 0], boxes: [
        { from: [-0.22, 0.10, -0.32], size: [0.44, 0.24, 0.50], uv: { all: [22, 0, 20, 10], up: [0, 0, 20, 16] } },   // elytra abdomen
        { from: [-0.16, 0.12, 0.16], size: [0.32, 0.16, 0.18], uv: { all: [0, 18, 14, 8], up: [0, 18, 14, 8] } },     // thorax
        { from: [-0.26, 0, 0.10], size: [0.05, 0.12, 0.06], uv: [44, 0, 4, 12] },            // leg L1
        { from: [-0.28, 0, -0.06], size: [0.05, 0.12, 0.06], uv: [44, 0, 4, 12] },           // leg L2
        { from: [-0.26, 0, -0.22], size: [0.05, 0.12, 0.06], uv: [44, 0, 4, 12] },           // leg L3
        { from: [0.21, 0, 0.10], size: [0.05, 0.12, 0.06], uv: [44, 0, 4, 12] },             // leg R1
        { from: [0.23, 0, -0.06], size: [0.05, 0.12, 0.06], uv: [44, 0, 4, 12] },            // leg R2
        { from: [0.21, 0, -0.22], size: [0.05, 0.12, 0.06], uv: [44, 0, 4, 12] },            // leg R3
      ] },
      { id: 'head', pivot: [0, 0.16, 0.32], boxes: [
        { from: [-0.10, 0.12, 0.34], size: [0.20, 0.14, 0.16], uv: { all: [16, 18, 8, 8], south: [26, 12, 8, 8] } },
        { from: [-0.03, 0.22, 0.42], size: [0.06, 0.12, 0.08], uv: [36, 0, 6, 10] },         // horn
        { from: [-0.09, 0.11, 0.48], size: [0.04, 0.04, 0.08], uv: [44, 14, 4, 4] },         // mandible L
        { from: [0.05, 0.11, 0.48], size: [0.04, 0.04, 0.08], uv: [44, 14, 4, 4] },          // mandible R
      ] },
      { id: 'tail', pivot: [0, 0.15, -0.32], boxes: [{ from: [-0.05, 0.12, -0.36], size: [0.10, 0.10, 0.08], uv: [50, 0, 6, 6] }] },
    ],
  },
};
