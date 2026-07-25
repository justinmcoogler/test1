// Procedural mineshafts & dungeons (js/world/mineshaft.js, js/world/dungeon.js).
// Two things have to hold or the feature is broken in ways a screenshot won't
// show: the layouts must be identical for a seed no matter which chunk asks
// first, and the places they build must actually be walkable — no chest room
// behind a cave-in, no boss room you can reach without the key, no key behind
// the door it opens. Everything below is checked against the BLOCKS that get
// stamped, not just the graph that produced them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorldGen, CHUNK, WORLD_H, ringAt } from '../../js/world/worldgen.js';
import { World } from '../../js/world/world.js';
import { BLOCKS, B, SHAPE_COLLISION } from '../../js/world/blocks.js';
import { NODE_TYPES } from '../../js/game/nodes.js';
import { ENEMY_TYPES } from '../../js/game/enemies.js';
import { ITEMS } from '../../js/game/items.js';
import { stampChunkStructures, structureClaims } from '../../js/world/structures.js';
import { findMineshaft, mineshaftAt, reachableCells, MS_HALF } from '../../js/world/mineshaft.js';
import { findDungeon, dungeonAt, reachableRooms, DG_HALF } from '../../js/world/dungeon.js';
import { nearHandBuilt } from '../../js/world/sites.js';

const SEEDS = [20260725, 7, 4242, 99, 1337];

// ---- helpers ---------------------------------------------------------------
// Rasterise a whole site by asking every chunk its footprint touches, exactly
// as chunk load would — so anything the tests see has already survived the
// chunk-clipping path.
function stampSite(gen, site) {
  const cells = new Map();
  const nodes = [], spawns = [], chests = [];
  const sink = {
    block: (x, y, z, id) => cells.set(`${x},${y},${z}`, id),
    node: (n) => nodes.push(n),
    spawn: (s) => spawns.push(s),
    chest: (c) => chests.push(c),
  };
  for (let cx = Math.floor(site.minX / CHUNK); cx <= Math.floor(site.maxX / CHUNK); cx++) {
    for (let cz = Math.floor(site.minZ / CHUNK); cz <= Math.floor(site.maxZ / CHUNK); cz++) {
      stampChunkStructures(gen, cx, cz, sink);
    }
  }
  return { cells, nodes, spawns, chests };
}

// A cell you could walk through. Untouched cells are raw terrain and count as
// rock, so a flood fill only ever travels through space the site itself carved.
function passable(id) {
  if (id === undefined) return false;
  const d = BLOCKS[id];
  if (!d || !d.solid) return true;
  const c = SHAPE_COLLISION[d.shape];
  return c !== undefined && c < 0.9;
}

function flood(cells, sx, sy, sz) {
  const seen = new Set();
  if (!passable(cells.get(`${sx},${sy},${sz}`))) return seen;
  seen.add(`${sx},${sy},${sz}`);
  const stack = [[sx, sy, sz]];
  const D = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  while (stack.length) {
    const [x, y, z] = stack.pop();
    for (const [dx, dy, dz] of D) {
      const k = `${x + dx},${y + dy},${z + dz}`;
      if (seen.has(k) || !passable(cells.get(k))) continue;
      seen.add(k); stack.push([x + dx, y + dy, z + dz]);
    }
  }
  return seen;
}

const touching = (air, x, y, z) =>
  [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]
    .some(([dx, dy, dz]) => air.has(`${x + dx},${y + dy},${z + dz}`));

function digest(gen, cx, cz) {
  const out = [];
  stampChunkStructures(gen, cx, cz, {
    block: (x, y, z, id) => out.push(`b:${x},${y},${z},${id}`),
    node: (n) => out.push(`n:${n.type}@${n.x},${n.y},${n.z}`),
    spawn: (s) => out.push(`s:${s.id}=${s.type}`),
    chest: (c) => out.push(`c:${c.id}`),
  });
  return out.join('|');
}

// ---- mineshafts ------------------------------------------------------------
test('a mineshaft generates somewhere findable, with a headframe on the surface', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const ms = findMineshaft(gen, 8);
    assert.ok(ms, `seed ${seed}: found a mineshaft within 8 regions of spawn`);
    assert.ok(ms.levelY.length >= 2, 'a mineshaft is at least two levels deep');
    assert.ok(ms.segs.length >= 4, `it has real corridors (${ms.segs.length} drifts)`);
    assert.ok(ms.bottom < ms.surfaceY - 12, 'the workings sit well below the surface');

    const { cells, chests } = stampSite(gen, ms);
    // the shaft mouth is open sky-side, and the ladder reaches it
    assert.ok(passable(cells.get(`${ms.x},${ms.surfaceY + 2},${ms.z}`)), 'the shaft mouth is open at the surface');
    assert.equal(cells.get(`${ms.x + 1},${ms.surfaceY},${ms.z}`), B.ladder, 'a ladder runs down the shaft');
    assert.equal(cells.get(`${ms.x - 2},${ms.surfaceY + 2},${ms.z - 2}`), B.oak_log, 'the headframe stands on the pad');
    assert.equal(chests.length, 1, 'exactly one pay chest');
  }
});

test('a mineshaft is walkable end to end — cave-ins only ever block a dead end', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const ms = findMineshaft(gen, 8);
    // graph-level: nothing but leaves may be cut off
    const reach = reachableCells(ms);
    for (let c = 0; c < ms.cells.length; c++) {
      const cell = ms.cells[c];
      const collapsed = cell.seg >= 0 && ms.segs[cell.seg].collapsed;
      assert.equal(reach.has(c), !collapsed, `seed ${seed}: cell ${c} reachable iff its drift is open`);
      if (collapsed) assert.ok(cell.leaf, 'a cave-in is only ever on a dead end');
    }
    // block-level: walk it from the surface and land in the chest room
    const { cells } = stampSite(gen, ms);
    const air = flood(cells, ms.x, ms.surfaceY + 2, ms.z);
    assert.ok(air.size > 400, `seed ${seed}: the workings are one connected space (${air.size} cells)`);
    assert.ok(touching(air, ms.chest.x, ms.chest.y, ms.chest.z),
      `seed ${seed}: you can walk up to the chest at ${ms.chest.x},${ms.chest.y},${ms.chest.z}`);
    for (const level of ms.levelY) {
      assert.ok(air.has(`${ms.x - 1},${level + 1},${ms.z}`), `seed ${seed}: the ladder reaches level y=${level}`);
    }
  }
});

test('every ore vein in an open drift is exposed to the corridor beside it', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const ms = findMineshaft(gen, 8);
    const { cells } = stampSite(gen, ms);
    const air = flood(cells, ms.x, ms.surfaceY + 2, ms.z);
    // A vein is either mineable from a corridor, or it is deliberately walled in
    // behind a cave-in — nothing else. Sealed veins in a live drift would be ore
    // the player can see on the minimap and never reach.
    const collapsedBoxes = ms.segs.filter((s) => s.collapsed).map((s) => [
      Math.min(s.x0, s.x1) - 3, Math.max(s.x0, s.x1) + 3, Math.min(s.z0, s.z1) - 3, Math.max(s.z0, s.z1) + 3,
    ]);
    for (const v of ms.veins) {
      if (touching(air, v.x, v.y, v.z)) continue;
      const behindRubble = collapsedBoxes.some(([x0, x1, z0, z1]) => v.x >= x0 && v.x <= x1 && v.z >= z0 && v.z <= z1);
      assert.ok(behindRubble, `seed ${seed}: vein at ${v.x},${v.y},${v.z} is reachable or behind a cave-in`);
    }
  }
});

test('mineshaft ore gets richer with depth', () => {
  // Deep drifts must be able to carry metals the top level never does, or the
  // descent buys nothing. Sampled across many sites so one unlucky roll can't
  // decide it.
  const deepOnly = new Set(['ore_silver', 'ore_gold', 'ore_platinum', 'ore_meteoric']);
  let topDeep = 0, bottomDeep = 0, sites = 0;
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    for (let rx = -8; rx <= 8; rx++) {
      for (let rz = -8; rz <= 8; rz++) {
        const ms = mineshaftAt(gen, rx, rz);
        if (!ms) continue;
        sites++;
        const last = ms.levelY.length - 1;
        for (const v of ms.veins) {
          const seg = ms.segs.find((s) => s.y + 1 === v.y || s.y + 2 === v.y);
          if (!seg) continue;
          if (!deepOnly.has(v.type)) continue;
          if (seg.level === 0) topDeep++; else if (seg.level === last) bottomDeep++;
        }
      }
    }
  }
  assert.ok(sites > 20, `sampled plenty of mineshafts (${sites})`);
  assert.equal(topDeep, 0, 'the top level never carries silver, gold, platinum or meteoric iron');
  assert.ok(bottomDeep > 0, `the bottom level does (${bottomDeep} veins)`);
});

// ---- dungeons --------------------------------------------------------------
test('a dungeon generates somewhere findable, sized and themed by ring', () => {
  const themes = new Set();
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const dg = findDungeon(gen, 6);
    assert.ok(dg, `seed ${seed}: found a dungeon within 6 regions of spawn`);
    assert.ok(dg.rooms.length >= 4 && dg.rooms.length <= 14, `${dg.rooms.length} rooms`);
    assert.equal(dg.rooms.filter((r) => r.kind === 'boss').length, 1, 'exactly one boss room');
    assert.equal(dg.ring, ringAt(dg.x, dg.z), 'the ring is read off the anchor');
    assert.equal(dg.theme.key, ['crypt', 'ruin', 'fortress', 'vault'][dg.ring], 'crypt → ruin → fortress → vault');
    themes.add(dg.theme.key);

    const { cells, chests, spawns } = stampSite(gen, dg);
    assert.ok(passable(cells.get(`${dg.x},${dg.surfaceY + 2},${dg.z}`)), 'the stair head is open at the surface');
    assert.equal(chests.length, 2, 'the boss hoard and the mini-boss strongbox');
    assert.ok(spawns.length >= dg.rooms.length, `every room is populated (${spawns.length} spawns)`);
  }
  // Walk far enough out and the masonry changes.
  const far = new WorldGen(20260725);
  for (let rx = -14; rx <= 14; rx += 2) {
    for (let rz = -14; rz <= 14; rz += 2) {
      const dg = dungeonAt(far, rx, rz);
      if (dg) themes.add(dg.theme.key);
    }
  }
  assert.ok(themes.size >= 2, `themes vary with distance (${[...themes].join(', ')})`);
});

test('every dungeon room connects, and exactly one sits behind the locked door', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const dg = findDungeon(gen, 6);
    const all = reachableRooms(dg, true);
    assert.equal(all.size, dg.rooms.length, `seed ${seed}: no room is orphaned`);
    const beforeKey = reachableRooms(dg, false);
    assert.equal(beforeKey.size, dg.rooms.length - 1, 'the lock isolates exactly one room');
    assert.ok(!beforeKey.has(dg.boss), 'and that room is the boss room');
    assert.equal(dg.edges.filter((e) => e.locked).length, 1, 'one locked edge');
    assert.equal(dg.edges.filter((e) => e.a === dg.boss || e.b === dg.boss).length, 1,
      'nothing else reaches the boss room, so the lock cannot be walked around');
  }
});

test("the locked door's key is genuinely reachable before the door", () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const dg = findDungeon(gen, 6);
    const kr = dg.rooms[dg.keyRoom];
    assert.notEqual(dg.keyRoom, dg.boss, 'the key is not locked inside the room it opens');
    assert.ok(reachableRooms(dg, false).has(dg.keyRoom), 'the key room is on the entrance side of the door');
    assert.ok(ENEMY_TYPES[dg.theme.mini], `the mini-boss ${dg.theme.mini} is a real creature`);

    // …and the same thing in blocks: walk in from the stair head with the grate
    // shut. The mini-boss must be standing somewhere you can get to; the boss
    // must not be.
    const { cells, spawns } = stampSite(gen, dg);
    const air = flood(cells, dg.x, dg.surfaceY + 2, dg.z);
    const holder = spawns.find((s) => s.id === dg.door.keyHolder);
    assert.ok(holder, 'the key holder is spawned');
    assert.equal(holder.type, dg.theme.mini, 'and it is the mini-boss');
    assert.ok(air.has(`${holder.x},${holder.y},${holder.z}`), `seed ${seed}: you can walk to the key holder`);
    const br = dg.rooms[dg.boss];
    assert.ok(!air.has(`${br.x},${dg.y + 1},${br.z}`), `seed ${seed}: the boss room is sealed by the grate`);
    assert.equal(cells.get(`${dg.door.x},${dg.door.y},${dg.door.z}`), B.iron_bars, 'the grate is where the layout says');

    // Break the grate and the boss room opens up — proving it was the grate
    // holding it shut and not an accidentally unreachable room.
    for (const [k, id] of cells) if (id === B.iron_bars) cells.set(k, B.air);
    const opened = flood(cells, dg.x, dg.surfaceY + 2, dg.z);
    for (const r of dg.rooms) {
      assert.ok(opened.has(`${r.x},${dg.y + 1},${r.z}`), `seed ${seed}: room ${r.kind} opens up once the grate is down`);
    }
  }
});

// ---- the chunk-local contract ---------------------------------------------
test('layouts are deterministic for a seed and differ across seeds', () => {
  for (const seed of SEEDS) {
    const a = new WorldGen(seed), b = new WorldGen(seed);
    for (let cx = -14; cx <= 14; cx += 3) {
      for (let cz = -14; cz <= 14; cz += 3) {
        assert.equal(digest(a, cx, cz), digest(b, cx, cz), `seed ${seed}: chunk ${cx},${cz} regenerates identically`);
      }
    }
  }
  const one = findMineshaft(new WorldGen(4242), 8);
  const other = findMineshaft(new WorldGen(4243), 8);
  assert.notEqual(`${one.x},${one.z},${one.segs.length}`, `${other.x},${other.z},${other.segs.length}`,
    'a different seed digs a different mine');
});

test('a chunk generates in isolation: order-independent, and never writes outside itself', () => {
  const gen = new WorldGen(20260725);
  const coords = [];
  for (let cx = -14; cx <= 14; cx += 2) for (let cz = -14; cz <= 14; cz += 2) coords.push([cx, cz]);

  // Forward, then reverse on a generator that has never seen these chunks: if a
  // site leaked state across chunks, the two passes would disagree.
  const forward = new Map();
  for (const [cx, cz] of coords) forward.set(`${cx},${cz}`, digest(gen, cx, cz));
  const fresh = new WorldGen(20260725);
  for (let i = coords.length - 1; i >= 0; i--) {
    const [cx, cz] = coords[i];
    assert.equal(digest(fresh, cx, cz), forward.get(`${cx},${cz}`), `chunk ${cx},${cz} is load-order independent`);
  }

  // And nothing a chunk writes may land in a neighbour — that is what lets the
  // union of independently generated chunks be the whole site.
  for (const [cx, cz] of coords) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    stampChunkStructures(gen, cx, cz, {
      block: (x, y, z) => {
        assert.ok(x >= x0 && x < x0 + CHUNK && z >= z0 && z < z0 + CHUNK, `block ${x},${y},${z} stays in chunk ${cx},${cz}`);
        assert.ok(y >= 0 && y < 512, `block ${x},${y},${z} stays in the world`);
      },
      node: (n) => assert.ok(n.x >= x0 && n.x < x0 + CHUNK && n.z >= z0 && n.z < z0 + CHUNK, 'node stays in chunk'),
      spawn: (s) => assert.ok(s.x >= x0 && s.x < x0 + CHUNK && s.z >= z0 && s.z < z0 + CHUNK, 'spawn stays in chunk'),
      chest: (c) => assert.ok(c.x >= x0 && c.x < x0 + CHUNK && c.z >= z0 && c.z < z0 + CHUNK, 'chest stays in chunk'),
    });
  }
});

test('a site never reaches further than the half-extent the chunk sweep assumes', () => {
  // The per-chunk region sweep only asks regions within MS_HALF/DG_HALF. If a
  // layout ever exceeded that, a chunk would silently miss part of a site and
  // leave a wall of raw stone across a corridor.
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    for (let rx = -8; rx <= 8; rx++) {
      for (let rz = -8; rz <= 8; rz++) {
        const ms = mineshaftAt(gen, rx, rz);
        if (ms) {
          assert.ok(ms.x - ms.minX <= MS_HALF && ms.maxX - ms.x <= MS_HALF
            && ms.z - ms.minZ <= MS_HALF && ms.maxZ - ms.z <= MS_HALF,
          `seed ${seed} mineshaft ${rx},${rz} fits inside MS_HALF=${MS_HALF}`);
        }
        const dg = dungeonAt(gen, rx, rz);
        if (dg) {
          assert.ok(dg.x - dg.minX <= DG_HALF && dg.maxX - dg.x <= DG_HALF
            && dg.z - dg.minZ <= DG_HALF && dg.maxZ - dg.z <= DG_HALF,
          `seed ${seed} dungeon ${rx},${rz} fits inside DG_HALF=${DG_HALF}`);
        }
      }
    }
  }
});

test('sites keep out of the hand-built world and off the baked lanes', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    for (let rx = -8; rx <= 8; rx++) {
      for (let rz = -8; rz <= 8; rz++) {
        for (const site of [mineshaftAt(gen, rx, rz), dungeonAt(gen, rx, rz)]) {
          if (!site) continue;
          assert.ok(!nearHandBuilt(site.x, site.z), `site at ${site.x},${site.z} clears Brookhollow and the pinned pads`);
          assert.ok(!gen.pathSet.has(`${site.x},${site.z}`), 'and does not punch a shaft through a road');
        }
      }
    }
  }
});

test('the entrance claims its own surface columns, and nothing else does', () => {
  const gen = new WorldGen(20260725);
  const ms = findMineshaft(gen, 8);
  assert.ok(structureClaims(gen, ms.x, ms.z), 'the headframe column is claimed');
  assert.ok(structureClaims(gen, ms.x + 3, ms.z - 3), 'so is the edge of its pad');
  assert.ok(!structureClaims(gen, ms.x + 20, ms.z), 'open ground 20 blocks away is not — the scatter still runs there');
  assert.ok(!structureClaims(gen, 0, 0), 'and the spawn plaza is never claimed');
});

test('the sink contract drops a real, standable mineshaft into a live World', () => {
  // Chunk generation calls stampChunkStructures through this sink (see the note
  // in js/world/structures.js). Doing it here pins the contract and proves the
  // result is a place a player can stand in, not just a set of block writes.
  // Idempotent: re-stamping an already-stamped chunk rewrites the same cells.
  const w = new World(20260725);
  const ms = findMineshaft(w.gen, 8);
  const lidx = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;
  for (let cx = Math.floor(ms.minX / CHUNK); cx <= Math.floor(ms.maxX / CHUNK); cx++) {
    for (let cz = Math.floor(ms.minZ / CHUNK); cz <= Math.floor(ms.maxZ / CHUNK); cz++) {
      const chunk = w.ensureChunk(cx, cz);
      let top = chunk.contentTop;
      stampChunkStructures(w.gen, cx, cz, {
        block: (x, y, z, id) => {
          chunk.blocks[lidx(x - cx * CHUNK, y, z - cz * CHUNK)] = id;
          if (id !== B.air && y + 1 > top) top = y + 1;
        },
        node: (n) => chunk.nodes.push(n),
        spawn: (s) => chunk.spawns.push(s),
        chest: (c) => w.chestMeta.set(c.id, c),
      });
      chunk.contentTop = Math.min(WORLD_H, top);
    }
  }
  // Stand on the pad beside the shaft, then find footing on every level below.
  assert.ok(w.groundNear(ms.x + 2, ms.z, ms.surfaceY + 1), 'there is footing on the headframe pad');
  for (const level of ms.levelY) {
    assert.ok(w.groundNear(ms.x - 1, ms.z, level + 1), `there is footing on the level at y=${level}`);
  }
  assert.ok(w.groundNear(ms.chest.x, ms.chest.z + 2, ms.chest.y), 'and in the chest room');
  assert.ok(w.getChestAt(ms.chest.x, ms.chest.y, ms.chest.z), 'the pay chest is registered and openable');
  assert.ok(w.openChest(ms.chest.id).length > 0, 'and it has loot in it');
});

// ---- content ---------------------------------------------------------------
test('every id a site places already exists — the audit stays clean', () => {
  const gen = new WorldGen(20260725);
  const seen = { nodes: new Set(), mobs: new Set(), items: new Set() };
  for (const seed of SEEDS) {
    const g = new WorldGen(seed);
    for (let rx = -8; rx <= 8; rx++) {
      for (let rz = -8; rz <= 8; rz++) {
        for (const site of [mineshaftAt(g, rx, rz), dungeonAt(g, rx, rz)]) {
          if (!site) continue;
          const { nodes, spawns, chests } = stampSite(g, site);
          for (const n of nodes) seen.nodes.add(n.type);
          for (const s of spawns) seen.mobs.add(s.type);
          for (const c of chests) for (const l of c.loot) seen.items.add(l.item);
        }
      }
    }
  }
  assert.ok(seen.nodes.size && seen.mobs.size && seen.items.size, 'the sweep actually placed things');
  for (const t of seen.nodes) assert.ok(NODE_TYPES[t], `node type ${t} exists`);
  for (const t of seen.mobs) assert.ok(ENEMY_TYPES[t] && !ENEMY_TYPES[t].noOverworld, `mob ${t} exists and can stand in the world`);
  for (const i of seen.items) assert.ok(ITEMS[i], `loot item ${i} exists`);
  // The world's boss flags are keyed by mob TYPE (js/main.js BOSS_FLAGS), so a
  // procedural copy of a flagged boss would unlock the hand-built Rootgrave and
  // Rimehowl chests from the other side of the map.
  for (const t of seen.mobs) assert.ok(t !== 'rootbound_golem' && t !== 'rimehowl_alpha', `${t} is not a flag-carrying boss`);
  assert.ok(ITEMS[findDungeon(gen, 6).door.keyItem], 'the door key is a real item');
});
