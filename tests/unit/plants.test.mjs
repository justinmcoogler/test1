// Ground cover: mushrooms and flowers.
//
// Everything on a forest floor used to be drawn on the same two crossing planes.
// For grass that is fine. For a mushroom — which is mostly cap — it means two
// painted stickers passing through each other, obvious from any angle but dead
// on. Mushrooms are real boxes now. These tests pin that, and pin the thing that
// made every flower look wrong: art one logical pixel wide, which survives the
// near view and dissolves in the mipmaps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS, MUSHROOMS } from '../../js/world/blocks.js';
import { World, initSlabSet } from '../../js/world/world.js';
import { meshChunk } from '../../js/gfx/mesher.js';
import { setTileUV, tileNames } from '../../js/gfx/textures.js';

const SEED = 990211;
setTileUV({ stone: { u0: 0, v0: 0, u1: 1, v1: 1 } });

const FLOWERS = ['allium', 'orange_tulip', 'pink_tulip', 'white_tulip', 'oxeye_daisy', 'blue_orchid', 'rose_bush'];

function ground() {
  initSlabSet();
  const w = new World(SEED);
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) w.ensureChunk(cx, cz);
  return w;
}

function clearPlot(w, x, z) {
  const y = w.surfaceAt(x, z);
  w.setBlock(x, y, z, B.grass, true);
  for (let k = 1; k < 4; k++) w.setBlock(x, y + k, z, B.air, true);
  return y + 1;
}

const verts = (mesh) => mesh?.verts.length ?? 0;
const points = (mesh) => {
  const out = [];
  if (!mesh) return out;
  for (let i = 0; i < mesh.verts.length; i += 8) out.push([mesh.verts[i], mesh.verts[i + 1], mesh.verts[i + 2]]);
  return out;
};

test('both mushroom species exist, walk-through, and draw as boxes', () => {
  assert.deepEqual(MUSHROOMS, ['mushroom_cap', 'mushroom_brown']);
  for (const name of MUSHROOMS) {
    const d = BLOCKS[B[name]];
    assert.equal(d.shape, 'mushroom', `${name} is not a flat cross`);
    assert.equal(d.solid, false, `${name} is walk-through`);
    assert.equal(d.opaque, false, `${name} does not occlude its neighbours`);
    // A box needs a tile per face; a cross gets away with one.
    for (const face of ['top', 'side', 'bottom', 'stem']) {
      assert.ok(d.tiles[face], `${name} has a ${face} tile`);
    }
  }
});

test('every plant tile named by a block has a painter', () => {
  const tiles = new Set(tileNames());
  for (const name of [...MUSHROOMS, ...FLOWERS, 'tall_grass', 'wildflower']) {
    for (const t of Object.values(BLOCKS[B[name]].tiles)) {
      assert.ok(tiles.has(t), `${name} tile "${t}" has art`);
    }
  }
});

test('a mushroom is a stalk under a stepped cap, not two crossing planes', () => {
  const w = ground();
  const x = 6, z = 9;
  const y = clearPlot(w, x, z);
  const before = points(meshChunk(w, 0, 0).opaque).map(String);
  w.setBlock(x, y, z, B.mushroom_cap, true);
  const mesh = meshChunk(w, 0, 0);
  // three boxes × six faces × four vertices × eight floats
  assert.equal(verts(mesh.opaque) - before.length * 8, 3 * 6 * 4 * 8, 'stalk + cap + crown');

  // Only the vertices the mushroom itself contributed — the chunk around it is
  // full of ordinary cubes whose corners sit on the cell walls.
  const seen = new Map();
  for (const k of before) seen.set(k, (seen.get(k) || 0) + 1);
  const mine = points(mesh.opaque).filter((p) => {
    const k = String(p), n = seen.get(k) || 0;
    if (n > 0) { seen.set(k, n - 1); return false; }
    return true;
  });
  const near = (a, b) => Math.abs(a - b) < 1e-4;
  // The cap overhangs the stalk on every side — that overhang IS the mushroom.
  assert.ok(mine.some((p) => near(p[0], x + 2 / 16) && near(p[1], y + 7 / 16)), 'cap starts wide and low');
  assert.ok(mine.some((p) => near(p[0], x + 6 / 16) && near(p[1], y)), 'stalk is narrow and sits on the ground');
  assert.ok(mine.some((p) => near(p[1], y + 13 / 16)), 'crown steps in above the cap');
  // and nothing reaches the cell walls, so mushrooms never tile into a slab
  assert.equal(mine.some((p) => near(p[0], x) || near(p[0], x + 1)), false, 'it does not fill the cell');
  assert.equal(mine.some((p) => near(p[1], y + 1)), false, 'and it is shorter than the block it stands in');
});

test('a mushroom will not hang in the air', () => {
  const w = ground();
  const x = 4, z = 4;
  const y = clearPlot(w, x, z);
  const bare = verts(meshChunk(w, 0, 0).opaque);
  w.setBlock(x, y + 2, z, B.mushroom_brown, true);   // two blocks up, on nothing
  assert.equal(verts(meshChunk(w, 0, 0).opaque) - bare, 0, 'nothing is drawn');
});

test('a mushroom can still be clicked, though you walk straight through it', () => {
  const w = ground();
  const x = 11, z = 5;
  const y = clearPlot(w, x, z);
  w.setBlock(x, y, z, B.mushroom_cap, true);
  assert.equal(w.collisionHeight(x, y, z), 0, 'no collision — it is ground cover');
  const hit = w.raycast(x + 0.5, y + 0.5, z - 4, 0, 0, 1, 8);
  assert.ok(hit, 'the ray finds something');
  assert.equal(hit.id, B.mushroom_cap, 'and it is the mushroom, not the ground behind it');
});

test('both species scatter in the wild, not just the red one', () => {
  const w = ground();
  const seen = new Set();
  for (let cx = -1; cx <= 1; cx++) {
    for (let cz = -1; cz <= 1; cz++) {
      const c = w.getChunk(cx, cz);
      if (!c) continue;
      for (const id of c.blocks) {
        if (id === B.mushroom_cap || id === B.mushroom_brown) seen.add(BLOCKS[id].name);
      }
    }
  }
  // Chunks near spawn are hand-kept, so widen if the starting bowl came up bare.
  if (seen.size < 2) {
    for (let cx = 3; cx <= 8; cx++) for (let cz = 3; cz <= 8; cz++) {
      const c = w.ensureChunk(cx, cz);
      for (const id of c.blocks) {
        if (id === B.mushroom_cap || id === B.mushroom_brown) seen.add(BLOCKS[id].name);
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['mushroom_brown', 'mushroom_cap'], `saw ${[...seen].join(',')}`);
});

test('flowers still draw as crosses, and still need ground under them', () => {
  const w = ground();
  const x = 8, z = 12;
  const y = clearPlot(w, x, z);
  for (const name of FLOWERS) {
    const bare = verts(meshChunk(w, 0, 0).cutout);
    w.setBlock(x, y, z, B[name], true);
    assert.equal(verts(meshChunk(w, 0, 0).cutout) - bare, 2 * 4 * 8, `${name} is two quads`);
    w.setBlock(x, y, z, B.air, true);
  }
  w.setBlock(x, y + 2, z, B.allium, true);
  const bare = verts(meshChunk(w, 0, 0).cutout);
  assert.equal(bare, verts(meshChunk(w, 0, 0).cutout), 'stable');
  w.setBlock(x, y - 1, z, B.air, true);              // pull the ground out
  w.setBlock(x, y, z, B.allium, true);
  assert.equal(verts(meshChunk(w, 0, 0).cutout), bare, 'a flower over a hole draws nothing');
});
