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

// A flat shelf just west of Brookhollow for the converted starter manor. Pinned
// to the settlement surface (64) so the manor's terrace sits flush and the lane
// from town stays level. Kept clear of procedural trees/mobs by world.js.
export const MANOR_PAD = { x: -60, z: 0, ground: 64 };

// Numbers Meadow: a flat, combat-free classroom pad for the kids' Learning Mode
// (Phase 1). Far enough out to be its own quiet space, pinned flat at the
// settlement surface (64) so the hand-built lesson yard sits cleanly. Kept clear
// of procedural trees/mobs by world.js. See js/game/lessons.js.
export const LEARN_MEADOW = { x: 200, z: 200, ground: 64 };

// A real-world climate taxonomy. biomeAt() places each biome by real drivers —
// elevation (mountains, snow-capped peaks), then temperature × moisture
// (Whittaker) — with temperature biased toward mild/temperate near spawn so the
// spawn valley is livable and the colder/hotter/higher climates (and the rarer
// woods & ores they hold) emerge the farther out you travel.
// Keys greenwood_plains / ancient_forest / misty_wetlands / coastal_shores are
// load-bearing (mob spawn files reference them) — do not rename them.
export const BIOMES = {
  greenwood_plains: {
    label: 'Grassland', tier: 0, climate: 'temperate grassland / prairie',
    surface: 'grass', filler: 'dirt',
    trees: [{ type: 'tree_pine', density: 0.01 }, { type: 'tree_birch', density: 0.005 }],
    plants: [{ block: 'tall_grass', d: 0.05 }, { block: 'wildflower', d: 0.012 }],
    nodes: [{ type: 'herb_patch', d: 0.004 }, { type: 'berry_bush', d: 0.003 }, { type: 'deposit_saltpeter', d: 0.0016 }],
    enemies: [{ type: 'mudback_boar', d: 0.0022 }, { type: 'thicket_sprite', d: 0.0015 }, { type: 'duskwing', d: 0.0014 }, { type: 'pixie', d: 0.0016 }, { type: 'meadow_stag', d: 0.0016 }, { type: 'cow', d: 0.0022 }, { type: 'pig', d: 0.002 }, { type: 'sheep', d: 0.0022 }, { type: 'chicken', d: 0.0024, pack: [2, 3] }, { type: 'horse', d: 0.0016 }, { type: 'rabbit', d: 0.0026 }],
  },
  ancient_forest: {
    label: 'Temperate Forest', tier: 0, climate: 'temperate deciduous forest',
    surface: 'grass', filler: 'dirt',
    trees: [
      { type: 'tree_oak', density: 0.02 }, { type: 'tree_birch', density: 0.012 },
      { type: 'tree_ash', density: 0.01 }, { type: 'tree_hickory', density: 0.008 },
      { type: 'tree_maple', density: 0.006 }, { type: 'tree_pine', density: 0.006 },
      { type: 'tree_walnut', density: 0.003 },
    ],
    plants: [{ block: 'tall_grass', d: 0.03 }, { block: 'mushroom_cap', d: 0.01 }],
    nodes: [{ type: 'herb_patch', d: 0.006 }, { type: 'berry_bush', d: 0.004 }],
    enemies: [{ type: 'thicket_sprite', d: 0.003 }, { type: 'moss_lurker', d: 0.0018 }, { type: 'duskwing', d: 0.0018 }, { type: 'pixie', d: 0.0018 }, { type: 'meadow_stag', d: 0.0014 }, { type: 'cow', d: 0.0018 }, { type: 'pig', d: 0.0018 }, { type: 'sheep', d: 0.0018 }, { type: 'chicken', d: 0.002, pack: [2, 3] }, { type: 'horse', d: 0.0014 }, { type: 'rabbit', d: 0.0024 }],
  },
  temperate_rainforest: {
    label: 'Temperate Rainforest', tier: 1, climate: 'mild, very wet coniferous rainforest',
    surface: 'grass', filler: 'dirt',
    trees: [
      { type: 'tree_cedar', density: 0.04 }, { type: 'tree_pine', density: 0.02 },
      { type: 'tree_hickory', density: 0.01 }, { type: 'tree_maple', density: 0.008 },
      { type: 'tree_walnut', density: 0.004 },
    ],
    plants: [{ block: 'tall_grass', d: 0.05 }, { block: 'mushroom_cap', d: 0.03 }, { block: 'reed', d: 0.01 }],
    nodes: [{ type: 'herb_patch', d: 0.01 }, { type: 'berry_bush', d: 0.005 }],
    enemies: [{ type: 'moss_lurker', d: 0.003 }, { type: 'thicket_sprite', d: 0.002 }, { type: 'duskwing', d: 0.0016 }],
  },
  savanna: {
    label: 'Savanna', tier: 1, climate: 'tropical grassland / savanna',
    surface: 'grass', filler: 'dirt',
    trees: [{ type: 'tree_teak', density: 0.004 }],
    plants: [{ block: 'tall_grass', d: 0.06 }, { block: 'wildflower', d: 0.006 }],
    nodes: [{ type: 'herb_patch', d: 0.004 }, { type: 'deposit_saltpeter', d: 0.002 }, { type: 'dig_site', d: 0.0015 }],
    enemies: [{ type: 'dune_stalker', d: 0.0025 }, { type: 'sunscale_serpent', d: 0.0016 }, { type: 'mudback_boar', d: 0.0015 }, { type: 'dust_scarab', d: 0.0022 }],
  },
  sunbaked_badlands: {
    label: 'Desert', tier: 2, climate: 'hot desert',
    surface: 'sand', filler: 'sand',
    trees: [{ type: 'tree_teak', density: 0.0025 }],
    plants: [{ block: 'cactus_flesh', d: 0.006 }],
    nodes: [{ type: 'ore_lead', d: 0.003 }, { type: 'ore_silver', d: 0.003 }, { type: 'deposit_sulfur', d: 0.003 }, { type: 'dig_site', d: 0.004 }],
    enemies: [{ type: 'dune_stalker', d: 0.003 }, { type: 'sunscale_serpent', d: 0.002 }, { type: 'skeletal_archer', d: 0.0018 }, { type: 'dust_scarab', d: 0.003 }],
  },
  tropical_forest: {
    label: 'Tropical Rainforest', tier: 3, climate: 'hot humid rainforest',
    surface: 'grass', filler: 'dirt',
    trees: [
      { type: 'tree_teak', density: 0.03 }, { type: 'tree_ebony', density: 0.014 },
      { type: 'tree_lignum_vitae', density: 0.004 },
    ],
    plants: [{ block: 'tall_grass', d: 0.04 }, { block: 'mushroom_cap', d: 0.02 }],
    nodes: [{ type: 'herb_patch', d: 0.008 }, { type: 'berry_bush', d: 0.004 }],
    enemies: [{ type: 'moss_lurker', d: 0.003 }, { type: 'thicket_sprite', d: 0.002 }, { type: 'sunscale_serpent', d: 0.0016 }],
  },
  boreal_forest: {
    label: 'Boreal Forest', tier: 2, climate: 'cold coniferous taiga',
    surface: 'grass', filler: 'dirt',
    trees: [
      { type: 'tree_pine', density: 0.045 }, { type: 'tree_cedar', density: 0.018 },
      { type: 'tree_yew', density: 0.004 },
    ],
    plants: [{ block: 'mushroom_cap', d: 0.012 }, { block: 'tall_grass', d: 0.01 }],
    nodes: [{ type: 'herb_patch', d: 0.005 }, { type: 'deposit_coal', d: 0.003 }],
    enemies: [{ type: 'frostmaw_wolf', d: 0.0022, pack: [2, 3] }, { type: 'rime_shade', d: 0.0014 }, { type: 'bone_hound', d: 0.0018, pack: [2, 3] }, { type: 'snow_hare', d: 0.0022 }],
  },
  frostbound_tundra: {
    label: 'Tundra', tier: 2, climate: 'cold dry tundra',
    surface: 'snow_grass', filler: 'dirt',
    trees: [{ type: 'tree_yew', density: 0.003 }],
    plants: [],
    nodes: [{ type: 'ore_iron', d: 0.004 }, { type: 'ore_silver', d: 0.002 }, { type: 'deposit_coal', d: 0.002 }],
    enemies: [{ type: 'frostmaw_wolf', d: 0.003, pack: [2, 3] }, { type: 'rime_shade', d: 0.0015 }, { type: 'bone_hound', d: 0.0018, pack: [2, 3] }, { type: 'frost_elemental', d: 0.0014 }, { type: 'snow_hare', d: 0.003, pack: [2, 3] }],
  },
  misty_wetlands: {
    label: 'Swamp', tier: 1, climate: 'wetland / swamp',
    surface: 'grass', filler: 'clay_block',
    trees: [{ type: 'tree_cedar', density: 0.02 }],
    plants: [{ block: 'reed', d: 0.05 }, { block: 'mushroom_cap', d: 0.02 }],
    nodes: [{ type: 'herb_patch', d: 0.01 }, { type: 'clay_deposit', d: 0.006 }, { type: 'fishing_spot', d: 0.004 }],
    enemies: [{ type: 'bog_shambler', d: 0.003 }, { type: 'marsh_wisp', d: 0.002 }, { type: 'blight_horror', d: 0.0012 }, { type: 'bog_ooze', d: 0.0022 }, { type: 'will_o_wisp', d: 0.0018 }, { type: 'grave_wight', d: 0.0012 }, { type: 'mire_toad', d: 0.0018 }, { type: 'duck', d: 0.0024, pack: [2, 3] }],
  },
  rocky_highlands: {
    label: 'Mountains', tier: 1, climate: 'montane / alpine rock',
    surface: 'stone', filler: 'stone',
    trees: [{ type: 'tree_ash', density: 0.006 }, { type: 'tree_hickory', density: 0.004 }],
    plants: [{ block: 'tall_grass', d: 0.008 }],
    nodes: [{ type: 'ore_iron', d: 0.005 }, { type: 'ore_copper', d: 0.004 }, { type: 'ore_tin', d: 0.004 }, { type: 'deposit_coal', d: 0.003 }, { type: 'dig_site', d: 0.0015 }],
    enemies: [{ type: 'craghorn_ram', d: 0.0025 }, { type: 'stone_pecker', d: 0.002 }, { type: 'scrap_goblin', d: 0.002 }, { type: 'cave_slime', d: 0.0016 }, { type: 'skeletal_archer', d: 0.0014 }, { type: 'stone_golem', d: 0.0009 }, { type: 'crag_bat', d: 0.0018, pack: [2, 3] }, { type: 'goat', d: 0.0022 }],
  },
  snowy_peaks: {
    label: 'Snowy Mountains', tier: 2, climate: 'alpine snow / glacier',
    surface: 'snow', filler: 'stone',
    trees: [],
    plants: [],
    nodes: [{ type: 'ore_silver', d: 0.003 }, { type: 'ore_gold', d: 0.0016 }, { type: 'deposit_coal', d: 0.002 }],
    enemies: [{ type: 'rime_shade', d: 0.0022 }, { type: 'craghorn_ram', d: 0.002 }, { type: 'hollow_watcher', d: 0.0012 }, { type: 'frost_elemental', d: 0.0016 }, { type: 'stone_golem', d: 0.0009 }, { type: 'gaze_orb', d: 0.0012 }],
  },
  volcanic_wastes: {
    label: 'Volcanic Fields', tier: 3, climate: 'active volcanic',
    surface: 'ashen_soil', filler: 'basalt',
    trees: [],
    plants: [],
    nodes: [{ type: 'ore_gold', d: 0.003 }, { type: 'ore_meteoric', d: 0.002 }, { type: 'deposit_sulfur', d: 0.004 }],
    enemies: [{ type: 'cinder_imp', d: 0.004 }, { type: 'magma_hulk', d: 0.0015 }, { type: 'veil_crawler', d: 0.0016 }, { type: 'gaze_orb', d: 0.0014 }, { type: 'ash_salamander', d: 0.0026 }],
  },
  monsoon_forest: {
    label: 'Monsoon Forest', tier: 2, climate: 'tropical dry / seasonal forest',
    surface: 'grass', filler: 'dirt',
    trees: [{ type: 'tree_teak', density: 0.035 }, { type: 'tree_ebony', density: 0.008 }],
    plants: [{ block: 'tall_grass', d: 0.04 }, { block: 'mushroom_cap', d: 0.008 }],
    nodes: [{ type: 'herb_patch', d: 0.006 }, { type: 'berry_bush', d: 0.003 }],
    enemies: [{ type: 'sunscale_serpent', d: 0.0022 }, { type: 'moss_lurker', d: 0.0016 }, { type: 'dune_stalker', d: 0.0014 }],
  },
  shrubland: {
    label: 'Mediterranean Shrubland', tier: 1, climate: 'warm, dry-summer chaparral',
    surface: 'grass', filler: 'dirt',
    trees: [{ type: 'tree_oak', density: 0.005 }, { type: 'tree_pine', density: 0.004 }],
    plants: [{ block: 'tall_grass', d: 0.04 }, { block: 'wildflower', d: 0.02 }],
    nodes: [{ type: 'herb_patch', d: 0.006 }, { type: 'berry_bush', d: 0.003 }, { type: 'deposit_saltpeter', d: 0.0016 }],
    enemies: [{ type: 'dune_stalker', d: 0.002 }, { type: 'sunscale_serpent', d: 0.0016 }, { type: 'thicket_sprite', d: 0.0016 }, { type: 'scrap_goblin', d: 0.0018 }, { type: 'rabbit', d: 0.0024 }],
  },
  cold_desert: {
    label: 'Cold Desert', tier: 2, climate: 'cold semi-arid steppe',
    surface: 'gravel', filler: 'dirt',
    trees: [],
    plants: [{ block: 'tall_grass', d: 0.012 }],
    nodes: [{ type: 'ore_lead', d: 0.003 }, { type: 'ore_zinc', d: 0.0024 }, { type: 'dig_site', d: 0.003 }],
    enemies: [{ type: 'dune_stalker', d: 0.0022 }, { type: 'rime_shade', d: 0.0016 }, { type: 'craghorn_ram', d: 0.0016 }, { type: 'grave_wight', d: 0.0014 }],
  },
  marshland: {
    label: 'Marshland', tier: 1, climate: 'flooded grassland / marsh',
    surface: 'grass', filler: 'clay_block',
    trees: [],
    plants: [{ block: 'reed', d: 0.08 }, { block: 'tall_grass', d: 0.03 }],
    nodes: [{ type: 'herb_patch', d: 0.008 }, { type: 'clay_deposit', d: 0.006 }, { type: 'fishing_spot', d: 0.005 }],
    enemies: [{ type: 'bog_shambler', d: 0.0025 }, { type: 'marsh_wisp', d: 0.0022 }, { type: 'duskwing', d: 0.0016 }, { type: 'bog_ooze', d: 0.002 }, { type: 'will_o_wisp', d: 0.0018 }, { type: 'mire_toad', d: 0.0016 }, { type: 'duck', d: 0.0024, pack: [2, 3] }],
  },
  mangrove: {
    label: 'Mangrove Coast', tier: 2, climate: 'tropical coastal wetland',
    surface: 'grass', filler: 'clay_block',
    trees: [{ type: 'tree_teak', density: 0.02 }, { type: 'tree_cedar', density: 0.012 }],
    plants: [{ block: 'reed', d: 0.06 }, { block: 'mushroom_cap', d: 0.015 }],
    nodes: [{ type: 'fishing_spot', d: 0.006 }, { type: 'clay_deposit', d: 0.005 }, { type: 'herb_patch', d: 0.006 }],
    enemies: [{ type: 'bog_shambler', d: 0.0022 }, { type: 'marsh_wisp', d: 0.0018 }, { type: 'sunscale_serpent', d: 0.0016 }],
  },
  alpine_meadow: {
    label: 'Alpine Meadow', tier: 2, climate: 'montane grassland above the treeline',
    surface: 'grass', filler: 'stone',
    trees: [],
    plants: [{ block: 'tall_grass', d: 0.05 }, { block: 'wildflower', d: 0.02 }],
    nodes: [{ type: 'ore_copper', d: 0.003 }, { type: 'ore_tin', d: 0.003 }, { type: 'herb_patch', d: 0.006 }, { type: 'deposit_coal', d: 0.002 }],
    enemies: [{ type: 'craghorn_ram', d: 0.0026 }, { type: 'stone_pecker', d: 0.0018 }, { type: 'rime_shade', d: 0.0012 }, { type: 'stone_golem', d: 0.001 }, { type: 'goat', d: 0.0024 }],
  },
  ice_sheet: {
    label: 'Polar Ice Cap', tier: 3, climate: 'polar ice / permanent frost',
    surface: 'snow', filler: 'ice',
    trees: [],
    plants: [],
    nodes: [{ type: 'ore_meteoric', d: 0.0016 }, { type: 'deposit_coal', d: 0.0015 }],
    enemies: [{ type: 'rime_shade', d: 0.0024 }, { type: 'frostmaw_wolf', d: 0.0018, pack: [2, 3] }, { type: 'frost_elemental', d: 0.0018 }],
  },
  coastal_shores: {
    label: 'Coast', tier: 1, climate: 'coastal beach',
    surface: 'sand', filler: 'sand',
    trees: [],
    plants: [{ block: 'reed', d: 0.02 }],
    nodes: [{ type: 'fishing_spot', d: 0.006 }, { type: 'clay_deposit', d: 0.004 }, { type: 'deposit_saltpeter', d: 0.002 }],
    enemies: [{ type: 'shell_snapper', d: 0.0025 }, { type: 'duck', d: 0.0022, pack: [2, 3] }],
  },
  crystal_caverns: {
    label: 'Crystal Caverns', tier: 2, climate: 'subterranean',
    surface: 'stone', filler: 'stone',
    trees: [], plants: [], nodes: [],
    enemies: [{ type: 'cave_slime', d: 0.004 }, { type: 'gaze_orb', d: 0.0016 }, { type: 'crag_bat', d: 0.002, pack: [2, 4] }],
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
    // Manor pad: a flat shelf west of town so the starter manor sits cleanly
    const dm = Math.hypot(x - MANOR_PAD.x, z - MANOR_PAD.z);
    if (dm < 30) {
      const t2 = smoothstep(clamp((30 - dm) / 6, 0, 1));
      h = lerp(h, MANOR_PAD.ground, t2);
    }
    // Numbers Meadow pad: a flat classroom shelf for the kids' Learning Mode
    const dn = Math.hypot(x - LEARN_MEADOW.x, z - LEARN_MEADOW.z);
    if (dn < 30) {
      const t2 = smoothstep(clamp((30 - dn) / 6, 0, 1));
      h = lerp(h, LEARN_MEADOW.ground, t2);
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

  // Real-world biome placement. Order of real drivers: elevation (mountains,
  // snow-capped peaks, alpine meadows) → water's edge (coast, mangrove) →
  // waterlogged lowland (swamp/marsh) → Whittaker climate (temperature ×
  // moisture). Temperature is biased toward mild/temperate near spawn (the
  // "extremity" term) so the spawn valley is livable and the colder/hotter/
  // drier climates — and the rarer woods & ores they hold — emerge farther out.
  biomeAt(x, z) {
    const B = BIOMES;
    const h = this.heightAt(x, z);
    const tier = this.tierAt(x, z);

    // The hand-built Frostwatch frontier is pinned cold on every seed.
    if (Math.hypot(x - FROST_CAMP.x, z - FROST_CAMP.z) < 90) return B.frostbound_tundra;

    const d = Math.hypot(x, z);
    const ext = smoothstep(clamp((d - 80) / 900, 0, 1));
    // Temperature: mild near spawn, stretched to real extremes far out (so polar
    // caps and hot deserts actually occur). Moisture: contrast-stretched so arid
    // and rainforest-wet tails are reachable, not just the muddy middle.
    const t = clamp(0.5 + (this.temperatureAt(x, z) - 0.5) * (0.20 + 1.05 * ext), 0, 1);
    const m = clamp(0.5 + (this.moistureAt(x, z) - 0.5) * 1.45, 0, 1);

    // Water's edge: hot shores become mangrove, otherwise a sandy beach.
    if (h <= SEA + 1) return (t > 0.66 && m > 0.4) ? B.mangrove : B.coastal_shores;

    // Elevation bands: peaks snow-cap when high & cold, give way to alpine meadow
    // when merely cool, and are bare rock when warm.
    if (h > SEA + 52) return t < 0.5 ? B.snowy_peaks : B.rocky_highlands;
    if (h > SEA + 32) {
      if (t < 0.34) return B.snowy_peaks;
      if (t < 0.52) return B.alpine_meadow;
      return B.rocky_highlands;
    }

    // Rare active volcanic fields — clustered hotspots in the far hot-dry reaches,
    // NOT all arid land (a sparse ridge field keeps them scarce so deserts remain).
    if (tier >= 3 && t > 0.7 && m < 0.34 && ridge2(this.seed + 123, x * 0.0025, z * 0.0025, 2) > 0.85) return B.volcanic_wastes;

    // Low, waterlogged ground → wetlands, by temperature and how flooded.
    if (h < SEA + 8 && m > 0.66) {
      if (t > 0.66) return B.mangrove;
      if (m > 0.82) return B.marshland;
      return B.misty_wetlands;
    }

    // Whittaker climate: temperature tiers, moisture within each. Cold deserts &
    // the polar cap only form beyond the hospitable spawn ring (tier ≥ 1).
    if (t < 0.16) return B.ice_sheet;
    if (t < 0.34) return m > 0.5 ? B.boreal_forest : B.frostbound_tundra;
    if (t < 0.50) {                                            // cool
      if (m > 0.55) return B.boreal_forest;
      if (m < 0.26 && tier >= 1) return B.cold_desert;
      return B.greenwood_plains;
    }
    if (t < 0.66) {                                            // temperate
      if (m > 0.76) return B.temperate_rainforest;
      if (m > 0.44) return B.ancient_forest;
      if (m < 0.24 && tier >= 1) return B.cold_desert;
      return B.greenwood_plains;
    }
    if (t < 0.76) {                                            // warm
      if (m > 0.62) return B.temperate_rainforest;
      if (m > 0.42) return B.ancient_forest;
      return B.shrubland;                                      // warm & dry → mediterranean
    }
    // hot (t ≥ 0.76)
    if (m > 0.60) return B.tropical_forest;
    if (m > 0.42) return B.monsoon_forest;
    if (m > 0.26) return B.savanna;
    return B.sunbaked_badlands;                                // hot & arid → desert
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
  // Writes one column into the chunk-local block array (Uint16). Returns surface info.
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
