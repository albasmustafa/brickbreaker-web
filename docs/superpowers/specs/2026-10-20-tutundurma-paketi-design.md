# Tutundurma Paketi — Tasarım

## Amaç

Oyuncuyu ilk koşudan sonra da tutmak: her koşuyu farklı bir "build"e, her bölümü küçük bir hedefe,
her skoru paylaşılabilir bir hikâyeye çevirmek. Mevcut kaos, lanet, boss, kariyer ve müzik
sistemlerinin üzerine kurulur; sunucu, hesap veya bulut kayıt eklenmez.

## Kapsam (7 özellik)

1. **Lanet Paktı** (`js/pacts.js`): 1. ve her 5. bölüm başında 3 risk/ödül paktı. Paktlar koşu
   boyunca sürer. Skor, hız, boss canı, lanet süresi/bonusu, altın, kalkan ve can üzerinde etkilidir.
2. **Son Top Bahsi** (`js/lastchance.js`): Son can gidince tek seferlik "1 canla devam + hemen bir
   lanet" teklifi. Günlük, pratik, haftalık ve kapışmada kapalıdır.
3. **Dramaturg** (`js/director.js`): Her bölüme isteğe bağlı görev (tuğla, combo, can kaybetmeden
   bitirme, boss süresi, altın, lanet). Zor anda iyi kapsül/kalkan, uzun sessizlikte gösteri.
4. **Koleksiyon** (`js/codex.js`): 20 lanet + 8 tuğla + 2 boss kartı. 1/5/15 eşiklerinde seviye;
   lanet kartı seviyesi o lanetin süresini %10 kısaltır. Kariyer panelinden açılır.
5. **Hayalet Koşu** (`js/ghost.js`): En iyi klasik koşunun raket/top hareketi 5 Hz kaydedilir,
   yeni koşuda yarı saydam oynatılır. `BBG1:` kodu ile dışa/içe aktarılır.
6. **Haftalık Kaos Tohumu** (`js/weekly.js`): Pazartesi başlayan hafta anahtarından tohum üretilir;
   oyun içi rastgelelik `gameRandom` üzerinden tohumlanır. Pakt, dramaturg, hayalet ve son top
   bahsi kapalıdır. `BBW1:` sonuç kodu.
7. **Şarkıdan Bölüm** (`js/songlevel.js`): Ses dosyası çözülür; 0.25 sn pencerelerde RMS, bas ve tiz
   enerjisi, vuruş aralıkları ve BPM çıkarılır. 3 bölüm (+ güçlü finalde boss) üretilir. Aynı
   şarkı aynı bölümü verir. `BBS1:` kodu.

## Kararlar

- **Tek kaynak:** `brickbreaker-web` kaynaktır; `brickbreakerai/index.html` `npm run release` ile
  üretilen tek dosyalık kopyadır. İki ayrı kod tabanı yoktur.
- **Klasik script düzeni korunur:** yeni dosyalar `index.html` sırasına ve `sw.js` önbelleğine
  eklenir; `tools/build.mjs` tek dosyada birleştirir. Sıra, yükleme anında çağrılan
  `renderChallenge()`'ın sonraki modüllere erken dokunmaması için önemlidir.
- **Deterministik haftalık:** Oyun içi rastgelelik `grnd`/`gpick`/`gameRandom` üzerinden geçer;
  görsel parçacık rastgeleliği `Math.random`'da kalır. Böylece aynı girdi + aynı tohum aynı koşuyu
  verir; görsel kare hızı sonucu değiştirmez.
- **Kalıcılık:** `bb_codex`, `bb_ghost`, `bb_weekly`. Bozuk/eski kayıtlar sessizce yok sayılır.
- **Paylaşım kodları:** Tema koduna benzer `BBG1:`, `BBW1:`, `BBS1:` önekleri; base64 + JSON.
  Sunucu yok.
- **Ayarlar:** Lanet Paktı, Dramaturg ve Hayalet koşu açık/kapalı. Varsayılan açık.

## Hedef Olmayanlar

- Sunucu, hesap, bulut kayıt, global liderlik tablosu.
- Ses dosyasının kendisini paylaşma (telif); yalnızca üretilen bölüm kodu paylaşılır.
- Haftalık koşuda pakt/dramaturg gibi kişisel yardımcılar (adil karşılaştırma için kapalı).

## Kısıtlar

- Vanilla JS, derleme adımı yok, `file://` ile çalışır.
- Yeni modül hem `index.html` hem `sw.js` listesine girer.
- Her özellik en az bir başsız Chromium testiyle doğrulanır; toplam 27 test.
- Mevcut kontratlar korunur: 9 araç çubuğu düğmesi, 25 başarım, 19 kariyer sayacı.

## İnceleme Odağı

- Aynı tohumun iki koşuda birebir aynı skor/tuğla/can üretmesi.
- Haftalık koşuda pakt/dramaturg/hayalet/son top bahsinin gerçekten kapalı kalması.
- Hayalet kodunun bozuk/çok büyük veriyle çökmemesi.
- Şarkı kodunun geçersiz harita karakterlerini temizlemesi.
- Koleksiyon kartı seviyesinin lanet süresine etkisinin taze kayıtta nötr olması.
