#!/usr/bin/env node
// Bağımlılıksız yerel sunucu: node tools/serve.mjs [port] [klasör]
// Oyun dosyadan da açılır; sunucu yalnızca "uygulama olarak kur / çevrim dışı oyna" (servis çalışanı) için gerekir.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2]) || 8080;
const root = resolve(process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), ".."));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };

createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
    let file = join(root, path);
    if (!file.startsWith(root)) throw new Error("kök dışı");          // klasör dışına çıkılamaz
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bulunamadı");
  }
}).listen(port, "127.0.0.1", () => console.log(`Brick Breaker AI → http://localhost:${port}  (durdurmak için Ctrl+C)`));
