// The page side of the in-browser grader. It starts the worker on demand, sends one grade at a
// time, enforces the problem's time limit and replaces the worker after a timeout or a crash, as
// dogma's local runner replaces a killed process.
import type { LearnerReport, ProblemOut } from "../api/types";
import { DATA_URL, readJson } from "./data";
import type { GradeRequest, Headlines, TestBundle, WorkerOutbound } from "./runner-protocol";

export type RunnerStatus = "idle" | "loading" | "ready" | "running" | "failed";

/** The worker could not start (offline, or the Pyodide CDN is blocked). */
export class RuntimeUnavailable extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "RuntimeUnavailable";
  }
}

interface Started {
  readonly worker: Worker;
  readonly headlines: Headlines;
}

class BrowserRunner {
  private started: Promise<Started> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private sequence = 0;
  private status: RunnerStatus = "idle";
  private readonly listeners = new Set<() => void>();

  getStatus = (): RunnerStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Start loading Python in the background, so the first Run is quick. */
  warm(): void {
    this.start().catch(() => {
      // The status already says "failed"; Run reports the reason.
    });
  }

  /** Grade `code` for `problem`. Runs are queued: the worker holds one interpreter. */
  grade(problem: ProblemOut, code: string): Promise<LearnerReport> {
    const next = this.queue.then(() => this.gradeNow(problem, code));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private setStatus(status: RunnerStatus): void {
    this.status = status;
    for (const listener of this.listeners) listener();
  }

  private start(): Promise<Started> {
    if (this.started !== null) {
      return this.started;
    }
    this.setStatus("loading");
    const worker = new Worker(new URL("./runner.worker.ts", import.meta.url), { type: "module" });
    const started = new Promise<Started>((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerOutbound>) => {
        const message = event.data;
        if (message.type === "ready") {
          cleanup();
          this.setStatus("ready");
          resolve({ worker, headlines: message.headlines });
        } else if (message.type === "failed") {
          cleanup();
          reject(new RuntimeUnavailable(message.message));
        }
      };
      const onError = (event: ErrorEvent) => {
        cleanup();
        reject(new RuntimeUnavailable(event.message || "the grader worker failed to start"));
      };
      const cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
    });
    worker.postMessage({ type: "init", runnerFilesUrl: `${DATA_URL}pyrunner.json` });
    this.started = started;
    started.catch(() => {
      worker.terminate();
      this.started = null;
      this.setStatus("failed");
    });
    return started;
  }

  private stop(): void {
    const started = this.started;
    this.started = null;
    started?.then(({ worker }) => worker.terminate()).catch(() => undefined);
    this.setStatus("idle");
  }

  private async gradeNow(problem: ProblemOut, code: string): Promise<LearnerReport> {
    const [{ worker, headlines }, bundle] = await Promise.all([
      this.start(),
      readJson<TestBundle>(`runner/${problem.id}.json`)
    ]);
    if (bundle === null) {
      throw new RuntimeUnavailable(`the demo has no public tests for ${problem.id}`);
    }
    const id = ++this.sequence;
    const request: GradeRequest = {
      attempt_id: newAttemptId(),
      problem: {
        id: problem.id,
        version: problem.version,
        runtime: problem.runtime,
        language: problem.language,
        entry: problem.entry,
        banned_imports: problem.banned_imports
      },
      code,
      bundle
    };
    const base = {
      attempt_id: request.attempt_id,
      problem_id: problem.id,
      problem_version: problem.version,
      runtime: problem.runtime,
      tests: [],
      static: [],
      findings: [],
      stdout: ""
    } satisfies Partial<LearnerReport>;

    this.setStatus("running");
    return new Promise<LearnerReport>((resolve) => {
      let timer: number | undefined;
      let startedAt = performance.now();
      const finish = (report: LearnerReport, replaceWorker: boolean) => {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        if (replaceWorker) {
          this.stop();
        } else {
          this.setStatus("ready");
        }
        resolve(report);
      };
      const onMessage = (event: MessageEvent<WorkerOutbound>) => {
        const message = event.data;
        if (!("id" in message) || message.id !== id) {
          return;
        }
        if (message.type === "started") {
          startedAt = performance.now();
          timer = window.setTimeout(() => {
            // dogma.runner.run's wording for a run killed at its time limit.
            finish(
              {
                ...base,
                status: "timeout",
                headline: headlines.timeout,
                duration_ms: Math.round(performance.now() - startedAt),
                message: `the run exceeded its ${problem.timeout_s} s time limit`
              },
              true
            );
          }, problem.timeout_s * 1000);
        } else if (message.type === "graded") {
          finish(message.report, false);
        } else if (message.type === "crashed") {
          finish(
            {
              ...base,
              status: "error",
              headline: headlines.error,
              duration_ms: Math.round(performance.now() - startedAt),
              message: `the in-browser Python runtime stopped: ${message.message}`
            },
            true
          );
        }
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ type: "grade", id, request });
    });
  }
}

/** UTC timestamp plus a short random suffix, like dogma.runner.run.new_attempt_id. */
function newAttemptId(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const suffix = Math.floor(Math.random() * 0x100000000)
    .toString(16)
    .padStart(8, "0");
  return `${stamp}-${suffix}`;
}

export const runner = new BrowserRunner();
