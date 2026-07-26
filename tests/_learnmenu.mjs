// Verifies the title-screen "Learning Mode" button: clicking it should boot a
// fresh world straight into education mode, open the Lessons menu and stock the
// starter kit — no console hook required.
//
// It used to check the child had been teleported out to a meadow to go and find
// the guide. There is nowhere to walk to any more: a lesson is PICKED FROM THE
// MENU and puts you on its own farm in its own world, so the thing to prove here
// is that the menu is open, listing the lesson, the moment the mode starts.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8759;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);

// the option must be visible on the very first screen — that is the whole point
await page.waitForSelector('#learning-mode-btn');
const label = (await page.textContent('#learning-mode-btn'))?.toLowerCase() || '';
if (!label.includes('learning')) { console.log('FAIL: button missing its label:', JSON.stringify(label)); await browser.close(); server.kill(); process.exit(1); }

await page.click('#learning-mode-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
// let enterLearningMode() open the menu
await page.waitForTimeout(600);

const r = await page.evaluate(() => {
  const g = window.__game;
  const kit = ['red_wool', 'blue_wool', 'yellow_wool'].map((c) => g.inventory.count(c));
  return {
    isEducation: g.education.isEducation,
    bankMin: g.education.balanceMinutes(),
    window: g.ui.currentWindow,
    menuOpen: !document.getElementById('window-root')?.classList.contains('hidden'),
    lessonsListed: document.querySelectorAll('[data-start]').length,
    bands: document.querySelectorAll('#window-body details').length,
    // A single band must come OPEN: folding away the only thing on the page hides
    // the whole of Learning Mode behind a triangle.
    bandOpen: [...document.querySelectorAll('#window-body details')].every((d) => d.open),
    // The story is on the card, so a parent can see what the lesson is about
    // without starting it.
    storyShown: (document.querySelector('.lesson-row')?.textContent || '').includes('Honeywood'),
    player: [Math.round(g.player.x), Math.round(g.player.y), Math.round(g.player.z)],
    kit,
    savedMode: (JSON.parse(localStorage.getItem('sproutlands_slot_1') || '{}').meta || {}).mode,
  };
});
console.log(JSON.stringify(r, null, 2));

const ok = r.isEducation && r.menuOpen && r.window === 'lessons' && r.lessonsListed === 1
  && r.bands === 1 && r.bandOpen && r.storyShown
  && r.kit.every((n) => n >= 10) && r.savedMode === 'education';
console.log(ok ? 'PASS: Learning Mode launches from the main menu' : 'FAIL');
await browser.close();
server.kill();
process.exit(ok ? 0 : 1);
