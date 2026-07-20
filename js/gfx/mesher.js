// Chunk meshing: culled faces + vertex ambient occlusion + cheap sky light.
// Produces three passes: opaque, cutout (leaves/plants), water.
import { B, BLOCKS, isOpaque } from '../world/blocks.js';
import { CHUNK, WORLD_H } from '../world/worldgen.js';
import { faceUV } from './textures.js';

// face: [nx,ny,nz, corners(4× [x,y,z] in block space), brightness]
const FACES = [
  { n: [0, 1, 0], b: 1.0, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },   // top
  { n: [0, -1, 0], b: 0.5, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },  // bottom
  { n: [0, 0, 1], b: 0.8, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },   // south +z
  { n: [0, 0, -1], b: 0.8, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },  // north -z
  { n: [1, 0, 0], b: 0.68, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },  // east +x
  { n: [-1, 0, 0], b: 0.68, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] }, // west -x
];

class MeshBuilder {
  constructor() { this.verts = []; this.indices = []; this.vcount = 0; }
  quad(p, uv, light) {
    // p: 4×[x,y,z], uv: 4×[u,v], light: 4×[r,g,b]
    for (let i = 0; i < 4; i++) {
      this.verts.push(p[i][0], p[i][1], p[i][2], uv[i][0], uv[i][1], light[i][0], light[i][1], light[i][2]);
    }
    const v = this.vcount;
    // flip quad split when AO differs strongly to avoid seams
    const a0 = light[0][0] + light[2][0], a1 = light[1][0] + light[3][0];
    if (a0 >= a1) this.indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    else this.indices.push(v + 1, v + 2, v + 3, v + 1, v + 3, v);
    this.vcount += 4;
  }
  build() {
    return this.vcount === 0 ? null : {
      verts: new Float32Array(this.verts),
      indices: new Uint32Array(this.indices),
    };
  }
}

export function meshChunk(world, cx, cz) {
  const opaque = new MeshBuilder();
  const cutout = new MeshBuilder();
  const water = new MeshBuilder();
  const ox = cx * CHUNK, oz = cz * CHUNK;

  const get = (x, y, z) => world.getBlock(ox + x, y, oz + z);

  // column-top cache for sky light (includes neighbor ring)
  const colTop = new Int16Array((CHUNK + 2) * (CHUNK + 2));
  for (let z = -1; z <= CHUNK; z++) {
    for (let x = -1; x <= CHUNK; x++) {
      let top = 0;
      for (let y = WORLD_H - 1; y >= 0; y--) {
        const id = get(x, y, z);
        if (id !== B.air && isOpaque(id)) { top = y; break; }
      }
      colTop[(z + 1) * (CHUNK + 2) + (x + 1)] = top;
    }
  }
  const skyAt = (x, y, z) => {
    const cxx = Math.min(CHUNK, Math.max(-1, x)), czz = Math.min(CHUNK, Math.max(-1, z));
    const top = colTop[(czz + 1) * (CHUNK + 2) + (cxx + 1)];
    if (y >= top) return 1;
    return Math.max(0.42, 1 - (top - y) * 0.1);
  };
  const occludes = (x, y, z) => {
    const id = get(x, y, z);
    return id !== B.air && isOpaque(id);
  };

  for (let y = 0; y < WORLD_H; y++) {
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const id = get(x, y, z);
        if (id === B.air) continue;
        const def = BLOCKS[id];
        const wx = ox + x, wz = oz + z; // world-space position for geometry

        if (def.shape === 'cross') {
          addCross(cutout, def, wx, y, wz, skyAt(x, y, z));
          continue;
        }
        if (def.shape === 'liquid') {
          // top face only when air above; sides against air
          const em = def.emissive;
          if (get(x, y + 1, z) === B.air) {
            addLiquidTop(water, def, wx, y, wz, Math.max(skyAt(x, y + 1, z), em));
          }
          for (let f = 2; f < 6; f++) {
            const face = FACES[f];
            const n = get(x + face.n[0], y, z + face.n[2]);
            if (n === B.air) addFace(water, def, face, wx, y, wz, Math.max(skyAt(x + face.n[0], y, z + face.n[2]), em), () => 0, 0.9);
          }
          continue;
        }

        const isSlab = def.shape === 'slab';
        const target = def.opaque ? opaque : cutout;
        for (const face of FACES) {
          const nx = x + face.n[0], ny = y + face.n[1], nz = z + face.n[2];
          const nid = get(nx, ny, nz);
          if (!isSlab || face.n[1] !== 1) {
            if (isOpaque(nid)) continue;                    // hidden by opaque neighbor
            if (!def.opaque && nid === id) continue;        // skip same-type transparent faces
          }
          const sky = Math.max(skyAt(nx, ny, nz), def.emissive);
          const aoFn = (corner) => vertexAO(occludes, x, y, z, face, corner);
          addFace(target, def, face, wx, y, wz, sky, aoFn, 1, isSlab ? 0.6 : 1);
        }
      }
    }
  }

  return { opaque: opaque.build(), cutout: cutout.build(), water: water.build() };
}

function vertexAO(occludes, x, y, z, face, cornerIdx) {
  // Corner position in face space → the three neighbor cells that occlude it.
  const c = face.c[cornerIdx];
  const n = face.n;
  // cell the face is exposed to:
  const bx = x + n[0], by = y + n[1], bz = z + n[2];
  // tangent directions for this corner
  let t1, t2;
  if (n[1] !== 0) { t1 = [c[0] === 1 ? 1 : -1, 0, 0]; t2 = [0, 0, c[2] === 1 ? 1 : -1]; }
  else if (n[0] !== 0) { t1 = [0, c[1] === 1 ? 1 : -1, 0]; t2 = [0, 0, c[2] === 1 ? 1 : -1]; }
  else { t1 = [c[0] === 1 ? 1 : -1, 0, 0]; t2 = [0, c[1] === 1 ? 1 : -1, 0]; }
  const s1 = occludes(bx + t1[0], by + t1[1], bz + t1[2]) ? 1 : 0;
  const s2 = occludes(bx + t2[0], by + t2[1], bz + t2[2]) ? 1 : 0;
  const cr = occludes(bx + t1[0] + t2[0], by + t1[1] + t2[1], bz + t1[2] + t2[2]) ? 1 : 0;
  const occ = s1 && s2 ? 3 : s1 + s2 + cr;
  return occ * 0.16;
}

function addFace(builder, def, face, x, y, z, sky, aoFn, alpha = 1, hScale = 1) {
  const uv = faceUV(def, face.n[1] === 1 ? 'top' : face.n[1] === -1 ? 'bottom' : 'side');
  const p = [];
  const uvs = [];
  const light = [];
  for (let i = 0; i < 4; i++) {
    const c = face.c[i];
    const cy = c[1] * hScale;
    p.push([x + c[0], y + cy, z + c[2]]);
    const u = c[0] || (face.n[0] !== 0 ? c[2] : 0);
    // map uv per-face
    let uu, vv;
    if (face.n[1] !== 0) { uu = c[0]; vv = c[2]; }
    else if (face.n[0] !== 0) { uu = c[2]; vv = 1 - cy; }
    else { uu = c[0]; vv = 1 - cy; }
    uvs.push([uv.u0 + (uv.u1 - uv.u0) * uu, uv.v0 + (uv.v1 - uv.v0) * vv]);
    const ao = aoFn(i);
    const l = Math.max(0.08, face.b * sky * (1 - ao));
    light.push([l, l, l]);
  }
  builder.quad(p, uvs, light);
}

function addLiquidTop(builder, def, x, y, z, sky) {
  const uv = faceUV(def, 'top');
  const h = 0.88;
  const l = Math.max(0.15, sky);
  const light = [[l, l, l], [l, l, l], [l, l, l], [l, l, l]];
  builder.quad(
    [[x, y + h, z + 1], [x + 1, y + h, z + 1], [x + 1, y + h, z], [x, y + h, z]],
    [[uv.u0, uv.v1], [uv.u1, uv.v1], [uv.u1, uv.v0], [uv.u0, uv.v0]],
    light
  );
  // underside so it's visible while swimming
  builder.quad(
    [[x, y + h, z], [x + 1, y + h, z], [x + 1, y + h, z + 1], [x, y + h, z + 1]],
    [[uv.u0, uv.v0], [uv.u1, uv.v0], [uv.u1, uv.v1], [uv.u0, uv.v1]],
    light
  );
}

function addCross(builder, def, x, y, z, sky) {
  const uv = faceUV(def, 'side');
  const l = Math.max(0.12, sky * (0.9 + def.emissive));
  const light = [[l, l, l], [l, l, l], [l, l, l], [l, l, l]];
  const a = 0.15, b = 0.85;
  const quads = [
    [[x + a, y, z + a], [x + b, y, z + b], [x + b, y + 1, z + b], [x + a, y + 1, z + a]],
    [[x + a, y, z + b], [x + b, y, z + a], [x + b, y + 1, z + a], [x + a, y + 1, z + b]],
  ];
  for (const q of quads) {
    builder.quad(q, [[uv.u0, uv.v1], [uv.u1, uv.v1], [uv.u1, uv.v0], [uv.u0, uv.v0]], light);
  }
}
