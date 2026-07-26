// The lesson panel on a phone, in portrait.
//
// This is where "it covers the whole screen" actually bites: 92vw of a 390px
// screen, with a story, a step, a prompt and two buttons, on a viewport 844 tall.
// Measured rather than eyeballed, and photographed so the crop is visible.
//
//   node tests/_lessonphone.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8793;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('#learning-mode-btn');
  await page.click('#learning-mode-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.waitForSelector('[data-start="farm_morning"]', { timeout: 15000 });
  await page.click('[data-start="farm_morning"]');
  await page.waitForTimeout(1500);

  const m = await page.evaluate(() => {
    const el = document.getElementById('lesson-panel');
    if (!el) return { none: true };
    const r = el.getBoundingClientRect();
    const fold = el.querySelector('.lesson-fold');
    const open = r.height;
    fold.click();
    const folded = el.getBoundingClientRect().height;
    fold.click();
    return { open, folded, vh: window.innerHeight, vw: window.innerWidth,
      width: r.width, foldBox: fold.getBoundingClientRect() };
  });
  check(!m.none, 'the lesson panel is there on a phone');
  check(m.open <= m.vh * 0.42, `it takes at most 42% of a portrait screen (${Math.round(m.open)}px of ${m.vh})`);
  check(m.folded <= 60, `and folds to a strip (${Math.round(m.folded)}px)`);
  check(m.foldBox.width >= 24 && m.foldBox.height >= 24, `the fold button is a real tap target (${Math.round(m.foldBox.width)}x${Math.round(m.foldBox.height)})`);
  check(m.width <= m.vw, 'and it does not overflow the screen sideways');
  await page.screenshot({ path: 'tests/screenshots/phone-lesson.png' });
  console.log('  shot tests/screenshots/phone-lesson.png');

  await page.evaluate(() => document.querySelector('#lesson-panel .lesson-fold').click());
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/screenshots/phone-lesson-folded.png' });
  console.log('  shot tests/screenshots/phone-lesson-folded.png');

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
} catch (e) {
  console.error('LESSONPHONE ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}
console.log(fails.length ? `\nLESSONPHONE FAIL (${fails.length})` : '\nLESSONPHONE PASS');
process.exit(fails.length ? 1 : 0);
