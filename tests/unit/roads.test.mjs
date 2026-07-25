// Endless arterial roads + waystones (docs/WORLD_PLAN.md phase 5).
// Guards the four things the roads promise: they exist on every compass point
// however far you walk, they are a pure function of the seed, they never step
// more than one block (so you can always walk them), and a waystone stands
// every WAYSTONE_SPACING blocks. Plus the two things they must NOT do: depend on
// which chunks generated first, or touch Brookhollow.
//
// And the thing the roadside BUILDINGS promise, which is the one that keeps
// getting broken by accident: you can walk into them. See the flood-fill test at
// the bottom of the file, which is the crofts' equivalent of the town's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, initSlabSet } from '../../js/world/world.js';
import { WorldGen, CHUNK, MANOR_PAD, LEARN_MEADOW, FROST_CAMP } from '../../js/world/worldgen.js';
import {
  roadsFor, ARTERIALS, PRIMARIES, ROAD_START, WAYSTONE_SPACING, WAYSTONE_COURSES, alongOf,
} from '../../js/world/roads.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
import { ITEMS } from '../../js/game/items.js';

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
  const y = roads.gradeAt(roads.along(w.gen, dir, x, z));
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
      const y = roads.surfaceY(w.gen, d, roads.along(w.gen, d, x, z));
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

// Load every chunk the 3x3-footed standing stone at (x, z) touches.
function loadStone(w, x, z) {
  for (let cx = (x - 1) >> 4; cx <= (x + 1) >> 4; cx++) {
    for (let cz = (z - 1) >> 4; cz <= (z + 1) >> 4; cz++) w.ensureChunk(cx, cz);
  }
}

test('a waystone stands every 1024 blocks along every PRIMARY arterial', () => {
  // Rare landmarks, not roadside furniture: WAYSTONE_SPACING is the number under
  // test, so the sampled marks are derived from it rather than written out — and
  // the assertion below that no stone stands on the OLD 256 grid is what would
  // catch the constant quietly going back.
  //
  // The secondary lanes that fork off the arterials get none: waystones mark the
  // trunk network you navigate by, and a lane is a byway.
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  let built = 0, ceded = 0;
  for (let d = 0; d < PRIMARIES; d++) {
    for (let n = 1; n <= 4; n++) {
      // `column` hands back reused scratch — copy out before anything else
      // touches the Roads instance.
      const c = roads.waystoneColumn(w.gen, d, n);
      const x = c[0], z = c[1];
      const s = roads.along(w.gen, d, x, z);
      assert.ok(Math.abs(s - n * WAYSTONE_SPACING) < 3,
        `arterial ${d} waystone ${n} sits at the ${n * WAYSTONE_SPACING}-block mark (s=${s.toFixed(2)})`);
      // A waystone declines to build on ground a hand-built site already owns
      // (the pads, Frostwatch, worldgen's own lanes), and it will not wade out
      // onto a bridge — a stone stands on the bank, not on the span, which is
      // why the marker sits clear of the deck rather than on it.
      // `waystoneBaseY` is the builder's own verdict on that, and every ceded
      // stone has to have one of those reasons rather than just be missing.
      const y = roads.waystoneBaseY(w.gen, d, n);
      if (y < 0) {
        ceded++;
        const wet = w.gen.heightAt(x, z) <= 63;
        const owned = [MANOR_PAD, LEARN_MEADOW, FROST_CAMP].some((p) => Math.hypot(x - p.x, z - p.z) < 80)
          || w.gen.pathSet.has(x + ',' + z);
        assert.ok(wet || owned,
          `waystone ${d}/${n} at ${x},${z} ceded for a reason (h=${w.gen.heightAt(x, z)})`);
        continue;
      }
      loadStone(w, x, z);
      for (let i = 0; i < WAYSTONE_COURSES.length; i++) {
        assert.equal(w.getBlock(x, y + 1 + i, z), WAYSTONE_COURSES[i],
          `waystone ${d}/${n} course ${i} at (${x},${y + 1 + i},${z})`);
      }
      built++;
    }
  }
  assert.equal(built + ceded, PRIMARIES * 4, 'every sampled waystone was accounted for');
  assert.ok(built >= PRIMARIES * 2, `most sampled waystones get to build (${built} of ${PRIMARIES * 4})`);
});

test('a waystone READS as a waystone: broad base, narrow shaft, banded, lit', () => {
  // The old marker was two stone bricks and a torch, which is a bollard. What
  // makes a menhir legible from the road is the silhouette, so that is what is
  // asserted: a base course three blocks across, a shaft one block across, a
  // clear taper between them, more than one material up the shaft so it is not a
  // smooth pillar, and a light in it.
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  let checked = 0;
  for (let d = 0; d < PRIMARIES; d++) {
    for (let n = 1; n <= 3; n++) {
      const c = roads.waystoneColumn(w.gen, d, n);
      const x = c[0], z = c[1];
      const y = roads.waystoneBaseY(w.gen, d, n);
      if (y < 0) continue;
      loadStone(w, x, z);

      // Height: it stands well clear of a player, not at knee height.
      assert.ok(WAYSTONE_COURSES.length >= 6,
        `the stone is several blocks tall (${WAYSTONE_COURSES.length} courses)`);

      // The base course is a full 3x3 of solid stone…
      let base = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) if (w.collisionHeight(x + dx, y + 1, z + dz) > 0) base++;
      }
      assert.equal(base, 9, `waystone ${d}/${n} has a broad base course (${base}/9 cells)`);

      // …and the body above it is a SLAB: broad one way, one block thick the
      // other. This is the assertion the first cut of the stone failed — it was
      // one block square all the way up, which passes every other check here
      // (tall, banded, lit, clear of the lane) and still read from the road as a
      // chimney. Nothing but width tells those two apart, so width is measured.
      assert.notEqual(w.getBlock(x, y + 3, z), B.air, `waystone ${d}/${n} body continues above the base`);
      const solid = (bx, by, bz) => w.getBlock(bx, by, bz) !== B.air;
      let wide = 0, thick = 0;
      for (let k = -1; k <= 1; k++) {
        if (solid(x + k, y + 3, z)) wide++;
        if (solid(x, y + 3, z + k)) thick++;
      }
      // One axis three across, the other one — in whichever order the road's
      // bearing put them.
      const [broad, edge] = wide >= thick ? [wide, thick] : [thick, wide];
      assert.equal(broad, 3, `waystone ${d}/${n} body has a broad face (${broad} across)`);
      assert.equal(edge, 1, `waystone ${d}/${n} body is one block thick through (${edge})`);
      // The corners stay empty, so it is a slab and not a 3x3 block of masonry.
      let corners = 0;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (solid(x + dx, y + 3, z + dz)) corners++;
      }
      assert.equal(corners, 0, `waystone ${d}/${n} is a slab, not a tower (${corners} corners filled)`);
      // And it tapers to a point: the crown is one block square again, so the
      // stone narrows against the sky instead of ending in a flat wall.
      let crown = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          if (solid(x + dx, y + WAYSTONE_COURSES.length, z + dz)) crown++;
        }
      }
      assert.equal(crown, 0, `waystone ${d}/${n} tapers to a one-block crown (${crown} cells still wide)`);

      // Carved, not cast: the shaft is banded rather than one material.
      const shaft = new Set();
      for (let i = 2; i < WAYSTONE_COURSES.length; i++) shaft.add(w.getBlock(x, y + 1 + i, z));
      assert.ok(shaft.size >= 3,
        `waystone ${d}/${n} shaft is dressed stone, not one smooth pillar (${shaft.size} materials)`);

      // Lit, so it is findable at night.
      let glow = 0;
      for (let i = 0; i < WAYSTONE_COURSES.length; i++) {
        glow = Math.max(glow, BLOCKS[w.getBlock(x, y + 1 + i, z)]?.emissive ?? 0);
      }
      assert.ok(glow >= 0.5, `waystone ${d}/${n} carries a light (brightest course ${glow})`);

      // And it stands BESIDE the lane, not in it: the road is still walkable past
      // it, with two clear blocks over the paving.
      const road = roads.column(w.gen, d, n * WAYSTONE_SPACING, 0);
      const rx = road[0], rz = road[1];
      loadStone(w, rx, rz);
      const ry = roads.surfaceY(w.gen, d, roads.along(w.gen, d, rx, rz));
      assert.ok(w.collisionHeight(rx, ry, rz) > 0, `waystone ${d}/${n}: the lane past it is paved`);
      assert.equal(w.collisionHeight(rx, ry + 1, rz), 0, `waystone ${d}/${n} does not block the lane`);
      assert.equal(w.collisionHeight(rx, ry + 2, rz), 0, `waystone ${d}/${n} leaves headroom on the lane`);
      checked++;
    }
  }
  assert.ok(checked >= 12, `looked at a real sample of stones (${checked})`);
});

test('waystones appear at that spacing and nowhere in between', () => {
  const w = new World(4242);
  const roads = roadsFor(w.gen);
  const dir = 0;
  // A window wide enough to hold exactly ONE mark, swept block by block. If the
  // spacing ever shrinks back, the sweep finds extra stones and this fails.
  const mark = WAYSTONE_SPACING;
  const sFrom = mark - 150, sTo = mark + 150;
  loadStretch(w, dir, sFrom, sTo);
  roads.window(w.gen, dir, sFrom - 2, sTo + 2);
  const found = [];
  for (let s = sFrom; s <= sTo; s++) {
    for (let a = -7; a <= 7; a++) {
      const c = roads.column(w.gen, dir, s, a);
      const x = c[0], z = c[1];
      const at = roads.along(w.gen, dir, x, z);
      if (at < sFrom || at > sTo) continue;
      const y = roads.gradeAt(at);
      // The lantern course is the stone's signature; nothing else the road pass
      // lays stands a light on a graded verge.
      if (w.getBlock(x, y + 1 + WAYSTONE_COURSES.indexOf(B.sea_lantern), z) !== B.sea_lantern) continue;
      const key = `${x},${z}`;
      if (!found.includes(key)) found.push(key);
    }
  }
  assert.equal(found.length, 1, `exactly one waystone in the window (${found.join(' | ')})`);

  // …and none on the grid the old spacing used, which is the actual regression.
  for (const s of [256, 512, 768, mark + 256, mark + 512]) {
    const c = roads.column(w.gen, dir, s, 0);
    const x = c[0], z = c[1];
    for (let dcx = -1; dcx <= 1; dcx++) for (let dcz = -1; dcz <= 1; dcz++) w.ensureChunk((x >> 4) + dcx, (z >> 4) + dcz);
    for (let dx = -7; dx <= 7; dx++) {
      for (let dz = -7; dz <= 7; dz++) {
        for (let y = 60; y < 140; y++) {
          assert.notEqual(w.getBlock(x + dx, y, z + dz), B.sea_lantern,
            `nothing stands at the old 256-block mark s=${s} (found a light at ${x + dx},${y},${z + dz})`);
        }
      }
    }
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
          assert.equal(h, roads.surfaceY(w.gen, d, roads.along(w.gen, d, x, z)),
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

test('the arterials leave the starting camp alone', () => {
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
  // tree canopy over the camp, which is nothing to do with roads and not this
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
      `the camp's block at ${x},${y},${z} was replaced by road material (${got})`);
    checked++;
  }
  // The camp is a fraction of the size of the town that used to stand here, so
  // the sample is far smaller — but the mine, the pond, the brook and the
  // Rootgrave stair are all still inside the 80-block disc, and a road cutting
  // any of them would be caught. This number is the camp's real footprint, not
  // a threshold picked to pass.
  assert.ok(checked > 1500, `checked a real sample of the hand-built blocks (${checked})`);
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

test('the arterials actually wind — and the lane survives the bends', () => {
  // The measure is BOW WITHIN A SIGHTLINE, not total drift. An arterial that
  // accumulates 49 blocks of offset over 3000 travelled still looks like an
  // arrow, because gradual drift is only ~6 blocks of deviation across the ~60
  // blocks you can see before fog — which the eye reads as straight. What makes
  // a road look like it winds is a kink inside every sightline.
  const gen = new WorldGen(20260725);
  const roads = roadsFor(gen);
  let bow = 0;
  for (let d = 0; d < ARTERIALS; d++) {
    for (let s0 = 90; s0 < 2000; s0 += 10) {
      const a = roads.wander(gen.seed, d, s0), b = roads.wander(gen.seed, d, s0 + 60);
      for (let k = 6; k < 60; k += 3) {
        const chord = a + (b - a) * (k / 60);
        bow = Math.max(bow, Math.abs(roads.wander(gen.seed, d, s0 + k) - chord));
      }
    }
  }
  assert.ok(bow > 10, `the road should bow visibly inside one sightline (max ${bow.toFixed(1)} blocks over 60)`);

  // The ceiling on winding is NOT a slope number — an earlier version of this
  // test asserted one that had been reasoned about rather than measured, and it
  // was wrong by a factor of two. The real constraint is that the paved lane
  // stays a lane through the bends, so measure that directly: walk the centre
  // line and require paving around it, except where the road deliberately
  // declines to build (the hand-built pads, the camp, worldgen's baked lanes).
  const w = new World(20260725);
  const r2 = roadsFor(w.gen);
  const near = (x, z, p, rad) => Math.hypot(x - p.x, z - p.z) < rad;
  const thin = [];
  for (let d = 0; d < ARTERIALS; d++) {
    for (let s = 90; s <= 900; s += 7) {
      const c = r2.column(w.gen, d, s, 0), x = c[0], z = c[1];
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) w.ensureChunk((x + dx) >> 4, (z + dz) >> 4);
      const y = r2.surfaceY(w.gen, d, r2.along(w.gen, d, x, z));
      let n = 0;
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        for (const yy of [y - 1, y, y + 1]) if (PAVING.has(w.getBlock(x + dx, yy, z + dz))) { n++; break; }
      }
      if (n >= 8) continue;
      if (near(x, z, MANOR_PAD, 40) || near(x, z, LEARN_MEADOW, 40) || near(x, z, FROST_CAMP, 82)
          || w.gen.pathSet.has(x + ',' + z)) continue;      // declines to build here, by design
      thin.push(`${d}@s${s} (${x},${z}) only ${n}/25 paved`);
    }
  }
  assert.deepEqual(thin.slice(0, 6), [], `${thin.length} points where the bend thinned the lane`);
});

test('secondary lanes fork off the arterials, meet their parent, and run on forever', () => {
  // "Some endless": eight lanes leave the primaries at FORK_AT and never end.
  // Each is its own closed-form road in a frame whose ORIGIN sits on its parent's
  // centre line, which is what makes it a road leaving a road rather than another
  // ray out of spawn — and what makes it seed-dependent, since the parent wanders.
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  for (let d = PRIMARIES; d < ARTERIALS; d++) {
    const par = d - PRIMARIES;
    // `column` hands back reused scratch, so copy out of it before anything else
    // touches the Roads instance — generating a chunk certainly does.
    const start = roads.column(w.gen, d, 0, 0);
    const sx = start[0], sz = start[1];
    assert.equal(roads.arterialAt(w.gen, sx, sz), par,
      `lane ${d} begins on arterial ${par} (at ${sx},${sz})`);

    // …and it keeps going, well past where any finite spur would stop.
    for (const s of [120, 900, 3000]) {
      const c = roads.column(w.gen, d, s, 0);
      const x = c[0], z = c[1];
      w.ensureChunk(x >> 4, z >> 4);
      const y = roads.surfaceY(w.gen, d, roads.along(w.gen, d, x, z));
      assert.ok(PAVING.has(w.getBlock(x, y, z)),
        `lane ${d} is surfaced at s=${s} (${x},${z},${y}), got ${w.getBlock(x, y, z)}`);
      assert.equal(w.getBlock(x, y + 1, z), B.air, `lane ${d} has headroom at s=${s}`);
    }

    // A lane is narrower than the arterial it leaves.
    let laneW = 0, parW = 0;
    // NOT asserted here: that a lane measures narrower than its parent. Counting
    // paved columns across the road frame is biased by BEARING — an axis-aligned
    // arterial's columns land on the lattice exactly, while a lane running 13° off
    // aliases into a staircase and reads wider than it is. Measuring it fairly
    // needs a perpendicular rasterisation, and the width difference is set by
    // LANE_VERGE vs VERGE_HW in js/world/roads.js in any case.
  }
});

test('trails leave the roads, run a few hundred blocks, and stop', () => {
  // "Some not [endless]". A trail is a surface treatment, not a regrade: it wears
  // a line over whatever ground is there, claims no column in the road mask, and
  // ends. So the checks are that they exist off the network, that they begin
  // beside a road, and that none runs past TRAIL_MAX from its parent.
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  const worn = new Set([B.dirt, B.gravel]);
  const found = [];
  for (let cx = 10; cx <= 24; cx++) {
    for (let cz = 10; cz <= 24; cz++) {
      const ch = w.generateChunk(cx, cz);
      for (let lx = 0; lx < CHUNK; lx++) {
        for (let lz = 0; lz < CHUNK; lz++) {
          const y = ch.surfaceH[lz * CHUNK + lx];
          if (y <= 0) continue;
          const id = ch.blocks[((y * CHUNK) + lz) * CHUNK + lx];
          if (!worn.has(id)) continue;
          const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
          if (roads.arterialAt(w.gen, x, z) !== -1) continue;   // that is road, not trail
          found.push([x, z]);
        }
      }
    }
  }
  assert.ok(found.length > 200, `trails should be a real presence off the roads (${found.length} worn cells)`);

  // Every one of them is within reach of SOME road — a trail that started nowhere
  // would just be a stripe of dirt in a field.
  let orphan = 0;
  for (const [x, z] of found) {
    let near = false;
    for (let d = 0; d < ARTERIALS && !near; d++) {
      const s = roads.along(w.gen, d, x, z);
      if (s < 0) continue;
      const t = Math.abs(roads.across(w.gen, d, x, z) - roads.wander(w.gen.seed, d, s));
      if (t < 520) near = true;      // TRAIL_MAX plus its wander, from the parent centre line
    }
    if (!near) orphan++;
  }
  assert.ok(orphan / found.length < 0.02,
    `${orphan}/${found.length} worn cells sit nowhere near a road they could have left`);
});

test('a good fraction of trails LEAD somewhere, and the somewhere is built', () => {
  // A path that stops in an empty field wasted your time. `trailSite` is the
  // builder's own answer to "does this trail end at anything", so this checks the
  // schedule produces a decent number of them, that all three kinds occur, and
  // that the blocks are really in the world where it says.
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  const sites = [];
  for (let d = 0; d < ARTERIALS; d++) {
    for (let k = 1; k <= 26; k++) {
      const s = roads.trailSite(w.gen, d, k);
      if (s) sites.push({ d, k, x: s.x, z: s.z, y: s.y, kind: s.kind });
    }
  }
  assert.ok(sites.length > 25, `trails lead somewhere often enough to matter (${sites.length} sites)`);
  const kinds = new Set(sites.map((s) => s.kind));
  assert.equal(kinds.size, 3, `all three kinds of destination occur (${[...kinds].join(',')})`);

  // Every site is out in the country at the far end of a path, not hard against
  // the road it left — that is the whole point of walking to it.
  for (const s of sites) {
    assert.equal(roads.arterialAt(w.gen, s.x, s.z), -1,
      `the site at ${s.x},${s.z} does not sit on a road`);
  }

  // …and one of each kind is really standing there. Built at all is the test:
  // the exact block list is the builder's business, but a site must be MADE of
  // something a chunk of empty moorland is not.
  const wrought = new Set([
    B.stone_brick, B.mossy_stone_brick, B.stone_brick_slab, B.cobble_wall, B.cauldron,
    B.torch_post, B.glow_lichen, B.timber_wall, B.thatch, B.thatch_slab, B.oak_log,
    B.planks_fence, B.campfire, B.stump, B.brown_wool, B.white_wool, B.mossy_cobble,
  ]);
  for (const kind of [0, 1, 2]) {
    const s = sites.find((q) => q.kind === kind);
    for (let cx = (s.x - 6) >> 4; cx <= (s.x + 6) >> 4; cx++) {
      for (let cz = (s.z - 6) >> 4; cz <= (s.z + 6) >> 4; cz++) w.ensureChunk(cx, cz);
    }
    let n = 0;
    for (let dx = -5; dx <= 5; dx++) {
      for (let dz = -5; dz <= 5; dz++) {
        for (let y = s.y; y <= s.y + 5; y++) if (wrought.has(w.getBlock(s.x + dx, y, s.z + dz))) n++;
      }
    }
    assert.ok(n >= 12, `kind ${kind} at ${s.x},${s.z} is actually built (${n} wrought blocks)`);
  }
});

// ---- Wayside crofts --------------------------------------------------------
// The town has a flood-fill enterability test (tests/unit/town.test.mjs) because
// its houses were built with doors you could see and not use. The crofts are
// built by a different module with a different door rule and now carry
// furniture, so they need their own — and they earned it: writing this found a
// corner doorway that touched no interior cell (every cottage on a diagonal
// arterial was sealed) and an oak stamped straight up through a doorframe.

// Flood-fill the ground around a croft with the PLAYER's own movement rule —
// two blocks of headroom, step up at most one, drop at most four, four compass
// neighbours — starting from open ground on every side of it, and report what
// the walk reached. Same rule the town's test uses.
function walkTo(w, ax, az, fy, R = 24) {
  const X0 = ax - R, X1 = ax + R, Z0 = az - R, Z1 = az + R;
  const Y0 = Math.max(1, fy - 22), Y1 = fy + 18;
  for (let cx = X0 >> 4; cx <= X1 >> 4; cx++) for (let cz = Z0 >> 4; cz <= Z1 >> 4; cz++) w.ensureChunk(cx, cz);
  // A door counts as passable: the player walks up and swings it open. Anything
  // else with collision — a slab, a fence, a table leg, a chest — does not.
  const open = (x, y, z) => {
    const id = w.getBlock(x, y, z);
    if (BLOCKS[id]?.shape === 'door') return true;
    return w.collisionHeight(x, y, z) === 0;
  };
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
  let starts = 0;
  for (const [sx, sz] of [[ax - R + 1, az], [ax + R - 1, az], [ax, az - R + 1], [ax, az + R - 1],
    [ax - R + 1, az - R + 1], [ax + R - 1, az + R - 1]]) {
    for (let y = Y1 - 1; y > Y0; y--) if (stand(sx, y, sz)) { push(sx, y, sz); starts++; break; }
  }
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
  return { starts, stand, reached: (x, y, z) => inBox(x, y, z) && seen[idx(x, y, z)] === 1 };
}

// The first `want` crofts the seed offers, as plain copies — `croftPlan` returns
// reused scratch, and generating a chunk certainly touches it again.
function croftsOf(w, want) {
  const roads = roadsFor(w.gen);
  const out = [];
  for (let d = 0; d < ARTERIALS && out.length < want; d++) {
    for (let n = 2; n <= 14 && out.length < want; n++) {
      const p = roads.croftPlan(w.gen, d, n);
      if (p) out.push({ d, n, ...p });
    }
  }
  return out;
}

test('every wayside croft can be walked into, and its kist reached', () => {
  initSlabSet();
  for (const seed of [20260725, 777, 31337]) {
    const w = new World(seed);
    const crofts = croftsOf(w, 6);
    assert.ok(crofts.length === 6, `seed ${seed} offers crofts to test (${crofts.length})`);
    const sealed = [], thin = [], shut = [];
    let standing = 0;
    for (const p of crofts) {
      const { starts, stand, reached } = walkTo(w, p.ax, p.az, p.fy);
      assert.ok(starts >= 4, `open ground around the croft at ${p.ax},${p.az} to start the walk from`);
      // Passes that run AFTER this module (js/world/world.js: the hand-built
      // structure list, procedural sites, procedural settlements) get the last
      // write, and one of them levelling this ground demolishes the cottage
      // wholesale. That is a collision between two builders, not a door bug, and
      // it is distinguishable: the hearth sits dead centre, as far from any
      // doorway as the building gets. No hearth, no cottage — skip it, and the
      // count below keeps that from quietly becoming the normal case.
      if (w.getBlock(p.ax, p.fy + 1, p.az) !== B.campfire) continue;
      standing++;
      const y = p.fy + 1;
      let floor = 0, got = 0, firstMiss = null;
      for (let x = p.ix0; x <= p.ix1; x++) {
        for (let z = p.iz0; z <= p.iz1; z++) {
          if (!stand(x, y, z)) continue;                 // wall, or a fitting standing there
          floor++;
          if (reached(x, y, z)) got++;
          else if (!firstMiss) firstMiss = `${x},${y},${z}`;
        }
      }
      const where = `croft ${p.d}/${p.n} at ${p.ax},${p.az}`;
      if (floor < 6) thin.push(`${where}: only ${floor} free floor cells — furniture filled it in?`);
      else if (got === 0) sealed.push(`${where}: SEALED, no way in (e.g. ${firstMiss})`);
      else if (got < floor) sealed.push(`${where}: ${floor - got}/${floor} floor cells cut off (e.g. ${firstMiss})`);
      // and the kist is a chest you can actually stand next to and open
      assert.equal(w.getBlock(p.chestX, p.chestY, p.chestZ), B.chest_block, `${where} has a kist`);
      const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dz]) => reached(p.chestX + dx, p.chestY, p.chestZ + dz));
      if (!beside) shut.push(`${where}: the kist at ${p.chestX},${p.chestZ} is walled in`);
    }
    assert.deepEqual(thin, [], `seed ${seed}: rooms that are not rooms`);
    assert.deepEqual(sealed, [], `seed ${seed}: you cannot get in`);
    assert.deepEqual(shut, [], `seed ${seed}: you cannot get at the loot`);
    assert.ok(standing >= 4, `seed ${seed}: most crofts survive the later passes (${standing} of 6)`);
  }
});

test('a wayside kist actually holds something, loaded the way the game loads it', () => {
  // Reaching the chest is half the promise; the other half is that opening it
  // gives you something. Those are separate mechanisms: roads.js can PLACE the
  // chest block into the chunk's block array on its own, but the contents live in
  // `world.chestMeta`, which a block array cannot reach. carveRoads therefore
  // takes an optional `chestSink`, and js/world/world.js has to pass one.
  //
  // It did not, and every kist on every road in the world opened empty — a
  // furnished cottage with a prop chest in it. The test that only checked you
  // could stand next to the chest passed throughout. So this goes through the
  // real path: ensureChunk, getChestAt on the block, openChest on the id.
  const w = new World(20260725);
  const roads = roadsFor(w.gen);
  const seen = [];
  for (let d = 0; d < ARTERIALS && seen.length < 8; d++) {
    for (let n = 2; n <= 20 && seen.length < 8; n++) {
      const p = roads.croftPlan(w.gen, d, n);
      if (!p) continue;
      // Load the cottage's whole neighbourhood — whichever chunk owns the chest
      // column is the one that registers the loot.
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) w.ensureChunk((p.chestX >> 4) + a, (p.chestZ >> 4) + b);
      }
      if (w.getBlock(p.chestX, p.chestY, p.chestZ) !== B.chest_block) continue;  // levelled by a later pass
      seen.push({ d, n, p });
    }
  }
  assert.ok(seen.length >= 4, `found kists to open (${seen.length})`);
  for (const { d, n, p } of seen) {
    const where = `croft ${d}/${n} kist at ${p.chestX},${p.chestY},${p.chestZ}`;
    const hit = w.getChestAt(p.chestX, p.chestY, p.chestZ);
    assert.ok(hit, `${where} is registered in chestMeta — is world.js still passing a chestSink?`);
    const loot = w.openChest(hit.id);
    assert.ok(loot.length > 0, `${where} pays out something`);
    for (const l of loot) {
      assert.ok(ITEMS[l.item], `${where} holds a real item, not '${l.item}'`);
      assert.ok(l.qty > 0, `${where}: ${l.item} has a positive quantity`);
    }
  }
});

test('a croft is furnished, and the doorway is left clear', () => {
  const w = new World(20260725);
  const crofts = croftsOf(w, 4);
  assert.equal(crofts.length, 4, 'crofts to inspect');
  const FITTINGS = new Set([
    B.chest_block, B.cauldron, B.planks_slab, B.planks_fence, B.torch_post,
    B.red_wool, B.thatch, B.white_wool, B.campfire,
  ]);
  for (const p of crofts) {
    for (let cx = (p.ax - 10) >> 4; cx <= (p.ax + 10) >> 4; cx++) {
      for (let cz = (p.az - 10) >> 4; cz <= (p.az + 10) >> 4; cz++) w.ensureChunk(cx, cz);
    }
    let fittings = 0;
    for (let x = p.ix0; x <= p.ix1; x++) {
      for (let z = p.iz0; z <= p.iz1; z++) {
        for (const y of [p.fy + 1, p.fy + 2]) if (FITTINGS.has(w.getBlock(x, y, z))) fittings++;
      }
    }
    const where = `croft ${p.d}/${p.n} at ${p.ax},${p.az}`;
    assert.ok(fittings >= 8, `${where} is furnished, not an empty shell (${fittings} fittings)`);
    // The doorway is a real two-block hole, and the cell you step into and its
    // neighbours are clear — the invariant the furniture pass is written around.
    assert.equal(BLOCKS[w.getBlock(p.doorX, p.fy + 1, p.doorZ)]?.shape, 'door', `${where}: lower door leaf`);
    assert.equal(BLOCKS[w.getBlock(p.doorX, p.fy + 2, p.doorZ)]?.shape, 'door', `${where}: upper door leaf`);
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.stepX + dx, z = p.stepZ + dz;
      if (x < p.ix0 || x > p.ix1 || z < p.iz0 || z > p.iz1) continue;      // that one is the wall
      assert.equal(w.collisionHeight(x, p.fy + 1, z), 0,
        `${where}: nothing stands in ${x},${z}, beside the doorway`);
    }
  }
});
