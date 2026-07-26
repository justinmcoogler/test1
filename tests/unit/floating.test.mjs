// Nothing near spawn may hang in the air.
//
// This is the bug class that gets past everything else we run. A floating block
// throws nothing, breaks no save, costs no frames and fails no other assertion —
// it is purely a thing you SEE, and the starting camp is the one place in the
// world every player looks at before they look at anything else. Two shipped and
// stayed shipped: a lean-to that was a single stair suspended over the
// workbench, and a branch tip on every broadleaf in the game, because the limb
// stepped out and up in one move and a voxel joined only at a corner is joined
// to nothing.
//
// The rule, and why it is stricter than it first looks, is documented in
// tools/audit-floating.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, B } from '../../js/world/blocks.js';
import { buildStarterStructures } from '../../js/world/structures.js';
import { floatingBlocks, loadedWorld, mayHang } from '../../tools/audit-floating.mjs';

const SEED = 20260725;
const RADIUS = 48;   // past the camp, the pond, the mine mouth and the near woods

test('nothing within sight of spawn is hanging in the air', () => {
  const [ox, , oz] = buildStarterStructures().markers.spawn;
  const world = loadedWorld(SEED, RADIUS, ox, oz);
  const float = floatingBlocks(world, { ox, oz, radius: RADIUS });

  const shown = float.slice(0, 8)
    .map((c) => `${BLOCKS[c.id].name} at ${c.x},${c.y},${c.z}`).join('; ');
  assert.equal(float.length, 0, `${float.length} floating block(s) near spawn: ${shown}`);
});

test('a cave does not leave the ground hanging over it', () => {
  // Out in the procedural world the cave noise carved right up to the surface,
  // so a hillside kept its lawn while the hill under it went. Four boxes far
  // enough apart to be different terrain, different biomes and different towns.
  // The spawn bowl above cannot catch this: worldgen.isCave refuses to carve
  // within 46 blocks of the origin so the hand-built mine stays intact.
  for (const [name, ox, oz] of [['east', 340, -80], ['west', -300, 40],
    ['south', 60, 380], ['north-west', -380, -300]]) {
    const world = loadedWorld(SEED, 40, ox, oz);
    const float = floatingBlocks(world, { ox, oz, radius: 40 });
    const shown = float.slice(0, 6).map((c) => `${BLOCKS[c.id].name} at ${c.x},${c.y},${c.z}`).join('; ');
    assert.equal(float.length, 0, `${float.length} floating block(s) ${name} of spawn: ${shown}`);
  }
});

test('the audit can actually see a floating block', () => {
  // A clean report is only worth something if the check is live. Hang a block in
  // the air and demand it is found — the first version of this audit filtered
  // ignorable blocks with `name.includes('air')`, and 'stairs' contains 'air',
  // so it reported the spawn clean while a stair hung over the workbench.
  const [ox, , oz] = buildStarterStructures().markers.spawn;
  const world = loadedWorld(SEED, RADIUS, ox, oz);
  const y = world.surfaceAt(ox, oz) + 4;

  for (const id of [B.planks_stairs, B.planks, B.cobble]) {
    world.setBlock(ox, y, oz, id, true);
    const found = floatingBlocks(world, { ox, oz, radius: RADIUS });
    assert.equal(found.length, 1, `a hanging ${BLOCKS[id].name} should be found, and only it`);
    assert.deepEqual([found[0].x, found[0].y, found[0].z], [ox, y, oz]);
    world.setBlock(ox, y, oz, B.air, true);
  }
  assert.equal(floatingBlocks(world, { ox, oz, radius: RADIUS }).length, 0, 'and clean again once removed');
});

test('foliage is allowed to hang, and stairs are not excused by their name', () => {
  // Leaves grow off a trunk they do not touch, so they are exempt. The exemption
  // is matched on the WHOLE name: a substring test would quietly swallow every
  // stair block in the world, which is exactly how the real bug survived.
  assert.equal(mayHang(BLOCKS[B.oak_leaves]), true, 'a canopy may hang');
  assert.equal(mayHang(BLOCKS[B.water]), true);
  for (const id of [B.planks_stairs, B.cobble_stairs, B.brick_stairs]) {
    assert.equal(mayHang(BLOCKS[id]), false, `${BLOCKS[id].name} must not be exempt`);
  }
  assert.equal(mayHang(BLOCKS[B.oak_log]), false, 'nor may a branch');
});
