// Validates the shape-variant blocks (slabs, stairs, walls, fences, gates, panes)
// register correctly, reuse their base material's tiles, carry the right flags,
// and drive collisionHeight so physics matches the geometry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS, SHAPE_COLLISION, defShape } from '../../js/world/blocks.js';
import { World } from '../../js/world/world.js';

test('shape variants register, reuse base tiles, and set flags', () => {
  const cases = [
    ['stone_slab', 'slab', 'stone', false, false],
    ['stone_stairs', 'stairs', 'stone', true, false],
    ['stone_brick_wall', 'wall', 'stone_brick', false, false],
    ['planks_fence', 'fence', 'planks', false, false],
    ['planks_gate', 'gate', 'planks', true, false],
    ['glasspane_pane', 'pane', 'glasspane', false, true],
  ];
  for (const [name, shape, base, directional, transparent] of cases) {
    assert.ok(name in B, `${name} exists`);
    const d = BLOCKS[B[name]];
    const bd = BLOCKS[B[base]];
    assert.equal(d.shape, shape, `${name} has shape ${shape}`);
    assert.deepEqual(d.tiles, bd.tiles, `${name} reuses ${base} tiles`);
    assert.equal(d.directional, directional, `${name} directional=${directional}`);
    assert.equal(d.transparent, transparent, `${name} transparent=${transparent}`);
    assert.equal(d.solid, true, `${name} is solid`);
    assert.equal(d.opaque, false, `${name} is a non-occluding non-cube`);
    assert.equal(SHAPE_COLLISION[shape] !== undefined, true, `${shape} has a collision height`);
  }
});

test('defShape is idempotent-safe and derives label from base', () => {
  const d = BLOCKS[B.cobble_stairs];
  assert.match(d.label, /Cobblestone Stairs/);
});

test('collisionHeight matches each shape geometry', () => {
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 66; // above the surface, air by default
  const at = (name) => { w.setBlock(2, y, 2, B[name], true); return w.collisionHeight(2, y, 2); };
  assert.equal(at('stone'), 1, 'full block → 1');
  assert.equal(at('stone_slab'), 0.5, 'slab → 0.5');
  assert.equal(at('stone_stairs'), 1, 'stairs → full (safe walk-on)');
  assert.equal(at('planks_fence'), 1, 'fence blocks a full cell');
  assert.equal(at('glasspane_pane'), 1, 'pane blocks');
  w.setBlock(2, y, 2, B.air, true);
  assert.equal(w.collisionHeight(2, y, 2), 0, 'air → 0');
});

test('trapdoor opens, closes, and reports pass-through collision when open', () => {
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 66;
  w.setBlock(2, y, 2, B.trapdoor, true);
  // closed by default → a thin board you can stand on
  assert.equal(w.collisionHeight(2, y, 2), SHAPE_COLLISION.panel, 'closed trapdoor → 2px board');
  // swing it open (flip the open bit, 3) → a hole you fall through
  w.setFacing(2, y, 2, w.facingAt(2, y, 2) ^ 8);
  assert.equal((w.facingAt(2, y, 2) >> 3) & 1, 1, 'open bit set');
  assert.equal(w.collisionHeight(2, y, 2), 0, 'open trapdoor → pass-through');
  // swing it closed again
  w.setFacing(2, y, 2, w.facingAt(2, y, 2) ^ 8);
  assert.equal((w.facingAt(2, y, 2) >> 3) & 1, 0, 'open bit cleared');
  assert.equal(w.collisionHeight(2, y, 2), SHAPE_COLLISION.panel, 'closed again → board');
});

test('player facing edits are recorded and survive a save round-trip', () => {
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 66;
  w.setBlock(2, y, 2, B.trapdoor, true);
  w.setFacing(2, y, 2, 8 | 2); // open, hinge facing north (dir 2)
  const saved = w.serialize();
  assert.equal(saved.facingEdits['2,66,2'], 10, 'facingEdits records the player choice');
  const w2 = new World(4242);
  w2.deserialize(saved);
  assert.equal(w2.facingEdits.get('2,66,2'), 10, 'facingEdits restored on load');
  // breaking the block clears its facing edit so it cannot leak onto a new block
  w.setBlock(2, y, 2, B.air, true);
  assert.equal(w.facingEdits.has('2,66,2'), false, 'facing edit cleared with the block');
});
