// Education/playtime foundation: bank, drain, lock, lessons, persistence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EducationManager, registerLesson, LESSONS } from '../../js/game/education.js';
import { clearAllListeners, on } from '../../js/core/events.js';

test('free play never drains or locks', () => {
  const ed = new EducationManager();
  ed.update(3600, true);
  assert.equal(ed.locked, false);
  assert.equal(ed.balanceSec, 0);
  assert.ok(ed.playtimeTotalSec >= 3600, 'lifetime clock still counts');
});

test('education mode drains only during active play and locks at zero', () => {
  clearAllListeners();
  const events = [];
  on('playtimeExhausted', () => events.push('exhausted'));
  on('playtimeLow', () => events.push('low'));
  const ed = new EducationManager();
  ed.setMode('education');
  ed.grantMinutes(5);
  ed.update(60, false);                 // menus/paused: no drain
  assert.equal(Math.round(ed.balanceSec), 300);
  ed.update(200, true);
  assert.equal(Math.round(ed.balanceSec), 100);
  assert.ok(events.includes('low'), 'warns near empty');
  ed.update(200, true);
  assert.equal(ed.locked, true);
  assert.ok(events.includes('exhausted'));
  ed.update(500, true);                 // locked: no further drain / negative balance
  assert.equal(ed.balanceSec, 0);
});

test('completing a lesson grants minutes and unlocks', () => {
  clearAllListeners();
  const ed = new EducationManager();
  ed.setMode('education', { minutesPerLesson: 10 });
  ed.update(1, true);
  assert.equal(ed.locked, true);
  const res = ed.completeLesson('math_addition_1', { score: 0.9 });
  assert.ok(res.passed && res.granted === 10);
  assert.equal(ed.locked, false);
  assert.equal(ed.balanceMinutes(), 10); // balance floors at 0 while locked, so the full grant lands
});

test('registered lessons enforce min score and repeatability', () => {
  clearAllListeners();
  delete LESSONS.quiz_1;
  registerLesson({ id: 'quiz_1', title: 'Quiz 1', minutes: 5, minScore: 0.8, repeatable: false });
  const ed = new EducationManager();
  ed.setMode('education');
  assert.equal(ed.completeLesson('quiz_1', { score: 0.5 }).passed, false, 'below min score fails');
  assert.equal(ed.balanceSec, 0);
  assert.equal(ed.completeLesson('quiz_1', { score: 0.95 }).granted, 5);
  assert.equal(ed.completeLesson('quiz_1', { score: 1 }).granted, 0, 'non-repeatable pays once');
});

test('daily allowance applies once per day', () => {
  clearAllListeners();
  const ed = new EducationManager();
  ed.setMode('education', { dailyFreeMinutes: 20 });
  ed.applyDailyAllowance('2026-07-20');
  ed.applyDailyAllowance('2026-07-20');
  assert.equal(ed.balanceMinutes(), 20);
  ed.applyDailyAllowance('2026-07-21');
  assert.equal(ed.balanceMinutes(), 40);
});

test('state survives serialize/deserialize', () => {
  clearAllListeners();
  const ed = new EducationManager();
  ed.setMode('education', { minutesPerLesson: 12 });
  ed.completeLesson('reading_1', { score: 1 });
  ed.update(30, true);
  const copy = new EducationManager();
  copy.deserialize(JSON.parse(JSON.stringify(ed.serialize())));
  assert.equal(copy.mode, 'education');
  assert.equal(copy.config.minutesPerLesson, 12);
  assert.equal(Math.round(copy.balanceSec), Math.round(ed.balanceSec));
  assert.equal(copy.lessonsDone.reading_1.length, 1);
});
