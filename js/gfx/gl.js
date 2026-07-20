// WebGL2 bootstrap + shader/buffer helpers.

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 not supported');
  return gl;
}

export function compileProgram(gl, vsSrc, fsSrc) {
  const compile = (type, src) => {
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
out float vDist;
uniform vec3 uCamPos;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  gl_Position = uPV * wp;
  vUV = aUV;
  vLight = aLight;
  vDist = distance(wp.xyz, uCamPos);
}`;

export const WORLD_FS = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vLight;
in float vDist;
uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uCutout;   // 1 → discard transparent texels
uniform float uOpacity;
uniform vec3 uTint;      // additive flash (damage/telegraph) for entities
out vec4 fragColor;
void main() {
  vec4 tex = texture(uAtlas, vUV);
  if (uCutout > 0.5 && tex.a < 0.5) discard;
  vec3 col = clamp(tex.rgb * vLight + uTint, 0.0, 1.0);
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
