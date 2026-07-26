# P17A / 01 — Implementation Evidence

**Package:** P17A (HS-007 automation redesign — MODEL + DETERMINISTIC ENGINE slice, NO UI) **Role:**
`p17a-implementer-01` **Base:** `a09c4b4e2002542b742690e5be0b30bc541dd108` (branch
`p17a-implementer-01`)

## Dispatch-state note (read first)

The committed `specs/007-human-scratch-completion/HANDOFF.md` at BASE still contains the **P16E / 02
REVIEW** dispatch, not a P17A brief. Ground truth reconciles this: the branch is
`p17a-implementer-01`, HEAD == BASE `a09c4b4` (the "P16E passed / FS-001 completed" control commit),
and `PROGRESS.md` states root's pending step is to "rewrite HANDOFF" now that "P17A becomes
dispatchable" (P17A listed as the next queued package). P16E is already passed, so a P16E review is
moot. I proceeded on the P17A brief delivered in my dispatch, which the branch/BASE/allowed-paths
corroborate. **Q-proposal Q-P17A-HANDOFF** below asks root to confirm.

## Deliverables and where they live

| #   | Requirement                                                                                                                                        | Implementation                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Typed field-specific rule model; illegal states unrepresentable; uniqueness; specificity supersedes                                                | `src/lib/domain/automation/rules.ts` — `FieldRule`, discriminated `RuleAction`, branded `FieldRuleId`, `ruleUniquenessKey`/`hasUniqueRuleKeys`/`dedupeRulesByUniqueness`, `ruleScopeRank`                                                                                        |
| 2   | Deterministic precedence engine; single highest-precedence match; exact raw-text; pure/total/order-independent                                     | `rules.ts` — `ruleMatchesSubject`, `selectWinningRule`, `selectWinningRulesByField` (property test asserts order-independence under shuffle)                                                                                                                                     |
| 3   | Date/import "new/newer" with no locale/timezone ambiguity via Temporal                                                                             | `rules.ts` — `isNewerTransactionDate` using `Temporal.PlainDate.compare` (strict `> 0`)                                                                                                                                                                                          |
| 4   | Safe migration of legacy generic rules, no data loss, in-code (not SQL)                                                                            | `src/lib/domain/automation/migration.ts` — pure `migrateLegacyAutomations`; never mutates legacy automations; conservative convertibility + audited skip taxonomy; dedupes to preserve the uniqueness invariant                                                                  |
| 5   | Per-user-per-vault preferences (per-user, not shared)                                                                                              | `src/lib/domain/automation/preferences.ts` + `userAutomationPreferenceSchema` (keyed by pubkeyHash) in `src/lib/crdt/schema.ts`                                                                                                                                                  |
| 6   | Application at import + explicit bulk ops; description ignores manual, tag/allocation include manual; bounded/idempotent/convergent; undo grouping | `src/lib/domain/automation/apply.ts` — `planRuleApplications`, `applyRulePlans`, `applyRulesToTargets`; manual gating via matcher; per-transaction outcome list is the undo group                                                                                                |
| 7   | Allocation rules go through P16C only; validate/reject whole set; remove absent keys; no settlement/remainder duplication                          | `apply.ts` allocation path calls **only** `replaceTransactionAllocations` (P16C). Integration test proves complete-set replacement removes absent keys and is idempotent. `decodeFieldRule` also rejects invalid allocation wire via `validateAllocationSet` (no normalisation). |

Wire serialisation lives in `src/lib/crdt/schema.ts` (`fieldRuleSchema`,
`userAutomationPreferenceSchema`, exported types `FieldRuleWire`, `UserAutomationPreference`);
domain types stay separate in `rules.ts`.

## Style note

`ts-pattern` is not a dependency of this repo (adding deps is P01's domain), so the mandated
`.exhaustive()` is substituted with `switch` + a local `assertNever(value: never)` compile-time
guard. Every discriminated `switch` is exhaustive.

## RED → GREEN

- `rules.ts`: RED captured by moving the module aside — the test suite failed with
  `Failed to resolve import "@/lib/domain/automation/rules"`; restoring the module → 29 passed.
- `migration.ts`, `apply.ts`, `preferences.ts`: tests reference the intended API; each went green
  only once the product module existed. No test was weakened to force a pass.

## Gate results (re-run, real counts)

- `pnpm typecheck` — PASS (clean).
- `pnpm lint` — 0 errors (10 pre-existing unused-import **warnings**, none in P17A files).
- `pnpm format:check` — fails on 15 `specs/**` docs/evidence/reviews files ONLY (pre-existing; I
  modified zero `specs/**` files — `git diff --name-only a09c4b4 -- specs/` is empty). All nine P17A
  product/test files pass `oxfmt --check`.
- `pnpm test` (unit + integration) — **1786 passed / 2 skipped**, 88 files. P17A adds 51 tests
  (rules 29, migration 13, apply/integration 6, preferences 3).
- `pnpm test:e2e` — **142 passed (3.3m)**, exit 0, no flakes. P17A adds no UI, so no new E2E; this
  confirms no regression. (The `Failed to fetch`/`SyncManager error` log lines are from the
  deliberate offline-retry scenario in `undo-redo.spec.ts`, not failures.)

## Boundary confirmation (byte-empty in my diff)

`git diff --name-only a09c4b4` = `src/lib/crdt/schema.ts` only (tracked). New untracked files are
all under `src/lib/domain/automation/**` and `tests/**`. Confirmed untouched:
`supabase/migrations/**` (no additions), `src/lib/domain/settlement.ts`, realtime paths,
`vault_ops`, `src/components/features/automations/**` and all P17B/C/D UI, `next-env.d.ts`
(auto-regenerated then restored). The stray untracked `evidence/P08/implementation-01.md` is
pre-existing and NOT mine — not staged.

## P16C compliance proof

`apply.ts` imports `replaceTransactionAllocations` from `@/lib/crdt/allocations` and routes every
allocation mutation through it — it never writes allocation map keys directly, never clamps/
normalises, and never imports settlement/remainder code. Integration test
`tests/integration/automation-field-rules.test.ts` "routes allocation writes through P16C" starts
`{person-a:50, person-b:50}`, applies an allocation rule `{person-a:100}`, and asserts the store
holds exactly `{person-a:100}` (person-b removed) — the P16C complete-set-replacement + absent-key
removal contract — and that a second apply converges (idempotent).

## Q-proposals

- **Q-P17A-HANDOFF** — Committed `HANDOFF.md` still shows P16E/02 review while I implemented P17A
  from the dispatched brief. Confirm P17A is correctly dispatched (expected: root rewrites HANDOFF
  for P17A).
- **Q-P17A-DEFAULTS** — Wiring the new `fieldRules` / `userAutomationPreferences` collections into
  the root `vaultSchema` forces a matching default in `src/lib/crdt/defaults.ts`
  (`getDefaultVaultState` requires every root key; `required:false` does not make a key optional in
  `VaultInput`, confirmed via `DEFAULT_PERSON.deletedAt: undefined`). `defaults.ts` is outside P17A
  allowed paths. I therefore defined the typed wire schemas + exports in `schema.ts` (allowed) but
  did **not** add them as root keys. Request: add `src/lib/crdt/defaults.ts` to allowed paths (a
  ~4-line additive change: `fieldRules: {}, userAutomationPreferences: {}`) so the collections go
  live, or confirm deferral to a follow-up package.
- **Q-P17A-ALIAS-WRITE** — Applying a `descriptionAlias` rule requires writing `descriptionAliasId`,
  a dedicated P11 boundary that `updateTransaction` intentionally skips. `apply.ts` PLANS alias
  rules and surfaces them as `deferred-alias-boundary` outcomes without writing. Request
  confirmation that alias-write wiring belongs to the P11 alias path / a later automation package.
- **Q-P17A-IMPORT-WIRING** — The import-commit and hydration/migration call sites (`mirror.ts`, sync
  manager, `imports/new/page.tsx`, `use-import-state.ts` has no vault-write access) are outside
  allowed paths, so migration + import application are delivered as pure, tested functions but not
  yet invoked at those seams. Wiring is a call-site-only follow-up.
- **Q-P17A-MIGRATION-SEMANTICS** — Legacy conditions are `contains`/`regex`; the new model is EXACT.
  Migration converts a single `contains` description condition to an exact rule on its value (a
  documented semantic tightening) and skips `regex`/`notes`/`amount`/multi-condition/`setStatus`
  automations (reported, legacy retained — no data loss). Confirm this conservative mapping.

## Secret-safety

No key/seed/recovery/JWT-secret/`crypto_box`/plaintext in any changed file, test, fixture or this
evidence. All test vectors are synthetic (`person-a`, `acct-checking`, `COFFEE SHOP 123`).

---

# Continuation (rev-01, role `p17a-implementer-01b`) — deferred seams completed

**Base of this continuation:** current integrated product HEAD `0027e93`
(`docs(P17A): rev-01 scope checkpoint integrated; dispatch continuation`), which sits on top of the
rev-01 engine commits `21507dc` / `8d268eb`. Work is committed additively on top of `0027e93`; the
review BASE `a09c4b4` was reference only and never checked out.

The four seams that rev-01 above recorded as deferred (Q-P17A-DEFAULTS, Q-P17A-IMPORT-WIRING,
Q-P17A-ALIAS-WRITE, and the root-wiring half of the migration) are now **built on top of** the
existing tested engine — the engine core (`rules.ts`, `apply.ts`, `migration.ts`, `preferences.ts`)
was reused unchanged except for one additive inverse function.

## Seams delivered

| Seam                                       | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Vault-root wiring (Q-034)               | `src/lib/crdt/schema.ts` — `fieldRules` + `userAutomationPreferences` added as root keys of `vaultSchema` (replacing the deferral NOTE); `automationRulesMigrationVersion` added to `vaultPreferencesSchema`. `src/lib/crdt/defaults.ts` — empty `fieldRules: {}` / `userAutomationPreferences: {}` and `automationRulesMigrationVersion: 0` seeded in `getDefaultVaultState` + `initializeVaultDefaults`. Existing vaults hydrate the new collections as empty with no data loss (integration test: snapshot round-trip). |
| 2. Migration at hydration (Q-035/Q-037)    | `src/lib/crdt/mirror.ts` — `migrateVaultAutomations(mirror)` invoked in all three hydration paths (`createVaultMirror`, `createVaultMirrorFromSnapshot`, `repairHydratedVaultDocument`) under `getVaultSystemOrigin("migration")` (excluded from undo). In-code CRDT migration; `supabase/migrations/**` stays byte-empty.                                                                                                                                                                                                 |
| 3. Application at import + bulk (Q-035)    | `src/lib/crdt/field-rules.ts` (new) — `applyFieldRulesToImport`, `applyFieldRulesToAllTransactions`, `applyFieldRulesToNewerTransactions`, `applyFieldRulesToTransaction` on raw `VaultState`. Wraps the rev-01 engine; each transaction is an independent undo group.                                                                                                                                                                                                                                                     |
| 4. Description-alias write via P11 (Q-036) | `field-rules.ts` partitions alias plans out and routes them through the **existing** `assignDescriptionAlias` (P11) in `src/lib/crdt/description-aliases.ts`, additively. P11 behaviour is unchanged.                                                                                                                                                                                                                                                                                                                      |

Supporting additions: `encodeFieldRule` (inverse of the existing `decodeFieldRule`) in `rules.ts`;
field-rules API re-exported from `src/lib/crdt/index.ts`.

## Idempotency / convergence design

- **Migration marker.** `vaultPreferences.automationRulesMigrationVersion` short-circuits re-runs.
  Deterministic derived rule ids (`fieldrule:migrated:<autoId>:<field>`) converge concurrent
  first-migrations across devices. Migrated rules are stamped `createdAt = epoch 0` so hand-authored
  user rules win precedence ties.
- **No spurious write on clean vaults.** `migrateVaultAutomationsToFieldRules` returns early
  (writing nothing, leaving the marker unstamped) when there are **no** legacy automations. This
  keeps hydration of an onboarding/empty vault side-effect-free — verified by the E2E
  `tab-duplication` op-count assertion (see gate results). The marker is only advanced once a vault
  actually contains legacy automation data.

## Manual-transaction gating

`subjectForTransaction` projects `descriptionText = tx.description || null` and
`isManual = tx.importId == null`, feeding the rev-01 `fieldAppliesToManual` gate: description-alias
rules skip manual rows, tag/allocation rules include them. Integration test
`field-rules-crdt.test.ts` "excludes manual transactions from description-alias rules but not tag
rules" asserts a manual row gets the tag rule but never the alias.

## P16C + P11 compliance proof (this continuation)

- Allocation application routes **only** through the rev-01 `apply.ts` allocation path (which calls
  P16C `replaceTransactionAllocations`). `field-rules.ts` never writes allocation keys, never
  clamps/normalises. Integration test "routes allocation rules exclusively through P16C complete-set
  replacement" starts `{person-a:50, person-b:50}`, applies `{person-a:100}`, and asserts the store
  holds exactly `{person-a:100}` (person-b removed). A rule with an out-of-range allocation (`150`)
  fails `decodeFieldRule` → excluded by `readActiveFieldRules` → **zero mutation** (test asserts the
  transaction's allocations are unchanged).
- Alias application asserts `descriptionAliasId` is set AND the P11 alias's `transactionIds`
  back-map is updated — i.e. the real P11 boundary ran, not a direct field write.

## Gate results (re-run on this continuation, real counts)

- `pnpm typecheck` — PASS (clean).
- `pnpm lint` — 0 errors (10 pre-existing unused-import **warnings**, none in touched files).
- `pnpm format:check` — fails only on 15 pre-existing `specs/**` docs/evidence/reviews files; all
  changed `.ts` product/test files pass `oxfmt --check`. I modified zero `specs/**` code.
- `pnpm test` (unit + integration) — **1801 passed / 2 skipped**, 89 files. This continuation adds
  `tests/integration/field-rules-crdt.test.ts` (11 tests) + 4 `encodeFieldRule` round-trip cases in
  `tests/unit/domain/automation/rules.test.ts`.
- `pnpm test:e2e` — **142 passed (3.2m)**, exit 0. The `tab-duplication` spec (which asserts a
  duplicated-tab hydration produces 0 vault ops) initially failed with 1 op because the migration
  stamped the version marker on a clean vault; fixed by the clean-vault early-return above and now
  passes. No new E2E added (no UI). The `Failed to fetch` / `SyncManager error` log lines are the
  deliberate offline scenario in `undo-redo.spec.ts`, not failures.

## Boundary confirmation (this continuation)

Changed (tracked): `src/lib/crdt/schema.ts`, `src/lib/crdt/defaults.ts`, `src/lib/crdt/mirror.ts`,
`src/lib/crdt/index.ts`, `src/lib/domain/automation/rules.ts`, `tests/unit/crdt/defaults.test.ts`,
`tests/unit/domain/automation/rules.test.ts`. New: `src/lib/crdt/field-rules.ts`,
`tests/integration/field-rules-crdt.test.ts`. All within allowed write paths.

Confirmed byte-untouched: `src/lib/domain/settlement.ts`, P16C allocation API,
`supabase/migrations/**` (empty), all P17B/C/D UI (`src/components/features/automations/**`,
`src/components/features/transactions/AutomationDropdown.tsx`, automations/transactions/people
pages, P16D grid), the three realtime paths, any `vault_ops`. `next-env.d.ts` shows an
auto-regenerated Next dev-server route-types line — a generated artifact, **not committed**. The
stray untracked `evidence/P08/implementation-01.md` is pre-existing and NOT mine — not staged.

## Q-proposals (this continuation)

- **Q-P17A-PROD-IMPORT** — The engine + CRDT application library is delivered on raw `VaultState`
  and wired reachably at the hydration/migration seam, but the **production import-commit** UI seam
  is not invoked. Two blockers: (a) the commit site is `src/app/(app)/imports/new/page.tsx`
  (`createImportBatch` via `useVaultAction`), outside P17A allowed paths; (b) the
  `ApplicationVaultState = Omit<VaultState, "descriptionAliases">` type used by that path
  structurally forbids the P11 alias write. `src/hooks/use-import-state.ts` is preview-only (no
  vault-write access). Request: a follow-up package (P17B/C) with those paths in scope wires
  `applyFieldRulesToImport` at the commit seam, or widens `ApplicationVaultState` to permit the
  alias write. Resolves the residual half of rev-01's Q-P17A-IMPORT-WIRING.
- **Q-P17A-MANUAL-MATCH** — Confirm the manual projection
  (`descriptionText = tx.description || null`, `isManual = tx.importId == null`) faithful to frozen
  text `human-scratch.md:269` and `:294-295`.
- Rev-01's Q-P17A-DEFAULTS, Q-P17A-ALIAS-WRITE, and the migration/hydration half of
  Q-P17A-IMPORT-WIRING are **now resolved** by this continuation (root wiring + defaults done;
  alias-write via existing P11; migration invoked at hydration). Q-P17A-HANDOFF and
  Q-P17A-MIGRATION-SEMANTICS remain as recorded above.

## Secret-safety (this continuation)

No key/seed/recovery/JWT-secret/`crypto_box`/plaintext in any changed file, test, fixture, or this
evidence. All vectors synthetic (`person-a`, `person-b`, `pubkey-abc`, `alias-coffee`,
`COFFEE SHOP 123`). Rules/preferences remain encrypted vault data — the server never sees rule
plaintext.

---

# Continuation 2 (rev-01, role `p17a-implementer-01c`) — production import-commit wiring

**Base of this continuation:** current integrated product HEAD on branch `main` (no branch/checkout
games; committed additively on top of the current HEAD). Review BASE `a09c4b4` was reference only
and never checked out. This continuation closes the one gap the independent adjudicator ruled
(Q-038, IN_P17A): `applyFieldRulesToImport` was invoked NOWHERE — the production import commit
inserted transactions without applying any rule.

## What changed (exact paths)

| Path                                                        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/crdt/import-commit.ts` (new)                       | Pure `commitImportBatch(state, data)` updater over the full `VaultState`: creates the import record, inserts every imported transaction (preserving P14 suspected-duplicate nesting), then calls the existing `applyFieldRulesToImport(state, { importId })`. No unsafe casts (writes the import record through an input-typed record view, and builds a full `InsertTransactionInput["transaction"]` — replacing the two `as unknown as` casts the page previously used). |
| `src/lib/crdt/context.tsx`                                  | Added `useCommitImportBatch()` — a named **internal** action (`useInternalVaultAction`, `kind: "import"`) that runs `commitImportBatch` on the full `VaultState` so the insert + rule application form ONE grouped undoable mutation (P09). Additive: the `ApplicationVaultState = Omit<VaultState,"descriptionAliases">` projection is unchanged for every other caller.                                                                                                  |
| `src/lib/crdt/index.ts`                                     | Re-export `useCommitImportBatch`, `commitImportBatch`, and its input types.                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/app/(app)/imports/new/page.tsx`                        | Replaced the local `createImportBatch` (`useVaultAction`, which could not reach `descriptionAliases`) with `const commitImportBatch = useCommitImportBatch();` and call it at the commit seam. Removed now-unused imports (`insertTransaction`, `findTransactionById`, `InsertTransactionInput`, `MoneyMinorUnits`). No automation UI added.                                                                                                                               |
| `tests/integration/import-commit-field-rules.test.ts` (new) | Proves the production updater applies each rule type end-to-end.                                                                                                                                                                                                                                                                                                                                                                                                           |

## Alias-write barrier — how it was resolved (item 2)

The **existing P11 write path** is reused unchanged: alias rules already route through
`assignDescriptionAlias` (P11) inside `applyFieldRulesToTransaction`/`applyFieldRulesToImport`. The
only barrier was that the import-commit action previously ran under the application projection
(`ApplicationVaultState`), which omits `descriptionAliases`, so the P11 call inside the engine could
not see the alias collection. No existing single seam applies all three rule fields in one grouped
mutation from the import commit, so — per the brief's fallback — a **minimal additive seam** was
added: the named internal action `useCommitImportBatch` runs the commit on the full `VaultState`.
`ApplicationVaultState` and its projection are **not weakened**; no other caller's view changes; P11
alias semantics (`assignDescriptionAlias` and its reverse `transactionIds` map) are byte-untouched.
Recorded as **Q-PROPOSAL-P17A-01-A** below.

## RED → GREEN

- **RED:** temporarily replaced the final `applyFieldRulesToImport(...)` line of `commitImportBatch`
  with `return []` (mirroring the pre-wiring production behaviour: insert, apply nothing) and ran
  `pnpm vitest run tests/integration/import-commit-field-rules.test.ts` → **4 failed / 2 passed**
  (tag, description-alias, allocation, and import-scoping assertions failed because no rule
  applied).
- **GREEN:** restored the real `applyFieldRulesToImport` call (product-only change; no test
  weakened) → **6 passed**. The two RED-passing cases (invalid-allocation zero-mutation and one
  degenerate check) still hold.

## Tests (production seam)

`tests/integration/import-commit-field-rules.test.ts` exercises the exact updater the page runs
(`commitImportBatch`):

1. Highest-precedence **tag** rule (account-scoped beats generic) applied to the imported row; the
   import record is created by the same commit.
2. **Description alias** set via the P11 back-map — asserts both `descriptionAliasId` AND the
   alias's `transactionIds[txId]` reverse map (proves the real P11 boundary ran, not a raw field
   write).
3. **Allocation** replaced via P16C complete set (`{person-a:60, person-b:40}`).
4. **Invalid** complete allocation set (`150`) rejected at decode (`readActiveFieldRules` empty) →
   **zero mutation** (imported row keeps its inserted empty set; no clamp/normalise/bypass).
5. **Idempotent/convergent:** re-running `applyFieldRulesToImport` over the committed batch does not
   drift.
6. **Import scoping / manual gate:** a pre-existing manual row (`importId == null`) with the same
   description is untouched by the import commit, while the imported row receives the alias. (The
   engine-level manual gate — description rules skip manual rows, tag/allocation include them —
   stays covered by `field-rules-crdt.test.ts`.)

## P16C + P11 compliance (this continuation)

- Allocations write **only** through `applyFieldRulesToImport` → the engine allocation path → P16C
  `replaceTransactionAllocations`. `import-commit.ts` never writes an allocation key, never clamps
  or normalises, never imports settlement/remainder code. `src/lib/crdt/mutations.ts`
  `replaceTransactionAllocations` and `src/lib/domain/settlement.ts` are **byte-identical**.
- Description aliases write **only** through the existing P11 `assignDescriptionAlias`; P11
  semantics unchanged.

## Gate results (this continuation, real counts)

- `pnpm typecheck` — **PASS** (clean).
- `pnpm lint` — **0 errors** (10 pre-existing unused-import warnings, none in any file I touched).
- `pnpm format:check` — fails only on 15 pre-existing `specs/**` docs/evidence/review files; every
  `.ts`/`.tsx` file I touched passes `oxfmt --check`. I modified zero `specs/**` code.
- `pnpm test` (unit + integration) — **1807 passed / 2 skipped**, 90 files (adds the 6-test
  production-seam integration file).
- `pnpm test:e2e` — **142 passed (3.3m)**, exit 0, no new E2E added (no UI change). Confirms the
  real import flow still works with the rewired commit seam. The
  `SyncManager error: Failed to fetch` log lines are the deliberate offline-retry scenario in
  `undo-redo.spec.ts`, not failures.

## Boundary confirmation (this continuation — byte-empty in my diff)

Changed (tracked): `src/app/(app)/imports/new/page.tsx`, `src/lib/crdt/context.tsx`,
`src/lib/crdt/index.ts`. New: `src/lib/crdt/import-commit.ts`,
`tests/integration/import-commit-field-rules.test.ts`. All within allowed write paths.

Confirmed byte-untouched (verified via `git diff --name-only HEAD` over the boundary set → empty):
`src/lib/domain/settlement.ts` and all settlement/remainder logic; P16C `src/lib/crdt/mutations.ts`
`replaceTransactionAllocations`; `specs/human-scratch.md` and `specs/008-.../spec.md`; all
automation UI (`src/components/features/automations/**`, `AutomationDropdown.tsx`, automations
page); the three realtime paths; `supabase/migrations/**` (empty — rules live in the encrypted
vault; no SQL); any `vault_ops`; every ledger/control file. `next-env.d.ts` shows an
auto-regenerated Next dev-server route-types line (generated artifact) and is restored — **not
committed**. The stray untracked `evidence/P08/implementation-01.md` is pre-existing and NOT mine —
not staged.

## Q-proposals (this continuation)

### Q-PROPOSAL-P17A-01-A — Minimal additive full-VaultState import-commit action

- Raised by/package/revision: `p17a-implementer-01c` / P17A / 01 (continuation 2).
- Context and evidence: the production import commit (`src/app/(app)/imports/new/page.tsx`)
  previously ran under `useVaultAction`, whose state is
  `ApplicationVaultState = Omit<VaultState,"descriptionAliases">`. Description-alias rule
  application (via the existing P11 `assignDescriptionAlias`) needs `descriptionAliases`, so the
  commit could not apply alias rules without either casting around the projection (forbidden) or a
  seam.
- Why existing authority does not decide it: no existing action applies all three rule fields
  (tags/allocation/alias) in one grouped, undoable mutation from the import seam.
- Options considered: (a) cast around the projection — rejected (forbidden, unsafe); (b) apply alias
  rules from the page via a separate `useDescriptionAliasActions` call — rejected (separate undo
  group, leaks engine precedence logic into UI, can't cover tags/allocation atomically); (c) widen
  `ApplicationVaultState` for all callers — rejected (weakens the projection broadly); (d) **named
  internal action `useCommitImportBatch` on full `VaultState`** — selected.
- Reversible default selected to continue: (d). Localised, additive, matches the existing
  `useTransactionActions`/`useDescriptionAliasActions` internal-action pattern.
- Decision-hierarchy basis: established repository convention (internal named actions already use
  the full `VaultState`); smallest reversible change; preserves the alias-privacy projection.
- Impact and risk: low. No other caller's view changes; P11/P16C untouched. Removing the wiring
  reverts to the prior insert-only behaviour.
- Reversal or migration path: delete `useCommitImportBatch` + `import-commit.ts` and restore the
  page's local `createImportBatch`; no data migration.
- Human review still useful after completion: confirm the named-internal-action seam (vs. a future
  first-class import service) is the intended long-term shape.

## Secret-safety (this continuation)

No key/seed/recovery/JWT-secret/`crypto_box`/plaintext in any changed file, test, fixture, or this
evidence. All vectors synthetic (`person-a`, `person-b`, `alias-coffee`, `COFFEE SHOP 123`).
Rules/preferences remain encrypted vault data — the server never sees rule plaintext.
