// The runtime half of a procedural dungeon's lock.
//
// js/world/dungeon.js builds the static half and proves it by flood-fill: a boss
// room that is a LEAF of the room tree, one tree edge reaching it, an iron-bar
// grate across that edge, and a mini-boss carrying the key standing somewhere
// you can reach WITHOUT passing the grate. What it cannot do is make any of that
// mean anything at play time — a generator has no inventory, no kill events and
// no save flags. That is this file.
//
// Three rules, and they are all here rather than spread through the interaction
// code so they can be tested without a browser:
//
//   * the grate is impassable and unmineable until it is unlocked;
//   * a key comes off the dungeon's own key holder and is SPENT opening its
//     grate — see KEY_ITEM below for why it is spent and not kept;
//   * the boss chest stays sealed until that dungeon's boss is dead.
//
// The last one is why the flags here are keyed by the dungeon's ANCHOR and never
// by a mob type. main.js's BOSS_FLAGS maps a mob TYPE to a world flag, which is
// correct for the two hand-built bosses (rootbound_golem and rimehowl_alpha are
// each one creature in one place), and would be a bug here: `grave_wight` is a
// crypt dungeon's boss AND ordinary garrison fodder in the fortress ring, so a
// type-keyed flag would unseal every crypt hoard in the world the first time a
// player cut down a wandering wight. dungeon.js flags this in its own comments;
// this file is the other side of that contract.
import { dungeonAt, DG_REGION, DG_HALF, KEY_ITEM } from '../world/dungeon.js';
import { ENEMY_TYPES } from './enemies.js';
import { ITEMS } from './items.js';

// The key is defined by the generator (js/world/dungeon.js), which stamps it onto
// every door it builds; this file re-exports it so the runtime and the layout are
// reading one constant rather than two that have to be kept in step. See the note
// there for why it is a bespoke item and not `relic_fragment`.
export { KEY_ITEM };

// ---- identity --------------------------------------------------------------
// A dungeon's region anchor. Unique per world (one dungeon per region, and the
// anchor is inset from the region edge), stable across loads because the layout
// is a pure function of (seed, region), and short enough to sit in the save's
// flag bag.
export function dungeonId(dg) { return `${dg.x},${dg.z}`; }
export function gateFlag(dg) { return `dg_gate:${dungeonId(dg)}`; }
export function bossFlag(dg) { return `dg_boss:${dungeonId(dg)}`; }

// The dungeon whose footprint contains (x, z), or null. Layouts are cached in
// dungeon.js, so the nine candidate regions cost nine map lookups after the
// first call.
export function dungeonNear(gen, x, z) {
  const rx0 = Math.floor((x - DG_HALF) / DG_REGION), rx1 = Math.floor((x + DG_HALF) / DG_REGION);
  const rz0 = Math.floor((z - DG_HALF) / DG_REGION), rz1 = Math.floor((z + DG_HALF) / DG_REGION);
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      const dg = dungeonAt(gen, rx, rz);
      if (!dg) continue;
      if (x < dg.minX || x > dg.maxX || z < dg.minZ || z > dg.maxZ) continue;
      return dg;
    }
  }
  return null;
}

// ---- the grate -------------------------------------------------------------
// The nine iron-bar cells dungeon.js writes across the locked edge: three tall,
// three wide, in the boss room's wall on the side the corridor enters from. The
// trim posts framing it are masonry, not lock — they stay.
export function grateCells(dg) {
  const d = dg.door;
  const out = [];
  for (let y = d.y; y <= d.y + 2; y++) {
    for (let k = -1; k <= 1; k++) {
      out.push(d.alongX ? [d.x, y, d.z + k] : [d.x + k, y, d.z]);
    }
  }
  return out;
}

export function isGrateCell(dg, x, y, z) {
  const d = dg.door;
  if (y < d.y || y > d.y + 2) return false;
  return d.alongX
    ? (x === d.x && Math.abs(z - d.z) <= 1)
    : (z === d.z && Math.abs(x - d.x) <= 1);
}

// The spawn ids dungeon.js minted for the two creatures that matter. Both are
// read off the layout's own spawn list rather than recomputed, so they cannot
// drift from the ids the world actually registered.
export function keyHolderId(dg) { return dg.door.keyHolder; }

export function bossSpawnId(dg) {
  const s = dg.spawns.find((sp) => sp.boss && !sp.key);
  return s ? `dg:${s.x},${s.y},${s.z}` : null;
}

// ---- state machine ---------------------------------------------------------
// `flags` is the game's world-flag bag (main.js `this.flags`, persisted in the
// save). Everything below reads or writes only that, so the whole lock is a
// function of the save plus how many keys you are carrying.
export function gateOpen(flags, dg) { return !!flags[gateFlag(dg)]; }
export function bossDead(flags, dg) { return !!flags[bossFlag(dg)]; }

// What touching the grate does. Never mutates — the caller spends the key and
// calls openGate, so a refusal cannot half-apply.
export function gateVerdict(flags, dg, keys) {
  if (gateOpen(flags, dg)) return { act: 'pass', msg: null };
  if (keys > 0) {
    return { act: 'unlock', spend: 1, msg: `The ${keyLabel()} turns, and the grate grinds down into the floor.` };
  }
  return {
    act: 'refuse',
    msg: `The grate is locked fast — no bar of it will shift. A ${keyLabel()} would turn it, `
      + 'and the warden of this place carries one.',
  };
}

export function openGate(flags, dg) { flags[gateFlag(dg)] = true; }
export function markBossDead(flags, dg) { flags[bossFlag(dg)] = true; }

// Is this chest id the dungeon's boss hoard, and is it still sealed?
export function bossChestSealed(flags, dg, chestId) {
  return chestId === dg.bossChest.id && !bossDead(flags, dg);
}

export function sealedChestMsg(dg) {
  const label = ENEMY_TYPES[dg.theme.boss]?.label || 'guardian';
  return `The hoard is sealed under the ${dg.theme.key}'s own wards — the ${label} still breathes.`;
}

function keyLabel() { return ITEMS[KEY_ITEM]?.label || 'key'; }
