// Builds the static dogma demo into projects/dogma/ (see README.md in this folder).
//
//   node tools/dogma-demo/build.mjs [--dogma <path>] [--reuse-snapshot]
//
// 1. capture  – capture.py runs in dogma's own environment and records the API (snapshot/).
// 2. verify   – Pyodide grades every browser-eligible problem (starter fails, solution passes).
// 3. stage    – dogma's web/ is copied to .build/web with the demo entry point added.
// 4. build    – dogma's TypeScript check, then Vite, both from dogma's own node_modules.
// 5. assemble – the build and the snapshot go to projects/dogma/; nothing else is kept.
// 6. check    – the output must not contain solutions, hidden tests or local paths.
//
// The dogma checkout is only read. Everything temporary lives in tools/dogma-demo/.build/.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyProblems } from "./verify.mjs";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TOOL_DIR, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "projects", "dogma");
const BASE_PATH = "/projects/dogma/";
const WORK_DIR = join(TOOL_DIR, ".build");
const SNAPSHOT_DIR = join(WORK_DIR, "snapshot");
const STAGE_DIR = join(WORK_DIR, "web");
const VITE_OUT_DIR = join(WORK_DIR, "dist");

// dogma modules the in-browser grader runs verbatim (paths under dogma's src/).
const VERBATIM_PY = [
  "dogma/__init__.py",
  "dogma/grading/__init__.py",
  "dogma/grading/static.py",
  "dogma/grading/display.py",
  "dogma_harness/__init__.py",
  "dogma_harness/collector.py",
  "dogma_harness/report.py"
];
// The demo's own Python (paths under pyrunner/).
const DEMO_PY = ["dogma/grading/models.py", "dogma_demo_runner.py"];
// What the staged web build needs from dogma's web/ (node_modules is linked, not copied).
const WEB_ENTRIES = ["index.html", "package.json", "public", "src", "tsconfig.json"];

function parseArgs(argv) {
  const args = { dogma: process.env.DOGMA_DIR ?? join(REPO_ROOT, "..", "dogma"), reuse: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dogma") args.dogma = argv[++i];
    else if (argv[i] === "--reuse-snapshot") args.reuse = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  args.dogma = resolve(args.dogma);
  return args;
}

function step(title) {
  console.log(`\n▸ ${title}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status ?? result.signal}`);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

async function runnerFiles(dogma) {
  const files = {};
  for (const path of VERBATIM_PY) {
    files[path] = await readFile(join(dogma, "src", path), "utf8");
  }
  for (const path of DEMO_PY) {
    files[path] = await readFile(join(TOOL_DIR, "pyrunner", path), "utf8");
  }
  return files;
}

async function capture(dogma) {
  step("Capture the API snapshot (dogma's environment, scratch data root)");
  run(
    "uv",
    [
      "run",
      "--frozen",
      "python",
      join(TOOL_DIR, "capture.py"),
      dogma,
      SNAPSHOT_DIR,
      join(WORK_DIR, "capture")
    ],
    { cwd: dogma }
  );
}

async function verify(dogma, files) {
  step("Grade every browser-eligible problem in Pyodide");
  const catalog = await readJson(join(SNAPSHOT_DIR, "api", "catalog.json"));
  const problems = {};
  for (const topic of catalog.topics) {
    for (const { id } of topic.problems) {
      problems[id] = await readJson(join(SNAPSHOT_DIR, "api", "problems", `${id}.json`));
    }
  }
  const failed = [];
  const { runnable, failures } = await verifyProblems({
    snapshotDir: SNAPSHOT_DIR,
    dogmaDir: dogma,
    runnerFiles: files,
    problems,
    log: (line) => (line.includes("✗") ? failed.push(line) : undefined)
  });
  for (const line of failed) console.log(line);
  console.log(
    `  ${runnable.length} of ${Object.keys(problems).length} problems run in the browser`
  );
  if (runnable.length === 0) {
    throw new Error("no problem could be graded in Pyodide: check pyrunner/ against dogma's src/");
  }
  return { runnable, failures };
}

async function stage(dogma) {
  step("Stage dogma's web app with the demo entry point");
  const web = join(dogma, "web");
  if (!existsSync(join(web, "node_modules"))) {
    throw new Error(`${web}/node_modules is missing: run pnpm --dir web install in dogma first`);
  }
  await rm(STAGE_DIR, { recursive: true, force: true });
  await mkdir(STAGE_DIR, { recursive: true });
  for (const entry of WEB_ENTRIES) {
    await cp(join(web, entry), join(STAGE_DIR, entry), { recursive: true });
  }
  await symlink(join(web, "node_modules"), join(STAGE_DIR, "node_modules"), "dir");
  await cp(join(TOOL_DIR, "web", "demo"), join(STAGE_DIR, "src", "demo"), { recursive: true });
  await cp(join(TOOL_DIR, "web", "main-demo.tsx"), join(STAGE_DIR, "src", "main-demo.tsx"));
  await cp(join(TOOL_DIR, "web", "vite.demo.config.mjs"), join(STAGE_DIR, "vite.demo.config.mjs"));
  // dogma's own settings, minus its unit tests (they are checked in dogma, not here).
  await writeFile(
    join(STAGE_DIR, "tsconfig.demo.json"),
    JSON.stringify({
      extends: "./tsconfig.json",
      include: ["src"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]
    })
  );

  const indexPath = join(STAGE_DIR, "index.html");
  const index = await readFile(indexPath, "utf8");
  const patched = index
    .replace('src="/src/main.tsx"', 'src="/src/main-demo.tsx"')
    .replace(/<title>[^<]*<\/title>/, "<title>dogma · interactive demo</title>")
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      '<meta name="description" content="An interactive demo of dogma, a local-first practice platform for ML and AI engineering: lessons, verified problems graded in the browser, spaced review." />'
    );
  if (!patched.includes("/src/main-demo.tsx")) {
    throw new Error("dogma's web/index.html no longer loads /src/main.tsx: update stage()");
  }
  await writeFile(indexPath, patched);
}

async function buildWeb(pyodideVersion) {
  step("Type-check (dogma's tsconfig) and build with Vite");
  const bin = (name) => join(STAGE_DIR, "node_modules", ".bin", name);
  run(bin("tsc"), ["--noEmit", "-p", "tsconfig.demo.json"], { cwd: STAGE_DIR });
  run(bin("vite"), ["build", "--config", "vite.demo.config.mjs", "--logLevel", "warn"], {
    cwd: STAGE_DIR,
    env: {
      ...process.env,
      DEMO_BASE: BASE_PATH,
      DEMO_OUT_DIR: VITE_OUT_DIR,
      PYODIDE_VERSION: pyodideVersion
    }
  });
}

async function assemble() {
  step(`Assemble ${relative(REPO_ROOT, OUTPUT_DIR)}/`);
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await cp(VITE_OUT_DIR, OUTPUT_DIR, { recursive: true });
  await cp(SNAPSHOT_DIR, join(OUTPUT_DIR, "data"), { recursive: true });
}

/** Lines of `text` long enough to be distinctive, trimmed. */
function distinctiveLines(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 40 && !line.startsWith("#"));
}

async function checkOutput(dogma) {
  step("Check the output for leaks");
  const texts = [];
  let files = 0;
  for await (const path of walk(OUTPUT_DIR)) {
    files += 1;
    const name = relative(OUTPUT_DIR, path);
    // GitHub Pages runs Jekyll here (no .nojekyll), which drops names starting with _ or .
    if (name.split("/").some((part) => part.startsWith("_") || part.startsWith("."))) {
      throw new Error(`Jekyll would not publish ${name}`);
    }
    if (/\.(html|js|css|json|svg|txt|md)$/.test(path)) texts.push(await readFile(path, "utf8"));
  }
  const haystack = texts.join("\n");
  const findings = [];
  const forbidden = [dogma, REPO_ROOT, "/Users/", "127.0.0.1:9", "External SSD"];
  for (const needle of forbidden) {
    if (haystack.includes(needle)) findings.push(`contains "${needle}"`);
  }

  // A leak is a line that exists only in a solution or a hidden test and still shows up in the
  // output. Lines that also appear in learner-facing material (any lesson, statement, hint,
  // starter, public test, card or interview file) or in the shipped grader are not secrets.
  const catalog = await readJson(join(SNAPSHOT_DIR, "api", "catalog.json"));
  const learnerFacing = [JSON.stringify(await runnerFiles(dogma))];
  const secrets = [];
  for (const topic of catalog.topics) {
    const topicDir = join(dogma, "content", ...topic.id.split("/"));
    for (const name of ["lesson.md", "cards.yaml", "interview.md"]) {
      learnerFacing.push(await readFile(join(topicDir, name), "utf8").catch(() => ""));
    }
    for (const { id } of topic.problems) {
      const dir = join(topicDir, "problems", id.split("/")[2]);
      const read = (name) => readFile(join(dir, name), "utf8").catch(() => "");
      for (const name of [
        "problem.md",
        "hints.md",
        "starter.py",
        "starter.sql",
        "test_public.py"
      ]) {
        learnerFacing.push(await read(name));
      }
      for (const name of ["solution.py", "solution.sql", "test_hidden.py"]) {
        secrets.push({ where: `${id}/${name}`, text: await read(name) });
      }
    }
  }
  const shown = learnerFacing.join("\n");
  let checkedLines = 0;
  for (const { where, text } of secrets) {
    for (const line of distinctiveLines(text)) {
      if (shown.includes(line)) continue;
      checkedLines += 1;
      // The snapshot is JSON, so look for the escaped form too.
      const escaped = JSON.stringify(line).slice(1, -1);
      if (haystack.includes(line) || haystack.includes(escaped)) {
        findings.push(`${where}: "${line.slice(0, 80)}"`);
      }
    }
  }
  if (findings.length > 0) {
    throw new Error(`the output leaks private material:\n  ${findings.join("\n  ")}`);
  }
  console.log(`  ${files} files; ${checkedLines} solution and hidden-test lines absent`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(join(args.dogma, "src", "dogma_harness"))) {
    throw new Error(`${args.dogma} is not a dogma checkout (use --dogma or DOGMA_DIR)`);
  }
  const pyodideVersion = (await readJson(join(TOOL_DIR, "node_modules", "pyodide", "package.json")))
    .version;
  const files = await runnerFiles(args.dogma);
  const manifestPath = join(SNAPSHOT_DIR, "manifest.json");

  const reuse = args.reuse && existsSync(manifestPath);
  if (reuse && (await readJson(manifestPath)).pyodide_version === pyodideVersion) {
    step("Reuse the verified snapshot in .build/snapshot");
  } else {
    await capture(args.dogma);
    const { runnable, failures } = await verify(args.dogma, files);
    const manifest = await readJson(manifestPath);
    await writeFile(
      manifestPath,
      JSON.stringify({
        ...manifest,
        pyodide_version: pyodideVersion,
        browser_runnable: runnable,
        browser_excluded: failures
      })
    );
  }
  await writeFile(join(SNAPSHOT_DIR, "pyrunner.json"), JSON.stringify(files));

  await stage(args.dogma);
  await buildWeb(pyodideVersion);
  await assemble();
  await checkOutput(args.dogma);
  console.log(`\n✓ dogma demo built into ${relative(REPO_ROOT, OUTPUT_DIR)}/`);
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
