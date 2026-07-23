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
  };
  const put = (x, y, z, name) => { placed.set(`${x},${y},${z}`, B[name]); emit('blockPlaced', { x, y, z, block: name }); };
  const clear = (x, y, z) => { placed.delete(`${x},${y},${z}`); emit('blockBroken', { x, y, z, block: 'air' }); };
  const education = new EducationManager();
  education.setMode('education');
  const ui = { showLessonPrompt() {}, showLessonSuccess() {}, showLessonHint() {}, toast() {} };
  const game = { world, education, ui, renderer: { spawnParticles() {} } };
  const lessons = new LessonRunner(game);
  game.lessons = lessons;
  return { game, world, education, lessons, put, clear };
}

const MAT = () => MARKERS.learnMat;

test('nm_count: seven red blocks on the mat completes it and banks 10 minutes', () => {
  const { lessons, education, put } = scenario();
  const y = MAT().y0, x0 = MAT().x0, z0 = MAT().z0;
  lessons.startArea('numbers_meadow');
  assert.equal(lessons.current.numbers_meadow, 'nm_count', 'starts on the counting lesson');

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
  const y = MAT().y0, x0 = MAT().x0, z0 = MAT().z0;
  for (let i = 0; i < 7; i++) put(x0 + i, y, z0, 'blue_wool'); // seven — not yet
  assert.equal(lessons.current.numbers_meadow, 'nm_add');
  put(x0 + 7, y, z0, 'blue_wool'); // eighth
  assert.equal(lessons.current.numbers_meadow, 'nm_sort', 'advances to the sorting lesson');
  assert.ok(education.balanceSec > 0, 'banked play-time for adding');
});

test('nm_sort: a mis-sorted red blocks the goal until it is fixed', () => {
  const { lessons, education, put, clear } = scenario();
  lessons.setLesson('numbers_meadow', 'nm_sort');
  const m = MAT();
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
  assert.equal(lessons.current.numbers_meadow, undefined, 'series finished — no active lesson');
  assert.ok(education.balanceSec > 0, 'banked play-time for sorting');
});

test('gentle: an overshot mat (8) does not pass, and breaking one recovers', () => {
  const { lessons, education, put, clear } = scenario();
  const y = MAT().y0, x0 = MAT().x0, z0 = MAT().z0;
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
  // left/right sub-regions split at the divider column
  assert.equal(ctx.countPlaced('red_wool', mat.left), 1, 'the red sits left of the divider');
  assert.equal(ctx.countPlaced('red_wool', mat.right), 0);
});

test('runner persists {area → currentLessonId} across serialize/deserialize', () => {
  const a = scenario();
  a.lessons.setLesson('numbers_meadow', 'nm_add');
  const snap = JSON.parse(JSON.stringify(a.lessons.serialize()));
  const b = scenario();
  b.lessons.deserialize(snap);
  assert.equal(b.lessons.current.numbers_meadow, 'nm_add', 'resumes the saved lesson');
});
