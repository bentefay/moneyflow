# P33 — UR-012 independent review, revision 02

## Verdict: **FAIL**

One blocking finding: **F-2**, a second instance of exactly the class revision 01's F-1 belonged to,
in a cell the rev 02 class sweep enumerated and cleared. `CHECKBOX_HIT_AREA` is applied inside
`CheckboxCell`, which is rendered **twice** — once per data row and once as the header's select-all.
The constant's ±20px reach is derived from the 57px data row; the header row is 37px. The header's
overlay therefore overhangs its own row by 9px and covers the top of the first data row's checkbox
cell. **Clicking the first transaction's own checkbox cell at its top edge selects every transaction
in the table.**

The committed UR-012 edge-click test performs that exact click and passes, because its fixture has
one row and its assertion reads only that row's `aria-checked` — a value select-all also sets. This
is the same shape as F-1: correct assertions, a fixture that cannot express the failure.

F-1 itself is genuinely fixed, and I verified that independently rather than accepting it.
Everything else in the package holds up. F-2 is a gap in the same enumeration, not a flaw in the
approach.

- **Reviewer:** `p33-reviewer-02`. **Independence confirmed:** distinct from `p33-implementer-01`
  and `p33-reviewer-01`; I wrote none of this code and edited no product, test or `specs/**` file.
  The only file I created is this one, uncommitted.
- **Reviewed HEAD:** `2feb9b23f86cd2583d76b0cd52e55d3dd3140d04`, tip of `p33-ur-012`
- **BASE actually used:** `f397da178a94b0c31170c680e5e8b4e8f45d01f0` — **not** the dispatch's
  `d0b2561`. See M-1.
- **Product/test diff reviewed:** 11 files, +603/−1

## Ancestry, re-derived

MEASURED, twice: once before reading any diff, once immediately before writing this file.

```text
$ git merge-base --is-ancestor 2feb9b23f86cd2583d76b0cd52e55d3dd3140d04 p33-ur-012
exit=0                                   2026-08-02 15:29:43 UTC   (before reading the diff)
exit=0                                   2026-08-02 15:43:46 UTC   (at write time)
$ git rev-parse p33-ur-012            -> 2feb9b23f86cd2583d76b0cd52e55d3dd3140d04
```

An ancestry check is valid only for the instant it ran; both instants are recorded above.

I reviewed in my own worktree `/tmp/mf-p33-rev02`, created detached at `2feb9b2`, with its own
`pnpm install`. Its tree stayed clean apart from `next-env.d.ts` throughout, verified after every
mutation I made and restored. I did not touch `/tmp/mf-p33`, the implementer's worktree.

## M-1 — the dispatch's BASE is stale, and it is stale in the opposite direction to rev 01's

MEASURED. My brief states
`BASE: d0b2561 (NOT f7fbe15 — root's rev 01 dispatch named the wrong base and the rev 01 reviewer caught it)`.
That correction was right **when rev 01 was reviewed**. It is wrong now: the branch was rebased
between the revisions.

```text
git merge-base 2feb9b2 main           -> f397da178a94b0c31170c680e5e8b4e8f45d01f0
git merge-base --is-ancestor d0b2561 f397da1   -> exit=0   (d0b2561 is now an ANCESTOR of the base)
git log --oneline f397da1..2feb9b2    -> 5 commits, all P33
git log --oneline d0b2561..2feb9b2    -> 39 commits
```

`d0b2561..2feb9b2` pulls in 16 files belonging to **P29, P30 and P31** — `detection.ts`,
`ImportPanel.tsx`, `MappingTab.tsx`, `use-import-state.ts`, `TransactionRuleProposal.tsx`,
`rule-creation-controls.spec.ts` and four unit tests, plus committed `specs/**` artifacts. Reviewing
the dispatch's stated base would have shown me three other packages' work as though it were P33's —
the identical failure mode rev 01 caught, reintroduced by carrying its fix forward across a rebase.

**The reviewable P33 diff is `f397da1..2feb9b2`**, the five commits `7b27fb2`, `90d533e`, `89fa348`,
`ead5994`, `2feb9b2`, and that is what I reviewed. The implementer's evidence states this correctly
at its "Diff base" line. This is a correction to the dispatch, not a finding against the package.

Worth naming, since this is the second revision in a row it has happened: a base is a fact about a
tree, and it expires when the tree is rebased. The rev 01 correction was transcribed into the rev 02
dispatch as a constant.

## F-2 — BLOCKING — the header's select-all overlay reaches into the first row's checkbox cell

- **Files:** `src/components/features/transactions/cells/cell-hit-area.ts:116-117` (the constant),
  applied at `src/components/features/transactions/cells/CheckboxCell.tsx:82`, which
  `src/components/features/transactions/TransactionTable.tsx:178` renders as the header's
  select-all.
- **Frozen clause violated:** "Existing per-cell behaviour is retained"
  (`specs/013-transaction-cell-hit-area/spec.md:37`), and the requirement's own core sentence
  "Clicking anywhere within a cell activates **that cell's** control" (`:21`) — here it activates a
  different cell's control, in a different row.

### The measurement

MEASURED in the running app on port :3000, real Chromium, real mouse, two transactions created
through the grid. Point clicked: the first data row's checkbox cell centre-x, at `rowTop + 2` —
**the exact point the committed UR-012 test clicks.**

```text
SUBJECT 2feb9b2
  click (313, 221) = first data row, checkbox cell, top edge
  aria-selected before: ["false","false"]
  aria-selected after:  ["true","true"]        <- BOTH rows selected
  header checkbox after: "true"

PRE-CHANGE (CheckboxCell.tsx restored from f397da1, one file, nothing else)
  elementFromPoint at the same coordinate: DIV   (dead, as UR-012 describes)
  aria-selected before: ["false","false"]
  aria-selected after:  ["false","false"]       <- nothing happens
```

Reproduced **3/3**, deterministic, identical coordinates, in both directions (the same click
deselects all when all are selected). The pre-change control was built by checking out only
`CheckboxCell.tsx` at `f397da1`; the file was restored byte-identical to HEAD afterwards and
`git diff --exit-code` confirmed it.

### The overlapping band, mapped pixel by pixel

MEASURED. `elementFromPoint` down the first data row's checkbox column, `aria-label` reported:

```text
dy= 0..7   "Select all transactions"      <- the HEADER's control, inside the DATA row
dy= 8..14  "Select transaction …"         <- the row's own control
```

The first 8 pixels of the first data row's checkbox cell belong to the header.

### The arithmetic, which is what makes this general rather than incidental

MEASURED geometry, both rows:

```text
data row:    height 57   gap above checkbox 20   gap below 21     -> reach 20 fits
header row:  height 37   gap above checkbox 10   gap below 11     -> reach 20 OVERSHOOTS by 9
```

`CHECKBOX_HIT_AREA`'s `-top-[20px] -bottom-[20px]` is derived from the 57px data row — the module
doc says so explicitly at `cell-hit-area.ts:20` ("checkbox (drawn box) | 239, 16 | 20 / 20"), and
the unit test pins it to `ROW.verticalPadding + (32 - 16) / 2` at `cell-hit-area.test.ts:133`. Both
are correct **about the data row**. Neither knows the constant is also applied in a 37px row.

INFERRED, from `getComputedStyle`: the header row is `position: sticky; z-index: 10`, so when the
table scrolls the header floats above the rows beneath it. I did not measure the scrolled case — the
unscrolled case already fails — but the overlay is a child of a `z-10` sticky container, so I would
expect the affected band to follow the header rather than stay at the top of the table. Worth
measuring during the fix rather than assuming either way.

### Why every green run missed it, MEASURED

This is the part that matters most, and it is F-1's lesson repeating.

The committed test **does** click this exact point, at `transactions.spec.ts:2999-3008`. It passes.
I checked why rather than assuming:

```text
committed assertion: expect(row-0 checkbox).toHaveAttribute("aria-checked", "false" -> "true")

observed on the subject, after the offending click:
  row-0 aria-checked: false -> true      <- assertion SATISFIED
  row-1 aria-checked: false -> true      <- not asserted
  all rows aria-selected: false -> true  <- not asserted
```

Select-all sets the first row's `aria-checked` to `true` just as a per-row toggle would. The
assertion cannot distinguish them. And `createTestTransaction` builds **one** row, so in the test's
own fixture there is no second row whose state could differ — the two behaviours are literally
indistinguishable in that fixture, whatever it asserts.

So: three green full-suite campaign runs, and a test that clicks the defective pixel, are all fully
consistent with this defect being present. **That is the same sentence rev 01 wrote about F-1**,
with a different cause: there the fixture lacked a tag, here it lacks a second row.

### What revision 03 must do

1. **Constrain the header's overlay to its own row.** I probed a candidate rather than proposing one
   untested: scoping the header checkbox's `::before` to `top: -10px; bottom: -11px` — its measured
   own-row gaps — restored the first data row's full band (`dy=2` onwards returns
   `"Select transaction …"`) while the header's own top and bottom edges still returned
   `"Deselect all transactions"`. MEASURED via an injected scoped stylesheet, removed immediately
   after; treat it as a demonstration that a fix exists in this direction, not as the
   implementation. A distinct constant for the header, or a prop on `CheckboxCell`, are both
   plausible shapes; the package should pick and measure its own.
2. **Give the edge-click test a fixture that can fail.** Two rows minimum, and the checkbox step
   must assert the **other** rows are unaffected, not only that the clicked row toggled. Without
   that second assertion the test remains unable to express this defect regardless of the fixture.
3. **Re-run the class sweep with "how many times is this rendered" as an explicit column.** See
   below — the sweep's method, not just its result, is what let this through.

## The class sweep — where it went wrong

The dispatch asked me to press hardest here because the claims are concrete and falsifiable. They
are, and I tested each. MEASURED, against the subject tree via `grep` over `src` and `tests` and
`elementFromPoint` in the running app:

| overlay site      | second interactive descendant? | verified                                  |
| ----------------- | ------------------------------ | ----------------------------------------- |
| tags display      | **yes** — the pill's × button  | confirmed; fixed (F-1)                    |
| account trigger   | no                             | confirmed — label span + chevron svg only |
| status trigger    | no                             | confirmed — `SelectValue` + chevron       |
| allocation button | no                             | confirmed — text + `sr-only` span         |
| checkbox          | no                             | confirmed — Radix indicator only          |

The three `<input>` cells: confirmed, no `::before` exists to stack — `SHORT_CONTROL_HIT_AREA`,
`TALL_CONTROL_HIT_AREA` and `CHECKBOX_HIT_AREA` are the only three overlay constants
(`grep before:absolute src` returns exactly those three lines, all in `cell-hit-area.ts`), and none
is applied to an input. The date cell: confirmed, its calendar button is `position: absolute` with
parent `DIV`, not a descendant of an overlay owner, and it is topmost at its own centre
(`elementFromPoint` returns `BUTTON`, `contains` true).

**Every stated claim is true.** The sweep is accurate and I could not falsify any row of it.

It nonetheless missed F-2, and the reason is structural rather than careless: the sweep asks "does
this element contain a second interactive control?" — a question about the **subtree**. F-2 is a
question about the **ancestor**: does this overlay's reach exceed the box that contains it, and is
that box the same everywhere the component is mounted? A negative-inset overlay deliberately escapes
its own element; nothing in an enumeration of descendants can see where it lands.

Concretely, the sweep lists five sites but the code has five _call sites_ and **six mounts** —
`CheckboxCell` appears at `TransactionRow.tsx:403` and `TransactionTable.tsx:178`. It is the only
one of the eight components with more than one usage; I checked all eight
(`grep -rn "<ComponentName" src`), and the other seven are each used exactly once, from
`TransactionRow`. `AccountCombobox` is shared with `AccountTab.tsx:213`, but the hit area is applied
at the `TransactionRow` call site rather than inside the component, which is precisely the reasoning
that keeps it safe — the same reasoning was available for `CheckboxCell` and was not applied.

## F-1 — verified fixed, independently

MEASURED, not accepted from the evidence. Real app, tag created through the Tags page's own Add Tag
form, transaction created through the grid, tag assigned by opening the cell's chooser and clicking
the option — every step a real gesture:

```text
remove button at its own centre:
  topmost element: <path> inside BUTTON[Remove Groceries]   contains=true
  stack: path{static} / path{static} / svg{static} / BUTTON[Remove Groceries]{static} / SPAN{relative}
```

The pill's `SPAN` is now `position: relative` and sits beneath the button in the stack rather than
above it. The button is reachable. The mechanism in the code comment matches what I measured.

**Red-then-green, reproduced from scratch.** I deleted the single line `"relative",` at
`InlineEditableTags.tsx:97` myself (`git diff` confirmed exactly one line removed, nothing else) and
ran the committed test unmodified:

```text
Error: remove button is not covered
Expected: true   Received: false
  at tests/e2e/transactions.spec.ts:3145:76
  at tests/e2e/transactions.spec.ts:3131:13
  step: "the remove button is the topmost element at its own centre"
1 failed
```

The red lands at `:3145`, the topmost-element assertion, **inside its named step, with the preceding
`"put a tag on the row"` step passed** — so this is the defect failing the test, not a setup error
failing early and impersonating a discrimination. The file was then restored and verified
byte-identical to HEAD. This confirms the evidence's claim by re-derivation rather than by reading
it.

**Initial conditions of the new test.** Verified by reading `transactions.spec.ts:3105-3163`: it
calls `createNewIdentity`, `goToTags`, `createTag`, `goToTransactions`, `createTestTransaction`,
then opens the cell's chooser and clicks the `Groceries` option. No seeded CRDT state, no injected
DOM, no test-only hook. I reproduced that same sequence by hand in the browser and it reached the
intended state. The evidence's own caveat — that a tag arriving by import or automation rule is not
covered — is correctly labelled there as an argument rather than a measurement, and I agree with
both the argument and the label.

## The corrected causal claim about padding

The dispatch told me not to suggest replacing the positional unit test with a visual check. I would
not have, and the correction is sound: `2feb9b2` rewrites both the module doc
(`cell-hit-area.ts:38-53`) and the E2E comment (`transactions.spec.ts:3068-3076`) to say the
padding's **value** moves nothing and only its **asymmetry** does. That matches the physics of an
`<input>` centring its single line in its content box, and matches rev 01's measured
`py-[18px]→py-[4px]` = 0 pixels.

**Residual, non-blocking (M-2).** The withdrawn claim survives in a third place the correction did
not reach: `tests/unit/transactions/cell-hit-area.test.ts:118-119` still reads

```text
// The added padding equals the growth plus the shared `Input` base's own 4px `py-1`,
// which is what holds the text on its original baseline.
```

That is the exact sentence `2feb9b2` retracts. The assertion below it is correct and should stay —
it is the instrument that catches the mutation. Only the comment is wrong. Not blocking, but it
should be corrected in the same revision as F-2, since a stale explanation left next to a correct
assertion is how the claim survived the first correction.

## Checks — all re-run by me, in my own worktree

MEASURED. Figures re-derived, not relayed from the dispatch or the evidence.

```text
pnpm typecheck                     clean
pnpm lint                          0 errors, 1 warning
                                   TransactionTable.tsx:455 useVirtualizer — confirmed pre-existing:
                                   that file is not in `git diff --name-only f397da1 2feb9b2`
pnpm exec oxfmt --check <11 files> all correctly formatted
pnpm test --run                    129 files, 2479 passed, 2 skipped
playwright test --list             195 tests in 24 files
playwright -g "UR-012" --retries=0 3 passed (16.0s)
```

The unit figures match the dispatch's `2479 passed / 2 skipped across 129 files` and the `--list`
figure matches `195 in 24 files`, both independently re-derived. First attempt reported 2 failures
in `realtime-socket-security.test.ts`; that was my worktree missing `.env.local`, an artifact of my
own setup, not the code — copying it in produced the clean run above. Recorded so the discrepancy is
not mistaken for a finding.

I did **not** re-run the three-run campaign. The dispatch's campaign claims concern a suite whose
green result it also states carries no information, and F-2 is deterministic and reproducible
without it. Stated plainly as something I accepted rather than verified.

## Everything else verified

MEASURED unless noted.

- **One interactive node per cell, and correct roles/names.** Census of the real row: checkbox
  `role=checkbox "Select transaction …"`; date `input "Pick a date"`; description
  `input "Transaction description"`; account `role=combobox "Select account"`; tags DIV; status
  `role=combobox`; allocation `button "Edit Me allocation"`; amount
  `input "Transaction amount in USD"`. The date cell reports 2 interactive nodes — the input and its
  calendar button — which is pre-existing and not introduced here.
- **Tab order unchanged**:
  `checkbox → date → description → account → tags → status → allocation → amount`, measured by
  focusing the row checkbox and pressing Tab eight times.
- **UR-005 resting chrome intact in dark mode**: with `emulateMedia({colorScheme:"dark"})`, all five
  measured cells report `background rgba(0, 0, 0, 0)` and `::before background rgba(0, 0, 0, 0)`.
  The overlay paints nothing in either theme.
- **No console errors.** The full session console log is 64 lines with zero matches for
  error/warn/uncaught/failed.
- **Resting geometry.** I did not rebuild rev 01's pixel-diff harness. The committed positional test
  (`transactions.spec.ts:3026`) passed on the subject, and rev 01 measured 0/91,200 pixels changed
  independently of the implementer's 0/73,758. Accepted rather than re-derived, and flagged as such.
- **No `as`, `any` or `!`** in the product diff; the added code is class-name constants and
  comments.

## What I verified versus what I accepted

**Verified by my own measurement:** ancestry at two instants; the real diff base and its 39-vs-5
commit consequence; the full 11-file diff; F-2 in the running app with a pre-change negative
control, 3/3; the overlapping band pixel by pixel; the header/data row arithmetic; why the committed
test passes despite clicking the defective pixel; a candidate fix direction for F-2; F-1's fix via
the element stack; red-then-green by reverting the line myself and confirming where the red lands;
the new test's initial conditions both by reading and by hand; every row of the class sweep; the
mount count of all eight components; typecheck, lint, format, 2479 unit tests, 195 declared E2E, the
three UR-012 tests; tab order; dark-mode resting paint; console cleanliness.

**Accepted without re-derivation, and labelled:** the three-run campaign and its digest; rev 01's
pixel-diff of the resting row; the two rejected fix variants (`z-index: -1`, `[&>*]:relative`) — I
measured neither, though the `z-index: -1` reasoning is consistent with the overlay's negative
insets and I have no reason to doubt it; the prediction file's timestamp — I did not open
`/tmp/p33-campaign/prediction-rev02.txt`, since it lives in the implementer's own scratch and its
contents cannot be independently dated from outside.

**Inferred, not measured:** the scrolled sticky-header behaviour of F-2's band.

## Port and environment

I used port **:3000** and have **released it** — the dev server I started was killed by resolving
`/proc/<pid>/cwd` to my own worktree `/tmp/mf-p33-rev02` and killing only that pid. `ss -ltn` now
shows no listener on :3000. The human's server on **:3001 was never touched** and is still
listening. No bare `pkill -f` pattern was used against a name that could match another agent's
process. The CLI session `p33rev02-manual` is closed and its `.playwright-cli/` directory deleted.
My worktree's tree is clean apart from `next-env.d.ts`.

## Proposed questions

None new. `Q-PROPOSAL-P33-01-01` (the account cell) and `Q-PROPOSAL-P33-01-02` (positional test
rather than a stored baseline) stand from revision 01. On the second I agree with rev 01 and with
the implementer's inversion of it: on the zero-pixel mutation the unit test's arithmetic is the only
instrument that fails, and a screenshot baseline would miss it. I would not replace it.

## UX verdict

The requirement's core behaviour is genuinely delivered — a click anywhere in a cell activates that
cell's control, and I confirmed the resting row is unchanged in the ways I measured. But UR-012's
own sentence is "clicking anywhere within a cell activates **that cell's** control", and on the
first visible row of every table that is currently false for the checkbox column: the click
activates a different control belonging to a different row, and silently selects everything. A user
aiming at one transaction's checkbox and selecting the whole table is a worse outcome than the dead
strip UR-012 set out to remove, because the dead strip did nothing and this does something wrong.
That is why F-2 blocks.
