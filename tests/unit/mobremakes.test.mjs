// Mob remakes: every remade creature must be a well-formed def — real enemy
// type, sane UV islands inside its own texture, rig-compatible part ids, and
// animations that only reference parts that exist. (The painted result itself
// is verified visually via tests/_mobshot.mjs renders.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOB_REMAKES } from '../../js/game/mobremakes/index.js';
import { remakeParts } from '../../js/game/mobremake.js';
import { buildPartAnimations } from '../../js/game/rigs.js';
import { ENEMY_TYPES } from '../../js/game/enemies.js';

const RIGS = new Set(['quadruped', 'pecker', 'biped', 'floater', 'hopper', 'scamper', 'slither', 'lumberer', 'sway']);
const FACES = ['up', 'down', 'north', 'south', 'east', 'west', 'all'];

test('every remake maps to a real enemy type with a valid rig and painter', () => {
  assert.ok(Object.keys(MOB_REMAKES).length >= 1, 'at least the exemplar exists');
  for (const [type, def] of Object.entries(MOB_REMAKES)) {
    assert.ok(ENEMY_TYPES[type], `${type} is a real enemy type`);
    assert.ok(RIGS.has(def.rig), `${type} rig '${def.rig}' is known`);
    assert.equal(typeof def.paint, 'function', `${type} has a painter`);
    assert.ok(def.texW >= 16 && def.texW <= 128 && def.texH >= 16 && def.texH <= 128, `${type} texture size sane`);
  }
});

test('parts are well-formed: unique ids, a body, boxes with 3-vectors', () => {
  for (const [type, def] of Object.entries(MOB_REMAKES)) {
    const ids = def.parts.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${type} part ids unique`);
    assert.ok(ids.includes('body'), `${type} has a body part`);
    for (const p of def.parts) {
      assert.ok(Array.isArray(p.pivot) && p.pivot.length === 3, `${type}.${p.id} pivot`);
      assert.ok(p.boxes.length >= 1, `${type}.${p.id} has boxes`);
      for (const b of p.boxes) {
        assert.ok(b.from.length === 3 && b.size.length === 3, `${type}.${p.id} box vectors`);
        assert.ok(b.size.every((v) => v > 0), `${type}.${p.id} box has positive size`);
      }
    }
    const total = def.parts.reduce((n, p) => n + p.boxes.length, 0);
    assert.ok(total >= 3 && total <= 40, `${type} box count ${total} in range`);
  }
});

test('UV islands sit inside the texture and use known face keys', () => {
  for (const [type, def] of Object.entries(MOB_REMAKES)) {
    for (const p of def.parts) for (const b of p.boxes) {
      const specs = Array.isArray(b.uv) ? { all: b.uv } : (b.uv || {});
      for (const [k, r] of Object.entries(specs)) {
        assert.ok(FACES.includes(k), `${type}.${p.id} face key '${k}'`);
        const [px, py, pw, ph] = r;
        assert.ok(pw > 0 && ph > 0, `${type}.${p.id}.${k} island has area`);
        assert.ok(px >= 0 && py >= 0 && px + pw <= def.texW && py + ph <= def.texH,
          `${type}.${p.id}.${k} inside ${def.texW}x${def.texH}`);
      }
    }
    // conversion produces all six normalized faces per box
    for (const part of remakeParts(def)) {
      for (const box of part.boxes) {
        for (const f of ['top', 'bottom', 'north', 'south', 'east', 'west']) {
          const r = box.uv[f];
          assert.ok(r && r.u1 > r.u0 && r.v1 > r.v0, `${type}.${part.id} normalized ${f}`);
        }
      }
    }
  }
});

test('generated animations only pose parts that exist', () => {
  for (const [type, def] of Object.entries(MOB_REMAKES)) {
    const ids = new Set(def.parts.map((p) => p.id));
    const anims = buildPartAnimations(def.rig, def.parts, def.animOverrides);
    assert.ok(anims.idle && anims.attack, `${type} has idle+attack`);
    for (const [name, anim] of Object.entries(anims)) {
      for (const pid of Object.keys(anim.parts)) assert.ok(ids.has(pid), `${type} ${name} poses real part '${pid}'`);
    }
  }
});

test('remade quadrupeds/bipeds have moving limbs (walk poses at least two parts)', () => {
  for (const [type, def] of Object.entries(MOB_REMAKES)) {
    if (!['quadruped', 'biped', 'pecker'].includes(def.rig)) continue;
    const anims = buildPartAnimations(def.rig, def.parts, def.animOverrides);
    assert.ok(Object.keys(anims.walk.parts).length >= 2, `${type} walk animates limbs`);
  }
});
