// Grid A* over standable surface cells. Used by click-to-move, the quest
// trail, and map travel. Works on loaded chunks only — callers treat a
// partial path (best effort toward the goal) as normal, since distant
// chunks stream in as the player walks.

// Small binary min-heap keyed on f-score.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Find a walking path from (sx,sz) near height sy to (tx,tz).
// Returns an array of {x,y,z} standing cells (excluding the start cell),
// or null when not even a first step exists. opts:
//   maxExpand  — A* node budget (default 4000)
//   goalRadius — accept cells within this many blocks of the goal (default 0.9)
//   partial    — when the goal is unreachable/out of budget, return the path
//                to the explored cell closest to the goal (default true)
export function findPath(world, sx, sz, sy, tx, tz, opts = {}) {
  const maxExpand = opts.maxExpand ?? 4000;
  const goalRadius = opts.goalRadius ?? 0.9;
  const partial = opts.partial !== false;
  const x0 = Math.floor(sx), z0 = Math.floor(sz);
  const gx = Math.floor(tx), gz = Math.floor(tz);
  const y0 = world.groundNear(x0, z0, sy);
  if (y0 === null) return null;

  const key = (x, z) => x * 100000 + z; // world coords stay far below 1e5
  const nodes = new Map(); // key → {x,y,z,g,f,parent}
  const open = new Heap();
  const h = (x, z) => Math.abs(x - gx) + Math.abs(z - gz);
  const start = { x: x0, y: y0, z: z0, g: 0, f: h(x0, z0), parent: null, closed: false };
  nodes.set(key(x0, z0), start);
  open.push(start);
  let best = start;
  let bestH = h(x0, z0);
  let expanded = 0;

  while (open.size && expanded < maxExpand) {
    const cur = open.pop();
    if (cur.closed) continue;
    cur.closed = true;
    expanded++;
    const curH = h(cur.x, cur.z);
    if (curH < bestH) { bestH = curH; best = cur; }
    if (curH <= goalRadius) { best = cur; break; }
    for (const [dx, dz] of STEPS) {
      const nx = cur.x + dx, nz = cur.z + dz;
      const k = key(nx, nz);
      const existing = nodes.get(k);
      if (existing?.closed) continue;
      const ny = world.groundNear(nx, nz, cur.y);
      if (ny === null) continue;
      if (ny - cur.y > 1) continue;      // can't climb more than one block
      if (cur.y - ny > 4) continue;      // don't route off cliffs
      const stepCost = 1 + (ny > cur.y ? 0.4 : ny < cur.y ? 0.1 : 0);
      const g = cur.g + stepCost;
      if (existing && g >= existing.g) continue;
      const node = existing || { x: nx, y: ny, z: nz, closed: false };
      node.g = g;
      node.f = g + h(nx, nz);
      node.parent = cur;
      if (!existing) nodes.set(k, node);
      open.push(node);
    }
  }

  if (bestH > goalRadius && !partial) return null;
  if (best === start) return null;
  const out = [];
  for (let n = best; n && n !== start; n = n.parent) out.push({ x: n.x, y: n.y, z: n.z });
  out.reverse();
  return out;
}
