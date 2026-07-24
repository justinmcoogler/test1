// Mesh worker: runs meshChunk() off the main thread. It has no DOM/canvas, so
// the main thread ships it the atlas UV table once ('init') and a transferable
// 3×3 block snapshot per job ('mesh'). Results (typed-array verts/indices) are
// transferred back zero-copy. The main thread keeps the synchronous mesher as a
// fallback, so this file is a pure accelerator.
import { meshChunk } from './mesher.js';
import { setTileUV } from './textures.js';
import { SnapshotView } from './mesh-snapshot.js';

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') {
    setTileUV(msg.tileUV);
    self.postMessage({ type: 'ready' });
    return;
  }
  if (msg.type === 'mesh') {
    const view = new SnapshotView(msg.snapshot);
    const m = meshChunk(view, msg.snapshot.cx, msg.snapshot.cz);
    const transfer = [];
    const pack = (b) => {
      if (!b) return null;
      transfer.push(b.verts.buffer, b.indices.buffer);
      return { verts: b.verts, indices: b.indices };
    };
    self.postMessage({
      type: 'meshed', id: msg.id, cx: msg.snapshot.cx, cz: msg.snapshot.cz, top: msg.top,
      opaque: pack(m.opaque), cutout: pack(m.cutout), water: pack(m.water),
    }, transfer);
  }
};
