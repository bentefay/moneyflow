# P30 / UR-009 — independent review, revision 01

**VERDICT: FAIL**

- **Package/revision:** P30 / 01
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Frozen contract:** `specs/human-scratch.md:248-295`
- **Reviewer:** `p30-reviewer-01` (distinct from `p30-implementer-01`; wrote no product code)
- **Reviewed tree:** `c8dc004`
- **Blocking findings:** F-1, F-2
- **Non-blocking findings:** F-3 (judgement requested by root), F-4, F-5

Two blocking defects, both in the new inline-proposal seam and both invisible to the evidence's own
blindness audit. Everything else the evidence claims is confirmed by direct measurement, including
several claims I set out to disprove.

## 0. Preconditions I verified myself

| Check                                           | Result (MEASURED)                                                                                                                                                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git merge-base --is-ancestor c8dc004 HEAD`     | exit 0 — `c8dc004` IS an ancestor of HEAD `40181eb`                                                                                                                                                                              |
| `877d45a` avoided                               | Yes. Reviewed `5229cd4..c8dc004` only                                                                                                                                                                                            |
| `sha256sum specs/human-scratch.md`              | `469e98c7…49d2f6a` — byte-equal to the frozen value; I never opened it for writing                                                                                                                                               |
| Frozen files edited by me                       | None. I wrote only this review file                                                                                                                                                                                              |
| `p31-implementer-01`'s uncommitted work         | Untouched. No `git stash`, no `git checkout --`, no shared-tree edits                                                                                                                                                            |
| Scratch deleted, `git diff -- src tests`        | My scratch dir removed; the remaining dirt in `src`/`tests` is exclusively P31's (`useTableSelection.ts`, `table-selection.ts`, `selection*.test.*`, `TransactionTable.tsx`, `page.tsx`, `transactions.spec.ts`) and predates me |
| Secret-safety of the diff and of this file      | No key, seed phrase, recovery material, `SUPABASE_JWT_SECRET` value or vault plaintext. E2E fixtures are synthetic inline CSV buffers. **No leak found**                                                                         |
| `as` / `any` / `!` in the reviewed product diff | **Zero.** Every grep hit in added lines is comment prose ("treated as an edit", "as a render prop"). Clean                                                                                                                       |

**Rules I honoured:** I did NOT take port :3000 and did NOT run the E2E suite (`p29-implementer-01`
holds it). I ran no full `pnpm test`, no `pnpm build`, and nothing above 2 workers — load average
was 12.5 with a live P29 campaign when I started. I created no worktree, so I never went near the
shared `node_modules`. All measurements below are static analysis plus targeted jsdom runs, in a
throwaway directory outside `src`/`tests` that I deleted before writing this.

**What I did not verify, and why:** I did not reproduce the 3-run E2E campaign. Under the port
restriction I cannot, and I am not requesting a sequenced slot — F-1 and F-2 are already blocking on
evidence that does not need it, and both need a new HEAD anyway. See §5 for what the campaign's
greenness does and does not establish.

---

## F-1 — BLOCKING. The proposal remounts the cell it is anchored to, closing the tag dropdown mid-edit

**Severity:** regression in shipped behaviour, on the exact gesture the principal reported.

**What the evidence claims.** Defect #1 in `implementation-01.md` says the anchor-shape remount was
found and fixed, and that "the wrapper is now emitted unconditionally in both the proposal path and
the no-proposal fallback". `TransactionRuleProposal.tsx:90-91` repeats it: _"The anchor wrapper and
the children render IDENTICALLY whether or not the proposal is open, so opening it never remounts
the edited cell — the caret and any in-progress edit survive."_ `TransactionRow.tsx:176-178` makes
the same claim.

**What is actually true (MEASURED).** The claim holds for the wrapper `<div>` but not for the branch
above it. `page.tsx:594-606` returns a bare `<div className style>{cell}</div>` when this cell is
not the pending edit, and a `<TransactionRuleProposal>` element when it is. React reconciles by
element type at each position, and those two are different types — so flipping `pendingRuleEdit`
unmounts and remounts the whole subtree, wrapper and cell alike. The unconditional wrapper fixes the
level below the one that matters.

I measured this on a faithful structural reproduction of both branches (same classes, same styles,
same `Popover`/`PopoverAnchor asChild` shape as `TransactionRuleProposal.tsx:93-98`):

```
MOUNT COUNT AFTER FLIP: 2      (expected 1 if the claim held)
SAME DOM NODE: false           (expected true)
```

**The user-visible consequence, measured against the real component.** `page.tsx:1150-1151` sets the
pending edit from inside `handleTransactionUpdate` — that is, on the very `onSave` the tag dropdown
fires while it is still open. So the flip happens mid-edit. Driving the real `InlineEditableTags`
through select-a-tag:

```
DROPDOWN STILL OPEN AFTER SELECTING A TAG: false
```

Control, same harness with the branch flip removed (i.e. pre-P30 wiring): the dropdown **stays
open**, test passes. So the closure is caused by this package, not by the cell.

This is a real behavioural regression: the tags cell is a multi-select, and selecting one tag now
dismisses the picker, forcing the user to reopen it for every additional tag. It also contradicts
`:252-253`'s requirement that the controls not occlude or interrupt.

**Where:** `src/app/(app)/transactions/page.tsx:594-606` (the two-branch return);
`src/components/features/transactions/TransactionRow.tsx:184-199` (same two-branch shape in
`renderRuleProposalOrCell`).

**What must change.** Render one stable element type in both branches — mount
`TransactionRuleProposal` unconditionally and let it decide internally whether the popover is open
(it already computes `open` at `TransactionRuleProposal.tsx:79`), or otherwise give the two branches
an identical element type. Then pin it with a test that fails without the fix: assert the tags
dropdown is still open after selecting a tag while a proposal is pending. The comments at
`TransactionRuleProposal.tsx:90-91` and `TransactionRow.tsx:176-178` must stop asserting a property
the code does not have.

---

## F-2 — BLOCKING. The two "Updating…" modes fire immediately, not on the row losing focus

**Severity:** frozen-contract violation; writes a rule and mutates other transactions without the
gesture the frozen text requires.

**The frozen requirement.** `:263-266`: _"The prefix 'Updating' implies the change will apply
automatically when the row loses focus, or if you click the tick button."_ The spec restates it at
`spec.md:36-38`. The evidence's clause 8 marks this **GAP → closed** and cites
`TransactionRuleProposal.tsx`'s effect "keyed on `isEditing` going false".

**What is actually true (MEASURED).** The effect is correct in isolation. Its input is not. Because
of F-1 the cell is remounted, and a fresh `InlineEditableTags` reports `isOpen === false` on its
first commit (`InlineEditableTags.tsx:127-129`). So `isEditing` transitions `true → false` with no
blur and no loss of row focus. Measured sequence delivered to the proposal for a tag change:

```
ISEDITING SEQUENCE SEEN BY PROPOSAL: [true,false]
REACHED isEditing=false WITHOUT ANY BLUR: true
```

Feeding exactly that sequence into a verbatim copy of the shipped effect and confirm guard
(`TransactionRuleProposal.tsx:61-88`):

```
updatingAll -> ["RULE CREATED AND APPLIED"]     <- fires with no blur
updateNew   -> []                               <- correctly waits for the tick
```

So under `updatingAll` or `updatingNew` the rule is created **and applied to every matching
transaction** the instant the user picks a tag — before they have seen the controls, chosen a scope,
or ticked a restriction. The dismiss button (`FieldRuleProposal.tsx:141-150`) is unreachable in that
window. `applyAll()` (`use-field-rule-proposal.ts:161-162`) rewrites other rows.

**Why no test caught it.** Both blocking defects live in the same blind spot. Every new E2E journey
selects "Update all" (`rule-creation-controls.spec.ts:139,186,225,269`) — one of the two _manual_
modes — before pressing the tick. No test in the repo drives a `Updating…` mode through the inline
proposal; the only `"Updating all"` occurrence anywhere in `tests/e2e/` is
`field-rule-parity.spec.ts:281`, which exercises the automations-page editor, a different surface.
The default is `updateNew` (`apply-mode.ts:31`), also manual, so a fresh vault never hits it either.
The evidence's blindness audit asks "would this pass if the creation surface were absent?" — a good
question that both defects survive, because they are defects _within_ a present creation surface.

**Mitigating, stated fairly:** a user only reaches this by having previously chosen an "Updating…"
mode, since it is remembered in vault preferences (`:270`, `use-field-rule-proposal.ts:164-175`) and
is not the default. It is reachable and persistent, not hypothetical — and the same remembered
choice is shared with the automations-page editor (`useUserAutomationChoice`, used by
`FieldRulesManager.tsx:96` and `use-transaction-rule-workflow.ts:113`), so a mode chosen there arms
this path.

**Where:** `src/components/features/transactions/TransactionRuleProposal.tsx:85-88` (the effect);
root cause is F-1; contributing wiring at `TransactionRow.tsx:470-478` and
`InlineEditableTags.tsx:127-129`.

**What must change.** `isEditing` must mean "the row still has focus", not "this freshly mounted
cell reports closed". Fixing F-1 removes the spurious transition; after that, add a test that fails
without the fix — select an "Updating…" mode, confirm nothing is written until focus actually leaves
the row, then confirm it is written on blur. Note the description path is **not** affected: measured
`isEditing` there is `[false, true, false]` with a genuine blur, because
`InlineEditableDescriptionAlias.tsx:213-216` blurs on Enter. So the fix must not regress that.

---

## F-3 — Root's question: is the structural argument for `:252-253` sufficient? My answer: **yes, and I measured it anyway**

Root asked me to decide whether clause 2's "must not resize the table" may be argued structurally or
must be measured numerically. **My judgement: the structural argument suffices, and a numeric
column-width comparison would add nothing.**

Reasoning. The table's column widths come from a single `gridTemplateColumns` string built by
`buildTransactionGridTemplate` (`allocation-columns.ts:65-71`) from fixed constants —
`"32px 120px minmax(150px,2fr) 160px 140px 110px"` plus one `minmax(112px,128px)` per person plus
`"112px 88px"`. Its only input is the allocation-column count. The popover content is portaled to
`document.body` (`popover.tsx:23`), so it is not a grid item and cannot contribute to any track.
Nothing in the proposal path touches the template. A numeric before/after measurement would be a
_sample_ of a property the code establishes _universally_; it would confirm the two states I
happened to render, not the invariant.

That said, "resize" could also mean the in-flow subtree gains a box, so I measured both:

```
POPOVER CONTENT IS INSIDE THE ROW: false        (portaled out of the row)
CLOSED SIGNATURE: DIV.[]>DIV.min-w-0 flex-1[]>INPUT.[]
OPENED SIGNATURE: DIV.[]>DIV.min-w-0 flex-1[]>INPUT.[]
SIGNATURES EQUAL: true
```

The row's in-flow geometry — tags, classes, inline styles — is byte-identical open and closed.
**Clause 2 conforms.** No change required. (Note this measurement is about _layout_; it is entirely
compatible with F-1, which is about React _reconciliation_ — same rendered shape, different element
type at the branch point.)

---

## F-4 — Non-blocking. The `role="dialog"` fix is correct and complete, with one caveat worth recording

I set out to find an over-aggressive fix that stripped semantics. I did not find one.

MEASURED, rendering the real `FieldRuleProposal` inside a `PopoverContent` exactly as
`TransactionRuleProposal.tsx:99-126` does:

```
SHIPPED dialogs: 0  groups: 1
SHIPPED content role attr: presentation
SHIPPED content tabindex: -1
SHIPPED group aria-label: Create an automation rule from this tags change
SHIPPED [modeSelect, tick, amountCbx, accountCbx, comboboxCount]: [true, true, true, true, 2]
PRE-FIX dialogs: 1
descriptionAlias has proposal-tag-mode: false
```

- No `dialog` role survives anywhere in the proposal components — confirmed by grep across both
  files and by the render above. `role` appears only as `presentation` (wrapper), `group` (the
  control set) and `alert` (error text).
- The pre-fix simulation genuinely reproduces the regression (1 dialog), so the fix is load-bearing.
  My first attempt at this passed `role={undefined}` explicitly, which still overrides Radix's
  default in the spread and wrongly showed 0 dialogs; omitting the prop entirely is the faithful
  simulation. Recording the correction because the wrong version looked like a passing result.
- Accessible names and roles survive: the four-mode select is reachable as
  `combobox "When to apply this rule"`, the tick as `button "Create this rule"`, and both
  restrictions as checkboxes named "Only if …" / "Only this account (…)". The group keeps a
  descriptive label. Semantics were not stripped.
- Radix's confirmed default is `role: "dialog"` at `@radix-ui/react-popover/dist/index.mjs:244`,
  spread-overridable — so the fix mechanism is sound, not incidental.

**Caveat (record, do not block):** `role="presentation"` on an element that still carries
`tabindex="-1"` is slightly inconsistent — presentation removes semantics from a node that remains
programmatically focusable. It is harmless here and strictly better than announcing a modal. If a
future revision touches this file, `role="none"` plus removing the tabindex, or moving the group
role onto the content itself, would be marginally cleaner. Not a defect.

---

## F-5 — Non-blocking. Evidence accuracy

The evidence is unusually honest — it volunteers four self-inflicted defects and names the one
argument it could not prove. Two corrections:

1. **The remount claim is false as written** (F-1). `implementation-01.md` defect #1 presents the
   remount as found and fixed; it was fixed one level below where it occurs. The prose reads as a
   settled fact, and it is the claim that, had it been re-measured rather than reasoned about, would
   have caught both blocking findings.
2. **Clause 8's "GAP → closed" is not earned** (F-2). The predicate is tested; the wiring that feeds
   it is not, and the wiring is where it fails. The evidence itself concedes "the wiring is
   exercised by the E2E flows" — it is not, for the two automatic modes.

Everything else I checked held up.

---

## What I independently confirmed (MEASURED, not accepted from the table)

- **The gap was real and correctly diagnosed.** `use-transaction-rule-workflow.ts` exposes only
  `save(ruleId)`/`remove(ruleId)`; `computeFieldRuleRobotState` returns `none` when
  `selectWinningRule` finds nothing. There was no create path. Confirmed by reading both.
- **Mutation test of the two guards, re-run independently** in an isolated copy (never in the shared
  tree): baseline 36/36; both guards neutered to `return true` → **3 failed | 33 passed**, exactly
  the three the evidence names. Restoring → 36/36. The evidence's claim reproduces exactly.
- **Stronger mutation, mine:** collapsing the create branch to `{ kind: "none" }` — i.e. reverting
  to the robot-only behaviour that caused the principal's report — fails **10 of 36** tests. The
  unit suite genuinely pins the creation surface apart from the robot; it is not decorative.
- **The two surfaces are pinned apart, as claimed.** `field-rule-proposal-state.test.ts:101-111`
  asserts robot `none` and proposal `create` for identical inputs — a robot-only implementation
  fails it. All eight proposal testids (`tags-rule-proposal`, `proposal-apply-mode`,
  `proposal-confirm`, `proposal-amount-toggle`, `proposal-account-toggle`, `proposal-tag-mode`,
  `description-rule-proposal`, `allocation-rule-proposal`) exist **only** in
  `FieldRuleProposal.tsx`; grep confirms no other source defines them, so no robot implementation
  can satisfy them. The robot uses a disjoint set (`*-rule-robot`,
  `TransactionRuleRobot.tsx:33-35`).
- **The tag journey's before/after robot claim is true:** `rule-creation-controls.spec.ts:118`
  asserts robot count `0` before, `:152` asserts `2` after — within one test.
- **I applied root's "would this still pass if the creation surface were absent?" test to every new
  assertion** and found none that survives its absence. The journeys additionally assert
  user-visible outcomes on the _other_ row (`:145`, `:191`, `:230-232`) and a negative control on
  the non-matching row (`:148`), so a surface that renders correct controls but writes nothing fails
  them. `data-kind` (`FieldRuleProposal.tsx:94`) separates create from update. This part of the
  blindness audit is accurate. **What it does not cover is a defect inside a working creation
  surface — which is exactly where F-1 and F-2 live.**
- **Targeted unit runs:** `field-rule-proposal-state.test.ts` + `rule-editor-data.test.ts` → **46
  passed**, on the reviewed tree.
- **Tooltip copy is genuinely shared:** `APPLY_MODE_TOOLTIP` now lives in `rule-editor-model.ts` and
  is imported by both `FieldRuleEditor.tsx` and `FieldRuleProposal.tsx:136-138`. One string, no
  possible drift. Clause 7 conforms.
- **Precedence, manual-row applicability and update-not-duplicate** delegate to the P17A engine
  (`selectWinningRule`, `fieldAppliesToManual`) rather than being re-implemented — verified by
  reading `field-rule-proposal-state.ts:136-150` against `rules.ts:174-216`. Clauses 10, 12, 16, 20
  conform.
- **The allocation control spans the whole set:** `TransactionRow.tsx:499-527` wraps the entire run
  of allocation cells in one `grid-cols-subgrid` anchor with `gridColumn: span N`, each cell keeping
  its own `role="gridcell"`. Clause 19 conforms structurally.
- **The "not the full editor" argument is sound.** `:283` requires reuse for the ROBOT popup, which
  is untouched and still mounts the shared `FieldRuleEditor`; `:255-260` enumerates the creation
  controls exhaustively. Rendering the enumerated set while sharing draft, validation, mode list,
  tooltip and CRUD behind it is the right reading. I agree with the implementer here.

---

## Clause verdicts where I differ from the evidence

| #   | Clause                                          | Evidence verdict                  | My verdict (MEASURED)                                                                                           |
| --- | ----------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 2   | `:252-253` no resize, no occlusion              | GAP → closed, structural argument | **CONFORMS.** Structural argument accepted AND measured (F-3)                                                   |
| 3   | `:253-254` near the mouse, unfocused popup      | GAP → closed                      | **PARTIAL.** Anchoring and non-focus-stealing conform; the edit is nonetheless interrupted by the remount (F-1) |
| 8   | `:263-266` "Updating" on blur, "Update" on tick | GAP → closed                      | **FAILS.** "Update…" conforms; "Updating…" fires immediately (F-2)                                              |

The other 17 clause verdicts I checked match the evidence.

---

## Required for revision 02

1. Fix F-1: one stable element type across both branches of `renderRuleProposal`; correct the two
   comments that claim the property. Test: the tag dropdown survives selecting a tag while a
   proposal is pending.
2. Fix F-2: `isEditing` must reflect real row focus. Test: an "Updating…" mode writes nothing until
   focus leaves the row, and does write on blur. Do not regress the description path, which is
   currently correct.
3. Re-run the full six checks and restart the E2E campaign from run 1 against the new tree, with a
   per-run digest — the current 3-run campaign is evidence only for `c8dc004`.
4. No change required for F-3, F-4 or the other 17 clauses.

## Proposed questions

### Q-PROPOSAL-P30-R01-01 — Should an "Updating…" mode ever auto-apply from the inline proposal?

- Raised by/package/revision: `p30-reviewer-01` / P30 / 01
- Context: F-2 is a wiring defect and must be fixed. But even correctly wired, an "Updating…" mode
  creates a rule and rewrites other transactions on blur, with no confirmation, from a surface the
  user may not have looked at. The frozen text plainly asks for this (`:263-266`), so I am not
  proposing to override it.
- Why existing authority does not decide it: `:249-266` describes the modes on the creation controls
  without distinguishing "create a rule that did not exist" from "apply a rule that does". Automatic
  application of an _existing_ rule is a smaller act than automatic _creation_ of one.
- Options: (a) implement as frozen — automatic modes auto-create on blur; (b) automatic modes
  auto-apply only for `kind: "update"`, requiring the tick for `kind: "create"`.
- Recommended reading for revision 02: **(a)**, the frozen text as written, since it is explicit and
  a reviewer should not narrow it.
- Human review still useful: **Yes.** Worth the principal confirming that a blur can silently create
  a rule that rewrites every matching row.

### Q-PROPOSAL-P30-R01-02 — One pending proposal at a time, with the cell remount removed

- Raised by/package/revision: `p30-reviewer-01` / P30 / 01
- Context: The implementer's Q-PROPOSAL-P30-01-03 chose a single `pendingRuleEdit`. I agree with the
  choice, but note the fix for F-1 interacts with it: mounting `TransactionRuleProposal`
  unconditionally means the _component_ exists per rule-backed cell even though at most one popover
  is open. That is a render-cost question, not a behaviour change, and the single-pending-edit
  semantics should be preserved exactly as chosen.
- Recommended: keep (a), one at a time; make the F-1 fix explicitly preserve it.
- Human review still useful: No, beyond the implementer's existing proposal.

I concur with the implementer's Q-PROPOSAL-P30-01-01 (clearing a field offers no rule) and its
reasoning: the frozen `RuleAction` union has no clearing action, and offering a confirm button that
cannot produce a valid rule would be worse. Its request for principal review of that one is well
placed. Q-PROPOSAL-P30-01-02 I agree with as recorded.
