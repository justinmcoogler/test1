// The waystone fast-travel network (js/game/waystones.js) — the runtime half of
// the standing stones js/world/roads.js builds along the primary arterials.
//
// Four promises are guarded here: a stone's NAME is a pure function of its column
// (so it survives a reload, a different device and the single-file build); the
// network can find a real stone in a generated world through roads.js's own API
// rather than a copy of its arithmetic; a discovered network survives a
// save/load round trip; and a save written before any of this existed still
// loads. Nothing below mentions the spacing as a number — WAYSTONE_SPACING is
// imported, so moving it in roads.js moves these tests with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world/world.js';
import {
  roadsFor, PRIMARIES, WAYSTONE_SPACING, WAYSTONE_COURSES,
} from '../../js/world/roads.js';
import {
  waystoneName, waystoneOf, waystonesNear, atWaystone, waystoneLanding,
  WaystoneNet, BEARINGS, TOUCH_RADIUS, WAYSTONE_HEIGHT,
} from '../../js/game/waystones.js';

const SEED = 20260725;

// A stone that really stands in this world, with its chunk (and neighbours)
// generated. ensureChunk, never generateChunk — the latter does not cache, and a
// later getBlock would read air out of the void.
function anyStone(w, want = 1) {
  const roads = roadsFor(w.gen);
  const out = [];
  const col = new Int32Array(2);
  for (let d = 0; d < PRIMARIES && out.length < want; d++) {
    for (let n = 1; n <= 3 && out.length < want; n++) {
      const c = roads.waystoneColumn(w.gen, d, n, col);
      const x = c[0], z = c[1];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) w.ensureChunk((x >> 4) + dx, (z >> 4) + dz);
      }
      const ws = waystoneOf(w, d, n);
      if (ws) out.push(ws);
    }
  }
  return out;
}

// ---- naming ----------------------------------------------------------------
test('a waystone name is a pure function of its column', () => {
  // Same column, same name — every time, in any order, with no world involved.
  const a = waystoneName(1024, 17);
  for (let i = 0; i < 50; i++) assert.equal(waystoneName(1024, 17), a);
  // Order of calls cannot leak into a later one.
  waystoneName(-999999, 42);
  waystoneName(0, 0);
  assert.equal(waystoneName(1024, 17), a);
  // Negative and zero columns are ordinary inputs, not edge cases.
  for (const [x, z] of [[0, 0], [-1, -1], [-2048, 4096], [2147480000, -7]]) {
    const n = waystoneName(x, z);
    assert.match(n, /^[A-Z][a-z]+ [A-Z][a-z]+$/, `"${n}" reads as a place name`);
  }
});

test('names spread over the word lists instead of clustering', () => {
  // 5120 possible names; 4000 samples should turn up well over a thousand
  // distinct ones. A hash that fed one word list from a correlated slice of the
  // same bits would collapse this number.
  const seen = new Set();
  for (let i = 0; i < 4000; i++) seen.add(waystoneName(i * 37 - 700, i * 101 + 13));
  assert.ok(seen.size > 1200, `saw ${seen.size} distinct names in 4000 columns`);
  // Neighbouring columns must not share a name, or a stone one block over would
  // read as the same place.
  let same = 0;
  for (let x = -60; x < 60; x++) if (waystoneName(x, 0) === waystoneName(x + 1, 0)) same++;
  assert.equal(same, 0, 'adjacent columns never collide');
});

// ---- finding one in a real world -------------------------------------------
test('the network finds real standing stones on the arterials', () => {
  const w = new World(SEED);
  const stones = anyStone(w, 3);
  assert.ok(stones.length >= 2, `found stones to work with (${stones.length})`);
  const roads = roadsFor(w.gen);
  for (const ws of stones) {
    // It sits on the mile mark roads.js schedules it for…
    const s = roads.along(w.gen, ws.dir, ws.x, ws.z);
    assert.ok(Math.abs(s - ws.n * WAYSTONE_SPACING) < WAYSTONE_SPACING / 2,
      `${ws.name} is at its own mile mark (s=${s.toFixed(1)}, n=${ws.n})`);
    // …and the courses roads.js exports really are standing in the world.
    for (let i = 0; i < WAYSTONE_COURSES.length; i++) {
      assert.equal(w.getBlock(ws.x, ws.y + i, ws.z), WAYSTONE_COURSES[i],
        `${ws.name} course ${i} is standing`);
    }
    assert.ok(BEARINGS[ws.dir], `${ws.name} has a compass bearing`);
    assert.equal(ws.id, `${ws.x},${ws.z}`, 'identity is the column it occupies');
    assert.equal(ws.name, waystoneName(ws.x, ws.z), 'name comes from the column');
  }
  assert.ok(WAYSTONE_HEIGHT >= 4, 'a stone is tall enough to hang a label over');
});

test('touching a stone means standing on the road beside it, not on top of it', () => {
  const w = new World(SEED);
  const [ws] = anyStone(w, 1);
  assert.ok(ws, 'found a stone');
  // Arriving by fast travel puts you on the lane centre; from there the stone
  // must register as touched, or you could teleport to a waystone and not be at
  // one. This is the check that keeps TOUCH_RADIUS honest against the offset
  // roads.js stands the menhir back at.
  const [lx, lz] = waystoneLanding(w, ws);
  assert.ok(atWaystone(ws, lx + 0.5, ws.y, lz + 0.5),
    `the landing (${lx},${lz}) is within touching distance of ${ws.name}`);
  // Down the road is not "at" it, and neither is a cave underneath.
  assert.equal(atWaystone(ws, ws.x + TOUCH_RADIUS + 4, ws.y, ws.z), false);
  assert.equal(atWaystone(ws, ws.x + 0.5, ws.y - 24, ws.z + 0.5), false);
});

test('a wide scan reports the stone you are walking up to, and nothing else', () => {
  const w = new World(SEED);
  const [ws] = anyStone(w, 1);
  assert.ok(ws, 'found a stone');
  const near = waystonesNear(w, ws.x, ws.z, 34);
  assert.equal(near.length, 1, 'exactly one stone in range');
  assert.equal(near[0].id, ws.id);
  // Half a mile down the same road there is no stone in range at all: the mile
  // marks are the only places one stands.
  const roads = roadsFor(w.gen);
  const mid = roads.column(w.gen, ws.dir, (ws.n + 0.5) * WAYSTONE_SPACING, 0, new Int32Array(2));
  assert.equal(waystonesNear(w, mid[0], mid[1], 34).length, 0,
    'nothing between the mile marks');
});

test('two different worlds put their stones in different places', () => {
  const a = anyStone(new World(SEED), 1)[0];
  const b = anyStone(new World(SEED + 1), 1)[0];
  assert.ok(a && b);
  assert.notEqual(a.id, b.id, 'the network is seeded, not fixed');
});

// ---- save round trip -------------------------------------------------------
test('a discovered network survives a save/load round trip', () => {
  const w = new World(SEED);
  const stones = anyStone(w, 3);
  assert.ok(stones.length >= 2, 'found stones to discover');
  const net = new WaystoneNet();
  for (const ws of stones) assert.equal(net.add(ws), true, 'first sighting is a discovery');
  for (const ws of stones) assert.equal(net.add(ws), false, 'a second sighting is not');
  assert.equal(net.size, stones.length);

  // Exactly what main.js writes into the save slot, through JSON like the real
  // localStorage round trip.
  const blob = JSON.parse(JSON.stringify({ waystones: net.serialize() }));
  const back = new WaystoneNet();
  back.deserialize(blob.waystones);

  assert.equal(back.size, net.size);
  for (const ws of stones) {
    const got = back.get(ws.id);
    assert.ok(got, `${ws.name} came back`);
    assert.deepEqual(
      [got.x, got.y, got.z, got.dir, got.n],
      [ws.x, ws.y, ws.z, ws.dir, ws.n],
      'position, road and mile mark all survive',
    );
    // The name is NOT stored — it is recomputed from the column, which is what
    // makes a stone incapable of coming back under a different name.
    assert.equal(got.name, ws.name, 'and it is still the same place');
  }
  assert.deepEqual(back.serialize(), net.serialize(), 'the round trip is a fixed point');
  assert.deepEqual(back.list().map((q) => q.id), net.list().map((q) => q.id), 'order is stable');
});

test('an old save with no waystones loads, and so does a corrupt one', () => {
  const net = new WaystoneNet();
  for (const junk of [undefined, null, [], {}, 'nope', 7, [[1, 2]], [null], [{ x: 1 }]]) {
    net.deserialize(junk);
    assert.equal(net.size, 0, `${JSON.stringify(junk) ?? 'undefined'} loads as an empty network`);
  }
  // A well-formed tuple among the junk is still kept.
  net.deserialize([['bad'], [16, 32, 65, 0, 1], null]);
  assert.equal(net.size, 1);
  assert.equal(net.get('16,32').name, waystoneName(16, 32));
});

test('the network is grouped by road and ordered outward along it', () => {
  const net = new WaystoneNet();
  const mk = (x, z, dir, n) => ({ id: `${x},${z}`, x, z, y: 64, dir, n, name: waystoneName(x, z) });
  for (const w of [mk(9, 9, 2, 3), mk(1, 1, 0, 2), mk(2, 2, 0, 1), mk(3, 3, 2, 1)]) net.add(w);
  assert.deepEqual(net.list().map((q) => [q.dir, q.n]), [[0, 1], [0, 2], [2, 1], [2, 3]]);
});
