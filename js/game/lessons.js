// Kids' Learning Mode — the lesson engine.
//
// A data-driven runner that rides the dormant education system
// (js/game/education.js). A lesson is a STORY told in steps, and the child
// performs each step by PLACING BLOCKS. The runner watches world events
// (blockPlaced / blockBroken), re-reads the work mat, and when the build matches
// the step's shape it celebrates, wipes the mat and moves on. Finish every step
// and the lesson banks its play-time minutes and pays the character.
//
// Nothing here is punitive: a wrong build simply doesn't advance — hints are
// there for the asking, and the child keeps trying.
//
// THE CONTENT LIVES IN js/game/curriculum/, ten lessons per grade, K to 8.
//
// EVERY WORD IS READ ALOUD. The audience is five to thirteen years old and four
// of the ten lessons in each band are about learning to read — a lesson that can
// only be understood by reading it is a locked door. js/ui/ui.js speaks the
// story, the step, the hint and the cheer through js/game/speech.js.
//
// EACH LESSON HAS ITS OWN ROOM in its own world (js/world/classroom.js), and
// starting one puts the child inside it. A lesson performed in the overworld is
// performed in the world they play in — the blocks placed for a counting
// exercise would be real edits to their real save. Leaving a lesson, or
// finishing a series, puts them back on the exact block they left from.
//
// FINISHING A LESSON PAYS THE CHARACTER, not the world: banked play minutes,
// plus coins and materials. Both live on the character side of the save
// (js/game/characters.js CHARACTER_KEYS lists `education`, `lessons` and
// `inventory`), so a child who starts a new world keeps everything they earned.
//
// A lesson:
//   { id, area, grade, subject, standard, minutes, guide, title, story,
//     steps: [{ say, prompt, hint, success, build }],
//     watch: ['blockPlaced', ...],             // world events that re-check
//     reward: { coins, items: [[id, qty]] },   // paid to the CHARACTER on pass
//     next }                                   // id of the next lesson, or null
//
// A step's `build` is a SHAPE (js/game/buildshapes.js) — declarative, so the
// same sentence produces the check, the worked solution the tests play through,
// the blocks the child is handed, and a guarantee that the answer fits the mat.
// A step may instead carry a hand-written check(ctx), but nothing does: a
// hand-written check cannot be auto-solved, and an unsolvable step is one nobody
// can prove is finishable.
import { on, emit } from '../core/events.js';
import { registerLesson, LESSONS } from './education.js';
import { B, BLOCKS } from '../world/blocks.js';
import { ROOM_COUNT, classroomFor } from '../world/classroom.js';
import { CURRICULUM, GRADES } from './curriculum/index.js';
import { checkShape, setupShape, shapeNeeds } from './buildshapes.js';

export const LESSONS_DATA = CURRICULUM;
export { GRADES };

// Make each lesson a first-class education lesson so completing it banks the
// lesson's own minutes (not the generic default). Guarded so re-importing the
// module in tests never double-registers.
for (const l of LESSONS_DATA) {
  if (!LESSONS[l.id]) {
    registerLesson({
      id: l.id, subject: l.subject, title: l.title, minutes: l.minutes,
      minScore: 0, repeatable: true,
      payload: { area: l.area, standard: l.standard, guide: l.guide, grade: l.grade },
    });
  }
}

// Everything a lesson asks the child to hold, across all of its steps. The mat
// is wiped between steps, so the most any single step needs is the most they
// ever need at once — not the sum. main.js tops the pack up from this, which is
// why adding a step that wants orange wool cannot strand anybody.
export function lessonNeeds(lesson) {
  const want = {};
  for (const step of lesson?.steps || []) {
    for (const [block, n] of Object.entries(shapeNeeds(step.build))) {
      want[block] = Math.max(want[block] || 0, n);
    }
  }
  return want;
}

export class LessonRunner {
  constructor(game) {
    this.game = game;
    this.current = {};                 // area → active lessonId
    this.step = {};                    // area → index into that lesson's steps
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

  activeStep(area) {
    const lesson = this.activeLessonFor(area);
    if (!lesson) return null;
    return lesson.steps?.[this.step[area] | 0] || null;
  }

  isPassed(id) {
    const attempts = this.game.education?.lessonsDone?.[id];
    return !!attempts && attempts.some((a) => a.passed);
  }

  // Begin (or re-announce) a grade band's lessons, resuming at the first
  // not-yet-passed lesson so a returning child isn't sent back to the start.
  startArea(area) {
    if (this.current[area]) { this.announce(area); return; }
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

  setLesson(area, id, step = 0) {
    this.current[area] = id;
    this.step[area] = step;
    // Into its own room. `lessonEnter` carries the arrival cell; main.js banks
    // where the child was standing the FIRST time (not on every advance within a
    // series, or three lessons in a row would overwrite the way home with the
    // previous classroom).
    const room = this.room(id);
    if (room) emit('lessonEnter', { area, id, room });
    emit('lessonStarted', { area, id, lesson: this.byId.get(id) });
    this.beginStep(area);
  }

  // Start (or restart) the current step: wipe the mat, lay out anything the step
  // pre-places, and say it.
  //
  // The wipe is what makes multi-step lessons possible at all. Step two asks for
  // eight blue blocks; step one left five on the mat. Without a clean page every
  // step after the first would have to be phrased around the leftovers of the
  // last one, and the child would spend the lesson tidying.
  beginStep(area) {
    const lesson = this.activeLessonFor(area);
    const step = this.activeStep(area);
    if (!lesson || !step) return;
    this.clearMat(area);
    this._scratch ||= {};
    this._scratch[this.scratchKey(area)] = {};
    const mat = this.matFor(area);
    const ctx = this.makeCtx(lesson, area);
    if (step.setup) { try { step.setup(ctx); } catch (e) { console.error('[lesson] setup', e); } }
    if (mat && this.game.world) {
      for (const op of setupShape(step.build, mat)) {
        this.game.world.setBlock(op.x, op.y, op.z, B[op.block] ?? B.air, true);
      }
    }
    this.announce(area);
  }

  // Sweep the buildable volume of the mat back to air. The mat SURFACE is one
  // block lower (it is laid into the floor), so this never eats the room.
  clearMat(area) {
    const m = this.matFor(area);
    const world = this.game.world;
    if (!m || !world) return;
    for (let x = m.x0; x <= m.x1; x++) {
      for (let y = m.y0; y <= m.y1; y++) {
        for (let z = m.z0; z <= m.z1; z++) {
          if (world.getBlock(x, y, z) !== B.air) world.setBlock(x, y, z, B.air, true);
        }
      }
    }
  }

  // The child asked to stop. Keep the lesson AND the step as their place — a
  // lesson left half-done is resumed, never restarted — and send them home.
  leave(area) {
    if (!this.current[area]) return false;
    emit('lessonExit', { area, id: this.current[area] });
    this.game.ui?.showLessonPrompt?.(null);
    return true;
  }

  // What the panel and the voice are given: the lesson, which step of how many,
  // and the story (only on the first step — a story retold every five minutes
  // stops being a story).
  view(area) {
    const lesson = this.activeLessonFor(area);
    const step = this.activeStep(area);
    if (!lesson || !step) return null;
    const i = this.step[area] | 0;
    return {
      area, lesson, step, index: i, total: lesson.steps.length,
      title: lesson.title, guide: lesson.guide,
      story: i === 0 ? lesson.story : null,
      say: step.say, prompt: step.prompt, hint: step.hint,
    };
  }

  announce(area) {
    this.game.ui?.showLessonPrompt?.(this.view(area));
  }

  showHint(area) {
    const v = this.view(area);
    if (v) this.game.ui?.showLessonHint?.(v);
  }

  // A watched world event fired — re-check every area that has a lesson waiting
  // on that event. A failed check does nothing (gentle, no penalty).
  onWatch(ev) {
    for (const area of Object.keys(this.current)) {
      const lesson = this.activeLessonFor(area);
      const step = this.activeStep(area);
      if (!lesson || !step || !(lesson.watch || []).includes(ev)) continue;
      let ok = false;
      const ctx = this.makeCtx(lesson, area);
      try { ok = step.check ? !!step.check(ctx) : checkShape(step.build, ctx); }
      catch (e) { console.error('[lesson] check', lesson.id, e); }
      if (ok) this.advance(area);
    }
  }

  // A step landed. Either move on to the next one in the same room, or — if that
  // was the last — finish the lesson.
  advance(area) {
    const lesson = this.activeLessonFor(area);
    const step = this.activeStep(area);
    const i = this.step[area] | 0;
    if (!lesson || !step) return;
    if (i + 1 < lesson.steps.length) {
      this.game.ui?.showStepSuccess?.(this.view(area));
      emit('lessonStep', { area, id: lesson.id, index: i, step });
      this.step[area] = i + 1;
      this.beginStep(area);
      return;
    }
    this.complete(area, lesson);
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
    const last = lesson.steps[lesson.steps.length - 1];
    const res = this.game.education?.completeLesson?.(lesson.id, { score: 1 });
    const paid = this.payReward(lesson);
    this.game.ui?.showLessonSuccess?.(lesson, { granted: res?.granted || 0, paid, say: last?.success });
    emit('lessonSucceeded', { area, id: lesson.id, lesson, granted: res?.granted || 0, paid });
    if (lesson.next && this.byId.has(lesson.next)) {
      this.setLesson(area, lesson.next);    // straight into the next room
    } else {
      delete this.current[area];
      delete this.step[area];
      this.game.ui?.showLessonPrompt?.(null); // band finished — clear the prompt
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
    // Sub-regions split by the divider column. The child stands south of the mat
    // and faces +Z toward it, so their LEFT is the +X half and their RIGHT is the
    // -X half — label the halves to match the player's viewpoint, not raw
    // world-X, or "reds on the left" never registers.
    region.left = { ...region, x0: m.div + 1, x1: m.x1 };  // +X = player's left
    region.right = { ...region, x0: m.x0, x1: m.div - 1 }; // -X = player's right
    return region;
  }

  scratchKey(area) { return `${this.current[area]}#${this.step[area] | 0}`; }

  makeCtx(lesson, area = lesson.area) {
    const world = this.game.world;
    const mat = this.matFor(area);
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
    // shape that needs to look at everything reads this.
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

    // Per-STEP scratch that survives between checks. A check runs on every block
    // placed, so this is how a step can ask about something that HAPPENED —
    // "you made nine and then took four away" — rather than only about how the
    // mat looks right now. Keyed by step, so the next step starts clean.
    this._scratch ||= {};
    const scratch = (this._scratch[this.scratchKey(area)] ||= {});

    // Unbroken runs of LETTER blocks on the mat, read out as words. This is the
    // whole of what a spelling check needs, and it keeps the shapes readable:
    // `words().includes('CAT')` says what it means.
    const words = (region = mat) => runs(region)
      .map((run) => run.map((n) => (/^letter_[a-z]$/.test(n) ? n.slice(-1).toUpperCase() : ' ')).join(''))
      .filter((w) => w && !w.includes(' '));

    return { game: this.game, world, mat, lesson, scratch,
      countPlaced, blocksIn, stackAt, tallest, rowAt, runs, words, nameAt };
  }

  // Re-show the prompt for any in-progress lesson (called after a save loads).
  resume() { for (const area of Object.keys(this.current)) this.announce(area); }

  // ---- persistence: {area → currentLessonId} + which step ----------------
  serialize() { return { current: { ...this.current }, step: { ...this.step } }; }

  deserialize(d) {
    this.current = {};
    this.step = {};
    if (d?.current) for (const [area, id] of Object.entries(d.current)) {
      const lesson = this.byId.get(id);
      if (!lesson) continue;
      this.current[area] = id;
      // Clamp: a save from before a lesson gained or lost a step must not point
      // past the end of it and leave the child in a room with nothing to do.
      const s = d.step?.[area] | 0;
      this.step[area] = Math.min(Math.max(s, 0), lesson.steps.length - 1);
    }
  }
}
