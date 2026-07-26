// What a child is asked to BUILD, as data.
//
// Every lesson step ends with the same question — is what is on the mat the
// thing we asked for? Before this file, each lesson answered that with a
// hand-written check(), and the test suite answered "can it be finished?" with a
// hand-written solution. Two independent pieces of prose per step, and the only
// thing keeping them honest was somebody reading both. At seventeen lessons that
// held. At ninety it does not: `nm_tens` asked for a row of ten on a mat nine
// wide and read as completely reasonable right up until somebody tried it.
//
// So a step declares its SHAPE — `{ kind: 'array', block: 'red_wool', rows: 3,
// cols: 4 }` — and this module derives all three things from that one sentence:
//
//   check(shape, ctx)   is the mat right?
//   solve(shape, mat)   the moves a child would make to get it right
//   needs(shape)        the blocks they must be holding to make them
//   validate(shape)     …and does the answer even fit on the mat?
//
// A lesson can no longer be unwinnable-but-plausible, because the test suite
// plays every step's own solution through the real runner, and a shape that
// cannot fit fails validation before anyone reads a word of it.
//
// The mat (js/world/classroom.js) is 13 wide, 5 deep and 7 tall, split down the
// middle by a plank line at `div`. Nothing here may exceed that.
import { B } from '../world/blocks.js';

export const MAT = { width: 13, rows: 5, height: 7, half: 6 };

const place = (x, y, z, block) => ({ op: 'place', x, y, z, block });
const breakAt = (x, y, z) => ({ op: 'break', x, y, z });

// Every buildable cell of the mat surface, row-major (near row first, left to
// right). setup() and solve() both walk this, in this order, so a step that
// pre-places blocks and a solution that adds to them never land on each other.
function surface(region) {
  const out = [];
  for (let z = region.z0; z <= region.z1; z++) {
    for (let x = region.x0; x <= region.x1; x++) out.push([x, z]);
  }
  return out;
}

// Fill `n` cells of a region with one block, row-major from the given offset.
function fill(region, n, block, from = 0) {
  const cells = surface(region);
  const ops = [];
  for (let i = 0; i < n && from + i < cells.length; i++) {
    const [x, z] = cells[from + i];
    ops.push(place(x, region.y0, z, block));
  }
  return ops;
}

const add = (need, block, n) => { need[block] = Math.max(need[block] || 0, 0) + n; return need; };
const letters = (text) => [...text].map((ch) => GLYPH_BLOCK[ch]);
const desc = (a) => [...a].sort((p, q) => q - p);

// Every block a child can write WITH, and the character it reads as. Letters
// spell words; digits and signs write sums. One table, used in both directions:
// js/game/lessons.js reads a row of blocks into a string with it, and the shapes
// below turn a wanted string back into blocks to place.
export const GLYPH_BLOCK = { '+': 'sym_plus', '-': 'sym_minus', x: 'sym_times', '/': 'sym_divide', '=': 'sym_equals', '<': 'sym_less', '>': 'sym_greater' };
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') GLYPH_BLOCK[ch] = `letter_${ch.toLowerCase()}`;
for (let d = 0; d <= 9; d++) GLYPH_BLOCK[String(d)] = `digit_${d}`;
export const GLYPH_OF = Object.fromEntries(Object.entries(GLYPH_BLOCK).map(([ch, b]) => [b, ch]));
const sameMultiset = (a, b) => a.length === b.length && desc(a).every((v, i) => v === desc(b)[i]);

// Column heights across a region: how many blocks are stacked on each square,
// counting up from the mat and stopping at the first gap.
function columns(ctx, region) {
  const out = [];
  for (let x = region.x0; x <= region.x1; x++) {
    for (let z = region.z0; z <= region.z1; z++) {
      const h = ctx.stackAt(x, z, region);
      if (h > 0) out.push({ x, z, h });
    }
  }
  return out;
}

// ---- the vocabulary ---------------------------------------------------------
// Sixteen kinds, each with the same four answers. Adding a seventeenth means
// writing all four — which is the point: a kind that cannot be solved
// automatically cannot be tested automatically either.
const KINDS = {
  // N of one block, anywhere on the mat. `atLeast` turns "exactly seven" into
  // "at least seven", which is how a build-anything-you-like step is expressed.
  count: {
    check: (s, ctx) => {
      const n = ctx.countPlaced(s.block, ctx.mat);
      return s.atLeast ? n >= s.n : n === s.n;
    },
    solve: (s, mat) => fill(mat, s.n, s.block),
    needs: (s) => add({}, s.block, s.n),
    validate: (s) => (s.n <= MAT.width * MAT.rows ? null : `count ${s.n} does not fit the mat`),
  },

  // Two blocks, each entirely on its own side of the plank line. Either
  // arrangement passes: a child who sorted perfectly but faced the mat the other
  // way has still sorted perfectly.
  sort: {
    check: (s, ctx) => {
      const al = ctx.countPlaced(s.a, ctx.mat.left), ar = ctx.countPlaced(s.a, ctx.mat.right);
      const bl = ctx.countPlaced(s.b, ctx.mat.left), br = ctx.countPlaced(s.b, ctx.mat.right);
      return (al >= s.n && br >= s.n && ar === 0 && bl === 0)
          || (ar >= s.n && bl >= s.n && al === 0 && br === 0);
    },
    solve: (s, mat) => [...fill(mat.left, s.n, s.a), ...fill(mat.right, s.n, s.b)],
    needs: (s) => add(add({}, s.a, s.n), s.b, s.n),
    validate: (s) => (s.n <= MAT.half * MAT.rows ? null : `sort ${s.n} per side does not fit`),
  },

  // Build `from`, then take `take` away. The peak is what makes this
  // subtraction rather than "place four": a check only ever sees the mat as it
  // is now, so without remembering that nine were once there a child could pass
  // by placing five and never taking anything away.
  subtract: {
    check: (s, ctx) => {
      const n = ctx.countPlaced(s.block, ctx.mat);
      ctx.scratch.peak = Math.max(ctx.scratch.peak || 0, n);
      return ctx.scratch.peak >= s.from && n === s.from - s.take;
    },
    solve: (s, mat) => {
      const ops = fill(mat, s.from, s.block);
      for (let i = 0; i < s.take; i++) {
        const p = ops[s.from - 1 - i];
        ops.push(breakAt(p.x, p.y, p.z));
      }
      return ops;
    },
    needs: (s) => add({}, s.block, s.from),
    validate: (s) => (s.take < s.from && s.from <= MAT.width * MAT.rows ? null : 'subtract is impossible'),
  },

  // Some are laid out for the child; they add the rest. The exercise is
  // completing a bond, not building both halves of one.
  bond: {
    check: (s, ctx) => ctx.countPlaced(s.have.block, ctx.mat) === s.have.n
                    && ctx.countPlaced(s.add.block, ctx.mat) === s.add.n,
    setup: (s, mat) => fill(mat, s.have.n, s.have.block),
    solve: (s, mat) => fill(mat, s.add.n, s.add.block, s.have.n),
    needs: (s) => add({}, s.add.block, s.add.n),
    validate: (s) => (s.have.n + s.add.n <= MAT.width * MAT.rows ? null : 'bond does not fit the mat'),
  },

  // One tower, exactly this tall. Deliberately blind to colour: a child who
  // counted five blocks up has measured five, whatever they used.
  tower: {
    check: (s, ctx) => ctx.tallest(ctx.mat) === s.h,
    solve: (s, mat) => {
      const ops = [];
      for (let i = 0; i < s.h; i++) ops.push(place(mat.x0, mat.y0 + i, mat.z0, s.block));
      return ops;
    },
    needs: (s) => add({}, s.block, s.h),
    validate: (s) => (s.h >= 1 && s.h <= MAT.height ? null : `tower of ${s.h} does not fit`),
  },

  // A tower each side of the line, each an exact height — taller/shorter,
  // longer/wider, more/less, all the comparison work.
  compare: {
    check: (s, ctx) => ctx.tallest(ctx.mat.left) === s.left && ctx.tallest(ctx.mat.right) === s.right,
    solve: (s, mat) => {
      const ops = [];
      for (let i = 0; i < s.left; i++) ops.push(place(mat.left.x0, mat.y0 + i, mat.z0, s.block));
      for (let i = 0; i < s.right; i++) ops.push(place(mat.right.x0, mat.y0 + i, mat.z0, s.block));
      return ops;
    },
    needs: (s) => add({}, s.block, s.left + s.right),
    validate: (s) => (s.left >= 1 && s.right >= 1 && Math.max(s.left, s.right) <= MAT.height
      ? null : 'compare heights do not fit'),
  },

  // A repeating sequence, unbroken, in one row.
  pattern: {
    check: (s, ctx) => ctx.runs(ctx.mat).some((run) => run.length === s.seq.length * s.reps
      && run.every((name, i) => name === s.seq[i % s.seq.length])),
    solve: (s, mat) => {
      const ops = [];
      for (let i = 0; i < s.seq.length * s.reps; i++) {
        ops.push(place(mat.x0 + i, mat.y0, mat.z0, s.seq[i % s.seq.length]));
      }
      return ops;
    },
    needs: (s) => { const n = {}; for (let i = 0; i < s.seq.length * s.reps; i++) add(n, s.seq[i % s.seq.length], 1); return n; },
    validate: (s) => (s.seq.length * s.reps <= MAT.width ? null : 'pattern is longer than the mat'),
  },

  // Rows × columns: the array model. Multiplication, area, repeated addition and
  // "is this number square?" are all this shape with different numbers.
  array: {
    check: (s, ctx) => {
      const rs = ctx.runs(ctx.mat);
      return rs.length === s.rows && rs.every((r) => r.length === s.cols && r.every((n) => n === s.block));
    },
    solve: (s, mat) => {
      const ops = [];
      for (let r = 0; r < s.rows; r++) {
        for (let c = 0; c < s.cols; c++) ops.push(place(mat.x0 + c, mat.y0, mat.z0 + r, s.block));
      }
      return ops;
    },
    needs: (s) => add({}, s.block, s.rows * s.cols),
    validate: (s) => (s.rows >= 1 && s.rows <= MAT.rows && s.cols >= 1 && s.cols <= MAT.width
      ? null : `${s.rows}x${s.cols} does not fit the mat`),
  },

  // Separate clumps with gaps between them: equal groups for division, unequal
  // ones for grouping and ratio work. Order does not matter — three and five is
  // the same answer as five and three.
  groups: {
    check: (s, ctx) => {
      const rs = ctx.runs(ctx.mat);
      if (!rs.every((r) => r.every((n) => n === s.block))) return false;
      return sameMultiset(rs.map((r) => r.length), s.sizes);
    },
    solve: (s, mat) => {
      const ops = [];
      let z = mat.z0, x = mat.x0;
      for (const size of s.sizes) {
        if (x + size - 1 > mat.x1) { z++; x = mat.x0; }
        for (let i = 0; i < size; i++) ops.push(place(x + i, mat.y0, z, s.block));
        x += size + 1;                       // a gap, or it reads as one group
      }
      return ops;
    },
    needs: (s) => add({}, s.block, s.sizes.reduce((a, b) => a + b, 0)),
    validate: (s) => {
      let z = 0, x = 0;
      for (const size of s.sizes) {
        if (size > MAT.width) return `a group of ${size} is wider than the mat`;
        if (x + size > MAT.width) { z++; x = 0; }
        x += size + 1;
      }
      return z < MAT.rows ? null : 'the groups do not fit on the mat';
    },
  },

  // A word, spelled with letter blocks in an unbroken row.
  word: {
    check: (s, ctx) => ctx.words().includes(s.text),
    solve: (s, mat) => letters(s.text).map((b, i) => place(mat.x0 + i, mat.y0, mat.z0, b)),
    needs: (s) => { const n = {}; for (const b of letters(s.text)) add(n, b, 1); return n; },
    validate: (s) => (/^[A-Z]+$/.test(s.text) && s.text.length <= MAT.width
      ? null : `"${s.text}" is not a spellable word for this mat`),
  },

  // Several words at once, one per row.
  words: {
    check: (s, ctx) => { const w = ctx.words(); return s.list.every((t) => w.includes(t)); },
    solve: (s, mat) => s.list.flatMap((text, row) =>
      letters(text).map((b, i) => place(mat.x0 + i, mat.y0, mat.z0 + row, b))),
    needs: (s) => { const n = {}; for (const t of s.list) for (const b of letters(t)) add(n, b, 1); return n; },
    validate: (s) => {
      if (s.list.length > MAT.rows) return 'more words than the mat has rows';
      for (const t of s.list) if (!/^[A-Z]+$/.test(t) || t.length > MAT.width) return `"${t}" does not fit`;
      return null;
    },
  },

  // A row of `den` blocks with `num` of them a different colour: the fraction
  // num/den, made of things you can pick up.
  fraction: {
    check: (s, ctx) => ctx.runs(ctx.mat).some((r) => r.length === s.den
      && r.every((n) => n === s.part || n === s.whole)
      && r.filter((n) => n === s.part).length === s.num),
    solve: (s, mat) => {
      const ops = [];
      for (let i = 0; i < s.den; i++) ops.push(place(mat.x0 + i, mat.y0, mat.z0, i < s.num ? s.part : s.whole));
      return ops;
    },
    needs: (s) => add(add({}, s.part, s.num), s.whole, s.den - s.num),
    validate: (s) => (s.num <= s.den && s.den <= MAT.width ? null : `${s.num}/${s.den} does not fit a row`),
  },

  // The same thing on both sides of the plank line, at the same distance from
  // it: symmetry, reflection, and the mirror half of a transformation.
  mirror: {
    check: (s, ctx) => {
      const m = ctx.mat;
      let pairs = 0;
      for (let x = m.div + 1; x <= m.x1; x++) {
        const other = m.div - (x - m.div);
        if (other < m.x0) continue;
        for (let y = m.y0; y <= m.y1; y++) {
          for (let z = m.z0; z <= m.z1; z++) {
            const a = ctx.nameAt(x, y, z), b = ctx.nameAt(other, y, z);
            if (a !== b) return false;              // one side has what the other lacks
            if (a !== 'air') pairs++;
          }
        }
      }
      return pairs >= s.pairs;                      // and it is a build, not an empty mat
    },
    solve: (s, mat) => {
      const ops = [];
      let done = 0;
      for (let z = mat.z0; z <= mat.z1 && done < s.pairs; z++) {
        for (let i = 1; i <= MAT.half && done < s.pairs; i++, done++) {
          ops.push(place(mat.div + i, mat.y0, z, s.block));
          ops.push(place(mat.div - i, mat.y0, z, s.block));
        }
      }
      return ops;
    },
    needs: (s) => add({}, s.block, s.pairs * 2),
    validate: (s) => (s.pairs >= 1 && s.pairs <= MAT.half * MAT.rows ? null : 'mirror does not fit'),
  },

  // A row of towers of given heights: a bar graph, a line plot, a growing
  // pattern, a table of values for a function.
  stack: {
    check: (s, ctx) => sameMultiset(columns(ctx, ctx.mat).map((c) => c.h), s.heights),
    solve: (s, mat) => {
      const ops = [];
      s.heights.forEach((h, i) => {
        for (let y = 0; y < h; y++) ops.push(place(mat.x0 + i, mat.y0 + y, mat.z0, s.block));
      });
      return ops;
    },
    needs: (s) => add({}, s.block, s.heights.reduce((a, b) => a + b, 0)),
    validate: (s) => (s.heights.length <= MAT.width && s.heights.every((h) => h >= 1 && h <= MAT.height)
      ? null : 'those bars do not fit the mat'),
  },

  // A solid cuboid: volume, and a cube for a power of three.
  box: {
    check: (s, ctx) => {
      const m = ctx.mat;
      if (ctx.countPlaced(s.block, m) !== s.w * s.d * s.h) return false;
      for (let ox = m.x0; ox <= m.x1 - s.w + 1; ox++) {
        for (let oz = m.z0; oz <= m.z1 - s.d + 1; oz++) {
          let full = true;
          for (let dx = 0; dx < s.w && full; dx++) {
            for (let dy = 0; dy < s.h && full; dy++) {
              for (let dz = 0; dz < s.d; dz++) {
                if (ctx.nameAt(ox + dx, m.y0 + dy, oz + dz) !== s.block) { full = false; break; }
              }
            }
          }
          if (full) return true;
        }
      }
      return false;
    },
    solve: (s, mat) => {
      const ops = [];
      for (let dy = 0; dy < s.h; dy++) {
        for (let dz = 0; dz < s.d; dz++) {
          for (let dx = 0; dx < s.w; dx++) ops.push(place(mat.x0 + dx, mat.y0 + dy, mat.z0 + dz, s.block));
        }
      }
      return ops;
    },
    needs: (s) => add({}, s.block, s.w * s.d * s.h),
    validate: (s) => (s.w <= MAT.width && s.d <= MAT.rows && s.h <= MAT.height && s.w * s.d * s.h >= 1
      ? null : `a ${s.w}x${s.d}x${s.h} box does not fit`),
  },

  // The outline of a rectangle with nothing inside it: perimeter, fences,
  // and the difference between going round a shape and covering it.
  frame: {
    check: (s, ctx) => {
      const m = ctx.mat;
      const per = 2 * s.w + 2 * s.d - 4;
      if (ctx.countPlaced(s.block, m) !== per) return false;
      for (let ox = m.x0; ox <= m.x1 - s.w + 1; ox++) {
        for (let oz = m.z0; oz <= m.z1 - s.d + 1; oz++) {
          let ok = true;
          for (let dx = 0; dx < s.w && ok; dx++) {
            for (let dz = 0; dz < s.d; dz++) {
              const edge = dx === 0 || dz === 0 || dx === s.w - 1 || dz === s.d - 1;
              const name = ctx.nameAt(ox + dx, m.y0, oz + dz);
              if (edge ? name !== s.block : name !== 'air') { ok = false; break; }
            }
          }
          if (ok) return true;
        }
      }
      return false;
    },
    solve: (s, mat) => {
      const ops = [];
      for (let dx = 0; dx < s.w; dx++) {
        for (let dz = 0; dz < s.d; dz++) {
          if (dx === 0 || dz === 0 || dx === s.w - 1 || dz === s.d - 1) {
            ops.push(place(mat.x0 + dx, mat.y0, mat.z0 + dz, s.block));
          }
        }
      }
      return ops;
    },
    needs: (s) => add({}, s.block, 2 * s.w + 2 * s.d - 4),
    validate: (s) => (s.w >= 2 && s.d >= 2 && s.w <= MAT.width && s.d <= MAT.rows
      ? null : `a ${s.w}x${s.d} frame does not fit`),
  },

  // A whole number sentence, written out in blocks: 3+2=5, or 7>4. Same unbroken
  // row as a spelled word — the digits and the signs are just more letters — and
  // the payoff for having numeral blocks at all: the child writes the arithmetic
  // down instead of only building the answer.
  sentence: {
    check: (s, ctx) => ctx.words().includes(s.text),
    solve: (s, mat) => letters(s.text).map((b, i) => place(mat.x0 + i, mat.y0, mat.z0, b)),
    needs: (s) => { const n = {}; for (const b of letters(s.text)) add(n, b, 1); return n; },
    validate: (s) => {
      if (!s.text || s.text.length > MAT.width) return `"${s.text}" does not fit a row`;
      for (const ch of s.text) if (!GLYPH_BLOCK[ch]) return `there is no block for "${ch}"`;
      return null;
    },
  },

  // Go and FIND n of something and pick it up. The only activity here that is
  // not about the plot at all — it is about walking around a place and looking,
  // which is half of what a child is doing on a lesson path.
  //
  // Counted as a DELTA from what they were holding when the step began, never as
  // a total: the lesson kit hands out blocks by the dozen, so "do you have three
  // eggs" would already be true before the hunt started. What is being checked is
  // that three were found, and the only honest way to ask that is to remember.
  gather: {
    begin: (s, ctx) => { ctx.scratch.had = ctx.held(s.block); },
    check: (s, ctx) => {
      if (ctx.scratch.had == null) ctx.scratch.had = ctx.held(s.block);
      return ctx.held(s.block) - ctx.scratch.had >= s.n;
    },
    // The answer is out in the world, not in the pack — `give` is how a test
    // harness says "the child walked over and picked it up".
    solve: (s) => [{ op: 'give', block: s.block, n: s.n }],
    needs: () => ({}),              // nothing to hand out; that is the point
    validate: (s) => (s.n >= 1 && s.n <= 64 ? null : `cannot hunt for ${s.n}`),
  },

  // Named cells, exactly: coordinates, a right triangle's legs, a number line
  // with a marked point. The escape hatch for a shape the others cannot say.
  cells: {
    check: (s, ctx) => {
      const m = ctx.mat;
      if (ctx.countPlaced(s.block, m) !== s.at.length) return false;
      return s.at.every(([dx, dy, dz]) => ctx.nameAt(m.x0 + dx, m.y0 + (dy || 0), m.z0 + dz) === s.block);
    },
    solve: (s, mat) => s.at.map(([dx, dy, dz]) => place(mat.x0 + dx, mat.y0 + (dy || 0), mat.z0 + dz, s.block)),
    needs: (s) => add({}, s.block, s.at.length),
    validate: (s) => (s.at.every(([dx, dy, dz]) => dx >= 0 && dx < MAT.width && dz >= 0 && dz < MAT.rows
      && (dy || 0) >= 0 && (dy || 0) < MAT.height) ? null : 'a cell falls off the mat'),
  },
};

export const SHAPE_KINDS = Object.keys(KINDS);

export function checkShape(shape, ctx) {
  const k = KINDS[shape?.kind];
  return k ? !!k.check(shape, ctx) : false;
}

// The blocks a step lays out for the child before they start (only `bond` has
// any). Returns ops, so the caller decides how a block gets written.
export function setupShape(shape, mat) {
  const k = KINDS[shape?.kind];
  return k?.setup ? k.setup(shape, mat) : [];
}

// Called once when a step starts, for shapes that have to remember how things
// were before the child touched anything (`gather` does). Safe to call for any
// shape; most have nothing to remember.
export function beginShape(shape, ctx) {
  const k = KINDS[shape?.kind];
  k?.begin?.(shape, ctx);
}

// The moves a child would make to get this right, in order. The test suite
// plays these through the real runner, which is the only reason ninety lessons
// can be trusted to be finishable.
export function solveShape(shape, mat) {
  const k = KINDS[shape?.kind];
  return k ? k.solve(shape, mat) : [];
}

// { blockName: howMany } — what has to be in the pack for the answer to be
// buildable. A step that asks for eight blues and hands out four is a locked
// door with the key on the other side.
export function shapeNeeds(shape) {
  const k = KINDS[shape?.kind];
  return k ? k.needs(shape) : {};
}

// null if the shape is buildable on a real mat, else why not. Every block it
// names must exist too: a typo'd block name is a step that can never pass, and
// `B.reed_wool` is undefined rather than an error.
export function validateShape(shape) {
  const k = KINDS[shape?.kind];
  if (!k) return `unknown shape kind "${shape?.kind}"`;
  for (const name of Object.keys(shapeNeeds(shape))) {
    if (B[name] === undefined) return `no such block "${name}"`;
  }
  return k.validate(shape);
}
