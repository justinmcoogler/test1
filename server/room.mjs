// The authoritative game room: one world, one set of mobs, N players.
//
// THE POINT OF THIS FILE IS HOW LITTLE IS IN IT. It imports the real World, the
// real EnemyManager and the real CombatRS out of js/ and runs them. There is no
// server-side reimplementation of the game, because a reimplementation is a
// second set of rules that drifts from the first and then the host and the guests
// are playing subtly different games. Those three modules were already free of
// any DOM reference, which is the only reason this is a few hundred lines rather
// than a rewrite.
//
// WHAT IS AUTHORITATIVE, AND WHAT IS NOT.
//
//   The world is. Terrain is deterministic from the seed, so nothing streams
//   terrain — every client generates identical ground from the same number, and
//   the only thing on the wire is the EDIT set. That is what makes a voxel world
//   cheap to share.
//   The mobs are. One EnemyManager, one wander, one hp pool. A goblin killed by
//   one child is dead for everyone, which was the whole ask.
//   Movement is NOT. Clients send where they are and the server believes them.
//   This is a game for one family on one wifi network; rewinding and replaying
//   inputs to catch a cheat would be a great deal of work to stop a child from
//   walking quickly in their own living room. Positions are still bounds-checked
//   (js/net/protocol.js) so a bad value cannot hurt the SERVER — the line is
//   drawn at "cannot break other people", not "cannot advantage yourself".
import { World, initSlabSet, DAY_LEN, DAWN } from '../js/world/world.js';
import { EnemyManager, ENEMY_TYPES } from '../js/game/enemies.js';
import { CombatRS } from '../js/game/combatrs.js';
import { Inventory } from '../js/game/inventory.js';
import { Skills } from '../js/game/skills.js';
import { Player } from '../js/player/player.js';
import { BLOCKS, isSolid } from '../js/world/blocks.js';
import {
  C, S, PROTOCOL_VERSION, encode, decode,
  cleanName, cleanChat, cleanEdit, cleanInput, cleanId, cleanSave,
} from '../js/net/protocol.js';

const CHUNK = 16;

// How far around each player the server keeps the world resident. Mobs only
// exist in loaded chunks (EnemyManager.refresh reads chunk.spawns), so this is
// really "how far away can a creature be and still be alive". Four chunks is a
// little beyond render distance on a tablet.
const SIM_RADIUS_CHUNKS = 4;

// Mobs are only described to a player who could plausibly see them. Well beyond
// render distance, so nothing pops in at the edge of vision.
const MOB_VIEW = 64;

// How many characters the room will remember. Far past a household; a bound at
// all is what stops an afternoon of invented names growing the save file until
// it will not load.
const MAX_CHARACTERS = 64;

export const SIM_HZ = 20;      // physics/AI steps per second
export const SNAP_HZ = 10;     // snapshots per second

// Anything a client asks for that is not one of these is dropped on the floor.
const HANDLED = new Set(Object.values(C));

let slabsReady = false;

export class Room {
  constructor({ seed = 'sproutlands', onLog = () => {} } = {}) {
    // initSlabSet() builds a module-level lookup the world needs. It is
    // idempotent in effect but there is no reason to pay for it twice.
    if (!slabsReady) { initSlabSet(); slabsReady = true; }
    this.seed = String(seed);
    this.world = new World(this.seed);
    this.enemyMgr = new EnemyManager(this.world);
    this.players = new Map();       // id → player record
    this.onLog = onLog;
    this.tickCount = 0;
    // Edits are broadcast as a batch each snapshot rather than one message per
    // block, because a child holding down "break" produces a steady stream and
    // one frame per block is a lot of tiny writes.
    this.pendingEdits = [];
    this.combatOut = new Map();     // playerId → queued combat events
    this._resident = new Set();
    // Where each player was when last seen, keyed by NAME. There are no accounts
    // here — a name is the whole identity — so a child who comes back tomorrow
    // reappears where they left off rather than at the spawn point.
    this.lastSeen = new Map();
    // …and WHO they are, keyed the same way: pack, skills, quests, mounts,
    // recipes, lesson progress. The room owns this now. It used to live in each
    // browser's localStorage, which meant a child who played on the iPad and
    // then the laptop arrived with empty pockets — the world was shared and the
    // person in it was not. Values are { at, data }; `at` is world time, used
    // only to decide who to forget first if this ever fills up.
    this.characters = new Map();
    // Set by anything worth writing to disk. The autosave skips a quiet world
    // rather than rewriting an identical file every minute.
    this.dirty = false;
  }

  // ---- persistence ----------------------------------------------------------
  serialize() {
    const players = {};
    for (const [name, at] of this.lastSeen) players[name] = at;
    // Live players are wherever they are right now, which is newer than
    // lastSeen — that is only written when someone leaves.
    for (const p of this.players.values()) {
      if (p.joined) players[p.name] = { x: r2(p.x), y: r2(p.y), z: r2(p.z) };
    }
    // Live players' characters are whatever they last uploaded; the stored copy
    // is already that, because _onSave writes straight through.
    const characters = {};
    for (const [name, rec] of this.characters) characters[name] = rec;
    return {
      version: 1,
      seed: this.seed,
      savedAt: null,               // stamped by the caller; the room has no clock
      world: this.world.serialize(),
      enemies: this.enemyMgr.serialize(),
      players,
      characters,
    };
  }

  // Must run BEFORE any chunk is generated. Edits are replayed as chunks come in
  // (js/world/world.js ensureChunk reads editedBlocks), so a chunk built before
  // the load would be built from bare terrain and then never revisited.
  deserialize(data) {
    if (!data) return;
    this.world.deserialize(data.world);
    this.enemyMgr.deserialize(data.enemies);
    this.lastSeen.clear();
    for (const [name, at] of Object.entries(data.players || {})) {
      if (at && Number.isFinite(at.x) && Number.isFinite(at.y) && Number.isFinite(at.z)) {
        this.lastSeen.set(name, { x: at.x, y: at.y, z: at.z });
      }
    }
    // A save written before the room kept characters simply has none, and every
    // child starts fresh once. Run through the same sanitiser as the wire, so a
    // hand-edited save file cannot do what a hand-typed message cannot.
    this.characters.clear();
    for (const [name, rec] of Object.entries(data.characters || {})) {
      const clean = cleanSave(rec?.data);
      if (clean) this.characters.set(name, { at: Number(rec.at) || 0, data: clean });
    }
  }

  // ---- membership -----------------------------------------------------------
  join(conn, id) {
    // A REAL Player, not a lookalike. The first version of this was a plain
    // object with the handful of fields the snapshot needed, and it worked right
    // up until a creature swung back: CombatRS calls player.damage(), which a
    // plain object does not have, so the exception aborted the whole simulation
    // step — every tick, for everyone — and no fight ever resolved. It also has
    // heal, applyBleed, stopBleeding, eye, energy and mana, all of which combat
    // reaches for. Using the real class is both simpler and the same decision
    // taken everywhere else here: run the game's own code.
    const p = new Player();
    p.id = id;
    p.conn = conn;
    p.name = 'Player';
    p.joined = false;
    p.anim = 'idle';
    p.sneak = false;
    p.inventory = new Inventory();
    p.skills = new Skills();
    p.combat = null;
    // Each player fights in their own CombatRS against the SHARED enemy manager,
    // with an emitter scoped to them (see js/game/combatrs.js) so one child's
    // hitsplats do not land on everybody's screen.
    p.combat = new CombatRS({
      world: this.world,
      player: p,
      inventory: p.inventory,
      skills: p.skills,
      enemyMgr: this.enemyMgr,
      addHitsplat: (x, y, z, text, color) => this._combatEvent(p.id, { k: 'splat', x, y, z, text, color }),
      emit: (evt, payload) => this._combatEmit(p, evt, payload),
    });
    this.players.set(id, p);
    return p;
  }

  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    // Drop the player's fights so their mobs are not left permanently engaged —
    // an entity with rsEngaged set is skipped by the wander loop, so a guest who
    // closes the tab mid-fight would otherwise freeze that goblin forever.
    for (const st of p.combat.engaged.values()) if (st.entity) st.entity.rsEngaged = false;
    if (p.joined) {
      this.lastSeen.set(p.name, { x: r2(p.x), y: r2(p.y), z: r2(p.z) });
      this.dirty = true;
    }
    this.players.delete(id);
    this.combatOut.delete(id);
    this.broadcast({ t: S.LEFT, id, name: p.name }, id);
    this.onLog(`${p.name} left (${this.players.size} playing)`);
  }

  // ---- inbound --------------------------------------------------------------
  handle(id, raw) {
    const p = this.players.get(id);
    if (!p) return;
    const m = decode(raw);
    if (!m || !HANDLED.has(m.t)) return;
    // Nothing but JOIN is accepted before the handshake, so a client cannot edit
    // the world without ever announcing itself.
    if (!p.joined && m.t !== C.JOIN) return;
    switch (m.t) {
      case C.JOIN: return this._onJoin(p, m);
      case C.INPUT: return this._onInput(p, m);
      case C.EDIT: return this._onEdit(p, m);
      case C.ATTACK: return this._onAttack(p, m);
      case C.DISENGAGE: return this._onDisengage(p);
      case C.CHAT: return this._onChat(p, m);
      case C.SLEEP: return this._onSleep(p);
      case C.SAVE: return this._onSave(p, m);
    }
  }

  // ---- characters -----------------------------------------------------------
  // THE ROOM IS THE ONLY STORE. A connected client does not write its character
  // to the browser at all; it sends it here, and this is what ends up in the
  // save file beside the world. That is the whole point — one place a child's
  // hundred hours of Mining lives, rather than one copy per device that each
  // think they are right.
  //
  // The blob is OPAQUE to the server. It is written by the game and read back by
  // the game; nothing here knows what a quest log looks like, and nothing here
  // should, or the room becomes a second implementation of the save format that
  // drifts from the first. What the room does know is size (cleanSave) and, for
  // the two systems combat actually needs, how to read them (_hydrate).
  _onSave(p, m) {
    const data = cleanSave(m.data);
    if (!data) return;
    this._remember(p.name, data);
    this._hydrate(p, data);
    this.dirty = true;
  }

  _remember(name, data) {
    if (!this.characters.has(name) && this.characters.size >= MAX_CHARACTERS) {
      // A family will never reach this. A save file that grows without limit
      // will, given enough invented names, so the oldest one goes — and it is
      // logged, because silently forgetting somebody's character is exactly the
      // kind of thing that should never happen quietly.
      let oldest = null, oldestAt = Infinity;
      for (const [n, rec] of this.characters) if (rec.at < oldestAt) { oldest = n; oldestAt = rec.at; }
      if (oldest) { this.characters.delete(oldest); this.onLog(`forgot the character "${oldest}" — ${MAX_CHARACTERS} is the limit`); }
    }
    this.characters.set(name, { at: Math.round(this.world.time), data });
  }

  // Teach the server's copy of this player what the client says they are.
  //
  // ONLY TWO SYSTEMS, and both because combat reads them: without the inventory
  // the server swings for unarmed damage no matter what a child is holding, and
  // without the skills it swings at level one. Everything else in the blob is
  // the client's business and is passed back untouched.
  _hydrate(p, data) {
    try { p.inventory.deserialize(data.inventory); } catch (err) { this.onLog(`inventory for ${p.name}: ${err.message}`); }
    try { p.skills.deserialize(data.skills); } catch (err) { this.onLog(`skills for ${p.name}: ${err.message}`); }
    try {
      if (data.player) {
        const { x, y, z } = p;                 // the live position outranks a saved one
        p.deserialize(data.player);
        p.x = x; p.y = y; p.z = z;
      }
    } catch (err) { this.onLog(`stats for ${p.name}: ${err.message}`); }
    // Whatever the client just told us is the new baseline, or the next snapshot
    // would report the difference between two totals as freshly earned XP.
    p._xpSeen = { ...p.skills.xp };
  }

  // COMBAT XP IS EARNED BY THE SERVER'S COPY OF YOUR SKILLS, since the server is
  // what resolves an online fight — so it has to come back, or fighting online
  // levels nothing at all and every kill is wasted.
  //
  // Sent as WHOLE points and tracked against what has been SENT rather than what
  // the server holds: Skills.addXp rounds, so a stream of fractional awards
  // would round to nothing on the client every time and the fractions would be
  // lost forever. Held here until they add up to a point, they are not.
  _xpDelta(p) {
    const seen = p._xpSeen || (p._xpSeen = {});
    const gains = {};
    let any = false;
    for (const [skill, total] of Object.entries(p.skills.xp)) {
      if (seen[skill] === undefined) { seen[skill] = total; continue; }
      const whole = Math.floor(total - seen[skill]);
      if (whole >= 1) { gains[skill] = whole; seen[skill] += whole; any = true; }
    }
    return any ? gains : null;
  }

  _onJoin(p, m) {
    if (p.joined) return;                       // joining twice is not a thing
    if (m.version !== PROTOCOL_VERSION) {
      p.conn.send(encode({
        t: S.DENIED,
        reason: `This server is running protocol ${PROTOCOL_VERSION} and you sent ${m.version}. Reload the page to pick up the current build.`,
      }));
      p.conn.close(1002, 'protocol mismatch');
      return;
    }
    p.name = this._uniqueName(cleanName(m.name));
    p.joined = true;
    // WHO YOU ARE COMES BACK BEFORE WHERE YOU ARE, because the character carries
    // the health and the gear that the position is then dropped on top of.
    const stored = this.characters.get(p.name)?.data || null;
    if (stored) this._hydrate(p, stored);
    const home = this.lastSeen.get(p.name);
    const spawn = home || this.world.structure?.spawnPoint || { x: 0, y: 80, z: 0 };
    p.x = spawn.x; p.y = spawn.y; p.z = spawn.z;

    p.conn.send(encode({
      t: S.WELCOME,
      you: p.id,
      name: p.name,
      seed: this.seed,
      time: this.world.time,
      spawn: { x: p.x, y: p.y, z: p.z },
      // Everything this child had when they last played, from whichever device
      // they played on. Null the first time anyone uses a name.
      character: stored,
      // The whole edit set, once. Everything after this is a delta.
      edits: this._allEdits(),
      players: [...this.players.values()].filter((o) => o.joined && o !== p).map(pubPlayer),
      snapHz: SNAP_HZ,
    }));
    this.broadcast({ t: S.JOINED, player: pubPlayer(p) }, p.id);
    this.onLog(`${p.name} joined (${this.players.size} playing)`);
  }

  _onInput(p, m) {
    const inp = cleanInput(m);
    if (!inp) return;
    p.x = inp.x; p.y = inp.y; p.z = inp.z;
    p.yaw = inp.yaw; p.pitch = inp.pitch;
    p.anim = inp.anim; p.sneak = inp.sneak;
  }

  _onEdit(p, m) {
    const e = cleanEdit(m);
    if (!e) return;
    // REACH CHECK. The one server-side rule worth enforcing on a home network:
    // not to stop cheating, but because a client with a stale camera can ask to
    // edit a block on the other side of the map, and that would be a hole
    // appearing in someone else's build with no one nearby to explain it.
    const d = Math.hypot(e.x + 0.5 - p.x, e.z + 0.5 - p.z);
    if (d > 12 || Math.abs(e.y + 0.5 - p.y) > 12) {
      p.conn.send(encode({ t: S.DENIED, reason: 'Too far away to reach that.' }));
      return;
    }
    if (!BLOCKS[e.id]) return;                 // not a block this build knows

    // ENSURE THE CHUNK FIRST. World.setBlock returns silently when the chunk is
    // not resident (js/world/world.js: `const c = this.chunks.get(k); if (!c)
    // return;`) — it does not even record the edit. A player at the edge of the
    // simulated area could therefore break a block, watch it disappear on their
    // own screen where the client applied it optimistically, and have the server
    // never know: the edit would be gone for everyone else and would come back
    // for them on reload. Silent divergence is the worst failure a shared world
    // has, so the chunk is loaded on demand rather than trusted to be there.
    const cx = Math.floor(e.x / CHUNK), cz = Math.floor(e.z / CHUNK);
    const key = `${cx},${cz}`;
    if (!this._resident.has(key)) {
      try { this.world.ensureChunk(cx, cz); this._resident.add(key); }
      catch (err) { this.onLog(`edit chunk ${key} failed: ${err.message}`); return; }
    }

    this.world.setBlock(e.x, e.y, e.z, e.id, true);
    this.pendingEdits.push([e.x, e.y, e.z, e.id]);
    this.dirty = true;
  }

  _onAttack(p, m) {
    const mobId = cleanId(m.id);
    if (!mobId) return;
    const e = this.enemyMgr.entities.get(mobId);
    if (!e || e.hp <= 0) return;
    if (Math.hypot(e.x - p.x, e.z - p.z) > 24) return;   // not from across the map
    p.combat.engage(e, true);
  }

  _onDisengage(p) {
    for (const st of p.combat.engaged.values()) if (st.entity) st.entity.rsEngaged = false;
    p.combat.engaged.clear();
    p.combat.target = null;
  }

  _onChat(p, m) {
    const text = cleanChat(m.text);
    if (!text) return;
    // A simple flood gate. Kids discover key-repeat within about a minute.
    const now = Date.now();
    if (p._chatAt && now - p._chatAt < 400) return;
    p._chatAt = now;
    this.broadcast({ t: S.CHAT, from: p.name, id: p.id, text });
    this.onLog(`<${p.name}> ${text}`);
  }

  // SLEEPING IS A DECISION THE ROOM MAKES, not one a client makes for itself.
  // The clock is shared, so a child who advanced their own night privately would
  // be standing in the morning while everyone else was still in the dark — same
  // world, different time of day, which is exactly what used to happen.
  //
  // ONE SLEEPER IS ENOUGH. Minecraft asks for a majority in bed, which is a good
  // rule among strangers and a miserable one for a family: it means four children
  // have to find four beds before anybody gets a morning. Here the first one to
  // lie down carries the night for everyone, and the others are told who did it
  // so a sudden sunrise is explained rather than mysterious.
  _onSleep(p) {
    if (!this.world.isNight()) {
      p.conn.send(encode({ t: S.DENIED, reason: 'It is not dark yet.' }));
      return;
    }
    const skip = ((DAWN - this.world.dayPhase() + 1) % 1) * DAY_LEN;
    if (skip < 1) return;                      // dawn is already breaking
    this.world.time += skip;
    this.dirty = true;
    this.broadcast({ t: S.SLEPT, by: p.name, time: Math.round(this.world.time) });
    this.onLog(`${p.name} slept the night away`);
  }

  // ---- simulation -----------------------------------------------------------
  tick(dt) {
    this.tickCount++;
    const active = [...this.players.values()].filter((p) => p.joined);

    // Keep the world resident around everyone, so mobs exist where people are.
    this._stream(active);

    // World.update, NOT World.tick. There is no tick() on World, so the optional
    // call this used to make swallowed itself silently and the server's clock sat
    // at zero forever — permanent noon, crops that never ripened, nodes that
    // never came back. Nothing failed loudly because `?.` on a missing method is
    // a no-op, which is the whole hazard of reaching for it.
    this.world.update(dt);
    // Refresh spawn bookkeeping a few times a second rather than every step:
    // it walks every loaded chunk and nothing it does needs 20Hz.
    if (this.tickCount % 6 === 0) this.enemyMgr.refresh();

    // The wander step. EnemyManager.update takes a player only to gate movement
    // during combat, and it never reads its position — so passing null and
    // "nobody is in combat" is correct here, and each player's own CombatRS
    // drives the mobs it has engaged.
    this.enemyMgr.update(dt, null, false);

    for (const p of active) {
      // Aggressive creatures pick their own fights, per player.
      // EACH PLAYER'S COMBAT IS ISOLATED. One bad state must not stop the room:
      // an exception here used to abort the whole tick, which meant every other
      // player's creatures froze because of something that happened in one
      // person's fight.
      try {
        const aggro = this.enemyMgr.checkAggro(p);
        if (aggro) p.combat.engage(aggro, false);
        p.combat.update(dt);
      } catch (err) {
        this.onLog(`combat step failed for ${p.name}: ${err.message}`);
      }
    }
  }

  // Load chunks around each player, and drop the ones nobody is near. Without
  // the eviction half, an afternoon of exploring grows the server's heap until
  // the process dies — on a machine that is also running the household's browser.
  _stream(active) {
    const want = new Set();
    for (const p of active) {
      const pcx = Math.floor(p.x / CHUNK), pcz = Math.floor(p.z / CHUNK);
      for (let dx = -SIM_RADIUS_CHUNKS; dx <= SIM_RADIUS_CHUNKS; dx++) {
        for (let dz = -SIM_RADIUS_CHUNKS; dz <= SIM_RADIUS_CHUNKS; dz++) {
          want.add(`${pcx + dx},${pcz + dz}`);
        }
      }
    }
    for (const key of want) {
      if (this._resident.has(key)) continue;
      const [cx, cz] = key.split(',').map(Number);
      try { this.world.ensureChunk(cx, cz); this._resident.add(key); }
      catch (err) { this.onLog(`chunk ${key} failed: ${err.message}`); }
    }
    for (const key of this._resident) {
      if (want.has(key)) continue;
      this._resident.delete(key);
      // The world keeps player edits in its own map (editedBlocks), so dropping
      // a chunk loses generated terrain only — it regenerates identically.
      this.world.chunks.delete(key);
    }
  }

  // ---- outbound -------------------------------------------------------------
  snapshot() {
    const active = [...this.players.values()].filter((p) => p.joined);
    if (!active.length) { this.pendingEdits.length = 0; return; }

    const players = active.map(pubPlayer);
    const edits = this.pendingEdits.length ? this.pendingEdits.slice() : null;
    this.pendingEdits.length = 0;

    for (const p of active) {
      const mobs = [];
      for (const e of this.enemyMgr.entities.values()) {
        if (Math.abs(e.x - p.x) > MOB_VIEW || Math.abs(e.z - p.z) > MOB_VIEW) continue;
        mobs.push({
          id: e.id, type: e.type,
          x: r2(e.x), y: r2(e.y), z: r2(e.z), yaw: r2(e.yaw),
          hp: Math.max(0, Math.round(e.hp)), max: e.def.hp,
          moving: (e.movingT ?? 0) > 0,
          shiny: !!e.shiny, boss: !!e.boss,
        });
      }
      p.conn.send(encode({
        t: S.SNAPSHOT,
        time: Math.round(this.world.time),
        players: players.filter((o) => o.id !== p.id),
        mobs,
      }));
      if (edits) p.conn.send(encode({ t: S.EDITS, list: edits }));
      const gains = this._xpDelta(p);
      if (gains) this._combatEvent(p.id, { k: 'xp', gains });
      const events = this.combatOut.get(p.id);
      if (events && events.length) {
        p.conn.send(encode({ t: S.COMBAT, events }));
        events.length = 0;
      }
    }
  }

  broadcast(msg, exceptId = null) {
    const str = encode(msg);
    for (const p of this.players.values()) {
      if (p.id === exceptId || !p.joined) continue;
      p.conn.send(str);
    }
  }

  // ---- helpers --------------------------------------------------------------
  _combatEvent(playerId, ev) {
    if (!this.combatOut.has(playerId)) this.combatOut.set(playerId, []);
    const q = this.combatOut.get(playerId);
    // A stuck client must not grow this without bound.
    if (q.length < 64) q.push(ev);
  }

  // Route one player's combat events. Most are private (your XP, your log line);
  // a death is public, because the creature is gone for everyone.
  _combatEmit(p, evt, payload) {
    switch (evt) {
      case 'rsLog':
        this._combatEvent(p.id, { k: 'log', text: String(payload) });
        break;
      case 'combatBanner':
        this._combatEvent(p.id, { k: 'banner', text: String(payload) });
        break;
      case 'rsPlayerHit':
        this._combatEvent(p.id, { k: 'hurt', dmg: payload?.dmg ?? 0 });
        break;
      case 'combatEnd':
        // Everyone needs to know the mob is dead; only the killer needs the loot.
        // A kill also carries a respawn timer, which is worth keeping across a
        // restart — otherwise stopping the server resurrects the boss.
        this.dirty = true;
        this.broadcast({ t: S.COMBAT, events: [{ k: 'died', ids: payload?.ids || [], by: p.name }] });
        this._combatEvent(p.id, { k: 'loot', loot: payload?.loot || [], coins: payload?.coins || 0 });
        break;
      default:
        break;   // rsTick / rsUpdate / rsAttack are UI-local; the client re-derives them
    }
  }

  _allEdits() {
    const out = [];
    for (const [key, edits] of this.world.editedBlocks) {
      const [cx, cz] = key.split(',').map(Number);
      for (const [idx, id] of edits) {
        // Unpack the world's chunk-local index back into world coordinates.
        const lx = idx % CHUNK;
        const y = Math.floor(idx / (CHUNK * CHUNK));
        const lz = Math.floor(idx / CHUNK) % CHUNK;
        out.push([cx * CHUNK + lx, y, cz * CHUNK + lz, id]);
      }
    }
    return out;
  }

  // Two children called "Sam" is not a hypothetical.
  _uniqueName(name) {
    const taken = new Set([...this.players.values()].map((o) => o.name));
    if (!taken.has(name)) return name;
    for (let i = 2; i < 100; i++) {
      const tryName = `${name} ${i}`;
      if (!taken.has(tryName)) return tryName;
    }
    return name;
  }
}

const r2 = (n) => Math.round(n * 100) / 100;

function pubPlayer(p) {
  return {
    id: p.id, name: p.name,
    x: r2(p.x), y: r2(p.y), z: r2(p.z),
    yaw: r2(p.yaw), pitch: r2(p.pitch),
    anim: p.anim, sneak: p.sneak, hp: p.hp,
  };
}
