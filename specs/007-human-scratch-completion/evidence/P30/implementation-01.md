# P30 / UR-009 — implementation evidence, revision 01

- **Package/revision:** P30 / 01
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Frozen contract audited:** `specs/human-scratch.md:248-295`
- **Implementer:** `p30-implementer-01`
- **Branch:** `main`
- **BASE:** `5229cd4da1851e9afa6382e2d85799ee339c1568`
- **HEAD:** `c8dc004`
- **Commit chain** (each with an explicit `-- src tests` pathspec):
  - `4526f79` — `feat: add inline rule-creation controls for every automation field`
  - `82ed8e1` — `test: select transaction rows by description input value`
  - `c8dc004` — `fix: stop the rule proposal presenting as a modal dialog`

  Note for anyone verifying: an earlier message of mine quoted `877d45a`. That commit was amended
  away and is NOT an ancestor of HEAD, though `git show` still resolves it. Verify against `c8dc004`.
- **Range:** non-empty

`HS-007` and `P17A`–`P17D` are NOT reopened. This is an independent conformance pass over the same
frozen clauses.

## Scratch integrity

`sha256sum specs/human-scratch.md` =
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`, byte-equal to the frozen value
in the dispatch. I never opened it for writing and added no markers.

## Summary of the finding

Root's read is **confirmed and complete**. The frozen text describes two distinct surfaces and the
shipped code implemented exactly one of them:

- the **robot** (`:275-286`) — a rule that ALREADY EXISTS, red on drift, opening the
  automations-page editor — is fully shipped and sound;
- the **creation controls** (`:249-266`, extended to tags and allocation by `:289-292`) — offered
  when a field is changed and no rule yet matches — **did not exist for any field**.

Two independent facts establish the gap rather than merely suggesting it:

1. `use-transaction-rule-workflow.ts` exposes `save(ruleId)` / `remove(ruleId)` and its comment at
   `:212` reads _"Editing an existing rule from a matching transaction: UPDATE, never create."_
   Every mutation is keyed to an existing rule id. There was no create path.
2. `computeFieldRuleRobotState` returns `{kind: "none"}` whenever `selectWinningRule` finds nothing,
   and `page.tsx` mounted the robot only when the state was not `none`. So for exactly the
   principal's case — a changed field matching no rule — every surface was silent by construction.

`InlineEditableTags.tsx` additionally had **zero** rule wiring, which explains the principal's
report (added a tag, saw nothing) without appeal to timing or state.

This is additive work against a sound existing half, not a repair of something broken.

## Clause-by-clause conformance table

Verdicts are measured against the current code, not prior evidence files. "PASS (was covered)" means
the behaviour AND a test for it already existed. "GAP → closed" means I added it in this package.

| #   | Frozen clause                                                                                                                                | Verdict                                                  | Code                                                                                                                                                                                        | Test                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `:249-251` controls appear when a description alias is applied and the text matches no rule                                                  | **GAP → closed**                                         | `field-rule-proposal-state.ts`, `TransactionRuleProposal.tsx`, `page.tsx` `renderRuleProposal`                                                                                              | `field-rule-proposal-state.test.ts` "offers to CREATE"; E2E "changing a description alias offers to create a rule"                                                                            |
| 2   | `:252-253` controls must not resize the table nor occlude anything                                                                           | **GAP → closed**                                         | `TransactionRuleProposal.tsx` — Radix portal via `PopoverContent`, so the controls are outside the grid and contribute no track size; the anchor wrapper renders identically open or closed | E2E asserts the surface appears and the row's cells stay operable; `getByRole("dialog")` is asserted 0, which is what caught the modal regression; the no-resize property is structural, since a portaled element contributes no grid track                                                                              |
| 3   | `:253-254` appear near the mouse, in an unfocused popup or beside the field                                                                  | **GAP → closed**                                         | `PopoverAnchor` wraps the edited cell; `side="bottom" align="start"`; `onOpenAutoFocus` prevented so the caret is never stolen                                                              | E2E confirms the cell keeps focus semantics through the flow                                                                                                                                  |
| 4   | `:255-256` a select with the four options                                                                                                    | **GAP → closed** (type + labels pre-existed)             | `FieldRuleProposal.tsx` `proposal-apply-mode` over `APPLY_MODES`                                                                                                                            | `apply-mode.test.ts` (pre-existing, four modes); E2E selects "Update all"                                                                                                                     |
| 5   | `:257` a tick button next to the select                                                                                                      | **GAP → closed**                                         | `FieldRuleProposal.tsx` `proposal-confirm`, `Check` icon                                                                                                                                    | E2E asserts visible and drives the whole flow through it                                                                                                                                      |
| 6   | `:258-260` "only if $x" and "only this account" checkboxes                                                                                   | **GAP → closed**                                         | `FieldRuleProposal.tsx` `proposal-amount-toggle` / `proposal-account-toggle`; values pre-filled from the row by `draftFromProposal`                                                         | `rule-editor-data.test.ts` "pre-filling both restriction values"; E2E asserts both visible                                                                                                    |
| 7   | `:261-266` tooltip explaining update-all / update-new and the Updating-vs-Update distinction                                                 | **PASS (copy) + GAP → closed (second surface)**          | Copy moved to `rule-editor-model.ts` `APPLY_MODE_TOOLTIP`, now rendered by BOTH `FieldRuleEditor` and `FieldRuleProposal` so the two cannot drift                                           | `rule-editor-model.test.ts` (pre-existing predicates)                                                                                                                                         |
| 8   | `:263-266` "Updating" applies automatically on row blur; "Update" needs the tick                                                             | **GAP → closed**                                         | `TransactionRuleProposal.tsx` effect keyed on `isEditing` going false, gated by the domain predicate `applyModeIsAutomatic`                                                                 | `apply-mode.test.ts` covers the predicate; the wiring is exercised by the E2E flows                                                                                                           |
| 9   | `:267-269` the rule applies to that exact text going forward, and to new imports                                                             | **PASS (was covered)**                                   | `applyFieldRulesToImport` at the import-commit seam                                                                                                                                         | `tests/integration/import-commit-field-rules.test.ts`                                                                                                                                         |
| 10  | `:269-270` description rules do not apply to manually created transactions                                                                   | **PASS (was covered)** + reinforced                      | `fieldAppliesToManual` in `rules.ts`; the proposal honours it too                                                                                                                           | `rules.test.ts`; new `field-rule-proposal-state.test.ts` "never proposes a description-alias rule from a manual row"; E2E "a manual row offers a tag rule but never a description-alias rule" |
| 11  | `:270` last select and checkbox choices remembered in vault user preferences                                                                 | **PASS (was covered)** + extended to the new surface     | `preferences.ts`, `persistUserAutomationPreference`; `use-field-rule-proposal.ts` reads and re-persists them                                                                                | `preferences.test.ts`; `rule-editor-data.test.ts` "honours the remembered select and restriction choices"; pre-existing E2E "Apply-mode persistence"                                          |
| 12  | `:271-274` one rule per description text unscoped; precedence description < +amount < +account < +account+amount                             | **PASS (was covered)**                                   | `ruleScopeRank`, `ruleUniquenessKey`, `selectWinningRule`                                                                                                                                   | `rules.test.ts` rank table; new `field-rule-proposal-state.test.ts` "updates the highest-precedence matching rule, independent of input order"                                                |
| 13  | `:275-283` robot for a matching rule, red on drift, editable inline, reusing the automations-page UI                                         | **PASS (was covered)**                                   | `TransactionRuleRobot.tsx`, `TransactionRulePopup.tsx` mounting the shared `FieldRuleEditor`                                                                                                | `transaction-rules.spec.ts`                                                                                                                                                                   |
| 14  | `:282-283` "apply to this transaction" on drift                                                                                              | **PASS (was covered)**                                   | `applyThis` → `applyFieldRulesToSingleTransaction`                                                                                                                                          | `transaction-rules.spec.ts`                                                                                                                                                                   |
| 15  | `:284-286` "apply to all" and "apply to new imports"; in a transaction context, new means newer than that transaction                        | **PASS (was covered)**                                   | `FieldRuleEditor` buttons; `applyNewerThan(referenceDate)`                                                                                                                                  | `field-rule-parity.spec.ts`; `rules.test.ts` `isNewerTransactionDate`                                                                                                                         |
| 16  | `:287-289` changing a field that already has a matching rule offers the same four choices but UPDATES the rule rather than creating a second | **GAP → closed**                                         | `computeFieldRuleProposal` returns `kind: "update"`; `use-field-rule-proposal.ts` `apply()` routes to `update({id})`                                                                        | `field-rule-proposal-state.test.ts` "proposes an UPDATE of the matching rule"; E2E "changing a tag on a row that already matches offers an update, not a duplicate"                           |
| 17  | `:289-290` description, tags and person percentage rules work similarly                                                                      | **GAP → closed**                                         | The proposal is rendered for all three fields in `page.tsx`; `TransactionRow` wraps all three cells                                                                                         | `field-rule-proposal-state.test.ts` parameterised over all three; three E2E journeys                                                                                                          |
| 18  | `:290-292` tags get an extra add/set select after "only this account"; set clears existing                                                   | **PASS (semantics) + GAP → closed (on the new surface)** | `resolveTagRuleResult`; `FieldRuleProposal.tsx` `proposal-tag-mode` rendered only when `field === "tags"`                                                                                   | `rules.test.ts` add/set semantics; E2E asserts the select is present for tags and ABSENT for description and allocation                                                                       |
| 19  | `:292-293` allocation rule covers the whole percentage set and its control spans all the columns                                             | **GAP → closed**                                         | `TransactionRow.tsx` wraps the entire run of allocation cells in one `grid-cols-subgrid` anchor with `gridColumn: span N`                                                                   | `field-rule-proposal-state.test.ts` allocation cases; E2E "changing a person percentage offers to create a rule spanning the whole set"                                                       |
| 20  | `:294-295` unlike description rules, tag and percentage rules DO apply to manually created transactions                                      | **PASS (was covered)** + reinforced                      | `fieldAppliesToManual`                                                                                                                                                                      | `field-rule-parity.spec.ts` "Manual-row applicability"; new proposal-level tests and E2E                                                                                                      |

**Totals:** 20 clauses. 8 already conformed with tests. 12 were gaps or partial (the creation
surface and everything it entails); all 12 are closed.

## What I changed

New files:

- `src/components/features/transactions/field-rule-proposal-state.ts` — pure create-vs-update
  decision plus the "only if $x" amount label formatter. Reuses `selectWinningRule`, so "already
  matches a rule" means exactly what it means for the robot.
- `src/components/features/transactions/use-field-rule-proposal.ts` — the CREATE path. Writes
  through the same P17B mutations and applies through the P17A engine hooks, so allocation writes
  stay P16C-only and alias writes stay on the P11 boundary.
- `src/components/features/transactions/FieldRuleProposal.tsx` — the frozen control set.
- `src/components/features/transactions/TransactionRuleProposal.tsx` — anchoring plus the
  blur-auto-apply semantics.
- `tests/unit/components/field-rule-proposal-state.test.ts`,
  `tests/e2e/rule-creation-controls.spec.ts`.

Modified:

- `rule-editor-data.ts` — added the pure `draftFromProposal` seeder.
- `rule-editor-model.ts` / `FieldRuleEditor.tsx` — moved `APPLY_MODE_TOOLTIP` into the shared model
  so both surfaces render one string.
- `TransactionRow.tsx` / `TransactionTable.tsx` — a `renderRuleProposal` render prop mirroring the
  existing robot seam; the row stays presentational.
- `InlineEditableTags.tsx`, `PersonAllocationCell.tsx` — an `onEditingChange` seam each, derived
  from existing state so it cannot disagree with the rendering. Values are never reported, only
  open/closed.
- `page.tsx` — one pending-edit record, the render callback, and the account/amount labels.

I did not redesign the rule engine or change rule storage.

## Tests that fail without the fix — verified, not assumed

I created a throwaway worktree at BASE `5229cd4`, copied ONLY the new/changed test files in, and ran
them against the pre-fix product code:

```
Test Files  2 failed (2)
     Tests  4 failed | 6 passed (10)

Failed to resolve import "@/components/features/transactions/field-rule-proposal-state"
TypeError: draftFromProposal is not a function   (x4)
```

The worktree was removed afterwards. The 6 that passed are the pre-existing `draftFromRule` /
`mutationErrorToFieldErrors` cases in the file I extended, which correctly still pass at BASE.

`field-rule-proposal-state.test.ts` also contains an executable statement of the gap itself: for the
principal's exact inputs, `computeFieldRuleRobotState` is asserted to be `none` for all three fields
while the proposal is `create`. If a future change makes the robot cover that case, that test fails
and the two surfaces must be reconciled deliberately rather than silently.

For the two guards added later (`tagSetChanged`, `allocationValueChanged`) I checked the same
property by neutering each guard in place — making both return `true` unconditionally, which is the
behaviour before they existed — and re-running the file. Result: **3 failed | 33 passed** —
"reports no change when the same tags are re-committed", "ignores order, since the cell does not
preserve it", and "reports no change when the same number is re-committed". Restoring the guards
returns 36/36. So the guard tests are load-bearing rather than decorative. The tree was verified
byte-identical to `c8dc004` afterwards via `git diff --quiet c8dc004 -- src tests`.

The `role="dialog"` regression (defect #4 below) has its own fail-without-fix proof of a stronger
kind: it was caught by a PRE-EXISTING test, `description-aliases.spec.ts:188`, which failed on the
pre-fix tree in campaign run 1 and passes on `c8dc004`. My own added
`expect(getByRole("dialog")).toHaveCount(0)` reproduces it inside the new suite.

## Gate results

| Gate                | Result                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS, clean                                                                                                                                                                                                                                                   |
| `pnpm lint`         | PASS, 0 errors. 1 warning, `react-hooks/incompatible-library` at `TransactionTable.tsx:439` (`useVirtualizer`) — **pre-existing at BASE** in code this package does not touch; confirmed by `git show 5229cd4:...`                                            |
| `pnpm format:check` | All `src/**` and `tests/**` clean (`oxfmt --check src tests` → "All matched files use the correct format"). The 17 files it reports are root-owned `specs/**` markdown, pre-existing and out of my write scope; I deliberately did not run bare `pnpm format` |
| `pnpm test`         | PASS — 123 files, 2409 passed, 2 skipped                                                                                                                                                                                                                      |
| `pnpm test:e2e`     | PASS — 182 passed, 0 failed, x3 clean runs; see the campaign section                                                                                                                                                                                                                                |

All five non-E2E gates were re-run against the final committed tree `c8dc004`, not merely against an
earlier draft.


## E2E campaign

Run in an isolated worktree `/tmp/mf-p30` created OUTSIDE the repo, off commit `c8dc004`, with
`env -u CI`, `--retries=0`, full suite, 3 runs. Logs and digests live outside the worktree at
`/tmp/p30-campaign/` so they survive its removal and can be verified independently of this file.

**The campaign was restarted, not continued.** An earlier run against `4526f79` found the
`role="dialog"` regression described below. Fixing it changed the tree, which voids every run made
against the old tree — a repeated-run campaign is evidence only for the exact tree it ran against.
The superseded log was deleted rather than kept, so it cannot later be mistaken for current
evidence. All three reported runs execute against one unchanged tree.

- Digest before run 1: `3276de6c44ccc44bf9c0c0e3a3a0774c` at `c8dc004`
- Digest after run 3: `3276de6c44ccc44bf9c0c0e3a3a0774c` — **identical to the pre-digest**, so all
  three runs are evidence for one unchanged tree.

**Result: 3/3 clean runs, 182 passed and 0 failed each, no flakes, no retries.** All five new
journeys appear in every run, and `description-aliases.spec.ts:188` — the journey the `role="dialog"`
regression broke — passes in every run.

| Run | Result |
| --- | ------ |
| 1   | **182 passed, 0 failed** (4.4m), exit 0 |
| 2   | **182 passed, 0 failed** (4.4m), exit 0 |
| 3   | **182 passed, 0 failed** (4.2m), exit 0 |

## Defects my own work introduced, and how each was caught

Recorded in full because the pattern matters more than any one of them: **all four were invisible to
type checking and to the unit suite**, and each was caught by a different mechanism.

**1. Anchor-shape remount (caught by re-reading my own comment).** My first version wrapped the tags
cell in an anchor element ONLY when the proposal was open, while the module comment already claimed
the surface "never remounts the edited cell". That claim was false as written: React reconciles by
element shape, so a wrapper appearing on open would have unmounted and remounted the cell, dropping
the caret and any open tag dropdown mid-edit. The wrapper is now emitted unconditionally in both the
proposal path and the no-proposal fallback.

**2. Dropped inline `style` (caught while verifying #1).** The anchor did not forward `style`, which
would have silently broken the allocation group's `gridColumn: span N` and stopped the control
spanning the columns the frozen text requires. Fixed by adding `anchorStyle`.

**3. A bad test oracle (caught by printing the DOM instead of trusting the assertion).** My E2E
selected rows with `filter({ hasText: description })`, but a transaction's description is the VALUE
of an input, not row text — so the filter matched zero rows and all five journeys failed before
reaching any product code. The product was fine; my test was wrong. I found it by probing the live
DOM and printing the actual counts rather than reasoning about why the product "must" be broken.
Fixed in `82ed8e1` by filtering on the input.

**4. Unintended `role="dialog"` (caught by the full-suite campaign, run 1).** Note on cause, because
an early reading of this failure attributed it to the proposal being offered for a NON-change and
that is not what happened. The no-op guard (`sameTagIds`, now `tagSetChanged`) was already present in
`4526f79`, the exact tree that failed. The failing flow types "Fresh novel" into an empty description
and commits it by clicking away — a genuine new alias assignment, so the proposal SHOULD appear
there, and it still does at `c8dc004`. The only thing wrong was that it announced itself as a modal.
The fix is one attribute; `git diff 4526f79 c8dc004 -- TransactionRuleProposal.tsx` is the `role`
change and its comment, nothing else. Suppressing the proposal on that flow would have been the WRONG
fix — it would have removed a correct offer to satisfy an assertion about modality. Radix `PopoverContent`
defaults to `role="dialog"`. My inline controls therefore announced themselves as a modal, and broke
`description-aliases.spec.ts:188`, an existing passing journey that asserts no dialog remains open
after a description commit. This was a REAL regression in shipped behaviour, not a flake — I
confirmed it by reading the failure's accessibility snapshot, which named my own control. It is also
wrong on its own terms: `:252-254` asks for an unfocused popup that does not interrupt the edit,
which is the opposite of a modal. Fixed in `c8dc004` by giving the wrapper `role="presentation"` and
leaving the accessible group and label on the inner controls, and pinned with an explicit
`expect(getByRole("dialog")).toHaveCount(0)` in my own alias journey.

The lesson I would pass on: #4 was only reachable through a FULL-SUITE run. A campaign scoped to my
own spec would have been green and would have shipped a regression in someone else's journey.

## Why the creation controls are not the full automations-page editor

The task says to reuse the automations-page editor and not build a parallel one, so this choice needs
stating explicitly rather than leaving a reviewer to infer it.

The frozen text asks for two different things in two different places:

- `:283`, describing the ROBOT popup, says "This should reuse the exact same UI as the automations
  page." That surface already existed and still does: `TransactionRulePopup` mounts the shared
  `FieldRuleEditor` verbatim. I did not touch it.
- `:255-260`, describing the CREATION controls, ENUMERATES their contents exhaustively: a select with
  the four options, a tick button next to it, an "only if $x" checkbox and an "only this account"
  checkbox — plus, for tags, one further add/set select at `:290-292`. That list is deliberately
  short, and mounting the full editor there would contradict `:252-253`, which requires the controls
  not to occlude anything and to sit close to the mouse. The full editor carries a field selector, an
  exact-description input, delete, and apply-all/apply-new buttons, none of which `:255-260` asks for
  and all of which would make the popup large enough to occlude the table.

So the creation surface renders exactly the enumerated controls, while sharing everything BEHIND them
with the page editor: the same `RuleEditorDraft`, the same `validateRuleDraft`, the same
`ApplyMode` type and `APPLY_MODES` list, the same `APPLY_MODE_TOOLTIP` string, the same
`mutationErrorToFieldErrors`, and the same P17B CRUD mutations. There is no second validation path,
no second mode list and no second copy of the tooltip — a divergence between the two surfaces would
have to be introduced deliberately, not by drift.

## Blindness audit: would each new assertion still pass if the defect were present?

Applied to every new assertion, because a test that exercises the ROBOT surface would pass whether
or not the CREATION surface works — both render controls near a cell and both concern automations.

- **Every creation assertion targets a testid that exists only in the new surface**
  (`tags-rule-proposal`, `description-rule-proposal`, `allocation-rule-proposal`,
  `proposal-apply-mode`, `proposal-confirm`, `proposal-amount-toggle`, `proposal-account-toggle`,
  `proposal-tag-mode`). Under the pre-fix code every one of these resolves to zero elements, so no
  robot-only implementation can satisfy them.
- **The tag journey pins the two surfaces apart across time in one test:** the robot count is
  asserted `0` BEFORE the change and `2` AFTER the rule is created. A robot-only implementation
  fails the first assertion; a creation-only implementation that never actually writes a rule fails
  the last.
- **The outcome asserted is user-visible state, not control presence.** Each journey ends by
  asserting the OTHER matching row actually changed — tag applied, alias repointed, percentage set —
  and the tag journey additionally asserts the non-matching row did NOT change. A surface that
  renders correct-looking controls but writes nothing fails these.
- **`data-kind` distinguishes create from update**, so the update journey cannot be satisfied by the
  create path or vice versa.
- **Negative controls are asserted where the frozen text forbids a control:** no `proposal-tag-mode`
  on the description and allocation surfaces, and no `description-rule-proposal` on a manual row.
- **At the unit level** the robot is asserted `none` for exactly the inputs where the proposal is
  `create`, so the two cannot silently merge.

One assertion I judged genuinely weak and strengthened: the description journey originally only
checked the proposal appeared. It now also asserts `getByRole("dialog")` is 0 — which is what caught
defect #4 above and is the assertion the existing alias suite was already making.

## Guards pinned rather than left untested

Two guards decide whether an edit counts as a change at all, and neither had a test that failed
without it. Both were page-local, so they were untestable where they sat; I moved them into the pure
module and pinned them:

- `tagSetChanged` — order-insensitive tag-set comparison, covering re-commit, add, remove, swap,
  first-tag, last-tag, and the duplicate-masking case `["a","a"]` vs `["a","b"]`.
- `allocationValueChanged` — covering re-commit, a different number, absent / `null` / legacy-string
  / `NaN` previous values, and `0` vs `-0`.

Without them the inline cell's routine re-commits would put creation controls in front of a user who
changed nothing.

## Secret-safety

No vault master key, invite-fragment secret, `crypto_box` material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` or vault plaintext appears in any code, test, fixture or this file. A grep of
the whole committed diff `5229cd4..c8dc004` for those markers returns zero matches.

Two handling notes, recorded rather than omitted:

- The E2E worktree needed `.env.local`, which is gitignored and therefore absent from a fresh
  worktree. I copied it in from the shared checkout **without ever printing its contents**, verified
  only its byte count matched, and confirmed `git check-ignore` still excludes it inside the
  worktree so it cannot be committed. It is deleted with the worktree.
- The worktree initially symlinked the shared checkout's `node_modules`. `pnpm` then tried to PURGE
  that directory — which would have destroyed the shared checkout's dependencies and broken every
  other agent working in it. I removed the symlink immediately, confirmed the shared `node_modules`
  was intact, and did a proper isolated `pnpm install --frozen-lockfile` instead. Worth flagging as
  a trap for anyone else creating a worktree this way. All E2E
fixtures are synthetic inline CSV buffers. I did not read or reference the principal's
`~/Downloads/CSVData.csv` or `~/Downloads/OFXData.ofx`. No leak observed anywhere in the audited
path.

## Proposed questions

### Q-PROPOSAL-P30-01-01 — Clearing a field offers no rule

- Raised by/package/revision: `p30-implementer-01` / P30 / 01
- Context and evidence: The frozen text says controls appear when a field is changed, but a rule's
  action must encode a concrete value. Removing the last tag, clearing an alias or emptying every
  percentage leaves nothing for a rule to set.
- Why existing authority does not decide it: `:249-266` describes applying a value, never
  withdrawing one; there is no "clear this field" rule action in the frozen model.
- Options considered: (a) no proposal when the field is left empty; (b) propose a rule that clears
  the field, which would require a new action kind and new storage.
- **Decision taken: (a) — clearing a field offers no rule.** Implemented as `hasProposableValue`,
  tested explicitly for all three fields, and confined to one pure predicate.
- Reasoning, stated plainly because the ambiguity is real: clearing IS a change in the ordinary
  sense, so the frozen wording at `:249` ("when you apply a description alias… some controls
  appear") arguably reaches it. I did not take that reading, for two reasons. First, the frozen
  model has no action that can express "clear this field" — `RuleAction` is a discriminated union of
  an alias id, a tag set, and a percentage set, and every one of them encodes a value to APPLY.
  Offering controls whose confirm button cannot produce a valid rule would be a worse defect than
  not offering them. Second, honouring the other reading requires a new action kind and therefore a
  storage change, which this package is explicitly forbidden to make. So (a) is the only reading
  implementable within the package's own constraints, and it is the safer one: the failure mode of
  (a) is a missing offer the user can satisfy from the automations page, whereas the failure mode of
  a half-built (b) is a control that silently does nothing.
- Decision-hierarchy basis: 1 (the frozen model has no clearing action) then 4 (smallest reversible
  change).
- Impact and risk: A user who clears a field is not offered a rule. Low, and recoverable in-product.
- Reversal or migration path: Widen `hasProposableValue` and add the action kind; nothing persisted
  depends on the current choice, so reversing costs no migration.
- Human review still useful after completion: **Yes — this is the one of the three I would most want
  the principal to rule on**, because a "clear the tags on everything matching this text" rule is a
  plausible thing to want and the current answer forecloses it silently.

### Q-PROPOSAL-P30-01-02 — Restrictions are pre-filled but not pre-enabled

- Raised by/package/revision: `p30-implementer-01` / P30 / 01
- Context and evidence: `draftFromProposal` fills `accountId` and `amountText` from the transaction
  but leaves the two checkboxes at the user's remembered state.
- Why existing authority does not decide it: `:258-260` describes the checkboxes as restrictions and
  `:270` says the checkbox choices are remembered; it does not say whether a fresh proposal should
  default them on.
- Options considered: (a) remembered state governs, values pre-filled; (b) always start unticked.
- **Decision taken: (a) — the remembered state governs the checkboxes, and the values behind them
  are pre-filled from this transaction.** So a fresh proposal starts unticked for a new user
  (`DEFAULT_REMEMBERED_CHOICE` has both scopes false), and ticking either immediately narrows the
  rule to this row's account or amount without further typing.
- Decision-hierarchy basis: 1 (`:270`) then 3 (a narrower rule touches less user data unexpectedly).
- Impact and risk: A user whose last rule was account-scoped gets that scope pre-ticked. Visible and
  one click to change.
- Reversal or migration path: One-line change in `draftFromProposal`.
- Human review still useful after completion: Minor.

### Q-PROPOSAL-P30-01-03 — One pending proposal at a time

- Raised by/package/revision: `p30-implementer-01` / P30 / 01
- Context and evidence: `page.tsx` holds a single `pendingRuleEdit`, so changing a second field
  replaces the first proposal rather than showing two.
- Why existing authority does not decide it: The frozen text is written in the singular throughout
  and does not address concurrent proposals.
- Options considered: (a) one at a time; (b) one per changed field per row.
- **Decision taken: (a) — at most one proposal is pending at any time.** Changing a second field
  supersedes the first offer.
- Decision-hierarchy basis: 1 (`:252-253`) then 4.
- Impact and risk: A user editing two fields in quick succession is offered a rule for the second
  only. The first change is still saved; only the offer is superseded.
- Reversal or migration path: Change the state to a keyed map; the render callback already matches
  on transaction id and field.
- Human review still useful after completion: Yes — worth confirming with the principal.
