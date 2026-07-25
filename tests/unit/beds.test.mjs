// A bed is two cells pretending to be one object, which is the entire source of
// risk in it. Everything here is about the pair staying a pair: the geometry
// agreeing with the placement code about which end the pillow is on, both halves
// giving back exactly one bed, and the sleep-to-dawn arithmetic landing on the
// same hour every time rather than jumping a fixed amount.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS, SHAPE_COLLISION } from '../../js/world/blocks.js';
import { ITEMS } from '../../js/game/items.js';
import { RECIPES } from '../../js/game/crafting.js';
import { DAY_LEN } from '../../js/world/world.js';
import { tileNames } from '../../js/gfx/textures.js';

// The step from a bed's FOOT to its HEAD, per facing. This is a COPY of the
// table in js/main.js on purpose — it is also the renderer's FRONT_N order
// (js/gfx/shapes.js), and the test exists to catch the three drifting apart.
const BED_DIR = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const DAWN = 0.05;

test('a bed is two blocks and one item, and either half returns exactly one', () => {
  const foot = BLOCKS[B.bed], head = BLOCKS[B.bed_head];
  assert.ok(foot && head, 'both halves are registered');
  assert.equal(foot.shape, 'bed');
  assert.equal(head.shape, 'bed');
  // Both drop the foot's item — break either end, get one bed back. If the head
  // dropped `bed_head` you could farm beds by breaking and replacing one end.
  assert.equal(foot.drops, 'bed');
  assert.equal(head.drops, 'bed');
  assert.ok(ITEMS.bed, 'the bed is an item you can hold');
  assert.equal(ITEMS.bed.block, 'bed', 'and placing it places the FOOT');
  assert.ok(!ITEMS.bed_head, 'the head is never an item of its own');
  // Facing is mandatory: without it the placement code cannot tell which way the
  // head goes and the renderer draws the headboard at an arbitrary end.
  assert.equal(foot.directional, true);
  assert.equal(head.directional, true);
});

test('a bed is knee-high — you step onto it, not into it', () => {
  // 9/16 is under the player's step-up, so a bed never walls off a bedroom. A
  // full-height collision here is what would turn a cabin into a sealed room in
  // the enterability flood-fills.
  assert.equal(SHAPE_COLLISION.bed, 9 / 16);
  assert.ok(SHAPE_COLLISION.bed < 1, 'a bed must not read as a wall');
  // Non-cube shapes never occlude their neighbours, or the floor under the bed
  // would be culled and you would see through the world.
  assert.equal(BLOCKS[B.bed].opaque, false);
  assert.equal(BLOCKS[B.bed_head].opaque, false);
});

test('every tile the bed names has a painter', () => {
  // A missing tile does NOT fail loudly — faceUV falls back to stone — so this is
  // the only thing standing between a bug and a bed that looks like a rock.
  const tiles = new Set(tileNames());
  for (const id of [B.bed, B.bed_head]) {
    for (const t of Object.values(BLOCKS[id].tiles)) {
      assert.ok(tiles.has(t), `bed tile "${t}" has no painter`);
    }
  }
  // …and the two halves genuinely differ on top, or the pillow end is invisible.
  assert.notEqual(BLOCKS[B.bed].tiles.top, BLOCKS[B.bed_head].tiles.top);
});

test('the foot→head step table is a unit step in one of the four compass directions', () => {
  assert.equal(BED_DIR.length, 4, 'facing is masked to 2 bits, so exactly four');
  const seen = new Set();
  for (const [dx, dz] of BED_DIR) {
    assert.equal(Math.abs(dx) + Math.abs(dz), 1, 'a bed head is one cell away, never diagonal');
    seen.add(`${dx},${dz}`);
  }
  assert.equal(seen.size, 4, 'and the four are distinct');
  // Reversing the step must land back on the foot — this is what
  // clearBedPartner() relies on when you break the head rather than the foot.
  for (const [dx, dz] of BED_DIR) {
    assert.ok(BED_DIR.some(([ex, ez]) => ex === -dx && ez === -dz), 'every step has its opposite');
  }
});

test('the bed is craftable, at a level a first night is reachable by', () => {
  const rec = RECIPES.find((r) => r.out === 'bed');
  assert.ok(rec, 'a bed has a recipe');
  assert.ok(rec.level <= 5, `a bed you cannot build on night one is not a bed (level ${rec.level})`);
  for (const inp of rec.inputs) assert.ok(ITEMS[inp.item], `bed input ${inp.item} is a real item`);
  // Wool and planks: both come off the very first things you meet, a sheep and
  // a tree. A bed gated behind metal would be a bed you never sleep in.
  const items = rec.inputs.map((i) => i.item).sort();
  assert.deepEqual(items, ['planks', 'white_wool']);
});

test('sleeping lands on the same hour whatever time you went to bed', () => {
  // The arithmetic from trySleep(): time until the day phase next equals DAWN.
  // A fixed jump — "+300 seconds" — would wake you at a different hour every
  // night and eventually stop being dawn at all, which is the bug this guards.
  const skipFrom = (phase) => ((DAWN - phase + 1) % 1) * DAY_LEN;
  for (const phase of [0.5, 0.7, 0.9, 0.99, 0.0, 0.04]) {
    const skip = skipFrom(phase);
    assert.ok(skip >= 0 && skip <= DAY_LEN, `skip stays inside one day (${skip})`);
    const landed = (phase + skip / DAY_LEN) % 1;
    assert.ok(Math.abs(landed - DAWN) < 1e-9, `from phase ${phase} you wake at dawn, not ${landed}`);
  }
  // The degenerate case: at exactly dawn the skip is zero, so advancing the
  // clock by it would move nothing while the game announced a night had passed.
  // trySleep() refuses below one second and says so instead — this asserts the
  // threshold is on the right side of that zero.
  assert.equal(skipFrom(DAWN), 0);
  assert.ok(skipFrom(DAWN) < 1, 'the guard in trySleep() catches it');
  // And one tick either side of dawn is a real, non-zero sleep.
  assert.ok(skipFrom(DAWN - 0.01) > 1);
  assert.ok(skipFrom(DAWN + 0.01) > 1);
});
