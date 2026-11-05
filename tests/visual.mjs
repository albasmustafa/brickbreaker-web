// Görsel regresyon: tuvalin ana ekranları 3 dilde (tr, ar = RTL, ja = CJK) sabit tohumla çizilir ve
// tests/visual/ içindeki kayıtlı görüntülerle piksel piksel karşılaştırılır.
//   node tests/visual.mjs            karşılaştır (fark varsa tests/visual/out/ içine fark görüntüsü yazar, çıkış 1)
//   node tests/visual.mjs --update   kayıtlı görüntüleri yeniden üret (bilerek yapılan görsel değişiklikten sonra)
// Yazı tipleri makineden makineye değiştiği için kayıtlı görüntüler bu makineye özgüdür; CI'da çalıştırılmaz.
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { launch } from "./harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const UPDATE = args.includes("--update");
const target = resolve(args.find(a => !a.startsWith("--")) || join(here, "../index.html"));
const dir = join(here, "visual"), outDir = join(dir, "out");
mkdirSync(dir, { recursive: true });

const LANGS = ["tr", "ar", "ja"];
// Her sahne: oyunu belirli bir duruma getirir. Rastgelelik ve zaman sabitlenir, kart animasyonları bitmiş sayılır.
const SCENES = {
  menu: `toMenu();`,
  serve: `startGame(); state.lives = 3;`,
  boss: `startPractice(5, true); state.boss.x = W / 2 - 100; state.boss.vx = 0;`,
  storm: `startPractice(TUNNEL_LEVEL, true); launchBall(); for (let k = 0; k < 3; k++) pxCatch({ kind: "mul" });
          balls.forEach((b, i) => Object.assign(b, { x: 60 + (i * 97) % 680, y: 300 + (i * 53) % 220, trail: [] }));`,
  gameover: `startGame(); state.score = 12345; state.level = 4; run.bricks = 87; run.bestCombo = 12; state.time = 222; gameOver();`,
};
const PREP = `(() => {
  closePanels();
  let s = 42; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  initStars();
  settings.hazards = "normal"; settings.difficulty = "normal"; settings.gfx = "yuksek"; applyGfx();
  return 1;
})()`;
const FREEZE = `(() => {
  state.callout = null; state.time = 10; state.buildFade = 99; state.shake = 0; state.slowmo = 0; state.hurt = 0;
  particles = []; fragments = []; floaters = []; confetti = []; glints = [];
  paddle.vx = 0; paddle.flash = 0; hudScore = state.score;
  for (const b of bricks) { b.flash = 0; b.wob = 0; b.colFade = 0; }
  modeSeen = state.mode; modeAt = -1e9;
  draw();
  return canvas.toDataURL("image/png");
})()`;
// Sayfada iki PNG'yi karşılaştırır: kanal farkı 48'i aşan pikseller sayılır, fark görüntüsü kırmızıyla döner
const DIFF = (a, b) => `(async () => {
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [ia, ib] = await Promise.all([load(${JSON.stringify(a)}), load(${JSON.stringify(b)})]);
  if (ia.width !== ib.width || ia.height !== ib.height) return { ratio: 1, size: [ia.width, ia.height, ib.width, ib.height] };
  const c = document.createElement("canvas"); c.width = ia.width; c.height = ia.height;
  const g = c.getContext("2d");
  g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height);
  g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height);
  const out = g.createImageData(c.width, c.height);
  let bad = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
    const v = (db.data[i] + db.data[i + 1] + db.data[i + 2]) / 9;
    if (d > 48) { bad++; out.data.set([255, 40, 60, 255], i); } else out.data.set([v, v, v, 255], i);
  }
  g.putImageData(out, 0, 0);
  return { ratio: bad / (c.width * c.height), diff: bad ? c.toDataURL("image/png") : null };
})()`;

const browser = await launch(pathToFileURL(target).href, { width: 1000, height: 800 });
let failed = 0, made = 0;
const t0 = Date.now();
try {
  for (const lang of LANGS) {
    const p = await browser.open();
    await p.eval(`localStorage.clear(), localStorage.setItem('bb_lang', '"${lang}"'), 1`);
    await p.reload();
    for (const [name, setup] of Object.entries(SCENES)) {
      await p.eval(PREP);
      await p.eval(`(() => { ${setup} return 1; })()`);
      const png = await p.eval(FREEZE);
      const file = join(dir, `${lang}-${name}.png`);
      if (UPDATE || !existsSync(file)) {
        writeFileSync(file, Buffer.from(png.split(",")[1], "base64"));
        made++;
        console.log(`  ＋ ${lang}-${name}.png kaydedildi`);
        continue;
      }
      const base = "data:image/png;base64," + readFileSync(file).toString("base64");
      const r = await p.eval(DIFF(base, png));
      const pct = (r.ratio * 100).toFixed(2);
      if (r.ratio > 0.005) {
        failed++;
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, `${lang}-${name}.png`), Buffer.from(png.split(",")[1], "base64"));
        if (r.diff) writeFileSync(join(outDir, `${lang}-${name}.diff.png`), Buffer.from(r.diff.split(",")[1], "base64"));
        console.log(`  ✗ ${lang}-${name}: piksellerin %${pct}'i farklı → tests/visual/out/`);
      } else console.log(`  ✓ ${lang}-${name}  (%${pct} fark)`);
    }
    if (p.errors.length) { failed++; console.log("  ✗ sayfa hatası: " + p.errors[0]); }
    p.close();
  }
} finally {
  browser.close();
}
console.log(`\n${made ? made + " görüntü kaydedildi, " : ""}${failed ? failed + " fark" : "fark yok"} — ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
process.exit(failed ? 1 : 0);
