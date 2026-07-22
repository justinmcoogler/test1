// Validates the realistic material spine (js/game/materials.js): every id is
// unique, ladders are tier-ordered, alloys/smelts reference real metals, the
// jewelry metals are present, and the firearms chain is complete.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals } from '../../js/game/materials.js';

const metalIds = new Set(METALS.map((m) => m.id));
// strip a _bar / _ore suffix (or bare) to the underlying metal id
const baseMetal = (ref) => ref.replace(/_(bar|ore)$/, '');

test('materials: all ids are unique across every family', () => {
  const ids = [
    ...METALS.map((m) => m.id), ...WOODS.map((w) => w.id), ...GEMS.map((g) => g.id),
    ...FIREARMS.reagents.map((r) => r.id), ...FIREARMS.ammo.map((a) => a.id),
    ...FIREARMS.guns.map((g) => g.id), FIREARMS.powder.id,
  ];
  assert.equal(new Set(ids).size, ids.length, 'duplicate material id');
});

test('materials: tool-metal ladder is tier-ordered and each is obtainable', () => {
  const tools = toolMetals();
  assert.deepEqual(tools.map((m) => m.id),
    ['copper', 'bronze', 'iron', 'steel', 'damascus', 'meteoric'],
    'tool-metal order changed');
  let prev = 0;
  for (const m of tools) {
    assert.ok(m.tier > prev, `tool metal ${m.id} out of tier order`);
    prev = m.tier;
    const src = m.smelt || m.alloy;
    assert.ok(Array.isArray(src) && src.length, `${m.id} has no smelt/alloy source`);
    for (const ref of src) assert.ok(metalIds.has(baseMetal(ref)), `${m.id} references unknown metal "${ref}"`);
  }
});

test('materials: the jewelry metals the owner asked for are all present', () => {
  const jids = jewelryMetals().map((m) => m.id);
  for (const need of ['silver', 'gold', 'platinum', 'brass', 'electrum', 'pewter']) {
    assert.ok(jids.includes(need), `missing jewelry metal: ${need}`);
  }
  // jewelry metals must never be a tool
  for (const m of jewelryMetals()) assert.notEqual(m.role, 'tool');
  // brass/electrum/pewter are alloys of real metals
  for (const id of ['brass', 'electrum', 'pewter']) {
    const m = METALS.find((x) => x.id === id);
    assert.ok(m.alloy?.every((ref) => metalIds.has(baseMetal(ref))), `${id} alloy refs a missing metal`);
  }
});

test('materials: 12 real woods, tier-ordered, each with a real-world use', () => {
  assert.equal(WOODS.length, 12);
  let prev = 0;
  for (const w of WOODS) { assert.ok(w.tier > prev, `wood ${w.id} out of order`); prev = w.tier; assert.ok(w.use && w.woodLevel >= 1); }
  assert.equal(WOODS[0].id, 'pine');
  assert.equal(WOODS.at(-1).id, 'lignum_vitae');
});

test('materials: gems are hardness-ordered, diamond is the rare cap', () => {
  let prev = 0;
  for (const g of GEMS) { assert.ok(g.tier >= prev); prev = g.tier; assert.ok(g.cutLevel >= 1); }
  assert.equal(GEMS.at(-1).id, 'diamond');
  assert.ok(GEMS.at(-1).rare);
});

test('firearms: complete black-powder chain, off by default in education', () => {
  assert.equal(FIREARMS.educationDefaultOff, true);
  assert.deepEqual(FIREARMS.powder.components, ['saltpeter', 'charcoal', 'sulfur']);
  const woodIds = new Set(WOODS.map((w) => w.id));
  const ammoIds = new Set(FIREARMS.ammo.map((a) => a.id));
  for (const g of FIREARMS.guns) {
    assert.ok(metalIds.has(g.barrel), `${g.id} barrel metal missing`);
    assert.equal(METALS.find((m) => m.id === g.barrel).role, 'tool', `${g.id} barrel must be a tool metal`);
    assert.ok(woodIds.has(g.stock), `${g.id} stock wood missing`);
    assert.ok(ammoIds.has(g.ammo), `${g.id} ammo missing`);
    assert.ok(g.rangedLevel >= 40, `${g.id} should be a late-game Ranged unlock`);
  }
  for (const a of FIREARMS.ammo) assert.equal(a.from, 'lead_bar', 'ammo must be cast from lead');
});
