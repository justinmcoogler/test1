#!/usr/bin/env node
// Import a licensed Blockbench mob pack (models/open_standard/*.bbmodel) into
// Sproutlands. Reads the pack catalog, converts every open-standard model via
// convertBBModel (skipping ones with no embedded texture), slugifies each
// catalog `title` into a unique snake_case type id (deduped so it never clashes
// with a native ENEMY_TYPES id or another import), and emits two GENERATED
// modules:
//
//   js/gfx/mobpack-imported.js  — export const IMPORTED_MODELS =
//        { <id>: { texW, texH, rig, texture, parts }, ... }   (the geometry+skin)
//   js/game/mobs-imported.js    — export const IMPORTED_TYPES  (ENEMY_TYPES-shaped)
//                                 export const IMPORTED_RIGS   ({ <id>: rigStyle })
//
// Imported mobs are registered and admin-configurable but NEVER worldgen-spawned
// (each carries `imported:true`; they are merged into ENEMY_TYPES after the
// natives and into the RIGS table, and skipped by the audit's spawn check).
// The raw .bbmodel files are NOT copied into the repo — only the generated
// modules. Attribution lives in assets/mobs/imported/.
//
//   node tools/import-mobpack.mjs [packDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertBBModel } from './gen-mobpack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = process.argv[2]
  || '/tmp/claude-0/-home-user-test1/5581956a-db33-537d-943c-5bb1e466c794/scratchpad/mobzip/minecraft_mob_bbmodels';
const MODELS_OUT = path.join(ROOT, 'js/gfx/mobpack-imported.js');
const TYPES_OUT = path.join(ROOT, 'js/game/mobs-imported.js');

// ── minimal RFC-4180-ish CSV parser (quoted fields, embedded commas/newlines) ─
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const hdr = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(hdr.map((h, i) => [h, r[i] ?? ''])));
}

// title → snake_case id
function slugify(t) {
  return String(t || '').toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'mob';
}

// behavior from the catalog's mob_group/category, per the pack import spec:
// animal/fish/bird → passive; hostile/fantasy/mob → aggressive.
function classifyBehavior(mobGroup, category) {
  const t = `${mobGroup || ''} ${category || ''}`.toLowerCase();
  if (/hostile|fantasy/.test(t)) return 'aggressive';
  if (/animal|fish|bird|fowl/.test(t)) return 'passive';
  if (/\bmob\b|npc|goblin/.test(t)) return 'aggressive';
  if (/creature/.test(t)) return 'passive';
  return 'passive';
}

// Native ENEMY_TYPES ids only (excludes any already-imported ids so re-runs are
// stable). enemies.js imports ./mobs-imported.js after the first generation, so
// we subtract the previously-imported set to recover just the natives.
async function nativeIds() {
  const en = await import('../js/game/enemies.js');
  let old = {};
  try { old = (await import('../js/game/mobs-imported.js')).IMPORTED_TYPES || {}; } catch { /* first run */ }
  return new Set(Object.keys(en.ENEMY_TYPES).filter((id) => !old[id]));
}

// ── default stats + drops, scaled small→medium, keyed on behavior ────────────
const STATS = {
  passive: { tier: 0, hp: 14, atk: 2, acc: 50, evasion: 10, armor: 0, speed: 5, moveRange: 3, xp: 12, respawn: 90, aggroRange: 0 },
  aggressive: { tier: 1, hp: 24, atk: 6, acc: 60, evasion: 10, armor: 1, speed: 6, moveRange: 4, xp: 30, respawn: 120, aggroRange: 6 },
};
// drops use only ids that already exist in js/game/items.js
const DROPS = {
  passive: [
    { item: 'boar_haunch', qty: [1, 2], chance: 0.9 },
    { item: 'cured_hide', qty: [1, 1], chance: 0.5 },
    { item: 'sinew', qty: [1, 2], chance: 0.6 },
  ],
  aggressive: [
    { item: 'old_coin', qty: [1, 2], chance: 0.5 },
    { item: 'sinew', qty: [1, 2], chance: 0.6 },
    { item: 'rough_gem', qty: [1, 1], chance: 0.12 },
  ],
};
// minimal 2-box format-required fallback (core.test asserts model.length >= 2);
// the real geometry comes from IMPORTED_MODELS at registration.
const box = (x, y, z, w, h, d, color) => ({ x: x - w / 2, y, z: z - d / 2, w, h, d, color });
const fallbackModel = () => [
  box(0, 0, 0, 0.7, 0.55, 0.95, [0.52, 0.5, 0.55]),
  box(0, 0.55, 0.35, 0.42, 0.42, 0.42, [0.58, 0.55, 0.6]),
];

function readRows() {
  const catalog = parseCSV(fs.readFileSync(path.join(PACK, 'catalog.csv'), 'utf8'));
  return catalog.filter((r) => (r.local_path || '').startsWith('models/open_standard/'));
}

(async () => {
  const rows = readRows();
  const native = await nativeIds();
  const used = new Set(native);

  const models = {};       // id → { texW, texH, rig, texture, parts }
  const types = {};        // id → ENEMY_TYPES-shaped def
  const rigs = {};         // id → rig style
  const skipped = [];      // { title, path, reason }
  const mapping = [];      // { id, title, group, behavior, rig }

  for (const r of rows) {
    const abs = path.join(PACK, r.local_path);
    let def;
    try {
      def = convertBBModel(JSON.parse(fs.readFileSync(abs, 'utf8')));
    } catch (e) {
      skipped.push({ title: r.title, path: r.local_path, reason: e.message });
      continue;
    }
    // unique id: dedupe against natives + prior imports
    const base = slugify(r.title);
    let id = base, n = 2;
    while (used.has(id)) { id = `${base}_${n}`; n++; }
    used.add(id);

    const behavior = classifyBehavior(r.mob_group, r.category);
    const st = STATS[behavior];
    models[id] = { texW: def.texW, texH: def.texH, rig: def.rig, texture: def.texture, parts: def.parts };
    rigs[id] = def.rig;
    types[id] = {
      label: r.title || id,
      behavior,
      tier: st.tier,
      hp: st.hp, atk: st.atk, acc: st.acc, evasion: st.evasion, armor: st.armor,
      speed: st.speed, moveRange: st.moveRange,
      abilities: [], element: null, weak: [], resist: [],
      xp: st.xp, respawn: st.respawn, aggroRange: st.aggroRange,
      drops: DROPS[behavior].map((d) => ({ ...d, qty: [...d.qty] })),
      desc: `${r.title || id} — an imported creature model (${r.mob_group || 'creature'}). Not part of the base bestiary; enable it from the mob admin panel.`,
      recommend: 'Imported model with placeholder stats — tune before enabling.',
      model: fallbackModel(),
      imported: true,
      credit: r.suggested_credit || '',
      license: r.license || '',
      source: r.source_project || '',
    };
    mapping.push({ id, title: r.title, group: r.mob_group, behavior, rig: def.rig });
  }

  // ── emit js/gfx/mobpack-imported.js (geometry + embedded skins) ────────────
  const modHeader = '// GENERATED by tools/import-mobpack.mjs — do not edit by hand.\n'
    + '// Licensed Blockbench mob pack converted to mob defs (parts + per-box UV\n'
    + '// islands into each model\'s own embedded texture). See\n'
    + '// assets/mobs/imported/CREDITS.md for attribution. Registered via\n'
    + '// js/game/mobpack.js; admin-activated, never worldgen-spawned.\n';
  fs.writeFileSync(MODELS_OUT, modHeader + `export const IMPORTED_MODELS = ${JSON.stringify(models, null, 0)};\n`);

  // ── emit js/game/mobs-imported.js (ENEMY_TYPES-shaped defs + rig table) ────
  const typHeader = '// GENERATED by tools/import-mobpack.mjs — do not edit by hand.\n'
    + '// Imported licensed mob TYPES (stats/behavior/drops), one per model in\n'
    + '// js/gfx/mobpack-imported.js. Each carries `imported:true`: registered and\n'
    + '// admin-configurable but NOT worldgen-spawned. IMPORTED_TYPES is spread into\n'
    + '// ENEMY_TYPES (js/game/enemies.js) after the natives; IMPORTED_RIGS is merged\n'
    + '// into the RIGS table (js/game/rigs.js). Attribution: assets/mobs/imported/.\n';
  fs.writeFileSync(TYPES_OUT,
    typHeader
    + `export const IMPORTED_TYPES = ${JSON.stringify(types, null, 2)};\n\n`
    + `export const IMPORTED_RIGS = ${JSON.stringify(rigs, null, 2)};\n`);

  // ── report ─────────────────────────────────────────────────────────────────
  const kb = (p) => Math.round(fs.statSync(p).size / 1024);
  const passive = mapping.filter((m) => m.behavior === 'passive').length;
  const aggressive = mapping.filter((m) => m.behavior === 'aggressive').length;
  console.log(`Imported ${mapping.length} of ${rows.length} open_standard models (${skipped.length} skipped).`);
  console.log(`  passive: ${passive}   aggressive: ${aggressive}`);
  console.log(`  ${path.relative(ROOT, MODELS_OUT)} — ${kb(MODELS_OUT)} KB`);
  console.log(`  ${path.relative(ROOT, TYPES_OUT)} — ${kb(TYPES_OUT)} KB`);
  if (skipped.length) {
    console.log('SKIPPED (no embedded texture / unconvertible):');
    for (const s of skipped) console.log(`  ${s.title} [${s.path}] — ${s.reason}`);
  }
  console.log('\nSample id → category → behavior (rig):');
  for (const m of mapping.slice(0, 12)) console.log(`  ${m.id}  ←  ${m.group} → ${m.behavior} (${m.rig})`);
  console.log(`\nAll ${mapping.length} imported ids:`);
  console.log('  ' + mapping.map((m) => m.id).join(', '));
})();
