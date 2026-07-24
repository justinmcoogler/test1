// Validates the shape-variant blocks (slabs, stairs, walls, fences, gates, panes)
// register correctly, reuse their base material's tiles, carry the right flags,
// and drive collisionHeight so physics matches the geometry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS, SHAPE_COLLISION, defShape } from '../../js/world/blocks.js';
import { World } from '../../js/world/world.js';
import { Player } from '../../js/player/player.js';

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

test('the player walks over carpet instead of bumping its edge', () => {
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const carpet = Object.keys(B).find((n) => n.endsWith('_carpet'));
  const y = 66;
  for (let x = 2; x <= 16; x++) { w.setBlock(x, y, 2, B.stone, true); w.setBlock(x, y + 1, 2, B[carpet], true); }
  const p = new Player();
  p.x = 2.5; p.z = 2.5; p.y = y + 1; p.onGround = true;
  for (let i = 0; i < 40; i++) { p.moveAxis(w, 0.12, 0, 0); p.moveAxis(w, 0, -0.03, 0); }
  assert.ok(p.x > 6, `player crossed several carpet cells (x=${p.x.toFixed(2)})`);
  assert.ok(p.y >= y + 1 - 0.02 && p.y <= y + 1 + SHAPE_COLLISION.carpet + 0.02, `stayed grounded on the carpet, not fallen (y=${p.y.toFixed(3)})`);
});

test('the player auto-steps up a staircase without jumping', () => {
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 66;
  for (let x = 2; x <= 4; x++) w.setBlock(x, y, 2, B.stone, true);          // flat approach, top y+1
  w.setBlock(5, y + 1, 2, B.stone_stairs, true);                            // step 1 → top y+2
  w.setBlock(6, y + 2, 2, B.stone_stairs, true);                           // step 2 → top y+3
  w.setBlock(7, y + 3, 2, B.stone_stairs, true);                           // step 3 → top y+4
  for (let x = 8; x <= 13; x++) w.setBlock(x, y + 3, 2, B.stone, true);     // top landing, top y+4
  const p = new Player();
  p.x = 2.5; p.z = 2.5; p.y = y + 1; p.onGround = true;
  let peakY = p.y;
  for (let i = 0; i < 70; i++) { p.moveAxis(w, 0.12, 0, 0); p.moveAxis(w, 0, -0.05, 0); peakY = Math.max(peakY, p.y); }
  assert.ok(p.x > 7.5, `climbed across the staircase (x=${p.x.toFixed(2)})`);
  assert.ok(peakY >= y + 3.5, `rose up the steps, no jump (peakY=${peakY.toFixed(2)})`);
  assert.ok(p.y >= y + 3.5, `ended on the top landing (y=${p.y.toFixed(2)})`);
});

test('the player steps up onto a slab', () => {
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 66;
  for (let x = 2; x <= 13; x++) w.setBlock(x, y, 2, B.stone, true);          // floor, top y+1
  for (let x = 6; x <= 13; x++) w.setBlock(x, y + 1, 2, B.stone_slab, true); // slab shelf, top y+1.5
  const p = new Player();
  p.x = 2.5; p.z = 2.5; p.y = y + 1; p.onGround = true;
  let peakY = p.y;
  for (let i = 0; i < 45; i++) { p.moveAxis(w, 0.12, 0, 0); p.moveAxis(w, 0, -0.05, 0); peakY = Math.max(peakY, p.y); }
  assert.ok(p.x > 7, `walked up onto the slab shelf (x=${p.x.toFixed(2)})`);
  assert.ok(peakY >= y + 1.4, `stepped up half a block onto the slab (peakY=${peakY.toFixed(2)})`);
});

test('the player cannot auto-step a full two-block wall', () => {
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 66;
  for (let x = 2; x <= 5; x++) w.setBlock(x, y, 2, B.stone, true); // floor
  w.setBlock(6, y + 1, 2, B.stone, true); // wall, lower
  w.setBlock(6, y + 2, 2, B.stone, true); // wall, upper — no headroom to step
  const p = new Player();
  p.x = 2.5; p.z = 2.5; p.y = y + 1; p.onGround = true;
  for (let i = 0; i < 60; i++) { p.moveAxis(w, 0.12, 0, 0); p.moveAxis(w, 0, -0.05, 0); }
  assert.ok(p.x < 5.8, `blocked by the two-block wall (x=${p.x.toFixed(2)})`);
  assert.ok(p.y < y + 1.5, `did not climb the wall (y=${p.y.toFixed(2)})`);
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
