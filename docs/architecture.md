# Architecture

A static, server-less site. GitHub Pages serves the working tree of `master` verbatim — there is no root build step. This document covers the overall structure and the one non-trivial piece of runtime code: the homepage canvas background.

## Site structure

| Area                               | What it is                 | Build step                                                                                                                                                                    |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html` + `style.css`         | Homepage (portfolio)       | none — hand-written                                                                                                                                                           |
| `src/background/`                  | Animated canvas background | none — native ES modules via `<script type="module">`                                                                                                                         |
| `projects/enterprise-ml-delivery/` | Enterprise case studies    | none — static HTML; styles live in `style.css` (`.case-*`, `.pipeline-*`)                                                                                                     |
| `projects/dogma/`                  | dogma interactive demo     | **built here from a local checkout of [dogma](https://github.com/ignacio-ireta/dogma)** by `tools/dogma-demo/build.mjs`; committed output, see [dogma-demo.md](dogma-demo.md) |
| `projects/cdmx-map/`               | React + Leaflet map        | **built elsewhere** ([cdmx-convenience-map](https://github.com/ignacio-ireta/cdmx-convenience-map)); only the Vite output + GeoJSON are committed here                        |
| `projects/etf-portfolio-research/` | Project page               | none — static HTML                                                                                                                                                            |
| `reed/privacy/`                    | App privacy policy         | none — static HTML                                                                                                                                                            |

Pages are linked with relative paths and validated offline by `scripts/check-links.mjs`.

## Canvas background (`src/background/`)

A small molecular-dynamics sketch of the **Haber–Bosch process — N₂ + 3H₂ ⇌ 2NH₃ over iron** — rendered on a single full-viewport `<canvas>` over a watercolor backdrop. Gas molecules tumble in 3D and collide elastically; the reaction itself runs on the surface of iron nanoparticles, step by step, and settles into a dynamic equilibrium. It is plain ES modules — no bundler — loaded by `index.html`:

```html
<script type="module" src="src/background/main.js?v=haber-surface-20261113"></script>
```

The `?v=...` query string is a **manual cache-bust / version pin**: every internal import carries the same string so the whole module graph invalidates together when it changes. (It also currently prevents `tsc --checkJs` from resolving the cross-module imports — see [ENGINEERING-STANDARDS.md](ENGINEERING-STANDARDS.md) §G.)

### Module graph

```
main.js            entry point; boots on load, owns the rAF loop + event listeners
 ├─ scene.js       shared `state` + render orchestration (resizeScene / drawScene)
 │   ├─ config.js      tunable constants: density tiers, ELEMENTS, SPECIES geometries, CATALYST, THERMAL, KINETICS
 │   ├─ geometry.js    pure path/lattice helpers (smooth blobs, hex lattice points, flow ribbons)
 │   ├─ palette.js     reads CSS custom properties (with built-in fallbacks)
 │   ├─ render.js      atom sprites, depth-sorted ball-and-stick drawing, particles, reaction cues
 │   ├─ species.js     the simulation: gas dynamics, iron particles, surface chemistry (no DOM)
 │   └─ watercolor.js  paper grain + the static backdrop (washes, blooms, lattice studies)
 └─ species.js
     ├─ config.js
     └─ random.js     seeded RNG + interpolation helpers (no imports)
```

`config.js`, `geometry.js`, `palette.js`, and `random.js` are **leaf modules** (no imports) and are the ones type-checked. `species.js` touches neither the DOM nor the canvas, so the whole simulation runs under `node:test`.

### Shared model: the `state` object

All modules read and mutate a single object exported from `scene.js`, which keeps physics and rendering decoupled:

```js
state = {
  width,
  height,
  dpr, // viewport + device pixel ratio (capped at DPR_CAP)
  isDark, // current color scheme
  palette, // resolved colors from readPalette()
  molecules: [], // gas molecules: { species, x, y, vx, vy, q (orientation), w (angular velocity), ... }
  catalysts: [], // iron particles: { atoms[], sites[], adsorbates[], ghosts[], ... }
  ambient: [], // out-of-focus molecules in front of / behind the reaction plane
  effects: [], // short-lived reaction cues
  layers: {}, // cached offscreen canvases: paper, field
  pointer: { x, y, active, influence },
  chemistry, // seeded RNG + per-step event counters
  seed // per-load seed for deterministic procedural placement
};
```

### Simulation (`species.js`)

Everything is laid out in ångströms and scaled to pixels by the viewport tier (`MOLECULE_DENSITY[tier].scale`), so bond lengths, atom sizes, and the iron lattice stay in true proportion.

- **Molecules** — N₂, H₂, and NH₃ use their experimental geometries (N≡N 1.098 Å, H–H 0.741 Å, N–H 1.012 Å with a 106.67° H–N–H angle). Each is a rigid rotor: an orientation quaternion integrated from a world-frame angular velocity.
- **Gas dynamics** — every molecule is coupled to a Langevin thermostat, so speeds follow a Maxwell–Boltzmann distribution with ⟨v²⟩ ∝ T/m: hydrogen moves about 3.7× faster than nitrogen. Collisions are elastic hard-disc impulses with the real mass ratio (uniform-grid broad phase), and a share of each impact goes into tumbling. Pointer proximity adds heat, which raises the local temperature.
- **Iron particles** — a close-packed facet over a second layer (`buildCatalystGeometry`). Adsorbates occupy the three-fold hollow sites between surface atoms. Particles are heavy, drift slowly around a home position in the page margins, and weakly attract nearby gas.
- **Surface chemistry** — the Langmuir–Hinshelwood mechanism, each step reversible:

  ```
  N2(g)  + 2*  ⇌  2 N*          dissociative adsorption
  H2(g)  + 2*  ⇌  2 H*          dissociative adsorption
  N*   + H*    ⇌  NH*  + *      stepwise hydrogenation
  NH*  + H*    ⇌  NH2* + *
  NH2* + H*    ⇌  NH3* + *
  NH3*         ⇌  NH3(g) + *    desorption
  ```

  A molecule striking a particle adsorbs with a sticking probability if it finds free sites; adatoms hop between neighbouring hollows; each step fires with probability rate × Δt scaled by an Arrhenius factor `exp(Ea · (1 − 1/T))`. The reverse steps carry the larger activation energies, so heating the gas speeds everything up but shifts the equilibrium back toward N₂ + H₂ — Le Chatelier for an exothermic reaction.

- **Conservation** — steps only move whole atoms between the gas and the surfaces, so `atomInventory(state)` is invariant for the life of a simulation (asserted in `tests/chemistry.test.mjs`).

Tunables live in `config.js` (`THERMAL`, `CATALYST`, `KINETICS`).

### Rendering (`render.js`, `watercolor.js`)

- **Atoms** are pre-rendered sphere sprites (diffuse falloff, bounce light, specular glint, outline) lit from a light fixed in screen space, cached per element/size/color scheme. Colors are CPK adapted to the site palette: N blue, H near-white, Fe steel.
- **Molecules** are projected from their quaternion each frame and painted back to front; bonds are drawn as two half-sticks in their atoms' colors, sorted so they tuck behind or in front of each atom as the molecule turns. N≡N is three thin sticks.
- **Particles** draw both iron layers, then adsorbates with contact shadows; a dissociating bond lingers briefly as it breaks. A soft glow marks each N–H bond formed and a ring marks each NH₃ leaving the surface.
- **Depth** — a smaller, fainter far layer and a few large bokeh molecules on a near layer bracket the reaction plane. They drift and tumble but take no part in the chemistry.
- **Backdrop** — soft washes (cool blue toward teal), a few watercolor blooms, faded pencil studies of the iron lattice drawn at the same scale as the live particles, flow ribbons, and paper grain on top.

### Render pipeline

- **`resizeScene()`** (on load + resize) sizes the canvas, resolves the palette, and renders the two **static layers once** (paper, field) into offscreen canvases. A change of width starts a new simulation; a height-only change (mobile browser chrome, a color-scheme switch) keeps the running one.
- **`drawScene()`** (each frame) composites: field layer → far molecules → iron particles → gas molecules → near molecules → paper layer.

### Lifecycle & performance

`main.js` is the only stateful orchestrator:

- A `requestAnimationFrame` loop drives `updateMolecules()` + `drawScene()`.
- **Pauses** when the tab is hidden (`visibilitychange`) and respects `prefers-reduced-motion` (renders a static frame, no loop; surfaces are seeded with intermediates so the still shows the chemistry).
- **Bounded cost:** device pixel ratio capped (`DPR_CAP`), molecule and particle counts scaled by viewport tier (`MOLECULE_DENSITY` mobile/tablet/desktop), sprites instead of per-frame gradients, and frame delta clamped (`Math.min(now - last, 120)`) to survive lag spikes.

These properties are the site's "scalability statement" (see [ENGINEERING-STANDARDS.md](ENGINEERING-STANDARDS.md) §Q).
