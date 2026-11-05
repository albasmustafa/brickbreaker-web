#!/usr/bin/env node
// Test çalıştırıcı: node tests/run.mjs [oyun.html] [--only "ad parçası"] [--shots klasör]
// Varsayılan hedef projenin index.html'i; dist/ çıktıları ya da başka bir kopya da verilebilir.
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import { launch, sleep } from "./harness.mjs";
import { tests, HELPERS } from "./suite.mjs";

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const only = flag("--only"), shots = flag("--shots");
const COVERAGE = args.includes("--coverage") && args.splice(args.indexOf("--coverage"), 1);
const cov = new Map();          // betik adresi → { src, hit: Uint8Array (1 = çalıştı, 2 = hiç çalışmadı) }
const target = resolve(args[0] || resolve(dirname(fileURLToPath(import.meta.url)), "../index.html"));
if (!existsSync(target)) { console.error("Bulunamadı: " + target); process.exit(2); }
if (shots) mkdirSync(shots, { recursive: true });

const browser = await launch(pathToFileURL(target).href);
// Her test temiz kayıtla (localStorage boş) açılan yeni bir sayfada çalışır
async function freshPage() {
  const page = await browser.open();
  await page.eval("localStorage.clear(), localStorage.setItem('bb_lang', '\"tr\"'), 1");   // testler Türkçe (kaynak dil) çalışır
  if (COVERAGE) { await page.send("Profiler.enable"); await page.send("Profiler.startPreciseCoverage", { callCount: true, detailed: true }); }
  await page.reload();
  await page.eval(HELPERS);
  if (COVERAGE) { const reload = page.reload; page.reload = async () => { await collectCoverage(page); await reload(); }; }   // yenilemeden önceki kapsam kaybolmasın
  return page;
}
console.log("Hedef: " + target + "\n");
let passed = 0, failed = 0;
const t0 = Date.now();
for (const t of tests.filter(t => !only || t.name.toLowerCase().includes(only.toLowerCase()))) {
  const started = Date.now(), extra = [];
  let p;
  try {
    p = await freshPage();
    const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
    const open = async () => { const q = await freshPage(); extra.push(q); return q; };
    await t.fn({ p, open, expect, sleep, shots });
    const errors = [p, ...extra].flatMap(x => x.errors);
    if (errors.length) throw new Error("sayfa hatası: " + errors[0]);
    passed++;
    console.log(`  ✓ ${t.name}  (${((Date.now() - started) / 1000).toFixed(1)} sn)`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${t.name}\n      → ${e.message}`);
  } finally {
    if (COVERAGE) for (const x of [p, ...extra]) if (x) await collectCoverage(x);
    for (const x of [p, ...extra]) if (x) x.close();
  }
}
browser.close();
if (COVERAGE) reportCoverage();
console.log(`\n${passed} geçti, ${failed} kaldı — ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
process.exit(failed ? 1 : 0);

// --- Kod kapsamı (--coverage): Chrome'un hassas kapsamı, bayt düzeyinde; bir sayfada çalışan bayt "kapsandı" sayılır ---
// Kapanmış ya da başka yere gitmiş sayfada yanıt hiç gelmeyebilir: her istek en çok 5 sn beklenir
function within(pr, ms = 5000) { return Promise.race([pr, new Promise(res => setTimeout(() => res({}), ms))]); }
async function collectCoverage(page) {
  await within(page.send("Page.handleJavaScriptDialog", { accept: true }), 300);   // açık confirm() sayfayı kilitler
  const r = await within(page.send("Profiler.takePreciseCoverage"));
  if (!r.result) return;                                                         // yanıt yok: sayfa kapanmış, atla
  for (const sc of r.result?.result || []) {
    if (!/\/js\/[\w/]+\.js$/.test(sc.url) || /\/js\/lang\//.test(sc.url)) continue;
    let e = cov.get(sc.url);
    if (!e) {
      await within(page.send("Debugger.enable"));
      const got = await within(page.send("Debugger.getScriptSource", { scriptId: sc.scriptId }));
      if (!got.result) return;
      const src = got.result.scriptSource || "";
      if (!src) continue;
      e = { src, hit: new Uint8Array(src.length) };
      cov.set(sc.url, e);
    }
    // Her işlevin aralıkları: dıştan içe sırayla yazılır, içteki aralık dıştakini ezer
    const mark = new Uint8Array(e.src.length);
    for (const fn of sc.functions) for (const rg of fn.ranges) mark.fill(rg.count > 0 ? 1 : 2, rg.startOffset, rg.endOffset);
    for (let i = 0; i < mark.length; i++) if (mark[i] === 1) e.hit[i] = 1; else if (mark[i] === 2 && e.hit[i] !== 1) e.hit[i] = 2;
  }
}
function reportCoverage() {
  const rows = [];
  let tot = 0, hit = 0;
  for (const [url, e] of cov) {
    // Satır kapsamı: kod içeren (boş/yorum olmayan) satırın tüm kod baytları çalıştıysa kapsandı
    let lines = 0, covered = 0, pos = 0;
    const missed = [];
    e.src.split("\n").forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, "").trim();
      if (code && !/^[})\];,]*$/.test(code)) {
        lines++;
        let bad = false;
        for (let k = pos; k < pos + line.length; k++) if (e.hit[k] === 2 && !/\s/.test(e.src[k])) { bad = true; break; }
        if (bad) missed.push(i + 1); else covered++;
      }
      pos += line.length + 1;
    });
    tot += lines; hit += covered;
    rows.push({ file: url.replace(/^.*\/js\//, "js/"), pct: lines ? covered / lines * 100 : 100, lines, missed });
  }
  rows.sort((a, b) => a.pct - b.pct);
  console.log("\nKod kapsamı (satır, kaynak dosya başına):");
  for (const r of rows) {
    const spans = [];
    for (const n of r.missed) { const l = spans[spans.length - 1]; if (l && n === l[1] + 1) l[1] = n; else spans.push([n, n]); }
    const where = spans.slice(0, 6).map(([a, b]) => (a === b ? a : a + "-" + b)).join(", ") + (spans.length > 6 ? ", …" : "");
    console.log(`  ${r.pct.toFixed(1).padStart(5)}%  ${r.file.padEnd(20)} ${String(r.lines - r.missed.length).padStart(4)}/${r.lines}` + (r.missed.length ? `  eksik: ${where}` : ""));
  }
  console.log(`  ${(hit / Math.max(1, tot) * 100).toFixed(1).padStart(5)}%  TOPLAM               ${hit}/${tot}`);
}
