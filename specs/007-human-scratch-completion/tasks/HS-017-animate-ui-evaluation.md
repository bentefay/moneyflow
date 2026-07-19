# HS-017 — Animate UI Component Evaluation

- **Status:** queued
- **Source:** `specs/human-scratch.md:333-339`; exact frozen text is in `SCOPE.json#HS-017`
- **Package:** P02
- **Depends on:** P01 dependency baseline

## Frozen requirement

> Investigate broader Animate UI registry use, especially Radix Dialog, Alert Dialog, Dropdown Menu
> and Tooltip, comparing animation, accessibility, bundle/compatibility and current Radix/tw setup.

## Current evidence to revalidate

- An Animate UI tabs implementation exists under `src/components/animate-ui` and is used for import
  tabs.
- Existing dialog/alert/dropdown/tooltip wrappers use direct Radix/shadcn patterns, so copying
  registry code creates an owned component fork and possible duplicate dependencies.

## Acceptance direction

- Treat “investigate” as an evidence-backed ADR, not a mandate to rewrite every primitive.
- Inventory candidate surfaces and compare current/latest registry code using primary
  source/version, keyboard/focus/screen-reader behavior, reduced motion, portal/z-index, dark mode,
  bundle/tree-shake, React/Next compatibility, maintenance ownership and visual quality.
- If adoption is justified, migrate one representative low-risk primitive with regression tests and
  define rollout guidance. If not, record a reasoned decline and reusable animation standards.

## Implementation and review checkpoints

- Keep evaluation reproducible and record exact registry version/files. Reviewer independently
  manually compares current/representative behavior and rejects aesthetics that reduce usability.

## Automated tests

- Accessibility/component tests for representative primitive; relevant E2E modal/menu/tooltip
  journey and build/bundle comparison. Repeat interaction test with retries disabled.

## Manual Playwright CLI charter

- Exercise tabs plus candidate dialog/alert/menu/tooltip using pointer/keyboard, focus trap/restore,
  escape/outside click, nested/scrolling portals, mobile, dark mode and prefers-reduced-motion.
- Inspect console/hydration/network and judge animation timing/interruption/jank. Clean session and
  retain only sanitized comparison evidence.

## UX, style, and E2E review

Apply component/a11y/style/E2E rules. A decision-only PASS needs a complete ADR; an adoption PASS
also needs real tests and manual evidence. Do not reward animation that harms focus or speed.

## Risks and questions

- Risks: registry API drift, copied-code ownership, bundle duplication, focus regressions, excessive
  motion. Log rollout preference, but make an evidence-backed reversible decision and continue.
