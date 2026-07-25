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
import {
  MOUNTS, MOUNT_IDS, PETS, PET_IDS, TAMEABLE, FLYERS, Stable,
  ceilingOf, mountFor, isFlyer, tameHint, levelFor, feedNeeded, tameXp,
} from '../../js/game/mounts.js';

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
  const pairs = [['crag_drake', 1], ['storm_wyrm', 2], ['riftdrake', 3]];
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
  assert.deepEqual(canTop, ['riftdrake'], 'only the Riftdrake reaches the meteoric band');
});

test('mountFor names the cheapest mount that reaches a height', () => {
  assert.equal(mountFor(150), 'crag_drake');
  assert.equal(mountFor(200), 'storm_wyrm');
  assert.equal(mountFor(300), 'riftdrake');
  assert.equal(mountFor(9999), null, 'nothing reaches the roof, and it says so');
  assert.equal(isFlyer('horse'), false);
});

// ---- the stable ------------------------------------------------------------
test('taming takes the right number of feeds, and is idempotent after', () => {
  const st = new Stable();
  const need = MOUNTS.crag_drake.tameCount;
  for (let i = 1; i < need; i++) {
    const r = st.feed('crag_drake');
    assert.equal(r.tamed, false, `feed ${i} of ${need} does not finish it`);
    assert.equal(r.need, need - i, 'and it says how many more it wants');
    assert.equal(st.has('crag_drake'), false);
  }
  assert.equal(st.feed('crag_drake').tamed, true, 'the last feed tames it');
  assert.equal(st.has('crag_drake'), true);
  // Feeding again is a no-op rather than an error — a mis-click must not eat food.
  assert.deepEqual(st.feed('crag_drake'), { tamed: false, need: 0 });
  assert.deepEqual(st.feed('not_a_mount'), { tamed: false, need: 0 });
});

test('you can only ride what you have tamed', () => {
  const st = new Stable();
  assert.equal(st.mount('riftdrake'), false, 'an untamed mount refuses');
  assert.equal(st.riding(), null);
  st.feed('riftdrake', 99);
  assert.equal(st.mount('riftdrake'), true);
  assert.equal(st.riding(), 'riftdrake');
  assert.equal(st.ceiling(), ceilingOf('riftdrake'));
  st.dismount();
  assert.equal(st.riding(), null);
  assert.equal(st.ceiling(), 0, 'on foot there is no ceiling, which reads as no flying');
});

test('the stable survives a save round trip, and a corrupt save cannot strand you', () => {
  const st = new Stable();
  st.feed('crag_drake', 99); st.feed('storm_wyrm', 2); st.mount('crag_drake');
  const back = new Stable();
  back.deserialize(JSON.parse(JSON.stringify(st.serialize())));
  assert.equal(back.has('crag_drake'), true);
  assert.equal(back.has('storm_wyrm'), false, 'partial taming progress is not a tamed mount');
  assert.equal(back.riding(), 'crag_drake');
  assert.equal(back.feed('storm_wyrm').need, MOUNTS.storm_wyrm.tameCount - 3, 'progress carried over');

  // Junk, and an old save with no mounts at all.
  const empty = new Stable();
  empty.deserialize(undefined);
  assert.equal(empty.riding(), null);
  const bad = new Stable();
  bad.deserialize({ tamed: ['pegasus', 'riftdrake'], active: 'pegasus', progress: 'nonsense' });
  assert.equal(bad.has('riftdrake'), true, 'the real one survives');
  assert.equal(bad.has('pegasus'), false, 'the invented one is dropped');
  assert.equal(bad.riding(), null, 'and you are not left riding something that does not exist');
  // Riding a mount you no longer own is cleared rather than kept.
  const lost = new Stable();
  lost.deserialize({ tamed: [], active: 'riftdrake' });
  assert.equal(lost.riding(), null);
});

// ---- the physics -----------------------------------------------------------
test('a flying mount climbs, holds altitude, and REFUSES to pass its ceiling', () => {
  initSlabSet();
  const w = new World(4242);
  w.ensureChunk(0, 0);
  const p = new Player();
  p.x = 8.5; p.z = 8.5; p.y = 80;
  p.mountDef = MOUNTS.crag_drake;

  // climb
  for (let i = 0; i < 400; i++) p.update(0.05, IN({ jump: true }), w);
  assert.ok(p.y > 140, `it climbs (y=${p.y.toFixed(1)})`);
  // …and stops dead at the ceiling, however long you hold the button.
  for (let i = 0; i < 600; i++) p.update(0.05, IN({ jump: true }), w);
  assert.ok(p.y <= MOUNTS.crag_drake.ceiling + 0.01,
    `it will not pass its ceiling (y=${p.y.toFixed(2)} vs ${MOUNTS.crag_drake.ceiling})`);
  assert.ok(p.y > MOUNTS.crag_drake.ceiling - 2, 'but it does get there');

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
  const top = MOUNTS.crag_drake.ceiling;
  const p = new Player();
  p.x = 8.5; p.z = 8.5; p.y = top - 4;
  p.mountDef = MOUNTS.riftdrake;
  for (let i = 0; i < 200; i++) p.update(0.05, IN({ jump: true }), w);
  assert.ok(p.y > top + 30, `a Riftdrake climbs straight past a Crag Drake's ceiling (y=${p.y.toFixed(1)})`);
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
  p.mountDef = MOUNTS.storm_wyrm;
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

// ---- the Handling skill -----------------------------------------------------
// The second gate. The ceiling decides WHERE a mount can go; the skill decides
// WHEN you get it. Without the second one a player who happened to walk far
// enough could tame a Riftdrake in the first hour and delete the whole vertical
// axis of the game in a single interaction.
test('every tameable thing is gated on Handling, and the gates are ordered', () => {
  for (const id of Object.keys(TAMEABLE)) {
    const d = TAMEABLE[id];
    assert.ok(Number.isInteger(d.level) && d.level >= 1 && d.level <= 99, `${id} needs a real Handling level`);
    assert.ok(ITEMS[d.tame], `${id} tames on ${d.tame}, which must be a real item`);
  }
  // Each dragon costs more skill than the one below it, in the same order as the
  // ceilings — otherwise the level gate and the altitude gate disagree and one
  // of them is decorative.
  const byCeiling = [...FLYERS].sort((a, b) => ceilingOf(a) - ceilingOf(b));
  for (let i = 1; i < byCeiling.length; i++) {
    assert.ok(levelFor(byCeiling[i]) > levelFor(byCeiling[i - 1]),
      `${byCeiling[i]} must cost more Handling than ${byCeiling[i - 1]}`);
  }
  // And the first mount is available immediately: a skill you cannot start is
  // not a skill.
  assert.equal(levelFor('horse'), 1);
  assert.ok(PET_IDS.some((id) => levelFor(id) === 1), 'at least one pet is reachable at level 1');
});

test('the level-90 capstone actually halves the feed, and never to zero', () => {
  for (const id of Object.keys(TAMEABLE)) {
    const full = feedNeeded(id, 1);
    const half = feedNeeded(id, 90);
    assert.equal(full, TAMEABLE[id].tameCount, `${id} costs its full price below 90`);
    assert.ok(half <= full && half >= 1, `${id} halves to ${half}, and never to nothing`);
  }
  assert.ok(feedNeeded('riftdrake', 90) < feedNeeded('riftdrake', 89), 'the capstone lands at 90, not before');
});

test('tame XP rises with the gate, and flying pays a premium', () => {
  assert.ok(tameXp('riftdrake') > tameXp('storm_wyrm'));
  assert.ok(tameXp('storm_wyrm') > tameXp('crag_drake'));
  assert.ok(tameXp('crag_drake') > tameXp('destrier'),
    'a dragon is worth more than a horse of a similar level — getting airborne is the hard part');
  assert.equal(tameXp('not_a_thing'), 0);
});

// ---- pets -------------------------------------------------------------------
test('pets tame into their own list, and only one is ever out', () => {
  const st = new Stable();
  st.feed('rat', 99);
  st.feed('rabbit', 99);
  assert.equal(st.has('rat'), true);
  // A pet is not a mount, however it was tamed.
  assert.equal(st.mount('rat'), false, 'you do not ride a Pocket Rat');
  assert.equal(st.riding(), null);

  assert.equal(st.callPet('rat'), true);
  assert.equal(st.petOut(), 'rat');
  st.callPet('rabbit');
  assert.equal(st.petOut(), 'rabbit', 'calling another puts the first away');
  // The same call toggles, so there is no separate dismiss to go looking for.
  st.callPet('rabbit');
  assert.equal(st.petOut(), null);
  assert.equal(st.callPet('goat'), false, 'an untamed pet does not come');
});

test('a pet perk only applies while that pet is out', () => {
  const st = new Stable();
  assert.equal(st.perk('forage'), 0, 'an empty stable modifies nothing');
  st.feed('rabbit', 99);
  assert.equal(st.perk('forage'), 0, 'tamed but at home is still nothing');
  st.callPet('rabbit');
  assert.equal(st.perk('forage'), PETS.rabbit.perk.value);
  assert.equal(st.perk('warmth'), 0, 'and it only grants its own perk');
});

test('pets survive the save round trip, and a corrupt one cannot be walked', () => {
  const st = new Stable();
  st.feed('rat', 99); st.feed('rabbit', 99); st.callPet('rat');
  st.feed('crag_drake', 99); st.mount('crag_drake');
  const back = new Stable();
  back.deserialize(JSON.parse(JSON.stringify(st.serialize())));
  assert.equal(back.petOut(), 'rat');
  assert.equal(back.has('rabbit'), true);
  assert.equal(back.riding(), 'crag_drake', 'mounts and pets do not tread on each other');

  const bad = new Stable();
  bad.deserialize({ pets: ['griffin', 'rat'], pet: 'griffin' });
  assert.equal(bad.has('rat'), true);
  assert.equal(bad.petOut(), null, 'you are not left walking something that does not exist');
  // An old save from before pets existed loads without one.
  const old = new Stable();
  old.deserialize({ tamed: ['horse'], active: 'horse' });
  assert.equal(old.petOut(), null);
  assert.equal(old.riding(), 'horse');
});
