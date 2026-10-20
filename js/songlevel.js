// ======================================================================
// 27. ŞARKIDAN BÖLÜM: seçilen şarkının enerjisi, bası ve BPM'i analiz
//     edilir; 3 bölüm + isteğe bağlı boss üretilir. Aynı şarkı aynı bölümü verir.
// ======================================================================
const songLevel = { active: false, starting: false, name: "", bpm: 0, duration: 0, levels: [], url: null, fileName: "", playing: false };
const songCard = $("song-card"), songCodeBox = $("song-codebox"), songMsg = $("song-msg"), songStartBtn = $("song-start");

function generateSongLevels(info) {
  const name = String(info.name || "Şarkı").slice(0, 40);
  const bpm = clamp(Math.round(+info.bpm || 0), 0, 240);
  const sections = (info.sections && info.sections.length ? info.sections : [
    { energy: 0.35, bass: 0.3, high: 0.2 }, { energy: 0.6, bass: 0.5, high: 0.35 }, { energy: 0.8, bass: 0.65, high: 0.5 },
  ]).slice(0, 3);
  const levels = [];
  sections.forEach((s, ix) => {
    const rnd = seeded(strHash(name + "|" + bpm + "|" + ix + "|" + Math.round(s.energy * 100)));
    const energy = clamp(+s.energy || 0, 0, 1), bass = clamp(+s.bass || 0, 0, 1), high = clamp(+s.high || 0, 0, 1);
    const rows = 5 + Math.round(energy * 3);
    const density = 0.55 + energy * 0.35;
    const map = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < 10; c++) {
        const edge = c === 0 || c === 9;
        if (rnd() > (edge ? density * 0.65 : density)) { line += "."; continue; }
        const roll = rnd();
        if (roll < 0.05 && !line.includes("X")) line += "X";
        else if (bass > 0.55 && roll < 0.16) line += "E";
        else if (high > 0.5 && roll < 0.25) line += "Z";
        else if (roll < 0.30) line += "$";
        else if (roll < 0.34) line += "+";
        else line += String(clamp(1 + Math.round(energy * 2 + rnd()), 1, 3));
      }
      if (line.replace(/[.\s]/g, "").length < 3) line = "...11111..";
      map.push(line);
    }
    const boss = ix === sections.length - 1 && info.boss;
    if (boss) levels.push({ map: [...Array(5).fill(".........."), ...map.slice(0, 4)],
      boss: { name: info.bossName || "RİTİM CANAVARI", hp: 30 + Math.round(energy * 40), speed: 100 + Math.round(energy * 60), shootEvery: 2.5 - energy } });
    else levels.push(map);
  });
  return levels;
}

// Basit mono analiz: 0.25 sn'lik pencerelerde RMS, bas ve tiz enerjisi.
function analyzeAudioBuffer(buffer, fileName) {
  const sr = buffer.sampleRate, data = buffer.getChannelData(0), win = Math.max(1, Math.floor(sr * 0.25));
  const frames = [];
  let low = 0;
  for (let i = 0; i < data.length; i += win) {
    let sum = 0, lowSum = 0, highSum = 0, prev = 0, n = 0;
    const end = Math.min(i + win, data.length);
    for (let j = i; j < end; j += 2) {
      const v = data[j];
      sum += v * v;
      low += (v - low) * 0.02;
      lowSum += low * low;
      highSum += (v - prev) * (v - prev);
      prev = v;
      n++;
    }
    frames.push({ rms: Math.sqrt(sum / Math.max(1, n)), low: Math.sqrt(lowSum / Math.max(1, n)), high: Math.sqrt(highSum / Math.max(1, n)) });
  }
  const norm = (key) => {
    const max = Math.max(1e-9, ...frames.map(f => f[key]));
    for (const f of frames) f[key] /= max;
  };
  norm("rms"); norm("low"); norm("high");
  // Vuruş aralıkları: bas enerjisi kayan ortalamanın belirgin üstüne çıkınca.
  const intervals = []; let lastBeat = -1;
  for (let i = 4; i < frames.length; i++) {
    const avg = (frames[i - 1].low + frames[i - 2].low + frames[i - 3].low + frames[i - 4].low) / 4;
    if (frames[i].low > avg * 1.3 + 0.03 && frames[i].low > 0.08) {
      if (lastBeat >= 0) intervals.push((i - lastBeat) * 0.25);
      lastBeat = i;
    }
  }
  let bpm = 0;
  if (intervals.length >= 4) {
    const s = intervals.slice().sort((a, b) => a - b);
    bpm = 60 / s[s.length >> 1];
    while (bpm < 70) bpm *= 2;
    while (bpm > 180) bpm /= 2;
  }
  const stat = (a, b) => {
    const sl = frames.slice(a, b), n = Math.max(1, sl.length);
    return { energy: sl.reduce((s, f) => s + f.rms, 0) / n, bass: sl.reduce((s, f) => s + f.low, 0) / n, high: sl.reduce((s, f) => s + f.high, 0) / n };
  };
  const n = frames.length, third = Math.max(1, Math.floor(n / 3));
  const sections = [stat(0, third), stat(third, third * 2), stat(third * 2, n)];
  const name = String(fileName || "Şarkı").replace(/\.[^.]+$/, "").trim().slice(0, 40) || "Şarkı";
  return { name, bpm: Math.round(bpm), duration: buffer.duration, boss: sections[2].bass > 0.5 || buffer.duration > 100, sections };
}

async function loadSongFile(file) {
  if (!file) return false;
  songMsg.textContent = "⏳ Şarkı analiz ediliyor…";
  try {
    const ab = await file.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("Web Audio yok");
    const ac = new AC();
    const audio = await ac.decodeAudioData(ab);
    if (ac.close) ac.close();
    const info = analyzeAudioBuffer(audio, file.name);
    songLevel.name = info.name; songLevel.bpm = info.bpm; songLevel.duration = info.duration;
    songLevel.levels = generateSongLevels(info); songLevel.url = URL.createObjectURL(file); songLevel.fileName = file.name;
    songMsg.textContent = "✅ " + songLevel.levels.length + " bölüm üretildi.";
    renderSong();
    return true;
  } catch (e) {
    songMsg.textContent = "⚠️ Şarkı çözülemedi: " + (e.message || e);
    return false;
  }
}
function renderSong() {
  if (!songCard) return;
  const boss = songLevel.levels.length && songLevel.levels[songLevel.levels.length - 1].boss;
  songCard.textContent = songLevel.levels.length
    ? "🎵 " + songLevel.name + " · " + songLevel.bpm + " BPM · " + Math.round(songLevel.duration) + " sn · " + songLevel.levels.length + " bölüm" + (boss ? " · boss: " + boss.name : "")
    : "Henüz şarkı seçilmedi. Bir şarkı seç; enerji, bas ve BPM'e göre bölüm üretilsin.";
  if (songStartBtn) { songStartBtn.disabled = !songLevel.levels.length || songLevel.active; songStartBtn.textContent = songLevel.active ? "▶ Şarkı bölümü sürüyor…" : "▶ Şarkı bölümünü başlat"; }
}
function startSongLevel() {
  if (!songLevel.levels.length) return false;
  closePanels();
  if (battle.active) closeBattle();
  stopWeekly();
  songLevel.starting = true; songLevel.active = true;
  startGame();
  run.song = true;
  songLevel.starting = false;
  if (songLevel.url) {
    try {
      bgmusic.src = songLevel.url; bgmusic.loop = true;
      bgmusic.play().catch(() => {});
      attachMusic(bgmusic, "song:" + songLevel.fileName);
      songLevel.playing = true;
    } catch (e) {}
  }
  callout("🎵 " + songLevel.name.toLocaleUpperCase("tr"), "#ffd166");
  renderSong();
  return true;
}
function stopSongLevel() {
  songLevel.active = false; songLevel.starting = false;
  if (songLevel.playing) { songLevel.playing = false; try { bgmusic.pause(); } catch (e) {} }
}
function songComplete() {
  songLevel.active = false;
  addScore(5000);
  callout("🎵 ŞARKI TAMAM!", "#ffd166");
  gameOver();
}

// --- Paylaşım kodu ---
function encodeSongLevel() {
  if (!songLevel.levels.length) return "";
  return "BBS1:" + btoa(unescape(encodeURIComponent(JSON.stringify({ n: songLevel.name, b: songLevel.bpm, d: songLevel.duration, l: songLevel.levels }))));
}
function importSongLevel(code) {
  try {
    const raw = String(code || "").trim();
    if (!raw.startsWith("BBS1:")) return false;
    const d = JSON.parse(decodeURIComponent(escape(atob(raw.slice(5)))));
    if (!d || !Array.isArray(d.l) || !d.l.length || d.l.length > 6) return false;
    const levels = d.l.map(def => {
      const map = Array.isArray(def) ? def : def.map;
      if (!Array.isArray(map) || !map.length) throw new Error("harita");
      const rows = map.map(line => String(line).slice(0, 10).padEnd(10, ".").replace(/[^123XEZ$+.]/g, "."));
      return Array.isArray(def) ? rows : { map: rows, boss: def.boss && { name: String(def.boss.name || "RİTİM CANAVARI").slice(0, 30), hp: clamp(Math.round(+def.boss.hp) || 40, 10, 300), speed: clamp(+def.boss.speed || 120, 40, 300), shootEvery: clamp(+def.boss.shootEvery || 2, 0.8, 5) } };
    });
    songLevel.name = String(d.n || "Paylaşılan şarkı").slice(0, 40); songLevel.bpm = clamp(Math.round(+d.b || 0), 0, 240); songLevel.duration = Math.max(0, +d.d || 0);
    songLevel.levels = levels; songLevel.url = null; songLevel.fileName = "";
    renderSong();
    return true;
  } catch (e) { return false; }
}

// --- Arayüz ---
onClick("song-pick", () => $("songfile").click());
$("songfile").addEventListener("change", e => { const f = e.target.files && e.target.files[0]; if (f) loadSongFile(f); e.target.value = ""; });
onClick("song-start", startSongLevel);
onClick("song-code", () => {
  const code = encodeSongLevel();
  if (!code) { songMsg.textContent = "⚠️ Önce bir şarkı seç."; return; }
  songCodeBox.value = code; songCodeBox.select();
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => (songMsg.textContent = "📋 Bölüm kodu panoya kopyalandı."), () => (songMsg.textContent = "Kodu kutudan kopyala."));
  else songMsg.textContent = "Kodu kutudan kopyala.";
});
onClick("song-import", () => {
  songMsg.textContent = importSongLevel(songCodeBox.value) ? "📥 Bölüm yüklendi — başlatabilirsin." : "⚠️ Geçersiz bölüm kodu.";
});
renderSong();
