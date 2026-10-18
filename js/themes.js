// ======================================================================
// 2. TEMALAR: 25 hazır tema, kayıtlı temalar ve sonsuz rastgele tema üreteci
//    Her tema 13 renkten oluşur; tahtadan arayüze her şey bunlardan türer.
// ======================================================================
const THEME_KEYS = ["bg", "board", "b1", "b2", "b3", "un", "ex", "pad", "ball", "text", "dim", "accent", "star"];
const THEME_LABELS = {
  bg: "Sayfa", board: "Tahta", b1: "Tuğla 1", b2: "Tuğla 2", b3: "Tuğla 3", un: "Kırılmaz", ex: "Patlayan",
  pad: "Raket", ball: "Top", text: "Yazı", dim: "Soluk yazı", accent: "Vurgu", star: "Arka plan efekti",
};
// Sıra THEME_KEYS ile aynı: ad | sayfa tahta tuğla1 tuğla2 tuğla3 kırılmaz patlayan raket top yazı soluk vurgu yıldız
const THEMES = `
Gece|1a1a2e 16213e 4cc9f0 f9c74f e94560 5a6b87 ff9f43 e0e0e0 ffffff e0e0e0 8892b0 4cc9f0 33507a
Gün Batımı|2b1b33 402038 ffd166 ff8fa3 ef476f 8d6a9f f3722c ffe8d6 ffffff ffe8d6 c9a0b8 ff8fa3 5b3a5e
Orman|12291b 15301f 90be6d 43aa8b f9c74f 5f7a61 ff6b35 e9f5db ffffff e9f5db a3b899 90be6d 2c4a38
Neon|0a0a14 101024 00f5d4 fee440 f15bb5 3a3a5e ff6d00 f8f9fa ffffff d8d8ff 6c6c9e f15bb5 26264a
Gameboy|0f380f 1b3a1b 9bbc0f 8bac0f 306230 234f23 c4d34c 9bbc0f d9e26b 9bbc0f 4a6b2a 8bac0f 1b3a1b
Buz|0d1b2a 1b263b caf0f8 90e0ef 00b4d8 577590 f8961e e0fbfc ffffff e0fbfc 8ea9c1 90e0ef 274c77
Şeker|2e2141 3e2750 bdb2ff ffd6a5 ffadad 8e7dbe ff5d8f ffffff fff0f5 ffefef b8a3d9 ff5d8f 4a3565
Klasik|000000 101010 cccccc 999999 666666 444444 ff2222 dddddd ffffff ffffff 888888 ff4444 1f1f1f
Lav|1a0500 2b0a03 ffba08 f48c06 d00000 6b3a2e ff5400 ffe8d6 fff3b0 ffe8d6 c28f7a f48c06 4a1a0e
Okyanus|001219 002233 94d2bd 48cae4 ee9b00 3d5a6c ca6702 e9f5f9 ffffff e0fbfc 7fa7b5 48cae4 0b3c5d
Synthwave|1a0933 241147 2de2e6 f706cf fd1d53 4f3b78 f9c80e ffffff ffffff f6e6ff a58bd1 f706cf 3d2470
Matrix|000000 001a00 00ff41 00c832 008f11 1f3d1f b6ff00 00ff41 ccffcc 00ff41 2e8b3a 00ff41 003b00
Sakura|2d1b24 3b2230 ffc8dd ffafcc ff70a6 7d5a6b ff9770 fff0f6 ffffff ffe5ec c9a1b3 ff70a6 5a3646
Çöl|2b1d0e 3d2a14 f2cc8f e07a5f e63946 6f5a42 ff7b00 fdf0d5 fffaf0 fdf0d5 b89f80 f2cc8f 57402a
Uzay|03001c 0b0a2b b6eada 5b8fb9 c77dff 301e67 ff6d00 e0e0ff ffffff e0e0ff 7a7aa8 b6eada 2a2a5e
Kahve|1c120c 2a1b12 e6ccb2 ddb892 b08968 5c4434 ff8c42 ede0d4 fffaf3 ede0d4 a68a72 ddb892 3e2a1e
Altın|0f0f0f 1a1a1a ffe066 fab005 e67700 4a4a4a ff3d00 fff3bf ffffff fff3bf a39e7a fab005 2e2a1a
Lavanta|1e1433 2a1d47 e0c3fc b388eb 8093f1 574b7a ff8fab f3e8ff ffffff f3e8ff a99bc9 b388eb 3f2f66
Vampir|120005 1f000a ff8fa3 ff4d6d e01e37 4a1f2a ffb703 ffe5ec ffffff ffe5ec a86b7a ff4d6d 3a0a16
Kağıt|e9e4d8 f7f3e9 457b9d e76f51 9b2226 a8a29e f4a261 2b2d42 2b2d42 2b2d42 6c6f7f e76f51 d8d2c2
Pastel|dfe7fd f0f4ff 6c8cff ff8fab 7b2cbf b5b9c9 ff9f1c 3a3a5e 3a3a5e 2b2d42 6b7089 6c8cff cfd8f5
Amber|0c0800 140d00 ffb000 ff8c00 cc5500 3d2b00 ffd000 ffb000 ffd27a ffb000 8a6100 ffb000 2b1d00
Sonbahar|1f130a 2b1a0d f4a259 bc4b51 8cb369 5b4636 f4e285 fbe9d0 ffffff fbe9d0 b39a80 f4a259 45301d
Aurora|021526 03203a 6ef3d6 b388ff 00e5ff 2c4a63 ff8a65 e0f7fa ffffff e0f7fa 7fa3b8 6ef3d6 0d3456
Siberpunk|0d0221 1a0b3b 00f0ff ff2a6d fdf500 3d2c5e ff8800 f5f5f5 ffffff e0f7ff 8a7fb5 ff2a6d 2b1655`
  .trim().split("\n").map((line, i) => {
    const [name, cols] = line.split("|");
    const t = { name, id: "p" + i };
    cols.split(" ").forEach((c, k) => (t[THEME_KEYS[k]] = "#" + c));
    return t;
  });
const MAX_CUSTOM_THEMES = 60;
const validTheme = t => !!t && typeof t.name === "string" && THEME_KEYS.every(k => /^#[0-9a-f]{6}$/i.test(t[k]));
// Kimlikler: hazır "p…", kayıtlı "c…", rastgele "r<tohum>", kaydedilmemiş düzenleme "e"
let customThemes = (() => { const c = store.get("bb_custom_themes", []); return Array.isArray(c) ? c.filter(validTheme).slice(0, MAX_CUSTOM_THEMES) : []; })();
let theme = (() => {
  const t = store.get("bb_theme_cur", null);
  return validTheme(t) ? t : { ...THEMES[(parseInt(store.get("bb_theme", 0)) || 0) % THEMES.length] }; // eski sürüm: hazır tema sırası
})();
const T = () => theme;
const hpColor = hp => (hp === 3 ? T().b3 : hp === 2 ? T().b2 : T().b1);

// Tema hem tuvali hem sayfa arayüzünü (CSS değişkenleri) boyar
function applyTheme() {
  const t = theme, r = document.documentElement.style;
  document.body.style.background = r.background = t.bg;
  const vars = {
    "--board": hexToRgba(t.board, 0.8), "--boardvid": hexToRgba(t.board, 0.62), "--uitext": t.text, "--uidim": t.dim,
    "--accent": t.accent, "--accent-ink": relLum(t.accent) > 0.35 ? "#111111" : "#ffffff", "--panel": t.board,
    "--panel2": t.bg, "--panel-soft": hexToRgba(t.board, 0.6), "--line": hexToRgba(t.un, 0.7),
  };
  for (const k in vars) r.setProperty(k, vars[k]);
  store.set("bb_theme_cur", t);
}
function setTheme(t) {
  theme = { ...t };
  applyTheme();
  refreshThemeButton();
  refreshThemeUI();
}
// Hazır + kayıtlı temalar arasında sıradakine geç (T tuşu / tema düğmesi)
function cycleTheme() {
  const all = THEMES.concat(customThemes);
  setTheme(all[(all.findIndex(x => x.id === theme.id) + 1) % all.length]);
}
const randomTheme = () => setTheme(genTheme((Math.random() * 1e9) | 0));

// --- Sonsuz tema üreteci: tohumdan uyumlu ve okunaklı bir palet ---
// Renk tahtaya karşı yeterli kontrasta gelene kadar açılır (koyu tahta) ya da koyulaşır (açık tahta)
function ensureContrast(h, s, l, board, min, dark) {
  let c = hslHex(h, s, l);
  for (let i = 0; i < 25 && contrast(c, board) < min; i++) c = hslHex(h, s, (l = clamp(l + (dark ? 3 : -3), 0, 100)));
  return c;
}
const TH_ADJ = ["Kızıl", "Kozmik", "Neon", "Sisli", "Altın", "Buzlu", "Elektrik", "Kadife", "Volkanik", "Pastel", "Gizemli",
  "Tropik", "Kutup", "Dijital", "Antik", "Zehirli", "Gece", "Şafak", "Fırtınalı", "Kristal", "Mistik", "Retro", "Yakut", "Zümrüt", "Safir", "Bakır"];
const TH_NOUN = ["Nebula", "Okyanus", "Orman", "Çöl", "Rüya", "Kristal", "Fırtına", "Galaksi", "Lav", "Bahar", "Vadi", "Gölge",
  "Mercan", "Yıldız", "Duman", "Şehir", "Ada", "Buzul", "Bataklık", "Gezegen", "Labirent", "Tapınak", "Kanyon", "Volkan"];
const SCHEMES = { analog: [0, 30, 60], triad: [0, 120, 240], tamamlayici: [0, 180, 30], bolunmus: [0, 150, 210], dortlu: [0, 90, 180], tek: [0, 6, 12] };
function genTheme(seed) {
  const r = seeded(seed), choose = arr => arr[(r() * arr.length) | 0];
  const h = r() * 360;                       // tahta tonu
  const dark = r() < 0.8;                    // çoğunlukla koyu, arada açık tahta
  const sch = choose(Object.keys(SCHEMES));
  const bs = 20 + r() * 40;
  const bg = hslHex(h, bs, dark ? 4 + r() * 6 : 84 + r() * 6);
  const board = hslHex(h, bs, dark ? 9 + r() * 7 : 93 + r() * 5);
  const off = r() * 360;                     // tuğla tonları tahtadan bağımsız döner
  const sat = 55 + r() * 40, bl = dark ? 55 + r() * 15 : 40 + r() * 10;
  const ec = (hh, ss, ll, min) => ensureContrast(hh, ss, ll, board, min, dark);
  const [b1, b2, b3] = SCHEMES[sch].map((o, i) => ec(off + o, sat, bl + (sch === "tek" ? (1 - i) * 12 : 0), 2.4));
  return {
    id: "r" + seed, name: choose(TH_ADJ) + " " + choose(TH_NOUN) + " #" + (seed % 10000), bg, board, b1, b2, b3,
    un: ec(h, 12, dark ? 36 : 70, 1.7), ex: ec(18 + r() * 28, 95, dark ? 58 : 50, 2.2), pad: ec(off, 30, dark ? 88 : 22, 6),
    ball: dark ? "#ffffff" : hslHex(h, 30, 12), text: ec(h, 25, dark ? 90 : 14, 7), dim: ec(h, 18, dark ? 60 : 42, 3.2),
    accent: ec(off, sat, bl, 3), star: hslHex(h, bs, dark ? 26 : 78),
  };
}
applyTheme();
