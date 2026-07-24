// Inter-town roads: deterministic gravel lanes graded so every step rises or
// drops at most one block (always walkable), baked from the seed before any
// chunk generates. Guards WorldGen.buildPaths / _routePath and the column stamp.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorldGen, TOWN_PAD, FROST_CAMP } from '../../js/world/worldgen.js';
import { World } from '../../js/world/world.js';
import { B } from '../../js/world/blocks.js';

const SPAWN = { x: 0, z: 0, ground: 64 };
const GREYWALL = { x: TOWN_PAD.x, z: TOWN_PAD.z, ground: TOWN_PAD.ground };
const FROST = { x: FROST_CAMP.x, z: FROST_CAMP.z, ground: FROST_CAMP.ground };

test('every road steps at most one block — always walkable', () => {
  const gen = new WorldGen(4242);
  for (const [A, Bp] of [[SPAWN, GREYWALL], [SPAWN, FROST]]) {
    const cells = gen._routePath(A, Bp);
    assert.ok(cells.length > 100, `the ${A.x},${A.z}→${Bp.x},${Bp.z} road spans many cells (${cells.length})`);
    for (let i = 1; i < cells.length; i++) {
      assert.ok(Math.abs(cells[i].y - cells[i - 1].y) <= 1,
        `step ${i}: height change ≤ 1 block (${cells[i - 1].y} → ${cells[i].y})`);
      const dx = Math.abs(cells[i].x - cells[i - 1].x), dz = Math.abs(cells[i].z - cells[i - 1].z);
      assert.equal(dx + dz, 1, `step ${i}: advances exactly one cell (4-connected)`);
    }
    // both ends meet their anchor
    const last = cells[cells.length - 1];
    assert.ok(Math.abs(last.x - Bp.x) + Math.abs(last.z - Bp.z) <= 1, 'the road reaches its destination');
  }
});

test('the whole lane is walkable — every road column is within 1 block of its road-neighbours', () => {
  // The real guarantee (not just the centre line): shoulders on a diagonal climb
  // must not leave a >1 lateral seam the 1-block auto-step can't cross.
  for (const seed of [12345, 59, 1, 777, 4242]) {
    const gen = new WorldGen(seed);
    let worst = 0, worstAt = '';
    for (const [k, y] of gen.pathY) {
      const c = k.split(','), x = +c[0], z = +c[1];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = gen.pathY.get((x + dx) + ',' + (z + dz));
        if (n === undefined) continue;
        const d = Math.abs(n - y);
        if (d > worst) { worst = d; worstAt = `${k} (${y}) vs ${(x + dx)},${(z + dz)} (${n})`; }
      }
    }
    assert.ok(worst <= 1, `seed ${seed}: max adjacent road step ${worst} > 1 at ${worstAt}`);
  }
});

test('roads never dip below the waterline', () => {
  const gen = new WorldGen(99);
  for (const [A, Bp] of [[SPAWN, GREYWALL], [SPAWN, FROST]]) {
    for (const c of gen._routePath(A, Bp)) {
      assert.ok(c.y >= 63, `road stays above sea level (y=${c.y})`); // SEA=62, road clamps to ≥63
    }
  }
});

test('roads are deterministic per seed and differ across seeds', () => {
  const a = new WorldGen(777);
  const b = new WorldGen(777);
  const c = new WorldGen(778);
  assert.ok(a.pathSet.size > 100, 'roads were baked in the constructor');
  assert.equal(a.pathSet.size, b.pathSet.size, 'same seed → same number of road cells');
  for (const k of a.pathSet) assert.ok(b.pathSet.has(k), `same seed → identical cell ${k}`);
  for (const k of a.pathY.keys()) assert.equal(a.pathY.get(k), b.pathY.get(k), `same seed → same graded height at ${k}`);
  let differs = c.pathSet.size !== a.pathSet.size;
  if (!differs) for (const k of a.pathSet) if (!c.pathSet.has(k)) { differs = true; break; }
  assert.ok(differs, 'a different seed routes a different road');
});

test('road columns render a gravel lane with clear headroom and solid support', () => {
  const w = new World(20260724);
  const gen = w.gen;
  assert.ok(gen.pathSet && gen.pathSet.size > 100, 'the world baked its roads');
  let checked = 0;
  for (const key of gen.pathSet) {
    const [x, z] = key.split(',').map(Number);
    if (Math.abs(x) > 200 || Math.abs(z) > 200) continue; // keep the chunks we generate near origin
    w.ensureChunk(Math.floor(x / 16), Math.floor(z / 16));
    const h = gen.heightAt(x, z);
    assert.equal(w.getBlock(x, h, z), B.gravel, `gravel road surface at ${x},${h},${z}`);
    assert.equal(w.getBlock(x, h + 1, z), B.air, `clear headroom over the road at ${x},${z} (nothing rooted on it)`);
    assert.equal(w.getBlock(x, h + 2, z), B.air, `2 blocks of headroom over the road at ${x},${z}`);
    assert.ok(w.collisionHeight(x, h - 1, z) > 0, `solid ground supports the road at ${x},${z}`);
    if (++checked >= 15) break;
  }
  assert.ok(checked >= 5, `verified several near-origin road cells (${checked})`);
});

test('road gravel wins over the beach rule even at the waterline height', () => {
  // On low/flat seeds most road cells grade down to SEA+1; the beach branch must
  // not repaint them as sand, or the visible gravel road disappears.
  const w = new World(1);
  const gen = w.gen;
  // find a road cell graded to exactly SEA+1 (=63) near enough to generate
  let cell = null;
  for (const key of gen.pathSet) {
    const [x, z] = key.split(',').map(Number);
    if (Math.abs(x) > 260 || Math.abs(z) > 260) continue;
    if (gen.heightAt(x, z) === 63) { cell = { x, z }; break; }
  }
  assert.ok(cell, 'found a road cell graded to the waterline (SEA+1)');
  w.ensureChunk(Math.floor(cell.x / 16), Math.floor(cell.z / 16));
  assert.equal(w.getBlock(cell.x, 63, cell.z), B.gravel, 'a waterline-height road cell is gravel, not beach sand');
});
