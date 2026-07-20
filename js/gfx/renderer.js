// Renderer: camera, chunk meshes, entities, overlays, particles.
import {
  createGL, compileProgram, WORLD_VS, WORLD_FS, COLOR_VS, COLOR_FS,
  uploadWorldMesh, uploadColorMesh, deleteMesh, createAtlasTexture,
} from './gl.js';
import { meshChunk } from './mesher.js';
import { CHUNK, WORLD_H } from '../world/worldgen.js';
import {
  mat4Identity, mat4Perspective, mat4Multiply, mat4View, mat4LookAt,
  frustumPlanes, aabbInFrustum, clamp,
} from '../core/math.js';
import { getAtlasCanvas } from './textures.js';

const DAY_FOG = [0.62, 0.76, 0.88];
const CAVE_FOG = [0.05, 0.06, 0.08];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = (this.gl = createGL(canvas));
    this.worldProg = compileProgram(gl, WORLD_VS, WORLD_FS);
    this.colorProg = compileProgram(gl, COLOR_VS, COLOR_FS);
    this.atlasTex = createAtlasTexture(gl, getAtlasCanvas());
    this.chunkMeshes = new Map(); // chunkKey → {opaque, cutout, water}
    this.modelCache = new Map();  // modelName → mesh
    this.proj = mat4Identity();
    this.view = mat4Identity();
    this.pv = mat4Identity();
    this.tmp = mat4Identity();
    this.planes = [];
    this.camPos = [0, 40, 0];
    this.fov = 72 * Math.PI / 180;
    this.renderDistance = 5; // chunks
    this.fogMix = 0;         // 0 surface … 1 cave
    this.particles = [];
    this.time = 0;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.canvas.clientWidth * dpr) || 800;
    const h = Math.floor(this.canvas.clientHeight * dpr) || 600;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
    mat4Perspective(this.proj, this.fov, w / h, 0.08, 400);
  }

  setFPSCamera(eye, yaw, pitch) {
    this.camPos = [eye[0], eye[1], eye[2]];
    mat4View(this.view, eye, yaw, pitch);
    mat4Multiply(this.pv, this.proj, this.view);
    frustumPlanes(this.pv, this.planes);
  }

  setOrbitCamera(eye, target) {
    this.camPos = [eye[0], eye[1], eye[2]];
    mat4LookAt(this.view, eye, target);
    mat4Multiply(this.pv, this.proj, this.view);
    frustumPlanes(this.pv, this.planes);
  }

  // ---- chunk mesh lifecycle ----
  remeshChunk(world, cx, cz) {
    const key = `${cx},${cz}`;
    const old = this.chunkMeshes.get(key);
    if (old) {
      deleteMesh(this.gl, old.opaque); deleteMesh(this.gl, old.cutout); deleteMesh(this.gl, old.water);
    }
    const m = meshChunk(world, cx, cz);
    const gl = this.gl;
    this.chunkMeshes.set(key, {
      cx, cz,
      opaque: m.opaque ? uploadWorldMesh(gl, m.opaque.verts, m.opaque.indices) : null,
      cutout: m.cutout ? uploadWorldMesh(gl, m.cutout.verts, m.cutout.indices) : null,
      water: m.water ? uploadWorldMesh(gl, m.water.verts, m.water.indices) : null,
    });
  }

  dropChunk(key) {
    const m = this.chunkMeshes.get(key);
    if (!m) return;
    deleteMesh(this.gl, m.opaque); deleteMesh(this.gl, m.cutout); deleteMesh(this.gl, m.water);
    this.chunkMeshes.delete(key);
  }

  hasMesh(cx, cz) { return this.chunkMeshes.has(`${cx},${cz}`); }

  // ---- voxel-box entity models ----
  registerModel(name, boxes) {
    if (this.modelCache.has(name)) return;
    const verts = [], indices = [];
    let vc = 0;
    const faceDefs = [
      { n: [0, 1, 0], b: 1.0 }, { n: [0, -1, 0], b: 0.55 },
      { n: [0, 0, 1], b: 0.85 }, { n: [0, 0, -1], b: 0.85 },
      { n: [1, 0, 0], b: 0.7 }, { n: [-1, 0, 0], b: 0.7 },
    ];
    for (const box of boxes) {
      const { x, y, z, w, h, d } = box;
      const [r, g, b] = box.color;
      const x2 = x + w, y2 = y + h, z2 = z + d;
      const corners = {
        top: [[x, y2, z2], [x2, y2, z2], [x2, y2, z], [x, y2, z]],
        bottom: [[x, y, z], [x2, y, z], [x2, y, z2], [x, y, z2]],
        south: [[x, y, z2], [x2, y, z2], [x2, y2, z2], [x, y2, z2]],
        north: [[x2, y, z], [x, y, z], [x, y2, z], [x2, y2, z]],
        east: [[x2, y, z2], [x2, y, z], [x2, y2, z], [x2, y2, z2]],
        west: [[x, y, z], [x, y, z2], [x, y2, z2], [x, y2, z]],
      };
      const order = ['top', 'bottom', 'south', 'north', 'east', 'west'];
      order.forEach((fname, fi) => {
        const br = faceDefs[fi].b;
        for (const p of corners[fname]) verts.push(p[0], p[1], p[2], r * br, g * br, b * br);
        indices.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
        vc += 4;
      });
    }
    this.modelCache.set(name, uploadColorMesh(this.gl, new Float32Array(verts), new Uint32Array(indices)));
  }

  // ---- particles ----
  spawnParticles(x, y, z, color, count = 8, speed = 2.4, life = 0.6, size = 0.08) {
    if (this.reducedMotion) count = Math.min(count, 3);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, z,
        vx: (Math.random() - 0.5) * speed,
        vy: Math.random() * speed * 0.9 + 0.5,
        vz: (Math.random() - 0.5) * speed,
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life, color, size,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy -= 7 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
  }

  // ---- main draw ----
  draw(world, opts) {
    const gl = this.gl;
    this.time += opts.dt || 0.016;
    this.updateParticles(opts.dt || 0.016);
    const fog = [
      DAY_FOG[0] + (CAVE_FOG[0] - DAY_FOG[0]) * this.fogMix,
      DAY_FOG[1] + (CAVE_FOG[1] - DAY_FOG[1]) * this.fogMix,
      DAY_FOG[2] + (CAVE_FOG[2] - DAY_FOG[2]) * this.fogMix,
    ];
    gl.clearColor(fog[0], fog[1], fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fogFar = this.renderDistance * CHUNK * 0.95;
    const fogNear = fogFar * 0.55;

    // --- world passes ---
    const wp = this.worldProg;
    gl.useProgram(wp.prog);
    gl.uniformMatrix4fv(wp.uniforms.uPV, false, this.pv);
    gl.uniformMatrix4fv(wp.uniforms.uModel, false, mat4Identity(this.tmp));
    gl.uniform3fv(wp.uniforms.uCamPos, this.camPos);
    gl.uniform3fv(wp.uniforms.uFogColor, fog);
    gl.uniform1f(wp.uniforms.uFogNear, fogNear);
    gl.uniform1f(wp.uniforms.uFogFar, fogFar);
    gl.uniform1f(wp.uniforms.uOpacity, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.uniform1i(wp.uniforms.uAtlas, 0);

    const pcx = Math.floor(this.camPos[0] / CHUNK), pcz = Math.floor(this.camPos[2] / CHUNK);
    const visible = [];
    for (const [key, m] of this.chunkMeshes) {
      const dx = m.cx - pcx, dz = m.cz - pcz;
      if (Math.max(Math.abs(dx), Math.abs(dz)) > this.renderDistance) continue;
      const minX = m.cx * CHUNK, minZ = m.cz * CHUNK;
      if (!aabbInFrustum(this.planes, minX, 0, minZ, minX + CHUNK, WORLD_H, minZ + CHUNK)) continue;
      visible.push(m);
    }

    gl.uniform1f(wp.uniforms.uCutout, 0);
    for (const m of visible) {
      if (!m.opaque) continue;
      gl.bindVertexArray(m.opaque.vao);
      gl.drawElements(gl.TRIANGLES, m.opaque.count, gl.UNSIGNED_INT, 0);
    }

    gl.uniform1f(wp.uniforms.uCutout, 1);
    gl.disable(gl.CULL_FACE);
    for (const m of visible) {
      if (!m.cutout) continue;
      gl.bindVertexArray(m.cutout.vao);
      gl.drawElements(gl.TRIANGLES, m.cutout.count, gl.UNSIGNED_INT, 0);
    }
    gl.enable(gl.CULL_FACE);

    // --- entities ---
    const cp = this.colorProg;
    gl.useProgram(cp.prog);
    gl.uniformMatrix4fv(cp.uniforms.uPV, false, this.pv);
    gl.uniform3fv(cp.uniforms.uCamPos, this.camPos);
    gl.uniform3fv(cp.uniforms.uFogColor, fog);
    gl.uniform1f(cp.uniforms.uFogNear, fogNear);
    gl.uniform1f(cp.uniforms.uFogFar, fogFar);
    gl.uniform1f(cp.uniforms.uOpacity, 1);
    gl.uniform3f(cp.uniforms.uTint, 0, 0, 0);

    for (const e of opts.entities || []) {
      const mesh = this.modelCache.get(e.model);
      if (!mesh) continue;
      const s = e.scale || 1;
      const cy = Math.cos(e.yaw || 0), sy = Math.sin(e.yaw || 0);
      // model matrix: rotY * scale then translate
      const mm = this.tmp;
      mm[0] = cy * s; mm[1] = 0; mm[2] = -sy * s; mm[3] = 0;
      mm[4] = 0; mm[5] = s; mm[6] = 0; mm[7] = 0;
      mm[8] = sy * s; mm[9] = 0; mm[10] = cy * s; mm[11] = 0;
      mm[12] = e.x; mm[13] = e.y; mm[14] = e.z; mm[15] = 1;
      gl.uniformMatrix4fv(cp.uniforms.uModel, false, mm);
      gl.uniform3f(cp.uniforms.uTint, ...(e.tint || [0, 0, 0]));
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
    }
    gl.uniform3f(cp.uniforms.uTint, 0, 0, 0);

    // --- water (transparent) ---
    gl.useProgram(wp.prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.uniform1f(wp.uniforms.uCutout, 0);
    gl.uniform1f(wp.uniforms.uOpacity, 0.78);
    for (const m of visible) {
      if (!m.water) continue;
      gl.bindVertexArray(m.water.vao);
      gl.drawElements(gl.TRIANGLES, m.water.count, gl.UNSIGNED_INT, 0);
    }
    gl.uniform1f(wp.uniforms.uOpacity, 1);

    // --- overlays: tile highlights, selection box, particles, markers ---
    gl.useProgram(cp.prog);
    gl.uniformMatrix4fv(cp.uniforms.uModel, false, mat4Identity(this.tmp));
    this.drawOverlays(opts);

    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  drawOverlays(opts) {
    const gl = this.gl;
    const cp = this.colorProg;
    const verts = [], indices = [];
    let vc = 0;
    const quad = (p, color) => {
      for (const pt of p) verts.push(pt[0], pt[1], pt[2], color[0], color[1], color[2]);
      indices.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
      vc += 4;
    };

    for (const t of opts.tiles || []) {
      const y = t.y + 0.04;
      quad(
        [[t.x + 0.06, y, t.z + 0.94], [t.x + 0.94, y, t.z + 0.94], [t.x + 0.94, y, t.z + 0.06], [t.x + 0.06, y, t.z + 0.06]],
        t.color
      );
    }
    for (const p of this.particles) {
      // camera-facing billboard
      const rx = [this.view[0], this.view[4], this.view[8]];
      const ry = [this.view[1], this.view[5], this.view[9]];
      const s = p.size * (0.5 + 0.5 * (p.life / p.maxLife));
      quad(
        [
          [p.x - rx[0] * s - ry[0] * s, p.y - rx[1] * s - ry[1] * s, p.z - rx[2] * s - ry[2] * s],
          [p.x + rx[0] * s - ry[0] * s, p.y + rx[1] * s - ry[1] * s, p.z + rx[2] * s - ry[2] * s],
          [p.x + rx[0] * s + ry[0] * s, p.y + rx[1] * s + ry[1] * s, p.z + rx[2] * s + ry[2] * s],
          [p.x - rx[0] * s + ry[0] * s, p.y - rx[1] * s + ry[1] * s, p.z - rx[2] * s + ry[2] * s],
        ],
        p.color
      );
    }
    for (const mk of opts.markers || []) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3 + mk.x);
      const r = 0.28 + pulse * 0.1;
      const y = mk.y + 0.95;
      quad(
        [[mk.x + 0.5 - r, y, mk.z + 0.5 + r], [mk.x + 0.5 + r, y, mk.z + 0.5 + r], [mk.x + 0.5 + r, y, mk.z + 0.5 - r], [mk.x + 0.5 - r, y, mk.z + 0.5 - r]],
        mk.color
      );
    }

    if (vc > 0) {
      gl.uniform1f(cp.uniforms.uOpacity, 0.45);
      const mesh = uploadColorMesh(gl, new Float32Array(verts), new Uint32Array(indices), true);
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
      deleteMesh(gl, mesh);
      gl.uniform1f(cp.uniforms.uOpacity, 1);
    }

    // selection wireframe
    if (opts.selection) {
      const { x, y, z } = opts.selection;
      const e = 0.004;
      const lo = [x - e, y - e, z - e], hi = [x + 1 + e, y + 1 + e, z + 1 + e];
      const lv = [];
      const c = [0.05, 0.05, 0.05];
      const P = (a, b, cc) => [a, b, cc];
      const cs = [
        [lo[0], lo[1], lo[2]], [hi[0], lo[1], lo[2]], [hi[0], lo[1], hi[2]], [lo[0], lo[1], hi[2]],
        [lo[0], hi[1], lo[2]], [hi[0], hi[1], lo[2]], [hi[0], hi[1], hi[2]], [lo[0], hi[1], hi[2]],
      ];
      const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      for (const [a, b] of edges) {
        lv.push(cs[a][0], cs[a][1], cs[a][2], c[0], c[1], c[2]);
        lv.push(cs[b][0], cs[b][1], cs[b][2], c[0], c[1], c[2]);
      }
      const gl2 = this.gl;
      const vao = gl2.createVertexArray();
      gl2.bindVertexArray(vao);
      const vbo = gl2.createBuffer();
      gl2.bindBuffer(gl2.ARRAY_BUFFER, vbo);
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array(lv), gl2.DYNAMIC_DRAW);
      gl2.enableVertexAttribArray(0);
      gl2.vertexAttribPointer(0, 3, gl2.FLOAT, false, 24, 0);
      gl2.enableVertexAttribArray(1);
      gl2.vertexAttribPointer(1, 3, gl2.FLOAT, false, 24, 12);
      gl2.uniform1f(cp.uniforms.uOpacity, 0.9);
      gl2.drawArrays(gl2.LINES, 0, lv.length / 6);
      gl2.uniform1f(cp.uniforms.uOpacity, 1);
      gl2.bindVertexArray(null);
      gl2.deleteVertexArray(vao);
      gl2.deleteBuffer(vbo);
    }
  }

  // world → screen (CSS pixels); returns null when behind camera
  project(x, y, z) {
    const m = this.pv;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.05) return null;
    const sx = (cx / cw * 0.5 + 0.5) * this.canvas.clientWidth;
    const sy = (0.5 - cy / cw * 0.5) * this.canvas.clientHeight;
    return [sx, sy, cw];
  }
}
