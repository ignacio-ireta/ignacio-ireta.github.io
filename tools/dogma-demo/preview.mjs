// Screenshots the built demo for the homepage card: images/dogma-demo.webp.
//
//   node tools/dogma-demo/preview.mjs [--dogma <path>]
//
// Serves the repository root on a free loopback port (as GitHub Pages would), opens the problem
// page with the starter code (never a solution), and converts the shot with cwebp. Uses
// Playwright from dogma's web/node_modules, so it needs `pnpm exec playwright install chromium`
// there once.
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TOOL_DIR, "..", "..");
const OUTPUT = join(REPO_ROOT, "images", "dogma-demo.webp");
const PROBLEM = "cml/vector-operations/p01-vector-projection";
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".png": "image/png"
};

const dogmaArg = process.argv.indexOf("--dogma");
const dogma = resolve(
  dogmaArg === -1
    ? (process.env.DOGMA_DIR ?? join(REPO_ROOT, "..", "dogma"))
    : process.argv[dogmaArg + 1]
);
const { chromium } = await import(
  pathToFileURL(join(dogma, "web", "node_modules", "@playwright", "test", "index.mjs")).href
);

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
const base = `http://127.0.0.1:${server.address().port}/projects/dogma/`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  // A returning visitor: the introduction was seen and the demo badge is closed. (These
  // callbacks run in the page, hence globalThis.)
  await page.addInitScript(() => {
    globalThis.localStorage.setItem("dogma.welcome.seen", "1");
    globalThis.localStorage.setItem("dogma-demo.badge.open", "0");
  });
  await page.goto(`${base}#/problem/${PROBLEM}`);
  await page.getByRole("button", { name: "Run", exact: true }).waitFor();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => globalThis.document.fonts.ready);
  const png = join(TOOL_DIR, ".build", "preview.png");
  await mkdir(dirname(png), { recursive: true });
  await page.screenshot({ path: png });
  await mkdir(dirname(OUTPUT), { recursive: true });
  const converted = spawnSync(
    "cwebp",
    ["-quiet", "-q", "78", "-resize", "1600", "0", png, "-o", OUTPUT],
    {
      stdio: "inherit"
    }
  );
  if (converted.status !== 0) throw new Error("cwebp failed (brew install webp)");
  await rm(png);
  console.log(`✓ wrote ${OUTPUT.slice(REPO_ROOT.length + 1)}`);
} finally {
  await browser.close();
  server.close();
}
