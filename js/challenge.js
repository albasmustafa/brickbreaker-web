// ======================================================================
// 20. MEYDAN OKUMA: bölüm seçimi, pratik koşular ve günlük meydan okuma
// ======================================================================
const challengePanel = $("challengepanel");
const levelGrid = $("level-grid");
const dailyCard = $("daily-card");
const dailyStartBtn = $("daily-start");

// --- Günlük meydan okuma: yerel tarih, tek deneme, seri ---
const dayPad = n => String(n).padStart(2, "0");
const dayString = d => d.getFullYear() + "-" + dayPad(d.getMonth() + 1) + "-" + dayPad(d.getDate());
const localDate = () => dayString(new Date());
// Öğlen 12'yi kullan: yaz saati geçişlerinde gün kaymasın
const yesterdayOf = today => {
  const d = new Date(today + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return dayString(d);
};
const streakAfter = (last, streak, today) => (last === today ? streak : last === yesterdayOf(today) ? streak + 1 : 1);

const daily = { date: "", used: false, score: 0, best: 0, streak: 0, last: "" };
(() => {
  const v = store.get("bb_daily", null);
  if (!v || typeof v !== "object") return;
  const validDay = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const num = n => Number.isFinite(+n) && +n > 0 ? Math.floor(+n) : 0;
  if (validDay(v.date)) daily.date = v.date;
  if (validDay(v.last)) daily.last = v.last;
  daily.used = !!v.used;
  daily.score = num(v.score);
  daily.best = num(v.best);
  daily.streak = num(v.streak);
})();
const saveDaily = () => store.set("bb_daily", daily);
const dailyUsed = () => daily.date === localDate() && daily.used;
const hazardLevel = () => (run.daily ? "kabus" : settings.hazards);
const currentStreak = () => {
  const today = localDate();
  return daily.last === today || daily.last === yesterdayOf(today) ? daily.streak : 0;
};

function startDaily() {
  const today = localDate();
  if (daily.date === today && daily.used) return false;
  if (run.daily) finishDaily();
  closePanels();
  if (battle.active) closeBattle();
  daily.streak = streakAfter(daily.last, daily.streak, today);
  daily.last = today;
  daily.date = today;
  daily.used = true;
  daily.score = 0;
  saveDaily();
  startGame();
  run.daily = true;
  stopGhost();
  state.lives = 1;
  state.diffSpeed = 1.15;
  state.speed = levelSpeed(1);
  buildLevel(1);                    // günlük haritası tohumdan kurulur (startGame daily bayrağını sıfırlamıştı)
  startDirectorChallenge(1);        // görev de tohumdan gelen duvara göre seçilsin
  callout(tr("☀️ GÜNLÜK MEYDAN OKUMA"), "#ffd166");
  return true;
}

function finishDaily() {
  if (!run.daily || run.dailyFinished) return;
  run.dailyFinished = true;
  daily.score = state.score;
  daily.best = Math.max(daily.best, daily.score);
  daily.used = true;
  saveDaily();
  renderChallenge();
}

// Klasik oyunda ulaşılan en ileri bölüm; 1 her zaman açık
function unlockedLevel() {
  return clamp(Math.max(1, Math.round(career.stats.bestLevel) || 0), 1, LEVELS.length);
}

// Pratik koşu: rekor, liderlik tablosu, kariyer sayaçları ve başarımlar sayılmaz
function startPractice(level, anyLevel) {
  level = Math.round(level);
  if (!(level >= 1 && level <= (anyLevel ? LEVELS.length : unlockedLevel()))) return false;
  closePanels();
  if (battle.active) closeBattle();
  startGame();
  run.practice = true;
  stopGhost();
  if (level > 1) { state.level = level - 1; nextLevel(); }
  return true;
}

function renderChallenge() {
  const max = unlockedLevel();
  levelGrid.replaceChildren(...LEVELS.map((def, i) => {
    const n = i + 1, locked = n > max, boss = !!def.boss;
    return el("button", {
      className: n === max ? "active" : "",
      textContent: (boss ? "☠ " : def.pixel ? "🌀 " : "") + n,
      title: locked ? tr("Önce klasik oyunda {n}. bölüme ulaş", { n }) : tr("Bölüm {n} pratiği", { n }),
      disabled: locked,
      onclick: () => startPractice(n),
    });
  }));
  const used = dailyUsed();
  const todayLabel = new Date().toLocaleDateString(LOCALE, { day: "numeric", month: "long" });
  dailyCard.replaceChildren(
    el("strong", { textContent: used ? tr("Bugünkü deneme kullanıldı") : tr("Bugünün koşusu hazır") }),
    el("span", { textContent: todayLabel + " · " + tr("1 can · Kabus lanetleri · +%15 hız") }),
    el("span", { textContent: tr("En iyi {best} · Seri {n} gün", { best: daily.best, n: currentStreak() }) }),
  );
  dailyStartBtn.disabled = used;
  dailyStartBtn.textContent = used ? tr("☀️ Bugünkü deneme kullanıldı") : tr("☀️ Bugünün koşusunu başlat");
  if (typeof renderGhost === "function") renderGhost();
  if (typeof renderWeekly === "function") renderWeekly();
  if (typeof renderSong === "function") renderSong();
}

setupPanel(challengePanel, tr("🎯 Meydan Okuma"));
const challengeBtn = el("button", {
  textContent: tr("🎯 Meydan"),
  title: tr("Bölüm seçimi, pratik ve günlük meydan okuma"),
  onclick: () => togglePanel(challengePanel, renderChallenge),
});
toolbar.insertBefore(challengeBtn, careerBtn);
onClick("daily-start", startDaily);
// Tünel Fırtınası her zaman pratik olarak açık (klasik oyunda 12. bölüm)
const TUNNEL_LEVEL = LEVELS.findIndex(l => l.pixel) + 1;
onClick("tunnel-start", () => startPractice(TUNNEL_LEVEL, true));
renderChallenge();
