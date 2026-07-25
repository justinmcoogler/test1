// Auto-rigger for built-in creatures: converts each flat voxel-box model into
// an animated part hierarchy (body/head/legs/arms/tail) and generates
// idle/walk/attack keyframes suited to the creature's movement style.
// Imported mobs bring their own parts + animations; this covers the natives.
import { IMPORTED_RIGS } from './mobs-imported.js';

// movement style per creature
const RIGS = {
  practice_dummy: 'sway',
  mudback_boar: 'quadruped', craghorn_ram: 'quadruped',
  dune_stalker: 'quadruped', frostmaw_wolf: 'quadruped', rimehowl_alpha: 'quadruped',
  gloomrat: 'scamper', bindweed: 'scamper', sunscale_serpent: 'slither',
  thicket_sprite: 'floater', marsh_wisp: 'floater', rime_shade: 'floater',
  hollow_watcher: 'floater', duskwing: 'floater',
  cinder_imp: 'hopper', rootling: 'hopper',
  moss_lurker: 'lumberer', shell_snapper: 'lumberer',
  bog_shambler: 'biped', magma_hulk: 'biped', blight_horror: 'biped',
  rootbound_golem: 'biped', stone_pecker: 'pecker',
  // fantasy roster
  pixie: 'floater', will_o_wisp: 'floater', gaze_orb: 'floater',
  bog_ooze: 'lumberer', cave_slime: 'lumberer',
  scrap_goblin: 'biped', frost_elemental: 'biped', grave_wight: 'biped',
  skeletal_archer: 'biped', stone_golem: 'biped',
  bone_hound: 'quadruped', veil_crawler: 'quadruped',
  // textured-remake new creatures
  meadow_stag: 'quadruped', dust_scarab: 'scamper', mire_toad: 'hopper',
  crag_bat: 'floater', snow_hare: 'scamper', ash_salamander: 'slither',
  // farm animals
  cow: 'quadruped', pig: 'quadruped', sheep: 'quadruped', goat: 'quadruped', horse: 'quadruped',
  chicken: 'pecker', duck: 'pecker', rabbit: 'scamper',
  // imported licensed mob pack — each id's converted rig (never overrides a native)
  ...IMPORTED_RIGS,
};

const cx = (b) => b.x + b.w / 2;
const cz = (b) => b.z + b.d / 2;

// triangle-wave keyframes: value swings a → -a → a over `len` seconds
const swing = (len, ax, ay = 0, az = 0) => [
  [0, [ax, ay, az]], [len / 2, [-ax, -ay, -az]], [len, [ax, ay, az]],
];
const swingT = (len, x, y, z) => [
  [0, [x, y, z]], [len / 2, [-x, -y, -z]], [len, [x, y, z]],
];

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
      A(id, 'walk', 'rotate', phase > 0 ? swing(0.7, 24) : swing(0.7, -24));
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
    A('body', 'walk', 'translate', [[0, [0, 0.03, 0]], [0.18, [0, 0, 0]], [0.35, [0, 0.03, 0]], [0.52, [0, 0, 0]], [0.7, [0, 0.03, 0]]]);
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
      A(id, 'walk', 'rotate', left ? swing(0.7, 18) : swing(0.7, -18));
      A(id, 'attack', 'rotate', [[0, [0, 0, 0]], [0.12, [-100, 0, 0]], [0.3, [30, 0, 0]], [0.5, [0, 0, 0]]]);
    });
    legs.forEach((b, i) => {
      const id = `bleg${i}`, left = cx(b) < 0;
      parts.push({ id, pivot: [cx(b), b.y + b.h, cz(b)], boxes: [b], tex: def.skin });
      A(id, 'walk', 'rotate', left ? swing(0.7, 22) : swing(0.7, -22));
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
    A('body', 'walk', 'translate', [[0, [0, 0.03, 0]], [0.22, [0, 0, 0]], [0.45, [0, 0.03, 0]], [0.68, [0, 0, 0]], [0.9, [0, 0.03, 0]]]);
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
    legs.forEach((p) => {
      const fore = (p.pivot?.[2] || 0) > 0, left = (p.pivot?.[0] || 0) < 0;
      const phase = (fore === left) ? 1 : -1; // diagonal pairs together
      A(p.id, 'walk', 'rotate', phase > 0 ? swing(0.7, 24) : swing(0.7, -24));
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
    A('body', 'walk', 'translate', [[0, [0, 0.03, 0]], [0.18, [0, 0, 0]], [0.35, [0, 0.03, 0]], [0.52, [0, 0, 0]], [0.7, [0, 0.03, 0]]]);
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.15, [0, 0.02, 0.14]], [0.5, [0, 0, 0]]]);
  } else if (style === 'biped') {
    arms.forEach((p) => {
      const left = (p.pivot?.[0] || 0) < 0;
      A(p.id, 'idle', 'rotate', swing(3.2, left ? 2.5 : -2.5));
      A(p.id, 'walk', 'rotate', left ? swing(0.7, 18) : swing(0.7, -18));
      A(p.id, 'attack', 'rotate', [[0, [0, 0, 0]], [0.12, [-100, 0, 0]], [0.3, [30, 0, 0]], [0.5, [0, 0, 0]]]);
    });
    legs.forEach((p) => {
      const left = (p.pivot?.[0] || 0) < 0;
      A(p.id, 'walk', 'rotate', left ? swing(0.7, 22) : swing(0.7, -22));
    });
    if (head) {
      A('head', 'idle', 'rotate', [[0, [0, -8, 0]], [1.6, [0, 8, 0]], [3.2, [0, -8, 0]]]);
      A('head', 'attack', 'rotate', [[0, [0, 0, 0]], [0.15, [-16, 0, 0]], [0.5, [0, 0, 0]]]);
    }
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.02, 0));
    A('body', 'walk', 'rotate', swing(0.7, 0, 0, 3));
    A('body', 'walk', 'translate', [[0, [0, 0.035, 0]], [0.18, [0, 0, 0]], [0.35, [0, 0.035, 0]], [0.52, [0, 0, 0]], [0.7, [0, 0.035, 0]]]);
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
    if (head) A('head', 'idle', 'rotate', [[0, [0, -10, 0]], [1.6, [0, 10, 0]], [3.2, [0, -10, 0]]]);
    A('body', 'idle', 'translate', swingT(3.2, 0, 0.015, 0));
    A('body', 'walk', 'translate', [[0, [0, 0, 0]], [0.25, [0, 0.14, 0]], [0.5, [0, 0, 0]]]);
    A('body', 'walk', 'rotate', [[0, [4, 0, 0]], [0.25, [-6, 0, 0]], [0.5, [4, 0, 0]]]);
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
    const sway = style === 'slither' ? 12 : 6;
    A('body', 'walk', 'rotate', swing(0.45, 0, sway));
    A('body', 'walk', 'translate', swingT(0.45, 0.02, 0.01, 0));
    anims.walk.length = 0.45;
    A('body', 'idle', 'rotate', swing(3.2, 0, style === 'slither' ? 6 : 2));
    A('body', 'attack', 'translate', [[0, [0, 0, 0]], [0.12, [0, 0.04, 0.3]], [0.5, [0, 0, 0]]]);
  } else if (style === 'lumberer') {
    A('body', 'idle', 'translate', swingT(3.6, 0, 0.02, 0));
    anims.idle.length = 3.6;
    A('body', 'walk', 'rotate', swing(0.9, 0, 0, 6));
    A('body', 'walk', 'translate', [[0, [0, 0.03, 0]], [0.22, [0, 0, 0]], [0.45, [0, 0.03, 0]], [0.68, [0, 0, 0]], [0.9, [0, 0.03, 0]]]);
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
        body: { translate: [[0, [0, 0.02, 0]], [0.165, [0, 0, 0]], [0.33, [0, 0.02, 0]], [0.5, [0, 0, 0]], [0.66, [0, 0.02, 0]]] },
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
