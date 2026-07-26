// Painter kit for per-creature mob skins. Each remade mob paints its own
// 64×64 (or so) texture at registration time; these helpers give the painters
// a compact, deterministic pixel vocabulary (seeded — same skin every boot).
//
// ---------------------------------------------------------------------------
// WHY THERE ARE TWO GENERATIONS OF TOOL IN HERE
//
// The first generation was `noise` + `strokes` + `spots`: a flat fill with
// per-pixel value jitter and some random dashes over it. At 64×64, viewed a few
// blocks away, isotropic jitter does not read as a surface — it reads as
// television static, and every animal came out the same degree of mush whatever
// it was supposed to be made of.
//
// The renderer already shades whole FACES (js/gfx/renderer.js `faceBright`: top
// 1.0, sides 0.85/0.7, bottom 0.55), so a box is not flat-lit. What the renderer
// cannot do is say anything about what is happening WITHIN a face, or where one
// box stops and the next begins. Those are the two things that make a stack of
// cuboids read as a creature, and they are what the second generation adds:
//
//   FORM   a soft top-to-bottom value ramp across the island. Light comes from
//          above, so the underside of a flank sits in its own shadow — the same
//          reason a real animal has a pale belly and reads as round.
//   SEAM   the island's outermost pixel ring, darkened. Every box edge becomes a
//          visible crease, so a shoulder is a shoulder rather than the place the
//          neck happens to stop.
//   GRAIN  coherent, directional material: fur lying one way, scale courses,
//          feather ranks, hammered plate. Structure, not randomness.
//
// `panel()` does all three in one call and every material below is built on it.
// The first-generation helpers are kept because they are still the right tool
// for small marks — a nostril, four teeth, a glint.
import { mulberry32, hashSeed } from '../core/rng.js';

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (sh) => Math.max(0, Math.min(255, Math.round(((n >> sh) & 255) + amt * 255)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// PROPORTIONAL light, and the reason a dark creature has an underside at all.
//
// shade() adds a fixed amount to every channel, which is fine for a mark on a
// mid-tone but wrong for form: the Riftdrake's hide is #3a2a4e, and asking
// shade() for a shadow a quarter-step down subtracts 64 from 42 and hands back
// pure black. Every dark animal came out as a silhouette with its belly, its
// seams and its whole lower half crushed into one flat void.
//
// `amt` is a fraction of the way to black (negative) or to white (positive), so
// the same number means the same THING on any base colour.
export function tone(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (sh) => {
    const c = (n >> sh) & 255;
    const v = amt < 0 ? c * (1 + amt) : c + (255 - c) * amt;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`;
}

// Blend two hex colours, t=0 → a, t=1 → b. Returns hex so the result can be fed
// back into shade()/mix() again.
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  return `#${[16, 8, 0].map((sh) => {
    const x = (pa >> sh) & 255, y = (pb >> sh) & 255;
    return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  }).join('')}`;
}

// 4×4 ordered-dither threshold matrix. Two flat colours dithered against each
// other give a gradient with no banding and no new palette entries — which is
// how pixel art has always done gradients, and it survives mipmapping better
// than per-pixel noise does.
const BAYER = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
];

// makePainter(ctx, seedString) → P, the toolkit handed to def.paint(ctx, P)
export function makePainter(ctx, seed) {
  const r = mulberry32(hashSeed(String(seed)));
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  // ---- the workhorse ------------------------------------------------------
  // One face island, as a shaded volume rather than a rectangle.
  //
  //   base    the local colour of the material
  //   light   depth of the top→bottom form ramp (0 = flat). Positive darkens
  //           downward, which is right for any vertical face; pass 0 for a top
  //           cap and a negative number for an underside.
  //   seam    how much to darken the 1px border. 0 turns it off — do that for an
  //           island shared by several boxes that are meant to read as one mass.
  //   vary    per-pixel jitter. Deliberately small; this is grit, not texture.
  //   speck   { chance, color } sparse contamination (mud, lichen, rust).
  //   top     optional colour for the upper edge — a lit rim, 1px.
  function panel(x, y, w, h, base, opts = {}) {
    const { light = 0.14, seam = 0.16, vary = 0.03, speck = null, top = null, bottom = null } = opts;
    const lo = tone(base, -light);
    for (let j = 0; j < h; j++) {
      // Ease the ramp so the top two-thirds stay near the base colour and the
      // shadow gathers low, the way light actually falls on a curved flank.
      const t = h <= 1 ? 0 : (j / (h - 1)) ** 1.7;
      for (let i = 0; i < w; i++) {
        // Dither between base and shadow instead of computing a per-pixel mix:
        // two values, ordered — a gradient that still looks hand-placed.
        const lit = t * 16 <= BAYER[j & 3][i & 3] ? base : lo;
        let c = tone(lit, (r() - 0.5) * 2 * vary);
        if (speck && r() < speck.chance) c = tone(speck.color, (r() - 0.5) * 0.08);
        px(x + i, y + j, c);
      }
    }
    if (seam) {
      const edge = tone(base, -(light + seam));
      rect(x, y + h - 1, w, 1, tone(base, -(light + seam * 1.3)));   // the deepest crease
      rect(x, y, w, 1, edge);
      rect(x, y, 1, h, edge);
      rect(x + w - 1, y, 1, h, edge);
    }
    if (top) rect(x, y, w, 1, top);
    if (bottom) rect(x, y + h - 1, w, 1, bottom);
  }

  // Inset edge shadow, `n` pixels deep, for a face that sits under an
  // overhanging box (a jaw under a brow, a leg under a barrel). Darkens whatever
  // is already painted, so it composites over any material — read back in one
  // block rather than a pixel at a time, because getImageData is not cheap.
  function ao(x, y, w, h, amt = 0.1, n = 1, side = 'top') {
    const [rx, ry, rw, rh] = side === 'top' ? [x, y, w, n]
      : side === 'bottom' ? [x, y + h - n, w, n]
        : side === 'left' ? [x, y, n, h] : [x + w - n, y, n, h];
    if (rw <= 0 || rh <= 0) return;
    const img = ctx.getImageData(rx, ry, rw, rh);
    const d = img.data;
    const vertical = side === 'top' || side === 'bottom';
    for (let j = 0; j < rh; j++) {
      for (let i = 0; i < rw; i++) {
        // Deepest at the edge itself, fading inward.
        const k = vertical ? (side === 'top' ? j : rh - 1 - j) : (side === 'left' ? i : rw - 1 - i);
        const a = amt * (1 - k / n) * 255;
        const o = (j * rw + i) * 4;
        d[o] = Math.max(0, d[o] - a);
        d[o + 1] = Math.max(0, d[o + 1] - a);
        d[o + 2] = Math.max(0, d[o + 2] - a);
      }
    }
    ctx.putImageData(img, rx, ry);
  }

  return {
    r, px, rect, shade, tone, mix, panel, ao,

    // ---- first-generation marks (still the right tool for small details) ---
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
        const m = mix(top, bottom, t);
        for (let i = 0; i < w; i++) px(x + i, y + j, shade(m, (r() - 0.5) * 2 * vary));
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
        px(x + i, y + j, shade(mix(core, edge, d), (r() - 0.5) * 0.05));
      }
    },

    // ---- dithered gradient -------------------------------------------------
    // Two colours, ordered-dithered along an axis. Banding-free, mip-stable, and
    // it adds no palette entries — the pixel-art way to do a ramp.
    ramp(x, y, w, h, a, b, axis = 'v', bias = 1) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const t = (axis === 'v' ? (h <= 1 ? 0 : j / (h - 1)) : (w <= 1 ? 0 : i / (w - 1))) ** bias;
        px(x + i, y + j, t * 16 <= BAYER[j & 3][i & 3] ? a : b);
      }
    },

    // ---- materials ---------------------------------------------------------
    // Each of these is panel() plus the structure that particular stuff has. The
    // point is that a cow and a dragon stop being the same mush in two colours.

    // HIDE — short-haired mammal. Grain lies along the body (horizontal on a
    // flank), with the coat breaking into a few lighter tufts.
    hide(x, y, w, h, base, dk, opts = {}) {
      panel(x, y, w, h, base, { light: 0.15, vary: 0.028, ...opts });
      const hi = tone(base, 0.09);
      for (let j = 2; j < h - 2; j += 2) {                 // lie of the coat
        for (let i = 1; i < w - 1; i++) if (r() < 0.22) px(x + i, y + j, dk);
      }
      for (let k = 0; k < Math.max(2, (w * h) / 90) | 0; k++) {
        const sx = x + 1 + (r() * (w - 2)) | 0, sy = y + 1 + (r() * (h - 3)) | 0;
        px(sx, sy, hi); if (r() < 0.5) px(sx + 1, sy, hi);
      }
    },

    // FLEECE — wool. Overlapping curls: a dark hook with a lit crown, packed
    // dense enough that no two rows line up.
    fleece(x, y, w, h, base, dk, hi) {
      panel(x, y, w, h, base, { light: 0.12, vary: 0.035, seam: 0.13 });
      for (let j = 1; j < h - 1; j += 2) {
        const off = (j & 2) ? 1 : 3;
        for (let i = off; i < w - 1; i += 3) {
          const jitter = r() < 0.4 ? 1 : 0;
          const cx = x + i, cy = y + j + jitter;
          if (cy >= y + h - 1) continue;
          px(cx, cy, dk); px(cx + 1, cy + (r() < 0.6 ? 1 : 0), dk);
          px(cx, cy - 1 < y ? cy : cy - 1, hi);
        }
      }
    },

    // FEATHER — plumage. Ranks of overlapping quills, each course a shade
    // darker at its lower edge so the layering reads.
    feather(x, y, w, h, base, dk, hi, step = 3) {
      panel(x, y, w, h, base, { light: 0.13, vary: 0.025, seam: 0.14 });
      for (let j = step; j < h - 1; j += step) {
        rect(x + 1, y + j, w - 2, 1, dk);                  // the course line
        for (let i = 1; i < w - 1; i += 2) px(x + i, y + j - 1, hi);
        // scalloped trailing edge, so a rank is feathers rather than a stripe
        for (let i = 2; i < w - 1; i += 4) px(x + i, y + j + 1, tone(dk, 0.07));
      }
    },

    // SCALE — reptile. Offset courses of 2px scales, each with a lit top edge
    // and a shadow under it. Reads as overlapping plates, not as a brick wall.
    scaled(x, y, w, h, base, dk, hi, step = 3) {
      panel(x, y, w, h, base, { light: 0.15, vary: 0.022, seam: 0.16 });
      for (let row = 1; row < h - 1; row += step) {
        const off = ((row - 1) / step) % 2 ? 2 : 0;
        for (let sx = off; sx < w - 1; sx += 4) {
          const cx = x + sx + 1;
          if (cx + 1 >= x + w - 1) continue;
          px(cx, y + row, hi); px(cx + 1, y + row, hi);      // scale crown
          if (row + 1 < h - 1) { px(cx, y + row + 1, dk); px(cx + 1, y + row + 1, dk); }
        }
      }
    },

    // PLATE — beaten metal. A lit bevel along the top and left, a hammered
    // dent field, rivets on the corners, rust creeping up from the bottom edge.
    plate(x, y, w, h, base, opts = {}) {
      const { rust = null, rivets = true } = opts;
      panel(x, y, w, h, base, { light: 0.18, vary: 0.02, seam: 0.2 });
      rect(x + 1, y + 1, w - 2, 1, tone(base, 0.22));        // top bevel
      rect(x + 1, y + 1, 1, h - 2, tone(base, 0.13));        // left bevel
      for (let k = 0; k < Math.max(3, (w * h) / 40) | 0; k++) {   // hammer dents
        const dx = x + 1 + (r() * (w - 2)) | 0, dy = y + 2 + (r() * (h - 3)) | 0;
        px(dx, dy, tone(base, -0.14)); if (r() < 0.5) px(dx, dy - 1, tone(base, 0.16));
      }
      if (rust) {
        for (let i = 1; i < w - 1; i++) {
          const up = 1 + (r() * Math.min(4, h - 3)) | 0;
          for (let j = 0; j < up; j++) if (r() < 0.7) px(x + i, y + h - 2 - j, shade(rust, (r() - 0.5) * 0.1));
        }
      }
      if (rivets && w > 5 && h > 5) {
        for (const [rx, ry] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) {
          px(x + rx, y + ry, tone(base, 0.26)); px(x + rx, y + ry + 1, tone(base, -0.2));
        }
      }
    },

    // CLOTH — woven stuff: rag, tunic, sacking. A loose weave plus a couple of
    // vertical fold shadows, and a frayed bottom hem.
    cloth(x, y, w, h, base, opts = {}) {
      const { folds = 2, fray = true, dk = tone(base, -0.15) } = opts;
      panel(x, y, w, h, base, { light: 0.14, vary: 0.03, seam: 0.15 });
      for (let j = 1; j < h - 1; j++) {                      // weave
        for (let i = 1 + (j & 1); i < w - 1; i += 2) if (r() < 0.5) px(x + i, y + j, dk);
      }
      for (let f = 0; f < folds; f++) {                      // hanging folds
        const fx = x + 2 + ((f + 1) * (w - 4)) / (folds + 1) | 0;
        for (let j = 1; j < h - 1; j++) {
          px(fx, y + j, dk);
          if (fx + 1 < x + w - 1) px(fx + 1, y + j, tone(base, 0.1));
        }
      }
      if (fray) for (let i = 1; i < w - 1; i++) if (r() < 0.45) px(x + i, y + h - 2, dk);
    },

    // MEMBRANE — a wing. Thin skin stretched between struts: the panel gets
    // lighter toward the trailing edge (light comes through it), the struts are
    // opaque ribs, and the trailing edge is nicked and worn.
    membrane(x, y, w, h, base, strut, opts = {}) {
      const { ribs = 4, thin = 0.16, tears = true } = opts;
      // Thin skin: PALER toward the trailing edge, because light comes through it
      // there. The opposite ramp from a solid flank, and the whole reason a wing
      // reads as a sail rather than a plank.
      //
      // The struts are DARKER than the web, not lighter. The first version made
      // them bone-white against a near-black membrane, so a folded wing read as a
      // handful of white sticks — the single worst thing about the old dragons was
      // the value contrast in here, not the geometry.
      const near = tone(base, -thin * 0.8), far = tone(base, thin);
      for (let j = 0; j < h; j++) {
        const t = h <= 1 ? 0 : (j / (h - 1)) ** 0.8;
        for (let i = 0; i < w; i++) {
          const c = t * 16 <= BAYER[j & 3][i & 3] ? near : far;
          px(x + i, y + j, tone(c, (r() - 0.5) * 0.05));
        }
      }
      rect(x, y, w, 1, strut);                               // leading-edge spar
      rect(x, y + 1, w, 1, tone(strut, -0.14));
      for (let k = 1; k <= ribs; k++) {                      // finger struts
        const rx = x + Math.round((k * (w - 1)) / (ribs + 1));
        rect(rx, y, 1, h, tone(strut, -0.1));
        // a lit pixel beside each rib, so the membrane tents away from it
        if (rx + 1 < x + w) rect(rx + 1, y + 2, 1, Math.max(0, h - 2), tone(base, 0.14));
      }
      if (tears) for (let i = 0; i < w; i++) {               // worn trailing edge
        if (r() < 0.4) px(x + i, y + h - 1, tone(base, -0.22));
        if (r() < 0.14) px(x + i, y + h - 2, tone(base, -0.14));
      }
    },

    // HORN / BONE / CLAW — keratin. Growth rings across it, a lit ridge, dark
    // at the root and pale at the tip.
    horn(x, y, w, h, base, opts = {}) {
      const { tip = tone(base, 0.2), root = tone(base, -0.24), rings = 2 } = opts;
      this.ramp(x, y, w, h, tip, root, 'v', 1);
      for (let j = rings; j < h - 1; j += rings) rect(x, y + j, w, 1, tone(base, -0.2));
      if (w > 1) rect(x, y, 1, h, tone(base, 0.14));         // lit edge
      for (let k = 0; k < 3; k++) px(x + (r() * w) | 0, y + (r() * h) | 0, tone(base, 0.2));
    },

    // BLOTCH — a marking: a Holstein patch, dried mud, lichen on a drake, a
    // dapple. A rectangle of colour reads as a sticker; this eats an irregular
    // bite out of each edge and carries its own faint form shading, so it reads as
    // a patch OF the animal rather than a decal ON it.
    blotch(x, y, w, h, color, opts = {}) {
      const { rag = 0.5, light = 0.1 } = opts;
      const lo = tone(color, -light);
      const bite = (n) => Array.from({ length: n }, () => (r() < rag ? 1 + ((r() * 2) | 0) : 0));
      const top = bite(w), bot = bite(w);
      for (let i = 0; i < w; i++) {
        for (let j = top[i]; j < h - bot[i]; j++) {
          const t = ((j - top[i]) / Math.max(1, h - top[i] - bot[i])) ** 1.6;
          px(x + i, y + j, t * 16 <= BAYER[j & 3][i & 3] ? color : lo);
        }
      }
    },

    // A creased line — a muscle boundary, a rib, a fold. Bresenham, 1px, with an
    // optional lit pixel above it so the crease reads as a change of plane.
    crease(x0, y0, x1, y1, c, hi = null) {
      let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy, cx = x0, cy = y0;
      for (;;) {
        px(cx, cy, c);
        if (hi) px(cx, cy - 1, hi);
        if (cx === x1 && cy === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
      }
    },
  };
}
