// ======================================================================
// 7. OYUN AKIŞI: bölüm kurma, oyun başlatma, can/bölüm geçişleri, duraklatma
// ======================================================================
// Harita karakteri → tuğla türü (rakamlar: o kadar vuruşluk sıradan tuğla)
const BRICK_TYPES = {
  X: { unbreakable: true, hp: Infinity }, E: { explosive: true, hp: 1 }, Z: { electric: true, hp: 2 },
  $: { gold: true, hp: 2 }, "+": { splitter: true, hp: 1 },
};
function makeBrick(r, c, ch) {
  const x = BRICK.left + c * (BRICK.w + BRICK.gap);
  const b = { x, baseX: x, y: BRICK.top + r * (BRICK.h + BRICK.gap), row: r, col: c, dead: false, cracks: null, flash: 0,
              ...(BRICK_TYPES[ch] || { hp: clamp(parseInt(ch) || 1, 1, 3) }) };
  b.maxHp = b.hp;
  return b;
}
// Özel tuğlaların rengi temadan bağımsız sabit kimlik taşır
function brickColor(b) {
  if (b.unbreakable) return T().un;
  if (b.explosive) return T().ex;
  if (b.electric) return "#7b2cbf";
  if (b.gold) return "#ffc300";
  if (b.splitter) return "#06d6a0";
  return settings.brickColor === "gokkusagi" ? hslHex(b.row * 40 + b.col * 9, 78, 46 + b.hp * 8) : hpColor(b.hp);
}

function buildLevel(n) {
  const def = LEVELS[(n - 1) % LEVELS.length], cycle = Math.floor((n - 1) / LEVELS.length);
  const map = Array.isArray(def) ? def : def.map;
  bricks = [];
  movingRows = [];
  map.forEach((line, r) => {
    const row = [];
    for (let c = 0; c < COLS; c++) if (line[c] && line[c] !== "." && line[c] !== " ") row.push(makeBrick(r, c, line[c]));
    bricks.push(...row);
    // Kayan sıra: sıranın tamamı birlikte kayar, kenarlara taşmayacak genlikle
    if (line[10] === ">" && row.length) {
      const amp = Math.min(Math.min(...row.map(b => b.baseX)) - 14, W - 14 - Math.max(...row.map(b => b.baseX + BRICK.w)), 140);
      if (amp > 4) movingRows.push({ row: r, amp, speed: 1.1 + r * 0.17 + cycle * 0.2, phase: r * 1.3 });
    }
  });
  state.boss = def.boss ? makeBoss(def.boss, cycle) : null;
  buildZones(n);
  state.buildFade = 0;          // tuğlalar satır satır belirsin
}
function makeBoss(spec, cycle) {
  const hp = Math.round(spec.hp * (1 + 0.5 * cycle));
  return { name: spec.name, hp, maxHp: hp, w: 200, h: 62, x: W / 2 - 100, y: 78, baseY: 78, vx: spec.speed * (1 + 0.15 * cycle),
           shootEvery: spec.shootEvery, shootAt: 2.5, minionAt: 6, t: 0, flash: 0, enraged: false, dead: false };
}
// Duvar bölgeleri: tampon (hız patlaması), falso (kavis), portal (karşı duvardan çıkar); bölüm numarasıyla tohumlanır
function buildZones(n) {
  zones = [];
  const rand = seeded(n * 9973 + 7), slots = { L: [90, 170, 250, 330, 410], R: [90, 170, 250, 330, 410] };
  const add = (side, type) => {
    const s = slots[side];
    if (!s.length) return null;
    const z = { side, type, y: s.splice((rand() * s.length) | 0, 1)[0], h: 70, flash: 0, link: null };
    zones.push(z);
    return z;
  };
  add("L", "bumper");
  add("R", "bumper");
  if (n >= 2) add(rand() < 0.5 ? "L" : "R", "spin");
  if (n >= 3) {
    const a = add("L", "portal"), b = add("R", "portal");
    if (a && b) { a.link = b; b.link = a; } else zones = zones.filter(z => z !== a && z !== b);
  }
  for (let i = 0; i < Math.min(Math.floor((n - 3) / 2), 3); i++) add(rand() < 0.5 ? "L" : "R", rand() < 0.6 ? "bumper" : "spin");
}
const isLevelDone = () => (state.boss ? state.boss.dead : bricks.every(b => b.dead || b.unbreakable));
const checkLevelDone = () => { if (state.mode === "playing" && isLevelDone()) levelCleared(); };

// Süreli efektleri, mermileri, delikleri, lanetleri temizler (can kaybı, bölüm geçişi, yeni oyun)
function clearEffects() {
  for (const k of TIMERS) state[k + "Until"] = 0;
  paddle.wideUntil = state.shield = 0;
  state.pendingMulti = false;
  lasers = []; bullets = []; holes = []; bolts = []; obstacles = [];
  state.curses = {}; state.pendingCurse = null; state.ufo = null;
  paddle.iceV = 0; paddle.aimX = null;
}
function addScore(n) {
  state.score += n;
  if (state.score > state.high) store.set("bb_highscore", (state.high = state.score));
}

function startGame() {
  resetRun();
  const diff = DIFFICULTY[settings.difficulty];
  Object.assign(state, { level: 1, score: 0, diffSpeed: diff.speedMul, lives: diff.lives, combo: 0, startHigh: state.high,
                         newRecord: false, time: 0, shake: 0, callout: null, cursesSurvived: 0, inset: 0 });
  state.speed = levelSpeed(1);
  clearEffects();
  paddle.x = W / 2 - PADDLE_W / 2;
  paddle.w = paddle.targetW = PADDLE_W;
  powerups = []; particles = []; fragments = []; floaters = [];
  buildLevel(1);
  serveBall();
  callout("BÖLÜM 1", T().accent);
}
function toMenu() {
  state.mode = "menu";
  state.callout = null;
  state.inset = 0;
  clearEffects();
  buildLevel(1);
  powerups = []; particles = []; fragments = []; floaters = [];
  balls = [newBall(true)];
}
function serveBall() {
  state.mode = "serve";
  balls = [newBall(true)];
  powerups = []; bullets = []; lasers = [];   // düşen kapsüller bölüm/can geçişinde taşınmaz
}
// Yapışık topu fırlat: raketteki konumuna göre açı (servis topu ortada: rastgele ±25°)
function releaseBall(b) {
  b.stuck = false;
  const ang = b.stuckOff ? clamp(b.stuckOff / (paddle.w / 2), -1, 1) * (Math.PI / 3) : rnd(-0.45, 0.45);
  b.dx = mag() * Math.sin(ang);
  b.dy = -mag() * Math.cos(ang);
  b.stuckOff = 0;
}
// Yapışıkken yakalanan ÇOKLU kapsülü boşa gitmez: fırlatınca çoğalır
function releasePendingMulti() {
  if (state.pendingMulti) { state.pendingMulti = false; splitBalls(); }
}
// Mıknatısla yakalanan topları bırak (oyun sırasında tık/boşluk)
function releaseCaught() {
  const caught = balls.filter(b => b.stuck);
  if (!caught.length) return;
  caught.forEach(releaseBall);
  sfx("launch");
  releasePendingMulti();
}
function launchBall() {
  balls.filter(b => b.stuck).forEach(releaseBall);
  releasePendingMulti();
  scheduleNextCurse(true);      // bölüm/can başında lanetlerden önce nefes payı
  state.mode = "playing";
  sfx("launch");
}
function loseLife() {
  run.lifeLost++;
  sfx("lose");
  addShake(6);
  state.combo = 0;
  clearEffects();
  state.speed = levelSpeed(state.level);   // hızlanmayı sıfırla
  if (--state.lives <= 0) gameOver(); else serveBall();
}
function gameOver() {
  state.mode = "gameover";
  state.newRecord = state.score > state.startHigh && state.score > 0;
  sfx("gameover");
  if (battle.active) battleEliminated();   // kapışmada elendin
  else { state.lbRank = recordScore("klasik", { score: state.score, level: state.level }); careerGameEnd(); }
}
function levelCleared() {
  if (state.mode !== "playing") return;    // aynı karede iki kez tetiklenmesin
  addScore(500);
  state.mode = "levelclear";
  state.clearAt = state.time + 1.8;
  state.slowmo = Math.max(state.slowmo, 1.1);   // son tuğla ağır çekimde dağılsın
  sfx("level");
  battleCharge(6);
}
function nextLevel() {
  state.level++;
  trackBest("bestLevel", state.level);
  state.speed = levelSpeed(state.level);
  clearEffects();
  buildLevel(state.level);
  serveBall();
  if (settings.autoTheme === "bolum") randomTheme();
  if (state.boss) { callout("⚠ " + state.boss.name + " ⚠", "#ff4d6d"); sfx("bossRoar"); }
  else callout("BÖLÜM " + state.level, T().accent);
}

function pauseGame() {
  if (battle.active && battle.online) return;   // çevrim içi maçta zaman durmaz
  if (state.mode !== "playing" && state.mode !== "serve") return;
  state.prevMode = state.mode;
  state.mode = "paused";
}
const resumeGame = () => { if (state.mode === "paused") state.mode = state.prevMode || "serve"; };
const togglePause = () => (state.mode === "paused" ? resumeGame() : pauseGame());

// Tık / boşluk / dokunuş: o anki ekrana göre ilerle
function action() {
  switch (state.mode) {
    case "menu": startGame(); break;
    case "serve": if (!(battle.active && battle.countdown > 0)) launchBall(); break;
    case "playing": releaseCaught(); break;
    case "paused": resumeGame(); break;
    case "levelclear": state.clearAt = state.time; break;     // beklemeden geç
    case "gameover":
      if (battle.active && !battle.over) break;              // izleyici: maç bitene kadar bekle
      if (battle.active) closeBattle();
      toMenu();
  }
}
