// Player collision: the step-up that makes stairs and one-block risers walkable.
//
// This is guarding a real defect. The pathfinder (js/game/pathfind.js) routes
// over anything `ny - cur.y <= 1`, the roads grade to a maximum one-block step,
// and every stair flight in the town is one-block risers — but the collider had
// no step-up at all. Its WALKOVER was 0.2, so a slab stopped you dead, and
// SHAPE_COLLISION.stairs is 1, so a stair was a full cube. Click-to-move worked
// (it hops); walking in by hand did not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../../js/player/player.js';
import { World } from '../../js/world/world.js';
import { B } from '../../js/world/blocks.js';
import { initSlabSet } from '../../js/world/world.js';
import { buildStarterStructures } from '../../js/world/structures.js';
import { allSettlements } from '../../js/world/settlements.js';

// A world made of whatever `solidAt` says, so a case reads as its own shape.
// `stepAt` says which of those cells are STAIRS OR SLABS — the only shapes you
// walk up. Default: nothing is, so a case must opt in, which keeps the "a full
// block is a wall" cases honest.
const stub = (solidAt, stepAt = () => false) => ({
  collisionHeight: (x, y, z) => solidAt(x, y, z),
  isStep: (x, y, z) => solidAt(x, y, z) > 0 && stepAt(x, y, z),
  isWater: () => false,
  getBlock: () => B.air,
});

// Drive horizontal motion the way update() does: X then Z, small sub-steps.
const walk = (p, world, dx, dz, steps = 40) => {
  for (let i = 0; i < steps; i++) {
    p.moveAxis(world, dx, 0, 0);
    p.moveAxis(world, 0, 0, dz);
  }
};

test('a one-block stair is walked up, not bumped into', () => {
  // floor at y=63 (top 64); a STAIR one block higher from x>=10
  const world = stub((x, y) => (y <= 63 || (x >= 10 && y === 64) ? 1 : 0),
                     (x, y) => x >= 10 && y === 64);
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0);

  assert.ok(p.x > 10.5, `walked onto the step (x=${p.x.toFixed(2)}, expected past 10.5)`);
  assert.ok(Math.abs(p.y - 65) < 0.01, `stands on top of the step (y=${p.y.toFixed(3)}, expected 65)`);
});

test('a full staircase is walked up without jumping', () => {
  // five one-block risers: each x from 10..14 is one block taller than the last
  const world = stub((x, y) => {
    if (y <= 63) return 1;
    if (x < 10) return 0;
    return y <= 63 + Math.min(x - 9, 5) ? 1 : 0;
  }, (x, y) => x >= 10 && y > 63);
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0, 120);

  assert.ok(p.x > 15, `cleared the flight (x=${p.x.toFixed(2)})`);
  assert.ok(Math.abs(p.y - 69) < 0.01, `stands on the top tread (y=${p.y.toFixed(3)}, expected 69)`);
});

test('a two-block wall is still a wall — step-up is not climbing', () => {
  const world = stub((x, y) => (y <= 63 || (x >= 10 && y <= 65) ? 1 : 0),
                     () => true);      // even declared steppable, two blocks is too tall
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0);

  assert.ok(p.x < 10, `stopped against the wall (x=${p.x.toFixed(2)}, expected below 10)`);
  assert.ok(Math.abs(p.y - 64) < 0.01, `did not climb (y=${p.y.toFixed(3)})`);
});

test('you cannot step up in mid-air — only off the ground', () => {
  const world = stub((x, y) => (y <= 63 || (x >= 10 && y === 64) ? 1 : 0),
                     (x, y) => x >= 10 && y === 64);
  const p = new Player();
  p.x = 8.5; p.y = 64.5; p.z = 0.5; p.onGround = false; p.vy = -2;

  walk(p, world, 0.08, 0);

  assert.ok(p.x < 10, `airborne, so the step blocks (x=${p.x.toFixed(2)})`);
});

test('a step into a space with no headroom is refused, not clipped into', () => {
  // the step is there, but a ceiling sits right above it
  const world = stub((x, y) => {
    if (y <= 63) return 1;
    if (x >= 10 && y === 64) return 1;
    if (x >= 10 && y === 65) return 1;   // ceiling directly on the tread
    return 0;
  }, (x, y) => x >= 10 && y === 64);
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0);

  assert.ok(p.x < 10, `refused the step it could not stand on (x=${p.x.toFixed(2)})`);
  assert.ok(Math.abs(p.y - 64) < 0.01, `stayed put (y=${p.y.toFixed(3)})`);
});

test('a full block is NOT walked up — you jump those', () => {
  // The whole point of restricting the step-up. A kerb, a ledge, a one-block
  // terrain rise: all walls you jump. Only a stair or a slab is a step.
  const world = stub((x, y) => (y <= 63 || (x >= 10 && y === 64) ? 1 : 0));  // nothing steppable
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0);

  assert.ok(p.x < 10, `a plain block stops you (x=${p.x.toFixed(2)})`);
  assert.ok(Math.abs(p.y - 64) < 0.01, `and you do not rise (y=${p.y.toFixed(3)})`);
});

test('a real staircase is climbed by walking at it', () => {
  // Not a stub and not a rule re-implementation: put a real Player on the ground
  // floor of a real house and push it at the stair, then check it ends up on the
  // upper storey. This is the case the user reported.
  //
  // It used to test Brookhollow's houses. Brookhollow is gone — you start at a
  // camp now — so it tests the houses the world actually builds: a procedural
  // town out on the roads (js/world/settlements.js), which is where every
  // multi-storey building in the game comes from. Same collider, same question.
  initSlabSet();
  const world = new World(20260725);
  // Several towns, not one: a small settlement only has two multi-storey houses
  // in it, which is too thin a sample to prove anything about a stair builder.
  const towns = allSettlements(world.gen, 3).slice(0, 4);
  assert.ok(towns.length >= 2, `towns within reach to test (${towns.length})`);

  const byName = new Map();
  for (const town of towns) {
    // Load the chunks the town stands in, plus a ring, so no wall is missing.
    const c0x = (town.minX - 8) >> 4, c1x = (town.maxX + 8) >> 4;
    const c0z = (town.minZ - 8) >> 4, c1z = (town.maxZ + 8) >> 4;
    for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) world.ensureChunk(cx, cz);
    for (const r of town.rooms) {
      const id = `${town.name}/${r.name}`;   // house names repeat between towns
      if (!byName.has(id)) byName.set(id, []);
      byName.get(id).push(r);
    }
  }

  const climbed = [], failed = [];
  for (const [name, rooms] of byName) {
    const g = rooms.find((r) => r.storey === 0), u = rooms.find((r) => r.storey === 1);
    if (!g || !u) continue;
    const floorY = g.y, upperY = u.y;   // procedural rooms are already real-world y

    // Explore the house the way a player does: from each stance try walking a
    // short burst in each of the four directions using the REAL collider, and
    // keep wherever that puts you. A walker is allowed to turn — a flight with a
    // landing or a newel stair is a perfectly good stair — so this asks only
    // "can the body physically get up there", which is the actual complaint.
    const key = (p) => `${Math.floor(p.x)},${Math.round(p.y)},${Math.floor(p.z)}`;
    const seen = new Set();
    // Seed from EVERY cell of the ground-floor room, not one corner of it. A
    // corner can be a wall, a hearth or the wrong wing of an L-shaped house, and
    // then the walk fails for want of a starting place rather than for want of a
    // stair — which is exactly what it looked like when this was pointed at
    // procedural towns instead of the old hand-built ones.
    const queue = [];
    for (let x = g.x0; x <= g.x1; x++) for (let z = g.z0; z <= g.z1; z++) queue.push([x + 0.5, floorY, z + 0.5]);
    let best = floorY;
    while (queue.length && seen.size < 12000) {
      const [qx, qy, qz] = queue.shift();
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = new Player();
        p.x = qx; p.y = qy; p.z = qz; p.onGround = true; p.vy = -0.01;
        for (let i = 0; i < 16; i++) {           // ~1.1 blocks of travel
          p.moveAxis(world, dx * 0.07, 0, 0);
          p.moveAxis(world, 0, 0, dz * 0.07);
          p.moveAxis(world, 0, -0.25, 0);        // let gravity settle it onto a tread
        }
        const k = key(p);
        if (seen.has(k)) continue;
        seen.add(k);
        if (p.y > best) best = p.y;
        queue.push([p.x, p.y, p.z]);
      }
    }
    (best >= upperY - 0.51 ? climbed : failed).push(`${name} reached ${best.toFixed(1)} of ${upperY}`);
  }

  assert.ok(climbed.length + failed.length >= 5,
    `should have found multi-storey houses to test (${climbed.length + failed.length})`);
  assert.deepEqual(failed, [], `${failed.length} staircases could not be walked up`);
});
