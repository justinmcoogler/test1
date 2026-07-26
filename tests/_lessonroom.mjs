// A lesson takes you somewhere else and pays you for finishing it.
//
// The unit tests prove the runner's bookkeeping against a fake world. This
// drives the real game: start a lesson, check you are actually STANDING in the
// Schoolhouse thirty thousand blocks away and not in the overworld, build the
// answer on that room's mat, and check you come back to the exact block you
// left from with the minutes and the coins on you.
//
//   node tests/_lessonroom.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8780;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'lessonroom');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);

  const before = await page.evaluate(() => {
    const g = window.__game;
    g.education.setMode('education');
    return { x: g.player.x, y: g.player.y, z: g.player.z, coins: g.inventory.count('coin'), bank: g.education.balanceSec };
  });

  // ---- into the room, THROUGH THE MENU ------------------------------------
  // Clicked, not called: the point of this change is that a child picks a
  // lesson from a list and is there. Driving runner.setLesson directly would
  // pass even if the menu did not exist.
  await page.evaluate(() => window.__game.enterLearningMode());
  await page.waitForSelector('#window-root:not(.hidden)', { timeout: 10000 });
  const menu = await page.evaluate(() => ({
    tab: !!document.querySelector('.win-tab[data-tab="lessons"]'),
    rows: document.querySelectorAll('[data-start]').length,
    open: window.__game.ui.currentWindow,
  }));
  check(menu.tab, 'Learning Mode puts a Lessons tab in the menu');
  check(menu.open === 'lessons', `and opens straight onto it (${menu.open})`);
  const lessonCount = await page.evaluate(() => window.__game.lessons.byId.size);
  check(menu.rows === lessonCount, `listing every lesson (${menu.rows} of ${lessonCount})`);

  await page.click('[data-start="k_count"]');
  await page.waitForTimeout(900);

  const entered = await page.evaluate(() => {
    const g = window.__game;
    const room = g.lessons.room(g.lessons.current.grade_k);
    return {
      lesson: g.lessons.current.grade_k,
      at: [Math.round(g.player.x), Math.round(g.player.y), Math.round(g.player.z)],
      roomAt: room ? [room.cx, room.stand, room.cz] : null,
      // A DIFFERENT WORLD, not a far corner of this one: a lesson World is
      // flagged, and the overworld's camp simply does not exist inside it.
      isLessonWorld: g.world.lessonRoom,
      campfireHere: g.world.getBlock(4, 65, 4),
      groundHere: g.world.getBlock(0, 64, 0),
      // Standing on something solid, with a roof: it is a room, not a void.
      floor: g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) - 1, Math.floor(g.player.z)),
      // Scan up rather than guessing the exact course: the point is that the
      // room is closed, not which block number the ceiling landed on.
      ceiling: (() => {
        for (let dy = 2; dy <= 14; dy++) {   // the room is nine tall now
          if (g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) + dy, Math.floor(g.player.z))) return dy;
        }
        return 0;
      })(),
    };
  });
  check(entered.lesson === 'k_count', `the first lesson started (${entered.lesson})`);
  check(entered.at[0] > 29000, `and it took you out of the world entirely (x=${entered.at[0]})`);
  check(Math.abs(entered.at[0] - entered.roomAt[0]) <= 1 && Math.abs(entered.at[2] - entered.roomAt[2]) <= 6,
    'you are standing in this lesson\'s own room');
  check(entered.isLessonWorld === 0, `and it is a separate world, not a corner of yours (lessonRoom=${entered.isLessonWorld})`);
  check(entered.campfireHere === 0, 'your camp does not exist in it');
  check(entered.groundHere === 0, 'nor does the ground your world is made of');
  check(entered.floor !== 0, 'on a floor');
  check(entered.ceiling !== 0, 'under a roof');

  // ---- do the lesson -----------------------------------------------------
  // All five steps of it, each one solved from its own declared shape — the
  // same solver the unit tests use, driven through the real game's world.
  const done = await page.evaluate(async () => {
    const g = window.__game;
    const { solveShape } = await import('/js/game/buildshapes.js');
    const B = window.__blocks.B;
    const lesson = g.lessons.activeLessonFor('grade_k');
    const rooms = [];
    for (let i = 0; i < lesson.steps.length; i++) {
      const step = g.lessons.activeStep('grade_k');
      const mat = g.lessons.matFor('grade_k');
      rooms.push(g.lessons.step.grade_k);
      for (const op of solveShape(step.build, mat)) {
        g.world.setBlock(op.x, op.y, op.z, op.op === 'break' ? B.air : B[op.block], true);
        // The runner's own re-check entry point, which is what a real
        // blockPlaced event calls — the event bus is not exposed on window.
        g.lessons.onWatch(op.op === 'break' ? 'blockBroken' : 'blockPlaced');
      }
    }
    return {
      steps: rooms,
      next: g.lessons.current.grade_k,
      coins: g.inventory.count('coin'),
      kit: g.inventory.count('red_wool'),
      bank: g.education.balanceSec,
      at: [Math.round(g.player.x), Math.round(g.player.z)],
    };
  });
  check(done.steps.join(',') === '0,1,2,3,4', `it ran as five steps, in order (${done.steps.join(',')})`);
  check(done.next === 'k_more', `finishing every step moved you on (${done.next})`);
  check(done.bank - before.bank >= 29 * 60, `and banked the half-hour (${Math.round((done.bank - before.bank) / 60)} min)`);
  check(done.coins - before.coins === 30, `paid 30 coins onto the character (${done.coins - before.coins})`);
  check(done.kit >= 8, `and stocked the blocks the NEXT lesson needs (${done.kit} red)`);
  check(done.at[0] > 29000, 'the next lesson moved you to ITS room, not back to the world');

  // ---- and home again, also through the menu ------------------------------
  await page.evaluate(() => window.__game.ui.openWindow('lessons'));
  await page.waitForSelector('[data-leave]', { timeout: 10000 });
  await page.click('[data-leave]');
  await page.waitForTimeout(900);
  const home = await page.evaluate(() => {
    const g = window.__game;
    return {
      x: g.player.x, z: g.player.z, still: g.lessons.current.grade_k,
      backInWorld: g.world.lessonRoom,
      campfire: g.world.getBlock(4, 65, 4),
    };
  });
  check(Math.hypot(home.x - before.x, home.z - before.z) < 2,
    `leaving puts you back where you started (${Math.hypot(home.x - before.x, home.z - before.z).toFixed(1)} blocks off)`);
  check(home.still === 'k_more', 'and keeps your place in the series');
  check(home.backInWorld === null, 'you are back in your own world');
  check(home.campfire !== 0, 'with your camp still standing in it');

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
  await page.screenshot({ path: 'tests/screenshots/lessonroom.png' });
} catch (e) {
  console.error('LESSONROOM ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nLESSONROOM FAIL (${fails.length})` : '\nLESSONROOM PASS');
process.exit(fails.length ? 1 : 0);
