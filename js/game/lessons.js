// Kids' Learning Mode — Phase 1 lesson engine.
//
// A tiny, data-driven runner that rides the dormant education system
// (js/game/education.js). A lesson is a plain object the child performs by
// PLACING blocks in the world; the runner watches world events (blockPlaced /
// blockBroken), re-reads the work mat, and when the build matches the goal it
// celebrates and banks play-time minutes via education.completeLesson().
//
// Nothing here is punitive: a wrong build simply doesn't complete — hints are
// shown on demand, and the child keeps trying.
//
// EACH LESSON HAS ITS OWN ROOM, and starting one puts the child inside it (see
// js/world/classroom.js). A lesson performed in the overworld is performed in
// the world they play in — the blocks placed for a counting exercise are real
// edits to their real save, so the mat starts dirty and anything can wander up
// to it. Leaving a lesson, or finishing the series, puts them back on the exact
// block they were standing on when it began.
//
// FINISHING A LESSON PAYS THE CHARACTER, not the world: banked play minutes as
// before, plus coins and the materials the NEXT lesson asks for. Both live on
// the character side of the save (js/game/characters.js CHARACTER_KEYS lists
// `education`, `lessons` and `inventory`), so a child who starts a new world
// keeps every minute and every coin they earned.
//
// A lesson:
//   { id, area, subject, standard, minutes, guide,
//     prompt, hint, success,
//     watch: ['blockPlaced', ...],   // world events that re-run check()
//     setup?(ctx),                    // optional one-time prep
//     check(ctx) -> bool,             // true when the goal is met
//     reward: { coins, items: [[id, qty]] },   // paid to the CHARACTER on pass
//     next }                          // id of the lesson that follows (or null)
//
// ctx helpers: { game, world, mat, countPlaced(blockName, region), lesson }.
import { on, emit } from '../core/events.js';
import { registerLesson, LESSONS } from './education.js';
import { B, BLOCKS } from '../world/blocks.js';
import { ROOM_COUNT, classroomFor } from '../world/classroom.js';

// ---- Numbers Meadow ---------------------------------------------------------
// Twelve lessons pitched at a six-year-old (US K-1 / UK Year 1), in the order a
// classroom takes them: count, add, take away, bonds to ten, then compare and
// measure, then pattern and shape, then the first steps toward multiplication
// and place value.
//
// The ceiling is deliberate. Every one of these is done by PLACING BLOCKS, and
// what a lesson may ask is bounded by what makeCtx can see — a tally, a tower's
// height, an unbroken run, a row of colours, and what happened earlier in the
// attempt. Anything a check cannot express is not a lesson yet, however good it
// would be on paper.
export const LESSONS_DATA = [
  {
    id: 'nm_count', area: 'numbers_meadow', subject: 'math', standard: 'K.CC.B.5',
    minutes: 10, guide: 'pip',
    prompt: 'Place 7 red blocks on the mat — count out loud as you go!',
    hint: 'Grab red wool from your bag and place them on the mat one at a time: "one… two… three…" all the way to 7.',
    success: 'Seven! You counted every single one. Fantastic!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => ctx.countPlaced('red_wool', ctx.mat) === 7,
    reward: { coins: 15, items: [['blue_wool', 12]] },
    next: 'nm_add',
  },
  {
    id: 'nm_add', area: 'numbers_meadow', subject: 'math', standard: '1.OA.A.1',
    minutes: 10, guide: 'pip',
    prompt: 'Place 5 blue blocks… now 3 MORE blue blocks. How many all together?',
    hint: 'Make a row of 5 blue blocks. Then add 3 more next to them. Count them all — 5 and 3!',
    success: '5 and 3 make 8! You added them all together!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => ctx.countPlaced('blue_wool', ctx.mat) === 8,
    reward: { coins: 20, items: [['red_wool', 8], ['yellow_wool', 8]] },
    next: 'nm_sort',
  },
  {
    id: 'nm_sort', area: 'numbers_meadow', subject: 'math', standard: 'K.MD.B.3',
    minutes: 10, guide: 'pip',
    prompt: 'Sorting time! Put every RED block on the LEFT mat and every YELLOW block on the RIGHT mat.',
    hint: 'Reds go on the left side of the wood line, yellows on the right. Keep each colour on its own side!',
    success: 'Perfect sorting — reds on the left, yellows on the right. You did it!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => {
      const rl = ctx.countPlaced('red_wool', ctx.mat.left);
      const rr = ctx.countPlaced('red_wool', ctx.mat.right);
      const yl = ctx.countPlaced('yellow_wool', ctx.mat.left);
      const yr = ctx.countPlaced('yellow_wool', ctx.mat.right);
      // Sorted = each colour entirely on its OWN side, the two colours on
      // OPPOSITE sides, at least two of each. Either arrangement counts, so a
      // child who truly separates the colours succeeds no matter which way they
      // happen to face the mat (reds-left/yellows-right OR the mirror of it).
      return (rl >= 2 && yr >= 2 && rr === 0 && yl === 0)
          || (rr >= 2 && yl >= 2 && rl === 0 && yr === 0);
    },
    reward: { coins: 40, items: [['green_wool', 12]] },
    next: 'nm_take',
  },
  {
    id: 'nm_take', area: 'numbers_meadow', subject: 'math', standard: '1.OA.A.1',
    minutes: 10, guide: 'pip',
    prompt: 'Place 9 green blocks. Now BREAK 4 of them. How many are left?',
    hint: 'Build all 9 first and count them. Then break them one at a time — 4 of them — and count what is still standing.',
    success: '9 take away 4 leaves 5. That is subtraction!',
    watch: ['blockPlaced', 'blockBroken'],
    // The peak is why this is subtraction and not "place 5". A check only ever
    // sees the mat as it is NOW, so without remembering that nine were once
    // there, a child could pass by placing five and never taking anything away.
    check: (ctx) => {
      const n = ctx.countPlaced('green_wool', ctx.mat);
      ctx.scratch.peak = Math.max(ctx.scratch.peak || 0, n);
      return ctx.scratch.peak >= 9 && n === 5;
    },
    reward: { coins: 20, items: [['red_wool', 10], ['blue_wool', 10]] },
    next: 'nm_maketen',
  },
  {
    id: 'nm_maketen', area: 'numbers_meadow', subject: 'math', standard: 'K.OA.A.4',
    minutes: 10, guide: 'pip',
    prompt: 'There are 6 red blocks on the mat. Add BLUE blocks until there are 10 altogether.',
    hint: 'Count the reds: six. Now count on — seven, eight, nine, ten — putting a blue down for each one. How many blues did that take?',
    success: '6 and 4 make 10! That is a number bond to ten.',
    watch: ['blockPlaced', 'blockBroken'],
    setup: (ctx) => {
      // The six are laid out FOR the child: the exercise is completing a bond,
      // not building both halves of it.
      const m = ctx.mat;
      if (!ctx.world) return;
      for (let i = 0; i < 6; i++) ctx.world.setBlock(m.x0 + i, m.y0, m.z0, B.red_wool, true);
    },
    check: (ctx) => ctx.countPlaced('red_wool', ctx.mat) === 6 && ctx.countPlaced('blue_wool', ctx.mat) === 4,
    reward: { coins: 25, items: [['green_wool', 12]] },
    next: 'nm_taller',
  },
  {
    id: 'nm_taller', area: 'numbers_meadow', subject: 'math', standard: 'K.MD.A.2',
    minutes: 10, guide: 'pip',
    prompt: 'Build a tower on the LEFT mat and a SHORTER one on the RIGHT. Make the left one taller!',
    hint: 'Stack blocks on top of each other on the left side of the wood line. Then make a smaller stack on the right. Taller means more blocks!',
    success: 'The left tower is taller and the right one is shorter. You compared them!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => {
      const l = ctx.tallest(ctx.mat.left), r = ctx.tallest(ctx.mat.right);
      return l >= 3 && r >= 1 && l > r;
    },
    reward: { coins: 25, items: [['yellow_wool', 12]] },
    next: 'nm_tower',
  },
  {
    id: 'nm_tower', area: 'numbers_meadow', subject: 'math', standard: '1.MD.A.2',
    minutes: 10, guide: 'pip',
    prompt: 'Build ONE tower exactly 5 blocks tall — no taller, no shorter.',
    hint: 'Put a block down, then another one right on top of it. Count as you climb: one, two, three, four, five. Then stop!',
    success: 'Exactly five blocks tall. You measured it!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => ctx.tallest(ctx.mat) === 5,
    reward: { coins: 25, items: [['orange_wool', 12]] },
    next: 'nm_pattern',
  },
  {
    id: 'nm_pattern', area: 'numbers_meadow', subject: 'math', standard: '1.OA.C.5',
    minutes: 10, guide: 'pip',
    prompt: 'Make a pattern in a row: red, blue, red, blue, red, blue.',
    hint: 'Start with red. Then blue right next to it. Then red again. Keep going — the colours take turns!',
    success: 'Red, blue, red, blue — a repeating pattern. You can see what comes next now!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => ctx.runs(ctx.mat).some((run) => {
      if (run.length < 6) return false;
      const [a, b] = run;
      if (a === b || (a !== 'red_wool' && a !== 'blue_wool') || (b !== 'red_wool' && b !== 'blue_wool')) return false;
      return run.every((name, i) => name === (i % 2 === 0 ? a : b));
    }),
    reward: { coins: 30, items: [['purple_wool', 12]] },
    next: 'nm_square',
  },
  {
    id: 'nm_square', area: 'numbers_meadow', subject: 'math', standard: 'K.G.B.5',
    minutes: 10, guide: 'pip',
    prompt: 'Build a SQUARE out of yellow blocks — 3 across and 3 back.',
    hint: 'Make a row of 3. Then another row of 3 behind it. Then one more. A square has the same number of blocks every way you count it.',
    success: 'Three by three — a perfect square, and 9 blocks altogether!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => {
      const m = ctx.mat;
      if (ctx.countPlaced('yellow_wool', m) !== 9) return false;
      // A 3x3 block anywhere on the mat, not one particular corner of it.
      for (let x = m.x0; x <= m.x1 - 2; x++) {
        for (let z = m.z0; z <= m.z1 - 2; z++) {
          let full = true;
          for (let dx = 0; dx < 3 && full; dx++) {
            for (let dz = 0; dz < 3; dz++) {
              if (ctx.nameAt(x + dx, m.y0, z + dz) !== 'yellow_wool') { full = false; break; }
            }
          }
          if (full) return true;
        }
      }
      return false;
    },
    reward: { coins: 30, items: [['light_blue_wool', 12]] },
    next: 'nm_fives',
  },
  {
    id: 'nm_fives', area: 'numbers_meadow', subject: 'math', standard: '2.OA.C.4',
    minutes: 12, guide: 'pip',
    prompt: 'Make 3 rows with 5 blocks in each row. Count by fives: 5, 10, 15!',
    hint: 'A row of 5. Then another row of 5 behind it. Then one more. Do not count them one at a time — count 5, 10, 15.',
    success: '3 rows of 5 is 15. That is the beginning of times tables!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => {
      const rows = ctx.runs(ctx.mat);
      return rows.length === 3 && rows.every((r) => r.length === 5);
    },
    reward: { coins: 35, items: [['pink_wool', 16]] },
    next: 'nm_tens',
  },
  {
    id: 'nm_tens', area: 'numbers_meadow', subject: 'math', standard: '1.NBT.B.2',
    minutes: 12, guide: 'pip',
    prompt: 'Make one row of exactly 10, then a separate little row of 3. That is 13!',
    hint: 'Ten in a line, all touching. Then leave a gap and put 3 more. Thirteen is one ten and three ones.',
    success: 'One ten and three ones — thirteen! That is how big numbers are built.',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => {
      const rows = ctx.runs(ctx.mat).map((r) => r.length).sort((a, b) => b - a);
      return rows.length === 2 && rows[0] === 10 && rows[1] === 3;
    },
    reward: { coins: 40, items: [['green_wool', 16]] },
    next: 'nm_mirror',
  },
  {
    id: 'nm_mirror', area: 'numbers_meadow', subject: 'math', standard: '1.G.A.1',
    minutes: 12, guide: 'pip',
    prompt: 'Build anything you like on the LEFT mat. Then make the RIGHT mat match it, like a mirror.',
    hint: 'The wood line down the middle is the mirror. However far a block is from the line on one side, put one just as far on the other side.',
    success: 'Both sides match across the line — that is symmetry!',
    watch: ['blockPlaced', 'blockBroken'],
    check: (ctx) => {
      const m = ctx.mat;
      let pairs = 0;
      for (let x = m.div + 1; x <= m.x1; x++) {
        const mirrored = m.div - (x - m.div);
        if (mirrored < m.x0) continue;
        for (let y = m.y0; y <= m.y1; y++) {
          for (let z = m.z0; z <= m.z1; z++) {
            const a = ctx.nameAt(x, y, z), b = ctx.nameAt(mirrored, y, z);
            if (a !== b) return false;      // one side has something the other lacks
            if (a !== 'air') pairs++;
          }
        }
      }
      return pairs >= 4;                    // and it is a build, not an empty mat
    },
    reward: { coins: 50, items: [['hearth_loaf', 4], ['travel_biscuit', 4]] },
    next: null,
  },
];

// Make each lesson a first-class education lesson so completing it banks the
// lesson's own minutes (not the generic default). Guarded so re-importing the
// module in tests never double-registers.
for (const l of LESSONS_DATA) {
  if (!LESSONS[l.id]) {
    registerLesson({
      id: l.id, subject: l.subject, title: l.prompt, minutes: l.minutes,
      minScore: 0, repeatable: true,
      payload: { area: l.area, standard: l.standard, guide: l.guide },
    });
  }
}

export class LessonRunner {
  constructor(game) {
    this.game = game;
    this.current = {};                 // area → active lessonId
    this.byId = new Map();
    this.byArea = new Map();           // area → [lessons in authored order]
    for (const l of LESSONS_DATA) {
      this.byId.set(l.id, l);
      if (!this.byArea.has(l.area)) this.byArea.set(l.area, []);
      this.byArea.get(l.area).push(l);
    }
    this.unsubs = [];
    this.listen();
  }

  listen() {
    // Pip's dialogue emits this to hand the child a lesson series.
    this.unsubs.push(on('startLesson', ({ area }) => this.startArea(area)));
    // subscribe once to every event any lesson watches
    const events = new Set();
    for (const l of LESSONS_DATA) for (const ev of l.watch || []) events.add(ev);
    for (const ev of events) this.unsubs.push(on(ev, () => this.onWatch(ev)));
  }

  dispose() { for (const u of this.unsubs) u?.(); this.unsubs = []; }

  // ---- lesson lifecycle --------------------------------------------------
  activeLessonFor(area) {
    const id = this.current[area];
    return id ? this.byId.get(id) : null;
  }

  isPassed(id) {
    const attempts = this.game.education?.lessonsDone?.[id];
    return !!attempts && attempts.some((a) => a.passed);
  }

  // Begin (or re-announce) an area's lesson series, resuming at the first
  // not-yet-passed lesson so a returning child isn't sent back to the start.
  startArea(area) {
    if (this.current[area]) { this.announce(this.activeLessonFor(area)); return; }
    const list = this.byArea.get(area) || [];
    if (!list.length) return;
    const next = list.find((l) => !this.isPassed(l.id)) || list[0];
    this.setLesson(area, next.id);
  }

  // Which of the Schoolhouse's rooms this lesson owns. Position in the authored
  // list, so it is stable across saves and needs no id table in the world layer.
  roomIndex(id) {
    const i = LESSONS_DATA.findIndex((l) => l.id === id);
    return i < 0 ? 0 : i % ROOM_COUNT;
  }

  // Computed, not looked up in the world: the room has to be known BEFORE the
  // swap into the lesson world happens, and it is pure geometry either way.
  room(id) { return classroomFor(this.roomIndex(id)); }

  setLesson(area, id) {
    this.current[area] = id;
    const lesson = this.byId.get(id);
    if (lesson?.setup) { try { lesson.setup(this.makeCtx(lesson)); } catch (e) { console.error('[lesson] setup', e); } }
    // Into its own room. `lessonEnter` carries the arrival cell; main.js banks
    // where the child was standing the FIRST time (not on every advance within a
    // series, or three lessons in a row would overwrite the way home with the
    // previous classroom).
    const room = this.room(id);
    if (room) emit('lessonEnter', { area, id, room });
    emit('lessonStarted', { area, id, lesson });
    this.announce(lesson);
  }

  // The child asked to stop. Keep the lesson as their place in the series — a
  // lesson left half-done is resumed, never restarted — and send them home.
  leave(area) {
    if (!this.current[area]) return false;
    emit('lessonExit', { area, id: this.current[area] });
    this.announce(null);
    return true;
  }

  announce(lesson) {
    this.game.ui?.showLessonPrompt?.(lesson || null);
  }

  showHint(area) {
    const lesson = this.activeLessonFor(area);
    if (lesson) this.game.ui?.showLessonHint?.(lesson);
  }

  // A watched world event fired — re-check every area that has a lesson
  // waiting on that event. A failed check does nothing (gentle, no penalty).
  onWatch(ev) {
    for (const area of Object.keys(this.current)) {
      const lesson = this.activeLessonFor(area);
      if (!lesson || !(lesson.watch || []).includes(ev)) continue;
      let ok = false;
      try { ok = lesson.check(this.makeCtx(lesson)); }
      catch (e) { console.error('[lesson] check', lesson.id, e); }
      if (ok) this.complete(area, lesson);
    }
  }

  // Pay a lesson's reward into the pack. Separate from the education ledger on
  // purpose: minutes are the parent's currency and coins are the child's, and
  // only one of them should be spendable on anything.
  payReward(lesson) {
    const r = lesson.reward;
    const inv = this.game.inventory;
    if (!r || !inv) return null;
    const got = [];
    if (r.coins > 0 && inv.add('coin', r.coins)) got.push(['coin', r.coins]);
    for (const [item, qty] of r.items || []) if (inv.add(item, qty)) got.push([item, qty]);
    return got.length ? got : null;
  }

  complete(area, lesson) {
    // Bank the minutes through the education ledger, pay the character, then
    // celebrate + advance.
    const res = this.game.education?.completeLesson?.(lesson.id, { score: 1 });
    const paid = this.payReward(lesson);
    this.game.ui?.showLessonSuccess?.(lesson, { granted: res?.granted || 0, paid });
    emit('lessonSucceeded', { area, id: lesson.id, lesson, granted: res?.granted || 0, paid });
    if (lesson.next && this.byId.has(lesson.next)) {
      this.setLesson(area, lesson.next);   // straight into the next room
    } else {
      delete this.current[area];
      this.announce(null);                 // series finished — clear the prompt
      emit('lessonExit', { area, id: lesson.id, finished: true });
    }
  }

  // ---- context passed to setup()/check() ---------------------------------
  matFor(area) {
    // The mat is the one in THIS lesson's room. markers.learnMat — the old
    // shared yard at (200,200) — is still built and still readable, but no
    // lesson counts blocks there any more: two children's leftovers on one mat
    // is exactly the mess the rooms exist to end.
    const id = this.current[area];
    const m = (id && this.room(id)?.mat) || this.game.world?.markers?.learnMat;
    if (!m) return null;
    // `div` comes through too: the mirror lesson measures across it, and a
    // region that quietly dropped it made every distance from the centre NaN.
    const region = { x0: m.x0, x1: m.x1, z0: m.z0, z1: m.z1, y0: m.y0, y1: m.y1, div: m.div };
    // Sub-regions split by the divider column (for the sorting lesson). The
    // child stands south of the mat and faces +Z toward it, so their LEFT is the
    // +X half and their RIGHT is the -X half — label the halves to match the
    // player's viewpoint, not raw world-X, or "reds on the left" never registers.
    region.left = { ...region, x0: m.div + 1, x1: m.x1 };  // +X = player's left
    region.right = { ...region, x0: m.x0, x1: m.div - 1 }; // -X = player's right
    return region;
  }

  makeCtx(lesson) {
    const world = this.game.world;
    const mat = this.matFor(lesson.area);
    const nameAt = (x, y, z) => BLOCKS[world?.getBlock(x, y, z) ?? 0]?.name || 'air';

    // Count placed blocks of a given name inside a mat region.
    const countPlaced = (blockName, region) => {
      const id = B[blockName];
      if (id === undefined || !region || !world) return 0;
      let n = 0;
      for (let x = region.x0; x <= region.x1; x++) {
        for (let y = region.y0; y <= region.y1; y++) {
          for (let z = region.z0; z <= region.z1; z++) {
            if (world.getBlock(x, y, z) === id) n++;
          }
        }
      }
      return n;
    };

    // Everything in a region, as {x, y, z, name}. The general escape hatch: a
    // lesson that needs a shape rather than a tally reads this.
    const blocksIn = (region) => {
      const out = [];
      if (!region || !world) return out;
      for (let x = region.x0; x <= region.x1; x++) {
        for (let y = region.y0; y <= region.y1; y++) {
          for (let z = region.z0; z <= region.z1; z++) {
            const n = nameAt(x, y, z);
            if (n !== 'air') out.push({ x, y, z, name: n });
          }
        }
      }
      return out;
    };

    // How many blocks are stacked on one square of the mat, counting up from the
    // mat surface and STOPPING at the first gap — a tower with a hole in it is
    // two towers, and a child counting theirs out loud will say the same.
    const stackAt = (x, z, region = mat) => {
      if (!region || !world) return 0;
      let n = 0;
      for (let y = region.y0; y <= region.y1; y++) {
        if (nameAt(x, y, z) === 'air') break;
        n++;
      }
      return n;
    };

    // The tallest tower anywhere in a region.
    const tallest = (region = mat) => {
      if (!region) return 0;
      let best = 0;
      for (let x = region.x0; x <= region.x1; x++) {
        for (let z = region.z0; z <= region.z1; z++) {
          const h = stackAt(x, z, region);
          if (h > best) best = h;
        }
      }
      return best;
    };

    // One row of the mat surface, left to right, as block names ('air' for gaps).
    const rowAt = (z, region = mat) => {
      const out = [];
      if (!region) return out;
      for (let x = region.x0; x <= region.x1; x++) out.push(nameAt(x, region.y0, z));
      return out;
    };

    // Every unbroken run of blocks on the mat surface, as arrays of names. This
    // is what "make a row of five" and "make a pattern" are actually asking
    // about — a run, not a count, because six blocks in two groups of three is
    // not a row of six.
    const runs = (region = mat) => {
      const out = [];
      if (!region) return out;
      for (let z = region.z0; z <= region.z1; z++) {
        let run = [];
        for (const name of rowAt(z, region)) {
          if (name === 'air') { if (run.length) out.push(run); run = []; }
          else run.push(name);
        }
        if (run.length) out.push(run);
      }
      return out;
    };

    // Per-lesson scratch that survives between checks. A check runs on every
    // block placed, so this is how a lesson can ask about something that
    // HAPPENED — "you made nine and then took four away" — rather than only
    // about how the mat looks right now.
    this._scratch ||= {};
    const scratch = (this._scratch[lesson.id] ||= {});

    return { game: this.game, world, mat, lesson, scratch,
      countPlaced, blocksIn, stackAt, tallest, rowAt, runs, nameAt };
  }

  // Re-show the prompt for any in-progress lesson (called after a save loads).
  resume() {
    for (const area of Object.keys(this.current)) this.announce(this.activeLessonFor(area));
  }

  // ---- persistence: {area → currentLessonId} -----------------------------
  serialize() { return { current: { ...this.current } }; }

  deserialize(d) {
    this.current = {};
    if (d?.current) for (const [area, id] of Object.entries(d.current)) {
      if (this.byId.has(id)) this.current[area] = id;
    }
  }
}
