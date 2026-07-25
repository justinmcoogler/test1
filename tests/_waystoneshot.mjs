// Drives the real game in headless Chromium to prove the two systems that can't
// be tested without a browser actually work in play:
//
//   1. waystone fast travel — walk up to a stone, it names itself and joins your
//      network; walk up to a second; the map window offers the route; clicking it
//      moves you; and the network survives a page reload (a genuine save/load).
//   2. the dungeon grate — it refuses to be mined, refuses to open without the
//      key, opens with it (and spends it), and the boss hoard stays sealed until
//      that dungeon's boss is dead.
//
// Coordinates are computed HERE, in node, off the same seed the page will use, so
// the page never has to import worldgen modules it doesn't expose.
//
//   node tests/_waystoneshot.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { World } from '../js/world/world.js';
import { hashSeed } from '../js/core/rng.js';
import { roadsFor, PRIMARIES } from '../js/world/roads.js';
import { waystoneOf, waystoneLanding } from '../js/game/waystones.js';
import { findDungeon } from '../js/world/dungeon.js';
import { grateCells, keyHolderId, bossSpawnId } from '../js/game/dungeonlock.js';

const SEED_TEXT = 'waystone';
const PORT = 8747;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

// ---- work out where to go, in node ----------------------------------------
const w = new World(hashSeed(SEED_TEXT));
const roads = roadsFor(w.gen);
const stones = [];
for (let d = 0; d < PRIMARIES && stones.length < 2; d++) {
  for (let n = 1; n <= 3 && stones.length < 2; n++) {
    const c = roads.waystoneColumn(w.gen, d, n, new Int32Array(2));
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) w.ensureChunk((c[0] >> 4) + dx, (c[1] >> 4) + dz);
    const ws = waystoneOf(w, d, n);
    if (ws) stones.push({ ...ws, land: waystoneLanding(w, ws) });
  }
}
if (stones.length < 2) { console.error('no two waystones on this seed'); process.exit(1); }
console.log('waystones:', stones.map((s) => `${s.name} @ ${s.id} (land ${s.land})`).join(' | '));

const dg = findDungeon(w.gen, 6);
if (!dg) { console.error('no dungeon on this seed'); process.exit(1); }
const grate = grateCells(dg);
// A spot in the corridor just outside the grate, on the side the corridor comes
// from — the door's own room is on the other side.
const from = dg.rooms[dg.rooms[dg.boss].parent];
const stand = dg.door.alongX
  ? [dg.door.x + Math.sign(from.x - dg.door.x) * 3, dg.door.y, dg.door.z]
  : [dg.door.x, dg.door.y, dg.door.z + Math.sign(from.z - dg.door.z) * 3];
console.log('dungeon:', dg.theme.key, 'door', [dg.door.x, dg.door.y, dg.door.z], 'stand', stand,
  'keyHolder', keyHolderId(dg), 'boss', bossSpawnId(dg), 'bossChest', dg.bossChest.id);

// ---- drive the browser -----------------------------------------------------
const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// Put the player on the ground at (x, z), generating and meshing around them.
async function goto(x, z, y = null) {
  await page.evaluate(async ([x, z, y]) => {
    const g = window.__game;
    const CH = 16;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      g.world.ensureChunk(Math.floor(x / CH) + dx, Math.floor(z / CH) + dz);
    }
    const gy = y ?? (g.world.surfaceAt(Math.floor(x), Math.floor(z)) + 1);
    g.player.respawnAt(x + 0.5, gy, z + 0.5);
    g.player.vx = g.player.vy = g.player.vz = 0;
    for (const key of [...g.world.dirtyChunks]) {
      const [cx, cz] = key.split(',').map(Number);
      g.world.dirtyChunks.delete(key);
      if (g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
    }
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const cx = Math.floor(x / CH) + dx, cz = Math.floor(z / CH) + dz;
      if (!g.renderer.hasMesh(cx, cz) && g.world.hasChunk(cx, cz)) g.renderer.remeshChunk(g.world, cx, cz);
    }
  }, [x, z, y]);
  await page.waitForTimeout(700); // let the 4 Hz waystone scan run
}

async function boot(newGame) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  if (newGame) await page.fill('#seed-input', SEED_TEXT);
  await page.click('.slot-btn');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.evaluate(() => { window.__game.disableAggro = true; });
  await page.waitForTimeout(900);
}

try {
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await boot(true);

  // ================================================================ waystones
  console.log('\n--- waystone discovery ---');
  await page.evaluate(() => { window.__game.settings.classicCamera = false; window.__game.applySettings(); });

  for (const [i, s] of stones.entries()) {
    await goto(s.land[0], s.land[1]);
    // Look at the stone. The world label is hidden when it is behind you, which
    // is correct behaviour and not what this check is about.
    await page.evaluate(([sx, sz]) => {
      const g = window.__game;
      g.player.yaw = Math.atan2(-(sx + 0.5 - g.player.x), -(sz + 0.5 - g.player.z));
      g.player.pitch = 0.5;
    }, [s.x, s.z]);
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => {
      const g = window.__game;
      // Hidden pool entries keep their previous text, so read only the visible ones.
      const labels = [...document.querySelectorAll('.world-label')]
        .filter((e) => e.style.display !== 'none')
        .map((e) => e.textContent.replace(/\s+/g, ' ').trim());
      return {
        size: g.waystones.size,
        near: g.nearWaystone?.name || null,
        prompt: document.getElementById('interact-prompt')?.textContent || '',
        labels,
        toasts: [...document.querySelectorAll('#toasts .toast')].map((e) => e.textContent),
      };
    });
    check(st.size === i + 1, `standing at stone ${i + 1} discovers it (network size ${st.size})`);
    check(st.near === s.name, `it names itself "${s.name}" (near: ${st.near})`);
    check(st.prompt.includes(s.name), `the HUD prompt carries the name — "${st.prompt}"`);
    check(st.toasts.some((t) => t.includes(s.name)), 'a discovery toast names it');
    check(st.labels.some((t) => t.includes(s.name) && t.includes('waystone')),
      `the stone floats its own name in the world — ${JSON.stringify(st.labels.find((t) => t.includes(s.name)))}`);
    await page.screenshot({ path: `tests/screenshots/waystone-${i + 1}.png` });
  }

  // ------------------------------------------------------------ the travel UI
  console.log('\n--- the fast-travel UI ---');
  await page.evaluate(() => window.__game.ui.toggleWindow('map'));
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => {
    const list = document.getElementById('ws-list');
    const btns = [...(list?.querySelectorAll('.ws-btn') || [])];
    const hud = document.getElementById('hotbar')?.getBoundingClientRect();
    const win = document.getElementById('game-window')?.getBoundingClientRect();
    return {
      hasPanel: !!document.getElementById('ws-net'),
      note: document.querySelector('#ws-net span')?.textContent || '',
      rows: btns.map((b) => ({ text: b.textContent.replace(/\s+/g, ' ').trim(), disabled: b.disabled, id: b.dataset.ws })),
      minTouch: Math.min(...btns.map((b) => b.getBoundingClientRect().height)),
      // every entry fully inside the window, without having to scroll for it
      allOnScreen: btns.every((b) => {
        const r = b.getBoundingClientRect();
        const w = document.getElementById('game-window').getBoundingClientRect();
        return r.top >= w.top && r.bottom <= w.bottom + 1;
      }),
      overlapsHotbar: !!(hud && win && hud.top < win.bottom && hud.bottom > win.top && hud.left < win.right && hud.right > win.left && getComputedStyle(document.getElementById('hotbar')).display !== 'none'),
      bodyScrollsSideways: document.getElementById('window-body').scrollWidth > document.getElementById('window-body').clientWidth + 1,
    };
  });
  check(panel.hasPanel, 'the map window shows a Waystone network panel');
  check(panel.rows.length === 2, `it lists both stones (${panel.rows.length})`);
  check(panel.rows.some((r) => r.disabled), 'the stone you are standing at is marked "you are here" and not clickable');
  check(panel.minTouch >= 44, `every entry is a 44px+ touch target (min ${panel.minTouch}px)`);
  check(panel.allOnScreen, 'both entries are visible without scrolling the window');
  check(!panel.bodyScrollsSideways, 'nothing scrolls sideways');
  console.log('       note:', panel.note);
  for (const r of panel.rows) console.log('       row:', r.text, r.disabled ? '(here)' : '');
  await page.screenshot({ path: 'tests/screenshots/waystone-map-desktop.png' });

  // portrait + landscape phone, to prove the panel survives both
  for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    await page.setViewportSize(vp);
    await page.evaluate(() => { window.__game.ui.closeWindow(); window.__game.ui.toggleWindow('map'); });
    await page.waitForTimeout(350);
    const m = await page.evaluate(() => {
      const list = document.getElementById('ws-list');
      const btns = [...(list?.querySelectorAll('.ws-btn') || [])];
      const r = btns[0]?.getBoundingClientRect();
      const body = document.getElementById('window-body');
      const win = document.getElementById('game-window').getBoundingClientRect();
      const hb = document.getElementById('hotbar');
      const hbr = hb.getBoundingClientRect();
      return {
        visible: !!r && r.width > 40 && r.height >= 44,
        w: Math.round(r?.width || 0), h: Math.round(r?.height || 0),
        sideways: body.scrollWidth > body.clientWidth + 1,
        allOnScreen: btns.length > 0 && btns.every((b) => {
          const q = b.getBoundingClientRect();
          return q.top >= win.top && q.bottom <= win.bottom + 1 && q.right <= window.innerWidth + 1;
        }),
        // the window covers the whole viewport on a phone, so the HUD is behind it
        coversHud: win.top <= hbr.top && win.bottom >= hbr.bottom && win.left <= 0 && win.right >= window.innerWidth,
      };
    });
    check(m.visible && !m.sideways && m.allOnScreen && m.coversHud,
      `${name} ${vp.width}x${vp.height}: entries render ${m.w}x${m.h}, all on screen, no sideways scroll, HUD not overlapped`);
    await page.screenshot({ path: `tests/screenshots/waystone-map-${name}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { window.__game.ui.closeWindow(); window.__game.ui.toggleWindow('map'); });
  await page.waitForTimeout(300);

  // ------------------------------------------------------------- travel by it
  console.log('\n--- travelling the network ---');
  const target = stones[0];
  const before = await page.evaluate(() => [window.__game.player.x, window.__game.player.z]);
  await page.click(`.ws-btn[data-ws="${target.id}"]`);
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    pos: [window.__game.player.x, window.__game.player.z],
    near: window.__game.nearWaystone?.name || null,
    windowOpen: !!window.__game.ui.currentWindow,
    toasts: [...document.querySelectorAll('#toasts .toast')].map((e) => e.textContent),
  }));
  const moved = Math.hypot(after.pos[0] - before[0], after.pos[1] - before[1]);
  const landed = Math.hypot(after.pos[0] - (target.land[0] + 0.5), after.pos[1] - (target.land[1] + 0.5));
  check(moved > 100, `clicking a stone moved the player ${Math.round(moved)} blocks`);
  check(landed < 3, `and put them on the lane at ${target.name} (${landed.toFixed(1)} blocks off)`);
  check(after.near === target.name, `they are now standing at ${target.name} (near: ${after.near})`);
  check(!after.windowOpen, 'the map window closed on departure');
  console.log('       toasts:', JSON.stringify(after.toasts));
  await page.screenshot({ path: 'tests/screenshots/waystone-arrived.png' });

  // ---------------------------------------------------- save / load round trip
  console.log('\n--- save / load round trip ---');
  const saved = await page.evaluate(() => {
    window.__game.saveGame();
    const d = JSON.parse(localStorage.getItem('sproutlands_slot_1'));
    return { waystones: d.waystones, keys: Object.keys(d) };
  });
  check(Array.isArray(saved.waystones) && saved.waystones.length === 2,
    `the slot holds both stones as ${JSON.stringify(saved.waystones)}`);
  await boot(false); // reload the page and Continue slot 1
  const reloaded = await page.evaluate(() => {
    const g = window.__game;
    return { size: g.waystones.size, names: g.waystones.list().map((q) => q.name), ids: g.waystones.list().map((q) => q.id) };
  });
  check(reloaded.size === 2, `both stones came back after a real page reload (${reloaded.size})`);
  check(reloaded.names.every((n, i) => n === stones.map((s) => s.name).sort()[i] || stones.some((s) => s.name === n)),
    `with the same names: ${reloaded.names.join(', ')}`);

  // ============================================================ dungeon grate
  console.log('\n--- the dungeon grate ---');
  await goto(stand[0], stand[2], stand[1]);
  const g0 = await page.evaluate(([grate, doorY]) => {
    const g = window.__game;
    for (const [x, , z] of grate) g.world.ensureChunk(x >> 4, z >> 4);
    return {
      bars: grate.map(([x, y, z]) => g.world.getBlock(x, y, z)),
      ironBars: window.__blocks.B.iron_bars,
      keys: g.inventory.count('warden_key'),
      y: g.player.y, doorY,
    };
  }, [grate, dg.door.y]);
  check(g0.bars.every((b) => b === g0.ironBars), `all nine grate cells are iron bars (${g0.bars.join(',')})`);
  await page.screenshot({ path: 'tests/screenshots/grate-locked.png' });

  // mining it must fail
  const mined = await page.evaluate(([cell]) => {
    const g = window.__game;
    const [x, y, z] = cell;
    const id = g.world.getBlock(x, y, z);
    for (let i = 0; i < 40; i++) g.updateBreaking({ x, y, z, id, face: [0, 1, 0] }, 0.5); // 20 seconds of pickaxe
    return {
      still: g.world.getBlock(x, y, z) === id,
      breaking: !!g.breaking,
      toasts: [...document.querySelectorAll('#toasts .toast')].map((e) => e.textContent),
    };
  }, [grate[4]]);
  check(mined.still && !mined.breaking, '20 seconds of mining does not get through it');
  check(mined.toasts.some((t) => /locked/i.test(t)), `and it says so: "${mined.toasts.find((t) => /locked/i.test(t))}"`);

  // interacting without a key must refuse and say why
  const refused = await page.evaluate(([cell]) => {
    const g = window.__game;
    const consumed = g.tryDungeonGate(cell[0], cell[1], cell[2]);
    return {
      consumed,
      open: g.world.getBlock(cell[0], cell[1], cell[2]) === window.__blocks.B.iron_bars,
      toasts: [...document.querySelectorAll('#toasts .toast')].map((e) => e.textContent),
    };
  }, [grate[4]]);
  check(refused.consumed && refused.open, 'trying the grate with no key is refused, bars intact');
  console.log('       toast:', refused.toasts.at(-1));

  // the key holder hands over the key
  const granted = await page.evaluate(([keyId]) => {
    const g = window.__game;
    g.onDungeonBossKilled(keyId, true);
    return { keys: g.inventory.count('warden_key'), toasts: [...document.querySelectorAll('#toasts .toast')].map((e) => e.textContent) };
  }, [keyHolderId(dg)]);
  check(granted.keys === 1, `killing the key holder grants one key (have ${granted.keys})`);
  console.log('       toast:', granted.toasts.at(-1));

  // and the key opens it, spending itself
  const opened = await page.evaluate(([grate, cell]) => {
    const g = window.__game;
    const consumed = g.tryDungeonGate(cell[0], cell[1], cell[2]);
    return {
      consumed,
      cells: grate.map(([x, y, z]) => g.world.getBlock(x, y, z)),
      air: window.__blocks.B.air,
      keys: g.inventory.count('warden_key'),
      flags: Object.keys(g.flags).filter((k) => k.startsWith('dg_')),
      toasts: [...document.querySelectorAll('#toasts .toast')].map((e) => e.textContent),
    };
  }, [grate, grate[4]]);
  check(opened.consumed && opened.cells.every((c) => c === opened.air), 'the key dissolves the whole grate');
  check(opened.keys === 0, 'and is spent doing it');
  check(opened.flags.some((f) => f.startsWith('dg_gate:')), `a per-dungeon flag records it: ${opened.flags.join(', ')}`);
  console.log('       toast:', opened.toasts.at(-1));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/grate-open.png' });

  // ------------------------------------------------------------- boss hoard
  console.log('\n--- the boss hoard ---');
  const hoard = await page.evaluate(([chestId, cx, cz, bossId]) => {
    const g = window.__game;
    g.world.ensureChunk(cx >> 4, cz >> 4);
    const sealedBefore = g.chestSealedReason(chestId);
    g.onDungeonBossKilled(bossId, true);
    const sealedAfter = g.chestSealedReason(chestId);
    const loot = g.world.openChest(chestId);
    return { sealedBefore, sealedAfter, loot, registered: g.world.chestMeta.has(chestId) };
  }, [dg.bossChest.id, dg.bossChest.x, dg.bossChest.z, bossSpawnId(dg)]);
  check(!!hoard.registered, 'the boss chest is registered with the world');
  check(!!hoard.sealedBefore, `it is sealed while the boss lives: "${hoard.sealedBefore}"`);
  check(hoard.sealedAfter === null, 'killing that dungeon\'s boss unseals it');
  check(hoard.loot?.length === dg.theme.bossLoot.length,
    `and it pays the theme's bossLoot: ${hoard.loot.map((l) => `${l.qty}x${l.item}`).join(', ')}`);

  // a different dungeon must be untouched
  const other = await page.evaluate(() => Object.keys(window.__game.flags).filter((k) => k.startsWith('dg_')));
  check(other.length === 2, `exactly two dungeon flags set, both for this dungeon: ${other.join(', ')}`);

  console.log('');
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log('  •', e)); }
  const bad = fails.length || errors.length;
  console.log(bad ? `WAYSTONE/GRATE FAIL (${fails.length} checks, ${errors.length} page errors)` : 'WAYSTONE/GRATE PASS — all checks green, no page errors');
  process.exitCode = bad ? 1 : 0;
} catch (e) {
  console.error('HARNESS ERROR', e);
  await page.screenshot({ path: 'tests/screenshots/waystone-error.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
