// Guards the new fantasy mob roster: each type must have sane stats, a real
// hand-authored model, drops that exist as items, and at least one biome that
// spawns it. Complements the reachability audit with per-mob assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../../js/game/enemies.js';
import { BIOMES } from '../../js/world/worldgen.js';
import { ITEMS } from '../../js/game/items.js';
import { ABILITIES } from '../../js/game/combat.js';

// The batch of fantasy mobs added to broaden the roster beyond real animals.
const NEW_MOBS = [
  'pixie', 'bog_ooze', 'scrap_goblin',
  'will_o_wisp', 'bone_hound', 'cave_slime',
  'frost_elemental', 'grave_wight', 'skeletal_archer',
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
