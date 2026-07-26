// Kids' Learning Mode — the lesson engine.
// Proves the loop: story → prompt → child places blocks → runner reads the work
// mat via blockPlaced/blockBroken → the step's shape matches → next step → the
// last step banks minutes through education.completeLesson and pays the
// character. Wrong builds never punish.
//
// The load-bearing test is the last one: every step of all ninety lessons is
// SOLVED AUTOMATICALLY from its own declared shape and played through the real
// runner. A lesson that cannot be finished cannot reach a child.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LessonRunner, LESSONS_DATA, lessonNeeds } from '../../js/game/lessons.js';
import { GRADES } from '../../js/game/curriculum/index.js';
import { solveShape, validateShape, shapeNeeds, SHAPE_KINDS } from '../../js/game/buildshapes.js';
import { EducationManager } from '../../js/game/education.js';
import { ITEMS } from '../../js/game/items.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
import { ROOM_COUNT } from '../../js/world/classroom.js';
import { clearAllListeners, emit } from '../../js/core/events.js';

// A minimal fake game: a Map-backed world + a real EducationManager, enough for
// the runner to read blocks and bank play-time. Firing put()/clear() mirrors the
// game emitting blockPlaced/blockBroken when the child edits the world.
function scenario() {
  clearAllListeners(); // isolate the bus before the runner subscribes
  const placed = new Map();
  const world = {
    markers: {},
    getBlock: (x, y, z) => placed.get(`${x},${y},${z}`) ?? B.air,
    // A step's setup lays out its starting position through the world, and the
    // runner wipes the mat between steps, so the fake must accept writes.
    setBlock: (x, y, z, id) => { if (id === B.air) placed.delete(`${x},${y},${z}`); else placed.set(`${x},${y},${z}`, id); },
  };
  const put = (x, y, z, name) => { placed.set(`${x},${y},${z}`, B[name]); emit('blockPlaced', { x, y, z, block: name }); };
  const clear = (x, y, z) => { placed.delete(`${x},${y},${z}`); emit('blockBroken', { x, y, z, block: 'air' }); };
  const education = new EducationManager();
  education.setMode('education');
  const ui = { showLessonPrompt() {}, showLessonSuccess() {}, showLessonHint() {}, showStepSuccess() {}, toast() {} };
  // Just enough pack for payReward: a lesson pays the CHARACTER as well as the
  // play-time bank, and a runner with nowhere to put the coins must not throw.
  const bag = new Map();
  const inventory = { add: (item, qty) => { bag.set(item, (bag.get(item) || 0) + qty); return true; },
    count: (item) => bag.get(item) || 0 };
  const game = { world, education, ui, inventory, renderer: { spawnParticles() {} } };
  const lessons = new LessonRunner(game);
  game.lessons = lessons;
  return { game, world, education, lessons, put, clear, inventory };
}

// Play a shape's own worked solution onto the mat, through the same events the
// game fires when a child places a block.
function build(ops, put, clear) {
  for (const op of ops) {
    if (op.op === 'break') clear(op.x, op.y, op.z);
    else put(op.x, op.y, op.z, op.block);
  }
}

const FIRST = LESSONS_DATA[0];

test('a lesson starts at step one and shows its story', () => {
  const { lessons } = scenario();
  lessons.startArea('grade_k');
  assert.equal(lessons.current.grade_k, FIRST.id, 'starts at the first lesson of the band');
  const v = lessons.view('grade_k');
  assert.equal(v.index, 0);
  assert.equal(v.total, FIRST.steps.length);
  assert.ok(v.story && v.story.length > 40, 'the story is told on the first step');
  assert.equal(lessons.view('grade_k').say, FIRST.steps[0].say);
});

test('finishing step one advances to step two without ending the lesson', () => {
  const { lessons, education, put, clear } = scenario();
  lessons.startArea('grade_k');
  const lesson = lessons.activeLessonFor('grade_k');
  build(solveShape(lesson.steps[0].build, lessons.matFor('grade_k')), put, clear);
  assert.equal(lessons.step.grade_k, 1, 'moved to the second step');
  assert.equal(lessons.current.grade_k, lesson.id, 'still the same lesson');
  assert.equal(education.balanceSec, 0, 'no minutes banked until the whole lesson is done');
});

const matBlocks = (world, m) => {
  let n = 0;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let y = m.y0; y <= m.y1; y++) {
      for (let z = m.z0; z <= m.z1; z++) if (world.getBlock(x, y, z) !== B.air) n++;
    }
  }
  return n;
};

test('the mat is wiped between steps, so step two starts on a clean page', () => {
  const { lessons, world, put, clear } = scenario();
  lessons.startArea('grade_k');
  const lesson = lessons.activeLessonFor('grade_k');
  const m = lessons.matFor('grade_k');
  build(solveShape(lesson.steps[0].build, m), put, clear);
  assert.equal(matBlocks(world, m), 0, 'step one\'s three eggs were swept away before step two');
});

test('a step that lays blocks out for the child does so after the wipe', () => {
  // The lantern lesson's steps are all `bond`: some are already lit, and the
  // child adds the rest. If setup ran before the wipe there would be nothing
  // there to count on from.
  const { lessons, world, put, clear } = scenario();
  lessons.setLesson('grade_k', 'k_ten');
  const m = lessons.matFor('grade_k');
  assert.equal(matBlocks(world, m), 6, 'six lanterns are lit for you on step one');
  build(solveShape(lessons.activeStep('grade_k').build, m), put, clear);
  assert.equal(lessons.step.grade_k, 1);
  assert.equal(matBlocks(world, m), 7, 'and seven for step two — not thirteen');
});

test('a wrong build never completes, never penalises, and can be corrected', () => {
  const { lessons, world, education, clear } = scenario();
  lessons.startArea('grade_k');
  const m = lessons.matFor('grade_k');
  // The egg hunt asks for three. Five land at once — written straight into the
  // world, as a bucket-fill or a resumed save would, so the mat is already wrong
  // by the time the runner looks. (Placing them one at a time would pass through
  // three on the way up, and passing through the answer IS the answer.)
  for (let i = 0; i < 5; i++) world.setBlock(m.x0 + i, m.y0, m.z0, B.white_wool);
  lessons.onWatch('blockPlaced');
  assert.equal(lessons.step.grade_k, 0, 'five is not three — no advance');
  assert.equal(education.locked, false, 'a wrong build never locks the child out');
  clear(m.x0 + 4, m.y0, m.z0);              // breaking re-checks
  assert.equal(lessons.step.grade_k, 0, 'four is still not three');
  clear(m.x0 + 3, m.y0, m.z0);
  assert.equal(lessons.step.grade_k, 1, 'correcting to three completes the step');
});

test('finishing the last step banks the lesson\'s minutes and pays the character', () => {
  const { lessons, education, inventory, put, clear } = scenario();
  lessons.startArea('grade_k');
  const lesson = lessons.activeLessonFor('grade_k');
  for (const step of lesson.steps) build(solveShape(step.build, lessons.matFor('grade_k')), put, clear);
  assert.ok(lessons.isPassed(lesson.id), 'the lesson is recorded as passed');
  assert.equal(Math.round(education.balanceSec / 60), lesson.minutes, 'banked the lesson\'s full minutes');
  assert.equal(inventory.count('coin'), lesson.reward.coins, 'paid the coins into the pack');
  assert.equal(lessons.current.grade_k, lesson.next, 'walked straight into the next lesson');
  assert.equal(education.locked, false);
});

test('runner persists {area → lesson, step} across serialize/deserialize', () => {
  const a = scenario();
  a.lessons.startArea('grade_2');
  const lesson = a.lessons.activeLessonFor('grade_2');
  build(solveShape(lesson.steps[0].build, a.lessons.matFor('grade_2')), a.put, a.clear);
  const snap = JSON.parse(JSON.stringify(a.lessons.serialize()));
  const b = scenario();
  b.lessons.deserialize(snap);
  assert.equal(b.lessons.current.grade_2, lesson.id, 'resumes the saved lesson');
  assert.equal(b.lessons.step.grade_2, 1, 'and the saved step — a half-done lesson is not restarted');
});

test('a saved step past the end of a shortened lesson is clamped, not left dangling', () => {
  const { lessons } = scenario();
  lessons.deserialize({ current: { grade_k: FIRST.id }, step: { grade_k: 99 } });
  assert.equal(lessons.step.grade_k, FIRST.steps.length - 1, 'clamped to the last real step');
  assert.ok(lessons.activeStep('grade_k'), 'and there is still a step to do');
});

// ---- the curriculum itself ---------------------------------------------------
test('ninety lessons: ten per grade band, K through 8', () => {
  assert.equal(GRADES.length, 9, 'nine bands');
  for (const g of GRADES) assert.equal(g.lessons.length, 10, `${g.label} has ten lessons`);
  assert.equal(LESSONS_DATA.length, 90);
  assert.ok(LESSONS_DATA.length <= ROOM_COUNT, 'every lesson has a classroom of its own');
});

test('every lesson has a story, five-plus steps, thirty minutes and a real reward', () => {
  const ids = new Set();
  for (const l of LESSONS_DATA) {
    assert.ok(!ids.has(l.id), `duplicate lesson id ${l.id}`);
    ids.add(l.id);
    assert.ok(l.title, `${l.id} has no title`);
    assert.ok((l.story || '').length > 80, `${l.id}: the story is too thin to be a story`);
    assert.ok(l.steps.length >= 5, `${l.id} has only ${l.steps.length} steps — that is not half an hour`);
    assert.ok(l.minutes >= 30, `${l.id} banks ${l.minutes} minutes, not thirty`);
    assert.ok(l.reward.coins > 0, `${l.id} pays no coins`);
    for (const [item] of l.reward.items || []) assert.ok(ITEMS[item], `${l.id} rewards unknown item "${item}"`);
    for (const step of l.steps) {
      for (const field of ['say', 'prompt', 'hint', 'success']) {
        assert.ok(step[field], `${l.id}: a step is missing its ${field} (it has to be spoken)`);
      }
      assert.ok(step.build, `${l.id}: a step has nothing to build`);
    }
  }
});

test('every band chains to its own last lesson and stops there', () => {
  for (const g of GRADES) {
    for (let i = 0; i < g.lessons.length; i++) {
      const l = LESSONS_DATA.find((x) => x.id === g.lessons[i].id);
      const want = g.lessons[i + 1]?.id ?? null;
      assert.equal(l.next, want, `${l.id} should be followed by ${want}`);
      assert.equal(l.area, g.key);
    }
  }
});

test('every shape fits the mat and names blocks that exist', () => {
  const used = new Set();
  for (const l of LESSONS_DATA) {
    for (const [i, step] of l.steps.entries()) {
      used.add(step.build.kind);
      const err = validateShape(step.build);
      assert.equal(err, null, `${l.id} step ${i + 1}: ${err}`);
    }
  }
  // Not a coverage target for its own sake: a kind with no lesson using it is a
  // kind nothing has ever proved works, and it should be deleted or used.
  for (const kind of SHAPE_KINDS) assert.ok(used.has(kind), `shape kind "${kind}" is used by no lesson`);
});

test('the kit a lesson hands out covers every block it asks for', () => {
  for (const l of LESSONS_DATA) {
    const kit = lessonNeeds(l);
    for (const step of l.steps) {
      for (const [block, n] of Object.entries(shapeNeeds(step.build))) {
        assert.ok(kit[block] >= n, `${l.id}: needs ${n} × ${block} but the kit lists ${kit[block] || 0}`);
        assert.ok(BLOCKS[B[block]], `${l.id}: "${block}" is not a block`);
      }
    }
  }
});

// ---- the one that matters ----------------------------------------------------
test('every step of every lesson can actually be finished by building its answer', () => {
  for (const lesson of LESSONS_DATA) {
    const { lessons, put, clear } = scenario();
    lessons.setLesson(lesson.area, lesson.id);
    for (const [i, step] of lesson.steps.entries()) {
      assert.equal(lessons.step[lesson.area], i,
        `${lesson.id}: expected to be on step ${i + 1} — a previous step did not complete`);
      const ops = solveShape(step.build, lessons.matFor(lesson.area));
      assert.ok(ops.length, `${lesson.id} step ${i + 1}: no solution for a ${step.build.kind}`);
      build(ops, put, clear);
      const advanced = i + 1 < lesson.steps.length
        ? lessons.step[lesson.area] === i + 1
        : lessons.isPassed(lesson.id);
      assert.ok(advanced, `${lesson.id} step ${i + 1} cannot be completed: "${step.prompt}"`);
    }
  }
});

test('an empty mat completes nothing, in any lesson', () => {
  // The mirror steps are the ones at real risk: "both sides match" is trivially
  // true of a mat with nothing on it.
  for (const lesson of LESSONS_DATA) {
    const { lessons } = scenario();
    lessons.setLesson(lesson.area, lesson.id);
    lessons.onWatch('blockPlaced');
    assert.equal(lessons.step[lesson.area], 0, `${lesson.id}: an empty mat passed its first step`);
  }
});
