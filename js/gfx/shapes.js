// Non-cube block geometry: stairs, walls, fences, gates, panes/bars and carpet.
// The mesher dispatches here for any block whose def.shape is one of these; we
// emit axis-aligned sub-boxes via the same builder.quad primitive the cube path
// uses. Textures are reused from the block's normal tiles (a stone stair shows
// the stone tile), UV-mapped to each sub-box so the material stays grid-aligned.
import { faceUV } from './textures.js';

// 6 faces as [key, normal, brightness, 4 corner bits]
const FACES = [
  ['top', [0, 1, 0], 1.0, [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]],
  ['bottom', [0, -1, 0], 0.5, [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
  ['pz', [0, 0, 1], 0.8, [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]],
  ['nz', [0, 0, -1], 0.8, [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]],
  ['px', [1, 0, 0], 0.68, [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]],
  ['nx', [-1, 0, 0], 0.68, [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]],
];
const FRONT_N = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // facing 0=+Z 1=+X 2=-Z 3=-X

// Emit one axis-aligned box [x0..x1]×[y0..y1]×[z0..z1] in block-local 0..1 space,
// offset to world (wx,y,wz). light = {sky, blk}; facing selects the front tile.
function box(b, def, wx, y, wz, x0, y0, z0, x1, y1, z1, light, facing) {
  for (const [, n, br, corners] of FACES) {
    let fstr;
    if (n[1] === 1) fstr = 'top';
    else if (n[1] === -1) fstr = 'bottom';
    else if (def.tiles.front && FRONT_N[facing] && n[0] === FRONT_N[facing][0] && n[2] === FRONT_N[facing][1]) fstr = 'front';
    else fstr = 'side';
    const uv = faceUV(def, fstr);
    const p = [], uvs = [];
    for (const c of corners) {
      const px = c[0] ? x1 : x0, py = c[1] ? y1 : y0, pz = c[2] ? z1 : z0;
      p.push([wx + px, y + py, wz + pz]);
      let uu, vv;
      if (n[1] !== 0) { uu = px; vv = pz; }
      else if (n[0] !== 0) { uu = pz; vv = 1 - py; }
      else { uu = px; vv = 1 - py; }
      uvs.push([uv.u0 + (uv.u1 - uv.u0) * uu, uv.v0 + (uv.v1 - uv.v0) * vv]);
    }
    const sl = Math.max(0.08, light.sky * br);
    const bl = Math.max(light.blk, def.emissive);
    b.quad(p, uvs, [[sl, bl, sl], [sl, bl, sl], [sl, bl, sl], [sl, bl, sl]]);
  }
}

// Which block shapes a connecting shape (wall/fence/pane) links to, on top of
// any opaque full block. Passed from the mesher as a `sides` connection mask.
export const CONNECTS = {
  wall: new Set(['wall']),
  fence: new Set(['fence', 'gate']),
  pane: new Set(['pane']),
};

// target = the mesh builder to append to. sides = {px,nx,pz,nz} booleans for
// connecting shapes. Returns nothing; pushes quads.
export function emitShape(target, def, wx, y, wz, light, facing, sides) {
  switch (def.shape) {
    case 'slab':
      box(target, def, wx, y, wz, 0, 0, 0, 1, 0.5, 1, light, facing);
      break;

    case 'carpet':
      box(target, def, wx, y, wz, 0, 0, 0, 1, 1 / 16, 1, light, facing);
      break;

    case 'stairs': {
      box(target, def, wx, y, wz, 0, 0, 0, 1, 0.5, 1, light, facing); // full lower slab
      // upper step fills the half AWAY from the facing (low edge faces `facing`)
      const [fx, fz] = FRONT_N[facing];
      let x0 = 0, z0 = 0, x1 = 1, z1 = 1;
      if (fx === 1) x1 = 0.5; else if (fx === -1) x0 = 0.5;
      else if (fz === 1) z1 = 0.5; else if (fz === -1) z0 = 0.5;
      box(target, def, wx, y, wz, x0, 0.5, z0, x1, 1, z1, light, facing);
      break;
    }

    case 'wall': {
      box(target, def, wx, y, wz, 0.25, 0, 0.25, 0.75, 1, 0.75, light, facing); // post
      const a0 = 0.3125, a1 = 0.6875, h = 0.8125;
      if (sides.px) box(target, def, wx, y, wz, 0.75, 0, a0, 1, h, a1, light, facing);
      if (sides.nx) box(target, def, wx, y, wz, 0, 0, a0, 0.25, h, a1, light, facing);
      if (sides.pz) box(target, def, wx, y, wz, a0, 0, 0.75, a1, h, 1, light, facing);
      if (sides.nz) box(target, def, wx, y, wz, a0, 0, 0, a1, h, 0.25, light, facing);
      break;
    }

    case 'fence': {
      box(target, def, wx, y, wz, 0.375, 0, 0.375, 0.625, 1, 0.625, light, facing); // post
      const b0 = 0.4375, b1 = 0.5625; // rail thickness
      const rail = (x0, z0, x1, z1) => {
        box(target, def, wx, y, wz, x0, 0.375, z0, x1, 0.5625, z1, light, facing);
        box(target, def, wx, y, wz, x0, 0.75, z0, x1, 0.9375, z1, light, facing);
      };
      if (sides.px) rail(0.625, b0, 1, b1);
      if (sides.nx) rail(0, b0, 0.375, b1);
      if (sides.pz) rail(b0, 0.625, b1, 1);
      if (sides.nz) rail(b0, 0, b1, 0.375);
      break;
    }

    case 'gate': {
      // a closed gate: two jamb posts + two rails spanning the axis across `facing`
      const [fx] = FRONT_N[facing];
      const across = fx !== 0; // front points along X → gate bars run along Z
      const t0 = 0.4375, t1 = 0.5625;
      if (across) {
        box(target, def, wx, y, wz, t0, 0, 0, t1, 1, 0.125, light, facing);
        box(target, def, wx, y, wz, t0, 0, 0.875, t1, 1, 1, light, facing);
        box(target, def, wx, y, wz, t0, 0.375, 0.125, t1, 0.5625, 0.875, light, facing);
        box(target, def, wx, y, wz, t0, 0.75, 0.125, t1, 0.9375, 0.875, light, facing);
      } else {
        box(target, def, wx, y, wz, 0, 0, t0, 0.125, 1, t1, light, facing);
        box(target, def, wx, y, wz, 0.875, 0, t0, 1, 1, t1, light, facing);
        box(target, def, wx, y, wz, 0.125, 0.375, t0, 0.875, 0.5625, t1, light, facing);
        box(target, def, wx, y, wz, 0.125, 0.75, t0, 0.875, 0.9375, t1, light, facing);
      }
      break;
    }

    case 'pane': {
      const c0 = 0.4375, c1 = 0.5625;
      const any = sides.px || sides.nx || sides.pz || sides.nz;
      // isolated pane shows a small central post; connected panes are flat panels
      if (!any) box(target, def, wx, y, wz, c0, 0, c0, c1, 1, c1, light, facing);
      if (sides.px) box(target, def, wx, y, wz, 0.5, 0, c0, 1, 1, c1, light, facing);
      if (sides.nx) box(target, def, wx, y, wz, 0, 0, c0, 0.5, 1, c1, light, facing);
      if (sides.pz) box(target, def, wx, y, wz, c0, 0, 0.5, c1, 1, 1, light, facing);
      if (sides.nz) box(target, def, wx, y, wz, c0, 0, 0, c1, 1, 0.5, light, facing);
      break;
    }

    default:
      box(target, def, wx, y, wz, 0, 0, 0, 1, 1, 1, light, facing); // safety: full cube
  }
}
