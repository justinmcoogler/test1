// Renders the 9 nature-prop models as a thumbnail grid (via renderMobThumb) plus
// an in-world scene of scattered props on grass, to eyeball geometry + textures.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8756;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 360 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'props');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(1200); // let registerProps() finish (async texture decode)

// ---- thumbnail grid ----
const info = await page.evaluate(() => {
  const g = window.__game;
  const ids = ['prop_brownmush', 'prop_purple_mushroom', 'prop_flower1', 'prop_rock3', 'prop_rock4', 'prop_stick_bundle', 'prop_stick_bundle2', 'prop_stick_bundle3', 'prop_wooden_stump'];
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#20242c;display:flex;flex-wrap:wrap;gap:8px;padding:16px;align-content:flex-start';
  document.body.appendChild(wrap);
  const missing = [];
  for (const id of ids) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    if (!g.renderer.renderMobThumb(id, c)) missing.push(id);
    const cell = document.createElement('div'); cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;color:#cbd3e0;font:11px monospace';
    const img = document.createElement('img'); img.src = c.toDataURL(); img.style.cssText = 'width:128px;height:128px;background:#161a20;border-radius:6px;image-rendering:pixelated';
    cell.appendChild(img); const lab = document.createElement('div'); lab.textContent = id.replace('prop_', ''); cell.appendChild(lab); wrap.appendChild(cell);
  }
  return { missing, thumbWrap: true };
});
console.log('missing prop models:', JSON.stringify(info.missing));
await page.waitForTimeout(300);
await page.screenshot({ path: 'tests/screenshots/prop-thumbs.png' });
console.log('shot prop-thumbs');

// ---- in-world scene: teleport to a cluster of naturally-scattered props ----
await page.setViewportSize({ width: 1280, height: 720 });
const spot = await page.evaluate(() => {
  const g = window.__game;
  document.querySelector('div[style*="99999"]')?.remove(); // clear the thumb overlay
  g.disableAggro = true; if (g.enemies) g.enemies.length = 0;
  g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
  g.world.time = 100;
  // generate a swathe and collect scattered prop-node positions
  for (let cx = 2; cx <= 12; cx++) for (let cz = 2; cz <= 12; cz++) g.world.ensureChunk(cx, cz);
  const props = [];
  for (const [, c] of g.world.chunks) for (const n of c.nodes) if (n.def?.kind === 'prop') props.push(n);
  // pick the prop with the most neighbours within 6 blocks (a natural cluster)
  let best = props[0], bestN = -1;
  for (const p of props) {
    let k = 0; for (const q of props) { const dx = p.x - q.x, dz = p.z - q.z; if (dx * dx + dz * dz <= 36) k++; }
    if (k > bestN) { bestN = k; best = p; }
  }
  return best ? { x: best.x, y: best.y, z: best.z, count: props.length, cluster: bestN } : null;
});
console.log('prop cluster:', JSON.stringify(spot));
if (spot) {
  await page.evaluate(([x, y, z]) => {
    const g = window.__game;
    g.player.x = x + 0.5; g.player.y = y + 0.02; g.player.z = z + 6.5; g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = 0; g.player.pitch = -0.22; g.player.dead = false;
  }, [spot.x, spot.y, spot.z]);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'tests/screenshots/prop-world.png' });
  console.log('shot prop-world');
}

await browser.close();
server.kill();
