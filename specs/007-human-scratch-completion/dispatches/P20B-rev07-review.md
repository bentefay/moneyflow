# P20B rev 07 review — E2E stability fix — DRAFT (hold until the campaign closes)

**Reviewer:** `p20b-reviewer-07` — MUST be distinct from `p20b-implementer-07` and from
`p20b-reviewer-01`, `-02`, `-03`, `-06`.

**BASE:** `c15be12`. **SUBJECT:** the handback commit — re-derive with `git rev-parse` at dispatch
time and run `git merge-base --is-ancestor <subject> HEAD` before reading a line of diff. **Root has
stated a wrong BASE twice in this goal**, both times caught by the reviewer it was handed to.

**Scope: three files, +30 −2.** `playwright.config.ts`, `tests/e2e/helpers/nav.ts`,
`tests/e2e/helpers/settlement.ts`. **No product code.** Two commits: `6061ef7` (timeout budget +
barrier hardening) and `c515173` (barrier zero-case correction).

## Why this revision exists

The **P21 rev 06 final audit FAILED** on the E2E stability clause (`reviews/P21-review-06.md`).
Class 1 — nine settlement failures — was routed here as a test-instrument defect. **This revision is
that fix.**

## What the implementer claims, and what it explicitly does NOT claim

**Claims, each with a control:**

- **The 5s `expect` default was real and is closed.** `playwright.config.ts` had **no `expect` block
  at all**, so its `timeout: 30000` never reached assertions. Proven both directions: a probe on a
  non-existent element reports **15006ms with the fix and 5005ms with the block deleted**.
- **The allocation barrier was weak and is now strong.** `settlement.ts` asserted
  `toContainText("${value}%")` — a substring over a button whose `sr-only` child contains
  `Effective: N%` and `Owner remainder: M%`. It now asserts the `Explicit:` clause. Red-then-green
  proven: with a write deliberately dropped, the barrier fails **at its own line**.

**Does NOT claim — and you must not let the evidence drift into claiming it:** that either fix
explains the observed failures. **The implementer killed its own substring hypothesis** by printing
the DOM instead of reasoning about it — the string the theory required does not exist pre-commit, so
the old barrier could not have passed early in **any** of the three failures it examined.

## Press hardest on these

1. **The zero-case correction (`c515173`) and the regression it fixed.** The first barrier asserted
   `Explicit: 0%.` — **a string the product can never render.** `allocations.ts` documents it:
   _"Zero means removal at the CRDT boundary, so prepareAllocationReplacement omits it."_ Writing 0
   **clears** the allocation. That regression failed `people-settlement.spec.ts:281` step 11 in **10
   of 10 runs** — deterministic, where every other failure rotates. **Verify the corrected barrier
   still discriminates for zero**: a dropped zero-write must fail at the barrier, not later.
2. **`Effective` is not a state field.** MEASURED: `allocation.ts:259` is
   `ownerRemainder = 100 − explicitTotal`. A person holding an explicit 50 and a person holding
   nothing while absorbing a 50% remainder both render `Effective: 50%`. **`Owner remainder`
   discriminates; `Effective` cannot.** Any assertion reading `Effective` is ambiguous by
   construction — check none remain.
3. **Whether the campaign's tree is reproducible.** An earlier attempt ran with the fix
   **uncommitted in the shared main checkout**, so no commit contained the validated tree; root
   caught it and required a restart. **Confirm every run's `head=`/`digest=`/`files=` line is
   identical and names a real commit.**
4. **The `next-env.d.ts` digest exclusion.** Next rewrites it on every dev-server start, which moved
   a digest mid-campaign and forced an abort. The campaign excludes that generated path **and
   additionally hashes the files under test directly**. **Verify the exclusion cannot hide a real
   edit.**
5. **The rate comparison, which the implementer explicitly refuses to claim as an improvement.** rev
   06 measured 1.29 and 1.60 failures/run pre-fix; the first rev 07 campaign was 1.90 raw and 0.90
   with its own regression stripped. **One campaign does not establish a trend** — assess whether
   the rerun's number supports anything at all.

## Expected, not findings

- **The 10-run bar will almost certainly NOT be met**, and the implementer reports that plainly. **A
  revision that fixes two real instrument defects, proves neither is the cause, and says so is the
  correct outcome here.** Do not treat an unmet bar as a reason to fail work that is honest about
  it.
- **F-2, the virtualized-grid class, is BLOCKING, UNRESOLVED and deliberately UNOWNED.** Not this
  package's. It produced **zero failures across the previous 10-run campaign**, alongside the rev 06
  reviewer's **450 clean diagnostic executions**. **Neither is a clearance** — status is _rarer than
  1-in-450 at this profile, not shown absent_.
- **A fully green run proves nothing.** Two agents have independently produced one on a tree known
  to fail — the rev 06 reviewer's run 4 (195/195) and this implementer's run 2. **That is why the
  bar is 10 and not 3.**

## Instrument hazards, all measured in this goal

- **`git worktree add` does not copy untracked `.env.local`.** Every journey then fails identically
  at `createNewIdentity`. **Single-signal tell: if every test fails at the same helper before any
  product code runs, it is the environment.**
- **`cp -a node_modules` carries `node_modules/.vite/vitest/results.json`**, which has reported
  passes for a run that actually failed.
- **`duplicates.test.ts` "performance scales linearly" is a wall-clock ratio assertion** — it fails
  under CPU load. Do not run unit tests beside a campaign and trust the result.
- **Never a bare `pkill -f`** — it matches your own shell, exits 144, leaves the target running.
  Three agents hit this. Resolve `readlink /proc/<pid>/cwd`, kill by pid, **verify by state not exit
  code**.
- **`ss -ltn` for port questions.** A process scan searches a table containing the searcher. **The
  human's dev server on `:3001` must NEVER be touched.** `env -u CI`; never
  `--debug`/`--ui`/`--headed`/`show`.
- **Name the log path in every report.** Root read a superseded campaign directory and concluded ten
  runs had not happened; the implementer had not named which of four directories was live. **Reading
  the runner's own `/proc/<pid>/fd` settles it when a glob does not.**

## Method note

**Six instrument failures were self-reported across the rev 06 collection and review, and more in
this revision.** Four of one set pointed the convenient way and one would have produced a false
blocking FAIL — **which is why the direction an answer points is no guide to the health of the
instrument that produced it.** Root's claims have been corrected repeatedly by the agents it
dispatched, including a wrong BASE twice and a wrong reading of which campaign directory was live.
**Re-derive every figure in this dispatch rather than relaying it.** Where a claim is marked
INFERRED treat it as unverified; where unmarked, treat it as inferred.
