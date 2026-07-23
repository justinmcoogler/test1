#!/usr/bin/env node
// Convert Minecraft schematic files into Emberveil structure JSON.
//
//   node tools/import-schematic.mjs <file.schem|.schematic|.litematic|.nbt> [out.json]
//   node tools/import-schematic.mjs assets/schematics/*.schem      (batch)
//
// Supports the three formats people actually share:
//   • Sponge  .schem       (string Palette + varint BlockData, WorldEdit/modern)
//   • Legacy  .schematic    (numeric block ids + Data nibbles, MCEdit/old WorldEdit)
//   • Litematica .litematic (bit-packed BlockStates + BlockStatePalette)
// plain .nbt structure blocks are read as Sponge-style if they carry a palette.
//
// Each non-air cell is mapped to one of our blocks via tools/mc-block-map.mjs.
// Output: { name, size:{w,h,l}, cells:[{x,y,z,block}], report } where report
// lists every Minecraft id we had no exact match for so you know what's missing.
//
// Run without writing files to just see the coverage report:
//   node tools/import-schematic.mjs build.schem --report-only

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { mapBlock, normalizeId } from './mc-block-map.mjs';
import { LEGACY_IDS } from './mc-legacy-ids.mjs';
import { B, BLOCKS } from '../js/world/blocks.js';

// Minecraft blockstate → our packed facing: bits 0-1 = direction (0=+Z/south
// 1=+X/east 2=-Z/north 3=-X/west), bit 2 = top half (upside-down stair / top slab).
const MC_FACE = { south: 0, east: 1, north: 2, west: 3 };
function mcOrient(rawId) {
  const s = String(rawId);
  let v = 0, has = false;
  const fm = /facing=(north|south|east|west)/.exec(s);
  if (fm) { v |= MC_FACE[fm[1]]; has = true; }
  if (/(?:half|type)=top/.test(s)) { v |= 4; has = true; } // stairs use half=top, slabs use type=top
  return has ? v : undefined;
}
// which shapes carry an orientation we can represent
const ORIENTED = new Set(['stairs', 'slab', 'gate']);

// ── NBT reader ──────────────────────────────────────────────────────────────
// Big-endian named binary tags. gzip- or zlib-compressed on disk, or raw.
class NbtReader {
  constructor(buf) { this.b = buf; this.p = 0; }
  u8() { return this.b[this.p++]; }
  i8() { const v = this.b.readInt8(this.p); this.p += 1; return v; }
  i16() { const v = this.b.readInt16BE(this.p); this.p += 2; return v; }
  u16() { const v = this.b.readUInt16BE(this.p); this.p += 2; return v; }
  i32() { const v = this.b.readInt32BE(this.p); this.p += 4; return v; }
  i64() { const v = this.b.readBigInt64BE(this.p); this.p += 8; return v; }
  f32() { const v = this.b.readFloatBE(this.p); this.p += 4; return v; }
  f64() { const v = this.b.readDoubleBE(this.p); this.p += 8; return v; }
  str() { const n = this.u16(); const s = this.b.toString('utf8', this.p, this.p + n); this.p += n; return s; }

  payload(type) {
    switch (type) {
      case 1: return this.i8();
      case 2: return this.i16();
      case 3: return this.i32();
      case 4: return this.i64();
      case 5: return this.f32();
      case 6: return this.f64();
      case 7: { const n = this.i32(); const a = this.b.subarray(this.p, this.p + n); this.p += n; return a; }
      case 8: return this.str();
      case 9: { const et = this.u8(); const n = this.i32(); const a = []; for (let i = 0; i < n; i++) a.push(this.payload(et)); return a; }
      case 10: return this.compound();
      case 11: { const n = this.i32(); const a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = this.i32(); return a; }
      case 12: { const n = this.i32(); const a = new BigInt64Array(n); for (let i = 0; i < n; i++) a[i] = this.i64(); return a; }
      default: throw new Error(`unknown NBT tag type ${type} at byte ${this.p}`);
    }
  }
  compound() {
    const obj = {};
    for (;;) {
      const type = this.u8();
      if (type === 0) break; // TAG_End
      const name = this.str();
      obj[name] = this.payload(type);
    }
    return obj;
  }
}

function decompress(buf) {
  if (buf[0] === 0x1f && buf[1] === 0x8b) return zlib.gunzipSync(buf);       // gzip
  if (buf[0] === 0x78) return zlib.inflateSync(buf);                          // zlib
  return buf;                                                                 // raw
}

function parseNbt(buf) {
  const r = new NbtReader(decompress(buf));
  const type = r.u8();
  if (type !== 10) throw new Error('not an NBT compound root');
  r.str(); // root name (usually "" or "Schematic")
  return r.compound();
}

// ── varint stream (Sponge BlockData) ────────────────────────────────────────
function* varints(bytes) {
  let i = 0;
  while (i < bytes.length) {
    let value = 0, shift = 0, b;
    do { b = bytes[i++]; value |= (b & 0x7f) << shift; shift += 7; } while (b & 0x80);
    yield value >>> 0;
  }
}

// ── format detection & extraction → flat list of {x,y,z,id} ─────────────────
// Finds the compound that actually holds the block data, wherever the format
// buried it (root, root.Schematic, root.Schematic.Blocks …).
function findSponge(root) {
  const cands = [root, root.Schematic, root.Blocks, root.Schematic?.Blocks].filter(Boolean);
  for (const c of cands) {
    if (c.Palette && (c.BlockData || c.Data)) return c;
  }
  return null;
}

function readSponge(root) {
  const c = findSponge(root);
  const w = Number(root.Width ?? root.Schematic?.Width ?? c.Width);
  const h = Number(root.Height ?? root.Schematic?.Height ?? c.Height);
  const l = Number(root.Length ?? root.Schematic?.Length ?? c.Length);
  // Palette: name → index. Invert to index → name.
  const byIndex = [];
  for (const [name, idx] of Object.entries(c.Palette)) byIndex[Number(idx)] = name;
  const data = c.BlockData || c.Data; // v3 nests as Blocks.Data
  const ids = [...varints(data)];
  const cells = [];
  let i = 0;
  for (let y = 0; y < h; y++) for (let z = 0; z < l; z++) for (let x = 0; x < w; x++) {
    cells.push({ x, y, z, id: byIndex[ids[i++]] ?? 'minecraft:air' });
  }
  return { w, h, l, cells };
}

function readLegacy(root) {
  const w = Number(root.Width), h = Number(root.Height), l = Number(root.Length);
  const blocks = root.Blocks;            // byte array, low 8 bits
  const add = root.AddBlocks || root.Add; // optional nibble array for high bits
  const cells = [];
  let i = 0;
  for (let y = 0; y < h; y++) for (let z = 0; z < l; z++) for (let x = 0; x < w; x++) {
    let id = blocks[i] & 0xff;
    if (add) { const nib = (i & 1) ? (add[i >> 1] & 0x0f) : (add[i >> 1] >> 4); id |= nib << 8; }
    cells.push({ x, y, z, id: LEGACY_IDS[id] || (id === 0 ? 'minecraft:air' : `legacy:${id}`) });
    i++;
  }
  return { w, h, l, cells };
}

// Litematica packs indices into a long array, bits = max(2, ceil(log2(size))),
// entries straddle long boundaries (pre-1.16 chunk packing).
function readLitematic(root) {
  const regions = root.Regions || {};
  const name = Object.keys(regions)[0];
  const reg = regions[name];
  if (!reg) throw new Error('litematic has no regions');
  const w = Math.abs(Number(reg.Size.x)), h = Math.abs(Number(reg.Size.y)), l = Math.abs(Number(reg.Size.z));
  const palette = (reg.BlockStatePalette || []).map((s) => s.Name);
  const bits = Math.max(2, Math.ceil(Math.log2(palette.length)));
  const longs = reg.BlockStates; // BigInt64Array
  const mask = (1n << BigInt(bits)) - 1n;
  const at = (index) => {
    const bitPos = BigInt(index) * BigInt(bits);
    const startLong = Number(bitPos >> 6n);
    const offset = bitPos & 63n;
    const lo = BigInt.asUintN(64, longs[startLong]);
    let val = lo >> offset;
    if (offset + BigInt(bits) > 64n && startLong + 1 < longs.length) {
      const hi = BigInt.asUintN(64, longs[startLong + 1]);
      val |= hi << (64n - offset);
    }
    return Number(val & mask);
  };
  const cells = [];
  let i = 0;
  for (let y = 0; y < h; y++) for (let z = 0; z < l; z++) for (let x = 0; x < w; x++) {
    cells.push({ x, y, z, id: palette[at(i++)] ?? 'minecraft:air' });
  }
  return { w, h, l, cells };
}

function extract(root, ext) {
  if (ext === '.litematic' || root.Regions) return readLitematic(root);
  if (findSponge(root)) return readSponge(root);
  if (root.Blocks) return readLegacy(root);
  throw new Error('unrecognised schematic layout (no Palette/Blocks/Regions found)');
}

// ── conversion ──────────────────────────────────────────────────────────────
export function convertSchematic(buf, ext = '.schem') {
  const root = parseNbt(buf);
  const raw = extract(root, ext);
  const cells = [];
  const unmapped = new Map();   // id → count (quality 'none')
  const approx = new Map();     // id → {block, count}
  let air = 0, exact = 0;
  for (const c of raw.cells) {
    const m = mapBlock(c.id);
    if (m.block === 'air') {
      if (m.quality === 'none') {
        const key = normalizeId(c.id);
        unmapped.set(key, (unmapped.get(key) || 0) + 1);
      }
      air++;
      continue;
    }
    if (m.quality === 'approx') {
      const e = approx.get(m.id) || { block: m.block, count: 0 };
      e.count++; approx.set(m.id, e);
    } else exact++;
    // carry orientation (facing + top-half) for stairs/slabs/gates
    const cell = { x: c.x, y: c.y, z: c.z, block: m.block };
    if (ORIENTED.has(BLOCKS[B[m.block]]?.shape)) { const f = mcOrient(c.id); if (f !== undefined) cell.f = f; }
    cells.push(cell);
  }
  return {
    size: { w: raw.w, h: raw.h, l: raw.l },
    cells,
    report: {
      total: raw.cells.length, air, placed: cells.length, exact,
      approxKinds: approx.size, approx: [...approx].map(([id, e]) => ({ id, block: e.block, count: e.count })).sort((a, b) => b.count - a.count),
      unmappedKinds: unmapped.size, unmapped: [...unmapped].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    },
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function main(argv) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const reportOnly = argv.includes('--report-only');
  if (!args.length) {
    console.error('usage: node tools/import-schematic.mjs <file.schem…> [out.json] [--report-only]');
    process.exit(1);
  }
  // second bare arg is an explicit output path only when a single input is given
  const explicitOut = args.length === 2 && !/\.(schem|schematic|litematic|nbt)$/i.test(args[1]) ? args.pop() : null;

  const allUnmapped = new Map();
  for (const file of args) {
    const ext = path.extname(file).toLowerCase();
    let conv;
    try {
      conv = convertSchematic(fs.readFileSync(file), ext);
    } catch (e) {
      console.error(`✗ ${file}: ${e.message}`);
      continue;
    }
    const r = conv.report;
    console.log(`\n${path.basename(file)}  ${conv.size.w}×${conv.size.h}×${conv.size.l}`);
    console.log(`  placed ${r.placed}  (exact ${r.exact}, approx ${r.total - r.air - r.exact}, air ${r.air})`);
    if (r.approx.length) {
      console.log(`  approximated ${r.approxKinds} kind(s) → nearest block:`);
      for (const a of r.approx.slice(0, 20)) console.log(`    ${a.id.padEnd(28)} → ${a.block}  ×${a.count}`);
    }
    if (r.unmapped.length) {
      console.log(`  ⚠ NO mapping for ${r.unmappedKinds} kind(s) (dropped as air):`);
      for (const u of r.unmapped) { console.log(`    ${u.id.padEnd(28)} ×${u.count}`); allUnmapped.set(u.id, (allUnmapped.get(u.id) || 0) + u.count); }
    } else {
      console.log('  ✓ every block mapped');
    }
    if (!reportOnly) {
      const out = explicitOut || file.replace(/\.[^.]+$/, '.json');
      const name = path.basename(file).replace(/\.[^.]+$/, '');
      fs.writeFileSync(out, JSON.stringify({ name, ...conv }, null, 0));
      console.log(`  → ${out}`);
    }
  }
  if (allUnmapped.size) {
    console.log(`\n════ blocks with NO Emberveil mapping (across all files) ════`);
    for (const [id, count] of [...allUnmapped].sort((a, b) => b[1] - a[1])) console.log(`  ${id.padEnd(30)} ×${count}`);
    console.log(`\nAdd these to MC_MAP in tools/mc-block-map.mjs to convert them.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
