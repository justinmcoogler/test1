// The camp is the first thing you ever see, and there is nothing else within a
// day's walk to fall back on if it is broken. Brookhollow used to be covered by
// a whole flood-fill suite (tests/unit/town.test.mjs, deleted with the town);
// this is that idea at the size the camp actually is.
//
// The bug it exists to stop: a tent you cannot get into. The canvas is solid
// wool and the bedroll is inside it, so a mis-sited wall or a roof slope one
// block too low turns the opening hour into standing outside your own shelter.
// That is invisible in a screenshot and obvious to a flood-fill.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, initSlabSet } from '../../js/world/world.js';
import { BLOCKS, B } from '../../js/world/blocks.js';
import { buildStarterStructures } from '../../js/world/structures.js';

const SEED = 20260725;

// Load the world around the camp once and share it — every test here asks about
// the same twenty blocks of ground.
function campWorld() {
  initSlabSet();
  const w = new World(SEED);
  for (let cx = -2; cx <= 2; cx++) for (let cz = -2; cz <= 2; cz++) w.ensureChunk(cx, cz);
  return w;
}

// The game's own movement rules, the same ones the pathfinder uses: two blocks
// of headroom, step up at most one, drop at most four. Anything that is not a
// re-implementation would have to run the real collider, which the physics
// suite already does — this is the cheap wide sweep.
function walkable(w, x, y, z) {
  const foot = BLOCKS[w.getBlock(x, y, z)];
  const head = BLOCKS[w.getBlock(x, y + 1, z)];
  const under = BLOCKS[w.getBlock(x, y - 1, z)];
  if (!under?.solid) return false;
  const passable = (d) => !d || !d.solid || d.shape === 'door' || d.walkThrough || (d.shape === 'bed');
  return passable(foot) && passable(head);
}

function reachFrom(w, sx, sy, sz) {
  const seen = new Set();
  const q = [[sx, sy, sz]];
  const key = (x, y, z) => `${x},${y},${z}`;
  seen.add(key(sx, sy, sz));
  while (q.length && seen.size < 20000) {
    const [x, y, z] = q.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      // step up one, walk level, or drop up to four
      for (const dy of [1, 0, -1, -2, -3, -4]) {
        const ny = y + dy;
        if (!walkable(w, nx, ny, nz)) continue;
        const k = key(nx, ny, nz);
        if (seen.has(k)) break;
        seen.add(k);
        q.push([nx, ny, nz]);
        break;
      }
    }
  }
  return seen;
}

// A dry, open cell a walk away from the camp to start the sweep from. Picked by
// probing rather than hard-coded: surfaceAt() returns the WATER surface over the
// fishing pond, so an arbitrary offset from spawn can drop the walker into it
// and the flood-fill then spends itself on the pond's edge instead of the camp.
function approach(w) {
  for (const [x, z] of [[16, 16], [18, -8], [-16, -14], [14, 20], [-18, 10]]) {
    const y = w.surfaceAt(x, z) + 1;
    if (walkable(w, x, y, z) && w.getBlock(x, y - 1, z) !== B.water) return [x, y, z];
  }
  throw new Error('no dry approach to the camp');
}

test('the camp puts everything the opening hour needs on the ground', () => {
  const s = buildStarterStructures();
  const placed = new Set(s.edits.values());
  for (const [name, id] of [['a fire to cook at', B.campfire], ['a workbench', B.workbench],
    ['a bedroll', B.bed], ['the head of that bedroll', B.bed_head],
    ['a chest', B.chest_block], ['canvas for the tent', B.white_wool]]) {
    assert.ok(placed.has(id), `the camp is missing ${name}`);
  }
  // Exactly one bed, and exactly one of each half of it. Two beds at the camp
  // would mean the tent got stamped twice; a head with no foot is half a bed.
  const count = (id) => [...s.edits.values()].filter((v) => v === id).length;
  assert.equal(count(B.bed), 1, 'one bedroll');
  assert.equal(count(B.bed_head), 1, 'and one head to it');
  // And nothing a town would have. Scoped to the camp's own ground rather than
  // the whole of the hand-built world — the Frostwatch, two hundred blocks east,
  // is entitled to its forge. This is the assertion that keeps the camp a camp
  // when someone is tempted to add "just a small shop".
  const near = new Set();
  for (const [k, id] of s.edits) {
    const [x, , z] = k.split(',').map(Number);
    if (Math.hypot(x - 4, z - 4) <= 16) near.add(id);
  }
  for (const [name, id] of [['a furnace', B.furnace], ['an anvil', B.anvil_block],
    ['a loom', B.loom_block], ['an alchemy table', B.alchemy_table]]) {
    assert.ok(!near.has(id), `the camp should not come with ${name} — you build those`);
  }
});

// You have got to a block if you can stand in it, on it, or next to it. The
// exact cell is the wrong question for furniture: a bed has a collision height,
// so world.groundNear — which is what the real pathfinder walks on — will never
// stand you INSIDE one, and you sleep by clicking the bed anyway (main.js
// tryInteract). Asking for the cell itself passed only by accident while the
// tent's ridge was low enough to deny the headroom to stand on the bedroll.
const gotTo = (seen, [x, y, z]) => seen.has(`${x},${y},${z}`) || seen.has(`${x},${y + 1},${z}`)
  || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen.has(`${x + dx},${y},${z + dz}`));

test('you can walk into the tent and reach the bedroll', () => {
  const w = campWorld();
  const s = buildStarterStructures();
  // Find the bed in the real world rather than trusting the authored numbers.
  let bed = null;
  for (const [k, id] of s.edits) {
    if (id !== B.bed) continue;
    const [x, y, z] = k.split(',').map(Number);
    bed = [x, y, z];
  }
  assert.ok(bed, 'the camp has a bedroll to find');
  assert.equal(w.getBlock(bed[0], bed[1], bed[2]), B.bed, 'and it survived generation');

  const start = approach(w);

  const seen = reachFrom(w, start[0], start[1], start[2]);
  assert.ok(seen.size > 200, `the sweep actually went somewhere (${seen.size} cells)`);
  assert.ok(gotTo(seen, bed), 'the bedroll is inside a tent you cannot walk into');
});

test('every tent in the camp is one you can get inside', () => {
  const w = campWorld();
  const s = buildStarterStructures();
  const seen = reachFrom(w, ...approach(w));

  // A tent is canvas over a plank floor, so find them by their floors: each
  // connected patch of authored planks at ground level is one tent's footprint.
  // Deriving them rather than hard-coding three means adding a fourth tent is
  // covered the day it is added, and a tent that stops being enterable fails
  // here even if nobody remembers to update this file.
  // Scoped to the camp's own ground: the Frostwatch hut two hundred blocks east
  // also has a plank floor, and it is not walkable-to from here by design.
  const [camx, , camz] = s.markers.camp;
  const floors = new Map();
  for (const [k, id] of s.edits) {
    if (id !== B.planks) continue;
    const [x, y, z] = k.split(',').map(Number);
    if (Math.hypot(x - camx, z - camz) > 24) continue;
    floors.set(`${x},${z}`, y);
  }
  const groups = [];
  const taken = new Set();
  for (const k of floors.keys()) {
    if (taken.has(k)) continue;
    const group = [];
    const q = [k];
    taken.add(k);
    while (q.length) {
      const cur = q.pop();
      const [cx, cz] = cur.split(',').map(Number);
      group.push([cx, floors.get(cur), cz]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${cx + dx},${cz + dz}`;
        if (floors.has(nk) && !taken.has(nk)) { taken.add(nk); q.push(nk); }
      }
    }
    groups.push(group);
  }
  assert.ok(groups.length >= 3, `the camp has at least three tents (found ${groups.length})`);

  for (const group of groups) {
    // The middle of a tent is the cell you have to be able to stand in — the
    // edges are under the canvas where the roof comes down to the floor.
    const mx = Math.round(group.reduce((a, g) => a + g[0], 0) / group.length);
    const mz = Math.round(group.reduce((a, g) => a + g[2], 0) / group.length);
    const y = group[0][1] + 1;
    assert.ok(gotTo(seen, [mx, y, mz]),
      `the tent floored around ${mx},${mz} is one you cannot get into`);
  }
});

test('the fire, the bench and the footlocker are all reachable too', () => {
  const w = campWorld();
  const s = buildStarterStructures();
  const start = approach(w);
  const seen = reachFrom(w, start[0], start[1], start[2]);

  // Each of these is a block you STAND BESIDE, so the test is whether any of the
  // four neighbouring cells was reached — you never stand inside a campfire.
  const beside = (x, y, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .some(([dx, dz]) => seen.has(`${x + dx},${y},${z + dz}`));

  const find = (id) => {
    for (const [k, v] of s.edits) if (v === id) return k.split(',').map(Number);
    return null;
  };
  for (const [name, id] of [['the fire', B.campfire], ['the workbench', B.workbench],
    ['the footlocker', B.chest_block]]) {
    const at = find(id);
    assert.ok(at, `${name} is placed`);
    assert.ok(beside(at[0], at[1], at[2]), `${name} at ${at} cannot be walked up to`);
  }
});

test('you wake up standing on solid ground, not inside the tent wall', () => {
  const w = campWorld();
  const s = buildStarterStructures();
  const [sx, , sz] = s.markers.spawn;
  const y = w.surfaceAt(sx, sz) + 1;
  assert.ok(walkable(w, sx, y, sz), 'the spawn cell is somewhere a body fits');
  // …and it is close enough to the fire to see it, which is the whole point of
  // spawning at a camp rather than in a field.
  const fire = [...s.edits].find(([, v]) => v === B.campfire)[0].split(',').map(Number);
  assert.ok(Math.hypot(sx - fire[0], sz - fire[2]) < 12,
    'you should wake within sight of the fire');
});
