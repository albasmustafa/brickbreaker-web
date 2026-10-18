// ======================================================================
// 5. BÖLÜM HARİTALARI — her satır 10 sütun:
//    1/2/3 = dayanıklılık · X = kırılmaz · E = patlayan · Z = elektrik (vurulunca yakındakilere yıldırım)
//    $ = altın (2 vuruş, bol puan + kesin kapsül) · + = çoğaltan (kırılınca yeni top) · . = boş
//    11. karakter '>' = o sıra sağa sola kayar. Boss bölümü: { boss, map } — ilk 5 sıra boss'a ayrılır.
// ======================================================================
const BOSS_ROOM = Array(5).fill("..........");
const LEVELS = [
  [ // 1: karşılama
    ".11111111.",
    "1111111111",
    "1111111111",
    "1111111111",
    ".11111111.",
  ],
  [ // 2: şeritler
    "2222222222",
    "1111111111",
    "2222222222",
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
  { boss: { name: "TUĞLA KRAL", hp: 40, speed: 110, shootEvery: 2.2 },            // 5: BOSS
    map: [...BOSS_ROOM, "2.+.22.+.2", "..X....X.."] },
  [ // 6: dama + kırılmaz bariyer
    "3.3.3.3.3.",
    ".2.2E2.2.2",
    "3.3.3.3.3.",
    "X.X.X.X.X.",
    "3.3.3.3.3.",
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
  [ // 9: altın kasa — X kalenin içinde hazine
    "XXXXXXXXXX",
    "X22222222X",
    "X2$$$$$$2X",
    "X2Z....Z2X",
    "X22.EE.22X",
    "XXX....XXX",
  ],
  { boss: { name: "DEMİR İMPARATOR", hp: 70, speed: 150, shootEvery: 1.7 },       // 10: BOSS — Kral'ın öfkeli abisi
    map: [...BOSS_ROOM, "X.Z2EE2Z.X", "...+..+...>"] },
  [ // 11: siber labirent — yıldırım, altın ve patlayıcılar kırılmaz duvarların arasında
    "Z222XX222Z",
    "2+..EE..+2",
    "2.X3333X.2",
    "1111$$1111",
    ".E.1ZZ1.E.",
  ],
];
