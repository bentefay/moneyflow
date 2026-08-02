# P30 / UR-009 — independent review, revision 03

**VERDICT: FAIL**

- **Package/revision:** P30 / 05 (third independent review)
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Frozen contract:** `specs/human-scratch.md:248-295`
- **Reviewer:** `p30-reviewer-03` (distinct from `p30-implementer-01`, `p30-reviewer-01` and
  `p30-reviewer-02`; wrote no product code)
- **Reviewed tree:** `d7fe06a`
- **Blocking findings:** F-11
- **Non-blocking findings:** F-12, F-13

**F-7 is genuinely and completely fixed, and I confirmed it by driving all four gestures myself
rather than by reading the evidence.** The watch/paint separation is the right shape and the
occlusion fix survives it intact. F-8 and F-10 are closed and I verified both discriminate. F-9 is
half closed — the predicate half is real, the watch/paint half is not (F-12).

**But rev 05 introduced a new defect of its own, and it is in the write direction.** Moving the
observer's arming point from `!isEditing` to `isPending` was correct, and it widened the window
during which a **latch that never resets** can be set. `rowLostFocus` can now be set during the
edit, before the controls have ever been painted, and the apply then fires the instant the edit
surface closes — **while the row is holding focus**. MEASURED against the real shipped component:
`applied: 1` with `rowHasFocus: true`. That is `:264` failing in the same direction rev 01's F-2
failed: a rule created and every matching transaction rewritten before the user has seen the
controls.

## 0. Preconditions I verified myself

| Check                                           | Result (MEASURED)                                                                                                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git merge-base --is-ancestor d7fe06a HEAD`     | exit 0. Re-run before reading any diff, and again at the end. HEAD `d0b2561`, one docs-only commit ahead                                                                                 |
| `sha256sum specs/human-scratch.md`              | `469e98c7…49d2f6a` — byte-equal to the frozen value, re-checked after all my work. Never opened for writing                                                                              |
| Reviewed range                                  | `5b0c441..d7fe06a`, commits `d67e717` and `d7fe06a`                                                                                                                                      |
| Commit hygiene                                  | **Clean.** The range's diff also shows `table-selection.ts` and `index.ts`, but neither P30 commit touches them — they arrive from another package. Both P30 commits name only P30 files |
| `as` / `any` / `!` in the reviewed product diff | **Zero.** Every grep hit on added lines is the English word "as" in prose or a test title                                                                                                |
| Secret-safety of the diff and this file         | No key, seed phrase, recovery material, `SUPABASE_JWT_SECRET` or vault plaintext. E2E fixtures are synthetic inline CSV. **No leak**                                                     |
| `pnpm typecheck`                                | **PASS**, clean                                                                                                                                                                          |
| `eslint` on the five reviewed files             | **PASS**, zero output                                                                                                                                                                    |
| `pnpm test` (full suite, my own run)            | **PASS** — 126 files, 2448 passed, 2 skipped. Corroborates the evidence's numbers exactly                                                                                                |
| Other agents' work                              | Untouched. No `git stash`, no `git checkout --`. Scratch lived in `.p30r3/`, deleted. `git diff --quiet HEAD -- src tests` passes                                                        |
| Port :3000                                      | **Not taken.** No dev server, no E2E suite. Left for `p33-implementer-01`                                                                                                                |
| Load discipline                                 | Load average 20.8 at start (campaign live) — I ran only targeted vitest files and portless Chromium probes until it fell to 0.32, then ran `pnpm test` once                              |

**How I measured without the port.** Three instruments. (1) The **real** `TransactionRuleProposal`
in jsdom with only `useFieldRuleProposal` and the presentational `FieldRuleProposal` mocked, so the
`isPending`/`shouldShow` gating, the focus observer, `isFocusStillInRow` and the auto-apply effect
are all shipped code. (2) Headless Chromium via `page.setContent()` with **trusted** Playwright
clicks and keypresses — a real focus pipeline, no app, no port. (3) A verbatim port of the shipped
observer (`TransactionRuleProposal.tsx:191-219`), `setTimeout` deferral included, driven by trusted
input in that same browser.

---

## F-11 — BLOCKING. `rowLostFocus` is a latch that never resets, and rev 05 widened the window in which it can be set prematurely

**Severity:** frozen-contract violation on `:263-266`, in the **write** direction. A rule is created
and applied to every matching transaction at a moment when the row holds focus — and, on the path I
measured, before the controls have ever been painted.

### The mechanism (MEASURED by reading, then by execution)

`TransactionRuleProposal.tsx:157` declares
`const [rowLostFocus, setRowLostFocus] = useState(false)`. The only writer anywhere is
`setRowLostFocus(true)` at `:204`. **There is no path that sets it back to false.** It resets only
when `PendingRuleProposal` unmounts, which happens when `isPending` goes false — i.e. when the whole
proposal is over.

Until rev 05 that latch was nearly harmless, because the observer only existed while `!isEditing` —
after the controls were already painted. `d7fe06a` mounts the observer on `isPending` alone
(`:117-119`), deliberately and correctly. The consequence is that the latch is now armed **during
the edit**, and the auto-apply effect at `:229-232` fires on the `isEditing` false transition:

```ts
if (!open || props.isEditing || !isAutomatic || !rowLostFocus) return;
confirm();
```

`rowLostFocus` is read as "the row has lost focus", but after rev 05 it means "the row lost focus at
some point since the edit began". Those are different propositions, and `:264` names the first.

### Measurement 1 — the real component applies while the row holds focus

MEASURED against the real shipped `TransactionRuleProposal`, `applyMode: "updatingAll"`, driving the
exact real-app sequence (`page.tsx:1172-1174` sets the pending edit from the tag picker's `onSave`,
while `InlineEditableTags` keeps the picker open — it closes only on mousedown-outside,
`InlineEditableTags.tsx:155-171`):

```
step 2  pending set, picker open, focus in the owned portal   applied: 0
step 3  focus leaves the row while the picker is still open   active: BODY,  applied: 0
step 4  focus returns into the row, picker closes             rowHasFocus: true, applied: 0
step 5  the edit surface closes                               rowHasFocus: true, applied: 1
                                                              VERDICT: APPLIED WHILE THE ROW HELD FOCUS
```

**At step 5 the frozen condition is false and the write happens anyway.** The controls paint at step
5 too (`showControls` becomes true in the same commit), so the user's first sight of the proposal is
simultaneous with the rule being written and every matching transaction rewritten. There is no
window in which to choose a mode or dismiss. That is the shape of rev 01's F-2, reached by a new
route.

### Measurement 2 — step 3 is reachable, in real Chromium, with trusted input

The picker's only pointer-driven close is a mousedown outside it, so **keyboard focus can leave the
row with the picker still open.** MEASURED, real Chromium, trusted `Tab` from the picker's search
input, with the portal appended to `document.body` as `createPortal` does:

```
before      active: pickerinput,  insideRowOrOwnedPortal: true
afterTab    active: BODY,  pickerStillOpen: true,  rowContainsActive: false,  ownedByRow: null
afterBack   active: pickerinput,  pickerStillOpen: true      (Shift+Tab returns)
```

The portaled picker is last in the document and its cmdk root and list are `tabindex="-1"`
(`cmdk-root` / `cmdk-list`), so `Tab` from the search input leaves the document entirely. Focus is
on `<body>`, the row does not contain it, and `data-owned-by-row` does not claim it — so
`isFocusStillInRow` returns false and the latch is set, with the edit still in progress.

### Measurement 3 — what does NOT trigger it, which is why nothing caught it

I checked the obvious false-positive candidates before raising this, using the verbatim port of the
shipped observer under trusted clicks:

```
T1  click another cell in the SAME row to close the picker
      trace: pickerinput(in) -> pickerinput(in) -> row(in) -> row(in)
      rowLostFocusLatched: FALSE          <- correct, and this is the E2E helper's gesture
T2  click page chrome outside the row      rowLostFocusLatched: true   (correct: row really left)
T3  click a focusable control outside      rowLostFocusLatched: true   (correct)
```

**T1 is exactly what `addTagToRow` does** (`rule-creation-controls.spec.ts:96` clicks
`date-editable`), and the `setTimeout(…, 0)` deferral handles it correctly — the deferred read sees
focus settled on the row element. So the one automatic-mode journey in the suite sits on the safe
side of this defect too, for the third revision running.

I also falsified two mechanisms that would have made this worse than it is, and record them because
they bound the finding:

```
R5  switching the browser window away    active: dateinput,  rowContainsActive: true
    (document.activeElement is preserved, so alt-tab does NOT latch)
R1  removing the focused portal          activeElement -> BODY, focusout fires
    (the Escape-close path latches, but there the row HAS genuinely lost focus, so it is correct)
```

### What must change

The latch must be a reading of current state at the moment the trigger is evaluated, not a sticky
record of history. Either:

- **(a)** re-evaluate `isFocusStillInRow` at the point of applying rather than trusting the stored
  flag — the predicate is already pure and already reads live state, so the auto-apply effect can
  simply ask it again; **or**
- **(b)** clear the latch whenever a read finds focus back inside the row (`setRowLostFocus(false)`
  in the `else` branch at `:203-205`), which makes the flag mean what its name says.

**(a)** is the smaller change and removes the class rather than one instance of it. Either way the
`isEditing` guard should stay: it is doing real work now.

Then pin it with a test that fails without the fix: with an automatic mode selected, focus must
leave the row **and still be outside it** when the edit ends, or nothing is written. The sequence in
Measurement 1 fails on `d7fe06a` and passes with either fix.

**Where:** `src/components/features/transactions/TransactionRuleProposal.tsx:157` (the latch),
`:203-205` (the sole writer, no reset), `:229-232` (the auto-apply effect that reads it), `:117-119`
(the mount widening that made it reachable). Contributing:
`src/components/features/transactions/cells/InlineEditableTags.tsx:155-171` (the picker closes only
on mousedown-outside, so keyboard focus can leave with it open).

---

## F-12 — Non-blocking. The watch/paint unit cases restate the rule and are not load-bearing

The evidence says the F-9 replacement includes "four further cases pin the watch/paint separation,
with the revision 04 coupling kept as a **control**". The control does what it claims about the two
local functions. It says nothing about the shipped component.

`rule-proposal-stability.test.tsx:225-231` defines its own `watches` and `paints`:

```ts
function watches(isPending: boolean): boolean {
    return isPending;
}
function paints(isPending: boolean, isEditing: boolean): boolean {
    return isPending && !isEditing;
}
```

Nothing imports these from the component, and the component exports no such predicate — the rule
lives inline at `TransactionRuleProposal.tsx:108` and `:117`. So the four cases assert that
`isPending` equals `isPending`.

MEASURED by reverting the shipped `d7fe06a` change — restoring `{shouldShow ? <PendingRuleProposal…`
in place of `{props.isPending ? …` in the real component, and changing nothing in the tests:

```
tests/unit/components/rule-proposal-stability.test.tsx    13 passed (13)
```

**The entire unit suite is green with the fix this revision exists to ship reverted.** My own probe,
run against that same reverted tree, caught it immediately (`H2c … applied: 0`, where the fixed tree
gives `applied: 1`) — so the defect is observable at the unit layer; these cases just do not look at
it.

This is the F-9 lesson recurring one layer in. The implementer's own statement of it — _"a fixture I
construct encodes my model; any test whose fixture I hand-built can only fail if my model is
internally inconsistent, never if my model is wrong about the world"_ — applies exactly to `watches`
and `paints`.

**The predicate half of F-9 is genuinely fixed**, and I verified it discriminates rather than
accepting the claim. Reverting each fix in the real `field-rule-proposal-state.ts` and running the
shipped suite unchanged:

```
revert the F-8 identity comparison (bare-boolean marker)
  × does NOT count another row's portaled surface as still in the row     1 failed | 12 passed
revert the F-7 blur-to-body semantics (body/null count as "still in row")
  × treats a blur to body as having LEFT the row
  × treats a null activeElement as having left the row                    2 failed | 11 passed
```

Both fail for the right reason, naming the right defect. Those six cases drive the real exported
predicate over real DOM nodes, as claimed.

**What must change:** either drive the container's mount decision (mount the real component and
assert the observer is live while `isEditing` is true, as my probe does), or delete the four cases.
A test that cannot fail is worse than no test, because it reads as coverage.

**Where:** `tests/unit/components/rule-proposal-stability.test.tsx:218-257`.

---

## F-13 — Non-blocking. The two E2E pins revision 02 required were not added

`P30-review-02.md:379-381` required, as item 2 of "Required for revision 05": _"an 'Updating…' mode
on the **description** field committed with Enter must write; and a tag change followed by a click
on non-focusable page chrome must write."_

MEASURED by grep across `tests/e2e/`: `"Updating all"` and `"Updating new"` appear in
`rule-creation-controls.spec.ts` only at `:378`, inside the same tags journey rev 04 added, which
still blurs by clicking `getByRole("textbox", {name: /search description/i})` — the one focusable
target. `field-rule-parity.spec.ts:281` drives an automatic mode on the **robot**, not this surface.
No E2E test anywhere drives an automatic mode on the description field, and none blurs by Enter, by
Tab, or by clicking non-focusable chrome.

The behaviour is nonetheless correct — I measured all four gestures against the real component
below. The requirement was answered at the unit layer instead, with the predicate cases. That is a
real improvement and it is not equivalent: the predicate cases cannot see wiring, which is what F-9
was about and what F-11 turned out to be. **The suite still has no assertion that would notice the
row's blur trigger regressing at the integration level.**

Non-blocking because the shipped behaviour conforms and F-11 already forces a revision. It should be
closed in the same revision, and the F-11 sequence is the natural test to add alongside.

---

## What I independently confirmed (MEASURED, not accepted from the evidence)

**F-7 is fixed. All four blur gestures now reach the automatic modes.** I re-derived the enumeration
myself against the real shipped component, `applyMode: "updatingAll"`:

```
G1  Enter in the cell -> input.blur() -> <body>      active: BODY,  painted: 1,  applied: 1
G2  focus a focusable control outside the row        active: outside-input,  painted: 1,  applied: 1
G3  blur happens BEFORE the edit surface closes      3a: painted 0, applied 0
    (the description path, where Enter fuses them)   3b: painted 1, applied 1
G4  focus already outside before the edit is pending active: outside-input,  painted: 1,  applied: 1
```

**Four of four, against rev 04's one of four.** G3 and G4 are the cases the state read exists for:
in both, the blur predates the component's ability to observe an event, and both now work. The
frozen text's own worked example at `:249-251` is G1/G3, and it fires.

And the guard still holds where it must: `H1 still editing, focus in the row → applied: 0`. Watching
early did not become applying early on the ordinary path.

**The occlusion fix survives, and the occlusion suite still clicks.**
`rule-creation-controls.spec.ts:341-351` opens `proposal-apply-mode`, asserts the option list opens,
dismisses it and asserts `proposal-confirm` is enabled. That discriminates covered from reachable;
`toBeVisible` does not. MEASURED in my probe: `proposalPainted: 0` at H1 and G3a — the controls are
still withheld until the edit surface closes, which is the whole of the fix. `shouldShow` (`:108`)
is unchanged and `Popover open={shouldShow}` still gates the painted surface; only the observer
moved.

**F-8 is closed.** `data-owned-by-row` carries the transaction id at all four sites
(`FieldRuleProposal.tsx:116` and `:198`, `InlineEditableTags.tsx:319`,
`TransactionRuleProposal.tsx:240`), stamped from `rowId` threaded through `page.tsx:671` and
`TransactionRow.tsx:481`. `isFocusStillInRow` compares it against the row's own
`data-transaction-id` (`TransactionRow.tsx:359`). The revert experiment above shows the assertion
discriminates. Another row's picker no longer reads as "still in this row".

**F-10 is closed, and the chain it asserts is real.** The new journey
(`rule-creation-controls.spec.ts:396-440`) imports two rows sharing a description with amounts
`-1.00` and `-2.00`, ticks `proposal-amount-toggle`, applies to all, and asserts the second row is
**not** tagged and exactly one robot appears. I traced the restriction end to end rather than
trusting the journey: `useAmountScope` → `rule-editor-model.ts:178` (omits the amount when unticked)
→ `rules.ts:192` (`rule.amount != null && rule.amount !== subject.amount` rejects) → `ruleScopeRank`
treats it as a distinct scope. A rule ignoring the restriction would tag the second row, so the
assertion discriminates. This is the F-10 heuristic correctly applied: it operates the control and
asserts the consequence.

**The `row == null` default is safe and unreachable in the real tree.** `isFocusStillInRow` returns
false when the row is missing, which would latch. All three proposal anchors render inside the row
element (`TransactionRow.tsx:425`, `:469`, `:503`, all within the `data-testid="transaction-row"`
div opened at `:357`), so `closest()` always finds it. Noting it because F-11's fix will be in this
code and the bias should be deliberate.

**The two surfaces are still pinned apart, and the clauses rev 05 could not have touched, it did
not.** The robot's testids remain disjoint from the eight proposal testids; precedence, manual-row
applicability, the shared tooltip and the allocation span are untouched by these two commits. I
re-derived the ones the diff could plausibly have disturbed and none had.

---

## The two things the implementer flagged against itself

### The `setTimeout(…, 0)` deferral — the argument suffices; I measured it rather than reasoning about it

The implementer stated the falsification conditions and said it had tested neither. **I tested the
first one**, in real Chromium, no app:

```
focusout -> a focusable target   atFocusoutDispatch: BODY    atNextTask: outside
focusout -> <body>               atFocusoutDispatch: BODY    atNextTask: BODY
```

**The deferral is not merely defensible — it is required.** At `focusout` dispatch
`document.activeElement` is already `BODY` in both cases, so an undeferred read would report "left
the row" on _every_ focus move, including moves within the row. That is the T1 case, and T1 measured
`rowLostFocusLatched: false` **because of** the deferral. One task later the value is settled and
correct in both directions.

The second falsification condition — focus landing more than one task later — I did not manufacture,
and I do not think it needs pinning. `playwright.config.ts:67-70` declares a single project,
`chromium`; there is no Firefox or WebKit target for this suite, so the surface where the untested
condition could bite is not one this project ships against today. **The argument suffices. No
finding.** I record the scope explicitly — this is measured for Chromium — so that adding a second
browser project is understood to reopen the question.

I would add one note the implementer did not: the deferral is load-bearing for correctness, not just
for settling. The comment at `:207` says "a blur is only settled once the browser has moved focus
on", which is right but understates it. Worth strengthening when F-11 is fixed, since a fix that
re-reads at apply time inherits the same requirement.

### The unreproduced unit failure — the disposal is adequate

The evidence records one `pnpm test` failure it could not name or reproduce, followed by two clean
full runs. **I ran the full suite myself: 126 files, 2448 passed, 2 skipped** — matching the
evidence's numbers exactly, on the same tree.

Recording an unreproduced observation with its limits stated, rather than reporting only the clean
runs, is the correct handling and is the same standard the package applied to the deleted-log claim
in rev 04. Not capturing the name is a real loss, but the honest disposal is worth more than a
reconstructed guess would have been. **No finding.** Three independent clean full runs now exist
across two agents.

---

## On the campaign

I did not re-run it and did not need it. The digest is identical before and after at `d7fe06a`, the
three runs are complete, and `rule-creation-controls` is clean in all three including the new F-10
journey. **That claim is supported and I accept it.**

**It does not bear on F-11**, for precisely the reason `p30-reviewer-02` gave and the implementer
then restated against itself: no assertion in the suite looks at the failing sequence. T1 above
shows why — the one automatic-mode journey closes the picker by clicking within the same row, which
is the gesture that correctly does _not_ latch. Greenness cannot discharge a clause nothing asserts,
and this is the third revision where that has been the operative fact.

On the `people-settlement.spec.ts` failures: I did not chase them, per the dispatch. The account is
internally consistent — rotating membership, no test failing in every run, matching digests — and
nothing in that spec bears on P30's verdict either way.

## Where I differ from the rev 02 review

| Clause                          | rev 02 verdict (MEASURED)                   | My verdict (MEASURED)                                                                                 |
| ------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `:263-266` trigger reachability | FAILS — 1 of 4 row-blur gestures reaches it | **CONFORMS.** 4 of 4, re-derived against the real component                                           |
| `:263-266` trigger correctness  | (not separately raised)                     | **FAILS (F-11).** Fires while the row holds focus, once focus has transiently left during the edit    |
| `:255-257` controls operable    | CONFORMS, positively measured by a click    | **CONFORMS**, unchanged by rev 05; the paint gate is intact                                           |
| F-8 row identity                | raised, safe direction                      | **CLOSED**, and the assertion discriminates                                                           |
| F-9 reproduction fidelity       | must be replaced, not extended              | **HALF CLOSED.** Predicate cases are real and discriminate; watch/paint cases are tautological (F-12) |
| F-10 restrictions operated      | never clicked by any test                   | **CLOSED**, and the restriction's path into the written rule verified end to end                      |

I concur with `Q-PROPOSAL-P30-R02-01`'s recommended reading (a) — a blur landing on `<body>` counts
as the row losing focus — and I implemented my measurements against it. F-11 does not disturb that
reading; it is about _when_ the question is asked, not what counts as an answer.

`Q-PROPOSAL-P30-R02-02` asked how long a pending automatic apply stays armed once the effect is
decoupled from the popover. **F-11 is that question turning out to have a wrong answer in the
shipped code**: it stays armed forever, including across focus returning to the row. The recommended
semantics there — re-entering should re-arm, not double-apply — are the right target, and the
`appliedRef` guard at `:148` and `:161-162` still correctly makes the write once-only.

---

## Required for revision 06

1. **Fix F-11.** Re-evaluate the focus predicate when the automatic apply is about to fire, or clear
   the latch when focus is found back inside the row. Do not weaken the `isEditing` guard.
2. **Pin it with a test that fails without the fix:** with an automatic mode chosen, focus leaves
   the row during the edit and then returns; when the edit ends with focus inside the row, nothing
   is written. The Measurement 1 sequence fails on `d7fe06a`.
3. **Close F-12:** make the watch/paint cases drive the real container, or delete them. Reverting
   `d7fe06a` must not leave the suite green.
4. **Close F-13:** add the two E2E pins rev 02 asked for — an automatic mode on the **description**
   field committed with Enter, and a tag change blurred by clicking non-focusable chrome.
5. **No change required** for F-7, F-8, F-10, the occlusion fix, the `setTimeout` deferral, or the
   clauses rev 01 and rev 02 passed. The predicate half of F-9 is done and is good work.
6. **Restart the campaign from run 1** against the new tree with a per-run digest.

## Proposed questions

### Q-PROPOSAL-P30-R03-01 — Does an automatic apply require the row to be unfocused at the moment it fires, or only to have been unfocused at some point since the edit began?

- Raised by/package/revision: `p30-reviewer-03` / P30 / 05
- Context: F-11 rests on reading `:264`'s "will apply automatically when the row loses focus" as a
  condition that must hold **when the apply happens**. The shipped code reads it as a threshold
  crossed at any time since the proposal became pending, and the flag never clears.
- Why existing authority does not decide it: root has ruled that auto-create and auto-apply are one
  action on the row losing focus, and that the tick is an alternative trigger. It has not ruled on
  whether a blur that has since been undone still counts.
- Options: (a) the row must not hold focus at the instant of the apply; (b) any blur since the edit
  began arms it permanently.
- Recommended reading for revision 06: **(a)**. Under (b) the user can be shown the controls and
  have the rule written in the same frame, with no opportunity to choose a mode or dismiss — which
  is the defect rev 01's F-2 was raised on and which root has already ruled against. I have written
  F-11 against (a).
- Human review still useful: No. (a) follows from the frozen text and from root's existing ruling.

### Q-PROPOSAL-P30-R03-02 — Should the tag picker close when keyboard focus leaves it?

- Raised by/package/revision: `p30-reviewer-03` / P30 / 05
- Context: MEASURED — `Tab` from the picker's search input moves focus to `<body>` and leaves the
  picker open, because `InlineEditableTags` closes only on mousedown-outside
  (`InlineEditableTags.tsx:155-171`). This is what makes F-11's step 3 reachable. It is also the
  same cell whose Escape handling rev 03 established is out of UR-009's scope.
- Recommended: fix F-11 in `TransactionRuleProposal` regardless, since a robust trigger should not
  depend on another component's dismissal policy. Closing the picker on focus-out would be a
  reasonable independent improvement but belongs to whoever owns that cell —
  `InlineEditableTags.tsx` is in `p33-implementer-01`'s UR-012 scope.
- Human review still useful: No, unless root wants the cell's focus behaviour brought into scope.

I concur with rev 01's `Q-PROPOSAL-P30-R01-01` — the principal confirming that a blur can silently
create a rule that rewrites every matching row remains worth doing — and note that F-11 is the
sharpest illustration of why: on the measured sequence, the write lands at the same instant the
controls first become visible.
