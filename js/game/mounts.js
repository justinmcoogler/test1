// Mounts and pets — the Handling skill, and the way up to the sky archipelago.
//
// The islands (js/world/sky.js) sit in three ring-gated altitude bands and
// nothing in this game could climb to them without a mount. This is that
// system, and the reason the bands are where they are.
//
// TWO GATES, AND THEY DO DIFFERENT JOBS.
//
//  1. THE CEILING IS THE PROGRESSION. Each flying mount has a hard altitude
//     ceiling, and the bands are set so each one needs the next dragon. You
//     cannot reach the meteoric iron on a Crag Drake however long you climb —
//     it simply stops going up, the same way a horse stops at a cliff. That
//     makes the sky a ladder rather than a single unlock, and it is why
//     `bandsReached` below is asserted against the real generator rather than
//     written down twice.
//
//  2. THE SKILL IS THE PACE. Every mount and pet needs a Handling level. Taming
//     is what raises it, so the ladder is self-propelling: you tame what you can
//     reach, and reaching further is the reward for having done it. Without this
//     a player who happened to walk far enough could tame a Riftdrake in the
//     first hour and delete the entire vertical axis of the game in one go.
//
// Everything here is pure: no DOM, no world mutation, no rendering. The riding
// physics live on the player (js/player/player.js `rideUpdate`), the taming
// interaction lives in main.js, and this module owns what a mount IS and what
// the player has. That split is what lets the ceilings be unit-tested against
// actual island altitudes instead of eyeballed.
import { ITEMS } from './items.js';

// `ceiling` is the highest Y the mount will climb to. `climb` and `speed` are
// blocks per second. `tame` is what it will take from your hand; `level` is the
// Handling level it will not talk to you below; `ring` is how far out you have
// to walk to find one in the wild.
//
// The horses are a real ladder, not one horse with three coats of paint: a pony
// is barely faster than running and a Steppe Runner is faster than anything else
// on the ground, and the levels between them are the whole point of keeping a
// ground tier at all once you can fly. You will still ride a horse after you own
// a dragon, because a dragon is slow to get moving and the errand is two hundred
// blocks away.
export const MOUNTS = {
  horse: {
    label: 'Moorland Pony', flying: false, ceiling: 0, speed: 9.5, climb: 0, ring: 0,
    tame: 'grainsheaf', tameCount: 3, level: 1,
    desc: 'Shaggy, short and unimpressed by weather. Faster than walking and it carries your pack. Everything you learn on it you will use in the air.',
  },
  courser: {
    label: 'Courser', flying: false, ceiling: 0, speed: 12, climb: 0, ring: 1,
    tame: 'grainsheaf', tameCount: 6, level: 15,
    desc: 'Long-legged and bred for the road. The first horse that genuinely eats distance — you will notice the difference inside a hundred blocks.',
  },
  destrier: {
    label: 'Destrier', flying: false, ceiling: 0, speed: 11, climb: 0, ring: 2,
    tame: 'roast_haunch', tameCount: 6, level: 30,
    desc: 'Heavy, deep-chested and entirely unbothered. Slower than a Courser and it does not care what walks out of the trees at it.',
  },
  steppe_runner: {
    label: 'Steppe Runner', flying: false, ceiling: 0, speed: 15, climb: 0, ring: 3,
    tame: 'grainsheaf', tameCount: 10, level: 45,
    desc: 'Lean, wind-burnt and half wild. The fastest thing on the ground in this world, and it will let exactly one person near it.',
  },
  crag_drake: {
    label: 'Crag Drake', flying: true, ceiling: 162, speed: 11, climb: 4.5, ring: 1,
    tame: 'boar_haunch', tameCount: 4, level: 25,
    desc: 'A broad-winged cliff dragon, patient and slow to climb. It will carry you to the low shelf and no further — past about a hundred and sixty blocks it simply stops rising, and banks.',
  },
  // The Pegasus sits between the first two dragons on purpose. It is the fastest
  // climber in the game and the only flyer that clears the ENTIRE low shelf —
  // a Crag Drake stops at 162, which leaves the tallest ring-1 crowns out of
  // reach — and then it stops dead a long way short of the middle band. So it is
  // never the mount that unlocks a band; it is the mount that makes the band you
  // already have pleasant to work, and the reason to keep a Crag Drake around is
  // nothing at all once you have one. That is deliberate: it retires a dragon.
  pegasus: {
    label: 'Pegasus', flying: true, ceiling: 190, speed: 17, climb: 8, ring: 2,
    tame: 'grainsheaf', tameCount: 12, level: 40,
    desc: 'A white horse with a wingspan wider than it is long, and no visible opinion about dragons. Climbs faster than anything else alive and gives out early — the whole low shelf, and not one foot of the middle band.',
  },
  storm_wyrm: {
    label: 'Storm Wyrm', flying: true, ceiling: 266, speed: 15, climb: 7, ring: 2,
    tame: 'silverfin', tameCount: 6, level: 50,
    desc: 'Narrow, restless and built for weather. It rides updrafts hard and fast, high enough for the middle band, and it hates a blizzard.',
  },
  riftdrake: {
    label: 'Riftdrake', flying: true, ceiling: 480, speed: 19, climb: 10, ring: 3,
    tame: 'veilcrystal', tameCount: 3, level: 75,
    desc: 'Veil-touched, and the only thing that will carry you to the high archipelago — which is the only place the meteoric iron is.',
  },
};

// ---- pets -------------------------------------------------------------------
// The same skill, the other half of it. A pet does not carry you: it follows,
// and it is quietly good at one thing. `perk` is read by the systems it touches,
// so a pet is a real modifier rather than a cosmetic follower.
//
// Deliberately small perks. A pet you must have is a pet you resent; a pet you
// keep because you like having it around is the point.
export const PETS = {
  rat: {
    label: 'Pocket Rat', tame: 'grainsheaf', tameCount: 2, level: 1,
    perk: { kind: 'forage', value: 0.06 },
    desc: 'It moved into your pack and has not left. Turns up things you walked past — a 6% chance of an extra find whenever you gather.',
  },
  chicken: {
    label: 'Yard Hen', tame: 'grainsheaf', tameCount: 3, level: 5,
    perk: { kind: 'gatherXp', value: 0.08 },
    desc: 'Follows at exactly the distance that trips you, and scratches over every patch you work. 8% more XP from gathering, and company.',
  },
  rabbit: {
    label: 'Warren Rabbit', tame: 'tartberries', tameCount: 4, level: 10,
    perk: { kind: 'forage', value: 0.1 },
    desc: 'Knows where the good ground is and does not explain how. A 10% chance of an extra find whenever you gather.',
  },
  goat: {
    label: 'Pack Goat', tame: 'grainsheaf', tameCount: 6, level: 20,
    perk: { kind: 'haul', value: 2 },
    desc: 'Carries the load so you do not. Two-thirds of the energy off every swing of the axe. Ill-tempered, sure-footed, worth it.',
  },
  dragon_whelp: {
    label: 'Dragon Whelp', tame: 'flame_opal', tameCount: 2, level: 60,
    perk: { kind: 'warmth', value: 4 },
    desc: 'It will never grow. It runs hot enough to take four degrees off a blizzard, sets fire to nothing important, and sleeps in your hood.',
  },
};

export const MOUNT_IDS = Object.keys(MOUNTS);
export const PET_IDS = Object.keys(PETS);
export const FLYERS = MOUNT_IDS.filter((id) => MOUNTS[id].flying);
// Everything the Handling skill governs, mounts and pets alike. main.js scans
// this to decide whether the creature you are standing next to is tameable.
export const TAMEABLE = { ...MOUNTS, ...PETS };

// How high off the ground a rider sits, so the camera and the model agree.
export const SADDLE_H = 1.35;

// Descending is always free and always faster than climbing — you can come down
// from anywhere, on anything, which means a ceiling can strand nobody.
export const DIVE_RATE = 16;

// Handling XP. Finishing a tame pays the bulk of it, scaled by how hard the
// creature was to get near; each individual feed pays a trickle so a long tame
// never feels like nothing is happening.
export const FEED_XP = 12;
export function tameXp(id) {
  const d = TAMEABLE[id];
  if (!d) return 0;
  return Math.round(60 + (d.level || 1) * 18 + (d.flying ? 240 : 0));
}
// Riding pays per second, and flying pays more, because the flying is the part
// that is actually hard to have earned.
export const RIDE_XP_PER_SEC = 1.5;
export const FLY_XP_PER_SEC = 5;

export function mountDef(id) { return MOUNTS[id] || null; }
export function petDef(id) { return PETS[id] || null; }
export function tameDef(id) { return TAMEABLE[id] || null; }
export function ceilingOf(id) { return MOUNTS[id]?.ceiling ?? 0; }
export function isFlyer(id) { return !!MOUNTS[id]?.flying; }
export function levelFor(id) { return TAMEABLE[id]?.level ?? 1; }

// At 90 Handling everything takes half the feed — the capstone in the unlock
// table (js/game/skills.js), and the only place feed cost is decided.
export function feedNeeded(id, handlingLevel) {
  const d = TAMEABLE[id];
  if (!d) return 0;
  return handlingLevel >= 90 ? Math.max(1, Math.ceil(d.tameCount / 2)) : d.tameCount;
}

// What a mount will take, as a readable line for the interaction prompt.
export function tameHint(id, handlingLevel = 1) {
  const d = TAMEABLE[id];
  if (!d) return '';
  const label = ITEMS[d.tame]?.label || d.tame;
  return `${feedNeeded(id, handlingLevel)}x ${label}`;
}

// ---- the player's stable ---------------------------------------------------
// Tamed mounts and pets, which mount is currently under you, and which pet is
// out. Deliberately tiny and serialisable: the save stores lists of ids, and
// nothing else — a mount has no inventory, no health bar and no name, so there
// is no state that can drift.
export class Stable {
  constructor() {
    this.tamed = new Set();
    this.active = null;        // id of the mount being ridden, or null
    this.pets = new Set();
    this.pet = null;           // id of the pet that is out, or null
    this.progress = new Map(); // id → how many tame items fed so far
  }

  has(id) { return this.tamed.has(id) || this.pets.has(id); }
  riding() { return this.active; }
  ridingDef() { return this.active ? MOUNTS[this.active] : null; }
  petOut() { return this.pet; }
  petOutDef() { return this.pet ? PETS[this.pet] : null; }

  // Feed it. Returns { tamed, need } — `tamed` true on the feed that finishes
  // the job, `need` how many more it wants. Feeding an already-tamed creature is
  // a no-op rather than an error, so a mis-click cannot waste food.
  feed(id, n = 1, handlingLevel = 1) {
    const d = TAMEABLE[id];
    if (!d) return { tamed: false, need: 0 };
    if (this.has(id)) return { tamed: false, need: 0 };
    const want = feedNeeded(id, handlingLevel);
    const at = (this.progress.get(id) || 0) + n;
    if (at >= want) {
      this.progress.delete(id);
      (PETS[id] ? this.pets : this.tamed).add(id);
      return { tamed: true, need: 0 };
    }
    this.progress.set(id, at);
    return { tamed: false, need: want - at };
  }

  mount(id) {
    if (!this.tamed.has(id)) return false;
    this.active = id;
    return true;
  }

  dismount() { this.active = null; }

  // One pet out at a time. Calling with the pet already out puts it away, so the
  // same interaction toggles — there is no separate "dismiss" affordance to find.
  callPet(id) {
    if (!this.pets.has(id)) return false;
    this.pet = this.pet === id ? null : id;
    return true;
  }

  // The sum of a perk across the pet that is out. Zero when nothing is out,
  // which is what every caller wants to multiply or add.
  perk(kind) {
    const d = this.petOutDef();
    return d && d.perk?.kind === kind ? d.perk.value : 0;
  }

  // The ceiling under the player right now. 0 when on foot, which the flight
  // code reads as "no flying".
  ceiling() { return this.active ? ceilingOf(this.active) : 0; }

  serialize() {
    return {
      tamed: [...this.tamed], active: this.active,
      pets: [...this.pets], pet: this.pet,
      progress: [...this.progress],
    };
  }

  deserialize(d) {
    this.tamed = new Set(Array.isArray(d?.tamed) ? d.tamed.filter((i) => MOUNTS[i]) : []);
    this.pets = new Set(Array.isArray(d?.pets) ? d.pets.filter((i) => PETS[i]) : []);
    this.active = MOUNTS[d?.active] ? d.active : null;
    this.pet = PETS[d?.pet] ? d.pet : null;
    this.progress = new Map(Array.isArray(d?.progress)
      ? d.progress.filter((p) => Array.isArray(p) && TAMEABLE[p[0]]) : []);
    // A save that names a creature you no longer have must not leave you riding
    // it or walking a pet that is not yours.
    if (this.active && !this.tamed.has(this.active)) this.active = null;
    if (this.pet && !this.pets.has(this.pet)) this.pet = null;
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
    if (!best || ceilingOf(best) > ceilingOf(id)) best = id;
  }
  return best;
}
