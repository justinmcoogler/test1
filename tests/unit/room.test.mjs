// The authoritative room (server/room.mjs), driven directly with stub sockets.
//
// Everything here is about what the server does with what a client SAYS, which
// is the part that has to be right whether or not the transport is involved.
// The socket layer has its own tests (net.test.mjs) and the two meeting for real
// is tests/multiplayer.mjs; this file is the rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../../server/room.mjs';
import { C, S, PROTOCOL_VERSION, encode, decode, MAX_NAME } from '../../js/net/protocol.mjs';

// A connection that remembers what it was told instead of writing to a socket.
const stubConn = () => ({
  sent: [], alive: true, closed: null,
  send(str) { this.sent.push(decode(str)); return true; },
  close(code, reason) { this.closed = { code, reason }; },
  msgs(type) { return this.sent.filter((m) => m && m.t === type); },
  last(type) { const m = this.msgs(type); return m[m.length - 1] || null; },
});

// Join a player and hand back { room, conn, player } ready to act.
function seat(room, id, name) {
  const conn = stubConn();
  const p = room.join(conn, id);
  room.handle(id, encode({ t: C.JOIN, name, version: PROTOCOL_VERSION }));
  return { conn, p };
}

const newRoom = () => new Room({ seed: 'roomtest' });

test('joining hands back the seed, your identity and the world so far', () => {
  const room = newRoom();
  const { conn, p } = seat(room, 'a', 'Ada');
  const w = conn.last(S.WELCOME);
  assert.ok(w, 'a welcome arrives');
  assert.equal(w.you, 'a');
  assert.equal(w.seed, 'roomtest', 'the seed is the whole of the terrain contract');
  assert.equal(w.name, 'Ada');
  assert.ok(Array.isArray(w.edits), 'and the edit set, which is the rest of it');
  assert.ok(Number.isFinite(w.spawn.x) && Number.isFinite(w.spawn.y));
  assert.equal(p.joined, true);
});

test('a stale client is turned away with something a person can act on', () => {
  const room = newRoom();
  const conn = stubConn();
  room.join(conn, 'a');
  room.handle('a', encode({ t: C.JOIN, name: 'Ada', version: PROTOCOL_VERSION + 99 }));
  const d = conn.last(S.DENIED);
  assert.ok(d, 'it is refused');
  assert.match(d.reason, /[Rr]eload/, 'and told how to fix it, not just that it failed');
  assert.ok(conn.closed, 'and the socket is closed rather than left half-joined');
});

test('nothing but a join is accepted before joining', () => {
  const room = newRoom();
  const conn = stubConn();
  const p = room.join(conn, 'a');
  p.x = 0; p.y = 80; p.z = 0;
  room.handle('a', encode({ t: C.EDIT, x: 1, y: 80, z: 1, id: 1 }));
  room.handle('a', encode({ t: C.CHAT, text: 'hello' }));
  assert.equal(room.pendingEdits.length, 0, 'an un-joined client cannot edit the world');
  assert.equal(conn.msgs(S.CHAT).length, 0);
});

test('players are told about each other, arriving and leaving', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  const b = seat(room, 'b', 'Bea');
  const joined = a.conn.last(S.JOINED);
  assert.equal(joined?.player?.name, 'Bea', 'Ada is told Bea arrived');
  assert.equal(joined.player.id, 'b');
  // Bea's welcome already listed Ada, so she does not need a JOINED for her.
  assert.deepEqual(b.conn.last(S.WELCOME).players.map((o) => o.name), ['Ada']);
  room.leave('b');
  assert.equal(a.conn.last(S.LEFT)?.id, 'b');
});

test('two children called Sam both get a name', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Sam');
  const b = seat(room, 'b', 'Sam');
  assert.equal(a.conn.last(S.WELCOME).name, 'Sam');
  assert.equal(b.conn.last(S.WELCOME).name, 'Sam 2', 'the second is distinguished, not rejected');
  assert.ok(b.conn.last(S.WELCOME).name.length <= MAX_NAME + 4);
});

test('an edit within reach lands; one across the map is refused with a reason', () => {
  const room = newRoom();
  const { conn, p } = seat(room, 'a', 'Ada');
  p.x = 0; p.y = 80; p.z = 0;

  room.handle('a', encode({ t: C.EDIT, x: 2, y: 80, z: 2, id: 1 }));
  assert.equal(room.pendingEdits.length, 1, 'a block at arm’s length is placed');
  assert.deepEqual(room.pendingEdits[0], [2, 80, 2, 1]);
  assert.equal(room.world.getBlock(2, 80, 2), 1, 'and the server world actually changed');

  room.handle('a', encode({ t: C.EDIT, x: 900, y: 80, z: 900, id: 1 }));
  assert.equal(room.pendingEdits.length, 1, 'a block 900 away is not');
  assert.match(conn.last(S.DENIED).reason, /far/);

  // Junk is dropped silently — there is nothing useful to tell the player.
  room.handle('a', encode({ t: C.EDIT, x: 'over there', y: 80, z: 2, id: 1 }));
  room.handle('a', encode({ t: C.EDIT, x: 2, y: 80, z: 2, id: 999999 }));
  assert.equal(room.pendingEdits.length, 1);
});

test('edits reach the other players, and only once', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  const b = seat(room, 'b', 'Bea');
  a.p.x = 0; a.p.y = 80; a.p.z = 0;
  b.p.x = 4; b.p.y = 80; b.p.z = 0;
  room.handle('a', encode({ t: C.EDIT, x: 1, y: 80, z: 1, id: 1 }));
  room.snapshot();
  assert.deepEqual(b.conn.last(S.EDITS).list, [[1, 80, 1, 1]]);
  assert.deepEqual(a.conn.last(S.EDITS).list, [[1, 80, 1, 1]], 'the editor is told too, so it can reconcile');
  const before = b.conn.msgs(S.EDITS).length;
  room.snapshot();
  assert.equal(b.conn.msgs(S.EDITS).length, before, 'a second snapshot does not resend them');
});

test('an edit made before you arrived is in your welcome', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  a.p.x = 0; a.p.y = 80; a.p.z = 0;
  room.handle('a', encode({ t: C.EDIT, x: 3, y: 80, z: 3, id: 1 }));
  const b = seat(room, 'b', 'Bea');
  const edits = b.conn.last(S.WELCOME).edits;
  assert.ok(edits.some(([x, y, z, id]) => x === 3 && y === 80 && z === 3 && id === 1),
    'the world Bea generates from the seed is then patched to match');
});

test('chat is relayed, cleaned, and rate limited', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  const b = seat(room, 'b', 'Bea');
  room.handle('a', encode({ t: C.CHAT, text: '  hello   there  ' }));
  const msg = b.conn.last(S.CHAT);
  assert.equal(msg.text, 'hello there');
  assert.equal(msg.from, 'Ada');
  // Key-repeat is discovered within about a minute of a child sitting down.
  room.handle('a', encode({ t: C.CHAT, text: 'spam' }));
  room.handle('a', encode({ t: C.CHAT, text: 'spam' }));
  assert.equal(b.conn.msgs(S.CHAT).length, 1, 'the flood gate holds');
  // An empty line is not a message.
  assert.equal(a.conn.msgs(S.CHAT).length, 1);
});

test('snapshots carry the other players but never you', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  const b = seat(room, 'b', 'Bea');
  room.handle('a', encode({ t: C.INPUT, x: 5, y: 80, z: 6, yaw: 1.5, anim: 'walk' }));
  room.snapshot();
  const snap = b.conn.last(S.SNAPSHOT);
  assert.equal(snap.players.length, 1);
  assert.equal(snap.players[0].name, 'Ada');
  assert.equal(snap.players[0].x, 5);
  assert.equal(snap.players[0].anim, 'walk');
  assert.ok(Array.isArray(snap.mobs));
  assert.equal(a.conn.last(S.SNAPSHOT).players.find((o) => o.id === 'a'), undefined,
    'you are not sent your own position back');
});

test('garbage input cannot move you somewhere impossible', () => {
  const room = newRoom();
  const { p } = seat(room, 'a', 'Ada');
  room.handle('a', encode({ t: C.INPUT, x: NaN, y: 1e12, z: 'over there', yaw: Infinity }));
  for (const k of ['x', 'y', 'z', 'yaw', 'pitch']) {
    assert.ok(Number.isFinite(p[k]), `${k} stayed finite (${p[k]})`);
  }
});

test('a malformed or unknown message is ignored rather than fatal', () => {
  const room = newRoom();
  seat(room, 'a', 'Ada');
  for (const raw of ['', 'not json', '{}', '[]', encode({ t: 'drop_database' }),
    encode({ t: C.ATTACK }), encode({ t: C.ATTACK, id: 'no_such_mob' })]) {
    assert.doesNotThrow(() => room.handle('a', raw), `"${String(raw).slice(0, 24)}" is survivable`);
  }
  assert.doesNotThrow(() => room.handle('nobody', encode({ t: C.CHAT, text: 'hi' })));
});

test('leaving mid-fight releases the creature rather than freezing it', () => {
  // An entity with rsEngaged set is skipped by the wander loop, so a guest who
  // closes the tab would otherwise leave that goblin standing still forever.
  const room = newRoom();
  const { p } = seat(room, 'a', 'Ada');
  const mob = { id: 'm1', type: 'rat', def: { hp: 10, label: 'Rat', respawn: 60 }, hp: 10, x: 0, y: 80, z: 0 };
  room.enemyMgr.entities.set('m1', mob);
  p.x = 0; p.y = 80; p.z = 0;
  room.handle('a', encode({ t: C.ATTACK, id: 'm1' }));
  assert.equal(mob.rsEngaged, true, 'the fight started');
  room.leave('a');
  assert.equal(mob.rsEngaged, false, 'and ended when the player vanished');
});

test('a kill is announced to everyone, and the loot only to the killer', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  const b = seat(room, 'b', 'Bea');
  // Drive the routing directly: what matters is who hears what, not the maths
  // of the swing that got there.
  room._combatEmit(a.p, 'combatEnd', { ids: ['m1'], loot: [{ item: 'sinew', qty: 2 }], coins: 5 });
  const died = b.conn.last(S.COMBAT)?.events?.find((e) => e.k === 'died');
  assert.ok(died, 'Bea is told the creature is gone — it is gone for her too');
  assert.deepEqual(died.ids, ['m1']);
  assert.equal(died.by, 'Ada');
  room.snapshot();
  const mine = a.conn.last(S.COMBAT).events;
  assert.ok(mine.some((e) => e.k === 'loot' && e.coins === 5), 'Ada gets the loot');
  const hers = b.conn.msgs(S.COMBAT).flatMap((m) => m.events);
  assert.equal(hers.some((e) => e.k === 'loot'), false, 'Bea does not');
});

test('one player’s combat log does not land on another’s screen', () => {
  // The reason CombatRS takes an injectable emitter: on the module-global bus
  // every instance would shout into the same room.
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  const b = seat(room, 'b', 'Bea');
  room._combatEmit(a.p, 'rsLog', 'You miss the Rat.');
  room._combatEmit(a.p, 'rsPlayerHit', { dmg: 3 });
  room.snapshot();
  const mine = a.conn.last(S.COMBAT).events;
  assert.ok(mine.some((e) => e.k === 'log' && /miss/.test(e.text)));
  assert.ok(mine.some((e) => e.k === 'hurt' && e.dmg === 3));
  assert.equal(b.conn.last(S.COMBAT), null, 'Bea heard none of it');
});

test('the event queue for a stuck client cannot grow without bound', () => {
  const room = newRoom();
  const a = seat(room, 'a', 'Ada');
  for (let i = 0; i < 500; i++) room._combatEmit(a.p, 'rsLog', `line ${i}`);
  assert.ok(room.combatOut.get('a').length <= 64, 'it is capped');
});

test('the sim runs, and mobs live where the players are', () => {
  const room = newRoom();
  const { p } = seat(room, 'a', 'Ada');
  for (let i = 0; i < 20; i++) room.tick(0.05);
  assert.ok(room._resident.size > 0, 'chunks are resident around the player');
  // Walk a long way and the far chunks are dropped, or an afternoon of exploring
  // grows the server heap until the process dies.
  const before = room._resident.size;
  p.x = 4000; p.z = 4000;
  for (let i = 0; i < 20; i++) room.tick(0.05);
  assert.ok(room._resident.size <= before + 4, `resident set stayed bounded (${before} then ${room._resident.size})`);
  for (const key of room._resident) {
    const [cx] = key.split(',').map(Number);
    assert.ok(cx > 100, 'and what is resident is where the player now is');
  }
});
