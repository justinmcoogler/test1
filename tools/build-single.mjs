// Build a single self-contained HTML file (all CSS + JS inlined) for easy
// sharing/hosting: node tools/build-single.mjs [outfile]
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'emberveil.html');

const result = await build({
  entryPoints: [join(root, 'js/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
});
const js = result.outputFiles[0].text;
const css = await readFile(join(root, 'css/style.css'), 'utf8');
let html = await readFile(join(root, 'index.html'), 'utf8');

// embed custom mob files so the single-file build ships them too
let mobs = [];
try {
  const manifest = JSON.parse(await readFile(join(root, 'mobs/manifest.json'), 'utf8'));
  for (const f of manifest) mobs.push(JSON.parse(await readFile(join(root, 'mobs', f), 'utf8')));
} catch { /* no mobs dir */ }

const fonts = await readFile(join(root, 'css/fonts.css'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="css\/fonts.css">/, `<style>\n${fonts}\n</style>`);
html = html.replace(/<link rel="stylesheet" href="css\/style.css">/, `<style>\n${css}\n</style>`);
html = html.replace(
  /<script type="module" src="js\/main.js"><\/script>/,
  () => `<script>window.__EMBEDDED=1;window.__EMBEDDED_MOBS=${JSON.stringify(mobs)}</script>\n<script>\n${js}\n</script>`
);

await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`built ${out} (${Math.round(html.length / 1024)} KB)`);
