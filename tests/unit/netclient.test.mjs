// The browser end of multiplayer (js/net/client.js), driven with a fake socket.
//
// The interesting behaviour is all in what happens BETWEEN packets: snapshots
// land ten times a second and the game draws sixty, so the smoothing is not a
// nicety, it is the difference between other players walking and other players
// teleporting. That is what most of this file is about.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NetClient } from '../../js/net/client.js';
import { S, C, PROTOCOL_VERSION, encode } from '../../js/net/protocol.js';

// A stand-in for the browser's WebSocket: records what was sent and lets a test
// deliver messages by hand.
class FakeSocket {
  constructor() { this.sent = []; this.readyState = 1; this.listeners = {}; FakeSocket.last = this; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  send(str) { this.sent.push(JSON.parse(str)); }
  close() { this.readyState = 3; this.fire('close', {}); }
  fire(type, ev) { for (const fn of this.listeners[type] || []) fn(ev); }
  deliver(msg) { this.fire('message', { data: encode(msg) }); }
  msgs(t) { return this.sent.filter((m) => m.t === t); }
}

// Stand up a joined client without a real network.
async function joined(welcome = {}) {
  global.WebSocket = FakeSocket;
  global.location = { protocol: 'http:', host: 'localhost:8080' };
  const net = new NetClient({ name: 'Ada' });
  const p = net.connect();
  const sock = FakeSocket.last;
  sock.fire('open', {});
  sock.deliver({
    t: S.WELCOME, you: 'a', name: 'Ada', seed: 'test', time: 0,
    spawn: { x: 1, y: 80, z: 2 }, edits: [], players: [], snapHz: 10, ...welcome,
  });
  await p;
  return { net, sock };
}

test('connecting announces itself and resolves with the world to build', async () => {
  const { net, sock } = await joined();
  const join = sock.msgs(C.JOIN)[0];
  assert.equal(join.name, 'Ada');
  assert.equal(join.version, PROTOCOL_VERSION, 'the version is sent so a stale client is told, not left guessing');
  assert.equal(net.live, true);
  assert.equal(net.seed, 'test', 'the seed is what the whole terrain contract rests on');
  assert.deepEqual(net.spawn, { x: 1, y: 80, z: 2 });
  assert.equal(net.id, 'a');
});

test('a refusal rejects with something worth showing a person', async () => {
  global.WebSocket = FakeSocket;
  global.location = { protocol: 'http:', host: 'localhost:8080' };
  const net = new NetClient({ name: 'Ada' });
  const p = net.connect();
  const sock = FakeSocket.last;
  sock.fire('open', {});
  sock.deliver({ t: S.DENIED, reason: 'Reload the page to pick up the current build.' });
  await assert.rejects(p, /Reload the page/);
  assert.equal(net.live, false);
});

test('the socket URL follows the page, so there is nothing to configure', async () => {
  global.WebSocket = FakeSocket;
  global.location = { protocol: 'https:', host: '192.168.1.20:8080' };
  const net = new NetClient({ name: 'Ada' });
  assert.equal(net.url, 'wss://192.168.1.20:8080/ws', 'https pages must use wss or the browser blocks it');
  global.location = { protocol: 'http:', host: 'localhost:8080' };
  assert.equal(new NetClient({}).url, 'ws://localhost:8080/ws');
});

test('input is throttled, and silence is sent as silence', async () => {
  const { net, sock } = await joined();
  const p = { x: 0, y: 80, z: 0, yaw: 0, pitch: 0, anim: 'idle' };
  net.sendInput(p, 0);
  assert.equal(sock.msgs(C.INPUT).length, 1, 'the first frame sends');
  // Sixty frames a second must not be sixty packets a second.
  for (let t = 1; t < 90; t++) net.sendInput({ ...p, x: t * 0.01 }, t);
  assert.ok(sock.msgs(C.INPUT).length <= 2, `throttled to the snapshot rate (${sock.msgs(C.INPUT).length} sent)`);
  // Standing still says nothing at all, rather than repeating a position the
  // server already has.
  const before = sock.msgs(C.INPUT).length;
  for (let t = 200; t < 2000; t += 100) net.sendInput(p, t);
  assert.equal(sock.msgs(C.INPUT).length, before,
    'a player standing in a menu is silent on the wire');

  // But moving and THEN stopping must send once, or everyone else sees you
  // frozen at the last place a throttle window happened to catch you.
  net.sendInput({ ...p, x: 9 }, 5000);
  const moved = sock.msgs(C.INPUT).length;
  assert.equal(moved, before + 1, 'the new position goes out');
  for (let t = 5100; t < 6000; t += 100) net.sendInput({ ...p, x: 9 }, t);
  assert.equal(sock.msgs(C.INPUT).length, moved, 'and then silence again');
});

test('a remote player eases toward where the server said, rather than jumping', async () => {
  const { net, sock } = await joined();
  sock.deliver({ t: S.JOINED, player: { id: 'b', name: 'Bea', x: 0, y: 80, z: 0, yaw: 0, anim: 'idle' } });
  const bea = net.players.get('b');
  assert.ok(bea, 'the arrival is in the roster');
  assert.equal(bea.x, 0);

  sock.deliver({ t: S.SNAPSHOT, players: [{ id: 'b', name: 'Bea', x: 4, y: 80, z: 0, yaw: 0, anim: 'walk' }], mobs: [] });
  assert.equal(bea.tx, 4, 'the target moves immediately');
  assert.equal(bea.x, 0, 'the drawn position does not');
  net.update(1 / 60);
  assert.ok(bea.x > 0 && bea.x < 4, `it eases between them (${bea.x.toFixed(2)})`);
  for (let i = 0; i < 120; i++) net.update(1 / 60);
  assert.ok(Math.abs(bea.x - 4) < 0.01, 'and arrives');
  assert.equal(bea.anim, 'walk', 'the animation tag comes through');
});

test('yaw takes the short way round', async () => {
  // Easing the raw number spins a body a full turn the wrong way whenever it
  // crosses ±π, which on a player circling you is most of the time.
  const { net, sock } = await joined();
  sock.deliver({ t: S.JOINED, player: { id: 'b', name: 'Bea', x: 0, y: 80, z: 0, yaw: 3.0, anim: 'idle' } });
  const bea = net.players.get('b');
  sock.deliver({ t: S.SNAPSHOT, players: [{ id: 'b', name: 'Bea', x: 0, y: 80, z: 0, yaw: -3.0, anim: 'idle' }], mobs: [] });
  net.update(1 / 60);
  assert.ok(bea.yaw > 3.0, `it turns forward through pi (${bea.yaw.toFixed(3)}), not back through zero`);
});

test('a teleport is a teleport, not a sprint across the map', async () => {
  // Waystones and lesson worlds move a player hundreds of blocks at once.
  const { net, sock } = await joined();
  sock.deliver({ t: S.JOINED, player: { id: 'b', name: 'Bea', x: 0, y: 80, z: 0, yaw: 0, anim: 'idle' } });
  const bea = net.players.get('b');
  sock.deliver({ t: S.SNAPSHOT, players: [{ id: 'b', name: 'Bea', x: 900, y: 80, z: 900, yaw: 0, anim: 'idle' }], mobs: [] });
  assert.equal(bea.x, 900, 'it snaps');
});

test('a player missing from a snapshot is gone', async () => {
  const { net, sock } = await joined();
  sock.deliver({ t: S.JOINED, player: { id: 'b', name: 'Bea', x: 0, y: 80, z: 0, yaw: 0, anim: 'idle' } });
  assert.equal(net.players.size, 1);
  sock.deliver({ t: S.SNAPSHOT, players: [], mobs: [] });
  assert.equal(net.players.size, 0, 'the server sends the full roster, so absence is authoritative');
});

test('mobs mirror the server, appearing and disappearing with it', async () => {
  const { net, sock } = await joined();
  sock.deliver({
    t: S.SNAPSHOT,
    players: [],
    mobs: [{ id: 'm1', type: 'rat', x: 1, y: 80, z: 1, yaw: 0, hp: 8, max: 10, moving: true }],
  });
  const rat = net.mobs.get('m1');
  assert.ok(rat);
  assert.equal(rat.hp, 8, 'health is shared — this is the whole point of an authoritative server');
  sock.deliver({ t: S.SNAPSHOT, players: [], mobs: [{ id: 'm1', type: 'rat', x: 3, y: 80, z: 1, yaw: 0, hp: 2, max: 10 }] });
  assert.equal(rat.hp, 2, 'damage another player did shows up here');
  assert.equal(rat.tx, 3);
  sock.deliver({ t: S.SNAPSHOT, players: [], mobs: [] });
  assert.equal(net.mobs.size, 0, 'and a kill removes it');
});

test('edits and combat events are handed straight to the game', async () => {
  const edits = [];
  const combat = [];
  global.WebSocket = FakeSocket;
  global.location = { protocol: 'http:', host: 'localhost:8080' };
  const net = new NetClient({ name: 'Ada', onEdits: (l) => edits.push(...l), onCombat: (e) => combat.push(...e) });
  const p = net.connect();
  const sock = FakeSocket.last;
  sock.fire('open', {});
  sock.deliver({ t: S.WELCOME, you: 'a', name: 'Ada', seed: 't', spawn: { x: 0, y: 0, z: 0 }, edits: [], players: [] });
  await p;
  sock.deliver({ t: S.EDITS, list: [[1, 2, 3, 4]] });
  assert.deepEqual(edits, [[1, 2, 3, 4]]);
  sock.deliver({ t: S.COMBAT, events: [{ k: 'died', ids: ['m1'], by: 'Bea' }] });
  assert.equal(combat[0].k, 'died');
});

test('chat is kept, bounded, and announced', async () => {
  const heard = [];
  global.WebSocket = FakeSocket;
  global.location = { protocol: 'http:', host: 'localhost:8080' };
  const net = new NetClient({ name: 'Ada', onChat: (c) => heard.push(c) });
  const p = net.connect();
  const sock = FakeSocket.last;
  sock.fire('open', {});
  sock.deliver({ t: S.WELCOME, you: 'a', name: 'Ada', seed: 't', spawn: { x: 0, y: 0, z: 0 }, edits: [], players: [] });
  await p;
  for (let i = 0; i < 100; i++) sock.deliver({ t: S.CHAT, from: 'Bea', text: `line ${i}` });
  assert.ok(net.chatLog.length <= 60, 'the backlog cannot grow forever');
  assert.equal(net.chatLog.at(-1).text, 'line 99');
  sock.deliver({ t: S.JOINED, player: { id: 'c', name: 'Cy', x: 0, y: 0, z: 0, yaw: 0 } });
  assert.ok(heard.some((c) => c.system && /Cy joined/.test(c.text)), 'arrivals are announced in the log');
});

test('sending anything after the socket drops is a no-op, not a crash', async () => {
  const { net, sock } = await joined();
  sock.readyState = 3;
  assert.equal(net.sendEdit(1, 2, 3, 4), false);
  assert.equal(net.sendChat('hello'), false);
  assert.doesNotThrow(() => net.sendInput({ x: 0, y: 0, z: 0, yaw: 0 }, 99999));
});

test('a drop after joining tells the game, so it can say so', async () => {
  let closed = false;
  global.WebSocket = FakeSocket;
  global.location = { protocol: 'http:', host: 'localhost:8080' };
  const net = new NetClient({ name: 'Ada', onClose: () => { closed = true; } });
  const p = net.connect();
  const sock = FakeSocket.last;
  sock.fire('open', {});
  sock.deliver({ t: S.WELCOME, you: 'a', name: 'Ada', seed: 't', spawn: { x: 0, y: 0, z: 0 }, edits: [], players: [] });
  await p;
  sock.close();
  assert.equal(closed, true);
  assert.equal(net.live, false);
});
