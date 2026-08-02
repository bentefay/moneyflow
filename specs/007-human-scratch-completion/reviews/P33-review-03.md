# P33 — UR-012 independent review, revision 03

## Verdict: **PASS**

F-2 is genuinely fixed, and I confirmed that by measurement rather than by reading the evidence. The
band that used to belong to the header now belongs to the row it sits in, at every boundary in the
table, and clicking the first transaction's checkbox selects that transaction only. F-1 remains
fixed. The requirement's binding resting-appearance clause holds under my own before/after
measurement against a real BASE build. No new finding blocks.

I chased three things that looked like defects and were not, and I record all three below with the
measurement that cleared them, because each would have been a plausible fourth FAIL: a 13px row
overlap, a 1px strip at each row's bottom, and a one-off unit failure.

- **Reviewer:** `p33-reviewer-03`. **Independence:** distinct from `p33-implementer-01`,
  `p33-reviewer-01` and `p33-reviewer-02`. I wrote none of this code. I edited no product file, no
  test file, and no file under `specs/**` other than this one. Every mutation I made for grading was
  made in my own throwaway worktree and restored to a byte-identical state, verified by hash.
- **BASE:** `f397da178a94b0c31170c680e5e8b4e8f45d01f0` — **re-derived, not accepted.**
- **Reviewed HEAD:** `4a6e23fd5df79f843e7f0214257170d75f140695`, tip of `p33-ur-012`.
- **Reviewable diff:** `f397da1..4a6e23f`, 7 commits, 12 files, +770/−1.

## Ancestry and BASE, re-derived

MEASURED, at two instants: before reading any diff, and immediately before writing this file.

```text
$ git merge-base p33-ur-012 main
f397da178a94b0c31170c680e5e8b4e8f45d01f0        matches the dispatch

$ git merge-base --is-ancestor 4a6e23f p33-ur-012
exit=0    2026-08-02 16:0x UTC   (before reading the diff)
exit=0    2026-08-02 17:06:39 UTC (at write time)

$ git rev-parse p33-ur-012
4a6e23fd5df79f843e7f0214257170d75f140695
```

The dispatch warned this BASE had expired twice. **This time it is correct** — my independently
derived merge-base equals the stated one. I record that as a re-derivation, not as agreement.

Note for root: the primary checkout `/home/ben-agents/Code/moneyflow` is on `main` at a commit that
is **not** the subject. The subject lives only on the branch. I reviewed in my own worktree
`/tmp/mf-p33-rev03`, created detached at `4a6e23f`, with `.env.local` copied in and its own
`pnpm install`. A BASE worktree `/tmp/mf-p33-rev03-base` at `f397da1` was built the same way for
before/after comparison. I did not touch `/tmp/mf-p33`, the implementer's worktree.

## F-2 — verified fixed, at every boundary rather than at the reported coordinate

MEASURED. Real Chromium, real mouse, transactions created through the grid. I mapped ownership of
the checkbox column with `elementFromPoint` at 0.5px resolution across all three boundaries, rather
than only re-testing the coordinate the finding named.

```text
header 182..219   row0 219..276   row1 276..333

--- header/row0 boundary ---
  y=213    HEADER/CHECKBOX          the header's own control, inside the header
  y=218    HEADER/DIV               the header's 1px border
  y=219.5  row0/CHECKBOX            row 0's own control, from its very first pixel

--- row0/row1 boundary ---
  y=268    row0/CHECKBOX
  y=275    row0/DIV                 row 0's own 1px border-b
  y=276.5  row1/CHECKBOX            row 1's own control
```

**No pixel of any data row is owned by the header, and no pixel of row N+1 is owned by row N.**
Compare rev 02's measurement, where `dy=0..7` of the first data row reported
`"Select all transactions"`.

Behavioural confirmation, three rows in the fixture so a table-wide action is visible:

```text
CLICK row0 top+0   ["false","false","false"] -> ["true","false","false"]   header=mixed
CLICK row0 top+1   ["false","false","false"] -> ["true","false","false"]   header=mixed
CLICK row0 top+2   ["false","false","false"] -> ["true","false","false"]   header=mixed
CLICK row0 top+3   ["false","false","false"] -> ["true","false","false"]   header=mixed
CLICK row1 top+0   ["false","false","false"] -> ["false","true","false"]
CLICK row1 top+1   ["false","false","false"] -> ["false","true","false"]
CLICK row1 top+2   ["false","false","false"] -> ["false","true","false"]
CLICK header top+1 ["false","false","false"] -> ["true","true","true"]     select-all still works
CLICK header bot-2 ["true","true","false"]   -> ["true","true","true"]     both header edges live
```

`rowTop+2` is the exact point rev 02 measured selecting every row. It now selects one.

### The sticky-scroll case, which rev 02 left INFERRED

MEASURED, and my first attempt at this was wrong in a way worth recording. I scrolled until the
sticky header floated over the rows and mapped beneath its bottom edge:

```text
header pinned at 182..219
  y=219 (header bottom + 0.0)   row1 :: "Select transaction "
```

The first row fully below the header owns its own first pixel. **The band does not follow the
header**, confirming the implementer's claim.

**My own error, recorded so it is not repeated:** in an earlier pass I reported the header owning
pixels of "the top row" under scroll. That was my oracle, not the product — the row I picked was
scrolled _behind_ the sticky header (row box `170..227` against a header at `182..219`), so
`elementFromPoint` correctly returned the header. A row underneath a sticky header is occluded by
design and is not a hit-area defect. I re-ran against the first row genuinely below the header's
bottom edge before drawing any conclusion.

## Three things that looked like findings and are not

I state these in full because each is the sort of observation that would read as a blocking defect
if reported without the check that clears it.

### (a) A 13px row-to-row overlap — real, pre-existing, and not this package's

MEASURED. Immediately after creating rows through the grid, adjacent row boxes overlap:

```text
row1 276..333   row2 320..377   overlap=13.0px
```

The cause is `TransactionTable.tsx:455`, `ROW_HEIGHT = 44`, the virtualizer's size _estimate_,
against a real row of 57px. Two checks clear it of this package:

- **It is identical at BASE.** `git show f397da1:...TransactionTable.tsx` has the same
  `ROW_HEIGHT = 44`, and my probe run in the BASE worktree reproduces the same 13px overlap at the
  same rows. This package changes nothing about virtualization; its only edit to that file is the
  four-line `rowGeometry="header"` prop and its comment.
- **It is a transient, not a settled state.** After a reload the rows tile exactly
  (`219..276 | 276..333 | 333..390 | …`) and my content-band ownership scan reports
  **`foreignOwners=0` for all six rows**. The overlap is measurement lag before the virtualizer
  re-measures, not the state a user interacts with.

Non-blocking and out of scope, but worth root knowing it exists: during the transient, row N+1's
checkbox does own part of row N's lower strip. At BASE that strip was dead (`owner=row2 DIV`); with
this package it is live (`owner=row2 CHECKBOX`). **That difference is caused by UR-012 doing exactly
what UR-012 requires** — the strip is inside row N+1's own overlay reach and belongs to it — and it
resolves on the first re-measure. I could not construct a click that lands wrongly in a settled
table, and the frozen text does not speak to a pre-existing virtualizer estimate.

### (b) A 1px dead strip at each row's bottom edge

MEASURED, and it is the row's own `border-b`, not a gap in the hit area.

```text
CLICK row0 bottom-3   -> ["true","false","false"]     activates
CLICK row0 bottom-2   -> ["true","false","false"]     activates
CLICK row0 bottom-1   -> ["false","false","false"]    the 1px border
```

`getComputedStyle` reports `border-bottom-width: 1px` on the row, and the constants deliberately
encode `bottom` one pixel larger than `top` for this reason, documented at
`cell-hit-area.ts:143-145` and asserted at `cell-hit-area.test.ts:65`. The requirement is about the
cell; the border is the row's own box, outside every cell's grid track. The committed test clicks
`rowBottom − 3`, which is inside. Not a finding.

### (c) A single unit-test failure that did not reproduce

MEASURED. My first `pnpm test --run` reported `1 failed | 2480 passed`. I re-ran the full suite
**four** more times and got `129 files, 2481 passed, 2 skipped` every time, and could not capture
the failing file's name from a rerun. I am reporting this rather than suppressing it: I observed one
failure I could not identify or reproduce, and I did not grade the package on it. Root should know
the observation exists. Everything I could re-derive says the suite is clean.

## What I pressed hardest on — the five items, each tested rather than reasoned about

### 1. The guard compares constants against RECORDED gaps — the residual is REAL

MEASURED, and this is the one place where the implementer's own stated risk is confirmed by
experiment rather than merely acknowledged.

**Mutation A — drift the header constant and its recorded gap together**, leaving the product's
header row untouched at `py-2`/37px:

```text
cell-hit-area.ts   header: -top-[10px] -bottom-[11px]  ->  -top-[6px] -bottom-[7px]
cell-hit-area.test.ts  header: { gapAbove: 10, gapBelow: 11 }  ->  { gapAbove: 6, gapBelow: 7 }

unit    10 passed          GREEN
E2E     3 UR-012 passed    GREEN
```

**Both instruments pass while the header's reach is 4px short of its real gap.** The residual the
implementer disclosed is exactly this, and it is genuine. I judge it **non-blocking**, and the
reason is the asymmetry I found next.

**Mutation B — the same drift in the data row**, both constant and recorded gap:

```text
dataRow: -top-[20px] -bottom-[21px] -> -top-[8px] -bottom-[9px]
MOUNTS.dataRow: { gapAbove: 20, gapBelow: 21 } -> { gapAbove: 8, gapBelow: 9 }

unit  AssertionError: expected 8 to be 20        RED at cell-hit-area.test.ts:154
      test: "reaches the row edge from each control's measured resting position"
E2E   Expected "true", Received "false"          RED at transactions.spec.ts:3048
```

The data row is caught **even when both numbers drift together**, because it has a second,
independent anchor: `ROW.verticalPadding + (32 − 16) / 2`, derived from the row's padding rather
than recorded alongside the constant. The header has no such second anchor.

So the honest statement of the residual is narrower than "the guard catches a mismatch, not a drift
of both": it is **the header variant specifically** that has one anchor instead of two. The data row
— the mount the frozen requirement is actually about, and the only one a user edits in — is doubly
pinned. On the header, a both-drifted change degrades the select-all's reach without breaking
anything, and cannot resurrect F-2, because F-2 needs the header's reach to _exceed_ its gap and the
`toBeLessThanOrEqual` half of the guard bites on that direction against a recorded number that a
careless author would have to deliberately inflate. **Deriving the header gap from the row's own
padding, as the data row does, would close this. Worth a follow-up, not a block.**

### 2. `rows.first()` as the E2E subject — bounded more tightly than the evidence claims

MEASURED. The residual is real in principle but narrower than stated.

`grep -rn 'transaction-row' src/` returns exactly two hits: `TransactionRow.tsx:359`, which sets the
testid, and `TransactionRuleProposal.tsx:171`, which only reads it via `closest`. **No component
other than `TransactionRow` can render that testid**, so `rows.first()` cannot silently become a
non-transaction row; it can only become a _different_ transaction row.

And DOM order matches visual order: `extractVirtualRange` (`TransactionTable.tsx:320-332`) returns
`defaultRangeExtractor(range)` unchanged when nothing is pinned, and when rows are pinned it sorts
`(left, right) => left - right` before returning. So the first DOM row is the topmost rendered row,
which is the only row the header's overlay could ever reach. The subject is correct and the test's
own `toHaveCount(2)` plus distinct-ID assertions bound it further. Not a finding.

### 3. `AccountCombobox` — the structural argument, now measured rather than reasoned

MEASURED, and it holds.

```text
grep -n "HIT_AREA|before:|relative" src/components/features/accounts/AccountCombobox.tsx
  (no matches)
```

The component carries **no hit area of its own and no positioned overlay**. Its two mounts:

- `TransactionRow.tsx:457` passes `SHORT_CONTROL_HIT_AREA` in `className`, at the call site.
- `AccountTab.tsx:213` passes `value`, `onChange`, `accounts`, `placeholder`, `disabled` — and **no
  `className` at all.** I read the call site rather than inferring it.

So the import mount cannot receive a hit area sized for a 57px row. The argument is not "no future
caller will pass one" — it is that the component holds nothing to inherit, which is a property of
the code as committed and the reason the rule below is the right shape.

### 4. The revert-check, and where the red lands — CONFIRMED, re-derived from scratch

MEASURED. I reintroduced F-2 myself rather than accepting the evidence's transcript. One line
changed, verified by `git diff --stat`:

```text
header: ... before:-top-[10px] before:-bottom-[11px] ...
     -> header: ... before:-top-[20px] before:-bottom-[21px] ...
```

**Unit, RED:**

```text
AssertionError: header reaches above its row: expected 20 to be less than or equal to 10
  at tests/unit/transactions/cell-hit-area.test.ts:179
Tests  1 failed | 9 passed (10)
```

**E2E, RED — and this is the question that mattered:**

```text
Error: expect(locator).toHaveAttribute(expected) failed
  Expected: "false"   Received: "true"
  at tests/e2e/transactions.spec.ts:3052:49
  step: "top edge toggles only this row's checkbox"
1 failed
```

The red lands at **`:3052`, the bystander assertion** — `otherCheckbox` reading `"true"` when the
pointer never touched that row. Not at the fixture setup, not at a locator timeout, and **after the
preceding steps of the same loop iteration passed**: the text-field, account, tag, status and
allocation steps all completed before the checkbox step ran. That is F-2's signature — a row
selected that nobody clicked — and it is exactly what the dispatch asked me to confirm, given that
three of the implementer's four earlier fixture faults produced timeouts that impersonate a product
break.

**Restore and green:**

```text
git checkout -- cell-hit-area.ts;  git diff --exit-code src/  -> clean
md5 of my file          1d663cee5fa73c2e05ce4a0a249bdf3d
md5 of 4a6e23f's blob   1d663cee5fa73c2e05ce4a0a249bdf3d   IDENTICAL
unit  10 passed
E2E   3 passed  (all three UR-012 tests)
```

### 5. Mount count as a sweep column — the rule checked, not the census

MEASURED. I ran my own census with `grep -rn "<ComponentName" src/ tests/` over all eight components
rather than reading the evidence's table:

| component                        | src mounts                       | hit area applied | can a mount inherit a wrong reach? |
| -------------------------------- | -------------------------------- | ---------------- | ---------------------------------- |
| `CheckboxCell`                   | **2** — `TransactionRow`, header | **inside**       | was F-2; now a required prop       |
| `AccountCombobox`                | **2** — `TransactionRow`, import | at the call site | no — component holds none          |
| `InlineEditableDate`             | 1                                | at the call site | no                                 |
| `InlineEditableDescriptionAlias` | 1                                | at the call site | no                                 |
| `InlineEditableAmount`           | 1                                | at the call site | no                                 |
| `InlineEditableStatus`           | 1                                | at the call site | no                                 |
| `InlineEditableTags`             | 1                                | at the call site | no                                 |
| `PersonAllocationCell`           | 1                                | at the call site | no                                 |

The census matches. More importantly **the rule discriminates correctly**: the only two multi-mount
components are the only two where the question arises, and the one that applied its area _inside_ is
the one that failed. The other seven apply theirs at the call site — I verified each `HIT_AREA`
reference's location with `git grep -n "HIT_AREA" 4a6e23f -- src/`, and every one outside
`CheckboxCell.tsx` sits in a `cn(...)` at the point of use.

The type-level enforcement is real, not decorative: `rowGeometry: CheckboxRowGeometry` is a required
prop with no default (`CheckboxCell.tsx:32`), and `CheckboxRowGeometry` is
`keyof typeof CHECKBOX_HIT_AREA`. A third mount cannot compile without naming its geometry, and
`cell-hit-area.test.ts:194` asserts `Object.keys(CHECKBOX_HIT_AREA)` equals `Object.keys(MOUNTS)`,
so a new variant cannot be added without measured geometry. `pnpm typecheck` is clean.

## The binding clause — resting appearance is unchanged

MEASURED, by building a real BASE tree and running the identical probe against both. This is the
clause that decides the verdict, so I did not accept rev 01's pixel diff.

| element              | BASE (top, left, w×h) | SUBJECT             | verdict       |
| -------------------- | --------------------- | ------------------- | ------------- |
| row                  | h 57, w 1294          | h 57, w 1294        | IDENTICAL     |
| checkbox drawn       | 20, 24, 16×16         | 20, 24, 16×16       | IDENTICAL     |
| date calendar icon   | 16, 160, 24×24        | 16, 160, 24×24      | IDENTICAL     |
| account trigger      | 14, 460, 160×28       | 14, 460, 160×28     | IDENTICAL     |
| tags display         | 14, 636, 140×28       | 14, 636, 140×28     | IDENTICAL     |
| status trigger       | 12, 792, 110×32       | 12, 792, 110×32     | IDENTICAL     |
| allocation button    | 12, 918, 128×32       | 12, 918, 128×32     | IDENTICAL     |
| date input box       | 14, 64, 120×28        | **0, 64, 120×56**   | the mechanism |
| description input    | 14, 200, 244×28       | **0, 200, 244×56**  | the mechanism |
| amount input         | 14, 1062, 112×28      | **0, 1062, 112×56** | the mechanism |
| date text band       | top 18, height 20     | top 18, height 20   | IDENTICAL     |
| description band     | top 18, height 20     | top 18, height 20   | IDENTICAL     |
| amount band          | top 18, height 20     | top 18, height 20   | IDENTICAL     |
| font size, all three | 14px                  | 14px                | IDENTICAL     |

**Every drawn control is byte-identical.** The only boxes that change are the three inputs' own
border boxes, which is the documented mechanism, and their **text bands do not move** — same top,
same height, same font size. Nothing a user can see has moved.

UR-005 resting chrome, both builds: `checkbox`, `account`, `status` and `dateInput` all report
`background rgba(0, 0, 0, 0)` with identical border width and identical `box-shadow` strings. The
overlay paints nothing.

## F-1 — still fixed

MEASURED. `TagPill`'s span carries `relative` at `InlineEditableTags.tsx:97`, with the mechanism and
the two rejected alternatives recorded in the comment above it. The committed regression test
`UR-012: a tag pill's remove button still removes its tag` passed in all three of my full-suite
runs. Rev 02 independently re-derived this fix by deleting the line and watching the red land at the
topmost-element assertion; I did not repeat that experiment and say so plainly under "accepted".

## M-2 — fixed, verified by reading the file

MEASURED. `cell-hit-area.test.ts:129-133` now reads that the padding "is NOT what holds the text in
place — an `<input>` centres its single line in its content box, so the padding's value moves
nothing and only its asymmetry does." The retracted sentence rev 02 found is gone. The assertion
beneath it, `expect(padding).toBe(margin + 4)`, is unchanged, which is correct: rev 01 measured that
this is the _only_ instrument catching the zero-pixel `py-[18px]→py-[4px]` mutation.

## Checks — all re-run by me, in my own worktree

MEASURED. Every figure below is from my own run.

```text
pnpm typecheck                        clean
pnpm lint                             0 errors, 1 warning
                                      TransactionTable.tsx:459 useVirtualizer react-hooks/incompatible-library
                                      CONFIRMED pre-existing: the same call exists at f397da1:455
pnpm exec oxfmt --check <12 files>    all matched files use the correct format
pnpm test --run  (x4 clean runs)      129 files, 2481 passed, 2 skipped
                                      plus one unreproducible failure, see (c) above
playwright test --list                195 tests in 24 files
```

**Full E2E campaign, `env -u CI`, `--retries=0`, 3 consecutive runs on my tree:**

```text
run 1   194 passed  1 failed   people-settlement: "a deleted Person keeps their historical balance…"
run 2   194 passed  1 failed   people-settlement: "canonical example E: a negative allocation reverses…"
run 3   193 passed  2 failed   people-settlement: "mandatory journey: allocate, settle, trace…"
                               people-settlement: "a deleted Person keeps their historical balance…"

tree digest, all three runs    140026528044cdf07ef3da55f66df8aa   IDENTICAL
all 3 UR-012 tests             PASSED in all three runs
```

**Every failure in all three runs is a `people-settlement.spec.ts` member**, with rotating
membership, which the dispatch records as a known open finding belonging to no package under review.
Zero non-settlement failures. I read the failing step from Playwright's failure header rather than
the test ID, as instructed. Per the dispatch's own statement that a clean settlement run has been
observed on an unchanged tree, I draw no inference from these results either way — I ran them to
detect _non_-settlement regressions, and there were none.

My digest differs from the evidence's `78671626…` because we hashed different file sets; mine covers
the 12 files in `git diff --name-only f397da1 4a6e23f`. What matters is that it is **constant across
all three of my runs**, so the campaign is evidence for one tree.

## What I re-derived versus what I accepted

**Re-derived by my own measurement:** BASE via `git merge-base`; ancestry at two instants; the full
12-file diff; F-2's fix at all three boundaries at 0.5px resolution, with behavioural clicks on a
three-row fixture; the scrolled sticky-header case; the header's own two edges still selecting all;
the row-overlap question, including building a BASE tree to prove it pre-existing and a reload to
prove it transient; the 1px border strip; mutation A and mutation B against both instruments;
red-then-green by reverting the constant myself, with the red's landing site and the preceding
steps' completion; file restoration verified by md5 against the subject's git blob; the mount census
for all eight components; `AccountCombobox`'s internals and both its call sites; `rows.first()`'s
bound via grep and the range extractor; the resting-appearance comparison against a real BASE build,
every drawn box plus text bands plus resting paint; typecheck, lint (and its pre-existing status at
BASE), format, four unit runs, three full E2E runs, `--list`.

**Accepted without re-derivation, and labelled as such:**

- **rev 02's red-then-green for F-1.** I confirmed the fix is present and its test passes; I did not
  re-delete the `relative` line to re-observe the red. Rev 02 did that experiment.
- **rev 01's 0/91,200 pixel screenshot diff.** I measured geometry and computed styles instead. My
  method would miss a pure repaint that moved no box; rev 01's would catch it, and rev 01 also
  reported it could not construct such a defect.
- **The implementer's `/tmp` scratch artifacts and the evidence's own campaign digest.** Not
  independently datable from outside its worktree.
- **The `people-settlement` failures' cause.** I confirmed membership and that nothing outside that
  file failed; I did not diagnose them. They belong to no package under review.

**Neither measured nor inferred — an observation I could not resolve:** the single unreproducible
unit failure in (c).

## Port and environment

I used port **:3000** and announced before claiming. It is **released**: `ss -ltn` shows no listener
on :3000. The one dev server I started manually was killed by resolving `/proc/1998142/cwd` to my
own worktree `/tmp/mf-p33-rev03` and killing that pid alone — no bare `pkill -f`. Playwright managed
its own server for every test run and shut it down each time. **The human's server on :3001 was
never touched** and is still listening, verified after every kill.

Both my worktrees are clean apart from `next-env.d.ts`, which the package contract excludes. Every
probe file I wrote has been deleted; `git status --porcelain` in `/tmp/mf-p33-rev03` reports only
`M next-env.d.ts`. I wrote no file anywhere in the repository except this review.

## Proposed questions

No new blocking questions. `Q-PROPOSAL-P33-01-01` (the account cell's inclusion) and
`Q-PROPOSAL-P33-01-02` (positional test rather than a stored baseline) stand from revision 01; I
concur with both prior reviewers on each, and neither blocks.

One **non-blocking follow-up** for root's risk ledger, from press-point 1: the `header` variant's
reach is pinned only against a recorded constant, while the `dataRow` variant is pinned twice —
against its recorded gap _and_ against `ROW.verticalPadding + (32 − 16) / 2`, derived from the row's
own padding. Deriving the header's gap the same way would remove the last both-drift blind spot. I
measured this rather than reasoned it: mutation A stayed green through both instruments, mutation B
went red in both.

## UX verdict

UR-012 asks that clicking anywhere within a cell activates **that cell's** control, and that the
table at rest look exactly as it did. Both now hold under my own measurement. The dead strip is gone
from every cell in both directions; the row's own 1px border is the only inactive pixel, and it
belongs to the row rather than to any cell. Nothing a user can see has moved: every drawn control
sits at the same offset with the same size, and the three text fields' glyphs sit on the same
baseline in the same band. The defect that made rev 02 worse than the problem it fixed — one click
selecting the whole table — is gone, and the geometry that caused it is now a required, type-checked
choice at each mount rather than a constant a new call site inherits silently.
