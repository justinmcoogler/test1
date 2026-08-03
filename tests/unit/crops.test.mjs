// Wheat and reeds — the two plants that are supposed to GROW.
//
// Both used to be a lie. Wheat had two states, sprout and gold, so a field
// flipped rather than ripened; and both drew as `addCross`, a diagonal X, which
// reads as a tuft of grass no matter what you paint on it. Minecraft's crop is a
// four-plane hash and its cane is a stack, and those two facts are most of why
// its fields look like fields. These tests pin the geometry and the ladder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS, WHEAT_STAGES, WHEAT_IDS, CROP_RIPE_STAGE, cropStage } from '../../js/world/blocks.js';
import { World, initSlabSet, CROP_RIPEN_SECS, CROP_STAGE_SECS } from '../../js/world/world.js';
import { meshChunk } from '../../js/gfx/mesher.js';
import { setTileUV, tileNames } from '../../js/gfx/textures.js';
import { CHUNK } from '../../js/world/worldgen.js';
import { on } from '../../js/core/events.js';

const SEED = 771403;

// meshChunk resolves every tile through faceUV, which falls back to tileUV.stone
// — one entry is enough to mesh anything without a canvas to build the atlas on.
setTileUV({ stone: { u0: 0, v0: 0, u1: 1, v1: 1 } });

function farmWorld() {
  initSlabSet();
  const w = new World(SEED);
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) w.ensureChunk(cx, cz);
  return w;
}

// A column inside chunk 0,0 flattened to bare farmland, so nothing the terrain
// generated is standing in the crop's cell.
function plot(w, x, z) {
  const y = w.surfaceAt(x, z);
  w.setBlock(x, y, z, B.farmland, true);
  w.setBlock(x, y + 1, z, B.air, true);
  return y + 1;
}

// Every vertex in a built mesh as {x, y, z} (stride is 8 floats: xyz uv rgb).
const points = (mesh) => {
  const out = [];
  if (!mesh) return out;
  for (let i = 0; i < mesh.verts.length; i += 8) out.push({ x: mesh.verts[i], y: mesh.verts[i + 1], z: mesh.verts[i + 2] });
  return out;
};

const near = (a, b) => Math.abs(a - b) < 1e-4;

test('wheat has eight ordered stages, and cropStage is the only judge of them', () => {
  assert.equal(WHEAT_STAGES.length, 8);
  assert.equal(WHEAT_STAGES[0], 'crop_young');
  assert.equal(WHEAT_STAGES[7], 'crop_ripe');
  assert.equal(CROP_RIPE_STAGE, 7);
  WHEAT_STAGES.forEach((name, i) => {
    assert.ok(name in B, `${name} is a real block`);
    assert.equal(cropStage(B[name]), i, `${name} is stage ${i}`);
    assert.equal(BLOCKS[B[name]].shape, 'crop', `${name} draws as a crop`);
    assert.equal(BLOCKS[B[name]].solid, false, `${name} is walk-through`);
  });
  assert.equal(WHEAT_IDS.length, 8);
  for (const other of ['grass', 'farmland', 'tall_grass', 'reed', 'air']) {
    assert.equal(cropStage(B[other]), -1, `${other} is not a crop`);
  }
});

test('every wheat stage and both reed pieces have their own art', () => {
  const tiles = new Set(tileNames());
  for (const name of [...WHEAT_STAGES, 'reed', 'reed_top']) {
    assert.ok(tiles.has(name), `${name} has a painter in the atlas`);
  }
});

test('a planted crop climbs one stage at a time, all the way to ripe', () => {
  const w = farmWorld();
  const x = 5, z = 6;
  const y = plot(w, x, z);
  w.plantCrop(x, y, z);
  assert.equal(cropStage(w.getBlock(x, y, z)), 0, 'sown at stage 0');

  const seen = [0];
  // 7 steps from sown to ripe. Each pass of the crop tick moves exactly one.
  for (let i = 0; i < 7; i++) {
    w.time += CROP_STAGE_SECS;
    w.update(1.2);                       // > 1s, so the slow crop tick fires
    seen.push(cropStage(w.getBlock(x, y, z)));
  }
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 7], 'no stage was skipped');
  assert.equal(w.getBlock(x, y, z), B.crop_ripe);
  assert.equal(w.crops.has(`${x},${y},${z}`), false, 'ripe crops stop being timed');

  // and it stays put — a ripe field does not keep churning
  w.time += 500;
  w.update(1.2);
  assert.equal(w.getBlock(x, y, z), B.crop_ripe);
});

test('sowing to harvest still takes about two minutes', () => {
  const w = farmWorld();
  const x = 9, z = 3;
  const y = plot(w, x, z);
  const sown = w.time;
  w.plantCrop(x, y, z);
  // Step in small slices so the measured time is when it ACTUALLY ripened,
  // not the size of the jump that got it there.
  for (let i = 0; i < 400 && cropStage(w.getBlock(x, y, z)) < CROP_RIPE_STAGE; i++) {
    w.time += 1.1;
    w.update(1.1);
  }
  const took = w.time - sown;
  assert.equal(cropStage(w.getBlock(x, y, z)), CROP_RIPE_STAGE, 'it did ripen');
  assert.ok(Math.abs(took - CROP_RIPEN_SECS) < 12, `took ${took.toFixed(1)}s, wanted ~${CROP_RIPEN_SECS}s`);
});

test('cropRipened fires once, at the last stage and not before', () => {
  const w = farmWorld();
  const x = 11, z = 11;
  const y = plot(w, x, z);
  const fired = [];
  const off = on('cropRipened', (e) => {
    if (e.x === x && e.z === z) fired.push(cropStage(w.getBlock(x, y, z)));
  });
  try {
    w.plantCrop(x, y, z);
    for (let i = 0; i < 9; i++) { w.time += CROP_STAGE_SECS; w.update(1.2); }
  } finally { off(); }
  assert.deepEqual(fired, [CROP_RIPE_STAGE], 'exactly one ripened event, at stage 7');
});

test('a crop dug up part-grown stops being timed', () => {
  const w = farmWorld();
  const x = 4, z = 12;
  const y = plot(w, x, z);
  w.plantCrop(x, y, z);
  w.time += CROP_STAGE_SECS * 2; w.update(1.2);
  w.time += CROP_STAGE_SECS; w.update(1.2);
  assert.ok(cropStage(w.getBlock(x, y, z)) > 0, 'it got going');
  w.setBlock(x, y, z, B.air, true);          // pulled up
  w.time += CROP_STAGE_SECS; w.update(1.2);
  assert.equal(w.getBlock(x, y, z), B.air, 'it does not grow back out of thin air');
  assert.equal(w.crops.has(`${x},${y},${z}`), false, 'and the timer is gone');
});

test('a crop draws as a four-plane hash, sunk into the soil', () => {
  const w = farmWorld();
  const x = 7, z = 7;
  const y = plot(w, x, z);
  w.plantCrop(x, y, z);
  const pts = points(meshChunk(w, 0, 0).cutout);

  const y0 = y - 1 / 16, y1 = y + 15 / 16;
  // The two panes that face ±X span the full cell in z at a quarter inset in x…
  for (const o of [0.25, 0.75]) {
    assert.ok(pts.some((p) => near(p.x, x + o) && near(p.y, y0) && near(p.z, z)),
      `pane at x+${o} starts at the sunk bottom`);
    assert.ok(pts.some((p) => near(p.x, x + o) && near(p.y, y1) && near(p.z, z + 1)),
      `pane at x+${o} runs the full cell and stops below the block top`);
    // …and the two that face ±Z are the same thing rotated.
    assert.ok(pts.some((p) => near(p.z, z + o) && near(p.y, y0) && near(p.x, x)),
      `pane at z+${o} starts at the sunk bottom`);
    assert.ok(pts.some((p) => near(p.z, z + o) && near(p.y, y1) && near(p.x, x + 1)),
      `pane at z+${o} runs the full cell`);
  }
  // No diagonal: a hash has no vertex on the cell's corner-to-corner line.
  const diagonal = pts.filter((p) => near(p.x, x + 0.15) && near(p.z, z + 0.15));
  assert.equal(diagonal.length, 0, 'nothing is drawn on the old cross diagonal');
});

test('a crop adds four panes where a cross adds two', () => {
  const w = farmWorld();
  const x = 10, z = 5;
  const y = plot(w, x, z);
  const bare = meshChunk(w, 0, 0).cutout?.verts.length ?? 0;
  w.setBlock(x, y, z, B.tall_grass, true);
  const cross = meshChunk(w, 0, 0).cutout.verts.length - bare;
  w.setBlock(x, y, z, B.crop_ripe, true);
  const crop = meshChunk(w, 0, 0).cutout.verts.length - bare;
  assert.equal(cross, 2 * 4 * 8, 'a cross is two quads');
  assert.equal(crop, 4 * 4 * 8, 'a crop is four');
});

test('reeds stack: a cane stands on the cane below it, but not on air', () => {
  const w = farmWorld();
  const x = 3, z = 9;
  const y = plot(w, x, z);
  const bare = meshChunk(w, 0, 0).cutout?.verts.length ?? 0;

  w.setBlock(x, y, z, B.reed, true);
  w.setBlock(x, y + 1, z, B.reed, true);
  w.setBlock(x, y + 2, z, B.reed_top, true);
  const stack = meshChunk(w, 0, 0).cutout.verts.length - bare;
  assert.equal(stack, 3 * 2 * 4 * 8, 'all three segments are drawn');

  // The exception is exactly "on another reed" — foliage still may not hang.
  w.setBlock(x, y, z, B.air, true);
  w.setBlock(x, y + 1, z, B.air, true);
  w.setBlock(x, y + 2, z, B.air, true);
  w.setBlock(x, y + 2, z, B.reed, true);   // nothing under it at all
  const floating = (meshChunk(w, 0, 0).cutout?.verts.length ?? 0) - bare;
  assert.equal(floating, 0, 'a reed with nothing under it draws nothing');
});

// Reeds used to be impossible. The rule said "grass at or below sea level", and
// column() lays SAND over everything within two blocks of the waterline — so the
// set it described was empty and no reed ever grew outside the hand-placed ones
// at the camp pond. This is the regression test for that: the world must
// actually contain reeds, growing where reeds grow.
test('the world grows reed stands: 1–3 canes, one crown, on the waterline', () => {
  initSlabSet();
  const w = new World(SEED);
  const C0 = 0, C1 = 4;                                  // a shoreline near spawn
  for (let cx = C0; cx <= C1; cx++) for (let cz = C0; cz <= C1; cz++) w.ensureChunk(cx, cz);

  const heights = [];
  for (let x = C0 * CHUNK; x < (C1 + 1) * CHUNK; x++) {
    for (let z = C0 * CHUNK; z < (C1 + 1) * CHUNK; z++) {
      for (let y = 40; y < 90; y++) {
        const id = w.getBlock(x, y, z);
        if (id !== B.reed && id !== B.reed_top) continue;
        if (w.getBlock(x, y - 1, z) === B.reed) break;    // mid-stand, not a root
        let n = 0, crowns = 0;
        for (let k = 0; k < 8; k++) {
          const seg = w.getBlock(x, y + k, z);
          if (seg !== B.reed && seg !== B.reed_top) break;
          n++;
          if (seg === B.reed_top) crowns++;
        }
        assert.ok(n >= 1 && n <= 3, `stand at ${x},${y},${z} is ${n} tall`);
        assert.equal(crowns, 1, `stand at ${x},${y},${z} has exactly one crown`);
        assert.equal(w.getBlock(x, y + n - 1, z), B.reed_top, 'and the crown is on top');
        assert.ok(BLOCKS[w.getBlock(x, y - 1, z)].solid, 'and it is rooted in the ground');
        heights.push(n);
        break;
      }
    }
  }
  assert.ok(heights.length > 0, 'reeds grow somewhere in the world at all');
  assert.ok(new Set(heights).size > 1, `reed height varies (saw ${[...new Set(heights)].sort().join(',')})`);
});
