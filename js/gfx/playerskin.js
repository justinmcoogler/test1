// Player skin builder — dresses the blocky adventurer in whatever armour and
// weapons are equipped, Minecraft-skin style.
//
// The player model is one animated model with ONE texture (its "skin"): a
// 96×64 canvas laid out as a standard 64×64 humanoid UV cross plus a 32-wide
// strip for the held weapon/shield. Each body box maps its six faces into the
// cross via partBoxUV(); the renderer samples the skin per-face (texture ×
// face-brightness), so equipping iron armour makes the body read as iron, and
// holding a sword shows that sword in-hand.
//
// Real art (Batch P in docs/TEXTURES.md — skin_player_base + skin_armor_<mat>,
// 64×64 UV) overrides the procedural look when the PNGs are present: call
// preloadPlayerSkins() once, then rebuild. Until then the procedural fallback
// colours each body part by its material so the feature works with zero art.
import { TEXPACK_SKINS } from './texpack.js';

export const SKIN_W = 96, SKIN_H = 64;      // 64×64 humanoid + 32-wide gear strip
const FACES = ['top', 'bottom', 'south', 'north', 'east', 'west'];

// Standard Minecraft 64×64 per-cuboid face rects [px, py, pw, ph]. Our boxes use
// MC proportions (head 8³, torso 8×12×4, arms/legs 4×12×4) so this maps 1:1.
// south = front (+Z, the face), north = back, east = +X, west = −X.
export const PART_UV = {
  head:  { top: [8, 0, 8, 8], bottom: [16, 0, 8, 8], east: [0, 8, 8, 8], south: [8, 8, 8, 8], west: [16, 8, 8, 8], north: [24, 8, 8, 8] },
  body:  { top: [20, 16, 8, 4], bottom: [28, 16, 8, 4], east: [16, 20, 4, 12], south: [20, 20, 8, 12], west: [28, 20, 4, 12], north: [32, 20, 8, 12] },
  arm_r: { top: [44, 16, 4, 4], bottom: [48, 16, 4, 4], east: [40, 20, 4, 12], south: [44, 20, 4, 12], west: [48, 20, 4, 12], north: [52, 20, 4, 12] },
  arm_l: { top: [36, 48, 4, 4], bottom: [40, 48, 4, 4], east: [32, 52, 4, 12], south: [36, 52, 4, 12], west: [40, 52, 4, 12], north: [44, 52, 4, 12] },
  leg_r: { top: [4, 16, 4, 4], bottom: [8, 16, 4, 4], east: [0, 20, 4, 12], south: [4, 20, 4, 12], west: [8, 20, 4, 12], north: [12, 20, 4, 12] },
  leg_l: { top: [20, 48, 4, 4], bottom: [24, 48, 4, 4], east: [16, 52, 4, 12], south: [20, 52, 4, 12], west: [24, 52, 4, 12], north: [28, 52, 4, 12] },
};
// bounding box of each part's whole UV cross (for copying a part out of a wrap)
const PART_BOUNDS = {
  head: [0, 0, 32, 16], body: [16, 16, 24, 16], arm_r: [40, 16, 16, 16],
  arm_l: [32, 48, 16, 16], leg_r: [0, 16, 16, 16], leg_l: [16, 48, 16, 16],
};
// Held gear renders as real 3D geometry (built in main.js) rather than a flat
// icon, so it reads as a weapon from every angle and has no transparent border.
// The geometry is coloured through the same one skin texture via these solid
// swatches painted into the gear strip (x ≥ 64).
const SWATCH = {
  blade: [64, 0, 16, 16], grip: [80, 0, 16, 16], shield: [64, 16, 16, 16], rim: [80, 16, 16, 16],
};

// which armour slot dresses which body parts
const SLOT_PARTS = { head: ['head'], body: ['body', 'arm_l', 'arm_r'], legs: ['leg_l', 'leg_r'], feet: ['leg_l', 'leg_r'] };

// wrap materials we render (skin_armor_<mat>); 'woven' gear → the cloth wrap
const WRAP_MATS = new Set(['hide', 'cloth', 'bronze', 'copper', 'iron', 'steel', 'damascus', 'meteoric']);
export function materialOf(itemId) {
  if (!itemId) return null;
  let fam = itemId.split('_')[0];
  if (fam === 'woven') fam = 'cloth';
  return WRAP_MATS.has(fam) ? fam : 'armor'; // unknown armour → neutral plate
}

// Per-part material name for the CURRENT equipment (pure — unit-tested).
// A base_* value means "no armour on this part" (bare body colour).
export function partMaterials(equipment = {}) {
  const slotMat = (slot) => materialOf(equipment[slot]?.item);
  const body = slotMat('body');
  const legs = slotMat('legs') || slotMat('feet');
  return {
    head: slotMat('head') || 'base_head',
    body: body || 'base_body',
    arm_l: body || 'base_arm', arm_r: body || 'base_arm',
    leg_l: legs || 'base_leg', leg_r: legs || 'base_leg',
  };
}

// ---- UV helpers (0..1, with a tiny inset to stop mip bleed) ------------------
function uvRect([px, py, pw, ph]) {
  const iu = 0.35 / SKIN_W, iv = 0.35 / SKIN_H;
  return { u0: px / SKIN_W + iu, v0: py / SKIN_H + iv, u1: (px + pw) / SKIN_W - iu, v1: (py + ph) / SKIN_H - iv };
}
export function partBoxUV(part) {
  const r = PART_UV[part]; const out = {};
  for (const f of FACES) out[f] = uvRect(r[f]);
  return out;
}
function rectBoxUV(rect) { const out = {}; for (const f of FACES) out[f] = uvRect(rect); return out; }
export function swatchUV(name) { return rectBoxUV(SWATCH[name]); }

// Colour for a held weapon/shield by its material family: metal gear takes the
// armour-metal tone, bows/hafts/bone go wood-brown, and the two special blades
// keep their signature glow.
const WOOD_LIKE = new Set(['ash', 'hickory', 'oak', 'yew', 'lignum', 'thornwood', 'recurve', 'wooden', 'boneshard', 'timber']);
export function gearColor(itemId) {
  const fam = (itemId || '').split('_')[0];
  if (fam === 'frostbrand') return '#8fd0e8';
  if (fam === 'ember') return '#d8702a';
  if (WRAP_MATS.has(fam)) return COL[fam];
  if (WOOD_LIKE.has(fam)) return '#6b4a2c';
  return '#9aa0a6'; // firearms + anything else → steel-grey
}

// ---- procedural palette (fallback until real 64×64 art is dropped in) --------
const COL = {
  base_head: '#c8a07a', base_body: '#3f7d55', base_arm: '#3f7d55', base_leg: '#4b4038', base_boot: '#2f2620',
  hide: '#8a6a42', cloth: '#6a5a8a', bronze: '#b07a3c', copper: '#b5652f',
  iron: '#9aa0a6', steel: '#c3ccd4', damascus: '#585d68', meteoric: '#4a3f63', armor: '#8a8f96',
};

// ---- real-art cache (data URIs → Image), populated by preloadPlayerSkins ------
const SKIN_IMG = new Map();
export async function preloadPlayerSkins() {
  const entries = Object.entries(TEXPACK_SKINS || {});
  await Promise.all(entries.map(([k, uri]) => new Promise((res) => {
    const img = new Image();
    img.onload = () => { SKIN_IMG.set(k, img); res(); };
    img.onerror = () => res();
    img.src = uri;
  })));
  return SKIN_IMG.size;
}
export function hasPlayerArt() { return SKIN_IMG.size > 0; }

// ---- the canvas (browser only — creates a canvas) ---------------------------
function fillFace(ctx, rect, hex) {
  const [px, py, pw, ph] = rect;
  ctx.fillStyle = hex; ctx.fillRect(px, py, pw, ph);
}
function shadeEdge(ctx, rect) { // 1px darker top+left for a little voxel definition
  const [px, py, pw, ph] = rect;
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(px, py, pw, 1); ctx.fillRect(px, py, 1, ph);
}
function drawFace(ctx, rect) { // eyes + mouth on the head front
  const [px, py] = rect;
  ctx.fillStyle = '#2a2320';
  ctx.fillRect(px + 1, py + 3, 2, 2); ctx.fillRect(px + 5, py + 3, 2, 2);
  ctx.fillStyle = '#7a5b48'; ctx.fillRect(px + 3, py + 5, 2, 1);
}
function bootBand(ctx, part, hex) { // boots = lower band of the leg faces + sole
  for (const f of ['south', 'north', 'east', 'west']) {
    const [px, py, pw, ph] = PART_UV[part][f];
    ctx.fillStyle = hex; ctx.fillRect(px, py + ph - 5, pw, 5);
  }
  fillFace(ctx, PART_UV[part].bottom, hex);
}

function proceduralBase(ctx, mats) {
  for (const part of Object.keys(PART_UV)) {
    const hex = COL[mats[part]] || COL.armor;
    for (const f of FACES) { fillFace(ctx, PART_UV[part][f], hex); shadeEdge(ctx, PART_UV[part][f]); }
  }
  if (mats.head === 'base_head') drawFace(ctx, PART_UV.head.south);
}

// Build the player's skin canvas for the given equipment. Real art wins per
// layer; otherwise the procedural palette dresses each part by material.
export function buildPlayerSkinCanvas(equipment = {}) {
  const c = document.createElement('canvas');
  c.width = SKIN_W; c.height = SKIN_H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, SKIN_W, SKIN_H);
  const mats = partMaterials(equipment);

  // 1) base body
  const baseImg = SKIN_IMG.get('skin_player_base');
  if (baseImg) ctx.drawImage(baseImg, 0, 0, 64, 64);
  else proceduralBase(ctx, mats);

  // The face belongs on the FRONT of the head only. The base art carried eyes on
  // the back too, so the adventurer looked two-faced — copy a plain side of the
  // head over the back region to wipe any face there. (A helmet, drawn next,
  // covers the whole head anyway; this only shows on the bare default skin.)
  if (mats.head === 'base_head' || mats.head === undefined) {
    const [wx, wy, ww, wh] = PART_UV.head.west;   // plain side of the head
    const [nx, ny] = PART_UV.head.north;          // back of the head
    ctx.drawImage(c, wx, wy, ww, wh, nx, ny, ww, wh);
  }

  // 2) armour, drawn over the base per slot (legs → feet → body → head)
  for (const slot of ['legs', 'feet', 'body', 'head']) {
    const it = equipment[slot]; if (!it) continue;
    const mat = materialOf(it.item);
    const wrap = SKIN_IMG.get(`skin_armor_${mat}`);
    if (slot === 'feet' && !wrap) { for (const p of SLOT_PARTS.feet) bootBand(ctx, p, COL[mat] || COL.armor); continue; }
    for (const part of SLOT_PARTS[slot]) {
      if (wrap) { const b = PART_BOUNDS[part]; ctx.drawImage(wrap, b[0], b[1], b[2], b[3], b[0], b[1], b[2], b[3]); }
      else if (!baseImg) { for (const f of FACES) { fillFace(ctx, PART_UV[part][f], COL[mat] || COL.armor); shadeEdge(ctx, PART_UV[part][f]); } }
    }
  }

  // 3) held-gear colour swatches — the 3D weapon/shield geometry (main.js) reads
  //    its material colour from these (the grip/rim are always dark).
  const weapon = equipment.main || equipment.ranged;
  fillFace(ctx, SWATCH.blade, weapon ? gearColor(weapon.item) : COL.armor);
  fillFace(ctx, SWATCH.grip, '#3b2a1c');
  if (equipment.off) { fillFace(ctx, SWATCH.shield, gearColor(equipment.off.item)); fillFace(ctx, SWATCH.rim, '#2a2018'); }
  return c;
}
