// The sky archipelago (js/world/sky.js) — floating islands in the 409 blocks of
// headroom the world was allocating and never using.
//
// Three things have to hold or the feature is broken in ways flying past it will
// not show.
//
// 1. CHUNK-LOCALITY, the same contract every procedural site keeps: an island
//    spans a dozen chunks and you can approach it from any direction, so every
//    chunk must be generatable alone, in any order, and produce the same rock.
//
// 2. THE SURFACE IS THE TOP. The first cut of the rasteriser stacked the soil
//    mound above the turf, so a snow-capped island's summit came out as
//    deepslate; the second let cluster members interpenetrate, so one island's
//    keel was written through the next one's grass. Both were invisible to every
//    other check. So the surface course is asserted to be the topmost solid block
//    in its column, and `skySurfaceAt` is asserted to agree with the blocks —
//    that is what a landing mount reads.
//
// 3. THE BANDS ARE THE PROGRESSION. Ring 0 must have empty sky (the first island
//    you see should be a surprise on the horizon), the bands must climb with
//    distance, and meteoric ore must exist ONLY in the top band — it is the
//    reason to get up there at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, initSlabSet } from '../../js/world/world.js';
import { WorldGen, CHUNK, WORLD_H, ringAt } from '../../js/world/worldgen.js';
import { stampChunkStructures } from '../../js/world/structures.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
import { ENEMY_TYPES } from '../../js/game/enemies.js';
import { allIslands, skyAt, skySurfaceAt, highestIsland, SKY_REGION, SKY_HALF } from '../../js/world/sky.js';

const SEEDS = [20260725, 7, 4242];

function digest(gen, cx, cz) {
  const out = [];
  stampChunkStructures(gen, cx, cz, {
    block: (x, y, z, id) => out.push(`b:${x},${y},${z},${id}`),
    node: (n) => out.push(`n:${n.type}@${n.x},${n.y},${n.z}`),
    spawn: (s) => out.push(`s:${s.id}`),
    chest: (c) => out.push(`c:${c.id}`),
  });
  return out.join('|');
}

// ---- siting ----------------------------------------------------------------
test('the starting sky is empty, and the bands climb with distance', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const isles = allIslands(gen, 5);
    assert.ok(isles.length >= 12, `seed ${seed}: the sky should be settled (${isles.length} clusters)`);

    const byRing = new Map();
    for (const s of isles) {
      // A cluster is themed by the ring of its ANCHOR, and every member must
      // agree with it — a band that leaked across a ring boundary would put
      // meteoric ore within reach of the wrong mount.
      assert.equal(s.ring, ringAt(s.x, s.z), 'a cluster is themed by its anchor');
      assert.notEqual(s.ring, 0, 'ring 0 keeps empty sky — the first island is a reveal');
      for (const is of s.isles) (byRing.get(s.ring) || byRing.set(s.ring, []).get(s.ring)).push(is);
    }

    // Bands do not overlap: the lowest keel of a band clears the highest crown
    // of the one below it, so you cannot see two bands as one mass.
    const lo = (r) => Math.min(...byRing.get(r).map((i) => i.y - i.keelD));
    const hi = (r) => Math.max(...byRing.get(r).map((i) => i.y + i.crownH));
    for (const r of [2, 3]) {
      if (!byRing.has(r) || !byRing.has(r - 1)) continue;
      assert.ok(lo(r) > hi(r - 1), `seed ${seed}: ring ${r} floats clear of ring ${r - 1} (${lo(r)} > ${hi(r - 1)})`);
    }
  }
});

test('islands clear the terrain below and the world roof above', () => {
  const gen = new WorldGen(20260725);
  for (const s of allIslands(gen, 5)) {
    for (const is of s.isles) {
      const ground = gen.heightAt(is.cx, is.cz);
      assert.ok(is.y - is.keelD > ground + 30,
        `island at ${is.cx},${is.cz} hangs ${is.y - is.keelD - ground} above ground — it should float, not sit on a peak`);
      assert.ok(is.y + is.crownH < WORLD_H - 2,
        `island at ${is.cx},${is.cz} pokes through the world roof`);
    }
  }
});

test('an island never reaches further from its anchor than SKY_HALF claims', () => {
  // The cheap per-chunk reject trusts this bound. If a real island exceeds it,
  // chunks stop asking the right regions and the rock comes out with slices cut
  // off — the classic chunk-local failure, and it only shows at a seam.
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    for (const s of allIslands(gen, 5)) {
      const reach = Math.max(
        Math.abs(s.minX - s.x), Math.abs(s.maxX - s.x),
        Math.abs(s.minZ - s.z), Math.abs(s.maxZ - s.z),
      );
      assert.ok(reach <= SKY_HALF,
        `seed ${seed}: cluster at ${s.x},${s.z} reaches ${reach} > SKY_HALF ${SKY_HALF}`);
    }
  }
});

test('cluster members are separate rocks — nothing interpenetrates', () => {
  // Two islands that overlapped wrote through each other: whichever stamped last
  // put its keel where the other's turf was, and the summit came out as the
  // wrong material with no way to tell from the layout.
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    for (const s of allIslands(gen, 5)) {
      for (let i = 0; i < s.isles.length; i++) {
        for (let j = i + 1; j < s.isles.length; j++) {
          const a = s.isles[i], b = s.isles[j];
          const gap = Math.hypot(a.cx - b.cx, a.cz - b.cz) - (a.r * 1.35 + b.r * 1.35);
          if (gap > 2) continue;                                  // clears sideways
          const vsep = Math.abs(a.y - b.y);
          assert.ok(vsep > a.crownH + a.keelD + b.crownH + b.keelD,
            `seed ${seed}: two isles at ${a.cx},${a.cz} and ${b.cx},${b.cz} occupy the same air`);
        }
      }
    }
  }
});

// ---- the rock itself -------------------------------------------------------
test('the surface course is the topmost solid block, and skySurfaceAt agrees', () => {
  const w = new World(20260725);
  const isles = allIslands(w.gen, 4);
  const SURFACES = new Set([B.grass, B.snow]);
  let checked = 0;
  for (const ring of [1, 2, 3]) {
    const s = isles.find((s) => s.ring === ring);
    if (!s) continue;
    const is = s.isles[0];
    for (let a = -2; a <= 2; a++) {
      for (let b = -2; b <= 2; b++) w.ensureChunk((is.cx >> 4) + a, (is.cz >> 4) + b);
    }
    // Sample a cross of columns, not just the centre — the dome and the rim are
    // different code paths. Kept clear of anything BUILT on the island: a hall
    // floor or a campfire is legitimately the top block there, and this test is
    // about the natural crust, which the build pass sits on top of.
    const clearOf = is.build ? 11 : 0;
    for (const [dx, dz] of [[0, 0], [4, 0], [-4, 0], [0, 5], [0, -5], [3, 3]]
      .map(([a, b]) => [a + clearOf, b + clearOf])) {
      const x = is.cx + dx, z = is.cz + dz;
      let top = -1;
      for (let y = is.y + is.crownH + 4; y > is.y - is.keelD - 4; y--) {
        if (w.getBlock(x, y, z) !== B.air) { top = y; break; }
      }
      if (top < 0) continue;                                       // outside the rim
      checked++;
      assert.ok(SURFACES.has(w.getBlock(x, top, z)),
        `ring ${ring} at ${x},${z}: top block is ${BLOCKS[w.getBlock(x, top, z)]?.label}, not turf or snow`);
      assert.equal(w.getBlock(x, top + 1, z), B.air, `ring ${ring} at ${x},${z}: open sky above the surface`);
      assert.equal(skySurfaceAt(w.gen, x, z), top,
        `ring ${ring} at ${x},${z}: skySurfaceAt disagrees with the blocks a mount would land on`);
    }
  }
  assert.ok(checked >= 12, `a real sample of island columns (${checked})`);
});

test('an island is solid rock, and it FLOATS — clear air under its deepest spur', () => {
  const w = new World(20260725);
  const s = allIslands(w.gen, 4).find((s) => s.ring === 3);
  const is = s.isles[0];
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) w.ensureChunk((is.cx >> 4) + a, (is.cz >> 4) + b);
  let solid = 0;
  for (let y = is.y + is.crownH; y > is.y - is.keelD; y--) if (w.getBlock(is.cx, y, is.cz) !== B.air) solid++;
  assert.ok(solid > 10, `the middle of an island is deep rock (${solid} blocks)`);

  // It floats. Found by scanning for the LOWEST solid block anywhere under the
  // island rather than by trusting a formula: the keel is roughened per column
  // and some columns hang as spurs well past the nominal keel depth, so a fixed
  // offset would either pass vacuously or fail on a spur.
  let lowest = WORLD_H;
  for (let dx = -is.r; dx <= is.r; dx += 2) {
    for (let dz = -is.r; dz <= is.r; dz += 2) {
      // The DEEPEST solid in the column, not the first one met going down — a
      // scan that breaks on first contact finds the top of the rock and would
      // then assert "air below the surface", which is never true.
      for (let y = is.y - 1; y > is.y - is.keelD * 3 && y > 2; y--) {
        if (w.getBlock(is.cx + dx, y, is.cz + dz) !== B.air && y < lowest) lowest = y;
      }
    }
  }
  assert.ok(lowest < is.y, 'the island has an underside at all');
  for (let d = 3; d <= 15; d += 3) {
    let clear = true;
    for (let dx = -is.r; dx <= is.r; dx += 3) {
      for (let dz = -is.r; dz <= is.r; dz += 3) {
        if (w.getBlock(is.cx + dx, lowest - d, is.cz + dz) !== B.air) clear = false;
      }
    }
    assert.ok(clear, `open air ${d} blocks under the deepest spur (y=${lowest}) — it is an island, not a pillar`);
  }
  assert.ok(lowest > gapToGround(w, is), 'and it never touches the terrain below');
});

// The terrain height under an island, for the "it never touches down" check.
function gapToGround(w, is) {
  let g = 0;
  for (let dx = -is.r; dx <= is.r; dx += 4) {
    for (let dz = -is.r; dz <= is.r; dz += 4) {
      const h = w.gen.heightAt(is.cx + dx, is.cz + dz);
      if (h > g) g = h;
    }
  }
  return g;
}

// ---- the payoff ------------------------------------------------------------
test('meteoric iron is in the high band and nowhere lower', () => {
  // The whole reason to fly. `ore_meteoric` used to exist only at the bottom of
  // the deepest shafts; the high islands are now its real source, and that has to
  // stay gated or the mount progression means nothing.
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    let high = 0, leaked = [];
    for (const s of allIslands(gen, 5)) {
      for (const is of s.isles) {
        for (const v of is.veins) {
          if (v.type !== 'ore_meteoric') continue;
          if (s.ring === 3) high++;
          else leaked.push(`ring ${s.ring} island at ${is.cx},${is.cz}`);
        }
      }
    }
    assert.deepEqual(leaked, [], `seed ${seed}: meteoric ore below the top band`);
    assert.ok(high >= 4, `seed ${seed}: the high band actually carries meteoric ore (${high} veins)`);
  }
});

// ---- chunk-locality --------------------------------------------------------
test('a sky chunk is identical forwards, backwards and generated alone', () => {
  const g0 = new WorldGen(20260725);
  // A cluster with more than one member, sampled around the member FURTHEST from
  // the anchor: an under-sized SKY_HALF slices the outer rocks and leaves the one
  // on the anchor perfect, so sampling the centre proves nothing.
  const s = allIslands(g0, 4).find((s) => s.ring === 3 && s.isles.length > 1)
    || allIslands(g0, 4).find((s) => s.ring === 3);
  const far = s.isles.reduce((best, i) =>
    Math.hypot(i.cx - s.x, i.cz - s.z) > Math.hypot(best.cx - s.x, best.cz - s.z) ? i : best, s.isles[0]);
  const c0x = far.cx >> 4, c0z = far.cz >> 4;
  const chunks = [];
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) chunks.push([c0x + a, c0z + b]);

  const fwd = new Map();
  { const g = new WorldGen(20260725); for (const [x, z] of chunks) fwd.set(`${x},${z}`, digest(g, x, z)); }
  const rev = new Map();
  { const g = new WorldGen(20260725); for (const [x, z] of [...chunks].reverse()) rev.set(`${x},${z}`, digest(g, x, z)); }

  let writes = 0;
  for (const [k, v] of fwd) {
    writes += v ? v.split('|').length : 0;
    assert.equal(rev.get(k), v, `chunk ${k} differs when the neighbours load in reverse`);
    // …and with NO neighbour ever loaded, from a generator that has seen nothing.
    const [x, z] = k.split(',').map(Number);
    assert.equal(digest(new WorldGen(20260725), x, z), v, `chunk ${k} differs when generated alone`);
  }
  assert.ok(writes > 5000, `the sample really covers an island (${writes} writes)`);
});

test('the sky is a pure function of the seed, and two seeds differ', () => {
  const a = allIslands(new WorldGen(4242), 3).map((s) => `${s.x},${s.z},${s.ring}`).join('|');
  const b = allIslands(new WorldGen(4242), 3).map((s) => `${s.x},${s.z},${s.ring}`).join('|');
  assert.equal(a, b, 'same seed, same archipelago');
  const c = allIslands(new WorldGen(777), 3).map((s) => `${s.x},${s.z},${s.ring}`).join('|');
  assert.notEqual(a, c, 'a different seed puts the islands elsewhere');
});

test('the headroom is actually used', () => {
  // The point of the feature, stated as a number: the terrain tops out near 103,
  // and the archipelago has to reach a long way above that or the 409 blocks are
  // still empty.
  const gen = new WorldGen(20260725);
  const top = highestIsland(gen, 6);
  assert.ok(top > 300, `the archipelago reaches into the headroom (highest top y=${top})`);
  assert.ok(top < WORLD_H - 8, `and stays under the roof (y=${top} of ${WORLD_H})`);
});

// ---- bridges and what stands on the islands --------------------------------
test('bridged cluster members are one place: the span is walkable, not a jump', () => {
  // An archipelago you cannot cross is three separate errands. The span has to
  // be WALKABLE, which in this game is stricter than "connected": only stairs
  // and slabs are steps (World.isStep), so a plain one-block rise anywhere along
  // the deck is a jump and the bridge has failed at its one job.
  initSlabSet();
  const w = new World(20260725);
  let spans = 0;
  const broken = [];
  for (const s of allIslands(w.gen, 4)) {
    for (const br of s.bridges) {
      // load every chunk the span crosses, plus a margin for the stair flights
      const lo = Math.min(br.x0, br.x1) - 8, hi = Math.max(br.x0, br.x1) + 8;
      const lz = Math.min(br.z0, br.z1) - 8, hz = Math.max(br.z0, br.z1) + 8;
      for (let cx = lo >> 4; cx <= hi >> 4; cx++) for (let cz = lz >> 4; cz <= hz >> 4; cz++) w.ensureChunk(cx, cz);
      spans++;
      if (spans > 6) break;

      // Walk the centre line and demand every step is level, or a stair/slab.
      const dx = br.x1 - br.x0, dz = br.z1 - br.z0;
      const n = Math.max(Math.abs(dx), Math.abs(dz));
      const alongX = Math.abs(dx) >= Math.abs(dz);
      let prevY = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = alongX ? br.x0 + Math.sign(dx) * i : Math.round(br.x0 + dx * t);
        const z = alongX ? Math.round(br.z0 + dz * t) : br.z0 + Math.sign(dz) * i;
        // the deck under foot, and two blocks of headroom over it
        if (w.collisionHeight(x, br.y, z) === 0) { broken.push(`hole in the deck at ${x},${br.y},${z}`); break; }
        if (w.collisionHeight(x, br.y + 1, z) > 0 || w.collisionHeight(x, br.y + 2, z) > 0) {
          broken.push(`no headroom on the deck at ${x},${br.y},${z}`); break;
        }
        if (prevY !== null && br.y !== prevY && !w.isStep(x, br.y, z)) {
          broken.push(`the deck steps without a stair at ${x},${br.y},${z}`);
        }
        prevY = br.y;
      }
      // …and the rails are continuous, both sides, for the whole span.
      let railed = 0;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const x = alongX ? br.x0 + Math.sign(dx) * i : Math.round(br.x0 + dx * t);
        const z = alongX ? Math.round(br.z0 + dz * t) : br.z0 + Math.sign(dz) * i;
        const a = alongX ? w.getBlock(x, br.y + 1, z - 1) : w.getBlock(x - 1, br.y + 1, z);
        const b = alongX ? w.getBlock(x, br.y + 1, z + 1) : w.getBlock(x + 1, br.y + 1, z);
        if (a === B.planks_fence && b === B.planks_fence) railed++;
      }
      assert.ok(railed > (n - 2) * 0.75,
        `a span from ${br.x0},${br.z0} is railed both sides for its length (${railed}/${n - 1})`);
    }
    if (spans > 6) break;
  }
  assert.ok(spans >= 3, `there are real spans to walk (${spans})`);
  assert.deepEqual(broken, [], 'every span must be walkable end to end');
});

test('the stair flight lands you on the higher island, not inside it', () => {
  initSlabSet();
  const w = new World(20260725);
  let checked = 0;
  for (const s of allIslands(w.gen, 4)) {
    for (const br of s.bridges) {
      if (br.hiY === br.y) continue;                       // level span, no flight
      const lo = Math.min(br.x0, br.x1) - 12, hi = Math.max(br.x0, br.x1) + 12;
      const lz = Math.min(br.z0, br.z1) - 12, hz = Math.max(br.z0, br.z1) + 12;
      for (let cx = lo >> 4; cx <= hi >> 4; cx++) for (let cz = lz >> 4; cz <= hz >> 4; cz++) w.ensureChunk(cx, cz);
      const ex = br.hiAtEnd ? br.x1 : br.x0, ez = br.hiAtEnd ? br.z1 : br.z0;
      const rise = br.hiY - br.y;
      const alongX = Math.abs(br.x1 - br.x0) >= Math.abs(br.z1 - br.z0);
      const sgn = br.hiAtEnd ? 1 : -1;
      const sx = alongX ? sgn * Math.sign(br.x1 - br.x0) : 0;
      const sz = alongX ? 0 : sgn * Math.sign(br.z1 - br.z0);
      for (let k = 1; k <= rise; k++) {
        const x = ex + sx * k, z = ez + sz * k;
        assert.ok(w.isStep(x, br.y + k, z),
          `flight tread ${k} at ${x},${br.y + k},${z} must be a stair you can walk up`);
        assert.equal(w.collisionHeight(x, br.y + k + 1, z), 0, `headroom over tread ${k}`);
      }
      checked++;
      if (checked >= 4) break;
    }
    if (checked >= 4) break;
  }
  assert.ok(checked >= 1, `there are sloped spans to check (${checked})`);
});

test('islands carry buildings, and they sit ON the surface', () => {
  const w = new World(20260725);
  const built = [];
  for (const s of allIslands(w.gen, 4)) for (const is of s.isles) if (is.build) built.push({ s, is });
  assert.ok(built.length >= 6, `the archipelago is inhabited (${built.length} built islands)`);
  const kinds = new Set(built.map((b) => b.is.build));
  assert.ok(kinds.size >= 3, `more than one kind of place up there (${[...kinds].join(', ')})`);

  for (const { is } of built.slice(0, 5)) {
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) w.ensureChunk((is.cx >> 4) + a, (is.cz >> 4) + b);
    // Whatever it is, there is something man-made standing above the crust at the
    // island's centre, and it is not floating over a hole.
    let solidBelow = false;
    for (let y = is.y + is.crownH; y > is.y - 4; y--) if (w.getBlock(is.cx, y, is.cz) !== B.air) { solidBelow = true; break; }
    assert.ok(solidBelow, `${is.build} at ${is.cx},${is.cz} stands on rock`);
    let stack = 0;
    for (let y = is.y; y < is.y + is.crownH + 9; y++) if (w.getBlock(is.cx, y, is.cz) !== B.air) stack++;
    assert.ok(stack >= 2, `${is.build} at ${is.cx},${is.cz} actually built something (${stack} blocks up the centre)`);
  }
});

// ---- what lives up there ---------------------------------------------------
test('every island carries creatures, banded by ring', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const byRing = new Map();
    let bare = 0, total = 0;
    for (const s of allIslands(gen, 5)) {
      for (const is of s.isles) {
        total++;
        if (!is.beasts || !is.beasts.length) { bare++; continue; }
        for (const b of is.beasts) {
          assert.ok(ENEMY_TYPES[b.type], `${b.type} is a real creature`);
          (byRing.get(s.ring) || byRing.set(s.ring, new Set()).get(s.ring)).add(b.type);
        }
      }
    }
    assert.equal(bare, 0, `seed ${seed}: no island is lifeless (${bare} of ${total})`);

    // The gate that matters: the goblins holding the top band sit on the
    // meteoric seams, so their liveries must exist ONLY where the meteoric ore
    // does. Meeting a frost goblin on the low shelf would mean the payoff is
    // guarded by something reachable on the first mount.
    for (const [ring, kinds] of byRing) {
      if (ring < 3) assert.ok(!kinds.has('frost_goblin'), `seed ${seed}: a frost goblin on ring ${ring}`);
      if (ring < 3) assert.ok(!kinds.has('cave_goblin'), `seed ${seed}: a cave goblin on ring ${ring}`);
    }
    assert.ok(byRing.get(3)?.has('frost_goblin'), `seed ${seed}: the top band is held by frost goblins`);

    // …and something worth flying up FOR, on every band. An archipelago of
    // nothing but things that hunt you is an obstacle course. The livestock up
    // here went feral generations ago and is the reason to make the trip.
    for (const [ring, kinds] of byRing) {
      assert.ok(kinds.has('goat') || kinds.has('rabbit'),
        `seed ${seed}: ring ${ring} has life that is not hunting you`);
    }
  }
});

test('sky creatures stand on the island surface, not in the air or in the rock', () => {
  const w = new World(20260725);
  let checked = 0;
  for (const s of allIslands(w.gen, 4)) {
    for (const is of s.isles) {
      if (checked >= 20) break;
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) w.ensureChunk((is.cx >> 4) + a, (is.cz >> 4) + b);
      for (const bst of is.beasts) {
        const sy = skySurfaceAt(w.gen, bst.x, bst.z);
        if (sy < 0) continue;                       // outside the rim, not placed
        checked++;
        // solid under its feet, open where it stands and at head height
        assert.notEqual(w.getBlock(bst.x, sy, bst.z), B.air, `${bst.type} at ${bst.x},${bst.z} stands on rock`);
        assert.equal(w.getBlock(bst.x, sy + 1, bst.z), B.air, `${bst.type} is not buried in the crown`);
        assert.equal(w.getBlock(bst.x, sy + 2, bst.z), B.air, `${bst.type} has headroom`);
      }
    }
    if (checked >= 20) break;
  }
  assert.ok(checked >= 10, `a real sample of placed creatures (${checked})`);
});
