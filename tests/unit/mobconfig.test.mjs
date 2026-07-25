// Admin/Debug mob-override store: fallbacks, imported-default-off, and a
// localStorage persistence round-trip. Mirrors the contract world.js spawning
// and the combat drop rolls rely on.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage so mobconfig's persistence path runs in Node
// (must be installed BEFORE the module is imported — it reads it at load time).
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const mc = await import('../../js/game/mobconfig.js');
const { ENEMY_TYPES } = await import('../../js/game/enemies.js');

test('allMobTypes lists every registered mob, sorted', () => {
  const list = mc.allMobTypes();
  assert.equal(list.length, Object.keys(ENEMY_TYPES).length);
  assert.deepEqual(list, [...list].sort());
  for (const t of Object.keys(ENEMY_TYPES)) assert.ok(list.includes(t));
});

test('the shipped roster is active; everything else defaults OFF', () => {
  // The starter set is deliberately small — the farm animals plus the wolf
  // (docs/MOB_BRIEF.md). The rest stay in the library but out of new worlds.
  const ROSTER = ['cow', 'pig', 'sheep', 'chicken', 'duck', 'goat', 'horse', 'rabbit', 'wolf',
    'rat', 'bob', 'goblin'];
  for (const t of ROSTER) {
    assert.ok(ENEMY_TYPES[t], `${t} should exist in the registry`);
    assert.equal(mc.mobActive(t), true, `${t} should ship active`);
  }
  const offRoster = mc.allMobTypes().filter((t) => !ROSTER.includes(t));
  for (const t of offRoster) assert.equal(mc.mobActive(t), false, `${t} should ship inactive`);

  // synthetic imported entry exercises the imported fallback branch
  ENEMY_TYPES.__imp_test = { label: 'Test', imported: true, drops: [] };
  assert.equal(mc.mobActive('__imp_test'), false);
  mc.setMobConfig('__imp_test', { active: true }); // explicit override wins
  assert.equal(mc.mobActive('__imp_test'), true);
  mc.resetMobConfig('__imp_test');
  assert.equal(mc.mobActive('__imp_test'), false);
  delete ENEMY_TYPES.__imp_test;
});

test('mobRate / mobBiomes / mobDropsFor fall back to registry defaults', () => {
  const type = mc.allMobTypes().find((t) => (ENEMY_TYPES[t].drops || []).length > 0);
  mc.resetMobConfig(type);
  assert.equal(mc.mobRate(type), 1);
  assert.equal(mc.mobBiomes(type), null);
  assert.deepEqual(mc.mobDropsFor(type), ENEMY_TYPES[type].drops);
});

test('setMobConfig merges patches without dropping prior keys', () => {
  const type = mc.allMobTypes()[0];
  mc.resetMobConfig(type);
  mc.setMobConfig(type, { rate: 3 });
  mc.setMobConfig(type, { active: false });
  assert.equal(mc.mobRate(type), 3);
  assert.equal(mc.mobActive(type), false);
  mc.resetMobConfig(type);
});

test('exportMobDefaults emits a valid, re-importable defaults module', async () => {
  const type = mc.allMobTypes()[0];
  mc.setMobConfig(type, { active: false, rate: 2.5, biomes: ['boreal_forest'] });
  const text = mc.exportMobDefaults();
  assert.match(text, /export const MOB_DEFAULTS = /);
  const url = 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
  const { MOB_DEFAULTS } = await import(url);
  assert.deepEqual(MOB_DEFAULTS[type], { active: false, rate: 2.5, biomes: ['boreal_forest'] });
  mc.resetMobConfig(type);
});

test('overrides persist to localStorage and round-trip through a fresh load', async () => {
  const type = mc.allMobTypes()[0];
  const drops = [{ item: 'coin', qty: [1, 3], chance: 0.5 }];
  mc.setMobConfig(type, { rate: 2.5, biomes: ['greenwood_plains'], active: false, drops });
  mc.saveMobConfig();

  const raw = globalThis.localStorage.getItem(mc.MOBCONFIG_KEY);
  assert.ok(raw, 'expected persisted json');
  assert.deepEqual(JSON.parse(raw)[type], { rate: 2.5, biomes: ['greenwood_plains'], active: false, drops });

  // a fresh module instance re-reads the same persisted store on import
  const mc2 = await import('../../js/game/mobconfig.js?fresh=1');
  assert.equal(mc2.mobRate(type), 2.5);
  assert.deepEqual(mc2.mobBiomes(type), ['greenwood_plains']);
  assert.equal(mc2.mobActive(type), false);
  assert.deepEqual(mc2.mobDropsFor(type), drops);

  mc.resetMobConfig(type);
});
