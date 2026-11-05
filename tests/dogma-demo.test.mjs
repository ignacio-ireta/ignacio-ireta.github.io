import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Integrity checks for the committed dogma demo (projects/dogma/, built by
// tools/dogma-demo/build.mjs). They catch a partial copy or a snapshot that the
// demo's API stand-in (tools/dogma-demo/web/demo/api.ts) could not serve.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const demo = join(repoRoot, "projects", "dogma");
const data = join(demo, "data");
const readJson = (path) => JSON.parse(readFileSync(join(data, path), "utf8"));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

test("the demo page loads assets that exist", () => {
  const html = readFileSync(join(demo, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="(\/projects\/dogma\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(
    refs.some((ref) => ref.endsWith(".js")),
    "no script in index.html"
  );
  for (const ref of refs) {
    assert.ok(existsSync(join(repoRoot, ref)), `missing ${ref}`);
  }
});

test("the manifest describes a verified snapshot", () => {
  const manifest = readJson("manifest.json");
  assert.equal(manifest.schema, 1);
  assert.match(manifest.local_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(manifest.pyodide_version, /^\d+\.\d+\.\d+$/);
  assert.ok(manifest.browser_runnable.length > 0, "no problem runs in the browser");
  for (const id of manifest.browser_runnable) {
    assert.ok(manifest.runtimes[id], `${id} is runnable but not in the catalog`);
  }
});

test("every GET the interface makes at start-up has a snapshot file", () => {
  for (const key of [
    "health",
    "catalog",
    "today",
    "today~energy-low",
    "today~energy-normal",
    "progress",
    "calendar",
    "coverage",
    "reviews/due~limit-20",
    "mocks/current",
    "resolves/current",
    "rubrics/topic-answer",
    "rubrics/mock"
  ]) {
    assert.ok(existsSync(join(data, "api", `${key}.json`)), `missing api/${key}.json`);
  }
});

test("every catalog topic and problem can be opened", () => {
  const catalog = readJson("api/catalog.json");
  const manifest = readJson("manifest.json");
  assert.ok(catalog.topics.length > 0);
  for (const topic of catalog.topics) {
    assert.ok(existsSync(join(data, "api", "topics", `${topic.id}.json`)), topic.id);
    for (const { id } of topic.problems) {
      const problem = readJson(`api/problems/${id}.json`);
      assert.equal(problem.id, id);
      assert.ok(existsSync(join(data, "hints", `${id}.json`)), `no hints for ${id}`);
      if (manifest.browser_runnable.includes(id)) {
        const bundle = readJson(`runner/${id}.json`);
        assert.deepEqual(Object.keys(bundle.tests), ["test_public.py"], id);
      }
    }
  }
});

test("only public tests, starters and reviewed hints ship", () => {
  for (const path of walk(demo)) {
    const name = relative(demo, path);
    assert.doesNotMatch(name, /(^|\/)(solution\.(py|sql)|test_hidden\.py)$/, name);
    // GitHub Pages runs Jekyll here, which drops names starting with _ or .
    assert.ok(!name.split("/").some((part) => /^[_.]/.test(part)), `Jekyll would skip ${name}`);
  }
  for (const path of walk(join(data, "runner"))) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /test_hidden/, relative(data, path));
  }
  for (const path of walk(join(data, "hints"))) {
    const ladder = JSON.parse(readFileSync(path, "utf8"));
    assert.ok(
      Object.keys(ladder).every((level) => ["1", "2", "3"].includes(level)),
      `${relative(data, path)} has a level other than 1-3`
    );
  }
});

test("the in-browser grader ships dogma's harness and the demo runner", () => {
  const files = readJson("pyrunner.json");
  for (const path of [
    "dogma_demo_runner.py",
    "dogma_harness/collector.py",
    "dogma_harness/report.py",
    "dogma/grading/static.py",
    "dogma/grading/display.py",
    "dogma/grading/models.py"
  ]) {
    assert.equal(typeof files[path], "string", `pyrunner.json has no ${path}`);
  }
});
