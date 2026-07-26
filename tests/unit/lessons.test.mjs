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
import { LessonRunner, LESSONS_DATA, lessonNeeds, pathPlan, isWalked } from '../../js/game/lessons.js';
import { pathStructure } from '../../js/world/lessonpath.js';
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
function scenario(lessonId = null) {
  clearAllListeners(); // isolate the bus before the runner subscribes
  const placed = new Map();
  const world = {
    markers: {},
    // The runner asks this before painting a prompt. Default true (we are in the
    // lesson); the leaving test flips it.
    inLesson: true,
    isLessonWorld() { return this.inLesson; },
    getBlock: (x, y, z) => placed.get(`${x},${y},${z}`) ?? B.air,
    // A step's setup lays out its starting position through the world, and the
    // runner wipes the mat between steps, so the fake must accept writes.
    setBlock: (x, y, z, id) => { if (id === B.air) placed.delete(`${x},${y},${z}`); else placed.set(`${x},${y},${z}`, id); },
  };
  const put = (x, y, z, name) => { placed.set(`${x},${y},${z}`, B[name]); emit('blockPlaced', { x, y, z, block: name }); };
  const clear = (x, y, z) => { placed.delete(`${x},${y},${z}`); emit('blockBroken', { x, y, z, block: 'air' }); };
  const education = new EducationManager();
  education.setMode('education');
  const shown = [];   // every showLessonPrompt() call, so a test can see the panel
  const ui = { showLessonPrompt(v) { shown.push(v); }, showLessonSuccess() {},
    showLessonHint() {}, showStepSuccess() {}, toast() {} };
  // Just enough pack for payReward: a lesson pays the CHARACTER as well as the
  // play-time bank, and a runner with nowhere to put the coins must not throw.
  const bag = new Map();
  const inventory = { add: (item, qty) => { bag.set(item, (bag.get(item) || 0) + qty); return true; },
    count: (item) => bag.get(item) || 0 };
  // A body to walk. A walked lesson's steps are gated on being at the station,
  // so a runner with no player would be testing a different game.
  const player = { x: 0, y: 0, z: 0, yaw: 0 };
  const game = { world, education, ui, inventory, player, renderer: { spawnParticles() {} } };
  const lessons = new LessonRunner(game);
  game.lessons = lessons;
  // Stamp the real path geometry for a walked lesson, so the gate across the
  // trail and the stream in it are actually there to be opened and bridged.
  if (lessonId) {
    const lesson = lessons.byId.get(lessonId);
    if (isWalked(lesson)) {
      for (const [key, id] of pathStructure(pathPlan(lesson)).edits) placed.set(key, id);
    }
  }
  // Walk to the station the current step happens at (or stay put if the lesson
  // has no stations), then let the runner notice the arrival.
  const walkToStep = (area) => {
    const st = lessons.stationFor(area);
    if (st) { player.x = st.sx + 0.5; player.y = st.stand; player.z = st.cz + 0.5; }
    lessons.update();
  };
  return { game, world, education, lessons, put, clear, inventory, player, walkToStep, shown };
}

// Play a shape's own worked solution onto the mat, through the same events the
// game fires when a child places a block.
function build(ops, put, clear) {
  for (const op of ops) {
    if (op.op === 'break') clear(op.x, op.y, op.z);
    else put(op.x, op.y, op.z, op.block);
  }
}

// The same, plus `give` — how a hunt is solved. Breaking a block in the real game
// puts it in the pack; here we say so directly.
function playSolution(step, lessons, { put, clear, inventory }, area) {
  const ops = solveShape(step.build, lessons.matFor(area));
  for (const op of ops) {
    if (op.op === 'give') { inventory.add(op.block, op.n); lessons.onWatch('blockPlaced'); }
    else if (op.op === 'break') clear(op.x, op.y, op.z);
    else put(op.x, op.y, op.z, op.block);
  }
  return ops;
}

const FIRST = LESSONS_DATA[0];        // k_count — the walked one
const ROOM_LESSON = 'k_more';         // still a single-room lesson

// ---- a lesson you walk -------------------------------------------------------
test('a walked lesson starts you on the trail, not at the work', () => {
  const { lessons } = scenario(FIRST.id);
  lessons.startArea('grade_k');
  assert.equal(lessons.current.grade_k, FIRST.id, 'starts at the first lesson of the band');
  assert.equal(lessons.phase.grade_k, 'travel', 'the first thing to do is walk');
  const v = lessons.view('grade_k');
  assert.ok(v.travelling);
  assert.equal(v.index, 0);
  assert.equal(v.total, FIRST.steps.length);
  assert.ok(v.story.length > 80, 'the story is told as you set off');
  assert.equal(v.prompt, FIRST.steps[0].travel, 'and the prompt is where to go');
  assert.notEqual(v.prompt, FIRST.steps[0].prompt, 'not the job at the far end of it');
});

test('nothing is judged while you are still walking', () => {
  const { lessons, walkToStep, inventory } = scenario(FIRST.id);
  lessons.setLesson('grade_k', 'k_more');    // a room lesson: no travel to do
  assert.equal(lessons.phase.grade_k, 'work');

  const b = scenario(FIRST.id);
  b.lessons.startArea('grade_k');
  // Hand over the eggs while the child is still forty blocks down the path. The
  // step must not complete: it has not begun.
  b.inventory.add('white_wool', 20);
  b.lessons.onWatch('blockPlaced');
  assert.equal(b.lessons.step.grade_k, 0, 'a step you have not reached cannot be finished');
  assert.equal(b.lessons.phase.grade_k, 'travel');
  void walkToStep; void inventory;
});

test('arriving at a station starts its activity and turns you to face it', () => {
  const { lessons, walkToStep, player } = scenario(FIRST.id);
  lessons.startArea('grade_k');
  walkToStep('grade_k');
  assert.equal(lessons.phase.grade_k, 'work', 'arriving begins the job');
  const v = lessons.view('grade_k');
  assert.equal(v.travelling, false);
  assert.equal(v.prompt, FIRST.steps[0].prompt, 'and now the prompt is the job');
  assert.equal(v.say, FIRST.steps[0].say);
  assert.equal(Math.round(player.yaw * 100), Math.round(Math.PI * 100), 'facing the work, not the trail');
});

test('the hunt counts what you FOUND, not what the kit already gave you', () => {
  const { lessons, walkToStep, inventory } = scenario(FIRST.id);
  // The kit hands out eggs for a later step, so the bag is not empty when the
  // hunt starts. Finding three still has to mean finding three.
  inventory.add('nest_egg', 9);
  lessons.startArea('grade_k');
  walkToStep('grade_k');
  assert.equal(lessons.step.grade_k, 0, 'nine in the bag is not three found');
  inventory.add('nest_egg', 2);
  lessons.onWatch('blockPlaced');
  assert.equal(lessons.step.grade_k, 0, 'two found is not three either');
  inventory.add('nest_egg', 1);
  lessons.onWatch('blockPlaced');
  assert.equal(lessons.step.grade_k, 1, 'the third egg finishes the hunt');
});

// Find a step by the KIND of place it happens at, not by its number: inserting a
// stop into the story should not silently re-point these tests at the wrong one.
const stepAt = (lesson, kind) => lesson.steps.findIndex((st) => st.station?.kind === kind);

test('the gate across the trail stays shut until the rail is mended, then opens', () => {
  const { lessons, world, walkToStep, put, clear } = scenario(FIRST.id);
  lessons.setLesson('grade_k', FIRST.id, stepAt(FIRST, 'gate'));
  walkToStep('grade_k');
  const st = lessons.stationFor('grade_k');
  assert.equal(st.kind, 'gate');
  const [gx, gy, gz] = st.barrier.cells[0];
  assert.notEqual(world.getBlock(gx, gy, gz), B.air, 'the gate is really there, blocking the way');
  assert.ok(st.barrier.cells.length > 20, 'and it spans the whole meadow, not just the trail');

  build(solveShape(lessons.activeStep('grade_k').build, lessons.matFor('grade_k')), put, clear);
  assert.equal(lessons.step.grade_k, stepAt(FIRST, 'gate') + 1, 'eight planks in a row mends it');
  assert.equal(world.getBlock(gx, gy, gz), B.air, 'and the gate is gone — the way through is real');
});

test('the stream gets stepping stones laid across it, at walking height', () => {
  const { lessons, world, walkToStep, put, clear } = scenario(FIRST.id);
  lessons.setLesson('grade_k', FIRST.id, stepAt(FIRST, 'stream'));
  walkToStep('grade_k');
  const st = lessons.stationFor('grade_k');
  assert.equal(st.kind, 'stream');
  const mid = st.cz;
  assert.equal(world.getBlock(st.barrier.x0, st.floor, mid), B.air, 'the trail really is cut by a ditch');
  assert.equal(world.getBlock(st.barrier.x0, st.floor - 1, st.cz + 4), B.water, 'with water in it');
  assert.ok(st.barrier.x1 - st.barrier.x0 >= 3, 'four wide — too far to jump');
  // A lesson must never be able to trap anybody: there is a step at each end
  // INSIDE the ditch, so a child who falls in can always climb straight out.
  assert.equal(world.getBlock(st.barrier.x0, st.floor - 1, mid), B.stone_stairs, 'a way out at the near end');
  assert.equal(world.getBlock(st.barrier.x1, st.floor - 1, mid), B.stone_stairs, 'and at the far end');

  build(solveShape(lessons.activeStep('grade_k').build, lessons.matFor('grade_k')), put, clear);
  assert.equal(lessons.step.grade_k, stepAt(FIRST, 'stream') + 1, 'five stones in a row finishes it');
  for (let x = st.barrier.x0; x <= st.barrier.x1; x++) {
    assert.equal(world.getBlock(x, st.floor, mid), B.cobble, `a stone landed at x=${x}`);
  }
});

test('each station has its own plot, so work does not pile up down the path', () => {
  const { lessons, walkToStep } = scenario(FIRST.id);
  lessons.setLesson('grade_k', FIRST.id, 1);
  walkToStep('grade_k');
  const a = lessons.matFor('grade_k');
  lessons.setLesson('grade_k', FIRST.id, stepAt(FIRST, 'orchard'));
  walkToStep('grade_k');
  const b = lessons.matFor('grade_k');
  assert.ok(b.x0 > a.x1, `station five's plot is further down the trail (${a.x1} then ${b.x0})`);
  // And the halves are still labelled from the child's point of view, which is
  // the whole reason every station faces the same way.
  assert.ok(b.left.x0 > b.div && b.right.x1 < b.div);
});

// ---- the loop, on a single-room lesson ---------------------------------------
test('finishing step one advances to step two without ending the lesson', () => {
  const { lessons, education, put, clear } = scenario();
  lessons.setLesson('grade_k', ROOM_LESSON);
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

test('the plot is wiped between steps, so the next one starts on a clean page', () => {
  const { lessons, world, put, clear } = scenario();
  lessons.setLesson('grade_k', ROOM_LESSON);
  const lesson = lessons.activeLessonFor('grade_k');
  const m = lessons.matFor('grade_k');
  build(solveShape(lesson.steps[0].build, m), put, clear);
  assert.equal(matBlocks(world, m), 0, 'step one\'s towers were swept away before step two');
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
  lessons.setLesson('grade_k', 'k_ten');
  const m = lessons.matFor('grade_k');
  // Six lanterns are lit and four more are wanted. Six land at once — written
  // straight into the world, as a bucket-fill or a resumed save would, so the mat
  // is already wrong by the time the runner looks. (Placing them one at a time
  // would pass through four on the way up, and passing through the answer IS the
  // answer.)
  for (let i = 0; i < 6; i++) world.setBlock(m.x0 + 6 + i, m.y0, m.z0, B.blue_wool);
  lessons.onWatch('blockPlaced');
  assert.equal(lessons.step.grade_k, 0, 'six is not four — no advance');
  assert.equal(education.locked, false, 'a wrong build never locks the child out');
  clear(m.x0 + 11, m.y0, m.z0);              // breaking re-checks
  assert.equal(lessons.step.grade_k, 0, 'five is still not four');
  clear(m.x0 + 10, m.y0, m.z0);
  assert.equal(lessons.step.grade_k, 1, 'correcting to four completes the step');
});

test('finishing the last step banks the lesson\'s minutes and pays the character', () => {
  const { lessons, education, inventory, put, clear, walkToStep } = scenario(FIRST.id);
  lessons.startArea('grade_k');
  const lesson = lessons.activeLessonFor('grade_k');
  for (const step of lesson.steps) {
    walkToStep('grade_k');
    playSolution(step, lessons, { put, clear, inventory }, 'grade_k');
  }
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

test('the prompt panel does not follow you home', () => {
  // Leaving a lesson KEEPS your place on purpose, so `current[area]` outlives the
  // visit. resume() after a load used to paint the prompt over the overworld for a
  // step whose plot is thirty thousand blocks away — unsatisfiable, and with no
  // way to dismiss it. It has to ask where you are, not just what you were doing.
  const { lessons, world, shown } = scenario(FIRST.id);
  lessons.startArea('grade_k');
  assert.ok(shown.at(-1), 'in the lesson, the prompt shows');

  world.inLesson = false;                 // back in your own world
  lessons.resume();
  assert.equal(shown.at(-1), null, 'resuming outside a lesson clears the panel instead');
  assert.equal(lessons.current.grade_k, FIRST.id, 'but your place is still kept');

  world.inLesson = true;                  // and coming back brings it back
  lessons.resume();
  assert.ok(shown.at(-1), 'the prompt returns when you are in the lesson again');
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
    const s = scenario(lesson.id);
    const { lessons, put, clear, inventory, walkToStep } = s;
    lessons.setLesson(lesson.area, lesson.id);
    for (const [i, step] of lesson.steps.entries()) {
      assert.equal(lessons.step[lesson.area], i,
        `${lesson.id}: expected to be on step ${i + 1} — a previous step did not complete`);
      // Walk to this step's station first. On a walked lesson that is half the
      // step, and a solution played from the wrong end of the path is no proof.
      walkToStep(lesson.area);
      assert.equal(lessons.phase[lesson.area], 'work',
        `${lesson.id} step ${i + 1}: arriving at the station did not start the work`);
      const ops = playSolution(step, lessons, { put, clear, inventory }, lesson.area);
      assert.ok(ops.length, `${lesson.id} step ${i + 1}: no solution for a ${step.build.kind}`);
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
    const { lessons, walkToStep } = scenario(lesson.id);
    lessons.setLesson(lesson.area, lesson.id);
    walkToStep(lesson.area);
    lessons.onWatch('blockPlaced');
    assert.equal(lessons.step[lesson.area], 0, `${lesson.id}: an empty mat passed its first step`);
  }
});
