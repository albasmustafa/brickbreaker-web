#!/usr/bin/env node
// Yayın: tek dosya derlemesini üretir ve ana oyun kopyasını günceller.
//   node tools/release.mjs                 → dist/ + ../brickbreakerai/index.html
//   node tools/release.mjs --no-ai         → yalnızca dist/
//   node tools/release.mjs --ai-out yol    → kopyayı başka bir yola yaz
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const noAi = args.includes("--no-ai");
const outIx = args.indexOf("--ai-out");
const customOut = outIx >= 0;

if (customOut && !args[outIx + 1]) {
  console.error("✗ --ai-out için bir dosya yolu gerekli");
  process.exit(2);
}

const aiOut = customOut ? resolve(args[outIx + 1]) : resolve(root, "..", "brickbreakerai", "index.html");

console.log("→ tek dosya derleniyor…");
const build = spawnSync(process.execPath, ["tools/build.mjs"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);

const dist = join(root, "dist", "index.html");
if (!existsSync(dist)) {
  console.error("✗ dist/index.html üretilemedi");
  process.exit(1);
}

if (noAi) {
  console.log("ℹ️  Ana oyun kopyası atlandı (--no-ai).");
  process.exit(0);
}

// Varsayılan hedef yoksa (ör. depo tek başına klonlandıysa) sessizce atla.
if (!customOut && !existsSync(dirname(aiOut))) {
  console.log("ℹ️  Ana oyun klasörü bulunamadı, kopya atlandı: " + aiOut);
  process.exit(0);
}
if (customOut) mkdirSync(dirname(aiOut), { recursive: true });

try {
  copyFileSync(dist, aiOut);
} catch (e) {
  console.error("✗ Kopyalanamadı: " + aiOut + " — " + e.message);
  process.exit(1);
}
console.log("→ ana oyun güncellendi: " + aiOut + " (" + (statSync(aiOut).size / 1024).toFixed(0) + " KB)");
