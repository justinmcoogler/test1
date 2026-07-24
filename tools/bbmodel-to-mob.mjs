// Convert a Blockbench .bbmodel into an Sproutlands "mob" JSON file.
//
//   node tools/bbmodel-to-mob.mjs <in.bbmodel> [out.json] [options]
//
// Options:
//   --id <snake_case>     mob id (default: derived from filename)
//   --label "<Name>"      display name
//   --height <blocks>     scale so the model is this tall in blocks (default 1.5)
//   --hp/--atk/--speed n  combat stats (defaults 30 / 5 / 2)
//   --behavior <b>        passive|defensive|aggressive (default defensive)
//   --tier n / --xp n
//   --invert              negate X/Y of every rotation (bedrock/geckolib handedness)
//
// Handles: cube elements (meshes are skipped with a warning), per-face UV and
// box-UV modes, the bone/outliner hierarchy, baked cube + group rotations
// (emitted via the optional part.rotation the loader now understands), embedded
// textures (base64 -> dataUri), and rotation/position animation channels mapped
// onto Sproutlands's idle/walk/attack slots. See docs/MOB_FORMAT.md.
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
if (!argv.length) { console.error('usage: node tools/bbmodel-to-mob.mjs <in.bbmodel> [out.json] [--id x ...]'); process.exit(1); }
const positional = [];
const opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { const k = argv[i].slice(2); opt[k] = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : true; }
  else positional.push(argv[i]);
}
const inPath = positional[0];
const snake = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^([0-9])/, '_$1');
const rawId = opt.id || snake(basename(inPath).replace(/\.bbmodel$/i, ''));
const id = rawId.slice(0, 32);
const outPath = positional[1] || `mobs/${id}.json`;
const targetHeight = +(opt.height || 1.5);
const invert = !!opt.invert;

// ---------------------------------------------------------------- load
const bb = JSON.parse(await readFile(inPath, 'utf8'));
const res = bb.resolution || { width: 64, height: 64 };
const boxUvGlobal = !!bb.meta?.box_uv;
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// index elements by uuid; keep only cubes
const elements = new Map();
let meshSkipped = 0;
for (const el of bb.elements || []) {
  if (el.type && el.type !== 'cube') { meshSkipped++; continue; }
  elements.set(el.uuid, el);
}
if (meshSkipped) console.warn(`[warn] skipped ${meshSkipped} non-cube (mesh) element(s) — Sproutlands is box-only`);

// ---------------------------------------------------------------- scale/frame
// bounding box over all cube corners -> scale to target height, feet at y=0,
// centered on x/z.
let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (const el of elements.values()) {
  const f = el.from, t = el.to;
  minX = Math.min(minX, f[0], t[0]); maxX = Math.max(maxX, f[0], t[0]);
  minY = Math.min(minY, f[1], t[1]); maxY = Math.max(maxY, f[1], t[1]);
  minZ = Math.min(minZ, f[2], t[2]); maxZ = Math.max(maxZ, f[2], t[2]);
}
const heightPx = Math.max(1e-6, maxY - minY);
const scale = targetHeight / heightPx;
const ctrX = (minX + maxX) / 2, ctrZ = (minZ + maxZ) / 2;
const P = (p) => [ (p[0] - ctrX) * scale, (p[1] - minY) * scale, (p[2] - ctrZ) * scale ];
const round = (n) => Math.round(n * 1e5) / 1e5;

// ---------------------------------------------------------------- uv
const FACES = ['north', 'east', 'south', 'west', 'up', 'down'];
function perFaceUV(el) {
  const uv = {};
  for (const dir of FACES) {
    const face = el.faces?.[dir];
    if (!face || !face.uv) continue;
    const [x1, y1, x2, y2] = face.uv;
    uv[dir] = [round(x1), round(y1), round(x2 - x1), round(y2 - y1)]; // [px,py,pw,ph], signed keeps mirroring
  }
  return uv;
}
function boxUV(el) {
  // classic Minecraft box-UV net from uv_offset + pixel sizes
  const [uo, vo] = el.uv_offset || [0, 0];
  const dx = Math.abs(el.to[0] - el.from[0]);
  const dy = Math.abs(el.to[1] - el.from[1]);
  const dz = Math.abs(el.to[2] - el.from[2]);
  return {
    up:    [uo + dz, vo, dx, dz],
    down:  [uo + dz + dx, vo, dx, dz],
    east:  [uo, vo + dz, dz, dy],
    north: [uo + dz, vo + dz, dx, dy],
    west:  [uo + dz + dx, vo + dz, dz, dy],
    south: [uo + dz + dx + dz, vo + dz, dx, dy],
  };
}

// ---------------------------------------------------------------- parts
const parts = [];
const usedIds = new Set();
const boneOfPart = new Map(); // bbmodel group uuid -> sproutlands part id
const uniq = (base) => { let n = base || 'part', i = 2; while (usedIds.has(n)) n = `${base}_${i++}`; usedIds.add(n); return n; };

const rot3 = (r) => invert ? [-num(r[0]), -num(r[1]), num(r[2])] : [num(r[0]), num(r[1]), num(r[2])];
const isRot = (r) => Array.isArray(r) && r.some((v) => num(v) !== 0);

function makeBox(el) {
  const from = P(el.from);
  const size = [ Math.abs(el.to[0] - el.from[0]) * scale, Math.abs(el.to[1] - el.from[1]) * scale, Math.abs(el.to[2] - el.from[2]) * scale ];
  // clamp to the loader's 0 < size <= 3 rule (defensive; scaling usually keeps us well under)
  const clamp = (v) => Math.min(3, Math.max(0.02, round(v)));
  return { from: from.map(round), size: size.map(clamp), uv: (el.box_uv ?? boxUvGlobal) ? boxUV(el) : perFaceUV(el) };
}

// walk the outliner; groups -> parts, cubes -> boxes on their group's part,
// rotated cubes -> their own child part so the rotation is preserved.
function walk(node, parentPartId) {
  if (typeof node === 'string') {
    const el = elements.get(node);
    if (!el) return;
    attachCube(el, parentPartId);
    return;
  }
  const pid = uniq(snake(node.name || 'bone'));
  boneOfPart.set(node.uuid, pid);
  const part = { id: pid, boxes: [] };
  if (parentPartId) part.parent = parentPartId;
  part.pivot = P(node.origin || [ctrX, minY, ctrZ]).map(round);
  if (isRot(node.rotation)) part.rotation = rot3(node.rotation).map(round);
  parts.push(part);
  for (const child of node.children || []) walk(child, pid);
  // a group must ship at least one box; if it only held sub-groups, give it a
  // zero-visible-impact marker box (loader requires >=1 box per part)
  if (!part.boxes.length) part.boxes.push({ from: part.pivot.slice(), size: [0.02, 0.02, 0.02], uv: [0, 0, 1, 1] });
}

// attach a cube either as a box on partId, or as its own rotated child part
function attachCube(el, partId) {
  const host = parts.find((p) => p.id === partId);
  if (isRot(el.rotation)) {
    const sub = uniq(snake((el.name || 'cube') + '_r'));
    parts.push({ id: sub, parent: partId, pivot: P(el.origin || el.from).map(round), rotation: rot3(el.rotation).map(round), boxes: [makeBox(el)] });
  } else if (host) {
    host.boxes.push(makeBox(el));
  }
}
for (const node of bb.outliner || []) walk(node, null);

// any cube not referenced by the outliner -> dump onto a root part
const outlinerUuids = new Set();
(function collect(n) { if (typeof n === 'string') outlinerUuids.add(n); else (n.children || []).forEach(collect); })({ children: bb.outliner || [] });
const orphan = [...elements.values()].filter((el) => !outlinerUuids.has(el.uuid));
if (orphan.length) {
  const rootId = uniq('loose');
  const rp = { id: rootId, pivot: [0, 0, 0], boxes: [] };
  parts.push(rp);
  for (const el of orphan) { if (isRot(el.rotation)) attachCube(el, rootId); else rp.boxes.push(makeBox(el)); }
  if (!rp.boxes.length) rp.boxes.push({ from: [0, 0, 0], size: [0.02, 0.02, 0.02], uv: [0, 0, 1, 1] });
}

// ---------------------------------------------------------------- texture
const tex0 = (bb.textures || [])[0];
if (!tex0 || !tex0.source) { console.error('[error] no embedded texture found (textures[0].source)'); process.exit(1); }
const dataUri = tex0.source.startsWith('data:') ? tex0.source : `data:image/png;base64,${tex0.source}`;
const texture = { dataUri, width: res.width, height: res.height };
if ((bb.textures || []).length > 1) console.warn(`[warn] ${bb.textures.length} textures — only the first ("${tex0.name}") is used (Sproutlands mobs carry one skin)`);

// ---------------------------------------------------------------- animations
function canonical(name) {
  const n = name.toLowerCase();
  if (/holding/.test(n)) return null; // skip "..._holding" variants
  if (/(^|[._])walk|move|run/.test(n)) return 'walk';
  if (/idle|inactive|default|stand/.test(n)) return 'idle';
  if (/attack|grab|bite|hit|shoot|cry|slam|punch/.test(n)) return 'attack';
  return null;
}
const anims = {};
for (const a of bb.animations || []) {
  const slot = canonical(a.name || '');
  if (!slot || anims[slot]) continue;
  const partsAnim = {};
  let maxT = 0;
  for (const [boneUuid, animr] of Object.entries(a.animators || {})) {
    const pid = boneOfPart.get(boneUuid);
    if (!pid) continue;
    const chans = {};
    for (const kf of animr.keyframes || []) {
      const dp = (kf.data_points || [])[0] || {};
      const t = num(kf.time);
      maxT = Math.max(maxT, t);
      const val = [num(dp.x), num(dp.y), num(dp.z)];
      if (kf.channel === 'rotation') {
        const r = invert ? [-val[0], -val[1], val[2]] : val;
        (chans.rotate ||= []).push([round(t), r.map(round)]);
      } else if (kf.channel === 'position') {
        (chans.translate ||= []).push([round(t), val.map((v) => round(v * scale))]);
      }
    }
    for (const k of ['rotate', 'translate']) if (chans[k]) chans[k].sort((p, q) => p[0] - q[0]);
    if (chans.rotate || chans.translate) partsAnim[pid] = chans;
  }
  const lenRaw = num(a.length);
  const length = lenRaw > 0 ? lenRaw : Math.max(maxT, 1);
  anims[slot] = { length: round(length), loop: a.loop !== 'once', parts: partsAnim };
}

// ---------------------------------------------------------------- stats + emit
const stats = {
  hp: +(opt.hp || 30), atk: +(opt.atk || 5), speed: +(opt.speed || 2),
  behavior: opt.behavior || 'defensive', tier: +(opt.tier || 0), xp: +(opt.xp || 20),
  desc: `Imported from Blockbench (${bb.meta?.model_format || 'generic'}).`,
};
const mob = {
  format: 'mob', version: 1, id,
  label: opt.label || bb.model_identifier || bb.name || id,
  parts, texture, stats, drops: [],
  animations: anims,
  _source: { tool: 'bbmodel-to-mob', bbmodel: basename(inPath), model_format: bb.meta?.model_format, targetHeight },
};

await writeFile(outPath, JSON.stringify(mob, null, 2));
console.log(`\n✔ wrote ${outPath}`);
console.log(`  id=${id}  parts=${parts.length}  boxes=${parts.reduce((n, p) => n + p.boxes.length, 0)}  height≈${targetHeight} blocks`);
console.log(`  animations: ${Object.keys(anims).map((k) => `${k}(${anims[k].length}s)`).join(', ') || '(none matched idle/walk/attack)'}`);
if (invert) console.log('  (rotations inverted for bedrock/geckolib handedness)');
