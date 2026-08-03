// Weather & seasons: deterministic climate model that feeds mood, precipitation,
// and (Job 2) the felt-temperature offset.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Weather, WEATHER, SEASONS, SEASON_LEN, YEAR_LEN, altitudeChill, LAPSE_MAX } from '../../js/world/weather.js';
import { SEA } from '../../js/world/worldgen.js';

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

// ---- the season curve has to agree with the season NAMES ---------------------

test('the year is coldest in the middle of winter and warmest in the middle of summer', () => {
  const w = new Weather(1);
  const at = (phase) => { w.worldTime = phase * YEAR_LEN; return w.seasonTempOffset(); };
  // Seasons are quarters starting at phase 0, so the extremes belong at the
  // MIDDLES of summer and winter — 3/8 and 7/8 — not at the boundaries.
  const midSummer = at(0.375), midWinter = at(0.875);
  assert.ok(midSummer > 0.11, `mid-summer should be the year's peak, got ${midSummer.toFixed(3)}`);
  assert.ok(midWinter < -0.11, `mid-winter should be the year's trough, got ${midWinter.toFixed(3)}`);
  // …and the shoulder seasons are the mild ones, passing through neutral.
  assert.ok(Math.abs(at(0.125)) < 0.01, 'mid-spring is neutral');
  assert.ok(Math.abs(at(0.625)) < 0.01, 'mid-autumn is neutral');
});

test('spring is warmer than winter, and autumn is not the hottest season', () => {
  const w = new Weather(1);
  const mean = (season) => {
    let sum = 0;
    for (let i = 0; i < 24; i++) {
      w.worldTime = (season / 4 + (i / 24) / 4) * YEAR_LEN;
      sum += w.seasonTempOffset();
    }
    return sum / 24;
  };
  const [spring, summer, autumn, winter] = [0, 1, 2, 3].map(mean);
  // This is the whole bug in one assertion. The curve used to be a quarter-year
  // out of phase: Spring OPENED at the annual minimum — so a new world, which
  // starts at time zero, started a child at the coldest moment of the year — and
  // Autumn came out warmer than Summer.
  assert.ok(spring > winter, `spring (${spring.toFixed(3)}) must beat winter (${winter.toFixed(3)})`);
  assert.ok(summer > autumn, `summer (${summer.toFixed(3)}) must beat autumn (${autumn.toFixed(3)})`);
  assert.ok(summer > spring && autumn > winter, 'and the ordering is summer > spring/autumn > winter');
});

test('a brand-new world does not open on the coldest day of the year', () => {
  const w = new Weather(1);
  w.worldTime = 0;
  assert.equal(w.season, 'Spring');
  // Cool, because spring follows winter — but nowhere near the annual floor.
  const start = w.seasonTempOffset();
  w.worldTime = 0.875 * YEAR_LEN;
  assert.ok(start > w.seasonTempOffset() + 0.03,
    `the first second of the game (${start.toFixed(3)}) must be warmer than deep winter`);
});

// ---- altitude ----------------------------------------------------------------

test('an ordinary hill is not hypothermia', () => {
  // The comfort band is ±0.24 around 0.5, so "cold" begins when felt drops under
  // 0.26 and hypothermia at about half of that. The starting camp's biome sits at
  // ~0.53, which is the number these are measured against.
  const CAMP = 0.53, COLD = 0.26;
  const feltAt = (blocksUp) => CAMP + 0.03 - altitudeChill(SEA + blocksUp);   // clear spring day
  assert.ok(feltAt(0) > COLD, 'sea level is comfortable');
  assert.ok(feltAt(40) > COLD, 'a rise is comfortable');
  // NINETY BLOCKS UP WAS FULL HYPOTHERMIA. That is a hill, not an expedition, and
  // it is why a clear spring afternoon was freezing people.
  assert.ok(feltAt(90) > COLD, `a 90-block hill must not be cold (felt ${feltAt(90).toFixed(3)})`);
  assert.ok(feltAt(150) > COLD * 0.9, 'and a mountain is cool rather than lethal');
});

test('altitude is capped, so the sky islands are survivable in daylight', () => {
  // Uncapped this reached −1.4 up there: felt clamped to absolute zero and no
  // clothing in the game could reach the comfort band.
  assert.equal(altitudeChill(SEA + 5000), LAPSE_MAX, 'it stops falling');
  const skyFelt = 0.53 + 0.03 - altitudeChill(SEA + 310);
  assert.ok(skyFelt >= 0.26, `the archipelago is chilly, not fatal (felt ${skyFelt.toFixed(3)})`);
});

test('…but a summit at night in a storm still is dangerous', () => {
  // Altitude should cost something, or there is no reason to carry warm clothes.
  const felt = 0.53 - 0.07 - 0.10 - altitudeChill(SEA + 310);   // storm, night
  assert.ok(felt < 0.13, `high + dark + storm should still bite (felt ${felt.toFixed(3)})`);
});
