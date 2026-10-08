# Grouped-rule ownership and conflicts — behaviour contract

**Tasks:** originally authored by MF-002; restored, reconciled and carried to approval by MF-007
(mission "Refine transaction editing and simplify automation rules", milestone "Automation design
and approval", slice "Establish the interaction and rule contract").

**Semantic revision:** `OWN-2026-09-07-r2`. See §7.0 for what that identifier covers, how it is
computed, and why status metadata is deliberately outside it.

**Status:** see §7.0. Every proposal in this document is a RESOLUTION — concrete and reviewable —
but a resolution is only approved semantics once §7.1 carries the approver, the evidence reference
and this exact semantic revision. Nothing here authorises implementation.

**Provenance.** §1–§6 and §8 were authored under MF-002 and committed at `1075230`. MF-007 restored
that file verbatim onto `3bc789c` (merge of `faster-grid`, the current planning HEAD) and then
edited it: §4.2 gains the invalid-record deletion exception, §7.0 is new, §7.1 replaces every
PENDING row with a concrete resolution and an approval binding, and §9 reports MF-007's own gate
runs. MF-002's historical §9 results are preserved in §9.0 as history, **not** as newly executed
results. `git show 1075230:specs/automation-rule-ownership.md` is the unmodified original.

**Scope of this document.** It specifies how a transaction-cell edit chooses which rule to extend
when the product later combines compatible automation outputs into multi-field rules, and what must
happen when that choice collides with an existing owner. It is a contract and an evidence record. It
implements nothing: no grouping, no schema change, no production UI, no table refinement. The
narrowly scoped approval prototype (§7.4) demonstrates the decisions; it ships nothing.

**Adjacent contracts.** MF-001/MF-005 own the broader matching audit
(`specs/016-automation-interaction-contract/matching-audit.md`); MF-003 owns scope and
automatic-application timing (`.../scope-and-automatic-application.md`). Neither file exists in this
worktree at the audited revision — re-verified by MF-007 at `3bc789c` — so this document cites
production sources directly rather than their conclusions, and does not write to their paths.

---

## 1. Glossary

These terms are used with exactly these meanings throughout. Several are new; they exist because the
mission's phrase "the rule that applies" is ambiguous between three different things that the
shipped code keeps strictly apart.

| Term                         | Definition                                                                                                                                                                                                                                                                               | Source                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Field rule**               | One stored rule. It keys on an EXACT description text, optionally narrowed by account and/or amount, and carries exactly ONE discriminated action for exactly ONE field (`descriptionAlias`, `tags`, or `allocation`).                                                                   | `src/lib/domain/automation/rules.ts` — `FieldRule`, `RuleAction` |
| **Match candidate**          | Any active rule whose description text equals the subject's, whose account/amount constraints are satisfied, and whose field is eligible for the subject. Candidacy is per rule, not per field.                                                                                          | `ruleMatchesSubject`                                             |
| **Match scope**              | A rule's `(accountId?, amount?)` pair, ranked 0 unscoped < 1 amount < 2 account < 3 account+amount.                                                                                                                                                                                      | `ruleScopeRank`                                                  |
| **Per-field winner**         | For ONE subject and ONE field, the single highest-ranked match candidate; ties (only reachable through a uniqueness violation) break on later `createdAt`, then lexically greater id. Order-independent.                                                                                 | `selectWinningRule`                                              |
| **Derived owner**            | Synonym for per-field winner, used when talking about a transaction: the rule that currently drives that field of that row. It is DERIVED on every read. It is never stored on the transaction.                                                                                          | `selectWinningRulesByField`, `planRuleApplications`              |
| **Grouped extension target** | The rule a user's field edit would be folded INTO under a future multi-field design. Today this concept does not exist: an edit either updates the edited field's per-field winner or creates a new single-field rule.                                                                   | `computeFieldRuleProposal`                                       |
| **Drift**                    | A match candidate wins a field, but the row's current value differs from what the rule implies. Surfaced as the red robot.                                                                                                                                                               | `computeFieldRuleRobotState` → `kind: "drift"`                   |
| **Compatibility**            | Whether two outputs could legitimately live on ONE rule. For tags it is a question about `(mode, tagIds)` — `add` and `set` are different operations even when one row's resulting set looks the same. For allocation it is the whole validated set, never a single person's percentage. | `resolveTagRuleResult`, `validateAllocationSet`                  |
| **Conflict**                 | Two candidate hosts for one edit disagree, or the preferred host is already owned for the edited field by a different rule, or the fold would change a rule's match population.                                                                                                          | This document, §5                                                |
| **Uniqueness slot**          | `(field, descriptionText, accountId, amount)`. At most one ACTIVE rule per slot. Soft deletion frees the slot.                                                                                                                                                                           | `ruleUniquenessKey`, `findUniquenessCollision`                   |

**Owners are not links.** No transaction stores a rule id, and no rule stores a transaction id. The
frozen source is explicit: "There is no explicit link between the rule and the transaction… for each
transaction, we calculate the highest precedence rule that matches" (`specs/human-scratch.md`,
automations clause). Rule ids DO appear transiently in `AppliedFieldRuleOutcome` / `FieldRulePlan`
return values; those are function results, not persisted state. The `descriptionAliasId` a
transaction carries is legitimate transaction data (the row's own alias), not a rule reference —
`EX-12` asserts a rule-applied manual row contains no rule id anywhere in its serialised form.

---

## 2. Participant map — entry points, writers, readers

Read-only enumeration of every surface the ownership contract must hold across. No file in this
table is modified by MF-002.

### 2.1 Entry points (what starts an ownership decision)

| Entry point                      | Path                                                                                                                               | What it starts                                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction cell edit → proposal | `src/components/features/transactions/TransactionRuleProposal.tsx` → `use-field-rule-proposal.ts` → `field-rule-proposal-state.ts` | The only surface that CHOOSES between create and update from an edit. `computeFieldRuleProposal` returns `create` when the edited field has no winner and `update` of that exact winner when it has one. |
| Robot popup                      | `TransactionRuleRobot.tsx` / `TransactionRulePopup.tsx` → `use-transaction-rule-workflow.ts` → `field-rule-robot-state.ts`         | Edits/deletes a rule that already exists and offers "apply to this transaction" on drift. Never creates.                                                                                                 |
| Automations manager              | `src/components/features/automations/FieldRulesManager.tsx` → `FieldRuleEditor.tsx`                                                | Full CRUD plus bulk apply, on a rule chosen from a list rather than derived from a row.                                                                                                                  |
| Import commit                    | `src/components/features/import/ImportPanel.tsx` → `src/lib/crdt/import-commit.ts` → `applyFieldRulesToImport`                     | Applies winners to a whole batch; creates nothing.                                                                                                                                                       |
| Hydration / migration            | `src/lib/crdt/mirror.ts` (`migrateVaultAutomations`) → `field-rules.ts` (`migrateVaultAutomationsToFieldRules`)                    | Derives single-field rules from legacy generic automations, once per vault, stamped `createdAt = 0` so any user rule outranks them on a recency tie.                                                     |

No agent, streaming or server bridge participates. There is no server-side ownership lock and no
database pool in this path: rules live in the client's Loro vault (`fieldRules`), not in Fusion's
PostgreSQL.

### 2.2 Writers

| Writer                                                                                       | Path / symbol                                                                                                                                 | Ownership-relevant behaviour                                                                                                                                                                |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createFieldRule`                                                                            | `src/lib/crdt/field-rule-mutations.ts`                                                                                                        | Decodes → validates → rejects a uniqueness collision (`duplicate-key`, naming `existingRuleId`) with zero mutation → writes `state.fieldRules[id]`.                                         |
| `updateFieldRule`                                                                            | same                                                                                                                                          | `not-found` for missing/soft-deleted target. Preserves `id`, `descriptionText`, `createdAt`. Writes the given scope and action WHOLESALE. Re-checks uniqueness excluding the rule's own id. |
| `deleteFieldRule`                                                                            | same                                                                                                                                          | Soft delete via `deletedAtEpochMs`; frees the slot. A rule that fails to decode still gets stamped but reports `not-found`.                                                                 |
| `persistUserAutomationPreference`                                                            | same                                                                                                                                          | Per-user UI memory keyed by `pubkeyHash`. Not shared financial data. Separate call from CRUD and from apply.                                                                                |
| `applyFieldRulesToTransaction` / `…ToImport` / `…ToAllTransactions` / `…ToNewerTransactions` | `src/lib/crdt/field-rules.ts`                                                                                                                 | Apply per-field winners. Tags via `updateTransaction`; allocation EXCLUSIVELY via P16C `replaceTransactionAllocations`; alias EXCLUSIVELY via P11 `assignDescriptionAlias`.                 |
| `applyFieldRulesToSingleTransaction`                                                         | `src/lib/crdt/apply-field-rule-to-transaction.ts`                                                                                             | Thin composition over the same engine for one row.                                                                                                                                          |
| Vault context actions                                                                        | `src/lib/crdt/context.tsx` — `useFieldRuleActions`, `useApplyFieldRules`, `useApplyFieldRulesToTransaction`, `usePersistAutomationPreference` | Each is its own `useInternalVaultAction`, i.e. its own undo group.                                                                                                                          |

### 2.3 Readers

| Reader                   | Symbol                                                                    | Note                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active rule set          | `readActiveFieldRules` (`field-rules.ts`)                                 | Skips `$cid`, skips soft-deleted, skips entries that fail `decodeFieldRule`. An invalid rule is silently not a candidate.                                                                 |
| Match subject projection | `subjectForTransaction` / `descriptionTextForMatching` (`field-rules.ts`) | Imported rows project raw `description` (empty → `null`); manual rows project the RESOLVED alias name via `resolveAlias`, following symlinks. `isManual` keys on `importId == null` only. |
| Precedence               | `selectWinningRule` / `selectWinningRulesByField`                         | The single precedence implementation. Never duplicate it.                                                                                                                                 |
| Field eligibility        | `fieldAppliesToManual`                                                    | `descriptionAlias` → false on manual; `tags`/`allocation` → true.                                                                                                                         |
| Editor projections       | `rule-editor-data.ts` — `draftFromRule`, `draftFromProposal`              | `draftFromRule` reproduces an EXISTING rule's scope. `draftFromProposal` seeds from the TRANSACTION and the remembered preference. See §4.3.                                              |

### 2.4 Persistence and lifecycle boundaries

| Boundary          | Path                                                                                                                               | Property                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema / defaults | `src/lib/crdt/schema.ts` (`fieldRuleSchema`, `userAutomationPreferenceSchema`), `defaults.ts`, `mirror.ts` (`DEFAULT_VAULT_STATE`) | `fieldRules: {}` and `userAutomationPreferences: {}` by default. Absent collections are empty, never missing.                                                                                                                         |
| Undo              | `src/lib/crdt/undo.tsx`                                                                                                            | Loro `UndoManager`, origin-tagged. `system:*` origins are excluded from history. One vault action = one undo group. CRUD, bulk apply and preference persistence are THREE separate actions and therefore three separate undo entries. |
| Alias lifecycle   | `src/lib/crdt/description-aliases.ts`, `maintenance.ts`, `src/lib/domain/description-aliases.ts`                                   | Symlink resolution on read; maintenance rewrites references and hard-deletes proven symlinks. A rule stores an `aliasId`; a rename does not invalidate the rule.                                                                      |
| Sync              | `src/lib/sync/{manager,persistence,local-persistence-seam}.ts`, `src/lib/crdt/sync.ts`                                             | IndexedDB writes immediate, server push throttled (~2s), encrypted client-side. Asynchronous and after the fact: local success is not remote agreement.                                                                               |

---

## 3. Existing test evidence (named, not just filed)

| Property                                   | Test                                                                                       | File                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Create rejects a colliding slot            | `rejects a second rule that collides on the uniqueness key (same field/text/scope)`        | `tests/integration/field-rule-mutations.test.ts`            |
| More specific scope coexists with unscoped | `permits a more specific scope alongside the unscoped rule`                                | same                                                        |
| Update preserves identity                  | `updates the action while preserving id, description and creation time`                    | same                                                        |
| Update rejects a colliding scope change    | `rejects updating a scope so it collides with another active rule`                         | same                                                        |
| Missing target                             | `returns not-found for a missing rule`                                                     | same                                                        |
| Soft delete frees the slot                 | `frees the uniqueness slot for a new rule after deletion`                                  | same                                                        |
| Manual rows match on alias name            | `applies a tag rule keyed on the alias name to a manual row`                               | same                                                        |
| Alias rules never touch manual rows        | `never applies a description-alias rule to a manual row`                                   | same                                                        |
| Allocation via the P16C boundary           | `applies an allocation rule keyed on the alias name via the P16C boundary`                 | same                                                        |
| Proposal exists where the robot is silent  | `the robot alone stays silent for $field, which is why the proposal exists`                | `tests/unit/components/field-rule-proposal-state.test.ts`   |
| Edit with a matching rule updates it       | `proposes an UPDATE of the matching rule`                                                  | same                                                        |
| Single-transaction application             | `applies the winning description-alias rule to just that transaction via the P11 boundary` | `tests/integration/apply-field-rule-to-transaction.test.ts` |
| Import applies winners                     | see `tests/integration/import-commit-field-rules.test.ts`                                  | —                                                           |
| Engine precedence/uniqueness               | `tests/unit/domain/automation/rules.test.ts`                                               | —                                                           |

**New for MF-002:** `tests/integration/grouped-rule-ownership-contract.test.ts` — production-API
characterization keyed to the `EX-*` ids below.

---

## 4. Measured baseline

Every row states what the shipped code does at the audited revision, with the test that measures it.

### 4.1 What an edit targets

| Id    | Situation                                               | Measured behaviour                                                                                                  | Evidence                                                                          |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| EX-01 | Imported row, tag edit, no rules at all                 | `create` proposal for `tags`, keyed on the exact description text. Nothing is written until confirm.                | `EX-01: an imported tag edit with no rules at all proposes a create`              |
| EX-02 | One account-scoped tags rule matching                   | `update` of THAT id.                                                                                                | `EX-02: a matching account-scoped tags rule makes the edit an update of that id`  |
| EX-03 | An alias rule owns the text; user edits TAGS            | `create` — a rule of another field is not a host today. This is precisely the case grouped editing would change.    | `EX-03: an alias-only rule plus a tag edit still proposes a create today`         |
| EX-04 | Unscoped + amount + account+amount tags rules all match | `update` of the account+amount rule; the newer unscoped rule loses on rank.                                         | `EX-04: with several applicable tags rules the most specific scope is the target` |
| EX-05 | A rule scoped to `amount: 0`                            | Zero is a real constraint (rank 1), not an absent one; a different amount falls back to unscoped.                   | `EX-05: a zero-amount scoped rule is a genuine constraint and still wins on rank` |
| EX-06 | A rule on a different description text                  | Not a candidate; `create`. Visible similarity never authorises reuse.                                               | `EX-06: a rule for another description text is not an extension candidate`        |
| EX-07 | The edit CLEARS the field                               | `none` on all three fields. Clearing is never offered as a rule.                                                    | `EX-07: clearing $label proposes nothing`                                         |
| EX-08 | Manual row                                              | `tags`/`allocation` propose; `descriptionAlias` is `none`; a manual row with no alias text proposes nothing at all. | `EX-08: manual rows are tag/allocation eligible and alias ineligible`             |

### 4.2 What a write touches

| Property                            | Measured behaviour                                                                                                                                                                                                                                                                                                                                                                              | Evidence                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Explicit update fidelity            | The requested `accountId`, `amount` and action land exactly; `id`, `descriptionText` and `createdAt` are preserved.                                                                                                                                                                                                                                                                             | `preserves id, description text and creation time while writing the requested scope`     |
| No unrelated merge                  | Updating one rule leaves every other rule's id, scope and action byte-identical — including rules of a DIFFERENT field on the SAME description text, and rules on another text.                                                                                                                                                                                                                 | `leaves every unrelated rule's id, scope and action intact`                              |
| One rule, one field                 | An update rewrites the action wholesale. Re-typing a tags rule as an alias rule DESTROYS the tag output. A grouped write therefore needs new capacity; it cannot be smuggled through this path.                                                                                                                                                                                                 | `rewrites the action wholesale, so one rule still carries exactly one field`             |
| Invalid allocation                  | Rejected at the boundary with zero mutation.                                                                                                                                                                                                                                                                                                                                                    | `rejects an invalid allocation set at the write boundary with zero mutation`             |
| Soft delete                         | Removes the rule from candidacy; the same edit then proposes `create`.                                                                                                                                                                                                                                                                                                                          | `excludes soft-deleted rules, so deletion frees the uniqueness slot`                     |
| EX-17 — invalid-record deletion     | **The one measured exception to "a failed mutation writes nothing".** `deleteFieldRule` stamps `deletedAtEpochMs` BEFORE it inspects the decode result, so deleting an undecodable record mutates the vault and still returns `not-found` (`field-rule-mutations.ts:283-292`). Do not generalise the no-write property of `createFieldRule`/`updateFieldRule` to every current failed mutation. | `EX-17: deleting an undecodable record stamps the deletion and still reports not-found`  |
| EX-13 — occupied destination slot   | An update whose resulting `(field, text, account, amount)` key is already held by another active rule is refused with `duplicate-key` naming `existingRuleId`. BOTH rules keep their scope and action.                                                                                                                                                                                          | `EX-13: widening a scope onto an occupied slot returns duplicate-key and writes nothing` |
| EX-13b — refusal is not application | After that refusal, bulk application still gives every row its pre-refusal winner. A rejected mutation can never be reported as an applied one.                                                                                                                                                                                                                                                 | `EX-13b: after the refusal the rows still take the pre-refusal winners`                  |

### 4.3 Draft seeding is NOT scope preservation

`use-field-rule-proposal.ts` builds its baseline draft with
`draftFromProposal(seed, currency, remembered)`, where `seed` carries THIS TRANSACTION's `accountId`
and `amount` and `remembered` carries the user's last-used `useAccountScope` / `useAmountScope` /
`tagMode` / `applyMode`. It does NOT read the target rule's existing scope, even when
`proposal.kind === "update"`. (`draftFromRule`, used by the robot and the manager, DOES reproduce an
existing rule's scope.)

Consequence, stated plainly because it matters for every conflict case below: confirming an update
from the transaction surface can WIDEN or NARROW the target rule's match population, if the
remembered restriction checkboxes differ from the rule's current constraints. The mutation is
faithful to its inputs (§4.2); it is the seeding that may not reflect the rule as stored. The
integration test pins the mutation contract only; it deliberately does not assert UI seeding, which
is a React-hook behaviour outside this task's evidence scope. Recorded as **G-01** in §8.

### 4.4 Application follows per-field winners, not the edit target

| Id    | Situation                                                                          | Measured behaviour                                                                                                                                                                  | Evidence                                                                              |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| EX-09 | Three rules, three fields, three different scopes, one row                         | All three apply; each field resolves on its own lattice. There is no single owner of a transaction.                                                                                 | `EX-09: split alias/tags/allocation owners all apply to the same row`                 |
| EX-10 | Account-A tags rule + unscoped tags rule; rows on A and B                          | The edit on the A row targets the A rule; the B row still takes the unscoped rule. Grouping an edit onto one rule must never be read as "this rule now drives these rows".          | `EX-10: the row a user edited and a sibling row can take different winners`           |
| EX-11 | `add` rule vs `set` rule producing the same visible tag on differently-tagged rows | `add` unions onto existing tags, `set` clears them. Equal row outcomes do NOT mean equal rules.                                                                                     | `EX-11: tag mode decides the result, so equal row outcomes need not mean equal rules` |
| EX-12 | Manual row matched by a tags rule                                                  | Tag applied; raw `description` still empty; the row's serialised form contains no rule id.                                                                                          | `EX-12: a manual row matches on its resolved alias name without gaining a rule link`  |
| EX-16 | One rule edited, then apply                                                        | Bulk application evaluates EVERY active rule, not only the edited one: the untouched alias rule applies in the same pass. A grouped surface must not imply the others were skipped. | `EX-16: applying after one rule's edit still evaluates every other active rule`       |

### 4.5 Lifecycle facts recorded without embellishment

- **Undo granularity.** Each context action is one undoable group. A confirm from the proposal
  surface issues CRUD, then apply, then preference persistence as SEPARATE actions
  (`use-field-rule-proposal.ts` `apply()`). There is no cross-call atomicity and no rollback across
  them: an apply that partially rejects does not undo the CRUD write.
- **Rejection is not application.** A rejected mutation returns early with field errors and never
  reaches the apply or preference calls. A rejected mutation must never be reported as a successful
  application.
- **Preference identity.** Preferences are keyed by `pubkeyHash` (per user, per device identity),
  while rules are vault-scoped (shared). Two users of one vault have one rule set and two preference
  records.
- **Hydration/migration.** `migrateVaultAutomationsToFieldRules` runs at most once per vault,
  guarded by `preferences.automationRulesMigrationVersion`, writes nothing when there are no legacy
  automations, and never mutates the legacy collection. Migrated ids are deterministic so concurrent
  first-migrations converge.
- **Persistence.** IndexedDB write is immediate; the encrypted server push is throttled and
  asynchronous. A locally accepted write is not a globally unique write (see D-007).

---

## 5. Extension selection and conflicts

Everything in §4 is MEASURED. Everything in this section that is marked **PROPOSED** is a RESOLVED
resolution awaiting user approval and is not shipped semantics. "Resolved" means the decision is
concrete enough for an approver to accept or reject it; it does not mean anyone has. The scenario
table keeps measured and proposed in adjacent columns on purpose, so a reader can never mistake one
for the other.

### 5.1 The question, stated precisely

Under the mission's grouped design a user edits ONE field of ONE row and the product may fold that
output into an EXISTING rule instead of creating a second one. Three questions must be answered
before any of that can be implemented:

1. **Which rule is the grouped extension target** when more than one rule already applies to this
   row?
2. **What happens when the edited field already has a derived owner** that is not that target?
3. **What happens when the fold would change a rule's match population**, its other outputs, or
   another rule's uniqueness slot?

The mission settles exactly one of these: _prefer the description rule when multiple rules apply._
The rest are open, and §5.5 proposes a resolution for each.

**Two things that are never the same question.** The _extension target_ is about ONE row's edit and
ONE write. The _derived owner_ is about EVERY row, recomputed on read (§4.4, EX-09/EX-10). Grouping
changes only the first. It cannot change per-field precedence or field eligibility, because those
belong to `selectWinningRule` / `fieldAppliesToManual` and every reader — table render, robot,
import commit, bulk apply — goes through them. **A grouped design that needed a second precedence
implementation would be wrong by construction.**

### 5.2 Compatibility — what may legitimately share one rule

A fold is only conceivable when the host and the new output can coexist without either changing
meaning. Compatibility is a property of the RULE, never of the row that happens to be on screen.

| Aspect     | Compatible iff                                                               | Why the weaker test is wrong                                                                                                        |
| ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Predicate  | Identical `(descriptionText, accountId, amount)`. Not "both match this row". | Two rules can both match today's row and cover different populations (EX-10).                                                       |
| Field      | The host carries no action for the edited field yet.                         | One rule holds one action per field; a fold is an ADDITION of a field slot, never a re-type (EX: `rewrites the action wholesale…`). |
| Tags       | Same `mode`, or an explicit user choice of mode.                             | `add` and `set` are different operations; equal results on one row prove nothing (EX-11).                                           |
| Allocation | The whole validated set is carried, not one person's share.                  | `validateAllocationSet` accepts or rejects the complete set; a partial set is not a rule output.                                    |
| Alias      | Same `aliasId` after symlink resolution.                                     | Two alias ids can render the same visible name; the name is not identity.                                                           |

**Never a compatibility signal:** matching the same row, sharing visible alias text, producing the
same value on the row in front of the user, or being adjacent in the manager's list.

### 5.3 Selection ladder — RESOLVED semantics, not shipped code

Given the edited field `F`, the subject `S`, and the active rules `R`. This ladder is the resolved
form of D-001/D-003/D-004/D-005 read together; MF-002 carried it as an unreconciled proposal, and
the ordering below is what MF-007 settles.

1. Let `C` = match candidates of `S` (any field) whose predicate is IDENTICAL to the predicate the
   proposal would otherwise create. Rules that merely match `S` under a broader or narrower
   predicate are NOT in `C`. (**D-004**.)
2. If `C` is empty → **create**, exactly as today (EX-01).
3. **Existing owner first.** If some rule in `C` already carries an action for `F`, that rule is the
   DEFAULT target and the ladder stops there (**D-003**, **D-005**). It is pre-selected, shown with
   its stored predicate and other outputs, and confirmable — it changes no population, so it is the
   least surprising answer. The preferred host from step 4, when it differs, is offered beside it as
   an explicit consolidation (D-011), never substituted for it.
4. Else `F` has no owner in `C`. If some rule in `C` carries a `descriptionAlias` action → that is
   the preferred target and may be pre-selected (**D-001**, the mission's settled decision).
5. Else if `C` has exactly one member → that is the target.
6. Else `C` has several non-alias members and none owns `F` → **ambiguous**; present every candidate
   with its predicate and outputs and require an explicit choice (**D-005**). Never choose by
   recency, id, list order, displayed equality or the holder of a duplicate slot.

**Reconciling "edited-owner default" with "never resolve an ambiguous host set silently."** These
two rules read as if they collide, and MF-002 left the collision implicit. They do not collide,
because they answer different questions and step 3 runs first:

- The prohibition in step 6 forbids the product choosing BETWEEN INDEPENDENT CANDIDATES on an
  invisible criterion. That is the silent merge the acceptance criteria forbid.
- The default in step 3 is not such a choice. When `F` already has an owner, updating that owner is
  what happens today (EX-02, EX-04) and it moves no output between rules and changes no population.
  Preferring it is a decision to CHANGE NOTHING, not a tiebreak, so it is not a merge at all.
- Consequently a host set can be ambiguous for the purpose of consolidation and unambiguous for the
  purpose of the write: S-09's `{r1 tags, r2 allocation}` has no alias member, so step 4 does not
  fire, but `r2` owns the edited allocation field, so step 3 targets `r2` and the ambiguity is
  resolved without a tiebreak. Folding into `r1` remains available only as a named, previewed
  consolidation.
- **S-06 is not ambiguous at all.** Its three tags rules have three DIFFERENT predicates, so at most
  one is in `C` (step 1) and the ladder never reaches step 6. "Several rules match this row" and
  "several rules are extension candidates" are different statements (§5.1, EX-10).
- **S-07 is a genuine conflict, and step 3 resolves it toward no change:** the alias rule `r1` is
  the preferred host, but `r2` already owns tags, so `r2` is the default target and consolidation
  into `r1` is offered explicitly with `r2`'s fate stated (D-003, D-011, M-07).

Step 6 is where "no unrelated rules silently merge" is enforced: a design that skipped it and
picked, say, the most recently created candidate would merge two independently authored rules on a
coin flip.

### 5.4 Worked scenarios

Shared facts: description `COFFEE SHOP 123`; accounts A and B; amounts −450 and −600 minor units;
date 2026-07-25. "Baseline today" is measured (§4 and the named tests). "PROPOSED" is the RESOLVED
resolution at `OWN-2026-09-07-r2` — concrete, reviewable, and unapproved until §7.1 says otherwise.

| Id   | Rules before (id · field · scope · action)                                                                       | Pre-edit winners                         | Edit                              | Baseline today                             | PROPOSED grouped target                                                                                                                                       | Retained / changed                                   | Cancel result                                                         | Downstream observable                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| S-01 | _(none)_                                                                                                         | —                                        | tags `+coffee` on imported A/−450 | `create` (EX-01)                           | create; unchanged                                                                                                                                             | nothing else exists                                  | nothing written                                                       | new tags rule applies to every A/−450… row per its chosen scope                                                     |
| S-02 | `r1` tags · A · add[coffee]                                                                                      | tags→`r1`                                | tags `+coffee,+cafe` on A/−450    | `update r1` (EX-02)                        | update `r1`                                                                                                                                                   | `r1` action changed; no other rule exists            | `r1` untouched                                                        | rows matching `r1` gain `cafe`                                                                                      |
| S-03 | `r1` tags · amount −450 · add[coffee]                                                                            | tags→`r1`                                | tags on A/−450                    | `update r1`                                | update `r1` — same predicate as the seeded draft only if the draft keeps the amount restriction; see D-004                                                    | scope shown explicitly                               | `r1` untouched                                                        | population unchanged only if scope unchanged                                                                        |
| S-04 | `r1` tags · A+−450 · add[coffee]                                                                                 | tags→`r1`                                | tags on A/−450                    | `update r1`                                | update `r1`                                                                                                                                                   | —                                                    | —                                                                     | narrowest population                                                                                                |
| S-05 | `r1` alias · unscoped · →`Coffee`                                                                                | alias→`r1`; tags→none                    | tags `+coffee` on A/−450          | `create` (EX-03)                           | **fold into `r1`** iff the draft's predicate is also unscoped (D-001 + D-004); otherwise create                                                               | `r1` gains a tags slot; alias output untouched       | nothing written                                                       | every row matching `COFFEE SHOP 123` gains the tag — a strictly broader population than an A+amount rule would have |
| S-06 | `r1` tags · unscoped; `r2` tags · −450; `r3` tags · A+−450                                                       | tags→`r3`                                | tags on A/−450                    | `update r3` (EX-04)                        | update `r3`                                                                                                                                                   | `r1`,`r2` untouched                                  | —                                                                     | only A/−450 rows change                                                                                             |
| S-07 | `r1` alias · unscoped; `r2` tags · unscoped                                                                      | alias→`r1`; tags→`r2`                    | tags on A/−450                    | `update r2`                                | **conflict** — D-001 prefers `r1`, but `r2` already OWNS tags. Recommended: keep `r2` (D-003); offer explicit consolidation into `r1` with `r2`'s fate stated | user's choice                                        | if consolidated, `r2` must be deleted or it keeps winning; §5.5 D-003 |
| S-08 | `r1` alias · A; `r2` tags · unscoped                                                                             | alias→`r1`; tags→`r2`                    | tags on A/−450                    | `update r2`                                | **no fold** — `r1`'s predicate ≠ `r2`'s; folding would silently narrow the tag from all accounts to account A (D-004)                                         | `r2` updated in place                                | —                                                                     | population must not change without the user saying so                                                               |
| S-09 | `r1` tags · unscoped; `r2` allocation · unscoped                                                                 | tags→`r1`; alloc→`r2`                    | allocation `{p1:100}` on A/−450   | `update r2`                                | ambiguous host set `{r1,r2}` with no alias member → D-005: default to the existing owner `r2`, offer consolidation explicitly                                 | `r1` untouched                                       | —                                                                     | allocation population unchanged                                                                                     |
| S-10 | `r1` alias · unscoped; `r2` tags · unscoped; `r3` allocation · unscoped                                          | all three                                | alias edit on A/−450              | `update r1`                                | update `r1` (it owns the edited field AND is the preferred host)                                                                                              | `r2`,`r3` untouched                                  | —                                                                     | EX-09 shows all three still apply independently                                                                     |
| S-11 | `r1` tags · A · add[coffee]; `r2` tags · unscoped · add[broad]                                                   | tags(A row)→`r1`; tags(B row)→`r2`       | tags on the A row                 | `update r1` (EX-10)                        | update `r1`                                                                                                                                                   | `r2` untouched                                       | —                                                                     | the B row still takes `r2`. Grouping never means "this rule now drives these rows"                                  |
| S-12 | `r1` tags · A · add[coffee]; `r2` tags · B · set[coffee]                                                         | per row                                  | tags on the A row                 | `update r1`                                | update `r1`; `r2` is NOT a consolidation candidate — different mode AND different predicate (EX-11)                                                           | `r2` untouched                                       | —                                                                     | `set` clears manual tags, `add` does not                                                                            |
| S-13 | `r1` tags · A · add[coffee] and the row currently shows no `coffee`                                              | tags→`r1` (DRIFT)                        | tags `+tea` on the A row          | `update r1`                                | update `r1`, but the surface MUST show that `r1` currently implies `coffee` and the row does not have it (D-006)                                              | user sees the divergence before confirming           | —                                                                     | confirming rewrites the rule for every matching row, not just this one                                              |
| S-14 | `r1` tags · A · add[coffee]; `r2` tags · A · add[cafe] (duplicate slot — only reachable via concurrent creation) | tags→ later `createdAt`, then greater id | tags on the A row                 | `update` of the deterministic winner       | same; the loser must be surfaced, never silently deleted (D-012)                                                                                              | both rules retained                                  | —                                                                     | `dedupeRulesByUniqueness` exists for repair, and repair is a user-visible action                                    |
| S-15 | `r1` tags · A but stored with an invalid allocation/shape                                                        | not a candidate                          | tags on the A row                 | `create` — `readActiveFieldRules` skips it | create; an undecodable rule is never a fold host (D-012)                                                                                                      | invalid record untouched                             | —                                                                     | the invalid record stays invisible to matching                                                                      |
| S-16 | `r1` tags · unscoped, and the row is MANUAL with alias `Coffee`                                                  | tags→`r1` via the resolved alias name    | tags on the manual row            | `update r1` (EX-12)                        | update `r1`                                                                                                                                                   | raw `description` still empty; no rule id on the row | —                                                                     | alias rules remain ineligible for manual rows                                                                       |
| S-17 | `r1` tags · unscoped on `BOOKSTORE 99`                                                                           | none for this row                        | tags on `COFFEE SHOP 123`         | `create` (EX-06)                           | create — a different text is never a host                                                                                                                     | `r1` untouched                                       | —                                                                     | control: no cross-text merge                                                                                        |
| S-18 | `r1` tags · amount 0 · add[fee]; `r2` tags · unscoped                                                            | −450 row → `r2`; 0 row → `r1`            | tags on the −450 row              | `update r2` (EX-05)                        | update `r2`                                                                                                                                                   | `r1` untouched                                       | —                                                                     | zero is a real constraint, not an absent one                                                                        |
| S-19 | any                                                                                                              | any                                      | edit CLEARS the field             | `none` (EX-07)                             | none — clearing is never a rule, grouped or not                                                                                                               | nothing                                              | —                                                                     | no write path at all                                                                                                |
| S-20 | `r1` alias · unscoped · →`alias-x`; `r2` alias · unscoped · →`alias-y` where both aliases render "Coffee"        | duplicate slot                           | alias edit                        | deterministic winner                       | not a consolidation candidate: different `aliasId` after resolution (§5.2)                                                                                    | both retained                                        | —                                                                     | visible name is not identity                                                                                        |

### 5.5 Conflict catalogue and proposed resolutions

Each entry states the collision, the RESOLVED resolution, the alternatives considered with their
tradeoff, and the consequence the surface must state to the user before writing. Every entry is
RESOLVED at `OWN-2026-09-07-r2` and every entry is **unapproved** — see §7.0. The word _Recommended_
below is MF-002's original wording, retained so the provenance of each argument stays legible; the
binding resolution for every decision is the §7.1 row, and the two agree.

**D-001 — Preferred host when several rules apply.** _Settled by the mission._ When several rules
apply, the description(-alias) rule is the preferred grouped-extension target. _Constraint this task
adds:_ preference operates only within the compatible-predicate set (D-004), and only where it does
not silently displace an existing owner (D-003). Affects S-05, S-07, S-10.

**D-002 — Grouped writes need new capacity.** A fold cannot be expressed through today's
`updateFieldRule`, because the update rewrites the action wholesale and one action carries one
field; re-typing a tags rule as an alias rule destroys the tag output (measured:
`rewrites the action wholesale, so one rule still carries exactly one field`). _Recommended:_ the
multi-field capability is an ADDITIVE schema/model change (a rule holding a set of per-field
actions), designed and approved separately, with migration and undo specified there. _Alternative:_
leave the model alone and merely co-present sibling rules in the UI as a "group" — cheaper and
reversible, but does not deliver the mission's "combine compatible outputs into multi-field rules".
_Consequence to state:_ until that capability exists, every "grouped" proposal is a UI grouping over
N single-field rules.

**D-003 — The edited field already has a different owner.** D-001 prefers the description rule; the
edited field may already be owned by another rule. _Recommended:_ the existing owner WINS by default
— update it, do not transfer. Offer consolidation into the preferred host as an EXPLICIT, labelled
choice, never a default, and only when predicates are identical (D-004). _Alternatives:_ (a) always
transfer to the description rule — matches D-001 literally but silently changes which rule a user
must edit later, and orphans the source; (b) always create a third rule — never merges, but
multiplies rules, which is what the mission is trying to reduce. _Consequence the surface must state
before any transfer:_ the source rule's fate (it must be DELETED, or it keeps winning its slot and
the transfer changes nothing), which other outputs move with it, and that the affected population
becomes the host's population, which may be broader or narrower than the source's. Affects S-07,
S-09.

**D-004 — Predicate mismatch between the host and the edit.** A host that matches this row may cover
a different population. _Recommended:_ fold ONLY when predicates are identical. When the preferred
host's predicate differs, do not fold; write the edit as its own rule (or update the edited field's
own owner) and say why. _Alternative:_ fold and adopt the host's predicate — this silently broadens
or narrows the new output's reach; rejected as a default because financial automations then change
rows the user never saw. _Consequence to state:_ the exact row population that changes. _Related
measured hazard:_ the transaction-surface draft is seeded from the transaction and the remembered
preference, NOT from the target rule's stored scope (§4.3). A grouped design must show the target's
ACTUAL predicate, or confirming a fold can move the host's population by accident. Affects S-03,
S-05, S-08.

**D-005 — Ambiguous fallback with no description rule.** Several compatible non-alias candidates and
no alias rule. _Recommended:_ if the edited field already has an owner in the candidate set, that
owner is the default target (it is the least surprising and changes no population); otherwise
present the candidates with their predicates and outputs and REQUIRE a choice, with cancel always
available. No implicit tiebreak on recency, id or list order. _Alternative:_ reuse the engine's
recency/id tiebreak — deterministic and cheap, but it merges two independently authored rules on an
invisible criterion, which is exactly the "silent merge" the acceptance criteria forbid. Affects
S-09.

**D-006 — Drift on the host.** The host currently implies a value the row does not have.
_Recommended:_ show the host's current implied value and the row's value together, and require
acknowledgement before writing. Do not auto-reconcile in either direction. _Alternative:_ silently
overwrite the rule with the row's value — that is the current single-field update behaviour and is
defensible for one field, but under grouping it can change several fields' populations at once.
Affects S-13.

**D-011 — Identical predicate and identical output.** Two rules of DIFFERENT fields with identical
predicates are the only clean consolidation candidates. _Recommended:_ offer consolidation
explicitly, as a named action with a preview, never as an automatic migration and never as a side
effect of an unrelated field edit. _Consequence to state:_ which rule id survives, which is deleted,
and that the deletion frees a uniqueness slot. Affects S-07, S-20.

**D-012 — Duplicate slots and undecodable rules.** A uniqueness violation is reachable through
concurrent creation on two devices (local rejection is not global uniqueness — D-007). An
undecodable rule is invisible to matching. _Recommended:_ never pick a fold host from a duplicated
slot without surfacing the duplicate, and never make an undecodable record a host. Repair
(`dedupeRulesByUniqueness`) stays an explicit, user-visible action. _Alternative:_ auto-dedupe on
read — convergent and tidy, but deletes a rule a user authored, without telling them. Affects S-14,
S-15.

**D-014 — Tag mode.** _Recommended:_ a fold must carry the host's mode explicitly in the UI and
require confirmation when the user's remembered mode differs from the host's, because `set` clears
tags the user typed by hand (EX-11). Never infer the mode from the row's resulting tag set.

**D-015 — Allocation is a whole set.** _Recommended:_ a fold of an allocation output carries the
entire validated set. There is no "add one person" fold: `validateAllocationSet` rejects an
incomplete set at the boundary and the write is refused with zero mutation (measured:
`rejects an invalid allocation set at the write boundary with zero mutation`).

**D-016 — Cancellation.** _Recommended:_ every conflict surface has a cancel that writes NOTHING —
no rule, no application, no remembered preference. Because the three are separate calls with no
cross-call atomicity (§4.5), cancel must happen before the first call, not between them.

### 5.6 Invariants any implementation must preserve

1. Per-field precedence and eligibility are computed by `selectWinningRule` / `fieldAppliesToManual`
   only. No second implementation, no grouping-aware override.
2. No rule stores a transaction id and no transaction stores a rule id (EX-12).
3. A fold never changes a rule's `descriptionText`, `id` or `createdAt` (§4.2).
4. A fold never changes a predicate the user did not explicitly change (D-004).
5. A fold never deletes a rule without saying so (D-003, D-011).
6. Rejection is not application: a refused mutation must not be reported as applied (§4.5).

## 6. Lifecycle ambiguity and stale work

A grouped-extension surface holds a decision — "this edit will be folded into rule `X`" — across an
interval in which `X`, its uniqueness slot, and the rest of the rule set can all move. This section
gives each ordering a decision id, records what the shipped code does at that ordering, and names
the surfaces that must preserve the answer.

Everything under "measured" is asserted by a named test. Everything under _Recommended_ is a
**RESOLVED but unapproved** proposal describing DESIRED grouped behaviour; the binding form of each
is its §7.1 row. **None of it is existing distributed fencing.** There are no locks, no leases, no
versions, no compare-and-swap, no rollback and no transactional boundary anywhere in this path, and
neither MF-002 nor MF-007 proposes inventing one.

### 6.1 Preserving surfaces

Every ordering below must be answered consistently by all of these; none may hold a private idea of
who owns a field.

| Surface             | Path                                                                                                                      | Role in a stale-work ordering                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Proposal hook       | `use-field-rule-proposal.ts`                                                                                              | Recomputes `proposal` from the LIVE rule list on every render; `apply()` reads `proposal.rule.id` at call time.                 |
| Proposal component  | `TransactionRuleProposal.tsx`                                                                                             | Owns the deferred focus evaluation and the `appliedRef` once-guard (§6.6).                                                      |
| Robot workflow      | `use-transaction-rule-workflow.ts`                                                                                        | `save(ruleId)` updates an explicitly-passed id; `remove(ruleId)` soft-deletes and resets the draft.                             |
| Manager             | `FieldRulesManager.tsx`                                                                                                   | `handleSave` creates or updates the editor's `target.ruleId`; apply-all / apply-new are separate buttons, not part of the save. |
| Context / mutations | `context.tsx` (`useFieldRuleActions`, `useApplyFieldRules`, `usePersistAutomationPreference`) → `field-rule-mutations.ts` | Each action is its own `useInternalVaultAction`, i.e. its own undo group and its own transaction boundary.                      |
| Readers / hydration | `readActiveFieldRules`, `migrateVaultAutomationsToFieldRules`                                                             | Decide what is a candidate AFTER any concurrent change has merged.                                                              |
| Undo                | `undo.tsx`                                                                                                                | Groups per action; cannot undo "the confirm" as one thing (§6.7).                                                               |

### 6.2 Ordering A — the surface opened, then the target moved

**D-008 — Open edit → target CHANGED → confirm.** _Measured:_ `updateFieldRule` guards on EXISTENCE,
not on a version. If another device (or the manager, or the robot) rewrote `X`'s scope or action
while the proposal was open, the confirm overwrites it WHOLESALE with the surface's inputs. The lost
write is silent: no error, no diff, no prompt. There is no compare-and-swap fencing in this path,
and MF-002 asserts none — `EX-14` deliberately exercises the deleted case, which IS guarded, and
this changed case is recorded as an unguarded gap rather than dressed up as one. _Recommended:_ a
grouped confirm must re-read the target and re-present it when its predicate or any of its actions
changed since the surface opened, because a fold rewrites more of the rule than a single-field edit
did. _Alternative:_ add a revision counter and reject stale writes — stronger, but it is a schema
change and belongs with D-002's additive model, not here. Affects S-02..S-13.

**D-009 — Open edit → target DELETED → confirm or blur.** _Measured:_ the update returns `not-found`
and **resurrects nothing**; the rule stays deleted and the vault ends with zero active rules
(`EX-14: a stale update against a soft-deleted target is not-found and resurrects nothing`). On the
auto-apply path the same failure returns `false` from `apply()`, which clears `appliedRef` and
leaves the controls open (`TransactionRuleProposal.tsx`) — the user is not told the rule vanished,
only that nothing happened. _Recommended:_ a grouped surface must distinguish "your target no longer
exists" from "your input was invalid", and must offer to CREATE rather than silently retrying an
update against a dead id. _Alternative:_ auto-fall-back to create — convenient, but it writes a rule
the user never chose the predicate for; rejected as a default. Affects S-02, S-05, S-07.

**D-013 — Repeated blur/confirm, and queued work after replacement or unmount.** _Measured, as
timing evidence only:_ the component defers each focus evaluation through `window.setTimeout(…, 0)`
and both listeners plus a mount-time evaluation can fire for one gesture; `appliedRef` is the only
thing that collapses that burst into one write.
`tests/unit/components/rule-proposal-auto-apply.test.tsx` →
`writes exactly once no matter how often the listeners re-register` measures 1 apply where a removed
guard measures 3, then 8. **The effect's cleanup removes the two listeners; it does not clear an
already-queued timeout.** A queued callback can therefore still run after unmount, and the guard
against the write it might perform is `appliedRef` and the `open` gate, not cancellation. This
document does not claim complete timeout cancellation on cleanup. _Recommended:_ a grouped confirm —
which may write several rules — must be idempotent per gesture by construction, not by a ref that a
future refactor can drop, and must not begin a multi-write sequence it cannot finish after the
surface is gone. Affects every S-* on the transaction surface.

### 6.3 Ordering B — confirm first, then someone else moves

**D-007 — A locally accepted write is not a globally unique write.** _Measured:_
`findUniquenessCollision` runs against the LOCAL state at write time. Two devices that each create
the unscoped tags rule for `COFFEE SHOP 123` both succeed locally; the CRDT merges both records
afterwards, and the duplicate slot then resolves through `selectWinningRule`'s recency/id tiebreak
(S-14). Nothing rejects the second one after the fact. _Recommended:_ surface a duplicated slot as a
repair prompt naming both rules, and never let a grouped fold silently pick one of a duplicated pair
as its host (D-012). _Alternative:_ auto-dedupe on hydration via `dedupeRulesByUniqueness` — that
helper exists and is used by the legacy MIGRATION, where losing a candidate is a documented skip;
using it on live user rules would delete a rule the user authored without telling them. Rejected.
Affects S-14, S-20.

### 6.4 Ordering C — the destination slot

**D-010 — Free at open, occupied at save.** _Measured:_ the later write is refused with
`duplicate-key` naming `existingRuleId`, and BOTH rules keep their scope and action
(`EX-15: a destination occupied after the surface opened rejects the later write`; the same refusal
shape as `EX-13`). This local rejection is the ONLY fencing that exists, and it does not prove
post-sync uniqueness (D-007): a concurrent creation on another device is merged after the fact, not
refused. _Recommended:_ the refusal must be presented as "another rule already covers exactly this
description + scope + field", with that rule identified and offered as the fold host — a
`duplicate-key` is the one collision where the alternative target is unambiguous. _Alternative:_
auto-retarget onto the colliding rule — that is a silent merge of two independently authored rules,
which the acceptance criteria forbid. Affects S-07, S-09, EX-13, EX-15.

**Refusal is not application.** After a refused update the rows still take their pre-refusal winners
(`EX-13b`). A grouped surface must never report a rejected mutation as an applied one, and must
never run the apply or preference call after a failed CRUD call — which is what `apply()` already
does, by returning early.

### 6.5 Explicit Apply and Delete are not an ownership bypass

_Measured:_ `applyFieldRulesToAllTransactions` / `…ToNewerTransactions` evaluate EVERY active rule,
not only the rule the editor was pointed at
(`EX-16: applying after one rule's edit still evaluates every other active rule`). `applyThis`
likewise runs the whole engine for one row. `removeRule`/`handleDelete` soft-delete exactly the rule
they are given.

**D-018 — Apply/Delete never resolve an ownership question.** _Recommended:_ pressing Apply must not
be treated as consent to a fold whose target or conflict the user has not chosen, and deleting a
rule must not be offered as the mechanism by which a fold "wins" a contested field. Both are
legitimate actions on a rule that already exists; neither is an answer to D-003 or D-005. A conflict
must be resolved BEFORE the first write, because there is nothing to resolve it after (§6.7).
Affects S-07, S-09.

### 6.6 Failure cleanup and no-write cancellation

**D-019 — Cancellation and failure must leave nothing behind.** _Measured today, for the
single-field path:_ `apply()` writes CRUD, then application, then the preference, and returns early
on a CRUD rejection so the latter two never run. On success the draft override is cleared. There is
no compensating write on a LATER failure, because there is no later failure path — application
rejections are counted, not thrown. _Resolved (grouped, unapproved — D-019):_ a grouped confirm that
would touch more than one rule must validate every intended write before performing the first, and
cancellation must occur before the first call — there is no rollback between the calls (§6.7,
D-017). This is a design constraint on a future implementation, **not** a description of existing
distributed fencing.

### 6.7 Atomicity, undo and the honest limits

**D-017 — There is no cross-call atomicity today; a grouped transfer must be one local mutation or
must not exist.** _Measured:_ CRUD, bulk application and preference persistence are three
`useInternalVaultAction` calls and therefore three undo entries. An application that partially
rejects does not undo the CRUD write. One Ctrl+Z after a confirm undoes the LAST of the three, not
the gesture.

_Resolution (MF-007, replacing MF-002's deferral)._ MF-002 recorded this as "unresolved" and handed
it to D-002's design. That is not an answer, so this revision states one. A grouped transfer —
"write the host's new field slot, then remove that field from the source" — is only permitted under
BOTH of the following; a design that cannot meet them must ship consolidation DISABLED rather than
ship it non-atomically.

1. **One logical vault mutation.** Host write and source change are performed inside a single
   `useInternalVaultAction` callback, i.e. one `setState` on the mirror, so the Loro document
   commits them together and `undo.tsx` groups them as one undo entry. Two sequential mutation calls
   are not an acceptable implementation, because there is no rollback between them (§6.6).
2. **Validate-then-write.** Every precondition — source still exists and still carries the field,
   host still exists, host's predicate unchanged since the surface opened (D-008), destination
   uniqueness slot free (D-010), allocation set valid as a whole (D-015) — is checked BEFORE the
   first mutating statement. A failure at validation returns an error and writes nothing. A
   cancelled or rejected proposal therefore leaves rules, applications and remembered preferences
   exactly as they were (D-016, D-019).

_Which source outputs survive._ Only the transferred field leaves the source. Every other action the
source carries stays on the source, with its id, `descriptionText`, `createdAt` and predicate
unchanged (§5.6 invariant 3).

_When the source is soft-deleted._ Only when the transfer removes its LAST remaining field action,
and only in the same mutation as the host write. An emptied source is soft-deleted via the normal
`deletedAtEpochMs` stamp, so it leaves candidacy and frees its uniqueness slot exactly as a
user-initiated delete does. A source that still carries another field is never deleted. The fate is
stated to the user before the write in both cases (M-07).

_How undo restores._ Because (1) makes the transfer a single undo group, one Ctrl+Z restores the
host's actions, the source's actions and the source's `deletedAtEpochMs` together. This is the
reason atomicity is required rather than merely preferred: a two-call transfer would need two undos
in the right order to be recoverable, and a user who performed only the first would be left with the
field on neither rule.

_Honest limits._ This resolution is scoped to ONE local Loro mutation. It is not a distributed
transaction, not a lock, and not compare-and-swap fencing: a concurrent write on another device is
merged by the CRDT after the fact (D-007), and a locally committed transfer is not rolled back by a
later cancellation elsewhere. Bulk application and preference persistence remain separate calls
outside the transfer's undo group; this revision does not change that, and a grouped confirm must
not report a refused mutation as an applied one (§6.4).

_Alternatives considered._ (a) Keep MF-002's deferral — rejected: it leaves the acceptance criterion
open indefinitely and lets an implementer choose a non-atomic transfer by default. (b) Allow a
two-call transfer with a compensating write on failure — rejected: the compensating write can itself
fail, and it produces three undo entries for one gesture. (c) Add a revision counter for true CAS —
that is a schema change, belongs with D-002's additive model, and is recorded there rather than
adopted here. Affects S-07, S-09, S-20.

**D-020 — Timing boundary belongs to MF-003.** _Measured, recorded not redefined:_
`isNewerTransactionDate` (`src/lib/domain/automation/rules.ts`) returns
`Temporal.PlainDate.compare(candidate, reference) > 0` — STRICTLY newer, so "apply to new" from a
transaction dated 2026-07-25 skips every other row on 2026-07-25. MF-003 owns whether that boundary
should become inclusive (`>= 0`). This document records the current comparison as a fact its
examples depend on and **makes no proposal to change it**; a grouped fold inherits whatever MF-003
settles.

---

## 7. Decision and approval ledger

### 7.0 Semantic revision, and what "approved" means here

**Semantic revision:** `OWN-2026-09-07-r2`.

**Overall status at this revision:** every decision D-001..D-020 carries a concrete RESOLVED
resolution. **No user approval has been obtained.** The acceptance criterion "ambiguous cases have
an approved resolution" is therefore still **NOT met** — see §7.5. Resolved is not approved, and
nothing in this document authorises implementation.

**What the revision identifier covers.** The semantic revision names the _semantic region_ of this
contract: §1–§6 (glossary, participants, measured baseline, selection ladder, scenarios, conflict
catalogue, lifecycle orderings), the Decision / Resolution / Affected-examples columns of §7.1,
§7.2's checklist, §7.4's prototype and §7.6's manifest binding. If any of that text changes, the
revision changes and any approval recorded against the old revision is stale and must be treated as
absent.

**What is deliberately OUTSIDE the region.** The Status, "User evidence / date" and "Approved
contract revision" columns of §7.1; §7.5's gate report; §9's verification results; and the
`approval` block of `specs/016-automation-interaction-contract/ownership-approval.json`. These are
approval _metadata_. Excluding them is what makes the binding non-circular: an approver approves a
frozen semantic region, and recording their approval afterwards does not perturb the thing they
approved. Changing a _resolution_ does perturb it, so a changed resolution cannot escape
invalidation by being edited alongside its own approval row.

**How the revision is computed.** A revision label alone proves nothing — two different documents
can carry the same string. So `ownership-approval.json` also carries a `semanticDigest`: a SHA-256
over the extracted bytes of each region named above, in the declared order. Each region is extracted
from the delivered files by a deterministic rule — `§1-§6` is the text from `## 1. Glossary` up to
`## 7.`; the §7.1 region is the Decision, Resolution and Affected-examples cells of every `D-NNN`
row and nothing else; §7.2, §7.4 and §7.6 are their heading-to-next-heading slices; the prototype
region is the whole HTML file — so the digest is reproducible from the repository alone, with no
stored copy of the text to fall out of date.

The validation test `tests/unit/contracts/grouped-rule-ownership-approval.test.ts` reads the
delivered files (not a generated replacement), re-extracts every region, recomputes each per-region
hash and the combined value, and rejects any disagreement with the manifest. It also asserts that
the manifest's revision matches this document's, that every D-001..D-020 resolution in the manifest
is non-empty and semantically agrees with the prose here, and that an `approval` block, if present,
names this exact revision **and** the digest recomputed from the files as they stand. A
wrong-revision, partial, placeholder or pending approval is rejected, and so is an approval whose
digest no longer describes the delivered bytes.

**Why the digest, and not the label, is what an approval binds to.** Editing a resolution, a
scenario, a checklist row or the prototype changes the recomputed digest. Any approval recorded
against the previous digest is then stale by arithmetic, and stays stale even if the revision label,
the per-region hashes and the manifest's own `semanticDigest.value` are all edited to agree with the
new text — because the approval carries its own `approvedSemanticDigest`, and the validator compares
that against the value it computes from the files, never against the manifest's copy. Recording or
amending approval evidence, by contrast, touches only excluded metadata and leaves the digest
intact, so an evidence-only correction does not invalidate a genuine approval.

### 7.1 Status of every decision

`Settled` = fixed by the mission statement. `Measured` = an assertion about shipped behaviour,
backed by a named test; no approval needed because it is not a choice. `RESOLVED` = this revision
states a concrete, reviewable resolution — it is a decision an approver can accept or reject, and it
is **still not approved semantics and authorises no implementation** until the last two columns are
filled with authentic user evidence naming `OWN-2026-09-07-r2`.

Every row below is RESOLVED. That includes the rows whose resolution is "preserve current behaviour"
and the rows MF-002 recorded as measured-only: a no-change decision still needs scoped approval to
close this contract, because "leave it as it is" is itself a choice about ambiguous semantics.

| Decision                                  | Resolution at this revision                                                                                                                                                                                                    | Affected examples           | Status   | User evidence / date | Approved contract revision |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | -------- | -------------------- | -------------------------- |
| D-001 Preferred host                      | Prefer the description(-alias) rule, but ONLY within the identical-predicate candidate set (D-004) and ONLY where it does not displace an existing owner of the edited field (D-003). Preference is not unconditional merging. | S-05, S-07, S-10            | RESOLVED | —                    | —                          |
| D-002 Grouped writes need new capacity    | Multi-field rules are an ADDITIVE model change — a rule holds a set of per-field actions — designed, migrated and approved separately. Until it exists, every "grouped" surface is a presentation over N single-field rules.   | all                         | RESOLVED | —                    | —                          |
| D-003 Edited field already owned          | The existing owner WINS by default and is updated in place; no transfer. Consolidation into the preferred host is an explicit, labelled, previewed choice that states the source rule's fate and the population change first.  | S-07, S-09                  | RESOLVED | —                    | —                          |
| D-004 Predicate mismatch                  | Fold only when `(descriptionText, accountId, amount)` is identical. Never adopt the host's predicate silently; when it differs, update the edited field's own owner or create, and say why. Show the host's STORED predicate.  | S-03, S-05, S-08            | RESOLVED | —                    | —                          |
| D-005 Ambiguous fallback                  | If the edited field already has an owner inside the candidate set, that owner is the default target. Otherwise present every candidate with its predicate and outputs and REQUIRE an explicit choice. No implicit tiebreak.    | S-09                        | RESOLVED | —                    | —                          |
| D-006 Drift on the host                   | Show the host's currently implied value beside the row's actual value and require acknowledgement before writing. Never auto-reconcile in either direction.                                                                    | S-13                        | RESOLVED | —                    | —                          |
| D-007 Local ≠ global uniqueness           | Preserve current behaviour: local collision checking only. Surface a duplicated slot as a repair prompt naming both rules; never auto-dedupe live user rules, and never fold into a duplicated slot. No CAS is introduced.     | S-14, S-20                  | RESOLVED | —                    | —                          |
| D-008 No compare-and-swap                 | Preserve the existence-only guard; add no revision counter here. A grouped confirm must RE-READ the target and re-present it when its predicate or any action changed since the surface opened, rather than overwrite it.      | S-02..S-13                  | RESOLVED | —                    | —                          |
| D-009 Deleted target                      | Preserve the measured `not-found` with no resurrection. The surface must distinguish "your target no longer exists" from "your input was invalid", and OFFER a create rather than performing one.                              | S-02, S-05, S-07            | RESOLVED | —                    | —                          |
| D-010 Occupied destination                | Preserve the `duplicate-key` refusal with zero mutation. Present the named holder as an OFFERED alternative host; never auto-retarget onto it, which would be a silent merge.                                                  | EX-13, EX-15, S-07          | RESOLVED | —                    | —                          |
| D-011 Identical predicate + output        | Consolidation is a named action with a preview naming the surviving id, the deleted id and the freed uniqueness slot. Never an automatic migration, never a side effect of editing an unrelated field.                         | S-07, S-20                  | RESOLVED | —                    | —                          |
| D-012 Duplicate slots / undecodable rules | Never offer a duplicated slot or an undecodable record as a fold host. Repair stays an explicit user-visible action. Note EX-17: deleting an undecodable record stamps the tombstone and still reports `not-found`.            | S-14, S-15                  | RESOLVED | —                    | —                          |
| D-013 Repeated blur / queued work         | One gesture writes at most once, enforced by construction in the confirm path rather than by a ref a refactor can drop. A multi-write sequence must not be BEGUN when the surface may be gone; queued work is fenced.          | all transaction-surface S-* | RESOLVED | —                    | —                          |
| D-014 Tag mode                            | Carry the host's `add`/`set` mode explicitly in the UI and require confirmation when the remembered mode differs. Never infer the mode from the row's resulting tag set.                                                       | S-12, EX-11                 | RESOLVED | —                    | —                          |
| D-015 Allocation is a whole set           | A fold carries the entire validated allocation set. There is no partial "add one person" fold; an incomplete set is refused at the boundary with zero mutation.                                                                | S-09                        | RESOLVED | —                    | —                          |
| D-016 Cancellation                        | Cancel writes NOTHING — no rule, no application, no remembered preference — and is available in every conflict state. Because the calls have no cross-call rollback, cancel must take effect before the first call.            | all                         | RESOLVED | —                    | —                          |
| D-017 No cross-call atomicity             | A grouped transfer is performed as ONE local vault mutation (one undo group) after validating every precondition, or consolidation ships DISABLED. Emptied sources are soft-deleted in the same mutation. See §6.7.            | S-07, S-09, S-20            | RESOLVED | —                    | —                          |
| D-018 Apply/Delete are not a bypass       | Preserve both as legitimate actions on an existing rule; neither resolves an ownership question. Apply is not consent to a fold, and deleting a rule is not the mechanism by which a fold wins a contested field.              | S-07, S-09                  | RESOLVED | —                    | —                          |
| D-019 Failure cleanup                     | Validate every intended write before performing the first; a rejected or cancelled proposal leaves rules, applications and preferences untouched. A refused mutation is never reported as an applied one.                      | all                         | RESOLVED | —                    | —                          |
| D-020 Timing boundary                     | Preserve the strictly-newer comparison as recorded fact and make NO proposal to change it here; MF-003 owns the boundary. A grouped fold inherits whatever MF-003 settles.                                                     | all                         | RESOLVED | —                    | —                          |

**Every resolution above is concrete and reviewable; none is approved.** The last two columns are
empty because no user approval has been sought or given at `OWN-2026-09-07-r2`. Workflow review, a
green test suite, an agent verdict, prototype clicks and silence are **not** user approval. The
feature acceptance criterion "ambiguous cases have an approved resolution" is therefore **NOT met**
at this revision; §7.5 reports that gate separately from the documentation, test and prototype work.

**How to record an approval.** Fill "User evidence / date" with a durable reference to where the
approval was given (message or document id, approver, date, and the quoted authorisation), and
"Approved contract revision" with the exact semantic revision approved. An approval of a different
revision does not carry forward: if a resolution changes, the revision changes and the row returns
to unapproved.

### 7.2 Downstream mockup checklist

For the automation-mockup review that follows this contract. Each item names what the mockup must
make visible, and the example/decision it exists to answer. **No HTML, component or table change is
made by MF-002.**

| #    | The mockup must show                                                                                                                                    | Answers      | Scenarios              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------- |
| M-01 | The TARGET's identity: which rule this edit will change, by a name the user can recognise in the manager                                                | D-003, D-005 | S-02, S-06, S-07, S-09 |
| M-02 | The target's ACTUAL stored predicate — description text, account and amount as stored, not as seeded from this row (the measured hazard in §4.3 / G-01) | D-004        | S-03, S-05, S-08       |
| M-03 | The target's OTHER outputs that the fold does not touch, so the user sees what else the rule does                                                       | D-002, D-003 | S-05, S-10             |
| M-04 | Existing owners of the edited field when they are not the target, named, with an explicit choice between them                                           | D-003, D-005 | S-07, S-08, S-09       |
| M-05 | A drift explanation: what the host currently implies vs what this row has                                                                               | D-006        | S-13                   |
| M-06 | The population consequence in words — how many/which rows change, and whether that set is broader or narrower than before                               | D-003, D-004 | S-05, S-07, S-08       |
| M-07 | For any transfer: the source rule's FATE (deleted, or retained and still winning) stated before the write                                               | D-003, D-011 | S-07                   |
| M-08 | Tag mode as an explicit, labelled control, with a confirmation when the host's mode differs from the remembered one                                     | D-014        | S-12                   |
| M-09 | Allocation folds presented as the whole validated set                                                                                                   | D-015        | S-09                   |
| M-10 | A duplicated slot surfaced rather than silently resolved; an undecodable rule never offered as a host                                                   | D-007, D-012 | S-14, S-15             |
| M-11 | A cancel that writes NOTHING — no rule, no application, no remembered preference — available in every conflict state                                    | D-016, D-019 | all                    |
| M-12 | The "target changed / target deleted since you opened this" states, distinct from a validation error                                                    | D-008, D-009 | S-02..S-13             |
| M-13 | The `duplicate-key` state naming the rule that holds the slot, offered as an alternative host rather than auto-selected                                 | D-010        | EX-13, EX-15           |
| M-14 | Consolidation as a named, previewed action — never a side effect of editing an unrelated field                                                          | D-011, D-018 | S-07, S-20             |

### 7.3 Handoff

- **To the approval gate:** every §7.1 row, via the §7.4 prototype and the §7.2 checklist. Approve
  the exact semantic revision named in §7.0; record it in the last two columns of §7.1 and in the
  manifest's `approval` block (§7.6).
- **To MF-001/MF-005** (`specs/016-automation-interaction-contract/matching-audit.md`): §2 and §4.1
  are ownership-side measurements of the same matching engine. That task owns the audit; nothing
  here overwrites it, and neither MF-002 nor MF-007 wrote to its path.
- **To MF-003** (`.../scope-and-automatic-application.md`): D-020 records the strictly-newer
  comparison as a fact only. Scope and automatic-application timing are MF-003's to settle.
- **To a future implementation task:** D-002 is the prerequisite. Until an additive multi-field
  model exists and is approved, any "grouped" surface is a presentation over N single-field rules,
  and §5.6's invariants bound whatever is built.
- **What approving this contract does NOT approve.** It settles ownership and conflict semantics
  only. It is not approval of the broader automation manager / rule-creation / rule-editing design,
  not approval of the transaction-table interaction refinements, and not authorisation to implement
  D-002's schema change. Those remain separate approvals on separate artefacts.

### 7.4 The approval prototype

`specs/016-automation-interaction-contract/ownership-approval.html` is a single self-contained file
of synthetic data that renders each conflict class as an interactive scenario, so an approver can
see what they are being asked to approve rather than read it alone. It has no import of production
code, no network access, no credentials and no route in the application; it is opened directly from
the tracked file. Its scenarios cover the five required example classes and every M-01..M-14
checklist item, and every screen states the decision ids it demonstrates plus the approval status of
the semantics on display.

**A click in the prototype is a simulation, never an approval.** The prototype writes nothing, and
choosing an option inside it records nothing anywhere. Approval is recorded only in §7.1 and the
manifest's `approval` block, from an authenticated external channel (§7.0).

`tests/e2e/grouped-rule-ownership-approval.spec.ts` drives the tracked file at 1280×800 and 390×844
and asserts the demonstration holds: an ambiguous host set cannot be confirmed without an explicit
choice, a mismatched predicate refuses to fold, a stale or deleted target invalidates confirmation,
an occupied slot never auto-retargets, cancel leaves every simulated rule and preference intact, and
Apply/Delete never resolve a conflict. Those assertions prove the PROTOTYPE demonstrates the
resolutions. They prove nothing about production runtime, which does not implement grouping at all.

### 7.5 Approval gate status

| Gate                                                        | Status                                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Every D-001..D-020 has a concrete, reviewable resolution    | **MET** — §7.1, §5.5, §6.7. D-017 is resolved, not deferred.                              |
| All five example classes covered and evidenced              | **MET** — §5.4 (S-01..S-20) and the named EX-* tests in §3/§4.                            |
| No unrelated rule silently merges                           | **MET** — §5.3 steps 1 and 6, D-005, D-010, and `leaves every unrelated rule's … intact`. |
| Decisions demonstrated in a reviewable prototype            | **MET** — §7.4, M-01..M-14.                                                               |
| **Authentic user approval bound to this semantic revision** | **NOT MET** — no approval has been obtained at `OWN-2026-09-07-r2`; see the note below.   |

The last row is an EXTERNAL gate. It cannot be closed by this document, by a test run, by workflow
or agent review, by a prototype interaction, or by the absence of an objection. Until a real
approver states their decision through a durable channel, the feature acceptance criterion
"ambiguous cases have an approved resolution" is **not met**, and this document says so rather than
relabelling the rows to appear complete.

### 7.6 Manifest binding

`specs/016-automation-interaction-contract/ownership-approval.json` is the machine-readable form of
§7.1 and §7.4. It carries:

- `semanticRevision` — must equal §7.0's identifier.
- `semanticRegions` — the exact region list from §7.0, so the hashed scope is explicit rather than
  implied. Status and approval metadata are outside it by construction.
- `semanticDigest` — `algorithm` (`sha256`), one `sha256` per declared region, and the combined
  `value` over `region\nhash` lines in the declared order. This is the content identity a revision
  label cannot express.
- `decisions` — one entry per D-001..D-020 with `id`, `title`, `resolution`, `affectedExamples` and
  `scenarioClasses`. A resolution may not be empty, a placeholder, or the word "pending".
- `exampleClasses` — the five required classes, each naming the scenarios and tests that cover it.
- `prototype` — the tracked HTML path, its M-* coverage, and its viewport list.
- `approval` — `null` while unapproved. When present it must name the approver, the durable evidence
  reference, the date, the quoted authorisation, the `approvedSemanticRevision`, which must equal
  `semanticRevision`, and the `approvedSemanticDigest`, which must equal the digest RECOMPUTED from
  the delivered files rather than the manifest's own stored copy. A partial, placeholder, pending,
  wrong-revision or stale-digest block is invalid and the validator rejects it rather than accepting
  a weaker record.

`tests/unit/contracts/grouped-rule-ownership-approval.test.ts` validates the DELIVERED files. It
reads this document, the manifest and the prototype from disk, re-extracts every declared region,
recomputes each per-region hash and the combined digest, checks that every decision id appears in
both with agreeing resolutions, that no class or scenario reference dangles, and that the approval
block — if present — is complete, names the current revision and binds to the recomputed digest. It
also carries negative fixtures proving the validator rejects the historical pending condition, a
missing D-017, a blank resolution, a dropped class, duplicate and orphan decisions, placeholder
evidence, approval of a superseded revision, a semantic region edited without its hash, a manifest
digest that no longer describes the delivered bytes, and an approval left in place across a semantic
or prototype edit — while an evidence-only amendment keeps a genuine approval valid.

## 8. Gaps and untested claims

Recorded as gaps, not guarantees.

- **G-01** — Draft seeding (§4.3) is described from source reading, not from an executable
  assertion. It is a React hook; characterising it needs a component-level test, which MF-002 does
  not add.
- **G-02** — No compare-and-swap fencing exists for a target that was EDITED rather than deleted
  (D-008). `EX-14` covers the deleted case only; the changed case is unasserted because asserting it
  would mean asserting a lost update as desirable.
- **G-03** — Post-sync uniqueness (D-007) is reasoned from `findUniquenessCollision` operating on
  local state plus the CRDT merge semantics. MF-002 adds no multi-peer test; a real two-document
  merge test would belong with the sync surfaces.
- **G-04** — Browser-level behaviour of the proposal surface (focus, portals, cancellation) is
  covered only by the existing unit and E2E files cited as TIMING evidence. MF-002 asserts nothing
  new about the browser, and the §7.2 checklist items are design requirements, not measurements.
- **G-05** — Recovery paths (hydration from a corrupted document, undo across a partially applied
  confirm) are described from source; no failure-injection test exists.
- **G-06** — Undo grouping for a future grouped transfer is undefined because the capability does
  not exist (D-017). This is an open design question, not an untested claim about shipped code.

---

## 9. Verification results

MF-007 re-ran every required gate in this worktree at `d6581c9` on 2026-09-07; those results are
§9.4–§9.6. §9.0–§9.3 preserve MF-002's run at `1075230` as provenance — **history, not newly
executed results**.

### 9.0 MF-002's historical run — provenance only

Run in MF-002's worktree at the audited revision on 2026-09-06. Exact outcomes, including the two
gates that did not come back clean.

| Gate                                                                        | Result                                                                                                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Impacted vitest (10 files: the new contract file + the 9 named in the task) | **PASS** — 10 files, 161 tests, 0 failures. The new file contributes 24 tests (`EX-01`..`EX-16`).                                                        |
| `pnpm typecheck`                                                            | **PASS** — exit 0.                                                                                                                                       |
| `pnpm lint`                                                                 | **PASS** — 0 errors. One pre-existing warning, `react(incompatible-library)` on `TransactionVirtualRows.tsx:99` (TanStack Virtual), untouched by MF-002. |
| `pnpm format:check`                                                         | **PASS** — all 1067 files correctly formatted (oxfmt reflowed this document's tables during Step 4).                                                     |
| `pnpm build`                                                                | **PASS** — exit 0, 17 routes generated.                                                                                                                  |
| `pnpm test` (full workspace)                                                | **1 failed file** — see below.                                                                                                                           |
| `pnpm test:e2e`                                                             | **Could not run as configured; run on a scratch port instead** — see below.                                                                              |

### 9.1 The full-suite failure

`tests/integration/realtime-origin-controls.test.ts` failed once in the workspace run
(`reads only its own vault's ops even when the request claims a hostile origin`, an
`Array.isArray(allRows)` assertion after a live Supabase Realtime round trip). The same file passes
**9/9 in isolation**, verified on two separate runs. It is load-sensitive against the local Realtime
stack. MF-002's entire diff against the base commit `3bc789c` is two files —
`specs/automation-rule-ownership.md` and `tests/integration/grouped-rule-ownership-contract.test.ts`
— with **no `src/` change at all**, so no mechanism connects this task to a realtime-authorization
assertion. Classified as a pre-existing load-sensitive flake, recorded here rather than repaired,
because repairing it would mean editing a realtime test this task has no mandate over.

### 9.2 The E2E gate

`playwright.config.ts` pins `http://localhost:3000` with `reuseExistingServer: false`. At run time
`:3000` was held by a `next-server` whose `/proc/<pid>/cwd` resolves to
`/home/ben-agents/Code/moneyflow` — the **main checkout, not this worktree** — so it was not killed,
and `pnpm test:e2e` exited 1 at startup without running a test.

The suite was therefore run on an untracked scratch config bound to port 3100 (deleted afterwards;
nothing tracked was changed): **196 passed, 6 failed**. All six failures are in the four specs that
hardcode `browser.newContext({ baseURL: "http://localhost:3000" })` instead of inheriting the
config's `baseURL` — `presence.spec.ts` (×3), `realtime-security.spec.ts`,
`tab-duplication.spec.ts`, `transactions.spec.ts:418`. On port 3100 those contexts navigate to the
_other_ checkout's server, so the failures are an artifact of the port move, not of this branch.
Every automation-relevant spec passed on that run: `automations.spec.ts`,
`field-rule-parity.spec.ts`, `rule-creation-controls.spec.ts` and `transaction-rules.spec.ts`.

**Stated honestly:** the E2E gate has **not** been run in its configured form. A clean run requires
`:3000`, which belongs to another process. This is an environment contention, not a defect in the
branch, and it is recorded as an outstanding gate rather than reported as passed.

### 9.3 What the tests do and do not establish

The 24 assertions in `tests/integration/grouped-rule-ownership-contract.test.ts` exercise the
production APIs directly — `computeFieldRuleProposal`, `createFieldRule`, `updateFieldRule`,
`deleteFieldRule`, `readActiveFieldRules`, `createVaultMirror`, `applyFieldRulesToAllTransactions` —
with no test-only selector standing in for a production one. They establish the **measured
baseline** of §4 and the measured rows of §6 and §7.1. They establish **nothing** about the PROPOSED
column: no automated assertion is, or can be, user approval. The acceptance criterion "ambiguous
cases have an approved resolution" remains **unmet** at this revision (§7.1).

### 9.4 MF-007's gate run — executed 2026-09-07 at `d6581c9`

Every command below was run in this worktree
(`/home/ben-agents/Code/moneyflow/.worktrees/plush-thorn`, branch `fusion/mf-007`) on 2026-09-07.
These are MF-007's own results, not MF-002's.

| Gate                                                                                    | Command                                                                       | Result                                                                                                                        |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Impacted vitest (9 files named by the task plus the two MF-007 contract/approval files) | `pnpm exec vitest run <9 files>`                                              | **PASS** — 9 files, 171 tests, 0 failures.                                                                                    |
| `pnpm typecheck`                                                                        | `pnpm typecheck`                                                              | **PASS** — exit 0.                                                                                                            |
| `pnpm lint`                                                                             | `pnpm lint`                                                                   | **PASS** — 0 errors, 1 pre-existing warning (`react(incompatible-library)`, `TransactionVirtualRows.tsx:99`), untouched here. |
| `pnpm format:check`                                                                     | `pnpm format:check`                                                           | **PASS** — all 1072 files correctly formatted (two MF-007 test files were reformatted at `d6581c9` to reach this).            |
| `pnpm test` (full workspace)                                                            | `pnpm test`                                                                   | **PASS** — 161 files, 0 failures, after supplying `.env.local` (see §9.5).                                                    |
| Prototype E2E                                                                           | `pnpm exec playwright test tests/e2e/grouped-rule-ownership-approval.spec.ts` | **PASS** — 39/39 at 1280×800 and 390×844.                                                                                     |
| `pnpm test:e2e` (configured form)                                                       | `pnpm test:e2e`                                                               | **NOT RUN as configured** — `:3000` is held by another checkout's dev server; see §9.6. 163/163 passed on a scratch port.     |
| `pnpm build`                                                                            | `pnpm build`                                                                  | **PASS** — exit 0.                                                                                                            |

### 9.5 The full-suite failure of §9.1 does not reproduce

MF-002 recorded `tests/integration/realtime-origin-controls.test.ts` failing once under `pnpm test`
and classified it as a load-sensitive flake. In MF-007's worktree the initial `pnpm test` failed
that file **and** `realtime-socket-security.test.ts`, but for a different and fully explained
reason: a fresh worktree has no `.env.local` (it is gitignored), and since MF-004 those suites fail
loudly with an actionable message naming `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` rather than skipping. After
`cp /home/ben-agents/Code/moneyflow/.env.local .env.local` — the documented worktree-setup step, and
an untracked gitignored file — the full workspace suite passes: **161 files, 0 failures**, in 75s.

So the outstanding full-suite failure reported by the validator is **cleared**, not re-classified:
this run is clean, and the earlier failure was worktree setup, not the branch. MF-004's fix for the
historical origin-controls flake held.

### 9.6 The E2E gate, run honestly

`playwright.config.ts` pins `baseURL: http://localhost:3000` with `reuseExistingServer: false`.
`:3000` is held by `next-server` pid 2413658, whose `/proc/<pid>/cwd` resolves to
`/home/ben-agents/Code/moneyflow` (the main checkout) and whose ancestry terminates in a `-zsh` on
`pts/1` started 2026-08-29 — i.e. the user's own dev server, not this task's. It was **not** killed.
`pnpm test:e2e` therefore exits 1 at startup with `http://localhost:3000 is already used`; that is
recorded as the configured gate **not run**, not as a pass.

Two substitute runs were performed, both on untracked scratch configs deleted before commit:

1. **The prototype spec, the only E2E this task adds.**
   `tests/e2e/grouped-rule-ownership-approval.spec.ts` loads the tracked HTML over `file://` and
   needs no server at all, so it ran on a config with no `webServer`: **39/39 passed** at both
   viewports.
2. **The rest of the suite on port 3100.** A config spreading the base config with
   `baseURL: http://localhost:3100` and `command: pnpm run dev --port 3100` ran the 18 port-portable
   specs (`grep -rL "localhost:3000" tests/e2e/*.spec.ts`): **163/163 passed**, exit 0. The 8 specs
   that hardcode `http://localhost:3000` inside `browser.newContext`/`page.goto` were excluded
   rather than expected to pass, because on an alternate port they silently talk to the other
   checkout's server. This is why MF-002's port-3100 attempt reported 6 failures: it ran them.

**Stated plainly:** the configured `pnpm test:e2e` has not been run, because doing so requires
either killing the user's dev server or reconfiguring the port. Every spec that could be run
truthfully on this branch was run and passed, including all four automation-relevant specs
(`automations`, `field-rule-parity`, `rule-creation-controls`, `transaction-rules`) and the new
prototype spec. The excluded 8 are excluded for a port-binding reason unrelated to this branch,
which touches no `src/` file.
