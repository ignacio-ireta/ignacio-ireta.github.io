// Shared by the tools that screenshot a committed project page for its homepage card
// (tools/*/preview.mjs). Serves the repository root on a free loopback port, as GitHub Pages
// would, and drives an installed Chrome, Chromium, Brave or Edge over the DevTools protocol.
// No npm packages; `cwebp` converts the result (brew install webp).
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".geojson": "application/geo+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm"
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

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

export function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function serveRepo() {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
    let file = join(REPO_ROOT, path);
    if (!file.startsWith(REPO_ROOT)) return response.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream"
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((ready) => server.listen(0, "127.0.0.1", () => ready(server)));
}

// Opens a 1440×900 page at 2× in the light scheme and hands `drive` a small page object:
//   page.base                      origin of the local server
//   page.send(method, params)      a raw DevTools command
//   page.evaluate(expression)      runs in the page, returns the value
//   page.waitFor(expression, what) polls until the expression is truthy
//   page.press(key, keyCode)       one key press
// When `drive` returns, the viewport is captured and written to `output` as WebP, 1600 wide.
export async function shootPage({ output, drive }) {
  const browserPath = option("browser", process.env.CHROME_PATH ?? BROWSERS.find(existsSync));
  if (!browserPath) throw new Error("no Chromium-family browser found; pass --browser <path>");

  const server = await serveRepo();
  const profile = await mkdtemp(join(tmpdir(), "page-shot-"));
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
      (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }))
        .result?.result?.value;
    const waitFor = async (expression, what) => {
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await sleep(250);
        if (await evaluate(expression)) return;
      }
      throw new Error(`timed out waiting for ${what}`);
    };
    const press = async (key, code) => {
      const event = { key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...event });
      await send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
      await sleep(350);
    };

    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false
    });
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "light" }]
    });
    await drive({
      base: `http://127.0.0.1:${server.address().port}`,
      send,
      evaluate,
      waitFor,
      press
    });

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const png = join(profile, "preview.png");
    await writeFile(png, Buffer.from(shot.result.data, "base64"));
    await mkdir(dirname(output), { recursive: true });
    const converted = spawnSync(
      "cwebp",
      ["-quiet", "-q", "78", "-resize", "1600", "0", png, "-o", output],
      { stdio: "inherit" }
    );
    if (converted.status !== 0) throw new Error("cwebp failed (brew install webp)");
    console.log(`✓ wrote ${output.slice(REPO_ROOT.length + 1)}`);
    socket.close();
  } finally {
    browser.kill();
    server.close();
    await sleep(300);
    await rm(profile, { recursive: true, force: true });
  }
}
