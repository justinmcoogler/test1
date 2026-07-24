// Generates mobs/glimmerfox.json — the reference "mob" file.
// Paints the 64×64 skin programmatically (raw RGBA) so no image tools needed.
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 64, H = 64;
const px = new Uint8Array(W * H * 4);

let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
function put(x, y, r, g, b, a = 255) {
  const i = (y * W + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}
function fill(x0, y0, w, h, [r, g, b], noise = 14) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = (rnd() - 0.5) * 2 * noise;
    put(x, y, Math.max(0, Math.min(255, r + n)), Math.max(0, Math.min(255, g + n)), Math.max(0, Math.min(255, b + n)));
  }
}

const ORANGE = [212, 122, 48], LIGHT = [228, 148, 74], CREAM = [238, 224, 198];
const DARK = [92, 62, 40], WHITE = [244, 240, 232];

fill(0, 0, W, H, [40, 30, 26], 4);         // background (unused areas)
fill(0, 0, 20, 12, ORANGE);                // body sides/top
for (let i = 0; i < 26; i++) put(Math.floor(rnd() * 20), Math.floor(rnd() * 12), 190, 104, 38);
fill(20, 0, 12, 12, CREAM);                // belly
fill(32, 0, 12, 12, LIGHT);                // head
fill(44, 0, 12, 12, LIGHT);                // face
fill(46, 3, 2, 2, DARK[0] - 40 < 0 ? [30, 30, 34] : [30, 30, 34], 0); // left eye
fill(52, 3, 2, 2, [30, 30, 34], 0);        // right eye
fill(48, 8, 4, 3, WHITE);                  // muzzle
fill(49, 8, 2, 1, [40, 34, 36], 0);        // nose
fill(0, 16, 6, 12, DARK);                  // legs
fill(8, 16, 10, 8, ORANGE);                // tail
fill(18, 16, 8, 8, WHITE);                 // tail tip
fill(32, 16, 8, 8, DARK);                  // ears

const rgbaBase64 = Buffer.from(px).toString('base64');

const legBox = (x, z) => ({
  from: [x, 0, z], size: [0.14, 0.34, 0.14], uv: [0, 16, 6, 12],
});

const mob = {
  format: 'mob',
  version: 1,
  id: 'glimmer_fox',
  label: 'Glimmer Fox',
  scale: 1.0,
  texture: { width: 64, height: 64, rgbaBase64 },
  parts: [
    {
      id: 'body', parent: null, pivot: [0, 0.5, 0],
      boxes: [{
        from: [-0.28, 0.3, -0.5], size: [0.56, 0.42, 1.0],
        uv: { north: [0, 0, 20, 12], south: [0, 0, 20, 12], east: [0, 0, 20, 12], west: [0, 0, 20, 12], up: [0, 0, 20, 12], down: [20, 0, 12, 12] },
      }],
    },
    {
      id: 'head', parent: 'body', pivot: [0, 0.62, 0.48],
      boxes: [
        {
          from: [-0.19, 0.5, 0.42], size: [0.38, 0.36, 0.38],
          uv: { north: [32, 0, 12, 12], south: [44, 0, 12, 12], east: [32, 0, 12, 12], west: [32, 0, 12, 12], up: [32, 0, 12, 12], down: [32, 0, 12, 12] },
        },
        { from: [-0.17, 0.86, 0.5], size: [0.1, 0.14, 0.06], uv: [32, 16, 8, 8] },
        { from: [0.07, 0.86, 0.5], size: [0.1, 0.14, 0.06], uv: [32, 16, 8, 8] },
      ],
    },
    {
      id: 'tail', parent: 'body', pivot: [0, 0.55, -0.5],
      boxes: [
        { from: [-0.08, 0.48, -0.98], size: [0.16, 0.16, 0.5], uv: [8, 16, 10, 8] },
        { from: [-0.06, 0.5, -1.16], size: [0.12, 0.12, 0.2], uv: [18, 16, 8, 8] },
      ],
    },
    { id: 'leg_fl', parent: 'body', pivot: [0.17, 0.36, 0.3], boxes: [legBox(0.1, 0.24)] },
    { id: 'leg_fr', parent: 'body', pivot: [-0.17, 0.36, 0.3], boxes: [legBox(-0.24, 0.24)] },
    { id: 'leg_bl', parent: 'body', pivot: [0.17, 0.36, -0.32], boxes: [legBox(0.1, -0.38)] },
    { id: 'leg_br', parent: 'body', pivot: [-0.17, 0.36, -0.32], boxes: [legBox(-0.24, -0.38)] },
  ],
  animations: {
    idle: {
      length: 3, loop: true,
      parts: {
        tail: { rotate: [[0, [0, -16, 0]], [1.5, [8, 16, 0]], [3, [0, -16, 0]]] },
        head: { rotate: [[0, [0, 0, 0]], [1.2, [6, 8, 0]], [2.2, [0, -6, 0]], [3, [0, 0, 0]]] },
        body: { translate: [[0, [0, 0, 0]], [1.5, [0, 0.02, 0]], [3, [0, 0, 0]]] },
      },
    },
    walk: {
      length: 0.6, loop: true,
      parts: {
        leg_fl: { rotate: [[0, [28, 0, 0]], [0.3, [-28, 0, 0]], [0.6, [28, 0, 0]]] },
        leg_br: { rotate: [[0, [28, 0, 0]], [0.3, [-28, 0, 0]], [0.6, [28, 0, 0]]] },
        leg_fr: { rotate: [[0, [-28, 0, 0]], [0.3, [28, 0, 0]], [0.6, [-28, 0, 0]]] },
        leg_bl: { rotate: [[0, [-28, 0, 0]], [0.3, [28, 0, 0]], [0.6, [-28, 0, 0]]] },
        tail: { rotate: [[0, [0, -10, 0]], [0.3, [0, 10, 0]], [0.6, [0, -10, 0]]] },
      },
    },
    attack: {
      length: 0.5, loop: false,
      parts: {
        head: { rotate: [[0, [0, 0, 0]], [0.15, [-24, 0, 0]], [0.35, [14, 0, 0]], [0.5, [0, 0, 0]]] },
        body: { translate: [[0, [0, 0, 0]], [0.2, [0, 0, 0.12]], [0.5, [0, 0, 0]]] },
      },
    },
  },
  stats: {
    hp: 14, atk: 4, acc: 62, evasion: 16, armor: 0, speed: 8, moveRange: 4,
    behavior: 'defensive', tier: 0, xp: 22, huntXp: 16, respawn: 90,
    weak: [], resist: [],
    desc: 'A quick amber fox with a glint of veil-light in its tail.',
    recommend: 'Fast but fragile — corner it before it darts away.',
  },
  drops: [
    { item: 'sinew', qty: [1, 2], chance: 0.8 },
    { item: 'amber_resin', qty: [1, 1], chance: 0.15 },
  ],
  spawn: { biomes: ['greenwood_plains', 'ancient_forest'], density: 0.0012 },
};

await mkdir(join(root, 'mobs'), { recursive: true });
await writeFile(join(root, 'mobs', 'glimmerfox.json'), JSON.stringify(mob));
await writeFile(join(root, 'mobs', 'manifest.json'), JSON.stringify(['glimmerfox.json'], null, 2));
console.log('wrote mobs/glimmerfox.json + manifest.json');
