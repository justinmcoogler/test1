// Photograph the ground cover: mushrooms (now real boxes) and every flower.
//
//   node tests/_plantshots.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const PORT = 8797;
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
  await page.fill('#seed-input', 'plants');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

  const info = await page.evaluate(() => {
    const g = window.__game, B = window.__blocks.B, W = g.world;
    const cx = Math.floor(g.player.x) + 5, cz = Math.floor(g.player.z);
    const y = W.surfaceAt(cx, cz);
    const row = ['mushroom_cap', 'mushroom_brown', 'allium', 'orange_tulip', 'pink_tulip',
      'white_tulip', 'oxeye_daisy', 'blue_orchid', 'rose_bush', 'tall_grass', 'wildflower'];
    for (let i = 0; i < row.length; i++) {
      for (let d = 0; d < 2; d++) {
        const x = cx + i * 2, z = cz + d * 2;
        for (let k = 1; k < 4; k++) W.setBlock(x, y + k, z, B.air, true);
        W.setBlock(x, y, z, B.grass, true);
        W.setBlock(x, y + 1, z, B[row[i]], true);
      }
    }
    g.player.x = cx + 10.5; g.player.y = y + 1; g.player.z = cz - 3.5;
    g.player.yaw = Math.PI; g.player.pitch = -0.3;
    g.camYaw = Math.PI;
    g.world.time = 120;
    for (let ax = (cx - 24) >> 4; ax <= (cx + 34) >> 4; ax++) {
      for (let az = (cz - 24) >> 4; az <= (cz + 24) >> 4; az++) {
        g.world.ensureChunk(ax, az); g.renderer.remeshChunk(g.world, ax, az);
      }
    }
    return { cx, cz, y };
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/plants-row.png` });

  // A close crouch on the two mushrooms, from an angle — the whole point of
  // giving them boxes is that they hold up when you are NOT square on.
  await page.evaluate(({ cx, cz, y }) => {
    const g = window.__game;
    g.player.x = cx - 1.4; g.player.y = y + 1; g.player.z = cz - 1.4;
    g.player.yaw = Math.PI * 1.25; g.player.pitch = -0.55;
    g.camYaw = Math.PI * 1.25;
  }, info);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/plants-mushrooms.png` });

  console.log(errors.length ? `console errors: ${errors.slice(0, 4).join(' | ')}` : 'no console errors');
} catch (err) {
  console.error('SHOTS ERROR', err);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
