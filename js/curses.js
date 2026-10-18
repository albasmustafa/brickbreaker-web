// ======================================================================
// 10. LANETLER: kazanmayı zorlaştıran süreli ya da anlık engeller.
//     Her biri 1.2 sn önceden duyurulur; aktifken kırılan tuğla ×1.5 puan.
// ======================================================================
const HAZARD = {   // yoğunluk: ortalama aralık (sn), aynı anda en çok, bölüm başı bekleme
  az: { every: 26, max: 1, grace: 14 }, normal: { every: 16, max: 2, grace: 10 }, kabus: { every: 8, max: 3, grace: 5 },
};
const CURSE_WARN = 1.2;
// group: aynı gruptan aynı anda tek lanet (Kâbus hariç) — oyun oynanmaz hale gelmesin
const CURSES = {
  gorunmez: { label: "GÖRÜNMEZ RAKET",     short: "GÖRÜNMEZ", dur: 8,  group: "gorus" },
  hayalet:  { label: "HAYALET TOP",        short: "HAYALET",  dur: 7,  group: "gorus" },
  karanlik: { label: "KARANLIK",           short: "KARANLIK", dur: 9,  group: "gorus" },
  elektrik: { label: "ELEKTRİK KESİNTİSİ", short: "KESİNTİ",  dur: 8,  group: "gorus" },
  sis:      { label: "SİS",                short: "SİS",      dur: 10, group: "gorus" },
  ayna:     { label: "AYNA DÜNYA",         short: "AYNA",     dur: 8,  group: "kamera" },
  sarhos:   { label: "SARHOŞ KAMERA",      short: "SARHOŞ",   dur: 8,  group: "kamera" },
  ruzgar:   { label: "RÜZGAR",             short: "RÜZGAR",   dur: 9,  group: "fizik", start: () => (state.windDir = Math.random() < 0.5 ? -1 : 1) },
  agir:     { label: "AĞIR YERÇEKİMİ",     short: "AĞIR",     dur: 8,  group: "fizik" },
  nabiz:    { label: "NABIZ",              short: "NABIZ",    dur: 8,  group: "fizik" },
  buz:      { label: "BUZLU RAKET",        short: "BUZ",      dur: 9,  group: "raket", start: () => { paddle.iceV = 0; paddle.aimX = null; }, end: () => (paddle.iceV = 0) },
  yarik:    { label: "YARIK RAKET",        short: "YARIK",    dur: 8,  group: "raket" },
  sahte:    { label: "SAHTE TOPLAR",       short: "SAHTE",    dur: 8,  start: () => spawnDecoys(), end: () => popDecoys() },
  meteor:   { label: "METEOR YAĞMURU",     short: "METEOR",   dur: 8,  start: () => (state.meteorCd = 0) },
  daralan:  { label: "DARALAN DUVARLAR",   short: "DUVAR",    dur: 10 },
  bariyer:  { label: "GEZGİN BARİYERLER",  short: "BARİYER",  dur: 12, start: () => spawnBarriers(),
              end: () => { for (const o of obstacles) spawnParticles(o.x, o.y, "#ffd166", 10, o.w, o.h); obstacles = []; } },
  inis:     { label: "TAVAN ÇÖKÜYOR", ok: () => !state.boss && lowestBrick() + BRICK.h + BRICK.gap < 400, start: () => {
              for (const b of bricks) if (!b.dead) b.ty = (b.ty ?? b.y) + BRICK.h + BRICK.gap;   // tuğlalar bir sıra iner
              addFloater(W / 2, 200, "TUĞLALAR İNİYOR!", CURSE_COLOR);
            } },
  dirilis:  { label: "DİRİLİŞ",   ok: () => !state.boss && bricks.some(b => b.dead && !b.unbreakable), start: () => reviveBricks() },
  zirh:     { label: "ZIRHLANMA", ok: () => bricks.some(b => !b.dead && !b.unbreakable && !b.explosive && b.hp < 3), start: () => armorBricks() },
  ufo:      { label: "UFO BASKINI", ok: () => !state.ufo, start: () => spawnUfo() },
};
let obstacles = [];
const curseOn = k => (state.curses[k] || 0) > state.time;
const activeCurses = () => Object.keys(state.curses).filter(curseOn);
const curseBonus = () => (activeCurses().length ? 1.5 : 1);
const curseDur = k => CURSES[k].dur * (settings.hazards === "kabus" ? 1.25 : 1);
const lowestBrick = () => Math.max(0, ...bricks.filter(b => !b.dead).map(b => (b.ty ?? b.y) + BRICK.h));

function scheduleNextCurse(first) {
  const hz = HAZARD[settings.hazards];
  if (!hz || battle.active) { state.curseAt = Infinity; return; }   // kapışmada lanetler rakiplerden gelir
  const lvlMul = Math.max(0.55, 1 - (state.level - 1) * 0.04);       // bölüm ilerledikçe sıklaşır
  state.curseAt = state.time + (first ? hz.grace : hz.every * lvlMul * rnd(0.7, 1.3));
}
function pickCurse() {
  const active = activeCurses(), used = new Set(active.map(k => CURSES[k].group).filter(Boolean));
  const ids = Object.keys(CURSES).filter(id => {
    const c = CURSES[id];
    return !active.includes(id) && !(settings.hazards !== "kabus" && c.group && used.has(c.group)) && (!c.ok || c.ok());
  });
  return ids.length ? pick(ids) : null;
}
// Duyuru: lanet 1.2 sn sonra başlar
function warnCurse(id) {
  if (!id) return;
  state.pendingCurse = { id, at: state.time + CURSE_WARN };
  callout("⚠ " + CURSES[id].label, CURSE_COLOR);
  sfx("curseWarn");
}
function startCurse(id) {
  const c = CURSES[id];
  sfx("curse");
  addShake(3);
  if (c.dur) state.curses[id] = state.time + curseDur(id);
  else survivedCurse();          // anlık lanet: anında atlatılmış sayılır
  if (c.start) c.start();
}
const survivedCurse = () => { state.cursesSurvived++; track("curses"); };
function endCurse(id) {
  survivedCurse();
  addFloater(W / 2, H / 2 + 60, CURSES[id].label + " BİTTİ", CURSE_COLOR);
  if (CURSES[id].end) CURSES[id].end();
}
function updateCurses(dt) {
  for (const k of Object.keys(state.curses)) if (state.curses[k] <= state.time) { delete state.curses[k]; endCurse(k); }
  const pc = state.pendingCurse;
  if (pc && state.time >= pc.at) {
    state.pendingCurse = null;
    startCurse(pc.id);
  } else if (!pc && state.time >= state.curseAt) {
    const hz = HAZARD[settings.hazards];
    if (hz && activeCurses().length < hz.max) warnCurse(pickCurse());
    scheduleNextCurse(false);
  }
  if (curseOn("meteor") && (state.meteorCd -= dt) <= 0) { state.meteorCd = rnd(0.3, 0.6); spawnMeteor(); }
  for (const o of obstacles) {   // bariyerler duvarlar arasında gidip gelir
    o.x += o.vx * dt;
    if (o.x < state.inset || o.x + o.w > W - state.inset) {
      o.x = clamp(o.x, state.inset, W - state.inset - o.w);
      o.vx = o.x <= state.inset ? Math.abs(o.vx) : -Math.abs(o.vx);   // daralan duvar üstüne gelse de içeri yönelir
    }
  }
  updateUfo(dt);
}
// LANET kapsülü ve rakip saldırısı: hemen bir lanet (duyuru zaten bekliyorsa doğrudan başlar)
function curseFromCapsule() {
  const id = pickCurse();
  if (id) state.pendingCurse ? startCurse(id) : warnCurse(id);
}

// --- Sahte toplar: gerçeğinden ayırt edilemez, raketten geçer, tuğla kırmaz ---
function spawnDecoys() {
  const src = balls.find(b => !b.stuck && !b.decoy) || balls.find(b => !b.decoy);
  if (!src) return;
  spawnParticles(src.x - 10, src.y - 10, CURSE_COLOR, 12, 20, 20);
  for (let i = 0; i < 3 && balls.length < MAX_BALLS + 3; i++) {
    const a = -Math.PI / 2 + rnd(-1.2, 1.2);
    balls.push(Object.assign(newBall(false), { decoy: true, x: src.x, y: src.y, dx: Math.cos(a) * mag(), dy: Math.sin(a) * mag() }));
  }
}
function popDecoys() {
  for (const b of balls) if (b.decoy) { b.gone = true; spawnParticles(b.x - 8, b.y - 8, CURSE_COLOR, 10, 16, 16); }
  balls = balls.filter(b => !b.gone);
}
const spawnBarriers = () => { obstacles = [{ x: 120, y: 330, w: 110, h: 14, vx: 150 }, { x: W - 230, y: 410, w: 110, h: 14, vx: -190 }]; };
// Meteor: yukarıdan düşer, rakete çarparsa sersemletir (lazer vurabilir)
function spawnMeteor() {
  const a = Math.PI / 2 + rnd(-0.35, 0.35), sp = rnd(260, 380);
  bullets.push({ x: rnd(state.inset + 20, W - state.inset - 20), y: -10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, dead: false, meteor: true });
}
// UFO: geçerken 3 kötü kapsül bırakır; 2 vuruşta düşer (+750 ve iyi kapsül)
function spawnUfo() {
  const fromLeft = Math.random() < 0.5;
  state.ufo = { x: fromLeft ? -70 : W + 6, y: 250, w: 64, h: 26, vx: fromLeft ? 130 : -130, dropAt: 0.9, drops: 0, t: 0, hp: 2, flash: 0 };
}
function updateUfo(dt) {
  const u = state.ufo;
  if (!u) return;
  u.t += dt;
  u.x += u.vx * dt;
  u.y = 250 + Math.sin(u.t * 3) * 18;
  u.flash = Math.max(0, u.flash - dt * 6);
  if ((u.dropAt -= dt) <= 0 && u.drops < 3 && u.x > 40 && u.x < W - 100) {
    u.dropAt = 1.5;
    u.drops++;
    powerups.push({ x: u.x + u.w / 2 - 31, y: u.y + u.h, w: 62, h: 18, vy: 170, type: pick(["R", "N", "Z", "C"]) });
    sfx("ufo");
  }
  if (u.x < -90 || u.x > W + 30) state.ufo = null;
}
function hitUfo() {
  const u = state.ufo;
  if (!u) return;
  u.flash = 1;
  if (--u.hp > 0) return sfx("bossHit");
  state.ufo = null;
  sfx("boom");
  addShake(6);
  spawnParticles(u.x, u.y, "#80ffdb", 30, u.w, u.h);
  spawnCoins(u.x + u.w / 2, u.y, 20);
  addScore(750);
  addFloater(u.x + u.w / 2, u.y - 10, "UFO DÜŞTÜ! +750", "#80ffdb");
  dropPowerupAt(u.x + u.w / 2, u.y + u.h, true);
}
// DİRİLİŞ: kırılmış 3 tuğla geri gelir (içinde top olanlar hariç)
function reviveBricks() {
  const dead = bricks.filter(b => b.dead && !b.unbreakable &&
    !balls.some(ba => ba.x + ba.r > b.x && ba.x - ba.r < b.x + BRICK.w && ba.y + ba.r > b.y && ba.y - ba.r < b.y + BRICK.h));
  for (let i = 0; i < 3 && dead.length; i++) {
    const b = dead.splice((Math.random() * dead.length) | 0, 1)[0];
    Object.assign(b, { dead: false, hp: b.maxHp, cracks: null, flash: 1 });
    spawnParticles(b.x, b.y, CURSE_COLOR, 10);
  }
}
// ZIRHLANMA: tuğlalar +1 dayanıklılık (en çok 3)
function armorBricks() {
  for (const b of bricks) {
    if (b.dead || b.unbreakable || b.explosive || b.hp >= 3) continue;
    b.maxHp = Math.max(b.maxHp, ++b.hp);
    b.cracks = b.hp < b.maxHp ? makeCracks(b) : null;
    b.flash = 1;
  }
}

// --- Lanet çizimleri: dünya içinde (kamera dönüşümüyle birlikte) ---
function drawWallPanels() {   // DARALAN DUVARLAR: kayan çizgili paneller
  const w = state.inset;
  if (w < 1) return;
  for (const x0 of [0, W - w]) {
    ctx.fillStyle = hexToRgba(T().bg, 0.97);
    ctx.fillRect(x0, 0, w, H);
    ctx.fillStyle = hexToRgba(CURSE_COLOR, 0.25);
    for (let y = -40 + ((state.time * 40) % 40); y < H; y += 40) { path([[x0, y], [x0 + w, y + 20], [x0 + w, y + 32], [x0, y + 12]]); ctx.fill(); }
  }
  ctx.fillStyle = CURSE_COLOR;
  ctx.fillRect(w - 3, 0, 3, H);
  ctx.fillRect(W - w, 0, 3, H);
}
function drawObstacles() {    // sarı-siyah ikaz şeritli bariyerler
  for (const o of obstacles) {
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(o.x, o.y, o.w, o.h);
    ctx.clip();
    ctx.fillStyle = "#1a1a2e";
    for (let x = o.x - 20; x < o.x + o.w + 20; x += 18) { path([[x, o.y + o.h], [x + 9, o.y + o.h], [x + 18, o.y], [x + 9, o.y]]); ctx.fill(); }
    ctx.restore();
  }
}
function drawUfo() {
  const u = state.ufo;
  if (!u) return;
  const cx = u.x + u.w / 2, by = u.y + u.h;
  ctx.fillStyle = "rgba(128,255,219,0.18)";   // çekim ışını
  path([[cx - 10, by], [cx + 10, by], [cx + 30, by + 60], [cx - 30, by + 60]]);
  ctx.fill();
  ctx.fillStyle = "#80ffdb";
  ctx.beginPath(); ctx.ellipse(cx, u.y + 10, 14, 11, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = u.flash > 0 ? "#ffffff" : "#8d99ae";
  ctx.beginPath(); ctx.ellipse(cx, u.y + 16, u.w / 2, 9, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 5; i++) circle(u.x + 10 + i * 11, u.y + 17, 2.5, Math.floor(state.time * 8 + i) % 2 ? "#ffd166" : "#ff4d6d");
}
// Ekranın sağından/solundan sarmalayan akış (rüzgar çizgileri, sis bulutları)
const wrapX = (base, speed, span) => ((base + speed) % span + span) % span;
function drawWind() {
  if (!curseOn("ruzgar")) return;
  const d = state.windDir;
  ctx.strokeStyle = hexToRgba(T().text, 0.22);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const y = (i * 53) % H + 10, x = wrapX(i * 137, state.time * 520 * d, W + 120) - 60;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 40 * d, y);
  }
  ctx.stroke();
  text(d > 0 ? "≫ RÜZGAR ≫" : "≪ RÜZGAR ≪", W / 2, 96, "bold 16px monospace", hexToRgba(T().text, 0.5));
}
function drawFog() {
  if (!curseOn("sis")) return;
  const y0 = 220, y1 = 430, c = T().board;
  ctx.fillStyle = lgrad(0, y0, 0, y1, [[0, hexToRgba(c, 0)], [0.18, hexToRgba(c, 0.95)], [0.82, hexToRgba(c, 0.95)], [1, hexToRgba(c, 0)]]);
  ctx.fillRect(0, y0, W, y1 - y0);
  for (let i = 0; i < 9; i++) circle(wrapX(i * 113, state.time * 30 * (i % 2 ? 1 : -1), W + 160) - 80, y0 + 50 + (i % 3) * 50, 60, hexToRgba(T().dim, 0.12));
}
// Ekran düzleminde (dönüşümsüz): KARANLIK'ta yalnızca top ve raket çevresi aydınlık
const darkCanvas = document.createElement("canvas");
darkCanvas.width = W;
darkCanvas.height = H;
const dctx = darkCanvas.getContext("2d");
function drawDarkness(m) {
  if (!curseOn("karanlik")) return;
  dctx.globalCompositeOperation = "source-over";
  dctx.clearRect(0, 0, W, H);
  dctx.fillStyle = "rgba(0,0,0,0.96)";
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = "destination-out";
  for (const [x, y, r] of balls.map(b => [b.x, b.y, 105]).concat([[paddle.x + paddle.w / 2, paddle.y, 85]])) {
    const q = m.transformPoint(new DOMPoint(x, y)), px = q.x / DPR, py = q.y / DPR;   // dönüşüm DPR içerir
    const g = dctx.createRadialGradient(px, py, 10, px, py, r);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = g;
    dctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  ctx.drawImage(darkCanvas, 0, 0);
}
function drawBlackout() {     // ELEKTRİK KESİNTİSİ: uzun karartı + kısa göz kırpma
  const ph = state.time % 1.4;
  if (curseOn("elektrik") && (ph < 0.45 || (ph > 0.55 && ph < 0.6))) { ctx.fillStyle = "rgba(0,0,0,0.97)"; ctx.fillRect(0, 0, W, H); }
}
