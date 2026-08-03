// Kids' Learning Mode — the lesson engine.
//
// Proves the loop, which for a walked lesson has two halves per step: the child
// FOLLOWS the guide lights to a stop, and only then does the work there register.
// Story → travel → arrive → prompt → the child places blocks → the runner reads
// the plot via blockPlaced/blockBroken → the step's shape matches → the next stop
// → the last stop banks minutes through education.completeLesson and pays the
// character. Wrong builds never punish.
//
// The load-bearing test is near the bottom: every step of the lesson is SOLVED
// AUTOMATICALLY from its own declared shape and played through the real runner,
// walking to each stop on the way. A lesson that cannot be finished cannot reach
// a child.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LessonRunner, LESSONS_DATA, lessonNeeds, pathPlan, isWalked } from '../../js/game/lessons.js';
import { pathStructure, pathFor, STATION_GAP } from '../../js/world/lessonpath.js';
import { GRADES } from '../../js/game/curriculum/index.js';
import { validateShape, shapeNeeds } from '../../js/game/buildshapes.js';
import { EducationManager } from '../../js/game/education.js';
import { ITEMS } from '../../js/game/items.js';
import { NPC_DEFS } from '../../js/game/npcs.js';
import { B, BLOCKS } from '../../js/world/blocks.js';
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
    // runner wipes the plot between steps, so the fake must accept writes.
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
  // A body to walk. Every step is gated on being at its stop, so a runner with no
  // player would be testing a different game.
  const player = { x: 0, y: 0, z: 0, yaw: 0 };
  const game = { world, education, ui, inventory, player, renderer: { spawnParticles() {} } };
  const lessons = new LessonRunner(game);
  game.lessons = lessons;
  // Stamp the real farm geometry, so the gate across the lane is actually there to
  // be opened and the marked nests are actually on the ground.
  if (lessonId) {
    const lesson = lessons.byId.get(lessonId);
    if (isWalked(lesson)) {
      for (const [key, id] of pathStructure(pathPlan(lesson)).edits) placed.set(key, id);
    }
  }
  // Walk to the stop the current step happens at, then let the runner notice the
  // arrival — exactly what js/main.js's per-frame lessons.update() does.
  const walkToStep = (area) => {
    const st = lessons.stationFor(area);
    if (st) { player.x = st.sx + 0.5; player.y = st.stand; player.z = st.cz + 0.5; }
    lessons.update();
  };
  return { game, world, education, lessons, put, clear, inventory, player, walkToStep, shown };
}

// Play a shape's own worked solution onto the plot, through the same events the
// game fires when a child places a block. `walk` moves the body (a lost lamb is
// found by standing next to it) and `give` fills the pack (that is what picking
// something up off the ground amounts to).
function playSolution(lessons, s, area) {
  const ops = lessons.solveStep(area);
  for (const op of ops) {
    if (op.op === 'walk') { s.player.x = op.x; s.player.y = op.y; s.player.z = op.z; lessons.onWatch('blockPlaced'); }
    else if (op.op === 'give') { s.inventory.add(op.block, op.n); lessons.onWatch('blockPlaced'); }
    else if (op.op === 'break') s.clear(op.x, op.y, op.z);
    else s.put(op.x, op.y, op.z, op.block);
  }
  return ops;
}

const LESSON = LESSONS_DATA[0];       // farm_morning — there is one, and it walks
const AREA = LESSON.area;

// Find a step by the KIND of place it happens at, not by its number: inserting a
// stop into the story should not silently re-point these tests at the wrong one.
const stepAt = (kind) => LESSON.steps.findIndex((st) => st.station?.kind === kind);

// ---- setting off -------------------------------------------------------------
test('the lesson starts you on the lane, not at the work', () => {
  const { lessons } = scenario(LESSON.id);
  lessons.startArea(AREA);
  assert.equal(lessons.current[AREA], LESSON.id);
  assert.equal(lessons.phase[AREA], 'travel', 'the first thing to do is walk');
  const v = lessons.view(AREA);
  assert.ok(v.travelling);
  assert.equal(v.index, 0);
  assert.equal(v.total, LESSON.steps.length);
  assert.ok(v.story.length > 80, 'the story is told as you set off');
  assert.equal(v.prompt, LESSON.steps[0].travel, 'and the prompt is where to go');
  assert.notEqual(v.prompt, LESSON.steps[0].prompt, 'not the job at the far end of it');
  assert.equal(v.say, null, 'the job is not explained until you are standing at it');
});

test('the guide lights point at the next stop, and go out when you get there', () => {
  // These are the quest trail dots (js/main.js updateQuestTrail): a five-year-old
  // who cannot read still gets told which way is on.
  const { lessons, game, walkToStep } = scenario(LESSON.id);
  lessons.startArea(AREA);
  const st = lessons.stationFor(AREA);
  assert.deepEqual(game.lessonDest, [st.sx + 0.5, st.stand, st.cz + 0.5],
    'while travelling, the lights lead to the stop');
  walkToStep(AREA);
  assert.equal(game.lessonDest, null, 'arrived — the lights have done their job');
});

test('the stop you have to SEARCH for gets no lights, or there is nothing to find', () => {
  const { lessons, game } = scenario(LESSON.id);
  const i = LESSON.steps.findIndex((st) => st.build.kind === 'reach');
  assert.ok(i > 0, 'the lesson has a stop you have to look for');
  lessons.setLesson(AREA, LESSON.id, i);
  assert.equal(game.lessonDest, null, 'no dots to the lost lamb — that IS the activity');
});

test('nothing is judged while you are still walking', () => {
  const s = scenario(LESSON.id);
  s.lessons.startArea(AREA);
  // Do the first stop's work perfectly while the child is still twelve blocks
  // short of it. The step must not complete: it has not begun.
  const ops = s.lessons.solveStep(AREA);
  assert.ok(ops.length, 'there is work to do wrongly');
  for (const op of ops) s.put(op.x, op.y, op.z, op.block);
  assert.equal(s.lessons.step[AREA], 0, 'a stop you have not reached cannot be finished');
  assert.equal(s.lessons.phase[AREA], 'travel');
  // And then walking there completes it, without touching anything again.
  s.walkToStep(AREA);
  assert.equal(s.lessons.phase[AREA], 'work');
});

test('arriving at a stop starts its activity and turns you to face it', () => {
  const { lessons, walkToStep, player } = scenario(LESSON.id);
  lessons.startArea(AREA);
  walkToStep(AREA);
  assert.equal(lessons.phase[AREA], 'work', 'arriving begins the job');
  const v = lessons.view(AREA);
  assert.equal(v.travelling, false);
  assert.equal(v.prompt, LESSON.steps[0].prompt, 'and now the prompt is the job');
  assert.equal(v.say, LESSON.steps[0].say);
  assert.equal(Math.round(player.yaw * 100), Math.round(Math.PI * 100), 'facing the work, not the lane');
});

// ---- the stops themselves ----------------------------------------------------
test('a marked stop really has its spots on the ground, one per animal', () => {
  // One-to-one correspondence only works if the nests are visibly separate
  // PLACES. The curriculum declares the offsets once and both the ground and the
  // activity read that same list, so this proves they have not drifted apart.
  const { lessons, world, walkToStep } = scenario(LESSON.id);
  const i = stepAt('henhouse');
  lessons.setLesson(AREA, LESSON.id, i);
  walkToStep(AREA);
  const st = lessons.stationFor(AREA);
  const step = LESSON.steps[i];
  assert.ok(st.marks?.length, 'the hen house has marked nests');
  assert.equal(st.marks.length, step.build.at.length, 'one nest per egg the child is asked for');
  const beasts = st.animals.reduce((n, a) => n + (a.n || 1), 0);
  assert.equal(st.marks.length, beasts, 'and one nest per hen');
  for (const [dx, dz] of st.marks) {
    assert.equal(world.getBlock(st.plot.x0 + dx, st.floor, st.plot.z0 + dz), B.thatch,
      `the nest at ${dx},${dz} is really strawed`);
  }
});

test('the number is READ OFF THE WORLD: as many animals as things to give them', () => {
  // "Count the cows, that is how many apples" is only a real question if the cows
  // are really there to be counted. A stop whose animal count drifted from its
  // activity would be asking a question with the wrong answer.
  const { lessons } = scenario(LESSON.id);
  for (const [i, step] of LESSON.steps.entries()) {
    const st = lessons.pathOf(LESSON.id).stations[i];
    if (!st.animals || step.build.kind !== 'cells') continue;
    const beasts = st.animals.reduce((n, a) => n + (a.n || 1), 0);
    assert.equal(step.build.at.length, beasts,
      `stop ${i + 1} (${st.kind}) has ${beasts} animals but asks for ${step.build.at.length} things`);
  }
});

test('the farm is stocked with animals, spread out where they can be counted', () => {
  const { lessons } = scenario(LESSON.id);
  const spawns = pathStructure(pathPlan(lessons.byId.get(LESSON.id))).spawns;
  assert.ok(spawns.length >= 10, 'a farm with three animals on it is not a farm');
  // None of them stacked on another: counting the animals IS half of several of
  // these activities, so no animal may hide behind one of its neighbours.
  const seen = new Set();
  for (const sp of spawns) {
    const key = `${sp.x},${sp.z}`;
    assert.ok(!seen.has(key), `two animals share the square ${key} — one of them cannot be counted`);
    seen.add(key);
  }
});

test('no animal is standing inside the shed it belongs to', () => {
  // This was real: the pen and the building both started behind the plot, so every
  // cow spawned inside the byre and "count the cows" was a question about a wall.
  // The order looking up from the lane is plot, then animals, then building.
  const { lessons, world } = scenario(LESSON.id);
  const path = lessons.pathOf(LESSON.id);
  const spawns = pathStructure(pathPlan(lessons.byId.get(LESSON.id))).spawns;
  for (const sp of spawns) {
    const st = path.stations.find((s) => Math.abs(s.sx - sp.x) <= 14);
    if (st?.plot) assert.ok(sp.z > st.plot.z1, `an animal at z=${sp.z} is standing on the work plot`);
    // Nothing SOLID in the column it stands in: an animal inside a wall, a
    // doorway or under a roof cannot be seen from the lane, and cannot be counted.
    // (Long grass and flowers are fine — that is a field.)
    for (let dy = 0; dy <= 2; dy++) {
      const b = BLOCKS[world.getBlock(sp.x, sp.y + dy, sp.z)];
      assert.ok(!b.solid, `the animal at ${sp.x},${sp.z} is standing in ${b.name} (+${dy})`);
    }
  }
});

test('the lost lamb is really there to be found', () => {
  // "There she is!" over an empty corner of a field is the game lying to a
  // five-year-old. The stop declares what is hiding at `find`, and it gets spawned.
  const { lessons } = scenario(LESSON.id);
  const path = lessons.pathOf(LESSON.id);
  const i = LESSON.steps.findIndex((st) => st.build.kind === 'reach');
  const st = path.stations[i];
  assert.ok(st.lost, 'the stop says what got out');
  const spawns = pathStructure(pathPlan(lessons.byId.get(LESSON.id))).spawns;
  const lamb = spawns.find((sp) => sp.x === st.find[0] && sp.z === st.find[2]);
  assert.ok(lamb, 'and there is an animal standing on the spot the child is sent to');
  assert.equal(lamb.type, st.lost);
  // Four in the open plus the one hiding: the sum the success line claims.
  const flock = spawns.filter((sp) => sp.type === st.lost).length;
  const counted = st.animals.reduce((n, a) => n + (a.n || 1), 0);
  assert.equal(flock, counted + 1, 'four you can count and a fifth you cannot — which is the lesson');
});

test('the gate across the lane stays shut until the rail is mended, then opens', () => {
  const { lessons, world, walkToStep } = scenario(LESSON.id);
  const i = stepAt('gate');
  lessons.setLesson(AREA, LESSON.id, i);
  walkToStep(AREA);
  const st = lessons.stationFor(AREA);
  const [gx, gy, gz] = st.barrier.cells[0];
  assert.notEqual(world.getBlock(gx, gy, gz), B.air, 'the gate is really there, blocking the way');
  assert.ok(st.barrier.cells.length > 20, 'and it spans the whole farm, not just the lane');
  // It bars the way ONWARD, not the work: the mending patch is on this side of it.
  assert.ok(st.barrier.x > st.plot.x1, 'the gate is past the plot the rail is laid on');

  const s = scenario(LESSON.id);
  s.lessons.setLesson(AREA, LESSON.id, i);
  s.walkToStep(AREA);
  playSolution(s.lessons, s, AREA);
  assert.equal(s.lessons.step[AREA], i + 1, 'eight planks in a row mends it');
  assert.equal(s.world.getBlock(gx, gy, gz), B.air, 'and the gate is gone — the way through is real');
});

test('the lost lamb is somewhere inside the farm, and off the lane', () => {
  const { lessons } = scenario(LESSON.id);
  const path = lessons.pathOf(LESSON.id);
  const i = LESSON.steps.findIndex((st) => st.build.kind === 'reach');
  const st = path.stations[i];
  assert.ok(st.find, 'the stop knows where she is hiding');
  const [fx, , fz] = st.find;
  assert.ok(fx >= path.bounds.x0 && fx <= path.bounds.x1, 'inside the hedge, west to east');
  assert.ok(fz > st.cz + 5 && fz <= path.bounds.z1, 'well off the lane, and still inside the hedge');
  // Far enough away to be a search rather than a step sideways, and further than
  // the arrival box that started the step — otherwise it completes on arrival.
  assert.ok(Math.hypot(fx - st.sx, fz - st.cz) > 8, 'far enough away to have to go looking');
});

test('each stop has its own plot, so work does not pile up down the lane', () => {
  const { lessons, walkToStep } = scenario(LESSON.id);
  lessons.setLesson(AREA, LESSON.id, stepAt('henhouse'));
  walkToStep(AREA);
  const a = lessons.matFor(AREA);
  lessons.setLesson(AREA, LESSON.id, stepAt('feedstore'));
  walkToStep(AREA);
  const b = lessons.matFor(AREA);
  assert.ok(b.x0 > a.x1, `the later stop's plot is further down the lane (${a.x1} then ${b.x0})`);
  assert.ok(b.x0 - a.x0 >= STATION_GAP, 'and a whole stop apart, not overlapping');
  // And the halves are still labelled from the child's point of view, which is the
  // whole reason every stop faces the same way.
  assert.ok(b.left.x0 > b.div && b.right.x1 < b.div);
});

test('a stop with nothing to build has no plot, and that is not an error', () => {
  const { lessons, walkToStep } = scenario(LESSON.id);
  lessons.setLesson(AREA, LESSON.id, stepAt('topfield'));
  walkToStep(AREA);
  assert.equal(lessons.matFor(AREA), null, 'the top field is a field, not a worksheet');
  assert.equal(lessons.phase[AREA], 'work', 'and the activity still starts');
});

// ---- the loop ----------------------------------------------------------------
test('finishing one stop advances to the next without ending the lesson', () => {
  const s = scenario(LESSON.id);
  s.lessons.startArea(AREA);
  s.walkToStep(AREA);
  playSolution(s.lessons, s, AREA);
  assert.equal(s.lessons.step[AREA], 1, 'moved on to the second stop');
  assert.equal(s.lessons.current[AREA], LESSON.id, 'still the same lesson');
  assert.equal(s.lessons.phase[AREA], 'travel', 'and back on the lane, walking to it');
  assert.equal(s.education.balanceSec, 0, 'no minutes banked until the whole round is done');
});

const plotBlocks = (world, m) => {
  let n = 0;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let y = m.y0; y <= m.y1; y++) {
      for (let z = m.z0; z <= m.z1; z++) if (world.getBlock(x, y, z) !== B.air) n++;
    }
  }
  return n;
};

test('a plot is wiped when its work starts, so it is a clean page', () => {
  const s = scenario(LESSON.id);
  s.lessons.startArea(AREA);
  s.walkToStep(AREA);
  const m = s.lessons.matFor(AREA);
  // Rubbish left on the plot — a resumed save, a child playing with the kit.
  for (let x = m.x0; x <= m.x1; x++) s.world.setBlock(x, m.y0, m.z0, B.planks);
  assert.ok(plotBlocks(s.world, m) > 0);
  s.lessons.startWork(AREA);
  assert.equal(plotBlocks(s.world, m), 0, 'swept before the child is asked for anything');
});

test('a wrong build never completes, never penalises, and can be corrected', () => {
  const s = scenario(LESSON.id);
  const i = stepAt('gate');                    // a row of exactly eight planks
  s.lessons.setLesson(AREA, LESSON.id, i);
  s.walkToStep(AREA);
  const m = s.lessons.matFor(AREA);
  // Ten in a row, written straight into the world as a bucket-fill or a resumed
  // save would — so the plot is already wrong by the time the runner looks.
  // (Placing them one at a time would pass THROUGH eight on the way up, and
  // passing through the answer is the answer.)
  for (let k = 0; k < 10; k++) s.world.setBlock(m.x0 + k, m.y0, m.z0, B.planks);
  s.lessons.onWatch('blockPlaced');
  assert.equal(s.lessons.step[AREA], i, 'ten is not eight — no advance');
  assert.equal(s.education.locked, false, 'a wrong build never locks the child out');
  s.clear(m.x0 + 9, m.y0, m.z0);               // breaking re-checks
  assert.equal(s.lessons.step[AREA], i, 'nine is still not eight');
  s.clear(m.x0 + 8, m.y0, m.z0);
  assert.equal(s.lessons.step[AREA], i + 1, 'correcting to eight completes the stop');
});

test('finishing the last stop banks the minutes and pays the character', () => {
  const s = scenario(LESSON.id);
  s.lessons.startArea(AREA);
  const lesson = s.lessons.activeLessonFor(AREA);
  for (let i = 0; i < lesson.steps.length; i++) {
    s.walkToStep(AREA);
    playSolution(s.lessons, s, AREA);
  }
  assert.ok(s.lessons.isPassed(lesson.id), 'the lesson is recorded as passed');
  assert.equal(Math.round(s.education.balanceSec / 60), lesson.minutes, 'banked its full minutes');
  assert.equal(s.inventory.count('coin'), lesson.reward.coins, 'paid the coins into the pack');
  for (const [item, qty] of lesson.reward.items) {
    assert.ok(s.inventory.count(item) >= qty, `paid the ${item} too`);
  }
  // Nothing to chain into: the panel is cleared rather than left showing a stop
  // the child has finished.
  assert.equal(s.lessons.current[AREA], undefined, 'and the round is over');
  assert.equal(s.shown.at(-1), null, 'with the prompt taken down');
  assert.equal(s.game.lessonDest, null, 'and the guide lights out');
  assert.equal(s.education.locked, false);
});

test('runner persists {area → lesson, step} across serialize/deserialize', () => {
  const a = scenario(LESSON.id);
  a.lessons.startArea(AREA);
  a.walkToStep(AREA);
  playSolution(a.lessons, a, AREA);
  const snap = JSON.parse(JSON.stringify(a.lessons.serialize()));
  const b = scenario(LESSON.id);
  b.lessons.deserialize(snap);
  assert.equal(b.lessons.current[AREA], LESSON.id, 'resumes the saved lesson');
  assert.equal(b.lessons.step[AREA], 1, 'and the saved stop — a half-walked round is not restarted');
});

test('the prompt panel does not follow you home', () => {
  // Leaving a lesson KEEPS your place on purpose, so `current[area]` outlives the
  // visit. resume() after a load used to paint the prompt over the overworld for a
  // stop whose plot is thirty thousand blocks away — unsatisfiable, and with no
  // way to dismiss it. It has to ask where you are, not just what you were doing.
  const { lessons, world, shown } = scenario(LESSON.id);
  lessons.startArea(AREA);
  assert.ok(shown.at(-1), 'in the lesson, the prompt shows');

  world.inLesson = false;                 // back in your own world
  lessons.resume();
  assert.equal(shown.at(-1), null, 'resuming outside a lesson clears the panel instead');
  assert.equal(lessons.current[AREA], LESSON.id, 'but your place is still kept');

  world.inLesson = true;                  // and coming back brings it back
  lessons.resume();
  assert.ok(shown.at(-1), 'the prompt returns when you are in the lesson again');
});

test('leaving takes the prompt and the lights with you', () => {
  const { lessons, game, shown } = scenario(LESSON.id);
  lessons.startArea(AREA);
  assert.ok(game.lessonDest, 'the lights are on while the lesson runs');
  lessons.leave(AREA);
  assert.equal(game.lessonDest, null, 'and out when you go home');
  assert.equal(shown.at(-1), null);
  assert.equal(lessons.current[AREA], LESSON.id, 'your place is kept, though');
});

test('a saved step past the end of a shortened lesson is clamped, not left dangling', () => {
  const { lessons } = scenario();
  lessons.deserialize({ current: { [AREA]: LESSON.id }, step: { [AREA]: 99 } });
  assert.equal(lessons.step[AREA], LESSON.steps.length - 1, 'clamped to the last real stop');
  assert.ok(lessons.activeStep(AREA), 'and there is still a stop to do');
});

// ---- the curriculum ----------------------------------------------------------
// Everything above this line exercises the ENGINE and does it on one lesson,
// which is enough — the runner does not care which morning it is walking. What
// follows is about the CONTENT, and every word of it has to hold for every lesson
// in the game or the next one written is the one that slips through.
test('one band, three mornings, and the menu knows about them', () => {
  assert.equal(GRADES.length, 1, 'one band: it is one valley and one age');
  assert.equal(GRADES[0].key, AREA, 'the band and the lessons agree on the area');
  assert.equal(GRADES[0].lessons.length, LESSONS_DATA.length);
  assert.ok(LESSONS_DATA.length >= 3, `${LESSONS_DATA.length} lesson(s) is not a curriculum`);
  const ids = LESSONS_DATA.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'two lessons share an id');
  for (const l of LESSONS_DATA) {
    // Nothing chains. Each morning ends with "off you go and play" and hands the
    // child back their day; the next is waiting in the menu when they want it.
    assert.equal(l.next, null, `${l.id} rolls straight into another lesson`);
  }
});

test('every lesson is somewhere of its own, not the same lane repainted', () => {
  const themes = new Set(LESSONS_DATA.map((l) => l.theme || 'farm'));
  assert.equal(themes.size, LESSONS_DATA.length,
    `${LESSONS_DATA.length} lessons share ${themes.size} setting(s) — they would look identical`);
  // …and no two lessons reuse a building. Three mornings that all happen at the
  // same hen house is the ninety generated lessons over again.
  const seen = new Map();
  for (const l of LESSONS_DATA) {
    for (const step of l.steps) {
      const prev = seen.get(step.station.kind);
      assert.equal(prev, undefined,
        `"${step.station.kind}" is in both ${prev} and ${l.id}`);
      seen.set(step.station.kind, l.id);
    }
  }
});

for (const LSN of LESSONS_DATA) {
  test(`${LSN.id}: a story you walk, spoken aloud, and half an hour long`, () => {
    assert.ok(LSN.walk, 'it is walked');
    assert.ok(LSN.title);
    assert.ok(LSN.story.length > 200, 'the story is a story, not a sentence');
    assert.ok(LSN.steps.length >= 5, `${LSN.steps.length} stops is not half an hour`);
    assert.ok(LSN.minutes >= 30, `banks ${LSN.minutes} minutes, not thirty`);
    assert.ok(LSN.reward.coins > 0, 'it pays coins');
    for (const [item] of LSN.reward.items || []) assert.ok(ITEMS[item], `rewards unknown item "${item}"`);
    assert.ok(NPC_DEFS[LSN.guide], `the guide "${LSN.guide}" is not somebody who exists`);
    // Every step is READ ALOUD, so every step needs all four spoken parts: where
    // to go, what the place is, what to do, and what happened when it was done.
    const KINDS = new Set();
    for (const [i, step] of LSN.steps.entries()) {
      for (const field of ['travel', 'say', 'prompt', 'hint', 'success']) {
        assert.ok(step[field], `stop ${i + 1} is missing its ${field} (it has to be spoken)`);
      }
      assert.ok(step.build, `stop ${i + 1} has nothing to do`);
      assert.ok(step.station?.kind, `stop ${i + 1} is nowhere in particular`);
      KINDS.add(step.station.kind);
    }
    // Six stops that are all the same place is a corridor, not a farm.
    assert.equal(KINDS.size, LSN.steps.length, 'every stop is a different kind of place');
  });

  test(`${LSN.id}: every shape fits its plot and names blocks that exist`, () => {
    for (const [i, step] of LSN.steps.entries()) {
      const err = validateShape(step.build);
      assert.equal(err, null, `stop ${i + 1}: ${err}`);
    }
  });

  test(`${LSN.id}: the kit it hands out covers every block it asks for`, () => {
    const kit = lessonNeeds(LSN);
    for (const step of LSN.steps) {
      for (const [block, n] of Object.entries(shapeNeeds(step.build))) {
        assert.ok(kit[block] >= n, `needs ${n} × ${block} but the kit lists ${kit[block] || 0}`);
        assert.ok(BLOCKS[B[block]], `"${block}" is not a block`);
      }
    }
  });

  // ---- the one that matters --------------------------------------------------
  test(`${LSN.id}: every stop can be finished by walking there and doing its answer`, () => {
    const s = scenario(LSN.id);
    const { lessons } = s;
    lessons.setLesson(AREA, LSN.id);
    for (const [i, step] of LSN.steps.entries()) {
      assert.equal(lessons.step[AREA], i,
        `expected to be on stop ${i + 1} — a previous stop did not complete`);
      // Walk there first. That is half the step, and a solution played from the
      // wrong end of the lane is no proof of anything.
      s.walkToStep(AREA);
      assert.equal(lessons.phase[AREA], 'work',
        `stop ${i + 1}: arriving did not start the work`);
      const ops = playSolution(lessons, s, AREA);
      assert.ok(ops.length, `stop ${i + 1}: no solution for a ${step.build.kind}`);
      const advanced = i + 1 < LSN.steps.length
        ? lessons.step[AREA] === i + 1
        : lessons.isPassed(LSN.id);
      assert.ok(advanced, `stop ${i + 1} cannot be completed: "${step.prompt}"`);
    }
  });

  test(`${LSN.id}: an empty plot completes nothing, at any stop`, () => {
    for (let i = 0; i < LSN.steps.length; i++) {
      const s = scenario(LSN.id);
      s.lessons.setLesson(AREA, LSN.id, i);
      s.walkToStep(AREA);
      s.lessons.onWatch('blockPlaced');
      assert.equal(s.lessons.step[AREA], i, `stop ${i + 1} passed with nothing done`);
    }
  });

  test(`${LSN.id}: the whole place is built, and it is walled all the way round`, () => {
    const { edits } = pathStructure(pathPlan(LSN));
    assert.ok(edits.size > 8000, `${edits.size} blocks is not a place`);
    const path = pathFor(pathPlan(LSN));
    // The boundary is the only thing between a five-year-old and a very long
    // fall, so it is checked as a ring rather than trusted.
    for (const x of [path.bounds.x0, path.bounds.x1]) {
      for (let z = path.bounds.z0; z <= path.bounds.z1; z++) {
        assert.ok(edits.has(`${x},${path.stations[0].stand},${z}`), `a hole in the wall at ${x},${z}`);
      }
    }
    for (const z of [path.bounds.z0, path.bounds.z1]) {
      for (let x = path.bounds.x0; x <= path.bounds.x1; x++) {
        assert.ok(edits.has(`${x},${path.stations[0].stand},${z}`), `a hole in the wall at ${x},${z}`);
      }
    }
  });
}

// ---- showing a four-year-old where the block goes ----------------------------
// The child cannot read the prompt and heard it once. "A fence five across and
// three back, hollow in the middle" is a sentence they simply cannot hold, so the
// squares light up. Derived from the step's own shape, never authored — which is
// what makes it impossible for the guide and the check to disagree.

test('every buildable stop can say where its blocks go', () => {
  for (const LSN of LESSONS_DATA) {
    const s = scenario(LSN.id);
    for (let i = 0; i < LSN.steps.length; i++) {
      s.lessons.setLesson(AREA, LSN.id, i);
      s.walkToStep(AREA);
      const kind = LSN.steps[i].build.kind;
      const cells = s.lessons.guideCells(AREA);
      // The two SEARCHING activities are never guided: lighting up the corner the
      // lamb hides in, or the grass the eggs are in, is the activity done for them.
      if (kind === 'reach' || kind === 'gather') {
        assert.equal(cells.length, 0, `${LSN.id} stop ${i + 1}: a ${kind} must not be given away`);
      } else {
        assert.ok(cells.length > 0, `${LSN.id} stop ${i + 1} (${kind}) shows nowhere to put anything`);
        for (const c of cells) {
          assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z), 'a cell with no place');
          assert.equal(c.color.length, 3);
        }
      }
    }
  }
});

test('the guide is exactly the answer, so following it completes the step', () => {
  // If a child put a block on every lit square and that did NOT finish the stop,
  // the game would have lied to them in the most demoralising way available.
  for (const LSN of LESSONS_DATA) {
    for (let i = 0; i < LSN.steps.length; i++) {
      const kind = LSN.steps[i].build.kind;
      if (kind === 'reach' || kind === 'gather') continue;
      const s = scenario(LSN.id);
      s.lessons.setLesson(AREA, LSN.id, i);
      s.walkToStep(AREA);
      // Follow the lights, re-asking after each block — the set shrinks as it goes.
      for (let guard = 0; guard < 80; guard++) {
        const cells = s.lessons.guideCells(AREA);
        if (!cells.length) break;
        const c = cells[0];
        // The cell says which it is. Looking the op up by COORDINATE cannot work:
        // the subtraction stop breaks cells it also placed, so a position matches
        // both a place and a break.
        if (c.op === 'break') s.clear(c.x, c.y, c.z);
        else s.put(c.x, c.y, c.z, c.block);
        if (s.lessons.step[AREA] !== i) break;      // it completed
      }
      const done = i + 1 < LSN.steps.length ? s.lessons.step[AREA] === i + 1 : s.lessons.isPassed(LSN.id);
      assert.ok(done, `${LSN.id} stop ${i + 1} (${kind}): following the lights did not finish it`);
    }
  }
});

test('the lights go out as the work gets done', () => {
  const LSN = LESSONS_DATA[0];
  const s = scenario(LSN.id);
  s.lessons.setLesson(AREA, LSN.id, 0);
  s.walkToStep(AREA);
  const before = s.lessons.guideCells(AREA).length;
  const c = s.lessons.guideCells(AREA)[0];
  s.put(c.x, c.y, c.z, c.block);
  // What is still lit is what is still to do — which is also how a child learns
  // the block they just put down was the right one, with nothing said.
  assert.equal(s.lessons.guideCells(AREA).length, before - 1, 'a placed block stops glowing');
});

test('taking away is lit in a different colour from putting down', () => {
  // The subtraction stop asks for ten and then for three of them back. Showing
  // thirteen instructions at once would be unreadable, so the reds only appear
  // once the golds are gone.
  const mill = LESSONS_DATA.find((l) => l.steps.some((st) => st.build.kind === 'subtract'));
  assert.ok(mill, 'a lesson teaches taking away');
  const i = mill.steps.findIndex((st) => st.build.kind === 'subtract');
  const s = scenario(mill.id);
  s.lessons.setLesson(AREA, mill.id, i);
  s.walkToStep(AREA);
  const gold = s.lessons.guideCells(AREA);
  assert.ok(gold.every((c) => c.color[1] > 0.5), 'while there is building to do, the lights are gold');
  for (const op of s.lessons.solveStep(AREA)) if (op.op === 'place') s.put(op.x, op.y, op.z, op.block);
  const red = s.lessons.guideCells(AREA);
  assert.ok(red.length > 0 && red.every((c) => c.color[1] < 0.5),
    'once the ten are down, the three to take away are lit red');
});
