# Rule reach — implementation plan

Status: in progress on `feat/transaction-editing-and-automation-rules`, in PR #67, on top of the
grouped-rules work. Behaviour source of truth: `spec.md` in this folder. Everything from PR #67 is
reused: grouped outputs, the extension ladder, the shared editor, the inspector cards, the
description-text index, the mutation discipline.

## Decisions taken for this implementation

1. **Narrowest at commit.** Finishing an edit always creates a one-row rule (or updates the row's
   existing one-row rule). Widening and folding are explicit actions on a rule card. See spec 3.1.
2. **Reach rank.** Explicit-set reach outranks date and all reach; date and all share a rank and
   fall through to conditions. Among explicit-set rules on one slot, sets are disjoint by
   uniqueness, so no two can govern the same row.
3. **Wire.** `reach` is an optional map on the rule: `{ kind: "all" }`, `{ kind: "from"; date }`, or
   `{ kind: "transactions" }` with a sibling `reachTransactionIds` LoroMapRecord of id → true. A
   rule without `reach` decodes as `all`, so no data migration and every existing rule governs what
   it governs today.
4. **Removed.** The pending proposal state, the blur finalizer, the "apply on blur" checkbox and the
   four-mode remembered apply preference. The preference record keeps its restriction fields; its
   `lastApplyMode` column stays on the wire, unused.
5. **The ownership contract document is not edited**; the reach spec supersedes it and says so.

## Phase R1 — domain, engine, CRDT

**Domain (`src/lib/domain/automation/`)**

- `rules.ts`: `RuleReach` type and `FieldRule.reach`; `ruleReaches(rule, transactionId, date)`;
  `ruleGoverns(rule, subject, transactionId, date)` = `ruleMatchesSubject` and reaches;
  `ruleScopeRank` gains the reach dimension as the most significant component (one new rank level
  for explicit-set reach); `selectWinningRule` takes the transaction id and date through the subject
  (`RuleMatchSubject` gains `transactionId` and `date`); uniqueness keys gain the reach kind, and
  `findUniquenessCollision` additionally refuses an explicit-set rule whose set intersects another
  explicit-set rule's set on the same field and slot. Decode defaults reach to `all`; encode writes
  it.
- `extension.ts`: the ladder is retargeted to the fold offer. Given a one-row rule on a row and the
  other rules with identical conditions, return `fold-extend { host }` when a host lacks the field,
  `fold-update { owner }` when a host owns the field, `ambiguous`, or `none`. Same ordering rules as
  today; same no-tiebreak guarantee.
- `population.ts`: counts rows a rule would govern under a candidate reach, used for the "N
  transactions change" line when widening; unchanged signature plus a `reach` override.
- `apply.ts`: `planRuleApplications` filters by governs, so import and bulk apply only touch
  governed rows.

**CRDT (`src/lib/crdt/`)**

- `schema.ts`: `reach` and `reachTransactionIds` on `fieldRuleSchema`.
- `field-rule-mutations.ts`:
    - `createFieldRuleFromEdit(state, { transactionId, date, descriptionText, accountId?, amount?, field, output })`
      → one-row rule, or updates the existing one-row rule on that slot for that row.
    - `setFieldRuleReach(state, { id, reach })` → validates the collision rule, writes the reach,
      applies outputs to newly governed rows in the same draft, returns the applied count. Narrowing
      to explicit-set captures the currently governed ids and applies nothing.
    - `extendFieldRuleReachToTransaction(state, { id, transactionId })` → adds one id, applies to
      that row.
    - `foldFieldRuleIntoHost(state, { oneRowRuleId, hostId })` → host output updated (or added) and
      applied across host reach, one-row rule soft-deleted; one draft.
    - `splitFieldRuleOutput` and `moveFieldRuleOutput` carry reach; move refuses `reach-mismatch`.
    - `removeTransactionFromRuleReach(state, transactionIds)` called from `deleteTransaction`,
      `deleteTransactionsByImport` and the duplicate merge path in `mutations.ts`; an emptied set
      leaves the rule in place.
- `field-rules.ts`: `applyFieldRulesToImport` applies only governing rules per row; bulk apply by
  reach; `readActiveFieldRules` unchanged.
- `context.tsx`: hooks for the new mutations; `useApplyFieldRules` keeps `applyAll`/`applyNewerThan`
  only as the implementation behind `setFieldRuleReach`.

**Tests (R1)**: unit tables for reach rank, governs, uniqueness with overlapping sets, decode
default; fast-check property that the index-backed winner still equals the list winner with reach;
the fold ladder over the spec's worked examples E1–E12; integration tests for every new mutation
(happy path, each refusal with zero mutation), id maintenance on delete/import-delete/merge, import
governing by reach; existing tests updated deliberately where the old "every active rule applies on
import" expectation changes.

## Phase R2 — inspector, Automations page, removals

- Grid controller: replace the proposal atom and finalizers with a live editor-draft channel
  (`publishAutomationEditorDraft(address, draftValue)`) the inspector reads for the preview, and a
  commit hook that calls `createFieldRuleFromEdit`. Delete `registerAutomationFinalizer`,
  `setAutomationProposalDraft/Errors/Renderable`, `dismissAutomationProposal` and their state. The
  automation binding keeps `{ kind: "automation-rule"; ruleId }` for cards and gains
  `{ kind: "automation-preview" }` for the preview block.
- Inspector: a preview block while a cell is being edited; one card per rule that governs the row
  (one-row rules first, then wider); each card has a **Reach** control (three kinds with live counts
  and a date input for `from`), **Save**, **Cancel**, **Delete rule**; a one-row card whose row is
  also governed by a wider rule shows the fold offer from the ladder; a wider same-text rule that
  does not reach the row shows "Extend to this transaction". Divergence badges unchanged. Delete and
  Split keep their dialogs.
- `RuleEditor`: the scope radios and blur checkbox become the Reach control; `pendingField`,
  `resolution` and `populationCount` are reused for the fold offer and counts.
- Automations page: Save instead of Apply; Reach control inside the editor; list grouped by reach
  kind with the explicit-set group collapsed and counted; empty-reach rules marked.
- Toolbar drift signal unchanged.
- Preferences: remove `applyOnBlur` and `scope` from the draft and `applyModeFrom`; keep restriction
  seeding.
- Tests (R2): unit tests for the preview block, the reach control, the fold offer and the grouped
  list; E2E rewritten for the new flow across `rule-creation-controls`, `transaction-rules`,
  `field-rule-parity`, `automations` and `description-aliases`, covering E1–E12 end to end, with
  `test.step`s on existing journeys where possible.

## Phase R3 — docs and PR

- `behaviour.md` sections 3 to 6 rewritten for reach with provenance marks; `domain-model.html`
  gains reach on the rule entity and the reach rank in the lattice; the mockup gets a reach control
  scenario replacing the scope radios; `implementation-plan.md` hand-off updated; PR #67 title and
  description refreshed.

## Verification

`run check` with `MONEYFLOW_E2E_PORT=3108` green at the end of each phase; each phase committed.
