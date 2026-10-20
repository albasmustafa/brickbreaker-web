// ======================================================================
// 23. DRAMATURG: her bölüme küçük bir görev koyar, koşuya ritim katar.
//     Görevler isteğe bağlıdır; tamamlanınca puan + iyi kapsül verir.
//     Ayrıca oyuncu zorlanınca "nefes" ve ara ara "gösteri" anları yaratır.
// ======================================================================
const director = { challenge: null, story: [], tick: 0, lastMercy: -99, lastSpectacle: -99, completed: 0 };
const directorEnabled = () => settings.director !== "kapali";
function resetDirectorRun() {
  Object.assign(director, { challenge: null, story: [], tick: 0, lastMercy: -99, lastSpectacle: -99, completed: 0 });
}

function makeDirectorChallenge(level) {
  const pool = [];
  if (state.boss) {
    pool.push({ id: "boss", text: "Boss'u 30 sn içinde yen", target: 30, reward: 1500 });
  } else {
    pool.push({ id: "bricks", text: (8 + level * 2) + " tuğla kır", target: 8 + level * 2, reward: 300 + level * 80 });
    pool.push({ id: "noLose", text: "Bu bölümü can kaybetmeden bitir", target: 0, reward: 800 });
    if (level >= 2) pool.push({ id: "combo", text: "Bir kez 8 combo yap", target: 8, reward: 500 });
    if (bricks.some(b => b.gold)) pool.push({ id: "gold", text: "2 altın tuğla kır", target: 2, reward: 600 });
    if (hazardLevel() !== "kapali") pool.push({ id: "curse", text: "Bir lanet atlat", target: 1, reward: 400 });
  }
  const c = pick(pool);
  return { ...c, startBricks: run.bricks, startGold: run.goldBricks || 0, startCurses: state.cursesSurvived,
           startLifeLost: run.lifeLost, startTime: state.time, maxCombo: 0, done: false };
}
function startDirectorChallenge(level) {
  if (!directorEnabled()) { director.challenge = null; return null; }
  director.challenge = makeDirectorChallenge(level);
  director.tick = 0;
  return director.challenge;
}
function directorProgress(c) {
  if (!c) return [0, 0];
  if (c.id === "bricks") return [clamp(run.bricks - c.startBricks, 0, c.target), c.target];
  if (c.id === "gold") return [clamp((run.goldBricks || 0) - c.startGold, 0, c.target), c.target];
  if (c.id === "curse") return [clamp(state.cursesSurvived - c.startCurses, 0, c.target), c.target];
  if (c.id === "combo") return [clamp(c.maxCombo, 0, c.target), c.target];
  if (c.id === "boss") return [c.done ? c.target : Math.min(c.target, state.time - c.startTime), c.target];
  return [0, 0];
}
function completeDirectorChallenge() {
  const c = director.challenge;
  if (!c || c.done) return false;
  c.done = true;
  director.completed++;
  director.story.push(c.text + " — TAMAM");
  addScore(c.reward);
  if (c.id !== "noLose") dropPowerupAt(paddle.x + paddle.w / 2, paddle.y - 150, true);
  callout("🎬 " + c.text + " TAMAM! +" + c.reward, "#ffd166");
  sfx("level");
  track("director");
  return true;
}
function failDirectorChallenge() {
  const c = director.challenge;
  if (!c || c.done) return;
  director.story.push(c.text + " — kaçtı");
}
function directorLevelEnd() {
  const c = director.challenge;
  if (!c || c.done) return;
  if (c.id === "noLose" && run.lifeLost === c.startLifeLost) { completeDirectorChallenge(); return; }
  if (c.id === "boss" && state.boss && state.boss.dead && state.time - c.startTime <= c.target) { completeDirectorChallenge(); return; }
  failDirectorChallenge();
}
function updateDirector(dt) {
  if (!directorEnabled()) return;
  const c = director.challenge;
  if (c && !c.done) {
    c.maxCombo = Math.max(c.maxCombo, state.combo);
    const [v, target] = directorProgress(c);
    if (target > 0 && v >= target) completeDirectorChallenge();
  }
  // Ara ara dramatik anlar: oyuncu zorlanınca nefes, uzun sessizlikte gösteri.
  director.tick += dt;
  if (director.tick < 6) return;
  director.tick = 0;
  const low = state.lives <= 1;
  if (low && state.time - director.lastMercy > 30 && Math.random() < 0.5) {
    director.lastMercy = state.time;
    state.shield = Math.max(state.shield, 1);
    dropPowerupAt(paddle.x + paddle.w / 2, paddle.y - 150, true);
    callout("🎬 DRAMATURG: NEFES AL", "#64dfdf");
    director.story.push("Zor anda bir nefes");
  } else if (state.time - director.lastSpectacle > 40 && Math.random() < 0.35) {
    director.lastSpectacle = state.time;
    spawnCoins(W / 2, 120, 24);
    dropPowerupAt(W / 2, 120, true);
    callout("🎬 GÖSTERİ ZAMANI", "#ffd166");
    director.story.push("Sahne ışıkları");
  }
}
