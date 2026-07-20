// Education / playtime foundation (dormant in free play).
//
// The product has two modes:
//   'free'      — survival sandbox, no time accounting beyond a lifetime clock.
//   'education' — play time is a bank: completing lessons grants minutes,
//                 active play drains them, and an empty bank locks play.
//
// This module is the complete state machine + ledger for that system. It is
// deliberately storage-agnostic: everything lives in one serializable object
// (persisted inside the save slot today) so a server adapter — accounts,
// parent/teacher dashboard, remote lesson results — can own the same state
// later without touching game code. See docs/EDUCATION.md.
import { emit } from '../core/events.js';

// Lesson registry — content arrives in a later phase. Shape is fixed now so
// lesson packs are data files, exactly like quests and custom mobs:
//   { id, subject, title, minutes (reward), minScore, repeatable, payload }
// payload is lesson-runner-specific (question sets, reading passages, …).
export const LESSONS = {};

export function registerLesson(def) {
  if (!def?.id || LESSONS[def.id]) throw new Error(`lesson id missing/duplicate: ${def?.id}`);
  if (!(def.minutes > 0)) throw new Error(`lesson ${def.id}: minutes reward required`);
  LESSONS[def.id] = {
    subject: 'general', title: def.id, minScore: 0.7, repeatable: true,
    ...def,
  };
  return LESSONS[def.id];
}

export class EducationManager {
  constructor() {
    this.mode = 'free';               // 'free' | 'education'
    this.config = {
      minutesPerLesson: 15,           // default reward when a lesson doesn't specify
      dailyFreeMinutes: 0,            // optional no-lesson allowance per day
      lockWhenExhausted: true,
      warnAtSeconds: 120,             // heads-up before the bank empties
    };
    this.balanceSec = 0;              // banked play seconds (education mode)
    this.playtimeTotalSec = 0;        // lifetime active-play clock (both modes)
    this.lessonsDone = {};            // lessonId → [{at, score}] (attempt history)
    this.locked = false;
    this.lastFreeGrantDay = null;     // 'YYYY-MM-DD' the daily allowance last applied
    this._warned = false;
  }

  get isEducation() { return this.mode === 'education'; }

  // Switch modes (a parent/teacher surface will call this later).
  setMode(mode, config = {}) {
    if (mode !== 'free' && mode !== 'education') throw new Error(`unknown mode ${mode}`);
    this.mode = mode;
    Object.assign(this.config, config);
    if (mode === 'free') this.setLocked(false);
    emit('educationModeChanged', { mode, config: { ...this.config } });
  }

  // Called every frame with whether the player is actively playing
  // (in-world, alive, not sitting in a menu).
  update(dt, activePlay) {
    if (!activePlay) return;
    this.playtimeTotalSec += dt;
    if (!this.isEducation || this.locked) return;

    this.applyDailyAllowance();
    this.balanceSec -= dt;
    if (!this._warned && this.balanceSec > 0 && this.balanceSec <= this.config.warnAtSeconds) {
      this._warned = true;
      emit('playtimeLow', { secondsLeft: Math.ceil(this.balanceSec) });
    }
    if (this.balanceSec <= 0) {
      this.balanceSec = 0;
      if (this.config.lockWhenExhausted) this.setLocked(true);
      else emit('playtimeExhausted', { soft: true });
    }
  }

  applyDailyAllowance(today = new Date().toISOString().slice(0, 10)) {
    if (!(this.config.dailyFreeMinutes > 0)) return;
    if (this.lastFreeGrantDay === today) return;
    this.lastFreeGrantDay = today;
    this.grantMinutes(this.config.dailyFreeMinutes, 'daily-allowance');
  }

  setLocked(locked) {
    if (this.locked === locked) return;
    this.locked = locked;
    if (locked) emit('playtimeExhausted', { soft: false });
    else { this._warned = false; emit('playtimeUnlocked', {}); }
  }

  grantMinutes(minutes, reason = 'grant') {
    if (!(minutes > 0)) return 0;
    this.balanceSec += minutes * 60;
    emit('playtimeGranted', { minutes, reason, balanceSec: this.balanceSec });
    if (this.locked && this.balanceSec > 0) this.setLocked(false);
    return this.balanceSec;
  }

  // Record a finished lesson attempt; passing grants its playtime reward.
  // Works with unregistered ids too (a remote lesson runner can be authoritative).
  completeLesson(lessonId, { score = 1 } = {}) {
    const def = LESSONS[lessonId];
    const minScore = def?.minScore ?? 0;
    const passed = score >= minScore;
    const attempts = (this.lessonsDone[lessonId] ||= []);
    if (def && !def.repeatable && attempts.some((a) => a.passed)) {
      emit('lessonCompleted', { lessonId, score, passed, repeated: true, granted: 0 });
      return { passed, granted: 0 };
    }
    attempts.push({ at: Math.round(this.playtimeTotalSec), score, passed });
    let granted = 0;
    if (passed) {
      granted = def?.minutes ?? this.config.minutesPerLesson;
      this.grantMinutes(granted, `lesson:${lessonId}`);
    }
    emit('lessonCompleted', { lessonId, score, passed, granted });
    return { passed, granted };
  }

  balanceMinutes() { return Math.floor(this.balanceSec / 60); }

  serialize() {
    return {
      mode: this.mode,
      config: { ...this.config },
      balanceSec: Math.round(this.balanceSec),
      playtimeTotalSec: Math.round(this.playtimeTotalSec),
      lessonsDone: this.lessonsDone,
      locked: this.locked,
      lastFreeGrantDay: this.lastFreeGrantDay,
    };
  }

  deserialize(d) {
    if (!d) return;
    this.mode = d.mode === 'education' ? 'education' : 'free';
    Object.assign(this.config, d.config || {});
    this.balanceSec = d.balanceSec || 0;
    this.playtimeTotalSec = d.playtimeTotalSec || 0;
    this.lessonsDone = d.lessonsDone || {};
    this.locked = !!d.locked;
    this.lastFreeGrantDay = d.lastFreeGrantDay || null;
    this._warned = false;
  }
}
