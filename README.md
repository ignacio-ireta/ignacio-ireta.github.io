# ignacio-ireta.github.io

Personal portfolio and field notes for **José Ignacio Esparza** — applied research across machine learning, data science, markets, language, and living systems.

🔗 **Live site:** https://ignacio-ireta.github.io

This is a **static site served by GitHub Pages** straight from the `master` branch. There is **no build step at the repository root**: the homepage is hand-written HTML/CSS plus a vanilla ES-module canvas background. Each sub-project under `projects/` (and `reed/`) is independent.

## Repository layout

```
.
├── index.html                     # Homepage (portfolio + animated canvas background)
├── style.css                      # Shared homepage styles
├── src/background/                # Vanilla ES-module canvas background (no bundler)
│   ├── main.js                    #   entry point — boots on load
│   ├── scene.js                   #   shared `state` + render orchestration
│   ├── species.js                 #   molecule simulation / physics
│   ├── config.js  geometry.js     #   tunable constants / path tracing
│   ├── palette.js random.js       #   color (reads CSS vars) / seeded math
│   └── watercolor.js              #   watercolor rendering effects
├── projects/
│   ├── cdmx-map/                  # CDMX Convenience Map — committed Vite build + GeoJSON
│   │   ├── assets/                #   built JS/CSS (generated; source in a separate repo)
│   │   └── data/                  #   GeoJSON scores + score_metadata*.json
│   └── etf-portfolio-research/    # ETF research showcase — interactive page + embed.js
│       └── reports/               #   synced report artifacts (HTML/figures/xlsx/metrics)
├── reed/privacy/                  # Privacy policy for the Reed RSVP Reader app
├── docs/                          # Architecture, data contract, standards, testing
├── tests/                         # node:test unit + jsdom boot smoke tests
└── scripts/check-links.mjs        # Offline internal-link checker
```

## Sub-projects

| Project                | Page                                                                   | Source / link                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CDMX Convenience Map   | [`projects/cdmx-map/`](projects/cdmx-map/)                             | [ignacio-ireta/cdmx-convenience-map](https://github.com/ignacio-ireta/cdmx-convenience-map) — the React/Leaflet app is built there; only the build artifacts + data live here                      |
| ETF Portfolio Research | [`projects/etf-portfolio-research/`](projects/etf-portfolio-research/) | [ignacio-ireta/etf-portfolio-research](https://github.com/ignacio-ireta/etf-portfolio-research) — the Python pipeline runs there; the interactive report, figures, and metrics are synced in by CI |
| Reed RSVP Reader       | [`reed/privacy/`](reed/privacy/)                                       | [Play Store](https://play.google.com/store/apps/details?id=com.reed.rsvp) · privacy policy                                                                                                         |
| AIIRG                  | —                                                                      | [ignacio-ireta/AIIRG](https://github.com/ignacio-ireta/AIIRG)                                                                                                                                      |

## Local development

The site itself needs no tooling to run — but a small **dev-only** toolchain (formatting, linting, type-checking, tests) keeps it healthy. The runtime ships **zero dependencies**.

```bash
nvm use                 # Node version from .nvmrc (>= 20 required)
npm ci                  # install dev dependencies
npm run check           # run all quality gates (see below)
```

Preview the static site locally:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

### Quality gates (`npm run check`)

| Script                            | What it does                                                      |
| --------------------------------- | ----------------------------------------------------------------- |
| `npm run format` / `format:check` | Prettier (2-space, semicolons, double quotes, no trailing commas) |
| `npm run lint`                    | ESLint (flat config, browser ES modules)                          |
| `npm run typecheck`               | `tsc --checkJs` over the canvas background (JSDoc types)          |
| `npm run validate:html`           | `html-validate` on authored HTML pages                            |
| `npm run check:links`             | offline internal-link checker                                     |
| `npm run test`                    | `node --test` unit + boot smoke tests                             |

A `pre-commit` hook (simple-git-hooks + lint-staged) formats and lints staged files. See [docs/testing.md](docs/testing.md).

## Deployment

GitHub Pages publishes the `master` branch as-is. A push to `master` triggers a rebuild that serves the working tree verbatim — there is no compile step here. CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the quality gates on every push and PR.

Two sub-projects keep themselves current automatically: pushing new build artifacts (CDMX) or report artifacts (ETF) to their **source** repos triggers a deploy workflow there that syncs the outputs into this repo and pushes to `master`, which Pages then redeploys. See [docs/etf-outputs-contract.md](docs/etf-outputs-contract.md).

## Documentation

- [docs/architecture.md](docs/architecture.md) — site structure and the canvas-background module graph
- [docs/cdmx-data-contract.md](docs/cdmx-data-contract.md) — GeoJSON/metadata schema and build provenance for the CDMX map
- [docs/etf-outputs-contract.md](docs/etf-outputs-contract.md) — ETF report artifact set, metrics schema, and the cross-repo sync contract
- [docs/ENGINEERING-STANDARDS.md](docs/ENGINEERING-STANDARDS.md) — the engineering standards this repo follows, adapted for a static site
- [docs/testing.md](docs/testing.md) — how to run and extend the tests
- [CONTRIBUTING.md](CONTRIBUTING.md) — workflow and conventions
- [CHANGELOG.md](CHANGELOG.md) — notable changes

## License & content

- **Code** (the canvas background, page markup/styles, tooling, scripts) is released under the [MIT License](LICENSE).
- **Written content and designs** (prose, copy, visual identity) are © 2026 José Ignacio Esparza, all rights reserved — please don't republish them as your own.
- **CDMX map data** under `projects/cdmx-map/data/` is derived from third-party sources (OpenStreetMap, CDMX GTFS, FGJ crime data, OpenDataSoft) and carries their respective licenses/attribution. See [docs/cdmx-data-contract.md](docs/cdmx-data-contract.md).
- **ETF report artifacts** under `projects/etf-portfolio-research/reports/` are generated by the [etf-portfolio-research](https://github.com/ignacio-ireta/etf-portfolio-research) pipeline from research-grade market data (yfinance). They are for research and illustration only — **not financial advice**. See [docs/etf-outputs-contract.md](docs/etf-outputs-contract.md).
