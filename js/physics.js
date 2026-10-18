// ======================================================================
// 9. FİZİK VE OYUN KURALLARI: tuğla hasarı, kapsüller, duvarlar, top hareketi,
//    lazer, kara delik, boss ve mermiler
// ======================================================================
// Kapsüller: w = düşme ağırlığı, bad = kaçınılması gereken (yakalayana +250),
// timer = FX_TIME'daki süreli etki, fx = özel etki, sound = SFX adı
const POWERS = {
  W: { label: "GENİŞ",  color: "#90be6d", w: 12, sound: "power",  fx: () => (paddle.wideUntil = state.time + WIDE_TIME) },
  M: { label: "ÇOKLU",  color: "#f38ba0", w: 12, sound: "multi",  fx: () => (balls.some(b => !b.stuck && !b.decoy) ? splitBalls() : (state.pendingMulti = true)) },
  S: { label: "YAVAŞ",  color: "#4cc9f0", w: 8,  sound: "slow",   fx: () => (state.slowUntil = state.time + SLOW_TIME) },
  F: { label: "ATEŞ",   color: "#ff6b35", w: 9,  sound: "fire",   timer: "fire" },
  L: { label: "LAZER",  color: "#ff4d6d", w: 9,  sound: "power",  timer: "laser", fx: () => (state.laserCd = 0) },
  Y: { label: "YAPIŞ",  color: "#b388eb", w: 7,  sound: "power",  timer: "magnet" },
  D: { label: "DEV",    color: "#ffd166", w: 8,  sound: "power",  timer: "big" },
  K: { label: "KALKAN", color: "#64dfdf", w: 7,  sound: "shield", fx: () => (state.shield = Math.min(state.shield + 3, 6)) },
  O: { label: "DELİK",  color: "#9d4edd", w: 6,  fx: () => spawnHole() },
  H: { label: "+CAN",   color: "#ff8fab", w: 2,  sound: "power",  fx: () => { state.lives = Math.min(state.lives + 1, MAX_LIVES); callout("+1 CAN", "#ff8fab"); } },
  Q: { label: "KAOS?",  color: "#ffffff", w: 6,  fx: () => {          // rastgele herhangi bir kapsül
    const k = pick(Object.keys(POWERS).filter(k => k !== "Q" && powerAllowed(k)));
    callout("KAOS → " + POWERS[k].label, POWERS[k].bad ? "#ff4d6d" : "#ffffff");
    applyPower(k);
  } },
  R: { label: "TERS",   color: "#8b0000", w: 5, bad: true, sound: "bad", timer: "reverse" },
  N: { label: "MİNİ",   color: "#8b0000", w: 5, bad: true, sound: "bad", timer: "mini" },
  Z: { label: "HIZ",    color: "#8b0000", w: 5, bad: true, sound: "bad", timer: "haste" },
  C: { label: "LANET",  color: "#5a189a", w: 5, bad: true, sound: "bad", fx: () => curseFromCapsule() },
};
// Can doluyken +CAN, lanetler kapalıyken LANET düşmez
const powerAllowed = k => !(k === "H" && state.lives >= MAX_LIVES) && !(k === "C" && settings.hazards === "kapali");
function pickPower(goodOnly) {
  const entries = Object.entries(POWERS).filter(([k, p]) => !(goodOnly && (p.bad || k === "Q")) && powerAllowed(k));
  let r = Math.random() * entries.reduce((s, [, p]) => s + p.w, 0);
  for (const [k, p] of entries) if ((r -= p.w) < 0) return k;
  return "W";
}
const dropPowerupAt = (x, y, goodOnly) => powerups.push({ x: x - 31, y, w: 62, h: 18, vy: 150, type: pickPower(goodOnly) });
function applyPower(type) {
  const P = POWERS[type];
  if (type !== "Q") addFloater(paddle.x + paddle.w / 2, paddle.y - 16, P.label + (P.bad ? " +250" : "!"), P.bad ? "#ff4d6d" : P.color);
  addScore(P.bad ? 250 : 50);
  if (P.timer) state[P.timer + "Until"] = state.time + FX_TIME[P.timer];
  if (P.fx) P.fx();
  if (P.sound) sfx(P.sound);
}

// --- Tuğlalar: tüm hasar kaynakları (top, ateş, lazer, yıldırım) buradan geçer ---
function damageBrick(b, dmg = 1, zapDepth = 0) {
  if (b.dead) return;
  b.flash = b.wob = 1;          // anlık parlama + esneme
  if (b.unbreakable) { sfx("clank"); spawnParticles(b.x, b.y, T().un, 4); return; }
  b.hp -= dmg;
  if (b.electric && zapDepth < 2) chainLightning(b, zapDepth + 1);
  if (b.hp <= 0) {
    destroyBrick(b);
    if (b.explosive) explode(b);
  } else {
    b.cracks = makeCracks(b);
    sfx("clack");
  }
  checkLevelDone();
}
const COMBO_CALLS = { 5: "SÜPER!", 8: "MUHTEŞEM!", 15: "EFSANE!", 20: "TANRISAL!", 30: "BU NE BE?!" };
function destroyBrick(b) {
  if (b.dead) return;
  b.dead = true;
  state.combo++;
  track("bricks");
  trackBest("bestCombo", state.combo);
  const pts = Math.round(10 * b.maxHp * Math.min(state.combo, 8) * (b.gold ? 10 : 1) * (isFever() ? 2 : 1) * curseBonus());
  addScore(pts);
  const col = b.explosive || b.electric || b.gold || b.splitter ? brickColor(b) : undefined;
  const cx = b.x + BRICK.w / 2;
  spawnParticles(b.x, b.y, col);
  spawnFragments(b, col);
  addFloater(cx, b.y, "+" + pts, isFever() ? T().b2 : T().text);
  sfx("brick", state.combo);
  addShake(2.5);
  if (b.gold) { spawnCoins(cx, b.y + BRICK.h / 2, 26); sfx("coin"); dropPowerupAt(cx, b.y, true); }   // altın: kesin iyi kapsül
  else if (Math.random() < 0.16) dropPowerupAt(cx, b.y);
  if (b.splitter) spawnSplitBall(cx, b.y + BRICK.h + 10);
  battleCharge(state.combo >= 5 ? 2 : 1);
  // Combo duyuruları; 10'da ÇILGIN MOD
  if (state.combo === FEVER_COMBO && !isFever()) {
    state.feverUntil = state.time + FEVER_TIME;
    callout("★ ÇILGIN MOD ★", "#ff5d8f");
    sfx("fever");
    track("fevers");
    battleCharge(5);
    addShake(6);
  } else if (COMBO_CALLS[state.combo]) callout(COMBO_CALLS[state.combo] + " x" + state.combo);
}
// Çoğaltan tuğla: kırıldığı yerden aşağı doğru yeni bir top çıkar
function spawnSplitBall(x, y) {
  if (state.mode !== "playing" || balls.length >= MAX_BALLS) return;
  const a = rnd(-0.6, 0.6);
  balls.push(Object.assign(newBall(false), { x, y, dx: mag() * Math.sin(a), dy: mag() * Math.cos(a) }));
  addFloater(x, y + 10, "+TOP", "#06d6a0");
  sfx("multi");
}
// Patlayan tuğla: komşularını da kırar, patlayıcılar zincirlenir
function explode(center) {
  sfx("boom");
  addShake(5);
  state.hitstop = Math.max(state.hitstop, 0.04);
  const queue = [center], seen = new Set(queue);
  while (queue.length) {
    const b = queue.shift();
    for (const o of bricks) {
      if (o.dead || o.unbreakable || seen.has(o) || (o.col - b.col) ** 2 + (o.row - b.row) ** 2 > 2) continue;
      seen.add(o);
      o.flash = 1;
      if (o.explosive) queue.push(o);
      destroyBrick(o);
    }
  }
}
// Elektrik tuğlası: en yakın 3 tuğlaya yıldırım (yıldırım yiyen elektrikli tuğla bir kez daha zincirler)
function chainLightning(src, depth) {
  const sx = src.x + BRICK.w / 2, sy = src.y + BRICK.h / 2;
  const targets = bricks.filter(o => !o.dead && !o.unbreakable && o !== src)
    .map(o => ({ o, d: Math.hypot(o.x + BRICK.w / 2 - sx, o.y + BRICK.h / 2 - sy) }))
    .filter(t => t.d < 230).sort((a, b) => a.d - b.d).slice(0, 3);
  if (!targets.length) return;
  sfx("zap");
  addShake(2);
  for (const { o } of targets) addBolt(sx, sy, o.x + BRICK.w / 2, o.y + BRICK.h / 2);
  for (const { o } of targets) damageBrick(o, 1, depth);
}

// --- Duvarlar: falso sekme açısına dönüşür; bölgeler topa ayrı davranır ---
const zoneAt = (side, y) => zones.find(z => z.side === side && y >= z.y && y <= z.y + z.h);
function wallHit(b, side) {
  const z = zoneAt(side, b.y), L = side === "L";
  const wl = state.inset, wr = W - state.inset;       // DARALAN DUVARLAR sahayı kısar
  const wallX = L ? wl : wr - 8, floatX = L ? wl + 40 : wr - 40;
  if (z && z.type === "portal" && z.link && b.portalCd <= 0) {
    // Portal: karşı duvardaki eşinden aynı yönde çıkar
    spawnParticles(wallX, b.y - 10, ZONE_STYLE.portal, 10, 8, 20);
    b.y = z.link.y + (b.y - z.y);
    b.x = L ? wr - b.r - 1 : wl + b.r + 1;
    b.portalCd = 0.3;
    b.trail = [];
    z.flash = z.link.flash = 1;
    sfx("portal");
    spawnParticles(L ? wr - 8 : wl, b.y - 10, ZONE_STYLE.portal, 10, 8, 20);
    return;
  }
  b.x = L ? wl + b.r : wr - b.r;
  b.dx = L ? Math.abs(b.dx) : -Math.abs(b.dx);
  // Dönen top duvarda falsosu kadar sapar, falso tersine döner ve zayıflar
  if (Math.abs(b.spin) > 0.05) { rotate(b, -b.spin * 0.35); b.spin *= -0.6; }
  if (z && z.type === "bumper") {
    b.boost = Math.max(b.boost, 1.6);
    rotate(b, rnd(-0.35, 0.35));
    b.spin += rnd(-0.6, 0.6);
    z.flash = 1;
    sfx("bumper");
    addShake(2.5);
    spawnParticles(wallX, b.y - 10, ZONE_STYLE.bumper, 12, 8, 20);
    addFloater(floatX, b.y, "BOING!", ZONE_STYLE.bumper);
  } else if (z && z.type === "spin") {
    b.spin = (Math.random() < 0.5 ? -1 : 1) * SPIN_MAX * 1.4;
    z.flash = 1;
    sfx("spin");
    spawnParticles(wallX, b.y - 10, ZONE_STYLE.spin, 10, 8, 20);
    addFloater(floatX, b.y, "FALSO!", ZONE_STYLE.spin);
  } else {
    sfx("wall");
    spawnParticles(wallX, b.y - 4, T().ball, 3, 8, 8);
  }
  b.dx = L ? Math.abs(b.dx) : -Math.abs(b.dx);
  fixAngle(b);
}
// Top ile dikdörtgen çarpışması; bounce ise en az örtüşen eksende sektirir
function collideRect(b, x, y, w, h, bounce) {
  const ddx = b.x - clamp(b.x, x, x + w), ddy = b.y - clamp(b.y, y, y + h);
  if (ddx * ddx + ddy * ddy > b.r * b.r) return false;
  if (bounce) {
    const ox = Math.min(b.x + b.r - x, x + w - (b.x - b.r)), oy = Math.min(b.y + b.r - y, y + h - (b.y - b.r));
    if (ox < oy) { b.dx = b.x < x + w / 2 ? -Math.abs(b.dx) : Math.abs(b.dx); b.x += b.dx > 0 ? ox : -ox; }
    else { b.dy = b.y < y + h / 2 ? -Math.abs(b.dy) : Math.abs(b.dy); b.y += b.dy > 0 ? oy : -oy; }
  }
  return true;
}
// Nokta (lazer ucu) bir dikdörtgenin içinde mi (lazer 12 px uzunluğunda)
const laserHits = (l, x, y, w, h) => l.x >= x && l.x <= x + w && l.y <= y + h && l.y + 12 >= y;
// Kara delikten fırlatma: yukarı doğru rastgele yön, hız patlamasıyla
function sling(b, h, m) {
  const a = -Math.PI / 2 + rnd(-1.1, 1.1);
  Object.assign(b, { dx: Math.cos(a) * m, dy: Math.sin(a) * m, x: h.x + Math.cos(a) * 30, y: h.y + Math.sin(a) * 30, boost: 1.8, trail: [] });
  sfx("sling");
  spawnParticles(h.x - 15, h.y - 15, "#c77dff", 14, 30, 30);
  addFloater(h.x, h.y - 30, "FIRLATMA!", "#c77dff");
}

// --- Raket vuruşu: ortaya yakın dik, uçlara yakın 60°'ye kadar eğik; hareketliyken falso, uçtan SMASH ---
function paddleHit(b) {
  const t = clamp((b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
  state.speed = Math.min(state.speed * 1.015, levelSpeed(state.level) * 1.3, MAX_SPEED);   // vuruş başı hızlanma
  state.combo = 0;
  playPaddleSound();
  paddle.flash = 1;
  spawnParticles(b.x, paddle.y, T().pad, 6, 24, 8);
  if (fxOn("magnet")) {
    // Mıknatıs: top rakete yapışır, tık/boşlukla (ya da 2.5 sn sonra) kalkar
    Object.assign(b, { stuck: true, stuckOff: b.x - (paddle.x + paddle.w / 2), caughtAt: state.time, spin: 0, boost: 1, y: paddle.y - b.r - 1 });
    return;
  }
  const ang = t * (Math.PI / 3), m = mag();
  b.dx = m * Math.sin(ang);
  b.dy = -m * Math.cos(ang);
  b.y = paddle.y - b.r;
  b.spin = clamp(paddle.vx / 700, -1, 1) * SPIN_MAX;
  if (Math.abs(t) > 0.8) {
    b.boost = Math.max(b.boost, 1.45);
    sfx("smash");
    addShake(2.5);
    spawnParticles(b.x - 12, paddle.y - 6, "#ffd166", 14, 24, 8);
    addFloater(b.x, paddle.y - 18, "SMASH!", "#ffd166");
  }
  if (Math.abs(b.spin) > 0.45) addFloater(b.x, paddle.y - 30, "FALSO", ZONE_STYLE.spin);
}

function moveBall(b, dt) {
  b.r += ((fxOn("big") ? 15 : 8) - b.r) * Math.min(1, dt * 8);
  if (b.stuck) {
    b.x = paddle.x + paddle.w / 2 + clamp(b.stuckOff, -paddle.w / 2, paddle.w / 2);
    b.y = paddle.y - b.r - 1;
    // Mıknatısla yakalanan top 2.5 sn sonra kendiliğinden kalkar
    if (state.mode === "playing" && b.caughtAt && state.time - b.caughtAt > 2.5) { releaseBall(b); sfx("launch"); }
    return;
  }
  b.boost = 1 + (b.boost - 1) * Math.exp(-BOOST_DECAY * dt);
  b.spin *= Math.exp(-SPIN_DECAY * dt);
  b.portalCd -= dt;
  b.rot += (b.spin * 6 + 4) * dt;
  // AĞIR YERÇEKİMİ: yukarı giden top ağırlaşır, düşen hızlanır (yön de aşağı bükülür)
  const m = mag() * b.boost * (curseOn("agir") ? (b.dy < 0 ? 0.78 : 1.3) : 1);
  setSpeed(b, m);               // hız hedefe kilitli: yavaşlatma bitince anında geri döner
  const fire = isFire();
  const wind = curseOn("ruzgar") ? state.windDir * 280 : 0, grav = curseOn("agir") ? 300 : 0;
  const wl = state.inset, wr = W - state.inset;
  // Tünelleme koruması: hareket top yarıçapından küçük alt adımlara bölünür
  const n = Math.max(1, Math.ceil(m * dt / 6)), sdt = dt / n;
  for (let i = 0; i < n && !b.gone; i++) {
    if (b.spin) rotate(b, b.spin * sdt);                // falso: kavisli uçuş
    for (const h of holes) {                            // kara delik yönü büker, çok yaklaşırsa fırlatır
      const hx = h.x - b.x, hy = h.y - b.y, d2 = hx * hx + hy * hy, d = Math.sqrt(d2) || 1;
      if (d < 18) { sling(b, h, m); continue; }
      const a = 1.2e7 / (d2 + 2500);
      b.dx += hx / d * a * sdt;
      b.dy += hy / d * a * sdt;
    }
    b.dx += wind * sdt;
    b.dy += grav * sdt;
    if (holes.length || b.spin || wind || grav) setSpeed(b, m);
    if (wind || grav) fixAngle(b);
    b.x += b.dx * sdt;
    b.y += b.dy * sdt;

    if (b.x - b.r < wl) wallHit(b, "L"); else if (b.x + b.r > wr) wallHit(b, "R");
    if (b.y - b.r < 0) {                                // tavan
      b.y = b.r;
      b.dy = Math.abs(b.dy);
      if (Math.abs(b.spin) > 0.05) { rotate(b, b.spin * 0.35); b.spin *= -0.6; b.dy = Math.abs(b.dy); }
      fixAngle(b);
      sfx("ceiling");
    }
    // Sahte toplar raketten geçer; YARIK RAKET'in ortasından gerçek top da geçer
    if (!b.decoy && b.dy > 0 && !(curseOn("yarik") && Math.abs(b.x - (paddle.x + paddle.w / 2)) < paddle.w * 0.125) &&
        b.y + b.r >= paddle.y && b.y - b.r <= paddle.y + paddle.h && b.x >= paddle.x - b.r && b.x <= paddle.x + paddle.w + b.r) {
      paddleHit(b);
      if (b.stuck) return;
    }
    const bo = state.boss;
    if (bo && !bo.dead && collideRect(b, bo.x, bo.y, bo.w, bo.h, true) && !b.decoy) hitBoss(fire ? 3 : ballDamage(), b.x, b.y);
    // Tuğlalar (adım başına tek tuğla); ateş topu kırılabilenleri sekmeden deler; sahte top kırmaz
    for (const br of bricks) {
      if (br.dead) continue;
      const pierce = fire && !br.unbreakable && !b.decoy;
      if (collideRect(b, br.x, br.y, BRICK.w, BRICK.h, !pierce)) {
        if (pierce) { damageBrick(br, 99); spawnParticles(br.x, br.y, "#ff6b35", 6); }
        else if (!b.decoy) damageBrick(br, ballDamage());
        break;
      }
    }
    for (const o of obstacles) {                        // gezgin bariyerler
      if (collideRect(b, o.x, o.y, o.w, o.h, true)) { sfx("clank"); spawnParticles(b.x - 4, b.y - 4, "#ffd166", 4, 8, 8); fixAngle(b); }
    }
    const uf = state.ufo;
    if (uf && !b.decoy && collideRect(b, uf.x, uf.y + 6, uf.w, uf.h - 6, true)) hitUfo();
    // Kalkan: alttan bir kez kurtarır
    if (!b.decoy && state.shield > 0 && b.dy > 0 && b.y + b.r >= H - 6) {
      b.y = H - 6 - b.r;
      b.dy = -Math.abs(b.dy);
      fixAngle(b);
      state.shield--;
      sfx("shield");
      addShake(2);
      spawnParticles(b.x - 20, H - 8, "#64dfdf", 12, 40, 4);
    }
    if (b.y - b.r > H + 20) b.gone = true;              // bu top kayboldu
  }
  if (b.gone) return;
  b.trail.push({ x: b.x, y: b.y });
  while (b.trail.length > TRAIL_LEN[settings.trail]) b.trail.shift();
  if (fire && particles.length < 380) {
    particles.push({ x: b.x + rnd(-b.r, b.r) * 0.6, y: b.y + rnd(-b.r, b.r) * 0.6, vx: rnd(-40, 40), vy: rnd(-200, -80),
                     size: rnd(2, 5), life: rnd(0.15, 0.35), color: Math.random() < 0.5 ? "#ff6b35" : "#ffd166" });
  }
}
function updateBalls(dt) {
  for (const b of balls) moveBall(b, dt);
  balls = balls.filter(b => !b.gone);
  if (state.mode === "playing" && !balls.some(b => !b.decoy)) {
    popDecoys();                // gerçek top kalmadıysa sahteler de söner
    loseLife();
  }
}
// Hareketli her toptan ±25° döndürülmüş iki kopya çıkar
function splitBalls() {
  for (const s of balls.filter(b => !b.stuck && !b.decoy)) {
    const base = Math.atan2(s.dy, s.dx);
    for (const a of [-0.45, 0.45]) {
      if (balls.length >= MAX_BALLS) return;
      balls.push(Object.assign(newBall(false), { x: s.x, y: s.y, dx: Math.cos(base + a) * mag(), dy: Math.sin(base + a) * mag() }));
    }
  }
}
function updatePowerups(dt) {
  powerups = powerups.filter(p => {
    p.y += p.vy * dt;
    if (p.y > H + 30) return false;
    if (p.y + p.h >= paddle.y && p.y <= paddle.y + paddle.h && p.x + p.w >= paddle.x && p.x <= paddle.x + paddle.w) {
      addShake(1.5);
      track("powers");
      applyPower(p.type);
      return false;
    }
    return true;
  });
}

// --- Lazer: raketin iki ucundan otomatik ateş; boss'u, UFO'yu ve mermileri vurur, bariyerde durur ---
function updateLasers(dt) {
  if (fxOn("laser") && (state.laserCd -= dt) <= 0) {
    state.laserCd = 0.28;
    lasers.push({ x: paddle.x + 6, y: paddle.y - 4 }, { x: paddle.x + paddle.w - 6, y: paddle.y - 4 });
    sfx("laser");
  }
  lasers = lasers.filter(l => {
    l.y -= 760 * dt;
    if (l.y < -12) return false;
    const br = bricks.find(br => !br.dead && laserHits(l, br.x, br.y, BRICK.w, BRICK.h));
    if (br) { damageBrick(br, 1); spawnParticles(l.x - 2, l.y, "#ff4d6d", 3, 4, 4); return false; }
    const bo = state.boss, uf = state.ufo;
    if (bo && !bo.dead && laserHits(l, bo.x, bo.y, bo.w, bo.h)) { hitBoss(1, l.x, l.y); return false; }
    if (obstacles.some(o => laserHits(l, o.x, o.y, o.w, o.h))) return false;
    if (uf && laserHits(l, uf.x, uf.y, uf.w, uf.h)) { hitUfo(); return false; }
    const u = bullets.find(u => !u.dead && Math.abs(u.x - l.x) < u.r + 2 && Math.abs(u.y - l.y) < u.r + 8);
    if (u) { u.dead = true; addScore(10); spawnParticles(u.x - 4, u.y - 4, "#ffd166", 6, 8, 8); return false; }
    return true;
  });
}

// --- Kara delik: 7 sn topları büker, sonunda çöküp çevresini yutar ---
function spawnHole() {
  if (holes.length >= 2) holes.shift();
  holes.push({ x: rnd(140, W - 140), y: rnd(230, 380), life: 7, rot: 0 });
  sfx("hole");
  addShake(4);
}
function updateHoles(dt) {
  for (const h of holes) { h.rot += dt * 3; if ((h.life -= dt) <= 0) collapseHole(h); }
  holes = holes.filter(h => h.life > 0);
}
function collapseHole(h) {
  sfx("boom");
  addShake(8);
  state.hitstop = Math.max(state.hitstop, 0.08);
  spawnParticles(h.x - 40, h.y - 40, "#c77dff", 30, 80, 80);
  for (const br of bricks) {
    if (!br.dead && !br.unbreakable && Math.hypot(br.x + BRICK.w / 2 - h.x, br.y + BRICK.h / 2 - h.y) < 95) { br.flash = 1; destroyBrick(br); }
  }
  const bo = state.boss;
  if (bo && !bo.dead && Math.hypot(bo.x + bo.w / 2 - h.x, bo.y + bo.h / 2 - h.y) < 140) hitBoss(5, h.x, h.y - 40);
  balls.forEach(fixAngle);
  checkLevelDone();
}

// --- Boss: gezer, raketi nişanlayan mermi atar; canı yarıya inince öfkelenir ---
function updateBoss(dt) {
  const bo = state.boss;
  if (!bo || bo.dead) return;
  bo.t += dt;
  bo.x += bo.vx * dt;
  if (bo.x < 20 || bo.x + bo.w > W - 20) { bo.x = clamp(bo.x, 20, W - 20 - bo.w); bo.vx = bo.x <= 20 ? Math.abs(bo.vx) : -Math.abs(bo.vx); }
  bo.y = bo.baseY + Math.sin(bo.t * 1.6) * 10;
  if (state.mode !== "playing") return;
  if ((bo.shootAt -= dt) <= 0) {   // öfkeliyken üçlü yelpaze
    bo.shootAt = bo.shootEvery;
    const n = bo.enraged ? 3 : 1, sx = bo.x + bo.w / 2, sy = bo.y + bo.h;
    const base = Math.atan2(paddle.y - sy, paddle.x + paddle.w / 2 - sx);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.28;
      bullets.push({ x: sx, y: sy, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 7, dead: false });
    }
    sfx("bossShoot");
  }
  if (bo.enraged && (bo.minionAt -= dt) <= 0) { bo.minionAt = 7; spawnMinions(); }
}
// Öfkeli boss altına (4. sıraya) en çok 4 yeni tuğla diker
function spawnMinions() {
  const row = 4, y = BRICK.top + row * (BRICK.h + BRICK.gap), free = [];
  for (let c = 0; c < COLS; c++) {
    const x = BRICK.left + c * (BRICK.w + BRICK.gap);
    if (bricks.some(b => !b.dead && b.row === row && b.col === c)) continue;
    if (balls.some(b => b.x + b.r > x && b.x - b.r < x + BRICK.w && b.y + b.r > y && b.y - b.r < y + BRICK.h)) continue;
    free.push(c);
  }
  for (let i = 0; i < 4 && free.length; i++) {
    const br = makeBrick(row, free.splice((Math.random() * free.length) | 0, 1)[0], Math.random() < 0.25 ? "E" : "1");
    br.flash = 1;
    bricks.push(br);
  }
  sfx("clack");
}
function hitBoss(dmg, x, y) {
  const bo = state.boss;
  if (!bo || bo.dead) return;
  bo.hp -= dmg;
  bo.flash = 1;
  bo.hits = (bo.hits || 0) + 1;
  sfx("bossHit");
  addShake(2);
  spawnParticles(x - 10, y - 10, "#ff4d6d", 8, 20, 20);
  addFloater(x, y - 10, "-" + dmg, "#ff4d6d");
  addScore(25 * dmg);
  if (bo.hits % 6 === 0) dropPowerupAt(bo.x + bo.w / 2, bo.y + bo.h, true);
  if (!bo.enraged && bo.hp <= bo.maxHp / 2) {
    bo.enraged = true;
    bo.vx *= 1.6;
    bo.shootEvery *= 0.65;
    callout("ÖFKELENDİ!", "#ff4d6d");
    sfx("bossRoar");
    addShake(6);
  }
  if (bo.hp <= 0) killBoss();
}
function killBoss() {
  const bo = state.boss, cx = bo.x + bo.w / 2, cy = bo.y + bo.h / 2;
  bo.dead = true;
  bo.hp = 0;
  for (let i = 0; i < 6; i++) spawnParticles(bo.x + i * bo.w / 6, bo.y, i % 2 ? "#ff4d6d" : "#ffd166", 18, bo.w / 6, bo.h);
  for (let i = 0; i < 15; i++) {           // gövde 5×3 parçaya ayrılır
    const c = i % 5, r = (i / 5) | 0;
    fragments.push({ x: bo.x + c * bo.w / 5, y: bo.y + r * bo.h / 3, w: bo.w / 5, h: bo.h / 3, vx: rnd(-260, 260), vy: rnd(-420, -120),
                     rot: 0, vr: rnd(-8, 8), life: 1.4, color: (c + r) % 2 ? "#c9184a" : "#ff4d6d" });
  }
  spawnCoins(cx, cy, 40);
  sfx("bossDie");
  sfx("coin");
  addShake(14);
  state.hitstop = 0.12;
  state.slowmo = 1.6;
  bullets = [];
  for (const br of bricks) if (!br.dead && !br.unbreakable) { br.dead = true; spawnFragments(br, brickColor(br)); }   // kalanlar puansız dağılır
  const bonus = 5000 * Math.ceil(state.level / 5);
  addScore(bonus);
  addFloater(cx, cy, "+" + bonus, "#ffd166");
  callout(bo.name + " YENİLDİ!", "#ffd166");
  track("bosses");
  battleCharge(12);
  checkLevelDone();
}
// Boss mermileri ve meteorlar: rakete değerse raket sersemler (küçülür)
function updateBullets(dt) {
  bullets = bullets.filter(u => {
    u.x += u.vx * dt;
    u.y += u.vy * dt;
    if (u.dead || u.y > H + 20 || u.x < -20 || u.x > W + 20) return false;
    if (u.y + u.r >= paddle.y && u.y - u.r <= paddle.y + paddle.h && u.x >= paddle.x - u.r && u.x <= paddle.x + paddle.w + u.r) {
      state.stunUntil = state.time + FX_TIME.stun;
      sfx("stun");
      addShake(5);
      spawnParticles(u.x - 10, paddle.y - 5, "#ff4d6d", 14, 20, 10);
      addFloater(paddle.x + paddle.w / 2, paddle.y - 20, "SERSEMLEDİN!", "#ff4d6d");
      return false;
    }
    return true;
  });
}
