// Live playthrough of the Numbers Meadow lessons: start the series, place the
// blocks each lesson asks for on the work-mat, fire the watched event, and
// confirm the lesson completes, banks minutes, and advances to the next.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8757;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'lessons');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

const result = await page.evaluate(() => {
  const g = window.__game, B = window.__blocks.B;
  const log = [];
  g.education.setMode('education', {}); // bank minutes so we can prove the reward
  const mat = g.lessons.matFor('numbers_meadow');
  if (!mat) return { error: 'no work-mat marker' };
  // the meadow is far from spawn — load its chunks so setBlock actually writes
  for (let cx = (mat.x0 >> 4) - 1; cx <= (mat.x1 >> 4) + 1; cx++)
    for (let cz = (mat.z0 >> 4) - 1; cz <= (mat.z1 >> 4) + 1; cz++) g.world.ensureChunk(cx, cz);
  log.push(`mat x[${mat.x0}..${mat.x1}] z[${mat.z0}..${mat.z1}] y[${mat.y0}..${mat.y1}] div=${mat.x0 + (mat.x1 - mat.x0 >> 1)}`);

  // place `n` blocks of `name` into a region, row-major, at the mat floor
  const fill = (name, region, n) => {
    let placed = 0;
    for (let y = region.y0; y <= region.y1 && placed < n; y++)
      for (let x = region.x0; x <= region.x1 && placed < n; x++)
        for (let z = region.z0; z <= region.z1 && placed < n; z++) { g.world.setBlock(x, y, z, B[name], true); placed++; }
    return placed;
  };
  const clear = (region) => { for (let y = region.y0; y <= region.y1; y++) for (let x = region.x0; x <= region.x1; x++) for (let z = region.z0; z <= region.z1; z++) g.world.setBlock(x, y, z, B.air, true); };

  const runLesson = (label, doPlace) => {
    const before = g.lessons.current.numbers_meadow;
    const beforeBank = g.education.balanceMinutes();
    doPlace();
    g.lessons.onWatch('blockPlaced');
    const passed = (g.education.lessonsDone[before] || []).some((a) => a.passed);
    const after = g.lessons.current.numbers_meadow;
    const banked = g.education.balanceMinutes() - beforeBank;
    log.push(`${label}: lesson=${before} passed=${passed} banked=+${banked}min next=${after || 'DONE'}`);
    return passed;
  };

  g.lessons.startArea('numbers_meadow');
  log.push(`started at: ${g.lessons.current.numbers_meadow}`);

  // Lesson 1 — count: 7 red_wool on the mat
  const l1 = runLesson('count(7 red)', () => { clear(mat); fill('red_wool', mat, 7); });
  // Lesson 2 — add: 8 blue_wool on the mat
  const l2 = runLesson('add(5+3 blue)', () => { clear(mat); fill('blue_wool', mat, 8); });
  // Lesson 3 — sort: reds left, yellows right
  const l3 = runLesson('sort(red L / yellow R)', () => { clear(mat); fill('red_wool', mat.left, 3); fill('yellow_wool', mat.right, 3); });

  return { log, all: l1 && l2 && l3, done: !g.lessons.current.numbers_meadow, lessonsDone: Object.keys(g.education.lessonsDone), bank: g.education.balanceMinutes() };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
server.kill();
process.exit(result.all && result.done ? 0 : 1);
