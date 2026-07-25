// Mounts (js/game/mounts.js) and the riding physics on the player.
//
// The thing worth testing is not "does flight move you upward" — it is that the
// CEILINGS and the sky bands agree. Those are two numbers in two files, written
// months apart in principle, and if they drift the whole progression silently
// collapses: either every band is reachable on the first mount, or the top band
// is reachable on nothing and the meteoric iron is unobtainable.
//
// So the ceilings are checked against real island altitudes out of the actual
// generator, not against a copy of the band table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, initSlabSet } from '../../js/world/world.js';
import { WorldGen } from '../../js/world/worldgen.js';
import { Player } from '../../js/player/player.js';
import { B } from '../../js/world/blocks.js';
import { ITEMS } from '../../js/game/items.js';
import { allIslands } from '../../js/world/sky.js';
import { MOUNTS, MOUNT_IDS, FLYERS, Stable, ceilingOf, mountFor, isFlyer, tameHint } from '../../js/game/mounts.js';

// A stub input: the player only ever reads these three things.
const IN = (o = {}) => ({
  jump: !!o.jump, sprint: !!o.sprint,
  worldMove: o.move || null,
  moveVector: () => [0, 0],
});

// ---- the roster ------------------------------------------------------------
test('every mount is coherent, and tames on an item that exists', () => {
  for (const id of MOUNT_IDS) {
    const d = MOUNTS[id];
    assert.ok(d.label, `${id} has a label`);
    assert.ok(d.speed > 0, `${id} moves`);
    assert.ok(ITEMS[d.tame], `${id} tames on ${d.tame}, which must be a real item`);
    assert.ok(d.tameCount >= 1, `${id} costs something to tame`);
    assert.ok(d.desc && d.desc.length > 40, `${id} tells you what it is for`);
    assert.match(tameHint(id), new RegExp(String(d.tameCount)), `${id}'s prompt names the count`);
    if (d.flying) assert.ok(d.climb > 0 && d.ceiling > 100, `${id} is a flyer with a real ceiling`);
    else assert.equal(d.ceiling, 0, `${id} is a ground mount and has no ceiling`);
  }
  // The ceilings must be strictly ordered, or two mounts do the same job.
  const cs = FLYERS.map(ceilingOf);
  for (let i = 1; i < cs.length; i++) assert.ok(cs[i] > cs[i - 1], 'each flyer climbs strictly higher than the last');
});

test('the ceilings gate the real sky bands — one mount per band, no more', () => {
  // The assertion the whole progression rests on. Island tops come from the
  // generator, so a change to either the bands or the ceilings breaks this.
  const gen = new WorldGen(20260725);
  const byRing = new Map();
  for (const s of allIslands(gen, 5)) {
    for (const is of s.isles) {
      const t = is.y + is.crownH;
      if (!byRing.has(s.ring) || t > byRing.get(s.ring)) byRing.set(s.ring, t);
    }
  }
  const lowest = new Map();
  for (const s of allIslands(gen, 5)) {
    for (const is of s.isles) {
      if (!lowest.has(s.ring) || is.y < lowest.get(s.ring)) lowest.set(s.ring, is.y);
    }
  }
  assert.ok(byRing.size >= 3, 'all three bands exist to be gated');

  // Each flyer reaches its OWN band's islands…
  const pairs = [['ridgewing', 1], ['stormjack', 2], ['riftwing', 3]];
  for (const [id, ring] of pairs) {
    assert.ok(ceilingOf(id) >= lowest.get(ring),
      `${id} (ceiling ${ceilingOf(id)}) can reach the lowest ring-${ring} island (y ${lowest.get(ring)})`);
  }
  // …and NOT the band above it. This is the half that actually gates.
  for (const [id, ring] of pairs) {
    if (!lowest.has(ring + 1)) continue;
    assert.ok(ceilingOf(id) < lowest.get(ring + 1),
      `${id} (ceiling ${ceilingOf(id)}) must NOT reach ring ${ring + 1} (lowest y ${lowest.get(ring + 1)})`);
  }
  // And the top band is reachable by exactly one thing.
  const canTop = FLYERS.filter((id) => ceilingOf(id) >= lowest.get(3));
  assert.deepEqual(canTop, ['riftwing'], 'only the Riftwing reaches the meteoric band');
});

test('mountFor names the cheapest mount that reaches a height', () => {
  assert.equal(mountFor(150), 'ridgewing');
  assert.equal(mountFor(200), 'stormjack');
  assert.equal(mountFor(300), 'riftwing');
  assert.equal(mountFor(9999), null, 'nothing reaches the roof, and it says so');
  assert.equal(isFlyer('horse'), false);
});

// ---- the stable ------------------------------------------------------------
test('taming takes the right number of feeds, and is idempotent after', () => {
  const st = new Stable();
  const need = MOUNTS.ridgewing.tameCount;
  for (let i = 1; i < need; i++) {
    const r = st.feed('ridgewing');
    assert.equal(r.tamed, false, `feed ${i} of ${need} does not finish it`);
    assert.equal(r.need, need - i, 'and it says how many more it wants');
    assert.equal(st.has('ridgewing'), false);
  }
  assert.equal(st.feed('ridgewing').tamed, true, 'the last feed tames it');
  assert.equal(st.has('ridgewing'), true);
  // Feeding again is a no-op rather than an error — a mis-click must not eat food.
  assert.deepEqual(st.feed('ridgewing'), { tamed: false, need: 0 });
  assert.deepEqual(st.feed('not_a_mount'), { tamed: false, need: 0 });
});

test('you can only ride what you have tamed', () => {
  const st = new Stable();
  assert.equal(st.mount('riftwing'), false, 'an untamed mount refuses');
  assert.equal(st.riding(), null);
  st.feed('riftwing', 99);
  assert.equal(st.mount('riftwing'), true);
  assert.equal(st.riding(), 'riftwing');
  assert.equal(st.ceiling(), ceilingOf('riftwing'));
  st.dismount();
  assert.equal(st.riding(), null);
  assert.equal(st.ceiling(), 0, 'on foot there is no ceiling, which reads as no flying');
});

test('the stable survives a save round trip, and a corrupt save cannot strand you', () => {
  const st = new Stable();
  st.feed('ridgewing', 99); st.feed('stormjack', 2); st.mount('ridgewing');
  const back = new Stable();
  back.deserialize(JSON.parse(JSON.stringify(st.serialize())));
  assert.equal(back.has('ridgewing'), true);
  assert.equal(back.has('stormjack'), false, 'partial taming progress is not a tamed mount');
  assert.equal(back.riding(), 'ridgewing');
  assert.equal(back.feed('stormjack').need, MOUNTS.stormjack.tameCount - 3, 'progress carried over');

  // Junk, and an old save with no mounts at all.
  const empty = new Stable();
  empty.deserialize(undefined);
  assert.equal(empty.riding(), null);
  const bad = new Stable();
  bad.deserialize({ tamed: ['pegasus', 'riftwing'], active: 'pegasus', progress: 'nonsense' });
  assert.equal(bad.has('riftwing'), true, 'the real one survives');
  assert.equal(bad.has('pegasus'), false, 'the invented one is dropped');
  assert.equal(bad.riding(), null, 'and you are not left riding something that does not exist');
  // Riding a mount you no longer own is cleared rather than kept.
  const lost = new Stable();
  lost.deserialize({ tamed: [], active: 'riftwing' });
  assert.equal(lost.riding(), null);
});

// ---- the physics -----------------------------------------------------------
test('a flying mount climbs, holds altitude, and REFUSES to pass its ceiling', () => {
  initSlabSet();
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const p = new Player();
  p.x = 8.5; p.z = 8.5; p.y = 80;
  p.mountDef = MOUNTS.ridgewing;

  // climb
  for (let i = 0; i < 400; i++) p.update(0.05, IN({ jump: true }), w);
  assert.ok(p.y > 140, `it climbs (y=${p.y.toFixed(1)})`);
  // …and stops dead at the ceiling, however long you hold the button.
  for (let i = 0; i < 600; i++) p.update(0.05, IN({ jump: true }), w);
  assert.ok(p.y <= MOUNTS.ridgewing.ceiling + 0.01,
    `it will not pass its ceiling (y=${p.y.toFixed(2)} vs ${MOUNTS.ridgewing.ceiling})`);
  assert.ok(p.y > MOUNTS.ridgewing.ceiling - 2, 'but it does get there');

  // holding nothing holds altitude — a mount never drops you by accident
  const held = p.y;
  for (let i = 0; i < 100; i++) p.update(0.05, IN(), w);
  assert.equal(p.y, held, 'altitude is held with no input');

  // and descending always works, from anywhere
  for (let i = 0; i < 100; i++) p.update(0.05, IN({ sprint: true }), w);
  assert.ok(p.y < held - 20, `it comes down (y=${p.y.toFixed(1)})`);
});

test('a higher mount passes the lower one\'s ceiling — the gate is the mount, not the world', () => {
  initSlabSet();
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const top = MOUNTS.ridgewing.ceiling;
  const p = new Player();
  p.x = 8.5; p.z = 8.5; p.y = top - 4;
  p.mountDef = MOUNTS.riftwing;
  for (let i = 0; i < 200; i++) p.update(0.05, IN({ jump: true }), w);
  assert.ok(p.y > top + 30, `a Riftwing climbs straight past a Ridgewing's ceiling (y=${p.y.toFixed(1)})`);
});

test('riding COLLIDES — you land on rock instead of flying through it', () => {
  // The difference between this and debug flight, and the reason an island is a
  // place you can arrive at rather than pass through.
  initSlabSet();
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 90;
  for (let x = 4; x <= 12; x++) for (let z = 4; z <= 12; z++) w.setBlock(x, y, z, B.stone, true);
  const p = new Player();
  p.x = 8.5; p.z = 8.5; p.y = y + 12;
  p.mountDef = MOUNTS.stormjack;
  for (let i = 0; i < 200; i++) p.update(0.05, IN({ sprint: true }), w);
  assert.ok(Math.abs(p.y - (y + 1)) < 0.2, `it lands on the slab, not through it (y=${p.y.toFixed(2)})`);
  assert.equal(p.onGround, true, 'and it reports as landed');
});

test('a ground mount is faster than walking and cannot leave the floor', () => {
  initSlabSet();
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const y = 70;
  for (let x = 2; x <= 60; x++) for (let z = 6; z <= 10; z++) w.setBlock(x, y, z, B.stone, true);
  const ride = new Player();
  ride.x = 4.5; ride.z = 8.5; ride.y = y + 1; ride.onGround = true;
  ride.mountDef = MOUNTS.horse;
  const walk = new Player();
  walk.x = 4.5; walk.z = 8.5; walk.y = y + 1; walk.onGround = true;
  const move = [1, 0];
  for (let i = 0; i < 60; i++) { ride.update(0.05, IN({ move }), w); walk.update(0.05, IN({ move }), w); }
  assert.ok(ride.x > walk.x + 4, `a horse outruns a walker (${ride.x.toFixed(1)} vs ${walk.x.toFixed(1)})`);
  // Holding climb does nothing but jump — a horse is not a flyer.
  for (let i = 0; i < 80; i++) ride.update(0.05, IN({ jump: true }), w);
  assert.ok(ride.y < y + 4, `a horse stays on the ground (y=${ride.y.toFixed(1)})`);
});
