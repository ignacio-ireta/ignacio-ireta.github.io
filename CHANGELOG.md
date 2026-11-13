# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Homepage canvas background rebuilt as a closer model of the Haber–Bosch process.
  Molecules are true-geometry 3D ball-and-stick models that tumble, lit and
  depth-sorted per frame; gas speeds follow a Maxwell–Boltzmann distribution with
  real mass ratios; and the reaction now runs step by step on the surface of iron
  nanoparticles (dissociative adsorption, surface hopping, stepwise hydrogenation,
  desorption — each reversible, atoms conserved exactly) instead of an instant
  swap on contact.
- The backdrop is now a micrograph field instead of a cell-biology illustration:
  uneven, slowly drifting illumination, the catalyst bed out of focus below the
  focal plane, diffraction-ringed dust, a vignette, sensor grain, and a 1 nm scale
  bar; bright-field in the light scheme and dark-field in the dark one. Iron is
  drawn in warm bronze against the cool gas, and glows faintly.
- A height-only resize (mobile browser chrome, color-scheme switch) no longer
  restarts the simulation.

- Site palette retuned to the micrograph: a warm-white field cooling toward the
  rim, nitrogen blue for links, the catalyst's bronze for labels, and a deep navy
  dark scheme with its own accent colours. The graph-paper grid and the hard
  ovals inside cards give way to a vignette and soft corner light.
- The case-study and ETF pages now run the same micrograph background as the
  homepage, with their text on a frosted reading sheet; the ETF report posters
  pick up the field's light.

### Fixed

- Dark mode: the page background no longer carries the light theme's pale wash.

### Added

- Homepage preview of the Multi-City Convenience Map (`images/cdmx-map.webp`),
  shot from the committed embed by `tools/cdmx-map/preview.mjs`, and a swatch on
  each city link in that city's own map theme colour.
- Enterprise case-study page at `projects/enterprise-ml-delivery/`: the MLOps rebuild
  of a legacy R credit-risk pipeline (energy sector) and the ontology-grounded LLM
  agent, written without client names, data, or internal diagrams. Added to
  `validate:html` and the internal-link check. The disclosure boundary it follows is recorded in
  `docs/enterprise-ml-case-study-plan.md`.
- Homepage evidence rail directly under the hero, linking the two case studies and
  the three live demos (Norway convenience map, dogma, ETF research).
- Homepage Education & credentials section (Georgia Tech OMSCS admission, UNAM
  B.Sc., certifications, languages) and project cards for dossier and the
  multi-city convenience map with per-city deep links.
- dogma interactive demo at `projects/dogma/`, featured as the homepage's spotlight
  project: dogma's real React interface on a captured API snapshot of a demo
  learner, with Run/Submit graded in the browser by dogma's own static checks and
  pytest collector under Pyodide (196 of 251 problems verified). Built by
  `tools/dogma-demo/` (capture, verification, staged Vite build, leak check);
  documented in `docs/dogma-demo.md`; guarded by `tests/dogma-demo.test.mjs`.
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

- Claims checked against the projects and corrected (2026-11-10): the dogma demo
  grades 196 of the 251 problems in the browser, and the homepage now says so;
  Reed's card states 159 unit tests and describes its privacy precisely; the map
  card no longer says a new city is a single file.
- Reed privacy policy: new Network Access section. The app downloads a web page
  when the user shares a link to it; nothing else uses the network.
- Dev dependencies: `html-validate` 8 → 11 and patched transitive packages
  (`js-yaml`, `fast-uri`, `brace-expansion`), so `npm audit` reports no
  vulnerabilities and the CI audit step passes again. No authored HTML needed
  changes under the new validator.
- Homepage repositioned for Norway-facing applied AI / MLOps roles: new hero copy
  with four measured results, an at-a-glance panel (languages with TOEFL score,
  education, five target cities, permit route), and experience cards organized by
  sector (energy, knowledge engineering, pharmaceutical distribution).
- The CDMX Convenience Map card is now the Multi-City Convenience Map and names the
  five Norwegian cities.
- Homepage project grid: the featured card is now a full-width spotlight with a
  preview image; the other project cards form a two-column grid.
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
