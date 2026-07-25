// Endless arterial roads + waystones (docs/WORLD_PLAN.md phase 5).
// Guards the four things the roads promise: they exist on every compass point
// however far you walk, they are a pure function of the seed, they never step
// more than one block (so you can always walk them), and a waystone stands
// every 256 blocks. Plus the two things they must NOT do: depend on which
// chunks generated first, or touch Brookhollow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world/world.js';
import { WorldGen, CHUNK } from '../../js/world/worldgen.js';
import {
  roadsFor, ARTERIALS, ROAD_START, WAYSTONE_SPACING, alongOf,
} from '../../js/world/roads.js';
import { B } from '../../js/world/blocks.js';

// What the running surface can be made of. Deliberately excludes the shoulder's
// bare subsoil, the bridge parapets and the waystone furniture — those are not
// lane, and a test that walked them would be measuring the wrong thing.
// B.planks is here because a water crossing is a TIMBER bridge: plank deck,
// fenced handrails, piles driven to the bed. It used to be a stone causeway.
const PAVING = new Set([B.cobble, B.mossy_cobble, B.gravel, B.stone, B.stone_brick, B.planks]);

// Everything js/world/roads.js is capable of writing — paving, bed, shoulder
// face, bridge parapet, waystone furniture, and the air a cutting leaves behind.
// If none of these turns up where the town built something, the road pass did
// not touch the town.
const ROAD_LAID = new Set([
  B.air, B.cobble, B.mossy_cobble, B.gravel, B.stone, B.stone_brick, B.dirt,
  B.cobble_wall, B.torch_post, B.planks_slab, B.planks_fence, B.sign,
]);

// The height you would stand at on a road column, or -1 if you couldn't. The
// road's own profile says where the surface should be; the WORLD has to agree
// that there is something solid there with two clear blocks over it. Columns
// carrying waystone furniture or a bridge parapet report -1 — they are street
// furniture, not lane, and you walk around them.
function laneY(w, roads, dir, x, z) {
  const y = roads.gradeAt(alongOf(dir, x, z));
  if (w.collisionHeight(x, y, z) === 0) return -1;
  if (w.collisionHeight(x, y + 1, z) > 0 || w.collisionHeight(x, y + 2, z) > 0) return -1;
  return y;
}

// Generate every chunk a stretch of arterial passes through, and report the
// world-space bounding box of that stretch.
function loadStretch(w, dir, sFrom, sTo) {
  const roads = roadsFor(w.gen);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let s = sFrom; s <= sTo; s++) {
    for (let a = -8; a <= 8; a += 4) {
      const c = roads.column(w.gen, dir, s, a);
      if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0];
      if (c[1] < z0) z0 = c[1]; if (c[1] > z1) z1 = c[1];
    }
  }
  for (let cx = x0 >> 4; cx <= x1 >> 4; cx++) for (let cz = z0 >> 4; cz <= z1 >> 4; cz++) w.ensureChunk(cx, cz);
  return { x0, x1, z0, z1 };
}

test('an arterial runs on every compass point, however far out you walk', () => {
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  for (let d = 0; d < ARTERIALS; d++) {
    for (const s of [200, 640, 1500, 4000]) {
      const c = roads.column(w.gen, d, s, 0);
      const x = c[0], z = c[1];
      w.ensureChunk(x >> 4, z >> 4);
      const y = roads.surfaceY(w.gen, d, alongOf(d, x, z));
      const id = w.getBlock(x, y, z);
      assert.ok(PAVING.has(id), `arterial ${d} at s=${s} (${x},${z},${y}) is paved, got block ${id}`);
      assert.ok(w.collisionHeight(x, y, z) > 0, `arterial ${d} at s=${s} carries your weight`);
      assert.equal(w.getBlock(x, y + 1, z), B.air, `arterial ${d} at s=${s} has headroom`);
      assert.equal(w.getBlock(x, y + 2, z), B.air, `arterial ${d} at s=${s} has 2 blocks of headroom`);
      assert.ok(y > 62, `arterial ${d} at s=${s} stays above the waterline (y=${y})`);
    }
  }
});

test('roads are a pure function of the seed — same seed, same road', () => {
  const a = new WorldGen(4242), b = new WorldGen(4242), c = new WorldGen(4243);
  const ra = roadsFor(a), rb = roadsFor(b), rc = roadsFor(c);
  let differs = 0, compared = 0;
  for (let d = 0; d < ARTERIALS; d++) {
    for (let s = ROAD_START; s <= 2000; s += 13) {
      const ca = ra.column(a, d, s, 0), pa = [ca[0], ca[1], ra.surfaceY(a, d, s)];
      const cb = rb.column(b, d, s, 0), pb = [cb[0], cb[1], rb.surfaceY(b, d, s)];
      assert.deepEqual(pa, pb, `arterial ${d} at s=${s} is identical on a second generator`);
      const cc = rc.column(c, d, s, 0);
      compared++;
      if (cc[0] !== ca[0] || cc[1] !== ca[1]) differs++;
    }
  }
  assert.ok(differs > compared * 0.5, `a different seed routes a different road (${differs}/${compared} columns moved)`);
});

test('the same seed generates byte-identical road chunks', () => {
  const a = new World(31337), b = new World(31337);
  const c = roadsFor(a.gen).column(a.gen, 3, 700, 0);
  const cx = c[0] >> 4, cz = c[1] >> 4;
  const A = a.generateChunk(cx, cz).blocks, Bb = b.generateChunk(cx, cz).blocks;
  let road = 0, diff = 0;
  for (let i = 0; i < A.length; i++) {
    if (A[i] !== Bb[i]) diff++;
    if (A[i] === B.cobble || A[i] === B.gravel) road++;
  }
  assert.ok(road > 40, `the sampled chunk really does carry a road (${road} paving blocks)`);
  assert.equal(diff, 0, `${diff} blocks differ between two runs of the same seed`);
});

test('the profile never steps more than one block, over 3000 blocks of every arterial', () => {
  // The guarantee is structural, not statistical: road height is a function of
  // distance-along ALONE, and that function is Lipschitz with slope < 1. Two
  // 4-adjacent columns differ by at most 1 in distance-along, so this sweep
  // covers lateral steps as well as lengthways ones.
  const gen = new WorldGen(20260725);
  const roads = roadsFor(gen);
  const END = ROAD_START + 3000;
  let worst = 0, worstAt = '';
  for (let d = 0; d < ARTERIALS; d++) {
    for (let base = ROAD_START; base < END; base += 300) {
      roads.window(gen, d, base - 1, Math.min(END, base + 300) + 1);
      let prev = roads.gradeAt(base - 1);
      for (let s = base; s <= Math.min(END, base + 300); s++) {
        const y = roads.gradeAt(s);
        const dy = Math.abs(y - prev);
        if (dy > worst) { worst = dy; worstAt = `arterial ${d} at s=${s}: ${prev} → ${y}`; }
        prev = y;
      }
    }
  }
  assert.ok(worst <= 1, `max step along an arterial is ${worst} (${worstAt})`);
});

test('you can actually walk an arterial — the paved lane is one connected surface', () => {
  // Real blocks this time, not the profile. Flood-fill the standable paving
  // from one end of a 300-block stretch using the player's own rule (step up or
  // down at most one block, move on the 4 compass neighbours) and check the
  // flood reaches the far end.
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  const dir = 5, sFrom = ROAD_START + 20, sTo = ROAD_START + 320;
  const box = loadStretch(w, dir, sFrom - 6, sTo + 6);
  roads.window(w.gen, dir, sFrom - 8, sTo + 8);   // one profile for the stretch

  // Sweep the whole lattice in the stretch's bounding box rather than points
  // along the route — a diagonal arterial's columns line up with neither.
  const stand = new Map();               // 'x,z' → y
  let owned = 0;
  for (let x = box.x0; x <= box.x1; x++) {
    for (let z = box.z0; z <= box.z1; z++) {
      if (roads.arterialAt(w.gen, x, z) !== dir) continue;   // the road's own verdict
      owned++;
      const y = laneY(w, roads, dir, x, z);
      if (y >= 0) stand.set(x + ',' + z, y);
    }
  }
  assert.ok(stand.size > 800, `the stretch is properly paved (${stand.size} standable columns)`);
  assert.ok(stand.size > owned * 0.8,
    `almost every road column is standable (${stand.size} of ${owned})`);

  // every neighbouring pair of lane columns is one hop apart
  let worst = 0, worstAt = '';
  for (const [k, y] of stand) {
    const i = k.indexOf(','), x = +k.slice(0, i), z = +k.slice(i + 1);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = stand.get((x + dx) + ',' + (z + dz));
      if (n === undefined) continue;
      const dy = Math.abs(n - y);
      if (dy > worst) { worst = dy; worstAt = `${x},${z} (${y}) vs ${x + dx},${z + dz} (${n})`; }
    }
  }
  assert.ok(worst <= 1, `max step between adjacent lane columns is ${worst} at ${worstAt}`);

  // …and the lane is one piece, not islands
  const startC = roads.column(w.gen, dir, sFrom, 0);
  const startK = startC[0] + ',' + startC[1];
  assert.ok(stand.has(startK), 'the near end of the stretch is standable');
  const seen = new Set([startK]);
  const queue = [startK];
  while (queue.length) {
    const k = queue.pop();
    const i = k.indexOf(','), x = +k.slice(0, i), z = +k.slice(i + 1), y = stand.get(k);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = (x + dx) + ',' + (z + dz);
      if (seen.has(nk)) continue;
      const ny = stand.get(nk);
      if (ny === undefined || Math.abs(ny - y) > 1) continue;
      seen.add(nk); queue.push(nk);
    }
  }
  const endC = roads.column(w.gen, dir, sTo, 0);
  assert.ok(seen.has(endC[0] + ',' + endC[1]),
    `walked ${seen.size} of ${stand.size} lane columns without reaching the far end of the stretch`);
});

test('a waystone stands every 256 blocks along every arterial', () => {
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  let built = 0, ceded = 0;
  for (let d = 0; d < ARTERIALS; d++) {
    for (let n = 1; n <= 4; n++) {
      const c = roads.waystoneColumn(w.gen, d, n);
      const x = c[0], z = c[1];
      const s = alongOf(d, x, z);
      assert.ok(Math.abs(s - n * WAYSTONE_SPACING) < 2,
        `arterial ${d} waystone ${n} sits at the ${n * WAYSTONE_SPACING}-block mark (s=${s.toFixed(2)})`);
      // A waystone declines to build on ground a hand-built site already owns
      // (the pads, Frostwatch, worldgen's own lanes) — the same columns the road
      // itself steps around.
      if (roads.arterialAt(w.gen, x, z) !== d) { ceded++; continue; }
      w.ensureChunk(x >> 4, z >> 4);
      const y = roads.surfaceY(w.gen, d, s);
      assert.equal(w.getBlock(x, y + 1, z), B.stone_brick, `waystone ${d}/${n} has a standing stone`);
      assert.equal(w.getBlock(x, y + 2, z), B.stone_brick, `waystone ${d}/${n} stone is two tall`);
      assert.equal(w.getBlock(x, y + 3, z), B.torch_post, `waystone ${d}/${n} is lit`);
      built++;
    }
  }
  assert.ok(ceded <= 2, `almost every waystone gets to build (${ceded} ceded to hand-built ground)`);
  assert.equal(built + ceded, ARTERIALS * 4, 'every sampled waystone was accounted for');
});

test('waystones appear at that spacing and nowhere in between', () => {
  const w = new World(4242);
  const roads = roadsFor(w.gen);
  const dir = 0, sFrom = ROAD_START, sTo = 700;
  loadStretch(w, dir, sFrom, sTo);
  const marks = [];
  for (let s = sFrom; s <= sTo; s++) {
    for (let a = -4; a <= 4; a += 1) {
      const c = roads.column(w.gen, dir, s, a);
      const x = c[0], z = c[1], at = alongOf(dir, x, z);
      const y = roads.surfaceY(w.gen, dir, at);
      if (w.getBlock(x, y + 3, z) !== B.torch_post) continue;
      const mark = Math.round(at);
      if (!marks.includes(mark)) marks.push(mark);
    }
  }
  assert.ok(marks.length >= 2, `found the waystones along the stretch (${marks.join(', ')})`);
  for (const at of marks) {
    const off = Math.abs(at - Math.round(at / WAYSTONE_SPACING) * WAYSTONE_SPACING);
    assert.ok(off <= 2, `a lit marker at s=${at} is ${off} off the 256-block grid`);
  }
});

test('a road chunk is generatable in isolation — output never depends on load order', () => {
  // The whole design constraint in one assertion: the same chunk, generated
  // alone, generated after its neighbours, and generated after its neighbours
  // in the opposite order, must come out identical.
  const seed = 777;
  const probe = new World(seed);
  const c = roadsFor(probe.gen).column(probe.gen, 6, 512, 0);   // a waystone straddles this
  const cx = c[0] >> 4, cz = c[1] >> 4;

  const solo = new World(seed).generateChunk(cx, cz);
  const fwd = new World(seed), rev = new World(seed);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) fwd.ensureChunk(cx + dx, cz + dz);
  for (let dx = 2; dx >= -2; dx--) for (let dz = 2; dz >= -2; dz--) rev.ensureChunk(cx + dx, cz + dz);

  for (const [label, other] of [['after its neighbours', fwd.getChunk(cx, cz)], ['in reverse order', rev.getChunk(cx, cz)]]) {
    let diff = 0;
    for (let i = 0; i < solo.blocks.length; i++) if (solo.blocks[i] !== other.blocks[i]) diff++;
    assert.equal(diff, 0, `${diff} blocks differ when the chunk is generated ${label}`);
    assert.equal(other.nodes.length, solo.nodes.length, `same node count ${label}`);
    assert.equal(other.spawns.length, solo.spawns.length, `same spawn count ${label}`);
  }
});

test('a regraded column reports its new height — chunk.surfaceH tracks the road', () => {
  // surfaceH is the chunk's record of GROUND height: plants, node stamps and a
  // bridge parapet all sit above it and are deliberately not counted (23% of
  // ordinary terrain columns carry something over their surfaceH). Regrading a
  // column without rewriting it would leave that record describing terrain the
  // road has already cut away.
  const w = new World(12345);
  const roads = roadsFor(w.gen);
  let checked = 0;
  for (const d of [0, 2, 4, 6]) {
    for (const s of [300, 700, 1100]) {
      const c = roads.column(w.gen, d, s, 0);
      const cx = c[0] >> 4, cz = c[1] >> 4;
      const ch = w.ensureChunk(cx, cz);
      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
          if (roads.arterialAt(w.gen, x, z) !== d) continue;
          const h = ch.surfaceH[lz * CHUNK + lx];
          assert.equal(h, roads.surfaceY(w.gen, d, alongOf(d, x, z)),
            `surfaceH at ${x},${z} is the graded road height`);
          assert.ok(w.collisionHeight(x, h, z) > 0,
            `and there is solid ground at that height (${x},${h},${z})`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 500, `checked a good sample of regraded columns (${checked})`);
});

test('the arterials leave Brookhollow alone', () => {
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  // Nothing paved anywhere in the settlement or its approach.
  for (let x = -ROAD_START; x <= ROAD_START; x++) {
    for (let z = -ROAD_START; z <= ROAD_START; z++) {
      if (Math.hypot(x, z) >= ROAD_START) continue;
      assert.equal(roads.arterialAt(w.gen, x, z), -1, `no arterial cuts through ${x},${z}`);
    }
  }
  // No hand-built block anywhere near spawn has been cut away or replaced by
  // anything a road lays down. Scoped to what a road could possibly have done
  // rather than to blanket equality: worldgen's own scatter pass stamps the odd
  // tree canopy over the town, which is nothing to do with roads and not this
  // file's to police.
  for (let cx = -5; cx <= 5; cx++) for (let cz = -5; cz <= 5; cz++) w.ensureChunk(cx, cz);
  let checked = 0;
  for (const [k, id] of w.structure.edits) {
    const i = k.indexOf(','), j = k.indexOf(',', i + 1);
    const x = +k.slice(0, i), y = +k.slice(i + 1, j), z = +k.slice(j + 1);
    if (Math.hypot(x, z) > 80) continue;
    const got = w.getBlock(x, y, z);
    if (got === id) { checked++; continue; }
    assert.ok(!ROAD_LAID.has(got),
      `Brookhollow's block at ${x},${y},${z} was replaced by road material (${got})`);
    checked++;
  }
  assert.ok(checked > 5000, `checked a real sample of the settlement's blocks (${checked})`);
  // …and the plaza the game seats you on is still open, walkable ground rather
  // than a cutting. Counted over the square, not asserted tile by tile, so the
  // town's own lamp posts and planters don't read as damage.
  const [sx, sy, sz] = w.structure.markers.spawn;
  let open = 0, tiles = 0;
  for (let x = sx - 4; x <= sx + 4; x++) {
    for (let z = sz - 4; z <= sz + 4; z++) {
      tiles++;
      const g = w.surfaceAt(x, z);
      // open ground: something to stand on, headroom over it, and still at the
      // settlement's own level rather than the floor of a cutting.
      if (g > 0 && Math.abs(g - sy) <= 4
          && w.collisionHeight(x, g + 1, z) === 0 && w.collisionHeight(x, g + 2, z) === 0) open++;
    }
  }
  assert.ok(open > tiles * 0.8, `the spawn plaza is still open ground (${open} of ${tiles} tiles walkable)`);
});

test('the arterials actually wind — they are not straight lines with a wobble', () => {
  // The roads used to leave spawn essentially straight: 22 blocks of lateral
  // drift over 3000 travelled, which reads as an arrow to the horizon. The
  // ceiling on this is geometric, not cosmetic — the paved corridor is a band
  // measured perpendicular to the compass axis, so a centre line that turns
  // faster than ~0.6 lateral per block travelled makes the pavement pinch.
  const gen = new WorldGen(20260725);
  const roads = roadsFor(gen);
  let maxLat = 0, maxBend = 0;
  for (let dir = 0; dir < 8; dir++) {
    let prev = null;
    for (let s = ROAD_START; s <= 3000; s += 4) {
      const v = roads.wander(gen.seed, dir, s);
      maxLat = Math.max(maxLat, Math.abs(v));
      if (prev !== null) maxBend = Math.max(maxBend, Math.abs(v - prev) / 4);
      prev = v;
    }
  }
  assert.ok(maxLat > 35, `roads should wander well off the bearing (max ${maxLat.toFixed(0)} blocks)`);
  assert.ok(maxBend > 0.25, `and bend noticeably while doing it (steepest ${maxBend.toFixed(2)})`);
  assert.ok(maxBend < 0.6, `but not so fast the paved corridor pinches (steepest ${maxBend.toFixed(2)})`);
});
