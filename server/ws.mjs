// A small WebSocket server (RFC 6455) on node's http module: text frames for messages, binary frames for state,
// ping/pong and close. Enough for a playtest party on a local network; no extensions, no fragmentation of what we send.
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_MESSAGE = 64 * 1024;

export class Socket extends EventEmitter {
  constructor(sock) {
    super();
    this.sock = sock;
    this.buf = Buffer.alloc(0);
    this.parts = [];
    this.open = true;
    sock.setNoDelay(true);
    sock.on("data", (d) => this.read(d));
    sock.on("close", () => this.closed());
    sock.on("error", () => this.closed());
  }

  read(data) {
    if (!this.open) return;
    this.buf = Buffer.concat([this.buf, data]);
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0;
      const op = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (!masked || len > MAX_MESSAGE) { this.close(1002); return; }
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4);
      const payload = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);
      if (op === 0x8) { this.close(1000); this.buf = Buffer.alloc(0); return; }
      if (op === 0x9) { this.frame(0xa, payload); continue; }
      if (op === 0xa) continue;
      if (op === 0x1 || op === 0x2 || op === 0x0) {
        this.parts.push(payload);
        if (this.parts.reduce((n, p) => n + p.length, 0) > MAX_MESSAGE) { this.close(1009); return; }
        if (fin) {
          const whole = Buffer.concat(this.parts);
          this.parts = [];
          this.emit("message", whole.toString("utf8"));
        }
      }
    }
  }

  frame(op, payload) {
    if (!this.open) return;
    const len = payload.length;
    const head = len < 126 ? Buffer.from([0x80 | op, len])
      : len < 65536 ? Buffer.from([0x80 | op, 126, len >> 8, len & 255])
      : (() => { const h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); return h; })();
    this.sock.write(Buffer.concat([head, payload]));
  }

  send(obj) { this.frame(0x1, Buffer.from(JSON.stringify(obj))); }
  sendBinary(bytes) { this.frame(0x2, Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)); }

  close(code = 1000) {
    if (!this.open) return;
    const b = Buffer.alloc(2);
    b.writeUInt16BE(code);
    this.frame(0x8, b);
    this.sock.end();
    this.closed();
  }

  closed() {
    if (!this.open) return;
    this.open = false;
    this.emit("close");
  }
}

// Accepts the upgrade on `path`; calls onSocket(socket, request) for each new connection.
export function acceptWebSockets(server, path, onSocket) {
  server.on("upgrade", (req, sock) => {
    const url = new URL(req.url, "http://x");
    const key = req.headers["sec-websocket-key"];
    if (url.pathname !== path || !key || (req.headers.upgrade || "").toLowerCase() !== "websocket") {
      sock.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }
    const accept = createHash("sha1").update(key + GUID).digest("base64");
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    onSocket(new Socket(sock), req);
  });
}
