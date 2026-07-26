# P17A / 01 — Independent Review

**Reviewer:** `p17a-reviewer-01` (fresh, independent of all P17A implementers). **Package:** P17A
(HS-007 automation redesign — MODEL + ENGINE incl. production import application). **Review range:**
`a09c4b4e2002542b742690e5be0b30bc541dd108..ee83b1b77409cbef2d873edf30bb810a6de99a58`. **Frozen
text:** `specs/human-scratch.md:248-295`. **Questions held:** Q-034..Q-039.

## Range / git discipline

- Current worktree HEAD is `c9ade95` (a docs-only control commit — touches only `HANDOFF.md`,
  `PROGRESS.md`) sitting on top of the reviewed product HEAD `ee83b1b`. Verified `c9ade95` is
  docs-only; it does not alter the reviewed product/test delta.
- Product/test delta = three feat commits: `21507dc` (model+engine), `235ea31` (vault wiring +
  migration + field-rules CRDT), `ee83b1b` (production import-commit wiring). Interleaved
  `docs(P17A)` commits touch only `specs/007-human-scratch-completion/**` and were ignored.
- Read-only git only; no checkout/reset/branch performed.

## Gate results (re-run by me — real counts)

| Gate                           | Result                                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`               | **PASS** (clean, `tsc --noEmit`)                                                                                                                                                                                |
| `pnpm lint`                    | **0 errors**, 10 warnings — all pre-existing unused-import/incompatible-library warnings in `queries.ts`, `TransactionTable.tsx` and unrelated test files; **none in any P17A file**                            |
| `pnpm format:check`            | Fails on **15 `specs/**`docs/evidence/review files ONLY** (pre-existing, untouched docs). **Zero`.ts`/`.tsx`in the P17A delta fails**`oxfmt --check`. Not a P17A finding per the brief.                         |
| `pnpm test` (unit+integration) | **1807 passed / 2 skipped**, 90 files                                                                                                                                                                           |
| `pnpm test:e2e`                | **142 passed** (3.3m), exit 0. Local Supabase container present and used. The `Failed to fetch` / `SyncManager error` log lines are the deliberate offline-retry scenario in `undo-redo.spec.ts`, not failures. |

## Correctness bar — per-item findings (verified against frozen text and code)

1. **Apply at the real import (Q-038): PASS.** `src/app/(app)/imports/new/page.tsx` now calls
   `useCommitImportBatch()` → `commitImportBatch` (`src/lib/crdt/import-commit.ts`) →
   `applyFieldRulesToImport` (`src/lib/crdt/field-rules.ts`). Genuinely reachable from the
   production commit, not just a library. P14 behaviour preserved: import record with
   `transactionCount = transactions.length`, suspected-duplicate nesting via
   `suspectedDuplicateLocation` (`import-commit.ts:54-66`). The old page's two `as unknown as` casts
   are eliminated (input-typed record view + full `InsertTransactionInput["transaction"]`).
   `tests/integration/import-commit-field-rules.test.ts` exercises the exact updater end-to-end.
2. **Precedence & matching: PASS.** `ruleScopeRank` (`rules.ts:90`) encodes unscoped(0) < amount(1)
   < account(2) < account+amount(3), matching frozen `:271-274`. Exact raw-text match with optional
   amount/account narrowing (`ruleMatchesSubject` `rules.ts:191`). `selectWinningRule` is
   order-independent (rank, then recency, then id tie-break); a 500-run `fc.shuffledSubarray`
   property test asserts order-independence (`rules.test.ts:218`). Date boundary
   `isNewerTransactionDate` uses `Temporal.PlainDate.compare(...) > 0` (strict) — same-date is NOT
   newer, no off-by-one, no locale/tz ambiguity.
3. **Manual-row gating (Q-039): PASS.** `subjectForTransaction` (`field-rules.ts:83`) sets
   `isManual = transaction.importId == null`; `fieldAppliesToManual` returns false for
   `descriptionAlias`, true for `tags`/`allocation` (`rules.ts:178`). Matches frozen `:269,294-295`.
   `field-rules-crdt.test.ts:311` asserts a manual row (no importId, matching description) gets the
   tag rule but never the alias.
4. **Allocations only via P16C: PASS.** Every allocation write routes through
   `replaceTransactionAllocations` inside `applyRulePlans` (`apply.ts:177`); no direct key write,
   clamp, or normalise; no settlement/remainder import. Invalid complete sets are rejected at decode
   (`decodeFieldRule` → `validateAllocationSet`, no normalise) so `readActiveFieldRules` excludes
   them → **zero mutation** (test `import-commit-field-rules.test.ts:209` asserts an out-of-range
   `150` rule yields no active rule and unchanged allocations). `git diff` confirms
   `src/lib/crdt/mutations.ts` and `src/lib/domain/settlement.ts` are **byte-identical to BASE**.
5. **Description aliases via P11: PASS.** Alias rules route exclusively through the existing
   `assignDescriptionAlias` (`field-rules.ts:182`); `src/lib/crdt/description-aliases.ts` diff is
   **byte-empty**. Tests assert both `descriptionAliasId` AND the P11 `transactionIds` reverse map
   are set (`import-commit-field-rules.test.ts:174-176`, `field-rules-crdt.test.ts:307`).
6. **Migration: PASS.** `migrateVaultAutomationsToFieldRules` (`field-rules.ts:339`) is guarded by
   `automationRulesMigrationVersion`; deterministic derived ids converge across devices; legacy
   `automations` never mutated (migration.ts is pure; unit test "does not mutate the input
   automations"); unconvertible shapes retained + reported (Q-037 taxonomy). Clean/onboarding vaults
   get **no write** (early return when no legacy automations, marker left unstamped) — the
   tab-duplication E2E op-count invariant passes (142 E2E green). In-code CRDT migration under
   `system:migration` origin (excluded from undo — confirmed in `undo.tsx:34`);
   `supabase/migrations/**` byte-empty.
7. **Vault wiring: PASS.** `fieldRules` + `userAutomationPreferences` added as `vaultSchema` root
   keys with empty-record seeds in both `getDefaultVaultState`/`initializeVaultDefaults`
   (`defaults.ts`) and `DEFAULT_VAULT_STATE` (`mirror.ts`); `automationRulesMigrationVersion`
   defaults to 0 for vaults predating the field. Import wiring is an additive **internal** full-
   `VaultState` action (`useCommitImportBatch`);
   `ApplicationVaultState = Omit<VaultState, "descriptionAliases">` projection is unchanged for
   every other caller.
8. **Type/rule hygiene: PASS.** Product delta contains **zero** `as`/`any`/`!` (scan matched only
   comments). `ts-pattern` is not a repo dep; exhaustiveness enforced via `switch` + local
   `assertNever`. Money in integer minor units (`MoneyMinorUnits`). No automation UI added (P17B-D).

## Boundary confirmations (byte-EMPTY in product delta — all verified via `git diff`)

- `src/lib/domain/settlement.ts` — empty. ✅
- `src/lib/crdt/mutations.ts` (`replaceTransactionAllocations`, P16C) — empty. ✅
- `src/lib/crdt/description-aliases.ts` (P11) — empty. ✅
- `specs/human-scratch.md`, `specs/008-.../spec.md` — empty. ✅
- Automation UI (`src/components/features/automations/**`, `AutomationDropdown.tsx`, automations
  page) — no such paths in the delta. ✅
- Realtime files / any `vault_ops` — none touched. ✅
- `supabase/migrations/**` — empty. ✅
- Every ledger/control file — only root-owned docs commits, ignored. ✅

## Secret-safety

**Clean.** Delta scan found no vault master key, invite-fragment/bearer secret, `crypto_box` secret,
seed phrase, recovery material, `SUPABASE_JWT_SECRET`, or vault plaintext. The only `seed`/`secret`
matches are `seedLegacyVault` (a test helper), "alias seed failed" (test error strings), and a
deterministic fast-check `SHUFFLE_SEED = 17_010_001` (public PRNG seed). No base64/hex key blobs.
All test vectors are synthetic (`person-a`, `person-b`, `COFFEE SHOP 123`, `alias-coffee`,
`account-1`).

## Non-blocking observations (do NOT gate)

- **Test-fixture casts.** New P17A test files use `{} as TransactionStore`,
  `{} as TransactionInput["allocations"]`, and `record as TransactionInput["allocations"]` to build
  fixtures for loro-mirror branded input types. These are confined to test setup and follow an
  **established repo convention** (identical casts exist pre-P17A in
  `tests/integration/transaction-operations.test.ts`, `tests/unit/domain/settlement.test.ts`,
  `tests/unit/domain/automation.test.ts`, `tests/integration/automation-perf.test.ts`). Product code
  is fully cast-free. No change required.
- **Manual-row description source (Q-039, human-confirm-open).** `subjectForTransaction` reads
  `tx.description` for manual rows. Frozen text notes manual rows normally lack raw description text
  ("just a description alias"), so in practice they match nothing for description rules and are
  gated out anyway; the predicate is faithful and reversible. Flagged only because Q-037/Q-039 mark
  human confirmation as still useful — not a defect.
- **`AUTOMATION_RULES_MIGRATION_VERSION` duplication.** The version constant lives in
  `field-rules.ts` while the schema marker default (0) lives in `schema.ts`/`defaults.ts`; kept in
  sync manually. Low risk; noted for future maintenance.

## Verdict

Zero blocking findings. All 8 correctness items pass against the frozen text; all boundaries are
byte-empty; secret scan clean; all gates green (or fail only on pre-existing untouched `specs/**`
docs).

VERDICT: PASS
