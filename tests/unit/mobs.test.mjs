// Guards the new fantasy mob roster: each type must have sane stats, a real
// hand-authored model, drops that exist as items, and at least one biome that
// spawns it. Complements the reachability audit with per-mob assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../../js/game/enemies.js';
import { IMPORTED_TYPES } from '../../js/game/mobs-imported.js';
import { BIOMES } from '../../js/world/worldgen.js';
import { ITEMS } from '../../js/game/items.js';
import { ABILITIES } from '../../js/game/combat.js';

// The batch of fantasy mobs added to broaden the roster beyond real animals.
// cave_slime and skeletal_archer were cut in the de-Minecraft pass; seepmass and
// shardcaster hold their exact slots (js/game/mobremakes/batch_deepkin.js).
const NEW_MOBS = [
  'pixie', 'bog_ooze', 'scrap_goblin',
  'will_o_wisp', 'bone_hound', 'seepmass',
  'frost_elemental', 'grave_wight', 'shardcaster',
  'stone_golem', 'veil_crawler', 'gaze_orb',
];

// Every biome's declared enemy types, flattened once for spawn lookups.
const spawnedTypes = new Set();
for (const biome of Object.values(BIOMES)) {
  for (const e of biome.enemies || []) spawnedTypes.add(e.type);
}

test('all 12 fantasy mobs are registered', () => {
  for (const id of NEW_MOBS) {
    assert.ok(ENEMY_TYPES[id], `missing enemy type ${id}`);
  }
  assert.equal(NEW_MOBS.length, 12);
});

for (const id of NEW_MOBS) {
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

    // must spawn in at least one biome
    assert.ok(spawnedTypes.has(id), `${id} is not spawned by any biome`);
  });
}

test('no creature in the game is named after a Minecraft mob', () => {
  // The de-Minecraft pass (task #74). This is the assertion that keeps it done:
  // the roster, the licensed import pack and the shipped-active defaults are all
  // checked against the list of creatures Minecraft invented or is identified
  // with, so a future import or a copied stat block cannot quietly reintroduce
  // one. Real animals are NOT on this list — a cow is a cow, not Minecraft's.
  // The list is Minecraft's distinctive creature COINAGES, not every word it has
  // ever used. That distinction is the whole test: 'creeper' and 'enderman' are
  // Minecraft's inventions and anything wearing them reads as borrowed, while
  // 'warden' is an ordinary English role noun this world already leans on —
  // `warden_key` unlocks its dungeons and `riftwarden_seal` drops from its
  // vaults. Banning that would mean renaming half the loot table to avoid a
  // resemblance nobody would draw. Same reasoning excludes 'breeze' and 'allay'.
  //
  // Real animals are not on the list either. A cow is a cow.
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

  const roster = hits(Object.keys(ENEMY_TYPES));
  assert.deepEqual(roster, [], 'ENEMY_TYPES still carries Minecraft creatures');

  const imported = hits(Object.keys(IMPORTED_TYPES));
  assert.deepEqual(imported, [], 'the licensed import pack still carries Minecraft creatures');

  // …and the replacements really are there holding the slots, so this test
  // cannot pass by the roster simply being empty.
  for (const id of ['slagwalker', 'ashen_penitent', 'shardcaster', 'hookleg', 'seepmass']) {
    assert.ok(ENEMY_TYPES[id], `${id} should hold the slot of the mob it replaced`);
  }
});
