// Rough perf: frame times while running through the world (SwiftShader CPU rendering,
// so real-GPU numbers will be far better — this catches gross regressions only).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const server = spawn('node', ['tests/server.mjs', '8749'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:8749/');
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'perftest');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  window.__frames = [];
  const g = window.__game;
  let last = performance.now();
  const orig = g.tick.bind(g);
  g.tick = (dt) => { const t0 = performance.now(); orig(dt); window.__frames.push(performance.now() - t0); };
});
await page.keyboard.down('KeyW');
await page.waitForTimeout(6000);
await page.keyboard.up('KeyW');
const stats = await page.evaluate(() => {
  const f = window.__frames.slice(10);
  f.sort((a, b) => a - b);
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  return {
    frames: f.length,
    avgTickMs: +avg.toFixed(2),
    p95TickMs: +f[Math.floor(f.length * 0.95)].toFixed(2),
    meshes: window.__game.renderer.chunkMeshes.size,
    chunks: window.__game.world.chunks.size,
  };
});
console.log(JSON.stringify(stats));
await browser.close();
server.kill();
