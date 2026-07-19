# HS-018 — TanStack Virtual PR #1100 and useFlushSync

- **Status:** queued
- **Source:** `specs/human-scratch.md:341-342`; exact frozen text is in `SCOPE.json#HS-018`
- **Package:** P03
- **Depends on:** P01; conditional external release gate

## Frozen requirement

> Update TanStack Virtual once PR #1100 is released and enable `useFlushSync`.

## Current evidence to revalidate

- Manifest planning baseline used `@tanstack/react-virtual` `3.13.23`.
- Completion is expressly conditional on an upstream release; current status/version must be checked
  at execution and milestone rechecks from the PR, changelog and package release.

## Acceptance direction

- If a stable compatible release contains PR #1100, upgrade within the safe chain and explicitly
  enable `useFlushSync` on relevant virtualizers using the released API.
- Verify no React flushSync warnings, hydration issues, scroll jumps, focus loss, resize loops or
  performance regressions across transaction/person/import tables.
- If not released, record dated primary-source evidence as `blocked_external`, keep the safe current
  version and recheck before milestones/P21. Do not vendor unreleased code or falsely check HS-018.

## Implementation and review checkpoints

- Record exact upstream commit-to-release mapping. Reviewer verifies the installed package
  source/API rather than assuming a semver bump includes the PR.

## Automated tests

- Virtualizer unit/integration coverage, build/typecheck, scroll/edit/filter E2E with retries
  disabled and large-list performance measurements. Compare baseline console warnings and position
  stability.

## Manual Playwright CLI charter

- Scroll large tables rapidly, resize, edit/focus cells near overscan edges, add/remove/filter rows,
  navigate away/back, refresh and duplicate tabs at desktop/mobile and reduced motion.
- Inspect console for flushSync/ResizeObserver/hydration warnings and judge jump/jank/focus
  behavior.

## UX, style, and E2E review

Apply performance/component/E2E guidance. The reviewer must reject a nominal option toggle without
large-list manual evidence or any retry-dependent scroll test.

## Risks and questions

- Risks: unreleased upstream, wrong release, React timing changes, hidden scroll flake. Use
  `blocked_external` only with evidence; this is not a design question for the human.
