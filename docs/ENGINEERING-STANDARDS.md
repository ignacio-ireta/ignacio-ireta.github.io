# Engineering standards

These standards were originally written for a Python CLI document-extraction tool. This document **adapts them to what this project actually is** — a static GitHub Pages personal site with a vanilla-JS canvas background and a few independent sub-pages — and records how the repo complies.

Each section gets a verdict:

- **DIRECT** — translates literally.
- **ANALOG** — translates by analogy; the mapping is described.
- **N/A** — genuinely doesn't apply to a static site. Marking it N/A **on purpose**, with a reason, is deliberate — not an oversight.

## Summary

| §   | Topic                      | Verdict             | Status                             |
| --- | -------------------------- | ------------------- | ---------------------------------- |
| A   | Product definition & scope | DIRECT              | ✅ README                          |
| B   | Repository structure       | ANALOG              | ✅ documented layout               |
| C   | Version control            | DIRECT (scaled)     | ✅ + history cleanup               |
| D   | Dependency & environment   | ANALOG              | ✅ dev-only deps, runtime zero-dep |
| E   | Configuration              | ANALOG (mostly N/A) | ✅ `config.js` as the tunables     |
| F   | Architecture & modularity  | ANALOG              | ✅ documented, already clean       |
| G   | Input/output contracts     | ANALOG              | ✅ data + build contracts          |
| H   | Error handling             | ANALOG (light)      | ✅ fail-safe degradation           |
| I   | Logging & observability    | **N/A**             | n/a (no runtime)                   |
| J   | Resumability & idempotency | **N/A**             | n/a (static serving)               |
| K   | Testing strategy           | ANALOG (scaled)     | ✅ unit + smoke + link + HTML      |
| L   | Testing documentation      | DIRECT              | ✅ docs/testing.md                 |
| M   | Code quality gates         | ANALOG              | ✅ format/lint/type/audit          |
| N   | CI/CD                      | ANALOG (CI only)    | ✅ GitHub Actions; CD n/a          |
| O   | Documentation              | DIRECT              | ✅ README + docs/                  |
| P   | Security & privacy         | ANALOG              | ✅ local-first, no secrets         |
| Q   | Performance & scalability  | ANALOG              | ✅ documented budget               |
| R   | Graceful interruption      | **N/A**             | n/a (no long process)              |
| S   | Traceability               | ANALOG              | ✅ provenance chain                |

## A — Product definition & scope · DIRECT

A static portfolio + field-notes site. Sub-projects under `projects/`/`reed/` are independent. No backend, no root build step. Scope and success criteria ("the site builds on Pages and every internal link resolves") live in the [README](../README.md).

## B — Repository structure · ANALOG

No `src/`-package + `pyproject.toml` layout. The analog is the documented layout in the README and [architecture.md](architecture.md): authored HTML/CSS at the root, the ES-module background in `src/background/`, generated artifacts under `projects/cdmx-map/`. `package.json` exists but declares **dev tooling only** — it is not a runtime manifest.

## C — Version control · DIRECT (scaled for a solo repo)

- Small commits with Conventional-Commit prefixes (already practiced) — see [CONTRIBUTING.md](../CONTRIBUTING.md).
- `master` is the published branch; feature branches for non-trivial work.
- Tags/releases + [CHANGELOG.md](../CHANGELOG.md) adopted.
- **No secrets committed**; generated artifacts are intentionally committed (Pages serves them) and noted in `.gitignore`.
- **Large fixtures:** the historical `.git` bloat (long-deleted project data + superseded bundles) is purged via a path-targeted `git filter-repo` rewrite; current data stays committed because Pages must serve it.
- **Scaled down on purpose:** enforced branch protection and mandatory multi-person code review don't apply to a single-maintainer repo. The PR + green-CI habit stands in for them.

## D — Dependency & environment · ANALOG

- **Runtime ships zero dependencies** — a feature, stated explicitly. The homepage is vanilla ES modules.
- Dev dependencies (Prettier, ESLint, TypeScript, html-validate, jsdom, hooks) are declared in `package.json`, the lockfile is committed, and Node is pinned via `.nvmrc` + `engines`.
- The CDMX app's real dependencies (React, Leaflet) live in its **source repo**, not here.
- Native deps: N/A.

## E — Configuration · ANALOG (mostly N/A)

No CLI flags / env-driven config. The nearest analog is the documented tunables in `src/background/config.js` (density tiers, depth bands, pointer physics) and the CSS custom properties read by `palette.js`. Runtime log levels, input/output paths, etc. are N/A.

## F — Architecture & modularity · ANALOG

The spec's "normalize through one intermediate model, keep rendering separable and testable" already holds: the background normalizes through the shared `state` object in `scene.js`, consumed by decoupled physics/geometry/palette/watercolor modules; the CDMX GeoJSON+metadata is that app's intermediate model. Documented in [architecture.md](architecture.md) — no refactor needed.

## G — Input/output contracts · ANALOG

Three contracts, all in [cdmx-data-contract.md](cdmx-data-contract.md):

1. **Data contract** — the GeoJSON feature schema + `score_metadata*.json`, already versioned (`generated_at`) and deterministic.
2. **Build-artifact contract** — the committed Vite bundle is generated output, excluded from formatters/linters, traced to its source commit.
3. **Module version pin** — the `?v=...` cache-bust query string pins the whole ES-module graph together. (It also blocks whole-graph `tsc --checkJs`; only the import-free leaf modules are type-checked until it's addressed.)

## H — Error handling · ANALOG (light)

No exit codes / domain exceptions. The applicable principle is **fail safe / degrade gracefully**: the background already honors `prefers-reduced-motion` (static frame, no loop) and pauses when hidden; the CDMX app should tolerate a failed data `fetch`. (Potential hardening: guard `main.js` against a null 2D context.) Partial-failure isolation / error reports: N/A.

## I — Logging & observability · N/A

No runtime process produces logs, and serving is handled by GitHub's CDN. The only observability surface is the **GitHub Actions / Pages build logs**. Recorded as N/A deliberately.

## J — Resumability & idempotency · N/A

There is no multi-step run to resume; serving a static file is inherently idempotent. The "manifest / atomic write / skip-unchanged" concepts live in the CDMX map's **source-repo data pipeline**, not here. `generated_at` in the metadata is the only run-id analog.

## K — Testing strategy · ANALOG (scaled)

| Type                | Here                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Unit                | `node:test` over the pure helpers (`random.js`, `geometry.js`)                                                |
| Integration / smoke | jsdom boot test: `main.js` boots without throwing under a stubbed canvas (also exercises §H)                  |
| "e2e"-ish           | offline internal-link check + `html-validate` on authored pages                                               |
| Golden-file         | _aspirational_ — a deterministic-seed canvas hash would need seed injection (`state.seed` uses `Math.random`) |

Property/fuzz and full browser e2e are intentionally out of scope for a portfolio. See [testing.md](testing.md).

## L — Testing documentation · DIRECT

[docs/testing.md](testing.md) covers how to run each gate, what's covered, and how to extend it.

## M — Code quality gates · ANALOG

`npm run check` = Prettier (`format:check`) + ESLint + `tsc --checkJs` + `html-validate` + link check + tests. A `pre-commit` hook (simple-git-hooks + lint-staged) auto-fixes staged files. `npm audit` runs in CI as the dependency scan. Coverage gates are skipped as over-engineering here.

## N — CI/CD · ANALOG (CI only)

CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs the quality gates + audit on every push/PR to `master`. **CD is N/A** — GitHub Pages auto-deploys `master`; adding a deploy workflow would be redundant. No version matrix (no runtime to test across versions).

## O — Documentation · DIRECT

README + CONTRIBUTING + CHANGELOG + LICENSE + this `docs/` set (architecture, data contract, standards, testing). `.env.example` is N/A (no env).

## P — Security & privacy · ANALOG

Local-first and non-networked by default: pages fetch only first-party, same-origin assets; no analytics; no secrets in the repo (and none logged — there's no logging). The Reed privacy policy is itself a privacy artifact. `npm audit` covers dev dependencies. No Office macros / untrusted-upload surface exists.

## Q — Performance & scalability · ANALOG

The background already implements the discipline (DPR cap, viewport-tiered molecule counts, tab-hidden pause, clamped frame delta, reduced-motion path) — documented in [architecture.md](architecture.md). **Known debt:** the CDMX map ships ~14 MB of GeoJSON to the browser; acceptable within Pages limits and gzip, but a candidate for simplification/external hosting if it grows.

## R — Graceful interruption · N/A

No long-running process to interrupt. The minor analog already present: the animation loop cleanly `cancelAnimationFrame`s and resumes on `visibilitychange` / reduced-motion changes. Recorded as N/A deliberately.

## S — Traceability · ANALOG

The provenance chain:

- Deployed site → the `master` commit Pages built from.
- CDMX bundle → its commit in [cdmx-convenience-map](https://github.com/ignacio-ireta/cdmx-convenience-map) (recorded in [cdmx-data-contract.md](cdmx-data-contract.md)).
- CDMX data → `score_metadata*.json`: `generated_at`, `source_urls`, input `gtfs_sha1`/`osm_sha1`, `coverage_percent`.

The one gap being closed: explicitly recording the bundle-hash ↔ source-commit link on each rebuild.

## Compliance checklist

- [x] README with scope, layout, quickstart, deploy notes
- [x] LICENSE (MIT) + content/data rights clarified
- [x] CONTRIBUTING with commit + style conventions
- [x] CHANGELOG (Keep a Changelog)
- [x] docs/: architecture, data contract, standards, testing
- [x] Prettier + ESLint + tsc(checkJs) configured to match existing style
- [x] Tests: unit + boot smoke + link + HTML validation
- [x] CI on push/PR; dependency audit
- [x] Pre-commit hook
- [x] Orphaned data pruned; `.gitignore` intent documented
- [x] `.git` history bloat purged (path-targeted rewrite)
- [ ] Bundle-hash ↔ source-commit recorded on next CDMX rebuild
