// Screenshots the committed map embed for the homepage card: images/cdmx-map.webp.
//
//   node tools/cdmx-map/preview.mjs [--city oslo] [--browser <path to a Chromium-family binary>]
//
// Serves the repository root on a free loopback port (as GitHub Pages would), opens the city,
// zooms in and pans so the scored postal areas fill the frame, and converts the shot with
// cwebp. The map embed itself is built in ignacio-ireta/cdmx-convenience-map and lands here
// through its CI, so re-run this after an embed update that changes how the page looks.
//
// Needs no npm packages: it drives an installed Chrome, Chromium, Brave or Edge over the
// DevTools protocol. Basemap tiles come from OpenStreetMap, so it needs network access.
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TOOL_DIR, "..", "..");
const OUTPUT = join(REPO_ROOT, "images", "cdmx-map.webp");
const VIEWPORT = { width: 1440, height: 900 };
// How far the city sits from the middle of the map pane in the default view, and where it
// should end up: the middle of the strip of map between the sidebar and the ranking.
const CITY_OFFSET = { x: 35, y: 95 };
const FRAME_OFFSET = { x: -180, y: 20 };
const ZOOM_STEPS = 2;
const KEY_PAN_PX = 80; // Leaflet's keyboard pan distance
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".geojson": "application/geo+json",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};
const BROWSERS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
];

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const city = option("city", "oslo");
const browserPath = option("browser", process.env.CHROME_PATH ?? BROWSERS.find(existsSync));
if (!browserPath) throw new Error("no Chromium-family browser found; pass --browser <path>");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
  let file = join(REPO_ROOT, path);
  if (!file.startsWith(REPO_ROOT)) return response.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return response.writeHead(404).end();
  response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const url = `http://127.0.0.1:${server.address().port}/projects/cdmx-map/?city=${city}`;

const profile = await mkdtemp(join(tmpdir(), "cdmx-map-preview-"));
const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--hide-scrollbars",
    "about:blank"
  ],
  { stdio: ["ignore", "ignore", "pipe"] }
);

try {
  // The browser prints the DevTools endpoint it picked on stderr.
  const endpoint = await new Promise((found, failed) => {
    let log = "";
    browser.stderr.on("data", (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on ws:\/\/([^/]+)\//);
      if (match) found(match[1]);
    });
    browser.on("exit", () => failed(new Error("the browser exited before it was ready")));
    setTimeout(() => failed(new Error("timed out waiting for the browser")), 20000);
  });
  const targets = await (await fetch(`http://${endpoint}/json`)).json();
  const socket = new WebSocket(
    targets.find((target) => target.type === "page").webSocketDebuggerUrl
  );
  await new Promise((open) => socket.addEventListener("open", open));

  let lastId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });
  const send = (method, params = {}) =>
    new Promise((answered) => {
      lastId += 1;
      pending.set(lastId, answered);
      socket.send(JSON.stringify({ id: lastId, method, params }));
    });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;
  const press = async (key, code) => {
    const event = { key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...event });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
    await sleep(350);
  };

  // Scored areas are drawn and every basemap tile in view has loaded.
  const settled = async () => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await sleep(250);
      const ready = await evaluate(`(() => {
        const tiles = [...document.querySelectorAll("img.leaflet-tile")];
        return document.querySelectorAll("path.leaflet-interactive").length > 0 &&
          tiles.length > 0 && tiles.every((tile) => tile.complete && tile.naturalWidth > 0);
      })()`);
      if (ready) return sleep(600); // let the tile fade-in finish
    }
    throw new Error("the map did not finish loading (are OpenStreetMap tiles reachable?)");
  };

  await send("Emulation.setDeviceMetricsOverride", {
    ...VIEWPORT,
    deviceScaleFactor: 2,
    mobile: false
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }]
  });
  await send("Page.navigate", { url });
  await settled();

  // Zoom with the map's own control, then pan with its keyboard handler. The pointer never
  // touches the map, so no area is selected and no hover tooltip is left in the shot.
  for (let step = 0; step < ZOOM_STEPS; step += 1) {
    await evaluate(`document.querySelector(".leaflet-control-zoom-in").click()`);
    await sleep(700);
  }
  await evaluate(`document.querySelector(".leaflet-container").focus()`);
  const scale = 2 ** ZOOM_STEPS;
  const right = Math.round((CITY_OFFSET.x * scale - FRAME_OFFSET.x) / KEY_PAN_PX);
  const down = Math.round((CITY_OFFSET.y * scale - FRAME_OFFSET.y) / KEY_PAN_PX);
  for (let step = 0; step < right; step += 1) await press("ArrowRight", 39);
  for (let step = 0; step < down; step += 1) await press("ArrowDown", 40);
  await evaluate(`document.activeElement?.blur()`);
  await settled();

  const shot = await send("Page.captureScreenshot", { format: "png" });
  const png = join(profile, "preview.png");
  await writeFile(png, Buffer.from(shot.result.data, "base64"));
  await mkdir(dirname(OUTPUT), { recursive: true });
  const converted = spawnSync(
    "cwebp",
    ["-quiet", "-q", "78", "-resize", "1600", "0", png, "-o", OUTPUT],
    { stdio: "inherit" }
  );
  if (converted.status !== 0) throw new Error("cwebp failed (brew install webp)");
  console.log(`✓ wrote ${OUTPUT.slice(REPO_ROOT.length + 1)}`);
  socket.close();
} finally {
  browser.kill();
  server.close();
  await sleep(300);
  await rm(profile, { recursive: true, force: true });
}
