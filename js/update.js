// ======================================================================
// 11. GÜNCELLEME: sabit adımlı (120 Hz) dünya güncellemesi
// ======================================================================
function update(dt) {
  state.time += dt;
  // Raket: klavye (TERS'te yönler yer değiştirir); DARALAN DUVARLAR sahayı kısar
  const dir = ((keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0)) * (fxOn("reverse") ? -1 : 1);
  state.inset += ((curseOn("daralan") ? 110 : 0) - state.inset) * Math.min(1, dt * 2);
  const wl = state.inset, wr = W - state.inset;
  if (curseOn("buz")) {          // BUZLU RAKET: yay + sürtünme ile kayar
    if (dir) { paddle.iceV += dir * 2200 * dt; paddle.aimX = null; }
    else if (paddle.aimX != null) paddle.iceV += (paddle.aimX - paddle.x) * 10 * dt;
    paddle.iceV *= Math.exp(-dt * 1.5);
    paddle.x += paddle.iceV * dt;
    if (paddle.x < wl || paddle.x > wr - paddle.w) paddle.iceV *= -0.4;
    paddle.x = clamp(paddle.x, wl, wr - paddle.w);
  } else paddle.x = clamp(paddle.x + dir * paddle.speed * dt, wl, wr - paddle.w);
  // Genişlik animasyonu: GENİŞ büyütür, MİNİ ve sersemleme küçültür
  paddle.targetW = PADDLE_W * (state.time < paddle.wideUntil ? PADDLE_WIDE / PADDLE_W : 1) * (fxOn("mini") || fxOn("stun") ? 0.6 : 1);
  const newW = paddle.w + (paddle.targetW - paddle.w) * Math.min(1, dt * 8);
  paddle.x = clamp(paddle.x - (newW - paddle.w) / 2, wl, Math.max(wl, wr - newW));
  paddle.w = newW;
  // Falso için raket hızı (fare kare başına sıçradığından yumuşatılır)
  paddle.vx += ((paddle.x - paddle.lastX) / dt - paddle.vx) * (1 - Math.exp(-dt / 0.06));
  paddle.lastX = paddle.x;

  for (const mr of movingRows) {  // kayan sıralar
    const off = Math.sin(state.time * mr.speed + mr.phase) * mr.amp;
    for (const b of bricks) if (b.row === mr.row) b.x = b.baseX + off;
  }
  for (const b of bricks) if (b.ty != null && b.y < b.ty) b.y = Math.min(b.ty, b.y + 70 * dt);   // TAVAN ÇÖKÜYOR

  if (state.mode === "serve" || state.mode === "playing") { updateBoss(dt); updateBalls(dt); }
  if (state.mode === "playing") { updateLasers(dt); updateBullets(dt); updateHoles(dt); updateCurses(dt); }
  if (state.mode === "levelclear" && state.time >= state.clearAt) nextLevel();
  updateEffects(dt);
  updatePowerups(dt);
}
