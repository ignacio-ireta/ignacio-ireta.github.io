// Messages between the page (runner.ts) and the grader worker (runner.worker.ts).
import type { LearnerReport, ProblemOut } from "../api/types";

/** Public tests and fixtures of one problem (capture.py writes one per browser-runnable problem). */
export interface TestBundle {
  readonly tests: Readonly<Record<string, string>>;
  /** Fixture files, base64, keyed by their path inside the problem directory. */
  readonly fixtures: Readonly<Record<string, string>>;
}

export interface GradeRequest {
  readonly attempt_id: string;
  readonly problem: Pick<
    ProblemOut,
    "id" | "version" | "runtime" | "language" | "entry" | "banned_imports"
  >;
  readonly code: string;
  readonly bundle: TestBundle;
}

/** Sentences from dogma.grading.display for runs the page stops (timeout) or loses (error). */
export interface Headlines {
  readonly timeout: string;
  readonly error: string;
}

export type WorkerInbound =
  | { readonly type: "init"; readonly runnerFilesUrl: string }
  | { readonly type: "grade"; readonly id: number; readonly request: GradeRequest };

export type WorkerOutbound =
  | { readonly type: "ready"; readonly headlines: Headlines }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "started"; readonly id: number }
  | { readonly type: "graded"; readonly id: number; readonly report: LearnerReport }
  | { readonly type: "crashed"; readonly id: number; readonly message: string };
