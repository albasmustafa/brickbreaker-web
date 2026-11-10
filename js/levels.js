// ======================================================================
// 5. BÖLÜM HARİTALARI — her satır 10 sütun:
//    1/2/3 = dayanıklılık · X = kırılmaz · E = patlayan · Z = elektrik (vurulunca yakındakilere yıldırım)
//    $ = altın (2 vuruş, bol puan + kesin kapsül) · + = çoğaltan (kırılınca yeni top) · . = boş
//    H = yenilenen · A = kalkanlı · T = ikiz · I = buz · V = virüs · S = şifacı (bkz. flow.js BRICK_TYPES)
//    11. karakter '>' = o sıra sağa sola kayar. Boss bölümü: { boss, map } — ilk 5 sıra boss'a ayrılır.
//    Piksel bölümü: { pixel, map: [] } — tuğlalar yerine tunnel.js'in piksel duvarı kurulur.
// ======================================================================
const BOSS_ROOM = Array(5).fill("..........");
// Tohumdan simetrik duvar: günlük/haftalık koşularda bölüm haritası buradan gelir.
// Sol yarı tohumla üretilir, sağ yarı aynadır; ağır tuğlalar ve yeni türler bölümle artar.
function proceduralMap(seed, level) {
  const rand = seeded(seed * 31 + level * 997 + 5);
  const rows = 4 + Math.min(2, ((level - 1) / 4) | 0);
  const heavy = Math.min(3, 1 + (((level - 1) / 3) | 0));
  const out = [];
  for (let r = 0; r < rows; r++) {
    let left = "";
    for (let c = 0; c < 5; c++) {
      const v = rand();
      left += v < 0.60 ? String(1 + ((rand() * heavy) | 0))
             : v < 0.68 ? "E" : v < 0.74 ? "Z" : v < 0.79 ? "$" : v < 0.83 ? "+"
             : v < 0.86 ? "T" : v < 0.89 ? "H" : v < 0.915 ? "A" : v < 0.94 ? "I" : v < 0.96 ? "V" : ".";
    }
    out.push(left + [...left].reverse().join(""));
  }
  return out;
}
const LEVELS = [
  [ // 1: karşılama
    ".11111111.",
    "1111111111",
    "1111111111",
    "1111111111",
    ".11111111.",
  ],
  [ // 2: şeritler + ilk ikizler ve yenilenenler
    "2T222222T2",
    "1111111111",
    "22H2222H22",
    "1111111111",
    "2222222222",
  ],
  [ // 3: piramit, tepede patlayıcılar
    "....EE....",
    "...3223...",
    "..321123..",
    ".32111123.",
    "3211111123",
  ],
  [ // 4: kale — X duvarları kırılamaz, göbekte patlayıcılar
    "XX.3333.XX",
    "X22222222X",
    "X2.1EE1.2X",
    "X2.1111.2X",
    "X22222222X",
    "XX.3333.XX",
  ],
  { boss: { name: N_("TUĞLA KRAL"), hp: 40, speed: 110, shootEvery: 2.2 },            // 5: BOSS
    map: [...BOSS_ROOM, "2.+.22.+.2", "..X....X.."] },
  [ // 6: dama + kırılmaz bariyer; kalkanlılar ve göbekte şifacı
    "3.3.3.3.3.",
    ".2.2E2.2.2",
    "3.A.3.A.3.",
    "X.X.X.X.X.",
    "3.3.S.3.3.",
    ".2.2.2.2.2",
  ],
  [ // 7: elektrik ağı — Z'ye vur, zincir yıldırım her şeyi kavursun
    "1Z1111Z111",
    "2222$22222",
    "1111Z11111",
    "22+2222+22",
    "Z11111111Z",
  ],
  [ // 8: kayan şeritler
    "...3333...>",
    "2222222222",
    "..1E11E1..>",
    "1111111111",
    "...+$$+...>",
  ],
  [ // 9: altın kasa — X kalenin içinde hazine; buz ve virüs kasada bekler
    "XXXXXXXXXX",
    "X22222222X",
    "X2$$$$$$2X",
    "X2ZI.VIZ2X",
    "X22.EE.22X",
    "XXX....XXX",
  ],
  { boss: { name: N_("DEMİR İMPARATOR"), hp: 70, speed: 150, shootEvery: 1.7 },       // 10: BOSS — Kral'ın öfkeli abisi
    map: [...BOSS_ROOM, "X.Z2EE2Z.X", "...+..+...>"] },
  [ // 11: siber labirent — yıldırım, altın ve patlayıcılar kırılmaz duvarların arasında; kalkan, ikiz, buz, yenilenen karışımı
    "Z2A2XX2A2Z",
    "2+TAEEAT+2",
    "2.X3HH3X.2",
    "1111$$1111",
    ".EI1ZZ1IE.",
  ],
  { pixel: "core", map: [] },    // 12: CORE/BREAK — koyu boşlukta 3379 turuncu pikselden dairesel çekirdek; x3 ve ↔ küpleri
  { pixel: "tunnel", map: [] },   // 13: TÜNEL FIRTINASI — binlerce piksel tuğla, çelik L ve sarmal tüneller (js/tunnel.js)
  { pixel: "koridor", map: [] },  // 14: CR7 KORİDORU — tamı tamına mavi duvar, ortada dar dikey koridor; +3/ok/ateş küpleri
  { pixel: "mikro", map: [] },    // 15: MİKRO DUVAR — minik (4 px) tuğlalar ve boşluklu çelik kaburgalar; top zor girer
  { pixel: "mozaik", map: [] },   // 16: MOZAİK DUVAR — 28 px fayanslar mavi/çelik/boşluk salınımıyla; küçük parçalar her yanda
  { pixel: "adalar", map: [] },   // 17: ADALAR DUVARI — serpilmiş elmas tuğla takımları, kimi çelik çekirdekli
];
