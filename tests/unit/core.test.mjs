// Unit tests for DOM-free game logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hashSeed, mulberry32, hash2 } from '../../js/core/rng.js';
import { fbm2, valueNoise2 } from '../../js/core/noise.js';
import { xpForLevel, levelForXp, Skills } from '../../js/game/skills.js';
import { WorldGen, CHUNK, SEA, WORLD_H, BIOMES, ringAt, newBlend } from '../../js/world/worldgen.js';
import { World, chunkKey } from '../../js/world/world.js';
import { B } from '../../js/world/blocks.js';
import { NODE_TYPES, nodeBlocks, nodeCells, rollNodeDrops } from '../../js/game/nodes.js';
import { RECIPES } from '../../js/game/crafting.js';
import { ITEMS } from '../../js/game/items.js';
import { ENEMY_TYPES } from '../../js/game/enemies.js';
import { ABILITIES } from '../../js/game/combat.js';
import { buildStarterStructures } from '../../js/world/structures.js';
import { QUESTS } from '../../js/game/quests.js';
import { NPC_DEFS, DIALOGUES } from '../../js/game/npcs.js';

test('seeded rng is deterministic', () => {
  const a = mulberry32(hashSeed('sproutlands'));
  const b = mulberry32(hashSeed('sproutlands'));
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('noise is deterministic and bounded', () => {
  for (let i = 0; i < 200; i++) {
    const v = fbm2(1234, i * 0.7, i * 1.3);
    assert.ok(v >= 0 && v <= 1, `fbm out of range: ${v}`);
    assert.equal(v, fbm2(1234, i * 0.7, i * 1.3));
  }
});

test('xp curve: monotonic, level 1 at 0, 99 reachable', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(levelForXp(0), 1);
  for (let l = 2; l <= 99; l++) assert.ok(xpForLevel(l) > xpForLevel(l - 1));
  assert.equal(levelForXp(xpForLevel(50)), 50);
  assert.equal(levelForXp(xpForLevel(99) + 1e9), 99);
  assert.ok(xpForLevel(99) > 1_000_000, 'level 99 should be a long-term goal');
});

test('skills award xp and level up', () => {
  const s = new Skills();
  assert.equal(s.level('mining'), 1);
  s.addXp('mining', xpForLevel(10));
  assert.equal(s.level('mining'), 10);
  assert.ok(s.gatherTimeMult('mining') < 1);
  const round = s.serialize();
  const s2 = new Skills();
  s2.deserialize(round);
  assert.equal(s2.level('mining'), 10);
});

test('worldgen: deterministic heights, sane range, flat settlement', () => {
  const g1 = new WorldGen(42), g2 = new WorldGen(42), g3 = new WorldGen(43);
  let diff = 0;
  for (let i = 0; i < 300; i++) {
    const x = (i * 37) % 800 - 400, z = (i * 91) % 800 - 400;
    const h = g1.heightAt(x, z);
    assert.equal(h, g2.heightAt(x, z));
    assert.ok(h >= 4 && h <= WORLD_H - 6);
    if (h !== g3.heightAt(x, z)) diff++;
  }
  assert.ok(diff > 100, 'different seeds should differ');
  for (const [x, z] of [[0, 0], [10, -10], [-20, 15], [30, 0], [0, 30]]) {
    assert.equal(g1.heightAt(x, z), 64, `settlement should be flat at ${x},${z}`);
  }
});

test('worldgen: terrain is walkable near spawn (no >1 steps on paths out)', () => {
  const g = new WorldGen(hashSeed('walkable'));
  // walk 8 directions outward from spawn; adjacent column steps must be ≤ 2
  for (let dir = 0; dir < 8; dir++) {
    const ang = (dir / 8) * Math.PI * 2;
    let prev = g.heightAt(0, 0);
    let bigSteps = 0;
    for (let r = 1; r < 120; r++) {
      const h = g.heightAt(Math.round(Math.cos(ang) * r), Math.round(Math.sin(ang) * r));
      if (Math.abs(h - prev) > 2) bigSteps++;
      prev = h;
    }
    assert.ok(bigSteps < 6, `too many cliffs on ray ${dir}: ${bigSteps}`);
  }
});

test('biomes get harsher with distance', () => {
  const g = new WorldGen(7);
  assert.equal(g.tierAt(0, 0), 0);
  assert.ok(g.tierAt(2000, 2000) >= 2);
});

test('biomes: real-world climate model is deterministic, mild at spawn, complete far out', () => {
  const g = new WorldGen(hashSeed('climate'));
  assert.strictEqual(g.biomeAt(300, -220), g.biomeAt(300, -220), 'biomeAt must be deterministic');
  // The spawn ring is always a hospitable temperate biome — never a harsh one.
  const SPAWN_OK = new Set(['Grassland', 'Temperate Forest', 'Temperate Rainforest', 'Boreal Forest', 'Swamp', 'Marshland']);
  for (let a = 0; a < 16; a++) {
    const x = Math.round(Math.cos(a) * 45), z = Math.round(Math.sin(a) * 45);
    assert.ok(SPAWN_OK.has(g.biomeAt(x, z).label), `spawn area not hospitable: ${g.biomeAt(x, z).label}`);
  }
  // Over a wide span, all the major real-world biomes are reachable.
  const seen = new Set();
  for (let x = -2000; x <= 2000; x += 40) for (let z = -2000; z <= 2000; z += 40) seen.add(g.biomeAt(x, z).label);
  const need = [
    'Grassland', 'Temperate Forest', 'Temperate Rainforest', 'Mediterranean Shrubland',
    'Savanna', 'Monsoon Forest', 'Tropical Rainforest', 'Desert', 'Cold Desert',
    'Boreal Forest', 'Tundra', 'Polar Ice Cap', 'Swamp', 'Marshland', 'Mangrove Coast',
    'Mountains', 'Alpine Meadow', 'Snowy Mountains', 'Coast',
  ];
  const missing = need.filter((n) => !seen.has(n));
  assert.deepEqual(missing, [], `unreachable biomes: ${missing.join(', ')}`);
});

test('rings: difficulty is distance, and a new player starts in ring 0', () => {
  assert.equal(ringAt(0, 0), 0);
  const [sx, , sz] = buildStarterStructures().markers.spawn;
  assert.equal(ringAt(sx, sz), 0, 'the spawn plaza must sit in ring 0');
  // The whole first 512 blocks are ring 0 — this is the proof that nothing
  // ring-gated can reach the starting bowl, whatever the seed.
  for (let x = -511; x <= 511; x += 7) {
    for (let z = -511; z <= 511; z += 7) {
      if (Math.hypot(x, z) < 512) assert.equal(ringAt(x, z), 0, `${x},${z} should be ring 0`);
    }
  }
  assert.equal(ringAt(512, 0), 1);
  assert.equal(ringAt(0, -1535), 2);
  assert.equal(ringAt(2200, 2200), 3);
  assert.equal(ringAt(1e6, 1e6), 3, 'rings cap so the far world stays generatable');
});

test('rings: the starting bowl spawns wildlife but nothing ring-gated', () => {
  // Which mobs are held back is read from the biome tables, so re-tiering the
  // roster keeps this honest without editing the test.
  const gated = new Set();
  for (const b of Object.values(BIOMES)) for (const e of b.enemies || []) if (e.ring > 0) gated.add(e.type);
  assert.ok(gated.size >= 6, 'the hostile roster should be ring-gated');

  const w = new World(20260725);
  const found = new Set();
  let total = 0;
  for (let cx = -8; cx <= 8; cx++) {
    for (let cz = -8; cz <= 8; cz++) {
      const c = w.ensureChunk(cx, cz);
      for (const sp of c.spawns) { total++; found.add(sp.type); }
      w.chunks.delete(chunkKey(cx, cz)); // inspected — don't hold 289 chunks of blocks
    }
  }
  assert.ok(total > 50, 'the starting bowl should still be full of creatures');
  const leaked = [...found].filter((t) => gated.has(t));
  assert.deepEqual(leaked, [], `ring-gated mobs spawned beside spawn: ${leaked.join(', ')}`);
});

test('biome blending: weights are a real distribution, interiors stay pure, seams blend', () => {
  const g = new WorldGen(hashSeed('blend'));
  const bl = newBlend();
  const real = new Set(Object.values(BIOMES));
  let cols = 0, pure = 0, blended = 0, dithered = 0;
  for (let x = -1200; x <= 1200; x += 17) {
    for (let z = -1200; z <= 1200; z += 19) {
      const h = g.heightAt(x, z);
      g.blendAt(x, z, h, bl);
      cols++;
      assert.ok(bl.n >= 1, `no biome candidate at ${x},${z}`);
      let sum = 0, holdsPick = false;
      const pick = g.biomeAt(x, z, h);
      for (let i = 0; i < bl.n; i++) {
        assert.ok(real.has(bl.b[i]), `blend candidate is not a biome at ${x},${z}`);
        assert.ok(bl.w[i] > 0, `zero-weight candidate at ${x},${z}`);
        sum += bl.w[i];
        if (bl.b[i] === pick) holdsPick = true;
      }
      assert.ok(Math.abs(sum - 1) < 1e-9, `weights must sum to 1, got ${sum}`);
      assert.ok(holdsPick, `the picked biome is not one of the candidates at ${x},${z}`);
      if (bl.n === 1) pure++;
      else { blended++; if (pick !== bl.b[0]) dithered++; }
    }
  }
  assert.ok(pure / cols > 0.5, `biome interiors should stay pure, only ${pure}/${cols} were`);
  assert.ok(blended > cols * 0.05, `seams should blend, only ${blended}/${cols} columns did`);
  assert.ok(dithered > 0, 'the seam band must dither, or the boundary is still a drawn line');
});

test('biome blending is deterministic — same seed, same world', () => {
  const g1 = new WorldGen(hashSeed('blend')), g2 = new WorldGen(hashSeed('blend'));
  const a = newBlend(), b = newBlend();
  for (let i = 0; i < 400; i++) {
    const x = (i * 137) % 2400 - 1200, z = (i * 271) % 2400 - 1200;
    assert.strictEqual(g1.biomeAt(x, z), g2.biomeAt(x, z), `biome differs at ${x},${z}`);
    g1.blendAt(x, z, undefined, a);
    g2.blendAt(x, z, undefined, b);
    assert.equal(a.n, b.n);
    for (let k = 0; k < a.n; k++) { assert.strictEqual(a.b[k], b.b[k]); assert.equal(a.w[k], b.w[k]); }
  }
});

test('node definitions are complete and consistent', () => {
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    assert.ok(def.label && def.skill && def.xp > 0 && def.respawn > 0, type);
    assert.ok(def.charges[0] >= 1 && def.charges[1] >= def.charges[0], type);
    for (const d of def.drops) {
      assert.ok(ITEMS[d.item], `${type} drops unknown item ${d.item}`);
    }
    for (const r of def.rare) assert.ok(ITEMS[r.item], `${type} rare drops unknown item ${r.item}`);
    // suggested regeneration ranges from the design
    if (type === 'tree_pine') assert.ok(def.respawn >= 30 && def.respawn <= 60);
    if (type === 'ore_copper') assert.ok(def.respawn >= 45 && def.respawn <= 90);
    if (type === 'ore_meteoric') assert.ok(def.respawn >= 300, 'deep ores regenerate slowly');
  }
});

test('tree nodes stamp trunks and regrow from stumps', () => {
  const node = { type: 'tree_pine', x: 5, y: 31, z: 5, meta: { h: 5 }, def: NODE_TYPES.tree_pine };
  const ready = nodeBlocks(node, 'ready');
  const depleted = nodeBlocks(node, 'depleted');
  assert.ok(ready.length > 10, 'tree should have trunk + canopy');
  assert.equal(depleted.length, 1, 'depleted tree = stump only');
  assert.ok(nodeCells(node).length === 5, 'interaction cells = trunk height');
});

test('node drops respect level gates and always yield something', () => {
  const rand = mulberry32(99);
  for (let i = 0; i < 50; i++) {
    const drops = rollNodeDrops(NODE_TYPES.fishing_spot, 1, rand);
    assert.ok(drops.length >= 1);
    assert.equal(drops[0].item, 'silverfin', 'level 1 fisher only catches silverfin');
  }
  let sawBetter = false;
  for (let i = 0; i < 200; i++) {
    const drops = rollNodeDrops(NODE_TYPES.fishing_spot, 30, rand);
    if (drops[0].item !== 'silverfin') sawBetter = true;
  }
  assert.ok(sawBetter, 'higher level should unlock better fish');
});

test('all recipes reference real items and skills', () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id));
    ids.add(r.id);
    assert.ok(ITEMS[r.out], `recipe output missing: ${r.out}`);
    for (const inp of r.inputs) assert.ok(ITEMS[inp.item], `recipe input missing: ${inp.item}`);
    assert.ok(r.xp > 0 && r.level >= 1);
  }
});

test('every enemy is fully defined', () => {
  for (const [type, def] of Object.entries(ENEMY_TYPES)) {
    assert.ok(def.label && def.hp > 0 && def.model?.length >= 2, type);
    assert.ok(def.desc && def.recommend, `${type} needs lore + recommendation`);
    assert.ok(['passive', 'defensive', 'aggressive'].includes(def.behavior), type);
    for (const d of def.drops || []) assert.ok(ITEMS[d.item], `${type} drops unknown ${d.item}`);
    for (const ab of def.abilities || []) assert.ok(ABILITIES[ab], `${type} unknown ability ${ab}`);
  }
});

test('starter structures: chests/npcs/nodes/spawns are valid', () => {
  const s = buildStarterStructures();
  assert.ok(s.edits.size > 500, 'settlement should be substantial');
  assert.equal(s.npcs.length, 4); // Maren, Tam, Warden Sylla, and Pip (Numbers Meadow guide)
  assert.ok(s.npcs.some((n) => n.id === 'sylla'));
  assert.ok(s.npcs.some((n) => n.id === 'pip'));
  assert.ok(s.spawns.some((sp) => sp.type === 'rootbound_golem' && sp.boss));
  assert.ok(s.spawns.some((sp) => sp.type === 'rimehowl_alpha' && sp.boss));
  assert.ok(s.nodes.filter((n) => n.type.startsWith('ore_')).length >= 5);
  assert.ok(s.nodes.some((n) => n.type === 'fishing_spot'));
  for (const n of s.nodes) assert.ok(NODE_TYPES[n.type], `unknown node ${n.type}`);
  for (const ch of s.chests) for (const l of ch.loot) assert.ok(ITEMS[l.item], `chest loot unknown ${l.item}`);
  // spawn point must be inside the flat zone
  const [sx, , sz] = s.markers.spawn;
  assert.ok(Math.hypot(sx, sz) < 34);
});

test('quests: chain is well-formed, rewards exist', () => {
  const ids = new Set(QUESTS.map((q) => q.id));
  for (const q of QUESTS) {
    assert.ok(q.stages.length >= 1 && q.intro && q.name);
    if (q.requires) assert.ok(ids.has(q.requires), `${q.id} requires unknown quest`);
    for (const it of q.rewards?.items || []) assert.ok(ITEMS[it.item], `${q.id} rewards unknown item`);
    for (const st of q.stages) assert.ok(st.text, `${q.id} stage missing text`);
    assert.ok(NPC_DEFS[q.giver], `${q.id} unknown giver`);
  }
  // tutorial chain reaches the boss
  assert.ok(QUESTS.some((q) => q.stages.some((s) => s.type === 'defeat' && s.enemy === 'rootbound_golem')));
});

test('dialogue graph has no dangling links', () => {
  for (const [id, node] of Object.entries(DIALOGUES)) {
    assert.ok(NPC_DEFS[node.speaker], `${id} unknown speaker`);
    for (const opt of node.options || []) {
      if (opt.next) assert.ok(DIALOGUES[opt.next], `${id} → dangling ${opt.next}`);
    }
  }
});

test('abilities all resolvable', () => {
  for (const [id, ab] of Object.entries(ABILITIES)) {
    assert.ok(ab.label, id);
    if (ab.req) assert.ok(['strength', 'ranged', 'magic', 'healing'].includes(ab.req[0]));
  }
});

test('nothing the world scatters is left hanging over a cave mouth', () => {
  // `column()` returns the TERRAIN height, which is not the same thing as where
  // the ground is: a cave that breaks the surface carves the block at `h` to air.
  // Scatters that only checked `h + 1` for air used to place nodes and mob spawns
  // on the lip of that hole, floating. This walks a wide spread of real chunks
  // and asserts the invariant directly on generated output.
  const w = new World(12345);
  const lidx = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;
  const orphans = [];
  let checked = 0;

  for (let cx = -14; cx <= 14; cx += 2) {
    for (let cz = -14; cz <= 14; cz += 2) {
      const ch = w.generateChunk(cx, cz);
      const inChunk = (x, z) => {
        const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
        return lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK ? [lx, lz] : null;
      };
      for (const n of ch.nodes) {
        // Water nodes float on purpose; ore nodes REPLACE a stone block, so they
        // are embedded in a cave wall and legitimately have air below them. Only
        // things standing above the surface need ground under them.
        if (NODE_TYPES[n.type].kind === 'water') continue;
        const at = inChunk(n.x, n.z);
        if (!at) continue;
        if (n.y <= ch.surfaceH[at[1] * CHUNK + at[0]]) continue;  // underground, wall-mounted
        checked++;
        const under = ch.blocks[lidx(at[0], n.y - 1, at[1])];
        if (under === B.air) orphans.push(`node ${n.type} at ${n.x},${n.y},${n.z}`);
      }
      for (const s of ch.spawns) {
        const at = inChunk(s.x, s.z);
        if (!at) continue;
        checked++;
        const under = ch.blocks[lidx(at[0], s.y - 1, at[1])];
        if (under === B.air) orphans.push(`spawn ${s.type} at ${s.x},${s.y},${s.z}`);
      }
    }
  }

  assert.ok(checked > 500, `too few placements sampled to mean anything (${checked})`);
  assert.deepEqual(orphans.slice(0, 8), [], `${orphans.length}/${checked} placements have no ground under them`);
});
