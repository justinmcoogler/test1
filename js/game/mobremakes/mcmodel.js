// Minecraft model conventions — the authoring kit every remade mob is built on.
//
// WHY THIS EXISTS
// The first pass of these models was authored directly in blocks with free
// decimals (0.07, 0.15, 0.54…). That produced 92% of dimensions sitting off the
// texel grid and 341 of 573 boxes thinner than a single texture pixel, which is
// why they read as spindly organic blobs rather than Minecraft creatures. This
// module makes the grid the only way to author.
//
// THE RULES (how Minecraft entity models are actually built)
//  1. UNITS. One block = 16 pixels. Every box offset and size is a WHOLE number
//     of pixels. Blockbench calls these units; the game divides by 16. Authoring
//     here is in pixels — px() does the conversion, so nothing lands off-grid.
//  2. THICKNESS. A limb is never thinner than 2px. The standard cross-section is
//     4x4 for cows/pigs/players, 3x3 for small mobs (chicken, rabbit), 2x2 only
//     for deliberately gaunt silhouettes (skeleton, wolf legs, bat). Sub-2px
//     geometry is thinner than the texel painted on it and looks like wire.
//  3. PROPORTION. Bodies are BIG relative to limbs; the readable silhouette is a
//     chunky mass on short thick legs, not a thin frame. See MC_REF below for
//     the canonical dimensions of the vanilla mobs these creatures echo.
//  4. PIVOTS at the joint, not the centre: shoulder at the top of the arm, hip at
//     the top of the leg, neck base for the head. Pivots are on the grid too, so
//     limbs rotate around a texel edge and never shimmer.
//  5. FLAT FACES. Boxes are axis-aligned and hard-edged. No bevels, no rounding;
//     shape comes from stacking boxes, detail comes from the painted skin.
//  6. UV. Each box unwraps as a cross-shaped net: a row of top/bottom faces above
//     a row of side faces. net() lays that out exactly; total island footprint is
//     (2*depth + 2*width) x (depth + height).
//
// This engine's axes: +Z is FORWARD (a creature's face is its 'south' UV face),
// +Y is up, and y=0 is the ground the feet stand on.

export const PPB = 16;            // pixels per block
const q = (v) => Math.round(v) / PPB;   // snap to the texel grid, then to blocks

// A box authored in pixels. from = min corner (x, y, z) with y measured up from
// the ground; size = [w, h, d]. uv is either a single island [x, y, w, h] or a
// per-face map — use net() for a proper Minecraft unwrap.
export function b(from, size, uv, color) {
  const box = { from: from.map(q), size: size.map(q) };
  if (uv) box.uv = uv;
  if (color) box.color = color;
  return box;
}

// A part (bone). pivot is in pixels and marks the JOINT the part rotates about.
export function part(id, pivot, boxes, extra = {}) {
  return { id, pivot: pivot.map(q), boxes, ...extra };
}

// The standard Minecraft box unwrap for a w x h x d box at texture offset (u,v):
//
//        <-d-><--w--><--w-->
//   v    +----+------+------+          top row: the two caps
//        |    | top  |bottom|
//   v+d  +----+------+------+------+   side row: right, front, left, back
//        |east|south |west  |north |
//   v+d+h+----+------+------+------+
//
// Footprint: (2d + 2w) wide, (d + h) tall. 'south' is the face that points +Z,
// i.e. the creature's front, which is where eyes/faces get painted.
export function net(u, v, w, h, d) {
  return {
    up: [u + d, v, w, d],
    down: [u + d + w, v, w, d],
    east: [u, v + d, d, h],
    south: [u + d, v + d, w, h],
    west: [u + d + w, v + d, d, h],
    north: [u + d + w + d, v + d, w, h],
  };
}

// Mirrored pair of limbs: same box shape and UV, offset to either side of the
// centre line. Returns two parts named `${id}L` / `${id}R` — the rig walks any
// part whose id starts with 'leg' and swings any that starts with 'arm'.
export function limbPair(id, { size, y = 0, z, xInner, uv, extra }) {
  const [w, h, d] = size;
  const mk = (side, sx) => part(`${id}${side}`, [sx + (sx < 0 ? w : 0), y + h, z + d / 2],
    [b([sx, y, z], size, uv)], extra || {});
  return [mk('L', -xInner - w), mk('R', xInner)];
}

// Canonical vanilla dimensions, in pixels (w x h x d), for the mobs these
// creatures are modelled after. Kept as data so proportions are checkable rather
// than eyeballed — a remake should land within a pixel or two of its reference.
export const MC_REF = {
  //                 head        body          limb        notes
  player:   { head: [8, 8, 8], body: [8, 12, 4], limb: [4, 12, 4], tall: 32 },
  zombie:   { head: [8, 8, 8], body: [8, 12, 4], limb: [4, 12, 4], tall: 32 },
  skeleton: { head: [8, 8, 8], body: [8, 12, 4], limb: [2, 12, 2], tall: 32 },
  cow:      { head: [8, 8, 6], body: [12, 10, 18], limb: [4, 12, 4], tall: 26 },
  pig:      { head: [8, 8, 8], body: [10, 8, 16], limb: [4, 6, 4], tall: 16 },
  sheep:    { head: [6, 6, 8], body: [8, 10, 16], limb: [4, 12, 4], tall: 26 },
  chicken:  { head: [4, 6, 3], body: [6, 8, 6], limb: [3, 5, 3], tall: 16 },
  wolf:     { head: [6, 6, 4], body: [6, 9, 12], limb: [2, 8, 2], tall: 17 },
  rabbit:   { head: [5, 4, 4], body: [4, 5, 8], limb: [2, 4, 2], tall: 9 },
  horse:    { head: [5, 8, 10], body: [10, 10, 22], limb: [4, 16, 4], tall: 34 },
  creeper:  { head: [8, 8, 8], body: [4, 12, 8], limb: [4, 6, 4], tall: 26 },
  spider:   { head: [8, 8, 8], body: [10, 8, 12], limb: [2, 2, 16], tall: 12 },
  golem:    { head: [8, 10, 8], body: [18, 12, 11], limb: [6, 16, 5], tall: 44 },
  bat:      { head: [6, 6, 6], body: [6, 12, 6], limb: [2, 2, 2], tall: 18 },
  slime:    { head: [8, 8, 8], body: [8, 8, 8], limb: [3, 2, 3], tall: 8 },
};
