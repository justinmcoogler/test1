// Painter kit for per-creature mob skins. Each remade mob paints its own
// 64×64 (or so) texture at registration time; these helpers give the painters
// a compact, deterministic pixel vocabulary (seeded — same skin every boot).
import { mulberry32, hashSeed } from '../core/rng.js';

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (sh) => Math.max(0, Math.min(255, Math.round(((n >> sh) & 255) + amt * 255)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// makePainter(ctx, seedString) → P, the toolkit handed to def.paint(ctx, P)
export function makePainter(ctx, seed) {
  const r = mulberry32(hashSeed(String(seed)));
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  return {
    r, px, rect, shade,
    // base fill with per-pixel value jitter (+ optional sparse speckle color)
    noise(x, y, w, h, base, vary = 0.06, speck = null) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let c = shade(base, (r() - 0.5) * 2 * vary);
        if (speck && r() < speck.chance) c = shade(speck.color, (r() - 0.5) * 0.08);
        px(x + i, y + j, c);
      }
    },
    // 1px border inside the rect (reads as an edge/seam on the model)
    outline(x, y, w, h, c) {
      rect(x, y, w, 1, c); rect(x, y + h - 1, w, 1, c);
      rect(x, y, 1, h, c); rect(x + w - 1, y, 1, h, c);
    },
    // scatter n short vertical strokes (fur/bristle/grain)
    strokes(x, y, w, h, n, c, len = 3) {
      for (let i = 0; i < n; i++) {
        const sx = x + (r() * w) | 0, sy = y + (r() * Math.max(1, h - len)) | 0;
        for (let j = 0; j < 1 + (r() * len) | 0; j++) px(sx, sy + j, c);
      }
    },
    // sparse single-pixel spots
    spots(x, y, w, h, n, c) { for (let i = 0; i < n; i++) px(x + (r() * w) | 0, y + (r() * h) | 0, c); },
    // horizontal banding (scales / plating / straw courses), every `step` rows
    bands(x, y, w, h, step, c) { for (let j = 0; j < h; j += step) rect(x, y + j, w, 1, c); },
    // offset-brick scale rows: 2px scallops that read as scales/shingles
    scales(x, y, w, h, c, hi = null) {
      for (let row = 0; row < h; row += 3) {
        const off = (row / 3) % 2 ? 2 : 0;
        for (let sx = off; sx < w; sx += 4) {
          px(x + sx, y + row, c); px(x + sx + 1, y + row, c);
          if (hi) px(x + sx, y + row + 1, hi);
        }
      }
    },
    // vertical top→bottom two-stop gradient with jitter
    vgrad(x, y, w, h, top, bottom, vary = 0.04) {
      for (let j = 0; j < h; j++) {
        const t = h <= 1 ? 0 : j / (h - 1);
        const mix = `#${[16, 8, 0].map((sh) => {
          const a = (parseInt(top.slice(1), 16) >> sh) & 255, b = (parseInt(bottom.slice(1), 16) >> sh) & 255;
          return Math.round(a + (b - a) * t).toString(16).padStart(2, '0');
        }).join('')}`;
        for (let i = 0; i < w; i++) px(x + i, y + j, shade(mix, (r() - 0.5) * 2 * vary));
      }
    },
    // a 2×2 eye with dark pupil + 1px glint at (x,y)
    eye(x, y, iris = '#1d1a20', glint = '#cfd4e0') {
      rect(x, y, 2, 2, iris); px(x, y, glint);
    },
    // soft radial glow centred in the rect (wisps, gems, ember cracks)
    glow(x, y, w, h, core, edge) {
      const cx = w / 2 - 0.5, cy = h / 2 - 0.5, rad = Math.max(w, h) / 2;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const d = Math.min(1, Math.hypot(i - cx, j - cy) / rad);
        const mix = `#${[16, 8, 0].map((sh) => {
          const a = (parseInt(core.slice(1), 16) >> sh) & 255, b = (parseInt(edge.slice(1), 16) >> sh) & 255;
          return Math.round(a + (b - a) * d).toString(16).padStart(2, '0');
        }).join('')}`;
        px(x + i, y + j, shade(mix, (r() - 0.5) * 0.05));
      }
    },
  };
}
