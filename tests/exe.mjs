// Does the packaged executable actually work?
//
//   node tests/exe.mjs
//
// It builds a binary for THIS machine and runs it from an empty directory with
// no repo anywhere near it, then drives a real browser through joining. That
// last part is the point: an executable that starts and serves an index.html is
// easy, and proves nothing about whether the 773 embedded files are the ones the
// game needs.
//
// This can only ever test the host platform. A Windows .exe cross-built from
// Linux goes through exactly this code path with a different runtime appended,
// but "the same code path" is not "tested" — .github/workflows/package.yml runs
// this on a real Windows runner for that reason.
import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, copyFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 8807;
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

const hostTarget = `${process.platform === 'win32' ? 'win' : process.platform}-${process.arch}`;
let dir = null;
let proc = null;
let browser = null;

try {
  console.log('  building…');
  execFileSync(process.execPath, ['tools/package.mjs'], { stdio: ['ignore', 'ignore', 'inherit'] });
  const built = (await readdir('dist')).find((f) => f.includes(hostTarget));
  ok(!!built, `an executable was produced (${built})`);

  // AN EMPTY DIRECTORY, deliberately. Run from the repo it would find every
  // asset on disk whether or not any of them were embedded, and the test would
  // pass on a binary that is useless to anyone who only has the binary.
  dir = await mkdtemp(join(tmpdir(), 'sproutlands-exe-'));
  const exe = join(dir, built);
  await copyFile(join('dist', built), exe);
  execFileSync('chmod', ['+x', exe]).toString?.();

  proc = spawn(exe, ['--port', String(PORT), '--no-save'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout.on('data', (d) => { out += d; });
  proc.stderr.on('data', (d) => { out += d; });

  const upBy = Date.now() + 30000;
  while (!/On this machine/.test(out) && Date.now() < upBy) await new Promise((r) => setTimeout(r, 150));
  ok(/On this machine/.test(out), 'it starts with no repo and no Node installed alongside it');
  if (!/On this machine/.test(out)) throw new Error(`never started:\n${out}`);
  ok(/On the wifi/.test(out), 'and prints a LAN address to read out');

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  ok(!!(await page.$('#title-screen')), 'the title screen loads out of the binary');
  await page.waitForSelector('#mp-row:not(.hidden)', { timeout: 15000 });
  ok(true, 'and offers "Play together"');

  await page.fill('#mp-name', 'Ada');
  await page.click('#mp-join');
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 90000 });
  await page.waitForFunction(() => window.__net?.live === true, { timeout: 30000 });
  ok(true, 'a player joins and reaches the world');

  const state = await page.evaluate(() => ({
    seed: window.__net.seed,
    mobs: window.__game.enemyMgr.entities.size,
    blocks: Object.keys(window.__blocks.BLOCKS).length,
  }));
  ok(state.seed === 'sproutlands', 'with the server’s seed');
  ok(state.blocks > 100, `the block registry came through intact (${state.blocks})`);
  // Creatures need mobs/*.json, which is the part most likely to be left out of
  // an asset list — the game boots fine without them and is quietly wrong.
  ok(state.mobs > 0, `creatures are alive (${state.mobs}), so the mob files were embedded`);

  const realErrors = errors.filter((e) => !/favicon/i.test(e));
  ok(realErrors.length === 0, `no console errors (${realErrors.slice(0, 2).join(' | ') || 'clean'})`);
} catch (err) {
  console.error('EXE ERROR', err);
  failures++;
} finally {
  if (browser) await browser.close();
  if (proc) { try { proc.kill('SIGKILL'); } catch { /* gone */ } }
  if (dir) await rm(dir, { recursive: true, force: true });
}

console.log(failures ? `\nEXE FAIL (${failures})` : '\nEXE PASS');
process.exit(failures ? 1 : 0);
