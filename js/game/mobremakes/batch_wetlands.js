// Remade mob models — wetlands region batch. Detailed parts + per-creature
// painted 64×64 skins (see js/game/mobremake.js for the def format). Murky
// greens, peat browns and sickly bog-glows. +z is forward; the south face of
// each head box carries the creature's face.
export const WETLANDS = {
  // --- marsh_wisp: glow-orb spirit with a trailing veil (floater) -----------
  marsh_wisp: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      // pale teal marsh-spirit; murky green veil trailing below
      // orb face (south) — glow with two hollow eyes
      P.glow(0, 0, 22, 22, '#eafff4', '#2f6f58');
      P.spots(2, 2, 18, 18, 12, '#bff0d8');
      P.eye(6, 9, '#0e2a22', '#d6fff0'); P.eye(14, 9, '#0e2a22', '#d6fff0');
      // orb sides / top
      P.glow(24, 0, 20, 20, '#cfeede', '#276050');
      P.strokes(24, 0, 20, 20, 16, '#8fd6b8', 3);
      // crown flame tip
      P.glow(46, 0, 12, 12, '#f4fff8', '#3f8f6c');
      // bright inner core
      P.glow(46, 14, 10, 10, '#ffffff', '#7fd6b0');
      // veil strands — translucent murky green, top-lit
      P.vgrad(0, 24, 12, 24, '#7fb89a', '#20463a', 0.07);
      P.strokes(0, 24, 12, 24, 22, '#3f6b54', 6);
      // drifting motes
      P.glow(14, 26, 8, 8, '#eafff2', '#3f8f6c');
    },
    animOverrides: {
      idle: { parts: { tail: { rotate: [[0, [6, 0, 5]], [1.3, [11, 0, -5]], [2.6, [6, 0, 5]]] } } },
      walk: { parts: { tail: { rotate: [[0, [9, 0, 7]], [0.55, [14, 0, -7]], [1.1, [9, 0, 7]]] } } },
    },
    parts: [
      { id: 'body', pivot: [0, 0.5625, 0], boxes: [
        { from: [-0.1875, 0.375, -0.1875], size: [0.375, 0.4375, 0.375], uv: { all: [24, 0, 20, 20], south: [0, 0, 22, 22] } }, // orb
        { from: [-0.125, 0.75, -0.125], size: [0.1875, 0.25, 0.1875], uv: [46, 0, 12, 12] },  // crown flame
        { from: [-0.0625, 0.4375, 0.125], size: [0.1875, 0.1875, 0.125], uv: [46, 14, 10, 10] },  // core
        { from: [0.25, 0.5625, 0], size: [0.0625, 0.0625, 0.0625], uv: [14, 26, 8, 8] },      // motes
        { from: [-0.25, 0.4375, 0.0625], size: [0.0625, 0.0625, 0.0625], uv: [14, 26, 8, 8] },
        { from: [0.0625, 0.9375, -0.0625], size: [0.0625, 0.0625, 0.0625], uv: [14, 26, 8, 8] },
      ] },
      { id: 'tail', parent: 'body', pivot: [0, 0.375, -0.1875], boxes: [
        { from: [-0.125, 0, -0.1875], size: [0.125, 0.3125, 0.0625], uv: [0, 24, 12, 24] },
        { from: [0.0625, 0, -0.1875], size: [0.0625, 0.375, 0.0625], uv: [0, 24, 12, 24] },
        { from: [0, 0.0625, -0.25], size: [0.0625, 0.3125, 0.0625], uv: [0, 24, 12, 24] },
      ] },
    ],
  },

  // --- will_o_wisp: blue ghost-flame, brighter core (floater) ---------------
  will_o_wisp: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      // teardrop blue flame with a searing white heart, trailing embers
      // flame face (south) — hollow eye-glints in the fire
      P.glow(0, 0, 20, 24, '#ffffff', '#1f3fb0');
      P.strokes(0, 0, 20, 24, 14, '#7fb8ff', 6);
      P.eye(6, 11, '#0a1a44', '#cfe4ff'); P.eye(12, 11, '#0a1a44', '#cfe4ff');
      // flame sides
      P.glow(22, 0, 18, 22, '#bcd8ff', '#1a34a0');
      P.strokes(22, 0, 18, 22, 15, '#5a90ff', 5);
      // upper tip
      P.glow(42, 0, 10, 12, '#eaf2ff', '#3a5fd0');
      // hot core
      P.glow(42, 14, 10, 10, '#ffffff', '#8fb8ff');
      // flicking tongue
      P.glow(54, 0, 8, 10, '#dfeaff', '#2a4fc0');
      // trailing ember
      P.glow(0, 26, 10, 10, '#cfe0ff', '#24409f');
    },
    parts: [
      { id: 'body', pivot: [0, 0.5625, 0], boxes: [
        { from: [-0.1875, 0.3125, -0.1875], size: [0.3125, 0.3125, 0.3125], uv: { all: [22, 0, 18, 22], south: [0, 0, 20, 24] } }, // flame base
        { from: [-0.125, 0.5625, -0.125], size: [0.25, 0.25, 0.25], uv: [22, 0, 18, 22] },  // flame mid
        { from: [-0.0625, 0.8125, -0.0625], size: [0.125, 0.25, 0.125], uv: [42, 0, 10, 12] },  // flame tip
        { from: [-0.0625, 0.4375, 0.0625], size: [0.1875, 0.1875, 0.125], uv: [42, 14, 10, 10] },  // hot core
        { from: [-0.25, 0.5, -0.0625], size: [0.0625, 0.1875, 0.125], uv: [54, 0, 8, 10] },   // tongues
        { from: [0.1875, 0.5, -0.0625], size: [0.0625, 0.1875, 0.125], uv: [54, 0, 8, 10] },
        { from: [-0.0625, 0.125, -0.1875], size: [0.0625, 0.125, 0.0625], uv: [0, 26, 10, 10] },  // trailing embers
        { from: [0.0625, 0.0625, -0.125], size: [0.0625, 0.0625, 0.0625], uv: [0, 26, 10, 10] },
        { from: [-0.125, 0.1875, -0.125], size: [0.0625, 0.0625, 0.0625], uv: [0, 26, 10, 10] },
      ] },
    ],
  },

  // --- bog_shambler: dripping peat humanoid, reed hair, algae streaks (biped)-
  bog_shambler: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const peat = '#3a2f22', dark = '#241c14', algae = '#4a6b32', reed = '#7a6a2e', wet = '#52432f';
      // head face — sunken glowing eyes, grim mouth
      P.noise(0, 0, 16, 16, peat, 0.08, { chance: 0.12, color: algae });
      P.rect(0, 0, 16, 4, dark);
      P.strokes(0, 0, 16, 5, 12, reed, 3);
      P.rect(2, 6, 4, 4, '#0c1408'); P.rect(10, 6, 4, 4, '#0c1408');   // eye sockets
      P.eye(3, 7, '#0c1808', '#9fe06a'); P.eye(11, 7, '#0c1808', '#9fe06a');
      P.rect(4, 12, 8, 2, dark);
      P.spots(0, 10, 16, 6, 12, algae);
      // head sides
      P.noise(16, 0, 16, 16, peat, 0.09, { chance: 0.14, color: algae });
      P.strokes(16, 0, 16, 16, 18, dark, 4);
      P.spots(16, 0, 16, 16, 14, algae);
      // reed hair
      P.vgrad(34, 0, 6, 16, reed, '#3f3416', 0.08);
      P.strokes(34, 0, 6, 16, 12, '#8f7a34', 7);
      // mossy shoulder lump
      P.noise(42, 0, 14, 12, algae, 0.10, { chance: 0.2, color: peat });
      P.strokes(42, 0, 14, 12, 12, '#3a5222', 4);
      // torso
      P.noise(0, 18, 22, 20, peat, 0.09, { chance: 0.10, color: wet });
      P.strokes(0, 18, 22, 20, 24, dark, 4);
      P.spots(0, 30, 22, 8, 18, algae);
      P.strokes(0, 34, 22, 4, 14, wet, 3);      // wet drips
      // hips
      P.noise(24, 18, 16, 14, dark, 0.08);
      P.strokes(24, 18, 16, 14, 14, peat, 4);
      // arm
      P.noise(42, 20, 14, 22, peat, 0.08, { chance: 0.12, color: algae });
      P.strokes(42, 20, 14, 22, 18, dark, 5);
      P.rect(42, 40, 14, 2, wet);
      // leg
      P.noise(0, 40, 14, 20, dark, 0.08);
      P.strokes(0, 40, 14, 20, 14, peat, 4);
      P.rect(0, 56, 14, 4, '#161009');
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.3125, 0.5625, -0.25], size: [0.625, 0.625, 0.5625], uv: [0, 18, 22, 20] },  // torso
        { from: [-0.25, 0.3125, -0.25], size: [0.5625, 0.25, 0.5], uv: [24, 18, 16, 14] }, // hips
        { from: [-0.375, 1, -0.125], size: [0.1875, 0.125, 0.25], uv: [42, 0, 14, 12] },  // mossy shoulders
        { from: [0.25, 1, -0.125], size: [0.1875, 0.125, 0.25], uv: [42, 0, 14, 12] },
      ] },
      { id: 'head', pivot: [0, 1.1875, 0], boxes: [
        { from: [-0.25, 1.1875, -0.1875], size: [0.4375, 0.375, 0.375], uv: { all: [16, 0, 16, 16], south: [0, 0, 16, 16] } },
        { from: [-0.125, 1.5625, -0.125], size: [0.0625, 0.1875, 0.0625], uv: [34, 0, 6, 16] },  // reed hair
        { from: [0, 1.5625, -0.125], size: [0.0625, 0.25, 0.0625], uv: [34, 0, 6, 16] },
        { from: [0.125, 1.5625, 0], size: [0.0625, 0.1875, 0.0625], uv: [34, 0, 6, 16] },
      ] },
      { id: 'arm0', pivot: [-0.4375, 1.125, 0], boxes: [{ from: [-0.5, 0.5, -0.125], size: [0.1875, 0.625, 0.25], uv: [42, 20, 14, 22] }] },
      { id: 'arm1', pivot: [0.4375, 1.125, 0], boxes: [{ from: [0.3125, 0.5, -0.125], size: [0.1875, 0.625, 0.25], uv: [42, 20, 14, 22] }] },
      { id: 'leg0', pivot: [-0.125, 0.3125, 0], boxes: [{ from: [-0.25, 0, -0.125], size: [0.25, 0.3125, 0.25], uv: [0, 40, 14, 20] }] },
      { id: 'leg1', pivot: [0.125, 0.3125, 0], boxes: [{ from: [0.0625, 0, -0.125], size: [0.25, 0.3125, 0.25], uv: [0, 40, 14, 20] }] },
    ],
  },

  // --- bog_ooze: translucent gel blob with suspended debris/bones (lumberer) -
  bog_ooze: {
    texW: 64, texH: 64, rig: 'lumberer',
    paint(ctx, P) {
      const gel = '#3f5a34', gdk = '#243a1e', ghi = '#8fbf6a', bone = '#e6ddc4';
      // dome face — translucent, top-lit, glowing eyes
      P.vgrad(0, 0, 20, 16, '#a9d68a', gdk, 0.05);
      P.spots(0, 0, 20, 16, 18, '#2c4a1e');
      P.eye(5, 7, '#0a1a0a', '#eaffd6'); P.eye(13, 7, '#0a1a0a', '#eaffd6');
      P.outline(0, 0, 20, 16, '#6f9a52');
      // dome sides
      P.vgrad(22, 0, 18, 14, ghi, gdk, 0.06);
      P.spots(22, 0, 18, 14, 16, '#2c4a1e');
      // base blob
      P.vgrad(0, 18, 28, 20, gel, '#1c2e16', 0.06);
      P.spots(0, 18, 28, 20, 30, ghi);
      P.spots(0, 30, 28, 8, 20, '#1c2e16');
      P.outline(0, 18, 28, 20, '#6f9a52');
      // top nub
      P.glow(42, 0, 10, 8, ghi, gdk);
      // suspended rib bone
      P.vgrad(42, 10, 14, 6, '#f0e8d0', '#b8ad90', 0.05);
      P.px(45, 12, '#8a8060'); P.px(50, 12, '#8a8060');
      // suspended skull bit
      P.noise(30, 18, 10, 10, bone, 0.06); P.px(33, 22, '#3a3020'); P.px(36, 22, '#3a3020');
      // pebble
      P.noise(42, 18, 8, 8, '#5a5248', 0.08);
      // bubble
      P.glow(52, 18, 8, 8, '#dfffcf', ghi);
      // drips
      P.vgrad(42, 28, 10, 10, ghi, gdk, 0.06);
    },
    parts: [
      { id: 'body', pivot: [0, 0.3125, 0], boxes: [
        { from: [-0.4375, 0, -0.375], size: [0.8125, 0.4375, 0.8125], uv: [0, 18, 28, 20] },     // base blob
        { from: [-0.3125, 0, 0.3125], size: [0.125, 0.125, 0.0625], uv: [42, 28, 10, 10] },  // drips
        { from: [0.125, 0, 0.3125], size: [0.0625, 0.125, 0.0625], uv: [42, 28, 10, 10] },
        { from: [-0.25, 0.125, 0], size: [0.0625, 0.0625, 0.0625], uv: [42, 18, 8, 8] },    // pebble
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.4375, 0.125], boxes: [
        { from: [-0.3125, 0.4375, -0.25], size: [0.625, 0.3125, 0.5625], uv: { all: [22, 0, 18, 14], south: [0, 0, 20, 16] } }, // dome
        { from: [-0.125, 0.75, -0.125], size: [0.25, 0.125, 0.25], uv: [42, 0, 10, 8] },   // nub
        { from: [-0.0625, 0.25, 0.1875], size: [0.25, 0.0625, 0.0625], uv: [42, 10, 14, 6] },   // suspended rib
        { from: [0.125, 0.3125, -0.0625], size: [0.125, 0.125, 0.125], uv: [30, 18, 10, 10] },  // skull bit
        { from: [0.0625, 0.5625, 0.0625], size: [0.0625, 0.0625, 0.0625], uv: [52, 18, 8, 8] },     // bubble
      ] },
    ],
  },

  // --- grave_wight: tattered shroud, sunken glowing eyes, grasping hands -----
  grave_wight: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const shroud = '#454150', sdk = '#2a2732', bone = '#cbc2b0', eyeglow = '#7fe6e0';
      // head face — deep sockets under a hood, cold glow
      P.noise(0, 0, 14, 14, '#5a5568', 0.06);
      P.rect(0, 0, 14, 5, sdk);
      P.rect(2, 5, 4, 4, '#07201e'); P.rect(8, 5, 4, 4, '#07201e');   // sunken sockets
      P.eye(3, 6, '#082018', eyeglow); P.eye(9, 6, '#082018', eyeglow);
      P.rect(5, 11, 4, 1, sdk);
      // head sides
      P.noise(16, 0, 14, 14, shroud, 0.07);
      P.strokes(16, 0, 14, 14, 14, sdk, 4);
      // hood band
      P.vgrad(32, 0, 16, 8, sdk, '#181620', 0.05);
      // torso shroud — cloth folds
      P.noise(0, 16, 16, 18, shroud, 0.07, { chance: 0.1, color: sdk });
      P.strokes(0, 16, 16, 18, 20, sdk, 6);
      P.bands(0, 16, 16, 18, 5, '#3a3644');
      // tattered hem
      P.noise(18, 16, 20, 14, sdk, 0.07);
      P.strokes(18, 24, 20, 6, 26, '#181620', 6);
      // tatters
      P.vgrad(16, 32, 8, 14, shroud, '#181620', 0.06);
      // arms
      P.noise(40, 14, 12, 22, shroud, 0.06);
      P.strokes(40, 14, 12, 22, 16, sdk, 5);
      // bone claw hands
      P.noise(40, 38, 12, 10, bone, 0.05);
      P.strokes(40, 42, 12, 6, 12, '#8a8070', 5);
      // legs
      P.noise(0, 36, 12, 18, sdk, 0.06);
      P.strokes(0, 36, 12, 18, 12, shroud, 4);
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.1875, 0.4375, -0.125], size: [0.375, 0.5625, 0.25], uv: [0, 16, 16, 18] },  // torso
        { from: [-0.25, 0.1875, -0.1875], size: [0.5, 0.25, 0.3125], uv: [18, 16, 20, 14] }, // shroud hem
        { from: [-0.25, 0.25, 0.125], size: [0.125, 0.25, 0.0625], uv: [16, 32, 8, 14] },   // tatters
        { from: [0.125, 0.25, 0.125], size: [0.0625, 0.25, 0.0625], uv: [16, 32, 8, 14] },
      ] },
      { id: 'head', pivot: [0, 1, 0], boxes: [
        { from: [-0.1875, 1, -0.125], size: [0.3125, 0.3125, 0.3125], uv: { all: [16, 0, 14, 14], south: [0, 0, 14, 14] } },
        { from: [-0.1875, 1.25, -0.125], size: [0.375, 0.125, 0.1875], uv: [32, 0, 16, 8] },   // hood brow
      ] },
      { id: 'arm0', pivot: [-0.25, 0.9375, 0], boxes: [
        { from: [-0.375, 0.375, -0.125], size: [0.1875, 0.5, 0.1875], uv: [40, 14, 12, 22] },
        { from: [-0.375, 0.25, 0], size: [0.125, 0.125, 0.1875], uv: [40, 38, 12, 10] },   // grasping hand
      ] },
      { id: 'arm1', pivot: [0.25, 0.9375, 0], boxes: [
        { from: [0.25, 0.375, -0.125], size: [0.1875, 0.5, 0.1875], uv: [40, 14, 12, 22] },
        { from: [0.25, 0.25, 0], size: [0.125, 0.125, 0.1875], uv: [40, 38, 12, 10] },
      ] },
      { id: 'leg0', pivot: [-0.125, 0.4375, 0], boxes: [{ from: [-0.1875, 0, -0.125], size: [0.1875, 0.4375, 0.1875], uv: [0, 36, 12, 18] }] },
      { id: 'leg1', pivot: [0.125, 0.4375, 0], boxes: [{ from: [0.0625, 0, -0.125], size: [0.1875, 0.4375, 0.1875], uv: [0, 36, 12, 18] }] },
    ],
  },

  // --- blight_horror: fungal antlers, split glowing maw, spore sacs (biped) --
  blight_horror: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const flesh = '#332a44', fdk = '#211a30', glow = '#8ef04a', glow2 = '#d24bd8', spore = '#5a4a6a', antler = '#c9b6a0';
      // head face — glowing eyes flanking a split maw
      P.noise(0, 0, 18, 18, flesh, 0.08, { chance: 0.14, color: spore });
      P.rect(0, 0, 18, 4, fdk);
      P.eye(3, 6, '#100a1a', glow); P.eye(13, 6, '#100a1a', glow);
      P.vgrad(7, 6, 4, 11, '#f6ffce', glow, 0.05);      // split maw glow
      P.rect(8, 8, 2, 8, '#1a2a08');                     // dark slit
      P.spots(0, 4, 18, 14, 14, glow2);
      // head sides
      P.noise(20, 0, 16, 16, flesh, 0.09, { chance: 0.14, color: glow2 });
      P.strokes(20, 0, 16, 16, 16, fdk, 4);
      P.spots(20, 0, 16, 16, 12, glow);
      // maw box
      P.vgrad(38, 0, 6, 16, glow, '#1a2a08', 0.06);
      // fungal antlers
      P.vgrad(46, 0, 6, 16, antler, '#5a4a3a', 0.08);
      P.spots(46, 0, 6, 16, 12, glow);
      // spore sacs
      P.glow(0, 20, 16, 16, spore, fdk);
      P.spots(0, 20, 16, 16, 22, glow2);
      P.spots(0, 20, 16, 16, 14, glow);
      // torso
      P.noise(18, 18, 20, 20, flesh, 0.09, { chance: 0.12, color: fdk });
      P.strokes(18, 18, 20, 20, 22, fdk, 5);
      P.spots(18, 18, 20, 20, 16, glow2);
      // hips
      P.noise(40, 18, 14, 12, fdk, 0.08);
      P.spots(40, 18, 14, 12, 10, glow);
      // arms
      P.noise(0, 38, 14, 22, flesh, 0.08);
      P.strokes(0, 38, 14, 22, 18, fdk, 6);
      P.spots(0, 38, 14, 22, 12, glow2);
      // legs
      P.noise(16, 38, 14, 20, fdk, 0.08);
      P.strokes(16, 38, 14, 20, 14, flesh, 5);
      P.spots(16, 38, 14, 20, 10, glow);
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.3125, 0.5, -0.25], size: [0.625, 0.625, 0.5], uv: [18, 18, 20, 20] }, // torso
        { from: [-0.25, 0.25, -0.1875], size: [0.5, 0.25, 0.375], uv: [40, 18, 14, 12] }, // hips
        { from: [-0.375, 1, -0.125], size: [0.1875, 0.25, 0.25], uv: [0, 20, 16, 16] },  // spore sacs
        { from: [0.1875, 1, -0.125], size: [0.1875, 0.25, 0.25], uv: [0, 20, 16, 16] },
      ] },
      { id: 'head', pivot: [0, 1.125, 0], boxes: [
        { from: [-0.25, 1.125, -0.25], size: [0.5, 0.4375, 0.4375], uv: { all: [20, 0, 16, 16], south: [0, 0, 18, 18] } },
        { from: [-0.0625, 1.1875, 0.1875], size: [0.125, 0.3125, 0.0625], uv: [38, 0, 6, 16] },    // split maw
        { from: [-0.1875, 1.5625, -0.0625], size: [0.0625, 0.25, 0.0625], uv: [46, 0, 6, 16] },   // antlers
        { from: [-0.25, 1.75, -0.0625], size: [0.0625, 0.1875, 0.0625], uv: [46, 0, 6, 16] },
        { from: [0.125, 1.5625, -0.0625], size: [0.0625, 0.25, 0.0625], uv: [46, 0, 6, 16] },
        { from: [0.1875, 1.75, -0.0625], size: [0.0625, 0.1875, 0.0625], uv: [46, 0, 6, 16] },
      ] },
      { id: 'arm0', pivot: [-0.375, 1.125, 0], boxes: [{ from: [-0.4375, 0.5, -0.125], size: [0.1875, 0.625, 0.3125], uv: [0, 38, 14, 22] }] },
      { id: 'arm1', pivot: [0.375, 1.125, 0], boxes: [{ from: [0.25, 0.5, -0.125], size: [0.1875, 0.625, 0.3125], uv: [0, 38, 14, 22] }] },
      { id: 'leg0', pivot: [-0.125, 0.3125, 0], boxes: [{ from: [-0.25, 0, -0.125], size: [0.1875, 0.3125, 0.25], uv: [16, 38, 14, 20] }] },
      { id: 'leg1', pivot: [0.125, 0.3125, 0], boxes: [{ from: [0.0625, 0, -0.125], size: [0.1875, 0.3125, 0.25], uv: [16, 38, 14, 20] }] },
    ],
  },

  // --- mire_toad: warty hopper, huge mouth line, pale throat sac (NEW, hopper)
  mire_toad: {
    texW: 64, texH: 64, rig: 'hopper',
    paint(ctx, P) {
      const skin = '#4a6a3a', sdk = '#2f471f', wart = '#6f8f4a', throat = '#d6d29c', mouth = '#161e0c', wet = '#7aa055';
      // head face — huge mouth line, nostrils, mottled hide
      P.noise(0, 0, 20, 14, skin, 0.09, { chance: 0.16, color: wart });
      P.rect(0, 9, 20, 3, mouth);
      P.rect(0, 9, 20, 1, '#0a0f06');
      P.px(6, 4, mouth); P.px(13, 4, mouth);        // nostrils
      P.spots(0, 0, 20, 9, 12, sdk);
      P.rect(0, 11, 20, 1, wet);                     // wet lip
      // head sides
      P.noise(22, 0, 18, 12, skin, 0.10, { chance: 0.16, color: wart });
      P.spots(22, 0, 18, 12, 14, sdk);
      // bulging eyes with vertical slit pupils
      P.glow(42, 0, 10, 10, '#c8b84a', '#4a3a12');
      P.rect(45, 3, 2, 5, '#0a0e06');
      P.px(44, 2, '#fff2b0');
      // pale throat sac
      P.vgrad(42, 12, 14, 10, throat, '#9a9666', 0.05);
      P.bands(42, 12, 14, 10, 3, '#b8b47e');
      // warty back
      P.noise(0, 16, 24, 18, skin, 0.10, { chance: 0.14, color: sdk });
      P.spots(0, 16, 24, 18, 28, wart);
      P.spots(0, 16, 24, 18, 14, sdk);
      P.strokes(0, 16, 24, 18, 10, wet, 3);
      // wart bumps
      P.glow(26, 16, 8, 8, wart, sdk);
      // front legs
      P.noise(36, 24, 10, 10, skin, 0.08); P.rect(36, 32, 10, 2, sdk);
      // back legs
      P.noise(48, 24, 12, 12, skin, 0.09, { chance: 0.14, color: wart }); P.rect(48, 34, 12, 2, sdk);
    },
    parts: [
      { id: 'body', pivot: [0, 0.1875, 0], boxes: [
        { from: [-0.3125, 0.125, -0.3125], size: [0.6875, 0.3125, 0.625], uv: { all: [0, 16, 24, 18], up: [0, 16, 24, 18] } }, // squat body
        { from: [-0.1875, 0, 0.3125], size: [0.375, 0.1875, 0.1875], uv: [42, 12, 14, 10] },  // throat sac
        { from: [-0.1875, 0.375, -0.125], size: [0.125, 0.0625, 0.125], uv: [26, 16, 8, 8] },   // warts
        { from: [0.0625, 0.375, -0.1875], size: [0.0625, 0.0625, 0.0625], uv: [26, 16, 8, 8] },
        { from: [0, 0.375, 0.0625], size: [0.0625, 0.0625, 0.0625], uv: [26, 16, 8, 8] },
        { from: [-0.3125, 0, 0.1875], size: [0.125, 0.125, 0.1875], uv: [36, 24, 10, 10] },     // front legs
        { from: [0.25, 0, 0.1875], size: [0.125, 0.125, 0.1875], uv: [36, 24, 10, 10] },
        { from: [-0.375, 0, -0.25], size: [0.1875, 0.1875, 0.25], uv: [48, 24, 12, 12] },    // back legs
        { from: [0.25, 0, -0.25], size: [0.1875, 0.1875, 0.25], uv: [48, 24, 12, 12] },
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.125, 0.25], boxes: [
        { from: [-0.3125, 0.125, 0.25], size: [0.625, 0.25, 0.3125], uv: { all: [22, 0, 18, 12], south: [0, 0, 20, 14] } }, // wide head/mouth
        { from: [-0.25, 0.375, 0.25], size: [0.125, 0.125, 0.125], uv: [42, 0, 10, 10] },   // eye bulges
        { from: [0.125, 0.375, 0.25], size: [0.125, 0.125, 0.125], uv: [42, 0, 10, 10] },
      ] },
    ],
  },
};
