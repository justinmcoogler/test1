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

// ---- the painters actually cover what the geometry points at ----------------
// A box whose UV island the painter never touches renders as TRANSPARENT BLACK —
// a solid black cube welded to the animal. That is not a subtle regression and it
// is invisible in the source: the island is declared in one place and painted in
// another, twenty lines apart, and nothing connects them.
//
// So run every painter for real, over a canvas stub that records coverage, and
// assert that every island a box points at is fully painted. The stub only has to
// support what mobpaint.js uses: fillStyle + fillRect, and get/putImageData for
// the ao() pass.
function stubCanvas(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  let fill = [0, 0, 0];
  const parse = (c) => {
    if (typeof c !== 'string') return [255, 0, 255];
    if (c[0] === '#') {
      const n = parseInt(c.slice(1), 16);
      return c.length === 7 ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [255, 0, 255];
    }
    const m = c.match(/-?\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [255, 0, 255];
  };
  return {
    set fillStyle(c) { fill = parse(c); },
    get fillStyle() { return `rgb(${fill.join(',')})`; },
    fillRect(x, y, rw, rh) {
      for (let j = Math.max(0, y | 0); j < Math.min(h, (y | 0) + rh); j++) {
        for (let i = Math.max(0, x | 0); i < Math.min(w, (x | 0) + rw); i++) {
          const o = (j * w + i) * 4;
          data[o] = fill[0]; data[o + 1] = fill[1]; data[o + 2] = fill[2]; data[o + 3] = 255;
        }
      }
    },
    getImageData(x, y, rw, rh) {
      const out = new Uint8ClampedArray(rw * rh * 4);
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
        const s = ((y + j) * w + (x + i)) * 4, d = (j * rw + i) * 4;
        for (let k = 0; k < 4; k++) out[d + k] = data[s + k];
      }
      return { data: out, width: rw, height: rh };
    },
    putImageData(img, x, y) {
      for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++) {
        const s = (j * img.width + i) * 4, d = ((y + j) * w + (x + i)) * 4;
        for (let k = 0; k < 4; k++) data[d + k] = img.data[s + k];
      }
    },
    _alphaAt(x, y) { return data[(y * w + x) * 4 + 3]; },
  };
}

test('every painter covers every UV island its own boxes point at', async () => {
  const { makePainter } = await import('../../js/gfx/mobpaint.js');
  for (const [type, def] of Object.entries(MOB_REMAKES)) {
    const ctx = stubCanvas(def.texW, def.texH);
    def.paint(ctx, makePainter(ctx, `mob:${type}`));
    const seen = new Set();
    for (const p of def.parts) for (const bx of p.boxes) {
      const specs = Array.isArray(bx.uv) ? { all: bx.uv } : (bx.uv || {});
      for (const [k, isl] of Object.entries(specs)) {
        const key = `${k}:${isl}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const [ix, iy, iw, ih] = isl;
        let blank = 0;
        for (let j = iy; j < iy + ih; j++) for (let i = ix; i < ix + iw; i++) {
          if (ctx._alphaAt(i, j) < 8) blank++;
        }
        assert.equal(blank, 0,
          `${type}.${p.id} maps ${k} to [${isl}] but ${blank}/${iw * ih} of it was never painted — `
          + 'that box renders as a black cube');
      }
    }
  }
});
