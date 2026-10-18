// ======================================================================
// 12. ÇİZİM: tuğla sprite'ları, dünya, HUD ve durum ekranları
// ======================================================================
// --- Tuğlalar: gövde + ikon renk/stil/tür başına bir kez sprite'a çizilir ---
const SPRITE_PAD = 4;           // gölge payı
const brickSprites = new Map();
const easeOutBack = t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
const brickKind = b => b.unbreakable ? "un" : b.explosive ? "ex" : b.electric ? "el" : b.gold ? "gold" : b.splitter ? "split" : "n";
const roundedStyle = () => settings.brickStyle === "parlak" || settings.brickStyle === "yuvarlak";

function brickSprite(col, kind) {
  const key = settings.brickStyle + "|" + col + "|" + kind;
  let c = brickSprites.get(key);
  if (c) return c;
  if (brickSprites.size > 400) brickSprites.clear();
  c = el("canvas", { width: Math.ceil((BRICK.w + SPRITE_PAD * 2) * DPR), height: Math.ceil((BRICK.h + SPRITE_PAD * 2) * DPR) });
  const g = c.getContext("2d");
  g.scale(DPR, DPR);
  g.translate(SPRITE_PAD, SPRITE_PAD);
  paintBrickBody(g, col, settings.brickStyle);
  paintBrickIcon(g, kind, col);
  brickSprites.set(key, c);
  return c;
}
// Sprite'ı (x, y) tuğla köşesine, istenirse ölçekli çiz
const blitBrick = (c, x, y, sc = 1) => ctx.drawImage(c, x - SPRITE_PAD * sc, y - SPRITE_PAD * sc, (BRICK.w + SPRITE_PAD * 2) * sc, (BRICK.h + SPRITE_PAD * 2) * sc);

// Tuğla gövdesi: Parlak / Düz / Yuvarlak / 3D / Cam / Neon (yerel koordinat 0,0)
function paintBrickBody(g, col, style) {
  const w = BRICK.w, h = BRICK.h;
  const rect = (x, y, rw, rh, c) => { g.fillStyle = c; g.fillRect(x, y, rw, rh); };
  const frame = (inset, lw, c) => { g.strokeStyle = c; g.lineWidth = lw; g.strokeRect(inset, inset, w - inset * 2, h - inset * 2); };
  if (style === "parlak") {
    fillRR(1.5, 3, w, h, 6, "rgba(0,0,0,0.32)", g);                                            // gölge
    fillRR(0, 0, w, h, 6, lgrad(0, 0, 0, h, [[0, shade(col, 0.32)], [0.55, col], [1, shade(col, -0.32)]], g), g);
    fillRR(3, 2, w - 6, h * 0.42, 4, lgrad(0, 0, 0, h * 0.5, ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.04)"], g), g);   // cam parlaması
    g.strokeStyle = shade(col, -0.45);
    g.lineWidth = 1;
    rrPath(0.5, 0.5, w - 1, h - 1, 6, g);
    g.stroke();
  } else if (style === "yuvarlak") fillRR(0, 0, w, h, 8, col, g);
  else if (style === "3d") {
    rect(0, 0, w, h, col);
    rect(0, 0, w, 3, "rgba(255,255,255,0.38)"); g.fillRect(0, 0, 3, h);
    rect(0, h - 3, w, 3, "rgba(0,0,0,0.38)"); g.fillRect(w - 3, 0, 3, h);
  } else if (style === "cam") {
    rect(0, 0, w, h, hexToRgba(col, 0.28));
    frame(1, 2, col);
    rect(4, 4, w - 8, 4, "rgba(255,255,255,0.2)");
  } else if (style === "neon") {
    rect(0, 0, w, h, hexToRgba(col, 0.14));
    frame(2, 6, hexToRgba(col, 0.3));
    frame(2, 2, col);
  } else rect(0, 0, w, h, col);
}
// Özel tuğla ikonları (durağan kısım; kıvılcım/parıltı her karede ayrıca çizilir)
function paintBrickIcon(g, kind, col) {
  const w = BRICK.w, h = BRICK.h, cx = w / 2, cy = h / 2;
  if (kind === "un") {          // fırçalanmış metal + köşe perçinleri
    g.strokeStyle = "rgba(255,255,255,0.08)";
    g.lineWidth = 1;
    g.beginPath();
    for (let y = 4; y < h - 2; y += 3) { g.moveTo(10, y + 0.5); g.lineTo(w - 10, y + 0.5); }
    g.stroke();
    for (const [x, y] of [[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]]) { circle(x, y, 2.4, shade(col, -0.45), g); circle(x - 0.7, y - 0.7, 0.9, "rgba(255,255,255,0.55)", g); }
  } else if (kind === "ex") {   // bomba + fitil
    g.strokeStyle = "#8b5a2b";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx + 4, cy - 4);
    g.quadraticCurveTo(cx + 9, cy - 9, cx + 8, cy - 9);
    g.stroke();
    circle(cx, cy + 1, 6.5, "#1d1d1d", g);
    circle(cx - 2.2, cy - 1.2, 1.8, "rgba(255,255,255,0.45)", g);
  } else if (kind === "el") {   // şimşek
    g.fillStyle = "#ffe066";
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 1;
    path([[cx + 3, 2], [cx - 6, cy + 1], [cx - 1, cy + 1], [cx - 4, h - 2], [cx + 6, cy - 2], [cx + 1, cy - 2]], true, g);
    g.fill();
    g.stroke();
  } else if (kind === "gold") { // altın para
    const cg = g.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 8);
    cg.addColorStop(0, "#fff3b0");
    cg.addColorStop(1, "#e0a800");
    circle(cx, cy, 7.5, cg, g);
    g.strokeStyle = "#a87400";
    g.lineWidth = 1.2;
    g.stroke();
    Object.assign(g, { fillStyle: "#7a5200", font: "bold 11px monospace", textAlign: "center", textBaseline: "middle" });
    g.fillText("$", cx, cy + 0.5);
  } else if (kind === "split") { // ikiz top
    for (const ox of [-7, 7]) {
      circle(cx + ox + 1, cy + 1.5, 4.3, "rgba(0,0,0,0.25)", g);
      const bg = g.createRadialGradient(cx + ox - 1.5, cy - 1.5, 0.5, cx + ox, cy, 4.5);
      bg.addColorStop(0, "#ffffff");
      bg.addColorStop(1, "#cfeee6");
      circle(cx + ox, cy, 4.3, bg, g);
    }
  }
}

function drawBricks() {
  const rounded = roundedStyle();
  for (const b of bricks) {
    const a = clamp(state.buildFade - b.row, 0, 1);    // bölüm başında satır satır "pop" ile belirme
    if (b.dead || a <= 0) continue;
    let jx = 0, jy = 0;                                 // kara deliğe yakın tuğlalar titrer
    for (const h of holes) if (Math.hypot(b.x + BRICK.w / 2 - h.x, b.y + BRICK.h / 2 - h.y) < 95) { jx = rnd(-1.5, 1.5); jy = rnd(-1.5, 1.5); }
    const x = b.x + jx, y = b.y + jy, cx = x + BRICK.w / 2, cy = y + BRICK.h / 2;
    const pop = a < 1 ? Math.max(0.01, easeOutBack(a)) : 1;
    const wob = b.wob > 0 ? Math.sin(b.wob * Math.PI * 3) * 0.09 * b.wob : 0;   // vuruşta esneme
    const dz = musicDance(b);                           // müzikle tuğla dansı
    const tf = pop !== 1 || wob !== 0 || dz !== NO_DANCE;
    if (tf) {
      ctx.save();
      ctx.translate(cx, cy + dz.dy);
      ctx.scale(pop * (1 + wob) * dz.s, pop * (1 - wob) * dz.s);
      ctx.translate(-cx, -cy);
    }
    ctx.globalAlpha = a;
    const col = brickColor(b), kind = brickKind(b);
    blitBrick(brickSprite(col, kind), x, y);
    if (kind === "ex") {                                // fitil kıvılcımı
      for (let i = 0; i < 3; i++) { ctx.fillStyle = Math.random() < 0.5 ? "#ffd166" : "#ff6b35"; ctx.fillRect(cx + 8 + rnd(-2.5, 2.5), cy - 10 + rnd(-2.5, 2.5), 2, 2); }
    } else if (kind === "el" && Math.random() < 0.12) { // ara ara kıvılcım yayı
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.2;
      path([[x + 4, cy + rnd(-6, 6)], ...[1, 2, 3, 4, 5].map(i => [x + 4 + i * (BRICK.w - 8) / 5, cy + rnd(-7, 7)])]);
      ctx.stroke();
    } else if (kind === "gold") {                       // tuğlaya kırpılmış kayan parıltı
      ctx.save();
      rrPath(x, y, BRICK.w, BRICK.h, rounded ? 6 : 0);
      ctx.clip();
      const sx = x + ((state.time * 90 + b.col * 37) % (BRICK.w + 60)) - 30;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      path([[sx, y], [sx + 10, y], [sx - 2, y + BRICK.h], [sx - 12, y + BRICK.h]]);
      ctx.fill();
      ctx.restore();
    }
    if (b.cracks) {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      for (const pts of b.cracks) { path(pts.map(([px, py]) => [x + px, y + py])); ctx.stroke(); }
    }
    // HP noktacıkları: kalan dayanıklılık kadar, sağ üstten sola (çatlakların üstüne)
    if (settings.hpDots && !b.unbreakable && !b.explosive) {
      const dc = dotColorFor(col);
      ctx.strokeStyle = dc === HP_DOT.dark ? HP_DOT.light : HP_DOT.dark;
      ctx.lineWidth = 1;
      for (let i = 0; i < b.hp; i++) {
        circle(x + BRICK.w - HP_DOT.pad - HP_DOT.size / 2 - i * (HP_DOT.size + HP_DOT.gap), y + HP_DOT.pad + HP_DOT.size / 2, HP_DOT.size / 2, dc);
        ctx.stroke();
      }
    }
    if (b.flash > 0) { ctx.globalAlpha = a * b.flash * 0.85; fillRR(x, y, BRICK.w, BRICK.h, rounded ? 6 : 0, "#ffffff"); }
    ctx.globalAlpha = 1;
    if (tf) ctx.restore();
  }
}
// Parıltılar: ara ara rastgele bir tuğlada beliren dört köşeli yıldız
let glints = [], glintCd = 0;
function updateGlints(dt) {
  if ((glintCd -= dt) <= 0) {
    glintCd = rnd(0.2, 0.55);
    const alive = bricks.filter(b => !b.dead && state.buildFade - b.row >= 1);
    if (alive.length) glints.push({ b: pick(alive), ox: rnd(8, BRICK.w - 8), oy: rnd(3, 8), life: 0.55 });
  }
  for (const g of glints) g.life -= dt;
  glints = glints.filter(g => g.life > 0 && !g.b.dead);
}
// Dört köşeli yıldız (s = yarıçap, t = bel inceliği)
const star4 = (x, y, s, t = 0.25) => path([[x, y - s], [x + s * t, y - s * t], [x + s, y], [x + s * t, y + s * t], [x, y + s], [x - s * t, y + s * t], [x - s, y], [x - s * t, y - s * t]], true);
function drawGlints() {
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.9;
  for (const g of glints) { star4(g.b.x + g.ox, g.b.y + g.oy, Math.sin((g.life / 0.55) * Math.PI) * 5); ctx.fill(); }
  ctx.globalAlpha = 1;
}

// --- Arka plan efekti: yıldız / kar / kabarcık / matrix / synthwave ızgara ---
const MATRIX_CH = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ#$%";
function drawStars() {
  const fx = settings.bgFx;
  if (fx === "yildiz") {
    ctx.fillStyle = T().star;
    const streak = 1 + (musicWarp() - 1) * 2.5;         // müzikle hızlanınca yıldızlar çizgiye döner
    for (const s of stars) ctx.fillRect(s.x, s.y, s.s, s.s * streak);
  } else if (fx === "kar") {
    for (const s of stars) circle(s.x, s.y, s.s * 1.5, hexToRgba(T().dim, 0.55));
  } else if (fx === "kabarcik") {
    ctx.strokeStyle = hexToRgba(T().dim, 0.4);
    ctx.lineWidth = 1;
    for (const s of stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 4, 0, TAU); ctx.stroke(); }
  } else if (fx === "matrix") {
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    const tick = Math.floor(state.time * 8);
    matrixCols.forEach((c, ci) => {
      for (let k = 0; k < 10; k++) {
        const y = c.y - k * 16;
        if (y < -16 || y > H + 16) continue;
        ctx.fillStyle = hexToRgba(T().accent, k === 0 ? 0.5 : 0.3 * (1 - k / 10));
        ctx.fillText(MATRIX_CH[(ci * 7 + k * 13 + tick) % MATRIX_CH.length], c.x, y);
      }
    });
  } else if (fx === "izgara") {
    const hy = 300, shift = (state.time * 0.6) % 1;       // ufuk çizgisi, akan yatay çizgiler
    ctx.strokeStyle = hexToRgba(T().accent, 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -12; i <= 12; i++) { ctx.moveTo(W / 2 + i * 22, hy); ctx.lineTo(W / 2 + i * 150, H); }
    for (let k = 0; k < 10; k++) { const y = hy + (H - hy) * ((k + shift) / 10) ** 2; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.fillStyle = hexToRgba(T().accent, 0.25);
    ctx.fillRect(0, hy, W, 1);
  }
}
// Duvar bölgeleri: kenarda parlayan şeritler (tampon okları, falso kavisi, portal halkası)
function drawZones() {
  for (const z of zones) {
    const col = ZONE_STYLE[z.type], L = z.side === "L", inward = L ? 1 : -1;
    const x = L ? state.inset : W - state.inset - 8, ex = L ? state.inset + 8 : W - state.inset - 8;
    ctx.globalAlpha = Math.min(1, 0.45 + 0.2 * Math.sin(state.time * 4 + z.y) + z.flash * 0.5);
    ctx.fillStyle = col;
    ctx.fillRect(x, z.y, 8, z.h);
    if (z.flash > 0) { ctx.globalAlpha = z.flash * 0.35; ctx.fillRect(L ? state.inset : W - state.inset - 30, z.y - 6, 30, z.h + 12); }
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = col;
    if (z.type === "bumper") {
      for (let i = 0; i < 3; i++) { const yy = z.y + 14 + i * 21; path([[ex, yy - 6], [ex + 7 * inward, yy], [ex, yy + 6]]); ctx.fill(); }
    } else if (z.type === "spin") {
      const a0 = state.time * 6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex + 2 * inward, z.y + z.h / 2, 9, a0, a0 + Math.PI * 1.3);
      ctx.stroke();
    } else {
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -state.time * 30;
      ctx.beginPath();
      ctx.ellipse(L ? state.inset : W - state.inset, z.y + z.h / 2, 13, z.h / 2, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
}
// Boss: gövde, taç, topu izleyen gözler, öfkeyle açılan ağız
function drawBoss() {
  const bo = state.boss;
  if (!bo || bo.dead) return;
  const { x, y, w, h } = bo, rage = bo.enraged ? 0.5 + 0.5 * Math.sin(state.time * 12) : 0;
  fillRR(x, y, w, h, 12, bo.enraged ? `rgb(${200 + rage * 55 | 0},${30 + rage * 40 | 0},50)` : "#c9184a");
  fillRR(x, y + h - 12, w, 12, 6, "rgba(0,0,0,0.25)");
  ctx.fillStyle = "#ffd166";    // taç
  path([[x + 50, y + 2], ...[0, 1, 2, 3, 4].flatMap(i => [[x + 50 + i * 25, y - (i % 2 ? 6 : 16)], ...(i < 4 ? [[x + 62 + i * 25, y + 2]] : [])]), [x + 150, y + 2]]);
  ctx.fill();
  const target = balls.find(b => !b.stuck) || balls[0] || { x: paddle.x + paddle.w / 2, y: paddle.y };
  for (const ex of [x + w * 0.32, x + w * 0.68]) {
    const ey = y + h * 0.4, a = Math.atan2(target.y - ey, target.x - ex), inner = ex < x + w / 2 ? 1 : -1;
    circle(ex, ey, 11, "#ffffff");
    circle(ex + Math.cos(a) * 5, ey + Math.sin(a) * 5, 5, "#1a1a2e");
    ctx.strokeStyle = "#1a1a2e";  // çatık kaş
    ctx.lineWidth = 4;
    path([[ex - 13 * inner, ey - 16], [ex + 10 * inner, ey - (bo.enraged ? 8 : 12)]]);
    ctx.stroke();
  }
  const mw = w * 0.3, mx = x + w * 0.35, my = y + h * 0.66;   // ağız + dişler
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(mx, my, mw, bo.enraged ? 12 + rage * 4 : 6);
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 5; i++) ctx.fillRect(mx + 3 + i * (mw - 6) / 5, my, (mw - 6) / 5 - 3, 4);
  if (bo.flash > 0) { ctx.globalAlpha = bo.flash * 0.7; fillRR(x, y, w, h, 12, "#ffffff"); ctx.globalAlpha = 1; }
}
function drawHoles() {
  for (const h of holes) {
    const grow = Math.min(1, (7 - h.life) * 3) * (h.life < 0.6 ? h.life / 0.6 : 1);
    const pulse = h.life < 1.5 ? 1 + 0.15 * Math.sin(state.time * 30) : 1;
    ctx.lineWidth = 3;          // toplanma diski: dönen yaylar
    for (let i = 0; i < 4; i++) {
      const a0 = h.rot * (1 + i * 0.3) + i;
      ctx.strokeStyle = i % 2 ? "rgba(199,125,255,0.7)" : "rgba(255,93,143,0.5)";
      ctx.beginPath();
      ctx.arc(h.x, h.y, (30 + i * 12) * grow * pulse, a0, a0 + Math.PI * 0.9);
      ctx.stroke();
    }
    circle(h.x, h.y, 20 * grow * pulse, "#000000");
    ctx.strokeStyle = "#c77dff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
function drawPaddle() {
  const { x, y, w, h } = paddle;
  // GÖRÜNMEZ RAKET: yalnızca vuruşta ve ara ara bir anlık belirir
  if (curseOn("gorunmez")) ctx.globalAlpha = Math.max(paddle.flash * 0.9, (state.time % 1.6) < 0.1 ? 0.45 : 0.03);
  const blink = fxOn("stun") && Math.floor(state.time * 12) % 2, pcol = blink ? "#ff4d6d" : T().pad, ps = settings.paddleStyle;
  if (ps === "koseli") { ctx.fillStyle = pcol; ctx.fillRect(x, y, w, h); }
  else if (ps === "neon") {
    fillRR(x, y, w, h, 6, hexToRgba(pcol, 0.18));
    for (const [lw, c] of [[6, hexToRgba(pcol, 0.35)], [2, pcol]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
  } else if (ps === "gokkusagi") {
    const h0 = state.time * 120;
    fillRR(x, y, w, h, 6, blink ? "#ff4d6d" : lgrad(x, 0, x + w, 0, [0, 1, 2, 3, 4].map(i => `hsl(${(h0 + i * 70) % 360},90%,62%)`)));
  } else {                      // parlak: gölge + dikey degrade + vurgu renginde uç kapakları + üst parlama
    fillRR(x + 2, y + 4, w, h, 7, "rgba(0,0,0,0.3)");
    fillRR(x, y, w, h, 7, lgrad(0, y, 0, y + h, [shade(pcol, 0.45), pcol, shade(pcol, -0.35)]));
    fillRR(x, y, 9, h, [7, 0, 0, 7], T().accent);
    fillRR(x + w - 9, y, 9, h, [0, 7, 7, 0]);
    fillRR(x + 8, y + 2, w - 16, 3, 2, "rgba(255,255,255,0.45)");
  }
  if (fxOn("magnet")) fillRR(x + 6, y + 4, w - 12, 6, 3, "#b388eb");
  if (fxOn("laser")) { ctx.fillStyle = "#ff4d6d"; ctx.fillRect(x + 3, y - 7, 6, 9); ctx.fillRect(x + w - 9, y - 7, 6, 9); }
  if (fxOn("reverse")) text("⇄ TERS ⇄", x + w / 2, y + h + 14, "bold 12px monospace", "#ff4d6d");
  if (paddle.flash > 0) { ctx.globalAlpha = paddle.flash * 0.7; fillRR(x, y, w, h, 6, "#ffffff"); ctx.globalAlpha = 1; }
  if (curseOn("yarik")) {       // YARIK RAKET: ortadaki boşluk (top buradan düşer)
    const gx = x + w * 0.375, gw = w * 0.25;
    ctx.clearRect(gx, y - 2, gw, h + 4);
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(gx - 2, y - 3, 2, h + 6);
    ctx.fillRect(gx + gw, y - 3, 2, h + 6);
  }
  ctx.globalAlpha = 1;
  if (state.shield > 0) {       // kalkan çizgisi
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(state.time * 8);
    ctx.fillStyle = "#64dfdf";
    ctx.fillRect(0, H - 6, W, 3);
    ctx.globalAlpha = 1;
  }
}
function drawBalls() {
  const fire = isFire(), ballCol = fire ? "#ff6b35" : T().ball, rainbow = settings.trail === "gokkusagi";
  for (const b of balls) {
    // HAYALET TOP: rakete yaklaşana kadar yalnızca ara ara görünür
    const ghostA = curseOn("hayalet") && b.y < paddle.y - 80 ? ((state.time * 2.2 + b.x * 0.004) % 1 < 0.1 ? 0.6 : 0.04) : 1;
    b.trail.forEach((t, i) => {
      const f = i / b.trail.length;
      ctx.globalAlpha = f * (fire || rainbow ? 0.5 : 0.25) * ghostA;
      circle(t.x, t.y, b.r * (0.4 + 0.6 * f), fire ? (i % 2 ? "#ffd166" : "#ff6b35") : rainbow ? `hsl(${(i * 24 + state.time * 240) % 360},90%,62%)` : T().ball);
    });
    if (b.boost > 1.1) { ctx.globalAlpha = clamp((b.boost - 1) * 0.8, 0, 0.6) * ghostA; circle(b.x, b.y, b.r + 6, "#ffffff"); }   // hız patlaması halesi
    ctx.globalAlpha = 0.28 * ghostA;
    circle(b.x + 3, b.y + 4, b.r, "#000000");          // zemine düşen gölge
    ctx.globalAlpha = ghostA;
    drawBallShape(b, ballCol);
    if (Math.abs(b.spin) > 0.15) {                      // falso göstergesi: dönen çizgi
      const c = Math.cos(b.rot) * b.r * 0.8, s = Math.sin(b.rot) * b.r * 0.8;
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2;
      path([[b.x + c, b.y + s], [b.x - c, b.y - s]]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
// Top şekli (çarpışma her zaman daire; şekil yalnızca görünüş ve topla birlikte döner)
function drawBallShape(b, col) {
  const { x, y, r, rot } = b, ring = (n, rad) => path(Array.from({ length: n }, (_, i) => { const a = rot + i * TAU / n; return [x + Math.cos(a) * rad(i), y + Math.sin(a) * rad(i)]; }), true);
  ctx.fillStyle = col;
  switch (settings.ballShape) {
    case "kare":
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7); ctx.restore();
      return;
    case "elmas": ring(4, () => r * 1.15); break;
    case "yildiz": ring(10, i => (i % 2 ? r * 0.5 : r * 1.25)); break;
    case "halka":
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.75, 0, TAU);
      ctx.stroke();
      return;
    default: {                  // parlak küre: üst-solda ışık lekesi
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      [[0, shade(col, 0.7)], [0.6, col], [1, shade(col, -0.25)]].forEach(([o, c]) => g.addColorStop(o, c));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
    }
  }
  ctx.fill();
}
function drawLasersAndBullets() {
  ctx.fillStyle = "#ff4d6d";
  for (const l of lasers) ctx.fillRect(l.x - 1.5, l.y, 3, 12);
  for (const u of bullets) {
    if (u.meteor) {             // alevli kuyruklu kaya
      ctx.strokeStyle = "rgba(255,140,60,0.45)";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      path([[u.x - u.vx * 0.12, u.y - u.vy * 0.12], [u.x, u.y]]);
      ctx.stroke();
      ctx.lineCap = "butt";
      circle(u.x, u.y, u.r, "#7f6a55");
      circle(u.x - 3, u.y - 2, 3, "#4a3b2c");
    } else {
      circle(u.x, u.y, u.r + 4, "rgba(255,77,109,0.35)");
      circle(u.x, u.y, u.r, "#ffd166");
    }
  }
}
function drawBolts() {
  for (const bo of bolts) {
    ctx.globalAlpha = clamp(bo.life / 0.28, 0, 1);
    for (const [lw, col] of [[6, "rgba(157,78,221,0.6)"], [2, "#ffffff"]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; path(bo.pts); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

// --- HUD ---
// Süreli efekt hapları: [zamanlayıcı, yazı, renk, toplam süre] — kalan süre hap içinde çubukla görünür
const EFFECT_TAGS = [
  ["fever", "ÇILGIN", "#ff5d8f", FEVER_TIME], ["wide", "GENİŞ", POWERS.W.color, WIDE_TIME], ["slow", "YAVAŞ", POWERS.S.color, SLOW_TIME],
  ["fire", "ATEŞ", POWERS.F.color], ["laser", "LAZER", POWERS.L.color], ["magnet", "YAPIŞ", POWERS.Y.color], ["big", "DEV", POWERS.D.color],
  ["reverse", "TERS", "#ff4d6d"], ["mini", "MİNİ", "#ff4d6d"], ["haste", "HIZ", "#ff4d6d"], ["stun", "SERSEM", "#ff4d6d"],
];
function activeEffects() {
  const list = [];
  const add = (until, label, color, total) => {
    const left = until - state.time;
    if (left > 0) list.push({ text: label + " " + Math.ceil(left), color, frac: total ? clamp(left / total, 0, 1) : null });
  };
  for (const [k, label, color, total] of EFFECT_TAGS) add(k === "wide" ? paddle.wideUntil : state[k + "Until"], label, color, total || FX_TIME[k]);
  if (state.shield > 0) list.push({ text: "KALKAN×" + state.shield, color: POWERS.K.color, frac: null });
  const ac = activeCurses();
  for (const k of ac) add(state.curses[k], "⚠" + CURSES[k].short, CURSE_COLOR, curseDur(k));
  if (ac.length) list.push({ text: "BONUS×1.5", color: CURSE_COLOR, frac: null });
  return list;
}
function drawHeart(x, y, s, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.78, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.78, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fillStyle = fill;
  ctx.fill();
}
// Yuvarlak köşeli hap: yarı saydam dolgu + kenar + isteğe bağlı ilerleme çubuğu
function drawPill(x, y, w, h, color, frac) {
  fillRR(x, y, w, h, h / 2, hexToRgba(color, 0.2));
  ctx.strokeStyle = hexToRgba(color, 0.75);
  ctx.lineWidth = 1;
  ctx.stroke();
  if (frac != null) fillRR(x + 4, y + h - 3, (w - 8) * frac, 2, 1, color);
}
function drawHUD() {
  ctx.fillStyle = lgrad(0, 0, 0, 72, [hexToRgba(T().bg, 0.8), hexToRgba(T().bg, 0)]);   // üstte yumuşak koyulaşma
  ctx.fillRect(0, 0, W, 72);
  text("SKOR", 20, 16, "bold 10px monospace", T().dim, "left");
  text(String(state.score), 20, 38, "bold 22px monospace", T().text, "left");
  const scoreW = ctx.measureText(String(state.score)).width;
  text("REKOR " + state.high, 20, 55, "11px monospace", T().dim, "left");
  const colX = Math.max(160, 34 + Math.max(scoreW, ctx.measureText("REKOR " + state.high).width));
  if (state.combo >= 2) {
    const ccol = isFever() ? hslHex(state.time * 400, 90, 62) : T().b2, txt = "COMBO ×" + state.combo;
    ctx.font = "bold 13px monospace";
    drawPill(colX, 14, ctx.measureText(txt).width + 18, 22, ccol, null);
    text(txt, colX + 9, 30, ctx.font, ccol, "left");
  }
  let ex = colX, ey = 41;       // efekt hapları (sığmazsa alt satıra)
  ctx.font = "bold 10px monospace";
  for (const e of activeEffects()) {
    const pw = ctx.measureText(e.text).width + 14;
    if (ex + pw > (battle.active ? W - 160 : W - 20)) { ex = colX; ey += 19; }
    drawPill(ex, ey, pw, 16, e.color, e.frac);
    text(e.text, ex + 7, ey + 11, "bold 10px monospace", e.color, "left");
    ex += pw + 6;
  }
  const bo = state.boss;        // orta: boss can çubuğu ya da bölüm rozeti
  if (bo && !bo.dead) {
    const bx = W / 2 + 40;
    text("☠ " + bo.name, bx, 20, "bold 13px monospace", "#ff4d6d");
    fillRR(bx - 95, 27, 190, 10, 5, "rgba(0,0,0,0.5)");
    fillRR(bx - 95, 27, 190 * clamp(bo.hp / bo.maxHp, 0, 1), 10, 5, lgrad(bx - 95, 0, bx + 95, 0, bo.enraged ? ["#ff4d6d", "#c9184a"] : ["#ffd166", "#f48c06"]));
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    rrPath(bx - 95, 27, 190, 10, 5);
    ctx.stroke();
  } else {
    const txt = "BÖLÜM " + state.level;
    ctx.font = "bold 14px monospace";
    const tw = ctx.measureText(txt).width + 26;
    fillRR(W / 2 - tw / 2, 12, tw, 26, 13, hexToRgba(T().board, 0.85));
    ctx.strokeStyle = T().accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(txt, W / 2, 30, ctx.font, T().text);
  }
  const n = Math.max(0, state.lives);   // sağ: kalpler (tek can kaldıysa nabız atar)
  for (let i = 0; i < n; i++) {
    const hx = W - 28 - i * 21, s = 16 * (n === 1 ? 1 + 0.12 * Math.sin(state.time * 8) : 1);
    drawHeart(hx + 1, 17, s, "rgba(0,0,0,0.35)");
    drawHeart(hx, 15, s, "#ff4d6d");
    circle(hx - s * 0.22, 15 + s * 0.28, s * 0.09, "rgba(255,255,255,0.6)");
  }
  drawBattleHUD();
}
function drawPowerups() {
  for (const p of powerups) {
    const P = POWERS[p.type], col = p.type === "Q" ? hslHex(state.time * 360, 85, 62) : P.color;
    const x = p.x, y = p.y + Math.sin(state.time * 6 + p.x * 0.05) * 1.5, w = p.w, h = p.h;   // hafifçe süzülür
    fillRR(x - 4, y - 4, w + 8, h + 8, 13, hexToRgba(col, 0.22));                           // hale
    fillRR(x, y, w, h, 9, lgrad(0, y, 0, y + h, [[0, shade(col, 0.35)], [0.6, col], [1, shade(col, -0.35)]]));
    fillRR(x + 6, y + 2, w - 12, h * 0.36, 4, "rgba(255,255,255,0.4)");
    if (P.bad) {                // kötü kapsül: kesikli uyarı çerçevesi
      ctx.strokeStyle = "#ff4d6d";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      rrPath(x + 1, y + 1, w - 2, h - 2, 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    text(P.label, x + w / 2, y + 13, "bold 11px monospace", P.bad || dotColorFor(col) !== HP_DOT.dark ? "#ffffff" : "#16213e");
  }
}

// --- Durum ekranları ---
function drawCard(cx, cy, w, h) {
  fillRR(cx - w / 2 + 4, cy - h / 2 + 8, w, h, 18, "rgba(0,0,0,0.35)");
  fillRR(cx - w / 2, cy - h / 2, w, h, 18, hexToRgba(T().board, 0.94));
  ctx.strokeStyle = hexToRgba(T().accent, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
}
// Degrade dolgulu, hafif parlayan başlık
function titleText(s, x, y, size, c1, c2) {
  ctx.font = "bold " + size + "px monospace";
  ctx.textAlign = "center";
  const w = ctx.measureText(s).width;
  ctx.save();
  ctx.shadowColor = hexToRgba(c1, 0.55);
  ctx.shadowBlur = 18;
  ctx.fillStyle = lgrad(x - w / 2, 0, x + w / 2, 0, [c1, c2]);
  ctx.fillText(s, x, y);
  ctx.restore();
}
// Kenarlıklı yazı (her zeminde okunur)
function outlinedText(s, x, y, font, color) {
  ctx.font = font;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}
// Perde tahta renginde: açık temalarda da yazı okunur kalır
const overlay = alpha => { ctx.fillStyle = hexToRgba(T().board, Math.min(1, alpha + 0.2)); ctx.fillRect(0, 0, W, H); };
// Menü göstergesi: gerçek tuğla sprite'ları + duvar bölgesi renkleri
const LEGEND = [
  [{ hp: 1 }, "1 vuruş"], [{ hp: 2 }, "2 vuruş"], [{ hp: 3 }, "3 vuruş"], [{ unbreakable: true }, "kırılmaz"], [{ explosive: true }, "patlar"],
  [{ electric: true }, "yıldırım"], [{ gold: true }, "altın"], [{ splitter: true }, "+top"], ["bumper", "tampon"], ["portal", "portal"],
];
function drawScreens() {
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 4), m = state.mode;
  ctx.textAlign = "center";
  if (m === "menu") {
    overlay(0.2);
    drawCard(W / 2, H / 2 + 5, 640, 420);
    const fy = Math.sin(state.time * 2) * 3;
    titleText("BRICK BREAKER", W / 2, H / 2 - 130 + fy, 46, T().ex, T().accent);
    titleText("AI", W / 2, H / 2 - 84 + fy, 40, T().b1, T().b3);
    text("★ KAOS SÜRÜMÜ ★", W / 2, H / 2 - 52, "bold 14px monospace", "#ff5d8f");
    ctx.globalAlpha = pulse;
    text("▶  Yeni oyun için tıkla veya boşluk", W / 2, H / 2 - 12, "bold 20px monospace", T().text);
    ctx.globalAlpha = 1;
    text("← → / fare: raket • boşluk: fırlat • P/Esc: duraklat • T/R: tema • F: tam ekran", W / 2, H / 2 + 18, "13px monospace", T().dim);
    text("Raketi hareket ettirerek vur: FALSO!   Uçtan vur: SMASH!", W / 2, H / 2 + 40, "14px monospace", T().dim);
    const tier = tierOf(career.lp);
    text("🏆 REKOR " + state.high + "    " + tier.icon + " " + tier.name + " · " + career.lp + " LP", W / 2, H / 2 + 66, "bold 14px monospace", T().b2);
    LEGEND.forEach(([what, label], i) => {
      const x = W / 2 - 272 + (i % 5) * 110, y = H / 2 + 92 + Math.floor(i / 5) * 28;
      if (typeof what === "string") fillRR(x, y + 1, 44, 12, 6, ZONE_STYLE[what]);
      else { const b = { row: 0, col: 0, hp: 1, ...what }; blitBrick(brickSprite(brickColor(b), brickKind(b)), x, y, 44 / BRICK.w); }
      text(label, x + 50, y + 12, "12px monospace", T().text, "left");
    });
    if (settings.hazards !== "kapali") text("⚠ Lanetler seni durdurmaya çalışacak — yoğunluk: Ayarlar → Lanetler", W / 2, H / 2 + 175, "13px monospace", CURSE_COLOR);
  } else if (m === "serve" && battle.active && battle.countdown > 0) {
    drawCountdown();
  } else if (m === "serve") {
    ctx.globalAlpha = pulse;
    outlinedText("topu fırlat: tıkla / boşluk", W / 2, H - 90, "bold 17px monospace", T().text);
    ctx.globalAlpha = 1;
  } else if (m === "playing" && balls.some(b => b.stuck)) {
    outlinedText("YAPIŞ: bırakmak için tıkla / boşluk", W / 2, H - 90, "bold 15px monospace", POWERS.Y.color);
  } else if (m === "levelclear") {
    drawCard(W / 2, H / 2, 440, 130);
    titleText("BÖLÜM " + state.level + " TAMAM!", W / 2, H / 2 - 8, 32, T().b1, T().accent);
    text("+500", W / 2, H / 2 + 32, "bold 20px monospace", T().b2);
  } else if (m === "paused") {
    overlay(0.35);
    drawCard(W / 2, H / 2, 380, 140);
    titleText("DURAKLATILDI", W / 2, H / 2 - 8, 34, T().text, T().accent);
    text("devam: P veya tıkla", W / 2, H / 2 + 32, "16px monospace", T().dim);
  } else if (m === "gameover" && battle.active) {
    drawBattleResults();
  } else if (m === "gameover") {
    overlay(0.45);
    drawCard(W / 2, H / 2 + 20, 480, 300);
    titleText("OYUN BİTTİ", W / 2, H / 2 - 70, 44, T().ex, "#ff4d6d");
    text("Skor: " + state.score, W / 2, H / 2 - 20, "bold 24px monospace", T().text);
    text("Rekor: " + state.high, W / 2, H / 2 + 10, "18px monospace", T().dim);
    if (state.newRecord) { ctx.globalAlpha = pulse; text("🏆 YENİ REKOR!", W / 2, H / 2 + 46, "bold 22px monospace", T().b2); ctx.globalAlpha = 1; }
    text("Atlatılan lanet: " + state.cursesSurvived, W / 2, H / 2 + 80, "16px monospace", CURSE_COLOR);
    if (state.lbRank) text("Liderlik tablosu: #" + state.lbRank + " (" + vsCfg.name + ")", W / 2, H / 2 + 106, "bold 15px monospace", T().b2);
    text("menü için tıkla veya boşluk", W / 2, H / 2 + 136, "15px monospace", T().dim);
  }
}
function drawCallout() {
  const c = state.callout;
  if (!c) return;
  const age = 1.3 - c.life, s = age < 0.15 ? 0.4 + age / 0.15 * 0.8 : 1.2 - Math.min(0.2, (age - 0.15) * 0.8);
  ctx.save();
  ctx.globalAlpha = clamp(c.life / 0.3, 0, 1);
  ctx.translate(W / 2, H / 2 - 80);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(age * 20) * 0.03);
  ctx.font = "bold 44px monospace";
  ctx.textAlign = "center";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.strokeText(c.text, 0, 0);
  ctx.fillStyle = c.color;
  ctx.fillText(c.text, 0, 0);
  ctx.restore();
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (state.slowmo > 0) zoomAt(1 + 0.05 * Math.min(1, state.slowmo));            // ağır çekimde hafif yakınlaşma
  if (musicFx("zoom") && music.beat > 0) zoomAt(1 + 0.028 * music.beat * musicK()); // müzik: bas vuruşunda kamera tekmesi
  if (state.shake > 0.1) ctx.translate(rnd(-1, 1) * state.shake, rnd(-1, 1) * state.shake);
  if (curseOn("sarhos")) {      // lanet kameraları: sarhoş sallantı, ayna dünya
    const t = state.time;
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.sin(t * 1.3) * 0.12);
    ctx.scale(1 + 0.05 * Math.sin(t * 0.9), 1 + 0.05 * Math.sin(t * 0.9));
    ctx.translate(-W / 2 + Math.sin(t * 0.7) * 20, -H / 2);
  }
  if (curseOn("ayna")) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  if (isFever()) { ctx.fillStyle = `hsla(${(state.time * 300) % 360},90%,55%,0.10)`; ctx.fillRect(0, 0, W, H); }   // ÇILGIN MOD tonu

  drawStars(); drawZones(); drawHoles(); drawMusicBack(); drawBricks(); drawGlints(); drawBoss();
  drawPowerups(); drawObstacles(); drawUfo(); drawWallPanels();
  for (const p of particles) { ctx.globalAlpha = clamp(p.life * 2.5, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
  for (const f of fragments) {  // dönen tuğla parçaları
    ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
    ctx.save();
    ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
    ctx.rotate(f.rot);
    ctx.fillStyle = f.color;
    ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  drawBolts(); drawMusicMid(); drawLasersAndBullets(); drawPaddle(); drawBalls();
  ctx.font = "bold 14px monospace";   // skor yazıları: kenarlıklı, büyüyerek belirir
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  for (const f of floaters) {
    const age = 0.8 - f.life, sc = age < 0.1 ? 0.6 + age * 6 : 1.2 - Math.min(0.2, (age - 0.1) * 2);
    ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(sc, sc);
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  drawWind(); drawFog();
  const camM = ctx.getTransform();
  ctx.restore();                // kamera alanı sonu
  drawDarkness(camM); drawMusicFlash(); drawBlackout();
  if (isFever()) { ctx.strokeStyle = `hsl(${(state.time * 300) % 360},90%,60%)`; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6); }
  if (state.mode !== "menu") drawHUD();
  drawCallout();
  drawScreens();
}
