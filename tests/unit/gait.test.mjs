// How the creatures walk.
//
// Four separate things were wrong, and every one of them is the kind that never
// fails a test because nothing was measuring the motion — only that a matrix
// came back.
//
//   1. Limbs swung on a THREE-key triangle wave, linearly interpolated: constant
//      speed, instant reversal at each end. A scissor, not a stride.
//   2. A goblin's left arm and left leg swung the same way. Toy soldier.
//   3. The rat had four legs the `scamper` style never touched, so it crossed
//      the floor with its feet held perfectly still.
//   4. The rabbit — no legs in its model at all — "scampered", which for a
//      legless rig is a sideways sway. A rabbit bounds.
//
// The fifth is the loudest: the cycle ran on the wall clock, so a creature swung
// its legs at the same rate whether it was ambling or bolting, and its feet slid
// over the ground at every speed but one. gaitOf() is that fix, and it is
// checked here too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPartAnimations, gaitOf, STRIDE, GAIT_FULL } from '../../js/game/rigs.js';
import { MOB_REMAKES } from '../../js/game/mobremakes/index.js';
import { evaluatePose } from '../../js/game/mobloader.js';

const rigFor = (type) => {
  const def = MOB_REMAKES[type];
  const parts = def.parts.map((p) => ({ id: p.id, parent: p.parent || null, pivot: p.pivot || [0, 0, 0] }));
  return { def, parts, anims: buildPartAnimations(def.rig || 'lumberer', parts, { ...(def.anims || {}), ...(def.animOverrides || {}) }) };
};

// Sample a rotation channel across a whole cycle.
const sweep = (keys, len, n = 48) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * len;
    let v = keys[keys.length - 1][1];
    if (t <= keys[0][0]) v = keys[0][1];
    else for (let k = 0; k < keys.length - 1; k++) {
      const [t0, v0] = keys[k], [t1, v1] = keys[k + 1];
      if (t >= t0 && t <= t1) {
        const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
        v = [v0[0] + (v1[0] - v0[0]) * f, v0[1] + (v1[1] - v0[1]) * f, v0[2] + (v1[2] - v0[2]) * f];
        break;
      }
    }
    out.push(v[0]);
  }
  return out;
};

test('a limb eases at the ends of its arc instead of reversing instantly', () => {
  const { anims } = rigFor('cow');
  const keys = anims.walk.parts.leg0.rotate;
  assert.ok(keys.length >= 8, `a cosine needs more than a triangle's three keys (got ${keys.length})`);
  const v = sweep(keys, anims.walk.length, 64);
  // Per-sample change: on a triangle it is constant; on a cosine it is largest
  // through the middle of the swing and near zero at the turn.
  const step = [];
  for (let i = 1; i < v.length; i++) step.push(Math.abs(v[i] - v[i - 1]));
  const fast = Math.max(...step), slow = Math.min(...step);
  assert.ok(fast > slow * 4, `the swing must ease (fastest ${fast.toFixed(3)}° vs slowest ${slow.toFixed(3)}°)`);
  // and it must still be a full swing, not a wobble
  assert.ok(Math.max(...v) > 20 && Math.min(...v) < -20, 'the leg still travels its whole arc');
});

test('a walking goblin counter-swings: left arm forward with the right leg', () => {
  const { anims, parts } = rigFor('scrap_goblin');
  // by NAME, because the goblin rig hangs both legs off the centreline — which
  // is exactly the case that used to make both of them the same side
  const leftArm = parts.find((p) => /^arm.*L$/.test(p.id));
  const leftLeg = parts.find((p) => /^leg.*L$/.test(p.id));
  assert.equal(leftLeg.pivot[0], 0, 'this rig really does centre its hips');
  assert.ok(leftArm && leftLeg, 'it has a left arm and a left leg');
  const a = sweep(anims.walk.parts[leftArm.id].rotate, anims.walk.length);
  const l = sweep(anims.walk.parts[leftLeg.id].rotate, anims.walk.length);
  // opposite signs at every point in the cycle where either is meaningfully off zero
  const opposed = a.map((v, i) => v * l[i]).filter((p) => Math.abs(p) > 1);
  assert.ok(opposed.length > 10, 'both actually move');
  assert.ok(opposed.every((p) => p < 0), 'the same-side arm and leg always swing opposite ways');
});

test('every legged creature actually moves its legs when it walks', () => {
  const legless = [];
  for (const [type, def] of Object.entries(MOB_REMAKES)) {
    const { anims, parts } = rigFor(type);
    const legs = parts.filter((p) => /^leg/.test(p.id));
    if (!legs.length || !anims.walk) continue;
    const moved = legs.filter((p) => anims.walk.parts[p.id]?.rotate);
    if (moved.length !== legs.length) legless.push(`${type} (${def.rig}): ${moved.length}/${legs.length}`);
  }
  assert.deepEqual(legless, [], `creatures dragging still legs: ${legless.join('; ')}`);
});

test('the rat trots on all four, in diagonal pairs', () => {
  const { anims, parts } = rigFor('rat');
  const legs = parts.filter((p) => /^leg/.test(p.id));
  assert.equal(legs.length, 4);
  const at0 = (p) => anims.walk.parts[p.id].rotate[0][1][0];
  const fl = legs.find((p) => p.pivot[0] < 0 && p.pivot[2] > 0);
  const fr = legs.find((p) => p.pivot[0] > 0 && p.pivot[2] > 0);
  const bl = legs.find((p) => p.pivot[0] < 0 && p.pivot[2] < 0);
  const br = legs.find((p) => p.pivot[0] > 0 && p.pivot[2] < 0);
  assert.ok(fl && fr && bl && br, 'four corners');
  assert.ok(at0(fl) * at0(br) > 0, 'front-left moves with back-right');
  assert.ok(at0(fr) * at0(bl) > 0, 'front-right moves with back-left');
  assert.ok(at0(fl) * at0(fr) < 0, 'and the two front legs oppose each other');
});

test('the rabbit bounds rather than scurries', () => {
  const { def, anims } = rigFor('rabbit');
  assert.equal(def.rig, 'hopper');
  const lift = sweep(anims.walk.parts.body.translate, anims.walk.length).length;
  assert.ok(lift > 0, 'the body is keyed');
  const ys = anims.walk.parts.body.translate.map((k) => k[1][1]);
  assert.ok(Math.max(...ys) > 0.12, `a hop leaves the ground (peak ${Math.max(...ys)})`);
  assert.equal(Math.min(...ys), 0, 'and lands back on it');
});

test('a body rises twice per stride — once per footfall', () => {
  const { anims } = rigFor('cow');
  const ys = sweep(anims.walk.parts.body.translate.map((k) => [k[0], [k[1][1], 0, 0]]), anims.walk.length, 64);
  let peaks = 0;
  for (let i = 1; i < ys.length - 1; i++) if (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1]) peaks++;
  assert.equal(peaks, 2, `two footfalls per cycle, saw ${peaks}`);
});

test('evaluatePose scales the swing by how fast the creature is going', () => {
  const { parts, anims } = rigFor('cow');
  const model = { animated: true, parts: parts.map((p) => ({ ...p, boxes: [] })), animations: anims };
  const t = 0;                                        // the top of the swing
  const full = evaluatePose(model, 'walk', t, 1);
  const half = evaluatePose(model, 'walk', t, 0.5);
  const none = evaluatePose(model, 'walk', t, 0);
  const leg = parts.find((p) => /^leg/.test(p.id)).id;
  // The identity-ness of a matrix is a fine proxy for "how far from rest".
  const off = (m) => m.reduce((s, v, i) => s + Math.abs(v - (i % 5 === 0 ? 1 : 0)), 0);
  assert.ok(off(full[leg]) > off(half[leg]), 'half a swing is smaller than a whole one');
  assert.ok(off(half[leg]) > off(none[leg]), 'and no swing is smaller still');
  assert.ok(off(none[leg]) < 1e-6, 'at zero the limb is exactly at rest');
});

// ---- the gait itself -------------------------------------------------------

test('the cycle is driven by ground covered, not by the clock', () => {
  // Two creatures walk the SAME distance, one twice as fast as the other. Their
  // legs must end up at the same point in the stride — that is what keeps a foot
  // planted on a patch of ground instead of skating over it.
  const slow = { x: 0, z: 0 }, fast = { x: 0, z: 0 };
  gaitOf(slow, 0); gaitOf(fast, 0);
  for (let i = 0; i < 40; i++) { slow.x += 0.05; gaitOf(slow, 1 / 20); }   // 1.0 blocks/s
  for (let i = 0; i < 20; i++) { fast.x += 0.1; gaitOf(fast, 1 / 20); }    // 2.0 blocks/s
  const a = gaitOf(slow, 1 / 20), b = gaitOf(fast, 1 / 20);
  assert.ok(Math.abs(slow._gaitDist - fast._gaitDist) < 1e-6, 'both covered 2 blocks');
  assert.ok(Math.abs(a.phase - b.phase) < 0.02, `same ground, same point in the stride (${a.phase} vs ${b.phase})`);
});

test('one stride per STRIDE blocks, and it wraps', () => {
  const e = { x: 0, z: 0 };
  gaitOf(e, 0);
  e.x = STRIDE / 2; const half = gaitOf(e, 0.1);
  assert.ok(Math.abs(half.phase - 0.5) < 1e-6, 'half a stride is halfway round');
  e.x = STRIDE; const whole = gaitOf(e, 0.1);
  assert.ok(whole.phase < 1e-6, 'a whole stride is back at the start');
  e.x = STRIDE * 3.25; const later = gaitOf(e, 0.1);
  assert.ok(Math.abs(later.phase - 0.25) < 1e-6, 'and it keeps wrapping');
});

test('the swing grows with speed and never quite dies', () => {
  const still = { x: 0, z: 0 };
  gaitOf(still, 0);
  for (let i = 0; i < 30; i++) gaitOf(still, 1 / 30);          // standing
  const amble = { x: 0, z: 0 }, bolt = { x: 0, z: 0 };
  gaitOf(amble, 0); gaitOf(bolt, 0);
  let a = 0, b = 0;
  // read the amount on a frame the creature is actually MOVING — sampling one
  // frame after it stops measures the fade, not the gait
  for (let i = 0; i < 60; i++) { amble.x += 0.8 / 30; a = gaitOf(amble, 1 / 30).amount; }
  for (let i = 0; i < 60; i++) { bolt.x += GAIT_FULL / 30; b = gaitOf(bolt, 1 / 30).amount; }
  assert.ok(b > a, `bolting swings wider than ambling (${b.toFixed(2)} vs ${a.toFixed(2)})`);
  assert.ok(b > 0.9, 'at full speed the swing is full size');
  assert.ok(gaitOf(still, 1 / 30).amount > 0, 'and it never reaches exactly nothing');
});

test('the first frame of a creature we have never seen does not jump', () => {
  // A newly spawned creature has no previous position; treating "no last frame"
  // as a huge leap would fire the stride forward by however far it is from the
  // origin the moment it appears.
  const e = { x: 412.5, z: -98.25 };
  const g = gaitOf(e, 1 / 60);
  assert.equal(g.phase, 0, 'it starts at the top of the cycle');
  assert.equal(e._gaitDist, 0, 'and has covered no ground yet');
});
