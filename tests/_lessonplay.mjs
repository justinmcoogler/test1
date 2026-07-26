// One lesson from every grade band, played end to end in the real game.
//
// The unit suite solves all ninety lessons against a Map-backed fake world.
// That proves the shapes and the runner agree with each other; it does not prove
// they agree with the GAME. This drives nine real lesson worlds — a fresh World
// per lesson, real chunks, the real inventory, the real education ledger — and
// walks each one through all five of its steps.
//
// It is the cheapest place a whole-curriculum regression would show up: a room
// that generates wrong, a mat that lands somewhere else, a kit that arrives
// empty, a step that cannot be reached in a world that actually has chunks.
//
//   node tests/_lessonplay.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8757;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'lessons');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(800);

  const result = await page.evaluate(async () => {
    const g = window.__game;
    const B = window.__blocks.B;
    const { solveShape } = await import('/js/game/buildshapes.js');
    const { GRADES } = await import('/js/game/lessons.js');
    g.education.setMode('education', {});
    const log = [];
    const bad = [];

    for (const grade of GRADES) {
      const id = grade.lessons[0].id;
      const lesson = g.lessons.byId.get(id);
      const bankBefore = g.education.balanceSec;
      const coinsBefore = g.inventory.count('coin');
      g.lessons.setLesson(grade.key, id);

      // In the room, in its own world.
      if (g.world.lessonRoom !== g.lessons.roomIndex(id)) bad.push(`${id}: not in its own lesson world`);

      for (let i = 0; i < lesson.steps.length; i++) {
        const step = g.lessons.activeStep(grade.key);
        const mat = g.lessons.matFor(grade.key);
        if (!step) { bad.push(`${id}: ran out of steps at ${i + 1}`); break; }
        // Every block the step asks for must be IN THE PACK — a child cannot
        // build an answer they were not handed the pieces for.
        for (const op of solveShape(step.build, mat)) {
          if (op.op === 'break') { g.world.setBlock(op.x, op.y, op.z, B.air, true); g.lessons.onWatch('blockBroken'); }
          else {
            if (g.inventory.count(op.block) <= 0) { bad.push(`${id} step ${i + 1}: no ${op.block} in the pack`); break; }
            g.world.setBlock(op.x, op.y, op.z, B[op.block], true);
            g.lessons.onWatch('blockPlaced');
          }
        }
        const at = g.lessons.step[grade.key];
        const finished = i + 1 === lesson.steps.length;
        if (!finished && at !== i + 1) { bad.push(`${id} step ${i + 1} did not complete: "${step.prompt}"`); break; }
      }

      const passed = (g.education.lessonsDone[id] || []).some((a) => a.passed);
      const banked = Math.round((g.education.balanceSec - bankBefore) / 60);
      const paid = g.inventory.count('coin') - coinsBefore;
      if (!passed) bad.push(`${id} never completed`);
      if (banked < lesson.minutes) bad.push(`${id} banked ${banked} min, not ${lesson.minutes}`);
      if (paid !== lesson.reward.coins) bad.push(`${id} paid ${paid} coins, not ${lesson.reward.coins}`);
      log.push(`${grade.label.padEnd(13)} ${id.padEnd(10)} ${lesson.steps.length} steps · +${banked} min · +${paid} coins`);
      // Out again, so the next band starts from the overworld exactly as a child
      // picking a second lesson from the menu would.
      g.lessons.leave(grade.key);
    }
    return { log, bad, backHome: g.world.lessonRoom, bank: g.education.balanceMinutes() };
  });

  for (const line of result.log) console.log(`       ${line}`);
  for (const b of result.bad) console.log(`  !!   ${b}`);
  check(result.log.length === 9, `one lesson from each of the nine bands (${result.log.length})`);
  check(result.bad.length === 0, `every step of every one of them completed (${result.bad.length} problems)`);
  check(result.backHome === null, 'and leaving the last one put you back in your own world');
  check(result.bank >= 9 * 30, `nine half-hours banked (${result.bank} min)`);
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
} catch (e) {
  console.error('LESSONPLAY ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nLESSONPLAY FAIL (${fails.length})` : '\nLESSONPLAY PASS');
process.exit(fails.length ? 1 : 0);
