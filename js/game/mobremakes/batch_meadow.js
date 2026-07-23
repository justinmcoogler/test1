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
};
