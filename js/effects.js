// ======================================================================
// 8. EFEKTLER: parçacık, tuğla parçaları, çatlaklar, yıldırım, yazılar, sarsıntı
// ======================================================================
const addShake = p => { state.shake = Math.max(state.shake, p * SHAKE_SCALE[settings.shake]); };
const particleCap = () => 400 * Math.max(1, PARTICLE_MUL[settings.particles]);
// Parçacık yoğunluğu ayarına göre kaç tane üretileceği
const scaled = n => Math.max(1, Math.round(n * PARTICLE_MUL[settings.particles]));

function spawnParticles(x, y, color, count = 12, sw = BRICK.w, sh = BRICK.h) {
  for (let i = scaled(count); i > 0 && particles.length <= particleCap(); i--) {
    const a = rnd(0, TAU), s = rnd(60, 260);
    particles.push({ x: rnd(x, x + sw), y: rnd(y, y + sh), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, size: rnd(2, 5), life: rnd(0.35, 0.7), color });
  }
}
// Altın yağmuru: yukarı fışkırıp düşen sarı parçacıklar
function spawnCoins(x, y, count) {
  for (let i = scaled(count); i > 0 && particles.length <= particleCap(); i--) {
    particles.push({ x, y, vx: rnd(-220, 220), vy: rnd(-520, -200), size: rnd(4, 7), life: rnd(0.8, 1.3), color: Math.random() < 0.5 ? "#ffd60a" : "#ffc300" });
  }
}
function addFloater(x, y, text, color) {
  if (floaters.length > 30) floaters.shift();
  floaters.push({ x, y, text, color, life: 0.8 });
}
// Ekran ortasında büyüyerek beliren dev yazı (combo, boss, ÇILGIN MOD, lanet)
const callout = (text, color) => { state.callout = { text, color: color || T().b2, life: 1.3 }; };

// Zikzaklı yıldırım (iki nokta arası), kısa süre ekranda kalır
function addBolt(x1, y1, x2, y2) {
  const pts = [[x1, y1]];
  for (let i = 1; i < 7; i++) pts.push([x1 + (x2 - x1) * i / 7 + rnd(-14, 14), y1 + (y2 - y1) * i / 7 + rnd(-14, 14)]);
  pts.push([x2, y2]);
  bolts.push({ pts, life: 0.28 });
}
// Kırılan tuğla 3×2 dönen parçaya ayrılır
function spawnFragments(b, color = hpColor(b.maxHp)) {
  const pw = BRICK.w / 3, ph = BRICK.h / 2;
  for (let i = 0; i < 6; i++) {
    fragments.push({ x: b.x + (i % 3) * pw, y: b.y + (i > 2 ? ph : 0), w: pw, h: ph, vx: rnd(-90, 90), vy: rnd(-160, -40), rot: 0, vr: rnd(-6, 6), life: 0.8, color });
  }
}
// Hasar aldıkça artan, tuğla başına hep aynı çıkan çatlaklar
function makeCracks(b) {
  const rand = seeded(b.row * 73 + b.col * 131 + b.maxHp * 7);
  return Array.from({ length: (b.maxHp - b.hp) * 2 }, () => {
    let x = rand() * BRICK.w, y = rand() * BRICK.h;
    const pts = [[x, y]];
    for (let s = 2 + ((rand() * 2) | 0); s > 0; s--) pts.push([clamp((x += (rand() - 0.5) * 30), 0, BRICK.w), clamp((y += (rand() - 0.5) * 16), 0, BRICK.h)]);
    return pts;
  });
}

// Basit hareket + ömür: liste elemanlarını ilerletir, bitenleri atar
function age(list, dt, gravity, keep) {
  for (const p of list) { p.vy += gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt; p.life -= dt; }
  return list.filter(keep);
}
function updateEffects(dt) {
  particles = age(particles, dt, 900, p => p.life > 0 && p.y < H + 20);
  fragments = age(fragments, dt, 1100, f => f.life > 0 && f.y < H + 40);
  for (const b of bricks) { b.flash = Math.max(0, b.flash - dt * 7); b.wob = Math.max(0, (b.wob || 0) - dt * 4); }
  updateGlints(dt);
  paddle.flash = Math.max(0, paddle.flash - dt * 6);
  state.buildFade = Math.min(COLS, state.buildFade + dt * 4);   // belirme animasyonu her ekranda ilerler

  // Arka plan parçacıkları süzülür (kar sallanır, kabarcık yükselir, matrix akar)
  const fx = settings.bgFx;
  if (fx === "kabarcik") {
    for (const s of stars) { s.y -= s.v * 2.5 * dt; s.x += Math.sin(state.time * 2 + s.ph) * 12 * dt; if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W; } }
  } else if (fx === "matrix") {
    for (const c of matrixCols) { c.y += c.v * dt; if (c.y - 160 > H) { c.y = rnd(-120, 0); c.v = rnd(50, 160); } }
  } else {
    const sp = (fx === "kar" ? 2.5 : 1) * musicWarp();
    for (const s of stars) {
      s.y += s.v * sp * dt;
      if (fx === "kar") s.x += Math.sin(state.time + s.ph) * 18 * dt;
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
    }
  }
  for (const f of floaters) { f.y -= 42 * dt; f.life -= dt; }
  floaters = floaters.filter(f => f.life > 0);
  for (const z of zones) z.flash = Math.max(0, z.flash - dt * 4);
  for (const bo of bolts) bo.life -= dt;
  bolts = bolts.filter(bo => bo.life > 0);
  if (state.callout && (state.callout.life -= dt) <= 0) state.callout = null;
  if (state.boss) state.boss.flash = Math.max(0, state.boss.flash - dt * 6);
  state.shake = Math.max(0, state.shake - dt * 18);
}
