// Guards the roster. Every type must have sane stats, a real hand-authored
// model, drops that exist as items, and somewhere in the world that spawns it.
// Complements the reachability audit with per-mob assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../../js/game/enemies.js';
import { MOB_REMAKES } from '../../js/game/mobremakes/index.js';
import { BIOMES } from '../../js/world/worldgen.js';
import { buildStarterStructures } from '../../js/world/structures.js';
import { ITEMS } from '../../js/game/items.js';
import { ABILITIES } from '../../js/game/combat.js';

// The whole roster, written out. This list is the point of the test: the design
// is that the bestiary is small enough to enumerate (see js/game/enemies.js), so
// anything added to ENEMY_TYPES without a deliberate edit here is a regression,
// not a feature. Sixty natives plus a ninety-six-model import pack is exactly
// what this file exists to stop happening again.
const LIVESTOCK = ['cow', 'pig', 'sheep', 'goat', 'horse', 'chicken', 'duck', 'rabbit'];
const GOBLINS = [
  'scrap_goblin', 'bog_goblin', 'cave_goblin', 'ash_goblin',
  'frost_goblin', 'goblin_slinger', 'goblin_warchief', 'goblin_warlord',
];
const ROSTER = [...LIVESTOCK, 'practice_dummy', 'rat', ...GOBLINS];

// Everywhere a creature can legitimately come from: the biome tables, and the
// hand-built starter sites (which is where the two chiefs live — a boss is not
// ambient wildlife and must never be in a biome table).
const spawnedTypes = new Set();
for (const biome of Object.values(BIOMES)) {
  for (const e of biome.enemies || []) spawnedTypes.add(e.type);
}
for (const sp of buildStarterStructures().spawns) spawnedTypes.add(sp.type);

test('the roster is exactly the eighteen creatures the world is built from', () => {
  assert.equal(ROSTER.length, 18);
  const actual = Object.keys(ENEMY_TYPES).sort();
  assert.deepEqual(actual, [...ROSTER].sort());
});

for (const id of ROSTER) {
  test(`${id}: valid stats, model, drops and spawns`, () => {
    const def = ENEMY_TYPES[id];
    assert.ok(def, `no def for ${id}`);

    // stats
    assert.ok(def.label, `${id} needs a label`);
    assert.ok(def.hp > 0, `${id} hp must be > 0`);
    assert.ok(Number.isInteger(def.tier) && def.tier >= 0 && def.tier <= 3, `${id} tier must be 0-3`);
    assert.ok(['passive', 'defensive', 'aggressive'].includes(def.behavior), `${id} bad behavior`);
    assert.ok(def.desc && def.recommend, `${id} needs lore + recommendation`);

    // model: non-empty array of boxes with real geometry
    assert.ok(Array.isArray(def.model) && def.model.length >= 2, `${id} needs a model array`);
    for (const b of def.model) {
      assert.ok(b.w > 0 && b.h > 0 && b.d > 0, `${id} has a degenerate box`);
      assert.ok(Array.isArray(b.color) && b.color.length === 3, `${id} box needs an rgb color`);
    }

    // abilities must resolve (combat.js looks them up by id)
    for (const ab of def.abilities || []) {
      assert.ok(ABILITIES[ab], `${id} references unknown ability ${ab}`);
    }

    // every drop item must exist in the item registry
    assert.ok(Array.isArray(def.drops), `${id} needs a drops array`);
    for (const d of def.drops) {
      assert.ok(ITEMS[d.item], `${id} drops unknown item ${d.item}`);
      assert.ok(Array.isArray(d.qty) && d.qty.length === 2 && d.qty[0] >= 1 && d.qty[1] >= d.qty[0], `${id} bad qty for ${d.item}`);
      assert.ok(d.chance > 0 && d.chance <= 1, `${id} bad drop chance for ${d.item}`);
    }

    // must be placed somewhere — a biome table or a hand-built site
    assert.ok(spawnedTypes.has(id), `${id} is not spawned anywhere in the world`);

    // and must have a painted 64x64 remake, not just the fallback box model
    const rm = MOB_REMAKES[id];
    assert.ok(rm, `${id} has no remade model`);
    assert.equal(rm.texW, 64, `${id} texture should be 64x64`);
    assert.equal(rm.texH, 64, `${id} texture should be 64x64`);
    assert.ok(typeof rm.paint === 'function', `${id} remake needs a paint routine`);
    // Anything that walks needs limbs to walk on. The training dummy is lashed
    // to a post and rigged 'sway', so one rigid body is the correct answer there.
    const minParts = rm.rig === 'sway' ? 1 : 3;
    assert.ok(rm.parts?.length >= minParts, `${id} remake needs a real part hierarchy`);
  });
}

test('the two bosses are bosses, and neither is ambient wildlife', () => {
  for (const id of ['goblin_warchief', 'goblin_warlord']) {
    assert.equal(ENEMY_TYPES[id].boss, true, `${id} should be flagged boss`);
  }
  // A chief in a biome table would mean warlords wandering the tundra in
  // threes. They are placed by hand and by the dungeon generator, nowhere else.
  const ambient = new Set();
  for (const biome of Object.values(BIOMES)) for (const e of biome.enemies || []) ambient.add(e.type);
  assert.ok(!ambient.has('goblin_warchief'), 'a warchief must not spawn as ambient wildlife');
  assert.ok(!ambient.has('goblin_warlord'), 'a warlord must not spawn as ambient wildlife');
});

test('every goblin is the same body plan — that is the whole design', () => {
  // The roster is readable because the SILHOUETTE never changes: you learn one
  // shape and the colour tells you the rest. If a livery ever grows a wing or
  // loses an arm, that contract is broken and this fails.
  const plan = (id) => MOB_REMAKES[id].parts.map((p) => p.id).sort().join(',');
  const reference = plan('scrap_goblin');
  assert.equal(reference, 'armL,armR,body,head,legL,legR');
  for (const id of GOBLINS) {
    assert.equal(plan(id), reference, `${id} does not share the goblin body plan`);
  }
  // …and the chiefs really are bigger, not merely recoloured: the top of the
  // head box has to clear a grunt's by a readable margin across a room.
  const crown = (id) => Math.max(...MOB_REMAKES[id].parts
    .flatMap((p) => p.boxes).map((b) => b.from[1] + b.size[1]));
  assert.ok(crown('goblin_warchief') > crown('scrap_goblin') * 1.2, 'a warchief should tower over a scrapper');
  assert.ok(crown('goblin_warlord') > crown('goblin_warchief'), 'a warlord should out-top a warchief');
});

test('no creature in the game is named after a Minecraft mob', () => {
  // The de-Minecraft pass (task #74). This is the assertion that keeps it done:
  // the roster and the shipped-active defaults are checked against the list of
  // creatures Minecraft invented or is identified with, so a future import or a
  // copied stat block cannot quietly reintroduce one.
  //
  // The list is Minecraft's distinctive creature COINAGES, not every word it has
  // ever used. That distinction is the whole test: 'creeper' and 'enderman' are
  // Minecraft's inventions and anything wearing them reads as borrowed, while
  // 'warden' is an ordinary English role noun this world already leans on —
  // `warden_key` unlocks its dungeons and `riftwarden_seal` drops from its
  // vaults. Banning that would mean renaming half the loot table to avoid a
  // resemblance nobody would draw. Same reasoning excludes 'breeze' and 'allay'.
  //
  // Real animals are not on the list either. A cow is a cow. And goblins are
  // older than all of us.
  const MC = [
    'zombie', 'skeleton', 'creeper', 'enderman', 'endermite', 'ghast', 'shulker',
    'slime', 'magma_cube', 'blaze', 'wither', 'piglin', 'zoglin', 'hoglin',
    'drowned', 'husk', 'stray', 'phantom', 'vex', 'silverfish', 'strider',
    'pillager', 'ravager', 'vindicator', 'evoker', 'villager', 'spider',
  ];
  // A hit is the whole id, or the id with the MC name as a leading/trailing word,
  // so `zombie_bomber` and `cave_spider` are caught but `stone_pecker` is not.
  const hits = (ids) => ids.filter((id) =>
    MC.some((m) => id === m || id.startsWith(`${m}_`) || id.endsWith(`_${m}`)));

  assert.deepEqual(hits(Object.keys(ENEMY_TYPES)), [], 'ENEMY_TYPES still carries Minecraft creatures');
  assert.deepEqual(hits(Object.keys(MOB_REMAKES)), [], 'the model batches still carry Minecraft creatures');
  // …and this cannot pass by the roster simply being empty.
  assert.ok(Object.keys(ENEMY_TYPES).length === 18);
});
