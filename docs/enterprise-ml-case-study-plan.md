# Enterprise ML Delivery Case Study Plan

## Purpose

Add one portfolio-safe case study that turns the homepage's enterprise AI/ML claims
into evidence for Norway-based applied AI and ML engineering roles.

The case study should demonstrate the engineering pattern without identifying a
client, exposing proprietary data, or publishing internal architecture. It should
only include facts José can verify and is allowed to disclose.

## Proposed next commit

**Commit:** `Add portfolio-safe enterprise ML delivery case study`

Create `projects/enterprise-ml-delivery/index.html`, add its card to the homepage,
and include the new page in the HTML and internal-link quality gates.

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

- [ ] Employer and project disclosure rules permit a sanitized case study.
- [ ] No client, business unit, dataset, repository, account, region, endpoint, or
      internal service names appear.
- [ ] No screenshots, code, logs, schemas, or diagrams were copied from internal
      systems.
- [ ] Every metric is sourced, current, and approved; otherwise use no number.
- [ ] Business impact is attributed conservatively and does not imply sole ownership.
- [ ] Technology names describe public capabilities, not a reconstructable internal
      architecture.
- [ ] A second reader checks the final page for indirect identification risk.

## Definition of done

- The case study page answers: problem, constraints, contribution, engineering
  approach, validation, operational handoff, and lessons.
- The homepage card links to it and makes the confidentiality boundary explicit.
- `npm run check` passes.
- The diff contains no client data, secrets, unsupported metrics, or internal URLs.
