// Underground cities (js/world/undercity.js).
//
// The failure this project has hit more than any other is a building you cannot
// get into, so the load-bearing test here is the same one the towns get: build
// the real world, stand at the ENTRANCE, and flood-fill inward using the game's
// own movement rules. A city forty chunks across, three hundred blocks down,
// that you can only reach by tunnelling to a coordinate is not a feature.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, initSlabSet } from '../../js/world/world.js';
import { WorldGen, CHUNK, ringAt } from '../../js/world/worldgen.js';
import { stampChunkStructures } from '../../js/world/structures.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
import { nearHandBuilt } from '../../js/world/sites.js';
import { NPC_DEFS, DIALOGUES } from '../../js/game/npcs.js';
import { allUndercities, undercityAt, UC_REGION, UC_HALF } from '../../js/world/undercity.js';

const SEEDS = [20260725, 7, 4242];

const CACHE = new Map();
function loadCity(seed) {
  if (CACHE.has(seed)) return CACHE.get(seed);
  initSlabSet();
  const world = new World(seed);
  const cities = allUndercities(world.gen, 3);
  assert.ok(cities.length, `seed ${seed}: a city within three regions`);
  const c = cities[0];
  for (let cx = (c.minX >> 4) - 1; cx <= (c.maxX >> 4) + 1; cx++) {
    for (let cz = (c.minZ >> 4) - 1; cz <= (c.maxZ >> 4) + 1; cz++) world.ensureChunk(cx, cz);
  }
  const out = { world, c, cities };
  CACHE.set(seed, out);
  return out;
}

// The player's own movement rules, as a flood fill — the same shape the town
// tests use, so "walkable" means the same thing in both places.
function survey({ world, c }, from) {
  const X0 = c.minX - 6, X1 = c.maxX + 6, Z0 = c.minZ - 6, Z1 = c.maxZ + 6;
  const Y0 = c.floor - 3, Y1 = c.gate.yTop + 6;
  // Matches the player: a door is passable (you swing it), and anything shorter
  // than WALKOVER (js/player/player.js) is stepped over rather than bumped into.
  // Rails are carpet-height, so a fill that treated them as walls declared every
  // avenue in the hold impassable — the streets are LAID with rail.
  const WALKOVER = 0.2;
  const open = (x, y, z) => {
    const id = world.getBlock(x, y, z);
    if (BLOCKS[id]?.shape === 'door') return true;
    return world.collisionHeight(x, y, z) <= WALKOVER;
  };
  const stand = (x, y, z) => !open(x, y - 1, z) && open(x, y, z) && open(x, y + 1, z);
  const SX = X1 - X0 + 1, SY = Y1 - Y0 + 1, SZ = Z1 - Z0 + 1;
  const idx = (x, y, z) => ((x - X0) * SY + (y - Y0)) * SZ + (z - Z0);
  const inBox = (x, y, z) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1 && z >= Z0 && z <= Z1;
  const seen = new Uint8Array(SX * SY * SZ);
  const q = [];
  const push = (x, y, z) => { if (!inBox(x, y, z) || seen[idx(x, y, z)]) return; seen[idx(x, y, z)] = 1; q.push(x, y, z); };
  let starts = 0;
  for (let y = Y1 - 1; y > Y0; y--) if (stand(from.x, y, from.z)) { push(from.x, y, from.z); starts++; break; }
  for (let h = 0; h < q.length; h += 3) {
    const x = q[h], y = q[h + 1], z = q[h + 2];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      for (let ny = y + 1; ny >= y - 4; ny--) {
        if (!inBox(nx, ny, nz)) continue;
        if (ny > y && !open(x, y + 2, z)) continue;
        if (stand(nx, ny, nz)) { push(nx, ny, nz); break; }
      }
    }
  }
  return { starts, reached: (x, y, z) => inBox(x, y, z) && seen[idx(x, y, z)] === 1, count: q.length / 3 };
}

// ---- siting ----------------------------------------------------------------
test('cities are rare, deep, and clear of the hand-built world', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const cs = allUndercities(gen, 3);
    assert.ok(cs.length >= 3, `seed ${seed}: cities exist (${cs.length})`);
    for (const c of cs) {
      assert.ok(!nearHandBuilt(c.x, c.z), 'a city never lands on Brookhollow');
      assert.equal(c.ring, ringAt(c.x, c.z), 'themed by its own ring');
      // Deep: the roof has real rock over it, and the floor clears bedrock.
      assert.ok(c.floor >= 12, `floor y=${c.floor} clears bedrock`);
      assert.ok(c.roofY < gen.heightAt(c.x, c.z) - 10,
        `the roof (y=${c.roofY}) sits well under the surface (y=${gen.heightAt(c.x, c.z)})`);
      // And it is a CITY, not a room.
      assert.ok(c.rxr >= 28 && c.rzr >= 28, `it is big (${c.rxr}x${c.rzr})`);
      assert.ok(c.plots.length >= 3, `it has buildings (${c.plots.length})`);
    }
  }
});

test('a city never reaches further from its anchor than UC_HALF claims', () => {
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    for (const c of allUndercities(gen, 3)) {
      const reach = Math.max(Math.abs(c.minX - c.x), Math.abs(c.maxX - c.x),
        Math.abs(c.minZ - c.z), Math.abs(c.maxZ - c.z));
      assert.ok(reach <= UC_HALF, `seed ${seed}: city at ${c.x},${c.z} reaches ${reach} > UC_HALF ${UC_HALF}`);
    }
  }
});

// ---- the cavern -------------------------------------------------------------
test('the cavern is hollow, floored, and roofed', () => {
  const { world, c } = loadCity(20260725);
  // open air over the plaza, a solid floor under it
  let air = 0;
  for (let y = c.floor + 1; y <= c.floor + 14; y++) if (world.getBlock(c.x + 8, y, c.z) === B.air) air++;
  assert.ok(air >= 10, `open hall over the avenue (${air}/14 clear)`);
  for (let dx = -10; dx <= 10; dx += 2) {
    assert.notEqual(world.getBlock(c.x + dx, c.floor, c.z), B.air, `paved at ${dx} off centre`);
  }
  // and a roof: solid rock a good way above the hall
  assert.notEqual(world.getBlock(c.x, c.roofY + 3, c.z), B.air, 'there is rock overhead');
});

test('the city is lit — you can see it without carrying a torch', () => {
  const { world, c } = loadCity(20260725);
  const LIT = new Set([B.sea_lantern, B.glowstone, B.torch_post, B.campfire]);
  let lamps = 0;
  for (let x = c.x - c.rxr; x <= c.x + c.rxr; x += 2) {
    for (let z = c.z - c.rzr; z <= c.z + c.rzr; z += 2) {
      for (let y = c.floor + 1; y <= c.floor + 8; y++) if (LIT.has(world.getBlock(x, y, z))) lamps++;
    }
  }
  assert.ok(lamps >= 8, `the streets and houses are lit (${lamps} light sources sampled)`);
});

// ---- the thing that actually matters ---------------------------------------
test('you can walk in from the surface and reach the plaza, the terrace and the houses', () => {
  for (const seed of SEEDS) {
    const loaded = loadCity(seed);
    const { world, c } = loaded;
    // Start on the SURFACE beside the entrance head — the way a player arrives.
    const s = survey(loaded, { x: c.gate.x, z: c.gate.z });
    assert.ok(s.starts, `seed ${seed}: there is standable ground at the entrance`);
    assert.ok(s.count > 400, `seed ${seed}: the walk covers the city (${s.count} cells)`);

    // the plaza, at the crossing of the two avenues
    assert.ok(s.reached(c.x + 4, c.floor + 1, c.z) || s.reached(c.x, c.floor + 1, c.z + 4),
      `seed ${seed}: the plaza is reachable from the entrance`);

    // the terrace ledge, which is only reachable if the stair flights work
    let onTerrace = 0;
    for (let a = 0; a < 16; a++) {
      const th = (a / 16) * Math.PI * 2;
      const r = (c.terrace.inner + c.terrace.outer) / 2;
      const x = c.x + Math.round(Math.cos(th) * c.rxr * r);
      const z = c.z + Math.round(Math.sin(th) * c.rzr * r);
      if (s.reached(x, c.terrace.y + 1, z)) onTerrace++;
    }
    assert.ok(onTerrace >= 3, `seed ${seed}: the terrace is walkable off the plaza (${onTerrace}/16 samples)`);
  }
});

test('every house has a doorway you can walk through', () => {
  const loaded = loadCity(20260725);
  const { world, c } = loaded;
  const s = survey(loaded, { x: c.gate.x, z: c.gate.z });
  const sealed = [];
  for (const p of c.plots) {
    // the interior floor cells
    let free = 0, got = 0;
    for (let x = p.x0 + 1; x < p.x1; x++) {
      for (let z = p.z0 + 1; z < p.z1; z++) {
        if (world.collisionHeight(x, c.floor + 1, z) > 0) continue;   // hearth or fitting
        free++;
        if (s.reached(x, c.floor + 1, z)) got++;
      }
    }
    if (free < 3) continue;                                            // a shed, not a house
    if (got === 0) sealed.push(`house at ${p.x0},${p.z0} is SEALED`);
  }
  assert.deepEqual(sealed, [], 'a house you cannot get into is the bug this test exists for');
});

// ---- chunk-locality --------------------------------------------------------
test('a city chunk is identical forwards, backwards and generated alone', () => {
  const digest = (gen, cx, cz) => {
    const out = [];
    stampChunkStructures(gen, cx, cz, {
      block: (x, y, z, id) => out.push(`b:${x},${y},${z},${id}`),
      node: (n) => out.push(`n:${n.type}@${n.x},${n.y},${n.z}`),
      spawn: (sp) => out.push(`s:${sp.id}`),
      chest: (ch) => out.push(`c:${ch.id}`),
    });
    return out.join('|');
  };
  const c = allUndercities(new WorldGen(20260725), 3)[0];
  const chunks = [];
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) chunks.push([(c.x >> 4) + a, (c.z >> 4) + b]);

  const fwd = new Map();
  { const g = new WorldGen(20260725); for (const [x, z] of chunks) fwd.set(`${x},${z}`, digest(g, x, z)); }
  { const g = new WorldGen(20260725); for (const [x, z] of [...chunks].reverse()) {
    assert.equal(digest(g, x, z), fwd.get(`${x},${z}`), `chunk ${x},${z} differs in reverse order`);
  } }
  let writes = 0;
  for (const [k, v] of fwd) {
    writes += v ? v.split('|').length : 0;
    const [x, z] = k.split(',').map(Number);
    assert.equal(digest(new WorldGen(20260725), x, z), v, `chunk ${k} differs when generated alone`);
  }
  assert.ok(writes > 8000, `the sample really covers a city (${writes} writes)`);
});

test('the cavern never breaks through to daylight', () => {
  // The bug this exists for: the roof clearance was checked at the ANCHOR only,
  // and a cavern ninety blocks across sited on a slope punched out through a
  // valley at its rim. The anchor had twenty blocks of cover; the far edge had
  // two. The city opened onto the sky with a mineshaft hanging in the hole, and
  // every other test still passed — hollow, floored, lit, walkable, all true.
  //
  // Checked against the terrain over the whole footprint, on every seed.
  for (const seed of SEEDS) {
    const gen = new WorldGen(seed);
    const thin = [];
    for (const c of allUndercities(gen, 3)) {
      for (let a = 0; a < 16; a++) {
        const th = (a / 16) * Math.PI * 2;
        for (const f of [0.4, 0.7, 0.95, 1.05]) {
          const x = c.x + Math.round(Math.cos(th) * c.rxr * f);
          const z = c.z + Math.round(Math.sin(th) * c.rzr * f);
          const cover = gen.heightAt(x, z) - c.roofY;
          if (cover < 6) thin.push(`city ${c.x},${c.z}: only ${cover} blocks of rock over the roof at ${x},${z}`);
        }
      }
    }
    assert.deepEqual(thin.slice(0, 4), [], `seed ${seed}: the roof must stay buried`);
  }
});

test('and it is really underground — the roof cap is solid over every column', () => {
  const { world, c } = loadCity(20260725);
  // The cap itself: solid rock written directly above the dome, on every column
  // of the city. Trusting the natural terrain here is what failed — the cave
  // systems run through it.
  let capHoles = 0, capChecked = 0;
  for (let a = 0; a < 24; a++) {
    const th = (a / 24) * Math.PI * 2;
    for (const f of [0, 0.3, 0.6, 0.9]) {
      const x = c.x + Math.round(Math.cos(th) * c.rxr * f);
      const z = c.z + Math.round(Math.sin(th) * c.rzr * f);
      if (Math.abs(x - c.gate.x) <= 5 && Math.abs(z - c.gate.z) <= 5) continue;
      const t = 1 - Math.sqrt(((x - c.x) / c.rxr) ** 2 + ((z - c.z) / c.rzr) ** 2);
      if (t <= 0) continue;
      const top = c.floor + 4 + Math.round((26 - 4) * Math.pow(t, 0.55));
      for (let y = top + 1; y <= top + 8; y++) { capChecked++; if (world.getBlock(x, y, z) === B.air) capHoles++; }
    }
  }
  assert.ok(capChecked > 200, `a real sample of the cap (${capChecked} cells)`);
  assert.equal(capHoles, 0, `the roof cap has no holes in it (${capHoles} of ${capChecked})`);
  // Not "no air at all above the roof" — natural caves run through that rock and
  // scattered air cells are correct. What must not exist is an UNBROKEN column of
  // air from the cavern roof to the surface, which is what daylight comes down.
  const openToSky = (x, z) => {
    const top = world.gen.heightAt(x, z);
    for (let y = c.roofY + 1; y <= top; y++) if (world.getBlock(x, y, z) !== B.air) return false;
    return true;
  };
  const breaches = [];
  for (let a = 0; a < 16; a++) {
    const th = (a / 16) * Math.PI * 2;
    for (const f of [0, 0.4, 0.75, 0.95]) {
      const x = c.x + Math.round(Math.cos(th) * c.rxr * f);
      const z = c.z + Math.round(Math.sin(th) * c.rzr * f);
      // The entrance shaft is open to the surface ON PURPOSE — that is the way
      // in. Everything else must be buried.
      if (Math.abs(x - c.gate.x) <= 5 && Math.abs(z - c.gate.z) <= 5) continue;
      if (openToSky(x, z)) breaches.push(`${x},${z}`);
    }
  }
  assert.deepEqual(breaches, [], 'no column of the city is open straight up to daylight');
});

// ---- it is a dwarven hold, not a village in a hole -------------------------
test('a hold is a working mine: rails down the streets and out into the seams', () => {
  const { world, c } = loadCity(20260725);
  // rail laid the length of both avenues
  let laid = 0, sampled = 0;
  for (let d = -c.rxr + 10; d <= c.rxr - 10; d += 2) { sampled++; if (world.getBlock(c.x + d, c.floor + 1, c.z) === B.rail) laid++; }
  for (let d = -c.rzr + 10; d <= c.rzr - 10; d += 2) { sampled++; if (world.getBlock(c.x, c.floor + 1, c.z + d) === B.rail) laid++; }
  assert.ok(laid > sampled * 0.5, `the avenues are laid with rail (${laid}/${sampled})`);

  // four adits, bored, timbered, railed, and driven into real ore
  assert.equal(c.adits.length, 4, 'four working drifts');
  let bored = 0, railed = 0, timbered = 0;
  for (const ad of c.adits) {
    // Sample ON the timber sets: they go in every fourth pace, so a sampler
    // starting at 6 and stepping 4 lands on 6/10/14 and never sees one.
    for (let t = 8; t <= ad.len; t += 4) {
      const x = Math.round(ad.x0 + ad.ux * t), z = Math.round(ad.z0 + ad.uz * t);
      if (world.getBlock(x, ad.y + 2, z) === B.air) bored++;
      if (world.getBlock(x, ad.y + 1, z) === B.rail) railed++;
      if (world.getBlock(x, ad.y + 3, z) === B.oak_log || world.getBlock(x, ad.y + 3, z) === c.style.lamp) timbered++;
    }
  }
  assert.ok(bored > 12, `the drifts are actually bored out (${bored} clear samples)`);
  assert.ok(railed > 8, `and railed (${railed})`);
  assert.ok(timbered > 4, `and shored with timber (${timbered})`);
});

test('a hold has a forge row over a lava basin', () => {
  const { world, c } = loadCity(20260725);
  const f = c.forge;
  let lava = 0;
  for (let x = f.x - 2; x <= f.x + 2; x++) for (let z = f.z - 2; z <= f.z + 2; z++) {
    if (world.getBlock(x, c.floor - 1, z) === B.lava) lava++;
  }
  assert.ok(lava >= 15, `there is a lava basin under the forges (${lava}/25)`);
  let kit = 0;
  for (let i = -3; i <= 3; i++) {
    const id = world.getBlock(f.x + i, c.floor + 1, f.z + f.d);
    if (id === B.anvil_block || id === B.furnace) kit++;
  }
  assert.ok(kit >= 5, `anvils and furnaces stand on the row (${kit}/7)`);
});

test('four dwarves live in every hold, on ground they can stand on', () => {
  const { world, c } = loadCity(20260725);
  assert.equal(c.folk.length, 4, 'a warden, a pitmaster, a smith and a cellarer');
  const roles = new Set(c.folk.map((p) => p.id));
  assert.equal(roles.size, 4, 'four distinct roles');
  for (const p of c.folk) {
    assert.ok(NPC_DEFS[p.id], `${p.id} is a real NPC`);
    assert.ok(DIALOGUES[NPC_DEFS[p.id].dialogue], `${p.id} has something to say`);
    // standing on something, with headroom
    assert.notEqual(world.getBlock(p.x, p.y - 1, p.z), B.air, `${p.id} stands on solid ground`);
    assert.ok(world.collisionHeight(p.x, p.y + 1, p.z) === 0, `${p.id} has headroom`);
  }
});
