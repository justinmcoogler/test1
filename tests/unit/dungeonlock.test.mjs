// The runtime half of a procedural dungeon's lock (js/game/dungeonlock.js).
//
// js/world/dungeon.js proves the STATIC half by flood-fill: a boss room behind a
// grate, and the key holder reachable without passing it. These tests guard the
// half that makes it mean anything at play time:
//
//   * the nine cells this module calls "the grate" are the nine iron-bar cells
//     the generator actually wrote — if that arithmetic ever drifts, the lock
//     silently becomes a wall you mine through again;
//   * the state machine refuses without a key, spends exactly one with it, and
//     stays open afterwards;
//   * the boss hoard is sealed until THAT dungeon's boss dies — and the flags are
//     per-dungeon, which is the trap the dungeon author flagged: main.js's
//     BOSS_FLAGS is keyed by mob TYPE, and a dungeon boss type is ordinary roster
//     fodder elsewhere in the world.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world/world.js';
import { B } from '../../js/world/blocks.js';
import { findDungeon, dungeonAt, reachableRooms } from '../../js/world/dungeon.js';
import { ENEMY_TYPES } from '../../js/game/enemies.js';
import { ITEMS } from '../../js/game/items.js';
import {
  KEY_ITEM, dungeonId, gateFlag, bossFlag, dungeonNear, grateCells, isGrateCell,
  keyHolderId, bossSpawnId, gateOpen, bossDead, gateVerdict, openGate,
  markBossDead, bossChestSealed, sealedChestMsg,
} from '../../js/game/dungeonlock.js';

// Boss flags in main.js are keyed by mob type; these two are the hand-built
// bosses that keying gets away with, because each is one creature in one place.
const HAND_BUILT_BOSSES = ['rootbound_golem', 'rimehowl_alpha'];

// A dungeon plus a world with every chunk its grate touches generated.
// ensureChunk, not generateChunk — generateChunk does not cache, so a later
// getBlock would read air out of nowhere.
function dungeonWorld(seed) {
  const w = new World(seed);
  const dg = findDungeon(w.gen, 6);
  assert.ok(dg, `seed ${seed} has a dungeon within reach`);
  for (const [x, , z] of grateCells(dg)) w.ensureChunk(x >> 4, z >> 4);
  return { w, dg };
}

// ---- the key item ----------------------------------------------------------
test('the key is an item of its own, not the relic fragment dungeon.js nominates', () => {
  assert.ok(ITEMS[KEY_ITEM], `${KEY_ITEM} is a real item`);
  assert.notEqual(KEY_ITEM, 'relic_fragment');
  // The reason, asserted rather than left in a comment: relic fragments arrive
  // from everywhere, so a grate that opened to one would already be open.
  const dg = dungeonAt(new World(4242).gen, 0, 0) || findDungeon(new World(4242).gen, 6);
  assert.ok(dg);
  assert.ok(dg.theme.bossLoot.some(([i]) => i === 'relic_fragment'),
    'a dungeon pays OUT relic fragments — so they cannot also be what unlocks it');
});

// ---- geometry --------------------------------------------------------------
test('the cells this module locks are the cells the generator barred', () => {
  const { w, dg } = dungeonWorld(20260725);
  const cells = grateCells(dg);
  assert.equal(cells.length, 9, 'three tall by three wide');
  for (const [x, y, z] of cells) {
    assert.equal(w.getBlock(x, y, z), B.iron_bars, `grate cell ${x},${y},${z} is iron bars`);
    assert.equal(isGrateCell(dg, x, y, z), true);
  }
  // The trim posts framing it are masonry, and the corridor either side is air —
  // neither is lock, and claiming them would wall off the approach.
  const d = dg.door;
  for (const [x, y, z] of [
    [d.x, d.y - 1, d.z], [d.x, d.y + 3, d.z],
    d.alongX ? [d.x, d.y, d.z + 2] : [d.x + 2, d.y, d.z],
    d.alongX ? [d.x + 1, d.y, d.z] : [d.x, d.y, d.z + 1],
  ]) {
    assert.equal(isGrateCell(dg, x, y, z), false, `${x},${y},${z} is not part of the grate`);
  }
});

test('a dungeon can be found from any column inside it', () => {
  const { w, dg } = dungeonWorld(20260725);
  for (const [label, x, z] of [
    ['the door', dg.door.x, dg.door.z],
    ['the boss chest', dg.bossChest.x, dg.bossChest.z],
    ['the key chest', dg.keyChest.x, dg.keyChest.z],
    ['the stair head', dg.x, dg.z],
  ]) {
    assert.equal(dungeonNear(w.gen, x, z), dg, `found the dungeon from ${label}`);
  }
  // And not from well outside its footprint.
  assert.equal(dungeonNear(w.gen, dg.maxX + 200, dg.maxZ + 200), null);
});

test('the key holder and the boss are distinct spawns, and the key holder is the one you can reach', () => {
  const { dg } = dungeonWorld(20260725);
  const key = keyHolderId(dg), boss = bossSpawnId(dg);
  assert.ok(key && boss);
  assert.notEqual(key, boss);
  const ids = dg.spawns.map((s) => `dg:${s.x},${s.y},${s.z}`);
  assert.ok(ids.includes(key), 'the key holder is a spawn that actually exists');
  assert.ok(ids.includes(boss), 'so is the boss');
  // dungeon.js proves this by flood-fill; assert the ids line up with it, so the
  // runtime is granting the key off the mob you can actually get to.
  const open = reachableRooms(dg, false);
  assert.ok(open.has(dg.keyRoom), 'the key room is reachable before the grate');
  assert.ok(!open.has(dg.boss), 'the boss room is not');
});

// ---- the state machine -----------------------------------------------------
test('the grate refuses without a key, spends exactly one with it, and stays open', () => {
  const { dg } = dungeonWorld(20260725);
  const flags = {};

  assert.equal(gateOpen(flags, dg), false);
  const refused = gateVerdict(flags, dg, 0);
  assert.equal(refused.act, 'refuse');
  assert.match(refused.msg, /locked/i, 'it reads as locked, not as an odd wall');
  assert.match(refused.msg, new RegExp(ITEMS[KEY_ITEM].label), 'and it names what would open it');
  assert.equal(gateOpen(flags, dg), false, 'a refusal changes nothing');
  assert.deepEqual(flags, {}, 'and writes no flag');

  const ok = gateVerdict(flags, dg, 1);
  assert.equal(ok.act, 'unlock');
  assert.equal(ok.spend, 1, 'one key per grate');
  assert.equal(gateOpen(flags, dg), false, 'a verdict is not a transition');

  openGate(flags, dg);
  assert.equal(gateOpen(flags, dg), true);
  assert.equal(gateVerdict(flags, dg, 0).act, 'pass', 'and it stays open with no key at all');
  assert.deepEqual(Object.keys(flags), [gateFlag(dg)], 'exactly one flag, keyed by the dungeon');
});

test('the boss hoard is sealed until that dungeon\'s boss dies', () => {
  const { dg } = dungeonWorld(20260725);
  const flags = {};
  assert.equal(bossDead(flags, dg), false);
  assert.equal(bossChestSealed(flags, dg, dg.bossChest.id), true);
  // The key chest, on the way in, is never sealed — it is the warden's, not the
  // boss's.
  assert.equal(bossChestSealed(flags, dg, dg.keyChest.id), false);
  assert.match(sealedChestMsg(dg), new RegExp(ENEMY_TYPES[dg.theme.boss].label),
    'the message names the creature you have to kill');

  markBossDead(flags, dg);
  assert.equal(bossDead(flags, dg), true);
  assert.equal(bossChestSealed(flags, dg, dg.bossChest.id), false);
});

test('the gate and the hoard are independent locks', () => {
  const { dg } = dungeonWorld(20260725);
  const a = {};
  openGate(a, dg);
  assert.equal(bossChestSealed(a, dg, dg.bossChest.id), true,
    'getting through the grate does not hand you the hoard');
  const b = {};
  markBossDead(b, dg);
  assert.equal(gateOpen(b, dg), false, 'and killing the boss is not a way past the grate');
});

// ---- the trap: flags must be per-dungeon, never per mob type ---------------
test('unlocking one dungeon leaves every other dungeon locked', () => {
  const w = new World(20260725);
  const found = [];
  for (let r = 0; r <= 8 && found.length < 4; r++) {
    for (let rx = -r; rx <= r && found.length < 4; rx++) {
      for (let rz = -r; rz <= r && found.length < 4; rz++) {
        if (Math.max(Math.abs(rx), Math.abs(rz)) !== r) continue;
        const dg = dungeonAt(w.gen, rx, rz);
        if (dg) found.push(dg);
      }
    }
  }
  assert.ok(found.length >= 3, `found several dungeons to compare (${found.length})`);
  const ids = new Set(found.map(dungeonId));
  assert.equal(ids.size, found.length, 'every dungeon has its own identity');

  const flags = {};
  openGate(flags, found[0]);
  markBossDead(flags, found[0]);
  for (const dg of found.slice(1)) {
    assert.equal(gateOpen(flags, dg), false, `${dungeonId(dg)} is still locked`);
    assert.equal(bossChestSealed(flags, dg, dg.bossChest.id), true, `${dungeonId(dg)} hoard is still sealed`);
    assert.notEqual(gateFlag(dg), gateFlag(found[0]));
    assert.notEqual(bossFlag(dg), bossFlag(found[0]));
  }
  // Two dungeons sharing a theme (and therefore a boss TYPE) is the exact case a
  // type-keyed flag would get wrong, so make sure the sample contains one.
  const themes = found.map((dg) => dg.theme.key);
  if (new Set(themes).size < themes.length) {
    const dup = themes.findIndex((t, i) => themes.indexOf(t) !== i);
    assert.equal(bossChestSealed(flags, found[dup], found[dup].bossChest.id), true,
      'a same-theme dungeon is unaffected by its twin being cleared');
  }
});

test('no procedural dungeon reuses a hand-built boss type', () => {
  // A dungeon that spawned a rootbound_golem would let main.js BOSS_FLAGS unseal
  // the Rootgrave chest from the far side of the world. dungeon.js keeps its
  // rosters clear of both; this is the assertion that keeps it that way.
  const w = new World(20260725);
  const seen = new Set();
  for (let rx = -8; rx <= 8; rx++) {
    for (let rz = -8; rz <= 8; rz++) {
      const dg = dungeonAt(w.gen, rx, rz);
      if (!dg) continue;
      for (const s of dg.spawns) seen.add(s.type);
    }
  }
  assert.ok(seen.size > 8, `sampled a real spread of dungeon creatures (${seen.size})`);
  for (const t of HAND_BUILT_BOSSES) {
    assert.equal(seen.has(t), false, `no procedural dungeon spawns ${t}`);
  }
});

test('the boss chest carries the ring-themed payout, registered under its own id', () => {
  const { w, dg } = dungeonWorld(20260725);
  // Generate the chest's own chunk — the grate and the chest can sit either side
  // of a chunk border.
  w.ensureChunk(dg.bossChest.x >> 4, dg.bossChest.z >> 4);
  const meta = w.chestMeta.get(dg.bossChest.id);
  assert.ok(meta, 'the boss chest registered itself with the world');
  assert.ok(meta.loot?.length, 'and it carries loot');
  assert.deepEqual(meta.loot, dg.theme.bossLoot.map(([item, qty]) => ({ item, qty })),
    "the payout is the theme's bossLoot, item for item");
  // What the player receives is materialised from that meta, so paying out the
  // chest IS paying out bossLoot.
  const paid = w.openChest(dg.bossChest.id);
  assert.deepEqual(paid, meta.loot);
  for (const l of paid) assert.ok(ITEMS[l.item], `${l.item} is a real item`);
});
