// WebGL2 bootstrap + shader/buffer helpers.

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 not supported');
  return gl;
}

export function compileProgram(gl, vsSrc, fsSrc, defines = null) {
  // Inject #define lines right AFTER the #version directive (which must stay on
  // line 1) so callers can compile shader variants — e.g. a CUTOUT build that
  // keeps `discard` and an opaque build that omits it, letting tile-based GPUs
  // keep early-Z / hidden-surface removal on the whole opaque world.
  const withDefs = (src) => {
    if (!defines || !defines.length) return src;
    const nl = src.indexOf('\n');
    return src.slice(0, nl + 1) + defines.map((d) => `#define ${d}\n`).join('') + src.slice(nl + 1);
  };
  const compile = (type, src0) => {
    const src = withDefs(src0);
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(sh) + '\n' + src);
    }
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Program link failed: ' + gl.getProgramInfoLog(prog));
  }
  const uniforms = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog, i);
    uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(prog, info.name);
  }
  return { prog, uniforms };
}

export const WORLD_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec3 aLight;
uniform mat4 uPV;
uniform mat4 uModel;
out vec2 vUV;
out vec3 vLight;
out vec3 vWorld;
out float vDist;
uniform vec3 uCamPos;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  gl_Position = uPV * wp;
  vUV = aUV;
  vLight = aLight;
  vWorld = wp.xyz;
  vDist = distance(wp.xyz, uCamPos);
}`;

// Terrain: vLight carries (skyLight, blockLight, –). Sky light follows the
// day/night clock; block light (torches, lava, crystals) does not — but it
// flickers like flame, phased by world position so pools shimmer out of sync.
export const TERRAIN_FS = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vLight;
in vec3 vWorld;
in float vDist;
uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uOpacity;
uniform float uDaylight; // 0.25 night … 1 noon
uniform float uTime;
uniform float uFlicker;  // CPU-computed flame pulse (was 3 sin() per fragment)
uniform vec3 uCamPos;
uniform float uWater;    // 1 → animated fresnel shimmer (high quality water)
out vec4 fragColor;
void main() {
  vec4 tex = texture(uAtlas, vUV);
#ifdef CUTOUT
  if (tex.a < 0.5) discard;
#endif
  // warm tint riding on the block-light channel so torch pools feel like fire
  float blk = vLight.g * uFlicker;
  float light = max(max(vLight.r * uDaylight, blk), 0.05);
  vec3 col = tex.rgb * light;
  float warmth = clamp(blk - vLight.r * uDaylight, 0.0, 1.0);
  col += vec3(0.10, 0.045, -0.02) * warmth * uFlicker;
  // water: a fresnel sheen at grazing angles + a slow ripple of sun/sky glint
  if (uWater > 0.5) {
    vec3 vd = normalize(uCamPos - vWorld);
    float fres = pow(1.0 - clamp(vd.y, 0.0, 1.0), 3.0);
    float ripple = 0.06 * sin(vWorld.x * 2.0 + uTime * 1.5) * sin(vWorld.z * 2.0 + uTime * 1.1);
    col += (vec3(0.10, 0.15, 0.22) * fres + ripple) * uDaylight;
  }
  col = clamp(col, 0.0, 1.0);
  float fog = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  fragColor = vec4(mix(col, uFogColor, fog), tex.a * uOpacity);
}`;

// Entities: vLight is an RGB color; uLightMult applies the ambient level.
export const WORLD_FS = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vLight;
in float vDist;
uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uOpacity;
uniform float uLightMult;
uniform vec3 uTint;      // additive flash (damage/telegraph) for entities
out vec4 fragColor;
void main() {
  vec4 tex = texture(uAtlas, vUV);
#ifdef CUTOUT
  if (tex.a < 0.5) discard;
#endif
  vec3 col = clamp(tex.rgb * vLight * uLightMult + uTint, 0.0, 1.0);
  float fog = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  fragColor = vec4(mix(col, uFogColor, fog), tex.a * uOpacity);
}`;

export const COLOR_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aColor;
uniform mat4 uPV;
uniform mat4 uModel;
uniform vec3 uCamPos;
out vec3 vColor;
out float vDist;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  gl_Position = uPV * wp;
  vColor = aColor;
  vDist = distance(wp.xyz, uCamPos);
}`;

export const COLOR_FS = `#version 300 es
precision highp float;
in vec3 vColor;
in float vDist;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uOpacity;
uniform vec3 uTint;
out vec4 fragColor;
void main() {
  float fog = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  vec3 col = clamp(vColor + uTint, 0.0, 1.0);
  fragColor = vec4(mix(col, uFogColor, fog), uOpacity);
}`;

// Sky dome (high quality only): a fullscreen quad whose four corner rays are
// supplied as world-space directions; the fragment paints a horizon→zenith
// gradient that meets the terrain fog, a sun/moon disc + glow, and night stars.
export const SKY_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;      // clip-space corner
layout(location=1) in float aCorner;  // 0..3 → uRays index
uniform vec3 uRays[4];
out vec3 vRay;
void main() {
  vRay = uRays[int(aCorner)];
  gl_Position = vec4(aPos, 1.0, 1.0);  // z=w → far plane, behind everything
}`;

export const SKY_FS = `#version 300 es
precision highp float;
in vec3 vRay;
uniform vec3 uFogColor;  // horizon colour (matches terrain fog)
uniform vec3 uSunDir;
uniform float uDaylight; // 0.25 night … 1 noon
out vec4 fragColor;
void main() {
  vec3 rd = normalize(vRay);
  vec3 sun = normalize(uSunDir);
  float up = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 zenith = mix(vec3(0.02, 0.03, 0.09), vec3(0.24, 0.44, 0.82), uDaylight);
  vec3 col = mix(uFogColor, zenith, pow(up, 0.75));
  float sd = max(dot(rd, sun), 0.0);
  col += uDaylight * vec3(1.0, 0.92, 0.72) * pow(sd, 500.0);        // sun disc
  col += uDaylight * vec3(1.0, 0.80, 0.55) * pow(sd, 6.0) * 0.25;   // sun glow
  float md = max(dot(rd, -sun), 0.0);
  col += (1.0 - uDaylight) * vec3(0.85, 0.88, 0.98) * pow(md, 700.0); // moon disc
  float night = clamp(1.0 - uDaylight * 1.6, 0.0, 1.0);
  if (rd.y > 0.04) {
    vec2 g = floor((rd.xz / max(rd.y, 0.15)) * 60.0);
    float h = fract(sin(dot(g, vec2(12.989, 78.233))) * 43758.545);
    col += vec3(step(0.992, h) * night * 0.9);
  }
  fragColor = vec4(col, 1.0);
}`;

// Interleaved mesh (pos3, uv2, light3) → VAO
export function uploadWorldMesh(gl, verts, indices) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  const stride = 8 * 4;
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 3 * 4);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 5 * 4);
  gl.bindVertexArray(null);
  return { vao, vbo, ibo, count: indices.length };
}

// Interleaved mesh (pos3, color3) → VAO
export function uploadColorMesh(gl, verts, indices, dynamic = false) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, verts, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
  const stride = 6 * 4;
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);
  gl.bindVertexArray(null);
  return { vao, vbo, ibo, count: indices.length };
}

export function deleteMesh(gl, mesh) {
  if (!mesh) return;
  gl.deleteVertexArray(mesh.vao);
  gl.deleteBuffer(mesh.vbo);
  gl.deleteBuffer(mesh.ibo);
}

export function createAtlasTexture(gl, canvas) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}
