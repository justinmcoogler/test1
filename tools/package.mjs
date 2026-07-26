// Build a single-file executable of the game server.
//
//   node tools/package.mjs                 # for this machine
//   node tools/package.mjs --target win-x64
//   node tools/package.mjs --target darwin-arm64
//
// The result is ONE file. No Node install, no clone, no npm, no folder to keep
// beside it — the whole game is inside the binary. Double-click it and it prints
// the address to read out to a tablet.
//
// HOW IT WORKS. Node ships a "single executable application" format: take the
// node binary, append a blob containing your script and any assets, and mark it.
// Three steps here:
//
//   1. esbuild bundles server/server.mjs and everything it imports into one
//      CommonJS file. CommonJS because that is all SEA accepts — which is why
//      server.mjs has no top-level await.
//   2. `node --experimental-sea-config` turns that plus the asset list into a
//      blob. The assets are the entire served tree, so the executable is
//      self-contained.
//   3. postject injects the blob into a copy of the node binary.
//
// CROSS-BUILDING is real but partial. Step 3 works on any host for any target —
// it is just editing a file — so a Windows .exe can be produced from Linux. What
// cannot be done from here is RUNNING it, and macOS additionally requires a code
// signature that only macOS tooling can apply. .github/workflows/package.yml
// builds each platform on its own runner for that reason.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile, copyFile, rm, chmod, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BUILD = join(root, 'build');
const OUT = join(root, 'dist');
const CACHE = join(root, 'build', 'runtimes');

// Everything the browser can ask for. Directories are walked; single files are
// taken as they are. If the server can serve it, it goes in the binary.
const ASSET_DIRS = ['css', 'js', 'mobs', 'assets'];
const ASSET_FILES = [
  'index.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png',
];

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const hostTarget = `${process.platform === 'win32' ? 'win' : process.platform}-${process.arch}`;
const target = arg('target', hostTarget);
const nodeVersion = arg('node-version', process.versions.node);

// nodejs.org's naming, which differs from process.platform for Windows.
function runtimeUrl(t, version) {
  const [os, arch] = t.split('-');
  if (os === 'win') return [`https://nodejs.org/dist/v${version}/win-${arch}/node.exe`, 'node.exe'];
  if (os === 'darwin') return [`https://nodejs.org/dist/v${version}/node-v${version}-darwin-${arch}.tar.gz`, 'tar'];
  if (os === 'linux') return [`https://nodejs.org/dist/v${version}/node-v${version}-linux-${arch}.tar.xz`, 'tar'];
  throw new Error(`unknown target "${t}" — expected win-x64, darwin-arm64, linux-x64 …`);
}

async function walk(dir, out = []) {
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const rel = posix.join(dir, entry.name);
    if (entry.isDirectory()) await walk(rel, out);
    else out.push(rel);
  }
  return out;
}

// Fetch (and cache) the node binary for a target. The host's own binary is used
// when building for the host, which keeps the common case offline.
async function runtimeFor(t) {
  if (t === hostTarget) return process.execPath;
  await mkdir(CACHE, { recursive: true });
  const cached = join(CACHE, `node-${nodeVersion}-${t}${t.startsWith('win') ? '.exe' : ''}`);
  if (existsSync(cached)) return cached;

  const [url, kind] = runtimeUrl(t, nodeVersion);
  console.log(`  fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not download the ${t} runtime (${res.status})`);

  if (kind === 'node.exe') {
    await writeFile(cached, Buffer.from(await res.arrayBuffer()));
  } else {
    // The tarballs hold node under <dir>/bin/node; extract just that.
    const tmp = join(CACHE, `dl-${t}`);
    await mkdir(tmp, { recursive: true });
    const archive = join(tmp, 'node-archive');
    await writeFile(archive, Buffer.from(await res.arrayBuffer()));
    execFileSync('tar', ['-xf', archive, '-C', tmp, '--strip-components', '2', '--wildcards', '*/bin/node'], { stdio: 'inherit' });
    await copyFile(join(tmp, 'node'), cached);
    await rm(tmp, { recursive: true, force: true });
  }
  await chmod(cached, 0o755).catch(() => {});
  return cached;
}

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

console.log('');
console.log(`  Packaging Sproutlands server for ${target} (node ${nodeVersion})`);
console.log('');

await mkdir(BUILD, { recursive: true });
await mkdir(OUT, { recursive: true });

// ---- 1. bundle --------------------------------------------------------------
const entryOut = join(BUILD, 'server.cjs');
await build({
  entryPoints: [join(root, 'server/server.mjs')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: entryOut,
  // node:sea is resolved at runtime and only exists inside a packaged binary;
  // bundling it would fail on any Node that predates it.
  external: ['node:sea'],
  legalComments: 'none',
});
console.log(`  bundled server  ${mb((await stat(entryOut)).size)}`);

// ---- 2. the SEA blob --------------------------------------------------------
const assets = {};
for (const f of ASSET_FILES) assets[f] = f;
for (const d of ASSET_DIRS) for (const f of await walk(d)) assets[f] = f;
const assetCount = Object.keys(assets).length;

const seaConfig = join(BUILD, 'sea-config.json');
const blob = join(BUILD, 'sea.blob');
await writeFile(seaConfig, JSON.stringify({
  main: relative(root, entryOut).split(sep).join('/'),
  output: relative(root, blob).split(sep).join('/'),
  disableExperimentalSEAWarning: true,
  assets,
}, null, 2));

execFileSync(process.execPath, ['--experimental-sea-config', seaConfig], { cwd: root, stdio: 'inherit' });
console.log(`  blob            ${mb((await stat(blob)).size)}  (${assetCount} files embedded)`);

// ---- 3. inject into the runtime ---------------------------------------------
const runtime = await runtimeFor(target);
const isWin = target.startsWith('win');
const exeName = `Sproutlands-Server-${target}${isWin ? '.exe' : ''}`;
const exe = join(OUT, exeName);
await copyFile(runtime, exe);
await chmod(exe, 0o755).catch(() => {});

const postject = join(root, 'node_modules', 'postject', 'dist', 'cli.js');
if (!existsSync(postject)) {
  console.error('\n  postject is not installed. Run: npm install\n');
  process.exit(1);
}
const injectArgs = [
  postject, exe, 'NODE_SEA_BLOB', blob,
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
];
// macOS binaries carry a signature that injection invalidates; it must be
// stripped before and re-applied after, and only macOS can do the re-applying.
if (target.startsWith('darwin')) injectArgs.push('--macho-segment-name', 'NODE_SEA');
execFileSync(process.execPath, injectArgs, { stdio: 'inherit' });

if (target.startsWith('darwin') && process.platform === 'darwin') {
  execFileSync('codesign', ['--sign', '-', exe], { stdio: 'inherit' });
  console.log('  signed (ad-hoc)');
} else if (target.startsWith('darwin')) {
  console.log('  NOT SIGNED — a macOS build must be signed on macOS or it will not launch.');
}

console.log('');
console.log(`  ${exe}`);
console.log(`  ${mb((await stat(exe)).size)}`);
console.log('');
if (target !== hostTarget) {
  console.log('  Built for another platform, so it has NOT been run. Only a build');
  console.log('  made on the target OS has actually been tested.');
  console.log('');
}
