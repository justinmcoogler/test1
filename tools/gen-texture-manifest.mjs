// Generate docs/TEXTURES.md (the 32×32 texture list) directly from the realistic
// material catalog (js/game/materials.js), so the art list can never drift from
// the content. Run: node tools/gen-texture-manifest.mjs
import { writeFile } from 'node:fs/promises';
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals } from '../js/game/materials.js';

const rows = [];           // {file, what, hint, transparent, batch, palette}
const add = (file, what, hint, transparent, batch, palette) => rows.push({ file, what, hint, transparent, batch, palette });

// ---- BLOCK TILES (opaque, tile seamlessly) ----
const terrain = [
  ['grass_top', 'grass top — mowed green'], ['grass_side', 'grass side — soil + green fringe'],
  ['dirt', 'plain soil'], ['stone', 'grey stone'], ['cobblestone', 'broken stone'],
  ['sand', 'pale sand'], ['gravel', 'loose pebbles'], ['clay', 'grey-brown clay'],
  ['snow', 'snow top'], ['snow_side', 'snowy grass side'], ['water', 'water surface'],
  ['bedrock', 'dark deep stone'], ['farmland', 'tilled wet soil'], ['tall_grass', 'wild grass tuft (transparent cross)'],
];
for (const [f, w] of terrain) add(`block_${f}.png`, w, 'natural earthy tones', f === 'tall_grass', 'B1 — Terrain', 'earth browns, greens, cool water blue');

// ores: any metal that is mined (has a *_ore) + firearm mineral deposits
const oreMetals = METALS.filter((m) => (m.smelt || []).some((s) => s.endsWith('_ore')));
for (const m of oreMetals) add(`block_${m.id}_ore.png`, `${m.label} ore — stone with ${m.label.toLowerCase()}-colored inclusions`, `stone-grey base; ${m.label} hue must read at a distance`, false, 'B2 — Ores', 'stone grey + each metal’s hue');
add('block_meteor_crater.png', 'meteor-crater floor — scorched fused rock (meteoric iron site)', 'charred dark rock, faint metallic flecks', false, 'B2 — Ores', 'stone grey + each metal’s hue');
add('block_saltpeter_deposit.png', 'saltpeter/nitre deposit — pale crusty mineral', 'chalky white-yellow crust on stone', false, 'B2 — Ores', 'stone grey + mineral pale');
add('block_sulfur_deposit.png', 'sulfur deposit — yellow volcanic mineral', 'bright sulfur yellow on dark rock', false, 'B2 — Ores', 'stone grey + mineral pale');
add('block_coal_lump.png', 'exposed coal seam', 'near-black with dull facets', false, 'B2 — Ores', 'stone grey + mineral pale');

// trees: per wood species — log side, log top (rings), leaves
let tbatch = 0;
WOODS.forEach((wd, i) => {
  const b = `B${3 + Math.floor(i / 4)} — Trees ${['A', 'B', 'C'][Math.floor(i / 4)]}`;
  add(`block_${wd.id}_log.png`, `${wd.label} log — bark`, `${wd.label} bark color/character`, false, b, 'per-species real wood tones');
  add(`block_${wd.id}_log_top.png`, `${wd.label} log — end grain rings`, 'concentric growth rings', false, b, 'per-species real wood tones');
  add(`block_${wd.id}_leaves.png`, `${wd.label} leaves/needles`, wd.id === 'pine' || wd.id === 'cedar' ? 'needled evergreen' : 'broadleaf canopy', true, b, 'per-species real wood tones');
});

// stations (kept, fresh art)
for (const [f, w] of [['furnace', 'furnace front'], ['anvil', 'anvil top'], ['workbench', 'workbench top'], ['loom', 'loom'], ['campfire', 'campfire'], ['chest_front', 'storage chest'], ['grindstone', 'gem-cutting/whetstone wheel'], ['tanning_rack', 'hide tanning rack']])
  add(`block_${f}.png`, w, 'worked timber + iron fittings', false, 'B6 — Stations', 'timber + iron');

// ---- ITEM ICONS (transparent) ----
// bars (all metals that produce a bar) + coal + charcoal
for (const m of METALS.filter((x) => x.role !== 'fuel')) add(`item_${m.id}_bar.png`, `${m.label} bar`, `${m.label} metal hue; shared bar silhouette`, true, 'I1 — Bars & fuel', 'metal hues; one bar shape');
add('item_coal.png', 'coal lump', 'black shiny lump', true, 'I1 — Bars & fuel', 'metal hues');
add('item_charcoal.png', 'charcoal', 'matte black chunk', true, 'I1 — Bars & fuel', 'metal hues');
// raw ore chunks
for (const m of oreMetals) add(`item_${m.id}_ore.png`, `raw ${m.label} ore chunk`, `rough rock with ${m.label} hue`, true, 'I2 — Raw ore & minerals', 'ore lumps');
for (const r of FIREARMS.reagents) add(`item_${r.id}.png`, r.label, 'mineral/reagent', true, 'I2 — Raw ore & minerals', 'ore lumps');
// gems: uncut + cut
GEMS.forEach((g) => {
  add(`item_uncut_${g.id}.png`, `uncut ${g.label}`, 'rough crystal', true, 'I3 — Gems', 'faceted gem hues');
  add(`item_${g.id}.png`, `cut ${g.label}`, 'faceted gem, bright core', true, 'I3 — Gems', 'faceted gem hues');
});
// woods: plank item per species
WOODS.forEach((wd, i) => add(`item_${wd.id}_plank.png`, `${wd.label} plank`, `${wd.label} tone`, true, `I4 — Planks ${['A', 'B'][Math.floor(i / 6)]}`, 'wood tones'));
// tool kits + weapons + armor per tool metal
const toolKit = ['pickaxe', 'axe', 'shovel', 'hoe', 'chisel', 'hammer'];
const armorKit = ['helmet', 'chestplate', 'leggings', 'boots', 'shield'];
const weapons = ['sword', 'dagger', 'battleaxe', 'spear'];
toolMetals().forEach((m) => {
  const b = `I5 — ${m.label} gear`;
  for (const t of toolKit) add(`item_${m.id}_${t}.png`, `${m.label} ${t}`, `${m.label} head, wood haft`, true, b, `${m.label} metal + wood haft`);
  for (const w of weapons) add(`item_${m.id}_${w}.png`, `${m.label} ${w}`, `${m.label} blade`, true, b, `${m.label} metal + wood haft`);
  for (const a of armorKit) add(`item_${m.id}_${a}.png`, `${m.label} ${a}`, `${m.label} plate`, true, b, `${m.label} metal + wood haft`);
});
// bows per bow-suited wood (ash, hickory, yew, + a couple more) & crossbow
for (const wid of ['ash', 'hickory', 'yew', 'oak', 'lignum_vitae']) {
  add(`item_${wid}_shortbow.png`, `${wid} shortbow`, 'curved stave + string', true, 'I6 — Bows & ammo', 'wood + cream string');
  add(`item_${wid}_longbow.png`, `${wid} longbow`, 'tall stave + string', true, 'I6 — Bows & ammo', 'wood + cream string');
}
add('item_arrow.png', 'arrows (fan of 3)', 'shaft + metal tip', true, 'I6 — Bows & ammo', 'wood + cream string');
add('item_bolt.png', 'crossbow bolts', 'stubby quarrels', true, 'I6 — Bows & ammo', 'wood + cream string');
// firearms + ammo + powder
for (const g of FIREARMS.guns) add(`item_${g.id}.png`, g.label, `${g.barrel} barrel + walnut stock`, true, 'I7 — Firearms', 'dark steel + walnut, brass fittings');
for (const a of FIREARMS.ammo) add(`item_${a.id}.png`, a.label, 'grey lead', true, 'I7 — Firearms', 'dark steel + walnut, brass fittings');
add(`item_${FIREARMS.powder.id}.png`, 'gunpowder', 'dark grainy powder in a horn/pouch', true, 'I7 — Firearms', 'dark steel + walnut, brass fittings');
// jewelry per jewelry metal (ring, necklace, amulet — gem set separately at runtime)
jewelryMetals().forEach((m) => {
  for (const j of ['ring', 'necklace', 'amulet']) add(`item_${m.id}_${j}.png`, `${m.label} ${j}`, `${m.label} band/setting; empty socket`, true, 'I8 — Jewelry', 'silver cool / gold warm / brass / platinum / electrum / pewter');
});

// ---- emit ----
const batches = [...new Set(rows.map((r) => r.batch))];
let md = `# Emberveil — Realistic Texture Manifest (v3)\n\n`;
md += `Generated from \`js/game/materials.js\` — ${rows.length} textures, all **32×32 PNG**. ` +
  `\`block_*.png\` = world tiles (opaque, tile seamlessly), \`item_*.png\` = inventory icons (transparent). ` +
  `Filenames are load-bearing — the texture-pack loader consumes them exactly.\n\n`;
md += `## How to generate (paste this prompt into ChatGPT, then one batch table per session)\n\n`;
md += `---\n\n` +
`You are generating pixel-art textures for a voxel RPG. I will paste a batch table of rows: \`filename | what it is | style hint | transparent?\`. For EACH row, produce a **32×32 pixel-art PNG** with that exact filename. Rules:\n\n` +
`1. Use your **Python tool with Pillow** to author every sprite at exactly 32×32 (draw on a 32×32 grid, or 320×320 downscaled NEAREST). No anti-aliasing, no blur, no gradients smoother than 3 steps.\n` +
`2. Rows marked transparent get a fully transparent background (RGBA alpha 0) — the sprite floats. Non-transparent rows fill the full 32×32 tile edge-to-edge and must **tile seamlessly** (offset 16px → no seam).\n` +
`3. Follow the batch's palette note; consistent hues across the batch, single top-left light source, 1px darker outline on item icons, no pure black/white.\n` +
`4. Item icons: centered subject, ~2px margin, readable silhouette. Block tiles: mid-contrast, no focal point (they repeat).\n` +
`5. After drawing the batch, zip the PNGs as \`textures_<batch>.zip\` with the exact filenames and give me the zip; then show a 4× contact sheet to review.\n` +
`6. Self-check: every filename present, all files exactly 32×32 RGBA PNG, transparency correct. State "manifest check passed" with the count.\n\n` +
`Style: realistic-but-readable chunky pixels; grounded medieval → renaissance palette (real woods, ores, metals, black-powder gear); no copied Minecraft/RuneScape sprites.\n\n---\n\n`;
for (const b of batches) {
  const br = rows.filter((r) => r.batch === b);
  md += `### Batch ${b} (${br.length}) — palette: ${br[0].palette}\n\n`;
  md += `| filename | what it is | style hint | transparent |\n|---|---|---|---|\n`;
  for (const r of br) md += `| \`${r.file}\` | ${r.what} | ${r.hint} | ${r.transparent ? 'yes' : 'no'} |\n`;
  md += `\n`;
}
md += `## Totals\n- Block tiles: ${rows.filter((r) => r.file.startsWith('block_')).length}\n- Item icons: ${rows.filter((r) => r.file.startsWith('item_')).length}\n- **Total: ${rows.length}**\n\n`;
md += `Not included (carried from the skill plan, generated later): fish, foods, potions, herbs, crops, hides, relics, coins, misc consumables.\n`;

await writeFile(new URL('../docs/TEXTURES.md', import.meta.url), md);
console.log(`wrote docs/TEXTURES.md — ${rows.length} textures (${rows.filter((r) => r.file.startsWith('block_')).length} blocks, ${rows.filter((r) => r.file.startsWith('item_')).length} items) across ${batches.length} batches`);
