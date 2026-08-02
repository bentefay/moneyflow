# P33 — UR-012 implementation evidence, revision 01

- **Package / revision:** P33 / 01
- **Requirement:** UR-012, frozen source `specs/013-transaction-cell-hit-area/spec.md` (markerless)
- **BASE:** `f7fbe15d693e534525a61dd5f8ab3b6e02253ecc`
- **HEAD:** `2d1fbb10fab28ff2482c356de419ef117e7c6194` on branch `p33-ur-012`
- **Commits:** `12cf55b` (product + tests), `8530ab0` (E2E viewport fix), `2d1fbb1` (comment
  correction, see "A claim I had to withdraw")
- **Rebased onto `d0b2561`** before the campaign, so the reviewed tree contains P30's rev 05
  (`d67e717`, `d7fe06a`), which touch two files in this package's scope. `d7fe06a` is an ancestor of
  HEAD; all eight hit areas verified intact after the rebase. The three commit hashes above are
  post-rebase; pre-rebase they were `f9f3237`, `35c2e7a`, `4abc72d`.
- **Note for the reviewer:** HEAD is on branch `p33-ur-012`, not on `main`, so
  `git merge-base --is-ancestor <HEAD> main` returns false. That is expected for worktree work.
- **Range:** non-empty
- **Worktree:** `/tmp/mf-p33`, branch `p33-ur-012`, outside the repo. `.env.local` copied in;
  `node_modules` installed with `pnpm install --frozen-lockfile`, never symlinked.

## Changed paths

Product:

- `src/components/features/transactions/cells/cell-hit-area.ts` (new)
- `src/components/features/transactions/cells/CheckboxCell.tsx`
- `src/components/features/transactions/cells/InlineEditableAmount.tsx`
- `src/components/features/transactions/cells/InlineEditableDate.tsx`
- `src/components/features/transactions/cells/InlineEditableDescriptionAlias.tsx`
- `src/components/features/transactions/cells/InlineEditableStatus.tsx`
- `src/components/features/transactions/cells/InlineEditableTags.tsx`
- `src/components/features/transactions/cells/PersonAllocationCell.tsx`
- `src/components/features/transactions/TransactionRow.tsx`

Tests:

- `tests/unit/transactions/cell-hit-area.test.ts` (new)
- `tests/e2e/transactions.spec.ts`

Dirty and NOT committed: `next-env.d.ts` (rewritten by `next dev` on every start, excluded from the
commit and from digests by the package contract).

Pre-existing and untouched by this package: two `git stash` entries that were already present, and
18 `format:check` failures in `specs/**` and other root-owned markdown. Each of the 18 was confirmed
unchanged by this package with `git diff --quiet HEAD -- <path>`; `pnpm format` was never run bare,
as it would reflow frozen sources.

## Two corrections to the dispatch's premises

Both were established by measurement before any code was written, and both changed the design.

**1. There is no horizontal dead space.** The dispatch and `tasks/ur-012.md` both describe the row's
`gap-4` as contributing dead space to close. Measured in the running app, all seven data cells have
**0px** of dead space on the left and right — the controls already span their cell width. The
`gap-4` lies _between_ cells and belongs to no cell, so closing it would make each control overhang
its neighbour and start stealing that neighbour's clicks. Only the vertical strips were dead. The
checkbox is the single genuine exception: it draws at 16px inside a 32px cell, 8px inset per side.

**2. A `::before` overlay cannot work on the text inputs.** This was the first mechanism tried,
because it changes no box at all. An `<input>` is a replaced element and renders no pseudo-element:
with the overlay applied to the date input, the measured input box was unchanged and the edge click
still landed on the row. Falsified by measurement, not assumed.

## The measured geometry the change is built on

Read from the running app with the repository CLI, not inferred from class names. Row is
`grid items-center gap-4 px-4 py-3` with a `border-b`.

| element                     | box (y, height) | dead strip above / below |
| --------------------------- | --------------- | ------------------------ |
| row                         | 219, 57         | —                        |
| date / description / amount | 233, 28         | 14 / 14                  |
| account (outline button)    | 233, 28         | 14 / 14                  |
| tags display                | 233, 28         | 14 / 14                  |
| status trigger              | 231, 32         | 12 / 12                  |
| allocation button           | 231, 32         | 12 / 12                  |
| checkbox (drawn box)        | 239, 16         | 20 / 20                  |

Root's finding that a row click is a no-op was verified independently: `onTransactionClick` is
declared and threaded through `TransactionTable.tsx` (`:100`, `:260`, `:412-418`, `:578`) but
`grep -rn 'onTransactionClick' src/app/` returns nothing. No caller exists.

## What changed per cell

| cell              | mechanism                                                | applied at                           |
| ----------------- | -------------------------------------------------------- | ------------------------------------ |
| checkbox          | `::before` overlay, 20px vertical + 8px horizontal reach | `CheckboxCell.tsx`                   |
| date              | input grows, padding compensates                         | `InlineEditableDate.tsx`             |
| description       | input grows, padding compensates                         | `InlineEditableDescriptionAlias.tsx` |
| account           | `::before` overlay, 14px reach                           | `TransactionRow.tsx`                 |
| tags              | `::before` overlay on the display area, 14px reach       | `InlineEditableTags.tsx`             |
| status            | `::before` overlay, 12px reach                           | `InlineEditableStatus.tsx`           |
| person percentage | `::before` overlay on the resting button, 12px reach     | `PersonAllocationCell.tsx`           |
| amount            | input grows, padding compensates                         | `InlineEditableAmount.tsx`           |

The **account cell is an eighth editable cell** that the dispatch's file list did not name. The
frozen text says "_every_ editable control in the transaction table", so it is in scope. Its hit
area is applied from `TransactionRow.tsx`, where the trigger's classes are already passed in, rather
than in the shared `AccountCombobox` — that component is used on surfaces whose rows are a different
height, and `src/components/ui/` was not touched at all.

For the three inputs the added height and the negative vertical margin cancel exactly, so the row's
layout is untouched; the compensating padding holds the text on its original baseline.

## Acceptance mapping

| frozen clause                                                   | evidence                                                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| clicking anywhere in a cell activates its control               | edge-click matrix below; E2E `UR-012: a click at a cell's edge activates that cell's control`                        |
| resting appearance unchanged                                    | 0/73,758 pixel diff; anchor-rect diff; E2E `UR-012: enlarging the hit areas moves nothing that was drawn`            |
| checkbox keeps its drawn size                                   | overlay sets no size; unit test asserts no `h-`/`w-`/`size-` utility in `CHECKBOX_HIT_AREA`; measured box still 16px |
| date keeps text and calendar icon in position                   | icon box byte-identical before/after; it is positioned against the container, not the input                          |
| status, tags, amount, percentages keep their appearance         | included in the 0-pixel diff and the anchor-rect check                                                               |
| hover and focus feedback follow the enlarged control            | stated explicitly below; this is the one deliberate visible change, and the frozen text requires it                  |
| keyboard behaviour unchanged                                    | tab order, arrow navigation and focus ring measured below                                                            |
| accessible roles, names, states unchanged; one control per cell | per-cell interactive-node census below                                                                               |
| existing per-cell behaviour retained                            | alias controls, presence indicator and add-transaction focus all covered by the existing suites in the campaign      |

## Commands and results

### Resting appearance — the requirement's hardest constraint

Screenshot of one resting row (pointer parked at 0,0, focus blurred, settled) before and after the
**real committed code**, differenced pixel-by-pixel in a canvas:

```text
{"w":1294,"h":57,"totalPx":73758,"diffPx":0,"maxChannelDelta":0,"colRange":null,"rowRange":null}
```

**0 of 73,758 pixels differ.** Independently, every box that a portaled surface is positioned from
was compared before and after: `descAliasAnchor`, `tagsAnchor`, `dateWrapper`, `dateIcon`,
`accountLabel` and both rule-proposal anchors were **byte-identical** (`allAnchorsStable: true`).

An earlier draft that also expanded horizontally was rejected on this evidence: it moved the account
label 8px and changed 556 pixels. That is why the shipped change is vertical-only.

### Edge clicks — asserted by clicking, never by visibility

Clicking the horizontal centre of each cell at `rowTop + 2px`, which is 12-20px above where any
control's box begins:

| cell              | top edge                             | bottom edge                     |
| ----------------- | ------------------------------------ | ------------------------------- |
| checkbox          | toggles, `aria-checked` false → true | toggles                         |
| date              | caret in `date-editable`             | caret in `date-editable`        |
| description       | caret in `description-editable`      | caret in `description-editable` |
| account           | chooser opens                        | chooser opens                   |
| tags              | chooser opens, search focused        | chooser opens                   |
| status            | select opens                         | select opens                    |
| person percentage | edit input focused                   | edit input focused              |
| amount            | caret in `amount-editable`           | caret in `amount-editable`      |

### Negative control — the tests fail against pre-change geometry

The four constants were neutralised to `""`, which restores the previous behaviour exactly without
touching any of the eight call sites. Re-running the same edge-click matrix:

```text
checkbox:{tag:DIV,cell:null,checked:false}   date:{tag:DIV,cell:null}
description:{tag:DIV,cell:null}              account:{tag:DIV,cell:null,surface:false}
tags:{tag:DIV,cell:null,surface:false}       status:{tag:DIV,cell:null,surface:false}
allocation:{tag:DIV,cell:null}               amount:{tag:DIV,cell:null}
```

**All eight land on the row DIV and nothing activates.** The constants were then restored and the
file verified byte-identical to its backup; the matrix passes again. This is the discriminating
experiment: the assertions fail when the defect is present.

### A viewport trap in the edge-click test, found by measuring

The first run of the edge-click matrix reported the amount cell as not activating, on both edges,
while the other seven passed. The instinct is to treat that as a defect in the amount cell. Probing
`document.elementFromPoint` at the click coordinate returned **no element at all**, which a real
product defect would not do — a dead cell still has the row underneath it.

The cause is the viewport. The table is wider than Playwright's default 1280px: the amount column
spans x=1233..1345, so its centre is off-screen and `page.mouse.click` lands outside the page.
Re-measured at 1600px, the amount cell activates from both edges like the rest.

`page.setViewportSize({ width: 1600, height: 900 })` is therefore the first line of the E2E test
(`8530ab0`). Without it the amount case could only ever fail, and would read to a future maintainer
as a product defect rather than a test artefact.

### A claim I had to withdraw

The module comment originally asserted that the overlay "has no `pointer-events` of its own, so it
inherits the control's — a disabled control's overlay is inert exactly as the control is." That
conclusion is correct; the stated reason was not, and it was an argument rather than a measurement.

Measured on the real checkbox: with `disabled` set, `getComputedStyle(...).pointerEvents` is
**`auto`**, and `elementFromPoint` in the overlay strip still returns the checkbox. So the overlay
does hit-test. What actually makes it inert is that a disabled `<button>` does not dispatch a click.
Confirmed with a real mouse:

```text
click in the overlay strip, enabled:  aria-checked true → false   (toggled)
click in the same point, disabled:    aria-checked false → false  (no effect)
```

Two probes on the way to this were themselves misleading and are recorded so nobody repeats them: a
synthetic `dispatchEvent` fires the handler regardless of `disabled`, reporting the opposite result;
and a hand-built probe element returned its parent in both the enabled and disabled cases, so it
discriminated nothing. Only the real control under a real mouse settled it. `2d1fbb1` corrects the
comment.

### Keyboard behaviour unchanged

```text
tab order:      date → description → account → tags → status → allocation → amount
ArrowRight from date (caret at end): description
focus ring on a focused input: outlineWidth 1px, border lab(65.5349 -2.25151 -14.5072)
```

### Accessibility — one control per cell

Census of interactive nodes per cell (excluding `tabindex="-1"`):

```text
checkbox 1 (role=checkbox, "Select transaction …")   date 1 (INPUT)
description 1 (INPUT, "Transaction description")     account 1 (role=combobox, "Select account")
tags 1 (DIV, "Add tags…")                            status 1 (role=combobox, "Paid")
allocation 1 (BUTTON, "Edit Me allocation")          amount 1 (INPUT, "Transaction amount in USD")
```

Every cell exposes exactly one control, with the same role and name as before.

### UR-005 not regressed

Resting paint, both themes, with the change applied:

```text
light: date/description/status/amount → bgAlpha 0, borderAlpha 0
dark:  date/description/status/amount → bgAlpha 0, borderAlpha 0
overlay ::before background: rgba(0, 0, 0, 0) in both themes
```

The overlay paints nothing, so it cannot reintroduce resting chrome.

### Checks

```text
pnpm typecheck                     clean
pnpm lint                          0 errors, 1 warning (pre-existing, TransactionTable.tsx:455)
pnpm format:check (my 11 files)    all correctly formatted
pnpm test --run                    2451 passed | 2 skipped, 3 consecutive full runs
```

Mutation testing of the new guards — each mutation applied, suite run, then restored:

| mutation                                       | result      |
| ---------------------------------------------- | ----------- |
| drop the input's padding compensation          | 1 test red  |
| drop `relative` from the overlay               | 1 test red  |
| shrink the checkbox reach to the old `inset-4` | 2 tests red |
| give the checkbox a `size-8`                   | 2 tests red |

After restoring, the suite is green and `git diff` on the whole tree shows only the intended change.

### E2E campaign

Run from `/tmp/mf-p33` on the granted port, `env -u CI pnpm exec playwright test --retries=0`, full
suite, 3 consecutive runs.

**Test count reconciled rather than accepted.** `--list` reported **192**. The delta was measured at
both ends rather than assumed from a remembered baseline: `--list` was run at the baseline commit
`d0b2561` in a throwaway worktree, and again at this package's HEAD.

| tree                  | declared tests  |
| --------------------- | --------------- |
| `d0b2561` (baseline)  | 190 in 24 files |
| `2d1fbb1` (this HEAD) | 192 in 24 files |

The +2 are this package's, confirmed by name in the list output and as `+` lines in the diff:

```text
transactions.spec.ts:2904  UR-012: a click at a cell's edge activates that cell's control
transactions.spec.ts:3025  UR-012: enlarging the hit areas moves nothing that was drawn
```

File count is unchanged at 24, as expected: both tests were added to an existing spec.

A `grep -E '^\+\s*test\('` over the diff finds both. A grep anchored at `^+test(` finds neither —
these are nested two `describe` levels deep and so indented eight spaces. Worth recording because a
count that fails to reconcile is normally the interesting signal, and here the first grep that
"proved" the tests absent was simply anchored wrong.

**Tree digest, `md5sum` over all tracked files excluding `next-env.d.ts`:**

| point        | digest                             |
| ------------ | ---------------------------------- |
| before run 1 | `f37cd1625c73eb1d07dafd26f9a21eef` |
| after run 3  | `f37cd1625c73eb1d07dafd26f9a21eef` |

Identical, so all three runs are evidence for one tree. Both values were written to disk with `tee`
and then read back to confirm the files are non-empty, rather than existing only in terminal output.

**Results:**

| run | passed | failed | failing tests                                                            |
| --- | ------ | ------ | ------------------------------------------------------------------------ |
| 1   | 191    | 1      | `people-settlement.spec.ts:145` canonical example C                      |
| 2   | 191    | 1      | `people-settlement.spec.ts:596` deleted Person historical balance        |
| 3   | 190    | 2      | `people-settlement.spec.ts:281` mandatory journey, `:596` deleted Person |

Every run declared 192. **Run 3's total of 190 passed is 192 minus its two failures, not a test
disappearing or a change in this package** — worth stating because a drop from 191 to 190 between
runs reads at a glance like a regression and is arithmetic.

**Every failure in all three runs is in `people-settlement.spec.ts`, with rotating membership** —
three distinct combinations across three runs on a byte-identical tree. That is the recorded open
finding for this suite, not a product regression from this package, and it was not chased.

The failure counts were read from the reporter's own `N failed` / `N passed` summary lines and the
named test paths beneath them. A glyph-based count such as `grep -c '✘'` reports zero against this
reporter, which does not emit that character — an instrument that answers a different question than
the one asked.

**Both UR-012 tests passed in all three runs.** Nothing outside `people-settlement.spec.ts` failed
in any run; in particular `rule-creation-controls.spec.ts`, `transaction-rules.spec.ts`,
`automations.spec.ts`, `tags.spec.ts` and `undo-redo.spec.ts` were green throughout.

This campaign is the first full-suite run on a tree carrying both this package's enlarged hit areas
and P30's rev 05 changes to `TransactionRow.tsx` and `InlineEditableTags.tsx`. The rule-proposal
popover, which could not be exercised by hand here, is covered by `rule-creation-controls.spec.ts`
and passed in all three runs.

## Risks

- **Hover and focus feedback now cover the whole cell.** This is a deliberate, visible change at
  hover time, required explicitly by the frozen text: "hover and focus feedback follow the enlarged
  control, so the whole cell reflects the state rather than only the region the control previously
  occupied." A row **at rest** is unchanged, which is what the requirement constrains.
- **The constants encode measured pixel values.** If the row's padding or a control's height
  changes, the reach values must change with them. The unit test derives each value from the row
  geometry rather than restating it, so a mismatch fails there rather than silently leaving a dead
  strip.
- **The three inputs now have a larger border box than they draw.** Their `hover:` and `focus:`
  backgrounds therefore paint over the full cell. That is the intended feedback change above, and it
  is why the resting-appearance proof is a diff of the _resting_ state specifically.

## Proposed questions

### Q-PROPOSAL-P33-01-01 — The account cell was not in the dispatch's file list

- **Raised by/package/revision:** p33-implementer-01 / P33 / 01
- **Context and evidence:** The dispatch enumerated seven cell components plus the row. The
  transaction table has an eighth editable cell, the account column, rendering `AccountCombobox`.
  The frozen text says "every editable control in the transaction table".
- **Why existing authority does not decide it:** The frozen text is categorical and clearly covers
  it; the dispatch's list simply omitted it. The only real question is where the change belongs,
  since the component is shared.
- **Options considered:** (a) leave the account cell alone, contradicting the frozen text; (b) edit
  `AccountCombobox`, affecting every other surface that uses it; (c) apply the hit area from
  `TransactionRow.tsx`, where its classes are already passed in.
- **Reversible default selected to continue:** (c). It satisfies the frozen text, touches no shared
  component, and is reverted by deleting one line.
- **Decision-hierarchy basis:** 1 (explicit frozen requirement), then 4 (smallest reversible
  change).
- **Impact and risk:** Low. The account cell behaves like its siblings; no other surface changes.
- **Reversal or migration path:** Remove `SHORT_CONTROL_HIT_AREA` from the account cell's `cn` call.
- **Human review still useful after completion:** Worth confirming the principal considers the
  account column part of "every editable control". Reported to the coordinator when raised.

### Q-PROPOSAL-P33-01-02 — Resting appearance is pinned positionally, not by a stored screenshot

- **Raised by/package/revision:** p33-implementer-01 / P33 / 01
- **Context and evidence:** The strongest evidence for "resting appearance unchanged" is the
  0/73,758 pixel diff, but that was produced by comparing two live builds. A committed baseline
  image would have to be regenerated on any unrelated theme or font change, and would then assert
  whatever it was last regenerated from.
- **Why existing authority does not decide it:** The frozen text requires the appearance be
  unchanged; it does not say how that should be pinned in CI.
- **Options considered:** (a) commit a screenshot baseline; (b) assert each control's resting box
  and text baseline in the row's coordinate space; (c) rely only on the one-off measurement.
- **Reversible default selected to continue:** (b). It fails on exactly what UR-012 forbids — a
  control moving — without failing on unrelated theme changes.
- **Decision-hierarchy basis:** 2 (repository convention: the existing UR-005 test measures computed
  values rather than storing images), then 4.
- **Impact and risk:** A pure repaint that moved nothing would not be caught by the committed test,
  though it was caught by the one-off pixel diff recorded here.
- **Reversal or migration path:** Add a Playwright screenshot baseline later if the project adopts
  visual regression testing generally.
- **Human review still useful after completion:** Only if visual-regression baselines are wanted
  repo-wide.

## Notes on pre-existing conditions

`tests/unit/import/duplicates.test.ts:748` ("scales linearly") is a wall-clock timing assertion that
failed once during a full run on this tree. It was reproduced at clean BASE `f7fbe15` in a separate
throwaway worktree with none of this package's changes present, failing 1 run in 7 there. It is a
pre-existing, load-sensitive flake and was not touched.
