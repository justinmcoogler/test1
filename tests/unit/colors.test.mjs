// Validates the 16-colour block families: every colour registers the full set of
// blocks, each block's tiles resolve to a generated painter, and the special
// cases (carpet reuses the wool tile, panes reuse the glass tile, glass is
// transparent) hold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, COLOR_IDS } from '../../js/core/colors.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
import { tileNames } from '../../js/gfx/textures.js';

const tiles = new Set(tileNames());

test('there are the 16 canonical dye colours', () => {
  assert.equal(COLORS.length, 16);
  assert.equal(new Set(COLOR_IDS).size, 16, 'colour ids are unique');
  for (const [, hex] of COLORS) assert.match(hex, /^#[0-9a-f]{6}$/, `hex ${hex} well-formed`);
});

test('every colour has the full family and all tiles have painters', () => {
  const kinds = ['wool', 'carpet', 'concrete', 'concrete_powder', 'terracotta', 'glazed_terracotta', 'stained_glass', 'stained_glass_pane'];
  for (const id of COLOR_IDS) {
    for (const k of kinds) {
      const name = `${id}_${k}`;
      assert.ok(name in B, `${name} registered`);
      const d = BLOCKS[B[name]];
      for (const t of Object.values(d.tiles)) assert.ok(tiles.has(t), `tile "${t}" for ${name} has a painter`);
    }
  }
});

test('carpet reuses the wool tile; pane reuses the stained-glass tile', () => {
  for (const id of COLOR_IDS) {
    assert.equal(BLOCKS[B[`${id}_carpet`]].tiles.all, `${id}_wool`);
    assert.equal(BLOCKS[B[`${id}_stained_glass_pane`]].tiles.all, `${id}_stained_glass`);
  }
});

test('stained glass is transparent + non-occluding; carpet is a carpet shape', () => {
  const g = BLOCKS[B.red_stained_glass];
  assert.equal(g.opaque, false);
  assert.equal(g.transparent, true);
  assert.equal(BLOCKS[B.red_carpet].shape, 'carpet');
  assert.equal(BLOCKS[B.red_stained_glass_pane].shape, 'pane');
});
