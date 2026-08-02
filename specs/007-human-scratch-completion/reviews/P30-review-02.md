# P30 / UR-009 — independent review, revision 02

**VERDICT: FAIL**

- **Package/revision:** P30 / 04 (second independent review; rev 01's review was `P30-review-01.md`)
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Frozen contract:** `specs/human-scratch.md:248-295`
- **Reviewer:** `p30-reviewer-02` (distinct from `p30-implementer-01` and from `p30-reviewer-01`;
  wrote no product code)
- **Reviewed tree:** `5b0c441`
- **Blocking findings:** F-7
- **Non-blocking findings:** F-8, F-9, F-10

**F-1 and F-6 are genuinely fixed and I confirmed both by direct measurement against the real
shipped component, not against the evidence's prose.** The occlusion fix is real, correctly
diagnosed, and the right shape. **F-2 is not fixed.** It is fixed for the gesture the new E2E test
drives and broken for the gesture the frozen text actually names, and the rev 04 change is what
narrowed it: by deferring the proposal's mount until the edit surface closes, the component now arms
its focus listener _after_ the blur it is waiting for has already happened, in the most common
commit path. The result is not the rev 01 defect (nothing is written without authority) but its
mirror: the two "Updating…" modes silently do nothing on the gesture `:264` specifies.

## 0. Preconditions I verified myself

| Check                                           | Result (MEASURED)                                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `git merge-base --is-ancestor 5b0c441 HEAD`     | exit 0 — `5b0c441` IS an ancestor of HEAD `e61d8e3`. Re-run by me at the start, before reading any diff                                 |
| `sha256sum specs/human-scratch.md`              | `469e98c7…49d2f6a` — byte-equal to the frozen value. I never opened it for writing                                                      |
| Reviewed range                                  | `a265e54..5b0c441` (rev 04), read against `c8dc004..5b0c441` for the rev 01 findings                                                    |
| `as` / `any` / `!` in the reviewed product diff | **Zero.** The single grep hit on added lines is comment prose — `"reads as a guard while guarding nothing"`. Clean                      |
| Secret-safety of the diff and this file         | No key, seed phrase, recovery material, `SUPABASE_JWT_SECRET` or vault plaintext. E2E fixtures are synthetic inline CSV. **No leak**    |
| Other agents' work                              | Untouched. No `git stash`, no `git checkout --`. My scratch lived in `.p30r2-scratch/`, deleted before writing this; `git status` clean |
| Port :3000                                      | **Not taken.** Free at the time I checked; I left it for `p33-implementer-01`. I ran no dev server and no E2E suite                     |
| Load discipline                                 | Load average 0.32 at start, no live campaign. I ran only targeted jsdom suites and headless `setContent` probes with no server          |

**How I measured without the port.** Two instruments, neither needing a dev server. (1) Targeted
`vitest` runs mounting the **real** `TransactionRuleProposal` with only `useFieldRuleProposal` and
`FieldRuleProposal` mocked, so the anchoring, the `shouldShow` gate, the focus listener and the
auto-apply effect are all the shipped code. (2) Headless Chromium via `page.setContent()` — a real
browser's real focus pipeline, no app, no port — to settle the jsdom-vs-browser questions that the
first instrument cannot.

---

## F-7 — BLOCKING. The "Updating…" modes do not fire on the frozen gesture; the rev 04 fix is what broke them

**Severity:** frozen-contract violation on `:263-266`. Not a data-safety defect — the failure is
silent inaction, not an unauthorised write — but it is the same clause rev 01's F-2 was raised on,
and it is now failing in the opposite direction.

### The frozen requirement

`:263-266`: _"The prefix 'Updating' implies the change will apply automatically **when the row loses
focus**, or if you click the tick button."_ Root's ruling binds me further: auto-create and
auto-apply are ONE action on the row losing focus, and the tick is an alternative trigger for that
same action. So "the row loses focus" must be the trigger, and it must work.

### What the code does

`TransactionRuleProposal.tsx:91` gates the whole proposal on
`shouldShow = props.isPending && !props.isEditing`. `PendingRuleProposal` — which owns the focus
listener and the auto-apply effect — mounts **only when `shouldShow` is true** (`:97`). Its listener
is registered in a `useEffect` on mount (`:155-170`) and observes **`focusin` only**. It never reads
`document.activeElement`, so it has no notion of focus _state_: only of focus _transitions that
occur after it exists_.

That is two independent conditions, and rev 04 introduced the coupling between them:

1. the proposal must have mounted, which requires the cell's edit surface to have **closed**; and
2. a `focusin` must fire **after** that mount, landing outside the row.

### Measurement 1 — the description path, which is the frozen text's own example, never fires

`:249-251` describes this exact flow: _"when you **apply a description alias** to a transaction on
the transactions page where the description text doesn't already match a rule, some controls
appear."_

`InlineEditableDescriptionAlias.tsx:213-217`: pressing Enter commits and calls
`inputRef.current?.blur()`. `:259-265`: the input's `onBlur` calls `onEditingChange?.(false)`. So
the blur and the edit-surface close are the _same_ event, and focus lands on `<body>`.

MEASURED, real Chromium, `page.setContent`, no app:

```
gesture: "press Enter in the cell, which calls input.blur()"
  events:            ["focusout:rowinput"]
  focusinObserved:   FALSE
  rowStillHasFocus:  false
  activeElement:     BODY
```

**A blur to `<body>` fires `focusout` and no `focusin` at all.** The row has genuinely lost focus —
the frozen condition is satisfied — and the shipped listener is deaf to it, because it listens for
the wrong half of the pair.

MEASURED against the real shipped component (jsdom, real `TransactionRuleProposal`,
`applyMode: "updatingAll"`, description field):

```
G1  description edited, committed with Enter
      activeElementTag:  BODY          (row has lost focus)
      proposalOpen:      1             (controls are showing)
      applied:           0             (nothing happened)
```

The user selected "Updating all", pressed Enter, and the row lost focus. **Per `:264` the rule
should have been created and applied. It was not.** The proposal sits open indefinitely.

### Measurement 2 — three of the four row-blur gestures are missed

MEASURED, real Chromium, enumerating how a row actually loses focus:

| Gesture                                             | `focusin` fires? | Auto-apply reached? |
| --------------------------------------------------- | ---------------- | ------------------- |
| Click a focusable control outside the row           | **yes**          | **yes**             |
| Press Enter in the cell (`input.blur()` → `<body>`) | no               | **no**              |
| Tab off the end of the document                     | no               | **no**              |
| Trusted click on non-focusable page chrome          | no               | **no**              |

The last row is the ordinary case of clicking empty space below the table:

```
TRUSTED CLICK ON NON-FOCUSABLE CHROME:
  {"events":["focusout:rowinput"], "rowStillHasFocus":false, "active":"BODY"}
```

**One of four gestures works. The one that works is the one the new E2E test drives.**
`rule-creation-controls.spec.ts:388` blurs by clicking
`getByRole("textbox", {name: /search description/i})` — the `<Input>` at
`TransactionFilters.tsx:112`, a focusable element, the single case that produces a `focusin`.

### Measurement 3 — the mount-ordering hazard the fix introduced, and its true scope

I set out to show the listener is armed too late in the tag path and **found the opposite**;
recording it because it constrains what must change.

MEASURED (real component, single gesture, browser-faithful microtask checkpoint between the
`mousedown` that closes the picker and the `focusin`):

```
mousedown outside, microtask checkpoint, then focusin
  applied: 1        <- the listener IS armed in time
```

React flushes the state update from the `mousedown` listener at the microtask checkpoint the HTML
spec performs when the stack empties, which is before the browser dispatches `focusin`. So the mount
wins the race whenever a `focusin` is coming at all.

But when I removed the checkpoint — modelling a same-task dispatch — `applied` was `0` with the
proposal left open. **The correctness of the tag path rests on an event-loop ordering detail nothing
in the code states or pins.** That is fragile even where it currently works.

And it does not rescue the other three gestures, for a reason no ordering fix can touch:

```
C: focus already outside the row BEFORE the picker closes
      activeElementOutsideRow:                  true
      proposalStillOpenDespiteRowUnfocused:     1
      applied:                                  0
```

**The component cannot recover a blur that predates its own mount, because it never reads focus
state.** Rev 04 made this reachable by construction: the mount is now _defined_ to happen at the
moment the edit surface closes, and in the description path that is the very same event as the blur.

### Why the test suite does not see this

Applying root's blindness test — _would this still pass if the defect were present?_ — to
`rule-creation-controls.spec.ts:363-393`, the only test that drives an automatic mode:

- It drives the **tags** field, whose picker closes on a separate earlier gesture (`addTagToRow` at
  `:98` clicks `date-editable`), so by the time the blur happens the proposal has long since
  mounted. MEASURED: that click produces `focusin:date-editable` and `rowContainsActive: true` —
  correctly _not_ a blur.
- It blurs to a focusable `<Input>`, the one gesture in four that emits `focusin`.

**Both of the test's choices sit on the working side of the defect.** No test drives an "Updating…"
mode on the **description** field — the field `:249-251` names — and none blurs by Enter, by Tab, or
by clicking empty space. The rev 01 review found that the automatic modes were never driven at all;
rev 04 added one path through them and picked, without noting the choice, the only combination that
passes.

The unit suite cannot catch it either, and its shape is why.
`rule-proposal-stability.test.tsx:198-207` asserts `DOES write once focus genuinely leaves the row`
— but `AutoApplyHost` (`:127-183`) is a **reproduction** whose `isEditing` is driven by a button
click entirely separate from the focus move, and whose blur is `fireEvent.focusIn(outside-input)`.
It hard-codes both of the favourable conditions. It is a faithful copy of the _predicate_ and not of
the _wiring_, which is the same failure rev 01's F-5 named: the predicate is tested, the wiring is
where it breaks.

### What must change

`isEditing` and `shouldShow` should not gate the _existence_ of the focus tracking. Concretely,
either:

- **(a)** listen for `focusout` as well as `focusin`, and treat "focus left the row and landed
  nowhere focusable" as the blur — this alone fixes three of the four gestures; **and**
- **(b)** decouple the auto-apply lifecycle from the popover's visibility, so the focus state that
  exists at mount is read rather than only transitions after it. Mounting the tracking whenever
  `isPending` while gating only the _rendered popover_ on `!isEditing` would preserve the occlusion
  fix in full — the occlusion is a layout problem about what is _painted_, and nothing about it
  requires the effect to be unmounted.

Then pin it with tests that fail without the fix: an "Updating…" mode on the **description** field,
committed with Enter, must write; and a tag change followed by a click on empty page chrome must
write. Both fail today.

**Where:** `src/components/features/transactions/TransactionRuleProposal.tsx:91` (the `shouldShow`
gate), `:97` (conditional mount of the listener's owner), `:155-170` (the `focusin`-only listener),
`:173-181` (the auto-apply effect). Contributing:
`src/components/features/transactions/cells/InlineEditableDescriptionAlias.tsx:213-217` and
`:259-265`.

---

## F-8 — Non-blocking. `data-owned-by-row` carries no row identity

MEASURED (real component, focus moved into a portaled surface marked `data-owned-by-row` that
belongs to a **different** row):

```
G3  appliedWhenFocusWentToAnotherRowsPicker: 0
```

`TransactionRuleProposal.tsx:166` treats **any** element under `[data-owned-by-row]` as "still in
this row". The attribute is a bare boolean set in three places (`InlineEditableTags.tsx:313`,
`FieldRuleProposal.tsx:114` and `:196`, plus the popover content at
`TransactionRuleProposal.tsx:193`) and names no row. So moving from row A's pending edit into row
B's tag dropdown reads as "never left row A", and the "Updating…" apply is suppressed.

This is the _safe_ direction of error and it is genuinely hard to reach today, because only one
`pendingRuleEdit` exists at a time (`page.tsx:545-548`) and opening row B's picker does not clear
row A's proposal. Recording rather than blocking: it is one more way the same auto-apply silently
does not happen, and whoever fixes F-7 will be in this code. Carrying the transaction id
(`data-owned-by-row={transactionId}`) and comparing it would close it.

---

## F-9 — Non-blocking. The unit reproduction diverges from the shipped wiring in the way that hides F-7

`rule-proposal-stability.test.tsx:127-183` reproduces the auto-apply rule, and its F-2 cases are
individually correct. But `AutoApplyHost` is always mounted — it is not gated on `shouldShow` at all
— so it can never exhibit the listener-armed-too-late class, and its `isEditing` transition is
decoupled from its focus transition, which the real description path fuses into one event.

The file's own header says the defects "reproduce exactly without the CRDT stack". For F-1 that is
true and I verified it. For F-2 it is not: the reproduction omits precisely the coupling that rev 04
introduced. **A reproduction is evidence only for the structure it reproduces**, and this one no
longer matches the shipped structure after `b6950ca` changed it.

Not blocking on its own — F-7 already forces a revision — but the replacement test must mount the
real component, as my measurements did, rather than extend this harness.

---

## F-10 — Non-blocking. The restriction checkboxes are asserted to exist and never operated

Applying the implementer's own cross-package heuristic — _the weak assertions are the ones that
check a control EXISTS rather than what it DOES_:

MEASURED by grep across `tests/e2e/`: `proposal-amount-toggle` and `proposal-account-toggle` appear
**only** at `rule-creation-controls.spec.ts:143-144`, both under `toBeVisible()`. Neither is ever
clicked, in any test, on either surface. Frozen `:258-260` gives each a specific behaviour —
restrict to an exact amount, restrict to the selected account — and no test exercises either. A rule
that ignored both restrictions entirely would pass the whole suite.

The unit layer does not cover it either: `field-rule-proposal-state.test.ts` exercises the matcher's
precedence over already-scoped rules (`:124-140`), which is the read path; nothing drives a
_user-set_ restriction from the proposal into a written rule.

Non-blocking because `:258-260` describes controls that are present and wired to the shared draft
model, and because the F-7 fix does not touch it. Worth closing in the same revision.

---

## What I independently confirmed (MEASURED, not accepted from the evidence)

**F-1 is genuinely and completely fixed.** Measured against the **real** `TransactionRuleProposal`,
driving the actual sequence — pending set while the picker is still open, then the picker closing:

```
cellMountCount:                      1        (one mount across both flips)
sameNodeAfterPendingFlip:            true
sameNodeAfterEditingFlip:            true
valuePreserved:                      "half-typed"
proposalRenderedWhileStillEditing:   0
proposalRenderedAfterEditEnds:       1
```

The cell keeps its identity and its in-progress edit across both state flips. Rev 01's F-1 is
closed.

**The F-1 control the dispatch asked me to check exists and is load-bearing.** It is
`rule-proposal-stability.test.tsx:110-119`, `"the two-element-type shape DOES remount"`. I ran the
rev 01 `BrokenHost` shape against the _fixed_ test's assertions:

```
mountCalls: 2,  sameNode: false      -> both fixed-shape assertions FAIL on the broken shape
```

So the passing assertions are not vacuously true of any structure. The shipped suite is **8 passed**
on the reviewed tree.

**The occlusion diagnosis is correct and the fix is the right shape.**
`InlineEditableTags.tsx:308-318` renders its picker portaled, `fixed`, `z-[9999]`, positioned at
`rect.bottom + 4` (`:134-141`) — the exact space a `side="bottom"` popover anchored to the same cell
occupies. Deferring avoids the collision rather than arbitrating it, and I agree with the
implementer that arbitration was the wrong shape. **My objection in F-7 is not to deferring the
_popover_; it is to deferring the _effect_ along with it.**

**The occlusion suite clicks rather than asserts visibility, as claimed.**
`rule-creation-controls.spec.ts:341-351` clicks `proposal-apply-mode`, asserts the option list
opens, dismisses it and asserts `proposal-confirm` is enabled. That discriminates a covered control
from a reachable one, which `toBeVisible` does not. The claim is accurate.

**F-6 is closed.** `:426-437` now presses `proposal-confirm` on the update path and asserts the
outcome three ways: the other matching row gains "Dining", the robot count stays `2`, and the
automations page lists exactly `1` rule. A duplicate-rule bug fails the last of these. This is the
strongest journey in the file.

**The two surfaces are pinned apart.** `computeFieldRuleRobotState` returns `none` where
`computeFieldRuleProposal` returns `create`; the eight proposal testids exist only in
`FieldRuleProposal.tsx` and the robot uses a disjoint set. Rev 01 established this and nothing in
rev 04 touched it.

**The removed Escape guard was correctly removed, and the removal is correctly scoped.** Root's
ruling that `InlineEditableTags`'s Escape handler is out of scope holds: it is bound at
`InlineEditableTags.tsx:321-326` to `CommandInput`'s `onKeyDown`, and `:248-295` contains no
language about Escape or dismissal. The implementer's discriminating experiment (4 failed / 4 passed
with and without the guard) is the right evidence for calling it inert. Deleting the two unit cases
that pinned a deleted predicate is right for the same reason.

**No product-code violations.** Zero `as`, `any` or `!` in the reviewed diff.

**The campaign logs exist and match the evidence.** `/tmp/p30-campaign/run-{1,2,3}.log` are present;
tails read `188 passed / 1 failed`, `189 passed`, `186 passed / 3 failed`. The digest files are on
disk. I did not re-run the campaign — see below.

---

## On the campaign, and what it does and does not establish

I did **not** re-run it, and I did not need the port to reach my verdict.

The campaign's P30-specific claim — `rule-creation-controls` clean across three complete runs — is
supported by the logs, and I accept it. **But greenness here cannot discharge F-7, because no test
in the suite drives the failing gestures.** A defect no assertion looks at is invisible to any
number of runs. This is the same point rev 01 made about F-2 and it applies again, one layer in: rev
04 added a test for the automatic modes, and the test's two incidental choices both landed on the
working path. The campaign is evidence for what the suite checks, and the suite does not check
`:264` for the description field.

On the `people-settlement.spec.ts` failures: I did not chase them, per the dispatch. I note only
that the evidence's own account is internally consistent — rotating membership, no test failing in
more than one run, matching pre/post digests — and that its retraction of the "sharp commit
boundary" claim, and its statement of the unresolved tension rather than a seventh mechanism, are
the right handling. **Nothing in that spec bears on P30's verdict either way.**

## Where I differ from the rev 01 review

| Clause                                         | rev 01 verdict                    | My verdict (MEASURED)                                                                             |
| ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `:253-254` unfocused popup, edit uninterrupted | PARTIAL, remount interrupts (F-1) | **CONFORMS.** The remount is gone; the edit survives; the popup steals no focus                   |
| `:263-266` "Updating" on blur                  | FAILS — fires immediately (F-2)   | **STILL FAILS**, in the opposite direction: 1 of 4 row-blur gestures reaches it (F-7)             |
| `:255-257` controls operable                   | (not separately raised)           | **CONFORMS**, and is now positively measured by a clicking assertion rather than a visibility one |

The other clauses rev 01 measured — the structural argument for `:252-253`, the `role="dialog"`
removal, precedence, manual-row applicability, the shared tooltip, the allocation span — are
untouched by rev 04's two commits and I found no reason to disturb them. I re-derived the ones the
diff could plausibly have disturbed and none had.

---

## Required for revision 05

1. **Fix F-7.** Observe `focusout` as well as `focusin`, and stop tying the auto-apply effect's
   lifetime to the popover's visibility. The occlusion fix must be preserved — gate what is
   _painted_, not what is _observed_.
2. **Pin it with tests that fail without the fix:** an "Updating…" mode on the **description** field
   committed with Enter must write; and a tag change followed by a click on non-focusable page
   chrome must write. Both fail on `5b0c441`.
3. **Replace, do not extend, the F-2 unit reproduction** (F-9). Mount the real component so the
   `shouldShow` gate and the listener's mount timing are inside the test's scope.
4. **Close F-10:** click at least one restriction toggle and assert it reaches the written rule.
5. **Consider F-8** while in this code: give `data-owned-by-row` the transaction id.
6. **Restart the campaign from run 1** against the new tree with a per-run digest.
7. **No change required** for F-1, F-6, the occlusion fix, the Escape-guard removal, or the clauses
   rev 01 passed.

## Proposed questions

### Q-PROPOSAL-P30-R02-01 — Should a row-blur that lands on `<body>` count as "the row loses focus"?

- Raised by/package/revision: `p30-reviewer-02` / P30 / 04
- Context: F-7 rests on reading `:264`'s "when the row loses focus" as satisfied whenever the row no
  longer contains `document.activeElement` — including when focus falls to `<body>` after Enter,
  Tab, or a click on empty space. The shipped code implicitly requires focus to _arrive_ somewhere
  focusable instead.
- Why existing authority does not decide it: root has ruled on _what_ the automatic modes do and on
  _which_ gesture triggers them, but not on what counts as the row losing focus. The frozen text
  says only "loses focus".
- Options: (a) any state where the row no longer holds focus, including `<body>`; (b) only a
  transfer to another focusable element.
- Recommended reading for revision 05: **(a)**. Reading (b) would make the frozen trigger
  unreachable from the description path that `:249-251` uses as its own worked example, and a user
  pressing Enter has plainly finished with the row. I have implemented my finding against (a).
- Human review still useful: No. (a) follows from the frozen text; I record it so the reading is
  explicit rather than assumed.

### Q-PROPOSAL-P30-R02-02 — Should the auto-apply survive the proposal being dismissed by scroll or re-edit?

- Raised by/package/revision: `p30-reviewer-02` / P30 / 04
- Context: Fixing F-7 by decoupling the effect from the popover raises the question of how long a
  pending automatic apply stays armed — e.g. if the user re-enters the same cell before blurring.
- Recommended: keep the single-`pendingRuleEdit` semantics exactly as chosen (`page.tsx:545-548`);
  re-entering the cell should re-arm, not double-apply. The existing `appliedRef` guard
  (`TransactionRuleProposal.tsx:135-149`) already makes the write once-only per mount and should be
  preserved.
- Human review still useful: No.

I concur with rev 01's Q-PROPOSAL-P30-R01-01 (worth the principal confirming that a blur can
silently create a rule rewriting every matching row) and note it becomes _more_ pointed once F-7 is
fixed and the automatic modes actually fire on all four gestures.
