// No two HUD boxes may sit on top of each other, at any window size, on any
// device, at any accessibility scale.
//
//   node tests/hud.mjs
//
// This is a rule the HUD kept breaking quietly, because every box was pinned at
// a hard-coded offset — a number that can only ever be right for one window at
// one UI scale. Turning the text up for a child who needs it put the weather
// badge inside the minimap; the FPS chip clipped the compass at EVERY desktop
// size; and the menu buttons swallowed the hotbar at 1100px. None of it failed a
// test, because nothing was measuring. This measures.
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8783;
const HUD = ['vitals', 'compass-wrap', 'fps-badge', 'minimap', 'env-badge', 'quest-tracker',
  'hotbar', 'menu-buttons', 'toasts'];

// Every accessibility scale the Settings sliders allow, at their extremes — the
// combinations a parent actually reaches for, not just the default.
const SCALES = [[1, 1], [1.6, 1.4], [0.7, 0.8], [1, 1.4], [1.4, 1]];

const CASES = [
  { name: 'desktop wide', viewport: { width: 1600, height: 1000 } },
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'small window', viewport: { width: 1024, height: 640 } },
  { name: 'narrow window', viewport: { width: 820, height: 560 } },
  { name: 'tablet portrait', viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true },
  { name: 'tablet landscape', viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
];

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});

// Returns [] when nothing overlaps and nothing has been pushed off screen.
const probe = (ids) => {
  const boxes = ids.map((id) => {
    const el = document.getElementById(id);
    if (!el || el.classList.contains('hidden') || !el.offsetParent) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { id, ...r.toJSON() } : null;
  }).filter(Boolean);
  const out = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 0.5 && oy > 0.5) out.push(`${a.id}×${b.id} ${Math.round(ox)}×${Math.round(oy)}px`);
    }
  }
  for (const b of boxes) {
    if (b.right > innerWidth + 1 || b.bottom > innerHeight + 1 || b.left < -1 || b.top < -1) {
      out.push(`${b.id} off-screen`);
    }
  }
  return out;
};

try {
  for (const c of CASES) {
    const ctx = await browser.newContext({
      viewport: c.viewport,
      hasTouch: !!c.hasTouch,
      isMobile: !!c.isMobile,
      ...(c.isMobile ? { userAgent: devices['Pixel 5'].userAgent } : {}),
    });
    const page = await ctx.newPage();
    try {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
      await page.evaluate(() => localStorage.clear());
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
      await page.waitForSelector('.slot-btn');
      await page.fill('#seed-input', 'hud');
      await page.locator('.slot-btn').first().click();
      await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
      await page.evaluate(() => window.__game.ui.closeWindow());
      await page.waitForTimeout(1400);   // let the env badge and tracker populate

      const bad = [];
      for (const [ui, text] of SCALES) {
        await page.evaluate(([u, t]) => {
          const g = window.__game;
          g.settings.uiScale = u; g.settings.textScale = t;
          g.applySettings();
        }, [ui, text]);
        await page.waitForTimeout(200);
        const hits = await page.evaluate(probe, HUD);
        if (hits.length) bad.push(`ui=${ui}/text=${text}: ${hits.join(', ')}`);
      }
      check(`${c.name} (${c.viewport.width}×${c.viewport.height}) HUD never overlaps`,
        bad.length === 0, bad.slice(0, 3).join(' | '));
    } finally {
      await ctx.close();
    }
  }
} catch (e) {
  console.error('HUD ERROR', e);
  fail++;
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

console.log(fail ? `\nHUD FAIL (${fail} failed checks)` : `\nHUD PASS (${pass} checks)`);
process.exit(fail ? 1 : 0);
