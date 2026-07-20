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

// Block-light flood fill from emissive blocks (torches, lava, crystals) over
// a chunk + margin region. Propagation includes diagonal steps with true
// Euclidean costs, so pools fall off as circles rather than diamonds, while
// still respecting walls. Decay per block keeps a torch radius ~8.
const LIGHT_MARGIN = 8;
const LIGHT_DECAY = 0.115;
const LIGHT_STEPS = [];
for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dy && !dz) continue;
      LIGHT_STEPS.push([dx, dy, dz, LIGHT_DECAY * Math.hypot(dx, dy, dz)]);
    }
  }
}

function computeBlockLight(get) {
  const M = LIGHT_MARGIN;
  const EX = CHUNK + 2 * M, EZ = CHUNK + 2 * M;
  const idx = (x, y, z) => ((y * EZ) + (z + M)) * EX + (x + M);
  const light = new Float32Array(EX * WORLD_H * EZ);
  const queue = [];
  for (let y = 1; y < WORLD_H; y++) {
    for (let z = -M; z < CHUNK + M; z++) {
      for (let x = -M; x < CHUNK + M; x++) {
        const id = get(x, y, z);
        if (id === B.air) continue;
        const em = BLOCKS[id].emissive;
        if (em > 0) {
          const i = idx(x, y, z);
          light[i] = em;
          queue.push(x, y, z, em);
        }
      }
    }
  }
  // relaxation flood through non-opaque cells (re-queues on improvement)
  for (let q = 0; q < queue.length; q += 4) {
    const x = queue[q], y = queue[q + 1], z = queue[q + 2];
    const l = queue[q + 3];
    for (const [dx, dy, dz, cost] of LIGHT_STEPS) {
      const nl = l - cost;
      if (nl <= 0.05) continue;
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < -M || nx >= CHUNK + M || nz < -M || nz >= CHUNK + M || ny < 1 || ny >= WORLD_H) continue;
      const i = idx(nx, ny, nz);
      if (light[i] >= nl - 0.004) continue;
      const id = get(nx, ny, nz);
      if (id !== B.air && isOpaque(id)) continue;
      light[i] = nl;
      queue.push(nx, ny, nz, nl);
    }
  }
  return (x, y, z) => {
    if (x < -M || x >= CHUNK + M || z < -M || z >= CHUNK + M || y < 0 || y >= WORLD_H) return 0;
    return light[idx(x, y, z)];
  };
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
  const blockAt = computeBlockLight(get);
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
          addCross(cutout, def, wx, y, wz, skyAt(x, y, z), Math.max(blockAt(x, y, z), def.emissive));
          continue;
        }
        if (def.shape === 'liquid') {
          // top face only when air above; sides against air
          const em = def.emissive;
          if (get(x, y + 1, z) === B.air) {
            addLiquidTop(water, def, wx, y, wz, skyAt(x, y + 1, z), Math.max(blockAt(x, y + 1, z), em));
          }
          for (let f = 2; f < 6; f++) {
            const face = FACES[f];
            const n = get(x + face.n[0], y, z + face.n[2]);
            // side quads stop at 0.88 to meet the lowered water surface exactly
            if (n === B.air) {
              const lblk = Math.max(blockAt(x + face.n[0], y, z + face.n[2]), em);
              addFace(water, def, face, wx, y, wz, skyAt(x + face.n[0], y, z + face.n[2]),
                () => ({ ao: 0, blk: lblk }), 1, 0.88);
            }
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
          const sky = skyAt(nx, ny, nz);
          const shadeFn = (corner) => {
            const s = cornerSample(occludes, blockAt, x, y, z, face, corner);
            s.blk = Math.max(s.blk, def.emissive);
            return s;
          };
          addFace(target, def, face, wx, y, wz, sky, shadeFn, 1, isSlab ? 0.6 : 1);
        }
      }
    }
  }

  return { opaque: opaque.build(), cutout: cutout.build(), water: water.build() };
}

// Per-corner shading: ambient occlusion plus smooth block light. The block
// light for each vertex averages the (un-occluded) cells that touch that
// corner, so torch pools grade smoothly across faces instead of stepping
// block by block.
function cornerSample(occludes, blockAt, x, y, z, face, cornerIdx) {
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
  // smooth light: average the open cells around this corner
  let sum = blockAt(bx, by, bz), cnt = 1;
  if (!s1) { sum += blockAt(bx + t1[0], by + t1[1], bz + t1[2]); cnt++; }
  if (!s2) { sum += blockAt(bx + t2[0], by + t2[1], bz + t2[2]); cnt++; }
  if (!cr && !(s1 && s2)) { sum += blockAt(bx + t1[0] + t2[0], by + t1[1] + t2[1], bz + t1[2] + t2[2]); cnt++; }
  return { ao: occ * 0.16, blk: sum / cnt };
}

// Vertex light layout for terrain: (skyLight, blockLight, –). The terrain
// shader resolves final light = max(sky × daylight, block × flicker).
// shadeFn(corner) → { ao, blk } supplies per-vertex occlusion + smooth light.
function addFace(builder, def, face, x, y, z, sky, shadeFn, alpha = 1, hScale = 1) {
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
    const { ao, blk } = shadeFn(i);
    const sl = Math.max(0.08, face.b * sky * (1 - ao));
    const bl = face.b * blk * (1 - ao);
    light.push([sl, bl, sl]);
  }
  builder.quad(p, uvs, light);
}

function addLiquidTop(builder, def, x, y, z, sky, blk) {
  const uv = faceUV(def, 'top');
  const h = 0.88;
  const sl = Math.max(0.15, sky);
  const light = [[sl, blk, sl], [sl, blk, sl], [sl, blk, sl], [sl, blk, sl]];
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

function addCross(builder, def, x, y, z, sky, blk) {
  const uv = faceUV(def, 'side');
  const l = Math.max(0.12, sky * (0.9 + def.emissive));
  const bl = Math.max(blk, def.emissive);
  const light = [[l, bl, l], [l, bl, l], [l, bl, l], [l, bl, l]];
  const a = 0.15, b = 0.85;
  const quads = [
    [[x + a, y, z + a], [x + b, y, z + b], [x + b, y + 1, z + b], [x + a, y + 1, z + a]],
    [[x + a, y, z + b], [x + b, y, z + a], [x + b, y + 1, z + a], [x + a, y + 1, z + b]],
  ];
  for (const q of quads) {
    builder.quad(q, [[uv.u0, uv.v1], [uv.u1, uv.v1], [uv.u1, uv.v0], [uv.u0, uv.v0]], light);
  }
}
