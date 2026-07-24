// Runtime mob-override store for the in-game Admin / Debug panel.
//
// Player-authored tweaks (which mobs spawn, how densely, in which biomes, and
// what they drop) live here, layered on top of the immutable ENEMY_TYPES
// registry in enemies.js. Persisted to localStorage under 'emberveil.mobconfig'
// and read LIVE by worldgen spawning (js/world/world.js) and combat drops
// (combat.js / combatrs.js). Node-safe: with no localStorage it starts empty.
//
// Override shape (all keys optional), per mob type:
//   { active: bool, rate: 0..4, biomes: string[]|null, drops: [{item,qty:[min,max],chance}] }
import { ENEMY_TYPES } from './enemies.js';

export const MOBCONFIG_KEY = 'emberveil.mobconfig';

function loadOverrides() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(MOBCONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Loaded once at import; mutated in place by setMobConfig/resetMobConfig so the
// exported binding is always the live store every consumer reads through.
export const MOB_OVERRIDES = loadOverrides();

// Native mobs default ON; imported mobs (imported:true) default OFF until the
// player explicitly activates them.
export function mobActive(type) {
  const a = MOB_OVERRIDES[type]?.active;
  return a ?? (ENEMY_TYPES[type]?.imported ? false : true);
}

// Density multiplier applied to the mob's per-block spawn chance. 1 = default.
export function mobRate(type) {
  return MOB_OVERRIDES[type]?.rate ?? 1;
}

// null = spawn wherever it already spawns / everywhere it's declared.
// A non-null array of biome KEYS restricts (or, for added mobs, steers) spawns.
export function mobBiomes(type) {
  return MOB_OVERRIDES[type]?.biomes ?? null;
}

// The effective drop table for a defeated mob: an override if present, else the
// registry default. Same shape as ENEMY_TYPES[type].drops.
export function mobDropsFor(type) {
  return MOB_OVERRIDES[type]?.drops ?? (ENEMY_TYPES[type]?.drops ?? []);
}

// Merge a partial patch into a mob's override, creating the entry if needed.
export function setMobConfig(type, patch) {
  const cur = MOB_OVERRIDES[type] || (MOB_OVERRIDES[type] = {});
  Object.assign(cur, patch);
  return cur;
}

// Drop all overrides for a mob (back to registry defaults).
export function resetMobConfig(type) {
  delete MOB_OVERRIDES[type];
}

// Persist the whole override store. No-op when localStorage is unavailable.
export function saveMobConfig() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(MOBCONFIG_KEY, JSON.stringify(MOB_OVERRIDES));
  } catch {
    /* private mode / quota — keep running with in-memory config */
  }
}

// Sorted list of every registered mob type (so mobs added by other modules at
// runtime appear in the panel automatically).
export function allMobTypes() {
  return Object.keys(ENEMY_TYPES).sort();
}
