# Automation interaction contract — matching, precedence, and application audit

> Recovery note, 2026-10-05: this is a historical audit of `3bc789c`, not the current grid. PR #63
> replaced the row proposal/robot with the grid controller and inspector. Retired source citations
> below point to verbatim snapshots in `specs/fusion-mission-recovery/historical/`. The
> queued-write-after-unmount observation is historical and must not be imposed on the current
> controller. See `specs/fusion-mission-recovery/README.md` for coverage and integration status.

**Two audits, one path.** This file carries two independently produced audits of the same field-rule
automation engine, both read at `3bc789c`. MF-001 delivered the first. MF-005 branched from that
same revision before MF-001 landed and, finding the deliverable absent, produced a second,
row-id-keyed contract for the same path. Neither was written against the other and neither
supersedes the other, so integration keeps both rather than discarding one as a duplicate.

- **[Part A — the row contract (MF-005)](#part-a--the-row-contract-mf-005)** is the citable surface.
  Its `MA-…` row ids are stable handles, and `tests/unit/contracts/matching-audit.test.ts` reads
  this file and fails if a row is missing, thin, or cites a path or line that does not resolve.
- **[Part B — the original audit (MF-001)](#part-b--the-original-audit-mf-001)** is retained whole.
  It holds material Part A does not: the `L1`–`L11` ledger binding each behaviour to its frozen
  requirement in `specs/human-scratch.md`, the `M1`–`M11` matrix separating confirmed requirement
  from observed behaviour from pending decision, the `G1`–`G5` gap ledger, and its own verification
  record including the E2E port constraint and the pre-existing unit flake.

Where the two overlap they agree; where they differ in emphasis or depth, Part A's `MA-…` id is the
handle to cite and Part B is the longer reading behind it. Both are audits only. Neither approves
anything.

---

## Part A — the row contract (MF-005)

**Task:** MF-005 (restores the canonical deliverable named by MF-001) **Audited revision:**
`3bc789cee63d85d966c7c395e73f1bcd0bad04be` (branch `fusion/mf-005`). Every `src/…` citation below is
read at that revision, and no production file is modified by this task; the `tests/…` evidence cited
includes files added or extended on this branch on top of it. **Status:** audit of existing
behaviour. Nothing here approves a change. Rows are classified as `preserve` (confirmed existing
behaviour to keep), `hazard` (measured behaviour that is imperfect but is characterised, not fixed,
by this task) or `handoff` (a decision owned elsewhere).

This document is the behaviour contract for the field-rule automation engine as it actually behaves
at the audited revision. Every row cites the source that produces the behaviour and, where
executable evidence exists, the test that pins it. Row ids (`MA-…`) are stable handles; downstream
contracts and mockups should cite them rather than quoting prose.

### Scope and non-goals

In scope: how rules match transactions, how one winner per field is chosen, how description aliases
live and die, which fields may touch manual rows, how the user's editor choices are remembered, and
when a row-blur applies a proposed rule.

Not in scope, and deliberately undecided here: combining compatible outputs into multi-field grouped
rules (owned by MF-002), any change to proposed rule scope or date/timing semantics (owned by
MF-003), the automation-UI mockups and their approval, and the transaction-table interaction
refinements. The realtime-origin-controls test flake is owned by MF-004.

---

### 1. Links and provenance — there is no stored transaction-to-rule link

The frozen requirement is explicit: _"Rules set the field on a transaction. There is no explicit
link between the rule and the transaction. However, for each transaction, we calculate the highest
precedence rule that matches"_ (`specs/human-scratch.md`, the HS-007 automation clause). The
implementation matches that requirement, and three separate identifier-shaped things must not be
confused with a link.

| Row        | Classification | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Source                                                                                                                                                                                                                                        | Evidence                                                                                                                                                                                                                                                             |
| ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA-LINK-01 | preserve       | No rule id is ever written onto a transaction. A row's field values are the only residue of application; the winning rule is recomputed on demand from the rule set and the transaction's own facts, so deleting a rule silently stops it winning without any row rewrite or dangling reference.                                                                                                                                                             | `src/lib/crdt/field-rules.ts:61` `readActiveFieldRules`, `src/lib/domain/automation/rules.ts:221` `selectWinningRulesByField`; the transaction schema at `src/lib/crdt/schema.ts` carries no rule field.                                      | `tests/unit/domain/automation/rules.test.ts` "selectWinningRulesByField isolates fields"; `tests/integration/matching-audit-contract.test.ts` "stores field values only and returns rule identity solely as a return value".                                         |
| MA-LINK-02 | preserve       | The persisted `descriptionAliasId` on a transaction is an ALIAS reference, not a rule reference. It points into the `descriptionAliases` collection, is written by the P11 alias boundary, survives rule deletion untouched, and is what the alias page and lookup read. A description-alias rule that applies merely causes that same alias write; it leaves no trace of itself.                                                                            | `src/lib/crdt/schema.ts:161` transaction `descriptionAliasId`; `src/lib/crdt/description-aliases.ts:338` `assignDescriptionAlias`; `src/lib/crdt/field-rules.ts:181` `applyFieldRulesToTransaction` routes alias plans through that boundary. | `tests/unit/crdt/description-alias-mutations.test.ts` "assigns through a symlink to the final real alias and preserves raw text"; `tests/integration/matching-audit-contract.test.ts` "leaves the alias reference intact after the rule that set it is deleted".     |
| MA-LINK-03 | preserve       | The `ruleId` on a `FieldRulePlan` and on a `PlanApplicationOutcome` is TRANSIENT provenance. It exists only in the return value of a planning/application call so the caller can report what happened; it is never serialised into the vault document and does not survive the call.                                                                                                                                                                         | `src/lib/domain/automation/apply.ts:75` `planRuleApplications` (plans carry `ruleId`), `src/lib/domain/automation/apply.ts:155` `applyRulePlans` (outcomes carry `ruleId`, mutations write only field values).                                | `tests/integration/automation-field-rules.test.ts` "surfaces description-alias plans as deferred (dedicated P11 write boundary)"; `tests/integration/matching-audit-contract.test.ts` "stores field values only and returns rule identity solely as a return value". |
| MA-LINK-04 | preserve       | The legacy `automationApplications` collection DOES declare a transaction-to-automation link (`transactionId` + `automationId` + `previousValues`). It is retained schema from the pre-HS-007 generic engine and is not written by any field-rule path; the field-rule migration derives rules from `automations` without touching it. It must not be deleted as "dead" here, and must not be cited as evidence that the current engine links rules to rows. | `src/lib/crdt/schema.ts:323` `automationApplicationSchema.automationId`, root key at `src/lib/crdt/schema.ts:457`; `src/lib/domain/automation/migration.ts` never reads or writes it.                                                         | `tests/integration/field-rules-crdt.test.ts` "derives a field rule from a convertible legacy automation exactly once".                                                                                                                                               |

**Consequence for downstream design.** Because matching is recomputed and unlinked, grouping
compatible outputs into a multi-field rule (MF-002) cannot be implemented by attaching rules to
rows; it must remain a change to the rule record's shape. This audit records the constraint and
takes no position on the grouped shape itself.

---

### 2. Precedence: four ranks, then recency, then greatest id

| Row         | Classification | Behaviour                                                                                                                                                                                                                                                                                                                  | Source                                                                                                                                                                                        | Evidence                                                                                                                                                                                                                             |
| ----------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MA-RANK-01  | preserve       | Rank 0 — description only, no account and no amount constraint. The broadest slot; exactly one such rule may exist per field and description text.                                                                                                                                                                         | `src/lib/domain/automation/rules.ts:86` `ruleScopeRank` (`accountBit` 0 + `amountBit` 0).                                                                                                     | `tests/unit/domain/automation/rules.test.ts` "account-scoped beats amount-scoped beats unscoped".                                                                                                                                    |
| MA-RANK-02  | preserve       | Rank 1 — description + amount. An exact minor-units amount narrows the rule; it supersedes the unscoped rule for rows whose amount matches exactly.                                                                                                                                                                        | `src/lib/domain/automation/rules.ts:86` (`amountBit = 1`), constraint applied at `src/lib/domain/automation/rules.ts:187` `ruleMatchesSubject`.                                               | `tests/unit/domain/automation/rules.test.ts` "honours account and amount narrowing".                                                                                                                                                 |
| MA-RANK-03  | preserve       | Rank 2 — description + account. An account constraint outranks an amount constraint: the ladder is account-dominant, not additive-by-count.                                                                                                                                                                                | `src/lib/domain/automation/rules.ts:86` (`accountBit = 2` versus `amountBit = 1`).                                                                                                            | `tests/unit/domain/automation/rules.test.ts` "account-scoped beats amount-scoped beats unscoped".                                                                                                                                    |
| MA-RANK-04  | preserve       | Rank 3 — description + account + amount. The most specific slot and the unconditional winner whenever it matches. The full ladder is therefore description only < description + amount < description + account < description + account + amount.                                                                           | `src/lib/domain/automation/rules.ts:86` (rank 3), selection at `src/lib/domain/automation/rules.ts:201` `selectWinningRule`.                                                                  | `tests/unit/domain/automation/rules.test.ts` "selects the single highest-precedence match"; `tests/integration/matching-audit-contract.test.ts` "selects the same rank-3 winner under every permutation of the rule set".            |
| MA-TIE-01   | preserve       | A tie on rank is broken by the NEWEST `createdAt`. A rank tie is only reachable through a uniqueness violation (concurrent creation on two devices, or legacy wire data), so this is a convergence rule rather than an everyday path.                                                                                      | `src/lib/domain/automation/rules.ts:147` `compareRuleRecency` (private), consulted at `src/lib/domain/automation/rules.ts:201`.                                                               | `tests/unit/domain/automation/rules.test.ts` "dedupe keeps most recent per slot and is order-independent".                                                                                                                           |
| MA-TIE-02   | preserve       | When `createdAt` is also equal, the lexicographically GREATEST rule id wins. This makes the winner a pure function of the rule set — independent of iteration, insertion and replica order — which is what lets two devices agree without coordination.                                                                    | `src/lib/domain/automation/rules.ts:147` `compareRuleRecency` id comparison.                                                                                                                  | `tests/integration/matching-audit-contract.test.ts` "resolves an equal-createdAt duplicate slot to the greatest lexical id from wire fixtures".                                                                                      |
| MA-TIE-03   | preserve       | Recency means CREATION, not last edit. `updateFieldRule` preserves the existing `createdAtEpochMs` (and the immutable description text) when rewriting scope or action, so editing a rule never promotes it past a genuinely newer sibling.                                                                                | `src/lib/crdt/field-rule-mutations.ts:244` `updateFieldRule` (re-uses `existing.createdAtEpochMs`).                                                                                           | `tests/integration/field-rule-mutations.test.ts` "updates the action while preserving id, description and creation time".                                                                                                            |
| MA-MATCH-01 | preserve       | Description matching is EXACT: byte-equal, case-sensitive and whitespace-sensitive, with no substring or regex fallback. A trailing space or a case difference is a different key. (The legacy engine's `contains` semantics were tightened to exact during migration, which is a documented behaviour change, not a bug.) | `src/lib/domain/automation/rules.ts:187` `ruleMatchesSubject` (`!==` on `descriptionText`); tightening noted at `src/lib/domain/automation/migration.ts`.                                     | `tests/unit/domain/automation/rules.test.ts` "requires exact description text (no substring/case folding)"; `tests/integration/matching-audit-contract.test.ts` "does not match on case, whitespace, account or amount differences". |
| MA-MATCH-02 | preserve       | A `null` match text matches nothing at all, for every field. This is the state of an imported row with an empty raw description and of a manual row with no alias (or a dangling one), so such rows are inert rather than matching a rule with an empty description text.                                                  | `src/lib/domain/automation/rules.ts:187` (`subject.descriptionText == null` returns false); projection at `src/lib/crdt/field-rules.ts:90` `descriptionTextForMatching` (private).            | `tests/unit/domain/automation/rules.test.ts` "never matches a null description"; `tests/integration/matching-audit-contract.test.ts` "treats an empty imported description and a dangling manual alias as unmatchable".              |
| MA-MATCH-03 | preserve       | Each field runs its own independent precedence lattice: `selectWinningRulesByField` computes at most one winner per field, so a rank-3 tags rule and a rank-0 allocation rule can both apply to one row. A field with no match simply has no key in the result.                                                            | `src/lib/domain/automation/rules.ts:221` `selectWinningRulesByField`.                                                                                                                         | `tests/unit/domain/automation/rules.test.ts` "selectWinningRulesByField isolates fields"; `tests/integration/matching-audit-contract.test.ts` "lets different fields win at different scopes on the same transaction".               |
| MA-MATCH-04 | preserve       | Amount is an exact minor-units integer constraint with no sign or zero special-casing: a rule scoped to `0` matches only zero-amount rows, and a rule scoped to a negative amount matches only that exact negative amount. Absence of the constraint (`undefined`) means "any amount" and is distinct from `0`.            | `src/lib/domain/automation/rules.ts:187` (`rule.amount != null && rule.amount !== subject.amount`); optionality preserved through `src/lib/domain/automation/rules.ts:316` `decodeFieldRule`. | `tests/integration/matching-audit-contract.test.ts` "treats a zero amount as an exact constraint distinct from an absent one".                                                                                                       |

**Uniqueness.** At most one rule may occupy each (field, description text, account, amount) slot.
Ordinary CRUD enforces this by rejecting the second write (`duplicate-key`), so a rank tie cannot be
produced through the UI; ties are constructed in tests from wire fixtures, which is how a concurrent
or legacy collision would actually arrive. Source: `src/lib/domain/automation/rules.ts:102`
`ruleUniquenessKey`, `src/lib/crdt/field-rule-mutations.ts:205` `findUniquenessCollision`. Evidence:
`tests/integration/field-rule-mutations.test.ts` "rejects a second rule that collides on the
uniqueness key (same field/text/scope)" and "permits a more specific scope alongside the unscoped
rule". Soft-deleting a rule frees its slot (`tests/integration/field-rule-mutations.test.ts` "frees
the uniqueness slot for a new rule after deletion").

---

### 3. Field-specific eligibility: manual versus imported rows

| Row        | Classification | Behaviour                                                                                                                                                                                                                                                                                                              | Source                                                                                                                                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA-ELIG-01 | preserve       | Description-alias rules NEVER apply to manual rows. The matcher rejects them before any text comparison, so a manual row keeps its own alias even when a rule's description text matches its alias name exactly. The frozen rationale is that manual rows have no imported description text to key on.                 | `src/lib/domain/automation/rules.ts:174` `fieldAppliesToManual` returns false for `descriptionAlias`; enforced at `src/lib/domain/automation/rules.ts:187`. | `tests/unit/domain/automation/rules.test.ts` "excludes manual rows from description-alias rules but not tag/allocation rules"; `tests/integration/field-rule-mutations.test.ts` "never applies a description-alias rule to a manual row"; `tests/e2e/field-rule-parity.spec.ts` "tag and allocation rules apply to a manual aliased row while description rules never do". |
| MA-ELIG-02 | preserve       | Tag rules and whole-person-allocation rules DO apply to manual rows, provided the row exposes a matchable name. Allocation rules always carry the complete percentage set and replace it wholesale through the P16C boundary.                                                                                          | `src/lib/domain/automation/rules.ts:174` (`tags`, `allocation` return true); allocation routing at `src/lib/domain/automation/apply.ts:155`.                | `tests/integration/field-rule-mutations.test.ts` "applies a tag rule keyed on the alias name to a manual row" and "applies an allocation rule keyed on the alias name via the P16C boundary".                                                                                                                                                                              |
| MA-ELIG-03 | preserve       | Imported rows match the RAW imported text, never the displayed alias. Assigning a display alias to an imported row therefore does not change which rules match it, and renaming that alias changes nothing about matching — provenance is preserved because the raw description is never rewritten.                    | `src/lib/crdt/field-rules.ts:90` `descriptionTextForMatching` (private): `importId != null` branch returns `transaction.description`.                       | `tests/integration/matching-audit-contract.test.ts` "keeps matching an imported row on its raw text after its display alias is renamed".                                                                                                                                                                                                                                   |
| MA-ELIG-04 | preserve       | Manual rows match the RESOLVED alias name (symlinks followed), because the manual grid stores the user's typed text as an alias and leaves the raw description empty. `isManual` remains keyed purely on the absence of `importId`, so this projection widens what manual rows can match without weakening MA-ELIG-01. | `src/lib/crdt/field-rules.ts:90` (manual branch, `resolveAlias`), `src/lib/crdt/field-rules.ts:112` `subjectForTransaction` (private).                      | `tests/integration/field-rule-mutations.test.ts` "matches nothing on a manual row whose alias name differs from the rule"; `tests/integration/matching-audit-contract.test.ts` "matches a manual row on its resolved alias name and applies eligible fields only".                                                                                                         |

---

### 4. Description-alias lifecycle

Aliases are a small graph: a `real` alias owns a name plus reverse maps of the transactions and
symlinks pointing at it; a `symlink` alias is a former real alias that now redirects, in one hop, to
a real target. Every mutation validates completely before touching the draft, and callers run
exactly one mutation per `setState` so forward and reverse references commit and undo together
(`src/lib/crdt/description-aliases.ts`).

| Row         | Classification | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                              | Source                                                                                                                                                                                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA-ALIAS-01 | preserve       | Create normalises the name (trim + NFC) and rejects an empty name, an id collision and a duplicate normalised name. Exact-name assignment REUSES the existing real alias when one exists and only creates when none does, so typing an existing name never forks a second identity. Matching on names is case-sensitive after normalisation.                                                                                                           | `src/lib/crdt/description-aliases.ts:322` `createDescriptionAlias`, `:374` `findDescriptionAliasByExactName`, `:392` `assignDescriptionAliasByExactName`, `:407` `insertManualDescriptionAliasedTransaction`. | `tests/unit/crdt/description-alias-mutations.test.ts` "uses deterministic trim + NFC, case-sensitive exact matching" and "rejects NFC-equivalent create and rename duplicates without partial writes".                                                                                                                                                                                                    |
| MA-ALIAS-02 | preserve       | Assign moves the transaction's forward pointer and both reverse maps in one action, and always lands on the FINAL real alias — assigning a symlink resolves through it in one hop rather than storing a pointer to the symlink. A symlink with no target, a deleted alias or a two-hop chain is rejected with a typed error.                                                                                                                           | `src/lib/crdt/description-aliases.ts:338` `assignDescriptionAlias`, `:154` `getFinalRealAlias` (private), `:194` `moveTransactionReference` (private).                                                        | `tests/unit/crdt/description-alias-mutations.test.ts` "assigns through a symlink to the final real alias and preserves raw text" and "conserves forward and reverse references across randomized reassignment/removal".                                                                                                                                                                                   |
| MA-ALIAS-03 | preserve       | Change-one repoints a SINGLE row and leaves every other row on the old alias untouched. It is fenced by `expectedAliasId`: if the row's alias changed since the UI read it, the mutation returns `stale-alias` and writes nothing at all.                                                                                                                                                                                                              | `src/lib/crdt/description-aliases.ts:476` `changeOneDescriptionAlias`.                                                                                                                                        | `tests/unit/crdt/description-alias-mutations.test.ts` "returns a typed stale error without partial writes"; `tests/integration/matching-audit-contract.test.ts` "isolates change-one and rejects a stale expected alias id without mutating".                                                                                                                                                             |
| MA-ALIAS-04 | preserve       | Rename edits the shared identity in place: every row referencing that alias shows the new name immediately, because rows reference the alias id, not its text. Renaming is rejected for a symlink (`alias-not-real`) and for a name that duplicates another active real alias.                                                                                                                                                                         | `src/lib/crdt/description-aliases.ts:457` `renameDescriptionAlias`.                                                                                                                                           | `tests/unit/crdt/description-alias-mutations.test.ts` "rejects NFC-equivalent create and rename duplicates without partial writes".                                                                                                                                                                                                                                                                       |
| MA-ALIAS-05 | preserve       | Change all converts the SOURCE real alias into a symlink pointing at the target and retargets every inbound symlink onto the target, so old ids keep resolving in one hop and existing rows need no rewrite. Inbound backlinks are validated first; an invalid backlink aborts before the target is materialised, so a rejected change-all creates nothing. Source and target must differ.                                                             | `src/lib/crdt/description-aliases.ts:494` `changeAllDescriptionAliases`, target validation at `:286` `prepareTarget` and `:312` `materializeTarget` (private).                                                | `tests/integration/description-alias-crdt.test.ts` "commits change-all as one real Mirror/Loro undo step and excludes migration" and "converges after opposing peer change-all operations and preserves a recovery name"; `tests/integration/matching-audit-contract.test.ts` "resolves through an old symlink after change all and rejects an invalid inbound backlink before materialising the target". |
| MA-ALIAS-06 | preserve       | Remove one detaches a single row: it clears that row's `descriptionAliasId` and removes it from the alias's reverse map, leaving the alias itself and every other reference alive. It is fenced by the same `expectedAliasId` staleness check as change-one.                                                                                                                                                                                           | `src/lib/crdt/description-aliases.ts:541` `removeOneDescriptionAlias`.                                                                                                                                        | `tests/unit/crdt/description-alias-mutations.test.ts` "conserves forward and reverse references across randomized reassignment/removal".                                                                                                                                                                                                                                                                  |
| MA-ALIAS-07 | preserve       | Remove all soft-deletes the target and every inbound symlink, clears both reverse maps, and clears the pointer on every referencing transaction INCLUDING nested suspected duplicates. The record is stamped `deletedAt` rather than erased, so a concurrent peer's edit cannot resurrect a half-deleted graph.                                                                                                                                        | `src/lib/crdt/description-aliases.ts:558` `removeAllDescriptionAliases`.                                                                                                                                      | `tests/integration/matching-audit-contract.test.ts` "clears main and suspected-duplicate references when removing all"; `tests/integration/description-alias-crdt.test.ts` "converges management and cell conflict matrices while undo excludes remote work".                                                                                                                                             |
| MA-ALIAS-08 | preserve       | Missing, deleted and structurally broken references are tolerated on read and repaired on hydration: partial maps, chains, cycles, stale reverse references and deleted targets are normalised idempotently, and bounded maintenance may rewrite a still-current symlink reference or hard-delete a proven-orphan symlink. Rules never observe a dangling alias as a match, because an unresolvable manual alias projects to `null` (see MA-MATCH-02). | `src/lib/crdt/description-aliases.ts:236` `rewriteDescriptionAliasMaintenanceReference`, `:263` `hardDeleteProvenDescriptionAliasSymlink`; repair path exercised through the vault provider.                  | `tests/integration/description-alias-crdt.test.ts` "repairs partial maps, chains, cycles, stale references, and deleted targets idempotently"; `tests/integration/vault-provider-alias-repair.test.ts` "repairs and flushes before first read, exchanges the repair, and reopens idempotently".                                                                                                           |

**UI restriction versus API permission.** The alias-management surface
(`src/app/(app)/tx-descriptions/page.tsx` →
`src/components/features/description-aliases/DescriptionAliasesTable.tsx` →
`useDescriptionAliasActions` at `src/lib/crdt/context.tsx:1067`) exposes a deliberately narrower set
of gestures than the mutation module permits. The low-level API being able to perform an operation
is not evidence that the UI offers it, and this audit does not propose widening either. The shared
read index `src/components/features/description-aliases/useDescriptionAliasLookup.ts` is consumed by
the transactions page, the alias table and `src/components/features/people/PeopleTable.tsx`; all
three read the same bounded lookup, so alias display cannot diverge between them.

---

### 5. Persistence, ordering and failure boundaries

| Row           | Classification | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                            | Source                                                                                                                                                                                                                         | Evidence                                                                                                                                                                                                                                                                               |
| ------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA-PERSIST-01 | preserve       | Rules, preferences and aliases live in the Loro vault document, persisted as encrypted local snapshots and synced through the vault provider. They are not stored in the Fusion task database, and no server-side matcher exists: matching runs entirely in the browser against decrypted state. There is consequently no SQL lock, transaction or pool anywhere on the rule path.                                   | `src/lib/crdt/schema.ts:461` `fieldRules` and `:462` `userAutomationPreferences` root keys; `src/lib/sync/manager.ts`, `src/lib/sync/persistence.ts`.                                                                          | `tests/integration/vault-provider-alias-repair.test.ts` "awaits the real encrypted local queue before initial push and convergent reopen"; `tests/integration/field-rules-crdt.test.ts` "preserves existing data and adds empty collections when hydrating from a snapshot".           |
| MA-PERSIST-02 | preserve       | Rule CRUD, bulk apply and preference persistence are SEPARATE undo actions, not one transaction. Each hook wraps its own `setState`, so undoing a rule creation does not undo the application that followed it. Import is the exception by construction: insertion and rule application share one draft inside `commitImportBatch`.                                                                                  | `src/lib/crdt/context.tsx:1182` `useFieldRuleActions`, `:1208` `useApplyFieldRules`, `:1229` `useApplyFieldRulesToTransaction`, `:1246` `usePersistAutomationPreference`; `src/lib/crdt/import-commit.ts` `commitImportBatch`. | `tests/integration/import-commit-field-rules.test.ts` "applies the highest-precedence tag rule to every imported transaction"; `tests/integration/description-alias-actions.test.ts` "returns typed results without replacement recipes and gives every operation one undo/redo step". |
| MA-PERSIST-03 | preserve       | Application computes all plans first, then applies tags and allocations, then aliases, reporting a TYPED outcome per field. There is no universal rollback: a rejected allocation set or an alias error is reported for that field while the other fields' writes stand. Individual mutations are still all-or-nothing internally — an invalid allocation set is rejected with zero mutation rather than normalised. | `src/lib/domain/automation/apply.ts:75` `planRuleApplications`, `:155` `applyRulePlans`; `src/lib/crdt/field-rules.ts:181` `applyFieldRulesToTransaction` (alias partition).                                                   | `tests/integration/import-commit-field-rules.test.ts` "rejects an invalid complete allocation set with zero mutation"; `tests/integration/matching-audit-contract.test.ts` "reports a per-field alias rejection while the tag plan for the same row still applies".                    |

**Ordering hazards not covered by tests.** Recovery orderings — a crash between the synchronous Loro
mutation and the encrypted asynchronous flush, or a reload racing hydration-time migration against
alias repair — are NOT characterised by any test at this revision. They are recorded here as gaps,
not as guarantees. Application is idempotent and convergent
(`tests/integration/import-commit-field-rules.test.ts` "re-running rule application over the same
import converges (idempotent)"), which bounds the damage of a repeated apply but says nothing about
a partially flushed snapshot.

**Migration idempotency.** The legacy → field-rule migration runs at most once per vault, guarded by
`preferences.automationRulesMigrationVersion`, and derived ids are deterministic so two devices
migrating concurrently converge. A vault with no legacy automations leaves the marker unstamped and
writes nothing. Source: `src/lib/crdt/field-rules.ts:296`, `src/lib/crdt/field-rules.ts:370`.
Evidence: `tests/integration/field-rules-crdt.test.ts` "runs automatically at hydration and does not
resurrect a user-deleted rule".

---

### 6. Remembered preferences

| Row        | Classification | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Source                                                                                                                                                                                                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA-PREF-01 | preserve       | With no stored record, the remembered choice defaults to field `tags`, tag mode `add`, both scope checkboxes off, and apply mode `updateNew` — the most conservative mode, since it is explicit and touches only newer rows, so an absent preference can never retroactively rewrite history. Each slot defaults independently, so a record missing only `lastApplyMode` needs no migration.                                                                                                                                                                          | `src/lib/domain/automation/preferences.ts:41` `DEFAULT_REMEMBERED_CHOICE`, `:50` `readRememberedChoice`; `src/lib/domain/automation/apply-mode.ts:31` `DEFAULT_APPLY_MODE`.                                                                                                           | `tests/unit/domain/automation/preferences.test.ts` "returns defaults when no record exists", "fills missing fields with defaults", "defaults the apply mode when absent but honours a stored one".                                                                                                                                                                               |
| MA-PREF-02 | preserve       | Preferences are PER-USER UI state keyed by `pubkeyHash` in `userAutomationPreferences`, deliberately separate from the vault's shared `preferences`. Two members of one vault therefore remember different choices without overwriting each other, and the value round-trips through the CRDT unchanged.                                                                                                                                                                                                                                                              | `src/lib/crdt/schema.ts:462`; `src/lib/crdt/field-rule-mutations.ts:310` `persistUserAutomationPreference`, `:327` `readUserAutomationChoice`; hooks at `src/lib/crdt/context.tsx:1241` and `:1246`.                                                                                  | `tests/integration/field-rule-mutations.test.ts` "persists and reads back a user's remembered choice" and "returns defaults for an unknown user"; `tests/integration/field-rules-crdt.test.ts` "persists per-user automation preferences"; `tests/integration/matching-audit-contract.test.ts` "keeps two users' remembered choices independent and survives a snapshot reload". |
| MA-PREF-03 | preserve       | With no identity available (`pubkeyHash == null`) the write is SKIPPED rather than stored under a placeholder key; the read falls back to the empty key and therefore yields the defaults. A cancelled or invalid draft also persists nothing, because remembering happens only after the rule write succeeds.                                                                                                                                                                                                                                                        | `src/components/features/transactions/use-field-rule-proposal.ts` (`if (pubkeyHash != null)` guard, after the successful write); `src/components/features/transactions/use-transaction-rule-workflow.ts` `rememberChoice` (early return); `src/lib/crdt/field-rule-mutations.ts:327`. | `tests/integration/matching-audit-contract.test.ts` "leaves no preference record when identity is absent".                                                                                                                                                                                                                                                                       |
| MA-PREF-04 | preserve       | The manager's Save writes the rule only; applying to existing rows is a SEPARATE explicit Apply-all / Apply-new action on the same page. The transaction-context surfaces differ: the robot edits an existing rule and offers apply-this / apply-all / apply-new, while the proposal creates-or-updates and then applies at the draft's chosen scope in the same gesture. The _apply to new imports_ affordance means strictly-newer rows relative to THAT transaction's date when invoked from a row, and all future imports when invoked from the automations page. | `src/components/features/automations/FieldRulesManager.tsx`; `src/components/features/transactions/use-transaction-rule-workflow.ts`; `src/components/features/transactions/use-field-rule-proposal.ts`.                                                                              | `tests/e2e/automations.spec.ts` "CRUD journey: create, edit, and delete a tags field rule" and "apply-all and apply-new report impact and route through the engine"; `tests/e2e/field-rule-parity.spec.ts` "the four-mode apply select is remembered and restored on reopen".                                                                                                    |

---

### 7. Row blur and automatic application

The four modes decompose into two independent axes: the `Updating…`/`Update…` prefix decides
AUTOMATIC versus explicit, and the `…All`/`…New` suffix decides scope
(`src/lib/domain/automation/apply-mode.ts:41` `applyModeTargetsNewOnly`,
`src/lib/domain/automation/apply-mode.ts:55` `applyModeIsAutomatic`; evidence:
`tests/unit/domain/automation/apply-mode.test.ts` "decomposes each mode into its automatic and
new-only axes" and "property: the two axes reconstruct the mode name (updating/update prefix,
All/New suffix)").

| Row        | Classification | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Source                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MA-BLUR-01 | preserve       | The automatic modes require a GENUINE row exit: the edit surface must be closed AND focus must currently be outside the row. The decision reads live focus state at one deferred instant rather than remembering an earlier observation, so leaving and returning to the row before evaluation does not apply. Deferral is required, because at `focusout` dispatch `document.activeElement` is already `<body>` even for moves that stay inside the row.                                                                                                                                                                                                                         | `specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt:165` `isAutomatic`, the deferred evaluation at `:212`, and both listeners plus the mount-time call at `:219`; predicate `isFocusStillInRow` in `src/components/features/transactions/field-rule-proposal-state.ts`. | `tests/unit/components/rule-proposal-auto-apply.test.tsx` "DOES apply once the edit has closed and focus is genuinely outside the row", "does NOT apply when focus left during the edit but has returned by the time it closes", "does not apply while the edit is still in progress, even with focus outside"; `tests/e2e/rule-creation-controls.spec.ts` "choosing Updating all writes nothing until focus leaves the row, then writes on blur".                             |
| MA-BLUR-02 | preserve       | The explicit modes wait for the tick regardless of focus; the automatic modes still permit an explicit tick. Both paths run the same `confirm`, so an explicitly confirmed automatic rule cannot then be applied a second time by the blur.                                                                                                                                                                                                                                                                                                                                                                                                                                       | `specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt:148`-`:165` (shared `confirm`, `applyModeIsAutomatic` gate).                                                                                                                                                        | `tests/unit/components/rule-proposal-auto-apply.test.tsx` "an explicit Update mode writes nothing on a genuine row exit" — the same gesture that writes in `updatingAll` writes nothing in `updateAll`, driven through the shipped component; `tests/e2e/rule-creation-controls.spec.ts` "changing a tag offers to create a rule that applies to the other matching rows" (explicit tick) and "a description alias committed with Enter applies an Updating rule" (blur path). |
| MA-BLUR-03 | preserve       | `appliedRef` guards against duplicate application: the first confirm claims the flag, and re-registration of the focus listeners cannot produce a second write. When validation REJECTS the draft the flag is released again, so the controls stay open and the user can correct the restriction and retry. The release is unconditional, so while a draft keeps failing every later evaluation retries it; the latch closes only on the write that succeeds.                                                                                                                                                                                                                     | `specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt:148` `appliedRef` and the release on failed `apply()`.                                                                                                                                                              | `tests/unit/components/rule-proposal-auto-apply.test.tsx` "writes exactly once no matter how often the listeners re-register" (the latch) and "releases the duplicate guard when validation rejects, so a later blur can retry" (the release, then the latch closing after the corrected write); `tests/e2e/rule-creation-controls.spec.ts` "ticking only-if-amount scopes the rule to that amount and spares the other row".                                                  |
| MA-BLUR-04 | preserve       | A portaled surface the row OWNS — its tag picker, its own proposal popover — counts as still inside the row, matched by `data-owned-by-row` identity rather than a bare boolean, so another row's picker is correctly read as focus having left. Focus is never stolen by the popover (`onOpenAutoFocus` is prevented), and the popover defers painting until the cell's own edit surface closes so it cannot occlude the controls.                                                                                                                                                                                                                                               | `specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt:177` and `:233` (`data-owned-by-row`); `isFocusStillInRow` in `src/components/features/transactions/field-rule-proposal-state.ts`; wiring at `src/app/(app)/transactions/page.tsx:824`.                             | `tests/unit/components/rule-proposal-stability.test.tsx` "counts THIS row's portaled surface as still in the row", "does NOT count another row's portaled surface as still in the row", "treats a blur to body as having LEFT the row"; `tests/e2e/rule-creation-controls.spec.ts` "the proposal waits for the tag picker to close, then its controls are clickable".                                                                                                          |
| MA-BLUR-05 | hazard         | Cleanup removes both focus listeners but does NOT cancel already-queued `setTimeout` callbacks. A callback scheduled immediately before unmount therefore still runs, and it is worse than a no-op: by then `anchorRef.current` is null, so `isRowFocusLost` finds no row and reports the row as LOST even though focus never moved. MEASURED at the audited revision: a callback queued while focus is still inside the row applies after unmount. This is characterised, not fixed, here — there is no complete stale-work or unmount fencing and this audit does not claim one; adding real fencing is expected to fail the pinning test, at which point this row is upgraded. | `specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt:212` (`window.setTimeout` with no handle retained) and the cleanup at `:223`; detached-anchor read at `:176`.                                                                                                       | `tests/unit/components/rule-proposal-auto-apply.test.tsx` "HAZARD: a timer queued before unmount still applies, because the detached anchor reads as focus lost". Recorded as measured hazard behaviour, not a guarantee of fencing.                                                                                                                                                                                                                                           |

**Cell remount stability.** The proposal anchor renders the SAME element whether or not the cell is
the pending edit, so opening a proposal never remounts the edited cell and never destroys an
in-progress edit. Source:
`specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt`, wired at
`src/app/(app)/transactions/page.tsx:817`. Evidence:
`tests/unit/components/rule-proposal-stability.test.tsx` "keeps the cell mounted and the SAME DOM
node when a proposal opens", "preserves in-progress edit state across the flip", and the negative
control "the two-element-type shape DOES remount, which is the defect being prevented";
`tests/e2e/rule-creation-controls.spec.ts` "the tag dropdown stays open after selecting a tag while
a proposal appears".

---

### 8. Date and import boundary — preserved, with the open question named

`isNewerTransactionDate` is a STRICT calendar-date greater-than: a rule applied with a `…New` mode
from a given transaction skips rows sharing that transaction's date. `Temporal.PlainDate` carries no
time or zone, so the comparison is free of locale ambiguity. Source:
`src/lib/domain/automation/rules.ts:242`; scope filter at `src/lib/crdt/field-rules.ts:279`.
Evidence: `tests/unit/domain/automation/rules.test.ts` "is strict calendar-date greater-than (no
time/zone)"; `tests/integration/field-rule-mutations.test.ts` "applies to strictly-later
transactions but not the reference date or earlier".

Two distinct notions of "new" coexist and must not be conflated: the calendar-date filter above, and
future IMPORT arrivals, which are covered because `commitImportBatch` applies the active rule set to
every row of each new batch (`src/lib/crdt/import-commit.ts` → `src/lib/crdt/field-rules.ts:257`). A
row imported today with last year's date is "new" in the arrival sense and not in the date sense.

**Handoff (open question, not decided here).** Whether `…New` should mean on-or-after rather than
strictly-after is MF-003's scope-and-timing decision. This audit records the current strict `>`
comparator as preserved behaviour and makes no comparator change.

---

### 9. Participant map

Execution paths traced at the audited revision:

- **Transaction edit → proposal → CRUD → apply → preferences.**
  `src/app/(app)/transactions/page.tsx` →
  `specs/fusion-mission-recovery/historical/TransactionRuleProposal.tsx.txt` →
  `src/components/features/transactions/use-field-rule-proposal.ts` →
  `src/lib/crdt/field-rule-mutations.ts` (create/update) → `src/lib/crdt/field-rules.ts` (apply) →
  `persistUserAutomationPreference`.
- **Robot → edit / delete / apply-this / apply-all / apply-new.**
  `specs/fusion-mission-recovery/historical/TransactionRuleRobot.tsx.txt` and
  `src/components/features/transactions/TransactionRulePopup.tsx` →
  `src/components/features/transactions/use-transaction-rule-workflow.ts` →
  `src/lib/crdt/apply-field-rule-to-transaction.ts` and `src/lib/crdt/field-rules.ts`.
- **Automations page → Save, then explicit Apply.** `src/app/(app)/automations/page.tsx` →
  `src/components/features/automations/FieldRulesManager.tsx` →
  `src/components/features/automations/FieldRuleEditor.tsx` with
  `src/components/features/automations/rule-editor-model.ts` and
  `src/components/features/automations/rule-editor-data.ts`.
- **Import.** `src/app/(app)/imports/new/page.tsx` →
  `src/components/features/import/ImportPanel.tsx` → `src/lib/crdt/import-commit.ts` →
  `applyFieldRulesToImport`.
- **Alias management and lookup.** `src/app/(app)/tx-descriptions/page.tsx` →
  `src/components/features/description-aliases/DescriptionAliasesTable.tsx` →
  `src/lib/crdt/context.tsx:1067` `useDescriptionAliasActions` →
  `src/lib/crdt/description-aliases.ts`; read index
  `src/components/features/description-aliases/useDescriptionAliasLookup.ts` shared with
  `src/components/features/people/PeopleTable.tsx`.
- **Hydration, migration and repair.** `src/lib/crdt/mirror.ts` →
  `migrateVaultAutomationsToFieldRules` and the alias repair pass, exercised through
  `src/lib/sync/manager.ts` and `src/lib/sync/persistence.ts`.

No agent or streaming bridge participates in any of these paths.

### 10. Requirement ledger and handoffs

Every requirement of the source feature is discharged by the rows above:

| Requirement                                             | Rows                                                                      | Status                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Independent rule matching (no transaction-to-rule link) | MA-LINK-01 … MA-LINK-04                                                   | preserved, evidenced                                                                     |
| Per-field precedence with tie resolution                | MA-RANK-01 … MA-RANK-04, MA-TIE-01 … MA-TIE-03, MA-MATCH-01 … MA-MATCH-04 | preserved, evidenced                                                                     |
| Description aliases                                     | MA-ALIAS-01 … MA-ALIAS-08                                                 | preserved, evidenced                                                                     |
| Manual-transaction eligibility                          | MA-ELIG-01 … MA-ELIG-04                                                   | preserved, evidenced                                                                     |
| Remembered preferences                                  | MA-PREF-01 … MA-PREF-04                                                   | preserved, evidenced                                                                     |
| Row-blur application                                    | MA-BLUR-01 … MA-BLUR-05                                                   | preserved and evidenced, except the MA-BLUR-05 timer hazard, which is characterised only |

Open items owned elsewhere, recorded as PENDING handoffs rather than as reviewed evidence — none of
the adjacent reports exists in this repository at the audited revision, and none is cited above as a
source:

- **MF-002 — grouped rule ownership.** Combining compatible automation outputs into multi-field
  rules. Its report is not present in `specs/` here. Constraint this audit imposes on it: MA-LINK-01
  (no stored transaction-to-rule link) and the per-slot uniqueness key must survive any grouped
  shape.
- **MF-003 — proposed rule scope and timing.** Includes the strict-versus-on-or-after `…New`
  question in section 8. Its report is not present in `specs/` here. Constraint: MA-TIE-03 (update
  preserves `createdAt`) interacts with any timing change.
- **Automation UI mockups and user approval.** Downstream of this contract; no mockup is approved or
  implied by this document. Transaction-table interaction refinements need no mockup but are out of
  scope for this task.

### 11. Verification

Executable evidence for this document:

- `tests/unit/contracts/matching-audit.test.ts` — reads this exact file, asserts every `MA-…` row is
  present with a substantive body, checks that every `src/…`, `tests/…` and `specs/…` citation
  resolves (including `path:line` bounds), and rejects redaction markers and placeholders. Run
  against the empty tree before this document existed, it failed with the original symptom.
- `tests/integration/matching-audit-contract.test.ts` — production characterisation through
  `createVaultMirror`, the real CRUD/read/apply APIs and the alias mutation boundary, covering the
  gaps the pre-existing suites did not: permutation-independent rank selection, equal-`createdAt`
  greatest-id resolution from wire fixtures, zero as an exact constraint, per-field independent
  winners, raw-text matching after an alias rename, change-one isolation and stale rejection,
  change-all resolution through old symlinks with invalid-backlink rejection, remove-all clearing
  suspected-duplicate references, per-field alias rejection alongside a successful tag plan, and
  two-user preference independence across a snapshot reload.

- `tests/unit/components/rule-proposal-auto-apply.test.tsx` — EXTENDED by this task with three cases
  through the shipped component, filling the row-blur evidence gaps: the explicit half of the
  automatic/explicit split (MA-BLUR-02), the guard's release-then-latch behaviour on a rejected and
  then corrected draft (MA-BLUR-03), and the unmount-before-timer hazard (MA-BLUR-05), which is
  measured and pinned rather than fixed.

Pre-existing suites reused as evidence (not modified):
`tests/unit/domain/automation/{rules,preferences,apply-mode}.test.ts`,
`tests/integration/{automation-field-rules,field-rules-crdt,field-rule-mutations,apply-field-rule-to-transaction,import-commit-field-rules,description-alias-actions,description-alias-crdt,vault-provider-alias-repair}.test.ts`,
`tests/unit/crdt/description-alias-mutations.test.ts`,
`tests/unit/components/rule-proposal-stability.test.tsx`, and the end-to-end journeys
`tests/e2e/{transaction-rules,field-rule-parity,rule-creation-controls,automations}.spec.ts`.

**Viewport coverage, measured rather than assumed.** The component cases run in jsdom, which has no
layout and is not viewport evidence; no row here rests on a jsdom breakpoint. The end-to-end
journeys run under Playwright's single `chromium` project, whose `Desktop Chrome` device is a
1280×720 viewport, so every journey cited above is DESKTOP evidence unless it sets its own size. One
mobile case was added by this task: `tests/e2e/rule-creation-controls.spec.ts` "an Updating mode
still applies on a genuine row exit at 390x844" calls
`page.setViewportSize({ width: 390, height: 844 })` and drives the same blur gesture, so MA-BLUR-01
is verified at both widths. The remaining proposal and robot surfaces — the restriction toggles, the
robot popup, the automations manager — are still desktop-only evidence and are recorded as a gap,
not a claim. The recovery orderings named in section 5 are likewise uncharacterised.

Frozen requirement sources: `specs/human-scratch.md` (the HS-007 automation clause) and
`specs/011-automations-conformance/spec.md`.

---

## Part B — the original audit (MF-001)

**Task:** MF-001 · **Audited commit:** `3bc789c`
(`Merge pull request #61 from bentefay/faster-grid`) **Branch:** `fusion/mf-001` **Status:** audit
only. Nothing in this document is an approval. Every row marked _decision — approval pending_ stays
pending until mockups are approved. Completing this audit does not imply approval of anything.

### What this document is

A source-cited, automatically-verified description of how automation rules currently match
transactions, how precedence resolves, how rules are applied and persisted, and where the row-blur
interaction baseline actually lives. It separates three things that are easy to conflate:

1. **Confirmed user requirement** — frozen in `specs/human-scratch.md:248-295` and
   `specs/011-automations-conformance/spec.md` (UR-009).
2. **Observed existing behaviour to preserve** — what the code at `3bc789c` actually does, with a
   named automated test as evidence.
3. **Decision requiring mockup approval** — open design questions this audit deliberately does not
   settle.

Historical specifications and the human-scratch ledgers are read-only evidence here. This audit
changes no product behaviour; the only source edits are characterization tests added where evidence
was genuinely absent (listed in [Evidence added by this audit](#evidence-added-by-this-audit)).

### Contract assertion under audit

> The contract explicitly rejects stored transaction-to-rule links; records description, amount,
> account, and account-plus-amount precedence; preserves alias lifecycle behaviour and
> field-specific eligibility.

Each clause is substantiated below against source and named tests.

---

### Source ledger

| #   | Requirement                                                                  | Source / symbol                                                            | Observed behaviour                                                                       | Preservation                                       | Test evidence                                                                                                                                                                                                               | Owner           |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| L1  | No explicit link between rule and transaction                                | `specs/human-scratch.md:275`; `src/lib/crdt/schema.ts` `transactionSchema` | No rule id on any transaction; recomputed per read                                       | Preserve                                           | `tests/unit/domain/automation/rules.test.ts` › "selectWinningRulesByField isolates fields"                                                                                                                                  | MF-001          |
| L2  | Exact description-text matching                                              | `human-scratch.md:270-274`; `rules.ts` `ruleMatchesSubject`                | Case- and whitespace-sensitive `!==` compare                                             | Preserve                                           | rules.test.ts › "requires exact description text (no substring/case folding)"                                                                                                                                               | MF-001          |
| L3  | Natural precedence: text < text+amount < text+account < text+account+amount  | `human-scratch.md:270-274`; `rules.ts` `ruleScopeRank`                     | Ranks 0/1/2/3, account bit 2 + amount bit 1                                              | Preserve                                           | rules.test.ts › "ranks account=$accountId amount=$amount as $rank"                                                                                                                                                          | MF-001          |
| L4  | At most one rule per description text per scope                              | `human-scratch.md:272-274`; `rules.ts` `ruleUniquenessKey`                 | JSON key `[field, text, accountId??null, amount??null]`; create/update reject collisions | Preserve                                           | `tests/integration/field-rule-mutations.test.ts` › "rejects a second rule that collides on the uniqueness key (same field/text/scope)"                                                                                      | MF-001          |
| L5  | Description-alias rules do not apply to manual rows; tag/allocation rules do | `human-scratch.md:271`, `:294-295`                                         | `fieldAppliesToManual` gate inside `ruleMatchesSubject`                                  | Preserve                                           | rules.test.ts › "excludes manual rows from description-alias rules but not tag/allocation rules"                                                                                                                            | MF-001          |
| L6  | Rules run for newly imported transactions                                    | `human-scratch.md:270-271`                                                 | `commitImportBatch` calls `applyFieldRulesToImport` last                                 | Preserve                                           | `tests/integration/import-commit-field-rules.test.ts` › "applies the highest-precedence tag rule to every imported transaction"                                                                                             | MF-001          |
| L7  | "Update new" = strictly greater date than the current transaction            | `human-scratch.md:266-268`                                                 | `isNewerTransactionDate` uses `compare(...) > 0`                                         | Preserve as baseline; `>=` request is **MF-003's** | rules.test.ts › "is strict calendar-date greater-than (no time/zone)"                                                                                                                                                       | **MF-003**      |
| L8  | Remember the user's last select/checkbox choices per user                    | `human-scratch.md:270`                                                     | `userAutomationPreferences[pubkeyHash]`; defaults tags/add/unscoped/`updateNew`          | Preserve                                           | `tests/integration/field-rule-mutations.test.ts` › "persists and reads back a user's remembered choice" / "returns defaults for an unknown user"                                                                            | MF-001 (Step 2) |
| L9  | "Updating" prefix applies automatically on row focus loss                    | `human-scratch.md:263-266`; UR-009                                         | `TransactionRuleProposal` live focus read + deferred evaluation                          | Preserve                                           | `tests/unit/components/rule-proposal-auto-apply.test.tsx`                                                                                                                                                                   | MF-001 (Step 3) |
| L10 | Tag rules add vs set; allocation rules cover the whole percentage set        | `human-scratch.md:288-293`                                                 | `resolveTagRuleResult`; P16C complete-set replacement                                    | Preserve                                           | rules.test.ts › "set replaces existing tags" / "add unions preserving order and de-duplicating"; `tests/integration/field-rules-crdt.test.ts` › "routes allocation rules exclusively through P16C complete-set replacement" | MF-001 (Step 2) |
| L11 | Grouped-rule edit ownership and cross-field conflicts                        | mission brief                                                              | Not implemented at `3bc789c`; rules are per field                                        | Out of scope here                                  | —                                                                                                                                                                                                                           | **MF-002**      |

---

### 1. Matching, precedence, and field eligibility

#### 1.1 There are no stored transaction-to-rule links

This is the load-bearing structural claim, and it is a claim about _what is written_, not about what
the UI shows. Three separate write surfaces have to be checked, because a link could hide in any of
them.

| Where a link could live | What is actually there                                                                                                                                                                               | Source                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Transaction record      | `transactionSchema` carries `descriptionAliasId`, `importId`, `tagIds`, `allocations`. **No rule id field exists.**                                                                                  | `src/lib/crdt/schema.ts:137`, `:161`                   |
| Plan / outcome objects  | `FieldRulePlan` and `PlanApplicationOutcome` both carry `ruleId`, but they are transient in-memory values returned from `planRuleApplications` / `applyRulePlans` and never written into vault state | `src/lib/domain/automation/apply.ts:52-65`, `:116-135` |
| Rule record             | `fieldRuleSchema` carries only the rule's own identity, key, scope, action, and timestamps — no transaction ids, no application ledger                                                               | `src/lib/crdt/schema.ts` `fieldRuleSchema`             |

The consequence: **matching is recomputed from transaction facts on every read.** A transaction's
membership in a rule's match set is a pure function of
`(descriptionText, accountId, amount, isManual)` and the active rule set — see
`subjectForTransaction` in `src/lib/crdt/field-rules.ts:112`. Nothing is memoized into the document,
so a rule edit changes what matches immediately and a rule deletion leaves no dangling reference to
clean up.

**`descriptionAliasId` is an alias reference, not a rule link.** It is written exclusively by the
P11 alias mutation surface (`assignDescriptionAlias` and friends in
`src/lib/crdt/description-aliases.ts`). When a description-alias rule applies,
`applyFieldRulesToTransaction` partitions alias plans out of the general path and routes them
through `assignDescriptionAlias` (`src/lib/crdt/field-rules.ts:181-235`) — the field the rule causes
to be written is the alias pointer, which is indistinguishable from the same pointer written by a
manual edit. That is exactly the frozen intent at `human-scratch.md:275`: _"Rules set the field on a
transaction. There is no explicit link between the rule and the transaction."_

**One honest nuance.** The schema still declares a legacy `automationApplications` record
(`src/lib/crdt/schema.ts:457`, initialized empty at `src/lib/crdt/defaults.ts:161`) whose shape
_does_ contain `transactionId` + `automationId` — a genuine transaction-to-automation link from the
pre-HS-007 automation model. It is dead: no active code path writes it, and the field-rule engine
never reads it. It is recorded here rather than omitted because a reader grepping the schema will
find it and should know its status. Removing it is a migration, which this audit is not authorized
to perform; MF-003's prompt flags the same nuance.

> **Contract line.** No new transaction-to-rule link may be introduced by later work in this
> mission. Any design that needs to know "which rule produced this value" must derive it, as the
> engine does today, not store it.

#### 1.2 Exact matching

`ruleMatchesSubject` (`src/lib/domain/automation/rules.ts:189`) is a five-line total predicate:

```ts
if (subject.isManual && !fieldAppliesToManual(rule.action.field)) return false;
if (subject.descriptionText == null) return false;
if (rule.descriptionText !== subject.descriptionText) return false;
if (rule.accountId != null && rule.accountId !== subject.accountId) return false;
if (rule.amount != null && rule.amount !== subject.amount) return false;
return true;
```

| Property            | Observed behaviour                                                                                   | Evidence                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Description compare | Strict `!==` on the raw string: case-sensitive, whitespace-sensitive, no substring, no normalization | rules.test.ts › "requires exact description text (no substring/case folding)"                            |
| Null description    | Never matches                                                                                        | rules.test.ts › "never matches a null description"                                                       |
| Account narrowing   | Absent = any; present = exact equality                                                               | rules.test.ts › "honours account and amount narrowing"                                                   |
| Amount narrowing    | Absent = any; present = exact equality on minor units                                                | rules.test.ts › "honours account and amount narrowing"                                                   |
| **Zero amount**     | `0` is a _present_ constraint, not an absent one — the guard is `!= null`, never falsiness           | rules.test.ts › "treats a zero amount as an exact constraint, not an absent one" _(added by this audit)_ |

The zero case matters because a `!= null` test and a truthiness test differ exactly at `0`, and a
zero-amount transaction is representable. It is now pinned in both `ruleScopeRank` (rank 1 / rank 3
rows in the table-driven rank test) and `ruleMatchesSubject`.

#### 1.3 Precedence: the four-rank lattice

`ruleScopeRank` (`rules.ts:88`) computes `accountBit(2) + amountBit(1)`:

| Rank | Scope                          | Frozen phrasing                                                            |
| ---- | ------------------------------ | -------------------------------------------------------------------------- |
| 0    | description only               | "one rule for each description text with no account or amount constraints" |
| 1    | description + amount           | "superseded by rules matching description text for specific amounts"       |
| 2    | description + account          | "followed by rules for each account"                                       |
| 3    | description + account + amount | "followed by rules for each account for each amount"                       |

`selectWinningRule` (`rules.ts:201`) is a single pass keeping the strictly-higher rank; on a rank
tie it falls through to `compareRuleRecency` (later `createdAt`, then lexicographically greater id).
A rank tie is only reachable through a uniqueness violation — the mutation layer rejects same-key
creates — so the tiebreak exists to make a corrupted or concurrently-merged state deterministic
rather than to express product intent.

| Property                                                               | Evidence                                                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Rank ordering across all four scopes                                   | rules.test.ts › "ranks account=$accountId amount=$amount as $rank" (table-driven, six rows incl. two zero-amount rows) |
| Highest rank wins among four competitors                               | rules.test.ts › "selects the single highest-precedence match"                                                          |
| Stepwise supersession                                                  | rules.test.ts › "account-scoped beats amount-scoped beats unscoped"                                                    |
| **Reversed input order gives the same winner**                         | rules.test.ts › "gives the same winner when the four competing ranks arrive reversed" _(added by this audit)_          |
| Order-independence under shuffle (property test, 500 runs, fixed seed) | rules.test.ts › "is order-independent under shuffle"                                                                   |
| No match ⇒ `null`                                                      | rules.test.ts › "returns null when nothing matches"                                                                    |

The reversed-order case is a deterministic companion to the existing shuffle property: the property
test would catch a regression statistically, but a named reversal case states the invariant directly
and fails identically on every run.

#### 1.4 Each field selects its own winner

`selectWinningRulesByField` (`rules.ts:221`) loops the three fields and runs `selectWinningRule`
independently for each. There is no global winner for a transaction — a transaction can
simultaneously be governed by a rank-3 tags rule, a rank-1 allocation rule, and a rank-0
description-alias rule.

| Property                                                             | Evidence                                                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fields are isolated; a field with no match is absent from the result | rules.test.ts › "selectWinningRulesByField isolates fields"                                                                                                                          |
| **Different fields win at different ranks simultaneously**           | rules.test.ts › "lets each field win at its own scope rank, independently" _(added by this audit)_                                                                                   |
| At most one plan per field reaches the store                         | `src/lib/domain/automation/apply.ts:75-113` `planRuleApplications`; `tests/integration/automation-field-rules.test.ts` › "applies only the single highest-precedence rule per field" |

This independence is why "combining compatible multi-field outputs" is future design work rather
than a description of today's engine: today each field resolves alone and writes through its own
boundary.

#### 1.5 Uniqueness

`ruleUniquenessKey` (`rules.ts:102`) is
`JSON.stringify([field, descriptionText, accountId ?? null, amount ?? null])`. Two rules collide iff
all four components are equal — so the same description text may carry one rule per field per scope,
and the four ranks are four distinct slots.

| Property                                                       | Evidence                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Identical field+text+scope collide                             | rules.test.ts › "collides only on identical field + text + scope"                                                  |
| Scope, text and field each distinguish                         | rules.test.ts › "distinguishes scope, text and field"                                                              |
| Duplicates detected and grouped                                | rules.test.ts › "detects duplicate keys and groups them"                                                           |
| Dedupe keeps most recent, order-independently                  | rules.test.ts › "dedupe keeps most recent per slot and is order-independent"                                       |
| Create rejects a colliding key                                 | field-rule-mutations.test.ts › "rejects a second rule that collides on the uniqueness key (same field/text/scope)" |
| A more specific scope is permitted alongside the unscoped rule | field-rule-mutations.test.ts › "permits a more specific scope alongside the unscoped rule"                         |
| Update rejects a scope change that would collide               | field-rule-mutations.test.ts › "rejects updating a scope so it collides with another active rule"                  |
| Soft-delete frees the slot                                     | field-rule-mutations.test.ts › "frees the uniqueness slot for a new rule after deletion"                           |

> **Not to be confused with MF-002.** Uniqueness and scope rank are _matching specificity_: which
> single rule governs a field for a given transaction. Grouped-rule edit ownership — which rule a
> combined editing surface writes back to when several fields are edited together, and how conflicts
> between them resolve — is a different question and belongs to MF-002. This audit does not settle
> it and does not edit MF-002's artifacts.

#### 1.6 Imported raw text vs manual alias name

The text a rule matches against is not simply "the description column". `descriptionTextForMatching`
(`src/lib/crdt/field-rules.ts:90`) branches on provenance:

| Row kind                                     | Projected match text                                                                   | Rationale                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Imported (`importId != null`)                | The **raw imported `description`**. Empty string projects to `null` (matches nothing). | Provenance is preserved; the raw description is never rewritten by rule application.                                                     |
| Manual (`importId == null`)                  | The **resolved (symlink-followed) name of the row's `descriptionAliasId`**.            | The manual grid stores typed text as an alias and leaves `description` empty, so keying on the raw field would match nothing. Q-P17D-01. |
| Manual with no alias, or a dangling alias id | `null` — matches nothing                                                               | `resolveAlias` returns nothing; the guard is explicit                                                                                    |

Critically, the imported branch is checked **first**, so an imported row that has been given a
display alias still matches on its raw imported text, not on what the user now sees.

| Property                                               | Evidence                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manual row matches a tag rule keyed on the alias name  | field-rule-mutations.test.ts › "applies a tag rule keyed on the alias name to a manual row"                                                                |
| Manual row matches an allocation rule via P16C         | field-rule-mutations.test.ts › "applies an allocation rule keyed on the alias name via the P16C boundary"                                                  |
| Manual row never receives a description-alias rule     | field-rule-mutations.test.ts › "never applies a description-alias rule to a manual row"                                                                    |
| Manual row with a different alias name matches nothing | field-rule-mutations.test.ts › "matches nothing on a manual row whose alias name differs from the rule"                                                    |
| Mixed set: manual row gets tags, not the alias rule    | field-rules-crdt.test.ts › "excludes manual transactions from description-alias rules but not tag rules"                                                   |
| **Renamed imported row still keys on raw text**        | field-rules-crdt.test.ts › "keys an imported row on its RAW description even after it is renamed by an alias" _(added by this audit)_                      |
| Raw `description` is never rewritten by the projection | asserted inside field-rule-mutations.test.ts › "applies a tag rule keyed on the alias name to a manual row" (`expect(manual?.description ?? "").toBe("")`) |

The renamed-imported-row case was the one genuine gap in this section: every existing test seeded
imported rows with `descriptionAliasId: undefined`, so the ordering of the two branches was
unpinned. The added test seeds an imported row _with_ a display alias, plus a decoy rule keyed on
the displayed name, and asserts the raw-keyed rule wins and the decoy matches nothing.

#### 1.7 Field eligibility

`fieldAppliesToManual` (`rules.ts:174`) is an exhaustive switch:

| Field              | Applies to manual rows | Frozen source                                                                                                              |
| ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `descriptionAlias` | **No**                 | `human-scratch.md:271` — manual rows "don't have description text (just a description alias)"                              |
| `tags`             | Yes                    | `human-scratch.md:294-295` — "Unlike description alias rules, these other rules do apply to manually created transactions" |
| `allocation`       | Yes                    | `human-scratch.md:294-295`                                                                                                 |

Eligibility is gated on `isManual`, which is derived purely from `importId == null`
(`field-rules.ts:112-122`) — _not_ from whether the row happens to carry an alias. The alias-name
projection in §1.6 changes what text a manual row matches on; it does not change eligibility.

| Property                                     | Evidence                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Per-field eligibility table                  | rules.test.ts › "fieldAppliesToManual(%s) = %s" (table-driven over all three fields)                     |
| Eligibility enforced inside the matcher      | rules.test.ts › "excludes manual rows from description-alias rules but not tag/allocation rules"         |
| Enforced end-to-end through CRDT application | field-rules-crdt.test.ts › "excludes manual transactions from description-alias rules but not tag rules" |

#### 1.8 Deleted rows, deleted rules, and undecodable rules

Three exclusion mechanisms sit in front of matching, each in a different place:

| Excluded input                | Mechanism                                                             | Source                                     | Evidence                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Soft-deleted rules            | `deletedAtEpochMs != null` skipped when reading                       | `field-rules.ts:61` `readActiveFieldRules` | field-rule-mutations.test.ts › "soft-deletes a rule so it no longer applies"                                          |
| Undecodable / malformed rules | `decodeFieldRule` failure skipped; one bad rule cannot break the rest | `field-rules.ts:61-77`                     | field-rules-crdt.test.ts › "excludes rules with an invalid complete allocation set (rejected at decode, no mutation)" |
| Invalid allocation sets       | Rejected, never clamped or normalized                                 | `rules.ts:316` `decodeFieldRule`           | rules.test.ts › "rejects an invalid allocation set without normalising"                                               |
| Deleted transactions          | `deletedAt == null` filter before application                         | `field-rules.ts:257`, `:268`, `:279`       | covered indirectly; see [Gaps](#gaps-and-follow-ups)                                                                  |
| CRDT container key            | `$cid` skipped when iterating                                         | `field-rules.ts:61`                        | —                                                                                                                     |

Note the asymmetry, which is deliberate and worth preserving: a malformed rule is dropped _silently_
at read time, while a malformed rule _submitted through a mutation_ is rejected loudly with a typed
error (`invalid-rule` / `invalid-allocations`). Read-time tolerance keeps a corrupted or
forward-versioned document usable; write-time strictness keeps corruption from being introduced.

---

### 2. Lifecycle, persistence, and production application

#### 2.1 Description-alias lifecycle

Every alias mutation lives in `src/lib/crdt/description-aliases.ts` and validates its whole input
before touching the Mirror draft. The module's own contract (file header) is that a caller invokes
**exactly one** function inside **one** `setState`, so forward references
(`transaction .descriptionAliasId`) and reverse references (`alias.transactionIds`,
`alias.symlinkIds`) commit and undo together. Normalization is `trim()` + Unicode `NFC`,
**case-sensitive** (`src/lib/domain/description-aliases.ts:4` `normalizeDescriptionAliasName`).

| Operation                    | Function (`description-aliases.ts`)                                                           | Observed behaviour                                                                                                                                                                     | Production caller                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Create                       | `createDescriptionAlias:322`                                                                  | Normalizes; rejects `empty-name`, `alias-id-conflict`, `duplicate-name`                                                                                                                | `DescriptionAliasesTable.tsx:38`                           |
| Assign                       | `assignDescriptionAlias:338`                                                                  | Resolves the target through `getFinalRealAlias` (one symlink hop) and points the row at the **final real** alias — never at the symlink                                                | `field-rules.ts:181` (rule application), `context.tsx:946` |
| Create-or-reuse by name      | `assignDescriptionAliasByExactName:392`                                                       | Exact-name lookup first (`findDescriptionAliasByExactName:374`, active + real only, ties broken by lowest id); creates only when absent                                                | `transactions/page.tsx:1130`                               |
| Manual insert                | `insertManualDescriptionAliasedTransaction:407`                                               | Inserts the row _and_ selects/creates its alias in one validated action                                                                                                                | `context.tsx:1091`                                         |
| Rename                       | `renameDescriptionAlias:457`                                                                  | Real aliases only (`alias-not-real`); rejects duplicate names. **Fans out to every row pointing at it**, because rows hold the id, not the text                                        | `page.tsx:1144`, `DescriptionAliasesTable.tsx:145`         |
| Change one                   | `changeOneDescriptionAlias:476`                                                               | CAS on `expectedAliasId` → `stale-alias`; moves **only this row's** pointer (and its nested duplicates)                                                                                | `page.tsx:1148`, `:1215`                                   |
| Change all                   | `changeAllDescriptionAliases:494`                                                             | Converts the source **real** alias into a **symlink** to the target and re-points every inbound symlink; existing rows are not rewritten, they resolve through the symlink             | `page.tsx:1247`                                            |
| Remove one                   | `removeOneDescriptionAlias:541`                                                               | CAS on `expectedAliasId`; clears the row pointer and the one reverse entry. The alias itself survives                                                                                  | `page.tsx:1158`, `:1213`                                   |
| Remove all                   | `removeAllDescriptionAliases:558`                                                             | Resolves to the final real alias, gathers inbound symlinks, clears the pointer on **every** transaction and nested duplicate, then soft-deletes target + symlinks with one `deletedAt` | `page.tsx:1244`, `DescriptionAliasesTable.tsx:146`         |
| Row delete / import rollback | `deleteDescriptionAliasedTransaction:674`, `deleteDescriptionAliasedTransactionsByImport:691` | Unlink the reverse reference as part of the delete, including nested duplicates                                                                                                        | `context.tsx:1024`, `:1046`                                |
| Generic field update         | `updateDescriptionAliasedTransaction:634`                                                     | Preflights alias-aware fields, then ordinary writes; **blocks** raw-`description` and direct pointer writes                                                                            | `context.tsx:996`                                          |

**Symlink resolution is one hop, deliberately.** `getFinalRealAlias:154` follows at most one link
and returns `alias-not-real` beyond that; `changeAllDescriptionAliases` maintains that invariant by
re-pointing inbound symlinks at the new target rather than chaining. Longer chains and cycles are
therefore a _repair_ concern, not a read concern.

**Maintenance rewrites exactly one class of reference.**
`rewriteDescriptionAliasMaintenanceReference` (`description-aliases.ts:236`, planned at
`maintenance.ts:497-519`, applied at `:1794`) advances a _still-current direct_ pointer from a
symlink to its real target, and only after re-proving that the transaction still points at that
symlink, that the symlink is active and one-hop, and that the target is active and real. Anything
else abandons. `hardDeleteProvenDescriptionAliasSymlink:263` then removes a symlink only against a
proof completed immediately beforehand; a new reference landing after planning defers the delete
(`maintenance.test.ts` › "defers hard deletion when a new direct reference lands after planning").
Hydration repair (`migration.ts:55` `repairDescriptionAliases`) flattens chains, breaks cycles and
tombstones paths that terminate in a deleted alias.

**Undo preserves alias work as one step.** `undo.tsx` tracks the alias ids each undo/redo frame
touches (`getChangedAliasIds:73`) and excludes migration/system origins, so a `change all` is one
user-visible undo and a remote peer's work is never undone locally.

| Property                                                                                  | Evidence                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assign follows a symlink to the final real alias and never rewrites raw text              | `tests/unit/crdt/description-alias-mutations.test.ts` › "assigns through a symlink to the final real alias and preserves raw text"                                                  |
| Change-all flattens inbound symlinks without moving direct pointers                       | description-alias-mutations.test.ts › "flattens inbound symlinks without moving direct transaction pointers"                                                                        |
| Change-one/remove-one CAS rejects a stale alias with no partial write                     | description-alias-mutations.test.ts › "returns a typed stale error without partial writes"                                                                                          |
| Trim + NFC, case-sensitive exact matching                                                 | description-alias-mutations.test.ts › "uses deterministic trim + NFC, case-sensitive exact matching"                                                                                |
| NFC-equivalent create/rename duplicates rejected without partial writes                   | description-alias-mutations.test.ts › "rejects NFC-equivalent create and rename duplicates without partial writes"                                                                  |
| Raw description and pointer writes blocked through the generic updater                    | description-alias-mutations.test.ts › "blocks raw-description and pointer writes through the generic updater"                                                                       |
| Delete and import rollback unlink top-level and nested references                         | description-alias-mutations.test.ts › "unlinks top-level and imported transactions when deleting" / "preserves nested-duplicate alias provenance and unlinks it on import deletion" |
| Forward/reverse reference conservation under randomized reassignment and removal          | description-alias-mutations.test.ts › "conserves forward and reverse references across randomized reassignment/removal"                                                             |
| Repair is idempotent over partial maps, chains, cycles, stale references, deleted targets | `tests/integration/description-alias-crdt.test.ts` › "repairs partial maps, chains, cycles, stale references, and deleted targets idempotently"                                     |
| Change-all is one real Mirror/Loro undo step, excluding migration                         | description-alias-crdt.test.ts › "commits change-all as one real Mirror/Loro undo step and excludes migration"                                                                      |
| Opposing peer change-alls converge and preserve a recovery name                           | description-alias-crdt.test.ts › "converges after opposing peer change-all operations and preserves a recovery name"                                                                |
| Production actions give every operation one undo/redo step                                | `tests/integration/description-alias-actions.test.ts` › "returns typed results without replacement recipes and gives every operation one undo/redo step"                            |
| Maintenance rewrites one-hop references before a proven hard delete                       | `tests/unit/crdt/maintenance.test.ts` › "rewrites parent and nested one-hop references before a proven hard delete"                                                                 |
| Hydration repair reaches the real encrypted queue and reopens convergently                | `tests/integration/vault-provider-alias-repair.test.ts` › "awaits the real encrypted local queue before initial push and convergent reopen"                                         |

> **Alias lifecycle is not rule ownership.** Deleting a rule never deletes an alias, and removing an
> alias never deletes a rule: they are separate records with separate mutation surfaces. Nothing in
> either path may be repurposed as cleanup for the other.

#### 2.2 Remembered preferences

The chain is: pure domain shaping → CRDT record → React hooks → three editor surfaces.

| Layer         | Symbol                                                                                              | Behaviour                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain (pure) | `readRememberedChoice` / `nextUserPreference` (`preferences.ts:50`, `:64`)                          | Total projection with per-slot defaults; no vault access                                                                                                        |
| Defaults      | `DEFAULT_REMEMBERED_CHOICE` (`preferences.ts:43`)                                                   | field `tags`, tagMode `add`, `useAccountScope: false`, `useAmountScope: false`, applyMode `updateNew` (`apply-mode.ts:32` — the conservative explicit-new mode) |
| CRDT write    | `persistUserAutomationPreference` (`field-rule-mutations.ts:310`)                                   | Writes `state.userAutomationPreferences[pubkeyHash]`, per-user, never shared financial state                                                                    |
| CRDT read     | `readUserAutomationChoice` (`field-rule-mutations.ts:329`)                                          | Absent record ⇒ `readRememberedChoice(undefined)` ⇒ full defaults                                                                                               |
| Hooks         | `useUserAutomationChoice` / `usePersistAutomationPreference` (`context.tsx:1241`, `:1246`)          | The read hook maps a `null` pubkeyHash to `""`, which is never a stored key, so **absent identity reads defaults**                                              |
| Consumers     | `FieldRulesManager.tsx:96`, `use-transaction-rule-workflow.ts:113`, `use-field-rule-proposal.ts:92` | All three seed their draft from `remembered`                                                                                                                    |

**Which events persist and which discard.** Persistence is deliberately tied to a _successful
write_, not to touching a control:

| Event                                                  | Persists?                                              | Source                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Manager save (create or update) succeeded              | **Yes** — `rememberChoice(draft)` after `result.ok`    | `FieldRulesManager.tsx:172`                                                               |
| Robot popup save succeeded                             | **Yes** — `rememberChoice(draft)` after `result.ok`    | `use-transaction-rule-workflow.ts` `save`                                                 |
| Inline proposal apply succeeded                        | **Yes**, guarded by `pubkeyHash != null`               | `use-field-rule-proposal.ts` `apply`                                                      |
| Validation rejected the draft                          | **No** — early return before `rememberChoice`          | all three                                                                                 |
| Mutation rejected (uniqueness/allocation)              | **No** — early return                                  | all three                                                                                 |
| Editor closed/cancelled; select changed without saving | **No** — nothing on the close path writes              | `closeEditor`, `resetDraft`                                                               |
| No identity (`pubkeyHash == null`)                     | **No** — write is skipped, reads still return defaults | `use-field-rule-proposal.ts`, `use-transaction-rule-workflow.ts`, `FieldRulesManager.tsx` |

`lastApplyMode` is an **optional** slot: an older vault without it decodes to `DEFAULT_APPLY_MODE`
with no migration (`preferences.ts:33` comment; `field-rules-crdt.test.ts` › "accepts a preference
record without the optional apply-mode slot").

| Property                                                       | Evidence                                                                                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Defaults when no record exists                                 | `tests/unit/domain/automation/preferences.test.ts` › "returns defaults when no record exists"                                |
| Per-slot defaulting                                            | preferences.test.ts › "fills missing fields with defaults"                                                                   |
| Apply mode defaults when absent, honoured when stored          | preferences.test.ts › "defaults the apply mode when absent but honours a stored one"                                         |
| Round-trip through the two pure helpers                        | preferences.test.ts › "round-trips a choice through nextUserPreference/readRememberedChoice"                                 |
| Persist and read back through the real CRDT                    | `tests/integration/field-rule-mutations.test.ts` › "persists and reads back a user's remembered choice"                      |
| Unknown user reads defaults through the real CRDT              | field-rule-mutations.test.ts › "returns defaults for an unknown user"                                                        |
| Record survives the CRDT round-trip incl. the apply-mode slot  | `tests/integration/field-rules-crdt.test.ts` › "persists per-user automation preferences"                                    |
| Optional apply-mode slot needs no migration                    | field-rules-crdt.test.ts › "accepts a preference record without the optional apply-mode slot"                                |
| Remembered mode restored in a freshly opened production editor | `tests/e2e/field-rule-parity.spec.ts` › "the four-mode apply select is remembered and restored on reopen"                    |
| **Per-user isolation**                                         | field-rule-mutations.test.ts › "keeps one user's remembered choice from leaking into another user's" _(added by this audit)_ |

#### 2.3 Application paths and mutation atomicity

```
rule editor / robot popup / inline proposal
        │  create|update|delete  (field-rule-mutations.ts, validated via decodeFieldRule)
        ▼
  state.fieldRules[id]                        ← the ONLY rule record
        │  readActiveFieldRules  (skips $cid, soft-deleted, undecodable)
        ▼
  subjectForTransaction ─► selectWinningRulesByField ─► planRuleApplications
        │                                                      │
        │                          ┌───────────────────────────┴──────────────┐
        │                          ▼                                          ▼
        │                 applyRulePlans (tags; allocation via P16C)   assignDescriptionAlias (P11)
        ▼
  four entry points:  applyFieldRulesToTransaction (one row, via applyFieldRulesToSingleTransaction)
                      applyFieldRulesToImport      (commitImportBatch, last step)
                      applyFieldRulesToAllTransactions
                      applyFieldRulesToNewerTransactions (strict `>`)
        │
        ▼  loro-mirror draft committed by one setState → SyncManager
  encrypted op → IndexedDB → throttled server push
```

**Atomicity is JavaScript-draft atomicity, not database atomicity.** Each hook runs its updater
inside one `runInternalVaultAction` (`context.tsx:605`), which is one synchronous Mirror `setState`
and therefore one undo group. There are no SQL transactions, no locks, no pool limits, and no
server-side rule evaluation: `src/lib/sync/manager.ts` only encrypts the resulting op, appends it to
a crash-safe IndexedDB queue, and throttles a push. Persistence is **asynchronous and after the
fact** — the draft mutation is already visible locally before the encrypted op reaches storage
(`manager.ts:294-308`, `:367` "wait until every local update observed so far is encrypted and
queued").

**Partial and rejected outcomes are reported, not thrown.** Each field yields its own
`AppliedFieldRuleOutcome`: tags `applied`, allocation `applied` (with `previousAllocations`) or
`rejected` (with an `AllocationBoundaryError`), alias `applied` or `alias-error`. An invalid
complete allocation set is rejected with **zero mutation** at the P16C boundary, so one field
failing does not roll back another field that already succeeded within the same draft — the outcome
list is the honest record of what happened.

| Property                                                                                  | Evidence                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-transaction apply routes through P11 and touches nothing else                      | `tests/integration/apply-field-rule-to-transaction.test.ts` › "applies the winning description-alias rule to just that transaction via the P11 boundary" / "does not touch other transactions" |
| Single-transaction allocation goes through P16C; invalid set rejected with zero mutation  | apply-field-rule-to-transaction.test.ts › "routes allocation writes through P16C for the single transaction" / "rejects an invalid complete allocation set with zero mutation"                 |
| Unknown transaction returns a typed `transaction-not-found`                               | apply-field-rule-to-transaction.test.ts › "returns transaction-not-found for an unknown transaction id"                                                                                        |
| Import commit applies the highest-precedence rule to every imported row                   | `tests/integration/import-commit-field-rules.test.ts` › "applies the highest-precedence tag rule to every imported transaction"                                                                |
| Import sets aliases through the P11 back-map                                              | import-commit-field-rules.test.ts › "sets a description alias through the P11 back-map on import"                                                                                              |
| Import allocation replacement is P16C complete-set; invalid rejected with zero mutation   | import-commit-field-rules.test.ts › "replaces allocations exclusively through the P16C complete set on import" / "rejects an invalid complete allocation set with zero mutation"               |
| Re-running import rule application converges (idempotent)                                 | import-commit-field-rules.test.ts › "re-running rule application over the same import converges (idempotent)"                                                                                  |
| An import-scoped commit does not reach a pre-existing manual row                          | import-commit-field-rules.test.ts › "does not apply an import-scoped commit to a pre-existing manual transaction"                                                                              |
| Tag `add` unions preserving order; `set` replaces                                         | `tests/unit/domain/automation/rules.test.ts` › "add unions preserving order and de-duplicating" / "set replaces existing tags"                                                                 |
| Tag application through a real store is idempotent                                        | `tests/integration/automation-field-rules.test.ts` › "applies a tags rule via updateTransaction and is idempotent"                                                                             |
| Allocation replacement removes absent keys (complete set)                                 | automation-field-rules.test.ts › "routes allocation writes through P16C: complete-set replacement removes absent keys"                                                                         |
| Bulk apply across independent targets                                                     | automation-field-rules.test.ts › "bulk-applies across independent targets"                                                                                                                     |
| Apply-all vs apply-new scoping through the CRDT                                           | `tests/integration/field-rules-crdt.test.ts` › "applies to all transactions and, separately, only to strictly newer ones"                                                                      |
| Apply-new excludes the reference date and earlier                                         | `tests/integration/field-rule-mutations.test.ts` › "applies to strictly-later transactions but not the reference date or earlier"                                                              |
| Soft-deleted rule stops applying; its uniqueness slot frees                               | field-rule-mutations.test.ts › "soft-deletes a rule so it no longer applies" / "frees the uniqueness slot for a new rule after deletion"                                                       |
| Legacy automations migrate to field rules exactly once and never resurrect a deleted rule | field-rules-crdt.test.ts › "derives a field rule from a convertible legacy automation exactly once" / "runs automatically at hydration and does not resurrect a user-deleted rule"             |
| Newly created rule applies through the production apply-all path                          | field-rule-mutations.test.ts › "applies a created tags rule to a matching imported transaction"                                                                                                |
| Production apply-all / apply-new report impact through the real UI                        | `tests/e2e/automations.spec.ts` › "apply-all and apply-new report impact and route through the engine"                                                                                         |
| **Soft-deleted transactions excluded by all three bulk entry points**                     | field-rules-crdt.test.ts › "never applies rules to a soft-deleted transaction through any bulk entry point" _(added by this audit — closes G1)_                                                |

---

### 3. Row-blur baseline and approval boundaries

#### 3.1 The participant chain

```
transactions/page.tsx
  pendingRuleEdit: { transactionId, field } | null        (:712)  — exactly ONE at a time
  notePendingRuleEdit / clearPendingRuleEdit
        │  renderRuleProposal(:824) passes isPending, never branches element type
        ▼
TransactionRuleProposal (always mounted per rule-backed cell)
  shouldShow = isPending && !isEditing                    — decides PAINTING
  {isPending ? <PendingRuleProposal/> : null}             — decides WATCHING
        │
        ▼
PendingRuleProposal
  useFieldRuleProposal → proposal/draft/apply
  confirm()  → appliedRef guard → apply() → onDismiss()
  focusin + focusout listeners + one mount-time evaluation
        │  window.setTimeout(…, 0)  → shouldAutoApplyRef → isRowFocusLost()
        ▼
use-field-rule-proposal.apply()
  validateRuleDraft → create|update (P17B) → applyAll | applyNewerThan → persistPreference
```

`isFocusStillInRow` (`field-rule-proposal-state.ts`) is the predicate: focus is still "in" the row
if `row.contains(activeElement)`, **or** the active element sits inside a portal whose
`data-owned-by-row` equals this row's `data-transaction-id`. `TransactionRow.tsx:387-388` stamps the
row; `TransactionRuleProposal.tsx:233`, `FieldRuleProposal.tsx:116`/`:198` and
`InlineEditableTags.tsx:340` stamp the row-owned portals.

#### 3.2 Observed behaviour

| Aspect                              | Observed at `3bc789c`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic vs explicit               | `applyModeIsAutomatic` (`apply-mode.ts:57`): `updatingAll`/`updatingNew` apply on row focus loss; `updateAll`/`updateNew` wait for the tick                                                                                                                                                                                                                                                                                                                                           |
| Explicit confirm in automatic modes | The tick is still wired in automatic modes (`onConfirm={confirm}` unconditionally). `appliedRef` makes the first of tick-or-blur the only write                                                                                                                                                                                                                                                                                                                                       |
| Scope, both modes                   | `applyModeTargetsNewOnly` ⇒ `applyNewerThan(referenceDate)` (this row's date) else `applyAll()`                                                                                                                                                                                                                                                                                                                                                                                       |
| Deferred evaluation                 | Both listeners and the mount-time call schedule `setTimeout(…, 0)`; at `focusout` dispatch `document.activeElement` is already `<body>`, so an immediate read would false-positive on every intra-row move                                                                                                                                                                                                                                                                            |
| Live read, not remembered           | The deferred callback re-reads `shouldAutoApplyRef.current` and calls `isRowFocusLost()` at that instant; no flag records a past observation                                                                                                                                                                                                                                                                                                                                          |
| Listener/timer cleanup              | The effect removes both listeners on unmount/re-registration. **The pending `setTimeout` is not cleared** — it survives unmount and runs once. MEASURED: after unmount `anchorRef.current` is `null`, so `isRowFocusLost()` reports "left" (a missing row element counts as left) and the orphaned task _does_ call `apply` once; `appliedRef` caps it there. If the row still held focus at unmount, nothing is written. Recorded as observed behaviour, not endorsed as a guarantee |
| Cancellation on unmount             | `PendingRuleProposal` unmounts when `isPending` flips false (apply or dismiss), which removes the listeners                                                                                                                                                                                                                                                                                                                                                                           |
| Row-owned portal identity           | This row's popover/select/tag-picker count as "still in the row"; another row's do not                                                                                                                                                                                                                                                                                                                                                                                                |
| Commit-before-focus-loss (Enter)    | The alias input calls `blur()` on Enter, so commit and blur are one event; the mount-time evaluation catches it                                                                                                                                                                                                                                                                                                                                                                       |
| Focus-loss-before-proposal-mount    | `PendingRuleProposal` mounts on `isPending` (not on `shouldShow`), so it is watching from the moment the edit begins; the mount-time evaluation covers a blur that preceded it                                                                                                                                                                                                                                                                                                        |
| Element-type stability              | One element type at the cell position in both states, so flipping `pendingRuleEdit` never remounts the edited cell                                                                                                                                                                                                                                                                                                                                                                    |

| Property                                                                                           | Evidence                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic mode applies once on genuine row exit (edit began focused in-row)                        | `tests/unit/components/rule-proposal-auto-apply.test.tsx` › "applies when the edit began with focus in the row and the user then clicks away"                                                                                           |
| Applies when the edit has closed and focus is genuinely outside                                    | rule-proposal-auto-apply.test.tsx › "DOES apply once the edit has closed and focus is genuinely outside the row"                                                                                                                        |
| Does not apply while the edit is still in progress                                                 | rule-proposal-auto-apply.test.tsx › "does not apply while the edit is still in progress, even with focus outside"                                                                                                                       |
| Focus that left and returned does not apply (live read, not a remembered observation)              | rule-proposal-auto-apply.test.tsx › "does NOT apply when focus left during the edit but has returned by the time it closes"                                                                                                             |
| Exactly one write however often listeners re-register                                              | rule-proposal-auto-apply.test.tsx › "writes exactly once no matter how often the listeners re-register"                                                                                                                                 |
| Blur to body / null activeElement counts as left                                                   | `tests/unit/components/rule-proposal-stability.test.tsx` › "treats a blur to body as having LEFT the row" / "treats a null activeElement as having left the row"                                                                        |
| Intra-row focus counts as still in the row                                                         | rule-proposal-stability.test.tsx › "counts focus inside the row as still in the row"                                                                                                                                                    |
| Same-row portal counts as inside; other-row portal does not                                        | rule-proposal-stability.test.tsx › "counts THIS row's portaled surface as still in the row" / "does NOT count another row's portaled surface as still in the row"                                                                       |
| A past observation is not the present state                                                        | rule-proposal-stability.test.tsx › "distinguishes a past observation from the present state" / "focus returning to the row makes the live read say 'still here' again"                                                                  |
| Cell is not remounted when a proposal opens                                                        | rule-proposal-stability.test.tsx › "keeps the cell mounted and the SAME DOM node when a proposal opens" / "preserves in-progress edit state across the flip"                                                                            |
| **Production wiring**: Updating mode writes nothing until focus leaves the row                     | `tests/e2e/rule-creation-controls.spec.ts` › "choosing Updating all writes nothing until focus leaves the row, then writes on blur"                                                                                                     |
| Production: Enter-committed alias reaches the automatic mode                                       | rule-creation-controls.spec.ts › "a description alias committed with Enter applies an Updating rule"                                                                                                                                    |
| Production: clicking non-focusable page chrome reaches the automatic mode                          | rule-creation-controls.spec.ts › "a tag change applies when the user clicks non-focusable page chrome"                                                                                                                                  |
| Production: the proposal does not disturb the edit that summoned it                                | rule-creation-controls.spec.ts › "the tag dropdown stays open after selecting a tag while a proposal appears"                                                                                                                           |
| Production: proposal waits for the picker and its controls are clickable                           | rule-creation-controls.spec.ts › "the proposal waits for the tag picker to close, then its controls are clickable"                                                                                                                      |
| Production: an already-matching row offers an update, not a duplicate                              | rule-creation-controls.spec.ts › "changing a tag on a row that already matches offers an update, not a duplicate"                                                                                                                       |
| Manual rows offer tag rules but never a description-alias rule                                     | rule-creation-controls.spec.ts › "a manual row offers a tag rule but never a description-alias rule"; `tests/e2e/field-rule-parity.spec.ts` › "tag and allocation rules apply to a manual aliased row while description rules never do" |
| **Focus into a different row** applies once, through the mounted component                         | rule-proposal-auto-apply.test.tsx › "applies when focus moves into a different row" _(added by this audit — closes G4)_                                                                                                                 |
| **Focus into another row's portaled surface** applies once                                         | rule-proposal-auto-apply.test.tsx › "applies when focus moves into ANOTHER row's portaled surface" _(added by this audit — closes G4)_                                                                                                  |
| **Unmount before the deferred evaluation**: the orphaned timer applies exactly once and never more | rule-proposal-auto-apply.test.tsx › "still runs the pending evaluation once, and never more than once" _(added by this audit — closes G3)_                                                                                              |
| **Unmount while the row still holds focus** writes nothing                                         | rule-proposal-auto-apply.test.tsx › "writes nothing when the row still holds focus at unmount" _(added by this audit — closes G3)_                                                                                                      |

**Still not covered** (recorded, not broadened): closing or cancelling an editor without saving is
established by reading the close paths, not by an assertion (G5). Tab-off-the-document and
browser-window blur are covered only by the same `<body>`-activeElement path as "blur to body"; they
are not separately exercised.

#### 3.3 Three-way matrix

| #   | Item                                                   | Confirmed user requirement         | Observed behaviour to preserve                                                                     | Decision requiring mockup approval                                        |
| --- | ------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| M1  | No transaction-to-rule link                            | `human-scratch.md:275`             | Recomputed per read; no rule id on any transaction (§1.1)                                          | — (a hard constraint on every later design, not a decision)               |
| M2  | Four-rank precedence                                   | `human-scratch.md:270-274`         | ranks 0–3, per-field winners (§1.3–1.4)                                                            | —                                                                         |
| M3  | Exact case/whitespace-sensitive text match             | `human-scratch.md:270-274`         | strict `!==` (§1.2)                                                                                | —                                                                         |
| M4  | Manual-row eligibility                                 | `human-scratch.md:271`, `:294-295` | alias rules excluded; tags/allocation eligible (§1.7)                                              | —                                                                         |
| M5  | Alias lifecycle                                        | `human-scratch.md` alias clauses   | create/reuse, rename fan-out, change-one isolation, change-all symlink, remove-one/all (§2.1)      | —                                                                         |
| M6  | Remembered choices                                     | `human-scratch.md:270`             | per-`pubkeyHash`, defaults tags/add/unscoped/`updateNew`, persisted only on successful save (§2.2) | Whether a grouped editor remembers one choice or one per field            |
| M7  | Automatic apply on row focus loss                      | `human-scratch.md:263-266`, UR-009 | live focus read + deferred evaluation, one write per gesture (§3.2)                                | Whether grouped multi-field rules confirm once or per field               |
| M8  | "Update new" date boundary                             | `human-scratch.md:266-268`         | strict `>`                                                                                         | **Handed to MF-003** — requested `>=` is not implemented here             |
| M9  | Combining compatible multi-field outputs into one rule | mission brief                      | **Not implemented**: each field is a separate rule record with its own uniqueness slot             | **Pending** — MF-002 owns ownership/conflicts; this audit settles nothing |
| M10 | Grouped-rule edit ownership / conflicts                | mission brief                      | n/a                                                                                                | **Pending — MF-002**                                                      |
| M11 | Proposed scope + automatic-application semantics       | mission brief                      | current: proposal scope from the draft's apply mode                                                | **Pending — MF-003**                                                      |

Explicitly:

- **Combining compatible multi-field outputs is future design work.** Today's engine resolves each
  field independently (§1.4) and stores each as its own rule; nothing in the current code merges
  them.
- **No unrelated rules may silently merge.** Uniqueness slots are per
  `(field, text, account, amount)`; combining outputs must not collapse two rules that differ in
  scope.
- **No transaction-to-rule links may be introduced.** §1.1 is a constraint on every later design.
- **Approval is pending.** Completing this audit does not approve anything. Table nullable numeric
  editing, keyboard/range selection, and inspector scrolling are outside this feature;
  automation-only mockups and their implementation belong to later mission work.

---

### Evidence added by this audit

Eleven characterization tests, all pinning behaviour that already exists at `3bc789c`. No product
source was modified.

| Test                                                                               | File                                                      | Gap it closes                                                                                         |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Zero-amount rows in "ranks account=$accountId amount=$amount as $rank"             | `tests/unit/domain/automation/rules.test.ts`              | `0` as a present scope constraint at ranks 1 and 3                                                    |
| "treats a zero amount as an exact constraint, not an absent one"                   | `tests/unit/domain/automation/rules.test.ts`              | `0` narrows to exactly zero in the matcher rather than degrading to "any"                             |
| "gives the same winner when the four competing ranks arrive reversed"              | `tests/unit/domain/automation/rules.test.ts`              | Deterministic reversed-order companion to the shuffle property                                        |
| "lets each field win at its own scope rank, independently"                         | `tests/unit/domain/automation/rules.test.ts`              | Three fields winning at ranks 3 / 1 / 0 simultaneously                                                |
| "keys an imported row on its RAW description even after it is renamed by an alias" | `tests/integration/field-rules-crdt.test.ts`              | Imported branch precedence over the alias-name projection                                             |
| "never applies rules to a soft-deleted transaction through any bulk entry point"   | `tests/integration/field-rules-crdt.test.ts`              | Deleted-row exclusion across import / newer / all (closes G1)                                         |
| "keeps one user's remembered choice from leaking into another user's"              | `tests/integration/field-rule-mutations.test.ts`          | Per-`pubkeyHash` isolation, and a third identity still reading pure defaults                          |
| "applies when focus moves into a different row"                                    | `tests/unit/components/rule-proposal-auto-apply.test.tsx` | Focus to another row, end-to-end through the mounted component rather than the predicate alone (G4)   |
| "applies when focus moves into ANOTHER row's portaled surface"                     | `tests/unit/components/rule-proposal-auto-apply.test.tsx` | The `data-owned-by-row` stamp discriminating another row's portal, through the mounted component (G4) |
| "still runs the pending evaluation once, and never more than once"                 | `tests/unit/components/rule-proposal-auto-apply.test.tsx` | Unmount before the deferred evaluation: the uncleared timer's measured effect (G3)                    |
| "writes nothing when the row still holds focus at unmount"                         | `tests/unit/components/rule-proposal-auto-apply.test.tsx` | The complementary unmount ordering — no orphaned write when focus never left (G3)                     |

---

### Gaps and follow-ups

Recorded honestly rather than asserted as covered. None is fixed here; none changes product
semantics.

| #   | Gap                                                                                                                                                                                                           | Status                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Deleted-transaction exclusion (`deletedAt == null`) in the three bulk-application entry points was not directly asserted                                                                                      | **Closed by this audit** — field-rules-crdt.test.ts › "never applies rules to a soft-deleted transaction through any bulk entry point"                                                                                                                                                                                                                                                                                        |
| G2  | Legacy `automationApplications` schema record is dead but still declared; removing it is a migration                                                                                                          | Open — out of scope here; noted for MF-003                                                                                                                                                                                                                                                                                                                                                                                    |
| G3  | Unmount _before_ the deferred `setTimeout(…, 0)` evaluation fires was not asserted. The pending timer is not cleared on unmount                                                                               | **Closed by this audit** — rule-proposal-auto-apply.test.tsx › "still runs the pending evaluation once, and never more than once" / "writes nothing when the row still holds focus at unmount". MEASURED: the orphaned task runs, `anchorRef.current` is `null` so a missing row counts as "left", and `appliedRef` caps it at one write. Recorded as observed behaviour, not endorsed as a guarantee; no product change made |
| G4  | "Focus moves to another row" was asserted at the predicate level (rule-proposal-stability.test.tsx) but never end-to-end through the mounted proposal component                                               | **Closed by this audit** — rule-proposal-auto-apply.test.tsx › "applies when focus moves into a different row" / "applies when focus moves into ANOTHER row's portaled surface"                                                                                                                                                                                                                                               |
| G5  | No automated assertion that closing/cancelling an editor discards the draft choice without persisting. Established by reading the three consumers' close paths (§2.2), which contain no `rememberChoice` call | Open — a negative-space characterization opportunity                                                                                                                                                                                                                                                                                                                                                                          |

---

### Handoffs

| To         | Item                                                                                                                                                       | Note                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **MF-003** | `isNewerTransactionDate` is strict `>` (`rules.ts:242`, consumed by `applyFieldRulesToNewerTransactions`) while the requested contract is on-or-after `>=` | Recorded as a discrepancy, not implemented. MF-003 owns the decision and the change. This audit preserves `>` as the observed baseline. |
| **MF-003** | Dead legacy `automationApplications` record (G2)                                                                                                           | Same nuance MF-003's prompt already flags                                                                                               |
| **MF-002** | Grouped-rule edit ownership and cross-field conflict resolution                                                                                            | Distinct from matching specificity (§1.5). Not settled here; MF-002's artifacts untouched.                                              |

---

### Verification

Every command below was run in this worktree on branch `fusion/mf-001`. Exit codes are real runs,
not inspection.

| Command                                                                                                                                         | Exit | Note                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run` over the five impacted unit/integration paths                                                                            | 0    | rules / preferences / apply-mode, field-rules-crdt, field-rule-mutations, rule-proposal-\*    |
| `pnpm typecheck`                                                                                                                                | 0    | —                                                                                             |
| `pnpm lint`                                                                                                                                     | 0    | 1 pre-existing warning in `TransactionVirtualRows.tsx`, 0 errors; untouched by this audit     |
| `pnpm format:check`                                                                                                                             | 0    | after `pnpm format` reformatted this report and `field-rules-crdt.test.ts` (commit `b9c4628`) |
| `pnpm test`                                                                                                                                     | 0\*  | see the realtime flake note below                                                             |
| `pnpm exec playwright test transaction-rules field-rule-parity rule-creation-controls automations --retries=0 --reporter=line --max-failures=1` | 0    | **22 passed** in 38.4s                                                                        |
| Full portable E2E sweep (17 specs with no hardcoded `:3000`)                                                                                    | 0    | **124 passed** in 2.5m                                                                        |
| `pnpm build`                                                                                                                                    | 0    | all 17 routes compiled                                                                        |

#### E2E port note

`playwright.config.ts` pins `http://localhost:3000` with `reuseExistingServer: false`, and `:3000`
is held by a user-owned `next dev --turbopack` running from the **main** checkout
(`/home/ben-agents/Code/moneyflow`, PID 2413658, parented by an interactive shell). That server was
not killed. Verification instead used a throwaway `playwright.mf001.config.ts` that inherits the
base config and moves both `baseURL` and `webServer` to `:3101`.

This is sound only for specs that do not hardcode the port: 8 of the 25 E2E specs construct their
own `browser.newContext({ baseURL: "http://localhost:3000" })` and would silently cross back to the
user's server. Those 8 were excluded; the remaining 17 — including all four automation specs this
task depends on — ran green. The throwaway config is not committed.

**Coverage gap, stated plainly:** the 8 port-hardcoded specs (`invite-redemption`,
`realtime-recovery`, `realtime-security`, `presence`, `undo-redo`, `tab-duplication`,
`transactions`, `vault-settings`) were not run. None touches automation matching, alias lifecycle,
preferences, or the rule proposal; this audit changed no product source, so they were not at risk.
They remain unverified in this session regardless.

#### Unit-suite flake, classified as pre-existing

`realtime-origin-controls › "reads only its own vault's ops even when the request claims a hostile origin"`
fails under full-suite concurrency and passes in isolation. Confirmed **not caused by this task**:
re-running the full suite with all five MF-001-changed test files excluded reproduces the identical
failure. `vault-maintenance.test.tsx` flaked the same way once and passes alone. A separate
`ENOENT '.env.local'` failure in two realtime specs was an artifact of the fresh worktree lacking
that gitignored file; after copying it from the repo root both passed (exit 0).
