// Photograph a wheat field at every stage, and a reed bed.
//
//   node tests/_cropshots.mjs
//
// "It renders" and "it looks like wheat" are different claims and only one of
// them can be asserted. This plants a row of every growth stage side by side and
// stands in front of it, so a person can look at the eight and say whether they
// read as a crop ripening.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const PORT = 8795;
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
  await page.fill('#seed-input', 'crops');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

  const info = await page.evaluate(() => {
    const g = window.__game, B = window.__blocks.B, W = g.world;
    const cx = Math.floor(g.player.x) + 6, cz = Math.floor(g.player.z);
    const y = W.surfaceAt(cx, cz);
    // A flat plot, one column per stage, plus a plain grass strip in front so
    // the crop's height and inset can be judged against something.
    const stages = ['crop_young', 'wheat_1', 'wheat_2', 'wheat_3', 'wheat_4', 'wheat_5', 'wheat_6', 'crop_ripe'];
    for (let i = 0; i < stages.length; i++) {
      for (let d = 0; d < 3; d++) {
        const x = cx + i * 2, z = cz + d;
        for (let k = 1; k < 4; k++) W.setBlock(x, y + k, z, B.air, true);
        W.setBlock(x, y, z, B.farmland, true);
        W.setBlock(x, y + 1, z, B[stages[i]], true);
        W.setBlock(x + 1, y, z, B.farmland, true);
        for (let k = 1; k < 4; k++) W.setBlock(x + 1, y + k, z, B.air, true);
      }
    }
    // A reed bed beside it: a strip of water with 1-, 2- and 3-tall stands.
    const rz = cz + 7;
    for (let x = cx - 2; x < cx + 18; x++) {
      for (let z = rz; z < rz + 3; z++) {
        W.setBlock(x, y, z, B.water, true);
        for (let k = 1; k < 4; k++) W.setBlock(x, y + k, z, B.air, true);
      }
      W.setBlock(x, y, rz + 3, B.sand, true);
      for (let k = 1; k < 4; k++) W.setBlock(x, y + k, rz + 3, B.air, true);
      const tall = 1 + ((x + 60) % 3);
      for (let s = 0; s < tall; s++) {
        W.setBlock(x, y + 1 + s, rz + 3, s === tall - 1 ? B.reed_top : B.reed, true);
      }
    }
    g.player.x = cx + 7.5; g.player.y = y + 1; g.player.z = cz - 4.5;
    g.player.yaw = Math.PI; g.player.pitch = -0.16;
    g.camYaw = Math.PI;
    g.world.time = 120;                       // midday, so nothing is in shadow
    for (let ax = (cx - 24) >> 4; ax <= (cx + 30) >> 4; ax++) {
      for (let az = (cz - 24) >> 4; az <= (cz + 30) >> 4; az++) {
        g.world.ensureChunk(ax, az); g.renderer.remeshChunk(g.world, ax, az);
      }
    }
    return { cx, cz, y };
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/crops-wheat-row.png` });
  console.log('wheat row', JSON.stringify(info));

  // Now stand at the reed bed and look along it.
  await page.evaluate(({ cx, cz, y }) => {
    const g = window.__game;
    g.player.x = cx + 7.5; g.player.y = y + 1; g.player.z = cz + 14.5;
    g.player.yaw = 0; g.player.pitch = -0.1;                 // back toward −Z
    g.camYaw = 0;
  }, info);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/crops-reed-bed.png` });

  // And a close crouch on one ripe plant, to judge the hash geometry itself.
  await page.evaluate(({ cx, cz, y }) => {
    const g = window.__game;
    g.player.x = cx + 14.5; g.player.y = y + 1; g.player.z = cz - 1.6;
    g.player.yaw = Math.PI; g.player.pitch = -0.35;
    g.camYaw = Math.PI;
  }, info);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/crops-ripe-close.png` });

  console.log(errors.length ? `console errors: ${errors.slice(0, 4).join(' | ')}` : 'no console errors');
} catch (err) {
  console.error('SHOTS ERROR', err);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
