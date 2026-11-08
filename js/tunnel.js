// ======================================================================
// 23. TÜNEL FIRTINASI (12. bölüm): binlerce mavi piksel tuğladan duvar ve içinden geçen kırılmaz
//     gri çelik tüneller (L ve sarmal). Tünele giren top boru gibi çıkışa taşınır, duvarı içeriden
//     oyar ve zincir reaksiyon başlatır. Çıkışlardaki sarı +3 / turuncu x3 küpler topla düşer;
//     raketle yakala: +3 üç top ekler, x3 tüm topları üçe katlar (en çok 300) → top fırtınası.
//     Duvar bitince "Congratulations You win!" ve 3 yıldız.
//     Duvar bir ızgaradır (hücre başına 1 bayt): çarpışma hücre aramasıyla, çizim önbellekli tuvalden.
// ======================================================================
const PX = { s: 6, x: 22, y: 76, cols: 126, rows: 44, half: 18, steel: 2 };   // hücre 6 px · tünel içi 36 px · çelik 2 hücre
const PX_EMPTY = 0, PX_BLUE = 1, PX_STEEL = 2, PX_HOLLOW = 3, PX_BURN = 4;
const STORM_MAX = 300, STORM_AT = 30, CUBE = 15;
// Tünel yolları (duvarın kendi koordinatında px): ilk nokta duvarın altından girer, son nokta çıkıştır
const TUNNEL_PATHS = [
  [[100, 300], [100, 46], [300, 46]],                                                    // L
  [[430, 300], [430, 40], [720, 40], [720, 210], [540, 210], [540, 120], [630, 120]],   // sarmal
];
// CR7 KORİDORU (13. bölüm): bambaşka bir yerleşim — tümü mavi dolu duvar, yalnız ortada tek dar dikey koridor.
// Top alt ortadan girer, boru gibi yukarı taşınır, tepede zinciri tutuşturup yanları oya oya iner.
const KORIDOR_PATHS = [
  [[378, 292], [378, 40]],                                                               // ortadan tepeye düz dar koridor
];
const PX_BLUES = ["#1d5fe0", "#2470f5", "#2f80ff", "#3b8cff", "#1a56d0", "#4a9bff"];
const CUBE_KINDS = {
  plus: { label: "+3", color: "#ffd60a" }, mul: { label: "x3", color: "#ff8c1a" },
  aim:  { label: "→", color: "#43d64f" }, fire: { label: "▲", color: "#ff6b35" },        // koridor küpleri: yön ve ateş
};
const pxWall = { active: false, mode: null, s: PX.s, cols: PX.cols, rows: PX.rows, grid: null, owner: null, tone: null, total: 0, left: 0, tunnels: [], cubes: [], burns: [],
                 canvas: null, g: null, dirty: [], full: false, pend: 0, flushAt: 0, statAcc: 0, sfxAt: 0, enterSfxAt: 0, clankAt: 0,
                 entered: false, chained: false, finale: false, storm: false, maxed: false, won: false, wonAt: 0, peak: 1 };
const pxSolid = t => t === PX_BLUE || t === PX_STEEL || t === PX_BURN;
const pxDone = () => !pxWall.active || pxWall.left <= 0;
const pxCellAt = (x, y) => {
  const c = Math.floor((x - PX.x) / pxWall.s), r = Math.floor((y - PX.y) / pxWall.s);
  return c < 0 || r < 0 || c >= pxWall.cols || r >= pxWall.rows ? -1 : r * pxWall.cols + c;
};
// Kolun dikdörtgeni (tünel yarı genişliği kadar şişirilmiş), ext: uç taraftan ek uzama
const inSegRect = (x, y, a, b, ext = 0) => x > Math.min(a[0], b[0]) - PX.half - ext && x < Math.max(a[0], b[0]) + PX.half + ext &&
                                          y > Math.min(a[1], b[1]) - PX.half - ext && y < Math.max(a[1], b[1]) + PX.half + ext;

function buildPixelWall(on) {
  Object.assign(pxWall, { active: !!on, mode: on || null, burns: [], cubes: [], dirty: [], pend: 0, flushAt: 0, statAcc: 0, entered: false, chained: false,
                          finale: false, storm: false, maxed: false, won: false, peak: 1 });
  if (!on) { pxWall.grid = pxWall.owner = null; pxWall.tunnels = []; pxWall.s = PX.s; pxWall.cols = PX.cols; pxWall.rows = PX.rows; return; }
  // MİNİK HÜCRELİ DUVARLAR (mikro/mozaik/adalar): hücre 4 px → aynı alanda ~2,25 kat daha çok minik tuğla
  const s = on === "mikro" || on === "mozaik" || on === "adalar" ? 4 : PX.s;
  const cols = Math.round(PX.cols * PX.s / s), rows = Math.round(PX.rows * PX.s / s), n = cols * rows;
  Object.assign(pxWall, { s, cols, rows });
  const grid = new Uint8Array(n).fill(PX_BLUE), owner = new Uint8Array(n), tone = new Uint8Array(n);
  const rand = seeded(4242);                          // tuğla tonları her seferinde aynı
  for (let i = 0; i < n; i++) tone[i] = (rand() * PX_BLUES.length) | 0;
  const center = i => [(i % cols) * s + s / 2, ((i / cols) | 0) * s + s / 2];
  const paths = on === "koridor" ? KORIDOR_PATHS : (on === "mikro" || on === "mozaik" || on === "adalar") ? [] : TUNNEL_PATHS;
  // 1) Tünel içi (boşluk): yolun her kolu boyunca 36 px genişliğinde kanal
  paths.forEach((pts, k) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = center(i);
      for (let j = 0; j < pts.length - 1; j++) if (inSegRect(x, y, pts[j], pts[j + 1])) { grid[i] = PX_HOLLOW; owner[i] = k + 1; break; }
    }
  });
  // 2) Çelik: kanalın çevresinde 2 hücre kalınlığında kırılmaz kaplama
  for (let i = 0; i < n; i++) {
    if (grid[i] !== PX_HOLLOW) continue;
    const c = i % cols, r = (i / cols) | 0;
    for (let dr = -PX.steel; dr <= PX.steel; dr++) for (let dc = -PX.steel; dc <= PX.steel; dc++) {
      const cc = c + dc, rr = r + dr, j = rr * cols + cc;
      if (cc >= 0 && cc < cols && rr >= 0 && rr < rows && grid[j] === PX_BLUE) grid[j] = PX_STEEL;
    }
  }
  // 3) Çıkış ağızları: son kolun ucundaki çelik açılır, kanal mavi tuğlalara bakar
  pxWall.tunnels = paths.map(local => {
    const pts = local.map(([x, y]) => [x + PX.x, y + PX.y]);
    const segs = pts.slice(0, -1).map((a, j) => {
      const b = pts[j + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len;
      return { a, b, len, dx, dy, px: -dy, py: dx };
    });
    const last = segs[segs.length - 1], e = local[local.length - 1], cap = [e[0] + last.dx * 30, e[1] + last.dy * 30];
    for (let i = 0; i < n; i++) if (grid[i] === PX_STEEL) { const [x, y] = center(i); if (inSegRect(x, y, e, cap)) grid[i] = PX_BLUE; }
    // Çıkış küpleri: Tünel'de sarı +3 ve turuncu x3; Koridor'da yeşil ok ve ateş de var (üçüncü küp ağzın içinde)
    const ex = last.b[0] - last.dx * 6, ey = last.b[1] - last.dy * 6;
    const kinds = on === "koridor"
      ? [["plus", -1, 0], ["aim", 1, 0], ["fire", 0, 26]]
      : [["plus", -1, 0], ["mul", 1, 0]];
    for (const [kind, side, back] of kinds) {
      const hx = ex + last.px * side * 8.5 - last.dx * back, hy = ey + last.py * side * 8.5 - last.dy * back;
      pxWall.cubes.push({ kind, hx, hy, x: hx, y: hy, vy: 0, rot: 0, st: "idle", at: 0, pop: 0, ph: rand() * 6 });
    }
    return { pts, segs };
  });
  if (on === "mikro") {   // kaburgalar: her 11. sıra çelik — yalnız üç boşluktan geçilir; topun duvara girmesi zordur
    const gaps = [[24, 38], [95, 109], [151, 165]];
    for (const rr of [11, 22, 33, 44, 55]) for (let c = 0; c < cols; c++) {
      if (gaps.some(([a, b]) => c >= a && c < b)) continue;
      const i = rr * cols + c;
      if (grid[i] === PX_BLUE) grid[i] = PX_STEEL;
    }
    for (const [kind, [a, b]] of [["fire", gaps[0]], ["aim", gaps[1]], ["plus", gaps[2]]]) {
      const hx = PX.x + (a + b) / 2 * s, hy = PX.y + 11 * s + 22;
      pxWall.cubes.push({ kind, hx, hy, x: hx, y: hy, vy: 0, rot: 0, st: "idle", at: 0, pop: 0, ph: rand() * 6 });
    }
  }
  if (on === "mozaik") {   // MOZAİK: 7×7 hücrelik (28 px) fayanslar — mavi/çelik/boşluk salınımı; fayans tek tondan
    const T = 7, tw = Math.floor(cols / T), th = Math.floor(rows / T);
    grid.fill(PX_HOLLOW);
    for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
      const v = (tx * 7 + ty * 13 + 3) % 10;                    // çeşitlilik: ~%60 mavi, %10 çelik, %30 aralık
      const tileTone = (tx * 3 + ty * 5) % PX_BLUES.length;
      for (let r2 = 0; r2 < T; r2++) for (let c2 = 0; c2 < T; c2++) {
        const i = (ty * T + r2) * cols + tx * T + c2;
        grid[i] = v < 6 ? PX_BLUE : v === 6 ? PX_STEEL : PX_HOLLOW;
        tone[i] = tileTone;
      }
    }
    for (let i = th * T * cols; i < n; i++) { grid[i] = PX_HOLLOW; }   // artan alt şerit boş
    for (const [kind, tx] of [["fire", 4], ["aim", 13], ["plus", 22]]) {   // üç fayans aralığı küp yuvası
      const hx = PX.x + (tx * T + T / 2) * s, hy = PX.y + (T + T / 2) * s;
      for (let r2 = 0; r2 < T; r2++) for (let c2 = 0; c2 < T; c2++) grid[(T + r2) * cols + tx * T + c2] = PX_HOLLOW;
      pxWall.cubes.push({ kind, hx, hy, x: hx, y: hy, vy: 0, rot: 0, st: "idle", at: 0, pop: 0, ph: rand() * 6 });
    }
  }
  if (on === "adalar") {    // ADALAR: serpilmiş küçük elmas tuğla takımları; bazılarının çelik çekirdeği var
    grid.fill(PX_HOLLOW);
    const irand = seeded(777);
    const place = (cx, cy, R, steel) => {
      const islandTone = (irand() * PX_BLUES.length) | 0;
      for (let dy2 = -R; dy2 <= R; dy2++) for (let dx2 = -R; dx2 <= R; dx2++) {
        if (Math.abs(dx2) + Math.abs(dy2) > R) continue;
        const c = cx + dx2, r2 = cy + dy2;
        if (c < 0 || c >= cols || r2 < 0 || r2 >= rows) continue;
        const i = r2 * cols + c;
        grid[i] = steel && Math.abs(dx2) + Math.abs(dy2) <= 1 ? PX_STEEL : PX_BLUE;
        tone[i] = islandTone;
      }
    };
    for (let iy = 0; iy < 8; iy++) for (let ix = 0; ix < 15; ix++) {
      const cx = 6 + ix * 13 + ((irand() * 5) | 0) - 2, cy = 4 + iy * 8 + ((irand() * 3) | 0) - 1;
      place(cx, cy, 3 + ((ix + iy) % 2), (ix * 2 + iy) % 4 === 0);
    }
    for (const [kind, cx, cy] of [["fire", 30, 30], ["aim", 95, 8], ["mul", 160, 30]]) {   // aralarda üç küp
      const hx = PX.x + cx * s, hy = PX.y + cy * s;
      for (let dy2 = -3; dy2 <= 3; dy2++) for (let dx2 = -3; dx2 <= 3; dx2++) {
        const c = cx + dx2, r2 = cy + dy2;
        if (c >= 0 && c < cols && r2 >= 0 && r2 < rows && Math.abs(dx2) + Math.abs(dy2) <= 3) grid[r2 * cols + c] = PX_HOLLOW;
      }
      pxWall.cubes.push({ kind, hx, hy, x: hx, y: hy, vy: 0, rot: 0, st: "idle", at: 0, pop: 0, ph: rand() * 6 });
    }
  }
  let blue = 0;
  for (let i = 0; i < n; i++) if (grid[i] === PX_BLUE) blue++;
  Object.assign(pxWall, { grid, owner, tone, total: blue, left: blue, full: true });
}

// Topun dairesine değen dolu hücreler (steelOnly: yalnızca çelik). out verilmezse ilk değmede true döner.
function pxOverlap(x, y, r, steelOnly, out) {
  const s = pxWall.s, cols = pxWall.cols, rows = pxWall.rows, g = pxWall.grid;
  const c0 = Math.max(0, Math.floor((x - r - PX.x) / s)), c1 = Math.min(cols - 1, Math.floor((x + r - PX.x) / s));
  const r0 = Math.max(0, Math.floor((y - r - PX.y) / s)), r1 = Math.min(rows - 1, Math.floor((y + r - PX.y) / s));
  let hit = false;
  for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
    const i = rr * cols + c, t = g[i];
    if (steelOnly ? t !== PX_STEEL : !pxSolid(t)) continue;
    const cx = PX.x + c * s, cy = PX.y + rr * s, dx = x - clamp(x, cx, cx + s), dy = y - clamp(y, cy, cy + s);
    if (dx * dx + dy * dy > r * r) continue;
    if (!out) return true;
    hit = true;
    out.push(i);
  }
  return hit;
}

// Fizik kancası (moveBall'un her alt adımında): tünel rehberliği, duvar çarpışması, oyma
const pxHits = [];
function pxBall(b, ox, oy, sdt) {
  if (b.tunCd > 0) b.tunCd -= sdt;
  if (b.tun) { pxGuide(b, sdt); if (b.tun) return; }
  const ci = pxCellAt(b.x, b.y);
  if (ci >= 0 && pxWall.grid[ci] === PX_HOLLOW && !(b.tunCd > 0)) { pxEnter(b, pxWall.owner[ci] - 1); return; }
  pxHits.length = 0;
  if (!pxOverlap(b.x, b.y, b.r, false, pxHits)) return;
  const pierce = isFire() && !b.decoy, steelHit = pxHits.some(i => pxWall.grid[i] === PX_STEEL), bounce = steelHit || !pierce;
  let hx = false, hy = false, embedded = false;
  if (bounce) {                                       // eksen kararı oymadan önce verilir
    embedded = pxOverlap(ox, oy, b.r * 0.7, pierce, null);   // kara delik/daralan duvar içine soktuysa kilitlenmesin
    hx = pxOverlap(b.x, oy, b.r, pierce, null);
    hy = pxOverlap(ox, b.y, b.r, pierce, null);
  }
  if (!b.decoy) {
    const inside = b.tunnelUntil > state.time;        // tünelden yeni çıktı: içeriden oyuyor
    let broke = 0;
    for (const i of pxHits) {
      if (broke >= 4 || pxWall.grid[i] === PX_STEEL || !pxBreak(i)) continue;
      broke++;
      if (inside) {
        if (!pxWall.chained) { pxWall.chained = true; callout(tr("ZİNCİR REAKSİYON!"), "#4cc9f0"); sfx("boom"); addShake(6); pxIgnite(i, 14); if (pxWall.mode === "koridor" && typeof cr7Cheer === "function") cr7Cheer(1.4); }
        else pxIgnite(i, 5);
      }
    }
    if (steelHit && !broke && state.time - pxWall.clankAt > 0.06) { pxWall.clankAt = state.time; sfx("clank"); }
  }
  if (!bounce || embedded) return;
  if (hx && !hy) { b.x = ox; b.dx = -b.dx; }
  else if (hy && !hx) { b.y = oy; b.dy = -b.dy; }
  else { b.x = ox; b.y = oy; b.dx = -b.dx; b.dy = -b.dy; }
  b.spin *= 0.5;
}
// Kolun ucunu geçti mi (> 0: geçti)
const pxPassed = (b, g) => (b.x - g.b[0]) * g.dx + (b.y - g.b[1]) * g.dy;
function pxEnter(b, k) {
  const tn = pxWall.tunnels[k];
  if (!tn) return;
  let s = 0;
  tn.segs.forEach((g, j) => { if (inSegRect(b.x, b.y, g.a, g.b)) s = j; });
  b.tun = { k, s };
  if (!pxWall.entered) { pxWall.entered = true; callout(tr("TÜNEL!"), "#c3ccd8"); }
  if (state.time - pxWall.enterSfxAt > 0.12) { pxWall.enterSfxAt = state.time; sfx("portal"); }
  if (particles.length < 300) spawnParticles(b.x - 8, b.y - 8, "#c3ccd8", 5, 16, 16);
}
// Boru gibi taşı: top kolun ortasına çekilir ve kol yönünde hızlanır; dönemeçte sonraki kola geçer
function pxGuide(b, sdt) {
  const tn = pxWall.tunnels[b.tun.k], ci = pxCellAt(b.x, b.y);
  if (!tn || ci < 0 || pxWall.grid[ci] !== PX_HOLLOW) { b.tun = null; return; }   // kara delik vb. dışarı attı
  let s = b.tun.s;
  while (s < tn.segs.length - 1 && pxPassed(b, tn.segs[s]) >= 0) s++;
  b.tun.s = s;
  const g = tn.segs[s];
  if (s === tn.segs.length - 1 && pxPassed(b, g) >= 0) { pxExit(b, g); return; }
  const lat = (b.x - g.a[0]) * g.px + (b.y - g.a[1]) * g.py, lim = Math.max(0, PX.half - b.r - 1);
  const nl = clamp(lat * Math.exp(-sdt * 14), -lim, lim);
  b.x += (nl - lat) * g.px;
  b.y += (nl - lat) * g.py;
  const m = Math.hypot(b.dx, b.dy) || mag();
  b.dx = g.dx * m;
  b.dy = g.dy * m;
  b.boost = Math.max(b.boost, 1.5);
  b.spin = 0;
}
function pxExit(b, g) {
  b.tun = null;
  b.tunCd = 0.5;                                      // çıkış ağzında yeniden yakalanmasın
  b.tunnelUntil = state.time + 2.5;
  const a = Math.atan2(g.dy, g.dx) + grnd(-0.5, 0.5), m = Math.hypot(b.dx, b.dy) || mag();
  b.dx = Math.cos(a) * m;
  b.dy = Math.sin(a) * m;
  b.boost = Math.max(b.boost, 1.7);
  if (particles.length < 300) spawnParticles(b.x - 10, b.y - 10, "#9fd3ff", 8, 20, 20);
}

function pxBreak(i) {
  const P = pxWall, t = P.grid[i];
  if (t !== PX_BLUE && t !== PX_BURN) return false;
  P.grid[i] = PX_EMPTY;
  P.left--;
  P.dirty.push(i);
  P.pend += 4 * (isFever() ? 2 : 1);
  if (++P.statAcc >= 20) { P.statAcc = 0; run.bricks++; track("bricks"); }   // 20 piksel = 1 tuğla (kariyer sayacı şişmesin)
  if (particles.length < 260 && Math.random() < 0.5) {
    spawnParticles(PX.x + (i % pxWall.cols) * pxWall.s, PX.y + ((i / pxWall.cols) | 0) * pxWall.s, PX_BLUES[P.tone[i]], 2, pxWall.s, pxWall.s);
  }
  if (state.time - P.sfxAt > 0.05) { P.sfxAt = state.time; sfx("brick", 1 + (P.left % 9)); }
  return true;
}
// Zincir reaksiyon: kırılan hücrenin komşuları tutuşur, kısa gecikmeyle kırılıp yayılır (çelik durdurur)
function pxIgnite(i, e) {
  const { cols } = PX, g = pxWall.grid, c = i % cols;
  for (const j of [i - cols, i + cols, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1]) {
    if (j < 0 || j >= g.length || g[j] !== PX_BLUE || (e < 4 && gameRandom() > 0.85)) continue;
    g[j] = PX_BURN;
    pxWall.burns.push({ i: j, t: state.time + grnd(0.03, 0.06), e: e - 1 });
  }
}

// Küp yakalandı: +3 üç top ekler, x3 her topu üçe katlar (en çok 300);
// koridorda ayrıca → yeşil ok yörünge kılavuzu ve ▲ ateş topu verir
function pxCatch(q) {
  const K = CUBE_KINDS[q.kind];
  addShake(3);
  run.powers++;
  if (q.kind === "plus") {
    for (let k = -1; k <= 1 && balls.length < STORM_MAX; k++) {
      const a = -Math.PI / 2 + k * 0.45;
      balls.push(Object.assign(newBall(false), { x: paddle.x + paddle.w / 2 + k * 14, y: paddle.y - 12, dx: Math.cos(a) * mag(), dy: Math.sin(a) * mag() }));
    }
  } else if (q.kind === "mul") {
    for (const s of balls.filter(b => !b.decoy && !b.stuck)) {
      const base = Math.atan2(s.dy, s.dx);
      for (const a of [-0.3, 0.3]) {
        if (balls.length >= STORM_MAX) break;
        balls.push(Object.assign(newBall(false), { x: s.x, y: s.y, dx: Math.cos(base + a) * mag(), dy: Math.sin(base + a) * mag(), tunnelUntil: s.tunnelUntil || 0 }));
      }
    }
  } else if (q.kind === "aim") {
    state.aimUntil = state.time + FX_TIME.aim;
    addFloater(paddle.x + paddle.w / 2, paddle.y - 18, "→ " + tr("YÖN") + "!", K.color);
    sfx("power");
  } else if (q.kind === "fire") {
    state.fireUntil = state.time + FX_TIME.fire;
    addFloater(paddle.x + paddle.w / 2, paddle.y - 18, "▲ " + tr("ATEŞ") + "!", K.color);
    sfx("fire");
  }
  if (pxWall.mode === "koridor" && typeof cr7Cheer === "function") cr7Cheer(1.6);
  const n = balls.length;
  pxWall.peak = Math.max(pxWall.peak, n);
  if (q.kind === "plus" || q.kind === "mul") addFloater(paddle.x + paddle.w / 2, paddle.y - 30, K.label + " → " + tr("{n} TOP", { n }), K.color);
  sfx("multi");
  addScore(50);
  if (!pxWall.storm && n >= STORM_AT) { pxWall.storm = true; callout(tr("🌪 TOP FIRTINASI!"), "#4cc9f0"); sfx("fever"); addShake(8); }
  else if (!pxWall.maxed && n >= STORM_MAX) { pxWall.maxed = true; callout(tr("300 TOP: MAKSİMUM!"), "#ffd60a"); sfx("fever"); }
}

function pxUpdate(dt) {
  const P = pxWall;
  if (!P.active) return;
  if (P.burns.length) {                               // zincir cephesi ilerler
    const due = [];
    P.burns = P.burns.filter(b => (b.t <= state.time ? (due.push(b), false) : true));
    for (const b of due) if (pxBreak(b.i) && b.e > 0) pxIgnite(b.i, b.e);
  }
  // Son %3 kalınca kalanların hepsi tutuşur: son kırıntıları kovalamak gerekmez
  if (!P.finale && state.mode === "playing" && P.left > 0 && P.left <= P.total * 0.03) {
    P.finale = true;
    callout(tr("FİNAL ZİNCİRİ!"), "#ffd60a");
    sfx("fever");
    for (let i = 0; i < P.grid.length; i++) if (P.grid[i] === PX_BLUE) { P.grid[i] = PX_BURN; P.burns.push({ i, t: state.time + grnd(0.05, 0.7), e: 0 }); }
  }
  for (const q of P.cubes) {
    q.pop = Math.max(0, q.pop - dt * 3);
    if (q.st === "idle") {
      if (state.mode !== "playing") continue;
      const hit = balls.find(b => !b.decoy && Math.abs(b.x - q.hx) < CUBE / 2 + b.r && Math.abs(b.y - q.hy) < CUBE / 2 + b.r);
      if (hit) {
        Object.assign(q, { st: "fall", x: q.hx, y: q.hy, vy: 40, rot: 0 });
        sfx("power");
        addFloater(q.hx, q.hy - 14, CUBE_KINDS[q.kind].label, CUBE_KINDS[q.kind].color);
      }
    } else if (q.st === "fall") {
      q.vy = Math.min(q.vy + 520 * dt, 320);
      q.y += q.vy * dt;
      q.rot += dt * 5;
      const h = CUBE / 2;
      if (state.mode !== "playing") Object.assign(q, { st: "wait", at: state.time + 1 });
      else if (q.y + h >= paddle.y && q.y - h <= paddle.y + paddle.h && q.x + h >= paddle.x && q.x - h <= paddle.x + paddle.w) {
        pxCatch(q);
        Object.assign(q, { st: "wait", at: state.time + 3.5 });
      } else if (q.y > H + 20) Object.assign(q, { st: "wait", at: state.time + 2 });
    } else if (q.st === "wait" && state.time >= q.at) Object.assign(q, { st: "idle", pop: 1 });
  }
  P.peak = Math.max(P.peak, balls.length);
  if (P.pend && (state.time >= P.flushAt || P.left <= 0)) { addScore(P.pend); P.pend = 0; P.flushAt = state.time + 0.1; }
  if (P.left <= 0 && !P.burns.length) checkLevelDone();
}
// Bölüm bitti: kutlama, bonus, yıldız çanları. Koridorda toplar her yere saçılır ve CR7 kutlama yapar
function pxWin() {
  pxWall.won = true;
  pxWall.wonAt = performance.now();
  state.callout = null;
  state.clearAt = state.time + 4.2;
  addScore(2500);
  for (let k = 0; k < 6; k++) spawnCoins(rnd(150, 650), rnd(140, 320), 18);
  for (let k = 0; k < 3; k++) tone("triangle", [784, 988, 1318][k], 0, 0.35, 0.2, 0.45 + k * 0.3);
  if (pxWall.mode) {
    if (pxWall.mode === "koridor") {
      if (typeof cr7Cheer === "function") cr7Cheer(5);
      callout(tr("⚽ SIUUU!"), "#ffd60a");
    }
    for (let k = 0; k < 48 && balls.length < STORM_MAX; k++) {          // kazanma: toplar her yere saçılır
      const a = grnd(0, TAU), m2 = grnd(200, 460);
      balls.push(Object.assign(newBall(false), { x: W / 2 + grnd(-30, 30), y: H / 2 - 60, dx: Math.cos(a) * m2, dy: Math.sin(a) * m2 }));
    }
    pxWall.peak = Math.max(pxWall.peak, balls.length);
    addShake(6);
  }
}

// --- Çizim ---
function pxPaintCell(i) {
  const g = pxWall.g, s = pxWall.s, cols = pxWall.cols, rows = pxWall.rows, c = i % cols, r = (i / cols) | 0, x = c * s, y = r * s, t = pxWall.grid[i];
  g.clearRect(x, y, s, s);
  if (t === PX_BLUE || t === PX_BURN) {               // piksel tuğla: üstü/solu parlak, altı/sağı gölgeli (büyük hücrede tam bevel)
    g.fillStyle = PX_BLUES[pxWall.tone[i]];
    g.fillRect(x + 0.5, y + 0.5, s - 1, s - 1);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(x + 0.5, y + 0.5, s - 1, 1);
    if (s >= 6) g.fillRect(x + 0.5, y + 0.5, 1, s - 1);
    g.fillStyle = "rgba(0,0,30,0.35)";
    g.fillRect(x + 0.5, y + s - 1.5, s - 1, 1);
    if (s >= 6) g.fillRect(x + s - 1.5, y + 0.5, 1, s - 1);
  } else if (t === PX_STEEL) {                        // fırçalanmış çelik: kenarlarda pah
    const same = (dc, dr) => { const cc = c + dc, rr = r + dr; return cc >= 0 && cc < cols && rr >= 0 && rr < rows && pxWall.grid[rr * cols + cc] === PX_STEEL; };
    g.fillStyle = ["#8d99ae", "#97a3b6", "#8492a6"][pxWall.tone[i] % 3];
    g.fillRect(x, y, s, s);
    if (!same(0, -1)) { g.fillStyle = "#dfe7ef"; g.fillRect(x, y, s, 1.5); }
    if (!same(0, 1)) { g.fillStyle = "#46505f"; g.fillRect(x, y + s - 1.5, s, 1.5); }
    if (!same(-1, 0)) { g.fillStyle = "#c3ccd8"; g.fillRect(x, y, 1.5, s); }
    if (!same(1, 0)) { g.fillStyle = "#56606f"; g.fillRect(x + s - 1.5, y, 1.5, s); }
    if ((c * 7 + r * 3) % 11 === 0) { g.fillStyle = "#5b6577"; g.fillRect(x + 2, y + 2, 2, 2); }   // perçin
  } else if (t === PX_HOLLOW) {
    g.fillStyle = "rgba(6,10,22,0.82)";
    g.fillRect(x, y, s, s);
  }
}
const star5 = (x, y, R) => path(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; }), true);
function drawCube(x, y, kind, rot, sc) {
  const col = CUBE_KINDS[kind].color, h = CUBE / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.globalAlpha = 0.22 + 0.12 * Math.sin(state.time * 6);
  fillRR(-h - 4, -h - 4, CUBE + 8, CUBE + 8, 5, col);   // parıltı halesi
  ctx.globalAlpha = 1;
  path([[-h, -h], [-h + 3, -h - 3], [h + 3, -h - 3], [h, -h]], true);
  ctx.fillStyle = shade(col, 0.45);
  ctx.fill();
  path([[h, -h], [h + 3, -h - 3], [h + 3, h - 3], [h, h]], true);
  ctx.fillStyle = shade(col, -0.3);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.fillRect(-h, -h, CUBE, CUBE);
  ctx.strokeStyle = shade(col, -0.45);
  ctx.lineWidth = 1;
  ctx.strokeRect(-h + 0.5, -h + 0.5, CUBE - 1, CUBE - 1);
  text(CUBE_KINDS[kind].label, 0, 3.5, "bold 9px monospace", "#2b1a00");
  ctx.restore();
}
function drawPixelWall() {
  const P = pxWall;
  if (!P.active) return;
  const ww = P.cols * P.s, wh = P.rows * P.s;
  if (!P.canvas) P.canvas = document.createElement("canvas");
  if (P.full) {                                       // bölüm başında bir kez tamamı, sonra yalnızca değişen hücreler
    P.canvas.width = ww * DPR;
    P.canvas.height = wh * DPR;
    P.g = P.canvas.getContext("2d");
    P.g.setTransform(DPR, 0, 0, DPR, 0, 0);
    for (let i = 0; i < P.grid.length; i++) pxPaintCell(i);
    P.full = false;
    P.dirty.length = 0;
  } else if (P.dirty.length) {
    for (const i of P.dirty) pxPaintCell(i);
    P.dirty.length = 0;
  }
  const reveal = clamp(state.buildFade / 3, 0, 1);    // bölüm başında yukarıdan aşağı belirir
  ctx.fillStyle = "rgba(0,0,0,0.20)";                 // cila: duvarın düşen gölgesi
  ctx.fillRect(PX.x + 2, PX.y + 4, ww, wh);
  const shg = ctx.createLinearGradient(0, PX.y + wh, 0, PX.y + wh + 16);
  shg.addColorStop(0, "rgba(0,0,0,0.26)");
  shg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shg;
  ctx.fillRect(PX.x - 4, PX.y + wh, ww + 8, 16);
  ctx.save();
  ctx.beginPath();
  ctx.rect(PX.x - 2, PX.y - 2, ww + 4, wh * (1 - (1 - reveal) ** 3) + 4);
  ctx.clip();
  ctx.drawImage(P.canvas, PX.x, PX.y, ww, wh);
  // Tünel içinde akış okları: topun gideceği yön
  ctx.strokeStyle = "rgba(140,200,255,0.32)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const tn of P.tunnels) for (const g of tn.segs) {
    for (let d = (state.time * 90) % 22; d < g.len; d += 22) {
      const x = g.a[0] + g.dx * d, y = g.a[1] + g.dy * d;
      if (y > PX.y + wh - 4) continue;
      ctx.moveTo(x - g.dx * 3 + g.px * 5, y - g.dy * 3 + g.py * 5);
      ctx.lineTo(x + g.dx * 3, y + g.dy * 3);
      ctx.lineTo(x - g.dx * 3 - g.px * 5, y - g.dy * 3 - g.py * 5);
    }
  }
  ctx.stroke();
  // Tutuşan hücreler (zincir cephesi)
  ctx.fillStyle = calmFx() || Math.sin(state.time * 40) > 0 ? "#ffd166" : "#ffffff";   // 20 Hz titreme; parlama azaltılınca sabit
  for (const b of P.burns) if (P.grid[b.i] === PX_BURN) ctx.fillRect(PX.x + (b.i % PX.cols) * PX.s, PX.y + ((b.i / PX.cols) | 0) * PX.s, PX.s - 0.5, PX.s - 0.5);
  for (const q of P.cubes) {
    if (q.st === "idle") drawCube(q.hx, q.hy + Math.sin(state.time * 4 + q.ph) * 0.8, q.kind, 0, q.pop > 0 ? Math.max(0.01, easeOutBack(1 - q.pop)) : 1);
  }
  ctx.restore();
  for (const q of P.cubes) if (q.st === "fall") drawCube(q.x, q.y, q.kind, q.rot, 1);
  if (P.storm && balls.length >= STORM_AT) {          // fırtına tonu
    ctx.fillStyle = `rgba(76,201,240,${0.05 + 0.03 * Math.sin(state.time * 5)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (balls.length > 1) text("● " + tr("{n} TOP", { n: balls.length }), 20, pactNames() ? H - 30 : H - 12, "bold 12px monospace", balls.length >= STORM_AT ? "#4cc9f0" : T().dim, "left");
}
function drawPixelWin() {
  const t = (performance.now() - pxWall.wonAt) / 1000;
  overlay(0.25);
  drawCard(W / 2, H / 2, 540, 270);
  titleText(tr("Congratulations"), W / 2, H / 2 - 66, 40, "#ffd60a", T().accent, 500);
  titleText(tr("You win!"), W / 2, H / 2 - 20, 34, "#4cc9f0", "#ffffff", 500);
  for (let k = 0; k < 3; k++) {                       // yıldızlar sırayla zıplayarak dolar
    const sx = W / 2 + (k - 1) * 82, sy = H / 2 + 50 - (k === 1 ? 10 : 0), a = clamp((t - 0.35 - k * 0.3) / 0.35, 0, 1);
    star5(sx, sy, 30);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    if (a <= 0) continue;
    ctx.save();
    ctx.translate(sx, sy);
    const sc = Math.max(0.01, easeOutBack(a));
    ctx.scale(sc, sc);
    ctx.rotate((1 - a) * 1.2);
    star5(0, 0, 30);
    ctx.fillStyle = lgrad(0, -30, 0, 30, ["#fff3b0", "#ffd60a", "#f4a300"]);
    ctx.fill();
    ctx.strokeStyle = "#b86e00";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }
  text(tr("+3000 · en çok {n} top", { n: pxWall.peak }), W / 2, H / 2 + 110, "bold 15px monospace", T().b2, "center", 500);
}
