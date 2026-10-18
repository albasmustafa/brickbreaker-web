// ======================================================================
// 6. OYUN DURUMU, VARLIKLAR VE TOP MATEMATİĞİ
// ======================================================================
const state = {
  mode: "menu",                 // menu | serve | playing | levelclear | paused | gameover
  prevMode: null,
  level: 1, score: 0, lives: 3, combo: 0, high: parseInt(store.get("bb_highscore", 0)) || 0, startHigh: 0, newRecord: false,
  lbRank: 0,                    // son oyunun liderlik tablosundaki yeri
  speed: BASE_SPEED, diffSpeed: 1, time: 0, shake: 0, clearAt: 0, buildFade: 0, pendingMulti: false,
  // Süreli efektler: bitiş zamanı (oyun saatiyle)
  slowUntil: 0, fireUntil: 0, laserUntil: 0, magnetUntil: 0, bigUntil: 0, reverseUntil: 0, miniUntil: 0, hasteUntil: 0,
  stunUntil: 0, feverUntil: 0, shield: 0, laserCd: 0,
  slowmo: 0, hitstop: 0,        // gerçek saniye: ağır çekim / an donması
  callout: null,                // ekran ortasında büyük yazı { text, color, life }
  boss: null,
  // Lanetler
  curses: {}, pendingCurse: null, curseAt: Infinity, windDir: 1, inset: 0, meteorCd: 0, ufo: null, cursesSurvived: 0,
};
const TIMERS = ["slow", "fire", "laser", "magnet", "big", "reverse", "mini", "haste", "stun", "fever"];

const paddle = {
  x: W / 2 - PADDLE_W / 2, y: H - 40, w: PADDLE_W, targetW: PADDLE_W, h: PADDLE_H, speed: 600, wideUntil: 0, flash: 0,
  vx: 0, lastX: W / 2 - PADDLE_W / 2,   // falso için raket hızı
  iceV: 0, aimX: null,                  // BUZLU RAKET: kayma hızı ve fare hedefi
};

let balls = [];                         // çoklu top: hepsi aynı anda yaşayabilir
let bricks = [], powerups = [], particles = [], fragments = [], floaters = [], stars = [], matrixCols = [];
let zones = [], lasers = [], bullets = [], holes = [], bolts = [], movingRows = [];
const fxOn = k => state[k + "Until"] > state.time;
const isFever = () => fxOn("fever");
const isFire = () => fxOn("fire") || isFever();
const ballDamage = () => (fxOn("big") ? 2 : 1);

function initStars() {
  stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.5, 1.8), v: rnd(4, 18), ph: rnd(0, 6.28) }));
  matrixCols = [];
  for (let x = 8; x < W; x += 20) matrixCols.push({ x, y: rnd(-H, H), v: rnd(50, 160) });
}
const newBall = stuck => ({ x: W / 2, y: H - 60, r: 8, dx: 0, dy: 0, stuck: !!stuck, gone: false, trail: [],
                            spin: 0, boost: 1, portalCd: 0, stuckOff: 0, caughtAt: 0, rot: 0 });

// Bölüm hızı: zorluk çarpanı yeni oyunda kilitlenir (oyun ortasında ayar değişse de oyun bozulmaz)
const levelSpeed = l => Math.min(BASE_SPEED * state.diffSpeed * 1.07 ** (l - 1), MAX_SPEED);
// Hedef hız: bölüm hızı + vuruş başı hızlanma, yavaşlatma/hızlandırma çarpanlarıyla
const mag = () => state.speed * (fxOn("slow") ? SLOW_FACTOR : 1) * (fxOn("haste") ? 1.3 : 1);
function setSpeed(b, m) {
  const s = Math.hypot(b.dx, b.dy) || 1;
  b.dx = b.dx / s * m;
  b.dy = b.dy / s * m;
}
// Hız vektörünü a radyan döndür (tuvalde pozitif = saat yönü)
function rotate(b, a) {
  const c = Math.cos(a), s = Math.sin(a), dx = b.dx * c - b.dy * s;
  b.dy = b.dx * s + b.dy * c;
  b.dx = dx;
}
// Top neredeyse yataya düştüyse dikey bileşeni zorla
function fixAngle(b) {
  const m = Math.hypot(b.dx, b.dy) || 1;
  if (Math.abs(b.dy) < MIN_VERT * m) {
    b.dy = (b.dy > 0 ? 1 : -1) * MIN_VERT * m;
    b.dx = Math.sign(b.dx || 1) * Math.sqrt(m * m - b.dy * b.dy);
  }
}
