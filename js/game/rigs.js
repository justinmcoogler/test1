// Auto-rigger for built-in creatures: converts each flat voxel-box model into
// an animated part hierarchy (body/head/legs/arms/tail) and generates
// idle/walk/attack keyframes suited to the creature's movement style.
// Drop-in .bbmodel mobs bring their own parts + animations; this covers the
// natives, which are authored as flat box models.

// movement style per creature
const RIGS = {
  practice_dummy: 'sway',
  // farm animals
  cow: 'quadruped', pig: 'quadruped', sheep: 'quadruped', goat: 'quadruped', horse: 'quadruped',
  chicken: 'pecker', duck: 'pecker', rabbit: 'scamper',
  // vermin
  rat: 'scamper',
  // goblins — one body plan, so one rig
  scrap_goblin: 'biped', bog_goblin: 'biped', cave_goblin: 'biped',
  ash_goblin: 'biped', frost_goblin: 'biped', goblin_slinger: 'biped',
  goblin_warchief: 'biped', goblin_warlord: 'biped',
  // mounts + the whelp — horses and dragons both walk on four legs
  courser: 'quadruped', destrier: 'quadruped', steppe_runner: 'quadruped',
  crag_drake: 'quadruped', storm_wyrm: 'quadruped', riftdrake: 'quadruped',
  pegasus: 'quadruped',
  dragon_whelp: 'quadruped',
};

const cx = (b) => b.x + b.w / 2;
const cz = (b) => b.z + b.d / 2;

// A limb swinging a → -a → a over `len` seconds, sampled as a COSINE.
//
// This was three keyframes, and keyframes interpolate linearly — so a leg swung
// at a constant speed and reversed instantly at the ends of its arc. That is a
// scissor, not a stride; it is most of why the animals read as clockwork. Eight
// segments of a cosine is enough that the linear interpolation between them is
// invisible, and the limb now eases into and out of each end the way a real one
// loads and unloads.
const STEPS = 16;
const swing = (len, ax, ay = 0, az = 0) => {
  const keys = [];
  for (let i = 0; i <= STEPS; i++) {
    const c = Math.cos((i / STEPS) * Math.PI * 2);
    keys.push([+(len * i / STEPS).toFixed(4), [ax * c, ay * c, az * c]]);
  }
  return keys;
};
const swingT = (len, x, y, z) => swing(len, x, y, z);
// A limb swinging from `a` about the midpoint `mid` — for parts that rest at an
// angle (a tucked hind leg, a raised tail) rather than at zero.
const swingAbout = (len, mid, ax) => swing(len, ax).map(([t, v]) => [t, [v[0] + mid, v[1], v[2]]]);
// Twice-per-cycle bob: a body rises on each footfall, so it peaks twice per
// stride, not once.
const bob = (len, h) => {
  const keys = [];
  for (let i = 0; i <= STEPS; i++) {
    keys.push([+(len * i / STEPS).toFixed(4), [0, h * (0.5 - 0.5 * Math.cos((i / STEPS) * Math.PI * 4)), 0]]);
  }
  return keys;
};

export function buildRig(type, def) {
  const rig = RIGS[type];
  if (!rig || rig === 'none') return null;
  const boxes = def.model;
  const used = new Set();
  const take = (pred) => {
    const out = [];
    boxes.forEach((b, i) => { if (!used.has(i) && pred(b, i)) { used.add(i); out.push(b); } });
    return out;
  };
  const parts = [];
  const anims = { idle: { length: 3.2, parts: {} }, walk: { length: 0.7, parts: {} }, attack: { length: 0.5, loop: false, parts: {} } };
  const A = (part, anim, ch, keys) => {
    if (!anims[anim].parts[part]) anims[anim].parts[part] = {};
    anims[anim].parts[part][ch] = keys;
  };
  const headIdx = boxes.findIndex((b) => b.texFront);

  // models can declare their head boxes explicitly (def.headBoxes = indices);
  // otherwise geometry heuristics find the head + face furniture
  const takeHead = () => {
    if (def.headBoxes) return take((b, i) => def.headBoxes.includes(i));
    return take((b, i) => i === headIdx);
  };

  if (rig === 'quadruped' || rig === 'pecker') {
    // legs: small boxes standing on the ground
    const legs = take((b) => b.y <= 0.02 && b.h <= 0.75 && b.w <= 0.34);
    const head = takeHead();
    // face furniture (snout/horns/beak) rides with the head
    const hz = head.length ? cz(head[0]) : 99;
    const snout = def.headBoxes ? [] : take((b) => Math.abs(cx(b)) <= 0.5 && cz(b) >= hz && b.h <= 0.45);
    const tail = take((b) => cz(b) < -0.4 && b.w <= 0.28 && b.h <= 0.3);
    const body = take(() => true);
    parts.push({ id: 'body', pivot: [0, 0.35, 0], boxes: body, tex: def.skin });
    legs.forEach((b, i) => {
      const fore = cz(b) > 0, left = cx(b) < 0;
      const phase = (fore === left) ? 1 : -1; // diagonal pairs move together
      const id = `leg${i}`;
      parts.push({ id, pivot: [cx(b), b.y + b.h, cz(b)], boxes: [b], tex: def.skin });
      A(id, 'walk', 'rotate', swing(0.7, phase * 24));
    });
    if (head.length || snout.length) {
      const hb = head[0] || snout[0];
      parts.push({ id: 'head', pivot: [0, hb.y, cz(hb) - 0.15], boxes: [...head, ...snout], tex: def.skin });
      A('head', 'idle', 'rotate', [[0, [0, -10, 0]], [1.6, [0, 10, 0]], [3.2, [0, -10, 0]]]);
      A('head', 'walk', 'rotate', swing(0.7, 4));
      A('head', 'attack', 'rotate', rig === 'pecker'
        ? [[0, [0, 0, 0]], [0.12, [55, 0, 0]], [0.3, [-10, 0, 0]], [0.5, [0, 0, 0]]]
        : [[0, [0, 0, 0]], [0.15, [-28, 0, 0]], [0.32, [22, 0, 0]], [0.5, [0, 0, 0]]]);
    }
    if (tail.length) {
      const tb = tail[0];
      parts.push({ id: 'tail', pivot: [cx(tb), tb.y + tb.h / 2, tb.z + tb.d], boxes: tail, tex: def.skin });
      A('tail', 'idle', 'rotate', [[0, [0, -14, 0]], [1.6, [0, 14, 0]], [3.2, [0, -14, 0]]]);
      A('tail', 'walk', 'rotate', swing(0.7, 0, 18));
    }
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.015, 0));
    A('body', 'walk', 'translate', bob(0.7, 0.03));
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.15, [0, 0.02, 0.14]], [0.5, [0, 0, 0]]]);
  } else if (rig === 'biped') {
    const arms = take((b) => Math.abs(cx(b)) >= 0.35 && b.h >= 0.28 && b.w <= 0.55 && b.y > 0.05);
    const legs = take((b) => b.y <= 0.02 && b.h <= 0.75 && b.w <= 0.45);
    const head = takeHead();
    const body = take(() => true);
    parts.push({ id: 'body', pivot: [0, 0.4, 0], boxes: body, tex: def.skin });
    arms.forEach((b, i) => {
      const id = `arm${i}`, left = cx(b) < 0;
      parts.push({ id, pivot: [cx(b), b.y + b.h, cz(b)], boxes: [b], tex: def.skin });
      A(id, 'idle', 'rotate', swing(3.2, left ? 2.5 : -2.5));
      A(id, 'walk', 'rotate', swing(0.7, left ? 18 : -18));
      A(id, 'attack', 'rotate', [[0, [0, 0, 0]], [0.12, [-100, 0, 0]], [0.3, [30, 0, 0]], [0.5, [0, 0, 0]]]);
    });
    legs.forEach((b, i) => {
      const id = `bleg${i}`, left = cx(b) < 0;
      parts.push({ id, pivot: [cx(b), b.y + b.h, cz(b)], boxes: [b], tex: def.skin });
      A(id, 'walk', 'rotate', swing(0.7, left ? -22 : 22)); // opposite the same-side arm
    });
    if (head.length) {
      const hb = head[0];
      parts.push({ id: 'head', pivot: [0, hb.y, 0], boxes: head, tex: def.skin });
      A('head', 'idle', 'rotate', [[0, [0, -8, 0]], [1.6, [0, 8, 0]], [3.2, [0, -8, 0]]]);
      A('head', 'attack', 'rotate', [[0, [0, 0, 0]], [0.15, [-16, 0, 0]], [0.5, [0, 0, 0]]]);
    }
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.02, 0));
    A('body', 'walk', 'rotate', swing(0.7, 0, 0, 3));
    A('body', 'walk', 'translate', [[0, [0, 0.035, 0]], [0.18, [0, 0, 0]], [0.35, [0, 0.035, 0]], [0.52, [0, 0, 0]], [0.7, [0, 0.035, 0]]]);
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.15, [0, 0, 0.12]], [0.5, [0, 0, 0]]]);
  } else if (rig === 'floater') {
    parts.push({ id: 'body', pivot: [0, 0.6, 0], boxes: take(() => true), tex: def.skin });
    A('body', 'idle', 'translate', swingT(2.6, 0, 0.07, 0));
    A('body', 'idle', 'rotate', swing(2.6, 0, 0, 4));
    A('body', 'walk', 'translate', swingT(1.1, 0, 0.09, 0));
    A('body', 'walk', 'rotate', [[0, [8, 0, 3]], [0.55, [8, 0, -3]], [1.1, [8, 0, 3]]]);
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.14, [0, 0.05, 0.3]], [0.5, [0, 0, 0]]]);
    A('body', 'attack', 'rotate', [[0, [0, 0, 0]], [0.14, [-14, 0, 0]], [0.5, [0, 0, 0]]]);
    anims.walk.length = 1.1;
  } else if (rig === 'hopper') {
    const head = takeHead();
    const body = take(() => true);
    parts.push({ id: 'body', pivot: [0, 0.2, 0], boxes: body, tex: def.skin });
    if (head.length) {
      const hb = head[0];
      parts.push({ id: 'head', parent: 'body', pivot: [0, hb.y, 0], boxes: head, tex: def.skin });
      A('head', 'idle', 'rotate', [[0, [0, -10, 0]], [1.6, [0, 10, 0]], [3.2, [0, -10, 0]]]);
    }
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.015, 0));
    A('body', 'walk', 'translate', [[0, [0, 0, 0]], [0.25, [0, 0.14, 0]], [0.5, [0, 0, 0]]]);
    A('body', 'walk', 'rotate', [[0, [4, 0, 0]], [0.25, [-6, 0, 0]], [0.5, [4, 0, 0]]]);
    anims.walk.length = 0.5;
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.13, [0, 0.1, 0.25]], [0.5, [0, 0, 0]]]);
  } else if (rig === 'scamper' || rig === 'slither') {
    const head = takeHead();
    // whiskers/nose move with the head
    const hz2 = head.length ? cz(head[0]) : 99;
    const snout = def.headBoxes ? [] : take((b) => cz(b) > hz2 && b.h <= 0.3);
    const tail = take((b) => cz(b) < -0.4 && b.w <= 0.14);
    const body = take(() => true);
    parts.push({ id: 'body', pivot: [0, 0.15, 0], boxes: body, tex: def.skin });
    if (head.length) {
      const hb = head[0];
      parts.push({ id: 'head', pivot: [0, hb.y, cz(hb) - 0.1], boxes: [...head, ...snout], tex: def.skin });
      A('head', 'idle', 'rotate', [[0, [-6, -8, 0]], [1.6, [4, 8, 0]], [3.2, [-6, -8, 0]]]);
      A('head', 'attack', 'rotate', [[0, [0, 0, 0]], [0.13, [-24, 0, 0]], [0.3, [18, 0, 0]], [0.5, [0, 0, 0]]]);
    }
    if (tail.length) {
      const tb = tail[0];
      parts.push({ id: 'tail', pivot: [cx(tb), tb.y + tb.h / 2, tb.z + tb.d], boxes: tail, tex: def.skin });
      A('tail', 'idle', 'rotate', [[0, [0, -20, 0]], [1.6, [0, 20, 0]], [3.2, [0, -20, 0]]]);
      A('tail', 'walk', 'rotate', swing(0.45, 0, 26));
    }
    const sway = rig === 'slither' ? 12 : 6;
    A('body', 'walk', 'rotate', swing(0.45, 0, sway));
    A('body', 'walk', 'translate', swingT(0.45, 0.02, 0.01, 0));
    anims.walk.length = 0.45;
    A('body', 'idle', 'rotate', swing(3.2, 0, rig === 'slither' ? 6 : 2));
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.12, [0, 0.04, 0.3]], [0.5, [0, 0, 0]]]);
  } else if (rig === 'lumberer') {
    parts.push({ id: 'body', pivot: [0, 0.3, 0], boxes: take(() => true), tex: def.skin });
    A('body', 'idle', 'translate', swingT(3.6, 0, 0.02, 0));
    anims.idle.length = 3.6;
    A('body', 'walk', 'rotate', swing(0.9, 0, 0, 6));
    A('body', 'walk', 'translate', bob(0.9, 0.03));
    anims.walk.length = 0.9;
    A('body', 'attack', 'rotate', [[0, [0, 0, 0]], [0.16, [22, 0, 0]], [0.5, [0, 0, 0]]]);
  } else if (rig === 'sway') {
    parts.push({ id: 'body', pivot: [0, 0.05, 0], boxes: take(() => true), tex: def.skin });
    A('body', 'idle', 'rotate', swing(3.6, 0, 0, 2));
    anims.idle.length = 3.6;
    delete anims.walk;
    A('body', 'attack', 'rotate', [[0, [0, 0, 0]], [0.2, [0, 0, 8]], [0.5, [0, 0, 0]]]);
  }

  if (!parts.length) return null;
  return { parts, animations: anims };
}

// ---- gait ------------------------------------------------------------------
// A walk cycle keyed to the CLOCK swings at the same rate whether a creature is
// ambling or bolting, so its feet slide over the ground. That skate is the
// single loudest tell that something is not really walking, and every animal in
// the game had it. Keying the cycle to DISTANCE COVERED instead keeps a footfall
// on the same patch of ground at any speed — which is what Minecraft does, and
// most of why its mobs read as walking rather than sliding.
//
// One stride per STRIDE blocks. The amplitude follows speed (smoothed), so the
// swing grows into a run and dies away as the creature stops rather than
// snapping on and off with the clip.
export const STRIDE = 1.15;      // blocks of ground per full leg cycle
export const GAIT_FULL = 3.2;    // blocks/sec at which the swing reaches full size
const GAIT_EASE = 7;             // how fast the amplitude follows the speed
const GAIT_FLOOR = 0.35;         // a creature being nudged is still walking

// `state` is anything we may hang four numbers on — a creature, the player, a
// remote player. Returns the phase through the cycle (0..1) and how big the
// swing should be (0..1).
export function gaitOf(state, dt, x = state.x, z = state.z) {
  const step = state._gaitX === undefined ? 0 : Math.hypot(x - state._gaitX, z - state._gaitZ);
  state._gaitX = x; state._gaitZ = z;
  state._gaitDist = (state._gaitDist || 0) + step;
  const speed = dt > 0 ? step / dt : 0;
  const prev = state._gaitAmt || 0;
  state._gaitAmt = prev + (Math.min(1, speed / GAIT_FULL) - prev) * Math.min(1, (dt || 0) * GAIT_EASE);
  return {
    phase: (state._gaitDist / STRIDE) % 1,
    amount: Math.max(GAIT_FLOOR, state._gaitAmt),
  };
}

// ---- which limb is where ---------------------------------------------------
// The part's NAME is the author's intent and comes first; the pivot is only a
// fallback. It has to be that way round, because a rig may legitimately put both
// hips on the centreline — the goblins do, since a leg hangs from the inner edge
// of its box and a leg's inner edge IS the centreline. Reading the side off the
// pivot therefore said both legs were the same side, and every goblin in the
// game walked with both feet swinging forward together.
function limbSide(p, i) {
  if (/(L|_l|Left|_left)$/.test(p.id)) return -1;
  if (/(R|_r|Right|_right)$/.test(p.id)) return 1;
  const px = p.pivot?.[0] || 0;
  if (Math.abs(px) > 1e-4) return px < 0 ? -1 : 1;
  const n = /(\d+)$/.exec(p.id);
  if (n) return Number(n[1]) % 2 ? 1 : -1;
  return i % 2 ? 1 : -1;                       // last resort: alternate them
}
function limbFore(p) {
  if (/F(L|R)?$/.test(p.id) || /front/i.test(p.id)) return true;
  if (/B(L|R)?$/.test(p.id) || /(back|hind|rear)/i.test(p.id)) return false;
  return (p.pivot?.[2] || 0) > 0;
}

// ---- explicit-parts rigs (mob remakes) -------------------------------------
// Remade mobs declare their parts outright (no geometry heuristics), so the
// animation set is generated from part IDS: 'body' (required), 'head', 'tail',
// legs match /^leg/, arms match /^arm/. Same movement vocabulary as buildRig.
export function buildPartAnimations(style, parts, overrides = null) {
  const anims = { idle: { length: 3.2, parts: {} }, walk: { length: 0.7, parts: {} }, attack: { length: 0.5, loop: false, parts: {} } };
  const A = (part, anim, ch, keys) => {
    if (!anims[anim]) return;
    if (!anims[anim].parts[part]) anims[anim].parts[part] = {};
    anims[anim].parts[part][ch] = keys;
  };
  const ids = new Set(parts.map((p) => p.id));
  const legs = parts.filter((p) => /^leg/.test(p.id));
  const arms = parts.filter((p) => /^arm/.test(p.id));
  const head = ids.has('head'), tail = ids.has('tail');

  if (style === 'quadruped' || style === 'pecker') {
    legs.forEach((p, i) => {
      // Diagonal pairs move together — a trot. Two-legged birds have both feet
      // at the same z, so `fore` is the same for both and the sides alternate,
      // which is what a bird does anyway.
      const phase = (limbFore(p) === (limbSide(p, i) < 0)) ? 1 : -1;
      A(p.id, 'walk', 'rotate', swing(0.7, phase * 24));
    });
    if (head) {
      A('head', 'idle', 'rotate', [[0, [0, -10, 0]], [1.6, [0, 10, 0]], [3.2, [0, -10, 0]]]);
      A('head', 'walk', 'rotate', swing(0.7, 4));
      A('head', 'attack', 'rotate', style === 'pecker'
        ? [[0, [0, 0, 0]], [0.12, [55, 0, 0]], [0.3, [-10, 0, 0]], [0.5, [0, 0, 0]]]
        : [[0, [0, 0, 0]], [0.15, [-28, 0, 0]], [0.32, [22, 0, 0]], [0.5, [0, 0, 0]]]);
    }
    if (tail) {
      A('tail', 'idle', 'rotate', [[0, [0, -14, 0]], [1.6, [0, 14, 0]], [3.2, [0, -14, 0]]]);
      A('tail', 'walk', 'rotate', swing(0.7, 0, 18));
    }
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.015, 0));
    A('body', 'walk', 'translate', bob(0.7, 0.03));   // rises on each footfall
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.15, [0, 0.02, 0.14]], [0.5, [0, 0, 0]]]);
  } else if (style === 'biped') {
    arms.forEach((p, i) => {
      const left = limbSide(p, i) < 0;
      A(p.id, 'idle', 'rotate', swing(3.2, left ? 2.5 : -2.5));
      A(p.id, 'walk', 'rotate', swing(0.7, left ? 18 : -18));
      A(p.id, 'attack', 'rotate', [[0, [0, 0, 0]], [0.12, [-100, 0, 0]], [0.3, [30, 0, 0]], [0.5, [0, 0, 0]]]);
    });
    legs.forEach((p, i) => {
      const left = limbSide(p, i) < 0;
      // OPPOSITE the arm on the same side. These used to share a sign, so a
      // goblin walked with its left arm and left leg going forward together —
      // the gait of a toy soldier, and the loudest thing wrong with them.
      A(p.id, 'walk', 'rotate', swing(0.7, left ? -22 : 22));
    });
    if (head) {
      A('head', 'idle', 'rotate', [[0, [0, -8, 0]], [1.6, [0, 8, 0]], [3.2, [0, -8, 0]]]);
      A('head', 'attack', 'rotate', [[0, [0, 0, 0]], [0.15, [-16, 0, 0]], [0.5, [0, 0, 0]]]);
    }
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.02, 0));
    A('body', 'walk', 'rotate', swing(0.7, 0, 0, 3));
    A('body', 'walk', 'translate', bob(0.7, 0.035));
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.15, [0, 0, 0.12]], [0.5, [0, 0, 0]]]);
  } else if (style === 'floater') {
    A('body', 'idle', 'translate', swingT(2.6, 0, 0.07, 0));
    A('body', 'idle', 'rotate', swing(2.6, 0, 0, 4));
    A('body', 'walk', 'translate', swingT(1.1, 0, 0.09, 0));
    A('body', 'walk', 'rotate', [[0, [8, 0, 3]], [0.55, [8, 0, -3]], [1.1, [8, 0, 3]]]);
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.14, [0, 0.05, 0.3]], [0.5, [0, 0, 0]]]);
    A('body', 'attack', 'rotate', [[0, [0, 0, 0]], [0.14, [-14, 0, 0]], [0.5, [0, 0, 0]]]);
    anims.walk.length = 1.1;
    if (head) A('head', 'idle', 'rotate', [[0, [0, -12, 0]], [1.3, [0, 12, 0]], [2.6, [0, -12, 0]]]);
  } else if (style === 'hopper') {
    // A bound, not a walk: gather, launch, tuck, land. The body arc is asymmetric
    // on purpose — up fast, hang, down — because a hop that rises and falls at
    // the same rate reads as a bouncing ball.
    if (head) {
      A('head', 'idle', 'rotate', [[0, [0, -10, 0]], [1.6, [0, 10, 0]], [3.2, [0, -10, 0]]]);
      A('head', 'walk', 'rotate', [[0, [8, 0, 0]], [0.1, [-14, 0, 0]], [0.32, [-6, 0, 0]], [0.5, [8, 0, 0]]]);
    }
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.015, 0));
    A('body', 'walk', 'translate', [[0, [0, 0, 0]], [0.1, [0, 0.17, 0]], [0.22, [0, 0.2, 0]], [0.4, [0, 0.04, 0]], [0.5, [0, 0, 0]]]);
    A('body', 'walk', 'rotate', [[0, [10, 0, 0]], [0.1, [-16, 0, 0]], [0.3, [-4, 0, 0]], [0.42, [14, 0, 0]], [0.5, [10, 0, 0]]]);
    // hind legs tuck at the top of the arc and reach again for the landing
    legs.forEach((p) => {
      const fore = limbFore(p);
      A(p.id, 'walk', 'rotate', fore
        ? [[0, [-30, 0, 0]], [0.12, [40, 0, 0]], [0.34, [30, 0, 0]], [0.5, [-30, 0, 0]]]
        : [[0, [34, 0, 0]], [0.14, [-46, 0, 0]], [0.36, [-20, 0, 0]], [0.5, [34, 0, 0]]]);
    });
    if (tail) A('tail', 'walk', 'rotate', [[0, [-12, 0, 0]], [0.22, [16, 0, 0]], [0.5, [-12, 0, 0]]]);
    anims.walk.length = 0.5;
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.13, [0, 0.1, 0.25]], [0.5, [0, 0, 0]]]);
  } else if (style === 'scamper' || style === 'slither') {
    if (head) {
      A('head', 'idle', 'rotate', [[0, [-6, -8, 0]], [1.6, [4, 8, 0]], [3.2, [-6, -8, 0]]]);
      A('head', 'attack', 'rotate', [[0, [0, 0, 0]], [0.13, [-24, 0, 0]], [0.3, [18, 0, 0]], [0.5, [0, 0, 0]]]);
    }
    if (tail) {
      A('tail', 'idle', 'rotate', [[0, [0, -20, 0]], [1.6, [0, 20, 0]], [3.2, [0, -20, 0]]]);
      A('tail', 'walk', 'rotate', swing(0.45, 0, 26));
    }
    // Legs. This style never touched them, so the rat — which HAS four — crossed
    // the floor with its feet held perfectly still. Same diagonal trot as a cow,
    // quicker and shallower, because the legs are short and it is scurrying.
    legs.forEach((p, i) => {
      A(p.id, 'walk', 'rotate', swing(0.45, ((limbFore(p) === (limbSide(p, i) < 0)) ? 1 : -1) * 32));
    });
    const sway = style === 'slither' ? 12 : 6;
    A('body', 'walk', 'rotate', swing(0.45, 0, sway));
    A('body', 'walk', 'translate', legs.length ? bob(0.45, 0.014) : swingT(0.45, 0.02, 0.01, 0));
    anims.walk.length = 0.45;
    A('body', 'idle', 'rotate', swing(3.2, 0, style === 'slither' ? 6 : 2));
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.12, [0, 0.04, 0.3]], [0.5, [0, 0, 0]]]);
  } else if (style === 'lumberer') {
    A('body', 'idle', 'translate', swingT(3.6, 0, 0.02, 0));
    anims.idle.length = 3.6;
    A('body', 'walk', 'rotate', swing(0.9, 0, 0, 6));
    A('body', 'walk', 'translate', bob(0.9, 0.03));
    anims.walk.length = 0.9;
    A('body', 'attack', 'rotate', [[0, [0, 0, 0]], [0.16, [22, 0, 0]], [0.5, [0, 0, 0]]]);
    if (head) A('head', 'attack', 'rotate', [[0, [0, 0, 0]], [0.14, [-26, 0, 0]], [0.34, [16, 0, 0]], [0.5, [0, 0, 0]]]);
  } else if (style === 'sway') {
    A('body', 'idle', 'rotate', swing(3.6, 0, 0, 2));
    anims.idle.length = 3.6;
    delete anims.walk;
    A('body', 'attack', 'rotate', [[0, [0, 0, 0]], [0.2, [0, 0, 8]], [0.5, [0, 0, 0]]]);
  }

  // per-def overrides merge on top (add/replace channels, adjust lengths)
  if (overrides) {
    for (const [anim, spec] of Object.entries(overrides)) {
      if (!anims[anim]) anims[anim] = { length: spec.length || 1, parts: {}, ...(spec.loop === false ? { loop: false } : {}) };
      if (spec.length) anims[anim].length = spec.length;
      for (const [pid, chans] of Object.entries(spec.parts || {})) {
        for (const [ch, keys] of Object.entries(chans)) A(pid, anim, ch, keys);
      }
    }
  }
  return anims;
}

// ---- the player -----------------------------------------------------------
// Hand-rigged blocky humanoid. Boxes are grouped by the caller (main.js knows
// the geometry + equipment overlays); this provides the animation set.
export function playerAnimations() {
  return {
    idle: {
      length: 3.4,
      parts: {
        arm_l: { rotate: swing(3.4, 2.5) },
        arm_r: { rotate: swing(3.4, -2.5) },
        head: { rotate: [[0, [0, -5, 0]], [1.7, [2, 5, 0]], [3.4, [0, -5, 0]]] },
        body: { translate: swingT(3.4, 0, 0.008, 0) },
      },
    },
    walk: {
      length: 0.66,
      parts: {
        leg_l: { rotate: swing(0.66, 30) },
        leg_r: { rotate: swing(0.66, -30) },
        arm_l: { rotate: swing(0.66, -24) },
        arm_r: { rotate: swing(0.66, 24) },
        body: { translate: bob(0.66, 0.02) },
      },
    },
    attack: {
      length: 0.45,
      loop: false,
      parts: {
        arm_r: { rotate: [[0, [-10, 0, 0]], [0.12, [-125, 0, -8]], [0.3, [-15, 0, 0]], [0.45, [0, 0, 0]]] },
        body: { rotate: [[0, [0, 0, 0]], [0.12, [0, -8, 0]], [0.3, [0, 5, 0]], [0.45, [0, 0, 0]]] },
      },
    },
    swim: {
      length: 1.0,
      parts: {
        arm_l: { rotate: [[0, [-170, 0, -12]], [0.5, [-30, 0, -12]], [1.0, [-170, 0, -12]]] },
        arm_r: { rotate: [[0, [-30, 0, 12]], [0.5, [-170, 0, 12]], [1.0, [-30, 0, 12]]] },
        leg_l: { rotate: [[0, [18, 0, 0]], [0.25, [-18, 0, 0]], [0.5, [18, 0, 0]], [0.75, [-18, 0, 0]], [1.0, [18, 0, 0]]] },
        leg_r: { rotate: [[0, [-18, 0, 0]], [0.25, [18, 0, 0]], [0.5, [-18, 0, 0]], [0.75, [18, 0, 0]], [1.0, [-18, 0, 0]]] },
        body: { rotate: [[0, [12, 0, 3]], [0.5, [12, 0, -3]], [1.0, [12, 0, 3]]] },
        head: { rotate: [[0, [-14, 0, 0]], [1.0, [-14, 0, 0]]] },
      },
    },
  };
}
