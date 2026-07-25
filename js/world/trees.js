// The shape of every tree in the world: one parameterised builder plus the
// species table that drives it.
//
// A species is nothing but (canopy shape, lean, branch count, log + leaf block);
// trunk height arrives per tree from the caller, because two firs of the same
// species are different heights. Adding a species is adding a row here, not a
// new branch of geometry — which is exactly what the old per-type canopy code
// could not do: every new silhouette meant another `else if` in the middle of a
// 50-line function, so the roster froze at four shapes.
//
// This module is the ONLY source of tree geometry: `nodeBlocks` in
// js/game/nodes.js delegates its `kind === 'tree'` branch straight to
// buildTree. Trunk height is the one thing it still owns, because it scales off
// the wood's tier in the material spine — which is why it arrives as an
// argument rather than a field here.
import { B } from './blocks.js';
import { hash3 } from '../core/rng.js';

// Canopy/branch envelope, in columns either side of the trunk foot. js/world/
// world.js only ever roots a tree 2 columns in from a chunk edge, so a cell
// outside this box would land in a neighbour chunk that may not be generated —
// where the write is silently dropped and the tree comes out half-built.
const R = 2;

// Widest a canopy reaches from its own centre. R and CROWN_R are equal, which
// is the whole reason `lean` cannot carry the crown with it: a crown centred one
// column downwind would need R+1 to stay whole. So the trunk leans and the crown
// stays over the foot — which is what a real leaning tree does anyway, since it
// grows back toward the light. Before this was clamped, tall leaning species
// (yew, teak, ebony, lignum vitae) lost 5–8% of their cells off the lee side and
// came out visibly lopsided.
const CROWN_R = 2;
const clampEnv = (v, origin, reach) => Math.max(origin - (R - reach), Math.min(origin + (R - reach), v));

// Deterministic, SEED-FREE per-cell jitter. A tree's silhouette has to be
// identical on every world at the same coordinates: nodeBlocks re-derives a
// tree's blocks from its position alone every time a chunk reloads or a felled
// trunk regrows, and it has no WorldGen in hand to ask for a seeded stream.
const SHAPE_SALT = 0x5eed1e;
const jitter = (x, y, z) => hash3(SHAPE_SALT, x, y, z);

// The four compass headings, for lean and for branch sides.
const HEADINGS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// ---- Canopies --------------------------------------------------------------
// Each writes leaves around a crown centre (cx, top, cz) — the top of the trunk
// AFTER any lean, so a leaning tree's crown leans with it. `t` carries the
// builder's scratch: the centre, the trunk foot, the crown size and the
// envelope-guarded writers.
const CANOPIES = {
  // Broadleaf — a squashed sphere sitting just above the trunk top.
  round(t) {
    for (let dx = -R; dx <= R; dx++) for (let dy = -1; dy <= 2; dy++) for (let dz = -R; dz <= R; dz++) {
      if (dx * dx + dy * dy * 1.3 + dz * dz > t.crown) continue;
      if (t.cx + dx === t.tx && t.cz + dz === t.tz && dy <= 0) continue; // trunk stays visible
      if (jitter(t.cx + dx, t.top + dy, t.cz + dz) > 0.90) continue;    // slight raggedness
      t.leaf(t.cx + dx, t.top + dy, t.cz + dz);
    }
  },

  // Conifer — stacked rings from partway up the trunk, tapering to a point, with
  // the lowest branch tips drooping clear of the skirt.
  conical(t) {
    const baseY = t.y + Math.max(2, Math.floor(t.h * 0.38));
    const tipY = t.top + 2;
    for (let yy = baseY; yy <= tipY; yy++) {
      const f = (yy - baseY) / Math.max(1, tipY - baseY);
      const rad = yy >= tipY ? 0 : (f < 0.45 ? 2 : 1);
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (dx * dx + dz * dz > rad * rad + 0.5) continue;
        if (t.cx + dx === t.tx && t.cz + dz === t.tz && yy <= t.top) continue;
        if (rad === 2 && jitter(t.cx + dx, yy, t.cz + dz) > 0.82) continue;
        t.leaf(t.cx + dx, yy, t.cz + dz);
      }
    }
    for (const [ox, oz] of HEADINGS) t.leaf(t.cx + ox * R, baseY, t.cz + oz * R);
  },

  // Tropical — a high, wide, flattish umbrella crown over low fronds.
  spreading(t) {
    for (let dy = 0; dy <= 1; dy++) {
      const rad = dy === 0 ? 2 : 1;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (dx * dx + dz * dz > rad * rad + 0.4) continue;
        if (rad === 2 && jitter(t.cx + dx, t.top + dy, t.cz + dz) > 0.76) continue;
        t.leaf(t.cx + dx, t.top + 1 + dy, t.cz + dz);
      }
    }
    for (const [ox, oz] of HEADINGS) t.leaf(t.cx + ox * R, t.top, t.cz + oz * R);
  },

  // Weeping — a narrow crown whose outer columns trail down past it. The strands
  // are what read as "weeping"; without them this is just a slim round tree.
  weeping(t) {
    for (let dy = -1; dy <= 2; dy++) {
      const rad = (dy === -1 || dy === 2) ? 1 : R;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (dx * dx + dz * dz > rad * rad + 0.5) continue;
        if (t.cx + dx === t.tx && t.cz + dz === t.tz && dy <= 0) continue;
        if (jitter(t.cx + dx, t.top + dy, t.cz + dz) > 0.88) continue;
        t.leaf(t.cx + dx, t.top + dy, t.cz + dz);
      }
    }
    t.leaf(t.cx, t.top + 3, t.cz);                                      // slim top tuft
    for (const [ox, oz] of HEADINGS) {
      const drop = 2 + Math.floor(jitter(t.cx + ox, t.top, t.cz + oz) * 3);
      for (let i = 1; i <= drop; i++) t.leaf(t.cx + ox * R, t.top - i, t.cz + oz * R);
    }
  },
};

// Build one tree of `sp` rooted at (x, y, z) with `h` trunk blocks, handing every
// cell to `emit(x, y, z, blockId)` in place — the caller decides whether that is
// a push into a node's block list or a direct chunk write, and the builder
// allocates nothing either way.
export function buildTree(sp, x, y, z, h, emit) {
  const logId = B[sp.log], leafId = B[sp.leaves];
  const cell = (bx, by, bz, id) => {
    if (bx < x - R || bx > x + R || bz < z - R || bz > z + R || by < y) return; // see R
    emit(bx, by, bz, id);
  };
  const leaf = (bx, by, bz) => cell(bx, by, bz, leafId);
  const log = (bx, by, bz) => cell(bx, by, bz, logId);

  // Lean drifts the trunk along ONE heading picked from the column, so a stand
  // of trees leans every which way instead of all one way like a felled row.
  const head = Math.floor(jitter(x, 5, z) * 4);
  const [hx, hz] = HEADINGS[head];
  const offX = (i) => x + Math.round(hx * sp.lean * i);
  const offZ = (i) => z + Math.round(hz * sp.lean * i);

  for (let i = 0; i < h; i++) log(offX(i), y + i, offZ(i));
  // The trunk top and the crown centre are NOT the same column on a leaning
  // tree: the crown is pulled back inside the envelope, the trunk is not. The
  // canopies need both — the centre to build around, the trunk top to leave a
  // hole for, so the trunk still shows through its own crown.
  const top = y + h - 1, tx = offX(h - 1), tz = offZ(h - 1);
  const cx = clampEnv(tx, x, CROWN_R), cz = clampEnv(tz, z, CROWN_R);

  // Branch stubs climb the trunk on rotating sides. The lowest one sits at the
  // foot, where a ring of them reads as the flared root buttress of a big
  // broadleaf — so "branchy" and "buttressed" stay a single knob.
  for (let b = 0; b < sp.branches; b++) {
    const f = sp.branches === 1 ? 0.55 : b / (sp.branches - 1);
    const i = Math.round(f * (h - 2));
    const [ox, oz] = HEADINGS[(b + head) & 3];
    // Clamped, not dropped: a limb that would reach past the envelope is worth
    // more shortened by a column than deleted, which is what the raw guard did.
    log(clampEnv(offX(i) + ox, x, 0), y + i, clampEnv(offZ(i) + oz, z, 0));
    if (f > 0.4) log(clampEnv(offX(i) + ox * 2, x, 0), y + i + 1, clampEnv(offZ(i) + oz * 2, z, 0));
  }

  // Crown size grows with the trunk, so the same species reads as a sapling at
  // its short end and a full tree at its tall one.
  const crown = 4.4 + jitter(x, 7, z) * 0.9 + (h >= 8 ? 0.8 : 0);
  CANOPIES[sp.canopy]({ x, y, z, h, top, cx, cz, tx, tz, crown, leaf, log });
}

// ---- Species ---------------------------------------------------------------
// One row per wood in the material spine (js/game/materials.js), tiered by the
// difficulty ring it belongs to. Ring 0 species are short, branchless and quick
// to fell; ring 3 species are tall, leaning and branched, so walking out is what
// changes what a woodcutter is looking at.
//
// `node` is the NODE_TYPES key the tree is placed as — the economy of a tree
// (level, xp, charges, respawn, drops) lives there, its shape lives here.
export const TREE_SPECIES = {
  // ring 0 — the starting bowl: small, plain, felled in a few swings
  pine: { node: 'tree_pine', ring: 0, log: 'pine_log', leaves: 'pine_leaves', canopy: 'conical', lean: 0, branches: 0 },
  birch: { node: 'tree_birch', ring: 0, log: 'birch_log', leaves: 'birch_leaves', canopy: 'weeping', lean: 0.05, branches: 0 },
  // ring 1 — the first forests worth a trip
  cedar: { node: 'tree_cedar', ring: 1, log: 'cedar_log', leaves: 'cedar_leaves', canopy: 'conical', lean: 0, branches: 1 },
  oak: { node: 'tree_oak', ring: 1, log: 'oak_log', leaves: 'oak_leaves', canopy: 'round', lean: 0.04, branches: 3 },
  ash: { node: 'tree_ash', ring: 1, log: 'ash_log', leaves: 'ash_leaves', canopy: 'round', lean: 0.05, branches: 2 },
  // ring 2 — hardwoods, tall enough to be a job
  hickory: { node: 'tree_hickory', ring: 2, log: 'hickory_log', leaves: 'hickory_leaves', canopy: 'round', lean: 0.05, branches: 3 },
  maple: { node: 'tree_maple', ring: 2, log: 'maple_log', leaves: 'maple_leaves', canopy: 'round', lean: 0.06, branches: 2 },
  walnut: { node: 'tree_walnut', ring: 2, log: 'walnut_log', leaves: 'walnut_leaves', canopy: 'round', lean: 0.05, branches: 3 },
  // ring 3 — the far woods: tall, heavy-limbed, slow to bring down
  yew: { node: 'tree_yew', ring: 3, log: 'yew_log', leaves: 'yew_leaves', canopy: 'weeping', lean: 0.09, branches: 3 },
  teak: { node: 'tree_teak', ring: 3, log: 'teak_log', leaves: 'teak_leaves', canopy: 'spreading', lean: 0.06, branches: 3 },
  ebony: { node: 'tree_ebony', ring: 3, log: 'ebony_log', leaves: 'ebony_leaves', canopy: 'spreading', lean: 0.05, branches: 4 },
  lignum_vitae: { node: 'tree_lignum_vitae', ring: 3, log: 'lignum_vitae_log', leaves: 'lignum_vitae_leaves', canopy: 'spreading', lean: 0.08, branches: 4 },
};

// A biome's tree set, as [species id, per-column density] pairs. Going through
// the table rather than writing node keys inline means a biome can only plant a
// species that actually exists, and the species' ring sits next to every use.
export function grove(...rows) {
  return rows.map(([id, density]) => {
    const sp = TREE_SPECIES[id];
    if (!sp) throw new Error(`unknown tree species: ${id}`);
    return { type: sp.node, density };
  });
}
