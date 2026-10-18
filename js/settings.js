// ======================================================================
// 3. AYARLAR: tek bir tablo hem varsayılanları, hem doğrulamayı, hem de
//    ayarlar panelinin düğme satırlarını tanımlar (panel buradan üretilir).
//    opts: "değer:Yazı|değer:Yazı" — true/false ve sayılar kendi türüne çevrilir.
// ======================================================================
const parseOpts = s => s.split("|").map(p => {
  const [v, label] = p.split(":");
  return [v === "true" ? true : v === "false" ? false : isNaN(v) ? v : +v, label ?? v];
});
const SETTING_ROWS = [
  { key: "fxVol", label: "Efekt sesi", range: [0, 100], def: 100 },
  { key: "paddleSound", label: "Raket sesi", def: "random", preview: true,
    opts: "random:🎲 Rastgele|pop:Pop|bip:Bip|lazer:Lazer|tik:Tık|bas:Bas|zil:Zil|boing:Boing|pluck:Pluck|8bit:8-bit" },
  { key: "shake", label: "Ekran sarsıntısı", def: matchMedia("(prefers-reduced-motion: reduce)").matches ? "azaltilmis" : "acik",
    opts: "acik:Açık|azaltilmis:Azaltılmış|kapali:Kapalı" },
  { key: "difficulty", label: "Zorluk", def: "normal", opts: "kolay:Kolay|normal:Normal|zor:Zor" },
  { key: "hazards", label: "Lanetler", def: "normal", opts: "kapali:Kapalı|az:Az|normal:Normal|kabus:Kâbus" },
  { key: "hpDots", label: "HP noktacıkları", def: false, opts: "false:Kapalı|true:Açık" },
  { note: "Zorluk yalnızca yeni oyunda uygulanır. Lanetler oyun sırasında rastgele gelen engellerdir (görünmez raket, karanlık, rüzgar…); aktifken kırılan tuğlalar ×1.5 puan verir. Efekt sesi arka plan müziğini etkilemez." },
  { head: "Görünüm" },
  { key: "ballShape", look: true, label: "Top şekli", def: "daire", opts: "daire:● Daire|kare:■ Kare|elmas:◆ Elmas|yildiz:★ Yıldız|halka:○ Halka" },
  { key: "trail", look: true, label: "Top izi", def: "normal", opts: "normal:Normal|uzun:Uzun|gokkusagi:Gökkuşağı|kapali:Kapalı" },
  { key: "paddleStyle", look: true, label: "Raket", def: "yuvarlak", opts: "yuvarlak:Parlak|koseli:Köşeli|neon:Neon|gokkusagi:Gökkuşağı" },
  { key: "brickStyle", look: true, label: "Tuğla stili", def: "parlak", opts: "parlak:Parlak|duz:Düz|yuvarlak:Yuvarlak|3d:3D|cam:Cam|neon:Neon" },
  { key: "brickColor", look: true, label: "Tuğla rengi", def: "hp", opts: "hp:Dayanıklılığa göre|gokkusagi:Gökkuşağı" },
  { key: "bgFx", look: true, label: "Arka plan", def: "yildiz", opts: "yildiz:Yıldızlar|kar:Kar|kabarcik:Kabarcık|matrix:Matrix|izgara:Synthwave ızgara|kapali:Kapalı" },
  { key: "particles", look: true, label: "Parçacık", def: "normal", opts: "az:Az|normal:Normal|cok:Çok|asiri:Aşırı" },
  { key: "autoTheme", look: true, label: "Otomatik tema", def: "kapali", opts: "kapali:Kapalı|bolum:Her bölümde yeni rastgele tema" },
  { head: "Müzik" },
  { key: "musicFx", label: "Müzik efektleri", def: "tam", opts: "kapali:Kapalı|hafif:Hafif|tam:Tam" },
  { key: "songTheme", label: "Şarkıya özel tema", def: "kapali", opts: "kapali:Kapalı|acik:Açık" },
  { note: "Arka plana müzik ya da sesli video koyunca efektler vuruşa ve frekanslara göre oynar. Her şarkı ilk 8 saniyede dinlenip karakterine göre (bas, hız, tiz, sakin, neon) kendi efekt setini ve adını alır; profil kaydedilir. \"Tam\" ayarında hafif vuruş flaşı da vardır, ışığa duyarlıysan \"Hafif\"i seç." },
];
const settings = {}, OPT = {};
for (const row of SETTING_ROWS) if (row.key) {
  if (row.opts) row.opts = parseOpts(row.opts);
  OPT[row.key] = row;
  settings[row.key] = row.def;
}
{ // Kayıtlı ayarları yükle, yalnızca geçerli değerleri al
  const saved = store.get("bb_settings", {}) || {};
  for (const k in OPT) {
    const row = OPT[k], v = saved[k];
    if (row.range ? typeof v === "number" : row.opts.some(o => o[0] === v)) settings[k] = row.range ? clamp(v, ...row.range) : v;
  }
  // Eski sürüm raket sesini ayrı anahtarda düz metin olarak saklıyordu
  try { const old = localStorage.getItem("paddleSound"); if (!("paddleSound" in saved) && OPT.paddleSound.opts.some(o => o[0] === old)) settings.paddleSound = old; } catch (e) {}
}
const saveSettings = () => store.set("bb_settings", settings);
// Görünüm seçenekleri (ilk değer varsayılan) — "Görünümü varsayılana döndür" bunları sıfırlar
const LOOKS = {};
for (const k in OPT) if (OPT[k].look) LOOKS[k] = [OPT[k].def, ...OPT[k].opts.map(o => o[0]).filter(v => v !== OPT[k].def)];
const TRAIL_LEN = { normal: 10, uzun: 24, gokkusagi: 16, kapali: 0 };
const PARTICLE_MUL = { az: 0.4, normal: 1, cok: 2, asiri: 4 };
