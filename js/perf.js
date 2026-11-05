// ======================================================================
// 29. PERFORMANS: grafik kalitesi (Otomatik / Yüksek / Düşük) ve kare
//     süresi izleyicisi. Düşük kalite: tuval 1× piksel yoğunluğunda,
//     top izi/gölgesi/halesi yok, parçacıklar yarıya iner, parıltı yok.
//     Otomatik: oyun sırasında ~2.5 sn boyunca 45 FPS'nin altına düşülürse
//     bir kez düşük kaliteye geçer ve haber verir (geri dönmez: titreşmesin).
// ======================================================================
const perf = { auto: false, ema: 1 / 60, slowFor: 0, fps: 60 };
const PERF_SLOW_DT = 1 / 45, PERF_SLOW_TIME = 2.5;
const lowGfx = () => settings.gfx === "dusuk" || (settings.gfx === "oto" && perf.auto);
// Kaliteyi uygula: piksel yoğunluğu değişince sprite önbellekleri ve piksel duvar yeniden çizilir
function applyGfx() {
  const want = lowGfx() ? 1 : NATIVE_DPR;
  if (want === DPR) return false;
  setRenderScale(want);
  brickSprites.clear();
  ballSprites.clear();
  pxWall.full = true;
  return true;
}
// Her karede çağrılır (main.js): yalnızca oyun akarken ve sekme görünürken ölçer
function perfSample(dt) {
  if (document.hidden || !(state.mode === "playing" || state.mode === "serve")) { perf.slowFor = 0; return; }
  perf.ema += (dt - perf.ema) * 0.08;
  perf.fps = Math.round(1 / Math.max(1e-3, perf.ema));
  if (settings.gfx !== "oto" || perf.auto) return;
  perf.slowFor = perf.ema > PERF_SLOW_DT ? perf.slowFor + dt : 0;
  if (perf.slowFor >= PERF_SLOW_TIME) {
    perf.auto = true;
    applyGfx();
    toast(tr("⚡ Düşük grafik moduna geçildi"), tr("oyun takılıyordu · Ayarlar → Grafik kalitesi"), T().accent);
  }
}
applyGfx();
