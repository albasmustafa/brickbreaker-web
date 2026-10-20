// Brick Breaker AI özellik testleri: her test temiz bir sayfada oyunun kendi fonksiyonlarını çağırır.
// "Hiçbir özellik kaybolmasın" güvencesi: her özellik en az bir testte doğrulanır.

// Sayfaya enjekte edilen yardımcılar: otomatik pilotlu simülasyon (top hiç NaN/dışarı olmamalı)
export const HELPERS = `
window.__sim = function (steps, auto) {
  const bad = [];
  for (let i = 0; i < steps; i++) {
    if (auto) {
      const live = balls.filter(b => !b.stuck && !b.decoy);
      const tgt = live.length ? live.reduce((a, b) => (b.y > a.y && b.dy > 0 ? b : a), live[0]) : null;
      if (tgt) { const px = clamp(tgt.x - paddle.w / 2 + Math.sin(state.time * 3) * paddle.w * 0.3, state.inset, W - state.inset - paddle.w); if (curseOn("buz")) paddle.aimX = px; else paddle.x = px; }
      if (state.mode === "serve" || (state.mode === "playing" && balls.some(b => b.stuck))) action();
      if (state.lives < 3) state.lives = 3;
    }
    if (["playing", "serve", "levelclear"].includes(state.mode)) update(STEP);
    if (i % 6 === 0) draw();
    for (const b of balls) {
      if (![b.x, b.y, b.dx, b.dy].every(isFinite)) bad.push("NaN");
      else if (b.x < state.inset - 30 || b.x > W - state.inset + 30 || b.y < -30) bad.push("dışarı " + Math.round(b.x) + "," + Math.round(b.y));
    }
    if (bad.length > 3) break;
  }
  return bad;
};
window.__start = function (level) {
  closePanels(); if (battle.active) closeBattle();
  settings.hazards = "normal"; settings.difficulty = "normal";
  startGame();
  if (level > 1) { state.level = level - 1; nextLevel(); }
  launchBall(); state.curseAt = Infinity;
};
window.__ballAt = function (x, y, dx, dy) { const b = balls[0]; Object.assign(b, { x, y, dx, dy, spin: 0, boost: 1, stuck: false, gone: false }); return b; };
1`;

const T = [];
const test = (name, fn) => T.push({ name, fn });
export const tests = T;

// ---------------------------------------------------------------------------------------------
test("Yükleme, arayüz ve özellik envanteri", async ({ p, expect }) => {
  const r = await p.eval(`({ mode: state.mode, bricks: bricks.length, themes: THEMES.length, levels: LEVELS.length,
    tools: toolbar.querySelectorAll("button").length, panels: [settingsPanel, themePanel, versusPanel].every(x => x.hidden),
    powers: Object.keys(POWERS).join(""), curses: Object.keys(CURSES).length, bosses: LEVELS.filter(l => l.boss).map(l => l.boss.name).join(","),
    looks: Object.keys(LOOKS).length, sfx: Object.keys(SFX).length, paddle: Object.keys(PADDLE_SOUNDS).length, arch: Object.keys(ARCHETYPES).length,
    musicFx: MUSIC_FX_ALL.length, skills: Object.keys(BOT_SKILL).join(","), types: Object.keys(BRICK_TYPES).join(""), rows: settingsPanel.querySelectorAll(".setrow").length,
    tiers: TIERS.map(t => t.name).join(), ach: ACHIEVEMENTS.length, stats: Object.keys(STATS).length, career: careerPanel.hidden && versusPanel.querySelector(".rank-card") !== null })`);
  expect(r.mode === "menu" && r.bricks === 46 && r.levels === 11, "menü ve ilk bölüm: " + JSON.stringify(r));
  expect(r.themes === 25, "25 hazır tema");
  expect(r.tools === 9, "araç çubuğunda 9 düğme (ses, tema, rastgele, stüdyo, rekabet, meydan, kariyer, ayarlar, tam ekran): " + r.tools);
  expect(r.tiers === "Bronz,Gümüş,Altın,Platin,Elmas,Usta,Efsane" && r.ach === 25 && r.stats === 19 && r.career, "7 lig, 25 başarım, 19 sayaç, rütbe kartı: " + JSON.stringify([r.tiers, r.ach, r.stats, r.career]));
  expect(r.panels, "paneller kapalı başlar");
  expect(r.powers === "WMSFLYDKOHQRNZC", "15 kapsül: " + r.powers);
  expect(r.curses === 20, "20 lanet");
  expect(r.bosses === "TUĞLA KRAL,DEMİR İMPARATOR", "2 boss");
  expect(r.looks === 8 && r.paddle === 9 && r.arch === 5 && r.musicFx === 12, "görünüm/raket sesi/müzik tabloları");
  expect(r.sfx >= 36, "ses tablosu: " + r.sfx);
  expect(r.skills === "caylak,usta,efsane" && r.types === "XEZ$+", "bot seviyeleri ve tuğla türleri");
  expect(r.rows >= 17, "ayarlar paneli satırları üretildi: " + r.rows);
});

test("Oyun akışı: servis, oynanış, can, oyun sonu, duraklatma", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1); const launched = state.mode;
    const bad = __sim(1500, true);
    const score = state.score;
    state.lives = 2; loseLife(); const afterLose = [state.lives, state.mode];
    state.score = 4321; state.lives = 1; loseLife();
    const offer = [state.mode, !lastchance.hidden];
    lastEnd();
    const over = [state.mode, state.lbRank, leaderboard.klasik.length];
    __start(1); pauseGame(); const paused = state.mode; action(); const resumed = state.mode;
    return { launched, bad, score, afterLose, offer, over, paused, resumed };
  })()`);
  expect(r.launched === "playing", "fırlatınca oyun başlar");
  expect(r.bad.length === 0, "25 sn otomatik oyunda top hep geçerli: " + r.bad);
  expect(r.score > 0, "skor artar");
  expect(r.afterLose[0] === 1 && r.afterLose[1] === "serve", "can kaybı: " + r.afterLose);
  expect(r.offer[0] === "lastchance" && r.offer[1], "son top teklifi: " + r.offer);
  expect(r.over[0] === "gameover" && r.over[1] >= 1 && r.over[2] >= 1, "oyun sonu + klasik liderlik kaydı: " + r.over);
  expect(r.paused === "paused" && r.resumed === "playing", "duraklat / devam");
});

test("Lanet Paktı: seçenekler, etkiler, sıfırlama ve atlama", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    settings.pacts = "acik"; startGame();
    const shown = !pactbar.hidden, count = pactCards.querySelectorAll("button").length;
    const offered = pactOffer.map(x => x.id);
    launchBall();
    const hidden = pactbar.hidden, noPact = run.pacts.length;
    state.score = 0; state.lives = 3; state.shield = 0;
    applyPact("cam");
    const speed = state.speed;
    addScore(100);
    const cam = { score: state.score, speed, pacts: [...run.pacts], bar: pactbar.hidden };
    applyPact("kalkan");
    const shield = state.shield;
    resetRun(); state.score = 0; state.lives = 3; state.shield = 0; state.speed = levelSpeed(1);
    applyPact("altin");
    const gold = { mul: pactScoreMul(), goldMul: pactGoldMul() };
    startGame();
    const fresh = { pacts: run.pacts.length, shown: !pactbar.hidden, offerLevel: run.pactOfferLevel };
    launchBall();
    const skipped = pactbar.hidden && run.pacts.length === 0;
    return { shown, count, offered, hidden, noPact, cam, shield, gold, fresh, skipped };
  })()`);
  expect(r.shown && r.count === 3 && r.offered.length === 3, "3 pakt seçeneği: " + JSON.stringify(r));
  expect(r.hidden && r.noPact === 0, "fırlatınca pakt seçimi kapanır");
  expect(r.cam.score === 125 && r.cam.speed > 340 && r.cam.pacts.includes("cam") && r.cam.bar, "cam top: " + JSON.stringify(r.cam));
  expect(r.shield === 3, "kalkan paktı +3: " + r.shield);
  expect(Math.abs(r.gold.mul - 0.9) < 1e-9 && r.gold.goldMul === 2, "altın paktı çarpanları: " + JSON.stringify(r.gold));
  expect(r.fresh.pacts === 0 && r.fresh.shown && r.fresh.offerLevel === 1, "yeni koşu paktları sıfırlar: " + JSON.stringify(r.fresh));
  expect(r.skipped, "pakt seçmeden devam");
});

test("Son Top Bahsi: tek seferlik devam, lanet bedeli ve bitirme", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1); state.score = 500;
    state.lives = 1; loseLife();
    const offer = [state.mode, state.lives, !lastchance.hidden];
    lastContinue();
    const cont = { mode: state.mode, lives: state.lives, used: run.lastChanceUsed, hidden: lastchance.hidden, curse: !!state.pendingCurse };
    state.lives = 1; loseLife();
    const second = [state.mode, lastchance.hidden];
    lastEnd();
    const over = [state.mode, state.lbRank >= 1];
    __start(1);
    const reset = [run.lastChanceUsed, lastchance.hidden];
    state.lives = 1; loseLife(); lastEnd();
    __start(1); run.practice = true; state.lives = 1; loseLife();
    const practice = [state.mode, lastchance.hidden];
    return { offer, cont, second, over, reset, practice };
  })()`);
  expect(r.offer[0] === "lastchance" && r.offer[1] === 0 && r.offer[2], "son can teklifi: " + JSON.stringify(r.offer));
  expect(r.cont.mode === "serve" && r.cont.lives === 1 && r.cont.used && r.cont.hidden && r.cont.curse, "devam: " + JSON.stringify(r.cont));
  expect(r.second[0] === "gameover" && r.second[1], "ikinci şans yok: " + JSON.stringify(r.second));
  expect(r.over[0] === "gameover" && r.over[1], "bitirince oyun sonu: " + JSON.stringify(r.over));
  expect(r.reset[0] === false && r.reset[1], "yeni koşuda hak sıfırlanır: " + JSON.stringify(r.reset));
  expect(r.practice[0] === "gameover" && r.practice[1], "pratikte teklif yok: " + JSON.stringify(r.practice));
});

test("Dramaturg: bölüm görevi, ilerleme, ödül ve kapatma", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    settings.director = "acik"; __start(1);
    const initial = !!(director.challenge && director.challenge.id);
    const stat = "director" in career.stats;
    director.challenge = { id: "bricks", text: "3 tuğla kır", target: 3, reward: 500, startBricks: run.bricks,
      startGold: run.goldBricks, startCurses: state.cursesSurvived, startLifeLost: run.lifeLost,
      startTime: state.time, maxCombo: 0, done: false };
    const before = state.score;
    for (let i = 0; i < 3; i++) destroyBrick(bricks.find(b => !b.dead && !b.unbreakable));
    updateDirector(0);
    const done = { done: director.challenge.done, score: state.score, completed: director.completed,
      stat: career.stats.director, story: director.story.length };
    director.challenge = { id: "noLose", text: "can kaybetmeden bitir", target: 0, reward: 800, startBricks: run.bricks,
      startGold: run.goldBricks, startCurses: state.cursesSurvived, startLifeLost: run.lifeLost,
      startTime: state.time, maxCombo: 0, done: false };
    levelCleared();
    const noLose = director.challenge.done;
    __start(5);
    const bossChallenge = director.challenge && director.challenge.id;
    settings.director = "kapali"; startGame();
    const off = director.challenge === null;
    return { initial, stat, before, done, noLose, bossChallenge, off };
  })()`);
  expect(r.initial && r.stat, "dramaturg görevi ve kariyer sayacı: " + JSON.stringify(r));
  expect(r.done.done && r.done.score > r.before && r.done.completed >= 1 && r.done.stat >= 1 && r.done.story > 0, "görev tamamlandı: " + JSON.stringify(r.done));
  expect(r.noLose, "can kaybetmeden bitirme görevi bölüm sonunda tamamlanır");
  expect(r.bossChallenge === "boss", "boss bölümünde boss görevi: " + r.bossChallenge);
  expect(r.off, "dramaturg kapatılabilir");
});

test("Koşu özeti: sayaçlar ve pratikte kayıt dışı", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1); __sim(900, true);
    const stats = { bricks: run.bricks, combo: run.bestCombo };
    const highBefore = state.high;
    __start(1); run.practice = true; addScore(9999); state.lives = 1; loseLife();
    return { stats, highBefore, mode: state.mode, rank: state.lbRank, high: state.high, games: career.stats.games, practice: run.practice };
  })()`);
  expect(r.stats.bricks > 0 && r.stats.combo > 0, "koşu sayaçları: " + JSON.stringify(r.stats));
  expect(r.mode === "gameover" && r.rank === 0 && r.high === r.highBefore && r.games === 0, "pratik kayıt dışı: " + JSON.stringify(r));
});

test("Bölüm seçimi: kilit ve pratik", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const before = [...levelGrid.querySelectorAll("button")].filter(b => !b.disabled).length;
    career.stats.bestLevel = 5; renderChallenge();
    const unlocked = [...levelGrid.querySelectorAll("button")].filter(b => !b.disabled).length;
    const blocked = startPractice(9);
    startPractice(3);
    const started = { level: state.level, practice: run.practice, mode: state.mode };
    state.score = 5000; state.lives = 1; loseLife();
    const high = state.high, rank = state.lbRank, ach = Object.keys(career.ach).length;
    toMenu();
    return { before, unlocked, blocked, started, high, rank, ach, practiceAfterMenu: run.practice };
  })()`);
  expect(r.before === 1 && r.unlocked === 5, "kilit: " + JSON.stringify([r.before, r.unlocked]));
  expect(r.blocked === false, "kilitli bölüm doğrudan çağrıyla açılmadı");
  expect(r.started.level === 3 && r.started.practice && r.started.mode === "serve", "pratik başladı: " + JSON.stringify(r.started));
  expect(r.high === 0 && r.rank === 0 && r.ach === 0, "pratik rekor/başarım yazmadı: " + JSON.stringify(r));
  expect(r.practiceAfterMenu === false, "menüde pratik bayrağı temizlendi");
});

test("Günlük meydan okuma: tek deneme, kurallar, kayıt", async ({ p, expect }) => {
  const dates = await p.eval(`({
    y1: yesterdayOf("2026-03-01"), y2: yesterdayOf("2026-01-01"),
    s1: streakAfter("2026-10-18", 4, "2026-10-19"), s2: streakAfter("2026-10-17", 4, "2026-10-19"),
    s3: streakAfter("2026-10-19", 4, "2026-10-19"),
  })`);
  expect(dates.y1 === "2026-02-28" && dates.y2 === "2025-12-31", "tarih dönüşü: " + JSON.stringify(dates));
  expect(dates.s1 === 5 && dates.s2 === 1 && dates.s3 === 4, "seri hesabı: " + JSON.stringify(dates));

  const r = await p.eval(`(() => {
    const used0 = dailyUsed();
    const first = startDaily();
    const rules = { lives: state.lives, daily: run.daily, hazards: hazardLevel(), speed: state.speed };
    const used1 = dailyUsed();
    const second = startDaily();
    state.score = 1234; state.lives = 1; loseLife();
    const after = { score: daily.score, best: daily.best, streak: daily.streak, used: dailyUsed(), mode: state.mode,
                    dailyFlag: run.daily, dailyDone: run.dailyFinished };
    const third = startDaily();
    return { used0, first, second, third, rules, used1, after, modeAfter: state.mode };
  })()`);
  expect(r.used0 === false && r.first === true && r.second === false, "tek deneme: " + JSON.stringify(r));
  expect(r.rules.lives === 1 && r.rules.daily && r.rules.hazards === "kabus" && r.rules.speed > 340, "günlük kuralları: " + JSON.stringify(r.rules));
  expect(r.used1 && r.after.score === 1234 && r.after.best === 1234 && r.after.streak === 1 && r.after.used, "günlük kayıt: " + JSON.stringify(r.after));
  expect(r.after.dailyFlag === true && r.after.dailyDone === true, "özet için günlük bayrağı: " + JSON.stringify(r.after));
  expect(r.third === false && r.modeAfter === "gameover", "ikinci deneme yok: " + JSON.stringify(r));

  await p.reload();
  const saved = await p.eval(`({ used: dailyUsed(), best: daily.best, streak: daily.streak, start: startDaily() })`);
  expect(saved.used && saved.best === 1234 && saved.streak === 1 && saved.start === false, "kalıcı günlük: " + JSON.stringify(saved));

  await p.eval(`localStorage.setItem("bb_daily", "{bozuk"), 1`);
  await p.reload();
  const broken = await p.eval(`({ used: dailyUsed(), best: daily.best, streak: daily.streak, start: startDaily() })`);
  expect(broken.used === false && broken.best === 0 && broken.streak === 0 && broken.start === true, "bozuk kayıt: " + JSON.stringify(broken));
});

test("Kapsüller: 15 kapsülün hepsi etkisini gösterir", async ({ p, expect }) => {
  const checks = {
    W: "paddle.wideUntil > state.time && paddle.w > 140", M: "balls.length === 3", S: "fxOn('slow')", F: "isFire()",
    L: "fxOn('laser') && lasers.length > 0", Y: "fxOn('magnet')", D: "fxOn('big') && balls[0].r > 12", K: "state.shield === 3",
    O: "holes.length === 1", H: "state.lives === 4", R: "fxOn('reverse')", N: "fxOn('mini') && paddle.w < 90",
    Z: "Math.abs(mag() / state.speed - 1.3) < 1e-9", C: "!!state.pendingCurse", Q: "gain >= 100",   // KAOS: kendi 50 puanı + seçtiği kapsülün puanı
  };
  for (const [k, cond] of Object.entries(checks)) {
    const r = await p.eval(`(() => { __start(1); const s0 = state.score; applyPower("${k}"); const gain = state.score - s0;
      for (let i = 0; i < 30; i++) update(STEP); return { ok: !!(${cond}), gain }; })()`);
    expect(r.ok, "kapsül " + k + " etkisi");
    if ("RNZC".includes(k)) expect(r.gain === 250, "kötü kapsül " + k + " +250 puan: " + r.gain);
  }
  const d = await p.eval(`(() => { const c = {}, g = {}; for (let i = 0; i < 6000; i++) { c[pickPower(false)] = 1; const k = pickPower(true); g[k] = 1; }
    return { all: Object.keys(c).length, goodBad: Object.keys(g).some(k => POWERS[k].bad || k === "Q") }; })()`);
  expect(d.all === 15 && !d.goodBad, "ağırlıklı düşme: hepsi düşer, altın/boss yalnızca iyi kapsül verir");
  const y = await p.eval(`(() => { __start(1); applyPower("Y"); __ballAt(paddle.x + 30, paddle.y - 10, 0, 300); for (let i = 0; i < 5; i++) update(STEP);
    const stuck = balls[0].stuck; applyPower("M"); const pend = state.pendingMulti; action(); return { stuck, pend, n: balls.length }; })()`);
  expect(y.stuck && y.pend && y.n === 3, "YAPIŞ yakalar, yapışıkken ÇOKLU bekler ve bırakınca çoğalır: " + JSON.stringify(y));
});

test("Duvar bölgeleri, falso ve SMASH", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1);
    const z = zones.find(z => z.side === "L" && z.type === "bumper"), b = __ballAt(10, z.y + z.h / 2, -300, -200);
    update(STEP); update(STEP);
    const bumper = { boost: b.boost, dx: b.dx, flash: z.flash };
    __start(3);
    const zp = zones.find(z => z.side === "L" && z.type === "portal"), pb = __ballAt(15, zp.y + 20, -300, -150);
    for (let i = 0; i < 4; i++) update(STEP);
    const portal = { x: pb.x, dx: pb.dx };
    __start(2);
    const zs = zones.find(z => z.type === "spin"), sb = __ballAt(zs.side === "L" ? 10 : W - 10, zs.y + zs.h / 2, zs.side === "L" ? -300 : 300, -200);
    update(STEP);
    const spinZone = Math.abs(sb.spin);
    zones = [];
    const deflect = [0, 1, -1].map(sp => { const t = newBall(false); Object.assign(t, { x: 5, y: 300, dx: -240, dy: -240, spin: sp }); wallHit(t, "L"); return Math.round(Math.atan2(t.dy, t.dx) * 180 / Math.PI) + (t.dx > 0 ? "" : "!"); });
    __start(1);
    const pbx = __ballAt(paddle.x + paddle.w / 2, paddle.y - 9, 0, 300); paddle.vx = 900; update(STEP); update(STEP);
    const paddleSpin = pbx.spin;
    __start(1);
    const eb = __ballAt(paddle.x + paddle.w - 3, paddle.y - 9, 0, 300); update(STEP); update(STEP);
    return { bumper, portal, spinZone, deflect, paddleSpin, smash: eb.boost };
  })()`);
  expect(r.bumper.boost > 1.4 && r.bumper.dx > 0 && r.bumper.flash > 0, "tampon fırlatır: " + JSON.stringify(r.bumper));
  expect(r.portal.x > 700 && r.portal.dx < 0, "portal karşı duvardan aynı yönde çıkarır: " + JSON.stringify(r.portal));
  expect(r.spinZone > 1.3, "falso bölgesi sert kavis verir: " + r.spinZone);
  expect(r.deflect.join() === "-45,-65,-25", "falsolu top duvardan farklı açıyla seker: " + r.deflect);
  expect(r.paddleSpin > 0.5, "hareketli raket falso verir: " + r.paddleSpin);
  expect(r.smash > 1.3, "uçtan vuruş SMASH: " + r.smash);
});

test("Tuğla türleri: elektrik, patlayan, altın, çoğaltan, kırılmaz, kayan sıra, çatlak", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const hpSum = () => bricks.filter(b => !b.dead && !b.unbreakable).reduce((s, b) => s + b.hp, 0);
    __start(7);
    const h0 = hpSum(); damageBrick(bricks.find(b => b.electric), 1); const electric = { lost: h0 - hpSum(), bolts: bolts.length };
    powerups = []; const gold = bricks.find(b => b.gold && !b.dead); damageBrick(gold, 2); const goldDrop = powerups.length > 0 && powerups.every(pw => !POWERS[pw.type].bad);
    const n0 = balls.length; damageBrick(bricks.find(b => b.splitter && !b.dead), 1); const split = balls.length - n0;
    __start(3);
    const alive0 = bricks.filter(b => !b.dead).length; damageBrick(bricks.find(b => b.explosive), 1); const boom = alive0 - bricks.filter(b => !b.dead).length;
    __start(4);
    const x = bricks.find(b => b.unbreakable); damageBrick(x, 99); const unbreakable = !x.dead;
    __start(8);
    const mb = bricks.find(b => b.row === 0), x0 = mb.x; __sim(120); const moved = Math.abs(mb.x - x0);
    const c = bricks.find(b => b.maxHp === 2) || bricks[0]; c.hp = 1; const cracks = JSON.stringify(makeCracks(c)) === JSON.stringify(makeCracks(c)) && makeCracks(c).length === 2;
    settings.hpDots = true; draw(); settings.hpDots = false;
    return { electric, goldDrop, split, boom, unbreakable, rows: movingRows.length, moved, cracks };
  })()`);
  expect(r.electric.lost >= 3 && r.electric.bolts >= 3, "elektrik zinciri: " + JSON.stringify(r.electric));
  expect(r.goldDrop, "altın tuğla iyi kapsül düşürür");
  expect(r.split === 1, "çoğaltan yeni top çıkarır");
  expect(r.boom >= 3, "patlayan komşularını kırar: " + r.boom);
  expect(r.unbreakable, "kırılmaz tuğla kırılmaz");
  expect(r.rows === 3 && r.moved > 5, "kayan sıralar: " + r.rows + " sıra, " + r.moved + " px");
  expect(r.cracks, "çatlaklar tuğla başına sabit");
});

test("Boss: ateş, öfke, tuğla dikme, ölüm, döngüde güçlenme", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(5);
    const bo = state.boss, info = { name: bo.name, hp: bo.hp };
    balls[0].stuck = true; balls[0].caughtAt = 0;
    let maxBullets = 0; for (let i = 0; i < 400; i++) { update(STEP); maxBullets = Math.max(maxBullets, bullets.length); }
    const vx0 = Math.abs(bo.vx); hitBoss(21, 400, 120);
    const enraged = bo.enraged && Math.abs(bo.vx) > vx0 * 1.5;
    spawnMinions(); const minions = bricks.filter(b => b.row === 4 && !b.dead).length;
    balls[0].stuck = false; hitBoss(999, 400, 120); const kill = [state.mode, state.slowmo > 0];
    __sim(400); const after = state.level;
    __start(10); const boss2 = [state.boss.name, state.boss.hp];
    __start(16); const cycleHp = state.boss.hp;
    return { info, maxBullets, enraged, minions, kill, after, boss2, cycleHp };
  })()`);
  expect(r.info.name === "TUĞLA KRAL" && r.info.hp === 40, "5. bölüm boss'u");
  expect(r.maxBullets > 0, "boss rakete ateş eder");
  expect(r.enraged, "canı yarıya inince öfkelenir ve hızlanır");
  expect(r.minions > 0, "öfkeli boss tuğla diker");
  expect(r.kill[0] === "levelclear" && r.kill[1], "ölünce bölüm biter, ağır çekim");
  expect(r.after === 6, "sonraki bölüme geçilir: " + r.after);
  expect(r.boss2.join() === "DEMİR İMPARATOR,70", "10. bölüm boss'u");
  expect(r.cycleHp === 60, "ikinci turda boss canı %50 fazla: " + r.cycleHp);
});

test("Kara delik, ÇILGIN MOD, lazer, kalkan, kombo yazıları", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1); balls[0].stuck = true; balls[0].caughtAt = 0; spawnHole(); Object.assign(holes[0], { x: 400, y: 150 });
    const near = bricks.filter(b => !b.unbreakable && Math.hypot(b.x + 35 - 400, b.y + 11 - 150) < 95);
    for (let i = 0; i < 900; i++) update(STEP); const hole = { left: holes.length, swallowed: near.every(b => b.dead) };
    __start(1); state.combo = 9; destroyBrick(bricks.find(b => !b.dead)); const fever = [isFever(), state.callout.text];
    __start(1); state.combo = 4; destroyBrick(bricks.find(b => !b.dead)); const combo = state.callout.text;
    __start(1); applyPower("L"); balls[0].stuck = true; balls[0].caughtAt = 0; const hp0 = bricks.reduce((s, b) => s + (b.dead ? 0 : b.hp), 0);
    for (let i = 0; i < 240; i++) update(STEP); const laser = hp0 - bricks.reduce((s, b) => s + (b.dead ? 0 : b.hp), 0);
    __start(1); state.shield = 1; const b = __ballAt(400, H - 20, 50, 300); for (let i = 0; i < 20; i++) update(STEP);
    return { hole, fever, combo, laser, shield: [state.shield, b.dy < 0] };
  })()`);
  expect(r.hole.left === 0 && r.hole.swallowed, "kara delik çöker ve çevresini yutar");
  expect(r.fever[0] && r.fever[1] === "★ ÇILGIN MOD ★", "10 combo: ÇILGIN MOD");
  expect(r.combo === "SÜPER! x5", "combo duyurusu: " + r.combo);
  expect(r.laser > 0, "lazer tuğla kırar: " + r.laser);
  expect(r.shield[0] === 0 && r.shield[1], "kalkan topu bir kez kurtarır");
});

test("Lanetler: 20 lanetin her biri güvenle çalışır", async ({ p, expect }) => {
  const ids = await p.eval("Object.keys(CURSES)");
  for (const id of ids) {
    const r = await p.eval(`(() => { __start(1); bricks.slice(0, 3).forEach(b => (b.dead = true)); const ok = !CURSES.${id}.ok || CURSES.${id}.ok(); startCurse("${id}"); const on = curseOn("${id}");
      const bad = __sim(900, true); return { ok, on, timed: !!CURSES.${id}.dur, bad }; })()`);
    expect(r.ok, id + " başlangıçta uygun");
    if (r.timed) expect(r.on, id + " etkin");
    expect(r.bad.length === 0, id + " sırasında top geçerli: " + r.bad);
  }
});

test("Lanet ayrıntıları: sahte top, yarık, rüzgar, yerçekimi, duvarlar, tuğla lanetleri, UFO, zamanlayıcı", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1); startCurse("sahte");
    const d = balls.find(b => b.decoy), real = balls.find(b => !b.decoy);
    Object.assign(d, { x: paddle.x + paddle.w / 2, y: paddle.y - 12, dx: 0, dy: 300 }); Object.assign(real, { x: 400, y: 300, dx: 100, dy: -300 });
    for (let i = 0; i < 20; i++) update(STEP);
    const passed = d.y > paddle.y + 5;
    const br = bricks.find(b => !b.dead), hp = br.hp; Object.assign(d, { x: br.x + 35, y: br.y + 32, dx: 0, dy: -300, gone: false }); if (!balls.includes(d)) balls.push(d);
    for (let i = 0; i < 10; i++) update(STEP);
    const lives = state.lives; Object.assign(real, { y: H + 100, dy: 300 }); for (let i = 0; i < 3; i++) update(STEP);
    const decoy = { passed, untouched: !br.dead && br.hp === hp, lifeLost: state.lives === lives - 1, popped: !balls.some(b => b.decoy) };
    __start(1); startCurse("yarik"); __ballAt(paddle.x + paddle.w / 2, paddle.y - 12, 0, 300); for (let i = 0; i < 20; i++) update(STEP); const fell = balls.length === 0 || balls[0].y > paddle.y + 5;
    __start(1); startCurse("yarik"); const eb = __ballAt(paddle.x + paddle.w * 0.15, paddle.y - 12, 0, 300); for (let i = 0; i < 20; i++) update(STEP);
    const yarik = { fell, edge: eb.dy < 0 };
    __start(1); startCurse("ruzgar"); state.windDir = 1; const wb = __ballAt(400, 450, 0, -340); for (let i = 0; i < 60; i++) update(STEP);
    __start(1); startCurse("agir"); const gb = __ballAt(400, 450, 0, -340); update(STEP); const up = Math.hypot(gb.dx, gb.dy);
    __start(1); startCurse("daralan"); __sim(600, true); const inset = state.inset, inside = balls.every(b => b.x - b.r >= inset - 1) && paddle.x >= inset - 0.5;
    __start(1); const y0 = bricks[0].y; startCurse("inis"); __sim(120); const drop = bricks[0].y - y0;
    bricks.slice(0, 5).forEach(b => (b.dead = true)); const dead0 = bricks.filter(b => b.dead).length; startCurse("dirilis"); const revived = dead0 - bricks.filter(b => b.dead).length;
    const h0 = bricks.filter(b => !b.dead).reduce((s, b) => s + b.hp, 0); startCurse("zirh"); const armor = bricks.filter(b => !b.dead).reduce((s, b) => s + b.hp, 0) - h0;
    __start(1); balls[0].stuck = true; balls[0].caughtAt = 0; startCurse("ufo"); for (let i = 0; i < 480; i++) update(STEP);
    const drops = state.ufo && state.ufo.drops, s0 = state.score; hitUfo(); const survived = !!state.ufo; hitUfo();
    const ufo = { drops, survived, down: !state.ufo, gain: state.score - s0 };
    __start(1); state.curseAt = state.time; update(STEP); const scheduled = !!state.pendingCurse;
    settings.hazards = "kapali"; scheduleNextCurse(true); const off = state.curseAt === Infinity && !Array.from({ length: 3000 }, () => pickPower(false)).includes("C");
    settings.hazards = "normal";
    return { decoy, yarik, wind: wb.dx, up, inset, inside, drop, revived, armor, ufo, scheduled, off };
  })()`);
  expect(Object.values(r.decoy).every(Boolean), "sahte toplar raketten geçer, tuğla kırmaz, gerçek top düşünce söner: " + JSON.stringify(r.decoy));
  expect(r.yarik.fell && r.yarik.edge, "yarık raket: ortadan düşer, kenardan seker");
  expect(r.wind > 50, "rüzgar topu iter: " + r.wind);
  expect(r.up < 300, "ağır yerçekimi yukarı giden topu yavaşlatır: " + r.up);
  expect(r.inset > 100 && r.inside, "daralan duvarlar: top ve raket içeride");
  expect(r.drop === 28, "tavan çöküyor: bir sıra iner");
  expect(r.revived >= 1, "diriliş tuğla geri getirir");
  expect(r.armor > 0, "zırhlanma dayanıklılık ekler");
  expect(r.ufo.drops === 3 && r.ufo.survived && r.ufo.down && r.ufo.gain === 750, "UFO: 3 kapsül bırakır, 2 vuruşta düşer, +750: " + JSON.stringify(r.ufo));
  expect(r.scheduled, "zamanlayıcı lanet duyurur");
  expect(r.off, "lanetler kapalıyken lanet ve LANET kapsülü gelmez");
});

test("Temalar: hazır, sonsuz rastgele, stüdyo, paylaşım kodu, kısayollar, paneller", async ({ p, expect }) => {
  const g = await p.eval(`(() => {
    let invalid = 0, minText = 99, minBrick = 99, light = 0;
    for (let i = 0; i < 3000; i++) {
      const t = genTheme(i * 7919 + 13);
      if (!validTheme(t)) invalid++;
      minText = Math.min(minText, contrast(t.text, t.board));
      minBrick = Math.min(minBrick, contrast(t.b1, t.board), contrast(t.b2, t.board), contrast(t.b3, t.board));
      if (relLum(t.board) > 0.5) light++;
    }
    return { invalid, minText, minBrick, light, same: JSON.stringify(genTheme(4242)) === JSON.stringify(genTheme(4242)), presets: THEMES.every(validTheme) };
  })()`);
  expect(g.invalid === 0 && g.presets, "tüm temalar geçerli");
  expect(g.minText >= 7 && g.minBrick >= 2.4, "rastgele temalar okunaklı: yazı " + g.minText.toFixed(1) + ", tuğla " + g.minBrick.toFixed(1));
  expect(g.light > 300 && g.same, "açık zeminli temalar da var, aynı tohum aynı tema");
  const s = await p.eval(`(async () => {
    studioBtn.click(); const open = !themePanel.hidden && !backdrop.hidden, grid = themeGrid.children.length, sugg = suggestGrid.children.length;
    themeGrid.children[9].click(); const picked = theme.name;
    const inp = thColors.querySelector('input[data-key="b1"]'); inp.value = "#123456"; inp.dispatchEvent(new Event("input"));
    const edited = [theme.id, theme.b1, THEMES[9].b1];
    thName.value = "Benim Temam"; thName.dispatchEvent(new Event("input")); document.getElementById("th-save").click();
    const saved = [theme.id[0], theme.name, customThemes.length, JSON.parse(localStorage.getItem("bb_custom_themes")).length];
    document.getElementById("th-export").click(); const code = thCode.value; setTheme(THEMES[0]);
    thCode.value = code; document.getElementById("th-import").click(); const imported = theme.name === "Benim Temam" && theme.b1 === "#123456";
    thCode.value = "BB1:çöp"; document.getElementById("th-import").click(); const badMsg = thMsg.textContent;
    setTheme(customThemes[0]); thDelete.click(); const deleted = customThemes.length === 0 && theme.id === "p0";
    const before = theme.name; document.dispatchEvent(new KeyboardEvent("keydown", { key: "r" })); const rKey = theme.name !== before;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "t" })); const tKey = theme.id[0] === "p";
    thName.focus(); const m0 = state.mode; thName.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); const typingSafe = state.mode === m0;
    settingsBtn.click(); const exclusive = themePanel.hidden && !settingsPanel.hidden;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); const esc = settingsPanel.hidden && backdrop.hidden;
    return { open, grid, sugg, picked, edited, saved, code: code.slice(0, 4), imported, badMsg, deleted, rKey, tKey, typingSafe, exclusive, esc };
  })()`);
  expect(s.open && s.grid === 25 && s.sugg === 8, "stüdyo açılır: 25 tema + 8 öneri");
  expect(s.picked === "Okyanus", "galeriden tema seçilir");
  expect(s.edited[0] === "e" && s.edited[1] === "#123456" && s.edited[2] === "#94d2bd", "düzenleme hazır temayı bozmaz");
  expect(s.saved.join() === "c,Benim Temam,1,1", "tema kaydedilir: " + s.saved);
  expect(s.code === "BB1:" && s.imported && s.badMsg.includes("Geçersiz"), "paylaşım kodu: al / yükle / hatalı kod");
  expect(s.deleted, "kayıtlı tema silinir");
  expect(s.rKey && s.tKey, "R ve T kısayolları");
  expect(s.typingSafe, "yazı kutusunda oyun tuşları çalışmaz");
  expect(s.exclusive && s.esc, "aynı anda tek panel, Esc kapatır");
});

test("Görünüm seçenekleri ve kalıcılık (sayfa yenilenince)", async ({ p, expect }) => {
  const n = await p.eval(`(() => { __start(1); applyPower("F"); applyPower("L"); applyPower("K"); applyPower("O"); let n = 0;
    for (const k in LOOKS) for (const v of LOOKS[k]) { settings[k] = v; if (k === "bgFx") initStars(); __sim(30); n++; }
    for (const k in LOOKS) settings[k] = LOOKS[k][0]; return n; })()`);
  expect(n === 33, "33 görünüm seçeneğinin hepsi çizilir: " + n);
  await p.eval(`(() => { settingsBtn.click();
    for (const [k, v] of [["ballShape", "yildiz"], ["brickStyle", "3d"], ["bgFx", "izgara"], ["paddleSound", "boing"], ["hazards", "kabus"], ["hpDots", "true"]])
      settingsPanel.querySelector('[data-opt="' + k + '"][data-val="' + v + '"]').click();
    const r = settingsPanel.querySelector("#fxvol"); r.value = 40; r.dispatchEvent(new Event("input"));
    document.getElementById("resetlooks").click(); settingsPanel.querySelector('[data-opt="ballShape"][data-val="kare"]').click();
    setTheme(genTheme(777)); customThemes.push({ ...THEMES[3], id: "c1", name: "Kayıtlı" }); saveCustomThemes(); muteBtn.click(); return 1; })()`);
  await p.reload();
  const r = await p.eval(`({ ball: settings.ballShape, brick: settings.brickStyle, bg: settings.bgFx, sound: settings.paddleSound, hz: settings.hazards,
    dots: settings.hpDots, vol: settings.fxVol, theme: theme.name, customs: customThemes.length, muted, active: settingsPanel.querySelector('[data-opt="ballShape"].active').dataset.val })`);
  expect(r.ball === "kare" && r.brick === "parlak" && r.bg === "yildiz", "görünüm sıfırlanır ve sonraki seçim kalır: " + JSON.stringify(r));
  expect(r.sound === "boing" && r.hz === "kabus" && r.dots === true && r.vol === 40, "ayarlar kalıcı");
  expect(r.theme === (await p.eval("genTheme(777).name")) && r.customs === 1 && r.muted === true, "tema, kayıtlı temalar ve sessiz kalıcı");
  expect(r.active === "kare", "panel kayıtlı ayarı gösterir");
  await p.eval(`(() => { localStorage.clear(); return 1; })()`);
});

test("Müzik senkronu: vuruş, BPM, şarkıya özel profil, kayıt", async ({ p, expect, sleep }) => {
  await p.eval(`(() => {
    window.makeSong = (name, { bpm, kick = 0, pad = 0, hat = 0, secs = 16 }) => {
      const sr = 22050, n = sr * secs, d = new Float32Array(n), beat = 60 / bpm; let prev = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, tb = t % beat, th = t % (beat / 2); let v = 0;
        if (kick) { const f = 50 + 70 * Math.exp(-tb * 30); v += kick * Math.sin(2 * Math.PI * f * tb) * Math.exp(-tb * 9); }
        if (pad) v += pad * (Math.sin(2 * Math.PI * 330 * t) + Math.sin(2 * Math.PI * 415 * t) + Math.sin(2 * Math.PI * 494 * t)) / 3;
        if (hat) { const w = Math.random() * 2 - 1; v += hat * (w - prev) * Math.exp(-th * 60); prev = w; }
        d[i] = Math.max(-1, Math.min(1, v));
      }
      const buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf), ws = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
      ws(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); ws(8, "WAVEfmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); ws(36, "data"); dv.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, d[i] * 32767, true);
      return new File([buf], name, { type: "audio/wav" });
    };
    localStorage.removeItem("bb_song_profiles"); songProfiles = {}; settings.musicFx = "tam";
    loadMusicFile(makeSong("bas.wav", { bpm: 128, kick: 0.9, hat: 0.15 })); __start(1); return 1; })()`);
  await sleep(9800);
  const a = await p.eval(`({ on: music.on, beats: music.beatCount, bpm: Math.round(music.bpm), arch: music.profile.arch, pending: music.profile.pending, saved: Object.keys(songProfiles).length, info: musicInfo.textContent })`);
  expect(a.on && a.beats > 10, "müzik çalarken vuruşlar algılanır: " + a.beats);
  expect(Math.abs(a.bpm - 128) <= 3, "BPM ölçülür: " + a.bpm);
  expect(!a.pending && a.arch === "bas" && a.saved === 1, "şarkı karakteri ve profil kaydı: " + a.arch);
  expect(a.info.includes("BPM"), "medya çubuğunda profil + BPM: " + a.info);
  const v = await p.eval(`(() => { mediavol.value = 20; setMediaVolume(); return [bgmusic.volume, +music.gain.gain.value.toFixed(2)]; })()`);
  expect(v[0] === 1 && v[1] === 0.2, "ses sürgüsü analizden bağımsız kazancı ayarlar");
  await p.eval(`(() => { mediavol.value = 70; setMediaVolume(); loadMusicFile(makeSong("sakin.wav", { bpm: 90, kick: 0.25, pad: 0.25, hat: 0.6 })); return 1; })()`);
  await sleep(9800);
  const b = await p.eval(`({ bpm: Math.round(music.bpm), arch: music.profile.arch, fx: music.profile.fx.length })`);
  expect(Math.abs(b.bpm - 90) <= 3 && b.arch !== "bas" && b.fx >= 4, "farklı şarkı farklı profil: " + JSON.stringify(b));
  const c = await p.eval(`(() => {
    loadMusicFile(makeSong("bas.wav", { bpm: 128, kick: 0.9, hat: 0.15 })); const cached = !music.profile.pending && music.profile.arch === "bas";
    music.profile.fx = MUSIC_FX_ALL.slice(); for (let i = 0; i < 60; i++) { updateMusic(1 / 60); draw(); }
    settings.musicFx = "kapali"; updateMusic(0.016); const off = !music.on && !musicFx("zoom");
    settings.musicFx = "hafif"; const lightNoStrobe = !musicFx("strobe"); settings.musicFx = "tam";
    settings.songTheme = "acik"; const t0 = theme.name; startProfile(music.key); const songTheme = theme.name !== t0; settings.songTheme = "kapali";
    document.getElementById("clearmedia").click(); updateMusic(0.016);
    return { cached, off, lightNoStrobe, songTheme, cleared: !music.on && !music.profile && musicInfo.textContent === "" };
  })()`);
  expect(Object.values(c).every(Boolean), "kayıtlı profil anında gelir, 12 efekt çizilir, Kapalı/Hafif, şarkıya özel tema, temizleme: " + JSON.stringify(c));
});

test("Kapışma (botlar): geri sayım, saldırılar, kalkan, sonuç, elenme, liderlik", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const step = (sec, auto) => { for (let i = 0; i < sec * 60; i++) { __sim(2, auto); updateBattle(1 / 60); } };
    leaderboard.kapisma = []; Object.assign(vsCfg, { name: "Albas", bots: 5, skill: "karisik", dur: 120, target: "lider" });
    startBotBattle();
    const start = { players: battle.players.length, panel: !oppPanel.hidden, cards: oppPanel.querySelectorAll(".opp").length };
    action(); const countdownBlocks = state.mode === "serve";
    step(4); const launched = [state.mode, battle.countdown <= 0];
    step(20, true); const botsPlay = battle.players.filter(p => p.kind === "bot").some(p => p.score > 0) && battle.feed.length > 0;
    const lead = pickTarget("me", "lider"); battle.charge = 9; battleCharge(1); const attack = lead.debuffUntil > battle.clock && battle.feed[0].startsWith("Albas ⚔");
    state.curses = {}; state.pendingCurse = null; state.shield = 0; receiveAttack("Test"); const cursed = !!state.pendingCurse;
    state.shield = 2; state.pendingCurse = null; receiveAttack("Test"); const blocked = state.shield === 1 && !state.pendingCurse;
    scheduleNextCurse(true); const noRandom = state.curseAt === Infinity;
    pauseGame(); const c0 = battle.clock; for (let i = 0; i < 30; i++) updateBattle(1 / 60); const frozen = battle.clock === c0; resumeGame();
    state.score = 5000; battle.clock = battle.duration; step(0.5, true);
    const over = [battle.over, state.mode, battle.results.length, leaderboard.kapisma.length];
    action(); const back = [state.mode, battle.active, oppPanel.hidden];
    vsCfg.bots = 2; startBotBattle(); step(4); state.lives = 1; loseLife(); updateBattle(0.1);
    const elim = [state.mode, battle.over, battle.myPlace, battle.results.length];
    closeBattle(); toMenu();
    return { start, countdownBlocks, launched, botsPlay, attack, cursed, blocked, noRandom, frozen, over, back, elim };
  })()`);
  expect(r.start.players === 6 && r.start.panel && r.start.cards === 6, "maç 6 oyuncuyla başlar, rakip kartları görünür");
  expect(r.countdownBlocks && r.launched[0] === "playing" && r.launched[1], "geri sayımda fırlatılmaz, sayım bitince başlar");
  expect(r.botsPlay, "botlar oynar ve saldırır");
  expect(r.attack, "saldırı enerjisi dolunca lider lanetlenir");
  expect(r.cursed && r.blocked, "gelen saldırı lanet olur, kalkan engeller");
  expect(r.noRandom && r.frozen, "kapışmada rastgele lanet yok; bot maçında duraklatma saati durdurur");
  expect(r.over[0] && r.over[1] === "gameover" && r.over[2] === 6 && r.over[3] === 1, "süre bitince sonuç + kapışma liderlik kaydı: " + r.over);
  expect(r.back.join() === "menu,false,true", "sonuçtan menüye dönülür");
  expect(r.elim[0] === "gameover" && r.elim[1] && r.elim[2] === 3, "elenince maç biter (bot maçı): " + r.elim);
});

test("Bot dengesi: Çaylak < Usta < Efsane", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const out = {}; Object.assign(battle, { active: true, over: true, clock: 0 });
    for (const sk of ["caylak", "usta", "efsane"]) {
      let tot = 0, alive = 0;
      for (let k = 0; k < 150; k++) { const pl = makePlayer("x", "x", "#fff", "bot", sk); battle.players = [pl]; for (let t = 0; t < 1800; t++) { simBot(pl, 0.1); pl.charge = 0; } tot += pl.score; alive += pl.alive; }
      out[sk] = { perMin: Math.round(tot / 150 / 3), alive: alive / 150 };
    }
    closeBattle(); return out;
  })()`);
  expect(r.caylak.perMin < r.usta.perMin && r.usta.perMin < r.efsane.perMin, "skor sırası: " + JSON.stringify(r));
  expect(r.caylak.alive < r.efsane.alive, "efsane daha uzun dayanır");
});

test("Dereceli lig: rütbeler, Elo, puana göre botlar, sonuç, terk cezası", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const step = (sec, auto) => { for (let i = 0; i < sec * 60; i++) { __sim(2, auto); updateBattle(1 / 60); } };
    const tiers = [999, 1100, 1260, 1400, 1550, 1700, 1900].map(v => tierOf(v).name).join();
    const elo = [eloDelta(1000, [{ lp: 1000, won: true }]), eloDelta(1000, [{ lp: 1000, won: false }]), eloDelta(1000, [{ lp: 1400, won: true }]), eloDelta(1400, [{ lp: 1000, won: true }])];
    const curve = [600, 900, 1100, 1250, 1600, 2400].map(botStats);
    const mono = curve.every((c, i) => !i || (c.rate >= curve[i - 1].rate && c.loss <= curve[i - 1].loss && c.reset <= curve[i - 1].reset));
    const anchors = botStats(BOT_SKILL.usta.elo).rate === BOT_SKILL.usta.rate && Math.abs(botStats(1075).rate - 0.625) < 1e-9;
    vsCfg.name = "Albas"; startRankedBattle();
    const bots = battle.players.filter(p => p.kind === "bot");
    const start = { n: battle.players.length, ranked: battle.ranked, near: bots.every(p => Math.abs(p.lp - 1000) <= 150 && p.sk && p.sk.rate > 0),
                    pending: !!career.pending && career.pending.delta < 0, cards: oppPanel.textContent.includes("LP") || oppPanel.textContent.includes("🥉") };
    step(4); state.score = 999999; battle.clock = battle.duration; step(0.2, true);
    const win = { over: battle.over, place: battle.myPlace, delta: battle.rated && battle.rated.delta, lp: career.lp, pending: career.pending, hist: career.history[0] };
    draw(); action();
    const before = career.lp; startRankedBattle(); step(4);
    for (const b of battle.players) if (b.kind === "bot") b.score = 1e6;
    state.score = 0; battle.clock = battle.duration; updateBattle(1 / 60);
    const lose = { place: battle.myPlace, delta: battle.rated.delta, lp: career.lp, before };
    draw(); action();
    const b2 = career.lp; startRankedBattle(); const pend = career.pending.delta; startBotBattle();
    const quit = { lp: career.lp, expect: b2 + pend, left: career.history[0].left, friendly: career.pending === null && !battle.ranked };
    closeBattle(); toMenu(); draw();
    return { tiers, elo, mono, anchors, start, win, lose, quit, ranked: career.stats.ranked, matches: career.stats.matches, hist: career.history.map(h => h.mode + h.place + "/" + h.of + (h.left ? "L" : "")).join() };
  })()`);
  expect(r.tiers === "Bronz,Gümüş,Altın,Platin,Elmas,Usta,Efsane", "lig sınırları: " + r.tiers);
  expect(r.elo[0] === 32 && r.elo[1] === -32 && r.elo[2] > 55 && r.elo[3] < 10, "Elo (yerleştirme K=64): denk ±32, güçlüyü yenmek çok, zayıfı yenmek az kazandırır: " + r.elo);
  expect(r.mono && r.anchors, "bot gücü puanla tekdüze artar, seviye noktalarından geçer");
  expect(r.start.n === 4 && r.start.ranked && r.start.near && r.start.pending && r.start.cards, "dereceli maç: 3 bot, puanı yakın, terk sonucu kenarda: " + JSON.stringify(r.start));
  expect(r.win.over && r.win.place === 1 && r.win.delta > 0 && r.win.lp === 1000 + r.win.delta && r.win.pending === null, "kazanınca puan artar: " + JSON.stringify(r.win));
  expect(r.win.hist.mode === "dereceli" && r.win.hist.place === 1 && r.win.hist.of === 4, "maç geçmişine yazılır");
  expect(r.lose.place >= 3 && r.lose.delta < 0 && r.lose.lp === r.lose.before + r.lose.delta, "kaybedince puan düşer: " + JSON.stringify(r.lose));
  expect(r.quit.lp === r.quit.expect && r.quit.left && r.quit.friendly, "yarıda bırakılan dereceli maç son sıra sayılır, dostluk maçı puansız: " + JSON.stringify(r.quit));
  expect(r.ranked === 3 && r.matches === 2, "sayaçlar: " + r.ranked + " dereceli, " + r.matches + " biten maç: " + r.hist);
  // Sayfayı kapatıp açmak da terk sayılır
  const lp0 = await p.eval("(startRankedBattle(), career.lp)"), pend = await p.eval("career.pending.delta");
  await p.reload();
  const after = await p.eval("({ lp: career.lp, pending: career.pending, left: career.history[0].left, toast: toasts.textContent })");
  expect(after.lp === lp0 + pend && after.pending === null && after.left && after.toast.includes("yarıda"), "yenileme sonrası terk cezası: " + JSON.stringify(after));
});

test("Kariyer: sayaçlar, başarımlar, seri, panel, kalıcılık, sıfırlama", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const step = (sec, auto) => { for (let i = 0; i < sec * 60; i++) { __sim(2, auto); updateBattle(1 / 60); } };
    const brick = () => bricks.find(b => !b.dead && !b.unbreakable);
    __start(1); destroyBrick(brick());
    const live = { ilk: !!career.ach.ilk, toast: toasts.textContent.includes("İlk Tuğla") };
    const bad = __sim(900, true); Object.assign(live, { bricks: career.stats.bricks, time: state.time > 0 });
    state.combo = 9; destroyBrick(brick()); const cilgin = !!career.ach.cilgin && career.stats.fevers >= 1;
    state.combo = 19; destroyBrick(brick()); const zincir = !!career.ach.zincir && career.stats.bestCombo >= 20;
    state.level = 10; nextLevel(); const imparator = !!career.ach.imparator && career.stats.bestLevel === 11;
    state.lives = 1; loseLife(); lastEnd(); const classic = { games: career.stats.games, time: career.stats.time > 0, mode: state.mode };
    toMenu();
    Object.assign(vsCfg, { name: "Albas", bots: 7, skill: "efsane", dur: 120, target: "lider" });
    const win = () => { startBotBattle(); step(4); state.score = 1e6; state.lives = 1; battle.clock = battle.duration; updateBattle(1 / 60); const pl = battle.myPlace; draw(); action(); return pl; };
    const places = [win(), win(), win()];
    const streak = { wins: career.stats.wins, streak: career.stats.streak, best: career.stats.bestStreak, podiums: career.stats.podiums,
                     got: ["kapisma", "zafer", "seri3", "kalabalik", "makine", "sonnefes"].filter(k => !career.ach[k]), flawless: !!career.ach.kusursuz === (run.lifeLost === 0) };
    vsCfg.bots = 2; startBotBattle(); step(4);
    battle.charge = 9; battleCharge(1); state.shield = 1; receiveAttack("Test");
    for (const b of battle.players) if (b.kind === "bot") b.score = 1e6;
    state.score = 0; battle.clock = battle.duration; updateBattle(1 / 60); action();
    const loss = { streak: career.stats.streak, best: career.stats.bestStreak, attacks: career.stats.attacks, blocked: career.stats.blocked, hist: career.history.length, mode: career.history[0].mode };
    togglePanel(careerPanel, renderCareer);
    const got = ACHIEVEMENTS.filter(a => career.ach[a.id]).length;
    const panel = { open: !careerPanel.hidden, stats: document.querySelectorAll("#cr-stats .stat").length, achGot: document.querySelectorAll("#cr-ach .ach.got").length, got,
                    ach: document.querySelectorAll("#cr-ach .ach").length, rows: document.querySelectorAll("#cr-history tr").length, head: document.getElementById("cr-achhead").textContent,
                    card: careerPanel.querySelector(".rank-card") !== null, menu: (closePanels(), draw(), true) };
    return { bad, live, cilgin, zincir, imparator, classic, places, streak, loss, panel };
  })()`);
  expect(r.bad.length === 0, "oyun sorunsuz: " + r.bad);
  expect(r.live.bricks > 0 && r.live.ilk && r.live.toast && r.live.time, "tuğla sayacı canlı artar, başarım bildirimi çıkar: " + JSON.stringify(r.live));
  expect(r.cilgin && r.zincir && r.imparator, "ÇILGIN MOD, 20 combo, 11. bölüm başarımları anında açılır");
  expect(r.classic.games === 1 && r.classic.time && r.classic.mode === "gameover", "klasik oyun sonu sayılır: " + JSON.stringify(r.classic));
  expect(r.places.join() === "1,1,1", "üç galibiyet: " + r.places);
  expect(r.streak.wins === 3 && r.streak.streak === 3 && r.streak.best === 3 && r.streak.podiums === 3 && !r.streak.got.length && r.streak.flawless,
         "galibiyet serisi ve maç başarımları (8 kişilik, efsane bot, son can): " + JSON.stringify(r.streak));
  expect(r.loss.streak === 0 && r.loss.best === 3 && r.loss.attacks >= 1 && r.loss.blocked === 1 && r.loss.hist === 4 && r.loss.mode === "dostluk",
         "yenilgi seriyi bozar; saldırı ve kalkan sayılır; geçmiş: " + JSON.stringify(r.loss));
  expect(r.panel.open && r.panel.stats === 19 && r.panel.ach === 25 && r.panel.achGot === r.panel.got && r.panel.rows === 5 && r.panel.head.includes(r.panel.got + "/25") && r.panel.card,
         "kariyer paneli: " + JSON.stringify(r.panel));
  const saved = await p.eval("JSON.stringify([career.stats.matches, career.stats.bricks, Object.keys(career.ach).length, career.history.length])");
  await p.reload();
  expect(await p.eval("JSON.stringify([career.stats.matches, career.stats.bricks, Object.keys(career.ach).length, career.history.length])") === saved, "kariyer sayfa yenilenince korunur: " + saved);
  const reset = await p.eval(`(() => { const b = document.getElementById("cr-reset"); b.click(); const armed = career.stats.matches > 0; b.click();
    return armed && career.stats.matches === 0 && career.lp === START_LP && !Object.keys(career.ach).length && !career.history.length && store.get("bb_career").stats.bricks === 0; })()`);
  expect(reset, "kariyeri sıfırla (iki tıkla onaylı)");
});

// İki sayfa: biri oda sahibi, biri misafir — gerçek WebRTC bağlantısı
test("Çevrim içi kapışma (iki sayfa, WebRTC)", async ({ p, open, expect, sleep }) => {
  const g = await open();
  await p.eval(`(() => { Object.assign(vsCfg, { name: "Albas", dur: 120, netBots: 1, skill: "usta", ranked: true }); career.lp = 1300; document.getElementById("net-host").click(); return 1; })()`);
  await g.eval(`(() => { vsCfg.name = "Arkadaş"; career.lp = 1000; document.getElementById("net-join").click(); return 1; })()`);
  const offer = await p.eval("hostInvite()");
  const answer = await g.eval(`guestJoin(${JSON.stringify(offer)})`);
  expect(offer.startsWith("BBO1:") && answer.startsWith("BBA1:") && offer.length < 2000, "davet/cevap kodları: " + offer.length + " / " + answer.length + " karakter");
  await p.eval(`hostAcceptAnswer(${JSON.stringify(answer)})`);
  for (let i = 0; i < 40 && !(await p.eval("net.peers.size")); i++) await sleep(250);
  await sleep(400);
  const lobby = [await p.eval("lobbyPlayers().map(x => x.name).join()"), await g.eval("net.myId + ':' + net.lobby.map(x => x.name).join()")];
  expect(lobby[0] === "Albas,Arkadaş" && lobby[1] === "g1:Albas,Arkadaş", "bağlantı ve lobi: " + lobby);
  const lobbyLp = [await p.eval("lobbyPlayers().map(x => x.lp).join()"), await g.eval("document.getElementById('net-players').textContent")];
  expect(lobbyLp[0] === "1300,1000" && lobbyLp[1].includes("1300") && lobbyLp[1].includes("1000"), "lobide dereceli puanlar: " + lobbyLp);
  await p.eval("(startNetBattle(), 1)");
  await sleep(500);
  const roster = await g.eval("battle.players.map(x => x.id + ':' + x.kind).join()");
  expect(roster === "h:human,g1:me,b1:bot", "misafirde maç başlar: " + roster);
  const lps = [await g.eval("battle.ranked + ':' + battle.players.map(x => x.lp).join()"), await p.eval("battle.ranked + ':' + battle.players.map(x => x.lp).join()")];
  expect(lps[0] === "true:1300,1000,1250" && lps[0] === lps[1], "iki tarafta aynı puanlar, dereceli: " + lps);
  const drive = sec => `(() => { for (let i = 0; i < ${sec} * 60; i++) { __sim(2, true); updateBattle(1 / 60); } return 1; })()`;
  for (let k = 0; k < 3; k++) { await p.eval(drive(2)); await g.eval(drive(2)); await sleep(300); }
  // Bilinen skorlar ata: karşı tarafa birebir ulaşmalı; botun skoru da iki tarafta aynı olmalı
  await p.eval("(state.score = 1111, pById('b1').score += 500, 1)");   // bot rastgele oynar: kısa sürede tuğla kıramamış olabilir
  await g.eval("(state.score = 2222, 1)");
  for (let k = 0; k < 2; k++) { await p.eval(drive(0.3)); await g.eval(drive(0.3)); await sleep(350); }
  await g.eval("(updateBattle(0), 1)");
  const sync = [await g.eval("pById('h').score"), await p.eval("pById('g1').score"), await p.eval("pById('b1').score"), await g.eval("pById('b1').score")];
  expect(sync[0] >= 1111 && sync[1] >= 2222 && sync[2] > 0 && Math.abs(sync[2] - sync[3]) <= 200, "skorlar karşılıklı eşitlenir: " + sync);
  // Saldırı ulaştı mı: kalıcı işaret `hitAt`. Duyuru metni normal oyun akışında üzerine yazılabildiği
  // için ona bağlı kalmak zamanlamaya duyarlı olurdu; teslim kanıtı doğrudan hitAt.
  const reset = "(state.shield = 0, state.curses = {}, state.pendingCurse = null, state.callout = null, powerups = [], meP().hitAt = 0, 1)";
  const landed = "meP().hitAt > 0";
  const landedOn = async page => {
    for (let i = 0; i < 20; i++) {
      if (await page.eval(landed)) return true;
      await sleep(100);
    }
    return false;
  };
  await p.eval(reset);
  await g.eval("(sendAttack(net.myId, 'h'), 1)");
  expect(await landedOn(p), "misafir → oda sahibi saldırısı");
  await g.eval(reset);
  await p.eval("(sendAttack('h', 'g1'), 1)");
  expect(await landedOn(g), "oda sahibi → misafir saldırısı");
  expect(await g.eval("(() => { const m = state.mode; pauseGame(); return state.mode === m; })()"), "çevrim içi maçta duraklatma yok");
  await g.eval(`(() => { state.lives = 1; loseLife(); updateBattle(0.3); return 1; })()`);   // son can gider
  await sleep(400);
  expect(await g.eval("state.mode === 'gameover' && !battle.over") && await p.eval("!pById('g1').alive"), "elenen misafir izler, oda sahibi görür");
  await p.eval("(battle.clock = battle.duration, checkBattleEnd(), 1)");
  await sleep(400);
  const res = [await p.eval("battle.results.map(x => x.name).join()"), await g.eval("battle.over && battle.results.map(x => x.name).join()")];
  expect(res[0] && res[0] === res[1], "sonuç iki tarafta aynı: " + res);
  const rated = [await p.eval("JSON.stringify([battle.rated.delta, career.lp - 1300, career.history[0].mode])"), await g.eval("JSON.stringify([battle.rated.delta, career.lp - 1000, career.history[0].mode])")];
  expect(rated.every(x => { const [d, diff, mode] = JSON.parse(x); return Number.isFinite(d) && d === diff && mode === "cevrimici"; }), "her iki taraf kendi puanını günceller: " + rated);
  await g.eval("(netLeave(), 1)");
  await sleep(600);
  expect(await p.eval("net.peers.size === 0 && netStatusEl.textContent.includes('ayrıldı')"), "ayrılan oyuncu algılanır");
  g.close();
});
