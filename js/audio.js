// ======================================================================
// 4. SES: Web Audio ile sentez (ses dosyası yok)
// ======================================================================
let actx = null, master = null, noiseBuf = null;
let muted = store.get("bb_muted", 0) == 1;
// Sessize alma + efekt seviyesi ana kazancı belirler; arka plan medyası kendi sürgüsünü kullanır
const applyFxVolume = () => { if (master) master.gain.value = muted ? 0 : FX_GAIN_MAX * settings.fxVol / 100; };

function getAudio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = actx.createGain();
    applyFxVolume();
    master.connect(comp);
    comp.connect(actx.destination);
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
// Tarayıcı sesi ancak ilk tıklama/tuştan sonra açar; açılınca ipucu kaybolur
function unlockAudio() {
  const c = getAudio(), hide = () => { $("audiohint").style.display = "none"; };
  if (c.state === "running") hide(); else c.resume().then(hide).catch(() => {});
}
document.addEventListener("pointerdown", unlockAudio);
document.addEventListener("keydown", unlockAudio);

// Bir zarf: sesin seviyesi süre boyunca sıfıra iner
function envelope(c, t, vol, dur) {
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  g.connect(master);
  return g;
}
// Osilatör sesi; to verilirse frekans kayar
function tone(type, from, to, dur, vol, delay = 0) {
  const c = getAudio();
  if (c.state !== "running") return;
  const t = c.currentTime + delay, osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
  osc.connect(envelope(c, t, vol, dur));
  osc.start(t);
  osc.stop(t + dur + 0.05);
}
// Filtrelenmiş gürültü patlaması
function noise(freq, dur, vol, filter = "bandpass", delay = 0) {
  const c = getAudio();
  if (c.state !== "running") return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + delay, src = c.createBufferSource(), f = c.createBiquadFilter();
  src.buffer = noiseBuf;
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = 0.8;
  src.connect(f);
  f.connect(envelope(c, t, vol, dur));
  src.start(t);
  src.stop(t + dur + 0.05);
}

// Olay sesleri. Her öğe [dalga, Hz, bitiş Hz, süre, ses, gecikme];
// dalga "n" ile başlarsa gürültüdür ("n:highpass" gibi filtre alır, Hz = filtre frekansı).
const arp = (type, freqs, dur, vol, step, toMul = 0) => freqs.map((f, i) => [type, f, f * toMul, dur, vol, i * step]);
const SFX = {
  wall:      [["square", 300, 190, 0.06, 0.14], ["n", 900, 0, 0.03, 0.05]],             // yan duvar: tok "düt"
  ceiling:   () => tone("triangle", rnd(950, 1150), 700, 0.09, 0.13),                   // tavan: parlak "tink"
  brick:     combo => {                                                                 // combo ile incelen pop
    const f = 330 * 2 ** (Math.min(combo - 1, 16) / 12);
    tone("triangle", f, f * 0.8, 0.12, 0.22);
    noise(1800, 0.05, 0.12);
  },
  clack:     [["square", 260, 220, 0.05, 0.12]],                                        // dayanıklı tuğla
  clank:     [["square", 150, 130, 0.07, 0.14], ["n:highpass", 3200, 0, 0.04, 0.1]],    // kırılmaz: metalik
  boom:      [["n:lowpass", 400, 0, 0.3, 0.35], ["sine", 120, 40, 0.3, 0.3]],           // patlama
  lose:      [["sawtooth", 280, 70, 0.5, 0.25], ["sine", 140, 50, 0.5, 0.18]],
  power:     arp("sine", [523, 659, 784, 1046], 0.12, 0.14, 0.07),
  fire:      [...arp("sine", [523, 659, 784, 1046], 0.12, 0.14, 0.07), ["n:lowpass", 900, 0, 0.4, 0.2]],
  multi:     arp("square", [660, 880, 1174], 0.07, 0.11, 0.05),
  slow:      [["sine", 800, 220, 0.45, 0.16]],
  level:     arp("triangle", [392, 494, 587, 784], 0.15, 0.15, 0.09),
  gameover:  arp("sawtooth", [392, 311, 233, 175], 0.3, 0.16, 0.22, 0.9),
  launch:    [["sine", 440, 660, 0.08, 0.15]],
  bumper:    [["sine", 180, 720, 0.07, 0.25], ["triangle", 720, 260, 0.22, 0.18, 0.07]], // pinball "boooing"
  spin:      [["sawtooth", 300, 1400, 0.25, 0.09]],                                     // falso vızıltısı
  portal:    [["sine", 1500, 200, 0.18, 0.14], ["sine", 200, 1500, 0.18, 0.12, 0.12]],
  smash:     [["n:highpass", 2500, 0, 0.12, 0.25], ["square", 900, 300, 0.12, 0.14]],
  zap:       () => {                                                                    // elektrik zinciri
    for (let i = 0; i < 4; i++) tone("sawtooth", rnd(1200, 2400), rnd(200, 500), 0.05, 0.08, i * 0.03);
    noise(5000, 0.15, 0.12, "highpass");
  },
  laser:     [["square", 1800, 600, 0.06, 0.06]],
  coin:      [["square", 988, 0, 0.06, 0.1], ["square", 1319, 0, 0.18, 0.1, 0.06]],
  bad:       arp("sawtooth", [300, 250, 200], 0.12, 0.14, 0.08, 0.7),                    // kötü kapsül
  shield:    [["triangle", 500, 1000, 0.12, 0.18], ["n", 3000, 0, 0.06, 0.08]],
  hole:      [["sine", 90, 30, 1.2, 0.35], ["sawtooth", 60, 25, 1.2, 0.08]],              // kara delik uğultusu
  sling:     [["sine", 120, 1600, 0.25, 0.18]],
  fever:     arp("square", [523, 659, 784, 1046, 1318, 1568], 0.09, 0.09, 0.05),
  bossHit:   [["square", 140, 90, 0.1, 0.2], ["n:lowpass", 700, 0, 0.07, 0.14]],
  bossShoot: [["sawtooth", 400, 120, 0.15, 0.12]],
  bossRoar:  [["sawtooth", 80, 160, 0.6, 0.25], ["n:lowpass", 300, 0, 0.6, 0.2]],
  bossDie:   [["n:lowpass", 400, 0, 0.3, 0.35], ["sine", 120, 40, 0.3, 0.3], ["n:lowpass", 300, 0, 0.5, 0.3, 0.18], ["sine", 90, 30, 0.6, 0.3, 0.3]],
  stun:      [["square", 220, 110, 0.25, 0.18], ["square", 233, 116, 0.25, 0.12]],
  curseWarn: [["sawtooth", 110, 104, 0.7, 0.14], ["sawtooth", 156, 147, 0.7, 0.1]],      // uğursuz triton
  curse:     [["square", 420, 60, 0.45, 0.14], ["n:lowpass", 500, 0, 0.35, 0.18]],
  ufo:       [["sine", 900, 1400, 0.12, 0.1], ["sine", 1400, 900, 0.12, 0.1, 0.12]],
  countdown: [["square", 660, 0, 0.12, 0.14]],
  go:        [["square", 990, 0, 0.3, 0.14]],
  attack:    [["sawtooth", 220, 880, 0.18, 0.13], ["n:highpass", 2500, 0, 0.1, 0.1]],
  achieve:   arp("triangle", [784, 988, 1175, 1568], 0.18, 0.13, 0.07),             // başarım açıldı
};
function sfx(name, ...args) {
  const s = SFX[name];
  if (typeof s === "function") return s(...args);
  for (const [wave, f, to, dur, vol, delay] of s) {
    if (wave[0] === "n") noise(f, dur, vol, wave.slice(2) || "bandpass", delay); else tone(wave, f, to, dur, vol, delay);
  }
}

// Raket sesleri (Ayarlar → Raket sesi): her vuruşta küçük rastgele ton farkıyla
const PADDLE_SOUNDS = {
  pop:   () => tone("sine", rnd(450, 750), 150, 0.09, 0.3),
  bip:   () => tone("square", rnd(340, 560), 0, 0.08, 0.12),
  lazer: () => tone("sawtooth", rnd(1000, 1600), 90, 0.18, 0.15),
  tik:   () => tone("square", rnd(800, 1400), 0, 0.03, 0.18),
  bas:   () => tone("sine", rnd(140, 240), 45, 0.16, 0.4),
  zil:   () => { const f = rnd(650, 1050); tone("sine", f, 0, 0.35, 0.18); tone("sine", f * 1.5, 0, 0.3, 0.09); },
  boing: () => { const p = rnd(0.85, 1.2); tone("sine", 150 * p, 420 * p, 0.06, 0.25); tone("sine", 420 * p, 110 * p, 0.16, 0.25, 0.06); },
  pluck: () => tone("triangle", pick([523, 587, 659, 784, 880]) * (Math.random() < 0.5 ? 1 : 2), 0, 0.12, 0.25),
  "8bit": () => { const p = rnd(0.9, 1.15); tone("square", 660 * p, 0, 0.05, 0.12); tone("square", 990 * p, 0, 0.07, 0.12, 0.05); },
};
const playPaddleSound = () => PADDLE_SOUNDS[settings.paddleSound === "random" ? pick(Object.keys(PADDLE_SOUNDS)) : settings.paddleSound]();
