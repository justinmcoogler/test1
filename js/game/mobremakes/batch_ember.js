// Remade mob models — ember region batch. Detailed parts + a painted 64×64 skin
// per creature (see js/game/mobremake.js for the def format). Palette leans on
// charcoal blacks, ember oranges and violet crystal; woody creatures keep their
// bark browns. mudback_boar (batch_meadow.js) is the quality bar.

export const EMBER = {
  // ---- cinder_imp: charcoal skin, glowing ember joints, small horns ---------
  cinder_imp: {
    texW: 64, texH: 64, rig: 'hopper',
    paint(ctx, P) {
      const char = '#2b2622', deep = '#15120f', ember = '#ff8a2a', hot = '#ffcf6a';
      // face (south) — sooty skin cracked with ember, wicked grin, ember eyes
      P.noise(0, 0, 16, 16, char, 0.08, { chance: 0.06, color: ember });
      P.strokes(0, 0, 16, 16, 12, deep, 3);
      P.eye(3, 5, '#3a1400', '#ffd27a'); P.eye(11, 5, '#3a1400', '#ffd27a');
      P.glow(2, 4, 4, 4, hot, '#c24800'); P.glow(10, 4, 4, 4, hot, '#c24800');
      P.rect(4, 11, 8, 1, ember); P.px(5, 12, hot); P.px(9, 12, hot); // grin embers
      // head sides
      P.noise(16, 0, 14, 16, char, 0.08, { chance: 0.05, color: ember });
      P.strokes(16, 0, 14, 16, 12, deep, 3);
      // horns — charcoal base, ember tip
      P.vgrad(30, 0, 8, 10, ember, char, 0.06); P.rect(30, 0, 8, 2, hot);
      // shoulder ember joint — bright molten knot
      P.glow(40, 0, 10, 10, '#fff0c0', ember);
      // knee ember joint
      P.glow(52, 0, 10, 10, '#ffe0a0', '#d85a10');
      // torso front — ember seams down the chest
      P.noise(0, 18, 18, 18, char, 0.08, { chance: 0.06, color: ember });
      P.rect(8, 19, 1, 15, ember); P.spots(0, 18, 18, 18, 12, '#c24800');
      P.px(8, 22, hot); P.px(8, 28, hot);
      // torso sides
      P.noise(18, 18, 14, 18, char, 0.07); P.strokes(18, 18, 14, 18, 12, deep, 3);
      // arm — sooty with a glowing elbow band
      P.noise(32, 18, 8, 18, char, 0.07); P.rect(32, 25, 8, 2, ember); P.rect(32, 26, 8, 1, hot);
      // leg — glowing shin crack
      P.noise(40, 18, 10, 18, char, 0.07); P.rect(44, 20, 1, 14, ember); P.px(44, 24, hot);
      // tail — ember-tipped
      P.vgrad(50, 18, 10, 14, char, ember, 0.06); P.rect(50, 30, 10, 2, hot);
    },
    parts: [
      { id: 'body', pivot: [0, 0.2, 0], boxes: [
        { from: [-0.19, 0.28, -0.16], size: [0.38, 0.36, 0.32], uv: { all: [18, 18, 14, 18], south: [0, 18, 18, 18] } }, // torso
        { from: [-0.29, 0.34, -0.05], size: [0.1, 0.34, 0.1], uv: [32, 18, 8, 18] },   // arm L
        { from: [0.19, 0.34, -0.05], size: [0.1, 0.34, 0.1], uv: [32, 18, 8, 18] },    // arm R
        { from: [-0.3, 0.58, -0.02], size: [0.1, 0.1, 0.12], uv: [40, 0, 10, 10] },    // shoulder joint L
        { from: [0.2, 0.58, -0.02], size: [0.1, 0.1, 0.12], uv: [40, 0, 10, 10] },     // shoulder joint R
        { from: [-0.13, 0, -0.04], size: [0.12, 0.28, 0.12], uv: [40, 18, 10, 18] },   // leg L
        { from: [0.01, 0, -0.04], size: [0.12, 0.28, 0.12], uv: [40, 18, 10, 18] },    // leg R
        { from: [-0.14, 0.16, -0.02], size: [0.11, 0.09, 0.13], uv: [52, 0, 10, 10] }, // knee joint L
        { from: [0.03, 0.16, -0.02], size: [0.11, 0.09, 0.13], uv: [52, 0, 10, 10] },  // knee joint R
        { from: [-0.04, 0.28, -0.24], size: [0.08, 0.1, 0.16], uv: [50, 18, 10, 14] }, // ember tail
      ] },
      { id: 'head', pivot: [0, 0.62, 0], boxes: [
        { from: [-0.18, 0.64, -0.16], size: [0.36, 0.34, 0.32], uv: { all: [16, 0, 14, 16], south: [0, 0, 16, 16] } },
        { from: [-0.15, 0.96, -0.04], size: [0.08, 0.16, 0.08], uv: [30, 0, 8, 10] },  // horn L
        { from: [0.07, 0.96, -0.04], size: [0.08, 0.16, 0.08], uv: [30, 0, 8, 10] },   // horn R
      ] },
    ],
  },

  // ---- magma_hulk: basalt crust plates over lava-glow seams -----------------
  magma_hulk: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const rock = '#3a3634', crust = '#4f4a46', deep = '#211f1e', lava = '#ff7a1e', hot = '#ffd76a';
      // face (south) — heavy basalt brow, molten eyes, cracked jaw
      P.noise(0, 0, 16, 16, rock, 0.08, { chance: 0.05, color: lava });
      P.rect(0, 0, 16, 4, deep); // brow shadow
      P.glow(2, 5, 5, 4, hot, lava); P.glow(9, 5, 5, 4, hot, lava);
      P.px(4, 6, '#fff2cf'); P.px(11, 6, '#fff2cf');
      P.rect(3, 12, 10, 1, lava); P.px(6, 13, hot); P.px(10, 13, hot); // jaw crack
      // head sides — plated basalt
      P.noise(16, 0, 14, 16, rock, 0.08); P.scales(16, 0, 14, 16, crust, deep);
      // brow crust ridge
      P.noise(30, 0, 16, 8, crust, 0.06); P.rect(30, 0, 16, 2, deep); P.bands(30, 3, 16, 3, deep);
      // chest lava seam — vertical molten vent
      P.vgrad(46, 0, 10, 16, hot, lava, 0.05); P.rect(50, 0, 2, 16, '#fff4d0');
      // torso front — cracked crust plates over glow
      P.noise(0, 18, 22, 22, rock, 0.08); P.scales(0, 18, 22, 22, crust, deep);
      P.rect(10, 19, 1, 20, lava); P.spots(0, 18, 22, 22, 12, lava); P.px(10, 24, hot); P.px(10, 32, hot);
      // torso sides
      P.noise(22, 18, 16, 22, rock, 0.07); P.scales(22, 18, 16, 22, crust, deep);
      // shoulder / back plate
      P.noise(38, 18, 12, 12, crust, 0.06); P.rect(38, 18, 12, 2, deep); P.bands(38, 20, 12, 3, deep);
      // arm — basalt with lava elbow seam
      P.noise(0, 40, 14, 22, rock, 0.08); P.scales(0, 40, 14, 22, crust, deep);
      P.rect(0, 50, 14, 2, lava); P.rect(0, 51, 14, 1, hot);
      // leg — lava knee crack
      P.noise(14, 40, 14, 22, rock, 0.08); P.scales(14, 40, 14, 22, crust, deep);
      P.rect(20, 42, 1, 18, lava); P.px(20, 48, hot);
      // pelvis
      P.noise(28, 40, 20, 10, rock, 0.07); P.rect(36, 41, 1, 8, lava);
    },
    parts: [
      { id: 'body', pivot: [0, 0.4, 0], boxes: [
        { from: [-0.32, 0.5, -0.2], size: [0.64, 0.72, 0.4], uv: { all: [22, 18, 16, 22], south: [0, 18, 22, 22] } }, // torso
        { from: [-0.1, 0.66, 0.18], size: [0.2, 0.42, 0.06], uv: [46, 0, 10, 16] },    // chest lava seam
        { from: [-0.28, 0.36, -0.18], size: [0.56, 0.18, 0.36], uv: [28, 40, 20, 10] }, // pelvis
        { from: [-0.42, 1.0, -0.18], size: [0.84, 0.2, 0.36], uv: [38, 18, 12, 12] },  // shoulder crust shelf
        { from: [-0.3, 1.06, -0.26], size: [0.26, 0.16, 0.14], uv: [38, 18, 12, 12] }, // back plate L
        { from: [0.04, 1.06, -0.26], size: [0.26, 0.16, 0.14], uv: [38, 18, 12, 12] }, // back plate R
      ] },
      { id: 'head', pivot: [0, 1.12, 0], boxes: [
        { from: [-0.2, 1.12, -0.16], size: [0.4, 0.34, 0.34], uv: { all: [16, 0, 14, 16], south: [0, 0, 16, 16] } },
        { from: [-0.22, 1.42, -0.1], size: [0.44, 0.12, 0.2], uv: [30, 0, 16, 8] },    // brow crust
      ] },
      { id: 'arm0', pivot: [-0.42, 1.1, 0], boxes: [{ from: [-0.66, 0.48, -0.16], size: [0.24, 0.62, 0.3], uv: [0, 40, 14, 22] }] },
      { id: 'arm1', pivot: [0.42, 1.1, 0], boxes: [{ from: [0.42, 0.48, -0.16], size: [0.24, 0.62, 0.3], uv: [0, 40, 14, 22] }] },
      { id: 'leg0', pivot: [-0.15, 0.42, 0], boxes: [{ from: [-0.28, 0, -0.16], size: [0.26, 0.42, 0.34], uv: [14, 40, 14, 22] }] },
      { id: 'leg1', pivot: [0.15, 0.42, 0], boxes: [{ from: [0.02, 0, -0.16], size: [0.26, 0.42, 0.34], uv: [14, 40, 14, 22] }] },
    ],
  },

  // ---- veil_crawler: many-legged violet crawler with crystal spines ---------
  veil_crawler: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const skin = '#4a2f66', deep = '#2e1c44', pale = '#6a4a8c', crys = '#c58bff', maw = '#e6b8ff';
      // head face (south) — cluster of small glowing eyes over a wet maw
      P.noise(0, 0, 16, 16, skin, 0.08); P.strokes(0, 0, 16, 16, 12, deep, 3);
      P.eye(2, 4, '#1a0e2a', maw); P.eye(7, 3, '#1a0e2a', maw); P.eye(12, 5, '#1a0e2a', maw);
      P.eye(4, 8, '#1a0e2a', maw); P.eye(10, 9, '#1a0e2a', maw);
      P.glow(6, 12, 5, 3, maw, '#5a2f9a'); // maw slit glow
      // head sides
      P.noise(16, 0, 14, 16, skin, 0.07, { chance: 0.1, color: pale });
      P.strokes(16, 0, 14, 16, 12, deep, 3);
      // maw underside
      P.vgrad(30, 0, 10, 8, deep, '#1a0e2a', 0.05); P.rect(31, 1, 8, 1, maw);
      // crystal spine (shared) — violet glow shard
      P.vgrad(40, 0, 8, 16, crys, '#5a2f9a', 0.06); P.rect(43, 0, 2, 16, '#f0dcff');
      // body front / sides — chitin sheen with veil mottling
      P.noise(0, 18, 24, 18, skin, 0.08, { chance: 0.12, color: pale });
      P.scales(0, 18, 24, 18, deep, pale); P.spots(0, 18, 24, 18, 12, crys);
      // body rear
      P.noise(24, 18, 24, 18, deep, 0.07, { chance: 0.1, color: skin });
      P.scales(24, 18, 24, 18, '#1a0e2a', pale);
      // tail
      P.vgrad(48, 18, 8, 14, skin, deep, 0.06); P.spots(48, 18, 8, 14, 6, crys);
      // leg (shared) — dark chitin, pale joint
      P.noise(0, 38, 10, 18, deep, 0.07); P.rect(0, 46, 10, 2, pale); P.strokes(0, 38, 10, 18, 8, '#1a0e2a', 3);
    },
    parts: [
      { id: 'body', pivot: [0, 0.32, 0], boxes: [
        { from: [-0.22, 0.28, 0.06], size: [0.44, 0.3, 0.5], uv: [0, 18, 24, 18] },    // body front
        { from: [-0.2, 0.26, -0.5], size: [0.4, 0.28, 0.56], uv: [24, 18, 24, 18] },   // body rear
        { from: [-0.05, 0.5, 0.28], size: [0.1, 0.24, 0.1], uv: [40, 0, 8, 16] },      // crystal spine
        { from: [-0.05, 0.5, 0.06], size: [0.1, 0.26, 0.1], uv: [40, 0, 8, 16] },
        { from: [-0.05, 0.5, -0.16], size: [0.1, 0.24, 0.1], uv: [40, 0, 8, 16] },
        { from: [-0.05, 0.5, -0.38], size: [0.1, 0.2, 0.1], uv: [40, 0, 8, 16] },
      ] },
      { id: 'head', pivot: [0, 0.3, 0.48], boxes: [
        { from: [-0.18, 0.24, 0.48], size: [0.36, 0.3, 0.32], uv: { all: [16, 0, 14, 16], south: [0, 0, 16, 16] } },
        { from: [-0.12, 0.22, 0.76], size: [0.24, 0.16, 0.14], uv: [30, 0, 10, 8] },   // maw
      ] },
      { id: 'leg0', pivot: [-0.22, 0.3, 0.32], boxes: [{ from: [-0.31, 0, 0.28], size: [0.09, 0.3, 0.09], uv: [0, 38, 10, 18] }] },
      { id: 'leg1', pivot: [0.22, 0.3, 0.32], boxes: [{ from: [0.22, 0, 0.28], size: [0.09, 0.3, 0.09], uv: [0, 38, 10, 18] }] },
      { id: 'leg2', pivot: [-0.24, 0.3, 0.0], boxes: [{ from: [-0.33, 0, -0.04], size: [0.09, 0.3, 0.09], uv: [0, 38, 10, 18] }] },
      { id: 'leg3', pivot: [0.24, 0.3, 0.0], boxes: [{ from: [0.24, 0, -0.04], size: [0.09, 0.3, 0.09], uv: [0, 38, 10, 18] }] },
      { id: 'leg4', pivot: [-0.22, 0.3, -0.36], boxes: [{ from: [-0.31, 0, -0.4], size: [0.09, 0.3, 0.09], uv: [0, 38, 10, 18] }] },
      { id: 'leg5', pivot: [0.22, 0.3, -0.36], boxes: [{ from: [0.22, 0, -0.4], size: [0.09, 0.3, 0.09], uv: [0, 38, 10, 18] }] },
      { id: 'tail', pivot: [0, 0.34, -0.5], boxes: [{ from: [-0.06, 0.3, -0.78], size: [0.12, 0.12, 0.3], uv: [48, 18, 8, 14] }] },
    ],
  },

  // ---- gloomrat: mangy ruin rat, notched ear, naked tail --------------------
  gloomrat: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      const fur = '#786d5d', bald = '#9a8872', deep = '#40382e', pink = '#d29aa0';
      // face (south) — beady lightless eyes, pink twitchy nose
      P.noise(0, 0, 14, 14, fur, 0.08, { chance: 0.1, color: bald });
      P.eye(3, 6, '#0c0a08', '#5a4a3a'); P.eye(9, 6, '#0c0a08', '#5a4a3a');
      P.rect(6, 10, 2, 2, pink); P.strokes(0, 8, 14, 5, 8, deep, 2);
      // head sides
      P.noise(14, 0, 12, 14, fur, 0.08, { chance: 0.12, color: bald });
      P.strokes(14, 0, 12, 14, 12, deep, 3);
      // snout — pink tip
      P.noise(26, 0, 8, 8, fur, 0.06); P.rect(29, 5, 3, 2, pink);
      // ear — thin, notched (dark inner, a bite out of the rim)
      P.noise(34, 0, 8, 8, fur, 0.05); P.rect(35, 1, 5, 4, '#4a4034');
      P.rect(38, 0, 2, 3, deep); // notch
      // body flank — patchy mange
      P.noise(0, 16, 22, 14, fur, 0.09, { chance: 0.16, color: bald });
      P.strokes(0, 16, 22, 14, 24, deep, 4); P.spots(0, 22, 22, 6, 10, '#4a4034');
      // haunch
      P.noise(22, 16, 14, 14, fur, 0.08, { chance: 0.14, color: bald });
      P.strokes(22, 16, 14, 14, 16, deep, 3);
      // naked tail — scaly pink-grey bands
      P.vgrad(36, 16, 10, 8, pink, '#7a5a5c', 0.05); P.bands(36, 16, 10, 2, '#5a4446');
      // leg — thin, dark foot
      P.noise(0, 32, 8, 12, fur, 0.06); P.rect(0, 40, 8, 2, deep);
    },
    parts: [
      { id: 'body', pivot: [0, 0.15, 0], boxes: [
        { from: [-0.16, 0.1, -0.28], size: [0.32, 0.24, 0.5], uv: { all: [0, 16, 22, 14], up: [22, 16, 14, 14] } },
        { from: [-0.15, 0.12, -0.34], size: [0.3, 0.26, 0.24], uv: [22, 16, 14, 14] }, // haunch
        { from: [-0.13, 0, 0.14], size: [0.07, 0.12, 0.07], uv: [0, 32, 8, 12] },      // front legs
        { from: [0.06, 0, 0.14], size: [0.07, 0.12, 0.07], uv: [0, 32, 8, 12] },
        { from: [-0.14, 0, -0.28], size: [0.08, 0.12, 0.08], uv: [0, 32, 8, 12] },     // hind legs
        { from: [0.06, 0, -0.28], size: [0.08, 0.12, 0.08], uv: [0, 32, 8, 12] },
      ] },
      { id: 'head', pivot: [0, 0.16, 0.16], boxes: [
        { from: [-0.13, 0.14, 0.22], size: [0.26, 0.24, 0.26], uv: { all: [14, 0, 12, 14], south: [0, 0, 14, 14] } },
        { from: [-0.07, 0.12, 0.46], size: [0.14, 0.12, 0.12], uv: [26, 0, 8, 8] },    // snout
        { from: [-0.15, 0.36, 0.22], size: [0.11, 0.11, 0.04], uv: [34, 0, 8, 8] },    // ear L (notched)
        { from: [0.04, 0.36, 0.22], size: [0.11, 0.11, 0.04], uv: [34, 0, 8, 8] },     // ear R
      ] },
      { id: 'tail', pivot: [0, 0.16, -0.4], boxes: [{ from: [-0.03, 0.14, -0.42], size: [0.06, 0.06, 0.44], uv: [36, 16, 10, 8] }] },
    ],
  },

  // ---- root_creeper: root-spider with a knotted wood body -------------------
  root_creeper: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      const wood = '#5a4326', dwood = '#392b18', light = '#77592f', sap = '#b7e36a', leaf = '#4c7a30';
      // head crown (south) — knot with two glowing sap eyes
      P.noise(0, 0, 16, 16, wood, 0.08, { chance: 0.14, color: light });
      P.strokes(0, 0, 16, 16, 18, dwood, 4);
      P.glow(2, 5, 4, 4, sap, '#4a6a1e'); P.glow(10, 5, 4, 4, sap, '#4a6a1e');
      P.px(3, 6, '#eaffc0'); P.px(11, 6, '#eaffc0');
      // head sides — bark grain
      P.noise(16, 0, 14, 16, wood, 0.08); P.strokes(16, 0, 14, 16, 20, dwood, 5);
      // sprout — leafy green
      P.vgrad(30, 0, 10, 14, leaf, '#2f5220', 0.06); P.strokes(30, 0, 10, 14, 12, '#6fa844', 4);
      // base root mass — dense gnarled bark
      P.noise(0, 18, 24, 16, dwood, 0.09, { chance: 0.1, color: wood });
      P.strokes(0, 18, 24, 16, 34, '#241b0f', 5); P.spots(0, 18, 24, 16, 10, light);
      // mid knotted body — bark knots
      P.noise(24, 18, 20, 18, wood, 0.08, { chance: 0.12, color: light });
      P.strokes(24, 18, 20, 18, 26, dwood, 5); P.spots(30, 24, 8, 8, 6, '#241b0f');
      // leg thigh (shared) — root bark
      P.noise(0, 38, 14, 10, wood, 0.07); P.strokes(0, 38, 14, 10, 12, dwood, 4);
      // leg shin (shared)
      P.noise(14, 38, 10, 18, dwood, 0.07); P.strokes(14, 38, 10, 18, 12, '#241b0f', 5);
    },
    parts: [
      { id: 'body', pivot: [0, 0.2, 0], boxes: [
        { from: [-0.26, 0, -0.26], size: [0.52, 0.18, 0.52], uv: [0, 18, 24, 16] },    // base root mass
        { from: [-0.2, 0.18, -0.2], size: [0.4, 0.3, 0.4], uv: [24, 18, 20, 18] },     // mid body
        // four splayed root legs (thigh out + shin down)
        { from: [-0.44, 0.16, 0.12], size: [0.2, 0.1, 0.12], uv: [0, 38, 14, 10] },
        { from: [-0.46, 0, 0.13], size: [0.1, 0.18, 0.1], uv: [14, 38, 10, 18] },
        { from: [0.24, 0.16, 0.12], size: [0.2, 0.1, 0.12], uv: [0, 38, 14, 10] },
        { from: [0.36, 0, 0.13], size: [0.1, 0.18, 0.1], uv: [14, 38, 10, 18] },
        { from: [-0.44, 0.16, -0.24], size: [0.2, 0.1, 0.12], uv: [0, 38, 14, 10] },
        { from: [-0.46, 0, -0.23], size: [0.1, 0.18, 0.1], uv: [14, 38, 10, 18] },
        { from: [0.24, 0.16, -0.24], size: [0.2, 0.1, 0.12], uv: [0, 38, 14, 10] },
        { from: [0.36, 0, -0.23], size: [0.1, 0.18, 0.1], uv: [14, 38, 10, 18] },
      ] },
      { id: 'head', pivot: [0, 0.48, -0.1], boxes: [
        { from: [-0.15, 0.48, -0.14], size: [0.3, 0.26, 0.3], uv: { all: [16, 0, 14, 16], south: [0, 0, 16, 16] } },
        { from: [-0.05, 0.72, -0.05], size: [0.1, 0.16, 0.1], uv: [30, 0, 10, 14] },   // sprout
      ] },
    ],
  },

  // ---- rootling (NEW): tiny sprout minion with a leaf crown -----------------
  rootling: {
    texW: 64, texH: 64, rig: 'hopper',
    paint(ctx, P) {
      const root = '#4e3a22', droot = '#33260f', green = '#4c7a30', lgreen = '#6fa844', leaf = '#a6d06a';
      // face (south) — big innocent eyes, rosy sap cheeks
      P.noise(0, 0, 16, 16, green, 0.08, { chance: 0.12, color: lgreen });
      P.eye(3, 6, '#12200c', '#ffffff'); P.eye(11, 6, '#12200c', '#ffffff');
      P.px(2, 9, '#d98a94'); P.px(13, 9, '#d98a94'); // cheeks
      P.rect(7, 10, 2, 1, '#2f5220');
      // head sides
      P.noise(16, 0, 14, 16, green, 0.08, { chance: 0.14, color: lgreen });
      P.strokes(16, 0, 14, 16, 14, '#2f5220', 3);
      // leaf (shared) — bright blade with a midrib
      P.vgrad(30, 0, 10, 14, leaf, green, 0.06); P.rect(34, 0, 1, 14, '#d6f0a0'); P.strokes(30, 0, 10, 14, 8, lgreen, 4);
      // body root bulb — knotty bark
      P.noise(0, 18, 18, 18, root, 0.09, { chance: 0.14, color: '#6a4f2e' });
      P.strokes(0, 18, 18, 18, 24, droot, 5); P.spots(0, 18, 18, 18, 8, '#241a0c');
      // foot (shared)
      P.noise(18, 18, 10, 12, root, 0.07); P.rect(18, 27, 10, 3, droot);
      // arm nub (shared)
      P.noise(28, 18, 8, 14, root, 0.07); P.strokes(28, 18, 8, 14, 8, droot, 4);
    },
    parts: [
      { id: 'body', pivot: [0, 0.15, 0], boxes: [
        { from: [-0.15, 0, -0.15], size: [0.3, 0.3, 0.3], uv: [0, 18, 18, 18] },       // root bulb
        { from: [-0.11, 0, 0.02], size: [0.09, 0.1, 0.1], uv: [18, 18, 10, 12] },      // foot L
        { from: [0.02, 0, 0.02], size: [0.09, 0.1, 0.1], uv: [18, 18, 10, 12] },       // foot R
        { from: [-0.16, 0.12, 0], size: [0.06, 0.14, 0.06], uv: [28, 18, 8, 14] },     // arm L
        { from: [0.1, 0.12, 0], size: [0.06, 0.14, 0.06], uv: [28, 18, 8, 14] },       // arm R
      ] },
      { id: 'head', pivot: [0, 0.3, 0], boxes: [
        { from: [-0.12, 0.3, -0.12], size: [0.24, 0.2, 0.24], uv: { all: [16, 0, 14, 16], south: [0, 0, 16, 16] } },
        { from: [-0.05, 0.46, 0.04], size: [0.1, 0.14, 0.05], uv: [30, 0, 10, 14] },   // leaf front
        { from: [-0.05, 0.46, -0.09], size: [0.1, 0.14, 0.05], uv: [30, 0, 10, 14] },  // leaf back
        { from: [-0.12, 0.46, -0.03], size: [0.05, 0.14, 0.1], uv: [30, 0, 10, 14] },  // leaf L
        { from: [0.07, 0.46, -0.03], size: [0.05, 0.14, 0.1], uv: [30, 0, 10, 14] },   // leaf R
      ] },
    ],
  },

  // ---- ash_salamander (NEW): slither newt, black skin, ember spots ----------
  ash_salamander: {
    texW: 64, texH: 64, rig: 'slither',
    paint(ctx, P) {
      const skin = '#1c1a1e', deep = '#0e0d10', belly = '#2a2622', ember = '#ff7a1e', hot = '#ffae4a';
      // head face (south) — molten eyes, ashen snout
      P.noise(0, 0, 14, 12, skin, 0.08, { chance: 0.05, color: ember });
      P.eye(3, 4, '#3a1400', hot); P.eye(9, 4, '#3a1400', hot);
      P.glow(2, 3, 4, 4, hot, '#c24800'); P.glow(8, 3, 4, 4, hot, '#c24800');
      P.rect(5, 9, 4, 1, deep);
      // head sides
      P.noise(14, 0, 12, 12, skin, 0.08, { chance: 0.06, color: ember });
      P.strokes(14, 0, 12, 12, 10, deep, 3);
      // snout
      P.noise(26, 0, 10, 8, skin, 0.06); P.px(29, 4, hot); P.px(33, 4, hot); // nostril embers
      // ember dorsal ridge (shared) — glowing coal
      P.glow(36, 0, 8, 8, '#ffe0a0', ember);
      // body flank — soot-black skin, glowing ember spots
      P.noise(0, 14, 24, 14, skin, 0.09, { chance: 0.05, color: deep });
      P.strokes(0, 14, 24, 14, 20, deep, 3);
      P.glow(3, 17, 4, 4, hot, '#a83c00'); P.glow(11, 20, 4, 4, hot, '#a83c00'); P.glow(18, 16, 4, 4, hot, '#a83c00');
      P.spots(0, 14, 24, 14, 10, ember);
      // body top / belly seam
      P.noise(24, 14, 24, 14, skin, 0.08); P.rect(24, 24, 24, 3, belly); P.spots(24, 14, 24, 8, 8, ember);
      // tail segment — soot with fading embers
      P.noise(0, 30, 18, 12, skin, 0.08); P.glow(4, 33, 4, 4, hot, '#a83c00'); P.spots(0, 30, 18, 12, 8, ember);
      // tail tip
      P.vgrad(18, 30, 12, 10, skin, deep, 0.06); P.px(23, 33, ember);
      // leg (shared) — stubby, ember toe
      P.noise(30, 30, 12, 8, skin, 0.06); P.rect(30, 36, 12, 2, deep); P.px(35, 35, ember);
    },
    parts: [
      { id: 'body', pivot: [0, 0.12, 0], boxes: [
        { from: [-0.13, 0.06, -0.22], size: [0.26, 0.18, 0.5], uv: { all: [0, 14, 24, 14], up: [24, 14, 24, 14] } },
        { from: [-0.03, 0.22, 0.08], size: [0.06, 0.06, 0.1], uv: [36, 0, 8, 8] },     // dorsal ember ridge
        { from: [-0.03, 0.22, -0.16], size: [0.06, 0.06, 0.1], uv: [36, 0, 8, 8] },
        { from: [-0.24, 0.0, 0.04], size: [0.14, 0.06, 0.1], uv: [30, 30, 12, 8] },    // front legs (sprawled)
        { from: [0.1, 0.0, 0.04], size: [0.14, 0.06, 0.1], uv: [30, 30, 12, 8] },
        { from: [-0.24, 0.0, -0.28], size: [0.14, 0.06, 0.1], uv: [30, 30, 12, 8] },   // hind legs
        { from: [0.1, 0.0, -0.28], size: [0.14, 0.06, 0.1], uv: [30, 30, 12, 8] },
      ] },
      { id: 'head', pivot: [0, 0.12, 0.26], boxes: [
        { from: [-0.12, 0.06, 0.28], size: [0.24, 0.16, 0.24], uv: { all: [14, 0, 12, 12], south: [0, 0, 14, 12] } },
        { from: [-0.08, 0.06, 0.5], size: [0.16, 0.1, 0.12], uv: [26, 0, 10, 8] },     // snout
      ] },
      { id: 'tail', pivot: [0, 0.14, -0.22], boxes: [
        { from: [-0.06, 0.08, -0.58], size: [0.12, 0.12, 0.36], uv: [0, 30, 18, 12] },
        { from: [-0.03, 0.09, -0.82], size: [0.06, 0.08, 0.26], uv: [18, 30, 12, 10] },
      ] },
    ],
  },
};
