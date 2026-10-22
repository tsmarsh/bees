// The Allerbees server: web/ as static files, and garden parties over WebSockets at /party. No dependencies.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { acceptWebSockets } from "./ws.mjs";
import { createParties } from "./party.mjs";

const ROOT = fileURLToPath(new URL("../web/", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".wasm": "application/wasm", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon",
};

async function serveFile(req, res) {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(join(ROOT, path));
    if (!(file + sep).startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}

// Resolves to the listening http.Server; port 0 picks a free one (tests use that).
export async function startServer({ port = 8080, host = "0.0.0.0" } = {}) {
  const server = createServer(serveFile);
  const lan = [];
  acceptWebSockets(server, "/party", await createParties({ lan }));
  await new Promise((resolve) => server.listen(port, host, resolve));
  if (host === "0.0.0.0") lan.push(...lanAddresses().map((a) => `${a}:${server.address().port}`));
  return server;
}

// This machine's addresses on the local network (leaving out container bridges), for invitations.
export function lanAddresses() {
  return Object.values(networkInterfaces()).flat()
    .filter((a) => a && a.family === "IPv4" && !a.internal && !/^172\.(1[6-9]|2\d|3[01])\./.test(a.address))
    .map((a) => a.address)
    .slice(0, 3);
}
