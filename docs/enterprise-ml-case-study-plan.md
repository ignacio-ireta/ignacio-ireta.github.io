# Enterprise ML Delivery Case Study Plan

## Purpose

Add one portfolio-safe case study that turns the homepage's enterprise AI/ML claims
into evidence for Norway-based applied AI and ML engineering roles.

The case study should demonstrate the engineering pattern without identifying a
client, exposing proprietary data, or publishing internal architecture. It should
only include facts José can verify and is allowed to disclose.

## Status — 2026-11-09

The page is published, at José's direction:
`projects/enterprise-ml-delivery/index.html` holds two case studies (the MLOps
rebuild and the ontology-grounded agent), the homepage links to it from the hero,
the evidence rail, and the experience cards, and the page is in the HTML and
internal-link quality gates.

What the draft does to stay inside the boundary:

- names the sector ("energy sector, natural gas utility", "pharmaceutical
  distribution"), never the client;
- shows the pipeline as component roles and the ontology as an example term
  written for the page;
- uses engineering measures only (data volume, runtime ratio, feature count, test
  count, AUC) and leaves out the client's financial figures.

All items in the disclosure gate below are ticked; re-open it before any edit that adds detail about the client or the engagement.

## Commit

`feat: reposition homepage for Norway and add enterprise case studies`

## Safe narrative outline

1. **Context**
   - A legacy analytical workflow needed a more maintainable Python implementation.
   - The result needed a repeatable path from data preparation through model
     execution and operational handoff.
2. **Constraints**
   - Preserve confidentiality and avoid client, dataset, account, and infrastructure
     identifiers.
   - Make the workflow understandable to both engineering and operational audiences.
   - Treat deployment, validation, and failure behavior as part of the product.
3. **Approach**
   - Modularize preparation, training, evaluation, and orchestration.
   - Use managed cloud ML pipeline components for reproducible execution.
   - Add tests, run documentation, and handoff material around the model.
4. **Evidence**
   - A sanitized architecture diagram showing component roles, not internal names.
   - A lifecycle table covering inputs, outputs, validation, ownership, and failure
     handling.
   - One verified outcome or scale measure, only after disclosure approval.
5. **Lessons**
   - Translating model code is smaller than translating the surrounding operating
     assumptions.
   - Reproducibility and handoff quality determine whether a prototype becomes a
     usable system.
   - Clear boundaries make a confidential project discussable without making it
     identifiable.

## Disclosure gate

Before publishing, confirm every item below:

Satisfied by how the draft is written (re-check after any edit):

- [x] No client, business unit, dataset, repository, account, region, endpoint, or
      internal service names appear.
- [x] No screenshots, code, logs, schemas, or diagrams were copied from internal
      systems.
- [x] Technology names describe public capabilities, not a reconstructable internal
      architecture.

Owner items — recorded as confirmed on José's instruction, 2026-11-10:

- [x] Employer and project disclosure rules permit a sanitized case study.
- [x] Every metric is sourced, current, and approved; otherwise remove the number.
      The page states: 10× data in about one third of the compute runtime, ~240
      features, ~10M records, 114+ tests, ~0.8 AUC.
- [x] Business impact is attributed conservatively and does not imply sole ownership.
      The page describes José's own contribution as a consultant placed inside
      client teams.
- [x] A second reader checks the final page for indirect identification risk.
      Second read on 2026-11-10 (Claude, AI assistant) of the homepage, the
      case-study page, and the GitHub profile README: no client, dataset, system,
      or internal names, and no client financial figures. One residual: "natural
      gas utility" together with the employer and country narrows the field to a
      small number of companies. Left as written; widening it to "energy utility"
      is a one-phrase change on each of the three surfaces.

## Definition of done

- The case study page answers: problem, constraints, contribution, engineering
  approach, validation, operational handoff, and lessons.
- The homepage card links to it and makes the confidentiality boundary explicit.
- `npm run check` passes.
- The diff contains no client data, secrets, unsupported metrics, or internal URLs.
