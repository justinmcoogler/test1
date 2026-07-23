// Places a converted Minecraft schematic into the live world. The conversion is
// done offline by tools/import-schematic.mjs, which emits
//   { name, size:{w,h,l}, cells:[{x,y,z,block}] }
// with every cell already mapped to one of our block names (air dropped). This
// loader just stamps those cells relative to an origin, clamped to the world.
import { B } from './blocks.js';
import { WORLD_H } from './worldgen.js';

// Paste `data` so its (0,0,0) corner lands at world (ox,oy,oz).
// opts.record (default true) routes through the player-edit log so it saves and
// survives chunk reload; opts.overwrite (default true) lets it replace existing
// blocks — set false to only fill air. Returns { placed, skipped, missing:[…] }.
export function pasteSchematic(world, data, ox, oy, oz, opts = {}) {
  const record = opts.record !== false;
  const overwrite = opts.overwrite !== false;
  let placed = 0, skipped = 0;
  const missing = new Set();
  for (const cell of data.cells) {
    const id = B[cell.block];
    if (id === undefined) { missing.add(cell.block); skipped++; continue; }
    const wx = ox + cell.x, wy = oy + cell.y, wz = oz + cell.z;
    if (wy < 0 || wy >= WORLD_H) { skipped++; continue; }
    if (!overwrite && world.getBlock(wx, wy, wz) !== B.air) { skipped++; continue; }
    world.setBlock(wx, wy, wz, id, record);
    placed++;
  }
  return { placed, skipped, missing: [...missing] };
}

// Fetch a converted schematic JSON (produced by the import tool) and paste it.
// Path is resolved relative to the page; keeps the network detail out of callers.
export async function loadAndPaste(world, url, ox, oy, oz, opts) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`schematic fetch failed: ${res.status} ${url}`);
  const data = await res.json();
  return pasteSchematic(world, data, ox, oy, oz, opts);
}
