// Screenshots the committed map embed for the homepage card: images/cdmx-map.webp.
//
//   node tools/cdmx-map/preview.mjs [--city oslo] [--browser <path to a Chromium-family binary>]
//
// Serves the repository root on a free loopback port (as GitHub Pages would), opens the city,
// zooms in on its centre so the scored postal areas fill the frame, and converts the shot with
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
// Where the scored area sits in the default view, the middle of the map pane, and where to
// leave the city: the middle of the strip of map between the sidebar and the ranking panel.
const CITY_CENTRE = { x: 955, y: 545 };
const MAP_CENTRE = { x: 915, y: 450 };
const FRAME_CENTRE = { x: 740, y: 470 };
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
  const mouse = (type, point, extra = {}) =>
    send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", ...extra });

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

  // Dragging pans the map without selecting the area under the pointer.
  const drag = async (from, to) => {
    await mouse("mousePressed", from, { clickCount: 1 });
    for (let step = 1; step <= 12; step += 1) {
      await mouse("mouseMoved", {
        x: from.x + ((to.x - from.x) * step) / 12,
        y: from.y + ((to.y - from.y) * step) / 12
      });
      await sleep(30);
    }
    await sleep(200);
    await mouse("mouseReleased", to, { clickCount: 1 });
    await sleep(400);
  };
  // The zoom control zooms about the middle of the pane, so centre the city between steps.
  const zoomIn = async () => {
    await evaluate(`document.querySelector(".leaflet-control-zoom-in").click()`);
    await sleep(700);
  };

  await zoomIn();
  await drag(
    {
      x: MAP_CENTRE.x + (CITY_CENTRE.x - MAP_CENTRE.x) * 2,
      y: MAP_CENTRE.y + (CITY_CENTRE.y - MAP_CENTRE.y) * 2
    },
    MAP_CENTRE
  );
  await zoomIn();
  await drag(MAP_CENTRE, FRAME_CENTRE);
  // Walk the pointer off the map and drop focus, so the shot has no focus ring. The last
  // hover tooltip stays up, which shows what pointing at an area does.
  for (let step = 1; step <= 10; step += 1) {
    await mouse("mouseMoved", { x: FRAME_CENTRE.x - step * 54, y: 140 }, { button: "none" });
    await sleep(30);
  }
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
