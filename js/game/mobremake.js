// Mob remake runtime — turns a remake definition (explicit parts + per-box UV
// islands into the creature's own painted texture) into a registered animated
// model. This is the native twin of the imported-mob path (mobloader.js): same
// per-face UV convention, same own-texture rendering, but the skin is painted
// in-engine by the def's paint() — or overridden by a real mob_<type>.png from
// the texture pack when one exists (image-gen replacement slot).
//
// A remake def:
//   { texW, texH,                  // skin canvas size (typically 64×64)
//     rig: 'quadruped'|...,        // movement style → buildPartAnimations
//     paint(ctx, P) {...},         // draws the skin (P = mobpaint kit)
//     animOverrides?: {...},       // optional per-anim keyframe overrides
//     parts: [{ id, parent?, pivot, rotation?, boxes: [
//        { from:[x,y,z], size:[w,h,d], color?,   // world units (blocks)
//          uv: [px,py,pw,ph] | {all?, up?, down?, north?, south?, east?, west?} }
//     ]}] }
// Part id conventions drive the rig: 'body' (required), 'head', 'tail',
// 'leg*' (walk cycle), 'arm*' (swing/attack).
import { makePainter } from '../gfx/mobpaint.js';
import { buildPartAnimations } from './rigs.js';
import { TEXPACK_MOBS } from '../gfx/texpack.js';

const FACE_KEYS = { up: 'top', down: 'bottom', south: 'south', north: 'north', east: 'east', west: 'west' };

function faceRect(spec, W, H) {
  const [px, py, pw, ph] = spec;
  const iu = 0.35 / W, iv = 0.35 / H; // inset stops mip bleed between islands
  return { u0: px / W + iu, v0: py / H + iv, u1: (px + pw) / W - iu, v1: (py + ph) / H - iv };
}

// def.parts → renderer parts with normalized per-face UVs
export function remakeParts(def) {
  return def.parts.map((p) => ({
    id: p.id, parent: p.parent || null, pivot: p.pivot || [0, 0, 0], rotation: p.rotation || null,
    boxes: p.boxes.map((b) => {
      const box = {
        x: b.from[0], y: b.from[1], z: b.from[2],
        w: b.size[0], h: b.size[1], d: b.size[2],
        color: b.color || [1, 1, 1], uv: {},
      };
      const spec = b.uv || [0, 0, def.texW, def.texH];
      if (Array.isArray(spec)) {
        for (const f of Object.values(FACE_KEYS)) box.uv[f] = faceRect(spec, def.texW, def.texH);
      } else {
        for (const [k, f] of Object.entries(FACE_KEYS)) {
          box.uv[f] = faceRect(spec[k] || spec.all || [0, 0, def.texW, def.texH], def.texW, def.texH);
        }
      }
      return box;
    }),
  }));
}

// Paint the def's own skin (browser only — creates a canvas).
export function paintRemakeSkin(type, def) {
  const c = document.createElement('canvas');
  c.width = def.texW; c.height = def.texH;
  const ctx = c.getContext('2d');
  def.paint(ctx, makePainter(ctx, `mob:${type}`));
  return c;
}

// ---- real-art overrides: assets/textures/mob_<type>.png → TEXPACK_MOBS ------
const MOB_IMG = new Map();
export async function preloadMobSkins() {
  const entries = Object.entries(TEXPACK_MOBS || {});
  await Promise.all(entries.map(([k, uri]) => new Promise((res) => {
    const img = new Image();
    img.onload = () => { MOB_IMG.set(k, img); res(); };
    img.onerror = () => res();
    img.src = uri;
  })));
  return MOB_IMG.size;
}
export function mobSkinOverride(type) { return MOB_IMG.get(`mob_${type}`) || null; }

// Build the skin canvas: pack override wins, else the painted default.
export function buildMobSkinCanvas(type, def) {
  const img = mobSkinOverride(type);
  if (!img) return paintRemakeSkin(type, def);
  const c = document.createElement('canvas');
  c.width = def.texW; c.height = def.texH;
  c.getContext('2d').drawImage(img, 0, 0, def.texW, def.texH);
  return c;
}

// (Re-)register one remade mob on the renderer. Safe to call again after a
// skin override loads — it replaces the model in place.
export function registerRemadeMob(renderer, type, def) {
  const tex = renderer.createMobTexture(buildMobSkinCanvas(type, def));
  // def.anims adds named clips (howl, graze, peck…) on top of the rig's
  // idle/walk/attack; def.animOverrides retunes what the rig already built.
  const extra = { ...(def.anims || {}), ...(def.animOverrides || {}) };
  const anims = buildPartAnimations(def.rig || 'lumberer', def.parts, Object.keys(extra).length ? extra : null);
  renderer.deleteModel(type);
  renderer.registerAnimatedModel(type, remakeParts(def), anims, tex);
  // ambient clips fire occasionally while the creature is idle — this is what
  // makes a wolf feel like a wolf rather than a walking box.
  const model = renderer.modelCache.get(type);
  if (model && def.ambient) model.ambient = def.ambient;
}
