# dogma demo: build & publication contract

`projects/dogma/` is an interactive demo of **dogma**, a local-first practice platform for ML,
data science, and AI engineering ([source](https://github.com/ignacio-ireta/dogma)). It is the dogma analogue of
[`cdmx-data-contract.md`](cdmx-data-contract.md) and
[`etf-outputs-contract.md`](etf-outputs-contract.md): it says what is published, where it comes
from, and how to refresh it.

## What visitors get

dogma is a local app: a FastAPI server over SQLite, a sandboxed Python grader, and a React UI.
The demo is **semi-live**:

| Part                                         | In the demo                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Interface                                    | dogma's own React build, unchanged, with routes in the URL hash (Pages has no SPA fallback)                                                 |
| Reads (Today, Map, Progress, Review, topics) | the real API's JSON, captured once for a demo learner                                                                                       |
| **Run / Submit**                             | **live**: the learner's file runs in the browser (Pyodide, in a Web Worker) through dogma's own static checks, pytest collector and wording |
| Hint ladder (levels 1–3)                     | the reviewed hints, replayed as the same server-sent events                                                                                 |
| Rating a due card                            | the FSRS scheduler's real answer for that rating, precomputed                                                                               |
| Calendar moves                               | previews work (captured dry runs); applying is read-only                                                                                    |
| Close session, mocks, re-solves, answers     | read-only notice                                                                                                                            |
| Drafts                                       | kept in the visitor's `localStorage`                                                                                                        |

A floating badge in the demo says this in a few lines and links back to the homepage.

## Publication boundary

Published: lessons, problem statements, starters, **public** tests and fixtures, reviewed hints
(levels 1–3), card questions and answers, interview question titles, rubrics, the demo learner's
progress, and seven grading modules from dogma's `src/` (see below).

Never published, and checked by `build.mjs` on every build:

- reference solutions (`solution.py`, `solution.sql`) and hidden tests (`test_hidden.py`): every
  line of them that is not also in learner-facing material must be absent from the output;
- the level-4 walkthrough, model output, corpus passages (third-party papers), and anything from
  dogma's `private/`, `corpus/`, `var/` or `workspace/`: the capture runs on a scratch data
  root that links only `content/`, `curriculum/` and the scrubbed `sources/`;
- local paths (`/Users/…`) and the local model's address.

`tests/dogma-demo.test.mjs` re-checks the committed artifact in CI: no solution or hidden-test
files, no hidden tests in runner bundles, hint levels 1–3 only, and every catalog entry openable.

## The demo learner

`capture.py` replays the first eight study days of the core path (26 Oct – 3 Nov 2026,
Europe/Oslo) through the real API on an injected clock. For each session it runs the starter
(which fails), submits the reference solution (which passes), rates due cards, and closes the
session with a short note. The snapshot is taken on Wednesday 4 Nov 2026 at 08:30. This gives 16
solved topics and a planned Learn session, with nine cards due. All of it is engine output. Only
the learner's actions are scripted.

## In-browser grading

`tools/dogma-demo/web/demo/runner.worker.ts` loads Pyodide from `cdn.jsdelivr.net` (version
pinned to the one the build verified) and runs `pyrunner/dogma_demo_runner.py`, which mirrors
`dogma.runner.run`:

1. static checks: `dogma/grading/static.py`, **verbatim** (syntax, entry point, banned imports);
2. pytest in-process with `dogma_harness/collector.py` and `report.py`, **verbatim**;
3. learner-safe wording: `dogma/grading/display.py`, **verbatim**.

`dogma/grading/models.py` is a dataclass stand-in for dogma's Pydantic models, with the same
names and fields. Differences forced by the browser: only public tests exist, so Submit is
graded on them and labelled as such. No OS sandbox exists, so the page enforces the problem's
time limit by terminating the worker. `signal.setitimer` gets a no-op stand-in.

**Verification.** `verify.mjs` grades every problem whose runtime is stdlib, NumPy, pandas or
DuckDB in the same Pyodide under Node. Only problems where the starter fails and the reference
solution passes are marked `browser_runnable` in `data/manifest.json`. The rest answer "needs
the local app". The current snapshot passes 196 of 251. PyTorch problems (53) cannot run in
Pyodide. Two more are excluded and listed in `manifest.browser_excluded`: one exhausts the
WebAssembly stack, and one depends on a LAPACK error the wasm NumPy build does not raise.

## Output layout

```
projects/dogma/
├── index.html, assets/, fonts/, favicon.svg   Vite build (dogma web + demo entry, base /projects/dogma/)
└── data/
    ├── manifest.json        capture time, dogma revision, Pyodide version, runtimes, browser_runnable
    ├── api/**.json          GET responses; query strings become ~name-value (e.g. progress~week-3.json)
    ├── hints/<problem>.json reviewed hint ladder as server-sent event text, by level
    ├── runner/<problem>.json public tests + base64 fixtures (browser-runnable problems only)
    ├── review-ratings.json  scheduler answer per due card per rating (1–4)
    ├── warp-previews.json   dry-run answer per calendar move
    └── pyrunner.json        the Python files the worker loads
```

About 10 MB in all, 6.4 MB of it snapshot data.

## Refreshing

See [`tools/dogma-demo/README.md`](../tools/dogma-demo/README.md). In short:

```bash
npm --prefix tools/dogma-demo ci          # once: Pyodide for build-time verification
node tools/dogma-demo/build.mjs           # capture → verify → build → assemble → leak check
node tools/dogma-demo/preview.mjs         # optional: refresh images/dogma-demo.webp
npm run check
```

The build needs a dogma checkout (default `../dogma`, or `--dogma` / `DOGMA_DIR`) with `uv` and
`pnpm --dir web install` done, and network access for Pyodide packages. Nothing in dogma is
written. Commit `projects/dogma/` (and the preview, if refreshed) as a unit.
