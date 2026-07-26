// A WebSocket server in about two hundred lines, because this project ships zero
// runtime dependencies and that is not a rule worth breaking for a LAN game.
//
// Node has a built-in WebSocket CLIENT (globalThis.WebSocket) but no server, so
// the handshake and the frame codec are here. This implements the parts of
// RFC 6455 a browser actually uses against a trusted local server:
//
//   - the Sec-WebSocket-Accept handshake
//   - text and binary data frames, including CONTINUATION fragments
//   - ping/pong (we answer pings; we send them as a liveness check)
//   - close, with the code echoed back
//
// What it deliberately does NOT implement: extensions (permessage-deflate is
// never negotiated — we simply do not offer it, and a browser will not use what
// it was not granted), and subprotocols. Both are optional and neither is worth
// the surface area for a game on your own wifi.
import { createHash, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';

// The magic string is from the RFC. It exists so a caching proxy that replays a
// stale response cannot accidentally look like a successful handshake.
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const OP_CONT = 0x0, OP_TEXT = 0x1, OP_BIN = 0x2;
const OP_CLOSE = 0x8, OP_PING = 0x9, OP_PONG = 0xa;

// A single message is capped so a malformed or hostile client cannot ask the
// server to buffer the whole heap. Game messages are a few hundred bytes; the
// welcome payload with a large edit set is the only big one, and it is outbound.
const MAX_MESSAGE = 4 * 1024 * 1024;

export function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

// One connected client. Emits 'message' (string), 'close', 'error'.
export class WSConnection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.open = true;
    this.alive = true;
    this._buf = Buffer.alloc(0);
    // Fragment assembly: a message can arrive as FIN=0 frames followed by a
    // continuation with FIN=1. Browsers fragment large sends.
    this._fragOp = null;
    this._frags = [];
    this._fragLen = 0;

    socket.on('data', (chunk) => this._onData(chunk));
    socket.on('close', () => this._shutdown());
    socket.on('error', (err) => { this.emit('error', err); this._shutdown(); });
    socket.setNoDelay(true);
  }

  send(str) {
    if (!this.open) return false;
    try {
      this.socket.write(encodeFrame(OP_TEXT, Buffer.from(str, 'utf8')));
      return true;
    } catch (err) {
      this.emit('error', err);
      this._shutdown();
      return false;
    }
  }

  ping() {
    if (!this.open) return;
    this.alive = false;                 // set true again when the pong lands
    try { this.socket.write(encodeFrame(OP_PING, Buffer.alloc(0))); } catch { this._shutdown(); }
  }

  close(code = 1000, reason = '') {
    if (!this.open) return;
    const body = Buffer.alloc(2 + Buffer.byteLength(reason));
    body.writeUInt16BE(code, 0);
    body.write(reason, 2);
    try { this.socket.write(encodeFrame(OP_CLOSE, body)); } catch { /* already gone */ }
    this._shutdown();
  }

  _shutdown() {
    if (!this.open) return;
    this.open = false;
    try { this.socket.destroy(); } catch { /* already gone */ }
    this.emit('close');
  }

  _onData(chunk) {
    this._buf = this._buf.length ? Buffer.concat([this._buf, chunk]) : chunk;
    // Decode as many whole frames as the buffer now holds. A frame can straddle
    // TCP segments, so a partial read is normal and simply waits for more.
    for (;;) {
      let frame;
      try {
        frame = decodeFrame(this._buf);
      } catch (err) {
        this.emit('error', err);
        this.close(1002, 'protocol error');
        return;
      }
      if (!frame) return;                       // need more bytes
      this._buf = this._buf.subarray(frame.size);
      if (!this._handle(frame)) return;
    }
  }

  // Returns false if the connection was torn down and decoding must stop.
  _handle(frame) {
    const { op, fin, payload } = frame;
    if (op === OP_CLOSE) {
      const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
      this.close(code === 1005 ? 1000 : code);
      return false;
    }
    if (op === OP_PING) {
      try { this.socket.write(encodeFrame(OP_PONG, payload)); } catch { this._shutdown(); return false; }
      return true;
    }
    if (op === OP_PONG) { this.alive = true; return true; }

    // Data frames, with continuation assembly.
    if (op === OP_TEXT || op === OP_BIN) {
      if (this._fragOp !== null) { this.close(1002, 'interleaved message'); return false; }
      if (fin) return this._deliver(op, payload);
      this._fragOp = op; this._frags = [payload]; this._fragLen = payload.length;
      return true;
    }
    if (op === OP_CONT) {
      if (this._fragOp === null) { this.close(1002, 'orphan continuation'); return false; }
      this._fragLen += payload.length;
      if (this._fragLen > MAX_MESSAGE) { this.close(1009, 'message too large'); return false; }
      this._frags.push(payload);
      if (!fin) return true;
      const op0 = this._fragOp, body = Buffer.concat(this._frags, this._fragLen);
      this._fragOp = null; this._frags = []; this._fragLen = 0;
      return this._deliver(op0, body);
    }
    this.close(1002, `bad opcode ${op}`);
    return false;
  }

  _deliver(op, payload) {
    // Binary is accepted at the framing layer and dropped here: the game speaks
    // JSON, and silently ignoring a binary frame beats tearing down a child's
    // session over one.
    if (op === OP_TEXT) this.emit('message', payload.toString('utf8'));
    return true;
  }
}

// Encode a server→client frame. Server frames are never masked (RFC 6455 §5.1).
export function encodeFrame(op, payload) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    // Lengths above 2^32 cannot happen here (MAX_MESSAGE caps us) but the field
    // is 64-bit, so write the high word as zero rather than leaving it undefined.
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  header[0] = 0x80 | op;                 // FIN set: we never fragment outbound
  return Buffer.concat([header, payload], header.length + len);
}

// Decode one frame from the front of `buf`. Returns null when more bytes are
// needed, or { op, fin, payload, size } where `size` is the bytes consumed.
export function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const b0 = buf[0], b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  if (b0 & 0x70) throw new Error('reserved bits set (no extension was negotiated)');
  const op = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  // Every client→server frame MUST be masked. An unmasked one means either a
  // broken client or something that is not a browser at all.
  if (!masked) throw new Error('client frame is not masked');
  let len = b1 & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < off + 2) return null;
    len = buf.readUInt16BE(off); off += 2;
  } else if (len === 127) {
    if (buf.length < off + 8) return null;
    const hi = buf.readUInt32BE(off), lo = buf.readUInt32BE(off + 4);
    if (hi !== 0) throw new Error('frame larger than this server will ever accept');
    len = lo; off += 8;
  }
  if (len > MAX_MESSAGE) throw new Error('frame too large');
  // Control frames carry their own rules: never fragmented, never over 125 bytes.
  if (op >= 0x8 && (!fin || len > 125)) throw new Error('malformed control frame');
  if (buf.length < off + 4 + len) return null;
  const mask = buf.subarray(off, off + 4); off += 4;
  const payload = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) payload[i] = buf[off + i] ^ mask[i & 3];
  return { op, fin, payload, size: off + len };
}

// Attach to a node http.Server. `onConnection(conn, req)` fires per client.
//
// `path` gates the upgrade so the static file server and the game socket can
// share one port — which is the whole point, because it means the address the
// kids type is the only address there is.
export function attachWebSocket(httpServer, { path = '/ws', onConnection }) {
  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== path) { socket.destroy(); return; }
    const key = req.headers['sec-websocket-key'];
    const version = req.headers['sec-websocket-version'];
    if (req.headers.upgrade?.toLowerCase() !== 'websocket' || !key || version !== '13') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n'
      + 'Upgrade: websocket\r\n'
      + 'Connection: Upgrade\r\n'
      + `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    const conn = new WSConnection(socket);
    // Bytes that arrived in the same packet as the handshake belong to the
    // first frame. Dropping them loses the client's opening message.
    if (head && head.length) conn._onData(head);
    onConnection(conn, req);
  });
}

export function newId() { return randomBytes(6).toString('hex'); }
