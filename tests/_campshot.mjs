// Photograph the camp. Everything else about the camp is proved by flood fill,
// which tells you the tent is enterable and tells you nothing whatsoever about
// whether it reads as a tent.
//
// yaw convention: forward = (-sin yaw, cos yaw); yaw=π looks -Z(N),
// +π/2 looks -X(W), -π/2 looks +X(E), 0 looks +Z(S).
//
//   node tests/_campshot.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8779;
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// Stand at (px,py,pz) and LOOK AT (tx,ty,tz). Aiming by eye with raw yaw/pitch
// numbers is how the first run of this file came back with six photographs of a
// forest that the camp was not in.
function aim(px, py, pz, tx, ty, tz) {
  const dx = tx - px, dy = ty - (py - 1.62), dz = tz - pz;
  // `-dx` on a dead-ahead shot is NEGATIVE ZERO, and atan2(-0, negative) is −π
  // where atan2(0, negative) is +π. The two are the same direction and the
  // camera's shortest-path smoothing does not agree: every perfectly
  // axis-aligned shot came back pointing the opposite way.
  return [Math.atan2(dx === 0 ? 0 : -dx, dz), Math.atan2(dy, Math.hypot(dx, dz))];
}

async function shot(name, px, py, pz, yaw, pitch) {
  await page.evaluate(async ([px, py, pz, yaw, pitch]) => {
    const g = window.__game;
    const box = (bx, bz, r, fn) => {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) fn(Math.floor(bx / 16) + dx, Math.floor(bz / 16) + dz);
    };
    box(px, pz, 6, (cx, cz) => g.world.ensureChunk(cx, cz));
    box(4, 4, 4, (cx, cz) => g.world.ensureChunk(cx, cz));
    // player.debug is the game's own fly/noclip mode. Without it the camera is
    // in free fall for the whole exposure and every high shot comes back
    // photographing the treetops it landed in.
    g.player.debug = true;
    g.player.x = px; g.player.y = py - 1.62; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = yaw; g.player.pitch = pitch; g.player.dead = false;
    // The renderer does not look through player.yaw — it looks through the orbit
    // camera (camYaw/camPitch/camDist), which lags the player and sits behind
    // them. Setting only the player is why the first three attempts at this file
    // came back with six photographs of somewhere else.
    g.camYaw = yaw; g.camPitch = pitch; g.camDist = 0;
    g.settings.classicCamera = false;
    g.world.dirtyChunks.clear();
    box(4, 4, 4, (cx, cz) => { if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz); });
    box(px, pz, 6, (cx, cz) => { if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz); });
  }, [px, py, pz, yaw, pitch]);
  // The orbit camera EASES toward camYaw/camPitch, so one assignment plus a wait
  // leaves it still on its way and the shot comes out aimed short of the target.
  // Set, let the chunks mesh, set again, and only then open the shutter.
  await page.waitForTimeout(700);
  await page.evaluate(([px, py, pz, yaw, pitch]) => {
    const g = window.__game;
    g.player.x = px; g.player.y = py - 1.62; g.player.z = pz;
    g.player.vx = g.player.vy = g.player.vz = 0;
    g.player.yaw = yaw; g.player.pitch = pitch;
    g.camYaw = yaw; g.camPitch = pitch; g.camDist = 0;
  }, [px, py, pz, yaw, pitch]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `tests/screenshots/camp-${name}.png` });
  console.log('shot', name);
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'campshot');
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => {
    const g = window.__game;
    g.disableAggro = true;
    g.weather.current = 'clear'; g.weather.intensity = 0; g.weather.update = () => {};
    g.world.time = 100;   // full daylight, nothing fogging the shot
  });
  await page.waitForTimeout(1200);

  // The camp sits around the fire at (4,4), plateau surface y=64, standing level
  // 65. Your tent is west at (-2,7), Maren's north at (1,-2), the stores tent
  // north-east at (9,0).
  const FIRE = [4.5, 65.5, 4.5];
  for (const [name, cam, target] of [
    // All framed from the WEST side. The orbit camera only settles where it is
    // told when the shot has a strong +X component; aim it north or north-west
    // and it comes back facing somewhere else entirely, which is worth knowing
    // before you spend an afternoon believing the camp had not generated.
    ['west', [-22, 72, 8], FIRE],                       // the whole camp side-on
    ['west-high', [-26, 84, 22], FIRE],                 // the layout, 3/4 from above
    ['tent', [-14, 68, 12], [-2.5, 67, 7]],             // your tent, from outside its west wall
    ['tent-in', [-9, 66.4, 8], [-2.5, 65.6, 7]],        // low, looking down the tent at the bedroll
    ['stores', [-6, 70, -4], [9.5, 67, 0]],             // across the fire to the stores tent
    ['maren', [-9, 68, -6], [1.5, 67, -2]],             // Maren's tent from the west
  ]) {
    await shot(name, cam[0], cam[1], cam[2], ...aim(...cam, ...target));
  }
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' •', e)); }
} finally {
  await browser.close();
  server.kill();
}
