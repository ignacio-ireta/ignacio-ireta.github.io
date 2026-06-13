# Contributing

This is a personal site, but it follows a light, consistent workflow so changes stay reviewable and the site stays healthy. See [docs/ENGINEERING-STANDARDS.md](docs/ENGINEERING-STANDARDS.md) for the full rationale.

## Workflow

- **Branch** off `master` for any non-trivial change (e.g. `feat/...`, `fix/...`, `docs/...`). `master` is what GitHub Pages publishes.
- Keep **commits small and focused**.
- Open a **pull request** for non-trivial work so CI runs and the diff is reviewable. (As a solo project, formal review/branch protection isn't enforced — but the PR + green CI habit is.)
- Tag stable points (`vX.Y.Z`) and record user-visible changes in [CHANGELOG.md](CHANGELOG.md).
- **Never commit secrets.** This site is local-first and non-networked by default.

## Commit messages

Use Conventional-Commit prefixes (already the norm in this repo):

```
feat(cdmx): add transit commute metric to the score panel
fix(background): guard against missing 2D context
docs(architecture): document the scene state model
test(geometry): cover membrane-band arc rendering
chore(ci): add format-check to the pipeline
```

Avoid vague messages like `updates`, `final`, `stuff`, or a bare `fix`.

## Code style

Enforced by Prettier + ESLint (run `npm run check` before pushing):

- **2-space** indentation, **semicolons**, **double quotes**, **no trailing commas**.
- Vanilla ES modules; the homepage runtime stays **dependency-free**.
- Match the existing functional style in `src/background/` (small pure functions, a shared `state` object, constants in `config.js`).

A `pre-commit` hook formats and lints staged files automatically (installed by `npm ci` via `simple-git-hooks`).

## Running checks

```bash
npm ci             # once
npm run check      # format:check + lint + typecheck + validate:html + check:links + test
npm run format     # auto-fix formatting
```

See [docs/testing.md](docs/testing.md) for details and how to extend the tests.

## Built artifacts (CDMX map)

`projects/cdmx-map/assets/` and `projects/cdmx-map/data/` are **generated** — the app is built in [ignacio-ireta/cdmx-convenience-map](https://github.com/ignacio-ireta/cdmx-convenience-map). When updating the committed build, clear stale hashed assets first (`rm projects/cdmx-map/assets/index-*.js projects/cdmx-map/assets/index-*.css`) so old bundles don't accumulate in git history, and record which source commit produced the new bundle (see [docs/cdmx-data-contract.md](docs/cdmx-data-contract.md)).
