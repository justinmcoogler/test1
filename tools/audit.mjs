#!/usr/bin/env node
// Reachability audit: can every item actually be obtained, every mob actually
// spawn, every node actually be placed? Cross-references the whole content graph
// (nodes, mobs, chests, quests, block drops, starting kit) and closes over the
// recipe tree, then reports anything with no path to the player.
//
//   node tools/audit.mjs
import { ITEMS } from '../js/game/items.js';
import { BLOCKS, B } from '../js/world/blocks.js';
import { RECIPES, minFuel } from '../js/game/crafting.js';
import { NODE_TYPES, PROP_NODE_TYPES } from '../js/game/nodes.js';
import { ENEMY_TYPES } from '../js/game/enemies.js';
import { allIslands } from '../js/world/sky.js';
import { allUndercities } from '../js/world/undercity.js';
import { BIOMES, WorldGen } from '../js/world/worldgen.js';
import { buildStarterStructures } from '../js/world/structures.js';
import { QUESTS } from '../js/game/quests.js';
import { NPC_DEFS } from '../js/game/npcs.js';
import { LESSONS_DATA, lessonNeeds, pathPlan, isWalked } from '../js/game/lessons.js';

export function runAudit() {
const struct = buildStarterStructures();
const problems = [];

// ── what actually appears in the world ──────────────────────────────────────
const placedNodes = new Set();
for (const biome of Object.values(BIOMES)) {
  for (const n of biome.nodes || []) placedNodes.add(n.type);
  for (const t of biome.trees || []) placedNodes.add(t.type);
}
for (const t of ['ore_copper', 'ore_tin', 'ore_iron', 'deposit_coal', 'ore_lead', 'ore_zinc', 'ore_silver', 'ore_gold', 'ore_platinum', 'ore_meteoric']) placedNodes.add(t); // guaranteed underground
for (const t of PROP_NODE_TYPES) placedNodes.add(t); // nature-prop forage scattered on open ground (js/world/world.js)
for (const n of struct.nodes) placedNodes.add(n.type);

const spawnedMobs = new Set();
for (const biome of Object.values(BIOMES)) for (const e of biome.enemies || []) spawnedMobs.add(e.type);
for (const sp of struct.spawns) spawnedMobs.add(sp.type);
for (const def of Object.values(ENEMY_TYPES)) for (const ph of def.phases || []) for (const s of ph.summon || []) spawnedMobs.add(s);
// The sky archipelago and the dwarven holds carry their own creatures, and
// neither is a biome or a hand-built structure — the audit would otherwise call
// every one of them dead. Walked for real rather than declared: this asks the
// generator where the islands and the holds are and reads what it put on them,
// so a creature that stopped spawning is still caught.
{
  const gen = new WorldGen(20260725);
  for (const cluster of allIslands(gen, 5)) {
    for (const isle of cluster.isles) for (const b of isle.beasts || []) spawnedMobs.add(b.type);
  }
  for (const hold of allUndercities(gen, 3)) {
    for (const sp of hold.spawns || []) spawnedMobs.add(sp.type);
  }
}

// ── roots: items obtainable without crafting ────────────────────────────────
const roots = new Set(['coin']);
const addRoot = (i) => { if (i) roots.add(i); };
// importOnly blocks (schematic-import / creative) count as obtainable by fiat —
// placeable, but no survival gather/craft path is expected.
for (const [id, d] of Object.entries(ITEMS)) if (d?.importOnly) roots.add(id);
for (const t of placedNodes) { const d = NODE_TYPES[t]; if (!d) continue; for (const dr of d.drops || []) addRoot(dr.item); for (const rd of d.rare || []) addRoot(rd.item); }
for (const t of spawnedMobs) { const d = ENEMY_TYPES[t]; if (!d) continue; for (const dr of d.drops || []) addRoot(dr.item); }
for (const ch of struct.chests) for (const l of ch.loot || []) addRoot(l.item);
for (const q of QUESTS) for (const it of (q.rewards && q.rewards.items) || []) addRoot(it.item);
for (const npc of Object.values(NPC_DEFS)) for (const s of (npc.shop && npc.shop.sells) || []) addRoot(s.item); // buyable
// starting kit + hardcoded gather (crops, caches) from main.js
['worn_hatchet', 'travel_biscuit', 'grainsheaf', 'grain_seeds', 'golden_grain', 'old_coin', 'rough_gem', 'relic_fragment'].forEach(addRoot);
// Granted by main.js when a procedural dungeon's key holder dies — the mini-boss
// roster (js/world/dungeon.js `theme.mini`) is endless and region-anchored, so it
// isn't in the hand-built spawn list this audit walks.
addRoot('warden_key');
// basic terrain blocks you can just dig
['dirt', 'rough_stone', 'sand', 'gravel'].forEach(addRoot);
// ── lesson props ────────────────────────────────────────────────────────────
// Some education blocks have no survival recipe on purpose: an egg is not
// something you make at a workbench. They are obtained INSIDE a lesson — the kit
// hands out whatever the steps ask for (js/main.js grantLessonKit), and a walked
// station scatters things to find in the grass. That is a real path to the
// player, so this derives it from the curriculum rather than exempting a list by
// name: a prop block that no lesson hands out or scatters is still unreachable,
// and should still be reported.
for (const lesson of LESSONS_DATA) {
  for (const item of Object.keys(lessonNeeds(lesson))) addRoot(item);
  if (!isWalked(lesson)) continue;
  for (const st of pathPlan(lesson).stations) if (st.scatter?.block) addRoot(st.scatter.block);
}
// every block that appears in the world drops its item when broken
const worldBlocks = new Set();
for (const [k] of struct.edits) worldBlocks.add(Number(k.split(',')[3] !== undefined ? 0 : 0)); // (edits store ids; handled below)
for (const [, id] of struct.edits) worldBlocks.add(id);
for (const t of placedNodes) { const d = NODE_TYPES[t]; if (d?.ready) worldBlocks.add(B[d.ready]); if (d?.log) worldBlocks.add(B[d.log]); }
for (const id of worldBlocks) { const def = BLOCKS[id]; if (def && typeof def.drops === 'string') addRoot(def.drops); }

// ── close over the recipe tree ──────────────────────────────────────────────
let changed = true;
while (changed) {
  changed = false;
  for (const rc of RECIPES) {
    if (roots.has(rc.out)) continue;
    if (!rc.inputs.every((inp) => roots.has(inp.item))) continue;
    if (rc.fuelTemp && !roots.has(minFuel(rc.fuelTemp))) continue; // smelting needs a hot-enough fuel item
    roots.add(rc.out); changed = true;
  }
}

// ── report: unreachable items ───────────────────────────────────────────────
const KNOWN_QUEST_OR_SPECIAL = new Set([]); // add ids here if intentionally unobtainable
// importOnly items are schematic-import / creative blocks with no intended
// survival gather/craft path — placeable, but exempt from reachability.
const unreachable = Object.keys(ITEMS).filter((i) => !roots.has(i) && !KNOWN_QUEST_OR_SPECIAL.has(i) && !ITEMS[i]?.importOnly);
if (unreachable.length) problems.push(['UNREACHABLE ITEMS', unreachable]);

// recipes whose inputs can never all be gathered
const deadRecipes = RECIPES.filter((rc) => !rc.inputs.every((inp) => roots.has(inp.item)) || (rc.fuelTemp && !roots.has(minFuel(rc.fuelTemp)))).map((rc) => `${rc.out} ⟵ ${rc.inputs.map((i) => i.item).join('+')}`);
if (deadRecipes.length) problems.push(['RECIPES WITH UNREACHABLE INPUTS', [...new Set(deadRecipes)]]);

// mobs defined but never spawned (noOverworld summon-only is OK; imported mobs
// are admin-activated, not worldgen-spawned by default, so they are exempt)
const deadMobs = Object.keys(ENEMY_TYPES).filter((t) => !spawnedMobs.has(t) && !ENEMY_TYPES[t].imported);
if (deadMobs.length) problems.push(['MOBS NEVER SPAWNED', deadMobs]);

// nodes defined but never placed
const deadNodes = Object.keys(NODE_TYPES).filter((t) => !placedNodes.has(t));
if (deadNodes.length) problems.push(['NODES NEVER PLACED', deadNodes]);

// placeable blocks with no way to obtain the item (no item, not a world/node block)
const blockNoItem = [];
for (const d of BLOCKS) {
  if (!d || d.name === 'air') continue;
  const hasItem = d.name in ITEMS;
  const isWorldOnly = ['water', 'lava', 'bedrock'].includes(d.name) || d.shape === 'liquid';
  if (!hasItem && !isWorldOnly && typeof d.drops === 'string' && !(d.drops in ITEMS)) blockNoItem.push(d.name);
}
if (blockNoItem.length) problems.push(['BLOCKS WHOSE DROP IS NOT AN ITEM', blockNoItem]);

  const reachable = Object.keys(ITEMS).filter((i) => roots.has(i)).length;
  return { problems, stats: { items: Object.keys(ITEMS).length, reachable, blocks: BLOCKS.filter(Boolean).length, mobs: Object.keys(ENEMY_TYPES).length, nodes: Object.keys(NODE_TYPES).length, recipes: RECIPES.length } };
}

// ── CLI ───────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const { problems, stats } = runAudit();
  console.log(`Audited ${stats.items} items, ${stats.blocks} blocks, ${stats.mobs} mobs, ${stats.nodes} nodes, ${stats.recipes} recipes.`);
  console.log(`Reachable items: ${stats.reachable}/${stats.items}\n`);
  if (!problems.length) { console.log('✅ AUDIT CLEAN — everything is obtainable / spawns.'); process.exit(0); }
  for (const [title, list] of problems) {
    console.log(`⚠ ${title} (${list.length}):`);
    for (const x of list) console.log(`    ${x}`);
    console.log('');
  }
  process.exit(1);
}
