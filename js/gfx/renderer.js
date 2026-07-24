// Renderer: camera, chunk meshes, entities, overlays, particles.
import {
  createGL, compileProgram, WORLD_VS, WORLD_FS, TERRAIN_FS, COLOR_VS, COLOR_FS,
  SKY_VS, SKY_FS, uploadWorldMesh, deleteMesh, createAtlasTexture,
} from './gl.js';
import { meshChunk } from './mesher.js';
import { buildSnapshot } from './mesh-snapshot.js';
import { ChunkBatch, MultiDraw } from './chunkpool.js';
import { CHUNK, WORLD_H } from '../world/worldgen.js';
import {
  mat4Identity, mat4Perspective, mat4Multiply, mat4View, mat4LookAt,
  frustumPlanes, aabbInFrustum, clamp,
} from '../core/math.js';
import { getAtlasCanvas, tileUV } from './textures.js';

const DAY_FOG = [0.62, 0.76, 0.88];
const NIGHT_FOG = [0.045, 0.06, 0.12];
const CAVE_FOG = [0.05, 0.06, 0.08];

// The 12 edges of a unit cube (index pairs into an 8-corner list) — the
// selection wireframe. Module const so it isn't rebuilt each targeted frame.
const SELECTION_EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

// Axis-aligned bounds over one or more box lists (model space) — centre + a
// half-extent radius. Used to frame the admin/debug mob-preview camera so every
// creature, bee to dragon, fits its thumbnail.
function modelBounds(boxLists) {
  let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
  for (const boxes of boxLists) for (const b of boxes || []) {
    mnx = Math.min(mnx, b.x); mny = Math.min(mny, b.y); mnz = Math.min(mnz, b.z);
    mxx = Math.max(mxx, b.x + b.w); mxy = Math.max(mxy, b.y + b.h); mxz = Math.max(mxz, b.z + b.d);
  }
  if (mnx === Infinity) return { cx: 0, cy: 0.9, cz: 0, r: 1 };
  return { cx: (mnx + mxx) / 2, cy: (mny + mxy) / 2, cz: (mnz + mxz) / 2, r: Math.max(0.3, Math.max(mxx - mnx, mxy - mny, mxz - mnz) / 2) };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = (this.gl = createGL(canvas));
    // Two variants each of the terrain + entity programs: the opaque build omits
    // `discard` so tile GPUs keep early-Z on the (large) opaque + water passes;
    // the CUTOUT build keeps `discard` for the alpha-tested foliage/skin pass.
    this.terrainProg = compileProgram(gl, WORLD_VS, TERRAIN_FS);
    this.terrainCutProg = compileProgram(gl, WORLD_VS, TERRAIN_FS, ['CUTOUT']);
    this.worldProg = compileProgram(gl, WORLD_VS, WORLD_FS); // entities never discard (opaque skins)
    this.colorProg = compileProgram(gl, COLOR_VS, COLOR_FS);
    this.skyProg = compileProgram(gl, SKY_VS, SKY_FS);
    this.skyVAO = (() => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 1, -1, 1, 1, 1, 2, -1, 1, 3]), gl.STATIC_DRAW);
      const ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * 4, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * 4, 2 * 4);
      gl.bindVertexArray(null);
      return vao;
    })();
    this.highQuality = false;      // gradient sky + sun/moon/stars, gated by graphics preset
    this.sunDir = [0.4, 0.85, 0.2];
    this.daylight = 1; // 0.25 night … 1 noon, driven by the world clock
    this.atlasTex = createAtlasTexture(gl, getAtlasCanvas());
    this.chunkMeshes = new Map(); // chunkKey → {cx, cz, top, opaque, cutout, water}
    this.modelCache = new Map();  // modelName → mesh
    // Shared-buffer + WEBGL_multi_draw batcher (one GPU draw per world pass).
    // Null when the extension is missing → falls back to the per-chunk loop.
    this._initBatcher();
    // async mesh worker (off-thread chunk meshing; falls back to synchronous)
    this._meshJobId = 0;
    this._meshLatest = new Map(); // chunkKey → latest requested job id (staleness guard)
    this._meshWorker = null;
    this._meshReady = false;
    this._initMeshWorker();
    this.proj = mat4Identity();
    this.view = mat4Identity();
    this.pv = mat4Identity();
    this.tmp = mat4Identity();
    // persistent per-frame scratch (reused every draw() — no allocation)
    this._baseMat = new Float32Array(16);
    this._partMat = new Float32Array(16);
    this._visible = [];
    this.planes = [];
    this.camPos = [0, 40, 0];
    this.fov = 72 * Math.PI / 180;
    this.renderDistance = 5; // chunks
    this.renderScale = 1;    // adaptive-resolution factor (0.5–1), driven by FPS
    this.dynamicResolution = true;
    this.fogMix = 0;         // 0 surface … 1 cave
    this.particles = [];
    this.precip = { type: null, intensity: 0, wind: 0, pool: [] }; // rain/snow field around the camera
    this.time = 0;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    this.resize();
  }

  resize() {
    // Adaptive resolution: on weak GPUs (phones) we render the 3D scene at fewer
    // pixels and let the browser upscale the canvas to fill — a big fill-rate
    // saving that the pixel-art look mostly hides, so the render distance can
    // stay far. renderScale is driven by measured FPS in adaptResolution().
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap || 2) * (this.renderScale || 1);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr)) || 800;
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr)) || 600;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
    mat4Perspective(this.proj, this.fov, w / h, 0.08, 400);
  }

  // Nudge the internal render scale toward a smooth frame rate. Sampled over a
  // ~0.5s window with a cooldown + hysteresis so it settles instead of pumping.
  adaptResolution(dt) {
    if (this.dynamicResolution === false) return;
    if (this.renderScale === undefined) this.renderScale = 1;
    this._scaleAccum = (this._scaleAccum || 0) + dt;
    this._scaleFrames = (this._scaleFrames || 0) + 1;
    this._scaleCd = (this._scaleCd || 0) - dt;
    if (this._scaleAccum < 0.5) return;
    const fps = this._scaleFrames / this._scaleAccum;
    this._scaleAccum = 0; this._scaleFrames = 0;
    if (this._scaleCd > 0) return;
    let s = this.renderScale;
    const floor = this.scaleFloor || 0.5; // Low tier lets it drop further on weak GPUs

    // Aim at the rate the DISPLAY can actually deliver, not a hardcoded 60. A
    // phone in Low Power Mode is capped at 30, a plain screen does 60, ProMotion
    // 120 — and chasing 60 on a 30-capped device would drive the resolution to
    // the blur floor and never recover, since 58 is unreachable there. The peak
    // rate we've recently sustained is that ceiling; it decays slowly so the
    // target follows the device if a cap switches on mid-session.
    this._fpsPeak = Math.max(fps, (this._fpsPeak ?? fps) * 0.98);
    const ceiling = Math.max(28, Math.min(120, this._fpsPeak));

    // Did the last cut actually buy anything? If we shrank the frame and the
    // rate didn't move, we aren't fill-bound — something else is holding it
    // down. Give the pixels back and stop cutting for a while.
    if (this._droppedAt != null) {
      const helped = fps > this._droppedAt * 1.06;
      this._droppedAt = null;
      if (!helped) {
        this._noDropUntil = 12;                     // seconds of hands-off
        s = Math.min(1, +(s + 0.1).toFixed(2));
        if (s !== this.renderScale) { this.renderScale = s; this._scaleCd = 2; this.resize(); }
        return;
      }
    }
    this._noDropUntil = Math.max(0, (this._noDropUntil || 0) - 0.5);

    if (fps < ceiling * 0.75 && s > floor && !this._noDropUntil) {
      s = Math.max(floor, +(s - 0.1).toFixed(2));
      this._droppedAt = fps;                        // measure whether it helped
    } else if (fps > ceiling * 0.92 && s < 1) {
      s = Math.min(1, +(s + 0.1).toFixed(2));
    }
    if (s !== this.renderScale) { this.renderScale = s; this._scaleCd = 1.2; this.resize(); }
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
  // Set up the shared-buffer multi-draw batcher when the GPU supports it. Each
  // pass (opaque/cutout/water) gets one ChunkBatch (shared VBO/IBO + VAO); a
  // whole pass then draws in a single multiDrawElementsWEBGL call. When the
  // extension is absent (older/software GL) this stays null and the renderer
  // uses the classic one-VAO-per-chunk path. window.__noMultiDraw forces the
  // fallback (used to A/B the two paths in tests).
  _initBatcher() {
    this.batcher = null;
    const gl = this.gl;
    if (typeof window !== 'undefined' && window.__noMultiDraw) return;
    let ext = null;
    try { ext = gl.getExtension('WEBGL_multi_draw'); } catch { ext = null; }
    if (!ext || typeof ext.multiDrawElementsWEBGL !== 'function') return;
    this.batcher = {
      ext,
      md: new MultiDraw(gl, ext),
      opaque: new ChunkBatch(gl),
      cutout: new ChunkBatch(gl),
      water: new ChunkBatch(gl),
      // per-frame scratch arrays of visible records for each pass (reused)
      recs: { opaque: [], cutout: [], water: [] },
    };
  }

  // Spin up the off-thread mesher. In the single-file build the worker code is
  // bundled and injected as a string (window.__MESH_WORKER_SRC) and run from a
  // Blob; in dev it's a module worker loaded from source. Any failure leaves
  // _meshWorker null and everything falls back to synchronous meshing.
  _initMeshWorker() {
    if (typeof Worker === 'undefined') return;
    try {
      let worker;
      const src = (typeof window !== 'undefined' && window.__MESH_WORKER_SRC) || null;
      if (src) {
        // single-file build: the worker is bundled to a self-contained IIFE and
        // injected as a string; run it from a Blob (classic worker)
        worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
      } else {
        // dev: a module worker loaded from source (document-relative so it works
        // without import.meta, which would be a syntax error in the IIFE bundle)
        worker = new Worker('js/gfx/mesh.worker.js', { type: 'module' });
      }
      worker.onmessage = (e) => this._onMeshWorkerMessage(e.data);
      worker.onerror = () => { this._meshWorker = null; this._meshReady = false; };
      worker.postMessage({ type: 'init', tileUV });
      this._meshWorker = worker;
    } catch { this._meshWorker = null; }
  }

  _onMeshWorkerMessage(msg) {
    if (msg.type === 'ready') { this._meshReady = true; return; }
    if (msg.type !== 'meshed') return;
    const key = `${msg.cx},${msg.cz}`;
    // discard results that a newer request (or a dropChunk) has superseded
    if (this._meshLatest.get(key) !== msg.id) return;
    this._meshLatest.delete(key);
    this._uploadChunkMesh(key, msg.cx, msg.cz, msg.top, msg.opaque, msg.cutout, msg.water);
  }

  // Upload built {verts,indices} sections into GL, replacing any existing mesh.
  // Pooled path: sub-allocate into the shared per-pass buffers (record ranges).
  // Fallback path: one VAO/VBO/IBO per chunk section (classic).
  _uploadChunkMesh(key, cx, cz, top, opaque, cutout, water) {
    const gl = this.gl;
    const b = this.batcher;
    const old = this.chunkMeshes.get(key);
    if (b) {
      if (old) { b.opaque.free(old.opaque); b.cutout.free(old.cutout); b.water.free(old.water); }
      this.chunkMeshes.set(key, {
        cx, cz, top: top ?? WORLD_H,
        opaque: opaque ? b.opaque.put(opaque.verts, opaque.indices) : null,
        cutout: cutout ? b.cutout.put(cutout.verts, cutout.indices) : null,
        water: water ? b.water.put(water.verts, water.indices) : null,
      });
      return;
    }
    if (old) { deleteMesh(gl, old.opaque); deleteMesh(gl, old.cutout); deleteMesh(gl, old.water); }
    this.chunkMeshes.set(key, {
      cx, cz, top: top ?? WORLD_H,
      opaque: opaque ? uploadWorldMesh(gl, opaque.verts, opaque.indices) : null,
      cutout: cutout ? uploadWorldMesh(gl, cutout.verts, cutout.indices) : null,
      water: water ? uploadWorldMesh(gl, water.verts, water.indices) : null,
    });
  }

  // Synchronous mesh (fallback + edits that want instant feedback).
  remeshChunk(world, cx, cz) {
    const key = `${cx},${cz}`;
    this._meshLatest.delete(key); // a sync result wins over any in-flight async job
    const m = meshChunk(world, cx, cz);
    this._uploadChunkMesh(key, cx, cz, world.getChunk(cx, cz)?.contentTop ?? WORLD_H, m.opaque, m.cutout, m.water);
  }

  // Off-thread mesh: snapshot the 3×3 neighbourhood and hand it to the worker.
  // The old mesh stays on screen until the result arrives (no flicker/holes).
  remeshChunkAsync(world, cx, cz) {
    if (!this._meshWorker || !this._meshReady) { this.remeshChunk(world, cx, cz); return; }
    const key = `${cx},${cz}`;
    const id = ++this._meshJobId;
    this._meshLatest.set(key, id);
    const { snapshot, transfer } = buildSnapshot(world, cx, cz);
    const top = world.getChunk(cx, cz)?.contentTop ?? WORLD_H;
    this._meshWorker.postMessage({ type: 'mesh', id, top, snapshot }, transfer);
  }

  dropChunk(key) {
    this._meshLatest.delete(key); // cancel any in-flight async result for this chunk
    const m = this.chunkMeshes.get(key);
    if (!m) return;
    const b = this.batcher;
    if (b) { b.opaque.free(m.opaque); b.cutout.free(m.cutout); b.water.free(m.water); }
    else { deleteMesh(this.gl, m.opaque); deleteMesh(this.gl, m.cutout); deleteMesh(this.gl, m.water); }
    this.chunkMeshes.delete(key);
  }

  hasMesh(cx, cz) { return this.chunkMeshes.has(`${cx},${cz}`); }
  isMeshInFlight(cx, cz) { return this._meshLatest.has(`${cx},${cz}`); }

  // Gradient sky + sun/moon + stars (high quality only). Four screen-corner rays
  // are reconstructed from the camera basis; the fragment paints the dome.
  drawSky(fog) {
    const gl = this.gl, v = this.view;
    const right = [v[0], v[4], v[8]], up = [v[1], v[5], v[9]], fwd = [-v[2], -v[6], -v[10]];
    const th = Math.tan(this.fov / 2), aspect = this.canvas.width / this.canvas.height;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const rays = new Float32Array(12);
    for (let i = 0; i < 4; i++) {
      const cx = corners[i][0], cy = corners[i][1];
      for (let k = 0; k < 3; k++) rays[i * 3 + k] = fwd[k] + right[k] * cx * th * aspect + up[k] * cy * th;
    }
    const sp = this.skyProg;
    gl.useProgram(sp.prog);
    gl.uniform3fv(sp.uniforms.uRays, rays);
    gl.uniform3fv(sp.uniforms.uFogColor, fog);
    gl.uniform3fv(sp.uniforms.uSunDir, this.sunDir);
    gl.uniform1f(sp.uniforms.uDaylight, this.daylight);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(this.skyVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.bindVertexArray(null);
  }

  // re-upload the atlas after custom mob skins are blitted in
  refreshAtlas() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, getAtlasCanvas());
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  // ---- voxel-box entity models ----
  deleteModel(name) {
    const mesh = this.modelCache.get(name);
    if (!mesh) return;
    if (mesh.animated) {
      for (const p of mesh.parts) deleteMesh(this.gl, p.mesh);
      if (mesh.texture) this.gl.deleteTexture(mesh.texture);
    } else deleteMesh(this.gl, mesh);
    this.modelCache.delete(name);
  }

  // Boxes carry a color and optionally a material tile (`tex`) plus a special
  // front-face tile (`texFront`, e.g. eyes). The mesh is textured (world
  // shader): texture luminance × box color, Minecraft-skin style.
  registerModel(name, boxes, defaultTex = 'skin_solid') {
    if (this.modelCache.has(name)) return;
    const mesh = this.buildBoxMesh(boxes, defaultTex);
    mesh.bounds = modelBounds([boxes]);
    this.modelCache.set(name, mesh);
  }

  buildBoxMesh(boxes, defaultTex = 'skin_solid') {
    const verts = [], indices = [];
    let vc = 0;
    const faceBright = { top: 1.0, bottom: 0.55, south: 0.85, north: 0.85, east: 0.7, west: 0.7 };
    for (const box of boxes) {
      const { x, y, z, w, h, d } = box;
      const [r, g, b] = box.color || [1, 1, 1];
      const x2 = x + w, y2 = y + h, z2 = z + d;
      const corners = {
        top: [[x, y2, z2], [x2, y2, z2], [x2, y2, z], [x, y2, z]],
        bottom: [[x, y, z], [x2, y, z], [x2, y, z2], [x, y, z2]],
        south: [[x, y, z2], [x2, y, z2], [x2, y2, z2], [x, y2, z2]],
        north: [[x2, y, z], [x, y, z], [x, y2, z], [x2, y2, z]],
        east: [[x2, y, z2], [x2, y, z], [x2, y2, z], [x2, y2, z2]],
        west: [[x, y, z], [x, y, z2], [x, y2, z2], [x, y2, z]],
      };
      for (const fname of ['top', 'bottom', 'south', 'north', 'east', 'west']) {
        // per-face UVs: explicit box.uv (imported mobs) beats material tiles
        let uv;
        if (box.uv && box.uv[fname]) {
          uv = box.uv[fname]; // {u0,v0,u1,v1} already in atlas space
        } else {
          const tileName = (fname === 'south' && box.texFront) ? box.texFront : (box.tex || defaultTex);
          uv = tileUV[tileName] || tileUV.skin_solid;
        }
        const br = faceBright[fname];
        const uvs = [[uv.u0, uv.v1], [uv.u1, uv.v1], [uv.u1, uv.v0], [uv.u0, uv.v0]];
        corners[fname].forEach((p, i) => {
          verts.push(p[0], p[1], p[2], uvs[i][0], uvs[i][1], r * br, g * br, b * br);
        });
        indices.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
        vc += 4;
      }
    }
    return uploadWorldMesh(this.gl, new Float32Array(verts), new Uint32Array(indices));
  }

  // Animated model: named parts, each its own mesh + pivot, posed per frame.
  // `texture` (optional) is the mob's own skin — bound in place of the atlas.
  registerAnimatedModel(name, parts, animations, texture = null) {
    if (this.modelCache.has(name)) return;
    this.modelCache.set(name, {
      animated: true,
      texture,
      bounds: modelBounds(parts.map((p) => p.boxes)),
      parts: parts.map((p) => ({
        id: p.id, parent: p.parent || null, pivot: p.pivot || [0, 0, 0],
        rotation: p.rotation || null,
        // locator parts (no boxes) still exist for the pose chain, but draw nothing
        mesh: (p.boxes && p.boxes.length) ? this.buildBoxMesh(p.boxes, p.tex || 'skin_solid') : null,
      })),
      animations: animations || {},
    });
  }

  // upload a mob skin canvas as its own GL texture
  createMobTexture(canvas) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    return tex;
  }

  // ---- offscreen mob thumbnail (admin/debug preview) ---------------------
  // Renders one registered mob model into a square 2D canvas via an FBO, in a
  // static 3/4 rest pose framed on the model's bounds, so the settings panel can
  // show what each mob looks like. Returns false if the model isn't registered.
  renderMobThumb(modelName, out2d, yaw = 0, pitch = 0, pose = null) {
    const gl = this.gl;
    const model = this.modelCache.get(modelName);
    if (!model) return false;
    const SZ = out2d.width || 96;
    if (!this._thumbFBO || this._thumbSize !== SZ) {
      if (this._thumbFBO) { gl.deleteFramebuffer(this._thumbFBO); gl.deleteTexture(this._thumbTex); gl.deleteRenderbuffer(this._thumbDepth); }
      this._thumbSize = SZ;
      this._thumbTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._thumbTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SZ, SZ, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      this._thumbDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._thumbDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SZ, SZ);
      this._thumbFBO = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._thumbFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._thumbTex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._thumbDepth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._thumbFBO);
    gl.viewport(0, 0, SZ, SZ);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE); // some imported meshes wind faces inconsistently

    // frame the camera on the model's bounds; look from front-right-above.
    // yaw orbits horizontally around the model's up axis and pitch tilts the
    // elevation, so the admin preview can be dragged to spin the model. yaw 0 /
    // pitch 0 reproduces the original front-right 3/4 view.
    const b = model.bounds || { cx: 0, cy: 0.9, cz: 0, r: 1 };
    const dist = b.r * 3.4 + 0.6;
    const baseAz = Math.atan2(0.9, 0.55), horiz = Math.hypot(0.55, 0.9);
    const az = baseAz + yaw;
    const elev = Math.max(-1.4, Math.min(1.4, 0.42 + pitch));
    const dir = [Math.cos(az) * horiz, elev, Math.sin(az) * horiz]; const dl = Math.hypot(...dir);
    const target = [b.cx, b.cy, b.cz];
    const eye = [b.cx + dir[0] / dl * dist, b.cy + dir[1] / dl * dist, b.cz + dir[2] / dl * dist];
    const proj = mat4Identity(new Float32Array(16));
    mat4Perspective(proj, 40 * Math.PI / 180, 1, 0.05, 100);
    const view = mat4Identity(new Float32Array(16));
    mat4LookAt(view, eye, target);
    const pv = mat4Identity(new Float32Array(16));
    mat4Multiply(pv, proj, view);

    const wp = this.worldProg;
    gl.useProgram(wp.prog);
    gl.uniformMatrix4fv(wp.uniforms.uPV, false, pv);
    gl.uniform3fv(wp.uniforms.uCamPos, eye);
    gl.uniform3fv(wp.uniforms.uFogColor, [0, 0, 0]);
    gl.uniform1f(wp.uniforms.uFogNear, 500);
    gl.uniform1f(wp.uniforms.uFogFar, 1000);
    gl.uniform1f(wp.uniforms.uOpacity, 1);
    gl.uniform1i(wp.uniforms.uAtlas, 0);
    gl.uniform3f(wp.uniforms.uTint, 0, 0, 0);
    gl.uniform1f(wp.uniforms.uLightMult, 1.2);
    gl.activeTexture(gl.TEXTURE0);
    const ident = mat4Identity(this.tmp);
    if (model.animated) {
      gl.bindTexture(gl.TEXTURE_2D, model.texture || this.atlasTex);
      for (const part of model.parts) {
        if (!part.mesh) continue;
        // rest pose (passed by the caller via evaluatePose) — without it, bone
        // rotations and parent chains are ignored and rotated rigs (birds,
        // seals, fish) preview as unrotated exploded stacks
        gl.uniformMatrix4fv(wp.uniforms.uModel, false, pose?.[part.id] || ident);
        gl.bindVertexArray(part.mesh.vao);
        gl.drawElements(gl.TRIANGLES, part.mesh.count, gl.UNSIGNED_INT, 0);
      }
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
      gl.uniformMatrix4fv(wp.uniforms.uModel, false, ident);
      gl.bindVertexArray(model.vao);
      gl.drawElements(gl.TRIANGLES, model.count, gl.UNSIGNED_INT, 0);
    }

    // read back → 2D canvas (GL origin is bottom-left, so flip vertically)
    const px = new Uint8Array(SZ * SZ * 4);
    gl.readPixels(0, 0, SZ, SZ, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const ctx = out2d.getContext('2d');
    const img = ctx.createImageData(SZ, SZ);
    for (let y = 0; y < SZ; y++) {
      const srcRow = (SZ - 1 - y) * SZ * 4;
      img.data.set(px.subarray(srcRow, srcRow + SZ * 4), y * SZ * 4);
    }
    ctx.putImageData(img, 0, 0);

    // restore default target + main viewport/projection
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.CULL_FACE);
    gl.bindVertexArray(null);
    this.resize();
    return true;
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

  // ---- precipitation: a recycled rain/snow field around the camera ----
  syncPrecip(w, openMix) {
    const type = (w && openMix > 0.2) ? w.precip : null;
    this.precip.type = type;
    this.precip.intensity = type ? (w.intensity || 0) * openMix : 0;
    this.precip.wind = w ? (w.wind || 0) : 0;
  }

  updatePrecip(dt) {
    const pr = this.precip;
    if (!pr.type && !pr.pool.length) return;   // nothing to do; don't touch the camera
    if (!this.camPos) { pr.pool.length = 0; return; }
    const snow = pr.type === 'snow';
    let target = 0;
    if (pr.type) {
      const base = snow ? 90 : 150;
      target = Math.round(base * Math.min(1, pr.intensity) * (this.reducedMotion ? 0.3 : 1) * (this.precipMult ?? 1));
    }
    const R = 15;
    const cx = this.camPos[0], cy = this.camPos[1], cz = this.camPos[2];
    const pool = pr.pool;
    while (pool.length < target) {
      pool.push({
        x: cx + (Math.random() * 2 - 1) * R,
        y: cy + 3 + Math.random() * 16,
        z: cz + (Math.random() * 2 - 1) * R,
        sway: Math.random() * Math.PI * 2,
      });
    }
    if (pool.length > target) pool.length = target;
    const fall = snow ? 3.4 : 22;
    const wind = pr.wind * (snow ? 1.2 : 2.2);
    for (const p of pool) {
      p.y -= fall * dt;
      p.x += wind * dt + (snow ? Math.sin((p.sway += dt * 1.5)) * 0.6 * dt : 0);
      if (p.y < cy - 8 || Math.abs(p.x - cx) > R + 3 || Math.abs(p.z - cz) > R + 3) {
        p.x = cx + (Math.random() * 2 - 1) * R;
        p.y = cy + 8 + Math.random() * 12;
        p.z = cz + (Math.random() * 2 - 1) * R;
      }
    }
  }

  // ---- main draw ----
  draw(world, opts) {
    const gl = this.gl;
    this.time += opts.dt || 0.016;
    this.updateParticles(opts.dt || 0.016);
    // sky fog follows the day/night clock, then blends toward cave darkness
    const dayMix = Math.max(0, Math.min(1, (this.daylight - 0.25) / 0.75));
    const skyFog = [
      NIGHT_FOG[0] + (DAY_FOG[0] - NIGHT_FOG[0]) * dayMix,
      NIGHT_FOG[1] + (DAY_FOG[1] - NIGHT_FOG[1]) * dayMix,
      NIGHT_FOG[2] + (DAY_FOG[2] - NIGHT_FOG[2]) * dayMix,
    ];
    const fog = [
      skyFog[0] + (CAVE_FOG[0] - skyFog[0]) * this.fogMix,
      skyFog[1] + (CAVE_FOG[1] - skyFog[1]) * this.fogMix,
      skyFog[2] + (CAVE_FOG[2] - skyFog[2]) * this.fogMix,
    ];
    // weather tints the sky/fog toward its palette (only over open ground)
    const wthr = opts.weather;
    const openMix = 1 - this.fogMix;
    if (wthr && wthr.tint && openMix > 0.02) {
      const amt = Math.min(0.85, ((wthr.fog || 0) + wthr.intensity * 0.28) * openMix);
      for (let i = 0; i < 3; i++) fog[i] += (wthr.tint[i] - fog[i]) * amt;
    }
    // per-biome atmospheric grade warms/cools the sky + distance haze
    if (opts.grade && openMix > 0.02) {
      for (let i = 0; i < 3; i++) fog[i] = Math.min(1, Math.max(0, fog[i] * (1 + (opts.grade[i] - 1) * openMix)));
    }
    gl.clearColor(fog[0], fog[1], fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // high-quality gradient sky over open ground (caves keep the flat clear)
    if (this.highQuality && this.fogMix < 0.9) this.drawSky(fog);

    // heavy weather pulls the fog wall closer for a shut-in feel
    let fogFar = this.renderDistance * CHUNK * 0.95;
    if (wthr && wthr.fog) fogFar *= 1 - 0.35 * wthr.fog * openMix;
    const fogNear = fogFar * 0.55;

    this.syncPrecip(wthr, openMix);
    this.updatePrecip(opts.dt || 0.016);

    // --- world passes (terrain program: sky/block light channels) ---
    // flame pulse computed once on the CPU (was 3 sin() per fragment, per pass)
    const ttime = this.reducedMotion ? 0 : this.time;
    const flicker = 0.87 + 0.09 * Math.sin(ttime * 2.3) + 0.04 * Math.sin(ttime * 8.1) * Math.sin(ttime * 5.7);
    const setTerrainUniforms = (p) => {
      gl.useProgram(p.prog);
      gl.uniformMatrix4fv(p.uniforms.uPV, false, this.pv);
      gl.uniformMatrix4fv(p.uniforms.uModel, false, mat4Identity(this.tmp));
      gl.uniform3fv(p.uniforms.uCamPos, this.camPos);
      gl.uniform3fv(p.uniforms.uFogColor, fog);
      gl.uniform1f(p.uniforms.uFogNear, fogNear);
      gl.uniform1f(p.uniforms.uFogFar, fogFar);
      gl.uniform1f(p.uniforms.uOpacity, 1);
      gl.uniform1f(p.uniforms.uDaylight, this.daylight);
      gl.uniform1f(p.uniforms.uTime, ttime);
      gl.uniform1f(p.uniforms.uFlicker, flicker);
      gl.uniform1f(p.uniforms.uWater, 0);
      gl.uniform1i(p.uniforms.uAtlas, 0);
    };
    const tp = this.terrainProg;      // opaque build (no discard → early-Z on)
    const tpc = this.terrainCutProg;  // CUTOUT build (alpha-tested foliage)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    setTerrainUniforms(tp);

    const pcx = Math.floor(this.camPos[0] / CHUNK), pcz = Math.floor(this.camPos[2] / CHUNK);
    const bat = this.batcher;
    const visible = this._visible; visible.length = 0;
    if (bat) { bat.recs.opaque.length = 0; bat.recs.cutout.length = 0; bat.recs.water.length = 0; }
    for (const [key, m] of this.chunkMeshes) {
      const dx = m.cx - pcx, dz = m.cz - pcz;
      if (Math.max(Math.abs(dx), Math.abs(dz)) > this.renderDistance) continue;
      const minX = m.cx * CHUNK, minZ = m.cz * CHUNK;
      if (!aabbInFrustum(this.planes, minX, 0, minZ, minX + CHUNK, m.top ?? WORLD_H, minZ + CHUNK)) continue;
      visible.push(m);
      if (bat) {
        if (m.opaque) bat.recs.opaque.push(m.opaque);
        if (m.cutout) bat.recs.cutout.push(m.cutout);
        if (m.water) bat.recs.water.push(m.water);
      }
    }

    // opaque terrain — one multi-draw for the whole visible set, else per-chunk
    if (bat) bat.md.draw(bat.opaque, bat.recs.opaque);
    else for (const m of visible) {
      if (!m.opaque) continue;
      gl.bindVertexArray(m.opaque.vao);
      gl.drawElements(gl.TRIANGLES, m.opaque.count, gl.UNSIGNED_INT, 0);
    }

    setTerrainUniforms(tpc); // switch to the discarding build for foliage
    gl.disable(gl.CULL_FACE);
    if (bat) bat.md.draw(bat.cutout, bat.recs.cutout);
    else for (const m of visible) {
      if (!m.cutout) continue;
      gl.bindVertexArray(m.cutout.vao);
      gl.drawElements(gl.TRIANGLES, m.cutout.count, gl.UNSIGNED_INT, 0);
    }
    gl.enable(gl.CULL_FACE);

    // --- entities (textured skins via the entity program) ---
    const wp = this.worldProg;
    gl.useProgram(wp.prog);
    gl.uniformMatrix4fv(wp.uniforms.uPV, false, this.pv);
    gl.uniform3fv(wp.uniforms.uCamPos, this.camPos);
    gl.uniform3fv(wp.uniforms.uFogColor, fog);
    gl.uniform1f(wp.uniforms.uFogNear, fogNear);
    gl.uniform1f(wp.uniforms.uFogFar, fogFar);
    gl.uniform1f(wp.uniforms.uOpacity, 1);
    gl.uniform1i(wp.uniforms.uAtlas, 0);
    gl.uniform3f(wp.uniforms.uTint, 0, 0, 0);
    const ambient = Math.max(0.35, this.daylight);
    const baseMat = this._baseMat;
    const partMat = this._partMat;
    for (const e of opts.entities || []) {
      const model = this.modelCache.get(e.model);
      if (!model) continue;
      const s = e.scale || 1;
      const cy = Math.cos(e.yaw || 0), sy = Math.sin(e.yaw || 0);
      baseMat[0] = cy * s; baseMat[1] = 0; baseMat[2] = -sy * s; baseMat[3] = 0;
      baseMat[4] = 0; baseMat[5] = s; baseMat[6] = 0; baseMat[7] = 0;
      baseMat[8] = sy * s; baseMat[9] = 0; baseMat[10] = cy * s; baseMat[11] = 0;
      baseMat[12] = e.x; baseMat[13] = e.y; baseMat[14] = e.z; baseMat[15] = 1;
      gl.uniform3f(wp.uniforms.uTint, ...(e.tint || [0, 0, 0]));
      gl.uniform1f(wp.uniforms.uLightMult, e.light ?? ambient);
      if (model.animated) {
        if (model.texture) gl.bindTexture(gl.TEXTURE_2D, model.texture);
        for (const part of model.parts) {
          if (!part.mesh) continue; // locator/pivot part — no geometry to draw
          const pose = e.pose?.[part.id];
          if (pose) {
            mat4Multiply(partMat, baseMat, pose);
            gl.uniformMatrix4fv(wp.uniforms.uModel, false, partMat);
          } else {
            gl.uniformMatrix4fv(wp.uniforms.uModel, false, baseMat);
          }
          gl.bindVertexArray(part.mesh.vao);
          gl.drawElements(gl.TRIANGLES, part.mesh.count, gl.UNSIGNED_INT, 0);
        }
        if (model.texture) gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
      } else {
        gl.uniformMatrix4fv(wp.uniforms.uModel, false, baseMat);
        gl.bindVertexArray(model.vao);
        gl.drawElements(gl.TRIANGLES, model.count, gl.UNSIGNED_INT, 0);
      }
    }
    gl.uniform3f(wp.uniforms.uTint, 0, 0, 0);
    gl.uniformMatrix4fv(wp.uniforms.uModel, false, mat4Identity(this.tmp));

    const cp = this.colorProg;
    gl.useProgram(cp.prog);
    gl.uniformMatrix4fv(cp.uniforms.uPV, false, this.pv);
    gl.uniform3fv(cp.uniforms.uCamPos, this.camPos);
    gl.uniform3fv(cp.uniforms.uFogColor, fog);
    gl.uniform1f(cp.uniforms.uFogNear, fogNear);
    gl.uniform1f(cp.uniforms.uFogFar, fogFar);
    gl.uniform1f(cp.uniforms.uOpacity, 1);
    gl.uniform3f(cp.uniforms.uTint, 0, 0, 0);

    // --- water (transparent, terrain program) ---
    gl.useProgram(tp.prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.uniform1f(tp.uniforms.uOpacity, 0.78);
    gl.uniform1f(tp.uniforms.uWater, this.highQuality ? 1 : 0); // fresnel shimmer on water
    if (bat) bat.md.draw(bat.water, bat.recs.water);
    else for (const m of visible) {
      if (!m.water) continue;
      gl.bindVertexArray(m.water.vao);
      gl.drawElements(gl.TRIANGLES, m.water.count, gl.UNSIGNED_INT, 0);
    }
    gl.uniform1f(tp.uniforms.uOpacity, 1);
    gl.uniform1f(tp.uniforms.uWater, 0);

    // --- overlays: tile highlights, selection box, particles, markers ---
    gl.useProgram(cp.prog);
    gl.uniformMatrix4fv(cp.uniforms.uModel, false, mat4Identity(this.tmp));
    this.drawOverlays(opts);

    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  // Grow the persistent overlay VAO/VBO + static quad index buffer to hold at
  // least `quads` quads. Created once and reused every frame — the old path
  // created and deleted a VAO+VBO+IBO (plus two typed arrays) EVERY frame, the
  // worst GC/driver-churn pattern in the renderer.
  _ensureOverlayCap(quads) {
    const gl = this.gl;
    if (!this._ovlVAO) {
      this._ovlVAO = gl.createVertexArray();
      this._ovlVBO = gl.createBuffer();
      this._ovlIBO = gl.createBuffer();
      this._ovlQuadCap = 0;
      this._ovlVerts = new Float32Array(0);
    }
    if (quads <= this._ovlQuadCap) return;
    const cap = Math.max(quads, (this._ovlQuadCap || 64) * 2);
    this._ovlQuadCap = cap;
    this._ovlVerts = new Float32Array(cap * 24); // 4 verts × (3 pos + 3 color)
    const idx = new Uint32Array(cap * 6);
    for (let q = 0; q < cap; q++) {
      const v = q * 4, o = q * 6;
      idx[o] = v; idx[o + 1] = v + 1; idx[o + 2] = v + 2; idx[o + 3] = v; idx[o + 4] = v + 2; idx[o + 5] = v + 3;
    }
    gl.bindVertexArray(this._ovlVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._ovlVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this._ovlVerts.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ovlIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  drawOverlays(opts) {
    const gl = this.gl;
    const cp = this.colorProg;
    const tiles = opts.tiles || [], dots = opts.dots || [], markers = opts.markers || [];
    const maxQuads = tiles.length + this.particles.length + this.precip.pool.length + dots.length + markers.length;
    if (maxQuads > 0) {
      this._ensureOverlayCap(maxQuads);
      const V = this._ovlVerts;
      let o = 0, qc = 0;
      // write one quad (4 verts, flat color) straight into the reused array — no
      // per-quad corner arrays, no per-frame typed-array allocation
      const pushQuad = (ax, ay, az, bx, by, bz, ccx, ccy, ccz, dx, dy, dz, cr, cg, cb) => {
        V[o] = ax; V[o + 1] = ay; V[o + 2] = az; V[o + 3] = cr; V[o + 4] = cg; V[o + 5] = cb;
        V[o + 6] = bx; V[o + 7] = by; V[o + 8] = bz; V[o + 9] = cr; V[o + 10] = cg; V[o + 11] = cb;
        V[o + 12] = ccx; V[o + 13] = ccy; V[o + 14] = ccz; V[o + 15] = cr; V[o + 16] = cg; V[o + 17] = cb;
        V[o + 18] = dx; V[o + 19] = dy; V[o + 20] = dz; V[o + 21] = cr; V[o + 22] = cg; V[o + 23] = cb;
        o += 24; qc++;
      };
      for (const t of tiles) {
        const y = t.y + 0.04;
        pushQuad(t.x + 0.06, y, t.z + 0.94, t.x + 0.94, y, t.z + 0.94, t.x + 0.94, y, t.z + 0.06, t.x + 0.06, y, t.z + 0.06, t.color[0], t.color[1], t.color[2]);
      }
      // camera basis in world space (right = rx*, up = ry*), computed once
      const rx0 = this.view[0], rx1 = this.view[4], rx2 = this.view[8];
      const ry0 = this.view[1], ry1 = this.view[5], ry2 = this.view[9];
      for (const p of this.particles) {
        const s = p.size * (0.5 + 0.5 * (p.life / p.maxLife));
        pushQuad(
          p.x - rx0 * s - ry0 * s, p.y - rx1 * s - ry1 * s, p.z - rx2 * s - ry2 * s,
          p.x + rx0 * s - ry0 * s, p.y + rx1 * s - ry1 * s, p.z + rx2 * s - ry2 * s,
          p.x + rx0 * s + ry0 * s, p.y + rx1 * s + ry1 * s, p.z + rx2 * s + ry2 * s,
          p.x - rx0 * s + ry0 * s, p.y - rx1 * s + ry1 * s, p.z - rx2 * s + ry2 * s,
          p.color[0], p.color[1], p.color[2]);
      }
      if (this.precip.pool.length) {
        if (this.precip.type === 'snow') {
          const s = 0.05;
          for (const p of this.precip.pool) pushQuad(
            p.x - rx0 * s - ry0 * s, p.y - rx1 * s - ry1 * s, p.z - rx2 * s - ry2 * s,
            p.x + rx0 * s - ry0 * s, p.y + rx1 * s - ry1 * s, p.z + rx2 * s - ry2 * s,
            p.x + rx0 * s + ry0 * s, p.y + rx1 * s + ry1 * s, p.z + rx2 * s + ry2 * s,
            p.x - rx0 * s + ry0 * s, p.y - rx1 * s + ry1 * s, p.z - rx2 * s + ry2 * s,
            0.95, 0.96, 1.0);
        } else {
          const w = 0.02, len = 0.75;
          for (const p of this.precip.pool) {
            const x0 = p.x - rx0 * w, z0 = p.z - rx2 * w, x1 = p.x + rx0 * w, z1 = p.z + rx2 * w;
            pushQuad(x0, p.y, z0, x1, p.y, z1, x1, p.y - len, z1, x0, p.y - len, z0, 0.62, 0.70, 0.82);
          }
        }
      }
      for (const d of dots) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 4 + (d.x + d.z) * 0.9);
        const r = 0.1 + pulse * 0.04, y = d.y + 0.06, cxp = d.x + 0.5, czp = d.z + 0.5;
        pushQuad(cxp - r, y, czp + r, cxp + r, y, czp + r, cxp + r, y, czp - r, cxp - r, y, czp - r, 1, 0.85 + pulse * 0.1, 0.35);
      }
      for (const mk of markers) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 3 + mk.x);
        const r = 0.28 + pulse * 0.1, y = mk.y + 0.95, cxp = mk.x + 0.5, czp = mk.z + 0.5;
        pushQuad(cxp - r, y, czp + r, cxp + r, y, czp + r, cxp + r, y, czp - r, cxp - r, y, czp - r, mk.color[0], mk.color[1], mk.color[2]);
      }
      if (qc > 0) {
        gl.bindVertexArray(this._ovlVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._ovlVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, V, 0, qc * 24);
        gl.uniform1f(cp.uniforms.uOpacity, 0.45);
        gl.drawElements(gl.TRIANGLES, qc * 6, gl.UNSIGNED_INT, 0);
        gl.uniform1f(cp.uniforms.uOpacity, 1);
        gl.bindVertexArray(null);
      }
    }

    // selection wireframe — persistent 24-vertex line buffer, no per-frame churn
    if (opts.selection) {
      if (!this._selVAO) {
        this._selVAO = gl.createVertexArray();
        this._selVBO = gl.createBuffer();
        this._selVerts = new Float32Array(24 * 6);
        gl.bindVertexArray(this._selVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._selVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this._selVerts.byteLength, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
        gl.bindVertexArray(null);
      }
      const { x, y, z } = opts.selection;
      const e = 0.004;
      const lo0 = x - e, lo1 = y - e, lo2 = z - e, hi0 = x + 1 + e, hi1 = y + 1 + e, hi2 = z + 1 + e;
      const CS = [lo0, lo1, lo2, hi0, lo1, lo2, hi0, lo1, hi2, lo0, lo1, hi2, lo0, hi1, lo2, hi0, hi1, lo2, hi0, hi1, hi2, lo0, hi1, hi2];
      const V = this._selVerts; let o = 0;
      for (const [a, b] of SELECTION_EDGES) {
        V[o] = CS[a * 3]; V[o + 1] = CS[a * 3 + 1]; V[o + 2] = CS[a * 3 + 2]; V[o + 3] = 0.05; V[o + 4] = 0.05; V[o + 5] = 0.05;
        V[o + 6] = CS[b * 3]; V[o + 7] = CS[b * 3 + 1]; V[o + 8] = CS[b * 3 + 2]; V[o + 9] = 0.05; V[o + 10] = 0.05; V[o + 11] = 0.05;
        o += 12;
      }
      gl.bindVertexArray(this._selVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this._selVBO);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, V, 0, 24 * 6);
      gl.uniform1f(cp.uniforms.uOpacity, 0.9);
      gl.drawArrays(gl.LINES, 0, 24);
      gl.uniform1f(cp.uniforms.uOpacity, 1);
      gl.bindVertexArray(null);
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
