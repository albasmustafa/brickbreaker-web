# Meydan Okuma, Koşu Özeti ve Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Koşu özeti, bölüm seçimi, günlük meydan okuma ve CI/release otomasyonunu eklemek.

**Architecture:** Koşu sayaçları `run` nesnesine eklenir; oyun sonu `render.js` bunları çizer. Bölüm seçimi ve günlük kural ayrı bir `js/challenge.js` dosyasında toplanır; tek panel ve tek araç çubuğu düğmesi kullanır. Günlük lanet seviyesi `run.daily` üzerinden okunur. CI ve release, Node/Chrome tabanlı mevcut test hattını kullanır.

**Tech Stack:** Vanilla JS (klasik script), canvas, localStorage, Node 22, başsız Chromium (CDP), GitHub Actions, esbuild (yalnızca minify).

**Spec:** `docs/superpowers/specs/2026-10-19-meydan-okuma-design.md`

## Global Constraints

- Yeni script hem `index.html` hem `sw.js` içinde listelenmeli.
- `file://` ile açılma korunmalı; ES modülü kullanılmamalı.
- Yeni çalışma zamanı bağımlılığı eklenmemeli (esbuild zaten devDependency).
- Tüm kullanıcı metinleri Türkçe ve mevcut üsluba uygun olmalı.
- Her görev sonunda `node tests/run.mjs --only "<test adı>"` ve en sonda `npm test` çalıştırılmalı.

## Review Focus

- Günlük deneme başladıktan sonra sayfa yenilenirse ikinci deneme açılmamalı.
- Tarih dönüşünde seri sıfırlanmalı; dün oynandıysa artmalı.
- Pratik koşu rekoru, liderlik tablosunu, kariyeri veya başarımı değiştirmemeli.
- Kilitli bölüm UI'dan ve doğrudan çağrıdan açılmamalı.
- Bozuk `bb_daily` kaydı oyunu kilitlememeli.

---

### Task 1: Koşu sayaçları ve oyun sonu özeti

**Files:**
- Modify: `js/career.js` (`run` nesnesi, `track`, `trackBest`, `checkAchievements`, `endRun`, `careerGameEnd`)
- Modify: `js/flow.js` (`startGame`, `addScore`, `gameOver`, `toMenu`)
- Modify: `js/physics.js` (tuğla, kapsül, boss sayaçları)
- Modify: `js/render.js` (oyun sonu kartı)
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `run = { lifeLost, ended, practice, daily, bricks, powers, bosses, bestCombo }`
- Produces: `startGame()` pratik/günlük bayraklarını sıfırlar; `addScore(n)` pratikte rekoru güncellemez.
- Produces: `finishDaily()` çağrısı `gameOver()` ve `toMenu()` içinden yapılır (Task 3'te tanımlanır; çağrı koşullu).

- [ ] **Step 1: Write the failing test**

`tests/suite.mjs` içine, oyun akışı testinden sonra:

```js
test("Koşu özeti: sayaçlar ve pratikte kayıt dışı", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    __start(1); __sim(600, true);
    const stats = { bricks: run.bricks, combo: run.bestCombo };
    __start(1); run.practice = true; state.score = 9999; state.lives = 1; loseLife();
    return { stats, mode: state.mode, rank: state.lbRank, high: state.high, games: career.stats.games, practice: run.practice };
  })()`);
  expect(r.stats.bricks > 0 && r.stats.combo > 0, "koşu sayaçları: " + JSON.stringify(r.stats));
  expect(r.mode === "gameover" && r.rank === 0 && r.high === 0 && r.games === 0, "pratik kayıt dışı: " + JSON.stringify(r));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/run.mjs --only "Koşu özeti"`
Expected: FAIL — `run.bricks` undefined / `run.practice` etkisiz.

- [ ] **Step 3: Implement run counters and guards**

`js/career.js`: `run` başlangıcına `practice: false, daily: false, bricks: 0, powers: 0, bosses: 0, bestCombo: 0` ekle; `resetRun` bunları sıfırla. `track`, `trackBest`, `checkAchievements`, `endRun`, `careerGameEnd` başında `if (run.practice) return;` kullan.

`js/physics.js`: `track("bricks")` yanında `run.bricks++`; combo güncellemesinde `run.bestCombo = Math.max(run.bestCombo, state.combo)`; `track("powers")` yanında `run.powers++`; `track("bosses")` yanında `run.bosses++`.

`js/flow.js`: `addScore` içinde rekor güncellemesini `if (!run.practice && ...)` yap; `gameOver` içinde pratikte `recordScore`/`careerGameEnd` çağırma, `state.lbRank = 0` bırak; `run.daily` ise `finishDaily()` çağır; `toMenu` içinde `if (run.daily) finishDaily()`.

`js/render.js`: oyun sonu kartını 520×400 yap; skor/rekor altına şu satırları ekle:

```js
text("Bölüm " + state.level + " · Süre " + fmtTime(Math.round(state.time)), ...);
text("Tuğla " + run.bricks + " · Combo ×" + run.bestCombo, ...);
text("Kapsül " + run.powers + " · Lanet " + state.cursesSurvived + " · Boss " + run.bosses, ...);
if (run.practice) text("PRATİK — rekor ve kariyer sayılmadı", ...);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/run.mjs --only "Koşu özeti"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/career.js js/flow.js js/physics.js js/render.js tests/suite.mjs
git commit -m "feat: koşu sayaçları ve oyun sonu özeti"
```

---

### Task 2: Bölüm seçimi ve pratik başlatma

**Files:**
- Create: `js/challenge.js`
- Modify: `index.html` (panel + script sırası)
- Modify: `sw.js` (önbellek listesi)
- Modify: `js/flow.js` (`startGame` pratik bayrağı)
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `startPractice(level: number) -> void`; kilitliyse hiçbir şey yapmaz.
- Produces: `renderChallenge() -> void`; `dailyUsed() -> boolean` (Task 3).
- Produces: global `challengePanel`, `levelGrid`.

- [ ] **Step 1: Write the failing test**

```js
test("Bölüm seçimi: kilit ve pratik", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const before = [...levelGrid.querySelectorAll("button")].filter(b => !b.disabled).length;
    career.stats.bestLevel = 5; renderChallenge();
    const unlocked = [...levelGrid.querySelectorAll("button")].filter(b => !b.disabled).length;
    startPractice(3);
    const started = { level: state.level, practice: run.practice, mode: state.mode };
    state.score = 5000; state.lives = 1; loseLife();
    return { before, unlocked, started, high: state.high, rank: state.lbRank };
  })()`);
  expect(r.before === 1 && r.unlocked === 5, "kilit: " + JSON.stringify([r.before, r.unlocked]));
  expect(r.started.level === 3 && r.started.practice && r.started.mode === "serve", "pratik başladı: " + JSON.stringify(r.started));
  expect(r.high === 0 && r.rank === 0, "pratik rekor yazmadı: " + JSON.stringify(r));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/run.mjs --only "Bölüm seçimi"`
Expected: FAIL — `levelGrid is not defined`.

- [ ] **Step 3: Implement `js/challenge.js` and wire it**

`index.html`: araç çubuğuna düğme eklenmez; `js/challenge.js` düğmeyi `toolbar.insertBefore(challengeBtn, careerBtn)` ile ekler. Panel:

```html
<section id="challengepanel" class="panel" role="dialog" aria-label="Meydan okuma" hidden>
  <div class="sethead">Günlük meydan okuma</div>
  <div id="daily-card"></div>
  <div class="setrow"><button id="daily-start">☀️ Bugünün koşusunu başlat</button></div>
  <div class="setnote">Günde tek deneme · 1 can · Kabus lanetleri · +%15 hız. Deneme başladığı an kullanılmış sayılır.</div>
  <div class="sethead">Bölüm seçimi (pratik)</div>
  <div id="level-grid"></div>
  <div class="setnote">Pratik koşularda rekor, liderlik tablosu, kariyer ve başarımlar sayılmaz.</div>
</section>
```

`js/challenge.js` içinde `setupPanel(challengePanel, "🎯 Meydan Okuma")`, `renderChallenge`, `startPractice`. Script etiketi `career.js`'den sonra, `versus.js`'den önce. `sw.js` listesine `"challenge"` ekle.

- [ ] **Step 4: Run tests**

Run: `node tests/run.mjs --only "Bölüm seçimi"` → PASS.
Run: `node tests/run.mjs --only "Yükleme"` → PASS (araç çubuğu 8→9 güncellemesi dahil).

- [ ] **Step 5: Commit**

```bash
git add index.html js/challenge.js js/flow.js sw.js tests/suite.mjs
git commit -m "feat: bölüm seçimi ve pratik modu"
```

---

### Task 3: Günlük meydan okuma

**Files:**
- Modify: `js/challenge.js`
- Modify: `js/curses.js` (`hazardLevel()` kullanımı)
- Modify: `js/physics.js` (`powerAllowed` lanet seviyesi)
- Modify: `js/render.js` (günlük satırı)
- Modify: `js/flow.js` (`finishDaily` çağrıları)
- Test: `tests/suite.mjs`

**Interfaces:**
- Produces: `daily = { date, used, score, best, streak, last }`, `bb_daily`.
- Produces: `localDate() -> "YYYY-MM-DD"`, `dailyUsed() -> boolean`, `startDaily() -> boolean`,
  `finishDaily() -> void`, `hazardLevel() -> "kapali"|"az"|"normal"|"kabus"`.

- [ ] **Step 1: Write the failing test**

```js
test("Günlük meydan okuma: tek deneme, kurallar, kayıt", async ({ p, expect }) => {
  const r = await p.eval(`(() => {
    const used0 = dailyUsed();
    const first = startDaily();
    const rules = { lives: state.lives, daily: run.daily, hazards: hazardLevel(), speed: state.speed };
    const used1 = dailyUsed();
    const second = startDaily();
    state.score = 1234; state.lives = 1; loseLife();
    const after = { score: daily.score, best: daily.best, streak: daily.streak, used: dailyUsed(), mode: state.mode };
    const third = startDaily();
    return { used0, first, second, third, rules, used1, after, modeAfter: state.mode };
  })()`);
  expect(r.used0 === false && r.first === true && r.second === false, "tek deneme: " + JSON.stringify(r));
  expect(r.rules.lives === 1 && r.rules.daily && r.rules.hazards === "kabus" && r.rules.speed > 340, "günlük kuralları: " + JSON.stringify(r.rules));
  expect(r.used1 && r.after.score === 1234 && r.after.best === 1234 && r.after.streak === 1 && r.after.used, "günlük kayıt: " + JSON.stringify(r.after));
  expect(r.third === false && r.modeAfter === "gameover", "ikinci deneme yok: " + JSON.stringify(r));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/run.mjs --only "Günlük"`
Expected: FAIL — `dailyUsed is not defined`.

- [ ] **Step 3: Implement daily state and rules**

`js/challenge.js`:

```js
const daily = { date: "", used: false, score: 0, best: 0, streak: 0, last: "" };
```

`localDate()` yerel `YYYY-MM-DD` üretir. `bb_daily` okunurken yalnızca sonlu sayılar ve geçerli tarih kabul edilir. `startDaily()`: `dailyUsed()` ise `false`; tarih dünse `streak++`, değilse `1`; `daily.date = today; daily.used = true; daily.score = 0`; `startGame(); run.daily = true; state.lives = 1; state.diffSpeed = 1.15; state.speed = levelSpeed(1);` ve `true` döner. `finishDaily()`: `run.daily` değilse ya da zaten bitmişse dön; `daily.score = state.score; daily.best = Math.max(...)`; kaydet; `run.dailyFinished = true` (özet ekranı için `run.daily` açık kalır; `toMenu()` temizler).

`js/flow.js`: `gameOver()` içinde `if (run.daily) finishDaily();`; `toMenu()` içinde aynı çağrı (idempotent). `startGame()` başında `if (run.daily) finishDaily();`.

`js/curses.js`: `hazardLevel()` yardımcısını kullan; `powerAllowed` de aynı yardımcıyı kullansın. `hazardLevel()` `run.daily ? "kabus" : settings.hazards` döner.

`js/render.js`: oyun sonu kartında `run.daily` ise `"GÜNLÜK · en iyi " + daily.best + " · seri " + daily.streak` satırı.

- [ ] **Step 4: Run tests**

Run: `node tests/run.mjs --only "Günlük"` → PASS.
Run: `npm test` → tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add js/challenge.js js/curses.js js/physics.js js/render.js js/flow.js tests/suite.mjs
git commit -m "feat: günlük meydan okuma"
```

---

### Task 4: CI ve release otomasyonu

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `tools/release.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces: `npm run release` → test + build + sibling `brickbreakerai/index.html` kopyası.
- Produces: `node tools/release.mjs --no-ai`, `--ai-out <path>`.

- [ ] **Step 1: Add release script**

`tools/release.mjs`, `tools/build.mjs`'i `spawnSync` ile çalıştırır; `dist/index.html` yoksa hata verir. Hedef varsayılan `../brickbreakerai/index.html`; `--no-ai` atlar; `--ai-out` değiştirir. Kopyalama sonrası hedefin boyutunu yazar.

`package.json`:

```json
"release": "npm test && node tools/release.mjs"
```

- [ ] **Step 2: Add GitHub Actions**

`.github/workflows/ci.yml`: `push`/`pull_request`; Node 22; `npm ci`; `browser-actions/setup-chrome@v2`; `BB_CHROME` ile `npm test`; `npm run build`; `node tests/run.mjs dist/index.html`.

- [ ] **Step 3: Verify release locally**

Run: `node tools/release.mjs --ai-out /tmp/opencode/bb-ai/index.html`
Expected: build çıktısı + kopya boyutu. `test -s /tmp/opencode/bb-ai/index.html`.

Run: `node tools/release.mjs --no-ai`
Expected: build başarılı, kopyalama atlandı.

- [ ] **Step 4: README**

`README.md` içine "Geliştirme" bölümü: `npm test`, `npm run build`, `npm run release`, CI'ın ne yaptığı.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml tools/release.mjs package.json README.md
git commit -m "chore: CI ve release otomasyonu"
```

---

### Task 5: Son doğrulama

- [ ] `npm test` → 20 test, 0 hata.
- [ ] `npm run build` → iki dist dosyası.
- [ ] `node tests/run.mjs dist/index.html` → tüm testler.
- [ ] `node tests/run.mjs dist/brickbreaker.min.html` → tüm testler.
- [ ] `git status` temiz; `git log --oneline -5` gözden geçir.
