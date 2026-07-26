// The camera-view button on the toolbar.
//
// Changing view was a keyboard shortcut (V) and nothing else, which on a phone
// means it did not exist. This drives the BUTTON: click it, check the view
// actually changed, check the glyph changed with it, and check it is refusing
// to fire in the two states where switching view would be wrong.
//
//   node tests/_camerabtn.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8785;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const state = () => page.evaluate(() => {
  const b = document.getElementById('btn-camera');
  return {
    classic: !!window.__game.settings.classicCamera,
    present: !!b,
    // A painter with no DEFS entry draws an empty string, so "there is a button"
    // and "the button has a picture on it" are different questions.
    glyph: b ? b.innerHTML.length : 0,
    title: b ? b.title : '',
  };
});

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'camerabtn');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1000);

  const a = await state();
  check(a.present, 'the toolbar has a camera button');
  check(a.glyph > 50, `and it has a glyph drawn on it (${a.glyph} chars of svg)`);
  check(/first-person|classic/i.test(a.title), `with a tooltip saying what it does ("${a.title}")`);

  await page.click('#btn-camera');
  await page.waitForTimeout(600);
  const b = await state();
  check(b.classic !== a.classic, `clicking it changes the view (${a.classic ? 'classic' : 'first-person'} → ${b.classic ? 'classic' : 'first-person'})`);
  check(b.glyph > 50 && b.title !== a.title, 'and the button repaints to offer the way back');

  await page.click('#btn-camera');
  await page.waitForTimeout(600);
  const c = await state();
  check(c.classic === a.classic, 'clicking again puts it back');
  check(c.title === a.title, 'and the button is back to its first state');

  // V still works — the button is an addition, not a replacement.
  await page.keyboard.press('v');
  await page.waitForTimeout(500);
  check((await state()).classic !== a.classic, 'the V key still works too');
  await page.keyboard.press('v');
  await page.waitForTimeout(500);

  // Refuses in the states where changing view would be wrong.
  const guarded = await page.evaluate(async () => {
    const g = window.__game;
    const before = g.settings.classicCamera;
    g.player.dead = true;
    document.getElementById('btn-camera').click();
    const whileDead = g.settings.classicCamera;
    g.player.dead = false;
    return { before, whileDead };
  });
  check(guarded.whileDead === guarded.before, 'and it does nothing while you are dead');

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
  await page.screenshot({ path: 'tests/screenshots/camerabtn.png' });
} catch (e) {
  console.error('CAMERABTN ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nCAMERABTN FAIL (${fails.length})` : '\nCAMERABTN PASS');
process.exit(fails.length ? 1 : 0);
