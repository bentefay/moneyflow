# P21 rev 06 — final-audit independent review — ACTIVE

**Reviewer:** `p21-reviewer-06` — MUST be distinct from `p21-collector-06` and from every prior P21
agent (`p21-collector-01`–`05`, `p21-reviewer-01`–`05`).

## BASE / HEAD reconciliation — read this before the ancestry check

**The collector's BASE is `5260c152e7cf92359d7db41e4505404cfe088e16`. HEAD is
`234e1e4391e1c3535c09ca5f3301193e29b9b935`.** The contract expects `BASE == HEAD`, and a literal
hash comparison **will fail**. Root reconciles it here rather than re-baselining:

```
234e1e4  docs: correct the stale current-position tally in PROGRESS.md   1 file, +11 -4
git diff 5260c15 234e1e4 -- src tests supabase package.json pnpm-lock.yaml   EMPTY
```

**One root-only documentation commit, acting on the collector's own D-1 finding that PROGRESS.md's
header prose had decayed behind its row tables.** `PROCESS.md` permits root artifact commits after
dispatch provided their paths and commit are recorded separately — this is that record.

**The collector deliberately did NOT re-baseline its evidence**, because its campaign ran from a
worktree pinned `--detach` at `5260c15` with one unchanged digest across all seven runs. **Its gates
are evidence for that tree.** Re-baselining would have made the artifact describe a tree it never
measured. **Verify the empty diff yourself; do not take it from this file.**

## Your job

Independently **re-run** the complete audit contract in `tasks/P21-final-audit.md` — not read the
collector's evidence and agree with it. Empty diff is never automatic approval. Give a single
unconditional **PASS** or **FAIL**.

Root owns `FINAL-AUDIT.md` and fills it **only** after your PASS. Write your artifact to exactly
`reviews/P21-review-06.md` and **do not commit it**.

## What the collector reports

**Evidence:** `evidence/P21/implementation-06.md`, 1,437 lines, uncommitted (correct per
`PROCESS.md:58`). It proposes **no verdict** and gives per-clause results in its §14 for you to
re-run.

**Passing, per the collector:** typecheck/lint/build exit 0; 2,481 unit/property/integration tests;
`pnpm audit --prod` exit 0; all 34 requirement rows and every frozen value re-derived; FS-001 proven
never edited via `git log --follow` showing one commit; cross-vault denied at the grant layer before
RLS, with a control proving 112,475 real rows exist; zero plaintext in storage; 16 canonical A–H
gates named separately; sole settlement engine with BigInt-oracle conservation; P16C complete-set
API on every path; M-1 remediated with no replacement false claim.

**Failing, same clause as rev 04:** **no run of 7 was fully green.** 1,354 / 1,365 executions
(99.19%).

## The E2E failures — TWO CLASSES, and the collector's warning is the thing to honour

**Class 1 — settlement, 9 failures, MECHANISM MEASURED.** `expectObligation`
(`tests/e2e/helpers/settlement.ts:394`) uses a **bare `toBeVisible()`** — Playwright's 5s default.
That helper has **9 bare assertions and 0 with an explicit timeout**. `playwright.config.ts:62` sets
`timeout: 30000` but **no `expect.timeout`**. `goToPeople` (`tests/e2e/helpers/nav.ts:43`) waits
only for the page **heading** at 15s; the heading renders **before CRDT hydration**, and until
hydration the view is `no-qualifying-transactions`, so the currency section genuinely does not exist
yet.

**Discriminating evidence: bimodal timing — passes 4.4–6.3s, failures 10.2–10.6s, exactly one
exhausted 5s window** — and every failing test **passed in another run on the identical digest**.
Membership rotates (`:197` ×4, `:166` ×3, `:596`/`:281` ×1). **Test-instrument defect, owner P20B,
Q-P21-06-03.** This is the first mechanism produced for a rotation that defeated five prior
hypotheses.

**Class 2 — the virtualized grid, 2 failures, NOT CLASSIFIED. Do not absorb these into Class 1.**

```
:572  target data-index 51    2 PAGE_SIZE expansions   symptom: row PRESENT at index 50
:726  target data-index 499  10 PAGE_SIZE expansions   symptom: row count 0 after 10s
```

**Neither is a timeout on a correct value.** `:572` is a **stable wrong value** — all 14 polls
returned 50, so waiting longer cannot help. `:726` is a row that **never appeared**, which is
unambiguously about paging progress rather than ordering. Both target a row past the
`PAGE_SIZE = 50` boundary (`src/app/(app)/transactions/page.tsx:92`); `handleLoadMore` (`:400-401`)
adds one `PAGE_SIZE` per invocation, so `:726` needs ten sequential state updates.

**INFERRED, not established:** a window where the row is rendered before `displayCount` extends
(`requiredDisplayCount` at `:320`). The collector explicitly did **not** reproduce these in
isolation and did **not** run a discriminating experiment — the port was held by its own campaign.

**Whether these are test-instrument defects or REAL PRODUCT defects is unsettled, and the fact that
Class 1 turned out to be test-side is not evidence about Class 2.** They land on the
reveal-and-focus and virtualized-scroll paths, so a product defect there would be user-visible, and
they bear directly on the audit clause **"Large imports/tables remain responsive and bounded."**
**Reproduce them in isolation and classify them. That is the single highest-value thing you can
do.**

## Three clauses the collector did NOT discharge — they are yours to rule on

1. **Fresh DB bootstrap (Q-P21-06-04).** The only faithful test is `pnpm db:reset`, which **drops
   and recreates** the local Supabase holding **30,587 vaults / 112,475 vault_ops**, shared with
   other agents and with the human's own dev server on `:3001`. **Root DECLINED to authorise it** —
   it is destructive, irreversible, and outside anything the frozen text requires; that is the
   principal's call, not a coordinator's. The collector measured by proxy (all 6 migrations recorded
   applied in order) and stated the limitation. **Do not run it either.** Rule on whether the proxy
   discharges the clause.
2. **Complete manual product journey (Q-P21-06-06).** The campaign held `:3000` all session. **The
   port is free now** — this is discharge-able if you take it.
3. **Strict `format:check` reading (Q-P21-06-02).** Exits 1 on 27 files, **all under
   `specs/**`, zero under `src/`or`tests/`**. The collector established the frozen `specs/human-scratch.md`was **already format-dirty at the P00 baseline`0ea864f`**
   — so this is pre-existing and identical in kind to what rev 04 and rev 05 both accepted at 15
   files. **This needs a ruling, not a measurement.\*\*

## Carry-forward Q-proposals the audit must confirm are surfaced

`Q-P20B-00` (`pruneBuckets` CRDT data loss — ruled OUT-OF-GOAL by `D-019`, independently adjudicated
at `f290246`; **still a tracked live risk, not a closed one**), `Q-P20B-13/14`, `Q-P20A-02/05`,
`Q-P17D-02`, `Q-P20B-06/08`, `Q-P21-04-01`, `Q-P21-05-01/02/03`, `Q-PROPOSAL-P32-01-01`,
`Q-PROPOSAL-P30-07-01/02`, and the collector's new `Q-P21-06-01`–`06`.

## Known-open, NOT new findings

- **`InlineEditableTags` Escape handler** bound to a `CommandInput` that has lost focus by the time
  Escape arrives. Pre-existing, measured, ruled out of UR-009 scope.
- **Settlement rotation** — a green settlement result carries **no** information (a fully clean
  19/19 has been observed); for 5 of 19 tests the ID does not identify the failing assertion. **Read
  the failing step name from Playwright's failure header.**

## Instrument hazards, all measured in this goal

- **`git worktree add` does not copy untracked `.env.local`.** Without it every journey fails
  identically at `createNewIdentity`. **The tell needs no second signal: if every test fails at the
  same helper before any product code runs, it is the environment.**
- **`cp -a node_modules` carries `node_modules/.vite/vitest/results.json`**, which has reported
  passes for a run that actually failed.
- **`duplicates.test.ts` "performance scales linearly" is a wall-clock ratio assertion** and fails
  under CPU load. The collector hit it during its own campaign (4.09 vs `< 4`), re-ran free at
  43/43, and disclosed it anyway. **Do not run unit tests beside an E2E campaign and then trust the
  result.**
- **Never a bare `pkill -f`** — it matches your own shell, exits 144, leaves the target running.
  Three agents hit this. Resolve `readlink /proc/<pid>/cwd`, kill by pid, **verify by state not exit
  code**.
- **`ss -ltn` for port questions**; a process scan searches a table containing the searcher. **The
  human's dev server on `:3001` must NEVER be touched.** `env -u CI`; never
  `--debug`/`--ui`/`--headed`/`show`.

**Campaign logs are preserved at `/tmp/p21c06-e2e/run{1..7}.log`** with a summary and digest.

## Method note

The collector reported **four of its own instrument failures** rather than quietly correcting them:
a bare-postgres migration probe that could never have succeeded, a question-status grep matching the
wrong convention, a carry-forward search scoped to the wrong files that nearly produced a false
"missing evidence" BLOCKER, and the CPU-loaded unit test. **Each returned a conclusion-shaped answer
without erroring.** That is the dominant failure shape in this goal — including in root's own work,
which agents have corrected repeatedly. **Re-derive every figure in this dispatch rather than
relaying it.** Where a claim is marked INFERRED treat it as unverified; where unmarked, treat it as
inferred.
