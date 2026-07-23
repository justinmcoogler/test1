// Validates the survival building layer: every new placeable block has an item,
// every colour family + shape variant is craftable, and the dye tree works end
// to end (natural source → primary dye → mixed dye → coloured block).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, COLOR_IDS } from '../../js/core/colors.js';
import { ITEMS } from '../../js/game/items.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
import { RECIPES, craft, canCraft } from '../../js/game/crafting.js';

const outSet = new Set(RECIPES.map((r) => r.out));

test('every colour family + shape block has an item and a recipe', () => {
  const kinds = ['wool', 'carpet', 'concrete', 'concrete_powder', 'terracotta', 'glazed_terracotta', 'stained_glass', 'stained_glass_pane'];
  for (const c of COLOR_IDS) for (const k of kinds) {
    const n = `${c}_${k}`;
    assert.ok(n in ITEMS, `${n} is an item`);
    assert.ok(ITEMS[n].block === n, `${n} places its block`);
    assert.ok(outSet.has(n), `${n} is craftable`);
    assert.ok(`${c}_dye` in ITEMS, `${c}_dye is an item`);
  }
  // shape variants across materials
  for (const n of ['stone_stairs', 'cobble_wall', 'granite_slab', 'sandstone_stairs', 'copper_weathered_stairs', 'mossy_cobble_wall', 'planks_fence', 'brick_slab']) {
    assert.ok(n in ITEMS && ITEMS[n].block === n, `${n} placeable`);
    assert.ok(outSet.has(n), `${n} craftable`);
  }
});

test('there are 16 dyes, all with recipes', () => {
  assert.equal(COLORS.length, 16);
  for (const c of COLOR_IDS) assert.ok(outSet.has(`${c}_dye`), `${c}_dye has a recipe`);
});

// end-to-end craft simulation with a simple bag-backed inventory
function mkInv(bag) {
  return {
    count: (i) => bag[i] || 0,
    hasAll: (reqs) => reqs.every((rq) => (bag[rq.item] || 0) >= rq.qty),
    canFit: () => true,
    add: (i, q) => { bag[i] = (bag[i] || 0) + q; },
    consumeAll: (reqs) => reqs.forEach((rq) => { bag[rq.item] -= rq.qty; }),
  };
}
const skills = { level: () => 99, addXp() {} };
const rec = (out) => RECIPES.find((r) => r.out === out);

test('dye tree crafts through to a coloured block', () => {
  const bag = { tartberries: 1, saltpeter: 1, woven_cloth: 1 };
  const inv = mkInv(bag);
  // primary dyes
  assert.equal(craft(rec('red_dye'), inv, skills, new Set(['alchemy_table'])).ok, true, 'red from tartberries');
  assert.equal(craft(rec('white_dye'), inv, skills, new Set(['alchemy_table'])).ok, true, 'white from saltpeter');
  assert.ok(bag.red_dye >= 2 && bag.white_dye >= 2, 'primaries produced 2 each');
  // mixed dye
  assert.equal(craft(rec('pink_dye'), inv, skills, new Set(['alchemy_table'])).ok, true, 'pink = red + white');
  // colour wool with the pink dye
  assert.equal(craft(rec('pink_wool'), inv, skills, new Set(['loom_block'])).ok, true, 'pink wool from cloth + pink dye');
  assert.ok(bag.pink_wool >= 1, 'got pink wool');
});

test('shape variant carves from its base block', () => {
  const bag = { stone: 3 };
  const inv = mkInv(bag);
  const r = rec('stone_stairs');
  assert.equal(canCraft(r, inv, skills, new Set(['construction_bench'])).ok, true, 'stone → stairs craftable');
  craft(r, inv, skills, new Set(['construction_bench']));
  assert.ok(bag.stone_stairs >= 4 && bag.stone === 0, 'consumed 3 stone → 4 stairs');
});
