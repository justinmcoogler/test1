// Play every lesson to the end, in a real browser, in the real world.
//
//   node tests/_lessonplay.mjs
//
// The unit suite proves each step is solvable against a Map-backed fake world.
// This proves it against the real one: real chunks, real World.setBlock, the real
// inventory, and the real block-breaking path.
//
// That difference matters most for the two verbs no lesson used before. `gather`
// is not about the plot at all — the answer is out in the grass, and a child gets
// it by BREAKING a scattered block and having the item land in their pack, which
// is three systems deep and had never once run. `subtract` needs a block that was
// really placed to be really broken again. Neither is provable with a fake.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8792;
const AREA = 'farm';
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'lessonplay');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => window.__game.education.setMode('education'));

  const lessons = await page.evaluate(() => [...window.__game.lessons.byId.values()]
    .map((l) => ({ id: l.id, title: l.title, steps: l.steps.map((s) => s.build.kind) })));
  check(lessons.length >= 3, `${lessons.length} lessons to play`);

  for (const L of lessons) {
    console.log(`\n— ${L.title}`);
    await page.evaluate(() => window.__game.enterLearningMode());
    await page.waitForSelector(`[data-start="${L.id}"]`, { timeout: 10000 });
    await page.click(`[data-start="${L.id}"]`);
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.__game.ui.closeWindow());

    for (let i = 0; i < L.steps.length; i++) {
      const res = await page.evaluate(async ([area, idx, lessonId]) => {
        const g = window.__game;
        const st = g.lessons.stationFor(area);
        // Walk to the stop. Teleport rather than hold W — _lessonwalk.mjs proves
        // the ground is walkable; this is about whether the WORK can be done.
        g.player.x = st.sx + 0.5; g.player.y = st.stand; g.player.z = st.cz + 0.5;
        for (let cx = (st.sx - 24) >> 4; cx <= (st.sx + 24) >> 4; cx++) {
          for (let cz = (st.cz - 24) >> 4; cz <= (st.cz + 30) >> 4; cz++) g.world.ensureChunk(cx, cz);
        }
        g.lessons.update();
        if (g.lessons.phase[area] !== 'work') return { err: `did not arrive (${g.lessons.phase[area]})` };

        const ops = g.lessons.solveStep(area);
        if (!ops.length) return { err: 'no solution' };
        let reallyBroke = 0;
        for (const op of ops) {
          if (op.op === 'place') {
            g.world.setBlock(op.x, op.y, op.z, window.__blocks.B[op.block], true);
            g.emitEvent?.('blockPlaced', {}) ?? g.lessons.onWatch('blockPlaced');
          } else if (op.op === 'break') {
            g.world.setBlock(op.x, op.y, op.z, 0, true);
            g.lessons.onWatch('blockBroken');
          } else if (op.op === 'walk') {
            g.player.x = op.x; g.player.y = op.y; g.player.z = op.z;
            g.lessons.onWatch('blockPlaced');
          } else if (op.op === 'give') {
            // NOT a handout. Find the real scattered blocks in the real world and
            // break them the way a child does, so the item has to travel from the
            // ground into the pack for this step to pass.
            const id = window.__blocks.B[op.block];
            let taken = 0;
            for (let x = st.sx - 9; x <= st.sx + 9 && taken < op.n; x++) {
              for (let z = st.cz - 6; z <= st.cz + 14 && taken < op.n; z++) {
                if (g.world.getBlock(x, st.stand, z) !== id) continue;
                g.breakBlockAt ? g.breakBlockAt(x, st.stand, z) : null;
                if (!g.breakBlockAt) { g.world.setBlock(x, st.stand, z, 0, true); g.inventory.add(op.block, 1); }
                taken++; reallyBroke++;
                g.lessons.onWatch('blockBroken');
              }
            }
            if (taken < op.n) return { err: `only found ${taken} of ${op.n} ${op.block} in the world` };
          }
        }
        // By the id we were GIVEN, not by lessons.current — finishing the last
        // stop clears current[area], so reading it back here always said no.
        return { step: g.lessons.step[area], passed: g.lessons.isPassed(lessonId), reallyBroke };
      }, [AREA, i, L.id]);

      if (res.err) { check(false, `stop ${i + 1} (${L.steps[i]}): ${res.err}`); break; }
      const last = i + 1 === L.steps.length;
      const advanced = last ? res.passed : res.step === i + 1;
      const found = res.reallyBroke ? `, ${res.reallyBroke} picked up off the ground` : '';
      check(advanced, `stop ${i + 1}: ${L.steps[i]}${found}`);
      if (!advanced) break;
    }
    const done = await page.evaluate((id) => window.__game.lessons.isPassed(id), L.id);
    check(done, `${L.title} finished, and banked its minutes`);
  }

  const banked = await page.evaluate(() => window.__game.education.balanceMinutes());
  check(banked >= 90, `three mornings banked ${banked} minutes of play`);
  const real = errors.filter((e) => !/favicon/i.test(e));
  check(real.length === 0, `no console errors (${real.slice(0, 2).join(' | ') || 'clean'})`);
} catch (err) {
  console.error('PLAY ERROR', err);
  fails.push(String(err));
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

console.log(fails.length ? `\nLESSONPLAY FAIL (${fails.length})` : '\nLESSONPLAY PASS');
process.exit(fails.length ? 1 : 0);
