// Seeded procedural world generation.
// Terrain height comes from continuous noise fields (no biome seams);
// biomes control surface materials, vegetation, nodes and enemy spawns,
// and get harsher with distance from the spawn settlement.
import { B } from './blocks.js';
import { fbm2, ridge2, warped2, valueNoise3 } from '../core/noise.js';
import { hash2, hash3 } from '../core/rng.js';
import { clamp, lerp, smoothstep } from '../core/math.js';

export const CHUNK = 16;
export const WORLD_H = 512;
export const SEA = 62;

// The Frostwatch frontier camp: a second hand-built site far out in forced
// tundra. Terrain, biome and danger tier are pinned around it so the camp
// exists on every seed.
export const FROST_CAMP = { x: 560, z: -120, ground: 67 };

// Biomes are placed by a realistic climate model (temperature × moisture ×
// elevation) — NOT by distance alone. biomeAt() biases climate toward mild
// temperate near spawn and lets it reach extremes far out, so the exotic
// biomes (boreal, tropical, tundra, desert, volcanic, blighted) that hold the
// rare high-tier woods & precious ores emerge the farther you travel — the
// owner's "rarer the further from spawn" rule, expressed through real climate.
// Keys greenwood_plains / ancient_forest / misty_wetlands / coastal_shores are
// load-bearing (mob spawn files reference them) — do not rename them.
export const BIOMES = {
  greenwood_plains: {
    label: 'Greenwood Plains', tier: 0, climate: 'temperate grassland',
    surface: 'grass', filler: 'dirt',
    trees: [{ type: 'tree_pine', density: 0.01 }, { type: 'tree_birch', density: 0.005 }],
    plants: [{ block: 'tall_grass', d: 0.05 }, { block: 'wildflower', d: 0.012 }],
    nodes: [{ type: 'herb_patch', d: 0.004 }, { type: 'berry_bush', d: 0.003 }, { type: 'deposit_saltpeter', d: 0.0016 }],
    enemies: [{ type: 'mudback_boar', d: 0.0022 }, { type: 'thicket_sprite', d: 0.0015 }, { type: 'duskwing', d: 0.0014 }],
  },
  ancient_forest: {
    label: 'Ancient Forest', tier: 0, climate: 'temperate deciduous forest',
    surface: 'grass', filler: 'dirt',
    trees: [
      { type: 'tree_oak', density: 0.02 }, { type: 'tree_birch', density: 0.012 },
      { type: 'tree_ash', density: 0.01 }, { type: 'tree_hickory', density: 0.008 },
      { type: 'tree_maple', density: 0.006 }, { type: 'tree_pine', density: 0.006 },
      { type: 'tree_walnut', density: 0.003 },
    ],
    plants: [{ block: 'tall_grass', d: 0.03 }, { block: 'mushroom_cap', d: 0.01 }],
    nodes: [{ type: 'herb_patch', d: 0.006 }, { type: 'berry_bush', d: 0.004 }],
    enemies: [{ type: 'thicket_sprite', d: 0.003 }, { type: 'moss_lurker', d: 0.0018 }, { type: 'duskwing', d: 0.0018 }],
  },
  boreal_forest: {
    label: 'Boreal Taiga', tier: 2, climate: 'cold coniferous forest',
    surface: 'grass', filler: 'dirt',
    trees: [
      { type: 'tree_pine', density: 0.045 }, { type: 'tree_cedar', density: 0.018 },
      { type: 'tree_yew', density: 0.004 },
    ],
    plants: [{ block: 'mushroom_cap', d: 0.012 }, { block: 'tall_grass', d: 0.01 }],
    nodes: [{ type: 'herb_patch', d: 0.005 }, { type: 'deposit_coal', d: 0.003 }],
    enemies: [{ type: 'frostmaw_wolf', d: 0.0022, pack: [2, 3] }, { type: 'rime_shade', d: 0.0014 }],
  },
  tropical_forest: {
    label: 'Tropical Jungle', tier: 3, climate: 'hot humid rainforest',
    surface: 'grass', filler: 'dirt',
    trees: [
      { type: 'tree_teak', density: 0.03 }, { type: 'tree_ebony', density: 0.014 },
      { type: 'tree_lignum_vitae', density: 0.004 },
    ],
    plants: [{ block: 'tall_grass', d: 0.04 }, { block: 'mushroom_cap', d: 0.02 }],
    nodes: [{ type: 'herb_patch', d: 0.008 }, { type: 'berry_bush', d: 0.004 }],
    enemies: [{ type: 'moss_lurker', d: 0.003 }, { type: 'thicket_sprite', d: 0.002 }, { type: 'sunscale_serpent', d: 0.0016 }],
  },
  misty_wetlands: {
    label: 'Misty Wetlands', tier: 1, climate: 'warm swamp',
    surface: 'grass', filler: 'clay_block',
    trees: [{ type: 'tree_cedar', density: 0.02 }],
    plants: [{ block: 'reed', d: 0.05 }, { block: 'mushroom_cap', d: 0.02 }],
    nodes: [{ type: 'herb_patch', d: 0.01 }, { type: 'clay_deposit', d: 0.006 }, { type: 'fishing_spot', d: 0.004 }],
    enemies: [{ type: 'bog_shambler', d: 0.003 }, { type: 'marsh_wisp', d: 0.002 }],
  },
  rocky_highlands: {
    label: 'Rocky Highlands', tier: 1, climate: 'montane',
    surface: 'stone', filler: 'stone',
    trees: [{ type: 'tree_ash', density: 0.006 }, { type: 'tree_hickory', density: 0.004 }],
    plants: [{ block: 'tall_grass', d: 0.008 }],
    nodes: [{ type: 'ore_iron', d: 0.005 }, { type: 'ore_copper', d: 0.004 }, { type: 'ore_tin', d: 0.004 }, { type: 'deposit_coal', d: 0.003 }, { type: 'dig_site', d: 0.0015 }],
    enemies: [{ type: 'craghorn_ram', d: 0.0025 }, { type: 'stone_pecker', d: 0.002 }],
  },
  sunbaked_badlands: {
    label: 'Sun-baked Badlands', tier: 2, climate: 'hot desert',
    surface: 'sand', filler: 'sand',
    trees: [{ type: 'tree_teak', density: 0.0025 }],
    plants: [{ block: 'cactus_flesh', d: 0.006 }],
    nodes: [{ type: 'ore_lead', d: 0.003 }, { type: 'ore_silver', d: 0.003 }, { type: 'deposit_sulfur', d: 0.003 }, { type: 'dig_site', d: 0.004 }],
    enemies: [{ type: 'dune_stalker', d: 0.003 }, { type: 'sunscale_serpent', d: 0.002 }],
  },
  frostbound_tundra: {
    label: 'Frostbound Tundra', tier: 2, climate: 'cold dry tundra',
    surface: 'snow_grass', filler: 'dirt',
    trees: [{ type: 'tree_yew', density: 0.003 }],
    plants: [],
    nodes: [{ type: 'ore_iron', d: 0.004 }, { type: 'ore_silver', d: 0.002 }, { type: 'deposit_coal', d: 0.002 }],
    enemies: [{ type: 'frostmaw_wolf', d: 0.003, pack: [2, 3] }, { type: 'rime_shade', d: 0.0015 }],
  },
  volcanic_wastes: {
    label: 'Volcanic Wastes', tier: 3, climate: 'volcanic',
    surface: 'ashen_soil', filler: 'basalt',
    trees: [],
    plants: [],
    nodes: [{ type: 'ore_gold', d: 0.003 }, { type: 'ore_meteoric', d: 0.002 }, { type: 'deposit_sulfur', d: 0.004 }],
    enemies: [{ type: 'cinder_imp', d: 0.004 }, { type: 'magma_hulk', d: 0.0015 }],
  },
  corrupted_wilds: {
    label: 'Corrupted Wilderness', tier: 3, climate: 'blighted',
    surface: 'corrupt_soil', filler: 'corrupt_soil',
    trees: [{ type: 'tree_walnut', density: 0.008 }, { type: 'tree_ebony', density: 0.005 }, { type: 'tree_lignum_vitae', density: 0.002 }],
    plants: [{ block: 'mushroom_cap', d: 0.03 }],
    nodes: [{ type: 'ore_zinc', d: 0.003 }, { type: 'ore_platinum', d: 0.0016 }, { type: 'herb_patch', d: 0.006 }],
    enemies: [{ type: 'blight_horror', d: 0.003 }, { type: 'hollow_watcher', d: 0.002 }],
  },
  coastal_shores: {
    label: 'Coastal Shores', tier: 1, climate: 'coast',
    surface: 'sand', filler: 'sand',
    trees: [],
    plants: [{ block: 'reed', d: 0.02 }],
    nodes: [{ type: 'fishing_spot', d: 0.006 }, { type: 'clay_deposit', d: 0.004 }, { type: 'deposit_saltpeter', d: 0.002 }],
    enemies: [{ type: 'shell_snapper', d: 0.0025 }],
  },
  crystal_caverns: {
    label: 'Crystal Caverns', tier: 2, climate: 'subterranean',
    surface: 'stone', filler: 'stone',
    trees: [], plants: [], nodes: [], enemies: [],
  },
};

export class WorldGen {
  constructor(seed) {
    this.seed = seed >>> 0;
  }

  // ---- Continuous fields -------------------------------------------------
  heightAt(x, z) {
    const s = this.seed;
    const cont = warped2(s + 11, x * 0.004, z * 0.004, 4, 24);          // continents
    const hills = fbm2(s + 22, x * 0.02, z * 0.02, 4);                   // local relief
    const highMask = smoothstep(clamp((fbm2(s + 33, x * 0.0035, z * 0.0035, 3) - 0.45) * 3, 0, 1));
    const mount = Math.pow(ridge2(s + 44, x * 0.009, z * 0.009, 3), 1.6) * highMask;
    // Re-centered for a 128-tall world: plains sit just above sea (~66),
    // valleys dip below the sea into water, mountains tower toward ~120.
    let h = 39 + cont * 40 + hills * 14 + mount * 54;

    // Rivers: carve winding channels below sea level, but not on high peaks.
    const rv = ridge2(s + 55, x * 0.003, z * 0.003, 2);
    if (rv > 0.86 && h < SEA + 28) {
      const depth = (rv - 0.86) / 0.14; // 0..1
      h = Math.min(h, lerp(h, SEA - 5 - depth * 6, smoothstep(clamp(depth * 2, 0, 1))));
    }

    // Starter plateau: gentle, guaranteed-walkable land around the settlement.
    // Inner ring (d<34) is perfectly flat so hand-built structures sit cleanly.
    const d = Math.hypot(x, z);
    if (d < 150) {
      const t = smoothstep(clamp(1 - d / 150, 0, 1));
      h = lerp(h, 64.2 + hills * 1.6, t);
      if (d < 44) {
        const t2 = smoothstep(clamp((44 - d) / 10, 0, 1));
        h = lerp(h, 64, t2);
      }
    }
    // Frostwatch plateau: the frontier camp gets the same treatment
    const df = Math.hypot(x - FROST_CAMP.x, z - FROST_CAMP.z);
    if (df < 70) {
      const t = smoothstep(clamp(1 - df / 70, 0, 1));
      h = lerp(h, FROST_CAMP.ground + 0.2 + hills * 1.4, t);
      if (df < 26) {
        const t2 = smoothstep(clamp((26 - df) / 8, 0, 1));
        h = lerp(h, FROST_CAMP.ground, t2);
      }
    }
    return clamp(Math.floor(h), 4, WORLD_H - 6);
  }

  temperatureAt(x, z) { return fbm2(this.seed + 66, x * 0.0028, z * 0.0028, 3); }
  moistureAt(x, z) { return fbm2(this.seed + 77, x * 0.0031, z * 0.0031, 3); }

  // Distance rings decide danger tier; noise jitters the ring edges organic.
  tierAt(x, z) {
    if (Math.hypot(x - FROST_CAMP.x, z - FROST_CAMP.z) < 100) return 2;
    const d = Math.hypot(x, z) + (fbm2(this.seed + 88, x * 0.01, z * 0.01, 2) - 0.5) * 120;
    if (d < 260) return 0;
    if (d < 520) return 1;
    if (d < 900) return 2;
    return 3;
  }

  // Whittaker-style climate biomes. Temperature is pulled toward mild/temperate
  // near spawn and allowed to reach extremes with distance (climate "extremity"),
  // so the spawn valley is always livable temperate and cold/hot exotic biomes —
  // and the rare woods/ores they carry — appear the farther out you go.
  biomeAt(x, z) {
    const h = this.heightAt(x, z);
    const m = this.moistureAt(x, z);
    const tier = this.tierAt(x, z);

    // The hand-built Frostwatch frontier is pinned cold on every seed.
    if (Math.hypot(x - FROST_CAMP.x, z - FROST_CAMP.z) < 90) return BIOMES.frostbound_tundra;
    // Beaches hug the water line at any distance.
    if (h <= SEA + 1) return BIOMES.coastal_shores;

    // extremity: 0 at spawn → 1 by ~1000 blocks out (jittered by tierAt's noise).
    const d = Math.hypot(x, z);
    const ext = smoothstep(clamp((d - 80) / 900, 0, 1));
    const t = 0.5 + (this.temperatureAt(x, z) - 0.5) * (0.28 + 0.72 * ext);

    // Elevation & water carve montane and swamp out of any climate band.
    if (h > SEA + 30) return BIOMES.rocky_highlands;
    if (m > 0.62 && h < SEA + 10) return BIOMES.misty_wetlands;

    // Far, extreme reaches host the two rare "special" biomes.
    if (tier >= 3) {
      if (t > 0.66 && m < 0.4) return BIOMES.volcanic_wastes;
      if (m > 0.6) return BIOMES.corrupted_wilds;
    }
    // Climate bands: cold → taiga/tundra, hot → jungle/desert, else temperate.
    if (t < 0.35) return m > 0.5 ? BIOMES.boreal_forest : BIOMES.frostbound_tundra;
    if (t > 0.68) return m > 0.5 ? BIOMES.tropical_forest : BIOMES.sunbaked_badlands;
    return m > 0.5 ? BIOMES.ancient_forest : BIOMES.greenwood_plains;
  }

  isCave(x, y, z) {
    if (y < 4 || y > WORLD_H - 12) return false;
    const d = Math.hypot(x, z);
    if (d < 46) return false; // keep the settlement's underground intact for the hand-built mine
    if (Math.hypot(x - FROST_CAMP.x, z - FROST_CAMP.z) < 30) return false; // solid ground under the camp
    const n = valueNoise3(this.seed + 99, x * 0.06, y * 0.09, z * 0.06);
    const n2 = valueNoise3(this.seed + 111, x * 0.045, y * 0.07, z * 0.045);
    return n > 0.68 && n2 > 0.55;
  }

  // ---- Column assembly ---------------------------------------------------
  // Writes one column into a chunk-local Uint8Array. Returns surface info.
  column(blocks, lx, lz, wx, wz, setLocal) {
    const h = this.heightAt(wx, wz);
    const biome = this.biomeAt(wx, wz);
    const surfaceId = B[biome.surface];
    const fillerId = B[biome.filler];
    const tundra = biome === BIOMES.frostbound_tundra;

    // Everything above the ground/water line is air, and the chunk array is
    // zero-initialised to air — so we only fill up to the surface. This keeps
    // column generation cost tied to terrain height, not the (tall) world height.
    const top = Math.max(h, SEA);
    for (let y = 0; y <= top; y++) {
      let id = B.air;
      if (y === 0) id = B.bedrock;
      else if (y <= h) {
        if (this.isCave(wx, y, wz)) {
          id = B.air;
        } else if (y === h) {
          // beaches near water line
          if (h <= SEA + 1 && h >= SEA - 2) id = B.sand;
          else id = surfaceId;
        } else if (y >= h - 3) {
          id = h <= SEA + 1 ? B.sand : fillerId;
        } else {
          id = B.stone;
        }
      } else if (y <= SEA) {
        id = tundra && y === SEA ? B.ice : B.water;
      }
      setLocal(lx, y, lz, id);
    }
    return { h, biome };
  }

  // Deterministic per-block chance helper for decorations.
  deco(wx, wz, salt) { return hash2(this.seed ^ salt, wx, wz); }

  treeHeight(wx, wz, base) {
    return base + Math.floor(hash2(this.seed + 202, wx, wz) * 3);
  }
}

// Underground ore-node placement: candidate positions per chunk, deterministic.
export function undergroundNodeCandidates(gen, cx, cz) {
  const out = [];
  const attempts = 10;
  for (let i = 0; i < attempts; i++) {
    const rx = Math.floor(hash3(gen.seed + 301, cx, cz, i * 3) * CHUNK);
    const rz = Math.floor(hash3(gen.seed + 302, cx, cz, i * 3 + 1) * CHUNK);
    const ry = 6 + Math.floor(hash3(gen.seed + 303, cx, cz, i * 3 + 2) * 46);
    out.push({ lx: rx, ly: ry, lz: rz, roll: hash3(gen.seed + 304, cx, cz, i) });
  }
  return out;
}
