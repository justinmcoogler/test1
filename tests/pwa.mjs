// Is it actually an installable, offline-capable app?
//
//   node tests/pwa.mjs
//
// A manifest and an icon are easy to have and prove nothing. The three things
// that decide whether a browser will offer to install, and whether the game
// works on a tablet in a car, are:
//
//   1. the manifest parses and carries what Chrome requires
//   2. a service worker actually REGISTERS and takes control
//   3. the page still loads with the network switched off
//
// (3) is the only real test of the other two. It is also the one that caught the
// original bug: registration was skipped on localhost, so the worker installed
// nowhere and this test could not have passed.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8797;
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
// A service worker needs a persistent-ish context; the default one is fine, but
// it must NOT be blocked by the "no service workers" default of some setups.
const context = await browser.newContext({ serviceWorkers: 'allow' });
const page = await context.newPage();

try {
  // ---- 1. the manifest -----------------------------------------------------
  // ?sw=1 opts this page in to the service worker. Automated browsers do not
  // get one by default (js/main.js) so the rest of the e2e suite is not racing
  // a worker that is busy caching the build; here it is the point of the test.
  const base = `http://localhost:${PORT}`;
  const url = `${base}/?sw=1`;
  await page.goto(url, { waitUntil: 'load' });

  const href = await page.getAttribute('link[rel=manifest]', 'href');
  ok(!!href, 'the page links a web app manifest');
  const manifest = await (await fetch(`${base}/${href}`)).json();

  ok(!!manifest.name && !!manifest.short_name, 'the manifest names the app');
  ok(manifest.start_url === './', 'it has a start_url');
  ok(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display),
    `display is app-like, not "browser" (${manifest.display})`);
  const sizes = (manifest.icons || []).map((i) => i.sizes);
  ok(sizes.includes('192x192'), 'a 192px icon — Chrome will not install without one');
  ok(sizes.includes('512x512'), 'and a 512px icon');
  ok((manifest.icons || []).some((i) => (i.purpose || '').includes('maskable')),
    'and a maskable one, so Android does not letterbox it on the home screen');
  for (const icon of manifest.icons || []) {
    const res = await fetch(`${base}/${icon.src}`);
    ok(res.ok, `${icon.src} is actually served (${res.status})`);
  }

  // iOS never reads beforeinstallprompt and older iPadOS never reads the
  // manifest, so the apple meta tags are the only route to a standalone app on
  // exactly the devices most likely to be handed to a child.
  const appleCapable = await page.getAttribute('meta[name="apple-mobile-web-app-capable"]', 'content');
  ok(appleCapable === 'yes', 'iOS is told the page is app-capable');
  ok(!!(await page.$('link[rel="apple-touch-icon"]')), 'and given a home-screen icon');

  // ---- 2. the service worker registers -------------------------------------
  // localhost is a secure context, so this is exactly the path a host machine
  // takes. If this fails, nothing is installable anywhere.
  const registered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    return reg ? (reg.active ? 'active' : 'registered') : 'none';
  });
  ok(registered === 'active', `a service worker is active on localhost (${registered})`);

  // A worker with no fetch handler does not count as installable to Chrome.
  const sw = await (await fetch(`${base}/sw.js`)).text();
  ok(/addEventListener\(\s*['"]fetch['"]/.test(sw), 'and it handles fetch, which is what Chrome checks');

  // ---- 3. it works offline -------------------------------------------------
  // Give the worker a moment to take control and warm the cache with what the
  // page actually loaded, then pull the plug.
  await page.goto(url, { waitUntil: 'load' });
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  ok(controlled, 'the worker controls the page after a reload');
  await page.waitForTimeout(2500);

  await context.setOffline(true);
  const offline = await page.goto(url, { waitUntil: 'load' }).catch(() => null);
  ok(!!offline, 'the page still loads with the network off');
  ok(!!(await page.$('#title-screen')), 'and it is the game, not a browser error page');
  // The title screen is rendered by the module graph, so if this is present the
  // JS was served from cache too — not just the HTML shell.
  const titleText = await page.textContent('.game-title').catch(() => '');
  ok(/SPROUTLANDS/i.test(titleText || ''), 'the modules came from cache as well as the shell');
  await context.setOffline(false);
} catch (err) {
  console.error('PWA ERROR', err);
  failures++;
} finally {
  await browser.close();
  server.kill();
}

console.log(failures ? `\nPWA FAIL (${failures})` : '\nPWA PASS');
process.exit(failures ? 1 : 0);
