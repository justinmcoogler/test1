// Loader for custom creature files ("mob" JSON, v1).
// A mob file bundles: box-model parts with per-face texture UVs, an embedded
// 64×64 skin texture, keyframed part animations (idle/walk/attack), combat
// stats, drops, and optional world-spawn rules. See docs/MOB_FORMAT.md.
import { ENEMY_TYPES } from './enemies.js';
import { BIOMES } from '../world/worldgen.js';
import { ITEMS } from './items.js';

import { mat4Identity, mat4Multiply } from '../core/math.js';

const loadedMobs = new Map(); // id → parsed mob (renderer registration deferred)

// ---------------------------------------------------------------- validation
function fail(id, msg) { throw new Error(`mob "${id}": ${msg}`); }

export function parseMobFile(json) {
  const id = json.id || '?';
  if (json.format !== 'mob') fail(id, 'format must be "mob"');
  if (json.version !== 1) fail(id, `unsupported version ${json.version}`);
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(json.id || '')) fail(id, 'id must be snake_case, 3-32 chars');
  if (ENEMY_TYPES[json.id] && !loadedMobs.has(json.id)) fail(id, 'id collides with a built-in creature');
  if (!Array.isArray(json.parts) || !json.parts.length) fail(id, 'needs at least one part');
  if (json.parts.length > 24) fail(id, 'too many parts (max 24)');
  const partIds = new Set();
  let boxCount = 0;
  for (const p of json.parts) {
    if (!p.id || partIds.has(p.id)) fail(id, `part id missing/duplicate: ${p.id}`);
    partIds.add(p.id);
    if (p.parent && !json.parts.some((q) => q.id === p.parent)) fail(id, `part ${p.id} has unknown parent`);
    // a part may carry no boxes — a bare locator/root used only as an animation
    // pivot (common in exported rigs). It just contributes no geometry.
    if (!Array.isArray(p.boxes)) fail(id, `part ${p.id}: boxes must be an array`);
    if (p.rotation !== undefined && (!Array.isArray(p.rotation) || p.rotation.length !== 3 || p.rotation.some((v) => typeof v !== 'number'))) {
      fail(id, `part ${p.id}: rotation must be [x,y,z] degrees`);
    }
    boxCount += p.boxes.length;
    for (const b of p.boxes) {
      if (!Array.isArray(b.from) || b.from.length !== 3) fail(id, `part ${p.id}: box.from must be [x,y,z]`);
      if (!Array.isArray(b.size) || b.size.length !== 3 || b.size.some((v) => v <= 0 || v > 3)) {
        fail(id, `part ${p.id}: box.size must be 3 positive numbers ≤ 3`);
      }
    }
  }
  if (boxCount > 64) fail(id, 'too many boxes (max 64 total)');
  if (boxCount === 0) fail(id, 'needs at least one box somewhere');
  const tex = json.texture || {};
  if (!tex.rgbaBase64 && !tex.dataUri && !tex.file) fail(id, 'texture needs rgbaBase64, dataUri, or file');
  if (tex.rgbaBase64 && (!(tex.width > 0) || !(tex.height > 0))) fail(id, 'rgbaBase64 textures need width and height');
  if ((tex.width || 0) > 1024 || (tex.height || 0) > 1024) fail(id, 'texture larger than 1024px');
  const stats = json.stats || {};
  for (const k of ['hp', 'atk', 'speed']) {
    if (typeof stats[k] !== 'number') fail(id, `stats.${k} required (number)`);
  }
  for (const d of json.drops || []) {
    if (!ITEMS[d.item]) fail(id, `drop references unknown item "${d.item}"`);
  }
  for (const b of json.spawn?.biomes || []) {
    if (!BIOMES[b]) fail(id, `spawn references unknown biome "${b}"`);
  }
  const sp = json.spawn || {};
  if (sp.packSize !== undefined) {
    if (!Array.isArray(sp.packSize) || sp.packSize.length !== 2 ||
        sp.packSize.some((v) => !Number.isInteger(v) || v < 1 || v > 4) || sp.packSize[0] > sp.packSize[1]) {
      fail(id, 'spawn.packSize must be [min,max] integers between 1 and 4');
    }
  }
  if (sp.nightOnly !== undefined && typeof sp.nightOnly !== 'boolean') fail(id, 'spawn.nightOnly must be a boolean');
  if (stats.shinyChance !== undefined && !(stats.shinyChance >= 0 && stats.shinyChance <= 0.2)) {
    fail(id, 'stats.shinyChance must be between 0 and 0.2');
  }
  for (const [name, anim] of Object.entries(json.animations || {})) {
    if (!(anim.length > 0)) fail(id, `animation "${name}" needs length > 0 seconds`);
    for (const [pid, ch] of Object.entries(anim.parts || {})) {
      if (!partIds.has(pid)) fail(id, `animation "${name}" animates unknown part "${pid}"`);
      for (const key of ['rotate', 'translate']) {
        for (const kf of ch[key] || []) {
          if (!Array.isArray(kf) || kf.length !== 2 || !Array.isArray(kf[1]) || kf[1].length !== 3) {
            fail(id, `animation "${name}" part "${pid}" ${key}: keyframes are [timeSec, [x,y,z]]`);
          }
        }
      }
    }
  }
  return json;
}

// ---------------------------------------------------------------- texture
// Each mob carries its own full-color texture (e.g. AI-generated PNGs).
// Any size up to 1024² is accepted and stored at up to 256² on the GPU.
async function decodeTexture(tex, baseUrl = 'mobs/') {
  if (tex.rgbaBase64) {
    const bin = atob(tex.rgbaBase64);
    const w = tex.width, h = tex.height;
    if (bin.length !== w * h * 4) throw new Error(`rgbaBase64 must decode to ${w * h * 4} bytes (${w}×${h}), got ${bin.length}`);
    const data = new Uint8ClampedArray(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
    return { canvas: c, srcW: w, srcH: h };
  }
  const img = new Image();
  const src = tex.dataUri || (baseUrl + tex.file);
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error(`texture failed to decode (${tex.file || 'dataUri'})`));
    img.src = src;
  });
  const srcW = tex.width || img.naturalWidth, srcH = tex.height || img.naturalHeight;
  // keep GPU copy ≤ 512² so detailed 64×-per-block skins survive; still cheap to mip
  const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = scale < 1; // average down large AI images, keep pixel art crisp
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { canvas: c, srcW, srcH };
}

// face uv [px, py, pw, ph] in the SOURCE image's pixel space → 0..1 rect
function faceRect(spec, srcW, srcH, storeW, storeH) {
  const [px, py, pw, ph] = spec;
  const insetU = 0.35 / storeW, insetV = 0.35 / storeH; // prevents bleed at mip edges
  return {
    u0: px / srcW + insetU, v0: py / srcH + insetV,
    u1: (px + pw) / srcW - insetU, v1: (py + ph) / srcH - insetV,
  };
}

const FACE_KEYS = { up: 'top', down: 'bottom', south: 'south', north: 'north', east: 'east', west: 'west' };

// ---------------------------------------------------------------- registration
export async function registerMob(game, json) {
  const mob = parseMobFile(json);
  const { canvas, srcW, srcH } = await decodeTexture(mob.texture);
  const glTexture = game.renderer.createMobTexture(canvas);

  // convert parts → renderer boxes with UVs normalized to the mob's own texture
  const parts = mob.parts.map((p) => ({
    id: p.id,
    parent: p.parent || null,
    pivot: p.pivot || [0, 0, 0],
    rotation: p.rotation || null, // static rest rotation (deg), composed with animation
    boxes: p.boxes.map((b) => {
      const box = {
        x: b.from[0], y: b.from[1], z: b.from[2],
        w: b.size[0], h: b.size[1], d: b.size[2],
        color: b.color || [1, 1, 1],
        uv: {},
      };
      const uvSpec = b.uv || [0, 0, srcW, srcH];
      if (Array.isArray(uvSpec)) {
        for (const face of Object.values(FACE_KEYS)) box.uv[face] = faceRect(uvSpec, srcW, srcH, canvas.width, canvas.height);
      } else {
        for (const [key, face] of Object.entries(FACE_KEYS)) {
          box.uv[face] = faceRect(uvSpec[key] || uvSpec.all || [0, 0, srcW, srcH], srcW, srcH, canvas.width, canvas.height);
        }
      }
      return box;
    }),
  }));
  game.renderer.registerAnimatedModel(mob.id, parts, mob.animations || {}, glTexture);

  // register as a creature
  const s = mob.stats;
  ENEMY_TYPES[mob.id] = {
    label: mob.label || mob.id,
    behavior: s.behavior || 'defensive',
    tier: s.tier ?? 0,
    hp: s.hp, atk: s.atk, acc: s.acc ?? 60, evasion: s.evasion ?? 8,
    armor: s.armor ?? 0, speed: s.speed, moveRange: s.moveRange ?? 3,
    ranged: !!s.ranged, range: s.range,
    abilities: [], element: s.element || null,
    weak: s.weak || [], resist: s.resist || [],
    xp: s.xp ?? 20, huntXp: s.huntXp, respawn: s.respawn ?? 120,
    aggroRange: s.behavior === 'aggressive' ? (s.aggroRange ?? 5) : (s.aggroRange ?? 0),
    drops: (mob.drops || []).map((d) => ({ item: d.item, qty: d.qty || [1, 1], chance: d.chance ?? 1 })),
    desc: s.desc || 'A custom creature of the veil.',
    recommend: s.recommend || '',
    nocturnal: !!mob.spawn?.nightOnly,
    shinyChance: s.shinyChance,
    model: parts.flatMap((p) => p.boxes), // static fallback (tactical placement etc.)
    skin: 'skin_solid',
    custom: true,
  };
  loadedMobs.set(mob.id, mob);
  return ENEMY_TYPES[mob.id];
}

// Spawn-rule injection must run BEFORE world/chunk generation.
export function injectSpawnRules(json) {
  const mob = json;
  for (const biome of mob.spawn?.biomes || []) {
    const list = BIOMES[biome].enemies;
    if (!list.some((e) => e.type === mob.id)) {
      list.push({ type: mob.id, d: mob.spawn.density ?? 0.002, pack: mob.spawn.packSize });
    }
  }
}

// Fetch mobs/manifest.json and parse every listed file. Non-fatal on any miss
// (the single-file build has no mobs directory).
export async function fetchMobFiles() {
  // single-file builds embed mob JSON directly
  if (typeof window !== 'undefined' && Array.isArray(window.__EMBEDDED_MOBS)) {
    const out = [];
    for (const json of window.__EMBEDDED_MOBS) {
      try { parseMobFile(json); out.push(json); }
      catch (e) { console.error('[mobs] embedded mob invalid:', e.message); }
    }
    return out;
  }
  try {
    const res = await fetch('mobs/manifest.json');
    if (!res.ok) return [];
    const list = await res.json();
    const out = [];
    for (const file of list) {
      try {
        const r = await fetch(`mobs/${file}`);
        const json = await r.json();
        parseMobFile(json);
        out.push(json);
      } catch (e) {
        console.error(`[mobs] failed to load ${file}:`, e.message);
      }
    }
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- animation
const DEG = Math.PI / 180;

function sampleChannel(keys, t, fallback) {
  if (!keys || !keys.length) return fallback;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return [v0[0] + (v1[0] - v0[0]) * f, v0[1] + (v1[1] - v0[1]) * f, v0[2] + (v1[2] - v0[2]) * f];
    }
  }
  return keys[keys.length - 1][1];
}

function poseMatrix(pivot, rotDeg, trans) {
  // T(pivot+trans) · Rz · Ry · Rx · T(-pivot)
  const [px, py, pz] = pivot;
  const [rx, ry, rz] = [rotDeg[0] * DEG, rotDeg[1] * DEG, rotDeg[2] * DEG];
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz·Ry·Rx (column-major)
  const r00 = cz * cy, r01 = cz * sy * sx - sz * cx, r02 = cz * sy * cx + sz * sx;
  const r10 = sz * cy, r11 = sz * sy * sx + cz * cx, r12 = sz * sy * cx - cz * sx;
  const r20 = -sy, r21 = cy * sx, r22 = cy * cx;
  const m = new Float32Array(16);
  m[0] = r00; m[1] = r10; m[2] = r20; m[3] = 0;
  m[4] = r01; m[5] = r11; m[6] = r21; m[7] = 0;
  m[8] = r02; m[9] = r12; m[10] = r22; m[11] = 0;
  m[12] = px + trans[0] - (r00 * px + r01 * py + r02 * pz);
  m[13] = py + trans[1] - (r10 * px + r11 * py + r12 * pz);
  m[14] = pz + trans[2] - (r20 * px + r21 * py + r22 * pz);
  m[15] = 1;
  return m;
}

// Evaluate an animation at time t → { partId: mat4 } with parent chains applied.
export function evaluatePose(model, animName, t) {
  const anim = model.animations[animName] || model.animations.idle || null;
  // with no animation we still emit a rest pose so any static part rotations
  // (Blockbench bone/cube rotations) show; parts without one collapse to identity.
  const hasStatic = !anim && model.parts.some((p) => p.rotation);
  if (!anim && !hasStatic) return null;
  const local = {};
  const tt = anim ? (anim.loop === false ? Math.min(t, anim.length) : t % anim.length) : 0;
  for (const part of model.parts) {
    const ch = anim?.parts?.[part.id];
    const rot = sampleChannel(ch?.rotate, tt, [0, 0, 0]);
    const trans = sampleChannel(ch?.translate, tt, [0, 0, 0]);
    // a part's rest rotation (from Blockbench bones / baked cube rotations) is
    // added to the animated rotation, matching Blockbench's additive semantics
    const base = part.rotation;
    const rotFull = base ? [rot[0] + base[0], rot[1] + base[1], rot[2] + base[2]] : rot;
    local[part.id] = poseMatrix(part.pivot, rotFull, trans);
  }
  const world = {};
  const resolve = (part) => {
    if (world[part.id]) return world[part.id];
    const own = local[part.id];
    if (!part.parent) { world[part.id] = own; return own; }
    const parent = model.parts.find((p) => p.id === part.parent);
    const m = new Float32Array(16);
    mat4Multiply(m, resolve(parent), own);
    world[part.id] = m;
    return m;
  };
  for (const part of model.parts) resolve(part);
  return world;
}

export function animationNamesFor(model) {
  return Object.keys(model.animations || {});
}
