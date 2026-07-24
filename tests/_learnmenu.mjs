// Verifies the title-screen "Learning Mode" button: clicking it should boot a
// fresh world straight into education mode, drop the child at Numbers Meadow,
// and stock the lesson kit — no console hook required.
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
// let enterLearningMode() + the meadow teleport settle
await page.waitForTimeout(400);

const r = await page.evaluate(() => {
  const g = window.__game;
  const m = g.world.markers.learnMeadow;
  const near = m ? (Math.abs(g.player.x - (m[0] + 0.5)) < 3 && Math.abs(g.player.z - (m[2] + 0.5)) < 3) : false;
  const kit = ['red_wool', 'blue_wool', 'yellow_wool'].map((c) => g.inventory.count(c));
  return {
    isEducation: g.education.isEducation,
    bankMin: g.education.balanceMinutes(),
    atMeadow: near,
    marker: m ? [m[0], m[1], m[2]] : null,
    player: [Math.round(g.player.x), Math.round(g.player.y), Math.round(g.player.z)],
    kit,
    savedMode: (JSON.parse(localStorage.getItem('sproutlands_slot_1') || '{}').meta || {}).mode,
  };
});
console.log(JSON.stringify(r, null, 2));

const ok = r.isEducation && r.atMeadow && r.kit.every((n) => n >= 10) && r.savedMode === 'education';
console.log(ok ? 'PASS: Learning Mode launches from the main menu' : 'FAIL');
await browser.close();
server.kill();
process.exit(ok ? 0 : 1);
