# Grouped automation rules — implementation plan

Status: phases 1 to 3 complete. Branch `feat/transaction-editing-and-automation-rules`, no other
branches. The table interaction refinements in the hand-off below are not started.

Source of truth for behaviour: `behaviour.md`, `domain-model.html`, `mockups/rule-editor.html`.
Ownership semantics: `../automation-rule-ownership.md` §5.3 ladder and §7.1 decisions. Those
contract files and `../016-automation-interaction-contract/*` are hashed by
`tests/unit/contracts/grouped-rule-ownership-approval.test.ts` and must not be edited.

## Decisions taken for this implementation

1. **Update new is inclusive of the reference date.** The saved plan states it twice as an
   acceptance criterion; the older scratch file said strictly later. One comparator in
   `isNewerTransactionDate` carries the decision, and the tests that pin strict-greater are updated
   deliberately, not deleted.
2. **The rule type keeps its name.** `FieldRule` stays `FieldRule`; its single `action` becomes
   `outputs`. Renaming the type would touch dozens of files for no behavioural gain.
3. **Remembered preferences keep the four-mode wire value.** `lastApplyMode` already decomposes into
   scope and automatic axes (`applyModeTargetsNewOnly`, `applyModeIsAutomatic`). The UI shows two
   radios plus a checkbox and maps to and from that value. No preference schema change.
4. **Indicator surfaces are the inspector and the toolbar.** PR #63 removed per-cell robots on
   purpose. Divergence is shown in orange on the output badge in the inspector, and the inspector
   toggle gets an orange dot when the active row diverges from a matching rule. No cell markers.
5. **Uniqueness stays per output field.** Two rules with identical conditions and disjoint outputs
   may coexist, which migration and Split both require.
6. **Dead code goes.** `ActionEditor`, `ConditionEditor`, `description-rule-state.ts`,
   `FieldRuleProposal`, `TransactionRulePopup` and the old `FieldRuleEditor` are removed once the
   shared editor replaces them. Nothing in production imports the first three today.

## Phase 1 — domain model, engine and CRDT

**Domain (`src/lib/domain/automation/`)**

- `rules.ts`
    - `RuleOutputs = { descriptionAlias?: { aliasId }; tags?: { mode; tagIds }; allocation?: { allocations: ValidatedAllocationSet } }`,
      all readonly. Decode rejects a rule with zero outputs.
    - `FieldRule.action` → `FieldRule.outputs: RuleOutputs`. Keep `RuleAction` only if still useful
      as a per-field discriminated value (e.g. `ruleOutput(rule, field): RuleAction | null`);
      otherwise remove.
    - `ruleOutputFields(rule): readonly RuleField[]`.
    - `ruleUniquenessKey(rule)` → `ruleUniquenessKeys(rule): readonly RuleUniquenessKey[]`, one per
      output, same `[field, text, account|null, amount|null]` shape. `groupRulesByUniquenessKey`,
      `hasUniqueRuleKeys`, `dedupeRulesByUniqueness` work per key.
    - `ruleMatchesSubject(rule, subject)` tests text, account and amount only.
      `selectWinningRule(rules, field, subject)` additionally requires `rule.outputs[field] != null`
      and `fieldAppliesToManual(field)` for manual subjects.
    - `isNewerTransactionDate` becomes on-or-after (decision 1). Rename to
      `isOnOrAfterTransactionDate` so every call site is reviewed.
    - Wire: `field` stays as a legacy marker (`required: false` at the wire level is not needed:
      keep writing it as the first output field so older readers still decode one output). Add
      `outputFields: LoroList(String)`. Decode: if `outputFields` is non-empty use it, else
      `[field]`. Encode writes both. `encodeFieldRule` is the only wire writer;
      `field-rule-mutations.ts` `buildWireObject` is deleted in favour of it.
- `apply.ts`: `planRuleApplications` reads `winner.outputs.<field>`.
- `migration.ts`: builds one single-output rule per legacy action; ids unchanged.
- New `extension.ts` (pure): the selection ladder from the ownership contract §5.3.
    - `resolveRuleExtensionTarget({ rules, subject, field, predicate })` where
      `predicate = { descriptionText, accountId?, amount? }` is what the draft would create.
    - Returns a discriminated union: `create`, `update-owner { rule }`, `extend { rule }`,
      `conflict { owner, host }` (owner holds the field, a different identical-predicate alias rule
      exists), `ambiguous { candidates }`.
    - Candidates = active rules matching the subject whose predicate is identical. Steps 3 to 6 of
      the ladder exactly. Never tiebreak by recency.
- `preferences.ts`: unchanged wire; add `rememberedScope(choice)` / `rememberedApplyOnBlur(choice)`
  and `applyModeFrom(scope, applyOnBlur)` next to `apply-mode.ts` helpers.

**CRDT (`src/lib/crdt/`)**

- `schema.ts`: add `outputFields: schema.LoroList(schema.String(), (f) => f)` to `fieldRuleSchema`.
  Update `DEFAULT_VAULT_STATE` / defaults tests only if the record shape appears there.
- `field-rules.ts`: readers and bulk apply follow the new shape;
  `applyFieldRulesToNewerTransactions` uses the inclusive comparator.
- `field-rule-mutations.ts`:
    - `CreateFieldRuleInput.outputs`, `UpdateFieldRuleInput.outputs` (wholesale replace, used by the
      standalone editor).
    - `setFieldRuleOutput(state, { id, field, output })` adds or replaces one output. Errors:
      `not-found`, `duplicate-key`, `invalid-rule`, `invalid-allocations`.
    - `splitFieldRuleOutput(state, { id, field, newRuleId, createdAtEpochMs })`: refuses
      `single-output`; refuses `duplicate-key` naming the holder; otherwise removes the output from
      the source and creates the new rule with identical conditions in the same draft mutation.
    - `moveFieldRuleOutput(state, { sourceId, field, hostId })`: host must have identical predicate
      and no output for the field (`predicate-mismatch`, `duplicate-key`); the source loses the
      output and is soft-deleted when emptied, in one mutation (D-017).
    - All validate every precondition before the first write (D-019).
- `context.tsx`: `useFieldRuleActions` gains `setOutput`, `split`, `moveOutput`. Keep
  `useApplyFieldRules`.
- `index.ts` exports.

**Make the existing UI compile** with minimal edits (reading `outputs[field]` where it read
`action`). The old UI is replaced in phase 2; do not redesign it here.

**Tests (phase 1)**

- `tests/unit/domain/automation/rules.test.ts`: outputs round-trip for one, two and three outputs;
  legacy wire without `outputFields` decodes to one output; zero-output rule rejected; per-output
  uniqueness keys; winner requires the output; inclusive date boundary; property: shuffle invariance
  still holds.
- New `tests/unit/domain/automation/extension.test.ts`: table-driven over the contract scenarios
  S-01 to S-20 that the ladder decides (create, update-owner, extend, conflict, ambiguous, predicate
  mismatch excludes, different text excludes, undecodable never a host). Property: the result never
  depends on rule order.
- `tests/integration/field-rule-mutations.test.ts`: setOutput, split (success, single-output
  refusal, collision refusal with zero mutation), moveOutput (success with source soft-deleted,
  predicate mismatch refusal), duplicate-key per output, inclusive apply-new.
- Update `grouped-rule-ownership-contract.test.ts`, `automation-application-contract.test.ts`,
  `matching-audit-contract.test.ts`, `field-rules-crdt.test.ts`, `migration.test.ts`,
  `import-commit-field-rules.test.ts`: tests that pinned single-field behaviour change to assert the
  grouped behaviour; EX-03 now asserts `extend`. Keep every test that still describes required
  behaviour. Do not weaken assertions to make them pass.

**Done when** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` pass and
`pnpm test:e2e` passes unchanged on the isolated port. Commit.

## Phase 2 — shared editor, automations page, inspector

**Editor model (`src/components/features/automations/rule-editor-model.ts`, `rule-editor-data.ts`)**

- `RuleEditorDraft`: `descriptionText`, `useAccountScope`, `accountId`, `useAmountScope`,
  `amountText`,
  `outputs: { descriptionAlias?: { aliasId }; tags?: { mode; tagIds }; allocation?: Record<string, string> }`,
  `scope: "all" | "new"`, `applyOnBlur: boolean`.
- `validateRuleDraft` returns `{ accountId?, amount?, outputs }` with per-output errors; a draft
  with no outputs is invalid.
- `draftFromRule`, `draftFromProposal`, `emptyRuleDraft` updated; `mutationErrorToFieldErrors`
  handles the new error types.

**`RuleEditor` component (new file `RuleEditor.tsx`, replaces `FieldRuleEditor.tsx`)**

Pure presentational. Props: `mode: "create" | "edit"`, `context: "transaction" | "standalone"`,
`target` (title line: new rule / rule name / adding X to rule), `draft`, `onDraftChange`, `errors`,
options (`accounts`, `tags`, `people`, `aliases`, `currencyCode`), `referenceDate?` (for the Update
new hint), `transactionLabels?` (account and amount for the condition checkboxes),
`divergence?: Partial<Record<RuleField, { ruleValue: string; rowValue: string }>>`, `pendingField?`,
`populationCount?`, callbacks `onApply`, `onCancel`, `onDelete?`, `onSplit?(field)`,
`onApplyThis?(field)`, `onAddOutput(field)`, `idPrefix`, `registerPortal?`, `className?`.

Layout and copy follow `mockups/rule-editor.html` scenario by scenario:

- Matches: description text (input in standalone create, static elsewhere); transaction context
  shows checkboxes "Only this account: X" and "Only if amount is Y" with hints; standalone shows an
  account select and an amount input. A stored-condition note when the rule's conditions differ from
  the row.
- Outputs: one badge per output with field label, value summary, `pending` chip, orange
  `differs on this transaction` chip plus rule-value / row-value line and "Apply to this
  transaction" button; Edit expands the inline value editor (alias select; tag mode select plus tag
  toggles; allocation grid); Split only when the rule has more than one output and nothing is
  pending. "Add output" select lists absent fields.
- Apply to: RadioGroup `Update all` / `Update new` with inline hints (transaction: "Matching
  transactions dated D or later, plus future imports."; standalone: "Only transactions imported from
  now on."); `Apply on blur` checkbox only in transaction context; a population line "N transactions
  would change now".
- Actions: `Apply` (label "Create and apply" in create mode), `Cancel`, and `Delete rule` only in
  edit mode.
- Accessibility: every control labelled; radios in a `radiogroup`; focus-visible rings; no
  `Explain apply modes` tooltip button.
- Tailwind only, shadcn tokens, orange via amber tokens with dark variants.

Test ids to keep: `field-rule-editor`, `rule-description`, `rule-amount-toggle`, `rule-amount`,
`rule-account-toggle`, `rule-account`, `rule-alias`, `rule-tag-mode`, `rule-tag-${id}`
(aria-pressed), `rule-allocation-grid`, `rule-alloc-${id}`, `rule-save`, `rule-delete`,
`rule-apply-this`, `transaction-rule-drift`, `rule-cancel`, `rule-description-error`,
`rule-amount-error`, `rule-account-error`, `rule-alias-error`, `rule-tags-error`,
`rule-alloc-error`. New: `rule-output-${field}`, `rule-output-edit-${field}`, `rule-split-${field}`,
`rule-add-output`, `rule-scope-all`, `rule-scope-new`, `rule-apply-on-blur`, `rule-population`.
Removed: `rule-field`, `rule-apply-mode`, `rule-apply-all`, `rule-apply-new`, `apply-mode-tooltip`,
`rule-precedence-note`, `proposal-*`.

**Automations page (`FieldRulesManager.tsx`)**

Rule list on the left (name = conditions, subtitle = output fields), editor on the right. Create
starts empty with the Add output control. Apply = create or update, then `applyAll()` or, for `new`
in standalone, nothing (future imports only). Delete soft-deletes. Split calls `split`; the new rule
becomes selected. Remove the apply summary buttons; keep a `role="status"` line reporting what Apply
changed.

**Inspector (`TransactionInspectorAutomation.tsx` and hooks)**

- Replace the per-field cards with: one editor card per distinct winning rule for the row (most
  specific first), plus the pending proposal card when the controller holds a proposal.
- The proposal card is the same `RuleEditor` in create or extend mode. Target resolution calls
  `resolveRuleExtensionTarget` with the draft's current predicate on every draft change, so ticking
  "Only this account" re-derives the target. `conflict` renders the two-option panel from mockup
  scenario 4 (keep owner by default; move into the alias rule as an explicit choice that states the
  source rule's fate). `ambiguous` renders a required choice between candidates.
- Confirm paths: `create` → `create` + apply at scope; `update-owner` → `setOutput`; `extend` →
  `setOutput`; `conflict` keep → `setOutput` on owner; conflict move → `moveOutput`. One vault
  action per gesture; a refused mutation leaves the editor open with the error, nothing applied,
  nothing remembered (D-016, D-019).
- Apply on blur keeps using the controller's finalizer: register it only when the draft's
  `applyOnBlur` is true and the target is not `conflict`/`ambiguous`.
- Divergence per output comes from `computeFieldRuleRobotState` per field; the "Apply to this
  transaction" button calls `useApplyFieldRulesToTransaction`.
- Toolbar: `TransactionTableToolbar` gets an `automationDrift` prop and shows an orange dot and an
  aria-label "Inspector, a rule differs from this transaction" when the active row has a drift state
  and the inspector is closed. Page computes it from the same robot states.
- Delete the `FieldRuleProposal`, `TransactionRulePopup`, `FieldRuleEditor`, `ActionEditor`,
  `ConditionEditor`, `description-rule-state.ts` files and their exports and tests.

**Tests (phase 2)**

- Unit: `rule-editor-model.test.ts`, `rule-editor-data.test.ts` for the multi-output draft; new
  `rule-editor.test.tsx` rendering the editor in each mockup scenario state (create, edit with three
  badges, extend with pending, conflict panel, split preview disabled when pending, divergence with
  apply-this, standalone hints) asserting roles and names; update
  `field-rule-proposal-state.test.ts`, `field-rule-robot-state.test.ts`,
  `use-field-rule-proposal.test.tsx`, `rule-proposal-auto-apply.test.tsx`,
  `transaction-inspector-automation-focus.test.tsx`.
- E2E: update `automations.spec.ts`, `field-rule-parity.spec.ts`, `rule-creation-controls.spec.ts`,
  `transaction-rules.spec.ts`, `description-aliases.spec.ts` to the new controls. Add steps, not
  files, for: a second output joining an existing rule from the inspector; Split from the
  automations page leaving row values unchanged; the conflict panel defaulting to the owner; Update
  new including a same-date row; drift showing orange and apply-this resolving it. Keep
  `grouped-rule-ownership-approval.spec.ts` untouched.

**Done when** the full suite passes on the isolated port. Commit.

## Phase 3 — docs and close-out

- Update `.claude/skills/crdt/SKILL.md` or `components/SKILL.md` only where they describe field
  rules by shape.
- `behaviour.md`: mark the inclusive cutoff and the indicator-surface decision as implemented.
- Final full run:
  `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && MONEYFLOW_E2E_PORT=3107 pnpm test:e2e`.
  Commit.

## Tooling

All commands run inside the flake shell: `nix develop --command sh -c '<command>'`. E2E always with
`MONEYFLOW_E2E_PORT=3107` and never with `--headed`, `--ui` or `--debug`. `next-env.d.ts` is
regenerated by the dev server; restore it with `git checkout next-env.d.ts` before committing.

## Risks

- The grid controller's inspector registration keys are per `(owner, "automation:" + field)`. Moving
  to per-rule cards needs a registration per card; keep the field-keyed binding by registering the
  card under the field of its pending or first output, or extend the binding union with
  `{ kind: "automation-rule", ruleId }`. The reviewer must check focus return after dismiss,
  confirm, delete and apply-this still works (existing focus tests).
- `rule-proposal-stability` asserts no row-owned automation descendants render inside rows. The
  toolbar dot and inspector changes must not add any.
- Old vaults: a record with `field` and no `outputFields` must decode exactly as before. Covered by
  a dedicated unit test with a raw wire fixture.

## Hand-off, 2026-10-13

Work paused at the user's request. State of the branch:

**Committed and reviewed**

- `9e611f9`, `b164132` — Phase 1 complete: grouped outputs model, selection ladder, set/split/move
  mutations, inclusive Update new. Independently reviewed; findings fixed and confirmed.
- `2688af9`, `68655b1` — Phase 2a complete: `RuleEditor`, multi-output draft model, Automations
  page. Full gate was green at commit. Review found two Medium issues still open:
    1. `FieldRulesManager.tsx`: Split is offered while the draft has unsaved edits and on outputs
       not yet saved. Pressing it discards the edits or fails with a misleading message. Offer Split
       only when the draft is not dirty and only for stored outputs.
    2. `RuleEditor.tsx` conflict panel: the move hint always says the owner rule is deleted, but
       `moveFieldRuleOutput` deletes the source only when the move empties it. Add the owner's fate
       to the `conflict` resolution variant, branch the copy, test both branches.
- `83e67a4` — Phase 2b design note (`phase-2-inspector-design.md`).

**Phase 2b complete, 2026-10-13**

`5e896fb` carried the interrupted inspector work; the commits after it finish Phase 2b against
`phase-2-inspector-design.md`. Full unit and E2E gates green at the final commit.

- The two Phase 2a review findings above are fixed. Split on the Automations page is offered only
  while the draft equals the stored rule, and an output added but not saved is marked pending. The
  conflict panel's move hint states the owner's real fate from a required `ownerKeepsOutputs`.
- `matching-audit.md` cites `historical/TransactionRulePopup.tsx.txt` and
  `historical/FieldRuleEditor.tsx.txt`, verbatim snapshots from `2688af9`.
- Deviation from the design note: the proposal card keeps its per-field test ids
  (`tags-rule-proposal` and siblings) and `data-kind`, where `update-owner` reads `update`. Rule
  cards are `rule-inspector-<ruleId>` with `data-automation-field`. The note's
  `transaction-rule-proposal` / `transaction-rule-card` renames were not applied.

**Phase 2b review fixes and Phase 3 complete, 2026-10-13**

- The inspector rule card offers Split only while its draft equals the stored rule. Only the
  inspector's proposal card locks the other outputs; the Automations page never does, because its
  Apply writes the whole draft.
- An update proposal shows the target's stored value under the pending badge and is titled as the
  rule, matching mockup scenario 7. Output badges follow the mockup's layout.
- The inspector is `clamp(22rem, 30vw, 30rem)` wide at `xl`, as the mockup used.
- `behaviour.md` records the inclusive cutoff and the indicator surfaces as implemented.

**Merging into main.** `main` has since moved from pnpm to bun with a `run` CLI (`run tsc`,
`run lint`, `run format`, `run test unit`, `run test e2e`) in PR #68. The first step after merging
is to re-run the whole gate with that tooling; the commands in Tooling above predate it.

**Follow-ups outside this scope.** Two load-sensitive tests failed only while another checkout ran
its own campaign on this machine, and passed when re-run quietly:

- `tests/integration/vault-maintenance.test.tsx`, undo after maintenance. It fakes animation frames
  but keeps the real clock, so its 4 ms maintenance budget chunks differently under load.
- The maintenance and settlement tests that hit their 5 s timeouts under load.

**Not started: table interaction refinements** (behaviour.md section 7, saved plan milestone 3).
Nullable allocation and amount editing, numeric cells using the description cell's modes with
invalid text never blocking movement, action-cell keyboard navigation, no native text selection
outside editing, rectangular drag selection with Shift-click extension, and inspector scrolling
containment. Also requested by the user on 2026-10-13 and absent from the Fusion spec: keyboard
control of the date input. Capture it in behaviour.md section 7 before planning that phase.

## Performance round, 2026-10-13

Commits `8e79dcc`, `13ac88e`, `628b4cf`. Measured before the round at 20,000 rows and 2,000 grouped
rules on a quiet machine: population count 290 ms, matching every row 1.27 s, apply to this
transaction 285 ms, Update all 1.8 s. After: 1.6 ms, 4.7 ms, 71 ms (the same as a plain one-row
write) and 0.56 s. What changed:

- A `RuleIndex` keyed by exact description text, built once per rule-set change and accepted by
  winner selection, the population count, the extension ladder and bulk apply. Property tests prove
  the index-backed results equal the list-backed ones; `useActiveFieldRuleIndex()` memoises it.
- Apply to this transaction resolves the row's location before entering the draft, falling back to
  the id walk for a stale location.
- The uniqueness check decodes the rule set once per create.
- `tests/integration/rule-engine-performance.test.ts` pins ceilings on a 5,000-row, 500-rule vault.

Still outside interaction budget and left as follow-up: Update all and Update new on large vaults
are bulk CRDT writes, around half a second at 20,000 rows and 2,000 rules, and need a progress
indicator or chunking rather than a click-and-wait. Creating rules one at a time is still linear in
the number of existing rules, which only matters for bulk creation.
