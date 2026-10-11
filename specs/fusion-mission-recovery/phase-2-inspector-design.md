# Inspector integration design for Phase 2 of `implementation-plan.md`

Scope: `TransactionInspectorAutomation.tsx`, its two hooks, the two pure state modules, one new
member in the grid controller's binding union, the toolbar and the page. The controller's proposal
atom, finalizer map and owner-exit semantics stay exactly as they are. All paths are relative to the
repository root.

Note on concurrent edits: the uncommitted work in `src/lib/domain/automation/extension.ts` adds a
sixth target kind, `ineligible`, for an alias edit on a manual row. The design below treats it as
"nothing to propose".

## Plan corrections

The two corrections that change the plan's stated approach:

1. **Conflict move needs the new value.** `moveFieldRuleOutput` at
   `src/lib/crdt/field-rule-mutations.ts:369` moves the owner's stored output into the host. The
   mockup at `mockups/rule-editor.html:1590-1596` and D-003 expect the host to receive the user's
   new value and the owner to be deleted. Calling `moveOutput` then `setOutput` is two vault actions
   with no rollback, which D-019 rules out. Add an optional `output` to `MoveFieldRuleOutputInput`,
   typed as the input output for `field`, and have the mutation write
   `{ field, output: input.output ?? moved.output }` into the host. That file is under concurrent
   edit, so coordinate the one-line addition.
2. **Target rule shown twice.** "One card per winning rule plus the proposal card" renders the
   proposal's target rule twice. Fold the target rule's card into the proposal card while the
   proposal is pending, as in section 1 below and as the mockup's `inspectorCards` does.

Smaller corrections, also applied in the design below:

3. **`computeFieldRuleProposal` `update` kind is obsolete.** Reduce it to the eligibility gate; the
   ladder decides ownership.
4. **Focus anchor.** The per-field headings go away; a registered Automation heading replaces them.
5. **`ineligible` target.** The card treats it as not renderable, and the existing effect at
   `TransactionInspectorAutomation.tsx:92-100` dismisses the proposal.
6. **Engine scope.** `applyAll` and `applyNewerThan` apply every rule to the population. Keep that;
   the plan's "apply at scope" is not a per-rule apply.

## Design decisions

**1. Cards and registration.** Card set for the active row:

- Rule cards: `selectWinningRulesByField(rules, subject)` at
  `src/lib/domain/automation/rules.ts:360`, deduplicated by rule id, sorted by `ruleScopeRank`
  descending then id. One `RuleEditor` in edit mode each.
- Proposal card: rendered when `snapshot.automation.proposal.owner.transactionId === transactionId`
  and the workflow is renderable, same gate as today at `TransactionInspectorAutomation.tsx:92-100`.
- Fold, do not duplicate. A rule named by the proposal target, meaning `update-owner.rule`,
  `extend.rule`, `conflict.owner`, `conflict.host` or the chosen `ambiguous` candidate, is removed
  from the rule-card list while the proposal is pending. The plan's wording would render that rule
  twice; the mockup's `inspectorCards` at
  `specs/fusion-mission-recovery/mockups/rule-editor.html:1140-1185` shows it once. Other winning
  rules stay visible.

Recommendation: extend the binding union. Field-keyed registration collides in two real cases. Two
winning rules can share a first output field, for example R1 with tags and allocation unscoped and
R2 with tags amount-scoped, where R2 wins tags and R1 wins allocation. And in the `extend` case the
proposal card keyed by the pending field collides with the broader rule that currently wins that
field. `registerInspectorControl` at `useTransactionGridController.ts:2634-2650` overwrites the
earlier registration under the same key, which silently breaks focus retention for one card.

Changes:

- `table-model/grid-interaction-state.ts:79-87`: add
  `TransactionInspectorAutomationRuleBinding { kind: "automation-rule"; ruleId: string }` to the
  union. Keep `TransactionInspectorAutomationBinding { kind: "automation"; field }` for the proposal
  card only.
- `table-model/grid-interaction-state.ts:74-77`: add `"automation"` to the action binding's action
  list. Used by the focus anchor below.
- `table-model/index.ts:91`: export the new type.
- `table-model/grid-reconciliation.ts:71-85` `transactionInspectorBindingEquals`: new case comparing
  `ruleId`.
- `hooks/useTransactionGridController.ts:608-618` `inspectorBindingKey`: new case returning
  `automation-rule:${ruleId}`.

Registration keys from `inspectorRegistrationKey` at l.621 become
`["<txId>","automation-rule:<ruleId>"]` for rule cards, `["<txId>","automation:<field>"]` for the
proposal card and `["<txId>","action:automation"]` for the heading. Every other reader is generic
over the binding and needs no change: `registeredInspectorOwner` l.884,
`isRegisteredInspectorTarget` l.936, `inspectorControlElementAt` l.1404,
`retainedInspectorFocusElement` l.1414, `inspectorControlRegistrationWakesFocus` l.2195,
`setInspectorInteraction` l.2388, and `bindingSurvives` plus `inspectorFocusResult` in
`grid-reconciliation.ts:88-160`. Owner exit is unaffected because `finalizeAutomationOwnerExit`
l.996 keys on `transactionAutomationOwnerKey(proposal.owner)`, never on a binding.

Each card component registers its root `div` with `registerInspectorControl` and passes
`registerInspectorPortal` through `RuleEditor`'s `registerPortal` prop. `RuleEditor` must forward
that callback to every `SelectContent` it renders: alias select, tag mode select, add-output select,
and the standalone account select.

Focus anchor. The per-field `h4` with testid `${field}-automation-title` disappears, and with it the
"focus a stable element before unmounting the focused control" target. Move the
`<h3 id="transaction-inspector-automation-title">Automation</h3>` from
`TransactionInspector.tsx:402-407` into `TransactionInspectorAutomation.tsx`, give it
`tabIndex={-1}`, and register it as a control with `{ kind: "action", action: "automation" }`. The
heading contains no cards, so the first-match containment walk in `registeredInspectorOwner` is
unambiguous. Every confirm, cancel, delete, split and apply-this handler calls
`focusAutomationHeading()` first, then mutates, as `dismissFromControl` and `confirm` do today at
l.75-85. Because the heading is a registered control, `enterInspector` records a live binding
instead of leaving the engagement pointing at an unmounted card, and `handleInspectorFocusOut`
l.2351 sees a registered relatedTarget and never parks. Parking would call
`finalizeAutomationOwnerExit(null)` at l.1491 and double-apply, which is the hazard the existing
pattern guards against.

**2. Proposal lifecycle.** Controller API: unchanged. `TransactionAutomationProposalState` l.275
keeps `owner`, `draftOverride`, `errorOverride`, `renderable`; `publishAutomationEditorCommit`
l.1043 still seeds nulls and `renderable: false`.

The override type in `field-rule-proposal-state.ts:70-79` grows one field:

```ts
export type RuleProposalResolutionChoice =
    | { readonly kind: "conflict"; readonly choice: "keep" | "move" }
    | { readonly kind: "ambiguous"; readonly ruleId: string };

export interface RuleProposalDraftOverride {
    readonly generation: RuleProposalDraftGeneration;
    readonly draft: RuleEditorDraft;
    readonly resolution: RuleProposalResolutionChoice | null;
}
```

The choice lives in the override rather than in `RuleEditorDraft`, so the standalone editor's draft
carries no transaction-only state, and `setAutomationProposalDraft(owner, override)` carries it
unchanged across re-render and inspector close and reopen. The inspector is `hidden`, not unmounted,
so the card element is stable too.

`computeFieldRuleProposal` becomes the eligibility gate only. It returns `{ kind: "none" }` or
`{ kind: "proposal"; field; descriptionText }` from the existing empty-text and `hasProposableValue`
checks. The `update` kind and its `rule` go away; the ladder owns ownership now, and the manual-row
alias case is the ladder's `ineligible`.

Hook: extend `useFieldRuleProposal` in place. Same persistence contract, same options projection.
New internals:

- Predicate:
  `{ descriptionText, accountId: draft.useAccountScope ? subject.accountId : undefined, amount: draft.useAmountScope ? subject.amount : undefined }`.
  In transaction context both conditions are checkboxes seeded from the subject, so the predicate
  comes from the subject and never from parsed text. `draftFromProposal` keeps seeding `accountId`
  and `amountText` from the subject so `validateRuleDraft` agrees with it.
- Target: `useMemo(() => resolveRuleExtensionTarget({ rules, subject, field, predicate }))`.
  Recomputed on every draft change, so ticking "Only this account" re-derives it.
- Resolution: read from the override and validated against the current target. A conflict choice
  counts only when `target.kind === "conflict"`; an ambiguous choice only when its id is in
  `target.candidates`. Otherwise the defaults apply: keep, or no selection. No effect, nothing
  stored about the target.
- Semantic key in `ruleProposalDraftKey` l.303: drop `proposal.kind` and the proposal rule id; keep
  transaction id, field, description text, subject account and amount, currency and current value;
  add a signature of the same-text rules that match the subject, as sorted ids each with
  `ruleOutputFields`. The key must not include the target, because the target depends on the
  override's predicate and the override would retire itself on every checkbox tick. The rule
  signature still retires the override when another writer changes the candidate set, which is the
  behaviour.md section 4 "re-present it" case.
- Return shape:
  `{ proposal, target, draft, errors, resolution, setDraft, setResolution, canApply, apply, accounts, tags, people, aliases, currencyCode }`.
  `canApply` is false for `ambiguous` with no chosen rule and for `ineligible`.

`apply()` in order:

1. `validateRuleDraft(draft, currencyCode)`; on failure set the error override and return false.
2. Take the pending field's entry from `validation.value.outputs` as a `FieldRuleOutputChange`. The
   proposal card writes only the pending output. `RuleEditor` receives `pendingField`; Edit and
   Split on other outputs are disabled while pending, and the pending output's value editor is
   expanded by default so `rule-tag-mode` and `rule-tag-${id}` are reachable without a click.
3. One rule mutation chosen by target kind:
    - `create`:
      `create({ id: crypto.randomUUID(), descriptionText, accountId, amount, outputs: { [field]: output }, createdAtEpochMs: Date.now() })`.
    - `update-owner` and `extend`: `setOutput({ id: target.rule.id, field, output })`.
    - `conflict` with keep: `setOutput({ id: target.owner.id, field, output })`.
    - `conflict` with move:
      `moveOutput({ sourceId: target.owner.id, field, hostId: target.host.id, deletedAtEpochMs: Date.now(), output })`.
      See plan correction 1; today's mutation has no `output` parameter.
    - `ambiguous`: `setOutput({ id: resolution.ruleId, field, output })`. `setFieldRuleOutput` adds
      or replaces, so it covers both an owner and a non-owner candidate.
4. On `!result.ok`: set the error override from `mutationErrorToFieldErrors`, return false. Nothing
   applied, nothing remembered, and the card stays mounted because the card only calls `dismiss()`
   when `apply()` returns true.
5. Apply at scope: `draft.scope === "new" ? applyNewerThan(referenceDate) : applyAll()`.
   `applyFieldRulesToNewerTransactions` already uses `isOnOrAfterTransactionDate` with `>= 0` at
   `rules.ts:382`, so the inclusive cutoff needs nothing here. Both engine calls apply every active
   rule to the targeted rows. That is the frozen semantics; do not narrow it to the touched rule.
6. `persistPreference` with `applyMode: applyModeFrom(draft.scope, draft.applyOnBlur)` and `tagMode`
   from `outputs.tags?.mode` falling back to the remembered one; then clear both overrides and
   return true.

Conflict panel: a `conflict?: { owner, host, choice, onChoice }` prop on `RuleEditor`, rendered
above Matches, copy from the mockup at l.1441-1448, `role="group"` named "Which rule should own
tags", two radios with keep checked by default, the move option stating that the owner rule is
deleted. Ambiguous: `ambiguous?: { candidates, ruleId, onChoice }` rendering a required radio list
of candidate names with their output fields, `rule-save` disabled until one is chosen.

**3. Apply on blur.** The `rule-apply-on-blur` checkbox is `draft.applyOnBlur`, seeded from
`applyModeIsAutomatic(remembered.applyMode)` and persisted through `applyModeFrom`. The finalizer
effect replacing l.101-118:

```ts
const finalizes =
    ownsPersistedProposal &&
    renderable &&
    draft?.applyOnBlur === true &&
    (target.kind === "create" || target.kind === "update-owner" || target.kind === "extend");
useLayoutEffect(() => {
    if (!finalizes) return;
    return controller.registerAutomationFinalizer(owner, () => {
        if (workflow.apply()) dismiss();
    });
}, [finalizes, controller, owner, workflow, dismiss]);
```

Unticking the checkbox, or a draft change that moves the target to `conflict` or `ambiguous`, runs
the cleanup and removes the finalizer through the identity-guarded unregister at l.1098-1106. Owner
exit then leaves the proposal pending and hidden, and the toolbar pending badge covers it.

`tests/unit/components/rule-proposal-auto-apply.test.tsx` needs no change. It drives the controller
only, and the controller API is untouched. Its guarantees carry over: `finalizeAutomationOwnerExit`
deletes the map entry before calling, so one exit is one call; a rejected cell commit never
publishes a proposal at l.1049; unregister then exit runs nothing. A mutation refused inside the
finalizer behaves as today. `apply()` returns false, the proposal stays with its errors, and the
finalizer is re-registered only if the card is still rendered, which it is not once the active row
changed. `resolveNavigation` with `require-finalized` at l.1745 still returns `handled`, the
existing blocked-navigation behaviour for a failed automatic apply.

**4. Divergence and apply-this.** New pure helper in `field-rule-robot-state.ts`:

```ts
export interface RuleCardState {
    readonly rule: FieldRule;
    readonly wonFields: readonly RuleField[];
    readonly driftFields: readonly RuleField[];
}
export function computeRuleCardStates(
    rules: readonly FieldRule[],
    subject: RuleMatchSubject,
    currents: readonly RobotCurrentValue[]
): readonly RuleCardState[];
```

It calls `computeFieldRuleRobotState` per current, groups by `state.rule.id`, and orders by
`ruleScopeRank` descending then id. `computeFieldRuleRobotState` itself is unchanged. An output a
rule has but does not win on this row gets no divergence marker.

Data flow: `TransactionInspectorAutomation` calls `useActiveFieldRules()`, memoizes `cardStates`,
and renders one `InspectorRuleCard` per state. The card builds `divergence` only for `driftFields`,
using two new pure label helpers in `rule-editor-data.ts`, `ruleOutputLabel(entry, options)` and
`currentValueLabel(current, options)`, over the `{ id, label }` option lists the hooks already
project.

Apply-this stays whole-row. `useApplyFieldRulesToTransaction` at `src/lib/crdt/context.tsx:1267`
applies every winning rule to the row, and `tests/e2e/field-rule-parity.spec.ts:236-243` pins that
one click resolves drift on the other rule's card too. The button sits inside the diverging
`rule-output-${field}` badge with testid `rule-apply-this`, and `onApplyThis(field)` ignores the
field. No per-field apply is needed. If it is ever wanted, the smallest addition is an optional
`fields` filter on `applyFieldRulesToSingleTransaction` in
`src/lib/crdt/apply-field-rule-to-transaction.ts:29`, threaded into `applyFieldRulesToTransaction`,
with the parity test rewritten.

`useTransactionRuleWorkflow` becomes rule-keyed: input
`{ transactionId, rule, subject, referenceDate }`, output
`{ draft, errors, setDraft, resetDraft, save, remove, split, applyThis, options, currencyCode }`.
`robotState` leaves the hook. `draft` is `draftFromRule(rule, currencyCode, remembered)` with all
outputs. `save` is `update({ id, accountId, amount, outputs })` followed by apply at the draft's
scope. `split(field)` calls
`split({ id, field, newRuleId: crypto.randomUUID(), createdAtEpochMs })`, after which the next
render shows two cards. The duplicated `useRuleEditorOptions` projection in both hooks should move
to one shared module.

**5. Toolbar drift signal.** `TransactionTableToolbar.tsx`: new prop `automationDrift?: boolean`,
default false. `driftWhileClosed = automationDrift && !inspectorOpen && !pendingWhileClosed`.
Aria-label precedence: pending, then drift "Inspector, a rule differs from this transaction", then
"Inspector". A second dot rendered only for `driftWhileClosed` with
`className="size-2 rounded-full bg-amber-500 dark:bg-amber-400"`, `aria-hidden`,
`title="A rule differs from this transaction"`, `data-testid="transaction-inspector-drift-badge"`.
The existing pending badge and its live region are unchanged. Drift gets no live announcement
because it changes with every row move.

Page: `src/app/(app)/transactions/page.tsx` does not import `useActiveFieldRules` today; add it,
then after `inspectorTransaction` at l.814:

```ts
const automationDrift = useMemo(() => {
    const automation = inspectorTransaction?.automation;
    return (
        automation != null &&
        automation.currents.some(
            (current) =>
                computeFieldRuleRobotState(rules, automation.subject, current).kind === "drift"
        )
    );
}, [rules, inspectorTransaction]);
```

Pass `automationDrift={automationDrift}` beside `automationPending` at l.1625. Nothing renders
inside a row, so `rule-proposal-stability.test.tsx` stays green.

**6. Deletions.** Safe to delete: `transactions/FieldRuleProposal.tsx`,
`transactions/TransactionRulePopup.tsx`, `automations/FieldRuleEditor.tsx`,
`automations/ActionEditor.tsx`, `automations/ConditionEditor.tsx`,
`transactions/description-rule-state.ts`, and
`tests/unit/components/description-rule-state.test.ts`. No other test file targets the first five by
name. Import sites that change:

- `src/components/features/automations/index.ts:7-25`: drop the three exports, export `RuleEditor`
  and `RuleEditorOption`. Move `RuleEditorOption` into `rule-editor-model.ts` so hooks stop
  importing a component file.
- `src/components/features/automations/FieldRulesManager.tsx:39`.
- `src/components/features/transactions/use-transaction-rule-workflow.ts:44` and
  `use-field-rule-proposal.ts:47`.
- `src/components/features/transactions/TransactionInspectorAutomation.tsx:11,19`.
- `tests/unit/transactions/transaction-inspector-automation-focus.test.tsx:12,92`: mock `RuleEditor`
  instead of `TransactionRulePopup`.
- `tests/unit/components/use-field-rule-proposal.test.tsx:85`: the `FieldRuleProposal` mock is dead
  code; remove it.
- `tests/integration/grouped-rule-ownership-contract.test.ts:25,138-170`: still imports
  `computeFieldRuleProposal` but must assert the gate-only shape.

## Test impact

Unit:

- `rule-proposal-auto-apply.test.tsx`: no change.
- `rule-proposal-stability.test.tsx`: no change.
- `use-field-rule-proposal.test.tsx`: the `@/lib/crdt` mock adds `setOutput` and `moveOutput`;
  `proposalOverride` goes and rules drive the ladder; the transition table reads `target.kind` and
  draft assertions move to `outputs.tags.tagIds`; the apply test expects `create` with
  `outputs: { tags }` and `applyAll` once. Add: ticking account moves target from create to extend
  against an account-scoped alias rule; conflict keep calls `setOutput` on the owner and move calls
  `moveOutput` with the new value; ambiguous returns false and writes nothing until chosen; a
  refused `setOutput` leaves errors and calls neither apply nor `persistPreference`; a resolution
  choice survives re-render under the same generation.
- `transaction-inspector-automation-focus.test.tsx`: mocks return the new hook shapes; the
  `RuleEditor` mock renders `rule-save`, `rule-cancel`, `rule-delete`, `rule-apply-this`; the four
  tests assert focus on `transaction-inspector-automation-title` and absence of
  `transaction-rule-proposal`. Add one test where `apply()` returns false, the card stays mounted
  and focus is untouched.
- `transaction-grid-inspector-controller.test.ts:231`: add two `automation-rule` registrations on
  one row, distinct from each other and from the field bindings.
- `table-model/grid-reconciliation.test.ts:94`: `automation-rule` equal by `ruleId`, unequal to
  `automation`.
- `field-rule-robot-state.test.ts`: `computeRuleCardStates` grouping and order.
  `field-rule-proposal-state.test.ts`: gate-only result.
- `transaction-tags-page.test.tsx` and `description-alias-modal-page-ownership.test.tsx`:
  `tags-rule-proposal` and `description-rule-proposal` become `transaction-rule-proposal`;
  `proposal-apply-mode` plus option clicks become `rule-scope-all` plus `rule-apply-on-blur`.

E2E, `tests/e2e/rule-creation-controls.spec.ts`:

- `${field}-rule-proposal` becomes `transaction-rule-proposal` with a `data-field` attribute.
- `data-kind` create or update becomes `data-target` with the five ladder kinds.
- `proposal-apply-mode` and the `chooseApplyMode` helper become clicks on `rule-scope-all` or
  `rule-scope-new` plus `rule-apply-on-blur`.
- `proposal-confirm` becomes `rule-save`, named "Create and apply" or "Apply". `proposal-dismiss`
  becomes `rule-cancel`.
- `proposal-amount-toggle` and `proposal-account-toggle` become `rule-amount-toggle` and
  `rule-account-toggle`.
- `proposal-tag-mode` becomes `rule-tag-mode` inside the expanded pending output.
- `tags-rule-inspector` becomes
  `inspector.getByTestId("transaction-rule-card").filter({ has: inspector.getByTestId("rule-output-tags") })`.
- `transaction-inspector-automation-badge` and `rule-list` are unchanged.

E2E, `tests/e2e/transaction-rules.spec.ts`:

- `descriptionAlias-rule-inspector` becomes the card filtered by `rule-output-descriptionAlias`.
- `transaction-rule-popup` goes; assert `field-rule-editor` inside the card, and
  `row.getByTestId("field-rule-editor")` count 0 for the row-ownership check.
- `rule-description` `toBeDisabled` becomes a static-text assertion; keep the testid on the static
  element.
- `transaction-rule-drift` and `rule-apply-this` stay, now inside `rule-output-descriptionAlias`.
- Helper `createDescriptionAliasRule` l.42-45: the `rule-field` option becomes the `rule-add-output`
  option "Description alias"; the "Exact description text" label stays.

Also touched by the same renames: `field-rule-parity.spec.ts` for `*-rule-inspector`,
`transaction-rule-popup` and `rule-apply-mode`; `description-aliases.spec.ts:304-306`;
`automations.spec.ts:160`.
