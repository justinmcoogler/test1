// Brookhollow has to be a town you can walk into, not a set of façades.
//
// The bug this file exists to stop: the old house builder grew the footprint
// for a jettied upper storey INSIDE the storey loop, then computed the doorway
// from the grown values afterwards. Every two-storey house therefore had its
// door cut a block clear of the ground-floor wall, hanging in mid-air, and no
// opening at all downstairs. You could see the door. You could not use it.
//
// Eyeballing a screenshot will never catch that again, so this proves it: build
// the real world, stand outside the settlement, and flood-fill inward using the
// same movement rules the game's own pathfinder uses (two blocks of headroom,
// step up at most one, drop at most four). Then assert that every free floor
// cell of every room in the town was reached. If a house is sealed, the test
// names it and the cell it could not get to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, initSlabSet } from '../../js/world/world.js';
import { BLOCKS, B } from '../../js/world/blocks.js';
import { buildStarterStructures } from '../../js/world/structures.js';
import { TOWN_PLAN } from '../../js/world/town.js';

const X0 = -45, X1 = 45, Z0 = -45, Z1 = 45, Y0 = 55, Y1 = 104;
const SEEDS = [20260725, 1234567];

function survey(seed) {
  initSlabSet();
  const struct = buildStarterStructures();
  // structures.js lifts every authored coordinate by a private constant. Recover
  // it from an NPC this module pushed rather than hard-coding the number twice.
  const maren = struct.npcs.find((n) => n.id === 'maren');
  assert.ok(maren, 'town.js must still push maren');
  const lift = maren.y - TOWN_PLAN.marenAuthoredY;

  const world = new World(seed);
  for (let cx = -3; cx <= 2; cx++) for (let cz = -3; cz <= 2; cz++) world.ensureChunk(cx, cz);

  // A door counts as passable: the player walks up and swings it open. Anything
  // else with collision — including a slab, a fence or a table leg — does not.
  const open = (x, y, z) => {
    const id = world.getBlock(x, y, z);
    if (BLOCKS[id]?.shape === 'door') return true;
    return world.collisionHeight(x, y, z) === 0;
  };
  // Feet in this cell: something to stand on below, two clear blocks for a body.
  const stand = (x, y, z) => !open(x, y - 1, z) && open(x, y, z) && open(x, y + 1, z);

  const SX = X1 - X0 + 1, SY = Y1 - Y0 + 1, SZ = Z1 - Z0 + 1;
  const idx = (x, y, z) => ((x - X0) * SY + (y - Y0)) * SZ + (z - Z0);
  const inBox = (x, y, z) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1 && z >= Z0 && z <= Z1;
  const seen = new Uint8Array(SX * SY * SZ);
  const queue = [];
  const push = (x, y, z) => {
    if (!inBox(x, y, z) || seen[idx(x, y, z)]) return;
    seen[idx(x, y, z)] = 1; queue.push(x, y, z);
  };

  // Start on open ground well outside the settlement, on every side of it.
  let starts = 0;
  for (const [sx, sz] of [[0, 40], [0, -40], [40, 0], [-40, 0], [30, 30], [-30, -30]]) {
    for (let y = Y1 - 1; y > Y0; y--) if (stand(sx, y, sz)) { push(sx, y, sz); starts++; break; }
  }
  assert.ok(starts >= 4, 'need open ground around the town to start the walk from');

  for (let h = 0; h < queue.length; h += 3) {
    const x = queue[h], y = queue[h + 1], z = queue[h + 2];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      // highest landing first, matching world.groundNear; +1 up, 4 down, and a
      // step up also needs headroom in the column you jump from
      for (let ny = y + 1; ny >= y - 4; ny--) {
        if (!inBox(nx, ny, nz)) continue;
        if (ny > y && !open(x, y + 2, z)) continue;
        if (stand(nx, ny, nz)) { push(nx, ny, nz); break; }
      }
    }
  }
  const reached = (x, y, z) => inBox(x, y, z) && seen[idx(x, y, z)] === 1;
  return { struct, lift, world, stand, open, reached };
}

test('every building in Brookhollow can be walked into from outside the town', () => {
  for (const seed of SEEDS) {
    const { lift, stand, reached } = survey(seed);
    assert.ok(TOWN_PLAN.rooms.length >= 15, 'the town should publish its rooms');
    const sealed = [];
    const thin = [];
    for (const r of TOWN_PLAN.rooms) {
      const y = r.y + lift;
      let floor = 0, got = 0, firstMiss = null;
      for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
        if (!stand(x, y, z)) continue;                 // wall, furniture or stair riser
        floor++;
        if (reached(x, y, z)) got++;
        else if (!firstMiss) firstMiss = [x, y, z];
      }
      const where = `${r.name} storey ${r.storey}`;
      if (floor < 4) thin.push(`${where}: only ${floor} free floor cells — solid-filled?`);
      else if (got === 0) sealed.push(`${where}: SEALED, no way in (e.g. ${firstMiss})`);
      else if (got < floor) sealed.push(`${where}: ${floor - got}/${floor} floor cells cut off (e.g. ${firstMiss})`);
    }
    assert.deepEqual(thin, [], `seed ${seed}: rooms that are not rooms`);
    assert.deepEqual(sealed, [], `seed ${seed}: you cannot get in`);
  }
});

test('every doorway is a real hole with headroom on both sides', () => {
  const { lift, open, reached } = survey(SEEDS[0]);
  assert.ok(TOWN_PLAN.doors.length >= 15, 'every building should register a door');
  const bad = [];
  for (const d of TOWN_PLAN.doors) {
    const y = d.y + lift;
    if (!open(d.x, y, d.z)) bad.push(`${d.name}: doorway blocked at foot level`);
    if (!open(d.x, y + 1, d.z)) bad.push(`${d.name}: doorway blocked at head level`);
    // and you must be able to stand on the doorstep, whichever side it is on
    const outside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => reached(d.x + dx, y, d.z + dz));
    if (!outside) bad.push(`${d.name}: nothing reachable stands beside the doorway`);
  }
  assert.deepEqual(bad, []);
});

test('upper storeys are reachable, so the stairs actually go somewhere', () => {
  const { lift, stand, reached } = survey(SEEDS[0]);
  const upper = TOWN_PLAN.rooms.filter((r) => r.storey > 0);
  assert.ok(upper.length >= 8, 'the town should have upper storeys worth climbing to');
  const stranded = [];
  for (const r of upper) {
    const y = r.y + lift;
    let got = 0;
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) if (stand(x, y, z) && reached(x, y, z)) got++;
    if (got < 3) stranded.push(`${r.name} storey ${r.storey}: only ${got} reachable cells upstairs`);
  }
  assert.deepEqual(stranded, []);
});

test('the townsfolk, their chests and every craft station are reachable', () => {
  const { struct, reached, world } = survey(SEEDS[0]);
  const beside = (x, y, z) => reached(x, y, z)
    || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => reached(x + dx, y, z + dz) || reached(x + dx, y + 1, z + dz));
  const bad = [];
  for (const n of struct.npcs) {
    if (Math.hypot(n.x, n.z) > 45) continue;                 // sylla and pip live elsewhere
    if (!beside(n.x, n.y, n.z)) bad.push(`npc ${n.id} at ${n.x},${n.y},${n.z} is walled in`);
  }
  for (const c of struct.chests) {
    if (Math.hypot(c.x, c.z) > 45) continue;
    if (!beside(c.x, c.y, c.z)) bad.push(`chest ${c.id} at ${c.x},${c.y},${c.z} is unreachable`);
  }
  // Crafting has to work on day one, so every station must be usable and dry.
  const STATIONS = ['workbench', 'furnace', 'anvil_block', 'construction_bench', 'loom_block', 'alchemy_table'];
  for (const name of STATIONS) {
    const id = B[name];
    let found = null;
    for (const [k, v] of struct.edits) if (v === id) { found = k.split(',').map(Number); break; }
    assert.ok(found, `${name} must be placed somewhere in the settlement`);
    const [x, y, z] = found;
    if (!beside(x, y, z)) bad.push(`${name} at ${x},${y},${z} cannot be walked up to`);
    let roofed = false;
    for (let yy = y + 1; yy <= y + 12; yy++) if (world.collisionHeight(x, yy, z) > 0) { roofed = true; break; }
    if (!roofed) bad.push(`${name} at ${x},${y},${z} is standing out in the rain`);
  }
  assert.deepEqual(bad, []);
});

test('the town keeps the ids quests and saves depend on', () => {
  const s = buildStarterStructures();
  for (const id of ['maren_chest', 'workshop_chest', 'tam_chest', 'town_storage']) {
    assert.ok(s.chests.some((c) => c.id === id), `chest ${id} must survive`);
  }
  assert.ok(s.npcs.some((n) => n.id === 'maren'));
  assert.ok(s.npcs.some((n) => n.id === 'tam'));
  assert.equal(s.npcs.length, 4, 'town.js pushes exactly two NPCs; structures.js adds sylla and pip');
  assert.ok(s.nodes.filter((n) => n.type === 'farm_plot').length >= 8, 'the allotments are still worked');
  // Compass waypoints live in structures.js; the people they point at live here.
  const near = (a, b, r) => Math.hypot(a[0] - b.x, a[2] - b.z) <= r;
  assert.ok(near(s.markers.cottage, s.npcs.find((n) => n.id === 'maren'), 4), 'maren stands where the compass sends you');
  assert.ok(near(s.markers.stall, s.npcs.find((n) => n.id === 'tam'), 4), 'tam stands where the compass sends you');
});
