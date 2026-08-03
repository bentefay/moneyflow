# P20B rev 08 review — remediation of F-A/F-B/F-C — ACTIVE

**Reviewer:** `p20b-reviewer-08`. MUST be distinct from `p20b-implementer-08` and from
`p20b-reviewer-01`, `-02`, `-03`, `-06`, `-07`.

**BASE (original package BASE for this revision line):** `c15be1289bad2c9743f8d7169e2048dc65f5c0ac`.
**SUBJECT HEAD:** re-derive with `git rev-parse HEAD` and run
`git merge-base --is-ancestor <subject> HEAD` before reading a line of diff.

**Hash hazard, live in this revision.** The implementer **amended its final commit**: `5e02607`
became `205ca15`. Root quoted the pre-amend hash once before re-deriving it. An amended-away hash
still resolves via `git show` but is **not an ancestor of HEAD**. Re-derive; do not carry a hash
from any document, including this one.

## What you are reviewing

Remediation of the three findings in `reviews/P20B-review-07.md` (FAIL). Two commits, two files,
**no product code**: `tests/e2e/people-settlement.spec.ts` (F-B) and `.claude/skills/e2e/SKILL.md`
(F-C). F-A is remediated in the evidence file itself.

**Evidence:** `evidence/P20B/implementation-09.md` — on disk, **UNCOMMITTED by design**
(`PROCESS.md:58`). The filename runs one ahead of the revision number; known skew, not an error.

**Your one writable file:** `reviews/P20B-review-08.md`. Write nothing else. Do not commit.

## Press hardest on these

1. **F-B's two-directional control is the load-bearing claim.** The implementer reports a probe that
   prints the cell and grades **both** the old and new assertions against the same state:
   ABSENT → old PASSES, new FAILS; PRESENT → both pass. **Verify the ABSENT state is genuinely
   absent** — the write is dropped with `Escape` rather than the assertion doctored — and that the
   probe was **not** committed. **A probe that cannot fail, or whose "absent" state is unreachable
   by a real user, proves nothing**; this goal has recorded that failure mode repeatedly, including
   a pre-fix probe that passed an explicit `undefined` and inverted a finding.
2. **F-A is a documentation remediation and must be checked as literally as the code.** The evidence
   must carry the `c515173` campaign re-derived from `/tmp/p20b07-c2/` — that directory and no other
   — plus an explicit retraction of `implementation-08.md`'s five defects. **Check it has no
   placeholder token, no dangling `§` reference to a section it never wrote, and no claim
   contradicted elsewhere in the same file.** Root bounced the previous reviewer twice and caught a
   count/list mismatch only after persisting; F-A exists because exactly this went unchecked.
   Cross-file references must be visibly marked as pointing at the evidence, not at the review.
3. **Whether the campaign figures are right.** Independently: 11 failures / 10 runs, two green runs,
   one digest triple across all ten. **Count only Playwright's numbered failure blocks**
   (`^  [0-9]+\) \[chromium\]`) — a bare grep for the spec path also matches passing `✓` lines.
4. **Whether F-B's change destabilises the mandatory journey.** It sits inside step 9 of the
   19-test settlement spec. The failing **step name** is printed in Playwright's own failure header;
   record it, because this ledger's settlement history records only test IDs and lost that detail.
5. **Whether anything over-claims.** The implementer states its change is **localisation, not a
   fix**, and that nothing here closes the residual class. **Check no sentence drifts from that.**

## Expected, not findings

- **The 10-consecutive-green bar is NOT met and is not this revision's to meet.** Failures in the
  residual settlement class at roughly **1.1 per full-suite run** are expected. **Do not fail this
  revision for them**, and do not accept any claim that they are closed.
- **A fully green run proves nothing.** Three agents have independently produced one on a tree known
  to fail. Isolation is equally uninformative.
- **F-2 and the residual settlement class are deliberately UNOWNED** (`Q-P20B-26`). The rev 07
  reviewer refuted the diagnosis that routed the class to P20B: `settlement-view.ts:186-193` returns
  `settled` only when `obligations.length === 0` **and** `qualifyingTransactionCount !== 0`, a
  counter incremented at `settlement.ts:1227` **after** `commitCalculation` — so a page reading
  "Everyone is settled up" has **already hydrated and run the settlement engine**. Not this
  package's, and not yours to route.

## Instrument hazards, every one measured in this goal

- **`git worktree add` does not copy untracked `.env.local`.** Every journey then fails identically
  at `createNewIdentity` — **an environment failure that impersonates a total product break.** Tell:
  if every test fails at the same helper before any product code runs, it is the environment.
- **Do not `cp -a node_modules`** — it carries `node_modules/.vite/vitest/results.json`, which has
  reported passes for a run that actually failed.
- **`duplicates.test.ts` "performance scales linearly" is a wall-clock ratio assertion** — it fails
  under CPU load. Do not run unit tests beside an E2E campaign and trust the result.
- **Never a bare `pkill -f`** — it matches your own shell, exits 144, leaves the target running.
  Resolve `readlink /proc/<pid>/cwd`, kill by pid, verify by state not exit code.
- **`ss -ltn` for port questions.** **`:3001` is the human's dev server and must NEVER be touched.**
  `:3000` is yours. `env -u CI`; never `--debug`/`--ui`/`--headed`/`show`.
- **`next-env.d.ts` is rewritten on every dev-server start** and moves a naive campaign digest.
- **Scope any format run to your own files** — a bare `pnpm format` rewrites `specs/**` including
  the frozen `specs/human-scratch.md`.
- **NEVER `pnpm db:reset` or any destructive database command** — the local Supabase holds ~30,587
  real vaults shared with the human's dev server.
- **Name the log path in every claim.** Root once read a superseded campaign directory and concluded
  ten runs had not happened.

## Method note

**Root's claims have been corrected repeatedly by the agents it dispatched**, including a wrong BASE
twice, a wrong reading of which campaign directory was live, a quoted pre-amend commit hash, and a
count/list mismatch it persisted. **Re-derive every figure in this dispatch rather than relaying
it.** Where a claim is marked INFERRED treat it as unverified; where unmarked, treat it as inferred.
