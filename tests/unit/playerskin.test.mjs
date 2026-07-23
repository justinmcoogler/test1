// Player skin: the pure UV/material logic that dresses the adventurer in its
// equipped gear. (The canvas paint step is browser-only and covered by the
// e2e smoke/screenshot; here we prove the mapping every body box relies on.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materialOf, partMaterials, partBoxUV, swatchUV, gearColor, PART_UV, SKIN_W, SKIN_H } from '../../js/gfx/playerskin.js';
import { ITEMS } from '../../js/game/items.js';

test('materialOf maps item families to wrap materials (woven → cloth, unknown → armor)', () => {
  assert.equal(materialOf('iron_helmet'), 'iron');
  assert.equal(materialOf('steel_chestplate'), 'steel');
  assert.equal(materialOf('damascus_boots'), 'damascus');
  assert.equal(materialOf('meteoric_leggings'), 'meteoric');
  assert.equal(materialOf('woven_robe'), 'cloth');   // the woven set uses the cloth wrap
  assert.equal(materialOf('hide_cap'), 'hide');
  assert.equal(materialOf('mystery_plate'), 'armor'); // graceful neutral fallback
  assert.equal(materialOf(null), null);
});

test('partMaterials dresses each body part from the right slot; mixed sets keep their material', () => {
  const eq = { head: { item: 'iron_helmet' }, body: { item: 'steel_chestplate' }, legs: null, feet: { item: 'hide_boots' } };
  const m = partMaterials(eq);
  assert.equal(m.head, 'iron', 'helmet → head');
  assert.equal(m.body, 'steel', 'chestplate → torso');
  assert.equal(m.arm_l, 'steel'); assert.equal(m.arm_r, 'steel', 'chestplate also covers arms');
  assert.equal(m.leg_l, 'hide'); assert.equal(m.leg_r, 'hide', 'boots fall back to dress the legs when no leggings');
});

test('an unarmoured adventurer shows base body colours (never undefined)', () => {
  const m = partMaterials({});
  assert.equal(m.head, 'base_head');
  assert.equal(m.body, 'base_body');
  assert.equal(m.leg_l, 'base_leg');
  for (const v of Object.values(m)) assert.ok(v, 'every part resolves to a material');
});

test('every armour material family maps to one of the eight painted wraps (or the neutral)', () => {
  const wraps = new Set(['hide', 'cloth', 'bronze', 'copper', 'iron', 'steel', 'damascus', 'meteoric', 'armor']);
  for (const [id, def] of Object.entries(ITEMS)) {
    if (def.type !== 'armor') continue;
    assert.ok(wraps.has(materialOf(id)), `${id} → ${materialOf(id)} is a known wrap`);
  }
});

test('partBoxUV gives all six faces, normalised into the skin and non-degenerate', () => {
  for (const part of Object.keys(PART_UV)) {
    const uv = partBoxUV(part);
    assert.equal(Object.keys(uv).length, 6, `${part} has six faces`);
    for (const [face, r] of Object.entries(uv)) {
      for (const k of ['u0', 'v0', 'u1', 'v1']) assert.ok(r[k] >= 0 && r[k] <= 1, `${part}.${face}.${k} in [0,1]`);
      assert.ok(r.u1 > r.u0 && r.v1 > r.v0, `${part}.${face} is a real rect`);
    }
  }
});

test('held-gear colour swatches live outside the 64-wide body area (no clobber)', () => {
  for (const name of ['blade', 'grip', 'shield', 'rim']) {
    assert.ok(swatchUV(name).south.u0 >= 64 / SKIN_W, `${name} swatch is right of the humanoid cross`);
  }
  assert.ok(SKIN_H === 64 && SKIN_W === 96, 'skin is the 64-tall humanoid + 32-wide gear strip');
});

test('gearColor: metal weapons take the metal tone, bows/hafts go wood, specials glow', () => {
  assert.equal(gearColor('iron_sword'), '#9aa0a6');
  assert.equal(gearColor('steel_battleaxe'), '#c3ccd4');
  assert.equal(gearColor('yew_longbow'), '#6b4a2c');
  assert.equal(gearColor('timber_shield'), '#6b4a2c');
  assert.equal(gearColor('frostbrand_blade'), '#8fd0e8');
  assert.equal(gearColor('ember_staff'), '#d8702a');
});
