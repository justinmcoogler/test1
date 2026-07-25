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
import { TOWN_PLAN } from '../../js/world/town.js';

// A world made of whatever `solidAt` says, so a case reads as its own shape.
const stub = (solidAt) => ({
  collisionHeight: (x, y, z) => solidAt(x, y, z),
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

test('a one-block step is walked up, not bumped into', () => {
  // floor at y=63 (top 64); a step one block higher from x>=10
  const world = stub((x, y) => (y <= 63 || (x >= 10 && y === 64) ? 1 : 0));
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
  });
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0, 120);

  assert.ok(p.x > 15, `cleared the flight (x=${p.x.toFixed(2)})`);
  assert.ok(Math.abs(p.y - 69) < 0.01, `stands on the top tread (y=${p.y.toFixed(3)}, expected 69)`);
});

test('a two-block wall is still a wall — step-up is not climbing', () => {
  const world = stub((x, y) => (y <= 63 || (x >= 10 && y <= 65) ? 1 : 0));
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0);

  assert.ok(p.x < 10, `stopped against the wall (x=${p.x.toFixed(2)}, expected below 10)`);
  assert.ok(Math.abs(p.y - 64) < 0.01, `did not climb (y=${p.y.toFixed(3)})`);
});

test('you cannot step up in mid-air — only off the ground', () => {
  const world = stub((x, y) => (y <= 63 || (x >= 10 && y === 64) ? 1 : 0));
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
  });
  const p = new Player();
  p.x = 8.5; p.y = 64; p.z = 0.5; p.onGround = true; p.vy = -0.01;

  walk(p, world, 0.08, 0);

  assert.ok(p.x < 10, `refused the step it could not stand on (x=${p.x.toFixed(2)})`);
  assert.ok(Math.abs(p.y - 64) < 0.01, `stayed put (y=${p.y.toFixed(3)})`);
});

test('a real Brookhollow staircase is climbed by walking at it', () => {
  // Not a stub and not a rule re-implementation: put a real Player on the ground
  // floor of a real house and push it at the stair, then check it ends up on the
  // upper storey. This is the case the user reported.
  initSlabSet();
  const struct = buildStarterStructures();
  const lift = struct.npcs.find((n) => n.id === 'maren').y - TOWN_PLAN.marenAuthoredY;
  const world = new World(20260725);
  for (let cx = -3; cx <= 2; cx++) for (let cz = -3; cz <= 2; cz++) world.ensureChunk(cx, cz);

  const byName = new Map();
  for (const r of TOWN_PLAN.rooms) {
    if (!byName.has(r.name)) byName.set(r.name, []);
    byName.get(r.name).push(r);
  }

  const climbed = [], failed = [];
  for (const [name, rooms] of byName) {
    const g = rooms.find((r) => r.storey === 0), u = rooms.find((r) => r.storey === 1);
    if (!g || !u) continue;
    const floorY = g.y + lift, upperY = u.y + lift;

    // Explore the house the way a player does: from each stance try walking a
    // short burst in each of the four directions using the REAL collider, and
    // keep wherever that puts you. A walker is allowed to turn — a flight with a
    // landing or a newel stair is a perfectly good stair — so this asks only
    // "can the body physically get up there", which is the actual complaint.
    const key = (p) => `${Math.floor(p.x)},${Math.round(p.y)},${Math.floor(p.z)}`;
    const seen = new Set();
    const queue = [[g.x0 + 0.5, floorY, g.z0 + 0.5]];
    let best = floorY;
    while (queue.length && seen.size < 4000) {
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

  assert.ok(climbed.length + failed.length >= 6, 'should have found multi-storey houses to test');
  assert.deepEqual(failed, [], `${failed.length} staircases could not be walked up`);
});
