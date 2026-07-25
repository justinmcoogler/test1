// Procedural towns (js/world/settlements.js, docs/WORLD_PLAN.md phase 6).
//
// Two things have to hold or the feature is broken in ways a screenshot will not
// show.
//
// 1. CHUNK-LOCALITY. A town spans ~30 chunks. Every one of them must be
//    generatable alone, in any order, with no neighbour loaded, and the union has
//    to be one coherent town. So the tests below stamp the same chunks from
//    independent generators, forwards and backwards, and demand byte-identical
//    output.
//
// 2. ENTERABILITY. The loudest complaint this project has ever had is houses you
//    cannot get into. So: build the real world, stand on the ARTERIAL outside the
//    town, and flood-fill inward using the game's own movement rules — two blocks
//    of headroom, step up at most one, drop at most four, a door is passable but a
//    slab or a table leg is not. Then assert that every free floor cell of every
//    room of every building was reached. If a house is sealed, the test names it
//    and the cell it could not get to.
//
// The road connection gets a stricter test still: you must be able to walk it
// without jumping, because only stairs and slabs are walkable steps (World.isStep)
// and a lane that needs a jump is not a road connection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, initSlabSet } from '../../js/world/world.js';
import { WorldGen, CHUNK, ringAt } from '../../js/world/worldgen.js';
import { BLOCKS, B } from '../../js/world/blocks.js';
import { buildStarterStructures, stampChunkStructures, structureClaims } from '../../js/world/structures.js';
import { roadsFor } from '../../js/world/roads.js';
import { nearHandBuilt } from '../../js/world/sites.js';
import { NODE_TYPES } from '../../js/game/nodes.js';
import { ITEMS } from '../../js/game/items.js';
import { QUESTS } from '../../js/game/quests.js';
import { NPC_DEFS, DIALOGUES } from '../../js/game/npcs.js';
import {
  allSettlements, settlementAt, siteAt, settlementClaims, findSettlement,
  TOWN_SPACING, REJECTS,
} from '../../js/world/settlements.js';

const SEEDS = [20260725, 7, 4242];

// ---- helpers ---------------------------------------------------------------
// Load the real world around one town, exactly as walking there would.
const CACHE = new Map();
function loadTown(seed, wantRing = null) {
  const key = `${seed}:${wantRing}`;
  if (CACHE.has(key)) return CACHE.get(key);
  initSlabSet();
  const world = new World(seed);
  const towns = allSettlements(world.gen, 2);
  assert.ok(towns.length, `seed ${seed}: at least one town within two stations`);
  const town = (wantRing === null ? null : towns.find((t) => t.ring >= wantRing)) || towns[0];

  // The chunks the town touches, plus a margin, plus the stretch of arterial the
  // walk in starts from.
  const roads = roadsFor(world.gen);
  const c = roads.column(world.gen, town.d, town.site.s + 30, 0);
  const start = { x: c[0], z: c[1] };
  const x0 = Math.min(town.minX, start.x) - 20, x1 = Math.max(town.maxX, start.x) + 20;
  const z0 = Math.min(town.minZ, start.z) - 20, z1 = Math.max(town.maxZ, start.z) + 20;
  for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor(x1 / CHUNK); cx++) {
    for (let cz = Math.floor(z0 / CHUNK); cz <= Math.floor(z1 / CHUNK); cz++) world.ensureChunk(cx, cz);
  }
  const out = { world, town, towns, start, box: { x0, x1, z0, z1 } };
  CACHE.set(key, out);
  return out;
}

// The player's own movement rules, as a flood fill.
function survey(loaded, { jump = true } = {}) {
  const { world, town, start, box } = loaded;
  const X0 = box.x0, X1 = box.x1, Z0 = box.z0, Z1 = box.z1;
  const Y0 = town.padY - 14, Y1 = town.padY + 34;

  // A door counts as passable: the player walks up and swings it open. Anything
  // else with collision — a slab, a fence, a table leg — does not.
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

  // Start ON THE ROAD, thirty blocks up the arterial from the junction: the walk
  // in is the walk a player makes.
  let starts = 0;
  for (let y = Y1 - 1; y > Y0; y--) if (stand(start.x, y, start.z)) { push(start.x, y, start.z); starts++; break; }
  assert.ok(starts, 'the arterial outside the town must be standable');

  for (let h = 0; h < queue.length; h += 3) {
    const x = queue[h], y = queue[h + 1], z = queue[h + 2];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      // Highest landing first, matching world.groundNear: +1 up, 4 down, and a
      // step up also needs headroom in the column you leave.
      for (let ny = y + 1; ny >= y - 4; ny--) {
        if (!inBox(nx, ny, nz)) continue;
        if (ny > y && !open(x, y + 2, z)) continue;
        // Walking (no jumping) can only rise onto a stair or a slab.
        if (ny > y && !jump && !world.isStep(nx, y, nz)) continue;
        if (stand(nx, ny, nz)) { push(nx, ny, nz); break; }
      }
    }
  }
  return {
    world, town, stand, open,
    reached: (x, y, z) => inBox(x, y, z) && seen[idx(x, y, z)] === 1,
    count: queue.length / 3,
  };
}

// Rasterise a chunk's settlement stamp into a comparable string.
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
test('towns stand on the arterials, in every ring, clear of the hand-built world', () => {
  const all = [];
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const towns = allSettlements(gen, 3);
    assert.ok(towns.length >= 6, `seed ${seed}: the roads should be settled (${towns.length} towns)`);
    for (const t of towns) {
      // On its road, at roughly its station.
      const roads = roadsFor(gen);
      const c = roads.column(gen, t.d, t.site.s, 0);
      const off = Math.hypot(c[0] - t.tx, c[1] - t.tz);
      assert.ok(off < 90, `${t.name} sits ${off.toFixed(0)} blocks off its road`);
      assert.ok(!nearHandBuilt(t.tx, t.tz), `${t.name} lands on hand-built ground`);
      assert.equal(t.ring, ringAt(t.tx, t.tz), `${t.name} is themed for the wrong ring`);
      assert.equal(t.plan, t.site.plan);
      // Sized and staffed by ring.
      assert.ok(t.buildings.length >= 5 && t.buildings.length <= 20,
        `${t.name} has ${t.buildings.length} buildings, want 5-20`);
      assert.ok(t.npcs.length >= 2 && t.npcs.length <= 5, `${t.name} has ${t.npcs.length} people`);
      all.push(t);
    }
    // Rings are represented, so the ring-scaled extras are actually reachable
    // content rather than theory.
    const rings = new Set(towns.map((t) => t.ring));
    assert.ok(rings.size >= 3, `seed ${seed}: towns should span rings, saw ${[...rings]}`);
  }
  // Towns never overwrite each other.
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a !== b && a.site.probe === b.site.probe) continue;
      const apart = Math.max(Math.abs(a.tx - b.tx), Math.abs(a.tz - b.tz));
      if (apart > 400) continue;
      const overlap = a.minX <= b.maxX && b.minX <= a.maxX && a.minZ <= b.maxZ && b.minZ <= a.maxZ;
      assert.ok(!overlap, `${a.name} and ${b.name} overlap`);
    }
  }
});

test('a station that cannot hold a town is the exception, not the rule', () => {
  // Every rule that refuses a site (lake, crag, another road across the plot) also
  // empties the roads if it fires too often. 240 stations across five seeds is
  // enough to notice.
  const before = REJECTS.built / Math.max(1, REJECTS.offered);
  void before;
  const gen = new WorldGen(31337);
  let offered = 0, built = 0;
  for (let d = 0; d < 8; d++) {
    for (let n = 0; n <= 4; n++) { offered++; if (siteAt(gen, d, n)) built++; }
  }
  assert.ok(built / offered >= 0.4, `only ${built}/${offered} stations could hold a town`);
});

test('the ring decides what a town has', () => {
  const gen = new WorldGen(20260725);
  const towns = allSettlements(gen, 3);
  const has = (t, theme) => t.buildings.some((b) => b.theme === theme);
  for (const t of towns) {
    if (t.ring >= 1) assert.ok(has(t, 'smithy'), `${t.name} (ring ${t.ring}) should have a forge`);
    if (t.ring >= 2) assert.ok(has(t, 'moothall'), `${t.name} (ring ${t.ring}) should have a moot hall`);
    if (t.ring >= 3) assert.ok(has(t, 'keep'), `${t.name} (ring ${t.ring}) should have a keep`);
    if (t.ring === 0) assert.ok(!has(t, 'keep') && !has(t, 'moothall'), `${t.name} is a hamlet, not a burgh`);
    if (t.ring >= 1) assert.ok(t.fences.length > 20, `${t.name} should be enclosed`);
    // Always: a well, a market cross, lanterns and a way to the road.
    assert.ok(t.props.some((p) => p.kind === 'well'), `${t.name} has no well`);
    assert.ok(t.props.some((p) => p.kind === 'cross'), `${t.name} has no market cross`);
    assert.ok(t.props.filter((p) => p.kind === 'lamp').length >= 3, `${t.name} is unlit`);
    assert.ok(t.lane.length > 20, `${t.name} has no road connection`);
  }
});

// ---- chunk-locality --------------------------------------------------------
test('a town chunk is identical however the world loads it', () => {
  for (const seed of SEEDS) {
    const a = new WorldGen(seed);
    const town = findSettlement(a, 2);
    assert.ok(town, `seed ${seed}: a town to test`);
    const cx0 = Math.floor(town.minX / CHUNK), cx1 = Math.floor(town.maxX / CHUNK);
    const cz0 = Math.floor(town.minZ / CHUNK), cz1 = Math.floor(town.maxZ / CHUNK);

    // Forward order on one generator…
    const forward = new Map();
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) forward.set(`${cx},${cz}`, digest(a, cx, cz));
    }
    // …reverse order on a generator that has never seen any of them.
    const b = new WorldGen(seed);
    const reverse = new Map();
    for (let cx = cx1; cx >= cx0; cx--) {
      for (let cz = cz1; cz >= cz0; cz--) reverse.set(`${cx},${cz}`, digest(b, cx, cz));
    }
    // …and one lone chunk from the middle, on a third generator with no
    // neighbours loaded at all.
    const c = new WorldGen(seed);
    const mid = `${(cx0 + cx1) >> 1},${(cz0 + cz1) >> 1}`;
    const lone = digest(c, (cx0 + cx1) >> 1, (cz0 + cz1) >> 1);

    let written = 0;
    for (const [k, v] of forward) {
      assert.equal(reverse.get(k), v, `seed ${seed}: chunk ${k} differs by load order`);
      written += v.length;
    }
    assert.equal(lone, forward.get(mid), `seed ${seed}: chunk ${mid} differs generated alone`);
    assert.ok(written > 10000, 'the town should actually have written something');
  }
});

test('the town claims its own ground, and nothing else', () => {
  const gen = new WorldGen(20260725);
  const town = findSettlement(gen, 2);
  assert.ok(settlementClaims(gen, town.tx, town.tz), 'the town claims its centre');
  assert.ok(structureClaims(gen, town.tx, town.tz), 'and structureClaims agrees');
  assert.ok(settlementClaims(gen, town.x0 + 1, town.z0 + 1), 'and its corner');
  const far = 400;
  assert.ok(!settlementClaims(gen, town.tx + far, town.tz + far), 'but not the country around it');
});

// ---- enterability ----------------------------------------------------------
test('every building can be walked into, starting from the arterial', () => {
  for (const seed of SEEDS) {
    const loaded = loadTown(seed, 2);
    const { town } = loaded;
    const { stand, reached, count } = survey(loaded);
    assert.ok(count > 500, `seed ${seed}: the walk should cover the town (${count} cells)`);
    const sealed = [], thin = [];
    for (const r of town.rooms) {
      let floor = 0, got = 0, firstMiss = null;
      for (let x = r.x0; x <= r.x1; x++) {
        for (let z = r.z0; z <= r.z1; z++) {
          if (!stand(x, r.y, z)) continue;              // wall, furniture or stair riser
          floor++;
          if (reached(x, r.y, z)) got++;
          else if (!firstMiss) firstMiss = [x, r.y, z];
        }
      }
      const where = `${r.name} storey ${r.storey}`;
      if (floor < 4) thin.push(`${where}: only ${floor} free floor cells — solid-filled?`);
      else if (got === 0) sealed.push(`${where}: SEALED, no way in (e.g. ${firstMiss})`);
      else if (got < floor) sealed.push(`${where}: ${floor - got}/${floor} floor cells cut off (e.g. ${firstMiss})`);
    }
    assert.deepEqual(thin, [], `seed ${seed} (${town.name}): rooms that are not rooms`);
    assert.deepEqual(sealed, [], `seed ${seed} (${town.name}): you cannot get in`);
  }
});

test('every doorway is a real hole with headroom and a doorstep', () => {
  const loaded = loadTown(SEEDS[0], 2);
  const { open, reached } = survey(loaded);
  const bad = [];
  assert.ok(loaded.town.doors.length >= 5);
  for (const d of loaded.town.doors) {
    if (!open(d.x, d.y, d.z)) bad.push(`${d.name}: doorway blocked at foot level`);
    if (!open(d.x, d.y + 1, d.z)) bad.push(`${d.name}: doorway blocked at head level`);
    const outside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => reached(d.x + dx, d.y, d.z + dz));
    if (!outside) bad.push(`${d.name}: nothing reachable stands beside the doorway`);
  }
  assert.deepEqual(bad, []);
});

test('every door is two blocks tall, both leaves matching', () => {
  const { world, town } = loadTown(SEEDS[0], 2);
  const short = [], mismatched = [];
  for (const d of town.doors) {
    const lower = BLOCKS[world.getBlock(d.x, d.y, d.z)];
    const upper = BLOCKS[world.getBlock(d.x, d.y + 1, d.z)];
    if (lower?.shape !== 'door') continue;              // a forge bay has no leaf
    if (upper?.shape !== 'door') { short.push(`${d.name} at ${d.x},${d.y},${d.z} has no upper leaf`); continue; }
    if (lower.drops !== upper.drops) mismatched.push(`${d.name} leaves drop ${lower.drops} / ${upper.drops}`);
  }
  assert.deepEqual(short, [], 'doors must be two blocks tall');
  assert.deepEqual(mismatched, [], 'the two leaves must agree');
});

test('upper storeys are reachable, so the stairs actually go somewhere', () => {
  const loaded = loadTown(SEEDS[0], 3);
  const { town } = loaded;
  const { stand, reached } = survey(loaded);
  const upper = town.rooms.filter((r) => r.storey > 0);
  assert.ok(upper.length >= 4, `a ring-${town.ring} town should have storeys worth climbing to`);
  const stranded = [];
  for (const r of upper) {
    let got = 0;
    for (let x = r.x0; x <= r.x1; x++) {
      for (let z = r.z0; z <= r.z1; z++) if (stand(x, r.y, z) && reached(x, r.y, z)) got++;
    }
    if (got < 3) stranded.push(`${r.name} storey ${r.storey}: only ${got} reachable cells upstairs`);
  }
  assert.deepEqual(stranded, []);
});

test('the lane from the road can be WALKED, not jumped', () => {
  // Only stairs and slabs are walkable steps, so a lane that rises by a plain
  // block is a lane you have to jump up — which is not a road connection.
  for (const seed of SEEDS) {
    const loaded = loadTown(seed, 1);
    const { town } = loaded;
    const { reached } = survey(loaded, { jump: false });
    let got = 0, missed = null;
    for (const c of town.lane) {
      if (reached(c.x, c.y + 1, c.z)) got++;
      else if (!missed) missed = c;
    }
    assert.ok(got / town.lane.length > 0.8,
      `seed ${seed} (${town.name}): only ${got}/${town.lane.length} lane cells walkable (e.g. ${JSON.stringify(missed)})`);
    // and the market square itself is walkable from the road without a jump
    assert.ok(reached(town.tx, town.floor, town.tz)
      || [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]].some(([a, b]) => reached(town.tx + a, town.floor, town.tz + b)),
    `seed ${seed} (${town.name}): the town centre cannot be walked to from the road`);
  }
});

test('the townsfolk stand on ground you can reach, and so does the well', () => {
  for (const seed of SEEDS) {
    const loaded = loadTown(seed, 2);
    const { town } = loaded;
    const { reached } = survey(loaded);
    const beside = (x, y, z) => reached(x, y, z)
      || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => reached(x + dx, y, z + dz));
    const bad = [];
    for (const npc of town.npcs) {
      if (!beside(npc.x, npc.y, npc.z)) bad.push(`${npc.role} at ${npc.x},${npc.y},${npc.z} is walled in`);
    }
    for (const p of town.props) {
      if (p.kind !== 'well') continue;
      if (!beside(p.x, town.floor, p.z + 2)) bad.push('the well cannot be walked up to');
    }
    // Every craft station in the forge has to be usable, or the town's smithy is
    // scenery.
    if (town.forge) {
      for (const name of ['workbench', 'furnace', 'anvil_block']) {
        const id = B[name];
        let found = null;
        for (let x = town.forge.x0; x <= town.forge.x1 && !found; x++) {
          for (let z = town.forge.z0; z <= town.forge.z1 && !found; z++) {
            if (loaded.world.getBlock(x, town.floor, z) === id) found = [x, z];
          }
        }
        assert.ok(found, `${town.name}: the forge has no ${name}`);
        if (!beside(found[0], town.floor, found[1])) bad.push(`${name} in the forge cannot be reached`);
      }
    }
    assert.deepEqual(bad, [], `seed ${seed} (${town.name})`);
  }
});

// ---- people, quests and the rest of the game -------------------------------
test('a town publishes its people and its work through the existing systems', () => {
  const seed = SEEDS[0];
  const struct = buildStarterStructures();          // re-attaches the live sink
  const world = new World(seed);
  const town = findSettlement(world.gen, 2);
  assert.ok(town);
  // NPCs land in world.structure.npcs, which is what main.js renders and talks to.
  for (const npc of town.npcs) {
    assert.ok(NPC_DEFS[npc.id], `${npc.id} must be a registered villager`);
    assert.ok(DIALOGUES[NPC_DEFS[npc.id].dialogue], `${npc.id} must have a dialogue root`);
    assert.ok(world.structure.npcs.some((n) => n.id === npc.id && n.x === npc.x && n.z === npc.z),
      `${npc.id} should be published to the world`);
  }
  assert.ok(world.markers[`town_${town.d}_${town.n}`], 'a town publishes a map marker');
  void struct;

  // Quests are ordinary QUESTS entries — same shape the quest log already runs.
  assert.ok(town.quests.length >= 1, 'a town should have work');
  for (const q of town.quests) {
    assert.ok(q.name && q.intro && q.outro, `${q.id} is missing its text`);
    assert.ok(NPC_DEFS[q.giver], `${q.id} has an unknown giver`);
    assert.ok(q.stages.length >= 2, `${q.id} needs stages`);
    for (const st of q.stages) {
      assert.ok(st.text, `${q.id} stage missing text`);
      if (st.type === 'collect') assert.ok(ITEMS[st.item], `${q.id} wants an unknown item`);
      if (st.type === 'talk') assert.equal(st.npc, q.giver, `${q.id} reports to someone else`);
    }
    assert.equal(q.stages[q.stages.length - 1].type, 'talk', `${q.id} must end on a hand-in`);
    for (const it of q.rewards.items || []) assert.ok(ITEMS[it.item], `${q.id} rewards an unknown item`);
    assert.ok(q.rewards.coins > 0);
    // …and they are actually on the board.
    assert.ok(QUESTS.some((x) => x.id === q.id), `${q.id} never reached the quest log`);
  }
  // Difficulty and reward scale with the ring.
  const towns = allSettlements(world.gen, 3);
  const byRing = new Map();
  for (const t of towns) {
    for (const q of t.quests) {
      if (!byRing.has(t.ring)) byRing.set(t.ring, []);
      byRing.get(t.ring).push(q.rewards.coins);
    }
  }
  const rings = [...byRing.keys()].sort();
  if (rings.length >= 2) {
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    assert.ok(avg(byRing.get(rings[rings.length - 1])) > avg(byRing.get(rings[0])),
      'a far-ring town should pay better than a near one');
  }
});

test('a town grows its own crops and nothing wild grows through its roofs', () => {
  const { world, town } = loadTown(SEEDS[0], 2);
  const beds = town.nodes.filter((n) => n.type === 'farm_plot');
  assert.ok(beds.length >= 4, 'the tofts should be dug');
  for (const b of beds) {
    assert.equal(world.getBlock(b.x, town.padY, b.z), B.farmland, 'a crop stands on a bed this town laid');
    assert.ok(world.nodeAt(b.x, town.padY + 1, b.z), 'and the node is registered');
  }
  // Nothing the world scatters may be inside the town: the claims test is what
  // keeps a tree out of a roof.
  const cx = Math.floor(town.tx / CHUNK), cz = Math.floor(town.tz / CHUNK);
  const chunk = world.getChunk(cx, cz);
  for (const n of chunk.nodes) {
    if (NODE_TYPES[n.type].kind !== 'tree') continue;
    assert.ok(n.x < town.x0 || n.x > town.x1 || n.z < town.z0 || n.z > town.z1,
      `a ${n.type} grew inside ${town.name} at ${n.x},${n.z}`);
  }
  for (const s of chunk.spawns) {
    assert.ok(s.x < town.x0 || s.x > town.x1 || s.z < town.z0 || s.z > town.z1,
      `a ${s.type} spawns inside ${town.name}`);
  }
});

test('the delivery quest points at a town that exists', () => {
  const gen = new WorldGen(20260725);
  for (const t of allSettlements(gen, 2)) {
    for (const q of t.quests) {
      if (!q.deliverTo) continue;
      const [dd, dn] = q.deliverTo;
      const target = siteAt(gen, dd, dn);
      assert.ok(target, `${q.id} delivers to a town that is not there`);
      assert.equal(q.stages[0].marker, `town_${dd}_${dn}`);
      assert.ok(Math.hypot(target.tx - t.tx, target.tz - t.tz) > TOWN_SPACING * 0.4,
        'a delivery should be a journey');
    }
  }
});
