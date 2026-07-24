// Shared chunk buffer pool + WEBGL_multi_draw batcher.
//
// Instead of one VAO + one drawElements per chunk per pass, every chunk's
// geometry for a given pass (opaque / cutout / water) lives in ONE big shared
// vertex buffer and ONE big shared index buffer. A whole pass then draws with a
// single multiDrawElementsWEBGL call — the entire visible world in ~3 GPU draws
// instead of hundreds. This is the draw-call lever that matters most as entity
// counts climb (multiplayer) and on mobile, where per-draw CPU overhead bites.
//
// WEBGL_multi_draw does NOT carry a per-sub-draw base vertex, so each chunk's
// indices are rebased to ABSOLUTE positions in the shared vertex buffer at
// upload time. Buffers grow on demand via GPU-side copyBufferSubData (no CPU
// readback). The renderer keeps its existing per-chunk path as the fallback for
// GPUs that lack the extension — see Renderer._initBatcher.

const FLOATS_PER_VERT = 8;   // pos3 + uv2 + light3
const STRIDE = FLOATS_PER_VERT * 4; // 32 bytes
const IDX_BYTES = 4;          // Uint32 indices

// A first-fit range allocator over a single GPU buffer, measured in "units"
// (vertices for the vertex arena, indices for the index arena). Frees are
// coalesced so re-meshing the same chunk in place doesn't fragment the arena.
class Arena {
  constructor(gl, target, initUnits) {
    this.gl = gl;
    this.target = target;      // ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
    this.unitBytes = target === gl.ELEMENT_ARRAY_BUFFER ? IDX_BYTES : STRIDE;
    this.capacity = Math.max(1024, initUnits);
    this.top = 0;              // high-water mark of ever-allocated space
    this.free = [];            // sorted, coalesced free spans below top: {start, len}
    this.buf = gl.createBuffer();
    gl.bindBuffer(target, this.buf);
    gl.bufferData(target, this.capacity * this.unitBytes, gl.DYNAMIC_DRAW);
  }

  // Reserve n units; returns the start unit, or -1 when the arena is full.
  alloc(n) {
    const free = this.free;
    for (let i = 0; i < free.length; i++) {
      const f = free[i];
      if (f.len >= n) {
        const start = f.start;
        if (f.len === n) free.splice(i, 1);
        else { f.start += n; f.len -= n; }
        return start;
      }
    }
    if (this.top + n <= this.capacity) { const s = this.top; this.top += n; return s; }
    return -1;
  }

  // Return a span to the free list, coalescing with neighbours.
  release(start, n) {
    if (n <= 0) return;
    // a span sitting right at the high-water mark just lowers it
    if (start + n === this.top) {
      this.top = start;
      // absorb any free spans now adjacent to the lowered top
      const free = this.free;
      for (let i = free.length - 1; i >= 0; i--) {
        if (free[i].start + free[i].len === this.top) { this.top = free[i].start; free.splice(i, 1); }
      }
      return;
    }
    const free = this.free;
    let i = 0;
    while (i < free.length && free[i].start < start) i++;
    // try to merge with previous span
    const prev = free[i - 1];
    if (prev && prev.start + prev.len === start) {
      prev.len += n;
      const next = free[i];
      if (next && start + n === next.start) { prev.len += next.len; free.splice(i, 1); }
      return;
    }
    // try to merge with next span
    const next = free[i];
    if (next && start + n === next.start) { next.start = start; next.len += n; return; }
    free.splice(i, 0, { start, len: n });
  }

  // Grow to hold at least `minUnits`, preserving live data via a GPU-side copy.
  // Returns the new buffer object (the caller must rebuild any VAO that binds it).
  grow(minUnits) {
    const gl = this.gl;
    let cap = this.capacity;
    while (cap < minUnits) cap *= 2;
    const nb = gl.createBuffer();
    // Establish the buffer's type via its REAL target (ARRAY / ELEMENT) before
    // any COPY_* bind. WebGL2 type-locks a buffer on first non-copy use; binding
    // a still-untyped buffer to a copy target first can leave a later real-target
    // bind a no-op (VAO keeps a stale binding → INVALID_OPERATION on draw).
    // Detach the VAO so an ELEMENT_ARRAY_BUFFER bind can't disturb a live VAO.
    gl.bindVertexArray(null);
    gl.bindBuffer(this.target, nb);
    gl.bufferData(this.target, cap * this.unitBytes, gl.DYNAMIC_DRAW);
    gl.bindBuffer(this.target, null);
    if (this.top > 0) {
      gl.bindBuffer(gl.COPY_READ_BUFFER, this.buf);
      gl.bindBuffer(gl.COPY_WRITE_BUFFER, nb);
      gl.copyBufferSubData(gl.COPY_READ_BUFFER, gl.COPY_WRITE_BUFFER, 0, 0, this.top * this.unitBytes);
      gl.bindBuffer(gl.COPY_READ_BUFFER, null);
      gl.bindBuffer(gl.COPY_WRITE_BUFFER, null);
    }
    gl.deleteBuffer(this.buf);
    this.buf = nb;
    this.capacity = cap;
    return nb;
  }
}

// One shared buffer set for a single pass. Owns a vertex arena, an index arena,
// and the VAO that binds them.
export class ChunkBatch {
  constructor(gl, initVerts = 8192, initIndices = 12288) {
    this.gl = gl;
    this.vtx = new Arena(gl, gl.ARRAY_BUFFER, initVerts);
    this.idx = new Arena(gl, gl.ELEMENT_ARRAY_BUFFER, initIndices);
    this.vao = gl.createVertexArray();
    this._buildVAO();
  }

  _buildVAO() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vtx.buf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 3 * 4);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, STRIDE, 5 * 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idx.buf); // element binding is VAO state
    gl.bindVertexArray(null);
  }

  // Upload one chunk section. `indices` is rebased IN PLACE to absolute vertex
  // positions (the array is owned by us after meshing, never reused). Returns a
  // record {vStart, vCount, iStart, iCount} for later drawing / freeing.
  put(verts, indices) {
    const gl = this.gl;
    const vN = verts.length / FLOATS_PER_VERT;
    const iN = indices.length;

    let vStart = this.vtx.alloc(vN);
    if (vStart < 0) { this.vtx.grow(this.vtx.top + vN); this._buildVAO(); vStart = this.vtx.alloc(vN); }
    let iStart = this.idx.alloc(iN);
    if (iStart < 0) { this.idx.grow(this.idx.top + iN); this._buildVAO(); iStart = this.idx.alloc(iN); }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vtx.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, vStart * STRIDE, verts);

    for (let k = 0; k < iN; k++) indices[k] += vStart; // local → absolute
    gl.bindVertexArray(this.vao); // ELEMENT_ARRAY_BUFFER binding lives on the VAO
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, iStart * IDX_BYTES, indices);
    gl.bindVertexArray(null);

    return { vStart, vCount: vN, iStart, iCount: iN };
  }

  free(rec) {
    if (!rec) return;
    this.vtx.release(rec.vStart, rec.vCount);
    this.idx.release(rec.iStart, rec.iCount);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.vtx.buf);
    gl.deleteBuffer(this.idx.buf);
  }
}

// Draws a set of chunk records for one pass in a single multi-draw call.
// `records` is an array of {iStart, iCount} (already frustum-culled by caller).
// Reuses the scratch Int32Arrays across frames to stay allocation-free.
export class MultiDraw {
  constructor(gl, ext) {
    this.gl = gl;
    this.ext = ext;
    this.counts = new Int32Array(1024);
    this.offsets = new Int32Array(1024);
  }

  _ensure(n) {
    if (n <= this.counts.length) return;
    let cap = this.counts.length;
    while (cap < n) cap *= 2;
    this.counts = new Int32Array(cap);
    this.offsets = new Int32Array(cap);
  }

  draw(batch, records) {
    const n = records.length;
    if (!n) return;
    this._ensure(n);
    const counts = this.counts, offsets = this.offsets;
    for (let i = 0; i < n; i++) {
      const r = records[i];
      counts[i] = r.iCount;
      offsets[i] = r.iStart * IDX_BYTES; // byte offset into the shared IBO
    }
    const gl = this.gl;
    gl.bindVertexArray(batch.vao);
    this.ext.multiDrawElementsWEBGL(gl.TRIANGLES, counts, 0, gl.UNSIGNED_INT, offsets, 0, n);
  }
}
