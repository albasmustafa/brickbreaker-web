// ======================================================================
// 13. ARKA PLAN MEDYASI VE MÜZİK SENKRONU
//     Kullanıcının müziği/videosu analiz edilir (bas, orta, tiz, vuruş, BPM);
//     efektler vuruşa göre oynar. Her şarkı ilk 8 saniyede karakterine göre
//     kendi efekt setini ve adını alır; profil kaydedilir.
// ======================================================================
const stage = $("stage"), bgvid = $("bgvid"), mediavol = $("mediavol"), musicInfo = $("musicinfo"), beatDot = $("beatdot");
const bgmusic = new Audio();
bgmusic.loop = true;
let vidURL = null, audURL = null;
const mediaStatus = msg => { $("mediastatus").textContent = msg || ""; };

const MUSIC_K = { tam: 1, hafif: 0.55, kapali: 0 };
const PROFILE_LISTEN = 8;       // şarkı karakteri bu kadar saniye dinlendikten sonra belirlenir
const MUSIC_FX_ALL = ["zoom", "rings", "dance", "eq", "spectrum", "strobe", "tint", "warp", "lasers", "sparkle", "aurora", "glow"];
const ARCHETYPES = {            // şarkı karakterleri ve efekt setleri
  bas:     { name: "Bas Fırtınası",  fx: ["zoom", "rings", "dance", "eq", "tint"] },
  hiz:     { name: "Hız Treni",      fx: ["strobe", "lasers", "warp", "zoom", "eq"] },
  kristal: { name: "Kristal Yağmur", fx: ["sparkle", "spectrum", "glow", "dance"] },
  sakin:   { name: "Gece Sakinliği", fx: ["aurora", "glow", "tint", "spectrum"] },
  neon:    { name: "Neon Dalga",     fx: ["lasers", "rings", "spectrum", "glow", "dance"] },
};
const music = {
  analyser: null, gain: null, freq: null, sources: new Map(), on: false, t: 0,
  bass: 0, mid: 0, high: 0, level: 0,                    // yumuşatılmış 0..1
  bassAvg: 0, highAvg: 0, beat: 0, flash: 0, lastBeat: -1, lastHat: -1, intervals: [], bpm: 0, beatCount: 0,
  key: null, profile: null, listen: 0, stats: null, rings: [], beams: [], sparks: [], uiAt: 0,
};
const musicK = () => MUSIC_K[settings.musicFx] || 0;
const musicFx = name => music.on && music.profile && musicK() > 0 && music.profile.fx.includes(name) && (name !== "strobe" || settings.musicFx === "tam");
const strHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
let songProfiles = store.get("bb_song_profiles", {}) || {};

// Öğeyi Web Audio'ya bağla: kaynak → analizci → ses kazancı → hoparlör (analiz ses seviyesinden bağımsız)
function attachMusic(el, key) {
  const c = getAudio();
  if (!music.analyser) {
    music.analyser = Object.assign(c.createAnalyser(), { fftSize: 2048, smoothingTimeConstant: 0.55 });
    music.freq = new Uint8Array(music.analyser.frequencyBinCount);
    music.gain = c.createGain();
    music.analyser.connect(music.gain);
    music.gain.connect(c.destination);
  }
  if (!music.sources.has(el)) {
    try {
      const src = c.createMediaElementSource(el);       // öğe başına yalnızca bir kez yapılabilir
      src.connect(music.analyser);
      music.sources.set(el, src);
    } catch (e) { return mediaStatus("⚠️ Ses analiz edilemedi, efektler kapalı"); }
  }
  setMediaVolume();
  startProfile(key);
}
function startProfile(key) {
  Object.assign(music, { key, intervals: [], bpm: 0, beatCount: 0, listen: 0, stats: { bass: 0, mid: 0, high: 0, level: 0, n: 0 } });
  const saved = songProfiles[key];
  if (saved && Array.isArray(saved.fx)) {
    music.profile = { ...saved, pending: false };
    if (settings.songTheme === "acik") setTheme(genTheme(saved.seed));
  } else {
    // Karakter belli olana kadar: tohumdan renk + genel efektler + tohuma özel bir imza efekti
    const seed = strHash(key), r = seeded(seed), hue = r() * 360;
    music.profile = { seed, hue, hue2: hue + 60 + r() * 120, name: "Dinleniyor…", arch: null, pending: true,
                      fx: ["dance", "glow", "warp", "eq", ["rings", "spectrum", "aurora"][(r() * 3) | 0]] };
  }
  updateMusicInfo(true);
}
// İlk saniyelerin ortalamasından şarkının karakterini çıkar, efekt setini ve adını belirle
function finalizeProfile() {
  const st = music.stats, p = music.profile;
  if (!p || !p.pending || st.n < 30) return;
  const B = st.bass / st.n, M = st.mid / st.n, Hh = st.high / st.n, L = st.level / st.n, bpm = music.bpm;
  if (L < 0.02) { music.listen = 0; music.stats = { bass: 0, mid: 0, high: 0, level: 0, n: 0 }; return; }   // sessizlik: beklemeye devam
  const r = seeded(p.seed + 7);
  const score = {
    bas: B * 1.4 - M * 0.3, hiz: (bpm >= 135 ? 0.5 : bpm >= 120 ? 0.2 : 0) + L * 0.8, kristal: Hh * 2.4,
    sakin: (0.55 - L) * 1.5 + (bpm && bpm < 100 ? 0.3 : 0), neon: M * 1.4,
  };
  for (const k in score) score[k] += (r() - 0.5) * 0.1;  // aynı karakterdeki şarkılar da birbirinden ayrışsın
  const arch = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
  const fx = ARCHETYPES[arch].fx.slice(), extra = MUSIC_FX_ALL.filter(f => !fx.includes(f));
  fx.push(extra[(r() * extra.length) | 0]);              // tohuma özel ek efekt
  if (!fx.includes("glow")) fx.push("glow");
  const name = TH_ADJ[(r() * TH_ADJ.length) | 0] + " " + ARCHETYPES[arch].name;
  music.profile = songProfiles[music.key] = { seed: p.seed, hue: p.hue, hue2: p.hue2, name, arch, fx, bpm: Math.round(bpm), pending: false };
  const keys = Object.keys(songProfiles);
  if (keys.length > 60) delete songProfiles[keys[0]];
  store.set("bb_song_profiles", songProfiles);
  if (settings.songTheme === "acik") setTheme(genTheme(p.seed));
  callout("♪ " + name.toLocaleUpperCase("tr"), hslHex(p.hue, 85, 65));
  updateMusicInfo(true);
}
function detachMusic() {
  Object.assign(music, { on: false, profile: null, key: null, rings: [], beams: [], sparks: [] });
  updateMusicInfo(true);
}
// BPM: vuruş aralıklarının ortancası, 70–180 aralığına katlanır
function computeBpm() {
  if (music.intervals.length < 4) return 0;
  const s = music.intervals.slice().sort((a, b) => a - b);
  let bpm = 60 / s[s.length >> 1];
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return bpm;
}
function onBeat(t, strength) {
  const iv = t - music.lastBeat;
  if (music.lastBeat > 0 && iv > 0.25 && iv < 1.5) { music.intervals.push(iv); if (music.intervals.length > 24) music.intervals.shift(); }
  music.lastBeat = t;
  music.beat = 1;
  music.beatCount++;
  music.bpm = computeBpm() || music.bpm;
  const k = musicK(), p = music.profile;
  for (const z of zones) z.flash = Math.max(z.flash, 0.6 * k);   // duvar bölgeleri vuruşla parlar
  if (musicFx("rings")) {      // şok dalgası: bir tahtanın ortasından, bir toptan
    const src = balls.find(b => !b.stuck && !b.decoy), c = music.beatCount % 2 && src ? src : { x: W / 2, y: 330 };
    music.rings.push({ x: c.x, y: c.y, r: 10, life: 1, hue: p.hue + (music.beatCount % 4) * 25 });
    if (music.rings.length > 10) music.rings.shift();
  }
  if (musicFx("lasers")) {     // ışın şovu: köşelerden dönerek süpüren ışınlar
    const side = music.beatCount % 2;
    for (let i = 0; i < 2; i++) {
      music.beams.push({ x: side ? W - 40 - i * 60 : 40 + i * 60, a: -Math.PI / 2 + (side ? -1 : 1) * rnd(0.2, 0.7), va: (side ? 1 : -1) * rnd(0.4, 0.9), life: 0.55, hue: p.hue2 });
    }
    if (music.beams.length > 12) music.beams.splice(0, music.beams.length - 12);
  }
  if (musicFx("strobe")) music.flash = Math.min(0.16, 0.05 + strength * 0.5) * k;
}
function onHat() {             // tiz vuruş (hi-hat): parıltı yağmuru
  if (!musicFx("sparkle") || music.sparks.length > 60) return;
  for (let i = 0; i < 3; i++) music.sparks.push({ x: rnd(20, W - 20), y: rnd(-10, 40), vy: rnd(50, 130), life: rnd(1.4, 2.4), s: rnd(2.5, 5), hue: music.profile.hue + rnd(-30, 30) });
}
// Her karede (gerçek saatle): frekans bantları, vuruş ve tiz vuruş algılama, profil istatistiği, efekt ömürleri
function updateMusic(dt) {
  const playing = music.analyser && musicK() > 0 && [bgmusic, bgvid].some(el => music.sources.has(el) && !el.paused && !el.ended && !el.muted);
  music.t += dt;
  if (!playing) {
    music.on = false;
    for (const k of ["bass", "mid", "high", "level"]) music[k] = Math.max(0, music[k] - dt * 3);
  } else {
    music.on = true;
    music.analyser.getByteFrequencyData(music.freq);
    const binHz = actx.sampleRate / music.analyser.fftSize;
    const band = (lo, hi) => {
      const a = Math.max(1, Math.floor(lo / binHz)), b = Math.min(music.freq.length - 1, Math.ceil(hi / binHz));
      let s = 0;
      for (let i = a; i <= b; i++) s += music.freq[i];
      return s / (b - a + 1) / 255;
    };
    const bass = band(30, 150), mid = band(150, 2000), high = band(2000, 10000), t = music.t;
    music.bass += (bass - music.bass) * 0.5;
    music.mid += (mid - music.mid) * 0.4;
    music.high += (high - music.high) * 0.5;
    music.level = (music.bass + music.mid + music.high) / 3;
    // Vuruş: bas kendi kayan ortalamasının belirgin üstüne çıkınca
    music.bassAvg += (bass - music.bassAvg) * Math.min(1, dt * 1.5);
    if (bass > music.bassAvg * 1.22 + 0.03 && bass > 0.2 && t - music.lastBeat > 0.28) onBeat(t, bass - music.bassAvg);
    music.highAvg += (high - music.highAvg) * Math.min(1, dt * 2);
    if (high > music.highAvg * 1.3 + 0.025 && high > 0.06 && t - music.lastHat > 0.12) { music.lastHat = t; onHat(); }
    const p = music.profile, st = music.stats;
    if (p && p.pending) {      // karakter istatistiği
      st.bass += bass; st.mid += mid; st.high += high; st.level += (bass + mid + high) / 3; st.n++;
      if ((music.listen += dt) >= PROFILE_LISTEN) finalizeProfile();
    }
  }
  music.beat = Math.max(0, music.beat - dt * 4);
  music.flash = Math.max(0, music.flash - dt * 1.2);
  for (const r of music.rings) { r.r += 520 * dt; r.life -= dt * 1.4; }
  for (const b of music.beams) { b.a += b.va * dt; b.life -= dt; }
  for (const s of music.sparks) { s.y += s.vy * dt; s.life -= dt; }
  music.rings = music.rings.filter(r => r.life > 0);
  music.beams = music.beams.filter(b => b.life > 0);
  music.sparks = music.sparks.filter(s => s.life > 0 && s.y < H + 10);
  updateMusicInfo(false);
}
// Medya çubuğu: vuruşla atan nokta + şarkı profili ve BPM
function updateMusicInfo(force) {
  const p = music.profile, on = music.on && p;
  beatDot.style.opacity = on ? 0.3 + 0.7 * music.beat : 0;
  beatDot.style.transform = "scale(" + (1 + music.beat * 0.7) + ")";
  if (on) beatDot.style.background = hslHex(p.hue, 85, 62);
  if (!force && music.t < music.uiAt) return;
  music.uiAt = music.t + 0.5;
  if (!p) { musicInfo.textContent = ""; return; }
  const bpm = Math.round(music.bpm || p.bpm || 0);
  musicInfo.textContent = "♪ " + p.name + (bpm ? " · " + bpm + " BPM" : "") + (p.pending && music.on ? " (" + Math.max(0, Math.ceil(PROFILE_LISTEN - music.listen)) + " sn)" : "");
  musicInfo.style.color = hslHex(p.hue, 80, 65);
}

// --- Müzik efekti çizimleri ---
// Tuğla dansı: sütun sütun dalgalanan zıplama + basla nefes alma (yalnızca görüntü; çarpışma değişmez)
const NO_DANCE = { dy: 0, s: 1 };
function musicDance(b) {
  if (!musicFx("dance")) return NO_DANCE;
  const k = musicK();
  return { dy: -music.beat * 5 * k * (0.5 + 0.5 * Math.sin(b.col * 0.8 + music.t * 5)), s: 1 + music.bass * 0.05 * k };
}
const musicWarp = () => (musicFx("warp") ? 1 + music.level * 8 * musicK() : 1);
// Logaritmik frekans ölçeği: basa daha çok yer
const binAt = (i, n, pow, span) => music.freq[Math.floor((i / n) ** pow * span) + 2] / 255;
// Tuğlaların arkasında: renk nabzı, aurora, spektrum halkası
function drawMusicBack() {
  if (!music.on || !music.profile) return;
  const p = music.profile, k = musicK(), t = music.t;
  if (musicFx("tint")) { ctx.fillStyle = `hsla(${(p.hue + music.mid * 120) % 360},80%,55%,${(0.05 + 0.12 * music.beat) * k})`; ctx.fillRect(0, 0, W, H); }
  if (musicFx("aurora")) {
    for (let band = 0; band < 3; band++) {
      const base = 110 + band * 45, amp = 18 + music.mid * 50, top = [], bottom = [];
      for (let x = 0; x <= W; x += 20) top.push([x, base + Math.sin(x * 0.012 + t * (0.7 + band * 0.3) + band) * amp]);
      for (let x = W; x >= 0; x -= 20) bottom.push([x, base + 50 + Math.sin(x * 0.01 + t * 0.5 + band * 2) * amp * 0.6]);
      ctx.fillStyle = `hsla(${(p.hue + band * 40) % 360},85%,60%,${(0.07 + music.mid * 0.12) * k})`;
      path([[0, base + 60], ...top, ...bottom], true);
      ctx.fill();
    }
  }
  if (musicFx("spectrum")) {
    const cx = W / 2, cy = 330, r0 = 70 + music.bass * 25 * k, n = 64;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.35 * k + 0.1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.2, r1 = r0 + 6 + binAt(i, n, 1.6, 300) * 70 * k;
      ctx.strokeStyle = `hsl(${(p.hue + i * 4) % 360},85%,62%)`;
      path([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
// Oyun nesnelerinin arasında: ekolayzer, şok dalgaları, ışınlar, parıltılar, neon haleler
function drawMusicMid() {
  const p = music.profile, k = musicK();
  if (!p) return;
  if (musicFx("eq")) {
    const n = 48, bw = W / n;
    ctx.fillStyle = lgrad(0, H, 0, H - 110, [hslHex(p.hue, 85, 55), hslHex(p.hue2, 85, 65)]);
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < n; i++) { const h = binAt(i, n, 1.8, 360) * 110 * k; fillRR(i * bw + 1.5, H - h, bw - 3, h, 2); }
    ctx.globalAlpha = 1;
  }
  for (const r of music.rings) {
    ctx.strokeStyle = `hsla(${r.hue % 360},90%,65%,${r.life * 0.55 * k})`;
    ctx.lineWidth = 3 + r.life * 4;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, TAU);
    ctx.stroke();
  }
  for (const b of music.beams) {
    for (const [lw, al] of [[10, 0.12], [3, 0.5]]) {
      ctx.strokeStyle = `hsla(${b.hue % 360},95%,65%,${al * (b.life / 0.55) * k})`;
      ctx.lineWidth = lw;
      path([[b.x, H], [b.x + Math.cos(b.a) * 900, H + Math.sin(b.a) * 900]]);
      ctx.stroke();
    }
  }
  for (const s of music.sparks) {
    const z = s.s * (0.6 + 0.4 * Math.sin(s.life * 12));
    ctx.fillStyle = `hsla(${s.hue % 360},90%,75%,${clamp(s.life, 0, 1) * k})`;
    path([[s.x, s.y - z], [s.x + z * 0.3, s.y], [s.x, s.y + z], [s.x - z * 0.3, s.y]], true);   // ince elmas
    ctx.fill();
  }
  if (musicFx("glow")) {       // ses seviyesiyle büyüyen top ve raket haleleri
    const col = hslHex(p.hue, 90, 62);
    for (const b of balls) {
      const rr = b.r + 6 + music.level * 22 * k + music.beat * 6, g = ctx.createRadialGradient(b.x, b.y, b.r * 0.5, b.x, b.y, rr);
      g.addColorStop(0, hexToRgba(col, 0.55 * k));
      g.addColorStop(1, hexToRgba(col, 0));
      circle(b.x, b.y, rr, g);
    }
    fillRR(paddle.x - 6, paddle.y - 5, paddle.w + 12, paddle.h + 10, 12, hexToRgba(col, (0.12 + 0.3 * music.beat) * k));
  }
}
// Ekran düzleminde: vuruş flaşı (yalnızca "Tam" ayarında, düşük yoğunlukta)
function drawMusicFlash() {
  if (music.flash > 0.003) { ctx.fillStyle = `rgba(255,255,255,${music.flash})`; ctx.fillRect(0, 0, W, H); }
}

// --- Medya çubuğu ---
function setMediaVolume() {
  const v = mediavol.value / 100;
  // Web Audio'ya bağlanan öğenin sesi kazanç düğümünden ayarlanır (analiz ses seviyesinden etkilenmesin)
  for (const el of [bgvid, bgmusic]) el.volume = music.sources.has(el) ? 1 : v;
  if (music.gain) music.gain.gain.value = v;
}
mediavol.addEventListener("input", setMediaVolume);
setMediaVolume();
onClick("pickvid", () => { pauseGame(); $("vidfile").click(); });
onClick("pickmusic", () => { pauseGame(); $("audfile").click(); });
function loadVideoFile(f) {
  if (vidURL) URL.revokeObjectURL(vidURL);              // yalnızca eski videonun adresi iptal edilir
  bgvid.src = vidURL = URL.createObjectURL(f);
  bgvid.muted = false;
  bgvid.style.display = "block";
  stage.classList.add("hasbg");
  mediaStatus("");
  attachMusic(bgvid, f.name + "|" + f.size);
  bgvid.play().catch(() => {   // sesli otomatik oynatma engellendiyse sessiz başlat ve haber ver
    bgvid.muted = true;
    bgvid.play().then(() => mediaStatus("🔇 Video sessiz başlatıldı"), () => mediaStatus("⚠️ Video başlatılamadı — sayfaya bir kez tıkla"));
  });
}
function loadMusicFile(f) {
  if (audURL) URL.revokeObjectURL(audURL);
  bgmusic.src = audURL = URL.createObjectURL(f);
  mediaStatus("");
  attachMusic(bgmusic, f.name + "|" + f.size);
  bgmusic.play().catch(() => mediaStatus("⚠️ Müzik başlatılamadı — sayfaya bir kez tıkla"));
}
$("vidfile").addEventListener("change", e => e.target.files[0] && loadVideoFile(e.target.files[0]));
$("audfile").addEventListener("change", e => e.target.files[0] && loadMusicFile(e.target.files[0]));
onClick("clearmedia", () => {
  pauseGame();
  for (const m of [bgvid, bgmusic]) { m.pause(); m.removeAttribute("src"); m.load(); }
  bgvid.style.display = "none";
  if (vidURL) URL.revokeObjectURL(vidURL);
  if (audURL) URL.revokeObjectURL(audURL);
  vidURL = audURL = null;
  stage.classList.remove("hasbg");
  mediaStatus("");
  detachMusic();
});
