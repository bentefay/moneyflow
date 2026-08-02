# P33 rev 03 review dispatch — ACTIVE

**Reviewer:** `p33-reviewer-03` — MUST be distinct from `p33-implementer-01`, `p33-reviewer-01` and
`p33-reviewer-02`.

**BASE:** `f397da178a94b0c31170c680e5e8b4e8f45d01f0` — the merge-base of `p33-ur-012` and `main`,
MEASURED by root at dispatch time. **The reviewable diff is `f397da1..4a6e23f`, 7 commits.** This
value has expired twice in this package: `f7fbe15` was wrong at rev 01, `d0b2561` was correct then
and wrong by rev 03 after a rebase. **Re-derive it — do not carry it from this file.**

**SUBJECT:** `4a6e23fd5df79f843e7f0214257170d75f140695`, tip of `p33-ur-012`. VERIFIED on the branch
at dispatch time. Run `git merge-base --is-ancestor 4a6e23f p33-ur-012` before reading a line of
diff; an ancestry check is valid only for the instant it ran.

**Requirement:** UR-012 / `specs/013-transaction-cell-hit-area/spec.md`. Binding clauses: `:21`
("Clicking anywhere within a cell activates **that cell's** control") and `:37` ("Existing per-cell
behaviour is retained"), plus the closing line — a change altering resting appearance, position or
spacing does not satisfy it.

**Evidence:** `evidence/P33/implementation-03.md`, uncommitted on disk — correct per
`PROCESS.md:58`.

## Prior verdicts

- **rev 01 FAIL** (`reviews/P33-review-01.md`) — F-1: the tags overlay buried `TagPill`'s remove
  button.
- **rev 02 FAIL** (`reviews/P33-review-02.md`) — F-2: `CHECKBOX_HIT_AREA`'s ±20px reach, derived
  from a 57px data row, applied unchanged in a 37px header, so the header's overlay covered the
  first 8px of the first data row's checkbox cell. Clicking one row's checkbox selected every row.

**Both were fixtures that could not express the failure** — one lacking a tag, one lacking a second
row. Three green campaign runs are consistent with either defect being present.

## What rev 03 changed

`CHECKBOX_HIT_AREA` is now keyed by row geometry (`dataRow`, `header`) and `CheckboxCell` takes the
key as a **required prop with no default**, so a third mount cannot compile without stating its
geometry. M-2 fixed (a retracted padding rationale that survived in a unit-test comment). The
sticky-scroll case, previously INFERRED, is now measured.

## Press hardest on these — the implementer's own stated residuals, ordered by its estimate of risk

1. **The guard compares measured constants against RECORDED gaps.** If a row's padding changes, both
   the variant and its recorded gap need updating together — **the guard catches a mismatch between
   them, not a drift of both.** Assess whether that residual is acceptable or whether the gap should
   be derived rather than recorded.
2. **The E2E subject is `rows.first()`**, which it must be, since the header's overlay can only
   reach the row beneath it. **If a future change makes the first rendered row something other than
   a transaction row, the test silently changes subject.** It asserts two rows exist with distinct
   IDs, which bounds but does not eliminate this.
3. **`AccountCombobox` is safe by a structural argument, not a measurement.** Its hit area comes
   from the caller and the import mount passes none — `grep HIT_AREA` inside the component returns
   zero — but _"no future caller will pass one"_ is reasoning. Test the argument.
4. **The revert-check, and WHERE its red lands.** The implementer reports its rev 03 test had three
   faults and one wrong assertion, all caught by the red-then-green. **Three produced a timeout or
   an unrelated failure rather than a wrong assertion** — a test that cannot resolve its own fixture
   fails identically to a broken product. Confirm the final red lands on the bystander assertion in
   the checkbox step, **after setup completed**.
5. **Mount count as a sweep column.** Eight components, six with one mount, two with two.
   `CheckboxCell` applied its own hit area so both mounts inherited it; `AccountCombobox` applies
   none. The general rule the package extracted: **a hit area applied inside a component travels to
   every mount; one applied at the call site does not.** Check the rule, not just the census.

## Expected, not findings

- **`people-settlement.spec.ts`** — a fully clean 19/19 run has been observed on an unchanged tree,
  so **a green settlement result carries no information**, and for 5 of 19 tests the ID does not
  identify the failing assertion. **Read the failing step name from Playwright's failure header**,
  which prints it verbatim after the `›` separators. Belongs to no package under review.
- The campaign at `4a6e23f`: 194 passed / 1 failed in each of three runs, every failure a settlement
  member, digest `78671626…` identical both ends, `--list` 195 in 24 files.

## Instrument hazards, measured in this goal

- **`git worktree add` does not copy untracked `.env.local`.** Without it every journey fails
  identically at `createNewIdentity`. **The tell needs no second signal: if every test fails at the
  same helper before any product code runs, it is the environment** — whatever result you expected.
- **`cp -a node_modules` carries `node_modules/.vite/vitest/results.json`**, which has reported
  passes for a run that actually failed and nearly inverted another reviewer's grading experiment.
- **Never a bare `pkill -f`** — it matches your own shell, exits 144, and leaves the target running.
  Resolve `readlink /proc/<pid>/cwd` and kill by pid. **The human's dev server on `:3001` must never
  be touched.** Use `ss -ltn` for port questions; a process scan searches a table containing the
  searcher.
- `:3000` is the only E2E port and is currently free. Announce before claiming and after releasing.
  Never `--debug`/`--ui`/`--headed`/`show`. Use `env -u CI`.

## Method note

Root's claims in this goal have been corrected repeatedly by the agents it dispatched, always in one
shape: **a correct, well-formed check answering a narrower question than the claim it supported.**
Root has also stated a wrong BASE twice for this package. **Re-derive every figure in this dispatch
rather than relaying it.** Where a claim is marked INFERRED treat it as unverified; where it is
unmarked, treat it as inferred.

Your verdict must be a single unconditional PASS or FAIL. Empty diff is never automatic approval.
Write to `reviews/P33-review-03.md`. Do not commit it — root persists it after the verdict.
