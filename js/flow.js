// ======================================================================
// 7. OYUN AKIŞI: bölüm kurma, oyun başlatma, can/bölüm geçişleri, duraklatma
// ======================================================================
// Harita karakteri → tuğla türü (rakamlar: o kadar vuruşluk sıradan tuğla)
// H = yenilenen (yarım kalınca canını geri kazanır) · A = kalkanlı (top yavaş aşındırır, ateş/lazer hemen söker)
// T = ikiz (eşiyle birlikte kırılır) · I = buz (kırılınca komşuları donar; ateşte anında erir)
// V = virüs (komşularını sürekli güçlendirir) · S = şifacı (boss'u ve komşularını onarır)
const BRICK_TYPES = {
  X: { unbreakable: true, hp: Infinity }, E: { explosive: true, hp: 1 }, Z: { electric: true, hp: 2 },
  $: { gold: true, hp: 2 }, "+": { splitter: true, hp: 1 },
  H: { regen: true, hp: 2 }, A: { armored: true, hp: 1 }, T: { twin: true, hp: 1 },
  I: { ice: true, hp: 2 }, V: { virus: true, hp: 2 }, S: { healer: true, hp: 2 },
};
const ARMOR_HITS = 4;   // kalkanlı tuğlanın kalkanı kaç normal vuruşta söker
function makeBrick(r, c, ch) {
  const x = BRICK.left + c * (BRICK.w + BRICK.gap);
  const special = BRICK_TYPES[ch];
  const b = { x, baseX: x, y: BRICK.top + r * (BRICK.h + BRICK.gap), row: r, col: c, dead: false, cracks: null, flash: 0,
              ...(special || { hp: clamp((parseInt(ch) || 1) + pactMods().brickHpAdd, 1, 3) }) };   // SERT TUĞLALAR paktı: sıradan tuğlalar +1 can
  if (b.armored) b.armorHp = b.maxArmor = ARMOR_HITS;
  if (b.twin) b.wasTwin = true;
  if (b.virus) b.spreadAt = 0;
  if (b.healer) b.healPulseAt = 0;
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
  if (b.regen) return "#43aa8b";
  if (b.armored) return "#4361ee";
  if (b.wasTwin) return "#f72585";
  if (b.ice) return "#90e0ef";
  if (b.virus) return "#a3e635";
  if (b.healer) return "#f4978e";
  return settings.brickColor === "gokkusagi" ? hslHex(b.row * 40 + b.col * 9, 78, 46 + b.hp * 8) : hpColor(b.hp);
}

// İkiz tuğlalar: kalan T'leri en yakınıyla çiftler (tek kalırsa öksüz normal davranır).
// b.twin eşlenmemişse true (tür bayrağı), eşlenmişse tuğla nesnesi — bu yüzden nesne denetimi yapılır.
function linkTwins() {
  const paired = v => v && typeof v === "object";
  const singles = bricks.filter(b => b.twin && !b.dead && !paired(b.twin));
  for (const b of singles) {
    if (paired(b.twin)) continue;
    let best = null, bd = Infinity;
    for (const o of singles) {
      if (o === b || paired(o.twin)) continue;
      const d = (o.col - b.col) ** 2 + (o.row - b.row) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
    if (best) { b.twin = best; best.twin = b; }
  }
}
// VİRÜS SALGINI paktı: bölümün sıradan tuğlalarından birkaçını virüse çevirir
function seedVirusBricks(n) {
  const count = pactMods().virusBricks;
  if (!count) return;
  const plain = bricks.filter(b => !b.dead && !b.unbreakable && !b.explosive && !b.electric && !b.gold &&
                                   !b.splitter && !b.regen && !b.armored && !b.twin && !b.ice && !b.virus && !b.healer);
  for (let i = 0; i < count && plain.length; i++) {
    const b = plain.splice((gameRandom() * plain.length) | 0, 1)[0];
    Object.assign(b, BRICK_TYPES.V, { hp: 2, maxHp: 2, spreadAt: 0, cracks: null, colFade: 0 });
  }
}

function buildLevel(n) {
  // Şarkı bölümü ya da editörden test koşusu: hazır harita, döngü/tohum/piksel duvar yok
  const song = (typeof songLevel !== "undefined" && songLevel.active && songLevel.levels[n - 1]) ||
               (typeof editorPlayDef === "function" && editorPlayDef(n));
  const def = song || LEVELS[(n - 1) % LEVELS.length], cycle = song ? 0 : Math.floor((n - 1) / LEVELS.length);
  // Günlük/haftalık koşuda bölümler tohumdan üretilir: aynı tohum = aynı simetrik duvar
  const proc = !song && (run.daily || (typeof weekly !== "undefined" && weekly.active)) && Array.isArray(def);
  const map = proc ? proceduralMap(run.daily ? weekHash(daily.date) : weekly.seed, n) : (Array.isArray(def) ? def : def.map || []);
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
  seedVirusBricks(n);       // VİRÜS SALGINI paktı: klasik koşuda da her bölümde virüs ekler (pakt yoksa dokunmaz)
  linkTwins();
  state.boss = def.boss ? makeBoss(def.boss, cycle) : null;
  buildPixelWall(!song && def.pixel);   // TÜNEL FIRTINASI duvarı (diğer bölümlerde kapanır)
  buildZones(n);
  state.buildFade = 0;          // tuğlalar satır satır belirsin
}
function makeBoss(spec, cycle) {
  const hp = Math.round(spec.hp * (1 + 0.5 * cycle) * pactBossHpMul());
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
const isLevelDone = () => (state.boss ? state.boss.dead : bricks.every(b => b.dead || b.unbreakable) && pxDone());
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
  state.score += Math.round(n * pactScoreMul());
  if (!run.practice && state.score > state.high) store.set("bb_highscore", (state.high = state.score));
  // Rekoru ilk geçtiğin an duyurulur (callout değil: combo/bölüm yazılarını ezmesin)
  if (!run.practice && !state.recordShown && state.startHigh > 0 && state.score > state.startHigh) {
    state.recordShown = true;
    toast(tr("🏆 Rekoru geçtin!"), tr("eski rekor {n}", { n: state.startHigh }), T().b2);
    sfx("achieve");
  }
}

function startGame() {
  if (typeof weekly !== "undefined" && !weekly.starting) stopWeekly();
  if (typeof songLevel !== "undefined" && !songLevel.starting) stopSongLevel();
  if (typeof editor !== "undefined" && !editor.starting) stopEditorPlay();
  if (run.daily && typeof finishDaily === "function") finishDaily();
  resetRun();
  const diff = DIFFICULTY[settings.difficulty];
  Object.assign(state, { level: 1, score: 0, diffSpeed: diff.speedMul, lives: diff.lives, combo: 0, startHigh: state.high,
                         newRecord: false, recordShown: false, time: 0, shake: 0, callout: null, cursesSurvived: 0, inset: 0, hurt: 0 });
  state.speed = levelSpeed(1);
  clearEffects();
  paddle.x = W / 2 - PADDLE_W / 2;
  paddle.w = paddle.targetW = PADDLE_W;
  powerups = []; particles = []; fragments = []; floaters = []; confetti = [];
  buildLevel(1);
  resetDirectorRun();
  startDirectorChallenge(1);
  resetGhostRun();
  serveBall();
  callout(tr("BÖLÜM {n}", { n: 1 }), T().accent);
}
function toMenu() {
  const backToEditor = run.custom;          // editör testinden dönünce editör yeniden açılır
  if (run.daily && typeof finishDaily === "function") finishDaily();
  run.daily = false;
  run.dailyFinished = false;
  run.practice = false;
  hidePactOffer();
  hideLastChance();
  director.challenge = null;
  stopGhost();
  stopWeekly();
  stopSongLevel();
  if (typeof stopEditorPlay === "function") stopEditorPlay();
  flushCodex();
  state.mode = "menu";
  state.callout = null;
  state.inset = 0;
  state.hurt = 0;
  clearEffects();
  buildLevel(1);
  powerups = []; particles = []; fragments = []; floaters = [];
  balls = [newBall(true)];
  if (backToEditor && typeof openEditor === "function") openEditor();
}
function serveBall() {
  state.mode = "serve";
  balls = [newBall(true)];
  powerups = []; bullets = []; lasers = [];   // düşen kapsüller bölüm/can geçişinde taşınmaz
  showPactOffer();                            // bölüm başında risk/ödül seçenekleri
}
// Yapışık topu fırlat: raketteki konumuna göre açı (servis topu ortada: rastgele ±25°)
function releaseBall(b) {
  b.stuck = false;
  const ang = b.stuckOff ? clamp(b.stuckOff / (paddle.w / 2), -1, 1) * (Math.PI / 3) : grnd(-0.45, 0.45);
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
  hidePactOffer();              // seçim yapılmadıysa pakt yok
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
  state.hurt = 1;                          // cila: kenarlarda sönen kırmızı vinyet
  state.combo = 0;
  clearEffects();
  state.speed = levelSpeed(state.level);   // hızlanmayı sıfırla
  if (--state.lives <= 0) { if (!showLastChance()) gameOver(); } else serveBall();
}
function gameOver() {
  hidePactOffer();
  hideLastChance();
  failDirectorChallenge();
  finishGhostRun();
  const wasWeekly = weekly.active;
  if (wasWeekly) finishWeekly();
  if (run.song) stopSongLevel();
  flushCodex();
  state.mode = "gameover";
  state.newRecord = !run.practice && !wasWeekly && !run.song && state.score > state.startHigh && state.score > 0;
  if (state.newRecord) spawnConfetti(W / 2, H / 2 - 60, 60);   // cila: yeni rekor konfetisi
  sfx("gameover");
  if (battle.active) battleEliminated();   // kapışmada elendin
  else if (run.practice || wasWeekly || run.song) state.lbRank = 0;
  else { state.lbRank = recordScore("klasik", { score: state.score, level: state.level }); careerGameEnd(); }
  if (run.daily && typeof finishDaily === "function") finishDaily();
}
function levelCleared() {
  if (state.mode !== "playing") return;    // aynı karede iki kez tetiklenmesin
  addScore(500);
  spawnConfetti(W / 2, H / 2 - 40, 46);    // cila: konfeti yağmuru
  directorLevelEnd();
  state.mode = "levelclear";
  state.clearAt = state.time + 1.8;
  state.slowmo = Math.max(state.slowmo, 1.1);   // son tuğla ağır çekimde dağılsın
  if (pxWall.active) pxWin();                  // Congratulations You win! + 3 yıldız
  sfx("level");
  battleCharge(6);
}
function nextLevel() {
  if (run.custom) { editorComplete(); return; }   // editör bölümü tek bölümdür
  if (typeof songLevel !== "undefined" && songLevel.active && state.level >= songLevel.levels.length) { songComplete(); return; }
  state.level++;
  trackBest("bestLevel", state.level);
  state.speed = levelSpeed(state.level);
  clearEffects();
  buildLevel(state.level);
  startDirectorChallenge(state.level);
  serveBall();
  if (settings.autoTheme === "bolum") randomTheme();
  if (state.boss) { callout("⚠ " + tr(state.boss.name) + " ⚠", "#ff4d6d"); sfx("bossRoar"); }
  else if (pxWall.active) callout(tr("🌀 TÜNEL FIRTINASI"), "#4cc9f0");
  else callout(tr("BÖLÜM {n}", { n: state.level }), T().accent);
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
