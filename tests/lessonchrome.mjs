// What a four-year-old sees when they are in a lesson.
//
//   node tests/lessonchrome.mjs
//
// A lesson world has no night, no weather, no distance, no danger and no hunger,
// but it was inheriting the whole survival HUD anyway: a red health bar, a
// black minimap of a void, a compass, an FPS chip, a weather badge, and menu
// buttons leading to skills, crafting, quests and a map that do not exist here.
// Then the hotbar handed them a hatchet, selected, so the first click of a child
// who cannot yet read the prompt chopped a hole in the work mat.
//
// None of that is a crash, so nothing caught it. This does.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8782;
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

// Everything that measures something a lesson world cannot have.
const SURVIVAL = ['vitals', 'minimap', 'compass-wrap', 'fps-badge', 'env-badge'];
const DEAD_ENDS = ['skills', 'crafting', 'quests', 'map'];

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const shown = (ids) => page.evaluate((list) => list.map((id) => {
  const el = document.getElementById(id);
  return el && !el.classList.contains('hidden') && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
}), ids);

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'chrome');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => window.__game.ui.closeWindow());
  await page.waitForTimeout(1200);

  // ---- out in the world, all of it is there ----
  const before = await shown(SURVIVAL);
  check('the ordinary world shows the whole HUD', before.every(Boolean),
    SURVIVAL.filter((_, i) => !before[i]).join(',') || 'all present');

  // ---- into a lesson ----
  await page.evaluate(() => window.__game.education.setMode('education'));
  await page.evaluate(() => window.__game.enterLearningMode());
  await page.waitForSelector('[data-start]', { timeout: 10000 });
  await page.evaluate(() => document.querySelector('[data-start]').click());
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__game.ui.closeWindow());
  await page.waitForTimeout(600);

  const inLesson = await page.evaluate(() => !!window.__game.world.isLessonWorld());
  check('we are actually in a lesson world', inLesson);

  const during = await shown(SURVIVAL);
  check('a lesson hides every survival read-out', during.every((v) => !v),
    SURVIVAL.filter((_, i) => during[i]).join(',') || 'all hidden');

  const menus = await page.evaluate((wins) => wins.map((w) => {
    const el = document.querySelector(`.menu-btn[data-win="${w}"]`);
    return el ? el.offsetParent !== null : false;
  }), DEAD_ENDS);
  check('and the menu buttons that lead nowhere', menus.every((v) => !v),
    DEAD_ENDS.filter((_, i) => menus[i]).join(',') || 'all hidden');

  // The two that must SURVIVE — a child stranded in a camera mode they cannot
  // work, or unable to make the text bigger, is worse off than one with clutter.
  const kept = await page.evaluate(() => ({
    settings: !!document.querySelector('.menu-btn[data-win="settings"]')?.offsetParent,
    camera: !!document.getElementById('btn-camera')?.offsetParent,
    crosshair: !!document.getElementById('crosshair')?.offsetParent,
    hotbar: !!document.getElementById('hotbar')?.offsetParent,
  }));
  check('settings, the camera toggle, the crosshair and the hotbar stay',
    kept.settings && kept.camera && kept.crosshair && kept.hotbar, JSON.stringify(kept));

  // ---- the hand they start with ----
  const hand = await page.evaluate(() => {
    const g = window.__game, inv = g.inventory;
    const s = inv.slots[inv.selected];
    // a placeable item carries a block name — that is what makes a click put
    // something DOWN rather than chop something out
    return { item: s?.item || null, isBlock: !!(s && window.__items.ITEMS[s.item]?.block) };
  });
  check('a lesson starts with a BLOCK in hand, not the hatchet',
    hand.isBlock, `holding ${hand.item}`);

  // ---- the guides are lit, once they have walked to the first stop ----
  // A lesson opens in its TRAVEL phase: gold dots to the stop, nothing checked
  // and nothing lit until the child is standing there. So walk there first.
  const guides = await page.evaluate(() => {
    const g = window.__game;
    const area = g.lessons.currentArea?.();
    if (!area) return { area, phase: null, cells: 0 };
    const before = g.lessons.guideCells(area).length;
    const st = g.lessons.stationFor(area);
    if (st) { g.player.x = st.sx + 0.5; g.player.y = st.stand; g.player.z = st.cz + 0.5; }
    g.lessons.update();
    return { area, before, phase: g.lessons.phase[area], cells: g.lessons.guideCells(area).length };
  });
  check('a lesson opens by walking to the stop, not by lighting the answer',
    guides.before === 0, `${guides.before} cells lit before arriving`);
  check('and the squares the blocks go on light up on arrival',
    guides.phase === 'work' && guides.cells > 0, `phase ${guides.phase}, ${guides.cells} cells`);

  // ---- nameplates carry no threat read-out ----
  const subs = await page.evaluate(() => {
    const g = window.__game;
    // stand next to the livestock so they are close enough to be labelled
    const e = [...g.enemyMgr.entities.values()][0];
    if (!e) return null;
    g.player.x = e.x + 1.5; g.player.z = e.z + 1.5;
    g.updateWorldLabels();
    return [...document.querySelectorAll('.world-label')].map((el) => el.textContent);
  });
  check('no creature is labelled HARMLESS in a lesson',
    subs === null || !subs.some((t) => /harmless|hostile|wary|fighting/i.test(t)),
    subs === null ? 'no creatures nearby' : (subs.slice(0, 3).join(' | ') || 'no labels'));

  // ---- and it all comes back on the way out ----
  await page.evaluate(() => window.__game.exitLessonWorld(false));
  await page.waitForTimeout(900);
  const after = await shown(SURVIVAL);
  check('leaving a lesson gives the HUD back', after.every(Boolean),
    SURVIVAL.filter((_, i) => !after[i]).join(',') || 'all back');

  check('no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  console.error('LESSONCHROME ERROR', e);
  fail++;
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

console.log(fail ? `\nLESSONCHROME FAIL (${fail} failed checks)` : `\nLESSONCHROME PASS (${pass} checks)`);
process.exit(fail ? 1 : 0);
