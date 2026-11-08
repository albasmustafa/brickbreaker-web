// ======================================================================
// 15. KARİYER: dereceli lig (LP puanı, rütbeler), istatistikler, maç geçmişi, başarımlar
//     Her şey bu cihazda tutulur. Çevrim içi maçta herkes kendi puanını getirir ve
//     kendi değişimini aynı Elo formülüyle hesaplar.
// ======================================================================
const START_LP = 1000, PLACEMENT = 5;           // ilk 5 dereceli maç yerleştirme: puan daha hızlı oynar
const K_PLACEMENT = 64, K_NORMAL = 40, MAX_HISTORY = 20;
const TIERS = [
  { name: N_("Bronz"), min: 0, icon: "🥉", color: "#cd7f32" },
  { name: N_("Gümüş"), min: 1100, icon: "🥈", color: "#c0c8d8" },
  { name: N_("Altın"), min: 1250, icon: "🥇", color: "#ffd166" },
  { name: N_("Platin"), min: 1400, icon: "💠", color: "#5ce1e6" },
  { name: N_("Elmas"), min: 1550, icon: "💎", color: "#7aa2ff" },
  { name: N_("Usta"), min: 1700, icon: "👑", color: "#f72585" },
  { name: N_("Efsane"), min: 1850, icon: "🔥", color: "#ff9f1c" },
];
const tierOf = lp => TIERS.reduce((t, x) => (lp >= x.min ? x : t), TIERS[0]);
const tierTag = lp => tierOf(lp).icon + " " + lp;
// Kariyer sayaçları (anahtar: panel etiketi); "streak" şu anki galibiyet serisidir, panelde ayrı gösterilir
const STATS = {
  games: tr("Klasik oyun"), bricks: tr("Kırılan tuğla"), bestCombo: tr("En iyi combo"), bestLevel: tr("En uzak bölüm"), bosses: tr("Yenilen boss"),
  fevers: tr("ÇILGIN MOD"), curses: tr("Atlatılan lanet"), powers: tr("Yakalanan kapsül"), time: tr("Oynama süresi"),
  matches: tr("Kapışma"), wins: tr("Galibiyet"), podiums: tr("Podyum (ilk 3)"), bestStreak: tr("En uzun seri"), ranked: tr("Dereceli maç"),
  rankedWins: tr("Dereceli galibiyet"), online: tr("Çevrim içi maç"), attacks: tr("Gönderilen saldırı"), blocked: tr("Kalkanla engellenen"),
  director: tr("Dramaturg görevi"), specials: tr("Yeni tür tuğla"), walls: tr("Yenilen duvar"),
};
// test(s, m): s = kariyer sayaçları, m = biten kapışmanın özeti (yalnızca kapışma sonunda verilir)
const ACHIEVEMENTS = [
  { id: "ilk", icon: "🧱", name: tr("İlk Tuğla"), desc: tr("İlk tuğlanı kır"), test: s => s.bricks >= 1 },
  { id: "yikim", icon: "🏗️", name: tr("Yıkım Ekibi"), desc: tr("Toplam 1.000 tuğla kır"), test: s => s.bricks >= 1000 },
  { id: "zincir", icon: "🔗", name: tr("Zincirleme"), desc: tr("20 combo yap"), test: s => s.bestCombo >= 20 },
  { id: "cilgin", icon: "★", name: tr("Çılgın"), desc: tr("ÇILGIN MOD'a gir"), test: s => s.fevers >= 1 },
  { id: "boss", icon: "👹", name: tr("Boss Avcısı"), desc: tr("Bir boss yen"), test: s => s.bosses >= 1 },
  { id: "imparator", icon: "⚙️", name: tr("İmparator Düştü"), desc: tr("Demir İmparator'u yenip 11. bölüme ulaş"), test: s => s.bestLevel >= 11 },
  { id: "labirent", icon: "🌀", name: tr("Labirentin Sonu"), desc: tr("11. bölümü de bitir"), test: s => s.bestLevel >= 12 },
  { id: "elli", icon: "💯", name: tr("50.000 Kulübü"), desc: tr("Tek oyunda 50.000 puan topla"), test: () => state.score >= 50000 },
  { id: "lanet", icon: "🔮", name: tr("Lanet Avcısı"), desc: tr("Toplam 50 lanet atlat"), test: s => s.curses >= 50 },
  { id: "kapsul", icon: "💊", name: tr("Kapsül Bağımlısı"), desc: tr("Toplam 100 kapsül yakala"), test: s => s.powers >= 100 },
  { id: "yeninesil", icon: "🧬", name: tr("Yeni Nesil"), desc: tr("Yeni türden bir tuğla kır"), test: s => s.specials >= 1 },
  { id: "cesitli", icon: "🎨", name: tr("Çeşitlilik Ustası"), desc: tr("Yeni türlerden toplam 100 tuğla kır"), test: s => s.specials >= 100 },
  { id: "duvar", icon: "🧱", name: tr("İlk Duvar"), desc: tr("Bir piksel duvar kazan"), test: s => s.walls >= 1 },
  { id: "duvarkral", icon: "👑", name: tr("Duvarlar Kralı"), desc: tr("10 piksel duvar kazan"), test: s => s.walls >= 10 },
  { id: "kampilk", icon: "🌍", name: tr("İlk Dünya"), desc: tr("Kampanyada bir dünyayı bitir"), test: () => campSave.unlocked >= 2 },
  { id: "kampyarim", icon: "🗺️", name: tr("Turun Yarısı"), desc: tr("Kampanyada 4 dünyayı bitir"), test: () => campSave.unlocked >= 5 },
  { id: "kamptam", icon: "👑", name: tr("Tur Şampiyonu"), desc: tr("Kampanyayı baştan sona bitir"), test: () => campSave.done },
  { id: "kapisma", icon: "⚔", name: tr("İlk Kapışma"), desc: tr("Bir kapışmayı bitir"), test: s => s.matches >= 1 },
  { id: "zafer", icon: "🏆", name: tr("İlk Zafer"), desc: tr("Bir kapışmayı kazan"), test: s => s.wins >= 1 },
  { id: "seri3", icon: "📈", name: tr("Seri Galip"), desc: tr("3 kapışmayı üst üste kazan"), test: s => s.bestStreak >= 3 },
  { id: "seri5", icon: "🚀", name: tr("Durdurulamaz"), desc: tr("5 kapışmayı üst üste kazan"), test: s => s.bestStreak >= 5 },
  { id: "kalabalik", icon: "🎪", name: tr("Kalabalığın Kralı"), desc: tr("8 kişilik bir maçı kazan"), test: (s, m) => m && m.place === 1 && m.of >= 8 },
  { id: "makine", icon: "🤖", name: tr("Makine Avcısı"), desc: tr("Efsane güçte (1600+ LP) bot olan bir maçı kazan"), test: (s, m) => m && m.place === 1 && m.topBot >= BOT_SKILL.efsane.elo },
  { id: "kusursuz", icon: "✨", name: tr("Kusursuz"), desc: tr("Hiç can kaybetmeden bir kapışmayı kazan"), test: (s, m) => m && m.place === 1 && m.flawless },
  { id: "sonnefes", icon: "💓", name: tr("Son Nefes"), desc: tr("Tek canın kalmışken bir kapışmayı kazan"), test: (s, m) => m && m.place === 1 && m.lastLife },
  { id: "cevrimici", icon: "🌐", name: tr("Sokakların Kralı"), desc: tr("Arkadaşlarınla oynanan bir maçı kazan"), test: (s, m) => m && m.place === 1 && m.online },
  { id: "sabotaj", icon: "💣", name: tr("Sabotajcı"), desc: tr("Toplam 50 saldırı gönder"), test: s => s.attacks >= 50 },
  { id: "kalkan", icon: "🛡", name: tr("Kalkan Duvarı"), desc: tr("10 saldırıyı kalkanla engelle"), test: s => s.blocked >= 10 },
  { id: "yerlesti", icon: "🎖", name: tr("Yerleşti"), desc: tr("{n} yerleştirme maçını tamamla", { n: PLACEMENT }), test: s => s.ranked >= PLACEMENT },
  ...[["altin", "Altın"], ["elmas", "Elmas"], ["efsane", "Efsane"]].map(([id, name]) => {
    const t = TIERS.find(x => x.name === name);
    return { id: "lig-" + id, icon: t.icon, name: tr("{tier} Lig", { tier: tr(name) }), desc: tr("{tier} lige yüksel", { tier: tr(name) }), test: () => career.peak >= t.min };
  }),
];

const career = { lp: START_LP, peak: START_LP, stats: {}, history: [], ach: {}, pending: null };
function resetCareer() {
  Object.assign(career, { lp: START_LP, peak: START_LP, history: [], ach: {}, pending: null });
  for (const k of [...Object.keys(STATS), "streak"]) career.stats[k] = 0;
}
resetCareer();
{ // Kayıtlı kariyeri yükle, yalnızca geçerli değerleri al
  const saved = store.get("bb_career", null) || {}, num = v => (Number.isFinite(v) ? v : null);
  if (num(saved.lp) !== null) career.lp = clamp(Math.round(saved.lp), 0, 5000);
  career.peak = Math.max(career.lp, num(saved.peak) || 0);
  for (const k in career.stats) if (num((saved.stats || {})[k]) !== null) career.stats[k] = saved.stats[k];
  if (Array.isArray(saved.history)) career.history = saved.history.slice(0, MAX_HISTORY);
  for (const a of ACHIEVEMENTS) if (saved.ach && saved.ach[a.id]) career.ach[a.id] = saved.ach[a.id];
  if (saved.pending && num(saved.pending.delta) !== null) career.pending = saved.pending;
}
// Oyun sonunda, maç sonunda ve başarım açılınca kaydedilir (sayfa kapanırken değil: açık başka bir sekmenin kaydını ezmesin)
const saveCareer = () => store.set("bb_career", career);

// --- Bildirimler: tuvalin üstünde sırayla, tek tek görünen kartlar (tam ekranda da) ---
const TOAST_TIME = 2600;
const toasts = el("div", { id: "toasts" }), toastQueue = [];
toasts.setAttribute("aria-live", "polite");
$("stage").append(toasts);
function toast(title, sub, color) {
  toastQueue.push(el("div", { className: "toast", "--c": color || T().accent }, el("strong", { textContent: title }), sub ? el("span", { textContent: sub }) : ""));
  if (!toasts.children.length) nextToast();
}
function nextToast() {
  const t = toastQueue.shift();
  if (!t) return;
  toasts.replaceChildren(t);
  setTimeout(() => { t.remove(); nextToast(); }, TOAST_TIME);
}

// --- Sayaçlar ve başarımlar: oyun içi olaylar sayaçları canlı artırır, başarım anında açılır ---
const run = { lifeLost: 0, ended: false, practice: false, daily: false, dailyFinished: false, survival: false, campaign: false, world: 1, cstage: 1, bricks: 0, goldBricks: 0, powers: 0, bosses: 0, bestCombo: 0,
              zapBricks: 0, twinBricks: 0, virusBricks: 0, specials: 0, beats: 0, walls: 0, survival: false,
              pacts: [], pactOfferLevel: 0, lastChanceUsed: false, song: false, custom: false };
const resetRun = () => Object.assign(run, { lifeLost: 0, ended: false, practice: false, daily: false, dailyFinished: false, survival: false, campaign: false, world: 1, cstage: 1, bricks: 0, goldBricks: 0, powers: 0, bosses: 0, bestCombo: 0,
              zapBricks: 0, twinBricks: 0, virusBricks: 0, specials: 0, beats: 0, walls: 0, survival: false,
              pacts: [], pactOfferLevel: 0, lastChanceUsed: false, song: false, custom: false });
function track(key, n = 1) {
  if (run.practice) return;
  career.stats[key] += n;
  checkAchievements();
}
const trackBest = (key, v) => { if (!run.practice && v > career.stats[key]) { career.stats[key] = v; checkAchievements(); } };
function checkAchievements(m) {
  if (run.practice) return;
  for (const a of ACHIEVEMENTS) if (!career.ach[a.id] && a.test(career.stats, m)) {
    career.ach[a.id] = Date.now();
    toast(a.icon + " " + tr("Başarım: {name}", { name: a.name }), a.desc);
    sfx("achieve");
    saveCareer();
  }
}
// Bir oyun bitti (klasik oyun sonu ya da kapışma sonu): süre ve bölüm bir kez işlenir
function endRun() {
  if (run.practice || run.ended) return;
  run.ended = true;
  career.stats.time += Math.round(state.time);
  trackBest("bestLevel", state.level);
}
function careerGameEnd() {
  if (run.practice) return;
  endRun();
  track("games");
  saveCareer();
}

// --- Dereceli puan ---
// Çok oyunculu Elo: her rakiple ikili karşılaştırma (önünde bitirdiğin rakip = galibiyet), ortalaması K ile çarpılır
function eloDelta(lp, rivals) {
  if (!rivals.length) return 0;
  const k = career.stats.ranked < PLACEMENT ? K_PLACEMENT : K_NORMAL;
  const sum = rivals.reduce((s, r) => s + (r.won ? 1 : 0) - 1 / (1 + 10 ** ((r.lp - lp) / 400)), 0);
  return Math.round(k * sum / rivals.length);
}
const lpOf = r => { const p = pById(r.id) || r; return Number.isFinite(p.lp) ? p.lp : START_LP; };
function rivalsOf(list) {
  const mine = list.findIndex(r => r.id === net.myId);
  return mine < 0 ? [] : list.flatMap((r, i) => (i === mine ? [] : [{ lp: lpOf(r), won: i > mine }]));
}
function applyLp(delta) {
  const before = tierOf(career.lp);
  career.lp = Math.max(0, career.lp + delta);
  career.peak = Math.max(career.peak, career.lp);
  const after = tierOf(career.lp), up = after.min > before.min;
  if (after !== before) toast((up ? "⬆ " : "⬇ ") + (up ? tr("{tier} lige yükseldin!", { tier: tr(after.name) }) : tr("{tier} lige düştün", { tier: tr(after.name) })), after.icon + " " + career.lp + " LP", after.color);
}
function addHistory(entry) {
  career.history.unshift({ date: Date.now(), ...entry });
  career.history.length = Math.min(career.history.length, MAX_HISTORY);
}
const battleMode = () => (battle.online ? "cevrimici" : battle.ranked ? "dereceli" : "dostluk");
// Dereceli maç başlarken "son sıra" sonucu kenara yazılır: maç bitmeden ayrılırsan (sayfayı kapatmak dahil) o uygulanır
function careerBattleStart() {
  const rivals = battle.players.filter(p => p.id !== net.myId).map(p => ({ lp: lpOf(p), won: false }));
  career.pending = battle.ranked ? { delta: eloDelta(career.lp, rivals), mode: battleMode(), of: battle.players.length } : null;
  saveCareer();
}
function careerAbandon() {
  const pd = career.pending;
  if (!pd) return;
  career.pending = null;
  applyLp(pd.delta);
  career.stats.ranked++;
  career.stats.streak = 0;
  addHistory({ mode: pd.mode, place: pd.of, of: pd.of, score: null, delta: pd.delta, left: true });
  saveCareer();
  toast(tr("🏳 Dereceli maç yarıda kaldı"), tr("{n} LP · son sıra sayıldı", { n: pd.delta }), "#ff4d6d");
}
// Bağlantı oda sahibinden koptu: kimsenin suçu değil, maç puansız sayılır
const careerVoidMatch = () => { battle.ranked = false; career.pending = null; saveCareer(); };
function careerBattleEnd(list) {
  endRun();
  const s = career.stats, place = battle.myPlace, me = meP();
  let delta = null;
  if (battle.ranked && place > 0) { delta = eloDelta(career.lp, rivalsOf(list)); applyLp(delta); s.ranked++; }
  s.matches++;
  if (battle.online) s.online++;
  if (place === 1) { s.wins++; s.streak++; if (battle.ranked) s.rankedWins++; } else s.streak = 0;
  if (place >= 1 && place <= 3) s.podiums++;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  battle.rated = delta === null ? null : { delta, lp: career.lp };
  career.pending = null;
  addHistory({ mode: battleMode(), place, of: list.length, score: state.score, delta });
  checkAchievements({ place, of: list.length, online: battle.online, flawless: run.lifeLost === 0, lastLife: !!(me && me.alive) && state.lives === 1,
                      topBot: Math.max(0, ...battle.players.filter(p => p.kind === "bot").map(lpOf)) });
  saveCareer();
}

// --- Arayüz: rütbe kartı (Rekabet ve Kariyer panellerinde), Kariyer paneli ---
function rankCard() {
  const lp = career.lp, t = tierOf(lp), next = TIERS[TIERS.indexOf(t) + 1], s = career.stats;
  const base = next ? Math.max(t.min, next.min - 300) : t.min, pct = next ? clamp((lp - base) / (next.min - base), 0, 1) : 1;
  const sub = [s.ranked < PLACEMENT ? tr("Yerleştirme {a}/{b}", { a: s.ranked, b: PLACEMENT }) : "", next ? next.icon + " " + tr("{tier} için {n} LP", { tier: tr(next.name), n: next.min - lp }) : tr("En yüksek lig!"), tr("zirve {n}", { n: career.peak })];
  return el("div", { className: "rank-card", "--c": t.color },
    el("span", { className: "rank-icon", textContent: t.icon }),
    el("div", { className: "rank-main" },
      el("div", { className: "rank-name" }, el("strong", { textContent: tr(t.name) }), " · " + lp + " LP"),
      el("div", { className: "rank-bar" }, el("span", { style: { width: Math.round(pct * 100) + "%" } })),
      el("div", { className: "rank-sub", textContent: sub.filter(Boolean).join(" · ") })),
    el("div", { className: "rank-rec" }, el("strong", { textContent: s.rankedWins + "/" + s.ranked }), el("span", { textContent: tr("dereceli galibiyet") })));
}
const renderRankCards = () => { for (const slot of document.querySelectorAll(".rank-slot")) slot.replaceChildren(rankCard()); };

const careerPanel = $("careerpanel");
setupPanel(careerPanel, tr("🏅 Kariyer"));
const careerBtn = el("button", { textContent: tr("🏅 Kariyer"), title: tr("Dereceli lig, istatistikler, maç geçmişi, başarımlar"), onclick: () => togglePanel(careerPanel, renderCareer) });
toolbar.insertBefore(careerBtn, settingsBtn);
const fmtNum = v => v.toLocaleString(LOCALE);
const fmtDur = s => (s >= 3600 ? tr("{h} sa {m} dk", { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) }) : tr("{m} dk", { m: Math.floor((s % 3600) / 60) }));
const fmtDelta = d => (d == null ? "—" : (d >= 0 ? "+" : "−") + Math.abs(d));
const pad2 = n => String(n).padStart(2, "0");
const STAT_FMT = {
  time: fmtDur,
  wins: v => fmtNum(v) + (career.stats.matches ? " (" + tr("%{n}", { n: Math.round((100 * v) / career.stats.matches) }) + ")" : ""),
  bestStreak: v => v + " " + tr("(şu an {n})", { n: career.stats.streak }),
};
const MODE_LABEL = { dereceli: tr("🏅 Dereceli"), dostluk: tr("🤖 Botlar"), cevrimici: tr("🌐 Çevrim içi") };
function renderCareer() {
  renderRankCards();
  $("cr-stats").replaceChildren(...Object.entries(STATS).map(([k, label]) =>
    el("div", { className: "stat" }, el("strong", { textContent: (STAT_FMT[k] || fmtNum)(career.stats[k]) }), el("span", { textContent: label }))));
  const row = (tag, cells) => el("tr", {}, ...cells.map(c => el(tag, { textContent: c })));
  const rows = career.history.map(h => {
    const d = new Date(h.date);
    return row("td", [d.toLocaleString(LOCALE, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), MODE_LABEL[h.mode] || h.mode,
                      h.place + "/" + h.of + (h.left ? " 🏳" : h.place === 1 ? " 🏆" : ""), h.score == null ? "—" : fmtNum(h.score), fmtDelta(h.delta)]);
  });
  if (!rows.length) rows.push(el("tr", {}, el("td", { colSpan: 5, textContent: tr("Henüz kapışma yok — Rekabet panelinden bir maç başlat!") })));
  $("cr-history").replaceChildren(row("th", [tr("Tarih"), tr("Mod"), tr("Sıra"), tr("Skor"), "LP"]), ...rows);
  const got = ACHIEVEMENTS.filter(a => career.ach[a.id]).length;
  $("cr-achhead").textContent = tr("Başarımlar · {a}/{b}", { a: got, b: ACHIEVEMENTS.length });
  $("cr-ach").replaceChildren(...ACHIEVEMENTS.map(a => {
    const at = career.ach[a.id];
    return el("div", { className: "ach" + (at ? " got" : ""), title: at ? tr("Açıldı: {date}", { date: new Date(at).toLocaleDateString(LOCALE) }) : tr("Kilitli") },
      el("span", { className: "ach-icon", textContent: a.icon }), el("div", {}, el("strong", { textContent: a.name }), el("span", { textContent: a.desc })));
  }));
}
onClick("cr-reset", e => {
  const b = e.currentTarget;
  if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = tr("Emin misin? Puan, istatistik ve başarımlar silinir — tekrar tıkla"); return; }
  resetCareer();
  saveCareer();
  b.dataset.armed = "";
  b.textContent = tr("Kariyeri sıfırla");
  renderCareer();
});
if (career.pending) careerAbandon();           // önceki oturumda yarım kalan dereceli maç
