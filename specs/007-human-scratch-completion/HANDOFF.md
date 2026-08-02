# P33 rev 02 review dispatch — ACTIVE

**Reviewer:** `p33-reviewer-02` — MUST be distinct from `p33-implementer-01` and `p33-reviewer-01`.

**BASE:** `d0b2561` — NOT `f7fbe15`. Root's rev 01 dispatch named the wrong base; the reviewer
caught it (M-1). `f7fbe15..2feb9b2` contains nine commits, six belonging to P30/P31.

**SUBJECT:** `2feb9b23f86cd2583d76b0cd52e55d3dd3140d04`, tip of branch `p33-ur-012`. VERIFIED at
dispatch time: `f397da1` is an ancestor; branch contains it. Re-verify with
`git merge-base --is-ancestor 2feb9b2 p33-ur-012` before reading a line of diff.

**Requirement:** UR-012 / `specs/013-transaction-cell-hit-area/spec.md`. The binding clause is `:37`
— "Existing per-cell behaviour is retained" — and the closing line: _a change that alters resting
appearance, position or spacing does not satisfy it_.

## What rev 01 failed on

F-1, BLOCKING: `SHORT_CONTROL_HIT_AREA` added `relative` to the tags display area and painted a
`::before` that stacked above its own in-flow descendants, burying `TagPill`'s remove button.
Clicking the × opened the chooser instead of removing the tag. MEASURED 3/3 deterministic through
the real UI, against a pre-change negative control built from `d0b2561`.

**Three green campaign runs did not catch it**: no test in the repo clicked that button, and the
committed E2E fixture had no tags, so the pill never existed.

## Rev 02's fix

`relative` on `TagPill`'s own span (`InlineEditableTags.tsx`). The implementer independently
reproduced F-1 first, then **measured and rejected two primitive-level variants**:

- `z-index: -1` on the overlay — restores the button but **breaks UR-012 itself**; the overlay drops
  behind the row and the cell-edge click stops arriving.
- `[&>*]:relative` on the primitive — works, but positions every descendant of every overlay owner
  to fix a problem one cell has.

It documented the hazard on `cell-hit-area.ts` instead, so a future overlay site meets the warning.

## Handback state, verified by root at dispatch time

Six checks green on the handback tree: typecheck clean, lint 0 errors (1 pre-existing
`useVirtualizer` warning), format clean on the implementer's files, **unit 2479 passed / 2 skipped
across 129 files**, E2E campaign 3 runs with digest `f2b41a2d` identical both ends, `--list` 195 in
24 files.

Campaign results: **zero non-settlement failures in any of the three runs.** Every failure in every
run was in `people-settlement.spec.ts`.

The implementer pre-registered six predictions to disk before run 1 and all six held — including one
about **another package** (P30's Enter-commit journey, which passed 3/3 on this tree). It also
pre-registered that a failure there would be reported as P30's signal rather than filtered as noise.
That is a discipline worth checking rather than assuming: confirm the prediction file predates the
campaign.

The implementer swept its own evidence for pre-rebase hashes that no longer resolve to HEAD's
history, and relabelled them — the same orphaned-hash failure it was caught on at rev 01, found this
time by looking. Verify the hashes in the evidence resolve and are ancestors.

## Press hardest on these

1. **The class sweep, which is stated concretely and is therefore falsifiable.** Five overlay sites;
   only tags contains a second interactive control. Account/status wrap a label span and a chevron
   `svg`; allocation wraps text and an `sr-only` span; checkbox wraps its indicator. The three input
   cells use the growth mechanism and **cannot** have this defect — no pseudo-element exists to
   stack. The date cell's calendar button is `absolute` and a **sibling** of the input, not a
   descendant of an overlay owner. Check each claim; they are individually testable.
2. **Initial conditions of the new test.** From P30's finding, which supersedes "assert both
   directions": a suite with correct assertions can still be unable to fail if every case starts in
   a state the user cannot reach. The new F-1 test builds its tag through the real chooser rather
   than seeding state — verify that, and ask the same of every case you assess.
3. **The red-then-green already run, and WHERE the red landed.** Reverting the one-line fix produced
   `remove button is not covered — Expected true, Received false`, at the topmost-element assertion,
   **with setup complete**. That distinguishes the defect failing the test from a setup error
   failing early and impersonating a discrimination. Confirm rather than assume.
4. **A corrected causal claim.** The implementer's comment said compensating padding "holds the text
   on the baseline it already had". Rev 01's reviewer measured `py-[18px]` → `py-[4px]` as **0 pixel
   change**. Corrected: an `<input>` centres its single line in its content box, so the padding's
   **value** moves nothing — only its **asymmetry** does (18/18 → 28, 4/4 → 28, 30/6 → 40).
   `Q-PROPOSAL-P33-01-02` is therefore **backwards for this case**: the positional unit test is the
   only instrument that catches this mutation and a screenshot baseline would miss it entirely. Do
   not suggest replacing it with a visual check.

## Expected, not findings

- `people-settlement.spec.ts` rotation — **at least eleven distinct membership combinations observed
  on unchanged trees, including a fully clean 19/19 run.** Two consequences, both binding on how you
  read this suite:
    - A green settlement result **carries no information**. Do not read a clean run as reassurance.
    - **A repeated test ID is not a repeated failure.** MEASURED by P33: test `281` failed at step 6
      in one run and step 11 in the next, on one unchanged digest. Every settlement observation in
      this goal's ledger records IDs without steps, so the count of distinct combinations is an
      **undercount** and two entries recorded as identical may be different failure modes. Root has
      recorded this limitation against its own record (`bae5ea4`).

    Report step-level detail where the log provides it; say so where it does not. Do not chase it —
    five mechanisms have been falsified by measurement and it belongs to no package under review.

- The campaign tree contains P30's UR-009 rev 07, including its two blur-gesture journeys.

## Method note

Root has made three frame errors in this goal's final phase — a diff read in the wrong direction, a
per-file prediction that ignored a second package landing, and a test count sanctioned for the wrong
tree. **Every one was a correct measurement attached to the wrong object.** MEASURED and INFERRED
are marked distinctly in this dispatch; treat anything unmarked as inferred, and re-derive rather
than relaying.
