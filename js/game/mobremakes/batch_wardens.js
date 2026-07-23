// Remade mob models — wardens region batch: the two dungeon bosses and the
// town training dummy. Frost blues/whites for the alpha; forest green/bark for
// the golem. See js/game/mobremake.js for the def format.

export const WARDENS = {
  // --------------------------------------------------------------------------
  // rimehowl_alpha — BOSS. A huge alpha frost-wolf (~1.45 tall, ~2.3 long): a
  // heavy shaggy ruff, bared fangs, a scar over one ice-blue glowing eye.
  // (quadruped)
  // --------------------------------------------------------------------------
  rimehowl_alpha: {
    texW: 64, texH: 64, rig: 'quadruped',
    paint(ctx, P) {
      const fur = '#dfe8f2', furDk = '#b3c4d6', shadow = '#93a6bc';
      // flank — pale frost fur, long strokes
      P.noise(0, 0, 24, 16, fur, 0.06, { chance: 0.08, color: furDk });
      P.strokes(0, 0, 24, 16, 34, furDk, 4);
      P.spots(0, 0, 24, 16, 12, '#f4f8ff');
      // back / dorsal
      P.noise(0, 18, 24, 10, '#cdd8e6', 0.05);
      P.strokes(0, 18, 24, 10, 26, shadow, 4);
      // haunch
      P.noise(26, 0, 14, 12, fur, 0.06);
      P.strokes(26, 0, 14, 12, 18, furDk, 5);
      // ruff — heavy shaggy mane, long downward strokes
      P.noise(26, 14, 16, 14, '#eef3fa', 0.07);
      P.strokes(26, 14, 16, 14, 40, furDk, 7);
      P.strokes(26, 14, 16, 14, 20, shadow, 6);
      // neck
      P.noise(0, 30, 12, 10, fur, 0.06);
      P.strokes(0, 30, 12, 10, 14, furDk, 4);
      // head sides
      P.noise(42, 0, 12, 12, fur, 0.06);
      P.strokes(42, 0, 12, 12, 14, furDk, 3);
      // head face — ice-blue glowing eyes, scar over the right eye, bared fangs
      P.noise(42, 14, 16, 16, '#eaf1fb', 0.05);
      P.strokes(42, 14, 16, 4, 12, furDk, 3);         // brow fur
      // glowing eyes
      P.glow(45, 19, 4, 4, '#8fe0ff', '#20506e'); P.px(46, 20, '#ffffff');
      P.glow(53, 19, 4, 4, '#8fe0ff', '#20506e'); P.px(54, 20, '#ffffff');
      // scar — diagonal slash over the right eye
      P.px(52, 17, '#e6c4c4'); P.px(53, 18, '#e6c4c4'); P.px(54, 19, '#d8a8a8'); P.px(55, 20, '#e6c4c4'); P.px(56, 21, '#e6c4c4');
      // snout shading + bared fangs on the muzzle front
      P.rect(46, 24, 8, 2, '#c2d0e0');
      P.px(49, 26, '#2a3444'); P.px(50, 26, '#2a3444');  // nose
      P.rect(46, 27, 8, 2, '#3a4658');                    // dark mouth
      for (let i = 0; i < 4; i++) P.px(46 + i * 2, 28, '#f4f8ff'); // fang tips
      // muzzle
      P.noise(14, 30, 12, 10, fur, 0.05);
      P.rect(16, 37, 8, 2, '#3a4658');
      // fangs
      P.vgrad(0, 42, 4, 6, '#ffffff', '#d6e0ee', 0.03);
      // ears — dark inner
      P.noise(6, 42, 6, 10, furDk, 0.06);
      P.rect(8, 43, 2, 5, '#5a6a80');
      // tail — bushy
      P.noise(26, 30, 14, 14, fur, 0.07);
      P.strokes(26, 30, 14, 14, 30, furDk, 6);
      // legs — thick
      P.noise(42, 32, 10, 16, '#cdd8e6', 0.06);
      P.strokes(42, 32, 10, 16, 16, shadow, 5);
      P.rect(42, 44, 10, 4, '#8a9cb0');               // paw
      // fur tufts
      P.noise(54, 0, 8, 10, '#eef3fa', 0.06);
      P.strokes(54, 0, 8, 10, 14, furDk, 6);
    },
    parts: [
      { id: 'body', pivot: [0, 0.55, 0], boxes: [
        { from: [-0.32, 0.50, -0.70], size: [0.64, 0.56, 1.10], uv: { all: [0, 0, 24, 16], up: [0, 18, 24, 10] } },
        { from: [-0.34, 0.46, -0.80], size: [0.68, 0.60, 0.45], uv: [26, 0, 14, 12] },       // rear haunch
        { from: [-0.44, 0.52, 0.28], size: [0.88, 0.64, 0.42], uv: [26, 14, 16, 14] },       // ruff / mane
        { from: [-0.22, 0.72, 0.50], size: [0.44, 0.40, 0.30], uv: [0, 30, 12, 10] },        // neck
        { from: [-0.30, 1.10, 0.30], size: [0.16, 0.16, 0.16], uv: [54, 0, 8, 10] },         // ruff tuft L
        { from: [0.14, 1.10, 0.30], size: [0.16, 0.16, 0.16], uv: [54, 0, 8, 10] },          // ruff tuft R
        { from: [-0.08, 1.14, -0.10], size: [0.16, 0.14, 0.30], uv: [54, 0, 8, 10] },        // spine tuft
      ] },
      { id: 'head', pivot: [0, 0.95, 0.7], boxes: [
        { from: [-0.27, 0.86, 0.68], size: [0.54, 0.46, 0.42], uv: { all: [42, 0, 12, 12], south: [42, 14, 16, 16] } },
        { from: [-0.17, 0.82, 1.06], size: [0.34, 0.30, 0.26], uv: { all: [14, 30, 12, 10], south: [14, 30, 12, 10] } }, // muzzle
        { from: [-0.11, 0.74, 1.24], size: [0.05, 0.10, 0.05], uv: [0, 42, 4, 6] },          // fang L
        { from: [0.06, 0.74, 1.24], size: [0.05, 0.10, 0.05], uv: [0, 42, 4, 6] },           // fang R
        { from: [-0.24, 1.28, 0.78], size: [0.13, 0.20, 0.08], uv: [6, 42, 6, 10] },         // ear L
        { from: [0.11, 1.28, 0.78], size: [0.13, 0.20, 0.08], uv: [6, 42, 6, 10] },          // ear R
      ] },
      { id: 'leg0', pivot: [-0.26, 0.52, 0.28], boxes: [{ from: [-0.34, 0, 0.20], size: [0.20, 0.52, 0.18], uv: [42, 32, 10, 16] }] },
      { id: 'leg1', pivot: [0.26, 0.52, 0.28], boxes: [{ from: [0.14, 0, 0.20], size: [0.20, 0.52, 0.18], uv: [42, 32, 10, 16] }] },
      { id: 'leg2', pivot: [-0.26, 0.52, -0.55], boxes: [{ from: [-0.34, 0, -0.63], size: [0.20, 0.52, 0.18], uv: [42, 32, 10, 16] }] },
      { id: 'leg3', pivot: [0.26, 0.52, -0.55], boxes: [{ from: [0.14, 0, -0.63], size: [0.20, 0.52, 0.18], uv: [42, 32, 10, 16] }] },
      { id: 'tail', pivot: [0, 0.62, -0.80], boxes: [{ from: [-0.11, 0.55, -1.05], size: [0.22, 0.22, 0.40], uv: [26, 30, 14, 14] }] },
    ],
  },

  // --------------------------------------------------------------------------
  // rootbound_golem — BOSS. A ~2.3-tall forest warden of mossy bark plates, a
  // glowing amber heart set in a chest gap, and long root-tendril arms. (biped)
  // --------------------------------------------------------------------------
  rootbound_golem: {
    texW: 64, texH: 64, rig: 'biped',
    paint(ctx, P) {
      const bark = '#5a4632', barkDk = '#3a2c1e', moss = '#4a6a2e', mossHi = '#6f9a3a';
      const gEye = (x, y) => { P.glow(x - 1, y - 1, 4, 4, '#ffc24a', '#5a3410'); P.px(x, y, '#ffe8a0'); };
      // torso — vertical bark plates with moss patches
      P.noise(0, 0, 20, 18, bark, 0.08, { chance: 0.22, color: moss });
      P.strokes(0, 0, 20, 18, 40, barkDk, 6);
      P.spots(0, 0, 20, 18, 12, mossHi);
      P.rect(0, 0, 20, 1, barkDk); P.rect(0, 8, 20, 1, barkDk); // plate seams
      // chest recess — dark gap
      P.noise(22, 0, 8, 8, '#1a140c', 0.05);
      // heart — amber glow set deep
      P.glow(22, 10, 10, 10, '#ffd050', '#7a3a08');
      P.px(26, 14, '#fff4c0'); P.px(27, 14, '#fff4c0');
      // moss belt
      P.noise(0, 20, 20, 4, mossHi, 0.1);
      P.strokes(0, 20, 20, 4, 18, moss, 3);
      // head sides
      P.noise(32, 0, 12, 12, bark, 0.08, { chance: 0.2, color: moss });
      P.strokes(32, 0, 12, 12, 16, barkDk, 4);
      // head face — amber glow eyes, bark cracks, mossy brow
      P.noise(46, 0, 14, 14, bark, 0.07, { chance: 0.15, color: moss });
      P.strokes(46, 0, 14, 3, 10, mossHi, 3);        // moss brow line
      gEye(49, 6); gEye(55, 6);
      P.rect(49, 11, 6, 1, '#1a140c');               // mouth crack
      P.px(52, 4, '#2a2014'); P.px(52, 9, '#2a2014'); // vertical crack
      // brow moss
      P.noise(0, 26, 14, 4, moss, 0.1);
      P.strokes(0, 26, 14, 4, 16, mossHi, 3);
      // root horns
      P.vgrad(32, 14, 6, 12, bark, barkDk, 0.06);
      P.strokes(32, 14, 6, 12, 8, moss, 4);
      // arm upper — bark
      P.noise(16, 26, 10, 16, bark, 0.08);
      P.strokes(16, 26, 10, 16, 20, barkDk, 6);
      P.spots(16, 26, 10, 16, 6, moss);
      // arm lower — knotted root
      P.noise(28, 26, 8, 14, '#4a3826', 0.08);
      P.strokes(28, 26, 8, 14, 18, barkDk, 6);
      // fingers — root tendrils
      P.noise(38, 26, 8, 8, '#4a3826', 0.07);
      P.strokes(38, 26, 8, 8, 12, barkDk, 5);
      // shoulder plate
      P.noise(48, 16, 10, 10, bark, 0.08, { chance: 0.2, color: moss });
      P.strokes(48, 16, 10, 10, 12, barkDk, 4);
      // legs — thick bark & root
      P.noise(48, 28, 12, 20, bark, 0.08, { chance: 0.15, color: moss });
      P.strokes(48, 28, 12, 20, 26, barkDk, 7);
      P.rect(48, 44, 12, 4, '#2c2216');
    },
    parts: [
      { id: 'body', pivot: [0, 0.9, 0], boxes: [
        { from: [-0.48, 0.90, -0.34], size: [0.96, 0.85, 0.68], uv: [0, 0, 20, 18] },        // torso
        { from: [-0.20, 1.08, 0.30], size: [0.40, 0.34, 0.08], uv: [22, 0, 8, 8] },          // chest recess
        { from: [-0.14, 1.12, 0.34], size: [0.28, 0.26, 0.10], uv: [22, 10, 10, 10] },       // amber heart
        { from: [-0.50, 0.85, 0.28], size: [1.00, 0.16, 0.12], uv: [0, 20, 20, 4] },         // moss belt
        { from: [-0.62, 1.50, -0.24], size: [0.18, 0.30, 0.48], uv: [48, 16, 10, 10] },      // shoulder L
        { from: [0.44, 1.50, -0.24], size: [0.18, 0.30, 0.48], uv: [48, 16, 10, 10] },       // shoulder R
      ] },
      { id: 'head', pivot: [0, 1.78, -0.1], boxes: [
        { from: [-0.28, 1.78, -0.22], size: [0.56, 0.42, 0.50], uv: { all: [32, 0, 12, 12], south: [46, 0, 14, 14] } },
        { from: [-0.30, 2.14, 0.06], size: [0.60, 0.10, 0.12], uv: [0, 26, 14, 4] },         // moss brow
        { from: [-0.22, 2.18, -0.10], size: [0.08, 0.28, 0.08], uv: [32, 14, 6, 12] },       // root horn L
        { from: [0.14, 2.18, -0.10], size: [0.08, 0.28, 0.08], uv: [32, 14, 6, 12] },        // root horn R
      ] },
      { id: 'arm0', pivot: [-0.52, 1.6, 0], boxes: [
        { from: [-0.66, 0.90, -0.16], size: [0.22, 0.70, 0.34], uv: [16, 26, 10, 16] },      // upper
        { from: [-0.66, 0.40, -0.14], size: [0.20, 0.55, 0.28], uv: [28, 26, 8, 14] },       // lower
        { from: [-0.66, 0.18, -0.10], size: [0.18, 0.24, 0.16], uv: [38, 26, 8, 8] },        // root fingers
      ] },
      { id: 'arm1', pivot: [0.52, 1.6, 0], boxes: [
        { from: [0.44, 0.90, -0.16], size: [0.22, 0.70, 0.34], uv: [16, 26, 10, 16] },
        { from: [0.46, 0.40, -0.14], size: [0.20, 0.55, 0.28], uv: [28, 26, 8, 14] },
        { from: [0.48, 0.18, -0.10], size: [0.18, 0.24, 0.16], uv: [38, 26, 8, 8] },
      ] },
      { id: 'leg0', pivot: [-0.24, 0.9, 0], boxes: [{ from: [-0.38, 0, -0.24], size: [0.28, 0.90, 0.50], uv: [48, 28, 12, 20] }] },
      { id: 'leg1', pivot: [0.24, 0.9, 0], boxes: [{ from: [0.10, 0, -0.24], size: [0.28, 0.90, 0.50], uv: [48, 28, 12, 20] }] },
    ],
  },

  // --------------------------------------------------------------------------
  // practice_dummy — a straw-stuffed burlap dummy lashed to a wooden cross-post,
  // patched sackcloth, straw poking from the seams, stitched X eyes. (sway)
  // --------------------------------------------------------------------------
  practice_dummy: {
    texW: 64, texH: 64, rig: 'sway',
    paint(ctx, P) {
      const post = '#6a4a2c', burlap = '#b89a68', burlapDk = '#8a6a44', straw = '#d8b858', stitch = '#3a2a1a';
      // post — wood grain
      P.noise(0, 0, 8, 20, post, 0.07);
      P.strokes(0, 0, 8, 20, 16, '#4a3218', 6);
      // crossbar — wood
      P.noise(10, 0, 20, 6, post, 0.06);
      P.strokes(10, 0, 20, 6, 14, '#4a3218', 3);
      // torso sides — burlap weave with a patch
      P.noise(0, 22, 16, 18, burlap, 0.07, { chance: 0.08, color: burlapDk });
      P.bands(0, 22, 16, 18, 2, P.shade(burlapDk, 0.02));  // woven courses
      P.rect(2, 30, 6, 6, burlapDk);                        // patch
      P.outline(2, 30, 6, 6, stitch);
      // torso front — burlap with stitched seam
      P.noise(18, 22, 16, 18, burlap, 0.07, { chance: 0.08, color: burlapDk });
      P.bands(18, 22, 16, 18, 2, P.shade(burlapDk, 0.02));
      P.rect(25, 22, 1, 18, stitch);                        // vertical seam
      for (let i = 0; i < 8; i++) P.px(25, 23 + i * 2, straw); // stitch highlights along the seam
      P.rect(20, 34, 5, 5, burlapDk); P.outline(20, 34, 5, 5, stitch); // front patch
      // head sides — burlap
      P.noise(32, 0, 12, 12, burlap, 0.06);
      P.bands(32, 0, 12, 12, 2, P.shade(burlapDk, 0.02));
      // head face — stitched X eyes, stitched mouth, a patch
      P.noise(46, 0, 14, 14, burlap, 0.06);
      P.bands(46, 0, 14, 14, 2, P.shade(burlapDk, 0.02));
      const xEye = (x, y) => { for (let i = 0; i < 3; i++) { P.px(x + i, y + i, stitch); P.px(x + 2 - i, y + i, stitch); } };
      xEye(48, 3); xEye(54, 3);
      P.rect(50, 10, 5, 1, stitch); P.px(50, 9, stitch); P.px(54, 11, stitch); // crooked mouth
      P.rect(56, 8, 3, 3, burlapDk); P.outline(56, 8, 3, 3, stitch);          // cheek patch
      // arm stubs — burlap
      P.noise(32, 14, 10, 10, burlapDk, 0.06);
      P.bands(32, 14, 10, 10, 2, P.shade(burlap, 0.02));
      // straw tufts
      P.rect(44, 16, 10, 8, straw);
      P.strokes(44, 16, 10, 8, 24, '#b8942e', 5);
      P.strokes(44, 16, 10, 8, 14, '#f0d878', 4);
      // straw at the bottom seam
      P.rect(0, 42, 16, 6, straw);
      P.strokes(0, 42, 16, 6, 26, '#b8942e', 5);
    },
    parts: [
      { id: 'body', pivot: [0, 0.05, 0], boxes: [
        { from: [-0.07, 0, -0.07], size: [0.14, 1.05, 0.14], uv: [0, 0, 8, 20] },            // post
        { from: [-0.48, 1.12, -0.06], size: [0.96, 0.12, 0.12], uv: [10, 0, 20, 6] },        // crossbar
        { from: [-0.27, 0.82, -0.20], size: [0.54, 0.60, 0.40], uv: { all: [0, 22, 16, 18], south: [18, 22, 16, 18] } }, // torso
        { from: [-0.19, 1.44, -0.17], size: [0.38, 0.36, 0.34], uv: { all: [32, 0, 12, 12], south: [46, 0, 14, 14] } },   // head
        { from: [-0.50, 0.84, -0.09], size: [0.15, 0.30, 0.18], uv: [32, 14, 10, 10] },      // arm sack L (hangs off crossbar)
        { from: [0.35, 0.84, -0.09], size: [0.15, 0.30, 0.18], uv: [32, 14, 10, 10] },       // arm sack R
        { from: [-0.16, 1.40, -0.14], size: [0.32, 0.08, 0.28], uv: [44, 16, 10, 8] },       // straw neck tuft
        { from: [-0.22, 0.78, -0.16], size: [0.44, 0.08, 0.32], uv: [0, 42, 16, 6] },        // straw bottom tuft
        { from: [-0.51, 0.80, -0.07], size: [0.16, 0.07, 0.14], uv: [44, 16, 10, 8] },       // straw arm tuft L
        { from: [0.35, 0.80, -0.07], size: [0.16, 0.07, 0.14], uv: [44, 16, 10, 8] },        // straw arm tuft R
      ] },
    ],
  },
};
