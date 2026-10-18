// Başsız Chromium sürücüsü (Chrome DevTools Protocol, bağımlılıksız; Node 22+ gerekir).
// Her test temiz bir sayfa açar; sayfadaki JS hataları testi düşürür.
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sleep = ms => new Promise(r => setTimeout(r, ms));

function findChrome() {
  const names = [process.env.BB_CHROME, "chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "brave"].filter(Boolean);
  for (const n of names) if (n.includes("/") || spawnSync("which", [n]).status === 0) return n;
  throw new Error("Chromium/Chrome bulunamadı (BB_CHROME ortam değişkeniyle yol verebilirsin)");
}

export async function launch(url, { width = 1400, height = 1000 } = {}) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = mkdtempSync(join(tmpdir(), "bb-test-"));
  const proc = spawn(findChrome(), ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run",
    `--window-size=${width},${height}`, "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
  let ok = false;
  for (let i = 0; i < 75 && !ok; i++) { try { ok = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { await sleep(200); } }
  if (!ok) throw new Error("tarayıcı başlatılamadı");

  async function open() {
    const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${url}`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map(), errors = [];
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    const page = {
      errors, send,
      // Sayfada JS çalıştır; ifade değerini döndürür, istisnayı yükseltir
      async eval(expr) {
        const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error("sayfa: " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).split("\n")[0]);
        return r.result.result.value;
      },
      async ready() { for (let i = 0; i < 50; i++) { try { if (await page.eval("typeof draw === 'function' && typeof refreshVersusUI === 'function'")) return; } catch {} await sleep(100); } throw new Error("oyun yüklenmedi"); },
      async reload() { await send("Page.reload", { ignoreCache: true }); await sleep(300); await page.ready(); },
      async shot(file, h = height, y = 0) {
        const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y, width, height: h, scale: 1 } });
        writeFileSync(file, Buffer.from(r.result.data, "base64"));
      },
      close: () => { try { ws.close(); fetch(`http://127.0.0.1:${port}/json/close/${t.id}`); } catch {} },
    };
    await page.ready();
    return page;
  }
  return { open, close: () => { proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} } };
}
