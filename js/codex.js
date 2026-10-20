// ======================================================================
// 24. KOLEKSİYON: lanet, tuğla ve boss kartları.
//     Kartlar oynadıkça keşfedilir; seviye atlayınca küçük bir ödül verir.
//     Lanet kartı seviyesi o lanetin süresini kısaltır (ustalaştıkça).
// ======================================================================
const CURSE_ICONS = {
  gorunmez: "👻", hayalet: "🫥", karanlik: "🌑", elektrik: "💡", sis: "🌫️", ayna: "🪞", sarhos: "🍺",
  ruzgar: "🌬️", agir: "🪨", nabiz: "💓", buz: "🧊", yarik: "🕳️", sahte: "🎭", meteor: "☄️",
  daralan: "🧱", bariyer: "🚧", inis: "⬇️", dirilis: "🧟", zirh: "🛡️", ufo: "🛸",
};
const BRICK_CARDS = [
  { key: "1", name: "Tek Vuruş", icon: "🧱", desc: "En temel tuğla: bir vuruşta kırılır.", hint: "Bir tuğla kır." },
  { key: "2", name: "İki Vuruş", icon: "🧱", desc: "İki vuruş ister; ilk vuruşta çatlar.", hint: "Dayanıklı bir tuğla kır." },
  { key: "3", name: "Üç Vuruş", icon: "🧱", desc: "Üç vuruş ister; en sert normal tuğla.", hint: "En sert tuğlayı kır." },
  { key: "X", name: "Kırılmaz", icon: "🔩", desc: "Kırılmaz; bölümü bitirmek için şart değil.", hint: "Kırılmaz bir tuğlaya çarp." },
  { key: "E", name: "Patlayıcı", icon: "💣", desc: "Kırılınca komşularını da patlatır.", hint: "Patlayıcı bir tuğla kır." },
  { key: "Z", name: "Elektrikli", icon: "⚡", desc: "Her vuruşta en yakın 3 tuğlaya yıldırım atar.", hint: "Elektrikli bir tuğla kır." },
  { key: "$", name: "Altın", icon: "💰", desc: "×10 puan, altın yağmuru ve kesin iyi kapsül.", hint: "Altın bir tuğla kır." },
  { key: "+", name: "Çoğaltan", icon: "➕", desc: "Kırılınca aşağı doğru yeni bir top çıkar.", hint: "Çoğaltan bir tuğla kır." },
];
const CODEX_CURSES = Object.keys(CURSES).map(id => ({
  id: "curse:" + id, type: "curse", key: id, name: CURSES[id].label, icon: CURSE_ICONS[id] || "🔮",
  desc: CURSES[id].dur ? "Süreli lanet · " + CURSES[id].dur + " sn" : "Anlık lanet", hint: "Bir lanet atlat.",
}));
const CODEX_BRICKS = BRICK_CARDS.map(c => ({ id: "brick:" + c.key, type: "brick", key: c.key, name: c.name, icon: c.icon, desc: c.desc, hint: c.hint }));
const CODEX_BOSSES = LEVELS.filter(l => l.boss).map(l => ({
  id: "boss:" + l.boss.name, type: "boss", key: l.boss.name, name: l.boss.name, icon: "👹",
  desc: "Bölüm " + (LEVELS.indexOf(l) + 1) + " bossu · " + l.boss.hp + " can", hint: "Boss'u yen.",
}));
const CODEX_CARDS = [...CODEX_CURSES, ...CODEX_BRICKS, ...CODEX_BOSSES];
const CODEX_BY_ID = Object.fromEntries(CODEX_CARDS.map(c => [c.id, c]));
const CODEX_LEVELS = [0, 1, 5, 15];
const codex = { cards: {} };
{ // Kayıtlı koleksiyonu yükle; yalnızca bilinen kartları ve geçerli sayıları al
  const saved = store.get("bb_codex", null), cards = saved && saved.cards;
  if (cards && typeof cards === "object") for (const c of CODEX_CARDS) {
    const v = cards[c.id];
    if (v && Number.isFinite(+v.count) && +v.count > 0) codex.cards[c.id] = { count: Math.floor(+v.count) };
  }
}
const saveCodex = () => store.set("bb_codex", codex);
const codexCard = id => codex.cards[id] || { count: 0 };
const cardLevel = id => CODEX_LEVELS.filter(t => codexCard(id).count >= t).length - 1;
const codexDiscovered = () => CODEX_CARDS.filter(c => codexCard(c.id).count > 0).length;
const codexCurseResist = id => 1 - 0.1 * Math.min(3, cardLevel("curse:" + id));
const flushCodex = () => saveCodex();

// Kart kazanımı: seviye atlayınca (ve ilk keşifte) kaydet + duyur.
function codexBump(id) {
  const card = CODEX_BY_ID[id];
  if (!card) return;
  const before = cardLevel(id);
  const rec = codex.cards[id] || (codex.cards[id] = { count: 0 });
  rec.count++;
  const after = cardLevel(id);
  if (after > before || rec.count === 1) {
    saveCodex();
    if (after > before) callout("📖 " + card.name + " · SEVİYE " + after, "#c77dff");
    else addFloater(W / 2, 132, "📖 YENİ KART: " + card.name, "#c77dff");
  }
}
const brickCodexKey = b => b.unbreakable ? "X" : b.explosive ? "E" : b.electric ? "Z" : b.gold ? "$" : b.splitter ? "+" : String(b.maxHp);

// --- Koleksiyon paneli ---
const codexPanel = $("codexpanel"), codexGrid = $("codex-grid"), codexProgress = $("codex-progress"), codexNote = $("codex-note");
let codexTab = "curse";
setupPanel(codexPanel, "📖 Koleksiyon");
onClick("open-codex", () => togglePanel(codexPanel, renderCodex));
function renderCodex() {
  const list = CODEX_CARDS.filter(c => c.type === codexTab), found = list.filter(c => codexCard(c.id).count > 0).length;
  codexProgress.textContent = found + "/" + list.length + " keşfedildi · toplam " + codexDiscovered() + "/" + CODEX_CARDS.length;
  codexNote.textContent = codexTab === "curse"
    ? "Bir laneti ne kadar çok atlatırsan kartı o kadar yükselir; her seviye o lanetin süresini %10 kısaltır."
    : "Kartlar yalnızca bu cihazda saklanır. Seviye eşikleri: 1, 5 ve 15."
  codexGrid.replaceChildren(...list.map(c => {
    const st = codexCard(c.id), lvl = cardLevel(c.id), seen = st.count > 0;
    return el("div", { className: "codex-card" + (seen ? " got" : ""), title: seen ? c.desc : c.hint },
      el("span", { className: "codex-icon", textContent: seen ? c.icon : "❔" }),
      el("strong", { textContent: seen ? c.name : "???" }),
      el("span", { className: "codex-count", textContent: seen ? st.count + " kez · Sv." + lvl + (lvl === 3 ? " ★" : "") : "Keşfedilmedi" }),
      el("span", { className: "codex-desc", textContent: seen ? c.desc : c.hint }));
  }));
  for (const b of codexPanel.querySelectorAll("[data-codex]")) b.classList.toggle("active", b.dataset.codex === codexTab);
}
for (const b of codexPanel.querySelectorAll("[data-codex]")) b.addEventListener("click", () => { codexTab = b.dataset.codex; renderCodex(); });
onClick("codex-reset", e => {
  const b = e.currentTarget;
  if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Emin misin? Tüm kartlar silinir — tekrar tıkla"; return; }
  codex.cards = {};
  saveCodex();
  b.dataset.armed = "";
  b.textContent = "Koleksiyonu sıfırla";
  renderCodex();
});
