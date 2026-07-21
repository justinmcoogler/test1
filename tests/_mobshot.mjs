// Mob visual-audit harness: node tests/_mobshot.mjs <port> <outdir> <mob1,mob2,...>
// Spawns its own server, frames each mob close-up at a 3/4 angle (first-person
// camera, so nothing else is in frame), and saves
// <outdir>/<mob>-idle.png, -walk.png, -attack.png.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const [port = '8760', outdir = 'tests/screenshots/mobs', list = ''] = process.argv.slice(2);
const mobs = list.split(',').filter(Boolean);
if (!mobs.length) { console.error('no mobs given'); process.exit(1); }
mkdirSync(outdir, { recursive: true });

const server = spawn('node', ['tests/server.mjs', port], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 520 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
try {
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate(() => { document.getElementById('seed-input').value = 'mobaudit'; });
  await page.click('.slot-btn');
  await page.waitForFunction(() => window.__game && !document.getElementById('hud').classList.contains('hidden'), null, { timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const g = window.__game;
    g.disableAggro = true;
    g.settings.classicCamera = false; // first-person: only the mob in frame
    g.applySettings();
    document.getElementById('hud').style.display = 'none';
    document.getElementById('touch-ui')?.classList.add('hidden');
    // empty grass south of the square
    g.player.x = -4.5; g.player.z = 30.5;
    g.player.y = (g.world.groundNear(-5, 30, 65) ?? 65) + 0.02;
    g.player.vx = g.player.vz = 0;
  });

  for (const mob of mobs) {
    const ok = await page.evaluate(([type]) => {
      const g = window.__game;
      for (const id of [...g.enemyMgr.entities.keys()]) g.enemyMgr.entities.delete(id);
      const def = window.__enemies.ENEMY_TYPES[type];
      if (!def) return false;
      let maxY = 0.6, maxR = 0.4;
      for (const b of def.model) { maxY = Math.max(maxY, b.y + b.h); maxR = Math.max(maxR, Math.abs(b.x) + b.w, Math.abs(b.z) + b.d); }
      const e = g.spawnMobNear(type);
      if (!e) return false;
      const p = g.player;
      const d = 1.6 + Math.max(maxY, maxR) * 1.7;
      e.x = p.x; e.z = p.z + d; e.wanderT = 1e9; e.targetX = undefined;
      e.y = g.world.groundNear(Math.floor(e.x), Math.floor(e.z), p.y) ?? p.y;
      e.yaw = Math.PI + 0.7; // 3/4 view toward the camera
      // face the camera at the mob's mid-height
      p.yaw = Math.PI; // looking +z? yaw 0 faces -z, so PI faces +z (south, at the mob)
      const eyeY = p.y + p.eyeHeight;
      p.pitch = Math.atan2((e.y + maxY * 0.55) - eyeY, d);
      g.trailDots = null;
      return true;
    }, [mob]);
    if (!ok) { console.log(`SKIP ${mob} (unknown type)`); continue; }
    await page.waitForTimeout(300);
    for (const pose of ['idle', 'walk', 'attack']) {
      await page.evaluate(([mode]) => {
        const g = window.__game;
        for (const e of g.enemyMgr.entities.values()) {
          e.movingT = mode === 'walk' ? 1e9 : 0;
          if (mode === 'attack') { e.attackT = 1e9; e.attackStart = g.world.time - 0.16; }
          else e.attackT = 0;
          // profile view for attacks so forward lunges/swings read clearly
          e.yaw = Math.PI + (mode === 'attack' ? 1.25 : 0.7);
        }
      }, [pose]);
      await page.waitForTimeout(pose === 'attack' ? 60 : 400);
      await page.screenshot({ path: `${outdir}/${mob}-${pose}.png` });
    }
    console.log(`SHOT ${mob}`);
  }
  console.log('MOBSHOT DONE');
} catch (e) {
  console.error('MOBSHOT ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
