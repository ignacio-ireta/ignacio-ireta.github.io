# Norway Homepage Audit — 2026-09-17

## Objective

Verify whether the public homepage gives a Norway-based AI recruiter enough signal
to understand José's role, core stack, language fit, relocation intent, and evidence
of delivery without exposing confidential work.

## Current verdict

The homepage now answers four of the five highest-value questions within the hero,
About, and Experience sections:

- **Role:** applied AI engineer focused on useful, adoptable systems.
- **Stack:** Python, AWS SageMaker, scikit-learn, pandas, SQL, Docker, CI/CD,
  TypeScript, React, Node.js, and adjacent tools are visible as a scannable list.
- **Languages:** Spanish native, English fluent, Norwegian intermediate.
- **Norway intent:** the page explicitly names relocation and Norway-based AI
  engineering roles.
- **Delivery evidence:** the Experience section describes enterprise AI/ML work,
  cloud workflows, validation, documentation, and operational handoff.

The June audit's P0, P1, P3, and P5 recommendations are therefore complete. The
relevant repository history is:

- `8021ffe` — Norway-facing homepage signals.
- `f304f22` — Norway-facing portfolio metadata.
- `f4c203f` — disclosure-safe enterprise ML case-study plan.

## Technical readiness check — 2026-09-17

`npm run check` passes on `master` at `2d514b6`: formatting, linting,
JavaScript type checking, authored-page HTML validation, all 28 internal links,
and 13 automated tests are green. The repository is clean and matches
`origin/master` before this audit update.

This confirms the public surface is healthy and the documented case-study commit
can remain narrowly scoped. No framework migration, redesign, or additional
portfolio scaffolding is needed first.

## Remaining gap

The page describes enterprise delivery well, but the public projects still do not
include a confidentiality-safe enterprise ML case study. That is the clearest
remaining gap between **claim** and **inspectable evidence** for Norway-facing AI
engineering applications.

A detailed outline and acceptance gate already exist in
[`docs/enterprise-ml-case-study-plan.md`](docs/enterprise-ml-case-study-plan.md).
Creating another outline would be duplicate planning, not progress.

## Named blocker

```text
BLOCKED: Publish the enterprise ML delivery case study
Dependency: employer/project disclosure approval and a second-reader privacy check
Owner: José
Impact: the homepage can state enterprise AI/ML experience but cannot yet link to a
public, inspectable case study for that work
Next action: review the disclosure checklist in docs/enterprise-ml-case-study-plan.md
and approve, revise, or reject the sanitized narrative before implementation
Next check: before the next Norway-facing application or recruiter outreach
```

Until that approval exists, do not publish client-derived metrics, diagrams,
screenshots, internal names, infrastructure identifiers, or reconstructed
architecture.

## Next safe commit after approval

`Add portfolio-safe enterprise ML delivery case study`

Bounded scope:

1. Create `projects/enterprise-ml-delivery/index.html` using only approved,
   non-identifying facts.
2. Add one homepage card with an explicit confidentiality boundary.
3. Add the page to HTML validation and internal-link checks.
4. Run `npm run check` and perform a second-reader disclosure review before push.

## Secondary opportunities — not active work

- Add a downloadable CV only when the current public resume artifact and facts are
  verified.
- Add education/certification details only from current, user-confirmed status; do
  not resurrect stale "expected" or "planned" claims.
- Consider a Norwegian-language landing page only after the English evidence layer
  is complete.

These are deliberately parked. The next leverage point is one approved enterprise
case study, not more homepage scaffolding.

## Update — 2026-11-09

The homepage was rebuilt around evidence, and the remaining gap named above now has
a draft in the working tree.

What changed:

- **Hero:** role stated as applied AI and MLOps engineer, four measured results, and
  an at-a-glance panel with language levels (English C1 with the TOEFL score,
  Norwegian Bokmål A2–B1), education, all five target cities, and the permit route.
- **Evidence rail:** directly under the hero, five links: the two enterprise case
  studies and the three live demos. The map link opens Oslo.
- **Experience:** cards organized by sector (energy, knowledge engineering,
  pharmaceutical distribution) with the measured results, then earlier roles.
- **Projects:** the map card names Oslo, Bergen, Stavanger, Trondheim, and Drammen
  with a deep link per city; dossier has a card; Reed's card states the Norwegian
  localization.
- **Education & credentials:** added from user-confirmed facts (transcript, TOEFL
  report, Georgia Tech admission). In-progress certifications are left off.
- **Case studies:** `projects/enterprise-ml-delivery/index.html`, written without
  client names.

Corrections made on the way: "Norwegian intermediate" became "A2–B1", and
"Stavanger" as the only named city became the full list of five.

The September blocker is resolved: José directed publication on 2026-11-09, and the
homepage and case-study page shipped together. The owner items in the disclosure
gate in `docs/enterprise-ml-case-study-plan.md` remain his to record.

The dogma repository became public the same day, so the homepage card links its
source.

`npm run check` passes at this commit: formatting, lint, types, HTML validation
of four pages, 51 internal links, 19 tests.
