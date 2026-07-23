// Gem sockets: setting a cut gem into a weapon merges its bonus into the stats
// combat reads, consumes the gem, persists across save/load, and pops back out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from '../../js/game/inventory.js';
import { ITEMS } from '../../js/game/items.js';
import { GEM_SOCKET, gemBonus, SOCKETABLE_GEMS } from '../../js/game/sockets.js';
import { GEMS } from '../../js/game/materials.js';

test('every socketable gem is a real cut-gem item with a stat bonus', () => {
  const gemIds = new Set(GEMS.map((g) => g.id));
  for (const g of SOCKETABLE_GEMS) {
    assert.ok(gemIds.has(g), `${g} is a cut gem`);
    assert.ok(g in ITEMS, `${g} is an item`);
    const b = gemBonus(g);
    assert.ok(b && Object.keys(b).length, `${g} grants a bonus`);
    for (const k of Object.keys(b)) assert.ok(['atk', 'acc', 'crit', 'spd', 'range'].includes(k), `${g} bonus ${k} is a weapon stat`);
  }
});

test('socketing merges the bonus, consumes the gem, and equips through', () => {
  const inv = new Inventory();
  inv.add('bronze_sword'); inv.add('ruby');
  const idx = inv.slots.findIndex((s) => s && s.item === 'bronze_sword');
  const base = ITEMS.bronze_sword.atk;
  assert.equal(inv.socketGem(idx, 'ruby').ok, true);
  assert.equal(inv.count('ruby'), 0, 'gem consumed');
  assert.equal(inv.slots[idx].gem, 'ruby');
  inv.equipFromSlot(idx);
  const w = inv.weapon('melee');
  assert.equal(w.atk, base + GEM_SOCKET.ruby.atk, 'atk bonus applied');
  assert.equal(w.socketGem, 'ruby', 'weapon exposes its gem');
});

test('a second gem is refused; unsocket returns the gem', () => {
  const inv = new Inventory();
  inv.add('bronze_sword'); inv.add('ruby'); inv.add('emerald');
  const idx = inv.slots.findIndex((s) => s && s.item === 'bronze_sword');
  inv.socketGem(idx, 'ruby');
  assert.equal(inv.socketGem(idx, 'emerald').ok, false, 'one socket only');
  assert.equal(inv.unsocketGem(idx).ok, true);
  assert.ok(!inv.slots[idx].gem, 'socket cleared');
  assert.equal(inv.count('ruby'), 1, 'gem recovered');
});

test('non-weapons cannot be socketed', () => {
  const inv = new Inventory();
  inv.add('hide_cap'); inv.add('ruby');
  const idx = inv.slots.findIndex((s) => s && s.item === 'hide_cap');
  assert.equal(inv.socketGem(idx, 'ruby').ok, false);
});

test('a socketed gem survives serialize/deserialize (equipped + in bag)', () => {
  const inv = new Inventory();
  inv.add('bronze_sword'); inv.add('ruby'); inv.add('iron_sword'); inv.add('sapphire');
  const wi = inv.slots.findIndex((s) => s && s.item === 'bronze_sword');
  inv.socketGem(wi, 'ruby'); inv.equipFromSlot(wi);      // equipped, gemmed
  const bi = inv.slots.findIndex((s) => s && s.item === 'iron_sword');
  inv.socketGem(bi, 'sapphire');                          // in bag, gemmed
  const inv2 = new Inventory(); inv2.deserialize(inv.serialize());
  assert.equal(inv2.equipment.main.gem, 'ruby', 'equipped gem persisted');
  assert.equal(inv2.weapon('melee').atk, ITEMS.bronze_sword.atk + GEM_SOCKET.ruby.atk);
  assert.equal(inv2.slots.find((s) => s && s.item === 'iron_sword').gem, 'sapphire', 'bag gem persisted');
});
