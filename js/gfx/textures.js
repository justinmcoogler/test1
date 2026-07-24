// Procedural texture atlas. Every tile is painted at 32×32 logical pixels
// (1px grain) for detailed, fully original seeded art.
import { mulberry32, hashSeed } from '../core/rng.js';
import { WOODS, METALS, FIREARMS } from '../game/materials.js';
import { COLORS } from '../core/colors.js';
import { TEXPACK_TILES } from './texpack.js';

export const TILE = 32;
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 26; // headroom for wood/ore/mineral + tinted families + schematic-import blocks
const G = 1; // grain: logical pixel size
const LP = TILE / G; // 32 logical pixels per side

export const tileUV = {}; // name → {u0,v0,u1,v1}

function px(ctx, x0, y0, lx, ly, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x0 + lx * G, y0 + ly * G, G, G);
}

function shade(hex, amt) {
  // hex '#rrggbb', amt -1..1
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt * 255)));
  g = Math.max(0, Math.min(255, Math.round(g + amt * 255)));
  b = Math.max(0, Math.min(255, Math.round(b + amt * 255)));
  return `rgb(${r},${g},${b})`;
}

// Fill the tile with base color + speckled variance.
function noisyFill(ctx, x0, y0, rand, base, variance = 0.05, sparse = null) {
  for (let y = 0; y < LP; y++) {
    for (let x = 0; x < LP; x++) {
      let c = shade(base, (rand() - 0.5) * 2 * variance);
      if (sparse && rand() < sparse.chance) c = shade(sparse.color, (rand() - 0.5) * 0.06);
      px(ctx, x0, y0, x, y, c);
    }
  }
}

function blades(ctx, x0, y0, rand, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * LP);
    const h = 1 + Math.floor(rand() * 3);
    for (let j = 0; j < h; j++) px(ctx, x0, y0, x, LP - 1 - j, shade(color, (rand() - 0.5) * 0.12));
  }
}

function oreBlobs(ctx, x0, y0, rand, color, glint, blobCount = 4) {
  for (let i = 0; i < blobCount; i++) {
    const bx = 2 + Math.floor(rand() * (LP - 5));
    const by = 2 + Math.floor(rand() * (LP - 5));
    const pts = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [-1, 0], [0, -1]];
    const n = 4 + Math.floor(rand() * 4);
    for (let j = 0; j < n; j++) {
      const [dx, dy] = pts[j];
      px(ctx, x0, y0, bx + dx, by + dy, shade(color, (rand() - 0.5) * 0.15));
    }
    px(ctx, x0, y0, bx, by, glint);
  }
}

function bark(ctx, x0, y0, rand, base, groove) {
  noisyFill(ctx, x0, y0, rand, base, 0.04);
  for (let x = 0; x < LP; x += 2 + Math.floor(rand() * 2)) {
    for (let y = 0; y < LP; y++) {
      if (rand() < 0.8) px(ctx, x0, y0, x, y, shade(groove, (rand() - 0.5) * 0.08));
    }
  }
}

function rings(ctx, x0, y0, rand, base, ringColor) {
  noisyFill(ctx, x0, y0, rand, base, 0.03);
  const cx = LP / 2 - 0.5, cy = LP / 2 - 0.5;
  for (let y = 0; y < LP; y++) {
    for (let x = 0; x < LP; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (Math.floor(d) % 3 === 0 && d < LP / 2) px(ctx, x0, y0, x, y, shade(ringColor, (rand() - 0.5) * 0.05));
    }
  }
}

function brick(ctx, x0, y0, rand, base, mortar, rows = 4) {
  noisyFill(ctx, x0, y0, rand, mortar, 0.03);
  const rh = LP / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * Math.floor(LP / 4);
    for (let bcol = -1; bcol < 3; bcol++) {
      const bx = bcol * Math.floor(LP / 2) + off + 1;
      for (let y = r * rh + 1; y < (r + 1) * rh; y++) {
        for (let x = bx; x < bx + Math.floor(LP / 2) - 1; x++) {
          if (x >= 0 && x < LP) px(ctx, x0, y0, x, Math.floor(y), shade(base, (rand() - 0.5) * 0.08));
        }
      }
    }
  }
}

// Minecraft-style leaves: dense clumps of varied green with see-through gaps
// (transparent pixels the cutout pass discards) so a canopy reads as foliage,
// not one solid green cube.
function leaves(ctx, x0, y0, rand, base, accent, accentChance = 0.06) {
  for (let y = 0; y < LP; y++) {
    for (let x = 0; x < LP; x++) {
      const r = rand();
      if (r < 0.16) continue;                                    // gap → transparent, see-through
      let c;
      if (r < 0.34) c = shade(base, -0.17);                      // shaded underside / clump edge
      else if (r < 0.34 + accentChance) c = accent;              // bright highlight leaf
      else if (r < 0.46) c = shade(base, 0.11);                  // sunlit leaf face
      else c = shade(base, (rand() - 0.5) * 0.16);               // base green, varied
      px(ctx, x0, y0, x, y, c);
    }
  }
}

function cross(ctx, x0, y0, rand, painter) {
  // transparent background then painter draws the plant
  ctx.clearRect(x0, y0, TILE, TILE);
  painter();
}

function plantStalk(ctx, x0, y0, rand, stem, headColor, headY = 4) {
  const sx = LP / 2 + Math.floor(rand() * 3) - 1;
  for (let y = headY; y < LP; y++) px(ctx, x0, y0, sx, y, shade(stem, (rand() - 0.5) * 0.1));
  if (headColor) {
    px(ctx, x0, y0, sx, headY - 1, headColor);
    px(ctx, x0, y0, sx - 1, headY, headColor);
    px(ctx, x0, y0, sx + 1, headY, headColor);
    px(ctx, x0, y0, sx, headY + 1, shade(headColor, -0.1));
  }
}

const PAINTERS = {
  grass_top: (c, x, y, r) => { noisyFill(c, x, y, r, '#5f9e46', 0.06, { chance: 0.05, color: '#77b558' }); },
  grass_side: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#79583b', 0.05);
    for (let lx = 0; lx < LP; lx++) {
      const depth = 2 + Math.floor(r() * 3);
      for (let ly = 0; ly < depth; ly++) px(c, x, y, lx, ly, shade('#5f9e46', (r() - 0.5) * 0.1));
    }
  },
  dirt: (c, x, y, r) => noisyFill(c, x, y, r, '#79583b', 0.06, { chance: 0.06, color: '#8d6c4a' }),
  stone: (c, x, y, r) => noisyFill(c, x, y, r, '#8a8d90', 0.05, { chance: 0.08, color: '#75787c' }),
  cobble: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#6f7276', 0.04);
    for (let i = 0; i < 7; i++) {
      const bx = Math.floor(r() * (LP - 4)), by = Math.floor(r() * (LP - 4));
      const w = 3 + Math.floor(r() * 3), h = 3 + Math.floor(r() * 2);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++)
        px(c, x, y, bx + xx, by + yy, shade('#94979b', (r() - 0.5) * 0.1));
    }
  },
  sand: (c, x, y, r) => noisyFill(c, x, y, r, '#ddc98a', 0.05),
  gravel: (c, x, y, r) => noisyFill(c, x, y, r, '#9a938c', 0.09, { chance: 0.15, color: '#7c766f' }),
  clay_block: (c, x, y, r) => noisyFill(c, x, y, r, '#a9927f', 0.04, { chance: 0.1, color: '#b7a693' }),
  snow: (c, x, y, r) => noisyFill(c, x, y, r, '#e9f0f4', 0.03),
  snow_side: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#79583b', 0.05);
    for (let lx = 0; lx < LP; lx++) for (let ly = 0; ly < 3; ly++) px(c, x, y, lx, ly, shade('#e9f0f4', (r() - 0.5) * 0.04));
  },
  ice: (c, x, y, r) => noisyFill(c, x, y, r, '#a8d2e8', 0.04, { chance: 0.06, color: '#c8e6f4' }),
  water: (c, x, y, r) => noisyFill(c, x, y, r, '#3f6fae', 0.05, { chance: 0.08, color: '#4f83c4' }),
  bedrock: (c, x, y, r) => noisyFill(c, x, y, r, '#3a3d42', 0.08),
  lava: (c, x, y, r) => noisyFill(c, x, y, r, '#d8622a', 0.1, { chance: 0.2, color: '#f2a134' }),

  fernwood_bark: (c, x, y, r) => bark(c, x, y, r, '#7a6248', '#64503a'),
  fernwood_ring: (c, x, y, r) => rings(c, x, y, r, '#a98d63', '#8d744f'),
  fernwood_leaves: (c, x, y, r) => leaves(c, x, y, r, '#4d8f3e', '#66aa50'),
  silverbark_bark: (c, x, y, r) => bark(c, x, y, r, '#c9cdd1', '#a9adb3'),
  silverbark_ring: (c, x, y, r) => rings(c, x, y, r, '#d9cba9', '#bfae8b'),
  silverbark_leaves: (c, x, y, r) => leaves(c, x, y, r, '#7fae53', '#a4c979', 0.1),
  emberpine_bark: (c, x, y, r) => bark(c, x, y, r, '#5d4034', '#4a3128'),
  emberpine_ring: (c, x, y, r) => rings(c, x, y, r, '#8d6748', '#75543a'),
  emberpine_needles: (c, x, y, r) => leaves(c, x, y, r, '#2f6b46', '#e0813f', 0.03),

  copper_ore: (c, x, y, r) => { PAINTERS.stone(c, x, y, r); oreBlobs(c, x, y, r, '#c47a3f', '#e8a668'); },
  tin_ore: (c, x, y, r) => { PAINTERS.stone(c, x, y, r); oreBlobs(c, x, y, r, '#c9ccd4', '#eef1f6'); },
  iron_ore: (c, x, y, r) => { PAINTERS.stone(c, x, y, r); oreBlobs(c, x, y, r, '#b08674', '#d4a893'); },
  silvervein: (c, x, y, r) => { PAINTERS.stone(c, x, y, r); oreBlobs(c, x, y, r, '#dfe4ec', '#ffffff', 3); },
  emberstone_ore: (c, x, y, r) => { noisyFill(c, x, y, r, '#4a3d3a', 0.05); oreBlobs(c, x, y, r, '#e2622c', '#ffb04e', 5); },
  crystal_cluster: (c, x, y, r) => {
    c.clearRect(x, y, TILE, TILE);
    for (let i = 0; i < 5; i++) {
      const bx = 1 + Math.floor(r() * (LP - 4));
      const h = 4 + Math.floor(r() * 7);
      const col = r() < 0.5 ? '#9db8f4' : '#c3a8f2';
      for (let j = 0; j < h; j++) {
        px(c, x, y, bx, LP - 1 - j, shade(col, j / h * 0.25));
        if (j < h - 2) px(c, x, y, bx + 1, LP - 1 - j, shade(col, -0.08));
      }
    }
  },
  depleted_rock: (c, x, y, r) => noisyFill(c, x, y, r, '#5f6266', 0.05, { chance: 0.12, color: '#4c4f53' }),

  tall_grass: (c, x, y, r) => cross(c, x, y, r, () => { blades(c, x, y, r, '#69a850', 22); blades(c, x, y, r, '#7fbd63', 12); }),
  wildflower: (c, x, y, r) => cross(c, x, y, r, () => {
    blades(c, x, y, r, '#69a850', 8);
    plantStalk(c, x, y, r, '#4d7d3b', r() < 0.5 ? '#e2b13c' : '#c76a92', 5);
  }),
  herb_patch: (c, x, y, r) => cross(c, x, y, r, () => {
    blades(c, x, y, r, '#3f7d4f', 10);
    plantStalk(c, x, y, r, '#3f7d4f', '#8fd0a0', 4);
    plantStalk(c, x, y, r, '#3f7d4f', '#63b9d6', 6);
  }),
  herb_patch_cut: (c, x, y, r) => cross(c, x, y, r, () => blades(c, x, y, r, '#5d7a52', 8)),
  berry_bush: (c, x, y, r) => {
    leaves(c, x, y, r, '#3d7a37', '#57964d');
    for (let i = 0; i < 8; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), '#c94a6b');
  },
  berry_bush_bare: (c, x, y, r) => leaves(c, x, y, r, '#4b6b42', '#5d7a52', 0.02),
  mushroom_cap: (c, x, y, r) => cross(c, x, y, r, () => {
    const sx = LP / 2;
    for (let j = 0; j < 4; j++) px(c, x, y, sx, LP - 1 - j, '#d9cfc0');
    for (let dx = -2; dx <= 2; dx++) px(c, x, y, sx + dx, LP - 5, '#b0653f');
    for (let dx = -1; dx <= 1; dx++) px(c, x, y, sx + dx, LP - 6, '#c4764e');
  }),
  reed: (c, x, y, r) => cross(c, x, y, r, () => { blades(c, x, y, r, '#7ba05a', 6); plantStalk(c, x, y, r, '#8fae62', null); plantStalk(c, x, y, r, '#7ba05a', '#c9b458', 3); }),
  cactus_flesh: (c, x, y, r) => { noisyFill(c, x, y, r, '#4e8a44', 0.05); for (let i = 0; i < 8; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), '#dfe8c8'); },
  dig_mound: (c, x, y, r) => noisyFill(c, x, y, r, '#8a6f4d', 0.07, { chance: 0.1, color: '#a5854f' }),
  farmland: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#5c4128', 0.05);
    for (let ly = 1; ly < LP; ly += 4) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, shade('#4a3420', (r() - 0.5) * 0.06));
  },
  crop_young: (c, x, y, r) => cross(c, x, y, r, () => blades(c, x, y, r, '#7fb95d', 10)),
  crop_ripe: (c, x, y, r) => cross(c, x, y, r, () => { blades(c, x, y, r, '#c9b458', 14); plantStalk(c, x, y, r, '#c9b458', '#e2cf6b', 3); }),

  planks: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#a5814f', 0.04);
    for (let ly = 3; ly < LP; ly += 4) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, '#87683d');
    for (let i = 0; i < 4; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), '#6f5532');
  },
  timber_wall: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#96754a', 0.04);
    for (let lx = 3; lx < LP; lx += 4) for (let ly = 0; ly < LP; ly++) px(c, x, y, lx, ly, '#7a5e3a');
  },
  thatch: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#c2a55a', 0.06);
    for (let i = 0; i < 26; i++) {
      const lx = Math.floor(r() * LP), ly = Math.floor(r() * (LP - 3));
      for (let j = 0; j < 3; j++) px(c, x, y, lx, ly + j, shade('#a8893f', (r() - 0.5) * 0.08));
    }
  },
  stone_brick: (c, x, y, r) => brick(c, x, y, r, '#95989c', '#6f7276'),
  ruin_brick: (c, x, y, r) => brick(c, x, y, r, '#7d7a70', '#5c594f'),
  mossy_ruin: (c, x, y, r) => { brick(c, x, y, r, '#7d7a70', '#5c594f'); for (let i = 0; i < 20; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), shade('#5e7a45', (r() - 0.5) * 0.1)); },
  rootstone: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#6b6458', 0.05);
    for (let i = 0; i < 4; i++) {
      let lx = Math.floor(r() * LP);
      for (let ly = 0; ly < LP; ly++) {
        px(c, x, y, ((lx % LP) + LP) % LP, ly, '#54724a');
        if (r() < 0.4) lx += r() < 0.5 ? 1 : -1;
      }
    }
  },
  glasspane: (c, x, y, r) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = 'rgba(190,220,235,0.35)';
    c.fillRect(x, y, TILE, TILE);
    for (let i = 0; i < LP; i++) { px(c, x, y, i, 0, '#b9c6cd'); px(c, x, y, i, LP - 1, '#b9c6cd'); px(c, x, y, 0, i, '#b9c6cd'); px(c, x, y, LP - 1, i, '#b9c6cd'); }
    px(c, x, y, 3, 3, 'rgba(255,255,255,0.7)'); px(c, x, y, 4, 4, 'rgba(255,255,255,0.5)');
  },
  torch_post: (c, x, y, r) => cross(c, x, y, r, () => {
    const sx = LP / 2;
    for (let j = 0; j < 7; j++) px(c, x, y, sx, LP - 1 - j, '#7a6248');
    px(c, x, y, sx, LP - 8, '#f2a134'); px(c, x, y, sx, LP - 9, '#ffd166');
    px(c, x, y, sx - 1, LP - 8, '#e2622c'); px(c, x, y, sx + 1, LP - 8, '#e2622c');
  }),
  obsidian_glass: (c, x, y, r) => noisyFill(c, x, y, r, '#231d2e', 0.05, { chance: 0.05, color: '#4d3f66' }),
  corrupt_soil: (c, x, y, r) => noisyFill(c, x, y, r, '#4d3a54', 0.06, { chance: 0.08, color: '#6d4d7a' }),
  ashen_soil: (c, x, y, r) => noisyFill(c, x, y, r, '#5a5450', 0.06, { chance: 0.1, color: '#787069' }),
  basalt: (c, x, y, r) => noisyFill(c, x, y, r, '#454247', 0.05, { chance: 0.08, color: '#39363b' }),

  workbench_top: (c, x, y, r) => {
    PAINTERS.planks(c, x, y, r);
    for (let i = 0; i < 4; i++) px(c, x, y, 2 + i, 3, '#5c5f63');
    for (let i = 0; i < 3; i++) px(c, x, y, 10, 9 + i, '#8d5a34');
    px(c, x, y, 11, 9, '#c9ccd4');
  },
  workbench_side: (c, x, y, r) => { PAINTERS.timber_wall(c, x, y, r); },
  furnace_front: (c, x, y, r) => {
    PAINTERS.stone_brick(c, x, y, r);
    for (let yy = 9; yy < 14; yy++) for (let xx = 5; xx < 11; xx++) px(c, x, y, xx, yy, '#2a2622');
    for (let xx = 6; xx < 10; xx++) px(c, x, y, xx, 12, '#e2622c');
    px(c, x, y, 7, 11, '#ffb04e');
  },
  anvil: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#4c4f54', 0.04);
    for (let xx = 2; xx < 14; xx++) px(c, x, y, xx, 4, '#6a6e74');
    for (let xx = 2; xx < 14; xx++) px(c, x, y, xx, 5, '#5c6066');
  },
  campfire: (c, x, y, r) => {
    c.clearRect(x, y, TILE, TILE);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      px(c, x, y, Math.round(LP / 2 + Math.cos(a) * 5), Math.round(LP - 3 + Math.sin(a) * 0.5), '#6f5532');
      px(c, x, y, Math.round(LP / 2 + Math.cos(a) * 4), LP - 4, '#7a6248');
    }
    px(c, x, y, 7, 10, '#e2622c'); px(c, x, y, 8, 9, '#ffb04e'); px(c, x, y, 8, 11, '#f2a134'); px(c, x, y, 9, 10, '#e2622c'); px(c, x, y, 8, 8, '#ffd166');
  },
  alchemy_top: (c, x, y, r) => {
    PAINTERS.planks(c, x, y, r);
    px(c, x, y, 4, 4, '#63b9d6'); px(c, x, y, 4, 5, '#4f83c4');
    px(c, x, y, 10, 8, '#8fd0a0'); px(c, x, y, 10, 9, '#57964d');
    px(c, x, y, 7, 11, '#c3a8f2');
  },
  loom: (c, x, y, r) => {
    PAINTERS.timber_wall(c, x, y, r);
    for (let ly = 3; ly < 13; ly++) for (let lx = 5; lx < 11; lx += 2) px(c, x, y, lx, ly, '#d9cba9');
  },
  altar_top: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#4d4a56', 0.04);
    const runes = [[4, 4], [11, 4], [4, 11], [11, 11], [8, 8]];
    for (const [rx, ry] of runes) { px(c, x, y, rx, ry, '#9db8f4'); px(c, x, y, rx + 1, ry, '#c3a8f2'); }
  },
  altar_side: (c, x, y, r) => { noisyFill(c, x, y, r, '#4d4a56', 0.04); for (let i = 0; i < 5; i++) px(c, x, y, 2 + i * 3, 8, '#9db8f4'); },
  construction_top: (c, x, y, r) => {
    PAINTERS.planks(c, x, y, r);
    for (let i = 0; i < 6; i++) px(c, x, y, 3 + i, 6, '#5c5f63');
    for (let i = 0; i < 4; i++) px(c, x, y, 3, 6 + i, '#5c5f63');
  },
  chest_front: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#8d6c42', 0.04);
    for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, 0, '#6f5532'); px(c, x, y, lx, 7, '#6f5532'); px(c, x, y, lx, LP - 1, '#6f5532'); }
    for (let ly = 0; ly < LP; ly++) { px(c, x, y, 0, ly, '#6f5532'); px(c, x, y, LP - 1, ly, '#6f5532'); }
    px(c, x, y, 7, 7, '#e2b13c'); px(c, x, y, 8, 7, '#e2b13c'); px(c, x, y, 7, 8, '#c9982f'); px(c, x, y, 8, 8, '#c9982f');
  },
  chest_top: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#8d6c42', 0.04);
    for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, 0, '#6f5532'); px(c, x, y, lx, LP - 1, '#6f5532'); }
    for (let ly = 0; ly < LP; ly++) { px(c, x, y, 0, ly, '#6f5532'); px(c, x, y, LP - 1, ly, '#6f5532'); }
  },

  // ---- creature skin materials -------------------------------------------
  // Painted bright/grayscale: the entity shader multiplies these by each
  // box's color, so one fur tile becomes brown boar fur or white wolf fur.
  skin_solid: (c, x, y, r) => noisyFill(c, x, y, r, '#f2f2f2', 0.03),
  skin_fur: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#e8e8e8', 0.05);
    for (let i = 0; i < 30; i++) {
      const lx = Math.floor(r() * LP), ly = Math.floor(r() * (LP - 3));
      const shade = r() < 0.5 ? '#c2c2c2' : '#a8a8a8';
      for (let j = 0; j < 2 + Math.floor(r() * 2); j++) px(c, x, y, lx, ly + j, shade);
    }
  },
  skin_hide: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#ececec', 0.04, { chance: 0.1, color: '#cfcfcf' });
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor(r() * (LP - 3)), by = Math.floor(r() * (LP - 3));
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2 + Math.floor(r() * 2); dx++) {
        px(c, x, y, bx + dx, by + dy, '#bdbdbd');
      }
    }
  },
  skin_scales: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#e4e4e4', 0.03);
    for (let row = 0; row < LP; row += 3) {
      const off = (row / 3) % 2 === 0 ? 0 : 2;
      for (let sx = off; sx < LP; sx += 4) {
        px(c, x, y, sx, row, '#b8b8b8'); px(c, x, y, sx + 1, row, '#b8b8b8');
        px(c, x, y, sx, row + 1, '#fbfbfb');
      }
    }
  },
  skin_stone: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#e0e0e0', 0.05, { chance: 0.08, color: '#c6c6c6' });
    let lx = Math.floor(r() * LP);
    for (let ly = 0; ly < LP; ly++) {
      px(c, x, y, ((lx % LP) + LP) % LP, ly, '#a8a8a8');
      if (r() < 0.5) lx += r() < 0.5 ? 1 : -1;
    }
    for (let i = 0; i < 5; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), '#9c9c9c');
  },
  skin_bark: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#e6e2da', 0.04);
    for (let lx = 1; lx < LP; lx += 3) {
      for (let ly = 0; ly < LP; ly++) if (r() < 0.85) px(c, x, y, lx, ly, '#bab4a6');
    }
  },
  skin_metal: (c, x, y, r) => {
    for (let ly = 0; ly < LP; ly++) {
      const band = 0.88 + 0.1 * Math.sin(ly * 1.1);
      for (let lx = 0; lx < LP; lx++) {
        const v = Math.round(238 * band + (r() - 0.5) * 10);
        px(c, x, y, lx, ly, `rgb(${v},${v},${v})`);
      }
    }
    for (const [rx, ry] of [[2, 2], [LP - 3, 2], [2, LP - 3], [LP - 3, LP - 3]]) px(c, x, y, rx, ry, '#9a9a9a');
  },
  skin_cloth: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#eeeeee', 0.03);
    for (let ly = 0; ly < LP; ly += 2) for (let lx = ly % 4 === 0 ? 0 : 2; lx < LP; lx += 4) {
      px(c, x, y, lx, ly, '#d4d4d4');
    }
  },
  skin_straw: (c, x, y, r) => {
    noisyFill(c, x, y, r, '#efe9d2', 0.05);
    for (let i = 0; i < 22; i++) {
      const lx = Math.floor(r() * LP), ly = Math.floor(r() * (LP - 4));
      for (let j = 0; j < 4; j++) px(c, x, y, lx, ly + j, '#cfc49a');
    }
  },
  skin_glow: (c, x, y, r) => {
    const cx = LP / 2 - 0.5, cy = LP / 2 - 0.5;
    for (let ly = 0; ly < LP; ly++) for (let lx = 0; lx < LP; lx++) {
      const d = Math.hypot(lx - cx, ly - cy) / (LP / 2);
      const v = Math.round(255 * Math.max(0.55, 1.05 - d * 0.5) + (r() - 0.5) * 8);
      px(c, x, y, lx, ly, `rgb(${Math.min(255, v)},${Math.min(255, v)},${Math.min(255, v)})`);
    }
  },
  skin_face: (c, x, y, r) => {
    // bright base so it tints like the rest of the head; dark eyes + muzzle
    noisyFill(c, x, y, r, '#f0f0f0', 0.03);
    for (const ex of [4, 10]) {
      px(c, x, y, ex, 5, '#26262b'); px(c, x, y, ex + 1, 5, '#26262b');
      px(c, x, y, ex, 6, '#26262b'); px(c, x, y, ex + 1, 6, '#26262b');
      px(c, x, y, ex, 5, '#3a3a44'); // corner glint
    }
    for (let lx = 6; lx <= 9; lx++) px(c, x, y, lx, 11, '#8f8578');
    px(c, x, y, 7, 12, '#6e6659'); px(c, x, y, 8, 12, '#6e6659');
  },
};

// ---- generated realistic tiles (from js/game/materials.js) -----------------
// Presentation palettes live here, not in the material spine. Each entry:
// bark:[base,groove], ring:[base,line], leaf:[base,accent], needle? evergreen.
const WOOD_TEX = {
  pine:         { bark: ['#7c5a3a', '#5f4429'], ring: ['#c8a878', '#a98a5c'], leaf: ['#3f6f4a', '#568a5c'], needle: true },
  cedar:        { bark: ['#8a4f38', '#6a3a28'], ring: ['#c99a72', '#a87a54'], leaf: ['#4a7a54', '#69a06a'], needle: true },
  birch:        { bark: ['#d9d4c6', '#b7b0a0'], ring: ['#e2d6b6', '#c4b48c'], leaf: ['#7fae53', '#a4c979'] },
  oak:          { bark: ['#7a6248', '#5f4c38'], ring: ['#b39468', '#96784f'], leaf: ['#4d8f3e', '#66aa50'] },
  ash:          { bark: ['#9a8c74', '#7a6e58'], ring: ['#c9bd9e', '#a89a78'], leaf: ['#6a9a4e', '#88b96a'] },
  hickory:      { bark: ['#7d6244', '#5e4931'], ring: ['#c0a074', '#a08052'], leaf: ['#5d8f45', '#79ab5f'] },
  maple:        { bark: ['#8a6a4a', '#6a4f36'], ring: ['#d2b280', '#b4945c'], leaf: ['#b7702f', '#d99a3f'] },
  walnut:       { bark: ['#4f3a28', '#3a281a'], ring: ['#8a6a48', '#6c4f34'], leaf: ['#4a7a3e', '#639654'] },
  yew:          { bark: ['#7a4a3a', '#5a352a'], ring: ['#b98a6a', '#986a4c'], leaf: ['#2f5f3f', '#457a52'], needle: true },
  teak:         { bark: ['#9a6f42', '#764f2c'], ring: ['#c99a5e', '#a87a42'], leaf: ['#5a8a4a', '#77a662'] },
  ebony:        { bark: ['#2c2620', '#1a1712'], ring: ['#4a4038', '#332b24'], leaf: ['#33613f', '#4a7a52'] },
  lignum_vitae: { bark: ['#5a5236', '#403a24'], ring: ['#7a7248', '#5c5636'], leaf: ['#2f5a3a', '#437049'] },
};
// ore blob color + glint per mineable metal
const ORE_TEX = {
  copper:   ['#c47a3f', '#e8a668'], tin: ['#c9ccd4', '#eef1f6'], iron: ['#b08674', '#d4a893'],
  lead:     ['#6c7079', '#9298a2'], zinc: ['#b8c0c4', '#dfe6ea'], silver: ['#dfe4ec', '#ffffff'],
  gold:     ['#e2b13c', '#ffd76a'], platinum: ['#d8dbe0', '#f4f6fa'], meteoric: ['#6b6a72', '#a29fb0'],
};
for (const w of WOODS) {
  const t = WOOD_TEX[w.id]; if (!t) continue;
  PAINTERS[`${w.id}_bark`] ??= (c, x, y, r) => bark(c, x, y, r, t.bark[0], t.bark[1]);
  PAINTERS[`${w.id}_ring`] ??= (c, x, y, r) => rings(c, x, y, r, t.ring[0], t.ring[1]);
  PAINTERS[`${w.id}_leaves`] ??= (c, x, y, r) => leaves(c, x, y, r, t.leaf[0], t.leaf[1], t.needle ? 0.03 : 0.08);
}
for (const m of METALS.filter((x) => (x.smelt || []).some((s) => s.endsWith('_ore')))) {
  const t = ORE_TEX[m.id]; if (!t) continue;
  PAINTERS[`${m.id}_ore`] ??= (c, x, y, r) => { PAINTERS.stone(c, x, y, r); oreBlobs(c, x, y, r, t[0], t[1], m.rare ? 3 : 4); };
}
PAINTERS.coal_seam ??= (c, x, y, r) => { noisyFill(c, x, y, r, '#3a3733', 0.05); oreBlobs(c, x, y, r, '#1e1c1a', '#4a4642', 5); };
PAINTERS.saltpeter_deposit ??= (c, x, y, r) => { PAINTERS.stone(c, x, y, r); oreBlobs(c, x, y, r, '#e7e2c0', '#f6f2d8', 4); };
PAINTERS.sulfur_deposit ??= (c, x, y, r) => { noisyFill(c, x, y, r, '#4a4640', 0.05); oreBlobs(c, x, y, r, '#d9c43a', '#f2e05a', 5); };
PAINTERS.meteor_crater ??= (c, x, y, r) => { noisyFill(c, x, y, r, '#2e2b30', 0.07, { chance: 0.12, color: '#4a4650' }); oreBlobs(c, x, y, r, '#6b6a72', '#a29fb0', 3); };

// ---- Tier-1 natural building stone + refined metal blocks -------------------
PAINTERS.granite ??= (c, x, y, r) => { noisyFill(c, x, y, r, '#9b6b5c', 0.06, { chance: 0.10, color: '#c8a58f' }); oreBlobs(c, x, y, r, '#6f4a40', '#d8c4b0', 3); };
PAINTERS.andesite ??= (c, x, y, r) => noisyFill(c, x, y, r, '#8c8f8b', 0.06, { chance: 0.10, color: '#b2b5b1' });
PAINTERS.marble ??= (c, x, y, r) => {
  noisyFill(c, x, y, r, '#e7e5df', 0.03);
  for (let i = 0; i < 3; i++) { let vx = Math.floor(r() * LP); for (let yy = 0; yy < LP; yy++) { vx = ((vx + Math.round((r() - 0.5) * 2)) % LP + LP) % LP; px(c, x, y, vx, yy, '#c7c5bd'); } }
};
PAINTERS.deepslate ??= (c, x, y, r) => { noisyFill(c, x, y, r, '#3c3e44', 0.05); for (let yy = 0; yy < LP; yy += 3) for (let xx = 0; xx < LP; xx++) if (r() < 0.4) px(c, x, y, xx, yy, shade('#3c3e44', -0.08)); };
PAINTERS.sandstone_top ??= (c, x, y, r) => noisyFill(c, x, y, r, '#d8c48f', 0.035);
PAINTERS.sandstone ??= (c, x, y, r) => { noisyFill(c, x, y, r, '#d8c48f', 0.04); for (let yy = 0; yy < LP; yy += 8) for (let xx = 0; xx < LP; xx++) px(c, x, y, xx, yy, shade('#c9b075', -0.06)); };
PAINTERS.brick ??= (c, x, y, r) => brick(c, x, y, r, '#9e4b3b', '#ccc2b6');
PAINTERS.copper_block ??= (c, x, y, r) => noisyFill(c, x, y, r, '#c17a44', 0.05, { chance: 0.08, color: '#e0a06a' });
PAINTERS.copper_weathered ??= (c, x, y, r) => noisyFill(c, x, y, r, '#54a082', 0.05, { chance: 0.12, color: '#7ab89a' });
PAINTERS.iron_block ??= (c, x, y, r) => { noisyFill(c, x, y, r, '#d3d3d6', 0.03); for (let xx = 2; xx < LP; xx += 6) for (let yy = 0; yy < LP; yy++) if (r() < 0.5) px(c, x, y, xx, yy, shade('#d3d3d6', -0.06)); };
PAINTERS.gold_block ??= (c, x, y, r) => noisyFill(c, x, y, r, '#e6c132', 0.04, { chance: 0.08, color: '#fff08a' });

// Green moss clumps scattered over a base stone tile (mossy cobblestone / bricks)
function mossOver(c, x, y, r, clumps = 11) {
  for (let i = 0; i < clumps; i++) {
    const bx = Math.floor(r() * LP), by = Math.floor(r() * LP), n = 3 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) {
      const px_ = bx + Math.floor((r() - 0.5) * 4), py_ = by + Math.floor((r() - 0.5) * 4);
      if (px_ >= 0 && px_ < LP && py_ >= 0 && py_ < LP) px(c, x, y, px_, py_, shade('#5f7a3c', (r() - 0.5) * 0.25));
    }
  }
}
PAINTERS.mossy_cobble ??= (c, x, y, r) => { PAINTERS.cobble(c, x, y, r); mossOver(c, x, y, r); };
PAINTERS.mossy_stone_brick ??= (c, x, y, r) => { PAINTERS.stone_brick(c, x, y, r); mossOver(c, x, y, r, 9); };

// ---- Colored block families: tint one base pattern per dye colour -----------
function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A[0] + (B[0] - A[0]) * t), g = Math.round(A[1] + (B[1] - A[1]) * t), bl = Math.round(A[2] + (B[2] - A[2]) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

const COLOR_PAINTERS = {
  wool: (hex) => (c, x, y, r) => {
    noisyFill(c, x, y, r, hex, 0.07);
    for (let j = 0; j < LP; j++) for (let i = 0; i < LP; i++) if ((i + j) % 2 === 0 && r() < 0.4) px(c, x, y, i, j, shade(hex, -0.06));
  },
  concrete: (hex) => (c, x, y, r) => noisyFill(c, x, y, r, hex, 0.025),
  concrete_powder: (hex) => (c, x, y, r) => noisyFill(c, x, y, r, hex, 0.11, { chance: 0.10, color: mix(hex, '#ffffff', 0.16) }),
  terracotta: (hex) => { const base = mix(hex, '#8a5a40', 0.5); return (c, x, y, r) => { noisyFill(c, x, y, r, base, 0.05); for (let yy = 0; yy < LP; yy += 6) for (let xx = 0; xx < LP; xx++) if (r() < 0.5) px(c, x, y, xx, yy, shade(base, -0.08)); }; },
  glazed_terracotta: (hex) => { const lite = mix(hex, '#ffffff', 0.14); return (c, x, y, r) => { noisyFill(c, x, y, r, lite, 0.02); for (let i = 0; i < LP; i++) { px(c, x, y, i, i, shade(hex, -0.22)); px(c, x, y, i, (i + 8) % LP, shade(hex, 0.14)); px(c, x, y, LP - 1 - i, i, shade(hex, -0.1)); } }; },
  stained_glass: (hex) => (c, x, y, r) => {
    c.clearRect(x, y, TILE, TILE); c.fillStyle = rgba(hex, 0.42); c.fillRect(x, y, TILE, TILE);
    const fr = shade(hex, -0.15);
    for (let i = 0; i < LP; i++) { px(c, x, y, i, 0, fr); px(c, x, y, i, LP - 1, fr); px(c, x, y, 0, i, fr); px(c, x, y, LP - 1, i, fr); }
    px(c, x, y, 3, 3, 'rgba(255,255,255,0.6)'); px(c, x, y, 4, 4, 'rgba(255,255,255,0.4)');
  },
};
for (const [id, hex] of COLORS) {
  PAINTERS[`${id}_wool`] ??= COLOR_PAINTERS.wool(hex);
  PAINTERS[`${id}_concrete`] ??= COLOR_PAINTERS.concrete(hex);
  PAINTERS[`${id}_concrete_powder`] ??= COLOR_PAINTERS.concrete_powder(hex);
  PAINTERS[`${id}_terracotta`] ??= COLOR_PAINTERS.terracotta(hex);
  PAINTERS[`${id}_glazed_terracotta`] ??= COLOR_PAINTERS.glazed_terracotta(hex);
  PAINTERS[`${id}_stained_glass`] ??= COLOR_PAINTERS.stained_glass(hex);
}
PAINTERS.terracotta ??= COLOR_PAINTERS.terracotta('#9a6045'); // plain fired clay

// ---- Decorative town blocks (schematic-import equivalents) ------------------
// Transparent cross-cutout flowers: a green stem + leaves and a coloured bloom.
function flowerStem(c, x, y, r, sx, stem, fromY) {
  for (let yy = fromY; yy < LP; yy++) px(c, x, y, sx, yy, shade(stem, (r() - 0.5) * 0.12));
  px(c, x, y, sx - 2, fromY + 4, stem); px(c, x, y, sx - 3, fromY + 4, shade(stem, -0.08));
  px(c, x, y, sx + 2, fromY + 7, stem); px(c, x, y, sx + 3, fromY + 7, shade(stem, -0.08));
}
function tulipPainter(petal) {
  return (c, x, y, r) => cross(c, x, y, r, () => {
    const sx = LP / 2, hi = shade(petal, 0.13), lo = shade(petal, -0.15);
    flowerStem(c, x, y, r, sx, '#4d7d3b', 12);
    for (let dx = -2; dx <= 2; dx++) px(c, x, y, sx + dx, 11, petal);
    for (let dx = -2; dx <= 2; dx++) px(c, x, y, sx + dx, 10, dx === 0 ? hi : petal);
    px(c, x, y, sx - 2, 9, petal); px(c, x, y, sx + 2, 9, petal); px(c, x, y, sx, 8, hi);
    px(c, x, y, sx - 1, 12, lo); px(c, x, y, sx + 1, 12, lo);
  });
}
PAINTERS.orange_tulip = tulipPainter('#e07a1f');
PAINTERS.pink_tulip = tulipPainter('#e58fb8');
PAINTERS.white_tulip = tulipPainter('#eef0ef');
PAINTERS.allium = (c, x, y, r) => cross(c, x, y, r, () => {
  const sx = LP / 2, col = '#9a5fc4';
  flowerStem(c, x, y, r, sx, '#4d7d3b', 13);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, rad = r() * 3.4;
    px(c, x, y, Math.round(sx + Math.cos(a) * rad), Math.round(7 + Math.sin(a) * rad), shade(col, (r() - 0.5) * 0.3));
  }
  px(c, x, y, sx, 6, '#c9a8e6');
});
PAINTERS.blue_orchid = (c, x, y, r) => cross(c, x, y, r, () => {
  const sx = LP / 2, col = '#2f8fd6';
  flowerStem(c, x, y, r, sx, '#3f7d5a', 12);
  for (const [dx, dy] of [[0, 8], [-2, 9], [2, 9], [-1, 7], [1, 7], [0, 10]]) px(c, x, y, sx + dx, dy, col);
  px(c, x, y, sx, 8, '#7fc4ee'); px(c, x, y, sx, 9, '#e8d24a'); // highlight + yellow throat
});
PAINTERS.oxeye_daisy = (c, x, y, r) => cross(c, x, y, r, () => {
  const sx = LP / 2, petal = '#f2f4f0';
  flowerStem(c, x, y, r, sx, '#4d7d3b', 12);
  for (const [dx, dy] of [[0, 6], [0, 10], [-2, 8], [2, 8], [-2, 6], [2, 6], [-2, 10], [2, 10]]) px(c, x, y, sx + dx, dy, petal);
  px(c, x, y, sx, 8, '#e6c437'); px(c, x, y, sx - 1, 8, '#e6c437'); px(c, x, y, sx, 7, '#f2d658'); // yellow disc
});
PAINTERS.rose_bush = (c, x, y, r) => cross(c, x, y, r, () => {
  const sx = LP / 2;
  blades(c, x, y, r, '#3d6f35', 16);
  for (let yy = 6; yy < LP; yy++) px(c, x, y, sx, yy, shade('#3d6f35', (r() - 0.5) * 0.1));
  for (const [cx, cy] of [[sx - 3, 8], [sx + 4, 12]]) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) px(c, x, y, cx + dx, cy + dy, shade('#c0303a', (r() - 0.5) * 0.2));
    px(c, x, y, cx, cy, '#e0555c');
  }
});
// Iron bars — transparent grey metal grille (vertical bars, top/bottom rails).
PAINTERS.iron_bars = (c, x, y, r) => {
  c.clearRect(x, y, TILE, TILE);
  const bar = '#b9bcc2', edge = '#8a8d93', hi = '#dfe2e6';
  for (const bx of [6, 12, 19, 25]) for (let yy = 0; yy < LP; yy++) {
    px(c, x, y, bx, yy, shade(bar, (r() - 0.5) * 0.06)); px(c, x, y, bx + 1, yy, edge);
    if (yy % 6 === 2) px(c, x, y, bx, yy, hi);
  }
  for (let xx = 0; xx < LP; xx++) { px(c, x, y, xx, 0, edge); px(c, x, y, xx, 1, bar); px(c, x, y, xx, LP - 1, edge); }
};
// Chain — a dark interlocking link run down the centre strip (only the middle
// of the tile shows on an isolated pane post).
PAINTERS.chain = (c, x, y, r) => {
  c.clearRect(x, y, TILE, TILE);
  const link = '#5a5e66', hi = '#8b9099', dk = '#3a3d43';
  for (let ly = 0; ly < LP; ly++) px(c, x, y, LP / 2, ly, dk);
  for (let ly = 0; ly < LP; ly += 6) {
    const cx = LP / 2 + ((ly / 6) % 2 ? 1 : -1);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const lx = Math.round(cx + Math.cos(ang) * 1.7), ly2 = Math.round(ly + 3 + Math.sin(ang) * 2.6);
      if (ly2 >= 0 && ly2 < LP) px(c, x, y, lx, ly2, a < 2 ? hi : link);
    }
  }
};
// Ladder — transparent wooden rails + rungs (renders as a cross billboard).
PAINTERS.ladder = (c, x, y, r) => cross(c, x, y, r, () => {
  const wood = '#8a6a3f', dk = '#6b4f2c', hi = '#a5824f';
  for (const rx of [10, 21]) for (let yy = 1; yy < LP - 1; yy++) { px(c, x, y, rx, yy, wood); px(c, x, y, rx + 1, yy, dk); }
  for (let ry = 4; ry < LP; ry += 6) for (let xx = 10; xx <= 22; xx++) { px(c, x, y, xx, ry, hi); px(c, x, y, xx, ry + 1, dk); }
});
// Sign — plank grain with a lighter board across the tile's top half (the board
// face; the bottom half maps onto the short post).
PAINTERS.sign = (c, x, y, r) => {
  PAINTERS.planks(c, x, y, r);
  for (let yy = 0; yy < LP / 2; yy++) for (let xx = 0; xx < LP; xx++) px(c, x, y, xx, yy, shade('#c19a5e', (r() - 0.5) * 0.06));
  for (let yy = 3; yy < LP / 2; yy += 4) for (let xx = 2; xx < LP - 2; xx++) px(c, x, y, xx, yy, '#a5824f');
  for (let xx = 6; xx < 26; xx += 2) { px(c, x, y, xx, 7, '#7a5f38'); px(c, x, y, xx, 11, '#7a5f38'); } // faint engraving
};

// ---- Second wave of town blocks (batch 2) — distinct tiles carry identity ----
// Cubes & fixtures.
PAINTERS.note_block = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#5a4632', 0.04);
  for (let ly = 3; ly < LP; ly += 6) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, '#463628'); // plank grooves
  const nx = 13, ny = 8, ink = '#161616';                       // a musical note glyph
  for (let j = 0; j < 4; j++) px(c, x, y, nx, ny + j, ink);
  px(c, x, y, nx - 1, ny + 4, ink); px(c, x, y, nx - 2, ny + 4, ink); px(c, x, y, nx - 2, ny + 3, ink);
  px(c, x, y, nx + 1, ny - 1, ink); px(c, x, y, nx + 2, ny - 1, ink); px(c, x, y, nx + 2, ny, ink);
};
PAINTERS.note_block_top = (c, x, y, r) => { noisyFill(c, x, y, r, '#6a5238', 0.04); for (let lx = 3; lx < LP; lx += 5) for (let ly = 0; ly < LP; ly++) px(c, x, y, lx, ly, '#54402c'); };
PAINTERS.beehive = (c, x, y, r) => {
  PAINTERS.planks(c, x, y, r);
  for (let ly = 13; ly <= 17; ly++) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, shade('#5a4028', (r() - 0.5) * 0.1)); // hive slit band
  for (let lx = 6; lx < 26; lx += 5) { px(c, x, y, lx, 15, '#e0a52a'); px(c, x, y, lx, 16, '#c98a1f'); }                        // honey glints
};
PAINTERS.beehive_top = (c, x, y, r) => { PAINTERS.planks(c, x, y, r); for (let lx = 12; lx < 20; lx++) for (let ly = 12; ly < 20; ly++) px(c, x, y, lx, ly, shade('#d8a838', (r() - 0.5) * 0.12)); };
PAINTERS.bee_nest = (c, x, y, r) => {
  bark(c, x, y, r, '#8a6a44', '#6a4f30');
  for (let ly = 18; ly < 24; ly++) for (let lx = 11; lx < 21; lx++) px(c, x, y, lx, ly, shade('#3a2a1a', (r() - 0.5) * 0.08)); // nest hole
  for (let lx = 12; lx < 20; lx += 3) px(c, x, y, lx, 20, '#e0a52a');
};
PAINTERS.bee_nest_top = (c, x, y, r) => rings(c, x, y, r, '#b0895a', '#8a6a44');
const enderFrame = (c, x, y, r, base, top) => {
  noisyFill(c, x, y, r, base, 0.04);
  for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, 0, '#0e1a1a'); px(c, x, y, lx, LP - 1, '#0e1a1a'); }
  for (let ly = 0; ly < LP; ly++) { px(c, x, y, 0, ly, '#0e1a1a'); px(c, x, y, LP - 1, ly, '#0e1a1a'); }
  if (top === 'front') { for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, 7, '#0e1a1a'); px(c, x, y, 7, 7, '#3fe0c0'); px(c, x, y, 8, 7, '#3fe0c0'); px(c, x, y, 7, 8, '#2ab89a'); px(c, x, y, 8, 8, '#2ab89a'); }
};
PAINTERS.ender_chest_front = (c, x, y, r) => enderFrame(c, x, y, r, '#1d2b2b', 'front');
PAINTERS.ender_chest_side = (c, x, y, r) => enderFrame(c, x, y, r, '#1d2b2b', 'side');
PAINTERS.ender_chest_top = (c, x, y, r) => { enderFrame(c, x, y, r, '#243636', 'side'); px(c, x, y, 15, 15, '#3fe0c0'); px(c, x, y, 16, 16, '#2ab89a'); };
PAINTERS.lodestone = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#b7bcc2', 0.05, { chance: 0.1, color: '#9aa0a6' });
  for (let lx = 0; lx < LP; lx += 8) for (let ly = 0; ly < LP; ly++) if (r() < 0.5) px(c, x, y, lx, ly, shade('#9aa0a6', -0.05));
};
PAINTERS.lodestone_top = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#c2c7cd', 0.04);
  for (let a = 0; a < 48; a++) { const ang = a / 48 * Math.PI * 2; px(c, x, y, Math.round(15.5 + Math.cos(ang) * 6), Math.round(15.5 + Math.sin(ang) * 6), '#4a5560'); } // compass ring
  for (let j = 0; j < 3; j++) { px(c, x, y, 16, 7 + j, '#c0303a'); px(c, x, y, 16, 21 + j, '#3a5fd0'); } // N red / S blue needle
  px(c, x, y, 16, 16, '#2a2f36');
};
PAINTERS.cauldron = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#3a3d42', 0.05, { chance: 0.06, color: '#2a2d31' });
  for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, 0, '#565b61'); px(c, x, y, lx, 1, '#4a4f55'); } // top rim
  for (const lx of [4, 5, 26, 27]) for (let ly = 27; ly < LP; ly++) px(c, x, y, lx, ly, '#22252a'); // legs
};
PAINTERS.cauldron_top = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#4a4f55', 0.04);
  for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, 0, '#565b61'); px(c, x, y, lx, LP - 1, '#565b61'); }
  for (let ly = 0; ly < LP; ly++) { px(c, x, y, 0, ly, '#565b61'); px(c, x, y, LP - 1, ly, '#565b61'); }
  for (let lx = 4; lx < 28; lx++) for (let ly = 4; ly < 28; ly++) px(c, x, y, lx, ly, shade('#20232a', (r() - 0.5) * 0.06)); // hollow interior
  for (let lx = 6; lx < 26; lx++) for (let ly = 6; ly < 26; ly++) if (r() < 0.5) px(c, x, y, lx, ly, shade('#2f5f8a', (r() - 0.5) * 0.1)); // shallow water
};
PAINTERS.hopper = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#34373c', 0.05, { chance: 0.06, color: '#26292d' });
  for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, 0, '#4a4e54'); // rim
  for (let ly = 4; ly < LP; ly++) for (let lx = 13; lx < 19; lx++) px(c, x, y, lx, ly, shade('#1c1e22', (r() - 0.5) * 0.08)); // spout
};
PAINTERS.hopper_top = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#3a3d42', 0.04);
  for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, 0, '#4a4e54'); px(c, x, y, lx, LP - 1, '#4a4e54'); }
  for (let ly = 0; ly < LP; ly++) { px(c, x, y, 0, ly, '#4a4e54'); px(c, x, y, LP - 1, ly, '#4a4e54'); }
  for (let lx = 5; lx < 27; lx++) for (let ly = 5; ly < 27; ly++) px(c, x, y, lx, ly, shade('#1e2024', (r() - 0.5) * 0.06)); // funnel opening
};
PAINTERS.bell = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#e6c132', 0.04, { chance: 0.08, color: '#fff08a' });
  for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, LP - 1, '#a8862a'); px(c, x, y, lx, LP - 2, '#c29a2e'); } // bell mouth
  for (let ly = 0; ly < 4; ly++) px(c, x, y, LP / 2, ly, '#8a6a1e');                                          // crown loop
  for (let ly = 4; ly < LP; ly++) { px(c, x, y, 3, ly, shade('#c29a2e', -0.1)); px(c, x, y, LP - 4, ly, shade('#c29a2e', -0.1)); }
};
PAINTERS.lectern = (c, x, y, r) => {
  PAINTERS.planks(c, x, y, r);
  for (let lx = 13; lx < 19; lx++) for (let ly = 6; ly < LP; ly++) px(c, x, y, lx, ly, shade('#8a6a3f', -0.08)); // stem
};
PAINTERS.lectern_top = (c, x, y, r) => {
  PAINTERS.planks(c, x, y, r);
  for (let lx = 6; lx < 26; lx++) for (let ly = 8; ly < 22; ly++) px(c, x, y, lx, ly, shade('#e8e0cc', (r() - 0.5) * 0.05)); // open book
  for (let ly = 8; ly < 22; ly++) px(c, x, y, 16, ly, '#b0a488');                                                            // spine
  for (let ly = 10; ly < 20; ly += 2) { for (let lx = 8; lx < 15; lx++) px(c, x, y, lx, ly, '#9a8f74'); for (let lx = 18; lx < 25; lx++) px(c, x, y, lx, ly, '#9a8f74'); } // text
};
// Ground / terrain.
PAINTERS.netherrack = (c, x, y, r) => { noisyFill(c, x, y, r, '#6a2b2b', 0.07, { chance: 0.12, color: '#4a1d1d' }); for (let i = 0; i < 6; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), '#7d3535'); };
PAINTERS.warped_nylium = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#1c8a7a', 0.06, { chance: 0.12, color: '#2fb89a' });
  for (let i = 0; i < 14; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), shade('#43d0b0', (r() - 0.5) * 0.2));
};
PAINTERS.warped_nylium_side = (c, x, y, r) => {
  PAINTERS.netherrack(c, x, y, r);
  for (let lx = 0; lx < LP; lx++) { const depth = 2 + Math.floor(r() * 4); for (let ly = 0; ly < depth; ly++) px(c, x, y, lx, ly, shade('#1c8a7a', (r() - 0.5) * 0.15)); } // teal fringe
};
PAINTERS.suspicious_gravel = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#9a938c', 0.09, { chance: 0.15, color: '#7c766f' });
  for (let i = 0; i < 3; i++) { let lx = Math.floor(r() * LP); let ly = Math.floor(r() * LP); for (let j = 0; j < 5; j++) { px(c, x, y, (lx + j) % LP, ly, '#5f5a54'); if (r() < 0.5) ly = (ly + 1) % LP; } } // brushed cracks
  px(c, x, y, 16, 16, '#c2b06a'); px(c, x, y, 17, 16, '#a89652'); // a buried glint
};
PAINTERS.rail = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#7a5a38', 0.05);                                                             // wooden ties base
  for (let ly = 2; ly < LP; ly += 8) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, shade('#5f4529', (r() - 0.5) * 0.1)); // cross ties
  for (const rx of [9, 10, 21, 22]) for (let ly = 0; ly < LP; ly++) px(c, x, y, rx, ly, rx % 2 ? '#8a8d93' : '#b9bcc2');         // steel rails
};
PAINTERS.daylight_detector_top = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#2f4a63', 0.04);
  for (let lx = 3; lx < 29; lx++) for (let ly = 3; ly < 29; ly++) px(c, x, y, lx, ly, shade('#3f6fae', (r() - 0.5) * 0.12)); // glassy blue panel
  for (let a = 0; a < 20; a++) { const ang = a / 20 * Math.PI * 2; px(c, x, y, Math.round(16 + Math.cos(ang) * 5), Math.round(16 + Math.sin(ang) * 5), '#e6c437'); } // sun disc
  px(c, x, y, 16, 16, '#f2d658');
};
PAINTERS.daylight_detector_side = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#5a4632', 0.04);
  for (let ly = 0; ly < 4; ly++) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, shade('#3f6fae', (r() - 0.5) * 0.1)); // blue top edge
  for (let ly = 6; ly < LP; ly += 5) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, '#463628');
};
// Plants / decals — transparent cross cutouts.
PAINTERS.glow_lichen = (c, x, y, r) => cross(c, x, y, r, () => {
  for (let i = 0; i < 44; i++) { const lx = Math.floor(r() * LP), ly = Math.floor(r() * LP); if (r() < 0.6) px(c, x, y, lx, ly, r() < 0.5 ? '#2fb89a' : '#5fe0c0'); }
});
PAINTERS.warped_roots = (c, x, y, r) => cross(c, x, y, r, () => {
  for (let i = 0; i < 5; i++) { const sx = 4 + Math.floor(r() * (LP - 8)), h = 6 + Math.floor(r() * 10); for (let j = 0; j < h; j++) px(c, x, y, sx + Math.round(Math.sin(j * 0.6) * 1.5), LP - 1 - j, shade('#1f9a86', (r() - 0.5) * 0.2)); }
  for (let i = 0; i < 5; i++) px(c, x, y, 4 + Math.floor(r() * (LP - 8)), 6 + Math.floor(r() * 6), '#5fe0c0'); // glow tips
});
PAINTERS.cobweb = (c, x, y, r) => cross(c, x, y, r, () => {
  const col = '#d8dde2', mid = LP / 2;
  for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2; for (let t = 0; t < mid; t++) px(c, x, y, Math.round(mid + Math.cos(ang) * t), Math.round(mid + Math.sin(ang) * t), col); } // radial threads
  for (const rad of [4, 8, 12]) for (let a = 0; a < 32; a++) { const ang = a / 32 * Math.PI * 2; px(c, x, y, Math.round(mid + Math.cos(ang) * rad), Math.round(mid + Math.sin(ang) * rad), col); } // rings
});
PAINTERS.sea_pickle = (c, x, y, r) => cross(c, x, y, r, () => {
  for (const [bx, h] of [[11, 7], [16, 10], [21, 6]]) {
    for (let j = 0; j < h; j++) px(c, x, y, bx, LP - 2 - j, shade('#6fae3a', (r() - 0.5) * 0.15));
    px(c, x, y, bx, LP - 2 - h, '#c9f06a'); px(c, x, y, bx - 1, LP - 1 - h, '#a8d84a'); // glow tip
  }
  for (let lx = 8; lx < 24; lx++) px(c, x, y, lx, LP - 1, '#4a6a2a'); // base crust
});
// Special — swirly translucent purple portal (mirrors the stained-glass alpha path).
PAINTERS.nether_portal = (c, x, y, r) => {
  c.clearRect(x, y, TILE, TILE);
  c.fillStyle = 'rgba(120,40,180,0.5)'; c.fillRect(x, y, TILE, TILE);
  for (let i = 0; i < 130; i++) { const ang = r() * Math.PI * 2, rad = r() * 15; const lx = Math.round(16 + Math.cos(ang) * rad), ly = Math.round(16 + Math.sin(ang) * rad); if (lx >= 0 && lx < LP && ly >= 0 && ly < LP) px(c, x, y, lx, ly, r() < 0.5 ? 'rgba(180,110,230,0.7)' : 'rgba(90,20,140,0.6)'); }
};
PAINTERS.scaffolding = (c, x, y, r) => {
  noisyFill(c, x, y, r, '#c9a85e', 0.05);
  for (let ly = 2; ly < LP; ly += 7) for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, shade('#a8863f', (r() - 0.5) * 0.1)); // bamboo node rings
  for (const lx of [8, 16, 24]) for (let ly = 0; ly < LP; ly++) px(c, x, y, lx, ly, shade('#9a7a35', -0.05));                    // vertical seams
};

// ---- Schematic-import blocks, wave 3 (P1–P4): placeholder procedural art -----
// Recognisable colour/pattern stand-ins so imports render; real PNGs are listed
// in docs/TEXTURES.md for hand-authoring (blitted over by applyTexturePack()).
{
  const fill = (base, v = 0.05, sp = null) => (c, x, y, r) => noisyFill(c, x, y, r, base, v, sp);
  const oreOn = (dark, light, n = 4) => (c, x, y, r) => { PAINTERS.stone(c, x, y, r); oreBlobs(c, x, y, r, dark, light, n); };
  const bricks = (base, mortar) => (c, x, y, r) => {
    noisyFill(c, x, y, r, base, 0.05);
    for (let ly = 0; ly < LP; ly++) {
      if (ly % 8 === 0) { for (let lx = 0; lx < LP; lx++) px(c, x, y, lx, ly, mortar); continue; }
      const seam = (Math.floor(ly / 8) % 2) ? 8 : 0;             // offset every other course
      px(c, x, y, seam, ly, mortar); px(c, x, y, (seam + 16) % LP, ly, mortar);
    }
  };
  const ridged = (base, groove) => (c, x, y, r) => {            // pumpkin/melon vertical ridges
    noisyFill(c, x, y, r, base, 0.05);
    for (const lx of [0, 8, 16, 24]) for (let ly = 0; ly < LP; ly++) px(c, x, y, lx, ly, groove);
  };
  const face = (base, glow) => (c, x, y, r) => {               // carved pumpkin / jack-o face
    ridged('#c8791f', '#9a5a15')(c, x, y, r);
    for (const [ex, ey] of [[8, 12], [9, 12], [21, 12], [22, 12]]) px(c, x, y, ex, ey, glow);   // eyes
    for (let lx = 10; lx <= 21; lx++) px(c, x, y, lx, 20, glow);                                 // mouth
    for (const [lx, ly] of [[12, 22], [15, 22], [18, 22]]) px(c, x, y, lx, ly, glow);            // teeth
  };
  Object.assign(PAINTERS, {
    // P1 lights
    glowstone: fill('#c9a44e', 0.08, { chance: 0.18, color: '#f4dc8e' }),
    sea_lantern: fill('#bcd6d0', 0.05, { chance: 0.14, color: '#e8f3ef' }),
    redstone_lamp: fill('#c8813f', 0.06, { chance: 0.16, color: '#f2b86e' }),
    shroomlight: fill('#e08a2c', 0.07, { chance: 0.2, color: '#f6c862' }),
    jack_o_lantern: face('#c8791f', '#ffd23a'),
    pumpkin_top: (c, x, y, r) => { noisyFill(c, x, y, r, '#c8791f', 0.04); for (const lx of [0, 8, 16, 24]) for (let ly = 0; ly < LP; ly++) px(c, x, y, lx, ly, '#9a5a15'); },
    pumpkin_side: ridged('#c8791f', '#9a5a15'),
    carved_pumpkin: face('#c8791f', '#3a2408'),
    froglight_ochre: fill('#d9cf7a', 0.05, { chance: 0.16, color: '#efe8a0' }),
    froglight_ochre_top: fill('#efe8a0', 0.04),
    froglight_verdant: fill('#8fbf6a', 0.05, { chance: 0.16, color: '#c0e59a' }),
    froglight_verdant_top: fill('#c0e59a', 0.04),
    froglight_pearl: fill('#e6d6de', 0.04, { chance: 0.16, color: '#f6ecf1' }),
    froglight_pearl_top: fill('#f6ecf1', 0.03),
    // P2 building stone & terrain
    end_stone: fill('#dcd7a6', 0.04, { chance: 0.1, color: '#eae6c2' }),
    end_stone_bricks: bricks('#d7d2a0', '#bdb884'),
    red_nether_bricks: bricks('#3a1414', '#521c1c'),
    tuff_bricks: bricks('#6d6f68', '#585a54'),
    polished_tuff: fill('#6d6f68', 0.04),
    gilded_blackstone: (c, x, y, r) => { noisyFill(c, x, y, r, '#2b2830', 0.06); oreBlobs(c, x, y, r, '#c8a24a', '#f2cf72', 3); },
    magma_block: (c, x, y, r) => { noisyFill(c, x, y, r, '#5a2a1e', 0.08); oreBlobs(c, x, y, r, '#e0722a', '#f6a838', 4); },
    soul_sand: fill('#4a3a30', 0.06, { chance: 0.14, color: '#33251d' }),
    soul_soil: fill('#42332a', 0.06, { chance: 0.1, color: '#54453a' }),
    bone_block_top: (c, x, y, r) => { noisyFill(c, x, y, r, '#dcd6bf', 0.03); for (let a = 4; a <= 12; a += 4) for (let t = 0; t < 32; t++) { const lx = 16 + Math.round(a * Math.cos(t / 5)), ly = 16 + Math.round(a * Math.sin(t / 5)); px(c, x, y, lx, ly, '#c2bb9e'); } },
    bone_block_side: (c, x, y, r) => { noisyFill(c, x, y, r, '#dcd6bf', 0.03); for (const lx of [6, 12, 20, 26]) for (let ly = 0; ly < LP; ly++) px(c, x, y, lx, ly, '#c2bb9e'); for (let lx = 0; lx < LP; lx++) { px(c, x, y, lx, 5, '#b4ac8c'); px(c, x, y, lx, 26, '#b4ac8c'); } },
    nether_wart_block: fill('#6e0d14', 0.08, { chance: 0.16, color: '#8a1620' }),
    warped_wart_block: fill('#167e7a', 0.08, { chance: 0.16, color: '#1fa39a' }),
    sculk: (c, x, y, r) => { noisyFill(c, x, y, r, '#0e1b23', 0.06); oreBlobs(c, x, y, r, '#153742', '#2fd6c4', 3); },
    amethyst_block: fill('#8a5fc4', 0.06, { chance: 0.2, color: '#b892e2' }),
    budding_amethyst: (c, x, y, r) => { noisyFill(c, x, y, r, '#7a52b0', 0.06, { chance: 0.18, color: '#b892e2' }); oreBlobs(c, x, y, r, '#5c3a8e', '#d0b6f0', 3); },
    // P3 mineral show-blocks + ores
    diamond_block: fill('#4fd6d0', 0.05, { chance: 0.2, color: '#a2f0ec' }),
    emerald_block: fill('#2fb45a', 0.05, { chance: 0.2, color: '#74e08e' }),
    lapis_block: fill('#22449c', 0.06, { chance: 0.2, color: '#4472d6' }),
    redstone_block: fill('#8a1414', 0.06, { chance: 0.18, color: '#cc3030' }),
    netherite_block: fill('#2a2528', 0.05, { chance: 0.12, color: '#463c40' }),
    diamond_ore: oreOn('#3fb4b0', '#a2f0ec', 4),
    emerald_ore: oreOn('#2f9450', '#74e08e', 4),
    lapis_ore: oreOn('#22449c', '#4f7fd6', 5),
    redstone_ore: oreOn('#a01818', '#e64040', 5),
    // P4 farm / organic
    melon_top: fill('#5f8f3a', 0.04),
    melon_side: (c, x, y, r) => { noisyFill(c, x, y, r, '#3f7a34', 0.05); for (const lx of [2, 9, 16, 23, 30]) for (let ly = 0; ly < LP; ly++) px(c, x, y, lx, ly, shade('#67a24a', 0.05)); for (let i = 0; i < 20; i++) px(c, x, y, Math.floor(r() * LP), Math.floor(r() * LP), '#b7413f'); },
  });
}

// Reserve atlas slots for any pack-only tiles (new station faces) so they get a
// UV; the real art is blitted over the placeholder by applyTexturePack().
for (const name of Object.keys(TEXPACK_TILES)) {
  if (!PAINTERS[name]) PAINTERS[name] = (c, x, y, r) => noisyFill(c, x, y, r, '#8a8580', 0.05);
}

export const tileNames = () => Object.keys(PAINTERS);

let atlasCanvas = null;

export function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = ATLAS_ROWS * TILE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;

  const names = Object.keys(PAINTERS);
  names.forEach((name, i) => {
    const col = i % ATLAS_COLS, row = Math.floor(i / ATLAS_COLS);
    if (row >= ATLAS_ROWS) throw new Error('atlas overflow — add rows');
    const x0 = col * TILE, y0 = row * TILE;
    const rand = mulberry32(hashSeed('tile:' + name));
    PAINTERS[name](ctx, x0, y0, rand);
    // Small inset so linear-ish sampling at mip edges doesn't bleed.
    const eps = 0.5 / (ATLAS_COLS * TILE);
    tileUV[name] = {
      u0: col / ATLAS_COLS + eps,
      v0: row / ATLAS_ROWS + eps * 2,
      u1: (col + 1) / ATLAS_COLS - eps,
      v1: (row + 1) / ATLAS_ROWS - eps * 2,
    };
  });
  atlasCanvas = canvas;
  return canvas;
}

export function getAtlasCanvas() {
  if (!atlasCanvas) buildAtlas();
  return atlasCanvas;
}

// Blit the real 32×32 art pack over the procedural atlas, then the caller
// re-uploads the texture. Async (decodes embedded PNGs); missing/failed tiles
// simply keep their procedural art. Resolves once every tile is drawn.
let texpackApplied = false;
export function applyTexturePack() {
  if (typeof Image === 'undefined') return Promise.resolve(false); // no DOM (unit tests)
  if (!atlasCanvas) buildAtlas();
  const ctx = atlasCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const entries = Object.entries(TEXPACK_TILES).filter(([n]) => tileUV[n]);
  return Promise.all(entries.map(([name, uri]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const uv = tileUV[name];
      const col = Math.round(uv.u0 * ATLAS_COLS - 0.01), row = Math.round(uv.v0 * ATLAS_ROWS - 0.01);
      ctx.clearRect(col * TILE, row * TILE, TILE, TILE);
      ctx.drawImage(img, col * TILE, row * TILE, TILE, TILE);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = uri;
  }))).then(() => { texpackApplied = true; return true; });
}

// UVs for a block face. face: 'top' | 'bottom' | 'side'
export function faceUV(blockDef, face) {
  const t = blockDef.tiles;
  const name = t[face] || t.side || t.all || Object.values(t)[0] || blockDef.name;
  return tileUV[name] || tileUV[t.all] || tileUV.stone;
}

// Small canvas icon for an atlas tile (used by inventory UI for block items).
export function tileIconDataURL(tileName) {
  const uv = tileUV[tileName];
  if (!uv || !atlasCanvas) return null;
  const c = document.createElement('canvas');
  c.width = 40; c.height = 40;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const col = Math.round(uv.u0 * ATLAS_COLS - 0.01), row = Math.round(uv.v0 * ATLAS_ROWS - 0.01);
  ctx.drawImage(atlasCanvas, col * TILE, row * TILE, TILE, TILE, 0, 0, 40, 40);
  return c.toDataURL();
}
