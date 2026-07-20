// Value noise + fBm + domain warp, seeded and deterministic.
import { hash2, hash3 } from './rng.js';
import { lerp, smoothstep } from './math.js';

export function valueNoise2(seed, x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smoothstep(xf), v = smoothstep(yf);
  const a = hash2(seed, xi, yi);
  const b = hash2(seed, xi + 1, yi);
  const c = hash2(seed, xi, yi + 1);
  const d = hash2(seed, xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v); // [0,1]
}

export function valueNoise3(seed, x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smoothstep(xf), v = smoothstep(yf), w = smoothstep(zf);
  const n000 = hash3(seed, xi, yi, zi), n100 = hash3(seed, xi + 1, yi, zi);
  const n010 = hash3(seed, xi, yi + 1, zi), n110 = hash3(seed, xi + 1, yi + 1, zi);
  const n001 = hash3(seed, xi, yi, zi + 1), n101 = hash3(seed, xi + 1, yi, zi + 1);
  const n011 = hash3(seed, xi, yi + 1, zi + 1), n111 = hash3(seed, xi + 1, yi + 1, zi + 1);
  return lerp(
    lerp(lerp(n000, n100, u), lerp(n010, n110, u), v),
    lerp(lerp(n001, n101, u), lerp(n011, n111, u), v),
    w
  );
}

// Fractal Brownian motion, output roughly [0,1].
export function fbm2(seed, x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(seed + i * 1013, x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// Ridged noise for mountain crests and rivers, [0,1] (1 at the ridge line).
export function ridge2(seed, x, y, octaves = 3) {
  let amp = 0.5, freq = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise2(seed + i * 7717, x * freq, y * freq);
    sum += amp * (1 - Math.abs(2 * n - 1));
    amp *= 0.5;
    freq *= 2;
  }
  return sum;
}

// Domain-warped fBm: makes terrain look organic instead of blobby.
export function warped2(seed, x, y, octaves = 4, warpAmt = 20) {
  const wx = fbm2(seed + 5551, x * 0.01, y * 0.01, 3) * warpAmt;
  const wy = fbm2(seed + 9973, x * 0.01, y * 0.01, 3) * warpAmt;
  return fbm2(seed, x + wx, y + wy, octaves);
}
