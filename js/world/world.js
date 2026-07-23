// Chunked voxel world: generation, block access, player edits, resource
// node lifecycle (deplete/respawn), chest storage, raycasting, persistence.
import { B, BLOCKS, isSolid } from './blocks.js';
import { CHUNK, WORLD_H, SEA, FROST_CAMP, WorldGen, undergroundNodeCandidates } from './worldgen.js';
import { buildStarterStructures, indexEditsByChunk } from './structures.js';
import { NODE_TYPES, nodeBlocks, nodeCells } from '../game/nodes.js';
import { hash2, hash3, hashSeed } from '../core/rng.js';
import { emit } from '../core/events.js';

const SLAB_BLOCKS = new Set();
export function initSlabSet() {
  for (const name of ['stump', 'dig_mound', 'anvil_block', 'campfire']) SLAB_BLOCKS.add(B[name]);
}

export const DAY_LEN = 480; // seconds per full day/night cycle

// Global wildlife-spawn multiplier applied to every biome's per-block enemy
// density. Lower = sparser, more realistic wildlife. Tune here in one place.
const MOB_SPAWN_RATE = 0.4;

export const chunkKey = (cx, cz) => `${cx},${cz}`;
export const cellKey = (x, y, z) => `${x},${y},${z}`;
const lidx = (lx, y, lz) => (y * CHUNK + lz) * CHUNK + lx;

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.gen = new WorldGen(this.seed);
    this.chunks = new Map();          // key → chunk
    this.editedBlocks = new Map();    // chunkKey → Map(idx → blockId)
    this.nodesById = new Map();       // nodeId → node instance
    this.nodeAtCell = new Map();      // "x,y,z" → nodeId
    this.nodeStates = new Map();      // nodeId → {state, respawnAt, remaining}
    this.depletedWatch = new Set();   // nodeIds waiting to respawn (loaded chunks)
    this.chestContents = new Map();   // chestId → [{item,qty}]
    this.chestMeta = new Map();       // chestId → def (incl. requiresBossDead)
    this.crops = new Map();           // "x,y,z" → ripeAt (player-planted crops)
    this.blockFacing = new Map();     // "x,y,z" → 0-3 facing for directional blocks
    this.time = 0;                    // world-time seconds, persisted
    this.dirtyChunks = new Set();     // chunk keys needing remesh

    const s = buildStarterStructures();
    this.structure = s;
    this.structEditsByChunk = indexEditsByChunk(s.edits, CHUNK);
    this.markers = s.markers;
    for (const ch of s.chests) this.chestMeta.set(ch.id, ch);
  }

  // ---- Chunk generation --------------------------------------------------
  ensureChunk(cx, cz) {
    const k = chunkKey(cx, cz);
    let c = this.chunks.get(k);
    if (c) return c;
    c = this.generateChunk(cx, cz);
    this.chunks.set(k, c);
    return c;
  }

  hasChunk(cx, cz) { return this.chunks.has(chunkKey(cx, cz)); }
  getChunk(cx, cz) { return this.chunks.get(chunkKey(cx, cz)); }

  generateChunk(cx, cz) {
    const blocks = new Uint8Array(CHUNK * CHUNK * WORLD_H);
    const chunk = { cx, cz, blocks, nodes: [], spawns: [], surfaceH: new Int16Array(CHUNK * CHUNK) };
    const setLocal = (lx, y, lz, id) => { blocks[lidx(lx, y, lz)] = id; };
    const gen = this.gen;

    // Highest occupied layer (+1) in this chunk. The mesher/light/scans stop
    // here instead of at WORLD_H, so cost tracks terrain height, not the tall
    // world ceiling. Everything above is guaranteed air.
    let contentTop = SEA + 1;
    const bumpTop = (y) => { if (y + 1 > contentTop) contentTop = y + 1; };

    for (let lz = 0; lz < CHUNK; lz++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
        const { h } = gen.column(blocks, lx, lz, wx, wz, setLocal);
        chunk.surfaceH[lz * CHUNK + lx] = h;
        bumpTop(Math.max(h, SEA));
      }
    }

    // Vegetation + biome node/spawn placement (outside the settlement ring)
    for (let lz = 0; lz < CHUNK; lz++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
        const d0 = Math.hypot(wx, wz);
        if (d0 < 38) continue;
        if (Math.hypot(wx - FROST_CAMP.x, wz - FROST_CAMP.z) < 26) continue; // camp stays hand-built
        const h = chunk.surfaceH[lz * CHUNK + lx];
        const surfId = blocks[lidx(lx, h, lz)];
        const biome = gen.biomeAt(wx, wz);
        const above = h + 1 < WORLD_H ? blocks[lidx(lx, h + 1, lz)] : B.air;
        const grassy = surfId === B.grass || surfId === B.snow_grass || surfId === B.corrupt_soil;
        // trees also root on the bare ground of their biomes (highland ash/hickory
        // on stone, badlands teak on sand) — else those woods would never spawn.
        const treeGround = grassy || surfId === B.stone || surfId === B.sand;

        // trees (kept ≥2 from chunk edge so canopies stay chunk-local)
        if (lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13 && treeGround && above === B.air && h > SEA + 1) {
          const r = hash2(this.seed + 901, wx, wz);
          let acc = 0, chosen = null;
          for (const t of biome.trees) { acc += t.density; if (r < acc) { chosen = t.type; break; } }
          if (chosen) {
            const def = NODE_TYPES[chosen];
            const th = def.trunk[0] + Math.floor(hash2(this.seed + 902, wx, wz) * (def.trunk[1] - def.trunk[0] + 1));
            chunk.nodes.push({ type: chosen, x: wx, y: h + 1, z: wz, meta: { h: th } });
            continue;
          }
        }
        // small plants (pure decoration)
        if (grassy && above === B.air) {
          for (const p of biome.plants) {
            if (hash2(this.seed + 903 + B[p.block], wx, wz) < p.d) { setLocal(lx, h + 1, lz, B[p.block]); bumpTop(h + 1); break; }
          }
        }
        // surface nodes
        if (above === B.air || surfId === B.water) {
          for (const n of biome.nodes) {
            const def = NODE_TYPES[n.type];
            if (hash2(this.seed + 907 + def.xp * 7, wx, wz) >= n.d) continue;
            if (def.kind === 'water') {
              // fishing spots hug the shoreline: deep enough to fish, with
              // dry land on at least one neighboring column to stand on
              if (h < SEA - 1 && blocks[lidx(lx, SEA, lz)] === B.water) {
                const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]]
                  .some(([dx, dz]) => gen.heightAt(wx + dx, wz + dz) >= SEA);
                if (shore) chunk.nodes.push({ type: n.type, x: wx, y: SEA, z: wz });
              }
            } else if (above === B.air && surfId !== B.water) {
              chunk.nodes.push({ type: n.type, x: wx, y: h + 1, z: wz });
            }
            break;
          }
        }
        // enemy spawn points (packs place several creatures on one point)
        if (d0 > 60 && above === B.air && surfId !== B.water) {
          for (const e of biome.enemies) {
            // Per-type salt from the name's hash — NOT its length, which collides
            // for equal-length names (e.g. moss_lurker vs glimmer_fox) and would
            // let an earlier same-length enemy permanently shadow a later one.
            e._salt ??= hashSeed(e.type);
            if (hash2(this.seed + e._salt, wx, wz) < e.d * MOB_SPAWN_RATE) {
              const n = e.pack
                ? e.pack[0] + Math.floor(hash2(this.seed + 913, wx, wz) * (e.pack[1] - e.pack[0] + 1))
                : 1;
              for (let i = 0; i < n; i++) {
                chunk.spawns.push({ id: `sp:${wx},${wz}${i ? ':' + i : ''}`, type: e.type, x: wx, y: h + 1, z: wz });
              }
              break;
            }
          }
        }
      }
    }

    // Underground ore nodes on cave walls
    for (const cand of undergroundNodeCandidates(gen, cx, cz)) {
      const { lx, ly, lz, roll } = cand;
      if (blocks[lidx(lx, ly, lz)] !== B.stone) continue;
      const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
      let nearAir = false;
      for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
        const nlx = lx + dx, nly = ly + dy, nlz = lz + dz;
        if (nlx < 0 || nlx >= CHUNK || nlz < 0 || nlz >= CHUNK || nly < 1 || nly >= WORLD_H) continue;
        if (blocks[lidx(nlx, nly, nlz)] === B.air) { nearAir = true; break; }
      }
      if (!nearAir) continue;
      const tier = gen.tierAt(wx, wz);
      // Realistic underground metals: common near spawn, precious/meteoric deep &
      // far out. This is the GUARANTEED source of every metal (zinc & platinum
      // included), so brass/platinum jewelry stay reachable on every seed even if
      // their surface biome (corrupted wilds) never generates. Coal is everywhere.
      let type;
      if (roll < 0.40) type = 'ore_copper';
      else if (roll < 0.68) type = 'ore_tin';
      else if (roll < 0.88) type = 'ore_iron';
      else type = 'deposit_coal';
      if (tier >= 1 && roll >= 0.62 && roll < 0.68) type = 'ore_lead';
      if (tier >= 2 && roll >= 0.80 && roll < 0.86) type = 'ore_zinc';
      if (tier >= 2 && roll >= 0.86 && roll < 0.93) type = 'ore_silver';
      if (tier >= 2 && roll >= 0.93 && ly < 40) type = 'ore_gold';
      if (tier >= 3 && roll >= 0.90 && roll < 0.93) type = 'ore_platinum';
      if (tier >= 3 && roll >= 0.96) type = 'ore_meteoric';
      chunk.nodes.push({ type, x: wx, y: ly, z: wz });
    }

    // Structure overrides (settlement, mine, dungeon)
    const structEdits = this.structEditsByChunk.get(chunkKey(cx, cz));
    if (structEdits) {
      for (const [x, y, z, id] of structEdits) {
        blocks[lidx(x - cx * CHUNK, y, z - cz * CHUNK)] = id;
        if (id !== B.air) bumpTop(y);
      }
    }
    // Structure nodes/spawns that fall in this chunk
    for (const n of this.structure.nodes) {
      if (Math.floor(n.x / CHUNK) === cx && Math.floor(n.z / CHUNK) === cz) chunk.nodes.push({ ...n });
    }
    for (const sp of this.structure.spawns) {
      if (Math.floor(sp.x / CHUNK) === cx && Math.floor(sp.z / CHUNK) === cz) chunk.spawns.push({ ...sp });
    }

    // Register nodes and stamp their current visual state
    for (const node of chunk.nodes) {
      node.id = `n:${node.x},${node.y},${node.z}`;
      node.def = NODE_TYPES[node.type];
      this.nodesById.set(node.id, node);
      for (const [x, y, z] of nodeCells(node)) this.nodeAtCell.set(cellKey(x, y, z), node.id);
      let st = this.nodeStates.get(node.id);
      if (!st) {
        st = { state: 'ready', respawnAt: 0, remaining: this.rollCharges(node) };
        this.nodeStates.set(node.id, st);
      }
      if (st.state === 'depleted' && st.respawnAt <= this.time) {
        st.state = 'ready'; st.remaining = this.rollCharges(node);
      }
      if (st.state === 'depleted') this.depletedWatch.add(node.id);
      bumpTop(this.stampNodeInto(blocks, cx, cz, node, st.state));
    }

    // Player edits replay last — they always win.
    const edits = this.editedBlocks.get(chunkKey(cx, cz));
    if (edits) for (const [idx, id] of edits) {
      blocks[idx] = id;
      if (id !== B.air) bumpTop(Math.floor(idx / (CHUNK * CHUNK)));
    }

    chunk.contentTop = Math.min(WORLD_H, contentTop);
    return chunk;
  }

  rollCharges(node) {
    const [a, b] = node.def.charges;
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  stampNodeInto(blocks, cx, cz, node, state) {
    let maxY = -1;
    for (const cell of nodeBlocks(node, state)) {
      if (cell.id === undefined) continue;
      const lx = cell.x - cx * CHUNK, lz = cell.z - cz * CHUNK;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || cell.y < 0 || cell.y >= WORLD_H) continue;
      blocks[lidx(lx, cell.y, lz)] = cell.id;
      if (cell.id !== B.air) maxY = Math.max(maxY, cell.y);
    }
    return maxY;
  }

  // ---- Block access ------------------------------------------------------
  getBlock(x, y, z) {
    if (y < 0 || y >= WORLD_H) return B.air;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return B.air;
    return c.blocks[lidx(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  // record=true → player edit (persisted); false → derived (node stamps)
  // Facing (0=+Z 1=+X 2=-Z 3=-X) for directional blocks; drives which side shows
  // the `front` tile. Persisted with the world.
  facingAt(x, y, z) { return this.blockFacing.get(`${x},${y},${z}`) ?? 0; }
  setFacing(x, y, z, facing) {
    const key = `${x},${y},${z}`;
    if (facing) this.blockFacing.set(key, facing & 3); else this.blockFacing.delete(key);
    this.dirtyChunks.add(chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
  }

  setBlock(x, y, z, id, record = true) {
    if (y < 0 || y >= WORLD_H) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const k = chunkKey(cx, cz);
    const c = this.chunks.get(k);
    if (!c) return;
    const idx = lidx(x - cx * CHUNK, y, z - cz * CHUNK);
    if (c.blocks[idx] === id && !record) return;
    c.blocks[idx] = id;
    this.blockFacing.delete(`${x},${y},${z}`); // stale facing goes with the old block
    if (id !== B.air && y + 1 > (c.contentTop || 0)) c.contentTop = Math.min(WORLD_H, y + 1); // building upward raises the mesh ceiling
    c.mapStamp = (c.mapStamp || 0) + 1; // invalidates cached map tiles
    if (record) {
      if (!this.editedBlocks.has(k)) this.editedBlocks.set(k, new Map());
      this.editedBlocks.get(k).set(idx, id);
    }
    this.dirtyChunks.add(k);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    if (lx === 0) this.dirtyChunks.add(chunkKey(cx - 1, cz));
    if (lx === CHUNK - 1) this.dirtyChunks.add(chunkKey(cx + 1, cz));
    if (lz === 0) this.dirtyChunks.add(chunkKey(cx, cz - 1));
    if (lz === CHUNK - 1) this.dirtyChunks.add(chunkKey(cx, cz + 1));
  }

  // ---- Day/night clock ---------------------------------------------------
  dayPhase() { return (this.time % DAY_LEN) / DAY_LEN; }

  // 1 at noon, 0.25 deep night, with dusk/dawn ramps
  daylight() {
    const t = this.dayPhase();
    if (t < 0.42) return 1;
    if (t < 0.52) return 1 - ((t - 0.42) / 0.10) * 0.75;
    if (t < 0.90) return 0.25;
    return 0.25 + ((t - 0.90) / 0.10) * 0.75;
  }

  isNight() { return this.daylight() < 0.55; }

  surfaceAt(x, z) {
    const c = this.chunks.get(chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
    const start = c ? Math.min(WORLD_H - 1, c.contentTop) : WORLD_H - 1;
    for (let y = start; y > 0; y--) {
      const id = this.getBlock(x, y, z);
      if (id !== B.air && id !== B.water) return y;
    }
    return 0;
  }

  // Standable air cell near a given height — works inside caves/dungeons where
  // surfaceAt would report the terrain far above. Returns the standing y or null.
  groundNear(x, z, nearY) {
    const base = Math.round(nearY);
    for (let dy = 2; dy >= -5; dy--) {
      const y = base + dy;
      if (y < 1 || y >= WORLD_H - 1) continue;
      if (this.collisionHeight(x, y - 1, z) > 0 &&
          this.collisionHeight(x, y, z) === 0 &&
          this.collisionHeight(x, y + 1, z) === 0 &&
          this.getBlock(x, y, z) !== B.water) {
        return y;
      }
    }
    return null;
  }

  // Highest standing surface at or below fromY, scanning down to maxDrop blocks.
  // Used for mob gravity so a creature settles onto whatever ground is beneath
  // it — over a ledge, after terrain changes, or when idle — instead of floating.
  groundBelow(x, z, fromY, maxDrop = 32) {
    const top = Math.min(WORLD_H - 2, Math.floor(fromY));
    const bottom = Math.max(1, top - maxDrop);
    for (let y = top; y >= bottom; y--) {
      if (this.collisionHeight(x, y - 1, z) > 0 &&
          this.collisionHeight(x, y, z) === 0 &&
          this.collisionHeight(x, y + 1, z) === 0 &&
          this.getBlock(x, y, z) !== B.water) {
        return y;
      }
    }
    return null;
  }

  // ---- Nodes -------------------------------------------------------------
  nodeAt(x, y, z) {
    const id = this.nodeAtCell.get(cellKey(x, y, z));
    return id ? this.nodesById.get(id) : null;
  }

  nodeState(nodeId) { return this.nodeStates.get(nodeId); }

  depleteCharge(node) {
    const st = this.nodeStates.get(node.id);
    if (!st || st.state !== 'ready') return false;
    st.remaining -= 1;
    if (st.remaining <= 0) {
      st.state = 'depleted';
      st.respawnAt = this.time + node.def.respawn;
      this.depletedWatch.add(node.id);
      this.restampNode(node, 'depleted');
      emit('nodeDepleted', { node });
    }
    return true;
  }

  hasPlayerEdit(x, y, z) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const m = this.editedBlocks.get(chunkKey(cx, cz));
    if (!m) return false;
    return m.has(((y * CHUNK + (z - cz * CHUNK)) * CHUNK) + (x - cx * CHUNK));
  }

  restampNode(node, state) {
    // Water nodes (fishing spots) never alter blocks — clearing would punch
    // a hole in the water surface and orphan the node.
    if (node.def.kind === 'water') return;
    const cx = Math.floor(node.x / CHUNK), cz = Math.floor(node.z / CHUNK);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return;
    const clear = (x, y, z) => {
      if (!this.hasPlayerEdit(x, y, z)) this.setBlock(x, y, z, B.air, false);
    };
    for (const [x, y, z] of nodeCells(node)) clear(x, y, z);
    // trees also clear canopy — but never stomp player-built blocks
    if (node.def.kind === 'tree') {
      for (const cell of nodeBlocks(node, 'ready')) clear(cell.x, cell.y, cell.z);
    }
    for (const cell of nodeBlocks(node, state)) {
      if (cell.id === undefined || this.hasPlayerEdit(cell.x, cell.y, cell.z)) continue;
      this.setBlock(cell.x, cell.y, cell.z, cell.id, false);
    }
  }

  // ---- Player farming ----------------------------------------------------
  plantCrop(x, y, z) {
    this.setBlock(x, y, z, B.crop_young, true);
    this.crops.set(cellKey(x, y, z), this.time + 120); // ~2 min to ripen
  }

  update(dt) {
    this.time += dt;
    // planted crops ripen on a slow tick
    if ((this._cropTick = (this._cropTick || 0) + dt) > 1) {
      this._cropTick = 0;
      for (const [k, ripeAt] of this.crops) {
        if (ripeAt > this.time) continue;
        const [x, y, z] = k.split(',').map(Number);
        if (this.getBlock(x, y, z) === B.crop_young) {
          this.setBlock(x, y, z, B.crop_ripe, true);
          emit('cropRipened', { x, y, z });
        }
        this.crops.delete(k); // grown (or was broken early) — either way done
      }
    }
    if (this.depletedWatch.size) {
      for (const id of [...this.depletedWatch]) {
        const st = this.nodeStates.get(id);
        const node = this.nodesById.get(id);
        if (!st || !node) { this.depletedWatch.delete(id); continue; }
        if (st.respawnAt <= this.time) {
          st.state = 'ready';
          st.remaining = this.rollCharges(node);
          this.depletedWatch.delete(id);
          this.restampNode(node, 'ready');
          emit('nodeRespawned', { node });
        }
      }
    }
  }

  // ---- Chests ------------------------------------------------------------
  getChestAt(x, y, z) {
    for (const [id, meta] of this.chestMeta) {
      if (meta.x === x && meta.y === y && meta.z === z) return { id, meta };
    }
    return null;
  }

  openChest(id) {
    if (!this.chestContents.has(id)) {
      const meta = this.chestMeta.get(id);
      this.chestContents.set(id, meta?.loot ? meta.loot.map((l) => ({ ...l })) : []);
    }
    return this.chestContents.get(id);
  }

  registerPlayerChest(x, y, z) {
    const id = `pc:${x},${y},${z}`;
    if (!this.chestMeta.has(id)) this.chestMeta.set(id, { id, x, y, z, loot: [] });
    if (!this.chestContents.has(id)) this.chestContents.set(id, []);
    return id;
  }

  // ---- Raycast (voxel DDA) ----------------------------------------------
  raycast(ox, oy, oz, dx, dy, dz, maxDist, hitWaterNodes = true) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = Math.sign(dx) || 1, stepY = Math.sign(dy) || 1, stepZ = Math.sign(dz) || 1;
    const tDeltaX = Math.abs(1 / (dx || 1e-9)), tDeltaY = Math.abs(1 / (dy || 1e-9)), tDeltaZ = Math.abs(1 / (dz || 1e-9));
    let tMaxX = tDeltaX * (stepX > 0 ? (x + 1 - ox) : (ox - x));
    let tMaxY = tDeltaY * (stepY > 0 ? (y + 1 - oy) : (oy - y));
    let tMaxZ = tDeltaZ * (stepZ > 0 ? (z + 1 - oz) : (oz - z));
    let face = [0, 0, 0];
    let t = 0;
    for (let i = 0; i < 256 && t <= maxDist; i++) {
      const id = this.getBlock(x, y, z);
      if (id !== B.air) {
        const def = BLOCKS[id];
        const node = this.nodeAt(x, y, z);
        if (def.solid || def.shape === 'cross' || (hitWaterNodes && node)) {
          return { x, y, z, id, face, dist: t, node };
        }
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; face = [-stepX, 0, 0]; }
      else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; face = [0, -stepY, 0]; }
      else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; face = [0, 0, -stepZ]; }
    }
    return null;
  }

  // Solid check for physics; slabs count as 0.6-high solids.
  collisionHeight(x, y, z) {
    const id = this.getBlock(x, y, z);
    if (!isSolid(id)) return 0;
    return SLAB_BLOCKS.has(id) ? 0.6 : 1;
  }

  isWater(x, y, z) { return this.getBlock(x, y, z) === B.water; }

  unloadFar(px, pz, keepChunks) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    const removed = [];
    for (const [k, c] of this.chunks) {
      const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
      if (d > keepChunks) {
        for (const node of c.nodes) {
          this.nodesById.delete(node.id);
          for (const [x, y, z] of nodeCells(node)) this.nodeAtCell.delete(cellKey(x, y, z));
          this.depletedWatch.delete(node.id);
        }
        this.chunks.delete(k);
        removed.push(k);
      }
    }
    return removed;
  }

  // ---- Persistence -------------------------------------------------------
  serialize() {
    const edits = {};
    for (const [k, m] of this.editedBlocks) {
      const arr = [];
      for (const [idx, id] of m) { arr.push(idx, id); }
      edits[k] = arr;
    }
    const nodeStates = {};
    for (const [id, st] of this.nodeStates) {
      // Only depleted nodes need persisting (their regen timers must survive);
      // pristine ready nodes re-roll charges on load, keeping saves small.
      if (st.state !== 'ready') nodeStates[id] = [0, Math.round(st.respawnAt), st.remaining];
    }
    const chests = {};
    for (const [id, c] of this.chestContents) chests[id] = c;
    const crops = {};
    for (const [k, at] of this.crops) crops[k] = Math.round(at);
    const facing = {};
    for (const [k, f] of this.blockFacing) facing[k] = f;
    return { seed: this.seed, time: Math.round(this.time), edits, nodeStates, chests, crops, facing };
  }

  deserialize(data) {
    this.time = data.time || 0;
    this.editedBlocks.clear();
    for (const [k, arr] of Object.entries(data.edits || {})) {
      const m = new Map();
      for (let i = 0; i < arr.length; i += 2) m.set(arr[i], arr[i + 1]);
      this.editedBlocks.set(k, m);
    }
    this.nodeStates.clear();
    for (const [id, [ready, respawnAt, remaining]] of Object.entries(data.nodeStates || {})) {
      this.nodeStates.set(id, { state: ready ? 'ready' : 'depleted', respawnAt, remaining });
    }
    this.crops.clear();
    for (const [k, at] of Object.entries(data.crops || {})) this.crops.set(k, at);
    this.blockFacing.clear();
    for (const [k, f] of Object.entries(data.facing || {})) this.blockFacing.set(k, f);
    this.chestContents.clear();
    for (const [id, c] of Object.entries(data.chests || {})) {
      this.chestContents.set(id, c);
      // player-placed chest meta isn't in the structure list — rebuild from the id
      if (id.startsWith('pc:') && !this.chestMeta.has(id)) {
        const [x, y, z] = id.slice(3).split(',').map(Number);
        this.chestMeta.set(id, { id, x, y, z, loot: [] });
      }
    }
  }
}
