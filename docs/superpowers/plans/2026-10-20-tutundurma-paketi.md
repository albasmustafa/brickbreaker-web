# Tutundurma Paketi — Uygulama Planı (tamamlandı)

> **Durum:** 2026-10-20 itibarıyla tamamlandı. Her görev test + commit ile kapandı.

**Hedef:** Yedi tutundurma özelliğini tek kaynakta, testli ve tek dosya derlemesiyle uyumlu biçimde
yayına almak.

**Mimari:** Klasik script'ler, tek `state`/`run`, `localStorage`; yeni özellikler ayrı dosyalarda,
`index.html` sırası ve `sw.js` önbelleğiyle. Haftalık koşu için oyun içi RNG (`gameRandom`) tohumlanır.

**Tech Stack:** Vanilla JS, Canvas 2D, Web Audio, Node 22 + başsız Chromium test sürücüsü.

**Spec:** `docs/superpowers/specs/2026-10-20-tutundurma-paketi-design.md`

## Görevler

- [x] **1. Lanet Paktı** — `js/pacts.js`, `js/career.js` (`run.pacts`), `js/flow.js`, `js/state.js`,
  `js/curses.js`, `js/physics.js`, `js/render.js`, `index.html`, `css/style.css`, `sw.js`,
  `tests/suite.mjs`. Test: 3 seçenek, skor/hız/kalkan çarpanı, yeni koşuda sıfırlama, seçmeden devam.
- [x] **2. Son Top Bahsi** — `js/lastchance.js`, `js/flow.js`, `js/career.js`, `index.html`,
  `css/style.css`, `sw.js`, `tests/suite.mjs`. Test: teklif, 1 can + lanet, ikinci şans yok,
  pratikte kapalı.
- [x] **3. Dramaturg** — `js/director.js`, `js/career.js`, `js/flow.js`, `js/update.js`,
  `js/render.js`, `js/settings.js`, `index.html`, `sw.js`, `tests/suite.mjs`. Test: görev ilerlemesi,
  ödül, can kaybetmeden bitirme, boss görevi, kapatma.
- [x] **4. Koleksiyon** — `js/codex.js`, `js/curses.js`, `js/physics.js`, `js/flow.js`,
  `index.html`, `css/style.css`, `sw.js`, `tests/suite.mjs`. Test: 30 kart, seviye eşiği,
  lanet süresi direnci, kalıcılık, sıfırlama.
- [x] **5. Hayalet Koşu** — `js/ghost.js`, `js/flow.js`, `js/update.js`, `js/render.js`,
  `js/challenge.js`, `js/settings.js`, `index.html`, `css/style.css`, `sw.js`, `tests/suite.mjs`.
  Test: kayıt, oynatma, `BBG1:` turu, kapatma.
- [x] **6. Haftalık Kaos Tohumu** — `js/weekly.js`, `js/core.js` (`gameRandom`), `js/flow.js`,
  `js/physics.js`, `js/curses.js`, `js/director.js`, `js/pacts.js`, `js/ghost.js`,
  `js/lastchance.js`, `js/challenge.js`, `index.html`, `css/style.css`, `sw.js`, `tests/suite.mjs`.
  Test: aynı tohum = aynı koşu, yardımcılar kapalı, sonuç kodu, normal RNG'ye dönüş.
- [x] **7. Şarkıdan Bölüm** — `js/songlevel.js`, `js/career.js`, `js/flow.js`, `js/render.js`,
  `js/ghost.js`, `js/challenge.js`, `index.html`, `css/style.css`, `sw.js`, `tests/suite.mjs`.
  Test: 3 bölüm + boss, deterministik üretim, `BBS1:` turu, başlatma, bitiş.
- [x] **8. Dokümantasyon ve release** — README, tasarım/plan, `npm run build`, `npm run test:dist`,
  `npm run release` ile `brickbreakerai/index.html` kopyası.

## Doğrulama

```bash
cd /run/media/albas/albas/brickbreaker-web
npm test                 # 27 geçti
npm run build            # dist/index.html + dist/brickbreaker.min.html
npm run test:dist        # 27 + 27 geçti
npm run release          # test + build + ../brickbreakerai/index.html
```

## İnceleme Notları

- `renderChallenge()` yükleme anında çağrıldığı için `ghost.js`, `weekly.js`, `songlevel.js`
  `challenge.js`'ten **önce** yüklenir; tek dosya derlemesinde TDZ hatası çıkmasın.
- Haftalık RNG yalnız oyun mantığında kullanılır; parçacık/glint gibi görsel rastgelelik
  `Math.random`'da kalır.
- Şarkı/ hayalet kodları kullanıcı girdisidir: boyut, tip ve karakter doğrulaması yapılır.
