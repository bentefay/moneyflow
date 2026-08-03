# P20B revision 07 — E2E stability fix — Independent Review

- **Reviewer:** `p20b-reviewer-07` — distinct from `p20b-implementer-07` and from
  `p20b-reviewer-01`, `-02`, `-03`, `-06`. I wrote none of this code.
- **Package / revision:** P20B, revision 07. **Evidence reviewed:**
  `evidence/P20B/implementation-08.md` (uncommitted on disk by design, `PROCESS.md:58`; the
  filename-one-ahead skew is known and is not an error).
- **Date:** 2026-08-03.

**Reading convention.** Every claim is tagged **MEASURED** (I ran the command in this session and
its output is reproduced here) or **INFERRED** (read from source without a discriminating
execution). Per the dispatch's method note I re-derived every figure I was given rather than
relaying it. Log paths are named in every claim that rests on one.

---

# VERDICT

# FAIL

**The FAIL is not for the unmet 10-green bar, and it is not a rejection of the fix.** Both code
changes are correct, safe, and I verified them independently, including the two-directional control
the dispatch asked me to press hardest on. The implementer's central and uncomfortable claim — that
it fixed two real instrument defects and that **neither explains the observed failures** — is
**accurate, and I reproduced it on my own tree**. That is the right outcome and I am recording it as
such.

The FAIL rests on **F-A**: the implementer's one assigned artifact does not contain the validation
campaign for the commit being handed back. §4 "Campaign results" is the literal token
`PLACEHOLDER-CAMPAIGN`, two sections cross-reference a `§4.2b` that does not exist, and the section
that does name a "FINAL tree" names one that a later section of the same file discards. Two further
in-scope findings (F-B, F-C) are cheap and belong in the same revision.

---

## 0. Range, ancestry and tree integrity — MEASURED

```
$ git rev-parse HEAD
c66ddcd5dc4c5a739ebeaf0fd6782c23d8720c5a
$ git merge-base --is-ancestor c515173 HEAD   -> exit 0 (YES, ancestor)
```

Re-checked at the end of the review: HEAD still `c66ddcd`, `c515173` still an ancestor, and the
three reviewed files clean in the shared checkout (`git status --porcelain` on those paths: empty).

**Range `c15be12..c515173` — MEASURED, and it matches the declared scope exactly:**

```
 playwright.config.ts            |  5 +++++
 tests/e2e/helpers/nav.ts        |  5 +++++
 tests/e2e/helpers/settlement.ts | 22 ++++++++++++++++++++--
 3 files changed, 30 insertions(+), 2 deletions(-)
```

Two commits, as declared: `6061ef7` then `c515173`. `git diff --stat c15be12 c515173 -- src/` is
empty — **no product code changed.** `c15be12..HEAD` adds only root-owned control commits
(`304a43a`, `07c38b4`, `9a1b5e2`, `c66ddcd`) touching `HANDOFF.md`, `PROGRESS.md` and the dispatch
file. Nothing outside the declared boundary.

---

## 1. Static verification — ALL PASS at the reviewed tree

**MEASURED**, run sequentially in the primary checkout with nothing else consuming CPU (per the
recorded `duplicates.test.ts` wall-clock-ratio hazard). Full log `/tmp/rev07-static.log`.

| Check                            | Command                                 | Exit  | Result                                      |
| -------------------------------- | --------------------------------------- | ----- | ------------------------------------------- |
| Typecheck                        | `pnpm typecheck`                        | **0** | clean                                       |
| Lint                             | `pnpm lint`                             | **0** | 0 errors, 1 pre-existing P03 warning        |
| Format — the three changed files | `pnpm exec oxfmt --check <the 3 paths>` | **0** | "All matched files use the correct format." |
| Format — repo                    | `pnpm format:check`                     | **1** | **26 files, every one under `specs/`**      |
| Unit / property / integration    | `pnpm test`                             | **0** | **129 files, 2481 passed, 2 skipped**       |

The 2481 figure reproduces both the evidence's and the rev 06 reviewer's count exactly. The
`format:check` failure is the known pre-existing `oxfmt`-sweeps-`specs/**` issue: **0 files under
`src/` or `tests/`**, so it is untouched by this work. I measure **26** files where the evidence
records 27 — root has committed spec files since the evidence was written; this is expected drift,
not a misstatement.

I did **not** run `pnpm build` (the evidence records it green at `6061ef7`); the diff contains no
product code and typecheck plus the production-independent checks pass at `c515173`.

---

## 2. The two changes, reviewed

### 2.1 `playwright.config.ts` — `expect: { timeout: 15_000 }`. **Correct. Real. Verified active.**

The defect is real and reproduces: **MEASURED**, `grep -n 'expect' playwright.config.ts` at BASE
exits 1 — there was **no `expect` block at all**, so `timeout: 30000` never reached assertions and
every bare `expect()` ran on Playwright's 5 s default.

**The fix demonstrably reaches bare assertions — MEASURED, from the campaign's own artifacts rather
than from an argument.** All eleven failure artifacts in `/tmp/p20b07-c2/artifacts-run*/` report:

```
$ grep -h 'Timeout: ' /tmp/p20b07-c2/artifacts-run*/*/error-context.md | sort | uniq -c
     11 Timeout: 15000ms
```

Every one of those is a bare `toBeVisible()` in `helpers/settlement.ts` (`:412`, `:419`) carrying no
explicit timeout. **The config value reaches them. The 5 s window is closed.** I did not re-run the
implementer's deleted 5005 ms probe spec; the pre-fix side is attested by `reviews/P21-review-06.md`
(`:821`) and by the implementer's own recorded control.

**Blast radius re-derived — MEASURED, and the evidence's figures hold:**

| Figure                                    | Evidence | My measurement |
| ----------------------------------------- | -------- | -------------- |
| `expect(` calls under `tests/e2e/`        | 1408     | **1408**       |
| `toHaveCount(0)` (absence, no timeout)    | 115      | **115**        |
| `test.setTimeout` calls                   | 39       | **39**         |
| …of those, in `people-settlement.spec.ts` | 19       | **19**         |

Two figures differ trivially by regex definition (explicit ≥10 s waits: evidence 206, mine 207;
`not.toBeVisible()`: evidence 34, mine 32). Neither is material and neither changes a conclusion.

**The trade-off is real and the evidence states it honestly** (§3.4): a genuinely failing absence
assertion now costs 15 s instead of 5 s, and a test with two failing bare assertions can exhaust the
30 s test budget and report a less precise error. The implementer raised this itself as
`Q-P20B-07-01`. I agree with the choice: 15 s is the value the suite converged on independently in
~206 places, and leaving `expect` at 5 s is worse.

### 2.2 `tests/e2e/helpers/nav.ts` — the `goToPeople` content wait. **Correct and safe.**

**The structural gap the wait closes is real — MEASURED from source.**
`src/app/(app)/people/page.tsx` renders the `<h1>People</h1>` **unconditionally**, and renders
`<PeopleTable/>` — and therefore `settlement-summary` — only inside `{activeVault?.id ? … : …}`. So
the old h1-only wait could return before a vault was selected. The new wait cannot.

**It cannot hang for a legitimate caller — MEASURED.** `BalanceSummary.tsx` has exactly four return
paths (`:138 incomplete`, `:168 no-qualifying-transactions`, `:185 settled`, `:208 obligations`),
all four render `data-testid="settlement-summary"`, and the file contains no `return null` /
`return undefined`. `BalanceSummary` is mounted unconditionally inside `PeopleTable`'s return, not
behind the `activePeople.length === 0` branch. **Confirmed live**: in the manual session the
`no-qualifying-transactions` state rendered the card and the new wait resolved in **1 ms** after the
h1 (§4). Empirically, 45 `goToPeople` call sites across seven spec files ran through 14 full-suite
executions (root's 10 plus my 4) with **no caller failing at this wait**.

The implementer's honesty here is worth recording: it labels this change **"defence in depth, not
the fix"** (§3.2) and raises `Q-P20B-07-02` so a later reader does not mistake it for the
load-bearing change. That is accurate.

### 2.3 `tests/e2e/helpers/settlement.ts` — the `setAllocation` barrier and the `c515173` zero-case correction

**This is the dispatch's top press-hardest item, and I measured it in the real product rather than
reasoning about it.**

The product behaviour is confirmed from source: `PersonAllocationCell.tsx:73-74` emits
`Explicit: not stored.` when the key is absent and `Explicit: ${explicitDisplay}.` when present;
`src/lib/crdt/allocations.ts:294-303` **deletes** the key when the prepared value is null, under the
comment _"Zero means removal at the CRDT boundary"_. So `Explicit: 0%.` is genuinely unreachable and
the first barrier demanded a string the product can never render — which is why it failed
deterministically 10/10 rather than rotating.

**MEASURED — live in a disposable browser session against a real vault, reading the DOM at each
step. Account `Default` owned by Me 100%; Me and Bob each holding explicit 50 beforehand:**

| #   | Action                                             | Cell text after the action                                      | Barrier `Explicit: not stored.` |
| --- | -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| 1   | write `0`, **dropped** (`Escape`) from stored 50   | `50% Explicit: 50%. Effective: 50%. Owner remainder: 0%.`       | **FAILS** ✔ discriminates       |
| 2   | write `0`, **landed** (`Enter`)                    | `— Explicit: not stored. Effective: 50%. Owner remainder: 50%.` | **passes** ✔ correct            |
| 3   | write `0`, **dropped**, from an already-absent key | `— Explicit: not stored. Effective: 50%. Owner remainder: 50%.` | **passes** ✘ vacuous            |

**Rows 1 and 2 answer the dispatch's question: yes, the corrected barrier still discriminates a
dropped zero-write, and it fails at its own line.** Row 2 also reproduces the campaign artifact
string in evidence §4.3f **verbatim**, independently confirming the implementer's lost-vs-cleared
analysis and its reading that `Owner remainder`, not `Effective`, is the discriminating field.

**Row 3 is the bound on that answer, and it is worth stating precisely.** Writing zero to a person
who holds no explicit allocation is vacuous — the expected string is already present before the
write. **This is not reachable at any current caller:** the only zero write in the suite is
`people-settlement.spec.ts:371` (`setAllocation(row, "Me", "0")`), and `Me` holds an explicit 50
from line 307 at that point, i.e. exactly row 1. So the barrier is sound today. It is a latent
weakness a future caller could step on, recorded below as a note rather than a finding.

**Every value the callers actually pass is exact — MEASURED.** The seven direct call sites pass
`50, 50, 0, -20, 50, 50, 25` and the `allocations:` shorthand passes `50, 30, 30, -20, 100`.
`displayPercentage` (`PersonAllocationCell.tsx:34-38`) renders a stored number as
`${String(value)}%`, so `Explicit: 50%.` and `Explicit: -20%.` match verbatim with no formatting
skew.

**The `c515173` correction works in the suite, not just in a probe — MEASURED.** Under `6061ef7` the
regression failed `people-settlement.spec.ts:281` step 11 in **10 of 10** runs. Under `c515173`,
step 11 failed **once in ten** (`/tmp/p20b07-c2/run6.log`) — and that failure is **not** at the
barrier:

```
at helpers/settlement.ts:419      (expectObligation, the $20.00 obligation row)
```

Both `setAllocation` barriers in that step passed; the failure is downstream and belongs to the
residual class. **The regression is closed.**

**`Effective` is not read by any assertion — MEASURED, as the dispatch's item 2 required.**
`grep -rn 'Effective' tests/` returns only the new JSDoc in `settlement.ts:182-183` and two unit
tests in `allocation-grid.test.tsx` (`:101`, `:114`) that assert the whole
`Explicit:…Effective:…Owner remainder:` template as a unit — correct usage, not an ambiguous read.
**One residual substring assertion does read a derived figure by accident; that is F-B.**

---

## 3. Campaign verification

### 3.1 Root's campaign at `/tmp/p20b07-c2/` — every figure re-derived, all correct

**I verified the campaign from its logs and its on-disk artifacts, and I name the path in every
claim.** Root's caution was warranted: `/tmp/p20b07-campaign`, `-campaign2` and `-final` are
superseded trees; **`/tmp/p20b07-c2/` is the live one** and is the only directory whose
`summary.log` ends `CAMPAIGN_COMPLETE`.

**Tree integrity — MEASURED, and stronger than root claimed.** All twenty START/END lines carry one
identical triple:

```
head=c515173 digest=0a6703e11a28 files=65a6ba3389ea
```

I re-derived it independently in **my own worktree** (`/tmp/mf-p20b07-rev`, created by
`git worktree add --detach`, `.env.local` copied in, `node_modules` **freshly installed** — never
`cp -a`): `digest=0a6703e11a28 files=65a6ba3389ea`. And `files=` computed in the **primary checkout
at `c66ddcd`** is also `65a6ba3389ea` — so the campaign's tree, my tree and the reviewed HEAD carry
byte-identical copies of the three files under test.

**Failure counts — MEASURED, counting only Playwright's numbered failure blocks.** The dispatch
warns that a bare grep for the spec path also matches passing `✓` lines; I used
`grep -cE '^  [0-9]+\) \[chromium\]'`:

| run    | 1   | 2   | 3   | 4     | 5     | 6   | 7   | 8   | 9   | 10  | total  |
| ------ | --- | --- | --- | ----- | ----- | --- | --- | --- | --- | --- | ------ |
| failed | 1   | 1   | 1   | **0** | **0** | 2   | 2   | 2   | 1   | 1   | **11** |

**11 failures / 10 runs = 1.10 per run; two green runs; the 10-consecutive-green bar is NOT MET.**
Every figure root reported reproduces exactly, including the per-site inventory (`:596` ×4, `:166`
×3, `:281` ×2, `:525` ×1, `transactions.spec.ts:572` ×1).

**An independent corroboration root did not run.** The number of copied artifact directories per run
matches the failure count per run exactly — `1,1,1,0,0,2,2,2,1,1` — so `summary.log` is confirmed by
the filesystem, not only by itself.

### 3.2 My own campaign — `/tmp/rev07-campaign/`

**MEASURED.** Four full-suite runs, `--retries=0 --workers=4`, `env -u CI`, from my own worktree at
`c515173` with freshly installed dependencies. Driver `/tmp/rev07-campaign/run.sh`, logs
`/tmp/rev07-campaign/run<N>.log`, artifacts copied out after every run.

| run    | 1   | 2   | 3   | 4       | total |
| ------ | --- | --- | --- | ------- | ----- |
| failed | 2   | 3   | 4   | **0**   | **9** |
| passed | 193 | 192 | 191 | **195** |       |

**9 failures / 4 runs = 2.25 per run. One fully green run (run 4, 195/195).** One unique digest
triple across all eight START/END lines, identical to root's. Artifact directory counts per run
(`2,3,4,0`) match the failure counts exactly.

**Sites — all in `people-settlement.spec.ts`:** `:596` ×2, `:281` ×2, `:197` ×2, `:145` ×2, `:166`
×1. **Zero non-settlement failures across 780 executions** — no F-2 in my sample.

**Three facts in this table matter more than the table:**

1. **The same byte-identical tree produced 1.10 failures/run for root and 2.25 for me.** That is a
   factor of two on `digest=0a6703e11a28`. **No rate comparison between campaigns in this goal
   supports any conclusion**, including the pre-fix 1.29/1.60 versus post-fix 1.10 comparison.
2. **My run 4 was fully green, 195/195.** A third agent has now independently produced a green run
   on a tree known to fail — the rev 06 reviewer's run 4, the implementer's run 2, and now mine.
   **At n=1 a green run is indistinguishable from a fix.**
3. **The failure shape is uniform.** 8 of my 9 failure snapshots render the terminal `settled` state
   ("Everyone is settled up"); the 9th (`:281` step 11, run 3) renders a **stale** obligation —
   `button "Bob Me $50.00"`, the step-5 value — where the post-step-11 reversal `$20.00` was
   expected. Both shapes are the same underlying thing: a fully hydrated, internally consistent
   vault missing an explicit allocation write.

### 3.3 The rate comparison — supports nothing, and the implementer is right to refuse it

The dispatch asked me to assess whether the rerun's number supports anything at all. **It does not,
and I can now show that with a control rather than argue it.**

| campaign                          | tree                  | failures/run |
| --------------------------------- | --------------------- | ------------ |
| rev 06 collector, pre-fix         | pre-fix               | 1.29         |
| rev 06 reviewer, pre-fix          | pre-fix               | 1.60         |
| root, post-fix, `/tmp/p20b07-c2/` | `digest=0a6703e11a28` | **1.10**     |
| **mine, post-fix, same tree**     | `digest=0a6703e11a28` | **2.25**     |

**The last two rows are the same commit, the same digest, the same `files=` hash, the same
`--retries=0 --workers=4 env -u CI` invocation — and they differ by a factor of two.** The
between-campaign spread on one fixed tree is larger than the entire pre-fix/post-fix gap. **No rate
comparison in this goal supports a conclusion in either direction**, and the implementer's refusal
to claim an improvement is not modesty, it is correct. Neither root nor this review claims one
either.

The failing membership continues to rotate: across every campaign in this goal at least **seven
distinct** settlement tests have failed (`:145`, `:166`, `:197`, `:281`, `:525`, `:559`, `:596`),
and tests that fail in one run pass in the next on a byte-identical tree.

### 3.4 The `next-env.d.ts` digest exclusion — sound in practice, with one stated limit

**MEASURED.** The driver computes
`{ git rev-parse HEAD; git diff -- . ':!next-env.d.ts' | md5sum; } | md5sum`. The exclusion is
justified: Next rewrites that generated file on every dev-server start, and Playwright's `webServer`
starts one every run.

**It cannot hide a real edit to the files under test**, because the driver additionally hashes those
three paths directly (`files=`), which is independent of both the exclusion and of git staging.
**Stated limit, INFERRED from the command's semantics:** `git diff` with no `--cached` compares
index to worktree, and never lists untracked files — so a _staged_ edit to some other tracked test
file, or a _new untracked_ file, would not move `digest=`. **I checked whether that mattered here
and it did not:** `git status --porcelain` in `/tmp/mf-p20b07` returns exactly ` M next-env.d.ts` —
nothing staged, nothing untracked. The campaign's tree is what it claims to be.

---

## 4. Manual product testing — MEASURED

Repository-installed `pnpm exec playwright-cli`, disposable session `p20b07rev`, headless, no
`--debug`/`--ui`/`--headed`/`show`, no Playwright MCP, no `npx`, no ad-hoc script or temp test file.
Dev server on `:3000` started from my own worktree `/tmp/mf-p20b07-rev`; **run before the campaign
claimed the port**, per the rev 06 ordering instruction. Session closed and `delete-data` run at the
end. **The human's `:3001` (pid 818182) was never touched** — verified by `ss -ltn` and
`readlink /proc/<pid>/cwd` before and after, and I killed only pids whose cwd was my own worktree,
verifying release by port state rather than by exit code.

**This diff changes no product code, so this matrix is a regression check, not a change check. I say
so rather than implying a stronger claim.**

| Clause                                                | Result                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| New identity by recovery phrase                       | **PASS** — 12 words issued, vault created, landed on `/settings`                                            |
| Acknowledgement gating                                | **PASS** — Continue `disabled` until the checkbox is checked                                                |
| People page, `no-qualifying` state                    | **PASS** — card renders; the new `settlement-summary` wait resolved **1 ms** after the h1                   |
| People page, `obligations` state                      | **PASS** — `settlement-currency-section-AUD`, "Bob \| Me \| A$50.00" (AUD is correct for the host TZ)       |
| Allocation entry through real grid cells              | **PASS** — see the three-state table in §2.3                                                                |
| Persistence across a full reload                      | **PASS** — obligation still "AUD Bob Me A$50.00" after `page.reload()`                                      |
| Accessible role / name / state of the changed control | **PASS** — `<button>`, accessible name `Edit Bob allocation`, `aria-describedby` present, not disabled      |
| Dark mode                                             | **PASS** — card `lab(7.79 …)` background with `lab(98.14 …)` text; correct polarity                         |
| Reduced motion                                        | **PASS** — `prefers-reduced-motion: reduce` matches                                                         |
| 320 px reflow                                         | **PASS** — `scrollWidth == clientWidth == 320`                                                              |
| 200% zoom at 1280×800                                 | **PASS** — `scrollWidth == clientWidth == 1280`, no overflow                                                |
| Console hygiene                                       | **PASS** — 5 messages, **0 errors, 0 warnings**                                                             |
| Network hygiene                                       | **PASS** — 773 requests: **539× 200, 234× 304, zero 4xx, zero 5xx**                                         |
| Secrets in URLs                                       | **PASS** — no auth or seed material in any query string; only `_next`, `__nextjs`, `favicon` and `api/trpc` |

**Secret safety.** The flow displayed a real 12-word recovery phrase for a throwaway vault. It is
not recorded in this file, in any log, or in any message. No file under the principal's
`~/Downloads` was opened or referenced.

**NOT covered, stated rather than implied:** passkeys, the two-user invite/presence/realtime flow,
automations drift/apply-all, alias change-all, and multi-tab convergence. These retain automated
coverage; I do not claim a manual pass over them.

---

## 5. The claim I was asked to judge: is the implementer's account accurate?

**Yes, and I reproduced its central, self-damaging finding independently.**

The revision was routed here from `reviews/P21-review-06.md` F-1, whose diagnosis was that the
settlement failures are a **pre-hydration transient**: `buildSettlementView` returns
`no-qualifying-transactions` before hydration and `BalanceSummary` then renders no currency section,
so the assertion times out at 5 s on an element that genuinely does not exist yet.

**That diagnosis is wrong, and the discriminator is structural rather than interpretive.** MEASURED
from source at `settlement-view.ts:186-193`: the `settled` state is returned only when
`obligations.length === 0` **and** `qualifyingTransactionCount !== 0`, and that counter is
incremented at `settlement.ts:1227` **after** `commitCalculation`. **A page showing "Everyone is
settled up" has therefore already hydrated the transaction and run the settlement engine on it.** It
is a terminal answer, not a transient. No timeout can fix it.

**MEASURED — this is what the failures actually show.** Both of my run-1 failures, from my own
worktree and my own dependency install:

```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('settlement-currency-section-USD')
Timeout: 15000ms                       <- the fix is active
Error: element(s) not found
  - text: Settlement Summary No outstanding balances between members.
  - paragraph: Everyone is settled up  <- the TERMINAL settled state
```

Root's run-8 `:596` artifact shows the same, with all three people present and sync status "Saved".

**Second refutation — the arithmetic identifies exactly which write is missing, and it
discriminates.** INFERRED from `allocation.ts:259` (`ownerRemainder = 100 − explicitTotal`) applied
to each failing test's own setup, but the inference is sharp because the rival hypothesis predicts a
different observable:

| test   | setup                                | if the **explicit allocation** is absent      | if the **ownership** write were absent instead |
| ------ | ------------------------------------ | --------------------------------------------- | ---------------------------------------------- |
| `:145` | Me owns 100%, explicit Bob 30        | remainder 100% → Me pays all → **settled**    | n/a (no ownership step)                        |
| `:166` | Me 60 / Bob 40, explicit Charlie 30  | remainder split 60/40 to owners → **settled** | Charlie owes Me $30 → an **obligation**        |
| `:197` | Me owns 100%, explicit Bob −20       | remainder 100% → **settled**                  | n/a                                            |
| `:281` | explicit Me 50 + Bob 50              | Me absorbs all → **settled**                  | n/a                                            |
| `:596` | Me 50 / Bob 50, explicit Charlie 100 | remainder split 50/50 → **settled**           | Charlie owes Me $100 → an **obligation**       |

**Only the missing-explicit-allocation hypothesis produces `settled` in every case.** A missing
ownership write predicts a visible obligation, which is not what any artifact shows. So the people,
the transaction, the amount, the Treat-as-Paid status and the account ownership all landed; **the
one thing missing is the explicit allocation entered through the grid cell.**

**Third refutation — the transient rev 06 posited is ~10 ms wide. MEASURED.** I instrumented
hydration from document start (`page.addInitScript` installing a 10 ms sampler before any page
script runs, so the instrument can contain the event) on a vault that genuinely holds an obligation,
under CDP `Emulation.setCPUThrottlingRate`. Seven cold navigations, three at 20× and four at 30×:

| throttle | navigations | first card  | first currency section  | samples with card but no section  |
| -------- | ----------- | ----------- | ----------------------- | --------------------------------- |
| 20×      | 3           | 3.27–4.02 s | same sample as the card | **0**                             |
| 30×      | 4           | 4.82–4.97 s | same sample as the card | **1** (one 10 ms sample, one run) |

**In 6 of 7 navigations the card and the currency section appeared in the same 10 ms sample, and
`settlement-no-qualifying` was never observed at all.** In the seventh it was observed for a single
sample — **a window of ≤10 ms against a 4.97 s load.** The failures hold a stable terminal state for
the full **15,000 ms**. The posited transient is real but three orders of magnitude too narrow to be
the mechanism. **Every settlement failure I examined — mine and root's — is a fully-hydrated,
internally consistent render of a vault missing exactly one explicit allocation write**, with the
instrument correctly reporting that absence at a 15 s budget.

So the implementer's summary is exactly right, including the parts against its own interest: the 5 s
defect was real and is closed; the barrier was weak and is now strong; **neither explains the
failures**; and it killed its own substring hypothesis by printing the DOM instead of reasoning
about it (evidence §4.3c). It also disclosed an instrument failure of its own (evidence §6 — **not**
this review's §6, which is Findings) that had pointed the convenient way. **I found no place where
the evidence over-claims. Its error is omission, not overstatement.**

**Consequence root should weigh, stated as a routing observation and not as a finding:** if the
residual class is not test-instrument, then it is not P20B's. `PROCESS.md:130` routes
allocation/settlement ownership to P16A–E, or P17A–D when the automation path owns the defect.
Continuing to route this class to P20B would repeat the misclassification that produced this
revision.

### 5.1 Root's "one class of lost or late writes" hypothesis — assessed, not adopted

Root recorded, explicitly as unproven, that the settlement failures and the newly reproduced F-2 may
be one class. **I can neither confirm nor refute it, and here is exactly what my evidence
licenses.**

**Consistent with it — MEASURED.** I verified root's F-2 artifact at `/tmp/p20b07-F2-repro/`: the
failing assertion is `transactions.spec.ts:654`, which sits immediately after `page.reload()` at
`:653`, and reads `Expected "52 transactions" / Received "Add transaction51 transactions"`, stable
across 29 re-resolutions over 15 s. A Redo at `:645` had just been observed producing 52. So F-2's
signature here is **a write acknowledged in live state and absent after a page load** — the same
shape as the settlement failures, which lose one allocation across `goToPeople`'s `page.goto`.

**A new datum this revision makes available, which root should note — MEASURED.** My run 3 failed
`:281` step 11 with a **stale** obligation (`button "Bob Me $50.00"` where the reversal `$20.00` was
expected). Step 11 performs `setAllocation(row, "Me", "0")` and `setAllocation(row, "Bob", "-20")`,
and the test reached `goToPeople` — **so both writes passed the new, strengthened `Explicit:`
barrier.** Under the old substring barrier that would have proved little; under this one it means
the cell's `Explicit:` clause — which is driven by `hasOwnProperty` on the allocations map
(`PersonAllocationCell.tsx:59,73`) — positively reported `not stored` for Me and `-20%` for Bob
immediately before the navigation, and neither survived it. **The hardened barrier has turned a
vague flake into a sharper question**, which is a real dividend of this change even though the
change does not fix the class.

**Not established, and here is the gap.** The barrier reads the _rendered_ cell, i.e. the
loro-mirror projection of the CRDT document — **not** what reached IndexedDB. "Acknowledged in local
state" is therefore not "durably written", and that is exactly the distinction the mechanism turns
on. The two write paths also differ materially: the settlement failures lose an _allocation map
entry inside a transaction_; F-2 loses a _transaction row_ produced by an undo-stack replay. A
shared symptom across two different write paths is a hypothesis, not a class. **I did not measure
the mechanism, and in particular I did not discriminate a lost write from a rehydration/derivation
gap — that is the experiment worth running next, and it decides the routing.** I did not attempt it:
F-2 is deliberately unowned and out of this package's scope.

**One thing I can settle:** root's note that the reproduced F-2 signature differs from the ledger's
recorded one ("stable wrong `data-index`", "stable 499 where 500 is asserted") is **correct** — the
reproduction is a post-reload count, not a virtualization artifact. The ledger's F-2 description
should not be treated as characterising this reproduction.

---

## 6. Findings

### F-A — BLOCKING. The evidence does not contain the campaign for the commit being handed back.

- **Severity:** High (blocking) · **Category:** Requirements / evidence completeness
- **File:** `specs/007-human-scratch-completion/evidence/P20B/implementation-08.md`

**Finding — MEASURED, five separate defects in one artifact:**

1. **Line 170.** §4 "Campaign results" is the literal token `PLACEHOLDER-CAMPAIGN`. **The validation
   campaign for `c515173` — the entire basis on which this revision can be judged — is absent.**
2. `grep -n '0a6703e11a28\|65a6ba3389ea\|p20b07-c2' <evidence>` → **no match.** Neither the
   validated tree's digest, nor its `files=` hash, nor its log path appears anywhere in the file.
3. **§4.2b is cross-referenced at lines 247 and 588 and does not exist.**
   `grep -n '^### 4' <evidence>` lists no such section.
4. **Line 247** names `FINAL tree 5bdd30322604 files=e53e6e7e0bd5 (the campaign reported in §4.2b)`.
   **Line 236 of the same file discards that campaign** ("All prior runs are discarded as validation
   evidence — the 2 on `2dcac604bc4e` and the 1 on `5bdd30322604`"). The evidence therefore names as
   FINAL a tree it elsewhere discards, and never names the tree it actually validated.
5. **Line 649.** §4.4's header reads "Static checks — all at the handback commit `6061ef7`". **The
   handback commit is `c515173`.**

**Why it is real rather than pedantic.** `stat` gives the file mtime as **2026-08-03 10:17:27
+1000** — inside run 1 of the very campaign it was to report (run 1 ended 10:17:19, run 10 at
10:59:09). The artifact was frozen before its own evidence existed. `PROCESS.md:158` requires the
evidence to record "commands/results"; `PROCESS.md:58` has root persist this file **unchanged**
alongside the verdict; `PROCESS.md:359` has recovery read artifacts rather than chat. Persisted as
it stands, the durable record of this revision is a placeholder plus a contradicted tree identity.

**Mitigation, stated in fairness to the implementer.** Root independently re-derived the campaign
and committed it to `PROGRESS.md:11584-11605` in `9a1b5e2`, and **I verified every one of those
figures is correct** (§3.1). The goal's ledger is sound. The implementer's own artifact is not, and
that artifact is the one thing `PROCESS.md:12` grants it.

**Fix (mechanical — the substance already exists in PROGRESS):** revision 08 completes §4 with the
`c515173` campaign — per-run failure table counted from `^  [0-9]+\) \[chromium\]` blocks only, the
single digest triple, the log path `/tmp/p20b07-c2/`, the per-site inventory and the distinct-test
count; retracts or removes the two `§4.2b` references and the stale "FINAL tree `5bdd30322604`"
line; and corrects §4.4's commit reference to `c515173`.

### F-B — MEDIUM. The one assertion that verifies allocation persistence cannot fail on a lost allocation.

- **Severity:** Medium · **Category:** Test gap
- **File:** `tests/e2e/people-settlement.spec.ts:344-347`

**Finding.** Step 9 of the mandatory journey is named _"reload and verify allocations and settlement
persist"_. Immediately after `await page.reload()` it asserts:

```ts
await expect(reloaded.getByRole("button", { name: "Edit Bob allocation" })).toContainText("50%");
```

This is the **exact substring weakness this revision removed from `setAllocation`**, left in place
at the one call site whose declared purpose is to prove the allocation survived a page load.

**MEASURED, in a real browser against a real vault — I built the state the failure would produce and
printed the cell rather than reasoning about it.** With `Default` owned by Me 100%, Me holding an
explicit 50 and **Bob's write absent**:

```
Bob's cell: "— Explicit: not stored. Effective: 0%. Owner remainder: 50%."
                                                    ^^^^^^^^^^^^^^^^^^^^  contains "50%"
```

**The assertion passes on a vault in which Bob's allocation was never persisted.** The 50% it
matches is the _owner remainder_ — a derived figure that exists precisely _because_ the write is
missing.

**Bound, stated so this is not over-read:** the next two lines (`goToPeople` +
`expectObligation($50.00)`) do still catch the loss, so no defect escapes the suite. What is lost is
**localisation**: a lost allocation is reported at a settlement assertion rather than at the
persistence assertion four lines earlier — which is precisely the misattribution that produced rev
06's "the settlement helper is at fault" diagnosis and routed this work to P20B.

**Fix:** assert the `Explicit:` clause, matching the helper this revision just hardened —
`toContainText("Explicit: 50%.")`.

### F-C — MEDIUM. A repo-wide E2E default changed and no `.claude` guidance records it.

- **Severity:** Medium · **Category:** Pattern violation
- **Files:** `playwright.config.ts:65` (the change) and `.claude/skills/e2e/SKILL.md` (not updated)

**Finding.** `CLAUDE.md` lists under **Critical Rules**: _"Keep `.claude/` files updated alongside
code changes."_ This change sets a repo-wide `expect` timeout of 15 s where Playwright's default was
5 s, and **MEASURED**, `grep -rn 'expect.*timeout\|15_000\|5s default' .claude/` returns no hit in
any skill or rule file. `.claude/skills/e2e/SKILL.md` is the file that documents E2E waiting
conventions ("No arbitrary waits") and is silent on this.

The consequence is not cosmetic and the implementer measured it itself (§3.4): **115
`toHaveCount(0)` absence assertions carry no explicit timeout**, so a genuinely failing one now
costs 15 s instead of 5 s, and two failing bare assertions in one test can exhaust the 30 s test
budget and report a less precise error. A future agent writing an absence assertion has no way to
learn this from the guidance files.

**Precedent, MEASURED:**
`f2b1a9f fix(P20B): activate dark mode, repair grid a11y and retire dead UI` updated
`.claude/skills/crypto/SKILL.md` alongside its code — this convention is live in this goal and in
this package.

**Fix:** add a short note to `.claude/skills/e2e/SKILL.md` recording the 15 s `expect` default, that
explicit per-assertion timeouts still override it (the 12 deliberately-short probes are unaffected),
and the cost it imposes on genuinely failing absence assertions.

---

## 7. Notes that are not findings

- **The zero barrier is vacuous when the target holds no explicit allocation** (§2.3 row 3,
  MEASURED). Not reachable at any current caller, so not a finding. If a future revision adds a
  `setAllocation(row, X, "0")` where `X` holds nothing, that barrier will pass without the write
  landing. A guard would be to assert the pre-write cell differs from the expected post-write text.
- **The new barrier asserts literal copy.** `.claude/skills/e2e/SKILL.md` says "assert behaviour,
  not text". `Explicit:` is nonetheless the right choice: it is the **only** field in that cell that
  reflects stored state, the alternative is proven weaker, and
  `tests/unit/transactions/allocation-grid.test.tsx` asserts the same template, so a copy change
  breaks both together rather than silently. No action.
- **The digest limit in §3.4** is a method note for future campaigns, not a defect in this one.

---

## 8. Reviewer checkpoint — what I could not complete

Stated rather than omitted:

- **`pnpm build` not re-run** at `c515173`. The diff contains no product code and typecheck is
  clean; the evidence records the build green at `6061ef7`.
- **Multiple-tab and offline matrix clauses not exercised manually.** No product code changed and
  the campaign covers them automatically; I do not claim a manual pass.
- **Computed contrast ratios not calculated.** No changed focus/error/status/text control exists in
  this diff — the change is test-instrument only. I recorded the changed control's colours and dark
  /light polarity instead, and say so rather than reporting a ratio I did not compute.
- **The residual failure mechanism is unmeasured** (§5.1), deliberately: it is out of scope.

---

## 9. Proposed questions

I endorse all five of the implementer's proposals (`Q-P20B-07-01` … `-05`) for transcription. Two of
them need a correction root should carry across rather than transcribe verbatim:

- **`Q-P20B-07-04` is superseded by the implementer's own §4.3c and should be transcribed with that
  retraction attached.** It states the substring barrier "can pass without the explicit allocation
  being stored". §4.3c refutes that for all three failures it examined, and my §2.3 measurements
  agree: the mechanism is real in principle but did not occur. Transcribing it unqualified would
  re-seed a hypothesis this revision paid to kill.
- **`Q-P20B-07-02`'s premise is narrower than it reads.** It says the `goToPeople` content wait is
  defence in depth because the vault is already selected when the h1 resolves. That was measured on
  an idle machine; the **structural** gap is real (`people/page.tsx` renders the h1 unconditionally
  and `PeopleTable` only when `activeVault?.id`), so the wait is worth keeping on its own merits.

### Q-PROPOSAL-P20B-07-1 — Should the residual settlement class be re-routed off P20B?

- **Raised by/package/revision:** `p20b-reviewer-07` / P20B / 07
- **Context and evidence:** rev 06 routed this class to P20B as a test-instrument defect (F-1).
  Three independent lines of evidence now contradict that classification: the failing pages render
  the **terminal** `settled` state, which `settlement-view.ts:186-193` reaches only after
  `qualifyingTransactionCount` is incremented **post-`commitCalculation`** (§5); the arithmetic
  discriminates a missing **explicit allocation** from every rival (§5, second refutation); and the
  pre-hydration transient rev 06 posited is **≤10 ms wide** against failures that hold for 15,000 ms
  (§5, third refutation). Both instrument defects the routing named are now fixed and the class
  persists at 1.10/run (root) and 2.25/run (mine) on the identical tree.
- **Why existing authority does not decide it:** `PROCESS.md:130` routes allocation/settlement
  ownership to P16A–E, or P17A–D for the automation path, and cross-cutting _style_ defects to P20B.
  It gives no rule for a class routed to P20B on a diagnosis that the P20B revision then refuted.
- **Options considered:** (a) keep it on P20B and continue looking for an instrument cause; (b)
  re-route to P16A–E as an allocation-persistence defect; (c) open it as an unowned tracked risk
  beside F-2 pending a mechanism measurement.
- **Reversible default selected to continue:** **(c)** — the mechanism is not measured, and F-2's
  history in this goal shows that assigning an owner on an unmeasured mechanism is what produces
  wasted revisions.
- **Decision-hierarchy basis:** 2 (established repository convention — the contract's own warning
  against routing to a default package to avoid invalidating a prior PASS), then 4 (smallest
  reversible step).
- **Impact and risk:** continuing to route this class to P20B risks a third revision that fixes real
  instrument defects and does not close the class, as this one and rev 06 both did.
- **Reversal or migration path:** a single discriminating experiment decides it — read the persisted
  IndexedDB state after a barrier-confirmed allocation write and a navigation. If the entry is
  absent, it is a lost write (P16A–E); if present but unapplied, it is rehydration.
- **Human review still useful after completion:** yes — this is the second consecutive audit cycle
  blocked on this class.

### Q-PROPOSAL-P20B-07-2 — Should evidence artifacts be forbidden from being frozen before the campaign they report?

- **Raised by/package/revision:** `p20b-reviewer-07` / P20B / 07
- **Context and evidence:** F-A. `implementation-08.md` was last written at 10:17:27, inside run 1
  of a campaign that ended at 10:59:09, leaving §4 as `PLACEHOLDER-CAMPAIGN`, two dangling `§4.2b`
  references and a "FINAL tree" line that a later section discards. `PROCESS.md:58` persists the
  file unchanged, and `PROCESS.md:359` makes artifacts the recovery source.
- **Why existing authority does not decide it:** `PROCESS.md:153-159` lists what evidence must
  record but sets no ordering constraint between handback and the campaign the evidence depends on.
- **Options considered:** (a) require the implementer to hand back only after every artifact it
  cites exists; (b) allow handback with a named pending section and require root to withhold
  dispatch until it is filled; (c) leave it to review to catch, as happened here.
- **Reversible default selected to continue:** **(a)** — a one-line addition to the implementer
  checkpoint, no process restructuring.
- **Decision-hierarchy basis:** 2 (repository convention), then 4.
- **Impact and risk:** low; it costs the implementer a wait it was already going to spend.
- **Reversal or migration path:** delete the sentence.
- **Human review still useful after completion:** no.

---

## 10. Hygiene

- **Port `:3000`** claimed for the manual session, released, re-claimed by my campaign's
  `webServer`, and released again. **`:3001` never touched**; verified by `ss -ltn` plus
  `readlink /proc/818182/cwd`. No bare `pkill -f` — I killed by pid after resolving
  `/proc/<pid>/cwd` and verified release by port state.
- **No destructive database command was run.** No `pnpm db:reset`, no migration, no schema command.
- **Shared checkout respected.** No `git stash`, no `git checkout --`, no `git add -A`. I committed
  nothing. My worktree is `/tmp/mf-p20b07-rev`; scratch lives in `/tmp`, never inside the repo.
- **I wrote exactly one file:** `specs/007-human-scratch-completion/reviews/P20B-review-07.md`.
- **Artifacts preserved for root:** `/tmp/rev07-static.log`, `/tmp/rev07-campaign/` (driver, four
  run logs, per-run artifacts, `summary.log`). Root's `/tmp/p20b07-c2/` and `/tmp/p20b07-F2-repro/`
  were read, never modified.

---

# VERDICT RESTATED

# FAIL

**On F-A.** The two code changes are correct, controlled and safe; the implementer's account of them
is accurate and its refusal to claim a cause it could not prove is the right call, which I
independently reproduced. The unmet 10-green bar is **not** a reason to fail this work. The evidence
artifact not containing the campaign for the commit being handed back **is**, and F-B and F-C are
cheap in-scope fixes that belong in the same revision.

**Recommended scope for revision 08**, in effort order: complete §4 of the evidence from the figures
root already holds in `PROGRESS.md:11584-11605` (F-A); change one assertion at
`people-settlement.spec.ts:347` to read the `Explicit:` clause (F-B); add a short `expect`-timeout
note to `.claude/skills/e2e/SKILL.md` (F-C). **Do not re-run the campaign for revision 08** — the
tree is unchanged by all three, the `files=` hash will not move, and `/tmp/p20b07-c2/` plus
`/tmp/rev07-campaign/` already carry fourteen runs on it.

**And do not ask revision 08 to close the settlement class.** On my evidence it is not a
test-instrument defect, and asking P20B to fix it a third time is how this goal has already spent
two revisions.
