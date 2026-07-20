// Seeded procedural world generation.
// Terrain height comes from continuous noise fields (no biome seams);
// biomes control surface materials, vegetation, nodes and enemy spawns,
// and get harsher with distance from the spawn settlement.
import { B } from './blocks.js';
import { fbm2, ridge2, warped2, valueNoise3 } from '../core/noise.js';
import { hash2, hash3 } from '../core/rng.js';
import { clamp, lerp, smoothstep } from '../core/math.js';

export const CHUNK = 16;
export const WORLD_H = 64;
export const SEA = 28;

export const BIOMES = {
  greenwood_plains: {
    label: 'Greenwood Plains', tier: 0,
    surface: 'grass', filler: 'dirt',
    trees: [{ type: 'tree_fernwood', density: 0.012 }],
    plants: [{ block: 'tall_grass', d: 0.05 }, { block: 'wildflower', d: 0.012 }],
    nodes: [{ type: 'herb_patch', d: 0.004 }, { type: 'berry_bush', d: 0.003 }],
    enemies: [{ type: 'mudback_boar', d: 0.0022 }, { type: 'thicket_sprite', d: 0.0015 }],
  },
  ancient_forest: {
    label: 'Ancient Forest', tier: 0,
    surface: 'grass', filler: 'dirt',
    trees: [{ type: 'tree_fernwood', density: 0.05 }, { type: 'tree_silverbark', density: 0.012 }],
    plants: [{ block: 'tall_grass', d: 0.03 }, { block: 'mushroom_cap', d: 0.01 }],
    nodes: [{ type: 'herb_patch', d: 0.006 }, { type: 'berry_bush', d: 0.004 }],
    enemies: [{ type: 'thicket_sprite', d: 0.003 }, { type: 'moss_lurker', d: 0.0018 }],
  },
  misty_wetlands: {
    label: 'Misty Wetlands', tier: 1,
    surface: 'grass', filler: 'clay_block',
    trees: [{ type: 'tree_fernwood', density: 0.02 }],
    plants: [{ block: 'reed', d: 0.05 }, { block: 'mushroom_cap', d: 0.02 }],
    nodes: [{ type: 'herb_patch', d: 0.01 }, { type: 'clay_deposit', d: 0.006 }, { type: 'fishing_spot', d: 0.004 }],
    enemies: [{ type: 'bog_shambler', d: 0.003 }, { type: 'marsh_wisp', d: 0.002 }],
  },
  rocky_highlands: {
    label: 'Rocky Highlands', tier: 1,
    surface: 'stone', filler: 'stone',
    trees: [{ type: 'tree_emberpine', density: 0.008 }],
    plants: [{ block: 'tall_grass', d: 0.008 }],
    nodes: [{ type: 'ore_iron', d: 0.005 }, { type: 'ore_copper', d: 0.004 }, { type: 'ore_tin', d: 0.004 }, { type: 'dig_site', d: 0.0015 }],
    enemies: [{ type: 'craghorn_ram', d: 0.0025 }, { type: 'stone_pecker', d: 0.002 }],
  },
  sunbaked_badlands: {
    label: 'Sun-baked Badlands', tier: 2,
    surface: 'sand', filler: 'sand',
    trees: [],
    plants: [{ block: 'cactus_flesh', d: 0.006 }],
    nodes: [{ type: 'ore_silver', d: 0.003 }, { type: 'dig_site', d: 0.004 }],
    enemies: [{ type: 'dune_stalker', d: 0.003 }, { type: 'sunscale_serpent', d: 0.002 }],
  },
  frostbound_tundra: {
    label: 'Frostbound Tundra', tier: 2,
    surface: 'snow_grass', filler: 'dirt',
    trees: [{ type: 'tree_emberpine', density: 0.01 }],
    plants: [],
    nodes: [{ type: 'ore_iron', d: 0.004 }, { type: 'ore_silver', d: 0.002 }],
    enemies: [{ type: 'frostmaw_wolf', d: 0.003 }, { type: 'rime_shade', d: 0.0015 }],
  },
  volcanic_wastes: {
    label: 'Volcanic Wastes', tier: 3,
    surface: 'ashen_soil', filler: 'basalt',
    trees: [],
    plants: [],
    nodes: [{ type: 'ore_emberstone', d: 0.004 }],
    enemies: [{ type: 'cinder_imp', d: 0.004 }, { type: 'magma_hulk', d: 0.0015 }],
  },
  corrupted_wilds: {
    label: 'Corrupted Wilderness', tier: 3,
    surface: 'corrupt_soil', filler: 'corrupt_soil',
    trees: [{ type: 'tree_silverbark', density: 0.01 }],
    plants: [{ block: 'mushroom_cap', d: 0.03 }],
    nodes: [{ type: 'crystal_node', d: 0.003 }, { type: 'herb_patch', d: 0.006 }],
    enemies: [{ type: 'blight_horror', d: 0.003 }, { type: 'hollow_watcher', d: 0.002 }],
  },
  coastal_shores: {
    label: 'Coastal Shores', tier: 1,
    surface: 'sand', filler: 'sand',
    trees: [],
    plants: [{ block: 'reed', d: 0.02 }],
    nodes: [{ type: 'fishing_spot', d: 0.006 }, { type: 'clay_deposit', d: 0.004 }],
    enemies: [{ type: 'shell_snapper', d: 0.0025 }],
  },
  crystal_caverns: {
    label: 'Crystal Caverns', tier: 2,
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
    let h = 16 + cont * 20 + hills * 7 + mount * 24;

    // Rivers: carve winding channels below sea level, but not on high peaks.
    const rv = ridge2(s + 55, x * 0.003, z * 0.003, 2);
    if (rv > 0.86 && h < SEA + 14) {
      const depth = (rv - 0.86) / 0.14; // 0..1
      h = Math.min(h, lerp(h, SEA - 2.5 - depth * 3, smoothstep(clamp(depth * 2, 0, 1))));
    }

    // Starter plateau: gentle, guaranteed-walkable land around the settlement.
    // Inner ring (d<34) is perfectly flat so hand-built structures sit cleanly.
    const d = Math.hypot(x, z);
    if (d < 150) {
      const t = smoothstep(clamp(1 - d / 150, 0, 1));
      h = lerp(h, 30.2 + hills * 1.6, t);
      if (d < 44) {
        const t2 = smoothstep(clamp((44 - d) / 10, 0, 1));
        h = lerp(h, 30, t2);
      }
    }
    return clamp(Math.floor(h), 4, WORLD_H - 6);
  }

  temperatureAt(x, z) { return fbm2(this.seed + 66, x * 0.0028, z * 0.0028, 3); }
  moistureAt(x, z) { return fbm2(this.seed + 77, x * 0.0031, z * 0.0031, 3); }

  // Distance rings decide danger tier; noise jitters the ring edges organic.
  tierAt(x, z) {
    const d = Math.hypot(x, z) + (fbm2(this.seed + 88, x * 0.01, z * 0.01, 2) - 0.5) * 120;
    if (d < 260) return 0;
    if (d < 520) return 1;
    if (d < 900) return 2;
    return 3;
  }

  biomeAt(x, z) {
    const h = this.heightAt(x, z);
    const t = this.temperatureAt(x, z);
    const m = this.moistureAt(x, z);
    const tier = this.tierAt(x, z);

    if (h <= SEA + 1 && tier >= 1) return BIOMES.coastal_shores;
    if (tier === 0) {
      return m > 0.56 ? BIOMES.ancient_forest : BIOMES.greenwood_plains;
    }
    if (tier === 1) {
      if (m > 0.6 && h < SEA + 8) return BIOMES.misty_wetlands;
      if (h > SEA + 12) return BIOMES.rocky_highlands;
      return m > 0.5 ? BIOMES.ancient_forest : BIOMES.greenwood_plains;
    }
    if (tier === 2) {
      if (t > 0.58) return BIOMES.sunbaked_badlands;
      if (t < 0.42) return BIOMES.frostbound_tundra;
      return BIOMES.rocky_highlands;
    }
    return t > 0.5 ? BIOMES.volcanic_wastes : BIOMES.corrupted_wilds;
  }

  isCave(x, y, z) {
    if (y < 4 || y > WORLD_H - 12) return false;
    const d = Math.hypot(x, z);
    if (d < 46) return false; // keep the settlement's underground intact for the hand-built mine
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

    for (let y = 0; y < WORLD_H; y++) {
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
    const ry = 6 + Math.floor(hash3(gen.seed + 303, cx, cz, i * 3 + 2) * 20);
    out.push({ lx: rx, ly: ry, lz: rz, roll: hash3(gen.seed + 304, cx, cz, i) });
  }
  return out;
}
