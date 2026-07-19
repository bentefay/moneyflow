# HS-005 — Bounded Background GC Worker

- **Status:** queued
- **Source:** `specs/human-scratch.md:238-243`; exact frozen text is in `SCOPE.json#HS-005`
- **Package:** P12
- **Depends on:** P11A–C stable alias invariants; P09 undo-origin policy

## Frozen requirement

> A requestAnimationFrame worker incrementally processes a bounded number of transactions per frame,
> merges adjacent same-day CRDT buckets, rewrites alias-symlink references to final aliases, and
> hard-deletes unreferenced symlinks. Alias reads must work before GC.

## Current evidence to revalidate

- Hierarchical transaction queries already union duplicate date buckets, so correctness need not
  wait for physical merge.
- Alias domain resolution already provides the intended read-time fallback; there is no current
  bounded maintenance scheduler.
- `.claude` normally requires soft delete, making this task's explicit safe hard-delete exception
  narrow and review-sensitive.

## Acceptance direction

- Schedule resumable/idempotent work with explicit item and/or time budget per animation frame;
  yield under load and cancel/pause on unmount/hidden document as appropriate.
- Merge only adjacent equal year/month/day artifacts without losing, reordering or duplicating
  transactions under concurrent CRDT changes.
- Rewrite direct symlink references to final real aliases; hard-delete only after proving no direct
  transaction references or backlinks remain. Never make aliases dependent on GC for correct reads.
- Mark maintenance origin so UndoManager excludes it while normal encrypted sync still propagates
  it.

## Implementation and review checkpoints

- Isolate pure batch planning from scheduled mutation, measure budgets, and make interrupted
  restarts safe. Reviewer checks no unbounded loop, idle assumption, chain traversal or unsafe
  collection deletion was introduced.

## Automated tests

- Fake-RAF unit tests for budgets, cancellation, resume and idempotence; property/convergence tests
  for duplicate buckets, reference conservation and concurrent mutation; integration tests for undo
  and encrypted sync origins.
- Large-data performance test records frame work and completion without relying on wall-clock
  sleeps.

## Manual Playwright CLI charter

- Load a deliberately large fixture with duplicate buckets and alias symlinks, scroll/edit during
  GC, hide/show, navigate away/back, refresh mid-run and use duplicate tabs.
- Verify data/selection/order remains stable, undo affects only user actions, UI stays responsive in
  desktop/mobile and reduced motion, and no console/network loop or frame starvation occurs.

## UX, style, and E2E review

Apply CRDT/sync/performance/E2E rules. The reviewer must perceive no typing/scrolling jank and must
inspect test evidence for bounded work rather than accepting a final cleaned state alone.

## Risks and questions

- Risks: hard-delete races, maintenance commits polluting undo, bucket data loss, endless
  rescheduling, background throttling. Return budget/concurrency ambiguity as a Q proposal without
  pausing.
