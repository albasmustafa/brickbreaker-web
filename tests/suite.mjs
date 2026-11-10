import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
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
    tiers: TIERS.map(t => t.name).join(), ach: ACHIEVEMENTS.length, stats: Object.keys(STATS).length, career: careerPanel.hidden && versusPanel.querySelector(".rank-card") !== null,
    codex: CODEX_CARDS.length, codexPanel: codexPanel.hidden, song: typeof generateSongLevels === "function" })`);
  expect(r.mode === "menu" && r.bricks === 46 && r.levels === 20, "menü ve ilk bölüm: " + JSON.stringify(r));
  expect(r.themes === 28, "28 hazır tema");
  expect(r.tools === 10, "araç çubuğunda 10 düğme (ses, tema, rastgele, stüdyo, rekabet, meydan, editör, kariyer, ayarlar, tam ekran): " + r.tools);
  expect(r.tiers === "Bronz,Gümüş,Altın,Platin,Elmas,Usta,Efsane" && r.ach === 32 && r.stats === 21 && r.career, "7 lig, 32 başarım, 21 sayaç, rütbe kartı: " + JSON.stringify([r.tiers, r.ach, r.stats, r.career]));
  expect(r.panels, "paneller kapalı başlar");
  expect(r.powers === "WMSFLYDKOHQRNZCB", "16 kapsül: " + r.powers);
  expect(r.curses === 22, "22 lanet: " + r.curses);
  expect(r.bosses === "TUĞLA KRAL,DEMİR İMPARATOR", "2 boss");
  expect(r.looks === 9 && r.paddle === 9 && r.arch === 5 && r.musicFx === 12, "görünüm/raket sesi/müzik tabloları");
  expect(r.sfx >= 36, "ses tablosu: " + r.sfx);
  expect(r.skills === "caylak,usta,efsane" && r.types === "XEZ$+HATIVS", "bot seviyeleri ve tuğla türleri: " + r.types);
  expect(r.codex === 38 && r.codexPanel, "38 koleksiyon kartı, panel kapalı: " + JSON.stringify([r.codex, r.codexPanel]));
  expect(r.song, "şarkıdan bölüm üreteci yüklü");
  expect(r.rows >= 18, "ayarlar paneli satırları üretildi: " + r.rows);
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

test("Koleksiyon: kartlar, seviye, lanet direnci, kalıcılık ve sıfırlama", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    codex.cards = {};
    for (let i = 0; i < 5; i++) codexBump("curse:gorunmez");
    const lvl = cardLevel("curse:gorunmez"), resist = codexCurseResist("gorunmez");
    codexBump("brick:1"); codexBump("boss:TUĞLA KRAL");
    codexTab = "curse"; renderCodex();
    const cards = codexGrid.querySelectorAll(".codex-card").length, got = codexGrid.querySelectorAll(".codex-card.got").length;
    togglePanel(codexPanel, renderCodex);
    return { lvl, resist, discovered: codexDiscovered(), cards, got, open: !codexPanel.hidden, dur: curseDur("gorunmez"),
             progress: codexProgress.textContent, count: codexCard("curse:gorunmez").count };
  })()`);
  expect(r.lvl === 2 && Math.abs(r.resist - 0.8) < 1e-9 && r.discovered === 3 && r.count === 5, "kart seviyesi ve direnç: " + JSON.stringify(r));
  expect(r.cards === 22 && r.got === 1 && r.open && r.progress.includes("1/22"), "koleksiyon paneli: " + JSON.stringify(r));
  expect(Math.abs(r.dur - 6.4) < 1e-9, "lanet kartı süreyi kısaltır: " + r.dur);
  const saved = await p.eval("JSON.stringify([cardLevel('curse:gorunmez'), codexDiscovered()])");
  await p.reload();
  const after = await p.eval("JSON.stringify([cardLevel('curse:gorunmez'), codexDiscovered()])");
  expect(after === saved, "koleksiyon sayfa yenilenince korunur: " + saved + " / " + after);
  const reset = await p.eval(`(() => { codex.cards = {}; saveCodex(); codexTab = "curse"; renderCodex(); return [codexDiscovered(), codexGrid.querySelectorAll(".codex-card.got").length]; })()`);
  expect(reset[0] === 0 && reset[1] === 0, "koleksiyon sıfırlanır: " + reset);
});

test("Hayalet Koşu: kayıt, oynatma, paylaşım kodu ve kapatma", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    settings.ghost = "acik"; __start(1);
    __sim(300, true);
    state.score = 750; state.lives = 1; loseLife(); lastEnd();
    const saved = { score: ghost.best.score, samples: ghost.best.rec.length, mode: state.mode };
    startGame();
    const play = ghost.play && ghost.runRec.length === 0;
    launchBall(); __sim(100, true);
    const scoreNow = ghost.scoreNow;
    const code = encodeGhost();
    const before = ghost.best.score;
    ghost.best = { rec: [], score: 0, level: 1, date: 0 };
    const imported = importGhost(code);
    const after = { score: ghost.best.score, samples: ghost.best.rec.length };
    settings.ghost = "kapali"; startGame();
    const off = ghost.play;
    return { saved, play, scoreNow, code: code.slice(0, 5), imported, before, after, off };
  })()`);
  expect(r.saved.score === 750 && r.saved.samples > 0 && r.saved.mode === "gameover", "hayalet kaydedildi: " + JSON.stringify(r.saved));
  expect(r.play, "yeni koşuda hayalet oynar");
  expect(r.scoreNow >= 0, "hayalet skoru izlenir: " + r.scoreNow);
  expect(r.code === "BBG1:" && r.imported && r.after.score === r.before && r.after.samples > 0, "paylaşım kodu: " + JSON.stringify([r.imported, r.before, r.after]));
  expect(r.off === false, "hayalet kapatılabilir");
});

test("Haftalık tohum: aynı tohum aynı koşu, sonuç kodu ve kapatma", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const wk = weekSeed();
    const first = startWeekly();
    const flags = { active: weekly.active, pact: pactEnabled(), director: directorEnabled(), ghost: ghostEnabled(), last: lastChanceAvailable() };
    __sim(400, true);
    const run1 = { score: state.score, bricks: run.bricks, lives: state.lives, level: state.level, time: Math.round(state.time * 1000) };
    toMenu();
    const second = startWeekly();
    __sim(400, true);
    const run2 = { score: state.score, bricks: run.bricks, lives: state.lives, level: state.level, time: Math.round(state.time * 1000) };
    state.score = 1234; state.lives = 1; loseLife();
    const over = { mode: state.mode, last: weekly.last && weekly.last.score, best: weekly.best, finished: weekly.finished, active: weekly.active, rank: state.lbRank };
    const code = weeklyCode();
    const again = startWeekly();
    const restore = gameRandom === Math.random;
    toMenu();
    const stopped = { active: weekly.active, random: gameRandom === Math.random };
    return { key: wk.key, seed: wk.seed, first, second, flags, run1, run2, over, code, again, restore, stopped };
  })()`);
  expect(/^\d{4}-\d{2}-\d{2}$/.test(r.key) && r.seed > 0, "hafta anahtarı ve tohum: " + JSON.stringify([r.key, r.seed]));
  expect(r.first && r.second && r.flags.active && !r.flags.pact && !r.flags.director && !r.flags.ghost && !r.flags.last, "haftalıkta yardımcılar kapalı: " + JSON.stringify(r.flags));
  expect(JSON.stringify(r.run1) === JSON.stringify(r.run2), "aynı tohum aynı koşu: " + JSON.stringify([r.run1, r.run2]));
  expect(r.over.mode === "gameover" && r.over.last === 1234 && r.over.best >= 1234 && r.over.finished && r.over.active && r.over.rank === 0, "haftalık sonuç: " + JSON.stringify(r.over));
  expect(r.code.startsWith("BBW1:") && r.code.includes("1234"), "sonuç kodu: " + r.code);
  expect(r.again === false && r.restore && !r.stopped.active && r.stopped.random, "tohum durunca normal rastgeleliğe döner");
});

test("Şarkıdan Bölüm: üreteç, aynı şarkı aynı bölüm, kod, başlatma ve bitiş", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const info = { name: "Test Şarkısı", bpm: 128, duration: 150, boss: true, bossName: "BAS EJDERİ", sections: [
      { energy: 0.3, bass: 0.2, high: 0.15 }, { energy: 0.62, bass: 0.55, high: 0.4 }, { energy: 0.88, bass: 0.8, high: 0.6 }] };
    const a = generateSongLevels(info), b = generateSongLevels(info);
    const maps = a.map(x => Array.isArray(x) ? x : x.map);
    const valid = maps.every(map => map.length >= 4 && map.every(line => line.length === 10 && /^[123XEZ$+.]+$/.test(line)));
    const boss = !!(a[a.length - 1].boss && a[a.length - 1].map.slice(0, 5).every(line => line === ".........."));
    const same = JSON.stringify(a) === JSON.stringify(b);
    songLevel.name = "Test Şarkısı"; songLevel.bpm = 128; songLevel.duration = 150; songLevel.levels = a;
    const code = encodeSongLevel();
    songLevel.levels = [];
    const imported = importSongLevel(code);
    const importedBoss = !!(songLevel.levels[2] && songLevel.levels[2].boss);
    const started = startSongLevel();
    const runState = { level: state.level, active: songLevel.active, song: run.song, bricks: bricks.length, mode: state.mode };
    state.level = a.length; nextLevel();
    const done = { mode: state.mode, active: songLevel.active, song: run.song, rank: state.lbRank };
    return { levels: a.length, valid, boss, same, code: code.slice(0, 5), imported, importedBoss, started, runState, done };
  })()`);
  expect(r.levels === 3 && r.valid && r.boss && r.same, "3 bölüm, geçerli harita, boss, deterministik: " + JSON.stringify(r));
  expect(r.code === "BBS1:" && r.imported && r.importedBoss, "bölüm kodu: " + JSON.stringify([r.code, r.imported, r.importedBoss]));
  expect(r.started && r.runState.level === 1 && r.runState.active && r.runState.song && r.runState.bricks > 0 && r.runState.mode === "serve", "şarkı bölümü başladı: " + JSON.stringify(r.runState));
  expect(r.done.mode === "gameover" && !r.done.active && r.done.song && r.done.rank === 0, "şarkı bitince oyun sonu: " + JSON.stringify(r.done));
});

test("Bölüm editörü: boyama, ayna, geri al, boss, kayıt, kod, bağlantı, test koşusu ve dönüş", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    localStorage.removeItem("bb_mylevels");
    openEditor();
    const open = !edPanel.hidden, cells = edGrid.querySelectorAll(".ed-cell").length, brushes = $("ed-palette").children.length;
    const emptyPlay = $("ed-play").disabled && !playEditorLevel();
    // Boyama + ayna + geri al
    editor.mirror = true; editor.brush = "E"; edPushUndo(); edSet(0, 1, "E");
    const mirrored = editor.rows[0] === ".E......E.";
    editor.mirror = false; editor.brush = "3"; edPushUndo(); edSet(1, 0, "3");
    edUndo();
    const undone = editor.rows[1] === ".........." && editor.rows[0] === ".E......E.";
    editor.rows[2] = "1111111111"; editor.slide[2] = true; editor.rows[3] = "X$+HATIVSZ";
    renderEditor();
    const def = editorDef();
    const defOk = Array.isArray(def) && def.length === 4 && def[2] === "1111111111>" && def[1] === "..........";
    // Pointer ile boyama (gerçek DOM olayları)
    editor.brush = "2";
    const cell = edCells[5][4], rc = cell.getBoundingClientRect();
    cell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: rc.left + 3, clientY: rc.top + 3, button: 0, pointerId: 1 }));
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    const painted = editor.rows[5][4] === "2" && cell.textContent === "2";
    editor.rows[5] = "..........";
    // Boss: ilk 5 sıra kilitlenir ve boşaltılır
    edPushUndo(); editor.boss = 0; edClearBossRows(); renderEditor();
    const bossDef = editorDef();
    const bossOk = !!(bossDef.boss && bossDef.boss.name === "TUĞLA KRAL" && bossDef.map.slice(0, 5).every(l => l === "..........")) && edCells[0][0].classList.contains("locked");
    edSet(0, 0, "3"); const lockedStays = editor.rows[0][0] === ".";
    edUndo();
    // Kod ve bağlantı
    editor.name = "Deneme Ğ";
    const code = encodeEditorLevel(), link = editorLink();
    const saveNoName = (editor.name = "", saveEditorLevel());
    editor.name = "Deneme Ğ";
    const saved = saveEditorLevel(), list = edSaved().map(d => d.n);
    const snapshot = JSON.stringify(editor.rows);
    edLoad({ n: "", b: -1, m: [] });
    const imported = importEditorLevel(code) && JSON.stringify(editor.rows) === snapshot && editor.name === "Deneme Ğ" && editor.slide[2];
    edLoad({ n: "", b: -1, m: [] });
    const fromLink = importEditorLevel(link) && JSON.stringify(editor.rows) === snapshot;
    const bad = [importEditorLevel("BBL1:xxxx"), importEditorLevel("BBL1:" + b64url(JSON.stringify({ m: ["QQQQQQQQQQ"] }))), importEditorLevel("merhaba")].some(Boolean);
    const deleted = deleteEditorLevel("Deneme Ğ") && edSaved().length === 0;
    // Test koşusu: pratik, tek bölüm, bitince oyun sonu ve editöre dönüş
    const highBefore = state.high;
    const started = playEditorLevel();
    const runState = { mode: state.mode, custom: run.custom, practice: run.practice, bricks: bricks.length, moving: movingRows.length, panel: edPanel.hidden, pact: pactbar.hidden };
    launchBall(); state.curseAt = Infinity;
    for (const b of bricks) if (!b.unbreakable) b.dead = true;
    checkLevelDone();
    for (let i = 0; i < 400 && state.mode === "levelclear"; i++) update(STEP);
    const done = { mode: state.mode, rank: state.lbRank, high: state.high === highBefore };
    draw();
    action();
    const back = { mode: state.mode, panel: !edPanel.hidden, playing: editor.playing };
    closePanels();
    // Şablon: 5. bölüm (boss) şablonu boss'u da getirir
    $("ed-templates").children[4].click();
    const tpl = editor.boss === 0 && editor.rows[5] === "2.+.22.+.2";
    return { open, cells, brushes, emptyPlay, mirrored, undone, defOk, painted, bossOk, lockedStays, code: code.slice(0, 5), link: /#bbl=/.test(link),
             saveNoName, saved, list, imported, fromLink, bad, deleted, started, runState, done, back, tpl };
  })()`);
  expect(r.open && r.cells === 120 && r.brushes === 15, "panel, 12×10 ızgara, 15 fırça: " + JSON.stringify([r.open, r.cells, r.brushes]));
  expect(r.emptyPlay, "boş bölüm oynanamaz");
  expect(r.mirrored && r.undone && r.painted, "ayna, geri al, fareyle boyama: " + JSON.stringify([r.mirrored, r.undone, r.painted]));
  expect(r.defOk, "harita tanımı (kayan sıra, sondaki boşlar atılır)");
  expect(r.bossOk && r.lockedStays, "boss ilk 5 sırayı kilitler: " + JSON.stringify([r.bossOk, r.lockedStays]));
  expect(r.code === "BBL1:" && r.link && r.imported && r.fromLink && !r.bad, "kod/bağlantı gidiş-dönüş ve geçersiz kod reddi: " + JSON.stringify(r));
  expect(r.saveNoName === "noname" && r.saved === "ok" && r.list.join() === "Deneme Ğ" && r.deleted, "kaydet/sil: " + JSON.stringify([r.saveNoName, r.saved, r.list, r.deleted]));
  expect(r.started && r.runState.mode === "serve" && r.runState.custom && r.runState.practice && r.runState.bricks === 22 && r.runState.moving === 1 && r.runState.panel && r.runState.pact, "test koşusu: " + JSON.stringify(r.runState));
  expect(r.done.mode === "gameover" && r.done.rank === 0 && r.done.high, "bitince oyun sonu, kayıt dışı: " + JSON.stringify(r.done));
  expect(r.back.mode === "menu" && r.back.panel && !r.back.playing, "menüye dönünce editör yeniden açılır: " + JSON.stringify(r.back));
  expect(r.tpl, "boss şablonu");
});

test("Performans ve mobil: top sprite önbelleği, grafik kalitesi, otomatik düşürme, göreli dokunmatik", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    // Sprite önbelleği: 300 topta tek sprite, şekiller çizilir
    startPractice(TUNNEL_LEVEL, true); launchBall(); state.curseAt = Infinity;
    for (let k = 0; k < 6; k++) pxCatch({ kind: "mul" });
    ballSprites.clear(); draw();
    const sprites = ballSprites.size, nBalls = balls.length;
    let t = performance.now(); for (let i = 0; i < 20; i++) drawBalls(); const ballMs = (performance.now() - t) / 20;
    const shapes = ["kare", "elmas", "yildiz", "halka", "daire"].map(sh => { settings.ballShape = sh; drawBalls(); return sh; }).length;
    // Grafik kalitesi: düşükte 1× piksel, önbellekler yenilenir; yükseğe dönünce doğal yoğunluk
    settings.gfx = "dusuk"; applyGfx();
    const low = { dpr: DPR, w: canvas.width, low: lowGfx(), sprites: brickSprites.size, crowdCap: particleCap(), native: NATIVE_DPR };
    for (let i = 0; i < 60; i++) { update(STEP); if (i % 6 === 0) draw(); }
    settings.gfx = "yuksek"; applyGfx();
    const high = { dpr: DPR === NATIVE_DPR, w: canvas.width === W * NATIVE_DPR, low: lowGfx() };
    // Otomatik: oyun akarken 2.5 sn yavaş kare → bir kez düşük kaliteye geçer ve haber verir
    settings.gfx = "oto"; perf.auto = false; perf.ema = 1 / 60; applyGfx();
    toMenu(); for (let i = 0; i < 200; i++) perfSample(0.05);
    const menuIgnored = !perf.auto;
    __start(1);
    for (let i = 0; i < 30; i++) perfSample(1 / 60);
    const fastStays = !perf.auto;
    for (let i = 0; i < 120 && !perf.auto; i++) perfSample(0.04);
    const autoOn = perf.auto && lowGfx() && DPR === 1 && document.querySelector("#toasts").textContent.includes("Düşük grafik");
    perf.auto = false; applyGfx();
    // Dokunmatik: göreli modda raket parmağın altına zıplamaz, kaydırma kadar gider
    const rect = canvas.getBoundingClientRect(), k = W / rect.width;
    const touch = (type, x) => canvas.dispatchEvent(new TouchEvent(type, { cancelable: true, bubbles: true,
      touches: type === "touchend" ? [] : [new Touch({ identifier: 1, target: canvas, clientX: x, clientY: rect.top + rect.height * 0.8 })],
      changedTouches: [new Touch({ identifier: 1, target: canvas, clientX: x, clientY: rect.top + rect.height * 0.8 })] }));
    settings.touch = "goreli"; state.mode = "playing"; paddle.x = 300;
    touch("touchstart", rect.left + 10);
    const noJump = paddle.x === 300;
    touch("touchmove", rect.left + 10 + 20 / k);
    const moved = Math.round(paddle.x - 300);
    touch("touchend", rect.left + 30);
    settings.touch = "mutlak";
    touch("touchstart", rect.left + rect.width / 2);
    const absCenter = Math.round(paddle.x + paddle.w / 2);
    touch("touchend", rect.left + rect.width / 2);
    state.mode = "serve"; draw();
    return { sprites, nBalls, ballMs, shapes, low, high, menuIgnored, fastStays, autoOn, noJump, moved, absCenter, touchHint: lastInputTouch };
  })()`);
  expect(r.nBalls >= 250 && r.sprites === 1, "fırtınada tek top sprite'ı: " + JSON.stringify([r.nBalls, r.sprites]));
  expect(r.ballMs < 25, "300 top çizimi: " + r.ballMs.toFixed(2) + " ms");
  expect(r.low.dpr === 1 && r.low.w === 800 && r.low.low && (r.low.native === 1 || r.low.sprites === 0), "düşük kalite 1× piksel ve önbellek yenileme: " + JSON.stringify(r.low));
  expect(r.high.dpr && r.high.w && !r.high.low, "yüksek kalite doğal yoğunluk: " + JSON.stringify(r.high));
  expect(r.menuIgnored && r.fastStays && r.autoOn, "otomatik düşürme yalnızca oyunda ve yavaşken: " + JSON.stringify([r.menuIgnored, r.fastStays, r.autoOn]));
  expect(r.noJump && r.moved === 30, "göreli dokunmatik: zıplamaz, 20 px kaydırma = 30 px raket: " + JSON.stringify([r.noJump, r.moved]));
  expect(r.absCenter === 400 && r.touchHint, "mutlak dokunmatik parmağı izler, ipucu dokunmaya döner: " + JSON.stringify([r.absCenter, r.touchHint]));
});

test("Erişilebilirlik: renk körü paleti, parlama azaltma, klavyeyle panel ve pakt, ekran okuyucu duyuruları", async ({ p, expect, sleep }) => {
  const r = await p.eval(`(() => {
    // Renk körü paleti: tema ne olursa olsun Okabe-Ito renkleri ve noktacıklar
    __start(1);
    settings.colorblind = "acik";
    const cvd = [1, 2, 3].map(hpColor).join();
    const lum = [1, 2, 3].map(h => relLum(hpColor(h)));
    const distinct = Math.min(Math.abs(lum[0] - lum[1]), Math.abs(lum[1] - lum[2]), Math.abs(lum[0] - lum[2])) > 0.1;
    draw();
    settings.colorblind = "kapali";
    const back = hpColor(2) === T().b2;
    // Parlama azaltma: müzik flaşı çizilmez, ÇILGIN MOD tonu yavaş döner, sersemleme yanıp sönmez
    settings.flashes = "azaltilmis";
    music.flash = 0.3; ctx.clearRect(0, 0, W, H); drawMusicFlash();
    const px = ctx.getImageData(5 * DPR, 5 * DPR, 1, 1).data[3];
    state.feverUntil = state.time + 5; state.stunUntil = state.time + 5;
    const blinks = new Set(); for (let i = 0; i < 12; i++) { state.time += 1 / 24; draw(); blinks.add(fxOn("stun") && (calmFx() || Math.floor(state.time * 12) % 2)); }
    settings.flashes = "normal"; music.flash = 0;
    // Klavye: Enter ile açılan panelde odak içeride, Tab panelde döner, Esc kapatınca odak düğmeye döner
    toMenu();
    const btn = [...toolbar.querySelectorAll("button")].find(b => b.textContent.includes("Ayarlar"));
    btn.focus(); btn.click();
    const inPanel = settingsPanel.contains(document.activeElement) && !document.activeElement.classList.contains("panel-x");
    const f = focusables(settingsPanel);
    f[f.length - 1].focus();
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    const wrapped = document.activeElement === f[0];
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const restored = settingsPanel.hidden && document.activeElement === btn;
    // Odaktaki düğmede boşluk oyunu başlatmaz
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    const spaceSafe = state.mode === "menu";
    btn.blur();
    // Pakt: 2 tuşu ikinci kartı seçer
    __start(1); run.pactOfferLevel = 0; settings.pacts = "acik"; state.mode = "serve";
    const shown = showPactOffer();
    const want = pactOffer && pactOffer[1].id;
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
    const picked = shown && run.pacts.includes(want) && pactbar.hidden;
    // Ekran okuyucu: callout ve oyun sonu canlı bölgeye yazılır; panel aria-modal
    callout("BÖLÜM 7");
    return { cvd, distinct, back, px, blinks: [...blinks].join(), inPanel, wrapped, restored, spaceSafe, picked, modal: settingsPanel.getAttribute("aria-modal") };
  })()`);
  await sleep(400);
  const live = await p.eval(`document.getElementById("srlive").textContent`);
  await p.eval(`(() => { state.lives = 1; run.lastChanceUsed = true; loseLife(); return 1; })()`);
  await sleep(400);
  const over = await p.eval(`document.getElementById("srlive").textContent`);
  expect(r.cvd === "#56b4e9,#f0e442,#d55e00" && r.distinct && r.back, "renk körü paleti ve parlaklık farkı: " + JSON.stringify(r));
  expect(r.px === 0 && r.blinks === "true", "parlama azaltma: flaş yok, yanıp sönme yok: " + JSON.stringify([r.px, r.blinks]));
  expect(r.inPanel && r.wrapped && r.restored && r.spaceSafe && r.modal === "true", "klavyeyle panel: " + JSON.stringify(r));
  expect(r.picked, "pakt 2 tuşuyla seçildi");
  expect(live === "BÖLÜM 7" && over.startsWith("OYUN BİTTİ"), "ekran okuyucu duyuruları: " + JSON.stringify([live, over]));
});

test("Fuzz: 40 rastgele editör bölümü × rastgele kapsül, lanet ve pakt kombinasyonları", async ({ p, expect }) => {
  // Tohumlu rastgelelik: hata çıkarsa aynı tohumla tekrar üretilebilir (mesajda yazar)
  const r = await p.eval(`(() => {
    const rand = seeded(20261105), pickR = a => a[(rand() * a.length) | 0];
    const chars = ".123XEZ$+HATIVS".split(""), powers = Object.keys(POWERS), curses = Object.keys(CURSES), pacts = PACT_POOL.map(x => x.id);
    const fails = [];
    let cleared = 0, steps = 0;
    for (let run_ = 0; run_ < 40; run_++) {
      // Rastgele bölüm: 1–12 sıra, yoğunluk değişken, ara sıra kayan sıra ve boss
      const boss = rand() < 0.2 ? (rand() < 0.5 ? 0 : 1) : -1, rows = 1 + ((rand() * 12) | 0), dens = 0.2 + rand() * 0.8;
      const m = [];
      for (let r = 0; r < rows; r++) {
        let line = "";
        for (let c = 0; c < 10; c++) line += rand() < dens ? pickR(chars) : ".";
        m.push(line + (rand() < 0.2 ? ">" : ""));
      }
      edLoad({ n: "fuzz" + run_, b: boss, m });
      if (!edPlayable()) editor.rows[ED_ROWS - 1] = "1111111111";
      if (!playEditorLevel()) { fails.push(run_ + ": başlamadı"); continue; }
      settings.hazards = "normal";
      if (rand() < 0.5) applyPact(pickR(pacts));
      launchBall(); state.curseAt = Infinity;
      for (let k = 0; k < 4; k++) {
        if (rand() < 0.6) applyPower(pickR(powers));
        const cid = pickR(curses);
        if (rand() < 0.5 && (!CURSES[cid].ok || CURSES[cid].ok())) startCurse(cid);
        const bad = __sim(240, true);
        steps += 240;
        if (bad.length) { fails.push(run_ + ": top " + bad[0] + " " + JSON.stringify(m)); break; }
        // Değişmezler: tuğla canı sınırda, ölü tuğla çarpışmaz, skor sayı, can 0..9
        const badBrick = bricks.find(b => !b.unbreakable && !(b.hp >= (b.dead ? 0 : 1) && b.hp <= Math.max(b.maxHp, 4)));
        if (badBrick) { fails.push(run_ + ": tuğla canı " + badBrick.hp); break; }
        if (!Number.isFinite(state.score) || state.lives < 0 || state.lives > MAX_LIVES) { fails.push(run_ + ": skor/can " + state.score + "/" + state.lives); break; }
        if (state.mode === "gameover") break;
      }
      if (state.mode === "gameover" || state.mode === "levelclear") cleared++;
      toMenu(); closePanels();
    }
    return { fails, cleared, steps };
  })()`);
  expect(r.fails.length === 0, "fuzz (tohum 20261105) hata: " + r.fails.slice(0, 3).join(" | "));
  expect(r.steps >= 40 * 240, "fuzz adımları koştu: " + r.steps);
});

test("Arayüz uçtan uca: editör düğmeleri, şarkı dosyası analizi, hayalet ve şarkı kodu düğmeleri", async ({ p, expect, sleep }) => {
  // Editör: tüm düğmeler gerçek tıklamayla
  const e = await p.eval(`(() => {
    localStorage.removeItem("bb_mylevels");
    const click = id => $(id).click();
    openEditor();
    $("ed-palette").children[5].click();                        // E fırçası
    const brushE = editor.brush === "E";
    click("ed-mirror"); edPushUndo(); edSet(2, 0, editor.brush); const mir = editor.rows[2] === "E........E"; click("ed-mirror");
    click("ed-random"); const rnd = editor.rows.some(l => /[^.]/.test(l));
    click("ed-undo"); const und = editor.rows[2] === "E........E";
    edSlides[2].click(); const slide = editor.slide[2]; edSlides[2].click();
    $("ed-boss").children[2].click(); const boss = editor.boss === 1 && editor.rows[2] === ".........."; $("ed-boss").children[0].click();
    click("ed-clear"); const cleared = editor.rows.every(l => l === "..........") && $("ed-play").disabled;
    click("ed-save"); const saveEmpty = edMsg.textContent;
    $("ed-templates").children[2].click(); const tpl = editor.rows[0] === "....EE....";
    edName.value = "Piramit"; edName.dispatchEvent(new Event("input"));
    click("ed-save"); const saved = edSaved().length === 1 && $("ed-saved").textContent.includes("Piramit");
    click("ed-export"); const code = edCode.value;
    click("ed-link"); const link = edCode.value;
    click("ed-clear"); edCode.value = code; click("ed-import"); const imp = editor.rows[0] === "....EE....";
    edCode.value = "çöp"; click("ed-import"); const bad = edMsg.textContent.startsWith("⚠️");
    $("ed-saved").children[0].click(); const opened = edMsg.textContent.includes("Piramit");
    click("ed-delete"); const del = edSaved().length === 0;
    click("ed-delete"); const delNone = edMsg.textContent.startsWith("⚠️");
    click("ed-play"); const playing = run.custom && state.mode === "serve";
    toMenu(); closePanels();
    return { brushE, mir, rnd, und, slide, boss, cleared, saveEmpty, tpl, saved, code: code.slice(0, 5), link: link.includes("#bbl="), imp, bad, opened, del, delNone, playing, link_: link };
  })()`);
  expect(e.brushE && e.mir && e.rnd && e.und && e.slide && e.boss && e.cleared, "editör araçları: " + JSON.stringify(e));
  expect(e.saveEmpty.startsWith("⚠️") && e.tpl && e.saved && e.code === "BBL1:" && e.link && e.imp && e.bad, "kaydet/şablon/kod/bağlantı/yükle: " + JSON.stringify(e));
  expect(e.opened && e.del && e.delNone && e.playing, "aç/sil/test et: " + JSON.stringify(e));
  // Bağlantıyla açılış: #bbl= ile yüklenen sayfa bölümü editöre koyar ve adresi temizler
  await p.eval(`(() => { location.hash = ${JSON.stringify("")} + ${JSON.stringify(e.link_.slice(e.link_.indexOf("#")))}; return 1; })()`);
  await p.reload();
  const h = await p.eval(`({ open: !edPanel.hidden, row: editor.rows[0], hash: location.hash, msg: edMsg.textContent })`);
  expect(h.open && h.row === "....EE...." && h.hash === "" && h.msg.startsWith("🔗"), "bağlantıyla açılış: " + JSON.stringify(h));

  // Şarkı dosyası: sentetik 120 BPM WAV → çözme, analiz, 3 bölüm; kod ve yükle düğmeleri
  const s = await p.eval(`(async () => {
    closePanels();
    const sr = 22050, secs = 12, n = sr * secs, pcm = new Int16Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr, tb = t % 0.5; pcm[i] = Math.round(12000 * Math.sin(2 * Math.PI * (50 + 70 * Math.exp(-tb * 30)) * tb) * Math.exp(-tb * 9) + 2000 * Math.sin(2 * Math.PI * 440 * t) * (t > 8 ? 1 : 0.2)); }
    const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), str = (o, x) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
    new Int16Array(buf, 44).set(pcm);
    const ok = await loadSongFile(new File([buf], "Deneme Ritim.wav", { type: "audio/wav" }));
    const info = { ok, name: songLevel.name, bpm: songLevel.bpm, levels: songLevel.levels.length, card: songCard.textContent, msg: songMsg.textContent };
    const bad = await loadSongFile(new File([new Uint8Array(64)], "bozuk.mp3")), badMsg = songMsg.textContent;
    $("song-code").click(); const code = songCodeBox.value;
    songLevel.levels = []; $("song-code").click(); const noSong = songMsg.textContent;
    songCodeBox.value = code; $("song-import").click(); const imported = songLevel.levels.length === 3 && songMsg.textContent.startsWith("📥");
    songCodeBox.value = "BBS1:xyz"; $("song-import").click(); const rejected = songMsg.textContent.startsWith("⚠️");
    $("song-start").click(); const started = run.song && songLevel.active;
    toMenu();
    return { info, bad, badMsg, code: code.slice(0, 5), noSong, imported, rejected, started };
  })()`);
  expect(s.info.ok && s.info.name === "Deneme Ritim" && s.info.levels === 3 && s.info.bpm >= 100 && s.info.bpm <= 140, "WAV analizi: " + JSON.stringify(s.info));
  expect(!s.bad && s.badMsg.startsWith("⚠️"), "bozuk dosya reddi: " + s.badMsg);
  expect(s.code === "BBS1:" && s.noSong.startsWith("⚠️") && s.imported && s.rejected && s.started, "şarkı düğmeleri: " + JSON.stringify(s));

  // Hayalet düğmeleri: kod al, yükle, bozuk kod, sil
  const g = await p.eval(`(() => {
    const rec = Array.from({ length: 40 }, (_, i) => [i * 0.4, 300 + i, 500, i * 10, 1]);
    ghost.best = { rec, score: 999, level: 2, date: Date.now() };
    $("ghost-export").click(); const code = $("ghost-code").value;
    $("ghost-clear").click(); const cleared = !ghost.best.rec.length;
    $("ghost-code").value = code; $("ghost-import").click(); const back = ghost.best.score === 999 && ghost.best.rec.length >= 2;
    $("ghost-code").value = "BBG1:@@"; $("ghost-import").click(); const bad = $("ghost-msg").textContent;
    return { code: code.slice(0, 5), cleared, back, bad };
  })()`);
  expect(g.code === "BBG1:" && g.cleared && g.back && g.bad.startsWith("⚠️"), "hayalet düğmeleri: " + JSON.stringify(g));
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

test("Kapsüller: 16 kapsülün hepsi etkisini gösterir", async ({ p, expect }) => {
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
  expect(d.all === 16 && !d.goodBad, "ağırlıklı düşme: hepsi düşer, altın/boss yalnızca iyi kapsül verir");
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

test("Yeni tuğla türleri: yenilenen, kalkanlı, ikiz, buz, virüs, şifacı", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(2);
    // İKİZ: birini kır → ikisi de dağılır, ikisine de sayaç yazılır
    const twins = bricks.filter(b => b.wasTwin);
    const t = twins[0], pair = t.twin;
    const twin0 = run.twinBricks;
    damageBrick(t, 1);
    const twin = { paired: !!pair, both: t.dead && pair.dead, count: run.twinBricks - twin0 };
    // YENİLENEN: yarım kalınca zamanla canını geri kazanır
    const h = bricks.find(b => b.regen && !b.dead);
    damageBrick(h, 1);
    const wounded = h.hp;
    h.healAt = state.time + 0.01; state.time += 0.02; updateSpecialBricks(0);
    const regen = { wounded, healed: h.hp };
    __start(6);
    // KALKANLI: top yalnız kalkanı aşındırır; 4 vuruşta kalkan iner; lazer kalkanı tanımaz
    const a = bricks.find(b => b.armorHp > 0);
    damageBrick(a, 1);
    const chip = { hp: a.hp, armor: a.armorHp };
    damageBrick(a, 1); damageBrick(a, 1); damageBrick(a, 1);
    const stripped = a.armorHp === 0 && a.hp === 1 && !a.dead;
    const a2 = bricks.find(b => b.armorHp > 0 && b !== a && !b.dead);
    damageBrick(a2, 1, 0, "laser");
    const lasered = a2.dead;
    // BUZ: kırılınca komşuları donar (+2 can)
    __start(9);
    const ice = bricks.find(b => b.ice && !b.dead);
    const nb = bricks.find(o => !o.dead && o !== ice && !o.unbreakable && !o.explosive && !(o.armorHp > 0) &&
                                (o.col - ice.col) ** 2 + (o.row - ice.row) ** 2 <= 2);
    const hp0 = nb.hp;
    destroyBrick(ice);
    const froze = { frozen: !!nb.frozen, gain: nb.hp - hp0 };
    // VİRÜS: nabızda en zayıf komşusunu güçlendirir; kırılınca sayaç işler
    const v = bricks.find(b => b.virus && !b.dead);
    const near = bricks.filter(o => !o.dead && !o.unbreakable && o !== v && !o.virus && !(o.armorHp > 0) && !o.explosive &&
                                   o.hp < 3 && (o.col - v.col) ** 2 + (o.row - v.row) ** 2 <= 2);
    const before = near.reduce((s2, o) => s2 + o.hp, 0);
    v.spreadAt = state.time + 0.01; state.time += 0.02; updateSpecialBricks(0);
    const spread = near.reduce((s2, o) => s2 + o.hp, 0) - before;
    const v2 = bricks.find(b => b.virus && !b.dead);
    const kills0 = run.virusBricks;
    destroyBrick(v2);
    const vkilled = run.virusBricks - kills0;
    // ŞİFACI: önce yaralı komşuyu, boss varsa boss'u onarır
    __start(6);
    const doc = bricks.find(b => b.healer && !b.dead);
    const patient = bricks.find(o => !o.dead && o !== doc && !o.unbreakable && (o.col - doc.col) ** 2 + (o.row - doc.row) ** 2 <= 2);
    patient.hp = 1;
    doc.healPulseAt = state.time + 0.01; state.time += 0.02; updateSpecialBricks(0);
    const healedNeighbor = patient.hp === 2;
    state.boss = makeBoss({ name: "TEST", hp: 30, speed: 100, shootEvery: 2 }, 0);
    state.boss.hp = 10;
    doc.healPulseAt = state.time + 0.01; state.time += 0.02; updateSpecialBricks(0);
    const bossHeal = state.boss.hp === 12;
    state.boss = null;
    return { twin, regen, chip, stripped, lasered, froze, spread, vkilled, healedNeighbor, bossHeal };
  })()`);
  expect(r.twin.paired && r.twin.both && r.twin.count === 2, "ikiz çift kırılır ve iki tuğla sayılır: " + JSON.stringify(r.twin));
  expect(r.regen.wounded === 1 && r.regen.healed === 2, "yenilenen canını geri kazanır: " + JSON.stringify(r.regen));
  expect(r.chip.hp === 1 && r.chip.armor === 3 && r.stripped, "kalkan vuruşları aşındırır, canına dokunmaz: " + JSON.stringify([r.chip, r.stripped]));
  expect(r.lasered, "lazer kalkanı tanımaz");
  expect(r.froze.frozen && r.froze.gain === 2, "buz komşularını dondurur (+2 can): " + JSON.stringify(r.froze));
  expect(r.spread >= 1 && r.vkilled === 1, "virüs komşusunu güçlendirir, kırılınca sayılır: " + JSON.stringify([r.spread, r.vkilled]));
  expect(r.healedNeighbor && r.bossHeal, "şifacı komşuyu ve boss'u onarır: " + JSON.stringify([r.healedNeighbor, r.bossHeal]));
});

test("Yordamsal haritalar, SERT TUĞLALAR ve VİRÜS SALGINI paktları, DÜŞEN DUVAR, ritm bonusu", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    // GÜNLÜK: tohumdan simetrik duvar; ikinci kurulum birebir aynı
    const sig = () => bricks.map(b => b.row + ":" + b.col + ":" + b.maxHp + (b.virus ? "V" : "")).join(",");
    __start(1);
    const fixed = sig();
    run.daily = true; buildLevel(1);
    // kesin ayna denetimi: her tuğlanın karşılığı da dolu ve aynı türde
    const kind = b => b.virus ? "V" : b.ice ? "I" : b.armored ? "A" : b.wasTwin ? "T" : b.regen ? "H" : b.hp;
    const grid = new Map(bricks.map(b => [b.row + ":" + b.col, kind(b)]));
    const mirrored = bricks.length >= 20 && bricks.every(b => grid.get(b.row + ":" + (9 - b.col)) === kind(b));
    const map1 = sig();
    buildLevel(1);
    const map2 = sig();
    run.daily = false;
    const sameDaily = map1 === map2 && map2.length > 0 && map1 !== fixed;
    // HAFTALIK: kendi tohumuyla deterministik, günlükten farklı duvar
    startWeekly();
    const wmap1 = sig();
    toMenu();
    startWeekly();
    const wmap2 = sig();
    toMenu();
    const sameWeekly = wmap1 === wmap2 && wmap1 !== map1;
    // SERT TUĞLALAR paktı: sıradan tuğlalar +1 can
    startGame(); launchBall();
    run.pacts = ["tugla"]; buildLevel(2);
    const isPlain = b => !b.unbreakable && !b.explosive && !b.electric && !b.gold && !b.splitter && !b.regen && !b.armored && !b.twin && !b.ice && !b.virus && !b.healer;
    const plains = bricks.filter(isPlain);
    const hardened = plains.length > 0 && plains.every(b => b.maxHp >= 2 && b.hp === b.maxHp);
    // VİRÜS SALGINI paktı: her bölümde 2 virüs tuğla
    run.pacts = ["salgin"]; buildLevel(3);
    const virused = bricks.filter(b => b.virus).length;
    run.pacts = [];
    // DÜŞEN DUVAR: aktifken duvar ~4 sn'de bir iner
    __start(1);
    const y0 = bricks[0].y;
    startCurse("dusen");
    state.dusenNext = state.time + 0.01; state.time += 0.02;
    updateCurses(0.05);
    const descended = bricks[0].ty > y0 && curseOn("dusen");
    // RİTİM BONUSU: vuruşa denk gelen kırış +15 verir ve sayaç tutar
    const target = bricks.find(b => !b.dead && !b.unbreakable);
    music.on = true; music.beat = 1;
    const s0 = state.score, beats0 = run.beats;
    destroyBrick(target);
    const beat = { extra: state.score - s0 > 15, beats: run.beats - beats0 };
    music.on = false; music.beat = 0;
    // Dramaturg: yeni görev tipleri ilerler
    __start(7);
    director.challenge = { id: "zap", text: "3 elektrik tuğlası kır", target: 3, reward: 700, startZap: run.zapBricks, done: false };
    for (let i = 0; i < 3; i++) destroyBrick(bricks.find(b => b.electric && !b.dead));
    const zap = directorProgress(director.challenge).join();
    return { mirrored, sameDaily, sameWeekly, hardened, virused, descended, beat, zap };
  })()`);
  expect(r.mirrored, "günlük duvarı simetriktir");
  expect(r.sameDaily, "aynı gün aynı yordamsal duvar");
  expect(r.sameWeekly, "haftalık kendi tohumuyla deterministik ve günlükten farklı");
  expect(r.hardened, "SERT TUĞLALAR: sıradan tuğlalar +1 can");
  expect(r.virused === 2, "VİRÜS SALGINI: 2 virüs tuğla: " + r.virused);
  expect(r.descended, "DÜŞEN DUVAR duvarı indirir ve süreli kalır");
  expect(r.beat.extra && r.beat.beats === 1, "ritm bonusu: " + JSON.stringify(r.beat));
  expect(r.zap === "3,3", "dramaturg elektrik görevi ilerler: " + r.zap);
});

test("Tünel Fırtınası: piksel duvar, çelik tüneller, zincir, küpler, 300 top, kazanma", async ({ p, expect, shots, sleep }) => {
  const r = await p.eval(`(() => {
    __start(13);
    const P = pxWall, g = P.grid, count = t => g.reduce((s, v) => s + (v === t), 0);
    const info = { active: P.active, level: state.level, total: P.total, steel: count(PX_STEEL), hollow: count(PX_HOLLOW),
                   tunnels: P.tunnels.length, cubes: P.cubes.map(q => q.kind).join(), bricks: bricks.length, done: isLevelDone() };
    const entr = P.tunnels.map(tn => g[pxCellAt(tn.segs[0].a[0], PX.y + PX.rows * PX.s - 3)]);
    // L tüneline alttan top sok: boru gibi çıkışa taşınmalı, içeriden oyup zincir başlatmalı
    const s0 = P.tunnels[0].segs[0], b = __ballAt(s0.a[0], PX.y + PX.rows * PX.s + 30, 0, -mag());
    let guided = false, exited = false;
    for (let i = 0; i < 900 && !exited; i++) { update(STEP); if (b.tun) guided = true; if (guided && !b.tun && b.tunnelUntil > state.time) exited = true; }
    const fell = P.cubes.slice(0, 2).map(q => q.st).join();
    for (let i = 0; i < 240; i++) { paddle.x = clamp(b.x - paddle.w / 2, 0, W - paddle.w); update(STEP); }
    const carve = { exited, guided, chained: P.chained, broken: P.total - P.left, bricksStat: run.bricks };
    // Küpleri raketle yakala: +3 → 4 top, x3 → 12 top
    balls = [Object.assign(newBall(false), { x: 400, y: 450, dx: 0, dy: -mag() })];
    const catchCube = kind => {
      const q = P.cubes.find(q => q.kind === kind);
      Object.assign(q, { st: "fall", x: paddle.x + paddle.w / 2, y: paddle.y - 20, vy: 100 });
      for (let i = 0; i < 30; i++) update(STEP);
      return [balls.length, q.st];
    };
    const plus = catchCube("plus"), mul = catchCube("mul");
    for (let k = 0; k < 4; k++) pxCatch({ kind: "mul" });
    const storm = { max: balls.length, storm: P.storm, maxed: P.maxed };
    return { info, entr, fell, carve, plus, mul, storm };
  })()`);
  expect(r.info.active && r.info.level === 13 && r.info.bricks === 0 && !r.info.done, "13. bölüm piksel duvarı kurdu: " + JSON.stringify(r.info));
  expect(r.info.total > 2500, "binlerce mavi piksel tuğla: " + r.info.total);
  expect(r.info.steel > 300 && r.info.hollow > 500 && r.info.tunnels === 2, "çelik L ve sarmal tünel: " + JSON.stringify(r.info));
  expect(r.info.cubes === "plus,mul,plus,mul", "her çıkışta +3 ve x3 küp: " + r.info.cubes);
  expect(r.entr.every(t => t === 3), "tünel girişleri duvarın altına açık: " + r.entr);
  expect(r.carve.guided && r.carve.exited, "top tünelde taşındı ve çıkıştan çıktı: " + JSON.stringify(r.carve));
  expect(r.fell === "fall,fall", "çıkıştaki küpler topla düştü: " + r.fell);
  expect(r.carve.chained && r.carve.broken > 60 && r.carve.bricksStat > 0, "içeriden oyma + zincir reaksiyon: " + JSON.stringify(r.carve));
  expect(r.plus[0] === 4 && r.plus[1] === "wait", "+3 küpü üç top ekledi: " + r.plus);
  expect(r.mul[0] === 12 && r.mul[1] === "wait", "x3 küpü topları üçe katladı: " + r.mul);
  expect(r.storm.max === 300 && r.storm.storm && r.storm.maxed, "top fırtınası, en çok 300 top: " + JSON.stringify(r.storm));
  if (shots) await p.shot(shots + "/tunnel-storm.png");
  const w = await p.eval(`(() => {
    const P = pxWall, g = P.grid, steelBefore = g.reduce((s, v) => s + (v === PX_STEEL), 0);
    const t0 = performance.now(), bad = __sim(240, false), ms = performance.now() - t0;
    const steelAfter = g.reduce((s, v) => s + (v === PX_STEEL), 0);
    for (let i = 0; i < g.length; i++) pxBreak(i);
    P.burns = [];
    if (state.mode !== "playing") state.mode = "playing";
    update(STEP);
    const won = [state.mode, P.won]; draw();
    return { bad, ms: Math.round(ms), steel: [steelBefore, steelAfter], won };
  })()`);
  expect(w.bad.length === 0, "300 topla 2 sn simülasyonda toplar geçerli: " + w.bad.slice(0, 3));
  expect(w.steel[0] === w.steel[1] && w.steel[0] > 0, "çelik kırılmaz: " + w.steel);
  expect(w.ms < 6000, "300 top akıcı (240 adım + 40 çizim): " + w.ms + " ms");
  expect(w.won[0] === "levelclear" && w.won[1], "duvar bitince kazanma ekranı: " + w.won);
  if (shots) { await sleep(1600); await p.shot(shots + "/tunnel-win.png"); }
  const n = await p.eval(`(() => {
    state.clearAt = state.time; update(STEP);
    const afterTunnel = [state.level, pxWall.active, pxWall.mode];
    const chain = [];
    for (let k = 0; k < 7; k++) {                  // piksel zinciri: koridor → mikro → mozaik → adalar → halka → yildiz → damla → 21
      state.mode = "playing"; levelCleared();
      state.clearAt = state.time; update(STEP);
      chain.push(state.level + ":" + (pxWall.active ? pxWall.mode : "-"));
    }
    const next = [state.level, pxWall.active];
    toMenu(); $("tunnel-start").click();
    const practice = [state.level, run.practice, pxWall.active, state.mode];
    toMenu();
    return { afterTunnel, chain: chain.join(), next, practice, menu: pxWall.active, label: [...levelGrid.querySelectorAll("button")].pop().textContent };
  })()`);
  expect(n.afterTunnel.join() === "14,true,koridor", "13.ten sonra CR7 Koridoru açılır: " + JSON.stringify(n.afterTunnel));
  expect(n.chain === "15:mikro,16:mozaik,17:adalar,18:halka,19:yildiz,20:damla,21:-", "piksel zinciri: " + n.chain);
  expect(n.next[0] === 21 && n.next[1] === false, "damladan sonra piksel duvar kapanır: " + n.next);
  expect(n.practice.join() === "13,true,true,serve", "Meydan panelinden her zaman pratik: " + n.practice);
  expect(n.menu === false && n.label === "💧 20", "menüde kapalı, bölüm ızgarasında 💧 20: " + JSON.stringify(n));
});

test("CR7 Koridoru: tam mavi duvar, dar koridor, ok/ateş küpleri, dar raket, CR7, kazanma saçılımı", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(14);
    const P = pxWall, g = P.grid, count = t => g.reduce((s, v) => s + (v === t), 0);
    const hollowRow = [...Array(PX.cols).keys()].filter(c => g[(PX.rows - 5) * PX.cols + c] === PX_HOLLOW).length;
    const info = { active: P.active, mode: P.mode, level: state.level, total: P.total, blue: count(PX_BLUE), steel: count(PX_STEEL),
                   hollow: count(PX_HOLLOW), tunnels: P.tunnels.length, cubes: P.cubes.map(q => q.kind).join(","),
                   bricks: bricks.length, speed: state.speed, base: levelSpeed(13) };
    // Giriş duvarın altına açık ve koridor dar (5-7 hücre)
    const entr = g[pxCellAt(P.tunnels[0].segs[0].a[0], PX.y + PX.rows * PX.s - 3)];
    // Dar raket: hedef genişlik %72
    update(STEP);
    const paddleW = paddle.targetW;
    // Küpler: +3 üç top ekler, → yön kılavuzu, ▲ ateş
    const b0 = balls.length;
    pxCatch({ kind: "plus" });
    const plus = balls.length - b0;
    
    pxCatch({ kind: "fire" });
    const fire = isFire();
    draw();
    // CR7: ruh halleri çizilir, kutlama/üzülme kancaları çalışır
    cr7Cheer(1); draw();
    const cheer = cr7.mood === "yay";
    cr7Facepalm(); draw();
    const face = cr7.mood === "face";
    // Top koridora girer: alt ortadan sok, tepede zinceri tutuşturur
    const s0 = P.tunnels[0].segs[0], b = __ballAt(s0.a[0], PX.y + PX.rows * PX.s + 30, 0, -mag());
    let guided = false, chained = false;
    for (let i = 0; i < 900 && !(guided && chained); i++) { update(STEP); if (b.tun) guided = true; if (P.chained) chained = true; }
    for (let i = 0; i < 360; i++) update(STEP);   // zincir cephesi yayılsın
    const carve = P.total - P.left;
    // Kazanma: kalan her şeyi kır, saçılım + SIUUU
    for (let i = 0; i < g.length; i++) pxBreak(i);
    P.burns = [];
    if (state.mode !== "playing") state.mode = "playing";
    update(STEP);
    const won = { mode: state.mode, won: P.won, balls: balls.length, mood: cr7.mood };
    return { info, entr, hollowRow, paddleW, plus, fire, cheer, face, guided, chained, carve, won };
  })()`);
  expect(r.info.active && r.info.mode === "koridor" && r.info.level === 14 && r.info.bricks === 0, "14. bölüm koridor düzeyi: " + JSON.stringify(r.info));
  expect(r.info.total > 4800 && r.info.blue > 4800, "tamı tamına mavi duvar: " + JSON.stringify([r.info.total, r.info.blue]));
  expect(r.info.steel > 150 && r.info.hollow > 200 && r.info.tunnels === 1 && r.entr === 3, "tek koridor, çelik dudaklar, giriş açık: " + JSON.stringify([r.info.steel, r.info.hollow, r.entr]));
  expect(r.hollowRow >= 5 && r.hollowRow <= 7, "koridor dar (5-7 hücre): " + r.hollowRow);
  expect(Math.abs(r.paddleW - 72) < 1, "raket dar ve hassas: " + r.paddleW);
  expect(r.info.speed >= r.info.base, "yüksek zorluk: bölüm hızı yüksek: " + JSON.stringify([r.info.speed, r.info.base]));
  expect(r.plus === 3 && r.fire, "küpler: +3 üç top, → yön, ▲ ateş: " + JSON.stringify([r.plus, r.fire]));
  expect(r.cheer && r.face, "CR7 kutlar ve üzülünce yüzünü kapatır: " + JSON.stringify([r.cheer, r.face]));
  expect(r.guided && r.chained && r.carve > 40, "koridorda taşınma ve zincirle oyma: " + JSON.stringify([r.guided, r.chained, r.carve]));
  expect(r.won.mode === "levelclear" && r.won.won && r.won.balls > 30 && r.won.mood === "yay", "kazanınca toplar saçılır, CR7 kutlar: " + JSON.stringify(r.won));
  const pr = await p.eval(`(() => { toMenu(); $("koridor-start").click();
    const st = [state.level, run.practice, pxWall.active, pxWall.mode, state.mode]; toMenu(); return st; })()`);
  expect(pr.join() === "14,true,true,koridor,serve", "panelden koridor pratiği: " + pr);
});

test("CORE/BREAK: 3379 turuncu çekirdek, x3 ve ↔ küpleri, ALL CLEAR", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(12);
    const P = pxWall, g = P.grid, count = t => g.reduce((s2, v) => s2 + (v === t ? 1 : 0), 0);
    const cx = (P.cols - 1) / 2, cy = (P.rows - 1) / 2;
    const info = { active: P.active, mode: P.mode, level: state.level, total: P.total, blue: count(PX_BLUE),
                   steel: count(PX_STEEL), hollow: count(PX_HOLLOW), tunnels: P.tunnels.length,
                   cubes: P.cubes.map(q => q.kind).join(","), center: g[Math.round(cy) * P.cols + Math.round(cx)] === PX_BLUE,
                   corner: g[0] === PX_HOLLOW, bricks: bricks.length };
    // top çekirdeğe çarpar: turuncu hücreler kırılır
    const b = __ballAt(PX.x + cx * P.s, 400, 0, -mag());
    for (let i = 0; i < 240; i++) update(STEP);
    const grind = { broke: P.total - P.left, ballOk: isFinite((balls[0] || b).x) };
    // küpler: ↔ raketi genişletir, x3 topları çoğaltır
    paddle.wideUntil = 0;                       // öğütme sırasında yoldaki küp denk gelmiş olabilir
    const w0 = paddle.wideUntil;
    pxCatch({ kind: "wide" });
    const wide = paddle.wideUntil > state.time && w0 <= state.time;
    const n0 = balls.length;
    pxCatch({ kind: "mul" });
    const mul = balls.length >= n0 * 2;
    // her şeyi kır → ALL CLEAR + saçılım
    for (let i = 0; i < g.length; i++) pxBreak(i);
    P.burns = [];
    if (state.mode !== "playing") state.mode = "playing";
    update(STEP);
    const won = { mode: state.mode, won: P.won, balls: balls.length, callout: state.callout && String(state.callout.text) };
    return { info, grind, wide, mul, won };
  })()`);
  expect(r.info.active && r.info.mode === "core" && r.info.level === 12 && r.info.bricks === 0, "12. bölüm CORE/BREAK: " + JSON.stringify(r.info));
  expect(r.info.total === 3379 && r.info.blue === 3379, "tam 3379 turuncu tuğla: " + r.info.total);
  expect(r.info.steel === 0 && r.info.hollow > 8000 && r.info.tunnels === 0, "çelik/tünel yok, koyu boşluk: " + JSON.stringify(r.info));
  expect(r.info.center && r.info.corner, "yoğun dairesel çekirdek: merkez dolu, köşe boş");
  expect(r.info.cubes === "mul,wide,mul", "küpler x3 ve ↔: " + r.info.cubes);
  expect(r.grind.broke > 0 && r.grind.ballOk, "top çekirdeği öğütür: " + JSON.stringify(r.grind));
  expect(r.wide && r.mul, "küpler: ↔ geniş raket + x3 çoklu top: " + JSON.stringify([r.wide, r.mul]));
  expect(r.won.mode === "levelclear" && r.won.won && r.won.balls > 30 && /ALL CLEAR/.test(r.won.callout || ""), "ALL CLEAR + saçılım: " + JSON.stringify(r.won));
  const pr = await p.eval(`(() => { toMenu(); $("core-start").click(); const st = [state.level, run.practice, pxWall.active, pxWall.mode, state.mode]; toMenu(); return st; })()`);
  expect(pr.join() === "12,true,true,core,serve", "panelden CORE/BREAK pratiği: " + pr);
});

test("Şekil duvarları: Halka, Yıldız, Damla — delikten giriş, küpler, kazanma", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const shapes = {};
    for (const [mode, lv] of [["halka", 18], ["yildiz", 19], ["damla", 20]]) {
      __start(lv);
      const P = pxWall, g = P.grid, count = t => g.reduce((a, v) => a + (v === t ? 1 : 0), 0);
      const cx = P.cols / 2;
      // delik: alt merkez hücresi boş mu (halka/damla); yıldızda kol arası
      const cxr = Math.round(cx);
      const holeOpen = mode === "yildiz"
        ? [...Array(P.rows * P.cols).keys()].some(ix => g[ix] === PX_HOLLOW && (ix % P.cols) > cxr - 20 && (ix % P.cols) < cxr + 20 && ((ix / P.cols) | 0) < P.rows * 0.8)
        : g[(P.rows - 3) * P.cols + cxr] === PX_HOLLOW;
      shapes[mode] = { mode: P.mode, level: state.level, total: P.total, hollow: count(PX_HOLLOW),
                       steel: count(PX_STEEL), cubes: P.cubes.map(q => q.kind).join(","),
                       holeOpen, bricks: bricks.length };
      // topu deliğe yönlendir: halka/damla alttan, yıldız üstten
      const ball = __ballAt(PX.x + cx * P.s, mode === "yildiz" ? 80 : PX.y + P.rows * P.s + 30, 0, mode === "yildiz" ? mag() : -mag());
      for (let i = 0; i < 400; i++) update(STEP);
      shapes[mode].broke = P.total - P.left;
      shapes[mode].ballOk = isFinite((balls[0] || ball).x);
      // kazanma
      for (let i = 0; i < g.length; i++) pxBreak(i);
      P.burns = [];
      if (state.mode !== "playing") state.mode = "playing";
      update(STEP);
      shapes[mode].won = P.won && state.mode === "levelclear";
    }
    return shapes;
  })()`);
  for (const mode of ["halka", "yildiz", "damla"]) {
    const sh = r[mode];
    expect(sh.mode === mode && sh.bricks === 0 && sh.total > 300, mode + " duvarı kuruldu: " + JSON.stringify(sh));
    expect(sh.hollow > 8000 && sh.steel === 0, mode + " koyu boşluk, çelik yok: " + sh.hollow);
    expect(sh.holeOpen, mode + " deliği açık");
    expect(sh.cubes.split(",").length === 3, mode + " üç küp: " + sh.cubes);
    expect(sh.broke > 5 && sh.ballOk, mode + " top duvarı öğütür: " + sh.broke);
    expect(sh.won, mode + " kazanma ekranı");
  }
  const pr = await p.eval(`(() => { toMenu(); $("halka-start").click(); const h = [state.level, pxWall.mode];
    toMenu(); $("yildiz-start").click(); const y = [state.level, pxWall.mode];
    toMenu(); $("damla-start").click(); const d = [state.level, pxWall.mode];
    toMenu(); return { h: h.join(), y: y.join(), d: d.join() }; })()`);
  expect(pr.h === "18,halka" && pr.y === "19,yildiz" && pr.d === "20,damla", "panelden şekil pratiği: " + JSON.stringify(pr));
});

test("Modlar: kolay/orta/zor — hız, can, raket, kapsül, lanet sıklığı, puan; menü hapları tıklanır", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    // Menü hapları çizildi ve kutular dolu
    state.mode = "menu"; draw();
    const boxes = menuModeBoxes.map(b => b.v).join();
    const ortaLabel = menuModeBoxes.find(b => b.v === "normal");
    // Orta (varsayılan): referans değerler
    settings.difficulty = "normal"; startGame(); launchBall();
    const orta = { lives: state.lives, speed: state.speed, pad: state.diffPaddle, drop: state.diffDrop, gap: state.diffCurseGap, mul: state.diffScoreMul };
    const s0 = state.score; addScore(100);
    const ortaScore = state.score - s0;
    // Kolay: geniş raket, bol kapsül, seyrek lanet, puan ×0.75
    settings.difficulty = "kolay"; startGame(); launchBall();
    const kolay = { lives: state.lives, speed: state.speed, pad: state.diffPaddle, drop: state.diffDrop, gap: state.diffCurseGap, mul: state.diffScoreMul };
    const s1 = state.score; addScore(100);
    const kolayScore = state.score - s1;
    // Zor: dar raket, sık lanet, puan ×1.35
    settings.difficulty = "zor"; startGame(); launchBall();
    const zor = { lives: state.lives, speed: state.speed, pad: state.diffPaddle, drop: state.diffDrop, gap: state.diffCurseGap, mul: state.diffScoreMul };
    const s2 = state.score; addScore(100);
    const zorScore = state.score - s2;
    scheduleNextCurse(true);                      // zorlanet aralığı kısalır
    const curseIn = state.curseAt - state.time;
    // Menü hapı tıklaması: zor kutusunu tıkla → ayar değişir, oyun başlamaz
    settings.difficulty = "normal";
    state.mode = "menu"; draw();
    const z = menuModeBoxes.find(b => b.v === "zor");
    const clicked = tryMenuModeClick((z.x + z.w / 2) * (canvas.getBoundingClientRect().width / W) + canvas.getBoundingClientRect().left,
                                     (z.y + z.h / 2) * (canvas.getBoundingClientRect().height / H) + canvas.getBoundingClientRect().top);
    const afterClick = { mode: state.mode, diff: settings.difficulty, saved: JSON.parse(localStorage.getItem("bb_settings")).difficulty };
    settings.difficulty = "normal";
    return { boxes, ortaLabel: !!ortaLabel, orta, kolay, zor, scores: [kolayScore, ortaScore, zorScore], curseIn, clicked, afterClick };
  })()`);
  expect(r.boxes === "kolay,normal,zor" && r.ortaLabel, "menüde üç mod hapı: " + r.boxes);
  expect(r.orta.lives === 3 && Math.abs(r.orta.pad - 1) < 1e-9 && r.scores[1] === 100, "orta: can 3, raket ×1, puan ×1: " + JSON.stringify(r.orta));
  expect(r.kolay.lives === 5 && r.kolay.speed < 340 && r.kolay.pad > 1 && r.kolay.drop > 1 && r.kolay.gap > 1 && r.scores[0] === 75,
         "kolay: yavaş, geniş raket, bol kapsül, seyrek lanet, puan ×0.75: " + JSON.stringify(r.kolay) + r.scores[0]);
  expect(r.zor.lives === 2 && r.zor.speed > 340 && r.zor.pad < 1 && r.zor.drop < 1 && r.zor.gap < 1 && r.scores[2] === 135,
         "zor: hızlı, dar raket, az kapsül, sık lanet, puan ×1.35: " + JSON.stringify(r.zor) + r.scores[2]);
  expect(r.curseIn > 0, "lanet zamanlayıcı çalışır: " + r.curseIn);
  expect(r.clicked && r.afterClick.mode === "menu" && r.afterClick.diff === "zor" && r.afterClick.saved === "zor",
         "menüden mod seçilebilir, oyun başlamaz, kalıcı: " + JSON.stringify(r.afterClick));
  const pill = await p.eval(`(() => { settings.difficulty = "normal"; state.mode = "menu"; draw();
    return settingsPanel.querySelector('[data-opt="difficulty"][data-val="normal"]').textContent; })()`);
  expect(pill === "Orta", "ayarlar panelinde orta etiketi: " + pill);
});

test("Mikro Duvar: minik tuğlalar, çelik kaburgalar, boşluklar, küpler, kazanma saçılımı", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(15);
    const P = pxWall, g = P.grid, count = t => g.reduce((s2, v) => s2 + (v2 => v2)(0) + (v === t ? 1 : 0), 0);
    const info = { active: P.active, mode: P.mode, level: state.level, cell: P.s, cols: P.cols, rows: P.rows,
                   total: P.total, steel: count(PX_STEEL), hollow: count(PX_HOLLOW), tunnels: P.tunnels.length,
                   cubes: P.cubes.map(q => q.kind).join(","), bricks: bricks.length };
    // Kaburga sırası çelik, boşluklar mavi: 11. sıra kontrolü
    const rib = [...Array(P.cols).keys()].filter(c => g[11 * P.cols + c] === PX_STEEL).length;
    const gapOpen = [30, 101, 157].every(c => g[11 * P.cols + c] === PX_BLUE || g[11 * P.cols + c] === PX_STEEL);
    const gapBlue = [30, 101, 157].filter(c => g[11 * P.cols + c] !== PX_STEEL).length;
    // Top duvara çarpar: minik hücreler kırılır ama kaburga durdurur (çelik kırılmaz)
    const b = __ballAt(432, 400, 0, -mag());   // orta boşluğun tam ortası: içeri sızar
    const steel0 = count(PX_STEEL);
    for (let i = 0; i < 300; i++) update(STEP);
    const grind = { broke: P.total - P.left, steelSame: count(PX_STEEL) === steel0, ballOk: isFinite(balls[0] ? balls[0].x : 0) };
    // Ateş küpü: koridora benzer biçimde yakalanır
    pxCatch({ kind: "fire" });
    const fire = isFire();
    
    draw();
    // Kazanınca saçılım
    for (let i = 0; i < g.length; i++) pxBreak(i);
    P.burns = [];
    if (state.mode !== "playing") state.mode = "playing";
    update(STEP);
    const won = { mode: state.mode, won: P.won, balls: balls.length };
    return { info, rib, gapBlue, grind, fire, won };
  })()`);
  expect(r.info.active && r.info.mode === "mikro" && r.info.level === 15 && r.info.bricks === 0, "15. bölüm mikro düzeyi: " + JSON.stringify(r.info));
  expect(r.info.cell === 4 && r.info.cols === 189 && r.info.rows === 66 && r.info.total > 10000, "minik hücreler (4 px), 10.000+ tuğla: " + JSON.stringify(r.info));
  expect(r.info.steel > 700 && r.info.hollow === 0 && r.info.tunnels === 0, "çelik kaburgalar, tünel yok: " + JSON.stringify(r.info));
  expect(r.rib > 140 && r.gapBlue === 3, "kaburga sırası çelik, üç boşluk açık: " + JSON.stringify([r.rib, r.gapBlue]));
  expect(r.info.cubes === "fire,plus,mul", "küpler: ateş, yön, +3: " + r.info.cubes);
  expect(r.grind.broke >= 5 && r.grind.steelSame && r.grind.ballOk, "top minik tuğlaları öğütür, çelik kırılmaz: " + JSON.stringify(r.grind));
  expect(r.fire, "ateş küpü etkili: " + "" + r.fire);
  expect(r.won.mode === "levelclear" && r.won.won && r.won.balls > 30, "kazanınca toplar saçılır: " + JSON.stringify(r.won));
  const pr = await p.eval(`(() => { toMenu(); $("mikro-start").click();
    const st = [state.level, run.practice, pxWall.active, pxWall.mode, state.mode]; toMenu(); return st; })()`);
  expect(pr.join() === "15,true,true,mikro,serve", "panelden mikro pratiği: " + pr);
});

test("Mozaik ve Adalar duvarları: fayans salınımı, elmas adalar, küpler, kazanma saçılımı", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(16);
    const P = pxWall, count = (gr, t) => gr.reduce((s2, v) => s2 + (v === t ? 1 : 0), 0);
    const moz = { mode: P.mode, level: state.level, cell: P.s, total: P.total, steel: count(P.grid, PX_STEEL), hollow: count(P.grid, PX_HOLLOW),
                  cubes: P.cubes.map(q => q.kind).join(","), tunnels: P.tunnels.length };
    // Fayans dokusu: aynı fayansın hücreleri aynı tondan (küçük parça görünümü)
    const toneUniform = P.tone[7 * P.cols] === P.tone[7 * P.cols + 1] && P.tone[7 * P.cols] === P.tone[8 * P.cols + 3];
    const b = __ballAt(200, 380, 60, -mag());
    for (let i = 0; i < 300; i++) update(STEP);
    const mozPlay = { broke: P.total - P.left, ballOk: isFinite(balls[0] ? balls[0].x : 0) };
    __start(17);
    const ada = { mode: P.mode, level: state.level, cell: P.s, total: P.total, steel: count(P.grid, PX_STEEL), hollow: count(P.grid, PX_HOLLOW),
                  cubes: P.cubes.map(q => q.kind).join(","), tunnels: P.tunnels.length };
    const b2 = __ballAt(432, 380, 0, -mag());          // adalar arasındaki boşluğa
    for (let i = 0; i < 300; i++) update(STEP);
    const adaPlay = { broke: P.total - P.left, ballOk: isFinite(balls[0] ? balls[0].x : 0) };
    for (let i = 0; i < P.grid.length; i++) pxBreak(i);   // adaları bitir: saçılım
    P.burns = [];
    if (state.mode !== "playing") state.mode = "playing";
    update(STEP);
    const won = { mode: state.mode, won: P.won, balls: balls.length };
    return { moz, toneUniform, mozPlay, ada, adaPlay, won };
  })()`);
  expect(r.moz.mode === "mozaik" && r.moz.level === 16 && r.moz.cell === 4 && r.moz.tunnels === 0, "16. bölüm mozaik: " + JSON.stringify(r.moz));
  expect(r.moz.total > 4000 && r.moz.steel > 100 && r.moz.hollow > 1500, "fayans salınımı — mavi/çelik/boşluk: " + JSON.stringify(r.moz));
  expect(r.toneUniform, "fayans tek tondan: küçük parça görünümü");
  expect(r.moz.cubes === "fire,plus,mul", "mozaik küpleri: " + r.moz.cubes);
  expect(r.mozPlay.broke > 0 && r.mozPlay.ballOk, "mozaikte top oynar: " + JSON.stringify(r.mozPlay));
  expect(r.ada.mode === "adalar" && r.ada.level === 17 && r.ada.cell === 4 && r.ada.tunnels === 0, "17. bölüm adalar: " + JSON.stringify(r.ada));
  expect(r.ada.total > 2000 && r.ada.total < 8000 && r.ada.steel > 100 && r.ada.hollow > 8000, "elmas adalar + çelik çekirdekler + geniş boşluk: " + JSON.stringify(r.ada));
  expect(r.ada.cubes === "fire,plus,mul", "adalar küpleri: " + r.ada.cubes);
  expect(r.adaPlay.broke > 0 && r.adaPlay.ballOk, "adalar arasında top gezinir: " + JSON.stringify(r.adaPlay));
  expect(r.won.mode === "levelclear" && r.won.won && r.won.balls > 30, "kazanınca toplar saçılır: " + JSON.stringify(r.won));
  const pr = await p.eval(`(() => {
    toMenu(); $("mozaik-start").click();
    const m = [state.level, run.practice, pxWall.active, pxWall.mode];
    toMenu(); $("adalar-start").click();
    const a = [state.level, run.practice, pxWall.active, pxWall.mode];
    toMenu();
    return { m: m.join(), a: a.join() };
  })()`);
  expect(pr.m === "16,true,true,mozaik" && pr.a === "17,true,true,adalar", "panelden mozaik/adalar pratiği: " + JSON.stringify(pr));
});

test("Hayatta Kalma, BOMBA kapsülü ve duvar başarımları", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1);
    const d0 = bricks.filter(b => !b.dead).length;
    applyPower("B");
    const bomb = d0 - bricks.filter(b => !b.dead).length;          // BOMBA: çevreyi patlatır
    __start(12);
    const p0 = pxWall.left;
    applyPower("B");
    const bombPx = p0 - pxWall.left;                                // piksel duvarda 7×7 alan
    closePanels(); startSurvival();
    const start = { survival: run.survival, lives: state.lives, pact: pactEnabled(), mul: state.diffScoreMul, last: lastChanceAvailable() };
    const m0 = mag() / state.speed;
    state.time += 40;
    const m1 = mag() / state.speed;                                 // ramp: 40 sn sonra daha hızlı
    state.score = 1234; state.lives = 1; loseLife(); lastEnd();
    const over = { mode: state.mode, lb: state.lbRank, list: leaderboard.kalma.length, top: leaderboard.kalma[0] && leaderboard.kalma[0].score };
    __start(12); pxWin();
    const walls = { stat: career.stats.walls, ach: !!career.ach.duvar, won: pxWall.won };
    toMenu();
    const cleared = !run.survival;
    return { bomb, bombPx, start, m0, m1, over, walls, cleared };
  })()`);
  expect(r.bomb >= 3, "BOMBA en az 3 tuğla patlatır: " + r.bomb);
  expect(r.bombPx >= 20, "BOMBA piksel duvarda alan patlatır: " + r.bombPx);
  expect(r.start.survival && r.start.lives === 1 && !r.start.pact && !r.start.last && Math.abs(r.start.mul - 1.5) < 1e-9,
         "hayatta kalma: tek can, pakt/son top yok, puan ×1.5: " + JSON.stringify(r.start));
  expect(r.m0 === 1 && r.m1 > 1.3, "top zamanla hızlanır (40 sn → ×" + r.m1.toFixed(2) + ")");
  expect(r.over.mode === "gameover" && r.over.lb >= 1 && r.over.list === 1 && r.over.top === 1234,
         "kalma liderlik tablosuna yazılır: " + JSON.stringify(r.over));
  expect(r.walls.stat >= 1 && r.walls.ach && r.walls.won, "duvar sayacı + başarım: " + JSON.stringify(r.walls));
  expect(r.cleared, "menüye dönüş survival bayrağını temizler");
});

test("Kampanya: 8 dünya, geçerli haritalar, yıldızlar, kilit, boss'lar, panel, kalıcılık", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const alpha = /^[123XEZ$+HATIVS.]+$/;
    let badRows = 0, bossCount = 0, pixelCount = 0, levelCount = 0;
    for (const w of CAMPAIGN) for (const lv of w.levels) {
      levelCount++;
      if (lv.boss) bossCount++;
      if (lv.pixel) pixelCount++;
      if (Array.isArray(lv)) for (const row of lv) if (row.length !== 10 || !alpha.test(row)) badRows++;
    }
    campSave.stars = {}; campSave.unlocked = 1; campSave.done = false; saveCampaign();   // temiz tur
    const locked = startCampaign(2, 1) === false;                    // 2. dünya kilitli
    const s1 = startCampaign(1, 1);
    const st = { campaign: run.campaign, level: state.level, world: run.world, theme: theme.name === THEMES[0].name, bricks: bricks.length > 0 };
    const step = () => { state.mode = "playing"; levelCleared(); state.clearAt = state.time; update(STEP); };
    campaign.bestCombo = 9;                                          // combo yıldızı
    step();
    const stars1 = campStars(1, 1);
    for (let i = 0; i < 3; i++) step();                              // 1-2, 1-3, 1-4
    const bossFight = !!state.boss;                                  // 1-5: GECE BEKÇİSİ
    const bossName = state.boss && state.boss.name;
    state.mode = "playing";
    hitBoss(9999, 400, 120);                                         // boss düşer → dünya biter → 2. dünya açılır
    state.clearAt = state.time; update(STEP);                        // dünya geçişi işlensin
    const unlocked2 = campSave.unlocked >= 2;
    const world2 = [campaign.world, campaign.stage, theme.name === THEMES[3].name];
    state.score = 777; state.lives = 1; loseLife(); lastEnd();       // kampanya liderliği
    const lb = { mode: state.mode, rank: state.lbRank, list: leaderboard.kampanya.length, top: leaderboard.kampanya[0] && leaderboard.kampanya[0].score };
    togglePanel(campaignPanel, renderCampaignUI);
    const cards = campaignWorlds.querySelectorAll(".camp-world").length;
    const lockedCards = campaignWorlds.querySelectorAll(".camp-world.locked").length;
    const saved = JSON.parse(localStorage.getItem("bb_campaign"));
    closePanels();
    toMenu();
    return { badRows, bossCount, pixelCount, levelCount, locked, s1, st, stars1, bossFight, bossName, unlocked2, world2, lb, cards, lockedCards, savedStars: saved.stars["1"] ? saved.stars["1"][0] : 0, menuClear: !run.campaign };
  })()`);
  expect(r.levelCount === 40 && r.badRows === 0, "40 bölüm, tüm haritalar geçerli: " + JSON.stringify([r.levelCount, r.badRows]));
  expect(r.bossCount === 8 && r.pixelCount === 4, "8 boss, 4 piksel bölüm: " + JSON.stringify([r.bossCount, r.pixelCount]));
  expect(r.locked && r.s1 && r.st.campaign && r.st.level === 1 && r.st.world === 1 && r.st.theme && r.st.bricks, "başlangıç: kilit + kurulum: " + JSON.stringify([r.locked, r.s1, r.st]));
  expect(r.stars1 === 3, "can kaybı yok + 8 combo = 3 yıldız: " + r.stars1);
  expect(r.bossFight && r.bossName === "GECE BEKÇİSİ", "1-5 boss: " + r.bossName);
  expect(r.unlocked2 && r.world2.join() === "2,1,true", "dünya bitince sıradaki açılır (Neon teması): " + JSON.stringify(r.world2));
  expect(r.lb.mode === "gameover" && r.lb.rank >= 1 && r.lb.list === 1 && r.lb.top === 777, "kampanya liderliği: " + JSON.stringify(r.lb));
  expect(r.cards === 8 && r.lockedCards === 6, "panel: 8 kart, 6 kilitli: " + [r.cards, r.lockedCards]);
  expect(r.savedStars === 3, "yıldızlar kalıcı: " + r.savedStars);
  expect(r.menuClear, "menüye dönüş kampanya bayrağını temizler");
  const ach = await p.eval(`(() => { renderCareer(); return !!career.ach.kampilk; })()`);
  expect(ach, "İlk Dünya başarımı açılır");
});

test("Diller: 25 dil eksiksiz, yer tutucular, RTL, dil seçici, tüm ekranlar taşmasız ve çevrilmiş", async ({ p, expect }) => {
  // Kaynak denetimi: her dil 675/675, yer tutucular birebir (tools/i18n.mjs --check)
  const tool = spawnSync(process.execPath, [fileURLToPath(new URL("../tools/i18n.mjs", import.meta.url)), "--check"], { encoding: "utf8" });
  expect(tool.status === 0, "tools/i18n.mjs --check: " + (tool.stdout + tool.stderr).split("\n").filter(l => /eksik|yer tutucu|eski|fazla/.test(l)).slice(0, 4).join(" | "));
  const codes = await p.eval("LANGS.map(l => l.code)");
  expect(codes.length === 25, "25 dil: " + codes.join(","));
  const problems = [];
  for (const code of codes) {
    await p.eval(`localStorage.setItem("bb_lang", JSON.stringify("${code}")), 1`);
    await p.reload();
    await p.eval(HELPERS);
    const r = await p.eval(`(() => {
      const wide = [], drawn = new Set(), proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
      proto.fillText = function (s, x, y, mw) {
        s = String(s); drawn.add(s);
        if (this.canvas === canvas && this.measureText(s).width > W - 6) wide.push(s.slice(0, 40) + " @" + this.font);
        return orig.call(this, s, x, y, mw);
      };
      try {
        draw();                                                       // menü
        __start(5); state.curseAt = Infinity; state.combo = 12; state.shield = 2; state.fireUntil = state.time + 5; state.laserUntil = state.time + 5;
        state.curses = { gorunmez: state.time + 5, ruzgar: state.time + 5 }; run.pacts = ["cam", "kan", "boss"];
        powerups.push(...Object.keys(POWERS).map((k, i) => ({ x: 20 + (i % 10) * 76, y: 300 + Math.floor(i / 10) * 30, w: 62, h: 18, vy: 0, type: k })));
        for (const k of Object.keys(COMBO_CALLS)) { callout(COMBO_CALLS[k]); draw(); }
        for (const id of Object.keys(CURSES)) { callout("⚠ " + CURSES[id].label, CURSE_COLOR); draw(); }
        for (const pc of PACT_POOL) { callout(pc.icon + " " + pc.name); draw(); }
        state.mode = "paused"; draw();
        state.mode = "levelclear"; draw();
        state.mode = "playing"; run.daily = false; run.practice = true; state.lbRank = 3; state.newRecord = true; gameOver(); draw();
        __start(12); pxWin(); state.mode = "levelclear"; draw();
        for (const panel of [settingsPanel, themePanel, versusPanel, careerPanel, codexPanel, challengePanel, campaignPanel, edPanel]) {
          const render = { [themePanel.id]: refreshThemeUI, [versusPanel.id]: refreshVersusUI, [careerPanel.id]: renderCareer, [codexPanel.id]: renderCodex, [challengePanel.id]: renderChallenge, [campaignPanel.id]: renderCampaignUI, [edPanel.id]: renderEditor }[panel.id];
          togglePanel(panel, render); closePanels();
        }
      } finally { proto.fillText = orig; }
      const domText = [...document.querySelectorAll("section.panel, #toolbar, #mediabar, #pactbar, #lastchance")].map(e => e.textContent).join(" ")
        + " " + [...document.querySelectorAll("[title],[placeholder],[aria-label]")].map(e => (e.title || "") + " " + (e.placeholder || "") + " " + (e.getAttribute("aria-label") || "")).join(" ");
      const canvasText = [...drawn].join(" ");
      const tr = /[ğşıİĞŞ]/;   // Türkçe'ye özgü harfler (Azerbaycancada da var; o dilde taranmaz)
      const leftDom = (domText.match(/[^\\s]*[ğşıİĞŞ][^\\s]*/g) || []).slice(0, 4);
      const leftCanvas = [...drawn].filter(s => tr.test(s)).slice(0, 4);
      return { lang: LANG, html: document.documentElement.lang, dir: document.documentElement.dir, sel: $("langsel").value,
               wide: wide.slice(0, 3), leftDom, leftCanvas, settingsHead: settingsPanel.querySelector(".panel-head strong").textContent };
    })()`);
    const rtl = code === "ar" || code === "fa";
    if (r.lang !== code || r.sel !== code) problems.push(code + ": dil yüklenmedi " + JSON.stringify([r.lang, r.sel]));
    if (r.dir !== (rtl ? "rtl" : "ltr") || !r.html.startsWith(code)) problems.push(code + ": html lang/dir " + r.html + "/" + r.dir);
    if (r.wide.length) problems.push(code + ": tuvale sığmayan yazı " + r.wide.join(" | "));
    if (code !== "tr" && code !== "az" && (r.leftDom.length || r.leftCanvas.length)) problems.push(code + ": çevrilmemiş Türkçe " + r.leftDom.concat(r.leftCanvas).join(" | "));
    if (code !== "tr" && code !== "az" && r.settingsHead === "⚙️ Ayarlar") problems.push(code + ": ayarlar başlığı Türkçe kaldı");
  }
  await p.eval(`localStorage.setItem("bb_lang", JSON.stringify("tr")), 1`);
  expect(problems.length === 0, problems.slice(0, 8).join("\n      "));
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
    __start(LEVELS.length + 5); const cycleHp = state.boss.hp;   // ikinci turdaki 5. bölüm
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

test("Lanetler: 22 lanetin her biri güvenle çalışır", async ({ p, expect }) => {
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
  expect(s.open && s.grid === 28 && s.sugg === 8, "stüdyo açılır: 28 tema + 8 öneri");
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
  expect(n === 35, "35 görünüm seçeneğinin hepsi çizilir: " + n);
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
    const lead = pickTarget("me", "lider"); battle.charge = 9; battleCharge(1); const attack = lead.debuffUntil > battle.clock && feedText(battle.feed[0]).startsWith("Albas ⚔");
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
  expect(r.panel.open && r.panel.stats === 21 && r.panel.ach === 32 && r.panel.achGot === r.panel.got && r.panel.rows === 5 && r.panel.head.includes(r.panel.got + "/32") && r.panel.card,
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
