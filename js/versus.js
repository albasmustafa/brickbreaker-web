// ======================================================================
// 16. REKABET: botlarla ve arkadaşlarla kapışma (WebRTC, sunucusuz), dereceli maç, liderlik tablosu
//     Kapışmada tuğla kırdıkça saldırı enerjisi dolar; dolunca rakibe lanet gider.
// ======================================================================
const BOT_SKILL = {   // rate: saniyede kırılan tuğla · loss: saniyede can kaybı ihtimali · reset: combo sıfırlanma sıklığı (raket vuruşu gibi) · elo: dereceli puanı
  caylak: { label: tr("Çaylak"), rate: 0.5, loss: 0.02, reset: 0.6, elo: 900 },
  usta:   { label: "Usta", rate: 0.75, loss: 0.011, reset: 0.5, elo: 1250 },
  efsane: { label: tr("Efsane"), rate: 1.05, loss: 0.0055, reset: 0.4, elo: 1600 },
};
// Dereceli botların gücü puanlarından türetilir: seviyeler arası doğrusal, uçlarda sabit
const BOT_CURVE = [[700, 0.4, 0.026, 0.65], ...Object.values(BOT_SKILL).map(s => [s.elo, s.rate, s.loss, s.reset]), [2000, 1.3, 0.0035, 0.33]];
function botStats(lp) {
  let i = BOT_CURVE.findIndex(a => a[0] > lp);
  i = Math.max(1, i < 0 ? BOT_CURVE.length - 1 : i);
  const a = BOT_CURVE[i - 1], b = BOT_CURVE[i], f = clamp((lp - a[0]) / (b[0] - a[0]), 0, 1), mix = j => a[j] + (b[j] - a[j]) * f;
  return { rate: mix(1), loss: mix(2), reset: mix(3) };
}
const RANKED = { dur: 180, spread: [-110, 0, 110] };   // dereceli maç: 3 bot (biri biraz zayıf, biri denk, biri biraz güçlü), 3 dk
const BOT_NAMES = ["Robo Ayşe", "Bot Mehmet", "Tuğlacı Kemal", "Piksel Zeynep", "Mekanik Ali", "Siber Elif",
  "Demir Can", "Nöron Deniz", "Turbo Emre", "Kuantum Selin", "Volt Burak", "Çip Ece"];
const PLAYER_COLORS = ["#4cc9f0", "#f72585", "#ffd166", "#06d6a0", "#ff9f1c", "#b388eb", "#ef476f", "#90be6d"];
const ATTACK_COST = 10;         // bu kadar enerji = bir saldırı
const ATTACK_DEBUFF = 8;        // botlara saldırı etkisi (sn)
const MAX_GUESTS = 3;           // oda sahibiyle birlikte en çok 4 insan
const RTC_CFG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };   // yalnızca bağlantı kurarken adres öğrenmek için
// Rekabet paneli seçenekleri (ayarlar paneliyle aynı satır üreticisi)
const VS_ROWS = [
  { key: "bots", label: tr("Bot sayısı"), def: 3, opts: "1|2|3|5|7" },
  { key: "skill", label: tr("Bot seviyesi"), def: "usta", opts: "caylak:Çaylak|usta:Usta|efsane:Efsane|karisik:Karışık" },
  { key: "dur", label: tr("Süre"), def: 180, opts: "120:2 dk|180:3 dk|300:5 dk" },
  { key: "target", label: tr("Saldırı hedefi"), def: "lider", opts: "lider:Lider|rastgele:Rastgele|son:Son sıradaki" },
  { note: tr("Herkes 3 canla aynı anda başlar. Tuğla kırdıkça saldırı enerjin dolar (combo ×2, bölüm +6, boss +12, ÇILGIN MOD +5); dolunca seçtiğin hedefe bir lanet gider. KALKAN gelen saldırıyı engeller. Süre bitince en yüksek skor, ya da son ayakta kalan kazanır.") },
];
const VS_NET_ROWS = [
  { key: "netBots", label: tr("Ek bot"), def: 0, opts: "0:Yok|1|2|3" },
  { key: "ranked", label: tr("Dereceli"), def: true, opts: "true:Açık (herkesin puanı değişir)|false:Kapalı" },
];
const vsCfg = { name: tr("Oyuncu") };
{
  const saved = store.get("bb_versus", {}) || {};
  if (typeof saved.name === "string") vsCfg.name = saved.name.slice(0, 16) || tr("Oyuncu");
  for (const row of [...VS_ROWS, ...VS_NET_ROWS]) if (row.key) {
    row.opts = parseOpts(row.opts);
    vsCfg[row.key] = row.opts.some(o => o[0] === saved[row.key]) ? saved[row.key] : row.def;
  }
}
const saveVs = () => store.set("bb_versus", vsCfg);

const battle = { active: false, online: false, ranked: false, over: false, players: [], clock: 0, duration: 180, countdown: 0,
                 charge: 0, results: null, feed: [], syncAt: 0, uiAt: 0, myPlace: 0, rated: null };
const net = { role: null, myId: "me", peers: new Map(), slots: [], hostLink: null, nextGuest: 1, slotSeq: 1, lobby: [] };
const pById = id => battle.players.find(p => p.id === id);
const meP = () => pById(net.myId);
const fmtTime = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
// Bölümdeki kırılabilir tuğla sayısı (boss bölümü ≈ 30)
const levelBricks = n => { const d = LEVELS[(n - 1) % LEVELS.length]; return Array.isArray(d) ? d.join("").replace(/[.X> ]/g, "").length : 30; };
// lp: dereceli puanı (verilmezse bot seviyesinden, insan için başlangıç puanı)
const makePlayer = (id, name, color, kind, skill, lp) => ({ id, name: String(name).slice(0, 16), color, kind, skill: skill || null, score: 0, level: 1,
  lives: 3, alive: true, left: levelBricks(1), combo: 0, charge: 0, debuffUntil: 0, elimAt: 0, hitAt: 0,
  lp: Number.isFinite(lp) ? clamp(Math.round(lp), 0, 5000) : kind === "bot" ? (BOT_SKILL[skill] || BOT_SKILL.usta).elo : START_LP });
const shuffledNames = () => BOT_NAMES.slice().sort(() => Math.random() - 0.5);

// --- Maç akışı ---
function startBattle(players, online, dur, ranked) {
  Object.assign(battle, { active: true, online, ranked: !!ranked, over: false, results: null, players, clock: 0, duration: dur, countdown: 3.5, charge: 0, feed: [], myPlace: 0, rated: null });
  closePanels();
  startGame();
  Object.assign(state, { diffSpeed: 1, lives: 3, curseAt: Infinity });   // adil başlangıç: normal hız, 3 can
  state.speed = levelSpeed(1);
  oppPanel.hidden = false;
  careerBattleStart();
  callout(battle.ranked ? tr("🏅 DERECELİ!") : tr("⚔ KAPIŞMA!"), "#ff4d6d");
  renderOpponents();
}
function startBotBattle() {
  closeBattle();
  net.myId = "me";
  const names = shuffledNames(), skills = Object.keys(BOT_SKILL);
  const players = [makePlayer("me", vsCfg.name, PLAYER_COLORS[0], "me", null, career.lp)];
  for (let i = 0; i < vsCfg.bots; i++) {
    players.push(makePlayer("b" + (i + 1), names[i], PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length], "bot", vsCfg.skill === "karisik" ? pick(skills) : vsCfg.skill));
  }
  startBattle(players, false, vsCfg.dur);
}
// Dereceli maç: rakip botların puanı seninkine yakın, güçleri puanlarından gelir; kazandıkça rakipler zorlaşır
function startRankedBattle() {
  closeBattle();
  net.myId = "me";
  const names = shuffledNames(), players = [makePlayer("me", vsCfg.name, PLAYER_COLORS[0], "me", null, career.lp)];
  RANKED.spread.forEach((off, i) => {
    const p = makePlayer("b" + (i + 1), names[i], PLAYER_COLORS[i + 1], "bot", null, career.lp + off + rnd(-40, 40));
    players.push(Object.assign(p, { sk: botStats(p.lp) }));
  });
  startBattle(players, false, RANKED.dur, true);
}
// Kapışmadan çık (sonuç ekranından menüye dönerken ya da yeni maç öncesi); bitmemiş dereceli maç son sıra sayılır
function closeBattle() {
  if (battle.active && !battle.over) careerAbandon();
  Object.assign(battle, { active: false, over: false, players: [], results: null });
  oppPanel.hidden = true;
}
// Sıralama: ayakta olanlar skora göre, elenenler elenme sırasına göre (geç elenen önde)
const ranking = () => battle.players.slice().sort((a, b) => (b.alive - a.alive) || (a.alive ? b.score - a.score : (b.elimAt - a.elimAt) || (b.score - a.score)));
function checkBattleEnd() {
  if (battle.over || battle.countdown > 0) return;
  const alive = battle.players.filter(p => p.alive).length;
  if (battle.clock >= battle.duration || alive === 0 || (battle.players.length > 1 && alive <= 1)) endBattle();
}
function endBattle(remoteList) {
  if (battle.over) return;
  battle.over = true;
  const list = remoteList || ranking().map(({ id, name, color, score, alive, kind }) => ({ id, name, color, score, alive, kind }));
  if (!remoteList && net.role === "host") netBroadcast({ t: "end", list });
  battle.results = list;
  battle.myPlace = list.findIndex(p => p.id === net.myId) + 1;
  state.lbRank = recordScore("kapisma", { score: state.score, level: state.level, place: battle.myPlace, of: list.length });
  careerBattleEnd(list);
  if (state.mode !== "gameover") { state.mode = "gameover"; state.newRecord = state.score > state.startHigh && state.score > 0; }
  clearEffects();               // lanetler sonuç ekranını bozmasın
  if (battle.myPlace === 1) { sfx("level"); callout(tr("🏆 KAZANDIN!"), "#ffd166"); }
  renderOpponents();
}
// Kendi canların bitti
function battleEliminated() {
  const me = meP();
  if (!me || !me.alive) return;
  Object.assign(me, { alive: false, elimAt: battle.clock, score: state.score, lives: 0 });
  if (net.role === "guest" && battle.online) return netSend({ t: "out", id: me.id, score: me.score });
  pushFeed("{name} elendi", { name: me.name });
  battle.online ? checkBattleEnd() : endBattle();
}
function eliminate(p) {
  Object.assign(p, { alive: false, lives: 0, elimAt: battle.clock });
  pushFeed("{name} elendi ☠", { name: p.name });
}
// Akış: yalnızca oda sahibi / yerel oyun üretir, çevrim içi misafirlere yayınlanır.
// Olay anahtar + değerler olarak saklanır ve gönderilir: her oyuncu kendi dilinde okur.
[N_("{name} elendi"), N_("{name} elendi ☠"), N_("{from} ⚔ {to}"), N_("{name} bağlantısı koptu")];
function pushFeed(k, p, fromNet) {
  if (net.role === "guest" && battle.online && !fromNet) return;
  battle.feed.unshift({ k, p });
  if (battle.feed.length > 6) battle.feed.pop();
  if (net.role === "host" && battle.online) netBroadcast({ t: "ev", k, p });
}
const feedText = f => (typeof f === "string" ? f : tr(f.k, f.p));
// Bot: fiziksiz ama inandırıcı istatistiksel oyun — tuğla kırar, combo yapar, bölüm atlar, can kaybeder, saldırır
function simBot(p, dt) {
  if (!p.alive) return;
  const sk = p.sk || BOT_SKILL[p.skill] || BOT_SKILL.usta, cursed = p.debuffUntil > battle.clock;
  if (Math.random() < sk.rate * (cursed ? 0.5 : 1) * (1 + (p.level - 1) * 0.04) * dt) {
    p.combo++;
    p.score += 16 * Math.min(p.combo, 8);
    p.left--;
    p.charge += p.combo >= 5 ? 2 : 1;
  }
  if (Math.random() < sk.reset * dt) p.combo = 0;
  if (p.left <= 0) { p.level++; p.score += 500; p.left = levelBricks(p.level); p.charge += 6; }
  if (Math.random() < sk.loss * (cursed ? 2.5 : 1) * dt) { p.combo = 0; if (--p.lives <= 0) eliminate(p); }
  if (p.alive && p.charge >= ATTACK_COST) {
    p.charge -= ATTACK_COST;
    const t = pickTarget(p.id, Math.random() < 0.5 ? "lider" : "rastgele");
    if (t) sendAttack(p.id, t.id);
  }
}
function pickTarget(fromId, mode) {
  const c = battle.players.filter(p => p.alive && p.id !== fromId);
  if (!c.length) return null;
  if (mode === "rastgele") return pick(c);
  c.sort((a, b) => b.score - a.score);
  return mode === "son" ? c[c.length - 1] : c[0];
}
// Oyuncunun saldırı enerjisi: tuğla, combo, bölüm, boss, ÇILGIN MOD doldurur; dolunca otomatik saldırı
function battleCharge(n) {
  const me = battle.active && !battle.over && battle.countdown <= 0 && meP();
  if (!me || !me.alive) return;
  battle.charge += n;
  while (battle.charge >= ATTACK_COST) {
    battle.charge -= ATTACK_COST;
    const t = pickTarget(net.myId, vsCfg.target);
    if (!t) break;
    sendAttack(net.myId, t.id);
    addFloater(W / 2, H - 125, tr("⚔ SALDIRI → {name}", { name: t.name }), "#ff4d6d");
    sfx("attack");
    track("attacks");
  }
}
const sendAttack = (fromId, toId) => (net.role === "guest" && battle.online ? netSend({ t: "atk", from: fromId, to: toId }) : deliverAttack(fromId, toId));
function deliverAttack(fromId, toId) {
  const from = pById(fromId), to = pById(toId);
  if (!from || !to || !to.alive || battle.over) return;
  to.hitAt = performance.now();
  pushFeed("{from} ⚔ {to}", { from: from.name, to: to.name });
  if (toId === net.myId) receiveAttack(from.name);
  else if (to.kind === "bot") { to.debuffUntil = battle.clock + ATTACK_DEBUFF; to.combo = 0; }
  else if (net.role === "host" && net.peers.has(toId)) chanSend(net.peers.get(toId), { t: "atk", from: fromId, to: toId });
}
// Gelen saldırı: kalkan varsa engellenir, yoksa bir lanet olarak gelir
function receiveAttack(fromName) {
  const me = meP();
  if (!me || !me.alive || battle.over) return;
  me.hitAt = performance.now();
  if (state.shield > 0) {
    state.shield--;
    sfx("shield");
    track("blocked");
    return addFloater(W / 2, H - 140, tr("🛡 SALDIRI ENGELLENDİ ({name})", { name: fromName }), POWERS.K.color);
  }
  if (activeCurses().length >= 3) return addFloater(W / 2, H - 140, tr("{name} saldırısı boşa gitti", { name: fromName }), T().dim);
  const id = pickCurse();
  if (!id) return;
  state.pendingCurse ? startCurse(id) : warnCurse(id);
  callout("⚔ " + fromName + ": " + CURSES[id].label, "#ff4d6d");
}
// Her karede: geri sayım, maç saati, botlar, bitiş kontrolü, ağ eşitlemesi, rakip paneli
function updateBattle(dt) {
  if (!battle.active) return;
  const me = meP(), now = performance.now();
  if (me && me.alive) Object.assign(me, { score: state.score, level: state.level, lives: state.lives, charge: battle.charge,
                                          left: bricks.filter(b => !b.dead && !b.unbreakable).length });
  if (!battle.over && state.mode !== "paused") {
    if (battle.countdown > 0) {
      const before = Math.ceil(battle.countdown);
      if ((battle.countdown -= dt) <= 0) {
        sfx("go");
        callout(tr("BAŞLA!"), "#06d6a0");
        if (state.mode === "serve") launchBall();
      } else if (Math.ceil(battle.countdown) !== before && before <= 3) sfx("countdown");
    } else {
      battle.clock += dt;
      if (net.role !== "guest") { for (const p of battle.players) if (p.kind === "bot") simBot(p, dt); checkBattleEnd(); }
    }
  }
  if (battle.online && now >= battle.syncAt) { battle.syncAt = now + 250; netSync(); }
  if (now >= battle.uiAt) { battle.uiAt = now + 200; renderOpponents(); }
}

// --- Liderlik tablosu (bu cihazda) ---
const leaderboard = { klasik: [], kapisma: [], kalma: [], kampanya: [] };
{ const l = store.get("bb_leaderboard", null); if (l) for (const k in leaderboard) if (Array.isArray(l[k])) leaderboard[k] = l[k].slice(0, 10); }
function recordScore(mode, entry) {
  if (!entry.score) return 0;
  const row = { name: vsCfg.name, date: Date.now(), ...entry }, list = leaderboard[mode];
  list.push(row);
  list.sort((a, b) => b.score - a.score);
  list.length = Math.min(list.length, 10);
  store.set("bb_leaderboard", leaderboard);
  renderLeaderboard();
  return list.indexOf(row) + 1;
}

// --- Çevrim içi: WebRTC veri kanalı; kodlar elle paylaşılır (oda sahibi merkezde, misafirler ona bağlanır) ---
async function packCode(prefix, obj) {
  const json = JSON.stringify(obj);
  if (!window.CompressionStream) return prefix + "J" + btoa(unescape(encodeURIComponent(json)));
  const bytes = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return prefix + "Z" + btoa(bin);
}
async function unpackCode(prefix, code) {
  code = code.trim();
  if (!code.startsWith(prefix)) throw new Error(tr("kod türü yanlış"));
  const body = atob(code.slice(prefix.length + 1));
  if (code[prefix.length] !== "Z") return JSON.parse(decodeURIComponent(escape(body)));
  const stream = new Blob([Uint8Array.from(body, c => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return JSON.parse(await new Response(stream).text());
}
function waitIce(pc) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise(res => {
    const t = setTimeout(res, 3000);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
  });
}
const chanSend = (slot, m) => { if (slot.dc && slot.dc.readyState === "open") slot.dc.send(JSON.stringify(m)); };
const netSend = m => { if (net.hostLink) chanSend(net.hostLink, m); };
const netBroadcast = (m, exceptId) => { for (const [id, s] of net.peers) if (id !== exceptId) chanSend(s, m); };
const netStatus = msg => { netStatusEl.textContent = msg; };
function setupChannel(slot, dc) {
  slot.dc = dc;
  dc.onopen = () => {
    if (net.role !== "guest") return;
    chanSend(slot, { t: "hello", name: vsCfg.name, lp: career.lp });
    netStatus(tr("✅ Odaya bağlandın, oda sahibi başlatınca maç başlayacak."));
  };
  dc.onmessage = e => { try { handleNet(slot, JSON.parse(e.data)); } catch (err) {} };
  dc.onclose = () => onPeerClosed(slot);
}
function onPeerClosed(slot) {
  if (net.role === "host" && slot.id) {
    net.peers.delete(slot.id);
    const p = pById(slot.id);
    if (p && p.alive && battle.active && !battle.over) { eliminate(p); pushFeed("{name} bağlantısı koptu", { name: p.name }); checkBattleEnd(); }
    netStatus(tr("⚠️ {name} ayrıldı.", { name: slot.name || tr("Bir oyuncu") }));
    broadcastLobby();
  } else if (net.role === "guest") {
    netStatus(tr("⚠️ Oda sahibiyle bağlantı koptu."));
    if (battle.active && !battle.over) { careerVoidMatch(); endBattle(); }
  }
}
async function hostInvite() {
  if (net.peers.size >= MAX_GUESTS) throw new Error(tr("oda dolu (en çok 4 oyuncu)"));
  const pc = new RTCPeerConnection(RTC_CFG), slot = { pc, dc: null, id: null, name: null, token: net.slotSeq++ };
  net.slots.push(slot);
  setupChannel(slot, pc.createDataChannel("bb"));
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc);
  return packCode("BBO1:", { sdp: pc.localDescription.sdp, slot: slot.token });
}
async function hostAcceptAnswer(code) {
  const { sdp, slot } = await unpackCode("BBA1:", code), s = net.slots.find(x => x.token === slot);
  if (!s) throw new Error(tr("bu cevap koduna ait davet yok"));
  if (s.pc.remoteDescription) throw new Error(tr("bu davet zaten kullanıldı"));
  await s.pc.setRemoteDescription({ type: "answer", sdp });
}
async function guestJoin(code) {
  const { sdp, slot } = await unpackCode("BBO1:", code);
  if (net.hostLink) net.hostLink.pc.close();
  const pc = new RTCPeerConnection(RTC_CFG), link = (net.hostLink = { pc, dc: null, id: "h" });
  pc.ondatachannel = e => setupChannel(link, e.channel);
  await pc.setRemoteDescription({ type: "offer", sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(pc);
  return packCode("BBA1:", { sdp: pc.localDescription.sdp, slot });
}
function netLeave() {
  for (const pc of [...net.slots.map(s => s.pc), net.hostLink && net.hostLink.pc]) try { if (pc) pc.close(); } catch (e) {}
  Object.assign(net, { role: null, myId: "me", slots: [], hostLink: null, lobby: [], nextGuest: 1 });
  net.peers.clear();
  if (battle.active && battle.online) closeBattle();
}
const lobbyPlayers = () => [{ id: "h", name: vsCfg.name, kind: "human", lp: career.lp }, ...[...net.peers].map(([id, s]) => ({ id, name: s.name, kind: "human", lp: s.lp }))];
function broadcastLobby() {
  net.lobby = lobbyPlayers();
  netBroadcast({ t: "roster", players: net.lobby });
  renderLobby();
}
function startNetBattle() {
  if (net.role !== "host") return;
  if (!net.peers.size) return netStatus(tr("⚠️ Önce en az bir arkadaşın bağlanmalı."));
  const roster = lobbyPlayers().map((p, i) => ({ ...p, color: PLAYER_COLORS[i % PLAYER_COLORS.length] })), names = shuffledNames();
  for (let i = 0; i < vsCfg.netBots; i++) {
    const skill = vsCfg.skill === "karisik" ? "usta" : vsCfg.skill;
    roster.push({ id: "b" + (i + 1), name: names[i], kind: "bot", skill, lp: BOT_SKILL[skill].elo, color: PLAYER_COLORS[roster.length % PLAYER_COLORS.length] });
  }
  netBroadcast({ t: "start", players: roster, dur: vsCfg.dur, ranked: vsCfg.ranked });
  beginNetBattle(roster, vsCfg.dur, vsCfg.ranked);
}
function beginNetBattle(roster, dur, ranked) {
  closeBattle();
  startBattle(roster.map(r => makePlayer(r.id, r.name, r.color, r.id === net.myId ? "me" : r.kind === "bot" ? "bot" : "human", r.skill, r.lp)), true, dur, ranked);
}
// Skor eşitlemesi: misafir kendi durumunu yollar, oda sahibi herkesinkini (botlar dahil) yayınlar
function netSync() {
  const me = meP();
  if (net.role === "guest" && me) netSend({ t: "st", id: me.id, score: me.score, level: me.level, lives: me.lives, alive: me.alive, left: me.left });
  if (net.role === "host") {
    netBroadcast({ t: "sts", clock: battle.clock, list: battle.players.map(({ id, score, level, lives, alive, left, elimAt, debuffUntil }) => ({ id, score, level, lives, alive, left, elimAt, debuffUntil })) });
  }
}
function handleNet(slot, m) {
  const num = v => (Number.isFinite(+v) ? +v : 0);
  if (net.role === "host") {
    if (m.t === "hello" && !slot.id) {
      if (net.peers.size >= MAX_GUESTS) return slot.pc.close();
      slot.id = "g" + net.nextGuest++;
      slot.name = String(m.name || tr("Misafir")).slice(0, 16);
      slot.lp = m.lp == null ? START_LP : clamp(num(m.lp), 0, 5000);
      net.peers.set(slot.id, slot);
      chanSend(slot, { t: "welcome", id: slot.id });
      netStatus(tr("✅ {name} bağlandı.", { name: slot.name }));
      broadcastLobby();
    } else if (m.t === "st" && slot.id === m.id) {
      const p = pById(m.id);
      if (p && p.alive) Object.assign(p, { score: num(m.score), level: num(m.level), lives: num(m.lives), left: num(m.left) });
    } else if (m.t === "atk" && slot.id === m.from) deliverAttack(m.from, m.to);
    else if (m.t === "out" && slot.id === m.id) {
      const p = pById(m.id);
      if (p && p.alive) { p.score = num(m.score); eliminate(p); checkBattleEnd(); }
    }
  } else if (net.role === "guest") {
    if (m.t === "welcome") net.myId = m.id;
    else if (m.t === "roster") { net.lobby = (m.players || []).map(p => ({ ...p, name: String(p.name).slice(0, 16) })); renderLobby(); }
    else if (m.t === "start") beginNetBattle(m.players || [], num(m.dur) || 180, !!m.ranked);
    else if (m.t === "sts" && battle.active) {
      for (const r of m.list || []) {
        const p = r.id !== net.myId && pById(r.id);
        if (p) Object.assign(p, { score: num(r.score), level: num(r.level), lives: num(r.lives), alive: !!r.alive, left: num(r.left), elimAt: num(r.elimAt), debuffUntil: num(r.debuffUntil) });
      }
      if (!battle.over && battle.countdown <= 0) battle.clock = Math.max(battle.clock, num(m.clock));
    } else if (m.t === "atk" && m.to === net.myId) { const f = pById(m.from); receiveAttack(f ? f.name : tr("Rakip")); }
    else if (m.t === "ev") {   // olay: anahtar + değerler (eski sürüm düz metin gönderir)
      const p = {};
      if (m.p && typeof m.p === "object") for (const k in m.p) p[k] = String(m.p[k]).slice(0, 30);
      if (typeof m.k === "string") pushFeed(m.k.slice(0, 80), p, true); else pushFeed(String(m.text).slice(0, 60), null, true);
    }
    else if (m.t === "end") endBattle(m.list || []);
  }
}

// --- Rakip paneli (oyun sırasında, tuvalin yanında) ---
const oppPanel = $("opponents");
function renderOpponents() {
  if (!battle.active) return;
  const now = performance.now(), span = (className, textContent) => el("span", { className, textContent });
  const head = el("div", { className: "opp-head" },
    span("", battle.countdown > 0 ? tr("⚔ Hazır ol…") : battle.over ? tr("⚔ Bitti") : "⚔ " + fmtTime(Math.max(0, battle.duration - battle.clock))),
    el("span", { textContent: (battle.ranked ? "🏅" : "") + (battle.online ? "🌐" : "🤖"), title: battle.online ? (battle.ranked ? tr("dereceli çevrim içi maç") : tr("çevrim içi maç")) : battle.ranked ? tr("dereceli botlarla maç") : tr("botlarla maç") }));
  const order = battle.over && battle.results ? battle.results.map(r => pById(r.id) || r) : ranking();
  const cards = order.map((p, i) => {
    const tag = battle.ranked ? tierTag(lpOf(p)) : p.kind === "bot" ? (BOT_SKILL[p.skill] || {}).label || "Bot" : p.kind === "human" ? tr("insan") : tr("sen");
    return el("div", { className: "opp" + (p.id === net.myId ? " me" : "") + (p.alive ? "" : " dead") + (now - (p.hitAt || 0) < 450 ? " hit" : ""), "--c": p.color },
      el("div", { className: "opp-top" }, span("opp-rank", "#" + (i + 1)), span("opp-name", p.name + (p.id === net.myId ? " " + tr("(sen)") : ""))),
      el("div", { className: "opp-mid" }, span("opp-score", p.score), span("opp-lives", p.alive ? "♥".repeat(clamp(p.lives, 0, 9)) : "☠")),
      el("div", { className: "opp-sub", textContent: tr("Bölüm {n}", { n: p.level }) + " · " + tag + (p.debuffUntil > battle.clock && p.alive ? " · " + tr("⚠ lanetli") : "") }),
      el("div", { className: "opp-bar" }, el("span", { style: { width: Math.round(100 * clamp(1 - (p.left || 0) / levelBricks(p.level || 1), 0, 1)) + "%" } })));
  });
  const feed = battle.feed.length ? [el("div", { className: "opp-feed" }, ...battle.feed.map(f => el("div", { textContent: feedText(f) })))] : [];
  oppPanel.replaceChildren(head, ...cards, ...feed);
}

// --- Rekabet paneli ---
const versusPanel = $("versuspanel"), vsName = $("vs-name"), netStatusEl = $("net-status"), lbTable = $("lb-table");
let lbMode = "klasik";
setupPanel(versusPanel, tr("⚔ Rekabet"));
buildRows($("vs-rows"), VS_ROWS, vsCfg, saveVs);
buildRows($("vs-netrows"), VS_NET_ROWS, vsCfg, saveVs);
const versusBtn = el("button", { textContent: tr("⚔ Rekabet"), title: tr("Dereceli maç, botlarla ya da arkadaşlarla kapış, liderlik tablosu"), onclick: () => togglePanel(versusPanel, refreshVersusUI) });
toolbar.insertBefore(versusBtn, careerBtn);
function refreshVersusUI() {
  vsName.value = vsCfg.name;
  refreshRows(versusPanel, vsCfg);
  for (const b of versusPanel.querySelectorAll("[data-lb]")) b.classList.toggle("active", b.dataset.lb === lbMode);
  $("net-hostbox").hidden = net.role !== "host";
  $("net-joinbox").hidden = net.role !== "guest";
  renderRankCards();
  renderLobby();
  renderLeaderboard();
}
const renderLobby = () => $("net-players").replaceChildren(...(net.role === "host" ? lobbyPlayers() : net.lobby).map(p =>
  el("span", { className: "netp", textContent: (p.id === "h" ? "🏠 " : "👤 ") + p.name + (p.id === net.myId ? " " + tr("(sen)") : "") + (Number.isFinite(p.lp) ? " · " + tierTag(p.lp) : "") })));
function renderLeaderboard() {
  const row = (tag, cells) => el("tr", {}, ...cells.map(c => el(tag, { textContent: c })));
  const kap = lbMode === "kapisma", rows = leaderboard[lbMode].map((r, i) => {
    const d = new Date(r.date);
    return row("td", [i + 1, r.name, r.score, r.level, kap ? r.place + "/" + r.of : "", d.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit" })]);
  });
  if (!rows.length) rows.push(el("tr", {}, el("td", { colSpan: 6, textContent: tr("Henüz skor yok — bir oyun bitir!") })));
  lbTable.replaceChildren(row("th", ["#", tr("Oyuncu"), tr("Skor"), tr("Bölüm"), kap ? tr("Sıra") : "", tr("Tarih")]), ...rows);
}
vsName.addEventListener("input", () => { vsCfg.name = vsName.value.trim().slice(0, 16) || tr("Oyuncu"); saveVs(); });
for (const b of versusPanel.querySelectorAll("[data-lb]")) b.addEventListener("click", () => { lbMode = b.dataset.lb; refreshVersusUI(); });
onClick("vs-start", startBotBattle);
onClick("rank-start", startRankedBattle);
onClick("rank-career", () => togglePanel(careerPanel, renderCareer));
const setRole = (role, msg) => { netLeave(); net.role = role; if (role === "host") net.myId = "h"; netStatus(msg); refreshVersusUI(); };
onClick("net-host", () => setRole("host", tr("🏠 Oda kuruldu. \"Davet kodu oluştur\"a bas, kodu arkadaşına gönder.")));
onClick("net-join", () => setRole("guest", tr("🔗 Arkadaşının davet kodunu yapıştır, cevap kodunu ona geri gönder.")));
onClick("net-leave", () => setRole(null, tr("Odadan ayrıldın.")));
// Kodu üret, kutuya yaz, panoya kopyalamayı dene
async function makeCode(boxId, producer, okMsg, manualMsg, errMsg) {
  netStatus(tr("⏳ Kod hazırlanıyor…"));
  try {
    const box = $(boxId);
    box.value = await producer();
    box.select();
    netStatus(manualMsg);
    if (navigator.clipboard) navigator.clipboard.writeText(box.value).then(() => netStatus(okMsg), () => {});
  } catch (err) { netStatus("⚠️ " + errMsg + ": " + err.message); }
}
onClick("net-invite", () => makeCode("net-offer", hostInvite, tr("📋 Davet kodu panoya kopyalandı — arkadaşına gönder, cevap kodunu aşağı yapıştır."),
  tr("Davet kodunu kopyalayıp arkadaşına gönder, gelen cevap kodunu aşağı yapıştır."), tr("Davet oluşturulamadı")));
onClick("net-mkanswer", () => makeCode("net-answercode", () => guestJoin($("net-invcode").value), tr("📋 Cevap kodu panoya kopyalandı — oda sahibine gönder."),
  tr("Cevap kodunu kopyalayıp oda sahibine gönder."), tr("Davet kodu geçersiz")));
onClick("net-accept", async () => {
  try {
    await hostAcceptAnswer($("net-answer").value);
    $("net-answer").value = "";
    netStatus(tr("⏳ Bağlanılıyor…"));
  } catch (err) { netStatus(tr("⚠️ Cevap kodu geçersiz: {err}", { err: err.message })); }
});
onClick("net-start", startNetBattle);
onClick("lb-clear", e => {
  const b = e.currentTarget;
  if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = tr("Emin misin? Tekrar tıkla"); return; }
  leaderboard[lbMode] = [];
  store.set("bb_leaderboard", leaderboard);
  b.dataset.armed = "";
  b.textContent = tr("Bu tabloyu temizle");
  renderLeaderboard();
});
refreshVersusUI();

// --- Tuval: kapışma HUD'u, geri sayım, sonuç / izleyici kartı ---
function drawBattleHUD() {
  if (!battle.active) return;
  const me = meP(), left = Math.max(0, battle.duration - battle.clock);
  text("⚔ " + fmtTime(left) + "   #" + (me ? ranking().indexOf(me) + 1 : 0) + "/" + battle.players.length, W - 20, 50,
       "bold 12px monospace", left < 20 && !battle.over ? "#ff4d6d" : T().text, "right");
  fillRR(W - 140, 56, 120, 6, 3, "rgba(0,0,0,0.4)");                                   // saldırı enerjisi
  fillRR(W - 140, 56, 120 * clamp(battle.charge / ATTACK_COST, 0, 1), 6, 3, "#ff4d6d");
}
function drawCountdown() {
  const n = Math.ceil(battle.countdown), f = battle.countdown - Math.floor(battle.countdown);
  if (n > 3) return;
  ctx.save();
  ctx.translate(W / 2, H / 2 + 20);
  ctx.scale(1 + f * 0.6, 1 + f * 0.6);
  ctx.globalAlpha = 0.4 + 0.6 * f;
  titleText(String(n), 0, 0, 110, "#ff4d6d", "#ffd166");
  ctx.restore();
  ctx.textAlign = "center";
  outlinedText(tr("rakiplerin hazır…"), W / 2, H / 2 + 90, "bold 16px monospace", T().text);
}
function drawBattleResults() {
  overlay(0.45);
  const list = battle.over && battle.results ? battle.results : ranking(), rows = Math.min(list.length, 8), rated = battle.over && battle.rated;
  const off = rated ? 22 : 0, h = 170 + off + rows * 26, top = H / 2 - h / 2;
  drawCard(W / 2, H / 2, 500, h);
  titleText(!battle.over ? tr("ELENDİN") : battle.myPlace === 1 ? tr("🏆 KAZANDIN!") : tr("{n}. OLDUN", { n: battle.myPlace }), W / 2, top + 52, 38, battle.myPlace === 1 ? "#ffd166" : T().ex, "#ff4d6d", 440);
  text(battle.over ? tr("Skorun: {n}", { n: state.score }) + (state.lbRank ? "  ·  " + tr("liderlik #{n}", { n: state.lbRank }) : "") : tr("Maç sürüyor… izliyorsun"), W / 2, top + 80, "14px monospace", T().dim, "center", 440);
  if (rated) {
    const t = tierOf(rated.lp);
    text(t.icon + " " + tr(t.name) + " · " + rated.lp + " LP  (" + fmtDelta(rated.delta) + ")", W / 2, top + 102, "bold 15px monospace", rated.delta >= 0 ? "#06d6a0" : "#ff4d6d");
  }
  for (let i = 0; i < rows; i++) {
    const p = list[i], y = top + 112 + off + i * 26;
    if (p.id === net.myId) fillRR(W / 2 - 220, y - 17, 440, 24, 8, hexToRgba(T().accent, 0.18));
    text("#" + (i + 1), W / 2 - 208, y, "bold 14px monospace", T().dim, "left");
    circle(W / 2 - 162, y - 5, 5, p.color);
    text(p.name + (p.alive ? "" : " ☠"), W / 2 - 148, y, "bold 14px monospace", p.alive ? T().text : T().dim, "left", 190);
    if (battle.ranked) text(tierTag(lpOf(p)), W / 2 + 130, y, "12px monospace", T().dim, "right");
    text(String(p.score), W / 2 + 208, y, "bold 14px monospace", p.alive ? T().text : T().dim, "right");
  }
  text(battle.over ? tr("menü için tıkla veya boşluk") : tr("maç bitince sonuçlar burada"), W / 2, top + h - 22, "14px monospace", T().dim, "center", 440);
}
