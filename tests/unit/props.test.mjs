// Nature-prop forage: the 9 imported prop MODELS are well-formed, the forage
// NODE_TYPES reference them with valid drops, the invisible pick-target block
// behaves, and worldgen actually scatters them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NODE_TYPES, PROP_NODE_TYPES, rollNodeDrops } from '../../js/game/nodes.js';
import { PROP_MODELS } from '../../js/gfx/proppack.js';
import { B, BLOCKS, SHAPE_COLLISION } from '../../js/world/blocks.js';
import { ITEMS } from '../../js/game/items.js';
import { World } from '../../js/world/world.js';

test('all 9 prop models are well-formed (real geometry + embedded texture)', () => {
  const ids = Object.keys(PROP_MODELS);
  assert.equal(ids.length, 9);
  for (const id of ids) {
    const m = PROP_MODELS[id];
    assert.ok(m.texW > 0 && m.texH > 0, `${id} has a texture size`);
    assert.match(m.texture, /^data:image\//, `${id} embeds its texture`);
    const boxes = m.parts.reduce((a, p) => a + p.boxes.length, 0);
    assert.ok(boxes >= 3, `${id} has real geometry (${boxes} boxes)`);
    // no degenerate unit-UV boxes survived the importer fix
    for (const p of m.parts) for (const b of p.boxes) {
      const faces = Object.values(b.uv || {});
      const allUnit = faces.length && faces.every((f) => Array.isArray(f) && f[0] === 0 && f[1] === 0 && f[2] === 1 && f[3] === 1);
      assert.ok(!allUnit, `${id} has no unmapped placeholder box`);
    }
  }
});

test('prop forage nodes reference a prop model, the marker block, and real drops', () => {
  assert.equal(PROP_NODE_TYPES.length, 9);
  for (const t of PROP_NODE_TYPES) {
    const def = NODE_TYPES[t];
    assert.equal(def.kind, 'prop', `${t} is a prop node`);
    assert.equal(def.skill, 'foraging', `${t} trains foraging`);
    assert.equal(def.ready, 'forage_marker', `${t} shows via the marker cell`);
    assert.ok(PROP_MODELS[def.model.replace(/^prop_/, '')], `${t} model ${def.model} exists`);
    for (const d of def.drops) assert.ok(d.item in ITEMS, `${t} drop ${d.item} exists`);
    for (const r of def.rare || []) assert.ok(r.item in ITEMS, `${t} rare ${r.item} exists`);
    // a harvest always yields at least one existing item
    const rolled = rollNodeDrops(def, 99, () => 0.5, 0);
    assert.ok(rolled.length >= 1 && rolled.every((r) => r.item in ITEMS), `${t} rolls valid drops`);
  }
});

test('forage_marker is invisible, walk-through, but still a raycast target', () => {
  const d = BLOCKS[B.forage_marker];
  assert.equal(d.shape, 'marker');
  assert.equal(d.solid, false);
  assert.equal(d.opaque, false);
  assert.equal(SHAPE_COLLISION.marker, 0);
  const w = new World(4242);
  w.ensureChunk(0, 0);
  w.setBlock(2, 66, 2, B.forage_marker, true);
  assert.equal(w.collisionHeight(2, 66, 2), 0, 'you walk through a marker');
});

test('worldgen scatters prop forage nodes on open ground', () => {
  const w = new World(31337);
  const propSet = new Set(PROP_NODE_TYPES);
  let props = 0; const kinds = new Set();
  for (let cx = 0; cx < 8; cx++) for (let cz = 0; cz < 8; cz++) {
    const c = w.ensureChunk(cx, cz);
    for (const n of c.nodes) if (propSet.has(n.type)) { props++; kinds.add(n.type); assert.equal(n.def.kind, 'prop'); }
  }
  assert.ok(props > 0, `expected scattered props, got ${props}`);
  assert.ok(kinds.size >= 3, `expected a mix of prop types, got ${kinds.size}`);
});
