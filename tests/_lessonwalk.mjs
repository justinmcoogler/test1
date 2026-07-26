// Walk a lesson.
//
// The unit suite proves the runner's bookkeeping against a fake world. This
// drives the real game down the real path: start the Kindergarten egg hunt, WALK
// (on the keyboard, not by teleport) until Pip's first stop registers, do each
// station's activity, and check that the two stations which bar the trail
// actually open it — a mended gate that is still solid, or stepping stones that
// never land, would leave a five-year-old walking into a wall.
//
// It also photographs every stop, because "the meadow is there" and "the meadow
// looks like a meadow" are different claims.
//
//   node tests/_lessonwalk.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8791;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'lessonwalk');
  await page.locator('.slot-btn').first().click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(1000);
  const home = await page.evaluate(() => {
    const g = window.__game;
    g.education.setMode('education');
    return { x: g.player.x, y: g.player.y, z: g.player.z };
  });

  // ---- into the lesson, from the menu ------------------------------------
  await page.evaluate(() => window.__game.enterLearningMode());
  await page.waitForSelector('[data-start="k_count"]', { timeout: 10000 });
  await page.click('[data-start="k_count"]');
  await page.waitForTimeout(1200);

  const arrived = await page.evaluate(() => {
    const g = window.__game;
    const st = g.lessons.stationFor('grade_k');
    return {
      lesson: g.lessons.current.grade_k,
      phase: g.lessons.phase.grade_k,
      onPath: !!g.world.lessonPath,
      stations: g.lessons.pathOf('k_count').stations.length,
      at: [Math.round(g.player.x), Math.round(g.player.y), Math.round(g.player.z)],
      firstStation: [st.sx, st.stand, st.cz],
      // Standing on the trail, in the open air, with no camp anywhere near it.
      under: g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) - 1, Math.floor(g.player.z)),
      sky: g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) + 4, Math.floor(g.player.z)),
      campfire: g.world.getBlock(4, 65, 4),
      prompt: document.querySelector('#lesson-panel .lesson-prompt')?.textContent || '',
      stepLine: document.querySelector('#lesson-panel .lesson-step')?.textContent || '',
      tracker: !document.getElementById('quest-tracker').classList.contains('hidden'),
    };
  });
  check(arrived.lesson === 'k_count', `the egg hunt started (${arrived.lesson})`);
  check(arrived.onPath, 'and it built a PATH, not a classroom');
  check(arrived.stations === 7, `seven stops along it (${arrived.stations})`);
  check(arrived.phase === 'travel', `you begin by walking, not working (phase=${arrived.phase})`);
  check(arrived.under !== 0, 'standing on the trail');
  check(arrived.sky === 0, 'in the open air — no ceiling');
  check(arrived.campfire === 0, 'and your camp does not exist in this world');
  check(arrived.tracker === false, 'and the quest tracker is gone — there is no Maren to talk to here');
  check(/path|grass/i.test(arrived.prompt), `the panel points you down the path ("${arrived.prompt.slice(0, 48)}…")`);
  check(arrived.at[0] < arrived.firstStation[0], 'you start short of the first stop, not on it');
  await page.screenshot({ path: 'tests/screenshots/walk-1-start.png' });

  // ---- actually walk ------------------------------------------------------
  // On the keyboard, down the trail. This is the one thing a teleport cannot
  // prove: that the ground is walkable and arriving at a stop is what starts it.
  // Forward is (-sin yaw, -cos yaw), so -PI/2 points down the trail at +X.
  await page.evaluate(() => { window.__game.player.yaw = -Math.PI / 2; window.__game.camYaw = -Math.PI / 2; });
  await page.keyboard.down('KeyW');
  let walked = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    walked = await page.evaluate(() => ({
      phase: window.__game.lessons.phase.grade_k,
      x: window.__game.player.x,
      y: window.__game.player.y,
    }));
    if (walked.phase === 'work') break;
  }
  await page.keyboard.up('KeyW');
  check(walked.phase === 'work', `walking to the long grass started the hunt (phase=${walked.phase})`);
  check(walked.x > arrived.at[0] + 2, `you moved down the trail on your own legs (x ${arrived.at[0]} → ${Math.round(walked.x)})`);
  check(Math.abs(walked.y - arrived.at[1]) < 2, 'and stayed on the ground the whole way');
  const atGrass = await page.evaluate(() => ({
    prompt: document.querySelector('#lesson-panel .lesson-prompt')?.textContent || '',
    eggs: (() => {
      const g = window.__game, B = window.__blocks.B;
      const st = g.lessons.stationFor('grade_k');
      let n = 0;
      for (let x = st.sx - 8; x <= st.sx + 8; x++) {
        for (let z = st.cz - 5; z <= st.cz + 16; z++) if (g.world.getBlock(x, st.stand, z) === B.nest_egg) n++;
      }
      return n;
    })(),
  }));
  check(/find|pick up/i.test(atGrass.prompt), `arriving changed the prompt to the job ("${atGrass.prompt.slice(0, 40)}…")`);
  check(atGrass.eggs >= 3, `and there are eggs hidden in the grass to find (${atGrass.eggs})`);
  await page.screenshot({ path: 'tests/screenshots/walk-2-grass.png' });

  // ---- do every station ---------------------------------------------------
  const doStations = async (from, to) => page.evaluate(async ([from, to]) => {
    const g = window.__game, B = window.__blocks.B;
    const { solveShape } = await import('/js/game/buildshapes.js');
    const log = [], bad = [];
    const barriers = [];
    for (let i = from; i < to; i++) {
      const st = g.lessons.stationFor('grade_k');
      if (!st) { bad.push(`no station at step ${i + 1}`); break; }
      // Walk up to it (teleport for speed — the keyboard walk above proved the
      // ground works; this is about the activities).
      g.player.respawnAt(st.sx + 0.5, st.stand, st.cz + 0.5);
      // A real child walks here, streaming chunks as they go; a teleport has to
      // load them by hand or every setBlock lands in a chunk that is not there.
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        g.world.ensureChunk((st.sx >> 4) + dx, (st.cz >> 4) + dz);
      }
      g.lessons.update();
      if (g.lessons.phase.grade_k !== 'work') { bad.push(`${st.kind}: arriving did not start the work`); break; }

      // Before: is the way blocked?
      const barred = st.barrier ? (st.barrier.kind === 'gate'
        ? g.world.getBlock(st.barrier.x, st.stand, st.cz) !== 0
        : g.world.getBlock(st.barrier.x0, st.floor, st.cz) === 0) : null;

      const step = g.lessons.activeStep('grade_k');
      const mat = g.lessons.matFor('grade_k');
      for (const op of solveShape(step.build, mat)) {
        if (op.op === 'give') {
          // A hunt: break the scattered eggs, which is how a child picks them up.
          let got = 0;
          for (let x = st.sx - 8; x <= st.sx + 8 && got < op.n; x++) {
            for (let z = st.cz - 5; z <= st.cz + 16 && got < op.n; z++) {
              if (g.world.getBlock(x, st.stand, z) === B[op.block]) {
                g.world.setBlock(x, st.stand, z, B.air, true);
                g.inventory.add(op.block, 1);
                got++;
                g.lessons.onWatch('blockBroken');
              }
            }
          }
          if (got < op.n) bad.push(`${st.kind}: only ${got} of ${op.n} eggs were findable`);
        } else if (op.op === 'break') {
          g.world.setBlock(op.x, op.y, op.z, B.air, true);
          g.lessons.onWatch('blockBroken');
        } else {
          g.world.setBlock(op.x, op.y, op.z, B[op.block], true);
          g.lessons.onWatch('blockPlaced');
        }
      }
      // After: did the way open?
      if (st.barrier) {
        const open = st.barrier.kind === 'gate'
          ? g.world.getBlock(st.barrier.x, st.stand, st.cz) === 0
          : g.world.getBlock(st.barrier.x0, st.floor, st.cz) === B.cobble;
        barriers.push({ kind: st.barrier.kind, barred, open });
      }
      const shown = Object.entries({ nest_egg: 0, apple_red: 0, apple_green: 0, lantern_lit: 0,
        lantern_dark: 0, digit_3: 0, sym_plus: 0, planks: 0, cobble: 0 })
        .map(([b]) => {
          let n = 0;
          if (mat) for (let x = mat.x0; x <= mat.x1; x++) for (let y = mat.y0; y <= mat.y1; y++) {
            for (let z = mat.z0; z <= mat.z1; z++) if (g.world.getBlock(x, y, z) === B[b]) n++;
          }
          return n ? `${b}=${n}` : null;
        }).filter(Boolean).join(' ');
      log.push(`${String(i + 1)}. ${st.kind.padEnd(8)} ${step.build.kind.padEnd(7)} on plot: ${shown || '(none)'} → step=${g.lessons.step.grade_k}`);
      if (i < 6 && g.lessons.step.grade_k !== i + 1) { bad.push(`${st.kind}: step did not complete`); break; }
    }
    return {
      log, bad, barriers,
      passed: (g.education.lessonsDone.k_count || []).some((a) => a.passed),
      bank: g.education.balanceMinutes(),
      coins: g.inventory.count('coin'),
      next: g.lessons.current.grade_k,
    };
  }, [from, to]);

  // Photograph each stop as a child first sees it — empty plot, nothing built —
  // BEFORE any of the work is done. (Shooting them afterwards used to catch the
  // path already gone: finishing the last station swaps the whole world for the
  // next lesson's, and the camera ends up in blue nothing.)
  // The panel lives in the top centre of the screen, which is exactly where the
  // thing being photographed is. Hide it for the scenery shots and put it back.
  const shoot = async (kind, tag, opts = {}) => {
    await page.evaluate(([k, o]) => {
      const g = window.__game;
      const st = g.lessons.pathOf('k_count').stations.find((s) => s.kind === k);
      const panel = document.getElementById('lesson-panel');
      if (panel) panel.style.display = 'none';
      g.player.debug = true;                        // fly, so the camera holds still
      g.player.respawnAt(st.sx + 0.5 + (o.dx || 0), st.stand + (o.up ?? 7), st.cz - (o.back ?? 15));
      const pitch = o.pitch ?? -0.42;
      g.player.yaw = Math.PI; g.player.pitch = pitch;
      g.camYaw = Math.PI; g.camPitch = pitch; g.camDist = 0;
      for (let dz = -2; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        g.world.ensureChunk((st.sx >> 4) + dx, (st.cz >> 4) + dz);
        g.renderer.remeshChunk(g.world, (st.sx >> 4) + dx, (st.cz >> 4) + dz);
      }
    }, [kind, opts]);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `tests/screenshots/walk-${tag}.png` });
    await page.evaluate(() => {
      const panel = document.getElementById('lesson-panel');
      if (panel) panel.style.display = '';
    });
    console.log(`  shot tests/screenshots/walk-${tag}.png`);
  };
  for (const kind of ['nest', 'book', 'gate', 'stream', 'orchard', 'cottage']) await shoot(kind, kind);
  // And one down the length of the trail, so the shape of the whole lesson reads.
  await shoot('gate', 'trail', { up: 16, back: 26, pitch: -0.5, dx: -6 });
  await page.evaluate(() => { window.__game.player.debug = false; });

  // ---- now do the work ----------------------------------------------------
  const run = await doStations(0, 6);
  for (const line of run.log) console.log(`       ${line}`);
  for (const b of run.bad) console.log(`  !!   ${b}`);
  check(run.log.length === 6, `the first six stations were reached and worked (${run.log.length})`);
  check(run.bad.length === 0, `with nothing going wrong on the way (${run.bad.length} problems)`);
  for (const b of run.barriers) {
    check(b.barred === true, `the ${b.kind} really blocked the trail before the work`);
    check(b.open === true, `and the ${b.kind} really opened it after`);
  }
  // The way through, photographed open — the gate gone and the stones laid.
  await page.evaluate(() => { window.__game.player.debug = true; });
  await shoot('gate', 'gate-open');
  await shoot('stream', 'stream-open');
  await page.evaluate(() => { window.__game.player.debug = false; });

  // ---- and the last stop, which finishes it -------------------------------
  const last = await doStations(6, 7);
  for (const line of last.log) console.log(`       ${line}`);
  for (const b of last.bad) console.log(`  !!   ${b}`);
  check(last.log.length === 1, 'the cottage was reached and worked');
  check(last.passed, 'the lesson completed');
  check(last.bank >= 30, `banking the half hour (${last.bank} min)`);
  check(last.coins >= 30, `and paying the coins (${last.coins})`);

  // ---- talking to Pip, and getting out of a dialogue -----------------------
  // In a lesson Pip re-reads the step instead of opening a box with survival
  // quests in it. And every dialogue anywhere has a close button now: Escape and
  // a "Thank you." option were the only ways out, and a phone has neither.
  const talk = await page.evaluate(() => {
    const g = window.__game;
    g.talkTo('pip');
    const inLesson = { box: !document.getElementById('dialogue').classList.contains('hidden'),
      panel: !!document.getElementById('lesson-panel') };
    return { inLesson, hasCloseButton: !!document.getElementById('dialogue-close') };
  });
  check(talk.inLesson.box === false, 'talking to Pip in a lesson opens no dialogue box');
  check(talk.inLesson.panel, 'it re-reads the step on the lesson panel instead');
  check(talk.hasCloseButton, 'and every dialogue has a close button');

  // ---- the panel can be got out of the way, and cannot eat the screen -------
  const panel = await page.evaluate(() => {
    const el = document.getElementById('lesson-panel');
    const h = () => el.getBoundingClientRect().height;
    const open = h();
    el.querySelector('.lesson-fold').click();
    const folded = h();
    el.querySelector('.lesson-fold').click();
    return { open, folded, back: h(), vh: window.innerHeight,
      belowWindows: getComputedStyle(el).zIndex };
  });
  check(panel.open < panel.vh * 0.5, `the panel is never more than half the screen (${Math.round(panel.open)}px of ${panel.vh})`);
  check(panel.folded < panel.open * 0.55, `folding it away shrinks it to a strip (${Math.round(panel.open)} → ${Math.round(panel.folded)}px)`);
  check(panel.back > panel.folded, 'and unfolding brings the words back');
  check(Number(panel.belowWindows) < 40, `it sits below the menus (z-index ${panel.belowWindows})`);

  // ---- and home again -----------------------------------------------------
  await page.evaluate(() => { window.__game.ui.openWindow('lessons'); });
  await page.waitForSelector('[data-leave]', { timeout: 10000 });
  await page.click('[data-leave]');
  await page.waitForTimeout(1000);
  const back = await page.evaluate(() => ({
    x: window.__game.player.x, z: window.__game.player.z,
    onPath: !!window.__game.world.lessonPath,
    campfire: window.__game.world.getBlock(4, 65, 4),
  }));
  check(!back.onPath, 'leaving puts you back in your own world');
  check(back.campfire !== 0, 'with your camp still standing');
  check(Math.hypot(back.x - home.x, back.z - home.z) < 2,
    `on the block you left from (${Math.hypot(back.x - home.x, back.z - home.z).toFixed(1)} off)`);

  // Back in the overworld: a real dialogue, closed with the button.
  const closed = await page.evaluate(() => {
    const g = window.__game;
    g.ui.closeWindow();
    g.ui.showDialogue('maren_root');
    const opened = !document.getElementById('dialogue').classList.contains('hidden');
    document.getElementById('dialogue-close').click();
    return { opened, shut: document.getElementById('dialogue').classList.contains('hidden'),
      free: g.dialogueOpen === false };
  });
  const gone = await page.evaluate(() => !document.getElementById('lesson-panel'));
  check(gone, 'and the lesson panel does not follow you home');
  const trackerBack = await page.evaluate(() => !document.getElementById('quest-tracker').classList.contains('hidden'));
  check(trackerBack, 'the quest tracker comes back in your own world');
  check(closed.opened, 'a dialogue in your own world still opens');
  check(closed.shut && closed.free, 'and the close button shuts it and gives you back control');

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
} catch (e) {
  console.error('LESSONWALK ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nLESSONWALK FAIL (${fails.length})` : '\nLESSONWALK PASS');
process.exit(fails.length ? 1 : 0);
