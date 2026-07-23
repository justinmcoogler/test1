// Validates the Minecraft → Emberveil schematic conversion: every mapping target
// is a real block, common ids map the way a builder expects, and a synthetic
// Sponge .schem round-trips through the NBT/varint reader into placed cells with
// an accurate unmapped report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MC_MAP, mapBlock, normalizeId } from '../../tools/mc-block-map.mjs';
import { LEGACY_IDS } from '../../tools/mc-legacy-ids.mjs';
import { convertSchematic } from '../../tools/import-schematic.mjs';
import { B } from '../../js/world/blocks.js';

test('every mapping target is a real Emberveil block', () => {
  for (const [mcId, ours] of Object.entries(MC_MAP)) {
    assert.ok(ours in B, `MC_MAP[${mcId}] → "${ours}" is not a real block`);
  }
  // approx fallbacks resolve to real blocks too (probe a representative id per rule)
  for (const id of ['red_wool', 'blue_concrete', 'oak_stairs', 'stripped_warped_stem', 'lime_terracotta', 'weathered_copper']) {
    const m = mapBlock(id);
    if (m.block !== 'air') assert.ok(m.block in B, `approx ${id} → "${m.block}" is not a real block`);
  }
});

test('common ids map the way a builder expects', () => {
  const expect = {
    'minecraft:oak_planks': 'planks', 'minecraft:cobblestone': 'cobble',
    'minecraft:stone_bricks': 'stone_brick', 'minecraft:glass': 'glasspane',
    'minecraft:oak_log': 'oak_log', 'minecraft:spruce_log': 'pine_log',
    'minecraft:crafting_table': 'workbench', 'minecraft:furnace': 'furnace',
    'minecraft:chest': 'chest_block', 'minecraft:coal_ore': 'coal_seam',
    'minecraft:water': 'water', 'minecraft:grass_block': 'grass',
  };
  for (const [id, ours] of Object.entries(expect)) {
    const m = mapBlock(id);
    assert.equal(m.block, ours, `${id} should map to ${ours}, got ${m.block}`);
    assert.equal(m.quality, 'exact', `${id} should be an exact map`);
  }
});

test('shape variants keep material + shape when we model it, else fall back', () => {
  // we model these shapes → material AND shape preserved
  const stairs = mapBlock('minecraft:oak_stairs');
  assert.equal(stairs.block, 'planks_stairs');
  assert.equal(stairs.quality, 'exact');

  const slab = mapBlock('minecraft:stone_brick_slab');
  assert.equal(slab.block, 'stone_brick_slab');
  assert.equal(slab.quality, 'exact');

  const wall = mapBlock('minecraft:cobblestone_wall');
  assert.equal(wall.block, 'cobble_wall');

  // a shape we don't model on that material → plain material, shape lost
  const sandSlab = mapBlock('minecraft:sandstone_slab');
  assert.equal(sandSlab.block, 'sand');
  assert.equal(sandSlab.quality, 'approx');

  const unknown = mapBlock('minecraft:beacon');
  assert.equal(unknown.block, 'air');
  assert.equal(unknown.quality, 'none');
  assert.equal(unknown.id, 'beacon');
});

test('normalizeId strips namespace and blockstate properties', () => {
  assert.equal(normalizeId('minecraft:oak_stairs[facing=east,half=bottom]'), 'oak_stairs');
  assert.equal(normalizeId('STONE'), 'stone');
});

test('legacy numeric ids resolve to modern ids that then map', () => {
  assert.equal(mapBlock(LEGACY_IDS[4]).block, 'cobble');   // 4 = cobblestone
  assert.equal(mapBlock(LEGACY_IDS[17]).block, 'oak_log'); // 17 = log
  assert.equal(mapBlock(LEGACY_IDS[20]).block, 'glasspane'); // 20 = glass
});

// ── tiny Sponge .schem encoder (mirror of the reader) to prove the round-trip ─
function nbt(root) {
  const out = [];
  const u8 = (v) => out.push(v & 0xff);
  const u16 = (v) => { u8(v >> 8); u8(v); };
  const i32 = (v) => { u8(v >> 24); u8(v >> 16); u8(v >> 8); u8(v); };
  const str = (s) => { const b = Buffer.from(s, 'utf8'); u16(b.length); for (const c of b) u8(c); };
  const varint = (v) => { do { let b = v & 0x7f; v >>>= 7; if (v) b |= 0x80; u8(b); } while (v); };
  const writeCompound = (obj) => {
    for (const [k, val] of Object.entries(obj)) {
      if (typeof val === 'object' && val._short !== undefined) { u8(2); str(k); u16(val._short); }
      else if (typeof val === 'object' && val._palette) { u8(10); str(k); for (const [pk, pv] of Object.entries(val._palette)) { u8(3); str(pk); i32(pv); } u8(0); }
      else if (typeof val === 'object' && val._bytes) { u8(7); str(k); i32(val._bytes.length); for (const b of val._bytes) u8(b); }
    }
    u8(0);
  };
  // build BlockData bytes from index list
  const blockData = [];
  const pushVarint = (v) => { do { let b = v & 0x7f; v >>>= 7; if (v) b |= 0x80; blockData.push(b); } while (v); };
  for (const idx of root._indices) pushVarint(idx);

  u8(10); str('Schematic');
  writeCompound({
    Width: { _short: root.w }, Height: { _short: root.h }, Length: { _short: root.l },
    Palette: { _palette: root.palette },
    BlockData: { _bytes: blockData },
  });
  return Buffer.from(out);
}

test('a synthetic Sponge .schem round-trips into placed cells + report', () => {
  // 2×2×2: mostly stone, one oak_planks, one unknown "beacon", one air.
  const palette = { 'minecraft:air': 0, 'minecraft:stone': 1, 'minecraft:oak_planks': 2, 'minecraft:beacon': 3 };
  // YZX order, 8 cells: [stone, planks, stone, stone, stone, beacon, stone, air]
  const indices = [1, 2, 1, 1, 1, 3, 1, 0];
  const buf = nbt({ w: 2, h: 2, l: 2, palette, _indices: indices });

  const conv = convertSchematic(buf, '.schem');
  assert.equal(conv.size.w, 2);
  assert.equal(conv.size.h, 2);
  assert.equal(conv.size.l, 2);
  // 8 total − 1 air − 1 beacon(unmapped→air) = 6 placed
  assert.equal(conv.report.total, 8);
  assert.equal(conv.report.placed, 6);
  assert.equal(conv.cells.filter((c) => c.block === 'stone').length, 5);
  assert.equal(conv.cells.filter((c) => c.block === 'planks').length, 1);
  // the beacon is the only thing we couldn't map
  assert.equal(conv.report.unmappedKinds, 1);
  assert.equal(conv.report.unmapped[0].id, 'beacon');
  assert.equal(conv.report.unmapped[0].count, 1);

  // first cell (x0,y0,z0) is stone; the planks sits at x1,y0,z0
  const c0 = conv.cells.find((c) => c.x === 0 && c.y === 0 && c.z === 0);
  const c1 = conv.cells.find((c) => c.x === 1 && c.y === 0 && c.z === 0);
  assert.equal(c0.block, 'stone');
  assert.equal(c1.block, 'planks');
});

test('directional blocks carry a facing parsed from the blockstate', () => {
  const palette = { 'minecraft:air': 0, 'minecraft:oak_stairs[facing=east,half=bottom]': 1, 'minecraft:stone': 2 };
  const buf = nbt({ w: 2, h: 1, l: 1, palette, _indices: [1, 2] });
  const conv = convertSchematic(buf, '.schem');
  const stair = conv.cells.find((c) => c.block === 'planks_stairs');
  assert.ok(stair, 'oak_stairs mapped to planks_stairs');
  assert.equal(stair.f, 1, 'facing=east → our facing index 1 (+X)');
  const plain = conv.cells.find((c) => c.block === 'stone');
  assert.equal(plain.f, undefined, 'non-directional blocks carry no facing');
});

// ── game-side loader (pasteSchematic) with a fake world ─────────────────────
import { pasteSchematic } from '../../js/world/schematic.js';

test('pasteSchematic stamps mapped cells at an origin and skips unknown blocks', () => {
  const set = [];
  const store = new Map();
  const fakeWorld = {
    setBlock(x, y, z, id, record) { set.push({ x, y, z, id, record }); store.set(`${x},${y},${z}`, id); },
    getBlock(x, y, z) { return store.get(`${x},${y},${z}`) ?? B.air; },
  };
  const data = { name: 't', size: { w: 2, h: 1, l: 1 }, cells: [
    { x: 0, y: 0, z: 0, block: 'stone' },
    { x: 1, y: 0, z: 0, block: 'planks' },
    { x: 0, y: 0, z: 0, block: 'not_a_real_block' }, // must be skipped + reported
  ] };
  const res = pasteSchematic(fakeWorld, data, 100, 64, 200);
  assert.equal(res.placed, 2);
  assert.equal(res.skipped, 1);
  assert.deepEqual(res.missing, ['not_a_real_block']);
  // origin offset applied, ids resolved through B
  assert.equal(set[0].x, 100); assert.equal(set[0].y, 64); assert.equal(set[0].z, 200);
  assert.equal(set[0].id, B.stone);
  assert.equal(set[1].id, B.planks);
});

test('pasteSchematic overwrite:false only fills air', () => {
  const store = new Map([['0,0,0', B.stone]]);
  const fakeWorld = {
    setBlock(x, y, z, id) { store.set(`${x},${y},${z}`, id); },
    getBlock(x, y, z) { return store.get(`${x},${y},${z}`) ?? B.air; },
  };
  const data = { cells: [
    { x: 0, y: 0, z: 0, block: 'planks' }, // occupied by stone → skipped
    { x: 1, y: 0, z: 0, block: 'planks' }, // air → placed
  ] };
  const res = pasteSchematic(fakeWorld, data, 0, 0, 0, { overwrite: false });
  assert.equal(res.placed, 1);
  assert.equal(store.get('0,0,0'), B.stone); // untouched
  assert.equal(store.get('1,0,0'), B.planks);
});
