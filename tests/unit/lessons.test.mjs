// Kids' Learning Mode — Phase 1 lesson engine.
// Proves the loop: prompt → child places blocks → runner reads the work mat via
// blockPlaced/blockBroken → check() passes → education.completeLesson banks
// minutes → the runner advances to the next lesson. Wrong builds never punish.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LessonRunner, LESSONS_DATA } from '../../js/game/lessons.js';
import { EducationManager } from '../../js/game/education.js';
import { buildStarterStructures } from '../../js/world/structures.js';
import { B } from '../../js/world/blocks.js';
import { clearAllListeners, emit } from '../../js/core/events.js';

// The real work-mat AABB authored in js/world/structures.js — keeps the test
// honest against the actual world geometry the child builds on.
const MARKERS = buildStarterStructures().markers;

// A minimal fake game: a Map-backed world + a real EducationManager, enough for
// the runner to read blocks and bank play-time. Firing put()/clear() mirrors the
// game emitting blockPlaced/blockBroken when the child edits the world.
function scenario() {
  clearAllListeners(); // isolate the bus before the runner subscribes
  const placed = new Map();
  const world = {
    markers: MARKERS,
    getBlock: (x, y, z) => placed.get(`${x},${y},${z}`) ?? B.air,
    // A lesson's setup() lays out its starting position through the world, so
    // the fake needs to accept writes or every such lesson silently starts blank.
    setBlock: (x, y, z, id) => { placed.set(`${x},${y},${z}`, id); },
  };
  const put = (x, y, z, name) => { placed.set(`${x},${y},${z}`, B[name]); emit('blockPlaced', { x, y, z, block: name }); };
  const clear = (x, y, z) => { placed.delete(`${x},${y},${z}`); emit('blockBroken', { x, y, z, block: 'air' }); };
  const education = new EducationManager();
  education.setMode('education');
  const ui = { showLessonPrompt() {}, showLessonSuccess() {}, showLessonHint() {}, toast() {} };
  // Just enough pack for payReward: a lesson now pays the CHARACTER as well as
  // the play-time bank, and a runner with nowhere to put the coins must not
  // throw — it simply pays nothing.
  const bag = new Map();
  const inventory = { add: (item, qty) => { bag.set(item, (bag.get(item) || 0) + qty); return true; },
    count: (item) => bag.get(item) || 0 };
  const game = { world, education, ui, inventory, renderer: { spawnParticles() {} } };
  const lessons = new LessonRunner(game);
  game.lessons = lessons;
  return { game, world, education, lessons, put, clear, inventory };
}

// Each lesson is performed in a room of its own out in the Schoolhouse
// (js/world/classroom.js), so the mat to build on is whichever room the runner
// has the child in — not the one shared yard it used to be.
const MAT = (lessons) => lessons.room(lessons.current.numbers_meadow).mat;

test('nm_count: seven red blocks on the mat completes it and banks 10 minutes', () => {
  const { lessons, education, put } = scenario();
  lessons.startArea('numbers_meadow');
  assert.equal(lessons.current.numbers_meadow, 'nm_count', 'starts on the counting lesson');
  const y = MAT(lessons).y0, x0 = MAT(lessons).x0, z0 = MAT(lessons).z0;

  for (let i = 0; i < 6; i++) put(x0 + i, y, z0, 'red_wool'); // six is not seven
  assert.equal(lessons.current.numbers_meadow, 'nm_count', 'six reds does not complete it');
  assert.equal(education.balanceSec, 0, 'no reward before the goal is met');

  put(x0 + 6, y, z0, 'red_wool'); // the seventh
  assert.equal(lessons.current.numbers_meadow, 'nm_add', 'advances to the addition lesson');
  assert.equal(Math.round(education.balanceSec / 60), 10, 'banked the lesson\'s 10 minutes');
  assert.ok(education.lessonsDone.nm_count?.some((a) => a.passed), 'recorded a passing attempt');
  assert.equal(education.locked, false, 'never locks the child out');
});

test('nm_add: 5 blue then 3 more (eight total) completes and advances to sorting', () => {
  const { lessons, education, put } = scenario();
  lessons.setLesson('numbers_meadow', 'nm_add');
  const y = MAT(lessons).y0, x0 = MAT(lessons).x0, z0 = MAT(lessons).z0;
  for (let i = 0; i < 7; i++) put(x0 + i, y, z0, 'blue_wool'); // seven — not yet
  assert.equal(lessons.current.numbers_meadow, 'nm_add');
  put(x0 + 7, y, z0, 'blue_wool'); // eighth
  assert.equal(lessons.current.numbers_meadow, 'nm_sort', 'advances to the sorting lesson');
  assert.ok(education.balanceSec > 0, 'banked play-time for adding');
});

test('nm_sort: a mis-sorted red blocks the goal until it is fixed', () => {
  const { lessons, education, put, clear } = scenario();
  lessons.setLesson('numbers_meadow', 'nm_sort');
  const m = MAT(lessons);
  const leftX = m.x0, rightX = m.x1; // 196 (left of divider), 204 (right)

  // The mat is mis-sorted from the start: a stray red sits on the RIGHT the whole
  // time, so the goal is never met until it's removed. (The runner re-checks on
  // every block event, so authoring the mistake up-front is what keeps the mat
  // out of a fully-correct state — otherwise it would complete the instant the
  // last correct block lands, before any mistake could be added.)
  put(m.div + 1, m.y0, m.z0, 'red_wool');     // stray red on the wrong side
  put(leftX, m.y0, m.z0, 'red_wool');
  put(leftX + 1, m.y0, m.z0, 'red_wool');     // two reds on the left
  put(rightX, m.y0, m.z0, 'yellow_wool');
  put(rightX - 1, m.y0, m.z0, 'yellow_wool'); // two yellows on the right
  assert.equal(lessons.current.numbers_meadow, 'nm_sort', 'a mis-sorted red keeps it going');
  assert.equal(education.locked, false, 'wrong placement never locks/penalises');

  clear(m.div + 1, m.y0, m.z0); // fix the mistake — breaking re-checks
  assert.equal(lessons.current.numbers_meadow, 'nm_take', 'sorting done — on to taking away');
  assert.ok(education.balanceSec > 0, 'banked play-time for sorting');
});

test('gentle: an overshot mat (8) does not pass, and breaking one recovers', () => {
  const { lessons, education, put, clear } = scenario();
  const y = MAT(lessons).y0, x0 = MAT(lessons).x0, z0 = MAT(lessons).z0;
  // The child piled on eight reds before the counting lesson is watching (e.g. a
  // resumed save): the runner ignores placements while no lesson is active, so
  // the mat starts overshot at eight rather than latching at seven on the way up.
  for (let i = 0; i < 8; i++) put(x0 + i, y, z0, 'red_wool');
  lessons.startArea('numbers_meadow');
  assert.equal(lessons.current.numbers_meadow, 'nm_count', 'eight is not seven — no pass');
  assert.equal(education.locked, false);
  clear(x0 + 7, y, z0); // break one back down to seven — breaking re-checks
  assert.equal(lessons.current.numbers_meadow, 'nm_add', 'correcting to seven completes it');
});

test('countPlaced counts only matching blocks inside the given region', () => {
  const { lessons, put } = scenario();
  const mat = lessons.matFor('numbers_meadow');
  const ctx = lessons.makeCtx(LESSONS_DATA[0]);
  const y = mat.y0;
  put(mat.x0, y, mat.z0, 'red_wool');
  put(mat.x0 + 1, y, mat.z0, 'blue_wool');
  put(mat.x1 + 5, y, mat.z0, 'red_wool'); // outside the mat AABB
  assert.equal(ctx.countPlaced('red_wool', mat), 1, 'ignores the red outside the region');
  assert.equal(ctx.countPlaced('blue_wool', mat), 1);
  // Left/right sub-regions split at the divider column. Halves are labelled from
  // the player's viewpoint (they face +Z toward the mat, so their LEFT is +X):
  // the red at mat.x0 (the low-X / -X end) is therefore the player's RIGHT.
  assert.equal(ctx.countPlaced('red_wool', mat.right), 1, 'the low-X red is the player’s right of the divider');
  assert.equal(ctx.countPlaced('red_wool', mat.left), 0);
});

test('nm_sort completes for correctly sorted colours from the player’s viewpoint', () => {
  const { lessons, education, put } = scenario();
  education.setMode('education', {});
  // setLesson FIRST: the mat is the one in this lesson's room, so asking for it
  // before the runner knows which lesson is running gets the fallback yard.
  lessons.setLesson('numbers_meadow', 'nm_sort');
  const mat = lessons.matFor('numbers_meadow');
  const y = mat.y0;
  // Player faces +Z: their LEFT is the +X half (mat.left), RIGHT is -X (mat.right).
  // Put reds on the +X (left) half and yellows on the -X (right) half.
  for (let x = mat.left.x0; x <= mat.left.x0 + 2; x++) put(x, y, mat.z0, 'red_wool');
  for (let x = mat.right.x0; x <= mat.right.x0 + 2; x++) put(x, y, mat.z0, 'yellow_wool');
  lessons.onWatch('blockPlaced');
  assert.ok(lessons.isPassed('nm_sort'), 'reds-left / yellows-right (player view) completes the sort');
});

test('nm_sort also accepts the mirror arrangement (sorting is what matters)', () => {
  const { lessons, education, put } = scenario();
  education.setMode('education', {});
  // setLesson FIRST: the mat is the one in this lesson's room, so asking for it
  // before the runner knows which lesson is running gets the fallback yard.
  lessons.setLesson('numbers_meadow', 'nm_sort');
  const mat = lessons.matFor('numbers_meadow');
  const y = mat.y0;
  // Reversed sides — still fully separated, so a child who faced the other way
  // and sorted correctly is not punished.
  for (let x = mat.right.x0; x <= mat.right.x0 + 2; x++) put(x, y, mat.z0, 'red_wool');
  for (let x = mat.left.x0; x <= mat.left.x0 + 2; x++) put(x, y, mat.z0, 'yellow_wool');
  lessons.onWatch('blockPlaced');
  assert.ok(lessons.isPassed('nm_sort'), 'mirror arrangement (still sorted) also completes');
});

test('nm_sort rejects a mixed (unsorted) mat', () => {
  const { lessons, education, put } = scenario();
  education.setMode('education', {});
  // setLesson FIRST: the mat is the one in this lesson's room, so asking for it
  // before the runner knows which lesson is running gets the fallback yard.
  lessons.setLesson('numbers_meadow', 'nm_sort');
  const mat = lessons.matFor('numbers_meadow');
  const y = mat.y0;
  // Reds straddle BOTH halves — not sorted, must not pass.
  put(mat.left.x0, y, mat.z0, 'red_wool');
  put(mat.left.x0 + 1, y, mat.z0, 'red_wool');
  put(mat.right.x0, y, mat.z0, 'red_wool');
  put(mat.right.x0 + 1, y, mat.z0, 'yellow_wool');
  put(mat.right.x0 + 2, y, mat.z0, 'yellow_wool');
  lessons.onWatch('blockPlaced');
  assert.equal(lessons.isPassed('nm_sort'), false, 'reds on both sides is not sorted');
});

test('runner persists {area → currentLessonId} across serialize/deserialize', () => {
  const a = scenario();
  a.lessons.setLesson('numbers_meadow', 'nm_add');
  const snap = JSON.parse(JSON.stringify(a.lessons.serialize()));
  const b = scenario();
  b.lessons.deserialize(snap);
  assert.equal(b.lessons.current.numbers_meadow, 'nm_add', 'resumes the saved lesson');
});

// ---- every lesson can actually be finished -----------------------------------
// The one thing a lesson MUST be is completable. A check with a typo in a block
// name, a shape that does not fit the mat, or a condition no arrangement can
// satisfy looks perfectly fine in review and leaves a six-year-old stuck in a
// sealed room with no way to win. Each case below is the solution a child would
// build, played through the real runner.
const solve = {
  nm_count: (m, put) => { for (let i = 0; i < 7; i++) put(m.x0 + i, m.y0, m.z0, 'red_wool'); },
  nm_add: (m, put) => { for (let i = 0; i < 8; i++) put(m.x0 + i, m.y0, m.z0, 'blue_wool'); },
  nm_sort: (m, put) => {
    for (let i = 0; i < 3; i++) put(m.left.x0 + i, m.y0, m.z0, 'red_wool');
    for (let i = 0; i < 3; i++) put(m.right.x0 + i, m.y0, m.z0, 'yellow_wool');
  },
  nm_take: (m, put, clear) => {
    for (let i = 0; i < 9; i++) put(m.x0 + (i % 9), m.y0, m.z0 + Math.floor(i / 9), 'green_wool');
    for (let i = 5; i < 9; i++) clear(m.x0 + i, m.y0, m.z0);
  },
  // setup lays the 6 reds; the child adds 4 blues
  nm_maketen: (m, put) => { for (let i = 0; i < 4; i++) put(m.x0 + i, m.y0, m.z0 + 1, 'blue_wool'); },
  nm_taller: (m, put) => {
    for (let i = 0; i < 4; i++) put(m.left.x0, m.y0 + i, m.z0, 'red_wool');
    for (let i = 0; i < 2; i++) put(m.right.x0, m.y0 + i, m.z0, 'blue_wool');
  },
  nm_tower: (m, put) => { for (let i = 0; i < 5; i++) put(m.x0, m.y0 + i, m.z0, 'red_wool'); },
  nm_pattern: (m, put) => {
    for (let i = 0; i < 6; i++) put(m.x0 + i, m.y0, m.z0, i % 2 ? 'blue_wool' : 'red_wool');
  },
  nm_square: (m, put) => {
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) put(m.x0 + dx, m.y0, m.z0 + dz, 'yellow_wool');
  },
  nm_fives: (m, put) => {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) put(m.x0 + i, m.y0, m.z0 + r, 'red_wool');
  },
  nm_tens: (m, put) => {
    for (let i = 0; i < 10; i++) put(m.x0 + i, m.y0, m.z0, 'red_wool');       // one ten
    for (let i = 0; i < 3; i++) put(m.x0 + i, m.y0, m.z0 + 1, 'red_wool');    // and three ones
  },
  nm_mirror: (m, put) => {
    for (let i = 1; i <= 2; i++) {
      put(m.div + i, m.y0, m.z0, 'red_wool');
      put(m.div - i, m.y0, m.z0, 'red_wool');
      put(m.div + i, m.y0, m.z0 + 1, 'blue_wool');
      put(m.div - i, m.y0, m.z0 + 1, 'blue_wool');
    }
  },
};

test('every lesson can be finished by building its answer', () => {
  for (const lesson of LESSONS_DATA) {
    const { lessons, put, clear } = scenario();
    lessons.setLesson(lesson.area, lesson.id);
    const m = lessons.matFor(lesson.area);
    const build = solve[lesson.id];
    assert.ok(build, `${lesson.id} has no worked solution in this test`);
    build(m, put, clear);
    lessons.onWatch('blockPlaced');
    assert.ok(lessons.isPassed(lesson.id), `${lesson.id} cannot be completed: "${lesson.prompt}"`);
  }
});

test('a lesson is not passed by an empty mat or a wrong answer', () => {
  // The mirror lesson is the one at real risk of this: "both sides match" is
  // trivially true of a mat with nothing on it.
  const { lessons } = scenario();
  lessons.setLesson('numbers_meadow', 'nm_mirror');
  lessons.onWatch('blockPlaced');
  assert.equal(lessons.isPassed('nm_mirror'), false, 'an empty mat is not symmetry');

  const s2 = scenario();
  s2.lessons.setLesson('numbers_meadow', 'nm_tower');
  const m = s2.lessons.matFor('numbers_meadow');
  for (let i = 0; i < 3; i++) s2.put(m.x0, m.y0 + i, m.z0, 'red_wool');
  s2.lessons.onWatch('blockPlaced');
  assert.equal(s2.lessons.isPassed('nm_tower'), false, 'three is not five');
});
