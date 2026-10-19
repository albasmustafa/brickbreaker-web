# Meydan Okuma, Koşu Özeti ve Release — Tasarım

## Amaç

Oyuncunun her koşuda ne yaptığını görmesini sağlamak, ulaştığı bölümleri tekrar oynayabilmesini
kolaylaştırmak, günde tek denemelik bir meydan okuma eklemek ve iki proje kopyasının test/build
sürecini otomatikleştirmek.

## Kapsam

1. **Koşu özeti:** Oyun sonu ekranında skorun yanında bölüm, süre, kırılan tuğla, en iyi combo,
   toplanan kapsül, atlatılan lanet ve yenilen boss sayıları gösterilir.
2. **Bölüm seçimi:** Klasik oyunda ulaşılan en ileri bölüme kadar bölümler açılır. Seçilen bölüm
   **pratik koşu** olarak başlar; rekor, liderlik tablosu, kariyer sayaçları ve başarımlar sayılmaz.
3. **Günlük meydan okuma:** Yerel tarihe göre günde tek deneme. 1 can, Kabus lanetleri ve %15 hız.
   Deneme başladığı anda kullanılmış sayılır. Günlük en iyi skor ve üst üste oynanan gün serisi
   cihazda saklanır.
4. **CI + release:** GitHub Actions'ta test ve derleme; `npm run release` ile test + build + ana oyun
   dosyasına (`../brickbreakerai/index.html`) kopyalama.

## Kararlar

- Yeni özellikler mevcut mimariye uyar: klasik script'ler, sıfır bağımlılık, `file://` desteği,
  tek dosya derleme ve başsız Chromium testleri.
- Bölüm seçimi ve günlük meydan okuma tek bir **🎯 Meydan Okuma** panelinde toplanır; araç
  çubuğuna tek düğme eklenir.
- Pratik koşuda `addScore` skoru artırır ama rekoru güncellemez; `track`, `trackBest`, `endRun`,
  `careerGameEnd` ve başarım kontrolü erken döner.
- Günlük koşu normal kariyer sayaçlarına ve liderlik tablosuna sayılır; ayrıca `bb_daily`
  kaydında bugünkü skor, en iyi skor ve seri tutulur.
- Günlük kuralları global ayarları kalıcı olarak değiştirmez. Lanet yoğunluğu `run.daily`
  üzerinden okunur; can ve hız `startDaily()` içinde ayarlanır.
- Günlük koşu bitince `run.daily` özet ekranı için açık kalır; kayıt bir kez yazılsın diye
  `run.dailyFinished` kullanılır. Menüye dönüşte ikisi de temizlenir.
- Release komutu ana oyun kopyasını yalnızca hedef klasör varsa yazar; yoksa uyarı verip atlar.
  `--ai-out <yol>` ile hedef değiştirilebilir, `--no-ai` ile kopyalama kapatılabilir.

## Hedef Olmayanlar

- Sunucu, hesaplar, bulut kayıt veya global liderlik tablosu.
- Günlük koşunun tamamen deterministik (aynı düşman/kapsül sırası) olması; günün kuralları sabit,
  oyun içi rastgelelik normal kalır.
- Bölüm editörü, yeni bölüm/boss içeriği, i18n.

## Kısıtlar

- Node 22+, Chromium/Chrome.
- Yeni script hem `index.html` hem `sw.js` listesine eklenmeli; `tools/build.mjs` eksikse uyarır.
- Testler her yeni davranışı en az bir kez doğrulamalı; mevcut 17 test korunmalı.

## İnceleme Odağı

- Aynı gün ikinci kez günlük başlatma ve sayfa yenileme sonrası kullanım durumu.
- Gece yarısı tarih dönüşü ve yerel saat dilimi.
- Bozuk/eski `bb_daily` kaydı.
- Pratik koşuda rekor/kariyer/başarım sızıntısı.
- Kilitli bölümün doğrudan fonksiyon çağrısıyla açılması.
