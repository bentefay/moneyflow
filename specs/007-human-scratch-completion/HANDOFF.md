# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Review dispatch (P17A / 01 — REVIEW)

- **Package / revision:** P17A / 01 (HS-007 automation redesign — MODEL + ENGINE incl. import
  application) — **REVIEW**
- **Role:** human_scratch_reviewer, fresh instance `p17a-reviewer-01`. You are DISTINCT from every
  implementer of this package (`p17a-implementer-01`, `-01b`, `-01c`) and share none of their
  context. You independently RE-RUN the gates and critically read the code. You write only
  `reviews/P17A-review-01.md`; you never edit product code, any ledger, SCOPE, QUESTIONS, RISKS,
  HANDOFF, scratch, or canonical source, and never commit anything.
- **Verdict contract:** end your review file and your SendMessage to `main` with an explicit
  `VERDICT: PASS` (zero blocking findings) or `VERDICT: CHANGES_REQUIRED` (list each blocking
  finding with file:line, why it blocks, and the frozen-text or rule it violates). Non-blocking
  observations go in a separate NON-BLOCKING section and never gate the pass.

## What to review

- **Review range:**
  `a09c4b4e2002542b742690e5be0b30bc541dd108..ee83b1b77409cbef2d873edf30bb810a6de99a58` on branch
  `main`. Root ledger/control commits are interleaved in this range (docs-only, touching only
  `specs/007-human-scratch-completion/**`) — IGNORE them; review only the product/test delta.
- **Scope ID:** HS-007 (P17A slice). Frozen text: `specs/human-scratch.md:248-295`. Task detail and
  acceptance: `tasks/HS-007-automation-redesign.md` (**P17A** section). Adjudicated questions you
  must hold the code to: `QUESTIONS.md` Q-034..Q-039 (esp. Q-038 = apply-at-import is IN P17A; Q-039
  = manual row is `importId == null`).
- **Implementer evidence (read, do not trust blindly):** `evidence/P17A/implementation-01.md`.

## Gates — RE-RUN ALL yourself and report REAL counts (do not copy the implementer's numbers)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. A local Supabase
container is required for integration/E2E; if it is genuinely unobtainable, say so precisely rather
than reporting unverified passes. Never use Playwright `--headed/--ui/--debug/show`. The
pre-existing `specs/**` `format:check` failures on untouched docs are NOT a P17A finding; a
`format:check` failure on any `.ts`/`.tsx` in the delta IS.

## Correctness bar — verify against frozen text, not the implementer's claims

1. **Apply at the real import (Q-038).** A user-committed import through
   `src/app/(app)/imports/new/page.tsx` must actually apply the highest-precedence field rule to
   each imported transaction (`useCommitImportBatch` → `commitImportBatch` →
   `applyFieldRulesToImport`). Confirm this is genuinely reachable from the production commit, not
   just a library. Confirm all pre-existing P14 import behaviour (duplicate nesting, counts) is
   preserved.
2. **Precedence & matching.** Exact-description match with optional amount/account constraints;
   deterministic unscoped/amount/account/account+amount precedence; date/import boundary for
   new/newer. Look for ties, non-determinism, and off-by-one on the boundary.
3. **Manual-row gating (Q-039).** Description rules skip manual rows (`importId == null`); tag and
   whole-allocation rules include them. Verify the predicate matches the frozen text at
   `human-scratch.md:269,294-295`.
4. **Allocations only via P16C.** Every allocation write (import, bulk, undo, migration) routes
   through P16C `replaceTransactionAllocations` as a complete validated set — never a direct
   allocation-key write, clamp, or normalise. An invalid complete set must be rejected with ZERO
   mutation. Confirm `src/lib/crdt/mutations.ts` and `src/lib/domain/settlement.ts` are
   byte-identical to BASE (no competing settlement/remainder logic).
5. **Description aliases via P11.** Alias rules reuse the existing P11 `assignDescriptionAlias` path
   additively; `src/lib/crdt/description-aliases.ts` is byte-unchanged; P11 alias semantics (incl.
   the `transactionIds` back-map) are preserved.
6. **Migration.** Legacy generic rules migrate once, idempotently, at hydration; clean/onboarding
   vaults get NO write (side-effect-free — check the tab-duplication invariant holds); no data loss
   (unconvertible legacy rules retained and reported per Q-037).
7. **Vault wiring.** `fieldRules` + `userAutomationPreferences` are `vaultSchema` root keys with
   seeded defaults; existing vaults hydrate without loss; the `ApplicationVaultState` projection is
   NOT weakened for other callers (the import action is an additive full-`VaultState` internal
   action).
8. **Type/rule hygiene.** No `as`/`any`/`!` in the delta; ts-pattern is not a repo dep (switch +
   assertNever); money in integer minor units. No automation UI was added (that is P17B-D).

## Boundaries you must confirm are byte-EMPTY in the product delta

`src/lib/domain/settlement.ts`, P16C `replaceTransactionAllocations`, `specs/human-scratch.md`,
`specs/008-.../spec.md`, all automation UI (`src/components/features/automations/**`,
`AutomationDropdown.tsx`, automations page), the three realtime files, `supabase/migrations/**`, any
`vault_ops`, and every ledger/control file. A breach in any of these is a blocking finding.

## Secret-safety (blocking)

Scan the delta: no vault master key, invite-fragment bearer secret, `crypto_box` secret, seed
phrase, recovery material, `SUPABASE_JWT_SECRET`, or vault plaintext in any
code/test/fixture/log/URL. Tests must use synthetic/public vectors only. Any real-material leak is
an immediate blocking finding reported to `main`.

## When done

Write `reviews/P17A-review-01.md` (do NOT commit it — root persists it during integration) with: the
real gate counts you obtained, per-correctness-item findings, boundary confirmations, secret-scan
result, and the explicit `VERDICT`. Then SendMessage to `main` with the verdict, blocking findings
(if any) with file:line, and your real gate counts. Verify, do not trust — if a claim in the
evidence does not match the code or the gates, the code and gates win.
