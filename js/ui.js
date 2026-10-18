// ======================================================================
// 14. ARAYÜZ: araç çubuğu, paneller (Ayarlar, Tema stüdyosu), girdi, tam ekran
// ======================================================================
const toolbar = $("toolbar"), backdrop = $("backdrop");
const settingsPanel = $("settingspanel"), themePanel = $("themepanel");
const toolBtn = (label, title, onclick) => toolbar.appendChild(el("button", { textContent: label, title, onclick }));

// --- Paneller: ekranın ortasında açılır, aynı anda tek panel; Esc / dış tık / ✕ kapatır ---
const panels = [];
function setupPanel(panel, title) {
  panel.prepend(el("div", { className: "panel-head" }, el("strong", { textContent: title }),
    el("button", { className: "panel-x", textContent: "✕", title: "Kapat (Esc)", onclick: closePanels })));
  panels.push(panel);
}
function closePanels() { for (const p of panels) p.hidden = true; backdrop.hidden = true; }
const panelOpen = () => panels.some(p => !p.hidden);
function togglePanel(panel, onOpen) {
  const open = panel.hidden;
  closePanels();
  if (!open) return;
  pauseGame();                  // panel açıkken top öksüz kalmasın
  panel.hidden = backdrop.hidden = false;
  if (onOpen) onOpen();
}
backdrop.addEventListener("click", closePanels);

// --- Seçenek satırları (ayarlar ve rekabet paneli): her seçenek bir düğme, etkin olan vurgulu ---
function buildRows(container, rows, target, onChange) {
  for (const row of rows) {
    if (row.head) { container.append(el("div", { className: "sethead", textContent: row.head })); continue; }
    if (row.note) { container.append(el("div", { className: "setnote", textContent: row.note })); continue; }
    const line = el("div", { className: "setrow" }, el("span", { className: "label", textContent: row.label }));
    if (row.range) {
      const out = el("span", { className: "rangeval", textContent: target[row.key] });
      line.append(el("input", { type: "range", id: "fxvol", min: row.range[0], max: row.range[1], value: target[row.key], oninput: e => {
        out.textContent = target[row.key] = clamp(parseInt(e.target.value) || 0, ...row.range);
        onChange(row);
      } }), out);
    } else {
      for (const [v, label] of row.opts) {
        line.append(el("button", { textContent: label, dataset: { opt: row.key, val: String(v) }, onclick: () => {
          target[row.key] = v;
          onChange(row);
          refreshRows(container, target);
        } }));
      }
    }
    container.append(line);
  }
  refreshRows(container, target);
}
const refreshRows = (container, target) => {
  for (const b of container.querySelectorAll("[data-opt]")) b.classList.toggle("active", String(target[b.dataset.opt]) === b.dataset.val);
};

// --- Araç çubuğu ---
const muteBtn = toolBtn("", "Tüm oyun sesleri (arka plan medyası ayrı sürgüyle)", () => {
  muted = !muted;
  store.set("bb_muted", muted ? 1 : 0);
  applyFxVolume();
  refreshMuteButton();
});
function refreshMuteButton() {
  muteBtn.textContent = muted ? "🔇 Sesler kapalı" : "🔊 Sesler açık";
  muteBtn.classList.toggle("muted", muted);
}
const themeBtn = toolBtn("", "Sıradaki tema (T)", () => { pauseGame(); cycleTheme(); });
const refreshThemeButton = () => { themeBtn.textContent = "🎨 " + T().name; };
toolBtn("🎲 Tema", "Sonsuz rastgele tema (R)", () => { pauseGame(); randomTheme(); });
const studioBtn = toolBtn("🖌️ Tema stüdyosu", "Temaları gez, düzenle, kaydet, paylaş", () => togglePanel(themePanel, refreshThemeUI));
const settingsBtn = toolBtn("⚙️ Ayarlar", "Ses, zorluk, lanetler, görünüm, müzik", () => togglePanel(settingsPanel));
toolBtn("🖥️", "Tam ekran (F)", () => toggleFullscreen());
refreshMuteButton();
refreshThemeButton();

// --- Ayarlar paneli: SETTING_ROWS tablosundan üretilir ---
setupPanel(settingsPanel, "⚙️ Ayarlar");
buildRows(settingsPanel, SETTING_ROWS, settings, row => {
  saveSettings();
  if (row.key === "fxVol") applyFxVolume();
  if (row.key === "bgFx") initStars();
  if (row.preview) playPaddleSound();   // raket sesi önizlemesi
});
settingsPanel.append(el("div", { className: "setrow" }, el("button", { id: "resetlooks", textContent: "Görünümü varsayılana döndür", onclick: () => {
  for (const k in LOOKS) settings[k] = LOOKS[k][0];
  saveSettings();
  refreshRows(settingsPanel, settings);
  initStars();
} })));

// --- Tema stüdyosu: galeri, rastgele öneriler, renk düzenleyici, kaydet/sil, paylaşım kodu ---
setupPanel(themePanel, "🖌️ Tema stüdyosu");
const themeGrid = $("themegrid"), suggestGrid = $("suggestgrid"), thColors = $("th-colors"), thName = $("th-name"), thCode = $("th-code"), thMsg = $("th-msg"), thDelete = $("th-delete");
let suggestions = [];
const rollSuggestions = () => { suggestions = Array.from({ length: 8 }, () => genTheme((Math.random() * 1e9) | 0)); };
const saveCustomThemes = () => store.set("bb_custom_themes", customThemes);
const themeMsg = m => { thMsg.textContent = m || ""; };
const makeSwatch = t => el("button", {
  className: "swatch" + (t.id === theme.id ? " active" : ""), title: t.name, onclick: () => { themeMsg(""); setTheme(t); },
  style: { background: t.board, color: t.text, borderColor: t.id === theme.id ? t.accent : t.un },
}, el("span", { className: "swname", textContent: t.name }), el("span", { className: "bars" }, ...["b1", "b2", "b3", "ex"].map(k => el("span", { style: { background: t[k] } }))));
// Renk seçiciler bir kez kurulur, sonra yalnızca değerleri güncellenir
for (const k of THEME_KEYS) {
  thColors.append(el("label", {}, el("input", { type: "color", dataset: { key: k }, oninput: e => {
    if (!theme.id || theme.id[0] !== "c") theme.id = "e";   // hazır/rastgele tema bozulmaz: kaydedilmemiş kopya olur
    theme[k] = e.target.value;
    applyTheme();
    refreshThemeUI();
  } }), THEME_LABELS[k]));
}
function refreshThemeUI() {
  if (themePanel.hidden) return;
  themeGrid.replaceChildren(...THEMES.concat(customThemes).map(makeSwatch));
  suggestGrid.replaceChildren(...suggestions.map(makeSwatch));
  for (const inp of thColors.querySelectorAll("input")) inp.value = theme[inp.dataset.key];
  if (document.activeElement !== thName) thName.value = theme.name;
  thDelete.disabled = !(theme.id && theme.id[0] === "c");
}
rollSuggestions();
onClick("th-random", () => { themeMsg(""); randomTheme(); });
onClick("th-reroll", () => { rollSuggestions(); refreshThemeUI(); });
onClick("th-save", () => {
  const name = (thName.value.trim() || theme.name).slice(0, 30), ix = customThemes.findIndex(t => t.id === theme.id);
  if (ix >= 0) customThemes[ix] = { ...theme, name };       // kayıtlı temayı güncelle
  else if (customThemes.length >= MAX_CUSTOM_THEMES) return themeMsg("En fazla " + MAX_CUSTOM_THEMES + " tema kaydedilebilir, önce birini sil.");
  else customThemes.push({ ...theme, name, id: "c" + Date.now() });
  saveCustomThemes();
  setTheme(customThemes[ix >= 0 ? ix : customThemes.length - 1]);
  themeMsg("💾 \"" + name + "\" kaydedildi.");
});
thDelete.addEventListener("click", () => {
  const ix = customThemes.findIndex(t => t.id === theme.id);
  if (ix < 0) return;
  const [gone] = customThemes.splice(ix, 1);
  saveCustomThemes();
  setTheme(THEMES[0]);
  themeMsg("🗑 \"" + gone.name + "\" silindi.");
});
thName.addEventListener("input", () => { theme.name = thName.value.slice(0, 30) || theme.name; applyTheme(); refreshThemeButton(); });
// Paylaşım kodu: "BB1:" + base64(JSON) — Türkçe karakterler için UTF-8 kodlanır
onClick("th-export", () => {
  const data = { name: theme.name };
  for (const k of THEME_KEYS) data[k] = theme[k];
  thCode.value = "BB1:" + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  thCode.select();
  if (navigator.clipboard) navigator.clipboard.writeText(thCode.value).then(() => themeMsg("📋 Kod panoya kopyalandı."), () => themeMsg("Kodu kutudan kopyala."));
  else themeMsg("Kodu kutudan kopyala.");
});
onClick("th-import", () => {
  try {
    const raw = thCode.value.trim();
    if (!raw.startsWith("BB1:")) throw new Error();
    const t = JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));
    if (!validTheme(t)) throw new Error();
    const clean = { id: "e", name: t.name.slice(0, 30) };
    for (const k of THEME_KEYS) clean[k] = t[k];
    setTheme(clean);
    themeMsg("📥 \"" + clean.name + "\" yüklendi — kalıcı olsun istersen Kaydet.");
  } catch (err) { themeMsg("⚠️ Geçersiz tema kodu."); }
});

// --- Girdi: klavye, fare, dokunma ---
const keys = {};
function pointerAim(clientX) {
  const rect = canvas.getBoundingClientRect();
  let x = (clientX - rect.left) * (W / rect.width);
  if (fxOn("reverse")) x = W - x;                  // TERS kapsülü: fare aynalanır
  const px = clamp(x - paddle.w / 2, state.inset, W - state.inset - paddle.w);
  if (curseOn("buz")) paddle.aimX = px; else paddle.x = px;   // buzda raket hedefe kayarak gider
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
}
const keyName = e => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
document.addEventListener("keydown", e => {
  if (e.target.matches && e.target.matches("input[type=text], textarea")) return;   // yazı yazarken oyun tuşları çalışmasın
  const k = keyName(e);
  if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys[k] = true;
  if (e.repeat) return;
  if (k === "Escape" && panelOpen()) return closePanels();
  if (k === "t") cycleTheme();
  if (k === "r") randomTheme();
  if (k === "f") toggleFullscreen();
  if (panelOpen()) return;                         // panel açıkken oyun arkada beklesin
  if (k === " ") action();
  if (k === "p" || k === "Escape") togglePause();
});
document.addEventListener("keyup", e => { keys[keyName(e)] = false; });
canvas.addEventListener("mousemove", e => pointerAim(e.clientX));
canvas.addEventListener("click", action);
// Mobil: parmak raketi götürür, dokunuş aynı zamanda eylemdir
canvas.addEventListener("touchstart", e => { e.preventDefault(); pointerAim(e.touches[0].clientX); action(); }, { passive: false });
canvas.addEventListener("touchmove", e => { e.preventDefault(); pointerAim(e.touches[0].clientX); }, { passive: false });
// Sekme değişince / pencere odağı gidince otomatik duraklat; basılı kalan tuşları unut
function autoPause() {
  pauseGame();
  for (const k in keys) keys[k] = false;
}
document.addEventListener("visibilitychange", () => { if (document.hidden) autoPause(); });
window.addEventListener("blur", autoPause);
