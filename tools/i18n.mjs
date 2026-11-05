#!/usr/bin/env node
// Dil aracı: kaynak koddaki tr("...") çağrılarını ve index.html'deki metinleri toplar,
// js/lang/keys.js'i günceller (yeni anahtar sona eklenir, kimlikler sabit kalır) ve her dili denetler.
//   node tools/i18n.mjs              anahtarları güncelle + rapor (eksik/fazla/yer tutucu uyumsuzluğu)
//   node tools/i18n.mjs --check      yalnızca denetle; sorun varsa çıkış kodu 1 (testler kullanır)
//   node tools/i18n.mjs --prune      kullanılmayan anahtarları sil, kimlikleri yeniden numarala (dil dosyaları da)
//   node tools/i18n.mjs --todo de    o dilin eksik anahtarlarını "kimlik<TAB>Türkçe" olarak yaz
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const langDir = join(root, "js/lang");
const args = process.argv.slice(2);
const CHECK = args.includes("--check"), PRUNE = args.includes("--prune");
const todoIx = args.indexOf("--todo"), TODO = todoIx >= 0 ? args[todoIx + 1] : null;

// --- Kaynaktaki anahtarlar ---
const used = new Set();
for (const f of readdirSync(join(root, "js")).filter(f => f.endsWith(".js"))) {
  const src = readFileSync(join(root, "js", f), "utf8").split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");   // yorum satırları hariç
  // Yalnızca tam bağımsız değişken: tr("metin") ya da tr("metin", {...}) — tr("önek" + x) anahtar değildir
  for (const m of src.matchAll(/(?<![\w$.])(?:tr|N_)\(\s*"((?:[^"\\\n]|\\.)*)"\s*[,)]/g)) used.add(JSON.parse('"' + m[1] + '"'));
  // Ayar seçenekleri: opts: "değer:Yazı|değer:Yazı" (yazılar parseOpts içinde çevrilir)
  for (const m of src.matchAll(/\bopts: "([^"]*)"/g)) for (const p of m[1].split("|")) { const [v, label] = p.split(":"); if (/\p{L}/u.test(label ?? v)) used.add(label ?? v); }
}
const html = readFileSync(join(root, "index.html"), "utf8")
  .replace(/<script[^]*?<\/script>/g, "").replace(/<style[^]*?<\/style>/g, "").replace(/<!--[^]*?-->/g, "");
const decode = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const body = html.slice(html.indexOf("<body"));
for (const m of body.matchAll(/>([^<>]+)</g)) { const s = decode(m[1].trim()); if (/\p{L}/u.test(s)) used.add(s); }
for (const m of html.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)) if (/\p{L}/u.test(m[1]) && m.index > html.indexOf("<body")) used.add(decode(m[1]));
{ const m = html.match(/<meta name="description" content="([^"]*)"/); if (m) used.add(decode(m[1])); }

// --- Mevcut anahtarlar ve diller ---
const sandbox = {};
vm.createContext(sandbox);
const keysFile = join(langDir, "keys.js");
let keys = [];
if (existsSync(keysFile)) { vm.runInContext(readFileSync(keysFile, "utf8") + "\nthis.K = I18N_KEYS; this.D = I18N_DATA;", sandbox); keys = [...sandbox.K]; }
const langs = {};
for (const f of readdirSync(langDir).filter(f => f.endsWith(".js") && f !== "keys.js")) {
  const box = vm.createContext({});   // her dil kendi bağlamında (keys.js'teki const ile çakışmasın)
  vm.runInContext("var I18N_DATA = {};" + readFileSync(join(langDir, f), "utf8") + "\nthis.L = I18N_DATA;", box);
  const code = f.replace(/\.js$/, "");
  langs[code] = { ...box.L[code] };
}

const added = [...used].filter(k => !keys.includes(k));
if (!CHECK) keys.push(...added);
const unused = keys.filter(k => !used.has(k));
if (PRUNE && unused.length) {
  const keep = keys.map((k, i) => [k, i]).filter(([k]) => used.has(k));
  for (const code in langs) {
    const old = langs[code], nu = {};
    keep.forEach(([, oldId], newId) => { if (old[oldId] != null) nu[newId] = old[oldId]; });
    langs[code] = nu;
  }
  keys = keep.map(([k]) => k);
}

// --- Yazma ---
const q = s => JSON.stringify(s);
if (!CHECK) {
  writeFileSync(keysFile, "// Dil anahtarları (kaynak: Türkçe). tools/i18n.mjs üretir; elle düzenleme. Kimlik = sıra.\n" +
    "const I18N_KEYS = [\n" + keys.map((k, i) => q(k) + ", // " + i).join("\n") + "\n];\nconst I18N_DATA = {};\n");
  if (PRUNE) for (const code in langs) writeLang(code, langs[code]);
}
function writeLang(code, data) {
  const ids = Object.keys(data).map(Number).sort((a, b) => a - b);
  const head = readFileSync(join(langDir, code + ".js"), "utf8").split("\n")[0];
  writeFileSync(join(langDir, code + ".js"), head + "\nI18N_DATA." + code + " = {\n" + ids.map(i => i + ": " + q(data[i]) + ",").join("\n") + "\n};\n");
}

// --- Denetim ---
const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(",");
const lead = s => (s.match(/^[^\p{L}\p{N}"'«¿¡({]*/u) || [""])[0].replace(/\s/g, "");
let problems = 0;
const live = keys.map((k, i) => [k, i]).filter(([k]) => used.has(k));
const report = [`${keys.length} anahtar (${live.length} kullanımda, ${unused.length} kullanılmıyor${CHECK ? "" : ", " + added.length + " yeni"})`];
if (CHECK && added.length) { problems++; report.push("keys.js eski: " + added.length + " yeni anahtar (node tools/i18n.mjs çalıştır): " + added.slice(0, 5).map(q).join(" | ")); }
for (const code of Object.keys(langs).sort()) {
  const d = langs[code], missing = live.filter(([, i]) => d[i] == null || d[i] === "");
  const badPh = live.filter(([k, i]) => d[i] != null && ph(k) !== ph(d[i]));
  const badLead = live.filter(([k, i]) => d[i] != null && lead(k) !== lead(d[i]));
  const extra = Object.keys(d).filter(i => !(i in keys));
  if (missing.length || badPh.length || extra.length) problems++;
  report.push(`${code}: ${live.length - missing.length}/${live.length}` +
    (missing.length ? ` · eksik ${missing.length}` : "") + (badPh.length ? ` · yer tutucu ${badPh.length}: ${badPh.slice(0, 3).map(([k, i]) => i + " " + q(d[i])).join(" | ")}` : "") +
    (badLead.length ? ` · baştaki simge farklı ${badLead.length}: ${badLead.slice(0, 3).map(([k, i]) => i).join(",")}` : "") +
    (extra.length ? ` · fazla kimlik ${extra.length}` : ""));
}
console.log(report.join("\n"));
if (TODO) {
  const d = langs[TODO] || {};
  console.log("\n" + live.filter(([, i]) => d[i] == null).map(([k, i]) => i + "\t" + k).join("\n"));
}
process.exit(CHECK && problems ? 1 : 0);
