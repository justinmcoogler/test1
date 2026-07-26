// Find blocks that nothing holds up.
//
//   node tools/audit-floating.mjs [radius] [seed]
//
// A block hanging in mid-air is the one class of world bug that survives every
// other check we have. It breaks no test, throws no error, and costs no frames —
// it just looks wrong, and it looks wrong from the exact spot the player is
// standing when they first open their eyes. Two of them shipped: a lean-to that
// was one stair block suspended over a workbench, and a branch tip on every
// broadleaf in the world, because the limb stepped out AND up in a single move
// and a voxel joined only at a corner touches nothing at all.
//
// THE RULE. A block is supported if something solid is directly beneath it, or
// if it is face-adjacent to a supported block. Iterate to a fixpoint, seeded
// from the bottom of the scan volume. That is deliberately stricter than "does
// it look attached": a 45° roof staircase is diagonal all the way up and only
// counts as supported because its ends land on a gable, which is exactly the
// property that makes it a roof rather than a row of floating blocks.
//
// WHAT IS ALLOWED TO HANG. Foliage, which grows off a trunk it does not touch,
// and water. Matched on the WHOLE block name, never a substring — the first
// version of this script filtered on `name.includes('air')` to skip air, and
// 'stairs' contains 'air', so it silently excused every stair in the world and
// reported the spawn clean while a stair hung over the workbench.
import { World, initSlabSet } from '../js/world/world.js';
import { BLOCKS, B } from '../js/world/blocks.js';
import { buildStarterStructures } from '../js/world/structures.js';

const CHUNK = 16;

// Foliage hangs off a trunk by design, and water is not structure.
export const mayHang = (def) => !def || def.shape === 'leaves' || def.name === 'water'
  || def.name.endsWith('_leaves') || def.name === 'snow_layer' || def.name === 'vine';

// Every block in the box that nothing holds up, nearest to (ox, oz) first.
export function floatingBlocks(world, { ox = 0, oz = 0, radius = 48, y0 = 40, y1 = 110 } = {}) {
  const key = (x, y, z) => `${x},${y},${z}`;
  const cells = new Map();
  for (let x = ox - radius; x <= ox + radius; x++) {
    for (let z = oz - radius; z <= oz + radius; z++) {
      for (let y = y0; y < y1; y++) {
        const id = world.getBlock(x, y, z);
        if (id && id !== B.air) cells.set(key(x, y, z), { x, y, z, id });
      }
    }
  }

  const supported = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, c] of cells) {
      if (supported.has(k)) continue;
      let ok = false;
      const below = world.getBlock(c.x, c.y - 1, c.z);
      if (below && below !== B.air) {
        const bk = key(c.x, c.y - 1, c.z);
        ok = !cells.has(bk) || supported.has(bk);   // outside the box ⇒ assume ground
      }
      if (!ok) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = world.getBlock(c.x + dx, c.y, c.z + dz);
          if (!n || n === B.air) continue;
          const nk = key(c.x + dx, c.y, c.z + dz);
          if (!cells.has(nk) || supported.has(nk)) { ok = true; break; }
        }
      }
      if (ok) { supported.add(k); changed = true; }
    }
  }

  return [...cells.values()]
    .filter((c) => !supported.has(key(c.x, c.y, c.z)) && !mayHang(BLOCKS[c.id]))
    .sort((a, b) => Math.hypot(a.x - ox, a.z - oz) - Math.hypot(b.x - ox, b.z - oz));
}

// A world generated wide enough that the scan box is never reading empty air
// past the edge of what was loaded — an unloaded chunk reads as air, and air
// under a block is exactly what this script is looking for.
export function loadedWorld(seed, radius, ox = 0, oz = 0) {
  initSlabSet();
  const w = new World(seed);
  const pad = Math.ceil((radius + CHUNK) / CHUNK);
  const cx0 = Math.floor((ox - radius) / CHUNK), cz0 = Math.floor((oz - radius) / CHUNK);
  for (let cx = cx0 - 1; cx <= cx0 + pad * 2; cx++) {
    for (let cz = cz0 - 1; cz <= cz0 + pad * 2; cz++) w.ensureChunk(cx, cz);
  }
  return w;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const radius = Number(process.argv[2] || 48);
  const seed = Number(process.argv[3] || 20260725);
  const [ox, , oz] = buildStarterStructures().markers.spawn;
  const world = loadedWorld(seed, radius, ox, oz);
  const float = floatingBlocks(world, { ox, oz, radius });

  console.log(`spawn ${ox},${oz}   radius ${radius}   seed ${seed}`);
  if (!float.length) {
    console.log('\n✅ NOTHING FLOATING — every block near spawn is held up by something.');
    process.exit(0);
  }
  const byName = new Map();
  for (const c of float) byName.set(BLOCKS[c.id].name, (byName.get(BLOCKS[c.id].name) || 0) + 1);
  console.log(`\n❌ ${float.length} FLOATING BLOCKS`);
  for (const [n, k] of [...byName].sort((a, b) => b[1] - a[1])) console.log(`   ${String(k).padStart(4)} × ${n}`);
  console.log('\n   nearest first:');
  for (const c of float.slice(0, 40)) {
    console.log(`     ${BLOCKS[c.id].name.padEnd(20)} at ${c.x},${c.y},${c.z}   (${Math.hypot(c.x - ox, c.z - oz).toFixed(1)} from spawn)`);
  }
  process.exit(1);
}
