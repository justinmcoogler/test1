// Validates the generated realistic content (Phase 2): every metal, wood, gem,
// gun and jewelry piece in js/game/materials.js is registered as a block/item
// with a resolvable atlas tile and a dedicated icon — so the catalog can never
// silently drift from the blocks/items/textures/icons wired off it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals } from '../../js/game/materials.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
import { ITEMS } from '../../js/game/items.js';
import { tileNames } from '../../js/gfx/textures.js';
import { hasItemIcon } from '../../js/gfx/icons.js';

const TILES = new Set(tileNames());
const hasBlock = (n) => B[n] !== undefined;
const hasItem = (id) => ITEMS[id] !== undefined;
const mineable = METALS.filter((m) => (m.smelt || []).some((s) => s.endsWith('_ore')));

test('content: every mineable metal has an ore block, ore item and bar item', () => {
  for (const m of mineable) {
    assert.ok(hasBlock(`${m.id}_ore`), `missing ore block ${m.id}_ore`);
    assert.ok(hasItem(`${m.id}_ore`), `missing ore item ${m.id}_ore`);
    assert.ok(hasItemIcon(`${m.id}_ore`), `missing ore icon ${m.id}_ore`);
  }
  for (const m of METALS.filter((x) => x.role !== 'fuel')) {
    assert.ok(hasItem(`${m.id}_bar`), `missing bar item ${m.id}_bar`);
    assert.ok(hasItemIcon(`${m.id}_bar`), `missing bar icon ${m.id}_bar`);
  }
});

test('content: every wood has log+leaves blocks, log+plank items and atlas tiles', () => {
  for (const w of WOODS) {
    assert.ok(hasBlock(`${w.id}_log`) && hasBlock(`${w.id}_leaves`), `missing wood blocks for ${w.id}`);
    assert.ok(hasItem(`${w.id}_log`) && hasItem(`${w.id}_plank`), `missing wood items for ${w.id}`);
    for (const suffix of ['bark', 'ring', 'leaves']) assert.ok(TILES.has(`${w.id}_${suffix}`), `missing tile ${w.id}_${suffix}`);
    assert.ok(hasItemIcon(`${w.id}_log`) && hasItemIcon(`${w.id}_plank`), `missing wood icons for ${w.id}`);
  }
});

test('content: every gem has uncut + cut items and icons', () => {
  for (const g of GEMS) {
    assert.ok(hasItem(g.id) && hasItem(`uncut_${g.id}`), `missing gem items for ${g.id}`);
    assert.ok(hasItemIcon(g.id) && hasItemIcon(`uncut_${g.id}`), `missing gem icons for ${g.id}`);
  }
});

test('content: each tool metal has the full tool/weapon/armor kit', () => {
  const kit = ['pickaxe', 'axe', 'shovel', 'hoe', 'chisel', 'hammer', 'sword', 'dagger', 'battleaxe', 'spear', 'helmet', 'chestplate', 'leggings', 'boots', 'shield'];
  for (const m of toolMetals()) {
    for (const k of kit) {
      const id = `${m.id}_${k}`;
      assert.ok(hasItem(id), `missing gear item ${id}`);
      assert.ok(hasItemIcon(id), `missing gear icon ${id}`);
    }
  }
});

test('content: firearms chain registered and flagged education-locked', () => {
  for (const g of FIREARMS.guns) {
    assert.ok(hasItem(g.id) && ITEMS[g.id].firearm && ITEMS[g.id].educationLocked, `gun ${g.id} not wired`);
    assert.ok(hasItemIcon(g.id), `missing gun icon ${g.id}`);
  }
  for (const a of FIREARMS.ammo) assert.ok(hasItem(a.id) && ITEMS[a.id].educationLocked, `ammo ${a.id} not wired`);
  assert.ok(hasItem(FIREARMS.powder.id) && ITEMS[FIREARMS.powder.id].educationLocked, 'gunpowder not wired');
});

test('content: each jewelry metal has ring/necklace/amulet accessories', () => {
  for (const m of jewelryMetals()) {
    for (const j of ['ring', 'necklace', 'amulet']) {
      const id = `${m.id}_${j}`;
      assert.ok(hasItem(id) && ITEMS[id].type === 'accessory', `missing jewelry ${id}`);
      assert.ok(hasItemIcon(id), `missing jewelry icon ${id}`);
    }
  }
});

test('content: every generated block tile resolves to a real atlas painter', () => {
  const generated = [
    ...WOODS.flatMap((w) => [`${w.id}_log`, `${w.id}_leaves`]),
    ...mineable.map((m) => `${m.id}_ore`),
    'coal_seam', 'saltpeter_deposit', 'sulfur_deposit', 'meteor_crater',
  ];
  for (const name of generated) {
    const def = BLOCKS[B[name]];
    assert.ok(def, `block ${name} not registered`);
    for (const tile of Object.values(def.tiles)) assert.ok(TILES.has(tile), `block ${name} references missing tile "${tile}"`);
  }
});
