// Validates Phase 3 wiring: every generated recipe and resource node references
// only real items, blocks, stations and skills, the realistic ladders are all
// craftable, and the "gems drop while mining any rock" rule holds on every ore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals } from '../../js/game/materials.js';
import { RECIPES, STATION_LABELS, canCraft, craft, FUELS } from '../../js/game/crafting.js';
import { EducationManager } from '../../js/game/education.js';
import { NODE_TYPES, nodeBlocks } from '../../js/game/nodes.js';
import { SKILL_DEFS } from '../../js/game/skills.js';
import { ITEMS } from '../../js/game/items.js';
import { B } from '../../js/world/blocks.js';
import { BIOMES } from '../../js/world/worldgen.js';

const item = (id) => ITEMS[id] !== undefined;
const block = (n) => B[n] !== undefined;
const recipeOuts = new Set(RECIPES.map((rc) => rc.out));
const mineable = METALS.filter((m) => (m.smelt || []).some((s) => s.endsWith('_ore')));

test('recipes: every recipe has real out/inputs, valid station, skill and level', () => {
  for (const rc of RECIPES) {
    assert.ok(item(rc.out), `recipe output not an item: ${rc.out}`);
    assert.ok(rc.station === null || rc.station in STATION_LABELS, `bad station ${rc.station} for ${rc.out}`);
    assert.ok(rc.skill in SKILL_DEFS, `bad skill ${rc.skill} for ${rc.out}`);
    assert.ok(rc.level >= 1 && rc.level <= 99, `bad level ${rc.level} for ${rc.out}`);
    for (const inp of rc.inputs) assert.ok(item(inp.item), `recipe ${rc.out} needs missing item ${inp.item}`);
  }
});

test('smelting is gated by fuel temperature (charcoal → coal → coke)', () => {
  const skills = { level: () => 99, addXp() {} };
  const mkInv = (bag) => ({
    count: (i) => bag[i] || 0,
    hasAll: (reqs) => reqs.every((rq) => (bag[rq.item] || 0) >= rq.qty),
    canFit: () => true, add() {}, consumeAll() {},
  });
  const smeltRec = (out) => RECIPES.find((rc) => rc.out === out && rc.fuelTemp);

  const iron = smeltRec('iron_bar');
  assert.ok(iron && iron.fuelTemp > FUELS.charcoal, 'iron needs more than charcoal');
  assert.equal(canCraft(iron, mkInv({ iron_ore: 9, charcoal: 9 }), skills, new Set([iron.station])).ok, false, 'charcoal too cool for iron');
  assert.equal(canCraft(iron, mkInv({ iron_ore: 9, coal: 9 }), skills, new Set([iron.station])).ok, true, 'coal smelts iron');

  const met = smeltRec('meteoric_bar');
  assert.ok(met && met.fuelTemp > FUELS.coal, 'meteoric needs more than coal');
  assert.equal(canCraft(met, mkInv({ meteoric_ore: 9, coal: 9 }), skills, new Set([met.station])).ok, false, 'coal too cool for meteoric');
  assert.equal(canCraft(met, mkInv({ meteoric_ore: 9, coke: 9 }), skills, new Set([met.station])).ok, true, 'coke smelts meteoric');

  const cu = smeltRec('copper_bar');
  assert.equal(canCraft(cu, mkInv({ copper_ore: 9, charcoal: 9 }), skills, new Set([cu.station])).ok, true, 'charcoal smelts copper');
  assert.equal(canCraft(cu, mkInv({ copper_ore: 9 }), skills, new Set([cu.station])).ok, false, 'no fuel, no smelt');
});

test('recipes: full metal ladder is craftable (smelt/alloy → bars → gear)', () => {
  for (const m of METALS.filter((x) => x.role !== 'fuel')) assert.ok(recipeOuts.has(`${m.id}_bar`), `no bar recipe for ${m.id}`);
  const kit = ['pickaxe', 'axe', 'shovel', 'hoe', 'chisel', 'hammer', 'sword', 'dagger', 'battleaxe', 'spear', 'helmet', 'chestplate', 'leggings', 'boots', 'shield'];
  for (const m of toolMetals()) for (const k of kit) assert.ok(recipeOuts.has(`${m.id}_${k}`), `no forge recipe for ${m.id}_${k}`);
});

test('recipes: every gem is cuttable and every jewelry piece craftable', () => {
  for (const g of GEMS) assert.ok(recipeOuts.has(g.id), `no cut recipe for ${g.id}`);
  for (const m of jewelryMetals()) for (const j of ['ring', 'necklace', 'amulet']) assert.ok(recipeOuts.has(`${m.id}_${j}`), `no jewelry recipe ${m.id}_${j}`);
});

test('recipes: the whole firearms chain is craftable and education-locked', () => {
  const gunRecs = RECIPES.filter((rc) => rc.educationLocked);
  const outs = new Set(gunRecs.map((rc) => rc.out));
  assert.ok(outs.has(FIREARMS.powder.id), 'no gunpowder recipe');
  for (const a of FIREARMS.ammo) assert.ok(outs.has(a.id), `no ammo recipe ${a.id}`);
  for (const g of FIREARMS.guns) assert.ok(outs.has(g.id), `no gun recipe ${g.id}`);
  // nothing outside the firearms chain should carry the lock
  for (const rc of gunRecs) assert.ok(rc.out === FIREARMS.powder.id || FIREARMS.ammo.some((a) => a.id === rc.out) || FIREARMS.guns.some((g) => g.id === rc.out), `unexpected locked recipe ${rc.out}`);
});

test('firearms are craftable in free play but blocked in education mode by default', () => {
  const edu = new EducationManager();
  assert.equal(edu.firearmsAllowed, true, 'free play allows firearms');
  edu.setMode('education');
  assert.equal(edu.firearmsAllowed, false, 'education mode blocks firearms by default');
  edu.setMode('education', { firearms: true });
  assert.equal(edu.firearmsAllowed, true, 'a teacher can opt firearms back in');

  // a gun recipe must be blocked by canCraft when firearms are off, allowed when on
  const gunRec = RECIPES.find((rc) => rc.educationLocked && FIREARMS.guns.some((g) => g.id === rc.out));
  assert.ok(gunRec, 'a gun recipe exists');
  const inv = { hasAll: () => true, canFit: () => true, add() {}, consumeAll() {}, count: () => 99 };
  const skills = { level: () => 99, addXp() {} };
  const stations = new Set([gunRec.station]);
  assert.equal(canCraft(gunRec, inv, skills, stations, false).ok, false, 'guns off → not craftable');
  assert.equal(canCraft(gunRec, inv, skills, stations, true).ok, true, 'guns on → craftable');
  // a non-gun recipe is unaffected by the firearms flag
  const bar = RECIPES.find((rc) => rc.out === 'copper_bar');
  assert.equal(canCraft(bar, inv, skills, new Set([bar.station]), false).ok, true, 'copper still craftable with guns off');
});

test('tree canopies are leafy and stay within a chunk-local radius-2 footprint', () => {
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    if (def.kind !== 'tree') continue;
    assert.ok(['cone', 'round', 'spread', 'slim'].includes(def.canopy), `${type} has a canopy style`);
    const node = { type, x: 0, y: 64, z: 0, meta: { h: def.trunk[1] } };
    const cells = nodeBlocks(node, 'ready');
    const leaves = cells.filter((c) => c.id === B[def.leaves]);
    assert.ok(leaves.length >= 6, `${type} grows a real canopy (${leaves.length} leaves)`);
    for (const c of cells) {
      assert.ok(Math.abs(c.x) <= 2 && Math.abs(c.z) <= 2, `${type} leaf escapes footprint at ${c.x},${c.z}`);
    }
  }
});

test('nodes: every node references real skills, blocks and drop items', () => {
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    assert.ok(def.skill in SKILL_DEFS, `node ${type} bad skill ${def.skill}`);
    if (def.kind === 'tree') {
      assert.ok(block(def.log) && block(def.leaves), `tree ${type} missing log/leaves block`);
    } else if (def.kind !== 'water') {
      if (def.ready) assert.ok(block(def.ready), `node ${type} missing ready block ${def.ready}`);
      if (def.depleted) assert.ok(block(def.depleted), `node ${type} missing depleted block ${def.depleted}`);
    }
    for (const d of def.drops) assert.ok(item(d.item), `node ${type} drops missing item ${d.item}`);
    for (const rd of def.rare) assert.ok(item(rd.item), `node ${type} rare drops missing item ${rd.item}`);
  }
});

test('worldgen: every wood & metal actually spawns on a tree-valid surface', () => {
  // Mirror of world.js `treeGround`: trees only root on these surfaces.
  const TREE_SURFACES = new Set(['grass', 'snow_grass', 'corrupt_soil', 'stone', 'sand']);
  // Which tree/ore node types the biomes actually place, and on what surface.
  const placedTrees = new Map(); // tree type → true if on a tree-valid surface
  const placedNodes = new Set();
  for (const biome of Object.values(BIOMES)) {
    const surfaceOk = TREE_SURFACES.has(biome.surface);
    for (const t of biome.trees || []) placedTrees.set(t.type, (placedTrees.get(t.type) || false) || surfaceOk);
    for (const n of biome.nodes || []) placedNodes.add(n.type);
  }
  for (const w of WOODS) {
    const type = `tree_${w.id}`;
    assert.ok(placedTrees.has(type), `wood ${w.id} is in no biome's trees[] — unobtainable`);
    assert.ok(placedTrees.get(type), `wood ${w.id} only spawns on a non-tree surface — it would never generate`);
  }
  // The underground vein selection (world.js) is the guaranteed source of every
  // mineable metal — it must cover all of them so nothing depends on a rare
  // surface biome generating. (Kept in sync with world.js by hand.)
  const underground = new Set(['ore_copper', 'ore_tin', 'ore_iron', 'ore_lead', 'ore_zinc', 'ore_silver', 'ore_gold', 'ore_platinum', 'ore_meteoric', 'deposit_coal']);
  for (const m of mineable) {
    assert.ok(underground.has(`ore_${m.id}`), `metal ${m.id} not in the guaranteed underground selection — could be unobtainable on some seeds`);
  }
});

test('nodes: a tree per wood, an ore per mineable metal, gems drop on every ore', () => {
  for (const w of WOODS) assert.ok(NODE_TYPES[`tree_${w.id}`], `no tree node for ${w.id}`);
  for (const m of mineable) {
    const node = NODE_TYPES[`ore_${m.id}`];
    assert.ok(node, `no ore node for ${m.id}`);
    const gemDrops = node.rare.filter((rd) => rd.item.startsWith('uncut_'));
    assert.equal(gemDrops.length, GEMS.length, `ore_${m.id} should drop all ${GEMS.length} gems, got ${gemDrops.length}`);
  }
});
