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
  const r = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let ro = 0; ro < 4; ro++) {
      r[c * 4 + ro] =
        a[ro] * b[c * 4] +
        a[4 + ro] * b[c * 4 + 1] +
        a[8 + ro] * b[c * 4 + 2] +
        a[12 + ro] * b[c * 4 + 3];
    }
  }
  out.set(r);
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

// Extract 6 frustum planes [a,b,c,d] from a projection*view matrix.
export function frustumPlanes(m, out = []) {
  const rows = [
    [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],   // left
    [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],   // right
    [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],   // bottom
    [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],   // top
    [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],  // near
    [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],  // far
  ];
  for (let i = 0; i < 6; i++) {
    const [a, b, c, d] = rows[i];
    const l = Math.hypot(a, b, c) || 1;
    out[i] = [a / l, b / l, c / l, d / l];
  }
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
