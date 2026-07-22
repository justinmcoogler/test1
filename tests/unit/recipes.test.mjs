// Validates Phase 3 wiring: every generated recipe and resource node references
// only real items, blocks, stations and skills, the realistic ladders are all
// craftable, and the "gems drop while mining any rock" rule holds on every ore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals } from '../../js/game/materials.js';
import { RECIPES, STATION_LABELS, canCraft, craft } from '../../js/game/crafting.js';
import { EducationManager } from '../../js/game/education.js';
import { NODE_TYPES } from '../../js/game/nodes.js';
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
  const inv = { hasAll: () => true, canFit: () => true, add() {}, consumeAll() {} };
  const skills = { level: () => 99, addXp() {} };
  const stations = new Set([gunRec.station]);
  assert.equal(canCraft(gunRec, inv, skills, stations, false).ok, false, 'guns off → not craftable');
  assert.equal(canCraft(gunRec, inv, skills, stations, true).ok, true, 'guns on → craftable');
  // a non-gun recipe is unaffected by the firearms flag
  const bar = RECIPES.find((rc) => rc.out === 'copper_bar');
  assert.equal(canCraft(bar, inv, skills, new Set([bar.station]), false).ok, true, 'copper still craftable with guns off');
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
  // underground selection (world.js) covers copper/tin/iron/lead/silver/gold/meteoric + coal;
  // the rest must appear via a biome nodes[] list.
  const underground = new Set(['ore_copper', 'ore_tin', 'ore_iron', 'ore_lead', 'ore_silver', 'ore_gold', 'ore_meteoric', 'deposit_coal']);
  for (const m of mineable) {
    const type = `ore_${m.id}`;
    assert.ok(placedNodes.has(type) || underground.has(type), `metal ${m.id} spawns nowhere (no biome node, not underground)`);
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
