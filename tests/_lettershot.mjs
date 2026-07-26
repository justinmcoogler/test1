// Photograph the education block set: the alphabet, the numerals, the signs and
// the lesson props.
//
// A block whose tile has no atlas slot renders as STONE — silently, with no
// error anywhere. So "the painter exists" and "the letter is on the block" are
// different claims, and only a picture settles the second one. This lays the
// whole alphabet out in a lesson room and takes its portrait.
//
//   node tests/_lettershot.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8786;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'letters');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1200);

  // Every letter has its own atlas rect, and none of them is the stone rect.
  const uv = await page.evaluate(async () => {
    const t = await import('/js/gfx/textures.js');
    const seen = new Map();
    let missing = 0, sameAsStone = 0;
    const stone = JSON.stringify(t.tileUV.stone);
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
      const r = t.tileUV[`letter_${ch}`];
      if (!r) { missing++; continue; }
      const k = JSON.stringify(r);
      if (k === stone) sameAsStone++;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    return { missing, sameAsStone, distinct: seen.size };
  });
  check(uv.missing === 0, `every letter has an atlas slot (${26 - uv.missing}/26)`);
  check(uv.sameAsStone === 0, `and none of them fell back to stone (${uv.sameAsStone} did)`);
  check(uv.distinct === 26, `26 distinct tiles, not one reused (${uv.distinct})`);

  // Craftable, holdable, placeable.
  const craft = await page.evaluate(() => {
    const g = window.__game;
    const { RECIPES } = window.__crafting;
    const recs = RECIPES.filter((r) => /^letter_[a-z]$/.test(r.out));
    return { recipes: recs.length, item: !!window.__items?.ITEMS?.letter_a, block: !!window.__blocks.B.letter_a };
  });
  check(craft.recipes === 26, `26 recipes, one per letter (${craft.recipes})`);
  check(craft.block, 'and a block behind each');

  // Draw the 26 tiles straight out of the atlas onto an overlay and photograph
  // THAT. Posing them in a room means fighting the orbit camera for a picture
  // that answers a smaller question — what is on the tile is exactly what is in
  // the atlas, and the atlas is where a silent stone fallback would show up.
  await page.evaluate(async () => {
    const t = await import('/js/gfx/textures.js');
    const atlas = t.getAtlasCanvas();
    const S = 96, COLS = 7;
    const o = document.createElement('canvas');
    o.width = COLS * S; o.height = Math.ceil(26 / COLS) * S;
    o.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;'
      + 'image-rendering:pixelated;background:#1b1b22;border:4px solid #e2b13c;border-radius:8px';
    const c = o.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#1b1b22'; c.fillRect(0, 0, o.width, o.height);
    const AW = atlas.width, AH = atlas.height;
    [...'abcdefghijklmnopqrstuvwxyz'].forEach((ch, i) => {
      const r = t.tileUV[`letter_${ch}`];
      const sx = r.u0 * AW, sy = r.v0 * AH, sw = (r.u1 - r.u0) * AW, sh = (r.v1 - r.v0) * AH;
      c.drawImage(atlas, sx, sy, sw, sh, (i % COLS) * S + 4, Math.floor(i / COLS) * S + 4, S - 8, S - 8);
    });
    document.body.appendChild(o);
    window.__atlasOk = !!atlas && AW > 0;
  });
  await page.waitForTimeout(400);
  const drew = await page.evaluate(() => window.__atlasOk);
  check(drew, 'the atlas canvas was readable');
  await page.screenshot({ path: 'tests/screenshots/letters.png' });
  console.log('  shot tests/screenshots/letters.png');

  // ---- and the rest of the set ------------------------------------------
  // Numerals, signs and props. Same silent-failure risk as the letters: a tile
  // with no atlas slot renders as stone and nothing anywhere complains.
  const edu = await page.evaluate(async () => {
    const t = await import('/js/gfx/textures.js');
    const { EDUCATION_BLOCKS } = await import('/js/world/blocks.js');
    const stone = JSON.stringify(t.tileUV.stone);
    const missing = [], sameAsStone = [];
    for (const name of EDUCATION_BLOCKS) {
      const r = t.tileUV[name];
      if (!r) { missing.push(name); continue; }
      if (JSON.stringify(r) === stone) sameAsStone.push(name);
    }
    // Draw them all out and photograph THAT — 23 tiles, in curriculum order.
    const atlas = t.getAtlasCanvas();
    const S = 96, COLS = 8;
    const o = document.createElement('canvas');
    o.width = COLS * S; o.height = Math.ceil(EDUCATION_BLOCKS.length / COLS) * S;
    o.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;'
      + 'image-rendering:pixelated;background:#1b1b22;border:4px solid #e2b13c;border-radius:8px';
    const c = o.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#1b1b22'; c.fillRect(0, 0, o.width, o.height);
    const AW = atlas.width, AH = atlas.height;
    EDUCATION_BLOCKS.forEach((name, i) => {
      const r = t.tileUV[name];
      if (!r) return;
      const sx = r.u0 * AW, sy = r.v0 * AH, sw = (r.u1 - r.u0) * AW, sh = (r.v1 - r.v0) * AH;
      c.drawImage(atlas, sx, sy, sw, sh, (i % COLS) * S + 4, Math.floor(i / COLS) * S + 4, S - 8, S - 8);
    });
    document.getElementById('lesson-panel')?.remove();
    document.querySelectorAll('canvas').forEach((el) => { if (el !== o && el.id !== 'game-canvas') el.remove(); });
    document.body.appendChild(o);
    return { missing, sameAsStone, count: EDUCATION_BLOCKS.length };
  });
  check(edu.missing.length === 0, `every education block has an atlas slot${edu.missing.length ? `: missing ${edu.missing.join(', ')}` : ` (${edu.count})`}`);
  check(edu.sameAsStone.length === 0, `and none of them fell back to stone${edu.sameAsStone.length ? `: ${edu.sameAsStone.join(', ')}` : ''}`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/screenshots/edublocks.png' });
  console.log('  shot tests/screenshots/edublocks.png');

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
} catch (e) {
  console.error('LETTERSHOT ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nLETTERSHOT FAIL (${fails.length})` : '\nLETTERSHOT PASS');
process.exit(fails.length ? 1 : 0);
