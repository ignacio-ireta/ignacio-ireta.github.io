# tools/dogma-demo

Builds the interactive dogma demo into [`projects/dogma/`](../../projects/dogma/). What the demo
is, what it publishes and what it never publishes are in
[`docs/dogma-demo.md`](../../docs/dogma-demo.md).

This is a build-time tool. The site itself stays dependency-free, and CI never runs this folder
(it checks the committed output instead: `tests/dogma-demo.test.mjs`).

## Requirements

- A dogma checkout. Default `../dogma`; otherwise `--dogma <path>` or `DOGMA_DIR`. It needs
  `uv sync` and `pnpm --dir web install` done. It is only read.
- macOS: the capture grades the demo learner's attempts with dogma's sandboxed runner.
- `npm --prefix tools/dogma-demo ci` once, for the pinned Pyodide used to verify grading.
- Network access (Pyodide packages from jsdelivr).
- For `preview.mjs` only: an installed Chrome, Chromium, Brave or Edge, and `cwebp`. It uses
  no npm packages (see [`tools/lib/page-shot.mjs`](../lib/page-shot.mjs)).

## Build

```bash
node tools/dogma-demo/build.mjs                    # full: about 4 minutes
node tools/dogma-demo/build.mjs --reuse-snapshot   # web changes only: reuses .build/snapshot
node tools/dogma-demo/preview.mjs                  # homepage screenshot → images/dogma-demo.webp
```

`build.mjs` steps:

1. **capture**: `capture.py` runs in dogma's environment (`uv run --frozen`). It seeds the demo
   learner and records the API into `.build/snapshot/`.
2. **verify**: `verify.mjs` grades every browser-eligible problem in Pyodide. The starter must
   fail and the reference solution must pass.
3. **stage**: copies dogma's `web/` into `.build/web/`, with `web/main-demo.tsx` and `web/demo/`
   added.
4. **build**: dogma's `tsc` (strict, tests excluded), then Vite with `web/vite.demo.config.mjs`.
5. **assemble**: replaces `projects/dogma/` with the build plus `data/`.
6. **check**: fails if any solution or hidden-test line, a local path or the model address is in
   the output, or a file name Jekyll would skip.

## Layout

| Path                                 | Role                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `capture.py`                         | Seeds the demo learner and snapshots the API (runs inside dogma's environment)    |
| `verify.mjs`                         | Grades problems in Pyodide under Node; decides `browser_runnable`                 |
| `build.mjs`                          | The pipeline above                                                                |
| `preview.mjs`                        | Screenshot for the homepage card                                                  |
| `pyrunner/dogma_demo_runner.py`      | In-browser grading pipeline (mirrors `dogma.runner.run`)                          |
| `pyrunner/dogma/grading/models.py`   | Dataclass stand-in for dogma's Pydantic grading models                            |
| `web/main-demo.tsx`                  | Demo entry: dogma's `main.tsx` with a hash router, the API stand-in and the badge |
| `web/demo/api.ts`                    | Answers `/api/v1` in the page from the snapshot and the grader                    |
| `web/demo/runner*.ts`                | Pyodide worker and its page-side client (time limit, crash recovery)              |
| `web/demo/DemoBadge.tsx`, `demo.css` | The floating "Interactive demo" note                                              |

## When dogma changes

- New content or a new API field needs a rebuild only.
- A new GET in the UI needs `capture.py` to record it. Any path the snapshot lacks answers 404
  in the demo.
- A new write in the UI falls back to the read-only notice. Add a rule to `READ_ONLY` in
  `web/demo/api.ts` if it needs its own wording.
- Changes to dogma's `src/main.tsx` imports must be mirrored in `web/main-demo.tsx`.
- Changes to `dogma/grading/models.py` must be mirrored in `pyrunner/dogma/grading/models.py`.
  Verification lists every problem it could not grade, and the build stops if none pass.
