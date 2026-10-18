#!/usr/bin/env node
// Derleme: projeyi tek dosyaya çevirir (çift tıklayınca açılan, internet istemeyen tek HTML).
//   dist/index.html            — okunaklı tek dosya (CSS + JS satır içi, dosya başlıklarıyla)
//   dist/brickbreaker.min.html — sıkıştırılmış tek dosya (esbuild kuruluysa: npm install)
// Seçenek: --out yol/index.html  okunaklı tek dosyayı ayrıca bu yola da yazar.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(root, f), "utf8");
const args = process.argv.slice(2), outIx = args.indexOf("--out"), extraOut = outIx >= 0 ? resolve(args[outIx + 1]) : null;

let html = read("index.html");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = read("css/style.css");
const js = scripts.map(f => `// ${"=".repeat(70)}\n// ${f}\n${read(f).trimEnd()}\n`).join("\n");
const favicon = "data:image/svg+xml," + encodeURIComponent(read("favicon.svg").trim()).replace(/%20/g, " ").replace(/%3D/g, "=").replace(/%3A/g, ":").replace(/%2F/g, "/");

// Servis çalışanı listesi index.html ile uyumlu mu (çevrim dışı önbellek eksik kalmasın)
const sw = read("sw.js");
const missing = scripts.filter(f => !sw.includes('"' + f.replace(/^js\//, "").replace(/\.js$/, "") + '"'));
if (missing.length) console.warn("⚠️  sw.js önbellek listesinde eksik: " + missing.join(", "));

const single = html
  .replace(/<link rel="icon" href="[^"]+">/, `<link rel="icon" href="${favicon}">`)
  .replace(/<link rel="manifest"[^>]*>\n?/, "")                                      // tek dosyada uygulama bildirimi yok
  .replace(/<link rel="stylesheet" href="css\/style.css">/, () => `<style>\n${css.trimEnd()}\n</style>`)
  .replace(/<!-- Sıra önemli[^]*?-->\n/, "")
  .replace(/(<script src="[^"]+"><\/script>\n?)+/, () => `<script>\n${js}</script>\n`);

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist/index.html"), single);
console.log(`dist/index.html            ${(single.length / 1024).toFixed(0)} KB (${scripts.length} betik + CSS birleşti)`);
if (extraOut) { writeFileSync(extraOut, single); console.log("→ ayrıca yazıldı: " + extraOut); }

// Sıkıştırılmış sürüm: esbuild varsa JS ve CSS küçültülür, HTML'deki girinti/yorumlar atılır
try {
  const { transform } = await import("esbuild");
  const minJs = (await transform(js, { minify: true, target: "es2020" })).code;
  const minCss = (await transform(css, { loader: "css", minify: true })).code;
  const shell = html
    .replace(/<link rel="icon" href="[^"]+">/, `<link rel="icon" href="${favicon}">`)
    .replace(/<link rel="manifest"[^>]*>\n?/, "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<link rel="stylesheet" href="css\/style.css">/, "@@CSS@@")
    .replace(/(<script src="[^"]+"><\/script>\s*)+/, "@@JS@@")
    .replace(/\n\s+/g, "\n").replace(/>\n</g, "><");
  const min = shell.replace("@@CSS@@", () => `<style>${minCss.trim()}</style>`).replace("@@JS@@", () => `<script>${minJs.trim()}</script>`);
  writeFileSync(join(root, "dist/brickbreaker.min.html"), min);
  console.log(`dist/brickbreaker.min.html ${(min.length / 1024).toFixed(0)} KB (sıkıştırılmış)`);
} catch (e) {
  console.log(existsSync(join(root, "node_modules/esbuild")) ? "⚠️  sıkıştırma başarısız: " + e.message : "ℹ️  Sıkıştırılmış sürüm için önce: npm install");
}
