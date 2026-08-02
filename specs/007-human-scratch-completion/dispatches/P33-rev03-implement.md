# P33 rev 03 — implementation dispatch — ACTIVE

**Implementer:** `p33-implementer-01` (continuing; this is a fix revision of its own package).

**BASE:** `f397da1` — the merge-base of `p33-ur-012` and `main`, MEASURED at dispatch time
(`git merge-base 2feb9b2 main`). **NOT `d0b2561`.** That was correct for rev 01 and expired when the
branch was rebased; `d0b2561..2feb9b2` spans 35 commits pulling in P29/P30/P31 files. The reviewable
P33 diff is `f397da1..2feb9b2`, five commits.

**Prior verdict:** `reviews/P33-review-02.md` — **FAIL** on F-2. Committed at `0a2294b` with the rev
02 evidence.

## F-2 — BLOCKING — the header's select-all overlay reaches into the first data row

MEASURED by the reviewer, 3/3 deterministic, real Chromium, real mouse, against a pre-change control
built by restoring only `CheckboxCell.tsx` from `f397da1`:

```
click first data row's checkbox cell at rowTop+2   (the exact pixel the committed test clicks)
  SUBJECT     aria-selected ["false","false"] -> ["true","true"]     BOTH rows
  PRE-CHANGE  elementFromPoint = DIV (dead);   ["false","false"] unchanged

band map, first data row's checkbox column:
  dy=0..7   "Select all transactions"     <- the HEADER's control, inside the DATA row
  dy=8..14  "Select transaction …"        <- the row's own control
```

**Root verified the structure independently:** `CHECKBOX_HIT_AREA` (`cell-hit-area.ts:116-117`) is a
single constant applied at `CheckboxCell.tsx:82`, and `CheckboxCell` is rendered **twice** —
`TransactionRow.tsx:403` (data row, 57px, gaps 20/21) and `TransactionTable.tsx:178` (header, 37px,
gaps 10/11). The ±20px reach is derived from the 57px row and **overshoots the header's box by
9px**.

**Frozen clauses violated:** `specs/013-transaction-cell-hit-area/spec.md:37` ("Existing per-cell
behaviour is retained") and `:21` — clicking within a cell must activate **that cell's** control.

**Why three green campaigns and a test clicking that pixel all missed it, MEASURED:** the fixture
builds **one** row and asserts only that the clicked row's `aria-checked` went false→true.
Select-all satisfies that identically. **In a one-row fixture the two behaviours are
indistinguishable whatever you assert.**

## What rev 03 must do

1. **Constrain the header's overlay to its own row.** The reviewer probed
   `top: -10px; bottom: -11px` — the header's measured own-row gaps — and confirmed it restores the
   data row's full band while keeping the header's own edges live. **That is a demonstration a fix
   exists in this direction, not the implementation.** A distinct constant or a `CheckboxCell` prop
   are both plausible; pick one and measure it yourself.
2. **Give the edge-click test a fixture that can fail:** two rows minimum, and the checkbox step
   must assert the **other** rows are unaffected — not only that the clicked row toggled.
3. **Re-run the class sweep with MOUNT COUNT as an explicit column.** Rev 02's sweep asked _does
   this overlay owner contain a second interactive descendant_ — correct question, all five answers
   verified true. It never asked _how many geometries is this constant applied in_. **Five call
   sites, six mounts; `CheckboxCell` is the only one of the eight components rendered twice.**
4. **M-2, non-blocking:** the withdrawn padding rationale survives at
   `tests/unit/transactions/cell-hit-area.test.ts:118-119` — the comment still says the padding
   "holds the text on its original baseline", the claim `bca1207` measured false. The assertion is
   fine; the comment is stale. **A corrected claim surviving in a second file is the same sweep
   failure one level down.**

## Verification constraints

- **Do NOT substitute a component harness for the real page.** Root wrongly suggested the rev 01
  port-free harness as a fallback; it renders a single `TransactionRow` and **cannot mount the
  header and a data row together**, so it could not have found F-2 and cannot verify its fix.
- **Red-then-green the new assertions:** revert the fix, run the committed test unmodified, require
  red, and check **where** the red lands — setup must complete first, or a setup error is
  impersonating a discrimination.
- **INFERRED, measure rather than assume:** the header is `position: sticky; z-index: 10`, so the
  affected band may follow the header on scroll rather than staying at the table top. Only the
  unscrolled case was measured, and it already fails.
- Three non-negotiables from rev 02 still hold: remove works, cell-edge clicks still activate the
  right control, resting appearance/position/spacing unchanged.

## Port

`:3000` is the only E2E port and is currently held by `p30-reviewer-04`. **Wait for root's explicit
signal; a free reading is not a grant.** Then `env -u CI`, `--retries=0`, digests before and after.
Never `--debug`/`--ui`/`--headed`/`show`. Never a bare `pkill -f` — it matches your own shell. The
human's `:3001` must never be touched.

## Settlement rotation

Expected, not a finding, and belonging to no package under review. A fully clean 19/19 run has been
observed, so **a green settlement result carries no information**; and for 5 of 19 tests the ID does
not identify the failing assertion. **Read the failing step name from Playwright's failure header**,
which prints it verbatim after the `›` separators.
