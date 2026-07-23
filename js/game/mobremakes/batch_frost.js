// Remade mob models — frost region batch. Detailed parts + a painted 64×64 skin
// per creature (see js/game/mobremake.js for the def format). Palette leans on
// ice blues/whites and cold violets; undead/spirits get glowing sockets instead
// of eyes. mudback_boar (batch_meadow.js) is the quality bar.

export const FROST = {
  // ---- frostmaw_wolf: lean white-grey wolf, a curl of frost-breath ----------
  frostmaw_wolf: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const coat = '#c7d2de', dark = '#93a3b6', deep = '#6c7d92', frost = '#bfe4f5';
      // head face (south): brow shadow, two eyes, muzzle bridge
      P.noise(0, 0, 14, 14, coat, 0.06);
      P.rect(0, 0, 14, 3, P.shade(dark, -0.02));
      P.strokes(0, 2, 14, 6, 14, dark, 3);
      P.rect(5, 8, 4, 6, P.shade(coat, 0.05)); // pale muzzle bridge
      P.eye(3, 6, '#20303f', '#dff2ff'); P.eye(9, 6, '#20303f', '#dff2ff');
      // head sides / top
      P.noise(14, 0, 14, 14, coat, 0.07, { chance: 0.12, color: dark });
      P.strokes(14, 0, 14, 14, 18, dark, 3);
      // snout — cold nose + nostrils
      P.noise(28, 0, 10, 9, dark, 0.06);
      P.rect(30, 1, 6, 3, '#41505f'); P.px(31, 3, '#1a232d'); P.px(34, 3, '#1a232d');
      // ears — dark inner
      P.noise(38, 0, 7, 7, coat, 0.05); P.rect(40, 1, 3, 4, '#5a6b7d');
      // frost breath — pale radial wisp fading to cold blue
      P.glow(46, 0, 12, 10, '#f2fbff', '#9fd0ec'); P.spots(46, 0, 12, 10, 6, '#ffffff');
      // body flank — brushed fur, darker dorsal saddle, frost dusting
      P.noise(0, 16, 26, 20, coat, 0.07, { chance: 0.08, color: '#dfe8f0' });
      P.rect(0, 16, 26, 6, P.shade(dark, -0.01)); // dorsal
      P.strokes(0, 16, 26, 20, 34, dark, 4);
      P.spots(0, 28, 26, 8, 16, frost); // frost flecks low on the flank
      // body top — deeper grey spine
      P.noise(26, 16, 22, 14, deep, 0.06); P.strokes(26, 16, 22, 14, 22, '#566678', 3);
      // mane ruff — lighter, long strokes
      P.noise(0, 38, 24, 12, '#d6e0ea', 0.06); P.strokes(0, 38, 24, 12, 30, coat, 5);
      // tail — dark tip
      P.noise(24, 38, 10, 12, coat, 0.06); P.rect(24, 47, 10, 3, deep);
      // leg — cold paw
      P.noise(34, 38, 12, 16, dark, 0.06); P.rect(34, 51, 12, 3, '#3f4d5b');
    },
    parts: [
      { id: 'body', pivot: [0, 0.5, 0], boxes: [
        { from: [-0.25, 0.32, -0.55], size: [0.5, 0.5, 1.0], uv: { all: [0, 16, 26, 20], up: [26, 16, 22, 14] } },
        { from: [-0.28, 0.52, 0.12], size: [0.56, 0.26, 0.42], uv: [0, 38, 24, 12] }, // shoulder ruff
      ] },
      { id: 'head', pivot: [0, 0.56, 0.42], boxes: [
        { from: [-0.2, 0.52, 0.44], size: [0.4, 0.4, 0.42], uv: { all: [14, 0, 14, 14], south: [0, 0, 14, 14] } },
        { from: [-0.12, 0.52, 0.84], size: [0.24, 0.2, 0.22], uv: [28, 0, 10, 9] },   // snout
        { from: [-0.07, 0.54, 1.06], size: [0.14, 0.11, 0.14], uv: [46, 0, 12, 10] }, // frost breath
        { from: [-0.19, 0.9, 0.5], size: [0.1, 0.16, 0.06], uv: [38, 0, 7, 7] },      // ears
        { from: [0.09, 0.9, 0.5], size: [0.1, 0.16, 0.06], uv: [38, 0, 7, 7] },
      ] },
      { id: 'leg0', pivot: [-0.17, 0.34, 0.33], boxes: [{ from: [-0.24, 0, 0.26], size: [0.14, 0.34, 0.14], uv: [34, 38, 12, 16] }] },
      { id: 'leg1', pivot: [0.17, 0.34, 0.33], boxes: [{ from: [0.1, 0, 0.26], size: [0.14, 0.34, 0.14], uv: [34, 38, 12, 16] }] },
      { id: 'leg2', pivot: [-0.17, 0.34, -0.33], boxes: [{ from: [-0.24, 0, -0.4], size: [0.14, 0.34, 0.14], uv: [34, 38, 12, 16] }] },
      { id: 'leg3', pivot: [0.17, 0.34, -0.33], boxes: [{ from: [0.1, 0, -0.4], size: [0.14, 0.34, 0.14], uv: [34, 38, 12, 16] }] },
      { id: 'tail', pivot: [0, 0.5, -0.55], boxes: [{ from: [-0.07, 0.4, -0.78], size: [0.14, 0.18, 0.34], uv: [24, 38, 10, 12] }] },
    ],
  },

  // ---- rime_shade: ice-veil ghost, hollow cowl over a void face -------------
  rime_shade: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const robe = '#a9c2dc', deep = '#6f89ab', veil = '#d6ecf8', voidc = '#121c2c', glow = '#bdeaff';
      // cowl side / top — frozen cloth
      P.noise(0, 0, 16, 16, robe, 0.07); P.strokes(0, 0, 16, 16, 20, deep, 4);
      P.rect(0, 0, 16, 2, veil);
      // void face (south) — black hollow, two cold glowing eyes
      P.rect(16, 0, 16, 16, voidc); P.noise(16, 0, 16, 16, voidc, 0.05);
      P.glow(19, 5, 4, 4, glow, '#3a6a8a'); P.glow(25, 5, 4, 4, glow, '#3a6a8a');
      P.px(20, 6, '#eaffff'); P.px(26, 6, '#eaffff');
      // hood peak
      P.noise(34, 0, 10, 10, deep, 0.06); P.rect(34, 0, 10, 2, veil);
      // robe main — long icy drapes
      P.vgrad(0, 16, 24, 26, robe, deep, 0.05); P.strokes(0, 16, 24, 26, 40, '#8aa6c4', 6);
      P.spots(0, 34, 24, 8, 14, veil); // rime crystals gathering at the hem
      // lower wisp / tatter
      P.vgrad(24, 16, 14, 14, deep, '#4d6484', 0.05);
      P.vgrad(38, 16, 10, 10, '#4d6484', '#33465f', 0.05);
      // shoulders
      P.noise(0, 44, 24, 12, robe, 0.06); P.strokes(0, 44, 24, 12, 22, deep, 4); P.rect(0, 44, 24, 2, veil);
      // veil drapes (shared L/R) — translucent ice sheet
      P.vgrad(24, 44, 8, 18, veil, '#9cc6e0', 0.06); P.bands(24, 44, 8, 18, 3, '#eef8ff');
      // front drape
      P.vgrad(34, 30, 16, 22, robe, deep, 0.05); P.strokes(34, 30, 16, 22, 24, '#8aa6c4', 5);
    },
    parts: [
      { id: 'body', pivot: [0, 0.6, 0], boxes: [
        { from: [-0.22, 0.3, -0.16], size: [0.44, 0.78, 0.32], uv: [0, 16, 24, 26] },     // robe
        { from: [-0.14, 0.06, -0.12], size: [0.28, 0.26, 0.24], uv: [24, 16, 14, 14] },   // lower wisp
        { from: [-0.08, 0.0, -0.08], size: [0.16, 0.12, 0.16], uv: [38, 16, 10, 10] },    // tatter tip
        { from: [-0.26, 1.02, -0.16], size: [0.52, 0.2, 0.34], uv: [0, 44, 24, 12] },     // shoulders
        { from: [-0.33, 0.48, -0.04], size: [0.1, 0.54, 0.2], uv: [24, 44, 8, 18] },      // ice veil L
        { from: [0.23, 0.48, -0.04], size: [0.1, 0.54, 0.2], uv: [24, 44, 8, 18] },       // ice veil R
        { from: [-0.16, 0.34, 0.14], size: [0.32, 0.5, 0.06], uv: [34, 30, 16, 22] },     // front drape
      ] },
      { id: 'head', pivot: [0, 1.1, 0], boxes: [
        { from: [-0.2, 1.14, -0.15], size: [0.4, 0.34, 0.32], uv: { all: [0, 0, 16, 16], south: [16, 0, 16, 16] } }, // cowl
        { from: [-0.13, 1.18, 0.03], size: [0.26, 0.24, 0.08], uv: [16, 0, 16, 16] },     // void face
        { from: [-0.07, 1.44, -0.06], size: [0.14, 0.12, 0.16], uv: [34, 0, 10, 10] },    // hood peak
      ] },
    ],
  },

  // ---- bone_hound: skeletal dog, exposed ribs, glowing sockets --------------
  bone_hound: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const bone = '#dcd6c2', shade = '#b0a888', deep = '#8a836a', socket = '#7ff0e2';
      // skull face (south) — hollow glowing eye sockets, nasal slit, tooth row
      P.noise(0, 0, 14, 14, bone, 0.05);
      P.rect(2, 4, 4, 4, '#20261f'); P.rect(8, 4, 4, 4, '#20261f'); // socket wells
      P.glow(2, 4, 4, 4, socket, '#1c463f'); P.glow(8, 4, 4, 4, socket, '#1c463f');
      P.rect(6, 9, 2, 3, '#20261f'); // nasal
      P.bands(0, 12, 14, 2, 1, deep); // tooth row
      // skull sides / cranium
      P.noise(14, 0, 14, 14, bone, 0.05, { chance: 0.14, color: shade });
      P.strokes(14, 0, 14, 14, 12, shade, 2);
      // snout / jaw
      P.noise(28, 0, 10, 8, shade, 0.05); P.bands(28, 5, 10, 3, 2, deep);
      // ribcage side — bone with dark rib gaps between the ribs
      P.noise(0, 16, 24, 18, bone, 0.05);
      P.bands(0, 16, 24, 3, '#2a2b22'); // rib gaps
      P.strokes(0, 16, 24, 18, 18, shade, 2);
      // spine top
      P.noise(24, 16, 16, 14, shade, 0.05); P.bands(24, 16, 16, 2, deep);
      // pelvis / rib block
      P.noise(40, 16, 10, 14, bone, 0.05); P.bands(40, 16, 10, 3, '#2a2b22');
      // tail (spine vertebrae)
      P.noise(24, 38, 10, 10, bone, 0.05); P.bands(24, 38, 10, 2, deep);
      // leg bone — knobby joints
      P.noise(36, 38, 10, 16, bone, 0.05); P.rect(36, 44, 10, 2, deep); P.rect(36, 50, 10, 2, deep);
    },
    parts: [
      { id: 'body', pivot: [0, 0.42, 0], boxes: [
        { from: [-0.18, 0.36, -0.4], size: [0.36, 0.28, 0.78], uv: { all: [0, 16, 24, 18], up: [24, 16, 16, 14] } }, // ribcage
        { from: [-0.16, 0.4, -0.5], size: [0.32, 0.24, 0.24], uv: [40, 16, 10, 14] },  // pelvis
      ] },
      { id: 'head', pivot: [0, 0.46, 0.42], boxes: [
        { from: [-0.15, 0.4, 0.44], size: [0.3, 0.3, 0.34], uv: { all: [14, 0, 14, 14], south: [0, 0, 14, 14] } }, // skull
        { from: [-0.1, 0.38, 0.76], size: [0.2, 0.17, 0.2], uv: [28, 0, 10, 8] },      // snout/jaw
      ] },
      { id: 'leg0', pivot: [-0.13, 0.34, 0.3], boxes: [{ from: [-0.18, 0, 0.24], size: [0.1, 0.34, 0.1], uv: [36, 38, 10, 16] }] },
      { id: 'leg1', pivot: [0.13, 0.34, 0.3], boxes: [{ from: [0.08, 0, 0.24], size: [0.1, 0.34, 0.1], uv: [36, 38, 10, 16] }] },
      { id: 'leg2', pivot: [-0.13, 0.34, -0.32], boxes: [{ from: [-0.18, 0, -0.38], size: [0.1, 0.34, 0.1], uv: [36, 38, 10, 16] }] },
      { id: 'leg3', pivot: [0.13, 0.34, -0.32], boxes: [{ from: [0.08, 0, -0.38], size: [0.1, 0.34, 0.1], uv: [36, 38, 10, 16] }] },
      { id: 'tail', pivot: [0, 0.46, -0.5], boxes: [{ from: [-0.04, 0.44, -0.78], size: [0.08, 0.08, 0.32], uv: [24, 38, 10, 10] }] },
    ],
  },

  // ---- frost_elemental: jagged ice shards around a frozen glowing core ------
  frost_elemental: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const ice = '#a6d1ee', deep = '#5f8fbf', shard = '#cbeaf9', core = '#8ff6ff';
      // torso ice (south) — faceted planes, frozen core socket lower-centre
      P.vgrad(0, 0, 16, 18, shard, deep, 0.06); P.strokes(0, 0, 16, 18, 20, ice, 4);
      P.rect(4, 3, 8, 2, '#e8f8ff'); P.rect(2, 8, 12, 1, P.shade(deep, -0.03)); // facet seams
      // torso sides
      P.vgrad(16, 0, 14, 18, ice, deep, 0.06); P.strokes(16, 0, 14, 18, 16, shard, 3);
      // frozen core — bright cyan glow gem
      P.glow(30, 0, 12, 12, '#ecffff', core);
      // head crystal (south) — glowing eyes
      P.vgrad(0, 20, 14, 14, shard, ice, 0.05); P.strokes(0, 20, 14, 14, 14, '#e8f8ff', 3);
      P.eye(3, 26, '#0b3a52', '#c9fbff'); P.eye(9, 26, '#0b3a52', '#c9fbff');
      P.glow(2, 25, 3, 3, core, '#2a6f90'); P.glow(9, 25, 3, 3, core, '#2a6f90');
      // head sides
      P.vgrad(14, 20, 12, 14, ice, deep, 0.05);
      // crown / back shards — vertical faceted spikes
      P.vgrad(26, 20, 8, 16, shard, deep, 0.06); P.rect(29, 20, 2, 16, '#eefbff');
      // arm shard
      P.vgrad(36, 20, 10, 20, ice, deep, 0.05); P.rect(40, 20, 2, 20, shard);
      // leg shard
      P.vgrad(46, 20, 12, 22, deep, '#456f96', 0.05); P.rect(51, 20, 2, 22, ice);
      // small jagged shards
      P.vgrad(42, 0, 10, 14, shard, ice, 0.06);
    },
    parts: [
      { id: 'body', pivot: [0, 0.4, 0], boxes: [
        { from: [-0.24, 0.45, -0.16], size: [0.48, 0.55, 0.34], uv: { all: [16, 0, 14, 18], south: [0, 0, 16, 18] } }, // torso
        { from: [-0.13, 0.6, 0.15], size: [0.26, 0.26, 0.08], uv: [30, 0, 12, 12] },   // frozen core
        { from: [-0.09, 0.98, -0.05], size: [0.18, 0.3, 0.14], uv: [42, 0, 10, 14] },  // back shard L
        { from: [0.02, 1.0, -0.08], size: [0.14, 0.26, 0.12], uv: [42, 0, 10, 14] },   // back shard R
      ] },
      { id: 'head', pivot: [0, 1.0, 0], boxes: [
        { from: [-0.16, 1.0, -0.14], size: [0.32, 0.3, 0.3], uv: { all: [14, 20, 12, 14], south: [0, 20, 14, 14] } }, // head crystal
        { from: [-0.08, 1.28, -0.08], size: [0.16, 0.28, 0.16], uv: [26, 20, 8, 16] }, // crown shard
      ] },
      { id: 'arm0', pivot: [-0.3, 0.98, 0], boxes: [{ from: [-0.4, 0.5, -0.08], size: [0.14, 0.5, 0.16], uv: [36, 20, 10, 20] }] },
      { id: 'arm1', pivot: [0.3, 0.98, 0], boxes: [{ from: [0.26, 0.5, -0.08], size: [0.14, 0.5, 0.16], uv: [36, 20, 10, 20] }] },
      { id: 'leg0', pivot: [-0.14, 0.46, 0], boxes: [{ from: [-0.22, 0, -0.08], size: [0.17, 0.46, 0.18], uv: [46, 20, 12, 22] }] },
      { id: 'leg1', pivot: [0.14, 0.46, 0], boxes: [{ from: [0.05, 0, -0.08], size: [0.17, 0.46, 0.18], uv: [46, 20, 12, 22] }] },
    ],
  },

  // ---- gaze_orb: one huge central eye under a stone-lashed lid --------------
  gaze_orb: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const stone = '#4a4658', dstone = '#302d3d', sclera = '#e7eef6', iris = '#7a5fb0', voidc = '#140f20';
      // orb hull (sides/back) — mottled violet stone
      P.noise(0, 0, 18, 18, stone, 0.07, { chance: 0.14, color: dstone });
      P.strokes(0, 0, 18, 18, 16, dstone, 3);
      // the great eye (south) — sclera, violet iris ring, void pupil, glint
      P.rect(18, 0, 22, 22, sclera); P.noise(18, 0, 22, 22, sclera, 0.04);
      P.glow(21, 3, 16, 16, '#b79be6', iris);        // iris field
      P.glow(25, 7, 8, 8, '#3a2a5c', voidc);         // pupil
      P.rect(28, 10, 2, 2, voidc);
      P.px(27, 6, '#f3ecff'); P.px(26, 5, '#ffffff'); // catch-light
      P.spots(19, 1, 20, 3, 10, '#c9b3ff');          // faint veins up top
      // iris protrusion tile
      P.glow(40, 0, 14, 14, '#b79be6', iris); P.glow(43, 3, 8, 8, '#3a2a5c', voidc);
      // stone lid (top & bottom) — heavy brow with lash slots
      P.noise(0, 22, 22, 12, stone, 0.06); P.bands(0, 22, 22, 3, dstone); P.rect(0, 22, 22, 2, '#5c5870');
      // lash spikes (shared)
      P.vgrad(24, 22, 8, 12, dstone, stone, 0.05);
      // trailing tendrils
      P.vgrad(34, 22, 8, 16, '#3a3350', '#241f33', 0.06);
      P.vgrad(44, 16, 8, 18, '#3a3350', '#241f33', 0.06);
    },
    parts: [
      { id: 'body', pivot: [0, 0.7, 0], boxes: [
        { from: [-0.28, 0.5, -0.26], size: [0.56, 0.56, 0.5], uv: { all: [0, 0, 18, 18], south: [18, 0, 22, 22] } }, // orb + eye
        { from: [-0.2, 0.56, 0.22], size: [0.4, 0.4, 0.08], uv: [40, 0, 14, 14] },   // iris protrusion
        { from: [-0.3, 0.9, -0.24], size: [0.6, 0.14, 0.5], uv: [0, 22, 22, 12] },   // stone lid top
        { from: [-0.3, 0.42, -0.24], size: [0.6, 0.1, 0.5], uv: [0, 22, 22, 12] },   // stone lid bottom
        // stone lashes around the eye
        { from: [-0.24, 0.82, 0.16], size: [0.1, 0.12, 0.12], uv: [24, 22, 8, 12] },
        { from: [-0.04, 0.86, 0.16], size: [0.1, 0.12, 0.12], uv: [24, 22, 8, 12] },
        { from: [0.16, 0.82, 0.16], size: [0.1, 0.12, 0.12], uv: [24, 22, 8, 12] },
        { from: [-0.28, 0.5, 0.16], size: [0.1, 0.12, 0.12], uv: [24, 22, 8, 12] },
        { from: [0.2, 0.5, 0.16], size: [0.1, 0.12, 0.12], uv: [24, 22, 8, 12] },
        // trailing tendrils below
        { from: [-0.16, 0.28, -0.06], size: [0.1, 0.26, 0.1], uv: [34, 22, 8, 16] },
        { from: [0.08, 0.24, -0.06], size: [0.1, 0.3, 0.1], uv: [44, 16, 8, 18] },
      ] },
    ],
  },

  // ---- hollow_watcher: hooded void face, drifting robe ----------------------
  hollow_watcher: {
    texW: 64, texH: 64, rig: 'floater',
    paint(ctx, P) {
      const robe = '#251e37', trim = '#584b78', voidc = '#0c0916', glow = '#cdd8ff', pale = '#8f9ac6';
      // hood side / top
      P.noise(0, 0, 16, 16, robe, 0.08); P.strokes(0, 0, 16, 16, 18, '#332a4a', 4);
      P.rect(0, 0, 16, 2, trim);
      // void face (south) — black hollow with one pale drifting glow
      P.rect(16, 0, 16, 16, voidc); P.noise(16, 0, 16, 16, voidc, 0.04);
      P.glow(21, 5, 6, 6, glow, '#3a3f66'); P.px(23, 7, '#ffffff');
      P.spots(17, 2, 14, 12, 10, '#2a2440'); // faint inner mist
      // hood peak
      P.noise(34, 0, 10, 10, '#332a4a', 0.06); P.rect(34, 0, 10, 2, trim);
      // robe main — long drifting folds
      P.vgrad(0, 16, 22, 26, robe, '#160f24', 0.06); P.strokes(0, 16, 22, 26, 42, '#160f24', 7);
      P.spots(0, 34, 22, 8, 12, trim); // frayed hem glimmer
      // lower drift / tatter
      P.vgrad(22, 16, 12, 12, '#1c142c', '#100a1c', 0.05);
      P.vgrad(34, 16, 10, 10, '#160f24', '#0b0714', 0.05);
      // shoulders
      P.noise(0, 44, 22, 12, robe, 0.06); P.rect(0, 44, 22, 2, trim); P.strokes(0, 44, 22, 12, 20, '#160f24', 4);
      // sleeve drapes (shared)
      P.vgrad(24, 44, 8, 18, robe, '#160f24', 0.06); P.strokes(24, 44, 8, 18, 14, trim, 4);
      // front veil
      P.vgrad(34, 30, 16, 20, robe, '#160f24', 0.05); P.strokes(34, 30, 16, 20, 20, pale, 4);
    },
    parts: [
      { id: 'body', pivot: [0, 0.6, 0], boxes: [
        { from: [-0.22, 0.1, -0.14], size: [0.44, 0.66, 0.3], uv: [0, 16, 22, 26] },   // robe
        { from: [-0.14, 0.0, -0.1], size: [0.28, 0.14, 0.22], uv: [22, 16, 12, 12] },  // lower drift
        { from: [-0.08, -0.02, -0.06], size: [0.16, 0.1, 0.14], uv: [34, 16, 10, 10] }, // tatter
        { from: [-0.26, 0.66, -0.15], size: [0.52, 0.16, 0.32], uv: [0, 44, 22, 12] }, // shoulders
        { from: [-0.28, 0.28, -0.06], size: [0.12, 0.4, 0.16], uv: [24, 44, 8, 18] },  // sleeve L
        { from: [0.16, 0.28, -0.06], size: [0.12, 0.4, 0.16], uv: [24, 44, 8, 18] },   // sleeve R
        { from: [-0.16, 0.16, 0.1], size: [0.32, 0.42, 0.06], uv: [34, 30, 16, 20] },  // front veil
      ] },
      { id: 'head', pivot: [0, 0.8, 0], boxes: [
        { from: [-0.2, 0.78, -0.14], size: [0.4, 0.34, 0.3], uv: { all: [0, 0, 16, 16], south: [16, 0, 16, 16] } }, // hood
        { from: [-0.13, 0.82, 0.02], size: [0.26, 0.24, 0.08], uv: [16, 0, 16, 16] },  // void face
        { from: [-0.07, 1.08, -0.05], size: [0.14, 0.12, 0.16], uv: [34, 0, 10, 10] }, // hood peak
      ] },
    ],
  },

  // ---- snow_hare (NEW): scamper critter, white coat, black ear tips ---------
  snow_hare: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      const coat = '#eef2f6', shade = '#c6cfda', pink = '#d98a94', tip = '#20232a';
      // face (south) — big dark eyes, twitchy pink nose
      P.noise(0, 0, 14, 14, coat, 0.05);
      P.eye(3, 5, '#161318', '#ffffff'); P.eye(9, 5, '#161318', '#ffffff');
      P.rect(6, 9, 2, 2, pink); P.px(6, 11, '#b06a74'); // nose + mouth
      P.strokes(0, 9, 14, 5, 8, shade, 2);
      // head sides / body top
      P.noise(14, 0, 14, 14, coat, 0.05, { chance: 0.1, color: shade });
      P.strokes(14, 0, 14, 14, 16, shade, 3);
      // ear — white with black tip (upper rows dark)
      P.noise(28, 0, 8, 14, coat, 0.04); P.rect(29, 1, 6, 4, '#f6f9fc'); // inner
      P.rect(28, 0, 8, 4, tip); // black tip
      P.rect(30, 2, 4, 3, '#3a3d46');
      // body / haunch flank — soft fluff
      P.noise(0, 16, 22, 16, coat, 0.05, { chance: 0.08, color: '#ffffff' });
      P.strokes(0, 16, 22, 16, 26, shade, 3);
      P.spots(0, 26, 22, 6, 10, '#dfe6ee');
      // haunch block
      P.noise(22, 16, 14, 14, coat, 0.05); P.strokes(22, 16, 14, 14, 16, shade, 3);
      // tail puff
      P.noise(36, 16, 10, 10, '#f8fbfe', 0.05); P.spots(36, 16, 10, 10, 8, coat);
      // foot / paw
      P.noise(46, 16, 10, 12, coat, 0.04); P.rect(46, 25, 10, 3, shade);
    },
    parts: [
      { id: 'body', pivot: [0, 0.18, 0], boxes: [
        { from: [-0.13, 0.12, -0.22], size: [0.26, 0.22, 0.4], uv: { all: [0, 16, 22, 16], up: [22, 16, 14, 14] } },
        { from: [-0.15, 0.1, -0.32], size: [0.3, 0.26, 0.24], uv: [22, 16, 14, 14] },  // haunch
        { from: [-0.11, 0, 0.14], size: [0.08, 0.16, 0.1], uv: [46, 16, 10, 12] },     // front paw L
        { from: [0.03, 0, 0.14], size: [0.08, 0.16, 0.1], uv: [46, 16, 10, 12] },      // front paw R
        { from: [-0.13, 0, -0.16], size: [0.1, 0.12, 0.2], uv: [46, 16, 10, 12] },     // hind foot L
        { from: [0.03, 0, -0.16], size: [0.1, 0.12, 0.2], uv: [46, 16, 10, 12] },      // hind foot R
      ] },
      { id: 'head', pivot: [0, 0.2, 0.1], boxes: [
        { from: [-0.11, 0.2, 0.14], size: [0.22, 0.22, 0.22], uv: { all: [14, 0, 14, 14], south: [0, 0, 14, 14] } },
        { from: [-0.1, 0.4, 0.14], size: [0.06, 0.26, 0.05], uv: [28, 0, 8, 14] },     // ear L
        { from: [0.04, 0.4, 0.14], size: [0.06, 0.26, 0.05], uv: [28, 0, 8, 14] },     // ear R
      ] },
      { id: 'tail', pivot: [0, 0.2, -0.32], boxes: [{ from: [-0.05, 0.16, -0.36], size: [0.1, 0.1, 0.1], uv: [36, 16, 10, 10] }] },
    ],
  },
};
