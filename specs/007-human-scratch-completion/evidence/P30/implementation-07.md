# P30 / UR-009 — implementation evidence, revision 07

Package: P30 (UR-009, automations conformance against frozen `specs/human-scratch.md:248-295`)
Author: `p30-implementer-01`

## What this revision changes

Six commits. One fixes product code; the rest fix tests, and three of those close gaps that the
required checks found in my own work rather than in the component.

| commit    | subject                                                          | files                                                              |
| --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `fe960ad` | fix: decide the automatic apply at a single instant              | `src/components/features/transactions/TransactionRuleProposal.tsx` |
| `f9d7c7b` | test: start the auto-apply gesture where the user starts it      | `tests/unit/components/rule-proposal-auto-apply.test.tsx`          |
| `10a1c19` | docs: collapse the duplicated focus-deferral commentary          | `src/components/features/transactions/TransactionRuleProposal.tsx` |
| `e32e05d` | test: pin the single write against listener re-registration      | `tests/unit/components/rule-proposal-auto-apply.test.tsx`          |
| `6ece9b1` | test: leave the apply-mode select closed before the next click   | `tests/e2e/rule-creation-controls.spec.ts`                         |
| `adf6b5e` | test: wait on the select trigger's own state, not a global count | `tests/e2e/rule-creation-controls.spec.ts`                         |

Nothing else in the package moved. Clause conformance for `:249-262`, `:270-295` is unchanged from
revision 04's audit and is not re-argued here; this revision is entirely about frozen `:263-266`:

> The prefix "Updating" implies the change will apply automatically when the row loses focus, or if
> you click the tick button. "Update" implies you have to manually click the tick button.

## The defect fixed in `fe960ad`

Revision 06's E2E campaign at `b777d3d` failed **deterministically** — all three runs, the same
three tests, each `Expected 0, Received 1` on a `*-rule-proposal` testid, meaning the proposal never
closed because the apply never fired:

All three runs failed the same three journeys in `rule-creation-controls.spec.ts` — "choosing
Updating all writes nothing until focus leaves the row, then writes on blur", "a description alias
committed with Enter applies an Updating rule", and "a tag change applies when the user clicks
non-focusable page chrome" — plus, in run 1 only, three `people-settlement` tests belonging to the
rotation described below.

Campaign tree digest `5fba2f9adb4f7f26b7fa84cba362abbe` before and after, at `b777d3d`.

### Diagnosis was measured, not reasoned

Two mechanisms were proposed by two people who had both read the code closely — the coordinator's
(`props.isEditing` blocking the write) and mine (the popover portal defeating the row-containment
check). A `console.log` probe on the real component, added and then removed with the tree verified
byte-identical afterwards, killed both:

```
1  open=true isEditing=true  focusSeenOutside=FALSE isRowFocusLost=true  active=BODY
2  open=true isEditing=true  focusSeenOutside=true  isRowFocusLost=FALSE active=INPUT/in-row
3  open=true isEditing=false focusSeenOutside=true  isRowFocusLost=FALSE active=INPUT/in-row
```

Entry 3 has `isEditing=false` and still no write, so the edit guard was never the blocker. Entry 3
also has `active` = a plain in-row `<input>`, so `row.contains(active)` returns `true` and the
`data-owned-by-row` portal branch is never reached — the portal could not have been the mechanism
under any focus value landing inside the row.

The actual mechanism is in entries 1 and 2. Revision 06 required a conjunction of a remembered flag
("focus was seen outside") and a live re-read. **The flag is set inside a deferred task**, so at the
first evaluation focus is genuinely outside but the flag is still unset; by the time the flag lands,
focus has moved on and the live read says "still in the row". The two conditions are never true at
the same instant, so the write never happens.

This is silent inaction — the same direction as F-7, reintroduced by the fix for F-11. In E2E
gestures focus keeps moving, so the window is missed reliably rather than intermittently, which is
why the failure was deterministic rather than flaky.

### The fix

`fe960ad` removes the remembered flag entirely and moves the whole decision inside the deferred
read, where focus state and edit state are both current
(`src/components/features/transactions/TransactionRuleProposal.tsx:213-236`). There is no remembered
value to go stale and no second gate to miss. Net −14 lines.

The read still has to be deferred: at `focusout` dispatch `document.activeElement` is already
`<body>` even when focus is heading somewhere focusable, so an immediate read reports "left the row"
on every focus move. `focusin` is kept for moves with no idle state between, and one evaluation runs
on mount to catch a blur that happened before the component existed.

## The defect fixed in `f9d7c7b` — found in my own tests

The standing requirement is: revert the fix, re-run the new tests unchanged, require red. Run with
the test file held byte-identical at md5 `18ce519b292d3f3f701f9d871f92843c`:

| component revision | component md5                      | result             |
| ------------------ | ---------------------------------- | ------------------ |
| rev 06 `6b3fb57`   | `865c2f0df04ba38bfc66601b1288a806` | **3 passed**       |
| rev 05 `d7fe06a`   | `6ef5eef9f0a7dc9aebcb6f71b48daa8b` | 1 failed, 2 passed |
| rev 04 `d67e717`   | `a19e81cf500c5967d227846da0857855` | **3 passed**       |
| rev 07 `fe960ad`   | `5e2ec31b114f95e748a16ac2be906e42` | 3 passed           |

Green against the exact revision that fails three E2E tests deterministically. The suite written to
pin revision 07's fix could not detect the defect it was written for.

**Cause, again measured rather than reasoned** — a throwaway probe, run against both revisions and
then deleted: every one of the three cases began with focus already at `<body>`, outside the row.
Revision 06's defect is that two conditions are never true _at the same instant_; from a starting
state where both are trivially true from the first tick, there is nothing for the race to lose. The
assertions were correct and both directions were pinned. **The initial conditions made them
unreachable.**

The probe starts where the user starts — caret in the row, then click away — and discriminates:
`applyCalls=0` against revision 06, passes at revision 07. It is now a permanent fourth case,
`tests/unit/components/rule-proposal-auto-apply.test.tsx:99` onward.

### The blindness trajectory, which is the part worth carrying forward

Four revisions of tests for one behaviour, each answering the previous critique exactly and each
leaving the gap intact one step along:

| revision  | what the tests drove                    | how they were blind                                                                        |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| 05        | local `watches`/`paints` helpers        | imported nothing from the component (review F-12)                                          |
| 06 first  | the pure predicate `isFocusStillInRow`  | never the effect that consumes it                                                          |
| 06 second | the effect, mounting the real component | pinned only the negative direction; a component that never writes at all passed every case |
| 06 third  | the effect, both directions             | from a starting state the user cannot be in                                                |

Each fix was a genuine improvement. The generalisation is **not** "assert both directions" — that
requirement was satisfied by the third and it was still blind. It is that **a test's initial
conditions are as much a claim as its assertions, and nothing in review routinely examines them.**
The question that would have caught all four is: _what state does this case begin in, and can a user
reach it?_

A reviewer of this revision should apply that question to the five cases now in the file, rather
than only checking that positive and negative are both present.

## The double-write guard, measured rather than asserted

`confirm` is a dependency of the listener effect, so the listeners tear down and re-register
whenever it changes, and **each registration runs its own mount-time evaluation**. The coordinator
asked me to pre-empt this in evidence prose, noting that `appliedRef` guards the repeat and it is
therefore harmless.

That sentence is true and it would have been the wrong artifact — it is the same shape as the code
comment this goal was already burned by, a claimed protection nobody had run. Measured instead, by
deleting the guard and re-running: **3 applies at the blur, and 8 after five further renders.**
`appliedRef` is not a formality against a theoretical double-fire; it is the only thing between one
user gesture and eight rule writes.

It is now pinned by `tests/unit/components/rule-proposal-auto-apply.test.tsx` — "writes exactly once
no matter how often the listeners re-register". Three of the five cases in the file go red without
the guard.

## Verification

### Unit

`pnpm test`: **2451 passed, 2 skipped, 127 files.**

All three positive cases and both negative cases are mutation-verified: reverting the live focus
check fails the stale-write case, simulating a never-write fails the must-apply cases, and deleting
`appliedRef` fails three.

### Gates

| gate                | result                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | clean                                                                                                                  |
| `pnpm lint`         | 0 errors, 1 warning — pre-existing `react-hooks/incompatible-library` on `useVirtualizer`, not mine                    |
| `pnpm format:check` | fails on 23 files, **all under `specs/**`**, none under `src/`or`tests/`; pre-existing and root-owned, untouched by me |
| `pnpm test`         | 2451 passed / 2 skipped                                                                                                |

`specs/human-scratch.md` verified unchanged at
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`.

### E2E campaign

Run in an isolated worktree at `/tmp/mf-p30`, outside the repo, `env -u CI`, full suite,
`--retries=0`, four workers. `playwright test --list` reads **192 tests in 24 files** = 190 baseline
plus the 2 gestures added in revision 06. P33's UR-012 tests are on an unmerged branch and are not
in that count, and P29's work is not on `main` at all — so 190 is the baseline of this tree, not of
the goal.

#### Campaign at `10a1c19` — the verdict on the fix

Digest `47343bde5bdb7fd2e1418a7a5ae49da4`, identical across all seven samples: before the campaign,
and pre and post for each of the three runs.

Tests are identified by **title, not line number**. The positions in this spec moved three times in
one revision as the helper changed, and every stale number sends a reviewer to the wrong place — at
one point the coordinator, my worktree and the committed file each reported a different line for the
same test. Titles are stable and greppable.

| test in `rule-creation-controls.spec.ts`                                               | rev 06 (`b777d3d`) ×3 | run 1 | run 2 | run 3 |
| -------------------------------------------------------------------------------------- | --------------------- | ----- | ----- | ----- |
| the other 8 journeys                                                                   | pass                  | PASS  | PASS  | PASS  |
| "choosing Updating all writes nothing until focus leaves the row, then writes on blur" | **FAIL ×3**           | PASS  | PASS  | PASS  |
| "a tag change applies when the user clicks non-focusable page chrome"                  | **FAIL ×3**           | PASS  | PASS  | PASS  |
| "a description alias committed with Enter applies an Updating rule"                    | FAIL ×3               | FAIL  | FAIL  | FAIL  |

Run totals 2/190, 3/189, 3/189.

**The two verdict tests are green 3/3 having failed 3/3 at revision 06.** Those are the journeys
that exercise the automatic apply through a blur to `<body>`, which is the mechanism revision 07
changed.

#### The Enter-commit journey is a different defect, and its determinism is the evidence

Revision 06 failed "a description alias committed with Enter applies an Updating rule" with
`Expected 0, Received 1` — the proposal never closed because the apply never fired. Revision 07
fails it in the **setup**, at the `description.click()` that re-focuses the input, before the
gesture under test runs at all:

```
- <div role="option" … data-slot="select-item" …> from <div>…</div> intercepts pointer events
- retrying click action
- element was detached from the DOM, retrying
```

Different line, different surface, different error — so not the revision 06 defect returning. But
the visible interception is **not** the cause, and I spent two commits fixing it before establishing
that.

##### The actual cause: the test indexes rows by a description it rewrites

Probed in jsdom, on a controlled React input:

```
before: attr = "COFFEE SHOP 123"   matches old selector = true
after:  property = "Coffee"        attr = "Coffee"
        still matches OLD selector = false
        matches NEW selector       = true
```

`rowsWithDescription` filters on `input[value="COFFEE SHOP 123"]`, and this journey **renames that
description to "Coffee"**. Playwright locators re-resolve on every use, and React writes an edited
value to the input's `value` **attribute**, not only its property. So after the rename `firstRow` no
longer matched row one: it silently re-pointed at **the other matching row, which the rule was
concurrently rewriting**, and the click landed on an element detaching underneath it.

That is the `element was detached from the DOM` in the log. The detaching element was never the
dropdown; it was the wrong row. `c9e80b8` indexes positionally, and `rowsWithDescription` now
carries the hazard on its own docblock.

##### The class, swept by what each journey mutates

The identifier `rowsWithDescription` appears **19** times in the spec: 1 is the function's own
definition, 1 is a comment explaining why a journey does **not** use it, leaving **17 call sites in
journeys**. Of those, **2** pass an explicit description argument
(`rowsWithDescription(page, "UNRELATED MERCHANT")` and `(page, "MANUAL COFFEE")`).

**The sweep was done by asking which journeys rename a description, not by matching call shapes** —
because matching call shapes is what failed. An earlier count of mine reported 16. Grepping
`rowsWithDescription(page)` with a closing paren silently excludes both sites taking a second
argument, and that pattern actually returns **15** — so the 16 I reported was not even that
pattern's answer, but a hand-count of its output. **A truncated search, then a miscount of the
truncated result, and the number still looked ordinary.** The coordinator caught both.

Two journeys call `description.fill(...)`. Both are now positional: the Enter-commit journey
(`c9e80b8`) and the description-alias journey (`d8d5fb2`). The second was **passing** — it survives
because nothing re-uses the locator after the rename — but that is an accident of statement
ordering, not a property of the test, and it was hardened rather than banked. Every remaining call
site changes tags or allocations, never the description its locator filters on.

##### Two commits that fixed a real thing that was not this

I record these as corrections to my own reasoning, not as achievements.

`6ece9b1` routed all nine apply-mode selections through a `chooseApplyMode` helper that waits for
the select to close, and `adf6b5e` replaced that helper's wait: the first version used
`expect(page.getByRole("listbox")).toHaveCount(0)`, which is **not** inert — Radix does set
`role="listbox"` on `SelectContent`, at `@radix-ui/react-select/dist/index.mjs:489` — but the
description input in the same row carries `aria-haspopup="listbox"`, so a global count is ambiguous
about which popup it describes. It now reads the trigger's own `aria-expanded`, verified present and
`"false"` when closed.

Both are worth keeping: nine call sites could genuinely be hit by a listbox overlaying the next
click, and the log's first retry does show an option intercepting pointer events. **But I presented
each as the fix for this failure and neither was.** The second was more rigorous than the first,
which made it more convincing rather than more correct — I ruled out three failure modes in the
assertion and none in the diagnosis.

**The generalisation:** a true observation in a failure log is not thereby the cause. Six runs
across three trees failed identically while I fixed the first plausible thing the log showed me.
What finally worked was asking why the _element under the click_ was detaching at all — the question
about the thing that failed, rather than about the thing that was visible.

This is the second time in this package an instrument answering a narrower question than intended
was mistaken for a finding. The first was my own test suite.

#### Confirmation campaign at `adf6b5e`

Digest `01f43f69731057b65cb894d295b2c0c3`.

Digest identical across all seven samples — before the campaign, and pre and post for each run.

| run | totals             | my spec | settlement | failures                                      |
| --- | ------------------ | ------- | ---------- | --------------------------------------------- |
| 1   | 1 failed, 191 pass | 10/11   | **19/19**  | Enter-commit journey only                     |
| 2   | 2 failed, 190 pass | 10/11   | 18/19      | Enter-commit journey + settlement canonical C |
| 3   | 2 failed, 190 pass | 10/11   | 18/19      | Enter-commit journey + settlement canonical E |

**Ten of eleven journeys green in all three runs**, including both verdict journeys, which is the
third independent confirmation of the revision 07 fix on a second tree.

The Enter-commit journey fails all three, **as expected**: this tree is `adf6b5e`, and the commits
that actually address it — `c9e80b8` and `d8d5fb2` — came after. **This campaign cannot speak to
them, and nothing here should be read as evidence that they work.**

#### The locator fix, confirmed independently rather than by its author

Before this package's own final campaign ran, **P33 campaigned three times on its own tree**, which
carries `6b3fb57`, `c9e80b8` and `d8d5fb2` — verified as ancestors before it predicted. Its result
for "a description alias committed with Enter applies an Updating rule": **PASSED 3/3**.

That journey had failed **6/6 across two trees** before the locator fix. It now passes on a third,
**measured by an agent that did not form the hypothesis, in a different worktree, with a different
instrument, having recorded in advance that a failure there would be a real signal for this package
rather than noise in its own.**

This matters more than the sample size. **I am the author of the diagnosis, so my own campaign is
corroboration; P33's is the test.** My first two attempts at this journey were confident and wrong,
and the second was more careful than the first — care was not what distinguished the third. An
independent pass, pre-registered, is what converts the account from a plausible story into a result.

#### Final campaign at `f397da1`

Run on main with P29 merged, `--list` **192 in 24 files**, digest
`4b3b9ee6ef213d4a2275e1e043b340ee`.

**What this campaign certifies, stated narrowly:** main as it stood at `f397da1`. **It is not the
final integrated tree** — P33's UR-012 work was deliberately not merged first, because its revision
01 failed review on a blocking defect and revision 02 needs a distinct reviewer before landing.
Gating a merge on that review is worth more than giving this campaign a tidier tree, so the cost is
accepted and recorded rather than papered over.

Predictions were written down **before** the run, matching P33's discipline: both verdict journeys
pass; the Enter-commit journey passes; the hardened description-alias journey passes; settlement
membership is data only and predicts nothing.

Digest `4b3b9ee6ef213d4a2275e1e043b340ee` **identical across all seven on-disk samples** — before
the campaign, and pre and post for each of the three runs. Worktree re-verified at `f397da1`
afterwards.

**All 11 journeys in `rule-creation-controls.spec.ts` passed in all three runs.**

| four-item list                                                                  | run 1 | run 2 | run 3 |
| ------------------------------------------------------------------------------- | ----- | ----- | ----- |
| 1. "choosing Updating all writes nothing until focus leaves the row…"           | PASS  | PASS  | PASS  |
| 1. "a tag change applies when the user clicks non-focusable page chrome"        | PASS  | PASS  | PASS  |
| 2. "a description alias committed with Enter applies an Updating rule"          | PASS  | PASS  | PASS  |
| 3. "changing a description alias offers to create a rule…" (hardened `d8d5fb2`) | PASS  | PASS  | PASS  |
| the other 7 journeys                                                            | PASS  | PASS  | PASS  |

Run totals 191, 191, 190 of 192. **Item 4 holds**: every failure in all three runs belongs to the
`people-settlement` rotation described below, and no other spec failed once.

**Item 2 is the one that was uncertain, and it is now observed passing on three trees by two
agents** — P33's three runs on its own tree, plus these three. The journey failed **6/6 across two
trees** before `c9e80b8`. **P33's runs remain the independent test; these are corroboration by the
author of the diagnosis.**

All four pre-registered predictions were correct. They were recorded before the run, and prediction
2 was recorded together with the statement that a failure there would be a real signal about the fix
rather than load.

**Settlement membership, read from the failure header rather than the stack:**

| run | test           | step from header                                               |
| --- | -------------- | -------------------------------------------------------------- |
| 1   | `:197`         | canonical example E — single `expectObligation`, no step split |
| 2   | `:281`         | **11. restore paid, enter Bob -20% and verify the reversal**   |
| 3   | `:197`, `:596` | canonical example E; deleted-Person historical balance         |

Three runs, one digest, **three distinct memberships again**.

## Open, not attributable to this package

`people-settlement.spec.ts` shows **rotating** failures across campaigns on unchanged trees — eleven
or more distinct membership combinations, counts of 0, 1, 2, 3 and 5. The two campaigns in this
revision added three of them on trees whose digests never moved, including the **first fully clean
19/19 run** recorded in this goal.

**That clean run is itself a finding: a green settlement result carries no information.** Only a
failure is informative, at any sample size used here.

### Membership at test-ID granularity under-discriminates

P33 observed the same test ID failing at **different steps** in two runs — so two runs recorded as
"the same membership" may be different failures, and every ID-level record in this goal is a
potential undercount of the real variation.

**The record is partly recoverable.** The failing **step name is printed verbatim in the failure
header**, as the last `›`-delimited segment:

```
1) [chromium] › people-settlement.spec.ts:281:9 › People page settlement journey
   › mandatory journey: allocate, settle, trace, persist, exclude, restore and reverse
   › 11. restore paid, enter Bob -20% and verify the reversal        ← the step
```

**Read the header, not the stack.** The stack frames beneath do carry both the assertion's line and
its enclosing `test.step`'s line — but recovering a step _name_ from a line _number_ requires
correlating against the source, and doing exactly that is how I mislabelled which of `:367` and
`:376` was the step in a report to the coordinator. The header needs no correlation and so removes
the step where the error occurs.

Extracted across the six retained runs of this revision, the call site was the same for a given test
ID every time — `:166`→`:183`, `:596`→`:613`, `:145`→`:158`, `:197`→`:212`.

**I first wrote that up as "the call site is a strict function of the test ID", and that was
overstated.** Re-deriving from the spec rather than from my own output:

```
20 expectObligation calls across 19 tests
5 tests call it more than once:
  :166  2 calls (183, 189)   ← I observed only :183
  :281  3 calls              ← P33's demonstrated within-ID variation
  :452  2 calls
  :525  2 calls
  :596  2 calls (613, 630)   ← I observed only :613
```

**Two of my four data points come from tests that _can_ vary within their ID, and in both I only
ever saw the first call site fail.** That is equally consistent with those tests always failing at
their first assertion — which is what a page failing to load would produce. So the mapping was **not
contradicted**, which is weaker than **demonstrated**.

The honest partition, in four states:

| tests                          | ID-level membership                               |
| ------------------------------ | ------------------------------------------------- |
| `:145`, `:197` — one call each | **cannot** lose information                       |
| `:281`                         | **demonstrably did** lose it — three observations |
| `:166`, `:452`, `:525`, `:596` | **can** lose it; not observed doing so            |
| the remaining 12               | unchecked                                         |

`:281` is now measured failing at **two distinct steps across three trees by two agents**: step 6
and step 11 in P33's runs, step 11 in this campaign's run 2. Its within-ID loss is demonstrated
rather than inferred.

Where logs survive, the header recovers the step. Where they do not, it is unrecoverable, so for
those campaigns the limitation is permanent rather than a grep away.

**This belongs in the failure class below, and it is the sharpest instance in the package**, because
the instrument was a correct observation of real data. I checked that the mapping **held**; I did
not check whether my sample **could have shown it failing**. Two of four IDs had no structural
capacity to vary. **A measurement that cannot come out the other way is not evidence, and it looks
identical to one that can.**

A second lesson from the same episode, and the one that recurred most: **the part I generalised from
was the part I had checked least.** The listbox interception was real and not the cause; the four-ID
mapping held and could not have failed; the stack-frame labels were transposed while the step
mapping built on them was right. In each case the load-bearing observation survived and the reusable
claim drawn from it did not. Checking a conclusion is not the same as checking the step about to be
reused.

Six mechanisms have been proposed and falsified: P31's `b138894` selection refactor, UR-004 timezone
currency (killed by a `TZ=UTC` probe still yielding 19 then 17), load/contention, pure flake, this
package's mount cost, and root's concurrent scheduling. One genuinely open question remains — why
isolated single-spec runs behave differently from full-suite runs. Recorded as open and not chased;
I earlier over-claimed a sharp commit boundary here and retracted it.

**A falsified hypothesis from this revision, recorded so nobody re-runs it.** I suspected the
apply-mode dropdown closing drops focus to `<body>` transiently on its way back to the trigger, and
that a deferred read landing inside that window could fire an unauthorised apply. Probed in jsdom
with a `data-owned-by-row` portal standing in for the select: **0 applies before, 0 after, focus
back on the in-row input.** Falsified. That is ten mechanisms killed by measurement in this package
and none by argument.

## The failure class this revision kept producing

Every substantive error in this revision — mine and, by my count, several the coordinator caught in
their own checking — has one shape: **an instrument that executed correctly and answered a narrower
question than the person reading it believed.** Not a broken tool; a well-formed question that was
not the intended one. The list, because four instances make a class where one makes an anecdote:

| instrument                                      | asked                                     | believed to ask                     |
| ----------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| the revision 06 unit suite                      | does it write from a `<body>` start state | does it write on the frozen gesture |
| `grep` of a still-streaming campaign log        | has this test printed a line yet          | did this test pass                  |
| `pkill -f "p30-campaign-07.sh"`                 | which processes mention this string       | which processes are the campaign    |
| `grep "rowsWithDescription(page)"`              | which lines match this call shape         | where is this helper used           |
| the `chooseApplyMode` and `aria-expanded` fixes | is the listbox interception real          | is the listbox why the test fails   |

None of these produced an error message. Each returned a plausible answer with no indication that
anything was missing, and in three cases the answer was **conclusion-shaped** — a pass, a clean
kill, a complete call list.

**What broke each one was a mechanical check, not more careful thinking:** re-running the tests
against a reverted component, waiting for the exit file, reading process state after the kill,
grepping the bare identifier, and counting failures across runs and trees. The articulated lesson
kept arriving one revision after the check that would have caught it — which is the argument for
keeping the checks after the lesson feels learned.

## What a reviewer of this revision should check

Three things, in the order they are most likely to be wrong.

**1. The initial conditions of every new test case**, not just its assertions. That is the question
that would have caught all four blind test revisions above, where "does it assert both directions"
caught only one. For each case in `rule-proposal-auto-apply.test.tsx`: what state does it begin in,
and can a user reach that state?

**2. Whether each new assertion can fail.** Two in this revision needed checking and one needed
changing: `expect(getByRole("listbox")).toHaveCount(0)` was ambiguous rather than inert, and the
`aria-expanded` assertion that replaced it was verified against the real component before being
trusted. Any assertion whose failure mode nobody has produced is a candidate.

**3. Comment claims against the code they sit beside.** This package has twice shipped prose
asserting a property the code did not enforce, and once nearly shipped "harmless, `appliedRef`
guards it" as evidence for a mechanism that turned out to be worth 8 writes. Every claim of a
guarantee in this revision's comments has a test behind it; a reviewer should spot-check that
mapping rather than take it on trust.

## Integration risk logged for root

UR-012 (P33) enlarges cell hit areas. `isFocusStillInRow` decides on what focus lands on, and this
package's "click non-focusable page chrome" E2E case clicks a `role="columnheader"` div. If UR-012
makes that element focusable, the test's premise changes. Neither branch can observe this in
isolation; it belongs to whoever integrates the two.

## Secret safety

No vault master key, invite fragment, `crypto_box` secret material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` value or vault plaintext appears in any file, log, URL or fixture written by
this package. All fixtures are synthetic. The worktree's gitignored `.env.local` was copied without
its contents being printed, and `git check-ignore` confirms it remains excluded.
