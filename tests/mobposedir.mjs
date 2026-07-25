// Which way do the ambient clips actually move the head? Transforms a point at
// the front of the head through the pose matrix and compares its height to idle.
// graze/peck/sniff must lower the muzzle; howl must raise it.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const PORT = 8771;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 700, height: 500 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/`);
await page.evaluate(() => { document.getElementById('seed-input').value = 'posedir'; });
await page.click('.slot-btn');
await page.waitForFunction(() => window.__game && !document.getElementById('hud').classList.contains('hidden'), null, { timeout: 60000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(async () => {
  const r = window.__game.renderer;
  const { evaluatePose } = await import('./js/game/mobloader.js');
  const { MOB_REMAKES } = await import('./js/game/mobremakes/index.js');
  const CASES = [['cow', 'graze', 1.4], ['sheep', 'graze', 1.4], ['horse', 'graze', 1.4],
    ['chicken', 'peck', 0.16], ['rabbit', 'sniff', 0.2], ['goat', 'graze', 1.4]];
  const res = [];
  for (const [type, clip, t] of CASES) {
    const m = r.modelCache.get(type);
    if (!m?.animations?.[clip]) { res.push({ type, clip, err: 'clip missing' }); continue; }
    // a point at the very front of the head, in model space
    const def = MOB_REMAKES[type];
    const head = def?.parts.find((p) => p.id === 'head');
    if (!head) { res.push({ type, clip, err: 'no head part' }); continue; }
    const bx = head.boxes[0];
    const nose = [bx.from[0] + bx.size[0] / 2, bx.from[1] + bx.size[1] / 2, bx.from[2] + bx.size[2]];
    const apply = (mat) => mat
      ? [mat[0] * nose[0] + mat[4] * nose[1] + mat[8] * nose[2] + mat[12],
        mat[1] * nose[0] + mat[5] * nose[1] + mat[9] * nose[2] + mat[13],
        mat[2] * nose[0] + mat[6] * nose[1] + mat[10] * nose[2] + mat[14]]
      : nose;
    const idle = apply(evaluatePose(m, 'idle', 0.4)?.head);
    const posed = apply(evaluatePose(m, clip, t)?.head);
    res.push({ type, clip, dY: +(posed[1] - idle[1]).toFixed(3), dZ: +(posed[2] - idle[2]).toFixed(3) });
  }
  return res;
});
let bad = 0;
for (const c of out) {
  if (c.err) { console.log(`${c.type}/${c.clip}: ${c.err}`); bad++; continue; }
  const wantDown = c.clip !== 'howl';
  const ok = wantDown ? c.dY < -0.05 : c.dY > 0.05;
  if (!ok) bad++;
  console.log(`${c.type.padEnd(8)} ${c.clip.padEnd(6)} muzzle dY=${String(c.dY).padStart(7)} dZ=${String(c.dZ).padStart(7)}  ${ok ? 'ok' : (wantDown ? 'WRONG WAY (should drop)' : 'WRONG WAY (should rise)')}`);
}
console.log(bad ? `POSE DIR FAIL (${bad})` : 'POSE DIR PASS');
await browser.close(); server.kill();
process.exit(bad ? 1 : 0);
