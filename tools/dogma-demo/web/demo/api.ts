// The demo's stand-in for dogma's local API. It answers /api/v1 inside the page, so the real
// interface runs unchanged:
//
// - GETs come from the snapshot that capture.py took through the real API (same JSON).
// - Run and Submit grade the learner's file in the browser (runner.ts). Hidden tests never ship.
// - The hint ladder replays the reviewed hints (levels 1-3) as the same server-sent events.
// - Rating a due card replays the scheduler's real answer for that rating. Calendar moves preview.
// - Everything else that would write to the study log answers with a read-only notice.
import type { components } from "../api/schema";
import type { AttemptCreated, ProblemOut, RunMode, WorkspaceFile } from "../api/types";
import { readJson, readManifest } from "./data";
import { RuntimeUnavailable, runner } from "./runner";

type ProblemDetails = components["schemas"]["Problem"];
type DueReviewsOut = components["schemas"]["DueReviewsOut"];
type ReviewOut = components["schemas"]["ReviewOut"];

const API_PREFIX = "/api/v1/";
const DRAFT_KEY = "dogma-demo.workspace.";
const HINT_EVENT_DELAY_MS = 180;

/** The file a GET is stored under. Mirrors snapshot_key() in capture.py. */
export function snapshotKey(path: string, query: URLSearchParams): string {
  const names = [...new Set(query.keys())].sort();
  return `${path}${names.map((name) => `~${name}-${query.get(name) ?? ""}`).join("")}.json`;
}

/** The key of a calendar move. Mirrors warp_key() in capture.py. */
export function warpKey(move: { kind: string; week?: number | null; weeks?: number | null }) {
  const amount = move.week ?? move.weeks;
  return amount === undefined || amount === null ? move.kind : `${move.kind}-${amount}`;
}

// ---------------------------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function problem(status: number, code: string, title: string, detail: string, instance: string) {
  const body: ProblemDetails = {
    type: `urn:dogma:error:${code}`,
    title,
    status,
    detail,
    instance,
    code,
    errors: null
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/problem+json" }
  });
}

const READ_ONLY: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /^sessions\/[^/]+\/close$/,
    "Closing a session saves your note to the local study log. This demo is a read-only snapshot, so nothing is saved."
  ],
  [
    /^(calendar\/warp|course\/reset)$/,
    "Moving the calendar changes the local study log. The demo previews moves but does not make them."
  ],
  [
    /^mocks(\/|$)/,
    "Mock interviews run in the local app: it times each part, answers questions about the case and keeps your scores."
  ],
  [
    /^resolves(\/|$)/,
    "Timed re-solves run in the local app, which keeps the clock and your history."
  ],
  [
    /^topics\/.+\/answers$/,
    "Self-scored answers go to the local study log. This demo is a read-only snapshot."
  ],
  [
    /^tutor\//,
    "The tutor's personal answers come from a local model in the full app. The demo shows the reviewed hints."
  ]
];

function readOnly(path: string, instance: string): Response {
  const detail =
    READ_ONLY.find(([pattern]) => pattern.test(path))?.[1] ??
    "This would write to the local study log. The demo is a read-only snapshot.";
  return problem(403, "DEMO_READ_ONLY", "Read-only demo", detail, instance);
}

function notFound(instance: string, detail = "This is not part of the demo snapshot."): Response {
  return problem(404, "CONTENT_NOT_FOUND", "Not Found", detail, instance);
}

// ---------------------------------------------------------------------------------------------
// Browser-local state: the learner's drafts persist; session choices last until a reload.
// ---------------------------------------------------------------------------------------------

const memoryDrafts = new Map<string, string>();

const drafts = {
  get(problemId: string): string | null {
    try {
      return window.localStorage.getItem(DRAFT_KEY + problemId);
    } catch {
      return memoryDrafts.get(problemId) ?? null;
    }
  },
  set(problemId: string, content: string): void {
    try {
      window.localStorage.setItem(DRAFT_KEY + problemId, content);
    } catch {
      memoryDrafts.set(problemId, content);
    }
  }
};

let energy: "normal" | "low" | null = null; // null: as captured
const ratedCards = new Set<string>();

// ---------------------------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------------------------

async function snapshot(path: string, query: URLSearchParams, instance: string) {
  const body = await readJson<unknown>(`api/${snapshotKey(path, query)}`);
  if (body !== null) {
    return json(body);
  }
  const interview = /^topics\/(.+)\/interview$/.exec(path);
  return notFound(instance, interview ? `${interview[1]} has no interview questions` : undefined);
}

async function getProblem(path: string, query: URLSearchParams, instance: string) {
  const response = await snapshot(path, query, instance);
  const id = path.slice("problems/".length);
  // Start Python in the background while the learner reads the statement.
  if (response.ok && (await readManifest()).browser_runnable.includes(id)) {
    runner.warm();
  }
  return response;
}

async function getToday(query: URLSearchParams, instance: string) {
  const requested = query.get("energy");
  if (requested === "low" || requested === "normal") {
    energy = requested;
  }
  const key = energy === null ? new URLSearchParams() : new URLSearchParams({ energy });
  return snapshot("today", key, instance);
}

async function getDueReviews(query: URLSearchParams, instance: string) {
  const due = await readJson<DueReviewsOut>(`api/${snapshotKey("reviews/due", query)}`);
  if (due === null) {
    return notFound(instance);
  }
  return json({ ...due, cards: due.cards.filter((card) => !ratedCards.has(card.card_id)) });
}

function getWorkspace(problemId: string): Response {
  const content = drafts.get(problemId);
  const body: WorkspaceFile = { problem_id: problemId, exists: content !== null, content };
  return json(body);
}

function putWorkspace(problemId: string, body: unknown): Response {
  const content = (body as { content?: unknown } | null)?.content;
  if (typeof content !== "string") {
    return problem(422, "API_VALIDATION", "Unprocessable Content", "content must be text", "");
  }
  drafts.set(problemId, content);
  const saved: WorkspaceFile = { problem_id: problemId, exists: true, content };
  return json(saved);
}

const RECORD_NOTE: Record<RunMode, string> = {
  run: "the demo grades your file in this browser and keeps no history",
  submit:
    "Submit's hidden tests ship only with the local app, so this was graded on the public tests in your browser"
};

async function postAttempt(body: unknown, instance: string): Promise<Response> {
  const request = body as { problem_id?: unknown; mode?: unknown } | null;
  const problemId = typeof request?.problem_id === "string" ? request.problem_id : "";
  const mode: RunMode = request?.mode === "submit" ? "submit" : "run";
  const row = await readJson<ProblemOut>(`api/problems/${problemId}.json`);
  if (row === null) {
    return notFound(instance, `no problem ${problemId}`);
  }
  const manifest = await readManifest();
  if (!manifest.browser_runnable.includes(row.id)) {
    const detail =
      row.runtime === "py-torch"
        ? "This problem's tests need PyTorch, which does not run in the browser. The local app grades it with uv run --frozen --group torch dogma serve."
        : "This problem's tests do not run in the in-browser Python yet. The local app grades it.";
    return problem(422, "RUNNER_RUNTIME_UNAVAILABLE", "Needs the local app", detail, instance);
  }
  try {
    const report = await runner.grade(row, drafts.get(row.id) ?? row.starter ?? "");
    // Reported as a run: only the public tests were checked, so no hidden count is shown.
    const created: AttemptCreated = {
      mode: "run",
      recorded: false,
      record_warning: RECORD_NOTE[mode],
      report,
      timed_resolve: null
    };
    return json(created, 201);
  } catch (error) {
    if (error instanceof RuntimeUnavailable) {
      return problem(
        503,
        "RUNNER_RUNTIME_UNAVAILABLE",
        "Python did not load",
        `Python could not start in this browser (${error.message}). The demo loads Pyodide from cdn.jsdelivr.net; check the connection and try again.`,
        instance
      );
    }
    throw error;
  }
}

async function postRating(cardId: string, body: unknown, instance: string): Promise<Response> {
  const rating = String((body as { rating?: unknown } | null)?.rating ?? "");
  const answers = await readJson<Record<string, Record<string, ReviewOut>>>("review-ratings.json");
  const answer = answers?.[cardId]?.[rating];
  if (answer === undefined) {
    return notFound(instance, `card ${cardId} is not due in this snapshot`);
  }
  if (ratedCards.has(cardId)) {
    return problem(409, "REVIEW_STALE", "Conflict", "This card was already rated.", instance);
  }
  ratedCards.add(cardId);
  return json(answer);
}

async function postWarp(body: unknown, instance: string): Promise<Response> {
  const move = (body ?? {}) as {
    kind?: string;
    week?: number | null;
    weeks?: number | null;
    dry_run?: boolean;
  };
  if (move.dry_run !== true || typeof move.kind !== "string") {
    return readOnly("calendar/warp", instance);
  }
  const previews =
    await readJson<Record<string, { status: number; body: unknown }>>("warp-previews.json");
  const preview = previews?.[warpKey({ kind: move.kind, week: move.week, weeks: move.weeks })];
  return preview === undefined
    ? readOnly("calendar/warp", instance)
    : json(preview.body, preview.status);
}

async function postHintStream(body: unknown, instance: string): Promise<Response> {
  const request = body as { problem_id?: unknown; level?: unknown } | null;
  const problemId = typeof request?.problem_id === "string" ? request.problem_id : "";
  const level = typeof request?.level === "number" ? request.level : 1;
  const ladder = await readJson<Record<string, string>>(`hints/${problemId}.json`);
  const stream = ladder?.[String(level)];
  if (stream === undefined) {
    return problem(
      403,
      "DEMO_READ_ONLY",
      "Read-only demo",
      level >= 4
        ? "The level-4 walkthrough stays in the local app: it shows the full approach."
        : "This hint is not part of the demo snapshot.",
      instance
    );
  }
  return eventStream(stream);
}

/** Replay captured server-sent events one at a time, as the API streams them. */
function eventStream(text: string): Response {
  const events = text.split(/(?<=\n\n)/).filter((event) => event.trim() !== "");
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = events.shift();
      if (next === undefined) {
        controller.close();
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, HINT_EVENT_DELAY_MS));
      controller.enqueue(encoder.encode(next));
    }
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text === "") {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function route(request: Request, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const segments = url.pathname.slice(API_PREFIX.length).split("/").map(decodeURIComponent);
  const path = segments.join("/");
  const rest = segments.slice(1).join("/");
  const query = url.searchParams;
  const instance = url.pathname;

  if (method === "GET") {
    switch (segments[0]) {
      case "workspace":
        return getWorkspace(rest);
      case "problems":
        return getProblem(path, query, instance);
      case "today":
        return getToday(query, instance);
      case "reviews":
        return path === "reviews/due" ? getDueReviews(query, instance) : notFound(instance);
      case "search":
        return problem(
          503,
          "CORPUS_UNAVAILABLE",
          "Not in the demo",
          "Search reads a local library of papers and notes that stays on the learner's machine.",
          instance
        );
      default:
        return snapshot(path, query, instance);
    }
  }

  const body = await readBody(request);
  if (method === "PUT" && segments[0] === "workspace") {
    return putWorkspace(rest, body);
  }
  if (method === "POST") {
    if (path === "attempts") return postAttempt(body, instance);
    if (path === "calendar/warp") return postWarp(body, instance);
    if (path === "tutor/hint/stream") return postHintStream(body, instance);
    if (segments[0] === "reviews" && rest !== "") return postRating(rest, body, instance);
  }
  return readOnly(path, instance);
}

/** Answer /api/v1 in the page. Any other request goes to the network as usual. */
export function installDemoApi(): void {
  const network = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(API_PREFIX)) {
      return network(input, init);
    }
    try {
      return await route(request, url);
    } catch (error) {
      return problem(
        500,
        "DEMO_FAILURE",
        "Demo error",
        `The demo could not answer: ${error instanceof Error ? error.message : String(error)}`,
        url.pathname
      );
    }
  };
}
