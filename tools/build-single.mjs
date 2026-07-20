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

html = html.replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`);
html = html.replace(
  /<script type="module" src="js\/main.js"><\/script>/,
  () => `<script>\n${js}\n</script>`
);

await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`built ${out} (${Math.round(html.length / 1024)} KB)`);
