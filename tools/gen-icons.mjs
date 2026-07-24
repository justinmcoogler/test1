// Generates the PWA app icons (a little pixel sprout) as PNGs, no deps — a
// minimal PNG encoder over a hand-drawn 16×16 grid scaled up. Run:
//   node tools/gen-icons.mjs   → writes icon-192.png, icon-512.png
import zlib from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- minimal PNG (RGBA, 8-bit) encoder --------------------------------------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- the sprout, on a 16×16 grid --------------------------------------------
const BG = [74, 122, 58], BG2 = [90, 142, 70];      // grass greens
const SOIL = [107, 74, 42], SOIL2 = [86, 58, 32];   // earth
const STEM = [62, 125, 50];
const LEAF = [111, 191, 74], LEAF_HI = [168, 229, 122];
// per-cell colour (null = background); drawn big so it reads at any size
const G = 16;
function cellColor(cx, cy) {
  // soil mound
  if (cy === 13 && cx >= 4 && cx <= 11) return SOIL2;
  if (cy === 12 && cx >= 5 && cx <= 10) return SOIL;
  if (cy === 11 && cx >= 6 && cx <= 9) return SOIL;
  // stem
  if (cx >= 7 && cx <= 8 && cy >= 6 && cy <= 10) return STEM;
  // left leaf
  if (cy >= 6 && cy <= 8 && cx >= 3 && cx <= 6 && (cx + cy) % 5 !== 0) return (cx + cy) % 2 ? LEAF : LEAF_HI;
  // right leaf
  if (cy >= 4 && cy <= 7 && cx >= 8 && cx <= 12 && (cx - cy) % 5 !== 0) return (cx + cy) % 2 ? LEAF : LEAF_HI;
  // top sprout tip
  if (cx >= 7 && cx <= 8 && cy >= 4 && cy <= 5) return LEAF_HI;
  return null;
}

function render(S) {
  const px = Buffer.alloc(S * S * 4);
  const scale = S / G;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const cx = Math.floor(x / scale), cy = Math.floor(y / scale);
    let c = cellColor(cx, cy);
    if (!c) c = ((cx + cy) & 1) ? BG : BG2; // subtle checker background
    const i = (y * S + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return px;
}

for (const S of [192, 512]) {
  const buf = encodePNG(S, S, render(S));
  await writeFile(join(root, `icon-${S}.png`), buf);
  console.log(`wrote icon-${S}.png (${buf.length} bytes)`);
}
