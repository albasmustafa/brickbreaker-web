// ======================================================================
// 1. ÇEKİRDEK: tuval, sabitler, matematik / renk / çizim / DOM yardımcıları
// ======================================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
// HiDPI: tuval ekranın piksel yoğunluğunda çizilir (mantıksal boyut 800×600 kalır)
const DPR = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * DPR;
canvas.height = H * DPR;

const STEP = 1 / 120;                        // sabit fizik adımı (120 Hz)
const BASE_SPEED = 340, MAX_SPEED = 640;     // topun bölüm başı ve en yüksek hızı (px/s)
const PADDLE_H = 14, PADDLE_W = 100, PADDLE_WIDE = 160;
const SLOW_FACTOR = 0.65, SLOW_TIME = 8, WIDE_TIME = 10;
const MAX_BALLS = 8, MAX_LIVES = 9;
const FX_GAIN_MAX = 0.55;                    // efekt sesi üst sınırı (ses ayarıyla çarpılır)
const SHAKE_SCALE = { acik: 1, azaltilmis: 0.35, kapali: 0 };
const DIFFICULTY = { kolay: { speedMul: 0.85, lives: 5 }, normal: { speedMul: 1, lives: 3 }, zor: { speedMul: 1.15, lives: 2 } };
const HP_DOT = { size: 5, gap: 4, pad: 6, lumThreshold: 0.18, dark: "#12182b", light: "#f5f7fa" };
const MIN_VERT = 0.28;                       // dikey hız en az bu oranda: duvarlar arası sonsuz yatay sekme olmasın
const SPIN_MAX = 1.1, SPIN_DECAY = 1.1;      // falso: saniyedeki en büyük dönüş (rad) ve sönme hızı
const BOOST_DECAY = 1.4;                     // geçici hız patlamasının sönme hızı
const FEVER_COMBO = 10, FEVER_TIME = 6;
const FX_TIME = { fire: 6, laser: 8, magnet: 10, big: 10, reverse: 6, mini: 8, haste: 6, stun: 2.5 };
const ZONE_STYLE = { bumper: "#ff5d8f", spin: "#80ffdb", portal: "#9d4edd" };
const CURSE_COLOR = "#c77dff";
const COLS = 10;
const BRICK = { w: 70, h: 22, gap: 6, top: 70 };
BRICK.left = (W - (COLS * BRICK.w + (COLS - 1) * BRICK.gap)) / 2;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
// Tohumlu rastgele: bölüm düzeni, tema ve şarkı profili her seferinde aynı çıksın
function seeded(seed) {
  seed = (seed % 2147483646) + 1;
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
// Kalıcı kayıt: gizli pencerede ya da engelliyken sessizce varsayılana döner
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} },
};

// --- Renk (hepsi #rrggbb alır) ---
// WCAG göreli parlaklık: kontrast hesabı ve nokta rengi eşiği bunu kullanır
function relLum(hex) {
  const c = i => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
}
const contrast = (a, b) => { const la = relLum(a), lb = relLum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
// Dolgunun üstüne okunur nokta rengi: parlak dolguya koyu, koyu dolguya açık
const dotColorFor = hex => (relLum(hex) > HP_DOT.lumThreshold ? HP_DOT.dark : HP_DOT.light);
const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hexToRgba = (hex, a) => "rgba(" + rgbOf(hex).join(",") + "," + a + ")";
// Rengi beyaza (amt > 0) ya da siyaha (amt < 0) doğru karıştırır
const shade = (hex, amt) => "rgb(" + rgbOf(hex).map(v => Math.round(v + ((amt > 0 ? 255 : 0) - v) * Math.abs(amt))).join(",") + ")";
function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return "#" + [0, 8, 4].map(n => Math.round(f(n) * 255).toString(16).padStart(2, "0")).join("");
}

// --- Çizim kısayolları (varsayılan bağlam: oyun tuvali) ---
function rrPath(x, y, w, h, r, g = ctx) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, Math.max(0, w), h, r); else g.rect(x, y, Math.max(0, w), h);
}
function fillRR(x, y, w, h, r, color, g = ctx) { if (color) g.fillStyle = color; rrPath(x, y, w, h, r, g); g.fill(); }
function circle(x, y, r, color, g = ctx) { if (color) g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
// Nokta listesinden yol: [[x, y], ...]
function path(pts, close, g = ctx) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); }
// Doğrusal degrade: duraklar ya renk (eşit aralıklı) ya da [konum, renk]
function lgrad(x0, y0, x1, y1, stops, g = ctx) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((s, i) => (Array.isArray(s) ? gr.addColorStop(s[0], s[1]) : gr.addColorStop(i / (stops.length - 1), s)));
  return gr;
}
function text(s, x, y, font, color, align = "center") { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(s, x, y); }
// Bir noktanın çevresinde ölçekle (yakınlaşma efektleri)
function zoomAt(z, cx = W / 2, cy = H / 2) { ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); }

// --- DOM ---
const $ = id => document.getElementById(id);
// el("button", { className, textContent, onclick, dataset: {...}, "--c": renk }, ...çocuklar)
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    if (k === "dataset") Object.assign(e.dataset, props[k]);
    else if (k.startsWith("--")) e.style.setProperty(k, props[k]);
    else if (k === "style") Object.assign(e.style, props[k]);
    else e[k] = props[k];
  }
  e.append(...kids);
  return e;
}
const onClick = (id, fn) => $(id).addEventListener("click", fn);
// Tıklanan düğme odakta kalmasın: boşluk tuşu onu yeniden tetiklemesin
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("button"); if (b) b.blur(); });
