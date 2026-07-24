// Flowing-water cellular automaton + the "reeds only next to water" worldgen
// rule. The sim: a water cell with no level entry is a permanent source that
// feeds level 7 outward; flowing cells derive their level from neighbours and
// dry up when their supply is cut. Only edits seed the sim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B } from '../../js/world/blocks.js';
import { World } from '../../js/world/world.js';
import { SEA } from '../../js/world/worldgen.js';

// Build a walled basin (stone floor + perimeter ring) with a 3×3 air interior
// centred on (0,y,0), then drop a source in the middle.
function basin(w, y) {
  w.ensureChunk(0, 0);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    w.setBlock(dx, y - 1, dz, B.stone, true);                 // floor
    const wall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
    w.setBlock(dx, y, dz, wall ? B.stone : B.air, true);      // ring wall / air interior
  }
}
function run(w, steps = 60) { for (let i = 0; i < steps; i++) w.tickWater(0.11); }

test('a water source floods the flat interior it sits in', () => {
  const w = new World(777);
  const y = 70;
  basin(w, y);
  w.setBlock(0, y, 0, B.water, true); // source (no level entry ⇒ permanent)
  run(w);
  assert.equal(w.getBlock(1, y, 0), B.water, 'flowed to the +x neighbour');
  assert.equal(w.getBlock(0, y, 1), B.water, 'flowed to the +z neighbour');
  assert.equal(w.getBlock(1, y, 1), B.water, 'flowed to the diagonal corner');
  assert.equal(w.getBlock(2, y, 0), B.stone, 'the wall stops the spread');
});

test('water falls straight down a shaft', () => {
  const w = new World(778);
  w.ensureChunk(0, 0);
  const y = 74;
  w.setBlock(5, y - 5, 5, B.stone, true);                    // floor 5 below
  for (let yy = y - 4; yy <= y; yy++) w.setBlock(5, yy, 5, B.air, true);
  w.setBlock(5, y, 5, B.water, true);                        // source at the top
  run(w);
  assert.equal(w.getBlock(5, y - 1, 5), B.water, 'fell one');
  assert.equal(w.getBlock(5, y - 4, 5), B.water, 'reached the floor');
});

test('flowing water recedes when its source is removed', () => {
  const w = new World(779);
  const y = 70;
  basin(w, y);
  w.setBlock(0, y, 0, B.water, true);
  run(w);
  assert.equal(w.getBlock(1, y, 0), B.water, 'basin filled first');
  w.setBlock(0, y, 0, B.air, true); // pull the source
  run(w, 80);
  assert.equal(w.getBlock(1, y, 0), B.air, 'drained the +x cell');
  assert.equal(w.getBlock(1, y, 1), B.air, 'drained the corner too');
});

test('water levels round-trip through save/load', () => {
  const w = new World(780);
  const y = 70;
  basin(w, y);
  w.setBlock(0, y, 0, B.water, true);
  run(w);
  const lvl = w.waterLevel.get('1,70,0');
  assert.ok(lvl >= 1 && lvl <= 8, 'a flowed cell carries a level');
  const w2 = new World(780);
  w2.deserialize(w.serialize());
  assert.equal(w2.waterLevel.get('1,70,0'), lvl, 'level restored on load');
});

test('every generated reed sits next to a water block', () => {
  const w = new World(20260724);
  for (let cx = -6; cx <= 6; cx++) for (let cz = -6; cz <= 6; cz++) w.ensureChunk(cx, cz);
  let reeds = 0, violations = 0;
  for (let cx = -5; cx <= 5; cx++) for (let cz = -5; cz <= 5; cz++) {
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
      const x = cx * 16 + lx, z = cz * 16 + lz;
      for (let y = SEA - 1; y <= SEA + 3; y++) {
        if (w.getBlock(x, y, z) !== B.reed) continue;
        reeds++;
        const g = y - 1; // the ground the reed roots in; water must be beside it
        const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => w.getBlock(x + dx, g, z + dz) === B.water);
        if (!beside) violations++;
      }
    }
  }
  assert.equal(violations, 0, `${violations} of ${reeds} reeds are not next to water`);
});
