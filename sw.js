// Servis çalışanı: oyunu uygulama olarak kurulabilir ve çevrim dışı oynanabilir yapar.
// Önce ağ (güncel dosya), ağ yoksa önbellek. Yalnızca http/https üzerinden çalışır (npm start ya da bir web sunucusu).
const CACHE = "brickbreaker-v9";
const FILES = ["./", "index.html", "css/style.css", "favicon.svg", "manifest.webmanifest",
  ...["core", "lang/keys", "lang/en", "lang/de", "lang/fr", "lang/es", "lang/it", "lang/pt", "lang/ru", "lang/uk", "lang/pl", "lang/nl", "lang/sv", "lang/el", "lang/cs", "lang/ro", "lang/hu", "lang/az", "lang/ar", "lang/fa", "lang/hi", "lang/id", "lang/vi", "lang/zh", "lang/ja", "lang/ko", "i18n", "themes", "settings", "audio", "levels", "state", "flow", "effects", "physics", "tunnel", "curses", "update", "render", "music", "ui", "career", "codex", "ghost", "weekly", "songlevel", "challenge", "campaign", "director", "versus", "pacts", "lastchance", "editor", "perf", "main"].map(f => "js/" + f + ".js")];

self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request)
    .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
