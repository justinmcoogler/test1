// Snap remade mob geometry onto the Minecraft model grid.
//
// Rewrites the numeric arrays in js/game/mobremakes/batch_*.js in place, leaving
// every comment, paint() body and structural line untouched. Rules applied (see
// js/game/mobremakes/mcmodel.js for the reasoning):
//   * every offset and size lands on a whole pixel (1/16 block)
//   * the structural box of a limb is at least 3x3 px in cross-section and 4 px
//     long; body/head core boxes are at least 4 px on every axis; detail boxes
//     (horns, ears, beaks) may stay 1 px, exactly as in vanilla
//   * a creature that stood on the ground still stands on it after snapping
//     (floaters that deliberately hover keep their offset)
// Usage: node tools/mc-grid-mobs.mjs [--write] [file...]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = args.length ? args
  : readdirSync('js/game/mobremakes').filter((f) => f.startsWith('batch_')).map((f) => `js/game/mobremakes/${f}`);

const P = 16;
const toPx = (v) => v * P;
const fromPx = (v) => {
  const b = v / P;
  return Number.isInteger(b) ? String(b) : String(+b.toFixed(4));
};
const isLimb = (id) => /^(leg|arm|bleg|fleg|wing)/.test(id || '');
const isCore = (id) => /^(body|head|torso)$/.test(id || '');

const NUMS = (s) => s.split(',').map((t) => parseFloat(t));

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  // ---- pass 1: read the current geometry, grouped by mob ----------------
  let mob = null, partId = null, boxIdx = 0;
  const rec = [];                                   // {line, kind, from, size, mob, partId, boxIdx}
  const mobMinY = new Map();
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const mMob = L.match(/^ {2}([a-z_0-9]+):\s*\{/);
    if (mMob) { mob = mMob[1]; partId = null; }
    const mPart = L.match(/id:\s*'([a-z_0-9]+)'/);
    if (mPart) { partId = mPart[1]; boxIdx = 0; }
    const mBox = L.match(/from:\s*\[([^\]]+)\]\s*,\s*size:\s*\[([^\]]+)\]/);
    if (mBox && mob) {
      const from = NUMS(mBox[1]), size = NUMS(mBox[2]);
      rec.push({ i, kind: 'box', from, size, mob, partId, boxIdx: boxIdx++ });
      const y = from[1];
      if (!mobMinY.has(mob) || y < mobMinY.get(mob)) mobMinY.set(mob, y);
    }
    const mPiv = L.match(/pivot:\s*\[([^\]]+)\]/);
    if (mPiv && mob) rec.push({ i, kind: 'pivot', v: NUMS(mPiv[1]), mob, partId });
  }

  // ---- pass 2: snap, enforce thickness, then re-ground ------------------
  // grounded mobs (min y ~ 0) must still touch y=0 after snapping; hoverers keep
  // whatever gap they were designed with.
  const snapped = new Map();                        // mob -> new min y (px)
  for (const r of rec) {
    if (r.kind !== 'box') continue;
    const f = r.from.map((v) => Math.round(toPx(v)));
    const s = r.size.map((v) => Math.max(1, Math.round(toPx(v))));
    if (r.boxIdx === 0 && isLimb(r.partId)) {
      s[0] = Math.max(3, s[0]); s[2] = Math.max(3, s[2]); s[1] = Math.max(4, s[1]);
    } else if (r.boxIdx === 0 && isCore(r.partId)) {
      for (let k = 0; k < 3; k++) s[k] = Math.max(4, s[k]);
    }
    r.pxFrom = f; r.pxSize = s;
    const y = f[1];
    if (!snapped.has(r.mob) || y < snapped.get(r.mob)) snapped.set(r.mob, y);
  }
  const shift = new Map();
  for (const [m, origMinY] of mobMinY) {
    const wasGrounded = Math.abs(origMinY) < 0.05;
    shift.set(m, wasGrounded ? -(snapped.get(m) || 0) : 0);
  }

  // ---- pass 3: write the numbers back ----------------------------------
  let changed = 0;
  for (const r of rec) {
    const dy = shift.get(r.mob) || 0;
    if (r.kind === 'box') {
      const f = [...r.pxFrom]; f[1] += dy;
      const out = `from: [${f.map(fromPx).join(', ')}], size: [${r.pxSize.map(fromPx).join(', ')}]`;
      const next = lines[r.i].replace(/from:\s*\[[^\]]+\]\s*,\s*size:\s*\[[^\]]+\]/, out);
      if (next !== lines[r.i]) { lines[r.i] = next; changed++; }
    } else {
      const v = r.v.map((x) => Math.round(toPx(x)));
      v[1] += dy;
      const out = `pivot: [${v.map(fromPx).join(', ')}]`;
      const next = lines[r.i].replace(/pivot:\s*\[[^\]]+\]/, out);
      if (next !== lines[r.i]) { lines[r.i] = next; changed++; }
    }
  }

  const result = lines.join('\n');
  console.log(`${file}: ${rec.length} arrays, ${changed} rewritten`);
  if (WRITE && result !== src) writeFileSync(file, result);
}
