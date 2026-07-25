// The character/world split, which is the one system in this game where a bug
// costs somebody a hundred hours rather than a reload. Everything here is about
// the cut being LOSSLESS and the line being in the right place: split then join
// must give back what you started with, a character must carry their skills into
// a new seed, and they must NOT carry a coordinate, a quest log or a dead boss.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitSave, joinSave, newCharacter, exportCharacter, importCharacter,
  migrateSlot, CHARACTER_KEYS, WORLD_KEYS, EXPORT_TAG,
} from '../../js/game/characters.js';

// A save payload shaped exactly like the one main.js writes, with a recognisable
// value in every field so a leak across the line is visible rather than inferred.
const fullSave = () => ({
  meta: { seedText: 'oldworld', playtime: 3600, totalLevel: 210, mode: 'free', version: 1 },
  player: { x: 24.5, y: 47, z: -76.5, yaw: 1.2, pitch: -0.3, hp: 31, maxHp: 44, energy: 80, mana: 12, maxMana: 20 },
  inventory: { slots: [{ item: 'iron_bar', qty: 7 }], coins: 412 },
  skills: { mining: 90000, handling: 4200 },
  stable: { tamed: ['crag_drake'], active: null, pets: ['rat'], pet: 'rat', progress: [] },
  discovered: ['0,0', '1,0'],
  discoveredItems: ['iron_bar'],
  education: { mode: 'free', earned: 120 },
  lessons: { done: ['count_to_ten'] },
  world: { seed: 12345, time: 900, edits: { '0,0': [3, 7] }, chests: { camp_stash: [] } },
  enemies: { killed: [['sp:1,2', 40]] },
  quests: { q_rootgrave: { status: 'done', stage: 5 } },
  flags: { boss_gorrak: true },
  waystones: [[10, 20, 65, 1, 0]],
  bedSpawn: [-0.5, 65, 7.5],
});

test('the two halves together are the whole save, with nothing dropped', () => {
  const src = fullSave();
  const { character, world } = splitSave(src);
  const back = joinSave(character, world, { seedText: src.meta.seedText });

  // Every key the game restores from survives the round trip, byte for byte.
  for (const k of [...CHARACTER_KEYS, ...WORLD_KEYS]) {
    assert.deepEqual(back[k], src[k], `${k} did not survive the split`);
  }
  assert.equal(back.meta.seedText, 'oldworld');
  assert.equal(back.meta.version, 2);
});

test('the line is in the right place — nothing is on both sides', () => {
  const overlap = CHARACTER_KEYS.filter((k) => WORLD_KEYS.includes(k));
  assert.deepEqual(overlap, [], 'a key on both sides would be written twice and diverge');
  const { character, world } = splitSave(fullSave());
  // The things that make you who you are.
  for (const k of ['skills', 'inventory', 'stable', 'discovered', 'lessons']) {
    assert.ok(character[k] !== undefined, `${k} belongs to the character`);
    assert.equal(world[k], undefined, `${k} must not also be stored on the world`);
  }
  // The things that are true of one seed only. Quest progress is the judgement
  // call here and it is the WORLD's: Gorrak dies once per world, and a character
  // walking into a fresh seed should find the chain waiting for them.
  for (const k of ['world', 'quests', 'flags', 'waystones', 'bedSpawn', 'enemies']) {
    assert.ok(world[k] !== undefined, `${k} belongs to the world`);
    assert.equal(character[k], undefined, `${k} must not travel with the character`);
  }
});

test('a coordinate never travels — it would land you inside a mountain', () => {
  const { character, world } = splitSave(fullSave());
  // The body comes with you; where the body was standing does not.
  assert.equal(character.player.hp, 31, 'your health is yours');
  assert.equal(character.player.maxHp, 44);
  for (const f of ['x', 'y', 'z', 'yaw', 'pitch']) {
    assert.equal(character.player[f], undefined, `${f} must stay with the world`);
  }
  assert.equal(world.pos.x, 24.5);
  assert.equal(world.pos.z, -76.5);

  // Re-entering the SAME world puts you back where you were…
  const same = joinSave(character, world, { seedText: 'oldworld' });
  assert.equal(same.player.x, 24.5);
  assert.equal(same.player.z, -76.5);
  // …and walking into a NEW one gives you a body with no coordinate at all,
  // which is what main.js reads as "seat them at this world's spawn".
  const fresh = joinSave(character, null, { seedText: 'somewhere else' });
  assert.equal(fresh.player.x, undefined);
  assert.equal(fresh.player.z, undefined);
  assert.deepEqual(fresh.skills, { mining: 90000, handling: 4200 }, 'but the skills came along');
  assert.equal(fresh.stable.tamed[0], 'crag_drake', 'and so did the dragon');
});

test('a character taken somewhere new brings no quest progress or dead bosses', () => {
  const { character } = splitSave(fullSave());
  const fresh = joinSave(character, null, { seedText: 'new' });
  assert.equal(fresh.quests, undefined, 'the chain is waiting for them again');
  assert.equal(fresh.flags, undefined, 'Gorrak is alive in this world');
  assert.equal(fresh.waystones, undefined, 'and they have found nothing here yet');
  assert.equal(fresh.bedSpawn, undefined, 'their bed is in the other world');
  assert.equal(fresh.world, undefined, 'the terrain is untouched');
});

test('a character keeps their identity across the split', () => {
  const src = fullSave();
  const { character } = splitSave(src, { name: 'Rook' });
  assert.equal(character.name, 'Rook');
  assert.ok(character.id, 'and gets an id to be filed under');
  // Splitting the same save twice must not mint two people for one body.
  const again = splitSave(src, { id: character.id, name: 'Rook' });
  assert.equal(again.character.id, character.id);
});

test('an export round-trips, and importing the same code twice gives two people', () => {
  const c = { ...newCharacter('Ada'), skills: { mining: 5000 }, inventory: { coins: 3 } };
  const code = exportCharacter(c);
  assert.ok(code.startsWith(`${EXPORT_TAG}:`), 'tagged so we can recognise it');

  const r = importCharacter(code);
  assert.equal(r.ok, true);
  assert.equal(r.character.name, 'Ada');
  assert.deepEqual(r.character.skills, { mining: 5000 });
  // A fresh id every time: importing your own character twice should give you a
  // copy, never silently overwrite the one you are playing.
  assert.notEqual(r.character.id, c.id);
  assert.notEqual(importCharacter(code).character.id, r.character.id);
});

test('a bad code is an ordinary answer, not a crash', () => {
  for (const [input, why] of [
    ['', 'empty'],
    ['hello', 'not a code'],
    [`${EXPORT_TAG}:not-base64!!`, 'damaged'],
    [`${EXPORT_TAG}:${Buffer.from('{"id":"x"}').toString('base64')}`, 'valid JSON but not a character'],
  ]) {
    const r = importCharacter(input);
    assert.equal(r.ok, false, `${why} should be refused`);
    assert.ok(r.error && r.error.length > 10, `${why} should say why in a sentence`);
  }
  assert.equal(importCharacter(null).ok, false);
  assert.equal(importCharacter(undefined).ok, false);
});

test('an old undivided save is split on the way in, once', () => {
  const src = fullSave();
  const moved = migrateSlot(src);
  assert.ok(moved, 'a version-1 save needs moving');
  assert.deepEqual(moved.character.skills, src.skills, 'their skills came out intact');
  assert.equal(moved.world.world.seed, 12345, 'and the world stayed behind');
  assert.equal(moved.seedText, 'oldworld');

  // Once it has been split, opening it again must not split it a second time —
  // that would mint a new character on every load and orphan the real one.
  const already = { meta: { version: 2, characterId: moved.character.id, seedText: 'oldworld' }, ...moved.world };
  assert.equal(migrateSlot(already), null);
  assert.equal(migrateSlot(null), null);
});

test('a brand-new character is exactly a new game', () => {
  const c = newCharacter('Nell');
  assert.equal(c.name, 'Nell');
  // No skills, no pack, no mounts: every deserializer treats an absent key as
  // "start fresh", so an empty character IS the from-scratch path.
  for (const k of CHARACTER_KEYS) assert.equal(c[k], undefined, `${k} starts empty`);
  const payload = joinSave(c, null, { seedText: 'brandnew' });
  assert.equal(payload.skills, undefined);
  assert.equal(payload.inventory, undefined);
  assert.equal(payload.meta.characterName, 'Nell');
  // An absurd name is trimmed rather than stored — it ends up in a save key and
  // on a button.
  assert.ok(newCharacter('x'.repeat(200)).name.length <= 24);
  assert.equal(newCharacter('').name, 'Wanderer');
});
