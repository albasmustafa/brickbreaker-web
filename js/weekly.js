// ======================================================================
// 26. HAFTALIK KAOS TOHUMU: her hafta aynı tohumla klasik koşu.
//     Oyun içi rastgelelik tohumlanır; skorlar aynı koşullarda karşılaştırılır.
// ======================================================================
const weekly = { active: false, starting: false, finished: false, key: "", seed: 0, best: 0, last: null, attempts: 0 };
const weekPad = n => String(n).padStart(2, "0");
function weekKey(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));   // pazartesi
  return x.getFullYear() + "-" + weekPad(x.getMonth() + 1) + "-" + weekPad(x.getDate());
}
function weekHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const weekSeed = () => { const key = weekKey(); return { key, seed: weekHash(key) }; };
function loadWeekly() {
  const wk = weekSeed(), v = store.get("bb_weekly", null);
  weekly.key = wk.key; weekly.seed = wk.seed;
  if (v && v.key === wk.key) {
    weekly.best = Math.max(0, Math.round(+v.best) || 0);
    weekly.attempts = Math.max(0, Math.round(+v.attempts) || 0);
    weekly.last = v.last && Number.isFinite(+v.last.score) ? v.last : null;
  } else { weekly.best = 0; weekly.attempts = 0; weekly.last = null; }
}
const saveWeekly = () => store.set("bb_weekly", { key: weekly.key, best: weekly.best, last: weekly.last, attempts: weekly.attempts });
loadWeekly();

function startWeekly() {
  if (weekly.active) return false;
  const wk = weekSeed();
  weekly.key = wk.key; weekly.seed = wk.seed;
  weekly.active = true; weekly.finished = false; weekly.starting = true; weekly.last = null;
  weekly.attempts++;
  saveWeekly();
  gameRandom = seeded(wk.seed);       // oyun içi rastgelelik: aynı tohum = aynı koşu
  closePanels();
  if (battle.active) closeBattle();
  startGame();
  weekly.starting = false;
  callout(tr("🗓 HAFTALIK TOHUM"), "#ffd166");
  renderWeekly();
  return true;
}
function finishWeekly() {
  if (!weekly.active || weekly.finished) return;
  weekly.finished = true;
  weekly.last = { score: state.score, level: state.level, date: Date.now() };
  weekly.best = Math.max(weekly.best, state.score);
  saveWeekly();
  gameRandom = Math.random;
  renderWeekly();
}
function stopWeekly() {
  weekly.active = false; weekly.finished = false; weekly.starting = false;
  gameRandom = Math.random;
}
const weeklyCode = () => "BBW1:" + weekly.key + ":" + (weekly.last ? weekly.last.score : 0) + ":" + (weekly.last ? weekly.last.level : 0);

const weeklyCard = $("weekly-card"), weeklyCodeBox = $("weekly-codebox");
function renderWeekly() {
  if (!weeklyCard) return;
  const wk = weekSeed();
  if (!weekly.active && weekly.key !== wk.key) loadWeekly();
  const last = weekly.last ? " · " + tr("son {score} puan (bölüm {level})", { score: weekly.last.score, level: weekly.last.level }) : "";
  weeklyCard.replaceChildren(
    el("strong", { textContent: tr("Tohum: {key}", { key: wk.key }) }),
    el("span", { textContent: tr("Aynı bölümler, aynı kapsül sırası · en iyi {best} · deneme {n}", { best: weekly.best, n: weekly.attempts }) + last }),
  );
  const btn = $("weekly-start");
  if (btn) { btn.disabled = weekly.active; btn.textContent = weekly.active ? tr("🗓 Koşu sürüyor...") : tr("🗓 Bu haftanın tohumunu oyna"); }
}
onClick("weekly-start", startWeekly);
onClick("weekly-code", () => {
  if (!weekly.last) { $("weekly-msg").textContent = tr("⚠️ Önce haftalık bir koşu tamamla."); return; }
  const code = weeklyCode();
  weeklyCodeBox.value = code;
  weeklyCodeBox.select();
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => ($("weekly-msg").textContent = tr("📋 Sonuç kodu panoya kopyalandı.")), () => ($("weekly-msg").textContent = tr("Kodu kutudan kopyala.")));
  else $("weekly-msg").textContent = tr("Kodu kutudan kopyala.");
});
renderWeekly();
