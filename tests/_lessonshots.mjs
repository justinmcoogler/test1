// Photograph every stop of every lesson.
//
//   node tests/_lessonshots.mjs
//
// "The place is built" and "the place looks like somewhere" are different claims,
// and only one of them can be tested. This walks into each lesson world, stands at
// each stop facing its work, and takes a picture — so a person can look.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const PORT = 8793;
const OUT = 'tests/screenshots';

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await mkdir(OUT, { recursive: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'shots');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => window.__game.education.setMode('education'));

  const lessons = await page.evaluate(() => window.__game.lessons.byId
    && [...window.__game.lessons.byId.values()].map((l) => ({ id: l.id, title: l.title, n: l.steps.length })));

  for (const l of lessons) {
    await page.evaluate(() => window.__game.enterLearningMode());
    await page.waitForSelector(`[data-start="${l.id}"]`, { timeout: 10000 });
    await page.click(`[data-start="${l.id}"]`);
    await page.waitForTimeout(1500);
    // Not Escape — with no window open that opens Settings, and the picture is
    // then of the options screen.
    await page.evaluate(() => window.__game.ui.closeWindow());
    // The lesson panel is the instruction and belongs on screen in play — but
    // these pictures are of the PLACE, and it covers the top half of it. Hidden
    // outright rather than folded, because changing step rebuilds it unfolded.
    await page.addStyleTag({ content: '#lesson-panel{display:none!important}' });

    for (let i = 0; i < l.n; i++) {
      // Stand on the lane in front of stop i, looking at it — the view a child
      // gets on arriving.
      const ok = await page.evaluate((idx) => {
        const g = window.__game;
        g.lessons.step.farm = idx;
        const st = g.lessons.stationFor('farm');
        if (!st) return false;
        g.player.x = st.sx + 0.5; g.player.y = st.stand; g.player.z = st.cz - 2.5;
        g.player.yaw = Math.PI; g.player.pitch = -0.12;      // +Z, square on to the work
        g.camYaw = Math.PI;
        for (let cx = (st.sx - 24) >> 4; cx <= (st.sx + 24) >> 4; cx++) {
          for (let cz = (st.cz - 24) >> 4; cz <= (st.cz + 30) >> 4; cz++) {
            g.world.ensureChunk(cx, cz); g.renderer.remeshChunk(g.world, cx, cz);
          }
        }
        return st.kind;
      }, i);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/${l.id}-${i + 1}-${ok}.png` });
      console.log(`  ${l.id} stop ${i + 1}: ${ok}`);
    }
    await page.evaluate(() => window.__game.lessons.leave('farm'));
    await page.waitForTimeout(400);
  }
  console.log(errors.length ? `\nconsole errors: ${errors.slice(0, 4).join(' | ')}` : '\nno console errors');
} catch (err) {
  console.error('SHOTS ERROR', err);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
