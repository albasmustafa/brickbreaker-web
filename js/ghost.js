// ======================================================================
// 25. HAYALET KOŞU: en iyi koşunun raket/top hareketi kaydedilir.
//     Yeni koşuda yarı saydam bir hayalet aynı tempoyu gösterir; kodu
//     arkadaşlarla paylaşabilirsin. Hayalet fizikle etkileşmez.
// ======================================================================
const ghost = {
  best: { rec: [], score: 0, level: 1, date: 0 },
  runRec: [], recAt: 0, idx: 0, play: false, x: W / 2, bx: -1, by: -1, scoreNow: 0,
};
{ // Kayıtlı hayaleti yükle
  const v = store.get("bb_ghost", null);
  if (v && Array.isArray(v.rec)) {
    const rec = v.rec.filter(s => Array.isArray(s) && s.length >= 5 && s.every(Number.isFinite)).slice(0, 2400).sort((a, b) => a[0] - b[0]);
    if (rec.length) ghost.best = { rec, score: Math.max(0, Math.round(+v.score) || 0), level: Math.max(1, Math.round(+v.level) || 1), date: +v.date || 0 };
  }
}
const ghostEnabled = () => settings.ghost !== "kapali" && !battle.active && !run.daily && !run.practice;
const saveGhost = () => store.set("bb_ghost", ghost.best);

function resetGhostRun() {
  ghost.runRec = []; ghost.recAt = 0; ghost.idx = 0;
  ghost.play = ghostEnabled() && ghost.best.rec.length > 0;
  ghost.x = W / 2; ghost.bx = -1; ghost.by = -1; ghost.scoreNow = 0;
}
function stopGhost() { ghost.play = false; }
function updateGhost(dt) {
  // Kayıt: yalnızca klasik oyunda, saniyede 5 örnek.
  if (ghostEnabled() && state.mode === "playing") {
    ghost.recAt += dt;
    if (ghost.recAt >= 0.2) {
      ghost.recAt = 0;
      const b = balls.find(x => !x.stuck && !x.decoy);
      if (ghost.runRec.length < 2400) ghost.runRec.push([Math.round(state.time * 10), Math.round(paddle.x),
        b ? Math.round(b.x) : -1, b ? Math.round(b.y) : -1, Math.round(state.score)]);
    }
  }
  // Oynatma: en iyi kaydı zaman çizelgesinde interpolasyonla izle.
  if (!ghost.play || !ghostEnabled() || !ghost.best.rec.length) return;
  const rec = ghost.best.rec, t = state.time * 10;
  while (ghost.idx < rec.length - 1 && rec[ghost.idx + 1][0] <= t) ghost.idx++;
  const a = rec[ghost.idx], b = rec[Math.min(ghost.idx + 1, rec.length - 1)];
  const f = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 0;
  const lerp = (i) => a[i] + (b[i] - a[i]) * f;
  ghost.x = lerp(1); ghost.bx = lerp(2); ghost.by = lerp(3); ghost.scoreNow = Math.round(lerp(4));
}
function drawGhost() {
  if (!ghost.play || !ghostEnabled() || !ghost.best.rec.length) return;
  ctx.globalAlpha = 0.28;
  fillRR(ghost.x, paddle.y, paddle.w, paddle.h, 7, "#9aa5b1");
  if (ghost.bx >= 0 && ghost.by >= 0) {
    circle(ghost.bx, ghost.by, 7, "#9aa5b1");
    circle(ghost.bx - 2, ghost.by - 2, 2, "rgba(255,255,255,0.7)");
  }
  ctx.globalAlpha = 0.65;
  text("👻", ghost.x + paddle.w / 2, paddle.y - 8, "bold 11px monospace", "#9aa5b1");
  ctx.globalAlpha = 1;
}
function finishGhostRun() {
  if (!ghostEnabled() || ghost.runRec.length < 2 || state.score <= ghost.best.score) return false;
  ghost.best = { rec: ghost.runRec.slice(), score: state.score, level: state.level, date: Date.now() };
  saveGhost();
  return true;
}

// --- Paylaşım kodu: BBG1: + base64(JSON). 2.5 Hz'e seyreltilir. ---
function encodeGhost() {
  if (!ghost.best.rec.length) return "";
  const rec = ghost.best.rec.filter((_, i) => i % 2 === 0);
  const data = { s: ghost.best.score, l: ghost.best.level, r: rec };
  return "BBG1:" + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}
function importGhost(code) {
  try {
    const raw = String(code || "").trim();
    if (!raw.startsWith("BBG1:")) return false;
    const data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(5)))));
    if (!data || !Array.isArray(data.r)) return false;
    const rec = data.r.filter(s => Array.isArray(s) && s.length >= 5 && s.every(Number.isFinite))
      .slice(0, 2400).sort((a, b) => a[0] - b[0]);
    if (rec.length < 2) return false;
    ghost.best = { rec, score: Math.max(0, Math.round(+data.s) || 0), level: Math.max(1, Math.round(+data.l) || 1), date: Date.now() };
    saveGhost();
    renderGhost();
    return true;
  } catch (e) { return false; }
}

// --- Meydan Okuma panelindeki hayalet bölümü ---
const ghostCard = $("ghost-card"), ghostCode = $("ghost-code"), ghostMsg = $("ghost-msg");
function renderGhost() {
  if (!ghostCard) return;
  const b = ghost.best;
  ghostCard.textContent = b.rec.length
    ? "👻 En iyi hayalet: " + b.score + " puan · bölüm " + b.level + (b.date ? " · " + new Date(b.date).toLocaleDateString("tr-TR") : "")
    : "Henüz hayalet yok — bir klasik koşu tamamla; en iyi skorun burada saklanır.";
  ghostMsg.textContent = "";
}
onClick("ghost-export", () => {
  const code = encodeGhost();
  if (!code) { ghostMsg.textContent = "⚠️ Önce bir klasik koşu tamamla."; return; }
  ghostCode.value = code;
  ghostCode.select();
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => (ghostMsg.textContent = "📋 Hayalet kodu panoya kopyalandı."), () => (ghostMsg.textContent = "Kodu kutudan kopyala."));
  else ghostMsg.textContent = "Kodu kutudan kopyala.";
});
onClick("ghost-import", () => {
  if (importGhost(ghostCode.value)) ghostMsg.textContent = "📥 Hayalet yüklendi — bir sonraki klasik koşuda yarışır.";
  else ghostMsg.textContent = "⚠️ Geçersiz hayalet kodu.";
});
onClick("ghost-clear", () => {
  ghost.best = { rec: [], score: 0, level: 1, date: 0 };
  saveGhost(); renderGhost();
  ghostMsg.textContent = "🗑 Hayalet silindi.";
});
renderGhost();
