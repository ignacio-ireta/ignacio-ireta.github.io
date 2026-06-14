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

A reactive molecular field rendered on a single full-viewport `<canvas>`: ball-and-stick molecules drift and collide elastically inside the viewport "vessel" while a catalysed reaction runs at equilibrium over a soft watercolor backdrop. The depicted reaction is the **Haber process — N₂ + 3H₂ ⇌ 2NH₃** over an iron catalyst (the molecule shapes, element colors, and reaction are data in `config.js`, so swapping the reaction is a table edit). It is plain ES modules — no bundler — loaded by `index.html`:

```html
<script type="module" src="src/background/main.js?v=ballstick-haber-2fb700c3"></script>
```

The `?v=...` query string is a **manual cache-bust / version pin**: every internal import carries the same string so the whole module graph invalidates together when it changes. (It also currently prevents `tsc --checkJs` from resolving the cross-module imports — see [ENGINEERING-STANDARDS.md](ENGINEERING-STANDARDS.md) §G.)

### Module graph

```
main.js            entry point; boots on load, owns the rAF loop + event listeners
 ├─ scene.js       shared `state` + render orchestration (resizeScene / drawScene)
 │   ├─ config.js      tunable constants (density tiers, depth bands, pointer/collision physics, ELEMENTS + SPECIES + reaction tables)
 │   ├─ geometry.js    pure path tracing (organic masses, ribbons, membranes)
 │   ├─ palette.js     reads CSS custom properties (with built-in fallbacks)
 │   ├─ species.js     molecule creation, simulation (collisions + reactions), ball-and-stick drawing
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
  isDark, // current color scheme (threaded into ball-and-stick element colors)
  palette, // resolved colors from readPalette()
  molecules: [], // simulated particles: { role, atoms[], bonds[], velocity, radius, ... }
  layers: {}, // cached offscreen canvases: paper, field, foreground
  pointer: { x, y, active, influence },
  chemistry, // reaction state: seeded RNG + forward/reverse cooldowns
  seed // per-load seed for deterministic procedural placement
};
```

### Reaction model (`species.js`)

The animated overlay is a fixed-size pool of molecules that never grows or shrinks — reactions **transmute molecules in place** (re-stamping a slot's `role`/`atoms`/`bonds`), which keeps populations stable and cost bounded.

- **Drawing** — each molecule is ball-and-stick: atoms are shaded spheres (radial-gradient highlight → rim) sized and colored per element (`ELEMENTS`, CPK-adapted to the site's cool palette: N = blue, H = near-white, Fe = polished steel); bonds are rounded "sticks" drawn behind the atoms, doubled/tripled for higher bond orders. Element colors are memoized per color-scheme.
- **Motion** — velocity-integrated with light Brownian jitter (far-background molecules keep a faint sinusoidal drift). Molecules **collide elastically** (broad-phase uniform spatial-hash grid → impulse response, mass ∝ radius²) and bounce off the viewport edges. Pointer proximity adds "heat" that speeds molecules up.
- **Reaction** — a reactant adsorbs onto an iron catalyst on contact; when one of each reactant (N₂ + H₂) is adsorbed, the **forward** reaction fires (→ NH₃, momentum-conserving). An NH₃ touching a catalyst can run the **reverse** reaction with a small probability. Forward (rare three-body) vs reverse (common, throttled by probability) balance to a roughly constant product fraction — a visible chemical equilibrium. Tunables live in `config.js` (`COLLISION`, `THERMAL`, `CHEM`).

### Render pipeline

- **`resizeScene()`** (on load + resize) sizes the canvas, resolves the palette, and renders the three **static layers once** (paper, field, foreground) into offscreen canvases, then seeds `state.molecules`.
- **`drawScene()`** (each frame) composites: field layer → dynamic molecule field → foreground layer → paper layer.

### Lifecycle & performance

`main.js` is the only stateful orchestrator:

- A `requestAnimationFrame` loop drives `updateMolecules()` + `drawScene()`.
- **Pauses** when the tab is hidden (`visibilitychange`) and respects `prefers-reduced-motion` (renders a static frame, no loop).
- **Bounded cost:** device pixel ratio capped (`DPR_CAP`), molecule count scaled by viewport tier (`MOLECULE_DENSITY` mobile/tablet/desktop), and frame delta clamped (`Math.min(now - last, 120)`) to survive lag spikes.

These properties are the site's "scalability statement" (see [ENGINEERING-STANDARDS.md](ENGINEERING-STANDARDS.md) §Q).
