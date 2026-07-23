// Bake the large circular town from a Sponge-v3 .schem into a compact, gzip'd
// palette grid the game streams at worldgen (js/world/town-data.js). Far too
// big for the manor's JS cell-array; instead we emit a dense Uint16 grid over
// the crop's bounding box (block id in bits 0-11, facing in bits 12-14), gzip
// it, and base64-embed it. The runtime inflates once and stamps chunks on demand.
//
//   node tools/bake-town.mjs <file.schem> <cx> <cz> <R> [out.js]
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapBlock } from './mc-block-map.mjs';
import { B, BLOCKS } from '../js/world/blocks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [file, cxs, czs, Rs, outArg] = process.argv.slice(2);
const cx = +cxs, cz = +czs, R = +Rs;
const OUT = outArg || path.join(ROOT, 'js/world/town-data.js');

// MC facing → our packed facing (bits 0-1 dir, bit 2 top half); only for oriented shapes.
const MC_FACE = { south: 0, east: 1, north: 2, west: 3 };
const ORIENTED = new Set(['stairs', 'slab', 'gate']);
function facingOf(rawId, shape) {
  if (!ORIENTED.has(shape)) return 0;
  let v = 0; const fm = /facing=(north|south|east|west)/.exec(rawId);
  if (fm) v |= MC_FACE[fm[1]];
  if (/(?:half|type)=top/.test(rawId)) v |= 4;
  return v;
}

// ---- NBT reader (Sponge v3: Schematic > Blocks > {Palette, Data}) ----------
let buf = fs.readFileSync(file); try { buf = zlib.gunzipSync(buf); } catch {}
let p = 0;
const u8 = () => buf[p++], u16 = () => { const v = buf.readUInt16BE(p); p += 2; return v; }, i16 = () => { const v = buf.readInt16BE(p); p += 2; return v; };
const i32 = () => { const v = buf.readInt32BE(p); p += 4; return v; }, str = () => { const n = u16(); const s = buf.toString('utf8', p, p + n); p += n; return s; };
let W, H, L, palette = {}, dataStart = 0, dataLen = 0;
function pl(t, name) {
  switch (t) {
    case 1: return u8(); case 2: { const v = i16(); if (name === 'Width') W = v; else if (name === 'Height') H = v; else if (name === 'Length') L = v; return v; }
    case 3: return i32(); case 4: p += 8; return 0; case 5: p += 4; return 0; case 6: p += 8; return 0;
    case 7: { const n = i32(); if (name === 'Data') { dataStart = p; dataLen = n; } p += n; return 0; }
    case 8: return str(); case 9: { const et = u8(); const n = i32(); for (let i = 0; i < n; i++) pl(et, name); return 0; }
    case 10: { const isPal = (name === 'Palette'); const o = {}; while (true) { const ct = u8(); if (ct === 0) break; const cn = str(); const v = pl(ct, cn); if (isPal) o[cn] = v; } if (isPal && !Object.keys(palette).length) palette = o; return o; }
    case 11: { const n = i32(); p += n * 4; return 0; } case 12: { const n = i32(); p += n * 8; return 0; }
  }
}
const rt = u8(); str(); pl(rt, '');
console.log(`schem ${W}x${H}x${L}, palette ${Object.keys(palette).length}`);

// palette index → { packed:uint16, air:bool }, plus report tallies
const idToRaw = {}; for (const [k, v] of Object.entries(palette)) idToRaw[v] = k;
const AIR = /(^|:)(air|cave_air|void_air|barrier|structure_void)(\[|$)/;
const packed = new Uint16Array(Object.keys(palette).length);
const isAir = new Uint8Array(Object.keys(palette).length);
const missing = {}, usedBlocks = {};
for (const [raw, i] of Object.entries(palette)) {
  if (AIR.test(raw)) { isAir[i] = 1; continue; }
  let res = null; try { res = mapBlock(raw); } catch { /* */ }
  if (!res || res.quality === 'none' || B[res.block] === undefined) { isAir[i] = 1; missing[raw.replace(/\[.*/, '')] = (missing[raw.replace(/\[.*/, '')] || 0) + 1; continue; }
  const id = B[res.block]; const shape = BLOCKS[id].shape;
  packed[i] = (id & 0x0fff) | ((facingOf(raw, shape) & 0x7) << 12);
  usedBlocks[res.block] = (usedBlocks[res.block] || 0) + 1;
}

// crop bbox (circle clipped to schem)
const minX = Math.max(0, cx - R), maxX = Math.min(W - 1, cx + R);
const minZ = Math.max(0, cz - R), maxZ = Math.min(L - 1, cz + R);
const gw = maxX - minX + 1, gl = maxZ - minZ + 1;

// first stream: find maxY with content in circle
const WL = W * L, R2 = R * R;
let q = dataStart, idx = 0, maxY = 0;
while (q < dataStart + dataLen) {
  let val = 0, sh = 0, b; do { b = buf[q++]; val |= (b & 0x7f) << sh; sh += 7; } while (b & 0x80);
  if (!isAir[val]) { const y = (idx / WL) | 0, rem = idx - y * WL, z = (rem / W) | 0, x = rem - z * W; const dx = x - cx, dz = z - cz; if (dx * dx + dz * dz <= R2 && y > maxY) maxY = y; }
  idx++;
}
const gh = maxY + 1;
const grid = new Uint16Array(gw * gh * gl); // dense, air=0
const perY = new Int32Array(gh);

// second stream: fill grid
q = dataStart; idx = 0; let count = 0;
while (q < dataStart + dataLen) {
  let val = 0, sh = 0, b; do { b = buf[q++]; val |= (b & 0x7f) << sh; sh += 7; } while (b & 0x80);
  if (!isAir[val] && packed[val]) {
    const y = (idx / WL) | 0, rem = idx - y * WL, z = (rem / W) | 0, x = rem - z * W;
    if (y <= maxY) { const dx = x - cx, dz = z - cz; if (dx * dx + dz * dz <= R2) { grid[((y * gl) + (z - minZ)) * gw + (x - minX)] = packed[val]; count++; perY[y]++; } }
  }
  idx++;
}
// ground plane = the y with the most filled cells (the terrain/plaza floor).
let groundY = 0, best = -1;
for (let y = 0; y < gh; y++) if (perY[y] > best) { best = perY[y]; groundY = y; }

const gz = zlib.gzipSync(Buffer.from(grid.buffer), { level: 9 });
const b64 = gz.toString('base64');
const header = '// GENERATED by tools/bake-town.mjs — do not edit by hand.\n'
  + `// Circular town crop: center (${cx},${cz}) r=${R}. Grid ${gw} x ${gh} x ${gl} (x,y,z),\n`
  + `// ${count.toLocaleString()} non-air cells. Uint16: bits 0-11 block id, 12-14 facing.\n`
  + '// gzip(Uint16 buffer) → base64; runtime inflates once (js/world/town.js).\n';
fs.writeFileSync(OUT, header
  + `export const TOWN = { gw:${gw}, gh:${gh}, gl:${gl}, cx:${cx}, cz:${cz}, minX:${minX}, minZ:${minZ}, groundY:${groundY}, cells:${count},\n`
  + `  gzB64: '${b64}' };\n`);

console.log(`grid ${gw}x${gh}x${gl} = ${(gw * gh * gl).toLocaleString()} cells; ${count.toLocaleString()} non-air`);
console.log(`gzip+base64: ${(b64.length / 1024 / 1024).toFixed(2)} MB embedded`);
console.log(`distinct our-blocks used: ${Object.keys(usedBlocks).length}`);
const miss = Object.entries(missing).sort((a, b) => b[1] - a[1]);
console.log(`UNMAPPED palette ids (→ air holes): ${miss.length}`);
for (const [k, n] of miss.slice(0, 40)) console.log(`  ${k.replace('minecraft:', '')}  (${n} states)`);
