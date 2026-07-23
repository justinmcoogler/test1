// Remade mob models — highlands region batch. Detailed parts + per-creature
// painted 64×64 skins (see js/game/mobremake.js for the def format). Granite
// greys, mountain moss and ore glints. +z is forward; the south face of each
// head box carries the creature's face.
export const HIGHLANDS = {
  // --- craghorn_ram: curled horns, shaggy wool saddle (quadruped) -----------
  craghorn_ram: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const wool = '#cfc7b2', wdk = '#a89e86', hide = '#8a8272', horn = '#5f574a', hdk = '#3a342a', hoof = '#2a2620';
      // shaggy wool saddle — dense bumpy tufts
      P.noise(0, 0, 28, 18, wool, 0.07, { chance: 0.14, color: wdk });
      P.strokes(0, 0, 28, 18, 44, wdk, 4);
      P.spots(0, 0, 28, 18, 22, '#e6ddc6');
      // head sides
      P.noise(28, 0, 16, 14, hide, 0.07);
      P.strokes(28, 0, 16, 14, 14, '#6f6858', 3);
      // head face
      P.noise(44, 0, 14, 16, '#7a7264', 0.06);
      P.rect(44, 0, 14, 3, '#6a6252');
      P.eye(47, 7, '#0d0b08', '#d8d2c0'); P.eye(52, 7, '#0d0b08', '#d8d2c0');
      P.rect(48, 13, 6, 2, '#4a4438');
      // muzzle
      P.noise(28, 16, 10, 8, '#8f8676', 0.05); P.px(31, 20, '#3a3025'); P.px(34, 20, '#3a3025');
      // ears
      P.noise(40, 16, 8, 5, hide, 0.06); P.rect(41, 17, 2, 3, '#5a5244');
      // horns — granite curl with growth-ring banding
      P.vgrad(48, 16, 8, 14, horn, hdk, 0.05);
      P.bands(48, 16, 8, 14, 2, '#4a4236');
      P.strokes(48, 16, 8, 14, 6, '#6f665a', 3);
      // body flank
      P.noise(0, 20, 26, 16, hide, 0.07, { chance: 0.10, color: wdk });
      P.strokes(0, 20, 26, 16, 26, '#6f6858', 3);
      // woolly back / underside
      P.noise(0, 36, 26, 14, wool, 0.06);
      P.strokes(0, 36, 26, 14, 30, wdk, 4);
      // legs
      P.noise(30, 20, 10, 16, hide, 0.06);
      P.strokes(30, 20, 10, 16, 10, '#6f6858', 4);
      P.rect(30, 32, 10, 4, hoof);
      // tail
      P.noise(42, 20, 8, 10, wool, 0.06); P.strokes(42, 20, 8, 10, 10, wdk, 4);
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.34, 0.34, -0.55], size: [0.68, 0.50, 1.02], uv: { all: [0, 20, 26, 16], up: [0, 36, 26, 14] } },
        { from: [-0.30, 0.72, -0.42], size: [0.60, 0.20, 0.78], uv: [0, 0, 28, 18] },   // wool saddle
      ] },
      { id: 'head', pivot: [0, 0.66, 0.42], boxes: [
        { from: [-0.22, 0.52, 0.42], size: [0.44, 0.40, 0.34], uv: { all: [28, 0, 16, 14], south: [44, 0, 14, 16] } },
        { from: [-0.12, 0.48, 0.72], size: [0.24, 0.20, 0.14], uv: [28, 16, 10, 8] },   // muzzle
        { from: [-0.31, 0.86, 0.44], size: [0.11, 0.07, 0.13], uv: [40, 16, 8, 5] },    // ears
        { from: [0.20, 0.86, 0.44], size: [0.11, 0.07, 0.13], uv: [40, 16, 8, 5] },
        // curled ram horns — jut out & back, sweep down beside the face, curl forward
        { from: [-0.37, 0.78, 0.36], size: [0.14, 0.14, 0.20], uv: [48, 16, 8, 14] },   // horn L base
        { from: [-0.43, 0.56, 0.44], size: [0.13, 0.24, 0.14], uv: [48, 16, 8, 14] },   // horn L curl down
        { from: [-0.37, 0.54, 0.60], size: [0.11, 0.11, 0.16], uv: [48, 16, 8, 14] },   // horn L tip fwd
        { from: [0.23, 0.78, 0.36], size: [0.14, 0.14, 0.20], uv: [48, 16, 8, 14] },    // horn R base
        { from: [0.30, 0.56, 0.44], size: [0.13, 0.24, 0.14], uv: [48, 16, 8, 14] },    // horn R curl down
        { from: [0.26, 0.54, 0.60], size: [0.11, 0.11, 0.16], uv: [48, 16, 8, 14] },    // horn R tip fwd
      ] },
      { id: 'leg0', pivot: [-0.22, 0.34, 0.34], boxes: [{ from: [-0.30, 0, 0.26], size: [0.15, 0.36, 0.15], uv: [30, 20, 10, 16] }] },
      { id: 'leg1', pivot: [0.22, 0.34, 0.34], boxes: [{ from: [0.15, 0, 0.26], size: [0.15, 0.36, 0.15], uv: [30, 20, 10, 16] }] },
      { id: 'leg2', pivot: [-0.22, 0.34, -0.36], boxes: [{ from: [-0.30, 0, -0.44], size: [0.15, 0.36, 0.15], uv: [30, 20, 10, 16] }] },
      { id: 'leg3', pivot: [0.22, 0.34, -0.36], boxes: [{ from: [0.15, 0, -0.44], size: [0.15, 0.36, 0.15], uv: [30, 20, 10, 16] }] },
      { id: 'tail', pivot: [0, 0.6, -0.55], boxes: [{ from: [-0.05, 0.5, -0.62], size: [0.10, 0.14, 0.10], uv: [42, 20, 8, 10] }] },
    ],
  },

  // --- stone_pecker: chisel beak, rocky plumage, crest (pecker) --------------
  stone_pecker: {
    texW: 64, texH: 64, rig: 'pecker',
    paint(ctx, P) {
      const rock = '#65656d', rdk = '#48484f', slate = '#7a7a82', beak = '#a8923a', bdk = '#7a6820', crest = '#b8442a', wattle = '#b03424';
      // head sides — rocky, scaled
      P.noise(0, 0, 16, 14, rock, 0.08, { chance: 0.14, color: slate });
      P.scales(0, 0, 16, 14, rdk, slate);
      // face
      P.noise(16, 0, 14, 14, rock, 0.06);
      P.rect(16, 0, 14, 3, rdk);
      P.eye(19, 6, '#0a0a0c', '#e0e0e6'); P.eye(25, 6, '#0a0a0c', '#e0e0e6');
      P.scales(16, 9, 14, 5, rdk, slate);
      // crest — stone shards with reddish tips
      P.vgrad(30, 0, 6, 14, crest, '#5a1c12', 0.06);
      P.strokes(30, 0, 6, 14, 8, '#d86a3a', 4);
      // chisel beak base + tip
      P.vgrad(38, 0, 10, 8, beak, bdk, 0.05); P.rect(38, 0, 10, 1, '#d8c26a');
      P.vgrad(38, 8, 10, 8, '#c9a83a', bdk, 0.05);
      // wattle
      P.glow(36, 16, 8, 8, wattle, '#5a1810');
      // body — rocky plumage
      P.noise(0, 16, 26, 18, rock, 0.09, { chance: 0.14, color: slate });
      P.scales(0, 16, 26, 18, rdk, slate);
      // back / up
      P.noise(46, 16, 18, 16, slate, 0.07);
      P.scales(46, 16, 18, 16, rdk, rock);
      // folded wings — layered feathers
      P.noise(0, 34, 16, 18, rdk, 0.08);
      P.bands(0, 34, 16, 18, 3, rock);
      P.scales(0, 34, 16, 18, '#3a3a40', slate);
      // tail feathers
      P.noise(18, 34, 22, 12, rock, 0.07);
      P.bands(18, 34, 22, 12, 3, rdk);
      // scaly legs
      P.noise(50, 0, 8, 16, '#8a7a3a', 0.07);
      P.bands(50, 0, 8, 16, 2, '#5a4c1e');
      P.rect(50, 13, 8, 3, '#3a3014');
    },
    parts: [
      { id: 'body', pivot: [0, 0.35, 0], boxes: [
        { from: [-0.20, 0.24, -0.28], size: [0.40, 0.40, 0.55], uv: { all: [0, 16, 26, 18], up: [46, 16, 18, 16] } },
        { from: [-0.26, 0.28, -0.20], size: [0.07, 0.30, 0.40], uv: [0, 34, 16, 18] },  // folded wing L
        { from: [0.19, 0.28, -0.20], size: [0.07, 0.30, 0.40], uv: [0, 34, 16, 18] },
        { from: [-0.12, 0.20, -0.42], size: [0.24, 0.06, 0.22], uv: [18, 34, 22, 12] }, // tail feathers
      ] },
      { id: 'head', pivot: [0, 0.60, 0.22], boxes: [
        { from: [-0.16, 0.56, 0.06], size: [0.32, 0.32, 0.30], uv: { all: [0, 0, 16, 14], south: [16, 0, 14, 14] } },
        { from: [-0.02, 0.86, 0.06], size: [0.05, 0.14, 0.12], uv: [30, 0, 6, 14] },    // crest shards
        { from: [-0.10, 0.84, 0.10], size: [0.05, 0.10, 0.10], uv: [30, 0, 6, 14] },
        { from: [0.06, 0.84, 0.10], size: [0.05, 0.10, 0.10], uv: [30, 0, 6, 14] },
        { from: [-0.06, 0.60, 0.34], size: [0.12, 0.10, 0.16], uv: [38, 0, 10, 8] },    // chisel beak base
        { from: [-0.04, 0.60, 0.48], size: [0.08, 0.07, 0.12], uv: [38, 8, 10, 8] },    // beak tip
        { from: [-0.05, 0.52, 0.30], size: [0.10, 0.08, 0.06], uv: [36, 16, 8, 8] },    // wattle
      ] },
      { id: 'leg0', pivot: [-0.09, 0.22, 0.06], boxes: [{ from: [-0.14, 0, 0.0], size: [0.09, 0.22, 0.14], uv: [50, 0, 8, 16] }] },
      { id: 'leg1', pivot: [0.09, 0.22, 0.06], boxes: [{ from: [0.05, 0, 0.0], size: [0.09, 0.22, 0.14], uv: [50, 0, 8, 16] }] },
    ],
  },

  // --- scrap_goblin: junk-armor scraps, big ears, mischief grin (biped) ------
  scrap_goblin: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const skin = '#4a7a3a', sdk = '#33581f', ear = '#5a8a44', metal = '#6f6b64', rust = '#7a5a30', mdk = '#454138';
      // head sides
      P.noise(0, 0, 16, 14, skin, 0.08, { chance: 0.12, color: sdk });
      P.strokes(0, 0, 16, 14, 10, sdk, 3);
      // face — yellow eyes, wide toothy grin
      P.noise(18, 0, 16, 14, skin, 0.07);
      P.rect(18, 0, 16, 3, sdk);
      P.eye(21, 5, '#1a1a08', '#ffe23a'); P.eye(28, 5, '#1a1a08', '#ffe23a');
      P.rect(21, 10, 12, 2, '#20140a');
      P.px(23, 10, '#eae0c0'); P.px(26, 10, '#eae0c0'); P.px(29, 10, '#eae0c0');   // teeth
      // ears
      P.noise(36, 0, 12, 6, ear, 0.07); P.rect(37, 1, 10, 2, sdk);
      // junk helm — dented metal
      P.noise(36, 8, 16, 8, metal, 0.08, { chance: 0.2, color: rust });
      P.bands(36, 8, 16, 8, 3, mdk); P.spots(36, 8, 16, 8, 6, '#8a867e');
      // torso
      P.noise(0, 18, 16, 18, skin, 0.07);
      P.strokes(0, 18, 16, 18, 12, sdk, 4);
      // belly (face)
      P.noise(18, 18, 14, 18, skin, 0.06); P.strokes(18, 18, 14, 18, 8, sdk, 3);
      // chest plate — junk metal
      P.noise(34, 18, 16, 10, metal, 0.08, { chance: 0.2, color: rust });
      P.bands(34, 18, 16, 10, 3, mdk); P.outline(34, 18, 16, 10, '#2a2620');
      // pauldron
      P.noise(34, 30, 14, 10, metal, 0.08, { chance: 0.18, color: rust }); P.outline(34, 30, 14, 10, mdk);
      // belt with buckle
      P.noise(0, 38, 16, 6, rust, 0.08); P.rect(6, 39, 4, 4, '#c8b23a');
      // arms
      P.noise(50, 18, 8, 20, skin, 0.07); P.strokes(50, 18, 8, 20, 10, sdk, 4);
      P.rect(50, 34, 8, 3, '#3a2e18');
      // legs
      P.noise(50, 40, 8, 18, skin, 0.07); P.strokes(50, 40, 8, 18, 8, sdk, 4);
      P.rect(50, 54, 8, 4, '#2a2214');
    },
    parts: [
      { id: 'body', pivot: [0, 0.4, 0], boxes: [
        { from: [-0.17, 0.35, -0.12], size: [0.34, 0.40, 0.24], uv: { all: [0, 18, 16, 18], south: [18, 18, 14, 18] } },
        { from: [-0.19, 0.42, 0.10], size: [0.38, 0.22, 0.06], uv: [34, 18, 16, 10] },  // chest plate
        { from: [-0.30, 0.60, -0.10], size: [0.16, 0.12, 0.20], uv: [34, 30, 14, 10] }, // pauldron
        { from: [-0.18, 0.30, -0.12], size: [0.36, 0.06, 0.24], uv: [0, 38, 16, 6] },   // belt
      ] },
      { id: 'head', pivot: [0, 0.75, 0], boxes: [
        { from: [-0.15, 0.75, -0.14], size: [0.30, 0.28, 0.28], uv: { all: [0, 0, 16, 14], south: [18, 0, 16, 14] } },
        { from: [-0.30, 0.80, -0.02], size: [0.16, 0.08, 0.06], uv: [36, 0, 12, 6] },   // big ears
        { from: [0.14, 0.80, -0.02], size: [0.16, 0.08, 0.06], uv: [36, 0, 12, 6] },
        { from: [-0.16, 1.00, -0.12], size: [0.32, 0.08, 0.26], uv: [36, 8, 16, 8] },   // junk helm
      ] },
      { id: 'arm0', pivot: [-0.22, 0.72, 0], boxes: [{ from: [-0.28, 0.36, -0.06], size: [0.10, 0.36, 0.14], uv: [50, 18, 8, 20] }] },
      { id: 'arm1', pivot: [0.22, 0.72, 0], boxes: [{ from: [0.18, 0.36, -0.06], size: [0.10, 0.36, 0.14], uv: [50, 18, 8, 20] }] },
      { id: 'leg0', pivot: [-0.09, 0.32, 0], boxes: [{ from: [-0.15, 0, -0.06], size: [0.12, 0.32, 0.14], uv: [50, 40, 8, 18] }] },
      { id: 'leg1', pivot: [0.09, 0.32, 0], boxes: [{ from: [0.03, 0, -0.06], size: [0.12, 0.32, 0.14], uv: [50, 40, 8, 18] }] },
    ],
  },

  // --- cave_slime: translucent slime, embedded gem glints (lumberer) ---------
  cave_slime: {
    texW: 64, texH: 64, rig: 'lumberer',
    paint(ctx, P) {
      const gel = '#3a7a6a', gdk = '#255248', ghi = '#7fd6c0', gemc = '#8fe0ff', gemp = '#ff9fd0';
      // dome face — translucent, eyes, gem glints inside
      P.vgrad(0, 0, 20, 16, ghi, gdk, 0.05);
      P.spots(0, 0, 20, 16, 16, '#1f463c');
      P.eye(5, 7, '#08201a', '#eafff8'); P.eye(13, 7, '#08201a', '#eafff8');
      P.px(9, 11, gemc); P.px(15, 4, gemp);
      P.outline(0, 0, 20, 16, '#5aa892');
      // dome sides
      P.vgrad(22, 0, 18, 14, gel, gdk, 0.06);
      P.spots(22, 0, 18, 14, 14, ghi);
      P.px(28, 6, gemc); P.px(34, 9, '#ffe08f');
      // base blob — internal bubbles + embedded gems
      P.vgrad(0, 18, 28, 20, gel, '#16342c', 0.06);
      P.spots(0, 18, 28, 20, 26, ghi);
      P.px(8, 30, gemc); P.px(18, 26, gemp); P.px(24, 34, '#ffe08f');
      P.outline(0, 18, 28, 20, '#5aa892');
      // crystal spur
      P.vgrad(42, 0, 10, 14, '#bfeff0', '#4a9a8a', 0.06); P.strokes(42, 0, 10, 14, 6, '#eafffb', 4);
      // gem clusters
      P.glow(42, 18, 8, 8, gemc, '#2a6a8a');
      P.glow(52, 18, 8, 8, gemp, '#7a3a5a');
      // drips
      P.vgrad(42, 28, 10, 10, ghi, gdk, 0.06);
    },
    parts: [
      { id: 'body', pivot: [0, 0.3, 0], boxes: [
        { from: [-0.35, 0, -0.32], size: [0.70, 0.42, 0.64], uv: [0, 18, 28, 20] },     // base blob
        { from: [-0.28, 0, 0.28], size: [0.10, 0.14, 0.08], uv: [42, 28, 10, 10] },     // drips
        { from: [0.16, 0.02, 0.26], size: [0.09, 0.12, 0.07], uv: [42, 28, 10, 10] },
        { from: [-0.10, 0.10, 0.14], size: [0.10, 0.10, 0.06], uv: [42, 18, 8, 8] },    // front gem
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.42, 0.1], boxes: [
        { from: [-0.25, 0.42, -0.22], size: [0.50, 0.30, 0.44], uv: { all: [22, 0, 18, 14], south: [0, 0, 20, 16] } }, // dome
        { from: [-0.05, 0.68, -0.06], size: [0.12, 0.18, 0.12], uv: [42, 0, 10, 14] },  // crystal spur
        { from: [0.10, 0.50, 0.10], size: [0.08, 0.08, 0.06], uv: [52, 18, 8, 8] },     // embedded gems
        { from: [-0.16, 0.52, 0.06], size: [0.07, 0.07, 0.05], uv: [52, 18, 8, 8] },
      ] },
    ],
  },

  // --- stone_golem: granite slab body, moss seams, faint rune glow (biped) ---
  stone_golem: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const gran = '#5a5852', gdk = '#403e38', gl = '#7a786e', moss = '#4a6a2e', rune = '#6ee0a0', crack = '#26241f';
      // head sides — cracked granite, moss patches
      P.noise(0, 0, 18, 16, gran, 0.08, { chance: 0.12, color: gl });
      P.strokes(0, 0, 18, 16, 10, crack, 4);
      P.spots(0, 0, 18, 16, 10, moss);
      // head face — deep-set glowing eyes
      P.noise(18, 0, 18, 16, gran, 0.07);
      P.rect(18, 0, 18, 4, gdk);
      P.eye(22, 7, '#08120a', rune); P.eye(30, 7, '#08120a', rune);
      P.rect(18, 3, 1, 10, crack); P.rect(35, 4, 1, 9, crack);
      // brow
      P.noise(36, 0, 12, 8, gdk, 0.07); P.strokes(36, 0, 12, 8, 6, crack, 3);
      // moss shoulder
      P.noise(36, 8, 16, 8, moss, 0.10, { chance: 0.2, color: '#33501f' });
      P.strokes(36, 8, 16, 8, 14, '#5f8a38', 4);
      // torso — granite slab, cracks, moss seams
      P.noise(0, 16, 28, 24, gran, 0.09, { chance: 0.12, color: gl });
      P.strokes(0, 16, 28, 24, 20, crack, 5);
      P.bands(0, 16, 28, 24, 8, gdk);
      P.spots(0, 34, 28, 6, 14, moss);
      // torso face
      P.noise(28, 16, 20, 24, gran, 0.08);
      P.strokes(28, 16, 20, 24, 14, crack, 5);
      P.spots(28, 16, 20, 24, 10, moss);
      // hips
      P.noise(48, 16, 16, 16, gdk, 0.08); P.strokes(48, 16, 16, 16, 10, crack, 4);
      // rune plate — glowing glyph
      P.noise(32, 40, 14, 14, gdk, 0.05);
      P.glow(34, 42, 10, 10, rune, '#1a3a28');
      P.rect(38, 43, 2, 8, '#0a2a18'); P.rect(35, 46, 8, 2, '#0a2a18');
      // arm
      P.noise(0, 40, 14, 24, gran, 0.08, { chance: 0.10, color: gl });
      P.strokes(0, 40, 14, 24, 16, crack, 5);
      P.spots(0, 40, 14, 24, 8, moss);
      // leg
      P.noise(16, 40, 14, 24, gran, 0.08);
      P.strokes(16, 40, 14, 24, 14, crack, 5);
      P.rect(16, 60, 14, 4, gdk);
    },
    parts: [
      { id: 'body', pivot: [0, 0.6, 0], boxes: [
        { from: [-0.40, 0.60, -0.30], size: [0.80, 0.80, 0.60], uv: { all: [0, 16, 28, 24], south: [28, 16, 20, 24] } }, // torso slab
        { from: [-0.12, 0.86, 0.28], size: [0.24, 0.24, 0.06], uv: [32, 40, 14, 14] },  // rune plate
        { from: [-0.44, 1.28, -0.22], size: [0.20, 0.10, 0.44], uv: [36, 8, 16, 8] },   // moss shoulders
        { from: [0.24, 1.28, -0.22], size: [0.20, 0.10, 0.44], uv: [36, 8, 16, 8] },
        { from: [-0.34, 0.36, -0.26], size: [0.68, 0.28, 0.52], uv: [48, 16, 16, 16] }, // hips
      ] },
      { id: 'head', pivot: [0, 1.40, 0], boxes: [
        { from: [-0.25, 1.40, -0.24], size: [0.50, 0.44, 0.48], uv: { all: [0, 0, 18, 16], south: [18, 0, 18, 16] } },
        { from: [-0.27, 1.70, -0.10], size: [0.54, 0.10, 0.16], uv: [36, 0, 12, 8] },   // heavy brow
      ] },
      { id: 'arm0', pivot: [-0.48, 1.36, 0], boxes: [{ from: [-0.76, 0.50, -0.16], size: [0.28, 0.86, 0.32], uv: [0, 40, 14, 24] }] },
      { id: 'arm1', pivot: [0.48, 1.36, 0], boxes: [{ from: [0.48, 0.50, -0.16], size: [0.28, 0.86, 0.32], uv: [0, 40, 14, 24] }] },
      { id: 'leg0', pivot: [-0.24, 0.55, 0], boxes: [{ from: [-0.40, 0, -0.16], size: [0.30, 0.55, 0.32], uv: [16, 40, 14, 24] }] },
      { id: 'leg1', pivot: [0.24, 0.55, 0], boxes: [{ from: [0.10, 0, -0.16], size: [0.30, 0.55, 0.32], uv: [16, 40, 14, 24] }] },
    ],
  },

  // --- crag_bat: floater, big ears, thin wing membranes (NEW, floater) ------
  crag_bat: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const fur = '#6a5f52', fdk = '#463d33', memb = '#5a4a4a', mdk = '#3a2e2e', ear = '#7a6c5c', vein = '#8a5a5a';
      // head sides
      P.noise(0, 0, 14, 14, fur, 0.08, { chance: 0.14, color: fdk });
      P.strokes(0, 0, 14, 14, 12, fdk, 3);
      // face — beady amber eyes, little fangs
      P.noise(16, 0, 14, 14, fur, 0.07);
      P.eye(19, 5, '#0a0806', '#d8b84a'); P.eye(25, 5, '#0a0806', '#d8b84a');
      P.px(21, 10, '#e0dccb'); P.px(24, 10, '#e0dccb');
      // snout
      P.noise(32, 0, 10, 6, '#7a6a5a', 0.06); P.px(35, 3, '#2a1e18'); P.px(38, 3, '#2a1e18');
      // big ears — pale inner
      P.vgrad(44, 0, 8, 16, ear, fdk, 0.07); P.rect(46, 2, 4, 10, '#9a8a76');
      // body
      P.noise(0, 16, 16, 16, fur, 0.09, { chance: 0.14, color: fdk });
      P.strokes(0, 16, 16, 16, 16, fdk, 4);
      // belly (face) — paler fur
      P.noise(18, 16, 14, 16, '#7a6f60', 0.07); P.strokes(18, 16, 14, 16, 10, fur, 3);
      // clawed feet
      P.noise(34, 16, 8, 8, fdk, 0.06); P.strokes(34, 20, 8, 4, 6, '#2a2018', 3);
      // wing membrane — folds + finger-bone veins
      P.vgrad(0, 34, 32, 22, memb, mdk, 0.06);
      P.strokes(0, 34, 32, 22, 10, vein, 6);
      P.bands(0, 34, 32, 22, 5, mdk);
      // wing bone
      P.vgrad(34, 34, 6, 22, '#5a4c40', '#3a2e26', 0.05);
    },
    animOverrides: {
      idle: { parts: {
        wing_l: { rotate: [[0, [0, 0, 18]], [1.3, [0, 0, 44]], [2.6, [0, 0, 18]]] },
        wing_r: { rotate: [[0, [0, 0, -18]], [1.3, [0, 0, -44]], [2.6, [0, 0, -18]]] },
      } },
      walk: { parts: {
        wing_l: { rotate: [[0, [0, 0, 12]], [0.28, [0, 0, 58]], [0.55, [0, 0, 12]], [0.83, [0, 0, 58]], [1.1, [0, 0, 12]]] },
        wing_r: { rotate: [[0, [0, 0, -12]], [0.28, [0, 0, -58]], [0.55, [0, 0, -12]], [0.83, [0, 0, -58]], [1.1, [0, 0, -12]]] },
      } },
      attack: { parts: {
        wing_l: { rotate: [[0, [0, 0, 30]], [0.14, [0, 0, 72]], [0.5, [0, 0, 30]]] },
        wing_r: { rotate: [[0, [0, 0, -30]], [0.14, [0, 0, -72]], [0.5, [0, 0, -30]]] },
      } },
    },
    parts: [
      { id: 'body', pivot: [0, 0.55, 0], boxes: [
        { from: [-0.13, 0.44, -0.12], size: [0.26, 0.30, 0.26], uv: { all: [0, 16, 16, 16], south: [18, 16, 14, 16] } },
        { from: [-0.10, 0.38, -0.06], size: [0.07, 0.08, 0.07], uv: [34, 16, 8, 8] },   // feet
        { from: [0.03, 0.38, -0.06], size: [0.07, 0.08, 0.07], uv: [34, 16, 8, 8] },
      ] },
      { id: 'head', parent: 'body', pivot: [0, 0.66, 0], boxes: [
        { from: [-0.12, 0.64, -0.06], size: [0.24, 0.22, 0.22], uv: { all: [0, 0, 14, 14], south: [16, 0, 14, 14] } },
        { from: [-0.06, 0.64, 0.14], size: [0.12, 0.10, 0.08], uv: [32, 0, 10, 6] },    // snout
        { from: [-0.14, 0.84, -0.02], size: [0.08, 0.20, 0.04], uv: [44, 0, 8, 16] },   // big ears
        { from: [0.06, 0.84, -0.02], size: [0.08, 0.20, 0.04], uv: [44, 0, 8, 16] },
      ] },
      { id: 'wing_l', parent: 'body', pivot: [-0.12, 0.58, 0], boxes: [
        { from: [-0.62, 0.50, -0.10], size: [0.50, 0.03, 0.34], uv: [0, 34, 32, 22] },  // membrane
        { from: [-0.60, 0.50, -0.10], size: [0.05, 0.05, 0.34], uv: [34, 34, 6, 22] },  // arm bone
      ] },
      { id: 'wing_r', parent: 'body', pivot: [0.12, 0.58, 0], boxes: [
        { from: [0.12, 0.50, -0.10], size: [0.50, 0.03, 0.34], uv: [0, 34, 32, 22] },
        { from: [0.55, 0.50, -0.10], size: [0.05, 0.05, 0.34], uv: [34, 34, 6, 22] },
      ] },
    ],
  },
};
