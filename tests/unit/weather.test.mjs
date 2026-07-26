// Weather & seasons: deterministic climate model that feeds mood, precipitation,
// and (Job 2) the felt-temperature offset.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Weather, WEATHER, SEASONS, SEASON_LEN, YEAR_LEN } from '../../js/world/weather.js';

test('seasons cycle Spring→Summer→Autumn→Winter and wrap', () => {
  const w = new Weather(1);
  w.worldTime = 0;                 assert.equal(w.season, 'Spring');
  w.worldTime = SEASON_LEN + 1;    assert.equal(w.season, 'Summer');
  w.worldTime = SEASON_LEN * 2 + 1; assert.equal(w.season, 'Autumn');
  w.worldTime = SEASON_LEN * 3 + 1; assert.equal(w.season, 'Winter');
  w.worldTime = YEAR_LEN + 1;      assert.equal(w.season, 'Spring');
  assert.deepEqual(SEASONS, ['Spring', 'Summer', 'Autumn', 'Winter']);
});

test('seasonal temperature offset stays in band and summer beats winter', () => {
  const w = new Weather(1);
  for (let p = 0; p < 1; p += 0.05) {
    w.worldTime = p * YEAR_LEN;
    const off = w.seasonTempOffset();
    assert.ok(off >= -0.1201 && off <= 0.1201, `offset in band at phase ${p}`);
  }
  w.worldTime = SEASON_LEN * 1.5; const summer = w.seasonTempOffset();
  w.worldTime = SEASON_LEN * 3.5; const winter = w.seasonTempOffset();
  assert.ok(summer > winter, 'summer is warmer than winter');
});

test('cold climates never storm or heatwave; hot climates never snow', () => {
  const cold = new Weather(3);
  cold.climate = { temp: 0.05, moist: 0.95 };
  const hot = new Weather(4);
  hot.climate = { temp: 0.95, moist: 0.05 };
  for (let t = 0; t < YEAR_LEN; t += SEASON_LEN * 0.1) {
    cold.worldTime = t; hot.worldTime = t;
    const c = cold.targetWeather(), h = hot.targetWeather();
    assert.ok(WEATHER[c], `valid weather ${c}`);
    assert.ok(!['rain', 'storm', 'heatwave'].includes(c), `cold gave ${c} at t=${t}`);
    assert.ok(!['snow', 'blizzard'].includes(h), `hot gave ${h} at t=${t}`);
  }
});

test('intensity eases up while the weather is stable', () => {
  const w = new Weather(1);
  const climate = { temp: 0.2, moist: 0.9 };
  for (let i = 0; i < 400; i++) w.update(0.1, 1000 + i * 0.1, climate);
  assert.ok(w.intensity > 0.5, `intensity climbed to ${w.intensity}`);
});

test('renderState gates precipitation on intensity and clamps multipliers', () => {
  const w = new Weather(1);
  w.current = 'rain'; w.intensity = 0.1;
  assert.equal(w.renderState().precip, null, 'no precip until it builds up');
  w.intensity = 0.6;
  const rs = w.renderState();
  assert.equal(rs.precip, 'rain');
  assert.ok(rs.day <= 1 && rs.day > 0, 'daylight multiplier sane');
  assert.ok(rs.fog >= 0, 'fog amount non-negative');
});

test('felt-temperature offset: a winter blizzard reads cold', () => {
  const w = new Weather(1);
  w.current = 'blizzard'; w.intensity = 1; w.worldTime = SEASON_LEN * 3.5;
  assert.ok(w.tempOffset() < 0, 'winter + blizzard is a cold offset');
});

test('a pinned sky does not move, whatever the climate or the season says', () => {
  // A lesson world pins its weather (js/main.js enterLessonWorld). Weather is
  // atmosphere in the world you play in and pure distraction in the middle of a
  // maths lesson — and no lesson should ever be rained off.
  const w = new Weather(1);
  w.pin('clear');
  const wet = { temp: 0.2, moist: 0.95 };            // the wettest, coldest front there is
  for (let i = 0; i < 2000; i++) w.update(0.1, SEASON_LEN * 3.5 + i * 0.1, wet);
  assert.equal(w.current, 'clear', 'still clear after a simulated week of storm weather');
  assert.equal(w.intensity, 0);
  const rs = w.renderState();
  assert.equal(rs.precip, null, 'nothing falling');
  assert.equal(rs.fog, 0, 'and no weather fog');
  assert.equal(rs.day, 1, 'full daylight');
  assert.equal(w.tempOffset(), 0, 'and no season, so nobody gets cold mid-lesson');
});
