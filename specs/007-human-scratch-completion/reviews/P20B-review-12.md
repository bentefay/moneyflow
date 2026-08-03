# P20B revision 12 — independent review

- **Reviewer:** `p20b-reviewer-12`. Distinct from `p20b-implementer-12` and from every prior P20B
  reviewer (`-01`, `-02`, `-03`, `-06` … `-11`). I authored none of this code.
- **Date:** 2026-08-03.
- **Verdict: FAIL** — one **Medium** finding, **F12-1**, in the committed comment text. One clause.
  Everything else in this revision is sound and independently confirmed.

**Reading convention.** Every claim is tagged **MEASURED** — I ran the command in this session and
report its output — or **INFERRED**. A bare `§` points at a section of **this** file; every
reference to another document names that document first. Logs are under
`/home/ben-agents/p20b-rev12-review-logs/`, outside the repository; my worktree is
`/home/ben-agents/mf-p20b-rev12-review`, also outside the repository.

**Line-number convention.** Unless stated otherwise, **every `passkey.spec.ts:NNN`,
`persistence.ts:NNN` and `local-persistence-seam.ts:NNN` in this file is numbered at `d80f0e4`** —
the tree I reviewed, after the new comment pushed everything below `:61` down by four.

---

## 1. Range, ancestry and drift — re-derived, not carried

| Item                                              | Value                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Assigned BASE / HEAD                              | `1eeb380` / `d80f0e4`                                                                              |
| **Effective range**                               | `69e557e..d80f0e4` — root's ledger commit `69e557e` is the true parent                             |
| `git merge-base --is-ancestor d80f0e4 HEAD`       | **exit 0** — MEASURED, `d80f0e4` **is** an ancestor of HEAD                                        |
| `git rev-parse HEAD` at review time               | `4a67e52` — moved by root's ledger commits, which is expected and not an acceptance failure        |
| `git diff --name-only d80f0e4..HEAD -- src tests` | **empty** — MEASURED                                                                               |
| `git diff --name-only d80f0e4..HEAD` (all)        | `PROGRESS.md`, `RISKS.md` — root-owned control files only                                          |
| **Tree digest at `d80f0e4`**                      | **`59ded0a21ad08d3ed53f596eb0789915`** — MEASURED, matches `evidence/P20B/implementation-13.md` §0 |

**`PROCESS.md:45-46` pass-meaning item 2 is satisfied**, MEASURED: the reviewed product/test HEAD is
unchanged and only root-owned control files changed after the commit. I did **not** apply string
equality against `git rev-parse HEAD`.

MEASURED, `git show --stat 69e557e` is one file, `PROGRESS.md`, +38 lines — so the effective range
carries exactly one authored file.

## 2. The diff — confirmed, not repeated

MEASURED, and re-derived by me rather than inherited:

- `git diff --name-only 69e557e..d80f0e4` → **`tests/e2e/passkey.spec.ts`**, and nothing else.
- `git show d80f0e4 -U0 | grep '^[+-]' | grep -v '^[+-][+-]' | grep -vE '^[+-]\s*//'` → **0 lines**.
  Every added and removed line is a `//` line.
- `src/` untouched; `tests/e2e/helpers/persistence.ts` untouched, **including its retry-on-absence
  branch** at `persistence.ts:71-77`.

**INFERRED from the above, and it is a deduction rather than a hedge:** the two trees compile to the
same test program, so no execution can distinguish them.

## 3. Verification — all gates run in my own worktree at `d80f0e4`

| Gate                                                               | Result                                                                                      | Log                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------ |
| `pnpm typecheck`                                                   | **clean**, exit 0                                                                           | `typecheck.log`                |
| `pnpm lint`                                                        | **0 errors, 1 warning** — pre-existing `TransactionTable.tsx:459:25`, file not touched here | `lint.log`                     |
| `pnpm exec oxfmt --check tests/e2e/passkey.spec.ts`                | **"All matched files use the correct format"** — scoped to the changed file only            | —                              |
| `pnpm test` ×4                                                     | **not clean** — see §3.1                                                                    | `unit*.log`                    |
| E2E `passkey.spec.ts` + `identity.spec.ts` ×2 at `--repeat-each=3` | **63 passed / 63 passed**, 0 failure markers, 126 executions                                | `e2e-run1.log`, `e2e-run2.log` |

E2E runs used `env -u CI`, `--retries=0`, `--reporter=line`, the repository's **unmodified**
`playwright.config.ts` on `:3000` with no port override, no `--debug`/`--ui`/`--headed`/`show`.
Digest measured at START and END of each run: `59ded0a2…` both times — **no tree drift**. Failure
markers counted with `grep -cE '^ +[0-9]+\) '`, not the word "failed".

### 3.1 Unit suite — two pre-existing failures, MEASURED, and unattributable by deduction

Four full `pnpm test` runs, serialized, with no E2E running beside them (load average 0.15 at
start):

| Run | Result                 | Failing files                                                                     |
| --- | ---------------------- | --------------------------------------------------------------------------------- |
| 1   | 1 failed / 2491 passed | `tests/unit/import/duplicates.test.ts`                                            |
| 2   | 2 failed / 2490 passed | `duplicates.test.ts` **and** `tests/integration/realtime-origin-controls.test.ts` |
| 3   | 1 failed / 2491 passed | `realtime-origin-controls.test.ts`                                                |
| 4   | 1 failed / 2491 passed | `realtime-origin-controls.test.ts`                                                |

- **`duplicates.test.ts`** — MEASURED,
  `AssertionError: expected 4.136338918399191 to be less than 4` and
  `expected 4.18069987795276 to be less than 4`. A wall-clock ratio assertion, marginal against its
  own threshold. MEASURED, in isolation the file passes **43/43** in 1.68 s.
- **`realtime-origin-controls.test.ts`** — MEASURED, `Error: Test timed out in 5000ms` at
  `realtime-origin-controls.test.ts:126`, the hostile-origin case. Failed in **3 of my 4** runs.

**Neither is attributable to this revision, and this is a deduction rather than a judgement call.**
MEASURED from `vitest.config.ts`, `test.include` is `["tests/**/*.test.ts", "tests/**/*.test.tsx"]`
— the single changed file is `tests/e2e/passkey.spec.ts`, a `.spec.ts`, which **vitest never
loads**. Combined with §2's "exactly one changed file", the code vitest executes is byte-identical
at `69e557e` and `d80f0e4`.

I record these as **flags for root**, not as findings against this revision. I did not smooth them
and I am not dismissing them: `realtime-origin-controls.test.ts` failing 3 of 4 is a materially
higher rate than "intermittent" conveys, and root may want that rate in the register. I did not
attempt a fix; it has no import path into this package.

## 4. Manual `playwright-cli` checkpoint — run, and honestly scoped

**Completed, not skipped.** `pnpm dev -p 3000` from my worktree
(`/home/ben-agents/mf-p20b-rev12-review`, cwd distinct from the shared checkout, so Next 16's
project-directory dev lock did not collide); session `p20brev12rev`; closed with `close` +
`delete-data`; dev server killed by pid **1091110** after MEASURED `readlink /proc/1091110/cwd` = my
worktree. MEASURED after the kill: `:3000` released from `ss -ltn`; `:3001` still LISTEN and pid
818156 (cwd `/home/ben-agents/Code/moneyflow`) alive — **the human's server was never touched**.

**Most of the `PROCESS.md:172-176` matrix is vacuous for this diff and I say so rather than
manufacture evidence.** There is no changed control, no changed style, no changed markup and no
changed behaviour — §2 measured zero executable changed lines. Responsive sizes,
dark/reduced-motion, zoom/reflow and computed contrast have no changed subject to be evidence
_about_. I ran the parts that still have a subject:

| Check                | Result — all MEASURED                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/unlock` renders    | Snapshot resolved; `button "Unlock Vault" [disabled]`, `generic: 0 of 12 words entered`, 12 `textbox "Word N"` |
| Console              | **Total 2 messages, 0 errors, 0 warnings** — React DevTools notice and `[HMR] connected` only                  |
| Requests             | 39 static + 1 wasm, **all 200**; no failed or suspicious request                                               |
| Reload / persistence | Reloaded to `/unlock`, **0 errors, 0 warnings**; word fields correctly cleared                                 |

**Accessible state evidence for the control the reported flake names.** MEASURED via `eval`-class
`run-code`, not a whole-page snapshot: after filling `recovery-phrase-credential` with twelve
**dummy non-BIP39** words,
`{counter: "12 of 12 words entered", w1: "alpha", w2: "bravo", unlockDisabled: true, text: "Unlock Vault"}`.
So the credential field's `fill()` **does** normally spread into the twelve `seed-word-input-N`
boxes, and the button correctly stays disabled for invalid words. This independently corroborates
the implementer's flake mechanism at `evidence/P20B/implementation-13.md` §4.3 — the concatenated
single-token landing is a failure of a spread that demonstrably works on the happy path. Expected
role/name/state: `button` / "Unlock Vault" / disabled-until-valid; observed exactly that.

**Security — `RISKS.md#R-SNAPSHOT-PHRASE-01`.** I never visited `/new-user` and generated no phrase.
I scanned **every** CLI artifact for **both** hazard shapes before reading any of it — a 12-word
lowercase run **and** a single lowercase token of 40+ characters: MEASURED **0 and 0** across all
three files. I then deleted the artifacts. I echo, quote and commit no credential field anywhere. I
note that the `/unlock` snapshot does carry the credential field as an accessible value
(`textbox [ref=e26]: MoneyFlow recovery phrase` when empty), which confirms the hazard mechanism
from a safe state.

## 5. The implementer's proportionality argument — I judge it SOUND

`evidence/P20B/implementation-13.md` §4 argues that with zero non-comment lines no execution can
distinguish this tree from its parent, so a full-suite campaign adds runtime without adding
discriminating power. **I agree, and I verified the premise myself rather than accepting it** (§2: 0
non-comment lines, one file, measured by me). A full-suite campaign here would establish only the
suite's own background flake rate, which is a property of the tree the parent's campaigns already
measured — and per this goal's own record, cross-campaign flake-rate comparisons support nothing. I
therefore did **not** require one, and I did not run one.

**On the 1-in-315 flake at `passkey.spec.ts:162`/`:187`:** reported, not a finding, per the
dispatch. I did not reproduce it in my 126 executions. I add only the §4 corroboration above.

## 6. My own instrumented measurement — where F12-1 comes from

In my worktree only, I added a **non-asserting** probe to `awaitVaultPersistence` recording, per
entry: the calling spec frame, the pathname, whether the seam was present on the **first**
iteration, the **iteration count**, the final outcome and elapsed ms. Instrumented digest
`fe098dd7109afc7739055819e1167cf1`; **restored afterwards** to `59ded0a21ad08d3ed53f596eb0789915`
with `git status --porcelain -- src tests` empty. The shared checkout was never modified. Run:
`tests/e2e/passkey.spec.ts --retries=0 --repeat-each=3` → **36 passed**, log
`/home/ben-agents/p20b-rev12-review-logs/instrumented-passkey.log`.

Entry counts match the call graph exactly — **12 entries at `passkey.spec.ts:66`** is 4 callers × 3
repeats — which is what confirms the frame attribution.

**All 12 entries at `passkey.spec.ts:66`, the line the new comment annotates:**

| Path at completion | Seam on iteration 1 | Iterations  | Final outcome            | Elapsed              | Count |
| ------------------ | ------------------- | ----------- | ------------------------ | -------------------- | ----- |
| `/settings`        | present             | 1           | `persisted`              | 1–2 ms               | **6** |
| `/settings`        | present             | 1           | `no-active-vault`        | 4–5 ms               | **3** |
| **`/unlock`**      | **absent**          | **3, 3, 6** | `absent-off-vault-route` | **110, 112, 283 ms** | **3** |

**The third row is deductively pinned, not guessed.** An entry whose first iteration were
`absent-off-vault-route` would have returned at `iterations=1` (`persistence.ts:73`). These show
`iterations` of 3 and 6, so iteration 1 returned a non-null failure; `firstSeamPresent=false`
excludes the `threw` branch; therefore iteration 1 was **`absent-on-vault-route`**
(`persistence.ts:74-77`). **INFERRED mechanism:** the `sessionStorage.clear()` immediately before
each call (`passkey.spec.ts:152`, `:176`, `:219`, `:263`) triggers the app's redirect to `/unlock`,
so the barrier runs during a `/settings` → `/unlock` teardown — provider gone, seam gone — and
terminates only once the pathname leaves the `(app)` routes.

This is the same class review-11 measured independently: `reviews/P20B-review-11.md` §6 records
**seam absent on 4 of 12** entries at this site. Two independent datasets, 3/12 and 4/12.

## 7. Findings

### F12-1 — Medium — Requirements — `tests/e2e/passkey.spec.ts:65` (at `d80f0e4`)

**The comment's closing clause is measurably false for a quarter of the entries at the line it
annotates.** It reads:

```
// ... The barrier is in the helper so the live
// case is covered on all four; where no vault is mounted it resolves as a no-op.
```

The preceding clause partitions the callers into those that "have a live vault at that instant" and
those that do not, and this clause then assigns _no-op_ to the whole complement. MEASURED (§6), the
complement at this line has **two** members, and the clause is true of only one:

- **seam present, `readActiveManager()` null** → `no-active-vault`, one iteration, 4–5 ms. A genuine
  no-op. **3 of 12.** This is the case the clause describes, and its source citation is **correct**
  — I verified both halves: `src/lib/sync/local-persistence-seam.ts:66` returns `"no-active-vault"`
  without throwing, and `tests/e2e/helpers/persistence.ts:79-84` plus `:89` treat a non-throwing
  return as done.
- **seam absent on an `(app)` route** → **not a no-op**: the retry loop at `persistence.ts:71-77`,
  `:92-93` iterates 3–6 times over **110–283 ms**, and resolves only because the page has navigated
  off the `(app)` routes. Had the page stayed put, `persistence.ts:96-98` would throw after the
  15,000 ms budget. **3 of 12** here, **4 of 12** in `reviews/P20B-review-11.md` §6.

So the measured behaviour at this line has **three** cases and the comment offers **two**, mapping
the unmentioned third onto the wrong one.

**Why this is the class under remediation, not a style nit.** F11-1 failed rev 11 because a comment
asserted a universal that measurement refuted. This revision's sole deliverable is a comment that
claims only what is measured. `evidence/P20B/implementation-13.md` §2.1 scopes the clause correctly
in its own reasoning — its basis row cites precisely the `no-active-vault` outcome — but the
committed text carries none of that scoping to its reader, and the unscoped reading is the one a
next author gets. The consequence is concrete: this is the helper whose 15-second hang
`reviews/P20B-review-10.md` §4.4 identified as the hazard of barriering a site where the seam can be
genuinely absent, and a reader who believes the absent case is free is exactly the reader who would
simplify away the retry branch this goal has twice ruled load-bearing.

**In fairness, there is a narrow reading under which the clause is true** — mapping "no vault is
mounted" onto the seam's own `no-active-vault` outcome literal, as `reviews/P20B-review-11.md` §6
itself does when it writes "a `no-active-vault` barrier is a no-op". That reading requires the
reader to already know the seam's vocabulary; the comment does not use the literal token. If root
judges the narrow reading sufficient, this finding is cheap to overrule — it changes one clause.

**Fix.** Replace the final clause so it names the outcome it means and does not swallow the absent
case. For example:

```
// ... The barrier is in the helper so the live
// case is covered on all four; where the seam reports no active vault it resolves as a no-op, and
// where the seam is not yet installed it retries until it is — which is why that branch stays.
```

Any wording that (a) scopes the no-op to the `no-active-vault` outcome and (b) does not present the
absent-seam case as free would resolve this.

**Reproduction.** §6, verbatim: instrument `awaitVaultPersistence` in a throwaway worktree to log
first-iteration seam presence, iteration count and outcome per calling frame; run
`env -u CI pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0 --repeat-each=3`; group
the entries whose frame is `passkey.spec.ts:66`.

### Everything else in the comment — checked and clean

| Clause                                                                             | Verdict                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "All four callers reach this line on /settings"                                    | **Sound.** MEASURED by me statically at `d80f0e4`: call sites `:153`, `:177`, `:220`, `:264` — `:153`/`:264` follow `createAccountWithPasskey`, which ends `waitForURL("**/settings")` at `:53`; `:177` follows `addPasskeyFromSettings`, which `goto("/settings")` at `:84`; `:220` follows a revoke on `/settings`. Corroborated at entry by `reviews/P20B-review-11.md` §6's 12/12. |
| "only some have a live vault at that instant"                                      | **Sound** — correctly non-universal and correctly unquantified. My 6/12 `persisted` matches `reviews/P20B-review-11.md` §6's 6/12 exactly.                                                                                                                                                                                                                                             |
| "both instrumented samples of this line were mixed"                                | **Sound.** `reviews/P20B-review-10.md` §4.4 records the pre-barrier site as `persisted` ×2, `no-active-vault` ×1, absent ×1; `reviews/P20B-review-11.md` §6 records 6/2/4. Both mixed. The parenthetical correctly flags the first as pre-barrier.                                                                                                                                     |
| "the same predicate measured at other lines in this file moved between those runs" | **Sound.** `reviews/P20B-review-10.md` §4.4 records that site as `persisted`; `reviews/P20B-review-11.md` §6 records it as 3/3 `no-active-vault`. The comment claims movement, not a rate — correctly.                                                                                                                                                                                 |

**No residual count, and no fixed-property claim.** MEASURED by reading the committed text: it
issues no number, attributes no fixed vault state to any site, and makes **no crash-safety claim** —
so nothing here trespasses on D-025's out-of-goal Component 2. The "at least fifteen; the sweep is
not complete" bound is untouched. **No fifth exact count is issued by this revision or by me.**

## 8. Scope and hygiene

- I edited **no** file in the shared checkout. MEASURED, `git status --porcelain -- src tests` in
  the shared checkout is empty. I committed nothing. `reviews/P20B-review-12.md` is my only write.
- No `git stash`, no `git checkout --` and no `git add -A` in the shared checkout. The one
  `git checkout --` I ran was inside **my own throwaway worktree**, to restore my instrumentation.
- **No database command of any kind** — no `db:reset`, no migration, nothing destructive.
- `:3001` never touched; verified alive and owned by pid 818156 (cwd
  `/home/ben-agents/Code/moneyflow`) after all my work.

**Checkpoint clause I could not complete as specified, stated rather than omitted.** `/tmp` is at
**100% inode exhaustion** (MEASURED: `df -i /tmp` → 1048575/1048576 IUsed, with ~15 GB free space —
so `pnpm install` fails `ENOSPC` on `mkdir` despite the space). Roughly ten agents' worktree
`node_modules` trees are the cause; **none are mine to delete and I deleted none**. I therefore
placed my worktree at `/home/ben-agents/mf-p20b-rev12-review` — still outside the repository, so no
ESLint-ignore leakage and no Next dev-lock collision — rather than under `/tmp`. Everything else in
the dispatch's environment protocol was followed exactly. **Root may want to raise the inode
exhaustion with the human; it will block the next agent that tries to build a worktree in `/tmp`.**

## 9. Question proposals

### Q-PROPOSAL-P20B-12-1 — Is the barrier at `passkey.spec.ts:66` vacuous for the entries that race the redirect?

MEASURED (§6): 3 of 12 entries at this site complete via `persistence.ts:73`'s off-`(app)`-route
escape, on `/unlock`, after the seam was absent for 110–283 ms. Those entries obtain **no durability
guarantee at all** — the barrier returns because the page left the vault routes, not because
anything was flushed. `reviews/P20B-review-11.md` §6 independently measured the same class at 4
of 12.

The question for root: at a site whose caller deliberately destroys the session immediately before
the barrier (`passkey.spec.ts:152`, `:176`, `:219`, `:263`), is a barrier that a redirect can win
serving its purpose, or is it recording a guarantee it did not obtain? This is **not** a defect in
revision 12 — the barrier placement is out of this revision's scope and I propose no change to it —
but it bears on how the "at least fifteen" sweep should count barriered sites, and it is the kind of
silently-vacuous check this goal has failed packages for elsewhere.

I propose **no** removal or simplification of the retry-on-absence branch, which my own data (3/12,
all recovering) confirms is load-bearing for a third time.

---

## Verdict

**FAIL.** One Medium finding, **F12-1** (§7): the new comment's closing clause presents the
absent-seam case as a no-op, and MEASURED it is not — 3 of 12 entries at that exact line iterate
110–283 ms, matching `reviews/P20B-review-11.md` §6's 4 of 12. The fix is one clause and is spelled
out in §7.

Everything else is confirmed sound: zero executable changed lines (§2), all static gates clean
except two deductively unattributable pre-existing unit failures (§3.1), 126 E2E executions with
zero failures (§3), the manual checkpoint completed with zero console errors and zero failed
requests (§4), the proportionality argument judged sound on its merits (§5), and the comment's other
four clauses each verified against source or against the artifacts they cite (§7).
