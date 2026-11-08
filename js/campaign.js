// ======================================================================
// 27. KAMPANYA — 8 Dünya Turu: her dünya 5 bölümdür (5.'si boss), kendi
//     temasıyla açılır. Bölüm başına 1-3 yıldız: temizle + can kaybetmeden +
//     8 combo. İlerleme (yıldız/kilit) bb_campaign içinde kalıcıdır.
//     Haritalar klasik alfabeyi (123XEZ$+HATIVS) kullanır; 3. bölüm olarak
//     bazı dünyalar piksel duvar modunu (mikro/mozaik/adalar) tekrar ziyaret eder.
// ======================================================================
const CAMPAIGN_BOSS_ROOM = Array(5).fill("..........");
const CAMPAIGN = [
  { name: N_("Gece"), theme: 0, levels: [                                    // 1. DÜNYA — nazik başlangıç, yeni türler tanıtılır
    ["1111111111", "1.111111.1", "1111111111", ".11111111.", "1111111111"],
    [".22222222.", "2211111122", "2222222222", "1111H11111", "2222222222"],
    ["..EEEE....", ".22222222.", "1111111111", "22T1111T22", "1111111111"],
    ["3333333333", "22.2222.22", "1HH1111HH1", "2222222222", ".33333333."],
    { boss: { name: N_("GECE BEKÇİSİ"), hp: 30, speed: 90, shootEvery: 2.6 }, map: [...CAMPAIGN_BOSS_ROOM, "2.+.11.+.2", "..1....1.."] },
  ]},
  { name: N_("Neon"), theme: 3, levels: [                                    // 2. DÜNYA — elektrik zincirleri ve altın
    ["Z11111111Z", "1Z2222$Z11", "111Z11Z111", "22$2222$22", "1Z111111Z1"],
    ["2Z2Z2Z2Z2Z", "1$111111$1", "Z22222222Z", "111Z11Z111", "2$22Z2Z22$"],
    ["1111111111", "Z$Z1111Z$Z", "22.2222.22", "1Z111111Z1", "$$1111$$11"],
    ["Z33333333Z", "3Z3EEEE3Z3", "3333333333", "Z3$3333$3Z", "33Z3333Z33"],
    { boss: { name: N_("NEON LORD"), hp: 45, speed: 120, shootEvery: 2.2 }, map: [...CAMPAIGN_BOSS_ROOM, "Z.2$EE$2.Z", "...+..+..."] },
  ]},
  { name: N_("Tünel"), theme: 11, levels: [                                  // 3. DÜNYA — matrix; mikro duvar ziyareti
    ["11XX111X11", "..222222..", "X33333333X", "2211Z11122", ".33333333."],
    ["X2.2222.2X", "22Z1111Z22", "3.333333.3", "2222$$2222", "1333333331"],
    { pixel: "mikro", map: [] },
    ["Z3333Z3333", "X22..T..22", "333X33X333", "2ZA2222AZ2", "3333333333"],
    { boss: { name: N_("TÜNEL USTASI"), hp: 55, speed: 100, shootEvery: 2.0, minions: true }, map: [...CAMPAIGN_BOSS_ROOM, "X.3Z33Z3.X", "..2.+.2..."] },
  ]},
  { name: N_("Buz"), theme: 5, levels: [                                     // 4. DÜNYA — buz dondurur, ateş eritir
    ["II111111II", "2I222222I2", "111IIII111", "2222222222", "3I333333I3"],
    ["IIII22IIII", "22II$$II22", "1II1111II1", "2H222222H2", "IIII33IIII"],
    ["3333333333", "III.33.III", "22EIIIIE22", "3II3HH3II3", "3333333333"],
    ["XII3333IIX", "3IIIIIIII3", "II3$$$$3II", "22IIIIII22", "3II3333II3"],
    { boss: { name: N_("BUZ KRALİÇESİ"), hp: 65, speed: 130, shootEvery: 1.9, volley: 5 }, map: [...CAMPAIGN_BOSS_ROOM, "3.IIIIII.3", "..+.$$.+.."] },
  ]},
  { name: N_("Vampir"), theme: 18, levels: [                                 // 5. DÜNYA — virüsler ve patlamalar
    ["V22222222V", "22E1111E22", "3V333333V3", "2222$$2222", "111V11V111"],
    ["XV33333VXX", "22V1111V22", "3VVE22EVV3", "2222222222", "1V1$11$1V1"],
    ["VV333333VV", "22VE22EV22", "3V333333V3", "11V1HH1V11", "2V22$$22V2"],
    ["3333333333", "VVA3333AVV", "22V1EE1V22", "3VV3333VV3", "1111111111"],
    { boss: { name: N_("KAN KONTU"), hp: 75, speed: 110, shootEvery: 1.8, minions: true }, map: [...CAMPAIGN_BOSS_ROOM, "V.3$$$$3.V", "..E.VV.E.."] },
  ]},
  { name: N_("Aurora"), theme: 23, levels: [                                 // 6. DÜNYA — ikizler dansı; mozaik ziyareti
    ["TT11111TT1", "22T2222T22", "1T111111T1", "2T2T$$T2T2", "TT111111TT"],
    ["33333T3333", "TT3HHHH3TT", "22T1111T22", "3TT3333TT3", "11TT$$TT11"],
    { pixel: "mozaik", map: [] },
    ["T33333333T", "2T2T1S1T2T", "333T11T333", "22T3$$3T22", "TT222222TT"],
    { boss: { name: N_("KUZEY IŞIĞI"), hp: 85, speed: 150, shootEvery: 1.7, volley: 5 }, map: [...CAMPAIGN_BOSS_ROOM, "T.T3$$3T.T", "...TT.TT.."] },
  ]},
  { name: N_("Derin Deniz"), theme: 27, levels: [                            // 7. DÜNYA — adalar ziyareti; her şey karışır
    ["Z22XXX22Z2", "22V1TT1V22", "3333$$3333", "1ZA2222AZ1", "22..SS..22"],
    ["XX333333XX", "2Z222222Z2", "3T333333T3", "22$$222$$2", "1V1HHHH1V1"],
    { pixel: "adalar", map: [] },
    ["333X33X333", "22Z1EE1Z22", "3V33TT33V3", "11A2$$2A11", "2222222222"],
    { boss: { name: N_("DERİNLİK DEVRİ"), hp: 100, speed: 125, shootEvery: 1.6, minions: true, volley: 5 }, map: [...CAMPAIGN_BOSS_ROOM, "3.V.TT.V.3", ".2.E..E.2."] },
  ]},
  { name: N_("Siberpunk"), theme: 24, levels: [                              // 8. DÜNYA — final: her tür, en sert duvarlar
    ["Z33333333Z", "3AT1VV1TA3", "33Z3$$3Z33", "2T222222T2", "1V1E33E1V1"],
    ["XX333333XX", "ZAZ1111ZAZ", "3T3VHHV3T3", "22$3TT3$22", "3333333333"],
    ["3333ZZ3333", "2V2T11T2V2", "3A3VSSV3A3", "11E3333E11", "2Z2$$$$2Z2"],
    { pixel: "koridor", map: [] },
    { boss: { name: N_("SİBER İMPARATOR"), hp: 140, speed: 160, shootEvery: 1.4, minions: true, volley: 5, rain: true }, map: [...CAMPAIGN_BOSS_ROOM, "Z.3V$$V3.Z", ".E.T..T.E."] },
  ]},
];

// --- Kalıcı ilerleme: yıldızlar ve açılan dünyalar ---
const campaign = { world: 1, stage: 1, stageLost: 0, bestCombo: 0 };
function campaignDef() { return CAMPAIGN[run.world - 1].levels[run.cstage - 1]; }
let campSave = (() => {
  const v = store.get("bb_campaign", null);
  if (v && typeof v === "object" && v.stars && typeof v.stars === "object" && Number.isFinite(+v.unlocked)) {
    return { stars: v.stars, unlocked: clamp(Math.round(+v.unlocked), 1, 8), done: !!v.done };
  }
  return { stars: {}, unlocked: 1, done: false };
})();
const saveCampaign = () => store.set("bb_campaign", campSave);
const campStars = (w, s) => (campSave.stars[w] || [0, 0, 0, 0, 0])[s - 1] || 0;
const campWorldStars = w => (campSave.stars[w] || [0, 0, 0, 0, 0]).reduce((a, b) => a + b, 0);
const campTotalStars = () => { let t = 0; for (let w = 1; w <= 8; w++) t += campWorldStars(w); return t; };

function startCampaign(world, stage = 1) {
  world = clamp(Math.round(world), 1, 8);
  stage = clamp(Math.round(stage), 1, 5);
  if (world > campSave.unlocked) return false;
  closePanels();
  if (battle.active) closeBattle();
  startGame();
  run.campaign = true;
  campaign.world = run.world = world;
  campaign.stage = run.cstage = stage;
  campaign.stageLost = 0;
  campaign.bestCombo = 0;
  state.level = (world - 1) * 5 + stage;
  state.speed = levelSpeed(state.level);
  setTheme(THEMES[CAMPAIGN[world - 1].theme]);
  clearEffects();
  buildLevel(state.level);
  startDirectorChallenge(state.level);
  serveBall();
  if (state.boss) callout("⚠ " + tr(state.boss.name) + " ⚠", "#ff4d6d");
  else callout(tr(CAMPAIGN[world - 1].name), T().accent);
  renderCampaignUI();
  return true;
}

// Bölüm temizlendi: yıldızları hesapla, kaydet ve duyur (levelCleared çağırır)
function campaignStars() {
  const w = campaign.world, s = campaign.stage;
  const stars = 1 + (campaign.stageLost === 0 ? 1 : 0) + (campaign.bestCombo >= 8 ? 1 : 0);
  const row = campSave.stars[w] || (campSave.stars[w] = [0, 0, 0, 0, 0]);
  const gain = Math.max(0, stars - row[s - 1]);
  if (gain > 0) { row[s - 1] = stars; saveCampaign(); }
  if (stars >= 2) callout("★".repeat(stars) + "☆".repeat(3 - stars), "#ffd60a");
  return stars;
}

// Bölüm geçişi (nextLevel kampanyadayken buraya gelir)
function advanceCampaign() {
  if (campaign.stage >= 5) {                       // dünya tamam
    if (campaign.world >= 8) { campaignFinish(); return; }
    if (campSave.unlocked > campaign.world) {      // bu dünya yeniden oynanıyordu: tur bitti
      campaignFinish(false);
      return;
    }
    campSave.unlocked = campaign.world + 1;
    saveCampaign();
    campaign.world++;
    campaign.stage = 1;
    callout(tr("DÜNYA {n} TAMAM!", { n: campaign.world - 1 }), "#ffd60a");
  } else campaign.stage++;
  campaign.stageLost = 0;
  campaign.bestCombo = 0;
  run.world = campaign.world;
  run.cstage = campaign.stage;
  state.level = (campaign.world - 1) * 5 + campaign.stage;
  state.speed = levelSpeed(state.level);
  clearEffects();
  if (campaign.stage === 1) setTheme(THEMES[CAMPAIGN[campaign.world - 1].theme]);   // yeni dünya, yeni tema
  buildLevel(state.level);
  startDirectorChallenge(state.level);
  serveBall();
  if (state.boss) { callout("⚠ " + tr(state.boss.name) + " ⚠", "#ff4d6d"); sfx("bossRoar"); }
  else if (pxWall.active) {
    const pxLabel = { mikro: tr("🔹 MİKRO DUVAR"), koridor: tr("⚽ CR7 KORİDORU"), mozaik: tr("🧩 MOZAİK DUVAR"), adalar: tr("💠 ADALAR DUVARI") }[pxWall.mode];
    if (pxLabel) callout(pxLabel, "#4cc9f0");
  }
  else callout(tr("BÖLÜM {n}", { n: state.level }), T().accent);
}

// Tur bitti (final: true) ya da yeniden oynanan dünya tamamlandı
function campaignFinish(final = true) {
  if (final) {
    campSave.done = true;
    saveCampaign();
    callout(tr("🌍 TUR TAMAMLANDI!"), "#ffd60a");
    spawnConfetti(W / 2, H / 2 - 60, 80);
    checkAchievements();
  }
  state.score += 2500;                            // tur ödülü
  gameOver();
}


// --- Kampanya paneli: 8 dünya kartı, bölüm düğmeleri yıldız gösterir ---
const campaignPanel = $("campaignpanel"), campaignWorlds = $("campaign-worlds");
setupPanel(campaignPanel, tr("🗺️ Kampanya"));
function renderCampaignUI() {
  if (!campaignWorlds || campaignPanel.hidden) return;
  campaignWorlds.replaceChildren(...CAMPAIGN.map((w, wi) => {
    const n = wi + 1, locked = n > campSave.unlocked;
    return el("div", { className: "camp-world" + (locked ? " locked" : ""), style: { "--c": THEMES[w.theme].accent } },
      el("strong", { textContent: (locked ? "🔒 " : "") + tr(w.name) + " · " + "★".repeat(campWorldStars(n)) }),
      el("div", { className: "camp-levels" }, ...w.levels.map((lv, li) => {
        const st = li + 1, stars = campStars(n, st), boss = !!lv.boss, px = !!lv.pixel;
        return el("button", {
          textContent: (boss ? "☠ " : px ? "🌀 " : "") + n + "-" + st + (stars ? " " + "★".repeat(stars) : ""),
          title: locked ? tr("Önce {n}. dünyayı bitir", { n: n - 1 }) : tr("Bölüm {n}", { n: (n - 1) * 5 + st }),
          disabled: locked,
          onclick: () => startCampaign(n, st),
        });
      })));
  }));
}
onClick("campaign-open", () => togglePanel(campaignPanel, renderCampaignUI));
