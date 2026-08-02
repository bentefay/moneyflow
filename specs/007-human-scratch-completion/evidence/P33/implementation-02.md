# P33 — UR-012 implementation evidence, revision 02

Revision 01 failed independent review on one blocking finding. This revision fixes it. Everything
the reviewer verified in revision 01 — the mechanism, the geometry, the negative control, the
resting-appearance proof, the accessibility work — is carried forward unchanged and is not restated
here; see [`implementation-01.md`](implementation-01.md) and
[`../../reviews/P33-review-01.md`](../../reviews/P33-review-01.md).

- **Package / revision:** P33 / 02
- **Requirement:** UR-012, frozen source `specs/013-transaction-cell-hit-area/spec.md` (markerless)
- **Diff base:** `f397da1`, the tip of `main` this branch is rebased onto. Revision 01's reviewable
  base was `d0b2561` (M-1 from review 01, adopted); the rebase moved it forward past the P29 merge
  and P30's rev 07.
- **HEAD:** `2feb9b23f86cd2583d76b0cd52e55d3dd3140d04` on branch `p33-ur-012`
- **Commits in range:** `7b27fb2`, `90d533e`, `89fa348` (revision 01), `ead5994` and `2feb9b2` (this
  revision). The branch was rebased onto `f397da1` before the campaign, so these are the post-rebase
  hashes; pre-rebase they were `12cf55b`, `8530ab0`, `2d1fbb1`, `d73ea02`, `bca1207`.
- **Range:** non-empty. HEAD is on `p33-ur-012`, not `main`, so an ancestry check against `main`
  returns false; that is expected for worktree work.
- **Worktree:** `/tmp/mf-p33`, clean apart from `next-env.d.ts`.

**On registers.** Two claims in this package were withdrawn because a correct measurement had a
wrong explanation attached, written in the same voice. Measured and inferred read identically once
they are on the page, so in this document every number and table is an observed result from the
running app, and anything that is reasoning from structure rather than execution says so in the
sentence that makes it.

## M-1 adopted — the diff base is `d0b2561`

The reviewer is right. Revision 01's evidence labelled BASE as `f7fbe15`, the pre-rebase value,
while the actual merge-base with `main` is `d0b2561`. `f7fbe15..2d1fbb1` contains nine commits, six
belonging to P30 and P31. **The reviewable P33 diff was `d0b2561..d73ea02`** at the time that
finding was written; after the rebase described above it is `f397da1..2feb9b2`, the same five
commits replayed. The mislabelling was a stale value carried across a rebase — the same class of
error as the orphaned commit hash recorded in revision 01.

## F-1 — fixed

**Reproduced independently before changing anything.** Not taken on the reviewer's word: measured in
the running app, at the same coordinates, with the same result.

```text
elementsFromPoint at the remove button's centre, at 2d1fbb1:
  DIV{pos:relative,z:auto}   <- the overlay's owner, topmost
  path / path / svg
  BUTTON[Remove Food]        <- the real target, buried
pills 1 -> 1   removeWorked=false   chooserOpenedInstead=true
```

The finding is correct and the defect is this package's. A control that worked before this package
became unreachable after it, which the frozen text forbids in as many words: "Existing per-cell
behaviour is retained" (`specs/013-transaction-cell-hit-area/spec.md:37`).

### The fix, and the alternative that measurement rejected

`relative` on `TagPill`'s own span (`InlineEditableTags.tsx:82-98`). The pill and the overlay are
siblings in paint order rather than competing layers, so positioning the pill is enough; no
`z-index` is involved.

The dispatch asked whether the fix belonged in the primitive instead, so that each call site need
not remember. Two variants were built and measured:

| variant                           | remove button | UR-012 edge click                                                                       | verdict                  |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------- | ------------------------ |
| `relative` on the pill            | restored      | still opens the chooser                                                                 | **adopted**              |
| `z-index: -1` on the overlay      | restored      | **stops arriving** — `elementFromPoint` at the cell edge returns `DIV{transaction-row}` | rejected                 |
| `[&>*]:relative` in the primitive | restored      | still opens                                                                             | rejected on blast radius |

The middle row is the useful one: the obvious primitive-level fix **breaks the requirement itself**.
A negative `z-index` does not merely reorder the overlay against the pill, it drops the overlay
behind the row, and the cell-edge click UR-012 exists to deliver stops landing. That is recorded in
the code comment so the next person does not re-derive it by shipping it.

The third was rejected because it silently positions every descendant of every overlay owner —
present and future — to fix a problem exactly one cell has today. Instead the hazard is **documented
on the primitive** (`cell-hit-area.ts`), since the durable risk is a future overlay site repeating
the mistake, and documentation is what a future author will actually read.

### Verified in the browser, both directions and the resting state

```text
topmostIsButton: true       pillsBefore 1 -> pillsAfter 0      removeWorks: true
chooserWronglyOpened: false
tagsEdge_top: true          tagsEdge_bottom: true              UR-012 preserved
rowHeight 57   tags display top 14 height 28
display background rgba(0, 0, 0, 0)   border rgba(0, 0, 0, 0)   overlay background rgba(0, 0, 0, 0)
```

All three non-negotiables hold: the remove button works, the cell edge still opens the chooser, and
the resting geometry and paint are identical to the values measured on the pre-change build in
revision 01.

## The class, checked rather than asserted

F-1's shape is "an overlay owner containing a second interactive control". The reviewer found the
one instance; the dispatch asked for the general case to be stated explicitly rather than left
implicit. Enumerated from the source:

| overlay site                                   | second interactive control?                       |
| ---------------------------------------------- | ------------------------------------------------- |
| tags display (`InlineEditableTags.tsx`)        | **yes** — the pill's remove button. This was F-1. |
| account trigger (`TransactionRow.tsx`)         | no — a label `span` and a chevron `svg`           |
| status trigger (`InlineEditableStatus.tsx`)    | no — `SelectValue` and a chevron                  |
| allocation button (`PersonAllocationCell.tsx`) | no — text and an `sr-only` span                   |
| checkbox (`CheckboxCell.tsx`)                  | no — the Radix indicator                          |

The three `<input>` cells — date, description, amount — use the growth mechanism and **cannot** have
this defect: no pseudo-element exists on them to stack above anything.

The date cell looks like a counter-example, since its calendar button sits inside the same cell as
an interactive input. It is not: the button is `absolute` and a sibling of the input, not a
descendant of an overlay owner, and the input carries no overlay. The reviewer separately confirmed
the calendar icon is still topmost at its own centre and still opens the picker.

## Coverage — the half that actually prevents recurrence

New E2E test: `UR-012: a tag pill's remove button still removes its tag`
(`tests/e2e/transactions.spec.ts`).

**The fixture is the finding.** The committed edge-click test creates a transaction with no tags, so
a pill never exists in it, and three green full-suite campaigns were entirely consistent with F-1
being present. No test anywhere in the repository clicked this button. The new test creates a real
tag, assigns it through the real chooser, and only then asserts.

**Its initial conditions, stated as a claim rather than left implicit.** A test's starting state is
as much an assertion as its expectations, and a suite can be unable to fail because every case
begins somewhere a user cannot get to. This case begins at: a fresh identity, a tag named
"Groceries" created through the Tags page's own Add Tag form, a transaction created through the
grid, and that tag assigned by opening the cell's chooser and clicking the option. **Every one of
those is a gesture a user performs, in the order a user performs it** — no seeded CRDT state, no
injected DOM, no test-only hook. The one thing it does not reproduce is a tag arriving by import or
by an automation rule, which reach the same stored state by a different route; the pill is rendered
from that stored state, so the starting condition is equivalent, and that is an argument rather than
a measurement.

It asserts three things, because any one alone would miss a plausible variant:

1. **The remove button is the topmost element at its own centre.** The defect was a stacking fault,
   so this pins the cause. Without it, a change that happened to make the click work while leaving
   the button buried would pass.
2. **A real mouse click at the button's centre removes the tag.** `page.mouse.click` rather than
   `locator.click()`, because the question is precisely which element receives a click at that
   coordinate — and Playwright's own click can differ from a user's.
3. **The chooser did not open.** The failure mode was the click falling through to the cell. A test
   asserting only that the tag disappeared would pass against a variant that both removed the tag
   and opened the picker.

Declared test count is now **193** = 192 + 1, measured with `--list`.

### Red-then-green

**PASS.** The committed test, unmodified, run against the reverted component and required to fail:

```text
1. REVERT   diff vs HEAD: 97d96 < "relative",     exactly one line
2. RED      Error: remove button is not covered
            Expected: true  Received: false        exit 1
3. RESTORE  file matches HEAD exactly
4. GREEN    1 passed (9.3s)                        exit 0
5. TREE     only next-env.d.ts
```

**The red is the intended failure, checked rather than inferred from the exit code.** It lands at
`transactions.spec.ts:3145`, the topmost-element assertion, inside the step named "the remove button
is the topmost element at its own centre". The preceding setup completed — identity, tag creation,
transaction, tag assignment — so this is the defect failing the test rather than a setup error
failing early and impersonating a discrimination. That distinction matters here because both produce
a non-zero exit and a one-line "1 failed" summary.

Both file variants were re-verified against HEAD rather than assumed current: the fixed variant is
byte-identical to the committed file, and the reverted one differs by exactly the single line
`"relative",`. A stale variant would have produced a red that meant nothing while looking exactly
like this one.

Three preparations are recorded below, because each guarded a failure mode that impersonates success
and two of them fired during the run.

**The `-g` selector matches exactly one test** — `Total: 1 test in 1 file`. A selector matching
_zero_ tests also exits non-zero, so an empty match would have been read as the required red: a
discrimination that never ran, indistinguishable in the log from one that did.

**A stale build cache cannot manufacture a false red, and the direction is what makes that true.**
The worktree carries a 1.2 GB `.next/dev` cache older than the component edits. Serving a stale
module after the revert would deliver the _fixed_ component, so the test would **pass** — a false
green. Because the step requires a failure, and specifically on the `remove button is not covered`
assertion, a red is self-validating: only the genuinely reverted component produces it. The mirror
case is the live risk and is treated as such: **a green at this step is inconclusive, not evidence
the test fails to discriminate**, and the cache is cleared before drawing any conclusion from one.

**The run stands across the pending rebase.** Root measured P29's footprint from the merge-base as
seven files — `ImportPanel.tsx`, `MappingTab.tsx`, `use-import-state.ts`, `detection.ts` and three
unit tests — with **zero** touching `InlineEditableTags.tsx`, `cell-hit-area.ts` or `tests/e2e/`. So
the rebase cannot affect what this discrimination establishes. That is a measurement now; before
root ran it, this package had only the inference.

### Campaign

Run from `/tmp/mf-p33` on the granted port: `env -u CI pnpm exec playwright test --retries=0`, full
suite, 3 consecutive runs, on the rebased tree.

**Predictions were written to disk before run 1** (`/tmp/p33-campaign/prediction-rev02.txt`) so they
could be graded rather than reconstructed. All six held.

| #   | prediction                                           | result                     |
| --- | ---------------------------------------------------- | -------------------------- |
| 1   | `--list` declares 195 in 24 files                    | held                       |
| 2   | both UR-012 edge/geometry tests pass in all 3 runs   | held                       |
| 3   | the new F-1 remove-button test passes in all 3 runs  | held                       |
| 4   | P30's Enter-commit journey passes on this tree       | held, all 3 runs           |
| 5   | settlement membership deliberately **not** predicted | correctly withheld         |
| 6   | digest identical before run 1 and after run 3        | held, `f2b41a2d` both ends |

```text
run 1   192 passed   3 failed   people-settlement :166 :281 :596
run 2   192 passed   3 failed   people-settlement :166 :281 :596
run 3   194 passed   1 failed   people-settlement :596

digest before run 1   f2b41a2da22cd79dde933298000c86b0
digest after  run 3   f2b41a2da22cd79dde933298000c86b0
```

**Zero non-settlement failures in any run.** Every failure across all three runs is in
`people-settlement.spec.ts`, the recorded open finding, and was not chased.

**Settlement membership is reported as data, not interpreted.** `{166, 281, 596}` twice, then
`{596}` alone. Note that `:281` failed at _different steps_ in runs 1 and 2 — step 6 "verify Bob
owes Me $50" versus step 11 "restore paid, enter Bob -20%" — so a repeated test ID is not the same
failure. The rotation has previously produced a fully clean 19/19 run, so **neither a failure nor a
clean result in this suite carries information**, and no conclusion is drawn from run 3 being
cleaner.

**Prediction 4 concerns another package's work, not this one, and is recorded here because this
campaign is the first tree on which it could be observed.**

`a description alias committed with Enter applies an Updating rule` belongs to **P30**, not P33. It
was added by `6b3fb57` and had failed deterministically in P30's preceding runs; P30 diagnosed the
cause as a shared row locator re-pointing when a journey renames the description it filters on, and
fixed it in `c9e80b8` and `d8d5fb2`. This package's rebase happened to pull all three commits in.

Before predicting anything, all three were verified as ancestors of this HEAD — `6b3fb57`,
`c9e80b8`, `d8d5fb2` — and the test was confirmed present at `rule-creation-controls.spec.ts:478`.
So the prediction rested on the fixes actually being in this tree, not on a claim relayed from
elsewhere.

**The prediction and its failure interpretation were both written to disk before run 1**, stating
that a failure there would be a real signal for P30 rather than noise in someone else's package, and
would be reported as such. That commitment was made in advance precisely so a failure could not
afterwards be rationalised as load. **It passed 3/3.**

A reviewer should read this as what it is: a pre-registered observation about a third party's fix,
made from a different worktree with a different instrument, before that party's own campaign ran. It
is not this package's evidence for its own correctness, and nothing in P33's acceptance depends on
it.

**On the declared count.** This tree measures 195 while `main` at `f397da1` measures 192. Both are
correct about different trees: the +3 is exactly this package's additions to
`tests/e2e/transactions.spec.ts` — the two UR-012 edge/geometry tests from revision 01 and the F-1
remove-button test from this revision. The earlier 193 baseline was taken before `6b3fb57` landed,
which is why the per-file check moved; that movement is fully attributed above.

This revision has no open items.

## A second claim withdrawn — the padding does not do what its comment said

The reviewer's mutation table showed `py-[18px]` → `py-[4px]` changing **0 resting pixels**. This
package's comments said the compensating padding "holds the text on the baseline it already had". If
that were so, removing it would have moved the text. It did not, so the stated reason was wrong.

Measured rather than merely deleted, reading the content band's centre relative to the row:

| padding               | content-band centre | text moves? |
| --------------------- | ------------------- | ----------- |
| 18px / 18px (shipped) | 28                  | —           |
| 4px / 4px             | 28                  | no          |
| 30px / 6px            | 40                  | **yes**     |

An `<input>` centres its single line of text within its content box, so **the padding's value moves
nothing; only its asymmetry does.** The 0-pixel result was reproduced independently with this
package's own screenshot diff before being accepted.

Both comments carrying the wrong reasoning are corrected in `2feb9b2` — the module doc and the E2E
test's baseline assertion.

This strengthens the reviewer's conclusion rather than merely conceding it: on this mutation the
unit test's arithmetic is the only instrument that fails, so `Q-PROPOSAL-P33-01-02`'s concern that a
positional test is weaker than a stored screenshot is **inverted for this case** — a screenshot
baseline would have missed it entirely.

Worth naming the pattern, since it is now twice in one package: both withdrawn claims were _causal
explanations_ written in the same voice as measured facts. The measurements were right each time;
the reasons attached to them were not. Nothing fails when that happens, which is what makes it hard
to catch — see also the disabled-overlay correction in revision 01.

## Checks

```text
pnpm typecheck                          clean
pnpm lint                               0 errors, 1 warning (pre-existing, TransactionTable.tsx:455)
pnpm exec oxfmt --check (my files)      all correctly formatted
pnpm test --run tests/unit/transactions 183 passed, 15 files
playwright test --list                  193 tests in 24 files
```

Those checks were run before the rebase, at 193 declared tests. The campaign section above supersedes
them: it reports the post-rebase tree at 195, which is the tree handed back.

## Risks

- The fix depends on `TagPill` staying inside an overlay owner. If the pill is ever rendered
  somewhere without one, `relative` becomes inert but harmless — it changes no layout, since the
  pill has no positioned descendants of its own.
- The documented hazard on the primitive is prose, not a mechanism. A future overlay site containing
  an interactive child would still need a test that clicks that child; nothing prevents the mistake
  automatically. Making the primitive safe by construction was measured and rejected above, so this
  is a knowingly accepted residual risk rather than an oversight.

## Proposed questions

No new questions. `Q-PROPOSAL-P33-01-01` (the account cell) and `Q-PROPOSAL-P33-01-02` (positional
resting test rather than a stored baseline) stand from revision 01; the reviewer concurred with both
and neither blocks. On the second, the reviewer went further than the proposal claimed: they tried
to construct a repaint-only defect that the positional test would miss and **could not**, finding
instead that the one mutation changing zero pixels is caught by the unit test's arithmetic and would
have been missed by a screenshot baseline.
