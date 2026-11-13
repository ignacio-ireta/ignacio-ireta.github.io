# Design language

What the November 2026 redesign of this site settled on, written down so the
featured projects (the convenience map, dogma, the ETF research reports) can
follow the same principles **in their own theme**. The principles are shared;
the look is not. Nothing here says "use these colours".

The test for any change: does it look like the person who built the system also
designed the page, or like a template with content poured in?

## 1. The subject is the decoration

Every visual element should come from what the project actually does.

- The portfolio's background is a real simulation of the reaction it names: true
  bond lengths, real mass ratios, atoms conserved, a scale bar that is correct.
  It replaced a watercolor illustration that was pretty and unrelated.
- Decoration that could be moved to any other site unchanged is the wrong
  decoration. Ask what this project has that no other does (a city's geography,
  a return series, a learner's week) and draw that.
- Keep it honest. A scale bar is to scale, a caption says what the figure shows,
  a number is a measured one. Details that survive inspection are what make a
  page read as engineered.

## 2. One conceit per project

Pick a single idea for how the project is being looked at, and let it decide
the details.

| Project         | Conceit                                                   |
| --------------- | --------------------------------------------------------- |
| Portfolio       | A micrograph: the reaction seen through a microscope      |
| Convenience map | A cartographer's sheet: each city in its own ink          |
| dogma           | A study desk: its existing warm, hand-made learning space |
| ETF research    | A research note: a printed tearsheet with working figures |

The conceit supplies the small furniture (the portfolio's vignette, grain, scale
bar, "Fig. 1" captions) and tells you what does not belong.

## 3. Alive, not sterile

- Something should move a little, slowly, for a reason: light that drifts,
  particles that tumble, a figure that responds to the pointer. Never motion for
  its own sake, never anything that pulls the eye off the text.
- Evenness reads as dead. Prefer light that falls off, depth (things in and out
  of focus), and slight irregularity over flat fills and uniform spacing.
- Honour `prefers-reduced-motion` with a still that still looks finished.
- Keep the cost bounded and measured (capped pixel ratio, pre-rendered sprites,
  pause when hidden).

## 4. Colour

- Build the palette from the subject, then give it **one warm accent against a
  cool field** (or the reverse). The all-cool blue/steel version was the "bland"
  one; bronze iron against cool gas fixed it.
- Design the dark scheme; do not invert the light one. It gets its own accents,
  checked for contrast.
- Accents used for text must pass contrast on the surfaces they sit on. Pale
  decorative tints are for fills only.
- Colour that carries meaning stays fixed across themes. The map's score ramp
  means the same score in every city; only the chrome is themed.

## 5. Layout: no card grids

The strongest "generated" signal was content neatly packed into rounded
rectangles. Structure comes from type and rules instead.

- **Boxes are for objects**: a figure, a screenshot, a code sample, a diagram
  node, a control. Prose, lists, and groups of facts are not objects.
- Replace a grid of cards with the form the content really has:
  - links to things → a numbered **index list**
  - dated or attributed entries → a **ledger** (account on one side, measured
    results beside it)
  - key facts → a **ruled spec list** or a strip of figures under a rule
  - a tag cloud → one run of text
  - a screenshot → a **plate** with a caption
- Use a **margin column** for section numbers and names, hairline rules to
  separate, and asymmetry (a figure that reaches out of the text column) so the
  page is composed rather than tiled.
- Where text sits over a busy field, give it a **clearing** with feathered
  edges, not a panel with a border.
- One primary button at most. Secondary actions are links.

## 6. Type

- Three voices, each with a job: a serif for headings and anything that is a
  statement, a sans for reading, a monospace for instrument output (labels,
  captions, counters, units).
- Small labels are monospaced caps with tracking; they replace chips and pills.
- Let headings be large and few. Measure for prose stays near 60–68 characters.

## 7. Engineering shows

- No new runtime dependencies for looks. The portfolio is plain ES modules.
- The visual layer is testable where it can be (the simulation runs under
  `node:test`) and documented (`docs/architecture.md`).
- Check every change in light and dark, at phone, tablet and desktop widths,
  from real screenshots, before calling it done.
- Tools that produce committed images (`tools/*/preview.mjs`) are scripted and
  re-runnable.

## What was tried and dropped

- A watercolor "cell biology" backdrop: unrelated to the subject.
- Pencil-sketch lattice studies and soft blobs: still read as flat and sterile.
- An all-cool palette with mint labels: bland, and the labels failed contrast.
- Glass panels around every block, chips for every list item: boxy.
