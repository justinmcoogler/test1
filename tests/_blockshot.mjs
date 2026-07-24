// Places a grid of the new P1–P4 schematic-import blocks on a flat pad and views
// them, to confirm the placeholder procedural art renders (not grey/broken).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8758;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.slot-btn');
await page.fill('#seed-input', 'blocks');
await page.click('.slot-btn');
await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });

const P = await page.evaluate(() => {
  const g = window.__game, B = window.__blocks.B;
  g.disableAggro = true; if (g.enemies) g.enemies.length = 0;
  g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
  g.world.time = 100;
  const CR = 7;
  for (let cx = CR - 1; cx <= CR + 3; cx++) for (let cz = CR - 1; cz <= CR + 3; cz++) g.world.ensureChunk(cx, cz);
  const surf = (x, z) => { for (let y = 100; y > 40; y--) if (g.world.getBlock(x, y, z) !== B.air) return y; return 62; };
  const X0 = CR * 16 + 2, Z = CR * 16 + 2;
  const Y = surf(X0 + 6, Z) + 1;
  const blocks = ['glowstone', 'sea_lantern', 'redstone_lamp', 'shroomlight', 'jack_o_lantern', 'ochre_froglight', 'verdant_froglight', 'pearlescent_froglight',
    'netherrack', 'end_stone', 'end_stone_bricks', 'red_nether_bricks', 'tuff_bricks', 'polished_tuff', 'gilded_blackstone', 'magma_block',
    'soul_sand', 'soul_soil', 'bone_block', 'nether_wart_block', 'warped_wart_block', 'sculk', 'amethyst_block', 'budding_amethyst',
    'diamond_block', 'emerald_block', 'lapis_block', 'redstone_block', 'netherite_block', 'diamond_ore', 'emerald_ore', 'lapis_ore', 'redstone_ore',
    'pumpkin', 'carved_pumpkin', 'melon'];
  // flatten a pad
  for (let x = X0 - 2; x <= X0 + 26; x++) for (let z = Z - 3; z <= Z + 6; z++) g.world.setBlock(x, Y - 1, z, B.grass);
  // lay blocks in a 2-deep grid, one gap between
  let i = 0;
  for (let row = 0; row < 2; row++) for (let col = 0; col < 18 && i < blocks.length; col++, i++) {
    g.world.setBlock(X0 + col * 1.5 | 0, Y, Z + row * 2, B[blocks[i]]);
  }
  for (let cx = CR - 1; cx <= CR + 3; cx++) for (let cz = CR - 1; cz <= CR + 3; cz++) if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
  const missing = blocks.filter((b) => B[b] === undefined);
  return { X0, Z, Y, missing };
});
console.log('missing blocks:', JSON.stringify(P.missing));
await page.evaluate(([X0, Y, Z]) => {
  const g = window.__game;
  g.player.x = X0 + 13; g.player.y = Y + 3.6; g.player.z = Z + 12; g.player.vx = g.player.vy = g.player.vz = 0;
  g.player.yaw = 0; g.player.pitch = -0.5; g.player.dead = false;
}, [P.X0, P.Y, P.Z]);
await page.waitForTimeout(700);
await page.screenshot({ path: 'tests/screenshots/new-blocks.png' });
console.log('shot new-blocks');
await browser.close();
server.kill();
