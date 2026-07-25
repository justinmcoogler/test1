// Mounts — the way up to the sky archipelago.
//
// The islands (js/world/sky.js) sit in three ring-gated altitude bands and
// nothing in this game could climb to them: there was no riding system at all,
// and the `horse` in the roster was a defensive mob you could hit. This is that
// system, and the reason the bands are where they are.
//
// THE CEILING IS THE PROGRESSION. Each flying mount has a hard altitude ceiling,
// and the bands are set so each one needs the next mount. You cannot reach the
// meteoric iron on a Ridgewing however long you climb — it simply stops going
// up, the same way a horse stops at a cliff. That makes the sky a ladder rather
// than a single unlock, and it is why `SKY_BANDS_REACHED` below is asserted
// against the real generator rather than written down twice.
//
// Everything here is pure: no DOM, no world mutation, no rendering. The riding
// physics live on the player (js/player/player.js `flightUpdate`), the taming
// interaction lives in main.js, and this module owns what a mount IS and what
// the player has. That split is what lets the ceilings be unit-tested against
// actual island altitudes instead of eyeballed.
import { ITEMS } from './items.js';

// `ceiling` is the highest Y the mount will climb to. `climb` and `speed` are
// blocks per second. `tame` is what it will take from your hand; `ring` is how
// far out you have to walk to find one in the wild.
//
// The ground mount is here too: a horse is the tutorial for the whole system, so
// the controls you learn at ring 0 are the controls you fly with at ring 3.
export const MOUNTS = {
  horse: {
    label: 'Horse', flying: false, ceiling: 0, speed: 9.5, climb: 0, ring: 0,
    tame: 'grainsheaf', tameCount: 3,
    desc: 'Faster than walking and it carries your pack. It will not leave the ground, but everything you learn on it you will use in the air.',
  },
  ridgewing: {
    label: 'Ridgewing', flying: true, ceiling: 162, speed: 11, climb: 4.5, ring: 1,
    tame: 'boar_haunch', tameCount: 4,
    desc: 'A broad-winged crag glider, patient and slow to climb. It will carry you to the low shelf and no further — past about a hundred and sixty blocks it simply stops rising, and banks.',
  },
  stormjack: {
    label: 'Stormjack', flying: true, ceiling: 266, speed: 15, climb: 7, ring: 2,
    tame: 'silverfin', tameCount: 6,
    desc: 'Built like a storm-petrel and just as nervous. It rides updrafts hard and fast, high enough for the middle band, and it hates a blizzard.',
  },
  riftwing: {
    label: 'Riftwing', flying: true, ceiling: 480, speed: 19, climb: 10, ring: 3,
    tame: 'veilcrystal', tameCount: 3,
    desc: 'Veil-touched, and the only thing that will carry you to the high archipelago — which is the only place the meteoric iron is.',
  },
};

export const MOUNT_IDS = Object.keys(MOUNTS);
export const FLYERS = MOUNT_IDS.filter((id) => MOUNTS[id].flying);

// How high off the ground a rider sits, so the camera and the model agree.
export const SADDLE_H = 1.35;

// Descending is always free and always faster than climbing — you can come down
// from anywhere, on anything, which means a ceiling can stranded nobody.
export const DIVE_RATE = 16;

export function mountDef(id) { return MOUNTS[id] || null; }
export function ceilingOf(id) { return MOUNTS[id]?.ceiling ?? 0; }
export function isFlyer(id) { return !!MOUNTS[id]?.flying; }

// What a mount will take, as a readable line for the interaction prompt.
export function tameHint(id) {
  const d = MOUNTS[id];
  if (!d) return '';
  const label = ITEMS[d.tame]?.label || d.tame;
  return `${d.tameCount}x ${label}`;
}

// ---- the player's stable ---------------------------------------------------
// Tamed mounts, and which one is currently under you. Deliberately tiny and
// serialisable: the save stores a list of ids and the active id, and nothing
// else — a mount has no inventory, no health bar and no name, so there is no
// state that can drift.
export class Stable {
  constructor() {
    this.tamed = new Set();
    this.active = null;       // id of the mount being ridden, or null
    this.progress = new Map(); // id → how many tame items fed so far
  }

  has(id) { return this.tamed.has(id); }
  riding() { return this.active; }
  ridingDef() { return this.active ? MOUNTS[this.active] : null; }

  // Feed it. Returns { tamed, need } — `tamed` true on the feed that finishes
  // the job, `need` how many more it wants. Feeding an already-tamed mount is a
  // no-op rather than an error, so a mis-click cannot waste food.
  feed(id, n = 1) {
    const d = MOUNTS[id];
    if (!d) return { tamed: false, need: 0 };
    if (this.tamed.has(id)) return { tamed: false, need: 0 };
    const at = (this.progress.get(id) || 0) + n;
    if (at >= d.tameCount) {
      this.progress.delete(id);
      this.tamed.add(id);
      return { tamed: true, need: 0 };
    }
    this.progress.set(id, at);
    return { tamed: false, need: d.tameCount - at };
  }

  mount(id) {
    if (!this.tamed.has(id)) return false;
    this.active = id;
    return true;
  }

  dismount() { this.active = null; }

  // The ceiling under the player right now. 0 when on foot, which the flight
  // code reads as "no flying".
  ceiling() { return this.active ? ceilingOf(this.active) : 0; }

  serialize() {
    return { tamed: [...this.tamed], active: this.active, progress: [...this.progress] };
  }

  deserialize(d) {
    this.tamed = new Set(Array.isArray(d?.tamed) ? d.tamed.filter((i) => MOUNTS[i]) : []);
    this.active = MOUNTS[d?.active] ? d.active : null;
    this.progress = new Map(Array.isArray(d?.progress)
      ? d.progress.filter((p) => Array.isArray(p) && MOUNTS[p[0]]) : []);
    // A save that names a mount you no longer have must not leave you riding it.
    if (this.active && !this.tamed.has(this.active)) this.active = null;
  }
}

// ---- reach ------------------------------------------------------------------
// Which sky bands a mount can actually land on. Used by the tests to check the
// ceilings against the generator, and by the UI to say what a mount is for.
//
// `tops` is the list of island surface heights to check against — the caller
// passes real ones from js/world/sky.js so this can never drift from the world.
export function bandsReached(id, tops) {
  const c = ceilingOf(id);
  return tops.filter((t) => t <= c).length;
}

// The lowest mount that reaches a given altitude, or null if nothing does.
export function mountFor(y) {
  let best = null;
  for (const id of FLYERS) {
    if (ceilingOf(id) < y) continue;
    if (!best || ceilingOf(id) < ceilingOf(best)) best = id;
  }
  return best;
}
