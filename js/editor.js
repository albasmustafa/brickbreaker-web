// ======================================================================
// 28. BÖLÜM EDİTÖRÜ: kendi duvarını çiz, test et, kaydet, kodla ya da
//     bağlantıyla paylaş. Harita biçimi levels.js ile aynıdır (10 sütun,
//     '>' = kayan sıra, boss seçilirse ilk 5 sıra boss'a ayrılır).
//     Test koşuları pratik sayılır: rekor, liderlik, kariyer etkilenmez.
// ======================================================================
const ED_ROWS = 12;                                        // raketle arada nefes payı kalsın (70 + 12×28 = 406 px)
const ED_BOSS_ROWS = 5;
const ED_CHARS = ".123XEZ$+HATIVS";
const ED_CHAR_RE = /^[.123XEZ$+HATIVS]{10}>?$/;
const ED_MAX_SAVED = 30;
const ED_BOSSES = LEVELS.filter(l => l.boss).map(l => l.boss);
// Palet: karakter → kısa ad (koleksiyon ve harita açıklamasıyla aynı adlar)
const ED_PALETTE = [
  [".", N_("Silgi")], ["1", N_("1 vuruş")], ["2", N_("2 vuruş")], ["3", N_("3 vuruş")], ["X", N_("Kırılmaz")],
  ["E", N_("Patlayan")], ["Z", N_("Elektrik")], ["$", N_("Altın")], ["+", N_("Çoğaltan")], ["H", N_("Yenilenen")],
  ["A", N_("Kalkanlı")], ["T", N_("İkiz")], ["I", N_("Buz")], ["V", N_("Virüs")], ["S", N_("Şifacı")],
];

const editor = {
  name: "", rows: Array(ED_ROWS).fill(".........."), slide: Array(ED_ROWS).fill(false), boss: -1,
  brush: "1", mirror: false, undo: [], painting: false, playing: false, starting: false, playDef: null,
};
const edPanel = $("editorpanel"), edGrid = $("ed-grid"), edMsg = $("ed-msg"), edCode = $("ed-code"), edName = $("ed-name");

// --- Model ---
const edSnapshot = () => JSON.stringify({ rows: editor.rows, slide: editor.slide, boss: editor.boss });
function edPushUndo() {
  editor.undo.push(edSnapshot());
  if (editor.undo.length > 60) editor.undo.shift();
}
function edUndo() {
  const s = editor.undo.pop();
  if (!s) return false;
  Object.assign(editor, JSON.parse(s));
  renderEditor();
  return true;
}
const edLocked = r => editor.boss >= 0 && r < ED_BOSS_ROWS;
function edSet(r, c, ch) {
  if (edLocked(r) || r < 0 || r >= ED_ROWS || c < 0 || c >= COLS) return;
  const put = (cc) => { const line = editor.rows[r]; editor.rows[r] = line.slice(0, cc) + ch + line.slice(cc + 1); };
  put(c);
  if (editor.mirror) put(COLS - 1 - c);
}
function edClearBossRows() {
  if (editor.boss < 0) return;
  for (let r = 0; r < ED_BOSS_ROWS; r++) { editor.rows[r] = ".........."; editor.slide[r] = false; }
}
// Editör durumu → oyunun bölüm tanımı (levels.js biçimi); sondaki boş sıralar atılır
function editorDef() {
  let last = -1;
  editor.rows.forEach((line, r) => { if (/[^.]/.test(line)) last = r; });
  const map = editor.rows.slice(0, Math.max(last + 1, editor.boss >= 0 ? ED_BOSS_ROWS : 0))
    .map((line, r) => (edLocked(r) ? ".........." : line + (editor.slide[r] && /[^.]/.test(line) ? ">" : "")));
  return editor.boss >= 0 ? { boss: { ...ED_BOSSES[editor.boss] }, map } : map;
}
// Oynanabilir mi: en az bir kırılabilir tuğla ya da boss
const edBreakable = () => editor.rows.some((line, r) => !edLocked(r) && /[123EZ$+HATIVS]/.test(line));
const edPlayable = () => editor.boss >= 0 || edBreakable();
function edStats() {
  const all = editor.rows.join("");
  return { bricks: all.replace(/\./g, "").length, specials: all.replace(/[.123]/g, "").length };
}
function edLoad(d) {
  editor.name = String(d.n || "").slice(0, 30);
  editor.boss = Number.isInteger(d.b) && d.b >= 0 && d.b < ED_BOSSES.length ? d.b : -1;
  editor.rows = Array(ED_ROWS).fill("..........");
  editor.slide = Array(ED_ROWS).fill(false);
  (d.m || []).slice(0, ED_ROWS).forEach((line, r) => { editor.rows[r] = line.slice(0, 10); editor.slide[r] = line[10] === ">"; });
  edClearBossRows();
}
const edData = () => ({ n: editor.name, b: editor.boss, m: editor.rows.map((line, r) => line + (editor.slide[r] ? ">" : "")) });

// --- Paylaşım kodu: BBL1:<base64url(JSON)>, bağlantıda #bbl=<aynı gövde> ---
const b64url = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4))));
function encodeEditorLevel() {
  const d = edData();
  let last = -1;
  d.m.forEach((line, r) => { if (/[^.>]/.test(line)) last = r; });
  d.m = d.m.slice(0, last + 1);
  return "BBL1:" + b64url(JSON.stringify(d));
}
// Kodu çözer ve doğrular; geçersizse null
function decodeEditorLevel(code) {
  try {
    const raw = String(code || "").trim();
    const body = raw.startsWith("BBL1:") ? raw.slice(5) : (raw.match(/#bbl=([\w-]+)/) || [])[1];
    if (!body) return null;
    const d = JSON.parse(unb64url(body));
    if (!d || !Array.isArray(d.m) || d.m.length > ED_ROWS) return null;
    const m = d.m.map(String);
    if (!m.every(line => ED_CHAR_RE.test(line))) return null;
    const b = d.b == null ? -1 : d.b;
    if (!(Number.isInteger(b) && b >= -1 && b < ED_BOSSES.length)) return null;
    return { n: String(d.n || "").slice(0, 30), b, m };
  } catch (e) { return null; }
}
function importEditorLevel(code) {
  const d = decodeEditorLevel(code);
  if (!d) return false;
  edLoad(d);
  renderEditor();
  return true;
}
const editorLink = () => location.href.split("#")[0] + "#bbl=" + encodeEditorLevel().slice(5);

// --- Kayıtlı bölümler (bu cihazda) ---
const edSaved = () => {
  const v = store.get("bb_mylevels", []);
  return Array.isArray(v) ? v.map(x => decodeEditorLevel("BBL1:" + b64url(JSON.stringify(x)))).filter(Boolean) : [];
};
function saveEditorLevel() {
  const name = editor.name.trim();
  if (!name) return "noname";
  if (!edPlayable()) return "empty";
  const list = edSaved().filter(x => x.n !== name);
  if (list.length >= ED_MAX_SAVED) return "full";
  list.unshift({ ...edData(), n: name });
  store.set("bb_mylevels", list);
  return "ok";
}
function deleteEditorLevel(name) {
  const list = edSaved(), next = list.filter(x => x.n !== name);
  store.set("bb_mylevels", next);
  return next.length < list.length;
}

// --- Test koşusu ---
// flow.js buildLevel/nextLevel/startGame/toMenu bu fonksiyonlara bakar
const editorPlayDef = n => (editor.playing && n === 1 ? editor.playDef : null);
function playEditorLevel() {
  if (!edPlayable()) return false;
  closePanels();
  if (battle.active) closeBattle();
  editor.playDef = editorDef();
  editor.starting = editor.playing = true;
  startGame();
  editor.starting = false;
  run.practice = true;
  run.custom = true;
  hidePactOffer();                  // startGame paktı pratik bayrağından önce açmıştı
  callout("✏️ " + (editor.name.trim() || tr("Benim bölümüm")).toLocaleUpperCase(LOCALE), T().accent);
  return true;
}
function stopEditorPlay() { editor.playing = false; }
function editorComplete() {
  stopEditorPlay();
  addScore(2000);
  callout(tr("✏️ BÖLÜM TAMAM!"), T().accent);
  gameOver();
}

// --- Arayüz ---
const edColor = ch => {
  if (ch === ".") return null;
  if (/\d/.test(ch)) return hpColor(+ch);
  return brickColor({ ...BRICK_TYPES[ch], wasTwin: ch === "T", row: 0, col: 0, hp: 1 });
};
const edLabel = ch => (ch === "." ? "" : ch);
function edCellStyle(btn, ch) {
  const c = edColor(ch);
  btn.style.background = c || "";
  btn.style.color = c && c.startsWith("#") ? dotColorFor(c) : "";
  btn.textContent = edLabel(ch);
}
const edCells = [];
const edSlides = [];
function buildEditorGrid() {
  edGrid.replaceChildren();
  for (let r = 0; r < ED_ROWS; r++) {
    edCells[r] = [];
    for (let c = 0; c < COLS; c++) {
      const b = el("button", { type: "button", className: "ed-cell", dataset: { r, c } });
      edCells[r][c] = b;
      edGrid.append(b);
    }
    const s = el("button", { type: "button", className: "ed-slide", textContent: "↔", title: tr("Bu sıra sağa sola kayar"),
      onclick: () => { if (edLocked(r)) return; edPushUndo(); editor.slide[r] = !editor.slide[r]; renderEditor(); } });
    edSlides[r] = s;
    edGrid.append(s);
  }
}
function renderEditor() {
  if (!edPanel) return;
  if (document.activeElement !== edName) edName.value = editor.name;
  for (let r = 0; r < ED_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = edCells[r][c];
      edCellStyle(b, editor.rows[r][c]);
      b.classList.toggle("locked", edLocked(r));
    }
    edSlides[r].classList.toggle("active", !!editor.slide[r]);
    edSlides[r].disabled = edLocked(r);
  }
  edGrid.classList.toggle("boss", editor.boss >= 0);
  for (const b of $("ed-palette").children) b.classList.toggle("active", b.dataset.ch === editor.brush);
  for (const b of $("ed-boss").children) b.classList.toggle("active", +b.dataset.boss === editor.boss);
  $("ed-mirror").classList.toggle("active", editor.mirror);
  $("ed-undo").disabled = !editor.undo.length;
  $("ed-play").disabled = !edPlayable();
  const s = edStats();
  $("ed-info").textContent = tr("{n} tuğla · {s} özel", { n: s.bricks, s: s.specials }) +
    (editor.boss >= 0 ? " · " + tr("boss: {name}", { name: tr(ED_BOSSES[editor.boss].name) }) : "") +
    (edPlayable() ? "" : " · " + tr("en az bir kırılabilir tuğla koy"));
  const saved = edSaved();
  $("ed-saved").replaceChildren(...(saved.length ? saved.map(d => el("button", {
    type: "button", className: d.n === editor.name ? "active" : "", textContent: (d.b >= 0 ? "☠ " : "") + d.n,
    onclick: () => { edLoad(d); renderEditor(); edMsg.textContent = tr("📂 {name} açıldı.", { name: d.n }); },
  })) : [el("span", { className: "setnote", textContent: tr("Henüz kayıtlı bölüm yok.") })]));
}
const openEditor = () => { if (edPanel.hidden) togglePanel(edPanel, renderEditor); };

function edCellAt(x, y) {
  const t = document.elementFromPoint(x, y);
  return t && t.closest ? t.closest(".ed-cell") : null;
}
function edPaint(cell, erase) {
  if (!cell) return;
  const r = +cell.dataset.r, c = +cell.dataset.c, ch = erase ? "." : editor.brush;
  if (editor.rows[r][c] === ch && (!editor.mirror || editor.rows[r][COLS - 1 - c] === ch)) return;
  edSet(r, c, ch);
  renderEditor();
}
function setupEditor() {
  setupPanel(edPanel, tr("✏️ Bölüm Editörü"));
  $("ed-palette").replaceChildren(...ED_PALETTE.map(([ch, name]) => {
    const b = el("button", { type: "button", className: "ed-brush", dataset: { ch }, title: tr(name),
      onclick: () => { editor.brush = ch; renderEditor(); } });
    const sw = el("span", { className: "ed-sw" });
    edCellStyle(sw, ch);
    if (ch === ".") sw.textContent = "⌫";
    b.append(sw, el("span", { textContent: tr(name) }));
    return b;
  }));
  $("ed-boss").replaceChildren(
    el("button", { type: "button", dataset: { boss: -1 }, textContent: tr("Yok"), onclick: () => { edPushUndo(); editor.boss = -1; renderEditor(); } }),
    ...ED_BOSSES.map((spec, i) => el("button", { type: "button", dataset: { boss: i }, textContent: "☠ " + tr(spec.name),
      onclick: () => { edPushUndo(); editor.boss = i; edClearBossRows(); renderEditor(); } })));
  $("ed-templates").replaceChildren(...LEVELS.map((def, i) => (def.pixel ? null : el("button", {
    type: "button", textContent: (def.boss ? "☠ " : "") + (i + 1), title: tr("{n}. bölümü şablon olarak aç", { n: i + 1 }),
    onclick: () => {
      edPushUndo();
      const map = Array.isArray(def) ? def : def.map;
      const b = def.boss ? ED_BOSSES.findIndex(x => x.name === def.boss.name) : -1;
      edLoad({ n: tr("Bölüm {n}", { n: i + 1 }) + " +", b, m: map });
      renderEditor();
    },
  }))).filter(Boolean));
  buildEditorGrid();

  // Boyama: fareyle sürükle (sağ tık siler), dokunmatikte parmakla sürükle
  edGrid.addEventListener("contextmenu", e => e.preventDefault());
  edGrid.addEventListener("pointerdown", e => {
    const cell = e.target.closest && e.target.closest(".ed-cell");
    if (!cell) return;
    e.preventDefault();
    if (edGrid.releasePointerCapture && e.pointerId != null) try { edGrid.releasePointerCapture(e.pointerId); } catch (err) {}
    edPushUndo();
    editor.painting = e.button === 2 ? "erase" : "paint";
    edPaint(cell, editor.painting === "erase");
  });
  edGrid.addEventListener("pointermove", e => { if (editor.painting) edPaint(edCellAt(e.clientX, e.clientY), editor.painting === "erase"); });
  document.addEventListener("pointerup", () => { editor.painting = false; });
  document.addEventListener("pointercancel", () => { editor.painting = false; });

  edName.addEventListener("input", () => { editor.name = edName.value.slice(0, 30); });
  onClick("ed-mirror", () => { editor.mirror = !editor.mirror; renderEditor(); });
  onClick("ed-undo", edUndo);
  onClick("ed-clear", () => {
    edPushUndo();
    editor.rows = Array(ED_ROWS).fill(".........."); editor.slide = Array(ED_ROWS).fill(false);
    renderEditor();
  });
  onClick("ed-random", () => {
    edPushUndo();
    const lvl = 1 + ((Math.random() * 9) | 0), off = editor.boss >= 0 ? ED_BOSS_ROWS : 0;
    const map = proceduralMap((Math.random() * 1e9) | 0, lvl);
    editor.rows = Array(ED_ROWS).fill("..........");
    editor.slide = Array(ED_ROWS).fill(false);
    map.forEach((line, r) => { if (r + off < ED_ROWS) editor.rows[r + off] = line; });
    renderEditor();
  });
  onClick("ed-play", () => { if (!playEditorLevel()) edMsg.textContent = tr("⚠️ En az bir kırılabilir tuğla koy."); });
  onClick("ed-save", () => {
    const r = saveEditorLevel();
    edMsg.textContent = r === "ok" ? tr("💾 {name} kaydedildi.", { name: editor.name.trim() })
      : r === "noname" ? tr("⚠️ Önce bölüme bir ad ver.")
      : r === "empty" ? tr("⚠️ En az bir kırılabilir tuğla koy.")
      : tr("⚠️ En çok {n} bölüm kaydedilebilir; önce birini sil.", { n: ED_MAX_SAVED });
    renderEditor();
  });
  onClick("ed-delete", () => {
    edMsg.textContent = deleteEditorLevel(editor.name.trim()) ? tr("🗑 {name} silindi.", { name: editor.name.trim() }) : tr("⚠️ Bu adla kayıtlı bölüm yok.");
    renderEditor();
  });
  const copy = (text, okMsg) => {
    edCode.value = text; edCode.select();
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => (edMsg.textContent = okMsg), () => (edMsg.textContent = tr("Kodu kutudan kopyala.")));
    else edMsg.textContent = tr("Kodu kutudan kopyala.");
  };
  onClick("ed-export", () => { if (!edPlayable()) { edMsg.textContent = tr("⚠️ En az bir kırılabilir tuğla koy."); return; } copy(encodeEditorLevel(), tr("📋 Bölüm kodu panoya kopyalandı.")); });
  onClick("ed-link", () => { if (!edPlayable()) { edMsg.textContent = tr("⚠️ En az bir kırılabilir tuğla koy."); return; } copy(editorLink(), tr("🔗 Bağlantı panoya kopyalandı.")); });
  onClick("ed-import", () => {
    edPushUndo();
    edMsg.textContent = importEditorLevel(edCode.value) ? tr("📥 Bölüm yüklendi — test edebilirsin.") : tr("⚠️ Geçersiz bölüm kodu.");
  });

  toolbar.insertBefore(el("button", { textContent: tr("✏️ Editör"), title: tr("Kendi bölümünü çiz, test et ve paylaş"),
    onclick: () => togglePanel(edPanel, renderEditor) }), careerBtn);
  renderEditor();

  // Bağlantıyla gelen bölüm: #bbl=... → editöre yükle ve paneli aç
  if (/#bbl=/.test(location.hash) && importEditorLevel(location.hash)) {
    try { history.replaceState(null, "", location.href.split("#")[0]); } catch (e) {}
    openEditor();
    edMsg.textContent = tr("🔗 Paylaşılan bölüm yüklendi — ▶ Test et ile oyna.");
  }
}
setupEditor();
