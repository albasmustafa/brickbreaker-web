// ======================================================================
// 22. SON TOP BAHsİ: son can da gidince bir kez devam şansı.
//     Devam eden oyuncu 1 canla döner, karşılığında hemen bir lanet yer.
//     Günlük, pratik ve kapışmada teklif edilmez.
// ======================================================================
const lastChanceEl = $("lastchance");
const lastChanceAvailable = () => !run.daily && !run.practice && !battle.active && !run.lastChanceUsed && !weekly.active;

function showLastChance() {
  if (!lastChanceAvailable()) return false;
  state.mode = "lastchance";
  state.lives = 0;
  lastChanceEl.hidden = false;
  return true;
}
const hideLastChance = () => (lastChanceEl.hidden = true);

function lastContinue() {
  if (state.mode !== "lastchance") return;
  hideLastChance();
  run.lastChanceUsed = true;
  state.lives = 1;
  serveBall();                    // aynı bölümde pakt teklifi yeniden açılmaz
  const id = pickCurse();
  if (id) warnCurse(id);          // bedel: hemen bir lanet
  callout("SON TOP BAHsİ: DEVAM", "#ff5d8f");
  sfx("power");
}
function lastEnd() {
  if (state.mode !== "lastchance") return;
  hideLastChance();
  gameOver();
}

onClick("last-continue", lastContinue);
onClick("last-end", lastEnd);
