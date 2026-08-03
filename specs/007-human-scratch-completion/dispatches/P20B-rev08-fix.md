# P20B rev 08 — remediate F-A, F-B, F-C from `reviews/P20B-review-07.md` — ACTIVE

**Implementer:** `p20b-implementer-08`. Distinct from `p20b-implementer-07`, and you are NOT the
reviewer of this or any prior P20B revision.

**BASE:** re-derive with `git rev-parse HEAD`. Do not carry a hash from this file. The review range
for your successor is the original package BASE `c15be1289bad2c9743f8d7169e2048dc65f5c0ac` through
your newest HEAD.

## Prior verdict

`reviews/P20B-review-07.md` — **FAIL**, from DISTINCT `p20b-reviewer-07`. **Read it first.**

**Read what the FAIL is not.** It is **not** for the unmet 10-run-green bar, and it is **not** a
rejection of rev 07's code. Both changes in `6061ef7`/`c515173` were independently confirmed
**correct, safe and controlled**, and the reviewer reproduced rev 07's central self-damaging claim —
that it fixed two real instrument defects and **neither explains the observed failures**. It found
**no place where that evidence over-claims**: "its error is omission, not overstatement."

**Do not re-litigate, re-open or "improve" the rev 07 changes.** `playwright.config.ts` and
`tests/e2e/helpers/nav.ts` are **out of scope for this revision** and must be byte-identical when
you hand back.

## Your scope — exactly three findings

### F-A (BLOCKING) — documentation only

The rev 07 evidence `evidence/P20B/implementation-08.md` is **immutable and already persisted** at
commit `0e08862`. **You must not edit it.** You remediate F-A in **your own** evidence file, which
must contain the validation campaign for `c515173` that `-08` lacks, plus an explicit retraction
section for `-08`'s errors.

`-08`'s five defects, each MEASURED by the reviewer and re-verified by root:

1. line 170 is the literal token `PLACEHOLDER-CAMPAIGN` under `## 4. Campaign results`;
2. neither `0a6703e11a28`, nor `65a6ba3389ea`, nor `p20b07-c2` appears anywhere in the file;
3. `§4.2b` is cross-referenced at lines 247 and 588 and **does not exist**;
4. line 247 names `FINAL tree 5bdd30322604` while **line 236 of the same file discards that
   campaign**, and the tree actually validated is never named;
5. line 649 attributes the static checks to `6061ef7`; the handback commit is `c515173`.

**The substance already exists and you do not need to re-run the campaign.** It is recorded in
`PROGRESS.md` (the 2026-08-03 entry committed at `9a1b5e2`), the reviewer verified every figure in
it, and the raw logs are at **`/tmp/p20b07-c2/`** — that directory and no other. `/tmp/p20b07-campaign`,
`-campaign2` and `-final` are superseded trees; root once read a superseded directory and concluded
ten runs had not happened.

Your §4 must record, **re-derived by you, not copied from this file**: the per-run failure table for
runs 1–10; the single digest triple `head=c515173 digest=0a6703e11a28 files=65a6ba3389ea` shown to be
the only one across all runs; the log path; the per-site failure inventory; and the failing **step
names**. **Count only Playwright's numbered failure blocks (`^  [0-9]+\) \[chromium\]`)** — a bare
grep for the spec path also matches passing `✓` lines and inflates the table. Root made that error
once and caught it; do not repeat it.

**State plainly that the 10-consecutive-green bar was NOT met (11 failures / 10 runs = 1.10 per run,
two green runs), and do not present 1.10 against rev 06's 1.29 and 1.60 as an improvement.** One
campaign does not establish a trend, and rev 07 was right to refuse that claim.

### F-B (MEDIUM) — `tests/e2e/people-settlement.spec.ts:346-348`

Step 9, *"reload and verify allocations and settlement persist"*, asserts
`toContainText("50%")` on the `Edit Bob allocation` button — **the exact substring weakness rev 07
removed from `setAllocation`, left at the one call site whose declared purpose is to prove the
allocation survived a page load.**

The reviewer built the failing state in a real browser and **printed the cell**: with Bob's write
absent it reads `— Explicit: not stored. Effective: 0%. Owner remainder: 50%.` — so **the assertion
passes on a vault where Bob's allocation was never persisted**, matching the *owner remainder* that
exists precisely because the write is missing.

**Fix:** assert the `Explicit:` clause, matching the helper rev 07 hardened —
`toContainText("Explicit: 50%.")`.

**Prove it both directions, and prove it against the real product, not against your model of it.**
The new assertion must **fail** on a vault where Bob's allocation is absent and **pass** where it is
present. `Effective` cannot discriminate — MEASURED at `allocation.ts:259`,
`ownerRemainder = 100 − explicitTotal`, so a person holding an explicit 50 and a person holding
nothing while absorbing a 50% remainder both render `Effective: 50%`. **Print the DOM rather than
reasoning about it**; that is what killed rev 07's substring hypothesis, and reasoning about this
exact cell is what produced the defect you are fixing.

### F-C (MEDIUM) — `.claude/skills/e2e/SKILL.md`

`CLAUDE.md` Critical Rules require `.claude/` files to be updated alongside code changes.
`playwright.config.ts:65` now sets a repo-wide 15 s `expect` timeout where Playwright's default was
5 s, and `grep -rn 'expect.*timeout\|15_000' .claude/` returns nothing.

Add a short note recording: the 15 s `expect` default; that explicit per-assertion timeouts still
override it (the 12 deliberately-short probes are unaffected); and the cost — **115 `toHaveCount(0)`
absence assertions carry no explicit timeout**, so a genuinely failing one now costs 15 s instead of
5 s, and two in one test can exhaust the 30 s test budget.

## Authorized paths — nothing else

- `tests/e2e/people-settlement.spec.ts` (F-B only)
- `.claude/skills/e2e/SKILL.md` (F-C only)
- your one evidence file: `evidence/P20B/implementation-09.md` — **the filename runs one ahead of the
  revision number; that is the known P20B evidence skew, not an error.** Write it, do **not** commit
  it: root persists it with the verdict per `PROCESS.md:58`.

**No product code.** `src/` must be untouched. Do not edit ledgers, QUESTIONS, FINAL-AUDIT, the
scratch file, task contracts, review files, or any other agent's evidence.

## Hand back only after every artifact you cite exists — this is F-A's own lesson

**Q-P20B-27, applied to you immediately.** Rev 07's evidence was frozen at 10:17:27, inside run 1 of
a campaign that ended at 10:59:09. **Do not hand back with a placeholder token, a forward reference
to a section you have not written, or a "FINAL tree" line contradicted elsewhere in your own file.**
Root will bounce a handback whose evidence contains an unfilled placeholder or a dangling
cross-reference — it did so twice to the rev 07 reviewer, for exactly this.

## What is NOT yours, and must not be pulled in

**The residual settlement failure class and F-2 are OUT OF SCOPE and deliberately UNOWNED**
(`Q-P20B-26`). Rev 06 routed the settlement class here as a test-instrument defect; **rev 07's
reviewer refuted that diagnosis structurally** — `settlement-view.ts:186-193` returns `settled` only
when `obligations.length === 0` **and** `qualifyingTransactionCount !== 0`, a counter incremented at
`settlement.ts:1227` **after** `commitCalculation`, so a page reading "Everyone is settled up" has
**already hydrated and run the settlement engine**. It is a terminal answer, not a transient, and no
timeout can fix it.

**Two consecutive revisions have now fixed real instrument defects and failed to close this class.**
Root is measuring the mechanism separately before any ownership ruling. **Do not chase it, do not
widen scope to it, and do not report a green campaign as evidence about it.** Your F-B change may
well make a failure in that class report at a more precise line — that is localisation, not a fix,
and you must not describe it as one.

## Validation expected of you

Focused: `pnpm typecheck`, `pnpm lint`, and `pnpm test` are cheap and should be green. Scope any
`oxfmt` run to your own files — a bare `pnpm format` rewrites `specs/**` including the frozen
`specs/human-scratch.md` (`Q-P20B-25`).

For F-B, run `people-settlement.spec.ts` with `--retries=0` and enough repeats to show your change
does not itself destabilise the journey. **You are NOT required to produce a green full-suite
campaign, and you must not claim one closes the residual class.** Report what you ran and what it
showed, including failures in the residual class if they occur — they are expected at ~1.1 per
full-suite run and are not yours.

## Hard constraints

- **NEVER `pnpm db:reset` or any destructive database command.** The local Supabase holds ~30,587
  real vaults shared with the human's dev server.
- **NEVER touch port `:3001`** — the human's dev server. `:3000` is yours. Use `env -u CI`; never
  `--debug`, `--ui`, `--headed`, or `show`.
- **Never a bare `pkill -f`** — it matches your own shell, exits 144 and leaves the target running.
  Resolve `readlink /proc/<pid>/cwd`, kill by pid, verify by state not exit code.
- If you make a worktree, **copy the untracked `.env.local` in** — `git worktree add` does not, and
  without it every journey fails identically at `createNewIdentity`, an environment failure that
  impersonates a total product break. **Do not `cp -a node_modules`**: it carries a stale
  `.vite/vitest/results.json` that has reported passes for a run that actually failed.
- **Shared checkout.** Other agents are working in it. Never `git stash`, never `git checkout --`,
  never `git add -A` — commit by listing the exact files you authored.
