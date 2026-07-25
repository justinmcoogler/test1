// Visual audit of the shipping roster: renders every roster mob in every clip
// (idle / walk / its ambient) onto one labelled contact sheet, and reports any
// mob whose silhouette is suspiciously small, off-centre or clipped.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 8769;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/`);
await page.evaluate(() => { document.getElementById('seed-input').value = 'audit'; });
await page.click('.slot-btn');
await page.waitForFunction(() => window.__game && !document.getElementById('hud').classList.contains('hidden'), null, { timeout: 60000 });
await page.waitForTimeout(1500);

const result = await page.evaluate(async () => {
  const g = window.__game, r = g.renderer;
  const { evaluatePose } = await import('./js/game/mobloader.js');
  const ROSTER = ['cow', 'pig', 'sheep', 'goat', 'horse', 'chicken', 'duck', 'rabbit', 'wolf',
    'rat', 'bob', 'goblin', 'zombie', 'spider'];
  const CELL = 150, PAD = 20;
  const cols = 3;                                   // idle | walk | ambient
  const sheet = document.createElement('canvas');
  sheet.width = PAD + cols * (CELL + PAD);
  sheet.height = PAD + ROSTER.length * (CELL + PAD);
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#191d23'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = '13px monospace'; ctx.textBaseline = 'top';

  const tmp = document.createElement('canvas'); tmp.width = tmp.height = CELL;
  const t2d = tmp.getContext('2d');
  const notes = [];

  ROSTER.forEach((type, row) => {
    const model = r.modelCache.get(type);
    const ambName = model?.ambient ? (model.ambient.clips || [model.ambient.clip])[0] : null;
    // sample each clip at the point where it's most extended
    const clips = [['idle', 0.4], ['walk', 0.18], [ambName || 'idle', ambName ? 1.4 : 0.4]];
    clips.forEach(([clip, t], col) => {
      t2d.clearRect(0, 0, CELL, CELL);
      const pose = model?.animations?.[clip] ? evaluatePose(model, clip, t) : null;
      r.renderMobThumb(type, tmp, 2.3, 0.22, pose);
      const x = PAD + col * (CELL + PAD), y = PAD + row * (CELL + PAD);
      ctx.drawImage(tmp, x, y);
      ctx.strokeStyle = '#3a424e'; ctx.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
      ctx.fillStyle = col === 2 && ambName ? '#e2b13c' : '#a8b0bc';
      ctx.fillText(col === 0 ? `${type}` : clip, x + 4, y + 3);

      // measure the drawn silhouette: how much of the cell it fills, and where
      const px = t2d.getImageData(0, 0, CELL, CELL).data;
      let minX = CELL, maxX = 0, minY = CELL, maxY = 0, hit = 0;
      for (let p = 0; p < CELL * CELL; p++) {
        if (px[p * 4 + 3] > 24) {
          hit++;
          const ix = p % CELL, iy = (p / CELL) | 0;
          if (ix < minX) minX = ix; if (ix > maxX) maxX = ix;
          if (iy < minY) minY = iy; if (iy > maxY) maxY = iy;
        }
      }
      const fill = hit / (CELL * CELL);
      if (hit === 0) notes.push(`${type}/${clip}: NOTHING DREW`);
      else {
        if (fill < 0.035) notes.push(`${type}/${clip}: tiny in frame (${(fill * 100).toFixed(1)}% fill)`);
        if (minX <= 1 || maxX >= CELL - 2 || minY <= 1 || maxY >= CELL - 2) {
          notes.push(`${type}/${clip}: touches the frame edge (may be clipped)`);
        }
      }
    });
  });
  return { png: sheet.toDataURL('image/png'), notes };
});

writeFileSync('tests/screenshots/roster-audit.png', Buffer.from(result.png.split(',')[1], 'base64'));
console.log(result.notes.length ? 'NOTES:\n  ' + result.notes.join('\n  ') : 'no geometry warnings');
console.log('sheet -> tests/screenshots/roster-audit.png');
await browser.close(); server.kill();
