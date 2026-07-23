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
