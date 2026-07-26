// Walk the lesson.
//
// The unit suite proves the runner's bookkeeping against a fake world. This drives
// the real game around the real farm: start "Before the Bell", check the gold
// guide dots really appear and really lead somewhere, WALK (on the keyboard, not
// by teleport) until the first stop registers, do each stop's activity, and check
// that the stop which bars the lane actually opens it — a mended gate that is
// still solid would leave a five-year-old walking into a wall.
//
// It also photographs every stop, because "the farm is there" and "the farm looks
// like a farm" are different claims.
//
//   node tests/_lessonwalk.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8791;
const LESSON = 'farm_morning';
const AREA = 'farm';
const STOPS = ['henhouse', 'byre', 'gate', 'feedstore', 'topfield', 'bell'];
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
  await page.waitForSelector(`[data-start="${LESSON}"]`, { timeout: 10000 });
  await page.click(`[data-start="${LESSON}"]`);
  await page.waitForTimeout(1200);

  const arrived = await page.evaluate(([lesson, area]) => {
    const g = window.__game;
    const st = g.lessons.stationFor(area);
    return {
      lesson: g.lessons.current[area],
      phase: g.lessons.phase[area],
      onPath: !!g.world.lessonPath,
      stations: g.lessons.pathOf(lesson).stations.map((s) => s.kind),
      at: [Math.round(g.player.x), Math.round(g.player.y), Math.round(g.player.z)],
      firstStation: [st.sx, st.stand, st.cz],
      // Standing on the lane, in the open air, with no camp anywhere near it.
      under: g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) - 1, Math.floor(g.player.z)),
      sky: g.world.getBlock(Math.floor(g.player.x), Math.floor(g.player.y) + 4, Math.floor(g.player.z)),
      campfire: g.world.getBlock(4, 65, 4),
      prompt: document.querySelector('#lesson-panel .lesson-prompt')?.textContent || '',
      tracker: !document.getElementById('quest-tracker').classList.contains('hidden'),
      dest: g.lessonDest,
    };
  }, [LESSON, AREA]);
  check(arrived.lesson === LESSON, `the morning round started (${arrived.lesson})`);
  check(arrived.onPath, 'and it built a FARM, not a room');
  check(arrived.stations.join(',') === STOPS.join(','), `six stops along the lane (${arrived.stations.join(', ')})`);
  check(arrived.phase === 'travel', `you begin by walking, not working (phase=${arrived.phase})`);
  check(arrived.under !== 0, 'standing on the lane');
  check(arrived.sky === 0, 'in the open air — no ceiling');
  check(arrived.campfire === 0, 'and your camp does not exist in this world');
  check(arrived.tracker === false, 'the quest tracker is gone — there is no Maren to talk to here');
  check(/lights|lane|hen/i.test(arrived.prompt), `the panel points you up the lane ("${arrived.prompt.slice(0, 48)}…")`);
  check(arrived.at[0] < arrived.firstStation[0], 'you start short of the first stop, not on it');
  check(!!arrived.dest && arrived.dest[0] === arrived.firstStation[0] + 0.5,
    'and the guide lights are aimed at the first stop');
  await page.screenshot({ path: 'tests/screenshots/walk-1-start.png' });

  // ---- the gold dots ------------------------------------------------------
  // The whole of "show lines of where to go". These are the same trail a quest
  // draws, and they have to be REAL — an A* path over the lane, not a straight
  // line drawn through a hedge.
  const dots = await page.evaluate(([area]) => {
    const g = window.__game;
    const st = g.lessons.stationFor(area);
    return {
      n: g.trailDots?.length || 0,
      first: g.trailDots?.[0] || null,
      last: g.trailDots?.at(-1) || null,
      towards: (g.trailDots || []).every((d, i, a) => i === 0 || d.x >= a[i - 1].x - 1),
      onLane: (g.trailDots || []).every((d) => Math.abs(d.z - st.cz) <= 3),
      rendered: (g.renderer.lastFrame?.dots?.length ?? g.trailDots?.length) || 0,
    };
  }, [AREA]);
  check(dots.n >= 4, `there is a line of gold dots up the lane (${dots.n})`);
  check(dots.towards, 'every dot is further along than the last — the line leads somewhere');
  check(dots.onLane, 'and it runs along the lane rather than through the hedge');
  check(dots.last && dots.last.x > (dots.first?.x ?? 0), 'ending at the far end, nearest the stop');

  // ---- actually walk ------------------------------------------------------
  // On the keyboard, up the lane. This is the one thing a teleport cannot prove:
  // that the ground is walkable and arriving at a stop is what starts it.
  // Forward is (-sin yaw, -cos yaw), so -PI/2 points up the lane at +X.
  await page.evaluate(() => { window.__game.player.yaw = -Math.PI / 2; window.__game.camYaw = -Math.PI / 2; });
  await page.keyboard.down('KeyW');
  let walked = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    walked = await page.evaluate(([area]) => ({
      phase: window.__game.lessons.phase[area],
      x: window.__game.player.x,
      y: window.__game.player.y,
      dest: window.__game.lessonDest,
    }), [AREA]);
    if (walked.phase === 'work') break;
  }
  await page.keyboard.up('KeyW');
  check(walked.phase === 'work', `walking to the hen house started the work (phase=${walked.phase})`);
  check(walked.x > arrived.at[0] + 2, `you moved up the lane on your own legs (x ${arrived.at[0]} → ${Math.round(walked.x)})`);
  check(Math.abs(walked.y - arrived.at[1]) < 2, 'and stayed on the ground the whole way');
  check(walked.dest === null, 'arriving puts the guide lights out');

  const atNests = await page.evaluate(([area]) => {
    const g = window.__game, B = window.__blocks.B;
    const st = g.lessons.stationFor(area);
    let nests = 0, hens = 0;
    for (const [dx, dz] of st.marks || []) {
      if (g.world.getBlock(st.plot.x0 + dx, st.floor, st.plot.z0 + dz) === B.thatch) nests++;
    }
    for (const e of g.enemyMgr.entities.values()) if (e.type === 'chicken') hens++;
    return { prompt: document.querySelector('#lesson-panel .lesson-prompt')?.textContent || '',
      nests, hens, yaw: g.player.yaw };
  }, [AREA]);
  check(/egg/i.test(atNests.prompt), `arriving changed the prompt to the job ("${atNests.prompt.slice(0, 40)}…")`);
  check(atNests.nests === 3, `there are three strawed nests to fill (${atNests.nests})`);
  check(atNests.hens >= 3, `and three hens standing behind them (${atNests.hens})`);
  check(Math.abs(atNests.yaw - Math.PI) < 0.01, 'and you were turned to face the work');
  await page.screenshot({ path: 'tests/screenshots/walk-2-nests.png' });

  // ---- photograph each stop as a child first sees it ----------------------
  // Empty plot, nothing built, BEFORE any of the work is done. (Shooting them
  // afterwards used to catch the farm already gone: finishing the last stop swaps
  // the whole world back for the child's own, and the camera ends up in blue
  // nothing.) The panel lives in the top centre of the screen, which is exactly
  // where the thing being photographed is — hide it, then put it back.
  const shoot = async (kind, tag, opts = {}) => {
    await page.evaluate(([lesson, k, o]) => {
      const g = window.__game;
      const st = g.lessons.pathOf(lesson).stations.find((s) => s.kind === k);
      const panel = document.getElementById('lesson-panel');
      if (panel) panel.style.display = 'none';
      g.player.debug = true;                        // fly, so the camera holds still
      g.player.respawnAt(st.sx + 0.5 + (o.dx || 0), st.stand + (o.up ?? 8), st.cz - (o.back ?? 15));
      const pitch = o.pitch ?? -0.42;
      g.player.yaw = Math.PI; g.player.pitch = pitch;
      g.camYaw = Math.PI; g.camPitch = pitch; g.camDist = 0;
      for (let dz = -2; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        g.world.ensureChunk((st.sx >> 4) + dx, (st.cz >> 4) + dz);
        g.renderer.remeshChunk(g.world, (st.sx >> 4) + dx, (st.cz >> 4) + dz);
      }
    }, [LESSON, kind, opts]);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `tests/screenshots/walk-${tag}.png` });
    await page.evaluate(() => {
      const panel = document.getElementById('lesson-panel');
      if (panel) panel.style.display = '';
    });
    console.log(`  shot tests/screenshots/walk-${tag}.png`);
  };
  for (const kind of STOPS) await shoot(kind, kind);
  // And one down the length of the lane, so the shape of the whole lesson reads.
  await shoot('gate', 'lane', { up: 18, back: 28, pitch: -0.5, dx: -8 });
  await page.evaluate(() => { window.__game.player.debug = false; });

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

  // ---- talking to the guide, and getting out of a dialogue ------------------
  // In a lesson Nan re-reads the step instead of opening a box with survival
  // quests in it. And every dialogue anywhere has a close button now: Escape and
  // a "Thank you." option were the only ways out, and a phone has neither.
  const talk = await page.evaluate(() => {
    const g = window.__game;
    g.talkTo('nan');
    return { box: !document.getElementById('dialogue').classList.contains('hidden'),
      panel: !!document.getElementById('lesson-panel'),
      hasCloseButton: !!document.getElementById('dialogue-close'),
      onTheFarm: g.world.structure.npcs.filter((n) => n.id === 'nan').length };
  });
  check(talk.box === false, 'talking to Nan in a lesson opens no dialogue box');
  check(talk.panel, 'it re-reads the step on the lesson panel instead');
  check(talk.hasCloseButton, 'and every dialogue has a close button');
  check(talk.onTheFarm === STOPS.length, `she is at every stop, so there is always somebody to ask (${talk.onTheFarm})`);

  // ---- leaving and coming back keeps your place ---------------------------
  await page.evaluate(() => { window.__game.ui.openWindow('lessons'); });
  await page.waitForSelector('[data-leave]', { timeout: 10000 });
  await page.click('[data-leave]');
  await page.waitForTimeout(900);
  const left = await page.evaluate(([area]) => ({
    onPath: !!window.__game.world.lessonPath,
    panel: !!document.getElementById('lesson-panel'),
    kept: window.__game.lessons.current[area],
  }), [AREA]);
  check(!left.onPath, 'leaving mid-round puts you back in your own world');
  check(!left.panel, 'and the lesson panel does not come home with you');
  check(left.kept === LESSON, 'but your place in the round is kept');
  await page.evaluate(() => { window.__game.ui.openWindow('lessons'); });
  await page.waitForSelector(`[data-start="${LESSON}"]`, { timeout: 10000 });
  await page.click(`[data-start="${LESSON}"]`);
  await page.waitForTimeout(1000);
  check(await page.evaluate(() => !!window.__game.world.lessonPath), 'and Resume puts you back on the farm');

  // ---- do every stop ------------------------------------------------------
  const doStops = async (from, to) => page.evaluate(async ([area, from, to, total]) => {
    const g = window.__game, B = window.__blocks.B;
    const log = [], bad = [];
    const barriers = [];
    const load = (x, z) => {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) g.world.ensureChunk((x >> 4) + dx, (z >> 4) + dz);
    };
    for (let i = from; i < to; i++) {
      const st = g.lessons.stationFor(area);
      if (!st) { bad.push(`no stop at step ${i + 1}`); break; }
      // Walk up to it (teleport for speed — the keyboard walk above proved the
      // ground works; this is about the activities). A real child walks here,
      // streaming chunks as they go; a teleport has to load them by hand or every
      // setBlock lands in a chunk that is not there.
      g.player.respawnAt(st.sx + 0.5, st.stand, st.cz + 0.5);
      load(st.sx, st.cz);
      g.lessons.update();
      if (g.lessons.phase[area] !== 'work') { bad.push(`${st.kind}: arriving did not start the work`); break; }

      // Before: is the way blocked?
      const barred = st.barrier ? g.world.getBlock(st.barrier.x, st.stand, st.cz) !== 0 : null;

      const step = g.lessons.activeStep(area);
      const mat = g.lessons.matFor(area);
      for (const op of g.lessons.solveStep(area)) {
        if (op.op === 'walk') {
          // A search: the answer is a PLACE, and the child gets there by going.
          load(Math.floor(op.x), Math.floor(op.z));
          g.player.respawnAt(op.x, op.y, op.z);
          g.lessons.onWatch('blockPlaced');
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
        barriers.push({ kind: st.barrier.kind, barred,
          open: g.world.getBlock(st.barrier.x, st.stand, st.cz) === 0 });
      }
      const shown = ['nest_egg', 'apple_red', 'apple_green', 'planks', 'digit_3', 'sym_plus', 'digit_7']
        .map((b) => {
          let n = 0;
          if (mat) for (let x = mat.x0; x <= mat.x1; x++) for (let y = mat.y0; y <= mat.y1; y++) {
            for (let z = mat.z0; z <= mat.z1; z++) if (g.world.getBlock(x, y, z) === B[b]) n++;
          }
          return n ? `${b}=${n}` : null;
        }).filter(Boolean).join(' ');
      log.push(`${String(i + 1)}. ${st.kind.padEnd(9)} ${step.build.kind.padEnd(8)} on plot: ${shown || '(none)'} → step=${g.lessons.step[area] ?? '—'}`);
      if (i + 1 < total && g.lessons.step[area] !== i + 1) { bad.push(`${st.kind}: step did not complete`); break; }
    }
    return {
      log, bad, barriers,
      passed: (g.education.lessonsDone.farm_morning || []).some((a) => a.passed),
      bank: g.education.balanceMinutes(),
      coins: g.inventory.count('coin'),
      eggs: g.inventory.count('nest_egg'),
      stillIn: !!g.lessons.current[area],
    };
  }, [AREA, from, to, STOPS.length]);

  const run = await doStops(0, STOPS.length - 1);
  for (const line of run.log) console.log(`       ${line}`);
  for (const b of run.bad) console.log(`  !!   ${b}`);
  check(run.log.length === STOPS.length - 1, `the first five stops were reached and worked (${run.log.length})`);
  check(run.bad.length === 0, `with nothing going wrong on the way (${run.bad.length} problems)`);
  for (const b of run.barriers) {
    check(b.barred === true, `the ${b.kind} really blocked the lane before the work`);
    check(b.open === true, `and the ${b.kind} really opened it after`);
  }
  // The way through, photographed open — the gate gone.
  await page.evaluate(() => { window.__game.player.debug = true; });
  await shoot('gate', 'gate-open');
  await page.evaluate(() => { window.__game.player.debug = false; });

  // ---- and the bell, which finishes it -----------------------------------
  const last = await doStops(STOPS.length - 1, STOPS.length);
  for (const line of last.log) console.log(`       ${line}`);
  for (const b of last.bad) console.log(`  !!   ${b}`);
  check(last.log.length === 1, 'the bell was reached and rung');
  check(last.passed, 'the lesson completed');
  check(last.bank >= 30, `banking the half hour (${last.bank} min)`);
  check(last.coins >= 30, `and paying the coins (${last.coins})`);
  check(last.eggs >= 6, `and the eggs (${last.eggs})`);
  check(!last.stillIn, 'the round is over — nothing left half-started');

  // ---- home again, on its own --------------------------------------------
  // There is nothing to chain into, so finishing the round sends the child home
  // without them having to find their way out of a menu.
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => ({
    x: window.__game.player.x, z: window.__game.player.z,
    onPath: !!window.__game.world.lessonPath,
    campfire: window.__game.world.getBlock(4, 65, 4),
    panel: !!document.getElementById('lesson-panel'),
    tracker: !document.getElementById('quest-tracker').classList.contains('hidden'),
    dots: window.__game.lessonDest,
  }));
  check(!back.onPath, 'finishing the round puts you back in your own world');
  check(back.campfire !== 0, 'with your camp still standing');
  check(Math.hypot(back.x - home.x, back.z - home.z) < 2,
    `on the block you left from (${Math.hypot(back.x - home.x, back.z - home.z).toFixed(1)} off)`);
  check(!back.panel, 'and the lesson panel does not follow you home');
  check(back.dots === null, 'nor the guide lights');
  check(back.tracker, 'the quest tracker comes back in your own world');

  // Back in the overworld: a real dialogue, closed with the button. And Nan is
  // somewhere you can go and find on purpose.
  const closed = await page.evaluate(() => {
    const g = window.__game;
    g.ui.closeWindow();
    g.ui.showDialogue('maren_root');
    const opened = !document.getElementById('dialogue').classList.contains('hidden');
    document.getElementById('dialogue-close').click();
    return { opened, shut: document.getElementById('dialogue').classList.contains('hidden'),
      free: g.dialogueOpen === false,
      nanAtGate: g.world.structure.npcs.some((n) => n.id === 'nan') };
  });
  check(closed.opened, 'a dialogue in your own world still opens');
  check(closed.shut && closed.free, 'and the close button shuts it and gives you back control');
  check(closed.nanAtGate, 'Nan is standing at the Honeywood gate in your own world too');

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
