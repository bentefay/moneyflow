# HS-002 — Safe-Chain Dependency Upgrades

- **Status:** queued
- **Source:** `specs/human-scratch.md:157`; exact frozen text is in `SCOPE.json#HS-002`
- **Package:** P01
- **Depends on:** P00 truthful baseline

## Frozen requirement

> Upgrade to the very latest safe-chain supported version of all dependencies.

## Current evidence to revalidate

- `package.json` currently pins modern Next/React/TypeScript, Loro/loro-mirror, Supabase, TanStack
  Virtual, Radix/Tailwind, Vitest, Playwright Test and Playwright CLI versions.
- `pnpm-lock.yaml`, peer ranges, Node/pnpm constraints and downloaded Playwright browser revisions
  are the compatibility chain; manifest version alone is not evidence of safety.
- HS-018 is an explicit upstream release gate and must not be smuggled into P01 if unavailable.

## Acceptance direction

- Inventory all direct/dev dependencies and resolve the newest mutually compatible stable versions,
  supported Node/pnpm toolchain, peer dependencies, lockfile and browser binaries.
- Upgrade ecosystem-by-ecosystem with official migration notes and minimal compatibility changes;
  document deliberate pins, removals and security findings.
- Preserve data/schema compatibility, server/client boundaries, build output, browser support and
  deterministic installs. `pnpm install --frozen-lockfile` must succeed after regeneration.
- No blanket major bump is accepted without build, test, runtime and migration evidence.

## Implementation and review checkpoints

- Capture before/after version tables and primary migration references. Do not conflate package
  cleanup, product redesign or the conditional TanStack task.
- Reviewer independently checks release currency, peer graph, lockfile diff, duplicated packages,
  audit output and actual runtime—not only green unit tests.

## Automated tests

- Clean install/frozen lockfile; format, lint, typecheck, build, complete unit/integration and E2E
  suites. Repeat critical E2E journeys with retries disabled and compare baseline failures/timings.

## Manual Playwright CLI charter

- Headlessly smoke identity/vault creation, unlock, navigation, transactions, imports, aliases,
  automations and people. Reload, duplicate a tab, exercise sync, responsive/dark/reduced-motion UI.
- Inspect console for hydration/deprecation/runtime warnings and requests for framework/API
  failures; verify CLI and E2E runner each launch their declared browser revision. Clean the
  session.

## UX, style, and E2E review

Confirm dependency migrations do not weaken `.claude` rules, selectors, focus, motion, theme tokens,
test isolation or browser automation. Require regression E2E only where behavior/config changed.

## Risks and questions

- Risks: peer-chain incompatibility, Loro serialization/API change, Next/React hydration changes,
  Tailwind visual drift, Playwright/browser cache mismatch. Return unavoidable-pin proposals and
  recheck dates for root transcription; do not call “latest” without dated evidence.
