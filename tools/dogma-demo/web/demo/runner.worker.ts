// The demo's grader: Pyodide in a Web Worker, running dogma's own static checks, pytest
// collector and learner-safe wording (see pyrunner/dogma_demo_runner.py). The page owns the time
// limit: it terminates this worker when a run takes too long.
import type { LearnerReport } from "../api/types";
import type { GradeRequest, Headlines, WorkerInbound, WorkerOutbound } from "./runner-protocol";

const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${__PYODIDE_VERSION__}/full/`;
const RUNNER_DIR = "/home/pyodide/dogma-demo";

interface LoadOptions {
  readonly messageCallback?: (message: string) => void;
}

interface Pyodide {
  readonly FS: {
    mkdirTree(path: string): void;
    writeFile(path: string, data: string): void;
  };
  loadPackage(names: readonly string[], options?: LoadOptions): Promise<unknown>;
  loadPackagesFromImports(code: string, options?: LoadOptions): Promise<unknown>;
  runPython(code: string): unknown;
  pyimport(name: string): unknown;
  setStdout(options: { readonly batched: (text: string) => void }): void;
  setStderr(options: { readonly batched: (text: string) => void }): void;
}

interface PyodideModule {
  loadPyodide(options: { readonly indexURL: string }): Promise<Pyodide>;
}

interface RunnerModule {
  grade(requestJson: string): string;
  headlines(): string;
}

// Typed view of the worker scope; the DOM and WebWorker libs cannot both be loaded.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerInbound>) => void) | null;
  postMessage(message: WorkerOutbound): void;
};

const QUIET: LoadOptions = { messageCallback: () => {} };
let pyodide: Pyodide | null = null;
let runner: RunnerModule | null = null;

async function init(runnerFilesUrl: string): Promise<Headlines> {
  const pyodideModule = (await import(
    /* @vite-ignore */ `${INDEX_URL}pyodide.mjs`
  )) as PyodideModule;
  const py = await pyodideModule.loadPyodide({ indexURL: INDEX_URL });
  // Pytest's own terminal report is not part of the grade; the Collector captures learner output.
  py.setStdout({ batched: () => {} });
  py.setStderr({ batched: () => {} });
  const [files] = await Promise.all([
    fetch(runnerFilesUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`could not load the grader files (${response.status})`);
      }
      return response.json() as Promise<Record<string, string>>;
    }),
    py.loadPackage(["pytest"], QUIET)
  ]);
  for (const [path, text] of Object.entries(files)) {
    const target = `${RUNNER_DIR}/${path}`;
    py.FS.mkdirTree(target.slice(0, target.lastIndexOf("/")));
    py.FS.writeFile(target, text);
  }
  py.runPython(`import sys; sys.path.insert(0, ${JSON.stringify(RUNNER_DIR)})`);
  const grader = py.pyimport("dogma_demo_runner") as RunnerModule;
  pyodide = py;
  runner = grader;
  return JSON.parse(grader.headlines()) as Headlines;
}

async function grade(id: number, request: GradeRequest): Promise<void> {
  if (pyodide === null || runner === null) {
    throw new Error("the grader is not loaded");
  }
  // Each source is scanned on its own: a SQL submission or a syntax error must not hide the
  // imports of the tests. Mirrored by tools/dogma-demo/verify.mjs.
  await pyodide.loadPackagesFromImports(request.bundle.tests["test_public.py"] ?? "", QUIET);
  if (request.problem.language === "python") {
    await pyodide.loadPackagesFromImports(request.code, QUIET);
  }
  // The page starts the time limit here, after any package download.
  scope.postMessage({ type: "started", id });
  const report = JSON.parse(runner.grade(JSON.stringify(request))) as LearnerReport;
  scope.postMessage({ type: "graded", id, report });
}

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === "init") {
    init(message.runnerFilesUrl).then(
      (headlines) => scope.postMessage({ type: "ready", headlines }),
      (error: unknown) => scope.postMessage({ type: "failed", message: String(error) })
    );
    return;
  }
  grade(message.id, message.request).catch((error: unknown) =>
    scope.postMessage({ type: "crashed", id: message.id, message: String(error) })
  );
};
