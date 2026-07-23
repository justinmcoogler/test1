// Blockbench (.bbmodel) → mob-def converter. Proves an imported model becomes a
// well-formed mob def: a 'body' part, bones mapped to rig roles, per-face UV
// islands that normalise inside the texture, an embedded texture, and a rig
// whose generated animations only pose parts that exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertBBModel, parseName } from '../../tools/gen-mobpack.mjs';
import { remakeParts } from '../../js/game/mobremake.js';
import { buildPartAnimations } from '../../js/game/rigs.js';

// a minimal but realistic quadruped .bbmodel: body(+nested head) + 4 legs, 16px texture
const TEX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FACES = (o) => ({ north: { uv: [o, 0, o + 2, 4] }, south: { uv: [o, 4, o + 2, 8] }, east: { uv: [o, 8, o + 2, 12] }, west: { uv: [o + 2, 8, o + 4, 12] }, up: { uv: [o, 12, o + 2, 14] }, down: { uv: [o + 2, 12, o + 4, 14] } });
const bb = {
  resolution: { width: 16, height: 16 },
  elements: [
    { uuid: 'e_body', name: 'torso', from: [6, 6, 4], to: [10, 12, 14], faces: FACES(0) },
    { uuid: 'e_head', name: 'head', from: [6, 12, 12], to: [10, 16, 16], faces: FACES(4) },
    { uuid: 'e_l0', name: 'leg', from: [6, 0, 4], to: [8, 6, 6], faces: FACES(8) },
    { uuid: 'e_l1', name: 'leg', from: [8, 0, 4], to: [10, 6, 6], faces: FACES(8) },
    { uuid: 'e_l2', name: 'leg', from: [6, 0, 12], to: [8, 6, 14], faces: FACES(8) },
    { uuid: 'e_l3', name: 'leg', from: [8, 0, 12], to: [10, 6, 14], faces: FACES(8) },
  ],
  outliner: [
    { name: 'body', uuid: 'g_body', origin: [8, 6, 9], children: ['e_body',
      { name: 'head', uuid: 'g_head', origin: [8, 12, 14], children: ['e_head'] }] },
    { name: 'leg_fl', uuid: 'g0', origin: [7, 6, 5], children: ['e_l0'] },
    { name: 'leg_fr', uuid: 'g1', origin: [9, 6, 5], children: ['e_l1'] },
    { name: 'leg_bl', uuid: 'g2', origin: [7, 6, 13], children: ['e_l2'] },
    { name: 'leg_br', uuid: 'g3', origin: [9, 6, 13], children: ['e_l3'] },
  ],
  textures: [{ source: TEX }],
};

test('parseName splits <type> and optional <rig>', () => {
  assert.deepEqual(parseName('cow'), { type: 'cow', rig: null });
  assert.deepEqual(parseName('cow.quadruped'), { type: 'cow', rig: 'quadruped' });
});

test('convertBBModel produces a body part, mapped limb bones and an embedded texture', () => {
  const def = convertBBModel(bb);
  assert.equal(def.texW, 16); assert.equal(def.texH, 16);
  assert.ok(/^data:image\//.test(def.texture), 'texture embedded');
  const ids = def.parts.map((p) => p.id);
  assert.ok(ids.includes('body'), 'has a body part');
  assert.ok(ids.includes('head'), 'head bone mapped to head');
  assert.equal(ids.filter((i) => /^leg\d/.test(i)).length, 4, 'four legs mapped to leg0..leg3');
  assert.equal(new Set(ids).size, ids.length, 'part ids unique');
  assert.equal(def.rig, 'quadruped', 'four legs → quadruped inferred');
  // model normalised: feet near y=0, centred on x/z
  const allY = def.parts.flatMap((p) => p.boxes.map((b) => b.from[1]));
  assert.ok(Math.min(...allY) >= -0.01 && Math.min(...allY) < 0.05, 'feet sit at ground');
});

test('a filename rig hint overrides inference', () => {
  const def = convertBBModel(bb, { rig: 'lumberer' });
  assert.equal(def.rig, 'lumberer');
});

test('converted UV islands normalise inside the texture (via remakeParts)', () => {
  const def = convertBBModel(bb);
  for (const part of remakeParts(def)) {
    for (const box of part.boxes) {
      for (const f of ['top', 'bottom', 'north', 'south', 'east', 'west']) {
        const r = box.uv[f];
        assert.ok(r, `${part.id} has ${f} uv`);
        for (const k of ['u0', 'v0', 'u1', 'v1']) assert.ok(r[k] >= 0 && r[k] <= 1, `${part.id}.${f}.${k} in [0,1]`);
      }
    }
  }
});

test('generated animations only pose parts that exist', () => {
  const def = convertBBModel(bb);
  const ids = new Set(def.parts.map((p) => p.id));
  const anims = buildPartAnimations(def.rig, def.parts);
  for (const anim of Object.values(anims)) {
    for (const pid of Object.keys(anim.parts)) assert.ok(ids.has(pid), `poses real part ${pid}`);
  }
  assert.ok(Object.keys(anims.walk.parts).length >= 2, 'quadruped walk animates legs');
});

test('a model with no embedded texture is rejected with a clear error', () => {
  const noTex = { ...bb, textures: [] };
  assert.throws(() => convertBBModel(noTex), /texture/i);
});
