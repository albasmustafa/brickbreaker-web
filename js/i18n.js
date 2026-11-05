// ======================================================================
// 2. DİL: 25 dil. Kaynak dil Türkçe — kodda tr("Türkçe metin {ad}", { ad: değer }) çağrılır,
//    anahtar Türkçe metnin kendisidir. Çeviriler js/lang/<kod>.js içinde kimlik → metin olarak
//    durur (kimlikler js/lang/keys.js'teki sıradır; tools/i18n.mjs üretir ve denetler).
//    Bulunamayan çeviri sırasıyla İngilizceye, sonra Türkçeye düşer.
//    Dil değişince sayfa yeniden yüklenir: her şey baştan, seçilen dilde kurulur.
// ======================================================================
const LANGS = [
  { code: "tr", name: "Türkçe" }, { code: "en", name: "English" }, { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" }, { code: "es", name: "Español" }, { code: "it", name: "Italiano" },
  { code: "pt", name: "Português (Brasil)" }, { code: "ru", name: "Русский" }, { code: "uk", name: "Українська" },
  { code: "pl", name: "Polski" }, { code: "nl", name: "Nederlands" }, { code: "sv", name: "Svenska" },
  { code: "el", name: "Ελληνικά" }, { code: "cs", name: "Čeština" }, { code: "ro", name: "Română" },
  { code: "hu", name: "Magyar" }, { code: "az", name: "Azərbaycanca" }, { code: "ar", name: "العربية", rtl: true },
  { code: "fa", name: "فارسی", rtl: true }, { code: "hi", name: "हिन्दी" }, { code: "id", name: "Bahasa Indonesia" },
  { code: "vi", name: "Tiếng Việt" }, { code: "zh", name: "简体中文" }, { code: "ja", name: "日本語" }, { code: "ko", name: "한국어" },
];
const LANG_CODES = LANGS.map(l => l.code);
// Yalnızca işaret: veri tablosundaki Türkçe metni anahtar listesine sokar (görüntülerken tr() ile çevrilir)
const N_ = s => s;
// Kayıtlı seçim → tarayıcının dilleri → İngilizce
function pickLang() {
  const saved = store.get("bb_lang", null);
  if (LANG_CODES.includes(saved)) return saved;
  for (const l of navigator.languages || [navigator.language || ""]) {
    const code = String(l).toLowerCase().split("-")[0];
    if (LANG_CODES.includes(code)) return code;
  }
  return "en";
}
const LANG = pickLang();
const LOCALE = LANG === "pt" ? "pt-BR" : LANG === "zh" ? "zh-CN" : LANG;   // tarih/sayı biçimi
const LANG_RTL = !!LANGS.find(l => l.code === LANG).rtl;
const I18N_ID = new Map(I18N_KEYS.map((k, i) => [k, i]));
// Çeviri: tr("Bölüm {n}", { n: 3 }). Yer tutucular {ad} biçimindedir.
function tr(key, params) {
  let s = key;
  if (LANG !== "tr") {
    const id = I18N_ID.get(key), d = I18N_DATA[LANG], en = I18N_DATA.en;
    if (id != null) s = (d && d[id] != null ? d[id] : en && en[id] != null ? en[id] : key);
  }
  if (s === key && key.includes("::")) s = key.slice(key.indexOf("::") + 2);   // "bağlam::metin": aynı sözcüğün farklı anlamları
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? localDigits(params[k]) : m)) : s;
}
// Farsçada metindeki sayılar Fars rakamlarıyla yazılır; yer tutucuya gelen sayılar da öyle gösterilir
const localDigits = v => (LANG === "fa" ? String(v).replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]) : v);
function setLang(code) {
  if (!LANG_CODES.includes(code) || code === LANG) return;
  store.set("bb_lang", code);
  location.reload();
}

// Statik HTML: metin düğümleri ve title/placeholder/aria-label/içerik öznitelikleri çevrilir
function translateDom(root) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (/\p{L}/u.test(n.nodeValue) && !n.parentElement.closest("script,style,textarea") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const n of nodes) {
    const v = n.nodeValue, key = v.trim();
    n.nodeValue = v.slice(0, v.indexOf(key)) + tr(key) + v.slice(v.indexOf(key) + key.length);
  }
  for (const a of ["title", "placeholder", "aria-label"]) {
    for (const e of root.querySelectorAll("[" + a + "]")) e.setAttribute(a, tr(e.getAttribute(a)));
  }
}
document.documentElement.lang = LOCALE;
document.documentElement.dir = LANG_RTL ? "rtl" : "ltr";
{ const m = document.querySelector('meta[name="description"]'); if (m) m.content = tr(m.content); }
translateDom(document.body);
