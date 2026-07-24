// Minimal 3D math: column-major mat4 (WebGL convention), vec3 helpers.

export function mat4Identity(out = new Float32Array(16)) {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

export function mat4Perspective(out, fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function mat4Multiply(out, a, b) {
  // Zero-allocation, alias-safe (out may equal a or b): read every input into
  // scalar locals first, then write. This fires 6N+ times/frame with entities,
  // so the old per-call Float32Array(16) was a top GC source (mobile jank).
  const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
  const a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11], a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
  const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
  const b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
  out[0] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
  out[1] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
  out[2] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
  out[3] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
  out[4] = a0 * b4 + a4 * b5 + a8 * b6 + a12 * b7;
  out[5] = a1 * b4 + a5 * b5 + a9 * b6 + a13 * b7;
  out[6] = a2 * b4 + a6 * b5 + a10 * b6 + a14 * b7;
  out[7] = a3 * b4 + a7 * b5 + a11 * b6 + a15 * b7;
  out[8] = a0 * b8 + a4 * b9 + a8 * b10 + a12 * b11;
  out[9] = a1 * b8 + a5 * b9 + a9 * b10 + a13 * b11;
  out[10] = a2 * b8 + a6 * b9 + a10 * b10 + a14 * b11;
  out[11] = a3 * b8 + a7 * b9 + a11 * b10 + a15 * b11;
  out[12] = a0 * b12 + a4 * b13 + a8 * b14 + a12 * b15;
  out[13] = a1 * b12 + a5 * b13 + a9 * b14 + a13 * b15;
  out[14] = a2 * b12 + a6 * b13 + a10 * b14 + a14 * b15;
  out[15] = a3 * b12 + a7 * b13 + a11 * b14 + a15 * b15;
  return out;
}

// View matrix from eye position + yaw/pitch (radians). Yaw 0 looks toward -Z.
export function mat4View(out, eye, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Camera basis
  const fx = -sy * cp, fy = sp, fz = -cy * cp;          // forward
  const rx = cy, ry = 0, rz = -sy;                      // right
  const ux = -sy * -sp, uy = cp, uz = -cy * -sp;        // up = right × forward... computed directly
  out[0] = rx; out[4] = ry; out[8] = rz;
  out[1] = ux; out[5] = uy; out[9] = uz;
  out[2] = -fx; out[6] = -fy; out[10] = -fz;
  out[3] = 0; out[7] = 0; out[11] = 0;
  out[12] = -(rx * eye[0] + ry * eye[1] + rz * eye[2]);
  out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
  out[14] = -(-fx * eye[0] + -fy * eye[1] + -fz * eye[2]);
  out[15] = 1;
  return out;
}

// Look-at view matrix (for combat camera).
export function mat4LookAt(out, eye, target, up = [0, 1, 0]) {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  let xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl; xy /= xl; xz /= xl;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[4] = xy; out[8] = xz;
  out[1] = yx; out[5] = yy; out[9] = yz;
  out[2] = zx; out[6] = zy; out[10] = zz;
  out[3] = 0; out[7] = 0; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

export function mat4Translate(out, x, y, z) {
  mat4Identity(out);
  out[12] = x; out[13] = y; out[14] = z;
  return out;
}

export function mat4RotateY(out, rad) {
  mat4Identity(out);
  const c = Math.cos(rad), s = Math.sin(rad);
  out[0] = c; out[8] = s;
  out[2] = -s; out[10] = c;
  return out;
}

export function mat4Scale(out, x, y, z) {
  mat4Identity(out);
  out[0] = x; out[5] = y; out[10] = z;
  return out;
}

// Extract 6 frustum planes [a,b,c,d] from a projection*view matrix. Writes into
// `out` in place — pass a reused array (its 6 plane sub-arrays are reused too)
// so a per-frame call allocates nothing.
export function frustumPlanes(m, out = []) {
  const set = (i, a, b, c, d) => {
    const l = Math.hypot(a, b, c) || 1;
    let p = out[i];
    if (!p) p = out[i] = [0, 0, 0, 0];
    p[0] = a / l; p[1] = b / l; p[2] = c / l; p[3] = d / l;
  };
  set(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);   // left
  set(1, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);   // right
  set(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);   // bottom
  set(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);   // top
  set(4, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);  // near
  set(5, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);  // far
  return out;
}

// AABB vs frustum: true if the box may be visible.
export function aabbInFrustum(planes, minX, minY, minZ, maxX, maxY, maxZ) {
  for (let i = 0; i < 6; i++) {
    const p = planes[i];
    const x = p[0] > 0 ? maxX : minX;
    const y = p[1] > 0 ? maxY : minY;
    const z = p[2] > 0 ? maxZ : minZ;
    if (p[0] * x + p[1] * y + p[2] * z + p[3] < 0) return false;
  }
  return true;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const dist2 = (x1, z1, x2, z2) => Math.hypot(x2 - x1, z2 - z1);
