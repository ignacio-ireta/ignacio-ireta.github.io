# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project documentation: `README.md`, `CONTRIBUTING.md`, `LICENSE` (MIT), and
  `docs/` (`architecture.md`, `cdmx-data-contract.md`, `ENGINEERING-STANDARDS.md`,
  `testing.md`).
- Dev-only toolchain (the site runtime stays dependency-free): Prettier, ESLint
  (flat config), `tsc --checkJs`, `html-validate`, plus npm scripts and a
  `simple-git-hooks` + `lint-staged` pre-commit hook.
- Tests: `node:test` unit tests for `random.js`/`geometry.js` and a jsdom boot
  smoke test for the canvas background; an offline internal-link checker.
- GitHub Actions CI running the quality gates and a dependency audit on push/PR.
- ETF Portfolio Research showcase: the project page now leads with the live
  interactive backtest report and an efficient-frontier explorer (lazy
  click-to-load via `embed.js`), a metrics table rendered client-side from
  `backtest_metrics.json`, a 12-figure gallery, and Excel/source downloads.
  Curated report artifacts are committed under
  `projects/etf-portfolio-research/reports/` (kept fresh by a deploy workflow in
  the source repo), and the homepage card gained a "View source" link.
- `docs/etf-outputs-contract.md` documenting the ETF artifact set, the
  `backtest_metrics.json` schema, run-record provenance, and the sync contract.

### Changed

- Encoded raw `&` as `&amp;` in homepage headings for valid HTML.
- Replaced the description-only ETF Portfolio Research page with the interactive
  showcase above.

### Removed

- Orphaned `projects/cdmx-map/data/cdmx_postal_scores.geojson` (unused by the app;
  identical content to the in-use `scores_postal_code.geojson`).

## [1.0.0] — 2026-06-13

First standardized baseline of the existing site.

### Added

- Homepage with the biomolecular canvas background (`src/background/`).
- CDMX Convenience Map project page with committed Vite build and GeoJSON data.
- ETF Portfolio Research project page.
- Reed RSVP Reader privacy policy.

[Unreleased]: https://github.com/ignacio-ireta/ignacio-ireta.github.io/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ignacio-ireta/ignacio-ireta.github.io/releases/tag/v1.0.0
