// ======================================================================
// 21. LANET PAKTI: bölüm başında sunulan risk/ödül anlaşmaları.
//     Paktlar koşu boyunca sürer; oyuncu isterse hiçbirini seçmez.
// ======================================================================
const PACT_POOL = [
  { id: "cam",    icon: "💠", name: tr("CAM TOP"),       color: "#4cc9f0",
    desc: tr("+%25 puan, top %10 daha hızlı"),              mods: { scoreMul: 1.25, speedMul: 1.10 } },
  { id: "kan",    icon: "🩸", name: tr("KAN BEDELİ"),    color: "#ff4d6d",
    desc: tr("-1 can, +%40 puan"),                           mods: { scoreMul: 1.40, lives: -1 } },
  { id: "boss",   icon: "👹", name: tr("BOSS AVCI"),     color: "#ffd166",
    desc: tr("Bosslar +%50 can, +%20 puan"),                 mods: { scoreMul: 1.20, bossHpMul: 1.5 } },
  { id: "lanet",  icon: "🔮", name: tr("LANET MIKSI"),   color: "#c77dff",
    desc: tr("Lanetler +%25 uzun, lanet bonusu +0.5"),       mods: { curseDurMul: 1.25, curseBonusAdd: 0.5 } },
  { id: "altin",  icon: "💰", name: tr("ALTIN ATEŞİ"),   color: "#ffc300",
    desc: tr("Altın tuğla ×2, normal puan -%10"),            mods: { goldMul: 2, scoreMul: 0.9 } },
  { id: "kalkan", icon: "🛡", name: tr("KALKAN USTASI"), color: "#64dfdf",
    desc: tr("+3 kalkan, -%10 puan"),                        mods: { shield: 3, scoreMul: 0.9 } },
  { id: "sifir",  icon: "💀", name: tr("SIFIR NOKTA"),   color: "#ff5d8f",
    desc: tr("1 cana düş, tüm puanlar ×1.6"),                mods: { scoreMul: 1.6, livesSet: 1 } },
  { id: "sessiz", icon: "🌑", name: tr("SESSİZ GECE"),   color: "#9aa5b1",
    desc: tr("Lanetler kapalı, -%20 puan"),                  mods: { noCurses: true, scoreMul: 0.8 } },
  { id: "tugla", icon: "🧱", name: tr("SERT TUĞLALAR"),  color: "#e76f51",
    desc: tr("Sıradan tuğlalar +1 can, puan ×1.35"),         mods: { brickHpAdd: 1, scoreMul: 1.35 } },
  { id: "salgin", icon: "🦠", name: tr("VİRÜS SALGINI"), color: "#a3e635",
    desc: tr("Her bölümde 2 virüs tuğla, puan ×1.3"),         mods: { virusBricks: 2, scoreMul: 1.3 } },
];
const PACT_BY_ID = Object.fromEntries(PACT_POOL.map(p => [p.id, p]));
const pactBar = $("pactbar"), pactCards = $("pact-cards");
let pactOffer = null;

// Paktların toplam etkisi: çarpanlar çarpılır, toplananlar eklenir.
function pactMods() {
  const m = { scoreMul: 1, speedMul: 1, bossHpMul: 1, curseDurMul: 1, curseBonusAdd: 0,
              goldMul: 1, shield: 0, lives: 0, livesSet: 0, noCurses: false, brickHpAdd: 0, virusBricks: 0 };
  for (const id of run.pacts) {
    const p = PACT_BY_ID[id];
    if (!p) continue;
    const x = p.mods;
    for (const k of ["scoreMul", "speedMul", "bossHpMul", "curseDurMul", "goldMul"]) if (x[k] != null) m[k] *= x[k];
    for (const k of ["curseBonusAdd", "shield", "lives", "brickHpAdd", "virusBricks"]) if (x[k] != null) m[k] += x[k];
    if (x.livesSet != null) m.livesSet = m.livesSet ? Math.min(m.livesSet, x.livesSet) : x.livesSet;
    if (x.noCurses) m.noCurses = true;
  }
  return m;
}
const pactScoreMul = () => pactMods().scoreMul;
const pactSpeedMul = () => pactMods().speedMul;
const pactBossHpMul = () => pactMods().bossHpMul;
const pactCurseDurMul = () => pactMods().curseDurMul;
const pactCurseBonusAdd = () => pactMods().curseBonusAdd;
const pactGoldMul = () => pactMods().goldMul;
const pactNoCurses = () => pactMods().noCurses;
const pactNames = () => run.pacts.map(id => PACT_BY_ID[id] && (PACT_BY_ID[id].icon + " " + PACT_BY_ID[id].name)).filter(Boolean).join(" · ");

// Paktlar yalnızca klasik koşuda, 1. ve her 5. bölümün başında sunulur.
const pactEnabled = () => settings.pacts !== "kapali" && !battle.active && !run.daily && !run.practice && !weekly.active;
const pactOfferDue = level => level === 1 || level % 5 === 0;

function showPactOffer() {
  if (!pactEnabled() || run.pactOfferLevel === state.level || !pactOfferDue(state.level)) return false;
  run.pactOfferLevel = state.level;             // aynı bölümde can kaybında tekrar sorma
  const pool = PACT_POOL.filter(p => !run.pacts.includes(p.id));
  if (!pool.length) return false;
  const choices = [];
  while (choices.length < 3 && pool.length) choices.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  pactOffer = choices;
  pactCards.replaceChildren(...choices.map(p => el("button", {
    className: "pact-card", style: { "--c": p.color }, onclick: () => applyPact(p.id),
  }, el("strong", { textContent: p.icon + " " + p.name }), el("span", { textContent: p.desc }))));
  pactBar.hidden = false;
  return true;
}
function hidePactOffer() {
  pactOffer = null;
  pactBar.hidden = true;
}
const skipPact = () => hidePactOffer();

function applyPact(id) {
  const p = PACT_BY_ID[id];
  if (!p || run.pacts.includes(id)) return false;
  run.pacts.push(id);
  const m = p.mods;
  if (m.lives) state.lives = Math.max(1, state.lives + m.lives);
  if (m.livesSet != null) state.lives = Math.max(1, Math.min(state.lives, m.livesSet));
  if (m.shield) state.shield = Math.min(6, state.shield + m.shield);
  if (m.noCurses) { state.curses = {}; state.pendingCurse = null; state.curseAt = Infinity; }
  state.speed = levelSpeed(state.level);
  callout(p.icon + " " + p.name, p.color);
  sfx("power");
  hidePactOffer();
  return true;
}

onClick("pact-skip", skipPact);
