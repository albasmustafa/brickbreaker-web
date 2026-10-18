// ======================================================================
// 17. ANA DÖNGÜ: sabit adımlı fizik + değişken kare çizimi
// ======================================================================
buildLevel(1);
balls = [newBall(true)];
initStars();
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  // An donması (patlama) ve ağır çekim (son tuğla, boss ölümü) gerçek saatle işler
  let scale = 1;
  if (state.hitstop > 0) { state.hitstop -= dt; scale = 0; }
  else if (state.slowmo > 0) { state.slowmo -= dt; scale = 0.3; }
  if (state.mode === "playing" || state.mode === "serve" || state.mode === "levelclear") {
    for (acc += dt * scale; acc >= STEP; acc -= STEP) update(STEP);
  } else {
    acc = 0;
    if (state.mode !== "paused") updateEffects(dt);   // menüde yıldızlar kayar, oyun sonunda parçacıklar donmaz
  }
  updateMusic(dt);
  updateBattle(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
// Uygulama olarak kurulabilir ve çevrim dışı çalışır (yalnızca http/https üzerinden; dosyadan açınca gerekmez)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
