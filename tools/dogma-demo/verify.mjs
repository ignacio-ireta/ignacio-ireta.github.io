// Grades every browser-eligible problem in Pyodide under Node, with the same Python files the
// demo's Web Worker loads: the starter must not pass and the reference solution must pass. Only
// problems that do both are marked runnable in the demo; the rest show a "needs the local app"
// notice. The solutions are read from dogma here and never written to the output.
//
// Node's default stack is close to a browser worker's, so a problem that exhausts it here (for
// example, freeing a 10,000-deep linked structure) is kept out of the browser too.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPyodide } from "pyodide";

const RUNNER_DIR = "/home/pyodide/dogma-demo";
const QUIET = { messageCallback: () => {} };

async function boot(runnerFiles) {
  const pyodide = await loadPyodide();
  // Pytest's own terminal report is not part of the grade; the Collector captures learner output.
  pyodide.setStdout({ batched: () => {} });
  pyodide.setStderr({ batched: () => {} });
  await pyodide.loadPackage(["pytest"], QUIET);
  for (const [path, text] of Object.entries(runnerFiles)) {
    const target = `${RUNNER_DIR}/${path}`;
    pyodide.FS.mkdirTree(target.slice(0, target.lastIndexOf("/")));
    pyodide.FS.writeFile(target, text);
  }
  pyodide.runPython(`import sys; sys.path.insert(0, ${JSON.stringify(RUNNER_DIR)})`);
  return { pyodide, runner: pyodide.pyimport("dogma_demo_runner") };
}

/**
 * @param {{ snapshotDir: string, dogmaDir: string, runnerFiles: Record<string, string>,
 *           problems: Record<string, any>, log?: (line: string) => void }} options
 * @returns {Promise<{ runnable: string[], failures: { id: string, reason: string }[] }>}
 */
export async function verifyProblems({ snapshotDir, dogmaDir, runnerFiles, problems, log }) {
  const say = log ?? (() => {});
  let runtime = await boot(runnerFiles);
  let attempt = 0;

  const grade = async (problem, bundle, code) => {
    // Each source is scanned on its own: a SQL submission or a syntax error must not hide the
    // imports of the tests. Mirrored by the Web Worker.
    await runtime.pyodide.loadPackagesFromImports(bundle.tests["test_public.py"], QUIET);
    if (problem.language === "python") {
      await runtime.pyodide.loadPackagesFromImports(code, QUIET);
    }
    attempt += 1;
    const request = { attempt_id: `verify-${attempt}`, problem, code, bundle };
    return JSON.parse(runtime.runner.grade(JSON.stringify(request)));
  };

  const runnable = [];
  const failures = [];
  const fail = (id, reason) => {
    failures.push({ id, reason: reason.slice(0, 400) });
    say(`  ✗ ${id}: ${reason.slice(0, 160)}`);
  };

  for (const [id, problem] of Object.entries(problems)) {
    let bundle;
    try {
      bundle = JSON.parse(await readFile(join(snapshotDir, "runner", `${id}.json`), "utf8"));
    } catch {
      continue; // not a browser runtime: capture.py wrote no bundle
    }
    const [track, topic, name] = id.split("/");
    const solutionFile = problem.language === "sql" ? "solution.sql" : "solution.py";
    const solution = await readFile(
      join(dogmaDir, "content", track, topic, "problems", name, solutionFile),
      "utf8"
    );
    const started = Date.now();
    let fromStarter;
    let fromSolution;
    try {
      fromStarter = await grade(problem, bundle, problem.starter);
      fromSolution = await grade(problem, bundle, solution);
    } catch (error) {
      const fatal = Boolean(error && error.pyodide_fatal_error);
      fail(id, `${fatal ? "the runtime crashed" : "the grader threw"}: ${String(error)}`);
      if (fatal) runtime = await boot(runnerFiles);
      continue;
    }
    if (fromSolution.status !== "passed") {
      const first = fromSolution.tests.find((t) => t.outcome !== "pass");
      const detail = first ? `${first.name}: ${first.message}` : fromSolution.message;
      fail(id, `solution ${fromSolution.status}: ${detail}`);
    } else if (fromStarter.status === "passed") {
      fail(id, "the starter passed its public tests");
    } else {
      runnable.push(id);
      say(`  ✓ ${id} (${Date.now() - started} ms)`);
    }
  }
  return { runnable, failures };
}
