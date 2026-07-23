// Streams the imported circular town (js/world/town-data.js, a gzip'd Uint16
// grid) into worldgen. The grid inflates once at load (async), then each town
// chunk stamps its columns from it. Block id lives in bits 0-11, facing 12-14.
import { TOWN } from './town-data.js';
import { TOWN_PAD } from './worldgen.js';

// grid (gx,gz) → world (wx,wz): schem crop centre (cx,cz) sits at TOWN_PAD.
const OX = (TOWN.minX - TOWN.cx) + TOWN_PAD.x;
const OZ = (TOWN.minZ - TOWN.cz) + TOWN_PAD.z;
export const TOWN_BASE = TOWN_PAD.ground + 1;      // world y of grid layer 0
export const TOWN_CENTER = { x: TOWN_PAD.x, z: TOWN_PAD.z, R: TOWN_PAD.R };

let GRID = null;
export function townReady() { return !!GRID; }

// Inflate the gzip'd grid once. Browsers: DecompressionStream('gzip').
export async function loadTown() {
  if (GRID) return true;
  try {
    const bin = Uint8Array.from(atob(TOWN.gzB64), (c) => c.charCodeAt(0));
    const ab = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    GRID = new Uint16Array(ab);
  } catch (e) {
    console.warn('[town] inflate failed — town will not appear', e);
    GRID = new Uint16Array(0);
  }
  return true;
}

export function inTown(wx, wz) {
  const dx = wx - TOWN_PAD.x, dz = wz - TOWN_PAD.z;
  return dx * dx + dz * dz <= TOWN_PAD.R * TOWN_PAD.R;
}

// Stamp every town cell for world column (wx,wz) into the chunk. setLocal(lx,y,
// lz,id) writes a block; setFacing(wx,wy,wz,f) records an orientation. Returns
// the highest world y written (or -1 if this column isn't in the town).
export function stampTownColumn(wx, wz, lx, lz, setLocal, setFacing) {
  if (!GRID || GRID.length === 0 || !inTown(wx, wz)) return -1;
  const gx = wx - OX, gz = wz - OZ;
  if (gx < 0 || gz < 0 || gx >= TOWN.gw || gz >= TOWN.gl) return -1;
  let top = -1;
  const colBase = gz * TOWN.gw + gx;
  for (let gy = 0; gy < TOWN.gh; gy++) {
    const packed = GRID[gy * TOWN.gl * TOWN.gw + colBase];
    if (packed) {
      const id = packed & 0x0fff, f = (packed >> 12) & 7;
      const wy = TOWN_BASE + gy;
      setLocal(lx, wy, lz, id);
      if (f && setFacing) setFacing(wx, wy, wz, f);
      top = wy;
    }
  }
  return top;
}

// Highest solid world-y at the town's centre column — used to seat the player
// and NPCs on the central plaza. Falls back to TOWN_BASE if the grid isn't in.
export function townSurfaceAt(wx, wz) {
  if (!GRID || GRID.length === 0) return TOWN_BASE;
  const gx = wx - OX, gz = wz - OZ;
  if (gx < 0 || gz < 0 || gx >= TOWN.gw || gz >= TOWN.gl) return TOWN_BASE;
  const colBase = gz * TOWN.gw + gx;
  for (let gy = TOWN.gh - 1; gy >= 0; gy--) if (GRID[gy * TOWN.gl * TOWN.gw + colBase]) return TOWN_BASE + gy;
  return TOWN_BASE;
}
