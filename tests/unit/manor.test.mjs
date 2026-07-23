// Validates the converted starter manor: the baked module is well-formed and
// references only real blocks, buildStarterStructures stamps it west of town
// without colliding with the settlement, its chests are registered, and worldgen
// pins its footprint flat so it sits cleanly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MANOR } from '../../js/world/starter-manor.js';
import { buildStarterStructures } from '../../js/world/structures.js';
import { WorldGen, MANOR_PAD } from '../../js/world/worldgen.js';
import { B } from '../../js/world/blocks.js';

test('baked manor module is well-formed and uses only real blocks', () => {
  assert.ok(MANOR.cells.length % 4 === 0, 'cells is a flat [x,y,z,pi] run');
  assert.equal(MANOR.count, MANOR.cells.length / 4, 'count matches cell run');
  for (const name of MANOR.palette) assert.ok(name in B, `palette block "${name}" is real`);
  // normalized to a (0,0,0) minimum corner, within the declared bounds
  let minx = Infinity, miny = Infinity, minz = Infinity, maxx = 0, maxy = 0, maxz = 0;
  for (let i = 0; i < MANOR.cells.length; i += 4) {
    const x = MANOR.cells[i], y = MANOR.cells[i + 1], z = MANOR.cells[i + 2], pi = MANOR.cells[i + 3];
    minx = Math.min(minx, x); maxx = Math.max(maxx, x);
    miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    minz = Math.min(minz, z); maxz = Math.max(maxz, z);
    assert.ok(pi >= 0 && pi < MANOR.palette.length, 'palette index in range');
  }
  assert.equal(minx, 0); assert.equal(miny, 0); assert.equal(minz, 0);
  assert.ok(maxx < MANOR.w && maxy < MANOR.h && maxz < MANOR.l, 'cells fit the declared box');
});

test('manor is stamped west of town with valid blocks and no settlement collision', () => {
  const s = buildStarterStructures();
  // Town structure footprints (real coords) — the manor must not intrude on any.
  const town = [
    [-16, -8, -16, -8], [8, 16, -16, -8], [-16, -10, 8, 12], [-18, -10, 16, 22],
    [18, 30, -12, 9], [8, 16, 8, 16], [-29, -20, 18, 29], [-8, 8, 10, 26],
    [22, 26, -25, -20],
  ];
  let manorEdits = 0, collisions = 0, badId = 0;
  const realIds = new Set(Object.values(B));
  for (const [k, id] of s.edits) {
    const [x, y, z] = k.split(',').map(Number);
    if (x <= -40) { // manor + its lane live west of x=-40; town is east of it
      manorEdits++;
      if (!realIds.has(id)) badId++;
      for (const [x1, x2, z1, z2] of town) {
        if (x >= x1 && x <= x2 && z >= z1 && z <= z2) collisions++;
      }
    }
  }
  assert.ok(manorEdits > 2000, `manor stamped a substantial build (${manorEdits} edits)`);
  assert.equal(badId, 0, 'every manor block id is real');
  assert.equal(collisions, 0, 'manor does not overlap any town structure footprint');
});

test('manor chests are registered as openable containers', () => {
  const s = buildStarterStructures();
  const chests = s.chests.filter((c) => c.id.startsWith('manor_chest_'));
  assert.ok(chests.length >= 1, 'at least one manor chest registered');
  for (const c of chests) {
    assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z), 'chest has coords');
    assert.ok(Array.isArray(c.loot), 'chest has a loot array');
  }
  assert.ok(s.markers.manor, 'a manor map marker exists');
});

test('worldgen pins the manor footprint flat at the settlement surface', () => {
  const gen = new WorldGen(20260723);
  // sample the four footprint corners + centre — all must be exactly the pad grade
  const OX = -78, OZ = -14; // stamp origin (matches structures.js)
  for (const [dx, dz] of [[0, 0], [35, 0], [0, 27], [35, 27], [17, 13]]) {
    const x = OX + dx, z = OZ + dz;
    assert.equal(gen.heightAt(x, z), MANOR_PAD.ground, `flat at (${x},${z})`);
  }
});
