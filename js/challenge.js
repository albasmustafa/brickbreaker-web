// ======================================================================
// 20. MEYDAN OKUMA: bölüm seçimi, pratik koşular ve günlük meydan okuma
// ======================================================================
const challengePanel = $("challengepanel");
const levelGrid = $("level-grid");
const dailyCard = $("daily-card");
const dailyStartBtn = $("daily-start");

// Klasik oyunda ulaşılan en ileri bölüm; 1 her zaman açık
function unlockedLevel() {
  return clamp(Math.max(1, Math.round(career.stats.bestLevel) || 0), 1, LEVELS.length);
}

// Pratik koşu: rekor, liderlik tablosu, kariyer sayaçları ve başarımlar sayılmaz
function startPractice(level) {
  level = Math.round(level);
  if (!(level >= 1 && level <= unlockedLevel())) return false;
  closePanels();
  if (battle.active) closeBattle();
  startGame();
  run.practice = true;
  if (level > 1) { state.level = level - 1; nextLevel(); }
  return true;
}

function renderChallenge() {
  const max = unlockedLevel();
  levelGrid.replaceChildren(...LEVELS.map((def, i) => {
    const n = i + 1, locked = n > max, boss = !Array.isArray(def);
    return el("button", {
      className: n === max ? "active" : "",
      textContent: (boss ? "☠ " : "") + n,
      title: locked ? "Önce klasik oyunda " + n + ". bölüme ulaş" : "Bölüm " + n + " pratiği",
      disabled: locked,
      onclick: () => startPractice(n),
    });
  }));
  // Günlük kartı Task 3'te doldurulur; panel bu arada kullanılabilir kalsın
  dailyCard.replaceChildren(el("div", { className: "setnote", textContent: "Günlük meydan okuma hazırlanıyor…" }));
  dailyStartBtn.disabled = true;
}

setupPanel(challengePanel, "🎯 Meydan Okuma");
const challengeBtn = el("button", {
  textContent: "🎯 Meydan",
  title: "Bölüm seçimi, pratik ve günlük meydan okuma",
  onclick: () => togglePanel(challengePanel, renderChallenge),
});
toolbar.insertBefore(challengeBtn, careerBtn);
renderChallenge();
