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
const target = resolve(args[0] || resolve(dirname(fileURLToPath(import.meta.url)), "../index.html"));
if (!existsSync(target)) { console.error("Bulunamadı: " + target); process.exit(2); }
if (shots) mkdirSync(shots, { recursive: true });

const browser = await launch(pathToFileURL(target).href);
// Her test temiz kayıtla (localStorage boş) açılan yeni bir sayfada çalışır
async function freshPage() {
  const page = await browser.open();
  await page.eval("localStorage.clear(), 1");
  await page.reload();
  await page.eval(HELPERS);
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
    for (const x of [p, ...extra]) if (x) x.close();
  }
}
browser.close();
console.log(`\n${passed} geçti, ${failed} kaldı — ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
process.exit(failed ? 1 : 0);
