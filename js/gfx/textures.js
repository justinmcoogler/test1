// Procedural texture atlas. Every tile is painted at 32×32 logical pixels
// (1px grain) for detailed, fully original seeded art.
import { mulberry32, hashSeed } from '../core/rng.js';
import { WOODS, METALS, FIREARMS } from '../game/materials.js';
import { TEXPACK_TILES } from './texpack.js';

export const TILE = 32;
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 12; // headroom for the generated realistic wood/ore/mineral tiles
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
