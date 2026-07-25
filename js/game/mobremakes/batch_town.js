// Remade mob models — the town batch.
// One creature: the straw training dummy that stands on the green in
// Brookhollow. It is not livestock and it is not a goblin, so it lives in its
// own file. See js/game/mobremake.js for the def format.

export const TOWN = {
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
      { id: 'body', pivot: [0, 0.0625, 0], boxes: [
        { from: [-0.0625, 0, -0.0625], size: [0.25, 1.0625, 0.25], uv: [0, 0, 8, 20] },            // post
        { from: [-0.5, 1.125, -0.0625], size: [0.9375, 0.125, 0.125], uv: [10, 0, 20, 6] },        // crossbar
        { from: [-0.25, 0.8125, -0.1875], size: [0.5625, 0.625, 0.375], uv: { all: [0, 22, 16, 18], south: [18, 22, 16, 18] } }, // torso
        { from: [-0.1875, 1.4375, -0.1875], size: [0.375, 0.375, 0.3125], uv: { all: [32, 0, 12, 12], south: [46, 0, 14, 14] } },   // head
        { from: [-0.5, 0.8125, -0.0625], size: [0.125, 0.3125, 0.1875], uv: [32, 14, 10, 10] },      // arm sack L (hangs off crossbar)
        { from: [0.375, 0.8125, -0.0625], size: [0.125, 0.3125, 0.1875], uv: [32, 14, 10, 10] },       // arm sack R
        { from: [-0.1875, 1.375, -0.125], size: [0.3125, 0.0625, 0.25], uv: [44, 16, 10, 8] },       // straw neck tuft
        { from: [-0.25, 0.75, -0.1875], size: [0.4375, 0.0625, 0.3125], uv: [0, 42, 16, 6] },        // straw bottom tuft
        { from: [-0.5, 0.8125, -0.0625], size: [0.1875, 0.0625, 0.125], uv: [44, 16, 10, 8] },       // straw arm tuft L
        { from: [0.375, 0.8125, -0.0625], size: [0.1875, 0.0625, 0.125], uv: [44, 16, 10, 8] },        // straw arm tuft R
      ] },
    ],
  },
};
