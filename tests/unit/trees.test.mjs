// The parameterised tree builder and the species roster it draws from.
// Guards the two things the rest of the world assumes about a tree: that its
// cells never leave the ±2 envelope a chunk-local stamp can hold, and that the
// same coordinates always grow the same tree on every seed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TREE_SPECIES, buildTree, grove } from '../../js/world/trees.js';
import { B } from '../../js/world/blocks.js';
import { NODE_TYPES } from '../../js/game/nodes.js';
import { WOODS } from '../../js/game/materials.js';
import { BIOMES } from '../../js/world/worldgen.js';

const collect = (sp, x, y, z, h) => {
  const out = [];
  buildTree(sp, x, y, z, h, (bx, by, bz, id) => out.push({ x: bx, y: by, z: bz, id }));
  return out;
};

test('species: one per wood in the spine, all blocks and node types real', () => {
  assert.equal(Object.keys(TREE_SPECIES).length, WOODS.length);
  for (const w of WOODS) {
    const sp = TREE_SPECIES[w.id];
    assert.ok(sp, `no species row for ${w.id}`);
    assert.ok(NODE_TYPES[sp.node], `${w.id} names a node type that does not exist: ${sp.node}`);
    assert.ok(B[sp.log] !== undefined && B[sp.leaves] !== undefined, `${w.id} names a block that does not exist`);
    assert.ok(['round', 'conical', 'spreading', 'weeping'].includes(sp.canopy), `${w.id} bad canopy ${sp.canopy}`);
    assert.ok(sp.ring >= 0 && sp.ring <= 3, `${w.id} ring out of range`);
    assert.ok(sp.lean >= 0 && sp.lean < 0.2, `${w.id} lean would walk the trunk out of its envelope`);
    assert.ok(Number.isInteger(sp.branches) && sp.branches >= 0, `${w.id} bad branch count`);
  }
});

test('species tier with the rings: ring 0 is plain, ring 3 is branched', () => {
  const ring = (r) => Object.values(TREE_SPECIES).filter((s) => s.ring === r);
  for (let r = 0; r <= 3; r++) assert.ok(ring(r).length > 0, `no species at ring ${r}`);
  for (const s of ring(0)) assert.equal(s.branches, 0, 'a starting-bowl tree should be a plain trunk');
  for (const s of ring(3)) assert.ok(s.branches >= 3, 'a far-woods tree should be heavy-limbed');
  // and each canopy shape is actually used, or it is code nothing can reach
  const shapes = new Set(Object.values(TREE_SPECIES).map((s) => s.canopy));
  assert.deepEqual([...shapes].sort(), ['conical', 'round', 'spreading', 'weeping']);
});

test('every tree stays inside the ±2 envelope a chunk-local stamp can hold', () => {
  for (const sp of Object.values(TREE_SPECIES)) {
    for (const h of [4, 7, 10, 14]) {
      for (const [x, z] of [[0, 0], [37, -11], [-208, 96]]) {
        const cells = collect(sp, x, 64, z, h);
        assert.ok(cells.length > 8, `${sp.node} h=${h} produced almost nothing`);
        for (const c of cells) {
          assert.ok(Math.abs(c.x - x) <= 2 && Math.abs(c.z - z) <= 2, `${sp.node} escaped its envelope at ${c.x},${c.z}`);
          assert.ok(c.y >= 64, `${sp.node} wrote below the ground it stands on`);
        }
      }
    }
  }
});

test('every tree has a full trunk of logs under a canopy of leaves', () => {
  for (const sp of Object.values(TREE_SPECIES)) {
    const h = 9;
    const cells = collect(sp, 0, 64, 0, h);
    const logs = cells.filter((c) => c.id === B[sp.log]);
    const leaves = cells.filter((c) => c.id === B[sp.leaves]);
    assert.ok(logs.length >= h, `${sp.node} trunk is short: ${logs.length} logs for h=${h}`);
    assert.ok(leaves.length > 10, `${sp.node} has no canopy to speak of`);
    // the felling column: the trunk foot must be a log, or the node is unclickable
    assert.ok(logs.some((c) => c.x === 0 && c.z === 0 && c.y === 64), `${sp.node} has no log at its foot`);
    assert.ok(leaves.every((c) => c.y > 64), `${sp.node} put leaves on the ground`);
  }
});

test('the same spot grows the same tree on every world', () => {
  const sp = TREE_SPECIES.oak;
  const a = JSON.stringify(collect(sp, 12, 70, -5, 8));
  const b = JSON.stringify(collect(sp, 12, 70, -5, 8));
  assert.equal(a, b);
  assert.notEqual(a, JSON.stringify(collect(sp, 13, 70, -5, 8)), 'neighbouring trees should differ');
});

test('grove rejects a species that does not exist, and every biome plants real ones', () => {
  assert.throws(() => grove(['mallorn', 0.01]), /unknown tree species/);
  const known = new Set(Object.values(TREE_SPECIES).map((s) => s.node));
  for (const [key, biome] of Object.entries(BIOMES)) {
    for (const t of biome.trees) assert.ok(known.has(t.type), `${key} plants unknown ${t.type}`);
  }
});
