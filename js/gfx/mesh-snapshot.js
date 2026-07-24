// Chunk-mesh snapshot: a transferable, DOM-free view of the 3×3 chunk
// neighbourhood the mesher needs, so meshChunk() can run in a Web Worker off the
// main thread. buildSnapshot() (main thread) copies the low slice of each of the
// nine neighbour block arrays up to the shared bandTop and packs the sparse
// facings in range; SnapshotView (worker) re-exposes getBlock/getChunk/facingAt
// over that snapshot, matching the live world's contract exactly.
import { CHUNK, WORLD_H } from '../world/worldgen.js';
import { B } from '../world/blocks.js';

const lidx = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;

// Build a transferable snapshot for chunk (cx,cz). Returns { snapshot, transfer }
// where `transfer` is the list of ArrayBuffers to hand to postMessage (zero-copy).
export function buildSnapshot(world, cx, cz) {
  const tops = new Int32Array(9);
  let bandTop = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nc = world.getChunk(cx + dx, cz + dz);
      const t = nc ? Math.min(WORLD_H, nc.contentTop ?? WORLD_H) : 0;
      tops[(dz + 1) * 3 + (dx + 1)] = t;
      if (t > bandTop) bandTop = t;
    }
  }
  bandTop = Math.min(WORLD_H, bandTop + 1);
  const sliceLen = bandTop * CHUNK * CHUNK; // blocks are y-major: [0..bandTop) is a prefix
  const blocks = new Array(9).fill(null);
  const transfer = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nc = world.getChunk(cx + dx, cz + dz);
      if (!nc || !nc.blocks) continue;
      // copy (not subarray) so the world keeps its live array; transfer the copy
      const slice = new Uint16Array(nc.blocks.subarray(0, sliceLen));
      blocks[(dz + 1) * 3 + (dx + 1)] = slice;
      transfer.push(slice.buffer);
    }
  }
  // sparse facings (stairs/doors/trapdoors/directional) that fall in the region
  const facing = {};
  const minX = (cx - 1) * CHUNK, maxX = (cx + 2) * CHUNK;
  const minZ = (cz - 1) * CHUNK, maxZ = (cz + 2) * CHUNK;
  for (const [k, f] of world.blockFacing) {
    if (!f) continue;
    const i = k.indexOf(','), j = k.indexOf(',', i + 1);
    const fx = +k.slice(0, i), fz = +k.slice(j + 1);
    if (fx >= minX && fx < maxX && fz >= minZ && fz < maxZ) facing[k] = f;
  }
  return { snapshot: { cx, cz, bandTop, tops, blocks, facing }, transfer };
}

// Worker-side read view over a snapshot. Implements exactly the three methods
// meshChunk() calls on `world`: getBlock, getChunk (contentTop only), facingAt.
export class SnapshotView {
  constructor(s) { this.s = s; }
  getBlock(x, y, z) {
    const s = this.s;
    if (y < 0 || y >= s.bandTop) return B.air;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const dx = cx - s.cx, dz = cz - s.cz;
    if (dx < -1 || dx > 1 || dz < -1 || dz > 1) return B.air;
    const arr = s.blocks[(dz + 1) * 3 + (dx + 1)];
    if (!arr) return B.air;
    return arr[lidx(x - cx * CHUNK, y, z - cz * CHUNK)];
  }
  getChunk(cx, cz) {
    const dx = cx - this.s.cx, dz = cz - this.s.cz;
    if (dx < -1 || dx > 1 || dz < -1 || dz > 1) return null;
    return { contentTop: this.s.tops[(dz + 1) * 3 + (dx + 1)] };
  }
  facingAt(x, y, z) { return this.s.facing[`${x},${y},${z}`] ?? 0; }
}
