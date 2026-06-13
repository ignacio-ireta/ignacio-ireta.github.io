# Testing

The site is static, so the checks are lightweight: they confirm the canvas background boots, the pure helpers behave, internal links resolve, and the authored HTML is valid. Everything runs offline and deterministically.

## Running

```bash
npm ci                 # once — installs dev deps (incl. jsdom) and the pre-commit hook
npm run check          # everything: format:check + lint + typecheck + validate:html + check:links + test

# individually:
npm test                       # node:test unit + boot smoke tests
node --test tests/random.test.mjs   # a single test file
npm run check:links            # offline internal-link checker
npm run validate:html          # html-validate on authored pages
npm run typecheck              # tsc --checkJs over the leaf modules
npm run lint                   # eslint
npm run format:check           # prettier --check
```

## What's covered

| File                      | Kind  | Covers                                                                                                                                               |
| ------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/random.test.mjs`   | unit  | `clamp`, `lerp`, `smoothstep`, `seededRandom` (determinism + range), `interpolatePoint`                                                              |
| `tests/geometry.test.mjs` | unit  | path commands issued by `traceOrganicMass`, `traceSquigglePath`, `drawMembraneBand`, `drawDepthGuides` (via a recording-context stub)                |
| `tests/boot.test.mjs`     | smoke | `src/background/main.js` boots without throwing under a stubbed canvas + `matchMedia` (jsdom); asserts the canvas is sized and molecules are created |
| `scripts/check-links.mjs` | link  | every relative `href`/`src` in authored HTML resolves on disk                                                                                        |
| `npm run validate:html`   | HTML  | `html-validate` on `index.html`, the ETF page, and the Reed privacy page                                                                             |

### How the boot smoke test works

jsdom implements neither the canvas 2D context nor `matchMedia`, so the test stubs both before dynamically importing `main.js` (which boots on load). `getComputedStyle` is exposed from jsdom; `performance` is left as Node's native global (shadowing it with jsdom's wrapper causes infinite recursion). `requestAnimationFrame` is stubbed to a no-op so no frame actually runs. It imports `scene.js` with the same `?v=...` query string `main.js` uses, so it inspects the **same** module instance that booted.

## Conventions

- Test files live in `tests/` and are named `*.test.mjs` (the `.test.` suffix is what `node --test` discovers).
- Tests use only `node:test` + `node:assert/strict` and `jsdom` — no test framework.
- Unit tests target the **leaf modules** (`random.js`, `geometry.js`) since they have no `?v=...` imports and load cleanly in Node.

## Type checking

`npm run typecheck` runs `tsc --checkJs` (no emit) over the import-free leaf modules (`config.js`, `geometry.js`, `palette.js`, `random.js`). The other modules import each other with `?v=...` cache-bust query strings that TypeScript can't resolve, so they're excluded until that's addressed. Add JSDoc types incrementally to widen coverage.

## CI

`.github/workflows/ci.yml` runs `npm ci`, then `npm run check`, then `npm audit --audit-level=high` on every push/PR to `master`. Node is pinned via `.nvmrc`.

## Intentionally skipped

- **Coverage thresholds**, **property/fuzz tests**, and **full browser e2e** — over-engineering for a personal portfolio.
- **Golden-file canvas snapshots** — aspirational; `state.seed` uses `Math.random`, so a deterministic render would need seed injection first.
- **External link checking** — skipped to keep the check network-free; external URLs (GitHub, Play Store) are left to manual review.
