# Architecture

A static, server-less site. GitHub Pages serves the working tree of `master` verbatim — there is no root build step. This document covers the overall structure and the one non-trivial piece of runtime code: the homepage canvas background.

## Site structure

| Area                               | What it is                 | Build step                                                                                                                                             |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html` + `style.css`         | Homepage (portfolio)       | none — hand-written                                                                                                                                    |
| `src/background/`                  | Animated canvas background | none — native ES modules via `<script type="module">`                                                                                                  |
| `projects/cdmx-map/`               | React + Leaflet map        | **built elsewhere** ([cdmx-convenience-map](https://github.com/ignacio-ireta/cdmx-convenience-map)); only the Vite output + GeoJSON are committed here |
| `projects/etf-portfolio-research/` | Project page               | none — static HTML                                                                                                                                     |
| `reed/privacy/`                    | App privacy policy         | none — static HTML                                                                                                                                     |

Pages are linked with relative paths and validated offline by `scripts/check-links.mjs`.

## Canvas background (`src/background/`)

A "biomolecular field" rendered on a single full-viewport `<canvas>`. It is plain ES modules — no bundler — loaded by `index.html`:

```html
<script type="module" src="src/background/main.js?v=collision-chemistry-b240cafe"></script>
```

The `?v=...` query string is a **manual cache-bust / version pin**: every internal import carries the same string so the whole module graph invalidates together when it changes. (It also currently prevents `tsc --checkJs` from resolving the cross-module imports — see [ENGINEERING-STANDARDS.md](ENGINEERING-STANDARDS.md) §G.)

### Module graph

```
main.js            entry point; boots on load, owns the rAF loop + event listeners
 ├─ scene.js       shared `state` + render orchestration (resizeScene / drawScene)
 │   ├─ config.js      tunable constants (density tiers, depth bands, pointer physics)
 │   ├─ geometry.js    pure path tracing (organic masses, ribbons, membranes)
 │   ├─ palette.js     reads CSS custom properties (with built-in fallbacks)
 │   ├─ species.js     molecule creation, simulation, drawing
 │   └─ watercolor.js  watercolor shape painting, paper/field layers
 └─ species.js
     ├─ config.js
     ├─ geometry.js
     ├─ random.js     seeded RNG + interpolation helpers (no imports)
     └─ watercolor.js
```

`config.js`, `geometry.js`, `palette.js`, and `random.js` are **leaf modules** (no imports) — which is why they are the ones type-checked and unit-tested directly.

### Shared model: the `state` object

All modules read and mutate a single normalized object exported from `scene.js`. This is the intermediate representation that keeps physics, geometry, and rendering decoupled and testable:

```js
state = {
  width,
  height,
  dpr, // viewport + device pixel ratio (capped at DPR_CAP)
  palette, // resolved colors from readPalette()
  molecules: [], // simulated particles
  layers: {}, // cached offscreen canvases: paper, field, foreground
  pointer: { x, y, active, influence },
  chemistry, // collision/reaction state
  seed // per-load seed for deterministic procedural placement
};
```

### Render pipeline

- **`resizeScene()`** (on load + resize) sizes the canvas, resolves the palette, and renders the three **static layers once** (paper, field, foreground) into offscreen canvases, then seeds `state.molecules`.
- **`drawScene()`** (each frame) composites: field layer → dynamic molecule field → foreground layer → paper layer.

### Lifecycle & performance

`main.js` is the only stateful orchestrator:

- A `requestAnimationFrame` loop drives `updateMolecules()` + `drawScene()`.
- **Pauses** when the tab is hidden (`visibilitychange`) and respects `prefers-reduced-motion` (renders a static frame, no loop).
- **Bounded cost:** device pixel ratio capped (`DPR_CAP`), molecule count scaled by viewport tier (`MOLECULE_DENSITY` mobile/tablet/desktop), and frame delta clamped (`Math.min(now - last, 120)`) to survive lag spikes.

These properties are the site's "scalability statement" (see [ENGINEERING-STANDARDS.md](ENGINEERING-STANDARDS.md) §Q).
