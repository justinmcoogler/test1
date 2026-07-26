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

  // ---- into the room -----------------------------------------------------
  const entered = await page.evaluate(() => {
    const g = window.__game;
    g.lessons.startArea('numbers_meadow');
    const room = g.lessons.room(g.lessons.current.numbers_meadow);
    return {
      lesson: g.lessons.current.numbers_meadow,
      at: [Math.round(g.player.x), Math.round(g.player.y), Math.round(g.player.z)],
      roomAt: room ? [room.cx, room.stand, room.cz] : null,
      // Standing on something solid, with a roof: it is a room, not a void.
      floor: g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) - 1, Math.floor(g.player.z)),
      // Scan up rather than guessing the exact course: the point is that the
      // room is closed, not which block number the ceiling landed on.
      ceiling: (() => {
        for (let dy = 2; dy <= 8; dy++) {
          if (g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) + dy, Math.floor(g.player.z))) return dy;
        }
        return 0;
      })(),
    };
  });
  check(entered.lesson === 'nm_count', `the first lesson started (${entered.lesson})`);
  check(entered.at[0] > 29000, `and it took you out of the world entirely (x=${entered.at[0]})`);
  check(Math.abs(entered.at[0] - entered.roomAt[0]) <= 1 && Math.abs(entered.at[2] - entered.roomAt[2]) <= 6,
    'you are standing in this lesson\'s own room');
  check(entered.floor !== 0, 'on a floor');
  check(entered.ceiling !== 0, 'under a roof');

  // ---- do the lesson -----------------------------------------------------
  const done = await page.evaluate(() => {
    const g = window.__game;
    const mat = g.lessons.room('nm_count').mat;
    for (let i = 0; i < 7; i++) {
      g.world.setBlock(mat.x0 + i, mat.y0, mat.z0, window.__blocks.B.red_wool, true);
    }
    // The runner's own re-check entry point, which is what a real blockPlaced
    // event calls — the event bus is not exposed on window.
    g.lessons.onWatch('blockPlaced');
    return {
      next: g.lessons.current.numbers_meadow,
      coins: g.inventory.count('coin'),
      blue: g.inventory.count('blue_wool'),
      bank: g.education.balanceSec,
      at: [Math.round(g.player.x), Math.round(g.player.z)],
    };
  });
  check(done.next === 'nm_add', `seven reds finished it and moved you on (${done.next})`);
  check(done.bank - before.bank >= 9 * 60, `and banked the play minutes (${Math.round((done.bank - before.bank) / 60)} min)`);
  check(done.coins - before.coins === 15, `paid 15 coins onto the character (${done.coins - before.coins})`);
  check(done.blue >= 12, `and the blue wool the NEXT lesson needs (${done.blue})`);
  check(done.at[0] > 29000, 'the next lesson moved you to ITS room, not back to the world');

  // ---- and home again ----------------------------------------------------
  const home = await page.evaluate(() => {
    const g = window.__game;
    g.lessons.leave('numbers_meadow');
    return { x: g.player.x, z: g.player.z, still: g.lessons.current.numbers_meadow };
  });
  check(Math.hypot(home.x - before.x, home.z - before.z) < 2,
    `leaving puts you back where you started (${Math.hypot(home.x - before.x, home.z - before.z).toFixed(1)} blocks off)`);
  check(home.still === 'nm_add', 'and keeps your place in the series');

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
