// The multiplayer transport and wire protocol.
//
// Two things are worth testing here and they are both "can a client break the
// server". The frame codec is hand-written against RFC 6455 (server/ws.mjs) so
// it has to survive malformed input, and the protocol sanitisers are the only
// thing standing between a child with the devtools console open and everyone
// else's session.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeFrame, decodeFrame, acceptKey } from '../../server/ws.mjs';
import {
  cleanName, cleanChat, cleanEdit, cleanInput, cleanId, decode, encode,
  MAX_NAME, MAX_CHAT, Y_MAX,
} from '../../js/net/protocol.mjs';

// Build a client->server frame, which unlike a server frame MUST be masked.
function clientFrame(op, payload, { fin = true, mask = [1, 2, 3, 4] } = {}) {
  const body = Buffer.from(payload);
  const len = body.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = 0x80 | len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 0x80 | 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 0x80 | 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6); }
  head[0] = (fin ? 0x80 : 0) | op;
  const m = Buffer.from(mask);
  const masked = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) masked[i] = body[i] ^ m[i & 3];
  return Buffer.concat([head, m, masked]);
}

// ---- the handshake ----------------------------------------------------------
test('the handshake accept key matches the value in RFC 6455', () => {
  // The worked example from the RFC itself. If this drifts, no browser connects.
  assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

// ---- framing ----------------------------------------------------------------
test('a frame survives a round trip at each length encoding', () => {
  // 125 / 126 / 65536 are the boundaries where the length field changes width,
  // which is exactly where a hand-rolled codec goes wrong.
  for (const len of [0, 1, 125, 126, 127, 65535, 65536, 70000]) {
    const payload = Buffer.alloc(len, 0x61);
    const wire = clientFrame(0x1, payload);
    const got = decodeFrame(wire);
    assert.ok(got, `len ${len} decoded`);
    assert.equal(got.op, 0x1);
    assert.equal(got.fin, true);
    assert.equal(got.payload.length, len, `len ${len} payload`);
    assert.equal(got.size, wire.length, `len ${len} consumed the whole frame`);
    assert.ok(got.payload.equals(payload), `len ${len} bytes intact`);
  }
});

test('a partial frame decodes to null rather than throwing or guessing', () => {
  // Frames straddle TCP segments constantly. Every prefix must simply ask for
  // more bytes — this is the single most load-bearing property of the codec.
  const wire = clientFrame(0x1, 'hello multiplayer');
  for (let i = 0; i < wire.length; i++) {
    assert.equal(decodeFrame(wire.subarray(0, i)), null, `prefix of ${i} bytes waits`);
  }
  assert.ok(decodeFrame(wire), 'and the whole frame decodes');
});

test('two frames in one read are decoded one at a time', () => {
  const a = clientFrame(0x1, 'first');
  const b = clientFrame(0x1, 'second');
  const both = Buffer.concat([a, b]);
  const f1 = decodeFrame(both);
  assert.equal(f1.payload.toString(), 'first');
  assert.equal(f1.size, a.length);
  const f2 = decodeFrame(both.subarray(f1.size));
  assert.equal(f2.payload.toString(), 'second');
});

test('the codec rejects what it must reject', () => {
  // Unmasked client frame: either a broken client or not a browser at all.
  const unmasked = Buffer.from([0x81, 0x02, 0x68, 0x69]);
  assert.throws(() => decodeFrame(unmasked), /not masked/);

  // Reserved bits imply an extension we never negotiated.
  const rsv = clientFrame(0x1, 'x');
  rsv[0] |= 0x40;
  assert.throws(() => decodeFrame(rsv), /reserved/);

  // Control frames are never fragmented and never over 125 bytes.
  const bigPing = clientFrame(0x9, Buffer.alloc(200));
  assert.throws(() => decodeFrame(bigPing), /control frame/);
  const fragPing = clientFrame(0x9, 'x', { fin: false });
  assert.throws(() => decodeFrame(fragPing), /control frame/);

  // A declared length beyond what we will ever buffer is refused up front,
  // rather than by trying to allocate it.
  const huge = Buffer.alloc(14);
  huge[0] = 0x81; huge[1] = 0x80 | 127;
  huge.writeUInt32BE(0, 2); huge.writeUInt32BE(0xffffffff, 6);
  assert.throws(() => decodeFrame(huge), /too large/);
});

test('server frames go out unmasked, with FIN set', () => {
  const wire = encodeFrame(0x1, Buffer.from('hi'));
  assert.equal(wire[0], 0x81, 'FIN + text opcode');
  assert.equal(wire[1] & 0x80, 0, 'server frames are never masked');
  assert.equal(wire.subarray(2).toString(), 'hi');
});

// ---- protocol sanitisers ----------------------------------------------------
test('a name is always printable, bounded and non-empty', () => {
  assert.equal(cleanName('  Ada   Lovelace  '), 'Ada Lovelace');
  assert.equal(cleanName(''), 'Player', 'an empty name still has to render');
  assert.equal(cleanName(null), 'Player');
  assert.equal(cleanName(undefined), 'Player');
  assert.equal(cleanName('   '), 'Player');
  assert.ok(cleanName('x'.repeat(500)).length <= MAX_NAME, 'and it cannot be a wall of text');
  // Control characters would corrupt another player's nameplate. They become
  // whitespace rather than vanishing, so a newline still separates two words.
  assert.equal(cleanName('Ada\u0007Lovelace'), 'Ada Lovelace');
  assert.equal(cleanName('a\nb'), 'a b', 'newlines separate rather than vanish');
});

test('chat is bounded, and an empty line is not a message', () => {
  assert.equal(cleanChat('hello'), 'hello');
  assert.equal(cleanChat('   '), null, 'whitespace-only is dropped, not broadcast');
  assert.equal(cleanChat(''), null);
  assert.equal(cleanChat('x'.repeat(9999)).length, MAX_CHAT);
  assert.equal(cleanChat('a\u0000b'), 'a b');
  assert.equal(cleanChat('one\ntwo'), 'one two', 'chat is one line');
});

test('an edit is integer, in bounds, or rejected outright', () => {
  assert.deepEqual(cleanEdit({ x: 3, y: 10, z: -2.7, id: 5 }), { x: 3, y: 10, z: -2, id: 5 });
  // Y is clamped to the build range rather than refused — a legitimate client
  // near the roof should not have its edit thrown away over a rounding error.
  assert.equal(cleanEdit({ x: 0, y: 1e9, z: 0, id: 1 }).y, Y_MAX);
  // …but anything that is not a number at all is refused.
  for (const bad of [{ x: 'a', y: 0, z: 0, id: 1 }, { x: NaN, y: 0, z: 0, id: 1 },
    { x: 0, y: 0, z: 0, id: 'stone' }, { x: 0, y: 0, z: 0 }, null, undefined]) {
    assert.equal(cleanEdit(bad), null, `${JSON.stringify(bad)} is refused`);
  }
});

test('input is always finite, whatever arrives', () => {
  const m = cleanInput({ x: NaN, y: 9e9, z: undefined, yaw: 1, pitch: 'up', anim: 123 });
  for (const k of ['x', 'y', 'z', 'yaw', 'pitch']) {
    assert.ok(Number.isFinite(m[k]), `${k} is finite (${m[k]})`);
  }
  assert.equal(m.y, Y_MAX, 'out-of-range height clamps into the world');
  assert.equal(m.anim, 'idle', 'a non-string animation tag falls back');
  assert.equal(m.sneak, false);
  assert.equal(cleanInput(null), null);
  assert.equal(cleanInput({ anim: 'x'.repeat(99) }).anim.length, 12);
});

test('decode never throws, whatever it is handed', () => {
  for (const bad of ['', 'not json', '{', '[]', 'null', '"a string"', '{"no":"type"}',
    'x'.repeat(2_000_000)]) {
    assert.equal(decode(bad), null, `${bad.slice(0, 20)} is not a message`);
  }
  assert.deepEqual(decode(encode({ t: 'join', name: 'Ada' })), { t: 'join', name: 'Ada' });
  assert.equal(cleanId(''), null);
  assert.equal(cleanId('sp:1,2'), 'sp:1,2');
  assert.equal(cleanId(7), null);
});
