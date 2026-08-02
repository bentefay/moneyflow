# P33 — UR-012 independent review, revision 01

## Verdict: **FAIL**

One blocking finding: **F-1**, a functional regression this package introduces in the tags cell. The
tag pill's remove button is covered by the new `::before` overlay, so clicking the "×" no longer
removes the tag — it opens the tag chooser instead. This is reproducible, deterministic, caused by
this package, uncovered by any test in the suite, and forbidden by the frozen text's clause
"Existing per-cell behaviour is retained".

Everything else in the package verified. The core requirement is genuinely met, the binding
resting-appearance constraint holds under my own independent measurement, and the negative control
is real. F-1 is a gap in one cell's secondary control, not a flaw in the approach — the fix is one
word and I validated it.

- **Reviewer:** p33-reviewer-01 (distinct from the implementer)
- **Reviewed HEAD:** `2d1fbb10fab28ff2482c356de419ef117e7c6194`, tip of branch `p33-ur-012`
- **Effective diff base:** `d0b2561d0f76d2deae2c04aee79a9e4dc63c2715` (see M-1)
- **Product/test diff reviewed:** 11 files, +478/−1

## Provenance re-verified before reading any diff

MEASURED. The dispatch warned that a reviewer had once been sent onto an amended-away commit, so I
re-derived the tree rather than trusting the hash.

```text
git rev-parse p33-ur-012          -> 2d1fbb10fab28ff2482c356de419ef117e7c6194   MATCHES
git branch -a --contains 2d1fbb1  -> p33-ur-012                                 MATCHES
merge-base --is-ancestor f7fbe15 2d1fbb1 -> YES
```

MEASURED. `2d1fbb1` is not an ancestor of `main`, exactly as the dispatch predicted. I reviewed in
worktree `/tmp/mf-p33`, which is checked out at `2d1fbb1` with a clean tree apart from
`next-env.d.ts`. Note the primary working directory has since moved to `6b3fb57` on `main`; all my
measurements were taken in the pinned worktree.

## M-1 — the dispatch's BASE is not the diff base (correction, not a finding)

MEASURED. The dispatch and the evidence both give BASE as `f7fbe15`. The actual merge-base of
`2d1fbb1` with `main` is `d0b2561`, and `f7fbe15..2d1fbb1` contains **nine** commits, six of which
belong to P30 and P31, not P33. Reviewing `f7fbe15..2d1fbb1` would have shown me another package's
work as though it were this one's.

The evidence does say the branch was rebased onto `d0b2561`, so this is a labelling inconsistency
rather than a misrepresentation. **The reviewable P33 diff is `d0b2561..2d1fbb1`** — the three
commits `12cf55b`, `8530ab0`, `2d1fbb1` — and that is what I reviewed. No action needed beyond
recording the correct base in the next revision's evidence.

## How I measured

INFERRED (method), MEASURED (results). Port :3000 is held by `p30-implementer-01` and I did not take
it. Instead I built an independent harness that renders the **real** `TransactionRow` — real cells,
real `AccountCombobox`, real `Input`, real Radix — with the project's **real compiled Tailwind CSS**
into **real Chromium 149**, and clicked it with a real mouse.

- CSS compiled from `src/app/globals.css` through the project's own `@tailwindcss/postcss` 4.3.3,
  scanning the actual source tree, and **recompiled per variant** so that mutated utilities really
  exist in the stylesheet.
- Bundled with the project's own esbuild. Only two modules are stubbed, neither in the subject: the
  `loro-crdt` WASM binary (loads at import time, no bearing on layout) and `CreateAccountDialog` (a
  modal that only mounts after "Create account" and drags in the whole CRDT provider tree). Every
  line of the eight reviewed components is the real committed code.
- A genuine **pre-change** bundle built by checking out the eight touched files at `d0b2561`,
  building, and restoring from `2d1fbb1` under a shell `trap` so the tree could not be left dirty.
  Verified clean after every such build.
- Scratch lived in the gitignored `dist/` and has been removed. `git status` in the worktree shows
  only `next-env.d.ts`, which the package contract excludes.

## The requirement is met — verified by clicking, in both directions

MEASURED. Clicking each cell's horizontal centre at `rowTop + 2px` and `rowBottom − 3px`, which is
12–20px outside every control's drawn box. Subject build at `2d1fbb1`:

| cell              | top edge                          | bottom edge     |
| ----------------- | --------------------------------- | --------------- |
| checkbox          | toggles, `aria-checked` → true    | toggles         |
| date              | caret in `date` cell              | caret in `date` |
| description       | caret in `description`            | same            |
| account           | chooser opens, `aria-expanded` on | same            |
| tags              | chooser opens, search focused     | same            |
| status            | select opens                      | same            |
| person percentage | edit input focused                | same            |
| amount            | caret in `amount`                 | same            |

**All eight cells, both edges — 16/16 activate.** The implementer's eighth-cell claim is correct:
the account column renders `AccountCombobox` from `src/components/features/accounts` and is not one
of the seven files in `cells/`. Root's dispatch missed it; the implementer caught it; the frozen
text's "every editable control" plainly covers it. Applying the hit area from
`TransactionRow.tsx:463` rather than inside the shared component is the right call — I confirmed
`AccountCombobox` is used on other surfaces and `src/components/ui/` was not touched.

One caveat on my own method, recorded so nobody repeats it: in my first pass the allocation cell
reported "nothing at this point". That was my harness leaving a Radix portal open from the previous
step, not a product defect. Re-probed in isolation, the allocation cell activates from both edges
with `elementFromPoint` returning the button. **A failing measurement is not automatically a finding
— I checked before writing one up.**

## The negative control is real — I built it myself

MEASURED. Rather than neutralising the constants (the implementer's method, which I could only have
re-run), I built the **true pre-change tree** and ran the identical 16-click matrix:

```text
top    checkbox at=DIV active=DIV activeCell=null checked=false    ... all 8 cells
bottom checkbox at=DIV active=DIV activeCell=null checked=false    ... all 8 cells
```

**All 16 pre-change clicks land on the row DIV and activate nothing.** The assertions fail for the
right reason when the defect is present. This is independent confirmation of the implementer's
negative control, derived a different way.

## The binding constraint holds — resting appearance is unchanged

This is the clause that decides the verdict, so I re-derived it three ways.

**MEASURED — pixel diff.** A resting row (pointer parked off-row, focus blurred, settled),
screenshotted from both builds and differenced channel-by-channel with my own PNG decoder:

```text
before.png vs after.png: totalPx=91200 diffPx=0 maxChannelDelta=0 colRange=None rowRange=None
```

**0 of 91,200 pixels differ.** This corroborates the implementer's 0/73,758 independently — the
counts differ only because my harness renders a 1600px-wide row.

**MEASURED — my pixel method is not blind.** A 0-pixel result is worthless if the method cannot see
a change, and my first attempt genuinely was blind: the harness page had no background and the
screenshots were fully transparent. I caught that, fixed it, and then proved sensitivity with
positive controls. Making the margin asymmetric (`-mt-[20px] -mb-[8px]`) changed the row's height
57→58px; dropping the negative margin entirely changed it 57→81px. **Both were caught immediately.**

**MEASURED — every box compared.** Each drawn control and every portal-anchor rect, in the row's
coordinate space, before vs after:

```text
checkbox drawn      IDENTICAL  top 20 left 24  16x16
date icon           IDENTICAL  top 16 left 160 24x24
date wrapper        IDENTICAL  top 14 left 64  120x28
description wrapper IDENTICAL  top 14 left 200 550x28
account trigger     IDENTICAL  top 14 left 766 160x28
tags container      IDENTICAL  top 14 left 942 140x28
tags display        IDENTICAL  top 14 left 942 140x28
status trigger      IDENTICAL  top 12 left 1098 110x32
allocation button   IDENTICAL  top 12 left 1224 128x32
date/description/amount inputs   box grows 28->56, top 14->0   (the mechanism)
text baseline, all three inputs  18 -> 18   UNCHANGED
```

Only the three inputs' own boxes grow, which is the mechanism, and their **text does not move**. The
implementer's claim that the added height, negative margin and compensating padding cancel exactly
is confirmed by direct measurement, not by reading the arithmetic.

## On the three things I was asked to press hardest

**(1) The rule-proposal popover was never exercised by hand.** I land with the implementer, and I
can strengthen the position slightly. MEASURED: `renderRuleProposal` wraps the cell in an anchor
`div` (`TransactionRow.tsx:187-203`); it does not alter the cell's own classes, so the hit areas are
untouched by wrapping. The mechanism cannot plausibly break the popover, and
`rule-creation-controls.spec.ts` was green in all three campaign runs. Not a finding. It is,
however, exactly the _kind_ of gap that produced F-1 below — an in-cell secondary control nobody
clicked — so the lesson generalises even though this instance is clean.

**(2) The committed test is positional, not a screenshot — "a pure repaint that moved nothing would
not be caught by CI".** I tried hard to build such a defect and **could not**. Every mutation I
constructed was caught:

| mutation                              | resting pixels | committed test |
| ------------------------------------- | -------------- | -------------- |
| `py-[18px]` → `py-[4px]`              | **0 changed**  | RED            |
| `-my-[14px]` → `-mt-[20px] -mb-[8px]` | row 57→58px    | RED            |
| drop `-my-[14px]`                     | row 57→81px    | RED            |
| `pt-[18px] pb-[38px]`                 | row 57→63px    | RED            |
| `pt-[28px] pb-[8px]`                  | row 57→61px    | RED            |

The first row is the interesting one and it corrects the implementer's own framing. Dropping the
padding compensation changes **zero pixels** — an `<input>` centres its text vertically, so the
padding never moved the glyphs in the first place. The mutation is caught by the unit test's
arithmetic (`cell-hit-area.test.ts:119`), which fails `18 !== 4`. So the positional test is not the
weaker instrument here; on this mutation it is the _only_ instrument, and a screenshot baseline
would have missed it. **`Q-PROPOSAL-P33-01-02`'s stated risk is real in principle but I found no
instance of it. The choice of a positional test over a stored baseline is sound and I would not
change it.**

**(3) Hover and focus feedback now cover the whole cell.** Not a finding. The frozen text requires
it in as many words, and constrains only the _resting_ state. MEASURED: resting backgrounds are
`rgba(0, 0, 0, 0)` on all eight controls, and the overlay's own `::before` background is transparent
too. The implementer is right to flag it as the thing that will look like a regression at a glance;
it is nonetheless what the requirement asks for.

## F-1 — BLOCKING — the tag pill's remove button is swallowed by the overlay

- **File:** `src/components/features/transactions/cells/InlineEditableTags.tsx:290-300` (the
  `SHORT_CONTROL_HIT_AREA` call site), with the victim at `:88-100` (`TagPill`'s remove button).
- **Frozen clause violated:** "Existing per-cell behaviour is retained"
  (`specs/013-transaction-cell-hit-area/spec.md:37`).

**MEASURED.** Through the real UI — open the chooser, add the tag "Food", dismiss, then click the
centre of the pill's "×":

```text
SUBJECT 2d1fbb1   elementAtRemoveCentre=DIV   removeIsHit=false
                  pills 1 -> 1, chooser opened instead: true
PRE-CHANGE d0b2561 elementAtRemoveCentre=path  removeIsHit=true
                  pills 1 -> 0, chooser opened instead: false
```

**Before this package the click removes the tag. After it, the click cannot reach the button at all
— the tag stays, and the chooser opens instead.** Reproduced 3/3 times, deterministic, identical
coordinates each run.

**Mechanism, MEASURED.** `SHORT_CONTROL_HIT_AREA` adds `relative` to the tags _display area_, which
is the pill's ancestor, and paints a `::before` that is positioned and therefore stacks above its
own in-flow descendants. `TagPill`'s remove button is `position: static, z-index: auto`, so it sits
below the overlay:

```text
elementsFromPoint at the remove button's centre, subject build:
  DIV{z:auto,pos:relative}   <- the overlay's owner, topmost
  path / path / svg
  BUTTON[Remove Food]        <- the real target, buried
```

The other seven cells are unaffected, and I checked rather than assumed: the date calendar icon, the
account chevron and the status chevron are all still the topmost element at their own centres in
both builds, and the calendar icon still opens the picker. **The tags cell is the only one whose
overlay owner contains a second interactive control.**

**Why the campaign missed it.** MEASURED: no test in the repository clicks this button — `grep` for
`Remove ` across `tests/` returns alias, member and owner buttons, never a tag pill. The committed
E2E test's fixture has no tags, so the pill never exists in it (`transactions.spec.ts:2904`). Three
green campaign runs are consistent with this defect being present, which is precisely the blindness
trap the dispatch warned about, arriving from a direction nobody had aimed at.

**What must change.** MEASURED — I validated the fix rather than proposing it untested. Adding
`relative` to `TagPill`'s own span at `InlineEditableTags.tsx:83` gives the pill a stacking context
of its own and lifts it above the overlay:

```text
WITH CANDIDATE FIX
  remove button: elementAtRemoveCentre=path, removeIsHit=true, pills 1 -> 0     RESTORED
  UR-012 tags edge click, top and bottom: chooser still opens                   PRESERVED
  resting pixel diff vs pre-change: diffPx=0 maxChannelDelta=0                  UNCHANGED
```

The fix satisfies the requirement, restores the behaviour and moves no pixel. The implementer should
confirm the approach and, **more importantly, add a test that clicks a tag pill's remove button with
at least one tag present** — the missing coverage is what let this through, and without it the same
defect can return silently.

## Everything else verified

MEASURED unless noted.

- **Exactly one interactive node per cell**, and the census is byte-identical before and after:
  checkbox `role=checkbox "Select transaction …"`, date INPUT, description INPUT
  `"Transaction description"`, account `role=combobox "Select account"`, tags DIV `"Add tags…"`,
  status `role=combobox "Paid"`, allocation BUTTON `"Edit Ada allocation"`, amount INPUT. Roles,
  names and states unchanged.
- **Tab order identical**:
  `checkbox → date → description → account → tags → status → allocation → amount` in both builds.
- **Focus ring unchanged**: identical `outlineWidth`, `outlineStyle`, border colour and box-shadow
  before and after. INFERRED limit: arrow-key _grid_ navigation is driven by the table, which my
  single-row harness does not mount, so I did not measure it; the diff touches no key handler, and
  the implementer measured it on the running app.
- **UR-005 not regressed**: every resting control paints `rgba(0, 0, 0, 0)` background with no
  border, shadow or ring, and the overlay's own `::before` background is `rgba(0, 0, 0, 0)`. The
  only computed-style change anywhere is `content: none → ""`, i.e. the overlay existing while
  painting nothing.
- **No horizontal dead space existed** — the implementer's correction to the dispatch is right.
  `gap-4` at `TransactionRow.tsx:362` is on the grid container, so it is space between tracks and
  belongs to no cell; widening a control into it would steal the neighbour's clicks. My geometry
  confirms every data control already spans its cell width exactly, with the checkbox the sole
  exception (16px drawn in a 32px cell).
- **`::before` genuinely cannot work on `<input>`** — consistent with the measured behaviour, and
  the reason for the two-mechanism split is sound.
- **Checks**: `pnpm typecheck` clean; `pnpm lint` 0 errors, 1 warning at `TransactionTable.tsx:455`,
  confirmed pre-existing; `pnpm test --run` **2456 passed, 2 skipped, 127 files**; committed unit
  test `cell-hit-area.test.ts` 8/8 green.
- **E2E count reconciled**: `--list` reports 192 and both UR-012 tests are present by name, matching
  the claim of 190 + 2.
- **No `as`, `any` or `!`** in the product diff. **Secret scan clean.**
- **Campaign judgement**: the three runs support P33's own claim — both UR-012 tests passed in all
  three, and every failure was in `people-settlement.spec.ts` with rotating membership, the recorded
  open finding. I did not chase it. INFERRED: the campaign cannot speak to F-1, because no test in
  the suite exercises the affected control.

## Q-PROPOSAL-P33-01-01 — the account cell

I concur with the implementer's reading and its option (c). The frozen text says "every editable
control in the transaction table"; the account column is one; applying the hit area at the call site
rather than in the shared `AccountCombobox` is the smallest reversible change and touches no other
surface. Worth the principal's confirmation at completion, but it does not block.

## What revision 02 must do

1. **Fix F-1.** Restore the tag pill's remove button to the top of the stack. `relative` on
   `TagPill`'s span at `InlineEditableTags.tsx:83` is validated and moves no pixel; any equivalent
   fix is fine if measured.
2. **Add coverage that would have caught it** — a test that clicks a tag pill's remove button with
   at least one tag present, and asserts the tag is gone and the chooser did not open. Without this,
   the regression can silently return.
3. **Re-check the class, not just the instance.** F-1's shape is "an overlay owner that contains
   another interactive control". I found no other instance among the eight cells, but the check
   should be stated explicitly in the next evidence rather than left implicit.
4. Record the diff base as `d0b2561` (M-1).

No other change is required. The mechanism, the geometry, the negative control, the
resting-appearance proof and the accessibility work are all sound and should be carried forward
unchanged.
