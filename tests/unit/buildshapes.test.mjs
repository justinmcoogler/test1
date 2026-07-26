// The lesson build-shape vocabulary.
//
// The curriculum test proves every authored shape validates and solves. That
// only means something if validate can SAY NO — a validateShape() that returned
// null for everything would pass all ninety of those assertions and let an
// unbuildable lesson through. So this file is the other half: the shapes that
// must be rejected, and the checks that must not be fooled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkShape, solveShape, setupShape, shapeNeeds, validateShape, MAT, GLYPH_BLOCK, GLYPH_OF } from '../../js/game/buildshapes.js';
import { B, BLOCKS, EDUCATION_BLOCKS } from '../../js/world/blocks.js';
import { ITEMS } from '../../js/game/items.js';

// A stand-in mat with the real geometry: 13 wide, 5 deep, 7 tall, split at the
// middle column — same numbers as js/world/classroom.js.
function mat(x0 = 0, y0 = 0, z0 = 0) {
  const m = { x0, x1: x0 + 12, y0, y1: y0 + 6, z0, z1: z0 + 4, div: x0 + 6 };
  m.left = { ...m, x0: m.div + 1, x1: m.x1 };
  m.right = { ...m, x0: m.x0, x1: m.div - 1 };
  return m;
}

// The same ctx the runner builds, over a Map instead of a world.
function ctxOver(m) {
  const cells = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  const nameAt = (x, y, z) => cells.get(key(x, y, z)) || 'air';
  const countPlaced = (name, region) => {
    let n = 0;
    for (let x = region.x0; x <= region.x1; x++) for (let y = region.y0; y <= region.y1; y++) {
      for (let z = region.z0; z <= region.z1; z++) if (nameAt(x, y, z) === name) n++;
    }
    return n;
  };
  const stackAt = (x, z, region = m) => {
    let n = 0;
    for (let y = region.y0; y <= region.y1; y++) { if (nameAt(x, y, z) === 'air') break; n++; }
    return n;
  };
  const tallest = (region = m) => {
    let best = 0;
    for (let x = region.x0; x <= region.x1; x++) for (let z = region.z0; z <= region.z1; z++) {
      best = Math.max(best, stackAt(x, z, region));
    }
    return best;
  };
  const rowAt = (z, region = m) => {
    const out = [];
    for (let x = region.x0; x <= region.x1; x++) out.push(nameAt(x, region.y0, z));
    return out;
  };
  const runs = (region = m) => {
    const out = [];
    for (let z = region.z0; z <= region.z1; z++) {
      let run = [];
      for (const n of rowAt(z, region)) { if (n === 'air') { if (run.length) out.push(run); run = []; } else run.push(n); }
      if (run.length) out.push(run);
    }
    return out;
  };
  // Same reader as the runner: letters, numerals and signs all read as their
  // character, anything else reads as a gap.
  const words = (region = m) => runs(region)
    .map((r) => r.map((n) => GLYPH_OF[n] || ' ').join(''))
    .filter((w) => w && !w.includes(' '));
  const play = (ops) => {
    for (const op of ops) {
      if (op.op === 'break') cells.delete(key(op.x, op.y, op.z));
      else cells.set(key(op.x, op.y, op.z), op.block);
    }
  };
  const ctx = { mat: m, scratch: {}, nameAt, countPlaced, stackAt, tallest, rowAt, runs, words };
  // Play the moves ONE AT A TIME, re-checking after each — which is what the
  // runner does, because every placement and every break fires an event. It
  // matters: `subtract` only knows nine were once there because it was asked
  // while they were.
  const feed = (shape, ops) => {
    let ok = false;
    for (const op of ops) { play([op]); ok = checkShape(shape, ctx); }
    return ok;
  };
  return { ctx, play, feed, cells };
}

const SHAPES = [
  { kind: 'count', block: 'red_wool', n: 7 },
  { kind: 'sort', a: 'red_wool', b: 'yellow_wool', n: 4 },
  { kind: 'subtract', block: 'green_wool', from: 9, take: 4 },
  { kind: 'bond', have: { block: 'yellow_wool', n: 6 }, add: { block: 'blue_wool', n: 4 } },
  { kind: 'tower', block: 'red_wool', h: 5 },
  { kind: 'compare', block: 'red_wool', left: 5, right: 2 },
  { kind: 'pattern', seq: ['red_wool', 'blue_wool'], reps: 3 },
  { kind: 'array', block: 'green_wool', rows: 3, cols: 4 },
  { kind: 'groups', block: 'brown_wool', sizes: [10, 3] },
  { kind: 'word', text: 'CAT' },
  { kind: 'words', list: ['CAT', 'HAT', 'BAT'] },
  { kind: 'fraction', whole: 'white_wool', part: 'pink_wool', den: 8, num: 3 },
  { kind: 'mirror', block: 'orange_wool', pairs: 4 },
  { kind: 'stack', block: 'cyan_wool', heights: [1, 3, 2, 5] },
  { kind: 'box', block: 'brown_wool', w: 3, d: 2, h: 2 },
  { kind: 'frame', block: 'brown_wool', w: 5, d: 3 },
  { kind: 'cells', block: 'yellow_wool', at: [[0, 0, 0], [2, 0, 1], [4, 0, 3]] },
  { kind: 'sentence', text: '3+2=5' },
];

test('every kind: its own solution passes its own check', () => {
  for (const s of SHAPES) {
    const m = mat(100, 60, 200);          // not at the origin — offsets must be real
    const { play, feed } = ctxOver(m);
    play(setupShape(s, m));
    assert.ok(feed(s, solveShape(s, m)), `${s.kind}: its worked solution does not satisfy it`);
  }
});

test('every kind: an empty mat fails it', () => {
  for (const s of SHAPES) {
    const m = mat();
    const { ctx, play } = ctxOver(m);
    play(setupShape(s, m));               // a bond's pre-placed blocks are not an answer
    assert.equal(checkShape(s, ctx), false, `${s.kind}: an empty mat passed`);
  }
});

test('every kind: needs only names real blocks, and enough of them', () => {
  for (const s of SHAPES) {
    const need = shapeNeeds(s);
    const m = mat();
    const used = {};
    for (const op of solveShape(s, m)) if (op.op !== 'break') used[op.block] = (used[op.block] || 0) + 1;
    for (const [block, n] of Object.entries(used)) {
      assert.ok(BLOCKS[B[block]], `${s.kind}: "${block}" is not a block`);
      assert.ok((need[block] || 0) >= n, `${s.kind}: needs ${n} × ${block}, declares ${need[block] || 0}`);
    }
  }
});

test('validate says no to shapes that do not fit the mat', () => {
  const bad = [
    [{ kind: 'count', block: 'red_wool', n: 999 }, 'more blocks than the mat has squares'],
    [{ kind: 'tower', block: 'red_wool', h: MAT.height + 1 }, 'a tower through the ceiling'],
    [{ kind: 'array', block: 'red_wool', rows: 9, cols: 4 }, 'more rows than the mat has'],
    [{ kind: 'array', block: 'red_wool', rows: 2, cols: 20 }, 'wider than the mat'],
    [{ kind: 'pattern', seq: ['red_wool', 'blue_wool'], reps: 9 }, 'a pattern longer than a row'],
    [{ kind: 'word', text: 'EXTRAORDINARY' + 'X' }, 'a word too long for a row'],
    [{ kind: 'word', text: 'cat' }, 'lower case has no letter blocks'],
    [{ kind: 'words', list: ['A', 'B', 'C', 'D', 'E', 'F'] }, 'more words than rows'],
    [{ kind: 'fraction', whole: 'white_wool', part: 'red_wool', den: 20, num: 3 }, 'a denominator wider than a row'],
    [{ kind: 'groups', block: 'red_wool', sizes: [10, 10, 10, 10, 10, 10] }, 'groups that will not pack'],
    [{ kind: 'box', block: 'red_wool', w: 3, d: 9, h: 2 }, 'a box deeper than the mat'],
    [{ kind: 'frame', block: 'red_wool', w: 3, d: 9 }, 'a frame deeper than the mat'],
    [{ kind: 'cells', block: 'red_wool', at: [[0, 0, 9]] }, 'a cell off the back of the mat'],
    [{ kind: 'subtract', block: 'red_wool', from: 4, take: 9 }, 'taking away more than there is'],
    [{ kind: 'count', block: 'reed_wool', n: 3 }, 'a block that does not exist'],
    [{ kind: 'squircle', block: 'red_wool' }, 'a kind nobody implemented'],
  ];
  for (const [shape, why] of bad) {
    assert.ok(validateShape(shape), `validate accepted ${why}: ${JSON.stringify(shape)}`);
  }
});

test('checks are not fooled by near misses', () => {
  const near = [
    // a tower one short
    [{ kind: 'tower', block: 'red_wool', h: 5 }, { kind: 'tower', block: 'red_wool', h: 4 }],
    // an array with the rows and columns swapped is a different array
    [{ kind: 'array', block: 'red_wool', rows: 3, cols: 4 }, { kind: 'array', block: 'red_wool', rows: 4, cols: 3 }],
    // one group split differently
    [{ kind: 'groups', block: 'red_wool', sizes: [10, 3] }, { kind: 'groups', block: 'red_wool', sizes: [9, 4] }],
    // the right number of the wrong colour
    [{ kind: 'fraction', whole: 'white_wool', part: 'red_wool', den: 8, num: 3 },
      { kind: 'fraction', whole: 'white_wool', part: 'red_wool', den: 8, num: 4 }],
    // a word with two letters swapped
    [{ kind: 'word', text: 'CAT' }, { kind: 'word', text: 'ACT' }],
    // bars in a different pattern
    [{ kind: 'stack', block: 'red_wool', heights: [1, 3, 5] }, { kind: 'stack', block: 'red_wool', heights: [1, 3, 4] }],
    // a solid box is not a hollow frame
    [{ kind: 'frame', block: 'red_wool', w: 4, d: 3 }, { kind: 'box', block: 'red_wool', w: 4, d: 3, h: 1 }],
  ];
  for (const [want, built] of near) {
    const m = mat();
    const { ctx, play } = ctxOver(m);
    play(solveShape(built, m));
    assert.equal(checkShape(want, ctx), false,
      `a ${built.kind} answer passed a ${want.kind} question it should not have`);
  }
});

test('subtract remembers the peak, so placing the answer is not enough', () => {
  const s = { kind: 'subtract', block: 'green_wool', from: 9, take: 4 };
  const m = mat();
  const { feed } = ctxOver(m);
  // Five placed and nothing taken away: the mat LOOKS right and is not.
  assert.equal(feed(s, solveShape({ kind: 'count', block: 'green_wool', n: 5 }, m)), false,
    'five out of nowhere is not nine take away four');
  // Now do it properly: build nine (the peak is remembered), then break four.
  const done = ctxOver(m);
  assert.ok(done.feed(s, solveShape(s, m)), 'building nine and breaking four does pass');
});

test('sort accepts either side, and rejects a colour that straddles the line', () => {
  const s = { kind: 'sort', a: 'red_wool', b: 'yellow_wool', n: 3 };
  const m = mat();
  const mirrored = ctxOver(m);
  // The mirror arrangement: still fully sorted, just faced the other way.
  for (let i = 0; i < 3; i++) {
    mirrored.play([{ op: 'place', x: m.right.x0 + i, y: m.y0, z: m.z0, block: 'red_wool' }]);
    mirrored.play([{ op: 'place', x: m.left.x0 + i, y: m.y0, z: m.z0, block: 'yellow_wool' }]);
  }
  assert.ok(checkShape(s, mirrored.ctx), 'a child who faced the mat the other way still sorted');

  const straddle = ctxOver(m);
  straddle.play(solveShape(s, m));
  straddle.play([{ op: 'place', x: m.right.x0 + 5, y: m.y0, z: m.z0, block: 'red_wool' }]);
  assert.equal(checkShape(s, straddle.ctx), false, 'one red on the wrong side is not sorted');
});

// ---- the education blocks ----------------------------------------------------
test('every education block can be held, and none of them is a wool block in a hat', () => {
  for (const name of EDUCATION_BLOCKS) {
    assert.ok(BLOCKS[B[name]], `${name} is not a block`);
    assert.ok(ITEMS[name], `${name} has no item, so a child can never be handed one`);
    assert.equal(BLOCKS[B[name]].tiles.all, name, `${name} should paint its own tile`);
  }
});

test('the writing blocks round-trip: every glyph has a block and every block a glyph', () => {
  for (const [ch, block] of Object.entries(GLYPH_BLOCK)) {
    assert.ok(BLOCKS[B[block]], `"${ch}" maps to ${block}, which is not a block`);
    assert.equal(GLYPH_OF[block], ch, `${block} does not read back as "${ch}"`);
  }
  // 26 letters + 10 digits + 7 signs, and no duplicates in either direction.
  assert.equal(Object.keys(GLYPH_BLOCK).length, 43);
  assert.equal(Object.keys(GLYPH_OF).length, 43);
});

test('a sentence is read back exactly, and a near miss is not accepted', () => {
  const m = mat();
  const want = { kind: 'sentence', text: '3+2=5' };
  const right = ctxOver(m);
  assert.ok(right.feed(want, solveShape(want, m)), '3+2=5 built is 3+2=5 read');
  // The same digits, the wrong sum.
  const wrong = ctxOver(m);
  wrong.play(solveShape({ kind: 'sentence', text: '3+2=6' }, m));
  assert.equal(checkShape(want, wrong.ctx), false, '3+2=6 does not pass as 3+2=5');
  // A word question is not answered by a sum, and vice versa.
  const letters = ctxOver(m);
  letters.play(solveShape({ kind: 'word', text: 'CAT' }, m));
  assert.equal(checkShape(want, letters.ctx), false, 'CAT is not a number sentence');
});
