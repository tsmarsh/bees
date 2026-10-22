// Serves web/ for local play and playtests: `make serve`, then open the printed address (on a phone on the same
// network too). No dependencies. PORT and HOST come from the environment.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../web/", import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".wasm": "application/wasm", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep) && file !== ROOT.slice(0, -1)) { res.writeHead(403).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Allerbees is buzzing at http://localhost:${PORT}/`);
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs || []) if (a.family === "IPv4" && !a.internal) console.log(`  on your network: http://${a.address}:${PORT}/`);
  }
});
