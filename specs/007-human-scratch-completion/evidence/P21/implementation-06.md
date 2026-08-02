# P21 rev 06 — Executable Final Audit — Collector Evidence

- **Agent:** `p21-collector-06` (distinct from `p21-collector-01..05`, `p21-reviewer-01..05`)
- **BASE:** `5260c152e7cf92359d7db41e4505404cfe088e16` — re-derived with `git rev-parse HEAD`, not
  carried from any document
- **Branch:** `main`; **upstream:** `origin/main`; **remote:**
  `git@github.com:bentefay/moneyflow.git`
- **Date:** 2026-08-03
- **Role:** evidence collector only. Wrote exactly one file (this one). Committed nothing. Did not
  edit `FINAL-AUDIT.md`, any ledger, any product file, any test, or any other spec file.

## 0. How to read this document

Every claim is tagged **MEASURED** (I ran the command in this session and the output is reproduced
below) or **INFERRED** (derived by reading code/artifacts without executing a discriminating test).
Per the dispatch's method note, no figure from `PROGRESS.md`, `HANDOFF.md`, or the dispatch is
relayed — each was re-derived. Where an instrument of mine failed, I say so and classify it as a
failed instrument rather than a product finding.

---

## 1. Entry condition — re-verified before starting

The dispatch requires the collector to re-verify the entry condition and stop if any requirement row
is not `passed`.

**MEASURED — requirement ledger (`PROGRESS.md` §"Requirement ledger", the row table):** all **34**
rows show `passed`:

| Family        | Rows                      | Count  | All `passed`? |
| ------------- | ------------------------- | ------ | ------------- |
| `HS-001..021` | 21 human-scratch blocks   | 21     | yes           |
| `FS-001`      | immutable whole-file spec | 1      | yes           |
| `UR-001..012` | frozen spec sections      | 12     | yes           |
| **Total**     |                           | **34** | **yes**       |

**MEASURED — package ledger:** `P21` is the only package row not `passed` (status `collecting`).
P00–P20B and P22–P33 all read `passed`.

### 1.1 Finding D-1 (documentation, non-blocking): the ledger PROSE contradicts the ledger TABLES

**MEASURED.** `PROGRESS.md` "Current position" prose (lines 26–38) still says:

```
**Tally: 28 of 34 requirements `passed`** ... **27 of 33 feature packages `passed`**
(P22-P27 PASSED; P28-P33 `queued`)
```

The row tables say all 34 requirements and P22–P33 are `passed`. The tables are authoritative by the
ledger's own definition ("This ledger is requirement-level state"), and the package rows for P28–P33
carry `passed` with revision numbers. I treated the **tables** as authoritative and the prose as
stale narrative that was not updated when P28–P33 landed.

This is a **documentation-consistency finding, not a state finding** — no requirement or package is
actually in a non-passed state. I raise it as **Q-P21-06-01** because the audit contract requires
"QUESTIONS and DECISIONS are internally consistent and summarized for final human review," and a
reader of the prose would reach the opposite conclusion about goal state from a reader of the
tables. Root owns the fix; I did not edit the ledger.

**RESOLVED during collection at `234e1e4`** — see §2B. Root superseded the stale prose in place,
preserving what it said, what is measured now, and who found it.

#### 1.1a A second occurrence that is CORRECT and must NOT be "fixed" — MEASURED

A reviewer sweeping for the string will find **two** hits, and only one was ever wrong:

```
$ grep -n "28 of 34" specs/007-human-scratch-completion/PROGRESS.md
30:    "28 of 34 requirements passed" and "27 of 33 feature packages passed (P22-P27 …
7678:   **P27 -> `passed`; UR-006 -> `passed`. Tally: 28 of 34 requirements, 27 of 33 …**
```

- **Line 30** is root's own `[SUPERSEDED 2026-08-03 …]` marker **quoting** the corrected text. Not a
  live claim.
- **Line 7678 is inside the dated `2026-08-02 — P27` event entry and was ACCURATE at that moment.**
  P28–P33 had not yet passed when it was written.

**Rewriting history entries to match the present would destroy the record the ledger exists to
keep**, and the ledger's own header says so: "Do not infer completion from old specs, commits, or
scratch checkmarks without linked independent review evidence." An event log is a record of what was
true when written, not a view of current state — the two must not be conflated. **Treat the `:7678`
hit as correct-in-context; the only defect was the "Current position" summary, and it is fixed.**

This is the same class of decay the ledger records against its own authors: a conclusion true when
written and falsified by later commits. The fix is to supersede with a delta, not to overwrite.

---

## 2. Frozen-source and canary re-derivation

All four values root reported were re-derived independently. **All four match.**

**MEASURED:**

```
$ sha256sum specs/human-scratch.md
469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a  specs/human-scratch.md

$ wc -l -c specs/human-scratch.md
  350 24260 specs/human-scratch.md

$ grep -c '^- \[x\]' specs/human-scratch.md   -> 43
$ grep -c '^- \[\]'  specs/human-scratch.md   -> 0
$ grep -c '^- \[ \]' specs/human-scratch.md   -> 0

$ sha256sum specs/008-transaction-percentage-allocations-settlement/spec.md
0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c  .../spec.md

$ wc -l -c specs/008-.../spec.md
  715 25441 specs/008-.../spec.md

$ grep -c "per purpose" specs/007-human-scratch-completion/PROGRESS.md -> 1
```

| Value                          | Root reported    | I measured   | Match |
| ------------------------------ | ---------------- | ------------ | ----- |
| scratch SHA-256                | `469e98c7…d2f6a` | identical    | yes   |
| scratch checked/unchecked      | 43 / 0           | 43 / 0       | yes   |
| scratch = rolling PROGRESS SHA | `469e98c7…`      | identical    | yes   |
| FS-001 SHA-256                 | `0d0e2a14…09cfc` | identical    | yes   |
| FS-001 lines / bytes           | 715 / 25,441     | 715 / 25,441 | yes   |
| canary                         | 1                | 1            | yes   |

**FS-001 was never edited — MEASURED, and stronger than a checksum:**

```
$ git log --oneline --follow -- specs/008-transaction-percentage-allocations-settlement/spec.md
0ea864f Add durable implementation orchestration scaffold
```

Exactly **one** commit in the file's entire history — the commit that introduced it. There is no
commit in which it could have been edited to record progress. This satisfies the FINAL-AUDIT clause
"it was never edited to record progress" by construction, not merely by end-state hash.

---

## 2A. Scope reconciliation — ordering and terminal state

**MEASURED — alias P11A–C and automation P17A–D all passed BEFORE their scratch checkboxes**, proven
by commit timestamps rather than by ledger prose:

| Set                  | Last package PASS                      | Marker applied                                                   | Ordering                         |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| HS-004 (aliases)     | P11C `78e2f97` 2026-07-22 **15:35:15** | `0a9b882` "docs: complete HS-004 marker" 2026-07-22 **15:37:42** | marker **2m27s after** — correct |
| HS-007 (automations) | P17D `c434da2` 2026-07-27 **09:01:51** | `41c6c81` "apply HS-007 forward marker" 2026-07-27 **09:10:12**  | marker **8m21s after** — correct |

P11A `959833a` (07-20 20:53) and P11B `0426866` (07-20 22:19) both precede P11C; P17A `81401bf`
(05:07), P17B `cef9f2b` (06:06), P17C `ea2ad75` (07:26) all precede P17D.

**MEASURED — P16A–E all passed with revisioned evidence/reviews before FS-001 completed:**

```
41f5760  2026-07-25 08:41:06  P16A revision 02
136678a  2026-07-25 14:23:08  P16B revision 05
e0f06f7  2026-07-25 16:51:32  P16C revision 02
47867d5  2026-07-25 19:21:50  P16D revision 01
b0023f6  2026-07-27 02:50:06  P16E rev-02 PASS review
a09c4b4  2026-07-27 02:55:08  control commit - P16E passed and FS-001 completed
```

FS-001 completion (02:55:08) follows the last P16 package PASS (02:50:06) by 5 minutes, and was
recorded in the **ledger only** — consistent with §2's proof that the spec file has one commit in
its entire history.

**MEASURED — terminal state is clean.** Parsing the status column of both row tables:

- Package table: the **only** row not `passed` is `P21` (`collecting`, this audit).
- Requirement table: **zero** rows not `passed`.
- `Active P21 rollback batch:` **none** (RB-P21-05 completed + cleared).
- `Active completion marker event:` **none pending** (HS-016 §275 forward marker completed).
- No `rollback_pending` requirement and no `completion_pending` event remains.

**MEASURED — `BASE == HEAD`; no approved range changed.** `git rev-parse HEAD` at the start and end
of my collection both return `5260c152e7cf92359d7db41e4505404cfe088e16`, and the recorded tree
digest was identical across every campaign run. The empty diff is expected per the contract and is
**not** treated as automatic approval.

---

## 2B. Mid-audit drift — CLASSIFIED, not unclassified

**MEASURED.** During collection, HEAD moved:

```
BASE  5260c152e7cf92359d7db41e4505404cfe088e16
HEAD  234e1e4391e1c3535c09ca5f3301193e29b9b935
$ git log --oneline BASE..HEAD
234e1e4 docs: correct the stale current-position tally in PROGRESS.md
$ git diff --name-only BASE..HEAD
specs/007-human-scratch-completion/PROGRESS.md      # 1 file, +11 -4
```

This is root acting on my §1.1 finding D-1 / `Q-P21-06-01`. The commit replaces the stale "28 of 34
requirements" prose with the measured state and **preserves the superseded text** under a
`[SUPERSEDED 2026-08-03 …]` marker rather than erasing it.

**Classification — this drift is DOCUMENTATION-ONLY and does not invalidate any measurement:**

```
$ git diff --stat BASE..HEAD -- src tests supabase package.json pnpm-lock.yaml
(empty; exit 0)
```

The product tree, test tree, migrations and lockfile are **byte-identical** between BASE and HEAD.
All frozen values re-derived at the NEW HEAD are unchanged: scratch `469e98c7…` / 350 lines / 24,260
bytes / 43 checked / 0 unchecked; FS-001 `0d0e2a14…` / 715 lines / 25,441 bytes; canary = 1.

**Consequence for the E2E campaign:** none. The campaign runs in a worktree pinned to BASE
(`git worktree add --detach … 5260c15`), and the per-run tree digest was identical across every run.
The campaign is evidence for the exact product tree that both BASE and HEAD contain.

**What root and the reviewer must decide:** the contract says "Expected range: `BASE == HEAD`; a
non-empty range requires **root reconciliation** before review", and the reviewer is dispatched only
after root re-confirms HEAD equals BASE. That reconfirmation will now fail on a literal hash
comparison. I am flagging this rather than quietly re-baselining: **root must either reconcile this
one documentation commit explicitly, or re-dispatch the reviewer against the new HEAD.** I did not
make that call and I did not amend my BASE.

---

## 3. Repository provenance

**MEASURED:**

- **Final HEAD:** `5260c152e7cf92359d7db41e4505404cfe088e16` (unchanged from BASE; `BASE == HEAD`)
- **Branch:** `main`, **upstream:** `origin/main`
- **Dirty tracked paths:** exactly one — `.claude/agent-memory/reviewer/MEMORY.md` (modified)
- **Untracked paths:** 36 files, all under `.claude/agent-memory/` (agent memory notes written by
  concurrent agents in this shared checkout)

**No unrelated/user-owned file was committed — MEASURED:**

```
$ git ls-files | grep -E "^\.env"
.env.local.example
.envrc
```

`.env.local` itself is untracked (correct — it holds local secrets). The principal's real financial
data was never committed:

```
$ git log --all --oneline --name-only | grep -iE "CSVData|OFXData"
(no output)
```

**Note on tree state:** the dirty/untracked paths are entirely `.claude/agent-memory/**` — agent
scratch notes, not product, tests, specs, or ledgers. No `src/`, `tests/`, or `specs/` path is
dirty. Two files that were untracked at my session start (`evidence/P08/implementation-01.md`,
`reviews/P21-review-05.md`) are now committed (`f3d895d`, `7cb651d`), which resolves the "inert
anomaly" noted in PROGRESS.md.

**Artifact slot free — MEASURED:** `evidence/P21/` contains `implementation-01..05.md`; my
dispatched path `implementation-06.md` did not previously exist. `reviews/` contains
`P21-review-01..05.md` plus `P21-scope-adjudication-05.md`; `P21-review-06.md` is free for the
reviewer.

---

## 4. Verification gates

All run at BASE in the primary checkout unless noted.

| Gate                      | Command             | Exit  | Result                                                     |
| ------------------------- | ------------------- | ----- | ---------------------------------------------------------- |
| Typecheck                 | `pnpm typecheck`    | **0** | PASS — `tsc --noEmit`, 2.9s                                |
| Lint                      | `pnpm lint`         | **0** | PASS — 1 problem: **0 errors, 1 warning**, 11.5s           |
| Format                    | `pnpm format:check` | **1** | see §4.1                                                   |
| Build                     | `pnpm build`        | **0** | PASS — 17 routes generated, 20.1s                          |
| Unit/property/integration | `pnpm test`         | **0** | PASS — **129 files, 2481 passed, 2 skipped (2483)**, 73.6s |

**MEASURED — the single lint warning** is pre-existing and structural, not a defect:

```
src/components/features/transactions/TransactionTable.tsx:459:25
  warning  Compilation Skipped: Use of incompatible library
  TanStack Virtual's `useVirtualizer()` API returns functions that cannot be memoized safely
  react-hooks/incompatible-library
```

This is React Compiler declining to memoize a component that uses `useVirtualizer` — the same
upstream interaction P03 tracks. 0 errors.

**MEASURED — the 2 skipped unit tests are opt-in benchmarks, not disabled coverage.** A grep for
`.skip(`/`.todo(` across `tests/` and `src/` returns **nothing**; the same grep across `tests/e2e/`
returns nothing. The skips come from `it.runIf(process.env.P16B_BENCHMARK === "1")` and the
equivalent P16C gate — they run when their env var is set (I ran both; see §7). This satisfies "no
unexplained skips."

**MEASURED — the two skips, named exactly** (from a JSON reporter run, not inferred):

```
domain/allocation.test.ts :: signed minor-unit apportionment benchmarks production derivation
                             and apportionment primitives
domain/settlement.test.ts :: production settlement scale benchmarks 100,000 deterministic
                             transactions with complete output
```

### 4.0a One unit failure I caused, and am disclosing

A **second** `pnpm test` that I ran **concurrently with the E2E campaign** reported 1 failure:

```
tests/unit/import/duplicates.test.ts
  "detectDuplicates performance scales linearly with input size (O(n+m) complexity)"
AssertionError: expected 4.092473355625107 to be less than 4      (duplicates.test.ts:749)
```

**This is my scheduling fault, not a code defect, and I verified that rather than assuming it.** The
assertion is a **wall-clock ratio** — `times[1]/times[0]` with a `< 4` threshold whose own comment
says it allows "margin for JIT warmup, GC, etc." I had saturated the CPU with a 4-worker Playwright
campaign, and the ratio came in at 4.09. **Re-run after the campaign ended, on a free CPU: 43/43
passed in 1.65s.** The clean `pnpm test` in the table above (2,481 passed, run before the campaign
started) stands.

I record this because a reviewer scanning my logs would otherwise find a red unit test and have to
work out whether I hid it. It also belongs to the same family as everything else in this report: a
check whose result depends on conditions other than the thing it claims to measure.

**The reusable property, stated for whoever runs these gates next: `pnpm test` is NOT
load-independent.** `duplicates.test.ts:743-749` asserts a **ratio of two `performance.now()`
measurements** against a fixed threshold. Under CPU contention the two samples are perturbed
unequally, so the ratio can exceed 4 while the underlying complexity is unchanged — the code is
still O(n+m). **Do not run `pnpm test` beside a 4-worker Playwright campaign** and, if a red appears
there, re-run it on an idle machine before treating it as a finding. This is a property of the
instrument, not a defect in `detectDuplicates`, and it is not something I would fix from the
collector role.

### 4.1 `format:check` exits 1 — 27 files, ZERO product files, pre-existing

**MEASURED.** All 27 flagged files are under `specs/**`:

| Location                                | Count |
| --------------------------------------- | ----- |
| `specs/007-human-scratch-completion/**` | 26    |
| `specs/human-scratch.md` (FROZEN)       | 1     |
| `src/**`                                | **0** |
| `tests/**`                              | **0** |

**This is pre-existing, and I proved it rather than assuming it — MEASURED.** I extracted
`specs/human-scratch.md` as it existed at the P00 baseline commit `0ea864f` into an isolated
directory and ran oxfmt against it:

```
$ git show 0ea864f:specs/human-scratch.md > /tmp/p21c06-fmt/specs/human-scratch.md
$ cd /tmp/p21c06-fmt && oxfmt --check specs/
specs/human-scratch-CURRENT.md (128ms)
specs/human-scratch.md (123ms)
Format issues found in above 2 files.
```

The frozen scratch file was **already** format-dirty at the baseline, 21,904 bytes, before any
package ran. The bare `oxfmt` command has no ignore file (`.oxfmtignore` does not exist; there is no
oxfmt config) so it sweeps `specs/**` including frozen and root-owned markdown that must not be
reformatted.

**Consistency with prior revisions — MEASURED:** rev 04 recorded "15 files flagged — all under
`specs/**` frozen markdown; zero product/test files … Acceptable per contract" and rev 05 recorded
the same 15 and "Known-acceptable." Both independent reviewers accepted it. The count grew 15 → 27
because P22–P33 authored more spec/evidence documents, not because any product file regressed.

**Clause verdict:** the FINAL-AUDIT clause is "Format, lint, typecheck, and production build pass."
Read strictly on exit code, `format:check` does not exit 0. Read as the prior two independent
reviewers read it — zero product/test offenders, frozen files that must not be reformatted — it
passes. **I am not able to make this call unilaterally; it is a judgement the reviewer and root must
confirm.** I record it as **Q-P21-06-02** and state both readings plainly rather than picking the
convenient one. My own assessment: it is **not** a new defect and **not** a regression, and
reformatting the frozen scratch file would be a scope violation that changes its SHA and breaks the
rolling-checksum chain.

---

## 5. E2E — full suite, retries disabled, repeated for flake exposure

### 5.1 Environment — and one failed instrument, reported

**MEASURED.** The first E2E attempt in the primary checkout failed instantly:

```
[WebServer] ⨯ Another next dev server is already running.
[WebServer] - Local: http://localhost:3001   - PID: 818182
Error: Process from config.webServer was not able to start. Exit code: 1
```

`ss -ltn` showed **:3000 free**, :3001 held. `cat .next/dev/lock` → `{"pid":818182,"port":3001,…}`,
and `ps -o etime -p 818182` → **3 days 09:22** uptime. This is the human principal's own dev server.
Next 16's dev lock is keyed on the project directory, not the port, so any `next dev` in this
checkout blocks E2E even with the target port free. **I did not kill it, did not edit
`.next/dev/lock`, and did not touch `playwright.config.ts`.**

**Isolation used instead — MEASURED:**

```
$ git worktree add --detach /tmp/mf-p21c06 5260c152e7cf92359d7db41e4505404cfe088e16
$ git -C /tmp/mf-p21c06 rev-parse HEAD
5260c152e7cf92359d7db41e4505404cfe088e16      # exactly BASE
$ cp .env.local /tmp/mf-p21c06/.env.local     # the recorded worktree hazard
$ pnpm install --frozen-lockfile              # a REAL install, exit 0
```

I copied `.env.local` per the recorded E2E WORKTREE HAZARD, and I ran a real
`pnpm install --frozen-lockfile` rather than `cp -a node_modules`, which would have carried
`node_modules/.vite/vitest/results.json` and could report passes for a run that failed. No journey
failed at `createNewIdentity`, so the environment signature the hazard note describes is absent.

**Port discipline:** :3000 claimed and announced to root before use; :3001 never touched;
`env -u CI` on every run (so 4 workers / `retries=0`, not CI's 1 worker / 2 retries); no `--debug`,
`--ui`, `--headed`, or `show`; no `pkill`.

### 5.2 Campaign results

Suite inventory **MEASURED**: 24 spec files, **195 `test(` declarations**.

Tree digest recorded per run and **identical across every run** (`5260c152…-d41d8cd9`), so the
campaign is evidence for one unchanged tree.

| Run | Passed | Failed | Failing test                                        | Failing STEP NAME (from Playwright's header)                                |
| --- | ------ | ------ | --------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | 193    | 2      | `people-settlement.spec.ts:197` (canonical E)       | first `expectObligation`, spec `:212`                                       |
| 1   |        |        | `people-settlement.spec.ts:596` (deleted person)    | first `expectObligation`, spec `:613`                                       |
| 2   | 194    | 1      | `people-settlement.spec.ts:281` (mandatory journey) | **`6. verify Bob owes Me $50 on People`**                                   |
| 3   | 194    | 1      | `people-settlement.spec.ts:166` (canonical D)       | first `expectObligation`, spec `:183`                                       |
| 4   | 194    | 1      | `people-settlement.spec.ts:197` (canonical E)       | first `expectObligation`, spec `:212`                                       |
| 5   | 192    | 3      | `people-settlement.spec.ts:166`, `:197`             | first `expectObligation`                                                    |
| 5   |        |        | **`transactions.spec.ts:572`** — a DIFFERENT class  | **`clear an excluding filter and focus the canonical row`** — see §5.4      |
| 6   | 194    | 1      | `people-settlement.spec.ts:197` (canonical E)       | first `expectObligation`, spec `:212`                                       |
| 7   | 193    | 2      | `people-settlement.spec.ts:166` (canonical D)       | first `expectObligation`, spec `:183`                                       |
| 7   |        |        | **`transactions.spec.ts:726`** — grid, see §5.4     | **`rapidly reach the overscan edge with bounded DOM and measured latency`** |

**CAMPAIGN COMPLETE** — 7 runs, `--retries=0`, 4 workers, `env -u CI`, one unchanged tree digest
(`5260c152…-d41d8cd9`), 2026-08-03 03:19 → 03:52.

**Totals: 1,354 of 1,365 test executions passed (99.19%). No run was fully green.** Eleven failures:
**9 settlement eager-assert** (§5.3) and **2 on the virtualized transaction grid** (§5.4).

**MEASURED — the complete failure distribution across all 7 runs:**

```
run1  people-settlement.spec.ts:197        run5  people-settlement.spec.ts:197
run1  people-settlement.spec.ts:596        run5  transactions.spec.ts:572      <- grid
run2  people-settlement.spec.ts:281        run6  people-settlement.spec.ts:197
run3  people-settlement.spec.ts:166        run7  people-settlement.spec.ts:166
run4  people-settlement.spec.ts:197        run7  transactions.spec.ts:726      <- grid
run5  people-settlement.spec.ts:166
```

The settlement failures **rotate** — `:197` 4x, `:166` 3x, `:596` and `:281` 1x each — and every one
of those four tests **passed in the majority of runs**. That is the signature of a shared
load-dependent helper, not one defective test, and it matches the rotation PROGRESS.md records. It
is also why a single green settlement run carries no information.

Four distinct settlement tests failed at least once, and each of them **passed in the majority of
runs**. That is the signature of a shared load-dependent helper, not of one defective test — and it
is consistent with the rotation PROGRESS.md records. It is also why a single green settlement run
carries no information.

The rev-04 blockers (`import.spec.ts:1512`, `identity.spec.ts:282`) did **not** recur in any run.

### 5.3 The settlement failures are one class, with a measured mechanism

**MEASURED — every settlement failure across all runs is the same assertion at the same source
line**, and none are outside `people-settlement.spec.ts`:

```
Error: expect(locator).toBeVisible() failed
  Locator: getByTestId('settlement-currency-section-USD')
  Expected: visible
  Timeout: 5000ms
  Error: element(s) not found
    at expectObligation (tests/e2e/helpers/settlement.ts:394:27)
```

**The mechanism — MEASURED from source, not inferred from correlation.**

`tests/e2e/helpers/settlement.ts:394`:

```ts
const section = currencySection(page, options.currencyCode);
await expect(section).toBeVisible(); // BARE — Playwright default 5s
```

`tests/e2e/helpers/nav.ts:41`:

```ts
export async function goToPeople(page: Page): Promise<void> {
    await page.goto("/people");
    await page.getByRole("heading", { name: "People", level: 1 }).waitFor({ timeout: 15000 });
}
```

`goToPeople` waits only for the page **heading**, at 15s. The heading renders as soon as the route
mounts — **before** CRDT hydration delivers transactions. Until hydration completes,
`buildSettlementView` returns `{ kind: "no-qualifying-transactions" }`
(`src/components/features/people/settlement-view.ts:190`), which renders a _different_ element; the
`settlement-currency-section-USD` testid does not exist yet. The assertion that follows then has
only **5s** — the Playwright default — to catch up. Under 4-worker load, hydration can exceed 5s.

**The chain, stated as a sequence, because the last link decides the routing:**

1. `goToPeople` awaits `page.goto("/people")`, then waits for the **`People` h1 at 15s**.
2. The heading is static route chrome — it renders **before** CRDT hydration delivers transactions.
3. Until hydration lands, `result.qualifyingTransactionCount === 0`, so `buildSettlementView`
   returns `{ kind: "no-qualifying-transactions" }` (`settlement-view.ts:187-192`) and the page
   renders a **different element**. `settlement-currency-section-USD` **genuinely does not exist
   yet** — this is correct product behaviour, not a rendering bug.
4. `expectObligation` then asserts that testid with a **bare 5s** `toBeVisible`, racing hydration.
5. Win the race → pass in 4.4–6.3s. Lose it → fail at 10.2–10.6s.

**Step 3 is why this is a test-instrument defect and not a product defect.** The product is not
showing a wrong value or failing to render; it is correctly showing the empty state for a vault
whose transactions have not arrived, and the test asserts against the post-hydration state without
waiting for hydration. **That distinction decides whether this routes as a product regression or a
test-stability fix — I state it explicitly rather than leaving it implied, but the routing call is
the reviewer's and root's, not mine.**

Two further independent details corroborate this and were checked separately:

1. **The contrast is internal to the same file.** `goToAutomations` (`nav.ts:46-51`) waits for the
   heading **and** a content element (`new-rule-btn`) at 15s, with the comment "The field-rule
   manager only renders once a vault is selected." `goToPeople` has no equivalent content wait.
2. **The cohort is bounded and countable — MEASURED:** `tests/e2e/helpers/settlement.ts` contains
   **9** bare `toBeVisible()` calls (lines 39, 62, 92, 120, 394, 401, 416, 422, 432), all on the 5s
   default, while `tests/e2e/helpers/auth.ts:113` uses an explicit `{ timeout: 15_000 }` for a
   comparable hydration-dependent wait. The settlement helper is the outlier.

3. **The config leaves the assertion far less headroom than the test — MEASURED.**
   `playwright.config.ts:62` sets `timeout: 30000` (per-test) but sets **no `expect.timeout`**, so
   assertions fall back to Playwright's 5s default. Every failure header in this campaign reports
   `Timeout: 5000ms`, confirming the default is in force. The test has 30s (and these tests call
   `test.setTimeout(120_000)`), while the assertion gives up at 5s — the assertion abandons the wait
   long before the test would.

**The decisive evidence — MEASURED, and it discriminates product-defect from instrument-defect.**
Every test that failed in one run **passed in another run on the identical tree digest**, and the
durations are cleanly bimodal:

| Test   | run 1          | run 2          | run 3          |
| ------ | -------------- | -------------- | -------------- |
| `:166` | 6.1s PASS      | 5.6s PASS      | **10.2s FAIL** |
| `:197` | **10.3s FAIL** | 4.4s PASS      | 4.8s PASS      |
| `:281` | 10.2s PASS     | **12.7s FAIL** | 10.3s PASS     |
| `:596` | **10.6s FAIL** | 5.6s PASS      | 6.3s PASS      |

Passing runs cluster at **4.4–6.3s**; failing runs sit at **10.2–10.6s** — precisely one extra ~5s
window, the exact size of the exhausted default assertion timeout. A product defect would produce a
wrong value or a consistent failure; instead the same code path succeeds and fails on the same tree,
separated only by whether hydration beat a 5s clock.

This is the load-dependent eager-assert class the goal has hit repeatedly (Q-P20B-15/18/19). It is a
**test-instrument defect, not a product defect**: the product renders the correct value, the
assertion simply looks too early.

**Binding constraint I observed, per the dispatch and PROGRESS.md:** a green settlement run carries
**no** information (a clean 19/19 has been observed on an unchanged tree), so I did not use any
clean run as evidence of stability. I read the failing **step name** from Playwright's failure
header verbatim rather than correlating stack frames to source lines. And I did **not** treat the
settlement failures as a package defect.

### 5.4 A SECOND, DIFFERENT failure class — `transactions.spec.ts:572` — reported separately

**This one is not a timeout, and I am deliberately not folding it into §5.3.** Through run 4 every
failure was the settlement eager-assert, and it would have been convenient to state "all failures
are one class." Run 5 falsified that.

**MEASURED — the failure, verbatim:**

```
3) transactions.spec.ts:572:9 › Transactions › Add reveals its canonical row beyond the initial
   transaction page › clear an excluding filter and focus the canonical row

Error: expect(locator).toHaveAttribute(expected) failed
  Locator: locator('[data-transaction-id="332422db-…"]').locator('../..')
  Expected: "51"
  Received: "50"
  Timeout: 5000ms
  Call log:
    14 × locator resolved to <div data-index="50" role="presentation" …>
       - unexpected value "50"
  at tests/e2e/transactions.spec.ts:668:53
```

**Why this is a different class — MEASURED, not assumed:**

- It is **not** "element not found". The element exists; it carries a **stable wrong value**. All
  **14** polls returned `50`, so waiting longer would not have helped. The 5s here is the retry
  budget, not the cause.
- **Frequency: 1 of 5 runs** (runs 1–4 passed this test).
- **The row is present and the data is complete.** The failure is at line **668** — the **third**
  `data-index` assertion in the test. The identical assertions at **:636 and :648 passed** earlier
  in the same run, and the immediately preceding post-reload assertion
  `expect(toolbar).toContainText("52 transactions")` also passed. So all 52 transactions exist and
  the row sorted to 51 correctly **before** the reload; only **after `page.reload()`** does it
  read 50.
- **The sort itself is deterministic.** `compareTransactionOrder`
  (`src/lib/crdt/queries.ts:115-133`) is a total order — date, then creationInstant, then
  `importRowIndex` with an explicit three-way comparison, then `id.localeCompare` as a final
  tiebreak. Its own comment documents why the explicit comparison exists: subtraction "yields NaN
  when both sides are Infinity, which would swallow the id tie-breaker and make the order
  input-dependent across peers." So an unstable comparator is **ruled out** as the cause.

**The most likely mechanism — INFERRED, and I mark it as such.** `PAGE_SIZE = 50`
(`src/app/(app)/transactions/page.tsx:92`) with `displayCount` starting at `PAGE_SIZE` (:194) and
growing by `PAGE_SIZE` per `handleLoadMore` (:400-402). The expected index **51 sits immediately
past the first page boundary**, which is exactly what the test's own comment says it is probing:
"The new row sorts to index 51, well past the first virtual window, so this is the load-bearing
virtualization case." After reload the test drives `scrollTop = scrollHeight` in a poll that waits
only for `exactRow.count() === 1`. **Count reaching 1 does not imply paging has settled**, so the
index can be read while the second page is still materialising.

**What I did NOT establish.** I did not reproduce this in isolation, and I did not prove the paging
hypothesis with a discriminating experiment — the port was held by the running campaign. **Whether
this is a test-instrument defect (a poll that waits for the wrong condition) or a real product
defect (a row briefly rendering at the wrong virtual index after reload) is NOT settled by my
evidence, and it should not be assumed to be the former merely because the other failures were.**
Given it lands on the transaction grid's reveal-and-focus path, a product defect here would be
user-visible.

#### 5.4b Run 7 added a SECOND grid failure — and the two share a shape

**MEASURED — `transactions.spec.ts:726`, run 7 only (1 of 7; runs 1–6 passed it):**

```
2) transactions.spec.ts:726:9 › Transactions › virtualized large list preserves position, focus,
   editing, filtering and navigation › rapidly reach the overscan edge with bounded DOM and
   measured latency

Error: expect(received).toBe(expected)
  Expected: 1   Received: 0
  Timeout 10000ms exceeded while waiting on the predicate
  at tests/e2e/transactions.spec.ts:802:18
```

**The two grid failures have the same structure — MEASURED from both test bodies:**

|                               | `:572` (run 5)                       | `:726` (run 7)            |
| ----------------------------- | ------------------------------------ | ------------------------- |
| Fixture size                  | 51 imported + 1 added = 52           | 500                       |
| Target row                    | `data-index` **51**                  | `data-index` **499**      |
| `PAGE_SIZE` expansions needed | 2                                    | 10                        |
| Action                        | `scrollTop = scrollHeight` in a poll | identical idiom           |
| Poll predicate                | `exactRow.count()`                   | `edgeWrapper.count()`     |
| Symptom                       | row present at index **50**, not 51  | row **count 0** after 10s |
| Frequency                     | 1/7                                  | 1/7                       |

Both drive `scrollTop = scrollHeight` and poll a `count()` for a row **beyond the `PAGE_SIZE = 50`
paging boundary**, and both fail on how far paging has progressed — one reading a stale index, the
other never materialising the row inside 10s. **`:726` is the more informative of the two**:
`count() === 0` means the row never appeared at all, which is unambiguously a paging/expansion
progress issue rather than an ordering one.

**What this does and does not license me to say.** It is now reasonable to describe these as one
cohort — scroll-driven progressive paging under 4-worker load — rather than two unrelated events.
**It does not tell me whether the cohort is test-side or product-side.** A poll that scrolls and
re-checks is a reasonable test idiom; if ten `handleLoadMore` expansions cannot complete within 10s
under load, that may be a genuine responsiveness limit on the virtualized grid — which the
FINAL-AUDIT clause "Large imports/tables… remain responsive and bounded" cares about directly. I did
not measure expansion latency independently, and I am not going to assert a conclusion I did not
test.

I raise this as **Q-P21-06-05** covering **both** `:572` and `:726`, and flag it explicitly for the
reviewer to reproduce and classify.

---

## 6. Security audit

### 6.1 Malicious cross-vault access — LIVE probes against the running database

**MEASURED — RLS state on every public table:**

```
passkey_challenges  | rls=true | force=true  | policies=1
passkey_credentials | rls=true | force=true  | policies=1
realtime_grants     | rls=true | force=true  | policies=0
request_nonces      | rls=true | force=false | policies=1
user_data           | rls=true | force=false | policies=1
vault_invites       | rls=true | force=false | policies=1
vault_memberships   | rls=true | force=false | policies=1
vault_ops           | rls=true | force=false | policies=1
vault_snapshots     | rls=true | force=false | policies=1
vault_updates_legacy| rls=true | force=false | policies=1
vaults              | rls=true | force=false | policies=1
```

RLS enabled on **all 11** tables. **MEASURED — the policy predicates are deny-by-default:** every
table except `vault_ops` has a single policy `"Direct API access denied"` with `using=false` for
roles `anon,authenticated`. `vault_ops` has one SELECT policy gated on
`realtime_grant_allows(vault_id, 'sync')`, whose definition requires **eight** simultaneous claim
bindings including `grant_row.id::text = claims->>'jti'`, exact `vault_id` match on both the grant
and the JWT claim, `revoked_at IS NULL`, `expires_at > clock_timestamp()`, and an exact topic
string.

**MEASURED — live malicious read attempts:**

```
SET ROLE anon;          SELECT count(*) FROM public.vaults;
ERROR:  permission denied for table vaults

SET ROLE authenticated; (per table)
vaults              => ERROR: permission denied
vault_snapshots     => ERROR: permission denied
vault_memberships   => ERROR: permission denied
vault_invites       => ERROR: permission denied
passkey_credentials => ERROR: permission denied
user_data           => ERROR: permission denied
vault_ops           => 0        (RLS-filtered; no valid grant claims)
```

Denied at the GRANT layer before RLS is even reached — defense in depth.

**Control against the "measurement that cannot fail" trap — MEASURED.** A zero row count proves
nothing if the database is empty, so I verified the data exists (superuser bypasses RLS):

```
vaults=30587  vault_ops=112475  memberships=31478  snapshots=29875
```

The zeros are **genuine denial** of 112,475 real rows, not an empty table.

### 6.1A Malicious realtime / invite / auth paths — targeted suite

**MEASURED — 71 tests across the 7 security-focused integration files, all passing:**

```
$ pnpm exec vitest run tests/integration/realtime-socket-security.test.ts \
    tests/integration/realtime-origin-controls.test.ts tests/integration/realtime-auth.test.ts \
    tests/integration/auth-batch-nonce.test.ts tests/integration/membership-remove-authz.test.ts \
    tests/integration/invite.test.ts tests/integration/invite-get-by-pubkey.test.ts

Test Files  7 passed (7)
     Tests  71 passed (71)      72.60s
```

These cover socket security, origin controls, realtime grant authorization, replay-resistant batch
nonces, membership-removal authorization, and invite redemption/lookup — the malicious API,
realtime, invite and auth surfaces the contract names.

### 6.2 Plaintext and key material absent from server storage

**MEASURED — `vault_ops` has no plaintext column:**
`id, vault_id, version_vector, encrypted_data, author_pubkey_hash, created_at, legacy_*`. `vaults`
has only `id, created_at, deleted_at` — no vault name in plaintext.

**MEASURED — a plaintext scan, and the false positive I chased down.** A case-insensitive scan for
financial vocabulary returned **56 matches**, which looks alarming. Printing the actual matched
substrings rather than trusting the count:

```
ReNT  Rent  ReNt  reNT  ReNT  rEnT  rEnt  REnT  rent  ReNt  rENt  ReNT
```

These are 4-character sequences inside random base64, not plaintext. **The discriminating control:**
the meaningless token `zqxj` appears in **68** rows — _more often than_ `rent` — and a strict
case-sensitive scan for real words returns:

```
strict matches=0
```

`encrypted_data` decodes to 388 opaque bytes. **Conclusion: zero plaintext leakage.** I report the
56 explicitly because a reviewer re-running the naive scan will see it and should not have to
re-derive the explanation.

### 6.3 Secret safety in artifacts

**MEASURED.** Swept `evidence/` and `reviews/` for JWT secret values, PEM private keys, and
recovery-phrase patterns. The only hit is `evidence/P20A/implementation-01.md:61`, which quotes the
**marketing string** "Your 12-word seed phrase is the only key to your data" — copy under audit, not
key material. A 12-word-pattern regex over `src/` and `tests/` returned only ordinary English prose
sentences (verified by reading each). **No real secret material in any artifact, log, or URL.** This
evidence file contains no secrets.

### 6.4 Marketing claims match shipped behaviour — the rev-05 FAIL class

Rev 05 FAILed on **M-1**, a false durability claim at `FeaturesSection.tsx:65`.

**MEASURED — M-1 is remediated.** `FeaturesSection.tsx` around the former site now reads "Saves
locally first" / "Edits merge cleanly" / "Encrypted on your device" with no durability absolute. A
sweep for absolutes across all public copy
(`never lose|no data loss|cannot be lost|always safe|guarantee|100%|completely secure|unhackable| impossible to|never leaves your device|no one can|impenetrable`)
matched **only CSS `clip-path` polygon coordinates** in `CTASection.tsx:25` and `HeroSection.tsx:51`
— zero prose hits.

Because a keyword sweep answers a narrower question than the claim, I also **read the copy
directly** and verified the strongest assertions against shipped code:

| Claim (verbatim)                                                                                                                                    | Verification                                                                                                                                                           | MEASURED result                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "The invite secret stays in the link fragment and never reaches the server"                                                                         | `InviteLinkGenerator.tsx:125` builds `` `${origin}/invite/${id}#${secret}` ``; `app/(onboarding)/invite/[token]/page.tsx:90,166` reads `window.location.hash.slice(1)` | **TRUE** — the secret is only ever in the URL fragment, which browsers do not transmit              |
| "Removing a member cuts off access to future changes; **the vault key is not rotated**, so anything they already downloaded stays readable to them" | copy states the limitation against its own interest                                                                                                                    | **TRUE and unusually candid** — this is the opposite of a false marketing claim                     |
| "It sees who shares a vault with whom, who made each change and when… It cannot see amounts, descriptions, tags or allocations"                     | §6.2 column inventory + plaintext scan                                                                                                                                 | **TRUE** — `author_pubkey_hash`/`created_at` visible; financial fields inside `encrypted_data` only |
| Ed25519 / X25519 / XSalsa20-Poly1305 / HKDF-SHA256 / BLAKE2b / WebAuthn PRF / CRDT                                                                  | each located in `src/lib/crypto/**` (`identity.ts`, `keypair.ts`, `encryption.ts`, `keywrap.ts`, `passkeyWrap.ts`)                                                     | **all 7 TRUE**                                                                                      |

**No false marketing claim found.**

---

## 7. FS-001 exhaustive audit

### 7.1 Canonical examples A–H — all sixteen gates

The clause requires each of A–H to have **its own named production unit/property expectation** _and_
**its own named E2E expectation**, with no example replaced by a general journey or combined case.

**MEASURED — 8 named unit expectations**, `tests/unit/domain/settlement.test.ts`, under
`describe("canonical examples A-H")`, lines 623–720. Run with `-t "Example"`:

```
✓ Example A: no explicit allocations produces no obligation          7ms
✓ Example B: 50/50 expense makes Bob owe Alice $50                   2ms
✓ Example C: owner remainder makes Bob owe Alice $30                 1ms
✓ Example D: joint owners receive the third person's exact shares    1ms
✓ Example E: a negative allocation reverses the expense direction    1ms
✓ Example F: income makes the receiving owner owe Bob $50            1ms
✓ Example G: equal joint ownership produces no obligation            1ms
✓ Example H: a non-paid status excludes the transaction              1ms
Tests  8 passed | 138 skipped
```

**MEASURED — 8 named E2E expectations**, `tests/e2e/people-settlement.spec.ts` lines 111, 124, 145,
166, 197, 220, 241, 256, each a separate `test("canonical example X: …")`. The file header states
"one named journey per canonical example A-H (section 7)". None is merged into a general journey.

**16 of 16 gates exist and are separately named.** The unit half passes fully. The E2E half is
subject to the load-dependent helper flake in §5.3 — the assertion times out, it does not compute a
wrong value.

### 7.2 Sole settlement engine, no cache, no cross-currency netting

**MEASURED.** `calculateSettlementBalances` is defined **only** in `src/lib/domain/settlement.ts`
and imported by exactly one consumer (`BalanceSummary.tsx:25`) plus the barrel
`src/lib/domain/index.ts`. The two neighbouring People-page files are reshapers, not engines, and
say so:

- `settlement-view.ts:5` — "produced by the sole production engine in `src/lib/domain/settlement.ts`
  verbatim and reshapes it"
- `settlement-allocations.ts` — "Reuses the P16A primitive `deriveEffectiveAllocations`… Nothing is
  recomputed with binary floating point and no value is clamped, normalized or rewritten"

`src/components/features/people/README.md:8` states the engine is **sole**.

**MEASURED — no persisted/plaintext cache:** a grep for
`settlementCache|cachedSettlement|settlement.*localStorage|settlement.*indexeddb` returns nothing.

**MEASURED — netting is strictly per-currency:** every position, aggregate and obligation map in
`settlement.ts` is keyed by `currency` first (`positions.get(currency)`,
`aggregates.get(currency)?.get(debtor)?.get(creditor)`, lines 782–834). There is no code path that
combines two currencies into one balance.

### 7.2A Exact signed unit conservation across every required axis

The clause requires conservation "across decimals, negatives, over/under-allocation, stable-ID ties
and multiple currencies". **MEASURED — each axis has a named test, and the pair of files passes 186
tests + 2 opt-in benchmark skips in 4.18s:**

| Axis                                         | Named test                                                                                                                                                 | File:line                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Signed conservation vs an independent oracle | "conserves signed positions and **matches a BigInt hundredths oracle**"                                                                                    | `settlement.test.ts:2661`                          |
| Per-currency conservation                    | "conserves each currency and preserves reverse-net source sums under insertion changes"                                                                    | `settlement.test.ts:2695`                          |
| Multiple currencies never combined           | "**never nets obligations across currencies**"                                                                                                             | `settlement.test.ts:810`                           |
| Negatives                                    | "Example E: a negative allocation reverses the expense direction"; "conserves **positive, negative and zero** amounts for ownership and effective weights" | `settlement.test.ts:681`; `allocation.test.ts:534` |
| Over/under-allocation                        | "validates every entry and preserves **below, equal and above-100** explicit sets"                                                                         | `allocation.test.ts:305`                           |
| Decimals / exact apportionment               | "normalizes only derived ownership weights within tolerance and **closes exactly at 100**"; "rejects weights that do not total **exactly** 100"            | `allocation.test.ts:394, 522`                      |
| Stable-ID ties                               | "uses **ascending person ID rather than insertion order** for equal remainders"                                                                            | `allocation.test.ts:488`                           |
| Generated inputs                             | "preserves explicit sets and exact totals across **fixed-seed generated inputs**"                                                                          | `allocation.test.ts:439`                           |

Conservation is checked against a **BigInt hundredths oracle** — an independent integer
reimplementation — rather than against the implementation's own floating-point arithmetic, and four
`fc.assert(fc.property(...))` property blocks (`settlement.test.ts:551, 973, 1555, 1966`) exercise
generated inputs.

### 7.3 Typed invalid-data issues; reject, never clamp

**MEASURED — `SettlementIssue` is an exhaustive discriminated union** with typed `reason` fields:
`missing-account`; `invalid-currency` (`invalid-code | not-string`); `invalid-allocation`
(`invalid-container`, and `negative-zero | not-finite | not-number | out-of-range`);
`invalid-transaction` (`invalid-hierarchy`); and entry-level issues.

**MEASURED — reject-never-clamp at the CRDT boundary.** `prepareAllocationReplacement`
(`src/lib/crdt/allocations.ts:170`) returns a typed
`error({type:"invalid-allocations", errors:[…]})` for invalid input — it never coerces into range.
Zero is handled as _removal_, not clamping: "Zero is valid input but is omitted because it means
removal at the CRDT boundary."

**MEASURED — invalid data is preserved, reported and excluded from totals**, with named tests:
"reports a referenced primitive account entry and **atomically excludes** its transaction" (:408),
"…while **preserving** valid financial output" (:458, :490), "**reports invalid-currency instead of
inventing a total**" (:2593), "reports every invalid allocation and excludes the transaction"
(:2602), "reports unsafe or non-integer money and excludes the transaction" (:2634), "preserves
every generated malformed issue across adversarial insertion permutations" (:2425).

**MEASURED — exact signed conservation:** "conserves signed positions and **matches a BigInt
hundredths oracle**" (:2661) and "conserves each currency and preserves reverse-net source sums
under insertion changes" (:2695). Conservation is checked against an independent integer oracle, not
against the implementation's own arithmetic.

### 7.4 P16C complete-set API on every mutation path

**MEASURED — two entry points only**, `setTransactionAllocation` (per-key) and
`replaceTransactionAllocations` (validated atomic complete set), both in
`src/lib/crdt/allocations.ts`. Every current mutation path routes through them:

| Path                | Call site                                     | API                             |
| ------------------- | --------------------------------------------- | ------------------------------- |
| Grid / add-row      | `app/(app)/transactions/page.tsx:1199`        | `setTransactionAllocation`      |
| Automation apply    | `lib/domain/automation/apply.ts:177`          | `replaceTransactionAllocations` |
| Automation engine   | `lib/domain/automation.ts:449`                | `replaceTransactionAllocations` |
| Import commit       | `lib/crdt/import-commit.ts:16`                | `replaceTransactionAllocations` |
| Field rules         | `lib/crdt/field-rules.ts:9`                   | `replaceTransactionAllocations` |
| Context / hydration | `lib/crdt/context.tsx:949-951, 978-984`       | both, wrapped                   |
| Barrel re-export    | `lib/crdt/mutations.ts:958`, `index.ts:15-17` | both                            |

Two of these files carry an explicit invariant comment ("go **EXCLUSIVELY** through P16C's
`replaceTransactionAllocations`"). **MEASURED — complete sets remove absent keys:**
`prepareAllocationReplacement` builds a fresh `Object.create(null)` containing only non-zero
entries, so keys absent from the input are absent from the result.

**The insertion/import/hydration paths use the same contract — MEASURED, and I checked this rather
than trusting the comment.** `import-commit.ts` mentions the invariant in prose but contains no
allocation write of its own; it creates rows with `allocations: {}` (:100) and commits through
`insertTransaction`. `insertTransaction` (`src/lib/crdt/mutations.ts:340-360`) validates via
`prepareInsertedAllocations` — which is `prepareAllocationReplacement` under another name
(`allocations.ts:327-330`, "Validate insertion data using the same complete-set contract") — for
both the transaction **and** each nested suspected duplicate (:349), returning the typed error on
failure rather than inserting a coerced value. So import and hydration share the grid's validation,
not a parallel one.

---

## 8. Performance

| Clause                               | Command                                                | MEASURED result                                                                                                                                                                                    | Verdict                                 |
| ------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Allocation edit < 100ms              | `vitest run tests/integration/allocation-crdt.test.ts` | one-key **mean 0.106ms, p50 0.081ms, p95 0.156ms, max 0.740ms**; complete replacement mean 0.585ms, p95 1.051ms (seed `0x16c2026`, 1000 transactions, 250 allocation keys, 20 warmup, 100 samples) | **PASS**, ~940x inside target           |
| Automation scaling                   | `vitest run tests/integration/automation-perf.test.ts` | 42 tests passed incl. "scales linearly with transaction count"; 20k transactions x 10 automations under 200ms                                                                                      | **PASS**                                |
| Settlement near-linear + ~100k/200ms | `P16B_BENCHMARK=1 vitest run … -t "benchmark"`         | see below                                                                                                                                                                                          | **PASS via the spec's own disjunction** |

**MEASURED — the 100k benchmark (I enabled the opt-in gate and ran it):**

```
P16B benchmark node=v22.21.1 transactions=100000 construction=excluded projection=included
warmup=5x1000 samples=5 scale10kMs=96.24 scale50kMs=509.00
elapsed100kMs=1025.64,1012.10,1135.83,951.41,1004.01
obligations=2 contributions=75000 issues=0 conservation=true
✓ benchmarks 100,000 deterministic transactions with complete output  5855ms
```

**100k takes ~1.0s, not ~200ms.** Scaling is near-linear: 10k=96ms → 100k=~1025ms is **10.7x wall
for 10x input**. Correctness at scale is exact: 75,000 contributions, **0 issues,
conservation=true**.

**The two remaining §14 sub-clauses — MEASURED from source:**

- _"must not repeatedly scan all people for every transaction when only a small union is relevant."_
  **Satisfied.** `buildObligations` (`settlement.ts:931-947`) derives its `pairs` map **from
  `aggregates`**, which contains only debtor/creditor pairs that actually transacted; it never
  iterates the full people list per transaction. The benchmark corroborates the shape: 100,000
  transactions yielded **2 obligations**, so the obligation loop is bounded by observed pairs, not
  by transaction or people count. (I first grepped for `relevantPeople|union|participant`, got
  nothing, and read the loop rather than concluding from the failed name guess.)
- _"React rendering must memoize derived column definitions, lookup maps, and settlement results."_
  **Satisfied.** `BalanceSummary.tsx` memoizes the settlement `result` (:76), the lookup maps
  `peopleById` (:81) and `transactionsById` (:94), the derived `view` (:119) and the currency
  `formatter` (:248); `TransactionTable.tsx` carries 3 `useMemo` blocks. The one lint warning (§4)
  is React Compiler declining to auto-memoize the `useVirtualizer` component — the manual
  memoization the clause requires is present regardless.

The FS-001 §14 clause is an explicit **disjunction** (verbatim, spec lines 582-584):

> "Calculation of 100,000 transactions should meet the existing account-balance target of
> approximately 200ms in a production build on the project's benchmark environment, **or provide
> measured evidence and a documented optimization follow-up.**"

**MEASURED — the follow-up is documented:** `QUESTIONS.md:1057` **Q-033** — "Strict 100k/200ms
settlement benchmark is not met; carry measured evidence + follow-up", recording ~0.76–0.86s
(implementer) and 0.93–1.10s (reviewer), near-linear scaling, exact correctness, with R-020 kept
**open** rather than closed. My independent measurement (0.951–1.136s) **reproduces the reviewer's
range**. The second branch of the disjunction is satisfied. Not a new finding; carried forward.

---

## 9. Dependency and external-gate audit

**MEASURED:**

```
$ pnpm audit --prod
No known vulnerabilities found                    exit 0
```

**Zero vulnerabilities reach shipped code.** The dev-inclusive audit exits 1 with 15 advisories (3
low / 6 moderate / 6 high), and I enumerated every path:

| Severity    | Package           | Path root                             | Ships to users?         |
| ----------- | ----------------- | ------------------------------------- | ----------------------- |
| high x3     | `undici`          | `vercel` CLI → `@vercel/node`         | **no** — deploy CLI     |
| high        | `fast-uri`        | `vercel` → `@vercel/backends` → `ajv` | **no**                  |
| high x2     | `brace-expansion` | `eslint`, `eslint-config-next`        | **no** — lint toolchain |
| moderate x6 | `undici`, `tar`   | `vercel`                              | **no**                  |
| low x3      | `undici`          | `vercel`                              | **no**                  |

Every advisory is devDependency-only, under `vercel` or `eslint`. None is bundled into the
application. This matches the rev-04 finding (`pnpm audit --prod` exit 0).

**MEASURED — P03 external release gate rechecked:** `@tanstack/react-virtual` **3.14.6** installed
and pinned in `package.json:44`; the gated `useFlushSync: true` option is in shipped product code at
`src/components/features/transactions/TransactionTable.tsx:465`. `next` **16.2.11** installed and
pinned (the version P01 rev 03 landed to clear the rev-03 HIGH advisories; `pnpm audit --prod` now
exits 0, confirming that fix holds).

---

## 10. Migrations and data upgrade

**MEASURED — all 6 migrations recorded as applied on the live stack:**

```
005 vault_ops
006 rls_hardening
007 realtime_authorization
008 realtime_authorization_lifecycle
009 remove_unused_user_state
010 passkey_credentials
```

### 10.1 A failed instrument of mine — reported as such, not as a finding

I attempted a genuine fresh bootstrap by creating a throwaway database and replaying the migrations.
**It failed — and the failure was my probe's, not the migrations':**

```
005_vault_ops.sql        rc=3  ERROR: schema "extensions" does not exist
006_rls_hardening.sql    rc=3  ERROR: relation "public.vaults" does not exist   (cascade from 005)
008_realtime_...sql      rc=3  ERROR: schema "realtime" does not exist
```

**MEASURED root cause:** the migrations reference `extensions.uuid_generate_v*` and
`realtime.messages`/`realtime.topic`. Those schemas are **provisioned by the Supabase platform
before user migrations run** — I confirmed `auth`, `extensions`, `graphql`, `realtime` all exist on
the live stack. A bare `CREATE DATABASE` has none of them, so **my probe could not have succeeded no
matter how correct the migrations were**. This is precisely the "correct, well-formed check
answering a narrower question" shape the dispatch warns about. I dropped the throwaway database and
I am **not** reporting migration breakage.

### 10.2 What I could not verify — stated plainly

**The fresh-bootstrap clause is NOT fully verified.** The faithful test is `pnpm db:reset`, which
drops and recreates the local database currently holding 30,587 vaults / 112,475 vault_ops and in
active use by my own E2E campaign and any other concurrent agent. I did not run it unilaterally and
I asked root for direction (question sent; I proceeded with all other work rather than blocking).

**Status:** MEASURED-BY-PROXY — migration history complete and ordered, 5 of 6 migrations carry
`IF NOT EXISTS`/`CREATE OR REPLACE` idempotency guards, and the live schema matches. **A reviewer
should re-run this clause under a coordinated reset window.** I flag it rather than claim it.

**IndexedDB upgrade path — INFERRED (read, not executed):** `src/lib/sync/persistence.ts:116`
implements an `upgrade(db)` handler, and :139 documents multi-tab handling ("Let another tab upgrade
or delete the cache instead of leaving its request" pending). `version_vector` is deliberately
plaintext "for filtering" (:24) — a version vector, not financial data. The E2E suite exercises real
IndexedDB across `sync-persistence.spec.ts`, `tab-duplication.spec.ts` and
`realtime-recovery.spec.ts`, all of which passed in every campaign run.

---

## 11. Console and network hygiene

**MEASURED — every distinct `[WebServer]` line across a full run, with counts:**

```
13  ⚠️ tRPC failed on realtime.revoke: Request authentication failed
 4  ⚠️ tRPC failed on sync.pushOps: Request authentication failed
 3  ⚠️ tRPC failed on realtime.revoke: Missing authentication headers
 2  ⚠️ tRPC failed on vault.list: Request authentication failed
 2  [browser] SyncManager error: TRPCClientError: Failed to fetch
 2  [browser] Failed to push to server: TRPCClientError: Failed to fetch
 1  ⚠️ tRPC failed on vault.list: Missing authentication headers
 1  ⚠️ tRPC failed on realtime.authorize: Request authentication failed
 1  [browser] Local vault cache unavailable; continuing with direct server sync
```

**These are teardown artifacts, and I verified the mechanism rather than assuming it — MEASURED.**
`src/lib/supabase/realtime.ts:315-318` documents that `unsubscribe()` "must round-trip a credential
revocation", and `retractPresence()` exists specifically for `pagehide` "where the document is being
discarded and there is no opportunity to await the full `unsubscribe`". When Playwright closes a
browser context at test end, the in-flight revoke/push loses its auth context — producing exactly
these lines. They are **server-side warnings during teardown**, dominated by `realtime.revoke` (16
of 26), the call the source names as the one that must round-trip.

The "Local vault cache unavailable; continuing with direct server sync" line is a **handled, logged
degradation with a working fallback**, not an unhandled error.

**Stronger than my log inspection: the suite itself asserts console cleanliness — MEASURED.**
`tests/e2e/people-settlement.spec.ts:75-100` installs `observeBrowserHealth(page)`, which collects
every `console` message of type `error`, every `requestfailed`, and every response with
`status >= 500`, then asserts `expect(consoleErrors).toEqual([])` and the equivalent for failed
requests. The allowlist is one narrow documented regex —
`/SyncManager error|Failed to push to server|Failed to fetch|ERR_ABORTED/` — annotated as transport
noise that "reproduces on the pre-existing suite. Everything else is fatal." Console errors and 5xx
responses outside that allowlist would **fail the tests**, and none did. This clause is enforced
continuously by the suite, not merely inspected by me after the fact.

**No sensitive data in URLs or payload metadata — MEASURED:** the only secret ever placed in a URL
is the invite secret, and it lives in the fragment (§6.4), which is never sent to the server.

---

## 12. Accessibility and responsive coverage

**MEASURED — present in the automated suite and passing in every run:**

| Clause                     | Evidence                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 320px reflow               | `people-settlement.spec.ts:750`, `import.spec.ts:1348` — `setViewportSize({width: 320})`                                                     |
| 200% zoom                  | `import.spec.ts:735, 1180` — `document.documentElement.style.zoom = "2"`                                                                     |
| Computed contrast ratios   | `import.spec.ts:348-358, 748` — real WCAG relative-luminance computation with `toBeGreaterThanOrEqual(4.5)`; also `transactions.spec.ts:199` |
| Dark mode + reduced motion | `people-settlement.spec.ts:760-766`, `import.spec.ts:1132`, `transactions.spec.ts:2747, 2889` — `emulateMedia({colorScheme, reducedMotion})` |
| Accessible role/name/state | `getByRole`-based assertions across 10+ spec files                                                                                           |

These are genuine computed measurements (luminance math against a 4.5 threshold), not screenshot
comparisons.

---

## 12A. Traceability and the "never a misleading settled claim" guarantee

**MEASURED — every obligation is traceable.** `SettlementResult` carries
`sourceContributions: readonly SettlementSourceContribution[]` on each obligation
(`src/lib/domain/settlement.ts:49`, populated at :969-988). `BalanceSummary.tsx:349` renders each as
`data-testid="settlement-source-${transactionId}"` and :379 emits a working deep link
`` `/transactions?transaction=${encodeURIComponent(source.transactionId)}` ``. The E2E suite follows
that link (`people-settlement.spec.ts:336, 745` — `waitForURL(/\/transactions\?transaction=/)`) and
verifies the destination row "lands selected and revealed" (:797) and survives an unrelated bulk
delete (:829).

**MEASURED — an invalid map can never produce a misleading "everyone is settled".** This is
guaranteed structurally, not by convention: `buildSettlementView`
(`src/components/features/people/settlement-view.ts:184-192`) evaluates issues **first** and returns
early —

```ts
const summary = summarizeIssues(result.issues);
if (summary != null) return freezeView({ kind: "incomplete", summary });

if (result.obligations.length === 0) {
    return freezeView(
        result.qualifyingTransactionCount === 0
            ? { kind: "no-qualifying-transactions" }
            : { kind: "settled" }
    );
}
```

The `settled` branch is unreachable while any issue exists. It is pinned at both levels, including
the hardest case: unit — "reports incomplete rather than **settled** when issues **coexist with
obligations**" (`tests/unit/components/settlement-view.test.ts:103`) and "distinguishes
no-qualifying-paid from everyone-settled" (:124); E2E — "invalid ownership surfaces Settlement
incomplete and **never claims everyone is settled**" (`people-settlement.spec.ts:638`).

---

## 12B. The manual product journey — what I covered, and what I did NOT

The contract requires a "complete manual product journey using disposable headless Playwright CLI
sessions and isolated users." **I did not run a separate manual CLI session, and I want that stated
plainly rather than buried.** The reason is port discipline: `playwright.config.ts` pins
`baseURL`/`webServer.url` to `:3000` with `reuseExistingServer: false`, so exactly one Playwright
process can run repo-wide. My 7-run flake campaign held `:3000` for its entire duration, and
grabbing the port in an inter-run gap would have voided the campaign — the very evidence the rev-04
FAIL demanded.

**What I have instead — MEASURED.** Every area the manual matrix names is covered by automated
journeys that passed in every completed run. Counts below are from run 6:

| Manual-matrix clause                                                                  | Spec file                                                                                                                           | Pass / Fail                            |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| New identity/vault by recovery phrase; password-manager behavior                      | `identity.spec.ts`, `onboarding-vault.spec.ts`                                                                                      | 9/0, 8/0                               |
| Passkey create/unlock/add/revoke/fallback, unsupported paths                          | `passkey.spec.ts`                                                                                                                   | 12/0                                   |
| Imports by picker and drop zones, CSV/OFX, provenance, amount tooltip, delete import  | `import.spec.ts`                                                                                                                    | 18/0                                   |
| Transactions grid, empty rows, keyboard, undo/redo, allocations                       | `transactions.spec.ts`, `undo-redo.spec.ts`                                                                                         | 50/0 (run 6), 4/0                      |
| Aliases shared/single/remove/change-all + management page                             | `description-aliases.spec.ts`                                                                                                       | 5/0                                    |
| Tags                                                                                  | `tags.spec.ts`                                                                                                                      | 3/0                                    |
| Automations create/update/drift/apply-this/apply-all/apply-new                        | `automations.spec.ts`, `rule-creation-controls.spec.ts`, `field-rule-parity.spec.ts`, `transaction-rules.spec.ts`                   | 3/0, 11/0, 6/0, 2/0                    |
| People/member/invite two-user flow, permission limits, removal, live sync             | `invite-redemption.spec.ts`, `vault-settings.spec.ts`                                                                               | 2/0, 10/0                              |
| Presence/active transaction, refresh, duplicate tabs, reconnect, offline recovery     | `presence.spec.ts`, `tab-duplication.spec.ts`, `sync-persistence.spec.ts`, `realtime-recovery.spec.ts`, `realtime-security.spec.ts` | 4/0, 1/0, 3/0, 4/0                     |
| People obligations, per-currency, invalid/multicurrency/historical, source navigation | `people-settlement.spec.ts`                                                                                                         | 19 tests; failures only the §5.3 class |
| Marketing claims                                                                      | `landing.spec.ts`                                                                                                                   | 8/0 (plus the §6.4 source audit)       |
| Dates in browser locale                                                               | `date-locale.spec.ts`                                                                                                               | 5/0                                    |
| Accounts, sidebar                                                                     | `accounts.spec.ts`, `sidebar.spec.ts`                                                                                               | 7/0, 4/0                               |

**Why this is not equivalent, stated honestly.** These journeys assert what their authors thought to
assert. A human-driven pass can notice what no assertion encodes — visual regressions, awkward
affordances, surprising focus behaviour. **The reviewer, who will not be holding `:3000` for a
campaign, should run the manual matrix.** I flag this as a gap in my coverage rather than claiming
the automated suite discharges the clause.

**This is exactly the kind of substitution the dispatch's method note warns about** — a narrower
instrument answering an adjacent question — so I am labelling it rather than letting the table imply
the clause is met.

---

## 13. Q-proposals

### 13.0 QUESTIONS and DECISIONS are internally consistent — MEASURED

- **66** question entries (`^## Q-`) and **24** decision entries (`^## D-`).
- Each question follows one structured template: _Raised / Source proposal / Context and evidence /
  Why the frozen requirement does not fully decide it / Options considered / Default selected for
  continued work / Decision hierarchy basis / Impact and risk / How to reverse or migrate / Does a
  human still need to decide after completion?_
- **31 questions are flagged `Yes`** for "Does a human still need to decide after completion?" and
  **32 `No`** — this is the deferred-questions set the final human review must see, and it is
  explicitly enumerable rather than implicit.
- `D-020`–`D-024` record the admission of UR-001..UR-012 via successive frozen sources, each stating
  that `human-scratch.md` and prior sources were left untouched — consistent with §2's measurement
  that the scratch SHA equals the rolling SHA and FS-001 has one commit.
- `D-019` records the `Q-P20B-00` OUT-OF-GOAL ruling, independently adjudicated at `f290246`.

**Correction to my own instrument, recorded per the dispatch's method note:** my first attempt to
count question state grepped for a `**Status:**` field and returned "3 OPEN", which would have been
a misleading summary. Only 4 of 66 entries use that idiom at all — the ledger's actual convention is
the structured template above. I re-derived the state from the real convention rather than reporting
the first conclusion-shaped number I got.

### 13.1 Carry-forward proposals confirmed still surfaced

**MEASURED — all 14 are surfaced at BASE**, each located by grep across the whole
`specs/007-human-scratch-completion/` tree with occurrence counts:

| Proposal                                           | Occurrences                                                                                          | Status                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Q-P20B-00` (`pruneBuckets` CRDT data loss)        | 11                                                                                                   | surfaced; ruled OUT-OF-GOAL by `D-019` (`f290246`) — **still a tracked live risk, not closed** |
| `Q-P20B-13`                                        | 5                                                                                                    | surfaced                                                                                       |
| `Q-P20B-14`                                        | 10                                                                                                   | surfaced                                                                                       |
| `Q-P20A-02`                                        | in QUESTIONS + PROGRESS + 4 P21 evidence files                                                       | surfaced                                                                                       |
| `Q-P20A-05`                                        | 3                                                                                                    | surfaced                                                                                       |
| `Q-P17D-02`                                        | 2                                                                                                    | surfaced                                                                                       |
| `Q-P20B-06` / `Q-P20B-08`                          | 2 each                                                                                               | surfaced                                                                                       |
| `Q-P21-04-01` (upstream currency drift)            | in QUESTIONS + PROGRESS + review-05                                                                  | surfaced, accepted carry-forward                                                               |
| `Q-P21-05-01/02/03`                                | 2 each                                                                                               | surfaced                                                                                       |
| `Q-PROPOSAL-P32-01-01` (toast stacking, 4 stacked) | `evidence/P32/implementation-01.md:144`, `reviews/P31-review-01.md:332,354,447`, `PROGRESS.md:11113` | surfaced — see the correction below                                                            |
| `Q-033` (100k/200ms)                               | QUESTIONS + RISKS + PROGRESS + 5 P21 evidence/review files                                           | surfaced; satisfied via the spec's disjunction (§8)                                            |

**A second correction to my own instrument, recorded per the method note.** My first search for
these proposals scanned only `QUESTIONS.md` and `DECISIONS.md`, and returned **0 occurrences** for
`Q-PROPOSAL-P32-01-01` — which would have been reported as a missing carry-forward and a FAIL
trigger ("missing evidence"). Widening to the whole spec tree found it in five places, including
`PROGRESS.md:11113` where it is carried as an open item for the principal with the honest fix
identified ("a once-per-transition latch rather than a threshold change"). **The proposal lives in
package evidence and the review, not in the central QUESTIONS ledger** — my instrument assumed the
wrong home and would have produced a false blocking finding. This is the third instance in this
session of a check answering a narrower question than the claim it was meant to support; I report it
rather than quietly fixing it.

### 13.2 Known-open items NOT reported as new findings

Per the dispatch, and confirmed still open, **not** counted against this audit:

- `InlineEditableTags` Escape handler bound to a `CommandInput` that has lost focus by the time
  Escape arrives — pre-existing, ruled out of UR-009 scope.
- `people-settlement.spec.ts` rotation — see §5.3. I did **not** treat it as a package defect, and I
  did **not** use any green settlement run as evidence of stability.

### 13.3 New Q-proposals raised by this audit

- **Q-P21-06-01** — `PROGRESS.md` "Current position" prose contradicts the authoritative row tables
  (says 28/34 requirements and P28–P33 `queued`; tables say 34/34 and all `passed`). Documentation
  consistency; root-owned. §1.1.
- **Q-P21-06-02** — `pnpm format:check` exits 1 on 27 `specs/**` files including the FROZEN
  `specs/human-scratch.md`. Pre-existing since the P00 baseline (proven), zero product/test files.
  The bare `oxfmt` has no ignore configuration, so it sweeps frozen and root-owned markdown that
  must not be reformatted. Needs an explicit ruling: either scope oxfmt away from `specs/**`, or
  record the exemption durably so each audit revision stops re-litigating it. §4.1.
- **Q-P21-06-03** — the settlement E2E helper is the sole remaining home of the load-dependent
  eager-assert class: 9 bare `toBeVisible()` calls in `tests/e2e/helpers/settlement.ts` on
  Playwright's 5s default, reached via `goToPeople` which waits only for the page heading, while the
  sibling `goToAutomations` also waits for a content element. Test-instrument defect; owner P20B.
  §5.3.
- **Q-P21-06-04** — the fresh-database-bootstrap clause could not be executed without destroying
  shared local state. Verified by proxy only. §10.2.
- **Q-P21-06-05** — **`transactions.spec.ts:572` fails 1-in-5 with a STABLE wrong virtual index
  (`data-index` 50, expected 51) after `page.reload()`, not a timeout.** All 52 transactions are
  present and the same assertion passed twice earlier in the same run; the sort comparator is a
  proven total order, so an unstable comparator is ruled out. The expected index sits exactly at the
  `PAGE_SIZE = 50` boundary and the test's post-reload poll waits only for `count() === 1`, which
  does not imply paging has settled. **Not classified: I could not determine whether this is a
  test-instrument defect or a real product defect on the grid's reveal-and-focus path, and it must
  not be assumed benign by analogy with the settlement class.** Needs isolated reproduction. §5.4.
- **Q-P21-06-06** — the **complete manual product journey clause is NOT discharged by my evidence**.
  One Playwright process can run repo-wide (`:3000`, `reuseExistingServer: false`), and my flake
  campaign held it throughout; taking the port between runs would have voided the campaign. Every
  matrix area has passing automated coverage (§12B), but automated journeys assert only what their
  authors encoded. The reviewer should run the manual matrix. §12B.

---

## 14. Proposed FINAL-AUDIT clause results

Root owns `FINAL-AUDIT.md`; this is a **proposal only**, for root to transcribe **after** an
independent PASS. Legend: **PASS** = measured and met; **PASS\*** = met but carrying a stated
judgement or limitation; **NOT VERIFIED** = I could not execute it.

### Scope reconciliation

| Clause                                                                     | Result     | Basis                                                                                                                                  |
| -------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| All 22 first-class entries map to approved reviews and passed rows         | **PASS**   | §1, §2A                                                                                                                                |
| Alias P11A–C and automation P17A–D passed before their checkboxes          | **PASS**   | §2A timestamps                                                                                                                         |
| Scratch checksum/drift recorded and reconciled                             | **PASS**   | §2                                                                                                                                     |
| FS-001 matches SHA/715 lines/25,441 bytes; never edited to record progress | **PASS**   | §2 — one commit in history                                                                                                             |
| P16A–E passed with revisioned evidence before FS-001 completed             | **PASS**   | §2A                                                                                                                                    |
| Every prior P21 failure has a complete rollback batch and re-pass chain    | **PASS**   | §2A terminal state; RB-P21-01..05 completed + cleared                                                                                  |
| No `changes_requested`/`rollback_pending`/`completion_pending` remains     | **PASS**   | §2A                                                                                                                                    |
| No approved BASE..HEAD range changed after review                          | **PASS\*** | §2B — HEAD moved by ONE documentation commit during collection; classified, product tree byte-identical; **needs root reconciliation** |
| QUESTIONS and DECISIONS internally consistent and summarized               | **PASS**   | §13.0 — 66 questions, 24 decisions, 31 flagged for human decision                                                                      |

### Repository and migration audit

| Clause                                                                | Result           | Basis                                                                                                    |
| --------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Exact HEAD, branch, upstream, commits, dirty/untracked recorded       | **PASS**         | §3                                                                                                       |
| No unrelated/user-owned file committed                                | **PASS**         | §3 — no `.env.local`, no CSVData/OFXData ever                                                            |
| Fresh bootstrap and every supported upgrade path pass                 | **NOT VERIFIED** | §10.2 — needs a coordinated DB reset window (Q-P21-06-04)                                                |
| Existing IndexedDB/vault data upgrades without leakage or loss        | **PASS\***       | §10 — upgrade handler read (INFERRED); exercised indirectly by passing persistence/tab/recovery journeys |
| Dependency audit and P03 external gate rechecked from primary sources | **PASS**         | §9 — `pnpm audit --prod` exit 0; virtual 3.14.6 + `useFlushSync` shipped                                 |

### Verification audit

| Clause                                                                            | Result     | Basis                                                                                                                                                           |
| --------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format, lint, typecheck, production build pass                                    | **PASS\*** | §4, §4.1 — typecheck/lint/build exit 0; `format:check` exits 1 on 27 `specs/**` files, **zero product/test**, pre-existing since the P00 baseline (Q-P21-06-02) |
| All unit/property/integration tests pass with counts/durations/seeds              | **PASS**   | §4 — 129 files, 2,481 passed, 2 opt-in skips, 73.6s; seeds recorded in §8                                                                                       |
| Full E2E suite passes with retries disabled                                       | **FAIL**   | §5.2 — no run of 7 was fully green; 11 failures / 1,365 executions (99.19% pass)                                                                                |
| Changed critical journeys pass repeated flake runs, retries disabled              | **FAIL**   | §5.3, §5.4                                                                                                                                                      |
| No arbitrary sleeps, shared ordering, unexplained skips, retry-dependent outcomes | **PASS**   | §4 — zero `.skip`/`.todo` in `tests/`; the 2 unit skips are env-gated benchmarks that I ran                                                                     |

### Security and performance audit

| Clause                                                                                    | Result     | Basis                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Malicious cross-vault database/API/realtime access denied                                 | **PASS**   | §6.1 live probes + §6.1A 71 tests                                                                                                                                                             |
| Key material/recovery/passkey secrets/plaintext absent from logs, URLs, storage, evidence | **PASS**   | §6.2, §6.3                                                                                                                                                                                    |
| Large imports/tables/alias/automation/GC responsive and bounded                           | **PASS\*** | §8 measures allocation/automation/settlement; **but §5.4's two grid failures touch exactly this clause** — 10s of scroll-driven paging failing to reach index 499 is unresolved (Q-P21-06-05) |
| Allocation edits <100ms; settlement near-linear + 100k/200ms or measured follow-up        | **PASS**   | §8 — 0.106ms mean; 100k ~1.0s with Q-033 follow-up per the spec's own disjunction                                                                                                             |
| Exact signed unit conservation across all required axes                                   | **PASS**   | §7.2A — BigInt oracle                                                                                                                                                                         |
| Every canonical example A–H has its own named unit AND E2E expectation; all 16 gates      | **PASS\*** | §7.1 — 16/16 exist and are separately named; 8 unit gates pass; the E2E half is subject to §5.3                                                                                               |
| `settlement.ts` sole engine; no cache, no competing computation, traceable                | **PASS**   | §7.2, §12A                                                                                                                                                                                    |
| Invalid legacy maps preserved, typed issues, excluded, never a misleading settled claim   | **PASS**   | §7.3, §12A                                                                                                                                                                                    |
| Every path uses P16C per-key/complete-set API; removes absent keys, never clamps          | **PASS**   | §7.4                                                                                                                                                                                          |
| Duplicate-tab and multi-client converge without deadlock/lost changes                     | **PASS**   | §5.2 — every convergence/presence/offline test passed in every run                                                                                                                            |

### Exhaustive manual product audit

| Clause                                                                                      | Result                     | Basis                                                                                               |
| ------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| All manual journey clauses                                                                  | **NOT VERIFIED as manual** | §12B — full automated coverage passing, but no human-driven CLI pass; port contention (Q-P21-06-06) |
| Deterministic role/name/state snapshots, 320px reflow, 200% zoom, contrast                  | **PASS**                   | §12 — real WCAG luminance math vs 4.5                                                               |
| Marketing claims match shipped behavior                                                     | **PASS**                   | §6.4 — M-1 remediated; 7/7 crypto claims verified; no false claim found                             |
| Console has no unexplained errors; no unexpected network failures or sensitive data in URLs | **PASS**                   | §11 — suite asserts `consoleErrors == []` and no 5xx per test                                       |

---

## 15. Collector's summary

**I am not proposing a verdict — that is the reviewer's single unconditional call, and root's to
transcribe.** What the evidence supports:

**The product side of this audit is strong.** Typecheck, lint, build and 2,481 unit/property/
integration tests pass. Cross-vault access is denied at the grant layer before RLS, proven with live
probes against 112,475 real rows and a control showing the data exists. Server storage is opaque (0
strict plaintext matches; the 56 apparent hits were base64 coincidence, disproven by a nonsense
token scoring higher). All 16 FS-001 canonical gates exist and are separately named. Settlement is
the sole engine, conserves units against a BigInt oracle, and cannot render a misleading "settled".
The rev-05 M-1 false marketing claim is remediated and I found no replacement anywhere in public
copy — the security copy in fact discloses limitations against its own interest.

**The blocking issue is E2E stability, and it is the same clause that failed rev 04.** **No run of
seven was fully green** — 1,354 of 1,365 executions passed (99.19%), with 11 failures. Nine are one
measured, test-side class (§5.3) with a mechanism, a bimodal timing signature, and a bounded 9-call
cohort — I would characterise those as a test-instrument defect owned by P20B, not a product defect.

**But I cannot tell you the other two are benign.** `transactions.spec.ts:572` and `:726` (§5.4) are
not timeouts-on-a-correct-value: one reads a stale virtual index, the other never materialises the
row at all (`count() === 0` after 10s). They share a structure — a scroll-driven poll for a row past
the `PAGE_SIZE = 50` boundary — so they are one cohort, but **that identifies the cohort, not its
owner.** If ten `handleLoadMore` expansions cannot finish inside 10s under load, that is a
responsiveness question about the virtualized grid, which the FINAL-AUDIT clause "Large
imports/tables… remain responsive and bounded" asks about directly. I could not run the
discriminating experiment because my own campaign held the port. **Treating them as "probably the
same thing as the settlement flake" would be exactly the reasoning this goal has been burned by
repeatedly.** They need isolated reproduction before anyone concludes they are harmless.

**Three clauses I could not discharge**, all stated rather than papered over: fresh database
bootstrap (needs a reset window), the manual product journey (needs the port), and the strict
`format:check` reading (needs a ruling, not a measurement).

**Failed instruments I found in my own work and reported:** a bare-postgres migration probe that
could never have succeeded (§10.1), a question-status grep matching the wrong convention (§13.0),
and a carry-forward search scoped to the wrong files that nearly produced a false "missing evidence"
blocker (§13.1). Each returned a conclusion-shaped answer without erroring.

**Write boundary — MEASURED:** `git status` over `specs/ src/ tests/ supabase/ package.json` shows
exactly one entry, untracked: `evidence/P21/implementation-06.md`. Nothing staged, nothing committed
by me, `FINAL-AUDIT.md` and every ledger untouched.

**Session hygiene:** the isolated worktree `/tmp/mf-p21c06` (detached at BASE) and the throwaway
database were used for testing only; the throwaway DB was dropped. The human's `:3001` dev server
was never touched, no `pkill` was used, and `:3000` was announced on claim and on release. No secret
material appears in this document.

---

## Appendix A — Reproduction

Every gate below is re-runnable. Timings are from a 32-thread host, Node v22.21.1, pnpm 11.13.1.

```bash
# Provenance (expect BASE == 5260c15; see §2B if HEAD differs)
git rev-parse HEAD
git log --oneline --follow -- specs/008-transaction-percentage-allocations-settlement/spec.md

# Frozen values
sha256sum specs/human-scratch.md                                    # 469e98c7…
wc -l -c specs/human-scratch.md                                     # 350 24260
grep -c '^- \[x\]' specs/human-scratch.md                           # 43
grep -c '^- \[\]'  specs/human-scratch.md                           # 0
sha256sum specs/008-transaction-percentage-allocations-settlement/spec.md   # 0d0e2a14…
wc -l -c specs/008-transaction-percentage-allocations-settlement/spec.md    # 715 25441
grep -c "per purpose" specs/007-human-scratch-completion/PROGRESS.md       # 1

# Static gates
pnpm typecheck            # exit 0, ~3s
pnpm lint                 # exit 0, 1 warning 0 errors, ~11s
pnpm format:check         # exit 1 — 27 specs/** files, 0 product files (§4.1)
pnpm build                # exit 0, 17 routes, ~20s
pnpm test                 # exit 0, 129 files / 2481 passed / 2 skipped, ~74s
                          # NOTE: do NOT run concurrently with E2E — duplicates.test.ts
                          #       has a wall-clock ratio assertion (§4.0a)

# Opt-in benchmarks (the 2 skips)
P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts -t "benchmark"
pnpm exec vitest run tests/integration/allocation-crdt.test.ts tests/integration/automation-perf.test.ts

# FS-001 canonical gates
pnpm exec vitest run tests/unit/domain/settlement.test.ts -t "Example" --reporter=verbose   # 8 named
grep -n "canonical example [A-H]" tests/e2e/people-settlement.spec.ts                       # 8 named

# Security
pnpm audit --prod         # exit 0, "No known vulnerabilities found"
pnpm exec vitest run tests/integration/realtime-socket-security.test.ts \
  tests/integration/realtime-origin-controls.test.ts tests/integration/realtime-auth.test.ts \
  tests/integration/auth-batch-nonce.test.ts tests/integration/membership-remove-authz.test.ts \
  tests/integration/invite.test.ts tests/integration/invite-get-by-pubkey.test.ts   # 71 passed

# Live cross-vault probes (read-only; safe to repeat)
docker exec supabase_db_moneyflow psql -U postgres -d postgres -At -c \
 "SELECT c.relname||' rls='||c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1;"
docker exec supabase_db_moneyflow psql -U postgres -d postgres -c \
 "SET ROLE anon; SELECT count(*) FROM public.vaults;"        # permission denied
docker exec supabase_db_moneyflow psql -U postgres -d postgres -At -c \
 "SELECT count(*) FROM public.vault_ops;"                    # 112475 — the control (§6.1)
docker exec supabase_db_moneyflow psql -U postgres -d postgres -At -c \
 "SELECT count(*) FROM public.vault_ops WHERE encrypted_data ~ '(groceries|salary|transaction)';"  # 0
```

### E2E campaign

`:3000` is the only E2E port. Announce before claiming and after releasing.

```bash
# The primary checkout CANNOT run E2E while the human's dev server holds Next's
# directory-scoped lock (§5.1). Do not kill it. Use an isolated worktree:
git worktree add --detach /tmp/mf-<name> <BASE>
cp .env.local /tmp/mf-<name>/.env.local     # git worktree does NOT copy it
cd /tmp/mf-<name> && pnpm install --frozen-lockfile   # a REAL install, not cp -a node_modules

env -u CI pnpm test:e2e                     # 4 workers, retries=0; ~4.5-5 min per run
```

Repeat 7x. Record `git rev-parse HEAD` plus a tree digest per run and confirm it never changes — a
campaign is evidence only for the tree it ran on. Read failing **step names** from Playwright's
failure header verbatim; do not correlate stack frames to source lines.

Logs from this campaign: `/tmp/p21c06-e2e/run{1..7}.log`, `/tmp/p21c06-e2e/campaign.summary`.

### Cleanup performed

Worktree `/tmp/mf-p21c06` removed; throwaway database `p21c06_freshboot` dropped; `:3000` released
and verified free via `ss -ltn`. The human's `:3001` server and other agents' worktrees were never
touched. No `pkill` was used at any point.
