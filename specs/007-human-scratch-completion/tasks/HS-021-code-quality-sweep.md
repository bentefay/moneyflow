# HS-021 — Full Codebase Style-Guide Quality Sweep

- **Status:** queued
- **Source:** `specs/human-scratch.md:159`; exact frozen text is in `SCOPE.json#HS-021`
- **Package:** P20B
- **Depends on:** all feature packages through P20A; P21 follows this sweep

## Frozen requirement

> Do a sweep of the full code base for code quality based on our style guide.

## Current evidence to revalidate

- Repository authority spans `.claude/CLAUDE.md`, general/TypeScript rules and component, CRDT,
  crypto, sync, tRPC, import and E2E skills. Compliance cannot be inferred from lint alone.
- Planning already observed possible stale stack text, broad `as`/unsafe patterns to inventory,
  partial test journeys and architectural inconsistencies; none is pre-judged as a defect here.
- This task was added after initial planning and deliberately scheduled after feature churn.

## Acceptance direction

- Create a bounded inventory by guide and subsystem, with evidence and severity. Fix concrete
  correctness, maintainability, type-safety, accessibility, security, performance and test-quality
  violations across first-party code; do not perform aesthetic churn or unrelated redesign.
- Check reuse/purity/rich types/boundary validation/named exports, Tailwind tokens/dark/responsive,
  semantic/focus UX, CRDT draft/soft-delete rules, encrypted sync/crypto safety, tRPC
  auth/permissions, money/import rules and E2E isolation/no-waits/flakiness.
- Update stale `.claude` factual stack/convention text only when repository reality proves it; do
  not weaken a rule merely to avoid fixes.
- Keep changes reviewable in coherent commits/sub-checkpoints under P20B and preserve behavior
  except where fixing a demonstrated defect.

## Implementation and review checkpoints

- Implementer records scanned paths, tool queries, findings fixed/deferred and why. Reviewer samples
  every subsystem, searches independently for missed rule violations and reviews the full
  BASE..HEAD.
- Any material missed issue returns the same package through fix/re-review. P21 still performs an
  independent final audit; P20B is not a substitute for it.

## Automated tests

- Full format/lint/typecheck/build/unit/integration/E2E. Add regression tests for behavior-changing
  fixes and property/security tests where invariants change. Repeat every affected E2E journey with
  retries disabled and run a whole-suite flake sample.

## Exhaustive manual Playwright CLI charter

- Smoke every top-level page and critical journey after the sweep: create/unlock, imports,
  transactions, aliases/tags/allocations/automation, people/invites/realtime/presence and settings.
- Use pointer/keyboard, desktop/mobile, dark/reduced motion, empty/loading/error/offline, refresh,
  duplicate tabs and isolated users. Inspect all console errors/warnings and failed/suspicious
  network requests. Judge consistency, responsiveness and polish; clean sessions/evidence.

## UX, style, and E2E review

The applicable `.claude` corpus is the review rubric. Reviewer must require meaningful E2E for any
changed journey, reject broad suppressions/casts/test skips, and report whether the product feels
coherent rather than merely green.

## Risks and questions

- Risks: unbounded cleanup, churn/regression, rule contradictions, hiding violations with ignores,
  massive review range. Return contradictions/defaults as Q proposals for root and split
  commits/checks, but do not pause or silently narrow the full-codebase inventory.
