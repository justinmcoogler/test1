// Blockbench (.bbmodel) → mob model pack. Drop `assets/mobs/<type>[.<rig>].bbmodel`
// into the repo, run this, and each model is converted to our mob-def shape
// (parts + per-box UV islands into the model's own embedded texture) and
// embedded in js/gfx/mobpack.js as MOB_MODELS. At load the game decodes each
// texture and registers the model, overriding the built-in one for that type.
//
// This is how externally-sourced (licence-cleared) Blockbench models become
// in-game mobs — see docs/MOBMODELS.md. Conversion is exported (convertBBModel)
// so tests can exercise it on fixtures without shipping asset files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Blockbench face name → the face key remakeParts/mobremake understands.
const FACE = { up: 'up', down: 'down', north: 'north', south: 'south', east: 'east', west: 'west' };

// Normalise a Blockbench bone/group name into a part id our rigger keys off:
// 'body' (required), 'head', 'tail', leg*, arm*, wing*. Anything else is kept
// (sanitised); leg/arm/wing get a running index so mirrored limbs stay distinct.
function makeIdFactory() {
  const counts = {};
  return (raw) => {
    const n = String(raw || '').toLowerCase();
    let base;
    if (/head|skull|face/.test(n)) base = 'head';
    else if (/tail/.test(n)) base = 'tail';
    else if (/leg|thigh|shin|foot|paw|hoof/.test(n)) base = 'leg';
    else if (/wing|fin$|_fin|fin_/.test(n)) base = 'wing'; // fins → floater rig (fish bob, not waddle)
    else if (/arm|hand|claw/.test(n)) base = 'arm';
    else if (/body|torso|chest|root|main|hip|spine/.test(n)) base = 'body';
    else base = n.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'part';
    if (base === 'leg' || base === 'arm' || base === 'wing') {
      const i = counts[base] = (counts[base] || 0);
      counts[base]++;
      return `${base}${i}`;
    }
    if (base === 'body' || base === 'head' || base === 'tail') {
      if (counts[base]) return `${base}_${counts[base]++}`;
      counts[base] = 1;
      return base;
    }
    // generic bone ids must be unique too: colliding ids collapse the part
    // hierarchy (parent lookups turn ambiguous and meshes stack on one bone),
    // which is how bird/fish models with generic bone names render as a blob.
    if (counts[base]) return `${base}_${counts[base]++}`;
    counts[base] = 1;
    return base;
  };
}

export function convertBBModel(json, opts = {}) {
  const res = json.resolution || { width: 64, height: 64 };
  const texW = res.width || 64, texH = res.height || 64;
  // Skip Blockbench guide cubes that shouldn't render: ones the artist hid
  // (visibility:false) or excluded from export, and unmapped placeholders whose
  // every face has a zero-area UV (e.g. a `bb_main` bounding box, uv [0,0,0,0]).
  // Rendering these buried the real model inside a big flat cube.
  const uvUnmapped = (e) => {
    const vals = Object.values(e.faces || {}).filter((f) => Array.isArray(f.uv));
    return vals.length > 0 && vals.every((f) => f.uv[0] === f.uv[2] || f.uv[1] === f.uv[3]);
  };
  const elements = (json.elements || []).filter((e) =>
    e.from && e.to && e.visibility !== false && e.export !== false && !uvUnmapped(e));
  const byUuid = new Map(elements.map((e) => [e.uuid, e]));

  // Newer Blockbench exports (e.g. modded_entity) strip group metadata off the
  // outliner: nodes are bare {uuid, children} and the real name/origin/rotation
  // live in a separate top-level `groups` array. Without this lookup every bone
  // read as name=undefined + origin=undefined: junk part ids (rig inference
  // failed → everything fell to 'lumberer'), pivots collapsed to centre-floor,
  // and group rotations (a seal's -90° body, a bird's 35° torso) were DROPPED —
  // the "wrong anatomy / wrong bones" imports. Resolve through the map first.
  const groupByUuid = new Map((json.groups || []).filter((g) => g && g.uuid).map((g) => [g.uuid, g]));
  const nodeMeta = (n) => {
    const g = groupByUuid.get(n.uuid);
    return {
      name: n.name ?? g?.name,
      origin: n.origin ?? g?.origin,
      rotation: n.rotation ?? g?.rotation,
    };
  };

  // bounding box → centre on x/z, feet at y=0; Minecraft units are 1/16 block.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const e of elements) {
    minX = Math.min(minX, e.from[0], e.to[0]); maxX = Math.max(maxX, e.from[0], e.to[0]);
    minY = Math.min(minY, e.from[1], e.to[1]); maxY = Math.max(maxY, e.from[1], e.to[1]);
    minZ = Math.min(minZ, e.from[2], e.to[2]); maxZ = Math.max(maxZ, e.from[2], e.to[2]);
  }
  if (!elements.length) throw new Error('bbmodel has no cube elements');
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, floor = minY, S = 1 / 16;
  const tx = (x) => +((x - cx) * S).toFixed(4);
  const ty = (y) => +((y - floor) * S).toFixed(4);
  const tz = (z) => +((z - cz) * S).toFixed(4);

  const boxOf = (e) => {
    const fx = Math.min(e.from[0], e.to[0]), fy = Math.min(e.from[1], e.to[1]), fz = Math.min(e.from[2], e.to[2]);
    const w = Math.abs(e.to[0] - e.from[0]), h = Math.abs(e.to[1] - e.from[1]), d = Math.abs(e.to[2] - e.from[2]);
    const box = {
      from: [tx(fx), ty(fy), tz(fz)],
      size: [Math.max(+(w * S).toFixed(4), 0.01), Math.max(+(h * S).toFixed(4), 0.01), Math.max(+(d * S).toFixed(4), 0.01)],
    };
    const uv = {}; const faces = e.faces || {};
    for (const bf of Object.keys(FACE)) {
      const f = faces[bf];
      if (f && Array.isArray(f.uv)) {
        const [u1, v1, u2, v2] = f.uv;
        uv[bf] = [Math.min(u1, u2), Math.min(v1, v2), Math.max(1, Math.abs(u2 - u1)), Math.max(1, Math.abs(v2 - v1))];
      }
    }
    box.uv = Object.keys(uv).length ? uv : [0, 0, texW, texH];
    return box;
  };

  const parts = []; const partBoxes = new Map(); const bodyBoxes = [];
  const idOf = makeIdFactory();
  let rotN = 0;
  // A cube with its own baked rotation can't live in a plain axis-aligned box
  // list — the rotation would be silently dropped and the cube re-emitted
  // axis-aligned (how angled wings/branches/fins exploded into scatter). Give it
  // a tiny child part carrying the rotation, pivoted on the cube's origin.
  const attachCube = (e, parentId) => {
    if (Array.isArray(e.rotation) && e.rotation.some((v) => v)) {
      const o = e.origin || e.from;
      parts.push({
        id: `rot${rotN++}`, parent: parentId || null,
        pivot: [tx(o[0]), ty(o[1]), tz(o[2])],
        rotation: e.rotation.map((v) => +(+v).toFixed(2)),
        boxes: [boxOf(e)],
      });
    } else {
      (parentId ? partBoxes.get(parentId) : bodyBoxes).push(boxOf(e));
    }
  };
  const walk = (nodes, parentId) => {
    for (const n of nodes || []) {
      if (typeof n === 'string') {
        const e = byUuid.get(n); if (!e) continue;
        attachCube(e, parentId);
      } else if (n && n.uuid && Array.isArray(n.children)) {
        const meta = nodeMeta(n);
        const id = idOf(meta.name);
        const o = meta.origin || [cx, floor, cz];
        const part = { id, parent: parentId || null, pivot: [tx(o[0]), ty(o[1]), tz(o[2])], boxes: [] };
        if (Array.isArray(meta.rotation) && meta.rotation.some((v) => v)) part.rotation = meta.rotation.map((v) => +(+v).toFixed(2));
        parts.push(part); partBoxes.set(id, part.boxes);
        walk(n.children, id);
      }
    }
  };
  if (Array.isArray(json.outliner) && json.outliner.length) walk(json.outliner, null);
  else for (const e of elements) attachCube(e, null); // flat model: everything is body

  // guarantee exactly one 'body' part carrying the loose/root geometry
  let body = parts.find((p) => p.id === 'body');
  if (!body) {
    if (bodyBoxes.length || !parts.length) { body = { id: 'body', parent: null, pivot: [0, +((maxY - floor) * S * 0.4).toFixed(4), 0], boxes: bodyBoxes }; parts.unshift(body); }
    else { parts[0].id = 'body'; body = parts[0]; body.boxes.push(...bodyBoxes); }
  } else body.boxes.push(...bodyBoxes);
  // Boxless bones still matter when they carry a rotation or sit inside a parent
  // chain (a seal's whole_body(-90°) holds only child groups — dropping it
  // un-rotates the entire animal). Keep any bone that has geometry, a rotation,
  // or surviving descendants; the renderer treats boxless parts as pose-chain
  // locators that draw nothing.
  const hasKeptChild = (id) => parts.some((p) => p.parent === id && (p.boxes.length || p.rotation || hasKeptChild(p.id)));
  const kept = parts.filter((p) => p.id === 'body' || p.boxes.length || p.rotation || hasKeptChild(p.id));
  for (const p of kept) if (p.parent && !kept.some((q) => q.id === p.parent)) p.parent = null;

  // rig: filename hint wins, else infer from limb bones
  let rig = opts.rig;
  if (!rig) {
    const legs = kept.filter((p) => /^leg/.test(p.id)).length;
    const wings = kept.filter((p) => /^wing/.test(p.id)).length;
    const arms = kept.filter((p) => /^arm/.test(p.id)).length;
    if (wings >= 1) rig = 'floater';
    else if (legs >= 4) rig = 'quadruped';
    else if (legs === 2) rig = 'biped';
    else rig = 'lumberer';
    if (arms >= 2 && legs <= 2) rig = 'biped';
  }

  const texture = (json.textures && json.textures[0] && json.textures[0].source) || null;
  if (!texture || !/^data:image\//.test(texture)) throw new Error('bbmodel is missing an embedded texture (export with textures embedded)');
  return { texW, texH, rig, texture, parts: kept };
}

// filename → { type, rig }: `cow.bbmodel` or `cow.quadruped.bbmodel`
export function parseName(base) {
  const parts = base.split('.');
  if (parts.length >= 2) return { type: parts[0], rig: parts[1] };
  return { type: parts[0], rig: null };
}

// ---- CLI: assets/mobs/*.bbmodel → js/gfx/mobpack.js -------------------------
function main() {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const SRC = path.join(ROOT, 'assets/mobs');
  const OUT = path.join(ROOT, 'js/gfx/mobpack.js');
  const models = {};
  const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => f.endsWith('.bbmodel')) : [];
  const errs = [];
  for (const f of files) {
    const base = f.replace(/\.bbmodel$/, '');
    const { type, rig } = parseName(base);
    try {
      models[type] = convertBBModel(JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')), { rig });
      console.log(`converted ${f} → ${type} (rig ${models[type].rig}, ${models[type].parts.length} parts)`);
    } catch (e) { errs.push(`${f}: ${e.message}`); }
  }
  const header = '// GENERATED by tools/gen-mobpack.mjs — do not edit by hand.\n'
    + '// Blockbench models from assets/mobs/, converted to mob defs (parts + UV\n'
    + '// islands into each model\'s own embedded texture). Empty until models are dropped in.\n';
  fs.writeFileSync(OUT, header + `export const MOB_MODELS = ${JSON.stringify(models, null, 0)};\n`);
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`wrote ${OUT} (${kb} KB) — ${Object.keys(models).length} model(s)`);
  if (errs.length) { console.log('SKIPPED:'); errs.forEach((e) => console.log('  ' + e)); }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
